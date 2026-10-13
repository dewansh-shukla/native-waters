import { readFileSync } from "node:fs";
import { Suspense, useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AnimationMixer, type AnimationAction } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { FishSchool } from "./fish/FishSchool";
import { createSchool } from "./fish/school";
import type { FishSchoolProps } from "@/experience/contracts";

const frames = vi.hoisted(() => ({ ticks: new Set<(state: unknown, delta: number) => void>() }));
// Real GLTF, skeleton cloning and mixer math; only the WebGL frame host is replaced.
vi.mock("@react-three/fiber", async original => ({
  ...await original<typeof import("@react-three/fiber")>(),
  useFrame: (tick: (state: unknown, delta: number) => void) => useEffect(() => {
    frames.ticks.add(tick); return () => { frames.ticks.delete(tick); };
  }, [tick]),
}));
afterEach(() => vi.restoreAllMocks());
function tick(delta: number) { act(() => { for (const frame of frames.ticks) frame(null, delta); }); }

it("preserves real school clip time and action identity through pause and resume", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const actions: AnimationAction[] = [];
  const original = AnimationMixer.prototype.clipAction;
  vi.spyOn(AnimationMixer.prototype, "clipAction").mockImplementation(function (this: AnimationMixer, ...args) {
    const action = original.apply(this, args); if (action) actions.push(action); return action;
  });
  const runtime = { current: { time: 0, entryProgress: 0, fish: createSchool() } };
  const props: FishSchoolProps = { modelUrl: `data:model/gltf-binary;base64,${readFileSync("public/models/pipeline-test.glb").toString("base64")}`,
    runtime, paused: false, visibleIds: runtime.current.fish.map(f => f.id), selectedId: null,
    onSelect: vi.fn(), onHover: vi.fn(), onReady: vi.fn() };
  const view = render(<Suspense><FishSchool {...props} /></Suspense>);
  await waitFor(() => expect(actions).toHaveLength(10), { timeout: 10_000 });
  runtime.current.time += .05; tick(.05); const times = actions.map(a => a.time), mixers = actions.map(a => a.getMixer());
  view.rerender(<Suspense><FishSchool {...props} paused /></Suspense>);
  tick(.5); expect(actions.map(a => a.time)).toEqual(times); expect(actions).toHaveLength(10);
  expect(actions.every(a => a.isRunning())).toBe(true);
  view.rerender(<Suspense><FishSchool {...props} /></Suspense>);
  runtime.current.time += .05; tick(.05); expect(actions.every((a, i) => a.time !== times[i])).toBe(true);
  expect(actions.map(a => a.getMixer())).toEqual(mixers); expect(actions).toHaveLength(10);
  view.unmount(); expect(actions.every(a => !a.isRunning())).toBe(true);
});
