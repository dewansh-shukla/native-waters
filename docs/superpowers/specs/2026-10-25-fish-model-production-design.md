# Fish Model Production Pass — Design

**Date:** 2026-10-25
**Status:** Approved 2026-10-25
**Scope:** Rebuild the six fish assets currently used by the Native Waters aquarium scene, plus the minimum app integration needed to serve them at two quality tiers.

---

## 1. Why

The aquarium scene (`D:\AI\native-waters`) already loads six fish models, but they are
placeholders from a Python-only pipeline: 689–774 vertices, flat zero-thickness fins, a
single painted 2K albedo, and four animation clips of which only one is ever played.
At the scene's follow-camera distance they read as white blobs, not fish.

The PRD (§26–§36) sets a production bar: species-correct fin geometry, layered eyes,
scale detail through normal maps, translucent fins, natural (non-plastic) material
response, a named-bone rig, and LODs. This pass closes the gap for the existing six fish
without changing the product's scope or scientific claims.

## 2. Current state (measured, not assumed)

| Item | Value |
|---|---|
| Species slots | 13: polar parrot ×5, zebra danio ×5 morphs, Arulius barb ×3 |
| Our six files | 689–774 verts, 1,199–1,346 tris each |
| Materials | One `fish_material`, `doubleSided`, no normal/roughness maps |
| Textures | One 2K PNG albedo, flat bands + photographic noise, no scale/gill/fin detail |
| Rig | 18 joints, unnamed in the GLB |
| Animation | Swim, SlowSwim, FastSwim, Idle — app plays only `Swim` (`FishSchool.tsx:51–60`) |
| LODs | None. One full asset per species at both quality tiers |
| Asset contract | Y-up, nose at local −X (`school.ts:13`), normalised by bounding box to 0.36 m |
| Existing quality bar | Polar parrot study: 41.7k tris, 11 materials incl. cornea/iris/pupil, translucent fin membrane |

Two facts drive the design:

1. **Four clips are wasted.** Only `Swim` plays; the other three are ~75% of animation bytes.
2. **2K textures per species are a mobile hazard.** Six species × 2K RGBA ≈ 100 MB of GPU
   memory before any normal maps.

## 3. Goals

- Each of the six fish reads as its species at follow distance: correct silhouette,
  fin placement, markings, and a believable eye.
- Material response is wet and non-plastic: roughness variation, scale normal detail,
  translucent fin membranes, clearcoat cornea.
- Runtime cost fits the existing scene: the six rebuilt species stay within the scoped
  budget (§11) at HIGH; LOW stays viable on mobile with 6 fish.
- The app keeps its current behaviour and tests: same IDs, same normalisation, same
  animation semantics, same quality controls.
- The assets are reproducible from checked-in Blender/Python tooling.

## 4. Non-goals

- Photorealism or scientific certification; this remains an illustrative aquarium.
- New species, new behaviour AI, or the PRD's species-specific territorial/schooling work.
- A procedural-swim driver (PRD §32). Cadence still follows speed via the existing
  `Swim` clip `timeScale`.
- Changes to the polar parrot fixture (v1 stays active and untouched).
- KTX2/meshopt pipelines, external CDN textures, texture streaming, or a runtime LOD
  manager with distance switching.
- Replacing the environment, water, camera, or UI systems.

## 5. Anti-goals (would make this a failure even if it ships)

- Slower than the current scene at the same quality tier on the project's test device,
  or higher GPU texture memory.
- White/blown-out fish or a visibly faceted silhouette.
- Fins that sort incorrectly or disappear against the background.
- Any change to fish identity, follow camera, pause/resume, reduced motion, or quality
  controls.
- A one-off asset with no reproducible source script.

## 6. Constraints

- **Engine:** three.js 0.186.1 via R3F 9.8.1 / drei 10.7.9; GLTFLoader defaults.
- **Assets:** binary GLB, embedded PNG/JPEG images only. The existing validator
  (`tools/assets/validate_fish_glb.py`) rejects external image/buffer URIs; keep that.
- **Scene:** 13 slots, HIGH 13 fish / LOW 6 (`src/experience/quality.ts`).
- **Contract:** Y-up, nose at −X, ~2.0 units long; every mesh node skinned; no
  cameras/lights/fixtures.
- **Repo state:** work happens on the current branch. User's uncommitted changes
  (`.opencode/memory.md`, `ReferenceLayout.*`) must not be touched.
- **Tooling:** Blender 5.2 + the MCP connection; glTF export via the Blender I/O add-on
  (the polar parrot pipeline already proves this path).

## 7. Approaches considered

### A — Blender production rebuild with tiered LODs (chosen)

Rebuild two base meshes (Arulius, Danio) with proper fins, eyes, and surface detail;
bake PBR maps; rig; export three LODs; integrate by quality tier.

Trades effort for the only path that satisfies the PRD's silhouette/eye/fin requirements.
Danio's five morphs cost only albedo variants, so six files come from two meshes.

### B — PRD hero tier for the Arulius only

20–40k tris and 2K maps for one species, others unchanged. Rejected: twelve fish would
remain visibly crude, it needs a LOD manager and texture streaming, and it risks mobile.
The chosen high LOD already sits at 1/3 of the PRD's hero budget, which is the right
trade for 13 fish on screen.

### C — Texture-only rescue

Keep the 1.2k meshes, repaint, add a normal map, split fins to an alpha material.
Rejected: cheap, but the blob silhouette and flat fins remain; fails the "still frame
resembles a real fish" acceptance criterion.

## 8. Asset design

### 8.1 Species and files

| Species | Slots | Base mesh | Notes |
|---|---|---|---|
| Arulius barb (*Dawkinsia arulius*) | 3 | unique | Three flank blotches, filamentous dorsal rays, barbels |
| Zebra danio (*Danio rerio*) | 5 | shared | Five albedo variants: wild, golden, albino, GloFish green, standard |

Output paths:

```
public/models/fish/arulius-barb/arulius-barb-high.glb
public/models/fish/arulius-barb/arulius-barb-mid.glb
public/models/fish/arulius-barb/arulius-barb-low.glb
public/models/fish/zebra-danio/zebra-danio-high.glb
public/models/fish/zebra-danio/zebra-danio-wild-high.glb   (etc.)
...
```

Slugs: `arulius-barb`, `zebra-danio`, `zebra-danio-wild`, `zebra-danio-golden`,
`zebra-danio-albino`, `zebra-danio-glowfish-green`.

The old top-level files are removed once the new ones pass validation and browser
checks; their originals remain in `C:\Users\vivek\Documents\3D Fish Models`.

### 8.2 Geometry and LODs

| LOD | Arulius | Danio | Used by |
|---|---|---|---|
| high | 9–12k tris | 7–10k tris | HIGH quality |
| mid | 3–4k tris | 3–4k tris | Authored and validated; reserved for a later distance-LOD pass |
| low | 1.0–1.5k tris | 1.0–1.5k tris | LOW quality |

Construction: lofted body rings with anatomical section changes (head, nape, caudal
peduncle), gill-cover lobes, lateral-line groove, separate fin membranes with
`Solidify` thickness and ray ridges, eye layers, barbels on the Arulius. Subdivision is
applied and the result decimated for lower LODs, so all three share a silhouette.

### 8.3 Materials and textures

| Map | Arulius high | Danio high | Low LOD |
|---|---|---|---|
| Albedo | 1K JPEG q90 | 1K JPEG q90 | 512 JPEG |
| Normal | 1K PNG | 512 PNG | 512 PNG |
| ORM (occlusion/roughness/metallic) | 512 PNG | 512 PNG | none |

Materials per high file, four at most: body (opaque, roughness map, subtle clearcoat),
fins (alpha-blended, double-sided, roughness ~0.35, alpha ~0.82), cornea (clearcoat, very
low roughness), and one eye material covering iris and pupil. The low LOD uses two: body
with the painted eye, and fins.

Patterns are painted procedurally from published anatomy descriptions — no photo pixels.
Scale detail lives in the normal map, not the albedo.

Danio variants share geometry, normal and ORM **at authoring time**. Because images must
be embedded per GLB (validator constraint), each variant carries its own copy at runtime.
Variants may also differ in iris base colour and fin tint — never in geometry. This keeps
wild-type, golden, albino and GloFish entries visually distinct instead of five copies of
the same fish with a different body hue.

### 8.4 Eyes

Three layers per PRD §30: black pupil, textured iris, and a clearcoat cornea shell.
Eyes are skinned to the head bone and named so the validator can verify the head axis.

### 8.5 Rig

Bones: `Root`, `Head`, `Jaw`, `GillL/R`, `Spine01–03`, `Tail01–02`, `TailFin`,
`PectoralL/R`, `PelvicL/R`, `Dorsal`, `AnalFin`. `GillL/R` and `Jaw` are required because
the gill pulse and mouth motion cannot be morph targets (the validator rejects them) and
deforming them through `Head` would distort the head. Weights are normalised and limited
to 4 influences. Every mesh node is skinned.

### 8.6 Animation

Exactly one clip, named `Swim`: 2.0 s at 24 fps, seamless loop, body wave with
tailward-increasing amplitude, coordinated pectoral/dorsal/anal motion, and a subtle
gill pulse. No `SlowSwim`/`FastSwim`/`Idle`; speed is expressed by the app's existing
`timeScale`.

### 8.7 Asset contract

- Y-up, nose at −X, dorsal +Y, extent ~2.0 on X; centred near the origin.
- Node names include `head`, `eye`, `iris`, `pupil`, `dorsal` so axis checks can run.
- No cameras, lights, floors, or fixtures.
- GLB contains one buffer and embedded images only.
- Deterministic export: fixed seeds; re-running the generator reproduces the same bytes.

## 9. App integration

- `SpeciesEntry` gains optional `lodUrls?: { high: string; mid?: string; low: string }`.
  `modelUrl` stays as the fallback for fixture/custom species that have no LOD variants.
- `resolveSpecies()` accepts and preserves `lodUrls`; a new pure
  `modelUrlForQuality(entry, quality)` returns `lodUrls.high` for HIGH, `lodUrls.low` for
  LOW, and `entry.modelUrl` when `lodUrls` is absent.
- `Experience.tsx` already computes `effectiveQuality`. It maps species to the resolved URL
  before passing them to `SceneViewport`, so `SceneViewport` and `FishSchool` keep their
  current single-URL contracts and mixer behaviour.
- Transparent fins: author as `alphaMode: BLEND`. If sorting artifacts appear in browser
  review, a single helper in `FishSchool` sets `depthWrite = true` and a tiny `alphaTest`
  on fin materials by name; no other material handling changes.
- LOD `mid` is not wired into runtime in this pass. It is produced and validated so a
  later distance-based pass needs no new assets. (My call — see §12.)
- Quality semantics are unchanged: HIGH 13 fish, LOW 6, selected fish preserved across
  quality changes.
- **Resolved:** LOW renders six native fish. `quality.ts` replaces the `slice(0, 6)` roster
  with an explicit `LOW_FISH_IDS = ["fish-5", "fish-7", "fish-8", "fish-10", "fish-11",
  "fish-12"]`; the existing rule that a selected fish outside the list replaces the final
  slot is preserved. `quality.test.ts` is updated to assert the new set, its length, and
  selection replacement (including a selection outside the list). Approved 2026-10-25.

## 10. Tooling and validation

```
tools/blender/create_fish_species.py     # one parameterised generator, both species + LODs
tools/blender/bake_fish_maps.py          # Cycles bakes for normal/roughness/AO
tools/assets/validate_fish_glb.py        # generalise: per-LOD budgets, species args, clip rules
tools/assets/test_validate_fish_glb.py   # fixtures for pass/fail cases
artifacts/fish-production/               # renders, notes, provenance
```

- Validation is structural and per-file: triangle/primitive caps, bounds, −X nose, +Y
  dorsal, embedded images, normalised weights, bone names, exactly one `Swim` clip, loop
  endpoints. The current validator's polar-parrot constants become parameters.
- Rendering review: Blender side + three-quarter + top stills per species, plus in-app
  Playwright screenshots at desktop and 390×844, in map-entry and follow modes.
- Determinism check: regenerate twice and compare SHA-256.

## 11. Budgets and acceptance criteria

Budgets below are scoped to **this pass's six species (8 of the 13 slots)**. The polar
parrot is excluded: five v1 clones already cost 208,860 triangles at HIGH, so a whole-scene
triangle cap cannot be met without redesigning that fixture, which is out of scope. Whole-scene
numbers are reported beside the scoped ones, never used as pass/fail for this work.

Texture memory is measured as **base level + full mip chain, cold start per quality tier**
(three.js uploads the chain), not base level alone.

| Criterion | Target |
|---|---|
| HIGH triangles, six new species (8 slots) | ≤ 90k |
| LOW triangles, six new species | ≤ 12k |
| GPU texture memory, six new species at HIGH | ≤ 56 MB incl. mips |
| GPU texture memory, six new species at LOW | ≤ 18 MB incl. mips |
| Added initial payload, HIGH | ≤ 6 MB (mid excluded until wired) |
| Per-file size | high ≤ 1.8 MB, low ≤ 250 KB |
| Structural | 1 skin, ≤ 4 materials (high), 1 `Swim` clip, embedded images, −X nose |
| Visual | Species markings read at 0.36 m; HIGH has geometric iris/pupil and a corneal highlight; LOW paints the eye into the albedo with a single specular highlight (two materials); fin rays visible; fins translucent, not white cards |
| Behaviour | No change to identity, follow, pause/resume, reduced motion, or quality switching |
| Build health | typecheck, lint, unit tests, production build, asset validator, browser journey tests pass |

## 12. Calls I made (not user decisions)

- **Two runtime tiers, three authored LODs.** HIGH uses `high`, LOW uses `low`, `mid` is
  staged for a later distance pass. Wiring selection- or distance-based LOD would touch
  `FishSchool` and its 196-test suite for little gain at 13 fish.
- **Danio normal map at 512.** Stripes carry identity; surface microdetail matters less
  than texture-memory budget for five variants.
- **Delete the old public GLBs after cutover.** Originals stay in the user's documents folder.
- **Keep the polar parrot as-is.** It is a separate reference study, not a native species.
- **One `Swim` clip only.** The app demonstrably ignores the rest.
- **Budgets are scoped to the six new species.** The polar parrot's five 41.7k clones
  dominate the scene and are not part of this pass; whole-scene figures are reported but
  not gated.
- **Texture accounting includes mip chains.** Base-level-only figures flatter the budget
  by ~33%.
- **`GillL/R` and `Jaw` are part of the rig.** The gill pulse needs bones; morph targets
  are rejected by the validator.
- **Danio variants carry duplicate embedded maps.** Sharing is authoring-level only;
  iris tint and fin tint may vary per variant.
- **The LOW eye is painted, not geometric.** The two-material cap on the low LOD takes
  priority over a separate cornea layer.
- **LOW shows six native fish.** Approved by the user; three danio morphs (standard,
  golden, wild) plus the three Arulius slots, with selection preservation unchanged.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Blender bake/export time balloons | Bake once per base mesh; textures are 512–1K; parallelise nothing, keep the script resumable |
| Transparent fin sorting artifacts | Author double-sided BLEND; if artefacts appear, enable depth-write + alphaTest helper; verify in browser screenshots |
| Mid LOD drift from high silhouette | Decimate from the applied high mesh rather than re-lofting |
| Payload creep from five danio variants | 1K albedo JPEG, 512 normal/ORM; size budgets enforced by the validator |
| Regressing the crossing tests | Integration limited to `species.ts` + `SceneViewport`; `FishSchool` stays contract-compatible; add unit tests for URL resolution |
| LOW roster change breaks selection/quality expectations | Change lives in `quality.ts` only; extend the existing `visibleFishIds` tests for the new native set and for selection replacement |
| Blender MCP disruption | Authoring uses headless `blender --background --python`; MCP only for visual inspection |

## 14. What's left to the builder

- Exact ring/profile counts and fin membrane topology.
- Whether scale detail is baked from a displacement mesh or generated as a height field.
- Bake sample counts and texture-filter settings.
- How to express the danio variants (separate albedo files with a shared palette source).
- Minor naming inside the generator scripts.

## 15. LOW roster decision

**Decided 2026-10-25:** LOW shows six native fish — `fish-5` (standard danio),
`fish-7` (golden danio), `fish-8` (wild danio), and `fish-10`–`fish-12` (Arulius).
The GloFish-green and albino entries remain available at HIGH and via selection.

Rationale: mobile/AUTO visitors otherwise see five placeholder parrots, and five of the
six low LODs would never render. The change is confined to `quality.ts` and its tests;
the existing rule that a selected fish outside the list replaces the final slot still
applies, so selection is preserved across quality changes.

The exact three danio IDs live in one constant and can be swapped without touching the
rest of the design.
