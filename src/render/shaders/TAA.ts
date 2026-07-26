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

  vec3 historyRgb = texture2D(tHistory, prevUv).rgb;
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

  // Sub-pixel motion also reduces confidence in the history sample.
  float motion = length((uv - prevUv) / uTexel);
  feedback *= exp(-motion * 0.012);

  vec3 resolved = yCoCgToRgb(mix(currentY, history, feedback));
  gl_FragColor = vec4(max(resolved, 0.0), 1.0);
}
`;
