import { Color, Vector3, type MeshStandardMaterial } from "three";

type Shader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];

export type WaterOptics = { scatter: { value: Color }; absorption: { value: Vector3 } };

// Green, turbid river rather than ocean blue: Jerlov coastal coefficients
// dialed down until fish stay readable at 2-4 m.
export const WATER_SCATTER_CSS = "#214538";

// Per-metre Beer-Lambert extinction. Red is absorbed first and green
// survives longest, which is what turns distance green instead of blue.
const ABSORPTION = [0.085, 0.03, 0.06] as const;

export function createWaterOptics(): WaterOptics {
  return {
    scatter: { value: new Color(WATER_SCATTER_CSS) },
    absorption: { value: new Vector3(...ABSORPTION) },
  };
}

// Replaces three's monochrome fog mix. vFogDepth is camera distance, so the
// result depends only on the view - never on the bed geometry - and the
// future land rework can swap the terrain without touching water optics.
export const WATER_FOG_GLSL = `
#ifdef USE_FOG
  {
    vec3 waterTransmit = exp(-uWaterAbsorb * vFogDepth);
    gl_FragColor.rgb = gl_FragColor.rgb * waterTransmit + uWaterScatter * (1.0 - waterTransmit);
  }
#endif
`;

export function applyUnderwaterFog(shader: Shader, water: WaterOptics) {
  if (!shader.fragmentShader.includes("#include <fog_fragment>")) return;
  shader.uniforms.uWaterScatter = water.scatter;
  shader.uniforms.uWaterAbsorb = water.absorption;
  shader.fragmentShader = "uniform vec3 uWaterScatter;\nuniform vec3 uWaterAbsorb;\n" + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace("#include <fog_fragment>", WATER_FOG_GLSL);
}
