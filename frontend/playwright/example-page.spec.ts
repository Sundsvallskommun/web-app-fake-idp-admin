import { expect, test } from './app.fixture';

test('renders the example page', async ({ appPage }) => {
  await expect(appPage.getByRole('main')).toBeVisible();
  await expect(appPage.getByRole('heading', { level: 1 })).toHaveText('Välkommen Förnamn Efternamn!');
  await expect(appPage.locator('[data-cy="example-text"]')).toHaveScreenshot('example-text.png');
});
