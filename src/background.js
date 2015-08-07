(function () {
  "use strict";

  var currentIndex;

  function getCurrentActiveTab() {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      console.log('chrome.tabs.query - index: ' + tabs[0].index); // debug
      currentIndex = tabs[0].index;
    });
    // fallback
    if (Number.isInteger(currentIndex)) {
      // last position (default behavior)
      chrome.tabs.query({currentWindow: true}, function (tabs) {
        console.log('chrome.runtime.onInstalled - tabs.length: ' + tabs.length); // debug
        currentIndex = tabs.length;
      });
    }
  }

  /**
   * Remember the current tab index
   */
  // on extension install/update
  chrome.runtime.onInstalled.addListener(function(details) {
    getCurrentActiveTab();
  });
  // on extension enabled
  chrome.management.onEnabled.addListener(function(ExtensionInfo) {
    getCurrentActiveTab();
  });
  // on window focused
  chrome.windows.onFocusChanged.addListener(function(windowId) {
    // https://developer.chrome.com/extensions/windows#property-WINDOW_ID_NONE
    if (windowId != -1 && windowId != -2) {
      chrome.tabs.getSelected(chrome.tabs.windowId, function(tab) {
        console.log(windowId + ' - chrome.windows.onFocusChanged - tab.index: ' + tab.index); // debug
        currentIndex = tab.index;
      });
    }
  });
  // on tab activated
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      console.log('chrome.tabs.onActivated - tab.index: ' + tab.index); // debug
      currentIndex = tab.index;
    });
  });
  // on tab manually moved
  chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
    console.log(moveInfo.windowId + ' - chrome.tabs.onMoved - moveInfo.toIndex: ' + moveInfo.toIndex); // debug
    currentIndex = moveInfo.toIndex;
  });

  /**
   * Move new tab after the current
   */
  chrome.tabs.onCreated.addListener(function(tab) {
    console.log('chrome.tabs.onCreated - currentIndex: ' + currentIndex); // debug
    chrome.tabs.move(tab.id, {
      index: currentIndex + 1
    });
  });
})();