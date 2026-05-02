/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Get state for a specific window using per-window storage keys.
 * Each window key is independent so concurrent updates to different windows
 * are atomic and never clobber each other.
 */
async function getWindowState(windowId) {
  const data = await chrome.storage.session.get([
    `currentIndex_${windowId}`,
    `currentGroup_${windowId}`,
  ]);
  return {
    currentIndex: data[`currentIndex_${windowId}`] ?? null,
    currentGroup: data[`currentGroup_${windowId}`] ?? -1,
  };
}

/**
 * Set state for a specific window atomically via per-window storage keys.
 */
async function setWindowState(windowId, updates) {
  const storageUpdates = {};
  if ('currentIndex' in updates) {
    storageUpdates[`currentIndex_${windowId}`] = updates.currentIndex;
  }

  if ('currentGroup' in updates) {
    storageUpdates[`currentGroup_${windowId}`] = updates.currentGroup;
  }

  return chrome.storage.session.set(storageUpdates);
}

const eventOnMoved = async (tabId, moveInfo) => {
  try {
    console.log(moveInfo.windowId + ': tabs.onMoved - set currentIndex = moveInfo.toIndex: ' + moveInfo.toIndex);
    const tabs = await chrome.tabs.query({windowId: moveInfo.windowId, active: true});
    if (tabs.length === 0) {
      console.log(moveInfo.windowId + ': tabs.onMoved - no active tab found, set currentGroup = -1');
      await setWindowState(moveInfo.windowId, {currentIndex: moveInfo.toIndex, currentGroup: -1});
      return;
    }

    console.log(moveInfo.windowId + ': tabs.onMoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
    await setWindowState(moveInfo.windowId, {currentIndex: moveInfo.toIndex, currentGroup: tabs[0].groupId});
  } catch (error) {
    console.error(moveInfo.windowId + ': tabs.onMoved error:', error);
  }
};

/**
 * Get the position of the current active tab
 */
async function getCurrentActiveTab() {
  try {
    const tabs = await chrome.tabs.query({currentWindow: true, active: true});
    if (tabs.length === 0) {
      // No active tab found — fall back to chrome.windows.getCurrent
      const win = await chrome.windows.getCurrent();
      const allTabs = await chrome.tabs.query({windowId: win.id});
      console.log(win.id + ': fallback - no active tab, set currentIndex = tabs.length: ' + allTabs.length);
      await setWindowState(win.id, {currentIndex: allTabs.length, currentGroup: -1});
      return;
    }

    const {windowId, index, groupId} = tabs[0];
    console.log(windowId + ': tabs.query - set currentIndex = tab.index: ' + index);
    console.log(windowId + ': tabs.query - set currentGroup = tab.groupId: ' + groupId);
    await setWindowState(windowId, {currentIndex: index, currentGroup: groupId});
    // Fallback
    const {currentIndex} = await getWindowState(windowId);
    if (!Number.isInteger(currentIndex)) {
      // Last position (default behavior)
      const allTabs = await chrome.tabs.query({windowId});
      console.log(windowId + ': fallback - set currentIndex = tabs.length: ' + allTabs.length);
      await setWindowState(windowId, {currentIndex: allTabs.length, currentGroup: -1});
    }
  } catch (error) {
    console.error('getCurrentActiveTab error:', error);
  }
}

/**
 * I like to move it!
 */
async function moveIt(tab, event) {
  try {
    const {currentIndex, currentGroup} = await getWindowState(tab.windowId);
    console.log(tab.windowId + ': tabs.' + event + ' - get tab.index: ' + tab.index);
    console.log(tab.windowId + ': tabs.' + event + ' - get currentIndex: ' + currentIndex);
    if (Number.isInteger(currentIndex)) {
      const moveToIndex = currentIndex + 1;
      await setWindowState(tab.windowId, {currentIndex: moveToIndex});

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
  } catch (error) {
    console.error(tab.windowId + ': tabs.' + event + ' error:', error);
  }
}

/**
 * Move the new tab after the current one.
 */
chrome.tabs.onCreated.addListener(async tab => {
  try {
    chrome.tabs.onMoved.removeListener(eventOnMoved);
    await moveIt(tab, 'onCreated');
    chrome.tabs.onMoved.addListener(eventOnMoved);
  } catch (error) {
    console.error('tabs.onCreated error:', error);
  }
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
    try {
      if (windowId !== -1 && windowId !== -2) { // @see https://developer.chrome.com/docs/extensions/reference/windows/#properties
        const tabs = await chrome.tabs.query({windowId, active: true});
        if (tabs.length === 0) {
          return;
        }

        console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentIndex = tab.index: ' + tabs[0].index);
        console.log(tabs[0].windowId + ': windows.onFocusChanged - set currentGroup = tab.groupId: ' + tabs[0].groupId);
        await setWindowState(tabs[0].windowId, {currentIndex: tabs[0].index, currentGroup: tabs[0].groupId});
      }
    } catch (error) {
      console.error(windowId + ': windows.onFocusChanged error:', error);
    }
  }, 300);
});
chrome.tabs.onActivated.addListener(activeInfo => { // eslint-disable-line no-unused-vars
  setTimeout(async () => {
    try {
      const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true});
      if (tabs.length === 0) {
        return;
      }

      console.log(tabs[0].windowId + ': tabs.onActivated - set currentIndex = tab.index: ' + tabs[0].index);
      console.log(tabs[0].windowId + ': tabs.onActivated - set currentGroup = tab.groupId: ' + tabs[0].groupId);
      await setWindowState(tabs[0].windowId, {currentIndex: tabs[0].index, currentGroup: tabs[0].groupId});
    } catch (error) {
      console.error('tabs.onActivated error:', error);
    }
  }, 300);
});
chrome.tabs.onMoved.addListener(eventOnMoved);
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => { // eslint-disable-line no-unused-vars
  setTimeout(async () => {
    try {
      const tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true, currentWindow: true});
      if (tabs.length === 0) {
        return;
      }

      console.log(tabs[0].windowId + ': tabs.onRemoved - set currentIndex = tab.index: ' + tabs[0].index);
      console.log(tabs[0].windowId + ': tabs.onRemoved - set currentGroup = tab.groupId: ' + tabs[0].groupId);
      await setWindowState(tabs[0].windowId, {currentIndex: tabs[0].index, currentGroup: tabs[0].groupId});
    } catch (error) {
      console.error('tabs.onRemoved error:', error);
    }
  }, 300);
});
