import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MotionControls } from "./MotionControls";

function ControlsHarness({ initiallyPaused }: { initiallyPaused: boolean }) {
  const [paused, setPaused] = useState(initiallyPaused);
  return <MotionControls paused={paused} onPausedChange={setPaused} />;
}

describe("MotionControls", () => {
  it("renders a pressed native Resume button when paused and resumes on click", () => {
    render(<ControlsHarness initiallyPaused={true} />);
    const button = screen.getByRole("button", { name: "Resume", pressed: true });
    expect(button.tagName).toBe("BUTTON");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Pause", pressed: false })).toBeInTheDocument();
  });

  it("renders an unpressed native Pause button when running and pauses on click", () => {
    render(<ControlsHarness initiallyPaused={false} />);
    const button = screen.getByRole("button", { name: "Pause", pressed: false });
    expect(button.tagName).toBe("BUTTON");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Resume", pressed: true })).toBeInTheDocument();
  });
});
