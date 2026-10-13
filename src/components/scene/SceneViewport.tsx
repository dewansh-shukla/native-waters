"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Box3, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SceneBoundary, SceneFailure } from "./SceneBoundary";

function AnimatedModel({ modelUrl, paused, onReady }: { modelUrl: string; paused: boolean; onReady: () => void }) {
  const { scene, animations } = useGLTF(modelUrl);
  const model = useMemo(() => {
    const rig = clone(scene);
    const bounds = new Box3().setFromObject(rig);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    const scale = 3 / Math.max(size.x, size.y, size.z, 0.001);
    return { rig, scale, position: center.multiplyScalar(-scale) };
  }, [scene]);
  const mixer = useRef<AnimationMixer | null>(null);
  useEffect(onReady, [onReady]);

  useEffect(() => {
    const instance = new AnimationMixer(model.rig);
    mixer.current = instance;
    if (animations[0]) instance.clipAction(animations[0]).play();
    return () => {
      instance.stopAllAction();
      instance.uncacheRoot(model.rig);
      mixer.current = null;
    };
  }, [animations, model.rig]);

  useFrame((_, delta) => {
    if (!paused) mixer.current?.update(delta);
  });

  return <group position={model.position} scale={model.scale} dispose={null}>
    <primitive object={model.rig} dispose={null} />
  </group>;
}

function RendererGuard() {
  const canvas = useThree((state) => state.gl.domElement);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const onLost = (event: Event) => {
      event.preventDefault();
      setLost(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [canvas]);
  if (lost) throw new Error("Graphics context lost");
  return null;
}

export default function SceneViewport({ modelUrl, paused }: { modelUrl: string; paused: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const onReady = useCallback(() => setLoadedUrl(modelUrl), [modelUrl]);
  const retry = () => {
    useGLTF.clear(modelUrl);
    setLoadedUrl(null);
    setAttempt((value) => value + 1);
  };

  return (
    <div style={{ width: "100%", height: "clamp(280px, 50vw, 520px)", position: "relative" }}>
      <SceneBoundary key={`${modelUrl}:${attempt}`} onRetry={retry}>
        <Suspense fallback={<p role="status">Loading 3D model…</p>}>
          {loadedUrl !== modelUrl && <p role="status">Loading 3D model…</p>}
          <Canvas
            camera={{ position: [3, 1.6, 6], fov: 40, near: 0.1, far: 100 }}
            dpr={[1, 2]}
            fallback={<SceneFailure onRetry={retry} />}
            aria-label="Animated pipeline test model"
          >
            <color attach="background" args={["#102c38"]} />
            <ambientLight intensity={1.5} />
            <directionalLight position={[3, 5, 4]} intensity={3} />
            <RendererGuard />
            <Suspense fallback={null}>
              <AnimatedModel modelUrl={modelUrl} paused={paused} onReady={onReady} />
            </Suspense>
          </Canvas>
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
