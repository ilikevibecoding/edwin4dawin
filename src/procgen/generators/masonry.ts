import type { MaterialSpec } from './types';

/**
 * Masonry and units. These need a real running-bond lattice: per-brick colour,
 * per-brick height, recessed mortar with its own texture, and wear that follows
 * the arris of each unit rather than a noise field.
 */

const BRICK_RED = /* glsl */ `
const vec3 CLAY_RED = vec3(0.412, 0.176, 0.128);
const vec3 CLAY_ORANGE = vec3(0.520, 0.262, 0.158);
const vec3 CLAY_BROWN = vec3(0.296, 0.166, 0.130);
const vec3 CLAY_DARK = vec3(0.176, 0.108, 0.104);
const vec3 MORTAR = vec3(0.606, 0.590, 0.556);

vec3 brickColour(float id) {
  vec3 c = mix(CLAY_RED, CLAY_ORANGE, sat(id * 2.1));
  c = mix(c, CLAY_BROWN, sat((id - 0.45) * 2.4));
  // A handful of over-fired headers per wall; without them the wall reads flat.
  c = mix(c, CLAY_DARK, step(0.93, id) * 0.85);
  return c;
}

void surface(vec2 uv, inout Surface s) {
  Cell b = brickCell(uv, vec2(8.0, 24.0), 0.055);
  float mortarMask = 1.0 - b.face;
  vec2 lu = b.luv;

  // Per-brick surface: sanded face, a slight dish, and firing blotches.
  float faceNoise = fbmValue2(lu * 26.0 + b.id2 * 17.0, vec2(26.0), 3);
  float blotch = fbm2(lu * 3.0 + b.id2 * 9.0, vec2(3.0), 3) * 0.5 + 0.5;
  float dish = 1.0 - pow(length((lu - 0.5) * vec2(1.0, 2.4)), 2.0) * 0.9;

  // Frogged/spalled faces: some bricks have lost their skin at a corner.
  float spallSeed = hash12(b.id2 + 3.7);
  vec3 spallCells = worley2(lu * 5.0 + b.id2 * 5.0, vec2(5.0), 1.0);
  float spall = (1.0 - smoothstep(0.18, 0.46, spallCells.x)) * step(0.68, spallSeed) * b.face;

  // Mortar: coarse sand, pointing struck back from the brick face. Both bands are
  // authored per-texel rather than per-tile so the sand never falls below Nyquist.
  float mortarSand = grainNoise(uv, 150.0, 3);
  vec3 mortarGrit = grainWorley(uv + 5.0, 100.0, 1.0);
  float grit = 1.0 - smoothstep(0.05, 0.42, mortarGrit.x);

  // Weathering: efflorescence blooming out of the joints, moss low down,
  // rain-washed upper courses and grime streaks under every projection.
  float damp = sat(1.0 - uv.y * 1.5) * (fbm2(uv * 2.4 + 12.0, vec2(2.4), 3) * 0.5 + 0.5);
  float efflor = smoothstep(0.55, 0.9, fbm2(uv * 6.0 - 4.0, vec2(6.0), 4) * 0.5 + 0.5) *
    (mortarMask * 0.7 + 0.3) * (0.35 + damp);
  float moss = smoothstep(0.5, 0.92, turbulence2(uv * 9.0 + 21.0, vec2(9.0), 4)) * damp * 1.1;
  float streak = dripStreaks(uv, 16.0, 0.62, 31.0);
  float washed = smoothstep(0.35, 1.0, uv.y) * patchiness(uv - 6.0, 3.0, 3);

  float height = 0.30
    + b.face * 0.52
    + (faceNoise - 0.5) * 0.06 * b.face
    + (blotch - 0.5) * 0.04 * b.face
    + dish * 0.03 * b.face
    + (b.id - 0.5) * 0.05 * b.face
    + (mortarSand - 0.5) * 0.10 * mortarMask
    + grit * 0.08 * mortarMask
    - spall * 0.16;

  vec3 albedo = brickColour(b.id);
  albedo = tintShift(albedo, (blotch - 0.5) * 0.045, 0.85 + blotch * 0.35, 0.9 + blotch * 0.25);
  albedo *= 0.88 + 0.22 * faceNoise;
  albedo = mix(albedo, albedo * 1.22 + vec3(0.05, 0.04, 0.03), spall * 0.8);
  albedo = mix(albedo, MORTAR * (0.86 + 0.28 * mortarSand), mortarMask);
  albedo = mix(albedo, vec3(0.780, 0.766, 0.740), efflor * 0.55);
  albedo = mix(albedo, vec3(0.128, 0.156, 0.096), moss * 0.5);
  albedo = mix(albedo, vec3(0.118, 0.098, 0.086), streak * 0.5);
  albedo = mix(albedo, albedo * 1.10, washed * 0.25);
  albedo = mix(albedo, albedo * 0.78, damp * 0.35);

  float rough = mix(0.93, 0.80, b.face);
  rough -= damp * 0.20;
  rough += efflor * 0.06;
  rough += moss * 0.04;
  rough -= streak * 0.10;
  rough += spall * 0.05;
  rough += (faceNoise - 0.5) * 0.10;

  float ao = 1.0
    - mortarMask * 0.34
    - (1.0 - b.face) * 0.10
    - moss * 0.15
    - streak * 0.10
    - spall * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const BRICK_PAINTED = /* glsl */ `
const vec3 PAINT_A = vec3(0.760, 0.742, 0.700);
const vec3 PAINT_B = vec3(0.664, 0.652, 0.628);
const vec3 CLAY = vec3(0.398, 0.192, 0.142);
const vec3 MORTAR = vec3(0.546, 0.532, 0.505);

void surface(vec2 uv, inout Surface s) {
  Cell b = brickCell(uv, vec2(8.0, 24.0), 0.055);
  float mortarMask = 1.0 - b.face;

  // Paint bridges the joints, so the relief is softer than bare brick and the
  // arris of each unit is where the coat gives up first.
  float faceNoise = fbmValue2(b.luv * 22.0 + b.id2 * 13.0, vec2(22.0), 3);
  float sand = fbmValue2(uv * 300.0, vec2(300.0), 3);

  float coatField = fbm2(warp2(uv * 5.0, vec2(5.0), 0.6, 3), vec2(5.0), 5) * 0.5 + 0.5;
  float wearEdge = (1.0 - b.face) * 0.55 + smoothstep(0.30, 0.06, b.dist.y) * 0.45;
  float loss = smoothstep(0.44, 0.60, coatField + wearEdge * 0.35);
  float coat = 1.0 - loss;
  float chipLip = band(coatField + wearEdge * 0.35, 0.52, 0.05) * coat;

  float brush = fbm2(slant(uv, vec2(40.0, 6.0), 1.0), vec2(40.0, 6.0), 3) * 0.5 + 0.5;
  float roller = fbmValue2(uv * vec2(4.0, 60.0), vec2(4.0, 60.0), 3);

  float damp = sat(1.0 - uv.y * 1.6) * (fbm2(uv * 2.2 + 30.0, vec2(2.2), 3) * 0.5 + 0.5);
  float grime = smoothstep(0.42, 0.9, turbulence2(uv * 5.0 + 44.0, vec2(5.0), 4)) * (0.4 + damp * 0.9);
  float streak = dripStreaks(uv, 18.0, 0.6, 44.0);

  float height = 0.36
    + b.face * 0.40
    + coat * 0.10
    + chipLip * 0.06
    + (faceNoise - 0.5) * 0.05
    + (sand - 0.5) * 0.07 * (mortarMask + loss)
    + (brush - 0.5) * 0.03 * coat;

  vec3 base = mix(PAINT_B, PAINT_A, brush * 0.6 + roller * 0.4);
  vec3 exposed = mix(MORTAR * (0.9 + 0.2 * sand), CLAY, b.face);
  vec3 albedo = mix(exposed, base, coat);
  albedo = tintShift(albedo, (roller - 0.5) * 0.015, 0.9, 1.0);
  albedo = mix(albedo, base * 1.08, chipLip * 0.6);
  albedo = mix(albedo, vec3(0.178, 0.168, 0.152), grime * 0.45);
  albedo = mix(albedo, vec3(0.132, 0.122, 0.110), streak * 0.5);
  albedo *= 0.96 + 0.08 * faceNoise;

  float rough = mix(0.94, 0.62, coat);
  rough += (roller - 0.5) * 0.14 * coat;
  rough += grime * 0.10;
  rough -= streak * 0.12;
  rough -= damp * 0.10;

  float ao = 1.0 - mortarMask * 0.30 * coat - mortarMask * 0.45 * loss - grime * 0.12 - streak * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const TILE_CERAMIC = /* glsl */ `
const vec3 GLAZE_A = vec3(0.712, 0.726, 0.706);
const vec3 GLAZE_B = vec3(0.592, 0.626, 0.622);
const vec3 GLAZE_C = vec3(0.474, 0.512, 0.520);
const vec3 GROUT = vec3(0.418, 0.410, 0.392);

void surface(vec2 uv, inout Surface s) {
  Cell t = gridCell(uv, vec2(8.0, 8.0), 0.055);
  float groutMask = 1.0 - t.face;

  // Every tile is laid slightly out of plane and fired slightly differently.
  float lay = (hash12(t.id2 + 11.0) - 0.5);
  float tilt = dot(t.luv - 0.5, vec2(hash12(t.id2 + 2.0) - 0.5, hash12(t.id2 + 5.0) - 0.5)) * 2.0;
  float glazePool = fbm2(t.luv * 3.0 + t.id2 * 7.0, vec2(3.0), 3) * 0.5 + 0.5;

  // Crazing in the glaze, chips at the corners, grout that has gone grey.
  vec2 crazeUv = warp2(uv * 26.0, vec2(26.0), 0.25, 3);
  float craze = smoothstep(0.90, 0.995, ridged2(crazeUv, vec2(26.0), 4, 0.6, 3.6)) * t.face;
  float cornerDist = length(max(abs(t.luv - 0.5) - 0.34, 0.0));
  float chip = step(0.80, hash12(t.id2 + 19.0)) *
    (1.0 - smoothstep(0.02, 0.10, abs(cornerDist - 0.10))) * t.face;

  float groutSand = fbmValue2(uv * 340.0, vec2(340.0), 3);
  float micro = fbmValue2(uv * 700.0, vec2(700.0), 2);

  float wet = smoothstep(0.45, 0.85, fbm2(uv * 3.0 - 8.0, vec2(3.0), 3) * 0.5 + 0.5);
  float scuff = scratches(uv, vec2(120.0, 30.0), 7.0, 0.55) * t.face;
  float grime = groutMask * (0.55 + 0.45 * groutSand) +
    smoothstep(0.55, 0.95, turbulence2(uv * 6.0 + 3.0, vec2(6.0), 4)) * 0.5;

  float height = 0.72
    + t.face * 0.16
    + tilt * 0.03 * t.face
    + lay * 0.04 * t.face
    + (groutSand - 0.5) * 0.09 * groutMask
    + (micro - 0.5) * 0.02
    - groutMask * 0.42
    - craze * 0.10
    - chip * 0.35;

  vec3 glaze = mix(GLAZE_B, GLAZE_A, sat(t.id * 1.7));
  glaze = mix(glaze, GLAZE_C, sat((t.id - 0.55) * 2.2));
  glaze = tintShift(glaze, (glazePool - 0.5) * 0.03, 0.9 + glazePool * 0.3, 0.94 + glazePool * 0.12);

  vec3 albedo = mix(GROUT * (0.85 + 0.3 * groutSand), glaze, t.face);
  albedo = mix(albedo, vec3(0.640, 0.616, 0.586), chip * 0.9);
  albedo = mix(albedo, albedo * 0.92, craze * 0.6);
  albedo = mix(albedo, vec3(0.196, 0.190, 0.180), grime * 0.35);
  albedo = mix(albedo, albedo * 1.06, scuff * 0.4);
  albedo *= 0.98 + 0.04 * micro;

  // The glaze/grout roughness split is the whole read of a tiled surface.
  float rough = mix(0.90, 0.13, t.face);
  rough -= wet * 0.06 * t.face;
  rough += craze * 0.22;
  rough += chip * 0.55;
  rough += scuff * 0.30;
  rough += grime * 0.16;
  rough += (micro - 0.5) * 0.05;

  float ao = 1.0 - groutMask * 0.46 - chip * 0.30 - craze * 0.10 - grime * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const SANDBAG = /* glsl */ `
const vec3 HESSIAN_A = vec3(0.510, 0.436, 0.318);
const vec3 HESSIAN_B = vec3(0.398, 0.336, 0.242);
const vec3 SUN_FADED = vec3(0.598, 0.548, 0.446);

void surface(vec2 uv, inout Surface s) {
  // Stacked bags in a running bond: each bag is a sagging superellipse with a
  // sewn seam, woven hessian and dust caught in the valleys between courses.
  Cell b = brickCell(uv, vec2(3.0, 6.0), 0.10);
  vec2 lu = b.luv;

  float sag = 1.0 - pow(abs(lu.x - 0.5) * 2.0, 2.6) * 0.35;
  float bag = lobe(vec2(lu.x, mix(0.5, lu.y, sag)), 3.1, 0.42);
  float bulge = bag * (0.82 + 0.36 * hash12(b.id2 + 2.3));

  // Sewn seam across the short end of every bag.
  float seamLine = 1.0 - smoothstep(0.02, 0.055, abs(lu.x - mix(0.16, 0.24, b.id)));
  float stitch = seamLine * (0.5 + 0.5 * step(0.5, fract(lu.y * 42.0)));

  vec3 cloth = weave(uv, vec2(200.0, 190.0), 0.55);
  float weaveH = cloth.x;
  float fuzz = fbmValue2(uv * 520.0, vec2(520.0), 2);
  float slub = fbmValue2(uv * vec2(60.0, 12.0), vec2(60.0, 12.0), 3);

  float valley = 1.0 - bag;
  float dust = cavityDirt(bulge, fuzz, 1.0);
  float sunTop = smoothstep(0.30, 0.85, lu.y) * smoothstep(0.2, 0.6, bag);
  float stain = smoothstep(0.5, 0.92, turbulence2(uv * 7.0 + 13.0, vec2(7.0), 4));
  float leak = smoothstep(0.55, 0.95, fbm2(uv * 12.0 - 3.0, vec2(12.0), 4) * 0.5 + 0.5) * valley;

  float height = 0.12
    + bulge * 0.62
    + weaveH * 0.10
    + (slub - 0.5) * 0.05
    + (fuzz - 0.5) * 0.03
    + stitch * 0.05
    - seamLine * 0.06;

  vec3 albedo = mix(HESSIAN_B, HESSIAN_A, 0.35 + 0.65 * b.id);
  albedo = tintShift(albedo, (b.id - 0.5) * 0.03, 0.9, 0.92 + 0.16 * b.id);
  albedo = mix(albedo, SUN_FADED, sunTop * 0.55);
  albedo *= 0.86 + 0.26 * (weaveH * 0.6 + slub * 0.4);
  albedo = mix(albedo, vec3(0.700, 0.640, 0.520), leak * 0.5);
  albedo = mix(albedo, vec3(0.262, 0.222, 0.170), dust * 0.35);
  albedo = mix(albedo, vec3(0.198, 0.170, 0.132), stain * 0.30);
  albedo = mix(albedo, albedo * 1.10, stitch * 0.4);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.95;
  rough -= sunTop * 0.05;
  rough += dust * 0.03;
  rough += (fuzz - 0.5) * 0.06;
  rough -= stain * 0.05;

  float ao = 1.0
    - (1.0 - bulge) * 0.42
    - (1.0 - b.face) * 0.18
    - dust * 0.14
    - (1.0 - weaveH) * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

export const MASONRY_SPECS: MaterialSpec[] = [
  {
    id: 'brick_red',
    surface: 'brick',
    body: BRICK_RED,
    res: 'high',
    relief: 0.030,
    reliefWide: 0.22,
    tileMeters: 1.8,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.25, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'brick_painted',
    surface: 'brick',
    body: BRICK_PAINTED,
    res: 'medium',
    relief: 0.022,
    reliefWide: 0.30,
    tileMeters: 1.8,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.0, envMapIntensity: 1.0, aoMapIntensity: 0.95 },
  },
  {
    id: 'tile_ceramic',
    surface: 'tile',
    body: TILE_CERAMIC,
    res: 'high',
    relief: 0.016,
    reliefWide: 0.20,
    tileMeters: 1.2,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.0, envMapIntensity: 1.25, aoMapIntensity: 0.9 },
  },
  {
    id: 'sandbag',
    surface: 'fabric',
    body: SANDBAG,
    res: 'medium',
    relief: 0.055,
    reliefWide: 0.28,
    tileMeters: 1.4,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.2,
      envMapIntensity: 0.75,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.35, sheenRoughness: 0.9, sheenColor: 0xa08a68 },
    },
  },
];
