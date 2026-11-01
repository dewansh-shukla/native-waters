"""Rig placement and skin-weight math, free of bpy."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from tools.blender.fish_rig import (DETAIL_BONES, body_attachment, bone_specs,  # noqa: E402
                                    caudal_lobe_weights, dorsal_chain_weights,
                                    span_weights)
from tools.blender.fish_specs import SPECIES  # noqa: E402


class RigTests(unittest.TestCase):
    def test_every_species_has_24_bones_and_seven_new_ones(self):
        for slug in SPECIES:
            specs = bone_specs(SPECIES[slug])
            names = [item[0] for item in specs]
            self.assertEqual(len(names), 24, slug)
            self.assertEqual(len(set(names)), 24, slug)
            for bone in DETAIL_BONES:
                self.assertIn(bone, names, slug)

    def test_detail_bones_are_children_of_their_base_fin(self):
        specs = {item[0]: item for item in bone_specs(SPECIES["arulius-barb"])}
        self.assertEqual(specs["TailFin.U"][3], "TailFin")
        self.assertEqual(specs["Pectoral.L.Tip"][3], "Pectoral.L")
        self.assertEqual(specs["Dorsal.Mid"][3], "Dorsal")
        self.assertEqual(specs["Dorsal.Tip"][3], "Dorsal.Mid")

    def test_caudal_lobes_sit_above_and_below_the_axis(self):
        specs = {item[0]: item for item in bone_specs(SPECIES["arulius-barb"])}
        self.assertGreater(specs["TailFin.U"][1][2], specs["TailFin.L"][1][2])
        self.assertGreater(specs["TailFin.U"][2][2], specs["TailFin.L"][2][2])

    def test_body_attachment_holds_only_the_root_band(self):
        self.assertAlmostEqual(body_attachment(0.0), 1.0)
        self.assertAlmostEqual(body_attachment(0.25), 0.0)
        self.assertAlmostEqual(body_attachment(1.0), 0.0)

    def test_span_weights_partition_unity(self):
        previous = -1.0
        for span in (0.0, 0.33, 0.5, 0.75, 1.0):
            root, tip = span_weights(span)
            self.assertAlmostEqual(root + tip, 1.0)
            self.assertGreaterEqual(tip, previous)
            previous = tip
        self.assertAlmostEqual(span_weights(1.0)[1], 1.0)

    def test_low_lod_rings_reach_the_tip_bone(self):
        # LOW has three rings along the ray, so span is 0.0, 0.5 or 1.0.
        self.assertGreater(span_weights(1.0)[1], 0.99)

    def test_dorsal_chain_partitions_unity_and_reaches_every_segment(self):
        for u in (0.0, 0.25, 0.5, 0.75, 1.0):
            weights = dorsal_chain_weights(u)
            self.assertAlmostEqual(sum(weights), 1.0)
        self.assertGreater(dorsal_chain_weights(0.0)[0], 0.99)
        self.assertGreater(dorsal_chain_weights(1.0)[2], 0.99)
        self.assertGreater(dorsal_chain_weights(0.5)[1], 0.99)

    def test_caudal_lobe_weights_are_a_smooth_split(self):
        self.assertAlmostEqual(caudal_lobe_weights(0.0)[0], 0.5)
        self.assertAlmostEqual(caudal_lobe_weights(1.0)[0], 1.0)
        self.assertAlmostEqual(caudal_lobe_weights(-1.0)[0], 0.0)


if __name__ == "__main__":
    unittest.main()
