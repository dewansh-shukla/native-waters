import { describe, expect, it } from "vitest";
import { resolveQuality, visibleFishIds } from "./quality";

describe("quality policy", () => {
  it.each([
    [false, false, "HIGH"], [true, false, "LOW"],
    [false, true, "LOW"], [true, true, "LOW"],
  ] as const)("AUTO for coarse=%s small=%s resolves %s", (coarse, small, expected) => {
    expect(resolveQuality("AUTO", coarse, small)).toBe(expected);
    expect(resolveQuality("HIGH", coarse, small)).toBe("HIGH");
    expect(resolveQuality("LOW", coarse, small)).toBe("LOW");
  });

  it("returns deterministic stable base IDs without sharing mutable arrays", () => {
    expect(visibleFishIds("LOW", null)).toEqual(["fish-0", "fish-1", "fish-2", "fish-3", "fish-4", "fish-5"]);
    expect(visibleFishIds("HIGH", null)).toEqual(Array.from({ length: 13 }, (_, i) => `fish-${i}`));
    const ids = visibleFishIds("LOW", null);
    ids.pop();
    expect(visibleFishIds("LOW", null)).toHaveLength(6);
  });

  it.each(Array.from({ length: 13 }, (_, i) => `fish-${i}`))("retains %s within either quality budget", (id) => {
    for (const quality of ["LOW", "HIGH"] as const) {
      const ids = visibleFishIds(quality, id);
      expect(ids).toContain(id);
      expect(ids).toHaveLength(quality === "LOW" ? 6 : 13);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("replaces only the final low slot for fish-9 and ignores invalid selection", () => {
    expect(visibleFishIds("LOW", "fish-9")).toEqual(["fish-0", "fish-1", "fish-2", "fish-3", "fish-4", "fish-9"]);
    expect(visibleFishIds("LOW", "fish-13")).toEqual(visibleFishIds("LOW", null));
  });
});