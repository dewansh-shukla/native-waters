import { useReducer, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import fixture from "../../../content/fixtures/pipeline-test.json";
import { journeyReducer } from "@/experience/journey";
import type { JourneyState, QualityPreference } from "@/experience/contracts";
import { ExperienceUI } from "./ExperienceUI";

// jsdom does not implement the native dialog boundary.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
function Harness({ initial = { phase: "map", ready: false, selectedId: null } as JourneyState }) {
  const [state, dispatch] = useReducer(journeyReducer, initial);
  const [paused, onPausedChange] = useState(false);
  const [quality, onQualityChange] = useState<QualityPreference>("AUTO");
  return <ExperienceUI state={state} fixture={fixture} paused={paused} onPausedChange={onPausedChange}
    quality={quality} onQualityChange={onQualityChange} visibleFishIds={["fish-0", "fish-1"]}
    hoveredId={null} dispatch={dispatch} audio={{ enabled: false, error: null, enable: vi.fn(), disable: vi.fn() }}
    onEntryIntent={() => dispatch({ type: "ENTER" })} onMapHighlight={vi.fn()} />;
}
const disclaimer = "Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.";

describe("ExperienceUI", () => {
  it("gates entry but makes the same study and source label available before graphics readiness", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Enter Water" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Experience preview" }));
    const dialog = screen.getByRole("dialog", { name: "Experience preview" });
    expect(within(dialog).getByText("Markings & model")).toBeVisible();
    expect(within(dialog).getByText(fixture.label)).toBeVisible();
    expect(within(dialog).getByText(disclaimer)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Made with Natural Earth" })).toHaveAttribute("href", "https://www.naturalearthdata.com/");
    expect(within(dialog).getByRole("link", { name: "Public domain license" })).toHaveAttribute("href", "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/LICENSE.md");
    expect(within(dialog).getByText("1:10 million (not ten-metre survey accuracy)")).toBeVisible();
    expect(within(dialog).getByText(/Vector version: ca96624/)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Relief source · version 2.0.0" })).toHaveAttribute("href", expect.stringContaining("SR_50M.zip"));
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(screen.getByRole("button", { name: "Experience preview" })).toHaveFocus();
  });
  it("enters through the coordinator, changes quality and preserves pause pressed semantics", () => {
    render(<Harness initial={{ phase: "map", ready: true, selectedId: null }} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Quality" }), { target: { value: "LOW" } });
    expect(screen.getByRole("combobox", { name: "Quality" })).toHaveValue("LOW");
    fireEvent.click(screen.getByRole("button", { name: "Pause", pressed: false }));
    expect(screen.getByRole("button", { name: "Resume", pressed: true })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Enter Water" }));
    expect(screen.getByText("Entering the water…")).toBeVisible();
  });
  it("selects a stationary fish, traps story focus, releases with Back, and returns to map", () => {
    render(<Harness initial={{ phase: "exploring", ready: true, selectedId: null }} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Select fish" }), { target: { value: "fish-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Follow fish" }));
    const explore = screen.getByRole("button", { name: "Explore Species" });
    explore.focus();
    fireEvent.click(explore);
    const dialog = screen.getByRole("dialog", { name: "Polar parrot — reference study" });
    const back = within(dialog).getByRole("button", { name: "Back to Water" });
    expect(back).toHaveFocus();
    const last = within(dialog).getByRole("link", { name: "Relief source · version 2.0.0" });
    last.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(back).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(explore).toHaveFocus();
    fireEvent.click(explore);
    fireEvent.click(screen.getByRole("button", { name: "Back to Water" }));
    expect(screen.getByRole("button", { name: "Follow fish" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Explore Species" })).not.toBeInTheDocument();
    const map = screen.getByRole("button", { name: "Return to Map" });
    map.focus(); fireEvent.click(map);
    expect(screen.getByRole("button", { name: "Enter Water" })).toHaveFocus();
  });
  it("returns to the preview control if graphics recovery leaves Enter disabled", () => {
    render(<Harness initial={{ phase: "following", ready: false, selectedId: "fish-0" }} />);
    const map = screen.getByRole("button", { name: "Return to Map" });
    map.focus(); fireEvent.click(map);
    expect(screen.getByRole("button", { name: "Enter Water" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Experience preview" })).toHaveFocus();
  });
  it("activates sound only on click and exposes a polite nonblocking rejection", () => {
    const enable = vi.fn(), disable = vi.fn();
    const base = {
      state: { phase: "map" as const, ready: false, selectedId: null }, fixture, paused: false,
      onPausedChange: vi.fn(), quality: "AUTO" as const, onQualityChange: vi.fn(),
      visibleFishIds: ["fish-0"], hoveredId: null, dispatch: vi.fn(),
      onEntryIntent: vi.fn(), onMapHighlight: vi.fn(),
    };
    const { rerender } = render(<ExperienceUI {...base} audio={{ enabled: false, error: null, enable, disable }} />);
    expect(enable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sound on", pressed: false }));
    expect(enable).toHaveBeenCalledOnce();
    rerender(<ExperienceUI {...base} audio={{ enabled: true, error: "Sound is unavailable.", enable, disable }} />);
    expect(screen.getByText("Sound is unavailable.")).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByRole("button", { name: "Sound off", pressed: true }));
    expect(disable).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Experience preview" })).toBeEnabled();
  });
  it("Escape releases follow without duplicate camera ownership", () => {
    render(<Harness initial={{ phase: "following", ready: true, selectedId: "fish-0" }} />);
    screen.getByRole("button", { name: "Explore Species" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Explore Species" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow fish" })).toHaveFocus();
  });
});
