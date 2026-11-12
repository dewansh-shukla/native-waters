# Wood texture sources

Shared PBR map set for the submerged driftwood trunk and branch in the
underwater Cauvery scene. All maps ship at 1K (1024 x 1024).

| Shipped file | Source map | Bytes |
|--------------|------------|-------|
| `bark-color.jpg` | `Bark012_1K-JPG_Color.jpg` | 1,711,274 |
| `bark-normal.jpg` | `Bark012_1K-JPG_NormalGL.jpg` | 2,443,285 |
| `bark-roughness.jpg` | `Bark012_1K-JPG_Roughness.jpg` | 728,470 |

Total shipped: 4,883,029 bytes (~4.66 MiB).

Note on conventions: the pack's `NormalDX` and `NormalGL` variants are real
mirror pairs. `NormalGL` is the OpenGL convention three.js expects (green
channel = +Y), so no channel inversion is applied.

## Source

- Asset: **Bark 012** — https://ambientcg.com/a/Bark012
- Provider: ambientCG — https://ambientcg.com
- License: **CC0 1.0** (Creative Commons Public Domain) — https://docs.ambientcg.com/license/
- Creation method: surface photogrammetry
- Tags: bark, khaki, rough, tree
- Native resolution: 8K photogrammetric scan; shipped at 1K from the
  ambientCG 1K JPG pack (`Bark012_1K-JPG.zip`, 10,336,310 bytes).

## Processing

- **Color:** shipped unchanged from the 1K JPG pack (sRGB — must be
  declared `SRGBColorSpace` when loaded into three.js).
- **Normal:** shipped unchanged from the pack's **NormalGL** variant
  (OpenGL convention). Non-color data — leave `colorSpace` at default.
- **Roughness:** shipped unchanged from the 1K JPG pack (grayscale,
  non-color data).
- The ambient-occlusion and displacement maps were deliberately **not**
  shipped: AO is folded into the shader's crevice darkening, and the
  displacement map would alter the procedural log geometry envelope that
  the branch silhouette assumes.

## Selection notes (2026-11-12)

- Bark 012 is photographed with the grain running vertically in the image.
  Cylinder UVs run V along the trunk length, so the default orientation
  already carries bark ridges along the log.
- The albedo is deliberately khaki/olive; the shader's waterlogged tint,
  water absorption and restrained biofilm bring it into the river palette
  instead of re-tinting the source maps.
- Compared against the Cauvery river reference photograph
  (https://commons.wikimedia.org/wiki/File:Rocks_in_Cauvery_river.jpg,
  CC BY-SA 3.0 — reference only, not shipped) for the brown-green,
  water-darkened driftwood palette.
