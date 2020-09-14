import React from 'react'
import ReactDOM from 'react-dom'
import TokenPrompt from './tokenPrompt';

(() => {
  const mountNode = document.createElement('div')
  document.body.appendChild(mountNode)

  ReactDOM.render(<TokenPrompt />, mountNode)
})();
