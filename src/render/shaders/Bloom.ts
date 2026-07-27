import { GLSL_COMMON } from '../FullScreen';
import { EXPOSURE_GLSL } from './Exposure';

/**
 * Dual-filter bloom (Jimenez, "Next Generation Post Processing in Call of Duty
 * Advanced Warfare").
 *
 * A progressive 13-tap downsample chain followed by a 9-tap tent upsample.
 * The result is a wide, stable, energy-conserving glow with none of the
 * ringing, pulsing, or box-shaped artefacts that a threshold + gaussian blur
 * produces — and critically it is *stable under motion*, because the first
 * downsample applies a Karis luminance average that removes the fireflies
 * which otherwise flicker frame to frame.
 */

export const BLOOM_PREFILTER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform vec2  uTexel;
uniform float uExposure;
uniform float uThreshold;
uniform float uSoftKnee;
uniform float uClamp;

${GLSL_COMMON}
${EXPOSURE_GLSL}

vec3 karisAverage(vec3 a, vec3 b, vec3 c, vec3 d) {
  // Weight by inverse luminance so a single blown-out pixel cannot dominate
  // the average — this is what kills bloom flicker on tracers and sparks.
  float wa = 1.0 / (1.0 + obLuma(a));
  float wb = 1.0 / (1.0 + obLuma(b));
  float wc = 1.0 / (1.0 + obLuma(c));
  float wd = 1.0 / (1.0 + obLuma(d));
  return (a * wa + b * wb + c * wc + d * wd) / (wa + wb + wc + wd);
}

void main() {
  vec2 t = uTexel;
  vec3 a = texture2D(tScene, vUv + vec2(-t.x, -t.y)).rgb;
  vec3 b = texture2D(tScene, vUv + vec2( t.x, -t.y)).rgb;
  vec3 c = texture2D(tScene, vUv + vec2(-t.x,  t.y)).rgb;
  vec3 d = texture2D(tScene, vUv + vec2( t.x,  t.y)).rgb;
  vec3 color = karisAverage(a, b, c, d);

  // Threshold in post-exposure terms. A threshold authored against scene
  // radiance means something different on every time-of-day preset — at the
  // moonlight scale it sits several stops above the brightest pixel in the
  // frame, so nothing blooms at all on the one preset where bloom matters most.
  color *= resolveExposure(uExposure);
  color = min(color, vec3(uClamp));

  // Soft-knee threshold: a hard cutoff makes bloom pop in and out as objects
  // cross the threshold; the quadratic knee blends it continuously.
  float br = max(max(color.r, color.g), color.b);
  float knee = uThreshold * uSoftKnee;
  float soft = clamp(br - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-5);
  float contribution = max(soft, br - uThreshold) / max(br, 1e-5);

  gl_FragColor = vec4(color * contribution, 1.0);
}
`;

export const BLOOM_DOWNSAMPLE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSource;
uniform vec2 uTexel;

void main() {
  vec2 t = uTexel;

  vec3 a = texture2D(tSource, vUv + vec2(-2.0 * t.x,  2.0 * t.y)).rgb;
  vec3 b = texture2D(tSource, vUv + vec2( 0.0,        2.0 * t.y)).rgb;
  vec3 c = texture2D(tSource, vUv + vec2( 2.0 * t.x,  2.0 * t.y)).rgb;
  vec3 d = texture2D(tSource, vUv + vec2(-2.0 * t.x,  0.0)).rgb;
  vec3 e = texture2D(tSource, vUv).rgb;
  vec3 f = texture2D(tSource, vUv + vec2( 2.0 * t.x,  0.0)).rgb;
  vec3 g = texture2D(tSource, vUv + vec2(-2.0 * t.x, -2.0 * t.y)).rgb;
  vec3 h = texture2D(tSource, vUv + vec2( 0.0,       -2.0 * t.y)).rgb;
  vec3 i = texture2D(tSource, vUv + vec2( 2.0 * t.x, -2.0 * t.y)).rgb;

  vec3 j = texture2D(tSource, vUv + vec2(-t.x,  t.y)).rgb;
  vec3 k = texture2D(tSource, vUv + vec2( t.x,  t.y)).rgb;
  vec3 l = texture2D(tSource, vUv + vec2(-t.x, -t.y)).rgb;
  vec3 m = texture2D(tSource, vUv + vec2( t.x, -t.y)).rgb;

  vec3 result = e * 0.125;
  result += (a + c + g + i) * 0.03125;
  result += (b + d + f + h) * 0.0625;
  result += (j + k + l + m) * 0.125;

  gl_FragColor = vec4(result, 1.0);
}
`;

export const BLOOM_UPSAMPLE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSource;   // smaller mip being upsampled
uniform sampler2D tTarget;   // larger mip already in the chain
uniform vec2  uTexel;
uniform float uRadius;
uniform float uBlend;

void main() {
  vec2 t = uTexel * uRadius;

  vec3 a = texture2D(tSource, vUv + vec2(-t.x,  t.y)).rgb;
  vec3 b = texture2D(tSource, vUv + vec2( 0.0,  t.y)).rgb;
  vec3 c = texture2D(tSource, vUv + vec2( t.x,  t.y)).rgb;
  vec3 d = texture2D(tSource, vUv + vec2(-t.x,  0.0)).rgb;
  vec3 e = texture2D(tSource, vUv).rgb;
  vec3 f = texture2D(tSource, vUv + vec2( t.x,  0.0)).rgb;
  vec3 g = texture2D(tSource, vUv + vec2(-t.x, -t.y)).rgb;
  vec3 h = texture2D(tSource, vUv + vec2( 0.0, -t.y)).rgb;
  vec3 i = texture2D(tSource, vUv + vec2( t.x, -t.y)).rgb;

  // 3x3 tent kernel.
  vec3 sum = e * 4.0;
  sum += (b + d + f + h) * 2.0;
  sum += (a + c + g + i);
  sum *= 1.0 / 16.0;

  vec3 dst = texture2D(tTarget, vUv).rgb;
  gl_FragColor = vec4(dst + sum * uBlend, 1.0);
}
`;

/**
 * Anamorphic streak pass. A separate wide horizontal blur of the brightest
 * mip, tinted cool blue. Used sparingly — it is the signature of a large
 * cinema lens and sells muzzle flashes and vehicle headlights.
 */
export const BLOOM_STREAK_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSource;
uniform vec2  uTexel;
uniform vec2  uDirection;
uniform float uAttenuation;
uniform float uPass;

void main() {
  vec3 sum = vec3(0.0);
  float total = 0.0;
  float b = pow(4.0, uPass);
  for (int i = 0; i < 4; i++) {
    float w = pow(uAttenuation, b * float(i));
    vec2 off = uDirection * uTexel * (b * float(i));
    sum += texture2D(tSource, vUv + off).rgb * w;
    total += w;
  }
  gl_FragColor = vec4(sum / max(total, 1e-4), 1.0);
}
`;
