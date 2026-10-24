"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Box3, Group, Mesh, MeshBasicMaterial, SkinnedMesh, SphereGeometry, Vector3, type AnimationAction, type AnimationClip, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FishSchoolProps, FishState } from "@/experience/contracts";

// Shared, invisible padded targets are immutable and retained across school mounts.
const hitGeometry = new SphereGeometry(1, 12, 8);
const hitMaterial = new MeshBasicMaterial({ visible: false });
const noRaycast = () => {};

function Fish({ source, animations, fish, runtime, index, paused, visible, onSelect, onHover }: {
  source: Object3D; animations: AnimationClip[]; fish: FishState; runtime: FishSchoolProps["runtime"]; index: number;
  paused: boolean; visible: boolean; onSelect: FishSchoolProps["onSelect"]; onHover: FishSchoolProps["onHover"];
}) {
  const model = useMemo(() => {
    const rig = clone(source);
    // Only the padded target is interactive, not individual fins or bones.
    rig.traverse(node => { if (node instanceof Mesh) node.raycast = noRaycast; });
    const bounds = new Box3().setFromObject(rig);
    const size = bounds.getSize(new Vector3());
    // Illustrative display length, not a biological measurement.
    const length = 0.36 + index * 0.008;
    const scale = length / Math.max(size.x, size.y, size.z, 0.001);
    const normalized = new Group();
    normalized.scale.setScalar(scale);
    normalized.position.copy(bounds.getCenter(new Vector3())).multiplyScalar(-scale);
    normalized.add(rig);
    const hit = new Mesh(hitGeometry, hitMaterial);
    hit.scale.set(length * 0.68, 0.15, 0.13);
    const root = new Group();
    root.add(normalized, hit);
    return { root, rig, hit };
  }, [source, index]);
  const mixer = useRef<AnimationMixer | null>(null);
  const swim = useRef<AnimationAction | null>(null);
  const lastTime = useRef(runtime.current.time);
  useEffect(() => { lastTime.current = runtime.current.time; }, [paused, runtime]);
  const gesture = useRef({ down: false, x: 0, y: 0, moved: false, pointerId: -1 });

  useEffect(() => {
    const instance = new AnimationMixer(model.rig);
    mixer.current = instance;
    // Single-clip GLBs keep their legacy action and mixer-driven timing.
    const clips = animations.length === 1 ? animations : ["Swim", "Breathing", "FinIdle"].flatMap(name =>
      animations.find(clip => clip.name === name) ?? []);
    for (const clip of clips) {
      const action = instance.clipAction(clip).play();
      action.time = clip.duration * index / 13;
      if (animations.length > 1 && clip.name === "Swim") swim.current = action;
    }
    instance.update(0);
    return () => {
      instance.stopAllAction();
      instance.uncacheRoot(model.rig);
      model.rig.traverse(node => { if (node instanceof SkinnedMesh) node.skeleton.dispose(); });
      mixer.current = null;
      swim.current = null;
    };
  }, [animations, model, index]);

  // These are imperative Three objects, not mutable React state/props.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    model.root.visible = visible;
    model.hit.raycast = visible ? Mesh.prototype.raycast : noRaycast;
    if (!visible) gesture.current.down = false;
  }, [model, visible]);
  /* eslint-enable react-hooks/immutability */

  useFrame(() => {
    const time = runtime.current.time;
    const delta = Math.max(0, time - lastTime.current);
    lastTime.current = time;
    model.root.position.copy(fish.position);
    model.root.quaternion.copy(fish.heading);
    if (!paused && mixer.current) {
      const speed = fish.velocity.length() / 0.42 * (0.9 + index * 0.023);
      if (swim.current) {
        mixer.current.timeScale = 1;
        swim.current.timeScale = speed;
      } else {
        mixer.current.timeScale = speed;
      }
      mixer.current.update(delta);
    }
  });

  const move = (event: ThreeEvent<PointerEvent>) => {
    const g = gesture.current;
    if (g.down && event.pointerId === g.pointerId && Math.hypot(event.clientX - g.x, event.clientY - g.y) > 6) g.moved = true;
  };
  return <primitive object={model.root} dispose={null}
    onPointerOver={(event: ThreeEvent<PointerEvent>) => {
      if (!visible) return;
      event.stopPropagation();
      onHover(fish.id);
    }}
    onPointerOut={() => onHover(null)}
    onPointerDown={(event: ThreeEvent<PointerEvent>) => {
      if (!visible || event.button !== 0) return;
      const g = gesture.current;
      g.down = true;
      g.x = event.clientX;
      g.y = event.clientY;
      g.pointerId = event.pointerId;
      g.moved = false;
      // Do not capture/stop down or move: the camera also owns drag gestures.
    }}
    onPointerMove={move}
    onPointerUp={move}
    onPointerCancel={() => { gesture.current.down = false; }}
    onClick={(event: ThreeEvent<MouseEvent>) => {
      if (!visible) return;
      event.stopPropagation();
      const g = gesture.current;
      const select = g.down && !g.moved && event.button === 0 && (event.delta ?? 0) <= 6;
      g.down = false;
      if (select) onSelect(fish.id);
    }}
  />;
}

export function FishSchool({ modelUrl, runtime, paused, visibleIds, selectedId, onSelect, onHover, onReady, fishIds }: FishSchoolProps) {
  // One loader/cache entry; ten SkeletonUtils clones share geometry/materials/textures.
  const { scene, animations } = useGLTF(modelUrl);
  const readyScene = useRef<Object3D | null>(null);
  useEffect(() => {
    if (readyScene.current === scene) return;
    readyScene.current = scene;
    onReady();
  }, [scene, onReady]);
  const fishToRender = fishIds ? runtime.current.fish.filter(f => fishIds.includes(f.id)) : runtime.current.fish;
  return <>{fishToRender.map((fish, index) => <Fish key={fish.id}
    source={scene} animations={animations} fish={fish} runtime={runtime} index={index} paused={paused}
    visible={visibleIds.includes(fish.id) || selectedId === fish.id}
    onSelect={onSelect} onHover={onHover}
  />)}</>;
}
