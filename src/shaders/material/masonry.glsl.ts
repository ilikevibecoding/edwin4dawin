/**
 * Concrete, plaster, stucco and brick.
 *
 * These share a substrate library so the damaged and painted variants are the
 * same concrete underneath, and so stucco can peel away to reveal real brick
 * rather than a brown smear.
 */

/* ------------------------------ substrates ---------------------------- */

const CONCRETE_BASE = /* glsl */ `
/**
 * Board-formed cast concrete. Multi-scale by construction: pour blotching at
 * 3 cycles per tile, cement paste mottling at 14, aggregate at 64 and paste
 * grain at texel scale.
 */
void concreteBase(vec2 uv, float seed, inout Surf s) {
  float campaign, erosion, soil;
  weatherCoat(uv, seed + 91.0, 1.0, campaign, erosion, soil);

  float mid = pfbm01(uv, vec2(14.0), 3, 0.5, seed + 11.0);
  float fine = pfbm01(uv, vec2(110.0), 3, 0.5, seed + 23.0);
  float grain = pgrain(uv, 900.0, seed + 5.0);

  float stone, sid;
  float agg = aggregate(uv, 60.0, seed + 7.0, stone, sid);

  // Form-work: three board seams per tile with tie-rod holes on the seam line.
  // The boards were not laid dead straight and the grout leaked past some of
  // them and not others, so both the line and its strength wander. Identical
  // ruled seams at an exact spacing are the thing that makes cast concrete read
  // as a scored panel.
  // Half a board of phase keeps a seam line, and the row of tie holes on it, off
  // the tile edge, where a hard feature is read as a seam whether or not the two
  // sides agree.
  float syRaw = uv.y * 3.0 + 0.5 + pgrad(uv, vec2(4.0, 1.0), seed + 71.0) * 0.05;
  float sy = fract(syRaw);
  // Indices have to wrap with the tile. 'floor(syRaw)' runs 0,1,2 up the tile and
  // restarts at 0, so keying the seam strength off the *band* index gave the two
  // halves of the seam that sits exactly on the tile edge different strengths,
  // and keying the tie-rod holes off it cut every hole on that line in half.
  // Both showed up as a hard horizontal discontinuity — a measured seam ratio of
  // 1.47 — which is the patchwork grid visible up a cast wall. Keying off the
  // nearest seam *line*, wrapped, makes both sides agree.
  float lineIdx = mod(floor(syRaw + 0.5), 3.0);
  float seamStr = 0.30 + 0.70 * hash11(lineIdx * 3.7 + seed);
  float seamD = min(sy, 1.0 - sy) / 3.0;
  float seam = smoothstep(0.008, 0.0015, seamD) * seamStr;
  float seamLip = smoothstep(0.018, 0.008, seamD) * (1.0 - seam) * seamStr;
  vec2 hp = vec2((fract(uv.x * 4.0) - 0.5) / 4.0, (fract(syRaw + 0.5) - 0.5) / 3.0);
  // Not every board intersection carried a tie.
  float tie = step(0.42, hash11(mod(floor(uv.x * 4.0), 4.0) * 7.3 + lineIdx * 19.1 + seed));
  float hole = smoothstep(0.013, 0.005, length(hp)) * tie;

  // Each board bore against the pour slightly differently, so the lift between
  // two seams has its own tone. Three lifts per tile is 80 cm at this tile size:
  // real mid-band structure that comes from how the thing was built.
  float lift = hash11(mod(floor(syRaw), 3.0) * 11.9 + seed + 4.0) * 2.0 - 1.0;

  float crack = pcracks(uv, vec2(6.0), 0.12, 0.35, 3, seed + 31.0);
  crack = max(crack, pcracks(uv, vec2(19.0), 0.07, 0.25, 2, seed + 41.0) * 0.5);

  float stain = dripStains(uv, 3.0, 0.30, seed + 51.0);
  float bloom = efflorescence(uv, 0.30, seed + 61.0);

  // Warm grey. Cement made with the local sand is never neutral, and under a
  // golden-hour grade a dead-neutral grey goes conspicuously cold and reads as an
  // object from another scene — the fountain rim was a cold grey-white lump in an
  // ochre frame. This family now sits at about B-R -20 like everything else.
  //
  // The mid tier carries the value: patch-to-patch pour differences and
  // differential weathering of the cast skin, not a few percent on a fixed base.
  vec3 base = mix(S(0.395, 0.372, 0.330), S(0.585, 0.560, 0.505), erosion);
  base *= 1.0 + campaign * 0.09 + lift * 0.045;
  base *= 1.0 - soil * 0.16;
  base *= mix(1.0, 0.93, mid);
  vec3 stoneCol = mix(S(0.640, 0.610, 0.550), S(0.320, 0.295, 0.265), step(0.6, sid));
  base = mix(base, stoneCol, stone * 0.45);
  base *= 0.95 + 0.10 * fine;
  base *= 0.975 + 0.05 * grain;
  base = mix(base, S(0.255, 0.240, 0.215), stain * 0.62);
  base = mix(base, S(0.700, 0.686, 0.648), bloom * 0.30);
  // A crevice is dark because it is occluded, and the resolve pass derives that
  // from the height field. Painting it into the albedo as well took these to
  // near-black high-contrast squiggles that read as scribbled marker rather than
  // as cracks — plainly visible on the fountain rim.
  base = mix(base, base * 0.74, crack * 0.55);
  base = mix(base, S(0.405, 0.385, 0.345), seam * 0.55);
  s.albedo = base;

  float h = 0.6 + (erosion - 0.5) * 0.07 + (mid - 0.5) * 0.04 + lift * 0.015;
  h += agg * 0.15 + (fine - 0.5) * 0.05 + (grain - 0.5) * 0.02;
  h -= crack * 0.32;
  h -= seam * 0.09;
  h += seamLip * 0.025;
  h -= hole * 0.4;
  s.height = h;

  s.rough = 0.84 - stone * 0.09 + crack * 0.06 - bloom * 0.06 + (fine - 0.5) * 0.07;
  s.rough += erosion * 0.08 - campaign * 0.035 + soil * 0.05;
  s.rough = mix(s.rough, 0.93, stain * 0.6);
  s.metal = 0.0;
  s.ao = 1.0 - hole * 0.4 - seam * 0.12;
  s.wear = 0.65 + 0.35 * stone;
}
`;

const BRICK_BASE = /* glsl */ `
/**
 * Running-bond brickwork, 9 stretchers by 27 courses per tile (≈2 m at real
 * brick sizes). Per-brick colour, roughness and height come from a cell hash;
 * a few bricks are missing, spalled or chipped at a corner.
 */
void brickLayer(vec2 uv, float seed, inout Surf s) {
  vec2 COUNTS = vec2(9.0, 27.0);
  vec2 local, cell;
  float border;
  pgrid(uv, COUNTS, 0.5, local, cell, border);

  vec3 h3 = cellHash3(cell, seed);
  float pick = cellHash(cell, seed + 71.0);

  // Joint widths in cell units: bricks are wide, so x needs a thinner fraction.
  float jx = 0.05;
  float jy = 0.14;
  vec2 e = min(local, 1.0 - local);
  float faceX = smoothstep(jx, jx + 0.035, e.x);
  float faceY = smoothstep(jy, jy + 0.10, e.y);
  float face = faceX * faceY;
  float jointD = min(e.x / jx, e.y / jy);  // 0 at the joint centreline

  // ---- brick body
  vec2 bl = local;
  float clay = pfbm01(bl * vec2(0.6, 2.0) + cell * 0.31, vec2(6.0), 3, 0.55, seed + h3.z * 40.0);
  float sandy = pgrain(uv, 700.0, seed + 3.0);
  float pock = pdots(uv, vec2(90.0), 0.35, 0.35, seed + 17.0);
  float flash = smoothstep(0.0, 1.0, bl.x) * 0.5 + 0.5 * clay;

  // Fired clay is a muted iron-oxide red, not a pure one: the blue channel never
  // drops far below a third of the red or the whole wall turns to pillar box.
  vec3 clayCol = ramp4(
    S(0.36, 0.215, 0.180),
    S(0.50, 0.290, 0.225),
    S(0.58, 0.375, 0.285),
    S(0.44, 0.315, 0.280),
    h3.x
  );
  // A handful of pale sand-lime and dark over-fired bricks break up the field.
  clayCol = mix(clayCol, S(0.60, 0.54, 0.46), step(0.90, h3.y) * 0.75);
  clayCol = mix(clayCol, S(0.26, 0.19, 0.19), step(0.96, pick) * 0.8);
  clayCol *= 0.86 + 0.28 * flash;
  clayCol *= 0.94 + 0.12 * sandy;

  // Spalled face: the fired skin has flaked off, showing coarser body.
  float spall = smoothstep(0.62, 0.72, pfbm01(uv * 1.0, vec2(20.0), 3, 0.5, seed + 29.0)) *
                step(0.72, h3.y);
  clayCol = mix(clayCol, clayCol * 1.18 + S(0.06, 0.04, 0.03), spall * 0.8);

  // Corner chip: a rounded notch at a hashed corner of the brick.
  vec2 corner = vec2(step(0.5, h3.x), step(0.5, h3.y));
  float chip = 0.0;
  if (pick > 0.80) {
    vec2 d = (local - corner) * vec2(1.0, 3.0);
    float r = 0.14 + 0.18 * h3.z;
    chip = smoothstep(r, r * 0.55, length(d)) * face;
  }
  clayCol = mix(clayCol, clayCol * 1.25 + S(0.05, 0.03, 0.02), chip);

  // ---- mortar
  float mgrain = pgrain(uv, 600.0, seed + 9.0);
  float mnoise = pfbm01(uv, vec2(80.0), 3, 0.5, seed + 13.0);
  vec3 mortar = mix(S(0.50, 0.49, 0.46), S(0.60, 0.59, 0.56), mnoise);
  mortar *= 0.92 + 0.16 * mgrain;
  // Crumbling joints: some courses have lost their pointing.
  float crumble = smoothstep(0.55, 0.75, pfbm01(uv, vec2(7.0, 14.0), 3, 0.5, seed + 37.0));
  mortar = mix(mortar, S(0.33, 0.31, 0.29), crumble * 0.7);

  float bloom = efflorescence(uv, 0.28, seed + 43.0) * (1.0 - face * 0.5);
  float stain = dripStains(uv, 2.0, 0.35, seed + 53.0);

  // ---- missing brick: a dark void with rubble behind it
  float missing = step(0.975, pick);
  vec3 voidCol = S(0.22, 0.19, 0.17) * (0.7 + 0.6 * pfbm01(uv, vec2(60.0), 3, 0.5, seed + 67.0));

  vec3 col = mix(mortar, clayCol, face);
  col = mix(col, voidCol, missing * face);
  col = mix(col, S(0.78, 0.78, 0.75), bloom * 0.5);
  col = mix(col, col * 0.62, stain * 0.55);
  s.albedo = col;

  // ---- height: brick faces proud, struck concave joints
  float brickH = 0.72 + (h3.z - 0.5) * 0.05 + (clay - 0.5) * 0.06 + (sandy - 0.5) * 0.03;
  brickH -= pock * 0.10 + spall * 0.06;
  float jointH = 0.40 + 0.10 * jointD - crumble * 0.14 + (mgrain - 0.5) * 0.04;
  float h = mix(jointH, brickH, face);
  h -= chip * 0.12;
  h -= missing * face * 0.45;
  s.height = h;

  s.rough = mix(0.90 + crumble * 0.06, 0.80 + (h3.y - 0.5) * 0.10 + spall * 0.10, face);
  s.rough += pock * 0.05 + chip * 0.06;
  s.rough = mix(s.rough, 0.95, stain * 0.4);
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - face) * 0.25 - missing * face * 0.6 - crumble * 0.1;
  s.wear = face * (0.6 + 0.4 * (1.0 - spall));
}
`;

/* ------------------------------ materials ----------------------------- */

const CONCRETE = CONCRETE_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  concreteBase(uv, 3.0, s);
}
`;

const CONCRETE_PAINTED = CONCRETE_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  concreteBase(uv, 8.0, s);
  vec3 concrete = s.albedo;
  float concreteH = s.height;

  // Institutional pale green, rolled straight onto the concrete. A single colour
  // with regional drift rather than a dado band: a horizontal stripe pins the
  // texture to one world height and tiles badly.
  float campaign, erosion, soil;
  weatherCoat(uv, 21.0, 1.0, campaign, erosion, soil);

  float paintNoise = pfbm01(uv, vec2(9.0), 3, 0.5, 21.0);
  // Paint on a sunny wall fades hard and unevenly, and it chalks where it has
  // taken the most weather. This is by far the widest value swing available on a
  // painted surface and it was previously worth about four percent — this
  // material measured an albedo sd of 4.9, the flattest in the library.
  vec3 fresh = S(0.400, 0.500, 0.452);
  vec3 chalked = S(0.680, 0.706, 0.660);
  vec3 paintCol = mix(fresh, chalked, erosion);
  paintCol *= 1.0 + campaign * 0.075;
  paintCol *= 0.94 + 0.12 * paintNoise;

  // Roller texture: fine stipple plus the faint lap marks between passes.
  float roller = pdots(uv, vec2(180.0), 0.55, 0.4, 5.0);
  float lap = smoothstep(0.45, 0.55, pfbm01(uv, vec2(3.0, 12.0), 2, 0.5, 31.0));

  // Paint fails where the substrate is proud and where the coat has weathered
  // furthest. It used to fail against a 'damp' term driven by uv.y, which put a
  // hard band of bare concrete along the bottom edge of every tile: this material
  // measured a seam ratio of 15.3, the worst in the library by a factor of four.
  // Rising damp is real, but it is a function of height above the pavement, so it
  // is applied in world space by the shader patch.
  float bias = (concreteH - 0.6) * 0.45 - (erosion - 0.5) * 0.13 + 0.12;
  float paint = paintCoverage(uv, 0.42, bias, 13.0);
  // Blistered edge: paint lifts before it lets go.
  float lift = smoothstep(0.0, 0.35, paint) * (1.0 - smoothstep(0.35, 0.75, paint));

  vec3 col = mix(concrete * 1.04, paintCol, paint);
  col = mix(col, col * 0.88, lap * paint * 0.5);
  float scuff = grime(uv, 6.0, 44.0) * (0.35 + 0.65 * soil);
  col *= 1.0 - scuff * 0.24;
  // A faint overspray of red tag paint, mostly worn off.
  float tag = smoothstep(0.62, 0.78, pfbm01(pwarp(uv, vec2(4.0), 0.4, 71.0), vec2(6.0), 3, 0.5, 71.0));
  col = mix(col, S(0.42, 0.13, 0.12), tag * 0.35 * paint);
  s.albedo = col;

  s.height = concreteH * (1.0 - paint * 0.55) + paint * (0.62 + roller * 0.03 + lift * 0.05);
  // Chalked paint is matt, sound paint still has a sheen. Correlating gloss with
  // the fade is most of what makes this read as paint rather than as tinted wall.
  s.rough = mix(s.rough, 0.34 + erosion * 0.34 + paintNoise * 0.10 + roller * 0.08, paint);
  s.rough += scuff * 0.18 + lift * 0.15;
  s.ao = min(s.ao, 1.0 - lift * 0.15);
  s.wear = mix(0.5, 1.0, paint);
}
`;

const CONCRETE_DAMAGED = CONCRETE_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  concreteBase(uv, 17.0, s);
  vec3 base = s.albedo;

  // Spalled zones: hard-edged blast damage with a bright chipped rim. Few and
  // large. A heavily warped four-octave field thresholded near its median gives
  // a filigree boundary that reads as lichen or graffiti rather than as concrete
  // that has been blown off a wall, so this is deliberately coarse and gentle.
  float sn = pfbm01(pwarp2(uv, vec2(2.0), 0.14, 5.0), vec2(2.0), 3, 0.5, 5.0);
  float spall = smoothstep(0.585, 0.625, sn);
  float rim = smoothstep(0.556, 0.590, sn) * (1.0 - spall);
  float deep = smoothstep(0.655, 0.720, sn);

  // Interior is aggregate-rich and much coarser than the trowelled face: the
  // paste between the stones is darker than the cast skin and the stones
  // themselves are lighter, so the spall reads by its contrast rather than by
  // being uniformly brighter than the wall around it.
  float st, sid;
  float agg = aggregate(uv, 34.0, 23.0, st, sid);
  vec3 interior = mix(S(0.425, 0.415, 0.395), S(0.615, 0.595, 0.560), st);
  interior *= 0.9 + 0.2 * pgrain(uv, 500.0, 11.0);

  // Exposed reinforcement: four bars, visible only where the cover has come off
  // over a real distance. Keyed to its own single-blob field rather than to
  // 'deep' — spalls the size of a hand expose a 40 cm stub of bar, which reads
  // as a rusty staple lying on the wall instead of as reinforcement.
  float core = smoothstep(0.62, 0.70, pfbm01(pwarp2(uv, vec2(1.0), 0.10, 5.0), vec2(1.0), 2, 0.5, 5.0));
  core *= spall;
  float barCoord = fract(uv.y * 4.0);
  float barD = abs(barCoord - 0.5) / 4.0;
  float barR = 0.014;
  float barMask = smoothstep(barR, barR * 0.6, barD) * core;
  float barDome = sqrt(max(0.0, 1.0 - pow(barD / barR, 2.0))) * barMask;
  // Deformed bar ribs sit nearly across the bar, tilted a little.
  float ribs = 0.5 + 0.5 * sin(TAU * (uv.x * 48.0 + uv.y * 8.0));
  float barRust = pfbm01(uv, vec2(40.0), 3, 0.5, 29.0);
  vec3 barCol = rustColor(0.35 + 0.5 * barRust, pgrain(uv, 600.0, 31.0));

  // Rust bleed runs downward from each bar and stains the face below it.
  float below = max(0.0, 0.5 - barCoord) / 4.0;
  float bleedMask = pfbm01(uv, vec2(30.0, 2.0), 3, 0.55, 37.0);
  // Bleed only runs from bar that is actually exposed. Letting a little show
  // everywhere puts a rust band under every bar line across the whole wall,
  // which turns into a regular grid of rust patches once the texture repeats.
  float bleed = exp(-below / 0.055) * smoothstep(0.42, 0.75, bleedMask) *
                (0.10 + 0.90 * max(core, deep * 0.5));

  // Cracks radiate from the spall boundary. Thin and only lightly warped — a
  // wide, heavily warped ridge network turns into worms crawling over the wall.
  float radial = pcracks(uv, vec2(9.0), 0.07, 0.22, 3, 43.0) * smoothstep(0.46, 0.58, sn);

  vec3 col = mix(base, interior, spall);
  col = mix(col, interior * 1.10, rim * 0.45);
  col = mix(col, mix(S(0.45, 0.24, 0.12), S(0.58, 0.33, 0.16), bleedMask), bleed * 0.65);
  col = mix(col, barCol, barMask);
  col = mix(col, col * 0.45, radial * 0.8);
  s.albedo = col;

  float h = s.height;
  h -= spall * 0.42 + deep * 0.22;
  h += rim * 0.03;
  h += agg * spall * 0.18;
  h += barDome * 0.30 + barMask * ribs * 0.04;
  h -= radial * 0.30;
  s.height = h;

  s.rough = mix(s.rough, 0.93 - st * 0.06, spall);
  s.rough = mix(s.rough, 0.86, bleed * 0.7);
  s.rough = mix(s.rough, 0.72 + barRust * 0.2, barMask);
  s.metal = barMask * 0.5;
  s.ao = min(s.ao, 1.0 - spall * 0.35 - deep * 0.2 - core * 0.25 - radial * 0.3);
  s.wear = mix(s.wear, 1.0, spall);
}
`;

const PLASTER = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Lime render, and the material that covers most of every frame in this game,
  // so it gets the most attention.
  //
  // Two things are deliberately *absent*. There is no peeled patch exposing
  // brick and no bright crumbling arris around one: a level-band rim on a
  // thresholded blob field also fills in wherever the field peaks just short of
  // the threshold, and those near-misses came out as pale hook shapes floating on
  // intact render. At two cycles per tile that put four identical hooks on every
  // tile, and once a viewer can name a shape they can see the grid — the town
  // read as wallpaper. Placed damage belongs on the architectural layer, where
  // its position comes from sills and base courses rather than from UV.
  //
  // And there is no sun-bleached top or grimy base. Those are functions of height
  // above ground, and baking them against uv.y in a tile that repeats three times
  // up a facade both puts a hard value step at every tile boundary (this material
  // measured a seam ratio of 3.2) and claims the wall is bleached every 2.4 m.
  // They are applied in world space by the shader patch instead.
  float campaign, erosion, soil;
  weatherCoat(uv, 7.0, 1.0, campaign, erosion, soil);

  // Trowel work: two families of curved strokes from warped low-frequency noise,
  // one broad sweep and one tighter chatter.
  vec2 w1 = pwarp(uv, vec2(3.0), 0.30, 7.0);
  vec2 w2 = pwarp(uv, vec2(5.0), 0.16, 19.0);
  float sweep = sin(TAU * (3.0 * w1.x + 2.0 * w1.y));
  float chatter = sin(TAU * (7.0 * w2.x - 5.0 * w2.y));
  float trowel = (1.0 - abs(sweep)) * 0.65 + (1.0 - abs(chatter)) * 0.35;

  // Shallow undulation: a hand-floated coat is never flat, and at 7 cycles on a
  // 2.4 m tile these are 35 cm swells. This is what makes a low sun break across
  // a facade in bands instead of sliding over it evenly.
  float undul = pfbm01(pwarp(uv, vec2(4.0), 0.22, 71.0), vec2(7.0), 3, 0.55, 71.0);
  float fine = pfbm01(uv, vec2(90.0), 3, 0.5, 13.0);
  float grain = pgrain(uv, 800.0, 5.0);

  // Crazing, three tiers. The coarse one is the important addition, and it does
  // two jobs. A render that has lost its bond to the wall behind cracks in a map
  // at roughly a hand's span — 9 cells across a 2.4 m tile is 27 cm, right in
  // the band this material had nothing in — and once the map has formed, each
  // cell weathers on its own: it lifts at the edges, sheds its limewash at its
  // own rate and ends up a slightly different tone from its neighbours.
  //
  // That per-cell tone is the most valuable thing in this function. Soft noise
  // alone reads as marble however well it is graded, because nothing in it has
  // an edge; a field of flat-toned cells with cracks between them reads as
  // render immediately, and being flat-toned it survives minification, which
  // fine detail does not.
  float mapEdge, mapF2, mapId;
  vec2 mapRel, mapCell;
  pworley(uv, vec2(9.0), 0.85, 5.0, mapEdge, mapF2, mapId, mapRel, mapCell);
  float mapCraze = smoothstep(0.030, 0.008, mapF2 - mapEdge);
  float cellTone = (mapId - 0.5) * 2.0;
  // Cells lift at their edges, so each is very slightly domed.
  float cellDome = smoothstep(0.30, 0.0, mapEdge);

  float craze = smoothstep(0.042, 0.005, pworleyEdge(uv, vec2(26.0), 0.9, 11.0));
  float craze2 = smoothstep(0.028, 0.003, pworleyEdge(uv, vec2(52.0), 0.9, 23.0)) * 0.7;
  float cracks = max(craze, craze2);
  // The map cracks are older and hold dirt, so they read darker than hairlines.
  float mapC = mapCraze * (0.45 + 0.55 * soil);

  // Pinholes from air trapped in the skim coat.
  float pin = pdots(uv, vec2(70.0), 0.30, 0.16, 17.0);

  // Salt blooming out through the render where it stays damp. Soft, pale, and
  // uncorrelated with the campaigns, so it crosses their boundaries.
  float bloom = efflorescence(uv, 0.34, 61.0);

  // Warm lime render over a rubble wall. The mid tier drives the value, not a
  // few percent of modulation on a fixed base: erosion of the limewash swings the
  // surface between a weathered stone grey and a much paler chalky bloom.
  vec3 col = mix(S(0.502, 0.474, 0.430), S(0.668, 0.646, 0.602), erosion);
  // Each cell of the crack map has weathered at its own rate.
  col *= 1.0 + cellTone * 0.075;
  // A patch rendered in a different decade does not match the wall around it.
  col *= 1.0 + campaign * 0.115;
  col *= 1.0 - soil * 0.13;
  col *= 0.955 + 0.09 * trowel;
  col *= 0.97 + 0.06 * undul;
  col *= 0.97 + 0.06 * fine;
  col *= 0.98 + 0.04 * grain;
  col = mix(col, S(0.755, 0.740, 0.705), bloom * 0.40);
  col = mix(col, col * 0.70, cracks * 0.52);
  col = mix(col, col * 0.74, mapC * 0.55);

  float h = 0.60 + (undul - 0.5) * 0.16 + trowel * 0.05 + (fine - 0.5) * 0.03;
  h += (grain - 0.5) * 0.012;
  h += (erosion - 0.5) * 0.07 + campaign * 0.02;
  h -= cracks * 0.09;
  // A map crack is a real gap, with the cell either side standing slightly proud.
  h -= mapCraze * 0.16;
  h += cellDome * 0.04 + cellTone * 0.015;
  h -= pin * 0.25;

  // Roughness tracks the same structure it has to: a fresher patch is smoother,
  // an eroded one is chalky, soiling adds tooth. Uncorrelated channels are what
  // make a surface look synthetic even when the albedo is right.
  float rough = 0.74 - trowel * 0.06 + cracks * 0.10 + mapC * 0.08;
  rough += erosion * 0.10 - campaign * 0.045 + soil * 0.07 - cellTone * 0.04;
  rough -= bloom * 0.05;
  rough += (fine - 0.5) * 0.06;

  s.albedo = col;
  s.height = h;
  s.rough = rough;
  s.metal = 0.0;
  s.ao = 1.0 - pin * 0.3;
  s.wear = 0.62 + 0.30 * erosion;
}
`;

const STUCCO_SAND = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Sand-float finish: dense rounded grains dragged by the float.
  float gh, gid;
  vec2 grel;
  pstones(uv, vec2(150.0), 0.44, 3.0, gh, gid, grel);
  float grains = gh;
  float grains2;
  float gid2;
  vec2 grel2;
  pstones(uv, vec2(88.0), 0.40, 9.0, grains2, gid2, grel2);

  // Broad trowel undulation underneath the grain, plus the mid tier that makes
  // this read as a substance at twenty metres rather than as a tinted primitive.
  vec2 w = pwarp(uv, vec2(3.0), 0.25, 13.0);
  float undul = pfbm01(w, vec2(4.0), 3, 0.55, 13.0);
  float mid = pfbm01(uv, vec2(18.0), 3, 0.5, 23.0);
  float campaign, erosion, soil;
  weatherCoat(uv, 43.0, 1.0, campaign, erosion, soil);

  // Float marks: a sand-float finish is worked in overlapping arcs, and where the
  // float has pulled harder the surface is denser and paler. 30-50 cm sweeps.
  vec2 fw = pwarp(uv, vec2(4.0), 0.20, 67.0);
  float floatArc = 1.0 - abs(sin(TAU * (5.0 * fw.x + 3.0 * fw.y)));

  // Crazing, and the per-cell tone that goes with it: once a float coat has
  // crazed, each cell holds its own dirt and sheds its own limewash, so the
  // network is a tone map as much as a line drawing. At 18 cells across a 2.4 m
  // tile these are 13 cm, which is the fine end of the band that has to survive
  // to twenty metres.
  float czEdge, czF2, czId;
  vec2 czRel, czCell;
  pworley(uv, vec2(18.0), 0.9, 31.0, czEdge, czF2, czId, czRel, czCell);
  // Narrow. This material dresses the fountain, where it is seen from a metre
  // away, and a wide crazing line at that range stops reading as a shrinkage
  // hairline and starts reading as cracked mud.
  float craze = smoothstep(0.024, 0.005, czF2 - czEdge);
  float cellTone = (czId - 0.5) * 2.0;
  // Fallen patch: the top coat has come off, revealing the grey scratch coat.
  // Kept as a tone-and-texture change with a soft boundary rather than the
  // hard-edged blob with a bright rim it used to be — that rim filled in on
  // near-misses and produced nameable pale shapes at a fixed rate per tile.
  float lossF = pfbm01(pwarp2(uv, vec2(2.0), 0.28, 37.0), vec2(4.0), 4, 0.55, 37.0);
  float loss = smoothstep(0.615, 0.685, lossF);

  vec3 col = mix(S(0.545, 0.503, 0.430), S(0.730, 0.704, 0.646), erosion);
  col *= 1.0 + cellTone * 0.06;
  col *= 1.0 + campaign * 0.10;
  col *= 1.0 - soil * 0.17;
  col *= 0.955 + 0.09 * floatArc;
  col *= 0.96 + 0.08 * undul;
  col *= 0.93 + 0.14 * mix(grains, grains2, 0.4);
  col = mix(col, S(0.552, 0.528, 0.484), loss * 0.72);
  col = mix(col, col * 0.84, craze * 0.35);
  s.albedo = col;

  // Crazing and lost render are tone events far more than they are relief: a
  // shrinkage line is a millimetre deep and a spalled patch is the thickness of
  // the top coat. Carrying them at full amplitude into the height field turned
  // the fountain rim into a field of tilted slabs once the curvature term in the
  // resolve pass got hold of the boundaries.
  float h = 0.6 + (undul - 0.5) * 0.14 + (mid - 0.5) * 0.05;
  h += (erosion - 0.5) * 0.06 + floatArc * 0.035 + campaign * 0.018;
  h += grains * 0.13 + grains2 * 0.07;
  h -= craze * 0.028;
  h -= loss * 0.055;
  s.height = h;

  s.rough = 0.84 + erosion * 0.09 - campaign * 0.04 + soil * 0.06 + loss * 0.04;
  s.rough += (grains - 0.5) * 0.05 - cellTone * 0.03;
  s.metal = 0.0;
  s.ao = 1.0 - loss * 0.2;
  s.wear = 0.55 + 0.45 * grains;
}
`;

const STUCCO_OCHRE = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  vec2 w = pwarp(uv, vec2(3.0), 0.10, 5.0);
  float undul = pfbm01(w, vec2(4.0), 3, 0.55, 5.0);
  float mid = pfbm01(uv, vec2(16.0), 3, 0.5, 15.0);
  float fine = pfbm01(uv, vec2(120.0), 3, 0.5, 25.0);
  float grain = pgrain(uv, 700.0, 7.0);
  float campaign, erosion, soil;
  weatherCoat(uv, 33.0, 1.0, campaign, erosion, soil);

  // Lime render over a scratch coat. The top coat is lost in patches, exposing
  // the grey scratch coat beneath: a tone and roughness change over a soft
  // boundary. The second layer that used to blow through to brickwork is gone,
  // along with its bright lip — a hard-edged blob plus a level-band rim at a
  // fixed rate per tile is a shape a viewer learns to recognise, and once they
  // recognise it they see the tiling grid instead of a wall.
  float lossN = pfbm01(pwarp2(uv, vec2(3.0), 0.30, 33.0), vec2(5.0), 4, 0.55, 33.0);
  float topGone = smoothstep(0.610, 0.665, lossN);

  // Crazing cells in lime render are a couple of centimetres across, not ten:
  // at 22 per 2.4 m tile the network reads as dried mud rather than hairlines.
  float craze = smoothstep(0.030, 0.004, pworleyEdge(uv, vec2(48.0), 0.9, 43.0));
  // Over the hairlines, the coarse map cracking of a render that has lost its
  // bond, and the per-cell tone that comes with it. This is the tier that still
  // reads at twenty metres, and the only one with edges in it.
  float mapEdge, mapF2, mapId;
  vec2 mapRel, mapCell;
  pworley(uv, vec2(8.0), 0.85, 9.0, mapEdge, mapF2, mapId, mapRel, mapCell);
  float mapCraze = smoothstep(0.028, 0.007, mapF2 - mapEdge);
  float cellTone = (mapId - 0.5) * 2.0;
  // Soot and dust settling in the lee of the render, not algae. The green-grey
  // it used to be was both the wrong hue for a town this dry and — at three
  // cycles vertically against six across — a set of horizontal hooks a viewer
  // could pick out and count, which is the whole wallpaper failure again.
  float mould = smoothstep(0.46, 0.94, pfbm01(uv, vec2(7.0, 5.0), 4, 0.55, 53.0)) * soil;
  float stain = dripStains(uv, 2.0, 0.35, 59.0);

  // Ochre earth pigment in lime, not cadmium yellow: the blue channel stays over
  // half the red or the whole wall goes mustard. Pigment in a lime wash is what
  // fades first and least evenly, so the sun-bleached end of the range is both
  // paler and markedly less saturated — that hue shift does as much work as the
  // value shift and is why this now measures three times the contrast it did.
  vec3 ochre = mix(S(0.545, 0.410, 0.245), S(0.760, 0.700, 0.580), erosion);
  // Weight into the cellular tier rather than the smooth one: the variance has
  // to come from somewhere with edges in it, or it comes back as marble.
  ochre *= 1.0 + cellTone * 0.105;
  ochre *= 1.0 + campaign * 0.115;
  ochre *= 1.0 - soil * 0.15;
  ochre *= 0.97 + 0.06 * undul;
  ochre *= 0.94 + 0.12 * fine;
  ochre *= 0.97 + 0.06 * grain;
  ochre = mix(ochre, ochre * 0.82, mid * 0.18);
  // A lime scratch coat is sand and lime, not cement: it is warm and dull, and
  // the cool grey it used to be read as a second material showing through.
  vec3 scratchCoat = mix(S(0.505, 0.452, 0.372), S(0.630, 0.582, 0.498), mid) * (0.95 + 0.1 * grain);

  vec3 col = mix(ochre, scratchCoat, topGone);
  col = mix(col, S(0.255, 0.228, 0.190), mould * 0.34);
  col = mix(col, col * 0.68, stain * 0.5);
  col = mix(col, col * 0.85, craze * (1.0 - topGone) * 0.4);
  col = mix(col, col * 0.80, mapCraze * (1.0 - topGone) * 0.5);
  s.albedo = col;

  float renderH = 0.66 + (undul - 0.5) * 0.12 + (fine - 0.5) * 0.04 + (grain - 0.5) * 0.015;
  renderH += (erosion - 0.5) * 0.06 + campaign * 0.02;
  renderH -= craze * 0.07 + mapCraze * 0.10;
  float coatH = 0.52 + (mid - 0.5) * 0.06;
  s.height = mix(renderH, coatH, topGone);

  s.rough = mix(0.80 + craze * 0.08 + mapCraze * 0.07 + erosion * 0.09 - campaign * 0.04, 0.90, topGone);
  s.rough += mould * 0.06 + stain * 0.05 + soil * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - topGone * 0.18;
  s.wear = mix(0.7, 0.9, topGone);
}
`;

const BRICK = BRICK_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  brickLayer(uv, 5.0, s);
  // A little airborne soot settles on the upper arris of every course.
  float soot = grime(uv, 7.0, 91.0);
  s.albedo *= 1.0 - soot * 0.12;
  s.rough += soot * 0.04;
}
`;

export const MASONRY_SHADERS: Record<string, string> = {
  concrete: CONCRETE,
  concrete_painted: CONCRETE_PAINTED,
  concrete_damaged: CONCRETE_DAMAGED,
  plaster: PLASTER,
  stucco_sand: STUCCO_SAND,
  stucco_ochre: STUCCO_OCHRE,
  brick: BRICK,
};
