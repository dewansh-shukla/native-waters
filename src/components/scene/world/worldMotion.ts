import { Vector3, type Scene, type Fog, type Color } from "three";
import { HABITAT, OBSTACLES } from "@/experience/habitat";
import { currentAt } from "@/experience/current";

export type Placement = { position: [number, number, number]; scale: [number, number, number]; rotation: number };
export type Atmosphere = { fog: Fog; background: Color; previousFog: Scene["fog"]; previousBackground: Scene["background"]; active: boolean };

export function bedHeight(x: number, z: number) {
  return HABITAT.floorY + .055 * Math.sin(x * .8) * Math.cos(z * .7) + .025 * Math.sin(z * 2 + x);
}

export function createPlacements(): { rocks: Placement[]; gravel: Placement[]; plants: Placement[] } {
  let seed = 814;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const rocks: Placement[] = OBSTACLES.map(({ center, radius }) => ({ position: [...center], scale: [radius, radius, radius], rotation: 0 }));
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
    gravel.push({ position: [x, bedHeight(x, z), z], scale: [size * 1.3, size * .55, size], rotation: random() * 6.28 });
  }
  const plants: Placement[] = [];
  const patches = [[-5, 3], [5, 4], [-6, -5], [6.5, -4], [-8, 0], [8, 1], [1, -7], [-3, 6], [3, -6], [-10, -2], [10, 2], [0, 0]];
  for (const [px, pz] of patches) for (let i = 0; i < 38; i++) {
    const x = px + (random() - .5) * 2.5, z = pz + (random() - .5) * 2;
    plants.push({ position: [x, bedHeight(x, z), z], scale: [.6 + random() * .8, .3 + random() * .95, 1], rotation: random() * 6.28 });
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
