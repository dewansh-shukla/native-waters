import { BackSide, BufferAttribute, Color, Mesh, MeshBasicMaterial, PMREMGenerator, Scene, SphereGeometry, type WebGLRenderer } from "three";

export type EnvironmentPalette = { top: string; mid: string; bottom: string };

// Clear rivers: cool blue-green skylight. Turbid silty rivers override this
// with a warm khaki so ambient/image-based lighting stops tinting the bed,
// stone and plants aquarium-green.
export const CLEAR_WATER_ENV: EnvironmentPalette = { top: "#bfeaf0", mid: "#2e6a78", bottom: "#3a2f22" };
export const SILTY_WATER_ENV: EnvironmentPalette = { top: "#cbb98d", mid: "#57462b", bottom: "#2a2016" };

/**
 * Build a procedural underwater environment map.
 *
 * The dominant light underwater is downwelling sunlight from the surface, so the
 * env is brightest at the top and darkest (bed bounce) at the bottom. Baked once
 * with PMREM and reused for the scene's environment, giving the fish a wet
 * specular response without shipping an HDR.
 */
export function createUnderwaterEnvironment(renderer: WebGLRenderer, palette: EnvironmentPalette = CLEAR_WATER_ENV) {
  const scene = new Scene();
  const geometry = new SphereGeometry(10, 32, 16);
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const top = new Color(palette.top).multiplyScalar(1.0);
  const mid = new Color(palette.mid).multiplyScalar(0.5);
  const bottom = new Color(palette.bottom).multiplyScalar(0.25);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    const t = Math.max(0, Math.min(1, (y / 10 + 1) / 2));
    const color = new Color().copy(mid);
    if (t > 0.5) color.lerp(top, (t - 0.5) * 2);
    else color.lerp(bottom, (0.5 - t) * 2);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  const material = new MeshBasicMaterial({ side: BackSide, vertexColors: true });
  scene.add(new Mesh(geometry, material));

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  geometry.dispose();
  material.dispose();
  return target.texture;
}
