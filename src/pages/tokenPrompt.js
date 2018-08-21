import React from 'react'
import ReactDOM from 'react-dom'

export default class TokenPrompt extends React.Component {
  inputRef = React.createRef();
  state = { token: '' };

  onSubmit = (e) => {
    e.preventDefault();
    const token = this.inputRef.current.value;
    chrome.storage.sync.set({ token }, function() {
      console.log('Token saved');
    });
  }

  componentDidMount() {
    chrome.storage.sync.get(['token'], ({ token }) => {
      this.setState({ token })
    });
  }

  onChange = (e) => {
    this.setState({ token: e.target.value })
  }

  render() {
    const { token } = this.state;
    return (
      <div className="app" style={{ padding: '10px' }}>
        <div className="centered">
          <p>This extension uses Membrane's Expression Parsing to convert the URLs of the pages you visit into their corresponding Refs in your Membrane Graph.</p>
          <p>In order to parse the URL we need to make API calls into Membrane on your behalf.</p>
          <form onSubmit={this.onSubmit}>
            <label>Membrane API Personal Access Token:
              <input
                value={token}
                type="text"
                onChange={this.onChange}
                ref={this.inputRef}/>
            </label>
            <center>
              <input type="submit" value="Save"/>
            </center>
          </form>
        </div>
        <style>
          {`
            .app {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              align-text: center;
            }
            .centered {
              width: 300px;
            }
            input {
              margin-top: 10px;
            }
            input[type="text"] {
              width: 100%;
            }
          `}
        </style>
      </div>
    )
  }
}
