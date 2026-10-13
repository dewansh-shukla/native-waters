import { describe, expect, it, vi } from "vitest";
import { CameraInput } from "./camera";
import { bindCanvasInput } from "./input";

function pointer(canvas: HTMLCanvasElement, type: string, x: number, y: number, pointerType = "touch") {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType }, isPrimary: { value: true } });
  canvas.dispatchEvent(event);
  return event;
}
function setup() {
  const canvas = document.createElement("canvas"); document.body.append(canvas);
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 800 } as DOMRect);
  const input = new CameraInput(); let enabled = true;
  const cleanup = bindCanvasInput(canvas, () => input, () => enabled);
  return { canvas, input, cleanup, pause: () => { enabled = false; } };
}
describe("canvas-only input binding", () => {
  it("leaves taps selectable but suppresses a click after thresholded touch swipe", () => {
    const { canvas, input, cleanup } = setup(); const select = vi.fn(); canvas.addEventListener("click", select);
    pointer(canvas, "pointerdown", 10, 10); pointer(canvas, "pointermove", 13, 12); pointer(canvas, "pointerup", 13, 12);
    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true })); expect(select).toHaveBeenCalledTimes(1);
    pointer(canvas, "pointerdown", 10, 10); expect(pointer(canvas, "pointermove", 10, 100).defaultPrevented).toBe(true); pointer(canvas, "pointerup", 10, 100);
    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true })); expect(select).toHaveBeenCalledTimes(1); expect(input.travel).toBeGreaterThan(0);
    cleanup(); canvas.remove();
  });
  it("ignores DOM overlay scroll, paused gestures, and removes all listeners/style", () => {
    const { canvas, input, pause, cleanup } = setup();
    const overlay = document.createElement("button"); document.body.append(overlay);
    overlay.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 200 })); expect(input.travel).toBe(0);
    const wheel = new WheelEvent("wheel", { cancelable: true, deltaY: 200 }); canvas.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true); expect(input.travel).toBeCloseTo(0.6);
    pause(); canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: 200 })); expect(input.travel).toBeCloseTo(0.6);
    pointer(canvas, "pointerdown", 0, 0); pointer(canvas, "pointermove", 100, 100); pointer(canvas, "pointerup", 100, 100); expect(input.lateral).toBe(0);
    cleanup(); expect(canvas.style.touchAction).toBe("");
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: -200 })); expect(input.travel).toBeCloseTo(0.6);
    canvas.remove(); overlay.remove();
  });
});
