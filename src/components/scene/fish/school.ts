import { Euler, Quaternion, Vector3 } from "three";
import type { FishState } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { HABITAT, OBSTACLES } from "@/experience/habitat";

const orientation = new Euler(0, 0, 0, "YZX");
const nose = new Vector3(-1, 0, 0);
const yawRate = 1.5, pitchRate = 0.5, maxPitch = Math.PI / 9;
const maxSpeed = 0.6, padding = 0.22;
// Leave room for a complete turn at the maximum preview speed, not a last-frame bounce.
const turnClearance = 2 * maxSpeed / yawRate + padding + 0.1;
function updateHeading(heading: Quaternion, velocity: Vector3): Quaternion {
  // The Y-up GLB faces local -X: world-up yaw then pitch, never shortest-arc roll.
  orientation.set(0, Math.atan2(velocity.z, -velocity.x), -Math.atan2(velocity.y, Math.hypot(velocity.x, velocity.z)));
  return heading.setFromEuler(orientation);
}
export function createSchool(): FishState[] {
  return Array.from({ length: 10 }, (_, i) => {
    const velocity = new Vector3(0.37 + i * 0.006, 0.009 * Math.sin(i), 0.12);
    return {
      id: `fish-${i}`,
      position: new Vector3(-1.4 + (i % 5) * 0.65, -1.25 - Math.floor(i / 5) * 0.45, -2.8 + Math.sin(i * 2.4) * 0.7),
      velocity,
      heading: updateHeading(new Quaternion(), velocity),
    };
  });
}
// Ten-fish scratch storage is reused; the coordinator owns time and stepping.
const courses = Array.from({ length: 10 }, () => new Vector3());
const center = new Vector3();
const flow = new Vector3();
const offset = new Vector3();

export function stepSchool(fish: FishState[], delta: number, time: number): void {
  if (!(delta > 0) || !Number.isFinite(delta) || !Number.isFinite(time) || fish.length === 0) return;
  // Cap a stalled tab's step rather than teleport through the habitat.
  const dt = Math.min(delta, 0.05);
  center.set(0, 0, 0);
  for (const f of fish) center.add(f.position);
  center.multiplyScalar(1 / fish.length);
  const lateral = 0.43 * Math.cos(time * 0.075);
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    const desired = courses[i].set(lateral, 0.015 * Math.sin(time * 0.3 + i), 0);
    currentAt(f.position, time, flow);
    desired.addScaledVector(flow, 0.32);
    desired.y += (HABITAT.school.center[1] - f.position.y) * 0.16;
    desired.z += (HABITAT.school.center[2] + Math.sin(time * 0.09) - f.position.z) * 0.12;
    offset.subVectors(center, f.position);
    desired.addScaledVector(offset, 0.07);
    for (let j = 0; j < fish.length; j++) {
      if (i === j) continue;
      offset.subVectors(f.position, fish[j].position);
      const distanceSq = offset.lengthSq();
      if (distanceSq < 0.42 * 0.42) {
        if (distanceSq < 1e-8) offset.set(i < j ? -1 : 1, 0, 0);
        else offset.multiplyScalar(1 / Math.sqrt(distanceSq));
        desired.addScaledVector(offset, 0.45);
      }
      if (distanceSq < 2.25) desired.addScaledVector(fish[j].velocity, 0.025);
    }
    const p = f.position;
    const nearWall = p.x < HABITAT.school.x[0] + turnClearance || p.x > HABITAT.school.x[1] - turnClearance
      || p.z < HABITAT.school.z[0] + turnClearance || p.z > HABITAT.school.z[1] - turnClearance
      || p.y < HABITAT.school.y[0] + 0.5 || p.y > HABITAT.school.y[1] - 0.5;
    const nearRock = OBSTACLES.some(obstacle => {
      offset.set(obstacle.center[0], obstacle.center[1], obstacle.center[2]).sub(p);
      return offset.lengthSq() < (obstacle.radius + turnClearance) ** 2;
    });
    // One interior course avoids contradictory per-wall/rock corrections at corners.
    if (nearWall || nearRock) desired.set(...HABITAT.school.center).sub(p);
    if (desired.lengthSq() < 1e-8) desired.set(0.4, 0, 0.1);
    desired.setLength(0.39 + i * 0.012);
  }
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    const desired = courses[i];
    const currentSpeed = f.velocity.length();
    const speed = Math.max(0.3, Math.min(maxSpeed, currentSpeed + (desired.length() - currentSpeed) * Math.min(1, dt * 1.8)));
    const yaw = Math.atan2(f.velocity.z, -f.velocity.x);
    const targetYaw = Math.hypot(desired.x, desired.z) > 1e-8 ? Math.atan2(desired.z, -desired.x) : yaw;
    const yawDelta = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
    const pitch = Math.max(-maxPitch, Math.min(maxPitch, -Math.atan2(f.velocity.y, Math.hypot(f.velocity.x, f.velocity.z))));
    const targetPitch = Math.max(-maxPitch, Math.min(maxPitch, -Math.atan2(desired.y, Math.hypot(desired.x, desired.z))));
    orientation.set(0, yaw + Math.max(-yawRate * dt, Math.min(yawRate * dt, yawDelta)),
      pitch + Math.max(-pitchRate * dt, Math.min(pitchRate * dt, targetPitch - pitch)));
    f.heading.setFromEuler(orientation);
    f.velocity.copy(nose).applyQuaternion(f.heading).multiplyScalar(speed);
    f.position.addScaledVector(f.velocity, dt);
    clampAxis(f, "x", HABITAT.school.x);
    clampAxis(f, "y", HABITAT.school.y);
    clampAxis(f, "z", HABITAT.school.z);
    // Rocks sit on the bed: project above their sphere, never into a corridor wall.
    for (const o of OBSTACLES) {
      const dx = f.position.x - o.center[0];
      const dz = f.position.z - o.center[2];
      const radius = o.radius + padding;
      const horizontalSq = dx * dx + dz * dz;
      if (horizontalSq < radius * radius) {
        const top = o.center[1] + Math.sqrt(radius * radius - horizontalSq);
        if (f.position.y < top) {
          f.position.y = top + 1e-6;
        }
      }
    }
  }
}

function clampAxis(f: FishState, axis: "x" | "y" | "z", bounds: readonly [number, number]): void {
  // Invalid positions still need repair, but collision guards must not flip the body.
  f.position[axis] = Math.max(bounds[0], Math.min(bounds[1], f.position[axis]));
}
