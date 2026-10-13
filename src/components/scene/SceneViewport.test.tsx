import { fireEvent, render, screen } from "@testing-library/react";
import { useGLTF } from "@react-three/drei";
import { afterEach, describe, expect, it, vi } from "vitest";
import SceneViewport from "./SceneViewport";

const renderer = vi.hoisted(() => ({ failed: true }));
// Only the external WebGL renderer is replaced; recovery and loader cache APIs are real.
vi.mock("@react-three/fiber", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/fiber")>();
  return { ...original, Canvas: () => {
    if (renderer.failed) throw new Error("WebGL unavailable");
    return <p>Renderer ready</p>;
  } };
});

afterEach(() => {
  renderer.failed = true;
  vi.restoreAllMocks();
});

describe("SceneViewport retry", () => {
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
