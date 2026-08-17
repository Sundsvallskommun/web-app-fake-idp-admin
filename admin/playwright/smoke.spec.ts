import { expect, Page, test } from '@playwright/test';

/**
 * Smokes för de tre kärnflödena: logga in, se listan, skapa/ta bort en grupp.
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
