# Fish Locomotion and Fin Animation — Design

Date: 2026-11-01
Status: approved in conversation 2026-11-01
Amends: `2026-10-26-photoreal-fish-rebuild-design.md` (which binds "One Swim clip
per GLB; 17-bone rig contract unchanged"). This spec replaces that clause.

## Intent

The six native fish rebuild made the models species-accurate, but they still move
like machines. Every fin is a rigid plate hinged at its base, and a single clip
retimes every oscillator together, so the gills pant at 3 Hz when the fish
cruises and the pectorals scull in the middle of a tail beat.

The user's bar: the fish must move like the real animal, including the fins.

## Evidence: what the current asset actually does

- Rig is 17 bones. Each fin is skinned to exactly two bones, a body bone and one
  fin bone, by distance from the fin root (`create_fish_species.py:545-556`).
  A fin therefore rotates about its root and cannot flex along its rays.
- The caudal fin gets a rigid ±0.22 rad yaw at the peduncle. Real caudal fins
  flex and twist; the hinge is in the wrong place.
- One 1 s `Swim` clip holds 3 tail beats, 2 gill beats and 1 pectoral cycle, and
  the app retimes the whole clip by speed (`motion.ts`, `FishSchool.tsx:107-114`).
  The result is a single oscillator wearing three costumes:

  | Oscillator | Authored | Retimed at the app's cruise (2.5-4.5 Hz) |
  |---|---|---|
  | Tail | 3 Hz | 2.5-4.5 Hz (correct) |
  | Gills | 2 Hz | 1.7-3.0 Hz (real ventilation is ~0.5-1.5 Hz) |
  | Pectorals | 1 Hz | 0.8-1.5 Hz, still rowing at cruise |

- The school cruises at 0.3-0.6 world units/s with a 0.36-0.44 display length,
  i.e. **0.7-1.7 body lengths/s**. That sits on the pectoral-fin to
  body-caudal-fin gait transition, where real fish use a mix of both.

## Research basis

- Subcarangiform body wave, wavelength 1.0-1.2 L, amplitude 0.02 L at the nape
  to 0.10-0.15 L at the tail: Sfakiotakis, Lane & Davies 1999, *IEEE J. Oceanic
  Eng.* 24:237.
- Tail amplitude rises with beat frequency up to ~5 Hz; beat frequency rises
  with speed: Bainbridge 1958, *J. Exp. Biol.* 35:109.
- Adult zebrafish cruise near Strouhal 0.37: Mwaffo et al. 2017.
- Pectoral fin-beat amplitude falls while tail amplitude rises as speed
  increases, with a fin-to-body gait transition: JEB 214:3111 (larval zebrafish);
  Lauder et al. 2006 and Drucker & Lauder on bluegill rowing and its transition
  to body-caudal propulsion near 1-2 BL/s.
- Fin rays bend most near their tips; curvature across the rays sets stiffness:
  Alben, Madden & Lauder 2007, *J. R. Soc. Interface* 4:243; Flammang et al.
  2013, *J. Morphol.*; curvature-induced stiffening, PMC5454310.
- Flexible caudal fins smooth thrust, and the trailing edge lags the peduncle:
  Matthews et al. 2022 (peduncle phase); Bioinspir. Biomim. 2025 on flexible
  caudal fins.
- A flapping foil produces peak thrust near a 90 degree pitch-heave phase
  difference: Anderson, Streitlien, Barrett & Triantafyllou 1998. This is the
  basis for the caudal torsion below.

All of the above are read for numbers and mechanism only; no copyrighted figure
or mesh is reproduced.

## Goals

- Fins flex and twist along their rays, distally more than proximally.
- The caudal fin behaves as a torsionally deforming foil, not a hinged paddle.
- Gill rate is decoupled from tail beat.
- Pectoral use follows speed: light rowing at the slow end, tucked at cruise.
- Fins flare asymmetrically and the body C-bends in a turn.
- Body wave amplitude responds to speed, on top of frequency.
- Keep the real-time contract: 6 natives, 3 LODs, per-file byte caps, 60 fps.

## Non-goals

- Hover sculling (the school never stops), startle/C-start escape, jump, feeding.
- Rebuilding the body wave; the existing travelling wave is validated and kept.
- New species, new fish counts, or changes to the polar parrot fixture.

## Anti-goals

- A fish whose fins stay flat because the rig cannot bend them.
- Motion logic so distributed that no single place explains a pose.

## Approaches considered

1. **Rig-only**: 24 bones plus a richer single bake. Fixes rigid fins. Leaves
   gill and pectoral rates locked to tail speed, and no turn response.
2. **Gait clips**: `SlowSwim`/`Swim`/`FastSwim` blended by speed.
3. **Procedural fin layer**: keep the body wave baked, drive detail bones from
   speed and turn in the app.

Chosen: 1 + 3. See "Gait clips rejected" for why 2 was dropped after the design
review.

## Rig v2: 24 bones (17 required + 7 detail)

Placements are derived from the species measurements already used for the fin
geometry, so they follow the body rather than being hardcoded:

- `bl = spec.body_length`, `rear_x = -1.0 + bl`
- `caudal_len = bl * caudal_length_SL`
- `centre, base = profile(slug, 1.0)`, `spread = base * 2.5`

| Bone | Parent | Head | Tail | Job |
|---|---|---|---|---|
| `TailFin.U` | `TailFin` | `rear_x + 0.40*caudal_len`, z `centre + 0.50*spread` | `rear_x + caudal_len`, z `centre + 0.85*spread` | upper lobe flex, twist, cup |
| `TailFin.L` | `TailFin` | mirror in z | mirror in z | lower lobe flex, twist, cup |
| `Pectoral.L.Tip` | `Pectoral.L` | 0.55 along `Pectoral.L` | 1.10 along `Pectoral.L` | feather on recovery, fold on tuck |
| `Pectoral.R.Tip` | `Pectoral.R` | mirrored | mirrored | mirrored |
| `Dorsal.Mid` | `Dorsal` | 0.34 along `Dorsal` | 0.67 along `Dorsal` | middle third of the base |
| `Dorsal.Tip` | `Dorsal.Mid` | 0.67 along `Dorsal` | 1.00 along `Dorsal` | rear third of the base |
| `AnalFin.Tip` | `AnalFin` | 0.50 along `AnalFin` | 1.00 along `AnalFin` | rear half of the base |

`BONE_SPECS` becomes `bone_specs(spec)`, a function of the species, because the
caudal placement depends on measured fin length.

## Skinning

Max influences per vertex rises from 2 to 3, inside glTF's vec4 `JOINTS_0`.

For every fin vertex:

1. `span` — normalised projection of the vertex onto its ray, root to tip
   (existing `projection_spans`).
2. `u` — row fraction across the fin, 0 at the leading root, 1 at the trailing
   root (dorsal and anal only).
3. **Body weight** = `clamp(1 - span/0.25, 0, 1)`, taken from `chain_weights`
   at the vertex's root x. Only the attachment band blends into the body, so
   the fin seam stays welded and the fin is otherwise owned by its own chain.
4. **Fin chain** by span:
   - two-bone fins (pectoral, anal, caudal lobe): `w_root = 1 - span`,
     `w_tip = span`
   - three-bone dorsal: `w_Dorsal = clamp(1 - 2u)`,
     `w_Mid = 1 - |2u - 1|`, `w_Tip = clamp(2u - 1)`
5. **Caudal lobe split**: `wU = clamp((z - centre)/spread + 0.5, 0, 1)`,
   `wL = 1 - wU`, so the midline blends both lobes and the fin stays continuous.
6. Clamp to the four largest influences and renormalise.

The three-segment dorsal/anal chain ripples front to back along the base. Those
fins are stiff along the ray, so height-wise lag is deliberately not modelled.

## Bake

One `Swim` action, unchanged body wave, plus fin detail. Keyed at 25 frames
(24 fps, 1.0 s) with linear interpolation, as today.

- **Caudal torsion.** `TailFin` keeps its ±0.22 rad yaw and gains a roll about
  its own axis at +90 degrees phase: `0.12 * sin(tail + pi/2)`. Because the bone
  head sits on the peduncle, roll pivots the fin about its chord with no
  displacement at the root; the skin then interpolates root roll to lobe roll
  and the fin reads as a graded torsional wave.
  `TailFin.U`/`.L` add `0.20 * sin(tail + pi/2 - 0.06 cycles)` roll, and an
  antisymmetric `±0.05 * sin(tail + pi)` yaw for cupping.
- **Pectoral feather.** Tip bones roll at +90 degrees from the stroke phase, so
  the outer half slices on the recovery stroke instead of pushing.
- **Dorsal/anal ripple.** Each segment lags its neighbour by ~0.05 cycles along
  `u`, amplitude scaled by speed in the app.
- **Gills** stay in the bake as a standalone-asset fallback; the app overrides
  them (below).

## App layer

New pure module `src/components/scene/fish/finMotion.ts`, unit-tested:

- `waveGain(blps)` — body-wave amplitude gain, ~0.75 at the slow end to ~1.2 at
  the fast end, so amplitude rises with frequency as measured.
- `pectoralTuck(blps)` — 0 sculling to 1 folded against the flank.
- `pectoralRowHz(blps)` — ~1.2 Hz, only used at the slow end.
- `gillHz(blps)` — 1.1 to 1.6 Hz, independent of tail beat.
- `caudalTwist(cycle, blps)` and `caudalCup(cycle, blps)`.
- `turnFlare(turnRate)` — asymmetric pectoral flare.
- `bodyBend(turnRate)` — additive C-bend, capped small.

`FishSchool.tsx` caches the detail bones at mount and, after
`mixer.update(delta)`:

1. Read `cycle = (swimAction.time / duration) % 1`. Deriving phase from the clip
   itself is drift-free and keeps fin lag coherent with the baked body wave at
   any time scale.
2. Scale the yaw of the body-wave bones (`Spine.01-03`, `Tail.01-02`, `TailFin`)
   by `waveGain`. Those bones carry pure Z rotation in the bake, so Euler
   extraction is exact.
3. Overwrite the gill bones from their own oscillator (not additive: this is
   full decoupling).
4. Multiply fin offsets onto the baked pose (additive: baked pose plus
   deviation).
5. Add the turn C-bend and asymmetric flare.

The two offset semantics are deliberate and documented in the function header.

## Gait clips rejected

The user selected the three-clip option. The design review found it does not
work as intended in three.js r186, so it was dropped:

- `AnimationUtils.makeClipAdditive` builds a delta against a **fixed reference
  frame**, not against the base clip at the same time
  (`AnimationUtils.js:263-362`: `referenceTime = referenceFrame / fps`).
- Layering therefore computes `base(t) * target(t) * conj(base(t0))`, not
  `target(t)`. For a cyclic rotation this *adds* amplitudes instead of
  interpolating them: a 1.35x clip at full weight yields ~2.35x, not 1.35x.
  A sinusoid at the reference frame is left offset by `(k-1) * A * sin(0)`.
- Crossfading instead of layering was the original plan, but a crossfade
  averages two poses, and over the app's 1 BL/s band every fish would sit
  permanently mid-fade with a collapsed amplitude envelope.
- Authored *delta* clips (bake `(k-1)*theta` directly, skip `makeClipAdditive`)
  would work, but they add a second authoring mode, two extra clips per species
  and an exact-clip-set validator change, to buy a 20-30 percent amplitude
  change that a few lines of procedural gain produce exactly and for free.

Amplitude is therefore procedural. The clip set stays at one, so the validator
contract is unchanged. If a startle or hover behaviour is added later, delta
clips remain the option; the rig already supports them.

## Budgets

No cap changes. Per file: 7 extra bones ~10 kB (inverse-bind matrices, nodes and
their animation channels). One clip stays one clip.

| LOD | Cap | Current | After (estimate) |
|---|---|---|---|
| HIGH | 1,800 kB | 696-1,038 kB | +10 kB |
| MID | 1,000 kB | 556-581 kB | +10 kB |
| LOW | 250 kB | 149-157 kB | +10 kB |

## Validation

- `tools/blender/fish_rig.py` holds pure placement and weight math, unit-tested
  without Blender.
- New `tools/assets/check_fins.py` reads an exported GLB and asserts:
  - the 7 detail bones exist and carry weight;
  - no vertex exceeds 4 influences and weights sum to 1 per vertex;
  - caudal vertices are split across at least two of
    `TailFin`/`TailFin.U`/`TailFin.L`;
  - `TailFin.U`/`.L` have non-zero rotation range and their twist keyframes
    change sign through the beat.
- Existing `check_swim.py` keeps validating the body wave unchanged.
- Blender numeric regression: evaluate the deformed mesh at several frames and
  confirm caudal trailing-edge displacement grows relative to the root, i.e.
  the fin genuinely bends rather than rotating rigidly.
- Vitest for every `finMotion.ts` function, including that `waveGain` is
  monotonic in speed and `gillHz` is independent of the tail beat.
- Browser probe: HIGH and LOW screenshots, zero page errors, LOW still fetches
  only its four files.

## Risks

- **Detail bones unweighted** would trip `assert_weights`. The span and row
  ramps must reach every detail bone at every LOD; the pure weight functions are
  unit-tested at the LOW ring counts first.
- **Torsion too strong** reads as a flapping ribbon. Start at the stated
  amplitudes, verify against the render and tune down.
- **Procedural layer fighting the bake** if the offsets are applied before the
  mixer writes the pose. Ordering is fixed: mixer, gain, gills, fins, turn.
- **Turn C-bend fighting the baked wave.** Capped small and applied only to
  `Spine.01-03`, where the baked amplitude is lowest.

## Task order

1. `fish_rig.py`: placements and weight ramps, unit-tested.
2. Rig v2 and 3-way skinning in `create_fish_species.py`.
3. Torsion and fin detail in the bake.
4. `check_fins.py` and the caudal bend regression.
5. `finMotion.ts` and its tests.
6. `FishSchool.tsx` wiring.
7. Rebuild all 18 GLBs; budgets and checks.
8. Browser probe and screenshots; README notes.
