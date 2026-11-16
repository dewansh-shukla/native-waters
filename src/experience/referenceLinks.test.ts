import { describe, expect, it } from "vitest";
import catalog from "../../content/catalog/freshwater.json";
import { basinReference, modelReference } from "./referenceLinks";

describe("scene to sourced references", () => {
  it("links both owned Arulius LODs to the exact catalog taxon", () => {
    for (const tier of ["high", "low"]) {
      const reference = modelReference(`/models/fish/arulius-barb/arulius-barb-${tier}.glb`);
      expect(reference).toEqual({ href: "/species/dawkinsia-arulius", scientificName: "Dawkinsia arulius" });
      expect(catalog.species.find(species => `/species/${species.id}` === reference?.href)?.scientificName).toBe("Dawkinsia arulius");
    }
  });
  it("does not infer scientific identity from similar names or external assets", () => {
    for (const url of [undefined, "/models/fish/badis/badis-high.glb", "/models/fish/arulius-barb/unknown.glb", "https://example.org/models/fish/arulius-barb/arulius-barb-high.glb"]) {
      expect(modelReference(url)).toBeNull();
    }
  });
  it("links only supported basins and never fabricates a route", () => {
    expect(basinReference("Cauvery")).toEqual({ href: "/basins/cauvery", name: "Cauvery" });
    expect(basinReference("BRAHMAPUTRA")).toEqual({ href: "/basins/brahmaputra", name: "Brahmaputra" });
    expect(basinReference("Unknown")).toBeNull();
  });
});
