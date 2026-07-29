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

/**
 * Growth-ring fields for the three ways a log actually gets converted.
 *
 * These used to be one function with a hue parameter, and that is exactly what
 * a reviewer sees: the same swirl on the ceiling boards, the ammunition crates
 * and the plywood, in three colours. The figure a board shows is not a style
 * choice, it is a consequence of where the saw went through the log, and the
 * three conversions produce three topologically different fields:
 *
 *   plainsawn    cut tangentially, so the rings meet the face at a shallow
 *                angle and appear as nested arches - cathedral figure. Wide,
 *                busy, and different on every board.
 *   quartersawn  cut radially, so the rings meet the face nearly square on and
 *                appear as straight parallel stripes, tight and even, with ray
 *                fleck across them.
 *   rotary       peeled off the log on a lathe, so one continuous sweep of
 *                ring after ring: very wide bands that widen and pinch along
 *                the sheet, plus the lathe checks the knife leaves.
 *
 * All three take board-local uv with the grain running along luv.y.
 */
export const GRAIN_GLSL = /* glsl */ `
/** Slow 1-D drift along the grain. Cheap: the second axis carries no lattice. */
float alongGrain(float v, float cells, float seed, int octaves) {
  return fbm2(vec2(v * cells + seed * 7.3, 0.5), vec2(cells, 1.0), octaves);
}

/**
 * Rings across a board, capped at what the bake can resolve.
 *
 * A ring narrower than about five texels is not a ring, it is a moire pattern in
 * the mip chain — and the low tier bakes a crate slat twenty-eight texels wide,
 * where the authored count would have put four rings inside every texel.
 */
float ringCount(float want, float boardsAcross) {
  float texels = 1.0 / (boardsAcross * max(uTexel.x, 1e-6));
  return clamp(texels / 5.0, 3.0, want);
}

/**
 * Plainsawn. The ring coordinate is the distance from the pith *plane*, and the
 * board's distance from that plane breathes along its length as the log tapers
 * and the pith wanders. Where it pinches, the rings close into nested arches;
 * where it opens they run out nearly straight. That alternation is the figure.
 */
float grainPlainsawn(vec2 luv, float rings, float flare, float seed) {
  float pith = hash11(seed + 0.7) * 1.4 - 0.2;
  float d = 0.05 + flare * (alongGrain(luv.y, 2.0, seed, 3) * 0.5 + 0.5);
  float x = luv.x - pith + alongGrain(luv.y, 5.0, seed + 1.9, 3) * 0.10;
  return sqrt(x * x + d * d) * rings * 2.2 + hash11(seed + 4.1) * 6.0;
}

/**
 * Quartersawn. Straight parallel rings; the only curvature is the slow runout
 * of a log that was never quite straight.
 */
float grainQuartersawn(float luvX, float luvY, float rings, float wander, float seed) {
  float run = alongGrain(luvY, 3.0, seed + 2.7, 3) * wander;
  return (luvX + run) * rings + hash11(seed + 5.3) * 6.0;
}

/** Ray fleck: the short bright flashes across a quartersawn face. */
float rayFleck(vec2 luv, float cells, float seed) {
  vec2 c = vec2(cells, max(2.0, floor(cells * 0.22)));
  vec3 w = worley2(vec2(luv.x * c.x + seed * 3.1, luv.y * c.y), c, 0.95);
  return (1.0 - smoothstep(0.10, 0.40, w.x)) * step(0.55, w.z);
}

/**
 * Rotary-cut veneer. One unbroken peel off the log, so the ring spacing widens
 * monotonically across the sheet rather than mirroring about a pith, and a
 * single sweep can run the whole width.
 */
float grainRotary(vec2 luv, float rings, float sweep, float seed) {
  float s = alongGrain(luv.y, 1.5, seed, 2) * sweep;
  float x = sat(luv.x + s * 0.5 + hash11(seed + 0.3));
  return (x + 0.9 * x * x) * rings + hash11(seed + 8.8) * 6.0;
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

/**
 * The tight cluster of small dead knots a fast-grown plantation log carries at
 * every whorl. Returns (mask, disturbance) for the nearest one.
 */
vec2 knotWhorl(vec2 luv, float count, float radius, float seed) {
  float rows = max(1.0, floor(count));
  float v = luv.y * rows + hash11(seed + 1.1) * rows;
  float row = floor(v);
  vec2 h = hash22(vec2(mod(row, rows), seed * 13.0 + 3.0));
  vec2 at = vec2(0.18 + h.x * 0.64, (row + 0.25 + h.y * 0.5 - hash11(seed + 1.1) * rows) / rows);
  float r = radius * (0.55 + h.x * 0.9);
  vec2 k = knot(luv, at, r, seed + row);
  return k * step(0.30, h.y);
}
`;

const WOOD_PLANK = /* glsl */ `
${GRAIN_GLSL}
const vec3 PINE_LIGHT = vec3(0.622, 0.510, 0.356);
const vec3 PINE_LATE = vec3(0.438, 0.320, 0.198);
const vec3 SILVER = vec3(0.428, 0.412, 0.382);
const vec3 SILVER_COOL = vec3(0.372, 0.376, 0.372);

void surface(vec2 uv, inout Surface s) {
  // Weathered exterior boarding, plainsawn: 250 mm boards with broad cathedral
  // figure. Years of sun have lifted the earlywood away and left the latewood
  // standing proud, silvered the surface and opened checks along the grain; the
  // nails have bled rust into the timber.
  Board b = boardCell(uv, 8.0, 2.0, 0.012);
  float gap = 1.0 - b.face;
  vec2 lu = b.luv;
  float seed = b.segId;

  float coord = grainPlainsawn(lu, ringCount(9.0, 8.0), 0.42, seed);
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

  float weather = patchiness(uv + 3.3, 5.0, 3);
  float greying = sat(0.45 + 0.55 * weather - lateWide * 0.25);
  // Patchy rather than a ramp up the tile: a ramp puts the same dark foot on
  // every repeat, which is a band across the wall at any distance.
  float damp = patchiness(uv + 8.0, 7.0, 3) * 0.85;
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

  // A weathered soffit is not one material: sound resinous board, silvered board
  // whose fibres have raised, and a damp patch are three different specular
  // responses, and the difference between them is most of what stops a timber
  // ceiling reading as one flat sheet of brown. Authored as a base of 0.90 with
  // corrections of a few hundredths it measured 5 levels of variation out of 255
  // over 8x8 blocks, which is the uniform-roughness reading. The span has to be
  // driven by the fields that vary at board and patch scale -- greying and a
  // per-board hash -- because anything at grain frequency averages away in the
  // first mip.
  float sound = hash11(b.boardId + 4.7);
  float rough = mix(0.60, 0.99, greying);
  rough -= sound * 0.15;
  rough -= late * 0.09;
  rough += (rip - 0.5) * 0.10;
  rough += algae * 0.09;
  rough -= damp * 0.30;
  rough += check * 0.08;

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
  // Rough-sawn packing crate: narrow 155 mm slats off riftsawn plantation
  // stock, so the rings are straight and tight rather than figured, and every
  // whorl of the fast-grown log has left a cluster of small dead knots.
  Board b = boardCell(uv, 7.0, 3.0, 0.016);
  float gap = 1.0 - b.face;
  vec2 lu = b.luv;
  float seed = b.segId;

  float coord = grainQuartersawn(lu.x, lu.y, ringCount(16.0, 7.0), 0.09, seed);
  vec2 kn = knotWhorl(lu, 3.0, 0.055, seed);
  float knotMask = kn.x;
  coord += kn.y * 4.0;
  float late = latewood(coord, 0.26);
  float fleck = rayFleck(lu, detailCells(46.0), seed);

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
  float damp = patchiness(uv + 9.5, 8.0, 3) * 0.8;

  float height = 0.52
    + b.face * 0.20
    + late * 0.10
    + kerf * 0.07
    + (rip - 0.5) * 0.12
    + (fibre - 0.5) * 0.05
    + fleck * 0.03
    - knotMask * 0.07
    - splinter * 0.16
    - edgeSoft * 0.07
    - bruise * 0.03
    - gap * 0.60
    + (b.boardId - 0.5) * 0.06;

  vec3 albedo = mix(PINE, PINE_LATE, late * 0.9);
  albedo = mix(albedo, PINE_LATE * 0.52, knotMask * 0.95);
  albedo = mix(albedo, PINE * 1.12, fleck * 0.30);
  albedo = tintShift(albedo, (b.boardId - 0.5) * 0.025, 0.9, 0.88 + 0.24 * b.boardId);
  albedo *= 0.90 + 0.18 * rip;
  albedo = mix(albedo, DIRTY, grime * 0.38 + dust * 0.30);
  albedo = mix(albedo, DIRTY * 0.62, damp * 0.30);
  albedo = mix(albedo, PINE * 1.10, splinter * 0.35);
  albedo = mix(albedo, STENCIL, ink * 0.88);
  albedo = mix(albedo, vec3(0.118, 0.098, 0.076), gap * 0.85);
  albedo *= 0.97 + 0.06 * fibre;

  // Sawn softwood is more uniform than a weathered board, but not this uniform:
  // a slat still carries planer polish where the knife was sharp, resin bleed at
  // the knots, and furred grain where it has been rained on. The board hash and
  // the grime patch carry it, since only those vary at a scale that survives the
  // mip chain -- the grain-frequency terms below average out in the first level.
  float planed = hash11(b.boardId + 8.3);
  float rough = 0.96 - planed * 0.26;
  rough -= grime * 0.14;
  rough += (rip - 0.5) * 0.10;
  rough += dust * 0.05;
  rough -= damp * 0.26;
  rough -= ink * 0.10;
  rough -= fleck * 0.08;
  rough += knotMask * 0.05;
  rough += splinter * 0.04;

  float ao = 1.0
    - gap * 0.62
    - edgeSoft * 0.18
    - splinter * 0.20
    - dust * 0.14
    - knotMask * 0.16;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const WOOD_PAINTED = /* glsl */ `
${GRAIN_GLSL}
// A cool coat over warm veneer. Authored within a few points of each other in
// hue, the sheet still read as one flat colour wherever the paint had gone.
const vec3 COAT = vec3(0.596, 0.602, 0.574);
const vec3 COAT_DEEP = vec3(0.482, 0.494, 0.478);
const vec3 UNDERCOAT = vec3(0.716, 0.706, 0.674);
const vec3 BARE = vec3(0.582, 0.442, 0.282);
const vec3 BARE_LATE = vec3(0.394, 0.280, 0.162);

void surface(vec2 uv, inout Surface s) {
  // Painted plywood sheeting, not boarding. The difference is not decorative:
  // sheet goods have no plank lattice at all, their face veneer is peeled off a
  // lathe rather than sawn, and what shows through failing paint is the
  // veneer's long sweeping bands, the knife's lathe checks and the oval patches
  // where a defect was cut out and plugged at the mill.
  Cell sheet = gridCell(uv, vec2(2.0, 1.0), 0.010);
  float gap = 1.0 - sheet.face;
  vec2 lu = sheet.luv;
  float seed = sheet.id;

  // Rotary veneer's figure is broad, but seven bands across a 900 mm sheet is
  // broad enough to have no figure at all: measured, the sheet came out isotropic
  // and read as stained plaster rather than as plywood.
  float coord = grainRotary(lu, ringCount(15.0, 2.0), 0.42, seed);
  float late = latewood(coord, 0.34);
  float lateSoft = latewood(coord, 0.52);
  float rip = grainAniso(lu, vec2(60.0, 9.0), 3);
  float fibre = grainNoise(uv, 230.0, 2);

  // Lathe checks: the regular fine splits the peeling knife leaves across the
  // grain, every couple of millimetres. Nothing sawn has them.
  float checkCells = detailCells(150.0);
  float lathe = pow(sat(1.0 - abs(fract(lu.y * checkCells + rip * 0.6) - 0.5) * 3.4), 3.0);

  // Face-veneer repair patches, cut as ovals and glued back in cross-grain.
  vec3 patchCell = worley2(lu * vec2(4.0, 3.0) + seed * 5.7, vec2(4.0, 3.0), 0.9);
  float plug = (1.0 - smoothstep(0.16, 0.24, patchCell.x)) * step(0.72, patchCell.z);
  float plugEdge = band(patchCell.x, 0.20, 0.03) * step(0.72, patchCell.z);
  coord += plug * 3.3;

  // Fixings: screws every 300 mm down the studs, driven until the head dishes
  // the face veneer. These carry most of the sheet's relief — the coat itself
  // is 200 microns and telegraphs nothing.
  float studU = abs(fract(lu.x * 3.0 + 0.5) - 0.5) * 2.0;
  float screwV = (fract(uv.y * 6.0) - 0.5) / 6.0;
  float sd = length(vec2(studU * 0.16, screwV)) / 0.013;
  float dish = 1.0 - smoothstep(0.0, 1.6, sd);
  float screw = 1.0 - smoothstep(0.72, 1.0, sd);
  float slot = screw * (1.0 - smoothstep(0.16, 0.30, abs(studU * 0.16) / 0.013));

  // Failure is driven by the veneer's own splits and the exposed sheet edges.
  // The threshold has to sit inside the range the driving field actually
  // reaches: authored against a field centred on 0.41 it never fired, and the
  // sheet measured 5.8 per cent bare where it should read as a third gone.
  float edgeExpose = 1.0 - smoothstep(0.0, 0.05, min(sheet.dist.x * 2.0, sheet.dist.y));
  float sun = patchiness(uv + 7.7, 6.0, 3);
  float coatField = fbm2(warp2(uv * 5.0, vec2(5.0), 0.7, 4), vec2(5.0), 5) * 0.5 + 0.5;
  float coatFine = fbm2(warp2(uv * 15.0, vec2(15.0), 0.5, 3), vec2(15.0), 4) * 0.5 + 0.5;
  float drive = coatField * 0.72 + coatFine * 0.22 + edgeExpose * 0.34 +
    lathe * 0.06 + sun * 0.16 + dish * 0.10;
  float coat = 1.0 - smoothstep(0.54, 0.66, drive);
  float lip = band(drive, 0.57, 0.030) * coat;
  float primer = smoothBand(drive, 0.63, 0.75, 0.03);

  // Alligatoring: the crack network in an old oil coat.
  vec2 crazeUv = warp2(uv * 22.0, vec2(22.0), 0.2, 3);
  float craze = smoothstep(0.86, 0.98, ridged2(crazeUv, vec2(22.0), 4, 0.6, 3.2)) * coat;
  // Roller nap lays along the stroke, and a wall is rolled in vertical passes.
  float roller = fbmValue2(uv * vec2(70.0, 5.0), vec2(70.0, 5.0), 3);

  float grime = smoothstep(0.45, 0.9, turbulence2(uv * 6.0 + 41.0, vec2(6.0), 4));
  float streak = dripStreaks(uv, 18.0, 0.6, 29.0);
  float damp = patchiness(uv + 13.75, 8.0, 3) * 0.85;
  float mould = smoothstep(0.60, 0.94, turbulence2(uv * 10.0 - 8.0, vec2(10.0), 4)) * (0.3 + damp);

  // Sheets are never flat: they bow between fixings and the joints step.
  float bow = (0.5 - abs(lu.x - 0.5)) * (0.5 - abs(lu.y - 0.5)) * 4.0;
  float step_ = (hash11(seed + 2.4) - 0.5);

  float height = 0.40
    + sheet.face * 0.16
    + bow * 0.10
    + step_ * 0.06 * sheet.face
    + coat * 0.12
    + lip * 0.08
    + primer * 0.05
    + late * 0.09 * (1.0 - coat * 0.55)
    + lateSoft * 0.04 * (1.0 - coat * 0.55)
    + (rip - 0.5) * 0.08 * (1.0 - coat * 0.5)
    + (roller - 0.5) * 0.04 * coat
    + (fibre - 0.5) * 0.03
    + screw * 0.06
    - dish * 0.13
    - slot * 0.10
    - lathe * 0.07 * (1.0 - coat)
    - plugEdge * 0.10
    - craze * 0.12
    - gap * 0.55;

  vec3 bare = mix(BARE, BARE_LATE, late * 0.75 + lateSoft * 0.25);
  bare = mix(bare, BARE * 1.06, plug * 0.5);
  bare = mix(bare, bare * 0.82, sun * 0.3);
  vec3 paint = mix(COAT_DEEP, COAT, roller * 0.65 + 0.35);
  paint = mix(paint, paint * 1.06 + vec3(0.02), sun * 0.35);
  vec3 albedo = mix(bare, paint, coat);
  albedo = mix(albedo, UNDERCOAT, primer * 0.7);
  albedo = mix(albedo, paint * 1.10, lip * 0.55);
  albedo = tintShift(albedo, (seed - 0.5) * 0.015, 0.9, 0.96 + 0.08 * seed);
  albedo = mix(albedo, bare * 0.72, lathe * (1.0 - coat) * 0.4);
  // Even under sound paint the veneer's own figure shows: the latewood is harder
  // and takes the coat thinner, so the rings come through in value. This is the
  // only thing giving a painted sheet any direction at all, and at 0.12 it was
  // below the grime laid over it.
  albedo *= 1.0 - late * coat * 0.22 - lateSoft * coat * 0.06;
  albedo *= 1.0 + (rip - 0.5) * 0.10;
  albedo = mix(albedo, vec3(0.322, 0.284, 0.242), sat(dish - screw) * 0.35);
  albedo = mix(albedo, vec3(0.182, 0.174, 0.160), grime * 0.40);
  albedo = mix(albedo, vec3(0.140, 0.128, 0.110), streak * 0.5);
  albedo = mix(albedo, vec3(0.124, 0.142, 0.104), mould * 0.4);
  albedo = mix(albedo, vec3(0.098, 0.086, 0.072), gap * 0.85);
  albedo *= 0.97 + 0.06 * fibre;

  float rough = mix(0.92, 0.46, coat);
  rough += craze * 0.20;
  rough += (roller - 0.5) * 0.14 * coat;
  rough += lathe * 0.10 * (1.0 - coat);
  rough += late * coat * 0.08;
  rough += grime * 0.12;
  rough += mould * 0.10;
  rough -= streak * 0.10;
  rough -= damp * 0.08;
  rough += primer * 0.16;
  rough -= screw * 0.22;

  float ao = 1.0
    - gap * 0.58
    - craze * 0.20
    - (1.0 - coat) * 0.14
    - primer * 0.10
    - plugEdge * 0.22
    - dish * 0.18
    - mould * 0.12
    - streak * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = screw * 0.75;
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
    relief: 0.017,
    reliefWide: 0.28,
    tileMeters: 1.8,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.05, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
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
