import { Vector3 } from "three";
import { HABITAT, OBSTACLES } from "./habitat";
import { CAUVERY_ANCHOR, GANGA_ANCHOR, KRISHNA_ANCHOR, GODAVARI_ANCHOR, BRAHMAPUTRA_ANCHOR } from "./geography";
import { DEFAULT_SPECIES } from "./species";
import { WATER_SCATTER_CSS, WATER_FOG_NEAR, WATER_FOG_FAR, createWaterOptics } from "../components/scene/world/waterOptics";

export type WaterOpticsConfig = {
  scatter: string;
  fogNear: number;
  fogFar: number;
  absorption: number[];
};

export type HabitatConfig = {
  floorY: number;
  world: { x: readonly [number, number]; z: readonly [number, number] };
  obstacles: readonly { center: readonly [number, number, number]; radius: number }[];
  seed: number;
  bed?: string;
  bedType?: string;
  type?: string;
  kind?: string;
  style?: string;
};

export type RiverProfile = {
  id: string;
  name: string;
  water: WaterOpticsConfig;
  habitat: HabitatConfig;
  fish: (typeof DEFAULT_SPECIES)[number][];
  geoAnchor: Vector3;
  entryAnchor: Vector3;
};

// Re-export the factory that turns a WaterOpticsConfig into WaterOptics.
export { createWaterOptics };
export const createWaterOpticsFromConfig = createWaterOptics;

export const RIVER_PROFILES: Record<string, RiverProfile> = {
  cauvery: {
    id: "cauvery",
    name: "Cauvery",
    water: {
      scatter: WATER_SCATTER_CSS,
      fogNear: WATER_FOG_NEAR,
      fogFar: WATER_FOG_FAR,
      absorption: [0.085, 0.03, 0.06],
    },
    habitat: {
      floorY: HABITAT.floorY,
      world: HABITAT.world,
      obstacles: OBSTACLES,
      seed: 814,
    },
    fish: DEFAULT_SPECIES,
    geoAnchor: CAUVERY_ANCHOR,
    entryAnchor: CAUVERY_ANCHOR,
  },
  ganga: {
    id: "ganga",
    name: "Ganga",
    water: {
      scatter: "#3a2f1e",
      fogNear: 5,
      fogFar: 20,
      absorption: [0.12, 0.05, 0.09],
    },
    habitat: {
      floorY: HABITAT.floorY,
      world: HABITAT.world,
      obstacles: [
        { center: [0, -2.5, -3] as const, radius: 0.8 },
      ] as const,
      seed: 2024,
      bed: "silty",
      bedType: "silty",
      type: "silty",
      kind: "silty",
      style: "silty",
    },
    fish: [
      { modelUrl: "/models/fish/honey-gourami/honey-gourami-high.glb", fishIds: ["fish-0"], label: "Honey Gourami" },
      { modelUrl: "/models/fish/badis/badis-high.glb", fishIds: ["fish-1"], label: "Badis" },
      { modelUrl: "/models/fish/indian-glass-fish/indian-glass-fish-high.glb", fishIds: ["fish-2"], label: "Indian Glass Fish" },
    ],
    geoAnchor: GANGA_ANCHOR,
    entryAnchor: GANGA_ANCHOR,
  },
  krishna: {
    id: "krishna",
    name: "Krishna",
    water: {
      scatter: "#1e3a4a",
      fogNear: 8,
      fogFar: 32,
      absorption: [0.09, 0.04, 0.07],
    },
    habitat: {
      floorY: HABITAT.floorY,
      world: HABITAT.world,
      obstacles: [
        { center: [-2, -2.5, 2] as const, radius: 0.8 },
        { center: [4, -2.5, -3] as const, radius: 0.9 },
      ] as const,
      seed: 3141,
      bed: "rocky",
      bedType: "rocky",
      type: "rocky",
      kind: "rocky",
      style: "rocky",
    },
    fish: [
      { modelUrl: "/models/fish/giant-danio/giant-danio-high.glb", fishIds: ["fish-0", "fish-1"], label: "Giant Danio" },
      { modelUrl: "/models/fish/rhino-garra/rhino-garra-high.glb", fishIds: ["fish-2"], label: "Rhino Garra" },
      { modelUrl: "/models/fish/zebra-loach/zebra-loach-high.glb", fishIds: ["fish-3"], label: "Zebra Loach" },
    ],
    geoAnchor: KRISHNA_ANCHOR,
    entryAnchor: KRISHNA_ANCHOR,
  },
  godavari: {
    id: "godavari",
    name: "Godavari",
    water: {
      scatter: "#2a3a2a",
      fogNear: 6,
      fogFar: 26,
      absorption: [0.09, 0.035, 0.07],
    },
    habitat: {
      floorY: HABITAT.floorY,
      world: HABITAT.world,
      obstacles: [
        { center: [-3, -2.5, -2] as const, radius: 0.9 },
        { center: [2, -2.5, 3] as const, radius: 1.0 },
        { center: [5, -2.5, -4] as const, radius: 0.8 },
      ] as const,
      seed: 2718,
      bed: "mixed",
      bedType: "mixed",
      type: "mixed",
      kind: "mixed",
      style: "mixed",
    },
    fish: [
      { modelUrl: "/models/fish/spiny-loach/spiny-loach-high.glb", fishIds: ["fish-0"], label: "Spiny Loach" },
      { modelUrl: "/models/fish/moreh-loach/moreh-loach-high.glb", fishIds: ["fish-1"], label: "Moreh Loach" },
      { modelUrl: "/models/fish/garra-mullya/garra-mullya-high.glb", fishIds: ["fish-2"], label: "Garra Mullya" },
      { modelUrl: "/models/fish/bengal-danio/bengal-danio-high.glb", fishIds: ["fish-3"], label: "Bengal Danio" },
      { modelUrl: "/models/fish/flying-barb/flying-barb-high.glb", fishIds: ["fish-4"], label: "Flying Barb" },
      { modelUrl: "/models/fish/ticto-barb/ticto-barb-high.glb", fishIds: ["fish-5"], label: "Ticto Barb" },
      { modelUrl: "/models/fish/blackline-rasbora/blackline-rasbora-high.glb", fishIds: ["fish-6"], label: "Blackline Rasbora" },
      { modelUrl: "/models/fish/evezards-loach/evezards-loach-high.glb", fishIds: ["fish-7"], label: "Evezards Loach" },
      { modelUrl: "/models/fish/pool-barb/pool-barb-high.glb", fishIds: ["fish-8"], label: "Pool Barb" },
    ],
    geoAnchor: GODAVARI_ANCHOR,
    entryAnchor: GODAVARI_ANCHOR,
  },
  brahmaputra: {
    id: "brahmaputra",
    name: "Brahmaputra",
    water: {
      scatter: "#1a3a2a",
      fogNear: 10,
      fogFar: 35,
      absorption: [0.06, 0.02, 0.04],
    },
    habitat: {
      floorY: HABITAT.floorY,
      world: HABITAT.world,
      obstacles: [
        { center: [-3, -2.5, -2] as const, radius: 1.0 },
        { center: [2, -2.5, 1] as const, radius: 0.9 },
        { center: [5, -2.5, -4] as const, radius: 1.1 },
        { center: [-6, -2.5, 4] as const, radius: 0.8 },
      ] as const,
      seed: 9021,
      bed: "rocky",
      bedType: "rocky",
      type: "rocky",
      kind: "rocky",
      style: "rocky",
    },
    fish: [
      { modelUrl: "/models/fish/scarlet-badis/scarlet-badis-high.glb", fishIds: ["fish-0"], label: "Scarlet Badis" },
      { modelUrl: "/models/fish/neon-hatchet/neon-hatchet-high.glb", fishIds: ["fish-1"], label: "Neon Hatchet" },
      { modelUrl: "/models/fish/moustached-danio/moustached-danio-high.glb", fishIds: ["fish-2"], label: "Moustached Danio" },
      { modelUrl: "/models/fish/badis-assamensis/badis-assamensis-high.glb", fishIds: ["fish-3"], label: "Badis Assamensis" },
      { modelUrl: "/models/fish/indian-hatchet/indian-hatchet-high.glb", fishIds: ["fish-4"], label: "Indian Hatchet" },
      { modelUrl: "/models/fish/bengal-loach/bengal-loach-high.glb", fishIds: ["fish-5"], label: "Bengal Loach" },
      { modelUrl: "/models/fish/dwarf-barb/dwarf-barb-high.glb", fishIds: ["fish-6"], label: "Dwarf Barb" },
      { modelUrl: "/models/fish/glass-barb/glass-barb-high.glb", fishIds: ["fish-7"], label: "Glass Barb" },
      { modelUrl: "/models/fish/pipefish/pipefish-high.glb", fishIds: ["fish-8"], label: "Pipefish" },
    ],
    geoAnchor: BRAHMAPUTRA_ANCHOR,
    entryAnchor: BRAHMAPUTRA_ANCHOR,
  },
};

export function resolveRiverProfile(id: string): RiverProfile {
  const profile = RIVER_PROFILES[id.toLowerCase()];
  if (!profile) throw new Error(`Unknown river profile: ${id}`);
  return profile;
}
