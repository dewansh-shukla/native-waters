import { Vector3 } from "three";
import { HABITAT, OBSTACLES } from "./habitat";
import { CAUVERY_ANCHOR, GANGA_ANCHOR, KRISHNA_ANCHOR } from "./geography";
import { DEFAULT_SPECIES } from "./species";
import { WATER_SCATTER_CSS, WATER_FOG_NEAR, WATER_FOG_FAR, GANGA_WATER_SCATTER_CSS, GANGA_WATER_FOG_NEAR, GANGA_WATER_FOG_FAR, KRISHNA_WATER_SCATTER_CSS, KRISHNA_WATER_FOG_NEAR, KRISHNA_WATER_FOG_FAR, createWaterOptics } from "../components/scene/world/waterOptics";

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
      scatter: GANGA_WATER_SCATTER_CSS,
      fogNear: GANGA_WATER_FOG_NEAR,
      fogFar: GANGA_WATER_FOG_FAR,
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
      scatter: KRISHNA_WATER_SCATTER_CSS,
      fogNear: KRISHNA_WATER_FOG_NEAR,
      fogFar: KRISHNA_WATER_FOG_FAR,
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
};

export function resolveRiverProfile(id: string): RiverProfile {
  const profile = RIVER_PROFILES[id.toLowerCase()];
  if (!profile) throw new Error(`Unknown river profile: ${id}`);
  return profile;
}
