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
  scientificName: "Danio rerio (Hamilton, 1822)",
  origin: "Native to the Indian subcontinent - the Ganges and Brahmaputra basins of India, Bangladesh and Nepal, plus parts of Pakistan and Myanmar. Introduced worldwide through the aquarium trade.",
  maxSize: "4-5 cm (1.5-2 in) in the wild; aquarium specimens often stay near the smaller end. One of the smallest cyprinids commonly kept, which is part of why it is so popular in nano and community tanks.",
  habitat: "Slow-moving and still waters: streams, ponds, rice paddies, floodplains and irrigation channels. Tolerates a wide range of conditions and is often found in large shoals near the surface.",
  waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH. Highly adaptable and a good beginner fish, though stable, clean water is still important for long-term health.",
  diet: "Omnivore in the wild: zooplankton, small insect larvae, algae and detritus. In captivity accepts flakes, micro-pellets, freeze-dried and live foods such as baby brine shrimp.",
  behavior: "Active schooling mid-to-top swimmer; keep in groups of six or more to reduce stress and bring out natural shoaling. Peaceful with other small, non-aggressive species.",
  notes: "IUCN Least Concern. A classic model organism in genetics and developmental biology thanks to its transparent embryos and rapid development. The wild type behind every GloFish colour morph.",
};

export const DEFAULT_SPECIES: SpeciesEntry[] = [
  { modelUrl: "/models/polar-parrot-study-v1-animated.glb", fishIds: ["fish-0", "fish-1", "fish-2", "fish-3", "fish-4"], label: "Polar parrot - reference study", study: {
    scientificName: "Polar Blue Parrot cichlid - a man-made hybrid (convict cichlid x blood parrot lineage), not a naturally occurring species",
    origin: "Captive-bred hybrid; the parent lineages trace to Central America (convict cichlid) and South America (blood parrot cichlid). Never found in the wild and not asserted to occur in the Cauvery.",
    maxSize: "15-20 cm (6-8 in) in captivity, occasionally larger with excellent care. Growth is steady and adults need a spacious tank.",
    habitat: "In aquaria: tanks with caves, driftwood, rocks and hardy plants that provide hiding spots and break lines of sight. Wild ancestors inhabit slow to moderate rivers and rocky shores.",
    waterParams: "24-28 C (75-82 F), pH 6.5-7.5, moderate hardness 6-12 dGH. Stable, well-filtered water is essential; sensitive to ammonia and nitrite spikes.",
    diet: "Omnivore: quality cichlid pellets, frozen bloodworms, brine shrimp and vegetable matter such as spirulina. Occasional live foods help condition adults.",
    behavior: "Territorial but personable; forms pair bonds and can be kept with similarly sized, robust tankmates. The deformed mouth limits biting, making it less destructive than many cichlids.",
    notes: "Included here as an illustrative reference model only. Not a verified native Indian species and not a surveyed habitat record; the underwater scene is an artistic preview.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-high.glb", fishIds: ["fish-5"], label: "Zebra Danio", study: ZEBRA_DANIO_STUDY },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-glowfish-green-high.glb", fishIds: ["fish-6"], label: "GloFish Green", study: {
    scientificName: "Danio rerio (genetically modified) - expresses green fluorescent protein (GFP)",
    origin: "Laboratory-derived from the zebra danio; fluorescent protein sourced from the jellyfish Aequorea victoria. Patented and trademarked by Yorktown Technologies.",
    maxSize: "4-5 cm (1.5-2 in), identical to the wild-type zebra danio. The genetic modification does not change adult size or body shape.",
    habitat: "Same as the zebra danio: slow streams, ponds, rice paddies and seasonally flooded plains. In aquaria, a well-planted tank with open swimming space.",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH. Husbandry is identical to the wild type; stable, clean water keeps the colour vivid.",
    diet: "Omnivore, identical to the zebra danio: flakes, micro-pellets, freeze-dried and live foods such as baby brine shrimp.",
    behavior: "Schooling mid-to-top swimmer; keep in groups of six or more. Fluoresces bright green under blue or UV light, especially in dim conditions.",
    notes: "The modification is heritable and stable; care, breeding and lifespan are the same as the wild type. Often the first GloFish colour kept by beginners.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-golden-high.glb", fishIds: ["fish-7"], label: "Golden Zebra Danio", study: {
    scientificName: "Danio rerio (golden colour morph; formerly described as Danio frankei)",
    origin: "Cultivated colour morph developed in the aquarium trade; not a separate wild species.",
    maxSize: "4-5 cm (1.5-2 in), the same range as the wild type. The morph does not differ in adult length or body depth.",
    habitat: "Same as the zebra danio: slow streams, ponds and rice paddies in nature; planted community tanks in captivity.",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH. Standard zebra danio care applies without modification.",
    diet: "Omnivore, identical to the zebra danio: flakes, micro-pellets and occasional live or frozen foods.",
    behavior: "Schooling mid-to-top swimmer; peaceful and active. Groups of six or more encourage natural shoaling and reduce skittishness.",
    notes: "Originally described as a separate species (Danio frankei), now confirmed to be a colour morph of Danio rerio. Golden body with silvery-white stripes and reduced contrast compared with the wild type.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-wild-high.glb", fishIds: ["fish-8"], label: "Wild Zebra Danio", study: {
    scientificName: "Danio rerio (wild type)",
    origin: "Native to the floodplains of India and Bangladesh, where it is one of the most common small cyprinids.",
    maxSize: "4-5 cm (1.5-2 in). Wild fish are typically at the smaller end of the range; well-fed aquarium fish may reach the upper limit.",
    habitat: "Slow streams, ponds, rice paddies and seasonally flooded plains. Often found in large shoals near the surface among vegetation.",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH. Tolerant but prefers clean, well-oxygenated water.",
    diet: "Omnivore: zooplankton, small insects, algae and detritus. In captivity accepts flakes, micro-pellets and live foods.",
    behavior: "Schooling, active top-to-mid swimmer; peaceful and fast. Groups of six or more bring out confident, natural behaviour.",
    notes: "The reference phenotype: blue horizontal stripes on a silver body. All cultured colour morphs and GloFish strains are derived from this wild type.",
  } },
  { modelUrl: "/models/fish/zebra-danio/zebra-danio-albino-high.glb", fishIds: ["fish-9"], label: "Albino Zebra Danio", study: {
    scientificName: "Danio rerio (albino colour morph)",
    origin: "Cultivated colour morph selected in the aquarium trade; not a wild population.",
    maxSize: "4-5 cm (1.5-2 in), the same range as the wild type. The albino condition does not affect adult length.",
    habitat: "Same as the zebra danio: slow streams, ponds and rice paddies in nature; planted community tanks in captivity.",
    waterParams: "18-25 C (64-77 F), pH 6.0-8.0, hardness 5-20 dGH. More light-sensitive than the wild type, so provide shaded areas.",
    diet: "Omnivore, identical to the zebra danio: flakes, micro-pellets and occasional live or frozen foods.",
    behavior: "Schooling mid-to-top swimmer; peaceful and active. Groups of six or more reduce stress and encourage natural shoaling.",
    notes: "Lacks melanin, giving a pale body with pink to red eyes. Husbandry is otherwise identical to the wild type; avoid very bright lighting.",
  } },
  { modelUrl: "/models/fish/arulius-barb/arulius-barb-high.glb", fishIds: ["fish-10", "fish-11", "fish-12"], label: "Arulius Barb", study: {
    scientificName: "Dawkinsia arulius (syn. Puntius arulius, Dawkinsia tambraparniei)",
    origin: "Endemic to the Western Ghats of southern India - the Tamiraparani and other river systems of Tamil Nadu and Kerala.",
    maxSize: "10-15 cm (4-6 in) in the aquarium, occasionally a little larger. One of the larger barbs commonly kept, needing a spacious tank.",
    habitat: "Large, fast-flowing, well-oxygenated streams, rivers and lakes. In aquaria, a long tank with strong filtration and open swimming space.",
    waterParams: "18-25 C (64-77 F), pH 6.0-6.5, hardness around 10 dGH; high dissolved oxygen is essential. Cooler and cleaner than most tropical community fish.",
    diet: "Omnivore: insects, plant matter, algae and small invertebrates. Accepts quality pellets, flakes and frozen foods in captivity.",
    behavior: "Schooling and active; keep in groups of five or more. Needs a tank of 4 ft (120 cm) or larger to accommodate its size and activity.",
    notes: "Endemic to southern India and threatened by habitat loss and collection pressure. Requires cooler, well-oxygenated water than most tropical community fish.",
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