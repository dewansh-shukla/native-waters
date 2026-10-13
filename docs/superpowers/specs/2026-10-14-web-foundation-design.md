# Native Waters — Web Foundation Design

## Intent and approval context

The PRD defines one production-quality India → river → underwater encounter, not a broad ecosystem atlas. The user approved a single Next.js/TypeScript application with React Three Fiber, local content, accessible controls, and tests; no monorepo or database. The user also requested parallel agents and selected MCP for Blender by GitHub popularity.

This document specifies milestone 0: a verified, reusable web and Blender-to-browser foundation. It does not lower the PRD's final visual or scientific acceptance bar. Implementation begins after review of this document and the subsequent implementation plan.

## Existing state

- No application or Git repository exists yet.
- Blender MCP 2.1.9 is installed and configured in `.pi/mcp.json`, with server telemetry disabled and safe mode enabled.
- Live scene access and the localhost listener have been verified.
- `artifacts/blender-probe/pipeline-test.glb` contains a mesh, three deform bones, and swim animation. Its binary structure was validated; browser playback is not yet verified.
- The fixture is deliberately not a real species. No habitat–species pairing or asset rights have been scientifically approved.

## Scope

Deliver a production-buildable landing page containing:

1. Native Waters heading and concise explanation of the foundation milestone.
2. A browser-only viewer for the existing GLB, clearly labelled **Pipeline test — not a real species**.
3. Native DOM Pause/Resume control, visible keyboard focus, and explanatory content independent of the canvas.
4. Explicit loading, asset-error, and unavailable-renderer fallback states. Text remains usable in every state.
5. Reduced-motion preference support and animation pause/resume without resetting playback.
6. Validated local fixture content, focused automated tests, production browser smoke checks, and CI.

Do not implement production fish modelling, India geometry, river selection, schooling, current simulation, water shaders, follow mode, story choreography, audio, compression, or HIGH/LOW quality tuning in this milestone. These remain required later; they are not replaced by the fixture.

## Architecture

One root Next.js App Router application with strict TypeScript. Use npm with a committed lockfile. Target Node 24 LTS in the repository and CI; do not replace the user's globally installed Node. Confirm dependency peers and engines during installation, then pin the installed versions.

Use React, Three.js, R3F, and Drei. No animation framework, schema library, post-processing, database, or global state dependency is needed for the foundation. Pause state lives in one client component. Zustand can be introduced when cross-system interaction state actually exists.

Server components own the static page and load/validate local content. A small client experience component owns pause state and the viewer boundary. Dynamic import with `ssr: false` is declared inside a client component; browser APIs and rendering imports stay within the client subtree.

The viewer contains one persistent canvas, simple lighting, a fixed comfortably framed camera, and the GLB animation. No automatic camera travel or orbit controls are required. Animation uses the frame delta and respects pause state. Each loaded animated model must have its own rig instance; avoid sharing mutable skeleton state.

## Content and asset contracts

Store one local JSON fixture under `content/fixtures/`. It includes an ID, display label, explicit non-species disclaimer, and root-relative model URL. Do not create fictional scientific names or a fictional species–river association.

The server-side loader validates required nonblank fields and a local GLB URL rooted under `/models/`, rejecting traversal and external URLs. Invalid committed content fails page construction/build with a useful message. Unit tests cover valid content and rejected field/path cases.

Copy the existing GLB unchanged to `public/models/pipeline-test.glb`; retain the original export under `artifacts/`. The manifest URL is the single source for browser loading. No external asset service or API key is needed.

Initial shared interfaces:

- `PipelineFixture`: `id`, `label`, `disclaimer`, `modelUrl`.
- Client experience: receives the validated fixture.
- `SceneViewport`: receives `modelUrl` and `paused`.
- `MotionControls`: receives `paused` and `onPausedChange`.

## Loading, failure, and accessibility

Display DOM loading status while the viewer module or GLB is loading. Handle required asset errors and renderer initialization errors with a readable DOM fallback instead of a blank canvas. Provide a retry action for recoverable loading failure. Keep heading, disclaimer, and controls outside the rendering failure boundary.

Pause/Resume is a native button with accessible state and visible focus. Reduced-motion users start paused; explicit Resume is allowed. Determine the preference before enabling animation so no initial motion flashes. Canvas visuals are supplementary; the meaning of the page is available in text. No audio or moving-target selection exists yet.

Keep the page responsive without horizontal overflow at desktop and mobile-sized viewports. Do not claim real mobile GPU performance from viewport sizing or software-rendered tests.

## Verification and acceptance

Automated scripts: `typecheck`, `lint`, `test`, `build`, and `test:e2e`.

Use Vitest for fixture validation and DOM/control behavior, and Playwright against the production server for actual integration. No need to duplicate all R3F internals in mocked unit tests.

Foundation passes when:

- Frozen dependency installation, typecheck, lint, unit tests, and production build succeed.
- The page serves successfully without server-side browser/WebGL API errors.
- A supported browser loads the local GLB and advances its exported animation.
- Pause stops animation advancement; Resume continues without a playback reset.
- Keyboard activation works and reduced-motion starts paused.
- Delayed loading shows status; failed asset loads and unavailable WebGL produce readable fallbacks.
- Desktop and mobile-sized smoke checks have no horizontal overflow or unexpected page errors on the success path.
- CI runs the same checks using the committed lockfile.

Real desktop/mobile FPS, visual realism, scientific accuracy, map boundaries, and licensed production asset delivery are later acceptance gates. Record actual results and limitations, not anticipated success.

## Execution boundaries and parallel ownership

1. Coordinator sequentially establishes Git, package/configuration files, test runners, shared types, root layout, global styles, and the integration skeleton. Preserve the PRD, MCP configuration, docs, and Blender outputs. No remote or push is configured automatically.
2. Content agent owns `content/fixtures/`, the content loader, and validation tests.
3. Scene agent owns viewer components and the public GLB copy; no shared configuration edits.
4. Controls agent owns DOM motion controls and their tests; no scene or app edits.
5. Coordinator integrates the page/client experience, owns browser tests and CI, verifies combined changes, and updates setup documentation.

Freeze interface names and exports before dispatch. Dependency changes are coordinator-only. Browser integration depends on the content, viewer, and controls branches being combined.

## Human inputs and later milestones

The foundation needs no paid assets, hosting credentials, or scientific claims. Human inputs needed for production are the selected river–species evidence, reliable anatomy/behaviour references, artistic review, asset permissions, and representative physical test devices. Hosting/domain selection can wait.

After foundation acceptance, select and verify the habitat/species and establish metres, axis conventions, rig naming, and export/material contracts. Living Fish and Living Water can then proceed independently, followed by Living River, Interaction, and the complete map-to-water slice.

## Self-review

Scope is limited to milestone 0; no placeholders are presented as biological truth. Viewer, content, controls, and shared files have distinct ownership. Success criteria separate browser functionality from production visual quality. Loading, failure, accessibility, and asset safety are covered. No paid services or unneeded subsystem scaffolding are introduced.
