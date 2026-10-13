# Native Waters — Complete Experience Preview

## Intent and agreed scope

The user wants the full PRD journey around the current polar-parrot fish so they can experience the product and decide what to invest in next. They approved an **illustrative underwater location** and want parallel agents. On reviewing this design they additionally required a **proper map**: use sourced India geometry and a real river overview, while keeping the underwater scene and fish relationship explicitly illustrative.

Deliver a coherent 30–90-second first visit: India entry → water selection → continuous dive → underwater school → identification → follow → short species-study story → Back to Water. The user may remain underwater indefinitely. This is an end-to-end experience preview, not another model viewer, and not certification of the PRD's final scientific or photorealistic bar.

Use the existing original polar-parrot GLB and keep its source, original pipeline fixture, tests, and scene-failure safeguards. Do not invent a Latin binomial, Indian distribution, conservation status, parentage, or species–habitat relationship.

## Current foundation

One Next.js/TypeScript app already provides validated local content, client-only R3F rendering, skeleton-aware cloning, persistent animation pause/resume, reduced motion, module/asset/renderer failure recovery, and tests. The polar study is approximately 1.9 MB, 41,772 triangles, five embedded textures, and five bones. Its metre-like authoring size is not a measured fish length.

The study changes are present but uncommitted; preserve them. Development server currently runs at http://localhost:3001. No new service, database, account, paid asset, or runtime dependency is needed for the preview.

## Product presentation

Use a full-viewport experience with minimal DOM overlays, restrained typography, warm daylight above water, green-brown underwater depth, and readable pale fish. Keep the current large explanatory foundation page out of the main journey.

A small persistent **Experience preview** badge opens the provenance/limitations information. The entry screen and story explicitly state: **Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.** Do not let disclaimers dominate the underwater view, but never conceal the distinction.

### Entry map

Show a polished dark India geographic overview using **Natural Earth 1:10 million India point-of-view boundary geometry**, including its multipart islands, plus the source's **Cauvery river and lake-centerline geometry**. These datasets were inspected in read-only research at pinned commit `ca96624a56bd078437bca8184e78163e5039ad19`; the pinned public-domain licence and boundary-policy documentation were reviewed. Extract only `ADM0_A3 === "IND"` from `ne_10m_admin_0_countries_ind.geojson`, and both `rivernum === 403` features from `ne_10m_rivers_lake_centerlines.geojson`. Preserve multipart segmentation rather than invent connecting lines.

The selected entry reads **Cauvery — illustrative dive**. Approach an actual river-line vertex, not an arbitrary invented geographic marker. The river geography is real generalized overview data; the underwater scene is not a reconstructed Cauvery reach. No polar-parrot occurrence is asserted.

Use shallow presentation extrusion, restrained geographic relief shading, minimal labels, clear coastline/boundary edges, river glow, and coordinated hover/focus selection. Prefer a cropped local Natural Earth 1:50m shaded-relief raster; validate its georeferencing and licence, align it through the same geographic transform, and never interpret hillshade brightness as measured elevation. If optional relief fails, retain the verified geographic outline with stylistic lighting—not a fake terrain model.

Credit **Made with Natural Earth** and expose source/version/licence plus **India point-of-view variant; generalized cartographic depiction, not an official Survey of India map** in provenance. Neither '10m' in the dataset name nor the preview means ten-metre survey accuracy; it means 1:10 million cartographic scale.

Hover/focus/select brightens the river and reveals **Enter Water ↓**. Provide a native DOM entry control and padded map hit target; precision line clicks are not required. Map/river/relief must share one projection and fit on desktop/mobile without clipping. No world dataset ships to the browser, and no GIS server or paid map API is introduced.

### Dive

Use one mounted canvas, with an authored camera trajectory and coordinated map fade/zoom into the visible water surface, then underwater. No navigation or scene reset. A normal transition takes roughly five seconds, long enough to convey approach, surface passage, and reveal without wasting time.

Preload on entry focus, pointer intent, and touch intent. Enable descent only once the required GLB/environment are ready and shaders have been warmed. If loading is slow, keep the map and DOM status visible; never descend into a blank scene. Guard repeated activation. Reduced motion uses a brief fade/direct placement instead of a dive.

### Underwater encounter

Build one approximately 24 × 18 metre illustrative riverbed patch with concealed edges. Use fog, boulders, terrain height variation, and constrained camera travel; no explorable empty outskirts.

Required visual cues: textured substrate; scattered stones/boulders; a branch/log; generic plants; gently moving surface; attenuation/fog; animated approximate caustics; particles and current-driven plant sway. Use batched/reused procedural geometry/materials and original generated textures where necessary. No Blender-only shader effect may silently disappear at GLB export.

Use one current direction/strength plus mild deterministic turbulence across particles, plants, and fish steering. Water reflection/refraction, caustics, and shafts may be inexpensive artistic approximations in this preview; document that limit rather than claim physically correct optics. Do not add a post-processing stack before the scene proves it needs one.

### School and interaction

High quality shows ten fish; low quality shows six. Share immutable GLB geometry/textures, but give every fish a separate skeleton/mixer, stable ID, animation phase, scale variation, and steering state. Normalize the asset to a visually chosen preview size once, independently of camera framing; do not present that size as a biological measurement.

Implement simple bounded group steering: cohesion, alignment, separation, obstacle avoidance, and current response. Fin/tail loops remain asynchronously phased; adjust animation rate modestly to movement speed. Simulated grouping is an illustration, not a claim about polar-parrot behaviour in nature.

Hover shows **Polar parrot — reference study**. Tap/click selects a fish and starts follow. Give stationary DOM fish selection as the keyboard and accessible alternative; moving targets are never the only way to discover information. Gesture thresholds distinguish drag/swipe from selection.

### Follow, story, and return

A single camera controller owns all camera writes. Follow uses damped tracking and a comfortable trailing/lateral offset; bounded exploration uses the same controller. Avoid hard attachment, sudden rotations, and obstacle clipping.

Follow UI: common name, **Reference study**, **Explore Species →**, and **Back to Water**. No unverified scientific identity or range.

Explore Species opens a short two/three-section DOM story about the reference's visible markings, the model/animation, and the illustrative habitat/preview. The camera can gently widen to show the group. No invented biological story. Keep the scene alive behind the content.

Back closes the story, clears follow selection, restores constrained exploration, and returns keyboard focus to a stable control. It must not recreate the canvas, fish, mixers, simulation, or loading pipeline. Escape exits story first, then follow. Provide Return to Map; returning and re-entering uses the already-loaded scene.

## Controls, quality, and accessibility

- Pause/Resume applies to fish, particles, plants, animated lighting/water, and cinematic camera progression. Required initial reduced-motion handling stays separate from explicit simulation Resume.
- Reduced motion disables dive travel, look parallax, and moving follow offsets even if the user explicitly resumes fish motion.
- Desktop: constrained wheel progression, subtle pointer look, click selection. Touch: thresholded vertical progression/drag look, tap selection. DOM alternatives remain present.
- Keyboard: entry, fish selector, follow/story/back, quality, pause, sound, and return to map. Visible focus and meaningful labels throughout.
- Story uses a proper modal/dialog or equivalent focus-managed panel; restore focus after closing and preserve readable DOM content without WebGL.
- AUTO/HIGH/LOW controls. AUTO conservatively selects LOW for coarse-pointer/small-screen devices and HIGH otherwise; no unstable frame-rate tier oscillation. HIGH: ten fish, capped DPR 1.5, richer particles/caustics. LOW: six fish, DPR 1, fewer particles, simpler surface/lighting. Preserve a selected fish across preset changes rather than silently dropping its target.
- Visibility changes pause frame progression and audio; resuming a hidden tab must not apply an enormous simulation delta.

## Audio

No cleared recordings exist locally. Provide explicitly identified **synthesized preview ambience**, not field-recorded forest or river sound. Use layered filtered-noise/current textures with differing durations and restrained levels. Crossfade/attenuate upper frequencies through surface passage; underwater becomes quiet low-frequency ambience.

Audio is off until explicitly enabled. Create/resume WebAudio synchronously from a user activation, tolerate rejected activation, expose sound-off control, pause/suspend when hidden, and dispose nodes/context on unmount. Audio failures never block the map or underwater experience. A later licensed recording pack can replace synthesized sources without changing journey logic.

## Architecture and data flow

Retain existing stack; use a small React reducer for discrete journey state. No global state library is necessary yet. Phases: `map`, `entering`, `exploring`, `following`, `story`. Track stable selected ID, readiness, user motion override, quality preference, and audio preference. Guard illegal transitions and duplicate entry. Never store per-frame vectors in React state.

One client Experience owns accessible DOM controls and journey state. A client-only SceneViewport contains the persistent canvas and integration points. Dedicated fish, world, camera, and audio modules own their systems. Freeze exact TypeScript contracts in the implementation plan before parallel dispatch.

Per-frame state lives in refs: school positions/headings, deterministic simulation clock, camera tracking, particle positions. One shared clock/current contract links world movement and fish steering. Cap time steps after delays; no wall-clock jumps during pause.

Keep local asset URLs and content validation. Add small local preview/map/provenance data only where needed; do not turn this into a CMS or extensible habitat framework. Do not add speculative Blender automation or optional supporting species.

## Loading, failures, and lifecycle

Preserve outer module-error boundary with Reload page recovery and inner model/renderer/context-loss boundary with cache-clearing Retry. Heading/map/DOM controls/provenance survive every graphics failure. DOM-only fallback describes the preview and offers the same story text even if the canvas cannot run.

Retry recreates only the failed graphics subtree and resets its readiness; ordinary story/back/map actions never recreate it. Mixer/listener/material ownership must remain correct with multiple cloned fish and shared loader assets. Do not dispose shared geometry/textures when removing one fish. Optional audio/detail failure must not destroy the required scene.

## Parallel execution boundaries

1. Coordinator establishes reducer/shared contracts, baseline tests, integration skeleton, map-source decision, and dependency-free configuration changes.
2. Fish agent owns school simulation/rendering and its tests; no camera or app/UI edits.
3. World agent owns habitat/water/current/particles/plant modules and tests; no fish or app edits.
4. Camera agent owns sole camera controller, gesture interpretation, and tests; no second controller anywhere.
5. UI/audio agent owns map presentation, story/controls, and synthesized audio lifecycle under frozen contracts; coordinator alone edits Experience/app composition.
6. Coordinator integrates sequentially, validates actual visuals and complete browser flow, resolves combined defects, and obtains one independent review.

Map geometry fetching, shared state/types, root CSS, package/config files, integration, and final tests remain coordinator-owned. No agents concurrently edit the same files. Preserve the working polar model and original fixture through all stages.

## Verification and acceptance

Use TDD for new reducer, steering, camera, quality/selection, input gestures, and audio lifecycle logic. Keep targeted checks while iterating; run one broad integrated pass after components combine.

Unit/DOM acceptance: legal phases, readiness gate, duplicate entry, story/back selection clearing, focus restoration, gesture thresholds, reduced-motion versus explicit Resume, preserved selection at quality change, audio rejection/cleanup, bounded current/steering, independent animation mixers, damping and large-delta handling.

Production Chromium acceptance (desktop plus touch-emulated mobile): complete map → entry → encounter → selected fish → follow → story → Back to Water → Return to Map → re-entry; real animation/interaction and state preservation; keyboard-only journey; reduced-motion camera behavior; quality/sound controls; delayed/failed model recovery; failed viewer chunk reload; denied WebGL/context loss; no horizontal overflow or unexpected success-path browser errors.

Visually inspect desktop and mobile-sized screenshots and a 30-second unattended scene. Check no obvious empty edges, camera snapping, glaring asset placement patterns, or frozen environment. This inspection establishes a credible preview—not final photorealism or biological truth.

Run Node 24 typecheck, lint, unit tests, production build, and browser tests. Keep CI updated but do not claim a remote run passed unless observed. Restore the user's development server and report its actual URL.

The PRD's 45–60 desktop FPS, ~30 mobile FPS, shader/payload/draw-call budgets, true phone usability, scientific acceptance, and production artwork remain separately measured release gates. Count scene triangles/draw calls where feasible; no performance certification based only on headless software WebGL.

## Explicit deferrals

No native-species/habitat certification, surveyed/reconstructed river reach, national hydrology dataset, supporting species, new production fish/LODs, measured ecological simulation, field-recorded audio, physically exact water optics, database, authentication, CMS, multiplayer, VR/AR, hosting purchase, or public release.

These deferrals do not remove the requested map/dive/school/follow/story/return flow, accessibility, loading safeguards, quality settings, or opt-in preview audio.

## Self-review

The design preserves the user-approved illustrative underwater experience and adds their explicit proper-map requirement with pinned, licensed boundary/river geometry and honest geographic provenance. The fish is consistently a reference study; synthesized audio and geographic overview are honestly described. Single camera/clock ownership and nonoverlapping file domains avoid integration races. Functional acceptance is separated from final artistic/scientific/hardware quality. No external service or new dependency is required.
