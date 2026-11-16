import { SELECTABLE_RIVERS } from "./geography";

// An exhibit identity links to a record; it is never evidence of occurrence.
// Keep this allowlist explicit: a common label such as “Badis” is not a taxon match.
export function modelReference(modelUrl?: string) {
  if (modelUrl === "/models/fish/arulius-barb/arulius-barb-high.glb"
    || modelUrl === "/models/fish/arulius-barb/arulius-barb-low.glb") {
    return { href: "/species/dawkinsia-arulius", scientificName: "Dawkinsia arulius" };
  }
  return null;
}

export function basinReference(river: string) {
  const name = SELECTABLE_RIVERS.find(name => name.toLowerCase() === river.toLowerCase());
  return name ? { href: `/basins/${name.toLowerCase()}`, name } : null;
}
