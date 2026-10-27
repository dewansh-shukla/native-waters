"""Validate the Swim clip of an exported fish GLB from its own bytes.

Checks the tail-beat frequency, yaw amplitude and loop seam against the
measured gait ranges in the photoreal-fish-modeling skill. Run:

    python -B tools/assets/check_swim.py public/models/fish/arulius-barb/arulius-barb-high.glb
"""

import argparse
import json
import math
import struct
import sys


def read_glb(path):
    data = open(path, "rb").read()
    magic, version, length = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        raise SystemExit("not a GLB: %s" % path)
    offset, chunks = 12, []
    while offset < length:
        size, kind = struct.unpack("<II", data[offset:offset + 8])
        offset += 8
        chunks.append((kind, data[offset:offset + size]))
        offset += size
    return json.loads(chunks[0][1].decode("utf-8")), chunks[1][1]


COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2),
              5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def accessor(gltf, binary, index):
    item = gltf["accessors"][index]
    view = gltf["bufferViews"][item["bufferView"]]
    kind, size = COMPONENTS[item["componentType"]]
    width = WIDTH[item["type"]]
    start = view.get("byteOffset", 0) + item.get("byteOffset", 0)
    count = item["count"]
    stride = view.get("byteStride") or size * width
    values = []
    for i in range(count):
        chunk = binary[start + i * stride:start + i * stride + size * width]
        values.append(struct.unpack("<" + kind * width, chunk))
    return values


def quaternion_delta(q, ref):
    """q * inverse(ref) as (angle, axis)."""
    w0, x0, y0, z0 = ref
    w1, x1, y1, z1 = q
    rw, rx, ry, rz = w0, -x0, -y0, -z0
    w = w1 * rw - x1 * rx - y1 * ry - z1 * rz
    x = w1 * rx + x1 * rw + y1 * rz - z1 * ry
    y = w1 * ry - x1 * rz + y1 * rw + z1 * rx
    z = w1 * rz + x1 * ry - y1 * rx + z1 * rw
    if w < 0:
        w, x, y, z = -w, -x, -y, -z
    w = max(-1.0, min(1.0, w))
    angle = 2.0 * math.acos(w)
    length = math.sqrt(x * x + y * y + z * z) or 1.0
    return angle, (x / length, y / length, z / length)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--min-hz", type=float, default=2.0)
    parser.add_argument("--max-hz", type=float, default=5.0)
    parser.add_argument("--min-deg", type=float, default=3.0)
    parser.add_argument("--max-seam", type=float, default=1e-4)
    args = parser.parse_args()

    gltf, binary = read_glb(args.glb)
    nodes = gltf["nodes"]
    by_name = {node.get("name"): i for i, node in enumerate(nodes)}
    if "TailFin" not in by_name:
        raise SystemExit("no TailFin node in %s" % args.glb)
    target = by_name["TailFin"]

    animation = gltf["animations"][0]
    channel = next(item for item in animation["channels"]
                   if item["target"].get("node") == target
                   and item["target"]["path"] == "rotation")
    sampler = animation["samplers"][channel["sampler"]]
    times = [value[0] for value in accessor(gltf, binary, sampler["input"])]
    quats = accessor(gltf, binary, sampler["output"])
    duration = times[-1] - times[0]
    if duration <= 0:
        raise SystemExit("zero-length clip")

    ref = quats[0]
    components = ([], [], [])
    for q in quats:
        angle, axis = quaternion_delta(q, ref)
        for index in range(3):
            components[index].append(angle * axis[index])
    # The rig's local axis for a yaw differs per bone roll, so pick whichever
    # component carries the oscillation instead of assuming Z.
    swing = max(components, key=lambda values: max(values) - min(values))
    mean = sum(swing) / len(swing)
    swing = [value - mean for value in swing]
    amplitude = 0.5 * (max(swing) - min(swing))
    crossings = 0
    for a, b in zip(swing, swing[1:]):
        if (a < 0.0) != (b < 0.0):
            crossings += 1
    hz = crossings / (2.0 * duration)
    seam = max(abs(a - b) for a, b in zip(quats[0], quats[-1]))
    degrees = math.degrees(amplitude)

    print("clip %.3fs, %d keys, tail yaw %.1f deg, %.2f Hz, seam %.2e"
          % (duration, len(times), degrees, hz, seam))
    failures = []
    if not (args.min_hz <= hz <= args.max_hz):
        failures.append("frequency %.2f Hz outside %.1f..%.1f" % (hz, args.min_hz, args.max_hz))
    if degrees < args.min_deg:
        failures.append("tail yaw %.1f deg below %.1f" % (degrees, args.min_deg))
    if seam > args.max_seam:
        failures.append("loop seam %.2e above %.2e" % (seam, args.max_seam))
    if failures:
        print("FAIL: " + "; ".join(failures))
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
