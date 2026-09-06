import * as THREE from 'three';
import { GLSL_AERIAL, GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from '../render/shaders/common.glsl';
import type { Atmosphere } from './atmosphere';
import { createCloudNoiseTexture } from './noiseTexture';

/** Size (texels) and world extent (m) of the baked 2D cloud macro field. */
const COV_SIZE = 1024;
const COV_EXTENT = 76000;
/** Clouds are marched no further than this; beyond it they have faded into the horizon haze. Far enough
 *  that from a few hundred metres up the distant cells stack into a low layer 1-3 deg above the horizon. */
const CLOUD_MAX_DIST = 42000;
/** Re-bake the macro field when the camera (in cloud space) drifts this far from the baked centre. */
const COV_REBAKE_DIST = 7000;

/** Sun disc, moon and stars on top of the analytic sky: shared by the full-resolution dome and the probe. */
const GLSL_SKY_EXTRAS = /* glsl */ `
vec3 moonDirection() { return normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z)); }
vec3 stars(vec3 dir) {
  vec3 d = dir * 220.0;
  vec3 c = floor(d);
  float h = hash12(c.xy + c.z * 17.0);
  float star = smoothstep(0.985, 1.0, h) * step(0.15, dir.y);
  vec3 f = fract(d) - 0.5;
  star *= smoothstep(0.35, 0.0, length(f));
  return vec3(star) * (0.6 + 0.4 * hash12(c.zx));
}
/** starVis: 1 in clear sky, 0 behind cloud (stars vanish before the sky glow does: they are point
 *  sources, any haze or cloud veil kills them first). */
vec3 skyBackground(vec3 dir, float starVis) {
  vec3 sky = sunComposite(skyRadiance(dir), dir);
  vec3 moonDir = moonDirection();
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.55 * starVis;
  return sky;
}
`;

/** Base relief amplitude in units of the macro field's base-variation channel: the two value-noise octaves have a
 *  one-sigma of ~0.13, the channel's half-range is up to 200 m, so 0.13 * 1.15 * 2 * 200 = ~60 m one sigma of
 *  relief (clipped at +-0.4, i.e. ~+-180 m), the same as round 6's 3D-noise relief but with 260 m as its finest
 *  period (the bake texel is 74 m). Shared by the bake and the march (slab bounds). */
const GLSL_RELIEF = /* glsl */ `const float RELIEF_GAIN = 1.15;`;

/** Bakes the macro coverage field (cloud space) into a 2D texture so the raymarch reads one texel instead
 *  of evaluating ~10 octaves of value noise per sample. */
const COV_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_RELIEF}
uniform vec2 uCovCenter;
uniform float uCovExtent;
in vec2 vUv;
void main() {
  vec2 cs = uCovCenter + (vUv - 0.5) * uCovExtent;
  float f = cloudFieldRaw(cs);
  vec2 p = cs * 0.00015 + uCloudSeed;
  // slow field: which masses develop vertically (0 flat .. 1 towering)
  float tower = clamp((fbm3(p * 0.7 + 3.1) - 0.22) / 0.46, 0.0, 1.0);
  // slight variation of the base altitude between cells
  float baseVar = clamp((fbm3(p * 2.2 + 5.5) - 0.2) / 0.5, 0.0, 1.0);
  // base relief (two value-noise octaves, periods ~520/260 m: 7 and 3.5 texels of the bake) packed into the same
  // channel: the march reads the base altitude in one macro fetch instead of a 3D noise fetch per sample, and the
  // light march sees the relief for free. The bake target is half float, so the sum may leave 0..1.
  vec2 rp = cs * (1.0 / 520.0) + uCloudSeed * 3.7;
  float relief = vnoise(rp) * 0.667 + vnoise(mat2(1.6, 1.2, -1.2, 1.6) * rp + 7.3) * 0.333;
  baseVar += clamp(relief - 0.5, -0.4, 0.4) * RELIEF_GAIN;
  // ~1 km turret field: modulates the column height inside a cell so a mass breaks into several towers
  // of different heights instead of one smooth mound; it also warps the 3D noise domain so the 64^3
  // tile never repeats visibly across the sky
  float turret = clamp((fbm3(p * 7.0 + 21.0) - 0.25) / 0.4, 0.0, 1.0);
  gl_FragColor = vec4(f, tower, baseVar, turret);
}
`;

/** Volumetric cloud layer, rendered at reduced resolution into RGB = premultiplied radiance, A = transmittance. */
const CLOUD_FRAG = /* glsl */ `
precision highp sampler3D;
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_RELIEF}
${GLSL_SKY}
${GLSL_AERIAL}
uniform sampler3D uNoise3D;
uniform sampler2D uCovTex;
uniform vec3 uGroundColor;
uniform vec2 uCovCenter;
uniform float uCovExtent;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uCloudSteps;
uniform float uMaxDist;
in vec2 vUv;

const float SIGMA = 0.03;         // extinction per metre at unit density (dense cumulus)
const float NOISE_SCALE = 1.0 / 2600.0;
// half-ranges (m) of the cell-to-cell base variation and of the ~1 km undulation: fractions of the slab, capped so
// a deep storm slab (2.5 km) does not hang its cells on the water
vec2 baseSpread() {
  float deck = smoothstep(0.45, 0.7, uCloudCoverage);
  float thick = uCloudTop - uCloudBase;
  return vec2(min(mix(0.11, 0.17, deck) * thick, 200.0), min(mix(0.04, 0.08, deck) * thick, 90.0));
}
// the base can sit this far below uCloudBase (cell-to-cell variation + relief + the ~1 km undulation), so the
// march and the light march start there instead of planing those cells off at uCloudBase
float slabBottom() {
  vec2 s = baseSpread();
  return uCloudBase - (1.0 + 0.8 * RELIEF_GAIN) * s.x - s.y;
}
/** Analytic level of detail: a march step longer than half a noise period point-samples that octave into grain,
 *  and the per-pixel jitter turns the grain into structured noise (dither hatching on distant clouds, bead rows
 *  along backlit bases, speckled silhouettes). Each channel therefore fades toward its mean (0.5) as the step
 *  grows past the periods it resolves, so a long step integrates a smooth density (what a mip fetch would
 *  return) and the finest octaves only shape the cloud where the short surface steps resolve them.
 *  x = shape (x1: periods 650/325/162 m, keeps a quarter at the coarsest step: the far cells stay lumpy),
 *  y = detail (x3: 216/108/54 m), z = wisps (x5: 65/32 m). */
vec3 stepFade(float dt) {
  return vec3(1.0 - 0.75 * smoothstep(70.0, 230.0, dt), 1.0 - smoothstep(40.0, 130.0, dt), 1.0 - smoothstep(25.0, 90.0, dt));
}
vec4 fadeNoise(vec4 n, float k) { return 0.5 + (n - 0.5) * k; }

// interleaved gradient noise: a pure function of the pixel position, so frames are reproducible
float ign(vec2 px) { return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y)); }

/** Macro field at a world xz position: x raw field, y vertical development (0 flat .. 1 towering),
 *  z base variation, w turret field (~1 km). */
vec4 macroField(vec2 wp) {
  vec2 uv = (wp + uCloudWind - uCovCenter) / uCovExtent + 0.5;
  return texture(uCovTex, uv);
}

/** Base altitude of the column: varies between cells with the 260-520 m relief packed in (f.z) and a ~1 km
 *  undulation (f.w), so no base is a ruler line and neighbouring cumulus do not share one plane; a closed deck
 *  hangs its cells lower still (stratocumulus: the underside is a field of sagging lumps, not a ceiling plane).
 *  A 2D height field cannot fold: a relief that varied with the sample's own height (rounds 1-5) hung pointed
 *  funnels from the base and, seen from inside the layer, switched the density on and off along each ray. */
float baseAltitude(vec4 f) {
  vec2 s = baseSpread();
  return uCloudBase + (f.z - 0.5) * 2.0 * s.x + (f.w - 0.5) * 2.0 * s.y;
}

vec3 noiseCoord(vec3 p, vec4 f) {
  vec3 q = (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * NOISE_SCALE;
  // slow domain warp breaks the tiling of the 64^3 texture. Driven mainly by the ~10 km tower field: a warp of
  // 0.9 tile per unit of the ~1 km turret field compressed the noise 3x horizontally along turret gradients and
  // drew vertical drapery through every cloud once the channels had contrast
  return q + vec3(f.y * 0.8 + f.w * 0.15, f.z * 0.25, f.y * 0.5 + f.w * 0.1);
}

/** Vertical envelope of the layer (before noise): a base whose footprint is exactly cloudCoverage2D
 *  (so the ground shadows still match), columns whose height is set by how far the raw field exceeds the
 *  threshold (cell interiors tower, edges stay low), by the slow "tower" field (some masses develop
 *  vertically, others stay flat) and by the ~1 km turret field. Returns coverage * vertical profile;
 *  hf = height fraction in the slab, hn = fraction of this column's own height, H = column height. */
float envelope(vec3 p, vec4 f, out float hf, out float hn, out float H) {
  float thick = uCloudTop - uCloudBase;
  float deck = smoothstep(0.45, 0.7, uCloudCoverage);
  hf = (p.y - baseAltitude(f)) / thick;
  float d = f.x - cloudThreshold();
  // base footprint (identical to cloudCoverage2D, so the ground shadows match)
  float cov = smoothstep(0.0, 0.09, d);
  // own height of this column: low at the footprint edge, rising steeply with the depth inside the cell
  // (steep walls, a narrow skirt of low tufts instead of a wide thin shelf around each tower; the sqrt
  // rounds a conical cell into a dome), faster over towering masses; the turret field then breaks the
  // mound into several towers of different heights
  float g = mix(0.55, 0.16, f.y);
  float dg = max(d, 0.0) / g;
  H = 0.1 + 0.9 * sqrt(clamp(dg * 2.2, 0.0, 1.0));
  // a closed deck saturates the field, so its thickness (and the light coming through it) varies with
  // the turret field alone: give it a wider range so the underside shows thick dark cells and thin bright gaps
  H = clamp(H * mix(mix(0.55, 0.28, deck), 1.1, f.w), 0.05, 1.0);
  hn = hf / H;
  // the base ramp is where the shape noise gets its leverage on the base: the visible underside is the iso-surface
  // 1.2 e = (1 - shape) erosion, and the noise moves it by a fraction of the ramp (about +-17 % of it for the
  // normalised channels with the base erosion below), so a ramp of 130 m under a core gives +-25 m of texture
  // on a dark, well-defined base and 200-260 m under the low edge of a cell shreds it into rags and scud (the
  // detail remap adds to both). Round 6's 110 m ramp everywhere left the noise +-10 m: the relief alone was
  // shaping the base and it read as smooth pouches. A closed deck gets a soft one carved into hanging cells.
  // The ramp is capped at a fraction of the column's own height: a low tuft is otherwise all ramp and the noise
  // shreds it into drifting fragments.
  float ramp = mix(mix(0.12, 0.06, smoothstep(0.15, 0.6, H)), 0.16, deck);
  float baseRamp = min(ramp, 0.6 * H);
  float v = smoothstep(0.0, baseRamp, hf) * (1.0 - smoothstep(0.25, 1.0, hn)) * (1.0 - smoothstep(0.9, 1.0, hf));
  // cov^2: the soft footprint fringe thins out for the noise to shred instead of forming a plate
  return cov * cov * v;
}

/** Shape-eroded density: solid interiors, cauliflower lobes where the envelope thins (top and edges).
 *  The noise channels are normalised (mean 0.5, std 0.16); the composite shape term is given a 1.3 gain so a
 *  one-sigma lobe moves the surface by a useful fraction of the envelope. */
float shapeDensity(float e, float hn, vec4 n) {
  float shape = 0.5 + (n.r * 0.6 + n.g * 0.25 + n.a * 0.15 - 0.5) * 1.3;
  // bases are mottled and ragged (hanging fragments, holes where the column is thin); the erosion grows
  // toward the top where it carves the lobes
  float erosion = mix(1.1, 1.3, clamp(hn, 0.0, 1.0));
  return e * 1.2 - (1.0 - shape) * erosion;
}

/** Expected noised density for an envelope value (what shapeDensity averages to over the noise): the
 *  envelope alone would count the soft fringe outside the visible surface as cloud. */
float meanDensity(float e, float hn) { return clamp(e * 1.2 - 0.5 * mix(1.1, 1.3, clamp(hn, 0.0, 1.0)), 0.0, 1.0); }

/** Density without edge detail (used by the light march, one noise fetch per step; the steps are short enough
 *  for the shape channel, no fade). */
float densityBase(vec3 p, vec4 f) {
  float hf, hn, H;
  float e = envelope(p, f, hf, hn, H);
  if (e <= 0.002) return 0.0;
  vec4 n = texture(uNoise3D, noiseCoord(p, f));
  return clamp(shapeDensity(e, hn, n), 0.0, 1.0);
}

/** Full density with detail erosion of the edges; mott returns a lighting mottle (the low-frequency shape noise,
 *  blending to the finer one from the detail fetch near the camera) without another fetch. n is the shape fetch
 *  already faded for the step; fade = stepFade(dt) for the detail and wisp channels. */
float densityFull(vec3 q, vec4 n, float e, float hf, float hn, vec3 fade, float nearK, out float mott) {
  float d = shapeDensity(e, hn, n);
  mott = n.a;
  if (d <= 0.0) return 0.0;
  // worley erosion: billowy lobes on the sides, wispier toward the top. In the thin part of the base zone the
  // worley is inverted (holes at the feature points, cloud left along the cell walls): rags, scud and fraying
  // fringes hang under the base instead of round bumps; the dense interior of the base keeps its lumps
  vec4 n3 = fadeNoise(texture(uNoise3D, q * 3.0 + vec3(0.37, 0.11, 0.73)), fade.y);
  float det = n3.g;
  float baseZone = (1.0 - smoothstep(0.0, 0.12, hf)) * (1.0 - smoothstep(0.3, 0.9, e)) * 0.7;
  det = mix(det, 1.0 - det, baseZone);
  // the wisp channel only weighs in over the upper half of the column: skip its fetch below, and where the step
  // cannot resolve it (fade.z = 0) use its mean
  float wk = smoothstep(0.45, 1.0, hn);
  float er = det;
  if (wk > 0.0) {
    float wisp = fade.z > 0.001 ? 0.5 + (texture(uNoise3D, q * 5.0 + vec3(0.61, 0.29, 0.17)).b - 0.5) * fade.z : 0.5;
    er = mix(det, wisp, wk);
  }
  mott = mix(mott, n3.a, 0.5 * nearK);
  // remap (rather than subtract) so eroded edges keep a steep density gradient: crisp cauliflower lobes
  float k = 0.5 * (1.0 - er);
  d = (d - k) / (1.0 - k);
  // a slightly softer density ramp in the base zone: rags stay translucent instead of cutting to opaque
  return clamp(d * mix(2.0, 2.5, smoothstep(0.0, 0.15, hf)), 0.0, 1.0);
}

/** Optical depth toward the light. Three short steps (24, 48, 96 m) sample the noised density (lobes shadow their
 *  neighbours: the cauliflower relief), the first two on the sample's own macro texel (they move 72 m at most,
 *  one texel of the bake), three long steps sample only the smooth envelope (a long step through the noised field
 *  would switch on and off as it crosses lobes and terrace the shading), and the rest of the column above the
 *  sample is added analytically (the flat base of a tall tower is shadowed by the whole tower). Seven fetches. */
float lightOD(vec3 p, vec4 f0, vec3 L, float H, float hf) {
  float thick = uCloudTop - uCloudBase;
  float od = 0.0;
  float t = 0.0;
  float s = 24.0;
  float last = 0.0;
  float bottom = slabBottom();
  for (int i = 0; i < 6; i++) {
    vec3 q = p + L * (t + s * 0.5);
    if (q.y > uCloudTop + 1.0 || q.y < bottom) break;
    if (i < 2) last = densityBase(q, f0);
    else if (i == 2) last = densityBase(q, macroField(q.xz));
    else { float qhf, qhn, qH; last = meanDensity(envelope(q, macroField(q.xz), qhf, qhn, qH), qhn); }
    od += last * s;
    t += s;
    s *= 2.0;
  }
  float rem = max((H - hf) * thick / max(L.y, 0.25) - t, 0.0);
  od += min(rem, 1200.0) * last * 0.5;
  // shadowing uses a reduced extinction: multiple scattering carries light deeper than Beer-Lambert alone
  return od * SIGMA * 0.7;
}

// Henyey-Greenstein phase normalised so that isotropic = 1
float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }
// dual-lobe phase: forward lobe gives the silver lining near the sun, back lobe keeps bases readable
float phase2(float c, float k) { return mix(hgN(c, 0.74 * k), hgN(c, -0.2 * k), 0.42); }
// Beer-Lambert with a cheap multiple-scattering approximation: 3 octaves of attenuated extinction, each
// with a flatter phase (light that has scattered several times has lost its direction, so the forward
// peak toward a low sun lights the rims but not the shadowed cores). Cumulus: the shaded walls stay at
// ~20 % of the lit crown (od 4), the base of a 500 m tower (od 6-9 along the sun) at 7-13 %, the base of a
// tall tower (od 25) at ~0.5 % (ambient only). The old tail (0.20 e^-0.06 od) returned 14 % of the sun at od 6
// and lit every base to a pale sRGB ~205 marshmallow; a real fair-weather base sits at sRGB 110-160.
// Under a closed deck only the underside is ever seen, so the slow tail (what reaches it through the whole
// sheet) is what sets its brightness: a small, faster-decaying tail gives an overcast a mid-grey ceiling
// with dark thick cells and bright thin patches instead of a near-white sheet.
vec3 scatter(float od, float c) {
  float deck = smoothstep(0.45, 0.7, uCloudCoverage);
  float p1 = phase2(c, 1.0), p2 = phase2(c, 0.5), p3 = phase2(c, 0.2);
  vec3 cumulus = vec3(0.478 * exp(-od) * p1, 0.37 * exp(-0.3 * od) * p2, 0.152 * exp(-0.2 * od) * p3);
  vec3 sheet = vec3(0.44 * exp(-od) * p1, 0.36 * exp(-0.25 * od) * p2, 0.085 * exp(-0.09 * od) * p3);
  return mix(cumulus, sheet, deck);
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  // light: the sun, handing over to the moon once the sun is below the horizon
  float nightMix = smoothstep(0.02, -0.08, uSunDir.y);
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  vec3 L = normalize(mix(uSunDir, moonDir, nightMix));
  // the moon is a cool key of about one percent of the daylight one: a moonlit face sits 2-3x above the
  // blue-black zenith, the shaded faces (which is what the camera sees from below) stay darker than the sky,
  // so the clouds read as silhouettes against the stars with lit rims, not as daylight cumulus
  vec3 lightCol = mix(uSunColor * 2.9, vec3(0.7, 0.78, 0.95) * 0.028, nightMix);
  // uSunColor is the sun above the deck (the weather's sunDim only applies to what reaches the ground); the
  // closed deck's scattering tail was tuned against a 0.6 key, keep its underside at that grey
  lightCol *= mix(1.0, 0.6, smoothstep(0.45, 0.7, uCloudCoverage));

  float T = 1.0;
  vec3 col = vec3(0.0);
  float ro_y = uCamPos.y;
  float t0 = -1.0, t1 = -1.0;
  float bottom = slabBottom();
  float tb = (bottom - ro_y) / dir.y;
  float tt = (uCloudTop - ro_y) / dir.y;
  if (ro_y < bottom) { if (dir.y > 0.008) { t0 = tb; t1 = tt; } }
  else if (ro_y > uCloudTop) { if (dir.y < -0.008) { t0 = tt; t1 = tb; } }
  else { t0 = 0.0; t1 = dir.y > 0.0 ? tt : tb; }
  float meanDist = 0.0;
  if (t0 >= 0.0 && t0 < uMaxDist) {
    t1 = min(t1, uMaxDist);
    float pathLen = t1 - t0;
    // three step sizes: coarse through clear air, fine inside the envelope, and a surface step that
    // resolves the silhouette while the ray is still mostly transparent. The fine step grows with the
    // distance along the ray (pixel footprint): dtF = dtF0 * (1 + t / 6 km), with dtF0 set so the whole
    // crossing fits 80 % of the step budget (the rest assumes clear air is skipped at the coarse step).
    // A constant step sized for the crossing gave a camera inside the layer 270-360 m steps through the
    // cloud 50 m in front of it (a smeared fog) while the far band, already fading, got the same fine steps.
    float budget = uCloudSteps * 8.0;
    float dtF0 = 6000.0 * log((6000.0 + t1) / (6000.0 + t0)) / (budget * 0.8);
    float dtF = max(dtF0 * (1.0 + t0 / 6000.0), 36.0 + t0 * 0.003);
    float dtC = dtF * 3.0;
    float dtS = dtF * (1.0 / 3.0);
    float t = t0 + ign(gl_FragCoord.xy) * dtF;
    float thick = uCloudTop - uCloudBase;

    float cosSun = dot(dir, L);
    float forward = smoothstep(0.3, 0.95, cosSun);
    // low sun: the whole lower sky glows warm, so the bounce light on the undersides turns warm too
    float lowSun = (1.0 - smoothstep(0.04, 0.3, L.y)) * (1.0 - nightMix);
    // sky light on the tops: hemisphere average of the dome (deep blue) whitened by aerosol scatter; at a low
    // sun the dome is dim apart from the glow around the sun, so the shaded bodies drop below the lit rims
    vec3 skyAmb = mix(uZenithColor, uHazeColor, 0.5) * (0.95 - 0.25 * lowSun);
    // bounce light on the bases: the sunlit sea and land (warm and dim at sunset, when the glowing
    // horizon haze takes over); at night the city's light pollution lights the undersides over the lit
    // area (added per sample below: it falls off with the distance from the city)
    vec3 gndAmb = uGroundColor * 0.18 + uSunHazeColor * 0.32 * lowSun;
    float cityK = uCityGlow.w > 0.0 ? 1.4 : 0.0;
    // the ceiling thins out over the last part of the march so its far end dissolves column by column (the
    // thick cores last longest) instead of ending on one iso-distance line above the horizon
    float farFade0 = 0.6 * uMaxDist, farFadeK = 1.0 / (0.4 * uMaxDist);
    // a closed deck scatters far more light down through itself than a lone tower's base receives (multiple
    // scattering across the whole sheet): its underside floor is higher and its cells contrast more
    float deck = smoothstep(0.45, 0.7, uCloudCoverage);
    float aoFloor = mix(0.12, 0.2, deck);
    // the mottling noise is normalised (std 0.16, 2.5x the old raw amplitude): a narrower range keeps the same swing
    vec2 mottRange = mix(vec2(0.72, 1.2), vec2(0.5, 1.4), deck);

    int level = 0;          // 0 coarse, 1 fine, 2 surface
    int empty = 0;
    int sinceLight = 9;
    float lt = 1.0;
    float wsum = 0.0;
    // near-surface texture: a cloud a few hundred metres away is seen at a scale (30-150 m) no per-sample octave
    // the step budget can resolve; the mottle a real base shows there is the light through its thickness
    // variations, which is lighting, not geometry. One fetch per pixel at the first dense sample modulates the
    // ambient of the whole pixel (the visible base is a thin shell: 80 % of what the pixel shows lies within a
    // hundred metres of that point). Faded out beyond 2 km where the per-sample mottle takes over.
    float surfMod = 1.0;
    bool surfDone = false;
    const vec3 ONE3 = vec3(1.0);
    for (int i = 0; i < 200; i++) {
      if (float(i) >= budget || t > t1 || T < 0.01) break;
      dtF = max(dtF0 * (1.0 + t / 6000.0), 36.0 + t * 0.003);
      dtC = dtF * 3.0;
      dtS = dtF * (1.0 / 3.0);
      vec3 p = uCamPos + dir * t;
      vec4 f = macroField(p.xz);
      // cheap rejection on the envelope before any noise fetch: outside the footprint, above the column or
      // below this column's base (relief included: it is in the macro fetch)
      float baseAlt = baseAltitude(f);
      float hf0 = (p.y - baseAlt) / thick;
      float covTest = f.x - cloudThreshold();
      float hf, hn, H;
      float e = 0.0;
      if (covTest > 0.0 && hf0 < 1.0 && hf0 > 0.0) {
        e = envelope(p, f, hf, hn, H);
        e *= 1.0 - smoothstep(0.0, 1.0, (t - farFade0) * farFadeK);
      }
      if (e <= 0.004) {
        // clear air: fall back to coarse steps after a couple of empty samples
        if (level > 0) { empty++; if (empty > 2) level = 0; }
        t += level == 0 ? dtC : (level == 1 ? dtF : dtS);
        continue;
      }
      if (level == 0) {
        // entered the envelope during a coarse step: back up and resample finely
        level = 1;
        t = max(t + dtF - dtC, t0);
        continue;
      }
      float dt = level == 2 ? dtS : dtF;
      // deep inside (T < 0.3) the remaining samples weigh little: lengthen the step up to 2x
      dt *= 1.0 + max(0.3 - T, 0.0) * (1.0 / 0.3);
      vec3 fade = stepFade(dt);
      vec3 q = noiseCoord(p, f);
      vec4 n = fadeNoise(texture(uNoise3D, q), fade.x);
      float mott;
      float nearK = 1.0 - smoothstep(1500.0, 4000.0, t);
      float dens = densityFull(q, n, e, hf, hn, fade, nearK, mott);
      if (dens <= 0.003) {
        empty++;
        if (level == 2 && empty > 1) level = 1;
        t += level == 1 ? dtF : dtS;
        continue;
      }
      // re-entering cloud after a gap always recomputes the light march: a ray that left a lit fringe and entered
      // a dark base with the fringe's value speckled the silhouette
      if (empty > 0) sinceLight = 9;
      empty = 0;
      // the surface steps resolve the silhouette while the ray is still mostly transparent; a cloud within a few
      // hundred metres of the camera is seen at a scale where the fine step's texture is a blur, so its surface
      // pass runs somewhat deeper (the per-pixel surface texture below carries the finer scales)
      float surfT = mix(0.3, 0.4, smoothstep(400.0, 2500.0, t));
      if (level == 1 && T > surfT) {
        // first density after a fine step: back up and resolve the surface with the small step
        level = 2;
        t = max(t + dtS - dtF, t0);
        continue;
      }
      if (!surfDone) {
        surfDone = true;
        float nearS = 1.0 - smoothstep(700.0, 2200.0, t);
        if (nearS > 0.0) {
          // sampled on the smooth base surface when the ray comes up through it (the per-pixel step jitter moved
          // the first dense sample by up to a fine step, which decorrelated neighbouring pixels into a stipple);
          // elsewhere the first dense sample itself
          vec3 ps = p;
          if (dir.y > 0.15 && uCamPos.y < baseAlt) ps = uCamPos + dir * ((baseAlt - uCamPos.y) / dir.y);
          ps += vec3(uCloudWind.x, 0.0, uCloudWind.y);
          // perlin fbm at a 900 m tile (periods 225/112/56 m) plus a 300 m tile (75/37/19 m) within 700 m: the
          // light through the base's thickness variations, which is what a near base shows as texture
          float sm = (texture(uNoise3D, ps * (1.0 / 900.0) + 0.37).a - 0.5) * 1.6;
          float near2 = 1.0 - smoothstep(300.0, 700.0, t);
          if (near2 > 0.0) sm += (texture(uNoise3D, ps * (1.0 / 300.0) + 0.61).a - 0.5) * 0.9 * near2;
          surfMod = 1.0 + sm * nearS;
        }
      }
      // the light march varies slowly along the ray: reuse it for the next 1-2 samples (3-4 once the ray is
      // deep inside, where the samples weigh little)
      int reuse = (level == 2 ? 2 : 1) + (T < 0.5 ? 1 : 0) + (T < 0.2 ? 1 : 0);
      if (sinceLight >= reuse) {
        lt = dot(scatter(lightOD(p, f, L, H, hf), cosSun), ONE3);
        sinceLight = 0;
      } else sinceLight++;
      float powder = 1.0 - exp(-dens * 5.0);
      float sunTerm = lt * mix(mix(0.7, 1.0, powder), 1.0, forward);
      // ambient: sky from above, sea/haze bounce from below, occluded by the column of cloud overhead
      // (the crown is open to the sky, the flat base of a tall tower sees almost none of it; thin cells
      // stay bright underneath). The overhead thickness is modulated by the low-frequency shape noise so
      // the bases read as mottled (hollows between the lobes let more light through), not an even grey.
      float above = max(H - hf, 0.0) * thick * mix(1.3, 0.6, mott);
      float below = max(hf, 0.0) * thick * mix(1.3, 0.6, mott);
      // walls: a sample near the outer surface (envelope well below 1) sees half the sky sideways
      float side = (1.0 - 0.7 * e) * smoothstep(0.0, 0.3, hn) * 0.6;
      float aoSky = max(mix(aoFloor, 1.0, exp(-above * 0.0022)), side);
      float aoGnd = max(mix(0.15, 1.0, exp(-below * 0.003)), side);
      // base relief shading: where the base hangs lower (a sagging pouch, a cell that condenses lower) the cloud is
      // thicker and its underside darker; the hollows between pouches and the cells with a high base are thin
      // and let more of the sky through (the only cue the ambient can give for the relief; the sun is above)
      float relief = clamp((baseAlt - uCloudBase) * (1.0 / 150.0), -1.0, 1.0) * (1.0 - smoothstep(0.05, 0.2, hf));
      aoGnd *= 1.0 + 0.3 * relief;
      aoSky *= 1.0 + 0.25 * relief;
      vec3 gnd = gndAmb;
      if (cityK > 0.0) gnd += CITY_GLOW_COLOR * (cityK * cityGlowAt(p.xz));
      vec3 amb = (skyAmb * aoSky + gnd * aoGnd) * (mix(mottRange.x, mottRange.y, mott) * surfMod);
      // the surface texture also modulates the light that reaches a shadowed base through the cloud (multiple
      // scattering through a varying thickness; that floor, not the ambient, is most of a base's radiance);
      // lit rims and crowns keep their shading
      vec3 S = lightCol * (sunTerm * mix(1.0, surfMod, smoothstep(0.3, 0.1, lt))) + amb;
      float a = 1.0 - exp(-dens * SIGMA * dt);
      col += T * a * S;
      meanDist += T * a * t;
      wsum += T * a;
      T *= 1.0 - a;
      if (level == 2 && T < surfT) level = 1;
      t += dt;
    }
    if (wsum > 0.0) meanDist /= wsum; else meanDist = t0;
  }

  float alpha = 1.0 - T;
  if (alpha > 0.0005) {
    vec3 c = col / alpha;
    vec3 far = uCamPos + dir * meanDist;
    c = applyAerial(c, uCamPos, far);
    // distant clouds sink into the horizon haze (long low-angle paths through humid air); the aerial
    // perspective above already carries them to the haze colour and the march thins the envelope over its
    // second half, this only removes what is left at uMaxDist
    float fade = exp(-meanDist * 0.7e-5) * (1.0 - smoothstep(0.8 * uMaxDist, uMaxDist, meanDist));
    alpha *= fade;
    col = c * alpha;
  } else {
    alpha = 0.0;
    col = vec3(0.0);
  }

  // ---- thin high veil (cirrus) behind the cumulus: a 2D layer at 9 km in the fair-weather presets so the sky
  // above the cumulus is not an empty gradient. Cirrus fibratus in bands: patches 20-50 km long along the wind
  // with clear sky between them (the mask is two incommensurate perlin tiles, 48x16 and 17x6 km, thresholded so
  // about 40 % of the layer is fibrous), the fibres are stretched mid-perlin streaks (24x2.8 km and 9x1 km tiles)
  // whose cross-wind coordinate is bent by a 200 km field (arcs of tens of km, no wiggle: a bend field with
  // features shorter than the streaks made them zigzag), a faint cirrostratus haze around the bands, and the
  // layer drifts faster than the cumulus (jet-level wind). Round 7's version put an even comb of straight
  // fibres over the whole upper sky (the mask summed into the fibre threshold and hardly varied within a frame).
  float cirrusAmount = 1.0 - smoothstep(0.35, 0.55, uCloudCoverage);
  if (cirrusAmount > 0.0 && dir.y > 0.015 && uCamPos.y < 8500.0 && alpha < 0.999) {
    float tc = (9000.0 - uCamPos.y) / dir.y;
    vec2 cp = uCamPos.xz + dir.xz * tc + uCloudWind * 2.5;
    const vec2 wd = vec2(0.9439, 0.3303);                 // Atmosphere.windDir
    vec2 fc = vec2(dot(cp, wd), dot(cp, vec2(-wd.y, wd.x)));
    float ma = texture(uNoise3D, vec3(fc.x / 48000.0, 0.13, fc.y / 16000.0)).a;
    float mb = texture(uNoise3D, vec3(fc.x / 17000.0 + 0.37, 0.71, fc.y / 6000.0)).a;
    float m = ma + (mb - 0.5) * 0.6;
    float patch = smoothstep(0.44, 0.66, m);
    float haze = 0.12 * smoothstep(0.32, 0.66, m) * (1.0 - 0.5 * patch);
    float veil = haze;
    if (patch > 0.002) {
      // the fibre octaves fade with distance: the fine one is a few pixels wide beyond 25 km, the coarse one
      // beyond 60 km (the band is then a haze streak)
      float lod1 = smoothstep(20000.0, 60000.0, tc);
      float lod2 = smoothstep(8000.0, 25000.0, tc);
      float bend = texture(uNoise3D, vec3(fc.x / 200000.0 + 0.3, 0.55, fc.y / 200000.0)).b;
      float fy = fc.y + (bend - 0.5) * 10000.0;
      float b1 = texture(uNoise3D, vec3(fc.x / 24000.0 + 0.5, 0.67, fy / 2800.0)).b;
      float b2 = texture(uNoise3D, vec3(fc.x / 9000.0 + 0.2, 0.41, fy / 1000.0)).b;
      float streak = smoothstep(0.44, 0.70, b1 + (b2 - 0.5) * 0.7 * (1.0 - lod2));
      streak = mix(streak, 0.45, lod1);
      // the band core is denser (heads), its fringe thins to single strands
      veil += patch * streak * (0.5 + 0.5 * patch);
    }
    // optically thin (od ~0.1-0.4): ice crystals scatter strongly forward (bright near the sun) plus a diffuse
    // share. Hazed with the physical optical depth to 9 km only: applyAerial's far-plane dissolve (33-57 km,
    // there to hide the terrain far plane) would erase a veil that sits at 30-90 km for any elevation under 17 deg
    float ac = veil * 0.32 * cirrusAmount * smoothstep(0.015, 0.1, dir.y);
    if (ac > 0.001) {
      float cosSun = dot(dir, L);
      vec3 skyAmbC = mix(uZenithColor, uHazeColor, 0.5);
      vec3 cCol = lightCol * (0.07 + 0.09 * min(hgN(cosSun, 0.75), 6.0)) + skyAmbC * 0.6;
      float ext = exp(-opticalDepth(uCamPos.y, 9000.0, tc));
      cCol = cCol * ext + skyRadiance(dir) * (1.0 - ext);
      col += (1.0 - alpha) * ac * cCol;
      alpha += (1.0 - alpha) * ac;
    }
  }
  gl_FragColor = vec4(col, 1.0 - alpha);
}
`;

const QUAD_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Full-resolution sky dome: analytic sky + sun/moon/stars, composited with the upsampled cloud layer. */
const DOME_VERT = /* glsl */ `
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`;
const DOME_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_SKY}
${GLSL_SKY_EXTRAS}
uniform sampler2D uCloudTex;
uniform vec2 uCloudTexel;
uniform vec2 uResolution;
uniform mat4 uInvProj;
uniform mat4 uInvView;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);
  // tent-filtered upsample of the reduced-resolution cloud layer (4 bilinear taps half a texel out = a full
  // 3x3 tent; a tighter offset left the layer's texel blocks visible at the edges of the blue gaps)
  vec2 o = uCloudTexel * 0.5;
  vec4 c = texture(uCloudTex, uv + vec2(-o.x, -o.y)) + texture(uCloudTex, uv + vec2(o.x, -o.y))
         + texture(uCloudTex, uv + vec2(-o.x, o.y)) + texture(uCloudTex, uv + vec2(o.x, o.y));
  c *= 0.25;
  vec3 sky = skyBackground(dir, smoothstep(0.6, 0.97, c.a));
  gl_FragColor = vec4(sky * c.a + c.rgb, 1.0);
}
`;

/** Environment-probe version: analytic sky only (used for IBL / reflections), rendered on a dome. */
const ENV_VERT = /* glsl */ `
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ENV_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
uniform vec3 uGroundColor;
in vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyRadiance(dir);
  float up = max(dir.y, 0.0);
  // The dome is a saturated stylised gradient; the light a surface actually receives from a clear sky is
  // whitened by aerosol scattering and by sunlight bounced off the ground, so the probe blends toward a
  // neutral haze/ground mix (strongest low in the sky, absent at the zenith). Keeps white surfaces white
  // and shadows cool rather than blue without touching the visible sky.
  vec3 fill = mix(uHazeColor, uGroundColor, 0.25);
  col = mix(col, fill, 0.65 * pow(1.0 - up, 0.3));
  // clouds as a soft neutral brightening band so reflections and the IBL pick up overcast (grey, not blue)
  // light; a closed deck is most of the sky, so the diffuse light under it is its grey underside, which is
  // brighter than the dimmed horizon under it (the whole sheet scatters the sun down) and covers the dome
  float deck = smoothstep(0.45, 0.75, uCloudCoverage);
  float cov = smoothstep(0.2, 0.95, uCloudCoverage) * 0.7 + deck * 0.25;
  vec3 cloudCol = vec3(dot(uHorizonColor, vec3(0.2126, 0.7152, 0.0722))) * mix(1.15, 1.9, deck);
  col = mix(col, cloudCol, cov * smoothstep(0.0, 0.3, dir.y));
  vec3 sun = sunDisc(dir);
  col += min(sun, vec3(12.0));
  // sunlit ground below the horizon: bounce light for walls, hulls and undersides
  col = mix(col, uGroundColor, smoothstep(0.02, -0.06, dir.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  readonly dome: THREE.Mesh;
  private readonly cloudMat: THREE.ShaderMaterial;
  private readonly covMat: THREE.ShaderMaterial;
  private readonly domeMat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private cloudRT: THREE.WebGLRenderTarget;
  private readonly covRT: THREE.WebGLRenderTarget;
  private covBaked = false;
  private readonly covCenter = new THREE.Vector2();
  private scale: number;
  private readonly envScene = new THREE.Scene();
  private readonly envMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  envMap: THREE.Texture | null = null;
  private readonly noise: THREE.Data3DTexture;

  constructor(private atmos: Atmosphere, renderer: THREE.WebGLRenderer, opts: { cloudSteps: number; scale: number }) {
    this.noise = createCloudNoiseTexture(64);
    this.scale = opts.scale;
    // half float: the column height is derived from the raw field, 8-bit steps would terrace the tops
    this.covRT = new THREE.WebGLRenderTarget(COV_SIZE, COV_SIZE, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, generateMipmaps: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
    });
    this.covMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COV_FRAG,
      uniforms: { ...atmos.uniforms, uCovCenter: { value: this.covCenter }, uCovExtent: { value: COV_EXTENT } },
      depthTest: false,
      depthWrite: false,
    });
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: {
        ...atmos.uniforms,
        uNoise3D: { value: this.noise },
        uCovTex: { value: this.covRT.texture },
        uCovCenter: { value: this.covCenter },
        uCovExtent: { value: COV_EXTENT },
        uCamPos: { value: new THREE.Vector3() },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
        uCloudSteps: { value: opts.cloudSteps },
        uMaxDist: { value: CLOUD_MAX_DIST },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.cloudMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.cloudRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

    this.domeMat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: {
        ...atmos.uniforms,
        uCloudTex: { value: this.cloudRT.texture },
        uCloudTexel: { value: new THREE.Vector2(0.25, 0.25) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), this.domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1000;
    (this.dome as unknown as { isSky: boolean }).isSky = true;

    this.envMat = new THREE.ShaderMaterial({
      vertexShader: ENV_VERT,
      fragmentShader: ENV_FRAG,
      uniforms: { ...atmos.uniforms },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.envMat);
    this.envScene.add(envDome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
  }

  setCloudSteps(n: number): void {
    this.cloudMat.uniforms.uCloudSteps.value = n;
  }

  /** Re-render the environment map (IBL for every PBR material). Cheap enough to call every few frames. */
  updateEnvironment(): THREE.Texture {
    // dispose the whole previous render target (disposing only its texture leaked the framebuffer/renderbuffer)
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem!.fromScene(this.envScene, 0, 0.1, 200);
    this.envMap = this.envRT.texture;
    return this.envMap;
  }

  /** The city's light pollution as seen from this camera (shared uniform: dome, probe, haze and water all read it):
   *  direction to the lit core, the angular width of the lit horizon (the whole horizon over the city) and the
   *  horizon glow radiance, which falls off with the distance from the lit area. */
  private updateCityGlow(camera: THREE.PerspectiveCamera): void {
    const g = this.atmos.uniforms.uCityGlow.value as THREE.Vector4;
    const v = this.atmos.uniforms.uCityGlowView.value as THREE.Vector4;
    const dx = g.x - camera.position.x, dz = g.y - camera.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 1) v.set(dx / d, dz / d, 0, 0); else v.set(0, -1, 0, 0);
    const r = g.z / Math.max(d, 1);
    v.z = Math.min(1.4, Math.max(0.1, r * 0.6));
    v.w = g.w * Math.min(1, Math.pow(r, 0.8) * 1.2);
  }

  /** Bake the macro coverage field around the camera's cloud-space position when it has drifted too far. */
  private updateCoverage(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const wind = this.atmos.uniforms.uCloudWind.value as THREE.Vector2;
    const cx = camera.position.x + wind.x, cz = camera.position.z + wind.y;
    if (this.covBaked && Math.hypot(cx - this.covCenter.x, cz - this.covCenter.y) < COV_REBAKE_DIST) return;
    this.covCenter.set(cx, cz);
    this.covBaked = true;
    this.quad.material = this.covMat;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.covRT);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prev);
    this.quad.material = this.cloudMat;
  }

  /** Render the cloud layer into the offscreen buffer for this camera; the dome composites it at full resolution. */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, width: number, height: number): void {
    const w = Math.max(2, Math.round(width * this.scale)), h = Math.max(2, Math.round(height * this.scale));
    if (this.cloudRT.width !== w || this.cloudRT.height !== h) this.cloudRT.setSize(w, h);
    this.updateCityGlow(camera);
    this.updateCoverage(renderer, camera);
    const u = this.cloudMat.uniforms;
    u.uCamPos.value.copy(camera.position);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uInvView.value.copy(camera.matrixWorld);
    const d = this.domeMat.uniforms;
    d.uResolution.value.set(width, height);
    d.uCloudTexel.value.set(1 / w, 1 / h);
    d.uInvProj.value.copy(camera.projectionMatrixInverse);
    d.uInvView.value.copy(camera.matrixWorld);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.cloudRT);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prev);
    // keep the dome centred on the camera, far enough to sit behind everything
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
  }
}
