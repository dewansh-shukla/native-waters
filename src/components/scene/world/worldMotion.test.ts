import { describe, expect, it } from "vitest";
import { Vector3, Scene, Color, Fog } from "three";
import { currentAt } from "@/experience/current";
import { OBSTACLES } from "@/experience/habitat";
import { createPlacements, advanceParticle, updateAtmosphere } from "./worldMotion";

describe("habitat placement", () => {
  it("is repeatable, includes exact avoidance boulders, and keeps gravel on the bed", () => {
    const a = createPlacements();
    expect(a).toEqual(createPlacements());
    for (let i = 0; i < OBSTACLES.length; i++) {
      expect(a.rocks[i].position).toEqual([...OBSTACLES[i].center]);
      expect(a.rocks[i].scale).toEqual(Array(3).fill(OBSTACLES[i].radius));
    }
    expect(a.gravel.length).toBeGreaterThan(500);
    for (const stone of a.gravel) {
      expect(Math.abs(stone.position[0])).toBeLessThanOrEqual(12);
      expect(Math.abs(stone.position[2])).toBeLessThanOrEqual(9);
      expect(stone.position[1]).toBeLessThan(-2.8);
    }
    expect(a.plants.some(p => p.position[2] > 2)).toBe(true);
  });
});

describe("shared-time particle motion", () => {
  it("uses shared current and preserves paused positions", () => {
    const p = new Vector3(0, -1.5, -2), scratch = new Vector3();
    const velocity = currentAt(p, 2, new Vector3());
    advanceParticle(p, 2, 2, scratch);
    expect(p.toArray()).toEqual([0, -1.5, -2]);
    advanceParticle(p, 2.02, 2, scratch);
    expect(p.x).toBeCloseTo(velocity.x * .02, 8);
    expect(p.z).toBeCloseTo(-2 + velocity.z * .02, 8);
  });
  it("caps delayed frames, ignores reverse/nonfinite time, and recycles all axes", () => {
    const p = new Vector3(0, -1.5, 0), scratch = new Vector3();
    advanceParticle(p, 100, 0, scratch);
    expect(p.length()).toBeLessThan(1.52);
    expect(p.z).toBeGreaterThan(.01);
    expect(p.z).toBeLessThan(.02);
    const before = p.clone();
    advanceParticle(p, 0, 100, scratch);
    advanceParticle(p, NaN, 0, scratch);
    expect(p.toArray()).toEqual(before.toArray());
    p.set(12.01, -.1, 9.01);
    advanceParticle(p, 1.02, 1, scratch);
    expect(p.x).toBeGreaterThanOrEqual(-12);
    expect(p.x).toBeLessThan(12);
    expect(p.y).toBeGreaterThanOrEqual(-2.8);
    expect(p.y).toBeLessThan(-.15);
    expect(p.z).toBeGreaterThanOrEqual(-9);
    expect(p.z).toBeLessThan(9);
  });
});

describe("world atmosphere ownership", () => {
  it("leaves the map untouched, enables underwater atmosphere, and restores prior values", () => {
    const scene = new Scene();
    const original = new Color("#17191c"); scene.background = original;
    const state = { fog: new Fog("#535d42", 3, 24), background: new Color("#535d42"), previousFog: scene.fog, previousBackground: scene.background, active: false };
    updateAtmosphere(scene, state, false);
    expect(scene.background).toBe(original);
    updateAtmosphere(scene, state, true);
    expect(scene.fog).toBe(state.fog);
    updateAtmosphere(scene, state, false);
    expect(scene.fog).toBeNull();
    expect(scene.background).toBe(original);
  });
  it("does not overwrite a newer owner's background on cleanup", () => {
    const scene = new Scene();
    const state = { fog: new Fog("#535d42", 3, 24), background: new Color("#535d42"), previousFog: scene.fog, previousBackground: scene.background, active: false };
    updateAtmosphere(scene, state, true);
    expect(scene.background).toBe(state.background);
    const newer = new Color("red"); scene.background = newer;
    updateAtmosphere(scene, state, false);
    expect(scene.background).toBe(newer);
  });
});
