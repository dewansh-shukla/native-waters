import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { WATER_FOG_FAR, WATER_FOG_NEAR, WATER_SCATTER_CSS, applyUnderwaterFog, createWaterOptics, createGangaWaterOptics, GANGA_WATER_FOG_FAR, createKrishnaWaterOptics, KRISHNA_WATER_FOG_NEAR, KRISHNA_WATER_FOG_FAR, KRISHNA_WATER_SCATTER_CSS, createGodavariWaterOptics, GODAVARI_WATER_FOG_NEAR, GODAVARI_WATER_FOG_FAR, GODAVARI_WATER_SCATTER_CSS, createBrahmaputraWaterOptics, BRAHMAPUTRA_WATER_FOG_NEAR, BRAHMAPUTRA_WATER_FOG_FAR, BRAHMAPUTRA_WATER_SCATTER_CSS } from "./waterOptics";

function fogShader() {
  return {
    vertexShader: "",
    fragmentShader: "#include <fog_fragment>\n#include <dithering_fragment>",
    uniforms: {} as Record<string, { value: unknown }>,
  };
}

describe("createWaterOptics", () => {
  it("returns the green coastal scatter in display space and per-channel absorption", () => {
    const water = createWaterOptics();
    expect(water.scatter.value).toBeInstanceOf(Vector3);
    // The fog chunk runs after <colorspace_fragment>, so the uniform must hold
    // display-space components; three converts its own fogColor the same way.
    expect(water.scatter.value.toArray()).toEqual([0x21 / 255, 0x45 / 255, 0x38 / 255]);
    expect(WATER_SCATTER_CSS).toBe("#214538");
    expect([WATER_FOG_NEAR, WATER_FOG_FAR]).toEqual([7, 38]);
    expect(water.absorption.value.toArray()).toEqual([0.085, 0.03, 0.06]);
  });

  it("returns fresh instances so one scene cannot mutate another", () => {
    const a = createWaterOptics(), b = createWaterOptics();
    expect(a.scatter.value).not.toBe(b.scatter.value);
    expect(a.absorption.value).not.toBe(b.absorption.value);
  });
});

describe("createGangaWaterOptics", () => {
  it("is visibly murkier than Cauvery: distinct scatter, shorter fog, finite absorption", () => {
    const ganga = createGangaWaterOptics();
    const cauvery = createWaterOptics();
    expect(ganga.scatter.value.toArray()).not.toEqual(cauvery.scatter.value.toArray());
    expect(GANGA_WATER_FOG_FAR).toBeLessThan(WATER_FOG_FAR);
    expect(ganga.absorption.value.toArray().every((v) => Number.isFinite(v))).toBe(true);
    expect(ganga.scatter.value).toBeInstanceOf(Vector3);
    expect(ganga.absorption.value).toBeInstanceOf(Vector3);
  });

  it("returns fresh instances", () => {
    const a = createGangaWaterOptics(), b = createGangaWaterOptics();
    expect(a.scatter.value).not.toBe(b.scatter.value);
    expect(a.absorption.value).not.toBe(b.absorption.value);
  });
});

describe("createKrishnaWaterOptics", () => {
  it("is moderately clear greenish-blue: distinct scatter, fog 8/32, finite absorption", () => {
    const krishna = createKrishnaWaterOptics();
    const cauvery = createWaterOptics();
    expect(krishna.scatter.value.toArray()).not.toEqual(cauvery.scatter.value.toArray());
    expect(KRISHNA_WATER_FOG_NEAR).toBe(8);
    expect(KRISHNA_WATER_FOG_FAR).toBe(32);
    expect(KRISHNA_WATER_SCATTER_CSS).toBe("#1e3a4a");
    expect(krishna.scatter.value.toArray()).toEqual([0x1e / 255, 0x3a / 255, 0x4a / 255]);
    expect(krishna.absorption.value.toArray()).toEqual([0.07, 0.025, 0.05]);
    expect(krishna.scatter.value).toBeInstanceOf(Vector3);
    expect(krishna.absorption.value).toBeInstanceOf(Vector3);
  });

  it("returns fresh instances", () => {
    const a = createKrishnaWaterOptics(), b = createKrishnaWaterOptics();
    expect(a.scatter.value).not.toBe(b.scatter.value);
    expect(a.absorption.value).not.toBe(b.absorption.value);
  });
});

describe("createGodavariWaterOptics", () => {
  it("is moderately turbid brownish-green: distinct scatter, fog 6/26, absorption [0.09, 0.035, 0.07]", () => {
    const godavari = createGodavariWaterOptics();
    const cauvery = createWaterOptics();
    expect(godavari.scatter.value.toArray()).not.toEqual(cauvery.scatter.value.toArray());
    expect(GODAVARI_WATER_FOG_NEAR).toBe(6);
    expect(GODAVARI_WATER_FOG_FAR).toBe(26);
    expect(GODAVARI_WATER_SCATTER_CSS).toBe("#2a3a2a");
    expect(godavari.scatter.value.toArray()).toEqual([0x2a / 255, 0x3a / 255, 0x2a / 255]);
    expect(godavari.absorption.value.toArray()).toEqual([0.09, 0.035, 0.07]);
    expect(godavari.scatter.value).toBeInstanceOf(Vector3);
    expect(godavari.absorption.value).toBeInstanceOf(Vector3);
  });

  it("returns fresh instances", () => {
    const a = createGodavariWaterOptics(), b = createGodavariWaterOptics();
    expect(a.scatter.value).not.toBe(b.scatter.value);
    expect(a.absorption.value).not.toBe(b.absorption.value);
  });
});

describe("createBrahmaputraWaterOptics", () => {
  it("is clear greenish Himalayan-fed: distinct scatter, fog 10/35, absorption [0.06, 0.02, 0.04]", () => {
    const brahmaputra = createBrahmaputraWaterOptics();
    const cauvery = createWaterOptics();
    expect(brahmaputra.scatter.value.toArray()).not.toEqual(cauvery.scatter.value.toArray());
    expect(BRAHMAPUTRA_WATER_FOG_NEAR).toBe(10);
    expect(BRAHMAPUTRA_WATER_FOG_FAR).toBe(35);
    expect(BRAHMAPUTRA_WATER_SCATTER_CSS).toBe("#1a3a2a");
    expect(brahmaputra.scatter.value.toArray()).toEqual([0x1a / 255, 0x3a / 255, 0x2a / 255]);
    expect(brahmaputra.absorption.value.toArray()).toEqual([0.06, 0.02, 0.04]);
    expect(brahmaputra.scatter.value).toBeInstanceOf(Vector3);
    expect(brahmaputra.absorption.value).toBeInstanceOf(Vector3);
  });

  it("returns fresh instances", () => {
    const a = createBrahmaputraWaterOptics(), b = createBrahmaputraWaterOptics();
    expect(a.scatter.value).not.toBe(b.scatter.value);
    expect(a.absorption.value).not.toBe(b.absorption.value);
  });
});

describe("applyUnderwaterFog", () => {
  it("replaces the monochrome fog chunk with Beer-Lambert absorption", () => {
    const shader = fogShader();
    applyUnderwaterFog(shader as never, createWaterOptics());
    expect(shader.fragmentShader).not.toContain("#include <fog_fragment>");
    expect(shader.fragmentShader).toContain("USE_FOG");
    expect(shader.fragmentShader).toContain("vFogDepth");
    expect(shader.fragmentShader).toContain("exp(-uWaterAbsorb");
    expect(shader.fragmentShader).toContain("uWaterScatter");
    expect(shader.uniforms.uWaterScatter).toBeDefined();
    expect(shader.uniforms.uWaterAbsorb).toBeDefined();
  });

  it("leaves a shader without the fog chunk untouched", () => {
    const shader = { vertexShader: "", fragmentShader: "void main() {}", uniforms: {} as Record<string, unknown> };
    const before = shader.fragmentShader;
    applyUnderwaterFog(shader as never, createWaterOptics());
    expect(shader.fragmentShader).toBe(before);
    expect(shader.uniforms).toEqual({});
  });
});
