// The canonical multi-species roster for the underwater experience.
// Everyone entering the aquarium (home preview, basin/species pages, /experience)
// sees the same species unless a caller explicitly narrows the list.

export interface SpeciesEntry {
  modelUrl: string;
  fishIds: string[];
  label: string;
}

export const DEFAULT_SPECIES: SpeciesEntry[] = [
  { modelUrl: "/models/polar-parrot-study-v1-animated.glb", fishIds: ["fish-0", "fish-1", "fish-2", "fish-3", "fish-4"], label: "Polar parrot - reference study" },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-high.glb", fishIds: ["fish-5"], label: "Zebra Danio" },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-glowfish-green-high.glb", fishIds: ["fish-6"], label: "GloFish Green" },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-golden-high.glb", fishIds: ["fish-7"], label: "Golden Zebra Danio" },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-wild-high.glb", fishIds: ["fish-8"], label: "Wild Zebra Danio" },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-albino-high.glb", fishIds: ["fish-9"], label: "Albino Zebra Danio" },
  { modelUrl: "/models/fish/arulius-barb/arulius-barb-high.glb", fishIds: ["fish-10", "fish-11", "fish-12"], label: "Arulius Barb" },
];

export function resolveSpecies(species?: { modelUrl: string; fishIds: string[]; label?: string }[], additionalModelUrls?: string[]): SpeciesEntry[] {
  if (species?.length) return species.map(s => ({ modelUrl: s.modelUrl, fishIds: [...s.fishIds], label: s.label ?? "Fish" }));
  const extras = (additionalModelUrls ?? [])
    .filter(url => !DEFAULT_SPECIES.some(entry => entry.modelUrl === url))
    .map(url => ({ modelUrl: url, fishIds: [] as string[], label: "Zebra Danio - Danio rerio" }));
  return extras.length ? [...DEFAULT_SPECIES, ...extras] : DEFAULT_SPECIES;
}
