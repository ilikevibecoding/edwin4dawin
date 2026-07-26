/**
 * Soft goods. Cloth reads as cloth because of three things at three scales: the
 * interlace of individual threads (millimetres), the fibre fuzz standing off
 * that interlace (sub-millimetre, normal map only), and the slack of the panel
 * itself (tens of centimetres). Get one of those wrong and it looks like paper
 * with a pattern on it.
 */

const SOFT_BASE = /* glsl */ `
/**
 * Per-thread tone. Real yarn is dyed in batches and spun unevenly, so each
 * thread differs slightly from its neighbours along its whole length. Indexing
 * by thread number rather than sampling noise is what produces that streaky
 * look instead of blotches.
 */
float threadTone(vec2 uv, float freq, float onTop, float seed) {
  float warpIdx = floor(uv.x * freq);
  float weftIdx = floor(uv.y * freq);
  float warp = hash21(vec2(warpIdx, seed));
  float weft = hash21(vec2(weftIdx, seed + 57.0));
  // Slubs: a thread thickens for part of its run.
  float slubW = pfbm01(uv, vec2(2.0, freq), 2, 0.5, seed + 3.3);
  float slubF = pfbm01(uv, vec2(freq, 2.0), 2, 0.5, seed + 9.9);
  return mix(weft * 0.7 + slubF * 0.3, warp * 0.7 + slubW * 0.3, onTop);
}

/** Fibre fuzz: sub-thread noise that only ever shows up in the normal map. */
float fuzz(vec2 uv, float freq, float seed) {
  float a = pgrain(uv, freq * 5.0, seed);
  float b = pfbm01(uv, vec2(freq * 3.0), 2, 0.5, seed + 4.4);
  return a * 0.55 + b * 0.45;
}

/** Slack: the low-frequency sag and creasing of an unsupported panel. */
float slack(vec2 uv, float seed) {
  vec2 w = pwarp(uv, vec2(2.0), 0.25, seed);
  float folds = pfbm01(w, vec2(3.0, 2.0), 3, 0.6, seed);
  float crease = 1.0 - abs(pgrad(uv, vec2(4.0, 3.0), seed + 21.0));
  return folds * 0.7 + crease * 0.3;
}

/** Water stain with the darker mineral tide line every dried spill leaves. */
void tideStain(vec2 uv, float freq, float amount, float seed, out float body, out float rim) {
  float f = pfbm01(pwarp(uv, vec2(freq * 0.5), 0.3, seed), vec2(freq), 4, 0.55, seed);
  float t = 0.62 - amount * 0.25;
  body = smoothstep(t, t + 0.10, f);
  rim = smoothstep(t - 0.05, t + 0.01, f) * (1.0 - smoothstep(t + 0.01, t + 0.09, f));
}
`;

const FABRIC_CANVAS = SOFT_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Heavy cotton duck: about 14 mm of yarn pitch on a 0.9 m tile, coarse enough
  // that the interlace still reads from a couple of metres away.
  const float threads = 64.0;

  float onTop;
  vec2 along;
  float w = weave(uv, threads, onTop, along);
  float tone = threadTone(uv, threads, onTop, 3.0);
  float fz = fuzz(uv, threads, 7.0);

  // Cotton duck, dyed olive drab, sun-bleached from the top down.
  float bleach = smoothstep(0.15, 0.95, uv.y);
  float dyeDrift = pfbm01(uv, vec2(4.0), 3, 0.55, 11.0);
  vec3 dye = mix(S(0.30, 0.31, 0.22), S(0.38, 0.38, 0.28), dyeDrift);
  vec3 faded = mix(S(0.46, 0.45, 0.36), S(0.55, 0.53, 0.44), dyeDrift);
  vec3 col = mix(dye, faded, bleach * 0.75);
  // Warp and weft catch the light differently and were dyed separately. This is
  // the tier that has to read at arm's length, so it gets a real share of the
  // value range rather than a token wobble.
  col *= 0.85 + 0.30 * tone;
  col = mix(col, col * 1.09, onTop * 0.5);

  // Hems: a doubled-over edge with two rows of stitching top and bottom.
  float hemBand = smoothstep(0.075, 0.065, min(uv.y, 1.0 - uv.y));
  float st = max(
    stitchLine(uv, 0.040, threads * 0.28, 0.006, 3.0),
    stitchLine(uv, 0.960, threads * 0.28, 0.006, 3.0)
  );

  // A repair patch, machine-sewn on, in very slightly the wrong shade. Kept
  // subtle: a bold rectangle on a tiling texture repeats into wallpaper.
  vec2 pc = (uv - vec2(0.68, 0.36)) / vec2(0.17, 0.13);
  float patchD = sdRoundBox(pc, vec2(1.0, 1.0), 0.18);
  float patchM = smoothstep(0.03, -0.02, patchD);
  float patchStitch = smoothstep(0.10, 0.04, abs(patchD + 0.13)) *
                      (0.5 + 0.5 * cos((pc.x + pc.y) * 48.0));
  col = mix(col, col * vec3(0.94, 0.96, 0.92), patchM * 0.8);

  // Water staining, kept to a fifth of the panel. At half coverage the pale
  // bodies and dark tide rims interlock into what is unmistakably a DPM camo
  // print rather than a tarpaulin that has been rained on.
  float stainBody, stainRim;
  tideStain(uv, 5.0, 0.20, 17.0, stainBody, stainRim);
  float mildew = smoothstep(0.66, 0.86, pfbm01(uv, vec2(22.0), 4, 0.5, 23.0)) *
                 smoothstep(0.55, 0.05, uv.y);
  float mud = grime(uv, 4.0, 29.0) * smoothstep(0.42, 0.0, uv.y);
  float dust = grime(uv, 7.0, 31.0);

  col = mix(col, col * vec3(0.80, 0.78, 0.71), stainBody * 0.5);
  col = mix(col, col * vec3(0.66, 0.64, 0.56), stainRim * 0.6);
  col = mix(col, S(0.20, 0.22, 0.18), mildew * 0.55);
  col = mix(col, S(0.30, 0.25, 0.19), mud * 0.5);
  col = mix(col, S(0.52, 0.50, 0.46), st * 0.5);
  col = mix(col, S(0.50, 0.48, 0.44), patchStitch * 0.45);
  col *= 1.0 - dust * 0.10;
  s.albedo = col;

  float sag = slack(uv, 37.0);
  float h = 0.42;
  h += w * 0.42;
  h += (fz - 0.5) * 0.10;
  h += (sag - 0.5) * 0.22;
  h += hemBand * 0.10 + st * 0.12 + patchM * 0.09 + patchStitch * 0.08;
  s.height = h;

  // Dry cloth is very rough; where it is wet-stained or worn shiny it drops.
  s.rough = 0.90 - tone * 0.05 + (1.0 - w) * 0.04;
  s.rough = mix(s.rough, 0.74, stainBody * 0.5);
  s.rough += mildew * 0.04;
  s.rough -= onTop * 0.03;
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - w) * 0.18 - mildew * 0.08;
  s.wear = w * 0.7 + 0.2;
}
`;

const FABRIC_CARPET = SOFT_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Cut pile: one tuft per cell, packed tight, each standing at its own height.
  float f1, f2, id;
  vec2 rel, cell;
  pworley(uv, vec2(104.0), 1.0, 3.0, f1, f2, id, rel, cell);
  float tuft = smoothstep(0.62, 0.05, f1);
  float tuftTop = smoothstep(0.34, 0.02, f1);

  // Nap: which way the pile has been walked. Reverses the apparent shade in
  // broad bands, which is the single most recognisable thing about carpet.
  float nap = pfbm01(pwarp(uv, vec2(2.0), 0.35, 7.0), vec2(3.0), 3, 0.6, 7.0);

  // Berber fleck: a base colour with two accent yarns randomly tufted in. The
  // spread between the three yarns is what makes the pile read as tufted rather
  // than as a flat brown field.
  float pick = fract(id * 7.31);
  vec3 base = mix(S(0.34, 0.31, 0.28), S(0.42, 0.38, 0.34), fract(id * 3.17));
  vec3 dark = S(0.24, 0.22, 0.21);
  vec3 accent = S(0.52, 0.45, 0.35);
  vec3 yarn = base;
  yarn = mix(yarn, dark, step(0.72, pick));
  yarn = mix(yarn, accent, step(0.88, pick));

  // A woven border pattern: two bands of a contrasting colour.
  float bandD = min(abs(fract(uv.y * 2.0) - 0.12), abs(fract(uv.y * 2.0) - 0.18));
  float band = smoothstep(0.016, 0.006, bandD);
  yarn = mix(yarn, S(0.30, 0.25, 0.21), band * 0.75);

  // Traffic: the pile is crushed flat, matted and greasy along the walked line.
  float traffic = smoothstep(0.44, 0.80, pfbm01(pwarp(uv, vec2(1.0, 2.0), 0.3, 11.0), vec2(2.0, 3.0), 3, 0.6, 11.0));
  float matted = traffic * smoothstep(0.3, 0.9, pfbm01(uv, vec2(9.0), 3, 0.5, 13.0));

  float stainBody, stainRim;
  tideStain(uv, 4.0, 0.5, 17.0, stainBody, stainRim);
  float soil = grime(uv, 3.0, 19.0);
  // Cigarette burns: small craters with a melted, glossy lip.
  float burn = pdots(uv, vec2(6.0), 0.10, 0.16, 23.0);
  float burnCore = smoothstep(0.35, 0.85, burn);
  // Worn through to the jute backing in the very worst spots.
  float bald = smoothstep(0.86, 0.96, traffic * 0.6 + pfbm01(uv, vec2(6.0), 3, 0.5, 29.0) * 0.4);
  float jute;
  {
    float onTop;
    vec2 along;
    jute = weave(uv, 150.0, onTop, along);
  }

  vec3 col = yarn;
  col *= 0.86 + 0.28 * (1.0 - f1 / 0.7);          // tuft tips catch more light
  col *= mix(0.92, 1.08, nap);
  col = mix(col, col * 0.80, matted * 0.6);
  col = mix(col, col * vec3(0.74, 0.70, 0.66), stainBody * 0.6);
  col = mix(col, col * vec3(0.6, 0.55, 0.5), stainRim * 0.6);
  col = mix(col, S(0.22, 0.19, 0.17), burnCore * 0.8);
  col = mix(col, mix(S(0.42, 0.36, 0.26), S(0.50, 0.44, 0.33), jute), bald * 0.85);
  col *= 1.0 - soil * 0.20;
  s.albedo = col;

  float h = 0.30;
  h += tuft * 0.42 + tuftTop * 0.16;
  h += (nap - 0.5) * 0.06;
  h -= matted * 0.16;
  h -= burnCore * 0.30;
  h = mix(h, 0.22 + jute * 0.12, bald * 0.85);
  s.height = h;

  // Fibre is diffuse and rough; grease and melted nylon are the only shine.
  s.rough = 0.94 - tuftTop * 0.05;
  s.rough = mix(s.rough, 0.66, matted * 0.7);
  s.rough = mix(s.rough, 0.42, burnCore * 0.8);
  s.rough = mix(s.rough, 0.86, bald * 0.7);
  s.rough += soil * 0.03;
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - tuft) * 0.30 - burnCore * 0.25;
  s.wear = tuftTop * 0.8 + 0.1;
}
`;

const SANDBAG = SOFT_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // A revetment of bags rather than one bag per tile: two across by three
  // courses, each course offset half a bag. One bag per tile is the right
  // physical size but it makes the repeat a grid of four identical cushions,
  // which is the whole reason procedural sandbags read as ravioli. The stagger
  // breaks the grid and the per-cell hash gives every bag its own fill, sag and
  // sun exposure.
  vec2 p, cell;
  float border;
  pgrid(uv, vec2(2.0, 3.0), 0.5, p, cell, border);
  vec3 bag = cellHash3(cell, 3.0);
  float bagId = cellHash(cell, 29.0);
  float bseed = 3.0 + bagId * 83.0;

  // The cell is 1.5:1, so a box that is nearly square in local units comes out
  // as the flattened oblong a filled bag actually is. Bags are not all packed
  // equally full, so both the extent and the corner rounding vary.
  // Bags in a wall are compressed hard against their neighbours: the extents run
  // right out to the cell so all that is left between them is a crease and a
  // small dark lozenge at each corner. Leave a real gap and the whole thing
  // reads as a chocolate bar.
  vec2 c = p - 0.5;
  float fill = mix(0.955, 1.0, bag.x);
  float bagD = sdRoundBox(c, vec2(0.500, 0.492) * fill, 0.15);
  float inBag = smoothstep(0.016, -0.008, bagD);
  // Pillow profile: a flat, settled top rolling off quickly at the shoulders.
  float bulge = sqrt(clamp(-bagD / 0.22, 0.0, 1.0));
  // The fill is lumpy, not a smooth cushion, and it settles differently in each.
  float settle = pfbm01(p, vec2(4.0, 3.0), 3, 0.55, bseed);
  float lump = pbillow(p, vec2(7.0, 5.0), 3, 0.5, bseed + 7.0);

  // Burlap: coarse, uneven jute with visible gaps between the yarns, about 9 mm
  // of yarn pitch on the 1.1 m tile. Evaluated in tile space rather than per bag
  // so the count stays even, which the interlace needs in order to wrap.
  const float threads = 124.0;
  float onTop;
  vec2 along;
  float w = weave(uv, threads, onTop, along);
  float tone = threadTone(uv, threads, onTop, 11.0);
  float fz = fuzz(uv, threads, 13.0);
  // Jute yarn is hairy: long fibres standing away from the weave.
  float hair = pfbm01(uv, vec2(threads * 2.0, threads * 0.4), 3, 0.5, 17.0);
  // Sand pressing out through the open weave.
  float pressOut = smoothstep(0.45, 0.9, bulge) * smoothstep(0.55, 0.95, 1.0 - w);

  float seamTop = smoothstep(0.030, 0.010, abs(bagD + 0.02));
  float st = max(
    stitchLine(p, 0.5 + 0.38, 14.0, 0.012, 5.0),
    stitchLine(p, 0.5 - 0.38, 14.0, 0.012, 5.0)
  ) * inBag;
  // The gathered, tied end of the bag, at whichever end it was laid facing.
  float tieAt = mix(0.08, 0.92, step(0.5, bag.y));
  float gather = smoothstep(0.11, 0.02, abs(p.x - tieAt)) * inBag;
  float gatherFold = gather * (0.5 + 0.5 * cos(p.y * 6.0 * TAU));

  // Hessian colour: pale straw, going grey where the sun has hit it and dark
  // where mud has splashed up the bottom.
  vec3 straw = mix(S(0.62, 0.54, 0.38), S(0.70, 0.62, 0.45), settle);
  vec3 greyed = S(0.52, 0.49, 0.43);
  // Bags came from different lots and have sat out for different lengths of time.
  straw *= mix(0.82, 1.10, bag.z);
  float sun = smoothstep(0.30, 0.90, uv.y) * smoothstep(0.3, 0.8, bulge) *
              mix(0.5, 1.0, fract(bagId * 11.7));
  vec3 col = mix(straw, greyed, sun * 0.55);
  col *= 0.88 + 0.24 * tone;
  col = mix(col, col * 1.06, onTop * 0.3);

  float splash = smoothstep(0.42, 0.0, uv.y) * (0.5 + 0.5 * pfbm01(uv, vec2(9.0, 5.0), 3, 0.5, 19.0));
  float mud = grime(uv, 5.0, 23.0) * (0.35 + splash);
  float damp = smoothstep(0.55, 0.9, pfbm01(uv, vec2(3.0, 4.0), 4, 0.6, 29.0)) * smoothstep(0.5, 0.05, uv.y);
  float dust = grime(uv, 8.0, 31.0);
  float wear = smoothstep(0.5, 0.9, bulge);   // the exposed face abrades first

  col = mix(col, S(0.72, 0.66, 0.52), pressOut * 0.35);   // pale dry sand
  col = mix(col, S(0.28, 0.23, 0.17), mud * 0.7);
  col = mix(col, col * vec3(0.62, 0.60, 0.56), damp * 0.6);
  col = mix(col, S(0.50, 0.47, 0.40), st * 0.4 + gatherFold * 0.2);
  col *= 1.0 - dust * 0.12;
  // Between the bags: the shadowed flank of the bag behind, plus spilled fill.
  vec3 gapCol = mix(S(0.40, 0.35, 0.28), S(0.48, 0.43, 0.34), pfbm01(uv, vec2(40.0), 3, 0.5, 37.0));
  gapCol *= 0.86 + 0.24 * tone;
  col = mix(gapCol, col, inBag);
  s.albedo = col;

  float h = 0.10;
  h += inBag * (0.40 * bulge + 0.10 * settle + 0.10 * lump);
  h += inBag * (w * 0.16 + (fz - 0.5) * 0.05 + hair * 0.03);
  h += pressOut * 0.03;
  h -= seamTop * 0.06;
  h += st * 0.05 + gatherFold * 0.05;
  s.height = clamp(h, 0.0, 1.0);

  s.rough = 0.92 - tone * 0.04;
  s.rough = mix(s.rough, 0.82, damp * 0.6);
  s.rough += mud * 0.04;
  s.rough -= wear * 0.04;
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - w) * 0.22 - (1.0 - inBag) * 0.35 - seamTop * 0.15;
  s.wear = inBag * (0.3 + wear * 0.7);
}
`;

const FOLIAGE = /* glsl */ `
/**
 * Leaf shape in leaf-local space: 'p.y' runs base to tip 0..1, 'p.x' across.
 * The width profile is a skewed sine so the leaf is widest below the middle and
 * comes to a point, and the edge is serrated.
 */
float leafMask(vec2 p, float serrate, out float acrossN, out float vein) {
  float t = clamp(p.y, 0.0, 1.0);
  float halfW = 0.30 * sin(PI * pow(t, 0.62));
  halfW *= 1.0 - serrate * 0.16 * (0.5 + 0.5 * cos(t * 34.0));
  acrossN = clamp(abs(p.x) / max(halfW, 1e-4), 0.0, 1.0);
  float inside = smoothstep(1.02, 0.94, acrossN) * step(0.005, t) * step(t, 0.995);
  // Midrib plus pinnate side veins branching forward from it.
  float rib = smoothstep(0.16, 0.0, abs(p.x) / max(halfW, 1e-4));
  float side = 0.5 + 0.5 * cos((t * 13.0 - acrossN * 2.4) * TAU);
  vein = clamp(rib * 0.7 + smoothstep(0.72, 0.98, side) * 0.45 * (1.0 - rib), 0.0, 1.0);
  return inside;
}

void surf(vec2 uv, inout Surf s) {
  // Leaves are scattered on a jittered 3x3 lattice and are larger than a cell,
  // so each fragment tests its neighbours and keeps the topmost leaf.
  vec2 freq = vec2(3.0);
  vec2 g = uv * freq;
  vec2 gi = floor(g);
  vec2 gf = g - gi;

  float bestZ = -1.0;
  float mask = 0.0, acrossN = 1.0, vein = 0.0, leafId = 0.0;
  vec2 bestLocal = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 cell = mod(gi + o, freq);
      vec3 h1 = cellHash3(cell, 3.0);
      vec3 h2 = cellHash3(cell, 71.0);
      // Position, orientation, length and z-order, all per leaf.
      vec2 centre = o + mix(vec2(0.15), vec2(0.85), h1.xy);
      float angle = h1.z * TAU;
      float len = mix(0.85, 1.45, h2.x);
      vec2 d = (gf - centre) / len;
      vec2 local = rot2(d, -angle);
      // Shift so the leaf runs from its stalk rather than from its middle.
      local.y += 0.5;
      float an, vn;
      float m = leafMask(local, h2.y, an, vn);
      // Coverage is the union of every leaf so the cut-out edge stays soft,
      // while the shading comes from whichever leaf is on top here.
      mask = max(mask, m);
      if (m > 0.04 && h2.z > bestZ) {
        bestZ = h2.z;
        acrossN = an;
        vein = vn;
        leafId = h1.z;
        bestLocal = local;
      }
    }
  }

  // Colour by leaf, not by pixel: species variation, new growth, and leaves
  // that are already turning. Keep every value in the range a leaf can be so
  // the translucency pass has something plausible to work with.
  float age = fract(leafId * 5.71);
  float sick = step(0.80, fract(leafId * 13.3));
  vec3 green = ramp4(
    S(0.20, 0.34, 0.13),
    S(0.16, 0.28, 0.11),
    S(0.26, 0.38, 0.15),
    S(0.34, 0.44, 0.18),
    age
  );
  vec3 autumn = mix(S(0.46, 0.36, 0.13), S(0.38, 0.24, 0.10), fract(leafId * 29.1));
  vec3 col = mix(green, autumn, sick * mix(0.5, 0.95, fract(leafId * 3.7)));

  // Within a leaf: the margin is thinner and paler, the veins paler still, and
  // there is mottling from chlorophyll unevenness plus a little insect damage.
  float mottle = pfbm01(bestLocal * 2.0 + leafId * 7.0, vec2(6.0), 3, 0.55, 5.0);
  col *= 0.88 + 0.24 * mottle;
  col = mix(col, col * vec3(1.18, 1.14, 0.95), smoothstep(0.6, 1.0, acrossN) * 0.5);
  col = mix(col, mix(col, S(0.52, 0.55, 0.34), 0.55), vein * 0.6);
  float blotch = smoothstep(0.72, 0.92, pfbm01(bestLocal * 3.0 + leafId, vec2(9.0), 3, 0.5, 9.0));
  col = mix(col, S(0.30, 0.24, 0.12), blotch * 0.5 * (0.3 + sick * 0.7));
  float dusty = grime(uv, 5.0, 11.0);
  col *= 1.0 - dusty * 0.10;
  s.albedo = col;

  // Leaves cup along the midrib and lift at the tip; that curvature is what
  // makes a card of foliage catch light from more than one direction.
  float cup = (1.0 - acrossN * acrossN) * 0.5;
  float h = 0.5 + cup * 0.30 - vein * 0.10 + (mottle - 0.5) * 0.06;
  h += smoothstep(0.2, 1.0, bestLocal.y) * 0.08;
  s.height = mix(0.35, h, mask);

  // Cuticle: young leaves are waxy and glossy, old and dusty ones are not.
  float wax = mix(0.30, 0.62, age) * (1.0 - sick * 0.5);
  s.rough = mix(0.75, 0.42, wax) + dusty * 0.12 + blotch * 0.08;
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - mask) * 0.2;
  s.wear = 0.0;
  s.alpha = mask;
}
`;

export const SOFT_SHADERS: Record<string, string> = {
  fabric_canvas: FABRIC_CANVAS,
  fabric_carpet: FABRIC_CARPET,
  sandbag: SANDBAG,
  foliage: FOLIAGE,
};
