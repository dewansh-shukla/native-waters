#!/usr/bin/env python3
"""Prepare local map assets. Network and optional Pillow are build-time only."""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
COMMIT = "ca96624a56bd078437bca8184e78163e5039ad19"
BASE = f"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{COMMIT}"
CRS_NAME = "urn:ogc:def:crs:OGC:1.3:CRS84"
CRS = {"type": "name", "properties": {"name": CRS_NAME}}
INDIA_BOUNDS = [68.143403, 6.745551, 97.362253, 37.054484]
SOURCES = {
    "ne_10m_admin_0_countries_ind.geojson": ("geojson/", "3e67a5a6ddeff3247ca8400cd2514fd4a5ac6e5432823b25d610a7028597d45f"),
    "ne_10m_rivers_lake_centerlines.geojson": ("geojson/", "bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a"),
    "LICENSE.md": ("", "2631b5b39b6d1acc56de75235109b5af2dbb4b0ac5a127b6f06185977247fd4b"),
}
RELIEF_URL = "https://naturalearth.s3.amazonaws.com/50m_raster/SR_50M.zip?versionId=gS0sNgLWM3mMkML6s7ucwdH_6KVQhxMJ"
RELIEF_HASH = "ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7"
RELIEF_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.017453292519943295]]'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def position(point):
    require(isinstance(point, list) and len(point) == 2, "Expected [longitude, latitude]")
    require(all(type(v) in (int, float) and math.isfinite(v) for v in point), "Nonfinite coordinate")
    require(-180 <= point[0] <= 180 and -90 <= point[1] <= 90, "Outside CRS84 coordinate range")


def bounds(points):
    return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]


def validate_sources(countries, waterways):
    """Reject lost parts, reversed axes, changed filters, or malformed geometry."""
    for source in (countries, waterways):
        require(source.get("type") == "FeatureCollection", "Expected FeatureCollection")
        require(source.get("crs") == CRS, "Expected longitude-first CRS84")
    india = [f for f in countries["features"] if f["properties"].get("ADM0_A3") == "IND"]
    rivers = [f for f in waterways["features"] if f["properties"].get("rivernum") == 403]
    require(len(india) == 1, "Expected exactly one ADM0_A3=IND")
    require(len(rivers) == 2, "Expected both rivernum=403 features")
    india = india[0]
    geometry = india["geometry"]
    require(geometry["type"] == "MultiPolygon", "Expected India MultiPolygon")
    polygons = geometry["coordinates"]
    require(len(polygons) == 35, "Expected 35 India polygons/islands")
    points = []
    for polygon in polygons:
        require(len(polygon) > 0, "Missing polygon rings")
        for ring in polygon:
            require(len(ring) >= 4 and ring[0] == ring[-1], "Unclosed polygon ring")
            for point in ring:
                position(point)
            points.extend(ring)
    require(len(points) == 8474, "Expected 8474 India coordinates")
    require(all(math.isclose(a, b, abs_tol=1e-6, rel_tol=0) for a, b in zip(bounds(points), INDIA_BOUNDS)), "Unexpected India bounds / reversed coordinates")
    require({f["properties"].get("featurecla") for f in rivers} == {"River", "Lake Centerline"}, "Expected Cauvery river and lake features")
    for feature in rivers:
        require(feature["properties"].get("name") == "Cauvery", "Unexpected river name")
        geometry = feature["geometry"]
        require(geometry["type"] == "MultiLineString", "Expected segmented MultiLineString")
        parts = geometry["coordinates"]
        expected = (7, 283) if feature["properties"]["featurecla"] == "River" else (2, 28)
        require(len(parts) == expected[0], "Lost or joined Cauvery segments")
        require(sum(len(part) for part in parts) == expected[1], "Changed Cauvery coordinates")
        for part in parts:
            require(len(part) >= 2, "Empty or singleton line part")
            for point in part:
                position(point)
                require(INDIA_BOUNDS[0] <= point[0] <= INDIA_BOUNDS[2] and INDIA_BOUNDS[1] <= point[1] <= INDIA_BOUNDS[3], "Cauvery outside India extent / reversed coordinates")
    return india, rivers


def validate_world_file(values, size):
    require(len(values) == 6 and all(math.isfinite(v) for v in values), "Invalid world file")
    a, d, b, e, c, f = values
    require(a > 0 and e < 0 and b == 0 and d == 0, "Expected north-up unrotated raster")
    require(size == (10800, 5400), "Unexpected SR_50M raster dimensions")
    west, north = c - a / 2, f - e / 2
    actual = [west, north + e * size[1], west + a * size[0], north]
    expected = [-180, -90, 180, 90]
    require(all(math.isclose(x, y, abs_tol=1e-8, rel_tol=0) for x, y in zip(actual, expected)), "Unexpected raster world bounds")
    return expected


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        require(response.geturl().startswith("https://"), "Non-HTTPS source redirect")
        return response.read()


def crop_relief(data):
    # Pillow is deliberately imported only in this optional, offline preparation path.
    from PIL import Image

    require(len(data) == 11380369 and sha256(data) == RELIEF_HASH, "Unexpected relief archive digest/size")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        names = {"SR_50M.README.html", "SR_50M.VERSION.txt", "SR_50M.prj", "SR_50M.tfw", "SR_50M.tif"}
        require(set(archive.namelist()) == names and len(archive.namelist()) == 5, "Unexpected relief archive members")
        require(archive.read("SR_50M.prj").decode().strip() == RELIEF_PRJ, "Expected geographic WGS84 degrees, not a projected CRS")
        version = archive.read("SR_50M.VERSION.txt").decode().strip()
        require(version == "2.0.0", "Unexpected relief version")
        world = [float(v) for v in archive.read("SR_50M.tfw").decode().split()]
        with Image.open(io.BytesIO(archive.read("SR_50M.tif"))) as image:
            world_bounds = validate_world_file(world, image.size)
            require(image.mode in ("RGB", "L"), "Unexpected relief pixel mode")
            a, _, _, e, c, f = world
            west, north = c - a / 2, f - e / 2
            w, s, east, n = INDIA_BOUNDS
            left, top = math.floor((w - west) / a), math.floor((n - north) / e)
            right, bottom = math.ceil((east - west) / a), math.ceil((s - north) / e)
            require(0 <= left < right <= image.width and 0 <= top < bottom <= image.height, "Crop outside raster")
            crop_bounds = [west + left * a, north + bottom * e, west + right * a, north + top * e]
            cropped = image.crop((left, top, right, bottom)).convert("RGB")
            original_size = cropped.size
            ratio = 1600 / max(original_size)
            cropped = cropped.resize(tuple(round(v * ratio) for v in original_size), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            cropped.save(output, format="JPEG", quality=90, optimize=True)
            encoded = output.getvalue()
            return encoded, {
                "status": "available", "url": "/maps/india-shaded-relief.jpg", "bounds": crop_bounds,
                "sourceUrl": RELIEF_URL, "sourcePage": "https://www.naturalearthdata.com/downloads/50m-raster-data/50m-shaded-relief/",
                "sourceSha256": RELIEF_HASH, "sourceBytes": len(data), "version": version,
                "license": "Public domain; see pinned LICENSE.md (covers vector and raster)",
                "crs": "Geographic WGS84 longitude/latitude degrees", "prj": RELIEF_PRJ,
                "worldFile": world, "worldBounds": world_bounds, "sourceDimensions": list(image.size),
                "pixelCrop": [left, top, right, bottom], "cropDimensions": list(original_size),
                "dimensions": list(cropped.size), "sha256": sha256(encoded),
                "usage": "Shaded-relief color texture only, NOT measured elevation or displacement.",
                "downloadNote": "Official page has a malformed http// link. Verified official HTTPS S3 object, pinned by versionId and SHA256 instead.",
            }


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(",", ":")) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Offline source directory with original source filenames")
    parser.add_argument("--relief-archive", type=Path, help="Offline verified SR_50M.zip")
    parser.add_argument("--with-relief", action="store_true", help="Fetch optional verified relief archive (requires isolated Pillow)")
    args = parser.parse_args()
    raw, records = {}, {}
    for name, (prefix, digest) in SOURCES.items():
        url = f"{BASE}/{prefix}{name}"
        data = (args.source_dir / name).read_bytes() if args.source_dir else fetch(url)
        require(sha256(data) == digest, f"Unexpected pinned source SHA256: {name}")
        raw[name] = data
        records[name] = {"url": url, "sha256": digest, "bytes": len(data)}
    license_text = raw["LICENSE.md"].decode()
    require("Everything here is public domain" in license_text and "raster + vector" in license_text, "Public-domain license missing")
    india, rivers = validate_sources(json.loads(raw["ne_10m_admin_0_countries_ind.geojson"]), json.loads(raw["ne_10m_rivers_lake_centerlines.geojson"]))
    india = {"type": "Feature", "properties": {k: india["properties"][k] for k in ("ADM0_A3", "NAME", "ADM0_A3_IN")}, "geometry": india["geometry"]}
    rivers = [{"type": "Feature", "properties": {k: f["properties"][k] for k in ("rivernum", "name", "featurecla")}, "geometry": f["geometry"]} for f in rivers]
    relief_image = None
    relief = {"status": "unavailable", "reason": "Optional relief not requested; verified outline with stylistic lighting remains usable.", "sourceUrl": RELIEF_URL}
    if args.relief_archive or args.with_relief:
        try:
            data = args.relief_archive.read_bytes() if args.relief_archive else fetch(RELIEF_URL)
            relief_image, relief = crop_relief(data)
        except (ImportError, OSError, ValueError, zipfile.BadZipFile) as error:
            relief = {"status": "unavailable", "reason": str(error), "sourceUrl": RELIEF_URL, "fallback": "Verified geographic outline with stylistic lighting, not fabricated terrain."}
    content, public = ROOT / "content/maps", ROOT / "public/maps"
    content.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)
    # All source/geometry validation completes before writing any deliverable.
    save_json(content / "india.geojson.json", india)
    save_json(content / "cauvery.geojson.json", {"type": "FeatureCollection", "crs": CRS, "features": rivers})
    (content / "LICENSE.md").write_text(license_text)
    relief_path = public / "india-shaded-relief.jpg"
    if relief_image is not None:
        relief_path.write_bytes(relief_image)
    elif relief_path.exists():
        relief_path.unlink()
    outputs = {p.name: {"sha256": sha256(p.read_bytes()), "bytes": p.stat().st_size} for p in (content / "india.geojson.json", content / "cauvery.geojson.json")}
    save_json(content / "provenance.json", {
        "provider": "Natural Earth", "credit": "Made with Natural Earth", "commit": COMMIT,
        "license": "Public domain", "licenseFile": "content/maps/LICENSE.md", "sources": records,
        "crs": CRS_NAME, "coordinateOrder": "longitude, latitude", "cartographicScale": "1:10 million (not ten-metre survey accuracy)",
        "boundaryPolicy": "India point-of-view variant; generalized cartographic depiction, not an official Survey of India map.",
        "filters": {"india": {"ADM0_A3": "IND"}, "cauvery": {"rivernum": 403}},
        "validation": {"indiaFeatures": 1, "indiaPolygons": 35, "indiaPoints": 8474, "indiaBounds": INDIA_BOUNDS, "cauveryFeatures": 2, "riverParts": 7, "riverPoints": 283, "lakeParts": 2, "lakePoints": 28},
        "outputs": outputs, "relief": relief,
        "interpretation": "Real generalized Cauvery overview; illustrative dive, not a surveyed reach. No polar-parrot occurrence is asserted.",
    })
    print(f"Validated India: 35 polygons / 8474 points; Cauvery: 7 river + 2 lake parts / 311 points. Relief: {relief['status']}")


if __name__ == "__main__":
    main()
