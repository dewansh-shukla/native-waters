// Swim retiming and banking derived from the fish's real speed, not its index.
// The Swim clip is authored at 3 Hz with a 0.12 L tail-tip amplitude; a cruising
// fish beats faster than that and a hovering one slower, so the clip is retimed
// by body lengths travelled per second.

export const CLIP_HZ = 3.0;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/** Tail-beat frequency (Hz) for a fish moving at `speed` world units/second. */
export function beatFrequency(speed: number, length: number): number {
  const bodyLengths = speed / Math.max(length, 1e-3);
  return clamp(1.15 + 0.95 * bodyLengths, 1.1, 4.5);
}

/** AnimationMixer scale that turns the 3 Hz clip into the real beat. */
export function swimTimeScale(speed: number, length: number): number {
  return beatFrequency(speed, length) / CLIP_HZ;
}

/** Roll (radians) into a turn; positive turn rates bank left. */
export function bankAngle(turnRate: number): number {
  return clamp(turnRate * 0.45, -0.28, 0.28);
}
