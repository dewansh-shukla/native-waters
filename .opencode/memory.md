# Project Memory - Workflow Preferences

## Git / PR workflow (user instruction)
- Use ONE working branch only: `feat/multi-species-cursor-follow-and-study` (do not create additional branches).
- Target base branch for merges/PRs: `setup/web-foundation` (the repo default; there is no `main`).
- Raise a PR ONLY when the user explicitly asks. Do NOT raise a PR with each commit.
- Commit and push to the single working branch ONLY when the user explicitly asks to commit. Do not auto-commit.
- Merge into base branch (setup/web-foundation) ONLY when the user explicitly asks to merge. Do not merge on your own - STRICT instruction (2026-10-25). After a merge, switch back to the single working branch.
- Do not rename or recreate the working branch.
- Rollbacks: perform only on explicit request (force push allowed when rolling back).

## Current state
- Working branch HEAD: f2111c5 (revert: remove river asset components, keep procedural rocks).
- Uncommitted: plant color/temperature/movement tuning (materials.ts, PreviewWorld.tsx, worldMotion.ts).