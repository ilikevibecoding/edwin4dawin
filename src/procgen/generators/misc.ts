import * as THREE from 'three';
import type { MaterialSpec } from './types';

/**
 * Everything that is not a building, a metal or a ground: glazing, textiles,
 * paint, vehicles, weapon furniture, characters and the FX sprites.
 *
 * The FX entries at the end are sprite atlases rather than tiling surfaces —
 * they clamp instead of repeating and carry their shape in the alpha channel.
 */

const CAMO_GLSL = /* glsl */ `
/**
 * Multi-scale disruptive pattern. Two warped noise fields threshold into three
 * bands, and a third much finer field breaks the band borders up so the shapes
 * read as printed blotches rather than as smooth level sets.
 */
vec3 camoBlend(vec2 uv, float cells, vec3 c0, vec3 c1, vec3 c2, vec3 c3, out float bandId) {
  vec2 w = warp2(uv * cells, vec2(cells), 0.55, 3);
  float a = fbm2(w, vec2(cells), 4) * 0.5 + 0.5;
  float b = fbm2(w * 2.0 + 17.0, vec2(cells * 2.0), 4) * 0.5 + 0.5;
  float edgeBreak = (fbm2(uv * cells * 6.0, vec2(cells * 6.0), 3) * 0.5 + 0.5 - 0.5) * 0.10;

  float m1 = smoothstep(0.46, 0.52, a + edgeBreak);
  float m2 = smoothstep(0.60, 0.66, a + b * 0.35 + edgeBreak);
  float m3 = smoothstep(0.68, 0.74, b + edgeBreak);

  vec3 c = mix(c0, c1, m1);
  c = mix(c, c2, m2);
  c = mix(c, c3, m3);
  bandId = m1 * 0.25 + m2 * 0.35 + m3 * 0.4;
  return c;
}

/** Ripstop reinforcement grid: a coarse thread every few picks. */
float ripstop(vec2 uv, float countAt512, float width) {
  float c = detailCells(countAt512);
  vec2 f = abs(fract(uv * c) - 0.5) * 2.0;
  return max(1.0 - smoothstep(width * 0.5, width, f.x), 1.0 - smoothstep(width * 0.5, width, f.y));
}

/** Stitch line along v at \`u\`, \`pitch\` stitches per tile. */
float stitchLine(vec2 uv, float u, float pitch, float width) {
  float across = 1.0 - smoothstep(width * 0.6, width, abs(uv.x - u));
  float along = step(0.42, fract(uv.y * pitch));
  return across * along;
}
`;

const GLASS_CLEAR = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Float glass. Almost everything here is at the threshold of visibility, and
  // that is the point: perfectly flat glass reads as a hole in the wall, while a
  // very slight roll wave and a few defects make it read as a pane.
  float roll = fbm2(uv * vec2(2.0, 5.0), vec2(2.0, 5.0), 3);
  float draw = fbm2(slant(uv, vec2(3.0, 40.0), 0.0), vec2(3.0, 40.0), 3);
  float micro = grainNoise(uv, 256.0, 2);

  vec3 specks = grainWorley(uv, 90.0, 1.0);
  float speck = (1.0 - smoothstep(0.0, 0.06, specks.x)) * step(0.965, specks.z);
  float smear = smoothstep(0.66, 0.95, turbulence2(uv * 6.0 + 4.0, vec2(6.0), 4));
  float dust = smoothstep(0.78, 0.98, fbm2(uv * 14.0 - 9.0, vec2(14.0), 4) * 0.5 + 0.5);

  float height = 0.5
    + roll * 0.30
    + draw * 0.10
    + (micro - 0.5) * 0.02
    - speck * 0.30;

  vec3 albedo = vec3(0.960, 0.972, 0.968);
  albedo = mix(albedo, vec3(0.900, 0.912, 0.906), smear * 0.35 + dust * 0.25);
  albedo = mix(albedo, vec3(0.820, 0.826, 0.820), speck * 0.6);

  float rough = 0.035;
  rough += smear * 0.10;
  rough += dust * 0.14;
  rough += speck * 0.40;
  rough += (micro - 0.5) * 0.01;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  // The R channel of the packed set is bound as the transmission map for glass
  // rather than as ambient occlusion, so a speck of grit is genuinely opaque.
  s.ao = 1.0 - speck * 0.85 - smear * 0.08 - dust * 0.10;
  s.height = height;
}
`;

const GLASS_DIRTY = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Neglected glazing. The film of grime is what makes it legible: it is
  // heaviest at the edges of the pane and in the corners where the rain never
  // reaches, and the clean centre is where the transmission still reads.
  float roll = fbm2(uv * vec2(2.0, 5.0), vec2(2.0, 5.0), 3);
  float micro = grainNoise(uv, 250.0, 2);
  float grain = grainNoise(uv, 180.0, 3);

  // Pane border: grime and putty residue banked up against the frame.
  vec2 edge = min(uv, 1.0 - uv);
  float border = 1.0 - smoothstep(0.02, 0.20, min(edge.x, edge.y));
  float corner = 1.0 - smoothstep(0.05, 0.34, length(min(edge, 0.34)));

  float filmField = fbm2(warp2(uv * 4.0, vec2(4.0), 0.6, 3), vec2(4.0), 5) * 0.5 + 0.5;
  float film = sat(filmField * 0.75 + border * 0.5 + corner * 0.35);
  float heavy = smoothstep(0.62, 0.92, film);
  float rainWash = smoothstep(0.35, 0.75, fbm2(vec2(uv.x * 16.0, uv.y * 2.0), vec2(16.0, 2.0), 4) * 0.5 + 0.5);
  float run = dripStreaks(uv, 22.0, 0.7, 3.0);
  float spatter = 1.0 - smoothstep(0.02, 0.16, grainWorley(uv + 3.3, 60.0, 1.0).x);

  // Impact star and a couple of radial cracks.
  vec2 hit = vec2(0.63, 0.41);
  float r = length((uv - hit) * vec2(1.0, 1.0));
  float star = (1.0 - smoothstep(0.0, 0.045, r));
  float radial = pow(abs(sin(atan(uv.y - hit.y, uv.x - hit.x) * 6.0)), 26.0) *
    (1.0 - smoothstep(0.03, 0.30, r));
  float ring = band(r, 0.075, 0.010) * 0.7;
  float crack = sat(star + radial * 0.9 + ring);

  float height = 0.5
    + roll * 0.24
    + film * 0.06
    + heavy * 0.05
    + (grain - 0.5) * 0.05 * film
    + (micro - 0.5) * 0.02
    - crack * 0.45;

  vec3 albedo = vec3(0.930, 0.944, 0.940);
  albedo = mix(albedo, vec3(0.560, 0.532, 0.478), film * 0.55);
  albedo = mix(albedo, vec3(0.392, 0.366, 0.320), heavy * 0.55);
  albedo = mix(albedo, vec3(0.680, 0.664, 0.628), rainWash * (1.0 - border) * 0.25);
  albedo = mix(albedo, vec3(0.318, 0.294, 0.256), run * 0.5 + spatter * 0.25);
  albedo = mix(albedo, vec3(0.880, 0.900, 0.910), crack * 0.8);
  albedo *= 0.96 + 0.08 * grain;

  float rough = 0.06;
  rough += film * 0.34;
  rough += heavy * 0.24;
  rough += spatter * 0.30;
  rough += run * 0.14;
  rough += crack * 0.35;
  rough += (grain - 0.5) * 0.06 * film;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  // R is the transmission map: the grime film is what you cannot see through.
  s.ao = sat(1.0 - film * 0.75 - heavy * 0.30 - spatter * 0.35 - run * 0.30 - border * 0.25);
  s.height = height;
}
`;

const VEHICLE_GLASS = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Laminated automotive glazing: a green-grey tint, a dot-matrix frit band
  // along one edge, wiper arcs scoured into the outer ply and sandblasting from
  // grit at the leading edge.
  float roll = fbm2(uv * vec2(3.0, 6.0), vec2(3.0, 6.0), 3);
  float micro = grainNoise(uv, 256.0, 2);

  // Ceramic frit: a graded dot screen fading out of the band.
  float bandT = 1.0 - smoothstep(0.0, 0.14, uv.y);
  float dotCells = detailCells(48.0);
  vec2 dp = fract(uv * dotCells) - 0.5;
  float dotR = mix(0.10, 0.44, bandT);
  float dots = 1.0 - smoothstep(dotR * 0.8, dotR, length(dp));
  float frit = sat(dots * step(0.02, bandT) + (1.0 - smoothstep(0.0, 0.035, uv.y)));

  // Wiper sweep: concentric arcs about a pivot below the pane.
  vec2 pivot = vec2(0.5, -0.55);
  float rad = length((uv - pivot) * vec2(1.0, 1.0));
  float arcs = smoothBand(rad, 0.62, 1.05, 0.05);
  float scour = arcs * (0.4 + 0.6 * grainNoise(uv, 200.0, 3));
  float haze = smoothstep(0.55, 0.92, fbm2(uv * 7.0 + 11.0, vec2(7.0), 4) * 0.5 + 0.5);

  vec3 grit = grainWorley(uv + 2.1, 120.0, 1.0);
  float pit = (1.0 - smoothstep(0.0, 0.05, grit.x)) * smoothstep(0.55, 1.0, uv.y) * step(0.90, grit.z);
  float dust = smoothstep(0.72, 0.98, fbm2(uv * 12.0 - 5.0, vec2(12.0), 4) * 0.5 + 0.5);

  float height = 0.5
    + roll * 0.22
    + frit * 0.10
    + (micro - 0.5) * 0.02
    - pit * 0.35
    - scour * 0.03;

  vec3 albedo = vec3(0.860, 0.906, 0.888);
  albedo = mix(albedo, vec3(0.052, 0.056, 0.058), frit * 0.94);
  albedo = mix(albedo, vec3(0.760, 0.780, 0.766), scour * 0.20 + haze * 0.15);
  albedo = mix(albedo, vec3(0.640, 0.626, 0.590), dust * 0.30);
  albedo = mix(albedo, vec3(0.900, 0.916, 0.910), pit * 0.7);

  float rough = 0.04;
  rough += frit * 0.55;
  rough += scour * 0.16;
  rough += haze * 0.10;
  rough += dust * 0.16;
  rough += pit * 0.45;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  // R is the transmission map: the frit band is a solid ceramic print.
  s.ao = sat(1.0 - frit * 0.98 - dust * 0.28 - scour * 0.12 - pit * 0.5);
  s.height = height;
}
`;

const FABRIC_CANVAS = /* glsl */ `
const vec3 DUCK = vec3(0.560, 0.500, 0.378);
const vec3 DUCK_DARK = vec3(0.412, 0.362, 0.268);
const vec3 SUN = vec3(0.664, 0.612, 0.492);

void surface(vec2 uv, inout Surface s) {
  // Heavy cotton duck: a coarse plain weave with slubby yarn, seams every third
  // panel, sun bleaching on the crowns of the folds and mildew in the creases.
  vec3 cloth = weave(uv, vec2(detailCells(110.0), detailCells(104.0)), 0.5);
  float weaveH = cloth.x * 0.5 + 0.5;
  float warpMask = cloth.y;

  float slub = grainAniso(uv, vec2(30.0, 8.0), 3);
  float slubWeft = grainAniso(uv, vec2(8.0, 30.0), 3);
  float fuzz = grainNoise(uv, 240.0, 2);

  // Folds and sag: the large form that makes canvas read as cloth.
  float fold = fbm2(uv * vec2(3.0, 2.0), vec2(3.0, 2.0), 4) * 0.5 + 0.5;
  float crease = 1.0 - smoothstep(0.0, 0.24, abs(ridged2(uv * vec2(4.0, 3.0), vec2(4.0, 3.0), 3, 0.5, 2.0) - 0.72));

  // Flat-felled seams with a double row of stitching.
  float seamU = 1.0 - smoothstep(0.010, 0.026, abs(fract(uv.x * 3.0) - 0.5));
  float stitch = seamU * step(0.45, fract(uv.y * detailCells(90.0)));

  float sun = smoothstep(0.2, 0.9, fold) * patchiness(uv + 4.4, 3.0, 3);
  float grime = smoothstep(0.48, 0.9, turbulence2(uv * 6.0 + 12.0, vec2(6.0), 4));
  float mildew = smoothstep(0.62, 0.94, turbulence2(uv * 11.0 - 7.0, vec2(11.0), 4)) * crease;
  float wax = smoothstep(0.40, 0.80, fbm2(uv * 5.0 + 23.0, vec2(5.0), 4) * 0.5 + 0.5);

  float height = 0.48
    + weaveH * 0.20
    + (slub - 0.5) * 0.10
    + (slubWeft - 0.5) * 0.08
    + (fold - 0.5) * 0.16
    + (fuzz - 0.5) * 0.04
    + seamU * 0.10
    + stitch * 0.06
    - crease * 0.10;

  vec3 albedo = mix(DUCK_DARK, DUCK, weaveH * 0.5 + 0.5);
  albedo = mix(albedo, SUN, sun * 0.45);
  albedo = tintShift(albedo, (slub - 0.5) * 0.02, 0.9, 0.92 + 0.16 * slub);
  albedo *= 0.88 + 0.22 * mix(slub, slubWeft, warpMask);
  albedo = mix(albedo, DUCK_DARK * 0.72, grime * 0.35);
  albedo = mix(albedo, vec3(0.150, 0.164, 0.126), mildew * 0.40);
  albedo = mix(albedo, DUCK * 1.10, stitch * 0.45);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.92;
  rough -= wax * 0.14;
  rough += (fuzz - 0.5) * 0.08;
  rough += mildew * 0.04;
  rough -= sun * 0.04;
  rough -= stitch * 0.10;

  float ao = 1.0
    - (1.0 - weaveH) * 0.26
    - crease * 0.24
    - grime * 0.10
    - (1.0 - fold) * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const RUBBER_TIRE = /* glsl */ `
const vec3 RUBBER = vec3(0.062, 0.062, 0.066);
const vec3 RUBBER_GREY = vec3(0.108, 0.108, 0.112);
const vec3 BLOOM = vec3(0.196, 0.190, 0.184);

void surface(vec2 uv, inout Surface s) {
  // Off-road tread wrapped so u runs around the tyre. Aggressive lugs on a
  // staggered lattice, siping across each lug, and the antiozonant bloom that
  // greys old rubber.
  Cell lug = brickCell(uv, vec2(6.0, 8.0), 0.16);
  float block = lobe(lug.luv, 3.4, 0.30);
  float shoulder = smoothstep(0.05, 0.35, block);

  // Sipes: fine slots cut across each lug.
  float sipe = (1.0 - smoothstep(0.02, 0.05, abs(fract(lug.luv.y * 4.0) - 0.5))) * shoulder;

  // Mould texture: fine radial ribbing plus the flash line at the tread edge.
  float mould = grainAniso(uv, vec2(6.0, 150.0), 3);
  float grain = grainNoise(uv, 210.0, 3);
  float micro = grainNoise(uv, 256.0, 2);
  float vent = (1.0 - smoothstep(0.0, 0.05, grainWorley(uv, 44.0, 1.0).x)) * (1.0 - shoulder);

  // Sidewall lettering band, raised and slightly polished.
  float letterBand = smoothBand(uv.y, 0.02, 0.10, 0.012);
  float glyph = step(0.5, hash12(vec2(mod(floor(uv.x * 34.0), 34.0), 1.0) + 0.5)) *
    (1.0 - smoothstep(0.62, 0.80, abs(fract(uv.x * 34.0) - 0.5) * 2.0));
  float lettering = letterBand * glyph;

  float wear = smoothstep(0.45, 0.85, fbm2(uv * 4.0 + 9.0, vec2(4.0), 4) * 0.5 + 0.5);
  float bloom = smoothstep(0.35, 0.80, fbm2(uv * 3.0 - 6.0, vec2(3.0), 4) * 0.5 + 0.5);
  float mud = smoothstep(0.52, 0.92, turbulence2(uv * 7.0 + 31.0, vec2(7.0), 4)) * (1.0 - shoulder * 0.6);
  float scuff = scratches(uv, vec2(detailCells(90.0), detailCells(20.0)), 6.0, 0.4);

  float height = 0.20
    + block * 0.58
    + lettering * 0.10
    + (mould - 0.5) * 0.05
    + (grain - 0.5) * 0.07
    + (micro - 0.5) * 0.03
    - sipe * 0.30
    - vent * 0.08;

  vec3 albedo = mix(RUBBER, RUBBER_GREY, wear * 0.6 + 0.2);
  albedo = mix(albedo, BLOOM, bloom * 0.45);
  albedo *= 0.86 + 0.26 * grain;
  albedo = mix(albedo, vec3(0.286, 0.232, 0.164), mud * 0.55);
  albedo = mix(albedo, RUBBER_GREY * 1.4, lettering * 0.35 + scuff * 0.25);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.86;
  rough -= wear * shoulder * 0.30;
  rough += bloom * 0.08;
  rough += mud * 0.10;
  rough += (grain - 0.5) * 0.10;
  rough -= lettering * 0.06;

  float ao = 1.0 - (1.0 - block) * 0.48 - sipe * 0.30 - mud * 0.12 - vent * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const INDUSTRIAL_PAINT = /* glsl */ `
uniform vec3 uPaint;
uniform vec3 uPaintDeep;
uniform float uHazard;

const vec3 PRIMER = vec3(0.412, 0.404, 0.396);
const vec3 SUBSTRATE = vec3(0.560, 0.566, 0.572);
const vec3 RUST = vec3(0.404, 0.192, 0.096);
const vec3 RUST_DEEP = vec3(0.268, 0.132, 0.080);

void surface(vec2 uv, inout Surface s) {
  // Sprayed industrial enamel over steel. Chalking from UV, chips that go
  // through primer to bright metal, and rust creeping from every chip: the
  // chip edges are what make it read as paint on metal rather than as a decal.
  float orangePeel = grainNoise(uv, 150.0, 3);
  float micro = grainNoise(uv, 250.0, 2);
  float sprayPass = fbm2(slant(uv, vec2(3.0, 26.0), 1.0), vec2(3.0, 26.0), 3) * 0.5 + 0.5;
  float sag = fbm2(vec2(uv.x * 8.0, uv.y * 2.0), vec2(8.0, 2.0), 3) * 0.5 + 0.5;

  // Hazard stripes, tileable because the diagonal advances a whole tile per tile.
  float stripe = step(0.5, fract((uv.x + uv.y) * 6.0));
  float stripeEdge = 1.0 - smoothstep(0.0, 0.035, abs(fract((uv.x + uv.y) * 6.0) - 0.5) * 2.0 - 0.93);

  // Paint failure runs at two scales: broad areas that have lost their coat and
  // a scatter of individual chips inside the surviving paint. One scale alone
  // gives the tell-tale blobby "damage decal" look.
  float chipField = fbm2(warp2(uv * 11.0, vec2(11.0), 0.7, 4), vec2(11.0), 5) * 0.5 + 0.5;
  float chipFine = fbm2(warp2(uv * 26.0, vec2(26.0), 0.5, 3), vec2(26.0), 4) * 0.5 + 0.5;
  float wearEdge = smoothstep(0.55, 0.95, sat(1.0 - uv.y * 1.4)) * 0.35;
  float drive = chipField * 0.72 + chipFine * 0.28 + wearEdge;
  float coat = 1.0 - smoothstep(0.60, 0.66, drive);
  float lip = band(drive, 0.63, 0.022) * coat;
  float primer = smoothBand(drive, 0.65, 0.73, 0.016);
  float bare = smoothstep(0.72, 0.80, drive);

  vec3 scratchCells = worley2(uv * 30.0, vec2(30.0), 1.0);
  float scratch = scratches(uv, vec2(detailCells(120.0), detailCells(26.0)), 6.0, 0.45);
  float gouge = (1.0 - smoothstep(0.0, 0.06, scratchCells.y - scratchCells.x)) * step(0.6, scratchCells.z);

  float rustField = fbm2(uv * 12.0 + 5.0, vec2(12.0), 4) * 0.5 + 0.5;
  // Bare steel on outdoor ironwork does not stay bare: nearly all of it carries
  // oxide within weeks, so exposure reads brown, not bright grey.
  float rust = sat((primer * 0.65 + bare * 1.6 + gouge * 0.7) * (0.5 + 0.7 * rustField));
  float chalk = patchiness(uv + 13.0, 3.0, 3);
  float grime = smoothstep(0.48, 0.9, turbulence2(uv * 5.0 + 27.0, vec2(5.0), 4));
  float streak = dripStreaks(uv, 20.0, 0.6, 37.0);

  float height = 0.62
    + coat * 0.10
    + lip * 0.08
    + (orangePeel - 0.5) * 0.10
    + (sprayPass - 0.5) * 0.04
    + (sag - 0.5) * 0.03
    + (micro - 0.5) * 0.02
    + rust * 0.05
    - primer * 0.05
    - bare * 0.09
    - gouge * 0.30
    - scratch * 0.10;

  vec3 paint = mix(uPaintDeep, uPaint, sprayPass * 0.6 + sag * 0.4);
  paint = mix(paint, mix(paint, vec3(0.055, 0.052, 0.050), 0.88), stripe * uHazard);
  paint = mix(paint, paint * 1.10, stripeEdge * uHazard * 0.4);
  paint = mix(paint, paint * (0.82 + 0.30 * chalk) + vec3(0.05) * chalk, chalk * 0.45);

  vec3 albedo = mix(SUBSTRATE, paint, coat);
  albedo = mix(albedo, PRIMER, primer * 0.85);
  albedo = mix(albedo, paint * 1.14, lip * 0.55);
  albedo = mix(albedo, mix(RUST, RUST_DEEP, rustField), rust * 0.88);
  albedo = mix(albedo, SUBSTRATE * 1.06, sat(scratch * 0.7 + gouge * 0.5) * (1.0 - rust) * 0.40);
  albedo = mix(albedo, vec3(0.164, 0.160, 0.152), grime * 0.35);
  albedo = mix(albedo, vec3(0.196, 0.150, 0.118), streak * 0.45);
  albedo *= 0.96 + 0.08 * orangePeel;
  albedo *= 0.98 + 0.04 * micro;

  float rough = mix(0.52, 0.92, chalk * 0.85);
  rough = mix(0.86, rough, coat);
  rough += primer * 0.10;
  rough += rust * 0.30;
  rough += grime * 0.12;
  rough -= streak * 0.08;
  rough -= sat(scratch + gouge) * (1.0 - rust) * 0.16;
  rough += (orangePeel - 0.5) * 0.10;

  float metal = sat((bare + primer * 0.25 + gouge * 0.7) * (1.0 - coat * 0.9) * (1.0 - rust * 0.9));

  float ao = 1.0 - gouge * 0.35 - primer * 0.10 - bare * 0.10 - grime * 0.10 - streak * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = metal;
  s.ao = ao;
  s.height = height;
}
`;

const CAMO_NET = /* glsl */ `
${CAMO_GLSL}
const vec3 NET_TAN = vec3(0.518, 0.452, 0.320);
const vec3 NET_BROWN = vec3(0.328, 0.272, 0.186);
const vec3 NET_GREEN = vec3(0.242, 0.276, 0.166);
const vec3 NET_DARK = vec3(0.148, 0.150, 0.116);

void surface(vec2 uv, inout Surface s) {
  // Garnished camouflage netting. The whole point is the cutout: the alpha has
  // to be an open mesh with irregular leaf clusters, or it reads as a bedsheet.
  vec2 mesh = camoMesh(uv, vec2(12.0, 12.0), 0.34, 0.85);
  float coverage = mesh.x;
  float relief = mesh.y;

  float bandId;
  vec3 base = camoBlend(uv, 5.0, NET_TAN, NET_BROWN, NET_GREEN, NET_DARK, bandId);

  vec3 cloth = weave(uv, vec2(detailCells(150.0), detailCells(148.0)), 0.6);
  float weaveH = cloth.x * 0.5 + 0.5;
  float fuzz = grainNoise(uv, 230.0, 2);
  float fray = grainAniso(uv, vec2(20.0, 120.0), 3);

  float dust = smoothstep(0.42, 0.90, fbm2(uv * 6.0 + 17.0, vec2(6.0), 4) * 0.5 + 0.5);
  float sun = patchiness(uv - 5.0, 3.0, 3);

  float height = 0.30
    + relief * 0.50
    + weaveH * 0.10 * coverage
    + (fray - 0.5) * 0.08
    + (fuzz - 0.5) * 0.04;

  vec3 albedo = base;
  albedo = tintShift(albedo, (bandId - 0.5) * 0.02, 0.9 - sun * 0.2, 0.9 + 0.2 * sun);
  albedo *= 0.86 + 0.26 * mix(fuzz, weaveH, 0.5);
  albedo = mix(albedo, vec3(0.560, 0.512, 0.412), dust * 0.35);
  albedo = mix(albedo, albedo * 0.72, (1.0 - relief) * 0.30);

  float rough = 0.94;
  rough += dust * 0.03;
  rough += (fuzz - 0.5) * 0.06;
  rough -= sun * 0.04;

  float ao = 1.0 - (1.0 - relief) * 0.32 - (1.0 - weaveH) * 0.14 - dust * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
  s.alpha = coverage;
}
`;

const VEHICLE_PAINT = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uShade;
uniform vec3 uAccent;
uniform float uCamoAmount;

${CAMO_GLSL}

const vec3 PRIMER = vec3(0.318, 0.322, 0.330);
const vec3 STEEL = vec3(0.720, 0.726, 0.734);

void surface(vec2 uv, inout Surface s) {
  // Military CARC finish: flat, chalky, sprayed over a filler-heavy primer, and
  // covered in the specific weathering that vehicles get — dust banded low down,
  // fuel spill haloes, and stone chips concentrated along the leading edges.
  float bandId;
  vec3 camo = camoBlend(uv, 3.0, uBase, uShade, uAccent, uShade * 0.72, bandId);
  vec3 flat_ = mix(uBase, uShade, fbm2(uv * 2.5, vec2(3.0), 4) * 0.5 + 0.5);
  vec3 paint = mix(flat_, camo, uCamoAmount);

  // Sun bleaching: the single strongest cue that a vehicle has been in service.
  // It lifts value and kills saturation, and it does so in metre-scale patches.
  float bleach = patchiness(uv + 7.0, 1.5, 4);
  paint = tintShift(paint, (bleach - 0.5) * 0.014, mix(1.10, 0.74, bleach), mix(0.90, 1.18, bleach));

  float orangePeel = grainNoise(uv, 130.0, 3);
  float micro = grainNoise(uv, 250.0, 2);
  float sprayPass = fbm2(slant(uv, vec2(2.0, 20.0), 1.0), vec2(2.0, 20.0), 3) * 0.5 + 0.5;

  // Panel lines, a weld bead and a rivet run: the vehicle's own structure
  // showing through. Without them the paint reads as unbroken putty.
  Cell panel = gridCell(uv, vec2(2.0, 2.0), 0.010);
  float seam = 1.0 - panel.face;
  float seamU = panel.dist.x * 0.5;
  float weldWander = fbm2(vec2(uv.x * 24.0, 3.7), vec2(24.0, 1.0), 3) * 0.004;
  float weldD = abs(panel.dist.y * 0.5 - 0.016 + weldWander) / 0.011;
  float weld = sqrt(max(0.0, 1.0 - weldD * weldD)) * (1.0 - smoothstep(0.9, 1.0, weldD));
  float weldRipple = 0.5 + 0.5 * cos(uv.x * 220.0 * PI);
  weld *= 0.72 + 0.28 * weldRipple;
  float rowV = (fract(uv.y * 16.0) - 0.5) / 16.0;
  float rd = length(vec2(seamU - 0.013, rowV)) / 0.0085;
  float rivetHead = sqrt(max(0.0, 1.0 - rd * rd)) * (1.0 - smoothstep(0.88, 1.0, rd));

  // Chipping: sparse, small and hard-edged, unlike the broad paint failure on
  // static ironwork.
  vec3 chipCells = worley2(uv * 70.0, vec2(70.0), 1.0);
  float chipSeed = step(0.955, chipCells.z);
  float chip = (1.0 - smoothstep(0.10, 0.30, chipCells.x)) * chipSeed;
  float chipEdge = band(chipCells.x, 0.30, 0.06) * chipSeed;
  float scratch = scratches(uv, vec2(detailCells(140.0), detailCells(30.0)), 7.0, 0.35);
  float rub = smoothstep(0.62, 0.92, fbm2(warp2(uv * 7.0, vec2(7.0), 0.4, 3), vec2(7.0), 4) * 0.5 + 0.5);

  // Road dust arrives from below and is thrown up in vertical fans, so it bands
  // low and streaks up rather than dripping down like water-borne grime.
  float dustBand = sat(1.0 - uv.y * 1.5);
  float dustFan = dripStreaks(vec2(uv.x, 1.0 - uv.y), 30.0, 0.45, 71.0);
  float dust = smoothstep(0.30, 0.85, fbm2(uv * 5.0 + 21.0, vec2(5.0), 4) * 0.5 + 0.5) *
    (0.30 + dustBand * 1.25) + dustFan * dustBand * 0.55;
  dust = sat(dust);
  float grime = smoothstep(0.55, 0.94, turbulence2(uv * 8.0 - 13.0, vec2(8.0), 4));
  float fuel = smoothstep(0.62, 0.94, fbm2(uv * 4.0 + 44.0, vec2(4.0), 4) * 0.5 + 0.5);
  float chalk = patchiness(uv + 31.0, 2.5, 3);
  float streak = dripStreaks(uv, 26.0, 0.5, 53.0) * 0.6;
  float seamDirt = sat(seam * (0.55 + 0.75 * grime) + weld * 0.35);

  float height = 0.66
    + panel.face * 0.06
    + rivetHead * 0.22
    + weld * 0.20
    + (orangePeel - 0.5) * 0.08
    + (sprayPass - 0.5) * 0.03
    + (micro - 0.5) * 0.02
    - seam * 0.34
    - chip * 0.28
    + chipEdge * 0.05
    - scratch * 0.10;

  vec3 albedo = paint;
  albedo = mix(albedo, albedo * (0.86 + 0.28 * chalk), chalk * 0.4);
  albedo = mix(albedo, albedo * 0.52, seamDirt * 0.7);
  albedo = mix(albedo, PRIMER, chipEdge * 0.55);
  albedo = mix(albedo, STEEL * 0.9, chip * 0.7);
  albedo = mix(albedo, STEEL, sat(scratch * 0.6 + rub * 0.15) * 0.35);
  albedo = mix(albedo, vec3(0.542, 0.492, 0.404), dust * 0.50);
  albedo = mix(albedo, vec3(0.152, 0.146, 0.138), grime * 0.34);
  albedo = mix(albedo, vec3(0.108, 0.098, 0.088), fuel * 0.28 + streak * 0.35);
  albedo *= 0.96 + 0.08 * orangePeel;
  albedo *= 0.98 + 0.04 * micro;

  // CARC is genuinely flat; the only glossy things on the vehicle are the
  // fuel spills and the places a hand or a strap has polished it.
  float rough = 0.74;
  rough += chalk * 0.10;
  rough += dust * 0.16;
  rough -= fuel * 0.34;
  rough -= rub * 0.16;
  rough -= streak * 0.10;
  rough += grime * 0.06;
  rough += chip * 0.10;
  rough += seamDirt * 0.08;
  rough -= weld * 0.06;
  rough -= sat(scratch) * 0.14;
  rough += (orangePeel - 0.5) * 0.10;

  float metal = sat(chip * 0.85 + scratch * 0.30 - dust * 0.4);

  float ao = 1.0 - seam * 0.45 - chip * 0.20 - grime * 0.10 - dust * 0.08
    + rivetHead * 0.04 + weld * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = metal;
  s.ao = ao;
  s.height = height;
}
`;

const CRATE_MILITARY = /* glsl */ `
const vec3 OD_GREEN = vec3(0.196, 0.216, 0.150);
const vec3 OD_LIGHT = vec3(0.286, 0.302, 0.212);
const vec3 PLY = vec3(0.552, 0.452, 0.300);
const vec3 STEEL = vec3(0.700, 0.706, 0.712);
const vec3 STENCIL = vec3(0.812, 0.796, 0.740);

void surface(vec2 uv, inout Surface s) {
  // Olive-drab ammunition chest: painted ply body, pressed-steel edging along
  // the top and bottom, and stencilled lot markings that have half worn off.
  float edgeTop = 1.0 - smoothstep(0.075, 0.095, uv.y);
  float edgeBot = 1.0 - smoothstep(0.075, 0.095, 1.0 - uv.y);
  float band_ = sat(edgeTop + edgeBot);
  float bandLip = max(band(uv.y, 0.086, 0.014), band(1.0 - uv.y, 0.086, 0.014));

  // Rivets through the steel edging.
  float rivU = (fract(uv.x * 14.0) - 0.5) / 14.0;
  float rivV = min(abs(uv.y - 0.045), abs(1.0 - uv.y - 0.045));
  float rd = length(vec2(rivU, rivV)) / 0.011;
  float rivetHead = band_ * sqrt(max(0.0, 1.0 - rd * rd)) * (1.0 - smoothstep(0.88, 1.0, rd));

  // Ply substrate: shallow veneer figure under a thick coat of paint.
  float veneer = fbm2(vec2(uv.x * 3.0, uv.y * 22.0), vec2(3.0, 22.0), 4) * 0.5 + 0.5;
  float grainRun = grainAniso(uv, vec2(6.0, 130.0), 3);
  float orangePeel = grainNoise(uv, 140.0, 3);
  float micro = grainNoise(uv, 250.0, 2);

  // Handling: corners crushed, coat rubbed through on the edging.
  float chipField = fbm2(warp2(uv * 7.0, vec2(7.0), 0.6, 4), vec2(7.0), 5) * 0.5 + 0.5;
  float drive = chipField + band_ * 0.22 + bandLip * 0.30;
  float coat = 1.0 - smoothstep(0.64, 0.72, drive);
  float lip = band(drive, 0.68, 0.03) * coat;
  float bare = smoothstep(0.74, 0.84, drive);
  float scuff = scratches(uv, vec2(detailCells(110.0), detailCells(26.0)), 6.0, 0.5);

  // Stencils: two lines of lot markings, with gaps where words end and patchy
  // ink coverage from a worn stencil plate.
  float rows = smoothBand(uv.y, 0.315, 0.425, 0.010) + smoothBand(uv.y, 0.545, 0.630, 0.010);
  vec2 gp = vec2(uv.x * 18.0, uv.y * 12.0);
  vec2 gi = vec2(mod(floor(gp.x), 18.0), mod(floor(gp.y), 12.0));
  float glyph = stencilGlyph(fract(gp), gi.x + gi.y * 18.0, 0.24);
  float ink = sat(rows) * glyph * step(0.26, hash12(gi + 0.5)) * coat *
    smoothstep(0.20, 0.65, fbm2(uv * 9.0 - 3.0, vec2(9.0), 3) * 0.5 + 0.5);

  float dust = smoothstep(0.38, 0.88, fbm2(uv * 5.0 + 19.0, vec2(5.0), 4) * 0.5 + 0.5) * (0.4 + sat(1.0 - uv.y * 1.6));
  float grime = smoothstep(0.55, 0.92, turbulence2(uv * 8.0 + 5.0, vec2(8.0), 4));
  float rust = sat(bare * 0.8 + scuff * 0.2) * band_ *
    smoothstep(0.35, 0.85, fbm2(uv * 14.0 + 7.0, vec2(14.0), 3) * 0.5 + 0.5);

  float height = 0.58
    + band_ * 0.10
    + bandLip * 0.06
    + rivetHead * 0.24
    + coat * 0.05
    + lip * 0.05
    + (veneer - 0.5) * 0.06 * (1.0 - band_)
    + (grainRun - 0.5) * 0.05 * (1.0 - coat)
    + (orangePeel - 0.5) * 0.07
    + (micro - 0.5) * 0.02
    - bare * 0.06
    - scuff * 0.10;

  vec3 paint = mix(OD_GREEN, OD_LIGHT, veneer * 0.4 + orangePeel * 0.3 + 0.3);
  vec3 substrate = mix(PLY, STEEL, band_);
  vec3 albedo = mix(substrate, paint, coat);
  albedo = mix(albedo, paint * 1.12, lip * 0.5);
  albedo = mix(albedo, STENCIL, ink * 0.85);
  albedo = mix(albedo, vec3(0.398, 0.190, 0.096), rust * 0.6);
  albedo = mix(albedo, STEEL * 1.05, sat(scuff) * band_ * (1.0 - rust) * 0.4);
  albedo = mix(albedo, vec3(0.520, 0.482, 0.400), dust * 0.34);
  albedo = mix(albedo, vec3(0.128, 0.126, 0.118), grime * 0.32);
  albedo *= 0.96 + 0.08 * orangePeel;
  albedo *= 0.98 + 0.04 * micro;

  float rough = mix(0.90, 0.66, coat);
  rough += dust * 0.14;
  rough += rust * 0.24;
  rough += grime * 0.08;
  rough -= ink * 0.06;
  rough -= sat(scuff) * band_ * 0.12;
  rough += (orangePeel - 0.5) * 0.10;

  float metal = sat((bare + scuff * 0.4) * band_ * (1.0 - coat * 0.9) * (1.0 - rust * 0.85));

  float ao = 1.0 - bandLip * 0.20 - bare * 0.10 - grime * 0.10 - dust * 0.06 + rivetHead * 0.04;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = metal;
  s.ao = ao;
  s.height = height;
}
`;

const GUN_POLYMER = /* glsl */ `
uniform float uTan;

// Even a black polymer housing has to sit near sRGB 0.15: any lower and the
// mould stipple that identifies the part stops being visible at all.
const vec3 POLY = vec3(0.170, 0.172, 0.178);
const vec3 POLY_GREY = vec3(0.238, 0.240, 0.248);
const vec3 POLY_TAN = vec3(0.316, 0.276, 0.214);
const vec3 FILLER = vec3(0.288, 0.290, 0.296);

void surface(vec2 uv, inout Surface s) {
  // Glass-filled nylon housing. The mould leaves a fine stipple that is not
  // noise: it is a dense field of shallow pyramidal cells with a consistent
  // pitch, and it is the single most recognisable feature of a modern receiver.
  float stippleCells = detailCells(120.0);
  vec2 sp = fract(uv * stippleCells) - 0.5;
  float pyramid = 1.0 - max(abs(sp.x), abs(sp.y)) * 2.0;
  float stipple = pow(sat(pyramid), 0.55);
  float stippleJitter = grainNoise(uv, 120.0, 2);

  // Sparse glass fibre showing at the surface, plus the mould flow lines.
  float fibre = 1.0 - smoothstep(0.0, 0.05, grainWorley(uv, 180.0, 1.0).x);
  float flow = fbm2(slant(uv, vec2(3.0, 40.0), 1.0), vec2(3.0, 40.0), 3) * 0.5 + 0.5;
  float micro = grainNoise(uv, 250.0, 2);

  // Parting line and an ejector-pin witness mark.
  float parting = 1.0 - smoothstep(0.003, 0.008, abs(uv.y - 0.5));
  float pin = 1.0 - smoothstep(0.030, 0.038, length(uv - vec2(0.22, 0.78)));

  // Handling polishes the tops of the stipple and leaves grease in the valleys.
  float handling = smoothstep(0.52, 0.90, fbm2(warp2(uv * 5.0, vec2(5.0), 0.4, 3), vec2(5.0), 4) * 0.5 + 0.5);
  float polish = handling * smoothstep(0.45, 0.95, stipple);
  float grease = handling * (1.0 - smoothstep(0.15, 0.55, stipple));
  float scuff = scratches(uv, vec2(detailCells(150.0), detailCells(34.0)), 8.0, 0.30);
  float gouge = scratches(uv, vec2(detailCells(24.0), detailCells(24.0)), 4.0, 0.10);
  float dust = smoothstep(0.60, 0.95, fbm2(uv * 9.0 - 11.0, vec2(9.0), 4) * 0.5 + 0.5);

  float height = 0.56
    + stipple * 0.26
    + (stippleJitter - 0.5) * 0.06
    + (flow - 0.5) * 0.04
    + (micro - 0.5) * 0.03
    + parting * 0.06
    - pin * 0.10
    - gouge * 0.26
    - scuff * 0.06
    - fibre * 0.04;

  vec3 albedo = mix(POLY, POLY_GREY, stipple * 0.62 + flow * 0.26);
  albedo = mix(albedo, POLY_TAN, uTan);
  albedo = mix(albedo, FILLER, fibre * 0.35);
  albedo = mix(albedo, albedo * 1.35, polish * 0.35);
  albedo = mix(albedo, albedo * 1.5 + vec3(0.02), sat(scuff * 0.8 + gouge) * 0.45);
  albedo = mix(albedo, vec3(0.420, 0.402, 0.372), dust * 0.20);
  albedo *= 0.94 + 0.12 * stippleJitter;
  albedo *= 0.98 + 0.04 * micro;

  float rough = 0.72;
  rough -= polish * 0.30;
  rough -= grease * 0.16;
  rough += (1.0 - stipple) * 0.10;
  rough += dust * 0.12;
  rough -= sat(scuff + gouge) * 0.18;
  rough += fibre * 0.10;
  rough += (micro - 0.5) * 0.06;

  float ao = 1.0 - (1.0 - stipple) * 0.20 - gouge * 0.24 - pin * 0.15 - dust * 0.05;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const GEAR_NYLON = /* glsl */ `
${CAMO_GLSL}
const vec3 CORDURA = vec3(0.240, 0.226, 0.174);
const vec3 CORDURA_LIGHT = vec3(0.352, 0.330, 0.252);
const vec3 WEBBING = vec3(0.286, 0.272, 0.208);
const vec3 THREAD = vec3(0.408, 0.392, 0.320);

void surface(vec2 uv, inout Surface s) {
  // 1000 denier Cordura with PALS webbing sewn across it. The tell is the
  // basketweave: heavy multifilament yarns in a 2x2 basket, so the specular
  // breaks up into short bright dashes rather than a smooth sheen.
  float basketCells = detailCells(70.0);
  vec2 bp = uv * basketCells;
  vec2 bi = floor(bp * 0.5);
  vec2 bf = fract(bp);
  float over = mod(bi.x + bi.y, 2.0);
  float warpH = cos((bf.x - 0.5) * PI);
  float weftH = cos((bf.y - 0.5) * PI);
  float basket = max(warpH * mix(0.62, 1.0, 1.0 - over), weftH * mix(0.62, 1.0, over));
  float warpMask = step(weftH * mix(0.62, 1.0, over), warpH * mix(0.62, 1.0, 1.0 - over));
  float filament = grainAniso(uv, mix(vec2(220.0, 14.0), vec2(14.0, 220.0), warpMask), 2);

  // PALS rows: webbing strips with a bar-tack every few centimetres.
  float rowPitch = 5.0;
  float rowPhase = fract(uv.y * rowPitch);
  float strap = smoothBand(rowPhase, 0.10, 0.72, 0.03);
  float strapEdge = max(band(rowPhase, 0.10, 0.04), band(rowPhase, 0.72, 0.04));
  float strapWeave = grainAniso(uv, vec2(180.0, 26.0), 2);
  float tack = strap * step(0.86, fract(uv.x * 8.0)) *
    step(0.30, fract(uv.y * rowPitch * 6.0));

  // Stitch rows down each edge of the webbing.
  float stitchV = max(band(rowPhase, 0.145, 0.022), band(rowPhase, 0.685, 0.022));
  float stitch = stitchV * step(0.40, fract(uv.x * detailCells(80.0)));

  float bandId;
  vec3 camo = camoBlend(uv, 4.0, CORDURA, CORDURA_LIGHT, vec3(0.196, 0.212, 0.152), vec3(0.128, 0.118, 0.096), bandId);

  float fuzz = grainNoise(uv, 240.0, 2);
  float pill = 1.0 - smoothstep(0.0, 0.08, grainWorley(uv + 4.4, 90.0, 1.0).x);
  float dust = smoothstep(0.40, 0.90, fbm2(uv * 6.0 + 23.0, vec2(6.0), 4) * 0.5 + 0.5);
  float abrasion = smoothstep(0.58, 0.92, fbm2(warp2(uv * 6.0, vec2(6.0), 0.5, 3), vec2(6.0), 4) * 0.5 + 0.5);
  float sun = patchiness(uv - 8.0, 3.0, 3);

  float clothH = mix(basket * 0.5 + 0.5, strapWeave, strap * 0.85);

  float height = 0.44
    + clothH * 0.22
    + strap * 0.18
    + strapEdge * 0.04
    + tack * 0.08
    + stitch * 0.09
    + (filament - 0.5) * 0.08
    + (fuzz - 0.5) * 0.04
    + pill * 0.05;

  vec3 albedo = mix(camo, WEBBING, strap * 0.7);
  albedo = tintShift(albedo, (bandId - 0.5) * 0.02, 0.9 - sun * 0.15, 0.94 + 0.14 * sun);
  albedo *= 0.86 + 0.26 * mix(fuzz, clothH, 0.55);
  albedo = mix(albedo, THREAD, sat(stitch + tack * 0.7) * 0.55);
  albedo = mix(albedo, albedo * 1.22, abrasion * 0.25 + pill * 0.2);
  albedo = mix(albedo, vec3(0.462, 0.436, 0.376), dust * 0.30);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.88;
  rough -= abrasion * 0.10;
  rough += dust * 0.05;
  rough += (fuzz - 0.5) * 0.08;
  rough -= stitch * 0.16;
  rough -= sun * 0.03;

  float ao = 1.0
    - (1.0 - clothH) * 0.24
    - strapEdge * 0.18
    - (1.0 - strap) * 0.10
    - dust * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const SKIN = /* glsl */ `
const vec3 SKIN_MID = vec3(0.660, 0.482, 0.386);
const vec3 SKIN_DEEP = vec3(0.512, 0.336, 0.262);
const vec3 SKIN_LIGHT = vec3(0.760, 0.606, 0.500);
const vec3 FLUSH = vec3(0.700, 0.396, 0.336);
const vec3 STUBBLE = vec3(0.176, 0.148, 0.132);

void surface(vec2 uv, inout Surface s) {
  // Weathered face and hands. Skin has no flat areas: there is always a coarse
  // dermal cell network, a finer pore field inside it, and a colour map with
  // three independent components — melanin, haemoglobin flush and pallor.
  vec3 dermal = grainWorley(uv, 105.0, 1.0);
  float cellFloor = 1.0 - smoothstep(0.02, 0.24, dermal.y - dermal.x);
  vec3 poreCells = grainWorley(uv + 3.7, 150.0, 1.0);
  float pore = (1.0 - smoothstep(0.0, 0.14, poreCells.x)) * step(0.30, poreCells.z);
  float papilla = 1.0 - smoothstep(0.10, 0.50, dermal.x);

  // Wrinkle sets at two scales, running in different directions. Kept sparse:
  // skin creases are shallow and localised, and a dense network reads as reptile.
  float wrinkleA = smoothstep(0.80, 0.97, ridged2(slant(uv, vec2(12.0, 5.0), 1.0), vec2(12.0, 5.0), 4, 0.55, 2.6));
  float wrinkleB = smoothstep(0.84, 0.98, ridged2(slant(uv, vec2(6.0, 16.0), -1.0), vec2(6.0, 16.0), 4, 0.55, 2.4));
  float creases = sat(wrinkleA * 0.6 + wrinkleB * 0.4);

  float melanin = fbm2(uv * 3.0, vec2(3.0), 4) * 0.5 + 0.5;
  float flush = smoothstep(0.40, 0.86, fbm2(uv * 5.0 + 11.0, vec2(5.0), 4) * 0.5 + 0.5);
  float pallor = patchiness(uv - 4.0, 4.0, 3);
  vec3 freckleCells = grainWorley(uv + 9.1, 90.0, 1.0);
  float freckle = (1.0 - smoothstep(0.0, 0.10, freckleCells.x)) * step(0.86, freckleCells.z);

  // Stubble and fine vellus hair: shadow only, no geometry.
  vec3 follicles = grainWorley(uv + 6.3, 170.0, 1.0);
  float stubble = (1.0 - smoothstep(0.0, 0.10, follicles.x)) * step(0.42, follicles.z) *
    smoothstep(0.35, 0.75, fbm2(uv * 4.0 - 7.0, vec2(4.0), 3) * 0.5 + 0.5);

  // Sebum makes the high points glossy; dust and dried sweat do the opposite.
  float sebum = smoothstep(0.45, 0.85, fbm2(uv * 6.0 + 17.0, vec2(6.0), 4) * 0.5 + 0.5);
  float grit = smoothstep(0.58, 0.95, turbulence2(uv * 9.0 + 27.0, vec2(9.0), 4));
  float micro = grainNoise(uv, 250.0, 2);

  float height = 0.62
    + papilla * 0.12
    + (micro - 0.5) * 0.04
    - cellFloor * 0.16
    - pore * 0.24
    - creases * 0.22
    - wrinkleA * 0.05;

  vec3 albedo = mix(SKIN_LIGHT, SKIN_MID, melanin);
  albedo = mix(albedo, SKIN_DEEP, sat((melanin - 0.45) * 1.8) * 0.8);
  albedo = mix(albedo, FLUSH, flush * 0.28);
  albedo = mix(albedo, SKIN_LIGHT * 1.04, pallor * 0.18);
  albedo = tintShift(albedo, (flush - 0.5) * -0.008, 0.95 + flush * 0.18, 1.0);
  albedo = mix(albedo, SKIN_DEEP * 0.86, freckle * 0.55);
  albedo = mix(albedo, SKIN_DEEP, creases * 0.30 + cellFloor * 0.20);
  albedo = mix(albedo, SKIN_DEEP * 0.72, pore * 0.42);
  albedo = mix(albedo, STUBBLE, stubble * 0.55);
  albedo = mix(albedo, vec3(0.352, 0.306, 0.262), grit * 0.26);
  albedo *= 0.97 + 0.06 * micro;

  float rough = 0.56;
  rough -= sebum * 0.20;
  rough += pore * 0.16;
  rough += creases * 0.10;
  rough += grit * 0.18;
  rough += stubble * 0.14;
  rough += (micro - 0.5) * 0.06;

  float ao = 1.0 - creases * 0.26 - pore * 0.24 - cellFloor * 0.12 - stubble * 0.08;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const UNIFORM = /* glsl */ `
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform float uCamoScale;
uniform float uDustAmount;

${CAMO_GLSL}

void surface(vec2 uv, inout Surface s) {
  // Nylon-cotton ripstop combat clothing. Three layers have to agree for it to
  // read as printed cloth: the disruptive pattern, the ripstop grid that the
  // print sits on, and the fine weave that catches the light between them.
  float bandId;
  vec3 print = camoBlend(uv, uCamoScale, uC0, uC1, uC2, uC3, bandId);

  vec3 cloth = weave(uv, vec2(detailCells(190.0), detailCells(186.0)), 0.45);
  float weaveH = cloth.x * 0.5 + 0.5;
  float warpMask = cloth.y;
  float rip = ripstop(uv, 34.0, 0.20);
  float slub = grainAniso(uv, mix(vec2(200.0, 16.0), vec2(16.0, 200.0), warpMask), 2);
  float fuzz = grainNoise(uv, 240.0, 2);

  // Seams, and the folds that gather along them.
  float seamU = 1.0 - smoothstep(0.008, 0.020, abs(fract(uv.x * 2.0) - 0.5));
  float stitch = seamU * step(0.42, fract(uv.y * detailCells(100.0)));
  float fold = fbm2(uv * vec2(4.0, 3.0) + 7.0, vec2(4.0, 3.0), 4) * 0.5 + 0.5;
  float crease = 1.0 - smoothstep(0.0, 0.20, abs(ridged2(uv * vec2(5.0, 4.0), vec2(5.0, 4.0), 3, 0.5, 2.2) - 0.74));

  // Wear: the print fades on the crowns, dirt gathers in the creases.
  float sun = smoothstep(0.25, 0.9, fold) * patchiness(uv + 12.0, 3.0, 3);
  float abrasion = smoothstep(0.60, 0.92, fbm2(warp2(uv * 7.0, vec2(7.0), 0.5, 3), vec2(7.0), 4) * 0.5 + 0.5);
  float dust = smoothstep(0.36, 0.88, fbm2(uv * 6.0 + 29.0, vec2(6.0), 4) * 0.5 + 0.5) * uDustAmount;
  float sweat = smoothstep(0.62, 0.95, turbulence2(uv * 5.0 - 21.0, vec2(5.0), 4));

  float height = 0.50
    + weaveH * 0.16
    + rip * 0.14
    + (slub - 0.5) * 0.08
    + (fold - 0.5) * 0.14
    + (fuzz - 0.5) * 0.04
    + seamU * 0.08
    + stitch * 0.06
    - crease * 0.12;

  vec3 albedo = print;
  albedo = mix(albedo, mix(albedo, vec3(luma(albedo)) * 1.18, 0.55), sun * 0.35 + abrasion * 0.25);
  albedo = tintShift(albedo, (bandId - 0.5) * 0.015, 0.92, 0.94 + 0.14 * fold);
  albedo *= 0.86 + 0.26 * mix(fuzz, weaveH, 0.5);
  albedo = mix(albedo, albedo * 1.16, rip * 0.30);
  albedo = mix(albedo, vec3(0.470, 0.436, 0.372), dust * 0.34);
  albedo = mix(albedo, albedo * 0.66, sweat * 0.25 + crease * 0.20);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.90;
  rough -= abrasion * 0.10;
  rough -= sweat * 0.14;
  rough += dust * 0.05;
  rough += (fuzz - 0.5) * 0.08;
  rough -= stitch * 0.14;
  rough -= rip * 0.04;

  float ao = 1.0
    - (1.0 - weaveH) * 0.24
    - crease * 0.26
    - (1.0 - fold) * 0.10
    - dust * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const KEVLAR = /* glsl */ `
const vec3 ARAMID = vec3(0.412, 0.354, 0.208);
const vec3 ARAMID_DARK = vec3(0.286, 0.242, 0.140);
const vec3 SHELL = vec3(0.226, 0.238, 0.176);
const vec3 SHEEN_C = vec3(0.560, 0.504, 0.328);

void surface(vec2 uv, inout Surface s) {
  // Ballistic aramid under a cover. Aramid tows are flat and wide, so the weave
  // is a shallow basket of ribbons rather than round yarns, and the fibre gives
  // it a distinct golden sheen along the tow direction.
  float towCells = detailCells(34.0);
  vec2 tp = uv * towCells;
  vec2 ti = floor(tp);
  vec2 tf = fract(tp);
  float over = mod(ti.x + ti.y, 2.0);
  // Flat-topped ribbon profile: nearly level across the tow, steep at the edge.
  float ribbonX = 1.0 - pow(abs(tf.x - 0.5) * 2.0, 4.0);
  float ribbonY = 1.0 - pow(abs(tf.y - 0.5) * 2.0, 4.0);
  float hx = ribbonX * mix(0.55, 1.0, 1.0 - over);
  float hy = ribbonY * mix(0.55, 1.0, over);
  float tow = max(hx, hy);
  float warpMask = step(hy, hx);

  float filament = grainAniso(uv, mix(vec2(240.0, 20.0), vec2(20.0, 240.0), warpMask), 2);
  float resin = smoothstep(0.40, 0.85, fbm2(uv * 8.0 + 5.0, vec2(8.0), 4) * 0.5 + 0.5);
  float fuzz = grainNoise(uv, 230.0, 2);

  // Cover panels stitched over the aramid, quilted on a coarse grid.
  Cell quilt = gridCell(uv, vec2(3.0, 3.0), 0.030);
  float quiltSeam = 1.0 - quilt.face;
  float quiltStitch = quiltSeam * step(0.42, fract((uv.x + uv.y) * detailCells(70.0)));
  float loft = quilt.face * (0.6 + 0.4 * fbm2(uv * 4.0, vec2(4.0), 3));

  float dust = smoothstep(0.42, 0.90, fbm2(uv * 6.0 + 33.0, vec2(6.0), 4) * 0.5 + 0.5);
  float abrasion = smoothstep(0.62, 0.94, fbm2(warp2(uv * 8.0, vec2(8.0), 0.5, 3), vec2(8.0), 4) * 0.5 + 0.5);
  float scuff = scratches(uv, vec2(detailCells(100.0), detailCells(24.0)), 6.0, 0.4);

  float height = 0.44
    + tow * 0.24
    + loft * 0.14
    + (filament - 0.5) * 0.08
    + (fuzz - 0.5) * 0.04
    + quiltStitch * 0.08
    - quiltSeam * 0.18;

  vec3 albedo = mix(ARAMID_DARK, ARAMID, tow * 0.5 + 0.5);
  albedo = mix(albedo, SHEEN_C, filament * 0.22);
  albedo = mix(albedo, SHELL, quilt.face * 0.42);
  albedo = tintShift(albedo, (resin - 0.5) * 0.012, 0.95, 0.94 + 0.12 * loft);
  albedo *= 0.88 + 0.22 * mix(fuzz, tow, 0.5);
  albedo = mix(albedo, albedo * 1.20, abrasion * 0.22 + scuff * 0.2);
  albedo = mix(albedo, vec3(0.452, 0.424, 0.360), dust * 0.28);
  albedo *= 0.97 + 0.06 * fuzz;

  float rough = 0.72;
  rough -= filament * 0.14;
  rough -= resin * 0.10;
  rough += dust * 0.12;
  rough += abrasion * 0.10;
  rough += (1.0 - tow) * 0.12;
  rough -= quiltStitch * 0.10;

  float ao = 1.0 - (1.0 - tow) * 0.26 - quiltSeam * 0.28 - dust * 0.06;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = ao;
  s.height = height;
}
`;

const MUZZLE_FLASH = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Additive sprite: a white-hot core, a five-lobed star of burning propellant
  // and a short conical plume. The alpha is the shape, so it has to fall to zero
  // well inside the tile edge.
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);
  // Angular noise is sampled on a circle rather than from the angle itself:
  // atan wraps at PI and any noise fed the raw angle shows that seam.
  vec2 dir = p / max(r, 1e-4);

  float lobes = 0.55 + 0.45 * pow(abs(cos(ang * 3.0 + 0.4)), 1.6);
  float turbulentEdge = 0.82 + 0.36 * (fbm2(dir * 3.0 + vec2(3.1, r * 4.0), vec2(16.0, 8.0), 4) * 0.5 + 0.5);
  float radius = 0.94 * lobes * turbulentEdge;

  float core = exp(-pow(r / 0.19, 2.0));
  float body = sat(1.0 - r / max(radius, 1e-3));
  body = pow(body, 1.55);

  // Radial streaks of unburnt powder.
  float streaks = pow(abs(sin(ang * 13.0 + fbm2(dir * 2.0, vec2(12.0), 3) * 3.0)), 6.0);
  float spark = streaks * smoothBand(r, 0.25, 0.98, 0.22);

  float shape = sat(core * 1.5 + body * 0.9 + spark * 0.35);
  float flicker = 0.85 + 0.3 * (fbm2(uv * 9.0, vec2(9.0), 3) * 0.5 + 0.5);
  shape *= flicker;

  // Blackbody-ish ramp from white through yellow to deep orange.
  vec3 hot = vec3(1.0, 0.972, 0.905);
  vec3 mid = vec3(1.0, 0.760, 0.330);
  vec3 cool = vec3(0.960, 0.352, 0.086);
  float t = sat(core * 1.4 + body * 0.55);
  vec3 colour = mix(cool, mid, sat(t * 1.7));
  colour = mix(colour, hot, sat((t - 0.55) * 2.4));

  s.albedo = colour;
  s.roughness = 1.0;
  s.metalness = 0.0;
  s.ao = 1.0;
  s.height = 0.5;
  s.alpha = sat(shape) * (1.0 - smoothstep(0.86, 1.0, r));
}
`;

const TRACER = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Additive billboard for a tracer segment: u runs along the flight path, so
  // the head is at u = 1 and the tail smears out behind it.
  float across = abs(uv.y - 0.5) * 2.0;
  float head = pow(sat(uv.x), 6.0);

  // A thin, very bright core inside a soft glow that widens towards the tail.
  float width = mix(1.0, 0.42, sat(uv.x));
  float core = exp(-pow(across / (0.075 * width), 2.0));
  float glow = exp(-pow(across / (0.42 * width), 2.0));

  float along = smoothstep(0.0, 0.28, uv.x) * (0.35 + 0.65 * sat(uv.x));
  float flicker = 0.8 + 0.4 * (fbmValue2(vec2(uv.x * 40.0, 0.5), vec2(40.0, 2.0), 3));

  float shape = sat(core * 1.25 + glow * 0.34 + head * core * 0.9) * along * flicker;

  vec3 hot = vec3(1.0, 0.965, 0.880);
  vec3 body = vec3(1.0, 0.612, 0.238);
  vec3 tail = vec3(0.880, 0.238, 0.086);
  vec3 colour = mix(tail, body, sat(uv.x * 1.3));
  colour = mix(colour, hot, sat(core * 1.1 + head));

  s.albedo = colour;
  s.roughness = 1.0;
  s.metalness = 0.0;
  s.ao = 1.0;
  s.height = 0.5;
  s.alpha = shape;
}
`;

const BLOOD_DECAL = /* glsl */ `
void surface(vec2 uv, inout Surface s) {
  // Splatter decal. Blood dries from the outside in, so the rim is a dark matte
  // crust while the middle stays wet and glossy — that roughness split is what
  // makes a decal look wet rather than painted on.
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  vec2 dir = p / max(r, 1e-4);

  // Main pool: a lobed blob with a ragged, noise-driven border. The border
  // noise is sampled on a circle so it has no seam at the atan wrap.
  float lobes = 0.62 + 0.38 * (fbm2(dir * 1.9, vec2(12.0), 4) * 0.5 + 0.5);
  float ragged = 0.86 + 0.30 * (fbm2(dir * 5.0 + vec2(0.0, r * 3.0), vec2(32.0, 8.0), 4) * 0.5 + 0.5);
  float edge = 0.72 * lobes * ragged;
  float pool = 1.0 - smoothstep(edge - 0.06, edge, r);

  // Cast-off droplets and the fine mist around the impact.
  vec3 drops = worley2(uv * 11.0, vec2(11.0), 1.0);
  float dropSeed = step(0.62, drops.z);
  float dropR = mix(0.06, 0.24, hash11(drops.z + 0.4));
  float droplet = (1.0 - smoothstep(dropR * 0.75, dropR, drops.x)) * dropSeed *
    (1.0 - smoothstep(0.35, 1.02, r));
  vec3 mistCells = worley2(uv * 40.0 + 5.0, vec2(40.0), 1.0);
  float mist = (1.0 - smoothstep(0.0, 0.10, mistCells.x)) * step(0.72, mistCells.z) *
    (1.0 - smoothstep(0.25, 0.95, r));

  // Runs escaping downwards from the pool.
  float run = dripStreaks(uv * vec2(1.0, 0.85) + vec2(0.0, 0.08), 13.0, 0.55, 4.0) *
    (1.0 - smoothstep(0.30, 0.90, r)) * 1.4;

  float mass = sat(pool + droplet * 0.95 + run * 0.9 + mist * 0.7);
  float thick = sat(pool * 1.2 - r * 0.5 + droplet * 0.5);
  float dryRim = sat(1.0 - thick * 1.8) * mass;

  float film = fbm2(uv * 16.0, vec2(16.0), 4) * 0.5 + 0.5;
  float crust = grainNoise(uv, 160.0, 3);
  float serum = band(mass, 0.22, 0.20) * (1.0 - dryRim);

  vec3 WET = vec3(0.238, 0.020, 0.014);
  vec3 DEEP = vec3(0.130, 0.014, 0.014);
  vec3 DRY = vec3(0.176, 0.052, 0.040);
  vec3 OLD = vec3(0.118, 0.058, 0.048);

  vec3 albedo = mix(WET, DEEP, thick * 0.7);
  albedo = mix(albedo, DRY, dryRim * 0.75);
  albedo = mix(albedo, OLD, dryRim * dryRim * 0.6);
  albedo = mix(albedo, albedo * 1.35, serum * 0.35);
  albedo *= 0.90 + 0.18 * film;
  albedo *= 0.96 + 0.08 * crust;

  float rough = mix(0.86, 0.14, sat(thick * 1.5));
  rough += dryRim * 0.20;
  rough += (crust - 0.5) * 0.14 * dryRim;
  rough -= serum * 0.10;

  s.albedo = albedo;
  s.roughness = rough;
  s.metalness = 0.0;
  s.ao = 1.0 - dryRim * 0.15;
  s.height = 0.5 + thick * 0.30 + run * 0.12 + droplet * 0.18 - dryRim * 0.06;
  s.alpha = sat(mass * 1.15) * (1.0 - smoothstep(0.90, 1.0, r));
}
`;

/**
 * Colour uniform in the generators' authoring space.
 *
 * `THREE.Color` cannot be used here: with colour management on it converts a hex
 * literal into the linear working space, whereas the surface shaders author in
 * sRGB and convert once on output.
 */
function srgb(hex: number): THREE.Vector3 {
  return new THREE.Vector3(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  );
}

export const MISC_SPECS: MaterialSpec[] = [
  {
    id: 'glass_clear',
    surface: 'glass',
    body: GLASS_CLEAR,
    res: 'low',
    relief: 0.0012,
    reliefWide: 0.7,
    tileMeters: 1.5,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 0.35,
      envMapIntensity: 1.4,
      transmissionFromAo: true,
      physical: {
        transmission: 1.0,
        thickness: 0.012,
        ior: 1.52,
        specularIntensity: 1.0,
        attenuationColor: 0xf2fbf6,
        attenuationDistance: 4,
      },
    },
  },
  {
    id: 'glass_dirty',
    surface: 'glass',
    body: GLASS_DIRTY,
    res: 'medium',
    relief: 0.0025,
    reliefWide: 0.5,
    tileMeters: 1.5,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 0.6,
      envMapIntensity: 1.2,
      transmissionFromAo: true,
      physical: {
        transmission: 1.0,
        thickness: 0.014,
        ior: 1.52,
        specularIntensity: 1.0,
        attenuationColor: 0xcfd6c4,
        attenuationDistance: 1.2,
      },
    },
  },
  {
    id: 'vehicle_glass',
    surface: 'glass',
    body: VEHICLE_GLASS,
    res: 'low',
    relief: 0.0020,
    reliefWide: 0.5,
    tileMeters: 1.2,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 0.5,
      envMapIntensity: 1.3,
      transmissionFromAo: true,
      physical: {
        transmission: 1.0,
        thickness: 0.02,
        ior: 1.52,
        specularIntensity: 1.0,
        attenuationColor: 0x9fc2ad,
        attenuationDistance: 0.8,
      },
    },
  },
  {
    id: 'fabric_canvas',
    surface: 'fabric',
    body: FABRIC_CANVAS,
    res: 'medium',
    relief: 0.012,
    reliefWide: 0.22,
    tileMeters: 1.6,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.0,
      envMapIntensity: 0.8,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.4, sheenRoughness: 0.85, sheenColor: 0xbfae8c },
    },
  },
  {
    id: 'rubber_tire',
    surface: 'rubber',
    body: RUBBER_TIRE,
    res: 'medium',
    relief: 0.045,
    reliefWide: 0.18,
    tileMeters: 1.6,
    material: { roughness: 1.0, metalness: 0.0, normalScale: 1.15, envMapIntensity: 0.7, aoMapIntensity: 1.0 },
  },
  {
    id: 'paint_yellow',
    surface: 'metal',
    body: INDUSTRIAL_PAINT,
    res: 'low',
    relief: 0.006,
    reliefWide: 0.28,
    tileMeters: 1.4,
    uniforms: {
      uPaint: { value: srgb(0xd8a91c) },
      uPaintDeep: { value: srgb(0xa87c12) },
      uHazard: { value: 1 },
    },
    material: { roughness: 1.0, metalness: 1.0, normalScale: 0.9, envMapIntensity: 1.0, aoMapIntensity: 0.9 },
  },
  {
    id: 'paint_red',
    surface: 'metal',
    body: INDUSTRIAL_PAINT,
    res: 'low',
    relief: 0.006,
    reliefWide: 0.28,
    tileMeters: 1.4,
    uniforms: {
      uPaint: { value: srgb(0x8a3d33) },
      uPaintDeep: { value: srgb(0x57241e) },
      uHazard: { value: 0 },
    },
    material: { roughness: 1.0, metalness: 1.0, normalScale: 0.9, envMapIntensity: 1.0, aoMapIntensity: 0.9 },
  },
  {
    id: 'camo_net',
    surface: 'foliage',
    body: CAMO_NET,
    res: 'medium',
    relief: 0.020,
    reliefWide: 0.20,
    tileMeters: 2.0,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.0,
      envMapIntensity: 0.7,
      aoMapIntensity: 1.0,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
    },
  },
  {
    id: 'vehicle_paint_tan',
    surface: 'metal',
    body: VEHICLE_PAINT,
    res: 'medium',
    relief: 0.007,
    reliefWide: 0.30,
    tileMeters: 2.2,
    uniforms: {
      uBase: { value: srgb(0x9b8663) },
      uShade: { value: srgb(0x6f5f44) },
      uAccent: { value: srgb(0x4c4534) },
      uCamoAmount: { value: 0.25 },
    },
    material: {
      roughness: 1.0,
      metalness: 1.0,
      normalScale: 0.85,
      envMapIntensity: 1.0,
      aoMapIntensity: 0.9,
      physical: { clearcoat: 0.22, clearcoatRoughness: 0.6 },
    },
  },
  {
    id: 'vehicle_paint_green',
    surface: 'metal',
    body: VEHICLE_PAINT,
    res: 'medium',
    relief: 0.007,
    reliefWide: 0.30,
    tileMeters: 2.2,
    uniforms: {
      uBase: { value: srgb(0x4a5137) },
      uShade: { value: srgb(0x333a26) },
      uAccent: { value: srgb(0x2a2c22) },
      uCamoAmount: { value: 0.45 },
    },
    material: {
      roughness: 1.0,
      metalness: 1.0,
      normalScale: 0.85,
      envMapIntensity: 1.0,
      aoMapIntensity: 0.9,
      physical: { clearcoat: 0.22, clearcoatRoughness: 0.6 },
    },
  },
  {
    id: 'crate_military',
    surface: 'wood',
    body: CRATE_MILITARY,
    res: 'medium',
    relief: 0.011,
    reliefWide: 0.26,
    tileMeters: 1.1,
    material: { roughness: 1.0, metalness: 1.0, normalScale: 1.0, envMapIntensity: 0.95, aoMapIntensity: 1.0 },
  },
  {
    id: 'gun_polymer',
    surface: 'rubber',
    body: GUN_POLYMER,
    res: 'high',
    relief: 0.0035,
    reliefWide: 0.14,
    tileMeters: 0.3,
    eager: true,
    uniforms: { uTan: { value: 0.12 } },
    material: { roughness: 1.0, metalness: 0.0, normalScale: 0.9, envMapIntensity: 1.05, aoMapIntensity: 0.9 },
  },
  {
    id: 'gear_nylon',
    surface: 'fabric',
    body: GEAR_NYLON,
    res: 'medium',
    relief: 0.010,
    reliefWide: 0.20,
    tileMeters: 0.9,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.05,
      envMapIntensity: 0.75,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.3, sheenRoughness: 0.8, sheenColor: 0x7d7461 },
    },
  },
  {
    id: 'skin',
    surface: 'flesh',
    body: SKIN,
    // Seen at arm's length on first-person hands, so it carries a hero material's
    // texel density despite covering very little of the frame.
    res: 'high',
    relief: 0.006,
    reliefWide: 0.24,
    tileMeters: 0.6,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.0,
      envMapIntensity: 0.85,
      aoMapIntensity: 0.8,
      physical: { sheen: 0.18, sheenRoughness: 0.5, sheenColor: 0xffd3bc, specularIntensity: 0.7 },
    },
  },
  {
    id: 'uniform_desert',
    surface: 'fabric',
    body: UNIFORM,
    res: 'medium',
    relief: 0.008,
    reliefWide: 0.22,
    tileMeters: 1.0,
    uniforms: {
      uC0: { value: srgb(0xb5a684) },
      uC1: { value: srgb(0x8e7d5c) },
      uC2: { value: srgb(0x6b5f47) },
      uC3: { value: srgb(0x9c9375) },
      uCamoScale: { value: 5 },
      uDustAmount: { value: 1 },
    },
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.0,
      envMapIntensity: 0.8,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.28, sheenRoughness: 0.8, sheenColor: 0xbdb094 },
    },
  },
  {
    id: 'uniform_woodland',
    surface: 'fabric',
    body: UNIFORM,
    res: 'medium',
    relief: 0.008,
    reliefWide: 0.22,
    tileMeters: 1.0,
    uniforms: {
      uC0: { value: srgb(0x5c6144) },
      uC1: { value: srgb(0x3b4430) },
      uC2: { value: srgb(0x2a2b22) },
      uC3: { value: srgb(0x77704c) },
      uCamoScale: { value: 4 },
      uDustAmount: { value: 0.6 },
    },
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.0,
      envMapIntensity: 0.8,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.28, sheenRoughness: 0.8, sheenColor: 0x87866a },
    },
  },
  {
    id: 'kevlar',
    surface: 'fabric',
    body: KEVLAR,
    res: 'medium',
    relief: 0.010,
    reliefWide: 0.20,
    tileMeters: 0.8,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 1.05,
      envMapIntensity: 0.9,
      aoMapIntensity: 1.0,
      physical: { sheen: 0.45, sheenRoughness: 0.45, sheenColor: 0xd2b878 },
    },
  },
  {
    id: 'muzzle_flash',
    surface: 'flesh',
    body: MUZZLE_FLASH,
    res: 'low',
    relief: 0.0,
    tileMeters: 1,
    clamp: true,
    maps: { albedo: true, orm: false, normal: false },
    material: {
      color: 0xffffff,
      emissive: 0xffffff,
      // High enough that the core clips to white the way an overexposed flash
      // does, low enough that the propellant lobes keep their orange.
      emissiveIntensity: 4.5,
      emissiveFromAlbedo: true,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
      envMapIntensity: 0,
    },
  },
  {
    id: 'tracer',
    surface: 'flesh',
    body: TRACER,
    res: 'low',
    relief: 0.0,
    tileMeters: 1,
    clamp: true,
    maps: { albedo: true, orm: false, normal: false },
    material: {
      color: 0xffffff,
      emissive: 0xffffff,
      // Above about 3 the whole streak clips to white and stops reading as a
      // tracer; this keeps a white-hot core inside a distinctly orange body.
      emissiveIntensity: 2.2,
      emissiveFromAlbedo: true,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
      envMapIntensity: 0,
    },
  },
  {
    id: 'blood_decal',
    surface: 'flesh',
    body: BLOOD_DECAL,
    res: 'low',
    relief: 0.004,
    reliefWide: 0.3,
    tileMeters: 0.5,
    clamp: true,
    material: {
      roughness: 1.0,
      metalness: 0.0,
      normalScale: 0.8,
      envMapIntensity: 1.0,
      aoMapIntensity: 0.5,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      side: THREE.DoubleSide,
    },
  },
];
