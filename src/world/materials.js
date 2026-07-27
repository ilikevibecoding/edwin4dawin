import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Procedural PBR texture factory.
// Every texture is generated at runtime on canvas: albedo + derived normal map
// (Sobel from height) + roughness. Seeded so output is deterministic.
// ===========================================================================

// --- Value-noise field with fBM ------------------------------------------
function makeNoise(seed) {
  const rng = makeRNG(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grads = new Float32Array(256);
  for (let i = 0; i < 256; i++) grads[i] = rng();

  function val(ix, iy) { return grads[perm[(perm[ix & 255] + iy) & 255]]; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function noise2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = val(ix, iy), b = val(ix + 1, iy), c = val(ix, iy + 1), d = val(ix + 1, iy + 1);
    const ux = smooth(fx), uy = smooth(fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise2(x * freq, y * freq);
      norm += amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum / norm;
  }

  // Ridged fBM for cracks / rocky shapes
  function ridged(x, y, octaves = 4) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * (1 - Math.abs(noise2(x * freq, y * freq) * 2 - 1));
      norm += amp;
      amp *= 0.5; freq *= 2.1;
    }
    return sum / norm;
  }

  return { noise2, fbm, ridged };
}

// Cheap deterministic per-cell hash (replaces per-pixel makeRNG allocations)
function hash21(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function canvas2d(size, sizeY = size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = sizeY;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

function toTexture(canvas, { srgb = true, repeat = 1, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

// Sobel height -> normal
function normalFromHeight(heightData, size, strength = 2.0) {
  const [c, ctx] = canvas2d(size);
  const out = ctx.createImageData(size, size);
  const h = (x, y) => heightData[(((y + size) % size) * size + ((x + size) % size))];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

// Generic generator: build albedo + height + roughness per-pixel
function generateMaps(size, pixelFn, { normalStrength = 2.0 } = {}) {
  const [ac, actx] = canvas2d(size);
  const [rc, rctx] = canvas2d(size);
  const albedo = actx.createImageData(size, size);
  const rough = rctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  const out = { r: 0, g: 0, b: 0, h: 0.5, rough: 0.8 };
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      pixelFn(u, v, out);
      const i = (y * size + x) * 4;
      albedo.data[i] = out.r; albedo.data[i + 1] = out.g; albedo.data[i + 2] = out.b; albedo.data[i + 3] = 255;
      const rr = Math.max(0, Math.min(255, out.rough * 255));
      rough.data[i] = rr; rough.data[i + 1] = rr; rough.data[i + 2] = rr; rough.data[i + 3] = 255;
      height[y * size + x] = out.h;
    }
  }
  actx.putImageData(albedo, 0, 0);
  rctx.putImageData(rough, 0, 0);
  const nc = normalFromHeight(height, size, normalStrength);
  return { albedoCanvas: ac, roughCanvas: rc, normalCanvas: nc };
}

function buildMaterial(size, pixelFn, opts = {}) {
  const { albedoCanvas, roughCanvas, normalCanvas } = generateMaps(size, pixelFn, opts);
  const repeat = opts.repeat ?? 1;
  const mat = new THREE.MeshStandardMaterial({
    map: toTexture(albedoCanvas, { srgb: true, repeat }),
    roughnessMap: toTexture(roughCanvas, { srgb: false, repeat }),
    normalMap: toTexture(normalCanvas, { srgb: false, repeat }),
    normalScale: new THREE.Vector2(opts.normalScale ?? 1, opts.normalScale ?? 1),
    roughness: 1.0,
    metalness: opts.metalness ?? 0.0,
    envMapIntensity: opts.envMapIntensity ?? 1.0,
  });
  if (opts.metalnessMap) mat.metalnessMap = opts.metalnessMap;
  return mat;
}

// ===========================================================================
// Material library — lazily built, cached.
// ===========================================================================
const cache = new Map();
function cached(key, builder) {
  if (!cache.has(key)) cache.set(key, builder());
  return cache.get(key);
}

// Shared brick-cell lookup used by brick walls AND plaster damage reveal.
// Returns {mortar, tone} for a point in brick-grid space.
function brickCell(u, v, cols, rows, seed) {
  const row = Math.floor(v * rows);
  const off = (row % 2) * 0.5;
  const cu = u * cols + off;
  const col = Math.floor(cu);
  const fu = cu - col;
  const fv = v * rows - row;
  const mortar = (fu < 0.05 || fu > 0.95 || fv < 0.12 || fv > 0.88);
  const tone = hash21(col + seed, row * 7 + seed);
  return { mortar, tone, fu, fv };
}

// --- Sun-bleached plaster / stucco (main building walls) -------------------
export function plasterMaterial(tintHex = 0xcbb89a, seed = 11) {
  return cached(`plaster${tintHex}_${seed}`, () => {
    const N = makeNoise(seed);
    const G = makeNoise(seed + 50);
    const tint = new THREE.Color(tintHex);
    return buildMaterial(512, (u, v, o) => {
      const base = N.fbm(u * 8, v * 8, 5);
      const fine = N.fbm(u * 44, v * 44, 3);
      const grime = G.fbm(u * 2.7, v * 2.7, 4);
      const streak = Math.pow(G.fbm(u * 21, v * 1.6, 4), 2.6); // vertical rain streaks
      // Chip damage gated by a very low-frequency mask so it clusters in a few
      // patches per tile instead of an even (obviously tiling) sprinkle.
      const dmgMask = Math.max(0, (G.fbm(u * 1.2 + 40, v * 1.2 + 11, 2) - 0.42) * 2.6);
      const damage = Math.pow(G.fbm(u * 4.2 + 9, v * 4.2 + 3, 4), 6) * 2.6 * Math.min(1, dmgMask);
      const crack = N.ridged(u * 7 + 3, v * 7, 4);
      let r = tint.r * 255, g = tint.g * 255, b = tint.b * 255;
      const shade = 0.86 + base * 0.20 + fine * 0.08;
      r *= shade; g *= shade; b *= shade;
      const dirt = grime * 0.30 + streak * 0.34;
      r *= (1 - dirt * 0.42); g *= (1 - dirt * 0.46); b *= (1 - dirt * 0.55);
      let h = base * 0.5 + fine * 0.28;
      if (damage > 0.72) { // plaster blown off -> dusty brick substrate shows
        const t = Math.min(1, (damage - 0.72) * 3.2);
        const bc = brickCell(u, v, 15, 42, seed * 13);
        let br, bg, bb;
        if (bc.mortar) { br = 128; bg = 119; bb = 105; }
        else {
          const w2 = 0.78 + bc.tone * 0.4;
          br = 143 * w2; bg = 111 * w2; bb = 90 * w2;
        }
        // dust the substrate so it stays low-contrast
        br = br * 0.82 + 34; bg = bg * 0.82 + 30; bb = bb * 0.82 + 25;
        r = r * (1 - t) + br * t; g = g * (1 - t) + bg * t; b = b * (1 - t) + bb * t;
        h -= 0.38 * t;
      }
      if (crack > 0.955) { const c = 0.72; r *= c; g *= c; b *= c; h -= 0.18; }
      o.r = r; o.g = g; o.b = b;
      o.h = h;
      o.rough = 0.9 + fine * 0.08 - grime * 0.05;
    }, { normalStrength: 3.0, normalScale: 1.05, envMapIntensity: 0.55 });
  });
}

// --- Brick: sun-baked, dusty, desaturated ----------------------------------
export function brickMaterial(seed = 21) {
  return cached(`brick_${seed}`, () => {
    const N = makeNoise(seed);
    const COLS = 16, ROWS = 48; // with texScale 3.2m -> bricks 0.20 x 0.067 m
    return buildMaterial(512, (u, v, o) => {
      const bc = brickCell(u, v, COLS, ROWS, seed * 31);
      const grit = N.fbm(u * 64, v * 64, 3);
      const grime = N.fbm(u * 3.1, v * 3.1, 4);
      const streak = Math.pow(N.fbm(u * 19, v * 1.4, 4), 2.8);
      const dust = 0.16 + grime * 0.28 + streak * 0.2; // sand film unifies everything
      if (bc.mortar) {
        let s = 146 + grit * 30 - grime * 34;
        o.r = s; o.g = s * 0.955; o.b = s * 0.885;
        o.h = 0.34 + grit * 0.08;
        o.rough = 0.96;
      } else {
        // tan..muted red-brown range with rare dark / pale outliers
        let br, bg, bb;
        if (bc.tone > 0.94) { br = 99; bg = 82; bb = 68; }        // over-fired dark
        else if (bc.tone < 0.06) { br = 176; bg = 158; bb = 130; } // pale lime brick
        else {
          const t = bc.tone;
          br = 150 + t * 26; bg = 112 + t * 26; bb = 88 + t * 22;
        }
        const shade = 0.86 + grit * 0.2;
        br *= shade; bg *= shade; bb *= shade;
        // spalled/chipped brick faces
        const spall = hash21(Math.floor(u * COLS * 3) + seed, Math.floor(v * ROWS) * 3);
        let h = 0.66 + grit * 0.12;
        if (spall > 0.955) { br *= 0.8; bg *= 0.8; bb *= 0.82; h -= 0.2; }
        // dust film pulls toward pale sand
        o.r = br * (1 - dust) + 171 * dust;
        o.g = bg * (1 - dust) + 154 * dust;
        o.b = bb * (1 - dust) + 124 * dust;
        o.h = h;
        o.rough = 0.88 + grit * 0.08;
      }
    }, { normalStrength: 3.4, normalScale: 1.15, envMapIntensity: 0.5 });
  });
}

// --- Poured concrete (barriers, bunkers, sidewalks) -------------------------
export function concreteMaterial(seed = 31, tone = 1.0) {
  return cached(`concrete_${seed}_${tone}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(512, (u, v, o) => {
      const base = N.fbm(u * 5, v * 5, 5);
      const fine = N.fbm(u * 40, v * 40, 3);
      const speck = N.fbm(u * 130, v * 130, 2);
      const stain = Math.pow(N.fbm(u * 2.2 + 4, v * 2.2, 4), 2.4);
      const pit = Math.pow(N.fbm(u * 90, v * 90, 2), 8);
      // low-contrast: stains soft so tiling doesn't read at distance
      let s = (144 + base * 26 + fine * 14 + speck * 10 - stain * 34) * tone;
      o.r = s * 1.0; o.g = s * 0.985; o.b = s * 0.945;
      o.h = 0.5 + base * 0.16 + fine * 0.1 - pit * 0.45;
      o.rough = 0.92 - fine * 0.05;
    }, { normalStrength: 1.8, normalScale: 0.7, envMapIntensity: 0.6 });
  });
}

// --- Asphalt road ------------------------------------------------------------
export function asphaltMaterial(seed = 41) {
  return cached(`asphalt_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(1024, (u, v, o) => {
      // Mostly-uniform dark asphalt with fine aggregate grain, faint macro
      // mottling, hairline cracks, tar repair lines and light sand film.
      const grit = N.fbm(u * 220, v * 220, 2);
      const grit2 = N.fbm(u * 70 + 13, v * 70, 2);
      const macro = N.fbm(u * 4, v * 4, 4);
      const dust = N.fbm(u * 2.4 + 31, v * 2.4 + 7, 3);
      const crackField = N.ridged(u * 24, v * 24, 4);
      const isCrack = crackField > 0.95;
      const tar = N.ridged(u * 6 + 40, v * 6, 3) > 0.93; // dark tar-sealed cracks
      const oil = Math.pow(N.fbm(u * 3 + 77, v * 3 + 21, 3), 3.2);
      let s = 76 + grit * 16 + grit2 * 10 + macro * 8;
      s += dust * 30 * Math.max(0, dust - 0.48);       // sandy film in patches
      s -= oil * 30;                                    // oily darkening
      if (tar) s *= 0.72;
      if (isCrack) s *= 0.6;
      o.r = s * 1.01; o.g = s * 0.99; o.b = s * 0.96;
      o.h = 0.5 + grit * 0.1 + grit2 * 0.05 - (isCrack ? 0.28 : 0) - (tar ? 0.06 : 0);
      o.rough = 0.94 - grit2 * 0.05 + oil * 0.03;
    }, { normalStrength: 1.6, normalScale: 0.65, envMapIntensity: 0.55 });
  });
}

// --- Dry dusty ground / sand ------------------------------------------------
export function dirtMaterial(seed = 51) {
  return cached(`dirt_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(1024, (u, v, o) => {
      const macro = N.fbm(u * 3, v * 3, 5);
      const patch = N.fbm(u * 1.4 + 17, v * 1.4 + 5, 3); // big soil-vs-sand patches
      const grit = N.fbm(u * 90, v * 90, 2);
      const ripple = N.fbm(u * 14, v * 46, 3);           // wind-blown micro ridges
      const rocks = Math.pow(N.fbm(u * 34, v * 34, 3), 5) * 2;
      const dryMask = N.fbm(u * 2.1 + 40, v * 2.1, 3);
      const dry = N.ridged(u * 10, v * 10, 3);
      const isCrack = dry > 0.9 && dryMask > 0.55;
      // pale desert sand vs grey-brown packed soil
      const sandR = 178, sandG = 160, sandB = 131;
      const soilR = 128, soilG = 112, soilB = 92;
      const mix = Math.min(1, Math.max(0, (patch - 0.36) * 2.2));
      let r = soilR + (sandR - soilR) * mix;
      let g = soilG + (sandG - soilG) * mix;
      let b = soilB + (sandB - soilB) * mix;
      const shade = 0.84 + macro * 0.22 + grit * 0.12 + ripple * 0.06;
      r *= shade; g *= shade; b *= shade;
      if (rocks > 0.82) { const s = 118 + grit * 62; r = s; g = s * 0.97; b = s * 0.92; }
      if (isCrack) { r *= 0.62; g *= 0.62; b *= 0.63; }
      o.r = r; o.g = g; o.b = b;
      o.h = 0.5 + macro * 0.18 + ripple * 0.08 + (rocks > 0.82 ? 0.22 : 0) - (isCrack ? 0.26 : 0);
      o.rough = 0.97;
    }, { normalStrength: 2.4, normalScale: 0.9, envMapIntensity: 0.55 });
  });
}

// --- Painted / worn metal -----------------------------------------------------
export function metalMaterial(paintHex = 0x4a5442, seed = 61) {
  return cached(`metal_${paintHex}_${seed}`, () => {
    const N = makeNoise(seed);
    const paint = new THREE.Color(paintHex);
    const { albedoCanvas, roughCanvas, normalCanvas } = generateMaps(512, (u, v, o) => {
      // Small chips + thin scratches only — big wear blobs read as camo.
      const chip = Math.pow(N.fbm(u * 18, v * 18, 4), 9) * 4;
      const scratch = N.ridged(u * 46, v * 2.4, 2);
      const grime = N.fbm(u * 2.6, v * 2.6, 4);
      const streak = Math.pow(N.fbm(u * 16, v * 1.5, 3), 3);
      const exposed = chip > 0.9 || scratch > 0.978;
      if (exposed) {
        const s = 140 + N.fbm(u * 40, v * 40, 2) * 50;
        o.r = s; o.g = s * 0.98; o.b = s * 0.94;
        o.rough = 0.48;
        o.h = 0.44;
      } else {
        const shade = 0.84 + N.fbm(u * 22, v * 22, 3) * 0.24 - grime * 0.26;
        let r = paint.r * 255 * shade, g = paint.g * 255 * shade, b = paint.b * 255 * shade;
        // faint rust bleed running down
        const rust = Math.max(0, streak * 1.5 - 0.28) * (0.3 + grime * 0.7);
        r = r * (1 - rust) + 112 * rust;
        g = g * (1 - rust) + 70 * rust;
        b = b * (1 - rust) + 44 * rust;
        o.r = r; o.g = g; o.b = b;
        o.rough = 0.68 - grime * 0.06 + rust * 0.2;
        o.h = 0.5;
      }
    }, { normalStrength: 1.4 });
    // metalness map: exposed steel = metallic
    const size = 512;
    const [mc, mctx] = canvas2d(size);
    const src = albedoCanvas.getContext('2d').getImageData(0, 0, size, size);
    const md = mctx.createImageData(size, size);
    for (let i = 0; i < size * size * 4; i += 4) {
      const isSteel = src.data[i] > 128 && Math.abs(src.data[i] - src.data[i + 2]) < 22;
      const m = isSteel ? 235 : 30;
      md.data[i] = m; md.data[i + 1] = m; md.data[i + 2] = m; md.data[i + 3] = 255;
    }
    mctx.putImageData(md, 0, 0);
    return new THREE.MeshStandardMaterial({
      map: toTexture(albedoCanvas),
      roughnessMap: toTexture(roughCanvas, { srgb: false }),
      normalMap: toTexture(normalCanvas, { srgb: false }),
      metalnessMap: toTexture(mc, { srgb: false }),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 1.0, metalness: 1.0,
      envMapIntensity: 0.9,
    });
  });
}

// --- Corrugated metal (fences, roofs) ----------------------------------------
export function corrugatedMaterial(seed = 71) {
  return cached(`corrugated_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(512, (u, v, o) => {
      const wave = Math.sin(u * Math.PI * 2 * 18) * 0.5 + 0.5;
      const rust = Math.pow(N.fbm(u * 7, v * 7, 5), 3) * 1.8;
      const grime = N.fbm(u * 3, v * 9, 4);
      const streak = Math.pow(N.fbm(u * 22, v * 1.3, 3), 2.6);
      if (rust > 0.82) {
        const t = Math.min(1, (rust - 0.82) * 4);
        o.r = 132 * (0.72 + t * 0.28); o.g = 78 * (0.72 + t * 0.22); o.b = 50;
        o.rough = 0.9;
      } else {
        let s = 136 + wave * 30 - grime * 40 - streak * 46;
        o.r = s * 1.0; o.g = s * 0.99; o.b = s * 0.965;
        o.rough = 0.58 + grime * 0.2 + streak * 0.15;
      }
      o.h = wave * 0.8;
    }, { normalStrength: 3.2, normalScale: 1.1, metalness: 0.5, envMapIntensity: 0.85 });
  });
}

// --- Wood planks ---------------------------------------------------------------
export function woodMaterial(seed = 81) {
  return cached(`wood_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(512, (u, v, o) => {
      const plank = Math.floor(u * 6);
      const pu = (u * 6) % 1;
      const gap = pu < 0.03 || pu > 0.97;
      const grain = N.fbm(u * 5 + plank * 13, v * 60, 4);
      const knots = Math.pow(N.fbm(u * 14 + plank * 5, v * 8, 3), 6) * 2;
      const tone = 0.68 + hash21(plank, seed) * 0.5;
      let r = (122 + grain * 50) * tone, g = (94 + grain * 38) * tone, b = (66 + grain * 28) * tone;
      if (knots > 0.8) { r *= 0.55; g *= 0.5; b *= 0.5; }
      if (gap) { r *= 0.3; g *= 0.3; b *= 0.3; }
      o.r = r; o.g = g; o.b = b;
      o.h = (gap ? 0.1 : 0.55) + grain * 0.2;
      o.rough = 0.85;
    }, { normalStrength: 2.4, normalScale: 0.9, envMapIntensity: 0.4 });
  });
}

// --- Camo fabric ---------------------------------------------------------------
export function camoMaterial(seed = 91, palette = [0x4d5340, 0x6b6a4f, 0x3a3c30, 0x77705a]) {
  return cached(`camo_${seed}`, () => {
    const N = makeNoise(seed);
    const cols = palette.map((h) => new THREE.Color(h));
    return buildMaterial(512, (u, v, o) => {
      const n1 = N.fbm(u * 7, v * 7, 3);
      const n2 = N.fbm(u * 7 + 40, v * 7 + 40, 3);
      const idx = (n1 > 0.55 ? 2 : 0) + (n2 > 0.52 ? 1 : 0);
      const c = cols[idx];
      const weave = N.fbm(u * 160, v * 160, 1) * 0.16 + 0.92;
      o.r = c.r * 255 * weave; o.g = c.g * 255 * weave; o.b = c.b * 255 * weave;
      o.h = 0.5 + weave * 0.08;
      o.rough = 0.95;
    }, { normalStrength: 1.2, normalScale: 0.5, envMapIntensity: 0.35 });
  });
}

// --- Sandbag ---------------------------------------------------------------------
export function sandbagMaterial(seed = 101) {
  return cached(`sandbag_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(256, (u, v, o) => {
      const weave = (Math.sin(u * 220) * 0.5 + 0.5) * (Math.sin(v * 220) * 0.5 + 0.5);
      const macro = N.fbm(u * 5, v * 5, 4);
      const s = 132 + macro * 36 + weave * 20;
      o.r = s; o.g = s * 0.93; o.b = s * 0.78;
      o.h = 0.5 + weave * 0.2 + macro * 0.1;
      o.rough = 0.98;
    }, { normalStrength: 1.8, normalScale: 0.8, envMapIntensity: 0.4 });
  });
}

// --- Car paint: faded, dusty, chipped ----------------------------------------
export function carPaintMaterial(hex = 0x6b7a8c, seed = 401) {
  return cached(`carpaint_${hex}_${seed}`, () => {
    const N = makeNoise(seed);
    const c = new THREE.Color(hex);
    return buildMaterial(256, (u, v, o) => {
      const fade = N.fbm(u * 5, v * 5, 4);
      const chips = Math.pow(N.fbm(u * 34, v * 34, 3), 9) * 4;
      const scratch = N.ridged(u * 3, v * 60, 2);
      // v runs 0 (bottom) -> 1 (top) on box side faces: dust collects low
      const dust = Math.max(0, 1 - v * 2.6) * (0.45 + N.fbm(u * 9, v * 9, 3) * 0.5);
      let r = c.r * 255, g = c.g * 255, b = c.b * 255;
      const shade = 0.88 + fade * 0.18;
      r *= shade; g *= shade; b *= shade;
      r = r * (1 - dust * 0.6) + 176 * dust * 0.6;
      g = g * (1 - dust * 0.6) + 158 * dust * 0.6;
      b = b * (1 - dust * 0.6) + 128 * dust * 0.6;
      let rough = 0.42 + dust * 0.45 + fade * 0.08;
      if (chips > 0.86 || scratch > 0.985) { // primer / bare metal chips
        r = 92; g = 88; b = 84; rough = 0.55;
      }
      o.r = r; o.g = g; o.b = b;
      o.h = 0.5 + N.fbm(u * 2.5, v * 2.5, 3) * 0.3; // soft panel dents
      o.rough = rough;
    }, { normalStrength: 1.2, normalScale: 0.6, metalness: 0.35, envMapIntensity: 1.05 });
  });
}

// --- Charred / burned metal (burned vehicles) ---------------------------------
export function charredMaterial(seed = 421) {
  return cached(`charred_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(256, (u, v, o) => {
      const base = N.fbm(u * 8, v * 8, 4);
      const ash = Math.pow(N.fbm(u * 4 + 9, v * 4, 4), 2.0);
      const rustEdge = Math.pow(N.fbm(u * 11, v * 11, 3), 6) * 2.2;
      let r = 30 + base * 16, g = 28 + base * 15, b = 26 + base * 14;
      // grey ash bloom streaks
      r = r * (1 - ash * 0.75) + 104 * ash * 0.75;
      g = g * (1 - ash * 0.75) + 100 * ash * 0.75;
      b = b * (1 - ash * 0.75) + 96 * ash * 0.75;
      if (rustEdge > 0.8) { // scorched oxide browning, subtle
        const t = Math.min(1, (rustEdge - 0.8) * 2.5) * 0.5;
        r = r * (1 - t) + 96 * t; g = g * (1 - t) + 60 * t; b = b * (1 - t) + 38 * t;
      }
      o.r = r; o.g = g; o.b = b;
      o.h = 0.5 + base * 0.3 - ash * 0.1;
      o.rough = 0.94 - ash * 0.12;
    }, { normalStrength: 1.8, normalScale: 0.8, metalness: 0.12, envMapIntensity: 0.5 });
  });
}

// --- Roller shutter (shopfronts). Near-grayscale; tint via instanceColor. ----
export function shutterMaterial(seed = 501) {
  return cached(`shutter_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(256, (u, v, o) => {
      const slats = 16;
      const f = (v * slats) % 1;
      const profile = Math.abs(f - 0.5) * 2;         // 0 at slat center
      const seam = f < 0.08 ? 0.55 : 1.0;
      const grime = N.fbm(u * 3, v * 3, 4);
      const streak = Math.pow(N.fbm(u * 26, v * 1.2, 3), 2.4);
      const bottomGrime = Math.max(0, 1 - v * 3.2);
      const rustSpeck = Math.pow(N.fbm(u * 40, v * 40, 3), 7) * 3;
      let s = 205 * (0.82 + (1 - profile) * 0.22) * seam;
      s *= (1 - grime * 0.25 - streak * 0.3 - bottomGrime * 0.35);
      let r = s, g = s, b = s * 0.97;
      if (rustSpeck > 0.85) { r = 118; g = 76; b = 48; }
      o.r = r; o.g = g; o.b = b;
      o.h = (1 - profile) * 0.5 * seam;
      o.rough = 0.5 + grime * 0.3 + bottomGrime * 0.25;
    }, { normalStrength: 2.6, normalScale: 1.0, metalness: 0.45, envMapIntensity: 0.8 });
  });
}

// --- Shop sign board: pale background + dark glyph shapes. Tint via instance.
export function signMaterial(seed = 601) {
  return cached(`sign_${seed}`, () => {
    const rng = makeRNG(seed);
    const W = 256, H = 64;
    const [c, ctx] = canvas2d(W, H);
    ctx.fillStyle = '#ddd6c4';
    ctx.fillRect(0, 0, W, H);
    // border
    ctx.strokeStyle = 'rgba(40,34,28,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    // faux-lettering: connected strokes with varying runs (reads as script)
    ctx.strokeStyle = '#2e2a24';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    let x = 18 + rng() * 10;
    while (x < W - 30) {
      const run = 14 + rng() * 30;
      const y0 = 24 + rng() * 12;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      let cx = x;
      while (cx < x + run) {
        const nx = cx + 4 + rng() * 7;
        const ny = 20 + rng() * 20;
        ctx.quadraticCurveTo(cx + 3, y0 + (rng() - 0.5) * 18, nx, ny);
        cx = nx;
      }
      ctx.stroke();
      // diacritic dots
      if (rng() < 0.7) { ctx.beginPath(); ctx.arc(x + run * rng(), 14 + rng() * 8, 2.2, 0, 7); ctx.fillStyle = '#2e2a24'; ctx.fill(); }
      x += run + 12 + rng() * 10;
    }
    // weathering: erode with background-colored speckle + vertical fade streaks
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(221,214,196,${0.25 + rng() * 0.5})`;
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 3, 1 + rng() * 2);
    }
    for (let i = 0; i < 26; i++) {
      const sx = rng() * W;
      ctx.fillStyle = `rgba(80,70,58,${0.05 + rng() * 0.1})`;
      ctx.fillRect(sx, 0, 1.5 + rng() * 3, H);
    }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.05, envMapIntensity: 0.5 });
  });
}

// --- Poster / wall advert (small paper sheet) ---------------------------------
export function posterMaterial(seed = 701) {
  return cached(`poster_${seed}`, () => {
    const rng = makeRNG(seed);
    const W = 128, H = 170;
    const [c, ctx] = canvas2d(W, H);
    const pal = [['#b8b0a0', '#7d2f24'], ['#a8a294', '#274a56'], ['#c0b6a2', '#6b5a23']][seed % 3];
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 0, W, H);
    // big color block "image"
    ctx.fillStyle = pal[1];
    ctx.fillRect(10, 12, W - 20, H * 0.44);
    // silhouette shape inside
    ctx.fillStyle = 'rgba(20,18,16,0.8)';
    ctx.beginPath();
    ctx.arc(W * (0.3 + rng() * 0.4), H * 0.28, 14 + rng() * 8, 0, 7);
    ctx.fill();
    ctx.fillRect(W * 0.28, H * 0.3, W * 0.44, H * 0.22);
    // text lines
    ctx.fillStyle = '#211d19';
    for (let y = H * 0.62; y < H - 14; y += 12) {
      const wds = 2 + Math.floor(rng() * 3);
      let x = 12;
      for (let wd = 0; wd < wds; wd++) {
        const w2 = 14 + rng() * 34;
        ctx.fillRect(x, y, Math.min(w2, W - 12 - x), 6);
        x += w2 + 8;
      }
    }
    // weathering / sun fade
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(190,182,166,${0.15 + rng() * 0.4})`;
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 3, 1 + rng() * 3);
    }
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.4 });
  });
}

// --- Sand drift decal (transparent) --------------------------------------------
export function sandDriftMaterial(seed = 801) {
  return cached(`sanddrift_${seed}`, () => {
    const N = makeNoise(seed);
    const S = 256;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const dx = (u - 0.5) * 2, dy = (v - 0.5) * 2;
        const d = Math.sqrt(dx * dx + (dy * dy) * 3.2);
        const edge = Math.max(0, Math.min(1, (1 - d) * 2.2));
        const breakup = 0.45 + N.fbm(u * 7, v * 7, 3) * 0.7;
        const a = Math.max(0, Math.min(1, edge * breakup));
        const grain = N.fbm(u * 60, v * 60, 2);
        const i = (y * S + x) * 4;
        img.data[i] = 182 + grain * 26;
        img.data[i + 1] = 163 + grain * 22;
        img.data[i + 2] = 132 + grain * 18;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false,
      roughness: 0.98, metalness: 0, envMapIntensity: 0.5,
    });
  });
}

// --- Faded painted wall ad (gable mural, transparent decal) --------------------
export function muralMaterial(seed = 851) {
  return cached(`mural_${seed}`, () => {
    const rng = makeRNG(seed);
    const W = 256, H = 160;
    const [c, ctx] = canvas2d(W, H);
    ctx.clearRect(0, 0, W, H);
    const pals = [['#7d3428', '#e8dcc4'], ['#2e5a52', '#ded2b4'], ['#8a6224', '#e2d8c2']];
    const pal = pals[seed % 3];
    // painted background panel
    ctx.fillStyle = pal[0];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(8, 10, W - 16, H - 20);
    // border + big lettering strokes
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = pal[1];
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 18, W - 32, H - 36);
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    let x = 30;
    while (x < W - 44) {
      const run = 20 + rng() * 34;
      ctx.beginPath();
      ctx.moveTo(x, 52 + rng() * 14);
      let cx = x;
      while (cx < x + run) {
        const nx = cx + 7 + rng() * 10;
        ctx.quadraticCurveTo(cx + 4, 40 + rng() * 40, nx, 46 + rng() * 26);
        cx = nx;
      }
      ctx.stroke();
      x += run + 16;
    }
    // secondary smaller line
    ctx.lineWidth = 5;
    x = 44;
    while (x < W - 60) {
      const run = 14 + rng() * 26;
      ctx.beginPath();
      ctx.moveTo(x, 102 + rng() * 10);
      ctx.lineTo(x + run, 100 + rng() * 14);
      ctx.stroke();
      x += run + 14;
    }
    // heavy weathering: punch alpha holes so the plaster shows through
    const img = ctx.getImageData(0, 0, W, H);
    const N = makeNoise(seed + 4);
    for (let y = 0; y < H; y++) {
      for (let xx = 0; xx < W; xx++) {
        const i = (y * W + xx) * 4;
        const n = N.fbm(xx / W * 7, y / H * 7, 4);
        const fade = 0.5 + n * 0.5;
        img.data[i + 3] = Math.max(0, img.data[i + 3] * fade * (0.72 + N.fbm(xx / W * 30, y / H * 30, 2) * 0.4));
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false,
      roughness: 0.92, metalness: 0, envMapIntensity: 0.4,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
  });
}

// --- Tire-track / traffic polish strips down the road (transparent decal) -----
export function wheelPathMaterial(seed = 871) {
  return cached(`wheelpath_${seed}`, () => {
    const N = makeNoise(seed);
    const S = 256;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        // two soft dark bands (wheel paths), broken up along length
        const band = (t) => Math.exp(-Math.pow((u - t) / 0.10, 2));
        const strength = band(0.3) + band(0.7);
        const wander = 0.7 + N.fbm(u * 3, v * 9, 3) * 0.5;
        const a = Math.min(1, strength * wander) * 0.30;
        const i = (y * S + x) * 4;
        img.data[i] = 30; img.data[i + 1] = 29; img.data[i + 2] = 27;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false,
      roughness: 0.85, metalness: 0, envMapIntensity: 0.5,
    });
  });
}

// --- Ground macro-variation overlay (non-tiling, kills repetition) --------------
export function groundOverlayMaterial(seed = 901) {
  return cached(`groundoverlay_${seed}`, () => {
    const N = makeNoise(seed);
    const S = 512;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = y / S;
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const blotch = N.fbm(u * 6, v * 6, 4);
        const blotch2 = N.fbm(u * 2.2 + 30, v * 2.2 + 9, 3);
        const i = (y * S + x) * 4;
        // dark packed-soil patches + occasional pale sand sweeps
        let rr = 96, gg = 84, bb = 68, a = 0;
        const dark = Math.max(0, (blotch - 0.56)) * 2.4;
        const pale = Math.max(0, (blotch2 - 0.62)) * 2.6;
        if (pale > dark) { rr = 190; gg = 172; bb = 140; a = Math.min(0.5, pale * 0.55); }
        else a = Math.min(0.55, dark * 0.6);
        img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false,
      roughness: 1.0, metalness: 0, envMapIntensity: 0.5,
    });
  });
}

// --- Striped awning cloth --------------------------------------------------------
export function awningMaterial(hex = 0x8c3b2e, seed = 951) {
  return cached(`awning_${hex}_${seed}`, () => {
    const N = makeNoise(seed);
    const col = new THREE.Color(hex);
    const mat = buildMaterial(256, (u, v, o) => {
      const stripe = Math.floor(u * 9) % 2 === 0;
      const weave = N.fbm(u * 90, v * 90, 2);
      const fade = N.fbm(u * 4, v * 4, 3);
      const dirt = Math.pow(N.fbm(u * 12, v * 2, 3), 2.4);
      let r, g, b;
      if (stripe) { r = col.r * 255; g = col.g * 255; b = col.b * 255; }
      else { r = 214; g = 205; b = 188; }
      const s = 0.78 + fade * 0.26 + weave * 0.08;
      r *= s; g *= s; b *= s;
      r *= 1 - dirt * 0.3; g *= 1 - dirt * 0.32; b *= 1 - dirt * 0.36;
      o.r = r; o.g = g; o.b = b;
      o.h = 0.5 + weave * 0.1;
      o.rough = 0.95;
    }, { normalStrength: 1.0, normalScale: 0.4, envMapIntensity: 0.45 });
    mat.side = THREE.DoubleSide;
    return mat;
  });
}

// --- Contact-shadow blob (soft dark ellipse decal under props) -----------------
export function contactShadowMaterial() {
  return cached('contactshadow', () => {
    const S = 128;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const dy = (y / S - 0.5) * 2;
      for (let x = 0; x < S; x++) {
        const dx = (x / S - 0.5) * 2;
        const d = Math.sqrt(dx * dx + dy * dy);
        // dense core, soft falloff to the rim
        const a = Math.pow(Math.max(0, 1 - d), 1.6);
        const i = (y * S + x) * 4;
        img.data[i] = 8; img.data[i + 1] = 7; img.data[i + 2] = 6;
        img.data[i + 3] = Math.min(255, a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0.42,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    m.fog = true;
    return m;
  });
}

// --- Wall-base grime skirt (vertical dark gradient, transparent) ---------------
export function wallGrimeMaterial(seed = 991) {
  return cached(`wallgrime_${seed}`, () => {
    const N = makeNoise(seed);
    const S = 256;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = 1 - y / S; // v=1 top of band -> alpha 0
      for (let x = 0; x < S; x++) {
        const u = x / S;
        const splash = N.fbm(u * 9, v * 3, 3);
        const edge = N.fbm(u * 22, 0.5, 2);
        // ragged top edge: fade out between 0.45 and 1.0 with noise
        const fade = Math.max(0, Math.min(1, (1 - v) * 2.1 - edge * 0.7));
        const a = fade * (0.42 + splash * 0.4);
        const i = (y * S + x) * 4;
        img.data[i] = 42 + splash * 20; img.data[i + 1] = 37 + splash * 18; img.data[i + 2] = 30 + splash * 15;
        img.data[i + 3] = Math.min(255, a * 200);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false,
      roughness: 0.97, metalness: 0, envMapIntensity: 0.3,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
  });
}

// --- Underside occlusion band (dark at top, fades down) --------------------------
// Baked contact darkening for wall areas under awnings, balconies, cornices and
// door lintels — sells occlusion that SSAO misses at half-res / distance.
export function underShadowMaterial() {
  return cached('undershadow', () => {
    const S = 128;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = 1 - y / S; // v=1 top of band (darkest)
      for (let x = 0; x < S; x++) {
        const a = Math.pow(Math.max(0, v), 1.7); // dense under the overhang, soft tail
        const i = (y * S + x) * 4;
        img.data[i] = 10; img.data[i + 1] = 9; img.data[i + 2] = 8;
        img.data[i + 3] = Math.min(255, a * 215);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
    });
  });
}

// --- Window reveal shadow (dark inset behind glass, reads as depth) -------------
export function revealMaterial() {
  return cached('reveal', () => {
    const S = 64;
    const [c, ctx] = canvas2d(S);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      const v = 1 - y / S;
      for (let x = 0; x < S; x++) {
        // darkest under the lintel (top), opening up slightly toward the sill
        const s = 12 + (1 - v) * 14;
        const i = (y * S + x) * 4;
        img.data[i] = s; img.data[i + 1] = s * 0.95; img.data[i + 2] = s * 0.88;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = toTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0, metalness: 0, envMapIntensity: 0.2 });
  });
}

// --- Flat helpers ------------------------------------------------------------------
export function flatMaterial(hex, rough = 0.85, metal = 0.0, envInt = 0.8) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal, envMapIntensity: envInt });
}

export function emissiveMaterial(hex, intensity = 2.0) {
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: hex, emissiveIntensity: intensity, roughness: 0.6 });
}

// Apply env map to all cached materials once the sky PMREM exists.
export function applyEnvironment(envMap) {
  for (const m of cache.values()) {
    m.envMap = envMap;
    m.needsUpdate = true;
  }
}
