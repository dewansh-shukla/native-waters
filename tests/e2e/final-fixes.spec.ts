import { expect, test } from "@playwright/test";
import fixture from "../../content/fixtures/pipeline-test.json" with { type: "json" };

const modelRoute = `**${fixture.modelUrl}`;

test("keyboard Escape from focused Explore and Return to Map restore surviving controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const enter = page.getByRole("button", { name: "Enter Water", exact: true });
  await expect(enter).toBeEnabled(); await enter.focus(); await page.keyboard.press("Enter");
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "exploring");
  const follow = page.getByRole("button", { name: "Follow fish", exact: true });
  await follow.focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Explore Species" }).focus();
  await page.keyboard.press("Escape");
  await expect(follow).toBeFocused();
  const map = page.getByRole("button", { name: "Return to Map", exact: true });
  await map.focus(); await page.keyboard.press("Enter");
  await expect(enter).toBeFocused();
});

test("resolved compilation with denied shader linking offers Retry and never enables entry", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = WebGL2RenderingContext.prototype.getProgramParameter;
    const deniedContexts = new WeakSet<WebGL2RenderingContext>();
    let firstContext = true;
    WebGL2RenderingContext.prototype.getProgramParameter = function (program, parameter) {
      if (parameter === this.LINK_STATUS) {
        if (firstContext) { deniedContexts.add(this); firstContext = false; }
        if (deniedContexts.has(this)) return false;
      }
      return original.call(this, program, parameter);
    };
  });
  await page.goto("/");
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Experience preview", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Public domain license" })).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  await retry.click();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
});

test("context loss during descent waits through delayed retry and completes after rewarming", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let models = 0;
  page.on("request", request => { if (request.url().includes(fixture.modelUrl)) models++; });
  await page.goto("/");
  const phase = page.locator("[data-phase]");
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Enter Water", exact: true }).click();
  await expect(phase).toHaveAttribute("data-phase", "entering");
  await page.waitForTimeout(1000);
  const supported = await page.locator("canvas").evaluate(canvas => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext(); return true;
  });
  test.skip(!supported, "WEBGL_lose_context unavailable");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(modelRoute, async route => { await gate; await route.continue(); });
  try {
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => models).toBe(2);
    // Real loading delay exceeds descent duration; no animation timer or runtime override.
    await page.waitForTimeout(6500);
    await expect(phase).toHaveAttribute("data-phase", "entering");
    await expect(page.getByRole("button", { name: "Follow fish", exact: true })).toHaveCount(0);
  } finally { release(); }
  await expect(phase).toHaveAttribute("data-phase", "exploring", { timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Return to Map", exact: true }).click();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeFocused();
  expect(models).toBe(2);
});
