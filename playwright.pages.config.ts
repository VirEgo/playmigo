import { defineConfig, devices } from '@playwright/test';

const baseHref = process.env['PAGES_BASE_HREF'] ?? '/child-trainer/';
if (!/^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(baseHref) || baseHref.split('/').includes('..')) {
  throw new Error('PAGES_BASE_HREF must be an absolute path ending in /.');
}

export default defineConfig({
  testDir: './e2e/pages',
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:4301${baseHref}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/build-pages.mjs --base-href ${baseHref} && npm run preview:pages`,
    url: `http://127.0.0.1:4301${baseHref}`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
