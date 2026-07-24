/**
 * materials.js — procedural texture + PBR material library.
 *
 * Everything here is generated at runtime with canvas 2D. No downloaded assets.
 * Families: painted hull panel, painted accent, worn metal, dark structure,
 *           fabric, rubber, plus grate / emissive / screen / glass specials.
 */
import * as THREE from 'three';

/* ------------------------------------------------------------------ palette */

export const PALETTE = {
  hull: 0xc9c3b4,
  hullDark: 0x8d887c,
  structure: 0x39424a,
  structureDeep: 0x232a30,
  metal: 0x8b9095,
  metalDark: 0x5b6166,
  accent: 0xd2601a,
  accentDeep: 0x93400f,
  teal: 0x2fe3d0,
  warm: 0xffb066,
  cool: 0x9fc8ff,
  fabric: 0x5d5a4a,
  fabricWarm: 0x8a4a33,
  rubber: 0x23282b,
  fogColor: 0x0d1418,
};

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/* ------------------------------------------------------------------- random */

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------- canvas */

function cvs(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/** Low-res white noise upscaled with smoothing == cheap smooth value noise. */
function smoothNoiseCanvas(size, cells, seed, contrast = 1) {
  const rnd = mulberry32(seed);
  const small = cvs(cells);
  const sctx = small.getContext('2d');
  const img = sctx.createImageData(cells, cells);
  for (let i = 0; i < cells * cells; i++) {
    let v = rnd() * 255;
    v = 128 + (v - 128) * contrast;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  const out = cvs(size);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, size, size);
  return out;
}

/** Multi-octave fbm as a grayscale canvas (uses the upscale trick per octave). */
function fbmCanvas(size, seed, octaves = 4, baseCells = 4, gain = 0.5) {
  const out = cvs(size);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  let amp = 1, cells = baseCells, total = 0;
  for (let o = 0; o < octaves; o++) { total += amp; amp *= gain; }
  amp = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (let o = 0; o < octaves; o++) {
    const layer = smoothNoiseCanvas(size, cells, seed + o * 977, 1);
    ctx.globalAlpha = (amp / total) * 0.9;
    ctx.drawImage(layer, 0, 0);
    amp *= gain;
    cells = Math.min(cells * 2, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/* ------------------------------------------------------------------ painters */

function paintPanelGrid(ctx, size, opts) {
  const {
    cols = 3, rows = 2, gap = 4, seed = 1,
    lineDark = 'rgba(12,14,16,0.85)', lineLight = 'rgba(255,255,255,0.16)',
    tintVar = 0.05, base = '#c9c3b4',
  } = opts;
  const rnd = mulberry32(seed);
  const cw = size / cols, ch = size / rows;

  // per-panel tint variation
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = (rnd() - 0.5) * 2 * tintVar;
      ctx.fillStyle = shade(base, v);
      ctx.fillRect(x * cw, y * ch, cw, ch);
    }
  }
  // seams
  ctx.lineWidth = gap;
  ctx.strokeStyle = lineDark;
  for (let x = 0; x <= cols; x++) line(ctx, x * cw, 0, x * cw, size);
  for (let y = 0; y <= rows; y++) line(ctx, 0, y * ch, size, y * ch);
  // highlight lip under each seam
  ctx.lineWidth = Math.max(1, gap * 0.4);
  ctx.strokeStyle = lineLight;
  for (let x = 0; x <= cols; x++) line(ctx, x * cw + gap * 0.7, 0, x * cw + gap * 0.7, size);
  for (let y = 0; y <= rows; y++) line(ctx, 0, y * ch + gap * 0.7, size, y * ch + gap * 0.7);
}

function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}

function shade(hexStr, amount) {
  const c = new THREE.Color(hexStr);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return '#' + c.getHexString();
}

function paintRivets(ctx, size, opts) {
  const { cols = 3, rows = 2, inset = 14, r = 3.2, seed = 7, color = 'rgba(0,0,0,0.45)', hi = 'rgba(255,255,255,0.3)' } = opts;
  const rnd = mulberry32(seed);
  const cw = size / cols, ch = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const x0 = x * cw + inset, y0 = y * ch + inset;
      const x1 = (x + 1) * cw - inset, y1 = (y + 1) * ch - inset;
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
      // plus a bolt row along the top edge
      const n = 4;
      for (let i = 1; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0]);
      for (const [px, py] of pts) {
        if (rnd() < 0.12) continue;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(px, py + 1, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hi;
        ctx.beginPath(); ctx.arc(px - r * 0.25, py - r * 0.3, r * 0.55, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function paintScratches(ctx, size, { count = 90, seed = 3, color = 'rgba(255,255,255,0.14)', maxLen = 90 } = {}) {
  const rnd = mulberry32(seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = rnd() * size, y = rnd() * size;
    const a = (rnd() - 0.5) * 0.6 + (rnd() < 0.5 ? 0 : Math.PI / 2);
    const len = 6 + rnd() * maxLen;
    ctx.strokeStyle = color;
    ctx.lineWidth = rnd() < 0.8 ? 1 : 2;
    ctx.globalAlpha = 0.25 + rnd() * 0.75;
    line(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  ctx.globalAlpha = 1;
}

function paintStreaks(ctx, size, { count = 26, seed = 11, color = '10,12,10', alpha = 0.22, fromTop = true } = {}) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size;
    const w = 2 + rnd() * 16;
    const h = size * (0.15 + rnd() * 0.6);
    const y = fromTop ? 0 : size - h;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const a = alpha * (0.4 + rnd() * 0.6);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
}

function paintGrime(ctx, size, { seed = 5, alpha = 0.35, color = '18,20,18', cells = 6 } = {}) {
  const n = fbmCanvas(size, seed, 4, cells, 0.55);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(n, 0, 0);
  ctx.restore();
  // a couple of dark blotches
  const rnd = mulberry32(seed + 31);
  for (let i = 0; i < 5; i++) {
    const x = rnd() * size, y = rnd() * size, r = size * (0.05 + rnd() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${0.25 * alpha * 2})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
}

function paintStencil(ctx, size, { text = 'A-04', x = 0.08, y = 0.22, scale = 1, color = 'rgba(40,44,46,0.55)', seed = 2 } = {}) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.translate(size * x, size * y);
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(size * 0.07 * scale)}px "Arial Narrow", Impact, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.55 + rnd() * 0.3;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function paintHazard(ctx, x, y, w, h, { a = '#d2601a', b = '#1b1c1a', step = 18, alpha = 0.9 } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = a; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b;
  for (let i = -h; i < w + h; i += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + step, y + h);
    ctx.lineTo(x + i + step + h, y); ctx.lineTo(x + i + h, y);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function paintChips(ctx, size, { seed = 9, count = 60, color = '#8b9095', maxR = 7 } = {}) {
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size, y = rnd() * size, r = 1.5 + rnd() * maxR;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35 + rnd() * 0.55;
    ctx.beginPath();
    const n = 5 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * (0.55 + rnd() * 0.7);
      ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------- map plumbing */

let MAX_ANISO = 4;
export function initMaterials(renderer) {
  MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
}

function tex(canvas, { srgb = false, aniso = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso ? MAX_ANISO : 1;
  t.needsUpdate = true;
  return t;
}

/** Sobel a grayscale height canvas into a tangent-space normal map. */
function normalFromHeight(heightCanvas, strength = 1.6) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, size, size).data;
  const out = new Uint8Array(size * size * 4);
  const H = (x, y) => {
    const xi = (x + size) % size, yi = (y + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = H(x - 1, y - 1), t0 = H(x, y - 1), tr = H(x + 1, y - 1);
      const l0 = H(x - 1, y), r0 = H(x + 1, y);
      const bl = H(x - 1, y + 1), b0 = H(x, y + 1), br = H(x + 1, y + 1);
      const dx = (tr + 2 * r0 + br) - (tl + 2 * l0 + bl);
      const dy = (bl + 2 * b0 + br) - (tl + 2 * t0 + tr);
      let nx = -dx * strength, ny = -dy * strength, nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv; ny *= inv; nz *= inv;
      const i = (y * size + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nz * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(out, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = MAX_ANISO;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------- texture sets */

const _cache = new Map();
function cached(key, fn) {
  if (!_cache.has(key)) _cache.set(key, fn());
  return _cache.get(key);
}

/**
 * Painted hull panel: bone plating with seams, bolts, grime, chipped paint.
 */
function hullPanelSet(size, seed, baseHex, opts = {}) {
  const { cols = 3, rows = 2, stencil = 'A-04', hazard = false, grime = 0.4 } = opts;
  const base = hex(baseHex);

  // ---- albedo
  const a = cvs(size); const ac = a.getContext('2d');
  paintPanelGrid(ac, size, { cols, rows, gap: size / 180, seed, base, tintVar: 0.045 });
  paintRivets(ac, size, { cols, rows, inset: size * 0.035, r: size / 300, seed: seed + 1 });
  if (hazard) paintHazard(ac, 0, size * 0.86, size, size * 0.09, { step: size / 26, alpha: 0.85 });
  paintStencil(ac, size, { text: stencil, seed: seed + 2, x: 0.1, y: 0.14 });
  paintChips(ac, size, { seed: seed + 3, count: 70, color: hex(PALETTE.metal), maxR: size / 150 });
  paintStreaks(ac, size, { seed: seed + 4, count: 22, alpha: 0.18 });
  paintGrime(ac, size, { seed: seed + 5, alpha: grime });
  paintScratches(ac, size, { seed: seed + 6, count: 70, maxLen: size / 12, color: 'rgba(255,255,255,0.10)' });

  // ---- roughness
  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#9a9a9a'; rc.fillRect(0, 0, size, size);
  const rn = fbmCanvas(size, seed + 20, 4, 5, 0.5);
  rc.globalAlpha = 0.5; rc.drawImage(rn, 0, 0); rc.globalAlpha = 1;
  rc.strokeStyle = 'rgba(255,255,255,0.6)'; rc.lineWidth = size / 180;
  for (let x = 0; x <= cols; x++) line(rc, (x * size) / cols, 0, (x * size) / cols, size);
  for (let y = 0; y <= rows; y++) line(rc, 0, (y * size) / rows, size, (y * size) / rows);
  paintScratches(rc, size, { seed: seed + 6, count: 70, maxLen: size / 12, color: 'rgba(40,40,40,0.5)' });
  paintChips(rc, size, { seed: seed + 3, count: 70, color: 'rgba(70,70,70,0.8)', maxR: size / 150 });

  // ---- height -> normal
  const h = cvs(size); const hc = h.getContext('2d');
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size);
  hc.strokeStyle = '#1b1b1b'; hc.lineWidth = size / 170;
  for (let x = 0; x <= cols; x++) line(hc, (x * size) / cols, 0, (x * size) / cols, size);
  for (let y = 0; y <= rows; y++) line(hc, 0, (y * size) / rows, size, (y * size) / rows);
  paintRivets(hc, size, { cols, rows, inset: size * 0.035, r: size / 300, seed: seed + 1, color: '#b6b6b6', hi: '#e8e8e8' });
  const hn = fbmCanvas(size, seed + 40, 3, 8, 0.5);
  hc.globalAlpha = 0.18; hc.drawImage(hn, 0, 0); hc.globalAlpha = 1;

  // ---- metalness (paint chips are bare metal)
  const m = cvs(size); const mc = m.getContext('2d');
  mc.fillStyle = '#141414'; mc.fillRect(0, 0, size, size);
  paintChips(mc, size, { seed: seed + 3, count: 70, color: '#e8e8e8', maxR: size / 150 });
  paintScratches(mc, size, { seed: seed + 6, count: 70, maxLen: size / 12, color: 'rgba(200,200,200,0.6)' });

  return {
    map: tex(a, { srgb: true }),
    roughnessMap: tex(r),
    metalnessMap: tex(m),
    normalMap: normalFromHeight(h, 1.5),
  };
}

/** Bare worn metal: brushed, scratched, high metalness. */
function wornMetalSet(size, seed, baseHex = PALETTE.metal) {
  const base = hex(baseHex);
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = base; ac.fillRect(0, 0, size, size);
  const n = fbmCanvas(size, seed, 4, 6, 0.55);
  ac.globalAlpha = 0.45; ac.drawImage(n, 0, 0); ac.globalAlpha = 1;
  paintScratches(ac, size, { seed: seed + 1, count: 220, maxLen: size / 3, color: 'rgba(255,255,255,0.09)' });
  paintScratches(ac, size, { seed: seed + 2, count: 120, maxLen: size / 5, color: 'rgba(20,18,16,0.18)' });
  paintGrime(ac, size, { seed: seed + 3, alpha: 0.42, color: '30,24,18' });
  // rust hints
  const rnd = mulberry32(seed + 4);
  for (let i = 0; i < 8; i++) {
    const x = rnd() * size, y = rnd() * size, rr = size * (0.02 + rnd() * 0.06);
    const g = ac.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(120,62,30,0.35)');
    g.addColorStop(1, 'rgba(120,62,30,0)');
    ac.fillStyle = g; ac.beginPath(); ac.arc(x, y, rr, 0, Math.PI * 2); ac.fill();
  }

  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#6e6e6e'; rc.fillRect(0, 0, size, size);
  const rn = fbmCanvas(size, seed + 10, 4, 7, 0.55);
  rc.globalAlpha = 0.65; rc.drawImage(rn, 0, 0); rc.globalAlpha = 1;
  paintScratches(rc, size, { seed: seed + 1, count: 220, maxLen: size / 3, color: 'rgba(30,30,30,0.5)' });
  paintGrime(rc, size, { seed: seed + 3, alpha: 0.5, color: '255,255,255' });

  const h = cvs(size); const hc = h.getContext('2d');
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size);
  const hn = fbmCanvas(size, seed + 20, 3, 10, 0.5);
  hc.globalAlpha = 0.35; hc.drawImage(hn, 0, 0); hc.globalAlpha = 1;
  paintScratches(hc, size, { seed: seed + 1, count: 160, maxLen: size / 3, color: 'rgba(150,150,150,0.35)' });

  return { map: tex(a, { srgb: true }), roughnessMap: tex(r), normalMap: normalFromHeight(h, 1.0) };
}

/** Fabric: woven micro-detail, fully rough, no metal. */
function fabricSet(size, seed, baseHex) {
  const base = hex(baseHex);
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = base; ac.fillRect(0, 0, size, size);
  const n = fbmCanvas(size, seed, 5, 10, 0.6);
  ac.globalAlpha = 0.35; ac.drawImage(n, 0, 0); ac.globalAlpha = 1;
  // weave
  ac.globalAlpha = 0.10;
  ac.strokeStyle = '#000';
  ac.lineWidth = 1;
  for (let i = 0; i < size; i += 4) { line(ac, i, 0, i, size); line(ac, 0, i, size, i); }
  ac.globalAlpha = 1;
  paintGrime(ac, size, { seed: seed + 2, alpha: 0.3, color: '20,18,14' });

  const h = cvs(size); const hc = h.getContext('2d');
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size);
  const hn = fbmCanvas(size, seed + 5, 4, 24, 0.6);
  hc.globalAlpha = 0.7; hc.drawImage(hn, 0, 0); hc.globalAlpha = 1;

  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#e2e2e2'; rc.fillRect(0, 0, size, size);
  rc.globalAlpha = 0.25; rc.drawImage(fbmCanvas(size, seed + 8, 3, 6, 0.5), 0, 0); rc.globalAlpha = 1;

  return { map: tex(a, { srgb: true }), roughnessMap: tex(r), normalMap: normalFromHeight(h, 1.1) };
}

/** Floor plate: dark tread metal with worn walking path. */
function floorSet(size, seed) {
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = hex(PALETTE.metalDark); ac.fillRect(0, 0, size, size);
  // plate seams
  paintPanelGrid(ac, size, { cols: 2, rows: 2, gap: size / 150, seed, base: hex(PALETTE.metalDark), tintVar: 0.03 });
  // tread dashes
  const rnd = mulberry32(seed + 3);
  ac.save();
  for (let y = 0; y < size; y += size / 16) {
    for (let x = 0; x < size; x += size / 16) {
      const o = ((y / (size / 16)) % 2) * (size / 32);
      ac.fillStyle = `rgba(190,192,190,${0.10 + rnd() * 0.08})`;
      ac.save();
      ac.translate(x + o + size / 64, y + size / 64);
      ac.rotate(((y / (size / 16)) % 2 ? -1 : 1) * 0.6);
      ac.fillRect(-size / 60, -size / 260, size / 30, size / 130);
      ac.restore();
    }
  }
  ac.restore();
  paintScratches(ac, size, { seed: seed + 4, count: 180, maxLen: size / 4, color: 'rgba(255,255,255,0.07)' });
  paintGrime(ac, size, { seed: seed + 5, alpha: 0.55, color: '14,14,12' });
  paintStreaks(ac, size, { seed: seed + 6, count: 14, alpha: 0.15, color: '90,70,40' });

  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#8c8c8c'; rc.fillRect(0, 0, size, size);
  rc.globalAlpha = 0.55; rc.drawImage(fbmCanvas(size, seed + 11, 4, 5, 0.5), 0, 0); rc.globalAlpha = 1;
  // polished walk path down the middle
  const g = rc.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  rc.fillStyle = g; rc.fillRect(0, 0, size, size);

  const h = cvs(size); const hc = h.getContext('2d');
  hc.fillStyle = '#7a7a7a'; hc.fillRect(0, 0, size, size);
  hc.strokeStyle = '#242424'; hc.lineWidth = size / 150;
  line(hc, size / 2, 0, size / 2, size); line(hc, 0, size / 2, size, size / 2);
  for (let y = 0; y < size; y += size / 16) {
    for (let x = 0; x < size; x += size / 16) {
      const o = ((y / (size / 16)) % 2) * (size / 32);
      hc.fillStyle = '#c8c8c8';
      hc.save();
      hc.translate(x + o + size / 64, y + size / 64);
      hc.rotate(((y / (size / 16)) % 2 ? -1 : 1) * 0.6);
      hc.fillRect(-size / 60, -size / 260, size / 30, size / 130);
      hc.restore();
    }
  }

  const m = cvs(size); const mc = m.getContext('2d');
  mc.fillStyle = '#cfcfcf'; mc.fillRect(0, 0, size, size);
  mc.globalAlpha = 0.4; mc.drawImage(fbmCanvas(size, seed + 12, 3, 5, 0.5), 0, 0); mc.globalAlpha = 1;

  return {
    map: tex(a, { srgb: true }),
    roughnessMap: tex(r),
    metalnessMap: tex(m),
    normalMap: normalFromHeight(h, 1.4),
  };
}

/** Grate: alpha-cut slotted plate. */
function grateSet(size, seed) {
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = hex(PALETTE.metalDark); ac.fillRect(0, 0, size, size);
  paintScratches(ac, size, { seed, count: 120, maxLen: size / 5, color: 'rgba(255,255,255,0.12)' });
  paintGrime(ac, size, { seed: seed + 1, alpha: 0.5, color: '10,10,10' });

  const al = cvs(size); const alc = al.getContext('2d');
  alc.fillStyle = '#fff'; alc.fillRect(0, 0, size, size);
  alc.fillStyle = '#000';
  const bar = size / 8, slot = size / 8;
  for (let y = bar; y < size; y += bar + slot) {
    for (let x = bar; x < size; x += (bar + slot) * 2) {
      roundRect(alc, x, y, slot * 2 - 2, slot - 2, 3);
      alc.fill();
    }
  }
  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#7d7d7d'; rc.fillRect(0, 0, size, size);
  rc.globalAlpha = 0.5; rc.drawImage(fbmCanvas(size, seed + 4, 3, 6, 0.5), 0, 0); rc.globalAlpha = 1;

  return { map: tex(a, { srgb: true }), alphaMap: tex(al), roughnessMap: tex(r) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* --------------------------------------------------------------- UI screens */

export function makeScreenTexture(kind = 'nav', seed = 1) {
  const w = 512, h = 256;
  const c = cvs(w, h);
  const ctx = c.getContext('2d');
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#04120f'; ctx.fillRect(0, 0, w, h);
  const teal = hex(PALETTE.teal), amber = hex(PALETTE.warm), orange = hex(PALETTE.accent);

  // grid
  ctx.strokeStyle = 'rgba(47,227,208,0.16)'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) line(ctx, x, 0, x, h);
  for (let y = 0; y < h; y += 16) line(ctx, 0, y, w, y);

  ctx.font = '600 13px "Arial Narrow", monospace';
  if (kind === 'nav') {
    ctx.strokeStyle = teal; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w * 0.28, h * 0.52, 74, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(w * 0.28, h * 0.52, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.28, h * 0.52, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = amber;
    line(ctx, w * 0.28 - 80, h * 0.52, w * 0.28 + 80, h * 0.52);
    line(ctx, w * 0.28, h * 0.52 - 80, w * 0.28, h * 0.52 + 80);
    ctx.fillStyle = orange;
    ctx.beginPath(); ctx.arc(w * 0.28 + 30, h * 0.52 - 22, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = teal;
    for (let i = 0; i < 7; i++) ctx.fillText(`${['HDG', 'VEL', 'ETA', 'PWR', 'O2', 'FUEL', 'HULL'][i]}  ${(rnd() * 900 + 100).toFixed(0)}`, w * 0.58, 44 + i * 26);
  } else if (kind === 'wave') {
    ctx.strokeStyle = teal; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = 0; x < w; x++) {
      const y = h * 0.5 + Math.sin(x * 0.06 + seed) * 30 * Math.sin(x * 0.004) + (rnd() - 0.5) * 6;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = amber; ctx.fillText('REACTOR OUTPUT NOMINAL', 16, 24);
    ctx.fillStyle = orange;
    for (let i = 0; i < 12; i++) ctx.fillRect(16 + i * 22, h - 46, 14, -(10 + rnd() * 34));
  } else if (kind === 'bars') {
    ctx.fillStyle = teal; ctx.fillText('LIFE SUPPORT', 16, 26);
    for (let i = 0; i < 6; i++) {
      const v = 0.35 + rnd() * 0.6;
      ctx.fillStyle = 'rgba(47,227,208,0.18)'; ctx.fillRect(16, 44 + i * 30, w - 140, 18);
      ctx.fillStyle = i === 3 ? orange : teal; ctx.fillRect(16, 44 + i * 30, (w - 140) * v, 18);
      ctx.fillStyle = '#cfe';
      ctx.fillText(`${(v * 100) | 0}%`, w - 110, 58 + i * 30);
    }
  } else {
    ctx.fillStyle = orange; ctx.fillText('⚠ AUX BUS 3 — SERVICE DUE', 16, 30);
    ctx.fillStyle = teal;
    for (let i = 0; i < 8; i++) ctx.fillText(`> ${['SYNC', 'PURGE', 'VENT', 'TRIM', 'LOCK', 'SEAL', 'CAL', 'IDLE'][i]} ${(rnd() * 99) | 0}`, 16, 58 + i * 22);
  }
  // scanlines
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
  const t = tex(c, { srgb: true, aniso: false });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ---------------------------------------------------------------- materials */

export const M = {};

export function buildMaterials() {
  const hullSet = cached('hull', () => hullPanelSet(1024, 101, PALETTE.hull, { cols: 3, rows: 2, stencil: 'A-04' }));
  const hullSet2 = cached('hull2', () => hullPanelSet(512, 211, PALETTE.hullDark, { cols: 2, rows: 2, stencil: 'SEC-2' }));
  const ceilSet = cached('ceil', () => hullPanelSet(512, 307, PALETTE.hullDark, { cols: 2, rows: 1, stencil: '', grime: 0.5 }));
  const accentSet = cached('accent', () => hullPanelSet(512, 409, PALETTE.accent, { cols: 2, rows: 1, stencil: 'CAUTION', grime: 0.5 }));
  const metalSet = cached('metal', () => wornMetalSet(512, 503));
  const darkSet = cached('dark', () => wornMetalSet(512, 601, PALETTE.structure));
  const floor = cached('floor', () => floorSet(1024, 701));
  const fabricA = cached('fabA', () => fabricSet(512, 809, PALETTE.fabric));
  const fabricB = cached('fabB', () => fabricSet(256, 907, PALETTE.fabricWarm));
  const grate = cached('grate', () => grateSet(512, 1009));
  const rubber = cached('rubber', () => wornMetalSet(256, 1103, PALETTE.rubber));

  M.hull = new THREE.MeshStandardMaterial({ ...hullSet, color: 0xffffff, roughness: 1, metalness: 1, envMapIntensity: 0.9, normalScale: new THREE.Vector2(1, 1) });
  M.hullDark = new THREE.MeshStandardMaterial({ ...hullSet2, roughness: 1, metalness: 1, envMapIntensity: 0.9 });
  M.ceiling = new THREE.MeshStandardMaterial({ ...ceilSet, roughness: 1, metalness: 1, envMapIntensity: 0.7 });
  M.accent = new THREE.MeshStandardMaterial({ ...accentSet, roughness: 1, metalness: 1, envMapIntensity: 0.85 });
  M.metal = new THREE.MeshStandardMaterial({ ...metalSet, color: 0xffffff, roughness: 1, metalness: 0.95, envMapIntensity: 1.25 });
  M.structure = new THREE.MeshStandardMaterial({ ...darkSet, roughness: 1, metalness: 0.8, envMapIntensity: 1.0 });
  M.floor = new THREE.MeshStandardMaterial({ ...floor, roughness: 1, metalness: 1, envMapIntensity: 1.0 });
  M.fabric = new THREE.MeshStandardMaterial({ ...fabricA, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
  M.fabricWarm = new THREE.MeshStandardMaterial({ ...fabricB, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
  M.rubber = new THREE.MeshStandardMaterial({ ...rubber, color: 0x6a6f72, roughness: 1, metalness: 0.05, envMapIntensity: 0.5 });
  M.grate = new THREE.MeshStandardMaterial({
    ...grate, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
    roughness: 1, metalness: 0.9, envMapIntensity: 1.0,
  });

  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0xaecfe0, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.10,
    envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false,
  });

  M.emissiveTeal = emissive(PALETTE.teal, 4.2);
  M.emissiveWarm = emissive(PALETTE.warm, 3.4);
  M.emissiveOrange = emissive(PALETTE.accent, 3.0);
  M.emissiveCool = emissive(PALETTE.cool, 2.6);
  M.emissiveRed = emissive(0xff4530, 3.0);

  M.screenNav = screenMat('nav', 3);
  M.screenWave = screenMat('wave', 11);
  M.screenBars = screenMat('bars', 23);
  M.screenList = screenMat('list', 41);

  return M;
}

function emissive(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color: 0x090b0c, roughness: 0.4, metalness: 0,
    emissive: new THREE.Color(color), emissiveIntensity: intensity,
    toneMapped: true,
  });
}

function screenMat(kind, seed) {
  const t = makeScreenTexture(kind, seed);
  return new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 0.28, metalness: 0,
    emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.5, map: t,
  });
}

/** Scale UVs of a geometry so a shared tiling material reads at world scale. */
export function scaleUV(geometry, su, sv = su, ou = 0, ov = 0) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su + ou, uv.getY(i) * sv + ov);
  }
  uv.needsUpdate = true;
  return geometry;
}
