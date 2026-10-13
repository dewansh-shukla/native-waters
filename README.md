# Native Waters

A single Next.js/TypeScript application establishing the Blender-to-browser foundation for native Indian fish exploration. This milestone is **not** the finished map-to-river underwater experience.

## Run locally

Use Node 24 LTS (`.nvmrc`; at least 24.15) and npm. Final local verification used an isolated Node 24.21.0 runtime; the globally installed Node 26 was left unchanged. CI targets Node 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Dependencies are pinned in `package-lock.json`. No credentials, external asset service, database, or network fonts are required.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts the **production build**, not the dev server, on dedicated `127.0.0.1:43187`; leave that port free. It runs desktop and 390×844 mobile-sized Chromium checks with one worker. Run build before browser tests. CI installs Chromium with system dependencies and runs the same checks on Node 24. Failure traces/screenshots are saved in `test-results/` and uploaded by CI.

Verified locally: clean `npm ci`, typecheck, lint, **72 unit tests**, production build, and **14 browser tests** passed on Node 24.21.0. Independent code review passed after fixing viewer-module failure recovery. GitHub CI has not run.

Browser checks compare actual canvas screenshots for animation, settled Pause equality, reduced-motion stability, and Resume movement on the same canvas; a real AnimationMixer lifecycle regression also proves playback does not reset on pause. They exercise keyboard focus/activation, loading delay, viewer-module failure/reload, asset failure/retry, denied WebGL, real context loss/retry, and overflow. Headless Chromium permits SwiftShader software WebGL. This proves functionality, **not physical mobile GPU performance, FPS, or visual realism**. Context-loss checks explicitly skip if the extension is unavailable.

## Fixture and accessibility

The page validates local JSON in `content/fixtures/pipeline-test.json` at build time. Its `/models/pipeline-test.glb` is an unchanged copy of `artifacts/blender-probe/pipeline-test.glb`. The exact label is **Pipeline test — not a real species**: anatomy, ecology, and species–river associations are not scientifically verified.

Text and native Pause/Resume controls remain outside the graphics error boundary. Reduced-motion users start paused and may explicitly Resume. Loading and failure messages are ordinary DOM; Retry reloads the asset/renderer rather than silently suppressing an error.

See [Blender MCP setup](docs/blender-mcp-setup.md), the [approved foundation spec](docs/superpowers/specs/2026-10-14-web-foundation-design.md), and [PRD](prd.md). Production work still needs river–species evidence, anatomy/behaviour references, artistic review, asset rights, and representative physical devices. Hosting/domain selection can wait.

## Dependency audit

The runtime dependency audit has **0 vulnerabilities** at foundation verification. A **dev-only** transitive `braces` advisory, **GHSA-vfj7-8cjw-p6xm**, remains: there is no compatible upstream fix yet. Do not apply a breaking forced upgrade blindly; recheck when upstream releases a compatible fix. Audit results are time-sensitive and should be rerun as dependencies evolve.
