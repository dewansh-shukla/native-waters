# Riverbed texture sources

Scanned PBR blend set for the terrain floor in the underwater Cauvery
scene (blended under the procedural silt/algae/caustic layers by
`substrateShader`). Color ships at 1K (1024 x 1024); the normal map
ships at 512 x 512 (see Processing).

| Shipped file | Source map | Bytes |
|--------------|------------|-------|
| `ground-color.jpg` | `Gravel035_1K-JPG_Color.jpg` | 1,788,520 |
| `ground-normal.jpg` | `Gravel035_1K-JPG_NormalGL.jpg` (downsampled to 512) | 152,757 |
| `ground-roughness.jpg` | `Gravel035_1K-JPG_Roughness.jpg` | 711,815 |

Total shipped: 2,653,092 bytes (~2.53 MiB; budget 4 MiB).

Note on conventions: the pack's `NormalDX` and `NormalGL` variants are
real mirror pairs. `NormalGL` is the OpenGL convention three.js expects
(green channel = +Y, measured mean 127.52 after downsample), so no
channel inversion is applied.

## Source

- Asset: **Gravel 035** — https://ambientcg.com/a/Gravel035
- Provider: ambientCG — https://ambientcg.com
- License: **CC0 1.0** (Creative Commons Public Domain) — https://docs.ambientcg.com/license/
- Creation method: surface photogrammetry
- Tags: gravel, grey, riverbed
- Native resolution: 8K photogrammetric scan of the dry Rhine riverbed,
  capture ~1.9 m x 1.9 m; shipped at 1K from the ambientCG 1K JPG pack
  (`Gravel035_1K-JPG.zip`, 10,559,484 bytes).

## Processing

- **Color:** shipped unchanged from the 1K JPG pack (sRGB — must be
  declared `SRGBColorSpace` when loaded into three.js).
- **Normal:** downsampled 1024 -> 512 with Lanczos and re-encoded at
  quality 92 from the pack's **NormalGL** variant (OpenGL convention).
  Non-color data — leave `colorSpace` at default. The 512 resolution is
  sufficient because the substrate blends the scanned normal at only
  half strength over its own procedural riverBump perturbation, and the
  bed's 24 x 18 m extent is sampled at world-space scale 0.55.
- **Roughness:** shipped unchanged from the 1K JPG pack (grayscale,
  non-color data).
- The ambient-occlusion and displacement maps were deliberately **not**
  shipped: AO is folded into the existing shader mood layers, and
  displacement would alter the procedural bed height that collisions
  and placement Y coordinates assume.

## Selection notes (2026-11-12)

- **Picked Gravel 035:** a genuine riverbed gravel (dry Rhine bed) with
  believable pebble structure and a fine sandy matrix — exactly the
  "coarse substrate in exposed zones" role the riffle/pool zoning calls
  for. Its neutral-cool grey is corrected in-shader by the existing wet
  tint (`vec3(0.66, 0.78, 0.70)` multiplier) and silt/algae layers,
  which pull it into the warm green Cauvery palette.
- **Ground 083 rejected:** mustard-yellow muddy sand — the hue fights
  the green river palette even after tinting, and it has no pebble
  structure to break up the floor.
- **Ground 108 rejected:** forest-floor debris with leaves, twigs and
  sprouting plants — reads as terrestrial litter, wrong underwater.
- Compared against the Cauvery river reference photograph
  (https://commons.wikimedia.org/wiki/File:Rocks_in_Cauvery_river.jpg,
  CC BY-SA 3.0 — reference only, not shipped) for the mixed
  gravel/cobble bed material.
