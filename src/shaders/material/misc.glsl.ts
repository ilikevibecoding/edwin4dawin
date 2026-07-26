/**
 * Glass, polymers, glazed ceramic and water. These are the materials where
 * roughness does all the work: the albedo is nearly constant, so if the
 * roughness map is flat the surface dies. Every one of them gets its variation
 * from a *process* — mould texture, blast finish, glaze crazing, handling,
 * settled dust — rather than from tinted noise.
 */

const MISC_BASE = /* glsl */ `
/**
 * Airborne dust and rain spotting on a smooth surface. Returns overall
 * coverage and writes the discrete droplet rings, which read very differently
 * from the soft dust film.
 */
float dustFilm(vec2 uv, float seed, out float spots) {
  float film = pfbm01(pwarp(uv, vec2(3.0), 0.3, seed), vec2(6.0), 4, 0.55, seed);
  float fine = pfbm01(uv, vec2(48.0), 3, 0.5, seed + 7.7);
  spots = pdots(uv, vec2(30.0), 0.35, 0.22, seed + 13.1);
  return clamp(film * 0.65 + fine * 0.35, 0.0, 1.0);
}

/** Hand smears: broad curved wipes that leave a greasy, rougher film. */
float smears(vec2 uv, float seed) {
  vec2 w = pwarp2(uv, vec2(2.0), 0.35, seed);
  float arcs = pfbm01(w, vec2(3.0, 9.0), 3, 0.6, seed);
  float fine = pfbm01(w, vec2(60.0, 20.0), 2, 0.5, seed + 3.3);
  return smoothstep(0.5, 0.86, arcs * 0.75 + fine * 0.25);
}

/**
 * Injection-mould surface texture: the tool was bead-blasted, so the part
 * carries a fine even stipple, plus the flow lines of the melt front.
 */
float mouldFinish(vec2 uv, float grade, float seed, out float flow) {
  float blast = pgrain(uv, 620.0 * grade, seed);
  float cell = 1.0 - pworleyF1(uv, vec2(150.0 * grade), 1.0, seed + 5.0);
  flow = pfbm01(uv, vec2(4.0, 14.0), 3, 0.55, seed + 11.0);
  return clamp(blast * 0.45 + cell * 0.55, 0.0, 1.0);
}
`;

const GLASS = MISC_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Float glass is not perfectly flat: it carries very long, very shallow
  // rolling waves from the tin bath, which is why reflections in real windows
  // ripple slightly.
  float roll = pgrad(uv, vec2(2.0, 3.0), 3.0) * 0.6 + pgrad(uv, vec2(5.0, 4.0), 7.0) * 0.4;
  float ripple = pfbm(uv, vec2(9.0), 3, 0.5, 11.0);

  float spots;
  float dust = dustFilm(uv, 17.0, spots);
  float smear = smears(uv, 23.0);
  // Runs where rain has washed the dust into streaks.
  float run = dripStains(uv, 2.0, 0.4, 29.0);
  // Old glass picks up a mineral haze that never wipes off.
  float haze = smoothstep(0.55, 0.9, pfbm01(uv, vec2(4.0), 4, 0.6, 31.0));

  // Glass has almost no diffuse reflectance; what little there is comes from
  // the dirt sitting on it, plus the green cast of iron in the melt.
  vec3 glassCol = S(0.17, 0.20, 0.185);
  vec3 dirtCol = S(0.34, 0.33, 0.30);
  vec3 col = mix(glassCol, dirtCol, dust * 0.35 + spots * 0.15 + haze * 0.25);
  col = mix(col, dirtCol * 0.8, run * 0.3);
  s.albedo = col;

  s.height = 0.5 + roll * 0.5 + ripple * 0.12 + spots * 0.10 + dust * 0.04;

  // The whole read: mirror-smooth where it is clean, milky where it is not.
  s.rough = 0.02 + dust * 0.16 + smear * 0.20 + haze * 0.14 + spots * 0.10 + run * 0.06;
  s.metal = 0.0;
  s.ao = 1.0;
  s.wear = 0.0;
  // Coverage: clean glass is nearly invisible, dirt makes it read as a surface.
  s.alpha = clamp(0.16 + dust * 0.30 + haze * 0.22 + spots * 0.18 + smear * 0.10, 0.0, 0.9);
}
`;

const GLASS_BROKEN = MISC_BASE + /* glsl */ `
/**
 * Radial crack field from an impact. Cracks leave the impact point at
 * irregular angles and wander as they run; concentric cracks join them where
 * the stress wave rebounded. Fades out before the tile border so the pattern
 * still meets itself, where a periodic craze network takes over.
 */
float impactCracks(vec2 uv, vec2 at, float seed, out float radial, out float ring, out float hackle) {
  vec2 d = uv - at;
  float r = length(d);
  float a = atan(d.y, d.x) / TAU + 0.5;

  // 13 radial cracks, each at a jittered angle, wandering as r grows.
  const float arms = 13.0;
  float wander = pgrad(vec2(r * 3.0, a * 2.0), vec2(4.0), seed) * 0.06;
  float ai = (a + wander) * arms;
  float armD = abs(fract(ai) - 0.5) / arms;      // angular distance, in turns
  // A crack is a fixed width in space, so its angular width shrinks with r.
  float width = 0.0016 + r * 0.004;
  radial = smoothstep(width, width * 0.25, armD * max(r, 0.02) * TAU);
  // Some arms stop short of others.
  float armLen = mix(0.16, 0.46, cellHash(vec2(floor(ai), 0.0), seed + 3.0));
  radial *= smoothstep(armLen, armLen * 0.6, r);

  // Concentric cracks, only between radial arms and only close in.
  float rings = 3.0;
  float rr = r * rings / 0.34 + pgrad(vec2(a * 6.0, r), vec2(6.0), seed + 7.0) * 0.25;
  ring = smoothstep(0.06, 0.012, abs(fract(rr) - 0.5)) * smoothstep(0.40, 0.05, r);
  ring *= 0.35 + 0.65 * smoothstep(0.0, 0.5, radial);

  // Pulverised glass right at the strike, opaque and white.
  hackle = smoothstep(0.055, 0.0, r) + smoothstep(0.02, 0.0, r) * 0.5;
  return clamp(max(radial, ring * 0.8), 0.0, 1.0);
}

void surf(vec2 uv, inout Surf s) {
  vec2 impact = vec2(0.38, 0.58);
  float radial, ring, hackle;
  float crack = impactCracks(uv, impact, 3.0, radial, ring, hackle);
  // Fade the radial system out before the tile edge so the tile still matches.
  float inner = 1.0 - smoothstep(0.30, 0.47, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
  crack *= inner;
  radial *= inner;
  ring *= inner;
  hackle *= inner;

  // Away from the impact the pane is merely crazed, on a periodic network.
  float craze = pcracks(uv, vec2(9.0), 0.10, 0.10, 3, 11.0);
  crack = max(crack, craze * (0.35 + 0.65 * (1.0 - inner)));

  // Each shard is a rigid plate that has rotated slightly in its frame, which
  // is what makes broken glass sparkle: adjacent shards reflect different
  // things, so the normal must actually be discontinuous.
  float f1, f2, id;
  vec2 rel;
  pworleyAngular(uv, vec2(9.0), 0.95, 13.0, f1, f2, id, rel);
  vec2 tilt = (cellHash2(vec2(floor(id * 61.0), 3.0), 17.0) - 0.5) * 2.0;
  float shardTilt = dot(rel, tilt) * 0.35;
  float loose = step(0.86, fract(id * 7.31));      // shards that fell out

  float spots;
  float dust = dustFilm(uv, 19.0, spots);
  // Freshly fractured surfaces are clean; the old face is not.
  float dirt = dust * (1.0 - crack * 0.7);

  vec3 glassCol = S(0.18, 0.21, 0.20);
  vec3 col = mix(glassCol, S(0.32, 0.32, 0.30), dirt * 0.35);
  // Crushed glass scatters: crack faces and the hackle zone go pale.
  col = mix(col, S(0.72, 0.76, 0.78), crack * 0.55 + hackle * 0.7);
  s.albedo = col;

  s.height = 0.5 + shardTilt * 0.5 - crack * 0.35 - hackle * 0.1 + (dust - 0.5) * 0.02;
  s.rough = 0.03 + dust * 0.14 + crack * 0.30 + hackle * 0.45;
  s.metal = 0.0;
  s.ao = 1.0 - crack * 0.3;
  s.wear = crack * 0.6;
  // Crack lines read as bright lines; holes read as nothing at all.
  float cover = 0.16 + crack * 0.55 + hackle * 0.7 + dirt * 0.2;
  s.alpha = clamp(cover, 0.0, 0.95) * (1.0 - loose * smoothstep(0.35, 0.1, f1));
}
`;

const RUBBER = MISC_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Moulded from a bead-blasted tool: fine, even, slightly cellular.
  float flow;
  float finish = mouldFinish(uv, 1.0, 3.0, flow);

  // Anti-slip moulding: shallow rounded lugs on a staggered grid.
  vec2 local, cell;
  float border;
  pgrid(uv, vec2(10.0, 10.0), 0.5, local, cell, border);
  float lugD = sdRoundBox(local - 0.5, vec2(0.30, 0.17), 0.09);
  float lug = smoothstep(0.02, -0.03, lugD);
  float lugTop = smoothstep(-0.02, -0.06, lugD);

  // Ozone cracking: fine crazing that only shows up where the rubber has been
  // flexed, so it clusters rather than covering evenly.
  float flexed = smoothstep(0.45, 0.8, pfbm01(pwarp(uv, vec2(2.0), 0.3, 7.0), vec2(4.0), 3, 0.55, 7.0));
  float craze = pcracks(uv, vec2(60.0), 0.12, 0.06, 3, 11.0) * flexed;

  // Bloom: the pale waxy anti-ozonant film that migrates out of old rubber.
  float bloom = smoothstep(0.5, 0.88, pfbm01(uv, vec2(7.0), 4, 0.55, 13.0));
  // Scuffs polish the high points; grit embeds itself in the softer areas.
  float scuff = scratches(uv, 220.0, 0.06, 17.0);
  float polish = smoothstep(0.3, 0.9, lugTop) * smoothstep(0.4, 0.85, pfbm01(uv, vec2(5.0), 3, 0.5, 19.0));
  float grit = pdots(uv, vec2(90.0), 0.25, 0.2, 23.0) * (1.0 - lugTop);
  float dust = grime(uv, 6.0, 29.0);

  // Carbon-black rubber sits near 0.04 linear reflectance: very dark, but
  // authored in sRGB that is about 0.22, not 0.05.
  vec3 col = mix(S(0.205, 0.205, 0.212), S(0.255, 0.255, 0.265), finish);
  col *= 0.94 + 0.10 * flow;
  col = mix(col, S(0.42, 0.42, 0.43), bloom * 0.30);
  col = mix(col, S(0.30, 0.30, 0.31), craze * 0.5);
  col = mix(col, S(0.34, 0.34, 0.35), scuff * 0.5);
  col = mix(col, S(0.50, 0.48, 0.44), grit * 0.45);
  col = mix(col, col * 1.10, polish * 0.4);
  col *= 1.0 - dust * 0.10;
  s.albedo = col;

  float h = 0.42;
  h += lug * 0.34 + lugTop * 0.06;
  h += (finish - 0.5) * 0.10;
  h += (flow - 0.5) * 0.04;
  h -= craze * 0.20;
  h += grit * 0.10;
  h -= scuff * 0.05;
  s.height = h;

  // Matte moulded rubber, going satin where it has been rubbed and chalky
  // where the bloom has come out.
  s.rough = 0.72 + (1.0 - finish) * 0.10 + craze * 0.08;
  s.rough = mix(s.rough, 0.86, bloom * 0.6);
  s.rough = mix(s.rough, 0.44, polish * 0.75);
  s.rough = mix(s.rough, 0.50, scuff * 0.4);
  s.rough += dust * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - craze * 0.15;
  s.wear = lugTop * 0.8 + 0.15;
}
`;

const PLASTIC = MISC_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Textured tool finish plus the melt-front flow lines and a parting line.
  float flow;
  float finish = mouldFinish(uv, 0.85, 3.0, flow);
  float partD = abs(uv.y - 0.5);
  float parting = smoothstep(0.006, 0.001, partD);
  // Ejector pins leave faint circles on the back of every moulding.
  float pinD = length(vec2(fract(uv.x * 3.0) - 0.5, fract(uv.y * 3.0) - 0.5));
  float pin = smoothstep(0.20, 0.17, pinD);
  float pinRing = smoothstep(0.215, 0.19, pinD) * (1.0 - pin);
  // Sink marks: broad shallow dimples over the thick sections.
  float sink = smoothstep(0.4, 0.85, pfbm01(uv, vec2(3.0), 3, 0.55, 7.0));

  // Grey-blue engineering plastic, yellowed and chalked by UV in patches.
  float uvFade = smoothstep(0.4, 0.85, pfbm01(pwarp(uv, vec2(2.0), 0.3, 11.0), vec2(3.0), 3, 0.55, 11.0));
  vec3 fresh = mix(S(0.30, 0.32, 0.35), S(0.36, 0.38, 0.41), finish);
  vec3 aged = mix(S(0.40, 0.39, 0.34), S(0.46, 0.44, 0.38), finish);
  vec3 col = mix(fresh, aged, uvFade * 0.7);
  col *= 0.97 + 0.06 * flow;

  float scuff = scratches(uv, 260.0, 0.05, 13.0);
  float rub = smoothstep(0.45, 0.85, pfbm01(uv, vec2(6.0), 3, 0.5, 17.0));
  // White stress marks where the part has been flexed or gouged.
  float stress = smoothstep(0.80, 0.96, pfbm01(uv, vec2(20.0, 8.0), 3, 0.5, 19.0)) * uvFade;
  float dust = grime(uv, 6.0, 23.0);
  float ink = smoothstep(0.62, 0.72, pfbm01(uv, vec2(11.0), 4, 0.5, 29.0));   // moulded-in logo mottle

  col = mix(col, S(0.62, 0.62, 0.60), scuff * 0.45 + stress * 0.4);
  col = mix(col, col * 0.94, ink * 0.2);
  col *= 1.0 - dust * 0.10;
  s.albedo = col;

  float h = 0.5;
  h += (finish - 0.5) * 0.16;
  h += (flow - 0.5) * 0.05;
  h += parting * 0.20;
  h -= pin * 0.03;
  h += pinRing * 0.02;
  h -= sink * 0.05;
  h -= scuff * 0.06;
  s.height = h;

  // Satin moulded finish: gloss rises where it has been handled smooth and
  // falls where the UV has chalked it.
  s.rough = 0.42 + (1.0 - finish) * 0.14;
  s.rough = mix(s.rough, 0.62, uvFade * 0.7);
  s.rough = mix(s.rough, 0.26, rub * 0.5);
  s.rough = mix(s.rough, 0.30, scuff * 0.5);
  s.rough += dust * 0.06;
  s.metal = 0.0;
  s.ao = 1.0 - pinRing * 0.1;
  s.wear = 0.4 + parting * 0.5 + rub * 0.3;
}
`;

const CERAMIC_TILE = MISC_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  const vec2 counts = vec2(5.0, 5.0);
  vec2 local, cell;
  float border;
  pgrid(uv, counts, 0.0, local, cell, border);
  vec3 idv = cellHash3(cell, 3.0);
  float id = cellHash(cell, 11.0);

  // Grout: a recessed, slightly domed joint. Tiles are laid by hand, so each
  // sits a fraction out of line, which widens and narrows the joint.
  float jitter = (idv.x - 0.5) * 0.012;
  float grout = smoothstep(0.055 + jitter, 0.030 + jitter, border);
  float groutCore = smoothstep(0.040 + jitter, 0.012 + jitter, border);
  // The glazed edge of each tile rolls over into the joint.
  float roll = smoothstep(0.10, 0.045, border) * (1.0 - groutCore);

  // Glaze: per-tile colour and gloss, both varying more than you would think.
  vec3 glazeA = S(0.76, 0.75, 0.71);
  vec3 glazeB = S(0.61, 0.62, 0.61);
  vec3 glaze = mix(glazeA, glazeB, idv.y);
  // A few tiles from a different batch, and a scattering of accent tiles.
  glaze = mix(glaze, glaze * vec3(0.94, 0.97, 1.0), step(0.7, idv.z));
  glaze = mix(glaze, S(0.34, 0.40, 0.42), step(0.93, fract(id * 5.71)));
  // Within a tile: the glaze pooled unevenly in the kiln.
  float pool = pfbm01(local + idv.xy * 3.0, vec2(4.0), 3, 0.55, 5.0);
  float speck = pgrain(uv, 520.0, 7.0);
  glaze *= 0.96 + 0.08 * pool;
  glaze *= 0.98 + 0.04 * speck;

  // Crazing: the fine crack network in old glaze, denser on some tiles.
  float crazeAmt = mix(0.2, 1.0, fract(id * 13.7));
  float craze = pcracks(local, vec2(14.0), 0.09, 0.05, 3, 17.0 + id * 31.0) * crazeAmt;

  // One tile in ten is cracked right through; the crack is a straight line
  // across the tile with a little wander, not a noise field.
  float cracked = step(0.90, fract(id * 29.3));
  float ang = fract(id * 47.1) * PI;
  vec2 cl = rot2(local - 0.5, ang);
  float lineD = abs(cl.y + pgrad(local, vec2(3.0), 23.0) * 0.05);
  float crack = cracked * smoothstep(0.010, 0.002, lineD);
  // Chipped corners: glaze knocked off, exposing the biscuit underneath.
  float chip = pdots(local, vec2(2.0), 0.5, 0.24, 31.0 + id * 17.0) *
               smoothstep(0.22, 0.05, border) * step(0.72, fract(id * 7.13));
  float chipCore = smoothstep(0.35, 0.8, chip);

  // Grout is porous, so it stains: mould in the wet corners, dirt everywhere.
  float groutTone = pvfbm(uv, vec2(30.0), 3, 0.55, 37.0);
  float mould = smoothstep(0.50, 0.68, pfbm01(pwarp(uv, vec2(3.0), 0.3, 41.0), vec2(6.0), 4, 0.55, 41.0));
  vec3 groutCol = mix(S(0.50, 0.49, 0.455), S(0.34, 0.33, 0.305), groutTone);
  groutCol = mix(groutCol, S(0.21, 0.23, 0.19), mould * 0.75);

  vec3 biscuit = S(0.60, 0.53, 0.46);
  float scuff = scratches(uv, 300.0, 0.045, 43.0);
  float film = grime(uv, 5.0, 47.0);

  vec3 col = glaze;
  col = mix(col, col * 0.90, craze * 0.35);
  col = mix(col, S(0.30, 0.29, 0.28), crack * 0.7);
  col = mix(col, biscuit, chipCore * 0.85);
  col = mix(col, groutCol, grout);
  col = mix(col, S(0.86, 0.86, 0.84), scuff * 0.25 * (1.0 - grout));
  col *= 1.0 - film * 0.12;
  s.albedo = col;

  float h = 0.72;
  h -= grout * 0.42 + groutCore * 0.10;
  h -= roll * 0.05;
  h += (idv.z - 0.5) * 0.05;                       // tiles not quite coplanar
  h += (pool - 0.5) * 0.02;
  h += grout * (groutTone - 0.5) * 0.06;
  h -= craze * 0.03;
  h -= crack * 0.20;
  h -= chipCore * 0.16;
  s.height = h;

  // Glaze is glossy and varies tile to tile; grout is chalk-matte. That
  // contrast is what makes tile read as tile even in flat light.
  float gloss = mix(0.06, 0.22, fract(id * 3.31));
  s.rough = gloss + craze * 0.10 + (1.0 - pool) * 0.04;
  s.rough = mix(s.rough, 0.55, chipCore * 0.9);
  s.rough = mix(s.rough, 0.34, crack * 0.7);
  s.rough = mix(s.rough, 0.90 + mould * 0.05, grout);
  s.rough += film * 0.10;
  s.metal = 0.0;
  s.ao = 1.0 - grout * 0.30 - crack * 0.2 - chipCore * 0.15;
  s.wear = (1.0 - grout) * 0.5;
}
`;

const GUN_POLYMER = MISC_BASE + /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Glass-filled nylon, moulded from a matte tool: a fine even peel with the
  // fill fibres faintly visible under the surface.
  float flow;
  float finish = mouldFinish(uv, 1.35, 3.0, flow);
  float fibre = pfbm01(uv, vec2(220.0, 40.0), 3, 0.5, 7.0);

  // Moulded stipple: a lattice of small pyramids for grip, laid out on a
  // staggered grid, present only inside the grip panel.
  vec2 local, cell;
  float border;
  pgrid(uv, vec2(26.0, 26.0), 0.5, local, cell, border);
  vec2 q = abs(local - 0.5);
  float pyramid = 1.0 - clamp((q.x + q.y) / 0.34, 0.0, 1.0);
  // Panel boundary with a raised border, so the stipple has a defined edge.
  float panelD = sdRoundBox(uv - vec2(0.5, 0.5), vec2(0.34, 0.40), 0.06);
  float panel = smoothstep(0.006, -0.010, panelD);
  float panelEdge = smoothstep(0.024, 0.006, abs(panelD + 0.010));
  float stipple = pyramid * panel;

  // Parting line and the faint witness of the mould halves.
  float parting = smoothstep(0.004, 0.0008, abs(uv.x - 0.02));

  // Handling wear: the stipple tips burnish smooth and slightly paler; oil
  // from hands darkens the valleys.
  float handled = smoothstep(0.40, 0.80, pfbm01(pwarp(uv, vec2(2.0), 0.3, 11.0), vec2(3.0), 3, 0.55, 11.0));
  float burnish = smoothstep(0.55, 1.0, stipple) * handled;
  float oil = handled * (1.0 - smoothstep(0.3, 0.8, stipple));
  float scuff = scratches(uv, 340.0, 0.04, 13.0);
  float dust = grime(uv, 8.0, 17.0);

  vec3 body = mix(S(0.225, 0.225, 0.232), S(0.275, 0.275, 0.285), finish);
  body *= 0.96 + 0.07 * flow;
  body = mix(body, body * 1.08, fibre * 0.25);
  vec3 col = body;
  col = mix(col, body * 1.30, burnish * 0.6);
  col = mix(col, body * 0.86, oil * 0.5);
  col = mix(col, S(0.40, 0.40, 0.41), scuff * 0.35);
  col *= 1.0 - dust * 0.08;
  s.albedo = col;

  float h = 0.42;
  h += stipple * 0.30 + panelEdge * 0.10;
  h += (finish - 0.5) * 0.14;
  h += (fibre - 0.5) * 0.05;
  h += parting * 0.12;
  h -= burnish * 0.05;
  h -= scuff * 0.05;
  s.height = h;

  // Matte moulding, satin only where hands have polished it.
  s.rough = 0.66 + (1.0 - finish) * 0.14 - fibre * 0.03;
  s.rough = mix(s.rough, 0.34, burnish * 0.8);
  s.rough = mix(s.rough, 0.52, oil * 0.5);
  s.rough = mix(s.rough, 0.40, scuff * 0.4);
  s.rough += dust * 0.05;
  s.metal = 0.0;
  s.ao = 1.0 - (1.0 - stipple) * panel * 0.10;
  s.wear = stipple * 0.7 + panelEdge * 0.3 + 0.1;
}
`;

const WATER = /* glsl */ `
void surf(vec2 uv, inout Surf s) {
  // Two crossed swell trains plus capillary chop. The material patch scrolls
  // this map at two rates and blends, so the frozen field only has to be a
  // plausible instant of water, not a whole animation.
  float swellA = pgrad(uv, vec2(3.0, 2.0), 3.0);
  float swellB = pgrad(rot2(uv - 0.5, 1.1) + 0.5, vec2(4.0, 3.0), 7.0);
  float chop = pfbm(uv, vec2(11.0), 4, 0.55, 11.0);
  float capillary = pfbm(uv, vec2(46.0), 3, 0.5, 13.0);
  // Wind streaks: the fine chop is not isotropic, it lines up with the wind.
  float streak = pfbm(shear(uv, 4.0), vec2(70.0, 9.0), 3, 0.5, 17.0);

  // Weighted towards the short waves. Swell barely tilts the surface over a 6 m
  // tile, so it contributes almost nothing to the reflection; it is the
  // centimetre-scale chop that actually breaks up a mirror and reads as water.
  float h = 0.5 + swellA * 0.16 + swellB * 0.12 + chop * 0.20 + capillary * 0.13 + streak * 0.09;
  s.height = h;

  // Standing water in a city: silt, a slick of oil, and scum gathering in the
  // troughs. The colour is nearly all in the reflection, so keep the diffuse
  // dark and let the roughness map carry the variation.
  float silt = pfbm01(pwarp(uv, vec2(2.0), 0.3, 19.0), vec2(4.0), 4, 0.55, 19.0);
  float slick = smoothstep(0.55, 0.85, pfbm01(pwarp(uv, vec2(3.0), 0.4, 23.0), vec2(5.0), 3, 0.55, 23.0));
  float scum = smoothstep(0.5, 0.9, (1.0 - h) * 0.6 + pfbm01(uv, vec2(9.0), 3, 0.5, 29.0) * 0.4);

  vec3 col = mix(S(0.16, 0.20, 0.21), S(0.26, 0.27, 0.24), silt);
  // A thin-film sheen on the oil slick: violet through green with thickness.
  vec3 sheen = ramp4(
    S(0.34, 0.26, 0.42),
    S(0.26, 0.38, 0.46),
    S(0.34, 0.44, 0.28),
    S(0.44, 0.34, 0.22),
    fract(silt * 3.0 + capillary * 1.5)
  );
  col = mix(col, sheen, slick * 0.55);
  col = mix(col, S(0.30, 0.32, 0.26), scum * 0.35);
  s.albedo = col;

  // Water is a mirror; only films and scum spoil it.
  s.rough = 0.035 + slick * 0.10 + scum * 0.16 + silt * 0.03;
  s.metal = 0.0;
  s.ao = 1.0;
  s.wear = 0.0;
  s.alpha = clamp(0.62 + silt * 0.20 + scum * 0.18, 0.0, 0.95);
}
`;

export const MISC_SHADERS: Record<string, string> = {
  glass: GLASS,
  glass_broken: GLASS_BROKEN,
  rubber: RUBBER,
  plastic: PLASTIC,
  ceramic_tile: CERAMIC_TILE,
  gun_polymer: GUN_POLYMER,
  water: WATER,
};
