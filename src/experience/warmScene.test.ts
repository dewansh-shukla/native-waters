import { expect, test, vi } from "vitest";
import { AmbientLight, DirectionalLight, Fog, Group, HemisphereLight, Light, PerspectiveCamera, Scene, Texture, type WebGLRenderer } from "three";
import { warmScene } from "./warmScene";

function setup() {
  const scene = new Scene(), group = new Group(), map = new Group(), water = new Group();
  map.name = "MapView"; water.name = "WaterView"; water.visible = false;
  map.add(new AmbientLight(), new DirectionalLight());
  const ambient = new AmbientLight(), hemisphere = new HemisphereLight(), underwaterAmbient = new AmbientLight();
  ambient.name = "AboveWaterAmbient"; hemisphere.name = "AboveWaterHemisphere";
  underwaterAmbient.name = "UnderwaterAmbient"; underwaterAmbient.visible = false;
  const world = new Group(); world.name = "PreviewWorld"; world.visible = false;
  world.userData.underwaterEnvironment = new Texture();
  world.add(ambient, hemisphere, underwaterAmbient, new DirectionalLight()); water.add(world);
  const hiddenFish = new Group(); hiddenFish.visible = false; water.add(hiddenFish);
  group.add(map, water); scene.add(group);
  const context = { LINK_STATUS: 35714, getProgramParameter: vi.fn(() => true) };
  const renderer = {
    getContext: () => context,
    info: { programs: [{ program: {} }] },
  };
  return { scene, group, map, water, ambient, hemisphere, underwaterAmbient, hiddenFish, context, renderer };
}
test("warms actual map, above-water and underwater light/fog/environment variants and restores before pending completion", async () => {
  const s = setup(); const originalFog = new Fog("#abcdef", 1, 9); const originalEnvironment = new Texture();
  s.scene.fog = originalFog; s.scene.environment = originalEnvironment;
  const camera = new PerspectiveCamera();
  const configurations: { lights: string[]; fog: unknown; fishVisible: boolean; environment: unknown; cameraY: number; culled: boolean }[] = [];
  let resolve!: () => void;
  const wait = new Promise<void>(done => { resolve = done; });
  const compileAsync = vi.fn(() => {
    const lights: string[] = [];
    s.scene.traverseVisible(object => { if (object instanceof Light) lights.push(object.type); });
    const fog = s.scene.fog;
    configurations.push({ lights: lights.sort(), fog: fog instanceof Fog ? [fog.color.getHexString(), fog.near, fog.far] : fog,
      fishVisible: s.hiddenFish.visible,
      environment: s.scene.environment === s.group.getObjectByName("PreviewWorld")!.userData.underwaterEnvironment
        ? "underwater" : s.scene.environment === null ? null : "other", cameraY: camera.position.y,
      culled: s.hiddenFish.frustumCulled });
    return wait;
  });
  const result = warmScene({ ...s.renderer, compileAsync } as unknown as WebGLRenderer, s.scene, camera, s.group);
  expect(s.map.visible).toBe(true); expect(s.water.visible).toBe(false);
  expect(s.ambient.visible).toBe(true); expect(s.hemisphere.visible).toBe(true);
  expect(s.scene.fog).toBe(originalFog); expect(s.scene.environment).toBe(originalEnvironment);
  expect(s.underwaterAmbient.visible).toBe(false); expect(s.hiddenFish.visible).toBe(false);
  expect(s.hiddenFish.frustumCulled).toBe(true);
  expect(configurations).toEqual([
    { lights: ["AmbientLight", "DirectionalLight"], fog: null, fishVisible: false, environment: null, cameraY: 0, culled: true },
    { lights: ["AmbientLight", "DirectionalLight", "HemisphereLight"], fog: null, fishVisible: false, environment: null, cameraY: 1.7, culled: true },
    { lights: ["AmbientLight", "DirectionalLight"], fog: ["59634a", 4, 23], fishVisible: false,
      environment: "underwater", cameraY: -1.1, culled: true },
  ]);
  expect(s.scene.environment).toBe(originalEnvironment);
  resolve(); await result;
});
test("resolved compileAsync with a failed native LINK_STATUS rejects rather than declaring Ready", async () => {
  const s = setup(); s.context.getProgramParameter.mockReturnValue(false);
  await expect(warmScene({ ...s.renderer, compileAsync: () => Promise.resolve(s.scene) } as unknown as WebGLRenderer,
    s.scene, new PerspectiveCamera(), s.group)).rejects.toThrow("Shader link failed");
  expect(s.context.getProgramParameter).toHaveBeenCalledWith(s.renderer.info.programs[0].program, 35714);
});
test("sync fallback validates links and synchronous shader errors restore state", async () => {
  const s = setup(); const compile = vi.fn();
  await warmScene({ ...s.renderer, compile } as unknown as WebGLRenderer, s.scene, new PerspectiveCamera(), s.group);
  expect(compile).toHaveBeenCalledTimes(3); expect(s.water.visible).toBe(false);
  await expect(warmScene({ ...s.renderer, compileAsync: () => { throw new Error("bad shader"); } } as unknown as WebGLRenderer,
    s.scene, new PerspectiveCamera(), s.group)).rejects.toThrow("bad shader");
  expect(s.map.visible).toBe(true); expect(s.water.visible).toBe(false); expect(s.scene.fog).toBeNull();
});
