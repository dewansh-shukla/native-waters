import type { EffectiveQuality, QualityPreference } from "./contracts";

const FISH_IDS = Array.from({ length: 13 }, (_, i) => `fish-${i}`);
// LOW keeps exactly six native fish: one of each of three danio morphs plus the
// three Arulius. The polar parrot study stays a HIGH-only reference fixture.
const LOW_FISH_IDS = ["fish-5", "fish-7", "fish-8", "fish-10", "fish-11", "fish-12"];

export function resolveQuality(preference: QualityPreference, coarsePointer: boolean, smallScreen: boolean): EffectiveQuality {
  return preference === "AUTO" ? (coarsePointer || smallScreen ? "LOW" : "HIGH") : preference;
}

export function visibleFishIds(quality: EffectiveQuality, selectedId: string | null): string[] {
  const ids = quality === "LOW" ? [...LOW_FISH_IDS] : [...FISH_IDS];
  if (selectedId !== null && FISH_IDS.includes(selectedId) && !ids.includes(selectedId)) {
    ids[ids.length - 1] = selectedId;
  }
  return ids;
}
