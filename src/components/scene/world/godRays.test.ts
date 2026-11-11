import { describe, expect, it } from "vitest";
import { AdditiveBlending, PerspectiveCamera, ShaderMaterial, Vector3 } from "three";
import { createGodRayMaterial, godRayFragment, godRayVertex, godRayStrength, sunScreenPosition, SUN_DIRECTION } from "./godRays";

function cameraAimed(along: Vector3) {
  const camera = new PerspectiveCamera(60, 1, .1, 100);
  camera.position.set(0, -1.2, 0);
  camera.lookAt(camera.position.clone().addScaledVector(along, 10));
  camera.updateMatrixWorld();
  return camera;
}

describe("god ray shader", () => {
  it("draws a clip-space overlay that ignores the camera transform", () => {
    expect(godRayVertex).toContain("gl_Position = vec4(position.xy, 0.999, 1.0)");
    expect(godRayVertex).toContain("vGodUv");
  });

  it("fans radial streaks from the projected sun and honours richness", () => {
    expect(godRayFragment).toContain("uSunScreen");
    expect(godRayFragment).toContain("uRichness");
    expect(godRayFragment).toContain("vGodUv");
    expect(godRayFragment).toContain("atan(");
    expect(godRayFragment).toContain("discard");
  });

  it("does not premultiply alpha, which additive blending would square", () => {
    expect(godRayFragment).toContain("vec4(vec3(0.85, 0.95, 0.80), alpha)");
    expect(godRayFragment).not.toContain("* alpha, alpha");
  });

  it("builds an additive, depth-free material around the shared uniforms", () => {
    const uniforms = { uSunScreen: { value: new Vector3() }, uWorldTime: { value: 0 }, uRichness: { value: 1 } };
    const material = createGodRayMaterial(uniforms);
    expect(material).toBeInstanceOf(ShaderMaterial);
    expect(material.blending).toBe(AdditiveBlending);
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.uniforms.uSunScreen).toBe(uniforms.uSunScreen);
    material.dispose();
  });
});

describe("godRayStrength", () => {
  it("gates shafts to the HIGH tier while underwater", () => {
    expect(godRayStrength("HIGH", true)).toBe(0.35);
    expect(godRayStrength("HIGH", false)).toBe(0);
    expect(godRayStrength("LOW", true)).toBe(0);
    expect(godRayStrength("LOW", false)).toBe(0);
  });
});

describe("sunScreenPosition", () => {
  it("projects the drifting sun to the centre of a camera aimed at it", () => {
    const out = sunScreenPosition(cameraAimed(SUN_DIRECTION), 0, new Vector3());
    expect(out.z).toBe(1);
    expect(Math.abs(out.x)).toBeLessThan(.02);
    expect(Math.abs(out.y)).toBeLessThan(.02);
  });

  it("reports zero strength when the camera faces away from the sun", () => {
    const out = sunScreenPosition(cameraAimed(SUN_DIRECTION.clone().negate()), 0, new Vector3());
    expect(out.z).toBe(0);
  });
});
