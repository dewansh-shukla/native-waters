import { expect, test } from '@playwright/test';
const SITE_ORIGIN = "https://www.discovernativewaters.com";

test('field guide remains readable and navigable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/field-guide`);
  await expect(page).toHaveTitle('Indian river fish field guide | Native Waters');
  await expect(page.locator('article')).toHaveCount(13);
  await page.getByRole('navigation', { name: 'Rivers in the field guide' }).getByRole('link', { name: 'Godavari' }).click();
  await expect(page).toHaveURL(/#godavari$/);
  await expect(page.locator('#badis-badis')).toContainText('Native status uncertain');
  await page.locator('#badis-badis summary').click();
  await expect(page.locator('#badis-badis')).toContainText('Evidence period');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('field-guide-mobile.png'), fullPage: true });
  const sitemap = await page.request.get(`${baseURL}/sitemap.xml`);
  expect(await sitemap.text()).toContain(`${SITE_ORIGIN}/field-guide`);
  await page.locator('header').getByRole('link', { name: 'Native Waters', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Discover species', exact: true })).toBeVisible();
  await context.close();
});
