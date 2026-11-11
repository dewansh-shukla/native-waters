import { AdditiveBlending, ShaderMaterial, Vector3, type Camera } from "three";

export type GodRayUniforms = {
  uSunScreen: { value: Vector3 };
  uWorldTime: { value: number };
  uRichness: { value: number };
};

// Low sun off the port bow: shafts rake across the river instead of beaming
// straight down, which is how the reference footage reads.
export const SUN_DIRECTION = new Vector3(-0.4, 1, 0.25).normalize();

export const godRayVertex = `
  varying vec2 vGodUv;
  void main() {
    vGodUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

// Cheap screen-space shafts: angular streak bands fanning out of the sun
// point. No scene texture is sampled, so there is no post pipeline and no
// dependency on what geometry is underwater.
export const godRayFragment = `
  uniform vec3 uSunScreen;
  uniform float uWorldTime;
  uniform float uRichness;
  varying vec2 vGodUv;

  float godHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    if (uSunScreen.z <= 0.001) discard;
    vec2 point = vGodUv * 2.0 - 1.0;
    vec2 toSun = uSunScreen.xy - point;
    float distanceToSun = length(toSun);
    float angle = atan(toSun.y, toSun.x);
    float streakA = sin(angle * 9.0 + uWorldTime * 0.35);
    float streakB = sin(angle * 23.0 - uWorldTime * 0.6 + godHash(vec2(floor(angle * 7.0), 3.1)) * 6.28);
    float streaks = 0.55 + 0.3 * streakA + 0.15 * streakB;
    float falloff = smoothstep(1.6, 0.05, distanceToSun);
    float alpha = clamp(streaks * falloff * 0.5 * uSunScreen.z * uRichness, 0.0, 0.6);
    gl_FragColor = vec4(vec3(0.85, 0.95, 0.80) * alpha, alpha);
  }
`;

export function createGodRayMaterial(uniforms: GodRayUniforms) {
  return new ShaderMaterial({
    uniforms,
    vertexShader: godRayVertex,
    fragmentShader: godRayFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
}

const aim = new Vector3();
const view = new Vector3();
const cameraDirection = new Vector3();

// Projects the fixed sun into NDC. out.z carries visibility (0 = hidden,
// 1 = drawable), so the caller can gate by tier and by being underwater.
export function sunScreenPosition(camera: Camera, time: number, out: Vector3): Vector3 {
  const drift = 0.04 * Math.sin(time * 0.05);
  aim.set(SUN_DIRECTION.x + drift, SUN_DIRECTION.y, SUN_DIRECTION.z + drift * 0.6).normalize();
  camera.getWorldDirection(cameraDirection);
  out.set(0, 0, 0);
  if (aim.dot(cameraDirection) <= 0.1) return out;
  camera.updateMatrixWorld();
  view.copy(camera.position).addScaledVector(aim, 50).project(camera);
  return out.set(view.x, view.y, 1);
}
