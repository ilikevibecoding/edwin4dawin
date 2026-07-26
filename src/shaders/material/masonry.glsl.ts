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
  float blotch = pfbm01(pwarp(uv, vec2(2.0), 0.22, seed + 3.0), vec2(3.0), 3, 0.55, seed);
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
  float syRaw = uv.y * 3.0 + pgrad(uv, vec2(4.0, 1.0), seed + 71.0) * 0.05;
  float sy = fract(syRaw);
  float seamStr = 0.30 + 0.70 * hash11(floor(syRaw) * 3.7 + seed);
  float seamD = min(sy, 1.0 - sy) / 3.0;
  float seam = smoothstep(0.008, 0.0015, seamD) * seamStr;
  float seamLip = smoothstep(0.018, 0.008, seamD) * (1.0 - seam) * seamStr;
  vec2 hp = vec2((fract(uv.x * 4.0 + 0.5) - 0.5) / 4.0, (fract(syRaw + 0.5) - 0.5) / 3.0);
  // Not every board intersection carried a tie.
  float tie = step(0.42, hash11(floor(uv.x * 4.0 + 0.5) * 7.3 + floor(syRaw + 0.5) * 19.1 + seed));
  float hole = smoothstep(0.013, 0.005, length(hp)) * tie;

  float crack = pcracks(uv, vec2(6.0), 0.12, 0.35, 3, seed + 31.0);
  crack = max(crack, pcracks(uv, vec2(19.0), 0.07, 0.25, 2, seed + 41.0) * 0.5);

  float stain = dripStains(uv, 3.0, 0.30, seed + 51.0);
  float bloom = efflorescence(uv, 0.30, seed + 61.0);

  // A wide pour-to-pour spread: this is the tier that has to survive out to 20 m,
  // where the aggregate and the grain have long since averaged themselves away
  // and large-scale value drift is the only thing left carrying the surface.
  vec3 base = mix(S(0.400, 0.395, 0.383), S(0.600, 0.592, 0.570), blotch);
  base *= mix(1.0, 0.90, mid);
  vec3 stoneCol = mix(S(0.66, 0.64, 0.59), S(0.31, 0.30, 0.29), step(0.6, sid));
  base = mix(base, stoneCol, stone * 0.45);
  base *= 0.95 + 0.10 * fine;
  base *= 0.975 + 0.05 * grain;
  base = mix(base, S(0.26, 0.26, 0.25), stain * 0.62);
  base = mix(base, S(0.74, 0.74, 0.72), bloom * 0.45);
  base = mix(base, base * 0.5, crack * 0.85);
  base = mix(base, S(0.41, 0.40, 0.385), seam * 0.55);
  s.albedo = base;

  float h = 0.6 + (blotch - 0.5) * 0.05 + (mid - 0.5) * 0.04;
  h += agg * 0.15 + (fine - 0.5) * 0.05 + (grain - 0.5) * 0.02;
  h -= crack * 0.32;
  h -= seam * 0.09;
  h += seamLip * 0.025;
  h -= hole * 0.4;
  s.height = h;

  s.rough = 0.86 - stone * 0.09 + crack * 0.06 - bloom * 0.06 + (fine - 0.5) * 0.07;
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

  // Institutional pale green, rolled straight onto the concrete. A single
  // colour with regional drift rather than a dado band: a horizontal stripe
  // pins the texture to one world height and tiles badly.
  float paintNoise = pfbm01(uv, vec2(9.0), 3, 0.5, 21.0);
  float batchDrift = pfbm01(pwarp(uv, vec2(2.0), 0.3, 27.0), vec2(3.0), 3, 0.55, 27.0);
  vec3 paintCol = mix(S(0.55, 0.585, 0.545), S(0.62, 0.635, 0.60), batchDrift);
  paintCol *= 0.94 + 0.12 * paintNoise;

  // Roller texture: fine stipple plus the faint lap marks between passes.
  float roller = pdots(uv, vec2(180.0), 0.55, 0.4, 5.0);
  float lap = smoothstep(0.45, 0.55, pfbm01(uv, vec2(3.0, 12.0), 2, 0.5, 31.0));

  // Paint fails where the substrate is proud or damp. Keeping coverage high is
  // the point: a wall that has lost half its paint reads as camouflage.
  float damp = smoothstep(0.22, 0.0, uv.y);
  float bias = (concreteH - 0.6) * 0.45 - damp * 0.16 + 0.12;
  float paint = paintCoverage(uv, 0.42, bias, 13.0);
  // Blistered edge: paint lifts before it lets go.
  float lift = smoothstep(0.0, 0.35, paint) * (1.0 - smoothstep(0.35, 0.75, paint));

  vec3 col = mix(concrete * 1.04, paintCol, paint);
  col = mix(col, col * 0.88, lap * paint * 0.5);
  // Scuffs and hand grime at waist height.
  float scuff = grime(uv, 6.0, 44.0) * smoothstep(0.9, 0.35, uv.y);
  col *= 1.0 - scuff * 0.22;
  // A faint overspray of red tag paint, mostly worn off.
  float tag = smoothstep(0.62, 0.78, pfbm01(pwarp(uv, vec2(4.0), 0.4, 71.0), vec2(6.0), 3, 0.5, 71.0));
  col = mix(col, S(0.42, 0.13, 0.12), tag * 0.35 * paint);
  s.albedo = col;

  s.height = concreteH * (1.0 - paint * 0.55) + paint * (0.62 + roller * 0.03 + lift * 0.05);
  s.rough = mix(s.rough, 0.42 + paintNoise * 0.12 + roller * 0.08, paint);
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

const PLASTER = BRICK_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Trowel work: two families of curved strokes from warped low-frequency
  // noise, one broad sweep and one tighter chatter.
  vec2 w1 = pwarp(uv, vec2(3.0), 0.30, 7.0);
  vec2 w2 = pwarp(uv, vec2(5.0), 0.16, 19.0);
  float sweep = sin(TAU * (3.0 * w1.x + 2.0 * w1.y));
  float chatter = sin(TAU * (7.0 * w2.x - 5.0 * w2.y));
  float trowel = (1.0 - abs(sweep)) * 0.65 + (1.0 - abs(chatter)) * 0.35;

  float blotch = pfbm01(uv, vec2(3.0), 3, 0.55, 3.0);
  float fine = pfbm01(uv, vec2(90.0), 3, 0.5, 13.0);
  float grain = pgrain(uv, 800.0, 5.0);

  // Crazing: a fine polygonal network of shrinkage hairlines.
  // Hairline: wide enough to read, narrow enough not to turn into dried mud.
  float craze = smoothstep(0.042, 0.005, pworleyEdge(uv, vec2(26.0), 0.9, 11.0));
  float craze2 = smoothstep(0.028, 0.003, pworleyEdge(uv, vec2(52.0), 0.9, 23.0)) * 0.7;
  float cracks = max(craze, craze2);

  // Pinholes from air trapped in the skim coat.
  float pin = pdots(uv, vec2(70.0), 0.30, 0.16, 17.0);

  // A patch has been repaired with fresh, brighter, smoother plaster.
  float repair = smoothstep(0.60, 0.66, pfbm01(pwarp(uv, vec2(2.0), 0.3, 29.0), vec2(3.0), 3, 0.5, 29.0));

  float grimeLow = grime(uv, 4.0, 41.0) * smoothstep(0.55, 0.0, uv.y);
  float stain = dripStains(uv, 1.0, 0.5, 47.0);
  // Sun bleaches the top of a wall and grime collects at the bottom.
  float sun = smoothstep(0.4, 1.0, uv.y);

  // Lime render over brick is a warm stone grey, never a neutral or cool one.
  vec3 col = mix(S(0.545, 0.525, 0.490), S(0.635, 0.612, 0.572), blotch);
  col *= 0.96 + 0.07 * trowel;
  col *= 0.97 + 0.06 * fine;
  col *= 0.98 + 0.04 * grain;
  col = mix(col, S(0.685, 0.670, 0.640), repair * 0.6);
  col = mix(col, col * vec3(1.05, 1.03, 0.99), sun * 0.5);
  col = mix(col, col * 0.68, cracks * 0.55);
  col *= 1.0 - grimeLow * 0.26;
  col = mix(col, S(0.42, 0.40, 0.37), stain * 0.45);

  float h = 0.62 + (blotch - 0.5) * 0.10 + trowel * 0.05 + (fine - 0.5) * 0.03;
  h += (grain - 0.5) * 0.012;
  h -= cracks * 0.09;
  h -= pin * 0.25;
  h += repair * 0.03;

  float rough = 0.78 - trowel * 0.06 - repair * 0.08 + cracks * 0.10 + grimeLow * 0.10;
  rough += (fine - 0.5) * 0.06;
  s.albedo = col;
  s.height = h;
  s.rough = rough;
  s.metal = 0.0;
  s.ao = 1.0 - pin * 0.3;
  s.wear = 0.8;

  // Where the render has lost its key it comes away in sheets, exposing the
  // brickwork behind. Hard-edged mask, with a crumbling arris and a dusting of
  // plaster fragments still stuck to the brick at the boundary.
  // Two or three big contiguous patches per tile, not a spatter. Render comes
  // away in sheets where it has lost its key, so the mask wants to be low
  // frequency and only lightly warped; the fine 'nib' term is there to ragged
  // the edge, not to break the patch up.
  float lossN = pfbm01(pwarp2(uv, vec2(2.0), 0.14, 53.0), vec2(2.0), 3, 0.5, 53.0);
  float nib = pfbm01(uv, vec2(38.0), 3, 0.5, 59.0);
  float lossF = lossN * 0.93 + nib * 0.07;
  float gone = smoothstep(0.585, 0.612, lossF);
  // The crumbling edge is a level band of the same field, which means it also
  // fills in anywhere the field peaks just short of the threshold — those
  // near-misses come out as pale comma shapes floating on intact render. Keeping
  // the band tight and breaking it up with the fine term suppresses them.
  float arris = smoothstep(0.578, 0.590, lossF) * (1.0 - gone) *
                smoothstep(0.38, 0.60, nib);

  if (gone > 0.001) {
    Surf b = newSurf();
    brickLayer(uv, 67.0, b);
    // The exposed brick is dusty and lime-washed from having been rendered.
    vec3 dusted = mix(b.albedo, S(0.63, 0.605, 0.565), 0.34 + 0.26 * nib);
    s.albedo = mix(s.albedo, dusted, gone);
    s.height = mix(s.height, b.height * 0.55 + 0.06, gone);
    s.rough = mix(s.rough, b.rough, gone);
    s.ao = min(s.ao, mix(1.0, b.ao * 0.9, gone));
    s.wear = mix(s.wear, b.wear, gone);
  }
  // The broken edge of the render is brighter: fresh, unweathered gypsum.
  s.albedo = mix(s.albedo, S(0.70, 0.69, 0.665), arris * 0.32);
  s.height += arris * 0.05;
  s.rough = mix(s.rough, 0.86, arris * 0.6);
  s.ao = min(s.ao, 1.0 - gone * 0.25);
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

  // Broad trowel undulation underneath the grain.
  vec2 w = pwarp(uv, vec2(3.0), 0.25, 13.0);
  float undul = pfbm01(w, vec2(4.0), 3, 0.55, 13.0);
  float mid = pfbm01(uv, vec2(18.0), 3, 0.5, 23.0);

  float craze = smoothstep(0.05, 0.008, pworleyEdge(uv, vec2(18.0), 0.9, 31.0));
  // Fallen patch: the top coat has come off, revealing the grey scratch coat.
  float loss = smoothstep(0.63, 0.67, pfbm01(pwarp2(uv, vec2(2.0), 0.28, 37.0), vec2(4.0), 4, 0.55, 37.0));
  float lossRim = smoothstep(0.60, 0.632, pfbm01(pwarp2(uv, vec2(2.0), 0.28, 37.0), vec2(4.0), 4, 0.55, 37.0)) * (1.0 - loss);

  // Sun-bleached upper wall, grime and splash at the base.
  float bleach = smoothstep(0.35, 0.95, uv.y) * (0.6 + 0.4 * mid);
  float dirt = grime(uv, 5.0, 43.0) * smoothstep(0.45, 0.0, uv.y);
  float splash = pdots(uv, vec2(40.0), 0.5, 0.3, 47.0) * smoothstep(0.16, 0.0, uv.y);

  vec3 col = mix(S(0.62, 0.585, 0.525), S(0.70, 0.67, 0.61), undul);
  col *= 0.93 + 0.14 * mix(grains, grains2, 0.4);
  col = mix(col, S(0.74, 0.725, 0.69), bleach * 0.35);
  col = mix(col, S(0.52, 0.50, 0.47), loss * 0.8);
  col = mix(col, S(0.66, 0.64, 0.60), lossRim * 0.5);
  col = mix(col, col * 0.66, dirt * 0.55);
  col = mix(col, S(0.34, 0.30, 0.25), splash * 0.5);
  col = mix(col, col * 0.8, craze * 0.35);
  s.albedo = col;

  float h = 0.6 + (undul - 0.5) * 0.14 + (mid - 0.5) * 0.05;
  h += grains * 0.13 + grains2 * 0.07;
  h -= craze * 0.10;
  h -= loss * 0.22;
  h += lossRim * 0.02;
  s.height = h;

  s.rough = 0.88 - bleach * 0.04 + dirt * 0.06 + loss * 0.04;
  s.rough += (grains - 0.5) * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - loss * 0.2;
  s.wear = 0.55 + 0.45 * grains;
}
`;

const STUCCO_OCHRE = BRICK_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Brick substrate first: the render fails in patches and exposes it.
  Surf b = newSurf();
  brickLayer(uv, 61.0, b);

  vec2 w = pwarp(uv, vec2(3.0), 0.28, 5.0);
  float undul = pfbm01(w, vec2(4.0), 3, 0.55, 5.0);
  float mid = pfbm01(uv, vec2(16.0), 3, 0.5, 15.0);
  float fine = pfbm01(uv, vec2(120.0), 3, 0.5, 25.0);
  float grain = pgrain(uv, 700.0, 7.0);

  // Lime render over a scratch coat: two layers, each with its own loss mask.
  // Thresholds sit well above the fBm's median so the render is mostly intact
  // with occasional blown patches. Put them near the median and half the wall
  // turns to grey scratch coat, which reads as camouflage rather than damage.
  float lossN = pfbm01(pwarp2(uv, vec2(3.0), 0.30, 33.0), vec2(5.0), 4, 0.55, 33.0);
  float topGone = smoothstep(0.615, 0.645, lossN);
  float bothGone = smoothstep(0.688, 0.716, lossN);
  // Tight band, broken up by the grain: a wide level band of a smooth field
  // fills in wherever the field peaks just short of the threshold, and those
  // near-misses show up as pale worms crawling over intact render.
  float lip = smoothstep(0.606, 0.618, lossN) * (1.0 - topGone) *
              smoothstep(0.35, 0.60, fine);

  // Crazing cells in lime render are a couple of centimetres across, not ten:
  // at 22 per 2.4 m tile the network reads as dried mud rather than hairlines.
  float craze = smoothstep(0.030, 0.004, pworleyEdge(uv, vec2(48.0), 0.9, 43.0));
  float mould = smoothstep(0.5, 0.85, pfbm01(uv, vec2(6.0, 3.0), 3, 0.55, 53.0)) *
                smoothstep(0.5, 0.0, uv.y);
  float bleach = smoothstep(0.4, 1.0, uv.y);
  float stain = dripStains(uv, 2.0, 0.35, 59.0);

  // Ochre earth pigment in lime, not cadmium yellow: the blue channel stays over
  // half the red or the whole wall goes mustard.
  vec3 ochre = mix(S(0.62, 0.50, 0.33), S(0.70, 0.60, 0.43), undul);
  ochre *= 0.94 + 0.12 * fine;
  ochre *= 0.97 + 0.06 * grain;
  ochre = mix(ochre, S(0.74, 0.68, 0.55), bleach * 0.30);
  ochre = mix(ochre, ochre * 0.78, mid * 0.35);
  vec3 scratchCoat = mix(S(0.54, 0.51, 0.46), S(0.62, 0.60, 0.55), mid) * (0.95 + 0.1 * grain);

  vec3 col = mix(ochre, scratchCoat, topGone);
  col = mix(col, b.albedo, bothGone);
  col = mix(col, col * 1.12, lip * 0.5);
  col = mix(col, S(0.24, 0.28, 0.20), mould * 0.45);
  col = mix(col, col * 0.68, stain * 0.5);
  col = mix(col, col * 0.85, craze * (1.0 - topGone) * 0.4);
  s.albedo = col;

  float renderH = 0.66 + (undul - 0.5) * 0.10 + (fine - 0.5) * 0.04 + (grain - 0.5) * 0.015;
  renderH -= craze * 0.09;
  float coatH = 0.52 + (mid - 0.5) * 0.06;
  float h = mix(renderH, coatH, topGone);
  h = mix(h, b.height * 0.62, bothGone);
  h += lip * 0.035;
  s.height = h;

  s.rough = mix(0.82 + craze * 0.08 - bleach * 0.03, 0.90, topGone);
  s.rough = mix(s.rough, b.rough, bothGone);
  s.rough += mould * 0.06 + stain * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - topGone * 0.18 - bothGone * 0.22;
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
