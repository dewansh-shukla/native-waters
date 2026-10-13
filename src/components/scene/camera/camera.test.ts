import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3, Quaternion } from "three";
import { CAUVERY_ANCHOR, INDIA_SHAPES, projectLonLat } from "@/experience/geography";
import type { SceneRuntime } from "@/experience/contracts";
import { CameraController, CameraInput, entryPose, overviewPose, constrainPosition, applyCameraPose } from "./camera";

const runtime = (): SceneRuntime => ({ time: 0, entryProgress: 0, fish: [] });
const options = (r = runtime()) => ({ runtime: r, phase: "map" as "map" | "entering" | "exploring" | "following", selectedId: null as string | null, ready: true, paused: false, hidden: false, reducedMotion: false, entryAnchor: CAUVERY_ANCHOR, aspect: 0.45, fov: 45 });

describe("camera trajectory", () => {
  it("applies the sole Y-up pose and projection including portrait resize", () => {
    const camera = new PerspectiveCamera(45, 2, 0.1, 20);
    applyCameraPose(camera, { position: new Vector3(0, -1.1, 2.8), target: new Vector3(0, -1.5, -2) }, 0.45);
    expect(camera.position.toArray()).toEqual([0, -1.1, 2.8]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(camera.aspect).toBe(0.45); expect(camera.far).toBeGreaterThan(100);
    camera.updateMatrixWorld();
    expect(new Vector3(0, -1.5, -2).project(camera).x).toBeCloseTo(0);
    expect(new Vector3(0, -1.5, -2).project(camera).y).toBeCloseTo(0);
  });
  it("fits every real India/island vertex on portrait and landscape with north up", () => {
    for (const aspect of [0.35, 0.6, 1, 2.4]) {
      const pose = overviewPose(aspect, 45);
      const camera = new PerspectiveCamera(45, aspect, 0.1, 200);
      camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
      expect(pose.target.toArray()).toEqual([0, 8, 0]);
      for (const polygon of INDIA_SHAPES) for (const ring of polygon) for (const point of ring) {
        const screen = projectLonLat(point).project(camera);
        expect(Math.abs(screen.x)).toBeLessThan(0.96);
        expect(Math.abs(screen.y)).toBeLessThan(0.96);
      }
      expect(new Vector3(0, 8, -1).project(camera).y).toBeGreaterThan(0);
    }
  });
  it("approaches the actual river, shows surface before diving, and lands facing school", () => {
    const overview = overviewPose(1, 45);
    const anchor = new Vector3(4, 8, 6);
    const river = entryPose(0.32, anchor, overview);
    expect(river.target.distanceTo(anchor)).toBeLessThan(0.001);
    expect(river.position.y).toBeGreaterThan(8);
    const surface = entryPose(0.64, anchor, overview);
    expect(surface.position.y).toBeGreaterThan(0);
    expect(surface.target.y).toBe(0);
    const landing = entryPose(1, anchor, overview);
    expect(landing.position.toArray()).toEqual([0, -1.1, 2.8]);
    expect(landing.target.toArray()).toEqual([0, -1.5, -2]);
    let previous = entryPose(0, anchor, overview);
    for (let i = 1; i <= 1000; i++) {
      const pose = entryPose(i / 1000, anchor, overview);
      expect(pose.position.distanceTo(previous.position)).toBeLessThan(0.3);
      const direction = pose.target.clone().sub(pose.position).normalize();
      expect(direction.dot(previous.target.clone().sub(previous.position).normalize())).toBeGreaterThan(0.999);
      previous = pose;
    }
  });
  it("derives five second completion once from runtime and freezes on pause/hidden", () => {
    const c = new CameraController(); const o = options(); o.phase = "entering";
    expect(c.update(o)).toBe(false);
    let completions = 0;
    for (let i = 1; i <= 100; i++) { o.runtime.time = i / 20; completions += Number(c.update(o)); }
    expect(o.runtime.entryProgress).toBe(1); expect(completions).toBe(1);
    expect(c.update(o)).toBe(false);
    const frozen = c.position.clone(); o.paused = true; o.runtime.time += 10;
    c.update(o); expect(c.position.equals(frozen)).toBe(true);
    o.phase = "map"; o.paused = false; c.update(o); o.phase = "entering"; c.update(o);
    o.runtime.time += 1 / 20; c.update(o); const p = o.runtime.entryProgress;
    o.hidden = true; o.runtime.time += 20; c.update(o);
    expect(o.runtime.entryProgress).toBe(p);
    o.hidden = false; o.runtime.time += 20; c.update(o);
    expect(o.runtime.entryProgress - p).toBeLessThanOrEqual(0.010001);
  });
  it.each([false, true])("holds entry completion until recovered graphics are ready (reduced=%s)", (reducedMotion) => {
    const c = new CameraController(); const o = options(); o.phase = "entering"; o.ready = false; o.reducedMotion = reducedMotion;
    o.runtime.entryProgress = .4;
    expect(c.update(o)).toBe(false);
    o.runtime.time += 20;
    expect(c.update(o)).toBe(false);
    expect(o.runtime.entryProgress).toBe(.4);
    o.ready = true;
    let completions = Number(c.update(o));
    for (let i = 0; i < 101; i++) { o.runtime.time += .05; completions += Number(c.update(o)); }
    expect(completions).toBe(1); expect(o.runtime.entryProgress).toBe(1);
  });
  it("reduced motion finishes even paused and remains static after fish Resume", () => {
    const c = new CameraController(); const o = options(); o.phase = "entering"; o.paused = true; o.reducedMotion = true;
    expect(c.update(o)).toBe(true); expect(o.runtime.entryProgress).toBe(1);
    expect(c.update(o)).toBe(false);
    o.phase = "following"; o.selectedId = "fish"; o.paused = false;
    o.runtime.fish = [{ id: "fish", position: new Vector3(2, -1.5, -2), velocity: new Vector3(-1, 0, 0), heading: new Quaternion() }];
    c.update(o); const frozen = c.position.clone();
    o.runtime.time += 1; o.runtime.fish[0].position.x = -3; c.update(o);
    expect(c.position.equals(frozen)).toBe(true);
  });
  it("damps lateral following, clamps delayed frames, and smoothly releases", () => {
    const c = new CameraController(); const o = options(); o.phase = "exploring"; c.update(o);
    o.phase = "following"; o.selectedId = "fish";
    o.runtime.fish = [{ id: "fish", position: new Vector3(3, -1.5, -2), velocity: new Vector3(-1, 0, 0), heading: new Quaternion() }];
    o.runtime.time += 0.016; c.update(o);
    expect(c.position.x).toBeGreaterThan(0); expect(c.position.x).toBeLessThan(0.3);
    const old = c.position.clone(); o.runtime.time += 100; c.update(o);
    expect(c.position.distanceTo(old)).toBeLessThan(0.7);
    const followed = c.position.clone(); o.phase = "exploring"; o.runtime.time += 0.016; c.update(o);
    expect(c.position.x).toBeLessThan(followed.x); expect(c.position.distanceTo(followed)).toBeLessThan(0.2);
    o.paused = true; const frozen = c.position.clone(); o.runtime.time += 1; c.update(o);
    expect(c.position.equals(frozen)).toBe(true);
  });
  it("keeps the camera inside habitat and outside floor, surface, and rocks", () => {
    const p = constrainPosition(new Vector3(100, -100, 100));
    expect(p.x).toBeLessThan(12); expect(p.z).toBeLessThan(9); expect(p.y).toBeGreaterThan(-3);
    expect(constrainPosition(new Vector3(0, 100, 0)).y).toBeLessThan(0);
    expect(constrainPosition(new Vector3(3, -2.5, -1)).distanceTo(new Vector3(3, -2.5, -1))).toBeGreaterThan(0.9);
  });
});

describe("bounded canvas gesture math", () => {
  it("distinguishes a tap from a true touch drag and bounds wheel and pointer", () => {
    const input = new CameraInput();
    input.begin(10, 10); expect(input.drag(14, 14, 400, 800)).toBe(false); expect(input.end()).toBe(false);
    input.begin(10, 10); expect(input.drag(10, 30, 400, 800)).toBe(true); expect(input.end()).toBe(true);
    expect(input.travel).not.toBe(0);
    input.wheel(100000); expect(input.travel).toBe(1.2);
    input.wheel(-100000); expect(input.travel).toBe(-1.2);
    input.pointer(10000, -10000, 400, 800); expect(Math.abs(input.lookX)).toBeLessThanOrEqual(0.3); expect(Math.abs(input.lookY)).toBeLessThanOrEqual(0.15);
    input.begin(0, 0); input.drag(100000, 100000, 400, 800); expect(Math.abs(input.lateral)).toBeLessThanOrEqual(1.1);
  });
});
