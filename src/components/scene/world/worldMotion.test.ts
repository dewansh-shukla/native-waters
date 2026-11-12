import { describe, expect, it } from "vitest";
import { Vector3, Scene, Color, Fog } from "three";
import { currentAt } from "@/experience/current";
import { OBSTACLES } from "@/experience/habitat";
import { createPlacements, advanceParticle, createSiltParticles, SILT_COUNT, siltParticleAt, updateAtmosphere } from "./worldMotion";
import type { SiltParticle } from "./worldMotion";

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
  it("sinks marine snow slowly while it drifts", () => {
    // At this spot and time the shared current has no vertical component, so
    // the only downward motion is the settling drift.
    const p = new Vector3(0, -1.5, -2), scratch = new Vector3();
    advanceParticle(p, 2.02, 2, scratch);
    expect(p.y).toBeCloseTo(-1.5 - 0.02 * 0.02, 8);
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

describe("silt puffs", () => {
  const cycleLength = (p: SiltParticle) => 4 + (p.seed / 4294967296) * 4;

  it("silt particles are a pure function of absolute time", () => {
    const [p] = createSiltParticles(4, 77);
    const out = new Vector3();
    for (let i = 1; i <= 100; i++) siltParticleAt(p, i / 10, out);
    const stepped = out.clone();
    const direct = siltParticleAt(p, 10, new Vector3());
    expect(stepped.toArray()).toEqual(direct.toArray());
  });

  it("silt stays near the bed and never enters the swim layer", () => {
    const particles = createSiltParticles(6, 91);
    for (const p of particles) {
      for (let t = 0; t <= 12; t += 0.05) {
        const pos = siltParticleAt(p, t, new Vector3());
        expect(pos.y).toBeGreaterThanOrEqual(-3.05);
        expect(pos.y).toBeLessThanOrEqual(-2.25);
      }
    }
  });

  it("silt drifts with the current, slower than the flow", () => {
    const [p] = createSiltParticles(3, 5);
    const flow = new Vector3();
    // Find an active-window instant with a meaningful current to compare against.
    for (let t = 1; t <= 40; t += 0.25) {
      const T = cycleLength(p);
      const age = (t % T) - T * .35;
      if (age < .5 || age > 2) continue;
      const pos = siltParticleAt(p, t, new Vector3());
      currentAt(p.anchor, t, flow);
      if (flow.length() < .05) continue;
      const dx = pos.x - p.anchor.x, dz = pos.z - p.anchor.z;
      expect(dx * flow.x + dz * flow.z).toBeGreaterThan(0);
      return;
    }
    throw new Error("no active window with meaningful current found");
  });

  it("silt counts match the tier constants and construction is deterministic", () => {
    expect(SILT_COUNT.HIGH).toBe(36);
    expect(SILT_COUNT.LOW).toBe(12);
    const a = createSiltParticles(10, 3);
    expect(a).toHaveLength(10);
    expect(a).toEqual(createSiltParticles(10, 3));
  });

  it("dormant puffs park exactly at their anchor", () => {
    const [p] = createSiltParticles(2, 17);
    const T = cycleLength(p);
    const pos = siltParticleAt(p, T * 2, new Vector3());
    expect(pos.toArray()).toEqual(p.anchor.toArray());
    const early = siltParticleAt(p, T * .1, new Vector3());
    expect(early.toArray()).toEqual(p.anchor.toArray());
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
