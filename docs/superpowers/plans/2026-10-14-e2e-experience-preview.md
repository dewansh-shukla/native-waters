# Native Waters End-to-End Experience Preview Implementation Plan

**Execution status: complete.** The original planned checklists below are retained as approved; completed execution tracking is in `TODO.md`. The sourced-map journey, independent review and scoped recovery fixes are implemented. Final coordinator verification: Node 24 typecheck/lint, 190 unit tests, 6 map-source tests, production build, and 8 desktop/touch journey/recovery tests passed. All 22 baseline browser cases passed before final fixes; 14 affected cases passed during fixes, rather than rerunning the expanded full 28-case suite. Development server verified at http://localhost:3001. Physical-device performance, remote CI and production biological/artistic acceptance remain unverified. The later requested species-behavior/mobile pass is separate and pending.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete map → dive → living school → follow → story → return experience using the existing polar-parrot study and a proper sourced India/Cauvery map.

**Architecture:** One persistent R3F canvas and one React journey reducer. Shared clock/current/quality/contracts precede independent world, school, camera, map, and DOM/audio implementations. The coordinator exclusively integrates the app and verifies the complete production-browser flow.

**Tech Stack:** Existing Next.js/React/TypeScript/Three/R3F/Drei, WebAudio, local GeoJSON/textures, Vitest and Playwright. No new application dependency or service.

**Spec:** `docs/superpowers/specs/2026-10-14-e2e-experience-preview-design.md` (updated for the user's proper-map requirement).

## Global Constraints

- Preserve all current polar-study changes, original GLBs, authoring sources, and failure/accessibility safeguards. Do not reset the dirty working tree.
- One camera controller owns every camera write; one coordinator-owned frame driver advances the shared clock.
- glTF/scene coordinates are **Y-up**. World surface Y=0; underwater habitat is below it. Map extrusion is presentation thickness, not measured elevation.
- Ten persistent fish identities `fish-0` through `fish-9`; HIGH renders ten, LOW renders six, retaining a selected target during quality changes.
- Existing polar GLB is `public/models/polar-parrot-study-v1.glb`; no fake scientific names, distributions, or natural-schooling claims.
- Map uses pinned Natural Earth India POV geometry and actual Cauvery segments. Underwater label: **Cauvery — illustrative dive**.
- Persistent **Experience preview** badge; provenance/story state: **Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.**
- Only optional shaded relief may fall back to stylistic lighting. Required boundary/river sourcing must succeed; no hand-drawn replacement or invented connecting line.
- Audio is synthesized preview ambience, opt-in only. No paid APIs, external runtime map requests, field-recording claims, new database, or new production species.
- Normal dive approximately five seconds; reduced motion uses a brief fade/direct placement and never re-enables camera travel when fish motion is explicitly resumed.
- Read `AGENTS.md` and relevant installed Next guides before changing Next app code. Node24 test JSON imports use explicit `with { type: "json" }` where required.
- Coordinator owns root CSS/config/dependencies/integration/tests/docs. Agents do not commit, push, spawn subagents, or edit shared files.

## Review Focus

- Geographic layers can be mirrored/misaligned or falsely joined: Task1 source/projection tests and Task5 visual checks preserve coordinates, islands, and river parts.
- Enter may outrun loading/warm-up, or retry may retain stale readiness: Tasks1/7 readiness tests and delayed/failure browser coverage.
- Quality changes can drop a followed fish or dispose shared rig assets: Tasks1/3 selection and independent-mixer lifecycle tests.
- Pause/hidden tabs/reduced motion can produce camera jumps or simulation catch-up: Tasks2/4/7 delta, gesture, visibility, and reduced-motion tests.
- WebAudio can reject activation or keep playing after mute/unmount: Task6 lifecycle/rejection tests and Task7 activation browser checks.

## File Ownership and Frozen Contracts

**Coordinator:** `src/experience/{contracts,journey,quality,current}.*`, `src/components/Experience.tsx`, `src/components/scene/SceneViewport.tsx`, app/layout/CSS, map extraction/assets/content, Playwright tests/config, README/TODO/CI.

**World agent:** `src/components/scene/world/**`.
**Fish agent:** `src/components/scene/fish/**`.
**Camera agent:** `src/components/scene/camera/**`.
**Map agent:** `src/components/scene/map/**`.
**DOM/audio agent:** `src/components/experience-ui/**`.

Shared `src/experience/contracts.ts` defines (freeze before dispatch):

```ts
export type Phase = "map" | "entering" | "exploring" | "following" | "story";
export type QualityPreference = "AUTO" | "HIGH" | "LOW";
export type EffectiveQuality = "HIGH" | "LOW";
export type JourneyState = { phase: Phase; ready: boolean; selectedId: string | null };
export type JourneyEvent =
  | { type: "READY"; ready: boolean }
  | { type: "ENTER" } | { type: "ENTERED" }
  | { type: "SELECT"; id: string } | { type: "STORY" }
  | { type: "BACK" } | { type: "ESCAPE" } | { type: "MAP" };
export type FishState = {
  id: string; position: Vector3; velocity: Vector3; heading: Quaternion;
};
export type SceneRuntime = {
  time: number; entryProgress: number; fish: FishState[];
};
```

Vector3/Quaternion are imported as types from Three. Runtime uses `MutableRefObject<SceneRuntime>`; frame values do not enter React state. `entryProgress` is 0–1 and stays paused when normal dive is paused.

Shared functions: `journeyReducer(state,event): JourneyState`; `resolveQuality(preference,coarsePointer,smallScreen): EffectiveQuality`; `visibleFishIds(quality,selectedId): string[]`; `currentAt(position,time,out): Vector3` writes a bounded current vector into `out`.

Component contracts:
- `PreviewWorld({ runtime, quality, visible })`: habitat/surface/particles/plants; no camera writes.
- `createSchool(): FishState[]`, `stepSchool(fish,delta,time): void`; `FishSchool({ modelUrl,runtime,paused,visibleIds,selectedId,onSelect,onHover,onReady })`.
- `ExperienceCamera({ runtime,phase,selectedId,paused,reducedMotion,entryAnchor,onEntered })`: sole camera authority; pointer/wheel/touch bindings use the canvas and clean up.
- `EntryMap({ visible,progress,highlighted,onHighlight,onEnter })`: reads coordinator-extracted map data, provides projected `CAUVERY_ANCHOR` through map module export, no camera writes.
- `ExperienceUI({ state,fixture,paused,onPausedChange,quality,onQualityChange,visibleFishIds,hoveredId,dispatch,audio })`: DOM overlays, map CTA/story/selection/provenance.
- `useExperienceAudio({ phase,paused,runtime })`: returns `{ enabled, error, enable, disable }`. `enable()` starts synchronously from click activation then handles promises internally.

Prop types live in the shared contracts module; coordinator fixes interface drift before integration. The UI uses existing PipelineFixture for common-name/study content; do not widen it into a CMS schema.

## Task 1: Shared State, Sources, and Contracts — Coordinator (Sequential)

**Files:** `src/experience/**`; `tools/maps/prepare_map_assets.py`; `content/maps/**`; `public/maps/**`; source/projection tests and shared types.

- [ ] Record the current dirty tree and working server; preserve all study files. Create an execution ledger and checkpoint current work locally before altering it; no push or remote configuration.
- [ ] Write reducer tests first: ENTER ignored until ready; READY then ENTER enters once; ENTERED explores; selecting valid stable ID follows; STORY requires selection; BACK from follow/story clears selection and explores; ESCAPE story returns to follow, then clears follow; MAP clears selection; retry READY false gates re-entry. Invalid fish IDs and illegal phase events are ignored.
- [ ] Write quality/current tests: AUTO low for coarse/small and high otherwise; HIGH ten/LOW six; selected `fish-9` remains included without exceeding six; unselected base IDs deterministic. Current is finite, shared direction predominantly positive Z, and turbulence bounded. Run tests RED; implement the smallest reducer/policies/field; run GREEN.
- [ ] Extract from pinned commit `ca96624a56bd078437bca8184e78163e5039ad19`: `geojson/ne_10m_admin_0_countries_ind.geojson` feature `ADM0_A3=IND`; `geojson/ne_10m_rivers_lake_centerlines.geojson` both `rivernum=403` features. Save only extracted geometry/metadata, not world collections. Preserve 35 India polygons/islands and all nine Cauvery parts.
- [ ] Source helper validates exactly one India feature, two Cauvery features, finite longitude/latitude, closed polygon rings, expected approximate India bounds `[68.143403,6.745551,97.362253,37.054484]`, and nonempty line segments. Tests fail for reversed coordinates, missing features, or unclosed rings. Keep pinned URL/license/version/filter records in `content/maps/provenance.json`.
- [ ] Use one geographic transform for outline/river/relief/anchor: longitude/latitude in CRS84, north maps toward negative scene Z, shared centre/scale from India bounds, map top Y=8. Derive anchor from an actual vertex of the longest Cauvery river part. Test projected anchor lies on that part and north/east orientation; do not independently fit layers.
- [ ] Prepare optional cropped 1:50m Natural Earth shaded relief. Verify archive members/world-file CRS/bounds before cropping; target at most 2048px local image, retain crop bounds/source/licence. Use an isolated Pillow tool environment only if needed, never add a web dependency. Do not displace terrain from grayscale brightness. If unavailable, record an honest optional-relief fallback.
- [ ] Freeze shared interfaces above. Establish simple integration-ready initial fish state/clock construction only after Task3 exports are available; do not leave fake production state/scene components.

## Task 2: Living Habitat — World Agent (Parallel after Task1)

**Files:** `src/components/scene/world/PreviewWorld.tsx`, focused movement/material helpers and tests in that directory.

**Consumes:** shared runtime/current/quality; Y-up surface=0, underwater patch approximately 24×18m. **Produces:** PreviewWorld.

- [ ] Write RED tests for deterministic placement and bounded particle recycling/current motion, paused shared-time stability, and large-delta protection for any owned simulation logic.
- [ ] Create riverbed roughly Y=-3, stones/boulders/log, generic plant patches, and hidden-edge composition. Reuse/batch geometry and materials; no per-frame allocations or per-pebble meshes. Use original procedural substrate detail, not external images.
- [ ] Add restrained green-brown depth/fog/lighting, animated surface and approximate caustics, shared-current particles and plant sway. Document simplified optics in source/notes. World reads shared time, not Date.now or its own advancing clock.
- [ ] HIGH richer particles/caustics, LOW reduced particles/simple surface. Keep visible toggling without losing world state. No school/camera/React journey or shared app edits.
- [ ] Run focused tests/type/lint; report actual checks and ownership/cleanup limits. Final GPU visual checks belong to integration.

## Task 3: Independent Fish School — Fish Agent (Parallel after Task1)

**Files:** `src/components/scene/fish/FishSchool.tsx`, `school.ts`, focused tests.

**Consumes:** existing model URL, shared current/runtime/visible IDs. **Produces:** createSchool, stepSchool, FishSchool.

- [ ] Write RED tests: exactly ten stable IDs; finite deterministic initial positions; bounded steering/obstacle clearance; finite large-delta behavior; separation for near neighbors without zero-vector NaNs; pause leaves positions unchanged when coordinator doesn't step.
- [ ] Implement small group steering in the river corridor with separation/alignment/cohesion/current and simple rock avoidance; coordinate fixed obstacle locations with Task2 through shared constants in Task1, not duplicated guessed positions.
- [ ] Normalize original GLB to an illustrative approximately 0.35–0.45m display length; explicitly not a biological measurement. Clone skeletons separately, share immutable render assets, asynchronous scales/clip phases and speed-linked playback.
- [ ] Keep all ten identities mounted; hide nonvisible IDs for quality. Selected target stays rendered. No shared-resource disposal when one fish hides. Interactions stop pointer propagation and report stable IDs; padded hit targets and hover label callback do not require React position updates.
- [ ] Add real Three lifecycle tests: cloned rigs/mixers independent, stopping one does not stop another, Pause/Resume does not reset actions, cleanup uncaches mixers without destroying cached model data. Run RED/GREEN and focused checks.

## Task 4: Sole Cinematic Camera — Camera Agent (Parallel after Task1)

**Files:** `src/components/scene/camera/ExperienceCamera.tsx`, trajectory/gesture helpers and tests.

**Consumes:** runtime, phase, selected ID, pause/reduced motion, actual projected map anchor. **Produces:** ExperienceCamera.

- [ ] Write RED tests for bounded gesture thresholds, damped following, wheel/progression clamp, five-second entry completion exactly once, paused progression, and capped delta after hidden-tab/delay.
- [ ] Implement one authored map approach → water surface → underwater trajectory using anchor and fixed world landing. Camera stays outside surface initially and ends below Y=0. Target direction interpolates comfortably; no direct fish attachment or snapping.
- [ ] Reduced-motion entry places camera directly and reports completion once; reduced-motion follow uses a stable framing position rather than tracking motion, regardless of explicit fish Resume.
- [ ] Constrain exploration corridor and look/parallax. Bind desktop/touch input to the canvas, respect drag-vs-tap thresholds, avoid consuming scroll over DOM overlays, clean listeners. Camera uses current runtime fish positions without React frame updates.
- [ ] Follow and release keep controller/canvas identity. Read entry progress for coordinated map fade/world reveal; no second clock. Run focused tests/type/lint.

## Task 5: Proper Geographic Map — Map Agent (Parallel after Task1 assets)

**Files:** `src/components/scene/map/EntryMap.tsx`, geometry/projection helpers/tests (coordinate transform contract supplied by coordinator).

**Consumes:** extracted India/Cauvery/relief/provenance, same geographic transform. **Produces:** EntryMap and CAUVERY_ANCHOR.

- [ ] Write RED tests for multipart polygon/island preservation, river segment preservation, common projection, and anchor on source line. Preserve holes if later data contains any; no concatenating line parts.
- [ ] Render shallow extruded India with restrained relief/top-surface treatment, dark palette, coastline edges, subtle presentation light, and real Cauvery glow. Merge reusable geometry/material batches where useful; no world dataset or API at runtime.
- [ ] Fit geographic overview on desktop/mobile through the camera contract. Optional relief uses correct geographic UVs and validated crop bounds; unavailable relief uses stylistic light, not fabricated geographic height.
- [ ] River hover/padded hit area reports highlight and entry; DOM equivalent is Task6. Fade/zoom presentation with runtime entry progress, never write the camera. Keep geometry mounted but hidden underwater.
- [ ] Run focused tests/type/lint; report source alignment limits for coordinator visual inspection.

## Task 6: Minimal DOM Journey and Opt-In Audio — DOM/Audio Agent (Parallel after Task1)

**Files:** `src/components/experience-ui/ExperienceUI.tsx`, `useExperienceAudio.ts`, scoped story/map/controls tests and helpers.

**Consumes:** frozen state/dispatch/quality/visible IDs and existing fixture; audio reads runtime progress. **Produces:** ExperienceUI and audio hook.

- [ ] Write RED DOM tests for accessible map Enter (disabled while not ready), stationary fish selection, follow/story/back controls, Escape flow, proper modal focus and focus return, quality change, and persistent provenance/disclaimer. No moving target is required.
- [ ] Present minimal full-viewport overlays: map title/real Cauvery CTA; selected fish card; short study story; pause, sound, AUTO/HIGH/LOW; Return to Map; small Experience preview/provenance control. Exact disclaimer from Global Constraints. No fabricated scientific/ecological narrative.
- [ ] Reduced-motion remains separate from simulation Resume; UI sends actions/preferences only. Root CSS is coordinator-owned; use semantic hooks/classes rather than concurrent CSS edits.
- [ ] Write audio rejection/mute/visibility/unmount tests before hook implementation. Synchronously create/resume AudioContext on explicit enable, generate original filtered-noise preview sources, crossfade surface/underwater with progress, clamp gains, and quietly report rejection while leaving journey usable.
- [ ] Suspend audio on Pause/hidden tab, disable/mute reliably, disconnect/close on unmount; no playback before activation. Mark sources as synthesized preview ambience in provenance. Run focused tests/type/lint.

## Task 7: Integration, Visual Review, and Complete Browser Verification — Coordinator (Sequential)

**Files:** Experience/SceneViewport, app page/CSS, tests/e2e, Playwright config, CI/README/TODO and asset/source notes.

- [ ] Draft full journey browser tests before integration: map → ready Enter → visible underwater → accessible fish selection → follow → Explore Species → story → Back → Return to Map → re-enter. Assert same canvas and school identity across ordinary transitions, no repeated model fetch/reset, and original Pause/Resume continuity.
- [ ] Update existing recovery regression tests for new entry flow; use stable accessible module label for chunk-abort test. Add actual touch-emulated project, keyboard-only path, reduced-motion no-camera-travel, quality retaining selected target, sound activation/rejection, delayed readiness/retry, hidden-tab delta limits, denied WebGL/context loss, and no overflow.
- [ ] Integrate one persistent canvas, coordinator frame driver, required-scene readiness plus shader warm-up, reducer/callbacks and shared time. Advance clock/simulation once, cap delta, pause all motion/entry progression when requested/hidden. Audio and DOM survive canvas failures.
- [ ] Preserve module Reload page and model/renderer Retry boundaries. Retry invalidates readiness and resets only failed graphics; story/back/map actions never reset fish/mixers. Provide DOM story/provenance fallback when graphics are unavailable.
- [ ] Build full-viewport responsive style with small controls, legible typography and focus outlines. Read installed Next docs before app changes. Keep props/ref lifecycle stable; no frame-frequency React state updates.
- [ ] Inspect real desktop/mobile map and underwater screenshots and a 30-second unattended scene. Verify India/islands/river/relief alignment, visible surface during descent, no empty outskirts, believable composition and readable fish. Fix actual integration/art defects before acceptance; do not certify photorealism.
- [ ] Run focused checks while fixing, then Node24 typecheck/lint/unit/build/complete browser suite once on the integrated result. Record real rendered animation, story/back persistence, keyboard/touch paths, and recovery tests. Remote CI is unverified until observed; physical-device FPS remains unverified.
- [ ] Collect available triangle/draw-call/payload observations without claiming headless software GPU equals real hardware. Keep active playable payload near PRD guardrails; high school fish alone is ~418K triangles/~110 material draws before world.
- [ ] Obtain one independent combined code/spec review and address blockers with focused regression checks. Update provenance/license docs, README limitations/results, TODO, and execution ledger. Keep existing dev-only dependency advisory visible.
- [ ] Restore/verify development server at actual available local port (currently 3001), report URL and what was actually checked. Save local Git checkpoints; no remote/push/publish or paid-service provisioning.

## Plan Self-Review and Handoff

Every journey/map/world/interaction/audio/accessibility/failure requirement maps to a task. Five risk classes have explicit tests. Shared types/current/obstacles/sources precede workers; camera/clock/integration have single owners. Geographic source and underwater illustration are separate facts. Optional relief failure is bounded; required geometry is not faked. Production artwork/science/physical-device acceptance are honestly deferred.

Execution method is already selected: **parallel agents with nonoverlapping ownership**, then coordinator integration and one independent combined review. User approved this written plan with "go ahead please"; execution and local verification are complete.
