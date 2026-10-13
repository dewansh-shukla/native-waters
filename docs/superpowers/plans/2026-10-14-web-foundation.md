# Native Waters Web Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Execution status:** Complete. Shared setup preceded three parallel implementation agents; coordinator verification and independent review followed. Final checks passed on isolated Node 24.21.0: frozen install, typecheck, lint, 72 unit tests, production build, and 14 Chromium browser tests. Runtime audit reported zero vulnerabilities; the dev-only advisory is documented in README. Remote CI and physical devices remain unverified. Work is retained locally on `setup/web-foundation`, with no remote or push.

**Goal:** Ship a verified single-app foundation that loads the existing animated GLB with accessible motion controls and honest loading/failure states.

**Architecture:** A static server page validates local fixture content and passes it to a client experience. That component owns motion state and loads a browser-only R3F viewer. Shared setup is sequential; content, viewer, and controls have separate parallel ownership before coordinator integration.

**Tech Stack:** Next.js App Router, React, TypeScript, Three.js, R3F, Drei, npm, Vitest/Testing Library, Playwright; Node 24 LTS in CI.

**Spec:** `docs/superpowers/specs/2026-10-14-web-foundation-design.md`

## Global Constraints

- One root Next.js App Router application with strict TypeScript.
- Use npm with a committed lockfile; target Node 24 LTS in the repository and CI.
- Do not replace the user's globally installed Node.
- Browser-only dynamic import with `ssr: false` belongs inside a client component.
- Exact fixture label: **Pipeline test — not a real species**.
- No fictional scientific names or species–river association.
- No database, authentication, monorepo, paid integrations, animation framework, or global state library.
- Preserve `prd.md`, `.pi/mcp.json`, existing docs, and the original Blender export.
- No remote or push is configured automatically. Agents do not commit shared working-tree changes; the coordinator owns integration and Git checkpoints.
- Performance and photorealism are not established by foundation checks.

## Review Focus

- Encoded/dot-segment or external model URLs must not bypass the local `/models/` contract: Task 2 validation tests.
- Slow/failed asset requests must preserve DOM content and offer a working retry: Task 5 browser tests.
- Reduced-motion hydration must not briefly start the swim animation: Tasks 4–5 preference and browser tests.
- Renderer unavailable/context lost must not leave a silent blank canvas: Tasks 3–5 failure tests.
- Pause/resume and cached loading must not reset animation or mutate a shared rig instance: Tasks 3–5 playback and clone checks.

## File Map and Frozen Contracts

Coordinator owns root config/dependencies/lockfile, `.gitignore`, `.nvmrc`, `src/app/**`, `src/components/Experience.tsx`, `src/types/fixture.ts`, `tests/e2e/**`, `.github/workflows/ci.yml`, `README.md`, and planning/status docs.

Content agent owns `content/fixtures/pipeline-test.json`, `src/lib/content.ts`, and `src/lib/content.test.ts`.

Viewer agent owns `src/components/scene/**` and `public/models/pipeline-test.glb`.

Controls agent owns `src/components/controls/**`.

Freeze these contracts before dispatch:

```ts
// src/types/fixture.ts
export type PipelineFixture = {
  id: string;
  label: string;
  disclaimer: string;
  modelUrl: string;
};
// src/lib/content.ts
export function parsePipelineFixture(input: unknown): PipelineFixture;
export function loadPipelineFixture(): PipelineFixture;
// src/components/scene/SceneViewport.tsx — default export
SceneViewport(props: { modelUrl: string; paused: boolean });
// src/components/controls/MotionControls.tsx — named export
MotionControls(props: {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
});
// src/components/controls/useReducedMotion.ts — named export
export function useReducedMotion(): boolean;
// src/components/Experience.tsx — default export
Experience(props: { fixture: PipelineFixture });
```

## Task 1: Shared Application and Test Foundation — Coordinator

**Files:** root package/lockfile/configs, `.gitignore`, `.nvmrc`, `src/app/layout.tsx`, `src/app/globals.css`, temporary `src/app/page.tsx`, `src/types/fixture.ts`, `tests/setup.ts`.

**Produces:** runnable Next application; alias `@/*` to `src/*`; Vitest DOM setup; frozen contracts above. No agent edits these files.

- [ ] Inspect existing files and installed Node/npm; initialize Git without a remote. Do not run an overwrite-prone application generator in this nonempty directory.
- [ ] Establish package/config files manually. Query npm stable metadata and confirm peer/engine compatibility before installing exact compatible versions. Keep ESLint compatible with eslint-config-next; choose TypeScript supported by its parser. Include only Next/React/Three/R3F/Drei and necessary type/lint/test tools.
- [ ] Define scripts: `dev`, `start`, `typecheck` (`tsc --noEmit`), `lint` (`eslint .`), `test` (`vitest run`), `build` (`next build`), `test:e2e` (`playwright test`). Disable Next telemetry for build/CI. Commit the lockfile, not caches or node_modules.
- [ ] Set `.nvmrc` to `24`; specify a compatible Node engine floor and Node 24 CI. If the local runtime satisfies all engines, use it for setup and document any local/CI difference instead of changing the global installation.
- [ ] Create the shared type and semantic layout with system fonts (no network font build dependency). CSS supplies responsive viewer dimensions and visible focus. Temporary page is explicitly a foundation shell.
- [ ] Configure Vitest/jsdom and Testing Library cleanup; run a small DOM smoke assertion to verify the runner. Configure Playwright's production web server in Task 5 when integration exists.
- [ ] Run `npm run typecheck`, `npm run lint`, and `npm run build`; expected: exit 0. Fix shared setup before dispatching workers.
- [ ] Create a coordinator Git checkpoint of the foundation/configuration plus existing planning inputs. Do not push.

## Task 2: Validated Local Fixture — Content Agent (Parallel)

**Files:** `content/fixtures/pipeline-test.json`, `src/lib/content.ts`, `src/lib/content.test.ts`.

**Consumes:** `PipelineFixture` from Task 1. **Produces:** `parsePipelineFixture(input: unknown): PipelineFixture` and `loadPipelineFixture(): PipelineFixture`.

- [ ] Write tests before implementation. A valid input with ID `pipeline-test`, exact label `Pipeline test — not a real species`, nonblank disclaimer, and URL `/models/pipeline-test.glb` returns the same fields.
- [ ] Add table-driven rejection tests: null/array input; missing or blank fields; nonstring fields; external/protocol-relative URL; `/models/../x.glb`; encoded traversal; backslash; query/hash; non-GLB suffix. Assert descriptive field errors.
- [ ] Run `npm run test -- src/lib/content.test.ts`; expected: failure because parser is missing.
- [ ] Implement minimal validation without a new schema dependency. Accept a conservative local URL contract `/models/` followed by safe filename/path segments ending in `.glb`; reject empty/dot segments and encoding rather than trying to sanitize untrusted paths.
- [ ] Create the JSON fixture. Disclaimer states that it demonstrates asset loading and animation, not verified anatomy or ecology. `loadPipelineFixture` imports and validates this committed JSON; errors propagate to page construction.
- [ ] Run the focused test command; expected: all cases pass. Report files, test evidence, and any issues to coordinator; do not modify shared files or commit.

## Task 3: Animated GLB Viewer — Viewer Agent (Parallel)

**Files:** `src/components/scene/SceneViewport.tsx`, minimal model/failure components under the same directory, focused tests under the same directory, `public/models/pipeline-test.glb`.

**Consumes:** `SceneViewport({ modelUrl: string, paused: boolean })`. **Produces:** default-exported browser-only viewport. Coordinator places the dynamic import in `Experience`.

- [ ] Write focused failure UI tests: a recoverable asset error exposes readable text and a keyboard-operable Retry button; retry invokes reset rather than hiding the error. Run focused tests and observe failure before implementation.
- [ ] Copy the existing artifact unchanged. Verify source/public hashes match. Do not regenerate or optimize this fixture during setup.
- [ ] Implement R3F Canvas with simple lighting and a fixed camera framing the complete fish. Load via the supplied URL. Clone the animated rig using the installed Three/Drei ecosystem's skeleton-aware clone helper; do not mutate the loader's cached object.
- [ ] Bind the GLB clip to the cloned rig. Advance the mixer with frame delta only when `paused` is false; resume retains clip time. Dispose/uncache mixer bindings on unmount. No automatic camera motion.
- [ ] Implement DOM loading status for model suspension. Cover Canvas/model initialization errors with an error boundary and usable fallback; handle unavailable WebGL and context loss. Keep visual failure recovery local to the viewer.
- [ ] Retry a failed required model by clearing that loader URL's failed cache and remounting the boundary/viewer. Do not issue repeated automatic retries.
- [ ] Run focused failure UI tests; expected: pass. Verify production-safe effects and event cleanup; report to coordinator without changing dependencies, Experience, or global CSS.

## Task 4: Accessible Motion Controls — Controls Agent (Parallel)

**Files:** `src/components/controls/MotionControls.tsx`, `src/components/controls/useReducedMotion.ts`, tests in the same directory.

**Consumes/produces:** exact controls and preference hook contracts in the file map. Coordinator owns final pause-state integration.

- [ ] Write tests for paused and running labels, native button semantics, `aria-pressed` state, and callbacks: paused click emits false; running click emits true. Run and observe missing-component failure.
- [ ] Write hook tests with mocked matchMedia: initial preference is safely paused before effect resolution; reduced preference remains true; non-reduced becomes false; preference updates are observed and listeners removed on unmount. Missing matchMedia defaults to paused.
- [ ] Implement native button with text Pause or Resume and `aria-pressed={paused}`. Use existing global focus styling; add no UI dependency.
- [ ] Implement `useReducedMotion` starting true and reading/subscribing to `(prefers-reduced-motion: reduce)` after mount. No browser access at module initialization.
- [ ] Run focused controls tests; expected: pass. Report results; do not edit shared CSS, app files, scene files, or dependencies.

## Task 5: Integration, Browser Verification, and CI — Coordinator

**Files:** `src/components/Experience.tsx`, `src/app/page.tsx`, `tests/e2e/foundation.spec.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `README.md`, `TODO.md`, `docs/blender-mcp-setup.md`.

**Consumes:** Tasks 2–4 contracts. **Produces:** complete foundation page, production integration tests, reproducible setup instructions.

- [ ] Review worker diffs/results for contract drift and missing requirements. Integrate only completed, focused-tested work.
- [ ] Draft Playwright tests before final integration: heading/exact label/disclaimer exist; `/models/pipeline-test.glb` loads; keyboard toggles controls; reduced-motion starts paused; delayed model displays status; failed model displays fallback and retry recovers; denied WebGL keeps DOM usable; mobile-sized viewport has no overflow.
- [ ] Test actual rendered playback: take canvas-only screenshots after readiness. Running frames change; after pause settles, separated screenshots remain equal; resume changes pixels without remounting the canvas. If browser capture is unsuitable, inspect the real mixer through test-only instrumentation, never a fabricated timer or public production debugging UI.
- [ ] Add success-path page-error/console-error collection. Expected asset/WebGL failures are scoped to failure tests, not ignored globally. Test context-loss fallback and recovery where the browser exposes `WEBGL_lose_context`.
- [ ] Implement static page construction via `loadPipelineFixture()`. Put heading/label/disclaimer in semantic DOM. Client Experience dynamically imports the viewer with `ssr: false` and DOM loading text.
- [ ] Experience consumes the reduced-motion hook and owns explicit user pause override. Effective pause is the explicit override when present, otherwise the preference. Thus first hydration stays paused, and explicit Resume is allowed even for reduced-motion users. Keep controls outside the rendering error boundary.
- [ ] Configure production Playwright server on a dedicated localhost port, desktop Chromium and a mobile-sized Chromium project. Install Chromium with `npx playwright install chromium` locally; CI uses `npx playwright install --with-deps chromium`. Allow software WebGL in headless CI if required and record that limitation.
- [ ] Run focused unit/browser checks while fixing integration. Then run once: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`. Expected: exit 0 with real animation/failure/accessibility assertions passing.
- [ ] CI uses actions/checkout and actions/setup-node with Node 24 and npm cache, then the same checks and browser installation. Upload Playwright failure artifacts; do not claim the remote workflow passed unless actually run.
- [ ] README explains runtime, install/dev/check commands, fixture status, Blender setup doc, and what's needed from the user later. Update TODO and Blender docs with actual browser evidence and remaining physical-device/scientific/visual limits.
- [ ] Review combined changes once for correctness, unnecessary code, and safeguarding original inputs. Commit the integrated foundation locally if checks pass; never push or configure a remote without user authorization.

## Acceptance Record

Record command outputs/counts, browser versions and rendering limitations during execution. A blocked/unrun browser test is a remaining limitation, not a pass. No public release follows automatically from foundation acceptance.

## Plan Self-Review

All spec sections map to Tasks 1–5. Interfaces and ownership agree across tasks. Five risk conditions have explicit checks. TDD applies to new content/control/failure logic and integration; trivial configuration changes do not require artificial RED cycles. Shared setup and final integration remain sequential, while Tasks 2–4 safely run in parallel. Production artwork, science, performance, hosting, and full river interaction remain deferred rather than silently omitted.
