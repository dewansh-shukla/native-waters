import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { prepareFishMaterials } from "./fishMaterials";

function meshNamed(name: string) {
  return new Mesh(new SphereGeometry(1, 8, 8), new MeshStandardMaterial({ name }));
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
});
