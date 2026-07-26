import type { MaterialSpec } from './types';

/**
 * Timber.
 *
 * What makes procedural wood convincing is that the growth rings are a *field*,
 * not a stripe pattern: they run the length of the board, drift as the board was
 * cut off-centre, and flare into cathedral figure where the saw crossed a ring
 * obliquely. Latewood is darker, denser and stands slightly proud once the
 * surface has weathered, so the same field drives colour, height and roughness
 * together.
 */

const GRAIN_GLSL = /* glsl */ `
/**
 * Ring coordinate for a board whose length runs along luv.y. \`skew\` tilts the
 * rings relative to the board and \`figure\` bends them into cathedral flare.
 *
 * The across-grain ramp is a cosine rather than a linear distance from the pith.
 * That does two things at once: rings compress towards the pith exactly as they
 * do in a plainsawn board, and the field stays exactly periodic in luv, so this
 * is safe to feed global UVs as long as \`skew\` is a whole number.
 */
float ringCoord(vec2 luv, float rings, float seed, float skew, float figure) {
  float drift = fbm2(vec2(luv.y * 3.0 + seed * 5.0, luv.x * 2.0), vec2(3.0, 2.0), 3);
  float flare = fbm2(vec2(luv.y * 5.0 - seed * 2.0, luv.x * 2.0), vec2(5.0, 2.0), 4);
  float pith = hash11(seed + 0.7);
  float across = 0.5 - 0.5 * cos((luv.x - pith + luv.y * skew) * TAU);
  return across * rings + drift * 1.7 + figure * flare * 2.6 + seed * 9.0;
}

/** Latewood bands: narrow, dark, hard. Returns 0..1. */
float latewood(float coord, float width) {
  float f = fract(coord);
  return smoothstep(0.5 - width, 0.5, f) * (1.0 - smoothstep(0.5 + width * 0.55, 0.5 + width * 1.5, f));
}

/** Open vessels and medullary rays, stretched hard along the grain. */
float pores(vec2 luv, float countAt512, float stretch) {
  float c = detailCells(countAt512);
  float cy = max(2.0, floor(c / stretch));
  return 1.0 - smoothstep(0.05, 0.42, worley2(vec2(luv.x * c, luv.y * cy), vec2(c, cy), 1.0).x);
}

/** Knot centred on \`at\`, returning (mask, ringDisturbance). */
vec2 knot(vec2 luv, vec2 at, float radius, float seed) {
  vec2 d = (luv - at) * vec2(1.0, 0.42);
  float r = length(d) / max(radius, 1e-4);
  float mask = 1.0 - smoothstep(0.55, 1.0, r);
  float swirl = sin(atan(d.y, d.x) * 3.0 + seed * 6.0) * 0.5 + 0.5;
  float disturb = (1.0 - smoothstep(0.4, 2.4, r)) * (0.6 + 0.4 * swirl);
  return vec2(mask, disturb);
}
`;

const WOOD_PLANK = /* glsl */ `
${GRAIN_GLSL}
const vec3 PINE_LIGHT = vec3(0.622, 0.510, 0.356);
const vec3 PINE_LATE = vec3(0.438, 0.320, 0.198);
const vec3 SILVER = vec3(0.428, 0.412, 0.382);
const vec3 SILVER_COOL = vec3(0.372, 0.376, 0.372);

void surface(vec2 uv, inout Surface s) {
  // Weathered exterior boarding. Years of sun have lifted the earlywood away
  // and left the latewood standing proud, silvered the surface and opened
  // checks along the grain; the nails have bled rust into the timber.
  Board b = boardCell(uv, 5.0, 2.0, 0.014);
  float gap = 1.0 - b.face;
  vec2 lu = b.luv;
  float seed = b.segId;

  float coord = ringCoord(lu, 13.0, seed, (hash11(seed + 3.1) - 0.5) * 0.5, 0.7);
  vec2 kn = knot(lu, vec2(hash11(seed + 8.2), hash11(seed + 1.4)), 0.16, seed);
  float knotMask = kn.x * step(0.62, hash11(seed + 5.5));
  coord += kn.y * 5.0 * step(0.62, hash11(seed + 5.5));
  float late = latewood(coord, 0.16);
  float lateWide = latewood(coord, 0.30);

  float rip = grainAniso(lu, vec2(120.0, 5.0), 3);
  float fuzz = grainNoise(uv, 220.0, 2);
  float sawMarks = pow(abs(sin(lu.y * detailCells(90.0) * PI + lu.x * 3.0)), 4.0) * 0.6;

  // Surface checks: long splits that follow the rings and open at board ends.
  float endOpen = smoothstep(0.30, 0.02, min(b.dist.y * 2.0, 0.5));
  float checkField = ridged2(vec2(lu.x * 26.0, lu.y * 2.2), vec2(26.0, 3.0), 4, 0.55, 3.0);
  float check = smoothstep(0.80, 0.96, checkField + endOpen * 0.18 + late * 0.06);

  // Fixings: two nails per board segment, sunk and weeping rust.
  vec2 nailAt = vec2(mix(0.22, 0.34, hash11(seed + 2.2)), 0.16);
  float nd1 = length((lu - nailAt) * vec2(1.0, 1.0)) / 0.026;
  float nd2 = length((lu - vec2(1.0 - nailAt.x, 0.84)) * vec2(1.0, 1.0)) / 0.026;
  float nail = max(1.0 - smoothstep(0.55, 1.0, nd1), 1.0 - smoothstep(0.55, 1.0, nd2));
  float nailHalo = max(1.0 - smoothstep(0.8, 3.2, nd1), 1.0 - smoothstep(0.8, 3.2, nd2));

  float weather = patchiness(uv + 3.3, 3.0, 3);
  float greying = sat(0.45 + 0.55 * weather - lateWide * 0.25);
  float damp = sat(1.0 - uv.y * 1.7) * (fbm2(uv * 2.5 + 14.0, vec2(2.5), 3) * 0.5 + 0.5);
  float algae = smoothstep(0.58, 0.92, turbulence2(uv * 9.0 + 27.0, vec2(9.0), 4)) * (0.3 + damp);
  float streak = dripStreaks(uv, 14.0, 0.6, 23.0) * 0.6;

  float height = 0.56
    + b.face * 0.14
    + late * 0.16
    + lateWide * 0.05
    + (rip - 0.5) * 0.10
    + (fuzz - 0.5) * 0.05
    + sawMarks * 0.03
    + knotMask * 0.10
    - check * 0.42
    - nail * 0.36
    - gap * 0.55
    - (b.boardId - 0.5) * 0.05;

  vec3 fresh = mix(PINE_LIGHT, PINE_LATE, late * 0.85 + lateWide * 0.15);
  fresh = mix(fresh, PINE_LATE * 0.72, knotMask * 0.85);
  vec3 aged = mix(SILVER, SILVER_COOL, weather);
  vec3 albedo = mix(fresh, aged, greying * 0.82);
  albedo = tintShift(albedo, (b.boardId - 0.5) * 0.02, 0.85 + late * 0.3, 0.9 + 0.2 * b.boardId);
  albedo *= 0.92 + 0.15 * rip;
  albedo = mix(albedo, vec3(0.352, 0.176, 0.086), nailHalo * 0.45 + nail * 0.4);
  albedo = mix(albedo, vec3(0.176, 0.148, 0.116), check * 0.75);
  albedo = mix(albedo, vec3(0.140, 0.158, 0.108), algae * 0.42);
  albedo = mix(albedo, vec3(0.196, 0.174, 0.140), streak * 0.5);
  albedo = mix(albedo, vec3(0.128, 0.112, 0.092), gap * 0.85);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.90;
  rough += greying * 0.05;
  rough -= late * 0.06;
  rough += (rip - 0.5) * 0.10;
  rough += algae * 0.04;
  rough -= damp * 0.14;
  rough += check * 0.04;

  float ao = 1.0
    - gap * 0.60
    - check * 0.45
    - nail * 0.35
    - (1.0 - b.face) * 0.10
    - algae * 0.12
    - knotMask * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = nail * 0.35;
  s.ao = ao;
  s.height = height;
}
`;

const WOOD_CRATE = /* glsl */ `
${GRAIN_GLSL}
const vec3 PINE = vec3(0.660, 0.552, 0.396);
const vec3 PINE_LATE = vec3(0.500, 0.382, 0.242);
const vec3 DIRTY = vec3(0.408, 0.336, 0.246);
const vec3 STENCIL = vec3(0.128, 0.132, 0.140);

void surface(vec2 uv, inout Surface s) {
  // Rough-sawn packing crate: wide slats with visible saw kerf, dirt in every
  // gap, corner scuffing and a black stencilled consignment mark.
  Board b = boardCell(uv, 4.0, 2.0, 0.020);
  float gap = 1.0 - b.face;
  vec2 lu = b.luv;
  float seed = b.segId;

  float coord = ringCoord(lu, 9.0, seed, (hash11(seed + 4.4) - 0.5) * 0.7, 0.9);
  vec2 kn = knot(lu, vec2(hash11(seed + 6.1), hash11(seed + 2.9)), 0.19, seed);
  float knotOn = step(0.52, hash11(seed + 7.7));
  float knotMask = kn.x * knotOn;
  coord += kn.y * 6.0 * knotOn;
  float late = latewood(coord, 0.20);

  // Bandsaw kerf runs across the board, not along it: the tell of rough stock.
  float kerf = pow(abs(sin(lu.y * detailCells(70.0) * PI + coord * 0.7)), 3.0);
  float rip = grainAniso(lu, vec2(90.0, 4.0), 3);
  float fibre = grainNoise(uv, 240.0, 2);
  float splinter = scratches(lu, vec2(detailCells(30.0), detailCells(3.0)), 6.0, 0.4);

  // Handling: corners are crushed, edges of the slats are furred over.
  float edgeSoft = 1.0 - smoothstep(0.0, 0.10, min(b.dist.x, b.dist.y));
  float bruise = smoothstep(0.55, 0.9, fbm2(uv * 4.0 + 6.0, vec2(4.0), 4) * 0.5 + 0.5);

  // Stencil: block glyphs on a band across the middle course of slats.
  float bandMask = smoothBand(uv.y, 0.40, 0.62, 0.02);
  vec2 gp = vec2(uv.x * 9.0, (uv.y - 0.40) * 8.0);
  float glyphCell = step(0.42, hash12(vec2(mod(floor(gp.x), 9.0), mod(floor(gp.y), 2.0)) + 0.5));
  vec2 gf = abs(fract(gp) - 0.5) * 2.0;
  float glyphBody = (1.0 - smoothstep(0.62, 0.78, gf.x)) * (1.0 - smoothstep(0.70, 0.86, gf.y));
  float ink = bandMask * glyphCell * glyphBody * b.face *
    smoothstep(0.25, 0.7, fbm2(uv * 7.0 - 4.0, vec2(7.0), 3) * 0.5 + 0.5);

  float grime = smoothstep(0.40, 0.88, turbulence2(uv * 6.0 + 33.0, vec2(6.0), 4));
  float dust = cavityDirt(b.face * 0.7 + 0.3, fibre, 0.7) + gap * 0.4;
  float damp = sat(1.0 - uv.y * 2.0) * (fbm2(uv * 3.0 + 19.0, vec2(3.0), 3) * 0.5 + 0.5);

  float height = 0.52
    + b.face * 0.20
    + late * 0.10
    + kerf * 0.07
    + (rip - 0.5) * 0.12
    + (fibre - 0.5) * 0.05
    + knotMask * 0.09
    - splinter * 0.16
    - edgeSoft * 0.07
    - bruise * 0.03
    - gap * 0.60
    + (b.boardId - 0.5) * 0.06;

  vec3 albedo = mix(PINE, PINE_LATE, late * 0.9);
  albedo = mix(albedo, PINE_LATE * 0.68, knotMask * 0.9);
  albedo = tintShift(albedo, (b.boardId - 0.5) * 0.025, 0.9, 0.88 + 0.24 * b.boardId);
  albedo *= 0.90 + 0.18 * rip;
  albedo = mix(albedo, DIRTY, grime * 0.38 + dust * 0.30);
  albedo = mix(albedo, DIRTY * 0.62, damp * 0.30);
  albedo = mix(albedo, PINE * 1.10, splinter * 0.35);
  albedo = mix(albedo, STENCIL, ink * 0.88);
  albedo = mix(albedo, vec3(0.118, 0.098, 0.076), gap * 0.85);
  albedo *= 0.97 + 0.06 * fibre;

  float rough = 0.92;
  rough += (rip - 0.5) * 0.10;
  rough += dust * 0.05;
  rough -= damp * 0.16;
  rough -= ink * 0.10;
  rough += splinter * 0.04;

  float ao = 1.0
    - gap * 0.62
    - edgeSoft * 0.18
    - splinter * 0.20
    - dust * 0.14
    - knotMask * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const WOOD_PAINTED = /* glsl */ `
${GRAIN_GLSL}
const vec3 COAT = vec3(0.618, 0.596, 0.542);
const vec3 COAT_DEEP = vec3(0.516, 0.500, 0.462);
const vec3 UNDERCOAT = vec3(0.720, 0.702, 0.664);
const vec3 BARE = vec3(0.560, 0.452, 0.316);
const vec3 BARE_LATE = vec3(0.408, 0.306, 0.196);

void surface(vec2 uv, inout Surface s) {
  // Painted joinery that has been left outside. The coat has cracked along the
  // grain, curled at the board edges and let go in sheets; each flake leaves a
  // sharp lip on one side and bare grain on the other.
  Board b = boardCell(uv, 4.0, 2.0, 0.012);
  float gap = 1.0 - b.face;
  vec2 lu = b.luv;
  float seed = b.segId;

  float coord = ringCoord(lu, 11.0, seed, (hash11(seed + 3.7) - 0.5) * 0.4, 0.6);
  float late = latewood(coord, 0.18);
  float rip = grainAniso(lu, vec2(110.0, 5.0), 3);
  float fibre = grainNoise(uv, 230.0, 2);

  // Failure is driven by the grain plus the exposed edges of each board.
  float edgeExpose = 1.0 - smoothstep(0.0, 0.14, min(b.dist.x, b.dist.y * 0.7));
  float sun = smoothstep(0.2, 0.9, uv.y) * patchiness(uv + 7.7, 3.0, 3);
  float coatField = fbm2(warp2(uv * 5.0, vec2(5.0), 0.7, 4), vec2(5.0), 5) * 0.5 + 0.5;
  float drive = coatField * 0.66 + edgeExpose * 0.34 + late * 0.10 + sun * 0.12;
  float coat = 1.0 - smoothstep(0.46, 0.58, drive);
  float lip = band(drive, 0.50, 0.035) * coat;
  float primer = smoothBand(drive, 0.56, 0.70, 0.03);

  // Alligatoring: the crack network in an old oil coat.
  vec2 crazeUv = warp2(uv * 22.0, vec2(22.0), 0.2, 3);
  float craze = smoothstep(0.86, 0.98, ridged2(crazeUv, vec2(22.0), 4, 0.6, 3.2)) * coat;
  float brush = fbm2(slant(lu, vec2(6.0, 40.0), 0.0), vec2(6.0, 40.0), 3) * 0.5 + 0.5;

  float grime = smoothstep(0.45, 0.9, turbulence2(uv * 6.0 + 41.0, vec2(6.0), 4));
  float streak = dripStreaks(uv, 18.0, 0.6, 29.0);
  float damp = sat(1.0 - uv.y * 1.8) * (fbm2(uv * 2.6 + 22.0, vec2(2.6), 3) * 0.5 + 0.5);
  float mould = smoothstep(0.60, 0.94, turbulence2(uv * 10.0 - 8.0, vec2(10.0), 4)) * (0.3 + damp);

  float height = 0.44
    + b.face * 0.12
    + coat * 0.22
    + lip * 0.09
    + primer * 0.07
    + late * 0.09 * (1.0 - coat)
    + (rip - 0.5) * 0.10 * (1.0 - coat)
    + (brush - 0.5) * 0.04 * coat
    + (fibre - 0.5) * 0.04
    - craze * 0.14
    - gap * 0.55;

  vec3 bare = mix(BARE, BARE_LATE, late * 0.9);
  bare = mix(bare, bare * 0.82, sun * 0.3);
  vec3 paint = mix(COAT_DEEP, COAT, brush * 0.65 + 0.35);
  paint = mix(paint, paint * 1.06 + vec3(0.02), sun * 0.35);
  vec3 albedo = mix(bare, paint, coat);
  albedo = mix(albedo, UNDERCOAT, primer * 0.7);
  albedo = mix(albedo, paint * 1.10, lip * 0.55);
  albedo = tintShift(albedo, (b.boardId - 0.5) * 0.015, 0.9, 1.0);
  albedo = mix(albedo, vec3(0.182, 0.174, 0.160), grime * 0.40);
  albedo = mix(albedo, vec3(0.140, 0.128, 0.110), streak * 0.5);
  albedo = mix(albedo, vec3(0.124, 0.142, 0.104), mould * 0.4);
  albedo = mix(albedo, vec3(0.098, 0.086, 0.072), gap * 0.85);
  albedo *= 0.97 + 0.06 * fibre;

  float rough = mix(0.92, 0.46, coat);
  rough += craze * 0.20;
  rough += (brush - 0.5) * 0.12 * coat;
  rough += grime * 0.12;
  rough += mould * 0.10;
  rough -= streak * 0.10;
  rough -= damp * 0.08;
  rough += primer * 0.16;

  float ao = 1.0
    - gap * 0.58
    - craze * 0.20
    - (1.0 - coat) * 0.14
    - primer * 0.10
    - mould * 0.12
    - streak * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const GUN_WOOD = /* glsl */ `
${GRAIN_GLSL}
const vec3 WALNUT = vec3(0.264, 0.188, 0.134);
const vec3 WALNUT_LIGHT = vec3(0.418, 0.318, 0.228);
const vec3 WALNUT_DARK = vec3(0.146, 0.102, 0.076);
const vec3 SHEEN = vec3(0.510, 0.402, 0.302);

void surface(vec2 uv, inout Surface s) {
  // Oil-finished walnut furniture. Two things carry it: strongly figured ring
  // structure with a fiddleback shimmer across the grain, and a satin finish
  // that has been polished bright by handling on the high spots while the pores
  // stay matte.
  // Walnut is fine-grained and a stock is cut with the grain running its length,
  // so the ring count has to stay well above the drift the field adds — otherwise
  // the figure swamps the rings and the surface reads as marbling, not wood.
  float coord = ringCoord(uv, 30.0, 0.31, 0.0, 0.35);
  float late = latewood(coord, 0.22);
  float lateSoft = latewood(coord, 0.40);

  // Fiddleback shimmer and mineral streaking, both running across the grain.
  float fiddle = pow(abs(sin(uv.y * 22.0 * PI + fbm2(uv * 3.0, vec2(3.0), 3) * 3.0)), 2.2);
  float mineral = smoothstep(0.60, 0.92, ridged2(vec2(uv.x * 8.0, uv.y * 2.0), vec2(8.0, 2.0), 4, 0.6, 2.4));
  float pore = pores(uv, 190.0, 5.0);
  float rip = grainAniso(uv, vec2(160.0, 6.0), 3);
  float micro = grainNoise(uv, 250.0, 2);

  // Finish: builds thicker in the pores, thinner and glossier on the high spots.
  float fill = sat(0.72 - pore * 0.5 - late * 0.2);
  float handling = smoothstep(0.55, 0.9, fbm2(warp2(uv * 4.0, vec2(4.0), 0.4, 3), vec2(4.0), 4) * 0.5 + 0.5);
  float ding = scratches(uv, vec2(detailCells(24.0), detailCells(24.0)), 3.5, 0.14);
  float scuff = scratches(uv, vec2(detailCells(150.0), detailCells(36.0)), 8.0, 0.30);
  float oilPatch = smoothstep(0.42, 0.82, fbm2(uv * 6.0 - 13.0, vec2(6.0), 4) * 0.5 + 0.5);

  float height = 0.68
    + late * 0.10
    + lateSoft * 0.03
    + (rip - 0.5) * 0.07
    + (micro - 0.5) * 0.03
    + fiddle * 0.02
    - pore * (1.0 - fill) * 0.34
    - ding * 0.34
    - scuff * 0.08;

  vec3 albedo = mix(WALNUT_LIGHT, WALNUT, late * 0.75 + lateSoft * 0.25);
  albedo = mix(albedo, WALNUT_DARK, mineral * 0.55);
  albedo = mix(albedo, SHEEN, fiddle * 0.07);
  albedo = tintShift(albedo, (lateSoft - 0.5) * 0.012, 1.05, 0.97 + 0.06 * fiddle);
  albedo *= 0.92 + 0.14 * rip;
  albedo = mix(albedo, albedo * 1.16, handling * 0.30);
  albedo = mix(albedo, WALNUT_DARK * 0.8, pore * 0.30);
  albedo = mix(albedo, WALNUT_LIGHT * 1.14, sat(ding + scuff * 0.6) * 0.45);
  albedo *= 0.98 + 0.04 * micro;

  // Satin oil: low roughness overall, but never uniform.
  float rough = 0.34;
  rough -= handling * 0.12;
  rough -= oilPatch * 0.06;
  rough += pore * (1.0 - fill) * 0.42;
  rough += late * 0.06;
  rough += sat(ding + scuff) * 0.30;
  rough += (micro - 0.5) * 0.06;
  rough += (rip - 0.5) * 0.05;

  float ao = 1.0 - pore * 0.22 - ding * 0.30 - mineral * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

export const WOOD_SPECS: MaterialSpec[] = [
  {
    id: 'wood_plank',
    surface: 'wood',
    body: WOOD_PLANK,
    res: 'high',
    relief: 0.016,
    reliefWide: 0.25,
    tileMeters: 2.0,
    eager: true,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.1, envMapIntensity: 0.9, aoMapIntensity: 1.0 },
  },
  {
    id: 'wood_crate',
    surface: 'wood',
    body: WOOD_CRATE,
    res: 'medium',
    relief: 0.018,
    reliefWide: 0.24,
    tileMeters: 1.4,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.1, envMapIntensity: 0.9, aoMapIntensity: 1.0 },
  },
  {
    id: 'wood_painted',
    surface: 'wood',
    body: WOOD_PAINTED,
    res: 'medium',
    relief: 0.014,
    reliefWide: 0.28,
    tileMeters: 1.8,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.05, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'gun_wood',
    surface: 'wood',
    body: GUN_WOOD,
    res: 'high',
    relief: 0.0045,
    reliefWide: 0.20,
    tileMeters: 0.45,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 0.8, envMapIntensity: 1.1, aoMapIntensity: 0.8 },
  },
];
