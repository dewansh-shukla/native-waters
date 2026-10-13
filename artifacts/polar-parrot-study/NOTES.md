# Polar parrot procedural reference study

## Outputs
- Authoring source: `tools/blender/create_polar_parrot_study.py`
- Blender source: `artifacts/polar-parrot-study/polar-parrot-study.blend`
- Public asset: `public/models/polar-parrot-study-v1.glb`

Executed in the live Blender 5.2 session through MCP, not headless Blender. Existing `Native Waters - Pipeline Test` and `Scene` remain intact. The new scene is `Native Waters - Polar Parrot Study`; rerunning the script refuses a duplicate. Only its selected fish meshes and rig export: active-scene filtering excludes the original fixture, review camera, lights, and all other actions.

## Actual metrics
- 41,772 triangles; 21,873 exported vertices; 11 consolidated meshes/material batches.
- 1 skin, 5 deform bones: Head, Spine, Tail, Pectoral.L, Pectoral.R.
- 1 exported animation, three-second repeating swim; 73 keyed/sampled frames at 24 fps. GLB time bounds 0.041667–3.041667 seconds; matching endpoint transforms.
- Approximately 1.99 units nose-to-tail at the reviewed pose; review bounds approximately 1.99 × 0.67 × 1.35 units including paired fins (X length, Y depth, Z height in Blender). Geometry was uniformly normalized from the reference-proportion construction to approximately two model units; not a biological measurement.
- 5 embedded original procedural images: silver six-bar skin and staggered micro-scale normal at 512²; fin rays, barred dorsal membrane, olive-gold iris flecks at 256².
- GLB: 1,961,148 bytes. Blender source: 1,371,709 bytes.

## Checks actually performed
- MCP material-angle review from front, back, right and three-quarter, plus frames 1/19/37/55/73.
- Blender assertions: finite vertices; nonzero normalized weights on every mesh vertex; bones/action present; packed, nonempty images; triangle budget.
- Independent binary GLB checks: valid container; embedded images; 11 fish-only meshes; 5 joints; all primitives skinned; finite positions; normalized nonnegative weights; matching animation endpoints; no fixture names, cameras, or lights.
- Python syntax parsed successfully. Coordinator re-ran the final source wholesale using Blender 5.2.2 `--background --factory-startup --python tools/blender/create_polar_parrot_study.py`; exit 0. This separate process regenerated only the new study outputs and did not alter the live Blender scenes.
- Coordinator independently revalidated the regenerated GLB: 41,772 triangles, five joints/images, finite positions/animation, normalized skin weights, matching loop endpoints, and no exported stage cameras/lights.
- Desktop and mobile-sized browser previews inspected: `preview-desktop.png`, `preview-mobile.png`. Corrected Blender-Z-up to glTF-Y-up presentation and adjusted framing for the whole fish.
- Node 24.21.0 typecheck/lint, 73 unit tests, production build, and 14 Chromium browser tests passed, including actual study playback, Pause/Resume, reduced motion, and failure recovery. Independent code review found no blockers.

## Regeneration

From the project root, with Blender 5.2 installed and output directories present:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python tools/blender/create_polar_parrot_study.py
```

This regenerates the named study GLB/.blend outputs. Set `ROOT` in the script when using a different checkout. Live execution refuses an existing study scene rather than deleting it. Factory-startup regeneration uses a separate Blender process; its saved authoring file contains the study plus the factory scene, not every scene from the live session. Blender's local `.blend1` backup is retained and ignored.

## Limitations
A procedural artistic study based on the supplied reference, not a taxonomically certified or photogrammetric specimen. Scales, iris flecks and membrane detail are intentionally subtle synthetic textures. Simple five-bone deformation, not fluid simulation; fin membranes are thin double-sided surfaces, with renderer-dependent alpha blending. Some coincident ellipsoid-pole vertices and surface overlays remain; this is a render/animation asset, not a watertight fabrication mesh. No photo pixels, paid APIs, downloads, or external add-ons were used. Browser appearance/playback were reviewed, but mouth/gill anatomy, regular bars, and wire-like fin rays are still procedural approximations—not photorealism. Physical GPU performance and ecological/species verification remain untested.
