---
name: Native Waters Add Species
description: Add a new fish species to the native-waters aquarium. Covers integrating a GLB model, registering it as a species with its own fish slots, updating dropdown labels, and the multi-species rendering architecture (species array, fish-id split, FishSchool fishIds).
---

# Native Waters — Add a Fish Species

Use this when adding a new fish species to the tank (e.g., a new aquarium species).

## Architecture overview
- One simulation school of 10 fish (`createSchool()` → ids `fish-0`..`fish-9`).
- Each fish id is assigned to a species via the `species` array passed to `<Experience>` in `src/app/page.tsx`.
- Each species entry: `{ modelUrl, fishIds, label }`.
  - `modelUrl`: path under `/models/` (e.g. `/models/zebra-danio.glb`)
  - `fishIds`: which fish ids render with that model (e.g. `["fish-5"]`)
  - `label`: display name used in the dropdown + follow card
- `SceneViewport` renders one `FishSchool` per species, passing `fishIds` so each school only renders its assigned fish.
- `ExperienceUI` labels each dropdown option via `speciesLabels` (fish id → label), computed in `Experience.tsx`.

## Steps to add a new species

### 1. Obtain the GLB model
Place the model at `public/models/<species-slug>.glb`. Validate it's a real glTF 2.0:
```powershell
python3 -c "import struct; raw=open('public/models/<slug>.glb','rb').read(); m,v,l=struct.unpack_from('<4sII',raw); print(m,v,l,len(raw))"
```
Must print `b'glTF' 2 <n> <n>`.

Note: a static/rigless GLB renders as a non-animated fish. For swimming motion it needs a rig + animation clips (see polar parrot v1 animated for reference).

### 2. Create a fixture (optional, for provenance)
`content/fixtures/<slug>.json`:
```json
{ "id": "<slug>", "label": "<Common Name> - <Scientific>", "disclaimer": "...", "modelUrl": "/models/<slug>.glb" }
```

### 3. Register the species in `src/app/page.tsx`
Add an entry to the `species` array, assigning one or more fish ids:
```tsx
{ modelUrl: "/models/<slug>.glb", fishIds: ["fish-5"], label: "<Common Name>" },
```
Reassign fish ids so each species gets the slots you want (total 10 fish).

### 4. Update dropdown labels
Labels are derived automatically from `speciesLabels` built in `Experience.tsx` from the `label` field. No manual edits needed — just set `label` correctly in step 3.

### 5. Verify
```powershell
npm run typecheck
npm run dev   # enter water, confirm the new fish renders and is selectable in the dropdown
```

## Key files
- `src/app/page.tsx` — species list (modelUrl, fishIds, label)
- `src/components/Experience.tsx` — builds `species` + `speciesLabels`, passes to SceneViewport/ExperienceUI
- `src/components/scene/SceneViewport.tsx` — renders one FishSchool per species
- `src/components/scene/fish/FishSchool.tsx` — accepts `fishIds` filter
- `src/components/experience-ui/ExperienceUI.tsx` — dropdown + follow card use `speciesLabels`
- `src/experience/contracts.ts` — `ExperienceSceneProps` (species?), `FishSchoolProps` (fishIds?)
- `public/models/*.glb` — model files
- `content/fixtures/*.json` — optional provenance fixtures

## Windows notes
- GLB paths use forward slashes in JSON/TSX.
- `npm run dev` works after the Windows script fix (see native-waters-setup skill).
- Defender scanning slows model loading; add `D:\AI` exclusion.

## Removing a species
Delete its entry from the `species` array in `page.tsx` and remove the GLB. Reassign its fish ids to another species (or leave slots empty — they just won't render).
PY