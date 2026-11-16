"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { useReducedMotion } from "@/components/controls/useReducedMotion";
import { ExperienceUI } from "@/components/experience-ui/ExperienceUI";
import { useExperienceAudio } from "@/components/experience-ui/useExperienceAudio";
import { createSchool } from "@/components/scene/fish/school";
import { INITIAL_JOURNEY, journeyReducer } from "@/experience/journey";
import { resolveQuality, visibleFishIds } from "@/experience/quality";
import { resolveSpecies, lodSpecies } from "@/experience/species";
import { riverAnchor } from "@/experience/geography";
import { resolveRiverProfile, RIVER_PROFILES, createWaterOptics } from "@/experience/riverProfiles";
import type { QualityPreference, SceneRuntime } from "@/experience/contracts";
import type { PipelineFixture } from "@/types/fixture";
import "./experience.css";

const SceneViewport = dynamic(() => import("@/components/scene/SceneViewport"), {
  ssr: false,
  loading: () => <p className="scene-loading" role="status">Loading the river scene…</p>,
});

export default function Experience({ fixture, additionalModelUrls, species: speciesProp, river }: { fixture: PipelineFixture; additionalModelUrls?: string[]; species?: { modelUrl: string; fishIds: string[]; label?: string }[]; river?: string }) {
  const [mapRiver, setMapRiver] = useState(() => RIVER_PROFILES[(river ?? "").toLowerCase()]?.name ?? "Cauvery");
  const [hoveredRiver, setHoveredRiver] = useState<string | null>(null);
  const resolvedRiver = mapRiver.toLowerCase();
  const profile = useMemo(() => resolveRiverProfile(resolvedRiver), [resolvedRiver]);
  const speciesInput = speciesProp ?? profile.fish;
  const species = useMemo(() => resolveSpecies(speciesInput as never, additionalModelUrls), [speciesInput, additionalModelUrls]);
  const water = useMemo(() => createWaterOptics(profile.water), [profile]);
  const habitat = profile.habitat;
  const speciesLabels = useMemo(() => Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.label ?? "Fish"]))), [species]);
  const speciesStudy = useMemo(() => Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.study]).filter(([, v]) => v))), [species]);
  const [state, dispatch] = useReducer(journeyReducer, INITIAL_JOURNEY);
  const [initialRuntime] = useState<SceneRuntime>(() => ({ time: 0, entryProgress: 0, fish: createSchool(), cursorTarget: null }));
  const runtime = useRef(initialRuntime);
  const reducedMotion = useReducedMotion();
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const paused = pauseOverride ?? reducedMotion;
  const [hidden, setHidden] = useState(false);
  const [quality, setQuality] = useState<QualityPreference>("AUTO");
  const [conservative, setConservative] = useState(true);
  const [batterySaver, setBatterySaver] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapHighlighted, setMapHighlighted] = useState(false);
  const anchor = useMemo(() => riverAnchor(mapRiver), [mapRiver]);
  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse)"), small = matchMedia("(max-width: 700px)");
    const update = () => setConservative(coarse.matches || small.matches);
    const visibility = () => setHidden(document.hidden);
    update(); visibility();
    coarse.addEventListener("change", update); small.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      coarse.removeEventListener("change", update); small.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const effectiveQuality = batterySaver ? "LOW" : resolveQuality(quality, conservative, conservative);
  const availableFishIds = useMemo(() => species.flatMap(s => s.fishIds), [species]);
  const visibleIds = useMemo(() => visibleFishIds(effectiveQuality, state.selectedId, availableFishIds), [effectiveQuality, state.selectedId, availableFishIds]);
  // A reduced roster must not fetch models that own no visible fish.
  const shownSpecies = useMemo(() => {
    const mapped = lodSpecies(species, effectiveQuality);
    if (effectiveQuality === "HIGH") return mapped;
    const visible = new Set(visibleIds);
    return mapped.filter(entry => entry.fishIds.some(id => visible.has(id)));
  }, [species, effectiveQuality, visibleIds]);
  const speciesModelUrls = useMemo(() => Object.fromEntries(shownSpecies.flatMap(s => s.fishIds.map(id => [id, s.modelUrl]))), [shownSpecies]);
  const audio = useExperienceAudio({ phase: state.phase, paused: paused || hidden, runtime });
  const onReady = useCallback((ready: boolean) => dispatch({ type: "READY", ready }), []);
  const onEntered = useCallback(() => dispatch({ type: "ENTERED" }), []);
  const onSelect = useCallback((id: string) => dispatch({ type: "SELECT", id }), []);
  const onEnter = useCallback((r?: string) => {
    if (r) setMapRiver(r);
    dispatch({ type: "ENTER" });
  }, []);

  return <section className="experience" aria-label="Native Waters experience" data-phase={state.phase}>
    <SceneBoundary onRetry={() => window.location.reload()} retryLabel="Reload page">
      <SceneViewport modelUrl={fixture.modelUrl} additionalModelUrls={additionalModelUrls} species={shownSpecies.map(s => ({ modelUrl: s.modelUrl, fishIds: s.fishIds }))} entryAnchor={anchor} highlightedRiver={hoveredRiver ?? mapRiver} onRiverHover={setHoveredRiver} onRiverChange={setMapRiver} state={state} runtime={runtime} paused={paused || hidden || state.phase === "story"}
        reducedMotion={reducedMotion} quality={effectiveQuality} visibleIds={visibleIds}
        mapHighlighted={mapHighlighted} onMapHighlight={setMapHighlighted} onReady={onReady}
        onEntered={onEntered} onSelect={onSelect} onHover={setHoveredId} onEnter={onEnter}
        water={water} habitat={habitat} river={resolvedRiver} />
    </SceneBoundary>
    {state.phase === "map" && <p className="experience-map-disclaimer">An illustrative underwater exhibit, not a surveyed habitat. For documented fish occurrences, read the sourced basin records.</p>}
    <ExperienceUI state={state} fixture={fixture} paused={paused} onPausedChange={setPauseOverride}
      quality={quality} onQualityChange={setQuality} batterySaver={batterySaver} onBatterySaverChange={setBatterySaver} visibleFishIds={visibleIds} hoveredId={hoveredId}
      dispatch={dispatch} audio={audio} onEntryIntent={onEnter} onMapHighlight={setMapHighlighted}
      secondarySpeciesLabel="Zebra Danio - Danio rerio" speciesLabels={speciesLabels} speciesStudy={speciesStudy} speciesModelUrls={speciesModelUrls} selectedRiver={mapRiver} onRiverChange={setMapRiver} onRiverHover={setHoveredRiver} />
  </section>;
}
