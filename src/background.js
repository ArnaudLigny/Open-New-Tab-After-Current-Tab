/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

async function getState() {
  const data = await chrome.storage.session.get(['currentIndex', 'currentGroup']);
  return {
    currentIndex: data.currentIndex ?? {},
    currentGroup: data.currentGroup ?? '-1',
  };
}

async function setState(updates) {
  return chrome.storage.session.set(updates);
}

const eventOnMoved = async (tabId, moveInfo) => {
  console.log(moveInfo.windowId + ': tabs.onMoved - set currentIndex = moveInfo.toIndex: ' + moveInfo.toIndex);
  const {currentIndex} = await getState();
  currentIndex[moveInfo.windowId] = moveInfo.toIndex;
  const tabs = await chrome.tabs.query({currentWindow: true, active: true});
  console.log(tabs[0].windowId + ': tabs.onMoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
  await setState({currentIndex, currentGroup: tabs[0].groupId});
};

/**
 * Get the position of the current active tab
 */
async function getCurrentActiveTab() {
  const tabs = await chrome.tabs.query({currentWindow: true, active: true});
  const {currentIndex} = await getState();
  console.log(tabs[0].windowId + ': tabs.query - set currentIndex = tab.index: ' + tabs[0].index);
  currentIndex[tabs[0].windowId] = tabs[0].index;
  console.log(tabs[0].windowId + ': tabs.query - set currentGroup = tab.groupId: ' + tabs[0].groupId);
  await setState({currentIndex, currentGroup: tabs[0].groupId});
  // Fallback
  const win = await chrome.windows.getCurrent();
  const {currentIndex: updatedIndex} = await getState();
  if (!Number.isInteger(updatedIndex[win.id])) {
    // Last position (default behavior)
    const allTabs = await chrome.tabs.query({currentWindow: true});
    console.log(allTabs[0].windowId + ': fallback - set currentIndex = tabs.length: ' + allTabs.length);
    updatedIndex[allTabs[0].windowId] = allTabs.length;
    await setState({currentIndex: updatedIndex, currentGroup: '-1'});
  }
}

/**
 * I like to move it!
 */
async function moveIt(tab, event) {
  const {currentIndex, currentGroup} = await getState();
  console.log(tab.windowId + ': tabs.' + event + ' - get tab.index: ' + tab.index);
  console.log(tab.windowId + ': tabs.' + event + ' - get currentIndex: ' + currentIndex[tab.windowId]);
  if (Number.isInteger(currentIndex[tab.windowId])) {
    const moveToIndex = currentIndex[tab.windowId] + 1;
    currentIndex[tab.windowId] = moveToIndex;
    await setState({currentIndex});

    if (tab.index === moveToIndex) {
      console.log(tab.windowId + ': tabs.' + event + ' - tab.index: ' + tab.index + ' === moveToIndex: ' + moveToIndex + ' (nothing to do)');

      return;
    }

    const movedTab = await chrome.tabs.move(tab.id, {index: moveToIndex});
    // Workaround for the Chrome and Edge scrollable tabstrip issue
    // only if opener tab is not pinned
    if (movedTab.openerTabId) {
      const openerTab = await chrome.tabs.get(movedTab.openerTabId);
      if (!openerTab.pinned) {
        await chrome.tabs.update(movedTab.openerTabId, {active: true});
        console.log(tab.windowId + ': active moved tab');
        await chrome.tabs.update(movedTab.id, {active: true});
      }
    }

    if (currentGroup >= 0) {
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
chrome.tabs.onCreated.addListener(async tab => {
  chrome.tabs.onMoved.removeListener(eventOnMoved);
  await moveIt(tab, 'onCreated');
  chrome.tabs.onMoved.addListener(eventOnMoved);
});

/**
 * Remember the current tab index.
 */
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('runtime.onInstalled');
    await getCurrentActiveTab();
  }
});
chrome.runtime.onStartup.addListener(async () => {
  console.log('runtime.onStartup');
  await getCurrentActiveTab();
});
chrome.windows.onFocusChanged.addListener(windowId => {
  setTimeout(async () => { // https://www.reddit.com/r/chrome_extensions/comments/no7igm/chrometabsonactivatedaddlistener_not_working/
    if (windowId !== -1 && windowId !== -2) { // @see https://developer.chrome.com/docs/extensions/reference/windows/#properties
      const tabs = await chrome.tabs.query({windowId, active: true});
      const {currentIndex} = await getState();
      console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentIndex = tab.index: ' + tabs[0].index);
      currentIndex[tabs[0].windowId] = tabs[0].index;
      console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentGroup = tab.groupId: ' + tabs[0].groupId);
      await setState({currentIndex, currentGroup: tabs[0].groupId});
    }
  }, 300);
});
chrome.tabs.onActivated.addListener(activeInfo => { // eslint-disable-line no-unused-vars
  setTimeout(async () => {
    const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true});
    const {currentIndex} = await getState();
    console.log(tabs[0].windowId + ': tabs.onActivated - set currentIndex = tab.index: ' + tabs[0].index);
    currentIndex[tabs[0].windowId] = tabs[0].index;
    console.log(tabs[0].windowId + ': tabs.onActivated - set currentGroup = tab.groupId: ' + tabs[0].groupId);
    await setState({currentIndex, currentGroup: tabs[0].groupId});
  }, 300);
});
chrome.tabs.onMoved.addListener(eventOnMoved);
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => { // eslint-disable-line no-unused-vars
  setTimeout(async () => {
    const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true});
    const {currentIndex} = await getState();
    console.log(tabs[0].windowId + ': tabs.onRemoved - set currentIndex = tab.index: ' + tabs[0].index);
    currentIndex[tabs[0].windowId] = tabs[0].index;
    console.log(tabs[0].windowId + ': tabs.onRemoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
    await setState({currentIndex, currentGroup: tabs[0].groupId});
  }, 300);
});
