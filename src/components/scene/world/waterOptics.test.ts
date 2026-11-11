import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { WATER_FOG_FAR, WATER_FOG_NEAR, WATER_SCATTER_CSS, applyUnderwaterFog, createWaterOptics } from "./waterOptics";

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
