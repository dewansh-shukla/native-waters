import { fireEvent, render, screen } from "@testing-library/react";
import { useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { afterEach, describe, expect, it, vi } from "vitest";
import SceneViewport from "./SceneViewport";

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
  it("uses a fixed glTF Y-up lateral camera and generic accessible model label", () => {
    renderer.failed = false;
    render(<SceneViewport modelUrl="/models/polar-parrot-study-v1.glb" paused />);
    expect(vi.mocked(Canvas).mock.calls.at(-1)?.[0]).toMatchObject({
      camera: { position: [0.45, 0.25, 4.65], up: [0, 1, 0], fov: 35 },
      "aria-label": "Animated fish reference model",
    });
  });
  it("clears only the requested GLTF cache and remounts after a renderer failure", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const clear = vi.spyOn(useGLTF, "clear");
    render(<SceneViewport modelUrl="/models/pipeline-test.glb" paused />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(clear).not.toHaveBeenCalled();
    renderer.failed = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(clear).toHaveBeenCalledExactlyOnceWith("/models/pipeline-test.glb");
    expect(screen.getByText("Renderer ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
