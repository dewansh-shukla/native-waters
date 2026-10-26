import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { plantShader, substrateShader, type WorldUniforms } from "./materials";

type FakeShader = ReturnType<typeof fakeShader>;

function fakeShader(): { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: number }> } {
  return {
    vertexShader: "#include <begin_vertex>",
    fragmentShader: "#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <lights_physical_fragment>",
    uniforms: {},
  };
}

function worldUniforms(): WorldUniforms {
  return { time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } };
}

describe("substrateShader", () => {
  it("registers world uniforms and keeps the caustics behavior", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms())(shader as never);
    expect(shader.uniforms.uWorldTime).toBeDefined();
    expect(shader.uniforms.uRichness).toBeDefined();
    expect(shader.fragmentShader).toContain("caustic");
    expect(shader.fragmentShader).toContain("uRichness");
  });
  it("modulates diffuse with multi-octave fbm mottling", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms())(shader as never);
    const afterColor = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <color_fragment>"));
    expect(afterColor).toContain("riverFbm");
  });
  it("perturbs the fragment normal after it is computed", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms())(shader as never);
    const afterNormals = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <normal_fragment_maps>"));
    expect(afterNormals).toContain("normal = normalize(normal");
    expect(afterNormals).toContain("riverBump");
  });
  it("varies roughness after the roughness map include", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms())(shader as never);
    const afterRoughness = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <roughnessmap_fragment>"));
    expect(afterRoughness).toContain("roughnessFactor =");
  });
});

describe("plantShader", () => {
  it("registers flow and time uniforms for the sway", () => {
    const shader = fakeShader();
    plantShader(worldUniforms())(shader as never);
    expect(shader.uniforms.uFlow).toBeDefined();
    expect(shader.uniforms.uWorldTime).toBeDefined();
    expect(shader.vertexShader).toContain("uFlow");
  });
});
