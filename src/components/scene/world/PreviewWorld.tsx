"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, BufferGeometry, Color, DoubleSide, Fog, HemisphereLight, IcosahedronGeometry, InstancedMesh, Object3D, PlaneGeometry, Vector3 } from "three";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { advanceParticle, bedHeight, createPlacements, updateAtmosphere, type Placement } from "./worldMotion";
import { plantShader, substrateShader, surfaceFragment, surfaceVertex } from "./materials";
import { RiverRocks } from "./RiverRocks";

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
  const underwaterAmbient = useRef<AmbientLight>(null);
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
    fillBatch(plants.current, placements.plants, "#4a7a35");
  }, [placements]);
  useEffect(() => {
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => { updateAtmosphere(scene, atmosphere, false); };
  }, [scene, atmosphere, visible]);
  useEffect(() => () => terrain.dispose(), [terrain]);

  // Displaced rock geometry: multi-octave noise turns the icosahedron into an irregular boulder.
  const rockGeometry = useMemo(() => {
    const geo = new IcosahedronGeometry(1, 3);
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const nx = x / len, ny = y / len, nz = z / len;
      const n1 = Math.sin(nx * 4.1 + ny * 2.7) * Math.cos(nz * 3.3 + nx * 1.9) * 0.22;
      const n2 = Math.sin(ny * 7.3 + nz * 5.1) * 0.11;
      const n3 = Math.cos(nx * 9.7 + ny * 8.2 + nz * 6.4) * 0.06;
      const scale = 1 + n1 + n2 + n3;
      pos.setXYZ(i, nx * len * scale, ny * len * scale, nz * len * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => rockGeometry.dispose(), [rockGeometry]);

  // Plant: single blade (proven to render). Sway via plantShader.
  const plantGeometry = useMemo(() => {
    const geo = new PlaneGeometry(0.16, 1, 1, 8);
    geo.translate(0, 0.5, 0);
    return geo;
  }, []);
  useEffect(() => () => plantGeometry.dispose(), [plantGeometry]);

  useFrame(({ camera }) => {
    // Camera is read only; the camera module remains the sole writer. Above-water map never inherits fog.
    const underwater = visible && camera.position.y < -.08;
    updateAtmosphere(scene, atmosphere, underwater);
    if (ambient.current) ambient.current.visible = !underwater;
    if (hemisphere.current) hemisphere.current.visible = !underwater;
    if (underwaterAmbient.current) underwaterAmbient.current.visible = underwater;
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
    <directionalLight position={[4, -3, -2]} color="#8ab4c8" intensity={0.6} />
    <ambientLight ref={underwaterAmbient} name="UnderwaterAmbient" color="#6a9ab0" intensity={0.7} visible={false} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </mesh>
    <instancedMesh ref={rocks} args={[rockGeometry, undefined, placements.rocks.length]}>
      <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </instancedMesh>
    <Suspense fallback={null}><RiverRocks /></Suspense>
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
