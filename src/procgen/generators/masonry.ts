import type { MaterialSpec } from './types';

/**
 * Masonry and units. These need a real running-bond lattice: per-brick colour,
 * per-brick height, recessed mortar with its own texture, and wear that follows
 * the arris of each unit rather than a noise field.
 */

/**
 * Shared by both brick bodies: the bond, and the per-unit sampling frame that
 * keeps one brick's face from being a copy of its neighbour's.
 *
 * 8 x 24 units over a 1.8 m tile is a 225 x 75 mm module, which is a 215 x 65 mm
 * brick with a 10 mm joint — the standard metric format.
 */
const BRICK_COMMON = /* glsl */ `
const vec2 BOND = vec2(8.0, 24.0);

/**
 * Cells of face detail across one unit, held at about three texels each.
 *
 * The old body asked for a fixed 26, which is two texels at the high tier and
 * under one at the low, where it stops being texture and becomes noise in the
 * mip chain.
 */
float faceCells(float perUnit) {
  return clamp(1.0 / (BOND.x * max(uTexel.x, 1e-6)) / perUnit, 3.0, 48.0);
}

/**
 * Local frame for a per-unit noise lookup: mirrored, scaled and offset by a
 * fraction of the field's period.
 *
 * Each of the three does something the others cannot. The offset moves the unit
 * to a different part of the field, but only a *fractional* one — an integer
 * offset is a lattice shift, and a multiple of the period is not even that. The
 * mirror breaks the large forms, which no offset inside one period can. The
 * scale changes the feature size, so two units never read as the same brick at
 * a different position.
 */
vec2 faceUv(vec2 luv, vec2 id2, float cells, float salt) {
  float scale = 0.72 + hash12(id2 + salt) * 0.7;
  return cellFlip(luv, id2, salt + 5.1) * cells * scale + cellOffset(id2, vec2(cells), salt);
}
`;

const BRICK_RED = /* glsl */ `
const vec3 CLAY_RED = vec3(0.404, 0.168, 0.122);
const vec3 CLAY_ORANGE = vec3(0.556, 0.286, 0.166);
const vec3 CLAY_PLUM = vec3(0.288, 0.148, 0.142);
const vec3 CLAY_PALE = vec3(0.508, 0.372, 0.288);
const vec3 CLAY_DARK = vec3(0.144, 0.092, 0.092);
const vec3 MORTAR = vec3(0.474, 0.462, 0.436);

/**
 * Clay body colour from three independent hashes rather than a walk along one
 * palette line.
 *
 * A single hash can only ever produce a one-parameter family of colours, so a
 * wall built from it has one axis of variation and reads as a handful of bricks
 * repeated however many cells the lattice has. Hue, saturation and value have to
 * move independently. \`batch\` is a low-frequency field laid over the top, so
 * neighbours still share a firing the way a real delivery does.
 */
vec3 clayColour(vec3 rnd, float batch) {
  vec3 c = mix(CLAY_RED, CLAY_ORANGE, sat(rnd.x * 1.5 + batch * 0.34 - 0.17));
  c = mix(c, CLAY_PLUM, sat(rnd.y * 2.0 - 0.9));
  c = mix(c, CLAY_PALE, sat(rnd.z * 1.6 - 0.95));
  // Over-fired headers: a handful per wall, and the wall is dead without them.
  c = mix(c, CLAY_DARK, smoothstep(0.90, 0.98, fract(rnd.x + rnd.z)) * 0.8);
  return tintShift(
    c,
    (rnd.y - 0.5) * 0.030 + (batch - 0.5) * 0.010,
    0.70 + rnd.z * 0.62,
    0.80 + rnd.x * 0.40);
}

void surface(vec2 uv, inout Surface s) {
  // 10 mm joint on a 225 mm module, widened only where the tier cannot resolve it.
  float jointU = jointUnits(0.024, BOND.x);
  Masonry b = masonryCell(uv, BOND, jointU, 0.42, 0.85);
  float joint = 1.0 - b.face;
  vec2 lu = b.luv;

  float fine = faceCells(3.0);
  float coarse = faceCells(24.0);
  float sand = fbmValue2(faceUv(lu, b.id2, fine, 2.3), vec2(fine), 3);
  float blotch = fbmValue2(faceUv(lu, b.id2, coarse, 7.9), vec2(coarse), 3);

  // Bricks are laid by hand: each face sits a little proud or shy of the line
  // and out of plane with it. This is most of what a wall looks like under the
  // flat indirect light of an interior, where a normal map has little else to
  // catch, and it costs one dot product.
  vec2 tiltDir = b.rnd.xy - 0.5;
  float tilt = dot(lu - 0.5, tiltDir) * 2.0;
  float proud = (b.rnd.z - 0.5) * 2.0;

  // Skin lost from an arris, and the shallow dish of a slop-moulded face.
  float chipField = worley2(faceUv(lu, b.id2, 4.0, 13.3), vec2(4.0), 1.0).x;
  float chipEdge = smoothstep(0.55, 0.0, min(b.dist.x * 3.4, b.dist.y * 1.4));
  float spall = (1.0 - smoothstep(0.16, 0.5, chipField)) *
    smoothstep(0.55, 0.85, hash12(b.id2 + 3.7)) * b.face * (0.35 + chipEdge);
  float frog = 1.0 - pow(length((lu - 0.5) * vec2(1.1, 2.2)), 2.2) * 0.8;

  // Mortar. Sampled in tile space so it runs continuously along a joint rather
  // than restarting at every unit, and per-texel so the sand never aliases.
  float mortarSand = grainNoise(uv, 170.0, 3);
  float grit = 1.0 - smoothstep(0.06, 0.42, grainWorley(uv + 5.0, 110.0, 1.0).x);
  // Pointing is repaired in patches, decades apart, and never matches.
  float repoint = smoothstep(0.42, 0.68, fbm2(uv * 3.0 + 41.0, vec2(3.0), 3) * 0.5 + 0.5);
  // How far the pointing is struck back, run by run: flush where it was repaired,
  // weathered right out elsewhere. A wall whose joints are all the same depth
  // repeats its own course rhythm exactly, which is half of what the tiling
  // measurement sees; this is also simply what an old wall looks like.
  float strike = 0.18 + 1.10 * fbmValue2(uv * vec2(6.0, 13.0) + 21.0, vec2(6.0, 13.0), 3);
  strike = min(strike, 1.20) * mix(1.0, 0.45, repoint);
  float recessed = joint * strike;

  // Weathering.
  //
  // None of it is allowed to key off uv.y. A ramp up the tile is the obvious way
  // to author rising damp or a rain-washed head, and it is also a guarantee of
  // visible tiling: every repeat then carries the same dark foot and the same
  // bright top, which at ten metres is a stack of horizontal bands. Height above
  // the ground is world-space information the tile does not have, and the macro
  // layer already applies it there. What belongs here is the part that is
  // patchy rather than positional.
  // The scale of it matters as much as the amount. A stain a metre across is
  // half the tile, so at any distance where the tile repeats it repeats too, and
  // reads as a pattern rather than as dirt. Everything here is therefore kept
  // under about a quarter of the tile; the metre-and-up variation is the world
  // space macro layer's job, where it is continuous across the repeat.
  float damp = patchiness(uv + 4.5, 16.0, 4) * 0.9;
  float saltField = fbm2(warp2(uv * 7.0 - 4.0, vec2(7.0), 0.5, 3), vec2(7.0), 4) * 0.5 + 0.5;
  float efflor = smoothstep(0.52, 0.86, saltField) * (joint * 0.55 + 0.45) * (0.30 + damp * 1.2);
  float moss = smoothstep(0.5, 0.92, turbulence2(uv * 11.0 + 21.0, vec2(11.0), 4)) * damp * 1.1;
  float streak = dripStreaks(uv, 17.0, 0.5, 31.0) * 0.7 + dripStreaks(uv, 31.0, 0.28, 77.0) * 0.5;
  float soot = smoothstep(0.34, 0.86, turbulence2(uv * vec2(6.0, 9.0) + 63.0, vec2(6.0, 9.0), 5));
  float washed = patchiness(uv - 6.0, 8.0, 3) * (1.0 - damp);
  // Settled dust sits on the ledge every course presents, so it reads on the
  // lower lip of a joint and nowhere else.
  float ledge = sat(1.0 - b.skyBias * 2.0) * joint;

  // A crack runs across courses; a joint that has lost its pointing does not.
  float crackField = ridged2(warp2(uv * vec2(3.0, 7.0) + 88.0, vec2(3.0, 7.0), 0.7, 3),
    vec2(3.0, 7.0), 4, 0.55, 3.2);
  float crack = smoothstep(0.90, 0.99, crackField) * smoothstep(0.35, 0.6, saltField);
  float lostJoint = smoothstep(0.62, 0.86, fbm2(uv * 4.0 - 19.0, vec2(4.0), 3) * 0.5 + 0.5) * joint;

  float height = 0.26
    + (1.0 - recessed) * 0.46
    + tilt * 0.13 * b.face
    + proud * 0.06 * b.face
    + (sand - 0.5) * 0.035 * b.face
    + (blotch - 0.5) * 0.05 * b.face
    + frog * 0.02 * b.face
    + (mortarSand - 0.5) * 0.05 * joint
    + grit * 0.05 * joint
    - repoint * 0.05 * joint
    - lostJoint * 0.10
    - spall * 0.14
    - crack * 0.22;

  // Bricks arrive by the pallet and no two pallets match, so the body colour has
  // a component coarser than one unit. Kept weak: anything with real contrast at
  // this scale is a low-frequency feature inside the tile, and a low-frequency
  // feature inside a tile is what a repeat looks like from ten metres away.
  float batch = 0.5 + 0.5 * fbm2(uv * vec2(4.0, 6.0) + 55.0, vec2(4.0, 6.0), 3);
  vec3 albedo = clayColour(b.rnd, batch);
  albedo *= 0.84 + 0.30 * blotch;
  albedo *= 0.90 + 0.20 * sand;
  albedo = mix(albedo, albedo * 1.30 + vec3(0.055, 0.038, 0.026), spall * 0.85);
  // Pointing is never one colour along a run: sand, cement and age all vary.
  float mortarTone = 0.60 + 0.58 * fbmValue2(uv * vec2(9.0, 26.0) + 3.3, vec2(9.0, 26.0), 3);
  vec3 mortar = MORTAR * (0.84 + 0.30 * mortarSand) * mortarTone * mix(1.0, 0.80, repoint);
  // How much the joint reads as a joint at all, run by run. Only clean raked
  // pointing is a bright line against the body: weathered flush, dirty or
  // repointed, it sits within a few levels of the brick. The geometry alone
  // does not know that, so the blend was full strength on every course and the
  // wall carried a mortar stripe at exactly its course pitch from top to
  // bottom — which is most of what the periodicity measurement was seeing.
  float jointShow = sat(0.30 + 0.62 * strike - repoint * 0.30);
  albedo = mix(albedo, mortar, joint * jointShow);
  // The lip a course overhangs never gets rained on and never dries out.
  albedo = mix(albedo, vec3(0.150, 0.140, 0.130), joint * smoothstep(0.5, 1.0, b.skyBias) * 0.42);
  albedo = mix(albedo, vec3(0.786, 0.774, 0.746), efflor * 0.6);
  albedo = mix(albedo, vec3(0.126, 0.152, 0.096), moss * 0.5);
  albedo = mix(albedo, vec3(0.104, 0.092, 0.084), sat(streak) * 0.55);
  // Dirt keys into lime mortar and runs off fired clay, so the joints go first.
  // It is also what pulls their tone back towards the brick, and a joint that is
  // a bright stripe against the body is most of what reads as printed wallpaper.
  albedo = mix(albedo, vec3(0.156, 0.146, 0.138), soot * (0.24 + joint * 0.56));
  albedo = mix(albedo, vec3(0.238, 0.224, 0.204), ledge * 0.32);
  albedo = mix(albedo, albedo * 1.08, washed * 0.20);
  albedo = mix(albedo, albedo * 0.78, damp * 0.30);
  albedo = mix(albedo, albedo * 0.45, crack * 0.8);

  // Roughness carries as much of the read as albedo at a metre: fired clay,
  // sanded mortar, salt bloom and a damp patch are four different materials.
  float rough = mix(0.94, 0.74, b.face);
  rough += (b.rnd.y - 0.5) * 0.16 * b.face;
  rough += (blotch - 0.5) * 0.14 * b.face;
  rough += (mortarSand - 0.5) * 0.10 * joint;
  rough += efflor * 0.10;
  rough += moss * 0.05;
  rough += spall * 0.10;
  rough += soot * 0.07;
  rough += ledge * 0.06;
  rough -= streak * 0.16;
  rough -= damp * 0.26;
  rough -= washed * 0.05;

  // The recess is the base occlusion; the sky bias is what puts a light and a
  // dark edge on opposite sides of it.
  //
  // This channel is weighted towards *sky* visibility rather than the whole
  // sphere. The two are the same thing on a convex surface and very different
  // inside a horizontal slot, where the top of the slot has lost the sky and the
  // bottom has lost the ground. Sky-weighted is the choice every reference photo
  // of a brick wall is made under, and it is the only one that survives this
  // scene's environment, whose lower hemisphere carries a sunlit ground bounce
  // several times the zenith and so shades a joint the wrong way round.
  //
  // The settled-dust term is deliberately absent from this channel. It sits on the
  // lower lip, which is the half of the joint the sky still reaches, so occluding
  // it works directly against the recess above and flattens the very gradient this
  // is here to produce. Dust is a deposit; it belongs in albedo and roughness.
  float recess = recessed * mix(0.05, 0.78, b.skyBias);
  float ao = 1.0
    - recess
    - b.arris * 0.08
    - moss * 0.15
    - sat(streak) * 0.10
    - soot * 0.10
    - spall * 0.10
    - crack * 0.40
    - lostJoint * 0.16;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const BRICK_PAINTED = /* glsl */ `
const vec3 PAINT_A = vec3(0.766, 0.748, 0.704);
const vec3 PAINT_B = vec3(0.648, 0.638, 0.616);
const vec3 CLAY = vec3(0.398, 0.192, 0.142);
// Lime pointing that has been painted over and weathered, not fresh cement: it
// sits within a few levels of the coat. The darker grey a bare wall wants put
// this wall's joints 57 levels under its faces, and since a joint is the one
// feature that runs dead level across the whole tile, that difference is the
// course comb — measured as a +0.24 autocorrelation peak at the course pitch.
const vec3 MORTAR = vec3(0.632, 0.618, 0.588);

void surface(vec2 uv, inout Surface s) {
  // A painted wall was pointed flush and then filled by the coat, so both the
  // joint and its chamfer are wider and shallower than on bare brick.
  float jointU = jointUnits(0.030, BOND.x);
  Masonry b = masonryCell(uv, BOND, jointU, 0.72, 0.85);
  float joint = 1.0 - b.face;

  float fine = faceCells(3.0);
  float bumps = fbmValue2(faceUv(b.luv, b.id2, fine, 4.7), vec2(fine), 3);
  float sand = grainNoise(uv, 260.0, 3);
  float tilt = dot(b.luv - 0.5, b.rnd.xy - 0.5) * 2.0;

  float coatField = fbm2(warp2(uv * 5.0, vec2(5.0), 0.6, 3), vec2(5.0), 5) * 0.5 + 0.5;
  // How readily the coat lets go of a joint, run by run. Paint does go from a
  // joint before a face — the mortar under it is porous and the arris is what
  // gets knocked — but applying that equally to every joint paints a mortar
  // stripe at the course pitch from top to bottom of the wall, which measured as
  // the joint sitting 24 levels below the face and a perfectly level comb in the
  // autocorrelation. Where it lets go is patchy, so this is too.
  // Sampled at 31 cycles up a 24-course tile so consecutive courses land on
  // opposite phases; at 11 the field was coarser than the course pitch and every
  // run in a neighbourhood let go together, which is a comb rather than a patch.
  float jointGrip = 0.15 + 0.85 * fbmValue2(uv * vec2(6.0, 31.0) + 17.0, vec2(6.0, 31.0), 3);
  // Paint lets go at an arris before anywhere else, but not at every arris, and
  // this is the term that decided the whole measurement. b.arris is a band on all
  // four edges of every unit; driving coat loss with it flat lifted loss over the
  // entire chamfer, and the chamfer is where b.face is part-way up, so what came
  // through was the clay — 90 levels under the coat — as a continuous dark ring
  // round every brick. Level, exactly periodic, on all four sides: which is both
  // the course comb the autocorrelation was reading and, in albedo, precisely the
  // painted bevel identical on all four sides that the review objected to.
  //
  // Chips go where the wall has been knocked, a few units at a time, so the term
  // is gated on a per-unit hash and a patch field and reaches full strength only
  // there. Nothing here keys off uv.y: a ramp up the tile is the same worn foot on
  // every repeat, and height above ground is world-space information the macro
  // layer already applies.
  float knocked = smoothstep(0.34, 0.80, patchiness(uv - 23.0, vec2(4.0, 7.0), 3)) *
    smoothstep(0.28, 0.68, hash12(b.id2 + 29.0));
  float wearEdge = b.arris * (0.10 + 0.80 * knocked) +
    joint * 0.22 * jointGrip + (b.rnd.x - 0.5) * 0.22;
  float loss = smoothstep(0.50, 0.66, coatField + wearEdge * 0.35);
  float coat = 1.0 - loss;
  float chipLip = band(coatField + wearEdge * 0.35, 0.52, 0.05) * coat;

  float brush = fbm2(slant(uv, vec2(40.0, 6.0), 1.0), vec2(40.0, 6.0), 3) * 0.5 + 0.5;
  float roller = fbmValue2(uv * vec2(4.0, 60.0), vec2(4.0, 60.0), 3);

  float damp = patchiness(uv + 12.5, 12.0, 4) * 0.9;
  float grime = smoothstep(0.40, 0.88, turbulence2(uv * vec2(4.0, 5.0) + 44.0, vec2(4.0, 5.0), 5)) *
    (0.4 + damp * 0.9);
  float streak = sat(dripStreaks(uv, 15.0, 0.7, 44.0) + dripStreaks(uv, 31.0, 0.3, 9.0) * 0.5);
  // Dust on the lower lip of a course, gated so it is on some runs and not
  // others. Ungated it is a stripe on all twenty-four courses of the tile.
  float ledge = sat(1.0 - b.skyBias * 2.0) * joint *
    (0.25 + 1.05 * patchiness(uv + 61.0, vec2(4.0, 12.0), 3));

  float height = 0.24
    + b.face * 0.34
    + tilt * 0.09 * b.face
    + (b.rnd.z - 0.5) * 0.07 * b.face
    + coat * 0.09
    + chipLip * 0.05
    + (bumps - 0.5) * 0.05 * b.face
    + (sand - 0.5) * 0.06 * (joint + loss)
    + (brush - 0.5) * 0.03 * coat;

  vec3 base = mix(PAINT_B, PAINT_A, brush * 0.6 + roller * 0.4);
  base = tintShift(base, (b.rnd.y - 0.5) * 0.012, 0.92, 0.94 + b.rnd.z * 0.12);
  vec3 exposed = mix(MORTAR * (0.86 + 0.28 * sand), CLAY * (0.82 + 0.36 * bumps), b.face);
  // A knocked arris shows the brick's body rather than its fired face: sandy,
  // pinker and much closer to the coat in value than the skin it lost.
  exposed = mix(exposed, vec3(0.508, 0.356, 0.290) * (0.84 + 0.32 * sand), b.arris * 0.75);
  vec3 albedo = mix(exposed, base, coat);
  albedo = tintShift(albedo, (roller - 0.5) * 0.015, 0.9, 1.0);
  albedo = mix(albedo, base * 1.08, chipLip * 0.6);
  albedo = mix(albedo, vec3(0.172, 0.164, 0.150), grime * 0.5);
  albedo = mix(albedo, vec3(0.128, 0.118, 0.108), streak * 0.55);
  // Dust settled on the lower lip of each course. The colour is not the one the
  // bare-brick body uses: a mid grey reads as a light deposit against dark red
  // clay and as a dark stripe against cream paint, and inheriting it put the
  // joints 40 levels below the face on every course. It is held within a few
  // levels of the coat and given its read by hue instead, because value is the
  // one thing a level feature cannot carry without becoming a comb.
  albedo = mix(albedo, vec3(0.606, 0.572, 0.508), ledge * 0.30);
  albedo *= 0.94 + 0.12 * bumps;

  float rough = mix(0.95, 0.60, coat);
  rough += (roller - 0.5) * 0.16 * coat;
  rough += (bumps - 0.5) * 0.10;
  rough += grime * 0.12;
  rough += ledge * 0.06;
  rough -= streak * 0.14;
  rough -= damp * 0.14;

  // The value the albedo no longer carries, moved into occlusion, where it is a
  // gradient across the joint rather than a flat step and so reads as a recess
  // under the sky instead of as a printed line.
  //
  // The ledge term below has to stay small however much dust it deposits. It sits
  // on the lower lip, which is the half of the joint the sky still reaches, so in
  // occlusion it pulls directly against the recess: at 0.16 the two cancelled and
  // the measured profile across a bed joint came out flat to 1.5 levels — the
  // painted-bevel reading, on a joint whose geometry was right the whole time.
  float recess = joint * mix(0.06, 0.72, b.skyBias);
  float ao = 1.0
    - recess * coat
    - joint * 0.30 * loss
    - grime * 0.14
    - streak * 0.08;

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
  float glazePool = fbm2(cellFlip(t.luv, t.id2, 6.1) * 3.0 + cellOffset(t.id2, vec2(3.0), 7.0),
    vec2(3.0), 3) * 0.5 + 0.5;

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
    body: BRICK_COMMON + BRICK_RED,
    res: 'high',
    // 0.46 of the height range is now the face-to-bed step, so this is a 15 mm
    // recess on a 10 mm joint: a shade deeper than life, which is what it takes
    // to survive a mip level.
    relief: 0.018,
    reliefWide: 0.18,
    tileMeters: 1.8,
    eager: true,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.4, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
  },
  {
    id: 'brick_painted',
    surface: 'brick',
    body: BRICK_COMMON + BRICK_PAINTED,
    // Held at a quarter of the bare brick's texels on purpose. Doubling it was
    // tried against the course comb and made it worse, not better — sharper
    // joints on the same lattice — which located the comb in the joint's tone
    // rather than in its resolution. The bare brick is what the level puts a
    // metre from the player; this is a secondary facade.
    res: 'medium',
    relief: 0.017,
    reliefWide: 0.26,
    tileMeters: 1.8,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.15, envMapIntensity: 1.0, aoMapIntensity: 1.0 },
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
