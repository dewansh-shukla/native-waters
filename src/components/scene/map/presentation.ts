import type { Group, Material } from "three";

export function updateMapPresentation(group: Group, layers: readonly { material: Material; opacity: number }[], visible: boolean, progress: number) {
  const fade = 1 - Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  group.visible = visible && fade > 0.001;
  layers.forEach(({ material, opacity }) => { material.opacity = opacity * fade; });
}
