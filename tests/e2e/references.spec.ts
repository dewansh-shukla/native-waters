import { expect, test } from '@playwright/test';
import catalog from '../../content/catalog/freshwater.json' with { type: 'json' };
const SITE_ORIGIN = "https://www.discovernativewaters.com";

test('all basin and species paths serve factual HTML without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const river of catalog.rivers) {
    const response = await page.goto(`${baseURL}/basins/${river.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${river.name} river basin`);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `${SITE_ORIGIN}/basins/${river.id}`);
    await expect(page.getByText(river.scope, { exact: true })).toBeVisible();
  }
  for (const species of catalog.species) {
    const response = await page.goto(`${baseURL}/species/${species.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(species.commonName);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `${SITE_ORIGIN}/species/${species.id}`);
    await expect(page.locator('main')).toContainText(species.scientificName);
    for (const association of species.associations) {
      await expect(page.locator('main')).toContainText(association.note);
      await expect(page.locator('main')).toContainText(association.evidencePeriod);
    }
  }
  for (const path of ['/basins/not-a-river', '/species/not-a-fish']) {
    expect((await page.goto(`${baseURL}${path}`))?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('River or species not found');
  }
  await context.close();
});

test('HTML-first records open and close their own basin experience', async ({ page }, info) => {
  await page.goto('/basins/godavari');
  await page.getByRole('link', { name: 'Blue perch', exact: true }).click();
  await expect(page).toHaveURL(/\/species\/badis-badis$/);
  await expect(page.getByText('Native status uncertain', { exact: true })).toBeVisible();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(heading!.y).toBeLessThan(page.viewportSize()!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('reference-layout.png') });
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const open = page.getByRole('button', { name: 'Open illustrative 3D preview' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Godavari underwater experience' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('canvas')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Enter Water', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Close experience', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(open).toBeFocused();
  await expect(page.getByText('Native status uncertain', { exact: true })).toBeVisible();
});
