"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Box3, Group, Vector3 } from "three";
import { prepareFishMaterials } from "@/components/scene/fish/fishMaterials";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const group = useRef<Group>(null);
  const normalized = useMemo(() => {
    const copy = clone(scene);
    prepareFishMaterials(copy);
    const box = new Box3().setFromObject(copy);
    const size = box.getSize(new Vector3());
    const scale = 1.6 / Math.max(size.x, size.y, size.z, 0.001);
    const center = box.getCenter(new Vector3());
    const wrapper = new Group();
    wrapper.scale.setScalar(scale);
    wrapper.position.copy(center).multiplyScalar(-scale);
    wrapper.add(copy);
    return wrapper;
  }, [scene]);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.6;
  });
  return <primitive ref={group} object={normalized} />;
}

export default function FishPreview({ modelUrl }: { modelUrl: string }) {
  return (
    <div className="fish-preview" data-testid="fish-preview" style={{ width: "100%", height: 220, position: "relative" }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 40, near: 0.05, far: 50 }} dpr={1} aria-label="Fish preview">
        <color attach="background" args={["#0b1a1c"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={1.3} />
        <Suspense fallback={null}>
          <Model url={modelUrl} />
        </Suspense>
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1.2} />
      </Canvas>
    </div>
  );
}