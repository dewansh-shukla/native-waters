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

const SceneViewport = dynamic(() => import("@/components/scene/SceneViewport"), {
  ssr: false,
  loading: () => <p className="scene-loading" role="status">Loading the river scene…</p>,
});

export default function Experience({ fixture, additionalModelUrls, species: speciesProp, river }: { fixture: PipelineFixture; additionalModelUrls?: string[]; species?: { modelUrl: string; fishIds: string[]; label?: string }[]; river?: string }) {
  const [mapRiver, setMapRiver] = useState(river ?? "Cauvery");
  const [hoveredRiver, setHoveredRiver] = useState<string | null>(null);
  const resolvedRiver = (RIVER_PROFILES[(river ?? "").toLowerCase()] ? (river ?? "").toLowerCase() : null)
    ?? (RIVER_PROFILES[(mapRiver ?? "").toLowerCase()] ? (mapRiver ?? "").toLowerCase() : null)
    ?? "cauvery";
  const profile = useMemo(() => resolveRiverProfile(resolvedRiver), [resolvedRiver]);
  const speciesInput = speciesProp ?? profile.fish;
  const species = useMemo(() => resolveSpecies(speciesInput as never, additionalModelUrls), [speciesInput, additionalModelUrls]);
  const water = useMemo(() => createWaterOptics(profile.water), [profile]);
  const habitat = profile.habitat;
  const speciesLabels = Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.label ?? "Fish"])));
  const speciesStudy = Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.study]).filter(([, v]) => v)));
  const speciesModelUrls = Object.fromEntries(species.flatMap(s => s.fishIds.map(id => [id, s.modelUrl])));
  const [state, dispatch] = useReducer(journeyReducer, INITIAL_JOURNEY);
  const [initialRuntime] = useState<SceneRuntime>(() => ({ time: 0, entryProgress: 0, fish: createSchool(), cursorTarget: null }));
  const runtime = useRef(initialRuntime);
  const reducedMotion = useReducedMotion();
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const paused = pauseOverride ?? reducedMotion;
  const [hidden, setHidden] = useState(false);
  // The water scene is authored wide: on a portrait phone it is dimmed and
  // paused behind a rotate prompt instead of being squeezed into a sliver.
  const [portrait, setPortrait] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
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
  useEffect(() => {
    const orientation = matchMedia("(orientation: portrait)");
    const coarse = matchMedia("(pointer: coarse)");
    const update = () => {
      setPortrait(orientation.matches);
      setCoarsePointer(coarse.matches);
    };
    update();
    orientation.addEventListener("change", update);
    coarse.addEventListener("change", update);
    return () => {
      orientation.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
    };
  }, []);
  const effectiveQuality = batterySaver ? "LOW" : resolveQuality(quality, conservative, conservative);
  const availableFishIds = useMemo(() => species.flatMap(s => s.fishIds), [species]);
  const visibleIds = useMemo(() => visibleFishIds(effectiveQuality, state.selectedId, availableFishIds), [effectiveQuality, state.selectedId, availableFishIds]);
  const inWater = state.phase === "exploring" || state.phase === "following" || state.phase === "story";
  const rotateNeeded = coarsePointer && portrait && inWater;
  // LOW keeps only the six native fish, so fixtures and unlisted variants must
  // not fetch their assets at all: filter to species that still own a visible fish.
  const shownSpecies = useMemo(() => {
    const mapped = lodSpecies(species, effectiveQuality);
    if (effectiveQuality === "HIGH") return mapped;
    const visible = new Set(visibleIds);
    return mapped.filter(entry => entry.fishIds.some(id => visible.has(id)));
  }, [species, effectiveQuality, visibleIds]);
  const audio = useExperienceAudio({ phase: state.phase, paused: paused || hidden || rotateNeeded, runtime });
  const onReady = useCallback((ready: boolean) => dispatch({ type: "READY", ready }), []);
  const onEntered = useCallback(() => dispatch({ type: "ENTERED" }), []);
  const onSelect = useCallback((id: string) => dispatch({ type: "SELECT", id }), []);
  const onEnter = useCallback((r?: string) => {
    if (r) setMapRiver(r);
    dispatch({ type: "ENTER" });
    // Best effort on touch devices: land in landscape fullscreen. iOS Safari
    // refuses fullscreen/orientation lock on non-video elements, which is why
    // the rotate prompt exists; every failure here is expected and silent.
    const surface = document.querySelector<HTMLElement>(".experience");
    if (matchMedia("(pointer: coarse)").matches && surface?.requestFullscreen) {
      surface.requestFullscreen().then(() => {
        try {
          // Not in the DOM typings: the standard is only implemented by Chrome-family
          // browsers and Android, and never for non-video elements on iOS.
          const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
          void orientation.lock?.("landscape").catch(() => {});
        } catch {
          /* orientation lock unsupported */
        }
      }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    // Returning to the map restores the normal page (and the reference below).
    if (state.phase !== "map" || !document.fullscreenElement) return;
    void document.exitFullscreen().catch(() => {});
  }, [state.phase]);

  return <section className="experience" aria-label="Native Waters experience" data-phase={state.phase} data-rotate={rotateNeeded ? "true" : undefined}>
    <SceneBoundary onRetry={() => window.location.reload()} retryLabel="Reload page">
      <SceneViewport modelUrl={fixture.modelUrl} additionalModelUrls={additionalModelUrls} species={shownSpecies.map(s => ({ modelUrl: s.modelUrl, fishIds: s.fishIds }))} entryAnchor={anchor} highlightedRiver={hoveredRiver ?? mapRiver} onRiverHover={setHoveredRiver} onRiverChange={setMapRiver} state={state} runtime={runtime} paused={paused || hidden || rotateNeeded}
        reducedMotion={reducedMotion} quality={effectiveQuality} visibleIds={visibleIds}
        mapHighlighted={mapHighlighted} onMapHighlight={setMapHighlighted} onReady={onReady}
        onEntered={onEntered} onSelect={onSelect} onHover={setHoveredId} onEnter={onEnter}
        water={water} habitat={habitat} river={resolvedRiver} />
    </SceneBoundary>
    {rotateNeeded && <div className="experience-rotate" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="3" width="8" height="18" rx="2" />
        <path d="M5 9a8 8 0 0 0 0 6" />
        <path d="m3.4 13.4 1.6 1.9 1.7-1.6" />
        <path d="M19 9a8 8 0 0 1 0 6" />
        <path d="m20.6 13.4-1.6 1.9-1.7-1.6" />
      </svg>
      <h2>Rotate for the water</h2>
      <p>Turn your device sideways to explore the river. The reference notes continue below the map.</p>
    </div>}
    {state.phase === "map" && <p className="experience-map-disclaimer">Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.</p>}
    <ExperienceUI state={state} fixture={fixture} paused={paused} onPausedChange={setPauseOverride}
      quality={quality} onQualityChange={setQuality} batterySaver={batterySaver} onBatterySaverChange={setBatterySaver} visibleFishIds={visibleIds} hoveredId={hoveredId}
      dispatch={dispatch} audio={audio} onEntryIntent={onEnter} onMapHighlight={setMapHighlighted}
      secondarySpeciesLabel="Zebra Danio - Danio rerio" speciesLabels={speciesLabels} speciesStudy={speciesStudy} speciesModelUrls={speciesModelUrls} selectedRiver={mapRiver} onRiverChange={setMapRiver} onRiverHover={setHoveredRiver} />
  </section>;
}
