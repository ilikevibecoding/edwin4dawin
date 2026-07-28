import { KS_DEPTH, KS_NOISE } from './common.glsl';

/**
 * The columns.
 *
 * A bombed street is recognisable from a mile away by exactly one thing, and it
 * is not the crater: it is the black column standing over it, still there
 * twenty seconds after the aircraft have gone. The blast itself is the effects
 * system's job and it retires in about two seconds, which is correct — a
 * fireball that lingers looks like a bug. This is what replaces it.
 *
 * Each puff is a camera-facing quad with a world-space noise field read through
 * it, and the two things that keep a stack of quads from reading as a stack of
 * quads are both here. The noise is sampled in *world* coordinates and advected
 * upward, so two overlapping puffs never show the same pattern and the
 * structure appears to climb through the column rather than sit on it. And the
 * shading is a cheap single-scatter: the sunward side of every puff is lifted
 * toward the sun's own colour and the away side falls into a cold soot, which
 * is what gives a column its shape against a bright sky.
 *
 * Fresh smoke is nearly black because it is unburnt carbon; it lightens as it
 * dilutes, so `aParam.z` carries the soot fraction and it falls with age. The
 * transition from a black root to a grey-brown crown is the single strongest
 * cue that the column is *rising* rather than merely existing.
 */

export const SMOKE_VERT = /* glsl */ `
attribute vec4 aPuff;    // xyz centre, w radius
attribute vec4 aParam;   // x opacity, y seed, z soot, w spin

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  // A slow roll per puff. Costs two trig calls and removes the single most
  // obvious tell of billboarded smoke, which is that every element shares an
  // orientation and the whole plume shears as the camera moves.
  float c = cos(aParam.w);
  float s = sin(aParam.w);
  vec2 p = vec2(position.x * c - position.y * s, position.x * s + position.y * c);

  vLocal = p * 2.0;
  vParam = aParam;

  vec3 world = aPuff.xyz + (camRight * p.x + camUp * p.y) * 2.0 * aPuff.w;
  vWorld = world;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const SMOKE_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}
${KS_DEPTH}

uniform float uTime;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uSkyColor;

varying vec2 vLocal;
varying vec4 vParam;
varying vec3 vWorld;
varying float vViewDepth;

void main() {
  float r = length(vLocal);
  if (r > 1.0) discard;

  // A soft round core with a torn edge. The tear comes from the same field the
  // interior does, so the silhouette boils with the body instead of being a
  // circle with noise painted inside it.
  vec3 q = vec3(vWorld.xz * 0.11, vWorld.y * 0.085 - uTime * 0.055) + vParam.y;
  float n = ksFbm3(q);
  float shell = smoothstep(1.0, 0.05, r + (0.5 - n) * 0.55);
  float density = shell * smoothstep(0.18, 0.78, n + 0.28) * vParam.x;
  density *= ksSoften(vViewDepth, 4.5);
  if (density < 0.0035) discard;

  // Lighting. One extra sample of the same field, offset along the sun, gives
  // a gradient that stands in for a surface normal well enough at this scale.
  float lit = ksFbm3(q + uSunDir * 0.42) - n;
  float toward = clamp(0.5 + lit * 2.6, 0.0, 1.0);

  // Soot: near-black at the root where the carbon is unburnt, diluting to a
  // grey-brown crown. The soot fraction rises with age and a puff's age is
  // very nearly its height, so this reads as a vertical gradient without
  // anything having to know where the ground is.
  vec3 soot = mix(vec3(0.026, 0.023, 0.021), vec3(0.175, 0.158, 0.140), vParam.z);
  vec3 color = soot * (uSkyColor * 1.1 + 0.05)
             + uSunColor * toward * 0.026 * (0.25 + vParam.z * 0.85);

  gl_FragColor = vec4(color * density, density);
}
`;
