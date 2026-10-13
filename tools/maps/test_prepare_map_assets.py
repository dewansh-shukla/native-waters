import copy
import json
import unittest
from pathlib import Path

from prepare_map_assets import validate_sources, validate_world_file

ROOT = Path(__file__).resolve().parents[2]
CRS = {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}}


class SourceValidationTests(unittest.TestCase):
    def setUp(self):
        self.india = {"type": "FeatureCollection", "crs": CRS, "features": [json.loads((ROOT / "content/maps/india.geojson.json").read_text())]}
        self.rivers = json.loads((ROOT / "content/maps/cauvery.geojson.json").read_text())

    def test_preserves_actual_geometry_and_every_part(self):
        india, rivers = validate_sources(self.india, self.rivers)
        self.assertEqual(india["geometry"], self.india["features"][0]["geometry"])
        self.assertEqual([f["geometry"] for f in rivers], [f["geometry"] for f in self.rivers["features"]])

    def test_rejects_missing_or_duplicate_selected_features(self):
        for source in (self.india, self.rivers):
            saved = copy.deepcopy(source["features"])
            source["features"] = []
            with self.assertRaises(ValueError):
                validate_sources(self.india, self.rivers)
            source["features"] = saved + saved
            with self.assertRaises(ValueError):
                validate_sources(self.india, self.rivers)
            source["features"] = saved

    def test_rejects_reversed_coordinates_unclosed_rings_nonfinite_or_lost_islands(self):
        for mutation in ("reverse", "unclosed", "nan", "island"):
            bad = copy.deepcopy(self.india)
            polygons = bad["features"][0]["geometry"]["coordinates"]
            if mutation == "reverse":
                for polygon in polygons:
                    for ring in polygon:
                        for point in ring:
                            point.reverse()
            elif mutation == "unclosed":
                polygons[0][0][-1][0] += 0.001
            elif mutation == "nan":
                polygons[0][0][1][0] = float("nan")
            else:
                polygons.pop()
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_sources(bad, self.rivers)

    def test_rejects_empty_part_wrong_feature_class_or_wrong_crs(self):
        for mutation in ("empty", "class", "crs"):
            bad = copy.deepcopy(self.rivers)
            if mutation == "empty":
                bad["features"][0]["geometry"]["coordinates"][0] = []
            elif mutation == "class":
                bad["features"][0]["properties"]["featurecla"] = "River"
            else:
                bad["crs"] = {"type": "name", "properties": {"name": "EPSG:3857"}}
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                validate_sources(self.india, bad)


class ReliefGeoreferenceTests(unittest.TestCase):
    def test_valid_world_file_has_pixel_center_to_edge_bounds(self):
        self.assertEqual(validate_world_file([1 / 30, 0, 0, -1 / 30, -180 + 1 / 60, 90 - 1 / 60], (10800, 5400)), [-180, -90, 180, 90])

    def test_rejects_rotated_flipped_shifted_or_incomplete_world_file(self):
        good = [1 / 30, 0, 0, -1 / 30, -180 + 1 / 60, 90 - 1 / 60]
        for bad in (good[:5], [1 / 30, 0.1, 0, -1 / 30, good[4], good[5]], [1 / 30, 0, 0, 1 / 30, good[4], good[5]], [1 / 30, 0, 0, -1 / 30, 0, 0]):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                validate_world_file(bad, (10800, 5400))


if __name__ == "__main__":
    unittest.main()
