import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test as base, chromium} from '@playwright/test';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(dirname, '..', 'src');

export const test = base.extend({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({context}, use) => {
    let [serviceWorker] = context.serviceWorkers();
    serviceWorker ||= await context.waitForEvent('serviceworker');
    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});

export const {expect} = test;
