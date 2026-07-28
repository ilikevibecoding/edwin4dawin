import { FX_DEPTH, FX_MATH } from './common.glsl';

/**
 * The blast wave: a refractive ring rather than a bright one.
 *
 * A detonation drives a spherical step in air density outward at well over the
 * speed of sound, and what a camera records of it is not light but the *bend* —
 * the wall behind it slides, doubles at the front, and snaps back. It is over
 * in a fifth of a second and it is the single strongest cue for how big the
 * explosion was, because unlike a fireball it cannot be faked by turning the
 * brightness up.
 *
 * Implementation is a screen-space grab: the mesh copies the framebuffer as it
 * stands (world, fog, everything drawn before it in the late-transparent pass)
 * and resamples it along the ring's radial direction. The offset is the
 * derivative of a compression profile, so the leading edge and the trailing
 * edge push opposite ways and the pair reads as a lens, not a smear.
 *
 * Occlusion comes from the depth buffer: with nothing behind a pixel there is
 * nothing to refract, so the wave correctly disappears against open sky.
 */

export const SHOCKWAVE_VERT = /* glsl */ `
attribute vec4 aWave;    // xyz centre, w radius
attribute vec4 aShape;   // x thickness, y strength, z rim, w fade

varying vec2 vLocal;
varying vec4 vShape;
varying float vViewDepth;

void main() {
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  // The billboard has to cover the sphere plus the outward tail of the shell,
  // but the shell has to sit at the radius, so the local coordinate is scaled
  // back by the overdraw: r = 1 is the front wherever the quad edge lands.
  float radius = max(aWave.w, 1e-3);
  float overdraw = 1.0 + aShape.x * 2.2;
  float extent = radius * overdraw;
  vLocal = position.xy * 2.0 * overdraw;
  vShape = aShape;

  vec3 world = aWave.xyz + (camRight * position.x + camUp * position.y) * extent * 2.0;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const SHOCKWAVE_FRAG = /* glsl */ `
precision highp float;

${FX_MATH}
${FX_DEPTH}

uniform sampler2D uScene;
uniform vec2 uTexel;

varying vec2 vLocal;
varying vec4 vShape;
varying float vViewDepth;

void main() {
  float r = length(vLocal);
  float thickness = max(vShape.x, 1e-3);
  // Signed distance from the front, in units of shell thickness.
  float s = (r - 1.0) / thickness;
  if (abs(s) > 2.2) discard;

  // Compression profile and its slope. The slope is the refraction: air is
  // densest at the front and rarefied behind it, so the two halves of the ring
  // bend the background in opposite directions.
  float g = exp(-s * s * 2.2);
  float slope = -2.0 * s * g;

  vec2 dir = r > 1e-4 ? vLocal / r : vec2(0.0, 1.0);
  vec2 uv = gl_FragCoord.xy * uTexel;

  float mask = clamp(g * 1.35, 0.0, 1.0) * vShape.w;
  if (mask < 0.004) discard;

  // Nothing behind means nothing to refract: against open sky the wave is
  // invisible, exactly as it is in gun-camera footage.
  if (uHasDepth > 0.5) {
    float raw = texture2D(uDepthTexture, uv).r;
    if (raw >= 0.9999995) discard;
    float sceneDepth = fxLinearDepth(raw);
    mask *= clamp((sceneDepth - vViewDepth) / 1.5 + 1.0, 0.0, 1.0);
    if (mask < 0.004) discard;
  }

  vec2 offset = dir * slope * vShape.y * uTexel.y;
  vec3 refracted = texture2D(uScene, clamp(uv + offset, vec2(0.0), vec2(1.0))).rgb;

  // A thin bright edge where the compressed air scatters forward. Kept as a
  // multiplier on what is already there so it cannot blow the buffer out.
  float rim = exp(-s * s * 26.0) * vShape.z;
  gl_FragColor = vec4(refracted * (1.0 + rim), mask);
}
`;
