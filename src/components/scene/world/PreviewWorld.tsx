"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AmbientLight, BoxGeometry, BufferAttribute, Color, DirectionalLight, DoubleSide, Fog, Group, HemisphereLight, IcosahedronGeometry, InstancedMesh, MeshStandardMaterial, PlaneGeometry, PointsMaterial, RepeatWrapping, Texture, TextureLoader, Vector3 } from "three";
import { OBSTACLES } from "@/experience/habitat";
import { CLEAR_WATER_ENV, SILTY_WATER_ENV, createUnderwaterEnvironment } from "./underwaterEnv";
import type { PreviewWorldProps } from "@/experience/contracts";
import { currentAt } from "@/experience/current";
import { SILT_COUNT, advanceParticle, bedHeight, brahmaputraBedHeight, createPlacements, createSiltParticles, gangaBedHeight, godavariBedHeight, siltParticleAt, updateAtmosphere, type Placement } from "./worldMotion";
import { declareLogTextureColorSpaces, declareRockTextureColorSpaces, logShader, plantShader, rockShader, substrateShader, surfaceFragment, surfaceVertex, underwaterStandardMaterial, type LogTextures, type RockTextures } from "./materials";
import { applyUnderwaterFog, createWaterOptics, WATER_FOG_FAR, WATER_FOG_NEAR, waterBackground } from "./waterOptics";
import { createGodRayMaterial, godRayStrength, sunScreenPosition } from "./godRays";
import { createGravelGeometry, createLogGeometry, createPlantClumpGeometry, createRockGeometry, fillBatch, planStoneBatches } from "./worldAssets";

export function PreviewWorld({ runtime, quality, visible, water: waterProp, habitat, river }: PreviewWorldProps) {
  const mobile = quality === "LOW";
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.gl);
  const ambient = useRef<AmbientLight>(null), hemisphere = useRef<HemisphereLight>(null);
  const worldGroup = useRef<Group>(null);
  const rockBatches = useRef<(InstancedMesh | null)[]>([]);
  const gravelBatches = useRef<(InstancedMesh | null)[]>([]);
  const plants = useRef<InstancedMesh>(null), plants2 = useRef<InstancedMesh>(null);
  const farRocks = useRef<InstancedMesh>(null), mussels = useRef<InstancedMesh>(null), bricks = useRef<InstancedMesh>(null);
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
  // The tint multiplies a scanned sRGB albedo, so silty limestone pushes the
  // tint near white: multiplying two dark albedos is what made Ganga stone
  // read as black silhouettes.
  const boulderColor = isGanga ? "#e8dcc0" : isBrahmaputra ? "#5f6a63" : "#6b6055";
  const gravelColor = isGanga ? "#f0e6cd" : isBrahmaputra ? "#7c847a" : "#8a7a60";
  const placements = useMemo(() => createPlacements({ seed: habitat?.seed, obstacles: habitat?.obstacles, bedHeight: bedFn, river, habitat, mobile }), [habitat, bedFn, river, mobile]);
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
  const surfaceUniforms = useMemo(() => ({
    uTime: uniforms.time,
    uRichness: uniforms.richness,
    uWaterScatter: water.scatter,
    uWaterAbsorb: water.absorption,
    // Silty rivers: a warm ochre ceiling lit by a strong sun bloom. Clear
    // rivers keep the neutral green-teal sheet.
    uSurfaceTint: { value: new Vector3(...(isGanga ? [1.0, 1.0, 1.0] : [1, 1, 1])) },
    uSunGlow: { value: isGanga ? 1.1 : .35 },
    uSurfaceWarmth: { value: isGanga ? 1 : 0 },
  }), [uniforms, water, isGanga]);
  const plant = useMemo(() => plantShader(uniforms, water), [uniforms, water]);
  const atmosphere = useMemo(() => {
    const background = waterBackground(water);
    return { fog: new Fog(background, WATER_FOG_NEAR, WATER_FOG_FAR), background, previousFog: scene.fog, previousBackground: scene.background, active: false };
  }, [scene, water]);
  const env = useMemo(() => createUnderwaterEnvironment(gl, isGanga ? SILTY_WATER_ENV : CLEAR_WATER_ENV), [gl, isGanga]);
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
  // The bed plane extends far past the fog radius so absorption, not a plane
  // edge, ends the world: 24 x 18 ended inside visible range and read as a
  // painted backdrop behind the school.
  const tw = 128;
  const td = 128;
  const terrain = useMemo(() => {
    const geometry = new PlaneGeometry(tw, td, mobile ? 64 : 128, mobile ? 48 : 96);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3), color = new Color();
    // Ganga silt is khaki/buff; the green palette belongs to the clearer rivers.
    const base = isGanga ? [.30, .26, .17] : [.19, .22, .13];
    const spread = [.10, .08, .05];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      positions.setY(i, bedFn(x, z));
      const silt = .5 + .5 * Math.sin(x * .45 + Math.sin(z * .7));
      color.setRGB(base[0] + silt * spread[0], base[1] + silt * spread[1], base[2] + silt * spread[2]);
      color.toArray(colors, i * 3);
    }
    geometry.setAttribute("color", new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [bedFn, isGanga, mobile]);

  const plantTint = isGanga ? "#c8d480" : "#3d8b3a";
  const understoryTint = isGanga ? "#8fa058" : "#2d6b28";
  useLayoutEffect(() => {
    if (worldGroup.current) worldGroup.current.userData.underwaterEnvironment = env;
  }, [env]);
  useEffect(() => {
    const previousEnvironment = scene.environment;
    if (!visible) updateAtmosphere(scene, atmosphere, false);
    return () => {
      updateAtmosphere(scene, atmosphere, false);
      if (scene.environment === env) scene.environment = previousEnvironment;
    };
  }, [scene, atmosphere, visible, env]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => env.dispose(), [env]);

  // Rock/gravel/plant geometry lives in worldAssets: radial stone relief and
  // rooted multi-blade clumps with per-vertex wind, phase and leaf shading.
  // One geometry variant per batch: bucket 0 keeps the legacy seed-0 shape.
  const rockGeometries = useMemo(() => rockPlans.map(plan => createRockGeometry(plan.seed)), [rockPlans]);
  const gravelGeometries = useMemo(() => gravelPlans.map(plan => createGravelGeometry(plan.seed)), [gravelPlans]);
  useEffect(() => () => rockGeometries.forEach(geometry => geometry.dispose()), [rockGeometries]);
  useEffect(() => () => gravelGeometries.forEach(geometry => geometry.dispose()), [gravelGeometries]);

  const plantGeometry = useMemo(() => createPlantClumpGeometry(isGanga ? "tape" : "ribbon"), [isGanga]);
  const plantGeometry2 = useMemo(() => createPlantClumpGeometry("grass"), []);
  useEffect(() => () => plantGeometry.dispose(), [plantGeometry]);
  useEffect(() => () => plantGeometry2.dispose(), [plantGeometry2]);

  // Distance layer: broad low boulders at 12-18 m sit inside the absorption
  // range and read as a bank receding into murk. Without them the fog wall has
  // no silhouette to break it and the scene reads as a painted backdrop.
  const farRockPlacements = useMemo<Placement[]>(() => {
    if (mobile || !isGanga) return [];
    return [
    { position: [-16, -3.4, -16], scale: [4.6, 2.6, 4.0], rotation: .7 },
    { position: [-6, -3.5, -18], scale: [4.0, 2.2, 3.6], rotation: 2.1 },
    { position: [3, -3.35, -17], scale: [5.2, 2.8, 4.2], rotation: .3 },
    { position: [12, -3.45, -15], scale: [4.4, 2.4, 3.8], rotation: 1.4 },
    { position: [22, -3.4, -10], scale: [4.8, 2.6, 4.0], rotation: .9 },
    { position: [-24, -3.4, -9], scale: [5.0, 2.6, 4.2], rotation: 1.8 },
    ];
  }, [isGanga, mobile]);

  // Bottom life: freshwater mussels half-sunk in the silt, in loose beds where
  // the current keeps the sediment thin. Static, so they cost one instanced draw.
  const musselPlacements = useMemo<Placement[]>(() => {
    if (mobile || !isGanga) return [];
    const spots: [number, number][] = [[-4.6, 1.2], [-4.2, 1.9], [-5.1, .4], [-3.4, -1.6], [-6.2, -2.4], [1.8, -3.4], [2.4, -2.8], [7.1, 1.2], [6.6, 2.0], [-1.2, 4.4], [-8.4, -.6], [3.9, 3.6]];
    return spots.map(([x, z], i) => ({
      position: [x, bedFn(x, z) - .012, z],
      scale: [.15 + (i % 3) * .02, .055, .095],
      rotation: i * 1.7,
    }));
  }, [isGanga, bedFn, mobile]);

  // Ghat debris: a few half-buried bricks and tiles near the driftwood. The
  // human trace a river keeps — subtle, but it places the scene on the Ganga.
  const brickPlacements = useMemo<Placement[]>(() => {
    if (mobile || !isGanga) return [];
    const spots: [number, number, number][] = [[-6.1, -1.9, .3], [-5.7, -.9, 1.1], [-6.6, -.2, .7], [-4.9, -2.3, .4], [2.9, -5.2, .9], [3.4, -5.0, .2]];
    return spots.map(([x, z, rotation]) => ({
      position: [x, bedFn(x, z) + .012, z],
      scale: [.24, .045, .115],
      rotation,
    }));
  }, [isGanga, bedFn, mobile]);

  const musselGeometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const brickGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useEffect(() => () => { musselGeometry.dispose(); brickGeometry.dispose(); }, [musselGeometry, brickGeometry]);
  const musselMaterial = useMemo(() => underwaterStandardMaterial("#8a8763", water, { roughness: .72 }), [water]);
  const brickMaterial = useMemo(() => underwaterStandardMaterial("#a97e5e", water, { roughness: .95 }), [water]);
  useEffect(() => () => { musselMaterial.dispose(); brickMaterial.dispose(); }, [musselMaterial, brickMaterial]);

  useLayoutEffect(() => {
    // First OBSTACLES.length rocks are the swim-through boulders: exact placement.
    rockPlans.forEach((plan, k) => fillBatch(rockBatches.current[k], plan.placements, boulderColor, { spin: true, stretch: true, skipFirst: plan.skipFirst, variationIndices: plan.sourceIndices }));
    gravelPlans.forEach((plan, k) => fillBatch(gravelBatches.current[k], plan.placements, gravelColor, { spin: true, colorSpread: .42, variationIndices: plan.sourceIndices }));
    fillBatch(plants.current, placements.plants, plantTint, { stretch: true, stretchAmount: .1, colorSpread: .18, colorSalt: 31 });
    fillBatch(plants2.current, grassPlacements, understoryTint, { stretch: true, stretchAmount: .12, colorSpread: .16, colorSalt: 47 });
    fillBatch(farRocks.current, farRockPlacements, isGanga ? "#d8ccb2" : boulderColor, { spin: true, stretch: true, colorSpread: .3 });
    fillBatch(mussels.current, musselPlacements, "#e6e2c8", { colorSpread: .35, colorSalt: 61 });
    fillBatch(bricks.current, brickPlacements, "#e8d6c4", { colorSpread: .25, colorSalt: 23 });
  }, [rockPlans, gravelPlans, placements, grassPlacements, boulderColor, gravelColor, plantTint, understoryTint, farRockPlacements, musselPlacements, brickPlacements, isGanga]);

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
    () => substrateShader(uniforms, water, bedTextures ?? undefined, {
      blend: isGanga ? 0 : (quality === "HIGH" ? 1 : .5) * .55,
      wetTint: isGanga ? [0.95, 0.87, 0.72] : undefined,
      algae: isGanga ? .06 : undefined,
      caustic: isGanga ? [0.11, 0.10, 0.07] : undefined,
    }),
    [uniforms, water, bedTextures, quality, isGanga],
  );

  // Scanned-triplanar materials: one program per stone kind; instance colors
  // from fillBatch still tint the scanned albedo. Metalness stays 0 (stone).
  const boulderMaterial = useMemo(() => {
    if (!rockTextures) return null;
    const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    material.onBeforeCompile = rockShader(rockTextures, uniforms, { scale: .38, dampness: .12, brightness: isGanga ? 1.6 : 1 }, water);
    material.customProgramCacheKey = () => "river-rock-boulder" + (isGanga ? "-ganga" : "");
    return material;
  }, [rockTextures, uniforms, water, isGanga]);
  const pebbleMaterial = useMemo(() => {
    if (!rockTextures) return null;
    const material = new MeshStandardMaterial({ roughness: 1, metalness: 0 });
    material.onBeforeCompile = rockShader(rockTextures, uniforms, { scale: .9, dampness: .12, brightness: isGanga ? 1.6 : 1 }, water);
    material.customProgramCacheKey = () => "river-rock-pebble" + (isGanga ? "-ganga" : "");
    return material;
  }, [rockTextures, uniforms, water, isGanga]);
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
    const material = new PointsMaterial({ color: isGanga ? "#d9ccae" : "#cfe0c0", size: .03, transparent: true, opacity: .3, depthWrite: false, sizeAttenuation: true });
    material.onBeforeCompile = shader => applyUnderwaterFog(shader, water);
    material.customProgramCacheKey = () => "river-marine-snow";
    return material;
  }, [water, isGanga]);
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
    if (fillLight.current) fillLight.current.intensity = .65 * sunScale;
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
        pos.toArray(motion.positions, (snowCount + i) * 3);
      }
      if (particleAttribute.current) particleAttribute.current.needsUpdate = true;
    }
    motion.previousTime = time;
  });
  /* eslint-enable react-hooks/immutability */

  return <group ref={worldGroup} visible={visible} name="PreviewWorld">
    <ambientLight ref={ambient} name="AboveWaterAmbient" color="#b0cce0" intensity={.5} />
    <hemisphereLight ref={hemisphere} name="AboveWaterHemisphere" args={["#e0f0f4", "#3a4a38", .85]} />
    <directionalLight ref={keyLight} position={[-6, 9, 3]} color={isGanga ? "#e8d0a0" : "#ffe9c0"} intensity={2.4} />
    <directionalLight ref={fillLight} position={[4, -3, -2]} color={isGanga ? "#b5a57a" : "#9ab8cc"} intensity={.65} />
    <directionalLight ref={backlight} position={[-3, 1.5, -7]} color={isGanga ? "#c4b48a" : "#bfe0e8"} intensity={1.1} />
    <ambientLight ref={underwaterAmbient} name="UnderwaterAmbient" color={isGanga ? "#9a8f6e" : "#7aa0b0"} intensity={isGanga ? 0.55 : 0.4} visible={false} />
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
    {farRockPlacements.length > 0 && (
      <instancedMesh ref={farRocks} args={[rockGeometries[0], undefined, farRockPlacements.length]} frustumCulled={false}>
        {boulderMaterial
          ? <primitive object={boulderMaterial} attach="material" />
          : <meshStandardMaterial roughness={.92} onBeforeCompile={substrate} customProgramCacheKey={() => "river-substrate-far"} />}
      </instancedMesh>
    )}
    {musselPlacements.length > 0 && <instancedMesh ref={mussels} args={[musselGeometry, musselMaterial, musselPlacements.length]} frustumCulled={false} />}
    {brickPlacements.length > 0 && <instancedMesh ref={bricks} args={[brickGeometry, brickMaterial, brickPlacements.length]} frustumCulled={false} />}
    <instancedMesh ref={plants} args={[plantGeometry, undefined, placements.plants.length]} frustumCulled={false}>
      <meshStandardMaterial color={plantTint} roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants"} />
    </instancedMesh>
    <instancedMesh ref={plants2} args={[plantGeometry2, undefined, grassPlacements.length]} frustumCulled={false}>
      <meshStandardMaterial color={understoryTint} roughness={.75} side={DoubleSide} vertexColors onBeforeCompile={plant} customProgramCacheKey={() => "river-plants2"} />
    </instancedMesh>
    <group name="DriftwoodLog" position={[-5.4, -2.74, -.8]} rotation={[0, .65, Math.PI / 2 - .07]}>
      <mesh name="DriftwoodTrunk" geometry={logGeometry} material={logMaterial} />
      <mesh name="DriftwoodBranch" geometry={branchGeometry} material={logMaterial} position={[.16, .7, 0]} rotation={[0, 0, -.7]} />
    </group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[mobile ? 80 : 160, mobile ? 80 : 160, mobile ? 24 : 48, mobile ? 24 : 48]} />
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

