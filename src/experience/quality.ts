import type { EffectiveQuality, QualityPreference } from "./contracts";

const FISH_IDS = Array.from({ length: 13 }, (_, i) => `fish-${i}`);

export function resolveQuality(preference: QualityPreference, coarsePointer: boolean, smallScreen: boolean): EffectiveQuality {
  return preference === "AUTO" ? (coarsePointer || smallScreen ? "LOW" : "HIGH") : preference;
}

export function visibleFishIds(quality: EffectiveQuality, selectedId: string | null): string[] {
  const ids = FISH_IDS.slice(0, quality === "LOW" ? 6 : FISH_IDS.length);
  if (selectedId !== null && FISH_IDS.includes(selectedId) && !ids.includes(selectedId)) {
    ids[ids.length - 1] = selectedId;
  }
  return ids;
}
