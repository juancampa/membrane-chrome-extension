import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios';
import shallowEqual from 'shallowequal';
import { isUuid, $$, I, Ref, RefTraversal } from '@membrane/util';
import TokenPrompt from './tokenPrompt';
require('array.prototype.flatmap').shim();

let TOKEN;
const ENDPOINT = 'https://membrane.io/api/graphql/';
// const ENDPOINT = 'http://localhost:8008/api/graphql/';

const QUERY_ALL_EXPRESSIONS = `
  query {
    allProgramInstances {
      id
      alias
      programVersion {
        # Load part of the schema necessary to figure out the type of a ref
        schema {
          types {
            name
            description
            fields { name type ofType { type ofType { type } } }
            computedFields { name type ofType { type ofType { type } } }
            actions { name type ofType { type ofType { type } } }
            events { name type ofType { type ofType { type } } }
          }
          imports {
            name
            id
            types {
              name
              description
              fields { name type ofType { type ofType { type } } }
              computedFields { name type ofType { type ofType { type } } }
              actions { name type ofType { type ofType { type } } }
              events { name type ofType { type ofType { type } } }
            }
          }
        }
        expressions {
          name
          description
          pattern
        }
      }
    }
  }`

const MUTATION_PARSE = `
  mutation($expression: String!, $matches: [ExpressionMatchInput!]!) {
    parse(expression: $expression, matches: $matches) {
      programInstanceId
      name
      refs
    }
  }`

const MUTATION_CREATE_TAG = `
  mutation($name: TagName!, $ref: Ref!) {
    createTag(name: $name, ref: $ref)
  }`

async function apiPost(q, variables) {
  try {
    const result = await axios.post(ENDPOINT, {
      query: q,
      variables,
    }, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    return result;
  } catch (e) {
    console.log('ERROR', e);
    if (e.response.status === 401) {
      // Invalid token
      console.log('INVALID TOKEN');
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ token: null }, () => {
          TOKEN = null
          resolve();
        });
      });
    } else {
      throw e;
    }
  }
}

class WithExpressions extends React.Component {
  state = {
    initialized: false,
    expressions: [],
  }

  async loadExpressions() {
    const result = await apiPost(QUERY_ALL_EXPRESSIONS);
    console.log('RESULT', result);

    this.setState({
      initialized: true,
      expressions: result.data.data.allProgramInstances
        .filter((instance) => instance.programVersion.expressions && instance.programVersion.expressions.length) 
        .flatMap((instance) =>
          instance.programVersion.expressions.map((exp) => {
            return {
              instance,
              ...exp
            };
          })
        ),
      idToAlias: result.data.data.allProgramInstances.reduce((acc, i) => (acc[i.id] = i.alias, acc), {}),
      idToSchema: result.data.data.allProgramInstances.reduce((acc, i) => (acc[i.id] = i.programVersion.schema, acc), {}),
    });
  }

  componentDidMount() {
    const { initialized } = this.state;
    if (!initialized) {
      this.loadExpressions()
        .catch((error) => this.setState({ error }));
    }
  }

  render() {
    const { children } = this.props;
    const { expressions, idToAlias, idToSchema, initialized, error } = this.state;
    return children({ expressions, idToAlias, idToSchema, loading: !initialized, error });
  }
}

class WithTab extends React.Component {
  state = {}
  componentDidMount() {
    if (!this.state.tab) {
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        this.setState({ tab: tabs[0] });
      });
    }
  }

  render() {
    const { children } = this.props;
    const { tab } = this.state;
    if (!tab) {
      return 'Loading tab';
    }
    return children({ tab });
  }
}

class WithMatches extends React.Component {
  state = { matches: [] }

  loadMatches = async (expression, localMatches) => {
    const result = await apiPost(MUTATION_PARSE, { expression, matches: localMatches });

    this.setState({
      matches: result.data.data.parse,
      loading: false,
    });
  }

  componentDidUpdate(prevProps) {
    const { expressions, url } = this.props;
    if (!shallowEqual(expressions, prevProps.expressions) || url !== prevProps.url) {
      const localMatches = expressions.filter((e) => {
          console.log(e, url);
          const regex = new RegExp(e.pattern);
          return regex.test(url);
        })
        .map((e) => ({
          programInstanceId: e.instance.id,
          name: e.name,
        }));

      console.log('LOCAL MATCHES', localMatches);

      // If we found a local match, go get it's actual Ref value
      if (localMatches.length > 0) {
        this.setState({ loading: true });
        this.loadMatches(url, localMatches)
          .catch((error) => this.setState({ error, loading: false }));
      }
    }
  }

  render() {
    const { expressions, url, children } = this.props;
    const { matches, loading, error } = this.state;

    return children({ matches, loading, error });
  }
}

class TagButton extends React.Component {
  state = { status: 'editing' }
  inputRef = React.createRef()
  
  createTag = async(name, ref) => {
    const result = await apiPost(MUTATION_CREATE_TAG, { name, ref, });

    this.setState({
      status: 'tagged',
    });
  }

  onClick = () => {
    this.setState({ status: 'editing' });
  }

  onSubmit = (e) => {
    e.preventDefault();
    const name = this.inputRef.current.value;
    this.setState({
      status: 'tagging',
    });

    this.createTag(name, this.props._ref);
  }

  render() {
    const { status } = this.state;

    return <div className="tag-button">
      {
        status === 'idle' ?  <button onClick={this.onClick}>tag</button> :
          status === 'editing' ? 
          <form onSubmit={this.onSubmit}>
            <input ref={this.inputRef} autoFocus type="text" /> 
            <input type="submit" value="TAG"/>
          </form> :
          status === 'tagging' ? 'tagging...' :
          status === 'tagged' ? 'tagged' : 'please refresh extension'
      }
      <style>
        {`
          form {
            display: flex;
            align-items: center;
          }
          .tag-button {
            display: flex;
            margin-left: 5px;
            color: #888;
          }
          input[type="text"]{
            outline: none;
          }
          input[type="submit"]{
            font-family: Verdana;
            font-size: 8px;
            text-transform: uppercase;
            outline: none;
            background: #0f0;
            border: 1px solid #000;
            border-radius: 0px;
            padding: 2px 4px 2px 4px;
          }
        `}
      </style>
    </div>
  }
}

// Prefix any uppercase letter with a space (except the first one)
function formatTypeName(name) {
  // debugger;
  return name.replace(/([a-z0-9])([A-Z])/g, (...args) => args[1] + ' ' + args[2]);
}

function formatTyped(typed) {
  if (typeof typed === 'string') {
    return formatTypeName(typed);
  } else if (!typed.ofType) {
    return formatTypeName(typed.type);
  } else if (typed.type === 'Ref') {
    return formatTyped(typed.ofType) + '*';
  } else if (typed.type === 'List') {
    return '[' + formatTyped(typed.ofType) + ']';
  }
  return '(?)';
}

function Typed({ typed }) {
  return <div className="typed pill">
    { formatTyped(typed) }
  </div>
}

class RefPath extends React.Component {
  element = React.createRef()
  state = {}

  onMouseEnter = (e) => {
    // e.stopPropagation()
    if (e.target === this.element.current) {
      this.setState({ hover: true })
      this.props.onHover(this.props.path);
    }
  }
  onMouseLeave = (e) => {
    // e.stopPropagation()
    if (e.target === this.element.current) {
      this.setState({ hover: false })
      this.props.onLeave(this.props.path);
    }
  }

  render() {
    const { path, level, onHover, onLeave } = this.props;
    const { hover } = this.state;
    if (path.size === 0) {
      return null;
    }
    return <div
      className={'elem ' + (hover ? 'hover' : '')}
      onMouseOver={this.onMouseEnter}
      onMouseOut={this.onMouseLeave}>
      <RefPath
        onHover={onHover}
        onLeave={onLeave}
        path={path.slice(1)}
        level={level - 1}/>
      <div
        ref={this.element}
        style={{ paddingLeft: (level * 1) + 'em' }}>
        .{ path.get(0).toString() }
      </div>
    </div>
  }
}

function RefComp({ _ref, onHover, onLeave }) {
  return <div className="ref">
    <RefPath path={_ref.path.reverse()} level={_ref.path.size} onHover={onHover} onLeave={onLeave}/>
    <style>
      {`
        .ref {
          display: flex;
          align-items: center;
        }
        .elem {
          // border: 1px solid transparent;
          cursor: default;
        }
        .hover {
           // border: 1px solid #333;
           background: #000;
           color: #fff;
        }
        // .elem:hover {
        //   padding: 2px;
        //   border: 1px solid #333;
        // }
        // .elem:hover .elem {
        //   background: #0f0 !important;
        // }
      `}
    </style>
  </div>
}

class Match extends React.Component {
  state = {}

  onHover = (path) => {
    let size = path.size;
    let ref = $$(this.props._ref);
    while (size < ref.path.size) {
      ref = ref.pop();
    }

    const { schema } = this.props;
    const refTraversal = new RefTraversal(ref.withoutProgram(), schema);
    refTraversal.toEnd();
    const member = refTraversal.member;
    const type = refTraversal.type;
    this.setState({ member, type, selectedRef: ref })
  }

  onLeave = () => {
    this.setState({ member: null, type: null, selectedRef: null })
  }

  onClick = (e) => {
    const ref = this.state.selectedRef || this.state.ref
    this.setState({ tagging: ref })
  }

  render() {
    const ref = $$(this.props._ref);
    const { denormalized, schema } = this.props;
    let { member, type, tagging } = this.state;

    if (!member) {
      const refTraversal = new RefTraversal(ref.withoutProgram(), schema);
      refTraversal.toEnd();
      member = refTraversal.member;
      type = refTraversal.type;
    }

    return (
      <div className="match">
        <div className="type-box">
          <div style={{ alignSelf: 'center' }} />
          <Typed typed={member}/>
          <ul style={{ paddingLeft: '0px' }}>
            {
              type.fields.map((m) =>
                <li>{m.name}</li>
              )
            }
            {
              type.computedFields.map((m) =>
                <li>{m.name}()</li>
              )
            }
            {
              type.actions.map((m) =>
                <li className="action">{m.name}()</li>
              )
            }
            {
              type.events.map((m) =>
                <li className="event">{m.name}</li>
              )
            }
          </ul>
          </div>
          {
            tagging ? <TagButton _ref={tagging} /> :
              <div onClick={this.onClick}>
                <RefComp _ref={denormalized} onHover={this.onHover} onLeave={this.onLeave}/>
              </div>
          }
      </div>
    )
  }
}

class App extends React.Component {
  render() {
    return (
      <div className="app" style={{ padding: '10px' }}>
        <WithExpressions>
          {({ expressions = [], idToAlias, idToSchema, loading: loadingExpressions }) =>
            <WithTab>
              {({ tab }) =>
                <WithMatches expressions={expressions} url={tab.url}>
                  {({ matches, loading: loadingMatches }) =>
                    <React.Fragment>
                      <div>
                        { loadingExpressions && 'Loading expressions...' }
                        { loadingMatches && 'Loading matches...' }
                        {
                          matches.length === 0 && <div>
                              No refs found

                              <p>You might need to install or create a driver for this service</p>
                            </div>
                        }
                        {
                          matches.map((match, i) => {
                            return <div className="match-list" key={i}>
                              { idToAlias[match.programInstanceId] } ({match.name}): 
                              <ul>
                              {
                                match.refs.map((ref, i) =>
                                  <li key={i}>
                                    <Match
                                      _ref={ref}
                                      denormalized={denormalizeRef($$(ref), idToAlias)}
                                      schema={idToSchema[$$(ref).program]} />
                                  </li>
                                )
                              }
                              </ul>
                            </div>
                          })
                        }
                      </div>
                    </React.Fragment>
                  }
                </WithMatches>
              }
            </WithTab>
          }
        </WithExpressions>
        <style>
          {`
            body {
              font-family: Consolas, "San Francisco", Monaco, monospace;
              font-size: 10px;
              min-width: 400px;
              min-height: 60px;
              max-width: 1000px;
            }

            .action { color: #63f; }
            .event { color: #d3e; }

            .app {
            }
            ul {
              list-style: none;
              margin: 0px;
              padding-left: 15px
            }
            .match {
              display: flex;
              align-items: flex-start;
              padding-top: 10px;
              min-height: 20px;
            }
            button {
              font-family: Verdana;
              font-size: 8px;
              text-transform: uppercase;
              background: #000;
              outline: none;
              border-radius: 0px;
              border: 1px solid #000;
              padding: 2px 4px 2px 4px;
              color: #fff;
              margin-left: 4px;
            }
            button:hover {
              background: #444;
            }
            button:active {
              color: #000;
              background: #fff;
            }
            .ref {
              margin-left: 5px;
            }
            .type-box {
              min-width: 140px;
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
            }
            .pill {
              line-height: normal;
              display: inline-flex;
              justify-content: center;
              align-items: center;
              height: 14px;
              font-size: 8px;
              text-transform: uppercase;
              background: #fff;
              padding: 1px 4px 1px 4px;
              border: 1px dotted #000;
              border-radius: 2px;
              user-select: none;
              white-space: nowrap;
            }
          `}
        </style>
      </div>
    );
  }
}

function denormalizeRef(ref, idToAlias) {
  let result = ref;

  // Replace tag with id if needed
  if (isUuid(ref.program)) {
    const alias = idToAlias[ref.program];
    result = ref.withProgram(alias);
  }

  // Recursively denormalize any nested refs
  const newPath = I.List(result.path.map((elem) => {
    let newArgs = I.Map();
    for (let entry of elem.args.entries()) {
      const [key, value] = entry;
      if (value instanceof Ref) {
        newArgs = newArgs.set(key, normalizeRef(context, value));
      } else {
        newArgs = newArgs.set(key, value);
      }
    }
    return elem.withArgs(newArgs);
  }));

  return result.withPath(newPath);
}
class Test extends React.Component {
  onClick = (e) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { what: "regex", regex: "^https?://github.com/.+$" }, function (response) {
        console.log(response);
      });
    });
  };
  render() {
    return (
      <div>
        <button onClick={this.onClick}>Search matches</button>
        <style>
          {`
            body {
              font-family: Consolas, "San Francisco", Monaco, monospace;
              font-size: 10px;
              min-width: 400px;
              min-height: 60px;
              max-width: 1000px;
            }
          `}
        </style>
      </div>
    );
  }
}
(() => {
  chrome.storage.sync.get(['token'], ({ token }) => {
    const mountNode = document.createElement('div');
    document.body.appendChild(mountNode)
    TOKEN = token;
    ReactDOM.render(token ? <Test /> : <TokenPrompt />, mountNode);
  });
})();

