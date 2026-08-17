import { defineConfig, devices } from '@playwright/test';

const port = process.env.PORT ?? '3000';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const baseURL = `http://127.0.0.1:${port}${basePath}`;
const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

export default defineConfig({
  testDir: './playwright',
  outputDir: 'test-results/playwright',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
    },
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: {
      width: 1440,
      height: 1024,
    },
  },
  webServer: {
    command: `yarn dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...inheritedEnvironment,
      HEALTH_AUTH: 'false',
      HEALTH_PASSWORD: '',
      HEALTH_USERNAME: '',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001/api',
      NEXT_PUBLIC_APP_NAME: 'Web app starter',
      NEXT_PUBLIC_BASE_PATH: basePath,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
