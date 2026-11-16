import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

async function waitForMap(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator(".experience-ui")).toBeVisible({ timeout: 60_000 });
}

async function enterWater(page: import("@playwright/test").Page) {
  const enter = page.getByRole("button", { name: "Enter Water", exact: true });
  await enter.tap();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "exploring", { timeout: 75_000 });
}

/** Turn the phone sideways for the water; fullscreen/orientation lock is best
 *  effort, so drop it first and force a deterministic landscape viewport. */
async function landscape(page: import("@playwright/test").Page) {
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined));
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".experience-rotate")).toBeHidden();
}

test("mobile: no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(120_000);
  await waitForMap(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("mobile: touch targets are at least 44px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitForMap(page);
  await enterWater(page);
  await landscape(page);
  await page.getByRole("button", { name: "Follow fish", exact: true }).tap();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "following", { timeout: 10_000 });
  const sizes = await page.locator(".experience-ui button, .experience-ui select").evaluateAll(els =>
    els
      .map(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? { w: r.width, h: r.height } : null;
      })
      .filter((v): v is { w: number; h: number } => v !== null)
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) {
    expect(size.w).toBeGreaterThanOrEqual(44);
    expect(size.h).toBeGreaterThanOrEqual(44);
  }
});

test("mobile: story text is readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitForMap(page);
  const mapIntroFont = await page.locator(".experience-map-intro").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(mapIntroFont).toBeGreaterThanOrEqual(12);
  await enterWater(page);
  await landscape(page);
  await page.getByRole("button", { name: "Follow fish", exact: true }).tap();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "following", { timeout: 10_000 });
  const followCardFont = await page.locator(".experience-follow-card").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  expect(followCardFont).toBeGreaterThanOrEqual(12);
});

test("mobile: map owns the viewport and the reference follows it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(120_000);
  await waitForMap(page);
  const viewport = page.viewportSize()!;
  const visualHeight = await page.locator("[data-reference-visual]").evaluate(el => el.getBoundingClientRect().height);
  expect(visualHeight).toBeGreaterThanOrEqual(viewport.height - 2);
  // The reference panel is in normal document flow below the full-screen map.
  const panelTop = await page.locator("#river-reference").evaluate(el => el.getBoundingClientRect().top);
  expect(panelTop).toBeGreaterThanOrEqual(visualHeight - 2);
  await page.locator("#river-reference h1").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Indian rivers, living records." })).toBeVisible();
});

test("mobile: portrait water asks for landscape, which then fills the screen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await waitForMap(page);
  await enterWater(page);
  // Fullscreen/orientation lock is best effort; exit it so the viewport is
  // deterministic, then force each orientation.
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined));
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".experience-rotate")).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".experience-rotate")).toBeHidden();
  await expect(page.locator("canvas")).toBeVisible();
});

test("mobile: landscape orientation does not crash", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "touch-chromium", "touch-chromium only");
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await waitForMap(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});
