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

    def test_fin_membrane_bows_and_thins_towards_its_edge(self):
        # A ruled sheet of constant thickness is what makes a fin read as
        # cardboard: the surface must bow out and the trailing edge must thin.
        roots = [(0.0, 0.0, 0.0), (0.1, 0.0, 0.0), (0.2, 0.0, 0.0)]
        tips = [(0.0, 1.0, 0.15), (0.1, 1.0, 0.20), (0.2, 1.0, 0.15)]
        columns = 4
        g = fin(roots, tips, 0.02, columns)
        cols = columns + 1
        sheet = 3 * cols  # the bottom half starts after every top vertex

        def top(row, column):
            return g.vertices[row * cols + column]

        def bottom(row, column):
            return g.vertices[sheet + row * cols + column]

        def surface_z(row, column):
            return 0.5 * (top(row, column)[2] + bottom(row, column)[2])

        def thickness(row, column):
            return top(row, column)[2] - bottom(row, column)[2]

        ruled = [0.0, 0.05, 0.10, 0.15, 0.20]
        for column in (0, 2, 4):
            self.assertGreater(surface_z(1, column), ruled[column] + 0.002)
        self.assertGreater(surface_z(1, 2), ruled[2] + 0.02)
        # Thinner at the trailing edge than at the base, on every ray.
        for row in (0, 1, 2):
            self.assertGreater(thickness(row, 0), thickness(row, columns))
        # And thinner on the outer rays than on the root ray.
        self.assertGreater(thickness(0, 0), thickness(2, 0))

    def test_sphere_counts(self):
        g = sphere((0, 0, 0), (0.1, 0.1, 0.1), 8, 6)
        self.assertGreater(len(g.vertices), 8)
        self.assertTrue(all(len(f) in (3, 4) for f in g.faces))
        self.assertEqual(len(g.uvs), len(g.vertices))

    def test_sphere_disc_uv_covers_the_silhouette_once(self):
        # The eye is mapped as a disc on its lateral face; the centre vertex
        # must sample the middle of the iris texture and the rim the outer
        # edge, in both directions.
        g = sphere((0, 0, 0), (0.1, 0.05, 0.1), 16, 8, uv="disc")
        centre = min(g.uvs, key=lambda uv: abs(uv[0] - 0.5) + abs(uv[1] - 0.5))
        self.assertAlmostEqual(centre[0], 0.5)
        self.assertAlmostEqual(centre[1], 0.5)
        self.assertTrue(all(0.0 <= u <= 1.0 and 0.0 <= v <= 1.0 for u, v in g.uvs))
        # ±x and ±z map to opposite sides of the texture, so the iris is not
        # squashed into a band the way an equirectangular wrap would.
        xs = [uv[0] for uv, vertex in zip(g.uvs, g.vertices) if abs(vertex[1]) < 1e-9]
        zs = [uv[1] for uv, vertex in zip(g.uvs, g.vertices) if abs(vertex[1]) < 1e-9]
        self.assertAlmostEqual(min(xs), 0.0)
        self.assertAlmostEqual(max(xs), 1.0)
        self.assertAlmostEqual(min(zs), 0.0)
        self.assertAlmostEqual(max(zs), 1.0)

    def test_sphere_rejects_unknown_uv_mode(self):
        with self.assertRaises(ValueError):
            sphere((0, 0, 0), (0.1, 0.1, 0.1), 8, 6, uv="spherical")

    def test_tube_is_closed_and_indexed(self):
        g = tube([(0, 0, 0), (0.2, 0, 0), (0.4, 0.1, 0)], 0.01, 6)
        self.assertGreater(len(g.vertices), 6)
        self.assertTrue(all(len(f) in (3, 4) for f in g.faces))
        self.assertTrue(all(0 <= i < len(g.vertices) for f in g.faces for i in f))
        self.assertEqual(len(g.uvs), len(g.vertices))


if __name__ == "__main__":
    unittest.main()
