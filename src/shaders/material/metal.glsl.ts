/**
 * Metals. The through-line is that corrosion is a *process*: it starts where
 * water sits, eats outward with a ragged front, undermines and lifts paint at
 * its edge, and changes all four channels at once — colour to iron oxide,
 * roughness up hard, metalness down, height pitted.
 */

const METAL_BASE = /* glsl */ `
/** Rolled steel substrate: mill scale mottling and faint rolling direction. */
void steelBase(vec2 uv, float seed, out vec3 col, out float rough, out float h) {
  float scale = pfbm01(uv, vec2(9.0), 3, 0.55, seed);
  float roll = striation(uv, 70.0, seed + 3.0);
  float grain = pgrain(uv, 800.0, seed + 7.0);
  col = mix(S(0.72, 0.73, 0.755), S(0.60, 0.605, 0.63), scale);
  col *= 0.95 + 0.10 * roll;
  col *= 0.97 + 0.06 * grain;
  rough = 0.30 + scale * 0.14 + (roll - 0.5) * 0.10;
  h = 0.6 + (roll - 0.5) * 0.04 + (grain - 0.5) * 0.02 + (scale - 0.5) * 0.03;
}

/**
 * Rust field with a believable advance: water tracks down from a line where it
 * gets in, sits in broad areas that stay damp, and the front is nibbled at
 * three scales.
 *
 * This used to bias the rust with 'smoothstep(0.30, 0.0, uv.y)' for the puddled
 * bottom edge of a sheet. That is a real thing, but the bottom edge of a *sheet*
 * is not the bottom edge of the *tile*, and on anything the texture repeats over
 * it put a hard band of rust across the middle of the surface: corrugated iron
 * measured a wrap discontinuity four times its own worst internal edge. The
 * broad damp field replaces it, and the drip runs carry the directionality.
 */
float rustField(vec2 uv, float amount, float seed) {
  float damp = smoothstep(0.40, 0.72, pfbm01(pwarp(uv, vec2(2.0), 0.3, seed + 27.0),
                                             vec2(3.0, 2.0), 4, 0.6, seed + 27.0));
  float runs = dripStains(uv, 1.0, 0.55, seed + 11.0);
  float bias = amount + damp * 0.30 + runs * 0.3;
  return rustMask(uv, bias, seed);
}
`;

const METAL_PAINTED = METAL_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  vec3 steelCol;
  float steelRough, steelH;
  steelBase(uv, 3.0, steelCol, steelRough, steelH);

  float rust = rustField(uv, -0.02, 5.0);
  float rustGrain = pfbm01(uv, vec2(90.0), 3, 0.5, 13.0);
  float rustDeep = smoothstep(0.45, 1.0, rust) * smoothstep(0.4, 0.8, rustGrain);
  vec3 rustCol = rustColor(0.25 + 0.6 * rustGrain, pgrain(uv, 700.0, 17.0));

  // Industrial enamel over a coat of grey-red primer, which is what actually
  // shows when a chip lifts.
  float paintN = pfbm01(uv, vec2(7.0), 3, 0.55, 19.0);
  float peel = pfbm01(uv, vec2(40.0), 3, 0.5, 23.0);
  vec3 paintCol = mix(S(0.24, 0.33, 0.36), S(0.30, 0.40, 0.42), paintN);
  vec3 primerCol = mix(S(0.36, 0.30, 0.26), S(0.42, 0.37, 0.33), peel);
  // Orange peel from spraying, plus fine settled dust.
  float orange = pdots(uv, vec2(190.0), 0.6, 0.45, 29.0);

  // Paint is destroyed by the rust front and lifts at its boundary. Coverage has
  // to sit well clear of the threshold: at 0.22 the band landed on the coverage
  // field's own median, so the field's mid-scale wobble punched soft holes across
  // the whole sheet and each hole showed pale bare steel — a sheet blotched like
  // camouflage and outlined like a contour map. Loss is the rust front's job.
  float bias = -rust * 0.75 + (steelH - 0.6) * 0.18;
  float paint = paintCoverage(uv, 0.55, bias, 31.0);
  paint *= 1.0 - smoothstep(0.35, 0.85, rust);
  // Primer lags the top coat, so a chip reads as enamel to primer to rust rather
  // than enamel straight to metal.
  float primer = paintCoverage(uv, 0.80, bias * 0.55, 53.0);
  primer = max(primer, paint) * (1.0 - smoothstep(0.30, 0.62, rust));
  float blister = smoothstep(0.15, 0.5, paint) * (1.0 - smoothstep(0.5, 0.85, paint));
  float lifted = blister * smoothstep(0.4, 0.7, peel);

  // Scratches cut through to bright metal.
  float scr = scratches(uv, 300.0, 0.055, 37.0);
  float scrDeep = scr * smoothstep(0.5, 0.9, pfbm01(uv, vec2(9.0), 2, 0.5, 41.0));

  float pit = pdots(uv, vec2(120.0), 0.35, 0.3, 43.0) * rust;
  float dirt = grime(uv, 5.0, 47.0);

  // The substrate under the paint turns to rust the instant there is any rust at
  // all: paint lifts *because* the steel beneath it has already gone, so bare
  // metal only ever shows in fresh scratches.
  vec3 col = mix(steelCol, rustCol, smoothstep(0.0, 0.12, rust));
  col = mix(col, rustCol * 0.7, rustDeep * 0.6);
  col = mix(col, primerCol, primer);
  col = mix(col, paintCol, paint);
  col = mix(col, paintCol * 0.75, lifted * 0.5);
  col = mix(col, S(0.80, 0.81, 0.83), scrDeep * 0.8);
  col *= 1.0 - dirt * 0.16;
  s.albedo = col;

  float h = steelH;
  h -= pit * 0.22 + rustDeep * 0.10;
  h += paint * 0.05 + primer * 0.02 + lifted * 0.07;
  h -= scr * 0.05;
  s.height = h;

  // The roughness jump between enamel, primer, rust and bare steel is the whole
  // read: primer is a chalky matte between the gloss coat and the rust.
  float rough = mix(steelRough, 0.90 - rustGrain * 0.08, smoothstep(0.0, 0.12, rust));
  rough = mix(rough, 0.78 - peel * 0.06, primer);
  rough = mix(rough, 0.40 + paintN * 0.10 + orange * 0.06, paint);
  rough = mix(rough, 0.22, scrDeep * 0.8);
  rough += dirt * 0.10 + lifted * 0.14;
  s.rough = rough;

  s.metal = mix(1.0, 0.12, smoothstep(0.0, 0.14, rust) * (1.0 - paint * 0.85));
  s.metal = mix(s.metal, 0.0, max(paint, primer) * 0.9);
  s.metal = mix(s.metal, 1.0, scrDeep * 0.8);
  s.ao = 1.0 - pit * 0.3 - lifted * 0.2;
  s.wear = mix(0.35, 1.0, paint) * (1.0 - rust * 0.5);
}
`;

const METAL_RUSTED = METAL_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  vec3 steelCol;
  float steelRough, steelH;
  steelBase(uv, 7.0, steelCol, steelRough, steelH);

  // Lamellar scale: plates of oxide lifting at one edge.
  float f1, f2, id;
  vec2 rel;
  pworleyAngular(uv, vec2(22.0), 0.9, 3.0, f1, f2, id, rel);
  float plate = smoothstep(0.55, 0.2, f1);
  float lift = smoothstep(0.30, 0.55, f1) * plate;
  float plateTone = fract(id * 5.71);

  float coarse = pfbm01(pwarp(uv, vec2(3.0), 0.25, 11.0), vec2(5.0), 4, 0.55, 11.0);
  float mid = pfbm01(uv, vec2(28.0), 3, 0.5, 17.0);
  float fine = pfbm01(uv, vec2(110.0), 3, 0.5, 23.0);
  float grain = pgrain(uv, 900.0, 5.0);

  // Deep pitting where the oxide has spalled away.
  float pit = pdots(uv, vec2(64.0), 0.5, 0.34, 29.0);
  float pitDeep = pdots(uv, vec2(26.0), 0.3, 0.30, 31.0);

  // Surviving mill scale: blue-black, still metallic, still fairly smooth. It
  // has to cover a real fraction of the surface, because the value contrast
  // between black scale and pale bloom is what stops rust reading as a flat tint.
  // Thresholds sit tight around 0.5 because that is where a sum of fBm values
  // actually lives — its distribution crowds hard around its midpoint, so a
  // threshold out at 0.7 yields almost nothing and the whole sheet collapses to
  // one flat orange. The three tones each need a real share of the surface.
  float millScale = smoothstep(0.455, 0.560, coarse * 0.6 + mid * 0.4);
  // Bare steel where something has knocked the rust off recently. Small and
  // sparse: bare metal is by far the brightest thing on the sheet, so patches
  // any larger than a knuckle read as spilled solder.
  float bare = smoothstep(0.655, 0.720, pfbm01(uv, vec2(18.0), 3, 0.5, 37.0));
  // Powdery ferric bloom on the weather side, much paler than the wet oxide.
  float bloom = smoothstep(0.505, 0.605, coarse * 0.5 + fine * 0.5) * (1.0 - millScale);

  // Same reason: the raw sum barely leaves the middle of the rust ramp, so it is
  // stretched about its median to actually traverse black-brown to orange-ochre.
  float toneRaw = coarse * 0.40 + mid * 0.24 + fine * 0.16 + plateTone * 0.20;
  float tone = clamp((toneRaw - 0.5) * 2.6 + 0.5, 0.0, 1.0);
  vec3 rustCol = rustColor(tone, grain);
  // Deep pits hold the darkest, wettest oxide.
  rustCol = mix(rustCol, S(0.14, 0.08, 0.05), (pit * 0.5 + pitDeep * 0.5) * 0.6);
  // Bloomed, powdery rust on the lifted plate edges.
  rustCol = mix(rustCol, S(0.58, 0.40, 0.26), lift * 0.5);

  vec3 col = rustCol;
  col = mix(col, S(0.58, 0.50, 0.42), bloom * 0.5);
  col = mix(col, S(0.255, 0.255, 0.27), millScale * 0.85);
  col = mix(col, steelCol * 0.82, bare * 0.6);
  s.albedo = col;

  float h = 0.55 + (coarse - 0.5) * 0.14 + (mid - 0.5) * 0.08 + (fine - 0.5) * 0.05;
  h += plate * 0.10 + lift * 0.10;
  h -= pit * 0.28 + pitDeep * 0.34;
  h += (grain - 0.5) * 0.02;
  s.height = h;

  s.rough = 0.90 - tone * 0.06 + (fine - 0.5) * 0.08 + lift * 0.06 + bloom * 0.05;
  s.rough = mix(s.rough, 0.44, millScale * 0.8);
  s.rough = mix(s.rough, steelRough, bare * 0.7);
  s.metal = mix(0.08, 0.85, millScale);
  s.metal = mix(s.metal, 1.0, bare * 0.7);
  s.ao = 1.0 - pit * 0.25 - pitDeep * 0.35;
  s.wear = plate * 0.7 + bare * 0.3;
}
`;

const METAL_CORRUGATED = METAL_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  vec3 steelCol;
  float steelRough, steelH;
  steelBase(uv, 11.0, steelCol, steelRough, steelH);

  // Twenty-four flutes across a 2.4 m tile: a 100 mm pitch, which is what
  // roofing sheet actually is. Keep the profile a true sinusoid — flattening it
  // into bands is what makes procedural corrugation look like a barcode.
  float flutes = 24.0;
  float phase = fract(uv.x * flutes);
  float prof = 0.5 + 0.5 * cos(TAU * phase);
  float crest = smoothstep(0.62, 0.96, prof);
  float valley = smoothstep(0.40, 0.04, prof);

  // Sheet overlap: the sheets lap every eight flutes, upper one standing proud.
  float lapPhase = fract(uv.x * 3.0);
  float lap = smoothstep(0.035, 0.008, abs(lapPhase - 0.5));

  // Fixings: hex screws with rubber washers, driven through every fourth crest
  // in three rows up the sheet.
  vec2 fixCell = vec2(6.0, 3.0);
  vec2 fg = uv * fixCell;
  vec2 ff = fract(fg) - 0.5;
  float screwD = length(ff * vec2(1.0, 2.0)) * 2.0;
  float screw = smoothstep(0.30, 0.20, screwD);
  float washer = smoothstep(0.46, 0.33, screwD) * (1.0 - screw);
  float hex = 0.5 + 0.5 * cos(6.0 * atan(ff.y, ff.x));
  float screwOnCrest = smoothstep(0.3, 0.8, crest);
  screw *= screwOnCrest;
  washer *= screwOnCrest;

  // Rust lives in the valleys where water runs, and around every fixing.
  float rust = rustField(uv, -0.22 + valley * 0.30 + screw * 0.4 + washer * 0.3, 13.0);
  float rustGrain = pfbm01(uv, vec2(80.0), 3, 0.5, 19.0);
  vec3 rustCol = rustColor(0.2 + 0.65 * rustGrain, pgrain(uv, 700.0, 23.0));
  float streak = dripStains(uv, 3.0, 0.35, 29.0) * smoothstep(0.2, 0.6, rust);

  // Galvanising: zinc spangle crystals, visible where the coating survives.
  float spangleId = pworleyId(uv, vec2(40.0), 0.9, 31.0);
  float spangleEdge = smoothstep(0.045, 0.005, pworleyEdge(uv, vec2(40.0), 0.9, 31.0));
  vec3 zinc = mix(S(0.68, 0.69, 0.70), S(0.78, 0.79, 0.80), spangleId);
  zinc = mix(zinc, S(0.60, 0.61, 0.63), spangleEdge * 0.6);

  // Dents and a general beaten-up warp.
  float dent = pdots(uv, vec2(7.0), 0.35, 0.3, 37.0);
  float warp = pfbm01(uv, vec2(3.0, 2.0), 3, 0.55, 41.0);
  float dirt = grime(uv, 6.0, 43.0);

  vec3 col = zinc;
  col = mix(col, rustCol, smoothstep(0.05, 0.55, rust));
  col = mix(col, rustCol * 0.75, streak * 0.6);
  col = mix(col, S(0.30, 0.30, 0.31), screw * 0.6);
  col = mix(col, S(0.16, 0.15, 0.15), washer * 0.7);
  col *= 1.0 - dirt * 0.14 * (0.4 + valley);
  s.albedo = col;

  float h = 0.30 + prof * 0.58;
  h += (warp - 0.5) * 0.05;
  h -= dent * 0.08;
  h -= lap * 0.05;
  h += screw * (0.08 + hex * 0.025) + washer * 0.04;
  h -= rust * 0.03;
  h += (steelH - 0.6) * 0.15;
  s.height = h;

  s.rough = mix(0.38 + spangleId * 0.10 + spangleEdge * 0.08, 0.90 - rustGrain * 0.06,
                smoothstep(0.05, 0.55, rust));
  s.rough = mix(s.rough, 0.85, washer * 0.8);
  s.rough += dirt * 0.10 * (0.3 + valley * 0.7);
  s.metal = mix(1.0, 0.12, smoothstep(0.1, 0.6, rust));
  s.metal = mix(s.metal, 0.2, washer * 0.8);
  s.ao = 1.0 - valley * 0.12 - washer * 0.25 - lap * 0.2;
  s.wear = crest * (1.0 - rust * 0.6);
}
`;

const METAL_BRUSHED = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Brushing: three tiers so the anisotropy reads at every distance instead of
  // turning into uniform grey. The frequencies are bounded by what the map can
  // carry, not by how fine real brush grain is — this bakes at 512 px over an
  // 0.8 m tile, so the old 620- and 1600-cycle tiers were well under a texel and
  // resolved as soft blotches rather than grain. Sub-millimetre grain is the
  // shared detail normal's job.
  float coarse = pfbm01(uv, vec2(fCap(30.0, 3), 2.0), 3, 0.5, 3.0);
  float mid = pfbm01(uv, vec2(fCap(76.0, 2), 3.0), 2, 0.5, 7.0);
  float fine = pfbm01(uv, vec2(fCap(150.0, 2), 6.0), 2, 0.5, 11.0);
  float streak = coarse * 0.40 + mid * 0.38 + fine * 0.22;

  // The brush was drawn in a slight arc, so the direction drifts.
  float drift = pfbm01(uv, vec2(2.0, 3.0), 3, 0.55, 13.0);

  // Deeper drag marks from the coarse grit.
  float drag = smoothstep(0.72, 0.95, pfbm01(uv, vec2(fCap(110.0, 2), 4.0), 2, 0.5, 17.0));
  float scr = scratches(uv, 90.0, 0.04, 19.0);

  // Handling: greasy smudges raise roughness in soft broad patches. A strong warp
  // on a higher-frequency field drew these out into filaments, and since they are
  // the only thing on the sheet that hazes the specular they read as worms
  // crawling over it.
  float smudge = smoothstep(0.44, 0.82, pfbm01(pwarp(uv, vec2(2.0), 0.12, 23.0), vec2(3.5), 3, 0.5, 23.0));

  vec3 col = mix(S(0.74, 0.745, 0.755), S(0.80, 0.80, 0.805), streak);
  col *= 0.97 + 0.05 * drift;
  col = mix(col, S(0.86, 0.865, 0.87), drag * 0.4);
  col = mix(col, col * 0.95, smudge * 0.5);
  s.albedo = col;

  s.height = 0.5 + (streak - 0.5) * 0.5 + drag * 0.12 - scr * 0.2;
  // Anisotropic roughness: tight across the grain, loose along it. The floor has
  // to stay well above a polish — abraded stainless sits around 0.3, and at 0.16
  // a sphere of it mirrors the environment and reads as chrome, which buries the
  // brush marks the whole material is about under one specular hotspot.
  s.rough = 0.34 + (1.0 - streak) * 0.20 + drag * 0.10 + smudge * 0.14;
  s.rough += (mid - 0.5) * 0.06;
  s.metal = 1.0;
  s.ao = 1.0;
  s.wear = 0.5 + 0.5 * streak;
}
`;

const STEEL_PLATE = METAL_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  vec3 steelCol;
  float steelRough, steelH;
  steelBase(uv, 17.0, steelCol, steelRough, steelH);

  // Diamond tread: pairs of lozenges, alternating diagonal per cell.
  vec2 counts = vec2(5.0, 5.0);
  vec2 g = uv * counts;
  vec2 gi = floor(g);
  vec2 gf = fract(g) - 0.5;
  float parity = mod(gi.x + gi.y, 2.0);
  vec2 p = rot2(gf, parity < 0.5 ? 0.7854 : -0.7854);
  float d = min(
    sdRoundBox(p - vec2(0.0, 0.13), vec2(0.26, 0.055), 0.045),
    sdRoundBox(p + vec2(0.0, 0.13), vec2(0.26, 0.055), 0.045)
  );
  float tread = smoothstep(0.012, -0.03, d);
  float treadTop = smoothstep(-0.01, -0.05, d);

  // Weld bead running across the plate, with stacked-dime ripples and the
  // straw/blue heat tint either side of it.
  float beadPath = 0.30 + 0.03 * sin(TAU * uv.x * 2.0) + 0.02 * pgrad(uv, vec2(4.0, 1.0), 23.0);
  float beadD = abs(uv.y - beadPath);
  float bead = smoothstep(0.026, 0.014, beadD);
  float dimes = 0.5 + 0.5 * sin(TAU * uv.x * 46.0 + beadD * 40.0);
  float haz = smoothstep(0.075, 0.026, beadD) * (1.0 - bead);
  float hazTone = pfbm01(uv, vec2(30.0, 8.0), 3, 0.5, 29.0);

  // Rivet line along the plate edge.
  float rivetRow = min(abs(uv.y - 0.06), abs(uv.y - 0.94));
  vec2 rv = vec2(fract(uv.x * 8.0) - 0.5, rivetRow * 8.0);
  float rivetD = length(rv);
  float rivet = smoothstep(0.30, 0.16, rivetD);
  float rivetRing = smoothstep(0.42, 0.32, rivetD) * (1.0 - rivet);

  float mill = pfbm01(uv, vec2(14.0), 3, 0.55, 31.0);
  float grain = pgrain(uv, 800.0, 7.0);
  float dirt = grime(uv, 6.0, 37.0);
  // Rust creeps out of the recesses between the tread bars.
  float rust = rustField(uv, -0.22 + (1.0 - tread) * 0.18, 41.0);
  vec3 rustCol = rustColor(0.3 + 0.5 * mill, grain);
  float scuff = scratches(uv, 240.0, 0.05, 43.0);

  vec3 col = steelCol;
  col = mix(col, col * 0.88, (1.0 - tread) * 0.35);
  col = mix(col, S(0.66, 0.665, 0.68), tread * 0.5);
  col = mix(col, mix(S(0.62, 0.55, 0.40), S(0.42, 0.46, 0.60), hazTone), haz * 0.5);
  col = mix(col, S(0.68, 0.69, 0.70), bead * 0.6);
  col = mix(col, S(0.70, 0.71, 0.72), rivet * 0.5);
  col = mix(col, rustCol, smoothstep(0.1, 0.6, rust) * 0.85);
  col = mix(col, S(0.86, 0.87, 0.88), scuff * treadTop * 0.7);
  col *= 1.0 - dirt * 0.18 * (1.0 - tread * 0.6);
  s.albedo = col;

  float h = 0.42 + (steelH - 0.6) * 0.3 + (mill - 0.5) * 0.05;
  h += tread * 0.34;
  h += bead * (0.24 + dimes * 0.10);
  h += rivet * 0.26 - rivetRing * 0.04;
  h -= rust * 0.05;
  h += (grain - 0.5) * 0.015;
  s.height = h;

  s.rough = steelRough + 0.16 + (mill - 0.5) * 0.10;
  s.rough = mix(s.rough, 0.26, treadTop * 0.7);        // walked smooth
  s.rough = mix(s.rough, 0.62 + hazTone * 0.14, bead * 0.8);
  s.rough = mix(s.rough, 0.55, haz * 0.5);
  s.rough = mix(s.rough, 0.92, smoothstep(0.1, 0.6, rust) * 0.85);
  s.rough += dirt * 0.12 * (1.0 - tread * 0.5);
  s.metal = mix(1.0, 0.15, smoothstep(0.15, 0.65, rust) * 0.8);
  s.ao = 1.0 - (1.0 - tread) * 0.14 - rivetRing * 0.3;
  s.wear = treadTop * 0.8 + rivet * 0.5 + 0.15;
}
`;

const GUN_METAL = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Parkerised phosphate over machined steel: matte, dark, faintly crystalline.
  // The tile is 300 mm, so the frequency ceiling here is set by the texture and
  // not by the real finish: a 0.3 mm grit or a 0.7 mm cutter pitch lands under
  // three texels and turns into moire, so both are coarsened to about 1-2 mm.
  float blast = pgrain(uv, 256.0, 3.0);
  float blast2 = pfbm01(uv, vec2(60.0), 3, 0.5, 7.0);
  float crystal = pworleyId(uv, vec2(90.0), 0.9, 11.0);

  // Machining: fine end-mill passes across the part, in one direction only. A
  // second periodic tier for the cutter stepover ran across these, and two
  // resolvable periodic fields crossing at right angles interfere into a lattice
  // — a receiver that reads unmistakably as woven cloth. Anything the stepover
  // was contributing is not worth that.
  float pass = striation(uv, 50.0, 13.0);

  // Wear: handled areas polish back to bright steel. Kept small and tight — a
  // receiver wears at its corners and along the slide rails, so broad soft
  // blotches of bright steel read as camouflage instead. The high points are the
  // resolve pass's job, from the curvature of the real height field.
  float polish = smoothstep(0.70, 0.81, pfbm01(uv, vec2(7.0), 3, 0.55, 19.0));

  float scr = scratches(uv, 200.0, 0.04, 23.0);
  float carbon = smoothstep(0.55, 0.9, pfbm01(uv, vec2(8.0), 3, 0.5, 29.0));

  // Parkerising is a conversion coating over steel, so this is still a metal
  // reflectance, just a dark and desaturated one.
  vec3 park = mix(S(0.30, 0.30, 0.315), S(0.38, 0.38, 0.395), blast2);
  park *= 0.94 + 0.12 * blast;
  park = mix(park, park * 1.06, crystal * 0.4);
  // Worn parkerising exposes the steel underneath, which is bright but not
  // chrome: it keeps a little of the phosphate in the surface porosity.
  vec3 steel = mix(S(0.62, 0.625, 0.64), S(0.72, 0.725, 0.735), pass);

  vec3 col = mix(park, steel, polish * 0.8);
  col = mix(col, S(0.80, 0.805, 0.81), scr * 0.5);
  col = mix(col, S(0.24, 0.24, 0.25), carbon * 0.35);
  s.albedo = col;

  s.height = 0.55 + (pass - 0.5) * 0.10 +
             (blast - 0.5) * 0.05 + (blast2 - 0.5) * 0.06 - scr * 0.18;
  s.rough = mix(0.56 + (1.0 - blast2) * 0.12, 0.22 + pass * 0.08, polish * 0.9);
  s.rough = mix(s.rough, 0.16, scr * 0.6);
  s.rough += carbon * 0.10;
  s.metal = mix(0.88, 1.0, polish);
  s.ao = 1.0;
  s.wear = 0.85;
}
`;

export const METAL_SHADERS: Record<string, string> = {
  metal_painted: METAL_PAINTED,
  metal_rusted: METAL_RUSTED,
  metal_corrugated: METAL_CORRUGATED,
  metal_brushed: METAL_BRUSHED,
  steel_plate: STEEL_PLATE,
  gun_metal: GUN_METAL,
};
