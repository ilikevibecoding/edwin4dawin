/** GLSL chunks shared by the sky, terrain, water and post shaders so that every surface is lit,
 *  shadowed by clouds and hazed by the same functions. */

export const GLSL_NOISE = /* glsl */ `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}
`;

/** Uniforms every atmosphere-aware shader shares. */
export const GLSL_ATMOS_UNIFORMS = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSunColor;      // linear radiance scale of direct sun
uniform vec3 uZenithColor;
uniform vec3 uHorizonColor;
uniform vec3 uHazeColor;     // colour of in-scattered haze near the horizon
uniform vec3 uSunHazeColor;  // haze colour looking toward the sun
uniform float uHazeDensity;  // extinction per metre at sea level
uniform float uHazeHeight;   // scale height (m)
uniform float uCloudCoverage;
uniform float uCloudBase;
uniform float uCloudTop;
uniform vec2 uCloudWind;     // world offset of the cloud field (m)
uniform float uCloudSeed;
uniform float uNight;        // 0 day .. 1 night
uniform float uTime;
`;

/** 2D cloud coverage field used for both the raymarched clouds' macro shape and the ground shadows.
 *  "Cloud space" = world xz + the wind offset, so the field itself is static and only drifts. */
export const GLSL_CLOUD_FIELD = /* glsl */ `
float worley2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash22(i + g) - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}
/** Macro cloud field in cloud space: x = coverage (0 clear .. 1 solid), y = "interior" (how deep inside a
 *  mass; drives vertical development so large cells tower while small ones stay flat), z = column
 *  thickness over a wide ramp (keeps varying across a closed deck, where x and y have saturated, so the
 *  underside of an overcast shows its cells).
 *  Individual cumulus are domain-warped cellular blobs (two worley scales, ~6 km and ~3 km spacing) that
 *  only develop where a slow ~17 km macro field is high: clusters of distinct 1-4 km masses separated by
 *  sectors of clear sky, rather than an even sprinkle that fuses into a band near the horizon. */
vec3 cloudFieldCS(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  vec2 warp = (vec2(fbm3(p * 1.3), fbm3(p * 1.3 + 4.2)) - 0.5) * 0.35;
  float macro = fbm3(p * 0.4 + 9.0);
  float cellsA = 1.0 - worley2(cs * (1.0 / 6000.0) + warp + uCloudSeed * 0.37);
  float cellsB = 1.0 - worley2(cs * (1.0 / 3000.0) + warp * 1.5 + uCloudSeed * 0.61 + 2.3);
  float f = (cellsA * 0.65 + cellsB * 0.35) * 0.55 + macro * 0.45;
  float thr = 0.72 - uCloudCoverage * 0.40;
  // narrow ramp: the edge detail comes from the 3D noise erosion, a wide ramp only made thin veils
  float cov = smoothstep(thr, thr + 0.09, f);
  float interior = smoothstep(thr + 0.03, thr + 0.25, f);
  float column = smoothstep(thr - 0.04, thr + 0.5, f);
  return vec3(cov, interior, column);
}
float cloudCoverageCS(vec2 cs) { return cloudFieldCS(cs).x; }
float cloudCoverage2D(vec2 wp) { return cloudCoverageCS(wp + uCloudWind); }
/** Cloud shadow factor (1 = lit, ~0.35 = under a dense cloud) at a world position. */
float cloudShadow(vec3 wp) {
  // project along the sun direction up to the cloud base
  float k = (uCloudBase - wp.y) / max(uSunDir.y, 0.15);
  vec2 sp = wp.xz + uSunDir.xz * k;
  float c = cloudCoverage2D(sp);
  return 1.0 - 0.72 * c * smoothstep(0.0, 0.25, uSunDir.y);
}
`;

/** Analytic sky radiance (no clouds) for a direction. Shared by the dome, water reflections and haze. */
export const GLSL_SKY = /* glsl */ `
/** Sky gradient. uZenithColor is the deep blue of the upper sky, uHorizonColor the saturated blue-cyan a
 *  few degrees above the horizon; the blend has a short tail (most of it happens below 20 deg) so the sky
 *  stays saturated down to ~5 deg. Only the last ~2 deg whiten toward the haze colour (the band the
 *  aerial perspective fades distant terrain and clouds into), so there is no pale zone above the horizon. */
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  // the horizon glow reaches higher when the sun is low (long paths through lit air all around)
  float kLow = mix(3.5, 5.0, smoothstep(0.05, 0.35, uSunDir.y));
  float lowMix = pow(1.0 - up, kLow);
  vec3 col = mix(uZenithColor, uHorizonColor, lowMix);
  // narrow warm-white haze band; never darker than the low sky so a warm sunset horizon keeps its glow
  float hband = pow(1.0 - up, 55.0);
  vec3 hazeWhite = max(mix(uHazeColor, uSunHazeColor, 0.3), uHorizonColor * 1.05);
  col = mix(col, hazeWhite, hband * 0.85 * smoothstep(-0.05, 0.12, uSunDir.y));
  // slight brightening of the sky toward the sun (mie forward scatter), strongest near horizon
  float cosSun = dot(dir, uSunDir);
  float horizonMix = pow(1.0 - up, 14.0);
  float mie = pow(max(cosSun, 0.0), 8.0) * (0.08 + 0.5 * horizonMix);
  col += uSunHazeColor * mie * smoothstep(-0.1, 0.15, uSunDir.y);
  // sunset band
  float band = exp(-abs(y) * 9.0) * pow(max(cosSun, 0.0), 2.0);
  col += uSunHazeColor * band * 0.35 * (1.0 - smoothstep(0.15, 0.5, uSunDir.y)) * smoothstep(-0.12, 0.05, uSunDir.y);
  // below the horizon: dark sea haze
  col = mix(col, uHazeColor * 0.75, smoothstep(0.0, -0.08, y));
  return col;
}
vec3 sunDisc(vec3 dir) {
  float cosSun = dot(dir, uSunDir);
  float disc = smoothstep(0.99985, 0.99995, cosSun);
  float glow = pow(max(cosSun, 0.0), 1400.0) * 0.6 + pow(max(cosSun, 0.0), 160.0) * 0.08;
  return uSunColor * (disc * 40.0 + glow) * smoothstep(-0.05, 0.02, uSunDir.y);
}
`;

/** Aerial perspective: extinction and in-scatter for a segment of length d from camera height y0 to y1. */
export const GLSL_AERIAL = /* glsl */ `
float opticalDepth(float y0, float y1, float d) {
  float H = uHazeHeight;
  float dy = y1 - y0;
  float dens;
  if (abs(dy) < 1.0) dens = exp(-max(y0, 0.0) / H);
  else dens = H / dy * (exp(-max(y0, 0.0) / H) - exp(-max(y1, 0.0) / H));
  return uHazeDensity * dens * d;
}
vec3 applyAerial(vec3 col, vec3 camPos, vec3 wp) {
  vec3 dv = wp - camPos;
  float d = length(dv);
  vec3 dir = dv / max(d, 1e-3);
  float od = opticalDepth(camPos.y, wp.y, d);
  float ext = exp(-od);
  // in-scattered light: the sky colour in this direction (seamless horizon), darker for downward rays
  vec3 skyHaze = skyRadiance(vec3(dir.x, max(dir.y, 0.0), dir.z));
  float down = smoothstep(0.0, -0.35, dir.y);
  vec3 haze = mix(skyHaze, uHazeColor * 0.8, down);
  return col * ext + haze * (1.0 - ext);
}
`;
