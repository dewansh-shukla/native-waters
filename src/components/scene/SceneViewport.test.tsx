import { fireEvent, render, screen } from "@testing-library/react";
import { useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { afterEach, describe, expect, it, vi } from "vitest";
import SceneViewport from "./SceneViewport";
import { createSchool } from "./fish/school";
import type { ExperienceSceneProps } from "@/experience/contracts";

const props: ExperienceSceneProps = {
  modelUrl: "/models/polar-parrot-study-v1.glb", paused: true,
  state: { phase: "map", ready: false, selectedId: null },
  runtime: { current: { time: 0, entryProgress: 0, fish: createSchool() } },
  reducedMotion: true, quality: "LOW", visibleIds: ["fish-0"], mapHighlighted: false,
  onMapHighlight: vi.fn(), onReady: vi.fn(), onEntered: vi.fn(), onSelect: vi.fn(), onHover: vi.fn(), onEnter: vi.fn(),
};

const renderer = vi.hoisted(() => ({ failed: true }));
// Only the external WebGL renderer is replaced; recovery and loader cache APIs are real.
vi.mock("@react-three/fiber", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/fiber")>();
  return { ...original, Canvas: vi.fn(() => {
    if (renderer.failed) throw new Error("WebGL unavailable");
    return <p>Renderer ready</p>;
  }) };
});

afterEach(() => {
  renderer.failed = true;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("SceneViewport", () => {
  it("uses a Y-up perspective camera and stable scene module label", () => {
    renderer.failed = false;
    render(<SceneViewport {...props} />);
    expect(vi.mocked(Canvas).mock.calls.at(-1)?.[0]).toMatchObject({
      camera: { position: [0, 30, .01], up: [0, 1, 0], fov: 45 },
      "aria-label": "Native Waters scene",
    });
  });
  it("clears only the requested GLTF cache and remounts after a renderer failure", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const clear = vi.spyOn(useGLTF, "clear");
    render(<SceneViewport {...props} modelUrl="/models/pipeline-test.glb" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(clear).not.toHaveBeenCalled();
    renderer.failed = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(clear).toHaveBeenCalledExactlyOnceWith("/models/pipeline-test.glb");
    expect(props.onReady).toHaveBeenCalledWith(false);
    expect(screen.getByText("Renderer ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
