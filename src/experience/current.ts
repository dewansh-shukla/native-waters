import type { Vector3 } from "three";

export function currentAt(position: Vector3, time: number, out: Vector3): Vector3 {
  return out.set(
    0.08 * Math.sin(position.z * 0.35 + time * 0.3),
    0.03 * Math.sin(position.x * 0.4 + position.z * 0.2 + time * 0.2),
    0.3 + 0.08 * Math.sin(position.x * 0.25 + position.y * 0.3 + time * 0.15),
  );
}
