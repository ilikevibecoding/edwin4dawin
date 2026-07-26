import * as THREE from 'three';
import { hashString, makeRng } from '../core/rng.js';
import { rgbCss, C } from './palette.js';

/**
 * Procedural texture foundry.
 * Owner: Fable 3 (materials & textures) with Fable 1 art-direction review.
 *
 * Every texture in the game is painted here with Canvas2D and uploaded as a
 * CanvasTexture. Nothing is fetched from disk, so the build can never present
 * a missing-texture surface. All tileable maps are authored seamlessly by
 * wrapping every draw call across the canvas border.
 *
 * Convention for each material family:
 *   albedo   — base colour only, no baked lighting or baked AO shading ramps
 *   normal   — derived from an explicitly authored height field (Sobel)
 *   rough    — greyscale, white = rough
 *   ao       — only cavity/contact occlusion authored into the surface itself
 *   emissive — separate map where a surface self-illuminates
 */

const CACHE = new Map();
let ANISOTROPY = 8;

/**
 * Texture memory budget.
 *
 * Base colour keeps its authored resolution; normal and roughness are data
 * maps whose detail survives a halving, so they are downsampled on upload.
 * A fully dressed level uses ~80 material families — at 512² RGBA for three
 * maps each that is over 300 MB of VRAM with mips, which crashes software
 * rasterisers and low-end GPUs. Halving the data maps takes it to ~110 MB with
 * no visible difference at gameplay distance.
 */
const DATA_MAP_DIVISOR = 2;
let ALBEDO_DIVISOR = 1;

export function setTextureBudget(quality) {
  ALBEDO_DIVISOR = quality === 'low' ? 2 : 1;
}

export function setTextureAnisotropy(v) {
  ANISOTROPY = v;
  for (const set of CACHE.values()) {
    if (set?.isTexture) set.anisotropy = v;
    else if (set && typeof set === 'object') {
      for (const t of Object.values(set)) if (t?.isTexture) t.anisotropy = v;
    }
  }
}

export function makeCanvas(w, h = w) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

function downscale(canvas, divisor) {
  if (divisor <= 1) return canvas;
  const w = Math.max(4, Math.round(canvas.width / divisor));
  const h = Math.max(4, Math.round(canvas.height / divisor));
  const out = makeCanvas(w, h);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, w, h);
  return out;
}

function finish(canvas, { srgb = true, repeat = 1, key = null } = {}) {
  const src = downscale(canvas, srgb ? ALBEDO_DIVISOR : DATA_MAP_DIVISOR * ALBEDO_DIVISOR);
  const tex = new THREE.CanvasTexture(src);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = ANISOTROPY;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (repeat !== 1) tex.repeat.set(repeat, repeat);
  if (key) tex.name = key;
  tex.needsUpdate = true;
  return tex;
}

/** Memoised texture-set builder. */
export function cached(key, factory) {
  if (CACHE.has(key)) return CACHE.get(key);
  const v = factory();
  CACHE.set(key, v);
  return v;
}

export function clearTextureCache() {
  for (const v of CACHE.values()) {
    if (v?.isTexture) v.dispose?.();
    else if (v && typeof v === 'object') {
      for (const t of Object.values(v)) t?.dispose?.();
    }
  }
  CACHE.clear();
}

export function textureCacheSize() {
  return CACHE.size;
}

/* ------------------------------------------------------------------ */
/* Noise primitives (tileable)                                         */
/* ------------------------------------------------------------------ */

function makeValueNoise(seed) {
  const rnd = makeRng(seed);
  const perm = new Float32Array(256 * 256);
  for (let i = 0; i < perm.length; i++) perm[i] = rnd();
  return (x, y, period) => {
    const p = period | 0;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const at = (ax, ay) => {
      const wx = ((ax % p) + p) % p;
      const wy = ((ay % p) + p) % p;
      return perm[((wy & 255) << 8) | (wx & 255)];
    };
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
}

/** Tileable fractal noise sampled into a Float32Array of size*size. */
export function fbmField(size, { seed = 1, octaves = 5, baseFreq = 4, gain = 0.5, lacunarity = 2, ridged = false } = {}) {
  const noise = makeValueNoise(seed);
  const out = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let amp = 1;
      let freq = baseFreq;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        let n = noise((x / size) * freq, (y / size) * freq, freq);
        if (ridged) n = 1 - Math.abs(n * 2 - 1);
        sum += n * amp;
        norm += amp;
        amp *= gain;
        freq *= lacunarity;
      }
      const v = sum / norm;
      out[y * size + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const inv = 1 / Math.max(1e-6, max - min);
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) * inv;
  return out;
}

/** Tileable Worley/cellular field — used for tiles, snow crust, cracked plaster. */
export function worleyField(size, { seed = 1, cells = 8, mode = 'f1' } = {}) {
  const rnd = makeRng(seed);
  const pts = [];
  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      pts.push([(cx + rnd()) / cells, (cy + rnd()) / cells]);
    }
  }
  const out = new Float32Array(size * size);
  let max = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x / size;
      const py = y / size;
      let f1 = 9;
      let f2 = 9;
      for (const [qx, qy] of pts) {
        let dx = Math.abs(px - qx);
        let dy = Math.abs(py - qy);
        if (dx > 0.5) dx = 1 - dx;
        if (dy > 0.5) dy = 1 - dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) f2 = d;
      }
      const v = mode === 'f2f1' ? f2 - f1 : f1;
      out[y * size + x] = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] /= max || 1;
  return out;
}

/** Render a float field into a canvas via a colour ramp callback. */
export function fieldToCanvas(field, size, ramp) {
  const cv = makeCanvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < field.length; i++) {
    const [r, g, b, a = 255] = ramp(field[i], i % size, (i / size) | 0);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Sobel height -> tangent-space normal map canvas. */
export function heightToNormal(height, size, strength = 2.2) {
  const cv = makeCanvas(size);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);
      const dx = tl + 2 * l + bl - (tr + 2 * r + br);
      const dy = tl + 2 * t + tr - (bl + 2 * b + br);
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/** Greyscale canvas from a float field with min/max remap. */
export function greyCanvas(field, size, lo = 0, hi = 1) {
  return fieldToCanvas(field, size, (v) => {
    const g = Math.round(Math.max(0, Math.min(1, lo + v * (hi - lo))) * 255);
    return [g, g, g];
  });
}

/** Read a canvas into a float luminance field so painted detail can drive normals. */
export function canvasToField(canvas) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const d = ctx.getImageData(0, 0, size, canvas.height).data;
  const out = new Float32Array(size * canvas.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Drawing helpers that respect tiling                                 */
/* ------------------------------------------------------------------ */

/** Draw the same callback nine times so shapes crossing the seam wrap. */
export function tiled(ctx, size, draw) {
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      ctx.save();
      ctx.translate(ox * size, oy * size);
      draw(ctx);
      ctx.restore();
    }
  }
}

export function speckle(ctx, size, count, rnd, colorFn, rMin = 0.5, rMax = 2) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = rMin + rnd() * (rMax - rMin);
    ctx.fillStyle = colorFn(rnd, i);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // wrap
    if (x < r) { ctx.beginPath(); ctx.arc(x + size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (x > size - r) { ctx.beginPath(); ctx.arc(x - size, y, r, 0, Math.PI * 2); ctx.fill(); }
    if (y < r) { ctx.beginPath(); ctx.arc(x, y + size, r, 0, Math.PI * 2); ctx.fill(); }
    if (y > size - r) { ctx.beginPath(); ctx.arc(x, y - size, r, 0, Math.PI * 2); ctx.fill(); }
  }
}

export function fillHex(ctx, hex, size) {
  ctx.fillStyle = rgbCss(hex);
  ctx.fillRect(0, 0, size, size);
}

/** Composite a float field over a canvas as multiply-ish shading. */
export function overlayField(canvas, field, amount = 0.15, bias = 0.5) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < field.length; i++) {
    const f = 1 + (field[i] - bias) * amount * 2;
    img.data[i * 4] = Math.max(0, Math.min(255, img.data[i * 4] * f));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, img.data[i * 4 + 1] * f));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, img.data[i * 4 + 2] * f));
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/* ------------------------------------------------------------------ */
/* Material texture sets                                               */
/* ------------------------------------------------------------------ */

/**
 * A "texture set" is { map, normalMap, roughnessMap, aoMap?, emissiveMap? }
 * All maps for a set share UV space and tiling.
 */

export function paintedDrywall({ size = 512, seed = 11, color = C.drywallWarm, scuff = 0.5 } = {}) {
  const key = `drywall:${size}:${seed}:${color}:${scuff}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    // Roller stipple + orange peel
    const grain = fbmField(size, { seed: seed + 3, octaves: 6, baseFreq: 48, gain: 0.55 });
    overlayField(cv, grain, 0.055);
    const broad = fbmField(size, { seed: seed + 9, octaves: 4, baseFreq: 3, gain: 0.6 });
    overlayField(cv, broad, 0.05);
    // Faint scuffs near the lower band of the tile
    ctx.globalAlpha = 0.05 * scuff;
    for (let i = 0; i < 22 * scuff; i++) {
      ctx.strokeStyle = `rgba(70,66,60,${0.25 + rnd() * 0.4})`;
      ctx.lineWidth = 0.6 + rnd() * 2.2;
      ctx.beginPath();
      const x = rnd() * size;
      const y = rnd() * size;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 90, y + (rnd() - 0.5) * 22);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const height = new Float32Array(size * size);
    for (let i = 0; i < height.length; i++) height[i] = grain[i] * 0.7 + broad[i] * 0.3;
    const nrm = heightToNormal(height, size, 0.55);
    const rough = greyCanvas(grain, size, 0.84, 0.95);
    return {
      map: finish(cv, { key }),
      normalMap: finish(nrm, { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
      normalScale: 0.45,
    };
  });
}

export function plaster({ size = 512, seed = 21, color = C.plaster, cracked = false } = {}) {
  const key = `plaster:${size}:${seed}:${color}:${cracked}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 6, baseFreq: 10, gain: 0.55 });
    overlayField(cv, f, 0.09);
    const height = Float32Array.from(f);
    if (cracked) {
      const w = worleyField(size, { seed: seed + 5, cells: 7, mode: 'f2f1' });
      ctx.save();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = w[y * size + x];
          if (v < 0.035) {
            ctx.fillStyle = `rgba(90,84,76,${(1 - v / 0.035) * 0.55})`;
            ctx.fillRect(x, y, 1, 1);
            height[y * size + x] -= (1 - v / 0.035) * 0.6;
          }
        }
      }
      ctx.restore();
    }
    const nrm = heightToNormal(height, size, cracked ? 1.6 : 0.7);
    const rough = greyCanvas(f, size, 0.88, 0.98);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: cracked ? 0.9 : 0.5 };
  });
}

export function acousticCeilingTile({ size = 512, seed = 31, stained = false, color = C.ceilingTileColor } = {}) {
  const key = `ceiltile:${size}:${seed}:${stained}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    // Fissured mineral fibre pattern
    const f = fbmField(size, { seed: seed + 1, octaves: 5, baseFreq: 26, gain: 0.5, ridged: true });
    const height = new Float32Array(size * size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < f.length; i++) {
      const v = f[i];
      const fis = v < 0.32 ? (0.32 - v) / 0.32 : 0;
      const shade = 1 - fis * 0.28;
      img.data[i * 4] *= shade;
      img.data[i * 4 + 1] *= shade;
      img.data[i * 4 + 2] *= shade;
      height[i] = 1 - fis;
    }
    ctx.putImageData(img, 0, 0);
    // Pinholes
    speckle(ctx, size, 900, rnd, () => 'rgba(120,116,108,0.5)', 0.6, 1.5);
    if (stained) {
      for (let i = 0; i < 3; i++) {
        const x = rnd() * size;
        const y = rnd() * size;
        const r = 40 + rnd() * 70;
        const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
        g.addColorStop(0, 'rgba(150,116,72,0.55)');
        g.addColorStop(0.6, 'rgba(168,140,98,0.28)');
        g.addColorStop(1, 'rgba(168,140,98,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const nrm = heightToNormal(height, size, 1.1);
    const rough = greyCanvas(f, size, 0.94, 0.99);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.7 };
  });
}

export function commercialCarpet({ size = 512, seed = 41, color = C.carpetSlate, accent = null, wear = 0.35 } = {}) {
  const key = `carpet:${size}:${seed}:${color}:${accent}:${wear}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    // Loop-pile: dense short strokes in two directions + tonal flecks
    const acc = accent ?? color;
    for (let i = 0; i < size * 26; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const len = 1.6 + rnd() * 3.4;
      const dark = rnd() < 0.5;
      const base = dark ? 0.78 + rnd() * 0.16 : 1.06 + rnd() * 0.14;
      const useAcc = rnd() < 0.18;
      const c = useAcc ? acc : color;
      const r = Math.min(255, ((c >> 16) & 255) * base);
      const g = Math.min(255, ((c >> 8) & 255) * base);
      const b = Math.min(255, (c & 255) * base);
      ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},0.5)`;
      ctx.lineWidth = 0.9 + rnd() * 0.7;
      ctx.beginPath();
      const ang = rnd() < 0.5 ? 0.15 : Math.PI / 2 + 0.15;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
    // Tile squares (carpet tiles laid quarter-turn)
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const p = (i * size) / 2;
      ctx.beginPath();
      ctx.moveTo(p, 0); ctx.lineTo(p, size);
      ctx.moveTo(0, p); ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const pile = fbmField(size, { seed: seed + 7, octaves: 6, baseFreq: 96, gain: 0.55 });
    const blotch = fbmField(size, { seed: seed + 13, octaves: 4, baseFreq: 5, gain: 0.6 });
    overlayField(cv, blotch, 0.07 + wear * 0.06);
    const nrm = heightToNormal(pile, size, 1.15);
    const rough = greyCanvas(pile, size, 0.9, 0.995);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.55 };
  });
}

export function vinylFloor({ size = 512, seed = 51, color = C.vinylGrey, plank = false } = {}) {
  const key = `vinyl:${size}:${seed}:${color}:${plank}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 6, baseFreq: 34, gain: 0.5 });
    overlayField(cv, f, 0.1);
    speckle(ctx, size, 2600, rnd, (r) => `rgba(${40 + r() * 130 | 0},${40 + r() * 130 | 0},${40 + r() * 130 | 0},0.24)`, 0.5, 1.8);
    const height = Float32Array.from(f);
    if (plank) {
      const rows = 4;
      const rh = size / rows;
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < rows; i++) {
        const y = i * rh;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
        const off = (i % 2) * (size / 2);
        for (let j = 0; j < 2; j++) {
          const x = ((off + j * (size / 2)) % size);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rh); ctx.stroke();
        }
        for (let y2 = 0; y2 < rh; y2++) {
          const gy = ((y + y2) | 0) % size;
          for (let x = 0; x < size; x++) height[gy * size + x] += 0;
        }
      }
    }
    const nrm = heightToNormal(height, size, 0.5);
    const rough = greyCanvas(f, size, 0.42, 0.6);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.35 };
  });
}

export function ceramicTile({ size = 512, seed = 61, color = C.ceramicTile, cells = 6, groutColor = 0x9a978f, wet = 0 } = {}) {
  const key = `ceramic:${size}:${seed}:${color}:${cells}:${wet}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = rgbCss(groutColor);
    ctx.fillRect(0, 0, size, size);
    const t = size / cells;
    const grout = 2.4;
    const height = new Float32Array(size * size).fill(0.25);
    for (let gy = 0; gy < cells; gy++) {
      for (let gx = 0; gx < cells; gx++) {
        const v = 0.94 + rnd() * 0.1;
        const r = Math.min(255, ((color >> 16) & 255) * v);
        const g = Math.min(255, ((color >> 8) & 255) * v);
        const b = Math.min(255, (color & 255) * v);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        const x = gx * t + grout;
        const y = gy * t + grout;
        const w = t - grout * 2;
        roundRect(ctx, x, y, w, w, 2.5);
        ctx.fill();
        for (let yy = Math.ceil(y); yy < y + w; yy++) {
          for (let xx = Math.ceil(x); xx < x + w; xx++) height[(yy % size) * size + (xx % size)] = 1;
        }
      }
    }
    const f = fbmField(size, { seed: seed + 4, octaves: 5, baseFreq: 40, gain: 0.5 });
    overlayField(cv, f, 0.035);
    const nrm = heightToNormal(height, size, 2.6);
    const rough = fieldToCanvas(height, size, (v, x, y) => {
      const base = v > 0.6 ? 0.2 : 0.72;
      const jitter = f[y * size + x] * 0.06;
      const g = Math.round(Math.max(0, base + jitter - wet * 0.55) * 255);
      return [g, g, g];
    });
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.85 };
  });
}

export function concrete({ size = 512, seed = 71, color = C.concrete, polished = false, formLines = false } = {}) {
  const key = `concrete:${size}:${seed}:${color}:${polished}:${formLines}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const broad = fbmField(size, { seed, octaves: 5, baseFreq: 4, gain: 0.6 });
    const fine = fbmField(size, { seed: seed + 2, octaves: 6, baseFreq: 60, gain: 0.5 });
    overlayField(cv, broad, 0.13);
    overlayField(cv, fine, 0.07);
    speckle(ctx, size, 1400, rnd, (r) => `rgba(${60 + r() * 90 | 0},${60 + r() * 90 | 0},${58 + r() * 88 | 0},0.3)`, 0.5, 2.6);
    // Aggregate pops and small pits
    speckle(ctx, size, 140, rnd, () => 'rgba(45,45,44,0.5)', 1.2, 3.4);
    const height = new Float32Array(size * size);
    for (let i = 0; i < height.length; i++) height[i] = fine[i] * 0.6 + broad[i] * 0.4;
    if (formLines) {
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = (i * size) / 3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }
    }
    const nrm = heightToNormal(height, size, polished ? 0.5 : 1.5);
    const rough = greyCanvas(fine, size, polished ? 0.28 : 0.74, polished ? 0.45 : 0.92);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: polished ? 0.4 : 0.9 };
  });
}

export function woodVeneer({ size = 512, seed = 81, color = C.woodVeneer, dark = false } = {}) {
  const key = `wood:${size}:${seed}:${color}:${dark}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, dark ? C.woodDark : color, size);
    const warp = fbmField(size, { seed: seed + 1, octaves: 4, baseFreq: 3, gain: 0.55 });
    const img = ctx.getImageData(0, 0, size, size);
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        const w = warp[i] * 26;
        const g = Math.sin(((x + w) / size) * Math.PI * 2 * 11) * 0.5 + 0.5;
        const rings = Math.pow(g, 2.4);
        const grain = rings * 0.36 + warp[i] * 0.12;
        const shadeV = 1 - grain * 0.42;
        img.data[i * 4] *= shadeV;
        img.data[i * 4 + 1] *= shadeV;
        img.data[i * 4 + 2] *= shadeV;
        height[i] = 1 - grain;
      }
    }
    ctx.putImageData(img, 0, 0);
    speckle(ctx, size, 300, rnd, () => 'rgba(50,32,18,0.22)', 0.4, 1.2);
    const nrm = heightToNormal(height, size, 0.7);
    const rough = greyCanvas(height, size, 0.34, 0.5);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.4 };
  });
}

export function laminate({ size = 512, seed = 91, color = C.laminateGrey } = {}) {
  const key = `laminate:${size}:${seed}:${color}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 5, baseFreq: 70, gain: 0.5 });
    overlayField(cv, f, 0.05);
    speckle(ctx, size, 1800, rnd, (r) => `rgba(${90 + r() * 90 | 0},${88 + r() * 90 | 0},${84 + r() * 90 | 0},0.16)`, 0.4, 1.1);
    const nrm = heightToNormal(f, size, 0.35);
    const rough = greyCanvas(f, size, 0.3, 0.42);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.22 };
  });
}

export function brushedMetal({ size = 512, seed = 101, color = C.brushedAlu, vertical = false, scratch = 0.5 } = {}) {
  const key = `brushed:${size}:${seed}:${color}:${vertical}:${scratch}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const height = new Float32Array(size * size).fill(0.5);
    for (let i = 0; i < size * 22; i++) {
      const p = rnd() * size;
      const v = 0.82 + rnd() * 0.34;
      ctx.strokeStyle = `rgba(255,255,255,${(v - 1) * 0.6 + 0.12})`;
      ctx.globalCompositeOperation = v > 1 ? 'lighter' : 'source-over';
      if (v <= 1) ctx.strokeStyle = `rgba(0,0,0,${(1 - v) * 0.4})`;
      ctx.lineWidth = 0.5 + rnd() * 1.4;
      ctx.beginPath();
      if (vertical) { ctx.moveTo(p, 0); ctx.lineTo(p + (rnd() - 0.5) * 3, size); }
      else { ctx.moveTo(0, p); ctx.lineTo(size, p + (rnd() - 0.5) * 3); }
      ctx.stroke();
      const idx = Math.min(size - 1, Math.max(0, p | 0));
      for (let k = 0; k < size; k++) {
        const gi = vertical ? k * size + idx : idx * size + k;
        height[gi] = 0.5 + (v - 1) * 0.9;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    const f = fbmField(size, { seed: seed + 5, octaves: 4, baseFreq: 8, gain: 0.6 });
    overlayField(cv, f, 0.04);
    const nrm = heightToNormal(height, size, 0.45);
    const rough = fieldToCanvas(height, size, (v, x, y) => {
      const g = Math.round(Math.max(0, Math.min(1, 0.3 + (0.5 - v) * 0.35 + f[y * size + x] * 0.08)) * 255);
      return [g, g, g];
    });
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.3 };
  });
}

export function paintedMetal({ size = 512, seed = 111, color = C.paintedMetal, chipped = 0.3 } = {}) {
  const key = `paintmetal:${size}:${seed}:${color}:${chipped}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 5, baseFreq: 30, gain: 0.5 });
    overlayField(cv, f, 0.05);
    const height = Float32Array.from(f);
    const chips = Math.round(60 * chipped);
    for (let i = 0; i < chips; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 1 + rnd() * 4;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,108,92,0.7)' : 'rgba(64,58,52,0.6)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const nrm = heightToNormal(height, size, 0.6);
    const rough = greyCanvas(f, size, 0.46, 0.62);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.28 };
  });
}

export function fabricWeave({ size = 512, seed = 121, color = C.chairFabric, coarse = 1 } = {}) {
  const key = `fabric:${size}:${seed}:${color}:${coarse}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const step = Math.max(3, Math.round(5 * coarse));
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const even = ((x / step) | 0) % 2 === ((y / step) | 0) % 2;
        const v = even ? 1.1 + rnd() * 0.1 : 0.88 + rnd() * 0.1;
        const r = Math.min(255, ((color >> 16) & 255) * v);
        const g = Math.min(255, ((color >> 8) & 255) * v);
        const b = Math.min(255, (color & 255) * v);
        ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
        ctx.fillRect(x, y, step, step);
        for (let yy = y; yy < y + step && yy < size; yy++)
          for (let xx = x; xx < x + step && xx < size; xx++) height[yy * size + xx] = even ? 0.75 : 0.35;
      }
    }
    const fuzz = fbmField(size, { seed: seed + 3, octaves: 5, baseFreq: 110, gain: 0.5 });
    overlayField(cv, fuzz, 0.09);
    for (let i = 0; i < height.length; i++) height[i] = height[i] * 0.7 + fuzz[i] * 0.3;
    const nrm = heightToNormal(height, size, 1.3);
    const rough = greyCanvas(fuzz, size, 0.88, 0.98);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.6 };
  });
}

export function leatherGrain({ size = 512, seed = 131, color = 0x3a3330 } = {}) {
  const key = `leather:${size}:${seed}:${color}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const w = worleyField(size, { size, seed, cells: 34, mode: 'f2f1' });
    const f = fbmField(size, { seed: seed + 2, octaves: 4, baseFreq: 60, gain: 0.5 });
    const height = new Float32Array(size * size);
    for (let i = 0; i < height.length; i++) height[i] = Math.min(1, w[i] * 2.2) * 0.75 + f[i] * 0.25;
    overlayField(cv, height, 0.14);
    const nrm = heightToNormal(height, size, 1.5);
    const rough = greyCanvas(height, size, 0.44, 0.64);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.7 };
  });
}

export function snowSurface({ size = 512, seed = 141, trampled = 0 } = {}) {
  const key = `snow:${size}:${seed}:${trampled}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, C.snowLit, size);
    const drift = fbmField(size, { seed, octaves: 6, baseFreq: 6, gain: 0.55 });
    const crust = worleyField(size, { seed: seed + 3, cells: 26, mode: 'f2f1' });
    const height = new Float32Array(size * size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < height.length; i++) {
      const h = drift[i] * 0.78 + crust[i] * 0.22;
      height[i] = h;
      const s = 0.9 + h * 0.16;
      // Cool shadow tint in the troughs — snow scatters blue in shade
      const b = 1 + (1 - h) * 0.06;
      img.data[i * 4] = Math.min(255, img.data[i * 4] * s);
      img.data[i * 4 + 1] = Math.min(255, img.data[i * 4 + 1] * s * 1.005);
      img.data[i * 4 + 2] = Math.min(255, img.data[i * 4 + 2] * s * b);
    }
    ctx.putImageData(img, 0, 0);
    // Sparkle: individual ice facets
    speckle(ctx, size, 700, rnd, () => 'rgba(255,255,255,0.85)', 0.4, 1.1);
    if (trampled > 0) {
      ctx.globalAlpha = trampled * 0.5;
      for (let i = 0; i < 40 * trampled; i++) {
        const x = rnd() * size;
        const y = rnd() * size;
        ctx.fillStyle = `rgba(150,168,188,${0.2 + rnd() * 0.3})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 5 + rnd() * 9, 3 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const nrm = heightToNormal(height, size, 1.8);
    const rough = greyCanvas(height, size, 0.62, 0.86);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.85 };
  });
}

export function frostedGlassTex({ size = 256, seed = 151 } = {}) {
  const key = `frosted:${size}:${seed}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e8f1f7';
    ctx.fillRect(0, 0, size, size);
    const f = fbmField(size, { seed, octaves: 6, baseFreq: 80, gain: 0.5 });
    overlayField(cv, f, 0.06);
    const nrm = heightToNormal(f, size, 0.9);
    const rough = greyCanvas(f, size, 0.42, 0.6);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.5 };
  });
}

export function cardboard({ size = 512, seed = 161 } = {}) {
  const key = `cardboard:${size}:${seed}`;
  return cached(key, () => {
    const rnd = makeRng(seed);
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, 0xb08a5e, size);
    const f = fbmField(size, { seed, octaves: 5, baseFreq: 44, gain: 0.5 });
    overlayField(cv, f, 0.1);
    speckle(ctx, size, 1200, rnd, () => 'rgba(120,90,58,0.22)', 0.4, 1.4);
    ctx.strokeStyle = 'rgba(120,92,60,0.18)';
    ctx.lineWidth = 1.2;
    for (let x = 0; x < size; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    }
    const nrm = heightToNormal(f, size, 0.8);
    const rough = greyCanvas(f, size, 0.8, 0.94);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.45 };
  });
}

export function paperTex({ size = 256, seed = 171, color = 0xf4f2ec } = {}) {
  const key = `paper:${size}:${seed}:${color}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 5, baseFreq: 90, gain: 0.5 });
    overlayField(cv, f, 0.035);
    const nrm = heightToNormal(f, size, 0.3);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), normalScale: 0.15, roughness: 0.86 };
  });
}

export function rubberTex({ size = 256, seed = 181, color = C.rubber } = {}) {
  const key = `rubber:${size}:${seed}:${color}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = fbmField(size, { seed, octaves: 5, baseFreq: 70, gain: 0.55 });
    overlayField(cv, f, 0.09);
    const nrm = heightToNormal(f, size, 1.1);
    const rough = greyCanvas(f, size, 0.86, 0.96);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.5 };
  });
}

export function hardPlasticTex({ size = 256, seed = 191, color = C.plasticDark, texturedGrain = true } = {}) {
  const key = `plastic:${size}:${seed}:${color}:${texturedGrain}`;
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    fillHex(ctx, color, size);
    const f = texturedGrain
      ? worleyField(size, { seed, cells: 48, mode: 'f2f1' })
      : fbmField(size, { seed, octaves: 3, baseFreq: 20, gain: 0.5 });
    overlayField(cv, f, texturedGrain ? 0.07 : 0.03);
    const nrm = heightToNormal(f, size, texturedGrain ? 0.85 : 0.25);
    const rough = greyCanvas(f, size, 0.34, 0.48);
    return { map: finish(cv, { key }), normalMap: finish(nrm, { srgb: false }), roughnessMap: finish(rough, { srgb: false }), normalScale: 0.4 };
  });
}

/* ------------------------------------------------------------------ */
/* Utility shapes                                                      */
/* ------------------------------------------------------------------ */

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Build a non-tiling decorative texture from a paint callback. */
export function painted(key, size, draw, opts = {}) {
  return cached(key, () => {
    const cv = makeCanvas(size, opts.height ?? size);
    const ctx = cv.getContext('2d');
    draw(ctx, cv.width, cv.height);
    const tex = finish(cv, { srgb: opts.srgb !== false, key });
    tex.wrapS = tex.wrapT = opts.wrap ?? THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/** Build an alpha-cut decal texture (transparent background). */
export function decalTexture(key, size, draw) {
  return cached(key, () => {
    const cv = makeCanvas(size);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    draw(ctx, size);
    const tex = finish(cv, { key });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

export { finish as finishTexture };
