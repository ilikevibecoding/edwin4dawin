import { GLSL_COLOR, GLSL_CONST, GLSL_NOISE } from './common.glsl';

/**
 * Display-referred tail of the chain: anti-aliasing for the non-temporal
 * presets, contrast-adaptive sharpening, film grain, dither and the sRGB
 * encode.
 *
 * Order matters here. Sharpening runs on the anti-aliased image (otherwise it
 * re-introduces the aliasing), grain goes on after sharpening (otherwise the
 * sharpener amplifies the grain into noise), and the dither is the very last
 * thing before the 8-bit write.
 */

export const FINAL_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}

in vec2 vUv;
uniform sampler2D uColor;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uSharpness;
uniform float uGrain;
uniform float uGrainSize;
uniform float uFrame;
uniform float uDither;
out vec4 fragColor;

/**
 * AMD FidelityFX contrast-adaptive sharpening. Sharpens least where the local
 * contrast is already high, so it recovers TAA softness without ringing on
 * silhouettes the way an unsharp mask does.
 */
vec3 cas(vec2 uv, float sharpness) {
  vec3 a = texture(uColor, uv + vec2(-uTexel.x, -uTexel.y)).rgb;
  vec3 b = texture(uColor, uv + vec2(0.0, -uTexel.y)).rgb;
  vec3 c = texture(uColor, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  vec3 d = texture(uColor, uv + vec2(-uTexel.x, 0.0)).rgb;
  vec3 e = texture(uColor, uv).rgb;
  vec3 f = texture(uColor, uv + vec2(uTexel.x, 0.0)).rgb;
  vec3 g = texture(uColor, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  vec3 h = texture(uColor, uv + vec2(0.0, uTexel.y)).rgb;
  vec3 i = texture(uColor, uv + vec2(uTexel.x, uTexel.y)).rgb;

  vec3 mn = min(min(min(d, e), min(f, b)), h);
  mn += min(mn, min(min(a, c), min(g, i)));
  vec3 mx = max(max(max(d, e), max(f, b)), h);
  mx += max(mx, max(max(a, c), max(g, i)));

  vec3 amp = sqrt(clamp(min(mn, 2.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
  vec3 w = amp * (-1.0 / mix(8.0, 5.0, clamp(sharpness, 0.0, 1.0)));
  return clamp((((b + d) + (f + h)) * w + e) / (1.0 + 4.0 * w), 0.0, 1.0);
}

void main() {
  vec3 color = uSharpness > 0.001 ? cas(vUv, uSharpness) : texture(uColor, vUv).rgb;

  color = linearToSrgb(max(color, vec3(0.0)));

  if (uGrain > 0.0001) {
    // Monochrome grain, added *after* the sRGB encode and weighted toward the
    // low tones.
    //
    // The encode is not a detail. Film grain is roughly constant in density,
    // which is a log quantity, so its amplitude belongs in the encoded domain;
    // adding it to display-linear values and encoding afterwards multiplies it by
    // the transfer function's slope, which is 6x steeper at 1% grey than at mid
    // grey. A strength that is imperceptible on a lit wall then turns every
    // shadow into visible noise — the exact "grey mush in the shadows" this is
    // supposed to avoid.
    vec2 gp = floor(vUv * uResolution / max(uGrainSize, 1.0));
    float n = hash12(gp + fract(uFrame * 0.6180339887) * 1733.0) - 0.5;
    float n2 = hash12(gp * 0.5 + fract(uFrame * 0.6180339887) * 977.0) - 0.5;
    float grain = n * 0.72 + n2 * 0.28;
    float l = lumaFast(color);
    // Strongest in the low midtones, fading out of the highlights and out of
    // true black, where a print is flat and grain would read as sensor noise.
    float weight = mix(1.0, 0.22, smoothstep(0.10, 0.85, l)) * smoothstep(0.0, 0.05, l);
    color += grain * uGrain * weight;
  }

  // Triangular-PDF dither. Without this, a clear sky quantises into visible
  // bands the moment it hits the 8-bit back buffer.
  color += triDither(vUv, uFrame) * uDither * (1.0 / 255.0);

  fragColor = vec4(color, 1.0);
}
`;

/**
 * FXAA 3.11, luma edge detection with a directional edge walk. Cheap fallback
 * for presets that cannot afford a temporal history.
 */
export const FXAA_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
in vec2 vUv;
uniform sampler2D uColor;
uniform vec2 uTexel;
out vec4 fragColor;

#define EDGE_THRESHOLD_MIN 0.0312
#define EDGE_THRESHOLD_MAX 0.125
#define SUBPIXEL_QUALITY 0.75
#define ITERATIONS 12

float lumaAt(vec2 uv) { return lumaFast(texture(uColor, uv).rgb); }

void main() {
  vec3 center = texture(uColor, vUv).rgb;
  float lc = lumaFast(center);
  float ld = lumaAt(vUv + vec2(0.0, -uTexel.y));
  float lu = lumaAt(vUv + vec2(0.0, uTexel.y));
  float ll = lumaAt(vUv + vec2(-uTexel.x, 0.0));
  float lr = lumaAt(vUv + vec2(uTexel.x, 0.0));

  float lmin = min(lc, min(min(ld, lu), min(ll, lr)));
  float lmax = max(lc, max(max(ld, lu), max(ll, lr)));
  float range = lmax - lmin;

  if (range < max(EDGE_THRESHOLD_MIN, lmax * EDGE_THRESHOLD_MAX)) {
    fragColor = vec4(center, 1.0);
    return;
  }

  float ldl = lumaAt(vUv + vec2(-uTexel.x, -uTexel.y));
  float ldr = lumaAt(vUv + vec2(uTexel.x, -uTexel.y));
  float lul = lumaAt(vUv + vec2(-uTexel.x, uTexel.y));
  float lur = lumaAt(vUv + vec2(uTexel.x, uTexel.y));

  float ldu = ld + lu;
  float llr = ll + lr;
  float leftCorners = ldl + lul;
  float downCorners = ldl + ldr;
  float rightCorners = ldr + lur;
  float upCorners = lul + lur;

  float edgeHorizontal = abs(-2.0 * ll + leftCorners) + abs(-2.0 * lc + ldu) * 2.0 +
    abs(-2.0 * lr + rightCorners);
  float edgeVertical = abs(-2.0 * lu + upCorners) + abs(-2.0 * lc + llr) * 2.0 +
    abs(-2.0 * ld + downCorners);
  bool isHorizontal = edgeHorizontal >= edgeVertical;

  float luma1 = isHorizontal ? ld : ll;
  float luma2 = isHorizontal ? lu : lr;
  float gradient1 = luma1 - lc;
  float gradient2 = luma2 - lc;
  bool is1Steepest = abs(gradient1) >= abs(gradient2);
  float gradientScaled = 0.25 * max(abs(gradient1), abs(gradient2));

  float stepLength = isHorizontal ? uTexel.y : uTexel.x;
  float lumaLocalAverage;
  if (is1Steepest) {
    stepLength = -stepLength;
    lumaLocalAverage = 0.5 * (luma1 + lc);
  } else {
    lumaLocalAverage = 0.5 * (luma2 + lc);
  }

  vec2 currentUv = vUv;
  if (isHorizontal) currentUv.y += stepLength * 0.5;
  else currentUv.x += stepLength * 0.5;

  vec2 offset = isHorizontal ? vec2(uTexel.x, 0.0) : vec2(0.0, uTexel.y);
  vec2 uv1 = currentUv - offset;
  vec2 uv2 = currentUv + offset;

  float lumaEnd1 = lumaAt(uv1) - lumaLocalAverage;
  float lumaEnd2 = lumaAt(uv2) - lumaLocalAverage;
  bool reached1 = abs(lumaEnd1) >= gradientScaled;
  bool reached2 = abs(lumaEnd2) >= gradientScaled;
  if (!reached1) uv1 -= offset;
  if (!reached2) uv2 += offset;

  if (!(reached1 && reached2)) {
    for (int i = 2; i < ITERATIONS; i++) {
      if (!reached1) lumaEnd1 = lumaAt(uv1) - lumaLocalAverage;
      if (!reached2) lumaEnd2 = lumaAt(uv2) - lumaLocalAverage;
      reached1 = abs(lumaEnd1) >= gradientScaled;
      reached2 = abs(lumaEnd2) >= gradientScaled;
      // Quality ramp: longer strides once the search leaves the local edge.
      float q = i < 5 ? 1.0 : (i < 8 ? 1.5 : 2.0);
      if (!reached1) uv1 -= offset * q;
      if (!reached2) uv2 += offset * q;
      if (reached1 && reached2) break;
    }
  }

  float distance1 = isHorizontal ? (vUv.x - uv1.x) : (vUv.y - uv1.y);
  float distance2 = isHorizontal ? (uv2.x - vUv.x) : (uv2.y - vUv.y);
  bool isDirection1 = distance1 < distance2;
  float distanceFinal = min(distance1, distance2);
  float edgeThickness = distance1 + distance2;
  float pixelOffset = -distanceFinal / max(edgeThickness, 1e-5) + 0.5;

  bool isLumaCenterSmaller = lc < lumaLocalAverage;
  bool correctVariation =
    ((isDirection1 ? lumaEnd1 : lumaEnd2) < 0.0) != isLumaCenterSmaller;
  float finalOffset = correctVariation ? pixelOffset : 0.0;

  // Sub-pixel term recovers the aliasing the edge walk cannot see.
  float lumaAverage = (1.0 / 12.0) * (2.0 * (ldu + llr) + leftCorners + rightCorners);
  float subPixelOffset1 = clamp(abs(lumaAverage - lc) / max(range, 1e-5), 0.0, 1.0);
  float subPixelOffset2 = (-2.0 * subPixelOffset1 + 3.0) * subPixelOffset1 * subPixelOffset1;
  float subPixelOffsetFinal = subPixelOffset2 * subPixelOffset2 * SUBPIXEL_QUALITY;
  finalOffset = max(finalOffset, subPixelOffsetFinal);

  vec2 finalUv = vUv;
  if (isHorizontal) finalUv.y += finalOffset * stepLength;
  else finalUv.x += finalOffset * stepLength;

  fragColor = vec4(texture(uColor, finalUv).rgb, 1.0);
}
`;

/**
 * Directionally localised anti-aliasing, used for the `smaa` preset.
 *
 * SMAA 1x proper needs its precomputed area/search textures, which are binary
 * assets this project does not ship, so the blend weights are derived
 * analytically instead: a short-edge box term for high-frequency aliasing plus a
 * long-edge search that resolves near-horizontal and near-vertical silhouettes
 * — the two cases FXAA handles worst.
 */
export const DLAA_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
in vec2 vUv;
uniform sampler2D uColor;
uniform vec2 uTexel;
out vec4 fragColor;

vec3 fetch(vec2 uv) { return texture(uColor, uv).rgb; }

// Walks along an edge until the high-pass signal dies, up to limit texels.
float edgeLength(vec2 uv, vec2 dir, vec2 perp, float refDelta, float limit) {
  float dist = 0.0;
  for (int i = 1; i <= 8; i++) {
    if (float(i) > limit) break;
    vec2 p = uv + dir * float(i);
    float d = lumaFast(fetch(p + perp)) - lumaFast(fetch(p - perp));
    if (d * refDelta <= 0.0 || abs(d) < abs(refDelta) * 0.25) break;
    dist += 1.0;
  }
  return dist;
}

void main() {
  vec3 center = fetch(vUv);
  vec2 tx = vec2(uTexel.x, 0.0);
  vec2 ty = vec2(0.0, uTexel.y);

  vec3 left = fetch(vUv - tx);
  vec3 right = fetch(vUv + tx);
  vec3 up = fetch(vUv - ty);
  vec3 down = fetch(vUv + ty);

  // Short-edge pass: a 5-tap high-pass drives a small directional blur.
  vec3 blurH = (left + right + center * 2.0) * 0.25;
  vec3 blurV = (up + down + center * 2.0) * 0.25;
  float edgeH = abs(lumaFast(blurH) - lumaFast(center));
  float edgeV = abs(lumaFast(blurV) - lumaFast(center));

  float lc = lumaFast(center);
  float wH = clamp(edgeH * 4.0 - 0.1, 0.0, 1.0);
  float wV = clamp(edgeV * 4.0 - 0.1, 0.0, 1.0);
  vec3 result = mix(center, blurH, wH);
  result = mix(result, blurV, wV);

  // Long-edge pass: horizontal edges first.
  float dH = lumaFast(down) - lumaFast(up);
  if (abs(dH) > 0.06) {
    float lenL = edgeLength(vUv, -tx, ty, dH, 8.0);
    float lenR = edgeLength(vUv, tx, ty, dH, 8.0);
    float len = lenL + lenR + 1.0;
    if (len > 2.5) {
      // Coverage of the pixel by the reconstructed edge line.
      float coverage = clamp((min(lenL, lenR) + 0.5) / len, 0.0, 0.5);
      vec3 blend = dH > 0.0 ? down : up;
      result = mix(result, mix(result, blend, 0.5), coverage * 2.0);
    }
  }

  float dV = lumaFast(right) - lumaFast(left);
  if (abs(dV) > 0.06) {
    float lenU = edgeLength(vUv, -ty, tx, dV, 8.0);
    float lenD = edgeLength(vUv, ty, tx, dV, 8.0);
    float len = lenU + lenD + 1.0;
    if (len > 2.5) {
      float coverage = clamp((min(lenU, lenD) + 0.5) / len, 0.0, 0.5);
      vec3 blend = dV > 0.0 ? right : left;
      result = mix(result, mix(result, blend, 0.5), coverage * 2.0);
    }
  }

  fragColor = vec4(result, 1.0);
}
`;

/** Straight texture copy, used for history seeding and debug readback. */
export const BLIT_FRAG = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D uColor;
uniform float uScale;
out vec4 fragColor;
void main() { fragColor = texture(uColor, vUv) * uScale; }
`;
