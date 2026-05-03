import process from 'node:process';
import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
});
