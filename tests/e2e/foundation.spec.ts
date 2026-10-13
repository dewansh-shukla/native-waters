import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
});

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function content(page: Page) {
  await expect(page.getByRole("heading", { name: "Native Waters", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pipeline test — not a real species", exact: true })).toBeVisible();
  await expect(page.getByText("Demonstrates asset loading and animation, not verified anatomy or ecology.", { exact: true })).toBeVisible();
}

async function ready(page: Page) {
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
  // Allow the first model frame and lighting to reach the compositor.
  await page.waitForTimeout(300);
}

async function shot(page: Page) {
  return page.locator("canvas").screenshot();
}

async function changed(page: Page, before: Buffer) {
  await expect.poll(async () => !(await shot(page)).equals(before), { timeout: 5000 }).toBe(true);
}

test("semantic content, real GLB playback, keyboard pause and persistent resume", async ({ page }) => {
  const errors = watchErrors(page);
  const model = page.waitForResponse("**/models/pipeline-test.glb");
  await page.goto("/");
  await content(page);
  expect((await model).ok()).toBe(true);
  await ready(page);
  const running = await shot(page);
  await changed(page, running);
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  await pause.focus();
  await expect(pause).toBeFocused();
  expect(await pause.evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(250);
  const paused = await shot(page);
  await page.waitForTimeout(600);
  expect((await shot(page)).equals(paused)).toBe(true);
  const canvas = await page.locator("canvas").elementHandle();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await canvas!.evaluate((node) => node === document.querySelector("canvas"))).toBe(true);
  await changed(page, paused);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("reduced motion has no initial animation and explicit resume works", async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  const initial = await shot(page);
  await page.waitForTimeout(600);
  expect((await shot(page)).equals(initial)).toBe(true);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await changed(page, initial);
  expect(errors).toEqual([]);
});

test("delayed asset shows DOM loading status", async ({ page }) => {
  const errors = watchErrors(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/pipeline-test.glb", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  try {
    await content(page);
    await expect(page.getByRole("status").filter({ hasText: "Loading 3D model" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  } finally { release(); }
  await ready(page);
  expect(errors).toEqual([]);
});

test("failed viewer module preserves DOM and reload recovers", async ({ page }) => {
  const errors: { text: string; url?: string }[] = [];
  page.on("pageerror", (error) => errors.push({ text: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ text: message.text(), url: message.location().url });
  });
  let failedChunk = "";
  await page.route("**/_next/static/**/*.js", async (route) => {
    const response = await route.fetch();
    if ((await response.text()).includes("Animated pipeline test model")) {
      failedChunk = route.request().url();
      await route.abort("failed");
    } else {
      await route.fulfill({ response });
    }
  });
  await page.goto("/");
  await expect(page.getByRole("region").getByRole("alert")).toContainText("The 3D viewer could not load");
  expect(failedChunk).not.toBe("");
  await content(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.unroute("**/_next/static/**/*.js");
  await page.getByRole("button", { name: "Reload page", exact: true }).focus();
  await page.keyboard.press("Enter");
  await ready(page);
  await content(page);
  expect(errors.filter(({ text, url }) => !(
    (text === "Failed to load resource: net::ERR_FAILED" && url === failedChunk) ||
    (text.startsWith(`ChunkLoadError: Failed to load chunk ${new URL(failedChunk).pathname} from module `))
  ))).toEqual([]);
});

test("failed asset preserves DOM and retry recovers", async ({ page }) => {
  const errors = watchErrors(page);
  await page.route("**/models/pipeline-test.glb", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("/");
  await expect(page.getByRole("region").getByRole("alert")).toContainText("The 3D viewer could not load");
  await content(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.unroute("**/models/pipeline-test.glb");
  const model = page.waitForResponse("**/models/pipeline-test.glb");
  await page.getByRole("button", { name: "Retry", exact: true }).focus();
  await page.keyboard.press("Enter");
  expect((await model).ok()).toBe(true);
  await ready(page);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region").getByRole("alert")).toHaveCount(0);
  expect(errors.filter((error) => !/503|pipeline-test\.glb|Could not load/i.test(error))).toEqual([]);
});

test("denied WebGL leaves content and keyboard controls usable", async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("region").getByRole("alert")).toContainText("The 3D viewer could not load");
  await content(page);
  await page.getByRole("button", { name: "Pause", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(errors.filter((error) => !/WebGL|GL context/i.test(error))).toEqual([]);
});

test("real context loss shows fallback and retry creates a working renderer", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await ready(page);
  const supported = await page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  test.skip(!supported, "Browser does not expose WEBGL_lose_context");
  await expect(page.getByRole("region").getByRole("alert")).toContainText("The 3D viewer could not load");
  await content(page);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await ready(page);
  await changed(page, await shot(page));
  expect(errors.filter((error) => !/Graphics context lost/i.test(error))).toEqual([]);
});
