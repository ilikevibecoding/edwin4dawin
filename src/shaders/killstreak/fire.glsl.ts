import { KS_DEPTH, KS_NOISE } from './common.glsl';

/**
 * Ground fire, and the dust that hangs over a bombed street afterwards.
 *
 * Both are instanced quads with a soft-particle depth fade, and both are about
 * the same thing: an effect that lives for half a minute cannot be a loop of
 * sprites, because the eye finds the loop. So the flame is a noise field
 * advected upward and squeezed by a vertical envelope, sampled in world space
 * so two overlapping patches never agree, and the haze is a much slower field
 * of the same kind read at a hundredth of the frequency.
 *
 * Fire is the one thing in the game that is genuinely emissive at a level worth
 * grading for: the luminance of burning fuel is a couple of hundred times a
 * sunlit wall at the base and falls off through the plume, so the values here
 * are deliberately large and the tone mapper is left to do its job.
 */

export const FIRE_VERT = /* glsl */ `
attribute vec4 aFire;    // xyz base position, w radius
attribute vec4 aParam;   // x age (s), y intensity, z seed, w height

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  // Anchored to the ground and standing up: flame billboards that pivot fully
  // toward the camera detach from the floor when you look down at them.
  vec3 camRight = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
  vec3 up = vec3(0.0, 1.0, 0.0);

  vLocal = position.xy * 2.0;
  vParam = aParam;

  vec3 world = aFire.xyz
    + camRight * position.x * 2.0 * aFire.w
    + up * (position.y + 0.5) * 2.0 * aParam.w;
  vWorld = world;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const FIRE_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}
${KS_DEPTH}

uniform float uTime;

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  // 0 at the floor, 1 at the top of the billboard.
  float h = clamp(vLocal.y * 0.5 + 0.5, 0.0, 1.0);
  float across = abs(vLocal.x);

  // The flame necks in as it rises and the tongue wanders; the wander is what
  // reads as burning rather than as a lit cone.
  float sway = (ksValue(vec2(vWorld.x * 0.6 + uTime * 1.7, vWorld.z * 0.6)) - 0.5) * h * h * 1.5;
  float width = (1.0 - h * 0.72) * (0.8 + 0.35 * ksValue(vec2(uTime * 2.1 + vParam.z, h * 3.0)));
  float body = smoothstep(width, width * 0.15, abs(across + sway));

  // Advected turbulence. Rising faster than the billboard is tall, so the
  // structure visibly climbs out of the top of the flame.
  vec3 q = vec3(vWorld.xz * 1.35, vWorld.y * 0.9 - uTime * 2.6) + vParam.z;
  float turb = ksFbm3(q);
  float lick = smoothstep(0.34, 0.72, turb + (1.0 - h) * 0.42);

  // Fires start hard and settle into a low, guttering burn over their life.
  float life = clamp(vParam.x, 0.0, 1.0);
  float vigour = mix(1.0, 0.42, smoothstep(0.35, 1.0, life)) * vParam.y;
  float mask = body * lick * vigour;
  // The top of the flame is where combustion runs out of fuel, not where the
  // quad ends.
  mask *= 1.0 - smoothstep(0.55, 1.0, h);
  mask *= ksSoften(vViewDepth, 0.6);
  if (mask < 0.004) discard;

  // Colour by height: a white-yellow root, orange body, and a soot-loaded tip
  // that absorbs more than it emits.
  vec3 root = vec3(1.0, 0.86, 0.52);
  vec3 mid = vec3(1.0, 0.42, 0.09);
  vec3 tip = vec3(0.55, 0.13, 0.03);
  vec3 color = mix(root, mid, smoothstep(0.0, 0.4, h));
  color = mix(color, tip, smoothstep(0.4, 0.95, h));

  float radiance = mask * mix(34.0, 3.0, h) * vigour;
  gl_FragColor = vec4(color * radiance, clamp(mask * 1.2, 0.0, 1.0));
}
`;

export const HAZE_VERT = /* glsl */ `
attribute vec4 aCell;    // xyz centre, w radius
attribute vec4 aParam;   // x opacity, y seed, z drift, w flatten

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  vLocal = position.xy * 2.0;
  vParam = aParam;

  vec3 world = aCell.xyz
    + camRight * position.x * 2.0 * aCell.w
    + camUp * position.y * 2.0 * aCell.w * aParam.w;
  vWorld = world;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const HAZE_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}
${KS_DEPTH}

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uSunColor;
uniform vec3 uSunDir;

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  float r = length(vLocal);
  if (r > 1.0) discard;

  float shell = smoothstep(1.0, 0.1, r);
  vec3 q = vec3(vWorld.xz * 0.075 + uTime * vParam.z, vWorld.y * 0.06) + vParam.y;
  float n = ksFbm3(q) * 1.3;
  float density = shell * smoothstep(0.22, 0.95, n) * vParam.x;

  // Very deep, very soft: the haze has to be allowed to sit inside geometry
  // rather than cutting an outline against every wall it touches.
  density *= ksSoften(vViewDepth, 9.0);
  if (density < 0.003) discard;

  // Single-scatter approximation: fines lift the sun's colour and the whole
  // street goes the colour of the ground it came off.
  float phase = 0.55 + 0.45 * pow(max(0.0, dot(normalize(vWorld - cameraPosition), -uSunDir)), 3.0);
  vec3 color = uColor * (0.35 + uSunColor * phase * 0.055);

  gl_FragColor = vec4(color * density, density);
}
`;
