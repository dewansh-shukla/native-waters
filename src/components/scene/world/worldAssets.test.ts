import { describe, expect, it } from "vitest";
import { BufferGeometry, Color, IcosahedronGeometry, InstancedMesh, Matrix4, Object3D } from "three";
import { OBSTACLES } from "@/experience/habitat";
import type { Placement } from "./worldMotion";
import { createPlacements } from "./worldMotion";
import { bucketPlacementsByVariant, createGravelGeometry, createPlantClumpGeometry, createRockGeometry, fillBatch, instanceVariation } from "./worldAssets";

const ROCK_SEEDS = [0, 1, 2, 3] as const;
const GRAVEL_SEEDS = [0, 1, 2] as const;

function radiiOf(geo: BufferGeometry) {
  const pos = geo.getAttribute("position");
  return Array.from({ length: pos.count }, (_, i) => Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)));
}

function maxAbsVertexDifference(a: BufferGeometry, b: BufferGeometry) {
  const pa = a.getAttribute("position"), pb = b.getAttribute("position");
  let worst = 0;
  for (let i = 0; i < pa.count; i++) {
    worst = Math.max(worst, Math.hypot(pa.getX(i) - pb.getX(i), pa.getY(i) - pb.getY(i), pa.getZ(i) - pb.getZ(i)));
  }
  return worst;
}

describe("world rock geometry", () => {
  it("stays an icosahedron at detail 3 but displaces radius into a craggy boulder", () => {
    const geo = createRockGeometry(0);
    expect(geo.getAttribute("position").count).toBe(new IcosahedronGeometry(1, 3).getAttribute("position").count);
    const pos = geo.getAttribute("position"), normal = geo.getAttribute("normal");
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const radius = Math.sqrt(x * x + y * y + z * z);
      min = Math.min(min, radius); max = Math.max(max, radius);
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
      expect(Number.isFinite(normal.getY(i))).toBe(true);
    }
    expect(min).toBeLessThan(.72);
    expect(max).toBeGreaterThan(1.28);
    expect(min).toBeGreaterThan(.45);
    expect(max).toBeLessThan(1.55);
  });
  it("carries high-frequency crag detail: radius reverses direction often along the vertex span", () => {
    const radii = radiiOf(createRockGeometry(0));
    let reversals = 0;
    for (let i = 1; i < radii.length - 1; i++) {
      if ((radii[i] - radii[i - 1]) * (radii[i + 1] - radii[i]) < 0) reversals++;
    }
    expect(reversals).toBeGreaterThan(80);
  });
  it("is deterministic", () => {
    const a = createRockGeometry(0).getAttribute("position"), b = createRockGeometry(0).getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      expect(a.getX(i)).toBe(b.getX(i));
      expect(a.getZ(i)).toBe(b.getZ(i));
    }
  });
});

describe("seeded boulder variants", () => {
  it("keeps the detail-3 topology and finite vertices/normals for every seed", () => {
    for (const seed of ROCK_SEEDS) {
      const geo = createRockGeometry(seed);
      expect(geo.getAttribute("position").count).toBe(new IcosahedronGeometry(1, 3).getAttribute("position").count);
      const pos = geo.getAttribute("position"), normal = geo.getAttribute("normal");
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i))).toBe(true);
        expect(Number.isFinite(normal.getX(i)) && Number.isFinite(normal.getY(i)) && Number.isFinite(normal.getZ(i))).toBe(true);
      }
    }
  });
  it("is deterministic per seed", () => {
    for (const seed of ROCK_SEEDS) {
      const a = createRockGeometry(seed).getAttribute("position"), b = createRockGeometry(seed).getAttribute("position");
      for (let i = 0; i < a.count; i++) {
        expect(a.getX(i)).toBe(b.getX(i));
        expect(a.getY(i)).toBe(b.getY(i));
        expect(a.getZ(i)).toBe(b.getZ(i));
      }
    }
  });
  it("renders visibly distinct shapes across the four seeds", () => {
    const geos = ROCK_SEEDS.map(createRockGeometry);
    for (let a = 0; a < geos.length; a++) {
      for (let b = a + 1; b < geos.length; b++) {
        expect(maxAbsVertexDifference(geos[a], geos[b])).toBeGreaterThan(.03);
      }
    }
  });
  it("never grows a variant past the legacy seed-0 geometry envelope", () => {
    const legacy = radiiOf(createRockGeometry(0));
    const legacyMax = Math.max(...legacy), legacyMin = Math.min(...legacy);
    for (const seed of ROCK_SEEDS.slice(1)) {
      const radii = radiiOf(createRockGeometry(seed));
      expect(Math.max(...radii)).toBeLessThanOrEqual(legacyMax + 1e-6);
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(legacyMin - 1e-6);
    }
  });
});

describe("world gravel geometry", () => {
  it("subdivides to detail 1 and wears the facets down with smaller relief than boulders", () => {
    const geo = createGravelGeometry(0);
    expect(geo.getAttribute("position").count).toBe(new IcosahedronGeometry(1, 1).getAttribute("position").count);
    const pos = geo.getAttribute("position");
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const radius = Math.sqrt(x * x + y * y + z * z);
      min = Math.min(min, radius); max = Math.max(max, radius);
      expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
    }
    const relief = max - min;
    expect(min).toBeLessThan(.985);
    expect(relief).toBeGreaterThan(.03);
    expect(relief).toBeLessThan(.3);
    const rockPos = createRockGeometry(0).getAttribute("position");
    const rockRadii: number[] = [];
    for (let i = 0; i < rockPos.count; i++) {
      const x = rockPos.getX(i), y = rockPos.getY(i), z = rockPos.getZ(i);
      rockRadii.push(Math.sqrt(x * x + y * y + z * z));
    }
    expect(relief).toBeLessThan(Math.max(...rockRadii) - Math.min(...rockRadii));
  });
});

describe("seeded pebble variants", () => {
  it("keeps the detail-1 topology, finite geometry, and determinism for every seed", () => {
    for (const seed of GRAVEL_SEEDS) {
      const geo = createGravelGeometry(seed);
      expect(geo.getAttribute("position").count).toBe(new IcosahedronGeometry(1, 1).getAttribute("position").count);
      const pos = geo.getAttribute("position"), normal = geo.getAttribute("normal");
      for (let i = 0; i < pos.count; i++) {
        expect(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i))).toBe(true);
        expect(Number.isFinite(normal.getX(i)) && Number.isFinite(normal.getY(i)) && Number.isFinite(normal.getZ(i))).toBe(true);
      }
      const again = createGravelGeometry(seed).getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        expect(again.getX(i)).toBe(pos.getX(i));
        expect(again.getZ(i)).toBe(pos.getZ(i));
      }
    }
  });
  it("renders visibly distinct and stays inside the legacy pebble envelope", () => {
    const geos = GRAVEL_SEEDS.map(createGravelGeometry);
    for (let a = 0; a < geos.length; a++) {
      for (let b = a + 1; b < geos.length; b++) {
        expect(maxAbsVertexDifference(geos[a], geos[b])).toBeGreaterThan(.06);
      }
    }
    const legacy = radiiOf(createGravelGeometry(0));
    const legacyMax = Math.max(...legacy), legacyMin = Math.min(...legacy);
    for (const seed of GRAVEL_SEEDS.slice(1)) {
      const radii = radiiOf(createGravelGeometry(seed));
      expect(Math.max(...radii)).toBeLessThanOrEqual(legacyMax + 1e-6);
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(legacyMin - 1e-6);
    }
  });
});

describe("bucketPlacementsByVariant", () => {
  it("partitions every source placement exactly once with transforms preserved verbatim", () => {
    const { rocks } = createPlacements();
    const snapshot = rocks.map(item => ({ position: [...item.position], scale: [...item.scale], rotation: item.rotation }));
    const buckets = bucketPlacementsByVariant(rocks, 4, 0);
    expect(buckets.length).toBe(4);
    const flattened = buckets.flat();
    expect(flattened.length).toBe(rocks.length);
    const keys = new Map(snapshot.map(item => [JSON.stringify(item), 0]));
    for (const item of flattened) {
      const key = JSON.stringify(item);
      expect(keys.has(key)).toBe(true);
      keys.set(key, (keys.get(key) ?? 0) + 1);
    }
    for (const [, count] of keys) expect(count).toBe(1);
    // The three collision-obstacle transforms exist in the partition, somewhere.
    for (let i = 0; i < 3; i++) expect(keys.has(JSON.stringify(rocks[i]))).toBe(true);
    expect(JSON.stringify(rocks)).toBe(JSON.stringify(snapshot));
  });
  it("keeps the first three obstacle transforms exact and invariant across the first buckets", () => {
    const { rocks } = createPlacements();
    for (let i = 0; i < 3; i++) {
      expect(rocks[i].position).toEqual([...OBSTACLES[i].center]);
      expect(rocks[i].scale).toEqual(Array(3).fill(OBSTACLES[i].radius));
      expect(rocks[i].rotation).toBe(0);
    }
    const again = bucketPlacementsByVariant(rocks, 4, 0);
    expect(JSON.stringify(again)).toBe(JSON.stringify(bucketPlacementsByVariant(rocks, 4, 0)));
  });
  it("shifts bucket membership with the salt so neighboring instances separate", () => {
    const placements: Placement[] = Array.from({ length: 8 }, () => ({ position: [0, 0, 0], scale: [1, 1, 1], rotation: 0 }));
    const salted = bucketPlacementsByVariant(placements, 4, 1);
    expect(salted.flat().length).toBe(8);
    const index0Salt0 = bucketPlacementsByVariant(placements, 4, 0).findIndex(bucket => bucket.length > 0);
    const index0Salt1 = salted.findIndex(bucket => bucket[0] === placements[0]);
    expect(index0Salt0).not.toEqual(index0Salt1);
  });
});

// Rows are consecutive triples of (col0, col1 center, col2) sharing one wind
// weight; blades are laid out blade-major, so each blade owns `rows` consecutive rows.
function clumpRows(geo: ReturnType<typeof createPlantClumpGeometry>) {
  const pos = geo.getAttribute("position"), wind = geo.getAttribute("aWind"), phase = geo.getAttribute("aPhase");
  const rows: { t: number; width: number; phase: number; px: number; pz: number }[] = [];
  for (let i = 0; i + 2 < pos.count; i += 3) {
    rows.push({
      t: wind.getX(i),
      width: Math.hypot(pos.getX(i) - pos.getX(i + 2), pos.getZ(i) - pos.getZ(i + 2)),
      phase: phase.getX(i),
      px: pos.getX(i + 1), pz: pos.getZ(i + 1),
    });
    expect(wind.getX(i)).toBe(wind.getX(i + 1));
    expect(wind.getX(i)).toBe(wind.getX(i + 2));
  }
  expect(pos.count % 3).toBe(0);
  return rows;
}

describe("world plant clump geometry", () => {
  it("spans y 0..1, stays inside clump radius, and is finite and deterministic", () => {
    for (const variant of ["ribbon", "grass"] as const) {
      const geo = createPlantClumpGeometry(variant);
      const pos = geo.getAttribute("position");
      let minY = Infinity, maxY = -Infinity, maxRadius = 0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        maxRadius = Math.max(maxRadius, Math.hypot(x, z));
      }
      expect(minY).toBeCloseTo(0, 5);
      expect(maxY).toBeCloseTo(1, 5);
      expect(maxRadius).toBeLessThan(.6);
      const again = createPlantClumpGeometry(variant).getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        expect(again.getX(i)).toBe(pos.getX(i));
        expect(again.getZ(i)).toBe(pos.getZ(i));
      }
    }
  });

  it("carries the blade budget: 3-column ribbons for both variants, inside the tri budget", () => {
    const ribbon = createPlantClumpGeometry("ribbon"), grass = createPlantClumpGeometry("grass");
    expect(ribbon.getAttribute("position").count).toBe(7 * 8 * 3);
    expect(grass.getAttribute("position").count).toBe(11 * 6 * 3);
    expect(ribbon.getIndex()!.count / 3).toBeLessThanOrEqual(200);
    expect(grass.getIndex()!.count / 3).toBeLessThanOrEqual(240);
    expect(ribbon.getIndex()!.count / 3).toBeGreaterThan(60);
  });

  it("tapers blades to points, with the ridge and twist making normals vary in 3D", () => {
    const geo = createPlantClumpGeometry("ribbon");
    const rows = clumpRows(geo);
    const normal = geo.getAttribute("normal");
    const rootWidths = rows.filter(r => r.t < .15).map(r => r.width);
    const midWidths = rows.filter(r => r.t > .45 && r.t < .6).map(r => r.width);
    const tipWidths = rows.filter(r => r.t > .9).map(r => r.width);
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(avg(rootWidths)).toBeGreaterThan(0);
    expect(avg(tipWidths)).toBeLessThan(avg(rootWidths) * .45);
    expect(avg(midWidths)).toBeLessThan(avg(rootWidths));
    let minNX = 1, maxNX = -1, minNZ = 1, maxNZ = -1;
    for (let i = 0; i < normal.count; i++) {
      minNX = Math.min(minNX, normal.getX(i)); maxNX = Math.max(maxNX, normal.getX(i));
      minNZ = Math.min(minNZ, normal.getZ(i)); maxNZ = Math.max(maxNZ, normal.getZ(i));
    }
    // A flat card has one normal; ridge + twist must spread normals toward x and z.
    expect(maxNX - minNX).toBeGreaterThan(.25);
    expect(maxNZ - minNZ).toBeGreaterThan(.25);
  });

  it("bakes a monotonic root-to-tip wind weight and one phase per blade", () => {
    const geo = createPlantClumpGeometry("ribbon");
    const rows = clumpRows(geo);
    const rowsPerBlade = 8, blades = rows.length / rowsPerBlade;
    expect(blades).toBe(7);
    const phases = new Set<number>();
    for (let b = 0; b < blades; b++) {
      const bladeRows = rows.slice(b * rowsPerBlade, (b + 1) * rowsPerBlade);
      let previous = -Infinity;
      for (const row of bladeRows) {
        expect(row.t).toBeGreaterThanOrEqual(previous);
        previous = row.t;
        expect(row.phase).toBe(bladeRows[0].phase);
      }
      expect(bladeRows[0].t).toBe(0);
      expect(bladeRows[bladeRows.length - 1].t).toBeCloseTo(1, 5);
      phases.add(bladeRows[0].phase);
    }
    expect(phases.size).toBeGreaterThanOrEqual(5);
  });

  it("fans blades outward from the root so the clump is a 3D fan, not a flat card", () => {
    const geo = createPlantClumpGeometry("ribbon");
    const rows = clumpRows(geo);
    const rowsPerBlade = 8, blades = rows.length / rowsPerBlade;
    let fanned = 0;
    for (let b = 0; b < blades; b++) {
      const root = rows[b * rowsPerBlade], tip = rows[(b + 1) * rowsPerBlade - 1];
      if (Math.hypot(tip.px, tip.pz) > Math.hypot(root.px, root.pz) * 1.15) fanned++;
    }
    expect(fanned).toBeGreaterThanOrEqual(blades - 3);
  });

  it("colors roots dark and silted, tips brighter and relatively more yellow", () => {
    const geo = createPlantClumpGeometry("ribbon");
    const wind = geo.getAttribute("aWind"), colors = geo.getAttribute("color");
    const bucket = { root: [] as number[][], mid: [] as number[][], tip: [] as number[][] };
    for (let i = 0; i < wind.count; i++) {
      const t = wind.getX(i), c = [colors.getX(i), colors.getY(i), colors.getZ(i)];
      if (t < .12) bucket.root.push(c);
      else if (t >= .25 && t < .6) bucket.mid.push(c);
      else if (t >= .8) bucket.tip.push(c);
    }
    const lum = (c: number[]) => c[0] + c[1] + c[2];
    const avgNumber = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const avg = (cells: number[][], pick: (c: number[]) => number) => avgNumber(cells.map(pick));
    expect(avg(bucket.root, lum)).toBeLessThan(avg(bucket.mid, lum) * .5);
    expect(avg(bucket.tip, lum)).toBeGreaterThan(avg(bucket.mid, lum));
    const rg = (c: number[]) => c[0] / c[1];
    expect(avg(bucket.tip, rg)).toBeGreaterThan(avg(bucket.mid, rg));
  });
});

describe("instanceVariation", () => {
  it("is deterministic, inside [0,1), and distinct across indices", () => {
    for (const salt of [0, 7]) {
      for (let i = 0; i < 24; i++) {
        const v = instanceVariation(i, salt);
        expect(v).toBe(instanceVariation(i, salt));
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
      const values = Array.from({ length: 16 }, (_, i) => instanceVariation(i, salt));
      expect(new Set(values).size).toBeGreaterThan(12);
    }
  });
});

const placements: Placement[] = [
  { position: [1, 2, 3], scale: [.5, .5, .5], rotation: .25 },
  { position: [-1, 0, 1], scale: [.8, .6, .7], rotation: 1.5 },
  { position: [0, 1, -2], scale: [1.2, 1.2, 1.2], rotation: 2.8 },
];

function makeMesh(length: number) { return new InstancedMesh(new IcosahedronGeometry(1, 0), undefined, length); }

function legacyMatrix(item: Placement) {
  const scratch = new Object3D();
  scratch.position.fromArray(item.position);
  scratch.scale.fromArray(item.scale);
  scratch.rotation.set(0, item.rotation, 0);
  scratch.updateMatrix();
  return scratch.matrix.clone();
}

function closeToMatrix(actual: Matrix4, expected: Matrix4) {
  for (let i = 0; i < 16; i++) {
    expect(actual.elements[i]).toBeCloseTo(expected.elements[i], 6);
  }
}

describe("fillBatch", () => {
  it("keeps the legacy placement matrix and color formula by default", () => {
    const mesh = makeMesh(placements.length);
    fillBatch(mesh, placements, "#6b6055");
    const tint = new Color("#6b6055");
    for (let i = 0; i < placements.length; i++) {
      const matrix = new Matrix4();
      mesh.getMatrixAt(i, matrix);
      closeToMatrix(matrix, legacyMatrix(placements[i]));
      expect(mesh.instanceColor!.getX(i)).toBeCloseTo(tint.r * (.72 + (i % 13) / 26), 5);
    }
  });
  it("widens color jitter when colorSpread is set while placement transforms stay exact", () => {
    const mesh = makeMesh(placements.length);
    fillBatch(mesh, placements, "#8a7a60", { colorSpread: .42 });
    const tint = new Color("#8a7a60");
    const seen = new Set<string>();
    for (let i = 0; i < placements.length; i++) {
      const matrix = new Matrix4();
      mesh.getMatrixAt(i, matrix);
      closeToMatrix(matrix, legacyMatrix(placements[i]));
      seen.add(mesh.instanceColor!.getX(i).toFixed(4));
      expect(mesh.instanceColor!.getX(i)).toBeCloseTo(tint.r * (.72 + instanceVariation(i, 11) * .42), 5);
    }
    expect(seen.size).toBe(placements.length);
  });
  it("spin and stretch leave the skip-first range exact and reshape only later instances", () => {
    const mesh = makeMesh(placements.length);
    fillBatch(mesh, placements, "#6b6055", { spin: true, stretch: true, skipFirst: 3 });
    for (let i = 0; i < placements.length; i++) {
      const matrix = new Matrix4();
      mesh.getMatrixAt(i, matrix);
      closeToMatrix(matrix, legacyMatrix(placements[i]));
    }
  });
  it("spins varied instances off the Y axis and stretches only along the placement scale", () => {
    const mesh = makeMesh(placements.length);
    fillBatch(mesh, placements, "#6b6055", { spin: true, stretch: true, spinAmount: .35, stretchAmount: .16 });
    for (let i = 0; i < placements.length; i++) {
      const matrix = new Matrix4();
      mesh.getMatrixAt(i, matrix);
      const e = matrix.elements;
      // Pure Y rotation leaves m01/m21 (elements 4 and 6) at zero; spin must lift them off zero.
      expect(Math.hypot(e[4], e[6])).toBeGreaterThan(1e-4);
      const element = placements[i].scale[0];
      expect(Math.hypot(e[0], e[1], e[2])).toBeCloseTo(element, 5);
      const yScale = Math.hypot(e[4], e[5], e[6]);
      expect(yScale / placements[i].scale[1]).toBeGreaterThan(1 - .16);
      expect(yScale / placements[i].scale[1]).toBeLessThan(1 + .16);
    }
  });
});
