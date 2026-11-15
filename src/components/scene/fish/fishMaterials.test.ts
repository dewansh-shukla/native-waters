import { describe, expect, it } from "vitest";
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { prepareFishMaterials } from "./fishMaterials";
import { shimmerClock, updateFishShimmer } from "./bodyShimmer";
import { createWaterOptics } from "../world/waterOptics";

function meshNamed(name: string) {
  return new Mesh(new SphereGeometry(1, 8, 8), new MeshStandardMaterial({ name }));
}

function runInjection(material: MeshStandardMaterial) {
  const shader = {
    vertexShader: "#include <common>\n#include <project_vertex>\n",
    fragmentShader:
      "#include <common>\n#include <color_fragment>\n#include <fog_fragment>\n",
    uniforms: {} as Record<string, unknown>,
  };
  material.onBeforeCompile?.(shader as never, undefined as never);
  return shader;
}

// The animated silver body: iridescence from the view angle, scale glints and
// caustic dappling driven by a clock uniform. HIGH detail tier only, and only
// ever on the body — fins stay clear glass and eyes stay optics.
describe("body shimmer (high detail)", () => {
  it("animates the body surface on the high tier and leaves fins and eyes alone", () => {
    const body = meshNamed("FishBody");
    const fin = meshNamed("FishFin");
    const eye = meshNamed("FishEye");
    const root = new Group();
    root.add(body, fin, eye);

    prepareFishMaterials(root, createWaterOptics(), { detail: "high" });

    const bodyShader = runInjection(body.material as MeshStandardMaterial);
    expect(bodyShader.fragmentShader).toContain("uShimmerTime");
    expect(bodyShader.fragmentShader).toContain("vShimmerWorld");
    expect(bodyShader.vertexShader).toContain("vShimmerLocal");
    expect((body.material as MeshStandardMaterial).customProgramCacheKey()).toBe(
      "fish-body-shimmer-fog",
    );
    for (const material of [fin, eye] as const) {
      const shader = runInjection(material.material as MeshStandardMaterial);
      expect(shader.fragmentShader).not.toContain("uShimmerTime");
    }
    expect((fin.material as MeshStandardMaterial).customProgramCacheKey()).toBe(
      "fish-underwater-fog",
    );
  });

  it("keeps the low tier on the shared fog pipeline", () => {
    const body = meshNamed("FishBody");
    const root = new Group();
    root.add(body);

    prepareFishMaterials(root, createWaterOptics(), { detail: "low" });

    const material = body.material as MeshStandardMaterial;
    expect(material.customProgramCacheKey()).toBe("fish-underwater-fog");
    expect(runInjection(material).fragmentShader).not.toContain("uShimmerTime");
  });

  it("shimmers without water optics and leaves the fog pipeline untouched", () => {
    const body = meshNamed("FishBody");
    const root = new Group();
    root.add(body);

    prepareFishMaterials(root, undefined, { detail: "high" });

    const material = body.material as MeshStandardMaterial;
    expect(material.customProgramCacheKey()).toBe("fish-body-shimmer");
    const shader = runInjection(material);
    expect(shader.fragmentShader).toContain("uShimmerTime");
    expect(shader.fragmentShader).toContain("#include <fog_fragment>");
  });

  it("drives the body clock through updateFishShimmer", () => {
    const body = meshNamed("FishBody");
    const plain = meshNamed("SomethingElse");
    const root = new Group();
    root.add(body, plain);

    prepareFishMaterials(root, undefined, { detail: "high" });
    updateFishShimmer(root, 3.5);

    expect(shimmerClock(body.material as MeshStandardMaterial)?.value).toBe(3.5);
    expect(shimmerClock(plain.material as MeshStandardMaterial)).toBeNull();
  });

  it("ticks shimmer forward without a prepare call on unrelated scenes", () => {
    const plain = meshNamed("FishBody");
    const root = new Group();
    root.add(plain);
    expect(() => updateFishShimmer(root, 1)).not.toThrow();
    expect(shimmerClock(plain.material as MeshStandardMaterial)).toBeNull();
  });
});

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

  it("absorbs descriptive study-fish skin and fin materials but keeps eye optics clear", () => {
    const skin = meshNamed("Icy silver barred skin");
    const fin = meshNamed("Blue smoke translucent fin membrane");
    const cornea = meshNamed("Glossy corneal surface");
    const pupil = meshNamed("Black pupil");
    const root = new Group();
    root.add(skin, fin, cornea, pupil);

    prepareFishMaterials(root, createWaterOptics());

    for (const mesh of [skin, fin]) {
      const material = mesh.material as MeshStandardMaterial;
      expect(material.customProgramCacheKey()).toBe("fish-underwater-fog");
      expect(runInjection(material).fragmentShader).toContain("uWaterAbsorb");
    }
    for (const mesh of [cornea, pupil]) {
      const material = mesh.material as MeshStandardMaterial;
      expect(material.customProgramCacheKey()).not.toBe("fish-underwater-fog");
      expect(runInjection(material).fragmentShader).toContain("#include <fog_fragment>");
    }
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
