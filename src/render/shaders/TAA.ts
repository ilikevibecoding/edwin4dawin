import { GLSL_COMMON } from '../FullScreen';

/**
 * Temporal anti-aliasing with neighbourhood variance clipping.
 *
 * The camera projection is jittered by a Halton(2,3) sub-pixel offset each
 * frame; this pass reprojects the accumulated history through the previous
 * view-projection and blends. History is clipped to an AABB of the current
 * 3x3 neighbourhood in YCoCg space, which is what suppresses the ghosting
 * that makes naive TAA unusable in a fast-moving shooter.
 *
 * TAA also does the heavy lifting for the *other* stochastic passes: GTAO,
 * DOF, and soft shadows all sample with per-frame blue-noise jitter and rely
 * on this accumulation to resolve into clean gradients.
 */
export const TAA_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D tCurrent;
uniform sampler2D tHistory;
uniform sampler2D tDepth;
uniform vec2  uTexel;
uniform vec2  uJitter;
uniform mat4  uInverseViewProjection;
uniform mat4  uPrevViewProjection;
uniform float uFeedbackMin;
uniform float uFeedbackMax;
uniform float uVarianceGamma;
uniform float uMotionReject;
uniform float uReset;

${GLSL_COMMON}

vec3 rgbToYCoCg(vec3 c) {
  return vec3(
     0.25 * c.r + 0.5 * c.g + 0.25 * c.b,
     0.5  * c.r             - 0.5  * c.b,
    -0.25 * c.r + 0.5 * c.g - 0.25 * c.b
  );
}

vec3 yCoCgToRgb(vec3 c) {
  float tmp = c.x - c.z;
  return vec3(tmp + c.y, c.x + c.z, tmp - c.y);
}

// Clip the history colour toward the centre of the neighbourhood AABB rather
// than clamping it. Clipping preserves far more temporal detail on edges
// while still rejecting genuinely stale samples.
vec3 clipToAABB(vec3 history, vec3 minC, vec3 maxC, vec3 avg) {
  vec3 center = 0.5 * (maxC + minC);
  vec3 extent = 0.5 * (maxC - minC) + 1e-5;
  vec3 offset = history - center;
  vec3 unit = abs(offset / extent);
  float maxUnit = max(max(unit.x, unit.y), unit.z);
  if (maxUnit > 1.0) return center + offset / maxUnit;
  return history;
}

/**
 * Catmull-Rom history fetch (Karis, "High Quality Temporal Supersampling").
 *
 * Reprojection almost never lands on a texel centre, so a bilinear history tap
 * low-passes the accumulated image once per frame. At a feedback weight of 0.96
 * that is a blur applied twenty-five times over, and it is the reason TAA gets
 * blamed for softness that is really just repeated bilinear filtering. A
 * bicubic reconstruction has a much flatter passband, so detail survives
 * accumulation instead of being averaged away.
 *
 * Nine taps of the separable 4x4 kernel are collapsed into five bilinear
 * fetches by exploiting that the two inner weights can share one sample.
 */
vec3 sampleHistoryCatmullRom(vec2 uv, vec2 texel) {
  vec2 texSize = 1.0 / texel;
  vec2 samplePos = uv * texSize;
  vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
  vec2 f = samplePos - texPos1;

  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);

  vec2 w12 = w1 + w2;
  vec2 offset12 = w2 / max(w12, 1e-5);

  vec2 texPos0 = (texPos1 - 1.0) * texel;
  vec2 texPos3 = (texPos1 + 2.0) * texel;
  vec2 texPos12 = (texPos1 + offset12) * texel;

  vec3 result = vec3(0.0);
  result += texture2D(tHistory, vec2(texPos0.x,  texPos0.y)).rgb  * w0.x  * w0.y;
  result += texture2D(tHistory, vec2(texPos12.x, texPos0.y)).rgb  * w12.x * w0.y;
  result += texture2D(tHistory, vec2(texPos3.x,  texPos0.y)).rgb  * w3.x  * w0.y;

  result += texture2D(tHistory, vec2(texPos0.x,  texPos12.y)).rgb * w0.x  * w12.y;
  result += texture2D(tHistory, vec2(texPos12.x, texPos12.y)).rgb * w12.x * w12.y;
  result += texture2D(tHistory, vec2(texPos3.x,  texPos12.y)).rgb * w3.x  * w12.y;

  result += texture2D(tHistory, vec2(texPos0.x,  texPos3.y)).rgb  * w0.x  * w3.y;
  result += texture2D(tHistory, vec2(texPos12.x, texPos3.y)).rgb  * w12.x * w3.y;
  result += texture2D(tHistory, vec2(texPos3.x,  texPos3.y)).rgb  * w3.x  * w3.y;

  return max(result, 0.0);
}

/** Finds the closest-to-camera depth in a 3x3 cross — reprojecting from that
 *  pixel gives far cleaner silhouette edges than reprojecting from the centre. */
vec2 closestFragment(vec2 uv, out float depth) {
  vec2 best = uv;
  float bestD = texture2D(tDepth, uv).x;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec2 o = uv + vec2(float(x), float(y)) * uTexel;
      float d = texture2D(tDepth, o).x;
      if (d < bestD) { bestD = d; best = o; }
    }
  }
  depth = bestD;
  return best;
}

void main() {
  // Undo the projection jitter so the resolved image is stable.
  vec2 uv = vUv;

  float depth;
  vec2 closest = closestFragment(uv, depth);

  vec4 clip = vec4(closest * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 world = uInverseViewProjection * clip;
  world /= world.w;
  vec4 prevClip = uPrevViewProjection * world;
  vec2 prevUv = (prevClip.xy / prevClip.w) * 0.5 + 0.5;

  vec3 current = texture2D(tCurrent, uv).rgb;

  bool offscreen = prevUv.x < 0.0 || prevUv.x > 1.0 || prevUv.y < 0.0 || prevUv.y > 1.0;
  if (offscreen || uReset > 0.5) {
    gl_FragColor = vec4(current, 1.0);
    return;
  }

  // Neighbourhood statistics in YCoCg (variance clipping, Salvi 2016).
  vec3 m1 = vec3(0.0);
  vec3 m2 = vec3(0.0);
  vec3 minC = vec3(1e9);
  vec3 maxC = vec3(-1e9);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec3 c = rgbToYCoCg(texture2D(tCurrent, uv + vec2(float(x), float(y)) * uTexel).rgb);
      m1 += c;
      m2 += c * c;
      minC = min(minC, c);
      maxC = max(maxC, c);
    }
  }

  vec3 mu = m1 / 9.0;
  vec3 sigma = sqrt(max(m2 / 9.0 - mu * mu, 0.0));
  vec3 lo = max(mu - uVarianceGamma * sigma, minC);
  vec3 hi = min(mu + uVarianceGamma * sigma, maxC);

  vec3 historyRgb = sampleHistoryCatmullRom(prevUv, uTexel);
  vec3 history = rgbToYCoCg(historyRgb);
  history = clipToAABB(history, lo, hi, mu);

  vec3 currentY = rgbToYCoCg(current);

  // Adaptive feedback: trust history heavily when the pixel is temporally
  // stable, drop it fast when the neighbourhood is changing (disocclusion,
  // muzzle flash, explosion) so nothing smears.
  float lumaHistory = history.x;
  float lumaCurrent = currentY.x;
  float diff = abs(lumaCurrent - lumaHistory) / max(max(lumaCurrent, lumaHistory), 0.2);
  float unbiased = 1.0 - diff;
  float feedback = mix(uFeedbackMin, uFeedbackMax, unbiased * unbiased);

  // Screen-space motion also reduces confidence in the history sample.
  //
  // Reprojection is exact, but the *resampling* it needs is not: any offset that
  // is not a whole number of texels costs one bicubic filter per frame, and at a
  // feedback of 0.96 that filter is applied across a window nearly thirty frames
  // deep. A drift of a single pixel per frame is enough to turn a one-pixel
  // railing into a wide grey band — the accumulated low-pass, not a reprojection
  // error, which is why it survives an exact velocity. Rejecting hard enough
  // that a pixel of motion already costs a tenth of the history keeps the
  // resolve honest while the camera moves, and a still camera reprojects to a
  // whole texel, takes the single-tap path through the filter, and keeps the
  // full window.
  float motion = length((uv - prevUv) / uTexel);
  feedback *= exp(-motion * uMotionReject);

  vec3 resolved = yCoCgToRgb(mix(currentY, history, feedback));
  gl_FragColor = vec4(max(resolved, 0.0), 1.0);
}
`;
