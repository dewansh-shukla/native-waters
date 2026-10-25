import { describe, expect, it } from "vitest";
import { DEFAULT_SPECIES, resolveSpecies } from "./species";

describe("species roster", () => {
  it("covers all 13 fish slots exactly once", () => {
    const ids = DEFAULT_SPECIES.flatMap(s => s.fishIds);
    expect(ids).toHaveLength(13);
    expect(new Set(ids).size).toBe(13);
    ids.forEach((id, i) => expect(id).toBe(`fish-${i}`));
  });

  it("lists 7 species with unique model urls", () => {
    expect(DEFAULT_SPECIES).toHaveLength(7);
    const urls = DEFAULT_SPECIES.map(s => s.modelUrl);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach(url => expect(url.startsWith("/models/")).toBe(true));
  });

  it("resolves an absent species prop to the full default roster", () => {
    const resolved = resolveSpecies(undefined, undefined);
    expect(resolved).toEqual(DEFAULT_SPECIES);
  });

  it("keeps an explicitly provided species list", () => {
    const provided = [{ modelUrl: "/models/custom.glb", fishIds: ["fish-0"], label: "Custom" }];
    expect(resolveSpecies(provided, undefined)).toEqual(provided);
  });
});
