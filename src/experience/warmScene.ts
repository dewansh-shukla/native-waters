import { Fog, type Camera, type Object3D, type Scene, type WebGLRenderer } from "three";

export function warmScene(gl: Pick<WebGLRenderer, "compile" | "compileAsync" | "info" | "getContext">, scene: Scene, camera: Camera, group: Object3D): Promise<void> {
  const visibility: [Object3D, boolean][] = [];
  const fog = scene.fog;
  const environment = scene.environment;
  const cameraPose = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone() };
  const pending: Promise<unknown>[] = [];
  function visible(object: Object3D, value: boolean) {
    if (!visibility.some(([saved]) => saved === object)) visibility.push([object, object.visible]);
    object.visible = value;
  }
  try {
    const map = group.getObjectByName("MapView"), water = group.getObjectByName("WaterView");
    const world = group.getObjectByName("PreviewWorld");
    const ambient = group.getObjectByName("AboveWaterAmbient"), hemisphere = group.getObjectByName("AboveWaterHemisphere");
    const underwaterAmbient = group.getObjectByName("UnderwaterAmbient");
    const underwaterEnvironment = world?.userData.underwaterEnvironment;
    if (!map || !water || !world || !ambient || !hemisphere || !underwaterAmbient || !underwaterEnvironment) {
      throw new Error("Missing warm-up scene handles");
    }
    // Three compiles hidden materials already; only real lighting/fog variants need staging.
    for (const variant of ["map", "above", "underwater"]) {
      if (variant !== "map") {
        // Compile from the actual world camera, not the geographic overview.
        camera.up.set(0, 1, 0);
        if (variant === "above") {
          camera.position.set(0, 1.7, 4.5);
          camera.lookAt(0, 0, -1.8);
        } else {
          camera.position.set(0, -1.1, 2.8);
          camera.lookAt(0, -1.5, -2);
        }
        camera.updateMatrixWorld();
      }
      visible(map, variant === "map"); visible(water, variant !== "map"); visible(world, variant !== "map");
      visible(ambient, variant !== "underwater"); visible(hemisphere, variant !== "underwater");
      visible(underwaterAmbient, variant === "underwater");
      scene.fog = variant === "underwater" ? new Fog("#214538", 7, 38) : null;
      scene.environment = variant === "underwater" ? underwaterEnvironment : null;
      pending.push(typeof gl.compileAsync === "function" ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera)));
    }
  } catch (error) {
    // Observe prior asynchronous work even if a later variant throws synchronously.
    pending.push(Promise.reject(error));
  } finally {
    for (const [object, value] of visibility) object.visible = value;
    scene.fog = fog;
    scene.environment = environment;
    camera.position.copy(cameraPose.position);
    camera.quaternion.copy(cameraPose.quaternion);
    camera.up.copy(cameraPose.up);
    camera.updateMatrixWorld();
  }
  return Promise.all(pending).then(() => {
    const context = gl.getContext();
    for (const program of gl.info.programs ?? []) {
      // Three's compileAsync checks completion only, not whether native linking succeeded.
      if (!context.getProgramParameter(program.program as WebGLProgram, context.LINK_STATUS)) throw new Error("Shader link failed");
    }
  });
}
