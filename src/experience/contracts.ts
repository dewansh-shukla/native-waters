import type { MutableRefObject } from "react";
import type { Quaternion, Vector3 } from "three";
import type { PipelineFixture } from "@/types/fixture";

export type Phase = "map" | "entering" | "exploring" | "following" | "story";
export type QualityPreference = "AUTO" | "HIGH" | "LOW";
export type EffectiveQuality = "HIGH" | "LOW";
export type JourneyState = { phase: Phase; ready: boolean; selectedId: string | null };
export type JourneyEvent =
  | { type: "READY"; ready: boolean }
  | { type: "ENTER" } | { type: "ENTERED" }
  | { type: "SELECT"; id: string } | { type: "STORY" }
  | { type: "BACK" } | { type: "ESCAPE" } | { type: "MAP" };
export type FishState = { id: string; position: Vector3; velocity: Vector3; heading: Quaternion };
export type SceneRuntime = { time: number; entryProgress: number; fish: FishState[] };
export type RuntimeRef = MutableRefObject<SceneRuntime>;
export type AudioControls = { enabled: boolean; error: string | null; enable: () => void; disable: () => void };

export type PreviewWorldProps = { runtime: RuntimeRef; quality: EffectiveQuality; visible: boolean };
export type FishSchoolProps = {
  modelUrl: string; runtime: RuntimeRef; paused: boolean; visibleIds: string[];
  selectedId: string | null; onSelect: (id: string) => void;
  onHover: (id: string | null) => void; onReady: () => void;
};
export type ExperienceCameraProps = {
  runtime: RuntimeRef; phase: Phase; selectedId: string | null; paused: boolean; ready: boolean;
  reducedMotion: boolean; entryAnchor: Vector3; onEntered: () => void;
};
export type EntryMapProps = {
  visible: boolean; progress: number; highlighted: boolean;
  onHighlight: (highlighted: boolean) => void; onEnter: () => void;
  runtime: RuntimeRef;
};
export type ExperienceUIProps = {
  state: JourneyState; fixture: PipelineFixture; paused: boolean;
  onPausedChange: (paused: boolean) => void; quality: QualityPreference;
  onQualityChange: (quality: QualityPreference) => void; visibleFishIds: string[];
  hoveredId: string | null; dispatch: (event: JourneyEvent) => void; audio: AudioControls;
  onEntryIntent: () => void; onMapHighlight: (highlighted: boolean) => void;
};
export type ExperienceAudioProps = { phase: Phase; paused: boolean; runtime: RuntimeRef };

export type ExperienceSceneProps = {
  modelUrl: string; state: JourneyState; runtime: RuntimeRef; paused: boolean;
  reducedMotion: boolean; quality: EffectiveQuality; visibleIds: string[];
  mapHighlighted: boolean; onMapHighlight: (highlighted: boolean) => void;
  onReady: (ready: boolean) => void; onEntered: () => void;
  onSelect: (id: string) => void; onHover: (id: string | null) => void; onEnter: () => void;
};
