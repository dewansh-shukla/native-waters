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
- [ ] User review of written implementation plan; parallel execution method already approved.
- [ ] Implement the map/dive/habitat/school/follow/story/return journey without removing existing safeguards.
- [ ] Verify real browser flow, visual previews, and code review; restore development server.

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
