import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'ui.spec.mjs',
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
});
