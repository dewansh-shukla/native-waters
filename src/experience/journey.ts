import type { JourneyEvent, JourneyState } from "./contracts";

export const INITIAL_JOURNEY: JourneyState = { phase: "map", ready: false, selectedId: null };

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case "READY":
      return { ...state, ready: event.ready };
    case "ENTER":
      if (state.phase === "map" && state.ready) return { ...state, phase: "entering", selectedId: null };
      break;
    case "ENTERED":
      if (state.phase === "entering" && state.ready) return { ...state, phase: "exploring" };
      break;
    case "SELECT":
      if ((state.phase === "exploring" || state.phase === "following") && /^fish-(0|[1-9][0-9]*)$/.test(event.id)) {
        return { ...state, phase: "following", selectedId: event.id };
      }
      break;
    case "STORY":
      if (state.phase === "following" && state.selectedId !== null) return { ...state, phase: "story" };
      break;
    case "ESCAPE":
      if (state.phase === "story") return { ...state, phase: "following" };
      if (state.phase === "following") return { ...state, phase: "exploring", selectedId: null };
      break;
    case "BACK":
      if (state.phase === "following" || state.phase === "story") return { ...state, phase: "exploring", selectedId: null };
      break;
    case "MAP":
      return { ...state, phase: "map", selectedId: null };
  }
  return state;
}
