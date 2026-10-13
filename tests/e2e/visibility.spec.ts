import { expect, test } from "@playwright/test";

test("visibility boundary pauses a resumed reduced-motion school without changing user preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Enter Water", exact: true }).click();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "exploring");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  // Exercise the browser visibility API boundary; real OS tab scheduling is not emulated here.
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(300);
  const paused = await page.locator("canvas").screenshot();
  await page.waitForTimeout(600);
  expect((await page.locator("canvas").screenshot()).equals(paused)).toBe(true);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(async () => !(await page.locator("canvas").screenshot()).equals(paused), { timeout: 15_000 }).toBe(true);
});
