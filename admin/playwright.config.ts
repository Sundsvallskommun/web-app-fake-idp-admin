import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-tester mot den KÖRANDE docker-stacken (proxyn på ADMIN_PORT) — inte mot
 * en fristående dev-server. Same-origin via proxyn är ett krav för att admin-
 * sessionscookien ska fungera, så det är också det enda ärliga sättet att testa.
 *
 *   docker compose up -d --build   # från repo-roten
 *   cd admin && yarn test:e2e
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:7001';

export default defineConfig({
  testDir: './playwright',
  outputDir: 'test-results/playwright',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
