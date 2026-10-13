"use client";

import { useEffect, useRef, useState } from "react";
import type { AudioControls, ExperienceAudioProps } from "@/experience/contracts";

type Session = { context: AudioContext; sources: AudioBufferSourceNode[]; filters: BiquadFilterNode[]; gains: GainNode[] };
const ERROR = "Sound is unavailable. You can still explore; switch sound off and on to retry.";
function mute(session: Session) { session.gains.forEach(gain => { gain.gain.value = 0; }); }
function dispose(session: Session) {
  mute(session);
  session.sources.forEach(source => {
    // Construction can fail before start(); stop then throws InvalidStateError.
    try { source.stop(); } catch {}
    source.disconnect();
  });
  session.filters.forEach(filter => filter.disconnect());
  session.gains.forEach(gain => gain.disconnect());
  void session.context.close().catch(() => {});
}

export function useExperienceAudio({ paused, runtime }: ExperienceAudioProps): AudioControls {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Session | null>(null);
  function resume(active: Session) {
    void active.context.resume().catch(() => { if (session.current === active) setError(ERROR); });
  }
  function enable() {
    if (session.current) return;
    setEnabled(true);
    setError(null);
    let active: Session | null = null;
    try {
      active = { context: new AudioContext(), sources: [], filters: [], gains: [] };
      session.current = active;
      // Invoke within the explicit click, before any asynchronous work loses activation.
      resume(active);
      for (const [type, frequency, duration] of [["highpass", 1200, 2.7], ["lowpass", 350, 4.1]] as const) {
        const buffer = active.context.createBuffer(1, Math.round(active.context.sampleRate * duration), active.context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        const source = active.context.createBufferSource();
        active.sources.push(source);
        const filter = active.context.createBiquadFilter();
        active.filters.push(filter);
        const gain = active.context.createGain();
        active.gains.push(gain);
        source.buffer = buffer; source.loop = true;
        filter.type = type; filter.frequency.value = frequency;
        gain.gain.value = 0;
        source.connect(filter); filter.connect(gain); gain.connect(active.context.destination);
        source.start(0, Math.random() * duration);
      }
      if (paused || document.hidden) void active.context.suspend().catch(() => {});
    } catch {
      session.current = null;
      if (active) dispose(active);
      setError(ERROR);
    }
  }
  function disable() {
    const active = session.current;
    session.current = null;
    if (active) dispose(active);
    setEnabled(false);
    setError(null);
  }
  useEffect(() => {
    function synchronize() {
      const active = session.current;
      if (!active) return;
      if (paused || document.hidden) {
        mute(active);
        void active.context.suspend().catch(() => {});
      } else resume(active);
    }
    synchronize();
    document.addEventListener("visibilitychange", synchronize);
    return () => document.removeEventListener("visibilitychange", synchronize);
  }, [paused]);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    function update() {
      const active = session.current;
      if (active) {
        const progress = runtime.current.entryProgress;
        const blend = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
        const volume = paused || document.hidden ? 0 : 0.12;
        active.gains[0].gain.value = volume * (1 - blend);
        active.gains[1].gain.value = volume * blend;
      }
      frame = requestAnimationFrame(update);
    }
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [enabled, paused, runtime]);
  useEffect(() => () => {
    const active = session.current;
    session.current = null;
    if (active) dispose(active);
  }, []);
  return { enabled, error, enable, disable };
}
