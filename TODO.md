# Native Waters v0 setup planning

- [x] Read PRD and inspect repository state (only prd.md; no Git repository or application).
- [x] Research technical foundation and user-owned prerequisites in parallel (planner: foundation/milestones; scout: science/assets/user inputs).
- [x] Confirm foundation scope: one Next.js/TypeScript/R3F app, local content, accessible controls, tests; Blender assets start from scratch.
- [x] Agree on the lean foundation approach; technical and acceptance research completed in parallel.
- [x] Write, self-review, and commit `docs/superpowers/specs/2026-10-14-web-foundation-design.md`.
- [x] Obtain user approval of the written design (user: "go ahead").
- [x] Write and self-review `docs/superpowers/plans/2026-10-14-web-foundation.md` with frozen contracts, file ownership, TDD checks, browser verification, and CI.
- [x] Obtain written-plan approval; user selected parallel agents.
- [x] Scaffold shared configuration, then implement content, GLB viewer, and accessible controls with three parallel agents.
- [x] Verify clean npm installation, typecheck, lint, 72 unit tests, production build, and 14 Chromium browser checks on Node 24.21.0. Independent review and scoped fixes passed.

## Polar parrot visual study

- [x] User identified the supplied reference as a polar parrot and approved a visual study.
- [x] Model/texture/rig work and viewer integration completed with separate parallel-agent ownership; original fixture preserved.
- [x] Fresh Blender script regeneration and GLB validation passed: five-bone rig, five embedded textures, 41,772 triangles, approximately 1.9 MB.
- [x] Inspect desktop/mobile-sized browser previews; correct glTF axis conversion and framing.
- [x] Node 24 typecheck/lint, 73 unit tests, production build, and 14 browser tests passed. Independent review found no blockers.
- [x] Restore development server at http://localhost:3001 and verify the active study response.

This study is not a native-Indian habitat candidate or a photorealistic production asset.

## Complete end-to-end experience preview

- [x] User approved the full journey using the polar-parrot study and an illustrative Indian water location.
- [x] Research journey architecture and world/asset scope in parallel.
- [x] Write and self-review `docs/superpowers/specs/2026-10-14-e2e-experience-preview-design.md`.
- [x] User approved written preview design, requiring a proper geographically sourced map.
- [x] Research and select pinned Natural Earth India POV boundary plus actual Cauvery river/lake centerlines; public-domain licence reviewed. Updated design distinguishes generalized real geography from illustrative underwater habitat.
- [x] Write and self-review `docs/superpowers/plans/2026-10-14-e2e-experience-preview.md` with shared contracts, source validation, and independent world/fish/camera/map/UI-audio ownership.
- [x] User approved written implementation plan: "go ahead please"; prior study checkpointed in b62bfc8.
- [x] Implement sourced map/dive/habitat/school/follow/story/return with independent parallel ownership and persistent canvas/runtime.
- [x] Inspect desktop/mobile map and underwater previews; preserve original Blender and GLB assets.
- [x] Independent combined review, one scoped fix wave, and fix re-review passed. Shader variants/link failures, delayed descent retry, shared swim clock, keyboard focus and provenance corrected with regressions.
- [x] Final coordinator Node 24 checks passed: typecheck/lint, 190 unit tests, 6 Python map-source tests, production build, and 8 complete-journey/recovery browser checks across desktop and touch. Full 22-case baseline passed before the fix wave; 14 affected browser checks passed during fixes. Expanded full 28-case suite not rerun.
- [x] Verify development server at http://localhost:3001, HTTP 200; leave unrelated port 3000 untouched.

## Polar-parrot realism v2

- [x] User supplied two more reference images and an unattributed care article; approved a bounded v2 asset pass before paired behavior.
- [x] Separate modelling and independent binary-validation agents; versioned authoring/export outputs preserve v1 and the original probe.
- [x] Refine anatomy/eyes/skin/bar variation/fins with original baked glTF PBR maps, without reusing photo pixels. V2: 26,206 source triangles, seven batches, five bones, 2.803 MiB.
- [x] Inspect matched neutral desktop/mobile v1/v2 browser views and actual underwater screenshots; integrate the v2 fixture without changing movement.
- [x] Fresh isolated Blender regeneration is byte-identical; original hashes preserved. Node 24 typecheck/lint, 194 units, build and all 28 desktop/touch browser cases passed, plus 13 asset and six map checks. Independent combined review found no blockers.
- [x] Save v2 `.blend` separately; preserve live Blender scene and safe mode. MCP correctly rejected library loading; no workaround or disabling performed.
- [x] User preferred v1: restore its active fixture and expectation, retaining v2 and all movement fixes. Node 24 typecheck/lint, 194 units, build, 13 asset checks and four desktop/touch playback/journey checks passed. Dev HTML confirms v1; full 28-case browser suite not rerun for this small rollback.

## V1 natural-style anatomical motion

- [x] User requested gill/tail/fin motion; preserve preferred v1 appearance rather than redesigning it.
- [x] Separate rig/export and TDD playback workers; original v1/v2 assets remain intact. New variant has 13 weighted joints and three disjoint clips: Swim, Breathing, FinIdle.
- [x] Exact geometry/UV/normal/material/image preservation assertions and fresh factory regeneration passed; animated GLB is byte-identical across regeneration, 41,772 source triangles / 11 batches / 1,967,696 bytes.
- [x] Independent asset checks verify named nonconstant disjoint channels and weighted joints. Real desktop/mobile browser skin evaluation confirms opening gills and independent breathing/idle fins at zero swim speed.
- [x] Integrate active v1-animated fixture and preserve legacy single-clip loading, pause/resume, reduced motion, action identity, shared clock, cache and cleanup. Node 24 typecheck/lint, all 196 units, build, all 28 browser cases, 14 asset checks and six map checks passed. Scoped independent review found no blockers.

## Next requested behavior/mobile pass

Requested after completing the experience preview; species-specific behaviors are not implemented yet. User clarified that the polar-parrot demonstration should use territorial pairs around caves/suitable shells, not a universal school.

- [x] Diagnose unwanted body rotations: shortest-arc orientation could roll almost 180° on a small direction change; wall/rock velocity reflections caused separate abrupt turns.
- [x] Correct upright orientation and source steering with bounded yaw/pitch and one anticipatory interior safety course; preserve physics/heading alignment and existing collision guards.
- [x] Unmasked 200-second and mixed/stalled-frame regressions passed; Node 24 typecheck/lint, all 194 unit tests, production build, and 4 desktop/touch playback/journey checks passed. Scoped review found no blockers.

- [ ] Design minimal species-specific behavior profiles for territorial, schooling and hiding behavior; allow contextual combinations rather than one behavior for every fish.
- [ ] Source behavior evidence for each actual species; distinguish illustrative study presets from verified wild behavior.
- [ ] Integrate behavior with territory, schoolmates and habitat cover while preserving selected identity, follow camera, pause and quality safeguards.
- [ ] Extend mobile usability checks for portrait/landscape, touch targets, navigation and story readability. Existing responsive/touch-emulated preview coverage is not physical-device certification.

## Next production milestones

- [ ] Research and approve a sourced habitat–hero-species pairing.
- [ ] Collect licensed anatomy/behaviour references and establish the production Blender asset contract.
- [ ] Produce the hero fish and living-water environment; integrate only after their independent quality gates.
- [ ] Validate on representative physical desktop/mobile devices. Remote CI has not run yet.

## Confirmed tooling decision

- User selected the most-starred of the researched Blender MCP options: ahujasid/mcp-for-blender (formerly blender-mcp). GitHub API returned 30,641 stars at selection, versus Blenderwright 168 and dcc-mcp-blender 45.
- [x] Install MCP for Blender 2.1.9 and its bundled Blender 5.2 add-on; configure `.pi/mcp.json` with telemetry disabled, safe mode, and a loopback destination.
- [x] Verify stdio initialization, three exposed tool names, and live loopback binding.
- [x] User enabled integration; live scene tools are available. Add-on telemetry consent was not independently checked.
- [x] Verify live Blender connection and localhost listener (127.0.0.1:9876).
- [x] Create separate pipeline-test scene, leaving original default scene untouched; export `artifacts/blender-probe/pipeline-test.glb`.
- [x] Validate GLB v2 structure, skin attributes, three joints, and animation channels; inspect mesh via MCP visual feedback.
- [x] Validate GLB playback, persistent Pause/Resume, and failure recovery in desktop/mobile-sized Chromium. Probe is not a production fish or ecological claim.

No external services or scientific claims were introduced. Runtime audit is clean; a dev-only braces advisory remains documented in README.md.
