"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import type { ExperienceUIProps, QualityPreference } from "@/experience/contracts";
import type { SpeciesStudy } from "@/experience/species";
import { SELECTABLE_RIVERS } from "@/experience/geography";
import provenance from "../../../content/maps/provenance.json";
import { basinReference, modelReference } from "@/experience/referenceLinks";

const DISCLAIMER = "Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.";

function Study({ fixture, study, river = "Cauvery", overview = false, modelUrl }: Pick<ExperienceUIProps, "fixture"> & { study?: SpeciesStudy; river?: string; overview?: boolean; modelUrl?: string }) {
  const isPrimary = !overview && fixture.label.startsWith("Polar parrot");
  const reference = modelReference(modelUrl);
  const basin = basinReference(river);
  return <div className="experience-study">
    <p className="experience-disclaimer">{isPrimary ? DISCLAIMER : "An illustrative underwater exhibit, not a surveyed habitat or evidence of a species occurring in this river."}</p>
    {basin && <p><a href={basin.href}>{basin.name} basin · sourced records</a></p>}
    {reference && <p><a href={reference.href}>Read the sourced profile · {reference.scientificName}</a></p>}
    {!overview && <p className="experience-source-label">Source field label: <span>{fixture.label}</span></p>}
    {study && !reference && <>
      <section><h3>Scientific name</h3><p>{study.scientificName}</p></section>
      <section><h3>Origin</h3><p>{study.origin}</p></section>
      <section><h3>Maximum size</h3><p>{study.maxSize}</p></section>
      <section><h3>Habitat</h3><p>{study.habitat}</p></section>
      <section><h3>Water parameters</h3><p>{study.waterParams}</p></section>
      <section><h3>Diet</h3><p>{study.diet}</p></section>
      <section><h3>Behaviour</h3><p>{study.behavior}</p></section>
      <section><h3>Notes</h3><p>{study.notes}</p></section>
    </>}
    {isPrimary && <section><h3>Markings &amp; model</h3><p>A rounded silhouette, dark bars and layered fins: an original procedural model interpreting the supplied reference, not a biological identification.</p></section>}
    {!overview && !isPrimary && !study && <section><h3>Species note</h3><p>{fixture.disclaimer}</p></section>}
    <section><h3>An illustrative environment</h3><p>The {river} overview uses generalized geographic data. The underwater light, plants, movement and school are an artistic preview, not a surveyed reach or a record of natural behaviour. Model labels are exhibit identities; the linked catalog records carry the scientific evidence.</p></section>
    {!overview && <p>{fixture.disclaimer}</p>}
    <p>Synthesized preview ambience: original filtered noise, not a field recording.</p>
    <div className="experience-map-credit">
      <a href="https://www.naturalearthdata.com/">{provenance.credit}</a>
      <p>{provenance.boundaryPolicy}</p>
      <a href={provenance.sources["LICENSE.md"].url}>{provenance.license} license</a>
      <p>{provenance.cartographicScale}</p>
      <p>Vector version: {provenance.commit}</p>
      <a href={provenance.sources["ne_10m_admin_0_countries_ind.geojson"].url}>Boundary source</a>{" · "}
      <a href={provenance.sources["ne_10m_rivers_lake_centerlines.geojson"].url}>River source</a>
      <p>Natural Earth 1:50 million shaded relief; {provenance.relief.usage}</p>
      <a href={provenance.relief.sourceUrl}>Relief source · version {provenance.relief.version}</a>
    </div>
  </div>;
}

function StudyDialog({ title, onClose, onEscape = onClose, returnFocus, children }: {
  title: string; onClose: () => void; onEscape?: () => void; returnFocus: RefObject<HTMLButtonElement | null>; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    close.current?.focus();
    const target = returnFocus;
    return () => { element.close(); target.current?.focus(); };
  }, [returnFocus]);
  function trap(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.current!.querySelectorAll<HTMLElement>("button, a[href], select, [tabindex='0']"));
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog className="experience-dialog" ref={dialog} aria-label={title} onKeyDown={trap}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onEscape(); }}>
    <button className="experience-dialog-close" ref={close} onClick={onClose}>{title === "Experience preview" ? "Close preview" : "Back to Water"}</button>
    <h2>{title}</h2>{children}
  </dialog>;
}

export function ExperienceUI(props: ExperienceUIProps) {
  const { state, fixture, paused, quality, audio, visibleFishIds, dispatch, batterySaver = false, onBatterySaverChange } = props;
  const [preview, setPreview] = useState(false);
  const [choice, setChoice] = useState(visibleFishIds[0] ?? "");
  const previewButton = useRef<HTMLButtonElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const focusAfterPhase = useRef<"map" | "exploring" | null>(null);
  useEffect(() => {
    if (focusAfterPhase.current !== state.phase) return;
    focusAfterPhase.current = null;
    if (state.phase === "map") (enterButton.current?.disabled ? previewButton.current : enterButton.current)?.focus();
    else followButton.current?.focus();
  }, [state.phase]);
  const followButton = useRef<HTMLButtonElement>(null);
  const exploreButton = useRef<HTMLButtonElement>(null);
  const storyFocus = useRef<HTMLButtonElement | null>(null);
  const commonName = fixture.label.split(" - ")[0];
  const followName = state.selectedId && props.speciesLabels?.[state.selectedId]
    ? props.speciesLabels[state.selectedId]
    : commonName;
  const studyFixture = state.selectedId && props.speciesLabels?.[state.selectedId] && props.speciesLabels[state.selectedId] !== commonName
    ? { ...fixture, label: props.speciesLabels[state.selectedId], disclaimer: "Aquarium species study; not a verified wild-habitat reconstruction or production asset." }
    : fixture;
  const selectedStudy = state.selectedId ? props.speciesStudy?.[state.selectedId] : undefined;
  const selectedModelUrl = state.selectedId ? props.speciesModelUrls?.[state.selectedId] : undefined;
  const reference = modelReference(selectedModelUrl);
  const basin = basinReference(props.selectedRiver ?? "Cauvery");
  const selected = visibleFishIds.includes(choice) ? choice : visibleFishIds[0] ?? "";
  const inWater = state.phase === "exploring" || state.phase === "following" || state.phase === "story";
  useEffect(() => {
    if (preview || state.phase === "story") return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (state.phase === "following") {
          event.preventDefault();
          focusAfterPhase.current = "exploring";
        }
        dispatch({ type: "ESCAPE" });
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [dispatch, preview, state.phase]);
  function closeStory(escape: boolean) {
    storyFocus.current = escape ? exploreButton.current : followButton.current;
    dispatch({ type: escape ? "ESCAPE" : "BACK" });
  }
  return <div className="experience-ui">
    <header className="experience-header"><Link href="/" className="experience-brand">Native Waters</Link>
      <nav aria-label="Exhibit navigation">
        {basin && <a className="experience-basin-link" href={basin.href}>{basin.name} basin</a>}
        <button ref={previewButton} className="experience-preview" onClick={() => setPreview(true)}>Experience preview</button>
      </nav>
    </header>
    {state.phase === "map" && <section className="experience-map-intro" aria-label="River entry">
      <h1>{props.selectedRiver ?? "Cauvery"}</h1>
      <label className="experience-river-label">Select river <select className="experience-river-select" value={props.selectedRiver ?? "Cauvery"}
        onChange={event => { props.onRiverChange?.(event.target.value); props.onRiverHover?.(event.target.value); }}
        onFocus={event => props.onRiverHover?.(event.target.value)}
        onBlur={() => props.onRiverHover?.(null)}
        onMouseEnter={event => props.onRiverHover?.((event.target as HTMLSelectElement).value)}
        onMouseLeave={() => props.onRiverHover?.(null)}>
        {SELECTABLE_RIVERS.map(name => <option key={name} value={name}>{name}</option>)}
      </select></label>
      <p>From a river on the map to a quiet study beneath the surface.</p>
      <button ref={enterButton} className="experience-enter" disabled={!state.ready} onClick={() => props.onEntryIntent()}
        onPointerEnter={() => props.onMapHighlight(true)} onPointerLeave={() => props.onMapHighlight(false)}
        onFocus={() => props.onMapHighlight(true)} onBlur={() => props.onMapHighlight(false)}>Enter Water</button>
      {!state.ready && <p className="experience-readiness" role="status">Preparing models and light… You can read the basin records while the scene loads.</p>}
    </section>}
    {state.phase === "entering" && <p className="experience-entry-status" role="status">Entering the water…</p>}
    {state.phase === "exploring" && <p className="experience-gesture-hint">Drag to look around · tap a fish to follow</p>}
    {inWater && <section className="experience-fish-controls" aria-label="Fish study controls">
      <label>Select fish <select value={selected} onChange={event => setChoice(event.target.value)}>
        {visibleFishIds.map((id, index) => {
          const label = (props.speciesLabels?.[id]) ? props.speciesLabels[id] : commonName;
          return <option key={id} value={id}>{label} - {index + 1}</option>;
        })}
      </select></label>
      <button ref={followButton} disabled={!selected} onClick={() => dispatch({ type: "SELECT", id: selected })}>Follow fish</button>
    </section>}
    {(state.phase === "following" || state.phase === "story") && <aside className="experience-follow-card" aria-label="Selected fish">
      <h2>{followName}</h2><p className="experience-model-note">Illustrative model</p>
      {reference
        ? <a className="experience-profile-link" href={reference.href}>Read species profile <span>{reference.scientificName}</span></a>
        : <p className="experience-record-note">No exact catalog profile is linked to this model. {basin && <a href={basin.href}>Browse {basin.name} basin records</a>} separately.</p>}
      <button ref={exploreButton} onClick={() => { storyFocus.current = exploreButton.current; dispatch({ type: "STORY" }); }}>Explore Species</button>
      {state.phase !== "story" && <button onClick={() => { focusAfterPhase.current = "exploring"; dispatch({ type: "BACK" }); }}>Back to Water</button>}
    </aside>}
    {props.hoveredId && inWater && state.phase === "exploring" && <p className="experience-hover-label">{props.speciesLabels?.[props.hoveredId] ?? commonName}</p>}
    <nav className="experience-controls" aria-label="Experience controls">
      <button aria-pressed={paused} onClick={() => props.onPausedChange(!paused)}>{paused ? "Resume" : "Pause"}</button>
      <button aria-pressed={audio.enabled} onClick={audio.enabled ? audio.disable : audio.enable}>{audio.enabled ? "Sound off" : "Sound on"}</button>
      <label><span className="experience-control-label">Quality </span><select value={quality} onChange={event => props.onQualityChange(event.target.value as QualityPreference)}>
        <option>AUTO</option><option>HIGH</option><option>LOW</option>
      </select></label>
      <label><input type="checkbox" checked={batterySaver} onChange={e => onBatterySaverChange?.(e.target.checked)} /> Battery saver</label>
      {state.phase !== "map" && <button onClick={() => { focusAfterPhase.current = "map"; dispatch({ type: "MAP" }); }}>Return to Map</button>}
    </nav>
    {audio.error && <p className="experience-audio-error" role="status">{audio.error}</p>}
    {preview && state.phase !== "story" && <StudyDialog title="Experience preview" onClose={() => setPreview(false)} returnFocus={previewButton}><Study fixture={fixture} river={props.selectedRiver} overview={Boolean(props.selectedRiver)} /></StudyDialog>}
    {state.phase === "story" && <StudyDialog title={followName} onClose={() => closeStory(false)} onEscape={() => closeStory(true)} returnFocus={storyFocus}>
      <Study fixture={studyFixture} study={selectedStudy} river={props.selectedRiver} modelUrl={selectedModelUrl} />
    </StudyDialog>}
  </div>;
}
