import { NoColorSpace, SRGBColorSpace, type MeshStandardMaterial, type Texture, type Vector3 } from "three";
import { applyUnderwaterFog, type WaterOptics } from "./waterOptics";

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

export type GroundShaderOptions = { blend?: number };

// Scanned riverbed gravel, claimed by the exposed zones only. The same
// per-tile anti-tiling trick as the stone shader keeps the 24 x 18 m bed
// from reading as one repeating photograph, and the mask formula mirrors
// the algae/siltPatch mixes below so gravel loses exactly where the fine
// sediment wins (riffle/pool zoning).
const GROUND_SAMPLER_GLSL = `
  uniform sampler2D uGroundMap;
  uniform sampler2D uGroundNormalMap;
  uniform sampler2D uGroundRoughnessMap;
  uniform float uGroundBlend;
  float groundTileAngle(vec2 uv) {
    return floor(riverHash(floor(uv)) * 4.0) * 1.5707963;
  }
  vec2 groundTileRotate(vec2 local, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  }
  vec2 groundTileUnrotateNormal(vec2 tangent, vec2 uv) {
    float angle = groundTileAngle(uv);
    float c = cos(angle), s = sin(angle);
    return vec2(c * tangent.x + s * tangent.y, -s * tangent.x + c * tangent.y);
  }
  vec2 groundTileOffset(vec2 uv) {
    vec2 cell = floor(uv), local = fract(uv);
    float h = riverHash(cell);
    return cell + groundTileRotate(local - .5, groundTileAngle(uv)) + (vec2(h, riverHash(cell + 31.7)) - .5) * .12 + .5;
  }
  float riverGroundMask() {
    vec2 mp = vRiverPosition.xz;
    float maskAlgae = smoothstep(0.55, 0.95, vRiverNormal.y) * smoothstep(0.35, 0.8, riverFbm(mp * 0.7 + 5.3));
    float maskSilt = smoothstep(0.55, 0.9, riverFbm(mp * 0.35 + 9.1)) * (1.0 - maskAlgae);
    return uGroundBlend * smoothstep(0.45, 0.75, riverFbm(mp * 0.5 + 3.7)) * (1.0 - maskSilt) * (1.0 - maskAlgae);
  }
`;

// The color patch is composed so the scanned gravel lands between the
// substrate base (mottling + wet tint) and the sheltered silt/algae mixes:
// gravel claims the exposed zones, the procedural layers keep the pockets.
const SUBSTRATE_COLOR_HEAD_GLSL = `#include <color_fragment>
      vec2 p = vRiverPosition.xz;
      float grain = riverHash(floor(p * 85.0));
      float silt = sin(p.x * 1.8 + sin(p.y * 2.1)) * sin(p.y * 1.3);
      float mottle = riverFbm(p * 1.0);
      float patchNoise = riverNoise(p * 3.1 + 19.7);
      diffuseColor.rgb *= 0.84 + mottle * 0.16 + patchNoise * 0.10 + grain * 0.06 + silt * 0.08;
      // Wet, sunken bed: darker and greener than the dry bank palette.
      diffuseColor.rgb *= vec3(0.66, 0.78, 0.70);
      // Algae favors up-facing surfaces and crevices; bare silt settles in the flats.
      float algae = smoothstep(0.55, 0.95, vRiverNormal.y) * smoothstep(0.35, 0.8, riverFbm(p * 0.7 + 5.3));
      float siltPatch = smoothstep(0.55, 0.9, riverFbm(p * 0.35 + 9.1)) * (1.0 - algae);`;

const SUBSTRATE_GROUND_COLOR_GLSL = `
      {
        vec3 groundBlend = abs(vRiverNormal);
        groundBlend /= max(groundBlend.x + groundBlend.y + groundBlend.z, 1e-5);
        vec2 groundUvX = groundTileOffset(vRiverPosition.yz * vec2(1.0, sign(vRiverNormal.x)) * 0.55);
        vec2 groundUvY = groundTileOffset(vRiverPosition.zx * vec2(sign(vRiverNormal.y), 1.0) * 0.55);
        vec2 groundUvZ = groundTileOffset(vRiverPosition.xy * vec2(1.0, sign(vRiverNormal.z)) * 0.55);
        vec3 groundColor = texture2D(uGroundMap, groundUvX).rgb * groundBlend.x +
                           texture2D(uGroundMap, groundUvY).rgb * groundBlend.y +
                           texture2D(uGroundMap, groundUvZ).rgb * groundBlend.z;
        float groundMask = uGroundBlend * smoothstep(0.45, 0.75, riverFbm(p * 0.5 + 3.7)) * (1.0 - siltPatch) * (1.0 - algae);
        diffuseColor.rgb = mix(diffuseColor.rgb, groundColor * vec3(0.66, 0.78, 0.70), groundMask);
      }`;

const SUBSTRATE_COLOR_TAIL_GLSL = `
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.18, 0.09), algae * 0.55);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.27, 0.18), siltPatch * 0.35);
      // domain-warped dual-octave bands read as focused sunlight on the bed.
      vec2 cw = p * 3.8 + vec2(uWorldTime * 0.18, -uWorldTime * 0.13);
      cw += 0.6 * vec2(riverFbm(cw * 0.9), riverFbm(cw * 0.9 + 17.3));
      float causticA = pow(max(0.0, sin(cw.x * 3.1 + sin(cw.y * 2.4)) * sin(cw.y * 3.4 - uWorldTime * 0.22)), 9.0);
      float causticB = pow(max(0.0, sin(cw.y * 4.7 - uWorldTime * 0.31) * sin(cw.x * 3.9 + uWorldTime * 0.17)), 11.0);
      float caustic = causticA + causticB * 0.6;
      float camDist = distance(cameraPosition, vRiverPosition);
      diffuseColor.rgb += vec3(0.05, 0.11, 0.10) * caustic * uRichness * exp(-camDist / 18.0);`;

const SUBSTRATE_ROUGHNESS_GLSL = `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * riverFbm(vRiverPosition.xz * 4.0 + 7.3)), 0.0, 1.0);`;

const SUBSTRATE_GROUND_ROUGHNESS_GLSL = `#include <roughnessmap_fragment>
      {
        vec3 groundBlendR = abs(vRiverNormal);
        groundBlendR /= max(groundBlendR.x + groundBlendR.y + groundBlendR.z, 1e-5);
        vec2 groundRoughUvX = groundTileOffset(vRiverPosition.yz * vec2(1.0, sign(vRiverNormal.x)) * 0.55);
        vec2 groundRoughUvY = groundTileOffset(vRiverPosition.zx * vec2(sign(vRiverNormal.y), 1.0) * 0.55);
        vec2 groundRoughUvZ = groundTileOffset(vRiverPosition.xy * vec2(1.0, sign(vRiverNormal.z)) * 0.55);
        vec3 groundRoughSample = vec3(
          texture2D(uGroundRoughnessMap, groundRoughUvX).r,
          texture2D(uGroundRoughnessMap, groundRoughUvY).r,
          texture2D(uGroundRoughnessMap, groundRoughUvZ).r
        );
        float groundRoughness = dot(groundRoughSample, groundBlendR);
        roughnessFactor = mix(roughnessFactor, groundRoughness, riverGroundMask() * 0.8);
        roughnessFactor = clamp(roughnessFactor * (0.86 + 0.28 * riverFbm(vRiverPosition.xz * 4.0 + 7.3)), 0.0, 1.0);
      }`;

const SUBSTRATE_NORMAL_CORE_GLSL = `
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
      normal = normalize(normal + riverGradView * -0.28);`;

const SUBSTRATE_GROUND_NORMAL_GLSL = `#include <normal_fragment_maps>` + SUBSTRATE_NORMAL_CORE_GLSL + `
      {
        vec3 groundBlendN = abs(vRiverNormal);
        groundBlendN /= max(groundBlendN.x + groundBlendN.y + groundBlendN.z, 1e-5);
        vec2 groundNormalUvX = groundTileOffset(vRiverPosition.yz * vec2(1.0, sign(vRiverNormal.x)) * 0.55);
        vec2 groundNormalUvY = groundTileOffset(vRiverPosition.zx * vec2(sign(vRiverNormal.y), 1.0) * 0.55);
        vec2 groundNormalUvZ = groundTileOffset(vRiverPosition.xy * vec2(1.0, sign(vRiverNormal.z)) * 0.55);
        vec3 gX = texture2D(uGroundNormalMap, groundNormalUvX).rgb * 2.0 - 1.0;
        vec3 gY = texture2D(uGroundNormalMap, groundNormalUvY).rgb * 2.0 - 1.0;
        vec3 gZ = texture2D(uGroundNormalMap, groundNormalUvZ).rgb * 2.0 - 1.0;
        gX.xy = groundTileUnrotateNormal(gX.xy, vRiverPosition.yz * vec2(1.0, sign(vRiverNormal.x)) * 0.55);
        gY.xy = groundTileUnrotateNormal(gY.xy, vRiverPosition.zx * vec2(sign(vRiverNormal.y), 1.0) * 0.55);
        gZ.xy = groundTileUnrotateNormal(gZ.xy, vRiverPosition.xy * vec2(1.0, sign(vRiverNormal.z)) * 0.55);
        // Rebuild each projection through its own tangent basis (the same
        // signed-axis convention the stone shader uses).
        vec3 gNX = vec3(gX.z * sign(vRiverNormal.x), gX.x, gX.y * sign(vRiverNormal.x));
        vec3 gNY = vec3(gY.y, gY.z * sign(vRiverNormal.y), gY.x * sign(vRiverNormal.y));
        vec3 gNZ = vec3(gZ.x, gZ.y * sign(vRiverNormal.z), gZ.z * sign(vRiverNormal.z));
        vec3 groundNormalSample = normalize(gNX * groundBlendN.x + gNY * groundBlendN.y + gNZ * groundBlendN.z);
        vec3 groundNormalView = (viewMatrix * vec4(groundNormalSample, 0.0)).xyz;
        normal = normalize(normal + (groundNormalView - normal) * riverGroundMask() * 0.5);
      }`;

export function substrateShader(uniforms: WorldUniforms, water: WaterOptics, ground?: RockTextures, options: GroundShaderOptions = {}) {
  return (shader: Shader) => {
    shader.uniforms.uWorldTime = uniforms.time;
    shader.uniforms.uRichness = uniforms.richness;
    shader.vertexShader = "varying vec3 vRiverPosition;\nvarying vec3 vRiverNormal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec4 riverPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        riverPosition = instanceMatrix * riverPosition;
        vec3 riverNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
      #else
        vec3 riverNormal = normalize(mat3(modelMatrix) * objectNormal);
      #endif
      vRiverPosition = (modelMatrix * riverPosition).xyz;
      vRiverNormal = riverNormal;`);
    if (ground) {
      shader.uniforms.uGroundMap = { value: ground.map };
      shader.uniforms.uGroundNormalMap = { value: ground.normalMap };
      shader.uniforms.uGroundRoughnessMap = { value: ground.roughnessMap };
      shader.uniforms.uGroundBlend = { value: options.blend ?? 0 };
    }
    shader.fragmentShader = "varying vec3 vRiverPosition;\nvarying vec3 vRiverNormal; uniform float uWorldTime; uniform float uRichness;\n" + NOISE_GLSL + "\n" + (ground ? GROUND_SAMPLER_GLSL + "\n" : "") + shader.fragmentShader;
    const colorPatch = SUBSTRATE_COLOR_HEAD_GLSL + (ground ? SUBSTRATE_GROUND_COLOR_GLSL : "") + SUBSTRATE_COLOR_TAIL_GLSL;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", colorPatch);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", ground ? SUBSTRATE_GROUND_ROUGHNESS_GLSL : SUBSTRATE_ROUGHNESS_GLSL);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", ground ? SUBSTRATE_GROUND_NORMAL_GLSL : "#include <normal_fragment_maps>" + SUBSTRATE_NORMAL_CORE_GLSL);
    applyUnderwaterFog(shader, water);
  };
}

export type RockTextures = { map: Texture; normalMap: Texture; roughnessMap: Texture };
export type RockShaderOptions = { scale?: number; dampness?: number };
export type RockProjectionAxis = "x" | "y" | "z";

// CPU reference for the shader's signed tangent-basis reconstruction. The
// texture normal is stored in a tile rotated by +quarterTurns; undo that UV
// rotation before mapping its tangent frame onto the signed world projection.
export function reorientRockNormal(
  sample: readonly [number, number, number],
  axis: RockProjectionAxis,
  faceSign: number,
  quarterTurns: number,
): [number, number, number] {
  const angle = quarterTurns * Math.PI / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  const tangentU = c * sample[0] + s * sample[1];
  const tangentV = -s * sample[0] + c * sample[1];
  if (axis === "x") return [sample[2] * faceSign, tangentU, tangentV * faceSign];
  if (axis === "y") return [tangentV, sample[2] * faceSign, tangentU * faceSign];
  return [tangentU, tangentV * faceSign, sample[2] * faceSign];
}

// Declares the scanned maps' color semantics: base color is sRGB imagery,
// while the normal and roughness encodings must stay raw data or their
// sampler values would be rescaled before lighting sees them.
export function declareRockTextureColorSpaces(textures: RockTextures) {
  textures.map.colorSpace = SRGBColorSpace;
  textures.normalMap.colorSpace = NoColorSpace;
  textures.roughnessMap.colorSpace = NoColorSpace;
}

// Stone-only triplanar material hook. The icosahedron geometry has no UVs,
// so the scanned maps ride in as custom sampler uniforms and are sampled
// against the WORLD position on the three dominant axis projections. All
// blending keys off the interpolated world normal; nothing else in the
// material pipeline (metalness, lighting, fog) is touched.
const ROCK_TRIPANAR_GLSL = `
  uniform sampler2D uRockColorMap;
  uniform sampler2D uRockNormalMap;
  uniform sampler2D uRockRoughnessMap;
  uniform float uRockScale;
  uniform float uDamp;
  // Deterministic per-tile 90-degree rotation so the stone never reads as one
  // repeating photograph across the river bed.
  float rockTileAngle(vec2 uv) {
    return floor(riverHash(floor(uv)) * 4.0) * 1.5707963;
  }
  vec2 rockTileRotate(vec2 local, float angle) {
    float c = cos(angle), s = sin(angle);
    return vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  }
  vec2 rockTileUnrotateNormal(vec2 tangent, vec2 uv) {
    float angle = rockTileAngle(uv);
    float c = cos(angle), s = sin(angle);
    return vec2(c * tangent.x + s * tangent.y, -s * tangent.x + c * tangent.y);
  }
  vec2 rockTileOffset(vec2 uv) {
    vec2 cell = floor(uv), local = fract(uv);
    float h = riverHash(cell);
    return cell + rockTileRotate(local - .5, rockTileAngle(uv)) + (vec2(h, riverHash(cell + 31.7)) - .5) * .12 + .5;
  }
`;

const ROCK_COLOR_GLSL = `
  #include <color_fragment>
  {
    vec3 rockBlend = abs(vRockNormal);
    rockBlend /= max(rockBlend.x + rockBlend.y + rockBlend.z, 1e-5);
    vec2 rockUvX = rockTileOffset(vRockWorld.yz * vec2(1.0, sign(vRockNormal.x)) * uRockScale);
    vec2 rockUvY = rockTileOffset(vRockWorld.zx * vec2(sign(vRockNormal.y), 1.0) * uRockScale);
    vec2 rockUvZ = rockTileOffset(vRockWorld.xy * vec2(1.0, sign(vRockNormal.z)) * uRockScale);
    vec3 rockColorSample = texture2D(uRockColorMap, rockUvX).rgb * rockBlend.x +
                           texture2D(uRockColorMap, rockUvY).rgb * rockBlend.y +
                           texture2D(uRockColorMap, rockUvZ).rgb * rockBlend.z;
    diffuseColor.rgb *= rockColorSample;
  }
`;

const ROCK_ROUGHNESS_GLSL = `
  #include <roughnessmap_fragment>
  {
    vec2 rockUvX = rockTileOffset(vRockWorld.yz * vec2(1.0, sign(vRockNormal.x)) * uRockScale);
    vec2 rockUvY = rockTileOffset(vRockWorld.zx * vec2(sign(vRockNormal.y), 1.0) * uRockScale);
    vec2 rockUvZ = rockTileOffset(vRockWorld.xy * vec2(1.0, sign(vRockNormal.z)) * uRockScale);
    vec3 rockRoughSample = vec3(
      texture2D(uRockRoughnessMap, rockUvX).r,
      texture2D(uRockRoughnessMap, rockUvY).r,
      texture2D(uRockRoughnessMap, rockUvZ).r
    );
    vec3 rockBlend = abs(vRockNormal);
    rockBlend /= max(rockBlend.x + rockBlend.y + rockBlend.z, 1e-5);
    float rockRough = dot(rockRoughSample, rockBlend);
    float rockSilt = 1.0 - smoothstep(-2.2, -1.2, vRockWorld.y);
    roughnessFactor = clamp(rockRough * (0.9 + 0.2 * riverFbm(vRockWorld.xz * 3.1)) - uDamp * rockSilt, 0.2, 1.0);
  }
`;

const ROCK_NORMAL_GLSL = `
  #include <normal_fragment_maps>
  {
    vec2 rockUvInputX = vRockWorld.yz * vec2(1.0, sign(vRockNormal.x)) * uRockScale;
    vec2 rockUvInputY = vRockWorld.zx * vec2(sign(vRockNormal.y), 1.0) * uRockScale;
    vec2 rockUvInputZ = vRockWorld.xy * vec2(1.0, sign(vRockNormal.z)) * uRockScale;
    vec2 rockUvX = rockTileOffset(rockUvInputX);
    vec2 rockUvY = rockTileOffset(rockUvInputY);
    vec2 rockUvZ = rockTileOffset(rockUvInputZ);
    vec3 sX = texture2D(uRockNormalMap, rockUvX).rgb * 2.0 - 1.0;
    vec3 sY = texture2D(uRockNormalMap, rockUvY).rgb * 2.0 - 1.0;
    vec3 sZ = texture2D(uRockNormalMap, rockUvZ).rgb * 2.0 - 1.0;
    sX.xy = rockTileUnrotateNormal(sX.xy, rockUvInputX);
    sY.xy = rockTileUnrotateNormal(sY.xy, rockUvInputY);
    sZ.xy = rockTileUnrotateNormal(sZ.xy, rockUvInputZ);
    float rockSignX = sign(vRockNormal.x);
    float rockSignY = sign(vRockNormal.y);
    float rockSignZ = sign(vRockNormal.z);
    // Rebuild each projection through its own tangent basis into world space.
    vec3 rockNX = vec3(sX.z * rockSignX, sX.x, sX.y * rockSignX);
    vec3 rockNY = vec3(sY.y, sY.z * rockSignY, sY.x * rockSignY);
    vec3 rockNZ = vec3(sZ.x, sZ.y * rockSignZ, sZ.z * rockSignZ);
    vec3 rockBlend = abs(vRockNormal);
    rockBlend /= max(rockBlend.x + rockBlend.y + rockBlend.z, 1e-5);
    vec3 rockNormalSample = normalize(rockNX * rockBlend.x + rockNY * rockBlend.y + rockNZ * rockBlend.z);
    vec3 rockNormalView = (viewMatrix * vec4(rockNormalSample, 0.0)).xyz;
    normal = normalize(normal + rockNormalView * 0.9 - normal * 0.45);
  }
`;

const ROCK_VERTEX_GLSL = `
  varying vec3 vRockWorld;
  varying vec3 vRockNormal;
`;

export function rockShader(textures: RockTextures, uniforms: WorldUniforms, options: RockShaderOptions, water: WaterOptics) {
  return (shader: Shader) => {
    shader.uniforms.uWorldTime = uniforms.time;
    shader.uniforms.uRockColorMap = { value: textures.map };
    shader.uniforms.uRockNormalMap = { value: textures.normalMap };
    shader.uniforms.uRockRoughnessMap = { value: textures.roughnessMap };
    shader.uniforms.uRockScale = { value: options.scale ?? .38 };
    shader.uniforms.uDamp = { value: options.dampness ?? .12 };

    shader.vertexShader = ROCK_VERTEX_GLSL + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec4 rockObject = instanceMatrix * vec4(position, 1.0);
      #else
        vec4 rockObject = vec4(position, 1.0);
      #endif
      vRockWorld = (modelMatrix * rockObject).xyz;
      #ifdef USE_INSTANCING
        mat3 rockNMat = mat3(instanceMatrix);
        vec3 rockNN = objectNormal / vec3(dot(rockNMat[0], rockNMat[0]), dot(rockNMat[1], rockNMat[1]), dot(rockNMat[2], rockNMat[2]));
        vRockNormal = normalize(mat3(modelMatrix) * (rockNMat * rockNN));
      #else
        vRockNormal = normalize(mat3(modelMatrix) * objectNormal);
      #endif`);
    shader.fragmentShader = NOISE_GLSL + "\n" + ROCK_TRIPANAR_GLSL + "\n" +
      "varying vec3 vRockWorld;\nvarying vec3 vRockNormal;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", ROCK_COLOR_GLSL);
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", ROCK_ROUGHNESS_GLSL);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", ROCK_NORMAL_GLSL);
    applyUnderwaterFog(shader, water);
  };
}

export type LogTextures = { map: Texture; normalMap: Texture; roughnessMap: Texture };
export type LogShaderOptions = { dampness?: number };

// Same color semantics as the stone set: photographed albedo is sRGB, the
// normal and roughness maps are raw data sampled by the lighting pipeline.
export function declareLogTextureColorSpaces(textures: LogTextures) {
  textures.map.colorSpace = SRGBColorSpace;
  textures.normalMap.colorSpace = NoColorSpace;
  textures.roughnessMap.colorSpace = NoColorSpace;
}

const LOG_VERTEX_GLSL = `
  varying vec3 vLogLocal;
  varying vec3 vLogNormal;
  varying vec3 vLogWorld;
  varying vec3 vLogWorldNormal;
`;

// Procedural fallback albedo. Bark is never one flat brown: weathered plates
// go ash-grey, the ridges stay warm, and the cracks darken. The scanned path
// instead modulates the photographed albedo with the same field strengths.
const LOG_PROCEDURAL_ALBEDO_GLSL = `
  vec3 barkBase = vec3(0.24, 0.17, 0.10);
  float barkTone = .70 + barkGrain * .52 + ridge * .22;
  diffuseColor.rgb = barkBase * barkTone;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.33, 0.30, 0.24), smoothstep(.60, .90, ridge) * .25);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.40, 0.29, 0.17), crevice * .35);
`;

const LOG_SCANNED_ALBEDO_GLSL = `
  diffuseColor.rgb *= .78 + barkGrain * .22 + ridge * .10;
  diffuseColor.rgb *= 1.0 - crevice * .26;
`;

const LOG_COLOR_GLSL = `#include <color_fragment>
  {
    // atan(local z, local x) follows the circumference, local y the trunk
    // length, so the grain always runs along the log rather than across it.
    float logAngle = atan(vLogLocal.z, vLogLocal.x);
    vec2 logGrainUv = vec2(logAngle * 1.35, vLogLocal.y * .85);
    float barkGrain = riverFbm(vec2(logGrainUv.x * 9.0, vLogLocal.y * 1.25));
    float crevice = smoothstep(.52, .86, riverFbm(vec2(logGrainUv.x * 13.0, vLogLocal.y * 2.4) + 4.7));
    float ridge = riverFbm(vec2(logGrainUv.x * 5.0, vLogLocal.y * .6 + 9.3));

    LOG_ALBEDO

    // Waterlogged wood loses saturation and brightness; uDamp keeps that
    // restrained so the scanned bark detail still reads.
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.62, .55, .44), uDamp * .55);

    // Biofilm prefers sheltered up-facing patches, not a uniform green coat.
    float biofilm = smoothstep(.25, .90, vLogWorldNormal.y) * smoothstep(.55, .85, riverFbm(vLogWorld.xy * 2.3 + 7.1));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.18, .23, .11), biofilm * .22);

    // Silt packs against the underside where it rests in the bed.
    float silt = smoothstep(.15, .85, -vLogWorldNormal.y) * smoothstep(.45, .80, riverFbm(vLogWorld.xz * 2.9 + 13.7));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.30, .27, .19), silt * .30);

    // Exposed ends show radial growth rings and faint medullary rays. Cap
    // normals are the only ones that point along the trunk axis.
    float capMask = smoothstep(.55, .90, abs(vLogNormal.y));
    float radial = length(vLogLocal.xz);
    float ring = .5 + .5 * sin(radial * 96.0 + riverFbm(vLogLocal.xz * 7.0) * 5.0);
    float rays = .5 + .5 * sin(atan(vLogLocal.z, vLogLocal.x) * 37.0 + riverNoise(vLogLocal.xz * 11.0) * 2.0);
    vec3 endGrain = mix(vec3(.42, .31, .19), vec3(.74, .62, .42), ring * .72 + rays * .16);
    endGrain *= .84 + .16 * smoothstep(0.0, .05, radial);
    endGrain *= .92 + .08 * riverNoise(vLogLocal.xz * 38.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, endGrain, capMask);
  }
`;

const LOG_ROUGHNESS_GLSL = `#include <roughnessmap_fragment>
  {
    float logWet = smoothstep(.20, .90, -vLogWorldNormal.y) * uDamp;
    float logRoughVar = riverFbm(vLogLocal.xz * 6.0 + vLogLocal.y) - .5;
    roughnessFactor = clamp(roughnessFactor + logRoughVar * .12 - logWet * .18, 0.6, 1.0);
  }
`;

const LOG_NORMAL_GLSL = `#include <normal_fragment_maps>
  {
    // The end faces should read as cut wood, not bark: flatten the sampled
    // normal there and keep the cap's own axis normal.
    float capMask = smoothstep(.55, .90, abs(vLogNormal.y));
    vec3 logCapView = normalize((viewMatrix * vec4(normalize(vLogWorldNormal), 0.0)).xyz);
    normal = normalize(mix(normal, logCapView, capMask * .85));
  }
`;

export function logShader(scanned: boolean, water: WaterOptics, options: LogShaderOptions = {}) {
  return (shader: Shader) => {
    shader.uniforms.uDamp = { value: options.dampness ?? .32 };
    shader.vertexShader = LOG_VERTEX_GLSL + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vLogLocal = position;
      vLogNormal = normalize(objectNormal);
      vec4 logWorld = modelMatrix * vec4(position, 1.0);
      vLogWorld = logWorld.xyz;
      vLogWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = NOISE_GLSL + "\n" + LOG_VERTEX_GLSL +
      "uniform float uDamp;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      LOG_COLOR_GLSL.replace("LOG_ALBEDO", scanned ? LOG_SCANNED_ALBEDO_GLSL : LOG_PROCEDURAL_ALBEDO_GLSL),
    );
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>", LOG_ROUGHNESS_GLSL);
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>", LOG_NORMAL_GLSL);
    applyUnderwaterFog(shader, water);
  };
}

export function plantShader(uniforms: WorldUniforms, water: WaterOptics) {
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
    applyUnderwaterFog(shader, water);
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
    // The underside ripples on a second, faster octave so the ceiling moves
    // even when the surface above only drifts slowly.
    if (!gl_FrontFacing) normal.xz += 0.03 * vec2(sin(p.x * 6.0 + uTime * 0.8), cos(p.y * 6.0 + uTime * 0.8));
    normal = normalize(normal);
    vec3 eye = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - abs(dot(eye, normal)), 3.0);
    float glint = 0.0;
    if (uRichness > 0.5) glint = pow(max(0.0, dot(reflect(-normalize(vec3(-0.4, 1.0, 0.25)), normal), eye)), 55.0);
    vec3 color = mix(vec3(0.04, 0.13, 0.10), vec3(0.18, 0.34, 0.27), fresnel);
    if (!gl_FrontFacing) color = mix(vec3(0.05, 0.14, 0.11), vec3(0.18, 0.34, 0.28), fresnel);
    color += glint * vec3(0.9, 0.95, 0.85);
    gl_FragColor = vec4(color, 0.56 + fresnel * 0.35);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
