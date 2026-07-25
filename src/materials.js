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
  hull: 0xa9aca0,        // cool bone — reads grey-green under warm practicals
  hullDark: 0x6f7570,
  structure: 0x333c44,
  structureDeep: 0x1e252b,
  metal: 0x7d848a,
  metalDark: 0x4a5157,
  accent: 0xc85a18,
  accentDeep: 0x8a3a0d,
  teal: 0x2fe3d0,
  warm: 0xffb066,
  cool: 0x9fc8ff,
  fabric: 0x4e5346,
  fabricWarm: 0x8a4a33,
  rubber: 0x23282b,
  fogColor: 0x0b1216,
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
  const { cols = 3, rows = 2, hazard = false, grime = 0.45 } = opts;
  const base = hex(baseHex);
  const gap = size / 130;
  const rnd = mulberry32(seed + 900);

  /* sub-panel layout: each grid cell may be split again, so the tile never
     reads as a plain lattice */
  const cells = [];
  const cw = size / cols, ch = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = { x: x * cw, y: y * ch, w: cw, h: ch };
      if (rnd() < 0.45) {
        const split = 0.35 + rnd() * 0.3;
        if (rnd() < 0.5) {
          cells.push({ ...c, h: ch * split }, { ...c, y: c.y + ch * split, h: ch * (1 - split) });
        } else {
          cells.push({ ...c, w: cw * split }, { ...c, x: c.x + cw * split, w: cw * (1 - split) });
        }
      } else cells.push(c);
    }
  }

  // ---- albedo
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = base; ac.fillRect(0, 0, size, size);
  for (const c of cells) {
    ac.fillStyle = shade(base, (rnd() - 0.45) * 0.075);
    ac.fillRect(c.x, c.y, c.w, c.h);
  }
  // seams: dark recess + bright top lip
  ac.lineWidth = gap;
  ac.strokeStyle = 'rgba(14,16,17,0.8)';
  for (const c of cells) ac.strokeRect(c.x, c.y, c.w, c.h);
  ac.lineWidth = Math.max(1, gap * 0.35);
  ac.strokeStyle = 'rgba(255,255,255,0.13)';
  for (const c of cells) { line(ac, c.x, c.y + gap * 0.6, c.x + c.w, c.y + gap * 0.6); }
  // bolt rows along a few panel edges only
  for (const c of cells) {
    if (rnd() < 0.55) continue;
    const n = Math.max(3, Math.round(c.w / (size / 14)));
    for (let i = 0; i < n; i++) {
      const px = c.x + (c.w * (i + 0.5)) / n;
      const py = c.y + gap * 2.2;
      ac.fillStyle = 'rgba(0,0,0,0.42)';
      ac.beginPath(); ac.arc(px, py + 1, size / 340, 0, Math.PI * 2); ac.fill();
      ac.fillStyle = 'rgba(255,255,255,0.24)';
      ac.beginPath(); ac.arc(px - size / 1400, py - size / 1100, size / 620, 0, Math.PI * 2); ac.fill();
    }
  }
  if (hazard) paintHazard(ac, 0, size * 0.86, size, size * 0.09, { step: size / 26, alpha: 0.85 });
  paintChips(ac, size, { seed: seed + 3, count: 80, color: hex(PALETTE.metalDark), maxR: size / 170 });
  paintStreaks(ac, size, { seed: seed + 4, count: 30, alpha: 0.22 });
  paintGrime(ac, size, { seed: seed + 5, alpha: grime });
  paintScratches(ac, size, { seed: seed + 6, count: 80, maxLen: size / 10, color: 'rgba(255,255,255,0.09)' });

  // ---- roughness: wide range, seams rough, wear polished
  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#a6a6a6'; rc.fillRect(0, 0, size, size);
  const rn = fbmCanvas(size, seed + 20, 4, 4, 0.5);
  rc.globalAlpha = 0.75; rc.drawImage(rn, 0, 0); rc.globalAlpha = 1;
  rc.lineWidth = gap * 1.4;
  rc.strokeStyle = 'rgba(255,255,255,0.75)';
  for (const c of cells) rc.strokeRect(c.x, c.y, c.w, c.h);
  paintScratches(rc, size, { seed: seed + 6, count: 80, maxLen: size / 10, color: 'rgba(28,28,28,0.65)' });
  paintChips(rc, size, { seed: seed + 3, count: 80, color: 'rgba(58,58,58,0.85)', maxR: size / 170 });
  paintGrime(rc, size, { seed: seed + 7, alpha: 0.35, color: '255,255,255' });

  // ---- height -> normal
  const h = cvs(size); const hc = h.getContext('2d');
  hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size);
  for (const c of cells) {
    hc.fillStyle = shade('#808080', (rnd() - 0.5) * 0.06);
    hc.fillRect(c.x + gap, c.y + gap, c.w - gap * 2, c.h - gap * 2);
  }
  hc.lineWidth = gap * 1.1;
  hc.strokeStyle = '#1a1a1a';
  for (const c of cells) hc.strokeRect(c.x, c.y, c.w, c.h);
  hc.lineWidth = gap * 0.4;
  hc.strokeStyle = '#d8d8d8';
  for (const c of cells) line(hc, c.x, c.y + gap * 0.8, c.x + c.w, c.y + gap * 0.8);
  for (const c of cells) {
    if (rnd() < 0.55) continue;
    const n = Math.max(3, Math.round(c.w / (size / 14)));
    for (let i = 0; i < n; i++) {
      hc.fillStyle = '#e2e2e2';
      hc.beginPath(); hc.arc(c.x + (c.w * (i + 0.5)) / n, c.y + gap * 2.2, size / 300, 0, Math.PI * 2); hc.fill();
    }
  }
  const hn = fbmCanvas(size, seed + 40, 3, 7, 0.5);
  hc.globalAlpha = 0.22; hc.drawImage(hn, 0, 0); hc.globalAlpha = 1;

  // ---- metalness (paint chips are bare metal)
  const m = cvs(size); const mc = m.getContext('2d');
  mc.fillStyle = '#101010'; mc.fillRect(0, 0, size, size);
  paintChips(mc, size, { seed: seed + 3, count: 80, color: '#dedede', maxR: size / 170 });
  paintScratches(mc, size, { seed: seed + 6, count: 80, maxLen: size / 10, color: 'rgba(190,190,190,0.55)' });

  return {
    map: tex(a, { srgb: true }),
    roughnessMap: tex(r),
    metalnessMap: tex(m),
    normalMap: normalFromHeight(h, 2.4),
  };
}

/* ------------------------------------------------------------------ decals */

const DECAL_CELLS = 4;   // 4x4 atlas

/** Transparent atlas of stencils, arrows, placards and hazard marks. */
function decalAtlas(size = 1024) {
  const c = cvs(size);
  const ctx = c.getContext('2d');
  const cell = size / DECAL_CELLS;
  const at = (i) => ({ x: (i % DECAL_CELLS) * cell, y: Math.floor(i / DECAL_CELLS) * cell });

  const stencil = (i, text, scale = 1, color = 'rgba(226,228,220,0.82)') => {
    const { x, y } = at(i);
    ctx.save();
    ctx.translate(x + cell / 2, y + cell / 2);
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(cell * 0.34 * scale)}px "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  stencil(0, 'A-04', 1.0);
  stencil(1, 'SEC 2', 0.9, 'rgba(226,150,60,0.85)');
  stencil(2, 'CAUTION', 0.62, 'rgba(240,170,60,0.9)');
  stencil(3, 'HULL 07', 0.78);

  // arrow
  {
    const { x, y } = at(4);
    ctx.save(); ctx.translate(x + cell / 2, y + cell / 2);
    ctx.fillStyle = 'rgba(226,150,60,0.8)';
    ctx.beginPath();
    ctx.moveTo(-cell * 0.3, -cell * 0.08); ctx.lineTo(cell * 0.06, -cell * 0.08);
    ctx.lineTo(cell * 0.06, -cell * 0.2); ctx.lineTo(cell * 0.32, 0);
    ctx.lineTo(cell * 0.06, cell * 0.2); ctx.lineTo(cell * 0.06, cell * 0.08);
    ctx.lineTo(-cell * 0.3, cell * 0.08); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // hazard triangle
  {
    const { x, y } = at(5);
    ctx.save(); ctx.translate(x + cell / 2, y + cell / 2);
    ctx.strokeStyle = 'rgba(240,180,50,0.9)'; ctx.lineWidth = cell * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, -cell * 0.3); ctx.lineTo(cell * 0.3, cell * 0.24); ctx.lineTo(-cell * 0.3, cell * 0.24);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(240,180,50,0.9)';
    ctx.fillRect(-cell * 0.03, -cell * 0.14, cell * 0.06, cell * 0.22);
    ctx.beginPath(); ctx.arc(0, cell * 0.14, cell * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // barcode plate
  {
    const { x, y } = at(6);
    const rnd = mulberry32(3);
    ctx.fillStyle = 'rgba(30,32,32,0.55)';
    ctx.fillRect(x + cell * 0.12, y + cell * 0.3, cell * 0.76, cell * 0.4);
    ctx.fillStyle = 'rgba(220,222,214,0.85)';
    let px = x + cell * 0.17;
    while (px < x + cell * 0.83) {
      const w = cell * (0.006 + rnd() * 0.02);
      ctx.fillRect(px, y + cell * 0.35, w, cell * 0.22);
      px += w + cell * (0.008 + rnd() * 0.016);
    }
    ctx.font = `600 ${Math.round(cell * 0.09)}px monospace`;
    ctx.fillStyle = 'rgba(220,222,214,0.7)';
    ctx.fillText('LC-2291-B', x + cell * 0.17, y + cell * 0.66);
  }
  // grime splat / scorch
  {
    const { x, y } = at(7);
    const g = ctx.createRadialGradient(x + cell / 2, y + cell / 2, 0, x + cell / 2, y + cell / 2, cell * 0.44);
    g.addColorStop(0, 'rgba(14,12,10,0.62)');
    g.addColorStop(0.6, 'rgba(20,16,12,0.28)');
    g.addColorStop(1, 'rgba(20,16,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, cell, cell);
  }
  // hazard stripe strip
  {
    const { x, y } = at(8);
    paintHazard(ctx, x + cell * 0.05, y + cell * 0.34, cell * 0.9, cell * 0.3, { step: cell * 0.09, alpha: 0.9 });
  }
  // "NO STEP"
  stencil(9, 'NO STEP', 0.55, 'rgba(226,228,220,0.7)');
  // numbers
  stencil(10, '07', 1.3, 'rgba(226,228,220,0.55)');
  stencil(11, 'EXIT', 0.8, 'rgba(60,226,208,0.85)');
  // wiring diagram placard
  {
    const { x, y } = at(12);
    ctx.save();
    ctx.strokeStyle = 'rgba(200,210,205,0.5)'; ctx.lineWidth = cell * 0.012;
    ctx.strokeRect(x + cell * 0.16, y + cell * 0.18, cell * 0.68, cell * 0.64);
    const rnd = mulberry32(11);
    for (let i = 0; i < 9; i++) {
      const yy = y + cell * (0.26 + i * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + cell * 0.22, yy);
      ctx.lineTo(x + cell * (0.3 + rnd() * 0.46), yy);
      ctx.stroke();
    }
    ctx.restore();
  }
  stencil(13, '⚠ HOT', 0.6, 'rgba(226,120,60,0.85)');
  // chalky, half-worn paint — a saturated cyan "O2" on a grey wall reads as a UI
  // overlay rather than something someone stencilled on with a brush
  stencil(14, 'O2', 1.0, 'rgba(158,182,192,0.52)');
  stencil(15, 'A-12', 1.0);

  const t = tex(c, { srgb: true });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Plane geometry whose UVs point at one atlas cell. */
export function decalUV(geometry, index) {
  // Canvas rows run top-down but the uploaded texture is flipped (flipY), so the
  // *row* index has to be mirrored — while the orientation *inside* the cell is
  // already correct. Flipping both (as this used to) rendered every stencil
  // upside-down, which read as mirrored text.
  const cx = index % DECAL_CELLS;
  const cy = DECAL_CELLS - 1 - Math.floor(index / DECAL_CELLS);
  const uv = geometry.attributes.uv;
  const s = 1 / DECAL_CELLS;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) * 0.94 + 0.03 + cx) * s, (uv.getY(i) * 0.94 + 0.03 + cy) * s);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** Bare worn metal: brushed, scratched, high metalness. */
function wornMetalSet(size, seed, baseHex = PALETTE.metal, opts = {}) {
  const { rust = 1, grime = 0.22, scratch = 1 } = opts;
  const base = hex(baseHex);
  const a = cvs(size); const ac = a.getContext('2d');
  ac.fillStyle = base; ac.fillRect(0, 0, size, size);
  const n = fbmCanvas(size, seed, 4, 6, 0.55);
  ac.globalAlpha = 0.26; ac.drawImage(n, 0, 0); ac.globalAlpha = 1;
  paintScratches(ac, size, { seed: seed + 1, count: 260, maxLen: size / 2.4, color: 'rgba(255,255,255,0.11)' });
  paintScratches(ac, size, { seed: seed + 2, count: 120, maxLen: size / 5, color: 'rgba(20,18,16,0.14)' });
  paintGrime(ac, size, { seed: seed + 3, alpha: grime, color: '26,26,24' });
  // sparse rust hints only
  const rnd = mulberry32(seed + 4);
  for (let i = 0; i < 4 * rust; i++) {
    const x = rnd() * size, y = rnd() * size, rr = size * (0.015 + rnd() * 0.035);
    const g = ac.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, 'rgba(120,62,30,0.22)');
    g.addColorStop(1, 'rgba(120,62,30,0)');
    ac.fillStyle = g; ac.beginPath(); ac.arc(x, y, rr, 0, Math.PI * 2); ac.fill();
  }

  const r = cvs(size); const rc = r.getContext('2d');
  rc.fillStyle = '#6e6e6e'; rc.fillRect(0, 0, size, size);
  const rn = fbmCanvas(size, seed + 10, 4, 7, 0.55);
  rc.globalAlpha = 0.65; rc.drawImage(rn, 0, 0); rc.globalAlpha = 1;
  paintScratches(rc, size, { seed: seed + 1, count: 220, maxLen: size / 3, color: 'rgba(30,30,30,0.5)' });
  paintGrime(rc, size, { seed: seed + 3, alpha: 0.32, color: '255,255,255' });

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
  const hullSet = cached('hull', () => hullPanelSet(1024, 101, PALETTE.hull, { cols: 3, rows: 2 }));
  const hullSet2 = cached('hull2', () => hullPanelSet(512, 211, PALETTE.hullDark, { cols: 2, rows: 2 }));
  const ceilSet = cached('ceil', () => hullPanelSet(512, 307, PALETTE.hullDark, { cols: 2, rows: 1, grime: 0.55 }));
  // cockpit ceiling: painted much darker so the window key light can't turn the
  // biggest surface in the frame into its brightest one
  const ceilDarkSet = cached('ceilDark', () => hullPanelSet(512, 313, 0x3d474e, { cols: 2, rows: 1, grime: 0.7 }));
  const accentSet = cached('accent', () => hullPanelSet(512, 409, PALETTE.accent, { cols: 2, rows: 1, grime: 0.5 }));
  const metalSet = cached('metal', () => wornMetalSet(512, 503, PALETTE.metal, { rust: 0.5, grime: 0.18 }));
  const darkSet = cached('dark', () => wornMetalSet(512, 601, PALETTE.structure, { rust: 0, grime: 0.12 }));
  const floor = cached('floor', () => floorSet(1024, 701));
  const fabricA = cached('fabA', () => fabricSet(512, 809, PALETTE.fabric));
  const fabricB = cached('fabB', () => fabricSet(256, 907, PALETTE.fabricWarm));
  const grate = cached('grate', () => grateSet(512, 1009));
  const rubber = cached('rubber', () => wornMetalSet(256, 1103, PALETTE.rubber, { rust: 0, grime: 0.1 }));

  M.hull = new THREE.MeshStandardMaterial({ ...hullSet, color: 0xffffff, roughness: 1, metalness: 1, envMapIntensity: 0.9, normalScale: new THREE.Vector2(1, 1) });
  M.hullDark = new THREE.MeshStandardMaterial({ ...hullSet2, roughness: 1, metalness: 1, envMapIntensity: 0.9 });
  M.ceiling = new THREE.MeshStandardMaterial({ ...ceilSet, roughness: 1, metalness: 1, envMapIntensity: 0.7 });
  M.ceilingDark = new THREE.MeshStandardMaterial({ ...ceilDarkSet, roughness: 1, metalness: 1, envMapIntensity: 0.5 });
  M.accent = new THREE.MeshStandardMaterial({ ...accentSet, roughness: 1, metalness: 1, envMapIntensity: 0.85 });
  M.metal = new THREE.MeshStandardMaterial({ ...metalSet, color: 0xffffff, roughness: 1, metalness: 0.95, envMapIntensity: 1.25 });
  M.structure = new THREE.MeshStandardMaterial({ ...darkSet, color: 0x9fb0bd, roughness: 1, metalness: 0.55, envMapIntensity: 1.0 });
  // deep slate for recesses and shadow boxes (dispense bays, vents, wells)
  M.structureDark = new THREE.MeshStandardMaterial({ ...darkSet, color: 0x3a444c, roughness: 1, metalness: 0.5, envMapIntensity: 0.6 });
  M.floor = new THREE.MeshStandardMaterial({ ...floor, roughness: 1, metalness: 1, envMapIntensity: 1.0 });
  M.fabric = new THREE.MeshStandardMaterial({ ...fabricA, color: 0x4a4f48, roughness: 1, metalness: 0, envMapIntensity: 0.26 });
  M.fabricWarm = new THREE.MeshStandardMaterial({ ...fabricB, roughness: 1, metalness: 0, envMapIntensity: 0.35 });
  M.fabricCool = new THREE.MeshStandardMaterial({ ...fabricA, color: 0x46707a, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
  M.fabricPale = new THREE.MeshStandardMaterial({ ...fabricA, color: 0x9a9c90, roughness: 1, metalness: 0, envMapIntensity: 0.32 });
  // pilot seats: near-black charcoal so the warm cabin fill can't turn them brown
  M.fabricSeat = new THREE.MeshStandardMaterial({ ...fabricA, color: 0x2c3134, roughness: 1, metalness: 0, envMapIntensity: 0.24 });
  // ship-issue towel: bleached-out warm linen, so the head has one surface that
  // isn't grey metal and the eye has somewhere soft to land
  M.fabricTowel = new THREE.MeshStandardMaterial({ ...fabricB, color: 0xbfa88c, roughness: 1, metalness: 0, envMapIntensity: 0.34 });
  M.rubber = new THREE.MeshStandardMaterial({ ...rubber, color: 0x6a6f72, roughness: 1, metalness: 0.05, envMapIntensity: 0.5 });
  // shower curtain: pale grey-blue plastic, slightly shinier than cloth
  M.curtain = new THREE.MeshStandardMaterial({ ...rubber, color: 0x8d9aa2, roughness: 0.62, metalness: 0.02, envMapIntensity: 0.7, side: THREE.DoubleSide });
  /**
   * Mirror plate. Metal at roughness 1 × the worn-metal roughness map scatters a
   * baked cube reflection into mottled grey — which reads as a slab of granite,
   * not a mirror. So: no roughness map, a very faint normal for the odd warp in
   * the plate, and a low uniform roughness. `bakeMirrors()` in main.js supplies
   * the envMap.
   */
  M.mirror = new THREE.MeshStandardMaterial({
    color: 0xdfe8ee, roughness: 0.055, metalness: 1.0, envMapIntensity: 1.0,
    normalMap: metalSet.normalMap, normalScale: new THREE.Vector2(0.05, 0.05),
  });
  M.grate = new THREE.MeshStandardMaterial({
    ...grate, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
    roughness: 1, metalness: 0.9, envMapIntensity: 1.0,
  });

  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0x9fc4dc, metalness: 0, roughness: 0.12, transparent: true, opacity: 0.07,
    envMapIntensity: 0.55, side: THREE.DoubleSide, depthWrite: false,
  });

  M.emissiveTeal = emissive(PALETTE.teal, 2.9);
  M.emissiveWarm = emissive(PALETTE.warm, 1.9);
  // dim variants for emitters that are seen edge-on at close range (under-bunk
  // strip, berth reading light) — at full intensity bloom turns them into a
  // white blob and the local histogram clips
  M.emissiveTealDim = emissive(PALETTE.teal, 1.15);
  M.emissiveWarmDim = emissive(PALETTE.warm, 1.0);
  M.emissiveOrange = emissive(PALETTE.accent, 3.0);
  M.emissiveCool = emissive(PALETTE.cool, 2.6);
  M.emissiveRed = emissive(0xff4530, 3.0);

  M.decal = new THREE.MeshStandardMaterial({
    map: cached('decals', () => decalAtlas(1024)),
    transparent: true, alphaTest: 0.06, depthWrite: false,
    roughness: 0.72, metalness: 0.0, envMapIntensity: 0.5,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    side: THREE.DoubleSide,
  });

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
