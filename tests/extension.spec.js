import {test, expect} from './fixtures.js';

test.describe('Open New Tab After Current Tab', () => {
  test('service worker is loaded', async ({context}) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ||= await context.waitForEvent('serviceworker');
    expect(serviceWorker).toBeTruthy();
    expect(serviceWorker.url()).toContain('background.js');
  });

  test('new tab opens after the current active tab', async ({context}) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ||= await context.waitForEvent('serviceworker');

    // Open two extra tabs so there are several tabs to move between.
    const page1 = await context.newPage();
    await page1.waitForTimeout(600);
    const page2 = await context.newPage();
    await page2.waitForTimeout(600);

    // Activate page1 and wait for the extension's 300 ms debounce to settle.
    await page1.bringToFront();
    await page1.waitForTimeout(600);

    // Snapshot the current state: active tab index + total tab count.
    const tabsBefore = await serviceWorker.evaluate(() => chrome.tabs.query({currentWindow: true}));
    const activeTab = tabsBefore.find(tab => tab.active);
    const activeIndex = activeTab.index;
    const totalBefore = tabsBefore.length;

    // Open a new tab — the extension should move it to activeIndex + 1.
    const newPage = await context.newPage();
    // Wait for the extension's onCreated handler to finish moving the tab.
    await newPage.waitForTimeout(600);

    const tabsAfter = await serviceWorker.evaluate(() => chrome.tabs.query({currentWindow: true}));

    expect(tabsAfter.length).toBe(totalBefore + 1);

    // Identify the newly created tab by elimination.
    const beforeIds = new Set(tabsBefore.map(t => t.id));
    const newTab = tabsAfter.find(t => !beforeIds.has(t.id));
    expect(newTab).toBeTruthy();
    expect(newTab.index).toBe(activeIndex + 1);
  });
});
