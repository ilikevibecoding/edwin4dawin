// Procedural PBR texture library — owner: Fable 3 (materials & textures).
// Every material family gets canvas-generated base color + normal + roughness
// maps (getTextureSet(name) -> { map, normalMap, roughnessMap }).
// Rules honored here:
//  - 100% deterministic: every generator owns a `new Rng(fixedSeed)`; no
//    Math.random anywhere, so the world is pixel-identical every run.
//  - Seamless tiling: all noise lattices wrap, all patterns are period-exact
//    (integer frequencies / integer cell counts across the tile).
//  - No baked directional lighting: only albedo variation, normal, roughness.
//  - Color maps are sRGB; normal + roughness maps stay linear.
//  - Lazy: nothing generates until a material first asks for its set; results
//    are cached by name. Sizes: architectural tileables 512, utility 256.

import * as THREE from 'three';
import { Rng } from '../core/rng.js';
import { qualityPreset } from '../core/settings.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ toolkit

export function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function frac(x) { return x - Math.floor(x); }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function smooth(t) { return t * t * (3 - 2 * t); }
// triangle wave 0..1..0 with period 1
function tri(x) { const f = frac(x); return f < 0.5 ? f * 2 : 2 - f * 2; }

// Deterministic per-cell hash (stable regardless of pixel order).
function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + (seed | 0) * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Seamless value noise on a wrapping lattice. Sample with (u, v) in tile
// space; any integer coordinate multiple also tiles. Anisotropic lattices
// (periodX != periodY) give stretched grain (wood fibre, brushed metal).
export function makeValueNoise(rng, periodX, periodY = periodX) {
  const px = Math.max(1, Math.round(periodX));
  const py = Math.max(1, Math.round(periodY));
  const g = new Float32Array(px * py);
  for (let i = 0; i < g.length; i++) g[i] = rng.random();
  return (u, v) => {
    const x = frac(u) * px, y = frac(v) * py;
    const x0 = Math.floor(x) % px, y0 = Math.floor(y) % py;
    const fx = smooth(x - Math.floor(x)), fy = smooth(y - Math.floor(y));
    const x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const a = g[y0 * px + x0], b = g[y0 * px + x1];
    const c = g[y1 * px + x0], d = g[y1 * px + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// Fractal brownian motion over wrapped value noise. `period` may be a number
// or [periodX, periodY]. Output normalized to ~0..1.
export function makeFbm(rng, { octaves = 4, period = 4, gain = 0.55, lacunarity = 2 } = {}) {
  const layers = [];
  let [pu, pv] = Array.isArray(period) ? period : [period, period];
  let amp = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    layers.push({ n: makeValueNoise(rng, pu, pv), a: amp });
    norm += amp; amp *= gain; pu *= lacunarity; pv *= lacunarity;
  }
  const inv = 1 / norm;
  return (u, v) => {
    let s = 0;
    for (let i = 0; i < layers.length; i++) s += layers[i].n(u, v) * layers[i].a;
    return s * inv;
  };
}

// Sobel height -> tangent-space normal map canvas. Accepts a height field
// ({ data: Float32Array, size }) or a canvas whose red channel is height.
// Wrapped edges keep the result seamless. Convention matches three.js
// (OpenGL-style green, flipY canvas upload).
export function normalFromHeight(height, strength = 4) {
  let data, size;
  if (height && height.data) { ({ data, size } = height); }
  else {
    size = height.width;
    const px = height.getContext('2d').getImageData(0, 0, size, size).data;
    data = new Float32Array(size * size);
    for (let i = 0; i < data.length; i++) data[i] = px[i * 4] / 255;
  }
  const out = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = ((y - 1) + size) % size, yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = ((x - 1) + size) % size, xp = (x + 1) % size;
      const tl = data[ym * size + xm], tc = data[ym * size + x], tr = data[ym * size + xp];
      const ml = data[y * size + xm], mr = data[y * size + xp];
      const bl = data[yp * size + xm], bc = data[yp * size + x], br = data[yp * size + xp];
      const dx = (tr + 2 * mr + br - tl - 2 * ml - bl) * 0.25;
      const dy = (bl + 2 * bc + br - tl - 2 * tc - tr) * 0.25;
      const nx = -dx * strength, ny = dy * strength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const j = (y * size + x) * 4;
      out[j] = (nx * inv * 0.5 + 0.5) * 255;
      out[j + 1] = (ny * inv * 0.5 + 0.5) * 255;
      out[j + 2] = (inv * 0.5 + 0.5) * 255;
      out[j + 3] = 255;
    }
  }
  const c = makeCanvas(size);
  c.getContext('2d').putImageData(new ImageData(out, size, size), 0, 0);
  return c;
}

function canvasFromRGBA(data, size) {
  const c = makeCanvas(size);
  c.getContext('2d').putImageData(new ImageData(data, size, size), 0, 0);
  return c;
}

function toTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = qualityPreset().anisotropy || 1;
  return t;
}

// Core baker: runs `pixel(u, v, out)` per texel where out = [r, g, b (0-255),
// roughness (0-1), height (0-1)], then emits the three maps. `post(buf)` can
// stamp features (cracks…) into the raw buffers before encoding.
function bake(size, pixel, { normalStrength = 4, post = null } = {}) {
  const n = size * size;
  const alb = new Uint8ClampedArray(n * 4);
  const rgh = new Uint8ClampedArray(n * 4);
  const hgt = new Float32Array(n);
  const out = new Float32Array(5);
  const inv = 1 / size;
  for (let y = 0, i = 0; y < size; y++) {
    const v = y * inv;
    for (let x = 0; x < size; x++, i++) {
      pixel(x * inv, v, out);
      const j = i * 4;
      alb[j] = out[0]; alb[j + 1] = out[1]; alb[j + 2] = out[2]; alb[j + 3] = 255;
      const rr = clamp01(out[3]) * 255;
      rgh[j] = rr; rgh[j + 1] = rr; rgh[j + 2] = rr; rgh[j + 3] = 255;
      hgt[i] = out[4];
    }
  }
  const buf = { size, alb, rgh, hgt };
  if (post) post(buf);
  return {
    map: toTexture(canvasFromRGBA(alb, size), true),
    normalMap: toTexture(normalFromHeight({ data: hgt, size }, normalStrength), false),
    roughnessMap: toTexture(canvasFromRGBA(rgh, size), false),
  };
}

// Random-walk hairline cracks stamped into height + albedo. Writes wrap, so
// a crack leaving one edge continues on the opposite edge (stays seamless).
function stampCracks(buf, rng, { count = 3, depth = 0.4, tint = -13, tintB = null } = {}) {
  const { size, alb, hgt } = buf;
  const tb = tintB === null ? tint : tintB;
  const put = (xi, yi, d, t) => {
    xi = ((xi % size) + size) % size;
    yi = ((yi % size) + size) % size;
    const i = yi * size + xi, j = i * 4;
    hgt[i] -= d;
    alb[j] += t; alb[j + 1] += t; alb[j + 2] += (t === tint ? tb : t);
  };
  for (let c = 0; c < count; c++) {
    let x = rng.random() * size, y = rng.random() * size;
    let ang = rng.random() * TAU;
    const steps = Math.floor(size * rng.range(0.25, 0.6));
    for (let s = 0; s < steps; s++) {
      ang += (rng.random() - 0.5) * 0.32;
      x += Math.cos(ang); y += Math.sin(ang);
      const xi = Math.round(x), yi = Math.round(y);
      put(xi, yi, depth, tint);
      put(xi + 1, yi, depth * 0.35, tint * 0.4);
      put(xi, yi + 1, depth * 0.35, tint * 0.4);
    }
  }
}

// -------------------------------------------------------- family generators

// Painted drywall / plaster: subtle roller-nap normal, faint low-frequency
// mottle, sparse scuff smudges that also lower roughness a touch.
function paintedWall({ seed, base, roughBase = 0.9, mottle = 0.045, rollerPeriod = 96, rollerAmp = 1, size = 512 }) {
  const rng = new Rng(seed);
  const mot = makeFbm(rng, { octaves: 3, period: 4 });
  const roller = makeFbm(rng, { octaves: 2, period: rollerPeriod, gain: 0.55 });
  const scuff = makeFbm(rng, { octaves: 3, period: 9, gain: 0.6 });
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const mv = mot(u, v);
    const ro = roller(u, v);
    const sMask = Math.max(0, scuff(u, v) - 0.63) * 2.4;
    const shade = (1 + (mv - 0.5) * 2 * mottle) * (1 - sMask * 0.05);
    out[0] = br * shade; out[1] = bg * shade; out[2] = bb * shade;
    out[3] = roughBase + (ro - 0.5) * 0.07 - sMask * 0.1;
    out[4] = ro * 0.7 * rollerAmp + mv * 0.3;
    // audit 2: 2.6 read as heavy stucco whenever a wall filled the frame
  }, { normalStrength: 1.4 });
}

// Acoustic ceiling tile: 0.6 m T-bar grid inside the 1.2 m texture, fissured
// mineral-fibre face with pinhole speckle.
function ceilingTile({ seed, size = 512 }) {
  const rng = new Rng(seed);
  const fis = makeFbm(rng, { octaves: 3, period: 48, gain: 0.6 });
  const mot = makeFbm(rng, { octaves: 2, period: 4 });
  return bake(size, (u, v, out) => {
    const tu = frac(u * 2), tv = frac(v * 2);
    const dm = Math.min(tu, 1 - tu, tv, 1 - tv) * 0.6; // meters to grid line
    const m = 1 + (mot(u, v) - 0.5) * 0.05;
    if (dm < 0.008) { // painted T-bar
      out[0] = 197 * m; out[1] = 199 * m; out[2] = 196 * m;
      out[3] = 0.55; out[4] = 0.18;
      return;
    }
    const f = fis(u, v);
    let h = 0.55 + f * 0.45;
    let dark = 0;
    if (hash2(Math.floor(u * 168), Math.floor(v * 168), seed) < 0.055) { h -= 0.35; dark = 16; }
    h *= 0.4 + 0.6 * clamp01((dm - 0.008) / 0.014); // recess toward grid
    const shade = m * (0.97 + f * 0.05);
    out[0] = 208 * shade - dark; out[1] = 211 * shade - dark; out[2] = 205 * shade - dark;
    out[3] = 0.96;
    out[4] = h;
  }, { normalStrength: 2.6 });
}

// Commercial loop-pile carpet: per-loop tone picking from a small palette +
// low-frequency heather. Exec variant folds in a herringbone band pattern;
// worn variant flattens the pile and lightens traffic patches.
function carpetGen({ seed, tones, herringbone = false, worn = false, size = 512 }) {
  const rng = new Rng(seed);
  const loop = makeValueNoise(rng, 224);
  const loop2 = makeValueNoise(rng, 112);
  const heather = makeFbm(rng, { octaves: 3, period: 5 });
  const [tA, tB, tC] = tones;
  return bake(size, (u, v, out) => {
    const n1 = loop(u, v), n2 = loop2(u, v);
    const t = n1 * 0.65 + n2 * 0.35;
    const tone = t < 0.38 ? tB : (t > 0.66 ? tC : tA);
    let shade = 0.955 + heather(u, v) * 0.09;
    let h = n1 * 0.55 + n2 * 0.45;
    if (herringbone) {
      const col = Math.floor(u * 20);
      const s = (col & 1) ? (u * 20 + v * 20) : (u * 20 - v * 20);
      const stripe = tri(s);
      shade *= 0.97 + stripe * 0.06;
      h = h * 0.75 + stripe * 0.25;
    }
    if (worn) {
      const w = Math.max(0, heather(v, u) - 0.5) * 2;
      shade *= 1 + w * 0.1;
      h *= 1 - w * 0.5;
    }
    out[0] = tone[0] * shade; out[1] = tone[1] * shade; out[2] = tone[2] * shade;
    out[3] = 0.98;
    out[4] = h;
  }, { normalStrength: 1.9 });
}

// Sheet vinyl: faint large mottle, tiny chips, slight sheen with variation.
function vinylGen({ seed, base, size = 512 }) {
  const rng = new Rng(seed);
  const mot = makeFbm(rng, { octaves: 3, period: 5 });
  const fine = makeValueNoise(rng, 160);
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const m = mot(u, v), f = fine(u, v);
    const chip = hash2(Math.floor(u * 200), Math.floor(v * 200), seed);
    let shade = 0.96 + m * 0.07 + (f - 0.5) * 0.02;
    if (chip < 0.03) shade *= 0.93;
    else if (chip > 0.975) shade *= 1.06;
    out[0] = br * shade; out[1] = bg * shade; out[2] = bb * shade;
    out[3] = 0.5 + (m - 0.5) * 0.14 + (f - 0.5) * 0.04;
    out[4] = 0.5 + (m - 0.5) * 0.2 + (f - 0.5) * 0.06;
  }, { normalStrength: 1.6 });
}

// Ceramic tile: N×N grid with recessed rough grout, per-tile tone shift,
// gently wavy glazed faces.
function ceramicGen({ seed, tiles, base, grout, roughFace, groutFrac = 0.016, toneVar = 0.06, size = 512 }) {
  const rng = new Rng(seed);
  const wave = makeFbm(rng, { octaves: 2, period: tiles * 2, gain: 0.5 });
  const gn = makeValueNoise(rng, 128);
  return bake(size, (u, v, out) => {
    const tu = u * tiles, tv = v * tiles;
    const ti = Math.floor(tu) % tiles, tj = Math.floor(tv) % tiles;
    const fx = tu - Math.floor(tu), fy = tv - Math.floor(tv);
    const d = Math.min(fx, 1 - fx, fy, 1 - fy);
    const g = gn(u, v);
    if (d < groutFrac) {
      const shade = 0.9 + g * 0.2;
      out[0] = grout[0] * shade; out[1] = grout[1] * shade; out[2] = grout[2] * shade;
      out[3] = 0.93; out[4] = 0.25 + g * 0.1;
      return;
    }
    const w = wave(u, v);
    const bevel = clamp01((d - groutFrac) / 0.03);
    const shade = (1 + (hash2(ti, tj, seed) - 0.5) * 2 * toneVar) * (0.98 + (w - 0.5) * 0.05);
    out[0] = base[0] * shade; out[1] = base[1] * shade; out[2] = base[2] * shade;
    out[3] = roughFace + (w - 0.5) * 0.08 + (1 - bevel) * 0.06;
    out[4] = (0.7 + w * 0.3) * (0.55 + 0.45 * bevel);
  }, { normalStrength: 3.6 });
}

// Lobby floor: polished terrazzo/porcelain, 0.8 m tiles (3×3 in the 2.4 m
// texture), two scales of aggregate speckle, low roughness with variation.
function terrazzoGen({ seed, size = 512 }) {
  const rng = new Rng(seed);
  const wave = makeFbm(rng, { octaves: 2, period: 6, gain: 0.5 });
  const specks = [[121, 129, 135], [96, 101, 106], [189, 195, 199], [210, 213, 215], [134, 144, 152]];
  return bake(size, (u, v, out) => {
    const tu = u * 3, tv = v * 3;
    const ti = Math.floor(tu) % 3, tj = Math.floor(tv) % 3;
    const fx = tu - Math.floor(tu), fy = tv - Math.floor(tv);
    const d = Math.min(fx, 1 - fx, fy, 1 - fy);
    const w = wave(u, v);
    if (d < 0.004) { // tight seam between slabs
      out[0] = 120; out[1] = 124; out[2] = 127; out[3] = 0.6; out[4] = 0.4;
      return;
    }
    let r = 155, g = 163, b = 167;
    const c1 = hash2(Math.floor(u * 240), Math.floor(v * 240), seed + 1);
    const c2 = hash2(Math.floor(u * 96), Math.floor(v * 96), seed + 2);
    if (c2 < 0.06) {
      const s = specks[Math.floor(c2 * 16.6 * specks.length) % specks.length];
      r = r * 0.35 + s[0] * 0.65; g = g * 0.35 + s[1] * 0.65; b = b * 0.35 + s[2] * 0.65;
    } else if (c1 < 0.14) {
      const s = specks[Math.floor(c1 * 7.1 * specks.length) % specks.length];
      r = (r + s[0]) / 2; g = (g + s[1]) / 2; b = (b + s[2]) / 2;
    }
    const shade = (1 + (hash2(ti, tj, seed) - 0.5) * 0.05) * (0.99 + (w - 0.5) * 0.03);
    out[0] = r * shade; out[1] = g * shade; out[2] = b * shade;
    out[3] = 0.24 + (w - 0.5) * 0.07;
    out[4] = 0.9 + w * 0.1;
  }, { normalStrength: 1.4 });
}

// Concrete family: blotchy cement, fine pores, hairline cracks (stamped).
// Options: sealed (lower roughness), wet patches, tire-wear streak lanes
// (albedo darkening only — no directional light baked).
function concreteGen({ seed, base, roughBase, roughVar = 0.12, poreRate = 0.05, cracks = 3, streaks = false, wet = false, size = 512 }) {
  const rng = new Rng(seed);
  const blotch = makeFbm(rng, { octaves: 4, period: 5, gain: 0.55 });
  const fine = makeValueNoise(rng, 200);
  const patch = wet ? makeFbm(rng, { octaves: 3, period: 3 }) : null;
  const streakN = streaks ? makeFbm(rng, { octaves: 3, period: [2, 5], gain: 0.6 }) : null;
  const crackRng = new Rng(seed + 77);
  return bake(size, (u, v, out) => {
    const bl = blotch(u, v), f = fine(u, v);
    let shade = 0.93 + bl * 0.14 + (f - 0.5) * 0.05;
    let h = 0.6 + (bl - 0.5) * 0.35 + (f - 0.5) * 0.12;
    let ro = roughBase + (bl - 0.5) * roughVar + (f - 0.5) * 0.05;
    if (hash2(Math.floor(u * 256), Math.floor(v * 256), seed) < poreRate) {
      h -= 0.3; shade *= 0.9; ro += 0.05;
    }
    let r = base[0] * shade, g = base[1] * shade, b = base[2] * shade;
    if (streaks) {
      const du1 = frac(u) - 0.32, du2 = frac(u) - 0.72;
      const lane = Math.exp(-(du1 * du1) / 0.0056) + Math.exp(-(du2 * du2) / 0.0056);
      const dark = clamp01(lane * (streakN(u, v) * 1.3 - 0.25)) * 0.3;
      r *= 1 - dark; g *= 1 - dark; b *= 1 - dark;
      ro = Math.min(1, ro + dark * 0.1);
    }
    if (wet) {
      const p = clamp01((patch(u, v) - 0.52) * 5);
      r *= 1 - p * 0.3; g *= 1 - p * 0.3; b *= 1 - p * 0.27;
      ro = ro * (1 - p) + 0.14 * p;
    }
    out[0] = r; out[1] = g; out[2] = b;
    out[3] = ro; out[4] = h;
  }, {
    normalStrength: 2.4,
    post: (buf) => stampCracks(buf, crackRng, { count: cracks, depth: 0.4, tint: -13 }),
  });
}

// Wood veneer: warped vertical ring stripes + elongated fibre noise. Doors
// map one leaf to one tile, so grain runs along v (up the door).
function woodGen({ seed, base, rings, amp, roughBase, fineAmp = 0.12, size = 256 }) {
  const rng = new Rng(seed);
  const warp = makeFbm(rng, { octaves: 3, period: [4, 2], gain: 0.55 });
  const fib = makeValueNoise(rng, 96, 8);
  const drift = makeValueNoise(rng, 3, 2);
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const wv = warp(u, v);
    const f = fib(u, v);
    const s = u * rings + (wv - 0.5) * 2.4 + (drift(u, v) - 0.5) * 1.2;
    let ring = 0.5 + 0.5 * Math.sin(TAU * s);
    ring *= ring;
    const shade = 1.03 - ring * amp - (f - 0.5) * fineAmp * 2;
    out[0] = br * shade; out[1] = bg * shade * 0.985; out[2] = bb * shade * 0.96;
    out[3] = roughBase + ring * 0.09 + (f - 0.5) * 0.06;
    out[4] = 0.6 - ring * 0.25 + (f - 0.5) * 0.2;
  }, { normalStrength: 1.8 });
}

// Powder-coat painted metal: orange-peel micro normal, gentle mottle.
// Options: scuffed (streaky wear), chips (bare-steel paint chips, fire door).
function paintedMetalGen({ seed, base, roughBase, chips = 0, scuffed = false, size = 256 }) {
  const rng = new Rng(seed);
  const peel = makeValueNoise(rng, 96);
  const peel2 = makeValueNoise(rng, 48);
  const mot = makeFbm(rng, { octaves: 2, period: 3, gain: 0.5 });
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const p = peel(u, v) * 0.6 + peel2(u, v) * 0.4;
    let shade = 0.98 + (mot(u, v) - 0.5) * 0.05;
    let ro = roughBase + (p - 0.5) * 0.1;
    let h = 0.5 + (p - 0.5) * 0.5;
    let r = br, g = bg, b = bb;
    if (scuffed) {
      const sc = Math.max(0, mot(v, u) - 0.58) * 2.5;
      shade *= 1 - sc * 0.08;
      ro += sc * 0.15;
    }
    if (chips) {
      const cell = 26;
      const ci = Math.floor(u * cell) % cell, cj = Math.floor(v * cell) % cell;
      if (hash2(ci, cj, seed) < chips) {
        const cx = 0.25 + hash2(ci, cj, seed + 1) * 0.5;
        const cy = 0.25 + hash2(ci, cj, seed + 2) * 0.5;
        const lx = frac(u * cell) - cx, ly = frac(v * cell) - cy;
        const dd = Math.sqrt(lx * lx + ly * ly);
        const rr = 0.12 + hash2(ci, cj, seed + 3) * 0.16;
        if (dd < rr) { r = 122; g = 126; b = 129; ro = 0.42; h -= 0.35; shade = 1; }
        else if (dd < rr + 0.08) shade *= 0.82;
      }
    }
    out[0] = r * shade; out[1] = g * shade; out[2] = b * shade;
    out[3] = ro; out[4] = h;
  }, { normalStrength: 1.3 });
}

// Brushed / raw metals: anisotropic streaks in roughness + albedo, soft
// smudge mottle. Streaks run along u.
function brushedGen({ seed, base, roughBase, roughVar, size = 256 }) {
  const rng = new Rng(seed);
  const s1 = makeValueNoise(rng, 3, 160);
  const s2 = makeValueNoise(rng, 6, 220);
  const smudge = makeFbm(rng, { octaves: 3, period: 3, gain: 0.55 });
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const a = s1(u, v), b2 = s2(u, v), m = smudge(u, v);
    const shade = 0.97 + (a - 0.5) * 0.09 + (m - 0.5) * 0.04;
    out[0] = br * shade; out[1] = bg * shade; out[2] = bb * shade;
    out[3] = roughBase + (a - 0.5) * roughVar + (b2 - 0.5) * roughVar * 0.7 + (m - 0.5) * 0.06;
    out[4] = 0.5 + (a - 0.5) * 0.3 + (b2 - 0.5) * 0.15;
  }, { normalStrength: 1.0 });
}

// Injection-molded plastic: fine grain + subtle mottle.
function plasticGen({ seed, base, roughBase, size = 256 }) {
  const rng = new Rng(seed);
  const grain = makeValueNoise(rng, 128);
  const mot = makeFbm(rng, { octaves: 2, period: 3 });
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const g = grain(u, v), m = mot(u, v);
    const shade = 0.98 + (m - 0.5) * 0.05 + (g - 0.5) * 0.03;
    out[0] = br * shade; out[1] = bg * shade; out[2] = bb * shade;
    out[3] = roughBase + (g - 0.5) * 0.08;
    out[4] = 0.5 + (g - 0.5) * 0.3;
  }, { normalStrength: 1.0 });
}

// Pebbled rubber.
function rubberGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const peb = makeFbm(rng, { octaves: 2, period: 64, gain: 0.6 });
  return bake(size, (u, v, out) => {
    const p = peb(u, v);
    const shade = 0.95 + p * 0.1;
    out[0] = 36 * shade; out[1] = 39 * shade; out[2] = 41 * shade;
    out[3] = 0.94 + (p - 0.5) * 0.06;
    out[4] = p;
  }, { normalStrength: 2.2 });
}

// Upholstery fabric: period-exact weave + fuzz.
function fabricGen({ seed, base, threads = 110, size = 256 }) {
  const rng = new Rng(seed);
  const fuzz = makeValueNoise(rng, 96);
  const mot = makeFbm(rng, { octaves: 2, period: 4 });
  const [br, bg, bb] = base;
  return bake(size, (u, v, out) => {
    const wa = 0.5 + 0.5 * Math.sin(TAU * u * threads);
    const we = 0.5 + 0.5 * Math.sin(TAU * v * threads);
    const weave = (wa * wa + we * we) * 0.5;
    const f = fuzz(u, v);
    const shade = 0.93 + weave * 0.09 + (f - 0.5) * 0.08 + (mot(u, v) - 0.5) * 0.05;
    out[0] = br * shade; out[1] = bg * shade; out[2] = bb * shade;
    out[3] = 0.96;
    out[4] = weave * 0.55 + f * 0.45;
  }, { normalStrength: 1.5 });
}

// Black leather: crinkle grain, roughness broken up by the creases.
function leatherGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const crinkle = makeFbm(rng, { octaves: 4, period: 18, gain: 0.62 });
  const mot = makeFbm(rng, { octaves: 2, period: 3 });
  return bake(size, (u, v, out) => {
    const c = crinkle(u, v), m = mot(u, v);
    const shade = 0.95 + (c - 0.5) * 0.12 + (m - 0.5) * 0.05;
    out[0] = 37 * shade; out[1] = 39 * shade; out[2] = 43 * shade;
    out[3] = 0.5 + (c - 0.5) * 0.25 + (m - 0.5) * 0.06;
    out[4] = c;
  }, { normalStrength: 1.9 });
}

// Office paper: barely-there fibre.
function paperGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const fib = makeValueNoise(rng, 128);
  return bake(size, (u, v, out) => {
    const f = fib(u, v);
    const shade = 0.985 + (f - 0.5) * 0.03;
    out[0] = 232 * shade; out[1] = 230 * shade; out[2] = 221 * shade;
    out[3] = 0.92;
    out[4] = 0.5 + (f - 0.5) * 0.1;
  }, { normalStrength: 0.5 });
}

// Kraft cardboard: fibres elongated along u + recycled flecks.
function cardboardGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const fib = makeValueNoise(rng, 10, 96);
  const mot = makeFbm(rng, { octaves: 2, period: 4 });
  return bake(size, (u, v, out) => {
    const f = fib(u, v), m = mot(u, v);
    let shade = 0.94 + (f - 0.5) * 0.1 + (m - 0.5) * 0.08;
    const fleck = hash2(Math.floor(u * 140), Math.floor(v * 140), seed);
    if (fleck < 0.03) shade *= 0.85;
    out[0] = 170 * shade; out[1] = 142 * shade; out[2] = 100 * shade;
    out[3] = 0.92;
    out[4] = 0.5 + (f - 0.5) * 0.2;
  }, { normalStrength: 0.7 });
}

// Snow: multi-scale bumps; crevices read slightly darker and bluer (albedo
// scatter tint, not baked light). Matte — snow is not shiny.
function snowGen({ seed, size = 512 }) {
  const rng = new Rng(seed);
  const lump = makeFbm(rng, { octaves: 4, period: 3, gain: 0.55 });
  const fine = makeValueNoise(rng, 160);
  return bake(size, (u, v, out) => {
    const L = lump(u, v), f = fine(u, v);
    const h = clamp01(L * 0.85 + f * 0.15);
    const dip = 1 - h;
    out[0] = 225 * (1 - dip * 0.16);
    out[1] = 234 * (1 - dip * 0.12);
    out[2] = 246 * (1 - dip * 0.04);
    out[3] = 0.68 + (f - 0.5) * 0.1;
    out[4] = h;
  }, { normalStrength: 3.6 });
}

// Ice: pale blue, near-mirror smooth with frost streaks + white veins.
function iceGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const streak = makeFbm(rng, { octaves: 3, period: [3, 8], gain: 0.6 });
  const frost = makeValueNoise(rng, 96);
  const veinRng = new Rng(seed + 5);
  return bake(size, (u, v, out) => {
    const s = streak(u, v), f = frost(u, v);
    const frosty = Math.max(0, f - 0.62) * 2.2;
    const shade = 0.96 + (s - 0.5) * 0.08 + frosty * 0.1;
    out[0] = 198 * shade; out[1] = 219 * shade; out[2] = 233 * shade;
    out[3] = 0.13 + (s - 0.5) * 0.1 + frosty * 0.4;
    out[4] = 0.5 + (s - 0.5) * 0.2;
  }, {
    normalStrength: 1.2,
    post: (buf) => stampCracks(buf, veinRng, { count: 6, depth: 0.12, tint: 24, tintB: 28 }),
  });
}

// Ribbed walk-off entry mat: ridges along u, fibrous, dirt-dark in grooves.
function entryMatGen({ seed, size = 256 }) {
  const rng = new Rng(seed);
  const fuzz = makeValueNoise(rng, 128);
  const mot = makeFbm(rng, { octaves: 2, period: 3 });
  return bake(size, (u, v, out) => {
    const rib = tri(v * 24);
    const f = fuzz(u, v);
    const shade = 0.88 + rib * 0.14 + (f - 0.5) * 0.09 + (mot(u, v) - 0.5) * 0.05;
    out[0] = 59 * shade; out[1] = 64 * shade; out[2] = 67 * shade;
    out[3] = 0.97;
    out[4] = rib * 0.75 + f * 0.25;
  }, { normalStrength: 3.2 });
}

// Raised-access server floor: 0.6 m tiles (2×2 in the 1.2 m texture), dark
// edge gap, corner screws, speckled laminate face.
function serverFloorGen({ seed, size = 512 }) {
  const rng = new Rng(seed);
  const speck = makeValueNoise(rng, 220);
  const mot = makeFbm(rng, { octaves: 2, period: 4 });
  return bake(size, (u, v, out) => {
    const tu = u * 2, tv = v * 2;
    const ti = Math.floor(tu) % 2, tj = Math.floor(tv) % 2;
    const fx = tu - Math.floor(tu), fy = tv - Math.floor(tv);
    const d = Math.min(fx, 1 - fx, fy, 1 - fy);
    if (d < 0.006) { // gap between panels
      out[0] = 54; out[1] = 58; out[2] = 62; out[3] = 0.55; out[4] = 0.15;
      return;
    }
    const sp = speck(u, v), m = mot(u, v);
    const tone = 1 + (hash2(ti, tj, seed) - 0.5) * 0.06;
    let r = 125 * tone, g = 131 * tone, b = 137 * tone;
    let ro = 0.55 + (m - 0.5) * 0.12 + (sp - 0.5) * 0.06;
    let h = 0.8 + (sp - 0.5) * 0.08;
    // corner screws ~2.7 cm in from each corner
    const dx = (fx < 0.5 ? fx : 1 - fx) - 0.045;
    const dy = (fy < 0.5 ? fy : 1 - fy) - 0.045;
    const ds = Math.sqrt(dx * dx + dy * dy);
    if (ds < 0.016) {
      r = 150; g = 154; b = 158; ro = 0.4;
      h = 0.86 + (1 - ds / 0.016) * 0.1;
      if (ds < 0.006) { h -= 0.12; r = 120; g = 124; b = 128; }
    }
    h *= 0.6 + 0.4 * clamp01((d - 0.006) / 0.02);
    out[0] = r; out[1] = g; out[2] = b;
    out[3] = ro; out[4] = h;
  }, { normalStrength: 3.2 });
}

// Running-bond brick: 16 courses in the 1.2 m tile, per-brick tone + hue
// variation, recessed mortar.
function brickGen({ seed, size = 512 }) {
  const rng = new Rng(seed);
  const grain = makeValueNoise(rng, 180);
  const mot = makeFbm(rng, { octaves: 3, period: 4 });
  return bake(size, (u, v, out) => {
    const rows = 16, cols = 4;
    const j = Math.floor(v * rows) % rows;
    const fy = frac(v * rows);
    const ru = u * cols + (j % 2) * 0.5;
    const i = Math.floor(ru) % cols;
    const fx = ru - Math.floor(ru);
    const g = grain(u, v), m = mot(u, v);
    const dU = Math.min(fx, 1 - fx), dV = Math.min(fy, 1 - fy);
    if (dV < 0.07 || dU < 0.018) { // mortar
      const shade = 0.92 + g * 0.16;
      out[0] = 166 * shade; out[1] = 160 * shade; out[2] = 150 * shade;
      out[3] = 0.95; out[4] = 0.3 + g * 0.12;
      return;
    }
    const tone = (0.86 + hash2(i, j, seed) * 0.28) * (0.97 + (g - 0.5) * 0.1 + (m - 0.5) * 0.06);
    const hue = hash2(i, j, seed + 9);
    out[0] = 142 * tone; out[1] = (82 + hue * 14) * tone; out[2] = (66 + hue * 10) * tone;
    out[3] = 0.88 + (g - 0.5) * 0.06;
    const bev = clamp01(Math.min((dV - 0.07) / 0.05, (dU - 0.018) / 0.03));
    out[4] = (0.5 + 0.45 * bev) + (g - 0.5) * 0.1;
  }, { normalStrength: 3.4 });
}

// ---------------------------------------------------------------- registry

// Fixed seeds per family — never reuse across entries so palettes stay
// decorrelated. Names mirror the material table in materials.js.
const GENERATORS = {
  // walls
  drywall:        () => paintedWall({ seed: 3101, base: [193, 196, 191], roughBase: 0.9 }),
  drywall_accent: () => paintedWall({ seed: 3102, base: [84, 100, 111], roughBase: 0.88, mottle: 0.05 }),
  drywall_blue:   () => paintedWall({ seed: 3103, base: [148, 163, 176], roughBase: 0.9 }),
  plaster:        () => paintedWall({ seed: 3104, base: [176, 180, 173], roughBase: 0.94, mottle: 0.05, rollerPeriod: 64, rollerAmp: 1.0 }),
  brick:          () => brickGen({ seed: 3280 }),
  // ceilings
  ceiling_tile:   () => ceilingTile({ seed: 3110 }),
  // floors
  carpet:         () => carpetGen({ seed: 3120, tones: [[88, 94, 103], [72, 78, 88], [104, 108, 112]] }),
  carpet_exec:    () => carpetGen({ seed: 3121, tones: [[72, 77, 67], [58, 63, 55], [84, 88, 78]], herringbone: true }),
  carpet_worn:    () => carpetGen({ seed: 3122, tones: [[98, 102, 108], [82, 87, 94], [112, 114, 116]], worn: true }),
  vinyl:          () => vinylGen({ seed: 3130, base: [161, 164, 157] }),
  tile:           () => ceramicGen({ seed: 3140, tiles: 4, base: [186, 194, 196], grout: [148, 150, 146], roughFace: 0.3 }),
  tile_dark:      () => ceramicGen({ seed: 3141, tiles: 4, base: [64, 75, 79], grout: [50, 54, 56], roughFace: 0.42 }),
  tile_restroom:  () => ceramicGen({ seed: 3142, tiles: 6, base: [214, 219, 220], grout: [168, 170, 166], roughFace: 0.26, groutFrac: 0.022 }),
  lobby_floor:    () => terrazzoGen({ seed: 3150 }),
  entry_mat:      () => entryMatGen({ seed: 3260 }),
  server_floor:   () => serverFloorGen({ seed: 3270 }),
  // concrete
  concrete:       () => concreteGen({ seed: 3160, base: [141, 141, 136], roughBase: 0.93, poreRate: 0.05, cracks: 3 }),
  concrete_dark:  () => concreteGen({ seed: 3161, base: [111, 111, 107], roughBase: 0.62, roughVar: 0.2, poreRate: 0.02, cracks: 2 }),
  roof_slab:      () => concreteGen({ seed: 3161, base: [111, 111, 107], roughBase: 0.62, roughVar: 0.2, poreRate: 0.02, cracks: 2 }),
  // service ceilings: lighter + fully matte so downward faces (lit only by
  // the hemisphere ground term) never read as a glossy black void (audit 2)
  concrete_ceiling: () => concreteGen({ seed: 3164, base: [128, 128, 124], roughBase: 0.95, roughVar: 0.04, poreRate: 0.02, cracks: 1 }),
  wet_concrete:   () => concreteGen({ seed: 3162, base: [120, 121, 117], roughBase: 0.9, poreRate: 0.04, cracks: 3, wet: true }),
  garage_floor:   () => concreteGen({ seed: 3163, base: [119, 122, 117], roughBase: 0.88, poreRate: 0.04, cracks: 4, streaks: true }),
  // exterior
  snow:           () => snowGen({ seed: 3170 }),
  ice:            () => iceGen({ seed: 3171 }),
  // woods
  wood:           () => woodGen({ seed: 3180, base: [140, 108, 74], rings: 9, amp: 0.16, roughBase: 0.6 }),
  wood_dark:      () => woodGen({ seed: 3181, base: [96, 71, 49], rings: 11, amp: 0.18, roughBase: 0.58 }),
  laminate:       () => woodGen({ seed: 3182, base: [170, 145, 111], rings: 7, amp: 0.1, roughBase: 0.45, fineAmp: 0.06 }),
  door_office:    () => woodGen({ seed: 3183, base: [120, 89, 62], rings: 6, amp: 0.13, roughBase: 0.55, fineAmp: 0.08 }),
  door_exec:      () => woodGen({ seed: 3184, base: [82, 61, 42], rings: 7, amp: 0.15, roughBase: 0.5, fineAmp: 0.08 }),
  // painted metals
  metal_painted:  () => paintedMetalGen({ seed: 3190, base: [113, 121, 129], roughBase: 0.5 }),
  frame_metal:    () => paintedMetalGen({ seed: 3191, base: [70, 77, 83], roughBase: 0.48 }),
  mullion:        () => paintedMetalGen({ seed: 3192, base: [49, 56, 62], roughBase: 0.42 }),
  door_metal:     () => paintedMetalGen({ seed: 3193, base: [93, 103, 110], roughBase: 0.5, scuffed: true }),
  door_fire:      () => paintedMetalGen({ seed: 3194, base: [124, 64, 57], roughBase: 0.55, chips: 0.05 }),
  // raw metals
  metal_dark:     () => brushedGen({ seed: 3200, base: [61, 67, 72], roughBase: 0.5, roughVar: 0.12 }),
  metal_brushed:  () => brushedGen({ seed: 3201, base: [155, 163, 169], roughBase: 0.34, roughVar: 0.22 }),
  steel:          () => brushedGen({ seed: 3202, base: [182, 188, 192], roughBase: 0.3, roughVar: 0.12 }),
  aluminum:       () => brushedGen({ seed: 3203, base: [196, 201, 204], roughBase: 0.36, roughVar: 0.08 }),
  // prop-scale utility
  plastic_dark:   () => plasticGen({ seed: 3210, base: [46, 50, 54], roughBase: 0.62 }),
  plastic_light:  () => plasticGen({ seed: 3211, base: [213, 215, 209], roughBase: 0.7 }),
  baseboard:      () => plasticGen({ seed: 3212, base: [59, 64, 68], roughBase: 0.6 }),
  rubber:         () => rubberGen({ seed: 3220 }),
  fabric_blue:    () => fabricGen({ seed: 3230, base: [71, 98, 121] }),
  fabric_gray:    () => fabricGen({ seed: 3231, base: [102, 108, 113] }),
  leather_black:  () => leatherGen({ seed: 3240 }),
  paper:          () => paperGen({ seed: 3250 }),
  cardboard:      () => cardboardGen({ seed: 3251 }),
};

const texCache = new Map();
const stats = { count: 0, ms: 0 };
export function textureStats() { return { ...stats }; }

// Lazily generate + cache the PBR map set for a material family.
// Returns null for names without a generator (caller falls back to flat).
export function getTextureSet(name) {
  if (texCache.has(name)) return texCache.get(name);
  const gen = GENERATORS[name];
  if (!gen) return null;
  const t0 = performance.now();
  const set = gen();
  stats.count += 1;
  stats.ms += performance.now() - t0;
  if (typeof window !== 'undefined') window.__texStats = { ...stats };
  texCache.set(name, set);
  return set;
}
