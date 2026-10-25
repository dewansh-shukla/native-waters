import type { Material, Mesh, Object3D } from "three";

// How strongly each fish material answers the underwater environment map.
// The wet body gets a strong specular response; translucent fins get a weak
// one so they stay see-through rather than mirror-like.
const ENV_INTENSITY: Record<string, number> = {
  FishBody: 0.8,
  FishFin: 0.4,
  FishEye: 1,
  FishCornea: 1,
};

/**
 * Tune environment response on a loaded fish scene. GLTF materials arrive
 * with the default envMapIntensity of 1, which over-brightens translucent
 * fins and under-sells the wet body under the river IBL.
 */
export function prepareFishMaterials(root: Object3D): void {
  root.traverse(object => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const intensity = ENV_INTENSITY[material.name];
      if (intensity === undefined || !("envMapIntensity" in material)) continue;
      (material as { envMapIntensity: number }).envMapIntensity = intensity;
    }
  });
}
