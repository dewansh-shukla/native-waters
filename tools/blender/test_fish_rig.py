"""Rig placement and skin-weight math, free of bpy."""

import sys
import unittest
from math import dist
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_rig import (  # noqa: E402
    FIN_RAYS, RIG_PLANS, SPECIES_RAYS, body_attachment, bone_names, bone_specs,
    caudal_tip_share, detail_bones, fin_base_share, fin_points, plan_for,
    ray_rows, ray_weights)
from tools.blender.fish_specs import SPECIES  # noqa: E402


class RigTests(unittest.TestCase):
    def specs_for(self, slug="arulius-barb", lod="high"):
        return bone_specs(SPECIES[slug], lod)

    def test_every_lod_has_its_planned_bone_count(self):
        # HIGH is the anatomical hero rig (77 bones including Root); MID and LOW
        # drop detail so the distance LODs stay cheap.
        for slug in SPECIES:
            counts = {lod: len(bone_specs(SPECIES[slug], lod))
                      for lod in FIN_RAYS}
            self.assertEqual(counts["high"], 77, slug)
            self.assertEqual(counts["mid"], 48, slug)
            self.assertEqual(counts["low"], 23, slug)

    def test_bone_names_are_the_deform_bones_and_nothing_else(self):
        for lod in FIN_RAYS:
            specs = self.specs_for(lod=lod)
            deform = [item[0] for item in specs if item[4]]
            names = list(bone_names(lod))
            self.assertEqual(sorted(names), sorted(deform), lod)
            self.assertNotIn("Root", names, lod)
            self.assertEqual(len(names), len(set(names)), lod)

    def test_detail_bones_exist_only_at_the_planned_lods(self):
        for lod in FIN_RAYS:
            names = {item[0] for item in self.specs_for(lod=lod)}
            for bone in detail_bones(lod):
                self.assertIn(bone, names, (lod, bone))
        low = set(bone_names("low"))
        self.assertNotIn("Eye.L", low)
        self.assertNotIn("Hyoid", low)
        self.assertNotIn("PectoralRay.L.1", low)
        self.assertIn("Eye.L", set(bone_names("high")))
        self.assertIn("Hyoid", set(bone_names("high")))

    def test_detail_bones_are_children_of_their_base_fin(self):
        specs = {item[0]: item for item in self.specs_for()}
        self.assertEqual(specs["TailFin.U"][3], "TailFin")
        self.assertEqual(specs["TailFin.U.Tip"][3], "TailFin.U")
        self.assertEqual(specs["TailFin.U.1"][3], "TailFin.U")
        for index in range(1, RIG_PLANS["high"].pectoral_rays + 1):
            self.assertEqual(specs["PectoralRay.L.%d" % index][3], "Pectoral.L")
            self.assertEqual(specs["PectoralRay.R.%d" % index][3], "Pectoral.R")
        for index in range(1, RIG_PLANS["high"].dorsal_rays + 1):
            self.assertEqual(specs["Dorsal.Ray.%d" % index][3], "Dorsal")
        for index in range(1, RIG_PLANS["high"].anal_rays + 1):
            self.assertEqual(specs["AnalRay.%d" % index][3], "AnalFin")

    def test_species_ray_counts_are_exact_at_high(self):
        self.assertEqual(FIN_RAYS["high"], SPECIES_RAYS["arulius-barb"])
        self.assertEqual(SPECIES_RAYS["arulius-barb"]["dorsal"], 12)
        self.assertEqual(SPECIES_RAYS["arulius-barb"]["anal"], 8)
        self.assertEqual(SPECIES_RAYS["arulius-barb"]["caudal"], 19)
        self.assertEqual(SPECIES_RAYS["arulius-barb"]["pectoral"], 16)
        self.assertEqual(SPECIES_RAYS["arulius-barb"]["pelvic"], 9)
        for fin in FIN_RAYS["high"]:
            self.assertGreater(FIN_RAYS["high"][fin], FIN_RAYS["low"][fin], fin)

    def test_ray_bones_sit_on_the_mesh_rows_they_deform(self):
        # The mesh is built with one row per ray, and the armature samples the
        # same polylines at the same indices, so every bone head lies on the
        # membrane root and every tail near the ray tip.
        for slug in SPECIES:
            spec = SPECIES[slug]
            points = fin_points(spec, FIN_RAYS["high"])
            specs = {item[0]: item for item in bone_specs(spec, "high")}
            plan = plan_for("high")
            for key, prefix, bones in (("dorsal", "Dorsal.Ray.", plan.dorsal_rays),
                                       ("anal", "AnalRay.", plan.anal_rays)):
                roots, tips = points[key]
                rows = [round(position * (len(roots) - 1))
                        for position in ray_rows(len(roots), bones)]
                for index, row in enumerate(rows):
                    root, tip = roots[row], tips[row]
                    bone = specs[prefix + str(index + 1)]
                    length = dist(bone[1], bone[2])
                    self.assertGreater(length, 0.6 * dist(root, tip), (slug, bone[0]))
                    self.assertLess(dist(bone[1], root), 0.25 * dist(root, tip))
                    self.assertLess(dist(bone[2], tip), 0.25 * dist(root, tip))

    def test_caudal_lobes_sit_above_and_below_the_axis(self):
        specs = {item[0]: item for item in self.specs_for()}
        self.assertGreater(specs["TailFin.U"][1][2], specs["TailFin.L"][1][2])
        self.assertGreater(specs["TailFin.U"][2][2], specs["TailFin.L"][2][2])

    def test_body_attachment_holds_only_the_root_band(self):
        self.assertAlmostEqual(body_attachment(0.0), 0.86)
        self.assertGreater(body_attachment(0.0), 0.8)
        self.assertAlmostEqual(body_attachment(0.26), 0.0)
        self.assertAlmostEqual(body_attachment(1.0), 0.0)

    def test_fin_base_share_hands_the_outer_fin_to_the_rays(self):
        self.assertAlmostEqual(fin_base_share(0.0), 1.0)
        self.assertGreater(fin_base_share(0.20), 0.4)
        self.assertAlmostEqual(fin_base_share(0.42), 0.0)
        self.assertAlmostEqual(fin_base_share(1.0), 0.0)

    def test_ray_weights_own_a_vertex_that_sits_on_a_ray(self):
        # The mesh rows carry the ray stations, so a vertex on a ray must be
        # owned outright by that ray. Blending it into its neighbour averages
        # the ripple away and leaves the fin swinging as one plate.
        for rows, bones in ((12, 12), (19, 5), (5, 3), (4, 2)):
            stations = ray_rows(rows, bones)
            for index, station in enumerate(stations):
                low, high = ray_weights(station, stations)
                owned = low if low[0] == index else high
                self.assertEqual(owned, (index, 1.0), (stations, station))

    def test_ray_weights_partition_unity_across_the_fin(self):
        for rows, bones in ((12, 12), (19, 5), (5, 3)):
            stations = ray_rows(rows, bones)
            previous = None
            for step in range(11):
                low, high = ray_weights(step / 10.0, stations)
                self.assertAlmostEqual(low[1] + high[1], 1.0)
                self.assertEqual(high[0] - low[0], 1)
                if previous is not None:
                    self.assertGreaterEqual(low[0], previous)
                previous = low[0]
            self.assertEqual(ray_weights(0.0, stations)[0], (0, 1.0))
            self.assertEqual(ray_weights(1.0, stations)[1], (len(stations) - 1, 1.0))

    def test_ray_weights_handle_a_single_station(self):
        self.assertEqual(ray_weights(0.4, (0.0,)), ((0, 1.0),))

    def test_caudal_tip_share_only_reaches_the_trailing_edge(self):
        self.assertAlmostEqual(caudal_tip_share(0.0), 0.0)
        self.assertAlmostEqual(caudal_tip_share(0.50), 0.0)
        self.assertAlmostEqual(caudal_tip_share(0.95), 1.0)
        self.assertAlmostEqual(caudal_tip_share(1.0), 1.0)


if __name__ == "__main__":
    unittest.main()
