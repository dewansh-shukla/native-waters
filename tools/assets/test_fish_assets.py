import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from tools.assets.fish_budgets import (  # noqa: E402
    BYTE_CAPS, LODS, PRIMITIVE_CAPS, REQUIRED_BONES, SPECIES, TRIANGLE_CAPS, glb_path,
)

CLI = ROOT / "tools/assets/validate_fish_glb.py"
MIB = 1024 * 1024
STANDARD_DANIO = "zebra-danio"
DANIO_VARIANTS = tuple(slug for slug in SPECIES if slug.startswith("zebra-danio-"))


def albedo_dimensions(lod):
    return 512 if lod == "low" else 1024


def normal_dimensions(slug, lod):
    """The Arulius carries a 1024 normal map at high; the danios stay at 512."""
    return 1024 if slug == "arulius-barb" and lod == "high" else 512


class FishAssetContract(unittest.TestCase):
    def facts_for(self, slug, lod):
        path = ROOT / glb_path(slug, lod)
        self.assertTrue(path.exists(), path)
        args = [sys.executable, "-B", str(CLI), str(path),
                "--triangles", str(TRIANGLE_CAPS[slug][lod]),
                "--primitives", str(PRIMITIVE_CAPS[lod]),
                "--bytes", str(BYTE_CAPS[lod]), "--clip", "Swim"]
        for bone in REQUIRED_BONES:
            args += ["--bone", bone]
        result = subprocess.run(args, capture_output=True, text=True)
        facts = json.loads(result.stdout)
        self.assertEqual(result.returncode, 0, facts)
        return facts

    def body_material(self, facts):
        return next(material for material in facts["materials"]
                    if material["name"] == "FishBody")

    def body_color_sha256(self, slug, lod):
        facts = self.facts_for(slug, lod)
        return facts["images"][self.body_material(facts)["maps"]["color"]]["sha256"]

    def test_all_species_lods_validate(self):
        for slug in SPECIES:
            for lod in LODS:
                facts = self.facts_for(slug, lod)
                where = (slug, lod)
                self.assertEqual(facts["axis"], {"head": "-X", "dorsal": "+Y"}, where)
                self.assertEqual(len(facts["bones"]), 1, where)  # exactly one skin
                self.assertLessEqual(len(facts["materials"]),
                                     2 if lod == "low" else 4, where)
                body = self.body_material(facts)
                self.assertEqual(facts["images"][body["maps"]["color"]]["dimensions"],
                                 [albedo_dimensions(lod)] * 2, where)
                self.assertEqual(facts["images"][body["maps"]["normal"]]["dimensions"],
                                 [normal_dimensions(slug, lod)] * 2, where)
                self.assertEqual("roughness" in body["maps"], lod != "low", where)

    def test_texture_memory_budgets(self):
        def texture_bytes(slug, lod):
            facts = self.facts_for(slug, lod)
            return sum(image["dimensions"][0] * image["dimensions"][1] * 4
                       for image in facts["images"])
        high = sum(texture_bytes(slug, "high") for slug in SPECIES) * 4 / 3
        low = sum(texture_bytes(slug, "low") for slug in SPECIES) * 4 / 3
        self.assertLessEqual(high, 56 * MIB, "summed HIGH texture memory with mips")
        self.assertLessEqual(low, 18 * MIB, "summed LOW texture memory with mips")
        payload = sum((ROOT / glb_path(slug, "high")).stat().st_size for slug in SPECIES)
        self.assertLessEqual(payload, 6_000_000, "summed HIGH GLB payload")

    def test_danio_variant_albedos_differ(self):
        for lod in LODS:
            standard = self.body_color_sha256(STANDARD_DANIO, lod)
            for variant in DANIO_VARIANTS:
                self.assertNotEqual(self.body_color_sha256(variant, lod),
                                    standard, (variant, lod))


if __name__ == "__main__":
    unittest.main()
