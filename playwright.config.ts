import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/pages/**',
  fullyParallel: true,
  workers: 2,
  expect: { timeout: 15000 },
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4200 --no-hmr',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
});
