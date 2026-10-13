import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExperienceAudioProps } from "@/experience/contracts";
import { useExperienceAudio } from "./useExperienceAudio";

class NodeBoundary {
  gain = { value: 0 };
  frequency = { value: 0 };
  type = "";
  buffer: AudioBuffer | null = null;
  loop = false;
  connect = vi.fn(); disconnect = vi.fn(); start = vi.fn(); stop = vi.fn();
}
class AudioBoundary {
  static instances: AudioBoundary[] = [];
  static rejectResume = false;
  static failFilter = false;
  sampleRate = 100;
  destination = new NodeBoundary();
  gains: NodeBoundary[] = []; filters: NodeBoundary[] = []; sources: NodeBoundary[] = [];
  resume = vi.fn(() => AudioBoundary.rejectResume ? Promise.reject(new Error("blocked")) : Promise.resolve());
  suspend = vi.fn(() => Promise.resolve()); close = vi.fn(() => Promise.resolve());
  constructor() { AudioBoundary.instances.push(this); }
  createBuffer(_channels: number, length: number, sampleRate: number) { const samples = new Float32Array(length); return { duration: length / sampleRate, getChannelData: () => samples }; }
  createBufferSource() { const n = new NodeBoundary(); this.sources.push(n); return n; }
  createBiquadFilter() { if (AudioBoundary.failFilter) throw new Error("audio unavailable"); const n = new NodeBoundary(); this.filters.push(n); return n; }
  createGain() { const n = new NodeBoundary(); this.gains.push(n); return n; }
}
const props = (): ExperienceAudioProps => ({ phase: "map", paused: false, runtime: { current: { time: 0, entryProgress: 0, fish: [] } } });
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
function tick() { const callbacks = [...frames.values()]; frames.clear(); act(() => callbacks.forEach(cb => cb(0))); }
beforeEach(() => {
  AudioBoundary.instances = []; AudioBoundary.rejectResume = false; AudioBoundary.failFilter = false;
  frames = new Map(); nextFrame = 0;
  vi.stubGlobal("AudioContext", AudioBoundary);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++nextFrame, cb); return nextFrame; });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});
afterEach(() => vi.unstubAllGlobals());
describe("useExperienceAudio", () => {
  it("creates/resumes synchronously only on enable; filters and clamps runtime crossfade", async () => {
    const p = props();
    const { result, unmount } = renderHook(() => useExperienceAudio(p));
    expect(AudioBoundary.instances).toHaveLength(0);
    act(() => { result.current.enable(); expect(AudioBoundary.instances[0].resume).toHaveBeenCalledTimes(1); });
    const context = AudioBoundary.instances[0];
    expect(result.current.enabled).toBe(true);
    expect(context.filters.map(n => n.type)).toEqual(["highpass", "lowpass"]);
    expect(context.sources[0].buffer).not.toBe(context.sources[1].buffer);
    expect(context.sources.map(n => n.buffer?.duration)).toEqual([2.7, 4.1]);
    const offsets = context.sources.map(n => n.start.mock.calls[0][1]);
    expect(offsets[0]).not.toBe(offsets[1]);
    offsets.forEach((offset, index) => { expect(offset).toBeGreaterThanOrEqual(0); expect(offset).toBeLessThan(context.sources[index].buffer!.duration); });
    tick();
    expect(context.gains.map(n => n.gain.value)).toEqual([0.12, 0]);
    p.runtime.current.entryProgress = 0.5; tick();
    expect(context.gains.map(n => n.gain.value)).toEqual([0.06, 0.06]);
    p.runtime.current.entryProgress = 99; tick();
    expect(context.gains.map(n => n.gain.value)).toEqual([0, 0.12]);
    p.runtime.current.entryProgress = NaN; tick();
    expect(context.gains.every(n => Number.isFinite(n.gain.value))).toBe(true);
    unmount();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.sources.every(n => n.stop.mock.calls.length === 1 && n.disconnect.mock.calls.length === 1)).toBe(true);
    expect(context.filters.every(n => n.disconnect.mock.calls.length === 1)).toBe(true);
    expect(frames.size).toBe(0);
  });
  it("mutes and suspends on pause/visibility; disable closes and never resumes from visibility", async () => {
    const p = props();
    const { result, rerender } = renderHook((input: ExperienceAudioProps) => useExperienceAudio(input), { initialProps: p });
    act(() => result.current.enable()); tick();
    const context = AudioBoundary.instances[0];
    rerender({ ...p, paused: true });
    expect(context.gains.map(n => n.gain.value)).toEqual([0, 0]);
    expect(context.suspend).toHaveBeenCalled();
    rerender({ ...p, paused: false });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(context.gains.map(n => n.gain.value)).toEqual([0, 0]);
    act(() => result.current.disable());
    expect(result.current.enabled).toBe(false);
    expect(context.close).toHaveBeenCalledOnce();
    const resumes = context.resume.mock.calls.length;
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(context.resume).toHaveBeenCalledTimes(resumes);
  });
  it("cleans partially-created nodes when the browser audio boundary fails", () => {
    AudioBoundary.failFilter = true;
    const { result } = renderHook(() => useExperienceAudio(props()));
    act(() => result.current.enable());
    expect(result.current.error).toMatch(/unavailable/i);
    const context = AudioBoundary.instances[0];
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.sources[0].disconnect).toHaveBeenCalledOnce();
  });
  it("leaves opt-in enabled with a quiet error after resume rejection and ignores stale rejection", async () => {
    AudioBoundary.rejectResume = true;
    const { result } = renderHook(() => useExperienceAudio(props()));
    await act(async () => result.current.enable());
    expect(result.current.enabled).toBe(true);
    expect(result.current.error).toMatch(/unavailable/i);
    act(() => result.current.disable());
    await act(async () => { result.current.enable(); result.current.disable(); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
