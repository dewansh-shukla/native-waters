import { Object3D, Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  bodyBend,
  driveFins,
  gillHz,
  pectoralRowHz,
  pectoralTuck,
  turnFlare,
  waveGain,
} from "./finMotion";
import { beatFrequency } from "./motion";

describe("waveGain", () => {
  it("rises monotonically with speed and stays bounded", () => {
    expect(waveGain(1.6)).toBeGreaterThan(waveGain(0.7));
    for (const blps of [0, 0.7, 1.2, 1.7, 3, 10]) {
      expect(waveGain(blps)).toBeGreaterThanOrEqual(0.7);
      expect(waveGain(blps)).toBeLessThanOrEqual(1.25);
    }
  });
});

describe("gait", () => {
  it("tucks pectorals by cruise and rows them when slow", () => {
    expect(pectoralTuck(0.7)).toBeLessThan(0.2);
    expect(pectoralTuck(1.7)).toBeGreaterThan(0.7);
    expect(pectoralRowHz(1.7)).toBeLessThan(pectoralRowHz(0.7));
  });

  it("keeps gill rate independent of tail beat", () => {
    const gills = [gillHz(0.7), gillHz(1.7)];
    const beats = [beatFrequency(0.7 * 0.36, 0.36), beatFrequency(1.7 * 0.36, 0.36)];
    expect(Math.max(...gills)).toBeLessThan(Math.min(...beats));
    expect(Math.max(...gills) / Math.min(...gills)).toBeLessThan(2);
  });
});

describe("turn", () => {
  it("caps flare and bend symmetrically", () => {
    expect(turnFlare(100)).toBeLessThanOrEqual(0.35);
    expect(turnFlare(-100)).toBeGreaterThanOrEqual(-0.35);
    expect(bodyBend(100)).toBeLessThanOrEqual(0.16);
    expect(bodyBend(0)).toBe(0);
  });
});

describe("driveFins", () => {
  const build = () => {
    const root = new Object3D();
    for (const name of [
      "TailFin",
      "TailFin.U",
      "TailFin.L",
      "Gill.L",
      "Gill.R",
      "Dorsal",
      "Dorsal.Ray.1",
      "Dorsal.Ray.4",
      "AnalRay.1",
    ]) {
      const bone = new Object3D();
      bone.name = name;
      root.add(bone);
    }
    return root;
  };

  it("writes gills and leaves an unrelated node alone", () => {
    const root = build();
    const unrelated = new Object3D();
    unrelated.name = "Body";
    root.add(unrelated);
    driveFins(root, { cycle: 0, blps: 1.2, turnRate: 0, gillPhase: 0.25 });
    const gill = root.getObjectByName("Gill.L")!;
    expect(gill.quaternion.equals(new Quaternion())).toBe(false);
    expect(unrelated.quaternion.equals(new Quaternion())).toBe(true);
  });

  it("does not throw when detail bones are missing from an older GLB", () => {
    const root = new Object3D();
    expect(() =>
      driveFins(root, { cycle: 0.3, blps: 1.2, turnRate: 0.5, gillPhase: 0.1 }),
    ).not.toThrow();
  });

  it("is deterministic for the same state", () => {
    const a = build();
    const b = build();
    const state = { cycle: 0.4, blps: 1.1, turnRate: 0.2, gillPhase: 0.6 };
    driveFins(a, state);
    driveFins(b, state);
    for (const name of ["TailFin", "TailFin.U", "Gill.L"]) {
      expect(
        a.getObjectByName(name)!.quaternion.angleTo(b.getObjectByName(name)!.quaternion),
      ).toBeLessThan(1e-6);
    }
  });

  it("holds a valid pose at zero speed", () => {
    const root = build();
    driveFins(root, { cycle: 0, blps: 0, turnRate: 0, gillPhase: 0 });
    for (const name of ["TailFin", "TailFin.U", "Gill.L"]) {
      const q = root.getObjectByName(name)!.quaternion;
      expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true);
      expect(Math.abs(q.length() - 1)).toBeLessThan(1e-6);
    }
  });

  it("ripples the median-fin rays with a lag down the fin", () => {
    const root = build();
    driveFins(root, { cycle: 0.31, blps: 1.4, turnRate: 0, gillPhase: 0 });
    const inner = root.getObjectByName("Dorsal.Ray.1")!.quaternion;
    const outer = root.getObjectByName("Dorsal.Ray.4")!.quaternion;
    expect(inner.angleTo(new Quaternion())).toBeGreaterThan(1e-4);
    expect(outer.angleTo(new Quaternion())).toBeGreaterThan(1e-4);
    // The outer rays sway further, so the fin bends along its span rather than
    // swinging as one plate.
    expect(outer.angleTo(new Quaternion())).toBeGreaterThan(inner.angleTo(new Quaternion()));
  });

  it("discovers every ray bone of the hero rig, not a fixed count", () => {
    const root = new Object3D();
    const rig = ["Spine.01", "Spine.06", "Tail.01", "Tail.03", "TailFin"];
    const rays: string[] = [];
    for (let index = 1; index <= 12; index += 1) {
      rays.push(`Dorsal.Ray.${index}`);
    }
    for (let index = 1; index <= 8; index += 1) {
      rays.push(`AnalRay.${index}`);
    }
    for (const name of [...rig, ...rays]) {
      const bone = new Object3D();
      bone.name = name;
      root.add(bone);
    }
    driveFins(root, { cycle: 0.27, blps: 1.3, turnRate: 0, gillPhase: 0 });
    for (const name of rays) {
      expect(root.getObjectByName(name)!.quaternion.angleTo(new Quaternion())).toBeGreaterThan(
        1e-5,
      );
    }
  });
});

describe("rest-pose composition", () => {
  const restRoll = (angle: number) =>
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle);

  it("scales the baked wave about the joint rest pose", () => {
    const root = new Object3D();
    const bone = new Object3D();
    bone.name = "Spine.01";
    // Joint nodes carry their rest orientation inside the animated quaternion.
    const rest = restRoll(Math.PI / 4);
    const baked = restRoll(0.2);
    bone.quaternion.copy(rest).multiply(baked);
    root.add(bone);
    const rests = new Map([["Spine.01", rest]]);

    driveFins(root, { cycle: 0, blps: 1, turnRate: 0, gillPhase: 0, rest: rests });

    const pose = bone.quaternion.clone().premultiply(rest.clone().invert());
    const angle = 2 * Math.acos(Math.min(1, pose.w));
    expect(angle).toBeCloseTo(0.2 * waveGain(1), 5);
  });

  it("overwrites gills rather than stacking the offset twice", () => {
    const root = new Object3D();
    const bone = new Object3D();
    bone.name = "Gill.L";
    const rest = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.4);
    bone.quaternion.copy(rest);
    root.add(bone);
    const rests = new Map([["Gill.L", rest]]);

    const state = { cycle: 0, blps: 0.6, turnRate: 0, gillPhase: 0.25, rest: rests };
    driveFins(root, state);
    const first = bone.quaternion.clone();
    driveFins(root, state);
    expect(bone.quaternion.angleTo(first)).toBeLessThan(1e-6);
    expect(bone.quaternion.angleTo(rest)).toBeGreaterThan(0.01);
  });
});

// Three writes a bound property only when its value changes, so a clip held at
// timeScale 0 stops rewriting its bones after the first frame. The layer has to
// notice that and add to the pose it remembers, not to its own last output.
describe("held clip", () => {
  const state = { cycle: 0.2, blps: 1.1, turnRate: 0, gillPhase: 0 };
  const tail = () => {
    const root = new Object3D();
    const bone = new Object3D();
    bone.name = "TailFin.U";
    root.add(bone);
    return { root, bone };
  };

  it("does not stack the same offset while the mixer leaves the bone alone", () => {
    const { root, bone } = tail();
    driveFins(root, state);
    const once = bone.quaternion.clone();
    driveFins(root, state);
    driveFins(root, state);
    expect(bone.quaternion.angleTo(once)).toBeLessThan(1e-6);
  });

  it("adds to a pose the mixer rewrote between frames", () => {
    const baked = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.5);
    const { root, bone } = tail();
    driveFins(root, state);
    bone.quaternion.copy(baked);
    driveFins(root, state);
    const fresh = tail();
    fresh.bone.quaternion.copy(baked);
    driveFins(fresh.root, state);
    expect(bone.quaternion.angleTo(fresh.bone.quaternion)).toBeLessThan(1e-6);
  });

  it("holds a rescaled wave bone instead of shrinking it every frame", () => {
    const root = new Object3D();
    const bone = new Object3D();
    bone.name = "Spine.01";
    const rest = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 4);
    bone.quaternion.copy(rest).multiply(
      new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 0.2),
    );
    root.add(bone);
    const rests = new Map([["Spine.01", rest]]);

    const held = { cycle: 0.3, blps: 1, turnRate: 0, gillPhase: 0, rest: rests };
    driveFins(root, held);
    const once = bone.quaternion.clone();
    for (let frame = 0; frame < 5; frame += 1) {
      driveFins(root, held);
    }
    expect(bone.quaternion.angleTo(once)).toBeLessThan(1e-6);
  });
});
