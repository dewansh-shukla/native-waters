"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BufferAttribute, Color, DirectionalLight, DoubleSide, Fog, Group, HemisphereLight, InstancedMesh, MeshStandardMaterial, PlaneGeometry, PointsMaterial, RepeatWrapping, Texture, TextureLoader, Vector3 } from "three";
import { OBSTACLES } from "@/experience/habitat";
import { createUnderwaterEnvironment } from "./underwaterEnv";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { SILT_COUNT, advanceParticle, bedHeight, brahmaputraBedHeight, createPlacements, createSiltParticles, gangaBedHeight, godavariBedHeight, siltParticleAt, updateAtmosphere } from "./worldMotion";
import { declareLogTextureColorSpaces, declareRockTextureColorSpaces, logShader, plantShader, rockShader, substrateShader, surfaceFragment, surfaceVertex, type LogTextures, type RockTextures } from "./materials";
import { applyUnderwaterFog, createWaterOptics, WATER_FOG_FAR, WATER_FOG_NEAR, WATER_SCATTER_CSS } from "./waterOptics";
import { createGodRayMaterial, godRayStrength, sunScreenPosition } from "./godRays";
import { createGravelGeometry, createLogGeometry, createPlantClumpGeometry, createRockGeometry, fillBatch, planStoneBatches } from "./worldAssets";

export function PreviewWorld({ runtime, quality, visible, water: waterProp, habitat, river }: PreviewWorldProps) {
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.gl);
  const ambient = useRef<AmbientLight>(null), hemisphere = useRef<HemisphereLight>(null);
  const worldGroup = useRef<Group>(null);
  const rockBatches = useRef<(InstancedMesh | null)[]>([]);
  const gravelBatches = useRef<(InstancedMesh | null)[]>([]);
  const plants = useRef<InstancedMesh>(null), plants2 = useRef<InstancedMesh>(null);
  const underwaterAmbient = useRef<AmbientLight>(null);
  const keyLight = useRef<DirectionalLight>(null), fillLight = useRef<DirectionalLight>(null), backlight = useRef<DirectionalLight>(null);
  const isGanga = river === "ganga"
    || habitat?.seed === 2024
    || habitat?.bed === "silty" || habitat?.bed === "ganga" || habitat?.bed === "sandy"
    || habitat?.bedType === "silty" || habitat?.bedType === "ganga" || habitat?.bedType === "sandy"
    || (habitat as { type?: string } | undefined)?.type === "silty" || (habitat as { type?: string } | undefined)?.type === "ganga"
    || (habitat as { kind?: string } | undefined)?.kind === "silty" || (habitat as { kind?: string } | undefined)?.kind === "ganga"
    || (habitat as { style?: string } | undefined)?.style === "silty" || (habitat as { style?: string } | undefined)?.style === "ganga" || (habitat as { style?: string } | undefined)?.style === "sandy"
    || (Array.isArray(habitat?.obstacles) && habitat!.obstacles.length === 1 && habitat!.obstacles[0]?.radius === 0.8);
  const isGodavari = river === "godavari"
    || habitat?.seed === 2718
    || habitat?.bed === "mixed" || habitat?.bed === "godavari"
    || habitat?.bedType === "mixed" || habitat?.bedType === "godavari"
    || (habitat as { type?: string } | undefined)?.type === "mixed" || (habitat as { type?: string } | undefined)?.type === "godavari"
    || (habitat as { kind?: string } | undefined)?.kind === "mixed" || (habitat as { kind?: string } | undefined)?.kind === "godavari"
    || (habitat as { style?: string } | undefined)?.style === "mixed" || (habitat as { style?: string } | undefined)?.style === "godavari";
  const isBrahmaputra = river === "brahmaputra"
    || habitat?.seed === 9021
    || habitat?.bed === "rocky" || habitat?.bed === "rocky gravel" || habitat?.bed === "rocky_gravel" || habitat?.bed === "brahmaputra"
    || habitat?.bedType === "rocky" || habitat?.bedType === "rocky gravel" || habitat?.bedType === "rocky_gravel" || habitat?.bedType === "brahmaputra"
    || (habitat as { type?: string } | undefined)?.type === "rocky" || (habitat as { type?: string } | undefined)?.type === "brahmaputra"
    || (habitat as { kind?: string } | undefined)?.kind === "rocky" || (habitat as { kind?: string } | undefined)?.kind === "brahmaputra"
    || (habitat as { style?: string } | undefined)?.style === "rocky" || (habitat as { style?: string } | undefined)?.style === "brahmaputra"
    || (Array.isArray(habitat?.obstacles) && habitat!.obstacles.length === 4);
  const bedFn = isBrahmaputra ? brahmaputraBedHeight : isGodavari ? godavariBedHeight : isGanga ? gangaBedHeight : bedHeight;
  // Brahmaputra gravel is cooler and greyer than the Cauvery's warm stone.
  const boulderColor = isBrahmaputra ? "#5f6a63" : "#6b6055";
  const gravelColor = isBrahmaputra ? "#7c847a" : "#8a7a60";
  const placements = useMemo(() => createPlacements({ seed: habitat?.seed, obstacles: habitat?.obstacles, bedHeight: bedFn, river, habitat }), [habitat, bedFn, river]);
  // Rock/pebble variant plan: index-keyed buckets ((i + salt) % variantCount)
  // so every placement renders exactly once across the batches; obstacle
  // boulders keep verbatim transforms via per-batch skip counts.
  const obstacleCount = habitat?.obstacles?.length ?? OBSTACLES.length;
  const rockPlans = useMemo(() => planStoneBatches(placements.rocks, 4, 0, obstacleCount), [placements, obstacleCount]);
  const gravelPlans = useMemo(() => planStoneBatches(placements.gravel, 3, 0, 0), [placements]);
  const grassPlacements = useMemo(() => placements.plants.map(item => ({
    ...item,
    scale: [item.scale[0] * .85, item.scale[1] * .6, item.scale[2] * .85] as [number, number, number],
  })), [placements]);
  const uniforms = useMemo(() => ({ time: { value: 0 }, richness: { value: 1 }, flow: { value: new Vector3() } }), []);
  const water = useMemo(() => waterProp ?? createWaterOptics(), [waterProp]);
  const surfaceUniforms = useMemo(() => ({ uTime: uniforms.time, uRichness: uniforms.richness }), [uniforms]);
  const plant = useMemo(() => plantShader(uniforms, water), [uniforms, water]);
  const atmosphere = useMemo(() => ({ fog: new Fog(new Color(water.scatter.value.x, water.scatter.value.y, water.scatter.value.z), WATER_FOG_NEAR, WATER_FOG_FAR), background: new Color(water.scatter.value.x, water.scatter.value.y, water.scatter.value.z), previousFog: scene.fog, previousBackground: scene.background, active: false }), [scene, water]);
  const env = useMemo(() => createUnderwaterEnvironment(gl), [gl]);
  const motion = useMemo(() => {
    const positions = new Float32Array((240 + SILT_COUNT.HIGH) * 3);
    const particles: Vector3[] = [];
    for (let i = 0; i < 240; i++) {
      const p = new Vector3(((i * 7.13) % 24) - 12, -2.8 + ((i * .173) % 2.65), ((i * 3.71) % 18) - 9);
      p.toArray(positions, i * 3); particles.push(p);
    }
    // Silt puffs share the same position buffer at the tail indices; the
    // LOW tier simply draws fewer of them via drawRange.
    const silt = createSiltParticles(SILT_COUNT.HIGH, 611);
    silt.forEach((s, i) => {
      const pos = siltParticleAt(s, 0, new Vector3());
      pos.toArray(positions, (240 + i) * 3);   // high tier tail
      pos.toArray(positions, (80 + i) * 3);    // low tier tail (contiguous after its 80 marine-snow motes)
    });
    return { positions, particles, silt, scratch: new Vector3(), center: new Vector3(0, -1.5, -2), previousTime: NaN };
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
      positions.setY(i, bedFn(x, z));
      const silt = .5 + .5 * Math.sin(x * .45 + Math.sin(z * .7));
      color.setRGB(.19 + silt * .10, .22 + silt * .08, .13 + silt * .05);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [bedFn]);

  useLayoutEffect(() => {
    // First OBSTACLES.length rocks are the swim-through boulders: exact placement.
    rockPlans.forEach((plan, k) => fillBatch(rockBatches.current[k], plan.placements, boulderColor, { spin: true, stretch: true, skipFirst: plan.skipFirst, variationIndices: plan.sourceIndices }));
    gravelPlans.forEach((plan, k) => fillBatch(gravelBatches.current[k], plan.placements, gravelColor, { spin: true, colorSpread: .42, variationIndices: plan.sourceIndices }));
    fillBatch(plants.current, placements.plants, "#3d8b3a", { stretch: true, stretchAmount: .1, colorSpread: .18, colorSalt: 31 });
    fillBatch(plants2.current, grassPlacements, "#2d6b28", { stretch: true, stretchAmount: .12, colorSpread: .16, colorSalt: 47 });
  }, [rockPlans, gravelPlans, placements, grassPlacements, boulderColor, gravelColor]);
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

  // Shared scanned riverbed gravel (CC0, see public/textures/world/bed)
  // blended under the substrate's procedural silt/algae layers. Until it
  // arrives — or forever, if the request fails — the bed keeps today's
  // purely procedural look; the ground blend uniform just stays at 0.
  const [bedTextures, setBedTextures] = useState<RockTextures | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    const load = (url: string) => new Promise<Texture>((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    Promise.all([
      load("/textures/world/bed/ground-color.jpg"),
      load("/textures/world/bed/ground-normal.jpg"),
      load("/textures/world/bed/ground-roughness.jpg"),
    ]).then(([map, normalMap, roughnessMap]) => {
      if (cancelled) {
        map.dispose(); normalMap.dispose(); roughnessMap.dispose();
        return;
      }
      for (const texture of [map, normalMap, roughnessMap]) {
        // groundTileOffset jitters/rotates sample UVs; wrap keeps those reads valid.
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.anisotropy = anisotropy;
      }
      declareRockTextureColorSpaces({ map, normalMap, roughnessMap });
      setBedTextures({ map, normalMap, roughnessMap });
    }).catch(() => { /* procedural bed stays */ });
    return () => { cancelled = true; };
  }, [gl]);

  useEffect(() => () => {
    if (bedTextures) {
      bedTextures.map.dispose(); bedTextures.normalMap.dispose(); bedTextures.roughnessMap.dispose();
    }
  }, [bedTextures]);

  const substrate = useMemo(
    () => substrateShader(uniforms, water, bedTextures ?? undefined, { blend: (quality === "HIGH" ? 1 : .5) * .55 }),
    [uniforms, water, bedTextures, quality],
  );

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

  // Driftwood trunk + branch. The scanned CC0 bark set (public/textures/world/wood)
  // is loaded once; until it arrives — or forever, if the request fails — the
  // log keeps a procedural bark shader so the prop never turns flat or white.
  const [logTextures, setLogTextures] = useState<LogTextures | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new TextureLoader();
    const load = (url: string) => new Promise<Texture>((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    Promise.all([
      load("/textures/world/wood/bark-color.jpg"),
      load("/textures/world/wood/bark-normal.jpg"),
      load("/textures/world/wood/bark-roughness.jpg"),
    ]).then(([map, normalMap, roughnessMap]) => {
      if (cancelled) {
        map.dispose(); normalMap.dispose(); roughnessMap.dispose();
        return;
      }
      for (const texture of [map, normalMap, roughnessMap]) {
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.anisotropy = anisotropy;
        // Circumference ~1.2 m, length 3.8 m; this keeps bark features at a
        // believable physical size without obvious tiling.
        // Circumference repeat must be an integer so the cylinder's UV wrap is
        // phase-continuous (no vertical seam stripe at the join). 2 keeps the
        // bark feature density close to the original 1.4.
        texture.repeat.set(2, 2.6);
      }
      declareLogTextureColorSpaces({ map, normalMap, roughnessMap });
      setLogTextures({ map, normalMap, roughnessMap });
    }).catch(() => { /* procedural fallback stays */ });
    return () => { cancelled = true; };
  }, [gl]);

  useEffect(() => () => {
    if (logTextures) {
      logTextures.map.dispose(); logTextures.normalMap.dispose(); logTextures.roughnessMap.dispose();
    }
  }, [logTextures]);

  const logGeometry = useMemo(() => createLogGeometry(), []);
  const branchGeometry = useMemo(() => createLogGeometry({
    length: 1.25, radiusBottom: .075, radiusTop: .035,
    radialSegments: 14, heightSegments: 10, bend: .012, seed: 2,
  }), []);
  useEffect(() => () => logGeometry.dispose(), [logGeometry]);
  useEffect(() => () => branchGeometry.dispose(), [branchGeometry]);

  const logMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    if (logTextures) {
      material.map = logTextures.map;
      material.normalMap = logTextures.normalMap;
      material.roughnessMap = logTextures.roughnessMap;
      material.normalScale.set(1, 1);
    }
    material.onBeforeCompile = logShader(logTextures !== null, water, { dampness: .34 });
    material.customProgramCacheKey = () => logTextures ? "river-log-bark" : "river-log-procedural";
    return material;
  }, [logTextures, water]);
  useEffect(() => () => logMaterial.dispose(), [logMaterial]);

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

  /* eslint-disable react-hooks/immutability */
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
      const snowCount = quality === "HIGH" ? 240 : 80;
      for (let i = 0; i < snowCount; i++) {
        advanceParticle(motion.particles[i], time, motion.previousTime, motion.scratch);
        motion.particles[i].toArray(motion.positions, i * 3);
      }
      for (let i = 0; i < motion.silt.length; i++) {
        const pos = siltParticleAt(motion.silt[i], time, motion.scratch);
        pos.toArray(motion.positions, (240 + i) * 3);  // high tier
        pos.toArray(motion.positions, (80 + i) * 3);   // low tier
      }
      if (particleAttribute.current) particleAttribute.current.needsUpdate = true;
    }
    motion.previousTime = time;
  });
  /* eslint-enable react-hooks/immutability */

  return <group ref={worldGroup} visible={visible} name="PreviewWorld">
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#b0cce0" intensity={.5} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#e0f0f4", "#3a4a38", .85]} />
    <directionalLight ref={keyLight} position={[-6, 9, 3]} color="#ffe9c0" intensity={2.4} />
    <directionalLight ref={fillLight} position={[4, -3, -2]} color="#9ab8cc" intensity={1.2} />
    <directionalLight ref={backlight} position={[-3, 1.5, -7]} color="#bfe0e8" intensity={1.1} />
    <ambientLight ref={underwaterAmbient} name="UnderwaterAmbient" color="#7aa0b0" intensity={0.4} visible={false} />
    <mesh geometry={terrain}>
      <meshStandardMaterial vertexColors roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => bedTextures ? `river-substrate-ground-${quality}` : `river-substrate-${quality}`} />
    </mesh>
    {rockPlans.map((plan, k) => (
      <instancedMesh key={k} ref={mesh => { rockBatches.current[k] = mesh; }} args={[rockGeometries[k], undefined, plan.placements.length]}>
        {boulderMaterial
          ? <primitive object={boulderMaterial} attach="material" />
          : <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => bedTextures ? "river-substrate-ground" : "river-substrate"} />}
      </instancedMesh>
    ))}
    {gravelPlans.map((plan, k) => (
      <instancedMesh key={k} ref={mesh => { gravelBatches.current[k] = mesh; }} args={[gravelGeometries[k], undefined, plan.placements.length]}>
        {pebbleMaterial
          ? <primitive object={pebbleMaterial} attach="material" />
          : <meshStandardMaterial roughness={1} onBeforeCompile={substrate} customProgramCacheKey={() => bedTextures ? "river-substrate-ground" : "river-substrate"} />}
      </instancedMesh>
    ))}
    <instancedMesh ref={plants} args={[plantGeometry, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial color="#3d8b3a" roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <instancedMesh ref={plants2} args={[plantGeometry2, undefined, grassPlacements.length]} frustumCulled={false}>
      <meshStandardMaterial color="#2d6b28" roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants2"} />
    </instancedMesh>
    <group name="DriftwoodLog" position={[-5.4, -2.74, -.8]} rotation={[0, .65, Math.PI / 2 - .07]}>
      <mesh name="DriftwoodTrunk" geometry={logGeometry} material={logMaterial} />
      <mesh name="DriftwoodBranch" geometry={branchGeometry} material={logMaterial} position={[.16, .7, 0]} rotation={[0, 0, -.7]} />
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[24, 18, 32, 24]} />
      {/* shortcut: double-sided Fresnel/glints replace reflection/refraction, not physical water optics. */}
      <shaderMaterial uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} side={DoubleSide} transparent depthWrite={false} />
    </mesh>
    <points frustumCulled={false}>
      <bufferGeometry drawRange={{ start: 0, count: quality === "HIGH" ? 240 + SILT_COUNT.HIGH : 80 + SILT_COUNT.LOW }}>
        <bufferAttribute ref={particleAttribute} attach="attributes-position" args={[motion.positions, 3]} />
      </bufferGeometry>
      <primitive object={particleMaterial} attach="material" />
    </points>
    {quality === "HIGH" && <mesh frustumCulled={false} renderOrder={999} geometry={godRayGeometry} material={godRays} />}
  </group>;
}

