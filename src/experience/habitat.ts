export const HABITAT = {
  surfaceY: 0,
  floorY: -3,
  world: { x: [-12, 12], z: [-9, 9] },
  school: { x: [-3.5, 3.5], y: [-2.3, -0.7], z: [-5, 1], center: [0, -1.5, -2] },
} as const;

export const OBSTACLES = [
  { center: [-4, -2.5, -4], radius: 0.75 },
  { center: [3, -2.5, -1], radius: 0.9 },
  { center: [5, -2.5, -5], radius: 1 },
] as const;
