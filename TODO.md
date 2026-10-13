# Native Waters v0 setup planning

- [x] Read PRD and inspect repository state (only prd.md; no Git repository or application).
- [x] Research technical foundation and user-owned prerequisites in parallel (planner: foundation/milestones; scout: science/assets/user inputs).
- [x] Confirm foundation scope: one Next.js/TypeScript/R3F app, local content, accessible controls, tests; Blender assets start from scratch.
- [x] Agree on the lean foundation approach; technical and acceptance research completed in parallel.
- [x] Write and self-review `docs/superpowers/specs/2026-10-14-web-foundation-design.md` (not committed: repository is not initialized yet).
- [x] Obtain user approval of the written design (user: "go ahead").
- [x] Write and self-review `docs/superpowers/plans/2026-10-14-web-foundation.md` with frozen contracts, file ownership, TDD checks, browser verification, and CI.
- [ ] Obtain written-plan review; parallel-agent execution method is already selected by the user.
- [ ] Scaffold the approved setup, using parallel agents for independent file ownership.
- [ ] Verify the integrated setup and document remaining asset/device-validation limits.

## Confirmed tooling decision

- User selected the most-starred of the researched Blender MCP options: ahujasid/mcp-for-blender (formerly blender-mcp). GitHub API returned 30,641 stars at selection, versus Blenderwright 168 and dcc-mcp-blender 45.
- [x] Install MCP for Blender 2.1.9 and its bundled Blender 5.2 add-on; configure `.pi/mcp.json` with telemetry disabled, safe mode, and a loopback destination.
- [x] Verify stdio initialization and the three exposed tool names. Add-on defaults to localhost; live binding is not yet verified.
- [x] User enabled integration; live scene tools are available. Add-on telemetry consent was not independently checked.
- [x] Verify live Blender connection and localhost listener (127.0.0.1:9876).
- [x] Create separate pipeline-test scene, leaving original default scene untouched; export `artifacts/blender-probe/pipeline-test.glb`.
- [x] Validate GLB v2 structure, skin attributes, three joints, and animation channels; inspect mesh via MCP visual feedback.
- [ ] Validate GLB playback in a browser once the web foundation exists. Probe is not a production fish or ecological claim.

No product scaffolding, external services, or scientific claims until the relevant decisions are approved.
