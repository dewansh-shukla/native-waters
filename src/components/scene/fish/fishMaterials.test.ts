import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { prepareFishMaterials } from "./fishMaterials";
import { createWaterOptics } from "../world/waterOptics";

function meshNamed(name: string) {
  return new Mesh(new SphereGeometry(1, 8, 8), new MeshStandardMaterial({ name }));
}

function runInjection(material: MeshStandardMaterial) {
  const shader = { vertexShader: "", fragmentShader: "#include <fog_fragment>", uniforms: {} as Record<string, unknown> };
  material.onBeforeCompile?.(shader as never, undefined as never);
  return shader;
}

describe("prepareFishMaterials", () => {
  it("gives the wet body a strong environment response and the fins a weak one", () => {
    const body = meshNamed("FishBody");
    const fin = meshNamed("FishFin");
    const eye = meshNamed("FishEye");
    const cornea = meshNamed("FishCornea");
    const plain = meshNamed("SomethingElse");
    const root = new Group();
    root.add(body, fin, eye, cornea, plain);

    prepareFishMaterials(root);

    expect((body.material as MeshStandardMaterial).envMapIntensity).toBe(0.8);
    expect((fin.material as MeshStandardMaterial).envMapIntensity).toBe(0.4);
    expect((eye.material as MeshStandardMaterial).envMapIntensity).toBe(1);
    expect((cornea.material as MeshStandardMaterial).envMapIntensity).toBe(1);
    expect((plain.material as MeshStandardMaterial).envMapIntensity).toBe(1);
  });

  it("is idempotent across repeated calls on a shared cached scene", () => {
    const body = meshNamed("FishBody");
    const root = new Group();
    root.add(body);

    prepareFishMaterials(root);
    prepareFishMaterials(root);

    expect((body.material as MeshStandardMaterial).envMapIntensity).toBe(0.8);
  });

  it("applies per-channel water absorption to body and fin when water optics are provided", () => {
    const body = meshNamed("FishBody"), fin = meshNamed("FishFin"), eye = meshNamed("FishEye");
    const root = new Group();
    root.add(body, fin, eye);

    prepareFishMaterials(root, createWaterOptics());

    for (const mesh of [body, fin]) {
      const material = mesh.material as MeshStandardMaterial;
      expect(material.customProgramCacheKey()).toBe("fish-underwater-fog");
      const shader = runInjection(material);
      expect(shader.fragmentShader).toContain("uWaterAbsorb");
      expect(shader.fragmentShader).not.toContain("#include <fog_fragment>");
    }
    expect((eye.material as MeshStandardMaterial).customProgramCacheKey()).not.toBe("fish-underwater-fog");
    expect(runInjection(eye.material as MeshStandardMaterial).fragmentShader).toContain("#include <fog_fragment>");
  });

  it("leaves materials on the default pipeline when no water optics are given", () => {
    const body = meshNamed("FishBody");
    const root = new Group();
    root.add(body);

    prepareFishMaterials(root);

    const material = body.material as MeshStandardMaterial;
    expect(material.customProgramCacheKey()).not.toBe("fish-underwater-fog");
    expect(runInjection(material).fragmentShader).toContain("#include <fog_fragment>");
  });
});
