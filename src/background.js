/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
const currentIndex = [];
const eventOnMoved = (tabId, moveInfo) => {
  console.log(moveInfo.windowId + ' - chrome.tabs.onMoved - set currentIndex = moveInfo.toIndex: ' + moveInfo.toIndex);
  currentIndex[moveInfo.windowId] = moveInfo.toIndex;
};

getCurrentActiveTab();

// Get the position index of the current active tab
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

// I like to move it!
function moveIt(tab, event) {
  console.log(tab.windowId + ' - chrome.tabs.' + event + ' - get new tab.index: ' + tab.index);
  console.log(tab.windowId + ' - chrome.tabs.' + event + ' - get currentIndex: ' + currentIndex[tab.windowId]);
  if (Number.isInteger(currentIndex[tab.windowId])) {
    const moveToIndex = currentIndex[tab.windowId] + 1;

    // Current is where it will move :-)
    currentIndex[tab.windowId] = moveToIndex;

    // Nothing to do
    if (tab.index === moveToIndex) {
      console.log(tab.windowId + ' - chrome.tabs.' + event + ' - tab.index: ' + tab.index + ' == moveToIndex: ' + moveToIndex + ' (nothing to do)');
      return;
    }

    // Move!
    chrome.tabs.move(tab.id, {
      index: moveToIndex
    });
    console.log(tab.windowId + ' - chrome.tabs.' + event + ' - move to: ' + moveToIndex);
  }
}

/**
 * Move the new tab after the current one.
 */
// On created
chrome.tabs.onCreated.addListener(tab => {
  chrome.tabs.onMoved.removeListener(eventOnMoved);
  moveIt(tab, 'onCreated');
  chrome.tabs.onMoved.addListener(eventOnMoved);
});

/**
 * Focus on the the tab on the left immediately after the current one is closed.
 */
// On removed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  const currIdx = currentIndex[removeInfo.windowId];
  console.log("Tab being removed at index ", currIdx);
  const nextIdx = currIdx - 1;
  if (nextIdx < 0) {
    return;
  }

  console.log("Refocusing to the tab at index ", nextIdx);
  chrome.tabs.highlight({'tabs': nextIdx}, win => {
    console.log("Refocused to the tab at index ", nextIdx);
  });
});

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
// On window focused
chrome.windows.onFocusChanged.addListener(windowId => {
  setTimeout(() => { // https://www.reddit.com/r/chrome_extensions/comments/no7igm/chrometabsonactivatedaddlistener_not_working/
    if (windowId !== -1 && windowId !== -2) { // @see https://developer.chrome.com/docs/extensions/reference/windows/#properties
      chrome.tabs.query({windowId, active: true}, tabs => {
        console.log(tabs[0].windowId + ' - chrome.windows.onFocusChanged - set currentIndex = tab.index: ' + tabs[0].index);
        currentIndex[tabs[0].windowId] = tabs[0].index;
      });
    }
  }, 300);
});
// On tab activated
chrome.tabs.onActivated.addListener(activeInfo => { // eslint-disable-line no-unused-vars
  setTimeout(() => {
    chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true}, tabs => {
      console.log(tabs[0].windowId + ' - chrome.tabs.onActivated - set currentIndex = tab.index: ' + tabs[0].index);
      currentIndex[tabs[0].windowId] = tabs[0].index;
    });
  }, 300);
});
// On tab manually moved
chrome.tabs.onMoved.addListener(eventOnMoved);
