import { KS_NOISE } from './common.glsl';

/**
 * Refractive heat haze: exhaust behind a nozzle, and the column of air over a
 * napalm fire.
 *
 * Hot air is not brighter, it is a lens. Its refractive index falls with
 * temperature, so a turbulent thermal plume is a field of moving gradients that
 * displaces whatever is behind it and does nothing at all where there is
 * nothing behind it. Drawing it as a bright orange overlay — which is what an
 * additive quad amounts to — gets the physics backwards and reads as fog.
 *
 * So this is a screen-space grab, the same technique as the blast wave: the
 * mesh copies the colour attachment as it stands, resamples it along a noise
 * gradient, and composites the displaced sample back. Because the offset is the
 * *gradient* of a scalar field rather than the field itself, the distortion has
 * the shear structure of real convection: a cell pushes one way on its leading
 * edge and the opposite way behind it, which is what makes the background boil
 * instead of wobble.
 *
 * Depth gates it. With open sky behind a fragment there is nothing to refract,
 * so the effect correctly vanishes against the horizon rather than producing a
 * smeared rectangle in the sky, and it cannot bleed over geometry standing in
 * front of the plume.
 */

export const DISTORT_VERT = /* glsl */ `
attribute vec4 aCell;    // xyz world centre, w radius in metres
attribute vec4 aParam;   // x strength, y vertical stretch, z seed, w rise speed

varying vec2 vLocal;
varying vec4 vParam;
varying float vViewDepth;
varying vec3 vWorld;

void main() {
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

  vLocal = position.xy * 2.0;
  vParam = aParam;

  vec3 world = aCell.xyz
    + camRight * position.x * 2.0 * aCell.w
    + camUp * position.y * 2.0 * aCell.w * aParam.y;
  vWorld = world;

  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  vViewDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const DISTORT_FRAG = /* glsl */ `
precision highp float;

${KS_NOISE}

uniform sampler2D uScene;
uniform sampler2D uDepthTexture;
uniform vec4 uDepthParams;   // near, far, 1/width, 1/height
uniform float uHasDepth;
uniform vec2 uTexel;
uniform float uTime;

varying vec2 vLocal;
varying vec4 vParam;
varying float vViewDepth;
varying vec3 vWorld;

float linearDepth(float d) {
  float n = uDepthParams.x;
  float f = uDepthParams.y;
  float z = d * 2.0 - 1.0;
  return (2.0 * n * f) / (f + n - z * (f - n));
}

void main() {
  float r = length(vLocal);
  if (r > 1.0) discard;

  // A soft cell, strongest just inside the rim: the middle of a thermal is
  // well mixed and nearly uniform, and it is the shear layer at its edge that
  // bends light.
  float shell = smoothstep(1.0, 0.62, r) * smoothstep(0.0, 0.34, r + 0.18);

  vec2 uv = gl_FragCoord.xy * uDepthParams.zw;

  // Nothing behind the fragment means nothing to refract.
  float occlusion = 1.0;
  if (uHasDepth > 0.5) {
    float scene = linearDepth(texture2D(uDepthTexture, uv).x);
    // In front of the plume: hidden. Far behind it, or open sky: no lens.
    occlusion = smoothstep(0.0, 1.6, scene - vViewDepth) *
                (1.0 - smoothstep(0.35, 1.0, scene / max(uDepthParams.y, 1.0)));
  }
  float amount = vParam.x * shell * occlusion;
  if (amount < 0.002) discard;

  // The scalar field, rising with the plume. Sampled in world space so the
  // pattern is attached to the air and survives a camera move.
  vec3 q = vec3(vWorld.xz * 0.9, vWorld.y * 0.55 - uTime * vParam.w) + vParam.z;
  float e = 0.09;
  float n0 = ksFbm3(q);
  float nx = ksFbm3(q + vec3(e, 0.0, 0.0));
  float ny = ksFbm3(q + vec3(0.0, e, 0.0));
  vec2 grad = vec2(nx - n0, ny - n0) / e;

  vec2 offset = grad * amount * uTexel * 34.0;
  vec3 refracted = texture2D(uScene, uv + offset).rgb;

  // A trace of chromatic separation: the index gradient is wavelength
  // dependent and the red channel bends least. Barely visible, and its absence
  // is what makes most game heat haze read as a UV wobble.
  refracted.r = texture2D(uScene, uv + offset * 0.86).r;
  refracted.b = texture2D(uScene, uv + offset * 1.15).b;

  gl_FragColor = vec4(refracted, clamp(amount * 3.2, 0.0, 1.0));
}
`;
