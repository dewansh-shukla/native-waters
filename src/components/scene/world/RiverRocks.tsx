"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box3, Group, Object3D, Vector3 } from "three";

const ROCK_MODELS = [
  "/models/river/rocks/granite_boulder.glb",
  "/models/river/rocks/laterite_rock.glb",
  "/models/river/rocks/river_stone.glb",
  "/models/river/rocks/sandstone_slab.glb",
  "/models/river/rocks/pebble_cluster.glb",
];

const ROCK_SPOTS: Array<[number, number, number, number]> = [
  [-4, -2.5, -4, 1.4], [3, -2.5, -1, 1.6], [5, -2.5, -5, 1.8],
  [-9, -2.6, 6, 1.2], [9, -2.6, -6, 1.3], [0, -2.7, 7, 1.1], [-2, -2.6, -8, 1.0],
];

function RiverRock({ url, position, scale, rotation }: { url: string; position: [number, number, number]; scale: number; rotation: number }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const r = clone(scene) as Group;
    const box = new Box3().setFromObject(r);
    const size = box.getSize(new Vector3());
    const s = scale / Math.max(size.x, size.y, size.z, 0.001);
    r.scale.setScalar(s);
    r.position.copy(box.getCenter(new Vector3()).multiplyScalar(-s));
    const wrap = new Group();
    wrap.add(r);
    return wrap;
  }, [scene, scale]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={root} />
    </group>
  );
}

export function RiverRocks() {
  return (
    <group name="RiverRocks">
      {ROCK_SPOTS.map(([x, y, z, sc], i) => (
        <RiverRock key={`rrock-${i}`} url={ROCK_MODELS[i % ROCK_MODELS.length]} position={[x, y, z]} scale={sc} rotation={i * 2.1} />
      ))}
    </group>
  );
}
