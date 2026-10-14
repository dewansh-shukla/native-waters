# Polar parrot V1 — bounded independent motion

## Outputs and scope

- Self-contained V1 fork: `tools/blender/create_polar_parrot_v1_animated.py`.
- Public asset: `public/models/polar-parrot-study-v1-animated.glb`.
- Authoring file: `artifacts/polar-parrot-v1-animated/polar-parrot-v1-animated.blend`.
- New scene: `Native Waters - Polar Parrot V1 Animated`.

This is **V1's appearance**, not the V2 redesign. The entire original V1 generator and its notes were read. Its image generation, material construction, body profile, eyes/gold iris, bars, gill overlay/seam, lips, fins/rays, UVs and mesh construction were copied unchanged. Only rigging/animation and the new review/export stage differ. No app, fixture, renderer, original generator or original export was edited by this worker.

## Exact preservation checks

The generator validates the emitted GLB against `polar-parrot-study-v1.glb`:

- Material JSON and texture mapping JSON compare exactly, including PBR, alpha, normal strength and corneal coating.
- All five embedded image payload SHA-256 hashes compare exactly. No downloads or photo pixels.
- Per-material, sorted triangle-corner POSITION, NORMAL and UV values compare exactly as decoded floats, without rounding. Sorting ignores only triangle ordering and skin-driven vertex splits; geometry, silhouettes, UVs and exported axes are retained.
- A pre/post-weighting source geometry/UV fingerprint also remains unchanged.
- All 18 original V1/V2 source, GLB, blend/backup, notes and review-image files are hashed before and after generation, and compared unchanged.

Rest geometry bounds in glTF: **1.990943 × 1.349261 × 0.664195** units (X length, Y height, Z depth). Nose is local -X; up is +Y. The blend is authored Z-up and exports with `export_yup=True`, matching legacy V1. Closed neutral rest is saved with zero pose rotations and muted NLA tracks.

## Rig and motion

**13 deform bones**, extending the original Head, Spine, Tail and paired Pectoral bones with TailTip, Gill.L/R, Jaw, Dorsal, Anal and Pelvic.L/R. Every bone has weighted vertices; every mesh vertex has finite, normalized, nonnegative weights.

The original low-relief `Silver gill cover L/R` and `Curved operculum seam L/R` vertices are weighted to paired vertical hinge bones, tapered from zero influence at the anterior edge. The body/head/eyes are not animated by respiration. This opens the existing overlay's rear edge geometrically; it is not texture animation. Gill maximum measured evaluated displacement at full opening is **0.0199602 model units**, within the asserted 0.002–0.03 range. Rotation is bounded to 0–5 degrees per side. Only the existing lower lip follows Jaw, at a tiny 0.006-radian pulse; no head-wide jaw opening.

Three named GLB clips have **disjoint target-node/property sets**:

- **Swim:** Spine.rotation, Tail.rotation, TailTip.rotation. 42 intervals / 43 samples at 30 fps, **1.4 seconds**. Angular amplitudes 0.015 / 0.085 / 0.11 radians, phase delays 0 / 0.65 / 1.2 radians. The distal caudal membrane/rays gradually transfer to TailTip, creating a traveling tail wave rather than a single whole-body wag. No Head, gill or pectoral tracks.
- **Breathing:** Gill.L.rotation, Gill.R.rotation, Jaw.rotation. 60 intervals / 61 samples, **2.0 seconds**. Smooth authored closed/open/closed cycle using a raised cosine. This is an artistic resting cadence, not a biological or medical claim.
- **FinIdle:** Pectoral.L/R.rotation, Dorsal.rotation, Anal.rotation, Pelvic.L/R.rotation. 54 intervals / 55 samples, **1.8 seconds**. Root-to-tip influence gradients include fin rays. Left/right pectoral and pelvic phases and amplitudes differ; no perfectly synchronous propeller motion. Dorsal/anal flutter is small (0.025/0.030 radians).

All clips use LINEAR quaternion channels. Their first/last transforms are equivalent, finite and normalized. No object translation tracks are exported. Breathing and FinIdle can play at their own cadence while Swim's timescale follows the app's speed, including zero translation. Clip time starts are normalized to zero, so consumers do not need to compensate for Blender frame 1 or a loader-dependent start offset. Per-fish mixer offsets may use each clip's own duration × index / 10.

## Export details and budgets

- **41,772 triangles**, exactly the original budget.
- **11 meshes/material batches**, exactly the original budget.
- One skin, 13 joints, five embedded images.
- GLB: **1,967,696 bytes**, below 3 MiB (original: 1,961,148 bytes).
- The GLB contains only selected fish meshes/rig, not factory objects, lights or camera.

Installed Blender 5.2.2 glTF operator RNA was inspected. Export uses `ACTIONS`, `export_merge_animation='NONE'`, explicitly named actions on single-strip named NLA tracks, `export_force_sampling=False`, no global frame-range truncation, and `export_optimize_animation_keep_anim_armature=False`. `ACTIVE_ACTIONS` was not used. Unsampled ACTIONS preserves just the authored bone channels instead of introducing unrelated static tracks.

Blender 5.2.2's unsampled ACTIONS path retained frame-1 timestamps despite `export_anim_slide_to_zero=True`. The generator therefore subtracts each time accessor's first value in the emitted GLB and updates only the corresponding accessor bounds/container JSON. No clips, channels, images, geometry, skin data or pose samples are removed. Final binary assertions verify zero starts and exact intended durations within float precision (Swim 1.399999976, Breathing 2.0, FinIdle 1.800000072 seconds).

## Review images

All stills use fixed neutral lighting, the same materials, Standard color management, and 900 × 650 output:

- `review-rest.png`: zero-pose closed rest.
- `review-breathing-closed.png`, `-opening.png`, `-open.png`, `-closing.png`: Breathing only, frames 1 / 16 / 31 / 46.
- `review-breathing-sheet.png`: unretouched 2 × 2 image sheet in that order, top-left to bottom-right.
- `review-gill-closeup-closed.png` and `review-gill-closeup-open.png`: fixed closeup camera for frames 1 / 31.
- `review-combined-frame30.png`: all three independent NLA channels combined at authored frame 30.

The sheet, combined frame and both closeups were visually inspected. V1 eye/gold iris, deep body, irregular bars and fins remain. Hinge motion is intentionally subtle and visible in closeup; no body tearing or broad head deformation was apparent in these sampled views. The review is not an exhaustive collision test or a claim of browser playback verification.

## Regenerate and verify

Run only in an isolated process:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python tools/blender/create_polar_parrot_v1_animated.py
```

ROOT is derived from `Path(__file__)`, not an absolute checkout path. The script requires background Blender 5.2.2 and factory-startup scene/objects, refuses an existing named scene, and writes only the new outputs. It preserves the separate factory scene. No live Blender MCP, external addons, packages or downloads are used. File backups are disabled for this new authoring save so regeneration does not create another output path.

The final regeneration exited 0. Source/export assertions passed: exact V1 appearance data, budgets, finite geometry/animation/bind matrices, normalized weights/quaternions, joint indices, skin bindings, all three nonconstant clip target sets, disjoint properties, zero-based durations, equivalent endpoints, sane evaluated hinge motion and unchanged original-file hashes. Python syntax was parsed successfully; an independent Python check also confirmed exact unrounded triangle-corner geometry/normal/UV equality.

## Combined browser integration verification

The coordinator freshly regenerated this source in isolated factory-startup Blender 5.2.2; final GLB SHA-256 is `e55992ea0996ae8cd8f58165ebd8520747545e9f59bb67653066ede1a1f2aeb3`. Independent binary validation passed on those exact bytes. The active fixture now uses this animated variant, while original v1/v2 files remain intact.

The web player starts three actions once per cloned rig using the shared simulation clock. Only Swim's action timescale changes with velocity; Breathing/FinIdle retain independent cadence. Quality/story/map changes preserve action identity; pause and reduced motion freeze every action without resetting phases or resuming fish implicitly. Legacy single-clip assets remain supported.

Actual Three.js/GLTFLoader browser review on desktop/mobile evaluated skinned vertex movement, not just bone rotations: maximum respiratory displacement was 0.0199602 model units. With Swim's timescale zero, Breathing and FinIdle both advanced 0.5 seconds; doubling Swim's timescale did not change the next 0.5-second breathing interval. Closed/open/combined web review images are `browser-{desktop,mobile}-{closed,open,combined}.png`; these and the Blender closeups were inspected.

Fresh Node 24.21.0 typecheck/lint, 196 unit tests, production build and all 28 desktop/touch production-browser tests passed. All 14 asset and six map-source checks passed, including exact original image/material preservation, nonconstant disjoint animation channels and positively weighted anatomical joints. Independent scoped review found no blockers. Source and full browser verification were performed once on the combined result, with focused checks during implementation.

## Limitations

The original V1 surface overlays, thin translucent fins, procedural seams and pole topology are deliberately retained. Gill motion is bounded movement of that existing overlay, not new anatomical cavities, fluid simulation or species-certified respiration. The sampled review angles show no obvious tearing, but all-view/all-frame intersection freedom and cross-browser alpha fidelity are not certified. The model worker did not test browser integration; combined coordinator/playback verification is recorded above. No ecological, medical-rate or physical-GPU claims are made.
