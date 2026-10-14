# Native Waters

A single Next.js/TypeScript application with a playable end-to-end **experience preview**: geographically sourced India/Cauvery map → dive → underwater fish encounter → follow → story → return. The polar-parrot study and underwater environment remain illustrative, not a verified native-species ecosystem or photorealistic production scene.

## Run locally

Use Node 24 LTS (`.nvmrc`; at least 24.15) and npm. Final local verification used an isolated Node 24.21.0 runtime; the globally installed Node 26 was left unchanged. CI targets Node 24.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The agent-started session uses http://localhost:3001 because another project occupies port 3000. Dependencies are pinned in `package-lock.json`. No credentials, external asset service, database, or network fonts are required.

## Checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
python3 -B -m unittest discover -s tools/maps -p 'test_*.py'
```

Playwright starts the **production build**, not the dev server, on dedicated `127.0.0.1:43187`; leave that port free. It runs desktop and 390×844 mobile-sized Chromium checks with one worker. Run build before browser tests. CI installs Chromium with system dependencies and runs the same checks on Node 24. Failure traces/screenshots are saved in `test-results/` and uploaded by CI.

E2E preview milestone coordinator checks passed on Node 24.21.0: typecheck, lint, **190 unit tests**, **6 map-source tests**, production build, and **8 focused desktop/touch browser journey and recovery tests**. Before the final recovery fixes, all 22 existing browser tests passed; the fix wave additionally passed 14 affected browser checks. The entire expanded 28-case browser suite was not rerun afterward. Independent combined and scoped fix reviews found no remaining blockers. Clean `npm ci` was verified during foundation setup; dependencies have not changed. GitHub CI has not run.

The subsequent movement fix passed typecheck/lint, **194 unit tests**, production build and **4 focused desktop/touch playback and complete-journey tests** on Node 24. In the deterministic 200-second trajectory, fish stayed upright, turned at most 1.51° per 60 Hz step, and never hit the movement bounds or require collision projection. Mixed/stalled-frame checks also passed. These are preview motion checks, not biological measurements; paired territorial/cave behavior is still pending.

Browser checks compare actual canvas screenshots for animation, settled Pause equality, reduced-motion stability, and Resume movement on the same canvas; a real AnimationMixer lifecycle regression also proves playback does not reset on pause. They exercise keyboard focus/activation, loading delay, viewer-module failure/reload, asset failure/retry, denied WebGL, real context loss/retry, and overflow. Headless Chromium permits SwiftShader software WebGL. This proves functionality, **not physical mobile GPU performance, FPS, or visual realism**. Context-loss checks explicitly skip if the extension is unavailable.

## Journey and geographic sources

Select Cauvery or use **Enter Water**, encounter the persistent fish school, select or **Follow fish**, then **Explore Species**. Close the story to return underwater; **Return to Map** allows re-entry without resetting fish identity or rebuilding the canvas. HIGH/LOW/AUTO quality controls, touch navigation, keyboard controls and opt-in synthesized ambience are available. HIGH's ten fish alone total approximately 418K triangles and 110 mesh batches before the habitat; this preview does not certify the production draw-call/FPS targets.

India uses pinned Natural Earth India point-of-view geometry, actual Cauvery river/lake centerlines and georeferenced shaded relief. This is generalized 1:10-million cartography—not ten-metre accuracy or elevation data. Source versions, public-domain licensing and boundary policy appear in the preview dialog and [map provenance](content/maps/README.md). Real geography does not establish polar-parrot occurrence or reconstruct a particular Cauvery reach.

## Fixture and accessibility

The page validates local JSON in `content/fixtures/pipeline-test.json` at build time. The active asset is `/models/polar-parrot-study-v1.glb`, labelled **Polar parrot — reference study**. It is an original procedural visual study based on the user-supplied photo, not a verified native Indian species or a production asset. The original `/models/pipeline-test.glb` and Blender probe remain unchanged.

The study includes a rounded body, six dark bars, layered eyes, fin membranes/rays, five-bone swim animation, and five embedded textures; approximately 41,772 triangles and 1.9 MB. Source, browser previews, regeneration instructions, and remaining artistic limits are in [the asset notes](artifacts/polar-parrot-study/NOTES.md).

Text, study/provenance and native Pause/Resume controls remain outside the graphics error boundary. Reduced-motion users start paused and may explicitly Resume; their entry skips the animated dive without resuming fish. Required asset loading and actual shader-link validation gate entry. Loading and failure messages are ordinary DOM; Retry reloads the asset/renderer rather than silently suppressing an error, including context loss during descent.

See [Blender MCP setup](docs/blender-mcp-setup.md), the [approved preview spec](docs/superpowers/specs/2026-10-14-e2e-experience-preview-design.md), and [PRD](prd.md). The next requested pass is species-specific territorial/schooling/hiding behavior and further mobile usability checks; those behaviors are not implemented or scientifically validated yet. Production work still needs river–species evidence, anatomy/behaviour references, artistic review, asset rights, and representative physical devices. Hosting/domain selection can wait.

## Dependency audit

The runtime dependency audit has **0 vulnerabilities** at preview verification. A **dev-only** transitive `braces` advisory, **GHSA-vfj7-8cjw-p6xm**, remains: there is no compatible upstream fix yet. Do not apply a breaking forced upgrade blindly; recheck when upstream releases a compatible fix. Audit results are time-sensitive and should be rerun as dependencies evolve.
