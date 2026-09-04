import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  cached,
  clamp,
  fbm,
  heightField,
  mixRgb,
  mulberry32,
  normalFromHeight,
  pixelTexture,
  ridged,
  smoothstep,
  worley,
} from './core.js';

/**
 * sRGB bytes from a hex literal.
 *
 * Not core's hexToRgb: that goes through THREE.Color, which with colour
 * management on converts the hex into the *linear* working space. Writing
 * those bytes into a texture flagged `srgb: true` makes the GPU decode them a
 * second time, so every colour lands about five times too dark. That is what
 * had the whole ground reading as a black plane.
 */
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

// ---------------------------------------------------------------------------
// Terrain surfaces: packed dirt track, loose material on the verge, forest
// litter, plus the road-space tyre imprint and the macro variation that keeps
// the world-space tiling from repeating.
//
// Everything is packed two-to-a-texture: albedo RGB + roughness A, and
// normal RGB + AO A. The terrain blends three surface sets in one pass, so
// halving the fetch count matters more than the extra bit of code.
// ---------------------------------------------------------------------------

const N = 512;
const M = 384;

// East-African laterite, keyed off the palette's ground range and never above
// it. The old Pacific-Northwest set sat here at a red/blue ratio of about 1.7
// and was desaturated at source to keep the warm key from pushing it into
// terracotta; this set *is* terracotta. Murram is iron oxide, it measures a
// red/blue ratio of 2.2 to 2.8 in the field, and the one thing that has to
// come out of every ground framing now is that this dirt is red.
//
// The value discipline stands, and matters more, not less: red earth in
// equatorial sun is a *dark* surface with a pale dust skin on it, and an albedo
// near 0.5 linear is already at the top of the ACES shoulder. So the base dirt
// stays mid-dark and the khaki is a dust film and a straw layer, never the
// earth itself.
//
// Value order, darkest first, so the histogram is easy to keep honest:
//   wet 0.012 · damp 0.028 · dirtDark 0.045 · dirt 0.085 · dirtLight 0.14
//   dustLight 0.24 · dustPale 0.36   (linear luminance)
// Anything at dustPale is a rare dry crown patch, not the base value.
const EARTH = {
  dustPale: 0xc9a97c,
  dustLight: 0xb08a5c,
  dirtLight: 0x9f6a40,
  dirt: 0x8b5230, // laterite: iron-red earth, the base value of the trail
  dirtDark: 0x62391f,
  // The damp end stays red. Wet forest loam went olive because of the organics
  // in it; a laterite soil has almost none, so soaked murram is the same iron
  // red two stops down, which is the colour of the mud round a water hole.
  damp: 0x4c2c1a,
  wet: 0x2f1c14, // the polished floor of a rut
  clay: 0xa8482a, // the bright oxide streaks where the subsoil shows
  // Aggregate. Savanna stone is quartzite and weathered granite, so it is
  // *paler* and greyer than the matrix rather than darker — the opposite of the
  // forest's coated basalt. Still keyed under the dust film, because a field of
  // pale speckle over red earth reads as salt.
  stone: 0xb0a48f,
  stoneMid: 0x857868,
  stoneDark: 0x5a4e40,
  stoneWet: 0x3a3028,
  // Grassland soil between the roads. The hue separation from the trail is the
  // *straw*, not the earth: the earth is the same laterite showing through,
  // and the pale dry grass litter lying on it is what makes the open ground read
  // as a different surface from the bare wheel tracks.
  litter: 0x7a4a2c, // bare earth between the tufts
  litterDark: 0x4a2c19,
  leafDry: 0xb59f62,
  twig: 0x5a4530,
  chip: 0x3b2c20, // bark chip / seed pod pressed into the dirt
  moss: 0x6f7038, // the only green left: the base of a tuft that found water
  grassDry: 0xb59f62,
  grass: 0x7c8140, // grey-green, end of the dry season
  // Straw and litter, by material. Dry grass is four things: this season's
  // stems still standing in colour, last season's bleached to near-white,
  // trampled straw gone grey, and the dark rot at the base of the tuft.
  strawPale: 0xd6c48e,
  straw: 0xb59f62,
  strawGrey: 0x8d8060,
  strawDark: 0x6a5836,
  tuftBase: 0x3a2a1c,
  humus: 0x2a1c12, // the black of a burned patch or a dung pat
  ash: 0x7a6f62, // grey ash where a fire went through
  termite: 0xa2603a, // worked subsoil, brighter and oranger than the topsoil
  dung: 0x3d2d1e,
  barkFlake: 0x4a3222,
};

/**
 * Uniform 0-1 pushed toward zero. Aggregate value is the one histogram that
 * has to be dark-dominant: with k = 2.4 about seventy per cent of the stones
 * land in the bottom half of the range and six per cent get near the top.
 */
const skewDark = (t, k = 2.4) => t ** k;

/**
 * Pull an sRGB triple toward its own luminance.
 *
 * Under the forest this ran at 0.3 to 0.4 on every earth tone, because the
 * warm key and the grade were pushing loam into laterite. Laterite is now the
 * brief, so the pull is a tenth or so: enough to keep the oxide from reading
 * as paint, not enough to take the red out of it.
 */
const desat = (c, t) => {
  const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  return mixRgb(c, [l, l, l], t);
};

/** Palette hex to lightly desaturated sRGB bytes. */
const earth = (hex, t = 0.12) => desat(rgb(hex), t);

const srgbToLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** Mean linear luminance of an 8-bit sRGB triple accumulator. */
function meanTracker() {
  let sum = 0;
  let n = 0;
  return {
    add(c) {
      sum +=
        srgbToLinear(c[0] / 255) * 0.2126 + srgbToLinear(c[1] / 255) * 0.7152 + srgbToLinear(c[2] / 255) * 0.0722;
      n++;
    },
    get value() {
      return n ? sum / n : 0.15;
    },
  };
}

// The ground is seen at grazing incidence in every close framing, which is the
// worst case for trilinear filtering: the minifying axis picks the mip and the
// magnifying one gets blurred with it. Sixteen taps is what it costs to keep
// aggregate visible two metres in front of the camera.
const ANISO = 16;

/** Normal map from a height field with an AO term packed into alpha. */
function normalAoTexture(hf, w, h, strength, ao) {
  const at = (x, y) => hf[(((y % h) + h) % h) * w + (((x % w) + w) % w)];
  return pixelTexture(
    w,
    h,
    (x, y, out) => {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      out[0] = ((-dx / len) * 0.5 + 0.5) * 255;
      out[1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out[2] = (1 / len) * 0.5 * 255 + 127.5;
      out[3] = clamp(ao(x, y)) * 255;
    },
    { repeat: 1, aniso: ANISO },
  );
}

// ---------------------------------------------------------------------------
// Packed dirt of the driving lane. Aggregate, embedded stones, dried clay
// cracked into plates, damp blotches where the ruts hold water.
// ---------------------------------------------------------------------------

/** Per-texel white noise. Cheaper than an fbm octave and it never blurs. */
function tex1(x, y, seed) {
  let h = Math.imul(x + 1, 668265263) ^ Math.imul(y + 1, 374761393) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function trackFields(seed) {
  const n = N * N;
  const height = new Float32Array(n);
  const stone = new Float32Array(n); // exposed stone, big enough to catch light
  const stoneId = new Float32Array(n);
  const rim = new Float32Array(n); // dirt banked against the side of a stone
  const grit = new Float32Array(n);
  const gritId = new Float32Array(n);
  const chip = new Float32Array(n); // bark / needle debris trodden into the dirt
  const crack = new Float32Array(n);
  const damp = new Float32Array(n);
  const clayMask = new Float32Array(n);
  const dust = new Float32Array(n);
  const clod = new Float32Array(n);
  // One tile covers 2.6 m of ground at 512 px, so 5 mm per texel. Worley's f1
  // comes back in cell units and averages about 0.35, so a stone radius is a
  // threshold in that range — thresholds down at 0.02 produce a bare handful
  // of texels and the surface reads as an airbrushed cloud.
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const u = x / N;
      const v = y / N;
      const big = worley(u * 8, v * 8, 8, seed + 5); // 32 cm cells -> 8 cm stones
      const mid = worley(u * 22, v * 22, 22, seed + 17); // 12 cm -> 3 cm stones
      const fine = worley(u * 58, v * 58, 58, seed); // 4.5 cm -> 1.2 cm grit
      // Warp the clay cells before sampling. An unwarped Voronoi net at this
      // frequency reads as a honeycomb tiled over the whole road, which is
      // exactly what it looked like on screen. The warp is itself tileable, so
      // the texture still wraps.
      const wx = fbm(u * 6 + 2, v * 6 + 5, { octaves: 3, period: 6, seed: seed + 63 }) - 0.5;
      const wy = fbm(u * 6 + 8, v * 6 + 1, { octaves: 3, period: 6, seed: seed + 64 }) - 0.5;
      const c = worley(u * 13 + wx * 3.2, v * 13 + wy * 3.2, 13, seed + 11); // 20 cm clay plates
      const clods = smoothstep(0.3, 0.7, fbm(u * 14, v * 14, { octaves: 3, period: 14, seed: seed + 2 }));
      const sand = tex1(x, y, seed + 71) * 0.6 + tex1(x >> 1, y >> 1, seed + 72) * 0.4;
      clod[i] = clods;

      // A stone has an edge. Radius varies per cell and the falloff is a few
      // texels wide, so they read as pebbles pressed into the dirt rather than
      // as airbrushed dots — and only some cells carry one.
      // outlines lumped by noise at the scale of the stone itself: a Voronoi
      // radius on its own gives a field of perfect circles
      const lumpB = fbm(u * 40, v * 40, { octaves: 2, period: 40, seed: seed + 63 }) - 0.5;
      const lumpM = fbm(u * 104, v * 104, { octaves: 2, period: 104, seed: seed + 64 }) - 0.5;
      const rBig = 0.13 + ((big.id * 41.3) % 1) * 0.17 + lumpB * 0.14;
      const rMid = 0.12 + ((mid.id * 29.7) % 1) * 0.14 + lumpM * 0.1;
      const sBig = smoothstep(rBig, rBig - 0.05, big.f1) * smoothstep(0.6, 0.68, big.id);
      const sMid = smoothstep(rMid, rMid - 0.05, mid.f1) * smoothstep(0.47, 0.57, mid.id);
      stone[i] = clamp(Math.max(sBig, sMid * 0.9));
      stoneId[i] = sBig > sMid * 0.9 ? big.id : mid.id;
      rim[i] = clamp(smoothstep(rBig + 0.12, rBig, big.f1) - sBig) * smoothstep(0.6, 0.68, big.id);
      grit[i] = smoothstep(0.28, 0.15, fine.f1) * (0.45 + fine.id * 0.55);
      gritId[i] = fine.id;

      // Organic debris: bark flakes, needle clumps and leaf fragments trodden
      // flat into the surface. Thin slivers, always darker than the dirt, and
      // clumped so they read as blown-in litter rather than as noise.
      const flake = ridged(u * 78 + v * 21, v * 43, { octaves: 2, period: 78, seed: seed + 45 });
      const flakePatch = smoothstep(0.4, 0.85, fbm(u * 7 + 3, v * 7 + 6, { octaves: 3, period: 7, seed: seed + 46 }));
      chip[i] = smoothstep(0.74, 0.96, flake) * flakePatch;

      // A damp road barely cracks: what is left of the dried-clay net is a few
      // hairlines in the driest patches. It has to be two or three texels wide
      // to survive the first mip.
      //
      // Worley cell boundaries close on themselves, so this field is a net of
      // curved loops — and at 30 cm from the camera the 2.6 m tile is magnified
      // eightfold, which turns each loop into a ring a hundred pixels across.
      // Every close framing read as rubber stamped into lino because of it, and
      // for two rounds the tyre imprint took the blame. Narrower, rarer and much
      // shallower: this is a damp road, it should show hairlines and nothing more.
      // Dry season: the clay does crack here, into plates a hand across, and
      // the net is what says "baked" rather than "damp". Still hairline in
      // width — the close framings magnify this tile eightfold and a wide crack
      // net at that scale is the rubber-stamped-lino read all over again.
      const crackPatch = smoothstep(0.5, 0.86, fbm(u * 4 + 9, v * 4 + 2, { octaves: 3, period: 4, seed: seed + 41 }));
      crack[i] = smoothstep(0.036, 0.007, c.f2 - c.f1) * crackPatch * (0.5 + c.id * 0.5);
      // Damp is the accent now, not the base: a fifth of the tile at most, and
      // only where the shader's wetness field puts a hollow.
      damp[i] = smoothstep(0.6, 0.9, fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: seed + 12 }));
      clayMask[i] = smoothstep(0.44, 0.8, fbm(u * 3, v * 3, { octaves: 3, period: 3, seed: seed + 30 }));
      // Powdered fines lie over most of a dry-season track; the *absence* of
      // dust is what marks the travelled way.
      dust[i] = smoothstep(0.42, 0.8, fbm(u * 6 + 4, v * 6 + 7, { octaves: 3, period: 6, seed: seed + 55 }));
      height[i] = clamp(
        0.12 +
          clods * 0.44 +
          (sand - 0.5) * 0.1 +
          grit[i] * 0.2 +
          stone[i] * 0.5 +
          rim[i] * 0.1 -
          crack[i] * 0.18 +
          chip[i] * 0.1 +
          dust[i] * 0.04,
      );
    }
  }
  return { height, stone, stoneId, rim, grit, gritId, chip, crack, damp, clayMask, dust, clod };
}

/**
 * Aggregate colour for a stone or grit particle. `id` is the Voronoi cell id,
 * `wetBias` pushes the whole distribution toward the soaked end.
 */
function aggregateColour(id, wetBias, cols) {
  const sv = skewDark((id * 7.919) % 1) * (1 - wetBias * 0.55);
  let c;
  if (sv < 0.45) c = mixRgb(cols.wet, cols.dark, sv / 0.45);
  else if (sv < 0.86) c = mixRgb(cols.dark, cols.mid, (sv - 0.45) / 0.41);
  else c = mixRgb(cols.mid, cols.pale, (sv - 0.86) / 0.14);
  // a fifth of them are ironstone rather than grey rock
  const iron = ((id * 23.7) % 1) > 0.8 ? 0.4 : 0;
  return mixRgb(c, cols.clay, iron * (0.25 + sv * 0.3));
}

/** Compacted dirt/clay of the driving lane. */
export function trackMaps(seed = 17) {
  return cached('gnd.track.' + seed, () => {
    const f = trackFields(seed);
    const hf = f.height;
    const pale = earth(EARTH.dustPale, 0.2);
    const dustLight = earth(EARTH.dustLight, 0.18);
    const light = earth(EARTH.dirtLight, 0.12);
    const mid = earth(EARTH.dirt, 0.1);
    const dark = earth(EARTH.dirtDark, 0.1);
    const damp = earth(EARTH.damp, 0.1);
    const wet = earth(EARTH.wet, 0.1);
    const clay = earth(EARTH.clay, 0.12);
    const chip = rgb(EARTH.chip);
    const twig = rgb(EARTH.twig);
    const agg = {
      wet: earth(EARTH.stoneWet, 0.3),
      dark: earth(EARTH.stoneDark, 0.3),
      mid: earth(EARTH.stoneMid, 0.3),
      pale: earth(EARTH.stone, 0.3),
      clay,
    };
    const mean = meanTracker();
    const map = pixelTexture(
      N,
      N,
      (x, y, out) => {
        const i = y * N + x;
        const u = x / N;
        const v = y / N;
        const h = hf[i];
        const dampness = f.damp[i];
        // Compaction, not height, drives the base value: ramping colour off
        // the height field alone paints every stone and every crack twice and
        // the low frequencies of it read as airbrushed cloud.
        let c = mixRgb(dark, mid, smoothstep(0.04, 0.5, f.clod[i]));
        c = mixRgb(c, light, smoothstep(0.4, 0.9, f.clod[i]) * 0.9);
        // The oxide streaks. Laterite is red because of these, so they carry
        // more of the tile than the forest's clay did — but still as patches,
        // because uniform saturation reads as a painted plane.
        c = mixRgb(c, clay, f.clayMask[i] * 0.42);
        // Damp as an accent: the hollows that still hold a little moisture, a
        // stop and a half down and no less red.
        c = mixRgb(c, damp, dampness * 0.5);
        c = mixRgb(c, wet, smoothstep(0.78, 1.0, dampness) * 0.4);
        // Grain in the albedo, not only in the normal map. Most of this surface
        // is in shade in most shots, and a normal map does nothing under flat
        // ambient light — the detail has to be in the colour to survive.
        const grain = fbm(u * 72, v * 72, { octaves: 3, period: 72, seed: seed + 88 });
        const sparkle = tex1(x, y, seed + 90);
        // The dust skin. Khaki over red: it is what the sun bleaches the top
        // millimetre to, it lies where nothing has disturbed it, and it is the
        // whole reason a laterite track is two colours rather than one.
        c = mixRgb(c, pale, f.dust[i] * (1 - dampness) * (0.28 + grain * 0.4));
        c = mixRgb(c, dustLight, f.dust[i] * (1 - dampness) * 0.34);
        c = mixRgb(c, aggregateColour(f.stoneId[i], dampness, agg), f.stone[i] * 0.72);
        c = mixRgb(c, aggregateColour(f.gritId[i] + 0.31, dampness * 0.6, agg), f.grit[i] * 0.5);
        // dirt banked up against the stone, and the shadow line where it meets
        c = mixRgb(c, mixRgb(light, dark, 0.55), f.rim[i] * 0.4);
        c = mixRgb(c, mixRgb(chip, twig, tex1(x >> 2, y >> 2, seed + 91)), f.chip[i] * 0.78);
        // A hairline, not a groove: at 0.9 toward the darkest pair in the range
        // every crack texel came out near black.
        c = mixRgb(c, mixRgb(damp, wet, 0.5), f.crack[i] * 0.5);
        // texel-level grain. Averages away in the mips, so it costs nothing at
        // distance and is the only thing with detail underfoot. Biased down —
        // a symmetric white noise on top of aggregate reads as sparkle.
        const g = (0.9 + grain * 0.16) * (0.86 + skewDark(sparkle, 0.75) * 0.2);
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        // roughness in alpha: damp fines and polished stone crowns are the only
        // things on a dirt road that are not fully rough
        //
        // Floored at 0.34 rather than at zero. The four terms are independent, so
        // a damp polished stone crown in a rut stacked all of them and came out
        // at a mirror finish — which nothing does under a daylight key and which
        // the night pass found immediately: a low moon on a surface with 0.0
        // roughness texels scattered through it is a field of hard bright specks.
        // Wet earth with fines still in it is a broad sheen, not a mirror.
        out[3] =
          Math.max(0.34, clamp(0.99 - dampness * 0.46 - smoothstep(0.7, 1.0, dampness) * 0.2 - f.stone[i] * 0.3 - h * 0.05)) *
          255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, N, N, 6.4, (x, y) => {
      const i = y * N + x;
      // stones occlude the dirt they sit in, cracks occlude themselves
      return 0.6 + hf[i] * 0.44 - f.crack[i] * 0.22 - f.rim[i] * 0.26 - f.chip[i] * 0.18;
    });
    return { map, normal, height: hf, mean: mean.value };
  });
}

// ---------------------------------------------------------------------------
// The mainline's surface: crushed rock, not dirt.
//
// The single thing that has to come out of this tile is that it is a *different
// substance* from the trail, and the difference is not colour. Compacted earth
// is a matrix of fines with the odd stone pressed into it — one material, with
// inclusions. Pit-run aggregate is the opposite: it is stone all the way down,
// packed shoulder to shoulder, with only enough rock dust between the pieces to
// bind them. So the trail's tile is built matrix-first and this one is built
// particle-first, and that shows at every distance including the ones where
// both have mipped down to their means.
//
// Three consequences worth stating, because each of them was arrived at by
// getting it wrong first:
//
//   Angular, not rounded. Crushed rock is a polyhedron with sharp arrises and
//   a couple of flat faces; river gravel is an ellipsoid. Dropping the trail's
//   dome-shaped stones in here at four times the density produced a bag of
//   marbles, which reads as decorative aggregate on a driveway.
//
//   Cool. The trail measures a red/blue ratio near 1.7 and quarried rock runs
//   about 1.2. That is the whole hue separation between the two roads, and it
//   is what lets the junction read as two surfaces meeting rather than as one
//   surface with a mask across it.
//
//   Matte. Broken rock has no polish on it — the sheen on a gravel road comes
//   from the fines in the wheel path, which the shader puts there, not from
//   the aggregate. Roughness stays high across the whole tile so the night
//   pass has nothing to catch.
// ---------------------------------------------------------------------------

/** Metres of ground one gravel tile covers. 3.7 mm a texel at 512. */
export const GRAVEL_TILE = 1.9;

/**
 * Cellular noise with the offset to the winning site kept.
 *
 * `worley` in core returns distances and an id, which is enough for a field of
 * round blobs and not enough for a field of angular ones: a crushed stone has a
 * flat face at some arbitrary attitude, and to tilt one you need to know where
 * you are *inside* the cell, not just how far from the middle of it.
 */
function crushed(x, y, period, seed) {
  const p = Math.max(1, period | 0);
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  let ox = 0;
  let oy = 0;
  for (let cy = yi - 1; cy <= yi + 1; cy++) {
    for (let cx = xi - 1; cx <= xi + 1; cx++) {
      const wx = ((cx % p) + p) % p;
      const wy = ((cy % p) + p) % p;
      const px = cx + tex1(wx, wy, seed);
      const py = cy + tex1(wx, wy, seed + 7919);
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = tex1(wx, wy, seed + 104729);
        ox = dx;
        oy = dy;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return { f1, f2, id, ox, oy };
}

/**
 * Graded crushed aggregate: the running surface of the mainline.
 *
 * Two size classes packed into each other — a 4 cm surface course over a 1.5 cm
 * chip and dust matrix — because a single-size aggregate reads as gravel poured
 * out of a bag. Real pit run is graded, meaning the small stuff fills the voids
 * between the big stuff, and the visual signature of that is a surface with no
 * gaps in it and two clearly different particle sizes.
 */
export function gravelMaps(seed = 53) {
  return cached('gnd.gravel.' + seed, () => {
    const n = N * N;
    const hf = new Float32Array(n);
    const rock = new Float32Array(n); // coarse aggregate coverage
    const rockId = new Float32Array(n);
    const facet = new Float32Array(n); // which way this piece's top face leans
    const chip = new Float32Array(n); // the 1.5 cm fraction
    const chipId = new Float32Array(n);
    const dust = new Float32Array(n); // rock flour packed into the voids
    const damp = new Float32Array(n);
    const arris = new Float32Array(n); // the bright broken edge of a piece
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const u = x / N;
        const v = y / N;
        // 4.2 cm cells: 40 mm minus, which is what a forest road surface course
        // actually is. Warped, or the Voronoi net reads as a tiled honeycomb —
        // the same failure the trail's dried-clay plates had.
        const wx = fbm(u * 9 + 1, v * 9 + 4, { octaves: 2, period: 9, seed: seed + 71 }) - 0.5;
        const wy = fbm(u * 9 + 6, v * 9 + 2, { octaves: 2, period: 9, seed: seed + 72 }) - 0.5;
        const big = crushed(u * 45 + wx * 1.4, v * 45 + wy * 1.4, 45, seed);
        const sml = crushed(u * 116 + wx * 2.2, v * 116 + wy * 2.2, 116, seed + 31);

        // A piece fills its cell out to the boundary it shares with the next
        // one, so the outline is a polygon and the gap between two pieces is a
        // crack rather than a bed of sand. This is the whole angularity of the
        // surface and it is why the cell *boundary* drives the mask instead of
        // a radius: a radius gives circles however hard it is jittered.
        const gap = big.f2 - big.f1;
        // Two thirds of cells hold a coarse piece, and the ones that do only
        // fill part of their cell. Both numbers were arrived at from the same
        // failure: at four fifths coverage with every piece filling its cell out
        // to the shared boundary, the surface came back as a *pavement* — a
        // continuous field of same-sized polygons with mortar lines between
        // them, which is cobbles, not pit run. Graded aggregate has a size
        // distribution, so the piece has to be allowed to be much smaller than
        // the cell it was seeded in.
        const holds = smoothstep(0.16, 0.42, big.id);
        const fill = 0.2 + ((big.id * 31.7) % 1) ** 1.5 * 0.34;
        rock[i] =
          smoothstep(0.02, 0.075, gap) * holds * smoothstep(fill + 0.06, fill - 0.02, big.f1);
        rockId[i] = big.id;
        // Broken rock has two or three flat faces meeting at an arris, so the
        // top of a piece is a tilted plane and its neighbour's tilts a
        // different way. The step in shading where two of them meet is the
        // single strongest "crushed" cue there is.
        const ang = big.id * 6.283;
        facet[i] = (big.ox * Math.cos(ang) + big.oy * Math.sin(ang)) * (0.5 + big.id * 0.9);
        // The arris itself: the last two texels before the boundary, where the
        // face turns over. Rock breaks light-coloured on a fresh edge even when
        // the weathered face is dark.
        arris[i] = smoothstep(0.075, 0.03, gap) * smoothstep(0.02, 0.05, gap) * holds;

        const cgap = sml.f2 - sml.f1;
        const cfill = 0.24 + ((sml.id * 19.3) % 1) * 0.3;
        chip[i] = smoothstep(0.03, 0.1, cgap) * smoothstep(0.1, 0.32, sml.id) * smoothstep(cfill + 0.08, cfill, sml.f1);
        chipId[i] = sml.id;
        // Rock flour: what the grader and the traffic have ground off the
        // aggregate. It packs into the voids, so it is keyed off the *absence*
        // of a coarse piece rather than scattered independently.
        dust[i] =
          clamp(1 - rock[i] * 1.15) * smoothstep(0.25, 0.72, fbm(u * 7, v * 7, { octaves: 3, period: 7, seed: seed + 12 }));
        // Damp patches, at a much larger scale than the trail's and with far
        // less of the tile in them. Gravel drains: it is damp in the shade and
        // under the trees and dry everywhere else, where compacted earth holds
        // water across its whole surface.
        damp[i] = smoothstep(0.42, 0.86, fbm(u * 4 + 8, v * 4 + 3, { octaves: 3, period: 4, seed: seed + 25 }));

        // Bedded, not tipped. This is a *compacted* surface: a grader laid it,
        // loaded axles pressed it, and the fines were washed into the voids
        // between the pieces by the first rain after. What shows is the top
        // third of each piece standing in a matrix that comes most of the way
        // up it — so the relief is a shallow cobbled-together plane with sharp
        // little steps in it, not a layer of loose stone sitting on a floor.
        //
        // The facet tilt is the term that had to come down furthest, from 0.55
        // to 0.19, and it is worth saying why because it looked right in
        // isolation. It gives every piece a flat top at its own random angle,
        // which is exactly what broken rock has — but a whole tile of them,
        // each one uniformly shaded by a single directional key, is a field of
        // alternating light and dark blobs at the size of the pieces. Rendered
        // at a metre that is a cobbled pavement, which is what every low
        // framing came back as: the aggregate was the right size, the right
        // colour and the right shape, and still read as setts, because the
        // strongest thing in the frame was thirty flat faces catching the sun
        // at thirty different angles. Broken rock at arm's length is told apart
        // by its *edges*, so the step at the boundary keeps its full amplitude
        // and the tilt inside the piece is now a sixth of it.
        hf[i] = clamp(
          0.34 +
            rock[i] * 0.26 +
            facet[i] * rock[i] * 0.19 +
            chip[i] * (1 - rock[i] * 0.7) * 0.1 +
            dust[i] * 0.05 +
            (tex1(x, y, seed + 90) - 0.5) * 0.045 -
            smoothstep(0.05, 0.0, gap) * 0.1,
        );
      }
    }

    // Mineral families rather than one value ramp. A quarry works one face, so
    // the aggregate on a road is mostly one rock with a minority of whatever
    // else was in the seam — dark basalt, weathered granite, and enough iron
    // staining to keep it from reading as concrete.
    // Keyed off the damp end of the range, not the dry one. PALETTE.gravel is
    // what a sunlit crown looks like, so it is the *pale* accent here rather
    // than the base: at 2.7 times the trail's albedo the mainline came back as
    // a white ribbon through the forest, which is the exact failure the trail
    // was taken down two stops to fix.
    //
    // And deliberately cool at source, by more than the finished surface should
    // look. The mainline is the one part of this world with an open sky over it
    // — the forest clears twenty-odd metres for it — so unlike the trail it is
    // lit by the full warm key rather than by canopy bounce, and it picks up
    // about 0.4 of red/blue ratio on the way through the key, the warm indirect
    // term and the grade. Measured: a tile at 1.10 rendered at 1.76, which is
    // the trail's own hue, and the second road came back as the first one in a
    // wider format. Authored at 0.95 it renders near 1.3, which is where
    // quarried rock actually sits.
    // Murram. A graded park road in East Africa is surfaced with laterite
    // gravel out of a borrow pit: ironstone nodules in a matrix of their own
    // dust, buff to brick, with quartz pebbles through it. The hue separation
    // from the trail is now *saturation and value* rather than direction — the
    // trail is deep oxide red, this is the same iron washed out to khaki-buff
    // with grey stone in it — so the murram is authored a little cooler and a
    // good deal paler than it will read, for the reason the basalt was: the key
    // adds about 0.4 of red/blue on the way through.
    const basalt = desat(rgb(0x5a4d40), 0.12);
    const basaltPale = desat(rgb(0x7a6b5a), 0.12);
    const granite = desat(rgb(0x8c8172), 0.1);
    const granitePale = desat(rgb(0xb0a690), 0.1);
    // Ironstone nodules, the murram's own rock: the warm fraction is a third of
    // the pieces here rather than a minority accent.
    const iron = desat(rgb(0x8a5636), 0.1);
    const fines = desat(rgb(0x8a7458), 0.1);
    // Rock flour is the colour of the rock it came off, and here the rock is
    // laterite, so the fines are khaki.
    const finesPale = desat(rgb(0xb59d78), 0.1);
    const finesDamp = desat(rgb(0x5a4638), 0.1);
    const wetRock = desat(rgb(0x3a2e26), 0.1);

    /** Colour of one aggregate particle from its cell id. */
    const mineral = (id, wetBias) => {
      const v = skewDark((id * 5.437) % 1, 1.7);
      const kind = (id * 17.31) % 1;
      let c;
      if (kind > 0.8) c = mixRgb(granite, granitePale, v);
      else if (kind > 0.46) c = mixRgb(iron, basaltPale, v * 0.7);
      else c = mixRgb(basalt, basaltPale, v);
      return mixRgb(c, wetRock, wetBias * 0.45);
    };

    const mean = meanTracker();
    const map = pixelTexture(
      N,
      N,
      (x, y, out) => {
        const i = y * N + x;
        const u = x / N;
        const v = y / N;
        const wetness = damp[i];
        // Matrix first, then the particles on top of it — but the matrix here
        // is rock dust rather than soil, so it is the same hue as the stone and
        // only lighter. A gravel road is one mineral at several values.
        let c = mixRgb(fines, finesPale, dust[i] * (1 - wetness) * 0.8);
        c = mixRgb(c, finesDamp, wetness * 0.5);
        c = mixRgb(c, mineral(chipId[i] + 0.17, wetness * 0.7), chip[i] * (1 - rock[i] * 0.65) * 0.8);
        c = mixRgb(c, mineral(rockId[i], wetness), rock[i] * 0.92);
        // The fresh edge. Held to a narrow band and a modest lift — this is the
        // term that reads as "sharp" at two metres and as white speckle at
        // twenty if it is given any more than that.
        c = mixRgb(c, granitePale, arris[i] * 0.3);
        // Dust settling on the shoulders of the pieces, so the aggregate is
        // coated rather than washed clean. Without it the surface reads as a
        // gravel *pile*, freshly tipped, instead of a road that has been driven.
        const coat = smoothstep(0.3, 0.75, fbm(u * 26, v * 26, { octaves: 2, period: 26, seed: seed + 44 }));
        c = mixRgb(c, fines, coat * (1 - wetness) * 0.26);
        const g = 0.9 + tex1(x, y, seed + 61) * 0.2;
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        // Uniformly rough, and deliberately so. Crushed rock is matte on every
        // face; the only sheen a gravel road has is the polished fines in the
        // wheel path, and that is placed in road space by the shader because it
        // belongs to the road and not to the tile. Giving the tile a specular
        // response here is what puts a field of hard bright specks under the
        // headlamps at night.
        out[3] = clamp(0.99 - wetness * 0.16 - rock[i] * 0.05) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    // 6.8 against the trail's 6.4. Close, and it should be: the two surfaces
    // have relief at a similar depth once the mainline's pieces are bedded
    // rather than tipped, and what separates them is the *shape* of it —
    // 4 cm polygons with a step at every boundary against 1 cm grit pressed
    // into clay.
    const normal = normalAoTexture(hf, N, N, 6.8, (x, y) => {
      const i = y * N + x;
      // The voids between the pieces occlude, and that is all this does. The
      // first version ran 0.51 in the matrix to 1.02 on a piece, which is not
      // an occlusion term at all — it is a mask that *brightens* the aggregate,
      // and since it lands on the albedo and on the ambient both, every piece
      // came out as a white pebble lying on a dark floor. That is the failure
      // the trail's near field was taken apart to fix two rounds ago, rebuilt
      // from scratch on the other road. Centred high and narrow: the top of a
      // piece is open to the whole sky, the crack beside it sees a fifth of it.
      return 0.62 + hf[i] * 0.44 - (1 - rock[i]) * 0.05 + arris[i] * 0.05;
    });
    return { map, normal, height: hf, mean: mean.value };
  });
}

// ---------------------------------------------------------------------------
// The verge: loose material the grader pushed to the edge. Coarser gravel,
// clods, dry grass creeping in from the forest side.
// ---------------------------------------------------------------------------

export function vergeMaps(seed = 23) {
  return cached('gnd.verge.' + seed, () => {
    const n = M * M;
    const hf = new Float32Array(n);
    const peb = new Float32Array(n);
    const pebId = new Float32Array(n);
    const grit = new Float32Array(n);
    const veg = new Float32Array(n);
    const blade = new Float32Array(n);
    const stick = new Float32Array(n);
    const val = new Float32Array(n);
    const mossMask = new Float32Array(n);
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        const p = worley(u * 16, v * 16, 16, seed); // 14 cm cells
        const fine = worley(u * 46, v * 46, 46, seed + 3); // 4.8 cm cells
        // loose gravel: bigger and far more of it than on the running surface,
        // because this is the material the grader pushed off the road
        const lump = fbm(u * 46, v * 46, { octaves: 2, period: 46, seed: seed + 9 }) - 0.5;
        const rad = 0.15 + ((p.id * 53.1) % 1) * 0.19 + lump * 0.12;
        peb[i] = smoothstep(rad, rad - 0.06, p.f1) * smoothstep(0.36, 0.46, p.id);
        pebId[i] = p.id;
        grit[i] = smoothstep(0.3, 0.14, fine.f1) * (0.4 + fine.id * 0.6);
        veg[i] = smoothstep(0.5, 0.84, fbm(u * 6, v * 6, { octaves: 4, period: 6, seed: seed + 22 }));
        // dry grass leaning out of the verge, as streaks rather than a wash
        blade[i] = smoothstep(0.72, 0.97, ridged(u * 52 + v * 9, v * 34, { octaves: 2, period: 52, seed: seed + 31 }));
        // longer, straighter debris: twigs and stripped needle clusters thrown
        // clear of the running surface. Dark, and at a coarser scale than the
        // grass so the two do not merge into one texture.
        const s1 = ridged(u * 21 + v * 33, v * 12, { octaves: 2, period: 33, seed: seed + 51 });
        const s2 = ridged(v * 25 - u * 29, u * 14, { octaves: 2, period: 33, seed: seed + 52 });
        stick[i] = smoothstep(0.87, 0.995, Math.max(s1, s2));
        mossMask[i] = smoothstep(0.58, 0.9, fbm(u * 8 + 5, v * 8 + 2, { octaves: 3, period: 8, seed: seed + 61 }));
        const clump = fbm(u * 9, v * 9, { octaves: 4, period: 9, seed: seed + 4 });
        val[i] = smoothstep(0.3, 0.72, clump);
        const sand = tex1(x, y, seed + 66) * 0.65 + tex1(x >> 1, y >> 1, seed + 67) * 0.35;
        hf[i] = clamp(
          0.18 +
            clump * 0.34 +
            peb[i] * 0.5 +
            grit[i] * 0.16 +
            (sand - 0.5) * 0.12 +
            veg[i] * blade[i] * 0.2 +
            stick[i] * 0.22,
        );
      }
    }
    // The verge is greyer than the trail — this is the material the grader
    // pushed aside, so its stones are unpolished and lighter than the wet ruts.
    // Greyer, though, not brighter: pale pebbles at full strength here were the
    // single largest source of the salt-speckle over the whole shot.
    const agg = {
      wet: earth(EARTH.stoneWet, 0.3),
      dark: earth(EARTH.stoneDark, 0.3),
      mid: earth(EARTH.stoneMid, 0.3),
      pale: earth(EARTH.stone, 0.3),
      clay: earth(EARTH.clay, 0.2),
    };
    // The verge is the khaki end of the road: the dust the tyres throw off
    // settles here and nothing disturbs it, so it is the palest dirt in the
    // world and the least red. The straw is the grassland reaching in.
    const dirt = earth(EARTH.dustLight, 0.16);
    const dirtLight = earth(EARTH.dustPale, 0.18);
    const dark = earth(EARTH.dirt, 0.12);
    const damp = earth(EARTH.dirtDark, 0.1);
    const grass = rgb(EARTH.strawGrey);
    const dry = rgb(EARTH.strawPale);
    const twig = rgb(EARTH.twig);
    const chip = rgb(EARTH.chip);
    const moss = rgb(EARTH.grass);
    const pine = rgb(EARTH.moss);
    const mean = meanTracker();
    const map = pixelTexture(
      M,
      M,
      (x, y, out) => {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        let c = mixRgb(dark, dirt, val[i]);
        c = mixRgb(c, dirtLight, smoothstep(0.62, 1.0, val[i]) * 0.7);
        c = mixRgb(c, damp, (1 - val[i]) * 0.5);
        const pid = pebId[i];
        c = mixRgb(c, aggregateColour(pid, 0.18, agg), peb[i] * 0.8);
        c = mixRgb(c, aggregateColour(pid + 0.53, 0.35, agg), grit[i] * 0.5);
        c = mixRgb(c, mixRgb(grass, dry, pid), veg[i] * (0.3 + blade[i] * 0.6));
        // A tuft that found water at the ditch line: the only green on the road
        // margin, and rare.
        c = mixRgb(c, mixRgb(moss, pine, 0.45), mossMask[i] * (1 - peb[i]) * 0.28);
        c = mixRgb(c, mixRgb(twig, chip, pid), stick[i] * 0.85);
        const g =
          (0.88 + fbm(u * 66, v * 66, { octaves: 2, period: 66, seed: seed + 71 }) * 0.24) *
          (0.88 + skewDark(tex1(x, y, seed + 73), 0.8) * 0.2);
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = clamp(0.97 - peb[i] * 0.22 - veg[i] * 0.08 - (1 - val[i]) * 0.14) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, M, M, 5.4, (x, y) => {
      const i = y * M + x;
      // gravel shades the gaps between the stones
      return 0.44 + hf[i] * 0.5 + peb[i] * 0.2 - stick[i] * 0.12;
    });
    return { map, normal, height: hf, mean: mean.value };
  });
}

// ---------------------------------------------------------------------------
// Grassland soil: the ground between the roads. Bare laterite showing through
// a litter of dry straw, with tuft bases, quartz pebbles, dung and ash.
// ---------------------------------------------------------------------------

/**
 * The savanna floor.
 *
 * Built from substances, as the forest floor before it was, and for the same
 * reason: a tile that is one smooth blend between two browns reads as a cloud.
 * The substances here are bare red earth, a litter of dry grass stems lying on
 * it, the dark rotted base of each tuft, pale quartz pebbles, and the odd dung
 * pat and burn scar. Five hues, hard boundaries.
 *
 * The straw is *stamped*, not thresholded. A ridged noise field makes long
 * flowing filaments that all curve the same way, which reads as combed hair; a
 * fall of dry grass is thousands of short straight stems lying in drifts, each
 * one with its own direction, and only a stamp gives that. About nine hundred
 * of them, placed where the litter mask is thick, so the earth between the
 * drifts is genuinely bare.
 *
 * Detail at three scales, because the tile is seen at 2.4 m and the camera
 * works it from 30 cm to 30 m:
 *
 *   0.4-1.2 m  bare earth or straw litter, burn scars, trampled patches
 *   3-25 cm    tuft bases, stones, dung pats, termite-worked soil
 *   0.5-3 cm   the stems themselves, each its own shade off a pale-to-grey ramp
 */
export function savannaMaps(seed = 41) {
  return cached('gnd.savanna.' + seed, () => {
    const n = M * M;
    const PX = M / 2.4; // texels per metre
    const hf = new Float32Array(n);
    const strawH = new Float32Array(n); // stamped stems, height
    const strawId = new Float32Array(n); // which stem, for its colour
    const tuft = new Float32Array(n); // the dark ring at the base of a grass tuft
    const tuftId = new Float32Array(n);
    const stone = new Float32Array(n);
    const stoneId = new Float32Array(n);
    const stoneAo = new Float32Array(n);
    const dung = new Float32Array(n);
    const cover = new Float32Array(n); // how much straw lies here
    const burn = new Float32Array(n); // ash and char where a fire went through
    const worn = new Float32Array(n); // trampled to bare compacted earth
    const termite = new Float32Array(n); // worked subsoil, brighter and oranger
    const crack = new Float32Array(n);
    const rnd = mulberry32(seed * 131 + 7);

    // --- macro fields first, because the stems are placed off one of them -----
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        // Litter cover. Two thirds of the tile carries some straw and a third
        // is bare earth — measured coverage, not a threshold guessed at, because
        // fbm piles up around 0.5 and a cut placed carelessly leaves the
        // substance covering nothing.
        const cov = fbm(u * 4.5 + 3, v * 4.5 + 8, { octaves: 4, period: 5, seed: seed + 15 });
        cover[i] = smoothstep(0.36, 0.64, cov);
        const wearF = fbm(u * 6 + 21, v * 6 + 2, { octaves: 3, period: 6, seed: seed + 18 });
        worn[i] = smoothstep(0.6, 0.8, wearF) * (1 - cover[i] * 0.7);
        // Burn scars: a dry-season savanna carries last year's fire in patches.
        // Rare on the tile, but nothing else puts a grey in this palette.
        burn[i] = smoothstep(0.7, 0.86, fbm(u * 3 + 44, v * 3 + 17, { octaves: 3, period: 3, seed: seed + 21 }));
        termite[i] = smoothstep(0.74, 0.9, fbm(u * 5 + 61, v * 5 + 33, { octaves: 3, period: 5, seed: seed + 24 }));
      }
    }

    // --- the stems --------------------------------------------------------------
    // Direction is a slow field plus jitter: wind lays a drift of grass down the
    // same way, and stems scattered at pure random angles read as pick-up sticks.
    let placed = 0;
    for (let guard = 0; guard < 9000 && placed < 900; guard++) {
      const cx = rnd() * M;
      const cy = rnd() * M;
      const i = ((cy | 0) % M) * M + ((cx | 0) % M);
      if (rnd() > cover[i] * 1.2) continue;
      const lay = fbm(cx / M * 3 + 7, cy / M * 3 + 2, { octaves: 2, period: 3, seed: seed + 9 });
      const ang = lay * 6.283 + (rnd() - 0.5) * 1.3;
      // 6-28 cm long, 4-9 mm thick, tapered to a tip
      stampSeg(strawH, M, cx, cy, ang, (0.06 + rnd() ** 1.5 * 0.22) * PX, (0.002 + rnd() * 0.0025) * PX, 0.5 + rnd() * 0.5, 0.35);
      placed++;
    }
    // A second pass of short broken pieces where the litter is thickest, so a
    // drift has a mat under its long stems rather than earth showing through.
    for (let guard = 0; guard < 6000 && placed < 1500; guard++) {
      const cx = rnd() * M;
      const cy = rnd() * M;
      const i = ((cy | 0) % M) * M + ((cx | 0) % M);
      if (cover[i] < 0.7) continue;
      stampSeg(strawH, M, cx, cy, rnd() * 6.283, (0.02 + rnd() * 0.06) * PX, (0.0015 + rnd() * 0.002) * PX, 0.3 + rnd() * 0.4, 0.2);
      placed++;
    }
    // Which stem a texel belongs to, for colour: a cheap hash on the stamped
    // height's own neighbourhood, so one stem is one shade along its length.
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        strawId[i] = worley(x / M * 30, y / M * 30, 30, seed + 5).id;
      }
    }

    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;

        // --- meso: discrete objects ------------------------------------------
        // Tuft bases: a dark rotted ring 8-16 cm across with a little raised
        // collar of dead stems round it. The vegetation puts the standing grass
        // on top; this is what the ground looks like where it grows.
        const tc = worley(u * 9, v * 9, 9, seed + 31);
        const tr = 0.16 + ((tc.id * 61.7) % 1) * 0.12;
        tuft[i] = smoothstep(tr, tr - 0.08, tc.f1) * smoothstep(0.3, 0.42, tc.id);
        tuftId[i] = tc.id;

        // Quartz pebbles: 2-7 cm, lying on the surface, a hollow of shade
        // beside each one.
        const sc = worley(u * 16, v * 16, 16, seed + 41);
        const lump = fbm(u * 48, v * 48, { octaves: 2, period: 48, seed: seed + 33 }) - 0.5;
        const sr = 0.1 + ((sc.id * 37.3) % 1) * 0.14 + lump * 0.12;
        stone[i] = smoothstep(sr, sr * 0.6, sc.f1) * smoothstep(0.5, 0.6, sc.id);
        stoneId[i] = (sc.id * 91.7) % 1;
        stoneAo[i] = smoothstep(sr * 2.2, sr * 0.9, sc.f1) * smoothstep(0.5, 0.6, sc.id);

        // Dung pats: a flat dark disc 20-30 cm across, cracked, rare.
        const dc = worley(u * 5, v * 5, 5, seed + 47);
        const dr = 0.22 + ((dc.id * 13.3) % 1) * 0.1 + lump * 0.14;
        dung[i] = smoothstep(dr, dr - 0.06, dc.f1) * smoothstep(0.88, 0.93, dc.id);

        // Shrinkage cracks in the bare earth, warped so the net does not read
        // as a honeycomb.
        const wx = fbm(u * 5 + 2, v * 5 + 5, { octaves: 2, period: 5, seed: seed + 63 }) - 0.5;
        const cw = worley(u * 12 + wx * 2.4, v * 12 - wx * 2.0, 12, seed + 17);
        crack[i] = smoothstep(0.03, 0.006, cw.f2 - cw.f1) * (1 - cover[i]) * smoothstep(0.4, 0.7, fbm(u * 4 + 7, v * 4 + 1, { octaves: 3, period: 4, seed: seed + 18 }));

        const sand = tex1(x, y, seed + 52) * 0.6 + tex1(x >> 1, y >> 1, seed + 53) * 0.4;
        const clod = fbm(u * 14, v * 14, { octaves: 3, period: 14, seed: seed + 2 });
        hf[i] = clamp(
          0.3 +
            (clod - 0.5) * 0.24 +
            strawH[i] * 0.16 +
            tuft[i] * 0.12 +
            stone[i] * 0.42 +
            dung[i] * 0.14 +
            termite[i] * 0.1 +
            (sand - 0.5) * 0.1 -
            worn[i] * 0.08 -
            crack[i] * 0.16 -
            stoneAo[i] * 0.06,
        );
      }
    }

    const earthMid = earth(EARTH.litter, 0.1);
    const earthDark = earth(EARTH.litterDark, 0.1);
    const earthDust = earth(EARTH.dustLight, 0.16);
    const earthPale = earth(EARTH.dustPale, 0.2);
    const clay = earth(EARTH.clay, 0.12);
    const strawPale = rgb(EARTH.strawPale);
    const straw = rgb(EARTH.straw);
    const strawGrey = rgb(EARTH.strawGrey);
    const strawDark = rgb(EARTH.strawDark);
    const tuftBase = rgb(EARTH.tuftBase);
    const green = rgb(EARTH.grass);
    const humus = rgb(EARTH.humus);
    const ash = rgb(EARTH.ash);
    const termiteCol = earth(EARTH.termite, 0.1);
    const dungCol = rgb(EARTH.dung);
    const agg = {
      wet: earth(EARTH.stoneWet, 0.3),
      dark: earth(EARTH.stoneDark, 0.3),
      mid: earth(EARTH.stoneMid, 0.3),
      pale: earth(EARTH.stone, 0.3),
      clay,
    };
    const mean = meanTracker();
    const map = pixelTexture(
      M,
      M,
      (x, y, out) => {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        const h = hf[i];
        // Bare earth: laterite, darker in the hollows, with a dust skin on the
        // crowns of the clods and the oxide showing through where it is worn.
        let c = mixRgb(earthDark, earthMid, smoothstep(0.15, 0.55, h));
        c = mixRgb(c, earthDust, smoothstep(0.42, 0.7, h) * 0.6);
        c = mixRgb(c, clay, worn[i] * 0.5);
        c = mixRgb(c, earthPale, worn[i] * smoothstep(0.5, 0.75, h) * 0.5);
        c = mixRgb(c, termiteCol, termite[i] * 0.7);
        c = mixRgb(c, mixRgb(earthDark, humus, 0.5), crack[i] * 0.6);
        // Burn: ash over char, and the straw gone from it.
        c = mixRgb(c, mixRgb(humus, ash, smoothstep(0.3, 0.7, h)), burn[i] * 0.75);
        // Straw. Each stem its own shade off a pale-to-grey ramp, because a
        // drift of one colour is a painted patch. Pale stems lie on top.
        {
          const sid = strawId[i];
          const sc = sid < 0.4 ? mixRgb(strawPale, straw, sid * 2.5) : sid < 0.75 ? mixRgb(straw, strawGrey, (sid - 0.4) * 2.8) : mixRgb(strawGrey, strawDark, (sid - 0.75) * 4);
          const s = smoothstep(0.08, 0.5, strawH[i]) * (1 - burn[i] * 0.85);
          c = mixRgb(c, sc, s * 0.92);
          // the mat under a thick drift, where the stems are too many to resolve
          c = mixRgb(c, mixRgb(strawGrey, strawDark, 0.4), smoothstep(0.75, 1.0, cover[i]) * (1 - s) * 0.35 * (1 - burn[i]));
        }
        // Tuft base: dark ring, a little green at the very centre where the
        // crown still lives, bleached collar round it.
        {
          const t = tuft[i];
          c = mixRgb(c, tuftBase, t * 0.8);
          c = mixRgb(c, mixRgb(green, strawDark, 0.5), smoothstep(0.7, 1.0, t) * 0.5);
          c = mixRgb(c, strawPale, smoothstep(0.1, 0.4, t) * (1 - smoothstep(0.4, 0.75, t)) * 0.3);
        }
        // Stones sit in a hollow of shade.
        c = mixRgb(c, mixRgb(c, humus, 0.6), stoneAo[i] * (1 - stone[i]) * 0.5);
        c = mixRgb(c, aggregateColour(stoneId[i], 0.05, agg), stone[i] * 0.92);
        c = mixRgb(c, dungCol, dung[i] * 0.85);
        const g =
          (0.88 + fbm(u * 70, v * 70, { octaves: 2, period: 70, seed: seed + 77 }) * 0.24) *
          (0.9 + skewDark(tex1(x, y, seed + 79), 0.8) * 0.18);
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        // Roughness: dust and straw drink light; a quartz pebble and a dung crust
        // do not.
        out[3] = clamp(0.96 - stone[i] * 0.3 - dung[i] * 0.12 - smoothstep(0.3, 0.8, strawH[i]) * 0.06 + worn[i] * 0.03) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, M, M, 4.6, (x, y) => {
      const i = y * M + x;
      // Cavity occlusion: a stone drags a dark ring round itself, a tuft base is
      // a hollow, the straw mat is open to the sky.
      return 0.46 + hf[i] * 0.56 - stoneAo[i] * 0.3 - tuft[i] * 0.16 - crack[i] * 0.1;
    });
    return { map, normal, height: hf, mean: mean.value };
  });
}

// ---------------------------------------------------------------------------
// Riverbed sand: the floor of the dry watercourse. Pale, rippled, with a
// scatter of stones where the last flow left them.
// ---------------------------------------------------------------------------

export function sandMaps(seed = 67) {
  return cached('gnd.sand.' + seed, () => {
    const n = M * M;
    const hf = new Float32Array(n);
    const peb = new Float32Array(n);
    const pebId = new Float32Array(n);
    const pebAo = new Float32Array(n);
    const ripple = new Float32Array(n);
    const wetF = new Float32Array(n);
    const crust = new Float32Array(n);
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        // Current ripples: a warped sine across the flow, 6-9 cm pitch, that
        // comes and goes in patches. The one thing that says "water was here".
        const warp = fbm(u * 3 + 5, v * 3 + 1, { octaves: 3, period: 3, seed: seed + 3 }) - 0.5;
        const patch = smoothstep(0.38, 0.62, fbm(u * 4 + 9, v * 4 + 4, { octaves: 3, period: 4, seed: seed + 5 }));
        ripple[i] = (Math.sin((v + warp * 0.12) * 6.283 * 30 + u * 2.5) * 0.5 + 0.5) * patch;
        // Pebble bars: stones collect in the lees, so the stone mask is gated by
        // a slow field rather than scattered evenly.
        const bar = smoothstep(0.5, 0.75, fbm(u * 3 + 17, v * 3 + 8, { octaves: 3, period: 3, seed: seed + 11 }));
        const pc = worley(u * 20, v * 20, 20, seed + 13);
        const lump = fbm(u * 50, v * 50, { octaves: 2, period: 50, seed: seed + 15 }) - 0.5;
        const pr = 0.12 + ((pc.id * 43.1) % 1) * 0.16 + lump * 0.12;
        peb[i] = smoothstep(pr, pr * 0.6, pc.f1) * smoothstep(0.3, 0.45, pc.id) * (0.35 + bar * 0.65);
        pebId[i] = (pc.id * 71.3) % 1;
        pebAo[i] = smoothstep(pr * 2.2, pr * 0.9, pc.f1) * smoothstep(0.3, 0.45, pc.id) * (0.35 + bar * 0.65);
        // Where the sand is still damp under the top layer, and the dried mud
        // crust that curls up at the edge of a pool that has gone.
        wetF[i] = smoothstep(0.56, 0.82, fbm(u * 2.5 + 31, v * 2.5 + 12, { octaves: 3, period: 3, seed: seed + 21 }));
        const cwx = fbm(u * 5 + 2, v * 5 + 5, { octaves: 2, period: 5, seed: seed + 63 }) - 0.5;
        const cw = worley(u * 10 + cwx * 2.4, v * 10 - cwx * 2.0, 10, seed + 17);
        crust[i] = smoothstep(0.04, 0.008, cw.f2 - cw.f1) * wetF[i];
        const sand = tex1(x, y, seed + 52) * 0.6 + tex1(x >> 1, y >> 1, seed + 53) * 0.4;
        hf[i] = clamp(
          0.34 +
            ripple[i] * 0.16 +
            (fbm(u * 8, v * 8, { octaves: 3, period: 8, seed: seed + 2 }) - 0.5) * 0.16 +
            peb[i] * 0.4 +
            (sand - 0.5) * 0.08 -
            pebAo[i] * 0.05 -
            crust[i] * 0.12,
        );
      }
    }
    // Sand off the same laterite the country is made of, washed: the iron is
    // mostly gone out of it, so it is the palest and least red ground there is.
    const sandPale = desat(rgb(0xd2bd97), 0.06);
    const sandMid = desat(rgb(0xb9a37c), 0.06);
    const sandDark = desat(rgb(0x8f7a5a), 0.08);
    const sandDamp = desat(rgb(0x6e5a44), 0.08);
    const mudCrust = desat(rgb(0x7d6146), 0.1);
    const agg = {
      wet: earth(EARTH.stoneWet, 0.3),
      dark: earth(EARTH.stoneDark, 0.3),
      mid: earth(EARTH.stoneMid, 0.3),
      pale: earth(EARTH.stone, 0.3),
      clay: earth(EARTH.clay, 0.2),
    };
    const mean = meanTracker();
    const map = pixelTexture(
      M,
      M,
      (x, y, out) => {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        const h = hf[i];
        let c = mixRgb(sandDark, sandMid, smoothstep(0.2, 0.5, h));
        c = mixRgb(c, sandPale, smoothstep(0.45, 0.7, h) * 0.8);
        // the lee of each ripple holds a line of darker, coarser grains
        c = mixRgb(c, sandDark, (1 - ripple[i]) * smoothstep(0.2, 0.6, ripple[i] + 0.3) * 0.2);
        c = mixRgb(c, sandDamp, wetF[i] * 0.55);
        c = mixRgb(c, mudCrust, crust[i] * 0.7);
        c = mixRgb(c, mixRgb(c, sandDamp, 0.7), pebAo[i] * (1 - peb[i]) * 0.5);
        c = mixRgb(c, aggregateColour(pebId[i], 0.1, agg), peb[i] * 0.92);
        const g =
          (0.9 + fbm(u * 66, v * 66, { octaves: 2, period: 66, seed: seed + 77 }) * 0.2) *
          (0.9 + skewDark(tex1(x, y, seed + 79), 0.8) * 0.18);
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = clamp(0.97 - peb[i] * 0.3 - wetF[i] * 0.12) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, M, M, 4.2, (x, y) => {
      const i = y * M + x;
      return 0.5 + hf[i] * 0.5 - pebAo[i] * 0.28;
    });
    return { map, normal, height: hf, mean: mean.value };
  });
}

// ---------------------------------------------------------------------------
// Animal and boot tracks. Sampled in world space wherever the ground is soft —
// the mud round the water hole, the churned apron at the camp — as a height
// field the terrain shader shades the same way it shades the tyre print.
//
// One tile is 1.6 m. Hoof prints in pairs (a cloven print is two crescents),
// a few big round paw prints with four toes, and a couple of boot soles. All
// stamped at random headings, but hoofed animals walk in lines, so each hoof
// pair belongs to a short trail of three or four.
// ---------------------------------------------------------------------------

export const TRACKS_TILE = 1.6;

export function trackStamps(seed = 211) {
  return cached('gnd.tracks.' + seed, () => {
    const s = 256;
    const n = s * s;
    const PX = s / TRACKS_TILE;
    const press = new Float32Array(n);
    const rnd = mulberry32(seed);
    const stampPrint = (cx, cy, ang, kind) => {
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const at = (dx, dy, rx, ry, a2, add, lobe) =>
        stampDome(press, s, Math.round(cx + dx * ca - dy * sa), Math.round(cy + dx * sa + dy * ca), rx, ry, ang + a2, add, lobe, rnd() * 6.28);
      if (kind === 0) {
        // cloven hoof: two crescents 3 cm apart, 6 cm long
        at(0, -0.017 * PX, 0.032 * PX, 0.014 * PX, -0.25, 0.85, 0.2);
        at(0, 0.017 * PX, 0.032 * PX, 0.014 * PX, 0.25, 0.85, 0.2);
      } else if (kind === 1) {
        // big cat: round pad and four toes, 11 cm across
        at(-0.015 * PX, 0, 0.032 * PX, 0.036 * PX, 0, 0.75, 0.15);
        for (let k = 0; k < 4; k++) {
          const a = -0.9 + k * 0.6;
          at(0.03 * PX + Math.cos(a) * 0.018 * PX, Math.sin(a) * 0.04 * PX, 0.013 * PX, 0.011 * PX, a, 0.7, 0.15);
        }
      } else {
        // boot: sole and heel, 29 cm
        at(0.05 * PX, 0, 0.09 * PX, 0.048 * PX, 0, 0.7, 0.08);
        at(-0.09 * PX, 0, 0.04 * PX, 0.042 * PX, 0, 0.75, 0.08);
      }
    };
    // Hoof trails: three or four prints in a line, alternating left and right.
    for (let t = 0; t < 9; t++) {
      const ang = rnd() * 6.283;
      let cx = rnd() * s;
      let cy = rnd() * s;
      const nn = 3 + ((rnd() * 2) | 0);
      for (let k = 0; k < nn; k++) {
        const side = k % 2 === 0 ? -1 : 1;
        stampPrint(cx + Math.cos(ang + 1.5708) * side * 0.06 * PX, cy + Math.sin(ang + 1.5708) * side * 0.06 * PX, ang + (rnd() - 0.5) * 0.3, 0);
        cx += Math.cos(ang) * 0.42 * PX;
        cy += Math.sin(ang) * 0.42 * PX;
      }
    }
    for (let k = 0; k < 5; k++) stampPrint(rnd() * s, rnd() * s, rnd() * 6.283, 1);
    for (let k = 0; k < 3; k++) stampPrint(rnd() * s, rnd() * s, rnd() * 6.283, 2);

    // A print is a hollow with a lip of displaced mud round it.
    const hf = new Float32Array(n);
    const at = (x, y) => press[(((y % s) + s) % s) * s + (((x % s) + s) % s)];
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let mx = 0;
        for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) mx = Math.max(mx, at(x + ox, y + oy));
        const p = press[y * s + x];
        hf[y * s + x] = clamp(0.6 - p * 0.6 + Math.max(0, mx - p) * 0.22);
      }
    }
    const normal = normalAoTexture(hf, s, s, 4.0, (x, y) => 0.36 + hf[y * s + x] * 1.0);
    return { normal, height: hf };
  });
}

// ---------------------------------------------------------------------------
// Macro variation. Tiled at roughly 110 m, so it never repeats inside a shot;
// its job is to break up the 2-4 m surface tiles into large patches of
// lighter and darker, wetter and drier ground.
// ---------------------------------------------------------------------------

export function macroVariation() {
  return cached('gnd.macro', () => {
    const s = 256;
    return pixelTexture(
      s,
      s,
      (x, y, out) => {
        const u = x / s;
        const v = y / s;
        // fbm of value noise piles up around 0.5; every threshold the terrain
        // shader puts on these channels would then land in the same place and
        // the variation would be invisible. Expand each one to fill the range.
        // Widened from 0.34/0.66. Seven separate taps in the terrain shader read
        // this tile — the streak, the drag grain, the road-space jitter, the
        // relief UV warp, the clod value tier — and at a 0.32-wide ramp every
        // channel saturates into hard-edged plateaus. Anything that warps a
        // coordinate by a saturated field folds the texture it is warping into
        // flowing bands, which is half of why the near field marbled.
        const spread = (v0) => smoothstep(0.2, 0.8, v0);
        const value = spread(fbm(u * 4, v * 4, { octaves: 5, period: 4, seed: 91 }));
        const wet = spread(fbm(u * 3 + 11, v * 3 + 5, { octaves: 4, period: 3, seed: 44 }));
        const veg = spread(fbm(u * 6 + 3, v * 6 + 7, { octaves: 4, period: 6, seed: 17 }));
        const warm = spread(fbm(u * 2 + 21, v * 2 + 13, { octaves: 3, period: 2, seed: 63 }));
        out[0] = clamp(value) * 255;
        out[1] = clamp(wet) * 255;
        out[2] = clamp(veg) * 255;
        out[3] = clamp(warm) * 255;
      },
      { repeat: 1 },
    );
  });
}

// ---------------------------------------------------------------------------
// Tyre imprint, sampled in road space so the lugs actually run along the ruts.
// One tile is four lug pitches: the wheel's circumference is 2*pi*0.445 m over
// nine lug rows, so the pitch on the ground is 0.31 m.
// ---------------------------------------------------------------------------

export const TREAD_PITCH = ((2 * Math.PI * 0.445) / 9) * 4;

export function treadImprint(rows = 4) {
  return cached('gnd.tread.' + rows, () => {
    const w = 256;
    const h = 256;
    const press = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w; // across the tyre
        const v = y / h; // along the road
        const cu = Math.abs(u - 0.5);
        const stagger = Math.floor(v * rows * 2) % 2 === 0 ? 0 : 0.5;
        const lug = (v * rows + stagger) % 1;
        // Ramps a third of their old width. A lug period is 64 texels, so a 0.12
        // ramp is eight texels of gradient on each edge of a block — which is
        // most of the way to a sine wave, and a sine wave stamped into dirt is a
        // wash. A block edge in soft ground is one or two millimetres of taper,
        // and the *edge* is the whole reason a print reads as pressed in rather
        // than painted on.
        const block = smoothstep(0.03, 0.075, lug) * (1 - smoothstep(0.925, 0.97, lug));
        const shoulder = smoothstep(0.16, 0.21, cu) * (1 - smoothstep(0.43, 0.47, cu));
        const centre = (1 - smoothstep(0.055, 0.09, cu)) * smoothstep(0.24, 0.3, (v * rows * 2) % 1);
        let p = Math.max(block * shoulder, centre);
        // The print is never clean: patches of it are scuffed out entirely. The
        // floor is up from 0.45 because the shader multiplies this by two more
        // noise masks of its own, and three independent scuff terms took the
        // average press to under a third — a print that is everywhere at a third
        // of its contrast is a print nowhere.
        p *= 0.62 + fbm(u * 5, v * 5 * rows, { octaves: 4, period: 5, seed: 8 }) * 0.62;
        press[y * w + x] = clamp(p) * (1 - smoothstep(0.44, 0.5, cu));
      }
    }
    // dirt squeezed up around the edge of each lug
    const hf = new Float32Array(w * h);
    const at = (x, y) => press[(((y % h) + h) % h) * w + (((x % w) + w) % w)];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let mx = 0;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) mx = Math.max(mx, at(x + ox, y + oy));
        const p = press[y * w + x];
        // The lip squeezed up around a lug is what makes the print read as a
        // print rather than a stain — but at 0.3 it is a hard ridge on one side
        // of every block, and a ridge lit from one side is a crescent. Rows of
        // matched crescents read as rubber stamped into lino, which is what the
        // low framings showed. Softer lip, same footprint.
        hf[y * w + x] = clamp(0.62 - p * 0.62 + Math.max(0, mx - p) * 0.26);
      }
    }
    // Wide range in the AO channel: the terrain shader darkens the albedo with
    // it, and a print that only spans 0.6-1.0 is invisible on dirt. 0.42 + 0.95
    // put the lug floor at 0.52 and the gaps at 0.94, which the shader's own
    // remap then compressed into a 23 per cent swing — measured as absent in
    // every framing that actually looked down a rut. The floor is a third now.
    const normal = normalAoTexture(hf, w, h, 4.6, (x, y) => 0.3 + hf[y * w + x] * 1.12);
    return { normal, height: hf, pitch: TREAD_PITCH };
  });
}

// ---------------------------------------------------------------------------
// Dust. A 2x2 atlas of soft puffs so a pool of billboards never looks stamped
// from one sprite, plus a small grit sprite in the fourth cell.
// ---------------------------------------------------------------------------

export function dustPuff() {
  return cached('gnd.dust.atlas', () => {
    const s = 256;
    const half = s / 2;
    // Airborne fines are the *dry* end of the road's own material lit from
    // every side, so the sprite runs warmer and lighter than the damp surface
    // it came off — but it is still earth. Anything approaching neutral white
    // here reads as exhaust smoke against a dark trail.
    const pale = rgb(0xd9c4a0);
    const body = rgb(0xa08862);
    return pixelTexture(
      s,
      s,
      (x, y, out) => {
        const cell = (y < half ? 0 : 2) + (x < half ? 0 : 1);
        const u = ((x % half) / half - 0.5) * 2;
        const v = ((y % half) / half - 0.5) * 2;
        const r = Math.hypot(u, v);
        const ang = Math.atan2(v, u);
        let a;
        let thick;
        if (cell === 3) {
          // grit: a few small clumps rather than one soft blob
          const g = worley((u * 0.5 + 0.5) * 5, (v * 0.5 + 0.5) * 5, 5, 12);
          a = clamp(1 - smoothstep(0.0, 0.22, g.f1)) * clamp(1 - smoothstep(0.35, 1.0, r));
          thick = 0.3;
        } else {
          const seed = 3 + cell * 37;
          // lumpy edge: modulate the radius by angular noise so the silhouette
          // is a cauliflower, not a circle
          const lobes = fbm(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 2, { octaves: 3, period: 8, seed });
          const inner = fbm((u * 0.5 + 0.5) * 6, (v * 0.5 + 0.5) * 6, { octaves: 5, period: 6, seed: seed + 4 });
          const wisp = fbm((u * 0.5 + 0.5) * 13, (v * 0.5 + 0.5) * 13, { octaves: 4, period: 13, seed: seed + 9 });
          const edge = 0.62 + lobes * 0.36;
          // never a solid core: a hundred of these overlap in the plume, so
          // each one has to be mostly holes
          a = clamp(1 - smoothstep(edge * 0.4, edge * 1.02, r)) * clamp(inner * 1.3 + wisp * 0.5 - 0.34);
          a *= clamp(1 - smoothstep(0.84, 1.0, r)) * 0.9;
          thick = inner;
        }
        const c = mixRgb(body, pale, clamp(thick * 1.2));
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = clamp(a) * 255;
      },
      { srgb: true },
    );
  });
}

// ---------------------------------------------------------------------------
// Close-range aggregate. The surface tiles are 2.2-2.6 m over 512 px, which is
// 5 mm a texel — at 0.3 m from the lens that is magnified sevenfold and there
// is nothing left but a smooth wash. This tier is tiled at 40 cm and again at
// 11 cm, which puts a texel back under half a millimetre in the closest
// framings.
//
// Stored as a multiplicative tint around 0.5 (so 0.5 -> x1.0) rather than as a
// colour, because it has to sit on top of three different base surfaces without
// dragging any of them toward its own value. Chroma, not just value: the thing
// that reads as aggregate up close is a pebble being a different *hue* from the
// earth around it, and a grey AO channel cannot do that. Roughness in alpha.
// ---------------------------------------------------------------------------

export function grainMaps(seed = 61) {
  return cached('gnd.grain.' + seed, () => {
    const s = 256;
    const agg = {
      wet: earth(EARTH.stoneWet, 0.44),
      dark: earth(EARTH.stoneDark, 0.44),
      mid: earth(EARTH.stoneMid, 0.44),
      pale: earth(EARTH.stone, 0.44),
      clay: earth(EARTH.clay, 0.3),
    };
    const base = earth(EARTH.dirt, 0.4);
    const chipCol = rgb(EARTH.chip);
    const twigCol = rgb(EARTH.twig);
    // The aggregate in here is mostly darker than the matrix, so a tint stored
    // raw has a mean below 1.0 and silently drops half a stop off everything
    // within a few metres of the lens. Two passes: measure the mean, then scale
    // the whole field so it multiplies out to unity.
    const gain = { v: 1 };
    const fill = (x, y, out) => {
      const u = x / s;
      const v = y / s;
      const p = worley(u * 13, v * 13, 13, seed); // ~3 cm at the 40 cm tile
      const f = worley(u * 31, v * 31, 31, seed + 5);
      const lump = fbm(u * 34, v * 34, { octaves: 2, period: 34, seed: seed + 8 }) - 0.5;
      const rad = 0.17 + ((p.id * 47.3) % 1) * 0.2 + lump * 0.16;
      // sparser than the first pass: two tiers of this tint stacked at close
      // range turned compacted dirt into a bed of scree
      const peb = smoothstep(rad, rad - 0.07, p.f1) * smoothstep(0.44, 0.58, p.id);
      const grit = smoothstep(0.24, 0.11, f.f1) * smoothstep(0.36, 0.52, f.id);
      const fleck = smoothstep(0.8, 0.98, ridged(u * 44 + v * 15, v * 27, { octaves: 2, period: 44, seed: seed + 12 }));
      const fines = fbm(u * 22, v * 22, { octaves: 4, period: 22, seed: seed + 3 });

      // ratio against the mean earth value, so the tint only ever says
      // "lighter or darker than the dirt around me"
      let c = mixRgb(base, aggregateColour(p.id, 0.3, agg), peb * 0.9);
      c = mixRgb(c, aggregateColour(f.id + 0.19, 0.45, agg), grit * 0.6);
      c = mixRgb(c, mixRgb(chipCol, twigCol, (p.id * 3.7) % 1), fleck * 0.7);
      const shade = 0.86 + fines * 0.3;
      for (let k = 0; k < 3; k++) {
        // The ratio has to be taken in linear space, because that is where
        // the shader multiply happens. Halving an sRGB byte is only a fifth
        // of the light, so a gamma-space ratio here would flatten every
        // pebble to a fifth of the contrast it should have.
        const lin = srgbToLinear(c[k] / 255) / Math.max(1e-4, srgbToLinear(base[k] / 255));
        // /2 puts x1.0 at the 0.5 byte midpoint; the base colour cancels out
        // so a texel with no aggregate in it is exactly neutral
        out[k] = clamp((lin * shade * gain.v) / 2, 0, 1) * 255;
      }
      out[3] = clamp(0.96 - peb * 0.26 - grit * 0.1) * 255;
    };

    const probe = [0, 0, 0, 0];
    let sum = 0;
    for (let y = 0; y < s; y += 2) {
      for (let x = 0; x < s; x += 2) {
        fill(x, y, probe);
        sum += (probe[0] + probe[1] + probe[2]) / 3;
      }
    }
    const n = (s / 2) ** 2;
    gain.v = 127.5 / Math.max(1, sum / n);

    return pixelTexture(s, s, fill, { repeat: 1, aniso: ANISO });
  });
}

/** High-frequency grit normal, tiled on top of everything up close. */
export function detailNormal() {
  return cached('gnd.detail', () => {
    const n = 256;
    const hf = heightField(n, n, (x, y) => {
      const u = x / n;
      const v = y / n;
      const grit = worley(u * 30, v * 30, 30, 71).f1;
      const fine = worley(u * 62, v * 62, 62, 19).f1;
      return clamp(
        fbm(u * 28, v * 28, { octaves: 4, period: 28, seed: 6 }) * 0.5 +
          (1 - smoothstep(0, 0.14, grit)) * 0.34 +
          (1 - smoothstep(0, 0.1, fine)) * 0.22,
      );
    });
    // wide AO range: the terrain shader folds this channel into the albedo up
    // close, and that is the only grit visible when the ground is in shade
    return normalAoTexture(hf, n, n, 2.0, (x, y) => 0.34 + hf[y * n + x] * 0.8);
  });
}

// ---------------------------------------------------------------------------
// Near-field relief.
//
// Everything above this point is a normal map, and a normal map gives itself
// away the moment the camera drops to knee height: the shading says there are
// stones but the surface still slides past as a flat plane and nothing casts a
// shadow onto anything else. This tier is a real height field, marched in the
// fragment shader for parallax and again toward the sun for self-shadowing, so
// a clod occludes the hollow behind it and a pebble has a hard little shadow on
// its lee side.
//
// One tile is RELIEF_TILE metres over 384 px — 2.5 mm a texel — and the field
// carries three frequencies deliberately: 12 cm clods, 4 cm pebbles, 1.5 cm
// grit. That is the "three scales at once" the whole surface was missing.
// ---------------------------------------------------------------------------

export const RELIEF_TILE = 0.95;
// Peak-to-trough in metres. The parallax offset at a grazing angle is roughly
// this over the view ray's vertical component, so it is also the ceiling on how
// far the texture can swim: 3 cm of relief at a 20 degree view is 9 cm of
// offset, which is a clod's width and reads as depth rather than as a wobble.
export const RELIEF_DEPTH = 0.033;

/** Rounded cap profile, so a stone is a dome rather than a flat-topped plate. */
const dome = (d, rad) => {
  const t = d / Math.max(1e-3, rad);
  return t >= 1 ? 0 : Math.sqrt(1 - t * t);
};

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const inv = 1 / (r * 2 + 1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[y * w + (((x + k) % w) + w) % w];
      tmp[y * w + x] = s * inv;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[((((y + k) % h) + h) % h) * w + x];
      out[y * w + x] = s * inv;
    }
  }
  return out;
}

/**
 * Stamp one wrapped capsule of `add` height into a buffer: a segment of length
 * `len` px at angle `ang`, `rad` px thick, with a rounded cross-section.
 *
 * Litter has to be stamped, not thresholded out of a noise field. Thresholding
 * ridged noise for "twigs" gives long flowing filaments that all curve the same
 * way, and a surface covered in those does not read as a track with sticks on
 * it — it reads as combed hair, which is exactly what the first pass rendered.
 */
function stampSeg(buf, s, cx, cy, ang, len, rad, add, taper = 0) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const r = Math.ceil(rad) + 1;
  const hl = len * 0.5;
  const x0 = Math.floor(cx - Math.abs(dx) * hl - r);
  const x1 = Math.ceil(cx + Math.abs(dx) * hl + r);
  const y0 = Math.floor(cy - Math.abs(dy) * hl - r);
  const y1 = Math.ceil(cy + Math.abs(dy) * hl + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x - cx;
      const py = y - cy;
      // distance to the segment, in its own frame
      let t = px * dx + py * dy;
      t = t < -hl ? -hl : t > hl ? hl : t;
      const qx = px - dx * t;
      const qy = py - dy * t;
      const d = Math.hypot(qx, qy);
      // thinner toward one end, so a twig has a butt and a tip
      const rr = rad * (1 - taper * (t / hl + 1) * 0.5);
      if (d > rr) continue;
      const i = (((y % s) + s) % s) * s + (((x % s) + s) % s);
      const h = add * Math.sqrt(1 - (d / Math.max(1e-3, rr)) ** 2);
      if (h > buf[i]) buf[i] = h;
    }
  }
}

/** Stamp a wrapped irregular dome: a pebble or a bark flake seen from above. */
function stampDome(buf, s, cx, cy, rx, ry, ang, add, lobe, seed) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const r = Math.ceil(Math.max(rx, ry) * 1.25) + 1;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const ex = (x * ca + y * sa) / rx;
      const ey = (-x * sa + y * ca) / ry;
      const a = Math.atan2(ey, ex);
      // three lobes of wobble on the outline: a perfect ellipse in plan is a
      // bead, and a bead with a hard shadow beside it is still a bead
      const wob = 1 + lobe * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 5 - seed * 1.7) * 0.4);
      const d = Math.hypot(ex, ey) / Math.max(0.3, wob);
      if (d > 1) continue;
      const i = (((y + cy) % s + s) % s) * s + (((x + cx) % s + s) % s);
      const h = add * Math.sqrt(1 - d * d) ** 0.7;
      if (h > buf[i]) buf[i] = h;
    }
  }
}

export function reliefMaps(seed = 137) {
  return cached('gnd.relief.' + seed, () => {
    const s = 384;
    const n = s * s;
    const hf = new Float32Array(n);
    const stone = new Float32Array(n);
    const debris = new Float32Array(n);
    const grain = new Float32Array(n);
    // 2.47 mm a texel over a 0.95 m tile
    const PX = s / 0.95;
    const rnd = mulberry32(seed * 7919 + 13);

    // --- stamped aggregate ----------------------------------------------------
    // Pebbles as explicit wobbly domes rather than worley cells. A worley dome
    // is centred in its cell, so however much the radius is jittered the
    // spacing stays a lattice — and at 40 cm a lattice of pebbles is the most
    // obvious tell on the surface. Stamped positions clump and touch.
    const pebH = new Float32Array(n);
    for (let k = 0; k < 150; k++) {
      // 2.5-7 cm across, skewed small
      const rr = (0.012 + rnd() ** 1.8 * 0.023) * PX;
      stampDome(
        pebH,
        s,
        (rnd() * s) | 0,
        (rnd() * s) | 0,
        rr,
        rr * (0.6 + rnd() * 0.5),
        rnd() * 3.14,
        0.5 + rnd() * 0.5,
        0.16 + rnd() * 0.16,
        rnd() * 6.28,
      );
    }
    // bark flakes: flatter, wider, more angular than a pebble
    const flakeH = new Float32Array(n);
    for (let k = 0; k < 40; k++) {
      const rr = (0.008 + rnd() ** 1.4 * 0.016) * PX;
      stampDome(flakeH, s, (rnd() * s) | 0, (rnd() * s) | 0, rr * 1.5, rr * 0.55, rnd() * 6.28, 0.3 + rnd() * 0.3, 0.3, rnd() * 6.28);
    }
    // --- stamped litter -------------------------------------------------------
    const litH = new Float32Array(n);
    // twigs: 4-14 cm, 3-6 mm thick, tapered
    for (let k = 0; k < 26; k++) {
      stampSeg(
        litH,
        s,
        rnd() * s,
        rnd() * s,
        rnd() * 6.28,
        (0.04 + rnd() ** 1.6 * 0.1) * PX,
        (0.0016 + rnd() * 0.0014) * PX,
        0.55 + rnd() * 0.45,
        0.4 + rnd() * 0.4,
      );
    }
    // Broken grass stems: 2-5 cm, hair thin, in fallen clusters of three to
    // six. A third of the count the needle litter had — this is open ground
    // with grass blown onto it, not a floor under a canopy.
    for (let c = 0; c < 9; c++) {
      const cx = rnd() * s;
      const cy = rnd() * s;
      const dir = rnd() * 6.28;
      const nn = 3 + ((rnd() * 4) | 0);
      for (let k = 0; k < nn; k++) {
        stampSeg(
          litH,
          s,
          cx + (rnd() - 0.5) * 0.05 * PX,
          cy + (rnd() - 0.5) * 0.05 * PX,
          dir + (rnd() - 0.5) * 1.5,
          (0.022 + rnd() * 0.028) * PX,
          0.0007 * PX,
          0.24 + rnd() * 0.2,
          0.5,
        );
      }
    }

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const i = y * s + x;
        const u = x / s;
        const v = y / s;
        // 12 cm clods: the tier that was missing entirely between the 2.6 m
        // surface tile and the 1 cm grit
        const cl = worley(u * 8, v * 8, 8, seed + 3);
        const clodR = 0.26 + ((cl.id * 37.1) % 1) * 0.16;
        const clod = dome(cl.f1, clodR) * (0.45 + cl.id * 0.55);
        const peb = pebH[i];
        // 1.5 cm grit
        const gr = worley(u * 62, v * 62, 62, seed + 29);
        const grit = dome(gr.f1, 0.24) * smoothstep(0.26, 0.5, gr.id);
        // Litter lying *on* the surface. It gets the same parallax and the same
        // sun march as the stones, which is what makes it read as debris on
        // dirt rather than as a pattern printed into it.
        debris[i] = clamp(litH[i] + flakeH[i] * 0.7);
        // hairline shrinkage cracks in the dry crust between the clods
        const wx = fbm(u * 5 + 2, v * 5 + 5, { octaves: 2, period: 5, seed: seed + 63 }) - 0.5;
        const cw = worley(u * 11 + wx * 2.6, v * 11 - wx * 2.2, 11, seed + 17);
        const crack =
          smoothstep(0.028, 0.004, cw.f2 - cw.f1) *
          smoothstep(0.78, 0.95, fbm(u * 4 + 7, v * 4 + 1, { octaves: 3, period: 4, seed: seed + 18 }));
        const sand = tex1(x, y, seed + 71) * 0.55 + tex1(x >> 1, y >> 1, seed + 72) * 0.45;
        grain[i] = sand;
        stone[i] = clamp(peb * 1.2 + flakeH[i] * 0.3 + grit * 0.45 + smoothstep(0.55, 0.95, clod) * 0.45);
        hf[i] = clamp(
          0.3 +
            clod * 0.42 +
            peb * 0.3 +
            flakeH[i] * 0.1 +
            grit * 0.13 +
            (sand - 0.5) * 0.055 +
            litH[i] * 0.16 -
            crack * 0.15,
        );
      }
    }
    // Cavity from the height field against a blurred copy of itself, at two
    // radii so a pebble's own shadow gap and the wide hollow between clods both
    // get a term. This is the only occlusion the surface has when the canopy has
    // taken the key away, which is most of the time.
    // Three radii, not two: 7 mm for the gap beside a grain, 2.5 cm for a
    // pebble's own seat, and 6 cm for the hollow between clods. The old pair
    // topped out at 2.7 cm, so the clod tier — the one the surface was missing —
    // got no occlusion at all and the whole cavity signal was pebble-scale
    // speckle.
    const b1 = boxBlur(hf, s, s, 3);
    const b2 = boxBlur(hf, s, s, 10);
    const b3 = boxBlur(hf, s, s, 26);
    const cav = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      cav[i] = clamp(0.5 + (hf[i] - b1[i]) * 2.4 + (hf[i] - b2[i]) * 1.7 + (hf[i] - b3[i]) * 1.5);
    }

    const height = pixelTexture(
      s,
      s,
      (x, y, out) => {
        const i = y * s + x;
        out[0] = clamp(hf[i]) * 255;
        out[1] = cav[i] * 255;
        out[2] = clamp(stone[i]) * 255;
        out[3] = clamp(debris[i]) * 255;
      },
      // Fetched five to nine times a pixel inside the march, so this one does
      // not get sixteen anisotropic taps each time.
      { repeat: 1, aniso: 2 },
    );
    // Two stencils, not one. 2.5 mm a texel against 33 mm of relief makes a
    // physically honest one-texel gradient dh * 33 / (2 * 2.5) = 6.6, and at
    // that width the grit tier swamps everything: a 12 cm clod climbs 1.4 cm
    // over 6 cm, which is 0.5 mm per texel, while a 1.5 cm grain climbs 0.4 cm
    // over 4 texels. So the normal map was pure grit and the clod tier — the
    // middle of the three scales the surface is supposed to have — did not
    // appear in the shading at all. The wide difference is taken off the 2.5 cm
    // blur so grit does not contaminate it, and exaggerated about threefold.
    const WIDE = 24;
    const at = (buf, x, y) => buf[(((y % s) + s) % s) * s + (((x % s) + s) % s)];
    const normal = pixelTexture(
      s,
      s,
      (x, y, out) => {
        const i = y * s + x;
        // 4.2, down from 6.2. At 6.2 the fine tiers of this height field encode
        // facets past 45 degrees — the 1.5 cm grit domes alone come to a slope of
        // 1.1 over a two-texel step, and the per-texel sand term adds a third of a
        // unit of pure noise on top — so a large fraction of texels sat at or over
        // the shader's total-slope limit. A normal field pinned at its rail has no
        // range left in it: the shading terminator then falls wherever the height
        // field's level sets run, and on a clod field seen at an oblique angle
        // those are long parallel contours. That is the corrugation the integrated
        // foreground was covered in, and this is where its amplitude comes from.
        const dx = (at(hf, x + 1, y) - at(hf, x - 1, y)) * 4.2 + (at(b2, x + WIDE, y) - at(b2, x - WIDE, y)) * 0.85;
        const dy = (at(hf, x, y + 1) - at(hf, x, y - 1)) * 4.2 + (at(b2, x, y + WIDE) - at(b2, x, y - WIDE)) * 0.85;
        const len = Math.hypot(dx, dy, 1);
        out[0] = ((-dx / len) * 0.5 + 0.5) * 255;
        out[1] = ((-dy / len) * 0.5 + 0.5) * 255;
        out[2] = (1 / len) * 0.5 * 255 + 127.5;
        out[3] = clamp(0.3 + cav[i] * 0.62 + hf[i] * 0.2 - debris[i] * 0.14) * 255;
      },
      { repeat: 1, aniso: ANISO },
    );
    return { height, normal, field: hf, stone, cav, tile: RELIEF_TILE, depth: RELIEF_DEPTH };
  });
}

/**
 * Ripple normal for standing water. Two slow scales only: a fine ripple under a
 * 0.05 roughness is not a sheen, it is a field of hard white glints.
 */
export function rippleMap() {
  return cached('gnd.ripple', () => {
    const s = 256;
    const hf = heightField(s, s, (x, y) => {
      const u = x / s;
      const v = y / s;
      return clamp(
        fbm(u * 4, v * 4, { octaves: 3, period: 4, seed: 301 }) * 0.66 +
          fbm(u * 9 + 3, v * 9 + 7, { octaves: 2, period: 9, seed: 302 }) * 0.34,
      );
    });
    return normalFromHeight(hf, s, s, 1.1, { repeat: 1, aniso: 4 });
  });
}

/**
 * The savanna skyline as it appears in standing water, indexed by the
 * reflected ray's azimuth (u) and elevation (v).
 *
 * The forest version of this card was nearly all trunk and canopy, because a
 * puddle under a closed stand reflects wood up to sixty degrees. Open country
 * is the other way round: a water hole seen from standing height reflects sky
 * almost everywhere, and what puts an edge on the reflection is the thin band
 * along the bottom — distant hills in haze, the grass line, and a handful of
 * flat-topped acacias standing against the sky at irregular spacing. That band
 * lives in the first quarter of v, which is exactly the range a pool three to
 * ten metres from a standing camera actually samples.
 */
export function horizonReflection() {
  return cached('gnd.horizonrefl', () => {
    const w = 512;
    const h = 96;
    const skyLow = rgb(PALETTE.skyHorizon);
    const skyHigh = rgb(PALETTE.skyTop);
    // Hills sit in the haze: a fraction darker and bluer than the horizon sky,
    // never a hard silhouette.
    const hillFar = rgb(0x9aa2a6);
    const hillNear = rgb(0x7d8580);
    // The grass line is the brightest thing on the ground and it is the one
    // warm element in the reflection.
    const grassLine = rgb(0xc9b07a);
    const grassShade = rgb(0x8a7b52);
    const crown = rgb(0x2e3a22);
    const crownLit = rgb(0x5c6a38);
    const trunk = rgb(0x1a150f);
    const rnd = mulberry32(7703);
    const trees = [];
    // Forty trees round the panorama. A pool shows a sixteenth of it, so that
    // is two or three trees in any one reflection — a savanna, not a wood, and
    // every pool still has something standing in it.
    for (let k = 0; k < 40; k++) {
      const far = rnd();
      trees.push({
        u: rnd(),
        // acacia: a wide flat crown on a thin trunk, the crown three to five
        // times wider than it is tall
        top: 0.06 + (1 - far) ** 1.6 * 0.2,
        wid: 0.004 + (1 - far) ** 1.6 * 0.03,
        haze: 0.35 + (1 - far) * 0.65,
        lit: rnd(),
        seed: rnd() * 10,
      });
    }
    return pixelTexture(
      w,
      h,
      (x, y, out) => {
        const u = x / w;
        const v = y / h; // 0 at the horizon, 1 at the zenith
        let c = mixRgb(skyLow, skyHigh, smoothstep(0.02, 0.85, v));
        // Distant hills: two ridgelines in haze, the nearer one darker.
        const ridgeFar = 0.035 + fbm(u * 5 + 3, 1.7, { octaves: 3, period: 5, seed: 31 }) * 0.045;
        const ridgeNear = 0.012 + fbm(u * 8 + 9, 4.1, { octaves: 3, period: 8, seed: 37 }) * 0.03;
        c = mixRgb(c, hillFar, 1 - smoothstep(ridgeFar - 0.006, ridgeFar + 0.006, v));
        c = mixRgb(c, hillNear, 1 - smoothstep(ridgeNear - 0.004, ridgeNear + 0.004, v));
        // The grass line at the very bottom: a sliver, lit.
        const grassTop = 0.006 + fbm(u * 40, 2.2, { octaves: 2, period: 40, seed: 41 }) * 0.008;
        c = mixRgb(c, mixRgb(grassShade, grassLine, fbm(u * 24, 0.5, { octaves: 2, period: 24, seed: 43 })), 1 - smoothstep(grassTop - 0.003, grassTop + 0.003, v));
        for (const t of trees) {
          let du = u - t.u;
          if (du > 0.5) du -= 1;
          if (du < -0.5) du += 1;
          const adu = Math.abs(du);
          if (adu > t.wid * 1.2) continue;
          // crown: a flattened dome, ragged along its underside, sitting on the
          // top third of the trunk
          const crownBase = t.top * 0.62;
          const edge = 1 - (adu / t.wid) ** 2;
          const rag = fbm(du * 60 + t.seed, v * 30, { octaves: 2, period: 60, seed: 47 }) - 0.5;
          const crownTop = crownBase + (t.top - crownBase) * Math.max(0, edge + rag * 0.25);
          const inCrown = v > crownBase - 0.01 + rag * 0.02 && v < crownTop ? 1 : 0;
          const trunkW = t.wid * 0.06;
          const inTrunk = adu < trunkW && v < crownBase + 0.01 ? 1 : 0;
          const k = Math.max(inCrown, inTrunk) * t.haze;
          const lit = smoothstep(-t.wid * 0.2, t.wid * 0.7, du) * t.lit * inCrown;
          c = mixRgb(c, mixRgb(inTrunk ? trunk : crown, crownLit, lit * 0.7), k);
        }
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = 255;
      },
      // No mip chain, for the reason the forest card had none: the tree band is
      // a tenth of the card tall and a mip-filtered reflection is a flat plate.
      { srgb: true, repeat: [1, 1], aniso: 1, mips: false },
    );
  });
}

// ---------------------------------------------------------------------------
// The far hills. Tiled at about 90 m over a mesh that runs out to a kilometre
// and a half, so all it has to carry is the two things that read at that
// range through the haze: dry grass, and the dark speckle of bush and scattered
// trees on it, thicker in the drainage lines.
// ---------------------------------------------------------------------------

export function farGroundMap() {
  return cached('gnd.far', () => {
    const s = 256;
    const grassPale = rgb(0xc4ad78);
    const grass = rgb(0xa8905c);
    const grassDark = rgb(0x7f6d46);
    const bush = rgb(0x3f4428);
    const bushLit = rgb(0x66683a);
    const bare = rgb(0x8f5f3c);
    return pixelTexture(
      s,
      s,
      (x, y, out) => {
        const u = x / s;
        const v = y / s;
        const big = fbm(u * 3 + 2, v * 3 + 7, { octaves: 3, period: 3, seed: 601 });
        const mid = fbm(u * 9 + 4, v * 9 + 1, { octaves: 3, period: 9, seed: 603 });
        let c = mixRgb(grassDark, grass, smoothstep(0.3, 0.6, big));
        c = mixRgb(c, grassPale, smoothstep(0.5, 0.8, mid) * 0.6);
        // bare red earth where the grass has gone
        c = mixRgb(c, bare, smoothstep(0.62, 0.8, fbm(u * 6 + 11, v * 6 + 3, { octaves: 3, period: 6, seed: 605 })) * 0.5);
        // bush: worley cells as individual crowns, gated by a slow field so
        // they gather along the lines a drainage would follow
        const w = worley(u * 48, v * 48, 48, 607);
        const gather = smoothstep(0.42, 0.7, fbm(u * 4 + 1, v * 4 + 9, { octaves: 3, period: 4, seed: 609 }));
        const crown = smoothstep(0.34, 0.18, w.f1) * smoothstep(0.55, 0.75, w.id + gather * 0.3) * (0.4 + gather * 0.6);
        c = mixRgb(c, mixRgb(bush, bushLit, w.id), crown);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = 255;
      },
      { srgb: true, repeat: 1, aniso: 4 },
    );
  });
}

export { EARTH as GROUND_COLOURS };
