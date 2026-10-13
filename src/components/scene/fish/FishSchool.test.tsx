import { readFileSync } from "node:fs";
import { Suspense, useEffect } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { AnimationMixer, Box3, FileLoader, Mesh, SkinnedMesh, Vector3, Raycaster, type AnimationAction, type Object3D } from "three";
import { afterEach, expect, it, vi } from "vitest";
import type { FishSchoolProps } from "@/experience/contracts";
import { FishSchool } from "./FishSchool";
import { createSchool } from "./school";

const frames = vi.hoisted(() => ({ ticks: new Set<(state: unknown, delta: number) => void>() }));
// Replace only the WebGL host frame loop; GLTF fetch, cloned rigs and mixers stay real.
vi.mock("@react-three/fiber", async (original) => ({
  ...await original<typeof import("@react-three/fiber")>(),
  useFrame: (tick: (state: unknown, delta: number) => void) => useEffect(() => {
    frames.ticks.add(tick);
    return () => { frames.ticks.delete(tick); };
  }, [tick]),
}));
afterEach(() => vi.restoreAllMocks());

function tick(delta: number) { act(() => { for (const frame of frames.ticks) frame(null, delta); }); }
function meshes(root: Object3D) {
  const result: Mesh[] = [];
  root.traverse(node => { if (node instanceof Mesh) result.push(node); });
  return result;
}

it("loads once, keeps ten independent rigs mounted, and preserves actions through quality and pause/resume", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // DOM host does not recognize Three primitive tags.
  const actions: AnimationAction[] = [];
  const clipAction = AnimationMixer.prototype.clipAction;
  vi.spyOn(AnimationMixer.prototype, "clipAction").mockImplementation(function (this: AnimationMixer, ...args) {
    const action = clipAction.apply(this, args);
    if (action) actions.push(action);
    return action;
  });
  const load = vi.spyOn(FileLoader.prototype, "load");
  const uncache = vi.spyOn(AnimationMixer.prototype, "uncacheRoot");
  const modelUrl = `data:model/gltf-binary;base64,${readFileSync("public/models/pipeline-test.glb").toString("base64")}`;
  const runtime = { current: { fish: createSchool(), time: 3, entryProgress: 0 } };
  const props: FishSchoolProps = {
    modelUrl, runtime, paused: false, visibleIds: runtime.current.fish.map(f => f.id),
    selectedId: null, onSelect: vi.fn(), onHover: vi.fn(), onReady: vi.fn(),
  };
  const view = render(<Suspense><FishSchool {...props} /></Suspense>);
  await waitFor(() => expect(actions).toHaveLength(10));
  expect(props.onReady).toHaveBeenCalledTimes(1);
  expect(load.mock.calls.filter(([url]) => url === modelUrl)).toHaveLength(1);
  const roots = actions.map(a => a.getRoot());
  expect(new Set(roots).size).toBe(10);
  expect(new Set(roots.map(r => r.parent?.scale.x)).size).toBe(10);
  for (const root of roots) {
    const size = new Box3().setFromObject(root.parent!).getSize(new Vector3());
    const length = Math.max(size.x, size.y, size.z);
    expect(length).toBeGreaterThan(0.34);
    expect(length).toBeLessThan(0.46);
  }
  const skinned = roots.map(r => meshes(r).find(m => m instanceof SkinnedMesh) as SkinnedMesh);
  expect(skinned.every(Boolean)).toBe(true);
  expect(new Set(skinned.map(m => m.skeleton)).size).toBe(10);
  expect(new Set(skinned.map(m => m.skeleton.bones[0])).size).toBe(10);
  expect(skinned[0].geometry).toBe(skinned[1].geometry);
  expect(skinned[0].material).toBe(skinned[1].material);
  const dispose = vi.spyOn(skinned[0].geometry, "dispose");
  const initialPhases = actions.map(a => a.time);
  expect(new Set(initialPhases).size).toBe(10);
  tick(10);
  expect(actions.map(a => a.time)).toEqual(initialPhases); // Initial mount never catches up to runtime.time=3.
  const mixerTime = actions[0].getMixer().time;
  runtime.current.time += .05;
  const snapshot = JSON.stringify(runtime.current);
  tick(10);
  expect(actions[0].getMixer().time - mixerTime).toBeCloseTo(.05 * actions[0].getMixer().timeScale);
  expect(JSON.stringify(runtime.current)).toBe(snapshot); // No second simulation/time driver.
  expect(actions.every((a, i) => a.time !== initialPhases[i])).toBe(true);
  expect(new Set(actions.map(a => a.getMixer().timeScale)).size).toBe(10);
  const fishRoot = roots[0].parent!.parent!;
  fishRoot.updateMatrixWorld(true);
  const ray = new Raycaster(fishRoot.position.clone().add(new Vector3(0, 0, 2)), new Vector3(0, 0, -1));
  expect(ray.intersectObject(fishRoot, true)).toHaveLength(1); // Invisible material still gives a padded hit target.
  const oldPlayback = actions[0].getMixer().timeScale;
  runtime.current.fish[0].velocity.setLength(0.6);
  tick(0);
  expect(actions[0].getMixer().timeScale).toBeGreaterThan(oldPlayback);
  const saved = actions.map(a => a.time);
  const changedReady = vi.fn();
  view.rerender(<Suspense><FishSchool {...props} paused visibleIds={["fish-0"]} selectedId="fish-9" onReady={changedReady} /></Suspense>);
  runtime.current.time += 20;
  tick(0.5);
  expect(actions.map(a => a.time)).toEqual(saved);
  expect(changedReady).not.toHaveBeenCalled();
  expect(actions).toHaveLength(10);
  expect(uncache).not.toHaveBeenCalled();
  expect(dispose).not.toHaveBeenCalled();
  // The rig's normalized parent sits under the independently oriented fish root.
  expect(roots[0].parent?.parent?.visible).toBe(true);
  expect(roots[1].parent?.parent?.visible).toBe(false);
  const hiddenRoot = roots[1].parent!.parent!;
  hiddenRoot.updateMatrixWorld(true);
  ray.ray.origin.copy(hiddenRoot.position).add(new Vector3(0, 0, 2));
  expect(ray.intersectObject(hiddenRoot, true)).toHaveLength(0);
  expect(roots[9].parent?.parent?.visible).toBe(true);
  view.rerender(<Suspense><FishSchool {...props} /></Suspense>);
  tick(0.1); expect(actions.map(a => a.time)).toEqual(saved); // Re-entry does not catch up.
  runtime.current.time += .05; tick(0.1);
  expect(actions).toHaveLength(10);
  expect(actions.every((a, i) => a.time !== saved[i])).toBe(true);
  actions[0].stop();
  const secondTime = actions[1].time;
  runtime.current.time += .05; tick(0.1);
  expect(actions[0].isRunning()).toBe(false);
  expect(actions[1].isRunning()).toBe(true);
  expect(actions[1].time).not.toBe(secondTime);
  skinned[0].skeleton.bones[0].position.x = 123;
  expect(skinned[1].skeleton.bones[0].position.x).not.toBe(123);
  view.unmount();
  expect(actions.every(a => !a.isRunning())).toBe(true);
  expect(uncache).toHaveBeenCalledTimes(10);
  expect(dispose).not.toHaveBeenCalled();
  expect(props.onReady).toHaveBeenCalledTimes(1);
});

function pointer(target: Element, type: string, x: number, y: number) {
  fireEvent(target, Object.assign(new Event(type, { bubbles: true }), { clientX: x, clientY: y, pointerId: 1, button: 0 }));
}

it("reports stable hover/select IDs, shares drags with the camera, and rejects drag-return and canceled clicks", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const runtime = { current: { fish: createSchool(), time: 0, entryProgress: 0 } };
  const onSelect = vi.fn();
  const onHover = vi.fn();
  const onReady = vi.fn();
  const parentClick = vi.fn();
  const parentDown = vi.fn();
  const props: FishSchoolProps = {
    modelUrl: `data:model/gltf-binary;base64,${readFileSync("public/models/pipeline-test.glb").toString("base64")}`,
    runtime, paused: false, visibleIds: runtime.current.fish.map(f => f.id), selectedId: null,
    onSelect, onHover, onReady,
  };
  const view = render(<div onClick={parentClick} onPointerDown={parentDown}><Suspense><FishSchool {...props} /></Suspense></div>);
  await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
  const target = view.container.querySelectorAll("primitive")[3];
  pointer(target, "pointerover", 10, 20);
  expect(onHover).toHaveBeenLastCalledWith("fish-3");
  pointer(target, "pointerout", 10, 20);
  expect(onHover).toHaveBeenLastCalledWith(null);
  pointer(target, "pointerdown", 10, 20);
  pointer(target, "pointerup", 13, 22);
  fireEvent.click(target, { button: 0 });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("fish-3");
  expect(parentClick).not.toHaveBeenCalled();
  expect(parentDown).toHaveBeenCalledOnce();
  pointer(target, "pointerdown", 10, 20);
  pointer(target, "pointermove", 25, 20);
  pointer(target, "pointerup", 10, 20); // A drag can return to its start.
  fireEvent.click(target, { button: 0 });
  expect(onSelect).toHaveBeenCalledOnce();
  pointer(target, "pointerdown", 10, 20);
  pointer(target, "pointercancel", 10, 20);
  fireEvent.click(target, { button: 0 });
  expect(onSelect).toHaveBeenCalledOnce();
  view.rerender(<Suspense><FishSchool {...props} visibleIds={["fish-0"]} /></Suspense>);
  const hidden = view.container.querySelectorAll("primitive")[3];
  pointer(hidden, "pointerdown", 10, 20);
  fireEvent.click(hidden, { button: 0 });
  expect(onSelect).toHaveBeenCalledOnce();
});
