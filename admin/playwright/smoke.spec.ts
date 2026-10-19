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

test('fält med olika långa hjälptexter ligger på samma nivå', async ({ page }) => {
  await login(page);
  await page.goto('/users/new');

  const citizenIdentifier = await page.locator('#known-citizenIdentifier').boundingBox();
  const username = await page.locator('#known-username').boundingBox();

  expect(citizenIdentifier).not.toBeNull();
  expect(username).not.toBeNull();
  expect(citizenIdentifier?.y).toBeCloseTo(username?.y ?? Number.NaN, 0);
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
  const removeDialog = page.getByRole('alertdialog');
  await expect(removeDialog).toBeVisible();
  await removeDialog.getByRole('button', { name: 'Ta bort' }).click();
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

test('lösenordskrav gäller per testanvändare i admin och IdP-inloggningen', async ({ page }) => {
  const suffix = Date.now();
  const freeName = `E2E Fri ${suffix}`;
  const protectedName = `E2E Skyddad ${suffix}`;
  const password = 'test-only-password';
  const userIds: string[] = [];
  await login(page);

  try {
    for (const [name, protectedUser] of [
      [freeName, false],
      [protectedName, true],
    ] as const) {
      await page.goto('/users/new');
      await page.locator('#user-name').fill(name);
      await page.locator('#user-username').fill(name);
      const toggle = page.getByRole('switch', { name: 'Kräv lösenord vid inloggning' });
      await expect(toggle).not.toBeChecked();
      await expect(page.locator('#user-password')).not.toHaveAttribute('required');
      if (protectedUser) {
        await toggle.check();
        await expect(page.locator('#user-password')).toHaveAttribute('required');
        await page.locator('#user-password').fill(password);
      }
      await page.getByRole('button', { name: 'Spara' }).click();
      await page.waitForURL(/\/users\/(?!new$)[^/]+$/);
      userIds.push(new URL(page.url()).pathname.split('/').pop()!);
      await page.reload();
      await expect(toggle).toBeChecked({ checked: protectedUser });
    }

    // Fetch after the UI has loaded its CSRF token, so parallel initial page
    // requests cannot leave this test holding an earlier token.
    const csrfResponse: { data: { token: string } } = await (await page.request.get('/api/admin-auth/csrf')).json();
    const headers = { 'x-csrf-token': csrfResponse.data.token };

    // Direct API writes must preserve a usable password for protected users.
    const invalidCreate = await page.request.post('/api/users', {
      headers,
      data: { name: 'Invalid', username: 'invalid', requirePassword: true },
    });
    expect(invalidCreate.status()).toBe(400);
    const invalidUpdate = await page.request.put(`/api/users/${userIds[1]}`, { headers, data: { password: '' } });
    expect(invalidUpdate.status()).toBe(400);
    const invalidEnable = await page.request.put(`/api/users/${userIds[0]}`, {
      headers,
      data: { requirePassword: true },
    });
    expect(invalidEnable.status()).toBe(400);

    await page.goto('/api/saml/idp/login');
    const freeChoice = page.getByRole('radio', { name: freeName, exact: false });
    const protectedChoice = page.getByRole('radio', { name: protectedName, exact: false });
    await freeChoice.check();
    await expect(page.getByLabel('Lösenord', { exact: true })).toBeHidden();
    await protectedChoice.check();
    const passwordInput = page.getByLabel('Lösenord', { exact: true });
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('required');
    await passwordInput.fill('wrong');
    await freeChoice.check();
    await protectedChoice.check();
    await expect(passwordInput).toHaveValue('');

    // Filtering can select another person and must update the password field too.
    await page.getByRole('searchbox').fill(freeName);
    await expect(passwordInput).toBeHidden();
    await page.getByRole('searchbox').fill(protectedName);
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('wrong');
    await page.getByRole('button', { name: 'Logga in som testidentitet' }).click();
    await expect(page.getByRole('alert')).toContainText('Fel användare eller lösenord');
    await expect(protectedChoice).toBeChecked();
    await expect(passwordInput).toHaveValue('');
    await passwordInput.fill(password);
    await page.getByRole('button', { name: 'Logga in som testidentitet' }).click();
    await expect(page.getByRole('heading', { name: `Inloggad som ${protectedName}` })).toBeVisible();
    await page.getByRole('button', { name: 'Logga ut testidentitet' }).click();
    await freeChoice.check();
    await page.getByRole('button', { name: 'Logga in som testidentitet' }).click();
    await expect(page.getByRole('heading', { name: `Inloggad som ${freeName}` })).toBeVisible();

    // Enabling the requirement invalidates a session established without a password.
    const enable = await page.request.put(`/api/users/${userIds[0]}`, {
      headers,
      data: { requirePassword: true, password },
    });
    expect(enable.ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Välj testidentitet' })).toBeVisible();
    await freeChoice.check();
    await expect(passwordInput).toBeVisible();

    // Disable and clear the password together: password-free login works again.
    const disable = await page.request.put(`/api/users/${userIds[0]}`, {
      headers,
      data: { requirePassword: false, password: '' },
    });
    expect(disable.ok()).toBe(true);
    await page.reload();
    await freeChoice.check();
    await expect(passwordInput).toBeHidden();
    await page.getByRole('button', { name: 'Logga in som testidentitet' }).click();
    await expect(page.getByRole('heading', { name: `Inloggad som ${freeName}` })).toBeVisible();
  } finally {
    const csrfResponse: { data: { token: string } } = await (await page.request.get('/api/admin-auth/csrf')).json();
    for (const id of userIds) {
      const response = await page.request.delete(`/api/users/${id}`, {
        headers: { 'x-csrf-token': csrfResponse.data.token },
      });
      expect.soft(response.ok(), `Could not delete test user ${id}: ${response.status()}`).toBe(true);
    }
  }
});
