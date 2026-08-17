import { expect, test } from './app.fixture';

test('moves focus to the main content from the skip link', async ({ appPage }) => {
  const skipLink = appPage.getByRole('link', { name: 'Hoppa till innehåll' });

  await skipLink.focus();
  await skipLink.click();

  await expect(appPage.getByRole('main')).toBeFocused();
});
