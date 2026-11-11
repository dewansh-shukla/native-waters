import type { Material, Mesh, Object3D } from "three";
import { applyUnderwaterFog, type WaterOptics } from "../world/waterOptics";

// How strongly each fish material answers the underwater environment map.
// The wet body gets a strong specular response; translucent fins get a weak
// one so they stay see-through rather than mirror-like.
const ENV_INTENSITY: Record<string, number> = {
  FishBody: 0.8,
  FishFin: 0.4,
  FishEye: 1,
  FishCornea: 1,
};

// Eyes and corneas stay on the clear-water pipeline: absorption on glassy
// materials reads as haze inside the lens instead of distance in the water.
const ABSORPTION_MATERIALS = new Set(["FishBody", "FishFin"]);

/**
 * Tune environment response on a loaded fish scene. GLTF materials arrive
 * with the default envMapIntensity of 1, which over-brightens translucent
 * fins and under-sells the wet body under the river IBL.
 *
 * When water optics are provided, body and fin also receive the same
 * per-channel Beer-Lambert absorption as the world, so fish fade into the
 * river at the same rate as their surroundings.
 */
export function prepareFishMaterials(root: Object3D, water?: WaterOptics): void {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const intensity = ENV_INTENSITY[material.name];
      if (intensity === undefined) continue;
      if ("envMapIntensity" in material) {
        (material as { envMapIntensity: number }).envMapIntensity = intensity;
      }
      if (water && ABSORPTION_MATERIALS.has(material.name)) {
        material.onBeforeCompile = shader => applyUnderwaterFog(shader, water);
        material.customProgramCacheKey = () => "fish-underwater-fog";
        material.needsUpdate = true;
      }
    }
  });
}
