import { expect, test } from '@playwright/test';

test('field guide remains readable and navigable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/field-guide`);
  await expect(page).toHaveTitle('Indian river fish field guide | Native Waters');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Indian rivers,one fish at a time.');
  await expect(page.locator('article')).toHaveCount(13);
  await page.getByRole('navigation', { name: 'Rivers in the field guide' }).getByRole('link', { name: 'Godavari' }).click();
  await expect(page).toHaveURL(/#godavari$/);
  await expect(page.locator('#badis-badis')).toContainText('Native status uncertain');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('field-guide-mobile.png'), fullPage: true });
  const sitemap = await page.request.get(`${baseURL}/sitemap.xml`);
  expect(await sitemap.text()).toContain('https://native-waters.vercel.app/field-guide');
  await page.getByRole('link', { name: 'Native Waters', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Indian river fish field guide' })).toBeVisible();
  await context.close();
});
