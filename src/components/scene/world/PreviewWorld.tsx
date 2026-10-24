"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, BufferGeometry, Color, DoubleSide, Fog, HemisphereLight, IcosahedronGeometry, InstancedMesh, Object3D, PlaneGeometry, Vector3 } from "three";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { advanceParticle, bedHeight, createPlacements, updateAtmosphere, type Placement } from "./worldMotion";
import { plantShader, substrateShader, surfaceFragment, surfaceVertex } from "./materials";

function fillBatch(mesh: InstancedMesh | null, placements: Placement[], tint: string) {
  if (!mesh) return;
  const transform = new Object3D(), color = new Color(tint);
  for (let i = 0; i < placements.length; i++) {
    const item = placements[i];
    transform.position.fromArray(item.position);
    transform.scale.fromArray(item.scale);
    transform.rotation.set(0, item.rotation, 0);
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    mesh.setColorAt(i, color.clone().multiplyScalar(.72 + (i % 13) / 26));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

export function PreviewWorld({ runtime, quality, visible }: PreviewWorldProps) {
  const scene = useThree(state => state.scene);
  const ambient = useRef<AmbientLight>(null), hemisphere = useRef<HemisphereLight>(null);
  const rocks = useRef<InstancedMesh>(null), gravel = useRef<InstancedMesh>(null), plants = useRef<InstancedMesh>(null);
  const placements = useMemo(() => createPlacements(), []);
  const uniforms = useMemo(() => ({ time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } }), []);
  const surfaceUniforms = useMemo(() => ({ uTime: uniforms.time, uRichness: uniforms.richness }), [uniforms]);
  const substrate = useMemo(() => substrateShader(uniforms), [uniforms]);
  const plant = useMemo(() => plantShader(uniforms), [uniforms]);
  const atmosphere = useMemo(() => ({ fog: new Fog("#0e3a44", 4, 23), background: new Color("#0a2a33"), previousFog: scene.fog, previousBackground: scene.background, active: false }), [scene]);
  const motion = useMemo(() => {
    const positions = new Float32Array(240 * 3);
    const particles: Vector3[] = [];
    for (let i = 0; i < 240; i++) {
      const p = new Vector3(((i * 7.13) % 24) - 12, -2.8 + ((i * .173) % 2.65), ((i * 3.71) % 18) - 9);
      p.toArray(positions, i * 3); particles.push(p);
    }
    return { positions, particles, scratch: new Vector3(), center: new Vector3(0, -1.5, -2), previousTime: NaN };
  }, []);
  const mutable = useRef({ uniforms, motion });
  const particleAttribute = useRef<BufferAttribute>(null);
  const terrain = useMemo(() => {
    const geometry = new PlaneGeometry(24, 18, 96, 72);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3), color = new Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      positions.setY(i, bedHeight(x, z));
      const silt = .5 + .5 * Math.sin(x * .45 + Math.sin(z * .7));
      color.setRGB(.24 + silt * .12, .20 + silt * .09, .12 + silt * .05);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useLayoutEffect(() => {
    fillBatch(rocks.current, placements.rocks, "#6b6055");
    fillBatch(gravel.current, placements.gravel, "#8a7a60");
    fillBatch(plants.current, placements.plants, "#3a6b3a");
  }, [placements]);
  useEffect(() => {
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => { updateAtmosphere(scene, atmosphere, false); };
  }, [scene, atmosphere, visible]);
  useEffect(() => () => terrain.dispose(), [terrain]);

  // Displaced rock geometry: turns a smooth icosahedron into an irregular boulder.
  const rockGeometry = useMemo(() => {
    const geo = new IcosahedronGeometry(1, 2);
    const pos = geo.getAttribute("position");
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const n = Math.sin(v.x * 3.1 + v.y * 2.7) * Math.cos(v.z * 2.3 + v.x * 1.9) * 0.18
            + Math.sin(v.y * 5.3) * 0.08;
      v.normalize().multiplyScalar(1 + n);
      // re-apply original magnitude-ish: scale along normal
      const len = Math.sqrt(pos.getX(i) ** 2 + pos.getY(i) ** 2 + pos.getZ(i) ** 2);
      pos.setXYZ(i, v.x * len, v.y * len, v.z * len);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => rockGeometry.dispose(), [rockGeometry]);

  // Cross-plane plant: two perpendicular quads for a bushy look.
  const plantGeometry = useMemo(() => {
    const geo = new PlaneGeometry(0.16, 1, 1, 8);
    geo.translate(0, 0.5, 0);
    const geo2 = new PlaneGeometry(0.16, 1, 1, 8);
    geo2.rotateY(Math.PI / 2);
    geo2.translate(0, 0.5, 0);
    // merge geo2 into geo
    const pos1 = geo.getAttribute("position"), pos2 = geo2.getAttribute("position");
    const idx1 = geo.index!, idx2 = geo2.index!;
    const base = pos1.count;
    const mergedPos = new Float32Array((pos1.count + pos2.count) * 3);
    for (let i = 0; i < pos1.count; i++) { mergedPos[i*3]=pos1.getX(i); mergedPos[i*3+1]=pos1.getY(i); mergedPos[i*3+2]=pos1.getZ(i); }
    for (let i = 0; i < pos2.count; i++) { mergedPos[(base+i)*3]=pos2.getX(i); mergedPos[(base+i)*3+1]=pos2.getY(i); mergedPos[(base+i)*3+2]=pos2.getZ(i); }
    const mergedIdx = new Uint16Array(idx1.count + idx2.count);
    for (let i = 0; i < idx1.count; i++) mergedIdx[i] = idx1.getX(i);
    for (let i = 0; i < idx2.count; i++) mergedIdx[idx1.count+i] = idx2.getX(i) + base;
    const merged = new BufferGeometry();
    merged.setAttribute("position", new BufferAttribute(mergedPos, 3));
    merged.setIndex(new (geo.index!.constructor as any)(mergedIdx));
    merged.computeVertexNormals();
    geo2.dispose();
    return merged;
  }, []);
  useEffect(() => () => plantGeometry.dispose(), [plantGeometry]);

  useFrame(({ camera }) => {
    // Camera is read only; the camera module remains the sole writer. Above-water map never inherits fog.
    const underwater = visible && camera.position.y < -.08;
    updateAtmosphere(scene, atmosphere, underwater);
    if (ambient.current) ambient.current.visible = !underwater;
    if (hemisphere.current) hemisphere.current.visible = !underwater;
    const time = runtime.current.time;
    const { uniforms, motion } = mutable.current;
    uniforms.time.value = time;
    uniforms.richness.value = quality === "HIGH" ? 1 : .25;
    currentAt(motion.center, time, uniforms.flow.value);
    if (visible && time !== motion.previousTime) {
      for (let i = 0; i < motion.particles.length; i++) {
        advanceParticle(motion.particles[i], time, motion.previousTime, motion.scratch);
        motion.particles[i].toArray(motion.positions, i * 3);
      }
      if (particleAttribute.current) particleAttribute.current.needsUpdate = true;
    }
    motion.previousTime = time;
  });

  return <group visible={visible} name="PreviewWorld">
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#a8c4d8" intensity={.5} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#d8eaf0", "#3a4a3a", .85]} />
    <directionalLight position={[-6, 9, 3]} color="#fff4d6" intensity={2.4} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </mesh>
    <instancedMesh ref={rocks} args={[rockGeometry, undefined, placements.rocks.length]}>
      <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </instancedMesh>
    <instancedMesh ref={gravel} args={[undefined, undefined, placements.gravel.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
    <instancedMesh ref={plants} args={[plantGeometry, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial roughness={.8} side={DoubleSide} onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <group position={[-5.4, -2.74, -.8]} rotation={[0, .65, Math.PI / 2 - .07]}>
      <mesh>
        <cylinderGeometry args={[.14, .23, 3.8, 9]} />
        <meshStandardMaterial color="#4a3828" roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
      </mesh>
      <mesh position={[.16, .7, 0]} rotation={[0, 0, -.7]}>
        <cylinderGeometry args={[.035, .075, 1.25, 7]} />
        <meshStandardMaterial color="#5a4838" roughness={1} />
      </mesh>
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[24, 18, 32, 24]} />
      {/* shortcut: double-sided Fresnel/glints replace reflection/refraction, not physical water optics. */}
      <shaderMaterial uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} side={DoubleSide} transparent depthWrite={false} />
    </mesh>
    <points frustumCulled={false}>
      <bufferGeometry drawRange={{ start: 0, count: quality === "HIGH" ? 240 : 80 }}>
        <bufferAttribute ref={particleAttribute} attach="attributes-position" args={[motion.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b8d4c0" size={.022} transparent opacity={.28} depthWrite={false} sizeAttenuation />
    </points>
  </group>;
}
