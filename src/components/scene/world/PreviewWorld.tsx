"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, Color, DoubleSide, Fog, HemisphereLight, InstancedMesh, Object3D, PlaneGeometry, Vector3 } from "three";
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
  const atmosphere = useMemo(() => ({ fog: new Fog("#59634a", 4, 23), background: new Color("#59634a"), previousFog: scene.fog, previousBackground: scene.background, active: false }), [scene]);
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
      color.setRGB(.22 + silt * .10, .19 + silt * .07, .11 + silt * .04);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useLayoutEffect(() => {
    fillBatch(rocks.current, placements.rocks, "#777566");
    fillBatch(gravel.current, placements.gravel, "#9a8b6e");
    fillBatch(plants.current, placements.plants, "#5c7439");
  }, [placements]);
  useEffect(() => {
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => { updateAtmosphere(scene, atmosphere, false); };
  }, [scene, atmosphere, visible]);
  useEffect(() => () => terrain.dispose(), [terrain]);

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
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#b3bc8a" intensity={.55} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#e9dfb4", "#393422", .8]} />
    <directionalLight position={[-6, 9, 3]} color="#ffe3ab" intensity={2.2} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </mesh>
    <instancedMesh ref={rocks} args={[undefined, undefined, placements.rocks.length]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={.94} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </instancedMesh>
    <instancedMesh ref={gravel} args={[undefined, undefined, placements.gravel.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
    <instancedMesh ref={plants} args={[undefined, undefined, placements.plants.length]} frustumCulled={false}>
      <planeGeometry args={[.16, 1, 1, 8]} onUpdate={geometry => geometry.translate(0, .5, 0)} />
      <meshStandardMaterial roughness={.85} side={DoubleSide} onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <group position={[-5.4, -2.74, -.8]} rotation={[0, .65, Math.PI / 2 - .07]}>
      <mesh>
        <cylinderGeometry args={[.14, .23, 3.8, 9]} />
        <meshStandardMaterial color="#544536" roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
      </mesh>
      <mesh position={[.16, .7, 0]} rotation={[0, 0, -.7]}>
        <cylinderGeometry args={[.035, .075, 1.25, 7]} />
        <meshStandardMaterial color="#61513b" roughness={1} />
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
      <pointsMaterial color="#c8c7a0" size={.026} transparent opacity={.32} depthWrite={false} sizeAttenuation />
    </points>
  </group>;
}
