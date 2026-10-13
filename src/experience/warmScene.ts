import { Fog, type Camera, type Object3D, type Scene, type WebGLRenderer } from "three";

export function warmScene(gl: Pick<WebGLRenderer, "compile" | "compileAsync" | "info" | "getContext">, scene: Scene, camera: Camera, group: Object3D): Promise<void> {
  const visibility: [Object3D, boolean][] = [];
  const fog = scene.fog;
  const pending: Promise<unknown>[] = [];
  function visible(object: Object3D, value: boolean) {
    if (!visibility.some(([saved]) => saved === object)) visibility.push([object, object.visible]);
    object.visible = value;
  }
  try {
    const map = group.getObjectByName("MapView"), water = group.getObjectByName("WaterView");
    const world = group.getObjectByName("PreviewWorld");
    const ambient = group.getObjectByName("AboveWaterAmbient"), hemisphere = group.getObjectByName("AboveWaterHemisphere");
    if (!map || !water || !world || !ambient || !hemisphere) throw new Error("Missing warm-up scene handles");
    // Three compiles hidden materials already; only real lighting/fog variants need staging.
    for (const variant of ["map", "above", "underwater"]) {
      visible(map, variant === "map"); visible(water, variant !== "map"); visible(world, variant !== "map");
      visible(ambient, variant !== "underwater"); visible(hemisphere, variant !== "underwater");
      scene.fog = variant === "underwater" ? new Fog("#59634a", 4, 23) : null;
      pending.push(typeof gl.compileAsync === "function" ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera)));
    }
  } catch (error) {
    // Observe prior asynchronous work even if a later variant throws synchronously.
    pending.push(Promise.reject(error));
  } finally {
    for (const [object, value] of visibility) object.visible = value;
    scene.fog = fog;
  }
  return Promise.all(pending).then(() => {
    const context = gl.getContext();
    for (const program of gl.info.programs ?? []) {
      // Three's compileAsync checks completion only, not whether native linking succeeded.
      if (!context.getProgramParameter(program.program as WebGLProgram, context.LINK_STATUS)) throw new Error("Shader link failed");
    }
  });
}
