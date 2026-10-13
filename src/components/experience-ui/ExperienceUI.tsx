"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import type { ExperienceUIProps, QualityPreference } from "@/experience/contracts";
import provenance from "../../../content/maps/provenance.json";

const DISCLAIMER = "Polar parrot reference study in an illustrative environment; no occurrence in this Indian location is asserted.";

function Study({ fixture }: Pick<ExperienceUIProps, "fixture">) {
  return <div className="experience-study">
    <p className="experience-disclaimer">{DISCLAIMER}</p>
    <p className="experience-source-label">Source field label: <span>{fixture.label}</span></p>
    <section><h3>Markings &amp; model</h3><p>A rounded silhouette, dark bars and layered fins: an original procedural model interpreting the supplied reference, not a biological identification.</p></section>
    <section><h3>An illustrative environment</h3><p>The Cauvery overview uses generalized geographic data. The underwater light, plants, movement and school are an artistic preview, not a surveyed reach or a record of natural behaviour.</p></section>
    <p>{fixture.disclaimer}</p>
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
    onCancel={event => { event.preventDefault(); onEscape(); }}>
    <button className="experience-dialog-close" ref={close} onClick={onClose}>{title === "Experience preview" ? "Close preview" : "Back to Water"}</button>
    <h2>{title}</h2>{children}
  </dialog>;
}

export function ExperienceUI(props: ExperienceUIProps) {
  const { state, fixture, paused, quality, audio, visibleFishIds, dispatch } = props;
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
  const commonName = fixture.label.split(" — ")[0];
  const selected = visibleFishIds.includes(choice) ? choice : visibleFishIds[0] ?? "";
  const inWater = state.phase === "exploring" || state.phase === "following" || state.phase === "story";
  useEffect(() => {
    if (preview || state.phase === "story") return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (state.phase === "following") focusAfterPhase.current = "exploring";
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
    <header className="experience-header"><span className="experience-brand">Native Waters</span>
      <button ref={previewButton} className="experience-preview" onClick={() => setPreview(true)}>Experience preview</button>
    </header>
    {state.phase === "map" && <section className="experience-map-intro" aria-label="Cauvery entry">
      <p className="experience-eyebrow">An illustrative dive</p><h1>Cauvery</h1>
      <p>From a river on the map to a quiet study beneath the surface.</p>
      <button ref={enterButton} className="experience-enter" disabled={!state.ready} onClick={props.onEntryIntent}
        onPointerEnter={() => props.onMapHighlight(true)} onPointerLeave={() => props.onMapHighlight(false)}
        onFocus={() => props.onMapHighlight(true)} onBlur={() => props.onMapHighlight(false)}>Enter Water</button>
      {!state.ready && <p className="experience-readiness" role="status">Preparing the water… The study is always available in Experience preview.</p>}
    </section>}
    {state.phase === "entering" && <p className="experience-entry-status" role="status">Entering the water…</p>}
    {inWater && <section className="experience-fish-controls" aria-label="Fish study controls">
      <label>Select fish <select value={selected} onChange={event => setChoice(event.target.value)}>
        {visibleFishIds.map((id, index) => <option key={id} value={id}>{commonName} · {index + 1}</option>)}
      </select></label>
      <button ref={followButton} disabled={!selected} onClick={() => dispatch({ type: "SELECT", id: selected })}>Follow fish</button>
    </section>}
    {(state.phase === "following" || state.phase === "story") && <aside className="experience-follow-card" aria-label="Selected fish">
      <p className="experience-eyebrow">Reference study</p><h2>{commonName}</h2>
      <button ref={exploreButton} onClick={() => { storyFocus.current = exploreButton.current; dispatch({ type: "STORY" }); }}>Explore Species</button>
      {state.phase !== "story" && <button onClick={() => { dispatch({ type: "BACK" }); followButton.current?.focus(); }}>Back to Water</button>}
    </aside>}
    {props.hoveredId && inWater && state.phase === "exploring" && <p className="experience-hover-label">{commonName}</p>}
    <nav className="experience-controls" aria-label="Experience controls">
      <button aria-pressed={paused} onClick={() => props.onPausedChange(!paused)}>{paused ? "Resume" : "Pause"}</button>
      <button aria-pressed={audio.enabled} onClick={audio.enabled ? audio.disable : audio.enable}>{audio.enabled ? "Sound off" : "Sound on"}</button>
      <label>Quality <select value={quality} onChange={event => props.onQualityChange(event.target.value as QualityPreference)}>
        <option>AUTO</option><option>HIGH</option><option>LOW</option>
      </select></label>
      {state.phase !== "map" && <button onClick={() => { focusAfterPhase.current = "map"; dispatch({ type: "MAP" }); }}>Return to Map</button>}
    </nav>
    {audio.error && <p className="experience-audio-error" role="status">{audio.error}</p>}
    {preview && state.phase !== "story" && <StudyDialog title="Experience preview" onClose={() => setPreview(false)} returnFocus={previewButton}><Study fixture={fixture} /></StudyDialog>}
    {state.phase === "story" && <StudyDialog title={fixture.label} onClose={() => closeStory(false)} onEscape={() => closeStory(true)} returnFocus={storyFocus}>
      <Study fixture={fixture} />
    </StudyDialog>}
  </div>;
}
