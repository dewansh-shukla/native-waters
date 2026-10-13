import type { CameraInput } from "./camera";

/** No document/window listeners: DOM overlays retain their own scroll and pointer behavior. */
export function bindCanvasInput(canvas: HTMLCanvasElement, input: () => CameraInput, enabled: () => boolean): () => void {
  let pointerId: number | null = null;
  let suppressClick = false;
  const oldTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none";
  const down = (event: PointerEvent) => {
    if (!enabled() || event.isPrimary === false || event.button !== 0 || pointerId !== null) return;
    suppressClick = false;
    pointerId = event.pointerId;
    input().begin(event.clientX, event.clientY);
    canvas.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!enabled()) { input().end(); return; }
    const rect = canvas.getBoundingClientRect();
    if (pointerId === event.pointerId) {
      if (input().drag(event.clientX, event.clientY, rect.width, rect.height)) {
        suppressClick = true;
        event.preventDefault(); event.stopPropagation();
      }
    } else if (pointerId === null && event.pointerType === "mouse") {
      input().pointer(event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    }
  };
  const up = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;
    suppressClick = input().end() || suppressClick;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointerId = null;
  };
  const click = (event: MouseEvent) => {
    if (!suppressClick) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
  };
  const leave = () => { input().lookX = 0; input().lookY = 0; };
  const wheel = (event: WheelEvent) => {
    if (!enabled() || event.ctrlKey) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.getBoundingClientRect().height : 1);
    input().wheel(delta); event.preventDefault();
  };
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, { capture: true, passive: false });
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", up, true);
  canvas.addEventListener("lostpointercapture", up, true);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("click", click, true);
  canvas.addEventListener("wheel", wheel, { passive: false });
  return () => {
    if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    input().end();
    canvas.style.touchAction = oldTouchAction;
    canvas.removeEventListener("pointerdown", down, true);
    canvas.removeEventListener("pointermove", move, true);
    canvas.removeEventListener("pointerup", up, true);
    canvas.removeEventListener("pointercancel", up, true);
    canvas.removeEventListener("lostpointercapture", up, true);
    canvas.removeEventListener("pointerleave", leave);
    canvas.removeEventListener("click", click, true);
    canvas.removeEventListener("wheel", wheel);
  };
}
