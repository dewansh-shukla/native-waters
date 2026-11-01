// Procedural fin layer, applied after the mixer writes the baked pose.
//
// The baked `Swim` clip carries the body wave and the authored caudal torsion.
// This layer adds what a single clip cannot: amplitude that follows speed, an
// independent gill oscillator, pectoral tuck, and a turn response. Two offset
// semantics are deliberate and must not be swapped:
//
// * fins are layered onto the baked pose (baked, plus deviation), so the clip
//   keeps its phase and the layer only adds a delta;
// * gills are rebuilt from their own oscillator, because their rate is
//   decoupled from the tail beat rather than layered on it.
//
// Body-wave bones are re-scaled about their joint rest pose: an animated
// quaternion is rest * pose, so scaling the raw quaternion would also scale
// the joint's rest orientation.
//
// Three writes a bound property only when its value changes, so a clip that is
// held still (a loitering fish runs at timeScale 0) leaves the bone holding
// whatever this layer last wrote. Every offset is therefore composed onto a
// remembered baked pose, never onto the live bone; otherwise a held stroke
// would stack the same offset sixty times a second.

import { Euler, Object3D, Quaternion, Vector3 } from "three";

const TAU = Math.PI * 2;
const LOCAL_X = new Vector3(1, 0, 0);

const WAVE_BONES = ["Spine.01", "Spine.02", "Spine.03", "Tail.01", "Tail.02", "TailFin"];
const BEND_BONES = ["Spine.01", "Spine.02", "Spine.03"];

const scratchEuler = new Euler();
const scratchQuaternion = new Quaternion();
const poseQuaternion = new Quaternion();
const scaledQuaternion = new Quaternion();
const resultQuaternion = new Quaternion();
const axis = new Vector3();

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Body-wave amplitude gain: 0.75 at 0.5 BL/s, 1.20 at 2.5 BL/s. */
export function waveGain(blps: number): number {
  return clamp(0.75 + 0.45 * ((blps - 0.5) / 2.0), 0.75, 1.2);
}

/** How far the pectorals are folded against the flank: 0 at 0.9 BL/s, 1 at 1.8. */
export function pectoralTuck(blps: number): number {
  return clamp((blps - 0.9) / 0.9, 0, 1);
}

/** Pectoral row rate; the fins stop rowing once they tuck. */
export function pectoralRowHz(blps: number): number {
  return 1.25 - 0.35 * pectoralTuck(blps);
}

/** Gill ventilation rate, independent of the tail beat. */
export function gillHz(blps: number): number {
  return 1.1 + 0.5 * clamp((blps - 0.5) / 2.0, 0, 1);
}

/** Asymmetric fin flare in a turn; positive rates turn left. */
export function turnFlare(turnRate: number): number {
  return clamp(turnRate * 0.5, -0.35, 0.35);
}

/** Additive C-bend for the spine, capped so it never fights the body wave. */
export function bodyBend(turnRate: number): number {
  return clamp(turnRate * 0.18, -0.16, 0.16);
}

export interface FinState {
  /** Position in the swim cycle, 0..1, taken from the clip's own time. */
  cycle: number;
  /** Speed in body lengths per second. */
  blps: number;
  /** Turn rate in radians per second, positive to the left. */
  turnRate: number;
  /** Gill oscillator phase, 0..1, accumulated by the caller. */
  gillPhase: number;
  /** Pectoral row phase, 0..1. Falls back to `cycle` when omitted. */
  pectoralPhase?: number;
  /**
   * Joint rest rotations, captured before the mixer first runs. Without them
   * the layer still produces a valid pose but cannot rescale the baked wave or
   * rebuild the gill rotation, so it layers those offsets instead.
   */
  rest?: ReadonlyMap<string, Quaternion>;
}

interface BoneSlot {
  /** The pose the mixer produced, i.e. what this layer must add to. */
  baked: Quaternion;
  /** The pose this layer last wrote, used to notice a mixer rewrite. */
  written: Quaternion;
}

const slotsByRoot = new WeakMap<Object3D, Map<string, BoneSlot>>();

function slotFor(root: Object3D, bone: Object3D): BoneSlot {
  let slots = slotsByRoot.get(root);
  if (!slots) {
    slots = new Map<string, BoneSlot>();
    slotsByRoot.set(root, slots);
  }
  let slot = slots.get(bone.name);
  if (!slot) {
    slot = { baked: new Quaternion(), written: new Quaternion() };
    slots.set(bone.name, slot);
  }
  // A bone that still holds our own last write was not touched by the mixer,
  // so its baked pose is unchanged and must not be re-read from the bone.
  if (!slot.written.equals(bone.quaternion)) {
    slot.baked.copy(bone.quaternion);
  }
  return slot;
}

function angleOf(rotation: Quaternion): number {
  const w = Math.min(1, Math.abs(rotation.w));
  return 2 * Math.acos(w);
}

function scaleAboutRest(
  baked: Quaternion,
  rest: Quaternion,
  factor: number,
  out: Quaternion,
): Quaternion {
  // `out` must never be `baked` or `rest`, or the read and the write alias.
  poseQuaternion.copy(rest).invert().multiply(baked);
  const angle = angleOf(poseQuaternion);
  if (angle < 1e-9) {
    return out.identity();
  }
  const { w } = poseQuaternion;
  let { x, y, z } = poseQuaternion;
  if (w < 0) {
    x = -x;
    y = -y;
    z = -z;
  }
  const sine = Math.sqrt(Math.max(0, 1 - w * w));
  axis.set(x / sine, y / sine, z / sine);
  return out.setFromAxisAngle(axis, angle * factor);
}

/**
 * Write one bone as `base * offset`, where the base is the mixer's baked pose,
 * optionally rescaled about the joint rest, and `offset` is a small local
 * Euler deviation. Missing bones are simply skipped.
 */
function placeBone(
  root: Object3D,
  bone: Object3D,
  rest: Quaternion | undefined,
  factor: number,
  x: number,
  y: number,
  z: number,
): void {
  // Resolve the slot before writing: it reads the bone to detect a rewrite, so
  // it has to see the pose this layer did not write.
  const slot = slotFor(root, bone);
  if (rest) {
    scaleAboutRest(slot.baked, rest, factor, scaledQuaternion);
    resultQuaternion.copy(rest).multiply(scaledQuaternion);
  } else {
    resultQuaternion.copy(slot.baked);
  }
  if (x !== 0 || y !== 0 || z !== 0) {
    scratchEuler.set(x, y, z, "XYZ");
    resultQuaternion.multiply(scratchQuaternion.setFromEuler(scratchEuler));
  }
  bone.quaternion.copy(resultQuaternion);
  slot.written.copy(resultQuaternion);
}

/**
 * Drive the detail bones from the current cycle, speed and turn rate.
 * Call after `mixer.update()`; every missing bone is skipped so an older GLB
 * without detail bones still poses correctly.
 */
export function driveFins(root: Object3D, state: FinState): void {
  const phase = state.cycle * TAU;
  const scull = (state.pectoralPhase ?? state.cycle) * TAU;
  const gain = waveGain(state.blps);
  const tuck = pectoralTuck(state.blps);
  const flare = turnFlare(state.turnRate);
  const bend = bodyBend(state.turnRate);

  // 1. Body wave. The clip already authors the caudal roll and torsion at the
  // right phase, so the layer only rescales that rotation here; adding the same
  // term again doubled it into a ribbon (see the Task 7 render review).
  for (const name of WAVE_BONES) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, state.rest?.get(name), gain, 0, 0, 0);
    }
  }

  // 2. Gills: their own oscillator replaces the bake, not adds to it. They are
  // never read back, so they are not tracked.
  const opening = 0.5 - 0.5 * Math.cos(state.gillPhase * TAU);
  for (const [name, side] of [["Gill.L", -1], ["Gill.R", 1]] as const) {
    const bone = root.getObjectByName(name);
    if (!bone) {
      continue;
    }
    const rest = state.rest?.get(name);
    if (rest) {
      scratchQuaternion.setFromAxisAngle(LOCAL_X, side * 0.06 * opening);
      bone.quaternion.copy(rest).multiply(scratchQuaternion);
    } else {
      placeBone(root, bone, undefined, 1, side * 0.06 * opening, 0, 0);
    }
  }

  // 3. Fins: small local deviations layered onto the baked pose. The caudal
  // lobes only get a cup and the turn flare; their per-beat torsion is baked.
  const cup = 0.05 * Math.sin(phase + Math.PI);
  for (const [name, side] of [["TailFin.U", 1], ["TailFin.L", -1]] as const) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, state.rest?.get(name), gain,
        0, 0, side * (cup + 0.3 * flare));
    }
  }

  const rowRoll = 0.1 * Math.sin(scull + Math.PI / 2);
  for (const [name, side] of [["Pectoral.L.Tip", -1], ["Pectoral.R.Tip", 1]] as const) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, undefined, 1, 0, rowRoll + (side > 0 ? flare : -flare), 0);
    }
  }
  for (const [name, side] of [["Pectoral.L", -1], ["Pectoral.R", 1]] as const) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, undefined, 1, 0, 0, side * tuck * 0.55);
    }
  }

  for (const [name, amplitude, lag] of [
    ["Dorsal.Mid", 0.014, 0.05],
    ["Dorsal.Tip", 0.01, 0.1],
    ["AnalFin.Tip", 0.012, 0.05],
  ] as const) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, undefined, 1, 0, 0, amplitude * Math.sin(phase - TAU * lag));
    }
  }

  // 4. Turn C-bend, shared along the spine so the head stays put.
  for (const name of BEND_BONES) {
    const bone = root.getObjectByName(name);
    if (bone) {
      placeBone(root, bone, state.rest?.get(name), gain, 0, 0, bend / BEND_BONES.length);
    }
  }
}
