import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("normal five-second dive, live scene, pointer target and preview composition", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
  await mkdir("artifacts/experience-preview", { recursive: true });
  const prefix = testInfo.project.name === "touch-chromium" ? "mobile" : "desktop";
  await page.screenshot({ path: `artifacts/experience-preview/${prefix}-map.png` });
  const enter = page.getByRole("button", { name: "Enter Water", exact: true });
  if (prefix === "mobile") await enter.tap(); else await enter.click();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "entering");
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "entering");
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "exploring", { timeout: 75_000 });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `artifacts/experience-preview/${prefix}-water.png` });
  // Find one real padded raycast target through hover, not a synthetic selection hook.
  if (prefix === "desktop") {
    const box = (await page.locator("canvas").boundingBox())!;
    let found = false;
    for (let y = .44; y < .61 && !found; y += .03) for (let x = .60; x < .98 && !found; x += .03) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      if (await page.locator(".experience-hover-label").isVisible()) {
        await page.mouse.click(box.x + box.width * x, box.y + box.height * y); found = true;
      }
    }
    expect(found).toBe(true);
    await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "following");
    await page.getByRole("button", { name: "Back to Water", exact: true }).click();
  }
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const initial = await page.locator("canvas").screenshot();
  await page.waitForTimeout(30_000);
  expect((await page.locator("canvas").screenshot()).equals(initial)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("sound only activates explicitly, rejection is nonblocking and recoverable", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    let rejects = true;
    Object.defineProperty(window, "__audioCreated", { value: 0, writable: true });
    window.AudioContext = class extends Original {
      constructor(...args: ConstructorParameters<typeof AudioContext>) { super(...args); (window as unknown as { __audioCreated: number }).__audioCreated++; }
      resume() { if (rejects) { rejects = false; return Promise.reject(new Error("Activation denied")); } return super.resume(); }
    };
  });
  await page.goto("/"); await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { __audioCreated: number }).__audioCreated)).toBe(0);
  await page.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sound is unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
  await page.getByRole("button", { name: "Sound on", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Sound is unavailable" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sound off", exact: true }).click();
});
