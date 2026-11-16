import { expect, test } from '@playwright/test';

test('river discovery connects the underwater exhibit to a sourced species and back', async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('group', { name: 'Choose a river basin' }).getByRole('button', { name: 'Cauvery', exact: true }).click();
  await page.getByRole('link', { name: 'Explore Cauvery', exact: true }).click();
  await expect(page).toHaveURL(/\/basins\/cauvery#river-experience$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open illustrative 3D preview' }).click();
  const exhibit = page.getByRole('dialog', { name: 'Cauvery underwater experience' });
  await expect(exhibit.getByRole('button', { name: 'Enter Water', exact: true })).toBeEnabled();
  await exhibit.getByRole('button', { name: 'Enter Water', exact: true }).click();
  await expect(exhibit.locator('[data-phase]')).toHaveAttribute('data-phase', 'exploring');
  await exhibit.getByRole('combobox', { name: 'Quality', exact: true }).selectOption('HIGH');
  await exhibit.getByRole('combobox', { name: 'Select fish', exact: true }).selectOption('fish-10');
  await exhibit.getByRole('button', { name: 'Follow fish', exact: true }).click();
  // The inner story dialog must not close or unmount its containing exhibit.
  await exhibit.getByRole('button', { name: 'Explore Species', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(exhibit).toBeVisible();
  await expect(exhibit.getByRole('button', { name: 'Explore Species', exact: true })).toBeFocused();
  await exhibit.getByRole('link', { name: 'Read species profile Dawkinsia arulius', exact: true }).click();
  await expect(page).toHaveURL(/\/species\/dawkinsia-arulius$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arulius barb');
  await expect(page.locator('main')).toContainText('Dawkinsia arulius');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore the Cauvery', exact: true }).click();
  await expect(page).toHaveURL(/\/basins\/cauvery$/);
  await expect(page.getByRole('link', { name: 'Arulius barb', exact: true })).toBeVisible();
});

test('search routes a direct species visitor to a factual profile', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Search fish, rivers or species' });
  await search.fill('no-such-fish');
  await expect(page.getByRole('status')).toContainText('No matching');
  await search.fill('Rohu');
  await page.getByRole('list', { name: 'Search results' }).getByRole('link').click();
  await expect(page).toHaveURL(/\/species\/labeo-rohita$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rohu');
  await expect(page.locator('main')).toContainText('Labeo rohita');
  await expect(page.locator('canvas')).toHaveCount(0);
});
