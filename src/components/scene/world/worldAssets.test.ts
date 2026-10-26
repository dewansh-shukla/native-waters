import { describe, expect, it } from "vitest";
import { Color, IcosahedronGeometry, InstancedMesh, Matrix4, Object3D } from "three";
import type { Placement } from "./worldMotion";
import { createGravelGeometry, createPlantGeometry, createRockGeometry, fillBatch, instanceVariation } from "./worldAssets";

describe("world rock geometry", () => {
  it("stays an icosahedron at detail 3 but displaces radius into a craggy boulder", () => {
    const geo = createRockGeometry();
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
    const pos = createRockGeometry().getAttribute("position");
    const radii: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      radii.push(Math.sqrt(x * x + y * y + z * z));
    }
    let reversals = 0;
    for (let i = 1; i < radii.length - 1; i++) {
      if ((radii[i] - radii[i - 1]) * (radii[i + 1] - radii[i]) < 0) reversals++;
    }
    expect(reversals).toBeGreaterThan(80);
  });
  it("is deterministic", () => {
    const a = createRockGeometry().getAttribute("position"), b = createRockGeometry().getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      expect(a.getX(i)).toBe(b.getX(i));
      expect(a.getZ(i)).toBe(b.getZ(i));
    }
  });
});

describe("world gravel geometry", () => {
  it("subdivides to detail 1 and wears the facets down with smaller relief than boulders", () => {
    const geo = createGravelGeometry();
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
    const rockPos = createRockGeometry().getAttribute("position");
    const rockRadii: number[] = [];
    for (let i = 0; i < rockPos.count; i++) {
      const x = rockPos.getX(i), y = rockPos.getY(i), z = rockPos.getZ(i);
      rockRadii.push(Math.sqrt(x * x + y * y + z * z));
    }
    expect(relief).toBeLessThan(Math.max(...rockRadii) - Math.min(...rockRadii));
  });
});

describe("world plant geometry", () => {
  it("spans y 0..1, tapers toward the tip, and carries a root-to-tip brightness gradient", () => {
    const geo = createPlantGeometry();
    const pos = geo.getAttribute("position"), colors = geo.getAttribute("color");
    expect(colors).toBeDefined();
    expect(colors.itemSize).toBe(3);
    let minY = Infinity, maxY = -Infinity;
    let rootGreen = 0, tipGreen = 0, rootCount = 0, tipCount = 0;
    let rootWidth = -1, tipWidth = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const g = colors.getY(i);
      if (y < .12) { rootGreen += g; rootCount++; rootWidth = Math.max(rootWidth, Math.abs(pos.getX(i))); }
      if (y > .88) { tipGreen += g; tipCount++; tipWidth = Math.max(tipWidth, Math.abs(pos.getX(i))); }
    }
    expect(minY).toBeCloseTo(0, 5);
    expect(maxY).toBeCloseTo(1, 5);
    expect(tipGreen / tipCount).toBeGreaterThan(rootGreen / rootCount);
    expect(tipWidth).toBeLessThan(rootWidth);
  });
  it("arches the blade out of the flat plane without lifting the root", () => {
    const pos = createPlantGeometry().getAttribute("position");
    let midZ = 0, baseZ = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), z = Math.abs(pos.getZ(i));
      if (y > .45 && y < .55) midZ = Math.max(midZ, z);
      if (y < .12) baseZ = Math.max(baseZ, z);
    }
    expect(midZ).toBeGreaterThan(baseZ * 2);
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
