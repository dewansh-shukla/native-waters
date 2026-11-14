import { Vector3, type MeshStandardMaterial } from "three";

type Shader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];

// Values are read-only and shared by every material in the scene.
export type WaterOptics = { scatter: { value: Vector3 }; absorption: { value: Vector3 } };

// Green, turbid river rather than ocean blue: Jerlov coastal coefficients
// dialed down until fish stay readable at 2-4 m.
export const WATER_SCATTER_CSS = "#214538";
export const WATER_FOG_NEAR = 7;
export const WATER_FOG_FAR = 38;

// Ganga: visibly murkier, turbid brown water with shorter clarity.
export const GANGA_WATER_SCATTER_CSS = "#3a2f1e";
export const GANGA_WATER_FOG_NEAR = 5;
export const GANGA_WATER_FOG_FAR = 20;
export const GANGA_SCATTER_CSS = GANGA_WATER_SCATTER_CSS;
export const GANGA_FOG_NEAR = GANGA_WATER_FOG_NEAR;
export const GANGA_FOG_FAR = GANGA_WATER_FOG_FAR;

// Krishna: moderately clear greenish-blue water.
export const KRISHNA_WATER_SCATTER_CSS = "#1e3a4a";
export const KRISHNA_WATER_FOG_NEAR = 8;
export const KRISHNA_WATER_FOG_FAR = 32;
export const KRISHNA_SCATTER_CSS = KRISHNA_WATER_SCATTER_CSS;
export const KRISHNA_FOG_NEAR = KRISHNA_WATER_FOG_NEAR;
export const KRISHNA_FOG_FAR = KRISHNA_WATER_FOG_FAR;

// The fog chunk runs after <colorspace_fragment>, where gl_FragColor is already
// output-encoded, so the uniform must carry display-space components. three
// converts its own fogColor the same way before upload.
const SCATTER_DISPLAY = [0x21 / 255, 0x45 / 255, 0x38 / 255] as const;

// Per-metre Beer-Lambert extinction. Red is absorbed first and green
// survives longest, which is what turns distance green instead of blue.
const ABSORPTION = [0.085, 0.03, 0.06] as const;

function parseHexColor(value: string): [number, number, number] {
  const hex = value.trim().replace(/^#/, "");
  if (hex.length === 3) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

export function createWaterOptics(config?: { scatter?: string; absorption?: readonly number[] }): WaterOptics {
  const scatter = config?.scatter
    ? parseHexColor(config.scatter).map((value) => value / 255)
    : [...SCATTER_DISPLAY];
  const absorption = config?.absorption ? [...config.absorption] : [...ABSORPTION];
  return {
    scatter: { value: new Vector3(...scatter) },
    absorption: { value: new Vector3(...absorption) },
  };
}

// Ganga: brownish, turbid scatter with higher suspended sediment.
const GANGA_SCATTER_DISPLAY = [0x3a / 255, 0x2f / 255, 0x1e / 255] as const;
const GANGA_ABSORPTION = [0.12, 0.05, 0.09] as const;

export const GANGA_ABSORPTION_VALUES = [...GANGA_ABSORPTION];
export const GANGA_WATER_ABSORPTION = [...GANGA_ABSORPTION];

export function createGangaWaterOptics(): WaterOptics {
  return {
    scatter: { value: new Vector3(...GANGA_SCATTER_DISPLAY) },
    absorption: { value: new Vector3(...GANGA_ABSORPTION) },
  };
}

// Krishna: moderately clear greenish-blue scatter with lower absorption.
const KRISHNA_SCATTER_DISPLAY = [0x1e / 255, 0x3a / 255, 0x4a / 255] as const;
const KRISHNA_ABSORPTION_INTERNAL = [0.07, 0.025, 0.05] as const;

export const KRISHNA_ABSORPTION = [...KRISHNA_ABSORPTION_INTERNAL];
export const KRISHNA_ABSORPTION_VALUES = [...KRISHNA_ABSORPTION_INTERNAL];
export const KRISHNA_WATER_ABSORPTION = [...KRISHNA_ABSORPTION_INTERNAL];
export const KRISHNA_WATER_ABSORPTION_VALUES = [...KRISHNA_ABSORPTION_INTERNAL];

export function createKrishnaWaterOptics(): WaterOptics {
  return {
    scatter: { value: new Vector3(...KRISHNA_SCATTER_DISPLAY) },
    absorption: { value: new Vector3(...KRISHNA_ABSORPTION_INTERNAL) },
  };
}

// Godavari: moderately turbid brownish-green scatter.
export const GODAVARI_WATER_SCATTER_CSS = "#2a3a2a";
export const GODAVARI_WATER_FOG_NEAR = 6;
export const GODAVARI_WATER_FOG_FAR = 26;
export const GODAVARI_SCATTER_CSS = GODAVARI_WATER_SCATTER_CSS;
export const GODAVARI_FOG_NEAR = GODAVARI_WATER_FOG_NEAR;
export const GODAVARI_FOG_FAR = GODAVARI_WATER_FOG_FAR;

const GODAVARI_SCATTER_DISPLAY = [0x2a / 255, 0x3a / 255, 0x2a / 255] as const;
const GODAVARI_ABSORPTION_INTERNAL = [0.09, 0.035, 0.07] as const;

export const GODAVARI_ABSORPTION = [...GODAVARI_ABSORPTION_INTERNAL];
export const GODAVARI_ABSORPTION_VALUES = [...GODAVARI_ABSORPTION_INTERNAL];
export const GODAVARI_WATER_ABSORPTION = [...GODAVARI_ABSORPTION_INTERNAL];
export const GODAVARI_WATER_ABSORPTION_VALUES = [...GODAVARI_ABSORPTION_INTERNAL];

export function createGodavariWaterOptics(): WaterOptics {
  return {
    scatter: { value: new Vector3(...GODAVARI_SCATTER_DISPLAY) },
    absorption: { value: new Vector3(...GODAVARI_ABSORPTION_INTERNAL) },
  };
}

// Brahmaputra: greenish, moderately clear water with low absorption.
export const BRAHMAPUTRA_WATER_SCATTER_CSS = "#1a3a2a";
export const BRAHMAPUTRA_WATER_FOG_NEAR = 10;
export const BRAHMAPUTRA_WATER_FOG_FAR = 35;
export const BRAHMAPUTRA_SCATTER_CSS = BRAHMAPUTRA_WATER_SCATTER_CSS;
export const BRAHMAPUTRA_FOG_NEAR = BRAHMAPUTRA_WATER_FOG_NEAR;
export const BRAHMAPUTRA_FOG_FAR = BRAHMAPUTRA_WATER_FOG_FAR;

const BRAHMAPUTRA_SCATTER_DISPLAY = [0x1a / 255, 0x3a / 255, 0x2a / 255] as const;
const BRAHMAPUTRA_ABSORPTION_INTERNAL = [0.06, 0.02, 0.04] as const;

export const BRAHMAPUTRA_ABSORPTION = [...BRAHMAPUTRA_ABSORPTION_INTERNAL];
export const BRAHMAPUTRA_ABSORPTION_VALUES = [...BRAHMAPUTRA_ABSORPTION_INTERNAL];
export const BRAHMAPUTRA_WATER_ABSORPTION = [...BRAHMAPUTRA_ABSORPTION_INTERNAL];
export const BRAHMAPUTRA_WATER_ABSORPTION_VALUES = [...BRAHMAPUTRA_ABSORPTION_INTERNAL];

export function createBrahmaputraWaterOptics(): WaterOptics {
  return {
    scatter: { value: new Vector3(...BRAHMAPUTRA_SCATTER_DISPLAY) },
    absorption: { value: new Vector3(...BRAHMAPUTRA_ABSORPTION_INTERNAL) },
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
