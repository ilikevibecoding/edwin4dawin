/**
 * Asphalt and the four loose grounds. What separates these from noise is that
 * each one is built from the right *primitive*: asphalt is stones suspended in
 * bitumen, gravel is packed domes with real height, sand is a ripple field with
 * grain on top, rubble is faceted fragments with dust in the gaps.
 */

const ASPHALT = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Wheel paths: two polished lanes where the aggregate has been ground flat.
  // The edges wander, because traffic does not drive down a ruled line.
  float wanderA = 0.06 * pgrad(uv, vec2(1.0, 3.0), 61.0);
  float wanderB = 0.06 * pgrad(uv, vec2(1.0, 4.0), 67.0);
  float l1 = exp(-pow((uv.x - 0.24 + wanderA) / 0.20, 2.0));
  float l2 = exp(-pow((uv.x - 0.71 + wanderB) / 0.16, 2.0));
  float lane = clamp(l1 + l2, 0.0, 1.0);
  // Roughness runs anisotropically along the direction of travel, which is up
  // the tile: fast variation across the lane, almost none along it.
  float polishStreak = pfbm01(uv, vec2(70.0, 5.0), 3, 0.55, 3.0);
  float polish = lane * (0.45 + 0.55 * polishStreak);

  // Aggregate: chippings of several sizes bound in bitumen.
  float bigH, bigId;
  vec2 bigRel;
  pstones(uv, vec2(34.0), 0.42, 5.0, bigH, bigId, bigRel);
  float smallH, smallId;
  vec2 smallRel;
  pstones(uv, vec2(78.0), 0.38, 11.0, smallH, smallId, smallRel);
  float stones = max(bigH, smallH * 0.7);
  float stoneMask = smoothstep(0.3, 0.75, stones) * (1.0 - polish * 0.55);
  float stoneId = bigH > smallH * 0.7 ? bigId : smallId;

  float bitumen = pfbm01(uv, vec2(24.0), 3, 0.5, 17.0);
  float grain = pgrain(uv, 900.0, 7.0);
  float blotch = pfbm01(pwarp(uv, vec2(2.0), 0.3, 23.0), vec2(3.0), 3, 0.55, 23.0);

  // Alligator cracking: cell boundaries of a warped Worley field.
  vec2 cw = pwarp(uv, vec2(3.0), 0.12, 31.0);
  float edge = pworleyEdge(cw, vec2(7.0), 0.9, 31.0);
  float crackWide = smoothstep(0.10, 0.02, edge);
  float crack = smoothstep(0.045, 0.006, edge);
  float hair = pcracks(uv, vec2(16.0), 0.08, 0.3, 3, 37.0) * 0.6;
  crack = max(crack, hair);
  // Cracking is worst away from the compacted wheel paths.
  crack *= 0.35 + 0.65 * smoothstep(0.7, 0.1, lane);
  crackWide *= 0.35 + 0.65 * smoothstep(0.7, 0.1, lane);

  // Crack sealing: bitumen poured over the worst of it, plus one paving seam.
  // Kept narrow and low-contrast — a fat black stripe down every tile is the
  // first thing that gives a procedural road away.
  float seamX = 0.41 + 0.035 * sin(TAU * uv.y * 2.0) + 0.025 * pgrad(uv, vec2(1.0, 4.0), 41.0);
  float seam = smoothstep(0.016, 0.007, abs(uv.x - seamX));
  float sealed = max(seam, crackWide * smoothstep(0.45, 0.75, pfbm01(uv, vec2(4.0), 3, 0.5, 43.0)));
  float tar = clamp(sealed, 0.0, 1.0);

  // A rectangular utility patch of newer, coarser material.
  vec2 pd = uv - vec2(0.70, 0.28);
  float patchEdge = sdRoundBox(pd, vec2(0.20, 0.14), 0.03) +
                    0.02 * pfbm(uv, vec2(12.0), 3, 0.5, 47.0);
  float repair = smoothstep(0.004, -0.004, patchEdge);

  // Oil dripped where vehicles idle.
  float oil = smoothstep(0.62, 0.8, pfbm01(pwarp(uv, vec2(3.0), 0.35, 53.0), vec2(5.0), 3, 0.5, 53.0)) *
              smoothstep(0.2, 0.9, lane);

  // Bitumen sits around 0.05 linear reflectance: dark, but nowhere near black.
  vec3 bitumenCol = mix(S(0.215, 0.212, 0.210), S(0.30, 0.295, 0.288), bitumen);
  bitumenCol *= 0.9 + 0.2 * blotch;
  // Most chippings are still coated in bitumen; only the ones the tyres have
  // scrubbed clean show their real colour, so the ramp stays mostly dark.
  vec3 stoneCol = ramp4(
    S(0.26, 0.255, 0.25),
    S(0.33, 0.325, 0.315),
    S(0.44, 0.42, 0.40),
    S(0.30, 0.28, 0.27),
    stoneId
  );
  stoneCol *= 0.92 + 0.16 * grain;
  // A few pale limestone chippings, which is where the sparkle comes from.
  stoneCol = mix(stoneCol, S(0.55, 0.53, 0.49), step(0.88, stoneId) * 0.8);

  // Metalling in a desert town is not a fresh northern road surface: the sun
  // takes the bitumen out of the top millimetre in patches, leaving pale grey
  // areas of exposed aggregate against the sound black, and wind-blown dust
  // fills the texture wherever traffic has not scrubbed it out. Both are half-
  // to one-metre features, and without them the road holds almost nothing at
  // conversational distance however busy the chippings are up close.
  float patchAge, oxidised, dusting;
  weatherCoat(uv, 61.0, 1.4, patchAge, oxidised, dusting);

  vec3 col = mix(bitumenCol, stoneCol, stoneMask * 0.80);
  // Oxidised bitumen goes grey and loses its depth.
  col = mix(col, mix(col, S(0.46, 0.445, 0.420), 0.62), oxidised);
  col *= 1.0 + patchAge * 0.09;
  col = mix(col, col * 0.72, polish * 0.5);
  col = mix(col, S(0.33, 0.325, 0.32), repair * 0.7);
  col = mix(col, S(0.17, 0.17, 0.17), crack * 0.8);
  col = mix(col, S(0.205, 0.20, 0.195), tar * 0.85);
  col = mix(col, S(0.165, 0.16, 0.165), oil * 0.6);
  // Dust settles where the tyres do not run.
  col = mix(col, S(0.58, 0.535, 0.455), dusting * (1.0 - lane * 0.8) * 0.26);
  col *= 0.96 + 0.08 * grain;
  s.albedo = col;

  float h = 0.55 + (bitumen - 0.5) * 0.06 + (blotch - 0.5) * 0.05;
  h += stones * 0.28 * (1.0 - polish * 0.7);
  h += (grain - 0.5) * 0.03;
  h -= crack * 0.34 + crackWide * 0.06;
  h += tar * 0.10;
  h -= repair * 0.03;
  s.height = h;

  // Roughness carries the story: polished lanes, gritty verges, glossy tar.
  s.rough = 0.80 + (bitumen - 0.5) * 0.10 - stoneMask * 0.06;
  s.rough = mix(s.rough, 0.42 + polishStreak * 0.14, polish * 0.85);
  s.rough = mix(s.rough, 0.34, tar * 0.8);
  s.rough = mix(s.rough, 0.30, oil * 0.7);
  s.rough += crack * 0.10 + repair * 0.06;
  // Oxidised and dusted areas have lost their binder and are matt.
  s.rough += oxidised * 0.12 + dusting * 0.06 - patchAge * 0.04;
  s.metal = 0.0;
  s.ao = 1.0 - crack * 0.4;
  s.wear = stoneMask * (0.4 + 0.6 * lane);
}
`;

const SAND = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // One dominant ripple train, not two crossing ones: crossed sine sets read as
  // moiré, and wind only blows one way at a time. The crests meander, die out
  // and reform along their length, and the profile is asymmetric — a long
  // windward slope into a short steep lee face — which is the whole tell.
  // Enough meander to stop the crests being ruled lines, not enough for them to
  // wander a whole wavelength and start braiding into each other.
  float meander = pgrad(uv, vec2(2.0, 3.0), 3.0) * 0.20 + pgrad(uv, vec2(5.0, 7.0), 5.0) * 0.08;
  float phase = fract(uv.x * 9.0 + uv.y * 3.0 + meander);
  // 22 cm wavelength on a 2 m tile. The asymmetry is real but deliberately not
  // extreme: a razor-thin lee face turns into a hard dark line under a key light
  // and the whole field reads as corduroy rather than sand.
  const float BRINK = 0.68;
  float prof = phase < BRINK ? phase / BRINK : (1.0 - phase) / (1.0 - BRINK);
  prof = prof * prof * (3.0 - 2.0 * prof);
  // Ripple height varies along the crest, so they break up instead of striping.
  // The crest lines run along (3,-9), i.e. mostly in v, so the amplitude field
  // has to vary slowly in v or the crests get chopped into short dashes. The
  // floor is near zero so whole runs of crest die out rather than all surviving
  // at the same height, which is what kills the comb look.
  float crestAmp = smoothstep(0.30, 0.62, pfbm01(uv, vec2(7.0, 2.0), 3, 0.55, 7.0));
  // Patches the wind has scoured smooth, where the ripples never formed.
  float scoured = smoothstep(0.52, 0.82, pfbm01(pwarp(uv, vec2(2.0), 0.3, 11.0), vec2(3.0), 3, 0.55, 11.0));
  float ripples = prof * (0.20 + 0.80 * crestAmp) * (1.0 - scoured * 0.8);

  float dune = pfbm01(pwarp(uv, vec2(2.0), 0.25, 13.0), vec2(3.0), 3, 0.55, 13.0);
  float mid = pfbm01(uv, vec2(30.0), 3, 0.5, 19.0);
  // Granular clumping: the tier between the ripple and the individual grain.
  float clumpH, clumpId;
  vec2 clumpRel;
  pstones(uv, vec2(130.0), 0.5, 43.0, clumpH, clumpId, clumpRel);
  float grain = pgrain(uv, 512.0, 5.0);
  float grain2 = pgrain(uv, 256.0, 21.0);
  // Individual quartz grains catching the light.
  float sparkle = step(0.988, pgrain(uv, 512.0, 33.0));

  // Shells and small pebbles left on the surface, concentrated in the troughs
  // where the wind has winnowed the fines away.
  float pebble = pdots(uv, vec2(26.0), 0.16, 0.22, 27.0) * (0.4 + 0.6 * (1.0 - ripples));

  // Damp sand sits below the surface layer and shows in the scoured hollows.
  float damp = clamp((1.0 - dune) * 0.7 + scoured * 0.4 - 0.35, 0.0, 1.0);
  damp *= smoothstep(0.35, 0.75, pfbm01(uv, vec2(4.0), 3, 0.5, 37.0));

  // A trafficked street is not a clean dune. Between the ripples and the grain
  // there is drift: places the fines have blown out leaving darker coarse grit,
  // places dust has settled pale over the top, and compacted paths where feet
  // and wheels have packed the surface down. On a 2 m tile this field runs from
  // about 60 cm down to 12 cm, which is the band the eye reads a ground plane by
  // at walking distance and the band this material had nothing in.
  float packed, winnow, dusting;
  weatherCoat(uv, 51.0, 1.0, packed, winnow, dusting);

  vec3 dry = mix(S(0.635, 0.545, 0.405), S(0.815, 0.742, 0.600), winnow);
  dry *= 1.0 + packed * 0.055;
  dry *= 0.93 + 0.14 * dusting;
  dry *= 0.94 + 0.12 * dune;
  dry *= 0.96 + 0.08 * mid;
  dry *= 0.96 + 0.09 * clumpH;
  dry *= 0.97 + 0.06 * grain;
  // The lee face is in the wind shadow and holds slightly coarser, darker sand.
  // Kept weak and broad: a hard dark band here reads as a painted-on shadow, and
  // the ripple relief is the normal map's job, not the albedo's.
  dry = mix(dry, S(0.68, 0.60, 0.46), smoothstep(0.55, 1.0, phase) * 0.10);
  vec3 wet = S(0.45, 0.37, 0.27);
  vec3 col = mix(dry, wet, damp * 0.7);
  col = mix(col, S(0.82, 0.78, 0.70), pebble * 0.55);
  col += vec3(0.04) * sparkle;
  s.albedo = col;

  // Ripple amplitude is set against the wavelength: about 1 cm of crest over a
  // 15 cm ripple, which is the slope that makes wind ripples read from standing
  // height instead of looking like a smooth dune.
  float h = 0.40 + (dune - 0.5) * 0.20 + ripples * 0.48 + (mid - 0.5) * 0.04;
  h += (winnow - 0.5) * 0.07 - packed * 0.02;
  h += clumpH * 0.06;
  h += (grain - 0.5) * 0.028 + (grain2 - 0.5) * 0.016;
  h += pebble * 0.10;
  s.height = h;

  s.rough = 0.93 - damp * 0.14 - pebble * 0.15 + (grain - 0.5) * 0.06;
  s.rough -= sparkle * 0.25;
  s.rough -= scoured * 0.04;
  // Packed sand is smoother than loose; winnowed grit is rougher than dust.
  s.rough += winnow * 0.05 - packed * 0.04;
  s.metal = 0.0;
  s.ao = 1.0;
  s.wear = 0.3 + 0.7 * pebble;
}
`;

const GRAVEL = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Two size classes of packed stones, each a real dome in the height field.
  float bigH, bigId;
  vec2 bigRel;
  pstones(uv, vec2(17.0), 0.62, 3.0, bigH, bigId, bigRel);
  float midH, midId;
  vec2 midRel;
  pstones(uv, vec2(31.0), 0.55, 11.0, midH, midId, midRel);
  float smallH, smallId;
  vec2 smallRel;
  pstones(uv, vec2(62.0), 0.5, 23.0, smallH, smallId, smallRel);

  float stones = max(bigH, max(midH * 0.82, smallH * 0.6));
  float id = bigH >= max(midH * 0.82, smallH * 0.6)
    ? bigId
    : (midH * 0.82 >= smallH * 0.6 ? midId : smallId);
  vec2 rel = bigH >= max(midH * 0.82, smallH * 0.6) ? bigRel : (midH * 0.82 >= smallH * 0.6 ? midRel : smallRel);

  // Stone surface: crystalline speckle on granite, banding on the softer ones.
  float speck = pgrain(uv, 800.0, 7.0);
  float band = pfbm01(uv * 3.0 + rel * 0.4, vec2(40.0), 3, 0.55, 13.0);
  float chip = pfbm01(uv, vec2(120.0), 2, 0.5, 17.0);

  // Crushed rock is a mixed aggregate, so the spread of stone colour is wide:
  // dark basalt, mid granite, iron-stained sandstone, a bluish flint. Making the
  // stones one value with noise on top is what turns gravel into popcorn.
  vec3 stoneCol = ramp4(
    S(0.28, 0.27, 0.26),
    S(0.47, 0.45, 0.42),
    S(0.41, 0.34, 0.27),
    S(0.34, 0.34, 0.36),
    id
  );
  // A few limestone and iron-stained stones for variety.
  stoneCol = mix(stoneCol, S(0.54, 0.52, 0.48), step(0.90, id) * 0.8);
  stoneCol = mix(stoneCol, S(0.38, 0.25, 0.16), step(0.06, 1.0 - id) * step(0.94, 1.0 - id) * 0.7);
  // Per-stone value on top of the hue spread, so no two neighbours match. The
  // ceiling is held down: a pale stone that also draws a high multiplier ends up
  // white, and a handful of white stones is all it takes to read as popcorn.
  stoneCol *= mix(0.70, 1.12, fract(id * 23.7));
  stoneCol *= 0.90 + 0.18 * mix(speck, band, 0.5);
  stoneCol *= 0.94 + 0.12 * chip;

  // Fines: crushed dust and grit filling the voids between stones. Darker than
  // the stones, not lighter — the dust is damp and it sits down in the shade.
  float voids = 1.0 - smoothstep(0.12, 0.5, stones);
  float dustN = pfbm01(uv, vec2(70.0), 3, 0.5, 29.0);
  vec3 dustCol = mix(S(0.30, 0.28, 0.25), S(0.42, 0.40, 0.36), dustN);
  dustCol *= 0.9 + 0.2 * pgrain(uv, 600.0, 31.0);

  // A wet patch: darker and glossier, and it soaks the fines darker still.
  float wet = smoothstep(0.58, 0.72, pfbm01(pwarp(uv, vec2(2.0), 0.3, 41.0), vec2(4.0), 3, 0.5, 41.0));

  float bind = smoothstep(0.16, 0.52, stones);
  vec3 col = mix(dustCol, stoneCol, bind);
  col = mix(col, col * 0.55, wet * 0.7);
  s.albedo = col;

  float h = 0.18 + stones * 0.78;
  h += (dustN - 0.5) * 0.05 * voids;
  h += (speck - 0.5) * 0.02;
  s.height = h;

  s.rough = mix(0.94 + (dustN - 0.5) * 0.06, 0.66 + band * 0.22, bind);
  s.rough = mix(s.rough, 0.34, wet * 0.75);
  s.metal = 0.0;
  s.ao = 1.0 - voids * 0.25;
  s.wear = smoothstep(0.3, 0.8, stones);
}
`;

const DIRT = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Clumping: soil aggregates rather than smooth noise.
  float clump = pbillow(pwarp(uv, vec2(3.0), 0.25, 3.0), vec2(6.0), 4, 0.55, 3.0);
  float clodH, clodId;
  vec2 clodRel;
  pstones(uv, vec2(13.0), 0.55, 7.0, clodH, clodId, clodRel);
  float fineClod, fcId;
  vec2 fcRel;
  pstones(uv, vec2(40.0), 0.45, 13.0, fineClod, fcId, fcRel);
  float mid = pfbm01(uv, vec2(22.0), 3, 0.5, 17.0);
  float grain = pgrain(uv, 900.0, 5.0);

  // Embedded stones: harder, lighter, and they sit proud of the soil.
  float pebbleH, pebbleId;
  vec2 pebbleRel;
  pstones(uv, vec2(21.0), 0.26, 29.0, pebbleH, pebbleId, pebbleRel);
  float pebble = smoothstep(0.25, 0.7, pebbleH) * step(0.70, pebbleId);
  // Stones that have been sat in soil are soil-coloured, not clean grey chips.
  vec3 pebbleCol = ramp4(
    S(0.34, 0.31, 0.27),
    S(0.46, 0.42, 0.36),
    S(0.40, 0.33, 0.26),
    S(0.29, 0.28, 0.27),
    fract(pebbleId * 7.31)
  );

  // Dried, cracked ground in the exposed patches only.
  float dryness = smoothstep(0.45, 0.8, pfbm01(uv, vec2(3.0), 3, 0.55, 23.0));
  float crack = smoothstep(0.05, 0.008, pworleyEdge(pwarp(uv, vec2(4.0), 0.1, 31.0), vec2(11.0), 0.9, 31.0));
  crack *= dryness;

  // Organic litter: dark specks and short fibres.
  float litter = step(0.972, pgrain(uv, 420.0, 37.0));
  float fibre = smoothstep(0.75, 0.95, pfbm01(shear(uv, 1.0), vec2(200.0, 9.0), 2, 0.5, 41.0)) * 0.5;

  // Compacted footpath: darker, flatter, slightly glossy.
  float packed = smoothstep(0.55, 0.75, pfbm01(pwarp(uv, vec2(2.0), 0.3, 43.0), vec2(3.0), 3, 0.5, 43.0));
  float moist = clamp(packed * 0.6 + (1.0 - clump) * 0.4 - 0.15, 0.0, 1.0);

  vec3 dryCol = mix(S(0.50, 0.41, 0.31), S(0.60, 0.51, 0.39), clump);
  dryCol *= 0.93 + 0.14 * mid;
  dryCol *= 0.95 + 0.10 * grain;
  vec3 wetCol = S(0.27, 0.21, 0.15);
  vec3 col = mix(dryCol, wetCol, moist * 0.8);
  col = mix(col, pebbleCol, pebble * 0.8);
  col = mix(col, S(0.20, 0.16, 0.11), crack * 0.7);
  col = mix(col, S(0.16, 0.13, 0.09), litter * 0.8);
  col = mix(col, S(0.34, 0.29, 0.20), fibre * 0.35);
  s.albedo = col;

  float h = 0.45 + (clump - 0.5) * 0.24 + clodH * 0.22 + fineClod * 0.10;
  h += (mid - 0.5) * 0.06 + (grain - 0.5) * 0.03;
  h += pebble * 0.16;
  h -= crack * 0.26;
  h -= packed * 0.06;
  s.height = h;

  s.rough = 0.93 - moist * 0.14 - pebble * 0.18 + crack * 0.05;
  s.rough += (grain - 0.5) * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - crack * 0.3;
  s.wear = 0.25 + 0.75 * pebble;
}
`;

const RUBBLE = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Angular fragments: a rotated Chebyshev metric gives straight edges and
  // corners, and each cell gets a random facet tilt so faces catch light
  // independently.
  //
  // The large fragments have to *pack*, so their mask is the cell interior taken
  // from the F2-F1 edge and each cell carries its own base level. Masking on
  // distance from the cell centre instead puts an identically shaped diamond in
  // the middle of every cell, and a demolition pile then reads as a field of
  // kites sitting on a grid.
  float f1, f2, id;
  vec2 rel;
  pworleyAngular(uv, vec2(8.0), 0.85, 3.0, f1, f2, id, rel);
  float chunk = smoothstep(0.0, 0.09, f2 - f1);
  float level = fract(id * 3.77);
  float facet = dot(rel, vec2(cos(id * TAU), sin(id * TAU))) * 0.8;

  // Loose pieces strewn over the packed base. These are discrete, so a centre
  // mask is right — but only some cells carry one, and their sizes vary, or the
  // regularity of the underlying lattice shows through again.
  float f1b, f2b, idb;
  vec2 relb;
  pworleyAngular(uv, vec2(19.0), 0.9, 11.0, f1b, f2b, idb, relb);
  float sizeB = fract(idb * 11.7);
  float chunkB = smoothstep(0.20 + 0.34 * sizeB, 0.06, f1b) * step(0.40, fract(idb * 5.13));
  float facetB = dot(relb, vec2(cos(idb * TAU), sin(idb * TAU))) * 0.5;

  float f1c, f2c, idc;
  vec2 relc;
  pworleyAngular(uv, vec2(44.0), 0.9, 23.0, f1c, f2c, idc, relc);
  float grit = smoothstep(0.45, 0.1, f1c);

  // Broken concrete shows aggregate on the fracture faces.
  float st, sid;
  float agg = aggregate(uv, 55.0, 29.0, st, sid);
  float dustN = pfbm01(uv, vec2(50.0), 3, 0.5, 31.0);
  float grain = pgrain(uv, 800.0, 7.0);

  // Fragment type from the cell id: grey concrete, red brick, or dark stone. The
  // loose pieces are drawn from their own id, so a brick chip can come to rest on
  // a slab of concrete.
  float kind = mix(fract(id * 7.31), fract(idb * 7.31), step(0.5, chunkB));
  vec3 concreteCol = mix(S(0.44, 0.435, 0.425), S(0.56, 0.55, 0.53), agg * 0.5 + 0.5 * dustN);
  concreteCol = mix(concreteCol, S(0.60, 0.585, 0.55), st * 0.4);
  // Broken brick in a rubble pile is dusty pink-brown, never the clean red of a
  // brick face: it has masonry dust ground into every fracture surface. Left
  // saturated it reads as scraps of orange paper scattered over grey chunks.
  vec3 brickCol = mix(S(0.40, 0.26, 0.21), S(0.50, 0.34, 0.28), dustN);
  vec3 darkCol = mix(S(0.28, 0.27, 0.26), S(0.38, 0.37, 0.35), dustN);
  vec3 fragCol = kind < 0.62 ? concreteCol : (kind < 0.85 ? brickCol : darkCol);
  fragCol *= 0.92 + 0.16 * grain;

  // Dust: everything is coated, and the low ground is full of fines. The pile is
  // not level either — it drifts over a couple of metres, fines settle into the
  // hollows and the crests get walked clean.
  float mound = pfbm01(uv, vec2(3.0), 3, 0.6, 53.0);
  float height = chunk * (0.20 + 0.72 * level + facet * 0.7) +
                 chunkB * 0.34 * (0.6 + facetB) + grit * 0.10;
  height = clamp(height + (mound - 0.5) * 0.24, 0.0, 1.2);
  float low = 1.0 - smoothstep(0.05, 0.45, height);
  vec3 dustCol = mix(S(0.52, 0.505, 0.475), S(0.61, 0.595, 0.56), dustN);

  // A twist of exposed reinforcement crossing the pile, broken into the few
  // stretches that are actually above the fines. An unbroken wire running the
  // width of the tile reads as a worm and gives the repeat away immediately.
  float barPath = 0.42 + 0.12 * sin(TAU * (uv.x * 1.0 + 0.15)) + 0.05 * pgrad(uv, vec2(3.0, 1.0), 41.0);
  float barRun = smoothstep(0.52, 0.62, pfbm01(uv, vec2(6.0, 2.0), 3, 0.5, 43.0));
  float bar = smoothstep(0.012, 0.005, abs(uv.y - barPath)) *
              smoothstep(0.05, 0.2, height) * barRun;
  vec3 barCol = rustColor(0.4 + 0.4 * dustN, grain);

  vec3 col = mix(dustCol, fragCol, smoothstep(0.06, 0.35, height));
  col = mix(col, dustCol, low * 0.55);
  // Everything on a demolition pile wears a film of masonry dust.
  col = mix(col, dustCol, 0.14);
  col = mix(col, barCol, bar);
  // Broad value drift across the pile, independent of the fragment lattice, so
  // there is something to see in it from across a street and not only at a metre.
  col *= 0.88 + 0.24 * pfbm01(uv, vec2(2.0), 3, 0.6, 59.0);
  s.albedo = col;

  float h = 0.12 + height * 0.8 + (dustN - 0.5) * 0.05 + (grain - 0.5) * 0.02;
  h += bar * 0.05;
  s.height = h;

  s.rough = mix(0.95, 0.84 - st * 0.06, smoothstep(0.06, 0.35, height));
  s.rough = mix(s.rough, 0.75, bar);
  s.rough += low * 0.04;
  s.metal = bar * 0.45;
  s.ao = 1.0 - low * 0.3;
  s.wear = smoothstep(0.2, 0.7, height) * 0.8;
}
`;

export const GROUND_SHADERS: Record<string, string> = {
  asphalt: ASPHALT,
  sand: SAND,
  gravel: GRAVEL,
  dirt: DIRT,
  rubble: RUBBLE,
};
