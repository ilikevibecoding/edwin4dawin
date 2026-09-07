import * as THREE from 'three';
import { GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from '../render/shaders/common.glsl';
import { createReflectionUniforms, type ReflectionUniforms } from '../render/reflection';
import { WAKE_HEIGHT_SCALE } from '../render/wakes';
import { SWELL_DISPLACEMENT } from './waves';
import { MAP_N, WORLD_SIZE } from './map';
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

/** Diagnostic output (0 = off): 1 = depth / irradiance / Fresnel, 2 = sediment / openness / slope variance,
 *  3 = mirrored scene alone (colour, coverage in blue where nothing is mirrored), 4 = sun glitter alone,
 *  5 = body alone, 6 = sky reflection alone (F applied). Set with the URL query `wdbg=<n>` (bench diagnosis). */
const WATER_DEBUG = Number(new URLSearchParams(globalThis.location?.search ?? '').get('wdbg') ?? 0) | 0;

const WATER_VERT_PARS = /* glsl */ `
uniform vec3 uWaterOffset;
varying vec3 vWorldPos;
#ifdef WATER_PATCH
uniform sampler2D uHeightTex;
uniform float uWorldSize;
#define MAP_HALF_CELL ${(0.5 * WORLD_SIZE / MAP_N).toFixed(6)}
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform sampler2D uWakeHeightTex;
uniform vec4 uWakeNearRegion;
${GLSL_NOISE}
float terrainHeightV(vec2 wp) { return texture2D(uHeightTex, (wp + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize).r; }
vec2 rot2v(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
float noisedVal(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i), b = hash12(i + vec2(1.0, 0.0)), c = hash12(i + vec2(0.0, 1.0)), d = hash12(i + vec2(1.0, 1.0));
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}
float fbm2oV(vec2 p) { return 0.667 * vnoise(p) + 0.333 * vnoise(mat2(1.6, 1.2, -1.2, 1.6) * p + 5.2); }
// zero-mean height of one sharpened set (the fragment stage differentiates the same profile: swellSlope)
float setH(vec2 p, vec2 dir, float L, float A, float t, float phase, float warp) {
  float k = 6.2831853 / L; float w = sqrt(9.81 * k);
  float s = sin(k * dot(p, dir) + w * t + phase + warp);
  return 0.7 * A * (s + 0.5 * s * s - 0.25);
}
// Elevation of the three wind-sea sets the fragment stage shades (same shelter, group and phase-warp terms).
// world/waves.ts is the CPU copy of this: the flight model floats on the same field, so the hulls rise and fall
// with the crests drawn under them. The noise chop layers are left out, see waves.ts; the swell sets are the
// separate swellHeight below (the patch fades them out sooner toward its edge).
float waveHeight(vec2 wp, float t) {
  vec2 wd = uWindDir, wc = vec2(-wd.y, wd.x);
  float depth = max(-terrainHeightV(wp), 0.0);
  float sway = vnoise(wp * 0.0019 + 4.1) - 0.5;
  vec2 wj = normalize(wd + wc * (0.5 * sway));
  float reach = 0.8 + 0.4 * (vnoise(wp * 0.0031 + 9.3) - 0.5);
  float o1 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightV(wp + wj * (90.0 * reach)));
  float o2 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightV(wp + wj * (240.0 * reach)));
  float o3 = 1.0 - smoothstep(-3.0, 0.2, terrainHeightV(wp + wj * (520.0 * reach)));
  float open = (o1 + o2 + o3) * 0.3333;
  float chopF = mix(0.2, 1.0, open) * smoothstep(0.0, 1.2, depth);
  float wind = clamp(uWindSpeed / 6.0, 0.35, 1.8);
  vec2 gpw = wp + wd * (5.0 * t);
  float windG = wind * (0.74 + 0.52 * fbm2oV(vec2(dot(gpw, wd) / 640.0, dot(gpw, wc) / 270.0) + 3.7));
  float h = 0.0;
  if (chopF > 0.001) {
    vec2 d0 = rot2v(wd, 0.15); vec2 c0 = vec2(-d0.y, d0.x);
    float val0 = noisedVal(vec2((dot(wp, d0) + 4.5 * t) * 2.0 / 14.0 + 1.3, dot(wp, c0) / 14.0 + 1.3 * 1.73));
    float grp = (0.55 + 0.9 * val0) * chopF * windG;
    float wv = (val0 - 0.5) * 3.0;
    h += (setH(wp, rot2v(wd, -0.33), 11.6, 0.046, t, 1.0, wv) + setH(wp, rot2v(wd, 0.21), 7.1, 0.058, t, 3.3, wv * 0.7) + setH(wp, rot2v(wd, -0.08), 4.7, 0.038, t, 5.9, wv * 0.5)) * grp;
  }
  return h;
}
// Elevation of the four swell sets the fragment stage shades (its swellF shelter / depth gate, group and phase
// warp), scaled by SWELL_DISPLACEMENT; world/waves.ts is the CPU copy, so a hull heaving on a swell crest has that
// crest drawn under it by the patch.
float swellHeight(vec2 wp, float t) {
  vec2 wd = uWindDir, wc = vec2(-wd.y, wd.x);
  float depth = max(-terrainHeightV(wp), 0.0);
  float sway = vnoise(wp * 0.0019 + 4.1) - 0.5;
  vec2 wj = normalize(wd + wc * (0.5 * sway));
  float reach = 0.8 + 0.4 * (vnoise(wp * 0.0031 + 9.3) - 0.5);
  float o1 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightV(wp + wj * (90.0 * reach)));
  float o2 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightV(wp + wj * (240.0 * reach)));
  float o3 = 1.0 - smoothstep(-3.0, 0.2, terrainHeightV(wp + wj * (520.0 * reach)));
  float open = (o1 + o2 + o3) * 0.3333;
  float s4 = 1.0 - smoothstep(-6.0, 0.5, terrainHeightV(wp + wj * (1100.0 * reach)));
  float s5 = 1.0 - smoothstep(-6.0, 0.5, terrainHeightV(wp + wj * (2400.0 * reach)));
  float swellF = open * s4 * (0.35 + 0.65 * s5) * smoothstep(1.5, 6.5, depth) * ${SWELL_DISPLACEMENT.toFixed(2)};
  if (swellF <= 0.001) return 0.0;
  float wv = (noisedVal(wp * 0.0045 + 2.3) - 0.5) * 3.2;
  float grp = 0.35 + 1.3 * vnoise(vec2(dot(wp, wd) + 4.5 * t, dot(wp, wc)) * 0.0055 + 7.7);
  return (setH(wp, rot2v(wd, -0.31), 83.0, 0.4, t, 0.0, wv) * grp + setH(wp, rot2v(wd, 0.07), 51.3, 0.3, t, 2.1, wv * 0.8) * grp
        + setH(wp, rot2v(wd, 0.53), 33.7, 0.18, t, 4.4, wv * 0.6) * (1.5 - grp * 0.7) + setH(wp, rot2v(wd, 0.95), 340.0, 0.55, t, 1.3, wv * 0.5)) * swellF;
}
#endif
`;
const WATER_VERT_MAIN = /* glsl */ `
#ifdef WATER_PATCH
  // the patch grid spans the near wake region; its vertices crowd toward the centre (the aircraft) where the
  // hull humps are decimetres across and thin out toward the edge where only the arms and swell remain
  vec2 pg = sign(position.xz) * pow(abs(position.xz) * 2.0, vec2(1.5)) * 0.5;
  vec3 wp = vec3(pg.x * uWakeNearRegion.z + uWakeNearRegion.x, 0.0, pg.y * uWakeNearRegion.z + uWakeNearRegion.y);
  vec2 nuvV = vec2(pg.x + 0.5, 0.5 - pg.y);
  vec4 hh = texture2D(uWakeHeightTex, nuvV);
  // the wave displacement fades out toward the patch edge, where it meets the flat main plane; the swell's
  // decimetres fade from nearer the centre so the patch meets the plane with a slope no steeper than the swell's own
  float edgeR = max(abs(pg.x), abs(pg.y));
  float edgeF = 1.0 - smoothstep(0.3, 0.5, edgeR);
  float swellEdgeF = 1.0 - smoothstep(0.15, 0.5, edgeR);
  // the hull / splat height fades over the outer 8 % of the region like the fragment's near-map slope (nearW), so
  // a ring wave or a stern wave reaching the rim ends level with the plane instead of as a step along it
  float wakeEdgeF = smoothstep(0.0, 0.08, 0.5 - edgeR);
  wp.y = (hh.r - hh.g) * ${WAKE_HEIGHT_SCALE.toFixed(2)} * wakeEdgeF + waveHeight(wp.xz, uWaveTime) * edgeF + swellHeight(wp.xz, uWaveTime) * swellEdgeF;
#else
  vec3 wp = position + uWaterOffset;
  wp.y = 0.0;
#endif
vWorldPos = wp;
`;

const WATER_FRAG_PARS = /* glsl */ `
uniform sampler2D uHeightTex;
uniform sampler2D uZoneTex; // r: zone id, g: vegetation, b: 128 + 0.5 * signed distance to the coastline (m)
uniform sampler2D uWakeTex;
uniform vec4 uWakeRegion; // center.xy, size, unused
uniform sampler2D uWakeMidTex;    // mid wake map ahead of the camera (render/wakes.ts)
uniform vec4 uWakeMidRegion;      // center.xy, size (0 = none), unused
uniform sampler2D uWakeNearTex;   // fine wake map around the aircraft (render/wakes.ts)
uniform vec4 uWakeNearRegion;     // center.xy, size, w: 1 while the displaced near patch is drawn over the region
uniform sampler2D uWakeHeightTex; // signed hull-wave elevation over the near region (R up, G down)
uniform float uWakeHeightTexel;   // metres per texel of it
uniform float uWorldSize;
#define MAP_HALF_CELL ${(0.5 * WORLD_SIZE / MAP_N).toFixed(6)}
uniform float uWaveTime;
uniform float uWindSpeed;
uniform vec2 uWindDir;
uniform vec3 uSunDirW;
uniform sampler2D uCloudFieldTex; // the sky's baked macro cloud field (x: raw coverage field), cloud space
uniform vec2 uCloudFieldCenter;   // its window: centre (cloud space) and extent (m)
uniform float uCloudFieldExtent;
uniform sampler2D uReflTex;   // premultiplied mirror image of the scene (alpha 0 where only sky would be seen)
uniform sampler2D uReflShare; // share of each texel's mirror distance beyond the surface, premultiplied (same pyramid)
uniform mat4 uReflVP;
uniform vec4 uReflParams;     // x: active, y: log-depth constant, z: focal length (texels), w: top mip level
uniform vec2 uReflTexel;
uniform vec4 uReflTune;       // x: streak scale, y: perturbation scale, z/w: streak (fraction of the height) fading the image out
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ]; // the vertex stage's uniform, read here to shift the shadow lookup
#endif
varying vec3 vWorldPos;
${GLSL_NOISE}
${GLSL_ATMOS_UNIFORMS}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
// Radiance of the dome along the reflected lobe. The very function the sky dome and the aerial perspective draw
// (skyRadiance) is evaluated here, so the water mirrors the sky the player sees: the same blue overhead, the same
// horizon band, the same aureole and sunset colours, the same city glow at night. (The environment probe used
// before is blended toward a neutral haze/ground fill for the diffuse IBL; as a mirror it was a warm grey low
// over the horizon, and the chroma boost that tried to undo that turned every low sun into a brown-orange band.)
// The unresolved facets tilt the reflected ray by twice their slope; the elevation spread (rms sqrt(2 mss) along
// the view azimuth) is integrated with a three-point Gauss-Hermite rule, which is what blurs the horizon band
// into rough water. The Fresnel factor is inside the integral, per node, for the facet that sends the view ray
// there: at a grazing view the facets tilted toward the camera meet the ray less obliquely and reflect less, the
// ones tilted away more, so the ensemble reflectance of rough water falls below the flat surface's (the drop
// Mobley's sea-surface tables show) while the pale horizon sky gets the larger weight. (Before, one Fresnel of
// the mean normal times an ad hoc "ensemble" reduction stood outside the integral; on top of the lobe's own
// look at the darker sky higher up that counted the drop twice, and the near water at a low camera mirrored the
// dome a quarter too dark.) Rays sent below the horizon meet the next wave and see the sea: mostly the horizon
// sky mirrored a second time. The sun disc is not part of this term: the glitter is its reflection.
// Clouds: the reflected lobe's centre ray meets the cloud base plane where the 2D cloud field (the very field the
// dome's raymarch and the ground shadows use) says whether a cloud hangs there, so a cumulus is mirrored under
// itself in the colour the dome lights a base with, hazed by the path up to it; the field's edge ramp is widened by the lobe's
// footprint on the base plane (the reflection of a cloud in a chop is soft). One field evaluation per pixel,
// skipped where the sky term weighs little (steep view, Fresnel small) or the ray is nearly horizontal
// (the haze band the analytic sky already carries).
// V: view vector (surface to camera). Returns the Fresnel-weighted radiance of the lobe (rgb) and the lobe's
// mean Fresnel (a), which is also the weight the body colour loses.
float fresnelNode(vec3 V, vec3 Ri) {
  // the facet that reflects V into Ri has the normal along V + Ri; its incidence cosine is the Schlick argument
  vec3 n = normalize(V + Ri);
  float c = max(dot(n, V), 0.0);
  float m = 1.0 - c;
  float m2 = m * m;
  return 0.02 + 0.98 * m2 * m2 * m;
}
vec4 skyReflection(vec3 R, float mss, vec3 P, vec3 V) {
  float hl = length(R.xz);
  vec2 az = hl > 1e-4 ? R.xz / hl : vec2(1.0, 0.0);
  float el = atan(R.y, hl);
  float d = 1.7320508 * sqrt(2.0 * mss);
  // The low node is held at the horizon: a facet tilted away from the camera by more than the view elevation
  // faces away and is hidden behind the wave in front (masking), so the visible facets of that side of the lobe
  // send their rays out along the surface, where they meet the next wave and see the sea — mostly the horizon
  // sky mirrored a second time at a grazing angle (0.7 of it, fading in over the 3° below the horizon).
  float e0 = max(el, 0.008), e1 = max(el - d, 0.008), e2 = el + d;
  vec3 R0 = vec3(az.x * cos(e0), sin(e0), az.y * cos(e0));
  vec3 R1 = vec3(az.x * cos(e1), sin(e1), az.y * cos(e1));
  vec3 R2 = vec3(az.x * cos(e2), sin(e2), az.y * cos(e2));
  float F0 = fresnelNode(V, R0), F1 = fresnelNode(V, R1), F2 = fresnelNode(V, R2);
  vec3 L0 = skyRadiance(R0);
  vec3 L1 = skyRadiance(R1) * mix(0.7, 1.0, smoothstep(-0.05, 0.008, el - d));
  vec3 L2 = skyRadiance(R2);
  float fw = 0.6667 * F0 + 0.1667 * (F1 + F2);
  vec3 c = (L0 * (0.6667 * F0) + L1 * (0.1667 * F1) + L2 * (0.1667 * F2)) / max(fw, 1e-4);
  // an overcast deck is not in the analytic dome (the visible clouds are raymarched): its grey underside is
  // mirrored as the same soft band the environment probe carries for the IBL, brightest under a closed ceiling
  float deck = smoothstep(0.45, 0.75, uCloudCoverage);
  float cov = (smoothstep(0.2, 0.95, uCloudCoverage) * 0.7 + deck * 0.25) * smoothstep(0.0, 0.3, e0);
  // The dome lights a base with the sky's ambient occluded by the column above it, the bounce off the sunlit world
  // and the sun that leaks through (sky.ts: skyAmb * aoSky + gndAmb + lightCol * lt); the same terms at the mean
  // values of a lone cumulus base (aoSky 0.4; lt 0.13 under a high sun, 0.5 at a low one, when the sun reaches the
  // bases from below) give the mirrored base the colour the dome gives it: a light neutral grey by day (brighter
  // than the horizon sky, as the visible bases are), salmon at sunset, not a grey cut-out. A closed deck's underside
  // is lit through the whole sheet: the horizon luminance x 1.9, the band the environment probe carried for it.
  float nightMix = smoothstep(0.02, -0.08, uSunDir.y);
  float lowSun = (1.0 - smoothstep(0.04, 0.3, uSunDir.y)) * (1.0 - nightMix);
  vec3 lightCol = mix(uSunColor * 2.9, vec3(0.7, 0.78, 0.95) * 0.028, nightMix);
  vec3 baseCol = lightCol * mix(0.13, 0.5, lowSun)
               + (mix(uZenithColor, uHazeColor, 0.5) * ((0.95 - 0.25 * lowSun) * 0.4) + uSunHazeColor * (0.32 * lowSun)) * 0.95;
  vec3 cloudCol = mix(baseCol, vec3(dot(uHorizonColor, vec3(0.2126, 0.7152, 0.0722))) * 1.9, deck);
  if (uCloudCoverage > 0.03 && e0 > 0.04 && fw > 0.06) {
    float dc = (uCloudBase - P.y) / sin(e0); // metres along the reflected ray to the cloud base
    vec2 cs = P.xz + az * (cos(e0) * dc) + uCloudWind;
    // the field the dome's raymarch reads, baked by the sky around the camera (76 km, 74 m a texel; the cells
    // are kilometres): the mirrored footprint is the very footprint the visible cloud has
    float f = texture2D(uCloudFieldTex, (cs - uCloudFieldCenter) / uCloudFieldExtent + 0.5).r;
    float thr = cloudThreshold();
    float wr = clamp(dc * sqrt(2.0 * mss) * 3.3e-5, 0.0, 0.3); // the lobe's footprint on the base, in field units
    float cell = smoothstep(thr - wr, thr + 0.09 + wr, f) * exp(-dc * uHazeDensity);
    cov = max(cov, cell);
  }
  return vec4(mix(c, cloudCol, cov) * fw, fw);
}
float terrainHeightW(vec2 wp) {
  vec2 uv = (wp + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize;
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
// 'dval' is the world-space gradient of 'val' (per metre), used to warp the phase of the wave sets that ride on it.
vec2 chopSlope(vec2 p, vec2 wd, float L, float stretch, float speed, float t, float seed, float amp, out float val, out vec2 dval) {
  vec2 wc = vec2(-wd.y, wd.x);
  vec2 q = vec2((dot(p, wd) + speed * t) * stretch / L + seed, dot(p, wc) / L + seed * 1.73);
  vec3 n = noised(q);
  val = n.x;
  dval = (n.y * stretch * wd + n.z * wc) / L;
  return amp * (n.y * stretch * wd + n.z * wc);
}
// Slope of a deep-water wave set travelling toward -dir with sharpened crests (height A * 0.7 * (s + s^2 / 2)).
// 'warp' (radians) and its world gradient 'dwarp' meander the crests so several sets never lock into a lattice;
// the slope of the warp is part of the wave slope (the phase field is what is differentiated).
vec2 swellSlope(vec2 p, vec2 dir, float L, float A, float t, float phase, float warp, vec2 dwarp) {
  float k = 6.2831853 / L;
  float w = sqrt(9.81 * k);
  float ph = k * dot(p, dir) + w * t + phase + warp;
  float s = sin(ph), c = cos(ph);
  return (A * 0.7 * c * (1.0 + s)) * (k * dir + dwarp);
}
// the same, also returning the crest phase sin(ph) (1 on the crest line)
vec2 swellSlopeC(vec2 p, vec2 dir, float L, float A, float t, float phase, float warp, vec2 dwarp, out float s) {
  float k = 6.2831853 / L;
  float w = sqrt(9.81 * k);
  float ph = k * dot(p, dir) + w * t + phase + warp;
  s = sin(ph);
  float c = cos(ph);
  return (A * 0.7 * c * (1.0 + s)) * (k * dir + dwarp);
}
// Footprint fade of a wave set of wavelength L: it leaves (its slope variance going into the roughness) between
// 10 and 4.5 px per wavelength; fewer drew the set as moire rows. The footprint that matters is the pixel's
// extent along the set's wave vector: a set whose crests run away from the camera is sampled across the screen
// and stays resolved far beyond the range at which the along-view stretch of the pixel would have removed it.
float setFade(float L, float foot) { return 1.0 - smoothstep(0.1 * L, 0.22 * L, foot); }
float footAlong(vec2 dir, vec2 dx, vec2 dy) { return abs(dot(dx, dir)) + abs(dot(dy, dir)); }
// Footprint fade of a noise layer with cells L across the wind and L / stretch along it: its slope varies over
// about two thirds of a cell, so each axis fades on that feature by the rule of the sets. (The old fades on the
// pixel's diagonal, set at 5 to 2.3 px per L, let every layer draw on through 1.2-3.5 px per cell, i.e. as
// aliasing: the fine white speckle of the 60-300 m views was these layers' undersampled slopes mirroring the
// horizon sky, and their variance was booked as resolved while what they drew was noise.)
float noiseFade(float L, float stretch, vec2 dx, vec2 dy) {
  vec2 wd = uWindDir, wc = vec2(-wd.y, wd.x);
  return setFade(L / (1.5 * stretch), footAlong(wd, dx, dy)) * setFade(L / 1.5, footAlong(wc, dx, dy));
}
// Slope variance of a sharpened set: E[c^2 (1 + s)^2] = 5/8 of the squared slope amplitude.
float setVar(float L, float A) { float S = A * 0.7 * 6.2831853 / L; return 0.625 * S * S; }
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
// The sparkle is a world-anchored random slope field that carries the share of the slope variance the sea
// puts in waves of its cell sizes (SPARK_OCTAVE per octave below the spectral peak); the rest stays in the
// analytic lobe, which is therefore always wide enough that the field only modulates the path (glints a few
// times brighter than the path around them, never a blown speck) instead of thresholding it into contour
// worms. Only the finest octaves the pixel footprint resolves are evaluated (cells of 2-8 px: dots and short
// dashes that follow the water, a fine grain from altitude), the coarsest fading out as the finer fades in so
// the texture slides with the distance without popping. The
// field evolves as a slow Gaussian process in time and drifts with the wind, so glints wax and wane rather
// than flicker, and camera motion only moves them with the water they sit on.
// The cells are the crest segments of the short wind waves the glints ride on: world-fixed, aligned with the
// wind and CREST times longer along the crests than across (a short-crested sea). The frame's foreshortening
// then flattens them into the thin horizontal dashes of a sun path seen from altitude, leaves them ovals on
// the steep near water, and points them toward the horizon where the crests run away from the camera. (A
// camera-relative axis, the sun's or the view's azimuth, fanned the dashes into arcs around the camera's
// footprint and morphed the texture in every turn.)
// dx, dy: world-space extent of the pixel (screen derivatives of the surface position). The result is
// capped (in units of the sun irradiance) so no pixel outshines the sun path by more than a few times: past
// 2.5 x E the tonemapper has long gone to white anyway, and the cap only bounds the bloom energy the path and
// its glints feed (bloom stays a soft halo on the path and never bleeds over geometry next to it).
// Glint statistics: the analytic lobe is the mean over infinitely many facets, but a pixel holds a finite number
// of the centimetre facets that actually mirror the sun's disc (a facet glints when its normal lies within the
// disc's angular radius / 2 of the half vector: 1.7e-5 of slope space; a facet is a few square centimetres). The
// expected number that glint, lambda = P x 1.7e-5 / 4e-4 m^2 x pixel area, is a handful at the core of the path
// seen from altitude and well under one at its margins and everywhere in a near view, and a pixel then either
// holds a glint or does not: the margins of the path resolve into discrete sparkles (the sun is so much brighter
// than the sky that one facet in ten thousand saturates a pixel), the core stays a solid band, and a near view is
// all individual flashes. The mean is kept: the analytic radiance is multiplied by a lognormal gain of mean one
// whose contrast is 1 / sqrt(lambda), capped, from the finest sparkle cells (world-fixed crest segments, a slow
// process in time), so the glints ride the water and twinkle instead of flickering per frame.
const float SPARK_OCTAVE = 0.12;
const float GLITTER_CAP = 2.5;
const float CREST = 2.5;
const float GLINT_PER_M2 = 0.0425; // glinting facets per m^2 of water per unit of slope density
const float GLINT_CONTRAST_MAX = 1.2;
// Slope offset (in the shader's slope convention: the facet normal is N.xz / N.y minus the result) of the
// sparkle facets under the pixel, the share 'resolved' of the variance 'mss' they carry, and 'grain': a unit
// variance zero-mean process of the finest cells drawn (the glint count statistics ride on it).
vec2 sparkleSlope(vec2 wp, vec2 dx, vec2 dy, float t, float mss, out float resolved, out float grain) {
  vec2 wd = uWindDir, wc = vec2(-wd.y, wd.x);
  // pixel footprint along the wind / along the crests, in the metric of the cells
  float footEff = max(abs(dot(dx, wd)) + abs(dot(dy, wd)), (abs(dot(dx, wc)) + abs(dot(dy, wc))) / CREST);
  vec2 s = vec2(0.0);
  resolved = 0.0;
  // the field rides downwind with the short waves (they travel toward -wd)
  vec2 gp = wp + wd * (0.9 * t);
  vec2 gq = vec2(dot(gp, wd), dot(gp, wc) / CREST);
  // octaves of 0.7 m * 2^o (-2 <= o <= 8, cells from 0.175 m): the finest whose cell spans more than 2 px
  // fades in until it spans 4 px ('u') and carries most of the share (grain, not blobs), the next less, the
  // third fades out as the first fades in
  float oF = log2(max(footEff / 0.7, 1e-4)) + 1.0;
  int o0 = int(floor(oF)) + 1;
  float u = float(o0) - oF;
  if (o0 < -2) { o0 = -2; u = 1.0; }
  float w0 = smoothstep(0.0, 1.0, u);
  // Each octave holds the share of the slope variance the sea puts in waves of its cell size: about the same
  // per octave through the equilibrium range (SPARK_OCTAVE), next to nothing in waves longer than the
  // spectral peak (~0.5 U^2 m). So from 30 m the 0.2-0.7 m cells carry a third of the unresolved variance and
  // glint hard, from 1500 m the 10-50 m cells carry almost none: the sea from altitude is grain and gust
  // mottling, not 100 m brush strokes of white.
  float peakL = clamp(0.5 * uWindSpeed * uWindSpeed, 4.0, 60.0);
  grain = 0.0;
  for (int i = 0; i < 3; i++) {
    int o = o0 + i;
    if (o > 8) break;
    float fo = float(o);
    float cell = 0.7 * exp2(fo);
    float f = SPARK_OCTAVE * (1.0 - smoothstep(0.8 * peakL, 2.5 * peakL, cell));
    float w = i == 0 ? w0 : (i == 2 ? 0.45 * (1.0 - w0) : 0.75);
    vec2 q = gq / cell;
    // two independent value-noise vectors (0.214 rms per component) rotated by a slow phase: a unit-variance
    // Gaussian-like process whose rate follows the wave period of the cell size
    float ph = 1.6 * t * inversesqrt(cell) + 0.7 * fo;
    if (i < 2) {
      // the glint grain lives on the two finest octaves, the finer fading in as it comes to span 2-4 px (the
      // weights keep the unit variance through the cross-fade)
      float gw = sqrt(i == 0 ? w0 : 1.0 - w0);
      if (gw > 0.03) {
        float g1 = vnoise(q * 0.97 + 23.3 + 17.0 * fo) - 0.5, g2 = vnoise(q * 1.05 + 29.1 + 17.0 * fo) - 0.5;
        grain += (g1 * cos(ph) + g2 * sin(ph)) * (4.67 * gw);
      }
    }
    if (w * f < 0.001) continue;
    vec2 n1 = vec2(vnoise(q + 3.1 + 17.0 * fo), vnoise(q * 1.07 + 9.7 + 17.0 * fo)) - 0.5;
    vec2 n2 = vec2(vnoise(q * 0.93 + 5.3 + 17.0 * fo), vnoise(q * 1.11 + 12.9 + 17.0 * fo)) - 0.5;
    vec2 n = (n1 * cos(ph) + n2 * sin(ph)) * 4.67;
    s += (sqrt(0.5 * mss * f) * w) * n;
    resolved += f * w * w;
  }
  return s;
}
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
  float gain = 1.0;
  // the field is only evaluated where the highlight (widened to catch the field's tails) is visible
  if (slopePdf(sh, va, st, mss * 3.0) * mss > 1e-4) {
    float resolved, grain;
    vec2 s = sparkleSlope(wp, dx, dy, t, mss, resolved, grain);
    // the facets share the anisotropy of the analytic distribution
    s = va * (dot(s, va) * sqrt(st)) + vc * (dot(s, vc) * inversesqrt(st));
    P = slopePdfPeaked(sh - s, va, st, mss * (1.0 - resolved));
    // glint count statistics (see above): the expected number of glinting facets in the pixel sets the contrast
    // of a lognormal gain of mean one (exp(c g - c^2 / 2) with g of unit variance)
    float lambda = P * GLINT_PER_M2 * abs(dx.x * dy.y - dx.y * dy.x);
    float c = min(inversesqrt(max(lambda, 1e-4)), GLINT_CONTRAST_MAX);
    gain = exp(c * grain - 0.5 * c * c);
  } else {
    P = slopePdfPeaked(sh, va, st, mss);
  }
  float D = P / (NdotH * NdotH * NdotH * NdotH);
  float alpha = sqrt(mss);
  float G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha);
  float LdotH = clamp(dot(L, H), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - LdotH, 5.0);
  return min(D * F * G * gain / (4.0 * NdotV), GLITTER_CAP);
}
// Mirror image of the scene along the reflected ray (render/reflection.ts). P: surface point, V: view
// vector, N: wave normal, mss: unresolved slope variance, dist: camera distance. Returns premultiplied
// colour and coverage; coverage 0 where the reflected ray only sees sky (the caller keeps its sky there).
//
// The unresolved facets tilt the reflected rays by twice their slope (rms sqrt(mss / 2) per axis). A tilt in
// the view plane changes the ray's elevation fully, a sideways tilt turns it by only sin(grazing angle), so the
// image of a point whose mirror distance has the share s beyond the surface is smeared into a vertical streak
// of rms 2 sigma s f texels (f: focal length) and that times |V.y| across: a hull on the water (s = 0) stays
// sharp, the aircraft in a chase view (s ~ 0.5) breaks up, a tower's top far above the camera (s -> 1) streaks
// the most. The streak belongs to the mirrored object, not to the water pixel: a window's light spreads over
// the water below and above its mirror image. So the kernel gathers over the reach of the longest streak
// around, and each tap is weighted by the streak of what that tap sees (the share pyramid: the mean share of
// the objects in the tap's footprint), never by what the pixel's own mirror ray hits. (A kernel set from the
// pixel's own hit cut every streak off at the object's silhouette: a city's reflection was a row of hard-edged
// grey teeth filled with blur.) A tap's colour is read at the level of its own across-spread, so a streak keeps
// its width, floored at half the tap spacing so the taps tile the streak without gaps.
vec4 sceneReflection(vec3 P, vec3 V, vec3 N, float mss, float dist, vec2 dx, vec2 dy, float t) {
  vec4 rc = uReflVP * vec4(P, 1.0);
  if (rc.w <= 0.0) return vec4(0.0);
  float wp = rc.w; // depth of P for the mirror camera (equals its depth for the real camera)
  vec2 uv0 = rc.xy / wp * 0.5 + 0.5;
  // anything mirrored within reach? The top level is read here and at the reach of the longest streak up and
  // down the image (the top texel's footprint alone is shorter than a tall object's streak: gating on it alone
  // cut the streaks of everything higher than the camera at a quarter of their peak)
  float unit = uReflTune.x * sqrt(mss) * uReflParams.z; // rms texels of streak per unit of share (all the variance)
  vec2 reach = vec2(0.0, min(1.5 * unit * uReflTexel.y, 0.3));
  vec3 topA = vec3(textureLod(uReflTex, uv0, uReflParams.w).a, textureLod(uReflTex, uv0 + reach, uReflParams.w).a, textureLod(uReflTex, uv0 - reach, uReflParams.w).a);
  if (max(topA.x, max(topA.y, topA.z)) <= 0.0005) return vec4(0.0);
  // the kernel's extent: the streak of what is in reach, biased up so the taller objects of a mixed footprint
  // keep most of their tails (a pure region of one share is then sampled a little finer than it needs)
  vec3 topS = vec3(textureLod(uReflShare, uv0, uReflParams.w).r, textureLod(uReflShare, uv0 + reach, uReflParams.w).r, textureLod(uReflShare, uv0 - reach, uReflParams.w).r);
  float shareL = min(1.5 * (topS.x + topS.y + topS.z) / (topA.x + topA.y + topA.z), 1.0);
  // The flat mirror sees the objects in reach at the depth wq the share stands for. The real reflected ray
  // leaves P tilted by the wave slope and travels about the same path length L, so its hit point is displaced
  // by (R - R0) L: that is the mirror image displaced by the same vector (clip-space displacement per metre:
  // dclip). The share of the reach, not of the pixel's own hit, so the field is continuous across silhouettes.
  vec3 R0 = vec3(-V.x, V.y, -V.z);
  float wq = wp / max(1.0 - shareL, 0.05);
  float L = (wq - wp) * dist / wp; // metres along the ray beyond the surface
  vec3 R = reflect(-V, N);
  R.y = max(R.y, 0.02);
  vec4 rc1 = rc * (wq / wp) + (uReflVP * vec4((R - R0) * uReflTune.y, 0.0)) * L;
  vec2 uv = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  // (a distant light's glints reach a good part of the image up and down the mirror image: the bound only
  // keeps a wild tilt from sampling across the whole texture)
  uv = uv0 + clamp(uv - uv0, vec2(-0.25), vec2(0.25));
  float sigL = unit * shareL;
  // Second gate at the kernel's own place and size: the top level's texels are a tenth of the image, so the
  // first gate passes most of the water around anything mirrored; a cell the size of the whole gather (its
  // streak plus the tilt the sparkle facets can add, together under 3 rms) holding no coverage means the taps
  // below would all find nothing. Two thirds of the water of a low view left here instead of running the field
  // and the taps (the frame cost of the water-landing view was up by half).
  float lodG = clamp(ceil(log2(max(3.0 * sigL, 1.0))), 0.0, uReflParams.w);
  if (textureLod(uReflShare, uv, lodG).a < 1e-4) return vec4(0.0);
  // The sparkle facets (the same field the glitter rides on) tilt the mirror too: the light of a distant
  // window lands on the cells whose facet happens to point at it, so a reflection breaks up along the wave
  // slopes and a near one (the aircraft, a hull) shatters at its edges the way a mirror image does in a chop.
  float resolved, grainUnused;
  vec2 s = sparkleSlope(P.xz, dx, dy, t, mss, resolved, grainUnused);
  N = normalize(vec3(N.x / N.y - s.x, 1.0, N.z / N.y - s.y));
  R = reflect(-V, N);
  R.y = max(R.y, 0.02);
  rc1 = rc * (wq / wp) + (uReflVP * vec4((R - R0) * uReflTune.y, 0.0)) * L;
  uv = rc1.xy / max(rc1.w, 1e-3) * 0.5 + 0.5;
  uv = uv0 + clamp(uv - uv0, vec2(-0.25), vec2(0.25));
  unit *= sqrt(1.0 - resolved); // the resolved facets tilt the lookup; only the rest streaks it
  sigL = unit * shareL;
  // taps 0.375 of the reach's rms apart, four a side (+-1.5 rms; a Gaussian summed at that spacing is within
  // a thousandth of its integral); a short reach needs fewer
  float stepT = max(0.375 * sigL, 1.0);
  float nT = clamp(ceil(1.5 * sigL / stepT), 1.0, 4.0);
  float lodS = clamp(log2(stepT), 0.0, uReflParams.w); // the share of a tap's cell
  float vy = clamp(abs(V.y), 0.1, 1.0);
  // a streak longer than a good part of the image carries no more information than the environment map
  float clarity = 1.0 - smoothstep(uReflTune.z, uReflTune.w, sigL * uReflTexel.y);
  float edge = smoothstep(0.0, 0.015, uv.x) * smoothstep(0.0, 0.015, 1.0 - uv.x) * smoothstep(0.0, 0.015, uv.y) * smoothstep(0.0, 0.015, 1.0 - uv.y);
  vec2 dv = vec2(0.0, stepT * uReflTexel.y);
  vec4 c = vec4(0.0);
  for (float i = -4.0; i <= 4.0; i += 1.0) {
    if (abs(i) > nT) continue;
    vec2 uvi = uv + i * dv;
    vec4 sa = textureLod(uReflShare, uvi, lodS);
    if (sa.a < 1e-4) continue; // nothing mirrored in this cell
    // the streak of what the cell holds: a tap's Gaussian spreads its light over its own rms, normalised per
    // tap (the light of a source is conserved, whatever its streak), floored so a coarse tap cannot spike
    float sig = max(unit * sa.r / sa.a, max(0.6 * stepT, 0.5));
    float y = i * stepT / sig;
    float w = 0.3989 * stepT / sig * exp(-0.5 * y * y);
    float lod = clamp(log2(max(sig * vy, 0.5 * stepT)), 0.0, uReflParams.w);
    c += textureLod(uReflTex, uvi, lod) * w;
  }
  return c * (clarity * edge);
}
`;

/** After shadowmap_pars_fragment: the shadow lookup of the CSM chunk, moved along the refracted view path (see the
 *  shadow offset in WATER_FRAG_SURFACE). */
const WATER_SHADOW_FN = /* glsl */ `
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float waterShadow(sampler2D map, DirectionalLightShadow s, vec4 coord, mat4 m, vec3 off) {
  return getShadow(map, s.shadowMapSize, s.shadowIntensity, s.shadowBias, s.shadowRadius, coord + m * vec4(off, 0.0));
}
#endif
`;

/** Runs after normal_fragment_begin: wave normal, body reflectance, foam. Leaves w* variables in main scope. */
const WATER_FRAG_SURFACE = /* glsl */ `
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR; vec2 wDx; vec2 wDy; vec3 wDbg; float wDist; vec3 wShadowOff;
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

  vec2 wc = vec2(-wd.y, wd.x);
  // ---- shelter: land upwind kills chop; swell needs kilometres of open fetch and deep water. The upwind probes
  //      sway with a slow noise of the position: a straight beach otherwise printed its outline as a straight
  //      wave-onset line a fixed distance offshore (the "brightness wedge" of the island pass)
  float sway = vnoise(wp * 0.0019 + 4.1) - 0.5;
  vec2 wj = normalize(wd + wc * (0.5 * sway));
  float reach = 0.8 + 0.4 * (vnoise(wp * 0.0031 + 9.3) - 0.5);
  float o1 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wj * (90.0 * reach)));
  float o2 = 1.0 - smoothstep(-2.5, 0.2, terrainHeightW(wp + wj * (240.0 * reach)));
  float o3 = 1.0 - smoothstep(-3.0, 0.2, terrainHeightW(wp + wj * (520.0 * reach)));
  float open = (o1 + o2 + o3) * 0.3333;
  float shallowF = smoothstep(0.0, 1.2, depth);
  float chopF = mix(0.2, 1.0, open) * shallowF;
  // short wind waves regenerate within a hundred metres of fetch: only the nearest upwind shore calms them
  float rippleF = mix(0.3, 1.0, 0.6 * o1 + 0.4 * open) * smoothstep(0.0, 0.5, depth);
  float s4 = 1.0 - smoothstep(-6.0, 0.5, terrainHeightW(wp + wj * (1100.0 * reach)));
  float s5 = 1.0 - smoothstep(-6.0, 0.5, terrainHeightW(wp + wj * (2400.0 * reach)));
  // swell shoals over a shelf but only dies in the shallows: the onset must not follow a bathymetric step (the
  // shelf edge off the barrier island printed a straight roughness line where it switched on at 4-9 m)
  float swellF = open * s4 * (0.35 + 0.65 * s5) * smoothstep(1.5, 6.5, depth);

  // ---- wave field: every layer fades out when its wavelength approaches the pixel footprint; the
  //      slope variance that is filtered away goes into the microfacet roughness instead
  vec2 g = vec2(0.0);
  float mss = 0.0;
  float val0 = 0.5, val1 = 0.5, val2 = 0.5, val3 = 0.5;
  vec2 dval0 = vec2(0.0), dval1 = vec2(0.0), dvalT = vec2(0.0);
  // wind gusts: cat's paws a few hundred metres long drifting downwind roughen the surface in patches, so the
  // sea from altitude is mottled instead of one texture (the patches are read through the roughness, i.e. the
  // sky the unresolved facets reflect)
  vec2 gpw = wp + wd * (5.0 * t);
  float gust = 0.74 + 0.52 * fbm2o(vec2(dot(gpw, wd) / 640.0, dot(gpw, wc) / 270.0) + 3.7);
  float windG = wind * gust;
  // Slope amplitude of the drawn chop (the 0.5-14 m waves). Their slope variance grows with the wind as Cox and
  // Munk's slick-surface fit (0.008 + 0.00156 U: the waves a slick leaves), i.e. linearly, not as the square of
  // the wind speed an amplitude proportional to it gave: at 7 m/s that had put three times the measured slope
  // variance of a whole sea into these layers alone (a sunset path smeared into a broad band, a 10 m/s sea with
  // 20 degrees of rms slope). Unchanged at the 3.5 m/s of the clear preset; below it the old law stays.
  float windA = windG < 0.583 ? windG : 0.583 * sqrt((0.008 + 0.00936 * windG) / 0.01346);
  // swell: three long-crested sets of incommensurate wavelength and heading whose crests meander (phase warped
  // by a ~250 m noise) under wave groups travelling at half the phase speed, plus a long low ground swell from
  // another quarter; each set fades on its own wavelength
  float fS0 = setFade(83.0, footAlong(rot2(wd, -0.31), dxw, dyw)), fS1 = setFade(51.3, footAlong(rot2(wd, 0.07), dxw, dyw)),
        fS2 = setFade(33.7, footAlong(rot2(wd, 0.53), dxw, dyw)), fSL = setFade(340.0, footAlong(rot2(wd, 0.95), dxw, dyw));
  if (swellF > 0.001 && fS0 > 0.001) {
    vec3 warp = noised(wp * 0.0045 + 2.3);
    float wv = (warp.x - 0.5) * 3.2;
    vec2 dwv = warp.yz * (0.0045 * 3.2);
    float grpN = vnoise(vec2(dot(wp, wd) + 4.5 * t, dot(wp, wc)) * 0.0055 + 7.7);
    float grp = 0.35 + 1.3 * grpN;
    vec2 gs = swellSlope(wp, rot2(wd, -0.31), 83.0, 0.4, t, 0.0, wv, dwv) * (grp * fS0)
            + swellSlope(wp, rot2(wd, 0.07), 51.3, 0.3, t, 2.1, wv * 0.8, dwv * 0.8) * (grp * fS1)
            + swellSlope(wp, rot2(wd, 0.53), 33.7, 0.18, t, 4.4, wv * 0.6, dwv * 0.6) * ((1.5 - grp * 0.7) * fS2)
            + swellSlope(wp, rot2(wd, 0.95), 340.0, 0.55, t, 1.3, wv * 0.5, dwv * 0.5) * fSL;
    g += gs * swellF;
  }
  mss += swellF * (setVar(83.0, 0.4) * (1.0 - fS0 * fS0) + setVar(51.3, 0.3) * (1.0 - fS1 * fS1) + setVar(33.7, 0.18) * (1.0 - fS2 * fS2));
  float fW0 = setFade(11.6, footAlong(rot2(wd, -0.33), dxw, dyw)), fW1 = setFade(7.1, footAlong(rot2(wd, 0.21), dxw, dyw)),
        fW2 = setFade(4.7, footAlong(rot2(wd, -0.08), dxw, dyw));
  float w0 = noiseFade(14.0, 2.0, dxw, dyw);
  float a0 = 0.035 * windA * chopF;
  // (the layer's value drives the groups of the wind sea below, so it is evaluated as long as that is drawn)
  if (w0 > 0.001 || fW0 > 0.001) g += chopSlope(wp, rot2(wd, 0.15), 14.0, 2.0, 4.5, t, 1.3, a0, val0, dval0) * w0;
  mss += a0 * a0 * (1.0 - w0 * w0);
  // wind sea: short-crested directional waves whose height follows the wave groups of the layer above and whose
  // crests are bent by it (the group noise warps their phase)
  if (fW0 > 0.001 && chopF > 0.001) {
    float grp = (0.55 + 0.9 * val0) * chopF * windG;
    float wv = (val0 - 0.5) * 3.0;
    vec2 dwv = dval0 * 3.0;
    vec2 gw = swellSlope(wp, rot2(wd, -0.33), 11.6, 0.046, t, 1.0, wv, dwv) * fW0
            + swellSlope(wp, rot2(wd, 0.21), 7.1, 0.058, t, 3.3, wv * 0.7, dwv * 0.7) * fW1
            + swellSlope(wp, rot2(wd, -0.08), 4.7, 0.038, t, 5.9, wv * 0.5, dwv * 0.5) * fW2;
    g += gw * grp;
  }
  mss += chopF * windG * (setVar(11.6, 0.046) * (1.0 - fW0 * fW0) + setVar(7.1, 0.058) * (1.0 - fW1 * fW1) + setVar(4.7, 0.038) * (1.0 - fW2 * fW2)) * 1.1;
  // the short sets from here down (5 m chop in part, everything under 2 m wholly) are kept apart: a hull's churned
  // lane has wiped them off the surface, so they are added after the wake maps are read, scaled by the lane
  vec2 gS = vec2(0.0);
  float mssS = 0.0;
  float fC0 = setFade(3.4, footAlong(rot2(wd, -0.35), dxw, dyw)), fC1 = setFade(2.15, footAlong(rot2(wd, 0.25), dxw, dyw)),
        fC2 = setFade(1.3, footAlong(rot2(wd, 0.05), dxw, dyw));
  float w1 = noiseFade(5.0, 1.8, dxw, dyw);
  float a1 = 0.12 * windA * mix(chopF, rippleF, 0.4);
  // (its value groups and bends the short sets below: evaluated as long as those are drawn)
  if (w1 > 0.001 || fC0 > 0.001) { vec2 g1 = chopSlope(wp, rot2(wd, -0.2), 5.0, 1.8, 2.7, t, 3.7, a1, val1, dval1) * w1; g += 0.5 * g1; gS += 0.5 * g1; }
  mss += a1 * a1 * (1.0 - w1 * w1) * 0.5;
  mssS += a1 * a1 * (1.0 - w1 * w1) * 0.5;
  // wind streaks: the short waves are bunched into lanes a dozen metres long along the wind and a couple across
  // (value noise varies over two cells: the lanes fade on 2.4 m across the wind)
  float streakF = setFade(2.4, footAlong(wc, dxw, dyw));
  float lanes = streakF > 0.001 ? mix(0.5, vnoise(vec2(dot(wp, wd) * 0.07 + 0.6 * t, dot(wp, wc) * 0.55) + 5.5), streakF) : 0.5;
  float laneA = 0.55 + 0.9 * lanes;
  // short crested ripples of the local wind sea, bunched by the groups of the layer above; the 0.5-1 m chop is
  // drawn as sharpened crests riding on a softer noise floor (noise alone read as featureless blotches)
  float w2 = noiseFade(1.7, 1.4, dxw, dyw);
  float a2 = 0.10 * windA * rippleF * laneA;
  float crestNet = 0.0; // caustic filaments: the crests of the short sets focus the sun on the bed (zero mean)
  if (w2 > 0.001 || fC0 > 0.001) {
    gS += chopSlope(wp, rot2(wd, 0.3), 1.7, 1.4, 1.6, t, 7.1, a2, val2, dvalT) * w2;
    float grp2 = (0.45 + 1.1 * val1) * rippleF * windG * laneA;
    // the crests meander by a good part of a wavelength (two crossing sets with straight crests drew a diamond lattice)
    float wv = (val1 - 0.5) * 5.0 + (val2 - 0.5) * 1.5;
    vec2 dwv = dval1 * 5.0 + dvalT * 1.5;
    float s0, s1, s2;
    gS += (swellSlopeC(wp, rot2(wd, -0.35), 3.4, 0.030, t, 2.7, wv, dwv, s0) * fC0
         + swellSlopeC(wp, rot2(wd, 0.25), 2.15, 0.020, t, 8.1, wv * 0.7, dwv * 0.7, s1) * fC1
         + swellSlopeC(wp, rot2(wd, 0.05), 1.3, 0.011, t, 12.3, wv * 0.5, dwv * 0.5, s2) * fC2) * grp2;
    // sin^6 lines (mean 0.156) of each resolved set, weighted by the group height and broken into segments by
    // the 1.7 m noise (a continuous network read as a grid)
    float seg = 0.35 + 0.65 * smoothstep(0.3, 0.7, val2);
    crestNet = ((pow(max(s0, 0.0), 6.0) - 0.156) * fC0 + (pow(max(s1, 0.0), 6.0) - 0.156) * (0.8 * fC1) + (pow(max(s2, 0.0), 6.0) - 0.156) * (0.5 * fC2)) * min(grp2, 1.5) * seg;
  }
  mssS += a2 * a2 * (1.0 - w2 * w2) + rippleF * windG * laneA * (setVar(3.4, 0.030) * (1.0 - fC0 * fC0) + setVar(2.15, 0.020) * (1.0 - fC1 * fC1) + setVar(1.3, 0.011) * (1.0 - fC2 * fC2)) * 1.2;
  // capillary-scale ripples: resolved only within a few tens of metres; laid in wind lanes
  float w3 = noiseFade(0.5, 1.6, dxw, dyw);
  float a3 = 0.12 * windA * rippleF * laneA;
  if (w3 > 0.001) gS += chopSlope(wp, rot2(wd, -0.05), 0.5, 1.6, 0.9, t, 11.3, a3, val3, dvalT) * w3;
  mssS += a3 * a3 * (1.0 - w3 * w3);
  // a floor of micro-roughness stays even on a slick
  mss += 0.002;
  // Waves shorter than the finest layer drawn (decimetres down to the capillaries) are never resolved and hold a
  // good part of the sea's slope variance: Cox and Munk's clean-surface minus slick-surface fits (a slick damps
  // just those waves) put 0.00356 U - 0.005 in them (U in m/s: a third of the total at 3.5 m/s, half at 7). They
  // regrow within a hundred metres of fetch, so only the nearest upwind shore calms them. This is the lobe the
  // glitter keeps where every drawn wave is resolved: with a tenth of it the sun path died wherever the water came
  // near enough to resolve the chop (the sunset's path ended at the bridge), the resolved slopes being gentle and
  // the lobe left around them a couple of degrees wide.
  mssS += max(0.02136 * windG - 0.005, 0.0015) * mix(0.4, 1.0, 0.6 * o1 + 0.4 * open) * smoothstep(0.0, 0.5, depth);
  // The short waves that make up the unresolved variance are bunched by the wave groups: rougher on the crests
  // and front faces of the groups, glassier in the troughs and between them (hydrodynamic modulation, the same
  // patchiness a slick shows). Cells a few wavelengths long along the wind and a couple across, travelling at
  // the group speed. Read through the glitter this breaks the margins of a sun path into streaks across the
  // waves with darker water between them (a rough cell reaches the sun from farther off the path than a glassy
  // one); through the roughness of the sky reflection it mottles the far water the same way. Not evaluated
  // once a pixel covers a whole group.
  float grpF = setFade(53.0, footAlong(wd, dxw, dyw)) * setFade(21.0, footAlong(wc, dxw, dyw));
  if (grpF > 0.001) {
    float grpR = vnoise(vec2((dot(wp, wd) + 1.5 * t) / 40.0, dot(wp, wc) / 16.0) + 6.1);
    mss *= mix(1.0, 0.55 + 0.9 * grpR, grpF);
    mssS *= mix(1.0, 0.55 + 0.9 * grpR, grpF);
  }

  // ---- wakes: r = foam, gb = normal perturbation, a = coverage
  // the wake map is rendered top-down with screen-up = north (-Z), so v grows toward -Z
  vec2 wuv = vec2(wp.x - uWakeRegion.x, uWakeRegion.y - wp.y) / uWakeRegion.z + 0.5;
  vec4 wakeFar = vec4(0.0);
  if (all(greaterThan(wuv, vec2(0.0))) && all(lessThan(wuv, vec2(1.0)))) wakeFar = texture2D(uWakeTex, wuv);
  // the mid map (0.4 m texels ahead of the camera) replaces the far one inside its region (soft edge)
  vec2 muv = vec2(wp.x - uWakeMidRegion.x, uWakeMidRegion.y - wp.y) / max(uWakeMidRegion.z, 1.0) + 0.5;
  if (uWakeMidRegion.z > 1.0 && all(greaterThan(muv, vec2(0.0))) && all(lessThan(muv, vec2(1.0)))) {
    vec2 med = min(muv, 1.0 - muv);
    wakeFar = mix(wakeFar, texture2D(uWakeMidTex, muv), smoothstep(0.0, 0.1, min(med.x, med.y)));
  }
  // the fine map around the aircraft replaces the coarse one where it is defined (soft edge)
  vec2 nuv = vec2(wp.x - uWakeNearRegion.x, uWakeNearRegion.y - wp.y) / uWakeNearRegion.z + 0.5;
  vec4 wake = wakeFar;
  float nearW = 0.0;
  if (all(greaterThan(nuv, vec2(0.0))) && all(lessThan(nuv, vec2(1.0)))) {
    vec2 ed = min(nuv, 1.0 - nuv);
    #ifndef WATER_PATCH
      // the displaced patch draws the water inside the near region while it is active; the plane keeps a
      // ~1 m band inside the region's edge under the patch's own (undisplaced) rim: a discard right at the edge
      // left the pixels straddling it to neither mesh (the plane discards whole pixels whose centre is inside,
      // the patch only covers the samples inside) and the sky showed through as a row of dashes along the rim
      if (uWakeNearRegion.w > 0.5 && min(ed.x, ed.y) > 0.015) discard;
    #endif
    nearW = smoothstep(0.0, 0.08, min(ed.x, ed.y));
    wake = mix(wakeFar, texture2D(uWakeNearTex, nuv), nearW);
  }
  // the ribbons are alpha-blended over a cleared (black) map, so the stored colour is premultiplied by the
  // coverage: undo that before decoding (a ribbon's flat interior must decode to a flat surface, not to a
  // tilt toward the map's origin that lit the whole ribbon polygon as a pale slab)
  float wa = max(wake.a, 1e-3);
  float wakeFoam = min(wake.r / wa, 1.0) * min(wake.a * 2.5, 1.0);
  // gb of the far map: surface gradient of bow waves, Kelvin arms and stern waves seen from altitude; in the near
  // region the slope is the finite difference of the real height field the patch is displaced by, so the normal
  // (reflections, glitter) bends exactly where the surface does
  float waF = max(wakeFar.a, 1e-3);
  g += (wakeFar.gb / waF - 0.5) * min(wakeFar.a * 4.0, 1.0) * (1.0 - nearW);
  if (nearW > 0.0) {
    vec2 e = vec2(uWakeHeightTexel / uWakeNearRegion.z, 0.0);
    vec2 hx = texture2D(uWakeHeightTex, nuv + e).rg - texture2D(uWakeHeightTex, nuv - e).rg;
    vec2 hz = texture2D(uWakeHeightTex, nuv - e.yx).rg - texture2D(uWakeHeightTex, nuv + e.yx).rg;
    g += vec2(hx.r - hx.g, hz.r - hz.g) * (${WAKE_HEIGHT_SCALE.toFixed(2)} / (2.0 * uWakeHeightTexel)) * nearW;
  }
  // the churned lane is slick: the turbulence a hull leaves has wiped the short ripples (the sets under ~2 m, half
  // of the 5 m chop) off it, so it lies as a smooth road in the rippled sea, mirroring the sky where the water
  // around scatters it: the smooth dark lane behind a taxiing float or a boat, and the one part of a wake that
  // still shows kilometres astern from altitude. The longer wind sea and the swell run through it unchanged.
  // (r1 damped only the roughness term, by a third, so the lane kept its full ripple texture and read as foam
  // alone; a fully glassy lane from a low camera mirrored the horizon haze as a bright band, hence 0.8 not 1)
  float slick = 0.8 * smoothstep(0.3, 0.85, wake.a);
  g += gS * (1.0 - slick);
  mss += mssS * (1.0 - slick);
  crestNet *= 1.0 - slick;
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
  // Shadow lookup point. The darkening the eye sees is the shadow volume along the refracted view path down to
  // the bed, so the lookup is carried a way down that path, where the wave slopes bend it: the shadow's edge
  // then wobbles with the surface instead of printing the caster's planform with a ruler. Only the wave-induced
  // part of the refraction is used (the mean shift would detach the contact shadow from a floating hull; a
  // second tap at the mean-shifted point read as a doubled shadow), and it is bounded so steep chop tears nothing.
  vec3 refr0 = refract(-V, vec3(0.0, 1.0, 0.0), 0.75);
  vec2 shOff = (refr.xz / max(-refr.y, 0.3) - refr0.xz / max(-refr0.y, 0.3)) * clamp(depth, 0.4, 3.0);
  shOff *= min(1.0, 0.4 / max(length(shOff), 1e-3));
  wShadowOff = vec3(shOff.x, 0.0, shOff.y);
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
  float caustic = ((val1 - 0.5) * w1 * 0.4 + (val2 - 0.5) * w2 * 0.3 + (val3 - 0.5) * w3 * 0.3 + crestNet * 0.9) * rippleF;
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
    vec4 zs = texture2D(uZoneTex, (wp + vec2(uWorldSize * 0.5 + MAP_HALF_CELL)) / uWorldSize);
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
    // surf: wind waves break in knee-deep water on exposed shores as broken lines running shoreward. Only within
    // the last tens of metres of a beach: over wide flats the knee-deep band lies hundreds of metres out and the
    // crest phase (distance to the waterline along the bed) drew the bathymetry's contours as crisp concentric
    // swirls around every hump
    float crest = sin(shoreDist * 0.3 - t * 1.2 + patches * 3.0);
    float surf = smoothstep(0.45, 1.0, crest) * smoothstep(0.45, 0.85, exposure) * smoothstep(0.4, 0.7, patches) * coastGate
               * smoothstep(0.3, 0.5, depth) * (1.0 - smoothstep(0.9, 1.5, depth)) * smoothstep(2.5, 6.0, uWindSpeed)
               * (1.0 - smoothstep(40.0, 90.0, shoreDist));
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
  // the grain's cells are 0.25-0.6 m: once a pixel covers that much water it is filtered out (from altitude
  // it sampled into dashes and dots along every boat wake)
  float wakeGrainFade = 1.0 - smoothstep(0.15, 0.6, foot);
  float wakeGrain = mix(0.85, 0.7 + 0.3 * vnoise(wp * 1.7 + vec2(t * 0.6, 0.0)) * (0.6 + 0.8 * vnoise(wp * 4.3 - t * 0.9)), wakeGrainFade);
  foam = clamp(foam + wakeFoam * 0.85 * wakeGrain + whitecap, 0.0, 0.92);

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
  vec3 unsh = vec3(0.0);
  #if NUM_DIR_LIGHTS > 0
    sunCol = directionalLights[0].color;
    float nl = saturate(dot(normal, directionalLights[0].direction));
    unsh = sunCol * nl * RECIPROCAL_PI;
    float ul = max(max(unsh.r, unsh.g), unsh.b);
    if (ul > 1e-5) shadow = clamp(max(max(reflectedLight.directDiffuse.r, reflectedLight.directDiffuse.g), reflectedLight.directDiffuse.b) / ul, 0.0, 1.0);
  #endif
  // Shadow on the body colour: the light that comes back out of the water was scattered metres away from where it
  // entered, so the sun-lit water around an aircraft-sized shadow keeps lighting the shadowed column from the side
  // and the shadow is a soft mid-tone, not the surface's own shadow. Only the bed of shallow water (which the
  // sunlight reaches straight down) goes properly dark; the sky irradiance is never shadowed by the aircraft.
  float volumeLeak = 0.45 * (1.0 - exp(-wDbg.x / 2.5));
  vec3 Ebody = reflectedLight.indirectDiffuse + mix(reflectedLight.directDiffuse, unsh, volumeLeak);
  vec3 Rdir = reflect(-wV, wN);
  // the dome's radiance along the reflected lobe, Fresnel-weighted per node (see skyReflection: the analytic sky
  // the dome itself draws); F is the lobe's mean Fresnel, the share the body colour loses to the surface
  vec4 skyF = skyReflection(Rdir, wMss, vWorldPos, wV);
  float F = skyF.a;
  vec3 sky = skyF.rgb;
  // the mirrored scene (aircraft, shore, piers, city) replaces the sky where the reflected ray meets an object
  vec4 refl = vec4(0.0);
  if (uReflParams.x > 0.5) {
    refl = sceneReflection(vWorldPos, wV, wN, wMss, wDist, wDx, wDy, uWaveTime);
    sky = sky * (1.0 - refl.a) + refl.rgb * F;
  }
  vec3 body = wBodyR * Ebody;
  // in shadow the column is lit by the sky alone, whose light is scattered back with less of the blue selectivity
  // of the long sunlit path: the shadowed water reads blue-grey next to the lit teal, not navy
  float shade = 1.0 - shadow;
  float bodyLum = dot(body, vec3(0.2126, 0.7152, 0.0722));
  body = mix(body, vec3(bodyLum) * vec3(0.9, 0.97, 1.08), 0.22 * shade);
  // Sun glitter radiance = irradiance x (microfacet BRDF x NdotL), with the CSM sun's physical irradiance and no
  // scale factor: the path's core must outshine sunlit white (it is the image of the sun), so the tonemapper takes
  // it to white and only the outer fall-off keeps the sun's hue. (A 0.25 scale left the path a mid-tone: over the
  // dark body a mid-tone orange is exactly the brown glaze of every low-sun view.) The glitter is shadowed at the
  // surface, whose shadow is not the wobbling volume shadow looked up above: it only follows it in part
  vec3 glitter = sunCol * mix(1.0, shadow, 0.7) * sunGlitter(wN, wV, uSunDirW, wMss, vWorldPos.xz, wDx, wDy, uWaveTime);
  vec3 col = body * (1.0 - F) + sky + glitter * (1.0 - wFoam);
  vec3 foamCol = vec3(0.9, 0.91, 0.91) * Ediff;
  col = mix(col, foamCol, wFoam);
  outgoingLight = col;
  #ifdef WATER_DEBUG
    // depth (m/16), diffuse irradiance E/pi (green, /2.5), Fresnel sky weight
    outgoingLight = vec3(wDbg.x / 16.0, Ediff.g / 2.5, F);
    #if WATER_DEBUG == 2
      outgoingLight = vec3(wDbg.y, wDbg.z, wMss * 20.0);
    #elif WATER_DEBUG == 3
      outgoingLight = refl.rgb + vec3(0.0, 0.0, 0.25) * (1.0 - refl.a);
    #elif WATER_DEBUG == 4
      outgoingLight = glitter;
    #elif WATER_DEBUG == 5
      outgoingLight = body;
    #elif WATER_DEBUG == 6
      outgoingLight = sky;
    #endif
  #endif
}
gl_FragColor = vec4( outgoingLight, 1.0 );
`;

export class Water {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  /**
   * Dense grid over the near wake region (the water around the aircraft), displaced by the hull height field
   * and the swell so the surface really humps at the stems, hollows behind the step and lifts the floats with
   * the waves; the main plane leaves that region to it. Same shading, one more draw.
   */
  readonly patch: THREE.Mesh;
  readonly patchMaterial: THREE.MeshStandardMaterial;
  private readonly offset = { value: new THREE.Vector3() };
  readonly uniforms: Record<string, THREE.IUniform>;
  /** the atmosphere's shared uniforms (sky colours, sun, haze, cloud cover): the sky reflection is the analytic dome */
  private atmosUniforms: Record<string, THREE.IUniform> = {};

  constructor(textures: MapTextures, wakeTex: THREE.Texture, wakeNearTex: THREE.Texture = wakeTex, wakeHeightTex: THREE.Texture = wakeTex, wakeHeightTexel = 0.125, wakeMidTex: THREE.Texture = wakeTex) {
    this.uniforms = {
      uHeightTex: { value: textures.height },
      uZoneTex: { value: textures.zone },
      uWakeTex: { value: wakeTex },
      uWakeRegion: { value: new THREE.Vector4(0, 0, 3000, 0) },
      uWakeMidTex: { value: wakeMidTex },
      uWakeMidRegion: { value: new THREE.Vector4(0, 0, 0, 0) },
      uWakeNearTex: { value: wakeNearTex },
      uWakeHeightTex: { value: wakeHeightTex },
      uWakeHeightTexel: { value: wakeHeightTexel },
      // an empty region until update() places the near map
      uWakeNearRegion: { value: new THREE.Vector4(1e9, 1e9, 1, 0) },
      uWaterOffset: this.offset,
      uWorldSize: { value: WORLD_SIZE },
      uWaveTime: { value: 0 },
      uWindSpeed: { value: 6 },
      uWindDir: { value: new THREE.Vector2(0.94, 0.34) },
      uSunDirW: { value: new THREE.Vector3(0, 1, 0) },
      // an empty field (no cloud mirrored) until attachCloudField() shares the sky's bake
      uCloudFieldTex: { value: null as THREE.Texture | null },
      uCloudFieldCenter: { value: new THREE.Vector2() },
      uCloudFieldExtent: { value: 1 },
      // inactive placeholders until attachReflection() shares the reflection pass's uniforms
      ...createReflectionUniforms(),
    };
    this.material = this.makeMaterial(false);
    this.patchMaterial = this.makeMaterial(true);

    // A flat grid reaching past the far clip plane so the horizon is always water; shading is per pixel
    // and a modest tessellation keeps the interpolation of the huge quad numerically friendly.
    const size = 130000;
    const geo = new THREE.PlaneGeometry(size, size, 64, 64);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 5;
    // the near patch: a unit grid the vertex shader maps onto the near region (192^2 cells, crowded toward
    // the centre: ~9 cm between vertices around the floats, ~45 cm at the edge)
    const pgeo = new THREE.PlaneGeometry(1, 1, 192, 192);
    pgeo.rotateX(-Math.PI / 2);
    this.patch = new THREE.Mesh(pgeo, this.patchMaterial);
    this.patch.frustumCulled = false;
    this.patch.receiveShadow = true;
    this.patch.matrixAutoUpdate = false;
    this.patch.renderOrder = 5;
    this.patch.visible = false;
  }

  private makeMaterial(patch: boolean): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.0 });
    const uniforms = this.uniforms;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      prev?.(shader, renderer);
      Object.assign(shader.uniforms, this.atmosUniforms, uniforms);
      const define = patch ? '#define WATER_PATCH\n' : '';
      shader.vertexShader = define + shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WATER_VERT_PARS}`)
        .replace('#include <begin_vertex>', `${WATER_VERT_MAIN}\nvec3 transformed = wp;`);
      // the CSM patches ShaderChunk.lights_fragment_begin (where the shadow lookups are) and three expands the
      // include after this hook, so the chunk is inlined here with the lookup moved to the wave-refracted point
      const lights = THREE.ShaderChunk.lights_fragment_begin.replace(
        /getShadow\( directionalShadowMap\[ i \], directionalLightShadow\.shadowMapSize, directionalLightShadow\.shadowIntensity, directionalLightShadow\.shadowBias, directionalLightShadow\.shadowRadius, vDirectionalShadowCoord\[ i \] \)/g,
        'waterShadow( directionalShadowMap[ i ], directionalLightShadow, vDirectionalShadowCoord[ i ], directionalShadowMatrix[ i ], wShadowOff )');
      shader.fragmentShader = define + (WATER_DEBUG ? `#define WATER_DEBUG ${WATER_DEBUG}\n` : '') + shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${WATER_FRAG_PARS}`)
        .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>\n${WATER_SHADOW_FN}`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${WATER_FRAG_SURFACE}`)
        .replace('#include <lights_fragment_begin>', lights)
        .replace('#include <lights_fragment_maps>', WATER_FRAG_MAPS)
        .replace('#include <opaque_fragment>', WATER_FRAG_COMPOSE);
    };
    mat.customProgramCacheKey = () => `water-v20-${patch ? 'patch' : 'plane'}-${WATER_DEBUG}`;
    return mat;
  }

  /** Draw the displaced near patch (the aircraft is on or near the water) or leave the region to the flat plane. */
  setPatchActive(on: boolean): void {
    this.patch.visible = on;
    this.uniforms.uWakeNearRegion.value.w = on ? 1 : 0;
  }

  /** Sample the planar reflection pass. The pass mutates its uniform values in place, so sharing the value
   *  objects keeps the material current whether or not it has already been compiled. */
  attachReflection(u: ReflectionUniforms): void {
    for (const k of Object.keys(u) as (keyof ReflectionUniforms)[]) this.uniforms[k].value = u[k].value;
  }

  /** Mirror the clouds from the sky's baked macro field (Sky.coverageField); the value objects are shared live. */
  attachCloudField(f: { texture: THREE.Texture; center: THREE.Vector2; extent: number }): void {
    this.uniforms.uCloudFieldTex.value = f.texture;
    this.uniforms.uCloudFieldCenter.value = f.center;
    this.uniforms.uCloudFieldExtent.value = f.extent;
  }

  /** Share the atmosphere's uniforms (the sky the water mirrors). Must be called before the first render. */
  attachAtmosphere(u: Record<string, THREE.IUniform>): void {
    this.atmosUniforms = u;
    this.material.needsUpdate = true;
    this.patchMaterial.needsUpdate = true;
  }

  update(camX: number, camZ: number, time: number, windSpeed: number, windDir: THREE.Vector2, sunDir: THREE.Vector3, wakeCenter: THREE.Vector2, wakeSize: number, wakeNearCenter?: THREE.Vector2, wakeNearSize = 0, wakeMidCenter?: THREE.Vector2, wakeMidSize = 0): void {
    this.offset.value.set(Math.round(camX / 50) * 50, 0, Math.round(camZ / 50) * 50);
    this.uniforms.uWaveTime.value = time;
    this.uniforms.uWindSpeed.value = windSpeed;
    this.uniforms.uWindDir.value.copy(windDir);
    this.uniforms.uSunDirW.value.copy(sunDir);
    this.uniforms.uWakeRegion.value.set(wakeCenter.x, wakeCenter.y, wakeSize, 0);
    if (wakeNearCenter && wakeNearSize > 0) { const r = this.uniforms.uWakeNearRegion.value as THREE.Vector4; r.set(wakeNearCenter.x, wakeNearCenter.y, wakeNearSize, r.w); }
    if (wakeMidCenter && wakeMidSize > 0) (this.uniforms.uWakeMidRegion.value as THREE.Vector4).set(wakeMidCenter.x, wakeMidCenter.y, wakeMidSize, 0);
  }
}
