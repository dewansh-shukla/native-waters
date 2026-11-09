"""Fin rig checks against the real export plus in-memory mutations."""

import json
import shutil
import struct
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.assets.check_fins import check, facts  # noqa: E402

HIGH = ROOT / "public/models/fish/arulius-barb/arulius-barb-high.glb"


def unpack(data):
    size = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + size])
    return doc, bytearray(data[28 + size:])


def pack(doc, binary):
    text = json.dumps(doc, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    binary += b"\0" * (-len(binary) % 4)
    return (struct.pack("<4sII", b"glTF", 2, 28 + len(text) + len(binary))
            + struct.pack("<II", len(text), 0x4E4F534A) + text
            + struct.pack("<II", len(binary), 0x004E4942) + binary)


def address(doc, accessor, row=0):
    item = doc["accessors"][accessor]
    view = doc["bufferViews"][item["bufferView"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[item["type"]]
    size = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[item["componentType"]]
    return view.get("byteOffset", 0) + item.get("byteOffset", 0) + row * view.get(
        "byteStride", width * size)


KINDS = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}


def read(doc, binary, index, row=0):
    """One accessor row, unpacked with the accessor's own component type."""
    item = doc["accessors"][index]
    kind = KINDS[item["componentType"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[item["type"]]
    return struct.unpack_from("<" + kind * width, binary, address(doc, index, row))


def write(doc, binary, index, row, values):
    item = doc["accessors"][index]
    kind = KINDS[item["componentType"]]
    struct.pack_into("<" + kind * len(values), binary, address(doc, index, row), *values)


class FinCheckTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = HIGH.read_bytes()
        cls.tmp = Path(tempfile.mkdtemp(prefix="check-fins-"))
        cls.serial = 0

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def written(self, doc, binary):
        type(self).serial += 1
        path = self.tmp / ("fish-%d.glb" % self.serial)
        path.write_bytes(pack(doc, binary))
        return path

    def mutated(self, mutate):
        doc, binary = unpack(self.data)
        mutate(doc, binary)
        return self.written(doc, binary)

    def test_real_asset_passes(self):
        self.assertEqual(check(HIGH), [])

    def test_real_asset_reports_every_detail_bone(self):
        report = facts(HIGH)
        # The fan is shared across the peduncle, two lobes, five ray bones per
        # lobe and two trailing-edge tips on the hero rig.
        self.assertTrue({"TailFin", "TailFin.U", "TailFin.L",
                         "TailFin.U.1", "TailFin.L.1",
                         "TailFin.U.Tip", "TailFin.L.Tip"} <= set(report["caudal_bones"]))
        self.assertTrue(all(name.startswith("TailFin") for name in report["caudal_bones"]))
        low, high = report["twist"]
        self.assertLess(low, -0.5)
        self.assertGreater(high, 0.5)

    def test_missing_detail_bone_node_is_reported(self):
        def mutate(doc, binary):
            for node in doc["nodes"]:
                if node.get("name") == "TailFin.U":
                    node["name"] = "TailFin.U.old"
        path = self.mutated(mutate)
        self.assertTrue(any("TailFin.U" in failure for failure in check(path)))

    def test_unweighted_detail_bone_is_reported(self):
        def mutate(doc, binary):
            target = next(i for i, bone in enumerate(doc["skins"][0]["joints"])
                          if doc["nodes"][bone].get("name") == "TailFin.L")
            for node in doc["nodes"]:
                if "mesh" not in node:
                    continue
                for prim in doc["meshes"][node["mesh"]]["primitives"]:
                    attrs = prim["attributes"]
                    if "JOINTS_0" not in attrs:
                        continue
                    for row in range(doc["accessors"][attrs["WEIGHTS_0"]]["count"]):
                        joints = read(doc, binary, attrs["JOINTS_0"], row)
                        if target in joints:
                            weights = list(read(doc, binary, attrs["WEIGHTS_0"], row))
                            weights[joints.index(target)] = 0.0
                            write(doc, binary, attrs["WEIGHTS_0"], row, weights)
        path = self.mutated(mutate)
        self.assertTrue(any("TailFin.L" in failure for failure in check(path)))

    def test_weights_that_do_not_sum_to_one_are_reported(self):
        def mutate(doc, binary):
            for node in doc["nodes"]:
                if node.get("name") != "FishFin" or "mesh" not in node:
                    continue
                for prim in doc["meshes"][node["mesh"]]["primitives"]:
                    attrs = prim["attributes"]
                    if "JOINTS_0" not in attrs:
                        continue
                    weights = read(doc, binary, attrs["WEIGHTS_0"], 0)
                    write(doc, binary, attrs["WEIGHTS_0"], 0,
                          tuple(weight * 0.5 for weight in weights))
        path = self.mutated(mutate)
        self.assertTrue(any("sum" in failure.lower() for failure in check(path)))

    def test_flat_twist_is_reported(self):
        def mutate(doc, binary):
            node = next(i for i, item in enumerate(doc["nodes"])
                        if item.get("name") == "TailFin.U")
            animation = doc["animations"][0]
            for channel in animation["channels"]:
                if channel["target"].get("node") == node and channel["target"]["path"] == "rotation":
                    sampler = animation["samplers"][channel["sampler"]]
                    count = doc["accessors"][sampler["output"]]["count"]
                    first = read(doc, binary, sampler["output"], 0)
                    for row in range(count):
                        write(doc, binary, sampler["output"], row, first)
        path = self.mutated(mutate)
        self.assertTrue(any("twist" in failure.lower() for failure in check(path)))


if __name__ == "__main__":
    unittest.main()
