import { afterEach, expect, it, vi } from "vitest";
import { MeshStandardMaterial, SRGBColorSpace, Texture, TextureLoader } from "three";
import { loadRelief } from "./relief";

afterEach(() => vi.restoreAllMocks());

function loader() {
  const texture = new Texture<HTMLImageElement>();
  let loaded: (texture: Texture<HTMLImageElement>) => void = () => {};
  let failed: () => void = () => {};
  vi.spyOn(TextureLoader.prototype, "load").mockImplementation((_url, onLoad, _progress, onError) => {
    loaded = onLoad ?? loaded;
    failed = () => onError?.(new Error("unavailable"));
    return texture;
  });
  return { texture, loaded: () => loaded(texture), failed: () => failed() };
}

it("uses the relief as color, then disposes it on cleanup", () => {
  const request = loader();
  const material = new MeshStandardMaterial();
  const invalidate = vi.fn();
  const dispose = vi.spyOn(request.texture, "dispose");
  const cancel = loadRelief(material, "/maps/india-shaded-relief.jpg", 4, invalidate);
  request.loaded();
  expect(material.map).toBe(request.texture);
  expect(request.texture.colorSpace).toBe(SRGBColorSpace);
  expect(request.texture.flipY).toBe(true);
  expect(material.displacementMap).toBeNull();
  expect(invalidate).toHaveBeenCalledOnce();
  cancel();
  expect(material.map).toBeNull();
  expect(dispose).toHaveBeenCalled();
});

it("falls back without throwing on failure and ignores completion after unmount", () => {
  const request = loader();
  const material = new MeshStandardMaterial();
  const invalidate = vi.fn();
  const cancel = loadRelief(material, "/maps/india-shaded-relief.jpg", 4, invalidate);
  expect(() => request.failed()).not.toThrow();
  expect(material.map).toBeNull();
  cancel();
  invalidate.mockClear();
  request.loaded();
  request.failed();
  expect(material.map).toBeNull();
  expect(invalidate).not.toHaveBeenCalled();
});
