/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

const WINDOW_STATES_KEY = 'windowStates';
const DRAG_RETRY_DELAY = 250;
const FOCUS_UPDATE_DELAY = 300;
const NO_WINDOW = -1;
const NO_ACTIVE_WINDOW = -2;

function lastErrorMessage() {
  return chrome.runtime.lastError && chrome.runtime.lastError.message;
}

function chromeCall(run) {
  return new Promise((resolve, reject) => {
    run(result => {
      const errorMessage = lastErrorMessage();

      if (errorMessage) {
        reject(new Error(errorMessage));
        return;
      }

      resolve(result);
    });
  });
}

async function safeChromeCall(label, run) {
  try {
    return await chromeCall(run);
  } catch (error) {
    console.warn(label + ': ' + error.message);
    return undefined;
  }
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

async function getWindowStates() {
  const result = await safeChromeCall('storage.session.get', callback => {
    chrome.storage.session.get(WINDOW_STATES_KEY, callback);
  });

  return (result && result[WINDOW_STATES_KEY]) || {};
}

async function saveWindowStates(windowStates) {
  await safeChromeCall('storage.session.set', callback => {
    chrome.storage.session.set({[WINDOW_STATES_KEY]: windowStates}, callback);
  });
}

async function getWindowState(windowId) {
  const windowStates = await getWindowStates();

  return windowStates[windowId];
}

async function setWindowState(tab) {
  if (!tab || !Number.isInteger(tab.windowId) || !Number.isInteger(tab.index)) {
    return undefined;
  }

  const state = {
    index: tab.index,
    groupId: Number.isInteger(tab.groupId) ? tab.groupId : -1,
  };
  const windowStates = await getWindowStates();
  windowStates[tab.windowId] = state;
  await saveWindowStates(windowStates);

  console.log(tab.windowId + ': set state index=' + state.index + ' groupId=' + state.groupId);

  return state;
}

async function getTab(tabId) {
  return safeChromeCall('tabs.get', callback => {
    chrome.tabs.get(tabId, callback);
  });
}

async function queryTabs(queryInfo) {
  const tabs = await safeChromeCall('tabs.query', callback => {
    chrome.tabs.query(queryInfo, callback);
  });

  return tabs || [];
}

async function queryActiveTab(windowId) {
  const queryInfo = Number.isInteger(windowId) ? {windowId, active: true} : {active: true, lastFocusedWindow: true};
  const tabs = await queryTabs(queryInfo);

  return tabs[0];
}

async function refreshActiveTabState(windowId) {
  const activeTab = await queryActiveTab(windowId);

  if (activeTab) {
    return setWindowState(activeTab);
  }

  return undefined;
}

async function getCreatedTabState(tab) {
  const savedState = await getWindowState(tab.windowId);

  if (savedState && Number.isInteger(savedState.index)) {
    return savedState;
  }

  if (Number.isInteger(tab.openerTabId)) {
    const openerTab = await getTab(tab.openerTabId);

    if (openerTab && openerTab.windowId === tab.windowId) {
      return {
        index: openerTab.index,
        groupId: Number.isInteger(openerTab.groupId) ? openerTab.groupId : -1,
      };
    }
  }

  return undefined;
}

async function moveTab(tabId, index) {
  try {
    return await chromeCall(callback => {
      chrome.tabs.move(tabId, {index}, callback);
    });
  } catch (error) {
    if (error.message.includes('user may be dragging a tab')) {
      await wait(DRAG_RETRY_DELAY);

      return safeChromeCall('tabs.move retry', callback => {
        chrome.tabs.move(tabId, {index}, callback);
      });
    }

    console.warn('tabs.move: ' + error.message);

    return undefined;
  }
}

async function groupTab(tabId, groupId) {
  if (!Number.isInteger(groupId) || groupId < 0) {
    return;
  }

  await safeChromeCall('tabs.group', callback => {
    chrome.tabs.group({tabIds: tabId, groupId}, callback);
  });
}

async function restoreScrollableTabstripFocus(movedTab) {
  if (!movedTab || !Number.isInteger(movedTab.openerTabId)) {
    return;
  }

  const openerTab = await getTab(movedTab.openerTabId);

  if (!openerTab || openerTab.pinned) {
    return;
  }

  await safeChromeCall('tabs.update opener active', callback => {
    chrome.tabs.update(openerTab.id, {active: true}, callback);
  });
  await safeChromeCall('tabs.update moved active', callback => {
    chrome.tabs.update(movedTab.id, {active: true}, callback);
  });
}

async function moveCreatedTab(tab) {
  const state = await getCreatedTabState(tab);

  if (!state) {
    await refreshActiveTabState(tab.windowId);
    return;
  }

  const moveToIndex = state.index + 1;

  if (tab.index === moveToIndex) {
    await groupTab(tab.id, state.groupId);
    await setWindowState({...tab, groupId: state.groupId});
    return;
  }

  const movedTab = await moveTab(tab.id, moveToIndex);

  if (!movedTab) {
    await refreshActiveTabState(tab.windowId);
    return;
  }

  await groupTab(tab.id, state.groupId);
  await restoreScrollableTabstripFocus(movedTab);
  await setWindowState({...movedTab, groupId: state.groupId});
}

chrome.tabs.onCreated.addListener(tab => {
  moveCreatedTab(tab);
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    refreshActiveTabState();
  }
});

chrome.windows.onFocusChanged.addListener(windowId => {
  if (windowId === NO_WINDOW || windowId === NO_ACTIVE_WINDOW) {
    return;
  }

  setTimeout(() => {
    refreshActiveTabState(windowId);
  }, FOCUS_UPDATE_DELAY);
});

chrome.tabs.onActivated.addListener(activeInfo => {
  setTimeout(() => {
    refreshActiveTabState(activeInfo.windowId);
  }, FOCUS_UPDATE_DELAY);
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  refreshActiveTabState(moveInfo.windowId);
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.isWindowClosing) {
    return;
  }

  setTimeout(() => {
    refreshActiveTabState(removeInfo.windowId);
  }, FOCUS_UPDATE_DELAY);
});
