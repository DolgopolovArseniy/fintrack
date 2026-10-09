import { defineConfig, devices } from '@playwright/test';

const DEV_SERVER_PORT = 5180;
const AUTH_EMULATOR_PORT = 9099;
const FIREBASE_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'fintrack-dev-4fb7e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${DEV_SERVER_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `pnpm exec firebase emulators:start --only auth,firestore --project ${FIREBASE_PROJECT_ID}`,
      url: `http://127.0.0.1:${AUTH_EMULATOR_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: `pnpm dev --port ${DEV_SERVER_PORT} --strictPort`,
      url: `http://localhost:${DEV_SERVER_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_USE_EMULATORS: 'true',
        VITE_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
        VITE_FIREBASE_API_KEY: 'demo-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
        VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef',
      },
      timeout: 120 * 1000,
    },
  ],
});
