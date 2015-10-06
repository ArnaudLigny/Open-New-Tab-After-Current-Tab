(function () {
  "use strict";

  var currentIndex = [];

  function getCurrentActiveTab() {
    chrome.tabs.query({currentWindow: true, active: true}, function (tabs) {
      console.debug(tabs[0].windowId + ' - chrome.tabs.query - index: ' + tabs[0].index); // debug
      currentIndex[tabs[0].windowId] = tabs[0].index;
    });
    // fallback
    chrome.windows.getCurrent(function(window) {
      if (!Number.isInteger(currentIndex[window.id])) {
        // last position (default behavior)
        chrome.tabs.query({currentWindow: true}, function (tabs) {
          console.debug(tabs[0].windowId + ' - fallback - tabs.length: ' + tabs.length); // debug
          currentIndex[tabs[0].windowId] = tabs.length;
        });
      }
    });
  }

  /**
   * Remember the current tab index
   */
  // on extension install/update
  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install' || details.reason == 'update') {
      console.debug('chrome.runtime.onInstalled'); // debug
      getCurrentActiveTab();
    }
  });
  // on extension enabled
  chrome.management.onEnabled.addListener(function(ExtensionInfo) {
    if (ExtensionInfo.id == chrome.runtime.id) {
      console.debug('chrome.management.onEnabled'); // debug
      getCurrentActiveTab();
    }
  });
  // on window focused
  chrome.windows.onFocusChanged.addListener(function(windowId) {
    // https://developer.chrome.com/extensions/windows#property-WINDOW_ID_NONE
    if (windowId != -1 && windowId != -2) {
      chrome.tabs.getSelected(chrome.tabs.windowId, function(tab) {
        console.debug(windowId + ' - chrome.windows.onFocusChanged - tab.index: ' + tab.index); // debug
        currentIndex[windowId] = tab.index;
      });
    }
  });
  // on tab activated
  chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
      console.debug(tab.windowId + ' - chrome.tabs.onActivated - tab.index: ' + tab.index); // debug
      currentIndex[tab.windowId] = tab.index;
    });
  });
  // on tab manually moved
  chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
    console.debug(moveInfo.windowId + ' - chrome.tabs.onMoved - moveInfo.toIndex: ' + moveInfo.toIndex); // debug
    currentIndex[moveInfo.windowId] = moveInfo.toIndex;
  });

  /**
   * Move new tab after the current
   */
  // on created
  chrome.tabs.onCreated.addListener(function(tab) {
    console.debug(tab.windowId + ' - chrome.tabs.onCreated - currentIndex: ' + currentIndex[tab.windowId]); // debug
    if (Number.isInteger(currentIndex[tab.windowId])) {
      chrome.tabs.move(tab.id, {
        index: currentIndex[tab.windowId] + 1
      });
    }
  });
  // on updated
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.debug(tab.windowId + ' - chrome.tabs.onUpdated - currentIndex: ' + currentIndex[tab.windowId]); // debug
    if (Number.isInteger(currentIndex[tab.windowId])) {
      chrome.tabs.move(tab.id, {
        index: currentIndex[tab.windowId]
      });
    }
  });
})();