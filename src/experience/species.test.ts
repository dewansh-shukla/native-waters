import { describe, expect, it } from "vitest";
import { DEFAULT_SPECIES, lodSpecies, resolveSpecies } from "./species";

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

  it("swaps only the owned native fish to the low tier", () => {
    const low = lodSpecies(DEFAULT_SPECIES, "LOW");
    expect(low).toHaveLength(DEFAULT_SPECIES.length);
    expect(low[0].modelUrl).toBe("/models/polar-parrot-study-v1-animated.glb");
    expect(low[1].modelUrl).toBe("/models/fish/zebra-danio/zebra-danio-low.glb");
    expect(low[6].modelUrl).toBe("/models/fish/arulius-barb/arulius-barb-low.glb");
    expect(lodSpecies(DEFAULT_SPECIES, "HIGH")).toBe(DEFAULT_SPECIES);
  });
});
