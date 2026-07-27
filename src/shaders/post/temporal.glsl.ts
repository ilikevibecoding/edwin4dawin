import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE } from './common.glsl';

/**
 * Temporal anti-aliasing.
 *
 * The camera jitters by a Halton sequence inside the pixel footprint (applied in
 * `GBufferPass`), so successive frames sample different sub-pixel positions;
 * this resolves them into one image. Three things make the difference between
 * TAA and a smeared mess:
 *
 *  - **Velocity dilation.** Reprojecting with the pixel's own motion vector
 *    fails on silhouettes, where foreground and background disagree. Taking the
 *    motion vector of the *closest* pixel in the neighbourhood pins the edge to
 *    the object in front, which is where the aliasing is.
 *  - **Bicubic history.** A bilinear history fetch blurs by a fraction of a
 *    pixel every frame and compounds; the Catmull-Rom filter keeps the image as
 *    sharp as the sub-pixel data allows.
 *  - **Neighbourhood clipping.** History that lies outside the colour range this
 *    pixel can currently see is stale. Clipping toward the current colour along
 *    a ray in YCoCg space (rather than clamping per channel) preserves hue while
 *    removing ghosts, and doing it against a variance-derived box rather than a
 *    hard min/max keeps thin geometry from flickering.
 *
 * The blend happens in a range-compressed domain so a single bright pixel cannot
 * dominate the average, which is what causes HDR TAA to leave comet trails
 * behind muzzle flashes.
 */
export const TAA_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}

in vec2 vUv;

uniform sampler2D uColor;
uniform sampler2D uHistory;
uniform sampler2D uVelocity;
uniform sampler2D uDepth;

uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uFeedback;
uniform float uFeedbackMoving;
uniform float uVarianceGamma;
uniform float uReset;

out vec4 fragColor;

/** Catmull-Rom, 9 texture fetches arranged as 3x3 groups of bilinear taps. */
vec3 sampleHistory(vec2 uv) {
  vec2 position = uv * uResolution;
  vec2 centerPosition = floor(position - 0.5) + 0.5;
  vec2 f = position - centerPosition;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;

  vec2 w0 = f2 - 0.5 * (f3 + f);
  vec2 w1 = 1.5 * f3 - 2.5 * f2 + 1.0;
  vec2 w3 = 0.5 * (f3 - f2);
  vec2 w2 = 1.0 - w0 - w1 - w3;
  vec2 w12 = w1 + w2;

  vec2 tc0 = (centerPosition - 1.0) / uResolution;
  vec2 tc12 = (centerPosition + w2 / w12) / uResolution;
  vec2 tc3 = (centerPosition + 2.0) / uResolution;

  vec3 sum = vec3(0.0);
  sum += texture(uHistory, vec2(tc0.x, tc0.y)).rgb * (w0.x * w0.y);
  sum += texture(uHistory, vec2(tc12.x, tc0.y)).rgb * (w12.x * w0.y);
  sum += texture(uHistory, vec2(tc3.x, tc0.y)).rgb * (w3.x * w0.y);
  sum += texture(uHistory, vec2(tc0.x, tc12.y)).rgb * (w0.x * w12.y);
  sum += texture(uHistory, vec2(tc12.x, tc12.y)).rgb * (w12.x * w12.y);
  sum += texture(uHistory, vec2(tc3.x, tc12.y)).rgb * (w3.x * w12.y);
  sum += texture(uHistory, vec2(tc0.x, tc3.y)).rgb * (w0.x * w3.y);
  sum += texture(uHistory, vec2(tc12.x, tc3.y)).rgb * (w12.x * w3.y);
  sum += texture(uHistory, vec2(tc3.x, tc3.y)).rgb * (w3.x * w3.y);
  return max(sum, vec3(0.0));
}

/** Clips the history colour toward the current one until it is inside the AABB. */
vec3 clipToAABB(vec3 mn, vec3 mx, vec3 current, vec3 history) {
  vec3 center = 0.5 * (mx + mn);
  vec3 extent = 0.5 * (mx - mn) + 1e-5;
  vec3 offset = history - center;
  vec3 unit = abs(offset / extent);
  float maxUnit = max(unit.x, max(unit.y, unit.z));
  return maxUnit > 1.0 ? center + offset / maxUnit : history;
}

void main() {
  // Velocity dilation: pick the motion vector of the closest neighbour.
  float bestDepth = 2.0;
  vec2 bestOffset = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)) * uTexel;
      float d = texture(uDepth, vUv + o).r;
      if (d < bestDepth) {
        bestDepth = d;
        bestOffset = o;
      }
    }
  }
  vec2 velocity = texture(uVelocity, vUv + bestOffset).xy;

  // Current-frame neighbourhood statistics, in a range-compressed YCoCg space.
  vec3 m1 = vec3(0.0);
  vec3 m2 = vec3(0.0);
  vec3 neighbourMin = vec3(1e6);
  vec3 neighbourMax = vec3(-1e6);
  vec3 centerCompressed = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)) * uTexel;
      vec3 c = rgbToYCoCg(tonemapRange(texture(uColor, vUv + o).rgb));
      if (x == 0 && y == 0) centerCompressed = c;
      m1 += c;
      m2 += c * c;
      neighbourMin = min(neighbourMin, c);
      neighbourMax = max(neighbourMax, c);
    }
  }
  vec3 mean = m1 / 9.0;
  vec3 sigma = sqrt(max(m2 / 9.0 - mean * mean, vec3(0.0)));

  vec2 prevUv = vUv - velocity;
  bool onScreen = prevUv.x > 0.0 && prevUv.x < 1.0 && prevUv.y > 0.0 && prevUv.y < 1.0;
  if (!onScreen || uReset > 0.5) {
    fragColor = vec4(texture(uColor, vUv).rgb, 1.0);
    return;
  }

  float speed = length(velocity * uResolution);
  // Fast motion gets less history: there is less of it that is still valid, and
  // the eye cannot resolve the aliasing it would have fixed.
  float feedback = mix(uFeedback, uFeedbackMoving, clamp(speed / 20.0, 0.0, 1.0));

  // A tighter variance box while moving; a looser one when static, where thin
  // geometry needs the extra room or it strobes.
  float gamma = uVarianceGamma * mix(1.0, 0.6, clamp(speed / 12.0, 0.0, 1.0));
  vec3 mn = max(mean - gamma * sigma, neighbourMin);
  vec3 mx = min(mean + gamma * sigma, neighbourMax);

  vec3 history = rgbToYCoCg(tonemapRange(sampleHistory(prevUv)));
  history = clipToAABB(mn, mx, centerCompressed, history);

  // How far the history had to be moved is a direct measure of how stale it is;
  // discarding more of it where that distance is large removes the last of the
  // ghosting without softening the static parts of the frame.
  float clipDistance = length((history - centerCompressed) / max(sigma, vec3(1e-3)));
  feedback *= exp(-clipDistance * 0.08);

  vec3 resolved = mix(centerCompressed, history, clamp(feedback, 0.0, 0.97));
  fragColor = vec4(tonemapRangeInv(yCoCgToRgb(resolved)), 1.0);
}
`;

/**
 * Generic half-resolution temporal accumulator, shared by SSR and volumetrics.
 *
 * Both are stochastic: SSR jitters its reflection direction across the GGX lobe
 * and the fog march jitters its step offsets, so a single frame of either is
 * noise. Accumulating over reprojected history is what turns that noise into the
 * converged result, and it is far cheaper than raising the sample count. The
 * neighbourhood clamp is per-channel here rather than a YCoCg clip: these are
 * signal buffers, not display colour, and the extra hue preservation buys
 * nothing.
 */
export const TEMPORAL_ACCUM_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform sampler2D uVelocity;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uFeedback;
uniform float uReset;
out vec4 fragColor;

void main() {
  vec4 current = texture(uCurrent, vUv);

  vec2 velocity = texture(uVelocity, vUv).xy;
  vec2 prevUv = vUv - velocity;
  bool onScreen = prevUv.x > 0.0 && prevUv.x < 1.0 && prevUv.y > 0.0 && prevUv.y < 1.0;
  if (!onScreen || uReset > 0.5) {
    fragColor = current;
    return;
  }

  vec4 mn = current;
  vec4 mx = current;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      vec4 s = texture(uCurrent, vUv + vec2(float(x), float(y)) * uTexel);
      mn = min(mn, s);
      mx = max(mx, s);
    }
  }

  vec4 history = clamp(texture(uHistory, prevUv), mn, mx);
  float speed = length(velocity * uResolution);
  float feedback = uFeedback * exp(-speed * 0.05);
  fragColor = mix(current, history, clamp(feedback, 0.0, 0.95));
}
`;
