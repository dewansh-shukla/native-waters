import { Camera, MathUtils, PerspectiveCamera, Vector3 } from "three";
import type { ExperienceCameraProps, Phase, SceneRuntime } from "@/experience/contracts";
import { INDIA_BOUNDS, MAP_TOP, projectLonLat } from "@/experience/geography";
import { HABITAT, OBSTACLES } from "@/experience/habitat";

export type CameraStep = Omit<ExperienceCameraProps, "runtime" | "onEntered"> & {
  runtime: SceneRuntime; hidden: boolean; aspect: number; fov: number;
};
export type Pose = { position: Vector3; target: Vector3 };
export function applyCameraPose(camera: Camera, pose: Pose, aspect: number) {
  camera.up.set(0, 1, 0);
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);
  if (camera instanceof PerspectiveCamera && (camera.aspect !== aspect || camera.near !== 0.05 || camera.far !== 200)) {
    camera.aspect = aspect; camera.near = 0.05; camera.far = 200;
    camera.updateProjectionMatrix();
  }
}

const clamp = MathUtils.clamp;
const landing = (aspect = 1): Pose => ({ position: new Vector3(0, -1.1, Math.min(8.2, 2.8 + 4 * Math.max(0, 1 / Math.max(aspect, .1) - 1))), target: new Vector3(...HABITAT.school.center) });

/** Fit the entire geographic bounds, including islands, not just mainland geometry. */
export function overviewPose(aspect: number, fov: number): Pose {
  const target = new Vector3(0, MAP_TOP, 0);
  const direction = new Vector3(0, 0.94, 0.342).normalize();
  const up = new Vector3(0, direction.z, -direction.y);
  const tan = Math.tan(MathUtils.degToRad(fov) / 2);
  const [west, south, east, north] = INDIA_BOUNDS;
  let distance = 0;
  for (const lon of [west, east]) for (const lat of [south, north]) {
    const point = projectLonLat([lon, lat]).sub(target);
    distance = Math.max(distance, point.dot(direction) + Math.max(Math.abs(point.x) / Math.max(aspect, 0.1), Math.abs(point.dot(up))) / tan / 0.9);
  }
  return { position: target.clone().addScaledVector(direction, distance), target };
}

export function entryPose(progress: number, anchor: Vector3, overview: Pose, aspect = 1): Pose {
  const knots = [
    { t: 0, ...overview },
    { t: 0.32, position: anchor.clone().add(new Vector3(0, 4, 3)), target: anchor },
    { t: 0.64, position: new Vector3(0, 1.7, 4.5), target: new Vector3(0, HABITAT.surfaceY, -1.8) },
    { t: 1, ...landing(aspect) },
  ];
  const p = clamp(progress, 0, 1);
  if (p === 1) return landing(aspect);
  const index = Math.min(knots.findIndex((k) => k.t >= p), 3);
  if (index <= 0) return { position: overview.position.clone(), target: overview.target.clone() };
  const a = knots[index - 1], b = knots[index];
  const t = (p - a.t) / (b.t - a.t);
  const smooth = t * t * t * (t * (t * 6 - 15) + 10);
  return { position: a.position.clone().lerp(b.position, smooth), target: a.target.clone().lerp(b.target, smooth) };
}

export function constrainPosition(position: Vector3): Vector3 {
  position.set(clamp(position.x, HABITAT.world.x[0] + 0.5, HABITAT.world.x[1] - 0.5), clamp(position.y, HABITAT.floorY + 0.45, HABITAT.surfaceY - 0.25), clamp(position.z, HABITAT.world.z[0] + 0.5, HABITAT.world.z[1] - 0.5));
  for (const rock of OBSTACLES) {
    const center = new Vector3(...rock.center);
    const offset = position.clone().sub(center);
    const clearance = rock.radius + 0.4;
    if (offset.lengthSq() < clearance * clearance) {
      // Resolve horizontally so collision correction cannot push through floor/surface.
      offset.y = 0;
      if (offset.lengthSq() < 0.0001) offset.set(0, 0, 1);
      position.x = center.x + offset.normalize().x * clearance;
      position.z = center.z + offset.z * clearance;
    }
  }
  return position;
}

export class CameraInput {
  travel = 0; lateral = 0; lookX = 0; lookY = 0;
  private start: { x: number; y: number; lateral: number; travel: number } | null = null;
  private dragging = false;
  begin(x: number, y: number) { this.start = { x, y, lateral: this.lateral, travel: this.travel }; this.dragging = false; }
  drag(x: number, y: number, width: number, height: number) {
    if (!this.start) return false;
    const dx = x - this.start.x, dy = y - this.start.y;
    if (!this.dragging && Math.hypot(dx, dy) < 8) return false;
    this.dragging = true;
    this.lateral = clamp(this.start.lateral - dx / Math.max(width, 1) * 2.2, -1.1, 1.1);
    this.travel = clamp(this.start.travel + dy / Math.max(height, 1) * 2.4, -1.2, 1.2);
    return true;
  }
  end() { const dragged = this.dragging; this.start = null; this.dragging = false; return dragged; }
  wheel(delta: number) { this.travel = clamp(this.travel + delta * 0.003, -1.2, 1.2); }
  pointer(x: number, y: number, width: number, height: number) {
    this.lookX = clamp(x / Math.max(width, 1) * 2 - 1, -1, 1) * 0.3;
    this.lookY = -clamp(y / Math.max(height, 1) * 2 - 1, -1, 1) * 0.15;
  }
}

export class CameraController {
  position = new Vector3(); target = new Vector3(); input = new CameraInput();
  private phase: Phase | null = null;
  private lastTime: number | null = null;
  private entryStart = 0;
  private entered = false;
  private overview: Pose | null = null;

  update(step: CameraStep): boolean {
    const { runtime, phase, paused, hidden, ready, reducedMotion, aspect, fov, entryAnchor, selectedId } = step;
    const changed = phase !== this.phase;
    const initial = this.phase === null;
    const rawDelta = this.lastTime === null ? 0 : Math.max(0, runtime.time - this.lastTime);
    const delta = paused || hidden || !ready ? 0 : Math.min(rawDelta, 0.05);
    this.lastTime = runtime.time;
    this.phase = phase;
    if (changed && phase === "entering") {
      if (!initial) runtime.entryProgress = 0;
      this.entryStart = runtime.time - runtime.entryProgress * 5;
      this.entered = false;
      this.overview = overviewPose(aspect, fov);
    }
    if (phase === "entering" && !changed) this.entryStart += rawDelta - delta;
    if (phase === "entering" && !ready) {
      const pose = entryPose(runtime.entryProgress, entryAnchor, this.overview ?? overviewPose(aspect, fov), aspect);
      this.position.copy(pose.position); this.target.copy(pose.target);
      return false;
    }
    if (phase === "entering" && reducedMotion) {
      runtime.entryProgress = 1;
      const pose = landing(aspect); this.position.copy(pose.position); this.target.copy(pose.target);
      if (!this.entered) { this.entered = true; return true; }
      return false;
    }
    // The coordinator owns elapsed time; discard pauses and delayed/hidden-tab excess, never advance a private clock.
    if (phase === "map") {
      runtime.entryProgress = 0;
      this.input = new CameraInput();
      const pose = overviewPose(aspect, fov); this.position.copy(pose.position); this.target.copy(pose.target);
      return false;
    }
    if ((paused || hidden) && !initial) return false;
    if (phase === "entering") {
      runtime.entryProgress = clamp((runtime.time - this.entryStart) / 5, 0, 1);
      if (runtime.entryProgress > 1 - 1e-9) runtime.entryProgress = 1;
      const pose = entryPose(runtime.entryProgress, entryAnchor, this.overview ?? overviewPose(aspect, fov), aspect);
      this.position.copy(pose.position); this.target.copy(pose.target);
      if (runtime.entryProgress === 1 && !this.entered) { this.entered = true; return true; }
      return false;
    }
    const pose = landing(aspect);
    if (!reducedMotion) {
      pose.position.x += this.input.lateral;
      pose.position.z += this.input.travel;
      pose.target.x += this.input.lateral + this.input.lookX;
      pose.target.y += this.input.lookY;
      const fish = (phase === "following" || phase === "story") ? runtime.fish.find((f) => f.id === selectedId) : undefined;
      if (fish) {
        // Nose is -X: a fixed +Z viewing side preserves lateral silhouettes; never rotate behind heading.
        pose.target.copy(fish.position);
        pose.target.x += this.input.lookX;
        pose.target.y += this.input.lookY;
        pose.position.set(fish.position.x + 0.6, fish.position.y + 0.4, fish.position.z + pose.position.z - HABITAT.school.center[2]);
      }
    }
    constrainPosition(pose.position);
    if (initial || reducedMotion) { this.position.copy(pose.position); this.target.copy(pose.target); }
    else {
      const alpha = -Math.expm1(-3 * delta);
      this.position.lerp(pose.position, alpha); this.target.lerp(pose.target, alpha);
      constrainPosition(this.position);
    }
    return false;
  }
}
