import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_geometry import fin, loft, sphere, tube  # noqa: E402
from tools.blender.fish_specs import SPECIES  # noqa: E402


class GeometryTests(unittest.TestCase):
    def test_loft_is_indexed_and_uv_mapped(self):
        g = loft(SPECIES["zebra-danio"], 12, 8)
        self.assertEqual(len(g.faces), 12 * 8 * 2)
        self.assertTrue(all(0 <= i < len(g.vertices) for f in g.faces for i in f))
        self.assertTrue(all(0.0 <= u <= 1.0 and 0.0 <= v <= 1.0 for u, v in g.uvs))
        self.assertEqual(len(g.uvs), len(g.vertices))
        xs = [p[0] for p in g.vertices]
        self.assertAlmostEqual(max(xs) - min(xs), 1.8, places=3)

    def test_fin_has_two_sides_and_a_rim(self):
        g = fin([(0, 0, 0), (0.2, 0, 0)], [(0, 0.4, 0), (0.2, 0.4, 0)], 0.01, 2)
        self.assertGreater(len(g.faces), 4)
        self.assertTrue(all(len(f) == 4 for f in g.faces))
        self.assertAlmostEqual(min(p[2] for p in g.vertices), -0.005, places=4)
        self.assertEqual(len(g.uvs), len(g.vertices))

    def test_sphere_counts(self):
        g = sphere((0, 0, 0), (0.1, 0.1, 0.1), 8, 6)
        self.assertGreater(len(g.vertices), 8)
        self.assertTrue(all(len(f) in (3, 4) for f in g.faces))
        self.assertEqual(len(g.uvs), len(g.vertices))

    def test_tube_is_closed_and_indexed(self):
        g = tube([(0, 0, 0), (0.2, 0, 0), (0.4, 0.1, 0)], 0.01, 6)
        self.assertGreater(len(g.vertices), 6)
        self.assertTrue(all(len(f) in (3, 4) for f in g.faces))
        self.assertTrue(all(0 <= i < len(g.vertices) for f in g.faces for i in f))
        self.assertEqual(len(g.uvs), len(g.vertices))


if __name__ == "__main__":
    unittest.main()
