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
    def test_three_lods_validate(self):
        for lod in ("high", "mid", "low"):
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
            self.assertEqual(facts["axis"], {"head": "-X", "dorsal": "+Y"})
            self.assertEqual(len(facts["bones"]), 1)
            self.assertLessEqual(len(facts["materials"]), 2 if lod == "low" else 4)


if __name__ == "__main__":
    unittest.main()
