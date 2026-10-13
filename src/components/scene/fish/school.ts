import { Quaternion, Vector3 } from "three";
import type { FishState } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { HABITAT, OBSTACLES } from "@/experience/habitat";

const nose = new Vector3(-1, 0, 0);
export function createSchool(): FishState[] {
  return Array.from({ length: 10 }, (_, i) => {
    const velocity = new Vector3(0.37 + i * 0.006, 0.009 * Math.sin(i), 0.12);
    return {
      id: `fish-${i}`,
      position: new Vector3(-1.4 + (i % 5) * 0.65, -1.25 - Math.floor(i / 5) * 0.45, -2.8 + Math.sin(i * 2.4) * 0.7),
      velocity,
      heading: new Quaternion().setFromUnitVectors(nose, velocity.clone().normalize()),
    };
  });
}
// Ten-fish scratch storage is reused; the coordinator owns time and stepping.
const courses = Array.from({ length: 10 }, () => new Vector3());
const center = new Vector3();
const flow = new Vector3();
const offset = new Vector3();
const direction = new Vector3();
const padding = 0.22;

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
    desired.x += Math.max(0, HABITAT.school.x[0] + 0.8 - p.x) * 0.8 - Math.max(0, p.x - HABITAT.school.x[1] + 0.8) * 0.8;
    desired.y += Math.max(0, HABITAT.school.y[0] + 0.3 - p.y) - Math.max(0, p.y - HABITAT.school.y[1] + 0.3);
    desired.z += Math.max(0, HABITAT.school.z[0] + 0.7 - p.z) * 0.7 - Math.max(0, p.z - HABITAT.school.z[1] + 0.7) * 0.7;
    for (const obstacle of OBSTACLES) {
      offset.set(p.x - obstacle.center[0], p.y - obstacle.center[1], p.z - obstacle.center[2]);
      const distance = offset.length();
      const clearance = obstacle.radius + padding + 0.45;
      if (distance < clearance) {
        if (distance < 1e-8) offset.set(0, 1, 0);
        else offset.multiplyScalar(1 / distance);
        desired.addScaledVector(offset, (clearance - distance) * 1.5);
      }
    }
    if (desired.lengthSq() < 1e-8) desired.set(0.4, 0, 0.1);
    desired.setLength(0.39 + i * 0.012);
  }
  for (let i = 0; i < fish.length; i++) {
    const f = fish[i];
    f.velocity.lerp(courses[i], Math.min(1, dt * 1.8));
    const speed = f.velocity.length();
    if (speed < 1e-8) f.velocity.set(0.3, 0, 0);
    else f.velocity.multiplyScalar(Math.max(0.3, Math.min(0.6, speed)) / speed);
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
          f.velocity.y = Math.abs(f.velocity.y);
        }
      }
    }
    direction.copy(f.velocity).normalize();
    f.heading.setFromUnitVectors(nose, direction);
  }
}

function clampAxis(f: FishState, axis: "x" | "y" | "z", bounds: readonly [number, number]): void {
  if (f.position[axis] < bounds[0]) {
    f.position[axis] = bounds[0];
    f.velocity[axis] = Math.abs(f.velocity[axis]);
  } else if (f.position[axis] > bounds[1]) {
    f.position[axis] = bounds[1];
    f.velocity[axis] = -Math.abs(f.velocity[axis]);
  }
}
