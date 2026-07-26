import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Procedural PBR texture factory.
// Every texture is generated at runtime on canvas: albedo + derived normal map
// (Sobel from height) + roughness. Seeded so output is deterministic.
// ===========================================================================

const texRNG = makeRNG(777123);

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

function canvas2d(size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
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

// --- Sun-bleached plaster / stucco (main building walls) -------------------
export function plasterMaterial(tintHex = 0xcbb89a, seed = 11) {
  return cached(`plaster${tintHex}_${seed}`, () => {
    const N = makeNoise(seed);
    const G = makeNoise(seed + 50);
    const tint = new THREE.Color(tintHex);
    return buildMaterial(512, (u, v, o) => {
      const base = N.fbm(u * 9, v * 9, 5);
      const fine = N.fbm(u * 46, v * 46, 3);
      const grime = G.fbm(u * 3.1, v * 3.1, 4);
      const streak = Math.pow(G.fbm(u * 17, v * 2.1, 4), 2.2); // vertical rain streaks
      const damage = Math.pow(G.fbm(u * 5 + 9, v * 5 + 3, 4), 6) * 2.4; // chipped patches
      let r = tint.r * 255, g = tint.g * 255, b = tint.b * 255;
      const shade = 0.82 + base * 0.24 + fine * 0.10;
      r *= shade; g *= shade; b *= shade;
      const dirt = grime * 0.34 + streak * 0.30;
      r *= (1 - dirt * 0.5); g *= (1 - dirt * 0.52); b *= (1 - dirt * 0.6);
      if (damage > 0.75) { // exposed grey underlayer
        const t = Math.min(1, (damage - 0.75) * 3);
        r = r * (1 - t) + 118 * t; g = g * (1 - t) + 112 * t; b = b * (1 - t) + 104 * t;
      }
      o.r = r; o.g = g; o.b = b;
      o.h = base * 0.55 + fine * 0.30 - (damage > 0.75 ? 0.35 : 0);
      o.rough = 0.88 + fine * 0.1 - grime * 0.05;
    }, { normalStrength: 2.6, normalScale: 0.9, envMapIntensity: 0.55 });
  });
}

// --- Brick ------------------------------------------------------------------
export function brickMaterial(seed = 21) {
  return cached(`brick_${seed}`, () => {
    const N = makeNoise(seed);
    const BW = 0.125, BH = 0.0417; // brick cell UV size
    return buildMaterial(512, (u, v, o) => {
      const row = Math.floor(v / BH);
      const off = (row % 2) * BW * 0.5;
      const bu = ((u + off) % BW) / BW;
      const bv = (v % BH) / BH;
      const mortar = (bu < 0.055 || bu > 0.945 || bv < 0.10 || bv > 0.90);
      const cellR = makeNoise(seed + row * 31 + Math.floor((u + off) / BW) * 7).fbm(0.5, 0.5, 1);
      const grit = N.fbm(u * 60, v * 60, 3);
      const grime = N.fbm(u * 4, v * 4, 4);
      if (mortar) {
        const s = 138 + grit * 38 - grime * 40;
        o.r = s; o.g = s * 0.965; o.b = s * 0.915;
        o.h = 0.28 + grit * 0.1;
        o.rough = 0.95;
      } else {
        // Dusty sun-faded brick: desaturated terracotta, heavy variation
        const warm = 0.72 + cellR * 0.45;
        const dustF = 0.75 + grime * 0.25;
        o.r = (136 + grit * 38) * warm * (1 - grime * 0.22);
        o.g = (94 + grit * 30) * warm * dustF * (1 - grime * 0.24);
        o.b = (78 + grit * 26) * warm * dustF * (1 - grime * 0.28);
        o.h = 0.72 + grit * 0.16 - Math.pow(grime, 3) * 0.3;
        o.rough = 0.85 + grit * 0.1;
      }
    }, { normalStrength: 3.2, normalScale: 1.0, envMapIntensity: 0.5 });
  });
}

// --- Poured concrete (barriers, bunkers, sidewalks) -------------------------
export function concreteMaterial(seed = 31, tone = 1.0) {
  return cached(`concrete_${seed}_${tone}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(512, (u, v, o) => {
      const base = N.fbm(u * 6, v * 6, 5);
      const fine = N.fbm(u * 42, v * 42, 3);
      const stain = Math.pow(N.fbm(u * 2.5 + 4, v * 2.5, 4), 2);
      const pit = Math.pow(N.fbm(u * 90, v * 90, 2), 8);
      let s = (150 + base * 48 + fine * 18 - stain * 62) * tone;
      o.r = s * 1.0; o.g = s * 0.99; o.b = s * 0.95;
      o.h = 0.5 + base * 0.24 + fine * 0.712 * 0.12 - pit * 0.5;
      o.rough = 0.9 - fine * 0.06;
    }, { normalStrength: 2.2, normalScale: 0.8, envMapIntensity: 0.6 });
  });
}

// --- Asphalt road ------------------------------------------------------------
export function asphaltMaterial(seed = 41) {
  return cached(`asphalt_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(1024, (u, v, o) => {
      // Mostly-uniform dark asphalt with fine aggregate grain, faint macro
      // mottling, hairline cracks and light dust film. Low contrast — real
      // roads read almost flat from eye height.
      const grit = N.fbm(u * 220, v * 220, 2);
      const grit2 = N.fbm(u * 70 + 13, v * 70, 2);
      const macro = N.fbm(u * 5, v * 5, 4);
      const dust = N.fbm(u * 2.4 + 31, v * 2.4 + 7, 3);
      const crackField = N.ridged(u * 26, v * 26, 4);
      const isCrack = crackField > 0.945;
      let s = 62 + grit * 16 + grit2 * 10 + macro * 9;
      s += dust * 20 * Math.max(0, dust - 0.45);       // sandy film in patches
      if (isCrack) s *= 0.55;
      o.r = s * 1.0; o.g = s * 0.985; o.b = s * 0.96;
      o.h = 0.5 + grit * 0.1 + grit2 * 0.06 - (isCrack ? 0.3 : 0);
      o.rough = 0.94 - grit2 * 0.05;
    }, { normalStrength: 1.7, normalScale: 0.7, envMapIntensity: 0.55 });
  });
}

// --- Dry dusty ground / sand ------------------------------------------------
export function dirtMaterial(seed = 51) {
  return cached(`dirt_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(1024, (u, v, o) => {
      const macro = N.fbm(u * 4, v * 4, 5);
      const grit = N.fbm(u * 90, v * 90, 2);
      const rocks = Math.pow(N.fbm(u * 30, v * 30, 3), 5) * 2;
      const dry = N.ridged(u * 9, v * 9, 3); // cracked mud
      const isCrack = dry > 0.86;
      let r = 148 + macro * 42 + grit * 24;
      let g = 122 + macro * 36 + grit * 20;
      let b = 92 + macro * 26 + grit * 14;
      if (rocks > 0.8) { const s = 120 + grit * 60; r = s; g = s * 0.98; b = s * 0.94; }
      if (isCrack) { r *= 0.55; g *= 0.55; b *= 0.55; }
      o.r = r; o.g = g; o.b = b;
      o.h = 0.5 + macro * 0.2 + (rocks > 0.8 ? 0.25 : 0) - (isCrack ? 0.3 : 0);
      o.rough = 0.96;
    }, { normalStrength: 2.8, normalScale: 1.0, envMapIntensity: 0.55 });
  });
}

// --- Painted / worn metal -----------------------------------------------------
export function metalMaterial(paintHex = 0x4a5442, seed = 61) {
  return cached(`metal_${paintHex}_${seed}`, () => {
    const N = makeNoise(seed);
    const paint = new THREE.Color(paintHex);
    const { albedoCanvas, roughCanvas, normalCanvas } = generateMaps(512, (u, v, o) => {
      const wear = Math.pow(N.fbm(u * 8, v * 8, 5), 3.2) * 2.0;
      const scratch = Math.pow(N.ridged(u * 26, v * 3.5, 3), 9);
      const grime = N.fbm(u * 3, v * 3, 4);
      const exposed = wear > 0.62 || scratch > 0.55;
      if (exposed) {
        const s = 135 + N.fbm(u * 40, v * 40, 2) * 60;
        o.r = s; o.g = s * 0.98; o.b = s * 0.93;
        o.rough = 0.42;
        o.h = 0.42;
      } else {
        const shade = 0.8 + N.fbm(u * 20, v * 20, 3) * 0.35 - grime * 0.3;
        o.r = paint.r * 255 * shade; o.g = paint.g * 255 * shade; o.b = paint.b * 255 * shade;
        o.rough = 0.72 - grime * 0.08;
        o.h = 0.5;
      }
    }, { normalStrength: 1.6 });
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
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 1.0, metalness: 1.0,
      envMapIntensity: 1.0,
    });
  });
}

// --- Corrugated metal (fences, roofs) ----------------------------------------
export function corrugatedMaterial(seed = 71) {
  return cached(`corrugated_${seed}`, () => {
    const N = makeNoise(seed);
    return buildMaterial(512, (u, v, o) => {
      const wave = Math.sin(u * Math.PI * 2 * 18) * 0.5 + 0.5;
      const rust = Math.pow(N.fbm(u * 6, v * 6, 5), 2.6) * 1.8;
      const grime = N.fbm(u * 3, v * 9, 4);
      if (rust > 0.72) {
        const t = Math.min(1, (rust - 0.72) * 3.2);
        o.r = 148 * (0.7 + t * 0.3); o.g = 82 * (0.7 + t * 0.25); o.b = 48;
        o.rough = 0.9;
      } else {
        const s = 128 + wave * 34 - grime * 46;
        o.r = s; o.g = s * 1.0; o.b = s * 0.98;
        o.rough = 0.55 + grime * 0.2;
      }
      o.h = wave * 0.8;
    }, { normalStrength: 3.4, normalScale: 1.2, metalness: 0.55, envMapIntensity: 0.9 });
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
      const tone = 0.68 + makeNoise(seed + plank).fbm(0.3, 0.7, 1) * 0.5;
      let r = (128 + grain * 54) * tone, g = (96 + grain * 40) * tone, b = (66 + grain * 28) * tone;
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
      const s = 128 + macro * 40 + weave * 22;
      o.r = s; o.g = s * 0.92; o.b = s * 0.74;
      o.h = 0.5 + weave * 0.2 + macro * 0.1;
      o.rough = 0.98;
    }, { normalStrength: 1.8, normalScale: 0.8, envMapIntensity: 0.4 });
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
