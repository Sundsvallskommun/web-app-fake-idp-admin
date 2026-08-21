import { test as base, type Page } from '@playwright/test';

interface AppFixtures {
  appPage: Page;
}

const getMeResponse = {
  data: {
    username: 'username',
    name: 'Förnamn Efternamn',
  },
  message: 'success',
};

export const test = base.extend<AppFixtures>({
  appPage: async ({ baseURL, context, page }, provide) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL must be configured');
    }

    await context.addCookies([
      {
        name: 'SKCookieConsent',
        value: 'necessary%2Cstats',
        url: baseURL,
      },
    ]);
    await page.route('**/api/me', async route => {
      await route.fulfill({
        json: getMeResponse,
      });
    });
    await page.goto('/');

    await provide(page);
  },
});

export { expect } from '@playwright/test';
