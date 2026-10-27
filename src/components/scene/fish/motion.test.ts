import { describe, expect, it } from "vitest";
import { bankAngle, beatFrequency, swimTimeScale } from "./motion";

describe("swim motion policy", () => {
  it("beats faster as the fish covers more body lengths per second", () => {
    expect(beatFrequency(0.2, 0.4)).toBeLessThan(beatFrequency(0.5, 0.4));
    expect(beatFrequency(0.3, 0.4)).toBeCloseTo(1.8625, 3);
  });

  it("retimes the 3 Hz clip instead of indexing by roster order", () => {
    expect(swimTimeScale(0.45, 0.37)).toBeCloseTo(0.77, 2);
    expect(swimTimeScale(0.3, 0.37)).toBeLessThan(swimTimeScale(0.6, 0.37));
  });

  it("clamps extreme speeds so the loop never freezes or strobes", () => {
    expect(beatFrequency(0, 0.4)).toBe(1.15);
    expect(beatFrequency(10, 0.2)).toBe(4.5);
    expect(swimTimeScale(0, 0.4)).toBeGreaterThan(0);
  });

  it("banks into left turns and mirrors for right turns", () => {
    expect(bankAngle(1)).toBeGreaterThan(0);
    expect(bankAngle(-1)).toBeLessThan(0);
    expect(bankAngle(100)).toBeCloseTo(0.28, 5);
    expect(bankAngle(-100)).toBeCloseTo(-0.28, 5);
  });
});
