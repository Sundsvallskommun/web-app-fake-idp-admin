import { expect, Page, test } from '@playwright/test';

/**
 * Smokes för kärnflöden som behöver verifieras i en riktig webbläsare.
 * Nästan alla regressionsfel i migreringen var osynliga för tsc/lint/build —
 * de här testerna är det minsta som faktiskt öppnar appen i en webbläsare.
 *
 * Kontot är simulatorns dokumenterade default (admin/admin, styrs av
 * ADMIN_USERNAME/ADMIN_PASSWORD i stackens .env).
 */

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin';

const login = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Användarnamn').fill(ADMIN_USERNAME);
  await page.getByLabel('Lösenord', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Logga in' }).click();
  await page.waitForURL('**/start');
};

test('inloggning med adminkontot landar på startsidan', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: /välkommen/i })).toBeVisible();
});

test('testidentitetslistan renderar rubrik, filter och verktygsrad', async ({ page }) => {
  await login(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: /testidentiteter/i })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: /filtrera/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /importera testidentiteter/i })).toBeVisible();
});

test('mörkt läge består vid navigation och omladdning', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: /följ system|ljust läge|mörkt läge/i }).click();
  await page.getByRole('menuitemradio', { name: /mörkt läge/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

  await page.getByRole('link', { name: /testidentiteter/i }).click();
  await page.waitForURL('**/users');
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.getByRole('button', { name: 'Grupper', exact: true }).click();
  await page.getByRole('link', { name: /lista alla grupper/i }).click();
  await page.waitForURL('**/groups');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
});

test('personnummer är maskerat tills ögat används', async ({ page }) => {
  const uniqueId = Date.now();
  const citizenIdentifier = '199001011234';

  await login(page);
  await page.goto('/users/new');
  await page.locator('#user-name').fill(`E2E Personnummer ${uniqueId}`);
  await page.locator('#user-username').fill(`e2e-${uniqueId}`);
  await page.locator('#user-password').fill('test-password');
  await page.locator('#known-citizenIdentifier').fill(citizenIdentifier);
  await page.getByRole('button', { name: 'Spara' }).click();
  await page.waitForURL(/\/users\/(?!new$)[^/]+$/);

  const citizenIdentifierInput = page.locator('#known-citizenIdentifier');
  await expect(citizenIdentifierInput).toHaveAttribute('type', 'password');
  await expect(citizenIdentifierInput).toHaveValue('••••••••••••');

  await page.getByRole('button', { name: 'Visa personnummer' }).click();
  await expect(citizenIdentifierInput).toHaveAttribute('type', 'text');
  await expect(citizenIdentifierInput).toHaveValue(citizenIdentifier);

  await page.reload();
  await expect(citizenIdentifierInput).toHaveValue('••••••••••••');
  await page.getByRole('button', { name: 'Visa personnummer' }).click();
  await expect(citizenIdentifierInput).toHaveValue(citizenIdentifier);

  await page.getByRole('button', { name: 'Ta bort' }).click();
  await page.waitForURL('**/users');
});

test('en grupp kan skapas och tas bort', async ({ page }) => {
  // Unikt namn utan komma (namnvalideringen förbjuder komma) så parallella
  // körningar och rester från avbrutna körningar inte kolliderar.
  const groupName = `e2e-smoke-${Date.now()}`;

  await login(page);
  await page.goto('/groups/new');
  await page.getByLabel(/gruppnamn/i).fill(groupName);
  await page.getByLabel(/beskrivning/i).fill('Skapad av smoke-testet. Tas bort direkt.');
  await page.getByRole('button', { name: 'Spara' }).click();

  // Lyckat skapande navigerar till redigeringsvyn för den nya gruppen.
  await page.waitForURL(/\/groups\/\d+$/);

  await page.getByRole('button', { name: 'Ta bort' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Ta bort' }).click();
  await page.waitForURL('**/groups');

  // Verifiera via filtret att gruppen är borta.
  await page.getByRole('searchbox', { name: /filtrera/i }).fill(groupName);
  await expect(page.getByRole('heading', { name: /inga grupper/i })).toBeVisible();
});
