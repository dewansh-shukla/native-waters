// The canonical multi-species roster for the underwater experience.
// Everyone entering the aquarium (home preview, basin/species pages, /experience)
// sees the same species unless a caller explicitly narrows the list.

export interface SpeciesStudy {
  scientificName: string;
  origin: string;
  maxSize: string;
  habitat: string;
  waterParams: string;
  diet: string;
  behavior: string;
  notes: string;
}

export interface SpeciesEntry {
  modelUrl: string;
  fishIds: string[];
  label: string;
  study?: SpeciesStudy;
}

const ZEBRA_DANIO_STUDY: SpeciesStudy = {
  scientificName: "Danio rerio",
  origin: "India (Ganges and Brahmaputra basins), Bangladesh, Nepal and Pakistan",
  maxSize: "4-5 cm (1.5-2 in)",
  habitat: "Slow-moving streams, ponds, rice paddies and seasonally flooded plains",
  waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH; highly adaptable",
  diet: "Omnivore: zooplankton, insect larvae, algae and detritus; flakes and pellets in captivity",
  behavior: "Schooling mid/top swimmer; keep in groups of 6+; peaceful and active",
  notes: "IUCN Least Concern. A classic model organism in genetics and developmental biology; the wild type behind all GloFish colour morphs.",
};

export const DEFAULT_SPECIES: SpeciesEntry[] = [
  { modelUrl: "/models/polar-parrot-study-v1-animated.glb", fishIds: ["fish-0", "fish-1", "fish-2", "fish-3", "fish-4"], label: "Polar parrot - reference study", study: {
    scientificName: "Illustrative reference study (not a verified species)",
    origin: "Cauvery overview scene - illustrative only",
    maxSize: "n/a",
    habitat: "Generalized Cauvery basin overview; not a surveyed reach",
    waterParams: "n/a",
    diet: "n/a",
    behavior: "Schooling reference school used for the visual study",
    notes: "An original procedural model interpreting a supplied reference; not a biological identification and not asserted to occur in this location.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-high.glb", fishIds: ["fish-5"], label: "Zebra Danio", study: ZEBRA_DANIO_STUDY },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-glowfish-green-high.glb", fishIds: ["fish-6"], label: "GloFish Green", study: {
    scientificName: "Danio rerio (genetically modified)",
    origin: "Laboratory-derived from zebra danio",
    maxSize: "4-5 cm (1.5-2 in)",
    habitat: "Same as zebra danio: slow streams, ponds and paddies",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH",
    diet: "Omnivore, identical to zebra danio",
    behavior: "Schooling; fluorescent green under blue/UV light",
    notes: "Expresses green fluorescent protein (GFP) from Aequorea victoria jellyfish; patented/trademarked by Yorktown Technologies. Husbandry identical to the wild type.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-golden-high.glb", fishIds: ["fish-7"], label: "Golden Zebra Danio", study: {
    scientificName: "Danio rerio (golden colour morph; formerly Danio frankei)",
    origin: "Cultivated colour morph",
    maxSize: "4-5 cm (1.5-2 in)",
    habitat: "Same as zebra danio",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH",
    diet: "Omnivore, identical to zebra danio",
    behavior: "Schooling mid/top swimmer",
    notes: "Golden body with silvery-white stripes and reduced contrast; originally described as a separate species, now confirmed as a colour morph of Danio rerio.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-wild-high.glb", fishIds: ["fish-8"], label: "Wild Zebra Danio", study: {
    scientificName: "Danio rerio (wild type)",
    origin: "India and Bangladesh floodplains",
    maxSize: "4-5 cm (1.5-2 in)",
    habitat: "Slow streams, ponds and rice paddies",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH",
    diet: "Omnivore: zooplankton, insects, algae",
    behavior: "Schooling, active top/mid swimmer",
    notes: "Natural blue-striped silver phenotype; the reference form for all cultured colour morphs.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-albino-high.glb", fishIds: ["fish-9"], label: "Albino Zebra Danio", study: {
    scientificName: "Danio rerio (albino colour morph)",
    origin: "Cultivated colour morph",
    maxSize: "4-5 cm (1.5-2 in)",
    habitat: "Same as zebra danio",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH",
    diet: "Omnivore, identical to zebra danio",
    behavior: "Schooling; more light-sensitive than the wild type",
    notes: "Lacks melanin; pink to red eyes. Husbandry otherwise identical to the wild type.",
  } },
  { modelUrl: "/models/fish/arulius-barb/arulius-barb-high.glb", fishIds: ["fish-10", "fish-11", "fish-12"], label: "Arulius Barb", study: {
    scientificName: "Dawkinsia arulius (syn. Puntius arulius)",
    origin: "Western Ghats, southern India (endemic)",
    maxSize: "10-15 cm (4-6 in)",
    habitat: "Large, fast-flowing, well-oxygenated streams, rivers and lakes",
    waterParams: "18-25 C (64-77 F), pH 6.0-6.5, hardness ~10 dGH; high dissolved oxygen",
    diet: "Omnivore: insects, plant matter and algae",
    behavior: "Schooling; active; needs a 4 ft+ tank and groups of 5+",
    notes: "Endemic to southern India. Requires spacious, well-oxygenated water; cooler than most tropical community fish.",
  } },
];

export function resolveSpecies(species?: { modelUrl: string; fishIds: string[]; label?: string; study?: SpeciesStudy }[], additionalModelUrls?: string[]): SpeciesEntry[] {
  if (species?.length) return species.map(s => ({ modelUrl: s.modelUrl, fishIds: [...s.fishIds], label: s.label ?? "Fish", study: s.study }));
  const extras = (additionalModelUrls ?? [])
    .filter(url => !DEFAULT_SPECIES.some(entry => entry.modelUrl === url))
    .map(url => ({ modelUrl: url, fishIds: [] as string[], label: "Zebra Danio - Danio rerio", study: ZEBRA_DANIO_STUDY }));
  return extras.length ? [...DEFAULT_SPECIES, ...extras] : DEFAULT_SPECIES;
}

/**
 * Swap the native fish assets to the tier that matches the runtime quality.
 * Only the six owned fish paths carry LOD suffixes; fixtures and extras that do
 * not end in `-high.glb` are left exactly as the caller supplied them.
 */
export function lodSpecies(species: SpeciesEntry[], quality: "HIGH" | "LOW"): SpeciesEntry[] {
  if (quality === "HIGH") return species;
  return species.map(entry => ({
    ...entry,
    modelUrl: entry.modelUrl.replace(/-high\.glb$/, "-low.glb"),
  }));
}