# Project Memory - Workflow Preferences

## Git / PR workflow (user instruction)
- Use ONE working branch only: `feat/multi-species-cursor-follow-and-study` (do not create additional branches).
- Target base branch for merges/PRs: `setup/web-foundation` (the repo default; there is no `main`).
- Raise a PR ONLY when the user explicitly asks. Do not auto-create PRs.
- Commit and push to the single working branch ONLY when the user explicitly asks to commit. Do not auto-commit.
- Do not rename or recreate the working branch.
- Rollbacks: perform only on explicit request (force push allowed when rolling back).

## Current state
- Working branch HEAD: bf96448 (rocks organic + fish shadow fix). River assets and Suspense defer were rolled back (2 commits).