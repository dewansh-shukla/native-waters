# Fish Locomotion and Fin Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the six native fish flex and twist their fins, decouple gill rate from tail beat, and respond to speed and turning the way real cyprinids do.

**Architecture:** Seven detail bones extend the existing 17-bone rig; fin skinning becomes a span/row ramp so fins bend along their rays. One baked `Swim` clip carries the body wave and the caudal torsion. A thin procedural layer in three.js adds speed-dependent wave gain, an independent gill oscillator, tuck/flare and turn C-bend after `mixer.update()`.

**Tech Stack:** Blender 5.2 Python (`bpy`), Python `unittest`, three.js 0.186, React Three Fiber, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-fish-locomotion-design.md`

## Global Constraints

- Six species only: `arulius-barb`, `zebra-danio`, `zebra-danio-wild`, `zebra-danio-golden`, `zebra-danio-albino`, `zebra-danio-glowfish-green`.
- Three LODs per species, 18 GLB files under `public/models/fish/`.
- Byte caps per file: HIGH 1,800,000; MID 1,000,000; LOW 250,000 (`tools/assets/fish_budgets.py`).
- Triangle caps: arulius 12,000 / 4,500 / 1,500; danio 10,000 / 4,000 / 1,400.
- Primitive caps: HIGH 6, MID 6, LOW 4.
- **Exactly one animation clip per GLB, named `Swim`.** `validate_fish_glb.py:258` asserts an exact clip set.
- The 16 `REQUIRED_BONES` stay present and weighted; the 7 new bones are additive.
- Max skin influences per vertex: 4 (`JOINTS_0` is vec4).
- Blender: `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, always `--background`.
- Python checks: `python3 -B -m unittest discover -s tools/assets -p 'test_*.py'` and `-s tools/blender`.
- TS gates: `npm run typecheck`, `npm run lint`, `npm test` (250 tests currently pass).
- Do not touch the polar parrot fixture, `content/fixtures/pipeline-test.json`, or the map tools.

## Review Focus

- **A GLB built before this change** (no detail bones) must not throw in the app; `driveFins` skips bones that are missing. Covered in Task 5.
- **Paused playback** must not mutate bones, or the frozen frame drifts. Covered in Task 6.
- **LOW LOD fins**, with only 3 rings and 5 roots, must still reach every detail bone or `assert_weights` fails. Covered in Task 1 and Task 2.
- **A fish at zero speed** must hold its stroke rather than divide by zero. Covered in Task 6.
- **Fin twist too strong** reads as a flapping ribbon rather than a foil. Covered by the numeric twist check in Task 4 plus the render step in Task 7.

---

### Task 1: Pure rig geometry module

**Files:**
- Create: `tools/blender/fish_rig.py`
- Create: `tools/blender/test_fish_rig.py`
- Reference: `tools/blender/fish_specs.py` (`MEASUREMENTS`, `SPECIES`, `profile`)

**Interfaces:**
- Consumes: `profile(slug, t) -> (half_height, half_width, centre)`, `SPECIES`, `MEASUREMENTS`.
- Produces:
  - `DETAIL_BONES: tuple[str, ...]` — the 7 new bone names.
  - `bone_specs(spec) -> tuple[tuple[str, tuple[float,float,float], tuple[float,float,float], str | None, bool], ...]` — the full 24-bone tuple in the same shape `make_armature` already consumes.
  - `body_attachment(span: float) -> float` — weight kept by the body chain.
  - `span_weights(span: float) -> tuple[float, float]` — `(root, tip)` for a two-bone fin chain.
  - `dorsal_chain_weights(u: float) -> tuple[float, float, float]` — `(Dorsal, Dorsal.Mid, Dorsal.Tip)`.
  - `caudal_lobe_weights(z_frac: float) -> tuple[float, float]` — `(wU, wL)`.

- [ ] **Step 1: Write the failing test**

```python
"""Rig placement and skin-weight math, free of bpy."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_rig import (DETAIL_BONES, body_attachment, bone_specs,
                                    caudal_lobe_weights, dorsal_chain_weights, span_weights)  # noqa: E402
from tools.blender.fish_specs import SPECIES  # noqa: E402


class RigTests(unittest.TestCase):
    def test_every_species_has_24_bones_and_seven_new_ones(self):
        for slug in SPECIES:
            specs = bone_specs(SPECIES[slug])
            names = [item[0] for item in specs]
            self.assertEqual(len(names), 24, slug)
            self.assertEqual(len(set(names)), 24, slug)
            for bone in DETAIL_BONES:
                self.assertIn(bone, names, slug)

    def test_detail_bones_are_children_of_their_base_fin(self):
        specs = {item[0]: item for item in bone_specs(SPECIES["arulius-barb"])}
        self.assertEqual(specs["TailFin.U"][3], "TailFin")
        self.assertEqual(specs["Pectoral.L.Tip"][3], "Pectoral.L")
        self.assertEqual(specs["Dorsal.Mid"][3], "Dorsal")
        self.assertEqual(specs["Dorsal.Tip"][3], "Dorsal.Mid")

    def test_caudal_lobes_sit_above_and_below_the_axis(self):
        specs = {item[0]: item for item in bone_specs(SPECIES["arulius-barb"])}
        self.assertGreater(specs["TailFin.U"][1][2], 0.0)
        self.assertLess(specs["TailFin.L"][1][2], 0.0)

    def test_body_attachment_holds_only_the_root_band(self):
        self.assertAlmostEqual(body_attachment(0.0), 1.0)
        self.assertAlmostEqual(body_attachment(0.25), 0.0)
        self.assertAlmostEqual(body_attachment(1.0), 0.0)

    def test_span_weights_partition_unity(self):
        for span in (0.0, 0.33, 0.5, 0.75, 1.0):
            root, tip = span_weights(span)
            self.assertAlmostEqual(root + tip, 1.0)
            self.assertGreater(tip, 0.0)

    def test_low_lod_rings_reach_the_tip_bone(self):
        # LOW has three rings along the ray, so span is 0.0, 0.5 or 1.0.
        self.assertGreater(span_weights(1.0)[1], 0.99)

    def test_dorsal_chain_partitions_unity_and_reaches_every_segment(self):
        for u in (0.0, 0.25, 0.5, 0.75, 1.0):
            weights = dorsal_chain_weights(u)
            self.assertAlmostEqual(sum(weights), 1.0)
        self.assertGreater(dorsal_chain_weights(0.0)[0], 0.99)
        self.assertGreater(dorsal_chain_weights(1.0)[2], 0.99)
        self.assertGreater(dorsal_chain_weights(0.5)[1], 0.99)

    def test_caudal_lobe_weights_are_a_smooth_split(self):
        self.assertAlmostEqual(caudal_lobe_weights(0.0)[0], 0.5)
        self.assertAlmostEqual(caudal_lobe_weights(1.0)[0], 1.0)
        self.assertAlmostEqual(caudal_lobe_weights(-1.0)[0], 0.0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -B -m unittest tools.blender.test_fish_rig -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'tools.blender.fish_rig'`

- [ ] **Step 3: Implement `tools/blender/fish_rig.py`**

Move `BONE_NAMES` and `BONE_SPECS` out of `create_fish_species.py` into this module. Keep the existing 17 entries byte-identical for the 16 deform bones and `Root`. Derive the 7 detail bones from measurements:

```python
DETAIL_BONES = ("TailFin.U", "TailFin.L", "Pectoral.L.Tip", "Pectoral.R.Tip",
                "Dorsal.Mid", "Dorsal.Tip", "AnalFin.Tip")
```

Placement rules (per species `spec`):

- `bl = spec.body_length`, `rear_x = -1.0 + bl`
- `caudal_len = bl * MEASUREMENTS[spec.slug].get("caudal_length_SL", 0.15)`
- `half_height, _, centre = profile(spec.slug, 1.0)`; `base = max(0.02, half_height * 0.98)`; `spread = base * 2.5`
- `TailFin.U`: head `(rear_x + 0.40 * caudal_len, 0, centre + 0.50 * spread)`, tail `(rear_x + caudal_len, 0, centre + 0.85 * spread)`; `TailFin.L` mirrors z. Both parent `TailFin`, deform.
- `Pectoral.L.Tip`: `lerp(Pectoral.L.head, Pectoral.L.tail, 0.55)` to `lerp(..., 1.10)`, parent `Pectoral.L`. Mirror for R.
- `Dorsal.Mid`: `lerp(Dorsal.head, Dorsal.tail, 0.34)` to `lerp(..., 0.67)`, parent `Dorsal`, `use_connect=True`.
- `Dorsal.Tip`: `lerp(Dorsal.head, Dorsal.tail, 0.67)` to `lerp(..., 1.00)`, parent `Dorsal.Mid`, `use_connect=True`.
- `AnalFin.Tip`: `lerp(AnalFin.head, AnalFin.tail, 0.50)` to `lerp(..., 1.00)`, parent `AnalFin`, `use_connect=True`.

Weight functions:

- `body_attachment(span) = clamp(1 - span / 0.25, 0, 1)`
- `span_weights(span) = (1 - span, span)`
- `dorsal_chain_weights(u)`: `front = clamp(1 - 2u, 0, 1)`, `rear = clamp(2u - 1, 0, 1)`, `mid = 1 - front - rear`
- `caudal_lobe_weights(z_frac) = ((z_frac + 1) / 2, (1 - z_frac) / 2)`

- [ ] **Step 4: Run test to verify it passes**

Run: `python -B -m unittest tools.blender.test_fish_rig -v`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add tools/blender/fish_rig.py tools/blender/test_fish_rig.py
git commit -m "feat(assets): pure fish rig placement and skin-weight math"
```

---

### Task 2: Rig v2 and three-way fin skinning

**Files:**
- Modify: `tools/blender/create_fish_species.py` (imports, `BONE_NAMES`/`BONE_SPECS`, `make_armature`, `weights_for`)
- Test: `tools/blender/test_fish_rig.py` (already covers the math)

**Interfaces:**
- Consumes: `bone_specs(spec)`, `span_weights(span)`, `dorsal_chain_weights(u)`, `caudal_lobe_weights(z_frac)`, `body_attachment(span)` from Task 1.
- Produces: exported GLBs whose skin has 24 joints, 7 of them new; `weights_for` returns dicts with at most 4 entries.

- [ ] **Step 1: Replace the module constants**

In `create_fish_species.py`, delete the local `BONE_NAMES` and `BONE_SPECS` and import from `fish_rig`:

```python
from tools.blender.fish_rig import BONE_NAMES, bone_specs
```

`make_armature` becomes `self.bone_specs = bone_specs(spec)` and iterates that. `BONE_NAMES` keeps its meaning (the 23 deform bones, `Root` excluded).

- [ ] **Step 2: Rewrite `weights_for` for fins**

Replace the tail of `weights_for` so fin parts use the ramps. Required behaviour:

- Compute `span` per vertex as today via `projection_spans`.
- Compute `u` for the dorsal and anal fins from the row index: `u = row / (rows - 1)`, where `row` comes from the projection onto the root line rather than the vertex index, so the split follows the geometry.
- Body weights: `chain_weights(root_x)` scaled by `body_attachment(span)`.
- Fin weights: the remainder, distributed by `span_weights` or `dorsal_chain_weights`.
- Caudal: distribute the fin share between `TailFin`, `TailFin.U` and `TailFin.L` using `caudal_lobe_weights(z_frac)`, where `z_frac = (vertex.z - centre) / spread` clamped to `[-1, 1]`.
- Pectoral: `Pectoral.L`/`.R` plus `.Tip` via `span_weights`.
- Pelvic fins keep the existing two-bone behaviour.
- Keep only the 4 largest influences and renormalise when a vertex exceeds 4.

- [ ] **Step 3: Update `assert_weights` for the new bone set**

`assert_weights` must fail if any bone in `BONE_NAMES` carries no weight, and must also fail if any vertex has more than 4 influences:

```python
if len([g for g in vertex.groups if g.weight > 0]) > 4:
    raise ValueError("more than four influences on %s vertex %d" % (obj.name, vertex.index))
```

- [ ] **Step 4: Export one species and inspect the report**

Run:

```bash
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background \
  --python tools/blender/create_fish_species.py -- --species arulius-barb \
  --out public/models/fish --report artifacts/fish-production
```

Expected: the export succeeds, `assert_weights` does not raise, and
`artifacts/fish-production/arulius-barb-high.json` lists 24 bone names.

- [ ] **Step 5: Validate the exported GLB**

Run: `python -B tools/assets/validate_fish_glb.py public/models/fish/arulius-barb/arulius-barb-high.glb --clip Swim --bytes 1800000 --bones Head --bones TailFin --bones TailFin.U`
Expected: exit 0, `ok`

- [ ] **Step 6: Commit**

```bash
git add tools/blender/create_fish_species.py public/models/fish/arulius-barb artifacts/fish-production
git commit -m "feat(assets): 24-bone rig with three-way fin skinning"
```

---

### Task 3: Caudal torsion and fin detail in the bake

**Files:**
- Modify: `tools/blender/create_fish_species.py` (`make_action`)

**Interfaces:**
- Consumes: the rig from Task 2.
- Produces: a `Swim` action with rotation channels on all 7 detail bones.

- [ ] **Step 1: Add the fin oscillators to `make_action`**

Keep the existing body, gill and pectoral values unchanged. Add, inside the same frame loop, using `tail` (the 3 Hz phase) and `scull` (the 1 Hz phase):

- `TailFin`: add roll about local Y, `0.12 * sin(tail + pi/2)`, alongside the existing yaw.
- `TailFin.U`/`.L`: roll `0.20 * sin(tail + pi/2 - tau * 0.06)`, yaw `±0.05 * sin(tail + pi)` with opposite signs on the two lobes.
- `Pectoral.L.Tip`/`.R.Tip`: roll `0.10 * sin(scull + pi/2 + side_offset)`.
- `Dorsal.Mid`: yaw `0.014 * sin(tail - dorsal_phase - tau * 0.05)`; `Dorsal.Tip`: yaw `0.010 * sin(tail - dorsal_phase - tau * 0.10)`.
- `AnalFin.Tip`: yaw `0.012 * sin(tail - anal_phase - tau * 0.05)`.

`rotation_euler` index 1 is roll (local Y) and index 2 is yaw, matching the existing convention.

- [ ] **Step 2: Confirm every bone has keys**

Add to `make_action`, after keyframing, a check that every name in `BONE_NAMES` appears in the action's groups, raising `ValueError("action missing bone: " + name)` otherwise.

- [ ] **Step 3: Re-export and confirm the channels exist**

Run the Task 2 Step 4 command, then inspect the report:

```bash
python -c "import json; r=json.load(open('artifacts/fish-production/arulius-barb-high.json')); print(len(r['bones']), sorted(b for b in r['bones'] if '.' in b))"
```

Expected: prints `24` and a sorted list containing `AnalFin.Tip`, `Dorsal.Mid`, `Dorsal.Tip`, `Gill.L`, `Gill.R`, `Pectoral.L.Tip`, `Pectoral.R.Tip`, `Spine.01`, `Spine.02`, `Spine.03`, `Tail.01`, `Tail.02`, `TailFin.L`, `TailFin.U`.

The twist itself is asserted from GLB bytes in Task 4.

- [ ] **Step 4: Commit**

```bash
git add tools/blender/create_fish_species.py public/models/fish/arulius-barb artifacts/fish-production
git commit -m "feat(assets): caudal torsion and fin detail in the swim bake"
```

---

### Task 4: Fin check and caudal bend regression

**Files:**
- Create: `tools/assets/check_fins.py`
- Create: `tools/assets/test_check_fins.py`

**Interfaces:**
- Consumes: an exported GLB path.
- Produces: `check(path) -> list[str]` returning failures (empty when clean); a `__main__` that prints `ok` or the failures and exits non-zero.

- [ ] **Step 1: Write the failing test**

Build a tiny GLB fixture in the test by copying an exported HIGH file and mutating its JSON chunk the way `test_validate_fish_glb.py` already does. The test asserts:

```python
def test_real_asset_passes(self):
    self.assertEqual(check(HIGH_GLB), [])

def test_missing_detail_bone_is_reported(self):
    broken = self.copy_without_node("TailFin.U")
    self.assertTrue(any("TailFin.U" in failure for failure in check(broken)))

def test_unweighted_detail_bone_is_reported(self):
    broken = self.copy_with_weights_moved_off("TailFin.L")
    self.assertTrue(any("TailFin.L" in failure for failure in check(broken)))

def test_flat_twist_is_reported(self):
    broken = self.copy_with_flat_track("TailFin.U.quaternion")
    self.assertTrue(any("twist" in failure.lower() for failure in check(broken)))

def test_over_four_influences_is_reported(self):
    broken = self.copy_with_fifth_influence()
    self.assertTrue(any("influence" in failure.lower() for failure in check(broken)))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -B -m unittest tools.assets.test_check_fins -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'tools.assets.check_fins'`

- [ ] **Step 3: Implement `tools/assets/check_fins.py`**

Reuse `read_glb` from `check_swim.py` (import it rather than duplicating the parser). Assertions:

1. Every name in `DETAIL_BONES` is a node and a skin joint.
2. Every detail bone has at least one vertex with weight `> 0.001` in `WEIGHTS_0`.
3. No vertex lists more than 4 joints with weight `> 0`.
4. Caudal fin vertices reference at least two distinct bones among `TailFin`, `TailFin.U`, `TailFin.L`.
5. The `TailFin.U` quaternion track is non-constant, and the sign of its Y component changes at least twice across the sampled keys (a twist that never reverses is a rigid fin).

- [ ] **Step 4: Run test to verify it passes**

Run: `python -B -m unittest tools.assets.test_check_fins -v`
Expected: PASS

- [ ] **Step 5: Add the Blender bend regression**

Add `tools/blender/check_caudal_bend.py`, run inside Blender:

```python
"""Assert the caudal fin bends rather than rotating rigidly."""
# Load the GLB, set frame 7, evaluate the depsgraph, then compare the lateral
# displacement of the fin's trailing edge against the displacement predicted by
# rotating the root by the same angle. The measured displacement must exceed the
# rigid prediction by at least 5 percent.
```

Run it via Blender `--background --python`; expected: prints `ok`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add tools/assets/check_fins.py tools/assets/test_check_fins.py tools/blender/check_caudal_bend.py
git commit -m "feat(assets): validate fin rig, weights and caudal twist"
```

---

### Task 5: `finMotion` module and tests

**Files:**
- Create: `src/components/scene/fish/finMotion.ts`
- Create: `src/components/scene/fish/finMotion.test.ts`

**Interfaces:**
- Consumes: `beatFrequency(speed, length)` from `./motion`.
- Produces:
  - `waveGain(blps: number): number`
  - `pectoralTuck(blps: number): number`
  - `pectoralRowHz(blps: number): number`
  - `gillHz(blps: number): number`
  - `turnFlare(turnRate: number): number`
  - `bodyBend(turnRate: number): number`
  - `interface FinState { cycle: number; blps: number; turnRate: number; gillPhase: number }`
  - `driveFins(root: Object3D, state: FinState): void`

- [ ] **Step 1: Write the failing test**

```ts
import { Object3D, Quaternion } from "three";
import { describe, expect, it } from "vitest";
import { bodyBend, driveFins, gillHz, pectoralRowHz, pectoralTuck, turnFlare, waveGain } from "./finMotion";
import { beatFrequency } from "./motion";

describe("waveGain", () => {
  it("rises monotonically with speed and stays bounded", () => {
    expect(waveGain(1.6)).toBeGreaterThan(waveGain(0.7));
    for (const blps of [0, 0.7, 1.2, 1.7, 3, 10]) {
      expect(waveGain(blps)).toBeGreaterThanOrEqual(0.7);
      expect(waveGain(blps)).toBeLessThanOrEqual(1.25);
    }
  });
});

describe("gait", () => {
  it("tucks pectorals by cruise and rows them when slow", () => {
    expect(pectoralTuck(0.7)).toBeLessThan(0.2);
    expect(pectoralTuck(1.7)).toBeGreaterThan(0.7);
    expect(pectoralRowHz(1.7)).toBeLessThan(pectoralRowHz(0.7));
  });

  it("keeps gill rate independent of tail beat", () => {
    const gills = [gillHz(0.7), gillHz(1.7)];
    const beats = [beatFrequency(0.7 * 0.36, 0.36), beatFrequency(1.7 * 0.36, 0.36)];
    expect(Math.max(...gills)).toBeLessThan(Math.min(...beats));
    expect(Math.max(...gills) / Math.min(...gills)).toBeLessThan(2);
  });
});

describe("turn", () => {
  it("caps flare and bend symmetrically", () => {
    expect(turnFlare(100)).toBeLessThanOrEqual(0.35);
    expect(turnFlare(-100)).toBeGreaterThanOrEqual(-0.35);
    expect(bodyBend(100)).toBeLessThanOrEqual(0.16);
    expect(bodyBend(0)).toBe(0);
  });
});

describe("driveFins", () => {
  const build = () => {
    const root = new Object3D();
    for (const name of ["TailFin", "TailFin.U", "TailFin.L", "Gill.L", "Gill.R", "Dorsal", "Dorsal.Mid"]) {
      const bone = new Object3D();
      bone.name = name;
      root.add(bone);
    }
    return root;
  };

  it("writes gills and leaves an unrelated node alone", () => {
    const root = build();
    const unrelated = new Object3D();
    unrelated.name = "Body";
    root.add(unrelated);
    driveFins(root, { cycle: 0, blps: 1.2, turnRate: 0, gillPhase: 0.25 });
    const gill = root.getObjectByName("Gill.L")!;
    expect(gill.quaternion.equals(new Quaternion())).toBe(false);
    expect(unrelated.quaternion.equals(new Quaternion())).toBe(true);
  });

  it("does not throw when detail bones are missing from an older GLB", () => {
    const root = new Object3D();
    expect(() => driveFins(root, { cycle: 0.3, blps: 1.2, turnRate: 0.5, gillPhase: 0.1 })).not.toThrow();
  });

  it("is deterministic for the same state", () => {
    const a = build();
    const b = build();
    const state = { cycle: 0.4, blps: 1.1, turnRate: 0.2, gillPhase: 0.6 };
    driveFins(a, state);
    driveFins(b, state);
    for (const name of ["TailFin", "TailFin.U", "Gill.L"]) {
      expect(a.getObjectByName(name)!.quaternion.angleTo(b.getObjectByName(name)!.quaternion)).toBeLessThan(1e-6);
    }
  });

  it("holds a valid pose at zero speed", () => {
    const root = build();
    driveFins(root, { cycle: 0, blps: 0, turnRate: 0, gillPhase: 0 });
    for (const name of ["TailFin", "TailFin.U", "Gill.L"]) {
      const q = root.getObjectByName(name)!.quaternion;
      expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true);
      expect(Math.abs(q.length() - 1)).toBeLessThan(1e-6);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scene/fish/finMotion.test.ts`
Expected: FAIL, cannot resolve `./finMotion`

- [ ] **Step 3: Implement `src/components/scene/fish/finMotion.ts`**

Constants and shapes:

```ts
const TAU = Math.PI * 2;

export function waveGain(blps: number): number      // 0.75 -> 1.20 over 0.5..2.5 BL/s
export function pectoralTuck(blps: number): number  // 0 at 0.9 BL/s, 1 at 1.8 BL/s
export function pectoralRowHz(blps: number): number // 1.25 - 0.35 * tuck
export function gillHz(blps: number): number        // 1.1 -> 1.6 over 0.5..2.5 BL/s
export function turnFlare(turnRate: number): number // clamp(turnRate * 0.5, +/-0.35)
export function bodyBend(turnRate: number): number  // clamp(turnRate * 0.18, +/-0.16)
```

`driveFins(root, state)`:

1. Body wave bones `Spine.01`, `Spine.02`, `Spine.03`, `Tail.01`, `Tail.02`, `TailFin`: read the mixer pose, scale its Z (yaw) by `waveGain(state.blps)`.
2. Gils: **overwrite** with `rotation.set(side * 0.06 * (0.5 - 0.5*cos(gillPhase*TAU)), 0, 0)` where side is `-1` for `Gill.L`, `1` for `Gill.R`.
3. Fins: **multiply** an offset quaternion onto the existing pose —
   - `TailFin`: roll `0.12 * sin(cycle*TAU + PI/2)` scaled by gain.
   - `TailFin.U`/`.L`: roll `0.20 * sin(cycle*TAU + PI/2 - TAU*0.06)`, yaw `±0.05*sin(cycle*TAU + PI)`, plus `turnFlare` antisymmetrically.
   - `Pectoral.L.Tip`/`.R.Tip`: roll from the pectoral row phase, `+turnFlare` on the outside fin.
   - `Pectoral.L`/`.R`: tuck by `pectoralTuck`, scaled by 0.55 rad, opposite signs.
   - `Dorsal.Mid`, `Dorsal.Tip`, `AnalFin.Tip`: yaw ripple with increasing phase lag.
4. Turn C-bend: multiply a Z rotation of `bodyBend(turnRate)` onto `Spine.01`, `.02`, `.03`, divided evenly.
5. Every lookup is `root.getObjectByName(name)` with a `if (!bone) continue` guard; cache nothing inside this function.

Reuse module-level `Euler` and `Quaternion` scratch objects; do not allocate per call.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/scene/fish/finMotion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/scene/fish/finMotion.ts src/components/scene/fish/finMotion.test.ts
git commit -m "feat(scene): procedural fin, gill and turn motion"
```

---

### Task 6: Wire the layer into `FishSchool`

**Files:**
- Modify: `src/components/scene/fish/FishSchool.tsx:88-116`
- Modify: `src/components/scene/fish/FishSchool.test.tsx` if it asserts bone state

**Interfaces:**
- Consumes: `driveFins`, `FinState` from Task 5.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Add to the existing `FishSchool` test file a case that mounts the school with a stub GLB, advances two frames at different speeds, and asserts that the `Gill.L` bone quaternion differs across those frames while the same frame with `paused` does not change it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/scene/fish/FishSchool.test.tsx`
Expected: FAIL; the gill bone does not move between frames.

- [ ] **Step 3: Implement the call**

Inside `useFrame`, after `mixer.current.update(delta)` and before returning:

```ts
if (!paused && swim.current) {
  const clip = swim.current.getClip();
  driveFins(model.rig, {
    cycle: clip.duration > 0 ? (swim.current.time / clip.duration) % 1 : 0,
    blps: model.length > 0 ? fish.velocity.length() / model.length : 0,
    turnRate,
    gillPhase: (gillClock.current += delta * gillHz(blps)) % 1,
  });
}
```

`turnRate` is already computed above. `gillClock` is a `useRef(0)`. Do not call `driveFins` when paused: the mixer has not run, so any write would fight the frozen pose.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/scene/fish/FishSchool.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full TS gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass, test count at least 250.

- [ ] **Step 6: Commit**

```bash
git add src/components/scene/fish/FishSchool.tsx src/components/scene/fish/FishSchool.test.tsx
git commit -m "feat(scene): drive fin and gill motion from real speed"
```

---

### Task 7: Rebuild all 18 GLBs and verify budgets

**Files:**
- Modify: `public/models/fish/**/*.glb` (18 files)
- Modify: `artifacts/fish-production/*.json` (18 report files)
- Modify: `README.md` if it states bone or clip counts

- [ ] **Step 1: Rebuild every species and variant**

Run for each of the six species (danio species with no `--variant` builds all five variants):

```bash
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background \
  --python tools/blender/create_fish_species.py -- --species arulius-barb \
  --out public/models/fish --report artifacts/fish-production \
  --render artifacts/fish-production/review
```

Expected: 18 GLBs rewritten, no `assert_weights` or triangle/byte assertion failures.

- [ ] **Step 2: Run every asset gate**

```bash
python -B -m unittest discover -s tools/assets -p 'test_*.py'
python -B -m unittest discover -s tools/blender -p 'test_*.py'
python -B tools/assets/check_fins.py public/models/fish/arulius-barb/arulius-barb-high.glb
python -B tools/assets/check_swim.py public/models/fish/arulius-barb/arulius-barb-high.glb
```

Expected: all pass; `check_fins` and `check_swim` print `ok`.

- [ ] **Step 3: Confirm byte caps with headroom**

Run the report check and confirm every HIGH file is under 1,800,000 bytes, every MID under 1,000,000 and every LOW under 250,000.

- [ ] **Step 4: Visual review**

Open the review renders in `artifacts/fish-production/review/` and compare the caudal fin across frames. Reject if the fin reads as a ribbon or the twist is invisible.

- [ ] **Step 5: Commit**

```bash
git add public/models/fish artifacts/fish-production README.md
git commit -m "feat(assets): rebuild native fish with flexible fins"
```

---

### Task 8: Browser probe and documentation

**Files:**
- Modify: `README.md`
- Create: `artifacts/fish-production/review/locomotion-high.png`, `locomotion-low.png`

- [ ] **Step 1: Build and probe**

Run `npm run build`, then start the production server and capture HIGH and LOW screenshots. Assert zero console errors and that LOW fetches only its four low GLBs.

- [ ] **Step 2: Update the README**

Record: 24-bone rig, seven detail bones, one `Swim` clip, procedural gill oscillator, and the validation gates added by this work.

- [ ] **Step 3: Commit**

```bash
git add README.md artifacts/fish-production/review
git commit -m "docs: record flexible-fin rig and motion layer"
```
