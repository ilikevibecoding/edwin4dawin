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
 *  mass; drives vertical development so large cells tower while small ones stay flat). */
vec2 cloudFieldCS(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  float f = fbm(p) * 0.62 + fbm3(p * 3.1 + 7.7) * 0.38;
  // cellular term breaks the fbm into separate cumulus masses (~2.6 km cells)
  float cells = 1.0 - worley2(cs * (1.0 / 2600.0) + uCloudSeed * 0.37);
  f = f * 0.76 + cells * 0.24;
  float thr = 0.64 - uCloudCoverage * 0.44;
  float cov = smoothstep(thr, thr + 0.2, f);
  float interior = smoothstep(thr + 0.04, thr + 0.3, f);
  return vec2(cov, interior);
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
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  float horizonMix = pow(1.0 - up, 14.0);
  float midMix = pow(1.0 - up, 3.5) * 0.22;
  vec3 col = mix(uZenithColor, uHorizonColor, clamp(horizonMix + midMix, 0.0, 1.0));
  // bright, slightly warm haze band in the last few degrees above the horizon (sunlit humid air)
  float hband = pow(1.0 - up, 30.0);
  vec3 hazeWhite = mix(uHorizonColor, uSunHazeColor, 0.4) * 1.12;
  col = mix(col, hazeWhite, hband * 0.55 * smoothstep(-0.05, 0.12, uSunDir.y));
  // slight brightening of the sky toward the sun (mie forward scatter), strongest near horizon
  float cosSun = dot(dir, uSunDir);
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
