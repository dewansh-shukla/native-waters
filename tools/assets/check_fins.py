"""Validate the fin rig, skin weights and caudal twist of an exported fish GLB.

Reads the exported bytes rather than the Blender scene, so it checks what the
browser actually receives. Run:

    python -B tools/assets/check_fins.py public/models/fish/arulius-barb/arulius-barb-high.glb
"""

import argparse
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.assets.check_swim import accessor, quaternion_delta, read_glb  # noqa: E402
from tools.blender.fish_rig import DETAIL_BONES  # noqa: E402

# The caudal fan is one fin split across three bones; a rigid hinge would use
# only the root bone.
CAUDAL_BONES = ("TailFin", "TailFin.U", "TailFin.L")
TWIST_BONE = "TailFin.U"
MIN_TWIST_DEG = 0.5
MAX_TWIST_DEG = 30.0
MIN_TWIST_CROSSINGS = 2
WEIGHT_EPS = 1e-4
MAX_INFLUENCES = 4
SUM_TOLERANCE = 1e-3
REPORT_LIMIT = 5


def _survey(gltf, binary):
    """Collect joint names, weight totals, caudal splits and influence counts."""
    nodes = gltf["nodes"]
    by_name = {}
    for index, node in enumerate(nodes):
        by_name.setdefault(node.get("name"), index)

    slot_names, slot_by_name = {}, {}
    for skin in gltf.get("skins", []):
        for slot, node_index in enumerate(skin["joints"]):
            name = nodes[node_index].get("name")
            slot_names[slot] = name
            slot_by_name.setdefault(name, slot)

    weights, bad_sums = {}, []
    caudal_split = 0
    max_influences = 0
    for node in nodes:
        if "mesh" not in node:
            continue
        mesh_name = node.get("name")
        for prim in gltf["meshes"][node["mesh"]]["primitives"]:
            attributes = prim["attributes"]
            if "JOINTS_0" not in attributes or "WEIGHTS_0" not in attributes:
                continue
            joint_rows = accessor(gltf, binary, attributes["JOINTS_0"])
            weight_rows = accessor(gltf, binary, attributes["WEIGHTS_0"])
            for row, (joints, values) in enumerate(zip(joint_rows, weight_rows)):
                non_zero = [value for value in values if value > 0.0]
                max_influences = max(max_influences, len(non_zero))
                total = sum(non_zero)
                if abs(total - 1.0) > SUM_TOLERANCE:
                    bad_sums.append((mesh_name, row, total))
                pairs = [(slot_names.get(joint, "?"), value)
                         for joint, value in zip(joints, values) if value > WEIGHT_EPS]
                for name, value in pairs:
                    weights[name] = weights.get(name, 0.0) + value
                if sum(1 for name, _ in pairs if name in CAUDAL_BONES) >= 2:
                    caudal_split += 1

    return {
        "node_by_name": by_name,
        "slot_by_name": slot_by_name,
        "weights": weights,
        "bad_sums": bad_sums,
        "caudal_split": caudal_split,
        "max_influences": max_influences,
    }


def _twist(gltf, binary, bone):
    """Signed rotation swing of one bone's animation track, in degrees.

    The swing is measured against the first key and then centred on its own
    mean, so a full cycle reads as a symmetric +/- about the rest pose.
    """
    index = next((i for i, node in enumerate(gltf["nodes"])
                  if node.get("name") == bone), None)
    if index is None:
        return None
    for animation in gltf.get("animations", []):
        for channel in animation["channels"]:
            target = channel["target"]
            if target.get("node") != index or target["path"] != "rotation":
                continue
            sampler = animation["samplers"][channel["sampler"]]
            quats = accessor(gltf, binary, sampler["output"])
            if len(quats) < 2:
                return None
            reference = quats[0]
            components = ([], [], [])
            for quat in quats:
                angle, axis = quaternion_delta(quat, reference)
                for component in range(3):
                    components[component].append(angle * axis[component])
            # The bone roll differs per fin, so the swinging axis is discovered
            # rather than assumed.
            swing = max(components, key=lambda values: max(values) - min(values))
            mean = sum(swing) / len(swing)
            values = [math.degrees(value - mean) for value in swing]
            crossings = sum(1 for a, b in zip(values, values[1:])
                            if (a < 0.0) != (b < 0.0))
            return {
                "range": (min(values), max(values)),
                "amplitude": 0.5 * (max(values) - min(values)),
                "crossings": crossings,
                "samples": len(values),
            }
    return None


def facts(path):
    """Summary numbers for one exported GLB."""
    gltf, binary = read_glb(path)
    survey = _survey(gltf, binary)
    twist = _twist(gltf, binary, TWIST_BONE)
    skins = gltf.get("skins") or [{"joints": []}]
    return {
        "bones": len(skins[0]["joints"]),
        "detail_bones": sorted(name for name in DETAIL_BONES
                               if survey["weights"].get(name, 0.0) > WEIGHT_EPS),
        "caudal_bones": sorted(name for name in CAUDAL_BONES
                               if survey["weights"].get(name, 0.0) > WEIGHT_EPS),
        "caudal_split_vertices": survey["caudal_split"],
        "max_influences": survey["max_influences"],
        "twist": None if twist is None else twist["range"],
    }


def check(path):
    """Return a list of failures; empty means the fin rig is sound."""
    gltf, binary = read_glb(path)
    survey = _survey(gltf, binary)
    failures = []

    for name in DETAIL_BONES:
        if name not in survey["node_by_name"]:
            failures.append("detail bone %s is missing from the node list" % name)
        if name not in survey["slot_by_name"]:
            failures.append("detail bone %s is not a skin joint" % name)
        if survey["weights"].get(name, 0.0) <= WEIGHT_EPS:
            failures.append("detail bone %s carries no skin weight" % name)

    for mesh_name, row, total in survey["bad_sums"][:REPORT_LIMIT]:
        failures.append("weights sum to %.4f rather than 1 on %s vertex %d"
                        % (total, mesh_name, row))
    extra = len(survey["bad_sums"]) - REPORT_LIMIT
    if extra > 0:
        failures.append("weights do not sum to 1 on %d further vertices" % extra)

    if survey["max_influences"] > MAX_INFLUENCES:
        failures.append("%d skin influences on one vertex exceeds the %d-influence limit"
                        % (survey["max_influences"], MAX_INFLUENCES))

    caudal = [name for name in CAUDAL_BONES
              if survey["weights"].get(name, 0.0) > WEIGHT_EPS]
    if len(caudal) < 2:
        failures.append("caudal fin is skinned to only %s" % (", ".join(caudal) or "nothing"))
    elif survey["caudal_split"] == 0:
        failures.append("no caudal vertex blends two caudal bones, so the fan cannot share")

    twist = _twist(gltf, binary, TWIST_BONE)
    if twist is None:
        failures.append("tail twist has no %s rotation track" % TWIST_BONE)
    else:
        if twist["crossings"] < MIN_TWIST_CROSSINGS:
            failures.append("tail twist never reverses sign on %s (%d crossings)"
                            % (TWIST_BONE, twist["crossings"]))
        if not MIN_TWIST_DEG <= twist["amplitude"] <= MAX_TWIST_DEG:
            failures.append("tail twist on %s is %.2f deg, outside %.1f..%.1f"
                            % (TWIST_BONE, twist["amplitude"], MIN_TWIST_DEG, MAX_TWIST_DEG))

    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    arguments = parser.parse_args()

    report = facts(arguments.glb)
    twist = report["twist"]
    print("bones %d, detail %d, caudal %s, max influences %d, twist %s"
          % (report["bones"], len(report["detail_bones"]),
             "/".join(report["caudal_bones"]) or "none", report["max_influences"],
             "none" if twist is None else "%.1f..%.1f deg" % twist))
    failures = check(arguments.glb)
    if failures:
        for failure in failures:
            print("FAIL: " + failure)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
