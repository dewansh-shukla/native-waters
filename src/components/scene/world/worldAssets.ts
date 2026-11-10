import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, InstancedMesh, Object3D } from "three";
import type { Placement } from "./worldMotion";

// Radial displacement shared by every stone geometry: rewrites the radius of
// each icosahedron vertex from a pure function of its unit direction.
// Deterministic in pure math, no RNG.
function radiallyDisplaced(geo: BufferGeometry, height: (nx: number, ny: number, nz: number) => number) {
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len, ny = y / len, nz = z / len;
    const radius = 1 + height(nx, ny, nz);
    pos.setXYZ(i, nx * len * radius, ny * len * radius, nz * len * radius);
  }
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

function vertexRadii(pos: { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number }) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const radius = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i));
    min = Math.min(min, radius); max = Math.max(max, radius);
  }
  return { min, max };
}

// Deterministic per-variant hash in [0, 1), keyed by seed and salt.
function variantHash(seed: number, salt: number) {
  let state = (Math.imul(seed >>> 0, 1973) + Math.imul(salt >>> 0, 9277) + 2654435761) >>> 0;
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}

type VariantShape = { ratios: [number, number, number]; spinY: number; spinX: number; fracture: number };

// Seeded anisotropy: an ellipsoidal stretch (area compensated on the third
// axis) rotated on a seeded axis, plus a restrained medium-scale fracture
// band. River-worn stones stay convex but never spherical; high-frequency
// detail is left to the PBR maps.
function variantShape(seed: number, low: number, high: number, fractureAmp: number): VariantShape {
  const rx = low + variantHash(seed, 1) * (high - low);
  const ry = low + variantHash(seed, 2) * (high - low);
  return {
    ratios: [rx, ry, Math.abs(rx * ry)],
    spinY: variantHash(seed, 3) * Math.PI,
    spinX: (variantHash(seed, 4) - .5) * 1.1,
    fracture: fractureAmp * (.6 + variantHash(seed, 5) * .8),
  };
}

// Affine radial refit: pushes the variant's radius range back to the legacy
// envelope [min..max] without touching directions, so no variant can poke
// outside the volume the collision proxies assume.
function refitRadii(pos: { count: number; getX: (i: number) => number; getY: (i: number) => number; getZ: (i: number) => number; setXYZ: (i: number, x: number, y: number, z: number) => void }, legacy: { min: number; max: number }) {
  const current = vertexRadii(pos);
  const scale = (legacy.max - legacy.min) / Math.max(current.max - current.min, 1e-9);
  const center = (legacy.min + legacy.max) / 2;
  const currentCenter = (current.min + current.max) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const fitted = center + (len - currentCenter) * scale;
    pos.setXYZ(i, x / len * fitted, y / len * fitted, z / len * fitted);
  }
}

// Legacy envelopes: refit targets measured once from the seed-0 builds so a
// variant's vertices can never leave the volume the current rocks/pebbles
// (and their collision proxies) already occupy.
const envelopeCache = new Map<string, { min: number; max: number }>();
function legacyEnvelope(kind: "rock" | "gravel") {
  let envelope = envelopeCache.get(kind);
  if (!envelope) {
    envelope = kind === "rock"
      ? vertexRadii(radiallyDisplaced(new IcosahedronGeometry(1, 3), rockHeight).getAttribute("position"))
      : vertexRadii(radiallyDisplaced(new IcosahedronGeometry(1, 1), gravelHeight).getAttribute("position"));
    envelopeCache.set(kind, envelope);
  }
  return envelope;
}

// Applies the seeded anisotropic stretch + fracture to already-displaced
// vertex data, then refits radii into the legacy envelope.
function seedDisplace(geo: BufferGeometry, shape: VariantShape) {
  const pos = geo.getAttribute("position");
  const cy = Math.cos(shape.spinY), sy = Math.sin(shape.spinY);
  const cx = Math.cos(shape.spinX), sx = Math.sin(shape.spinX);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Rotate onto the anisotropy axis, stretch, rotate back (in-place basis).
    let ax = cy * x + sy * z, az = -sy * x + cy * z;
    ax *= shape.ratios[0]; y *= shape.ratios[1]; az *= 1 / Math.max(shape.ratios[2], .2);
    x = cy * ax - sy * az; z = sy * ax + cy * az;
    let bx = cx * y - sx * z, bz = sx * y + cx * z;
    bx *= 1; bz *= 1; y = bx; z = bz;
    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len, ny = y / len, nz = z / len;
    const len2 = len + shape.fracture * (Math.sin(nx * 5.7 + shape.spinY * 3.1) * Math.cos(ny * 4.3 + shape.spinX) + Math.sin(nz * 6.9 + shape.spinX * 2.2) * .5);
    pos.setXYZ(i, nx * len2, ny * len2, nz * len2);
  }
  return geo;
}

export function createRockGeometry(seed: number) {
  const geo = radiallyDisplaced(new IcosahedronGeometry(1, 3), rockHeight);
  if (seed !== 0) {
    seedDisplace(geo, variantShape(seed, .88, 1.08, .022));
    refitRadii(geo.getAttribute("position"), legacyEnvelope("rock"));
  }
  geo.computeVertexNormals();
  return geo;
}

export function createGravelGeometry(seed: number) {
  const geo = radiallyDisplaced(new IcosahedronGeometry(1, 1), gravelHeight);
  if (seed !== 0) {
    seedDisplace(geo, variantShape(seed, .93, 1.06, .008));
    refitRadii(geo.getAttribute("position"), legacyEnvelope("gravel"));
  }
  geo.computeVertexNormals();
  return geo;
}

// Partitions placements into one array per geometry variant. Membership keys
// off the ORIGINAL placement index, never the bucket order, so every batch
// stays deterministic and balanced ((i + salt) % variantCount), including
// the collision-exact obstacle placements.
export function bucketPlacementsByVariant(placements: Placement[], variantCount: number, salt: number) {
  const buckets: Placement[][] = Array.from({ length: variantCount }, () => []);
  const offset = ((salt % variantCount) + variantCount) % variantCount;
  for (let i = 0; i < placements.length; i++) buckets[(i + offset) % variantCount].push(placements[i]);
  return buckets;
}

export type PlantVariant = "ribbon" | "grass";

// Ribbon: tall Vallisneria-like strap leaves. Grass: shorter fine understory
// blades. rows = length segments; vertex count is blades*(rows+1)*3.
const PLANT_CLUMP_SPECS = {
  ribbon: { blades: 7, rows: 7, width: .075, radius: .15, leanBase: .14, leanRange: .2, widthJitter: .45 },
  grass: { blades: 11, rows: 5, width: .028, radius: .24, leanBase: .08, leanRange: .14, widthJitter: .35 },
} as const;

// Blade-level deterministic hash (instanceVariation keys instances; this keys
// the blades inside one clump).
function bladeRandom(blade: number, salt: number) {
  let seed = (blade * 1973 + salt * 9277 + 2654435761) >>> 0;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

// One clump of blades rooted at the bed. Each blade is a tapered, twisted
// 3-column ribbon (shallow V cross-section) arched outward with per-blade
// height/lean/yaw, plus baked root silt / bright mid / yellow tip shading.
// Per-vertex `aWind` (0 root -> 1 tip) and `aPhase` (one random phase per
// blade) drive the layered sway in plantShader. Clump space spans y 0..1 so
// existing placement scale.y keeps working, roots pinned at y=0.
export function createPlantClumpGeometry(variant: PlantVariant = "ribbon") {
  const { blades, rows, width, radius, leanBase, leanRange, widthJitter } = PLANT_CLUMP_SPECS[variant];
  const positions: number[] = [], colors: number[] = [], winds: number[] = [], phases: number[] = [], indices: number[] = [];

  for (let blade = 0; blade < blades; blade++) {
    const yaw = bladeRandom(blade, 1) * Math.PI * 2;
    const reach = radius * (.35 + bladeRandom(blade, 2) * .65);
    const baseX = Math.cos(yaw) * reach, baseZ = Math.sin(yaw) * reach;
    const height = blade === 0 ? 1 : .52 + bladeRandom(blade, 3) * .43;
    const leanAngle = yaw + (bladeRandom(blade, 4) - .5) * 1.7;
    const lean = leanBase + bladeRandom(blade, 5) * leanRange;
    const twistTotal = .5 + bladeRandom(blade, 6) * .8;
    const w0 = width * (1 - widthJitter + bladeRandom(blade, 7) * widthJitter * 2);
    const age = bladeRandom(blade, 8);
    const bladePhase = bladeRandom(blade, 9) * Math.PI * 2;

    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const tipPinch = t > .88 ? Math.max(.08, 1 - (t - .88) * 7.5) : 1;
      const w = w0 * (1 - t * .68) * tipPinch;
      const ridge = w * .18;
      const bend = t * t * lean;
      const leanX = Math.cos(leanAngle) * bend, leanZ = Math.sin(leanAngle) * bend;
      const y = t * height;
      for (let col = 0; col < 3; col++) {
        const lx = (col - 1) * (w / 2);
        const lz = col === 1 ? ridge : 0;
        const co = Math.cos(twistTotal * t), si = Math.sin(twistTotal * t);
        positions.push(baseX + leanX + lx * co - lz * si, y, baseZ + leanZ + lx * si + lz * co);
        winds.push(t);
        phases.push(bladePhase);
        const luma = .26 + t * (.95 + age * .14);
        const silt = Math.max(0, 1 - t * 5);
        colors.push(
          luma * (1 + silt * .55 + t * .22),
          luma * (.97 - silt * .35),
          luma * (.9 - silt * .55 - t * .05),
        );
      }
    }
    const first = blade * (rows + 1) * 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 2; c++) {
        const a = first + r * 3 + c;
        const b0 = a + 3;
        indices.push(a, b0, b0 + 1, a, b0 + 1, a + 1);
      }
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geo.setAttribute("aWind", new BufferAttribute(new Float32Array(winds), 1));
  geo.setAttribute("aPhase", new BufferAttribute(new Float32Array(phases), 1));
  geo.setIndex(indices);
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
