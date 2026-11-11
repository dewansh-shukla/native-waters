# Rock texture sources

Shared PBR map set for the boulder and pebble instanced batches in the
underwater Cauvery scene. All maps ship at 1K (1024 x 1024).

| Shipped file | Source map | Bytes |
|--------------|------------|-------|
| `rock-color.jpg` | `Rock042L_1K-JPG_Color.jpg` | 1,563,409 |
| `rock-normal.png` | `Rock042L_1K-PNG_NormalGL.png` | 5,802,551 |
| `rock-roughness.jpg` | `Rock042L_1K-JPG_Roughness.jpg` | 439,912 |

Total shipped: 7,805,872 bytes (~7.45 MiB; budget 10 MiB).

Note on conventions: the pack's `NormalDX` and `NormalGL` variants are
real mirror pairs — sub-sampled green-channel correlation measured at
−1.000 (PNG pack), with average green 127.90 vs 127.10. `NormalGL` is
therefore genuinely distinct and matches three.js's OpenGL expectation.

## Source

- Asset: **Rock 042L** — https://ambientcg.com/a/Rock042L
- Provider: ambientCG — https://ambientcg.com
- License: **CC0 1.0** (Creative Commons Public Domain) — https://docs.ambientcg.com/license/
- Creation method: height-field photogrammetry
- Tags: beige, rock, smooth
- Native resolution: 8K photogrammetric scan; shipped at 1K from the
  ambientCG 1K ZIP packs (`Rock042L_1K-JPG.zip`, `Rock042L_1K-PNG.zip`).

## Processing

- **Color:** shipped unchanged from the 1K JPG pack (sRGB — must be
  declared `SRGBColorSpace` when loaded into three.js).
- **Normal:** shipped unchanged from the 1K PNG pack using the pack's
  **NormalGL** variant (OpenGL convention: green channel = +Y), which is
  the tangent-space orientation three.js expects. No channel inversion or
  recompression applied. Non-color data — leave `colorSpace` at default.
- **Roughness:** shipped unchanged from the 1K JPG pack (grayscale,
  non-color data).
- The derived/AO and displacement maps were **not** shipped: AO is folded
  into the shader mood instead, and displacement would alter the
  procedural geometry envelope that collision assumes.

## Selection notes (2026-11-10)

- Compared against the Cauvery river reference photograph
  (https://commons.wikimedia.org/wiki/File:Rocks_in_Cauvery_river.jpg,
  CC BY-SA 3.0 — reference only, not shipped): warm tan/grey granite and
  gneiss boulders.
- AmbientCG Rock 064 and Rock 063 were rejected: both are cool grey-green
  moss rolls that visibly clash with the Cauvery palette.
- Rock 042L matches the warm beige/grey granite palette with restrained
  ochre lichen accents (the "biofilm" accent role in the shader).
