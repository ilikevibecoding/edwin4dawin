import { GLSL_COLOR, GLSL_CONST } from './common.glsl';

/**
 * Progressive-blur bloom: 13-tap Karis-averaged downsample chain, 3x3 tent
 * upsample accumulated with a lerp so the pyramid weights sum to one.
 *
 * Two things keep it from turning the frame milky. The threshold is high and
 * soft-kneed, so only genuinely bright radiance contributes at all; and the
 * composite is a lerp rather than an add, so strength redistributes energy
 * instead of injecting it.
 */

const KERNEL = /* glsl */ `
/**
 * Karis weight. The clamp is load-bearing: written as 1/(1 + luma(c)) this has
 * a pole at luma = -1, and a single negative texel anywhere in the frame —
 * which a half-float HDR target picks up from ordinary rounding around zero, and
 * which the scene does in fact contain a handful of — sends the weight to
 * infinity. The weighted average then evaluates infinity over infinity, writes
 * NaN into the mip, and the pyramid's own downsample and upsample spread that
 * NaN over a block tens of pixels across. It surfaces as a hard-edged black
 * rectangle, because the tone map clamps NaN to zero, and it moves or vanishes
 * with resolution and mip count, because whether a tap footprint lands on the
 * bad texel depends on both.
 *
 * Radiance cannot be negative, so clamping here loses nothing real.
 */
float karisWeight(vec3 c) { return 1.0 / (1.0 + max(luma(c), 0.0)); }

/**
 * 13 taps arranged as four overlapping 2x2 boxes plus a centre box. Halves the
 * resolution without the aliasing a naive 4-tap box leaves, which is what makes
 * bloom flicker on thin bright geometry such as tracers.
 */
vec3 downsample13(sampler2D tex, vec2 uv, vec2 t, bool karis) {
  vec3 a = max(texture(tex, uv + t * vec2(-1.0, -1.0)).rgb, 0.0);
  vec3 b = max(texture(tex, uv + t * vec2( 0.0, -1.0)).rgb, 0.0);
  vec3 c = max(texture(tex, uv + t * vec2( 1.0, -1.0)).rgb, 0.0);
  vec3 d = max(texture(tex, uv + t * vec2(-0.5, -0.5)).rgb, 0.0);
  vec3 e = max(texture(tex, uv + t * vec2( 0.5, -0.5)).rgb, 0.0);
  vec3 f = max(texture(tex, uv + t * vec2(-1.0,  0.0)).rgb, 0.0);
  vec3 g = max(texture(tex, uv).rgb, 0.0);
  vec3 h = max(texture(tex, uv + t * vec2( 1.0,  0.0)).rgb, 0.0);
  vec3 i = max(texture(tex, uv + t * vec2(-0.5,  0.5)).rgb, 0.0);
  vec3 j = max(texture(tex, uv + t * vec2( 0.5,  0.5)).rgb, 0.0);
  vec3 k = max(texture(tex, uv + t * vec2(-1.0,  1.0)).rgb, 0.0);
  vec3 l = max(texture(tex, uv + t * vec2( 0.0,  1.0)).rgb, 0.0);
  vec3 m = max(texture(tex, uv + t * vec2( 1.0,  1.0)).rgb, 0.0);

  vec3 b0 = (d + e + i + j) * 0.25;
  vec3 b1 = (a + b + g + f) * 0.25;
  vec3 b2 = (b + c + h + g) * 0.25;
  vec3 b3 = (f + g + l + k) * 0.25;
  vec3 b4 = (g + h + m + l) * 0.25;

  if (!karis) return b0 * 0.5 + (b1 + b2 + b3 + b4) * 0.125;

  // Karis average: weighting each box by inverse luminance stops a single
  // ultra-bright pixel (a specular hit, a muzzle flash) from dominating the
  // whole mip and pulsing between frames.
  float w0 = karisWeight(b0) * 0.5;
  float w1 = karisWeight(b1) * 0.125;
  float w2 = karisWeight(b2) * 0.125;
  float w3 = karisWeight(b3) * 0.125;
  float w4 = karisWeight(b4) * 0.125;
  float wsum = w0 + w1 + w2 + w3 + w4;
  return (b0 * w0 + b1 * w1 + b2 * w2 + b3 * w3 + b4 * w4) / max(wsum, 1e-5);
}

vec3 upsampleTent(sampler2D tex, vec2 uv, vec2 t, float radius) {
  vec4 d = t.xyxy * vec4(1.0, 1.0, -1.0, 0.0) * radius;
  vec3 s = texture(tex, uv - d.xy).rgb;
  s += texture(tex, uv - d.wy).rgb * 2.0;
  s += texture(tex, uv - d.zy).rgb;
  s += texture(tex, uv + d.zw).rgb * 2.0;
  s += texture(tex, uv).rgb * 4.0;
  s += texture(tex, uv + d.xw).rgb * 2.0;
  s += texture(tex, uv + d.zy).rgb;
  s += texture(tex, uv + d.wy).rgb * 2.0;
  s += texture(tex, uv + d.xy).rgb;
  return s * (1.0 / 16.0);
}
`;

/**
 * Thresholds are quoted where they belong: in display-referred stops above
 * white, not in scene radiance.
 *
 * A threshold in absolute radiance only means what the author intended at one
 * exposure. Metered exposure moves by ten stops between a noon street and a
 * dark interior, so a fixed radiance threshold blooms nothing outdoors and
 * blooms every wall indoors. Reading the meter here — the same 1x1 target the
 * grade samples — makes "1.1" mean "just past white" everywhere, and makes the
 * pass independent of whatever absolute scale the lighting rig settles on.
 */
const EXPOSURE = /* glsl */ `
uniform sampler2D uExposureTex;
uniform float uExposureComp;
uniform float uExposureOverride;

float sceneExposure() {
  float ev = texelFetch(uExposureTex, ivec2(0, 0), 0).r;
  return uExposureOverride > 0.0 ? uExposureOverride : exp2(ev + uExposureComp);
}

/**
 * Soft-knee threshold. A hard cut makes bloom pop in and out as radiance
 * crosses the line, which is far more visible than the bloom itself.
 */
float softThreshold(float br, float threshold, float knee) {
  float k = threshold * knee + 1e-5;
  float soft = clamp(br - threshold + k, 0.0, 2.0 * k);
  soft = (soft * soft) / (4.0 * k + 1e-5);
  return max(soft, br - threshold) / max(br, 1e-5);
}
`;

export const BLOOM_PREFILTER_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${KERNEL}
${EXPOSURE}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uSoftKnee;
uniform float uClamp;
out vec4 fragColor;

void main() {
  float e = sceneExposure();
  vec3 c = downsample13(uSrc, vUv, uTexel, true) * e;
  c = min(c, vec3(uClamp));
  fragColor = vec4(c * softThreshold(maxc(c), uThreshold, uSoftKnee) / max(e, 1e-8), 1.0);
}
`;

/**
 * Source for the ghosts, halo and anamorphic streak: the same frame, thresholded
 * far higher than bloom and reduced to an eighth resolution.
 *
 * This is the difference between a lens flare and a fogged frame. A ghost is an
 * image of the aperture formed between two element surfaces, so its irradiance
 * follows the *flux* of a compact source — a sun disk, a muzzle flash, a window
 * into a bright exterior. Feeding the whole bloom pyramid into it instead means
 * a bright sky ghosts too, and because the ghost geometry mirrors through the
 * optical centre, a bright sky at the top of frame pastes a blurred copy of
 * itself across the ground. Broad sources do produce veiling glare, but it is a
 * couple of percent and uniform — which is what the widest bloom mip already
 * provides.
 */
export const FLARE_PREFILTER_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${KERNEL}
${EXPOSURE}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uClamp;
out vec4 fragColor;

void main() {
  float e = sceneExposure();
  vec3 c = downsample13(uSrc, vUv, uTexel, true) * e;
  c = min(c, vec3(uClamp));
  // Hard knee and a square law: the response has to fall away fast enough that
  // a large area slightly over the threshold contributes far less than a small
  // area far over it.
  float br = maxc(c);
  float over = max(br - uThreshold, 0.0);
  float contribution = (over * over) / max(br * (br + uThreshold), 1e-5);
  fragColor = vec4(c * contribution / max(e, 1e-8), 1.0);
}
`;

export const BLOOM_DOWNSAMPLE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${KERNEL}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
out vec4 fragColor;

void main() {
  fragColor = vec4(downsample13(uSrc, vUv, uTexel, false), 1.0);
}
`;

/** Blended with `dst = src.rgb * a + dst.rgb * (1 - a)` so the pyramid normalises. */
export const BLOOM_UPSAMPLE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${KERNEL}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uBlend;
out vec4 fragColor;

void main() {
  fragColor = vec4(upsampleTent(uSrc, vUv, uTexel, uRadius), uBlend);
}
`;

/**
 * Wide separable blur for the anamorphic streak, with a switchable normalisation.
 *
 * A cylindrical lens element spreads a source's flux along one axis, so the
 * streak's peak has to fall as it lengthens — that is the entire look. A blur
 * normalised by its weight sum does the opposite: it preserves the mean, so a
 * source wider than the kernel comes out at full brightness and a 500-pixel
 * reach turns the sun into an opaque band across the frame. (This is exactly
 * what a hazy sunset does, and it looked like a rendering fault.)
 *
 * `uSpread` selects the divisor. At 0 it is an ordinary blur, used to smooth the
 * source first. At 1 it divides by the tap count instead, which makes the output
 * proportional to flux over streak length: a compact source still throws a
 * visible line, and a broad one is attenuated by the ratio of its width to the
 * reach, which is the correct behaviour in both cases.
 */
export const BLOOM_STREAK_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uDirection;
uniform vec3 uTint;
uniform float uAttenuation;
uniform float uSpread;
out vec4 fragColor;

#define STREAK_TAPS 8

void main() {
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = -STREAK_TAPS; i <= STREAK_TAPS; i++) {
    float fi = float(i);
    float w = pow(uAttenuation, abs(fi));
    acc += texture(uSrc, vUv + uDirection * fi).rgb * w;
    wsum += w;
  }
  float denom = mix(max(wsum, 1e-4), float(STREAK_TAPS * 2 + 1), uSpread);
  fragColor = vec4(acc / denom * uTint, 1.0);
}
`;
