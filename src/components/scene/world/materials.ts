import type { MeshStandardMaterial, Vector3 } from "three";

type Shader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];
export type WorldUniforms = { time: { value: number }; richness: { value: number }; flow: { value: Vector3 } };

// shortcut: procedural light bands approximate caustics, upgrade to projected optics only after GPU profiling.
export function substrateShader(uniforms: WorldUniforms) {
  return (shader: Shader) => {
    shader.uniforms.uWorldTime = uniforms.time;
    shader.uniforms.uRichness = uniforms.richness;
    shader.vertexShader = "varying vec3 vRiverPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 riverPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        riverPosition = instanceMatrix * riverPosition;
      #endif
      vRiverPosition = (modelMatrix * riverPosition).xyz;`);
    shader.fragmentShader = "varying vec3 vRiverPosition; uniform float uWorldTime; uniform float uRichness;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec2 p = vRiverPosition.xz;
      float grain = fract(sin(dot(floor(p * 85.0), vec2(127.1, 311.7))) * 43758.5453);
      float silt = sin(p.x * 1.8 + sin(p.y * 2.1)) * sin(p.y * 1.3);
      diffuseColor.rgb *= 0.78 + grain * 0.28 + silt * 0.08;
      float caustic = pow(max(0.0, sin(p.x * 3.4 + sin(p.y * 2.7 + uWorldTime * 0.32)) * sin(p.y * 3.1 - uWorldTime * 0.24)), 12.0);
      diffuseColor.rgb += vec3(0.12, 0.22, 0.24) * caustic * uRichness;`);
  };
}

export function plantShader(uniforms: WorldUniforms) {
  return (shader: Shader) => {
    shader.uniforms.uWorldTime = uniforms.time;
    shader.uniforms.uFlow = uniforms.flow;
    shader.vertexShader = "uniform float uWorldTime; uniform vec3 uFlow;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      float tip = max(position.y, 0.0);
      float rootPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4;
      transformed.x *= 1.0 - tip * 0.9;
      transformed.x += tip * tip * (uFlow.x * 0.75 + sin(uWorldTime * 0.9 + rootPhase) * 0.06);
      transformed.z += tip * tip * (uFlow.z * 0.6 + sin(uWorldTime * 0.7 + rootPhase) * 0.075);`);
  };
}

export const surfaceVertex = `
  uniform float uTime;
  varying vec3 vWorld;
  void main() {
    vec3 p = position;
    // Displacement is deliberately tiny: the agreed mean surface remains Y=0.
    p.z += 0.018 * sin(p.x * 1.3 + uTime * 0.55) * cos(p.y * 1.7 - uTime * 0.4);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
export const surfaceFragment = `
  uniform float uTime;
  uniform float uRichness;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    vec3 normal = normalize(vec3(0.045 * cos(p.x * 1.3 + uTime * 0.55), 1.0, 0.04 * sin(p.y * 1.7 - uTime * 0.4)));
    if (uRichness > 0.5) normal.xz += 0.035 * vec2(sin(p.y * 9.0 + uTime), cos(p.x * 8.0 - uTime * 0.7));
    normal = normalize(normal);
    vec3 eye = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - abs(dot(eye, normal)), 3.0);
    float glint = 0.0;
    if (uRichness > 0.5) glint = pow(max(0.0, dot(reflect(-normalize(vec3(-0.4, 1.0, 0.25)), normal), eye)), 55.0);
    vec3 color = mix(vec3(0.06, 0.20, 0.24), vec3(0.30, 0.52, 0.48), fresnel);
    if (!gl_FrontFacing) color = mix(vec3(0.12, 0.30, 0.32), vec3(0.40, 0.62, 0.58), fresnel);
    color += glint * vec3(0.9, 0.95, 0.85);
    gl_FragColor = vec4(color, 0.56 + fresnel * 0.35);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
