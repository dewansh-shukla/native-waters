"""Validate the exported silhouette against the measured reference ratios.

The photoreal spec (tools/blender/fish_specs.py MEASUREMENTS) was taken from a
grid overlay on the reference photographs with +/-0.02 tolerance. This script
reads the exported GLB bytes and checks the species ratios that can be read
from the mesh alone: body depth, eye diameter and caudal length as fractions
of standard length, plus flank compression (width/depth). Run:

    python -B tools/assets/check_silhouette.py \
        public/models/fish/arulius-barb/arulius-barb-high.glb
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.assets.check_swim import accessor, read_glb  # noqa: E402
from tools.blender.fish_specs import MEASUREMENTS  # noqa: E402

# Species is inferred from the GLB filename (`<variant>-<lod>.glb`); danio
# variants share the zebra-danio measurement set.
TOLERANCE = 0.035
EYE_TOLERANCE = 0.020


def mesh_bounds(gltf, binary, name):
    for node in gltf["nodes"]:
        if node.get("name") != name or "mesh" not in node:
            continue
        lows = [float("inf")] * 3
        highs = [float("-inf")] * 3
        for prim in gltf["meshes"][node["mesh"]]["primitives"]:
            for point in accessor(gltf, binary, prim["attributes"]["POSITION"]):
                for axis in range(3):
                    lows[axis] = min(lows[axis], point[axis])
                    highs[axis] = max(highs[axis], point[axis])
        return lows, highs
    return None, None


def slug_of(path):
    stem = Path(path).stem
    for lod in ("-high", "-mid", "-low"):
        if stem.endswith(lod):
            stem = stem[: -len(lod)]
            break
    if stem.startswith("zebra-danio"):
        return "zebra-danio"
    return stem


def facts(path):
    gltf, binary = read_glb(path)
    body_lo, body_hi = mesh_bounds(gltf, binary, "FishBody")
    fin_lo, fin_hi = mesh_bounds(gltf, binary, "FishFin")
    eye_lo, eye_hi = mesh_bounds(gltf, binary, "FishEye")
    if body_lo is None:
        raise SystemExit("no FishBody mesh in %s" % path)
    # glTF space: X along the body (-X head), Y dorsal, Z lateral.
    standard_length = body_hi[0] - body_lo[0]
    depth = body_hi[1] - body_lo[1]
    width = body_hi[2] - body_lo[2]
    out = {
        "standard_length": standard_length,
        "depth_sl": depth / standard_length,
        "width_depth": width / depth,
    }
    if fin_hi is not None:
        out["caudal_sl"] = (fin_hi[0] - body_hi[0]) / standard_length
    if eye_lo is not None and eye_hi is not None:
        out["eye_sl"] = (eye_hi[1] - eye_lo[1]) / standard_length
    return out


def check(path):
    """Return a list of failures; empty means the silhouette matches spec."""
    slug = slug_of(path)
    spec = MEASUREMENTS.get(slug)
    if spec is None:
        return ["unknown species %r for %s" % (slug, path)]
    got = facts(path)
    failures = []
    for key, wanted in (("depth_sl", spec["depth_SL"]),
                        ("caudal_sl", spec["caudal_length_SL"]),
                        ("eye_sl", spec["eye_SL"])):
        if key not in got:
            continue
        tolerance = EYE_TOLERANCE if key == "eye_sl" else TOLERANCE
        if abs(got[key] - wanted) > tolerance:
            failures.append("%s %.3f vs measured %.3f (tolerance %.3f)"
                            % (key, got[key], wanted, tolerance))
    if not 0.25 <= got["width_depth"] <= 0.55:
        failures.append("width/depth %.3f outside 0.25..0.55: the flank is a tube or a blade"
                        % got["width_depth"])
    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    arguments = parser.parse_args()
    report = facts(arguments.glb)
    print(" ".join("%s %.3f" % (key, value) for key, value in sorted(report.items())))
    failures = check(arguments.glb)
    for failure in failures:
        print("FAIL: " + failure)
    if failures:
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
