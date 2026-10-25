import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_specs import SPECIES, profile  # noqa: E402


class SpecTests(unittest.TestCase):
    def test_species_and_variants(self):
        self.assertEqual(set(SPECIES), {"arulius-barb", "zebra-danio"})
        self.assertEqual(len(SPECIES["zebra-danio"].variants), 5)
        self.assertEqual(len(SPECIES["arulius-barb"].variants), 1)

    def test_profile_tapers_and_fits_two_units(self):
        for slug in SPECIES:
            for t in (0.0, 0.25, 0.5, 0.75, 1.0):
                h, w, z = profile(slug, t)
                self.assertGreater(h, 0)
                self.assertGreater(w, 0)
                self.assertGreater(h, w)
            self.assertGreater(profile(slug, 0.45)[0], profile(slug, 0.02)[0])
            self.assertGreater(profile(slug, 0.45)[0], profile(slug, 0.98)[0])


if __name__ == "__main__":
    unittest.main()
