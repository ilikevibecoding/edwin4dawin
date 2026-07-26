/**
 * Wood. The thing that separates wood from brown stripes is that the grain is
 * the *cross-section of a solid*: growth rings are concentric cylinders, and a
 * flat sawn board slices them at a shallow angle, which is why plank faces show
 * cathedral arches rather than parallel lines. Knots are branch stubs, so the
 * rings deflect around them instead of being overpainted. Every board is a
 * separate piece of timber, so grain phase, ring width, hue and value are
 * randomised per plank and cut hard at the joint.
 */

const WOOD_BASE = /* glsl */ `
/**
 * Ring coordinate for a flat-sawn board. 'p' is board-local, x along the
 * length, y across the width. The pith sits 'pith' units off the cut plane and
 * drifts along the board; that drift is what opens the rings into arches. The
 * drift term is built from sines of p.x so a board that straddles the tile edge
 * still matches up.
 */
float ringCoord(vec2 p, float centre, float pith, float drift, float wobble, float seed) {
  float across = p.y - centre;
  // Wavy grain, and a coarser distortion that makes the ring spacing uneven the
  // way a real board's is. Perfectly even rings are the giveaway.
  across += wobble * pgrad(p, vec2(2.0, 3.0), seed + 3.3);
  across += wobble * 2.2 * pgrad(p, vec2(1.0, 1.0), seed + 17.1);
  float z = pith + drift * (0.6 * sin(TAU * p.x + seed) +
                            0.4 * sin(2.0 * TAU * p.x + seed * 2.7));
  return sqrt(across * across + z * z);
}

/** Latewood band: the hard, dark, thin part of each annual ring. */
float ringBand(float phase, float width, float soft) {
  float d = abs(fract(phase) - 0.5);
  return smoothstep(width + soft, width - soft, d);
}

/**
 * Full grain signature at three tiers: annual latewood bands, the finer
 * transition inside each ring, and pore/vessel lines running along the grain.
 * Returns 0..1 where 1 is the darkest, hardest fibre.
 */
float grainField(vec2 p, float r, float ringFreq, float seed) {
  float bands = ringBand(r * ringFreq + 0.5, 0.16, 0.10);
  float sub = ringBand(r * ringFreq * 3.0, 0.22, 0.16) * 0.45;
  // Ring by ring, some years were wet and some were dry, so the bands vary in
  // strength rather than marching along at one intensity.
  float year = hash11(floor(r * ringFreq) * 0.37 + seed);
  bands *= 0.55 + 0.75 * year;
  // Pores run the length of the board: slow across x, fast across y.
  float pores = pfbm01(p, vec2(3.0, 96.0), 3, 0.5, seed + 8.8);
  float fibre = smoothstep(0.52, 0.88, pores);
  return clamp(bands * 0.58 + sub * 0.22 + fibre * 0.28, 0.0, 1.0);
}

/**
 * Knot field. Only a fraction of cells carry a knot. Returns the knot mask,
 * its dark core, and a radial push for the ring coordinate so the surrounding
 * grain sweeps around the branch stub.
 */
void knots(
  vec2 p, vec2 freq, float density, float radius, float seed,
  out float mask, out float core, out float push, out float swirl
) {
  float f1, f2, id;
  vec2 rel, cell;
  pworley(p, freq, 0.85, seed, f1, f2, id, rel, cell);
  float present = step(1.0 - density, id);
  // Knots are ellipses, stretched along the board like everything else.
  float d = length(rel * vec2(0.55, 1.0)) / max(radius, 1e-3);
  mask = present * smoothstep(1.6, 0.9, d);
  core = present * smoothstep(1.05, 0.45, d);
  push = mask * exp(-d * d * 0.6) * 0.85;
  // Rings inside the knot are concentric about its own centre and much tighter.
  swirl = core * fract(id * 7.31);
  swirl = core * ringBand(d * 5.5 + fract(id * 13.7), 0.2, 0.12);
}

/** Splits and checks: they always run along the grain, and open at the ends. */
float checks(vec2 p, float amount, float seed) {
  // Long thin ridges: slow along the board, fast across it.
  float line = pridged(pwarp(p, vec2(2.0, 8.0), 0.06, seed + 4.4), vec2(3.0, 26.0), 3, 0.5, seed);
  float endBias = pow(abs(p.x - 0.5) * 2.0, 2.5);
  float gate = smoothstep(0.55, 0.9, pfbm01(p, vec2(4.0, 3.0), 3, 0.5, seed + 19.0));
  return smoothstep(0.86, 0.99, line) * clamp(amount * (0.25 + endBias * 1.4) * (0.35 + gate), 0.0, 1.0);
}

/**
 * Nail or screw head, driven slightly below the surface so the wood is bruised
 * around it. 'aspect' corrects for the board's non-square local space so the
 * head comes out round. Accumulates into head/dish/halo with max so several
 * fixings can share one set of accumulators: the head itself, the dished
 * bruise the hammer left, and the rust halo bleeding into the timber.
 */
void nailHead(vec2 p, vec2 at, float aspect, float r, inout vec3 acc) {
  vec2 d = p - at;
  d.x *= aspect;
  float len = length(d) / max(r, 1e-4);
  acc = max(acc, vec3(
    smoothstep(1.05, 0.8, len),
    smoothstep(2.4, 1.0, len),
    smoothstep(3.4, 1.0, len)
  ));
}

/**
 * Sawn timber colour: pale softwood with a yellow-brown resinous cast. The
 * value range is deliberately narrow — pine earlywood to latewood is maybe two
 * stops, and stretching it further is what turns wood into printed vinyl.
 */
vec3 pineColor(float t, float tone) {
  vec3 c = ramp4(
    S(0.66, 0.55, 0.41),
    S(0.60, 0.48, 0.34),
    S(0.51, 0.39, 0.26),
    S(0.42, 0.31, 0.20),
    t
  );
  return mix(c, c * vec3(1.05, 0.97, 0.87), tone);
}
`;

const WOOD_PLANKS = WOOD_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Two boards end to end, five courses, butt joints staggered by half a board.
  const vec2 counts = vec2(2.0, 5.0);
  const float aspect = 2.5;   // board length : width
  vec2 p, cell;
  float border;
  pgrid(uv, counts, 0.5, p, cell, border);
  float id = cellHash(cell, 3.0);
  vec3 idv = cellHash3(cell, 9.0);

  // Per-board timber: where in the log it was cut from, and how fast it grew.
  // The ring centre wanders right off the board for the boards that were cut
  // from near the outside of the log, which is what stops every plank showing
  // the same symmetrical arch down its middle.
  // Pushed away from the board's own midline: a pith sitting dead centre gives
  // the textbook symmetrical cathedral arch, and a floor where every board shows
  // one is the single most obvious sign of a procedural wood texture.
  float side = step(0.5, idv.x) * 2.0 - 1.0;
  float centre = 0.5 + side * mix(0.30, 1.05, abs(idv.x * 2.0 - 1.0));
  float pith = mix(0.03, 0.40, fract(idv.x * 7.3));
  float drift = mix(0.02, 0.18, idv.y);
  float ringFreq = mix(18.0, 52.0, idv.z);
  float bseed = 3.0 + id * 91.0;
  // Half the boards were laid the other way round.
  vec2 pb = mix(p, vec2(1.0 - p.x, 1.0 - p.y), step(0.5, fract(id * 17.3)));

  float knotMask, knotCore, knotPush, knotSwirl;
  knots(pb, vec2(2.0, 1.0), 0.34, 0.18, bseed + 5.0, knotMask, knotCore, knotPush, knotSwirl);

  float r = ringCoord(pb, centre, pith, drift, 0.020, bseed) + knotPush * 0.10;
  float grain = grainField(pb, r, ringFreq, bseed);
  grain = mix(grain, max(grain, knotSwirl), knotCore * 0.8);

  // Board-to-board colour: sapwood against heartwood, differing amounts of sun,
  // and one or two boards replaced later and still fresh.
  float tone = idv.x;
  float value = mix(0.70, 1.20, fract(id * 5.71));
  float hue = fract(id * 41.7);
  float fresh = step(0.86, fract(id * 29.3));
  vec3 wood = pineColor(grain * 0.85 + tone * 0.2, idv.y);
  wood *= value;
  wood *= mix(vec3(1.06, 0.99, 0.90), vec3(0.94, 0.98, 1.06), hue);
  wood = mix(wood, S(0.72, 0.62, 0.46) * value, fresh * 0.55);
  // Knots are resin-dense: much darker and slightly redder.
  wood = mix(wood, S(0.26, 0.16, 0.09), knotCore * 0.8);
  wood = mix(wood, S(0.34, 0.22, 0.12), knotMask * 0.25);

  // Foot traffic: a polished path where the boards have been walked, plus the
  // grey, fibre-raised silvering that untrodden weathered timber always has.
  float traffic = smoothstep(0.42, 0.78, pfbm01(pwarp(uv, vec2(2.0), 0.3, 21.0), vec2(3.0), 3, 0.55, 21.0));
  // Narrow band on purpose. A wide smoothstep over an fBm whose values crowd
  // around 0.5 gives a uniform half-strength wash everywhere instead of the
  // discrete silvered patches weathered timber actually has.
  float weathered = smoothstep(0.46, 0.64, pfbm01(uv, vec2(5.0), 4, 0.55, 27.0)) * (1.0 - traffic * 0.45);
  wood = mix(wood, mix(wood, S(0.47, 0.44, 0.41), 0.78), weathered * 0.9);
  wood = mix(wood, wood * 1.06, traffic * 0.5);

  float split = checks(pb, 0.9, bseed + 31.0);
  float scuff = scratches(uv, 260.0, 0.05, 33.0);
  float dirt = grime(uv, 4.0, 39.0);
  float stain = smoothstep(0.6, 0.95, pfbm01(pwarp(uv, vec2(3.0), 0.35, 43.0), vec2(4.0), 4, 0.6, 43.0));

  // Joints: the long edges are a machined gap, the butt ends a rougher one.
  float edgeY = min(p.y, 1.0 - p.y);
  float edgeX = min(p.x, 1.0 - p.x);
  float gapLong = smoothstep(0.030, 0.004, edgeY);
  float gapEnd = smoothstep(0.022, 0.003, edgeX);
  float gap = max(gapLong, gapEnd);
  // Boards are not perfectly coplanar; each sits a little proud or shy.
  float cup = (idv.z - 0.5) * 0.10 + cos((p.y - 0.5) * PI) * 0.02;

  vec3 nails = vec3(0.0);
  nailHead(p, vec2(0.05, 0.28), aspect, 0.032, nails);
  nailHead(p, vec2(0.05, 0.72), aspect, 0.032, nails);
  nailHead(p, vec2(0.95, 0.28), aspect, 0.032, nails);
  nailHead(p, vec2(0.95, 0.72), aspect, 0.032, nails);
  float nail = nails.x;
  float nailDish = nails.y;
  float nailRust = nails.z * step(0.35, fract(id * 47.1));

  vec3 col = wood;
  col = mix(col, S(0.40, 0.31, 0.22), nailRust * 0.40);
  col = mix(col, S(0.40, 0.39, 0.40), nail * 0.85);
  col = mix(col, col * 0.45, split * 0.85);
  col = mix(col, S(0.10, 0.08, 0.07), gap * 0.9);
  col = mix(col, col * 0.72, stain * 0.5);
  col = mix(col, S(0.74, 0.70, 0.64), scuff * traffic * 0.35);
  col *= 1.0 - dirt * 0.18;
  s.albedo = col;

  // Latewood stands proud of the softer earlywood on a weathered board; that
  // relief is most of what makes wood read as wood in raking light.
  float h = 0.62 + cup;
  h += (grain - 0.5) * (0.05 + weathered * 0.07);
  h -= knotCore * 0.05;
  h -= split * 0.30;
  h -= gapLong * 0.40 + gapEnd * 0.34;
  h -= nailDish * 0.05;
  h += nail * 0.035;
  h -= (1.0 - traffic) * weathered * 0.03;
  s.height = h;

  // Never sealed: bare exterior decking is thirsty everywhere. The trodden path
  // is only burnished, not varnished, so it stays well clear of a gloss.
  float rough = 0.78 + grain * 0.08;
  rough = mix(rough, 0.55, traffic * 0.7);
  rough = mix(rough, 0.93, weathered * 0.8);
  rough += split * 0.12 + dirt * 0.10 + stain * 0.06;
  rough = mix(rough, 0.45, nail * 0.7);
  s.rough = rough;

  s.metal = nail * 0.85 * (1.0 - nailRust * 0.7);
  s.ao = 1.0 - gap * 0.35 - split * 0.25 - nailDish * 0.12;
  s.wear = (1.0 - gap) * (0.35 + traffic * 0.65);
}
`;

const WOOD_CRATE = WOOD_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // A crate face: five horizontal slats over two end battens. The battens sit
  // at x = 0.06 and 0.94 so neighbouring crates share one upright.
  float battenD = min(abs(uv.x - 0.06), abs(uv.x - 0.94));
  float batten = smoothstep(0.075, 0.055, battenD);
  float battenEdge = smoothstep(0.055, 0.075, battenD) * smoothstep(0.095, 0.075, battenD);

  const float slats = 5.0;
  float row = floor(uv.y * slats);
  vec2 p = vec2(uv.x, fract(uv.y * slats));
  vec2 cell = vec2(0.0, row);
  float id = cellHash(cell, 13.0);
  vec3 idv = cellHash3(cell, 17.0);

  // On the battens the grain runs the other way, so swap the local axes. The
  // scalings are whole numbers per tile so both coordinate systems still wrap.
  vec2 pw = mix(p, vec2(uv.y * 2.0, fract((uv.x - 0.06) * 6.0 + 0.5)), batten);
  float bseed = mix(7.0 + id * 71.0, 101.0, batten);

  float centre = mix(-0.35, 1.35, idv.x);
  float pith = mix(0.04, 0.38, fract(idv.x * 5.7));
  float drift = mix(0.03, 0.22, idv.y);
  float ringFreq = mix(16.0, 44.0, idv.z);

  float knotMask, knotCore, knotPush, knotSwirl;
  knots(pw, vec2(3.0, 1.0), 0.45, 0.20, bseed + 3.0, knotMask, knotCore, knotPush, knotSwirl);

  float r = ringCoord(pw, centre, pith, drift, 0.014, bseed) + knotPush * 0.12;
  float grain = grainField(pw, r, ringFreq, bseed);
  grain = mix(grain, max(grain, knotSwirl), knotCore * 0.8);

  // Rough-sawn: the band mill left a coarse ripple across the grain, and the
  // surface is furry rather than planed.
  float kerf = 0.5 + 0.5 * sin(TAU * (pw.y * 42.0 + pgrad(pw, vec2(3.0, 2.0), bseed + 7.0) * 0.8));
  float fuzz = pfbm01(pw, vec2(140.0, 40.0), 3, 0.5, bseed + 11.0);
  float torn = smoothstep(0.6, 0.9, pfbm01(pw, vec2(28.0, 60.0), 3, 0.5, bseed + 13.0));

  vec3 wood = pineColor(grain * 0.8 + idv.x * 0.18, idv.y);
  wood *= mix(0.82, 1.14, fract(id * 3.71));
  wood *= 0.97 + 0.06 * kerf;
  wood = mix(wood, S(0.30, 0.19, 0.11), knotCore * 0.82);
  wood = mix(wood, S(0.36, 0.24, 0.14), knotMask * 0.22);
  // Battens are a different, darker batch of timber.
  wood = mix(wood, wood * vec3(0.82, 0.80, 0.78), batten * 0.5);

  // Stencilled shipping marks: a rectangle with three chevrons inside it,
  // sprayed on and mostly worn off.
  vec2 sp = (uv - vec2(0.5, 0.56)) / vec2(0.30, 0.15);
  float frameOut = sdRoundBox(sp, vec2(1.0, 1.0), 0.12);
  float frame = smoothstep(0.02, -0.02, frameOut) * smoothstep(-0.14, -0.10, frameOut);
  float chev = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 c = sp - vec2(float(i - 1) * 0.55, 0.0);
    float arm = abs(abs(c.x) * 1.5 - c.y - 0.35);
    chev = max(chev, smoothstep(0.16, 0.08, arm) * step(abs(c.x), 0.42) * step(abs(c.y), 0.62));
  }
  float stencilShape = clamp(frame + chev, 0.0, 1.0);
  // Spray does not cover evenly and the crate has been rubbed since.
  float sprayHold = smoothstep(0.35, 0.62, pfbm01(uv, vec2(14.0), 4, 0.55, 53.0));
  float rubbed = smoothstep(0.45, 0.8, pfbm01(pwarp(uv, vec2(3.0), 0.3, 57.0), vec2(4.0), 3, 0.5, 57.0));
  float stencil = stencilShape * sprayHold * (1.0 - rubbed * 0.85) * (1.0 - batten * 0.7);
  stencil *= 1.0 - smoothstep(0.4, 0.9, grain) * 0.3;

  float split = checks(pw, 1.0, bseed + 23.0);
  float dirt = grime(uv, 5.0, 61.0);
  float scuffed = scratches(uv, 200.0, 0.06, 67.0);

  // Slat gaps and the chamfer the handling has knocked off every edge.
  float edgeY = min(p.y, 1.0 - p.y);
  float gap = smoothstep(0.045, 0.010, edgeY);
  float chamfer = smoothstep(0.11, 0.045, edgeY) * (1.0 - gap);
  float bash = pdots(uv, vec2(9.0, 14.0), 0.3, 0.35, 71.0) * smoothstep(0.14, 0.02, edgeY);

  vec3 nails = vec3(0.0);
  nailHead(uv, vec2(0.06, (row + 0.5) / slats), 1.0, 0.013, nails);
  nailHead(uv, vec2(0.94, (row + 0.5) / slats), 1.0, 0.013, nails);
  float nail = nails.x;
  float nailDish = nails.y;
  float nailHalo = nails.z;

  vec3 col = wood;
  col = mix(col, col * 0.55, torn * 0.3);
  col = mix(col, S(0.66, 0.63, 0.58), chamfer * 0.35 + bash * 0.4);
  col = mix(col, S(0.14, 0.11, 0.09), gap * 0.92);
  col = mix(col, col * 0.5, split * 0.8);
  col = mix(col, S(0.13, 0.14, 0.15), stencil * 0.85);
  col = mix(col, S(0.52, 0.53, 0.55), nail * 0.8);
  col = mix(col, S(0.40, 0.30, 0.20), nailHalo * 0.25 * step(0.4, fract(id * 19.7)));
  col *= 1.0 - dirt * 0.22;
  s.albedo = col;

  float h = 0.55;
  h += batten * 0.20 + battenEdge * 0.04;
  h += (grain - 0.5) * 0.07 + (fuzz - 0.5) * 0.05 + (kerf - 0.5) * 0.035;
  h -= torn * 0.05;
  h -= knotCore * 0.04;
  h -= split * 0.30;
  h -= gap * 0.42 + chamfer * 0.06 + bash * 0.10;
  h -= nailDish * 0.05;
  h += nail * 0.03;
  s.height = h;

  s.rough = 0.80 + (1.0 - grain) * 0.08 + fuzz * 0.06 + torn * 0.06;
  s.rough = mix(s.rough, 0.55, stencil * 0.7);   // paint fills the fibre
  s.rough = mix(s.rough, 0.48, nail * 0.7);
  s.rough += dirt * 0.08;
  s.rough -= scuffed * 0.06;
  s.metal = nail * 0.8;
  s.ao = 1.0 - gap * 0.4 - split * 0.22 - torn * 0.1;
  s.wear = (1.0 - gap) * (0.5 + chamfer * 0.5 + batten * 0.2);
}
`;

const WOOD_DOOR = WOOD_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Stile-and-rail door in a 1:2 tile: two stiles, three rails, two panels.
  // Distances are measured in the tile, so the layout stretches with the mesh.
  float stile = 0.13;
  float railTop = 0.09, railMid = 0.50, railBot = 0.15;
  float midHalf = 0.055;

  float dStile = min(uv.x, 1.0 - uv.x);
  float inStile = smoothstep(stile + 0.004, stile - 0.004, dStile);
  float topRail = smoothstep(1.0 - railTop - 0.004, 1.0 - railTop + 0.004, uv.y);
  float botRail = smoothstep(railBot + 0.004, railBot - 0.004, uv.y);
  float lockRail = smoothstep(midHalf + 0.004, midHalf - 0.004, abs(uv.y - railMid));
  float frame = clamp(inStile + topRail + botRail + lockRail, 0.0, 1.0);

  // Panel field: rounded rectangle inside each opening, with a moulded lip.
  float panelCentre = uv.y < railMid ? (railBot + railMid - midHalf) * 0.5
                                     : (railMid + midHalf + 1.0 - railTop) * 0.5;
  float panelHalfY = uv.y < railMid ? (railMid - midHalf - railBot) * 0.5
                                    : (1.0 - railTop - railMid - midHalf) * 0.5;
  vec2 pp = vec2(uv.x - 0.5, uv.y - panelCentre);
  float dPanel = sdRoundBox(pp, vec2(0.5 - stile, panelHalfY), 0.012);
  float panel = smoothstep(0.0, -0.006, dPanel);
  // The moulding is a narrow raised bead around the opening, then the panel
  // face sits recessed behind it.
  float bead = smoothstep(0.024, 0.006, abs(dPanel + 0.012));
  float face = smoothstep(-0.030, -0.040, dPanel);

  // Grain: stiles run vertically, rails horizontally, panels vertically. Each
  // member is its own piece of timber.
  float memberId = inStile > 0.5 ? 1.0 : (topRail > 0.5 ? 2.0 : (botRail > 0.5 ? 3.0 :
                   (lockRail > 0.5 ? 4.0 : 5.0)));
  vec2 pw = (topRail + botRail + lockRail) > 0.5 && inStile < 0.5
    ? vec2(uv.x, fract(uv.y * 8.0))
    : vec2(uv.y, fract(uv.x * 4.0));
  float bseed = 11.0 + memberId * 37.0;
  float idv = hash11(memberId * 1.7);

  float knotMask, knotCore, knotPush, knotSwirl;
  knots(pw, vec2(2.0, 1.0), 0.3, 0.18, bseed + 5.0, knotMask, knotCore, knotPush, knotSwirl);
  float r = ringCoord(pw, mix(-0.2, 1.2, fract(idv * 3.1)), mix(0.06, 0.34, idv),
                      mix(0.03, 0.14, fract(idv * 7.7)), 0.010, bseed);
  r += knotPush * 0.10;
  float grain = grainField(pw, r, mix(26.0, 44.0, fract(idv * 3.3)), bseed);
  grain = mix(grain, max(grain, knotSwirl), knotCore * 0.8);
  vec3 wood = pineColor(grain * 0.85 + 0.15, idv);
  wood = mix(wood, S(0.28, 0.17, 0.10), knotCore * 0.8);

  // Three strata, in the order a door actually acquires them: bare timber, red
  // lead primer, then a faded olive service coat. The primer matters more than
  // it sounds — with two greens stacked the exposed undercoat read as a dirty
  // smudge, whereas an oxide primer showing through a green top coat is legible
  // as paint that has lost a layer rather than as staining.
  vec3 topCoat = mix(S(0.255, 0.290, 0.225), S(0.325, 0.355, 0.275), pvfbm(uv, vec2(6.0), 3, 0.55, 71.0));
  vec3 underCoat = S(0.365, 0.205, 0.150);

  // Paint fails where the door gets touched: the raised bead of the moulding,
  // the bottom rail where it is kicked open, and around the handle. Coverage in
  // the field stays essentially complete and the loss is driven almost entirely
  // by those three, because a door whose two coats each cover half the surface
  // in soft blotches reads as camouflage, not as paint that is failing.
  float kick = smoothstep(0.18, 0.01, uv.y);
  float handle = smoothstep(0.14, 0.0, length((uv - vec2(0.86, 0.47)) / vec2(0.12, 0.06)));
  // The bead has to fail in runs. Biasing coverage by the bead mask alone strips
  // the moulding uniformly, which puts an identical outline around every opening
  // and reads as a stencil; a field varying along the perimeter at roughly a
  // hand's width breaks it into sections that have gone and sections that hold.
  float beadRun = smoothstep(0.34, 0.62, pfbm01(uv, vec2(11.0), 3, 0.5, 61.0));
  float beadWear = bead * beadRun;
  float touched = max(beadWear, max(kick, handle));
  // The threshold is pushed well clear of the field so the panels come out
  // solidly painted; at only a little clear of it the field's own wobble eats
  // holes in the coat everywhere and the door goes blotchy two-tone again.
  float edgeBias = -beadWear * 0.26 - kick * 0.26 - handle * 0.34;
  float top = paintCoverage(uv, 0.50, edgeBias, 73.0);
  // Small hard-edged flakes on top of that, clustered where the door is handled
  // and in whichever region has taken the most sun and water, so the flaking has
  // a centre instead of being spread evenly over the face. High frequency and a
  // tight threshold: at a medium scale with a soft edge these become marbling on
  // the panel faces instead of chips.
  float weatherZone = smoothstep(0.36, 0.74, pfbm01(uv, vec2(2.0), 3, 0.6, 113.0));
  float flake = smoothstep(0.632, 0.652, pfbm01(uv, vec2(70.0), 3, 0.5, 109.0)) *
                (0.10 + 0.55 * weatherZone + 0.75 * touched);
  top = min(top, 1.0 - flake);
  // The primer goes the same way but lags well behind, leaving an oxide halo
  // inside every place the top coat has let go.
  float under = paintCoverage(uv, 0.62, edgeBias * 0.45, 79.0);
  // Brush marks run along each member, so they vary fast across it and slowly
  // along it. Evaluated on 'pw' this aliased: that space already multiplies one
  // axis by four, which put a 130-cycle field at half a texel per cycle and
  // turned the marks into grey noise.
  float brush = (topRail + botRail + lockRail) > 0.5 && inStile < 0.5
    ? pfbm01(uv, vec2(3.0, 96.0), 2, 0.5, 83.0)
    : pfbm01(uv, vec2(96.0, 3.0), 2, 0.5, 83.0);
  // Crazed, alligatored old enamel.
  float craze = pcracks(uv, vec2(46.0), 0.10, 0.05, 3, 89.0);
  float flakeLip = smoothstep(0.02, 0.35, top) * (1.0 - smoothstep(0.35, 0.75, top));

  float dent = pdots(uv, vec2(7.0, 12.0), 0.28, 0.3, 97.0);
  float dirt = grime(uv, 4.0, 101.0);
  float shoe = smoothstep(0.5, 0.9, pfbm01(uv, vec2(9.0, 20.0), 3, 0.5, 103.0)) * kick;

  // Splash off the threshold climbs the bottom rail, and the area a hand reaches
  // for carries greasy handling. Both are large-scale value gradients: a paint
  // film that is one flat value plus fine noise is the thing that makes a door
  // read as a flat-shaded box rather than as joinery.
  float splash = smoothstep(0.26, 0.0, uv.y) *
                 (0.40 + 0.60 * pfbm01(uv, vec2(14.0, 5.0), 3, 0.5, 127.0));
  float greasy = smoothstep(0.42, 0.0, length((uv - vec2(0.84, 0.46)) / vec2(0.30, 0.20)));

  vec3 col = wood;
  col = mix(col, underCoat, under * 0.9);
  col = mix(col, topCoat, top);
  col *= 1.0 - brush * 0.05 * top;
  col = mix(col, col * 0.8, craze * 0.35 * top);
  col = mix(col, col * 0.75, flakeLip * 0.25);
  col = mix(col, S(0.20, 0.18, 0.16), shoe * 0.45);
  col = mix(col, S(0.29, 0.26, 0.22), splash * 0.42);
  col *= 1.0 - greasy * 0.10;
  col *= 1.0 - dirt * 0.16;
  s.albedo = col;

  float h = 0.30;
  h += frame * 0.42;
  h += (1.0 - frame) * (face * 0.20 + 0.06);
  h += bead * 0.16;
  h += panel * 0.02;
  // Grain telegraphs through the coats. Two coats of enamel do not fill sawn
  // timber, and suppressing the grain wherever paint survives is what left the
  // panel faces reading as sheet plastic.
  h += (grain - 0.5) * 0.07 * (1.0 - top * 0.35);
  h += top * 0.03 + under * 0.015;
  h -= flakeLip * 0.03;
  h -= craze * 0.02 * top;
  h -= dent * 0.06;
  h += brush * 0.03 * top;
  s.height = h;

  // Enamel is glossy where it survives, chalky where the sun has got it; bare
  // wood is much rougher and the kick area is scuffed matte.
  float chalk = smoothstep(0.4, 0.8, pfbm01(uv, vec2(3.0), 3, 0.5, 107.0));
  float rough = 0.78 + grain * 0.08;
  // Oxide primer is a chalky matte, well above the enamel over it.
  rough = mix(rough, 0.82, under * 0.8);
  rough = mix(rough, 0.38 + chalk * 0.24 + brush * 0.06, top);
  rough += craze * 0.10 * top + shoe * 0.10 + dirt * 0.08 + splash * 0.10;
  rough = mix(rough, 0.62, flakeLip * 0.5);
  // Years of hands have polished the paint where the door is pushed open.
  rough -= greasy * 0.14 * top;
  s.rough = rough;

  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - frame) * face * 0.10 - dent * 0.12;
  s.wear = 0.32 + beadWear * 0.42 + kick * 0.3 + handle * 0.4;
}
`;

const BARK = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Fissures run with the trunk. Cells stretched hard vertically give plates
  // that are tall and narrow, and their boundaries are the fissures. The
  // vertical stretch has to be extreme — 6:1 or more — or the result reads as
  // reptile scales rather than bark.
  float f1, f2, id;
  vec2 rel, cell;
  pworley(uv, vec2(16.0, 3.0), 0.95, 3.0, f1, f2, id, rel, cell);
  float seam = f2 - f1;

  // Second, coarser generation: the deep structural cracks that split the bark
  // into slabs and run most of the height of the tile. Warping makes them
  // meander and fork instead of tiling visibly.
  vec2 w = pwarp(uv, vec2(4.0, 1.0), 0.09, 7.0);
  float g1, g2, gid;
  vec2 grel, gcell;
  pworley(w, vec2(7.0, 1.0), 0.9, 11.0, g1, g2, gid, grel, gcell);
  float slabSeam = g2 - g1;

  // Fissure depth: 1 on the crack centreline.
  float fine = smoothstep(0.20, 0.0, seam);
  float deep = smoothstep(0.26, 0.01, slabSeam);
  float fissure = clamp(fine * 0.45 + deep * 0.90, 0.0, 1.0);

  // Plate faces: each carries a shallow crown plus fine transverse cracking,
  // because bark splits across as well as along as the trunk expands.
  float crown = smoothstep(0.0, 0.40, f1) * smoothstep(0.0, 0.35, g1);
  float across = pridged(uv, vec2(6.0, 40.0), 3, 0.5, 13.0);
  float acrossCrack = smoothstep(0.72, 0.95, across) * (1.0 - fissure) * 0.6;
  float flake = pfbm01(uv, vec2(60.0, 26.0), 4, 0.55, 17.0);
  float grit = pgrain(uv, 700.0, 19.0);

  // Colour: grey-brown weathered outer bark, the inner bark exposed in the
  // fissures much darker and warmer, and older plates greyer. The value spread
  // between a sunlit plate face and the bottom of a fissure is large.
  float plateTone = fract(id * 5.71);
  float slabTone = fract(gid * 3.31);
  vec3 outer = ramp4(
    S(0.56, 0.50, 0.43),
    S(0.46, 0.40, 0.34),
    S(0.37, 0.32, 0.27),
    S(0.29, 0.25, 0.21),
    plateTone * 0.55 + flake * 0.45
  );
  outer = mix(outer, outer * vec3(0.95, 0.98, 1.05), slabTone * 0.5);
  outer *= 0.94 + 0.12 * grit;
  vec3 inner = S(0.24, 0.17, 0.12);

  vec3 col = mix(outer, inner, fissure * 0.85);
  col = mix(col, inner * 1.15, acrossCrack * 0.5);

  // Lichen sits on exposed plate faces; moss packs into the fissures low down.
  float lichen = smoothstep(0.58, 0.84, pfbm01(pwarp(uv, vec2(4.0), 0.35, 23.0), vec2(9.0), 4, 0.55, 23.0));
  lichen *= (1.0 - fissure * 0.8) * smoothstep(0.2, 0.6, crown);
  float lichenGrain = pfbm01(uv, vec2(90.0), 3, 0.5, 29.0);
  vec3 lichenCol = mix(S(0.56, 0.58, 0.48), S(0.68, 0.70, 0.62), lichenGrain);
  float moss = smoothstep(0.5, 0.85, pfbm01(uv, vec2(7.0, 3.0), 4, 0.6, 31.0)) * fissure;
  moss *= smoothstep(0.55, 0.05, uv.y);
  vec3 mossCol = mix(S(0.16, 0.24, 0.12), S(0.24, 0.32, 0.16), pfbm01(uv, vec2(140.0), 3, 0.5, 37.0));

  col = mix(col, lichenCol, lichen * 0.75);
  col = mix(col, mossCol, moss * 0.8);
  s.albedo = col;

  float h = 0.55;
  h += crown * 0.30;
  h += (flake - 0.5) * 0.14;
  h -= fissure * 0.80;
  h -= acrossCrack * 0.16;
  h += (grit - 0.5) * 0.03;
  h += moss * 0.10;
  s.height = clamp(h, 0.0, 1.0);

  s.rough = 0.86 + flake * 0.08 - lichen * 0.04;
  s.rough = mix(s.rough, 0.94, moss * 0.7);
  s.rough = mix(s.rough, 0.80, fissure * 0.3);
  s.metal = 0.0;
  s.ao = 1.0 - fissure * 0.45 - acrossCrack * 0.2;
  s.wear = crown * (1.0 - fissure);
}
`;

export const WOOD_SHADERS: Record<string, string> = {
  wood_planks: WOOD_PLANKS,
  wood_crate: WOOD_CRATE,
  wood_door: WOOD_DOOR,
  bark: BARK,
};
