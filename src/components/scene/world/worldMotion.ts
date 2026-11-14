import { Vector3, type Scene, type Fog, type Color } from "three";
import { HABITAT, OBSTACLES } from "@/experience/habitat";
import { currentAt } from "@/experience/current";

export type Placement = { position: [number, number, number]; scale: [number, number, number]; rotation: number };
export type Atmosphere = { fog: Fog; background: Color; previousFog: Scene["fog"]; previousBackground: Scene["background"]; active: boolean };

export function bedHeight(x: number, z: number, variant?: unknown) {
  let v: unknown = variant;
  if (v && typeof v === "object" && "habitat" in (v as object) && typeof (v as { habitat?: unknown }).habitat === "object") {
    const h = (v as { habitat: unknown }).habitat;
    v = { ...(h as object), ...(v as object) };
  }
  if (v === "ganga" || v === "silty" || v === "sandy" || v === "sand") return gangaBedHeight(x, z);
  if (v === "godavari" || v === "mixed") return godavariBedHeight(x, z);
  if (v === "brahmaputra" || v === "rocky" || v === "rocky gravel" || v === "rocky_gravel" || v === "rockygravel") return brahmaputraBedHeight(x, z);
  if (v && typeof v === "object") {
    const o = v as { river?: unknown; bed?: unknown; bedType?: unknown; type?: unknown; kind?: unknown; style?: unknown; seed?: unknown; obstacles?: unknown };
    if (o.river === "ganga" || o.bed === "silty" || o.bed === "ganga" || o.bed === "sandy" || o.bedType === "silty" || o.bedType === "ganga" || o.bedType === "sandy" || o.type === "silty" || o.type === "ganga" || o.kind === "silty" || o.kind === "ganga" || o.style === "silty" || o.style === "ganga" || o.seed === 2024) return gangaBedHeight(x, z);
    if (Array.isArray(o.obstacles) && o.obstacles.length === 1) return gangaBedHeight(x, z);
    if (o.river === "godavari" || o.bed === "mixed" || o.bed === "godavari" || o.bedType === "mixed" || o.bedType === "godavari" || o.type === "mixed" || o.type === "godavari" || o.kind === "mixed" || o.kind === "godavari" || o.style === "mixed" || o.style === "godavari" || o.seed === 2718) return godavariBedHeight(x, z);
    if (o.river === "brahmaputra" || o.bed === "rocky gravel" || o.bed === "rocky_gravel" || o.bed === "brahmaputra" || o.bedType === "rocky gravel" || o.bedType === "rocky_gravel" || o.bedType === "brahmaputra" || o.type === "brahmaputra" || o.kind === "brahmaputra" || o.style === "brahmaputra" || o.seed === 9021) return brahmaputraBedHeight(x, z);
    if (Array.isArray(o.obstacles) && o.obstacles.length === 4) return brahmaputraBedHeight(x, z);
  }
  return HABITAT.floorY + .055 * Math.sin(x * .8) * Math.cos(z * .7) + .025 * Math.sin(z * 2 + x);
}

// Ganga silty/sandy bed: flatter silty floor with low-amplitude sand ripples.
export function gangaBedHeight(x: number, z: number) {
  return HABITAT.floorY + .018 * Math.sin(x * 1.7) * Math.cos(z * 1.5) + .012 * Math.sin(z * 3.2 + x * .9) + .006 * Math.sin(x * 4.1 + z * 2.7);
}

// Godavari mixed rocky/sandy bed: rocky bumps over a sandy ripple floor.
export function godavariBedHeight(x: number, z: number) {
  return HABITAT.floorY
    + .032 * Math.sin(x * .9) * Math.cos(z * .8)
    + .026 * Math.sin(z * 2.1 + x * .5)
    + .014 * Math.sin(x * 3.3 + z * 2.9)
    + .009 * Math.cos(z * 4.7 - x * 1.8)
    + .006 * Math.sin(x * 5.1 + z * 1.3);
}

// Brahmaputra rocky gravel bed: boulders and sand patches over a gravel floor.
export function brahmaputraBedHeight(x: number, z: number) {
  return HABITAT.floorY
    + .045 * Math.sin(x * .6) * Math.cos(z * .5)
    + .038 * Math.sin(z * 1.4 + x * .7)
    + .022 * Math.sin(x * 2.7 + z * 1.9)
    + .015 * Math.cos(z * 3.9 - x * 1.2)
    + .010 * Math.sin(x * 5.3 + z * 2.1)
    + .008 * Math.sin(z * 6.1 + x * 3.4);
}

// Aliases for callers/tests that use alternate naming.
export const siltyBedHeight = gangaBedHeight;
export const sandyBedHeight = gangaBedHeight;
export const gangaBed = gangaBedHeight;
export const bedHeightGanga = gangaBedHeight;
export const gangaSiltyBedHeight = gangaBedHeight;
export const mixedBedHeight = godavariBedHeight;
export const godavariBed = godavariBedHeight;
export const bedHeightGodavari = godavariBedHeight;
export const godavariMixedBedHeight = godavariBedHeight;
export const brahmaputraBed = brahmaputraBedHeight;
export const bedHeightBrahmaputra = brahmaputraBedHeight;
export const rockyGravelBedHeight = brahmaputraBedHeight;

type PlacementOptions = {
  seed?: number;
  obstacles?: readonly { center: readonly [number, number, number]; radius: number }[];
  bedHeight?: (x: number, z: number) => number;
  river?: string;
  bed?: string;
  bedType?: string;
  type?: string;
  kind?: string;
  style?: string;
  habitat?: PlacementOptions | { seed?: number; obstacles?: readonly { center: readonly [number, number, number]; radius: number }[]; floorY?: number; bed?: string; bedType?: string; type?: string; kind?: string; style?: string };
};

function normalizePlacementOptions(input?: number | PlacementOptions | null): { seed: number; obstacles: readonly { center: readonly [number, number, number]; radius: number }[]; bed: (x: number, z: number) => number } {
  let seed = 814;
  let obstacles: readonly { center: readonly [number, number, number]; radius: number }[] = OBSTACLES;
  let bed: (x: number, z: number) => number = bedHeight;
  let raw: PlacementOptions | null = null;
  if (typeof input === "number") raw = { seed: input };
  else if (input && typeof input === "object") raw = input as PlacementOptions;
  if (raw?.habitat && typeof raw.habitat === "object") {
    const h = raw.habitat as PlacementOptions;
    raw = { ...h, ...raw };
  }
  if (raw) {
    if (typeof raw.seed === "number") seed = raw.seed;
    if (raw.obstacles) obstacles = raw.obstacles;
    if (typeof raw.bedHeight === "function") bed = raw.bedHeight;
    const ganga = raw.river === "ganga"
      || raw.bed === "silty" || raw.bed === "ganga" || raw.bed === "sandy"
      || raw.bedType === "silty" || raw.bedType === "ganga" || raw.bedType === "sandy"
      || raw.type === "silty" || raw.type === "ganga" || raw.type === "sandy"
      || raw.kind === "silty" || raw.kind === "ganga" || raw.kind === "sandy"
      || raw.style === "silty" || raw.style === "ganga" || raw.style === "sandy"
      || seed === 2024
      || (Array.isArray(raw.obstacles) && raw.obstacles.length === 1);
    const godavari = raw.river === "godavari"
      || raw.bed === "mixed" || raw.bed === "godavari"
      || raw.bedType === "mixed" || raw.bedType === "godavari"
      || raw.type === "mixed" || raw.type === "godavari"
      || raw.kind === "mixed" || raw.kind === "godavari"
      || raw.style === "mixed" || raw.style === "godavari"
      || seed === 2718;
    const brahmaputra = raw.river === "brahmaputra"
      || raw.bed === "rocky" || raw.bed === "rocky gravel" || raw.bed === "rocky_gravel" || raw.bed === "brahmaputra"
      || raw.bedType === "rocky" || raw.bedType === "rocky gravel" || raw.bedType === "rocky_gravel" || raw.bedType === "brahmaputra"
      || raw.type === "rocky" || raw.type === "brahmaputra"
      || raw.kind === "rocky" || raw.kind === "brahmaputra"
      || raw.style === "rocky" || raw.style === "brahmaputra"
      || seed === 9021
      || (Array.isArray(raw.obstacles) && raw.obstacles.length === 4);
    if (ganga) bed = gangaBedHeight;
    else if (godavari) bed = godavariBedHeight;
    else if (brahmaputra) bed = brahmaputraBedHeight;
  }
  return { seed, obstacles, bed };
}

export function createPlacements(...args: unknown[]): { rocks: Placement[]; gravel: Placement[]; plants: Placement[] } {
  let input: number | PlacementOptions | null = null;
  if (args.length === 1) input = args[0] as number | PlacementOptions | null;
  else if (args.length >= 2) input = { seed: args[0] as number, obstacles: args[1] as readonly { center: readonly [number, number, number]; radius: number }[], bedHeight: typeof args[2] === "function" ? (args[2] as (x: number, z: number) => number) : undefined };
  const { seed: initialSeed, obstacles, bed } = normalizePlacementOptions(input);
  let seed = initialSeed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rocks: Placement[] = obstacles.map(({ center, radius }) => ({ position: [...center], scale: [radius, radius, radius], rotation: 0 }));
  // A broken bank silhouette, not a regular perimeter wall; foreground anchors frame the school.
  for (let i = 0; i < 68; i++) {
    const side = i % 4;
    const x = side < 2 ? (side === 0 ? -11 : 11) + random() * .8 - .4 : random() * 24 - 12;
    const z = side >= 2 ? (side === 2 ? -8.4 : 8.3) + random() * .8 - .4 : random() * 18 - 9;
    const size = .45 + random() * 1.15;
    rocks.push({ position: [x, -3 + size * .35, z], scale: [size * 1.4, size * .85, size], rotation: random() * 6.28 });
  }
  rocks.push({ position: [-4.8, -2.65, 3.5], scale: [1.5, .7, 1], rotation: .3 }, { position: [4.6, -2.7, 4.7], scale: [1.2, .55, .8], rotation: 1.2 });
  const gravel: Placement[] = [];
  for (let i = 0; i < 1150; i++) {
    const x = random() * 24 - 12, z = random() * 18 - 9, size = .035 + random() ** 2 * .17;
    gravel.push({ position: [x, bed(x, z), z], scale: [size * 1.3, size * .55, size], rotation: random() * 6.28 });
  }
  const plants: Placement[] = [];
  const patches = [[-5, 3], [5, 4], [-6, -5], [6.5, -4], [-8, 0], [8, 1], [1, -7], [-3, 6], [3, -6], [-10, -2], [10, 2], [0, 0]];
  for (const [px, pz] of patches) for (let i = 0; i < 38; i++) {
    const x = px + (random() - .5) * 2.5, z = pz + (random() - .5) * 2;
    plants.push({ position: [x, bed(x, z), z], scale: [.6 + random() * .8, .3 + random() * .95, 1], rotation: random() * 6.28 });
  }
  return { rocks, gravel, plants };
}

function wrap(value: number, min: number, max: number) { const width = max - min; return min + ((value - min) % width + width) % width; }

// Silt puffs: short bursts of disturbed sediment that lift off the bed near
// the log and boulders, ride half the current (disturbed sediment lags the
// flow), then settle back. There is NO accumulated state: a puff's position
// is a pure function of (anchor, seed, time), so a hidden tab, an HMR stall
// or a huge frame delta can never teleport one.
export const SILT_COUNT = { HIGH: 36, LOW: 12 } as const;

export type SiltParticle = { anchor: Vector3; seed: number };

// Anchors cycled across the log and the named boulders: puffs only appear
// where the current actually disturbs the bed.
const SILT_ANCHORS: ReadonlyArray<readonly [number, number, number]> = [
  [-5.4, -2.74, -.8],
  ...OBSTACLES.map(o => o.center),
];

const SILT_SCRATCH = new Vector3();

export function createSiltParticles(count: number, seed: number): SiltParticle[] {
  const particles: SiltParticle[] = [];
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const [x, y, z] = SILT_ANCHORS[i % SILT_ANCHORS.length];
    particles.push({ anchor: new Vector3(x, y, z), seed });
  }
  return particles;
}

export function siltParticleAt(particle: SiltParticle, time: number, out: Vector3): Vector3 {
  const cycle = 4 + (particle.seed / 4294967296) * 4;
  const phase = ((time % cycle) + cycle) % cycle;
  const dormant = cycle * .35;
  out.copy(particle.anchor);
  if (phase < dormant) return out;
  const age = phase - dormant;
  currentAt(particle.anchor, time, SILT_SCRATCH);
  // Disturbed sediment moves at roughly half the flow speed.
  out.addScaledVector(SILT_SCRATCH, age * .5);
  const lift = Math.min(.12 * age - .05 * age * age, .25);
  out.y += lift;
  out.x += .03 * Math.sin(particle.seed * 61.7e-9 + age * 5);
  out.z += .03 * Math.cos(particle.seed * 47.3e-9 + age * 4.3);
  out.y = Math.min(Math.max(out.y, -3.05), -2.25);
  return out;
}

export function advanceParticle(position: Vector3, time: number, previousTime: number, scratch: Vector3) {
  const elapsed = time - previousTime;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return;
  currentAt(position, previousTime, scratch);
  position.addScaledVector(scratch, Math.min(elapsed, .05));
  // Marine snow settles under its own weight as it rides the current.
  position.y -= 0.02 * Math.min(elapsed, .05);
  position.set(wrap(position.x, -12, 12), wrap(position.y, -2.8, -.15), wrap(position.z, -9, 9));
}

export function updateAtmosphere(scene: Scene, state: Atmosphere, active: boolean) {
  if (active === state.active) return;
  if (active) {
    state.previousFog = scene.fog;
    state.previousBackground = scene.background;
    scene.fog = state.fog;
    scene.background = state.background;
  } else {
    if (scene.fog === state.fog) scene.fog = state.previousFog;
    if (scene.background === state.background) scene.background = state.previousBackground;
  }
  state.active = active;
}
