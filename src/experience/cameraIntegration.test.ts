import { expect, test } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { CameraController, applyCameraPose } from "@/components/scene/camera/camera";
import { CAUVERY_ANCHOR } from "./geography";
import { createSchool } from "@/components/scene/fish/school";

test("paused reduced-motion return still refits the actual map and portrait school is in view", () => {
  const controller = new CameraController();
  const runtime = { time: 0, entryProgress: 0, fish: createSchool() };
  const props = { runtime, ready: true, phase: "map" as const, paused: true, hidden: false, reducedMotion: true, aspect: .46,
    fov: 45, entryAnchor: CAUVERY_ANCHOR, selectedId: null };
  controller.update(props);
  const map = controller.position.clone();
  controller.update({ ...props, phase: "entering" });
  expect(controller.position.y).toBeLessThan(0);
  const camera = new PerspectiveCamera(45, .46, .05, 200);
  applyCameraPose(camera, controller, .46); camera.updateMatrixWorld();
  for (const fish of runtime.fish) {
    const point = fish.position.clone().project(camera);
    expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1);
  }
  controller.update({ ...props, phase: "exploring" });
  controller.update(props);
  expect(controller.position.distanceTo(map)).toBeLessThan(.001);
  expect(controller.target.equals(new Vector3(0, 8, 0))).toBe(true);
  expect(runtime.entryProgress).toBe(0);
});
