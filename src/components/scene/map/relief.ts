import { SRGBColorSpace, TextureLoader, type MeshStandardMaterial } from "three";

/** TextureLoader cannot cancel image IO; cleanup guards callbacks and releases the texture. */
export function loadRelief(material: MeshStandardMaterial, url: string, anisotropy: number, invalidate: () => void): () => void {
  let cancelled = false;
  const texture = new TextureLoader().load(url, (loaded) => {
    if (cancelled) { loaded.dispose(); return; }
    loaded.colorSpace = SRGBColorSpace;
    loaded.anisotropy = anisotropy;
    // Default flipY pairs geographic north with V=1. Relief is color only.
    material.map = loaded;
    material.needsUpdate = true;
    invalidate();
  }, undefined, () => {
    if (cancelled) return;
    material.map = null;
    material.needsUpdate = true;
    invalidate();
  });
  return () => {
    cancelled = true;
    material.map = null;
    material.needsUpdate = true;
    texture.dispose();
  };
}
