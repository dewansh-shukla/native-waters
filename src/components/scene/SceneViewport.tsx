"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import type { ExperienceSceneProps } from "@/experience/contracts";
import { advanceScene } from "@/experience/frameDriver";
import { warmScene } from "@/experience/warmScene";
import { FishSchool } from "./fish/FishSchool";
import { PreviewWorld } from "./world/PreviewWorld";
import { ExperienceCamera } from "./camera/ExperienceCamera";
import { EntryMap, CAUVERY_ANCHOR } from "./map/EntryMap";
import { SceneBoundary, SceneFailure } from "./SceneBoundary";

function RendererGuard({ onReady }: Pick<ExperienceSceneProps, "onReady">) {
  const canvas = useThree((state) => state.gl.domElement);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const onLost = (event: Event) => { event.preventDefault(); onReady(false); setLost(true); };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [canvas, onReady]);
  if (lost) throw new Error("Graphics context lost");
  return null;
}

function Scene(props: ExperienceSceneProps) {
  const group = useRef<Group>(null);
  const { gl, scene, camera } = useThree();
  const [loaded, setLoaded] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const loadedSchool = useCallback(() => setLoaded(true), []);
  const { onReady } = props;
  useFrame((_, delta) => advanceScene(props.runtime.current, delta, props.state.phase, props.paused || !props.state.ready, document.hidden), -100);
  useEffect(() => {
    onReady(false);
    if (!loaded || !group.current) return;
    let active = true;
    warmScene(gl, scene, camera, group.current).then(() => { if (active) onReady(true); }, error => {
      if (active) { onReady(false); setFailure(error instanceof Error ? error : new Error("Shader warm-up failed")); }
    });
    return () => { active = false; onReady(false); };
  }, [loaded, gl, scene, camera, onReady]);
  if (failure) throw failure;
  const map = props.state.phase === "map";
  return <group ref={group}>
    <RendererGuard onReady={onReady} />
    <ExperienceCamera runtime={props.runtime} phase={props.state.phase} selectedId={props.state.selectedId}
      paused={props.paused} ready={props.state.ready} reducedMotion={props.reducedMotion} entryAnchor={CAUVERY_ANCHOR} onEntered={props.onEntered} />
    <group name="MapView" visible={map}>
    <ambientLight intensity={.65} />
    <directionalLight position={[-6, 20, 5]} intensity={2} color="#d7e6d5" />
    </group>
    <EntryMap visible={map || props.state.phase === "entering"} progress={props.runtime.current.entryProgress}
      runtime={props.runtime} highlighted={props.mapHighlighted} onHighlight={props.onMapHighlight} onEnter={props.onEnter} />
    <group name="WaterView" visible={!map}>
    <PreviewWorld runtime={props.runtime} quality={props.quality} visible={!map} />
      <Suspense fallback={null}>
        <FishSchool modelUrl={props.modelUrl} runtime={props.runtime} paused={props.paused || map || !props.state.ready}
          visibleIds={props.visibleIds} selectedId={props.state.selectedId} onSelect={props.onSelect}
          onHover={props.onHover} onReady={loadedSchool} />
      </Suspense>
    </group>
  </group>;
}

export default function SceneViewport(props: ExperienceSceneProps) {
  const [attempt, setAttempt] = useState(0);
  const retry = () => { props.onReady(false); useGLTF.clear(props.modelUrl); setAttempt(value => value + 1); };
  const { onReady } = props;
  useEffect(() => () => onReady(false), [onReady]);
  return <div className="scene-viewport">
    <SceneBoundary key={`${props.modelUrl}:${attempt}`} onRetry={retry}>
      <Canvas camera={{ position: [0, 30, .01], up: [0, 1, 0], fov: 45, near: .05, far: 120 }}
        dpr={props.quality === "HIGH" ? [1, 1.5] : 1} fallback={<SceneFailure onRetry={retry} />} aria-label="Native Waters scene">
        <color attach="background" args={["#101c1e"]} />
        <Scene {...props} />
      </Canvas>
    </SceneBoundary>
  </div>;
}
