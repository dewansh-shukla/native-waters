"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SceneBoundary } from "@/components/scene/SceneBoundary";
import { MotionControls } from "@/components/controls/MotionControls";
import { useReducedMotion } from "@/components/controls/useReducedMotion";
import type { PipelineFixture } from "@/types/fixture";

const SceneViewport = dynamic(() => import("@/components/scene/SceneViewport"), {
  ssr: false,
  loading: () => <p role="status">Loading 3D viewer…</p>,
});

export default function Experience({ fixture }: { fixture: PipelineFixture }) {
  const reducedMotion = useReducedMotion();
  const [pauseOverride, setPauseOverride] = useState<boolean | null>(null);
  const paused = pauseOverride ?? reducedMotion;

  return (
    <section aria-labelledby="fixture-heading">
      <h2 id="fixture-heading">{fixture.label}</h2>
      <p>{fixture.disclaimer}</p>
      <MotionControls paused={paused} onPausedChange={setPauseOverride} />
      <SceneBoundary onRetry={() => window.location.reload()} retryLabel="Reload page">
        <SceneViewport modelUrl={fixture.modelUrl} paused={paused} />
      </SceneBoundary>
    </section>
  );
}
