import { BufferGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Path, Quaternion, Shape, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CAUVERY_PARTS, INDIA_BOUNDS, INDIA_SHAPES, MAP_TOP, projectLonLat, RELIEF_CONFIG, type GeoBounds, type PolygonCoordinates } from "@/experience/geography";

export function polygonShape(rings: PolygonCoordinates): Shape {
  const paths = rings.map((ring) => ring.map((lonLat) => {
    const world = projectLonLat(lonLat);
    // Rotation -PI/2 maps this local Y back to world -Z, and extrusion to +Y.
    return new Vector2(world.x, -world.z);
  }));
  const shape = new Shape(paths[0]);
  shape.holes = paths.slice(1).map((points) => new Path(points));
  return shape;
}

export function reliefUV(world: Vector3, bounds: GeoBounds): Vector2 {
  const southwest = projectLonLat([bounds[0], bounds[1]]);
  const northeast = projectLonLat([bounds[2], bounds[3]]);
  return new Vector2((world.x - southwest.x) / (northeast.x - southwest.x), (world.z - southwest.z) / (northeast.z - southwest.z));
}

/** Straight source edges only: no interpolation or connectors between river parts. */
export function riverTubes(parts: readonly (readonly Vector3[])[], radius: number): BufferGeometry {
  const cylinders: BufferGeometry[] = [];
  const up = new Vector3(0, 1, 0);
  parts.forEach((part) => part.slice(1).forEach((end, index) => {
    const start = part[index];
    const direction = end.clone().sub(start);
    if (direction.lengthSq() === 0) return;
    const cylinder = new CylinderGeometry(radius, radius, direction.length(), 6);
    cylinder.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction.normalize()));
    cylinder.translate((start.x + end.x) / 2, MAP_TOP + 0.045, (start.z + end.z) / 2);
    cylinders.push(cylinder);
  }));
  const merged = mergeGeometries(cylinders)!;
  cylinders.forEach((geometry) => geometry.dispose());
  return merged;
}

export function buildMapGeometry() {
  const land = new ExtrudeGeometry(INDIA_SHAPES.map(polygonShape), { depth: 0.12, bevelEnabled: false, steps: 1, curveSegments: 1 });
  land.rotateX(-Math.PI / 2);
  land.translate(0, MAP_TOP - 0.12, 0);
  const positions = land.getAttribute("position");
  // Tiny source islands can triangulate with reversed cap triangles; keep Y-up winding.
  for (let i = 0; i < positions.count; i += 3) {
    const y = positions.getY(i);
    if (positions.getY(i + 1) !== y || positions.getY(i + 2) !== y) continue;
    const top = Math.abs(y - MAP_TOP) < 0.001;
    const a = new Vector3().fromBufferAttribute(positions, i);
    const b = new Vector3().fromBufferAttribute(positions, i + 1);
    const c = new Vector3().fromBufferAttribute(positions, i + 2);
    const normalY = b.clone().sub(a).cross(c.sub(a)).y;
    if ((top && normalY < 0) || (!top && normalY > 0)) {
      positions.setXYZ(i, b.x, b.y, b.z);
      positions.setXYZ(i + 1, a.x, a.y, a.z);
    }
  }
  land.computeVertexNormals();
  const uv: number[] = [];
  const point = new Vector3();
  for (let i = 0; i < positions.count; i++) {
    const projected = reliefUV(point.fromBufferAttribute(positions, i), RELIEF_CONFIG?.bounds ?? INDIA_BOUNDS);
    uv.push(projected.x, projected.y);
  }
  land.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  const coastPoints: number[] = [];
  INDIA_SHAPES.forEach((polygon) => polygon.forEach((ring) => {
    const vertices = ring.map(projectLonLat);
    vertices.forEach((start, index) => {
      const end = vertices[(index + 1) % vertices.length];
      coastPoints.push(start.x, MAP_TOP + 0.008, start.z, end.x, MAP_TOP + 0.008, end.z);
    });
  }));
  const coast = new BufferGeometry();
  coast.setAttribute("position", new Float32BufferAttribute(coastPoints, 3));
  const riverParts = CAUVERY_PARTS.map((part) => part.map(projectLonLat));
  const river = riverTubes(riverParts, 0.026);
  const glow = riverTubes(riverParts, 0.065);
  const hit = riverTubes(riverParts, 0.17);
  return { land, coast, riverParts, river, glow, hit, dispose() { [land, coast, river, glow, hit].forEach((geometry) => geometry.dispose()); } };
}
