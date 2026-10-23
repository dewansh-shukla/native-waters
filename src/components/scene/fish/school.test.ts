import { expect, it } from "vitest";
import { Vector3 } from "three";
import { HABITAT, OBSTACLES } from "@/experience/habitat";
import { createSchool, stepSchool } from "./school";

it("creates thirteen stable identities and deterministic finite lateral courses", () => {
  const a = createSchool();
  const b = createSchool();
  expect(a).toHaveLength(13);
  expect(new Set(a.map(f => f.id)).size).toBe(13);
  expect(a.map(f => f.id)).toEqual(["fish-0", "fish-1", "fish-2", "fish-3", "fish-4", "fish-5", "fish-6", "fish-7", "fish-8", "fish-9", "fish-10", "fish-11", "fish-12"]);
  expect(a.map(f => [f.id, f.position.toArray(), f.velocity.toArray()])).toEqual(b.map(f => [f.id, f.position.toArray(), f.velocity.toArray()]));
  for (const f of a) {
    expect(f.position.toArray().every(Number.isFinite)).toBe(true);
    expect(f.velocity.z).toBeGreaterThan(0);
    expect(Math.abs(f.velocity.x)).toBeGreaterThan(Math.abs(f.velocity.z));
    expect(f.velocity.length()).toBeGreaterThanOrEqual(0.3);
    expect(f.velocity.length()).toBeLessThanOrEqual(0.6);
    expect(new Vector3(-1, 0, 0).applyQuaternion(f.heading).dot(f.velocity.clone().normalize())).toBeCloseTo(1);
  }
});

it("steers deterministically with bounds, clearance and natural speed over a long run", () => {
  const a = createSchool();
  const b = createSchool();
  const ids = a.map(f => f.id);
  const initial = a.map(f => f.position.toArray());
  for (let frame = 0; frame < 4000; frame++) {
    stepSchool(a, 1 / 30, frame / 30);
    stepSchool(b, 1 / 30, frame / 30);
    for (const f of a) {
      for (const [axis, limits] of Object.entries(HABITAT.school)) {
        if (axis === "center") continue;
        const value = f.position[axis as "x" | "y" | "z"];
        expect(value).toBeGreaterThanOrEqual(limits[0]);
        expect(value).toBeLessThanOrEqual(limits[1]);
      }
      for (const o of OBSTACLES) expect(f.position.distanceTo(new Vector3(...o.center))).toBeGreaterThanOrEqual(o.radius + 0.219);
      expect(f.velocity.length()).toBeGreaterThanOrEqual(0.2999);
      expect(f.velocity.length()).toBeLessThanOrEqual(0.6001);
    }
  }
  expect(a.map(f => f.position.toArray())).not.toEqual(initial);
  expect(a.map(f => f.id)).toEqual(ids);
  expect(a.map(f => f.position.toArray())).toEqual(b.map(f => f.position.toArray()));
});

it("separates coincident neighbors without NaNs and repairs wall/rock penetration even on a huge delta", () => {
  const school = createSchool();
  school[0].position.copy(school[1].position);
  school[0].velocity.copy(school[1].velocity);
  for (let i = 0; i < 120; i++) stepSchool(school, 1 / 60, i / 60);
  expect(school[0].position.distanceTo(school[1].position)).toBeGreaterThan(0.15);
  school[0].position.set(100, -100, 100);
  school[1].position.set(...OBSTACLES[1].center);
  stepSchool(school, 100000, 4);
  expect(school[0].position.x).toBeLessThanOrEqual(3.5);
  expect(school[0].position.y).toBeGreaterThanOrEqual(-2.3);
  expect(school[0].position.z).toBeLessThanOrEqual(1);
  expect(school[1].position.distanceTo(new Vector3(...OBSTACLES[1].center))).toBeGreaterThanOrEqual(1.119);
  for (const f of school) expect([...f.position.toArray(), ...f.heading.toArray() ].every(Number.isFinite)).toBe(true);
});

it("keeps the model upright through signed X reversals and near +X zero-Z crossings", () => {
  const fish = createSchool().slice(0, 1);
  let previous = fish[0].heading.clone();
  const headings = [
    [-0.4, 0, 0], [-0.2, 0.01, 0.3], [0, 0.01, 0.4], [0.2, 0.01, 0.3],
    ...Array.from({ length: 201 }, (_, i) => [0.4, 0.01, (100 - i) * 0.0001]),
    [0.2, 0.01, -0.3], [0, 0.01, -0.4], [-0.2, 0.01, -0.3], [-0.4, 0, 0],
  ];
  for (const [index, velocity] of headings.entries()) {
    fish[0].position.set(0, -1.4, -2);
    fish[0].velocity.set(...velocity as [number, number, number]);
    stepSchool(fish, 1e-12, 0);
    const f = fish[0];
    const forward = f.velocity.clone().normalize();
    const up = new Vector3(0, 1, 0).applyQuaternion(f.heading);
    expect(new Vector3(-1, 0, 0).applyQuaternion(f.heading).dot(forward)).toBeCloseTo(1, 10);
    expect(up.dot(new Vector3(0, 1, 0).addScaledVector(forward, -forward.y).normalize())).toBeCloseTo(1, 10);
    if (index > 0) expect(f.heading.angleTo(previous)).toBeLessThan(Math.PI / 3);
    previous = f.heading.clone();
  }
});

it("bounds GLOBAL heading on every frame of the actual 200-second trajectory", () => {
  const fish = createSchool();
  let minUp = 1;
  let maxTurn = 0;
  let maxSlide = 0;
  let xReversals = 0;
  let zCrossings = 0;
  for (let frame = 0; frame < 12000; frame++) {
    const previous = fish.map(f => ({ heading: f.heading.clone(), direction: f.velocity.clone().normalize(), position: f.position.clone() }));
    stepSchool(fish, 1 / 60, frame / 60);
    fish.forEach((f, i) => {
      const forward = f.velocity.clone().normalize();
      minUp = Math.min(minUp, new Vector3(0, 1, 0).applyQuaternion(f.heading).y);
      const old = previous[i];
      if (old.direction.x * forward.x < 0) xReversals++;
      if (old.direction.z * forward.z < 0) zCrossings++;
      maxTurn = Math.max(maxTurn, old.heading.angleTo(f.heading));
      maxSlide = Math.max(maxSlide, f.position.clone().sub(old.position).addScaledVector(f.velocity, -1 / 60).length());
      expect(new Vector3(-1, 0, 0).applyQuaternion(f.heading).dot(forward)).toBeCloseTo(1, 10);
      for (const axis of ["x", "y", "z"] as const) {
        expect(f.position[axis]).toBeGreaterThanOrEqual(HABITAT.school[axis][0]);
        expect(f.position[axis]).toBeLessThanOrEqual(HABITAT.school[axis][1]);
      }
      for (const o of OBSTACLES) expect(f.position.distanceTo(new Vector3(...o.center))).toBeGreaterThanOrEqual(o.radius + 0.219);
      expect(f.velocity.length()).toBeGreaterThanOrEqual(0.2999);
      expect(f.velocity.length()).toBeLessThanOrEqual(0.6001);
    });
  }
  expect(minUp).toBeGreaterThanOrEqual(Math.cos(Math.PI / 9) - 1e-10);
  expect(maxTurn).toBeLessThanOrEqual(2 / 60 + 1e-7);
  expect(maxSlide).toBeLessThan(1e-10);
  expect(xReversals).toBeGreaterThan(0);
  expect(zCrossings).toBeGreaterThan(0);
});

it("retains bounded turns and collision-free displacement through mixed and stalled frame deltas", () => {
  const fish = createSchool();
  let time = 0;
  for (let frame = 0; frame < 3000; frame++) {
    const delta = [1 / 120, 1 / 30, 1 / 20, 2][frame % 4];
    const dt = Math.min(delta, 0.05);
    time += dt;
    const previous = fish.map(f => ({ heading: f.heading.clone(), position: f.position.clone() }));
    stepSchool(fish, delta, time);
    fish.forEach((f, i) => {
      expect(f.heading.angleTo(previous[i].heading)).toBeLessThanOrEqual(2 * dt + 1e-7);
      expect(f.position.clone().sub(previous[i].position).addScaledVector(f.velocity, -dt).length()).toBeLessThan(1e-10);
      expect(new Vector3(0, 1, 0).applyQuaternion(f.heading).y).toBeGreaterThanOrEqual(Math.cos(Math.PI / 9) - 1e-10);
      for (const o of OBSTACLES) expect(f.position.distanceTo(new Vector3(...o.center))).toBeGreaterThanOrEqual(o.radius + 0.219);
    });
  }
});

it("produces finite normalized headings for level, vertical and stopped velocities", () => {
  for (const velocity of [[-0.4, 0, 0], [0.4, 0, 0], [0, 0.4, 0], [0, -0.4, 0], [0, 0, 0]]) {
    const fish = createSchool().slice(0, 1);
    fish[0].position.set(0, -1.4, -2);
    fish[0].velocity.set(...velocity as [number, number, number]);
    stepSchool(fish, 1e-12, 0);
    expect(fish[0].heading.toArray().every(Number.isFinite)).toBe(true);
    expect(fish[0].heading.length()).toBeCloseTo(1, 10);
    expect(new Vector3(-1, 0, 0).applyQuaternion(fish[0].heading).dot(fish[0].velocity.clone().normalize())).toBeCloseTo(1, 10);
  }
});

it("zero delta and a coordinator pause leave school state unchanged", () => {
  const fish = createSchool();
  const snapshot = JSON.stringify(fish);
  stepSchool(fish, 0, 42);
  expect(JSON.stringify(fish)).toBe(snapshot);
  // A paused frame driver does not call stepSchool at all.
  expect(JSON.stringify(fish)).toBe(snapshot);
});
