import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.assets.fish_budgets import (  # noqa: E402
    BYTE_CAPS, LODS, PRIMITIVE_CAPS, REQUIRED_BONES, SPECIES, TRIANGLE_CAPS, glb_path,
)


class BudgetTests(unittest.TestCase):
    def test_eighteen_unique_paths(self):
        paths = [glb_path(slug, lod) for slug in SPECIES for lod in LODS]
        self.assertEqual(len(paths), 18)
        self.assertEqual(len({str(p) for p in paths}), 18)

    def test_caps_increase_with_lod_and_fit_totals(self):
        for slug in SPECIES:
            caps = TRIANGLE_CAPS[slug]
            self.assertGreater(caps["high"], caps["mid"])
            self.assertGreater(caps["mid"], caps["low"])
        high_total = TRIANGLE_CAPS["arulius-barb"]["high"] * 3 + TRIANGLE_CAPS["zebra-danio"]["high"] * 5
        low_total = TRIANGLE_CAPS["arulius-barb"]["low"] * 3 + TRIANGLE_CAPS["zebra-danio"]["low"] * 5
        self.assertLessEqual(high_total, 90000)
        self.assertLessEqual(low_total, 12000)
        self.assertLessEqual(BYTE_CAPS["low"], 250000)
        self.assertEqual(PRIMITIVE_CAPS, {"high": 6, "mid": 6, "low": 4})

    def test_required_bones_and_family_paths(self):
        self.assertEqual(len(REQUIRED_BONES), 16)
        self.assertIn("Gill.L", REQUIRED_BONES)
        self.assertIn("AnalFin", REQUIRED_BONES)
        self.assertEqual(glb_path("arulius-barb", "high").as_posix(),
                         "public/models/fish/arulius-barb/arulius-barb-high.glb")
        self.assertEqual(glb_path("zebra-danio-wild", "low").as_posix(),
                         "public/models/fish/zebra-danio/zebra-danio-wild-low.glb")


if __name__ == "__main__":
    unittest.main()
