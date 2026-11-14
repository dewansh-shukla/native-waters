import { expect, test } from "@playwright/test";

test("ganga experience renders", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/experience/ganga");
  await expect(page.locator("[data-phase]")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});