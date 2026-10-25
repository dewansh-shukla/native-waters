"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { AdditiveBlending, Group, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial } from "three";
import type { EntryMapProps } from "@/experience/contracts";
import { RELIEF_CONFIG, RIVER_LABELS, projectLonLat } from "@/experience/geography";
import { buildMapGeometry } from "./geometry";
import { riverLabel } from "./labels";
import { updateMapPresentation } from "./presentation";
import { loadRelief } from "./relief";

export { CAUVERY_ANCHOR } from "@/experience/geography";

export function EntryMap({ visible, progress, highlighted, onHighlight, onEnter, runtime }: EntryMapProps) {
  const group = useRef<Group>(null);
  const { gl, invalidate } = useThree();
  const geometry = useMemo(() => buildMapGeometry(), []);
  const materials = useMemo(() => ({
    top: new MeshStandardMaterial({ color: "#42484a", roughness: 0.95, metalness: 0, emissive: "#101719", emissiveIntensity: 0.18, transparent: true }),
    side: new MeshStandardMaterial({ color: "#1b2429", roughness: 1, transparent: true }),
    coast: new LineBasicMaterial({ color: "#d6a66d", transparent: true, depthWrite: false }),
    river: new MeshStandardMaterial({ color: "#70e6ed", emissive: "#32bdcd", emissiveIntensity: 1.3, roughness: 0.7, transparent: true, depthWrite: false }),
    tributary: new MeshStandardMaterial({ color: "#79b8c4", emissive: "#2e7f8d", emissiveIntensity: 0.9, roughness: 0.6, transparent: true, depthWrite: false, depthTest: false }),
    glow: new MeshBasicMaterial({ color: "#43d7e7", transparent: true, blending: AdditiveBlending, depthWrite: false }),
    hit: new MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false }),
  }), []);
  const labels = useMemo(() => RIVER_LABELS.map((label) => riverLabel(label.name, projectLonLat(label.point))), []);
  const layers = useMemo(() => [
    { material: materials.top, opacity: 1 }, { material: materials.side, opacity: 1 },
    { material: materials.coast, opacity: 0.55 }, { material: materials.river, opacity: 1 },
    { material: materials.tributary, opacity: 0.9 },
    { material: materials.glow, opacity: 0.12 },
    ...labels.map((sprite) => ({ material: sprite.material, opacity: 1 })),
  ], [materials, labels]);

  useEffect(() => {
    if (!RELIEF_CONFIG) return;
    return loadRelief(materials.top, RELIEF_CONFIG.url, Math.min(4, gl.capabilities.getMaxAnisotropy()), invalidate);
  }, [gl, invalidate, materials]);

  useEffect(() => () => {
    geometry.dispose();
    Object.values(materials).forEach((material) => material.dispose());
    labels.forEach((sprite) => { sprite.material.map?.dispose(); sprite.material.dispose(); });
  }, [geometry, materials, labels]);

  useEffect(() => {
    const color = highlighted ? "#ffd48a" : "#70e6ed";
    materials.river.color.set(color);
    materials.river.emissive.set(highlighted ? "#cc913b" : "#32bdcd");
    materials.glow.color.set(highlighted ? "#ffc369" : "#43d7e7");
    if (!visible) onHighlight(false);
  }, [highlighted, visible, onHighlight, materials]);

  useFrame(() => {
    if (!group.current) return;
    const current = runtime.current.entryProgress;
    updateMapPresentation(group.current, layers, visible, Number.isFinite(current) ? current : progress);
  });

  const hover = (event: ThreeEvent<PointerEvent>, active: boolean) => {
    event.stopPropagation();
    if (group.current?.visible) onHighlight(active);
  };
  return (
    <group ref={group} visible={visible} dispose={null}>
      <mesh geometry={geometry.land} material={[materials.top, materials.side]} />
      <lineSegments geometry={geometry.coast} material={materials.coast} />
      <mesh geometry={geometry.river} material={materials.river} />
      <mesh geometry={geometry.tributary} material={materials.tributary} renderOrder={1} />
      <mesh geometry={geometry.glow} material={materials.glow} />
      {labels.map((sprite, index) => <primitive key={index} object={sprite} />)}
      <mesh geometry={geometry.hit} material={materials.hit}
        onPointerOver={(event) => hover(event, true)}
        onPointerOut={(event) => hover(event, false)}
        onClick={(event) => { event.stopPropagation(); if (group.current?.visible) onEnter(); }} />
    </group>
  );
}
