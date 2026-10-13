# Prepared map sources

Made with Natural Earth. All included source data are public domain; the pinned `LICENSE.md` covers raster and vector data. `provenance.json` records exact URLs, commit, SHA256 digests, filters, counts, output digests, CRS, relief version and pixel crop.

- `india.geojson.json`: one India point-of-view Feature (`ADM0_A3=IND`), retaining all 35 polygons, all rings and 8,474 coordinates.
- `cauvery.geojson.json`: a FeatureCollection containing both `rivernum=403` features: lake centerlines (2 parts, 28 coordinates) and river (7 parts, 283 coordinates). No segments are joined or simplified.
- `/maps/india-shaded-relief.jpg`: optional local Natural Earth SR_50M v2.0.0 shaded relief, cropped from a validated WGS84, north-up global raster. Original 877×910 crop resized proportionately to 1542×1600. This is imagery, **not elevation**. Mask it with the sourced country polygons; the rectangular geographic crop necessarily includes neighbouring land/ocean.

The vector scale is **1:10 million**, not ten-metre accuracy. India point-of-view variant; generalized cartographic depiction, **not an official Survey of India map**. The Cauvery overview is geographically sourced; the dive is illustrative and no polar-parrot occurrence is asserted.

## Renderer handoff

Import `src/experience/geography.ts`; do not fetch world datasets at runtime.

- `LonLat = readonly [longitude: number, latitude: number]`
- `GeoBounds = readonly [west: number, south: number, east: number, north: number]`
- `LineCoordinates = readonly LonLat[]`
- `PolygonCoordinates = readonly LineCoordinates[]` (outer ring first, any interior rings afterward)
- `INDIA_BOUNDS: GeoBounds = [68.143403, 6.745551, 97.362253, 37.054484]`
- `MAP_TOP = 8`
- `projectLonLat(point: LonLat): Vector3`
- `INDIA_SHAPES: readonly PolygonCoordinates[]` (geographic coordinates, not Three.js Shape objects)
- `CAUVERY_PARTS: readonly LineCoordinates[]` (nine separate geographic lines; lake parts remain first in source order)
- `CAUVERY_ANCHOR: Vector3` (existing interior vertex `[77.877452, 11.154649]` of the geometrically longest river part; **clone before mutating**)
- `RELIEF_CONFIG: { url: string; bounds: GeoBounds } | null`

Every layer shares the India bounding-box centre `[82.752828, 21.9000175]`. Latitude scale is 0.5 scene units/degree; longitude scale is `0.5*cos(21.9000175°)`. East is positive X, north negative Z, and every projected point has Y=8. Country height is 15.1544665 units. Do not fit the river, raster or anchor independently.

For relief, project the corners of `RELIEF_CONFIG.bounds`, **not** `INDIA_BOUNDS`; crop edges are snapped outward to source pixels. The image's top row is north. Compute UVs geographically (`u=(lon-west)/(east-west)`, `v=(lat-south)/(north-south)` with the usual Three.js texture flipY); align/mask through the same projection. Do not derive displacement from grayscale brightness. If relief is null, use the verified outline and stylistic lighting.

## Reproduce and verify

Required source preparation uses Python's standard library only:

```sh
python3 tools/maps/prepare_map_assets.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tools/maps -p 'test_*.py'
npm test -- src/experience/geography.test.ts
```

To include optional relief without installing anything globally or in the repository:

```sh
uv run --no-project --with Pillow python tools/maps/prepare_map_assets.py --with-relief
```

For offline regeneration, use `--source-dir /path/to/sources` (original Natural Earth filenames plus `LICENSE.md`) and `--relief-archive /path/to/SR_50M.zip`. All source hashes and required geometry are validated before saving. Optional failure records a reason/fallback in provenance; `RELIEF_CONFIG` then becomes null. A run without relief deliberately records that fallback and removes any stale crop.

The official relief page currently links to a malformed `http//` URL. The helper uses the verified official HTTPS Natural Earth S3 archive, pinned by S3 versionId and SHA256. It reads only approved archive members in memory, never executes downloaded code, and ships only extracted geometry plus the local crop—not the world data or archive.
