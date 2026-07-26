import { PALETTE } from '../palette.js';
import { cached, clamp, fbm, heightField, mixRgb, pixelTexture, ridged, smoothstep, worley } from './core.js';

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

// Damp compacted earth, keyed off the palette's ground range and never above
// it. The whole surface used to sit two stops brighter than this "so it would
// survive the tone map", which is what made the trail read as beach sand: at
// exposure 1.34 under a 7.6 sun, an albedo near 0.5 linear is already at the
// top of the ACES shoulder and every bit of aggregate in it clips flat.
//
// Value order, darkest first, so the histogram is easy to keep honest:
//   wet 0.013 · damp 0.021 · dirtDark 0.032 · dirt 0.071 · dirtLight 0.105
//   dustLight 0.156 · dustPale 0.21   (linear luminance)
// Anything at dustPale is a rare dry crown patch, not the base value.
const EARTH = {
  dustPale: 0x99805f,
  dustLight: 0x84694c, // PALETTE.dirtLight — the *lightest* common dirt
  dirtLight: 0x6e5740,
  dirt: 0x5c4936, // PALETTE.dirt
  dirtDark: 0x3b3025,
  // The damp end goes olive-grey, not darker brown. Wet forest soil is full of
  // decayed organics and its chroma collapses as it soaks; keeping the warm hue
  // all the way down was a large part of why the trail read as terracotta under
  // a golden-hour key.
  damp: 0x2a2822,
  wet: 0x1b1a17, // the polished floor of a rut
  clay: 0x74502f, // PALETTE.clay
  // Aggregate. Dirt-road stones are wet, half-buried and coated in the same
  // fines as the matrix, so they are mostly *darker* than it. Near-white
  // quartz exists but at a few per cent of the stones, never as a field of
  // speckle — that speckle was reading as salt over the whole trail.
  stone: 0x8a8478, // top few per cent only
  stoneMid: 0x5d5749,
  stoneDark: 0x3d382e,
  stoneWet: 0x231f1a,
  // The forest floor has to be a different *hue* from the trail, not just a
  // different value. At a red/blue ratio of 1.7 it was as brown as the road, so
  // the trail had no edge to read against and the whole frame was one expanse of
  // dirt. Needle litter over damp humus is a cool olive.
  litter: 0x4d4735,
  litterDark: 0x27261e,
  leafDry: 0x7d6539,
  twig: 0x4b3c28,
  chip: 0x2a2119, // bark chip / needle fragment pressed into the dirt
  moss: 0x53663a,
  grassDry: 0x8d7d49,
  grass: 0x5c6b34,
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
 * The palette's browns sit at a red/blue ratio near 1.75, the key light is
 * 0xffd2a1 and the grade warms the frame again on top of that. Multiplied
 * through, the trail came out as red laterite. Forest loam is a low-chroma
 * grey-brown — the organic content in it kills the saturation — so the base
 * earth tones get desaturated at source rather than fought further downstream.
 */
const desat = (c, t) => {
  const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
  return mixRgb(c, [l, l, l], t);
};

/** Palette hex to desaturated sRGB bytes. */
const earth = (hex, t = 0.3) => desat(rgb(hex), t);

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
      const crackPatch = smoothstep(0.74, 0.94, fbm(u * 4 + 9, v * 4 + 2, { octaves: 3, period: 4, seed: seed + 41 }));
      crack[i] = smoothstep(0.05, 0.008, c.f2 - c.f1) * crackPatch * (0.5 + c.id * 0.5);
      // damp is the *base* condition of this surface, not an accent: two thirds
      // of the tile sits somewhere in it
      damp[i] = smoothstep(0.3, 0.72, fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: seed + 12 }));
      clayMask[i] = smoothstep(0.44, 0.8, fbm(u * 3, v * 3, { octaves: 3, period: 3, seed: seed + 30 }));
      // dry powdered fines: the only light thing here, so it stays rare
      dust[i] = smoothstep(0.62, 0.9, fbm(u * 6 + 4, v * 6 + 7, { octaves: 3, period: 6, seed: seed + 55 }));
      height[i] = clamp(
        0.12 +
          clods * 0.44 +
          (sand - 0.5) * 0.1 +
          grit[i] * 0.2 +
          stone[i] * 0.5 +
          rim[i] * 0.1 -
          crack[i] * 0.42 +
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
    const pale = earth(EARTH.dustPale, 0.4);
    const dustLight = earth(EARTH.dustLight, 0.4);
    const light = earth(EARTH.dirtLight, 0.4);
    const mid = earth(EARTH.dirt, 0.4);
    const dark = earth(EARTH.dirtDark, 0.4);
    const damp = earth(EARTH.damp, 0.2);
    const wet = earth(EARTH.wet, 0.2);
    const clay = earth(EARTH.clay, 0.28);
    const chip = rgb(EARTH.chip);
    const twig = rgb(EARTH.twig);
    const agg = {
      wet: earth(EARTH.stoneWet, 0.4),
      dark: earth(EARTH.stoneDark, 0.4),
      mid: earth(EARTH.stoneMid, 0.4),
      pale: earth(EARTH.stone, 0.4),
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
        // Clay is the most saturated thing in the earth range and it stacks with
        // the warm bounce and the warm macro tint in the shader; at 0.5 the three
        // together took the trail to red laterite.
        c = mixRgb(c, clay, f.clayMask[i] * 0.26);
        // Damp first, and hard: this is the base condition of the surface, and
        // it is what separates dirt from sand. Everything after it is aggregate
        // sitting in damp earth rather than tint layered on dry dust.
        c = mixRgb(c, damp, dampness * 0.56);
        c = mixRgb(c, wet, smoothstep(0.78, 1.0, dampness) * 0.45);
        // Grain in the albedo, not only in the normal map. Most of this surface
        // is in shade in most shots, and a normal map does nothing under flat
        // ambient light — the detail has to be in the colour to survive.
        const grain = fbm(u * 72, v * 72, { octaves: 3, period: 72, seed: seed + 88 });
        const sparkle = tex1(x, y, seed + 90);
        // dry fines are the only light thing on the surface, so they are gated
        // on the *absence* of damp as well as on their own mask
        c = mixRgb(c, pale, f.dust[i] * (1 - dampness) * (0.24 + grain * 0.4));
        c = mixRgb(c, dustLight, f.dust[i] * (1 - dampness) * 0.3);
        c = mixRgb(c, aggregateColour(f.stoneId[i], dampness, agg), f.stone[i] * 0.72);
        c = mixRgb(c, aggregateColour(f.gritId[i] + 0.31, dampness * 0.6, agg), f.grit[i] * 0.5);
        // dirt banked up against the stone, and the shadow line where it meets
        c = mixRgb(c, mixRgb(light, dark, 0.55), f.rim[i] * 0.4);
        c = mixRgb(c, mixRgb(chip, twig, tex1(x >> 2, y >> 2, seed + 91)), f.chip[i] * 0.78);
        c = mixRgb(c, mixRgb(wet, dark, 0.35), f.crack[i] * 0.9);
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
        out[3] =
          clamp(0.99 - dampness * 0.46 - smoothstep(0.7, 1.0, dampness) * 0.2 - f.stone[i] * 0.3 - h * 0.05) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, N, N, 6.4, (x, y) => {
      const i = y * N + x;
      // stones occlude the dirt they sit in, cracks occlude themselves
      return 0.6 + hf[i] * 0.44 - f.crack[i] * 0.5 - f.rim[i] * 0.26 - f.chip[i] * 0.18;
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
      wet: earth(EARTH.stoneWet, 0.44),
      dark: earth(EARTH.stoneDark, 0.44),
      mid: earth(EARTH.stoneMid, 0.44),
      pale: earth(EARTH.stone, 0.44),
      clay: earth(EARTH.clay, 0.3),
    };
    const dirt = earth(EARTH.dirt, 0.4);
    const dirtLight = earth(EARTH.dirtLight, 0.4);
    const dark = earth(EARTH.dirtDark, 0.4);
    const damp = earth(EARTH.damp, 0.2);
    const grass = rgb(EARTH.grass);
    const dry = rgb(EARTH.grassDry);
    const twig = rgb(EARTH.twig);
    const chip = rgb(EARTH.chip);
    const moss = rgb(EARTH.moss);
    const pine = rgb(PALETTE.pineNeedle);
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
        c = mixRgb(c, mixRgb(grass, dry, pid), veg[i] * (0.26 + blade[i] * 0.5));
        c = mixRgb(c, mixRgb(moss, pine, 0.45), mossMask[i] * (1 - peb[i]) * 0.5);
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
// Forest floor: needle litter, dry leaves, moss, twigs, soil showing through.
// ---------------------------------------------------------------------------

export function litterMaps(seed = 41) {
  return cached('gnd.litter.' + seed, () => {
    const n = M * M;
    const hf = new Float32Array(n);
    const leaf = new Float32Array(n);
    const leafId = new Float32Array(n);
    const mossMask = new Float32Array(n);
    const twig = new Float32Array(n);
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        const l = worley(u * 15, v * 15, 15, seed + 31);
        // fallen leaves are 3-5 cm plates with an edge, not specks
        const lump = fbm(u * 44, v * 44, { octaves: 2, period: 44, seed: seed + 33 }) - 0.5;
        const rad = 0.16 + ((l.id * 61.7) % 1) * 0.2 + lump * 0.18;
        leaf[i] = smoothstep(rad, rad - 0.07, l.f1) * smoothstep(0.34, 0.46, l.id);
        leafId[i] = l.id;
        mossMask[i] = smoothstep(0.3, 0.72, fbm(u * 5, v * 5, { octaves: 4, period: 5, seed: seed + 15 }));
        // needles read as fine crossed streaks
        const n1 = ridged(u * 64 + v * 18, v * 26, { octaves: 2, period: 64, seed: seed + 1 });
        const n2 = ridged(v * 64 - u * 16, u * 26, { octaves: 2, period: 64, seed: seed + 2 });
        const needle = Math.max(n1, n2);
        twig[i] = smoothstep(0.82, 0.99, needle);
        const base = fbm(u * 12, v * 12, { octaves: 4, period: 12, seed });
        const sand = tex1(x, y, seed + 52) * 0.6 + tex1(x >> 1, y >> 1, seed + 53) * 0.4;
        hf[i] = clamp(base * 0.42 + needle * 0.3 + leaf[i] * 0.26 + (sand - 0.5) * 0.14);
      }
    }
    const litter = rgb(EARTH.litter);
    const litterDark = rgb(EARTH.litterDark);
    const leafDry = rgb(EARTH.leafDry);
    const twigCol = rgb(EARTH.twig);
    const moss = rgb(EARTH.moss);
    const pine = rgb(PALETTE.pineNeedle);
    const soil = rgb(EARTH.dirtDark);
    const mean = meanTracker();
    const map = pixelTexture(
      M,
      M,
      (x, y, out) => {
        const i = y * M + x;
        const u = x / M;
        const v = y / M;
        const h = hf[i];
        let c = mixRgb(litterDark, litter, smoothstep(0.12, 0.72, h));
        c = mixRgb(c, soil, (1 - smoothstep(0.0, 0.3, h)) * 0.5);
        c = mixRgb(c, mixRgb(leafDry, twigCol, ((leafId[i] * 17.9) % 1) * 0.8), leaf[i] * 0.62);
        // The forest floor is cooler and greener than the trail. It is no longer
        // a stop darker: the trail itself is damp compacted earth now, so the
        // two-track reads as the *dark* ribbon and the litter is what it reads
        // against.
        c = mixRgb(c, mixRgb(pine, moss, 0.4), mossMask[i] * 0.82);
        c = mixRgb(c, twigCol, twig[i] * 0.55);
        const g =
          (0.86 + fbm(u * 70, v * 70, { octaves: 2, period: 70, seed: seed + 77 }) * 0.28) *
          (0.88 + skewDark(tex1(x, y, seed + 79), 0.8) * 0.22);
        c = [c[0] * g, c[1] * g, c[2] * g];
        mean.add(c);
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        out[3] = clamp(0.93 - mossMask[i] * 0.16) * 255;
      },
      { srgb: true, repeat: 1, aniso: ANISO },
    );
    const normal = normalAoTexture(hf, M, M, 3.4, (x, y) => {
      const i = y * M + x;
      return 0.42 + hf[i] * 0.62;
    });
    return { map, normal, height: hf, mean: mean.value };
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
        const spread = (v0) => smoothstep(0.34, 0.66, v0);
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
        const block = smoothstep(0.07, 0.19, lug) * (1 - smoothstep(0.81, 0.93, lug));
        const shoulder = smoothstep(0.13, 0.24, cu) * (1 - smoothstep(0.4, 0.47, cu));
        const centre = (1 - smoothstep(0.03, 0.11, cu)) * smoothstep(0.2, 0.34, (v * rows * 2) % 1);
        let p = Math.max(block * shoulder, centre);
        // the print is never clean: patches of it are scuffed out entirely
        p *= 0.45 + fbm(u * 5, v * 5 * rows, { octaves: 4, period: 5, seed: 8 }) * 0.9;
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
        hf[y * w + x] = clamp(0.55 - p * 0.55 + Math.max(0, mx - p) * 0.3);
      }
    }
    // wide range in the AO channel: the terrain shader darkens the albedo with
    // it, and a print that only spans 0.6-1.0 is invisible on dirt
    const normal = normalAoTexture(hf, w, h, 3.6, (x, y) => 0.42 + hf[y * w + x] * 0.95);
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

export { EARTH as GROUND_COLOURS };
