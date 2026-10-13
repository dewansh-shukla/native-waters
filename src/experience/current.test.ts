import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { currentAt } from "./current";

describe("shared current", () => {
  it("writes into the supplied vector deterministically without mutating position", () => {
    const position = new Vector3(2, -1, -3);
    const out = new Vector3(99, 99, 99);
    expect(currentAt(position, 4, out)).toBe(out);
    expect(position.toArray()).toEqual([2, -1, -3]);
    expect(currentAt(position, 4, new Vector3()).toArray()).toEqual(out.toArray());
  });

  it("keeps finite, bounded turbulence and a predominantly positive Z direction across the habitat", () => {
    const out = new Vector3();
    for (const time of [0, 0.01, 1, 30, 1000, 1e6]) {
      for (const x of [-12, -3.5, 0, 3.5, 12]) {
        for (const y of [-3, -1.5, 0]) {
          for (const z of [-9, 0, 9]) {
            currentAt(new Vector3(x, y, z), time, out);
            expect(out.toArray().every(Number.isFinite)).toBe(true);
            expect(Math.abs(out.x)).toBeLessThanOrEqual(0.08);
            expect(Math.abs(out.y)).toBeLessThanOrEqual(0.03);
            expect(out.z).toBeGreaterThanOrEqual(0.2);
            expect(out.z).toBeLessThanOrEqual(0.4);
            expect(out.z).toBeGreaterThan(Math.hypot(out.x, out.y));
          }
        }
      }
    }
  });

  it("varies smoothly with shared position and time", () => {
    const position = new Vector3(1, -1.5, -2);
    const initial = currentAt(position, 0, new Vector3());
    expect(currentAt(position, 10, new Vector3()).distanceTo(initial)).toBeGreaterThan(0.001);
    expect(currentAt(position, 0.001, new Vector3()).distanceTo(initial)).toBeLessThan(0.001);
    expect(currentAt(new Vector3(1.001, -1.5, -2), 0, new Vector3()).distanceTo(initial)).toBeLessThan(0.001);
  });
});
