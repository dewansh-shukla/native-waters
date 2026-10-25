# Fish Model Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the six Native Waters fish assets as validated, textured, rigged, three-LOD GLBs, and serve the correct LOD at HIGH/LOW without changing the experience's behaviour.

**Architecture:** One parameterised Blender generator (pure-Python anatomy specs + Blender assembly) exports the Arulius barb and five zebra-danio variants at three LODs. A stdlib validator gates structure, rig, clips and budgets; `species.ts` maps each species to `{high, mid, low}` and `Experience` resolves the URL by effective quality. Budget totals are enforced by an asset test, not by eye.

**Tech Stack:** Blender 5.2.3 (bundled Python 3.11), Python 3.10 stdlib for tools, Next.js 16.4.0 / React 19.3.0 / three 0.186.1 / R3F 9.8.1 / drei 10.7.9, Vitest 5.0.4, Playwright 1.64.0, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-25-fish-model-production-design.md`

## Global Constraints

- Node must satisfy `^24.15.0 || >=26.0.0`; the installed runtime is 24.22.1. Blender is `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
- Assets are binary GLB, Y-up, nose at local −X, dorsal +Y, extent 1.7–2.3 on X.
- Every mesh node is skinned; no morph targets; weights normalised to 1 with at most 4 influences; no cameras, lights, floors or fixtures in a GLB.
- Exactly one animation clip named `Swim` in every new fish GLB.
- Embedded images and one embedded buffer only; no external URIs.
- HIGH renders 13 fish; LOW renders `fish-5`, `fish-7`, `fish-8`, `fish-10`, `fish-11`, `fish-12`, replacing the final slot when another fish is selected.
- Scoped budgets (six new species): HIGH ≤ 90k triangles, LOW ≤ 12k; GPU texture memory ≤ 56 MiB at HIGH and ≤ 18 MiB at LOW including mip chains; added HIGH payload ≤ 6 MB; per-file high ≤ 1.8 MB, low ≤ 250 KB.
- The polar parrot fixture, `public/models/pipeline-test.glb`, and the user's uncommitted map-pipeline files must not be modified.
- Old public fish GLBs are deleted only after validation and browser checks pass; originals remain in `C:\Users\vivek\Documents\3D Fish Models`.
- Commits in this plan include only the files named by the task.

## Review Focus

- **Missing or typo'd LOD URL:** a species entry pointing at a nonexistent file leaves an empty school. Every `lodUrls` path is checked against `public/` in Task 8, and the fallback to `modelUrl` is unit-tested.
- **Selected fish outside the LOW roster:** switching to LOW while following an albino danio must keep it visible exactly once. Task 9 tests every fish ID under both tiers.
- **Transparent fin sorting:** fins must not erase the eye or body at grazing angles. Task 10 pins `depthWrite`/`alphaTest` on fin materials and Task 11 checks screenshots.
- **Oversized or malformed GLB:** a truncated buffer, external image, or over-budget file must fail with JSON, never crash the loader. Task 1 exercises these paths.
- **Wrong clip or missing bone:** a GLB with `Idle` instead of `Swim`, or a rig without `Gill.L`, silently loses locomotion or deformation. Task 1 adds exact clip-set and required-bone checks used by every asset task.

---

### Task 1: Parameterise the GLB validator

**Files:**
- Modify: `tools/assets/validate_fish_glb.py`
- Modify: `tools/assets/test_validate_fish_glb.py`

**Interfaces:**
- Produces: `DEFAULT_LIMITS = {"max_triangles": 41772, "max_primitives": 11, "max_bytes": 3 * 1024 * 1024, "clips": None, "bones": ()}` and `validate(path: Path, limits: dict | None = None) -> dict`.
- Produces CLI: `PATH [--triangles N] [--primitives N] [--bytes N] [--clip NAME ...] [--bone NAME ...]`.
- Facts JSON gains `"limits"` with the resolved values; `"clips"` is a sorted list or `None`; each `images[]` entry gains a `sha256` of its payload so variant tests can prove the maps differ.
- Defaults preserve the polar-parrot contract, so existing tests pass unchanged.

- [ ] **Step 1: Write the failing validator tests**

Extend `run_cli` to `run_cli(self, data, *args)` and add:

```python
def test_custom_limits_clips_and_bones(self):
    code, facts = self.run_cli(self.original, '--triangles', '41771')
    self.assertNotEqual(code, 0)
    self.assertIn('budget', facts['error'])
    code, facts = self.run_cli(self.original, '--primitives', '10')
    self.assertNotEqual(code, 0)
    self.assertIn('budget', facts['error'])
    code, facts = self.run_cli(self.original, '--bytes', '1000')
    self.assertNotEqual(code, 0)
    self.assertIn('payload', facts['error'])
    code, facts = self.run_cli(self.original, '--triangles', '41772',
                               '--primitives', '11', '--bytes', str(3 * 1024 * 1024))
    self.assertEqual(code, 0, facts)
    code, facts = self.run_cli(self.original, '--clip', 'Swim')
    self.assertNotEqual(code, 0)
    self.assertIn('animation clips', facts['error'])
    code, facts = self.run_cli(self.original, '--clip', 'Swim', '--clip', 'Breathing',
                               '--clip', 'FinIdle')
    self.assertEqual(code, 0, facts)
    code, facts = self.run_cli(self.original, '--bone', 'Head', '--bone', 'Gill.L')
    self.assertEqual(code, 0, facts)
    code, facts = self.run_cli(self.original, '--bone', 'NoSuchBone')
    self.assertNotEqual(code, 0)
    self.assertIn('required bone', facts['error'])
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -B tools/assets/test_validate_fish_glb.py`
Expected: FAIL on unknown CLI arguments.

- [ ] **Step 3: Implement limits, clip-set and bone checks**

Read the flags before `validate`; unknown flags raise `ValueError('usage: ...')` so the existing JSON error path handles them. Replace the hardcoded size and triangle checks with the limits values, assert the animation name set equals `limits["clips"]` when it is not `None`, assert every `limits["bones"]` name is a joint name, and add the image payload SHA-256.

- [ ] **Step 4: Run both validator suites**

Run: `python -B tools/assets/test_validate_fish_glb.py`
Expected: PASS, including the unchanged polar-parrot tests.

- [ ] **Step 5: Commit**

```bash
git add tools/assets/validate_fish_glb.py tools/assets/test_validate_fish_glb.py
git commit -m "feat(assets): parameterize fish GLB validation limits"
```

---

### Task 2: Add the fish production budget manifest

**Files:**
- Create: `tools/assets/fish_budgets.py`
- Create: `tools/assets/test_fish_budgets.py`

**Interfaces:**
- Produces `SPECIES: tuple[str, ...]` with `arulius-barb`, `zebra-danio`, `zebra-danio-wild`, `zebra-danio-golden`, `zebra-danio-albino`, `zebra-danio-glowfish-green`.
- Produces `LODS = ("high", "mid", "low")`, `TRIANGLE_CAPS[slug][lod]`, `BYTE_CAPS[lod]`, `PRIMITIVE_CAPS[lod]`, `REQUIRED_BONES: tuple[str, ...]`.
- Produces `glb_path(slug: str, lod: str) -> Path` relative to the repo root: Arulius under `public/models/fish/arulius-barb/`, all danio under `public/models/fish/zebra-danio/`.
- Caps: Arulius `12000/4500/1500`, Danio `10000/4000/1400`; bytes `1800000/1000000/250000`; primitives `6/6/4` (the dorsal membrane stays a separate primitive so the axis check can find it).
- Required bones: `Head`, `Jaw`, `Gill.L`, `Gill.R`, `Spine.01`, `Spine.02`, `Spine.03`, `Tail.01`, `Tail.02`, `TailFin`, `Pectoral.L`, `Pectoral.R`, `Pelvic.L`, `Pelvic.R`, `Dorsal`, `AnalFin`.

- [ ] **Step 1: Write the failing manifest test**

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.assets.fish_budgets import BYTE_CAPS, LODS, PRIMITIVE_CAPS, SPECIES, TRIANGLE_CAPS, glb_path

class BudgetTests(unittest.TestCase):
    def test_eighteen_unique_paths(self):
        paths = [glb_path(slug, lod) for slug in SPECIES for lod in LODS]
        self.assertEqual(len(paths), 18)
        self.assertEqual(len({str(p) for p in paths}), 18)

    def test_caps_increase_with_lod_and_fit_totals(self):
        for slug in SPECIES:
            caps = TRIANGLE_CAPS[slug]
            self.assertGreater(caps["high"], caps["mid"])
            self.assertGreater(caps["mid"], caps["low"])
        high_total = TRIANGLE_CAPS["arulius-barb"]["high"] * 3 + TRIANGLE_CAPS["zebra-danio"]["high"] * 5
        low_total = TRIANGLE_CAPS["arulius-barb"]["low"] * 3 + TRIANGLE_CAPS["zebra-danio"]["low"] * 5
        self.assertLessEqual(high_total, 90000)
        self.assertLessEqual(low_total, 12000)
        self.assertLessEqual(BYTE_CAPS["low"], 250000)
        self.assertEqual(PRIMITIVE_CAPS, {"high": 6, "mid": 6, "low": 4})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python -B tools/assets/test_fish_budgets.py`
Expected: FAIL, `ModuleNotFoundError: tools.assets.fish_budgets`.

- [ ] **Step 3: Implement the manifest**

Use plain constants and `pathlib.Path`; no dependencies. `glb_path` maps the Arulius family to `arulius-barb`, every other slug to `zebra-danio`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -B tools/assets/test_fish_budgets.py`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/assets/fish_budgets.py tools/assets/test_fish_budgets.py
git commit -m "chore(assets): add fish production budgets"
```

---

### Task 3: Add pure anatomy specs and geometry helpers

**Files:**
- Create: `tools/blender/fish_specs.py`
- Create: `tools/blender/fish_geometry.py`
- Create: `tools/blender/test_fish_specs.py`
- Create: `tools/blender/test_fish_geometry.py`

**Interfaces:**
- Produces `Variant(slug, label, body, stripe, fin, iris)` and `SpeciesSpec(slug, family, label, rings, sides, height, width, variants)` frozen dataclasses.
- Produces `SPECIES: dict[str, SpeciesSpec]` with the two base species and all five danio variants.
- Produces `profile(slug: str, t: float) -> tuple[float, float, float]` returning half-height, half-width and vertical centre at `0.0 <= t <= 1.0` along the body.
- Produces `Geometry(vertices, faces, uvs)` and `loft(spec, rings, sides)`, `fin(roots, tips, thickness, columns)`, `sphere(center, radii, segments, rings)`, `tube(points, radius, sides)`.
- The body loft spans x −1.0…+0.8; the caudal fin reaches +1.0, so the whole fish stays near 2.0. Ring/side counts: high `72/24`, mid `48/16`, low `32/10`.
- Palettes pinned: Danio standard `#c9d6d8/#2f4f6f/#d8c98a/#c9b46a`, wild `#a9b8a6/#1f3f5a/#c8d2c0/#b7a45c`, golden `#e0b45c/#f2e6c8/#e8c76a/#caa24a`, albino `#f0ded2/#e8c4b8/#f2d9d0/#d86a5a`, GloFish green `#7adf6a/#c8ffb0/#8ce87a/#6fbf5a`; Arulius body `#b8b6a4`, blotches `#2a2a24`, fins `#c9b07a`, iris `#b08a3a`.

- [ ] **Step 1: Write the failing spec test**

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_specs import SPECIES, profile

class SpecTests(unittest.TestCase):
    def test_species_and_variants(self):
        self.assertEqual(set(SPECIES), {"arulius-barb", "zebra-danio"})
        self.assertEqual(len(SPECIES["zebra-danio"].variants), 5)
        self.assertEqual(len(SPECIES["arulius-barb"].variants), 1)

    def test_profile_tapers_and_fits_two_units(self):
        for slug in SPECIES:
            for t in (0.0, 0.25, 0.5, 0.75, 1.0):
                h, w, z = profile(slug, t)
                self.assertGreater(h, 0)
                self.assertGreater(w, 0)
                self.assertGreater(h, w)
            self.assertGreater(profile(slug, 0.45)[0], profile(slug, 0.02)[0])
            self.assertGreater(profile(slug, 0.45)[0], profile(slug, 0.98)[0])
```

- [ ] **Step 2: Write the failing geometry test**

```python
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_geometry import fin, loft, sphere
from tools.blender.fish_specs import SPECIES

class GeometryTests(unittest.TestCase):
    def test_loft_is_indexed_and_uv_mapped(self):
        g = loft(SPECIES["zebra-danio"], 12, 8)
        self.assertEqual(len(g.faces), 12 * 8 * 2)
        self.assertTrue(all(0 <= i < len(g.vertices) for f in g.faces for i in f))
        self.assertTrue(all(0.0 <= u <= 1.0 and 0.0 <= v <= 1.0 for u, v in g.uvs))
        xs = [p[0] for p in g.vertices]
        self.assertAlmostEqual(max(xs) - min(xs), 1.8, places=3)

    def test_fin_has_two_sides_and_a_rim(self):
        g = fin([(0, 0, 0), (0.2, 0, 0)], [(0, 0.4, 0), (0.2, 0.4, 0)], 0.01, 2)
        self.assertGreater(len(g.faces), 4)
        self.assertTrue(all(len(f) == 4 for f in g.faces))
        self.assertAlmostEqual(min(p[2] for p in g.vertices), -0.005, places=4)

    def test_sphere_counts(self):
        g = sphere((0, 0, 0), (0.1, 0.1, 0.1), 8, 6)
        self.assertGreater(len(g.vertices), 8)
        self.assertTrue(all(len(f) in (3, 4) for f in g.faces))
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `python -B tools/blender/test_fish_specs.py` and `python -B tools/blender/test_fish_geometry.py`
Expected: FAIL, missing modules.

- [ ] **Step 4: Implement the specs and geometry**

Keep both modules free of `bpy` and numpy. `loft` returns rings × sides × 2 triangles with duplicated seam vertices and u along X; `fin` builds a top sheet, bottom sheet and rim; `sphere` and `tube` return indexed quads/triangles with UVs. Use `math` only and deterministic ordering.

- [ ] **Step 5: Run both tests to verify they pass**

Run: `python -B tools/blender/test_fish_specs.py` and `python -B tools/blender/test_fish_geometry.py`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/blender/fish_specs.py tools/blender/fish_geometry.py tools/blender/test_fish_specs.py tools/blender/test_fish_geometry.py
git commit -m "feat(assets): add fish anatomy and geometry specs"
```

---

### Task 4: Build the Arulius structure (mesh, rig, Swim, three LODs)

**Files:**
- Create: `tools/blender/create_fish_species.py`
- Create: `tools/assets/test_fish_assets.py`
- Output: `public/models/fish/arulius-barb/arulius-barb-{high,mid,low}.glb`
- Output: `artifacts/fish-production/arulius-barb-{lod}.json`

**Interfaces:**
- CLI: `blender --background --python tools/blender/create_fish_species.py -- --species arulius-barb [--flat] [--out public/models/fish] [--report artifacts/fish-production]`.
- Produces one GLB per LOD with one skin, 4 materials (`FishBody`, `FishFin`, `FishEye`, `FishCornea`), one `Swim` action, and the Task 2 bone set.
- Produces a report per LOD: `{"species", "lod", "triangles", "vertices", "materials", "bones", "bytes"}`.
- The flat build uses 64×64 solid images so the validator's embedded-image rule is exercised before real textures exist.

- [ ] **Step 1: Write the failing Arulius structure test**

```python
import json, subprocess, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.assets.fish_budgets import BYTE_CAPS, PRIMITIVE_CAPS, REQUIRED_BONES, TRIANGLE_CAPS, glb_path

CLI = ROOT / "tools/assets/validate_fish_glb.py"

class AruliusStructure(unittest.TestCase):
    def test_three_lods_validate(self):
        for lod in ("high", "mid", "low"):
            path = ROOT / glb_path("arulius-barb", lod)
            self.assertTrue(path.exists(), path)
            args = [sys.executable, "-B", str(CLI), str(path),
                    "--triangles", str(TRIANGLE_CAPS["arulius-barb"][lod]),
                    "--primitives", str(PRIMITIVE_CAPS[lod]),
                    "--bytes", str(BYTE_CAPS[lod]), "--clip", "Swim"]
            for bone in REQUIRED_BONES:
                args += ["--bone", bone]
            result = subprocess.run(args, capture_output=True, text=True)
            facts = json.loads(result.stdout)
            self.assertEqual(result.returncode, 0, facts)
            self.assertEqual(facts["axis"], {"head": "-X", "dorsal": "+Y"})
            self.assertEqual(len(facts["bones"]), 1)
            self.assertLessEqual(len(facts["materials"]), 2 if lod == "low" else 4)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `python -B tools/assets/test_fish_assets.py`
Expected: FAIL, missing `arulius-barb-high.glb`.

- [ ] **Step 3: Implement scene assembly and the body mesh**

Add `create_fish_species.py` with a `--` argument parser, `sys.path` insertion for `fish_specs`/`fish_geometry`, a scene reset, material creation (flat images), body loft, fins (dorsal, caudal, anal, pectoral L/R, pelvic L/R), gill plates, barbels, eye globes and corneas. Join meshes by material but keep `DorsalFin` as its own object sharing `FishFin`, so the validator's named-axis check can see a dorsal membrane; join the eye pieces into an object named `FishEye`. On the low LOD, replace the globe and cornea with flat `EyeDecal.L/R` discs named `FishEye` and using `FishBody` (the eye is painted into the albedo). Run `mesh.validate()` and recalculate normals, enable smooth shading.

- [ ] **Step 4: Implement the armature and weights**

Create the Task 2 bones with `Root` as parent. Weight the body along `Head` → `Spine.01` → `Spine.02` → `Spine.03` → `Tail.01` → `Tail.02` with smoothstep blends; weight each fin to its bone with a root blend; weight eyes/corneas to `Head`, jaws to `Jaw`, gill plates to `Gill.L/R`. Assert every vertex group sums to 1 and every deform bone has at least one weighted vertex.

- [ ] **Step 5: Implement the Swim action and export**

One action `Swim`, frames 1–49 at 24 fps, `phase = tau * (frame - 1) / 48`, identical first and last keys. Rotate the spine chain and tail with tailward-increasing amplitude; flutter pectorals, pelvic, dorsal and anal; pulse gills and jaw. Export with the precedent flags (`export_animation_mode='ACTIONS'`, `export_merge_animation='NONE'`, `export_force_sampling=False`, `export_frame_range=False`, `export_anim_slide_to_zero=True`, `export_optimize_animation_keep_anim_armature=False`, `export_yup=True`, `export_skins=True`, `use_selection=True`). Write the report.

- [ ] **Step 6: Run the generator and the test**

Run: `& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/blender/create_fish_species.py -- --species arulius-barb --flat`
Then: `python -B tools/assets/test_fish_assets.py`
Expected: PASS for all three LODs.

- [ ] **Step 7: Commit**

```bash
git add tools/blender/create_fish_species.py tools/assets/test_fish_assets.py public/models/fish/arulius-barb artifacts/fish-production
git commit -m "feat(assets): generate Arulius barb LODs"
```

---

### Task 5: Texture the Arulius and add preview renders

**Files:**
- Create: `tools/blender/fish_textures.py`
- Modify: `tools/blender/create_fish_species.py`
- Modify: `tools/assets/test_fish_assets.py`
- Output: updated Arulius GLBs and `artifacts/fish-production/review/arulius-*.png`

**Interfaces:**
- Produces `body_albedo(spec, variant, size)`, `body_normal(spec, size)`, `body_orm(spec, size)`, `eye_albedo(variant, size=256)` returning packed `bpy.types.Image`.
- Maps: Arulius body albedo 1024 JPEG, normal 1024 PNG, roughness/ORM 512 PNG, eye 256 PNG; low LOD body albedo 512 JPEG, normal 512 PNG, no ORM.
- Fin materials use a flat tint plus geometric ray ridges, no fin texture, to stay inside the texture budget.

- [ ] **Step 1: Extend the asset test with image and memory checks**

For the Arulius high/low files, locate `FishBody` in `facts["materials"]`, read its `maps` indices, and assert the colour image is 1024/512, the normal is 1024/512, and high has a roughness map while low does not. Add `texture_bytes(facts) = sum(w*h*4 for image in facts["images"]) * 4/3`, and assert Arulius high + low ≤ 22 MiB so the room for danio is provable.

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -B tools/assets/test_fish_assets.py`
Expected: FAIL, flat 64 px images and no normal/roughness maps.

- [ ] **Step 3: Implement UV-aware texture generation**

Paint a body albedo from `profile`: silver-olive base, darker dorsal gradient, three Arulius flank blotches at x ≈ −0.5, 0.05 and 0.55, gill shading, lateral-line hint, fin-base darkening. Build a scale height field with a staggered cell pattern plus fin-ray ridges where UV islands allow; convert it to a tangent-space normal map and an ORM map (R = cavity, G = roughness 0.35–0.55, B = 0). Paint the eye at 256 px: black pupil, amber iris ring, radial fibres.

- [ ] **Step 4: Wire materials and re-export**

Assign body albedo/normal/ORM, eye albedo, transparent fin material (`BLEND`, alpha 0.82, roughness 0.35, double-sided) and clearcoat cornea. Export high/mid/low with the LOD-specific image sets; save source maps under `artifacts/fish-production/textures/arulius-barb/`.

- [ ] **Step 5: Run the tests and the generator**

Run the Blender command from Task 4 (without `--flat`), then `python -B tools/assets/test_fish_assets.py`.
Expected: PASS, including image dimensions and texture memory.

- [ ] **Step 6: Render the review set**

Add a `--render` path that adds a camera and three-point lighting after export (never selected for the GLB) and renders with EEVEE at 900×650: side, three-quarter, top, and an eye close-up into `artifacts/fish-production/review/`.

- [ ] **Step 7: Commit**

```bash
git add tools/blender/fish_textures.py tools/blender/create_fish_species.py tools/assets/test_fish_assets.py public/models/fish/arulius-barb artifacts/fish-production
git commit -m "feat(assets): texture and validate Arulius barb"
```

---

### Task 6: Arulius visual proof (user checkpoint)

**Files:**
- Review: `artifacts/fish-production/review/arulius-*.png`
- Modify only if fixes are needed: `tools/blender/fish_textures.py`, `tools/blender/fish_specs.py`, `tools/blender/create_fish_species.py`

**Interfaces:**
- Consumes the Task 5 renders and the validated Arulius high/mid/low GLBs.
- Produces either an approved proof or a defect list with fixes.

- [ ] **Step 1: Inspect the renders**

Read the four PNGs. Check silhouette (deep body, forked tail, filamentous dorsal, barbels), three blotches, eye (pupil, iris, corneal highlight), translucent fins with visible rays, and scale detail.

- [ ] **Step 2: Fix and re-render if anything is wrong**

Adjust profiles, fin roots/tips, UV islands or palette values in the specs, then rerun Task 4/5 commands. Re-inspect. Do not add new materials or exceed the LOD caps.

- [ ] **Step 3: Present the proof and stop**

Show the four image paths and the validator facts for all three LODs. Ask for approval. **Do not start Task 7 until the user approves the Arulius proof.**

- [ ] **Step 4: Commit any fixes**

If files changed, commit them with `fix(assets): refine Arulius proof`; otherwise record the approval in `artifacts/fish-production/README.md` and continue.

---

### Task 7: Build all five danio variants and their LODs

**Files:**
- Modify: `tools/blender/create_fish_species.py`
- Modify: `tools/blender/fish_textures.py`
- Modify: `tools/assets/test_fish_assets.py`
- Output: 15 GLBs under `public/models/fish/zebra-danio/`
- Output: `artifacts/fish-production/review/danio-contact-sheet.png`

**Interfaces:**
- Consumes Task 4/5 builder and texture functions.
- Produces `zebra-danio-<variant>-<lod>.glb` for the five variant slugs plus `zebra-danio-<lod>.glb` for the standard wild-type, all with `Swim` and the Task 2 rig.
- Variant differences are albedo, fin tint and iris colour only; geometry, UVs and rig are shared per LOD.

- [ ] **Step 1: Extend the asset test to all 18 files**

Parameterise the Task 4 test over `SPECIES × LODS`, use each species/LOD cap, assert one skin, the material cap, the axis, clip and bones, and the body colour/normal dimensions. Assert the summed HIGH texture memory ≤ 56 MiB, LOW ≤ 18 MiB, and the summed HIGH GLB bytes ≤ 6,000,000. Assert each variant's body colour image `sha256` differs from the standard variant so the five files are not accidental copies.

- [ ] **Step 2: Run it to verify it fails**

Run: `python -B tools/assets/test_fish_assets.py`
Expected: FAIL for the 15 missing danio files.

- [ ] **Step 3: Implement the danio palette and variant loop**

Use the pinned palettes from Task 3. Paint five navy horizontal stripes at fixed dorsoventral bands, a pale belly, a dark pre-orbital bar, and fin membranes tinted per variant. Build geometry once per LOD, swap the body/eye/fin tint images per variant, and export each variant before moving to the next LOD.

- [ ] **Step 4: Generate and validate**

Run: `& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python tools/blender/create_fish_species.py -- --species zebra-danio`
Then: `python -B tools/assets/test_fish_assets.py`
Expected: PASS for all 18 files.

- [ ] **Step 5: Render the contact sheet**

Render one three-quarter view per variant at high LOD, a top view of the standard variant, and one low-LOD view to confirm the painted eye and stripes survive; compose the high views into `artifacts/fish-production/review/danio-contact-sheet.png`.

- [ ] **Step 6: Inspect and fix**

Read the contact sheet. Confirm the five variants are distinguishable (silver/blue, wild, gold, albino, fluorescent green), stripes run nose-to-tail, and the low LOD still reads. Fix palettes or stripe bands and re-export if needed.

- [ ] **Step 7: Verify deterministic regeneration**

Hash all 18 GLBs with `Get-ChildItem public/models/fish -Recurse -Filter *.glb | Get-FileHash | Select-Object Path,Hash` into `artifacts/fish-production/hashes-before.txt`, rerun both species generator commands, hash again into `hashes-after.txt`, and compare. Expected: identical hashes. If bytes differ, remove the nondeterminism (image save order, unordered dict iteration, timestamps) before committing.

- [ ] **Step 8: Commit**

```bash
git add tools/blender/create_fish_species.py tools/blender/fish_textures.py tools/assets/test_fish_assets.py public/models/fish/zebra-danio artifacts/fish-production
git commit -m "feat(assets): generate zebra danio variants and LODs"
```

---

### Task 8: Serve the correct LOD by quality

**Files:**
- Modify: `src/experience/species.ts`
- Modify: `src/experience/species.test.ts`
- Modify: `src/components/Experience.tsx`

**Interfaces:**
- Produces `SpeciesLodUrls = { high: string; mid?: string; low: string }`, `SpeciesInput = { modelUrl: string; fishIds: string[]; label?: string; lodUrls?: SpeciesLodUrls }`, and `SpeciesEntry.lodUrls?: SpeciesLodUrls`.
- Produces `modelUrlForQuality(entry: { modelUrl: string; lodUrls?: SpeciesLodUrls }, quality: EffectiveQuality): string`; HIGH → `lodUrls.high`, LOW → `lodUrls.low`, fallback → `entry.modelUrl`.
- `resolveSpecies` accepts `SpeciesInput[]` and preserves `lodUrls`; the `Experience` prop uses `SpeciesInput[]`.
- `SpeciesEntry.modelUrl` remains the HIGH URL for every rebuilt species, so existing consumers still work.
- `Experience` passes `modelUrlForQuality(s, effectiveQuality)` for each species to `SceneViewport`; `SceneViewport` and `FishSchool` are unchanged by this task.

- [ ] **Step 1: Write the failing species tests**

```typescript
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SPECIES, modelUrlForQuality } from "./species";

it("selects high/low by quality and falls back without lodUrls", () => {
  const entry = { modelUrl: "/models/fallback.glb",
    lodUrls: { high: "/models/fish/a-high.glb", mid: "/models/fish/a-mid.glb", low: "/models/fish/a-low.glb" } };
  expect(modelUrlForQuality(entry, "HIGH")).toBe(entry.lodUrls.high);
  expect(modelUrlForQuality(entry, "LOW")).toBe(entry.lodUrls.low);
  expect(modelUrlForQuality({ modelUrl: "/models/fallback.glb" }, "HIGH")).toBe("/models/fallback.glb");
});

it("keeps every declared LOD file on disk", () => {
  for (const entry of DEFAULT_SPECIES) {
    for (const url of Object.values(entry.lodUrls ?? {})) {
      expect(existsSync(join(process.cwd(), "public", url.replace(/^\//, ""))), url).toBe(true);
    }
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/experience/species.test.ts`
Expected: FAIL, `modelUrlForQuality` is not exported and the default roster has no LOD URLs.

- [ ] **Step 3: Implement the resolver and roster URLs**

Add the type/function, preserve `lodUrls` in `resolveSpecies`, update the `Experience` prop to `SpeciesInput[]`, and update all six rebuilt entries to the new paths. Keep the polar parrot entry without `lodUrls`. In `Experience.tsx`, resolve each species URL with `effectiveQuality` before passing it to `SceneViewport`.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npx vitest run src/experience/species.test.ts` and `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/experience/species.ts src/experience/species.test.ts src/components/Experience.tsx
git commit -m "feat(scene): select fish LODs by quality"
```

---

### Task 9: Show six native fish at LOW

**Files:**
- Modify: `src/experience/quality.ts`
- Modify: `src/experience/quality.test.ts`

**Interfaces:**
- Produces private `LOW_FISH_IDS = ["fish-5", "fish-7", "fish-8", "fish-10", "fish-11", "fish-12"]`.
- `visibleFishIds("LOW", selectedId)` returns those six; any selected ID outside the set replaces the final slot; HIGH remains all 13.
- Returns a fresh array on every call.

- [ ] **Step 1: Update the failing tests**

Replace the LOW expectations with the native six, update the fish-9 replacement expectation to `["fish-5", "fish-7", "fish-8", "fish-10", "fish-11", "fish-9"]`, and add cases for `fish-0` and `fish-6` replacing `fish-12`. Keep the existing every-ID retention test.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/experience/quality.test.ts`
Expected: FAIL, LOW still returns fish-0…5.

- [ ] **Step 3: Implement the roster**

Use `const ids = quality === "LOW" ? [...LOW_FISH_IDS] : [...FISH_IDS];` and leave the replacement rule unchanged.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/experience/quality.test.ts`
Expected: PASS, including selection retention for all 13 IDs.

- [ ] **Step 5: Commit**

```bash
git add src/experience/quality.ts src/experience/quality.test.ts
git commit -m "feat(scene): show native fish at low quality"
```

---

### Task 10: Stabilise translucent fin materials

**Files:**
- Create: `src/components/scene/fish/fishMaterials.ts`
- Create: `src/components/scene/fish/fishMaterials.test.ts`
- Modify: `src/components/scene/fish/FishSchool.tsx`

**Interfaces:**
- Produces `prepareFishMaterials(root: Object3D): void`.
- For every mesh material whose name matches `/fin/i` and which is transparent, set `depthWrite = true` and `alphaTest = 0.05`; leave all other materials unchanged.
- `FishSchool` calls it once per loaded scene before reporting ready.

- [ ] **Step 1: Write the failing helper test**

```typescript
import { BufferGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { prepareFishMaterials } from "./fishMaterials";

it("writes depth for translucent fins only", () => {
  const fin = new MeshStandardMaterial({ name: "FishFin", transparent: true });
  const body = new MeshStandardMaterial({ name: "FishBody" });
  const root = new Group();
  root.add(new Mesh(new BufferGeometry(), fin), new Mesh(new BufferGeometry(), body));
  prepareFishMaterials(root);
  expect(fin.depthWrite).toBe(true);
  expect(fin.alphaTest).toBe(0.05);
  expect(body.alphaTest).toBe(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/scene/fish/fishMaterials.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 3: Implement and wire**

Traverse the scene, handle array and single materials, and skip non-mesh nodes. In `FishSchool`, import the helper and add `useEffect(() => prepareFishMaterials(scene), [scene])` before the existing ready-report effect.

- [ ] **Step 4: Run the helper and school tests**

Run: `npx vitest run src/components/scene/fish/fishMaterials.test.ts src/components/scene/fish/FishSchool.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/fish/fishMaterials.ts src/components/scene/fish/fishMaterials.test.ts src/components/scene/fish/FishSchool.tsx
git commit -m "fix(scene): stabilize translucent fish fins"
```

---

### Task 11: Browser and performance validation

**Files:**
- Create: `tests/e2e/fish-production.spec.ts`
- Output: `artifacts/fish-production/browser-report.json`
- Output: `artifacts/fish-production/desktop-map.png`, `desktop-high.png`, `desktop-follow.png`, `mobile-low.png`

**Interfaces:**
- Consumes the rebuilt GLBs, Task 8 LOD resolution and Task 9 roster.
- Produces a desktop HIGH screenshot, a 390×844 LOW screenshot, a 6-option LOW roster assertion, a no-console-errors assertion, and a 120-frame timing sample.

- [ ] **Step 1: Write the browser test**

Open `/` and screenshot the map-entry state. Enter the water, wait for `data-phase="exploring"`, pause, screenshot desktop HIGH. Follow one fish by scanning the canvas for a hover label and clicking it (the pattern in `tests/e2e/visual.spec.ts`), screenshot `desktop-follow.png`, then return to water. For the touch project, select LOW, enter, assert the fish selector has exactly 6 options and includes `Zebra Danio`, `Golden Zebra Danio`, `Wild Zebra Danio` and `Arulius Barb`, pause, screenshot. Collect `pageerror` and console errors; assert none. Sample 120 `requestAnimationFrame` deltas and write median/p95 to the JSON artifact; do not fail on timing under SwiftShader.

- [ ] **Step 2: Build and run the test**

Run: `npm run build`
Then: `npx playwright test tests/e2e/fish-production.spec.ts`
Expected: PASS and both PNGs written.

- [ ] **Step 3: Inspect the screenshots**

Read all four PNGs. Check that the eye reads, stripes/blotches are not washed out, fins are translucent and not black cards, no fish is a white blob, and the followed fish still shows its detail at close range. If the eye or fins fail, fix the material/texture in Task 5/7 and rerun.

- [ ] **Step 4: Record the budget report**

Write `browser-report.json` with per-file triangle counts from the asset tests, the six-species HIGH/LOW texture totals, the payload total and the timing sample. Include the whole-scene triangle figure with the polar parrot shown separately.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/fish-production.spec.ts artifacts/fish-production
git commit -m "test(scene): add fish production browser checks"
```

---

### Task 12: Cut over, document, and run the full suite

**Files:**
- Delete: `public/models/arulius-barb.glb`, `public/models/zebra-danio.glb`, `public/models/zebra-danio-glofish-green.glb`, `public/models/zebra-danio-golden.glb`, `public/models/zebra-danio-wild.glb`, `public/models/zebra-danio-albino.glb`
- Modify: `README.md`

**Interfaces:**
- Consumes every prior task.
- Produces a repository with only the new fish paths referenced and no stale top-level fish GLBs.

- [ ] **Step 1: Remove the old fish GLBs**

Use `git rm` on exactly the six files above. Do not touch `polar-parrot-study-v1*.glb`, `pipeline-test.glb`, or the user's map files.

- [ ] **Step 2: Verify no references remain**

Run: `rg "/models/(arulius-barb|zebra-danio(-[a-z-]+)?)\.glb" src tests content README.md -g '!*.glb'`
Expected: no matches; the new paths are under `/models/fish/`.

- [ ] **Step 3: Update README asset notes**

Replace the stale "ten active v1 fish / 418K triangles" line with the measured source triangle total for 13 fish, state that the polar parrot accounts for 208,860, and list the new fish paths and LOD policy. Keep the illustrative/scientific disclaimer.

- [ ] **Step 4: Run the complete suite**

Run each and confirm success:
- `python -B tools/assets/test_validate_fish_glb.py`
- `python -B tools/assets/test_fish_budgets.py`
- `python -B tools/assets/test_fish_assets.py`
- `python -B tools/blender/test_fish_specs.py`
- `python -B tools/blender/test_fish_geometry.py`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run test:e2e`

- [ ] **Step 5: Commit the cutover**

```bash
git add -A public/models README.md
git commit -m "chore(assets): cut over fish models and document budgets"
```

---

## Handoff

After Task 12, report the validator facts for all 18 GLBs, the HIGH/LOW texture and triangle totals, the browser screenshots, and any deviation from the spec. Do not claim completion without the full suite output.
