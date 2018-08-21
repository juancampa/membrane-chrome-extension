import React from 'react'
import ReactDOM from 'react-dom'
import TokenPrompt from './TokenPrompt';

(() => {
  const mountNode = document.createElement('div')
  document.body.appendChild(mountNode)

  ReactDOM.render(<TokenPrompt />, mountNode)
})();
