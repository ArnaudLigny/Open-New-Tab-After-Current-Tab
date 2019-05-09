/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
'use strict';

const currentIndex = [];

function getCurrentActiveTab() {
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    console.log(tabs[0].windowId + ' - chrome.tabs.query - set currentIndex = index: ' + tabs[0].index);
    currentIndex[tabs[0].windowId] = tabs[0].index;
  });
  // Fallback
  chrome.windows.getCurrent(window => {
    if (!Number.isInteger(currentIndex[window.id])) {
      // Last position (default behavior)
      chrome.tabs.query({currentWindow: true}, tabs => {
        console.log(tabs[0].windowId + ' - fallback - set currentIndex = tabs.length: ' + tabs.length);
        currentIndex[tabs[0].windowId] = tabs.length;
      });
    }
  });
}

function moveIt(tab, event) {
  console.log(tab.windowId + ' - chrome.tabs.' + event + ' - get new tab.index: ' + tab.index);
  console.log(tab.windowId + ' - chrome.tabs.' + event + ' - get currentIndex: ' + currentIndex[tab.windowId]);
  if (Number.isInteger(currentIndex[tab.windowId])) {
    const moveToIndex = currentIndex[tab.windowId] + 1;
    if (tab.index === moveToIndex) {
      console.log(tab.windowId + ' - chrome.tabs.' + event + ' - tab.index: ' + tab.index + ' == moveToIndex: ' + moveToIndex + ' (nothing to do)');
      return;
    }
    console.log(tab.windowId + ' - chrome.tabs.' + event + ' - move to: ' + moveToIndex);
    chrome.tabs.move(tab.id, {
      index: moveToIndex
    });
  }
}

const eventOnMoved = (tabId, moveInfo) => {
  console.log(moveInfo.windowId + ' - chrome.tabs.onMoved - set currentIndex = moveInfo.toIndex: ' + moveInfo.toIndex);
  currentIndex[moveInfo.windowId] = moveInfo.toIndex;
};

/**
 * Remember the current tab index.
 */
// On extension install/update
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('chrome.runtime.onInstalled');
    getCurrentActiveTab();
  }
});
// On extension enabled
chrome.management.onEnabled.addListener(ExtensionInfo => {
  if (ExtensionInfo.id === chrome.runtime.id) {
    console.log('chrome.management.onEnabled');
    getCurrentActiveTab();
  }
});
// On window focused
chrome.windows.onFocusChanged.addListener(windowId => {
  // @see https://developer.chrome.com/extensions/windows#property-WINDOW_ID_NONE
  if (windowId !== -1 && windowId !== -2) {
    chrome.tabs.getSelected(chrome.tabs.windowId, tab => {
      console.log(windowId + ' - chrome.windows.onFocusChanged - set currentIndex = tab.index: ' + tab.index);
      currentIndex[windowId] = tab.index;
    });
  }
});
// On tab activated
chrome.tabs.onActivated.addListener(activeInfo => {
  if (chrome.runtime.lastError) {
    console.log(chrome.runtime.lastError.message);
  } else {
    chrome.tabs.get(activeInfo.tabId, tab => {
      console.log(tab.windowId + ' - chrome.tabs.onActivated - set currentIndex = tab.index: ' + tab.index);
      currentIndex[tab.windowId] = tab.index;
    });
  }
});
// On tab manually moved
chrome.tabs.onMoved.addListener(eventOnMoved);

/**
 * Move new tab after the current.
 */
// On created
chrome.tabs.onCreated.addListener(tab => {
  chrome.tabs.onMoved.removeListener(eventOnMoved);
  moveIt(tab, 'onCreated');
  chrome.tabs.onMoved.addListener(eventOnMoved);
});
