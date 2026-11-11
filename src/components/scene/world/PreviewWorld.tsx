"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, Color, DirectionalLight, DoubleSide, Fog, Group, HemisphereLight, InstancedMesh, MeshStandardMaterial, PlaneGeometry, PointsMaterial, RepeatWrapping, Texture, TextureLoader, Vector3 } from "three";
import { OBSTACLES } from "@/experience/habitat";
import { createUnderwaterEnvironment } from "./underwaterEnv";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { advanceParticle, bedHeight, createPlacements, updateAtmosphere } from "./worldMotion";
import { declareRockTextureColorSpaces, plantShader, rockShader, substrateShader, surfaceFragment, surfaceVertex, type RockTextures } from "./materials";
import { applyUnderwaterFog, createWaterOptics, WATER_FOG_FAR, WATER_FOG_NEAR, WATER_SCATTER_CSS } from "./waterOptics";
import { createGodRayMaterial, godRayStrength, sunScreenPosition } from "./godRays";
import { createGravelGeometry, createPlantClumpGeometry, createRockGeometry, fillBatch, planStoneBatches } from "./worldAssets";

export function PreviewWorld({ runtime, quality, visible }: PreviewWorldProps) {
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.gl);
  const ambient = useRef<AmbientLight>(null), hemisphere = useRef<HemisphereLight>(null);
  const worldGroup = useRef<Group>(null);
  const rockBatches = useRef<(InstancedMesh | null)[]>([]);
  const gravelBatches = useRef<(InstancedMesh | null)[]>([]);
  const plants = useRef<InstancedMesh>(null), plants2 = useRef<InstancedMesh>(null);
  const underwaterAmbient = useRef<AmbientLight>(null);
  const keyLight = useRef<DirectionalLight>(null), fillLight = useRef<DirectionalLight>(null), backlight = useRef<DirectionalLight>(null);
  const placements = useMemo(() => createPlacements(), []);
  // Rock/pebble variant plan: index-keyed buckets ((i + salt) % variantCount)
  // so every placement renders exactly once across the batches; obstacle
  // boulders keep verbatim transforms via per-batch skip counts.
  const rockPlans = useMemo(() => planStoneBatches(placements.rocks, 4, 0, OBSTACLES.length), [placements]);
  const gravelPlans = useMemo(() => planStoneBatches(placements.gravel, 3, 0, 0), [placements]);
  const grassPlacements = useMemo(() => placements.plants.map(item => ({
    ...item,
    scale: [item.scale[0] * .85, item.scale[1] * .6, item.scale[2] * .85] as [number, number, number],
  })), [placements]);
  const uniforms = useMemo(() => ({ time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } }), []);
  const water = useMemo(() => createWaterOptics(), []);
  const surfaceUniforms = useMemo(() => ({ uTime: uniforms.time, uRichness: uniforms.richness }), [uniforms]);
  const substrate = useMemo(() => substrateShader(uniforms, water), [uniforms, water]);
  const plant = useMemo(() => plantShader(uniforms, water), [uniforms, water]);
  const atmosphere = useMemo(() => ({ fog: new Fog(WATER_SCATTER_CSS, WATER_FOG_NEAR, WATER_FOG_FAR), background: new Color(WATER_SCATTER_CSS), previousFog: scene.fog, previousBackground: scene.background, active: false }), [scene]);
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
      color.setRGB(.19 + silt * .10, .22 + silt * .08, .13 + silt * .05);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useLayoutEffect(() => {
    // First OBSTACLES.length rocks are the swim-through boulders: exact placement.
    rockPlans.forEach((plan, k) => fillBatch(rockBatches.current[k], plan.placements, "#6b6055", { spin: true, stretch: true, skipFirst: plan.skipFirst, variationIndices: plan.sourceIndices }));
    gravelPlans.forEach((plan, k) => fillBatch(gravelBatches.current[k], plan.placements, "#8a7a60", { spin: true, colorSpread: .42, variationIndices: plan.sourceIndices }));
    fillBatch(plants.current, placements.plants, "#3d8b3a", { stretch: true, stretchAmount: .1, colorSpread: .18, colorSalt: 31 });
    fillBatch(plants2.current, grassPlacements, "#2d6b28", { stretch: true, stretchAmount: .12, colorSpread: .16, colorSalt: 47 });
  }, [rockPlans, gravelPlans, placements, grassPlacements]);
  useLayoutEffect(() => {
    if (worldGroup.current) worldGroup.current.userData.underwaterEnvironment = env;
  }, [env]);
  useEffect(() => {
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => { updateAtmosphere(scene, atmosphere, false); };
  }, [scene, atmosphere, visible]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => env.dispose(), [env]);

  // Rock/gravel/plant geometry lives in worldAssets: radial stone relief and
  // rooted multi-blade clumps with per-vertex wind, phase and leaf shading.
  // One geometry variant per batch: bucket 0 keeps the legacy seed-0 shape.
  const rockGeometries = useMemo(() => rockPlans.map(plan => createRockGeometry(plan.seed)), [rockPlans]);
  const gravelGeometries = useMemo(() => gravelPlans.map(plan => createGravelGeometry(plan.seed)), [gravelPlans]);
  useEffect(() => () => rockGeometries.forEach(geometry => geometry.dispose()), [rockGeometries]);
  useEffect(() => () => gravelGeometries.forEach(geometry => geometry.dispose()), [gravelGeometries]);

  const plantGeometry = useMemo(() => createPlantClumpGeometry("ribbon"), []);
  const plantGeometry2 = useMemo(() => createPlantClumpGeometry("grass"), []);
  useEffect(() => () => plantGeometry.dispose(), [plantGeometry]);
  useEffect(() => () => plantGeometry2.dispose(), [plantGeometry2]);

  // Shared 1K scanned stone maps (CC0, see public/textures/world/rocks)
  // loaded once for all seven batches. Until they arrive — or forever, if the
  // request fails — the batches keep the procedural substrate shader as a
  // graceful fallback instead of breaking the scene.
  const [rockTextures, setRockTextures] = useState<RockTextures | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    const load = (url: string) => new Promise<Texture>((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    Promise.all([
      load("/textures/world/rocks/rock-color.jpg"),
      load("/textures/world/rocks/rock-normal.png"),
      load("/textures/world/rocks/rock-roughness.jpg"),
    ]).then(([map, normalMap, roughnessMap]) => {
      if (cancelled) {
        map.dispose(); normalMap.dispose(); roughnessMap.dispose();
        return;
      }
      for (const texture of [map, normalMap, roughnessMap]) {
        // rockTileOffset jitters/rotates sample UVs; wrap keeps those reads valid.
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.anisotropy = anisotropy;
      }
      declareRockTextureColorSpaces({ map, normalMap, roughnessMap });
      setRockTextures({ map, normalMap, roughnessMap });
    }).catch(() => { /* fallback stays */ });
    return () => { cancelled = true; };
  }, [gl]);

  useEffect(() => () => {
    if (rockTextures) {
      rockTextures.map.dispose(); rockTextures.normalMap.dispose(); rockTextures.roughnessMap.dispose();
    }
  }, [rockTextures]);

  // Scanned-triplanar materials: one program per stone kind; instance colors
  // from fillBatch still tint the scanned albedo. Metalness stays 0 (stone).
  const boulderMaterial = useMemo(() => {
    if (!rockTextures) return null;
    const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    material.onBeforeCompile = rockShader(rockTextures, uniforms, { scale: .38, dampness: .12 }, water);
    material.customProgramCacheKey = () => "river-rock-boulder";
    return material;
  }, [rockTextures, uniforms, water]);
  const pebbleMaterial = useMemo(() => {
    if (!rockTextures) return null;
    const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    material.onBeforeCompile = rockShader(rockTextures, uniforms, { scale: .9, dampness: .12 }, water);
    material.customProgramCacheKey = () => "river-rock-pebble";
    return material;
  }, [rockTextures, uniforms, water]);
  useEffect(() => () => boulderMaterial?.dispose(), [boulderMaterial]);
  useEffect(() => () => pebbleMaterial?.dispose(), [pebbleMaterial]);

  // Marine snow joins the water column: absorption fades each mote with the
  // same optics as the rest of the world.
  const particleMaterial = useMemo(() => {
    const material = new PointsMaterial({ color: "#cfe0c0", size: .03, transparent: true, opacity: .3, depthWrite: false, sizeAttenuation: true });
    material.onBeforeCompile = shader => applyUnderwaterFog(shader, water);
    material.customProgramCacheKey = () => "river-marine-snow";
    return material;
  }, [water]);
  useEffect(() => () => particleMaterial.dispose(), [particleMaterial]);

  // God rays are a HIGH-tier overlay only: a clip-space quad, so it costs one
  // additive full-screen draw and never touches scene depth.
  const godRays = useMemo(() => createGodRayMaterial({
    uSunScreen: { value: new Vector3() },
    uWorldTime: uniforms.time,
    uRichness: uniforms.richness,
  }), [uniforms]);
  const godRayGeometry = useMemo(() => new PlaneGeometry(2, 2), []);
  useEffect(() => () => { godRays.dispose(); godRayGeometry.dispose(); }, [godRays, godRayGeometry]);

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
    if (quality === "HIGH") {
      const sun = sunScreenPosition(camera, time, godRays.uniforms.uSunScreen.value);
      sun.z *= godRayStrength(quality, underwater);
    }
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

  return <group ref={worldGroup} visible={visible} name="PreviewWorld">
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#b0cce0" intensity={.5} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#e0f0f4", "#3a4a38", .85]} />
    <directionalLight ref={keyLight} position={[-6, 9, 3]} color="#ffe9c0" intensity={2.4} />
    <directionalLight ref={fillLight} position={[4, -3, -2]} color="#9ab8cc" intensity={1.2} />
    <directionalLight ref={backlight} position={[-3, 1.5, -7]} color="#bfe0e8" intensity={1.1} />
    <ambientLight ref={underwaterAmbient} name="UnderwaterAmbient" color="#7aa0b0" intensity={0.4} visible={false} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />
    </mesh>
    {rockPlans.map((plan, k) => (
      <instancedMesh key={k} ref={mesh => { rockBatches.current[k] = mesh; }} args={[rockGeometries[k], undefined, plan.placements.length]}>
        {boulderMaterial
          ? <primitive object={boulderMaterial} attach="material" />
          : <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />}
      </instancedMesh>
    ))}
    {gravelPlans.map((plan, k) => (
      <instancedMesh key={k} ref={mesh => { gravelBatches.current[k] = mesh; }} args={[gravelGeometries[k], undefined, plan.placements.length]}>
        {pebbleMaterial
          ? <primitive object={pebbleMaterial} attach="material" />
          : <meshStandardMaterial roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate"} />}
      </instancedMesh>
    ))}
    <instancedMesh ref={plants} args={[plantGeometry, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial color="#3d8b3a" roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <instancedMesh ref={plants2} args={[plantGeometry2, undefined, grassPlacements.length]} frustumCulled={false}>
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
      <primitive object={particleMaterial} attach="material" />
    </points>
    {quality === "HIGH" && <mesh frustumCulled={false} renderOrder={999} geometry={godRayGeometry} material={godRays} />}
  </group>;
}

