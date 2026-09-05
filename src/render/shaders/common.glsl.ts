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
uniform vec4 uCityGlow;      // light pollution footprint: xy world xz of the lit city's centre, z its radius (m), w strength (0 by day)
uniform vec4 uCityGlowView;  // the same glow seen from the camera: xy horizontal unit direction to the centre, z angular width, w horizon radiance scale
uniform vec2 uFarDissolve;   // aerial perspective reaches full extinction before the far plane: x start distance (m), y 1 / ramp length
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
/** Raw (un-thresholded) macro field; the raymarch bakes this and thresholds it per height so that every
 *  cell shrinks toward its top, while the ground shadow thresholds it once at the base footprint. */
float cloudFieldRaw(vec2 cs) {
  vec2 p = cs * 0.00015 + uCloudSeed;
  vec2 warp = (vec2(fbm3(p * 1.3), fbm3(p * 1.3 + 4.2)) - 0.5) * 0.35;
  float macro = fbm3(p * 0.4 + 9.0);
  float cellsA = 1.0 - worley2(cs * (1.0 / 6000.0) + warp + uCloudSeed * 0.37);
  float cellsB = 1.0 - worley2(cs * (1.0 / 3000.0) + warp * 1.5 + uCloudSeed * 0.61 + 2.3);
  return (cellsA * 0.65 + cellsB * 0.35) * 0.55 + macro * 0.45;
}
/** Coverage threshold on the raw field (the cloud base footprint). */
float cloudThreshold() { return 0.72 - uCloudCoverage * 0.40; }
vec3 cloudFieldCS(vec2 cs) {
  float f = cloudFieldRaw(cs);
  float thr = cloudThreshold();
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
/** Warm colour of the city's light pollution (sodium / warm-white street lighting scattered by the air). */
const vec3 CITY_GLOW_COLOR = vec3(1.0, 0.58, 0.28);
/** Light pollution on the underside of the air / clouds above a world position: the lit core plus a wider,
 *  weaker halo for the suburbs. Radiance scale, 0 by day. */
float cityGlowAt(vec2 wp) {
  float d2 = dot(wp - uCityGlow.xy, wp - uCityGlow.xy) / (uCityGlow.z * uCityGlow.z);
  return uCityGlow.w * (exp(-d2) + 0.35 * exp(-d2 * 0.15));
}
/** Light pollution seen from the camera: a warm dome low over the horizon in the city's direction (the whole
 *  horizon when the camera is over the city), fading with elevation; the zenith stays dark. */
vec3 cityGlowSky(vec3 dir) {
  if (uCityGlowView.w <= 0.0) return vec3(0.0);
  float hl = length(dir.xz);
  float az = hl > 1e-4 ? dot(dir.xz / hl, uCityGlowView.xy) : 1.0;
  float azw = exp(-(1.0 - az) / max(uCityGlowView.z, 0.02));
  // the dome fades within ~10 deg of the horizon (a few km of lit air seen edge-on)
  float elev = exp(-max(dir.y, 0.0) * 16.0);
  return CITY_GLOW_COLOR * (uCityGlowView.w * azw * elev);
}
/** Sky gradient. uZenithColor is the deep blue of the upper sky, uHorizonColor the saturated blue-cyan a
 *  few degrees above the horizon; the blend has a short tail (most of it happens below 15 deg) so the sky
 *  stays saturated well down. The lowest ~5 deg whiten toward the pale cyan haze colour (the band the
 *  aerial perspective fades distant terrain and clouds into) with an exponential-like tail, the way a humid
 *  tropical horizon brightens over the last few degrees rather than in a thin ribbon.
 *  Below the horizon the function continues as the radiance of an infinitely long haze path over the dark
 *  sea (what a downward ray scatters in); applyAerial uses the very same function, so a surface that has
 *  fully dissolved into haze is indistinguishable from the dome behind it. */
vec3 skyRadiance(vec3 dir) {
  float y = clamp(dir.y, -1.0, 1.0);
  float up = max(y, 0.0);
  float sunUp = uSunDir.y;
  // the horizon glow reaches higher when the sun is low (long paths through lit air all around)
  float kLow = mix(3.5, 7.0, smoothstep(0.05, 0.35, sunUp));
  float lowMix = pow(1.0 - up, kLow);
  float cosSun = dot(dir, uSunDir);
  float lowSun = (1.0 - smoothstep(0.05, 0.3, sunUp)) * smoothstep(-0.1, 0.0, sunUp);
  // low sun: the horizon opposite the sun cools toward violet (earth shadow, no forward scatter), the sun
  // side keeps the warm key colour; blended by the azimuth from the sun
  float hl = length(dir.xz);
  float az = hl > 1e-4 ? dot(dir.xz / hl, normalize(uSunDir.xz + vec2(1e-5, 0.0))) : 0.0;
  vec3 horAway = uHorizonColor * vec3(0.72, 0.80, 1.45);
  vec3 hor = mix(uHorizonColor, horAway, lowSun * (0.5 - 0.5 * az));
  vec3 col = mix(uZenithColor, hor, lowMix);
  // haze band over the last degrees; never darker than the low sky so a warm sunset horizon keeps its glow
  float hband = pow(1.0 - up, 14.0);
  vec3 hazeWhite = max(mix(uHazeColor, uSunHazeColor, 0.12), hor * 1.05);
  col = mix(col, hazeWhite, hband * 0.75 * smoothstep(-0.05, 0.12, sunUp));
  // slight brightening of the sky toward the sun (mie forward scatter), strongest near horizon
  float horizonMix = pow(1.0 - up, 14.0);
  float mie = pow(max(cosSun, 0.0), 8.0) * (0.08 + 0.5 * horizonMix);
  col += uSunHazeColor * mie * smoothstep(-0.1, 0.15, sunUp);
  // low sun: a wide warm aureole around the disc (aerosol forward scatter through the long path) plus a
  // tighter bright core a few degrees across, so the sun reads as the source of the sunset haze instead of
  // a small disc in a flat peach sky
  float cs = max(cosSun, 0.0);
  col += uSunHazeColor * (pow(cs, 45.0) * 0.4 + pow(cs, 400.0) * 0.9) * lowSun;
  // sunset band
  float band = exp(-abs(y) * 9.0) * pow(cs, 2.0);
  col += uSunHazeColor * band * 0.35 * (1.0 - smoothstep(0.15, 0.5, sunUp)) * smoothstep(-0.12, 0.05, sunUp);
  // night: the city's light pollution over the horizon
  vec3 glow = cityGlowSky(dir);
  col += glow;
  // below the horizon: the haze over the dark sea (see applyAerial: the same colour a downward ray dissolves into)
  col = mix(col, uHazeColor * 0.8 + glow * 0.5, smoothstep(0.0, -0.35, y));
  return col;
}
/** The disc and its glare. At a low sun the airmass has taken the direct beam down by an order of magnitude
 *  and reddened it far more than the key light (which is what lit surfaces see): the disc's radiance and
 *  colour follow the elevation so the tonemapper keeps it an orange-red limb instead of clipping it to a
 *  white ball. */
const vec3 SUN_LIMB_TINT = vec3(1.0, 0.13, 0.02);
vec3 sunDisc(vec3 dir) {
  float cosSun = dot(dir, uSunDir);
  float hi = smoothstep(0.03, 0.35, uSunDir.y);
  float disc = smoothstep(0.99985, 0.99995, cosSun);
  vec3 col = uSunColor * mix(SUN_LIMB_TINT, vec3(1.0), hi);
  float glow = pow(max(cosSun, 0.0), 1400.0) * 0.6 + pow(max(cosSun, 0.0), 160.0) * 0.08;
  return col * (disc * mix(9.0, 40.0, hi) + glow) * smoothstep(-0.05, 0.02, uSunDir.y);
}
/** The disc composited over the sky for the visible dome: the low disc occludes the bright aureole behind it
 *  (only the haze in front of it adds), which is what keeps the limb orange-red; the high disc is additive
 *  glare (it clips to white either way). */
vec3 sunComposite(vec3 sky, vec3 dir) {
  float cosSun = dot(dir, uSunDir);
  // the additive glare only takes over well above the horizon: even a tenth of it lifted the low limb to cream
  float hi = smoothstep(0.12, 0.4, uSunDir.y);
  float vis = smoothstep(-0.05, 0.02, uSunDir.y);
  float disc = smoothstep(0.99985, 0.99995, cosSun);
  vec3 limbCol = uSunColor * vec3(1.0, 0.13, 0.08) * 9.0;
  sky = mix(sky, limbCol + sky * 0.45, disc * (1.0 - hi) * vis);
  // the low limb's own glare: a soft halo of the disc colour two to three disc radii wide (forward scatter in
  // the aerosol right around the disc), fading into the wider aureole skyRadiance carries
  sky += limbCol * pow(max(cosSun, 0.0), 600.0) * 0.45 * (1.0 - hi) * vis;
  float glow = pow(max(cosSun, 0.0), 1400.0) * 0.6 + pow(max(cosSun, 0.0), 160.0) * 0.08;
  return sky + uSunColor * (disc * 40.0 * hi + glow) * vis;
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
  // The far plane cuts the sea and the far terrain tens of kilometres short of the geometric horizon; the
  // last stretch before it dissolves completely so the cut edge meets the dome's horizon with no step at
  // any altitude (a near-horizontal path that long is opaque with haze in any real atmosphere).
  ext *= 1.0 - smoothstep(0.0, 1.0, (d - uFarDissolve.x) * uFarDissolve.y);
  // in-scattered light: the sky colour in this direction (the same function the dome draws, so a fully
  // hazed surface is continuous with the sky behind it; darker for downward rays over the sea)
  return col * ext + skyRadiance(dir) * (1.0 - ext);
}
`;
