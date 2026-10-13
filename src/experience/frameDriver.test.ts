import { expect, test } from "vitest";
import { advanceScene } from "./frameDriver";
import { createSchool } from "@/components/scene/fish/school";

test("one bounded shared step, no hidden/paused/map catch-up or school reset", () => {
  const runtime = { time: 0, entryProgress: 0, fish: createSchool() };
  const fish = runtime.fish, position = fish[0].position.clone();
  for (const [phase, paused, hidden] of [["map", false, false], ["exploring", true, false], ["entering", false, true]] as const)
    advanceScene(runtime, 10, phase, paused, hidden);
  expect(runtime.time).toBe(0); expect(fish[0].position.equals(position)).toBe(true);
  advanceScene(runtime, 10, "entering", false, false);
  expect(runtime.time).toBe(.05); expect(runtime.fish).toBe(fish);
  expect(fish[0].position.distanceTo(position)).toBeLessThanOrEqual(.031);
  advanceScene(runtime, NaN, "exploring", false, false);
  expect(runtime.time).toBe(.05);
});
