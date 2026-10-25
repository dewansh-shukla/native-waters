import { expect, test } from '@playwright/test';
import catalog from '../../content/catalog/freshwater.json' with { type: 'json' };

test('all basin and species paths serve factual HTML without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const river of catalog.rivers) {
    const response = await page.goto(`${baseURL}/basins/${river.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${river.name} river basin`);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://native-waters.vercel.app/basins/${river.id}`);
    await expect(page.getByText(river.scope, { exact: true })).toBeVisible();
  }
  for (const species of catalog.species) {
    const response = await page.goto(`${baseURL}/species/${species.id}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(species.commonName);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://native-waters.vercel.app/species/${species.id}`);
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

test('responsive split, linked records and optional illustrative preview', async ({ page }, info) => {
  await page.goto('/basins/godavari');
  await page.getByRole('link', { name: 'Blue perch', exact: true }).click();
  await expect(page).toHaveURL(/\/species\/badis-badis$/);
  await expect(page.getByText('Native status uncertain', { exact: true })).toBeVisible();
  const visual = await page.locator('[data-reference-visual]').boundingBox();
  const panel = await page.getByRole('region', { name: 'River and species reference' }).boundingBox();
  expect(visual).not.toBeNull(); expect(panel).not.toBeNull();
  if (info.project.name === 'desktop-chromium') {
    expect(visual!.width / (visual!.width + panel!.width)).toBeCloseTo(.65, 2);
    expect(panel!.x).toBeCloseTo(visual!.width, 0);
  } else {
    expect(panel!.y).toBeCloseTo(visual!.height, 0);
    expect(visual!.height).toBeCloseTo(page.viewportSize()!.height / 2, 0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('reference-layout.png') });
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open illustrative 3D preview' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter Water', exact: true })).toBeEnabled();
  await expect(page.getByText('Native status uncertain', { exact: true })).toBeVisible();
});
