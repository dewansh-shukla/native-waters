"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, BufferGeometry, Color, DirectionalLight, DoubleSide, Fog, HemisphereLight, InstancedMesh, PlaneGeometry, Vector3 } from "three";
import { OBSTACLES } from "@/experience/habitat";
import { createUnderwaterEnvironment } from "./underwaterEnv";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { advanceParticle, bedHeight, createPlacements, updateAtmosphere } from "./worldMotion";
import { plantShader, substrateShader, surfaceFragment, surfaceVertex } from "./materials";
import { createGravelGeometry, createPlantGeometry, createRockGeometry, fillBatch } from "./worldAssets";

export function PreviewWorld({ runtime, quality, visible }: PreviewWorldProps) {
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.gl);
  const ambient = useRef<AmbientLight>(null), hemisphere = useRef<HemisphereLight>(null);
  const rocks = useRef<InstancedMesh>(null), gravel = useRef<InstancedMesh>(null), plants = useRef<InstancedMesh>(null), plants2 = useRef<InstancedMesh>(null);
  const underwaterAmbient = useRef<AmbientLight>(null);
  const keyLight = useRef<DirectionalLight>(null), fillLight = useRef<DirectionalLight>(null), backlight = useRef<DirectionalLight>(null);
  const placements = useMemo(() => createPlacements(), []);
  const uniforms = useMemo(() => ({ time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } }), []);
  const surfaceUniforms = useMemo(() => ({ uTime: uniforms.time, uRichness: uniforms.richness }), [uniforms]);
  const substrate = useMemo(() => substrateShader(uniforms), [uniforms]);
  const plant = useMemo(() => plantShader(uniforms), [uniforms]);
  const atmosphere = useMemo(() => ({ fog: new Fog("#082b36", 4.5, 27), background: new Color("#09262e"), previousFog: scene.fog, previousBackground: scene.background, active: false }), [scene]);
  const env = useMemo(() => createUnderwaterEnvironment(gl), [gl]);
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
    // First OBSTACLES.length rocks are the swim-through boulders: exact placement.
    fillBatch(rocks.current, placements.rocks, "#6b6055", { spin: true, stretch: true, skipFirst: OBSTACLES.length });
    fillBatch(gravel.current, placements.gravel, "#8a7a60", { spin: true, colorSpread: .42 });
    fillBatch(plants.current, placements.plants, "#3d8b3a");
    fillBatch(plants2.current, placements.plants, "#2d6b28");
  }, [placements]);
  useEffect(() => {
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => { updateAtmosphere(scene, atmosphere, false); };
  }, [scene, atmosphere, visible]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => env.dispose(), [env]);

  // Rock/gravel/plant geometry lives in worldAssets: radial noise displacement
  // (crag detail on boulders, worn relief on pebbles) plus blade vertex shading.
  const rockGeometry = useMemo(() => createRockGeometry(), []);
  useEffect(() => () => rockGeometry.dispose(), [rockGeometry]);
  const gravelGeometry = useMemo(() => createGravelGeometry(), []);
  useEffect(() => () => gravelGeometry.dispose(), [gravelGeometry]);

  // Plant: single blade with baked taper, arch and root-to-tip shading. Sway via plantShader.
  const plantGeometry = useMemo(() => createPlantGeometry(), []);
  const plantGeometry2 = useMemo(() => {
    const geo = createPlantGeometry();
    geo.rotateY(Math.PI / 2);
    return geo;
  }, []);
  useEffect(() => () => plantGeometry.dispose(), [plantGeometry]);
  useEffect(() => () => plantGeometry2.dispose(), [plantGeometry2]);

  useFrame(({ camera }) => {
    // Camera is read only; the camera module remains the sole writer. Above-water map never inherits fog.
    const underwater = visible && camera.position.y < -.08;
    updateAtmosphere(scene, atmosphere, underwater);
    scene.environment = underwater ? env : null;
    if (ambient.current) ambient.current.visible = !underwater;
    if (hemisphere.current) hemisphere.current.visible = !underwater;
    if (underwaterAmbient.current) underwaterAmbient.current.visible = underwater;
    // The sun trio dominates underwater exposure; dim it while submerged so the
    // darker fog/env read through. Above water the trio stays at full strength.
    const sunScale = underwater ? .7 : 1;
    if (keyLight.current) keyLight.current.intensity = 2.4 * sunScale;
    if (fillLight.current) fillLight.current.intensity = 1.2 * sunScale;
    if (backlight.current) backlight.current.intensity = 1.1 * sunScale;
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
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#b0cce0" intensity={.5} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#e0f0f4", "#3a4a38", .85]} />
    <directionalLight ref={keyLight} position={[-6, 9, 3]} color="#ffe9c0" intensity={2.4} />
    <directionalLight ref={fillLight} position={[4, -3, -2]} color="#9ab8cc" intensity={1.2} />
    <directionalLight ref={backlight} position={[-3, 1.5, -7]} color="#bfe0e8" intensity={1.1} />
    <ambientLight ref={underwaterAmbient} name="UnderwaterAmbient" color="#7aa0b0" intensity={0.4} visible={false} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </mesh>
    <instancedMesh ref={rocks} args={[rockGeometry, undefined, placements.rocks.length]}>
      <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </instancedMesh>
    <instancedMesh ref={gravel} args={[gravelGeometry, undefined, placements.gravel.length]}>
      <meshStandardMaterial roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </instancedMesh>
    <instancedMesh ref={plants} args={[plantGeometry, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial color="#3d8b3a" roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <instancedMesh ref={plants2} args={[plantGeometry2, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial color="#2d6b28" roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants2"} />
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
      <pointsMaterial color="#c8d8b0" size={.022} transparent opacity={.26} depthWrite={false} sizeAttenuation />
    </points>
  </group>;
}
