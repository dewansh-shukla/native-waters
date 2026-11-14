import type { EffectiveQuality, QualityPreference } from "./contracts";

const FISH_IDS = Array.from({ length: 13 }, (_, i) => `fish-${i}`);
// LOW keeps exactly six fish from the default Cauvery fixture: one of each of
// three danio morphs plus the three Arulius. The polar parrot study stays a
// HIGH-only reference fixture. River profiles pass their own fish IDs so LOW
// never drops a river's entire roster.
const LOW_FISH_IDS = ["fish-5", "fish-7", "fish-8", "fish-10", "fish-11", "fish-12"];
const LOW_BUDGET = LOW_FISH_IDS.length;

function lowBudget(ids: readonly string[]): string[] {
  if (FISH_IDS.every((id) => ids.includes(id))) {
    return ids.filter((id) => LOW_FISH_IDS.includes(id));
  }
  if (ids.length <= LOW_BUDGET) return [...ids];
  return Array.from({ length: LOW_BUDGET }, (_, i) =>
    ids[Math.round((i * (ids.length - 1)) / (LOW_BUDGET - 1))],
  );
}

export function resolveQuality(preference: QualityPreference, coarsePointer: boolean, smallScreen: boolean): EffectiveQuality {
  return preference === "AUTO" ? (coarsePointer || smallScreen ? "LOW" : "HIGH") : preference;
}

export function visibleFishIds(
  quality: EffectiveQuality,
  selectedId: string | null,
  availableIds?: readonly string[],
): string[] {
  const all = availableIds && availableIds.length > 0 ? Array.from(new Set(availableIds)) : [...FISH_IDS];
  const ids = quality === "LOW" ? lowBudget(all) : [...all];
  if (selectedId !== null && all.includes(selectedId) && !ids.includes(selectedId)) {
    ids[ids.length - 1] = selectedId;
  }
  return ids;
}
