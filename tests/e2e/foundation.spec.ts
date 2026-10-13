import { expect, test, type Page } from "@playwright/test";
import fixture from "../../content/fixtures/pipeline-test.json" with { type: "json" };

const modelRoute = `**${fixture.modelUrl}`;
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}
async function content(page: Page) {
  await expect(page.getByText("Native Waters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Experience preview", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(fixture.disclaimer, { exact: true })).toBeVisible();
  await expect(dialog.getByText("Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close preview" }).click();
  await expect(page.getByRole("button", { name: "Experience preview", exact: true })).toBeFocused();
}
async function ready(page: Page) {
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeEnabled();
}
async function water(page: Page) {
  await ready(page); await page.getByRole("button", { name: "Enter Water", exact: true }).click();
  await expect(page.locator("[data-phase]")).toHaveAttribute("data-phase", "exploring");
  await page.waitForTimeout(300);
}
async function shot(page: Page) { return page.locator("canvas").screenshot(); }
async function changed(page: Page, before: Buffer) {
  await expect.poll(async () => !(await shot(page)).equals(before), { timeout: 15_000 }).toBe(true);
}

test("real GLB playback, keyboard pause and persistent resume", async ({ page }) => {
  const errors = watchErrors(page); const model = page.waitForResponse(modelRoute);
  await page.goto("/"); await content(page); expect((await model).ok()).toBe(true); await water(page);
  const resume = page.getByRole("button", { name: "Resume", exact: true });
  await page.keyboard.press("Tab"); await resume.focus(); expect(await resume.evaluate(button => getComputedStyle(button).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter"); await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveAttribute("aria-pressed", "false");
  await changed(page, await shot(page));
  await page.keyboard.press("Space"); await expect(resume).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300); const paused = await shot(page); await page.waitForTimeout(600);
  expect((await shot(page)).equals(paused)).toBe(true);
  const canvas = await page.locator("canvas").elementHandle(); await page.keyboard.press("Enter");
  expect(await canvas!.evaluate(node => node === document.querySelector("canvas"))).toBe(true);
  await changed(page, paused); expect(errors).toEqual([]);
});

test("reduced motion stays still until explicit fish resume", async ({ page }) => {
  const errors = watchErrors(page); await page.goto("/"); await water(page);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  const initial = await shot(page); await page.waitForTimeout(600); expect((await shot(page)).equals(initial)).toBe(true);
  await page.getByRole("button", { name: "Resume", exact: true }).click(); await changed(page, initial); expect(errors).toEqual([]);
});

test("delayed required asset gates entry but study fallback works", async ({ page }) => {
  const errors = watchErrors(page); let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(modelRoute, async route => { await gate; await route.continue(); });
  await page.goto("/");
  try {
    await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Preparing the water" })).toBeVisible();
    await content(page); await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  } finally { release(); }
  await ready(page); expect(errors).toEqual([]);
});

test("failed viewer module preserves DOM and reload recovers", async ({ page }) => {
  const errors = watchErrors(page);
  let failedChunk = "";
  await page.route("**/_next/static/**/*.js", async route => {
    const response = await route.fetch();
    if ((await response.text()).includes("Native Waters scene")) { failedChunk = route.request().url(); await route.abort("failed"); }
    else await route.fulfill({ response });
  });
  await page.goto("/"); await expect(page.getByRole("alert").filter({ hasText: "The 3D viewer could not load" })).toBeVisible();
  expect(failedChunk).not.toBe(""); await content(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.unroute("**/_next/static/**/*.js");
  await page.getByRole("button", { name: "Reload page", exact: true }).focus(); await page.keyboard.press("Enter");
  await ready(page); await content(page);
  expect(errors.filter(error => !(error.includes(new URL(failedChunk).pathname) || /ChunkLoadError|Failed to load resource: net::ERR_FAILED/.test(error)))).toEqual([]);
});

test("failed asset preserves DOM and cache-clearing retry recovers", async ({ page }) => {
  const errors = watchErrors(page);
  await page.route(modelRoute, route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/"); await expect(page.getByRole("alert").filter({ hasText: "The 3D viewer could not load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeDisabled(); await content(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click(); await page.unroute(modelRoute);
  const model = page.waitForResponse(modelRoute); await page.getByRole("button", { name: "Retry", exact: true }).focus(); await page.keyboard.press("Enter");
  expect((await model).ok()).toBe(true); await ready(page);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(errors.filter(error => !(error.includes(fixture.modelUrl) || /503|Could not load/i.test(error)))).toEqual([]);
});

test("denied WebGL leaves study and keyboard controls usable", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (/webgl/i.test(type)) return null; return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/"); await expect(page.getByRole("alert").filter({ hasText: "The 3D viewer could not load" })).toBeVisible();
  await content(page); await page.getByRole("button", { name: "Resume", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  expect(errors.filter(error => !/WebGL|GL context/i.test(error))).toEqual([]);
});

test("real context loss invalidates readiness and retry restores renderer", async ({ page }) => {
  const errors = watchErrors(page); await page.goto("/"); await ready(page);
  const supported = await page.locator("canvas").evaluate(canvas => {
    const extension = (canvas as HTMLCanvasElement).getContext("webgl2")?.getExtension("WEBGL_lose_context");
    if (!extension) return false; extension.loseContext(); return true;
  });
  test.skip(!supported, "Browser does not expose WEBGL_lose_context");
  await expect(page.getByRole("alert").filter({ hasText: "The 3D viewer could not load" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Water", exact: true })).toBeDisabled(); await content(page);
  await page.getByRole("button", { name: "Retry", exact: true }).click(); await water(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click(); await changed(page, await shot(page));
  expect(errors.filter(error => !/Graphics context lost/i.test(error))).toEqual([]);
});
