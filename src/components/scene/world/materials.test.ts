import { describe, expect, it } from "vitest";
import { SRGBColorSpace, Texture, Vector3 } from "three";
import { declareRockTextureColorSpaces, plantShader, reorientRockNormal, rockShader, substrateShader, surfaceFragment, surfaceVertex, type WorldUniforms } from "./materials";
import { createWaterOptics } from "./waterOptics";

function fakeShader(): { vertexShader: string; fragmentShader: string; uniforms: Record<string, { value: number }> } {
  return {
    vertexShader: "#include <beginnormal_vertex>\n#include <begin_vertex>",
    fragmentShader: "#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <lights_physical_fragment>\n#include <aomap_fragment>\n#include <fog_fragment>",
    uniforms: {},
  };
}

function worldUniforms(): WorldUniforms {
  return { time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } };
}

describe("substrateShader", () => {
  it("registers world uniforms and keeps the caustics behavior", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.uniforms.uWorldTime).toBeDefined();
    expect(shader.uniforms.uRichness).toBeDefined();
    expect(shader.fragmentShader).toContain("caustic");
    expect(shader.fragmentShader).toContain("uRichness");
  });
  it("modulates diffuse with multi-octave fbm mottling", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    const afterColor = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <color_fragment>"));
    expect(afterColor).toContain("riverFbm");
  });
  it("wets the bed and grows algae on up-facing silt, with settling silt patches", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.vertexShader).toContain("vRiverNormal");
    expect(shader.vertexShader).toContain("USE_INSTANCING");
    expect(shader.fragmentShader).toContain("varying vec3 vRiverNormal");
    const afterColor = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <color_fragment>"));
    expect(afterColor).toContain("algae");
    expect(afterColor).toContain("vRiverNormal.y");
    expect(afterColor).toContain("vec3(0.66, 0.78, 0.70)");
    expect(afterColor).toContain("siltPatch");
    expect(afterColor).toContain("vec3(0.30, 0.27, 0.18)");
  });
  it("fades dual-octave caustics with camera distance", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    const afterColor = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <color_fragment>"));
    expect(afterColor).toContain("causticA");
    expect(afterColor).toContain("causticB");
    expect(afterColor).toContain("domain-warped");
    expect(afterColor).toContain("exp(-camDist / 18.0)");
    expect(afterColor).toContain("cameraPosition");
  });
  it("applies per-channel water absorption after the fog include", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.fragmentShader).toContain("uWaterAbsorb");
    expect(shader.fragmentShader).toContain("uWaterScatter");
  });
  it("perturbs the fragment normal after it is computed", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    const afterNormals = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <normal_fragment_maps>"));
    expect(afterNormals).toContain("normal = normalize(normal");
    expect(afterNormals).toContain("riverBump");
  });
  it("varies roughness after the roughness map include", () => {
    const shader = fakeShader();
    substrateShader(worldUniforms(), createWaterOptics())(shader as never);
    const afterRoughness = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <roughnessmap_fragment>"));
    expect(afterRoughness).toContain("roughnessFactor =");
  });
});

describe("plantShader", () => {
  it("registers flow and time uniforms and the per-vertex blade attributes", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.uniforms.uFlow).toBeDefined();
    expect(shader.uniforms.uWorldTime).toBeDefined();
    expect(shader.vertexShader).toContain("uFlow");
    expect(shader.vertexShader).toContain("attribute float aWind");
    expect(shader.vertexShader).toContain("attribute float aPhase");
    expect(shader.fragmentShader).toContain("uniform float uWorldTime");
  });

  it("bends on a wind weight so roots never move, with clump + blade phase", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.vertexShader).toContain("bendWeight = t * t");
    expect(shader.vertexShader).toContain("fastFlutter");
    expect(shader.vertexShader).toContain("instanceMatrix[3]");
    expect(shader.vertexShader).not.toContain("transformed.x *=");
  });

  it("layers lean, slow sway, fast flutter and a traveling gust on the flow direction", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    const body = shader.vertexShader.slice(shader.vertexShader.indexOf("#include <begin_vertex>"));
    expect(body).toContain("flowLocal.x * 0.11");
    expect(body).toContain("uFlow.x, uFlow.z");
    expect(body).toContain("sin(uWorldTime * 0.55");
    expect(body).toContain("sin(uWorldTime * 1.75");
    expect(body).toContain("baseWorld.x * 0.31 + baseWorld.z * 0.24 - uWorldTime * 0.8");
  });

  it("twists blades after displacement so highlights crawl along the leaf", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    const body = shader.vertexShader.slice(shader.vertexShader.indexOf("riverTwist"));
    expect(body).toContain("mat2(");
    expect(body.split("mat2(").length).toBe(2);
    const normalBody = shader.vertexShader.slice(shader.vertexShader.indexOf("#include <beginnormal_vertex>"));
    expect(normalBody).toContain("normalSlopeX");
    expect(normalBody).toContain("objectNormal.y -=");
    expect(normalBody).toContain("normalTwist");
  });

  it("shades leaves: fbm mottling, root silt, wet tip roughness and rim translucency", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    const fragment = shader.fragmentShader;
    expect(fragment).toContain("varying float vLeafWind");
    expect(fragment).toContain("riverFbm");
    expect(fragment).toContain("roughnessFactor = clamp(mix(0.85, 0.5, vLeafWind)");
    expect(fragment).toContain("riverRim");
    expect(fragment).toContain("reflectedLight");
  });

  it("applies per-channel water absorption to leaf shading", () => {
    const shader = fakeShader();
    plantShader(worldUniforms(), createWaterOptics())(shader as never);
    expect(shader.fragmentShader).toContain("uWaterAbsorb");
    expect(shader.fragmentShader).toContain("uWaterScatter");
  });
});

const rockTextures = () => ({ map: new Texture(), normalMap: new Texture(), roughnessMap: new Texture() });

describe("rockShader", () => {
  it("registers the scanned map samplers plus scale and dampness uniforms", () => {
    const shader = fakeShader(), textures = rockTextures();
    rockShader(textures, worldUniforms(), { dampness: .14 }, createWaterOptics())(shader as never);
    expect(shader.uniforms.uRockColorMap).toBeDefined();
    expect(shader.uniforms.uRockColorMap.value).toBe(textures.map);
    expect(shader.uniforms.uRockNormalMap.value).toBe(textures.normalMap);
    expect(shader.uniforms.uRockRoughnessMap.value).toBe(textures.roughnessMap);
    expect(shader.uniforms.uRockScale).toBeDefined();
    expect(shader.uniforms.uDamp.value).toBe(.14);
  });

  it("declares color spaces: base color sRGB, normal and roughness as data", () => {
    const textures = rockTextures();
    declareRockTextureColorSpaces(textures);
    expect(textures.map.colorSpace).toBe(SRGBColorSpace);
    expect(textures.normalMap.colorSpace).toBe("");
    expect(textures.roughnessMap.colorSpace).toBe("");
  });

  it("samples each scanned map in world-space triplanar projections, weighted by the abs world normal", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), {}, createWaterOptics())(shader as never);
    const fragment = shader.fragmentShader;
    expect(fragment).toContain("varying vec3 vRockWorld");
    expect(fragment).toContain("varying vec3 vRockNormal");
    for (const needle of ["rockUvX", "rockUvY", "rockUvZ", "rockBlend"]) {
      expect(fragment).toContain(needle);
    }
    expect(fragment).toContain("texture2D(uRockColorMap");
    expect(fragment).toContain("texture2D(uRockRoughnessMap");
    expect(fragment).toContain("texture2D(uRockNormalMap");
    expect(shader.vertexShader).toContain("vRockWorld");
    expect(shader.vertexShader).toContain("instanceMatrix");
  });

  it("drives roughness from the scanned map with a restrained silt dampness overlay", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), { dampness: .12 }, createWaterOptics())(shader as never);
    const afterRoughness = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <roughnessmap_fragment>"));
    expect(afterRoughness).toContain("rockRough");
    expect(afterRoughness).toContain("uDamp");
    expect(shader.fragmentShader).not.toContain("metalnessFactor =");
  });

  it("perturbs the fragment normal after it is computed with reoriented triplanar samples", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), {}, createWaterOptics())(shader as never);
    const afterNormals = shader.fragmentShader.slice(shader.fragmentShader.indexOf("#include <normal_fragment_maps>"));
    expect(afterNormals).toContain("rockNormalSample");
    expect(afterNormals).toContain("normal = normalize(normal");
    expect(afterNormals).toContain("rockTileUnrotateNormal(sX.xy, rockUvInputX)");
    expect(afterNormals).toContain("rockTileUnrotateNormal(sY.xy, rockUvInputY)");
    expect(afterNormals).toContain("rockTileUnrotateNormal(sZ.xy, rockUvInputZ)");
    expect(shader.fragmentShader).toContain("return vec2(c * tangent.x + s * tangent.y, -s * tangent.x + c * tangent.y)");
    expect(afterNormals).toContain("vec3 rockNX = vec3(sX.z * rockSignX, sX.x, sX.y * rockSignX)");
    expect(afterNormals).toContain("vec3 rockNY = vec3(sY.y, sY.z * rockSignY, sY.x * rockSignY)");
    expect(afterNormals).toContain("vec3 rockNZ = vec3(sZ.x, sZ.y * rockSignZ, sZ.z * rockSignZ)");
  });

  it("reorients flat and directional normal samples for every signed axis and 90-degree tile turn", () => {
    const axes = ["x", "y", "z"] as const;
    const rotate = (x: number, y: number, quarterTurns: number) => {
      const angle = quarterTurns * Math.PI / 2;
      return [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)];
    };
    const expectedFlat = (axis: typeof axes[number], sign: number): [number, number, number] =>
      axis === "x" ? [sign, 0, 0] : axis === "y" ? [0, sign, 0] : [0, 0, sign];
    const expectedDirectional = (axis: typeof axes[number], sign: number, sample: [number, number, number]): [number, number, number] =>
      axis === "x" ? [sample[2] * sign, sample[0], sample[1] * sign]
        : axis === "y" ? [sample[1], sample[2] * sign, sample[0] * sign]
          : [sample[0], sample[1] * sign, sample[2] * sign];

    for (const axis of axes) for (const sign of [-1, 1] as const) for (let quarterTurns = 0; quarterTurns < 4; quarterTurns++) {
      const flat = reorientRockNormal([0, 0, 1], axis, sign, quarterTurns);
      expect(flat[0]).toBeCloseTo(expectedFlat(axis, sign)[0], 8);
      expect(flat[1]).toBeCloseTo(expectedFlat(axis, sign)[1], 8);
      expect(flat[2]).toBeCloseTo(expectedFlat(axis, sign)[2], 8);

      const tangent: [number, number, number] = [.6, .2, Math.sqrt(.6)];
      const [rotatedX, rotatedY] = rotate(tangent[0], tangent[1], quarterTurns);
      const actual = reorientRockNormal([rotatedX, rotatedY, tangent[2]], axis, sign, quarterTurns);
      const expected = expectedDirectional(axis, sign, tangent);
      expect(actual[0]).toBeCloseTo(expected[0], 8);
      expect(actual[1]).toBeCloseTo(expected[1], 8);
      expect(actual[2]).toBeCloseTo(expected[2], 8);
    }
  });

  it("breaks up repeated tiling with a deterministic per-chunk offset and 90-degree rotation", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), {}, createWaterOptics())(shader as never);
    const fragment = shader.fragmentShader;
    expect(fragment).toContain("riverHash");
    expect(fragment).toMatch(/rockTileOffset|rockTileRotate/);
  });

  it("leaves the substrate shader untouched when only the rock shader is applied", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), {}, createWaterOptics())(shader as never);
    expect(shader.fragmentShader).not.toContain("caustic");
  });

  it("applies water absorption while preserving the scanned stone albedo", () => {
    const shader = fakeShader();
    rockShader(rockTextures(), worldUniforms(), {}, createWaterOptics())(shader as never);
    expect(shader.fragmentShader).toContain("uWaterAbsorb");
    expect(shader.fragmentShader).toContain("texture2D(uRockColorMap");
    expect(shader.fragmentShader).not.toContain("algae");
  });
});


describe("surface shaders", () => {
  it("tints the top and underside to the green river palette", () => {
    expect(surfaceFragment).toContain("vec3(0.04, 0.13, 0.10)");
    expect(surfaceFragment).toContain("vec3(0.18, 0.34, 0.27)");
    expect(surfaceFragment).toContain("vec3(0.05, 0.14, 0.11)");
    expect(surfaceFragment).toContain("vec3(0.18, 0.34, 0.28)");
  });

  it("animates the underside with a second ripple octave", () => {
    expect(surfaceFragment).toContain("p.y * 6.0 + uTime * 0.8");
    expect(surfaceFragment).toContain("normal.xz +=");
    expect(surfaceVertex).toContain("uTime");
  });
});

