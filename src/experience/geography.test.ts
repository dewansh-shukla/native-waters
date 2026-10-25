import { describe, expect, it } from "vitest";
import india from "../../content/maps/india.geojson.json";
import cauvery from "../../content/maps/cauvery.geojson.json";
import rivers from "../../content/maps/rivers.geojson.json";
import { CAUVERY_ANCHOR, CAUVERY_PARTS, INDIA_BOUNDS, INDIA_SHAPES, MAP_TOP, RIVER_LABELS, TRIBUTARY_RIVERS, RELIEF_CONFIG, projectLonLat } from "./geography";

describe("sourced map geography", () => {
  it("preserves all island polygons, rings, and finite CRS84 bounds", () => {
    expect(INDIA_SHAPES).toEqual(india.geometry.coordinates);
    expect(INDIA_SHAPES).toHaveLength(35);
    const points = INDIA_SHAPES.flat(2);
    expect(points).toHaveLength(8474);
    for (const polygon of INDIA_SHAPES) for (const ring of polygon) {
      expect(ring[0]).toEqual(ring.at(-1));
      for (const point of ring) {
        expect(point.every(Number.isFinite)).toBe(true);
        expect(point[0]).toBeGreaterThanOrEqual(INDIA_BOUNDS[0]);
        expect(point[0]).toBeLessThanOrEqual(INDIA_BOUNDS[2]);
        expect(point[1]).toBeGreaterThanOrEqual(INDIA_BOUNDS[1]);
        expect(point[1]).toBeLessThanOrEqual(INDIA_BOUNDS[3]);
      }
    }
    expect(INDIA_BOUNDS).toEqual([68.143403, 6.745551, 97.362253, 37.054484]);
  });

  it("keeps river and lake parts separate without invented connecting vertices", () => {
    expect(CAUVERY_PARTS).toEqual(cauvery.features.flatMap((feature) => feature.geometry.coordinates));
    expect(CAUVERY_PARTS).toHaveLength(9);
    expect(CAUVERY_PARTS.flat()).toHaveLength(311);
    expect(cauvery.features.map((f) => [f.properties.featurecla, f.geometry.coordinates.length, f.geometry.coordinates.flat().length]))
      .toEqual([["Lake Centerline", 2, 28], ["River", 7, 283]]);
    for (const part of CAUVERY_PARTS) {
      expect(part.length).toBeGreaterThan(1);
      expect(part.flat().every(Number.isFinite)).toBe(true);
    }
  });

  it("uses one centered transform with east positive X, north negative Z, and a 15.15-unit country height", () => {
    const center: [number, number] = [82.752828, 21.9000175];
    expect(projectLonLat(center).toArray()).toEqual([0, 8, 0]);
    expect(MAP_TOP).toBe(8);
    expect(projectLonLat([center[0] + 1, center[1]]).x).toBeCloseTo(0.46391807, 8);
    expect(projectLonLat([center[0], center[1] + 1]).z).toBe(-0.5);
    expect(projectLonLat([center[0], INDIA_BOUNDS[1]]).z - projectLonLat([center[0], INDIA_BOUNDS[3]]).z).toBeCloseTo(15.1544665);
  });

  it("anchors an actual vertex of the geometrically longest river part, never a lake or interpolated point", () => {
    const river = cauvery.features.find((feature) => feature.properties.featurecla === "River")!;
    const length = (part: number[][]) => part.slice(1).reduce((sum, point, i) => {
      const dx = (point[0] - part[i][0]) * Math.cos(21.9000175 * Math.PI / 180);
      return sum + Math.hypot(dx, point[1] - part[i][1]);
    }, 0);
    const longest = [...river.geometry.coordinates].sort((a, b) => length(b) - length(a))[0];
    expect(longest.some((point) => projectLonLat(point as [number, number]).equals(CAUVERY_ANCHOR))).toBe(true);
    expect(CAUVERY_ANCHOR.y).toBe(8);
    expect(CAUVERY_ANCHOR.x).toBeLessThan(0);
    expect(CAUVERY_ANCHOR.z).toBeGreaterThan(0);
  });

  it("exposes the four catalog tributaries with trimmed, finite multi-line geometry", () => {
    expect(TRIBUTARY_RIVERS.map((river) => river.name)).toEqual(["Ganga", "Brahmaputra", "Krishna", "Godavari"]);
    expect(TRIBUTARY_RIVERS.map((river) => river.parts).flat()).toEqual(
      (rivers.features as { geometry: { coordinates: number[][][] } }[]).flatMap((feature) => feature.geometry.coordinates)
    );
    for (const river of TRIBUTARY_RIVERS) for (const part of river.parts) {
      expect(part.length).toBeGreaterThan(1);
      for (const point of part) {
        expect(point.every(Number.isFinite)).toBe(true);
        expect(point[0]).toBeGreaterThanOrEqual(INDIA_BOUNDS[0]);
        expect(point[0]).toBeLessThanOrEqual(INDIA_BOUNDS[2]);
        expect(point[1]).toBeGreaterThanOrEqual(INDIA_BOUNDS[1]);
        expect(point[1]).toBeLessThanOrEqual(INDIA_BOUNDS[3]);
      }
    }
  });

  it("places one label anchor per catalog river on a real tributary or Cauvery vertex", () => {
    expect(RIVER_LABELS.map((label) => label.name)).toEqual(["Cauvery", "Ganga", "Brahmaputra", "Krishna", "Godavari"]);
    const tributaryVertices = [...TRIBUTARY_RIVERS];
    for (const label of RIVER_LABELS) {
      if (label.name === "Cauvery") {
        expect(projectLonLat(label.point).equals(CAUVERY_ANCHOR)).toBe(true);
        continue;
      }
      const river = tributaryVertices.find((r) => r.name === label.name)!;
      expect(river.parts.flat().some((point) => point[0] === label.point[0] && point[1] === label.point[1])).toBe(true);
    }
  });

  it("aligns optional relief using geographic crop bounds rather than a separate image fit", () => {
    if (RELIEF_CONFIG === null) return;
    expect(RELIEF_CONFIG.url).toBe("/maps/india-shaded-relief.jpg");
    const [west, south, east, north] = RELIEF_CONFIG.bounds;
    expect(west).toBeLessThanOrEqual(INDIA_BOUNDS[0]);
    expect(south).toBeLessThanOrEqual(INDIA_BOUNDS[1]);
    expect(east).toBeGreaterThanOrEqual(INDIA_BOUNDS[2]);
    expect(north).toBeGreaterThanOrEqual(INDIA_BOUNDS[3]);
    expect(projectLonLat([west, north]).z).toBeLessThan(projectLonLat([east, south]).z);
  });
});
