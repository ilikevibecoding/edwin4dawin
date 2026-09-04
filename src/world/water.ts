import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';
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
 *    suspended sediment), a Fresnel mix with the blurred sky reflection taken from the scene environment
 *    map, an anisotropic Cox-Munk style sun glitter, and foam from shore exposure, surf and wakes.
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
// Two independent standard normal deviates from a 2D hash (Box-Muller).
vec2 gauss2(vec2 p) {
  vec2 u = hash22(p);
  float r = sqrt(-2.0 * log(max(u.x, 1e-4)));
  float a = 6.2831853 * u.y;
  return r * vec2(cos(a), sin(a));
}
// Anisotropic Gaussian slope density (Cox-Munk style) of facets around the resolved normal, evaluated at
// slope offset 'sh' with total variance 'mss'; elongated along the view azimuth (stretch 'st') so the
// highlight forms a streak toward the sun. Integrates to 1 over slope space.
float slopePdf(vec2 sh, vec2 va, float st, float mss) {
  float along = dot(sh, va), across = dot(sh, vec2(-va.y, va.x));
  return exp(-(along * along / (mss * st) + across * across * st / mss)) / (PI * mss);
}
// Sun glitter. The unresolved slope variance is split in two: a smooth part rendered with the analytic
// distribution, and a part carried by a world-anchored field of facet cells (five octaves from 0.7 m to
// 180 m, each active while its cell covers several pixels) whose random slopes make individual glints
// resolve as sparkles up close and as the streaky wave-group texture of a distant sun path. The
// expectation over the facet field equals the analytic term with the full variance, so the glitter
// energy is the same whether a stretch of water is near (sparkling) or far (smooth).
float sunGlitter(vec3 N, vec3 V, vec3 L, float mss, vec2 wp, float foot, float t) {
  float NdotL = dot(N, L);
  float NdotV = dot(N, V);
  if (NdotL <= 0.002 || NdotV <= 0.002) return 0.0;
  vec3 H = normalize(L + V);
  float NdotH = max(dot(N, H), 1e-3);
  vec2 sh = -H.xz / max(H.y, 0.05) + N.xz / max(N.y, 0.05);
  vec2 va = V.xz;
  float vl = length(va);
  va = vl > 1e-4 ? va / vl : vec2(1.0, 0.0);
  float st = 1.0 + 0.45 * (1.0 - clamp(V.y, 0.0, 1.0));
  float P = slopePdf(sh, va, st, mss);
  // facet field only where the analytic highlight (widened to catch the tails of the facet slopes) is visible
  if (slopePdf(sh, va, st, mss * 4.0) * mss > 1e-4) {
    float share = 0.62; // fraction of the variance carried by the facets
    float mssS = mss * (1.0 - share);
    float sig = sqrt(mss * share);
    float wsum = 0.0, glint = 0.0;
    vec2 gp = wp + vec2(0.37, 0.61) * t; // the facet pattern drifts slowly like the water it rides on
    float cell = 0.7;
    for (int o = 0; o < 5; o++, cell *= 4.0) {
      // active while the cell spans ~4..16 pixels; hands over to the neighbouring octave outside that
      float w = smoothstep(cell / 3.0, cell / 4.5, foot) * (1.0 - smoothstep(cell / 12.0, cell / 18.0, foot));
      if (w < 0.003) continue;
      vec2 q = gp / cell;
      vec2 id = floor(q);
      vec2 f = q - id;
      // one glint candidate per cell: a point well inside the cell so the falloff disk is never clipped
      vec2 h = hash22(id + 17.3 * float(o));
      vec2 pt = 0.28 + 0.44 * h;
      float d = length(f - pt) / 0.27;
      float disk = 1.0 - smoothstep(0.55, 1.0, d);
      // the facet slope is a Gaussian process in time: two independent draws rotated by a slow phase
      float ph = 1.7 * t + 6.2831853 * h.x;
      vec2 s = sig * (gauss2(id + 3.1 + 41.7 * float(o)) * cos(ph) + gauss2(id + 9.7 + 41.7 * float(o)) * sin(ph));
      // the disk covers ~0.14 of the cell: renormalise so the octave's mean matches the analytic term
      glint += w * disk * 7.15 * slopePdf(sh - s, va, st, mssS);
      wsum += w;
    }
    wsum = min(wsum, 1.0);
    P = mix(P, glint / max(wsum, 1e-3), wsum);
  }
  float D = P / (NdotH * NdotH * NdotH * NdotH);
  float alpha = sqrt(mss);
  float G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha);
  float LdotH = clamp(dot(L, H), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - LdotH, 5.0);
  return D * F * G / (4.0 * NdotV);
}
`;

/** Runs after normal_fragment_begin: wave normal, body reflectance, foam. Leaves w* variables in main scope. */
const WATER_FRAG_SURFACE = /* glsl */ `
vec3 wN; vec3 wV; float wFoam; float wMss; vec3 wBodyR; float wFoot; vec3 wDbg;
{
  vec2 wp = vWorldPos.xz;
  float foot = length(fwidth(wp)); // metres of water per pixel
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
  vec3 K = vec3(0.9, 0.245, 0.19);
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
  float caustic = ((val1 - 0.5) * w1 * 0.35 + (val2 - 0.5) * w2 * 0.3 + (val3 - 0.5) * w3 * 0.25) * rippleF;
  bed *= 1.0 + caustic * (1.0 - smoothstep(1.0, 3.5, depth)) * smoothstep(0.05, 0.3, depth);
  // deep-water reflectance under neutral irradiance: blue-teal bay water carrying some suspended matter,
  // clearer and bluer ocean beyond the shelf (a few percent, peaking in the blue)
  vec3 Rinf = mix(vec3(0.03, 0.072, 0.13), vec3(0.01, 0.038, 0.105), smoothstep(8.0, 22.0, depth));
  vec3 R = bed * T + Rinf * (1.0 - T);
  // suspended sediment: milky, pale turquoise over the flats and along the shore
  float milkN = fbm2o(wp * 0.004 + 9.0);
  float milk = (1.0 - smoothstep(0.3, 3.5, depth)) * (0.3 + 0.7 * smoothstep(0.35, 0.8, milkN));
  R += vec3(0.04, 0.068, 0.095) * milk * (1.0 - exp(-path * 0.9));

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
  float whitecap = smoothstep(0.74, 0.86, val0) * smoothstep(7.0, 14.0, uWindSpeed) * smoothstep(2.0, 6.0, depth) * open * w0;
  foam = clamp(foam + wake.r * 1.3 + whitecap, 0.0, 1.0);

  wN = N; wV = V; wFoam = foam; wMss = mss; wFoot = foot;
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
  float cosV = clamp(dot(wN, wV), 0.0, 1.0);
  // ensemble Fresnel of the rough surface: the unresolved facets take the grazing reflectance well below a mirror's
  float Fg = max(1.0 - 1.6 * rSky * rSky, 0.45);
  float F = 0.02 + (Fg - 0.02) * pow(1.0 - cosV, 5.0);
  vec3 body = wBodyR * Ediff;
  // the CSM sun now carries physical irradiance (x6); the glitter BRDF was tuned for the old scale
  vec3 glitter = sunCol * 0.25 * shadow * sunGlitter(wN, wV, uSunDirW, wMss, vWorldPos.xz, wFoot, uWaveTime);
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
    mat.customProgramCacheKey = () => `water-v2-${WATER_DEBUG}`;
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

  update(camX: number, camZ: number, time: number, windSpeed: number, windDir: THREE.Vector2, sunDir: THREE.Vector3, wakeCenter: THREE.Vector2, wakeSize: number): void {
    this.offset.value.set(Math.round(camX / 50) * 50, 0, Math.round(camZ / 50) * 50);
    this.uniforms.uWaveTime.value = time;
    this.uniforms.uWindSpeed.value = windSpeed;
    this.uniforms.uWindDir.value.copy(windDir);
    this.uniforms.uSunDirW.value.copy(sunDir);
    this.uniforms.uWakeRegion.value.set(wakeCenter.x, wakeCenter.y, wakeSize, 0);
  }
}
