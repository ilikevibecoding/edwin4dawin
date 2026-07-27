/**
 * Content-adaptive exposure.
 *
 * The lighting system already meters analytically: it knows the sun's
 * irradiance and the sky's measured radiance, so it can place a sunlit surface
 * at a chosen point on the tone curve for any time of day. What it cannot know
 * is what the camera is actually pointing at. Standing in an archway or inside
 * a building, most of the frame is receiving a fraction of the metered
 * irradiance, and the result is a correctly-metered scene rendered as a
 * two-stop-under photograph.
 *
 * This pair of passes closes that gap the way a camera does — by measuring the
 * frame — but the correction it produces is deliberately *bounded*. Unbounded
 * frame-average metering is what makes a night scene look like an overcast
 * afternoon and a dark interior look like a lightbox: the average is normalised
 * away and every location ends up equally bright, which is the flattest
 * possible result. Clamping the trim to about a stop and a quarter either side
 * keeps the analytic meter in charge of how bright the *world* is while letting
 * the frame decide how bright the *shot* is.
 *
 * The whole thing runs on the GPU into a 1x1 target that the composite samples,
 * so there is no pipeline stall and no readback latency.
 */

/**
 * Scene → coarse grid of average log luminance.
 *
 * Log space, not linear: the average of the logarithm is the geometric mean,
 * which is a stable estimate of the middle of the frame's exposure range. A
 * linear average is dominated by whatever the single brightest object is, so a
 * sun glint or a muzzle flash would visibly stop the whole image down.
 */
export const LUM_REDUCE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tScene;
uniform sampler2D tDepth;
/** Footprint of one destination pixel, in source UV units. */
uniform vec2  uTile;
/** Weight given to pixels at the far plane. */
uniform float uSkyWeight;

void main() {
  float logSum = 0.0;
  float wSum = 0.0;
  float skySum = 0.0;
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      vec2 o = (vec2(float(x), float(y)) + 0.5) * 0.25 - 0.5;
      vec2 uv = vUv + o * uTile;
      vec3 c = texture2D(tScene, uv).rgb;
      float l = dot(max(c, 0.0), vec3(0.2126, 0.7152, 0.0722));
      // The sky is not the subject. Metering it at full weight is what makes
      // every outdoor frame with a horizon in it come out under-exposed, and
      // it is the reason real cameras ship with a weighted metering pattern
      // rather than a flat average.
      float sky = step(0.999999, texture2D(tDepth, uv).x);
      float w = mix(1.0, uSkyWeight, sky);
      logSum += log(max(l, 2e-4)) * w;
      wSum += w;
      skySum += sky;
    }
  }
  // The sky fraction rides along in the third channel: it is the cheapest
  // available measure of whether the camera is enclosed, and that decides how
  // much authority the trim below is given.
  gl_FragColor = vec4(logSum / max(wSum, 1e-4), wSum, skySum / 16.0, 1.0);
}
`;

/**
 * Coarse grid → single adapted value, with eye-adaptation smoothing.
 *
 * Centre weighting is applied here rather than in the reduce pass so the grid
 * stays reusable, and the temporal blend lives in the same pass as the average
 * so adaptation costs one 1x1 draw instead of a readback.
 */
export const LUM_RESOLVE_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tLum;
uniform sampler2D tPrev;
uniform vec2  uLumSize;
/** Per-frame blend toward the new measurement, 0..1. */
uniform float uRate;
uniform float uReset;

void main() {
  float logSum = 0.0;
  float wSum = 0.0;
  float skySum = 0.0;
  float skyW = 0.0;
  for (int y = 0; y < LUM_H; y++) {
    for (int x = 0; x < LUM_W; x++) {
      vec2 uv = (vec2(float(x), float(y)) + 0.5) / uLumSize;
      vec3 s = texture2D(tLum, uv).xyz;
      // Anisotropic falloff: a shooter's subject spreads horizontally along the
      // sightline far more than it does vertically.
      vec2 d = (uv - 0.5) * vec2(0.78, 1.0);
      float centre = exp(-dot(d, d) * 4.0);
      float w = s.y * centre;
      logSum += s.x * w;
      wSum += w;
      // Accumulated against the centre weight alone. Weighting it by s.y as
      // well would fold in the metering pattern's sky suppression a second
      // time, which drives the measured fraction down by most of an order of
      // magnitude and makes an open street read as enclosed.
      skySum += s.z * centre;
      skyW += centre;
    }
  }
  float avg = exp(logSum / max(wSum, 1e-4));
  float sky = skySum / max(skyW, 1e-4);
  vec2 prev = texture2D(tPrev, vec2(0.5)).xy;
  float rate = clamp(uRate, 0.0, 1.0);
  gl_FragColor = vec4(
    uReset > 0.5 ? avg : mix(prev.x, avg, rate),
    uReset > 0.5 ? sky : mix(prev.y, sky, rate),
    0.0, 1.0);
}
`;

/**
 * Shared by the composite and the bloom prefilter so both agree on the final
 * exposure. The bloom threshold has to be expressed in post-exposure terms or
 * it means something different on every preset — at the analytic meter's night
 * scale, a threshold authored against daylight radiance is forty stops away and
 * nothing ever blooms.
 */
export const EXPOSURE_GLSL = /* glsl */ `
uniform sampler2D tExposure;
uniform float uAutoKey;
uniform float uAutoMin;
uniform float uAutoMax;
uniform float uAutoMaxOpen;

/**
 * The upward bound is where the two meters disagree, so it is set by how much
 * the analytic one can be trusted.
 *
 * Outdoors the analytic solution is right: it knows the sun's irradiance and the
 * sky's measured radiance, and letting the frame average override it normalises
 * every shot to the same brightness — a shaded street ends up as bright as an
 * open rooftop and the level loses all of its lighting variety.
 *
 * Enclosed is the one case it cannot solve, because the reference surface it
 * meters is a 45-degree slope under an unoccluded sky and a room does not have
 * one. Interiors here metered three and a half stops under, which is not "moody"
 * — it is a fifth of the frame at pure black with the rest inside a tenth of a
 * stop of itself. So the trim gets most of its authority there and almost none
 * outdoors, keyed off the sky's share of the frame.
 */
float resolveExposure(float base) {
  vec2 m = texture2D(tExposure, vec2(0.5)).xy;
  float open = smoothstep(0.015, 0.20, m.y);
  float hiBound = mix(uAutoMax, uAutoMaxOpen, open);
  float trim = clamp(uAutoKey / max(m.x * base, 1e-5), uAutoMin, max(hiBound, uAutoMin));
  return base * trim;
}
`;
