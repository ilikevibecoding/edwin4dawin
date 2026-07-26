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
