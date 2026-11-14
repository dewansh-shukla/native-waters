# River Ganga underwater experience — design

## Intent

Give the Ganga (Ganges) river its own underwater 3D experience in "Native Waters", comparable in depth to the existing Cauvery scene, reusing the shared world, water, material, camera, and fish-animation infrastructure. The Ganga scene must not reuse Cauvery's fish; it gets three newly modeled, aquarium-suitable Ganga natives.

## Goals

- A dedicated `/experience/ganga` route (`/experience` stays Cauvery).
- Three new fish species modeled from reference, rigged and animated with the existing pipeline, used only in the Ganga scene.
- Ganga-appropriate water optics (turbid, brownish, low clarity) and habitat (silty/sandy bed, fewer granite boulders, sand ripples, Ganga greens).
- Reuse shared components: `waterOptics`, `materials`, `worldAssets`, `worldMotion`, `ExperienceCamera`, `SceneViewport`, fish animation/rigging, driftwood log.
- Parameterize `Experience` by a `RiverProfile` so future rivers are additive.

## Non-goals

- No new npm dependencies.
- No full Ganga species catalog expansion beyond the 3 scene fish (Rohu/Calbasu stay reference-only records).
- No replacement of the Cauvery scene or its fish.
- No archaeological/ancient wood treatment; driftwood stays "submerged driftwood".

## Anti-goals

- Do not reuse Cauvery fish (zebra danio, arulius barb, polar-parrot study) in the Ganga scene.
- Do not make the Ganga water crystal-clear; it must read turbid.
- Do not ship a Ganga scene whose fish are placeholders.

## Constraints

- Fish models produced via existing pipeline (`tools/blender/`, `fish-glb-generator`, `photoreal-fish-modeling` skills), exported as GLB with high/mid/low LODs and swim clips.
- `Experience` backward-compatible: `/experience` with no river defaults to Cauvery.
- Tests follow existing TDD patterns in `worldAssets.test.ts` and `materials.test.ts`.

## Approaches considered

1. **Parameterize by river profile (chosen).** Add `RiverProfile` config; `Experience` takes `river` prop. Scales to more rivers.
2. Separate Ganga experience route with duplicated wiring — rejected.
3. Content-only (reuse Cauvery scene) — rejected.

## Fish roster (new models required)

1. **Honey gourami** (*Trichogaster chuna*) — labyrinth fish, golden/honey, ~2 in, slow-moving.
2. **Badis** (*Badis badis*) — "chameleon fish," color-changing, ~2 in.
3. **Indian glass fish** (*Parambassis ranga*) — transparent body, ~3 in.

Rohu/Calbasu remain catalog reference species only.

## Ganga look

- Water: turbid brownish. Higher sediment scatter, shorter fog distance, brownish-green scatter, adjusted absorption. Fish readable at 2-4 m.
- Bed: silty/sandy with sand ripples; fewer granite boulders; gravel recolored to sand.
- Rocks: reuse gravel geometry with sandstone palette; boulders reduced or replaced with sandbar mounds.
- Plants: reuse ribbon/grass clumps recolored to Ganga greens, sparser.
- Driftwood: reuse existing log prop.
- Lighting: warmer, hazier; weaker god rays.

## Architecture

- New `src/experience/riverProfiles.ts` exporting `RIVER_PROFILES` and `resolveRiverProfile(id)`.
- `RiverProfile`: `id`, `name`, `water: WaterOpticsConfig`, `habitat: HabitatConfig`, `fish: SpeciesEntry[]`, `geoAnchor: Vector3`, `entryAnchor: Vector3`.
- `Experience` gains optional `river?: string` prop defaulting to `"cauvery"`.
- `SceneViewport`/`PreviewWorld` accept profile-derived water + habitat.
- New route `/experience/ganga`; basin `ScenePreview` can open matching river experience.

## Phases

### Phase 1 — Fish modeling (parallel with Phase 2)
For each species: gather reference photos, create photorealistic model via fish pipeline, rig (skeleton + swim/idle/turn clips), export high/mid/low GLB, place under `public/models/fish/<species>/`, add species entries. Validate with fish-material absorption tests and browser smoke.

### Phase 2 — River parameterization + Ganga scene
Implement `RiverProfile` + Cauvery profile (refactor, no behavior change). Implement Ganga profile. Wire `/experience/ganga` route. Add Ganga water optics and habitat. Tests: profile resolution, water constants, geometry determinism, e2e smoke.

### Phase 3 — Lookdev & validation
Browser screenshots, QA turbidity/readability, tune.

## Open questions (resolved)

1. Fish species: honey gourami, badis, Indian glass fish — **approved**.
2. Water clarity: visibly murky (brownish) — **confirmed**.
3. Fish modeling and scene work in parallel — **confirmed**.
