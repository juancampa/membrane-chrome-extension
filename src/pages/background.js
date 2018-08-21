// import axios from 'axios'
// import { wrapStore } from 'react-chrome-redux';
// import { createStore } from 'redux';
// import store from './store';
//
// wrapStore(store, { portName: 'MEMBRANE_EXTENSION' }); // make sure portName matches
//
// console.log('hi!');

console.log('Starting');
chrome.runtime.onInstalled.addListener(function() {
  console.log('Installing');
  // chrome.storage.sync.set({color: '#ccc'}, function() {
  //   console.log("The color is green.");
  // });

  const dc = chrome.declarativeContent;
  dc.onPageChanged.removeRules(undefined, function() {
    dc.onPageChanged.addRules([{
      conditions: [new dc.PageStateMatcher({
        pageUrl: { urlMatches: '.*' },
      })
      ],
      actions: [new dc.ShowPageAction()]
    }]);
  });
})
