import { KS_NOISE } from './common.glsl';

/**
 * The afterburner plume.
 *
 * A reheated turbofan running wet exhausts underexpanded, so the jet leaving
 * the nozzle is a supersonic column that keeps over- and under-expanding as it
 * equalises with the air around it. Each compression is a normal shock, each
 * shock reheats the unburnt fuel behind it, and the visible result is the stack
 * of Mach diamonds — bright discs on a fixed spacing that does not travel with
 * anything, because the spacing is set by the nozzle geometry rather than by
 * the gas moving through it.
 *
 * Getting that right is most of what makes an afterburner read as thrust
 * instead of as an orange cone stuck to the back of a model. The rest is the
 * colour: the core is close to white with a blue cast from shock-heated air,
 * the shroud around it is the sooty orange of the fuel-rich edge, and the far
 * end drops through red into nothing.
 *
 * The plume is drawn as a strip billboarded about its own axis rather than as a
 * cone: a cone is a shell, so shading it produces a bright ring with a hollow
 * middle, which is the opposite of what a column of burning gas looks like.
 */

export const AFTERBURNER_VERT = /* glsl */ `
attribute float aSide;   // -1 .. 1 across the plume
attribute float aT;      // 0 at the nozzle, 1 at the tail

uniform float uThrottle;
uniform float uLength;
uniform float uThroat;

varying float vAcross;
varying float vT;
varying vec3 vWorld;

void main() {
  vAcross = aSide;
  vT = aT;

  // The column necks down as it burns out, and the throttle sets how far it
  // gets before it does: at military power there is barely a plume at all.
  float envelope = (1.0 - aT) * (1.0 - aT * 0.3);
  float radius = uThroat * mix(0.6, 1.25, uThrottle) * envelope + 0.02;

  vec4 axisPoint = modelMatrix * vec4(0.0, 0.0, aT * uLength, 1.0);
  vec3 axisDir = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 toCamera = cameraPosition - axisPoint.xyz;
  vec3 perp = cross(axisDir, toCamera);
  float len = length(perp);
  // Looking straight down the jet pipe: any perpendicular will do.
  perp = len > 1e-4 ? perp / len : vec3(1.0, 0.0, 0.0);

  vec3 world = axisPoint.xyz + perp * (aSide * radius);
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const AFTERBURNER_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}

uniform float uTime;
uniform float uThrottle;
uniform vec3 uCoreColor;
uniform vec3 uEdgeColor;

varying float vAcross;
varying float vT;
varying vec3 vWorld;

void main() {
  float t = clamp(vT, 0.0, 1.0);
  float across = abs(vAcross);

  // Shock diamonds. Spacing scales with the pressure ratio, so it stretches
  // with throttle, but it is fixed in the nozzle's frame — it must not scroll,
  // or the plume looks like a texture being pulled through a tube.
  float spacing = 7.0 / max(0.35, uThrottle);
  float shock = 0.5 + 0.5 * cos(t * spacing * 6.2831853);
  shock = mix(1.0, shock, exp(-t * 2.0) * uThrottle);

  // Turbulent shear at the edge of the jet, growing downstream.
  float turb = ksValue(vec2(t * 9.0 - uTime * 26.0, vWorld.y * 0.7));
  float ragged = mix(1.0, 0.4 + turb * 1.25, smoothstep(0.12, 1.0, t));

  float core = exp(-across * across * 5.5) * shock;
  float shroud = exp(-across * across * 1.5) * 0.5 * ragged;
  float body = (core + shroud) * (1.0 - t * t) * uThrottle;

  // Hot near the throat, cooling downstream. Left in linear HDR: the core is
  // genuinely brighter than a sunlit wall and the bloom should know it.
  vec3 color = mix(uCoreColor, uEdgeColor, smoothstep(0.0, 0.5, t));
  color = mix(color, uEdgeColor * vec3(1.0, 0.3, 0.12), smoothstep(0.45, 1.0, t));

  float intensity = body * mix(30.0, 2.5, t);
  if (intensity < 0.003) discard;
  gl_FragColor = vec4(color * intensity, 1.0);
}
`;
