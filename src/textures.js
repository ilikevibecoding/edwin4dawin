// Canvas-based procedural texture toolkit. All maps in the project are generated here.
// Deterministic via makeRng streams. No downloaded assets.

import * as THREE from 'three';
import { makeRng } from './rng.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------------------------------------------------------------------------
// Noise fields (typed arrays, cached)
// ---------------------------------------------------------------------------
const noiseCache = new Map();

function valueNoiseGrid(seedName, gw, gh) {
  const key = `g:${seedName}:${gw}x${gh}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const rng = makeRng(seedName);
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  noiseCache.set(key, g);
  return g;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// Tileable value-noise field, size w*h, cell count `cells` across.
export function noiseField(w, h, cells, seedName) {
  const key = `f:${seedName}:${w}x${h}:${cells}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const gw = cells, gh = Math.max(1, Math.round(cells * h / w));
  const grid = valueNoiseGrid(seedName, gw, gh);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = (y / h) * gh;
    const y0 = Math.floor(gy) % gh, y1 = (y0 + 1) % gh;
    const ty = smooth(gy - Math.floor(gy));
    for (let x = 0; x < w; x++) {
      const gx = (x / w) * gw;
      const x0 = Math.floor(gx) % gw, x1 = (x0 + 1) % gw;
      const tx = smooth(gx - Math.floor(gx));
      const a = grid[y0 * gw + x0], b = grid[y0 * gw + x1];
      const c = grid[y1 * gw + x0], d = grid[y1 * gw + x1];
      out[y * w + x] = (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  }
  noiseCache.set(key, out);
  return out;
}

export function fbmField(w, h, baseCells, octaves, seedName, gain = 0.5) {
  const key = `fbm:${seedName}:${w}x${h}:${baseCells}:${octaves}:${gain}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const out = new Float32Array(w * h);
  let amp = 1, total = 0, cells = baseCells;
  for (let o = 0; o < octaves; o++) {
    const f = noiseField(w, h, Math.min(cells, 512), `${seedName}:o${o}`);
    for (let i = 0; i < out.length; i++) out[i] += f[i] * amp;
    total += amp; amp *= gain; cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  noiseCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Painters (operate on 2d contexts)
// ---------------------------------------------------------------------------

export function fillBase(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

// Multiplies/lightens pixels with an fbm field for mottled paint.
export function mottle(ctx, seedName, { cells = 6, octaves = 4, amount = 0.1, tint = null } = {}) {
  const { width: w, height: h } = ctx.canvas;
  const f = fbmField(w, h, cells, octaves, seedName);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const tr = tint ? tint[0] : 1, tg = tint ? tint[1] : 1, tb = tint ? tint[2] : 1;
  for (let i = 0, p = 0; i < f.length; i++, p += 4) {
    const v = 1 + (f[i] - 0.5) * 2 * amount;
    d[p] = Math.min(255, d[p] * v * tr);
    d[p + 1] = Math.min(255, d[p + 1] * v * tg);
    d[p + 2] = Math.min(255, d[p + 2] * v * tb);
  }
  ctx.putImageData(img, 0, 0);
}

// Vertical dirt/rust streaks starting from y0 band (e.g. under bolts / rib lines)
export function streaks(ctx, seedName, { count = 30, color = 'rgba(60,48,36,0.16)', y0 = 0, y1 = 1, minLen = 0.05, maxLen = 0.3, width = 2 } = {}) {
  const rng = makeRng(seedName);
  const { width: w, height: h } = ctx.canvas;
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const ys = (y0 + rng() * (y1 - y0)) * h;
    const len = (minLen + rng() * (maxLen - minLen)) * h;
    const grad = ctx.createLinearGradient(0, ys, 0, ys + len);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    const ww = width * (0.5 + rng());
    ctx.fillRect(x - ww / 2, ys, ww, len);
  }
}

export function splotches(ctx, seedName, { count = 18, color = 'rgba(30,26,22,0.10)', rMin = 8, rMax = 60, feather = 0.9 } = {}) {
  const rng = makeRng(seedName);
  const { width: w, height: h } = ctx.canvas;
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = rng() * h, r = rMin + rng() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, r * (1 - feather), x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

export function scratches(ctx, seedName, { count = 40, color = 'rgba(210,205,195,0.20)', maxLen = 60, width = 1 } = {}) {
  const rng = makeRng(seedName);
  const { width: w, height: h } = ctx.canvas;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = rng() * h;
    const a = rng() * Math.PI * 2;
    const len = (0.2 + rng() * 0.8) * maxLen;
    ctx.lineWidth = width * (0.5 + rng() * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
}

export function speckle(ctx, seedName, { count = 900, colors = ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.06)'], size = 1.5 } = {}) {
  const rng = makeRng(seedName);
  const { width: w, height: h } = ctx.canvas;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    const s = size * (0.4 + rng());
    ctx.fillRect(rng() * w, rng() * h, s, s);
  }
}

// Darkens along the borders of a rect (baked corner grime / AO)
export function edgeGrime(ctx, { inset = 0.06, color = 'rgba(18,16,14,0.35)', sides = { top: 1, bottom: 1, left: 1, right: 1 } } = {}) {
  const { width: w, height: h } = ctx.canvas;
  const px = Math.round(inset * Math.min(w, h));
  const mk = (x0, y0, x1, y1) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    return g;
  };
  if (sides.top) { ctx.fillStyle = mk(0, 0, 0, px); ctx.fillRect(0, 0, w, px); }
  if (sides.bottom) { ctx.fillStyle = mk(0, h, 0, h - px); ctx.fillRect(0, h - px, w, px); }
  if (sides.left) { ctx.fillStyle = mk(0, 0, px, 0); ctx.fillRect(0, 0, px, h); }
  if (sides.right) { ctx.fillStyle = mk(w, 0, w - px, 0); ctx.fillRect(w - px, 0, px, h); }
}

// Paint chips: bright metal flecks with dark rim, clustered near given band
export function paintChips(ctx, seedName, { count = 24, metal = 'rgba(120,118,112,0.9)', rim = 'rgba(35,30,25,0.85)', y0 = 0, y1 = 1, rMin = 1.5, rMax = 5 } = {}) {
  const rng = makeRng(seedName);
  const { width: w, height: h } = ctx.canvas;
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = (y0 + rng() * (y1 - y0)) * h;
    const r = rMin + rng() * (rMax - rMin);
    ctx.fillStyle = rim;
    blob(ctx, rng, x, y, r * 1.35);
    ctx.fillStyle = metal;
    blob(ctx, rng, x, y, r);
  }
}

function blob(ctx, rng, x, y, r) {
  ctx.beginPath();
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + rng() * 0.5);
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

export function stencilText(ctx, text, x, y, { size = 24, color = 'rgba(40,40,38,0.85)', rotate = 0, align = 'center', spacing = 2, font = 'bold %spx "Arial Narrow", "DejaVu Sans", sans-serif' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (rotate) ctx.rotate(rotate);
  ctx.font = font.replace('%s', size);
  ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (spacing > 0 && align === 'center') {
    const chars = [...String(text)];
    let total = 0;
    const widths = chars.map((ch) => { const w = ctx.measureText(ch).width + spacing; total += w; return w; });
    let cx = -total / 2;
    for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], cx + widths[i] / 2, 0); cx += widths[i]; }
  } else {
    ctx.fillText(String(text), 0, 0);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Height -> normal
// ---------------------------------------------------------------------------
export function normalFromHeight(heightCanvas, strength = 1.0) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const d = img.data;
  const hg = (x, y) => {
    x = (x + w) % w; y = (y + h) % h;
    return src[(y * w + x) * 4] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (hg(x - 1, y) - hg(x + 1, y)) * strength;
      const dy = (hg(x, y - 1) - hg(x, y + 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const p = (y * w + x) * 4;
      d[p] = ((dx / len) * 0.5 + 0.5) * 255;
      d[p + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      d[p + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      d[p + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

// Grayscale canvas from float field with mapping
export function fieldToCanvas(field, w, h, map = (v) => v) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0, p = 0; i < field.length; i++, p += 4) {
    const v = Math.max(0, Math.min(1, map(field[i]))) * 255;
    d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------------------
// Texture wrapper
// ---------------------------------------------------------------------------
export function canvasTexture(canvas, { srgb = false, repeatX = 1, repeatY = 1, wrap = true, aniso = 4, filter = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = aniso;
  if (!filter) { t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; }
  t.needsUpdate = true;
  return t;
}
