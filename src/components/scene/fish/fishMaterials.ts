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

type FishMaterialKind = "body" | "fin" | "eye" | null;

// Support both the stable names used by most fish assets and descriptive
// names from the polar-parrot study GLBs. Explicit ocular terms are excluded
// before the broader skin/fin matching to keep pupils and corneas clear.
function fishMaterialKind(name: string): FishMaterialKind {
  if (name in ENV_INTENSITY) {
    if (name === "FishBody") return "body";
    if (name === "FishFin") return "fin";
    return "eye";
  }

  const lowerName = name.toLowerCase();
  if (/eye|cornea|pupil|iris/.test(lowerName)) return null;
  if (/fin|membrane/.test(lowerName)) return "fin";
  if (/skin/.test(lowerName)) return "body";
  return null;
}

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
      const kind = fishMaterialKind(material.name);
      if (!kind) continue;
      const intensity = kind === "body" ? 0.8 : kind === "fin" ? 0.4 : 1;
      if ("envMapIntensity" in material) {
        (material as { envMapIntensity: number }).envMapIntensity = intensity;
      }
      if (water && (kind === "body" || kind === "fin")) {
        material.onBeforeCompile = shader => applyUnderwaterFog(shader, water);
        material.customProgramCacheKey = () => "fish-underwater-fog";
        material.needsUpdate = true;
      }
    }
  });
}
