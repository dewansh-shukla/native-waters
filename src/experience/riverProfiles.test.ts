import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { resolveRiverProfile, RIVER_PROFILES } from "./riverProfiles";
import { DEFAULT_SPECIES } from "./species";
import { CAUVERY_ANCHOR, cauveryAnchor, GANGA_ANCHOR, gangaAnchor, GODAVARI_ANCHOR, godavariAnchor, KRISHNA_ANCHOR, krishnaAnchor, BRAHMAPUTRA_ANCHOR, brahmaputraAnchor } from "./geography";
import { HABITAT, OBSTACLES } from "./habitat";
import { WATER_SCATTER_CSS, WATER_FOG_NEAR, WATER_FOG_FAR, createWaterOptics } from "../components/scene/world/waterOptics";

describe("riverProfiles", () => {
  it("resolves cauvery with 7 fish", () => {
    const profile = resolveRiverProfile("cauvery");
    expect(profile.id).toBe("cauvery");
    expect(profile.name).toBe("Cauvery");
    expect(profile.fish).toHaveLength(7);
    expect(profile.fish).toBe(DEFAULT_SPECIES);
  });

  it("water scatter matches WATER_SCATTER_CSS", () => {
    const profile = resolveRiverProfile("cauvery");
    expect(profile.water.scatter).toBe(WATER_SCATTER_CSS);
    expect(profile.water.fogNear).toBe(WATER_FOG_NEAR);
    expect(profile.water.fogFar).toBe(WATER_FOG_FAR);
    expect(profile.water.absorption).toEqual([0.085, 0.03, 0.06]);
    const water = createWaterOptics(profile.water);
    expect(water.scatter.value.toArray()).toEqual([0x21 / 255, 0x45 / 255, 0x38 / 255]);
    expect(water.absorption.value.toArray()).toEqual([0.085, 0.03, 0.06]);
  });

  it("geo anchor matches CAUVERY_ANCHOR", () => {
    const profile = resolveRiverProfile("cauvery");
    expect(profile.geoAnchor).toBe(CAUVERY_ANCHOR);
    expect(profile.entryAnchor).toBe(CAUVERY_ANCHOR);
    expect(profile.geoAnchor).toBeInstanceOf(Vector3);
  });

  it("habitat matches HABITAT and OBSTACLES", () => {
    const profile = resolveRiverProfile("cauvery");
    expect(profile.habitat.floorY).toBe(HABITAT.floorY);
    expect(profile.habitat.world).toEqual(HABITAT.world);
    expect(profile.habitat.obstacles).toBe(OBSTACLES);
    expect(typeof profile.habitat.seed).toBe("number");
  });

  it("RIVER_PROFILES.cauvery resolves", () => {
    expect(RIVER_PROFILES.cauvery).toBe(resolveRiverProfile("cauvery"));
  });

  it("exposes cauveryAnchor alias", () => {
    expect(cauveryAnchor).toBe(CAUVERY_ANCHOR);
  });

  it("resolves ganga with 3 fish", () => {
    const profile = resolveRiverProfile("ganga");
    expect(profile.id).toBe("ganga");
    expect(profile.name).toBe("Ganga");
    expect(profile.fish).toHaveLength(3);
  });

  it("ganga water scatter differs from cauvery", () => {
    const ganga = resolveRiverProfile("ganga");
    const cauvery = resolveRiverProfile("cauvery");
    expect(ganga.water.scatter).not.toBe(cauvery.water.scatter);
    expect(ganga.water.scatter).toBe("#3a2f1e");
    expect(ganga.water.fogNear).toBe(5);
    expect(ganga.water.fogFar).toBe(20);
    expect(ganga.water.absorption).toEqual([0.12, 0.05, 0.09]);
    const water = createWaterOptics(ganga.water);
    expect(water.scatter.value.toArray()).toEqual([0x3a / 255, 0x2f / 255, 0x1e / 255]);
    expect(water.absorption.value.toArray()).toEqual([0.12, 0.05, 0.09]);
  });

  it("ganga geo anchor within india bounds", () => {
    const profile = resolveRiverProfile("ganga");
    expect(profile.geoAnchor).toBeInstanceOf(Vector3);
    expect(profile.geoAnchor).toBe(GANGA_ANCHOR);
    expect(profile.entryAnchor).toBe(GANGA_ANCHOR);
    expect(Math.abs(profile.geoAnchor.x)).toBeLessThanOrEqual(10);
    expect(Math.abs(profile.geoAnchor.z)).toBeLessThanOrEqual(10);
  });

  it("exposes gangaAnchor alias", () => {
    expect(gangaAnchor).toBe(GANGA_ANCHOR);
  });

  it("resolves godavari with 9 fish", () => {
    const profile = resolveRiverProfile("godavari");
    expect(profile.id).toBe("godavari");
    expect(profile.name).toBe("Godavari");
    expect(profile.fish).toHaveLength(9);
  });

  it("godavari water scatter differs from cauvery, ganga, krishna", () => {
    const godavari = resolveRiverProfile("godavari");
    const cauvery = resolveRiverProfile("cauvery");
    const ganga = resolveRiverProfile("ganga");
    const krishna = resolveRiverProfile("krishna");
    expect(godavari.water.scatter).not.toBe(cauvery.water.scatter);
    expect(godavari.water.scatter).not.toBe(ganga.water.scatter);
    expect(godavari.water.scatter).not.toBe(krishna.water.scatter);
    expect(godavari.water.scatter).toBe("#2a3a2a");
    expect(godavari.water.fogNear).toBe(6);
    expect(godavari.water.fogFar).toBe(26);
    expect(godavari.water.absorption).toEqual([0.09, 0.035, 0.07]);
  });

  it("godavari geo anchor within india bounds", () => {
    const profile = resolveRiverProfile("godavari");
    expect(profile.geoAnchor).toBeInstanceOf(Vector3);
    expect(profile.geoAnchor).toBe(GODAVARI_ANCHOR);
    expect(profile.entryAnchor).toBe(GODAVARI_ANCHOR);
    expect(Math.abs(profile.geoAnchor.x)).toBeLessThanOrEqual(10);
    expect(Math.abs(profile.geoAnchor.z)).toBeLessThanOrEqual(10);
  });

  it("exposes godavariAnchor alias", () => {
    expect(godavariAnchor).toBe(GODAVARI_ANCHOR);
  });

  it("resolves brahmaputra with 9 fish", () => {
    const profile = resolveRiverProfile("brahmaputra");
    expect(profile.id).toBe("brahmaputra");
    expect(profile.name).toBe("Brahmaputra");
    expect(profile.fish).toHaveLength(9);
  });

  it("brahmaputra water scatter differs from cauvery, ganga, krishna, godavari", () => {
    const brahmaputra = resolveRiverProfile("brahmaputra");
    const cauvery = resolveRiverProfile("cauvery");
    const ganga = resolveRiverProfile("ganga");
    const krishna = resolveRiverProfile("krishna");
    const godavari = resolveRiverProfile("godavari");
    expect(brahmaputra.water.scatter).not.toBe(cauvery.water.scatter);
    expect(brahmaputra.water.scatter).not.toBe(ganga.water.scatter);
    expect(brahmaputra.water.scatter).not.toBe(krishna.water.scatter);
    expect(brahmaputra.water.scatter).not.toBe(godavari.water.scatter);
    expect(brahmaputra.water.scatter).toBe("#1a3a2a");
    expect(brahmaputra.water.fogNear).toBe(10);
    expect(brahmaputra.water.fogFar).toBe(35);
    expect(brahmaputra.water.absorption).toEqual([0.06, 0.02, 0.04]);
  });

  it("brahmaputra geo anchor within india bounds", () => {
    const profile = resolveRiverProfile("brahmaputra");
    expect(profile.geoAnchor).toBeInstanceOf(Vector3);
    expect(profile.geoAnchor).toBe(BRAHMAPUTRA_ANCHOR);
    expect(profile.entryAnchor).toBe(BRAHMAPUTRA_ANCHOR);
    expect(Math.abs(profile.geoAnchor.x)).toBeLessThanOrEqual(10);
    expect(Math.abs(profile.geoAnchor.z)).toBeLessThanOrEqual(10);
  });

  it("exposes brahmaputraAnchor alias", () => {
    expect(brahmaputraAnchor).toBe(BRAHMAPUTRA_ANCHOR);
  });
});
