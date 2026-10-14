import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:3000/api';
const apiHealthUrl = new URL('/ready', new URL(apiUrl).origin).toString();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'npm start --prefix ../backend',
      url: apiHealthUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${new URL(frontendUrl).port || 5173} --strictPort`,
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        VITE_API_PROXY_TARGET: new URL(apiUrl).origin,
      },
    },
  ],
});
