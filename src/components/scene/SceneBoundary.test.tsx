import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SceneBoundary, SceneFailure } from "./SceneBoundary";

function BrokenModel({ failed }: { failed: boolean }) {
  if (failed) throw new Error("asset request failed");
  return <p>Model ready</p>;
}

describe("viewer failure recovery", () => {
  it("offers readable failure text and a focusable native Retry button", () => {
    const retry = vi.fn();
    render(<SceneFailure onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not|unavailable/i);
    const button = screen.getByRole("button", { name: "Retry" });
    expect(button.tagName).toBe("BUTTON");
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("keeps the failed model hidden until Retry resets and remounts the boundary", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    function Harness() {
      const [attempt, setAttempt] = useState(0);
      return <SceneBoundary key={attempt} onRetry={() => setAttempt(attempt + 1)}>
        <BrokenModel failed={attempt === 0} />
      </SceneBoundary>;
    }
    try {
      render(<Harness />);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText("Model ready")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(screen.getByText("Model ready")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      error.mockRestore();
    }
  });
});
