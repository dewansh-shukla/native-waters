import { readFileSync } from "node:fs";
import { Suspense, useEffect, type ReactNode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AnimationMixer, type AnimationAction } from "three";
import { afterEach, expect, it, vi } from "vitest";
import SceneViewport from "./SceneViewport";

const frames = vi.hoisted(() => ({ tick: null as null | ((state: unknown, delta: number) => void) }));
const canvas = document.createElement("canvas");
// Keep the GLTF loader, rig cloning and AnimationMixer real; replace only the WebGL host and frame loop.
vi.mock("@react-three/fiber", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/fiber")>();
  return {
    ...original,
    Canvas: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    useThree: (select: (state: { gl: { domElement: HTMLCanvasElement } }) => unknown) => select({ gl: { domElement: canvas } }),
    useFrame: (tick: typeof frames.tick) => useEffect(() => {
      frames.tick = tick;
      return () => { frames.tick = null; };
    }, [tick]),
  };
});

afterEach(() => vi.restoreAllMocks());

it("preserves real clip time and action identity through pause and resume", async () => {
  // React DOM does not understand Three's host elements in the renderer replacement.
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const actions: AnimationAction[] = [];
  const clipAction = AnimationMixer.prototype.clipAction;
  vi.spyOn(AnimationMixer.prototype, "clipAction").mockImplementation(function (this: AnimationMixer, ...args) {
    const action = clipAction.apply(this, args);
    if (action) actions.push(action);
    return action;
  });
  const modelUrl = `data:model/gltf-binary;base64,${readFileSync("public/models/pipeline-test.glb").toString("base64")}`;
  const view = render(<Suspense><SceneViewport modelUrl={modelUrl} paused={false} /></Suspense>);
  await waitFor(() => expect(actions).toHaveLength(1));
  const action = actions[0];
  const mixer = action.getMixer();
  act(() => frames.tick!(null, 0.25));
  expect(action.time).toBeCloseTo(0.25);
  expect(mixer.time).toBeCloseTo(0.25);
  expect(action.isRunning()).toBe(true);

  view.rerender(<Suspense><SceneViewport modelUrl={modelUrl} paused /></Suspense>);
  act(() => frames.tick!(null, 0.5));
  expect(action.time).toBeCloseTo(0.25);
  expect(actions).toHaveLength(1);
  expect(mixer.time).toBeCloseTo(0.25);
  expect(action.isRunning()).toBe(true);

  view.rerender(<Suspense><SceneViewport modelUrl={modelUrl} paused={false} /></Suspense>);
  act(() => frames.tick!(null, 0.25));
  expect(action.time).toBeCloseTo(0.5);
  expect(actions).toHaveLength(1);
  expect(mixer.time).toBeCloseTo(0.5);
  expect(action.isRunning()).toBe(true);
  view.unmount();
  expect(action.isRunning()).toBe(false);
  expect(errors.mock.calls.filter(([message]) => !/unrecognized|incorrect casing|non-boolean attribute/i.test(String(message)))).toEqual([]);
});
