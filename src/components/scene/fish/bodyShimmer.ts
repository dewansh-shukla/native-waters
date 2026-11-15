// Animated silver-body shading, injected into the FishBody standard material.
//
// Three layered effects, all driven by one clock uniform:
// * iridescence — a silver flank is a stack of guanine crystals, so its hue
//   leans green-gold face-on and blue-violet at grazing angles. Computed from
//   the view/normal facing with the classic cosine palette.
// * scale shimmer — tiny glints anchored to object-space scale cells, so they
//   stick to individual scales as the fish swims through them.
// * caustic dappling — soft moving light bands anchored to world space, so
//   the body sits inside the river's light field rather than carrying its own.
//
// The layer is deliberately restrained: each term peaks below ~15% so the
// baked albedo, ORM lighting and the underwater fog remain the dominant read.
// HIGH detail tier only — see prepareFishMaterials.

import type { Material, Mesh, Object3D } from "three";

type Shader = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, unknown>;
};

export interface ShimmerClock {
  value: number;
}

// Materials are shared across every SkeletonUtils clone of one GLB, so the
// clock is registered per material, not per scene.
const clockByMaterial = new WeakMap<Material, ShimmerClock>();

const FRAGMENT_PRELUDE = `
uniform float uShimmerTime;
varying vec3 vShimmerLocal;
varying vec3 vShimmerWorld;

vec3 shimmerIridescence(float facing) {
  // Cosine palette: hue travels through green -> gold -> blue as the flank
  // turns away from the camera.
  return 0.5 + 0.5 * cos(6.28318 * (facing * 1.35 + vec3(0.0, 0.31, 0.62)));
}

float shimmerGlint(vec3 local, float time) {
  vec3 cell = floor(local * 72.0);
  float seed = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  // A sparse minority of scales glint, each on its own phase.
  float gate = step(0.965, seed);
  float phase = time * 2.4 + seed * 40.0;
  return gate * pow(0.5 + 0.5 * sin(phase), 6.0);
}

float shimmerCaustic(vec3 world, float time) {
  float bands = sin(world.x * 4.2 + world.z * 3.1 - time * 1.15)
              * sin(world.z * 5.3 - world.y * 2.2 + time * 0.75);
  return pow(max(bands, 0.0), 3.0);
}
`;

const FRAGMENT_INJECT = `
{
  vec3 viewDir = normalize(vViewPosition);
  vec3 surfaceNormal = normalize(vNormal);
  float facing = abs(dot(viewDir, surfaceNormal));
  vec3 irid = shimmerIridescence(1.0 - facing);
  diffuseColor.rgb *= (0.94 + 0.12 * irid);
  diffuseColor.rgb += irid * 0.05;
  float glint = shimmerGlint(vShimmerLocal, uShimmerTime);
  diffuseColor.rgb += vec3(0.55, 0.60, 0.58) * glint * 0.14;
  float caustic = shimmerCaustic(vShimmerWorld, uShimmerTime);
  diffuseColor.rgb += vec3(0.38, 0.52, 0.47) * caustic * 0.12;
}
`;

/**
 * Rewrite a standard material program with the animated body surface. Call
 * from `onBeforeCompile`; `clock` must be the one registered for this
 * material by `registerShimmerClock`, so the renderer and the per-frame
 * update share the same uniform object.
 */
export function applyBodyShimmer(material: Material, shader: Shader, clock: ShimmerClock): void {
  shader.uniforms.uShimmerTime = clock;
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vShimmerLocal;\nvarying vec3 vShimmerWorld;")
    .replace(
      "#include <project_vertex>",
      // `transformed` is fully deformed (morph + skinning) by this point, so
      // object-space cells follow the swim deformation.
      "#include <project_vertex>\nvShimmerLocal = transformed;\nvShimmerWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>" + FRAGMENT_PRELUDE)
    .replace("#include <color_fragment>", "#include <color_fragment>" + FRAGMENT_INJECT);
}

/** The clock registered for a material by `applyBodyShimmer`, if any. */
export function shimmerClock(material: Material): ShimmerClock | null {
  return clockByMaterial.get(material) ?? null;
}

/**
 * Register the shared clock for a material ahead of its first compile, so a
 * per-frame update lands even before the renderer has built the program.
 */
export function registerShimmerClock(material: Material): ShimmerClock {
  let clock = clockByMaterial.get(material);
  if (!clock) {
    clock = { value: 0 };
    clockByMaterial.set(material, clock);
  }
  return clock;
}

/** Advance every shimmer clock reachable from this scene root. */
export function updateFishShimmer(root: Object3D, time: number): void {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const clock = clockByMaterial.get(material);
      if (clock) clock.value = time;
    }
  });
}
