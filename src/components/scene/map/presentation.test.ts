import { expect, it } from "vitest";
import { Group, MeshStandardMaterial } from "three";
import { updateMapPresentation } from "./presentation";

it("fades materials in-place from runtime progress and hides without discarding objects", () => {
  const group = new Group();
  const material = new MeshStandardMaterial();
  const layers = [{ material, opacity: 0.4 }];
  updateMapPresentation(group, layers, true, 0.25);
  expect(group.visible).toBe(true);
  expect(material.opacity).toBeCloseTo(0.3);
  updateMapPresentation(group, layers, false, 0.5);
  expect(group.visible).toBe(false);
  updateMapPresentation(group, layers, true, 0);
  expect(group.visible).toBe(true);
  expect(material.opacity).toBe(0.4);
  updateMapPresentation(group, layers, true, 1);
  expect(group.visible).toBe(false);
  updateMapPresentation(group, layers, true, Number.NaN);
  expect(material.opacity).toBe(0.4);
});
