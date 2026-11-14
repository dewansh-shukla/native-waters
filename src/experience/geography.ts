import { Vector3 } from "three";
import india from "../../content/maps/india.geojson.json";
import cauvery from "../../content/maps/cauvery.geojson.json";
import riversGeo from "../../content/maps/rivers.geojson.json";
import provenance from "../../content/maps/provenance.json";

export type LonLat = readonly [longitude: number, latitude: number];
export type GeoBounds = readonly [west: number, south: number, east: number, north: number];
export type LineCoordinates = readonly LonLat[];
export type PolygonCoordinates = readonly LineCoordinates[];

export const INDIA_BOUNDS: GeoBounds = [68.143403, 6.745551, 97.362253, 37.054484];
export const MAP_TOP = 8;
// The preparation helper validates tuple arity; JSON imports otherwise infer number[].
export const INDIA_SHAPES = india.geometry.coordinates as unknown as readonly PolygonCoordinates[];
export const CAUVERY_PARTS = cauvery.features.flatMap((feature) => feature.geometry.coordinates) as unknown as readonly LineCoordinates[];

const centerLon = (INDIA_BOUNDS[0] + INDIA_BOUNDS[2]) / 2;
const centerLat = (INDIA_BOUNDS[1] + INDIA_BOUNDS[3]) / 2;
const longitudeScale = Math.cos(centerLat * Math.PI / 180) * 0.5;

/** One local equirectangular transform for every map layer: east +X, north -Z. */
export function projectLonLat([longitude, latitude]: LonLat): Vector3 {
  return new Vector3((longitude - centerLon) * longitudeScale, MAP_TOP, (centerLat - latitude) * 0.5);
}

const riverParts = cauvery.features
  .filter((feature) => feature.properties.featurecla === "River")
  .flatMap((feature) => feature.geometry.coordinates) as unknown as readonly LineCoordinates[];
const partLength = (part: readonly LonLat[]) => part.slice(1).reduce((sum, point, index) => {
  const previous = projectLonLat(part[index]);
  return sum + previous.distanceTo(projectLonLat(point));
}, 0);
const longestRiverPart = riverParts.reduce((longest, part) => partLength(part) > partLength(longest) ? part : longest);
// An existing interior vertex, not an interpolated point or a lake centerline.
export const CAUVERY_ANCHOR: Vector3 = projectLonLat(longestRiverPart[Math.floor(longestRiverPart.length / 2)]);
export const cauveryAnchor = CAUVERY_ANCHOR;

export interface RiverCourse { name: string; parts: readonly LineCoordinates[] }

/** Catalog tributary overviews from rivers.geojson.json, already trimmed to India's landmass. */
export const TRIBUTARY_RIVERS: readonly RiverCourse[] = (riversGeo as unknown as {
  features: { properties: { name: string }; geometry: { coordinates: LineCoordinates[] } }[];
}).features.map((feature) => ({ name: feature.properties.name, parts: feature.geometry.coordinates }));

const gangaRiverCourse = TRIBUTARY_RIVERS.find((river) => river.name === "Ganga");
const gangaRiverParts = gangaRiverCourse?.parts ?? [];
const longestGangaRiverPart: LineCoordinates = (gangaRiverParts.reduce<LineCoordinates | undefined>(
  (longest, part) => (!longest || partLength(part) > partLength(longest) ? part : longest),
  undefined,
) ?? gangaRiverParts[0]) as LineCoordinates;
export const GANGA_ANCHOR: Vector3 = projectLonLat(longestGangaRiverPart[Math.floor(longestGangaRiverPart.length / 2)]);
export const gangaAnchor = GANGA_ANCHOR;

/** One label anchor per river: the midpoint of the geometrically longest part (a real vertex). */
export const RIVER_LABELS: readonly { name: string; point: LonLat }[] = [
  { name: "Cauvery", point: longestRiverPart[Math.floor(longestRiverPart.length / 2)] },
  ...TRIBUTARY_RIVERS.map((river) => {
    const longest = [...river.parts].reduce((a, b) => partLength(b) > partLength(a) ? b : a);
    return { name: river.name, point: longest[Math.floor(longest.length / 2)] };
  }),
];

/** Compute a dive entry anchor (midpoint of the longest part) for any named river. */
export function riverAnchor(name: string): Vector3 {
  if (name === "Cauvery") return CAUVERY_ANCHOR;
  if (name === "Ganga") return GANGA_ANCHOR;
  const course = TRIBUTARY_RIVERS.find((r) => r.name === name);
  if (course && course.parts.length) {
    const longest = [...course.parts].reduce((a, b) => (partLength(b) > partLength(a) ? b : a));
    return projectLonLat(longest[Math.floor(longest.length / 2)]);
  }
  return CAUVERY_ANCHOR;
}

export const SELECTABLE_RIVERS: readonly string[] = Array.from(new Set([
  "Cauvery",
  "Ganga",
  ...TRIBUTARY_RIVERS.map((r) => r.name),
]));

const relief = provenance.relief as { status: string; url?: string; bounds?: number[] };
export const RELIEF_CONFIG: { url: string; bounds: GeoBounds } | null =
  relief.status === "available" && relief.url && relief.bounds
    ? { url: relief.url, bounds: relief.bounds as unknown as GeoBounds }
    : null;
