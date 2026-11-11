"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { AnimationMixer, Box3, Group, Mesh, MeshBasicMaterial, Quaternion, SkinnedMesh, SphereGeometry, Vector3, type AnimationAction, type AnimationClip, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { prepareFishMaterials } from "./fishMaterials";
import { createWaterOptics } from "../world/waterOptics";
import { driveFins, gillHz, pectoralRowHz } from "./finMotion";
import { bankAngle, swimTimeScale } from "./motion";
import type { FishSchoolProps, FishState } from "@/experience/contracts";

// The GLB nose points down -X; all motion offsets are applied in this frame.
const FORWARD = new Vector3(-1, 0, 0);

// Shared, invisible padded targets are immutable and retained across school mounts.
const hitGeometry = new SphereGeometry(1, 12, 8);
const hitMaterial = new MeshBasicMaterial({ visible: false });
const noRaycast = () => {};

// An animated glTF joint is rest * pose, so the procedural layer needs the
// rest rotation to rescale or replace it. The source scene is never animated
// (only clones are), so its pose stays rest forever.
function captureRest(root: Object3D): Map<string, Quaternion> {
  const rest = new Map<string, Quaternion>();
  root.traverse(node => {
    if (node.name) rest.set(node.name, node.quaternion.clone());
  });
  return rest;
}

function Fish({ source, animations, rest, fish, runtime, index, paused, visible, onSelect, onHover }: {
  source: Object3D; animations: AnimationClip[]; rest: ReadonlyMap<string, Quaternion>;
  fish: FishState; runtime: FishSchoolProps["runtime"]; index: number;
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
    return { root, rig, hit, length };
  }, [source, index]);
  const mixer = useRef<AnimationMixer | null>(null);
  const swim = useRef<AnimationAction | null>(null);
  // The locomotion action whose local time supplies the swim cycle. Kept
  // separate from `swim` so single-clip GLBs keep their mixer-level retiming.
  const phase = useRef<AnimationAction | null>(null);
  const gillClock = useRef(0);
  const pectoralClock = useRef(0);
  const lastTime = useRef(runtime.current.time);
  const lastForward = useRef(new Vector3(-1, 0, 0));
  const forwardRef = useRef(new Vector3(-1, 0, 0));
  const banking = useRef(0);
  useEffect(() => { lastTime.current = runtime.current.time; }, [paused, runtime]);
  const gesture = useRef({ down: false, x: 0, y: 0, moved: false, pointerId: -1 });

  useEffect(() => {
    const instance = new AnimationMixer(model.rig);
    mixer.current = instance;
    // Single-clip GLBs keep their legacy action and mixer-driven timing.
    // Single-clip GLBs play their one clip. Skeletal multi-clip GLBs (Swim/SlowSwim/
    // FastSwim/Idle) use the Swim clip as the primary locomotion, scaled by speed;
    // legacy multi-clip GLBs fall back to the Swim/Breathing/FinIdle set.
    const clips = animations.length === 1
      ? animations
      : (animations.some(clip => clip.name === "Breathing")
          ? ["Swim", "Breathing", "FinIdle"].flatMap(name => animations.find(clip => clip.name === name) ?? [])
          : [animations.find(clip => clip.name === "Swim") ?? animations[0]]);
    for (const clip of clips) {
      const action = instance.clipAction(clip).play();
      action.time = clip.duration * index / 13;
      if (!phase.current && (clip.name === "Swim" || clips.length === 1)) phase.current = action;
      if (animations.length > 1 && clip.name === "Swim") swim.current = action;
    }
    instance.update(0);
    return () => {
      instance.stopAllAction();
      instance.uncacheRoot(model.rig);
      model.rig.traverse(node => { if (node instanceof SkinnedMesh) node.skeleton.dispose(); });
      mixer.current = null;
      swim.current = null;
      phase.current = null;
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
    // Bank into turns: the heading supplies pitch, the frame supplies roll.
    const forward = forwardRef.current.copy(FORWARD).applyQuaternion(fish.heading);
    const previous = lastForward.current;
    const cross = previous.z * forward.x - previous.x * forward.z;
    const dot = previous.x * forward.x + previous.z * forward.z;
    const turnRate = Math.atan2(cross, dot) / Math.max(delta, 1e-3);
    previous.copy(forward);
    const target = bankAngle(turnRate);
    banking.current += (target - banking.current) * Math.min(1, delta * 6);
    model.root.rotateX(banking.current);
    if (!paused && mixer.current) {
      // Retime by real speed: body lengths per second, not roster index.
      // A fish that is not moving holds its stroke instead of treading water.
      const speed = fish.velocity.length() > 1e-4 ? swimTimeScale(fish.velocity.length(), model.length) : 0;
      if (swim.current) {
        mixer.current.timeScale = 1;
        swim.current.timeScale = speed;
      } else {
        mixer.current.timeScale = speed;
      }
      mixer.current.update(delta);
      // Detail bones read the clip's own phase, so fin lag stays coherent with
      // the baked wave at any time scale and never drifts.
      const action = phase.current;
      const clip = action ? action.getClip() : null;
      const blps = fish.velocity.length() / Math.max(model.length, 1e-3);
      gillClock.current = (gillClock.current + delta * gillHz(blps)) % 1;
      pectoralClock.current = (pectoralClock.current + delta * pectoralRowHz(blps)) % 1;
      driveFins(model.rig, {
        cycle: action && clip && clip.duration > 0 ? (action.time / clip.duration) % 1 : 0,
        blps,
        turnRate,
        gillPhase: gillClock.current,
        pectoralPhase: pectoralClock.current,
        rest,
      });
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
  const water = useMemo(() => createWaterOptics(), []);
  useEffect(() => {
    if (readyScene.current === scene) return;
    prepareFishMaterials(scene, water);
    readyScene.current = scene;
    onReady();
  }, [scene, water, onReady]);
  const fishToRender = fishIds ? runtime.current.fish.filter(f => fishIds.includes(f.id)) : runtime.current.fish;
  const rest = useMemo(() => captureRest(scene), [scene]);
  return <>{fishToRender.map((fish, index) => <Fish key={fish.id}
    source={scene} animations={animations} rest={rest} fish={fish} runtime={runtime} index={index} paused={paused}
    visible={visibleIds.includes(fish.id) || selectedId === fish.id}
    onSelect={onSelect} onHover={onHover}
  />)}</>;
}
