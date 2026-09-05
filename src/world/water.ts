import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
import { createReflectionUniforms, type ReflectionUniforms } from '../render/reflection';
import { WORLD_SIZE } from './map';
import type { MapTextures } from './terrain';

/**
 * Water surface of Bahía Vista.
 *
 * A flat plane centred on the camera whose shading is done entirely in the fragment shader:
 *  - bathymetry from the shared height texture (depth, depth gradient, upwind shelter),
 *  - a wave field made of directional swell sets plus advected anisotropic noise chop, every layer
 *    filtered by its screen footprint so distant water goes calm instead of aliasing; the filtered-out
 *    slope variance is carried into the microfacet roughness (sky-reflection blur and sun glitter),
 *  - a two-flow body colour (bed albedo attenuated by the water column plus deep-water scattering and
 *    suspended sediment), a Fresnel mix with the reflection (the planar mirror image of the scene from
 *    render/reflection.ts where it has content, blurred by the roughness, over the blurred sky reflection
 *    taken from the scene environment map), an anisotropic Cox-Munk style sun glitter, and foam from
 *    shore exposure, surf and wakes.
 *
 * The MeshStandardMaterial pipeline is used for shadowed irradiance (direct + IBL) and the final colour
 * is composed here, so the water gets CSM shadows, cloud shadows and aerial perspective like everything
 * else without duplicating that machinery.
 */

/** Diagnostic output (0 = off): 1 = depth / irradiance / Fresnel, 2 = sediment / openness / slope variance. */
const WATER_DEBUG = 0;

const WATER_VERT_PARS = /* glsl */ `
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
`;
const WATER_VERT_MAIN = /* glsl */ `
vec3 wp = position + uWaterOffset;
wp.y = 0.0;
vWorldPos = wp;
`;

const WATER_FRAG_PARS = /* glsl */ `
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex; // r: zone id, g: vegetation, b: 128 + 0.5 * signed distance to the coastline (m)
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform float uWorldSize;
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
uniform sampler2D uReflTex;   // premultiplied mirror image of the scene (alpha 0 where only sky would be seen)
uniform sampler2D uReflDepth; // its logarithmic depth
uniform mat4 uReflVP;
uniform vec4 uReflParams;     // x: active, y: log-depth constant, z: focal length (texels), w: top mip level
uniform vec2 uReflTexel;
uniform vec4 uReflTune;       // x: streak scale, y: perturbation scale, z/w: streak (fraction of the height) fading the image out
varying vec3 vWorldPos;
${GLSL_NOISE}
float terrainHeightW(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5)) / uWorldSize;
  return texture2D(uHeightTex, uv).r;
}
float fbm2o(vec2 p) {
  return 0.667 * vnoise(p) + 0.333 * vnoise(mat2(1.6, 1.2, -1.2, 1.6) * p + 5.2);
}
// value noise with analytic derivatives (value, d/dx, d/dy)
vec3 noised(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  float k0 = a, k1 = b - a, k2 = c - a, k3 = a - b - c + d;
  return vec3(k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y, du * vec2(k1 + k3 * u.y, k2 + k3 * u.x));
}
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
// Slope (world xz) of one advected, wind-aligned noise layer. L: across-wind feature size (m), the
// along-wind size is L / stretch (wind waves are short along the wind and long across it). The pattern
// drifts downwind (toward -wd) at 'speed' m/s. 'amp' is the slope amplitude.
vec2 chopSlope(vec2 p, vec2 wd, float L, float stretch, float speed, float t, float seed, float amp, out float val) {
  vec2 wc = vec2(-wd.y, wd.x);
  vec2 q = vec2((dot(p, wd) + speed * t) * stretch / L + seed, dot(p, wc) / L + seed * 1.73);
  vec3 n = noised(q);
  val = n.x;
  return amp * (n.y * stretch * wd + n.z * wc);
}
// Slope of a deep-water swell component travelling toward -dir with sharpened crests.
vec2 swellSlope(vec2 p, vec2 dir, float L, float A, float t, float phase) {
  float k = 6.2831853 / L;
  float w = sqrt(9.81 * k);
  float ph = k * dot(p, dir) + w * t + phase;
  float s = sin(ph), c = cos(ph);
  return dir * (A * k * 0.7 * c * (1.0 + s));
}
float smithBeckmann(float cosT, float alpha) {
  float tanT = sqrt(max(1.0 - cosT * cosT, 0.0)) / max(cosT, 1e-4);
  float a = 1.0 / max(alpha * tanT, 1e-4);
  return a >= 1.6 ? 1.0 : (3.535 * a + 2.181 * a * a) / (1.0 + 2.276 * a + 2.577 * a * a);
}
// Anisotropic Gaussian slope density (Cox-Munk style) of facets around the resolved normal, evaluated at
// slope offset 'sh' with total variance 'mss'; elongated along the view azimuth (stretch 'st') so the
// highlight forms a streak toward the sun. Integrates to 1 over slope space.
float slopePdf(vec2 sh, vec2 va, float st, float mss) {
  float along = dot(sh, va), across = dot(sh, vec2(-va.y, va.x));
  return exp(-(along * along / (mss * st) + across * across * st / mss)) / (PI * mss);
}
// Measured sea-slope distributions are peaked (positive kurtosis): a narrow core over a wider skirt of the
// same total variance, which gives glints a sharp centre with a soft halo and the sun path a tighter core.
float slopePdfPeaked(vec2 sh, vec2 va, float st, float mss) {
  return 0.75 * slopePdf(sh, va, st, mss * 0.7) + 0.25 * slopePdf(sh, va, st, mss * 1.9);
}
// Sun glitter: the analytic anisotropic slope distribution of the unresolved facets (a smooth streak of
// highlights toward the sun whose width follows the filtered slope variance) with a sparkle riding on it.
// The sparkle is a world-anchored random slope field that carries a fixed share (SPARK_SHARE) of the slope
// variance; the rest stays in the analytic lobe, which is therefore always wide enough that the field only
// modulates the path (glints a few times brighter than the path around them, never a blown speck) instead
// of thresholding it into contour worms. Only the two finest octaves the pixel footprint resolves are
// evaluated (cells of 3-12 px: dots and short dashes that follow the water, a fine grain from altitude), the
// coarsest fading out as the finer fades in so the texture slides with the distance without popping. The
// field evolves as a slow Gaussian process in time and drifts with the wind, so glints wax and wane rather
// than flicker, and camera motion only moves them with the water they sit on.
// Glitter is seen looking toward the light at a grazing angle close to its elevation, which foreshortens
// the water along the light's azimuth; the cells are stretched along that (world-fixed) azimuth by the
// same factor so a glint stays a few pixels in both screen directions instead of a wide horizontal blob.
// dx, dy: world-space extent of the pixel (screen derivatives of the surface position). The result is
// capped so no pixel outshines the sun path by more than a few times (bloom stays a soft halo on the path
// and never bleeds over geometry next to it).
const float SPARK_SHARE = 0.42;
const float GLITTER_CAP = 6.0;
float sunGlitter(vec3 N, vec3 V, vec3 L, float mss, vec2 wp, vec2 dx, vec2 dy, float t) {
  float NdotL = dot(N, L);
  float NdotV = dot(N, V);
  if (NdotL <= 0.002 || NdotV <= 0.002) return 0.0;
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 1e-3);
  vec2 sh = -H.xz / max(H.y, 0.05) + N.xz / max(N.y, 0.05);
  vec2 va = V.xz;
  float vl = length(va);
  va = vl > 1e-4 ? va / vl : vec2(1.0, 0.0);
  vec2 vc = vec2(-va.y, va.x);
  float st = 1.0 + 0.3 * (1.0 - clamp(V.y, 0.0, 1.0));
  float P;
  // the field is only evaluated where the highlight (widened to catch the field's tails) is visible
  if (slopePdf(sh, va, st, mss * 3.0) * mss > 1e-4) {
    vec2 sa = L.xz;
    float sl = length(sa);
    sa = sl > 1e-3 ? sa / sl : va;
    vec2 sc = vec2(-sa.y, sa.x);
    // half the foreshortening at the path's centre: dashes out there, round glints on the steeper near path
    float stretch = sqrt(clamp(1.0 / max(L.y, 0.12), 1.0, 8.0));
    // pixel footprint along / across the light's azimuth, in the stretched metric of the cells
    float footEff = max((abs(dot(dx, sa)) + abs(dot(dy, sa))) / stretch, abs(dot(dx, sc)) + abs(dot(dy, sc)));
    vec2 s = vec2(0.0);   // slope offset of the resolved facets
    float resolved = 0.0; // fraction of the variance they carry
    vec2 gp = wp + uWindDir * (0.9 * t);
    vec2 gq = vec2(dot(gp, sa) / stretch, dot(gp, sc));
    // octaves of 0.7 m * 2^o (o <= 8): the finest whose cell spans more than 3 px fades in until it spans
    // 6 px ('u'), the next carries the other half of the share, the third fades out as the first fades in
    float oF = log2(max(footEff / 0.7, 1e-4)) + 1.585;
    int o0 = int(floor(oF)) + 1;
    float u = float(o0) - oF;
    if (o0 < 0) { o0 = 0; u = 1.0; }
    float w0 = smoothstep(0.0, 1.0, u);
    for (int i = 0; i < 3; i++) {
      int o = o0 + i;
      if (o > 8) break;
      float fo = float(o);
      float cell = 0.7 * exp2(fo);
      float f = SPARK_SHARE * 0.5;
      float w = i == 0 ? w0 : (i == 2 ? 1.0 - w0 : 1.0);
      if (w < 0.003) continue;
      vec2 q = gq / cell;
      // two independent value-noise vectors (0.214 rms per component) rotated by a slow phase: a unit-variance
      // Gaussian-like process whose rate follows the wave period of the cell size
      float ph = 1.6 * t * inversesqrt(cell) + 0.7 * fo;
      vec2 n1 = vec2(vnoise(q + 3.1 + 17.0 * fo), vnoise(q * 1.07 + 9.7 + 17.0 * fo)) - 0.5;
      vec2 n2 = vec2(vnoise(q * 0.93 + 5.3 + 17.0 * fo), vnoise(q * 1.11 + 12.9 + 17.0 * fo)) - 0.5;
      vec2 n = (n1 * cos(ph) + n2 * sin(ph)) * 4.67;
      s += (sqrt(0.5 * mss * f) * w) * n;
      resolved += f * w * w;
    }
    // the facets share the anisotropy of the analytic distribution
    s = va * (dot(s, va) * sqrt(st)) + vc * (dot(s, vc) * inversesqrt(st));
    P = slopePdfPeaked(sh - s, va, st, mss * (1.0 - resolved));
  } else {
    P = slopePdfPeaked(sh, va, st, mss);
  }
  float D = P / (NdotH * NdotH * NdotH * NdotH);
  float alpha = sqrt(mss);
  float G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha);
  float LdotH = clamp(dot(L, H), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - LdotH, 5.0);
  return min(D * F * G / (4.0 * NdotV), GLITTER_CAP);
}
// Mirror image of the scene along the reflected ray (render/reflection.ts). P: surface point, V: view
// vector, N: wave normal, mss: unresolved slope variance, dist: camera distance. Returns premultiplied
// colour and coverage; coverage 0 where the reflected ray only sees sky (the caller keeps its sky there).
vec4 sceneReflection(vec3 P, vec3 V, vec3 N, float mss, float dist) {
  vec4 rc = uReflVP * vec4(P, 1.0);
  if (rc.w <= 0.0) return vec4(0.0);
  float wp = rc.w; // depth of P for the mirror camera (equals its depth for the real camera)
  vec2 uv0 = rc.xy / wp * 0.5 + 0.5;
  vec2 lim = uReflTexel * 0.5;
  // The flat mirror sees an object along this ray at depth wq. The real reflected ray leaves P tilted by
  // the wave slope and travels about the same path length L, so its hit point is displaced by (R - R0) L:
  // that is the mirror image displaced by the same vector (clip-space displacement per metre: dclip).
  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.02);
  vec3 R0 = vec3(-V.x, V.y, -V.z);
  vec4 dclip = uReflVP * vec4((R - R0) * uReflTune.y, 0.0);
  float k = dist / wp; // metres along the ray per unit of depth
  float dq = texture2D(uReflDepth, clamp(uv0, lim, 1.0 - lim)).r;
  float wq = dq < 0.99999 ? exp2(dq * 2.0 / uReflParams.y) - 1.0 : wp * 8.0; // sky: assume a distant object
  float L = max(wq - wp, 0.0) * k;
  vec4 rc1 = rc * (wq / wp) + dclip * L;
  vec2 uv1 = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  // re-project once with the depth found at the displaced lookup, so a ray that hits a nearer object (or
  // misses the one the flat mirror saw) uses that path length instead
  dq = texture2D(uReflDepth, clamp(uv1, lim, 1.0 - lim)).r;
  wq = dq < 0.99999 ? exp2(dq * 2.0 / uReflParams.y) - 1.0 : wp * 8.0;
  L = max(wq - wp, 0.0) * k;
  rc1 = rc * (wq / wp) + dclip * L;
  vec2 uv = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  uv = uv0 + clamp(uv - uv0, vec2(-0.08), vec2(0.08));
  // The unresolved facets tilt the reflected rays by twice their slope (rms sqrt(mss / 2) per axis). A tilt in
  // the view plane changes the ray's elevation fully, a sideways tilt turns it by only sin(grazing angle), so
  // the image of a point at share L / D of the mirror distance is smeared into a vertical streak (the glitter-
  // path ellipse): rms 2 sigma share in elevation and that times |V.y| across. uReflTune.x scales the streak.
  float share = clamp(1.0 - wp / max(wq, wp), 0.0, 1.0);
  float streak = uReflTune.x * sqrt(mss) * share * uReflParams.z; // texels along the image's vertical
  float across = streak * clamp(abs(V.y), 0.1, 1.0);
  // the cross-streak blur comes from the mip chain, the streak from five taps along it (mip level raised so
  // the taps overlap; the cross blur is then at most 0.4 of the streak)
  float lod = clamp(log2(max(max(across, 0.375 * streak), 1.0)), 0.0, uReflParams.w);
  // a streak longer than a good part of the image carries no more information than the environment map
  float clarity = 1.0 - smoothstep(uReflTune.z, uReflTune.w, streak * uReflTexel.y);
  float edge = smoothstep(0.0, 0.015, uv.x) * smoothstep(0.0, 0.015, 1.0 - uv.x) * smoothstep(0.0, 0.015, uv.y) * smoothstep(0.0, 0.015, 1.0 - uv.y);
  vec2 dv = vec2(0.0, 0.75 * streak * uReflTexel.y);
  vec4 c = textureLod(uReflTex, uv, lod) * 0.316
         + (textureLod(uReflTex, uv + dv, lod) + textureLod(uReflTex, uv - dv, lod)) * 0.239
         + (textureLod(uReflTex, uv + 2.0 * dv, lod) + textureLod(uReflTex, uv - 2.0 * dv, lod)) * 0.103;
  return c * (clarity * edge);
}
`;

/** Runs after normal_fragment_begin: wave normal, body reflectance, foam. Leaves w* variables in main scope. */
const WATER_FRAG_SURFACE = /* glsl */ `
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR; vec2 wDx; vec2 wDy; vec3 wDbg; float wDist;
{
  vec2 wp = vWorldPos.xz;
  vec2 dxw = dFdx(wp), dyw = dFdy(wp);
  float foot = length(abs(dxw) + abs(dyw)); // metres of water per pixel
  float terrainH = terrainHeightW(wp);
  float depth = -terrainH;
  if (depth < -0.05) discard;
  depth = max(depth, 0.0);
  vec3 toCam = cameraPosition - vWorldPos;
  float dist = length(toCam);
  vec3 V = toCam / max(dist, 1e-3);
  float t = uWaveTime;
  vec2 wd = uWindDir; // waves arrive from +wd (open ocean side) and travel toward -wd
  float wind = clamp(uWindSpeed / 6.0, 0.35, 1.8);

  // ---- shelter: land upwind kills chop; swell needs kilometres of open fetch and deep water
  float o1 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 90.0));
  float o2 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 240.0));
  float o3 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wd * 520.0));
  float open = (o1 + o2 + o3) * 0.3333;
  float shallowF = smoothstep(0.0, 1.2, depth);
  float chopF = mix(0.2, 1.0, open) * shallowF;
  // short wind waves regenerate within a hundred metres of fetch: only the nearest upwind shore calms them
  float rippleF = mix(0.3, 1.0, 0.6 * o1 + 0.4 * open) * smoothstep(0.0, 0.5, depth);
  float s4 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 1100.0));
  float s5 = 1.0 - smoothstep(-4.0, 0.5, terrainHeightW(wp + wd * 2400.0));
  float swellF = min(open, min(s4, s5)) * smoothstep(4.0, 9.0, depth);

  // ---- wave field: every layer fades out when its wavelength approaches the pixel footprint; the
  //      slope variance that is filtered away goes into the microfacet roughness instead
  vec2 g = vec2(0.0);
  float mss = 0.0;
  float val0 = 0.5, val1 = 0.5, val2 = 0.5, val3 = 0.5;
  float wSw = 1.0 - smoothstep(4.0, 22.0, foot);
  if (swellF > 0.001 && wSw > 0.001) {
    vec2 gs = swellSlope(wp, rot2(wd, -0.22), 76.0, 0.55, t, 0.0)
            + swellSlope(wp, rot2(wd, 0.10), 54.0, 0.40, t, 2.1)
            + swellSlope(wp, rot2(wd, 0.36), 41.0, 0.27, t, 4.4);
    g += gs * swellF * wSw;
  }
  mss += 0.0035 * swellF * (1.0 - wSw * wSw);
  float w0 = 1.0 - smoothstep(2.8, 6.0, foot);
  float a0 = 0.035 * wind * chopF;
  if (w0 > 0.001) g += chopSlope(wp, rot2(wd, 0.15), 14.0, 2.0, 4.5, t, 1.3, a0, val0) * w0;
  mss += a0 * a0 * (1.0 - w0 * w0);
  // wind sea: short-crested directional waves whose height follows the wave groups of the layer above
  float wWs = 1.0 - smoothstep(1.1, 2.6, foot);
  if (wWs > 0.001 && chopF > 0.001) {
    float grp = (0.55 + 0.9 * val0) * chopF * wind;
    vec2 gw = swellSlope(wp, rot2(wd, -0.30), 11.0, 0.050, t, 1.0)
            + swellSlope(wp, rot2(wd, 0.18), 7.5, 0.045, t, 3.3)
            + swellSlope(wp, rot2(wd, 0.02), 5.5, 0.028, t, 5.9);
    g += gw * grp * wWs;
  }
  mss += 0.0015 * chopF * wind * (1.0 - wWs * wWs);
  float w1 = 1.0 - smoothstep(1.0, 2.2, foot);
  float a1 = 0.12 * wind * mix(chopF, rippleF, 0.4);
  if (w1 > 0.001) g += chopSlope(wp, rot2(wd, -0.2), 5.0, 1.8, 2.7, t, 3.7, a1, val1) * w1;
  mss += a1 * a1 * (1.0 - w1 * w1);
  // short crested ripples of the local wind sea, bunched by the groups of the layer above
  float w2 = 1.0 - smoothstep(0.35, 0.75, foot);
  float a2 = 0.14 * wind * rippleF;
  if (w2 > 0.001) {
    g += chopSlope(wp, rot2(wd, 0.3), 1.7, 1.4, 1.6, t, 7.1, a2, val2) * w2;
    float grp2 = (0.5 + 1.0 * val1) * rippleF * wind * w2;
    g += (swellSlope(wp, rot2(wd, -0.35), 3.4, 0.022, t, 2.7) + swellSlope(wp, rot2(wd, 0.25), 2.2, 0.013, t, 8.1)) * grp2;
  }
  mss += (a2 * a2 + 0.0012 * rippleF * wind) * (1.0 - w2 * w2);
  float w3 = 1.0 - smoothstep(0.1, 0.22, foot);
  float a3 = 0.12 * wind * rippleF;
  if (w3 > 0.001) g += chopSlope(wp, rot2(wd, -0.05), 0.5, 1.2, 0.9, t, 11.3, a3, val3) * w3;
  mss += a3 * a3 * (1.0 - w3 * w3);
  // capillary ripples are never resolved
  mss += 0.002 + 0.003 * wind * mix(0.3, 1.0, open);

  // ---- wakes: r = foam, gb = normal perturbation, a = coverage
  // the wake map is rendered top-down with screen-up = north (-Z), so v grows toward -Z
  vec2 wuv = vec2(wp.x - uWakeRegion.x, uWakeRegion.y - wp.y) / uWakeRegion.z + 0.5;
  vec4 wake = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wake = texture2D(uWakeTex, wuv);
  g += (wake.gb - 0.5) * 2.0 * wake.a * 0.4;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  // ---- body colour: two-flow shallow-water reflectance, the bed seen through the column plus the
  //      column's own back-scatter, along the refracted sun path down and the refracted view path up
  float cosV = clamp(dot(N, V), 0.0, 1.0);
  float sin2r = (1.0 - cosV * cosV) / 1.77;
  float cosR = sqrt(max(1.0 - sin2r, 0.0));
  float sunUp = clamp(uSunDirW.y, 0.12, 1.0);
  float cosSunR = sqrt(1.0 - (1.0 - sunUp * sunUp) / 1.77);
  float path = depth * (1.0 / cosSunR + 1.0 / max(cosR, 0.2));
  // clear tropical shelf water: red is gone within a metre, green within a few, blue reaches the deep bed
  vec3 K = vec3(0.9, 0.23, 0.18);
  vec3 T = exp(-K * path);
  vec3 refr = refract(-V, N, 0.75);
  vec2 bedP = wp + refr.xz / max(-refr.y, 0.25) * depth;
  float grainFade = 1.0 - smoothstep(3.0, 10.0, foot);
  float grain = mix(0.5, fbm2o(bedP * 0.045), grainFade);
  // sand ripples and burrow mounds resolve in the near field (landing, taxiing)
  float rippleFade = 1.0 - smoothstep(0.25, 1.0, foot);
  float sandRipple = rippleFade > 0.001 ? mix(0.5, vnoise(vec2(dot(bedP, wd) * 1.4 + 2.0 * vnoise(bedP * 0.2), dot(bedP, vec2(-wd.y, wd.x)) * 0.35)), rippleFade) : 0.5;
  // bed albedo is physical (neutral sun+sky irradiance since the lighting rebalance): coral sand
  vec3 sand = vec3(0.52, 0.49, 0.42) * (0.86 + 0.24 * grain + 0.14 * (sandRipple - 0.5));
  float sgN = fbm3(bedP * 0.012 + 3.0);
  float sg = smoothstep(0.54, 0.68, sgN + 0.12 * (grain - 0.5)) * smoothstep(0.5, 1.6, depth) * (1.0 - smoothstep(5.0, 9.0, depth));
  vec3 bed = mix(sand, vec3(0.07, 0.11, 0.05), sg);
  // wet sand at the waterline (mirrors the terrain's wet band above it)
  bed *= mix(0.72, 1.0, smoothstep(0.0, 0.45, depth));
  // wave focusing: shallow bed brightness follows the crests of the short waves (cheap caustics)
  float caustic = ((val1 - 0.5) * w1 * 0.5 + (val2 - 0.5) * w2 * 0.45 + (val3 - 0.5) * w3 * 0.35) * rippleF;
  bed *= 1.0 + caustic * (1.0 - smoothstep(1.5, 5.0, depth)) * smoothstep(0.05, 0.3, depth);
  // deep-water reflectance under neutral irradiance: blue-teal bay water carrying some suspended matter,
  // clearer and bluer ocean beyond the shelf (a few percent, peaking in the blue)
  vec3 Rinf = mix(vec3(0.038, 0.094, 0.168), vec3(0.013, 0.048, 0.128), smoothstep(8.0, 22.0, depth));
  vec3 R = bed * T + Rinf * (1.0 - T);
  // suspended sediment: milky, pale turquoise over the flats and along the shore
  float milkN = fbm2o(wp * 0.004 + 9.0);
  float milk = (1.0 - smoothstep(0.3, 3.5, depth)) * (0.3 + 0.7 * smoothstep(0.35, 0.8, milkN));
  R += vec3(0.045, 0.075, 0.105) * milk * (1.0 - exp(-path * 0.9));

  // ---- foam: shore wash driven by exposure to the incoming waves, surf lines, whitecaps, wakes
  float foam = 0.0;
  if (depth < 4.0) {
    vec4 zs = texture2D(uZoneTex, (wp + vec2(uWorldSize * 0.5)) / uWorldSize);
    // only a real coastline makes wash and surf; submerged sandbars and flats stay foam-free
    float coastD = (zs.b * 255.0 - 128.0) * 2.0;
    float coastGate = 1.0 - smoothstep(150.0, 230.0, coastD);
    float e = 12.0;
    float hx = terrainHeightW(wp + vec2(e, 0.0)) - terrainHeightW(wp - vec2(e, 0.0));
    float hz = terrainHeightW(wp + vec2(0.0, e)) - terrainHeightW(wp - vec2(0.0, e));
    vec2 gd = vec2(-hx, -hz) / (2.0 * e); // gradient of depth: points offshore
    float slope = length(gd);
    vec2 off = gd / max(slope, 1e-4);
    vec2 alongShore = vec2(-off.y, off.x);
    float shoreDist = min(depth / max(slope, 0.003), 300.0); // metres to the waterline along the bed
    // only a real waterline breaks waves: the bed must actually reach land where the slope says it does,
    // otherwise shallow humps (sandbars, patch reefs) drew concentric foam rings around themselves
    float landAhead = smoothstep(-0.15, 0.12, terrainHeightW(wp - off * (shoreDist + 6.0)));
    coastGate *= landAhead;
    // wave exposure of this shore: the map's fetch-based exposure (zone alpha) times the wind-facing factor
    float exposure = zs.a * (0.3 + 0.7 * (0.5 + 0.5 * dot(off, wd))) * mix(0.5, 1.0, open);
    float fineFade = 1.0 - smoothstep(2.0, 6.0, foot);
    float pa = vnoise(wp * 0.03 + vec2(t * 0.03, -t * 0.02));
    float patches = mix(pa, 0.5 * (pa + vnoise(wp * 0.09 + 7.0 - t * 0.05)), fineFade);
    float streaks = mix(0.5, vnoise(vec2(dot(wp, off) * 0.45 - t * 0.35, dot(wp, alongShore) * 0.05 + 3.0)), 1.0 - smoothstep(0.5, 2.0, foot));
    // swash: a few metres of broken wash at the waterline, wider and denser on exposed beaches
    float swashW = 4.0 + 12.0 * exposure + 3.0 * sin(t * 0.9 + dot(wp, alongShore) * 0.02 + patches * 4.0);
    float wash = 1.0 - smoothstep(swashW * 0.3, swashW, shoreDist);
    // the broken pattern is thresholded up close; from altitude its coverage is what reads, so the
    // threshold softens with the footprint into a continuous line of the same mean whiteness
    float thr = 0.72 - 0.42 * exposure;
    float soft = mix(0.2, 0.6, smoothstep(1.0, 4.0, foot));
    float shore = wash * coastGate * smoothstep(thr - soft * 0.5, thr + soft * 0.5, 0.55 * patches + 0.45 * streaks) * smoothstep(0.08, 0.3, exposure);
    // surf: wind waves break in knee-deep water on exposed shores as broken lines running shoreward
    float crest = sin(shoreDist * 0.3 - t * 1.2 + patches * 3.0);
    float surf = smoothstep(0.55, 1.0, crest) * smoothstep(0.45, 0.85, exposure) * smoothstep(0.4, 0.7, patches) * coastGate
               * smoothstep(0.3, 0.5, depth) * (1.0 - smoothstep(0.9, 1.5, depth)) * smoothstep(2.5, 6.0, uWindSpeed);
    foam = shore + surf * 0.6;
    // silt stirred up over very gentle muddy bottoms (mangrove shores)
    float mud = (1.0 - smoothstep(0.004, 0.012, slope)) * (1.0 - smoothstep(0.3, 2.0, depth)) * coastGate;
    R = mix(R, vec3(0.05, 0.062, 0.075), mud * 0.4 * (1.0 - exp(-path)));
  }
  // whitecaps (fresh breeze and up): short crest-parallel streaks riding on the steepest chop groups; the
  // streak pattern is filtered to its coverage once its cells fall below a few pixels (no cell-shaped flecks)
  float capFade = 1.0 - smoothstep(1.0, 3.0, foot);
  float streak = vnoise(vec2((dot(wp, wd) + 4.5 * t) * 0.25, dot(wp, vec2(-wd.y, wd.x)) * 0.08 + 7.0));
  float caps = mix(0.08, smoothstep(0.7, 0.82, streak), capFade);
  float whitecap = caps * smoothstep(0.6, 0.9, val0) * smoothstep(7.0, 14.0, uWindSpeed) * smoothstep(2.0, 6.0, depth) * open * w0;
  // wake foam is churned water, never a flat sheet: a fine world-anchored grain modulates it (and keeps
  // it below saturation) so a fresh float/hull wake reads as turbulent froth instead of a white bar
  float wakeGrain = 0.55 + 0.45 * vnoise(wp * 1.7 + vec2(t * 0.6, 0.0)) * (0.6 + 0.8 * vnoise(wp * 4.3 - t * 0.9));
  foam = clamp(foam + wake.r * 0.85 * wakeGrain + whitecap, 0.0, 0.92);

  wN = N; wV = V; wFoam = foam; wMss = mss; wDx = dxw; wDy = dyw; wDist = dist;
  wBodyR = R;
  wDbg = vec3(depth, milk, open);
  normal = normalize((viewMatrix * vec4(N, 0.0)).xyz);
  nonPerturbedNormal = normal;
  // the lighting pipeline is used to gather shadowed irradiance (diffuse = 1) which we scale ourselves
  diffuseColor.rgb = vec3(1.0);
  roughnessFactor = clamp(pow(mss, 0.25), 0.05, 1.0);
  metalnessFactor = 0.0;
}
`;

/** Skip the pipeline's environment radiance lookup (we sample the sky ourselves) but keep IBL irradiance. */
const WATER_FRAG_MAPS = /* glsl */ `
#if defined( RE_IndirectDiffuse ) && defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
  iblIrradiance += getIBLIrradiance( geometryNormal );
#endif
`;

/** Replaces opaque_fragment: compose body, sky reflection, glitter and foam. */
const WATER_FRAG_COMPOSE = /* glsl */ `
{
  // E / pi from the pipeline (direct sun with shadows + sky irradiance), diffuseColor was 1
  vec3 Ediff = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
  float shadow = 1.0;
  vec3 sunCol = vec3(0.0);
  #if NUM_DIR_LIGHTS > 0
    sunCol = directionalLights[0].color;
    float nl = saturate(dot(normal, directionalLights[0].direction));
    vec3 unsh = sunCol * nl * RECIPROCAL_PI;
    float ul = max(max(unsh.r, unsh.g), unsh.b);
    if (ul > 1e-5) shadow = clamp(max(max(reflectedLight.directDiffuse.r, reflectedLight.directDiffuse.g), reflectedLight.directDiffuse.b) / ul, 0.0, 1.0);
  #endif
  float rSky = clamp(pow(wMss, 0.25), 0.05, 1.0);
  vec3 Rdir = reflect(-wV, wN);
  // rays reflected toward the sea are caught by the next wave and end up showing the sky just above the horizon
  Rdir.y = max(Rdir.y, 0.02 + 0.08 * rSky);
  Rdir = normalize(Rdir);
  vec3 sky;
  #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
    sky = textureCubeUV(envMap, Rdir, rSky).rgb;
  #else
    sky = vec3(0.45, 0.6, 0.8);
  #endif
  // The environment probe is blended toward a neutral haze/ground fill for the diffuse IBL (sky.ts), so as a
  // mirror it is greyer and brighter than the visible dome, most of all low above the horizon where the water
  // reflects it at grazing angles. Restore the dome's chroma and radiance there (nothing at the zenith).
  float whitening = 0.65 * pow(1.0 - clamp(Rdir.y, 0.0, 1.0), 0.3);
  float lum = dot(sky, vec3(0.2126, 0.7152, 0.0722));
  sky = max(lum * (1.0 - 0.18 * whitening) + (sky - lum) * (1.0 + 2.2 * whitening), vec3(0.0));
  // the mirrored scene (aircraft, shore, piers, city) replaces the sky where the reflected ray meets an object
  if (uReflParams.x > 0.5) {
    vec4 refl = sceneReflection(vWorldPos, wV, wN, wMss, wDist);
    sky = sky * (1.0 - refl.a) + refl.rgb;
  }
  float cosV = clamp(dot(wN, wV), 0.0, 1.0);
  // ensemble Fresnel of the rough surface: the unresolved facets take the grazing reflectance well below a mirror's
  float Fg = max(1.0 - 1.6 * rSky * rSky, 0.45);
  float F = 0.02 + (Fg - 0.02) * pow(1.0 - cosV, 5.0);
  vec3 body = wBodyR * Ediff;
  // the CSM sun now carries physical irradiance (x6); the glitter BRDF was tuned for the old scale
  vec3 glitter = sunCol * 0.25 * shadow * sunGlitter(wN, wV, uSunDirW, wMss, vWorldPos.xz, wDx, wDy, uWaveTime);
  vec3 col = mix(body, sky, F) + glitter * (1.0 - wFoam);
  vec3 foamCol = vec3(0.9, 0.91, 0.91) * Ediff;
  col = mix(col, foamCol, wFoam);
  outgoingLight = col;
  #ifdef WATER_DEBUG
    // depth (m/16), diffuse irradiance E/pi (green, /2.5), Fresnel sky weight
    outgoingLight = vec3(wDbg.x / 16.0, Ediff.g / 2.5, F);
    #if WATER_DEBUG == 2
      outgoingLight = vec3(wDbg.y, wDbg.z, wMss * 20.0);
    #endif
  #endif
}
gl_FragColor = vec4( outgoingLight, 1.0 );
`;

export class Water {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  private readonly offset = { value: new THREE.Vector3() };
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(textures: MapTextures, wakeTex: THREE.Texture) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.0 });
    this.uniforms = {
      uHeightTex: { value: textures.height },
      uZoneTex: { value: textures.zone },
      uWakeTex: { value: wakeTex },
      uWakeRegion: { value: new THREE.Vector4(0, 0, 3000, 0) },
      uWaterOffset: this.offset,
      uWorldSize: { value: WORLD_SIZE },
      uWaveTime: { value: 0 },
      uWindSpeed: { value: 6 },
      uWindDir: { value: new THREE.Vector2(0.94, 0.34) },
      uSunDirW: { value: new THREE.Vector3(0, 1, 0) },
      // inactive placeholders until attachReflection() shares the reflection pass's uniforms
      ...createReflectionUniforms(),
    };
    const uniforms = this.uniforms;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WATER_VERT_PARS}`)
        .replace('#include <begin_vertex>', `${WATER_VERT_MAIN}\nvec3 transformed = wp;`);
      shader.fragmentShader = (WATER_DEBUG ? `#define WATER_DEBUG ${WATER_DEBUG}\n` : '') + shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${WATER_FRAG_PARS}`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${WATER_FRAG_SURFACE}`)
        .replace('#include <lights_fragment_maps>', WATER_FRAG_MAPS)
        .replace('#include <opaque_fragment>', WATER_FRAG_COMPOSE);
    };
    mat.customProgramCacheKey = () => `water-v3-${WATER_DEBUG}`;
    this.material = mat;

    // A flat grid reaching past the far clip plane so the horizon is always water; shading is per pixel
    // and a modest tessellation keeps the interpolation of the huge quad numerically friendly.
    const size = 130000;
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 5;
  }

  /** Sample the planar reflection pass. The pass mutates its uniform values in place, so sharing the value
   *  objects keeps the material current whether or not it has already been compiled. */
  attachReflection(u: ReflectionUniforms): void {
    for (const k of Object.keys(u) as (keyof ReflectionUniforms)[]) this.uniforms[k].value = u[k].value;
  }

  update(camX: number, camZ: number, time: number, windSpeed: number, windDir: THREE.Vector2, sunDir: THREE.Vector3, wakeCenter: THREE.Vector2, wakeSize: number): void {
    this.offset.value.set(Math.round(camX / 50) * 50, 0, Math.round(camZ / 50) * 50);
    this.uniforms.uWaveTime.value = time;
    this.uniforms.uWindSpeed.value = windSpeed;
    this.uniforms.uWindDir.value.copy(windDir);
    this.uniforms.uSunDirW.value.copy(sunDir);
    this.uniforms.uWakeRegion.value.set(wakeCenter.x, wakeCenter.y, wakeSize, 0);
  }
}
