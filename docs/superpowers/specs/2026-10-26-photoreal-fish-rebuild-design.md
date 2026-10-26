# Photoreal Fish Rebuild — Design

Date: 2026-10-26
Status: approved in conversation 2026-10-26 (Approach A, user delegated judgement)
Supersedes: nothing; inserts scope between Task 7 and Task 8 of
`docs/superpowers/plans/2026-10-25-fish-model-production.md`.

## Intent

The six native fish (Arulius barb + five zebra-danio variants) read as toys in
the browser: conical snouts, painted sticker eyes with a ring tattooed on the
head, flat opaque fin sheets, hexagon-tiled "scales", grey-brown mush instead
of species pattern, and a 0.5 Hz stiff swim. The user's bar: the fish must look
like the real species. This rebuild replaces form, pattern, eyes, fins,
shading, and locomotion; it is not another material tweak.

## Goals

- Species-accurate silhouette and pattern, validated by photo overlay.
- Flesh that reads wet and translucent; eyes and fins that read biological.
- Biologically correct swim: travelling wave, correct frequency and phase.
- Keep the real-time contract: three LODs, shared danio geometry, LOW roster
  unchanged, app renders six species at 60 fps on a mid GPU.

## Non-goals

- Hero-render quality; photogrammetry; shipping scanned meshes (CT sources are
  non-commercial and reference-only).
- Rebuilding the environment to photoreal (separate later decision).
- New species or new fish count.

## Anti-goals

- A detailed toy: more triangles on a wrong silhouette.
- Shipped assets that fail the overlay or kinematics gates.

## Approaches considered

1. **Reference-driven Blender rebuild** (chosen): measure from CC photos,
   rebuild geometry/UV/textures/eyes/fins, bake wave-equation swim.
2. Adapt the CC0 Khronos BarramundiFish: wrong species, wrong proportions;
   kept only as benchmark and shader test subject.
3. AI image-to-3D (Hunyuan3D/TRELLIS): fails on thin fins and eyes; blockout only.
4. Polish the existing assets: rejected; defects are form-level.

## Constraints and revised budgets

- HIGH: <= 15,000 tris (was 12,000); payload <= 4 MB via WebP or KTX2
  (was 1.8 MB PNG). User accepted the cap raise on 2026-10-26.
- MID/LOW: keep existing caps (<= 4.5k / 1 MB; <= 1.5k / 250 kB).
- Summed HIGH GPU texture memory <= 56 MiB: 2048 body maps only where needed,
  shared normal/ORM across danio colour variants, KTX2 if WebP is insufficient.
- Materials: HIGH/MID four (FishBody, FishFin, FishEye, FishCornea); LOW two.
- One Swim clip per GLB; 17-bone rig contract unchanged.

## How

1. Reference pack per species in `artifacts/fish-production/reference/` with
   licence + attribution recorded (arulius photo CC BY 4.0 Marcus Knight).
2. Measure ratios in body lengths; store as `fish_specs.py` numbers (the spec).
   Initial estimates to verify by overlay: arulius depth ~0.35 L, danio
   ~0.22 L; head ~0.25 L; eye ~0.28 head length; dorsal origin ~0.55-0.60 L.
3. Geometry: blunt head with gill seam, mouth, scaleless skull; rayed fin
   membranes with species ray counts; seated eye globes + cornea shells.
4. Textures: species pattern with crisp element counts (arulius 3 blotches +
   red fins + red iris; danio 5 stripes + striped anal fin + clear fins);
   cycloid-arc scale normals masked off head/fins; thickness map for flesh.
5. Shading: KHR_materials_transmission + KHR_materials_volume (thickness via
   glTF Material Output node), clearcoat 0.2-0.4 body / 0.5-1.0 cornea,
   iridescence ~0.2, roughness 0.25-0.40; fins BLEND doubleSided thin-wall on
   HIGH/MID, alpha-only on LOW.
6. Swim: y(x,t) = A(x) sin(2 pi (x/lambda - f t)); lambda = 1.0-1.2 L;
   A: 0.02 L head -> 0.10-0.15 L tail; f = St V / A with St ~ 0.35, giving
   ~2.5-4.5 Hz at the app's 0.8-1.7 BL/s cruise; 1 s clip with integer cycles
   (3 tail + 2 gill + 1 pectoral); linear keys at 30 fps or cubicspline.
7. App: retime by real speed not fish index; banking roll 10-20 deg into turns
   with head-lead yaw; register KTX2Loader/MeshoptDecoder if KTX2 chosen;
   close-up framing for the selected fish.
8. Validate: orthographic overlay landmarks <= 2% L; pattern counts; colour
   sampling; kinematics sampled from exported GLB (frequency, amplitude,
   seam = 0); in-app screenshot no worse than current.

## Left to the builder

Exact UV seam placement; per-species ray counts from FishBase; per-LOD texture
resolutions; clip frame count; whether WebP or KTX2 after payload measurement.

## Task order

R1 reference pack + measurements. R2 Arulius v2 geometry/UV/textures/eyes/fins.
R3 Arulius swim rebake + validation. R4 in-app cutover Arulius + screenshot.
R5 danio base + five variants. R6 app motion/compression polish. Then Task 8.
