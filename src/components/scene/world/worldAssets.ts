import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, InstancedMesh, Object3D, PlaneGeometry } from "three";
import type { Placement } from "./worldMotion";

// Radial noise shared by both stone geometries: low octaves set the mass,
// high octaves set the surface crag. Deterministic in pure math, no RNG.
function displaceIcosahedron(geo: BufferGeometry, height: (nx: number, ny: number, nz: number) => number) {
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len, ny = y / len, nz = z / len;
    const radius = 1 + height(nx, ny, nz);
    pos.setXYZ(i, nx * len * radius, ny * len * radius, nz * len * radius);
  }
  geo.computeVertexNormals();
  return geo;
}

// Boulders: the original three lobed octaves plus a pair of high-frequency
// crag octaves so light catches edges between facets and lobes.
function rockHeight(nx: number, ny: number, nz: number) {
  const n1 = Math.sin(nx * 4.1 + ny * 2.7) * Math.cos(nz * 3.3 + nx * 1.9) * 0.22;
  const n2 = Math.sin(ny * 7.3 + nz * 5.1) * 0.11;
  const n3 = Math.cos(nx * 9.7 + ny * 8.2 + nz * 6.4) * 0.06;
  const crag = Math.sin(nx * 21 + ny * 13) * Math.cos(nz * 17 + nx * 7) * 0.05;
  const grit = Math.sin((nx + ny) * 31 + nz * 23) * 0.032;
  return n1 + n2 + n3 + crag + grit;
}

// Pebbles: same idea, gentler relief so they read as worn stream stones.
function gravelHeight(nx: number, ny: number, nz: number) {
  const n1 = Math.sin(nx * 5.3 + ny * 2.1) * Math.cos(nz * 4.7 + nx * 3.1) * 0.1;
  const n2 = Math.sin(ny * 9.1 + nz * 6.3 + nx * 2.2) * 0.042;
  const n3 = Math.cos((nx - nz) * 13 + ny * 8) * 0.02;
  return n1 + n2 + n3;
}

export function createRockGeometry() {
  return displaceIcosahedron(new IcosahedronGeometry(1, 3), rockHeight);
}

export function createGravelGeometry() {
  return displaceIcosahedron(new IcosahedronGeometry(1, 1), gravelHeight);
}

// One grass blade: slight baked taper, arch out of the flat plane (the sway
// shader bends on top of this), and a per-vertex root-to-tip shade gradient
// so blades self-shade with the shared green material.
export function createPlantGeometry() {
  const geo = new PlaneGeometry(0.16, 1, 1, 8);
  geo.translate(0, 0.5, 0);
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const color = new Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setZ(i, y * y * 0.05);
    pos.setX(i, pos.getX(i) * (1 - y * 0.3));
    const shade = 1.0 + y * 0.35;
    color.setRGB(shade * (1 + y * 0.08), shade, shade);
    color.toArray(colors, i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

// Deterministic per-instance pseudo-random in [0, 1), keyed by index and salt.
export function instanceVariation(index: number, salt: number) {
  let seed = (index * 1973 + salt * 9277 + 1013904223) >>> 0;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

export type BatchOptions = {
  spin?: boolean;
  stretch?: boolean;
  spinAmount?: number;
  stretchAmount?: number;
  colorSpread?: number;
  colorSalt?: number;
  skipFirst?: number;
};

// Instanced placement fill. With no options this is the legacy behavior:
// exact placement transform (Y-only rotation) and the (i % 13) color stagger.
// Options add 3-axis spin, per-instance Y stretch and a wider color spread,
// skipping the first N indices so collision-exact obstacles stay untouched.
export function fillBatch(mesh: InstancedMesh | null, placements: Placement[], tint: string, options: BatchOptions = {}) {
  if (!mesh) return;
  const { spin, stretch, spinAmount = .35, stretchAmount = .16, colorSpread, colorSalt = 11, skipFirst = 0 } = options;
  const transform = new Object3D(), color = new Color(tint);
  for (let i = 0; i < placements.length; i++) {
    const item = placements[i], varied = i >= skipFirst;
    transform.position.fromArray(item.position);
    transform.scale.fromArray(item.scale);
    if (stretch && varied) transform.scale.y = item.scale[1] * (1 - stretchAmount + instanceVariation(i, 3) * stretchAmount * 2);
    transform.rotation.set(
      spin && varied ? (instanceVariation(i, 5) - .5) * spinAmount : 0,
      item.rotation,
      spin && varied ? (instanceVariation(i, 9) - .5) * spinAmount : 0,
    );
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    const factor = colorSpread !== undefined ? .72 + instanceVariation(i, colorSalt) * colorSpread : .72 + (i % 13) / 26;
    mesh.setColorAt(i, color.clone().multiplyScalar(factor));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}
