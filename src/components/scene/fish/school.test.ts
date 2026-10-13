import { expect, it } from "vitest";
import { Vector3 } from "three";
import { HABITAT, OBSTACLES } from "@/experience/habitat";
import { createSchool, stepSchool } from "./school";

it("creates ten stable identities and deterministic finite lateral courses", () => {
  const a = createSchool();
  const b = createSchool();
  expect(a).toHaveLength(10);
  expect(new Set(a.map(f => f.id)).size).toBe(10);
  expect(a.map(f => f.id)).toEqual(["fish-0", "fish-1", "fish-2", "fish-3", "fish-4", "fish-5", "fish-6", "fish-7", "fish-8", "fish-9"]);
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

it("zero delta and a coordinator pause leave school state unchanged", () => {
  const fish = createSchool();
  const snapshot = JSON.stringify(fish);
  stepSchool(fish, 0, 42);
  expect(JSON.stringify(fish)).toBe(snapshot);
  // A paused frame driver does not call stepSchool at all.
  expect(JSON.stringify(fish)).toBe(snapshot);
});
