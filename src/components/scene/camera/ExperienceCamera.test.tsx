import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import type { ExperienceCameraProps } from "@/experience/contracts";
import { ExperienceCamera } from "./ExperienceCamera";

// Substitute only the WebGL host; controller, runtime, camera, input and React lifecycle are real.
const host = vi.hoisted(() => ({ frame: () => {}, state: {} as object }));
vi.mock("@react-three/fiber", () => ({ useFrame: (frame: () => void) => { host.frame = frame; }, useThree: () => host.state }));

function setup() {
  const canvas = document.createElement("canvas");
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  host.state = { camera, gl: { domElement: canvas }, size: { width: 400, height: 800 } };
  const props: ExperienceCameraProps = { runtime: { current: { time: 0, entryProgress: 0, fish: [] } }, phase: "map", selectedId: null, ready: true, paused: false, reducedMotion: false, entryAnchor: new Vector3(-2, 8, 5), onEntered: vi.fn() };
  return { props, camera, canvas };
}
describe("ExperienceCamera integration", () => {
  it("consumes coordinator time without advancing it and completes once on the same camera", () => {
    const { props, camera } = setup(); const view = render(<ExperienceCamera {...props} />);
    act(() => host.frame()); expect(camera.position.y).toBeGreaterThan(8);
    props.phase = "entering"; view.rerender(<ExperienceCamera {...props} />); act(() => host.frame());
    for (let i = 1; i <= 100; i++) { props.runtime.current.time = i / 20; act(() => host.frame()); }
    expect(props.runtime.current.time).toBe(5); expect(props.runtime.current.entryProgress).toBe(1);
    expect(props.onEntered).toHaveBeenCalledTimes(1); expect(camera.position.y).toBeCloseTo(-1.1);
    act(() => host.frame()); expect(props.onEntered).toHaveBeenCalledTimes(1);
    props.phase = "exploring"; props.paused = true; view.rerender(<ExperienceCamera {...props} />);
    const frozen = camera.position.clone(); props.runtime.current.time = 100; act(() => host.frame()); expect(camera.position.equals(frozen)).toBe(true);
    view.unmount();
  });
  it("completes reduced entry while paused and leaves normal entry paused", () => {
    const { props, camera } = setup(); props.phase = "entering"; props.paused = true;
    const view = render(<ExperienceCamera {...props} />); act(() => host.frame());
    expect(props.onEntered).not.toHaveBeenCalled(); expect(camera.position.y).toBeGreaterThan(8);
    props.reducedMotion = true; view.rerender(<ExperienceCamera {...props} />); act(() => host.frame());
    expect(props.onEntered).toHaveBeenCalledTimes(1); expect(camera.position.y).toBeCloseTo(-1.1);
    view.unmount();
  });
});
