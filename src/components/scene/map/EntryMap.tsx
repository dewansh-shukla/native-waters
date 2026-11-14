"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { AdditiveBlending, Group, LineBasicMaterial, MeshBasicMaterial, MeshStandardMaterial, Sprite } from "three";
import type { EntryMapProps } from "@/experience/contracts";
import { RELIEF_CONFIG, RIVER_LABELS, CAUVERY_PARTS, TRIBUTARY_RIVERS, projectLonLat } from "@/experience/geography";
import { buildMapGeometry } from "./geometry";
import { riverLabel } from "./labels";
import { updateMapPresentation } from "./presentation";
import { loadRelief } from "./relief";

export { CAUVERY_ANCHOR } from "@/experience/geography";

export function EntryMap({ visible, progress, highlighted, highlightedRiver, onHighlight, onRiverHover, onRiverChange, onEnter, runtime }: EntryMapProps) {
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
  const labelRefs = useRef<Sprite[]>([]);
  useEffect(() => { labelRefs.current = labels; }, [labels]);

  // Per-river segment list for click-to-select: maps a click point to the nearest river.
  const riverSegments = useMemo(() => {
    const segments: { name: string; points: { x: number; z: number }[] }[] = [];
    const cauveryPts = CAUVERY_PARTS.flatMap((part) => part.map(projectLonLat)).map((v) => ({ x: v.x, z: v.z }));
    if (cauveryPts.length) segments.push({ name: "Cauvery", points: cauveryPts });
    for (const course of TRIBUTARY_RIVERS) {
      const pts = course.parts.flatMap((part) => part.map(projectLonLat)).map((v) => ({ x: v.x, z: v.z }));
      if (pts.length) segments.push({ name: course.name, points: pts });
    }
    return segments;
  }, []);

  const nearestRiver = (point: { x: number; z: number }): string | null => {
    let best: { name: string; dist: number } | null = null;
    for (const seg of riverSegments) {
      for (let i = 1; i < seg.points.length; i++) {
        const a = seg.points[i - 1], b = seg.points[i];
        // distance from point to segment
        const dx = b.x - a.x, dz = b.z - a.z;
        const lenSq = dx * dx + dz * dz;
        let t = lenSq === 0 ? 0 : ((point.x - a.x) * dx + (point.z - a.z) * dz) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + t * dx, pz = a.z + t * dz;
        const dist = Math.hypot(point.x - px, point.z - pz);
        if (!best || dist < best.dist) best = { name: seg.name, dist };
      }
    }
    return best && best.dist < 1.5 ? best.name : null;
  };
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
    const emissive = highlighted ? "#cc913b" : "#32bdcd";
    materials.river.color.set(color);
    materials.river.emissive.set(emissive);
    materials.glow.color.set(highlighted ? "#ffc369" : "#43d7e7");
    // Tributaries (Ganga, Brahmaputra, etc.) highlight the same way so
    // hovering any river reads consistently.
    materials.tributary.color.set(highlighted ? "#ffd48a" : "#79b8c4");
    materials.tributary.emissive.set(highlighted ? "#cc913b" : "#2e7f8d");
    if (!visible) onHighlight(false);
  }, [highlighted, visible, onHighlight, materials]);

  // Highlight only the hovered/selected river's label.
  useEffect(() => {
    labelRefs.current.forEach((sprite, index) => {
      const name = RIVER_LABELS[index]?.name;
      const active = !!highlightedRiver && name === highlightedRiver;
      sprite.scale.set(active ? 2.8 : 2.1, active ? 0.68 : 0.52, 1);
      const mat = sprite.material as { color?: { set: (c: string) => void }; opacity?: number };
      if (mat.color) mat.color.set(active ? "#ffd48a" : "#cfe9ee");
    });
  }, [highlightedRiver]);

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
      <mesh geometry={geometry.river} material={materials.river}
        onPointerOver={(event) => { event.stopPropagation(); if (group.current?.visible) { const rn = nearestRiver({ x: event.point.x, z: event.point.z }); if (rn) onRiverHover?.(rn); } }}
        onPointerOut={() => { if (group.current?.visible) onRiverHover?.(null); }}
        onClick={(event) => {
          event.stopPropagation();
          if (!group.current?.visible) return;
          const riverName = nearestRiver({ x: event.point.x, z: event.point.z });
          if (riverName && onRiverChange) onRiverChange(riverName);
          onEnter(riverName ?? undefined);
        }} />
      <mesh geometry={geometry.tributary} material={materials.tributary} renderOrder={1}
        onPointerOver={(event) => { event.stopPropagation(); if (group.current?.visible) { const rn = nearestRiver({ x: event.point.x, z: event.point.z }); if (rn) onRiverHover?.(rn); } }}
        onPointerOut={() => { if (group.current?.visible) onRiverHover?.(null); }}
        onClick={(event) => {
          event.stopPropagation();
          if (!group.current?.visible) return;
          const riverName = nearestRiver({ x: event.point.x, z: event.point.z });
          if (riverName && onRiverChange) onRiverChange(riverName);
          onEnter(riverName ?? undefined);
        }} />
      <mesh geometry={geometry.glow} material={materials.glow} />
      {labels.map((sprite, index) => (
        <primitive key={index} object={sprite}
          onPointerOver={() => { const name = RIVER_LABELS[index]?.name; if (name) onRiverHover?.(name); }}
          onPointerOut={() => onRiverHover?.(null)}
          onClick={() => {
            const name = RIVER_LABELS[index]?.name;
            if (name && onRiverChange) onRiverChange(name);
            onEnter(name);
          }} />
      ))}
      <mesh geometry={geometry.hit} material={materials.hit}
        onPointerOver={(event) => { hover(event, true); if (group.current?.visible) { const rn = nearestRiver({ x: event.point.x, z: event.point.z }); if (rn) onRiverHover?.(rn); } }}
        onPointerOut={(event) => { hover(event, false); if (group.current?.visible) onRiverHover?.(null); }}
        onClick={(event) => {
          event.stopPropagation();
          if (!group.current?.visible) return;
          const riverName = nearestRiver({ x: event.point.x, z: event.point.z });
          if (riverName && onRiverChange) onRiverChange(riverName);
          onEnter(riverName ?? undefined);
        }} />
    </group>
  );
}
