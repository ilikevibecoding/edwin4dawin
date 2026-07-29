import type { MaterialSpec } from './types';

/**
 * Ground planes.
 *
 * These are always seen at a grazing angle, across a large area and under a
 * moving camera, which changes what matters: the macro band has to be strong
 * enough to break up the repeat over tens of metres, the roughness has to hold
 * wet/dry and polished/loose contrast, and the height field has to be shallow
 * enough that the derived normals do not shimmer at distance.
 */

const GROUND_GLSL = /* glsl */ `
/**
 * Packed stone field. Returns (height, stoneId, coverage) where height is a
 * hemispherical cap rather than a cone, so the derived normals curve like real
 * water-worn stone instead of faceting.
 */
vec3 pebbles(vec2 uv, float cells, float radius, float jitter) {
  vec3 w = worley2(uv * cells, vec2(cells), jitter);
  float d = w.x / max(radius, 1e-4);
  float dome = sqrt(max(0.0, 1.0 - d * d));
  float coverage = 1.0 - smoothstep(0.86, 1.0, d);
  return vec3(dome * coverage, w.z, coverage);
}

/** Wind ripples: an asymmetric sawtooth with a wandering crest line. */
float ripples(vec2 uv, float count, float bend, float asymmetry) {
  float phase = uv.x * count + fbm2(uv * vec2(2.0, 4.0), vec2(2.0, 4.0), 3) * bend;
  float f = fract(phase);
  float lee = smoothstep(0.0, asymmetry, f);
  float stoss = 1.0 - smoothstep(asymmetry, 1.0, f);
  return min(lee, stoss);
}

/** Shrinkage crack network from a Voronoi border distance. */
float mudCracks(vec2 uv, float cells, float width, float warpAmount) {
  vec4 v = voronoi2(warp2(uv * cells, vec2(cells), warpAmount, 3), vec2(cells), 1.0);
  return 1.0 - smoothstep(width * 0.35, width, v.z);
}
`;

const ASPHALT = /* glsl */ `
${GROUND_GLSL}
const vec3 BITUMEN = vec3(0.186, 0.184, 0.188);
const vec3 BITUMEN_GREY = vec3(0.298, 0.296, 0.292);
const vec3 STONE_PALE = vec3(0.508, 0.500, 0.482);
const vec3 STONE_DARK = vec3(0.272, 0.264, 0.256);
const vec3 STONE_WARM = vec3(0.424, 0.382, 0.330);

void surface(vec2 uv, inout Surface s) {
  // Hot-rolled asphalt. The read is entirely about exposed aggregate: a dense
  // graded stone skeleton sitting in a bitumen matrix, the matrix worn away
  // between the wheel paths and polished smooth inside them.
  vec3 coarse = pebbles(uv, 34.0, 0.46, 1.0);
  vec3 mid = pebbles(uv + 3.1, 68.0, 0.44, 1.0);
  vec3 fines = grainWorley(uv + 7.9, 170.0, 1.0);
  float fine = 1.0 - smoothstep(0.06, 0.40, fines.x);

  float macro = fbm2(uv * 3.0, vec2(3.0), 4) * 0.5 + 0.5;
  float bleach = patchiness(uv + 11.0, 3.0, 3);
  float raveling = smoothstep(0.52, 0.86, fbm2(uv * 5.0 - 4.0, vec2(5.0), 4) * 0.5 + 0.5);
  float grain = grainNoise(uv, 200.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Wheel paths run along v: two polished bands where the binder has bled up.
  float lane = max(band(uv.x, 0.28, 0.15), band(uv.x, 0.72, 0.15));
  float polish = smoothstep(0.25, 0.95, lane) * (0.55 + 0.45 * macro);

  // Cracking: a wide thermal crack plus fine alligatoring in the worn zones.
  float thermal = smoothstep(0.90, 0.99, ridged2(warp2(uv * 3.0, vec2(3.0), 0.6, 3), vec2(3.0), 5, 0.55, 3.0));
  float alligator = mudCracks(uv, 9.0, 0.055, 0.35) * raveling * 0.7;
  float crack = sat(thermal + alligator);

  float aggregate = sat(coarse.x * 0.62 + mid.x * 0.30 + fine * 0.18);
  // Even a sound surface has its top film of binder worn off, so the stone is
  // never fully buried; without a floor here the whole road reads as black felt.
  float exposure = sat(0.40 + raveling * 0.60 + (1.0 - polish) * 0.28);
  float relief = aggregate * exposure;

  float oil = smoothstep(0.68, 0.96, turbulence2(uv * 4.0 + 23.0, vec2(4.0), 4)) * (0.3 + polish * 0.6);
  float dust = cavityDirt(1.0 - relief * 0.7, grain, 0.5) * (1.0 - polish * 0.6);

  float height = 0.58
    + relief * 0.22
    + (grain - 0.5) * 0.10
    + (micro - 0.5) * 0.04
    + (macro - 0.5) * 0.05
    - exposure * 0.06
    - crack * 0.42
    - polish * 0.03;

  vec3 stone = mix(STONE_DARK, STONE_PALE, sat(coarse.y * 1.4));
  stone = mix(stone, STONE_WARM, sat((coarse.y - 0.55) * 2.0));
  vec3 albedo = mix(BITUMEN, BITUMEN_GREY, bleach * 0.7 + macro * 0.3);
  albedo = mix(albedo, stone, sat(coarse.x * exposure * 1.45));
  albedo = mix(albedo, mix(STONE_DARK, STONE_PALE, mid.y), sat(mid.x * exposure * 0.95));
  albedo = mix(albedo, STONE_PALE * 0.9, fine * exposure * 0.30);
  albedo = tintShift(albedo, (macro - 0.5) * 0.02, 0.85, 1.0);
  albedo *= 0.90 + 0.18 * grain;
  albedo = mix(albedo, BITUMEN * 0.86, polish * 0.40);
  albedo = mix(albedo, vec3(0.104, 0.100, 0.098), oil * 0.45);
  albedo = mix(albedo, vec3(0.088, 0.086, 0.084), crack * 0.75);
  albedo = mix(albedo, vec3(0.352, 0.340, 0.320), dust * 0.30);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.94;
  rough -= polish * 0.34;
  rough -= oil * 0.22;
  rough += exposure * 0.03;
  rough += dust * 0.04;
  rough += (grain - 0.5) * 0.10;
  rough -= coarse.x * exposure * 0.10;

  float ao = 1.0
    - (1.0 - aggregate) * 0.16 * exposure
    - crack * 0.55
    - dust * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const ASPHALT_WORN = /* glsl */ `
${GROUND_GLSL}
const vec3 BITUMEN = vec3(0.176, 0.172, 0.172);
const vec3 PATCH = vec3(0.130, 0.128, 0.132);
const vec3 BASE_COURSE = vec3(0.412, 0.372, 0.318);
const vec3 STONE_PALE = vec3(0.492, 0.482, 0.462);
const vec3 STONE_DARK = vec3(0.268, 0.258, 0.248);
const vec3 LINE_PAINT = vec3(0.720, 0.688, 0.560);

void surface(vec2 uv, inout Surface s) {
  // Failed carriageway: alligator cracking has gone all the way through, the
  // fines have washed out of the potholes to leave the base course showing, and
  // a cold-lay patch has been dropped over part of it.
  // Edge distance is in cell units, so at 9 cells across a 3 m tile the 0.024
  // cut-off is a ~1 cm crack. Anything wider stops reading as cracking and
  // starts reading as dried mud.
  vec4 blocks = voronoi2(warp2(uv * 9.0, vec2(9.0), 0.45, 3), vec2(9.0), 1.0);
  float crackNet = 1.0 - smoothstep(0.008, 0.024, blocks.z);
  float crackHalo = 1.0 - smoothstep(0.02, 0.07, blocks.z);
  float blockTilt = (hash11(blocks.x + 0.4) - 0.5);

  float potField = fbm2(warp2(uv * 3.0, vec2(3.0), 0.7, 4), vec2(3.0), 5) * 0.5 + 0.5;
  float pothole = smoothstep(0.62, 0.82, potField);
  float potholeDeep = smoothstep(0.74, 0.94, potField);
  float rim = band(potField, 0.64, 0.05);

  vec3 coarse = pebbles(uv, 30.0, 0.46, 1.0);
  vec3 base = pebbles(uv + 5.5, 18.0, 0.48, 1.0);
  float fine = 1.0 - smoothstep(0.06, 0.40, grainWorley(uv + 2.2, 150.0, 1.0).x);

  float macro = fbm2(uv * 2.0, vec2(2.0), 4) * 0.5 + 0.5;
  float grain = grainNoise(uv, 190.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Repair patch: a hard-edged blob of newer, blacker, coarser material.
  float patchMask = smoothstep(0.54, 0.60, fbm2(warp2(uv * 3.0 + 13.0, vec2(3.0), 0.5, 3), vec2(3.0), 4) * 0.5 + 0.5);

  // Remnant of a road marking, worn back to a ghost.
  float lineBand = smoothBand(uv.x, 0.455, 0.545, 0.008);
  float lineDash = step(0.35, fract(uv.y * 3.0));
  float paint = lineBand * lineDash * (1.0 - pothole) *
    smoothstep(0.30, 0.80, fbm2(uv * 12.0 - 6.0, vec2(12.0), 3) * 0.5 + 0.5);

  float exposure = sat(0.45 + crackHalo * 0.4 + pothole * 0.8 - patchMask * 0.3);
  float aggregate = sat(coarse.x * 0.6 + fine * 0.25);
  float relief = aggregate * exposure;
  float baseShow = potholeDeep * base.x;

  float dust = cavityDirt(1.0 - pothole, grain, 0.8);
  float damp = smoothstep(0.60, 0.92, fbm2(uv * 4.0 - 17.0, vec2(4.0), 4) * 0.5 + 0.5) * (0.4 + pothole);
  float oil = smoothstep(0.68, 0.96, turbulence2(uv * 5.0 + 9.0, vec2(5.0), 4));

  float height = 0.62
    + relief * 0.18
    + (grain - 0.5) * 0.10
    + (micro - 0.5) * 0.04
    + blockTilt * 0.04 * crackHalo
    + rim * 0.05
    + patchMask * 0.04
    + baseShow * 0.16
    - crackNet * 0.30
    - crackHalo * 0.04
    - pothole * 0.26
    - potholeDeep * 0.22;

  vec3 stone = mix(STONE_DARK, STONE_PALE, sat(coarse.y * 1.5));
  vec3 albedo = mix(BITUMEN, BITUMEN * 1.18, macro);
  albedo = mix(albedo, PATCH, patchMask * 0.85);
  albedo = mix(albedo, stone, sat(coarse.x * exposure * 1.2));
  albedo = mix(albedo, BASE_COURSE, baseShow * 0.8);
  albedo = mix(albedo, mix(BASE_COURSE, STONE_PALE, base.y), baseShow * 0.35);
  albedo = tintShift(albedo, (macro - 0.5) * 0.02, 0.85, 1.0);
  albedo *= 0.90 + 0.18 * grain;
  albedo = mix(albedo, LINE_PAINT, paint * 0.72);
  albedo = mix(albedo, vec3(0.086, 0.084, 0.082), sat(crackNet * 0.72 + oil * 0.35));
  albedo = mix(albedo, vec3(0.386, 0.368, 0.340), dust * 0.32);
  albedo = mix(albedo, albedo * 0.62, damp * 0.35);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.95;
  rough -= damp * 0.30;
  rough -= oil * 0.24;
  rough -= paint * 0.16;
  rough += dust * 0.04;
  rough += (grain - 0.5) * 0.10;
  rough -= patchMask * 0.06;

  float ao = 1.0
    - crackNet * 0.50
    - crackHalo * 0.10
    - pothole * 0.22
    - potholeDeep * 0.25
    - dust * 0.10
    - (1.0 - aggregate) * 0.10 * exposure;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const GRAVEL = /* glsl */ `
${GROUND_GLSL}
const vec3 STONE_GREY = vec3(0.478, 0.472, 0.458);
const vec3 STONE_PALE = vec3(0.610, 0.596, 0.566);
const vec3 STONE_WARM = vec3(0.512, 0.446, 0.362);
const vec3 STONE_DARK = vec3(0.276, 0.268, 0.258);
const vec3 FINES = vec3(0.360, 0.330, 0.284);

void surface(vec2 uv, inout Surface s) {
  // Graded hardcore. Three stone sizes stacked so the smaller grades sit in the
  // interstices of the larger, with the fines packed underneath — that nesting
  // is what stops it looking like a single layer of identical beads.
  vec3 big = pebbles(uv, 15.0, 0.50, 1.0);
  vec3 medium = pebbles(uv + 4.7, 30.0, 0.48, 1.0);
  vec3 small = pebbles(uv + 9.3, 62.0, 0.46, 1.0);
  float grit = 1.0 - smoothstep(0.05, 0.40, grainWorley(uv + 1.7, 180.0, 1.0).x);

  float macro = fbm2(uv * 2.0, vec2(2.0), 4) * 0.5 + 0.5;
  float grain = grainNoise(uv, 210.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Larger stones win, smaller ones only fill the gaps they leave.
  float bigMask = big.z;
  float medMask = medium.z * (1.0 - bigMask);
  float smallMask = small.z * (1.0 - bigMask) * (1.0 - medMask);
  float fill = 1.0 - sat(bigMask + medMask + smallMask);

  float stack = big.x * 0.52 * bigMask
    + medium.x * 0.30 * medMask
    + small.x * 0.20 * smallMask
    + grit * 0.05 * fill;
  float surfaceH = stack + (macro - 0.5) * 0.10;

  // Stone faces are smoother than the dust between them; each stone gets its
  // own lithology so the field reads as graded rather than tinted noise.
  float id = big.y * bigMask + medium.y * medMask + small.y * smallMask;
  float polish = sat(hash11(id + 0.13));
  float wet = smoothstep(0.55, 0.90, fbm2(uv * 3.0 - 8.0, vec2(3.0), 3) * 0.5 + 0.5);
  float dust = sat(fill * 0.9 + cavityDirt(stack * 1.4, grain, 0.7));

  float height = 0.34
    + surfaceH * 0.62
    + (grain - 0.5) * 0.10
    + (micro - 0.5) * 0.04;

  vec3 stone = mix(STONE_GREY, STONE_PALE, sat(id * 1.6));
  stone = mix(stone, STONE_WARM, sat((id - 0.5) * 2.0));
  stone = mix(stone, STONE_DARK, step(0.88, id) * 0.8);
  stone = tintShift(stone, (id - 0.5) * 0.05, 0.85 + polish * 0.4, 0.88 + 0.24 * polish);

  vec3 albedo = mix(FINES, stone, sat(bigMask + medMask + smallMask));
  albedo *= 0.86 + 0.26 * mix(grain, stack, 0.4);
  albedo = mix(albedo, FINES * 1.12, dust * 0.35);
  albedo = mix(albedo, albedo * 0.66, wet * 0.30);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.92;
  rough -= polish * 0.22 * sat(bigMask + medMask);
  rough -= wet * 0.26;
  rough += dust * 0.05;
  rough += (grain - 0.5) * 0.10;

  float ao = 1.0 - (1.0 - stack * 1.6) * 0.34 - fill * 0.20 - dust * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const SAND_GROUND = /* glsl */ `
${GROUND_GLSL}
const vec3 SAND_LIT = vec3(0.760, 0.680, 0.524);
const vec3 SAND_MID = vec3(0.652, 0.566, 0.418);
const vec3 SAND_SHADE = vec3(0.492, 0.416, 0.300);
const vec3 SAND_DAMP = vec3(0.366, 0.306, 0.222);

void surface(vec2 uv, inout Surface s) {
  // Wind-worked sand. The signature is the ripple train: asymmetric crests with
  // the coarse grains sorted onto the tops and the fines in the troughs, plus a
  // dune-scale swell underneath so the tile does not read as corduroy.
  float swell = fbm2(uv * 2.0, vec2(2.0), 4) * 0.5 + 0.5;
  float ripple = ripples(uv, 26.0, 1.6, 0.62);
  float rippleFine = ripples(uv * vec2(1.0, 1.0) + 4.4, 54.0, 1.1, 0.55);
  float crest = smoothstep(0.55, 0.95, ripple);

  vec3 coarse = grainWorley(uv, 200.0, 1.0);
  float grains = 1.0 - smoothstep(0.06, 0.40, coarse.x);
  float sparkle = step(0.92, coarse.z) * grains;
  float grain = grainNoise(uv, 240.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Scattered gravel and shell fragments left behind as the sand blows off.
  vec3 lag = pebbles(uv + 12.1, 26.0, 0.34, 1.0);
  float pebble = lag.x * step(0.80, hash11(lag.y + 0.29));

  // A few footprint-scale depressions and drift shadows.
  float scoop = smoothstep(0.62, 0.92, fbm2(warp2(uv * 4.0 - 6.0, vec2(4.0), 0.5, 3), vec2(4.0), 4) * 0.5 + 0.5);
  float damp = smoothstep(0.58, 0.95, fbm2(uv * 2.0 + 19.0, vec2(2.0), 4) * 0.5 + 0.5);

  float height = 0.48
    + (swell - 0.5) * 0.24
    + ripple * 0.20
    + rippleFine * 0.08
    + (grain - 0.5) * 0.08
    + (micro - 0.5) * 0.03
    + grains * 0.04
    + pebble * 0.14
    - scoop * 0.16;

  vec3 albedo = mix(SAND_MID, SAND_LIT, sat(crest * 0.7 + swell * 0.5));
  albedo = mix(albedo, SAND_SHADE, sat((1.0 - ripple) * 0.55 + scoop * 0.4));
  albedo = tintShift(albedo, (swell - 0.5) * 0.02, 0.9 + crest * 0.2, 1.0);
  albedo *= 0.92 + 0.14 * mix(grain, grains, 0.5);
  albedo = mix(albedo, SAND_LIT * 1.10, sparkle * 0.45);
  albedo = mix(albedo, mix(SAND_SHADE, SAND_LIT, hash11(lag.y + 0.61)), pebble * 0.7);
  albedo = mix(albedo, SAND_DAMP, damp * 0.55);
  albedo *= 0.98 + 0.04 * micro;

  float rough = 0.94;
  rough -= damp * 0.28;
  rough -= sparkle * 0.20;
  rough += crest * 0.02;
  rough += (grain - 0.5) * 0.08;
  rough -= pebble * 0.08;

  float ao = 1.0 - (1.0 - ripple) * 0.14 - scoop * 0.18 - (1.0 - grains) * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const DIRT_GROUND = /* glsl */ `
${GROUND_GLSL}
const vec3 EARTH = vec3(0.352, 0.286, 0.214);
const vec3 EARTH_DRY = vec3(0.512, 0.436, 0.336);
const vec3 EARTH_WET = vec3(0.196, 0.152, 0.112);
const vec3 CLAY = vec3(0.436, 0.322, 0.226);
const vec3 STONE = vec3(0.470, 0.452, 0.420);

void surface(vec2 uv, inout Surface s) {
  // Compacted track. Clods and small stones sit in a fine matrix, the surface is
  // crazed with shrinkage cracks where it has dried out, and a tyre has pressed
  // a tread pattern into the softer ground.
  float macro = fbm2(uv * 2.0, vec2(2.0), 5) * 0.5 + 0.5;
  float clods = fbm2(uv * 9.0 + 3.0, vec2(9.0), 4) * 0.5 + 0.5;
  vec3 stones = pebbles(uv, 34.0, 0.36, 1.0);
  float stoneMask = stones.z * step(0.52, hash11(stones.y + 0.17));
  vec3 grit = grainWorley(uv + 6.6, 190.0, 1.0);
  float gritMask = 1.0 - smoothstep(0.06, 0.40, grit.x);

  float grain = grainNoise(uv, 200.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  float dry = smoothstep(0.35, 0.80, macro * 0.7 + clods * 0.3);
  float cracks = mudCracks(uv, 11.0, 0.070, 0.4) * dry;
  float fineCracks = mudCracks(uv + 8.0, 26.0, 0.055, 0.3) * dry * 0.6;

  // Tyre tread pressed across the track: lugs on a slight diagonal.
  float treadBand = smoothBand(uv.x, 0.30, 0.72, 0.06);
  float lug = step(0.45, fract(uv.y * 22.0 + uv.x * 2.0));
  float tread = treadBand * lug * smoothstep(0.30, 0.70, fbm2(uv * 5.0 + 27.0, vec2(5.0), 3) * 0.5 + 0.5);

  float damp = smoothstep(0.52, 0.90, fbm2(uv * 3.0 - 12.0, vec2(3.0), 4) * 0.5 + 0.5) * (1.0 - dry * 0.7);
  float dust = sat(dry * 0.6 + cavityDirt(clods, grain, 0.5));
  float organic = smoothstep(0.64, 0.94, turbulence2(uv * 7.0 + 5.0, vec2(7.0), 4));

  float height = 0.54
    + (macro - 0.5) * 0.16
    + (clods - 0.5) * 0.20
    + stones.x * stoneMask * 0.22
    + gritMask * 0.06
    + (grain - 0.5) * 0.09
    + (micro - 0.5) * 0.03
    - cracks * 0.30
    - fineCracks * 0.14
    - tread * 0.18;

  vec3 albedo = mix(EARTH, EARTH_DRY, dry * 0.85);
  albedo = mix(albedo, CLAY, sat((clods - 0.45) * 1.6) * 0.4);
  albedo = tintShift(albedo, (macro - 0.5) * 0.035, 0.9 + dry * 0.2, 1.0);
  albedo *= 0.88 + 0.22 * grain;
  albedo = mix(albedo, mix(STONE * 0.85, STONE, hash11(stones.y + 0.53)), stones.x * stoneMask * 0.75);
  albedo = mix(albedo, EARTH_WET, damp * 0.65);
  albedo = mix(albedo, EARTH_WET * 0.9, cracks * 0.55);
  albedo = mix(albedo, EARTH_DRY * 1.10, dust * 0.30);
  albedo = mix(albedo, vec3(0.196, 0.184, 0.132), organic * 0.28);
  albedo = mix(albedo, EARTH_WET, tread * 0.30);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.94;
  rough -= damp * 0.30;
  rough += dust * 0.04;
  rough -= stones.x * stoneMask * 0.16;
  rough += (grain - 0.5) * 0.08;
  rough -= tread * 0.05;

  float ao = 1.0
    - cracks * 0.45
    - fineCracks * 0.22
    - tread * 0.22
    - (1.0 - clods) * 0.14
    - dust * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const GRASS_GROUND = /* glsl */ `
${GROUND_GLSL}
const vec3 GREEN_LUSH = vec3(0.212, 0.286, 0.128);
const vec3 GREEN_DRY = vec3(0.428, 0.408, 0.208);
const vec3 STRAW = vec3(0.560, 0.492, 0.298);
const vec3 SOIL = vec3(0.268, 0.212, 0.156);
const vec3 SHADOW = vec3(0.098, 0.128, 0.070);

void surface(vec2 uv, inout Surface s) {
  // Scrub grass over bare soil. Grass is read as clumps with directional blades,
  // not as a green noise field: each clump has its own dryness and its own lean,
  // and the soil shows through wherever the sward has been worn out.
  float coverField = fbm2(warp2(uv * 3.0, vec2(3.0), 0.5, 3), vec2(3.0), 5) * 0.5 + 0.5;
  float cover = smoothstep(0.30, 0.56, coverField);
  float worn = 1.0 - cover;

  vec3 clumpCells = worley2(uv * 17.0, vec2(17.0), 1.0);
  float clump = (1.0 - smoothstep(0.10, 0.52, clumpCells.x)) * cover;
  float clumpId = clumpCells.z;

  // Blades: a stretched anisotropic field per clump, leaning with the clump id.
  float lean = floor(hash11(clumpId + 0.7) * 3.0) - 1.0;
  vec2 bladeUv = slant(uv, vec2(1.0), lean);
  float blades = grainAniso(bladeUv, vec2(26.0, 210.0), 3);
  float bladeFine = grainAniso(bladeUv + 3.3, vec2(52.0, 256.0), 2);
  float bladeMask = smoothstep(0.44, 0.72, blades) * cover;

  // Seed heads on the taller clumps.
  vec3 heads = worley2(uv * 46.0 + 2.7, vec2(46.0), 1.0);
  float seed = (1.0 - smoothstep(0.06, 0.24, heads.x)) * step(0.78, heads.z) * cover;

  float dryness = sat(patchiness(uv + 21.0, 3.0, 4) * 0.8 + hash11(clumpId + 0.31) * 0.4);
  float grain = grainNoise(uv, 220.0, 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Bare ground where the grass has gone.
  vec3 stones = pebbles(uv + 5.2, 40.0, 0.34, 1.0);
  float stoneMask = stones.z * step(0.62, hash11(stones.y + 0.41)) * worn;
  float soilClods = fbm2(uv * 12.0 - 4.0, vec2(12.0), 4) * 0.5 + 0.5;

  float thatch = smoothstep(0.55, 0.90, fbm2(uv * 8.0 + 31.0, vec2(8.0), 4) * 0.5 + 0.5) * cover;
  float damp = smoothstep(0.62, 0.95, fbm2(uv * 3.0 - 15.0, vec2(3.0), 4) * 0.5 + 0.5);

  float height = 0.40
    + cover * 0.14
    + clump * 0.24
    + bladeMask * 0.16
    + (blades - 0.5) * 0.12 * cover
    + (bladeFine - 0.5) * 0.06 * cover
    + seed * 0.10
    + (soilClods - 0.5) * 0.14 * worn
    + stones.x * stoneMask * 0.18
    + (grain - 0.5) * 0.06
    + (micro - 0.5) * 0.03;

  vec3 grass = mix(GREEN_LUSH, GREEN_DRY, dryness);
  grass = mix(grass, STRAW, sat((dryness - 0.55) * 2.0) * 0.8);
  grass = tintShift(grass, (clumpId - 0.5) * 0.035, 0.9 + dryness * 0.3, 0.85 + 0.30 * blades);
  grass = mix(grass, SHADOW, sat(1.0 - blades * 1.6) * 0.55);
  grass = mix(grass, grass * 1.14, seed * 0.6);

  vec3 soil = mix(SOIL, SOIL * 1.45, soilClods);
  soil = mix(soil, mix(SOIL * 1.6, vec3(0.470, 0.452, 0.420), hash11(stones.y + 0.53)), stones.x * stoneMask * 0.8);

  vec3 albedo = mix(soil, grass, cover * 0.92);
  albedo = mix(albedo, STRAW * 0.82, thatch * 0.35);
  albedo = mix(albedo, albedo * 0.62, damp * 0.30);
  albedo *= 0.90 + 0.18 * grain;
  albedo *= 0.97 + 0.06 * micro;

  // Foliage is waxy: noticeably smoother than the soil it grows out of.
  float rough = mix(0.94, 0.72, cover);
  rough -= bladeMask * 0.10;
  rough += dryness * 0.10 * cover;
  rough -= damp * 0.24;
  rough += (grain - 0.5) * 0.08;

  float ao = 1.0
    - (1.0 - clump) * 0.24 * cover
    - sat(1.0 - blades * 1.8) * 0.22 * cover
    - thatch * 0.12
    - (1.0 - soilClods) * 0.10 * worn;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

export const GROUND_SPECS: MaterialSpec[] = [
  {
    id: 'asphalt',
    surface: 'concrete',
    body: ASPHALT,
    res: 'high',
    relief: 0.010,
    reliefWide: 0.28,
    tileMeters: 3.0,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.0, envMapIntensity: 1.0, aoMapIntensity: 0.9 },
  },
  {
    id: 'asphalt_worn',
    surface: 'concrete',
    body: ASPHALT_WORN,
    res: 'high',
    relief: 0.016,
    reliefWide: 0.30,
    tileMeters: 3.0,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.05, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'gravel',
    surface: 'gravel',
    body: GRAVEL,
    res: 'high',
    relief: 0.038,
    reliefWide: 0.20,
    tileMeters: 2.2,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.15, envMapIntensity: 0.95, aoMapIntensity: 1.0 },
  },
  {
    id: 'sand_ground',
    surface: 'sand',
    body: SAND_GROUND,
    res: 'high',
    relief: 0.020,
    reliefWide: 0.34,
    tileMeters: 3.0,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 0.95, envMapIntensity: 0.9, aoMapIntensity: 0.85 },
  },
  {
    id: 'dirt_ground',
    surface: 'dirt',
    body: DIRT_GROUND,
    res: 'high',
    relief: 0.024,
    reliefWide: 0.28,
    tileMeters: 2.6,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.05, envMapIntensity: 0.9, aoMapIntensity: 1.0 },
  },
  {
    id: 'grass_ground',
    surface: 'grass',
    body: GRASS_GROUND,
    res: 'high',
    relief: 0.030,
    reliefWide: 0.22,
    tileMeters: 2.4,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.2, envMapIntensity: 0.8, aoMapIntensity: 1.0 },
  },
];
