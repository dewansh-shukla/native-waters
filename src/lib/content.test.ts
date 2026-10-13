import { describe, expect, it } from "vitest";
import { loadPipelineFixture, parsePipelineFixture } from "@/lib/content";

const validFixture = {
  id: "pipeline-test",
  label: "Pipeline test — not a real species",
  disclaimer: "Demonstrates asset loading and animation, not verified anatomy or ecology.",
  modelUrl: "/models/pipeline-test.glb",
};

describe("parsePipelineFixture", () => {
  it("preserves the valid fixture fields", () => {
    expect(parsePipelineFixture(validFixture)).toEqual(validFixture);
  });

  it("accepts safe nested model paths", () => {
    expect(parsePipelineFixture({ ...validFixture, modelUrl: "/models/tests/fish-v1.2.glb" }).modelUrl)
      .toBe("/models/tests/fish-v1.2.glb");
  });

  it.each([null, [], "fixture", 42, true, undefined])("rejects non-object input %j", (input) => {
    expect(() => parsePipelineFixture(input)).toThrow(/fixture.*object/i);
  });

  for (const field of ["id", "label", "disclaimer", "modelUrl"] as const) {
    it(`rejects missing ${field}`, () => {
      const input: Partial<typeof validFixture> = { ...validFixture };
      delete input[field];
      expect(() => parsePipelineFixture(input)).toThrow(new RegExp(`${field}.*nonblank string`, "i"));
    });

    it.each(["", " \t\n", null, 42, false, {}, []])(`rejects invalid ${field}: %j`, (value) => {
      expect(() => parsePipelineFixture({ ...validFixture, [field]: value }))
        .toThrow(new RegExp(`${field}.*nonblank string`, "i"));
    });
  }

  it.each([
    "https://example.com/models/fish.glb",
    "//example.com/models/fish.glb",
    "/models/../x.glb",
    "/models/./x.glb",
    "/models/%2e%2e/x.glb",
    "/models/%252e%252e/x.glb",
    "/models/fish%2eglb",
    "/models/folder\\fish.glb",
    "/models/fish.glb?version=1",
    "/models/fish.glb#animation",
    "/models/fish.gltf",
    "/models/fish.GLB",
    "/models//fish.glb",
    "/models/folder//fish.glb",
    "/models/fish.glb/",
    "/other/fish.glb",
    "models/fish.glb",
    "/models/fish name.glb",
    "/models/fish.glb\n",
  ])("rejects unsafe modelUrl %j", (modelUrl) => {
    expect(() => parsePipelineFixture({ ...validFixture, modelUrl }))
      .toThrow(/modelUrl.*local.*\/models\/.*\.glb/i);
  });
});

describe("loadPipelineFixture", () => {
  it("loads the reference study without claiming verified species or habitat", () => {
    const fixture = loadPipelineFixture();
    expect(fixture).toEqual({
      id: "polar-parrot-study",
      label: "Polar parrot — reference study",
      disclaimer: "Visual study based on a supplied reference; not a verified native Indian species or production asset.",
      modelUrl: "/models/polar-parrot-study-v1.glb",
    });
    expect(parsePipelineFixture(fixture)).toEqual(fixture);
  });
});
