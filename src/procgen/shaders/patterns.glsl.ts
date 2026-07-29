/**
 * Structural lattices: real cellular geometry rather than a noise field
 * pretending to be bricks. Every lattice wraps its cell indices through the
 * cell count so the pattern is seamless, which additionally requires an even
 * row count wherever a running bond shifts alternate rows.
 */
export const PATTERNS_GLSL = /* glsl */ `
#ifndef PROCGEN_PATTERNS
#define PROCGEN_PATTERNS

struct Cell {
  /** Position inside the cell, 0..1 on both axes. */
  vec2 luv;
  /** Wrapped integer cell coordinate. */
  vec2 id2;
  /** Stable per-cell hash, the handle for colour and height variation. */
  float id;
  /** Distance to the nearest cell border per axis, 0..0.5 in cell units. */
  vec2 dist;
  /** 0 inside the joint, 1 on the face. */
  float face;
};

/**
 * Decorrelating offset for a per-cell lookup into a lattice noise of \`period\`.
 *
 * Offsetting a periodic field by a constant leaves it periodic, so a per-cell
 * offset is the cheap way to give every cell its own patch of noise. The trap is
 * that an *integer* offset is a pure lattice shift: the cell still sees the same
 * features, just rotated, and an offset that is a whole multiple of the period
 * is not even that — \`id2 * 9\` into a field of period 3 hands every cell the
 * identical patch. A hashed fractional offset lands between lattice points, so
 * the interpolated field genuinely differs cell to cell.
 */
vec2 cellOffset(vec2 id2, vec2 period, float salt) {
  return (hash22(id2 + salt) + 0.5 / max(period, vec2(1.0))) * period;
}

/**
 * Per-cell mirror of the local uv. A fractional offset decorrelates the fine
 * detail; flipping decorrelates the large forms, which an offset inside one
 * period cannot.
 */
vec2 cellFlip(vec2 luv, vec2 id2, float salt) {
  vec2 f = step(0.5, hash22(id2 + salt));
  return abs(f - luv);
}

/** Signed jitter in (-0.5, 0.5) for lattice index \`i\`, stable under wrapping. */
float latticeJitter(float i, float count, float salt) {
  return hash12(vec2(mod(i, count), salt)) - 0.5;
}

struct Masonry {
  /** Position inside the unit, 0..1 on both axes. */
  vec2 luv;
  /** Wrapped integer unit coordinate. */
  vec2 id2;
  /** Stable per-unit hash, plus three more decorrelated from it. */
  float id;
  vec3 rnd;
  /** Distance to the nearest unit border per axis, 0..0.5 in unit units. */
  vec2 dist;
  /** 1 on the brick face, 0 anywhere in the joint. */
  float face;
  /** 1 on the flat floor of the raked joint, 0 on the face and its chamfer. */
  float bed;
  /** Narrow band along the unit's edge: the chamfer that catches the light. */
  float arris;
  /**
   * How much of the sky a point in a bed joint has lost to the course above:
   * 1 tucked under the overhang, 0 sitting on the course below, 0.5 on the face.
   *
   * This is the whole reason a real joint has a light and a dark edge, and it
   * lives in the ambient term rather than the normal, so it survives the flat
   * indirect lighting an interior actually has.
   */
  float skyBias;
  /** Unit size in uv, so local distances can be converted to tile units. */
  vec2 size;
};

/**
 * Running-bond masonry with the irregularity a laid wall actually has.
 *
 * A strict lattice is what makes procedural brick read as wallpaper: every
 * course lands on exactly the same line, so the row-mean of the image is a pure
 * comb and autocorrelates against itself perfectly one course later. Three
 * things break that, all of them things a bricklayer does anyway:
 *
 *   - course heights vary by a few millimetres, so the bed joints are not
 *     equally spaced;
 *   - each bed joint wanders along its length, independently of its neighbours,
 *     which is what smears a course out of the row-mean rather than just
 *     shifting it;
 *   - the bond offset is close to a half brick rather than exactly one, and
 *     perpends vary in width.
 *
 * All three stay seamless because every jitter is a function of the *wrapped*
 * index, so the unit at index 0 and the one at index \`count\` are the same unit.
 * \`counts.y\` no longer has to be even: the bond phase is per-course, not
 * alternating.
 *
 * \`jointU\` is the joint half-width in unit units and \`rake\` how much of it is
 * the chamfer rather than the flat bed.
 */
/**
 * Vertical displacement of course \`row\`'s bed joint at \`u\`, in courses.
 *
 * The two terms do different jobs against periodicity, and they cost different
 * things. Displacing a whole course changes the course height, which decorrelates
 * one course from the next and is free: uneven courses are what reclaimed brick
 * looks like. Making a joint wander along its length smears it out of the image's
 * row mean, which is the stronger effect on the measurement, but past a few
 * millimetres it reads as a wall a drunk laid — so it is kept short and local,
 * and the course height carries most of the amplitude.
 */
float bedLine(float u, float row, float counts, float irregular) {
  // A fractional salt, so no two courses wander together. An integer one would
  // wrap the noise back onto itself and move every course in step.
  float salt = hash12(vec2(mod(row, counts), 8.71));
  float longCells = 7.0;
  float shortCells = 19.0;
  float wander = fbmValue2(
    vec2(u * longCells + salt * longCells, 0.31), vec2(longCells, 1.0), 2) - 0.5;
  // A second, shorter octave. One wander period per brick length moves a joint
  // bodily and leaves it straight over any few bricks, which is still a level
  // line as far as the row mean is concerned; this one bends it within a brick.
  float ripple = fbmValue2(
    vec2(u * shortCells + salt * shortCells, 5.7), vec2(shortCells, 1.0), 2) - 0.5;
  // The three are not interchangeable, and the balance is a look decision as
  // much as a measurement one. Course height is free: a wall whose courses are
  // not quite equal reads as hand-laid, and it decorrelates one course from the
  // next. Wander within a brick is what actually smears a joint out of the row
  // mean, but it bends the brick with it, and past about a centimetre over a
  // brick length the units come out visibly banana-shaped. So the amplitude
  // sits mostly on the course and the wander is kept to what a bricklayer's
  // line really does.
  return (latticeJitter(row, counts, 4.13) * 0.44 + wander * 0.28 + ripple * 0.11) * irregular;
}

Masonry masonryCell(vec2 uv, vec2 counts, float jointU, float rake, float irregular) {
  float py = uv.y * counts.y;

  // Which course py falls in, given that the bed joints have moved. The nominal
  // row can be out by one, which one comparison against each neighbouring
  // boundary settles as long as the displacement stays under half a course.
  float row = floor(py);
  float bLo = row + bedLine(uv.x, row, counts.y, irregular);
  float bHi = row + 1.0 + bedLine(uv.x, row + 1.0, counts.y, irregular);
  row += py < bLo ? -1.0 : (py >= bHi ? 1.0 : 0.0);
  bLo = row + bedLine(uv.x, row, counts.y, irregular);
  bHi = row + 1.0 + bedLine(uv.x, row + 1.0, counts.y, irregular);

  // Perpends: a bond phase near half a brick, and per-brick widths that differ
  // course by course. The phase runs off the *wrapped* row so the bond still
  // lines up across the tile seam.
  float wrapRow = mod(row, counts.y);
  float phase = 0.5 * mod(wrapRow, 2.0) + latticeJitter(row, counts.y, 1.87) * 0.26 * irregular;
  float px = uv.x * counts.x + phase;
  float perp = wrapRow * 0.37 + 2.9;
  float col = floor(px);
  float cLo = col + latticeJitter(col, counts.x, perp) * 0.26 * irregular;
  float cHi = col + 1.0 + latticeJitter(col + 1.0, counts.x, perp) * 0.26 * irregular;
  col += px < cLo ? -1.0 : (px >= cHi ? 1.0 : 0.0);
  cLo = col + latticeJitter(col, counts.x, perp) * 0.26 * irregular;
  cHi = col + 1.0 + latticeJitter(col + 1.0, counts.x, perp) * 0.26 * irregular;

  Masonry m;
  float spanY = max(bHi - bLo, 1e-3);
  float spanX = max(cHi - cLo, 1e-3);
  m.luv = vec2((px - cLo) / spanX, (py - bLo) / spanY);
  m.id2 = vec2(mod(col, counts.x), wrapRow);
  m.id = hash12(m.id2 + 0.5);
  m.rnd = hash32(m.id2 + 1.7);
  m.dist = min(m.luv, 1.0 - m.luv);
  m.size = vec2(spanX / counts.x, spanY / counts.y);

  // \`jointU\` is the joint half-width in unit units; the vertical half-width is
  // matched to it in uv so the perpend comes out as wide as the bed.
  float jw = max(jointU * (1.0 + (m.rnd.z - 0.5) * 0.5 * irregular), 1e-4);
  float jv = max(jw * (counts.y / counts.x) * (spanX / spanY), 1e-4);
  float t = min(m.dist.x / jw, m.dist.y / jv);

  // A struck joint is a flat recessed bed with a chamfer up to the arris, not a
  // dome. \`rake\` is the share of the half-width the chamfer takes; the rest is
  // flat, which is what stops the joint reading as a painted bevel.
  float cham = clamp(rake, 0.05, 0.9);
  m.face = smoothstep(1.0 - cham, 1.0, t);
  m.bed = 1.0 - smoothstep(max(1.0 - cham - 0.2, 0.0), 1.0 - cham, t);
  m.arris = m.face * (1.0 - smoothstep(1.0, 1.0 + cham * 1.4, t));

  // Inside a bed joint the sky is cut off by the course above, so the top of the
  // recess goes dark and the bottom of it does not. Signed by which half of the
  // unit the point is in: below the middle it is the top of the joint under this
  // course, above the middle the bottom of the joint on top of it. Zero on the
  // face and in the perpends, where there is no overhang to cast it.
  //
  // The gate runs to the arris, not to the edge of the flat bed. Restricted to the
  // bed it left the chamfer at no bias at all, which is the wrong way round — the
  // chamfer is the part of a struck joint that actually faces up or down, and so
  // the part with a direction to shade. On a wall pointed flush enough for the
  // chamfer to take most of the joint it left almost nothing: measured across a
  // bed joint on the painted brick, the occlusion profile was flat to within 1.5
  // levels out of 255 while the bare brick, whose chamfer is narrower, had 17.
  float ty = m.dist.y / jv;
  float inBed = 1.0 - smoothstep(1.0, 1.0 + cham * 1.4, ty);
  m.skyBias = 0.5 + 0.5 * inBed * sign(0.5 - m.luv.y) * smoothstep(0.0, 1.0, ty);
  return m;
}

/** Running-bond masonry. \`counts.y\` must be even for the tile to be seamless. */
Cell brickCell(vec2 uv, vec2 counts, float jointU) {
  vec2 p = uv * counts;
  float row = floor(p.y);
  p.x += 0.5 * mod(row, 2.0);
  float col = floor(p.x);

  Cell c;
  c.luv = fract(p);
  c.id2 = vec2(mod(col, counts.x), mod(row, counts.y));
  c.id = hash12(c.id2 + 0.5);
  c.dist = min(c.luv, 1.0 - c.luv);
  float jointV = jointU * counts.y / counts.x;
  c.face = min(smoothstep(0.0, jointU, c.dist.x), smoothstep(0.0, jointV, c.dist.y));
  return c;
}

/** Square grid with grout: ceramic tile, paving, panel grids. */
Cell gridCell(vec2 uv, vec2 counts, float jointU) {
  vec2 p = uv * counts;
  vec2 i = floor(p);

  Cell c;
  c.luv = fract(p);
  c.id2 = mod(i, counts);
  c.id = hash12(c.id2 + 0.5);
  c.dist = min(c.luv, 1.0 - c.luv);
  float jointV = jointU * counts.y / counts.x;
  c.face = min(smoothstep(0.0, jointU, c.dist.x), smoothstep(0.0, jointV, c.dist.y));
  return c;
}

struct Board {
  vec2 luv;
  /** Per-board and per-segment hashes: boards share a grain, segments do not. */
  float boardId;
  float segId;
  vec2 dist;
  float face;
  /** Board index, so grain direction can follow the board. */
  float board;
};

/**
 * Vertical boards broken into randomly phased segments along v — the layout of
 * planking, crate sides and fence runs.
 */
Board boardCell(vec2 uv, float boards, float segments, float gapU) {
  float p = uv.x * boards;
  float col = floor(p);
  float bi = mod(col, boards);
  float phase = hash12(vec2(bi, 4.27)) * 3.0;
  float sp = uv.y * segments + phase;
  float si = mod(floor(sp), segments);

  Board b;
  b.luv = vec2(fract(p), fract(sp));
  b.board = bi;
  b.boardId = hash12(vec2(bi, 1.31));
  b.segId = hash12(vec2(bi, si) + 0.5);
  b.dist = min(b.luv, 1.0 - b.luv);
  float gapV = gapU * segments / boards;
  b.face = min(smoothstep(0.0, gapU, b.dist.x), smoothstep(0.0, gapV, b.dist.y));
  return b;
}

/**
 * Plain weave. Returns (height, warpMask, weftMask): threads alternate over and
 * under on a checkerboard, which is what gives fabric its characteristic
 * cross-hatched specular break-up.
 */
vec3 weave(vec2 uv, vec2 threads, float depth) {
  vec2 p = uv * threads;
  vec2 i = floor(p);
  vec2 f = fract(p) - 0.5;
  float over = mod(i.x + i.y, 2.0);

  float warp = cos(f.x * PI);
  float weft = cos(f.y * PI);
  float hWarp = warp * mix(1.0 - depth, 1.0, 1.0 - over);
  float hWeft = weft * mix(1.0 - depth, 1.0, over);
  float h = max(hWarp, hWeft);
  return vec3(h, step(hWeft, hWarp), step(hWarp, hWeft));
}

/** Sinusoidal-to-trapezoidal rib profile. \`ribs\` must be integral. */
float corrugation(vec2 uv, float ribs, float flatness) {
  float s = cos(uv.x * ribs * TAU);
  float t = sign(s) * pow(abs(s), 1.0 / max(flatness, 1e-3));
  return t * 0.5 + 0.5;
}

/**
 * Bar lattice with square apertures. Returns (coverage, height, edgeFalloff);
 * the long bars sit proud of the cross bars so the normal map reads as welded
 * stock rather than a flat cutout.
 */
vec3 barGrate(vec2 uv, vec2 cells, float barU, float barV) {
  vec2 p = fract(uv * cells);
  vec2 d = abs(p - 0.5) * 2.0;

  float longBar = 1.0 - smoothstep(barU * 0.85, barU, d.x);
  float crossBar = 1.0 - smoothstep(barV * 0.85, barV, d.y);
  float coverage = sat(longBar + crossBar);

  float longProfile = sqrt(max(0.0, 1.0 - pow(sat(d.x / max(barU, 1e-4)), 2.0)));
  float crossProfile = sqrt(max(0.0, 1.0 - pow(sat(d.y / max(barV, 1e-4)), 2.0)));
  float height = max(longProfile * longBar, crossProfile * crossBar * 0.72);
  return vec3(coverage, height, max(longBar, crossBar));
}

/**
 * Stencil lettering from a per-cell segment mask: two uprights and three
 * crossbars, switched on by five bits of the cell hash. Enough of the Latin
 * alphabet falls out of that to read as text, where a single parameterised
 * stroke only ever reads as a row of identical marks. \`weight\` is the stroke
 * thickness in cell units.
 */
float stencilGlyph(vec2 luv, float cellId, float weight) {
  vec2 p = luv - 0.5;
  int m = int(hash11(cellId + 0.13) * 31.999);
  float w = weight * 0.5;
  float tall = step(abs(p.y), 0.40);
  float wide = step(abs(p.x), 0.30);
  float left = step(abs(p.x + 0.26), w) * tall;
  float right = step(abs(p.x - 0.26), w) * tall;
  float top = step(abs(p.y - 0.36), w) * wide;
  float mid = step(abs(p.y), w) * wide;
  float bot = step(abs(p.y + 0.36), w) * wide;

  float ink = left * float(m & 1)
    + right * float((m >> 1) & 1)
    + top * float((m >> 2) & 1)
    + mid * float((m >> 3) & 1)
    + bot * float((m >> 4) & 1);
  // Neither upright set would leave a floating crossbar, so force one.
  ink += left * step(float(m & 3), 0.5);
  return sat(ink);
}

/** Rounded rivet/bolt head at \`centre\` in cell-local uv. Returns height. */
float rivet(vec2 luv, vec2 centre, float radius) {
  float d = length(luv - centre) / max(radius, 1e-4);
  return sqrt(max(0.0, 1.0 - d * d)) * (1.0 - smoothstep(0.92, 1.0, d));
}

/** Superellipse lobe, the base shape for sandbags and stacked stone. */
float lobe(vec2 luv, float exponent, float softness) {
  vec2 q = abs(luv * 2.0 - 1.0);
  float d = pow(pow(q.x, exponent) + pow(q.y, exponent), 1.0 / exponent);
  return 1.0 - smoothstep(1.0 - softness, 1.0, d);
}

/**
 * Open mesh with irregular garnish, used for camouflage netting. Returns
 * (coverage, height): coverage drives the alpha cutout so the net reads as an
 * actual net rather than a translucent sheet.
 */
vec2 camoMesh(vec2 uv, vec2 cells, float strandWidth, float garnish) {
  vec2 warped = warp2(uv * cells, cells, 0.35, 3);
  vec2 f = abs(fract(warped) - 0.5) * 2.0;
  float strands = max(
    1.0 - smoothstep(strandWidth * 0.6, strandWidth, f.x),
    1.0 - smoothstep(strandWidth * 0.6, strandWidth, f.y));

  vec3 leafCells = worley2(uv * cells * 2.0, cells * 2.0, 1.0);
  float leaves = (1.0 - smoothstep(0.18, 0.44, leafCells.x)) * step(0.38, leafCells.z);

  float coverage = sat(strands + leaves * garnish);
  float height = sat(strands * 0.55 + leaves * garnish * 0.8);
  return vec2(coverage, height);
}

#endif
`;
