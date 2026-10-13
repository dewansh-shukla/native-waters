import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

function Preference() {
  const paused = useReducedMotion();
  return <output aria-label="Motion preference">{paused ? "paused" : "running"}</output>;
}

function browserPreference(initiallyReduced: boolean) {
  const events = new EventTarget();
  const listeners = new Set<EventListenerOrEventListenerObject>();
  const preference: MediaQueryList = {
    matches: initiallyReduced,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
      if (type === "change" && listener) listeners.add(listener);
      events.addEventListener(type, listener);
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
      if (type === "change" && listener) listeners.delete(listener);
      events.removeEventListener(type, listener);
    },
    dispatchEvent: (event) => events.dispatchEvent(event),
    addListener: (listener) => preference.addEventListener("change", listener as EventListener),
    removeListener: (listener) => preference.removeEventListener("change", listener as EventListener),
  };
  vi.stubGlobal("matchMedia", (query: string) => {
    if (query !== preference.media) throw new Error(`Unexpected media query: ${query}`);
    return preference;
  });
  return {
    listeners,
    change(matches: boolean) {
      Object.defineProperty(preference, "matches", { value: matches, configurable: true });
      const event = new Event("change");
      Object.assign(event, { matches, media: preference.media });
      preference.dispatchEvent(event);
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("useReducedMotion", () => {
  it("renders safely paused before effects even for a non-reduced preference", () => {
    browserPreference(false);
    expect(renderToString(<Preference />)).toContain(">paused</output>");
  });

  it("remains paused when the browser prefers reduced motion", () => {
    browserPreference(true);
    render(<Preference />);
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("paused");
  });

  it("runs after mount when reduced motion is not preferred", () => {
    browserPreference(false);
    render(<Preference />);
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("running");
  });

  it("reflects preference changes in the rendered output and releases the listener", () => {
    const browser = browserPreference(false);
    const { unmount } = render(<Preference />);
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("running");
    expect(browser.listeners.size).toBe(1);
    act(() => browser.change(true));
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("paused");
    act(() => browser.change(false));
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("running");
    unmount();
    expect(browser.listeners.size).toBe(0);
  });

  it("stays safely paused when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Preference />);
    expect(screen.getByLabelText("Motion preference")).toHaveTextContent("paused");
  });
});
