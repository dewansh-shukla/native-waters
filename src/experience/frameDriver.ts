import type { SceneRuntime, Phase } from "./contracts";
import { stepSchool } from "@/components/scene/fish/school";

export function advanceScene(runtime: SceneRuntime, delta: number, phase: Phase, paused: boolean, hidden: boolean) {
  if (paused || hidden || phase === "map" || !Number.isFinite(delta) || delta <= 0) return;
  const step = Math.min(delta, .05);
  runtime.time += step;
  stepSchool(runtime.fish, step, runtime.time);
}
