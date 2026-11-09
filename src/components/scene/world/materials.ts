import type { MeshStandardMaterial, Vector3 } from "three";

type Shader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];
export type WorldUniforms = { time: { value: number }; richness: { value: number }; flow: { value: Vector3 } };

// shortcut: procedural light bands approximate caustics, upgrade to projected optics only after GPU profiling.
// Shared value-noise stack: fbm drives (a) diffuse mottling, (b) fragment-space
// normal perturbation and (c) roughness variation, so light actually breaks
// across the surfaces instead of sliding off flat paint.
const NOISE_GLSL = `
  float riverHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float riverNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(riverHash(i), riverHash(i + vec2(1.0, 0.0)), f.x),
               mix(riverHash(i + vec2(0.0, 1.0)), riverHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float riverFbm(vec2 p) {
    return riverNoise(p) * 0.55 + riverNoise(p * 2.7 + 11.3) * 0.28 + riverNoise(p * 6.1 + 23.7) * 0.17;
  }
  float riverBump(vec2 p) {
    return riverFbm(p * 3.2) + (riverNoise(vec2(p.x * 7.0 + p.y * 5.2, p.x * 3.3 - p.y * 8.1)) - 0.5) * 0.35;
  }
`;

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
    shader.fragmentShader = "varying vec3 vRiverPosition; uniform float uWorldTime; uniform float uRichness;\n" + NOISE_GLSL + "\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec2 p = vRiverPosition.xz;
      float grain = riverHash(floor(p * 85.0));
      float silt = sin(p.x * 1.8 + sin(p.y * 2.1)) * sin(p.y * 1.3);
      float mottle = riverFbm(p * 1.0);
      float patchNoise = riverNoise(p * 3.1 + 19.7);
      diffuseColor.rgb *= 0.84 + mottle * 0.16 + patchNoise * 0.10 + grain * 0.06 + silt * 0.08;
      float caustic = pow(max(0.0, sin(p.x * 3.4 + sin(p.y * 2.7 + uWorldTime * 0.32)) * sin(p.y * 3.1 - uWorldTime * 0.24)), 12.0);
      diffuseColor.rgb += vec3(0.12, 0.22, 0.24) * caustic * uRichness;`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * riverFbm(vRiverPosition.xz * 4.0 + 7.3)), 0.0, 1.0);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      vec3 vrp = vRiverPosition;
      float hEps = 0.035;
      // World normal recovered from the view-space normal (rotation-only transpose).
      // Triplanar blend keeps the bump from smearing into streaks on steep faces;
      // on the horizontal bed it degenerates to the plain XZ sample.
      vec3 riverFace = abs((transpose(viewMatrix) * vec4(normal, 0.0)).xyz);
      float riverSum = riverFace.x + riverFace.y + riverFace.z + 1e-5;
      riverFace /= riverSum;
      vec3 riverGrad3D = vec3(0.0);
      if (riverFace.y > 0.15) {
        float hc = riverBump(vrp.xz);
        riverGrad3D += riverFace.y * vec3(
          (riverBump(vrp.xz + vec2(hEps, 0.0)) - hc) / hEps,
          0.0,
          (riverBump(vrp.xz + vec2(0.0, hEps)) - hc) / hEps);
      }
      if (riverFace.x > 0.15) {
        float hc = riverBump(vrp.zy);
        riverGrad3D += riverFace.x * vec3(
          0.0,
          (riverBump(vrp.zy + vec2(0.0, hEps)) - hc) / hEps,
          (riverBump(vrp.zy + vec2(hEps, 0.0)) - hc) / hEps);
      }
      if (riverFace.z > 0.15) {
        float hc = riverBump(vrp.xy);
        riverGrad3D += riverFace.z * vec3(
          (riverBump(vrp.xy + vec2(hEps, 0.0)) - hc) / hEps,
          (riverBump(vrp.xy + vec2(0.0, hEps)) - hc) / hEps,
          0.0);
      }
      vec3 riverGradView = (viewMatrix * vec4(riverGrad3D, 0.0)).xyz;
      normal = normalize(normal + riverGradView * -0.28);`);
  };
}

export function plantShader(uniforms: WorldUniforms) {
  return (shader: Shader) => {
    shader.uniforms.uWorldTime = uniforms.time;
    shader.uniforms.uFlow = uniforms.flow;
    shader.vertexShader = `
      uniform float uWorldTime;
      uniform vec3 uFlow;
      attribute float aWind;
      attribute float aPhase;
      varying float vLeafWind;
      varying float vLeafPhase;
      varying vec3 vLeafWorld;
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
      {
        float normalT = clamp(aWind, 0.0, 1.0);
        float normalT2 = normalT * normalT;
        float normalT4 = normalT2 * normalT2;
        vec3 normalInstanceX = normalize(instanceMatrix[0].xyz);
        vec3 normalInstanceZ = normalize(instanceMatrix[2].xyz);
        vec2 normalFlow = vec2(
          dot(vec2(uFlow.x, uFlow.z), normalInstanceX.xz),
          dot(vec2(uFlow.x, uFlow.z), normalInstanceZ.xz)
        );
        float normalPhase = aPhase + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4;
        vec3 normalRootWorld = (modelMatrix * instanceMatrix * vec4(vec3(0.0), 1.0)).xyz;
        float normalGust = sin(normalRootWorld.x * 0.31 + normalRootWorld.z * 0.24 - uWorldTime * 0.8);
        float normalFast = sin(uWorldTime * 1.75 + normalPhase * 1.7) * 0.012;
        float normalBendX = normalFlow.x * 0.11 + sin(uWorldTime * 0.55 + normalPhase) * 0.045 + normalGust * 0.026;
        float normalBendZ = normalFlow.y * 0.11 + cos(uWorldTime * 0.47 + normalPhase) * 0.035 + normalGust * 0.026 * 0.8;
        float normalHeight = max(position.y / max(normalT, 0.001), 0.25);
        float normalSlopeX = (2.0 * normalT * normalBendX + 5.0 * normalFast * normalT4) / normalHeight;
        float normalSlopeZ = (2.0 * normalT * normalBendZ + 3.5 * normalFast * normalT4) / normalHeight;
        objectNormal.y -= normalSlopeX * objectNormal.x + normalSlopeZ * objectNormal.z;
        float normalTwist = sin(uWorldTime * 0.72 + normalPhase) * 0.12 * normalT2 * normalT;
        objectNormal.xz = mat2(cos(normalTwist), -sin(normalTwist), sin(normalTwist), cos(normalTwist)) * objectNormal.xz;
        objectNormal = normalize(objectNormal);
      }`);
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      float t = clamp(aWind, 0.0, 1.0);
      float bendWeight = t * t;
      float tipWeight = bendWeight * t;
      vec3 instanceX = normalize(instanceMatrix[0].xyz);
      vec3 instanceZ = normalize(instanceMatrix[2].xyz);
      vec2 flowLocal = vec2(
        dot(vec2(uFlow.x, uFlow.z), instanceX.xz),
        dot(vec2(uFlow.x, uFlow.z), instanceZ.xz)
      );
      float rootPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4;
      float phase = aPhase + rootPhase;
      vec3 baseWorld = (modelMatrix * instanceMatrix * vec4(vec3(0.0), 1.0)).xyz;
      float gust = sin(baseWorld.x * 0.31 + baseWorld.z * 0.24 - uWorldTime * 0.8);
      float slowSway = sin(uWorldTime * 0.55 + phase) * 0.045;
      float fastFlutter = sin(uWorldTime * 1.75 + phase * 1.7) * 0.012 * tipWeight;
      float travelingGust = gust * 0.026;
      transformed.x += (flowLocal.x * 0.11 + slowSway + fastFlutter + travelingGust) * bendWeight;
      transformed.z += (flowLocal.y * 0.11 + cos(uWorldTime * 0.47 + phase) * 0.035 + fastFlutter * 0.7 + travelingGust * 0.8) * bendWeight;
      float riverTwist = sin(uWorldTime * 0.72 + phase) * 0.12 * tipWeight;
      float twistCos = cos(riverTwist), twistSin = sin(riverTwist);
      transformed.xz = mat2(twistCos, -twistSin, twistSin, twistCos) * transformed.xz;
      vLeafWind = t;
      vLeafPhase = phase;
      vLeafWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`);

    shader.fragmentShader = NOISE_GLSL + `
      uniform float uWorldTime;
      varying float vLeafWind;
      varying float vLeafPhase;
      varying vec3 vLeafWorld;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float leafMottle = riverFbm(vLeafWorld.xz * 2.8 + vec2(vLeafPhase, vLeafPhase * 0.73));
      float rootSilt = (1.0 - smoothstep(0.0, 0.28, vLeafWind)) * 0.16;
      diffuseColor.rgb *= 0.9 + leafMottle * 0.16 - rootSilt;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.04, 0.82), smoothstep(0.78, 1.0, vLeafWind) * 0.18);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
      roughnessFactor = clamp(mix(0.85, 0.5, vLeafWind), 0.35, 0.95);`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <aomap_fragment>", `#include <aomap_fragment>
      float riverRim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.0);
      reflectedLight.indirectDiffuse += diffuseColor.rgb * riverRim * (0.11 + 0.07 * sin(vLeafPhase + uWorldTime * 0.4));`);
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
