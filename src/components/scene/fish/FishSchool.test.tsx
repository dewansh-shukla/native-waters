import { readFileSync } from "node:fs";
import { Suspense, useEffect } from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { AnimationClip, AnimationMixer, Bone, Box3, BoxGeometry, FileLoader, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, NumberKeyframeTrack, Skeleton, SkinnedMesh, Texture, Vector3, Raycaster, type AnimationAction, type Object3D } from "three";
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
const synthetic = vi.hoisted(() => ({ model: null as null | { scene: Object3D; animations: AnimationClip[] } }));
vi.mock("@react-three/drei", async (original) => {
  const actual = await original<typeof import("@react-three/drei")>();
  return { ...actual, useGLTF: (...args: Parameters<typeof actual.useGLTF>) => synthetic.model ?? actual.useGLTF(...args) };
});
afterEach(() => { synthetic.model = null; vi.restoreAllMocks(); });

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

// Synthetic disjoint anatomy tracks use the real SkeletonUtils clone and Three mixer.
function naturalModel() {
  const anatomy = {
    Swim: ["spine", "tail"],
    Breathing: ["gillLeft", "gillRight", "mouth"],
    FinIdle: ["pectoralLeft", "pectoralRight", "dorsal", "anal", "pelvicLeft", "pelvicRight"],
  };
  const bones = [...Object.values(anatomy).flat(), "rootBone", "head", "jaw"].map(name => {
    const bone = new Bone(); bone.name = name; return bone;
  });
  const geometry = new BoxGeometry(1, .3, .2);
  const count = geometry.attributes.position.count;
  geometry.setAttribute("skinIndex", new Float32BufferAttribute(new Array(count * 4).fill(0), 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(Array.from({ length: count * 4 }, (_, i) => i % 4 === 0 ? 1 : 0), 4));
  const mesh = new SkinnedMesh(geometry, new MeshBasicMaterial({ map: new Texture() }));
  mesh.add(...bones);
  mesh.bind(new Skeleton(bones));
  const scene = new Group(); scene.add(mesh);
  const animations = Object.entries(anatomy).map(([name, targets], i) => {
    const duration = 4 + i * 2;
    return new AnimationClip(name, duration, targets.map(target => new NumberKeyframeTrack(`${target}.position[x]`, [0, duration], [0, duration])));
  });
  // An unrelated first clip must not autoplay or override the named anatomy.
  animations.unshift(new AnimationClip("", 4, [new NumberKeyframeTrack("tail.position[x]", [0, 4], [50, 54])]));
  return { scene, animations, mesh, anatomy };
}

it("plays only the three named disjoint actions per clone with duration-based phases and safe shared resources", () => {
  const model = naturalModel(); synthetic.model = model;
  const actions: AnimationAction[] = [];
  const original = AnimationMixer.prototype.clipAction;
  vi.spyOn(AnimationMixer.prototype, "clipAction").mockImplementation(function (this: AnimationMixer, ...args) {
    const action = original.apply(this, args); if (action) actions.push(action); return action;
  });
  const runtime = { current: { fish: createSchool(), time: 3, entryProgress: 0 } };
  const onReady = vi.fn();
  const props: FishSchoolProps = { modelUrl: "synthetic-natural", runtime, paused: false,
    visibleIds: runtime.current.fish.map(f => f.id), selectedId: null, onSelect: vi.fn(), onHover: vi.fn(), onReady };
  const view = render(<FishSchool {...props} />);
  expect(actions).toHaveLength(30);
  expect(new Set(actions.map(a => a.getMixer())).size).toBe(10);
  const roots = [...new Set(actions.map(a => a.getRoot()))];
  for (const [index, root] of roots.entries()) {
    const rigActions = actions.filter(a => a.getRoot() === root);
    expect(rigActions.map(a => a.getClip().name)).toEqual(["Swim", "Breathing", "FinIdle"]);
    expect(new Set(rigActions.map(a => a.getMixer())).size).toBe(1);
    for (const action of rigActions) {
      expect(action.time).toBeCloseTo(action.getClip().duration * index / 10);
      expect(action.isRunning()).toBe(true);
      const name = action.getClip().name as keyof typeof model.anatomy;
      for (const target of model.anatomy[name]) expect(root.getObjectByName(target)!.position.x).toBeCloseTo(action.time);
    }
    const skinned = meshes(root)[0] as SkinnedMesh;
    expect(skinned.skeleton).not.toBe(model.mesh.skeleton);
    expect(skinned.skeleton.bones[0]).not.toBe(model.mesh.skeleton.bones[0]);
    expect(skinned.geometry).toBe(model.mesh.geometry);
    expect(skinned.material).toBe(model.mesh.material);
    expect((skinned.material as MeshBasicMaterial).map).toBe((model.mesh.material as MeshBasicMaterial).map);
  }
  expect(model.mesh.skeleton.bones.every(b => b.position.x === 0)).toBe(true);
  const sourceSkeletonDispose = vi.spyOn(model.mesh.skeleton, "dispose");
  const geometryDispose = vi.spyOn(model.mesh.geometry, "dispose");
  const materialDispose = vi.spyOn(model.mesh.material, "dispose");
  const textureDispose = vi.spyOn(model.mesh.material.map!, "dispose");
  const cloneDispose = roots.map(r => vi.spyOn((meshes(r)[0] as SkinnedMesh).skeleton, "dispose"));
  const uncache = vi.spyOn(AnimationMixer.prototype, "uncacheRoot");
  const phases = actions.map(a => a.time);
  tick(100); expect(actions.map(a => a.time)).toEqual(phases);
  view.rerender(<FishSchool {...props} visibleIds={["fish-0"]} selectedId="fish-9" onReady={vi.fn()} />);
  expect(roots.map(r => r.parent!.parent!.visible)).toEqual([true, false, false, false, false, false, false, false, false, true]);
  expect(actions).toHaveLength(30);
  expect(actions.map(a => a.time)).toEqual(phases);
  expect(uncache).not.toHaveBeenCalled();
  expect(cloneDispose.every(s => s.mock.calls.length === 0)).toBe(true);
  expect(onReady).toHaveBeenCalledOnce();
  view.unmount();
  expect(cloneDispose.every(s => s.mock.calls.length === 1)).toBe(true);
  expect(uncache).toHaveBeenCalledTimes(10);
  expect(actions.every(a => !a.isRunning())).toBe(true);
  for (const spy of [sourceSkeletonDispose, geometryDispose, materialDispose, textureDispose]) expect(spy).not.toHaveBeenCalled();
});

it("advances breathing and fins at rest, accelerates only swim, and freezes every phase through shared-clock pause/resume", () => {
  const model = naturalModel(); synthetic.model = model;
  const actions: AnimationAction[] = [];
  const original = AnimationMixer.prototype.clipAction;
  vi.spyOn(AnimationMixer.prototype, "clipAction").mockImplementation(function (this: AnimationMixer, ...args) {
    const action = original.apply(this, args); if (action) actions.push(action); return action;
  });
  const runtime = { current: { fish: createSchool(), time: 3, entryProgress: 0 } };
  runtime.current.fish.forEach(f => f.velocity.set(0, 0, 0));
  const props: FishSchoolProps = { modelUrl: "synthetic-natural", runtime, paused: false,
    visibleIds: runtime.current.fish.map(f => f.id), selectedId: null, onSelect: vi.fn(), onHover: vi.fn(), onReady: vi.fn() };
  const view = render(<FishSchool {...props} />);
  expect(actions).toHaveLength(30);
  const [swim, breathing, fin] = actions;
  const root = swim.getRoot();
  const advance = (delta: number) => { runtime.current.time += delta; tick(100); };
  const anatomyPose = () => Object.values(model.anatomy).flat().map(name => root.getObjectByName(name)!.position.x);
  const assertPose = () => {
    for (const action of [swim, breathing, fin]) {
      for (const name of model.anatomy[action.getClip().name as keyof typeof model.anatomy]) {
        expect(root.getObjectByName(name)!.position.x).toBeCloseTo(action.time);
      }
    }
  };
  advance(.1);
  expect(swim.time).toBe(0);
  expect(swim.timeScale).toBe(0);
  expect(breathing.time).toBeGreaterThan(0);
  expect(fin.time).toBeGreaterThan(0);
  expect(actions.every(a => a.getMixer().timeScale === 1)).toBe(true);
  expect(actions.filter(a => a.getClip().name === "Swim").every(a => a.timeScale === 0)).toBe(true);
  assertPose();
  const idleRates = [breathing.timeScale, fin.timeScale];
  runtime.current.fish[0].velocity.set(.42, 0, 0);
  const phases = actions.slice(0, 3).map(a => a.time);
  advance(.1);
  expect(swim.time - phases[0]).toBeCloseTo(.09);
  const rate = swim.timeScale;
  const nextPhases = actions.slice(0, 3).map(a => a.time);
  runtime.current.fish[0].velocity.set(.84, 0, 0);
  advance(.1);
  expect(swim.timeScale).toBeCloseTo(2 * rate);
  expect(swim.time - nextPhases[0]).toBeCloseTo(.18);
  expect(breathing.time - nextPhases[1]).toBeCloseTo(.1 * idleRates[0]);
  expect(fin.time - nextPhases[2]).toBeCloseTo(.1 * idleRates[1]);
  expect([breathing.timeScale, fin.timeScale]).toEqual(idleRates);
  assertPose();
  const saved = actions.map(a => a.time);
  const pose = anatomyPose();
  view.rerender(<FishSchool {...props} paused visibleIds={["fish-0"]} selectedId="fish-9" />);
  advance(20);
  expect(actions.map(a => a.time)).toEqual(saved);
  expect(anatomyPose()).toEqual(pose);
  // Resume resets the delta baseline even if no paused render frame ran.
  runtime.current.time += 20;
  view.rerender(<FishSchool {...props} />);
  tick(100);
  expect(actions.map(a => a.time)).toEqual(saved);
  advance(.1);
  expect(swim.time).toBeCloseTo(saved[0] + .18);
  expect(breathing.time).toBeCloseTo(saved[1] + .1 * idleRates[0]);
  expect(fin.time).toBeCloseTo(saved[2] + .1 * idleRates[1]);
  assertPose();
  expect(actions).toHaveLength(30);
  expect(model.mesh.skeleton.bones.every(b => b.position.x === 0)).toBe(true);
  runtime.current.fish.forEach(f => f.velocity.set(.42, 0, 0));
  advance(.1);
  for (const [index, action] of actions.filter(a => a.getClip().name === "Swim").entries()) {
    expect(action.timeScale).toBeCloseTo(.9 + index * .023);
  }
  const stoppedPhase = swim.time;
  const breathingPhase = breathing.time;
  runtime.current.fish[0].velocity.set(0, 0, 0);
  advance(.1);
  expect(swim.time).toBe(stoppedPhase);
  expect(breathing.time).toBeGreaterThan(breathingPhase);
  assertPose();
  view.unmount();
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
