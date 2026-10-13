import { describe, expect, it } from "vitest";
import type { JourneyEvent, JourneyState, Phase } from "./contracts";
import { INITIAL_JOURNEY, journeyReducer } from "./journey";

const exploring: JourneyState = { phase: "exploring", ready: true, selectedId: null };
const following: JourneyState = { phase: "following", ready: true, selectedId: "fish-9" };
const story: JourneyState = { ...following, phase: "story" };

describe("journeyReducer", () => {
  it("gates entry until ready and completes entry once", () => {
    expect(INITIAL_JOURNEY).toEqual({ phase: "map", ready: false, selectedId: null });
    expect(journeyReducer(INITIAL_JOURNEY, { type: "ENTER" })).toBe(INITIAL_JOURNEY);
    const ready = journeyReducer(INITIAL_JOURNEY, { type: "READY", ready: true });
    const entering = journeyReducer(ready, { type: "ENTER" });
    expect(entering).toEqual({ phase: "entering", ready: true, selectedId: null });
    expect(journeyReducer(entering, { type: "ENTER" })).toBe(entering);
    expect(journeyReducer(entering, { type: "ENTERED" })).toEqual(exploring);
    expect(journeyReducer(exploring, { type: "ENTERED" })).toBe(exploring);
  });

  it.each(Array.from({ length: 10 }, (_, i) => `fish-${i}`))("follows stable identity %s", (id) => {
    expect(journeyReducer(exploring, { type: "SELECT", id })).toEqual({ ...following, selectedId: id });
  });

  it.each(["fish-10", "fish--1", "fish-01", "fish-1\n", "fish-1-extra", "", "other"])("ignores invalid identity %j", (id) => {
    expect(journeyReducer(exploring, { type: "SELECT", id })).toBe(exploring);
    expect(journeyReducer(following, { type: "SELECT", id })).toBe(following);
  });

  it("allows retargeting while following but story requires a selection", () => {
    expect(journeyReducer(following, { type: "SELECT", id: "fish-0" }).selectedId).toBe("fish-0");
    expect(journeyReducer(following, { type: "STORY" })).toEqual(story);
    const noSelection: JourneyState = { ...following, selectedId: null };
    expect(journeyReducer(noSelection, { type: "STORY" })).toBe(noSelection);
    expect(journeyReducer(exploring, { type: "STORY" })).toBe(exploring);
  });

  it.each([following, story])("BACK clears selection from $phase", (state) => {
    expect(journeyReducer(state, { type: "BACK" })).toEqual(exploring);
  });

  it("ESCAPE closes story first, then releases follow", () => {
    expect(journeyReducer(story, { type: "ESCAPE" })).toEqual(following);
    expect(journeyReducer(following, { type: "ESCAPE" })).toEqual(exploring);
  });

  it.each<Phase>(["map", "entering", "exploring", "following", "story"])("MAP clears selection from %s", (phase) => {
    expect(journeyReducer({ ...following, phase }, { type: "MAP" })).toEqual({ phase: "map", ready: true, selectedId: null });
  });

  it("retry invalidates readiness and gates re-entry", () => {
    const failed = journeyReducer(story, { type: "READY", ready: false });
    expect(failed).toEqual({ ...story, ready: false });
    const map = journeyReducer(failed, { type: "MAP" });
    expect(journeyReducer(map, { type: "ENTER" })).toBe(map);
    expect(journeyReducer({ phase: "entering", ready: false, selectedId: null }, { type: "ENTERED" }).phase).toBe("entering");
  });

  const illegal: [Phase, JourneyEvent][] = [
    ["map", { type: "ENTERED" }], ["map", { type: "SELECT", id: "fish-0" }],
    ["map", { type: "STORY" }], ["map", { type: "BACK" }], ["map", { type: "ESCAPE" }],
    ["entering", { type: "SELECT", id: "fish-0" }], ["entering", { type: "STORY" }],
    ["entering", { type: "BACK" }], ["entering", { type: "ESCAPE" }],
    ["exploring", { type: "ENTER" }], ["exploring", { type: "BACK" }], ["exploring", { type: "ESCAPE" }],
    ["following", { type: "ENTER" }], ["following", { type: "ENTERED" }],
    ["story", { type: "ENTER" }], ["story", { type: "ENTERED" }],
    ["story", { type: "STORY" }], ["story", { type: "SELECT", id: "fish-0" }],
  ];
  it.each(illegal)("ignores illegal event in %s: %j", (phase, event) => {
    const state: JourneyState = { ...following, phase };
    expect(journeyReducer(state, event)).toBe(state);
  });
});
