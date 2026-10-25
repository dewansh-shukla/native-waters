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
import { resolveSpecies } from "@/experience/species";
import type { QualityPreference, SceneRuntime } from "@/experience/contracts";
import type { PipelineFixture } from "@/types/fixture";

const SceneViewport = dynamic(() => import("@/components/scene/SceneViewport"), {
  ssr: false,
  loading: () => <p className="scene-loading" role="status">Loading the river scene…</p>,
});

export default function Experience({ fixture, additionalModelUrls, species: speciesProp }: { fixture: PipelineFixture; additionalModelUrls?: string[]; species?: { modelUrl: string; fishIds: string[]; label?: string }[] }) {
  const species = resolveSpecies(speciesProp, additionalModelUrls);
  const speciesLabels = Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.label ?? "Fish"])));
  const [state, dispatch] = useReducer(journeyReducer, INITIAL_JOURNEY);
  const [initialRuntime] = useState<SceneRuntime>(() => ({ time: 0, entryProgress: 0, fish: createSchool(), cursorTarget: null }));
  const runtime = useRef(initialRuntime);
  const reducedMotion = useReducedMotion();
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const paused = pauseOverride ?? reducedMotion;
  const [hidden, setHidden] = useState(false);
  const [quality, setQuality] = useState<QualityPreference>("AUTO");
  const [conservative, setConservative] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapHighlighted, setMapHighlighted] = useState(false);
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
  const effectiveQuality = resolveQuality(quality, conservative, conservative);
  const visibleIds = useMemo(() => visibleFishIds(effectiveQuality, state.selectedId), [effectiveQuality, state.selectedId]);
  const audio = useExperienceAudio({ phase: state.phase, paused: paused || hidden, runtime });
  const onReady = useCallback((ready: boolean) => dispatch({ type: "READY", ready }), []);
  const onEntered = useCallback(() => dispatch({ type: "ENTERED" }), []);
  const onSelect = useCallback((id: string) => dispatch({ type: "SELECT", id }), []);
  const onEnter = useCallback(() => dispatch({ type: "ENTER" }), []);

  return <section className="experience" aria-label="Native Waters experience" data-phase={state.phase}>
    <SceneBoundary onRetry={() => window.location.reload()} retryLabel="Reload page">
      <SceneViewport modelUrl={fixture.modelUrl} additionalModelUrls={additionalModelUrls} species={species.map(s => ({ modelUrl: s.modelUrl, fishIds: s.fishIds }))} state={state} runtime={runtime} paused={paused || hidden}
        reducedMotion={reducedMotion} quality={effectiveQuality} visibleIds={visibleIds}
        mapHighlighted={mapHighlighted} onMapHighlight={setMapHighlighted} onReady={onReady}
        onEntered={onEntered} onSelect={onSelect} onHover={setHoveredId} onEnter={onEnter} />
    </SceneBoundary>
    {state.phase === "map" && <p className="experience-map-disclaimer">Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.</p>}
    <ExperienceUI state={state} fixture={fixture} paused={paused} onPausedChange={setPauseOverride}
      quality={quality} onQualityChange={setQuality} visibleFishIds={visibleIds} hoveredId={hoveredId}
      dispatch={dispatch} audio={audio} onEntryIntent={onEnter} onMapHighlight={setMapHighlighted}
      secondarySpeciesLabel="Zebra Danio - Danio rerio" speciesLabels={speciesLabels} />
  </section>;
}
