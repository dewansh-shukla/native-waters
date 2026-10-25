import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.assets.fish_budgets import (  # noqa: E402
    BYTE_CAPS, PRIMITIVE_CAPS, REQUIRED_BONES, TRIANGLE_CAPS, glb_path,
)

CLI = ROOT / "tools/assets/validate_fish_glb.py"


class AruliusStructure(unittest.TestCase):
    def facts_for(self, lod):
        path = ROOT / glb_path("arulius-barb", lod)
        self.assertTrue(path.exists(), path)
        args = [sys.executable, "-B", str(CLI), str(path),
                "--triangles", str(TRIANGLE_CAPS["arulius-barb"][lod]),
                "--primitives", str(PRIMITIVE_CAPS[lod]),
                "--bytes", str(BYTE_CAPS[lod]), "--clip", "Swim"]
        for bone in REQUIRED_BONES:
            args += ["--bone", bone]
        result = subprocess.run(args, capture_output=True, text=True)
        facts = json.loads(result.stdout)
        self.assertEqual(result.returncode, 0, facts)
        return facts

    def test_three_lods_validate(self):
        for lod in ("high", "mid", "low"):
            facts = self.facts_for(lod)
            self.assertEqual(facts["axis"], {"head": "-X", "dorsal": "+Y"})
            self.assertEqual(len(facts["bones"]), 1)
            self.assertLessEqual(len(facts["materials"]), 2 if lod == "low" else 4)

    def test_arulius_texture_maps_and_memory(self):
        high = self.facts_for("high")
        low = self.facts_for("low")
        for facts, size, has_roughness in ((high, 1024, True), (low, 512, False)):
            body = next(material for material in facts["materials"] if material["name"] == "FishBody")
            self.assertEqual(facts["images"][body["maps"]["color"]]["dimensions"], [size, size])
            self.assertEqual(facts["images"][body["maps"]["normal"]]["dimensions"], [size, size])
            self.assertEqual("roughness" in body["maps"], has_roughness)
        eye = next(material for material in high["materials"] if material["name"] == "FishEye")
        self.assertEqual(high["images"][eye["maps"]["color"]]["dimensions"], [256, 256])
        texture_bytes = sum(image["dimensions"][0] * image["dimensions"][1] * 4
                            for facts in (high, low) for image in facts["images"]) * 4 / 3
        self.assertLessEqual(texture_bytes, 22 * 1024 * 1024)



if __name__ == "__main__":
    unittest.main()
