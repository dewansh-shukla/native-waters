---
name: Native Waters Setup
description: Set up the native-waters repo locally on Windows (D:\AI\native-waters). Covers fixing D:\AI write permissions, installing Node 24 LTS, npm ci, fixing Windows-incompatible npm scripts, and running typecheck/lint/tests/dev server.
---

# Native Waters — Local Setup (Windows)

Use this when cloning/setting up `https://github.com/dewansh-shukla/native-waters` on a Windows machine.

## Prerequisites
- Git, Node (will upgrade to 24), npm
- User is a collaborator on the repo
- Target path: `D:\AI\native-waters`

## 1. Fix D:\AI write permissions (one-time, needs admin)
`D:\AI` grants Everyone only ReadAndExecute. Run an elevated icacls (UAC prompt):

```powershell
Start-Process cmd -Verb RunAs -ArgumentList '/c','icacls "D:\AI" /grant "vivek:(OI)(CI)M"' -Wait
```

Verify: `New-Item -ItemType Directory -Path "D:\AI\test_write_tmp" -Force` succeeds.

## 2. Clone
```powershell
git clone https://github.com/dewansh-shukla/native-waters.git D:\AI\native-waters
```
Default branch is `setup/web-foundation` (not main).

## 3. Node version
Repo requires `^24.15.0` (`.nvmrc` = 24). If system Node is 22, upgrade:
```powershell
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
```
Verify: `node --version` → v24.x. Open a new terminal so PATH picks up the new npm.

## 4. Install dependencies
```powershell
cd D:\AI\native-waters
npm ci
```
(485 packages; ~4 min on slow disks due to Defender.)

## 5. Windows script fix (local only, don't commit as-is)
`package.json` scripts use Unix env syntax `NEXT_TELEMETRY_DISABLED=1 next dev`, which fails in cmd/PowerShell. Fix for Windows:
```json
"dev": "next dev",
"start": "next start",
"build": "next build"
```
Or use `cross-env` for a cross-platform fix. Better permanent solution: propose `cross-env` to the repo owner.

## 6. Run checks
```powershell
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # vitest run (196 tests; 2-3 may timeout on slow disks — pre-existing, not bugs)
npm run dev         # http://localhost:3000
```

## Known gotchas
- Defender real-time scanning makes tests/installs ~10x slower. Add an exclusion for `D:\AI` for speed.
- npm in PATH may be stale (9.6.3) in old terminals; open a new terminal after Node upgrade.
- 6 npm vulnerabilities (5 high, 1 critical) reported; don't run `audit fix --force` (changes lockfile).
- Playwright e2e needs `npx playwright install` (browsers not installed by default).
- Unit-test timeouts (fish school 200s trajectory, geometry) are performance-related on Windows, not code bugs.
- Scripts `dev`/`build` use Unix env syntax — fails on Windows unless fixed (step 5).
- `.nvmrc` = 24; CI targets Node 24.

## Files of interest
- `prd.md` — vertical slice PRD (actual governing goal)
- `TODO.md` — milestone checklist
- `src/app/page.tsx` — single route; entry point for species list
- `content/fixtures/*.json` — fish fixtures
- `public/models/*.glb` — fish models
- `tools/assets/validate_fish_glb.py` — GLB validator (polar-parrot-specific budgets)
PY