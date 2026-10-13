import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { CAUVERY_ANCHOR, CAUVERY_PARTS, INDIA_SHAPES, MAP_TOP, projectLonLat, RELIEF_CONFIG } from "@/experience/geography";
import { buildMapGeometry, polygonShape, reliefUV } from "./geometry";

describe("real map geometry", () => {
  it("preserves all 35 polygon parts and any interior holes", () => {
    expect(INDIA_SHAPES).toHaveLength(35);
    const shapes = INDIA_SHAPES.map(polygonShape);
    expect(shapes).toHaveLength(35);
    shapes.forEach((shape, i) => expect(shape.holes).toHaveLength(INDIA_SHAPES[i].length - 1));
    const withHole = polygonShape([[[70, 10], [72, 10], [72, 12], [70, 12], [70, 10]], [[70.5, 10.5], [71, 10.5], [71, 11], [70.5, 10.5]]]);
    expect(withHole.holes).toHaveLength(1);
    const map = buildMapGeometry();
    const positions = map.land.getAttribute("position");
    const vertices = new Set<string>();
    for (let i = 0; i < positions.count; i++) vertices.add(`${positions.getX(i)},${positions.getZ(i)}`);
    INDIA_SHAPES.forEach((polygon) => polygon.forEach((ring) => ring.forEach((lonLat) => {
      const point = projectLonLat(lonLat);
      const [x, z] = new Float32Array([point.x, point.z]);
      expect(vertices.has(`${x},${z}`)).toBe(true);
    })));
    map.dispose();
  });
  it("keeps nine river parts separate and the anchor on an existing source vertex", () => {
    const map = buildMapGeometry();
    expect(map.riverParts).toHaveLength(9);
    map.riverParts.forEach((part, i) => {
      expect(part).toHaveLength(CAUVERY_PARTS[i].length);
      part.forEach((point, j) => expect(point.distanceTo(projectLonLat(CAUVERY_PARTS[i][j]))).toBeLessThan(1e-9));
    });
    expect(map.riverParts.flat().some((point) => point.distanceTo(CAUVERY_ANCHOR) < 1e-9)).toBe(true);
    map.dispose();
  });
  it("extrudes upward to Y=8, with finite upward-facing cap normals and a 15-unit country height", () => {
    const map = buildMapGeometry();
    map.land.computeBoundingBox();
    expect(map.land.boundingBox!.max.y).toBeCloseTo(MAP_TOP);
    expect(map.land.boundingBox!.min.y).toBeCloseTo(MAP_TOP - 0.12);
    expect(map.land.boundingBox!.max.z - map.land.boundingBox!.min.z).toBeCloseTo(15.1544665);
    const position = map.land.getAttribute("position");
    const normal = map.land.getAttribute("normal");
    let up = 0;
    for (let i = 0; i < position.count; i++) {
      expect(Number.isFinite(normal.getX(i) + normal.getY(i) + normal.getZ(i))).toBe(true);
      if (normal.getY(i) > 0.99) { expect(position.getY(i)).toBeCloseTo(MAP_TOP); up++; }
    }
    expect(up).toBeGreaterThan(0);
    map.dispose();
  });
  it("maps the validated relief crop north to V=1 and south to V=0 without flipping east", () => {
    expect(RELIEF_CONFIG).not.toBeNull();
    const [west, south, east, north] = RELIEF_CONFIG!.bounds;
    const sw = reliefUV(projectLonLat([west, south]), RELIEF_CONFIG!.bounds);
    const ne = reliefUV(projectLonLat([east, north]), RELIEF_CONFIG!.bounds);
    expect(sw.x).toBeCloseTo(0); expect(sw.y).toBeCloseTo(0);
    expect(ne.x).toBeCloseTo(1); expect(ne.y).toBeCloseTo(1);
    const map = buildMapGeometry();
    const uv = map.land.getAttribute("uv");
    const position = map.land.getAttribute("position");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(0); expect(uv.getX(i)).toBeLessThanOrEqual(1);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(0); expect(uv.getY(i)).toBeLessThanOrEqual(1);
      const expected = reliefUV(new Vector3().fromBufferAttribute(position, i), RELIEF_CONFIG!.bounds);
      expect(uv.getX(i)).toBeCloseTo(expected.x); expect(uv.getY(i)).toBeCloseTo(expected.y);
    }
    map.dispose();
  });
});
