/**
 * Copyright (c) Arnaud Ligny <arnaud@ligny.org>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
"use strict";

// https://developer.chrome.com/extensions/i18n
const ACTIVE_TAB_KEY = `${chrome.i18n.getMessage("@@extension_id")}_active_tab`;

chrome.runtime.onInstalled.addListener(() => {
    storeActiveTab();
    trackActiveWindow();
    startUpdateTabPositions();
    startUpdateParentPositions();
});

/**
 * Track the active window
 */
function trackActiveWindow() {
    chrome.tabs.onActivated.addListener(storeActiveTab);
    chrome.windows.onFocusChanged.addListener(windowId => {
        if (windowId !== chrome.windows.WINDOW_ID_NONE) {
            storeActiveTab({ windowId });
        }
    });
}

/**
 * Query and store the active tab
 *
 * @param {*} {windowId} Optional object containing windowId
 */
function storeActiveTab({ windowId } = {}) {
    if (logErrorExisting("storeActiveTab")) {
        return;
    }
    // get the active tab
    chrome.tabs.query(
        {
            active: true,
            lastFocusedWindow: true,
            windowType: "normal",
            windowId
        },
        ({ 0: { id, windowId: activeWindowId, index, openerTabId } }) => {
            console.log(`Active tab: ${id}, opened by tab: ${openerTabId}`);
            // and store it's information
            chrome.storage.local.set({
                [ACTIVE_TAB_KEY]: { tabId: id, windowId: activeWindowId, tabIndex: index, parentTabId: openerTabId }
            });
        }
    );
}

/**
 * When a new tab is created, track its position as well
 */
function startUpdateTabPositions() {
    chrome.tabs.onCreated.addListener(newTab => {
        chrome.storage.local.get(ACTIVE_TAB_KEY, ({ [ACTIVE_TAB_KEY]: { tabId, windowId, tabIndex } }) => {
            if (logErrorExisting("startUpdateTabPosition")) {
                return;
            }
            if (newTab.windowId === windowId) {
                chrome.tabs.move(newTab.id, { index: tabIndex + 1 });
                console.log(`Moved new tab: ${newTab.id} next to ${tabId}`);
            }
        });
    });
}

/**
 * When a tab is closed, attempt to go back to its parent
 * if possible
 */
function startUpdateParentPositions() {
    chrome.tabs.onRemoved.addListener((closedTabId, { windowId: closedTabWindowId, isWindowClosing }) => {
        // if the window is not closing...
        if (!isWindowClosing) {
            // get the active tab info and...
            chrome.storage.local.get(ACTIVE_TAB_KEY, ({ [ACTIVE_TAB_KEY]: { tabId, windowId, parentTabId } }) => {
                // if the closing tab is not in the same window as our active tab...
                if (closedTabWindowId !== windowId) {
                    // do nothing
                    return;
                }
                console.log(`Closed tab: ${closedTabId}`);
                // if the active tab's parent is closing...
                if (parentTabId === closedTabId) {
                    // update our active tab (mostly to remove the parentTabId)
                    storeActiveTab();
                    return;
                }
                // if closing the active tab
                if (parentTabId && tabId === closedTabId) {
                    // tell chrome to make the parent tab active
                    console.log(`Active tab (${tabId}) closed, activating parent (${parentTabId})`);
                    chrome.tabs.update(parentTabId, { active: true });
                }
            });
        }
    });
}

/**
 * Logs any runtime errors
 *
 * @param tag An identifier for where this function was called from
 * @returns true or false if any error was logged
 */
function logErrorExisting(tag) {
    if (chrome.runtime.lasError) {
        console.error(`${tag}: ${chrome.runtime.lasError.message}`);
        return true;
    }
    return false;
}
