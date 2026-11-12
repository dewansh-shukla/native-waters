import { render, screen } from "@testing-library/react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { describe, expect, it, vi } from "vitest";
import FishPreview from "./FishPreview";

vi.mock("@react-three/fiber", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/fiber")>();
  return { ...original, Canvas: vi.fn(() => <p>Renderer ready</p>) };
});
vi.mock("@react-three/drei", async (importOriginal) => {
  const original = await importOriginal<typeof import("@react-three/drei")>();
  return { ...original, useGLTF: vi.fn(() => ({ scene: { traverse: vi.fn() } })) };
});

describe("FishPreview", () => {
  it("renders a preview canvas for a model url", () => {
    render(<FishPreview modelUrl="/models/fish/zebra-danio/zebra-danio-high.glb" />);
    expect(screen.getByTestId("fish-preview")).toBeVisible();
    expect(screen.getByText("Renderer ready")).toBeVisible();
  });
});