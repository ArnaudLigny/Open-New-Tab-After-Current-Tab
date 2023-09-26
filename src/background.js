/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const currentIndex = [];
let currentGroup = '-1';

const eventOnMoved = (tabId, moveInfo) => {
  console.log(moveInfo.windowId + ': tabs.onMoved - set currentIndex = moveInfo.toIndex: ' + moveInfo.toIndex);
  currentIndex[moveInfo.windowId] = moveInfo.toIndex;
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    console.log(tabs[0].windowId + ': tabs.onMoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
    currentGroup = tabs[0].groupId;
  });
};

getCurrentActiveTab();

/**
 * Get the position of the current active tab
 */
function getCurrentActiveTab() {
  chrome.tabs.query({currentWindow: true, active: true}, tabs => {
    console.log(tabs[0].windowId + ': tabs.query - set currentIndex = tab.index: ' + tabs[0].index);
    currentIndex[tabs[0].windowId] = tabs[0].index;
    console.log(tabs[0].windowId + ': tabs.query - set currentGroup = tab.groupId: ' + tabs[0].groupId);
    currentGroup = tabs[0].groupId;
  });
  // Fallback
  chrome.windows.getCurrent(window => {
    if (!Number.isInteger(currentIndex[window.id])) {
      // Last position (default behavior)
      chrome.tabs.query({currentWindow: true}, tabs => {
        console.log(tabs[0].windowId + ': fallback - set currentIndex = tabs.length: ' + tabs.length);
        currentIndex[tabs[0].windowId] = tabs.length;
        currentGroup = '-1';
      });
    }
  });
}

/**
 * I like to move it!
 */
function moveIt(tab, event) {
  console.log(tab.windowId + ': tabs.' + event + ' - get tab.index: ' + tab.index);
  console.log(tab.windowId + ': tabs.' + event + ' - get currentIndex: ' + currentIndex[tab.windowId]);
  if (Number.isInteger(currentIndex[tab.windowId])) {
    const moveToIndex = currentIndex[tab.windowId] + 1;
    currentIndex[tab.windowId] = moveToIndex;

    if (tab.index === moveToIndex) {
      console.log(tab.windowId + ': tabs.' + event + ' - tab.index: ' + tab.index + ' === moveToIndex: ' + moveToIndex + ' (nothing to do)');

      return;
    }

    chrome.tabs.move(tab.id, {
      index: moveToIndex,
    }, movedTab => {
      // workaround for the Chrome and Edge scrollable tabstrip issue
      chrome.tabs.update(movedTab.openerTabId, {active: true}, () => {
        console.log(tab.windowId + ': active moved tab');
        chrome.tabs.update(movedTab.id, {active: true});
      });
    });
    if (currentGroup !== '-1') {
      chrome.tabs.group({
        tabIds: tab.id,
        groupId: currentGroup,
      });
    }

    console.log(tab.windowId + ': tabs.' + event + ' - move to: ' + moveToIndex);
  }
}

/**
 * Move the new tab after the current one.
 */
chrome.tabs.onCreated.addListener(tab => {
  chrome.tabs.onMoved.removeListener(eventOnMoved);
  moveIt(tab, 'onCreated');
  chrome.tabs.onMoved.addListener(eventOnMoved);
});

/**
 * Remember the current tab index.
 */
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('runtime.onInstalled');
    getCurrentActiveTab();
  }
});
chrome.windows.onFocusChanged.addListener(windowId => {
  setTimeout(() => { // https://www.reddit.com/r/chrome_extensions/comments/no7igm/chrometabsonactivatedaddlistener_not_working/
    if (windowId !== -1 && windowId !== -2) { // @see https://developer.chrome.com/docs/extensions/reference/windows/#properties
      chrome.tabs.query({windowId, active: true}, tabs => {
        console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentIndex = tab.index: ' + tabs[0].index);
        currentIndex[tabs[0].windowId] = tabs[0].index;
        console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentGroup = tab.groupId: ' + tabs[0].groupId);
        currentGroup = tabs[0].groupId;
      });
    }
  }, 300);
});
chrome.tabs.onActivated.addListener(activeInfo => { // eslint-disable-line no-unused-vars
  setTimeout(() => {
    chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true}, tabs => {
      console.log(tabs[0].windowId + ': tabs.onActivated - set currentIndex = tab.index: ' + tabs[0].index);
      currentIndex[tabs[0].windowId] = tabs[0].index;
      console.log(tabs[0].windowId + ': tabs.onActivated - set currentGroup = tab.groupId: ' + tabs[0].groupId);
      currentGroup = tabs[0].groupId;
    });
  }, 300);
});
chrome.tabs.onMoved.addListener(eventOnMoved);
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => { // eslint-disable-line no-unused-vars
  setTimeout(() => {
    chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true}, tabs => {
      console.log(tabs[0].windowId + ': tabs.onRemoved - set currentIndex = tab.index: ' + tabs[0].index);
      currentIndex[tabs[0].windowId] = tabs[0].index;
      console.log(tabs[0].windowId + ': tabs.onRemoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
      currentGroup = tabs[0].groupId;
    });
  }, 300);
});
