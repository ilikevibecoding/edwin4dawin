// Every texture in the project is generated at runtime on a 2D canvas or from
// typed arrays. No external image assets are ever loaded.

import * as THREE from 'three';
import { Noise } from './noise.js';

const cache = new Map();
let anisotropy = 4;

export function setTextureAnisotropy(v) {
  anisotropy = v;
}

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function finish(canvas, { srgb = true, repeat = [1, 1], wrap = THREE.RepeatWrapping, mips = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = wrap;
  t.wrapT = wrap;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = anisotropy;
  t.generateMipmaps = mips;
  t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function memo(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const v = fn();
  cache.set(key, v);
  return v;
}

export function disposeTextureCache() {
  for (const v of cache.values()) {
    if (v && v.isTexture) v.dispose();
    else if (Array.isArray(v)) v.forEach((x) => x && x.isTexture && x.dispose());
  }
  cache.clear();
}

/* ------------------------------------------------------------------ helpers */

function px(ctx, w, h) {
  return ctx.getImageData(0, 0, w, h);
}

/** Sobel-style height -> tangent-space normal map. */
export function normalFromCanvas(src, strength = 2.2, srgbHeight = false) {
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  const data = sctx.getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  const img = octx.createImageData(w, h);
  const at = (x, y) => {
    const xi = (x + w) % w;
    const yi = (y + h) % h;
    const v = data[(yi * w + xi) * 4] / 255;
    return srgbHeight ? v * v : v;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * w + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz / len) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

function fbmCanvas(size, { seed = 1, octaves = 6, scale = 4, gain = 0.5, ridged = false, contrast = 1 } = {}) {
  const n = new Noise(seed);
  const c = makeCanvas(size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * scale;
      const v = (y / size) * scale;
      let f = ridged ? n.ridged2(u, v, octaves, 2.03, gain) : n.fbm2(u, v, octaves, 2.0, gain) * 0.5 + 0.5;
      f = Math.min(1, Math.max(0, (f - 0.5) * contrast + 0.5));
      const k = Math.round(f * 255);
      const i = (y * size + x) * 4;
      img.data[i] = k;
      img.data[i + 1] = k;
      img.data[i + 2] = k;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function grain(ctx, w, h, amount, alpha = 1) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let s = 991;
  for (let i = 0; i < d.length; i += 4) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const r = ((s >> 16) & 255) / 255 - 0.5;
    const k = r * amount * 255 * alpha;
    d[i] = Math.min(255, Math.max(0, d[i] + k));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + k));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + k));
  }
  ctx.putImageData(img, 0, 0);
}

function splotches(ctx, w, h, count, colors, sizeRange, seed = 7, alpha = [0.05, 0.2]) {
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return (s >>> 8) / 8388608;
  };
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = sizeRange[0] + rnd() * (sizeRange[1] - sizeRange[0]);
    const col = colors[Math.floor(rnd() * colors.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = alpha[0] + rnd() * (alpha[1] - alpha[0]);
    g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
    g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* --------------------------------------------------------------- materials */

export function concreteMaps(size = 512) {
  return memo(`concrete${size}`, () => {
    const h = fbmCanvas(size, { seed: 21, octaves: 6, scale: 6, contrast: 1.2 });
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(h, 0, 0);
    // tint toward warm grey concrete
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#d8d2c4';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#a8a49a';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    splotches(ctx, size, size, 90, [[70, 66, 60], [190, 186, 176], [120, 112, 100]], [8, 46], 3, [0.03, 0.14]);
    // expansion joints
    ctx.strokeStyle = 'rgba(48,44,40,0.85)';
    ctx.lineWidth = Math.max(1, size / 340);
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // small chips & cracks
    let s = 55;
    const rnd = () => ((s = (Math.imul(s, 48271) + 11) & 0x7fffffff), (s >>> 9) / 4194304);
    ctx.strokeStyle = 'rgba(60,56,52,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 40;
        y += (rnd() - 0.5) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    grain(ctx, size, size, 0.1);
    const nrm = normalFromCanvas(h, 1.6);
    const rough = makeCanvas(size);
    const rctx = rough.getContext('2d', { willReadFrequently: true });
    rctx.drawImage(h, 0, 0);
    rctx.globalCompositeOperation = 'multiply';
    rctx.fillStyle = '#d8d8d8';
    rctx.fillRect(0, 0, size, size);
    return {
      map: finish(c, { repeat: [1, 1] }),
      normalMap: finish(nrm, { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

export function sandMaps(size = 512) {
  return memo(`sand${size}`, () => {
    const h = fbmCanvas(size, { seed: 91, octaves: 7, scale: 9, contrast: 1.1 });
    const grav = fbmCanvas(size, { seed: 12, octaves: 4, scale: 42, contrast: 1.6 });
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#a8875e';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(h, 0, 0);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(grav, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#c9a577';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    splotches(ctx, size, size, 130, [[120, 92, 62], [196, 168, 128], [90, 74, 56]], [6, 40], 17, [0.05, 0.2]);
    grain(ctx, size, size, 0.16);
    const hc = makeCanvas(size);
    const hctx = hc.getContext('2d', { willReadFrequently: true });
    hctx.drawImage(h, 0, 0);
    hctx.globalAlpha = 0.7;
    hctx.drawImage(grav, 0, 0);
    const nrm = normalFromCanvas(hc, 2.4);
    return {
      map: finish(c),
      normalMap: finish(nrm, { srgb: false }),
    };
  });
}

export function asphaltMaps(size = 512) {
  return memo(`asphalt${size}`, () => {
    const h = fbmCanvas(size, { seed: 44, octaves: 6, scale: 26, contrast: 1.5 });
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#4b4845';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.4;
    ctx.drawImage(h, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b0aaa2';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    splotches(ctx, size, size, 70, [[20, 20, 20], [110, 108, 104]], [10, 50], 29, [0.05, 0.2]);
    grain(ctx, size, size, 0.2);
    return { map: finish(c), normalMap: finish(normalFromCanvas(h, 1.4), { srgb: false }) };
  });
}

export function paintedMetalMaps(size = 512, base = '#5c6350', opts = {}) {
  const key = `paint${size}${base}${JSON.stringify(opts)}`;
  return memo(key, () => {
    const { scratches = 40, rust = 0.5, streaks = 22, camo = false } = opts;
    const h = fbmCanvas(size, { seed: 7, octaves: 5, scale: 18, contrast: 1.1 });
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    if (camo) {
      const blob = fbmCanvas(size, { seed: 33, octaves: 3, scale: 3.2 });
      const bd = blob.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, size, size).data;
      const img = ctx.getImageData(0, 0, size, size);
      const cols = [
        [74, 82, 64],
        [56, 60, 48],
        [96, 88, 66],
      ];
      for (let i = 0; i < img.data.length; i += 4) {
        const v = bd[i] / 255;
        const idx = v < 0.42 ? 0 : v < 0.62 ? 1 : 2;
        img.data[i] = cols[idx][0];
        img.data[i + 1] = cols[idx][1];
        img.data[i + 2] = cols[idx][2];
      }
      ctx.putImageData(img, 0, 0);
    }
    ctx.globalAlpha = 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(h, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    let s = 4001;
    const rnd = () => ((s = (Math.imul(s, 48271) + 7) & 0x7fffffff), (s >>> 9) / 4194304);
    // paint chips revealing primer
    for (let i = 0; i < scratches; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const w = 2 + rnd() * 14;
      ctx.fillStyle = `rgba(${90 + rnd() * 30},${70 + rnd() * 20},${58},${0.2 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * (0.2 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    // rust weep streaks running with gravity
    for (let i = 0; i < streaks; i++) {
      const x = rnd() * size;
      const y = rnd() * size * 0.7;
      const len = 20 + rnd() * 120;
      const g = ctx.createLinearGradient(x, y, x, y + len);
      const a = 0.05 + rnd() * 0.22 * rust;
      g.addColorStop(0, `rgba(112,68,38,${a})`);
      g.addColorStop(1, 'rgba(112,68,38,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 1 + rnd() * 4, len);
    }
    grain(ctx, size, size, 0.06);
    const rough = makeCanvas(size);
    const rc = rough.getContext('2d', { willReadFrequently: true });
    rc.fillStyle = '#9a9a9a';
    rc.fillRect(0, 0, size, size);
    rc.globalAlpha = 0.5;
    rc.drawImage(h, 0, 0);
    return {
      map: finish(c),
      normalMap: finish(normalFromCanvas(h, 0.45), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

export function brushedMetalMaps(size = 512, tint = '#8d9299') {
  return memo(`brushed${size}${tint}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    let s = 17;
    const rnd = () => ((s = (Math.imul(s, 48271) + 13) & 0x7fffffff), (s >>> 9) / 4194304);
    for (let i = 0; i < 2600; i++) {
      const y = rnd() * size;
      const a = 0.02 + rnd() * 0.05;
      ctx.strokeStyle = rnd() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      ctx.lineWidth = 0.5 + rnd() * 1.5;
      ctx.beginPath();
      ctx.moveTo(rnd() * size, y);
      ctx.lineTo(rnd() * size, y + (rnd() - 0.5) * 2);
      ctx.stroke();
    }
    const rough = makeCanvas(size);
    const rc = rough.getContext('2d', { willReadFrequently: true });
    rc.fillStyle = '#666';
    rc.fillRect(0, 0, size, size);
    rc.globalAlpha = 0.35;
    rc.drawImage(c, 0, 0);
    return { map: finish(c), roughnessMap: finish(rough, { srgb: false }), normalMap: finish(normalFromCanvas(c, 0.5), { srgb: false }) };
  });
}

/** Heat-affected metal band used on nozzles and blast deflectors. */
export function heatDiscolorMap(size = 256) {
  return memo(`heat${size}`, () => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0.0, '#39332f');
    g.addColorStop(0.28, '#54463c');
    g.addColorStop(0.44, '#7d5a3a');
    g.addColorStop(0.58, '#8a6a86');
    g.addColorStop(0.7, '#4e6a8d');
    g.addColorStop(0.84, '#59564f');
    g.addColorStop(1.0, '#2b2724');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const h = fbmCanvas(size, { seed: 5, octaves: 5, scale: 12 });
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(h, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    grain(ctx, size, size, 0.1);
    return finish(c);
  });
}

export function sootMap(size = 256) {
  return memo(`soot${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    const h = fbmCanvas(size, { seed: 88, octaves: 6, scale: 8, contrast: 1.6 });
    ctx.globalAlpha = 0.85;
    ctx.drawImage(h, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#2a2724';
    ctx.fillRect(0, 0, size, size);
    return finish(c);
  });
}

/* ----------------------------------------------------------------- decals */

/** Stencilled text/markings on a transparent canvas, for decal planes. */
export function stencilDecal(lines, { w = 512, h = 256, color = '#e8e2d2', font = 'bold 60px "Arial Narrow", Impact, sans-serif', align = 'center', wear = 0.5, letterSpacing = 4 } = {}) {
  const key = `stencil${lines.join('|')}${w}${h}${color}${font}${wear}`;
  return memo(key, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
    const lh = h / (lines.length + 0.6);
    lines.forEach((ln, i) => {
      const y = lh * (i + 0.8);
      ctx.fillText(ln, align === 'center' ? w / 2 : 12, y);
    });
    if (wear > 0) {
      const n = fbmCanvas(Math.max(64, w / 2), { seed: 71, octaves: 5, scale: 14, contrast: 1.8 });
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = wear * 0.85;
      ctx.drawImage(n, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function warningStripes(w = 512, h = 128, a = '#d8c02a', b = '#22201c') {
  return memo(`stripes${w}${h}${a}${b}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = a;
    ctx.save();
    const step = h * 0.62;
    for (let x = -h; x < w + h; x += step * 2) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + step, h);
      ctx.lineTo(x + step + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    const n = fbmCanvas(Math.max(64, w / 2), { seed: 4, octaves: 5, scale: 10, contrast: 2 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.32;
    ctx.drawImage(n, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    grain(ctx, w, h, 0.08);
    return finish(c);
  });
}

export function padMarkingsDecal(size = 1024) {
  return memo(`padmark${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const S = size / 1024;
    ctx.strokeStyle = 'rgba(232,226,200,0.92)';
    ctx.lineWidth = 7 * S;
    ctx.strokeRect(70 * S, 70 * S, size - 140 * S, size - 140 * S);
    ctx.setLineDash([34 * S, 26 * S]);
    ctx.lineWidth = 4 * S;
    ctx.strokeStyle = 'rgba(226,196,60,0.85)';
    ctx.strokeRect(120 * S, 120 * S, size - 240 * S, size - 240 * S);
    ctx.setLineDash([]);
    // corner hazard hatch
    ctx.strokeStyle = 'rgba(226,196,60,0.75)';
    ctx.lineWidth = 9 * S;
    for (const [cx, cy, sx, sy] of [
      [70, 70, 1, 1],
      [size - 70 * S, 70, -1, 1],
      [70, size - 70 * S, 1, -1],
      [size - 70 * S, size - 70 * S, -1, -1],
    ]) {
      for (let i = 0; i < 6; i++) {
        const o = (i * 22 + 12) * S;
        ctx.beginPath();
        ctx.moveTo(cx * (typeof cx === 'number' && cx > 1 ? 1 : 1) + sx * o, cy);
        ctx.lineTo(cx, cy + sy * o);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(232,226,200,0.9)';
    ctx.font = `bold ${58 * S}px "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('DANGER — BLAST AREA', size / 2, size / 2 - 22 * S);
    ctx.font = `bold ${38 * S}px "Arial Narrow", Impact, sans-serif`;
    ctx.fillText('KEEP CLEAR WHEN ARMED', size / 2, size / 2 + 30 * S);
    const n = fbmCanvas(size / 2, { seed: 61, octaves: 6, scale: 11, contrast: 1.9 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.45;
    ctx.drawImage(n, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function chainLinkTexture(size = 256) {
  return memo(`chain${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(178,182,186,0.95)';
    ctx.lineWidth = size / 64;
    const cell = size / 8;
    for (let i = -1; i <= 9; i++) {
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const x = i * cell + k * cell;
        const y = k * cell;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const x = i * cell - k * cell;
        const y = k * cell;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return finish(c);
  });
}

export function treadTexture(size = 256) {
  return memo(`tread${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#191919';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2c2c2c';
    for (let i = 0; i < 14; i++) {
      const y = (i / 14) * size;
      ctx.save();
      ctx.translate(0, y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.lineTo(size, size / 34);
      ctx.lineTo(0, size / 34);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(size * 0.46, 0, size * 0.08, size);
    grain(ctx, size, size, 0.14);
    return { map: finish(c), normalMap: finish(normalFromCanvas(c, 1.6), { srgb: false }) };
  });
}

/* ---------------------------------------------------------------- sprites */

export function softSprite(size = 128, { power = 2.2, core = 1, colorInner = '255,255,255', colorOuter = '255,255,255' } = {}) {
  return memo(`soft${size}${power}${core}${colorInner}${colorOuter}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    const ci = colorInner.split(',').map(Number);
    const co = colorOuter.split(',').map(Number);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - r) / r;
        const dy = (y + 0.5 - r) / r;
        const d = Math.min(1, Math.hypot(dx, dy));
        const a = Math.pow(1 - d, power) * core;
        const t = d;
        const i = (y * size + x) * 4;
        img.data[i] = ci[0] * (1 - t) + co[0] * t;
        img.data[i + 1] = ci[1] * (1 - t) + co[1] * t;
        img.data[i + 2] = ci[2] * (1 - t) + co[2] * t;
        img.data[i + 3] = Math.max(0, Math.min(255, a * 255));
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Turbulent puff with soft edges; the workhorse smoke/dust sprite. */
export function smokeSprite(size = 256, seed = 3) {
  return memo(`smoke${size}${seed}`, () => {
    const n = new Noise(seed);
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - r) / r;
        const dy = (y + 0.5 - r) / r;
        const d = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const warp = n.fbm2(Math.cos(ang) * 1.7 + 4, Math.sin(ang) * 1.7 + 4, 4) * 0.34;
        const body = n.fbm2(dx * 2.1 + 11, dy * 2.1 + 11, 5) * 0.5 + 0.5;
        let a = 1 - Math.min(1, d / (0.92 + warp));
        a = Math.pow(Math.max(0, a), 1.5) * (0.45 + 0.75 * body);
        const i = (y * size + x) * 4;
        const lum = 210 + body * 45;
        img.data[i] = lum;
        img.data[i + 1] = lum;
        img.data[i + 2] = lum;
        img.data[i + 3] = Math.min(255, a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function flareSprite(size = 256) {
  return memo(`flare${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.08, 'rgba(255,250,220,0.92)');
    g.addColorStop(0.26, 'rgba(255,190,110,0.34)');
    g.addColorStop(0.6, 'rgba(255,140,70,0.08)');
    g.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // anamorphic streak
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(0, r, size, r);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, r - size / 90, size, size / 45);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function sparkSprite(size = 64) {
  return memo(`spark${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const r = size / 2;
    const g = ctx.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, 'rgba(255,255,250,1)');
    g.addColorStop(0.3, 'rgba(255,220,150,0.7)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function ringSprite(size = 256, thickness = 0.1) {
  return memo(`ring${size}${thickness}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot((x + 0.5 - r) / r, (y + 0.5 - r) / r);
        const a = Math.max(0, 1 - Math.abs(d - 0.82) / thickness) * (d < 1 ? 1 : 0);
        const i = (y * size + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 255;
        img.data[i + 2] = 255;
        img.data[i + 3] = Math.pow(a, 1.6) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function scorchDecalTexture(size = 256, seed = 9) {
  return memo(`scorch${size}${seed}`, () => {
    const n = new Noise(seed);
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - r) / r;
        const dy = (y + 0.5 - r) / r;
        const d = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const edge = 0.72 + n.fbm2(Math.cos(ang) * 2.4 + 2, Math.sin(ang) * 2.4 + 2, 4) * 0.28;
        const body = n.fbm2(dx * 3.4, dy * 3.4, 5) * 0.5 + 0.5;
        let a = 1 - Math.min(1, d / edge);
        a = Math.pow(Math.max(0, a), 1.1) * (0.35 + body * 0.9);
        const i = (y * size + x) * 4;
        const k = 18 + body * 26;
        img.data[i] = k;
        img.data[i + 1] = k * 0.94;
        img.data[i + 2] = k * 0.9;
        img.data[i + 3] = Math.min(255, a * 240);
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function craterDecalTexture(size = 256, seed = 4) {
  return memo(`crater${size}${seed}`, () => {
    const n = new Noise(seed);
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - r) / r;
        const dy = (y + 0.5 - r) / r;
        const d = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const edge = 0.62 + n.fbm2(Math.cos(ang) * 3 + 6, Math.sin(ang) * 3 + 6, 4) * 0.26;
        const body = n.fbm2(dx * 5, dy * 5, 5) * 0.5 + 0.5;
        const inner = 1 - Math.min(1, d / edge);
        const rim = Math.exp(-Math.pow((d - edge) / 0.14, 2));
        const a = Math.min(1, inner * 1.1 + rim * 0.6);
        const dark = 26 + body * 20;
        const rimc = 120 + body * 60;
        const t = rim > inner ? 1 : 0;
        const i = (y * size + x) * 4;
        img.data[i] = dark * (1 - t) + rimc * t * 0.9;
        img.data[i + 1] = dark * 0.95 * (1 - t) + rimc * t * 0.78;
        img.data[i + 2] = dark * 0.9 * (1 - t) + rimc * t * 0.6;
        img.data[i + 3] = Math.min(255, a * 250);
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

export function tireTrackTexture(size = 256) {
  return memo(`tiretrack${size}`, () => {
    const c = makeCanvas(size, size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const n = fbmCanvas(size, { seed: 202, octaves: 5, scale: 18, contrast: 1.4 });
    for (const off of [0.3, 0.7]) {
      const g = ctx.createLinearGradient(off * size - size * 0.06, 0, off * size + size * 0.06, 0);
      g.addColorStop(0, 'rgba(58,44,30,0)');
      g.addColorStop(0.5, 'rgba(58,44,30,0.5)');
      g.addColorStop(1, 'rgba(58,44,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(off * size - size * 0.06, 0, size * 0.12, size);
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(n, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c);
  });
}

/* ------------------------------------------------------------------- sky */

export function starfieldTexture(size = 2048) {
  return memo(`stars${size}`, () => {
    const c = makeCanvas(size, size / 2);
    const w = c.width;
    const h = c.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    // milky way band
    const n = new Noise(777);
    const img = ctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const v = y / h;
        const band = Math.exp(-Math.pow((v - 0.52 - 0.1 * Math.sin(u * Math.PI * 2)) / 0.075, 2));
        const cloud = Math.max(0, n.fbm2(u * 22, v * 22, 6) * 0.5 + 0.5) * band;
        const k = cloud * 46;
        const i = (y * w + x) * 4;
        img.data[i] = k * 0.85;
        img.data[i + 1] = k * 0.9;
        img.data[i + 2] = k * 1.15;
      }
    }
    ctx.putImageData(img, 0, 0);
    let s = 20261;
    const rnd = () => ((s = (Math.imul(s, 48271) + 3) & 0x7fffffff), (s >>> 9) / 4194304);
    const palette = ['255,255,255', '200,215,255', '255,232,200', '255,205,175', '215,235,255'];
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const mag = Math.pow(rnd(), 3.2);
      const r = 0.5 + mag * 2.6;
      const a = 0.25 + mag * 0.75;
      const col = palette[Math.floor(rnd() * palette.length)];
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
      g.addColorStop(0, `rgba(${col},${a})`);
      g.addColorStop(0.35, `rgba(${col},${a * 0.35})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(c, { srgb: true, wrap: THREE.RepeatWrapping });
  });
}

export function cloudSheetTexture(size = 1024, { seed = 5, coverage = 0.48, softness = 1.5, wispy = false } = {}) {
  return memo(`cloudsheet${size}${seed}${coverage}${softness}${wispy}`, () => {
    const n = new Noise(seed);
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * (wispy ? 6 : 3);
        const v = (y / size) * (wispy ? 1.6 : 3);
        let f = n.fbm2(u, v, 7, 2.02, 0.52) * 0.5 + 0.5;
        if (wispy) f = f * 0.6 + 0.4 * (n.fbm2(u * 3.2, v * 0.6, 5) * 0.5 + 0.5);
        let a = (f - (1 - coverage)) / Math.max(0.05, coverage);
        a = Math.pow(Math.max(0, Math.min(1, a)), softness);
        const i = (y * size + x) * 4;
        const lum = 245;
        img.data[i] = lum;
        img.data[i + 1] = lum;
        img.data[i + 2] = lum;
        img.data[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

/* --------------------------------------------------------------- displays */

/** A live 2D canvas texture wrapper for animated console screens. */
export class CanvasSurface {
  constructor(w, h, { srgb = true } = {}) {
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.anisotropy = anisotropy;
    this.w = w;
    this.h = h;
  }

  commit() {
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}

export { fbmCanvas, finish as finishTexture, grain as canvasGrain, splotches as canvasSplotches };

/* ------------------------------------------------- site surfacing (added) */

/** Small deterministic PRNG so the generators below stay reproducible. */
function seeded(seed) {
  let s = (seed | 0) || 1;
  return () => ((s = (Math.imul(s, 48271) + 11) & 0x7fffffff), (s >>> 9) / 4194304);
}

/**
 * Second concrete mix for the battery hardstands: cooler, patchier and more
 * heavily stained than the main apron so the two surfaces read apart.
 * Expansion joints are baked in at quarter-tile spacing.
 */
export function hardstandConcreteMaps(size = 512, seed = 5) {
  return memo(`hardstand${size}${seed}`, () => {
    const h = fbmCanvas(size, { seed: 30 + seed, octaves: 6, scale: 7, contrast: 1.25 });
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(h, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#c3bfb4';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#9d9a92';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    const rnd = seeded(seed * 977 + 3);
    // poured-bay tone variation: each bay was laid on a different day
    for (let by = 0; by < 4; by++) {
      for (let bx = 0; bx < 4; bx++) {
        const k = 0.9 + rnd() * 0.22;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(252 * k)},${Math.round(246 * k)},1)`;
        ctx.fillRect((bx * size) / 4, (by * size) / 4, size / 4, size / 4);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    splotches(ctx, size, size, 110, [[64, 60, 54], [176, 172, 162], [104, 96, 84]], [10, 54], 19, [0.04, 0.17]);
    // joints between bays
    ctx.strokeStyle = 'rgba(42,38,34,0.9)';
    ctx.lineWidth = Math.max(1.2, size / 300);
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // spalled edges along a few joints
    ctx.fillStyle = 'rgba(150,144,132,0.55)';
    for (let i = 0; i < 60; i++) {
      const along = rnd() * size;
      const p = Math.floor(rnd() * 5) * (size / 4);
      const w = 3 + rnd() * 12;
      if (rnd() > 0.5) ctx.fillRect(along, p - w * 0.3, w, w * 0.6);
      else ctx.fillRect(p - w * 0.3, along, w * 0.6, w);
    }
    // hairline cracks
    ctx.strokeStyle = 'rgba(54,50,46,0.55)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 34; i++) {
      ctx.beginPath();
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += (rnd() - 0.5) * 46;
        y += (rnd() - 0.5) * 46;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    grain(ctx, size, size, 0.09);
    const rough = makeCanvas(size);
    const rctx = rough.getContext('2d', { willReadFrequently: true });
    rctx.fillStyle = '#e8e8e8';
    rctx.fillRect(0, 0, size, size);
    rctx.globalAlpha = 0.4;
    rctx.drawImage(h, 0, 0);
    return {
      map: finish(c, { repeat: [1, 1] }),
      normalMap: finish(normalFromCanvas(h, 1.5), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/**
 * Transparent expansion-joint grid laid over the apron as a decal sheet. One
 * texture tile is one bay, so the caller sets `repeat` from the bay size.
 */
export function apronJointTexture(size = 256, seed = 3) {
  return memo(`apronjoint${size}${seed}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const rnd = seeded(seed * 131 + 7);
    const lw = Math.max(1.5, size / 90);
    const drawJoint = (horizontal, at) => {
      // sealant bead sits slightly proud, with a darker recess either side
      const g = horizontal
        ? ctx.createLinearGradient(0, at - lw, 0, at + lw)
        : ctx.createLinearGradient(at - lw, 0, at + lw, 0);
      g.addColorStop(0, 'rgba(96,90,82,0)');
      g.addColorStop(0.32, 'rgba(58,54,50,0.55)');
      g.addColorStop(0.5, 'rgba(34,31,28,0.88)');
      g.addColorStop(0.68, 'rgba(58,54,50,0.55)');
      g.addColorStop(1, 'rgba(96,90,82,0)');
      ctx.fillStyle = g;
      if (horizontal) ctx.fillRect(0, at - lw, size, lw * 2);
      else ctx.fillRect(at - lw, 0, lw * 2, size);
    };
    for (const at of [0, size]) {
      drawJoint(true, at);
      drawJoint(false, at);
    }
    // occasional crack spurring off a joint, and edge spall
    ctx.strokeStyle = 'rgba(48,44,40,0.5)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      let x = rnd() * size;
      let y = rnd() > 0.5 ? 1 : size - 1;
      if (rnd() > 0.5) {
        const t = x;
        x = y;
        y = t;
      }
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rnd() - 0.5) * size * 0.22;
        y += (rnd() - 0.5) * size * 0.22;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150,144,134,0.28)';
    for (let i = 0; i < 26; i++) {
      const along = rnd() * size;
      const edge = Math.round(rnd()) * size;
      const w = 2 + rnd() * 9;
      if (rnd() > 0.5) ctx.fillRect(along, edge - w * 0.5, w, w);
      else ctx.fillRect(edge - w * 0.5, along, w, w);
    }
    return finish(c);
  });
}

/**
 * 2x2 atlas of ground decals: oil pool, concrete patch repair, dust smear and
 * a scuffed tyre-rubber mark. Quadrants are addressed with UV offsets.
 */
export function groundStainAtlas(size = 512) {
  return memo(`groundstain${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const q = size / 2;
    const rnd = seeded(9173);
    const blob = (cx, cy, r, fill, alpha, wob = 0.35, pts = 12) => {
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const a = (i / pts) * Math.PI * 2;
        const rr = r * (1 - wob * 0.5 + rnd() * wob);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    // --- 0,0 oil pool -------------------------------------------------
    blob(q * 0.5, q * 0.5, q * 0.34, '#161412', 0.72, 0.5);
    blob(q * 0.56, q * 0.44, q * 0.2, '#0d0c0b', 0.8, 0.6);
    for (let i = 0; i < 22; i++) {
      blob(q * 0.5 + (rnd() - 0.5) * q * 0.8, q * 0.5 + (rnd() - 0.5) * q * 0.8, 3 + rnd() * 9, '#1a1715', 0.15 + rnd() * 0.4, 0.7, 7);
    }
    // --- 1,0 patch repair ---------------------------------------------
    ctx.save();
    ctx.translate(q, 0);
    ctx.beginPath();
    const pts = 9;
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const rr = q * (0.3 + rnd() * 0.09);
      const x = q * 0.5 + Math.cos(a) * rr * 1.25;
      const y = q * 0.5 + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#a8a49a';
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#3a3733';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const pn = fbmCanvas(q, { seed: 12, octaves: 5, scale: 8, contrast: 1.4 });
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.4;
    ctx.drawImage(pn, 0, 0, q, q);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
    // --- 0,1 wind-blown dust smear ------------------------------------
    ctx.save();
    ctx.translate(0, q);
    for (let i = 0; i < 30; i++) {
      const x = rnd() * q;
      const y = q * 0.5 + (rnd() - 0.5) * q * 0.7;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 12 + rnd() * 46);
      g.addColorStop(0, `rgba(186,158,116,${0.1 + rnd() * 0.2})`);
      g.addColorStop(1, 'rgba(186,158,116,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, q, q);
    }
    ctx.restore();
    // --- 1,1 rubber scuff ---------------------------------------------
    ctx.save();
    ctx.translate(q, q);
    for (let i = 0; i < 9; i++) {
      const y = q * 0.2 + rnd() * q * 0.6;
      const g = ctx.createLinearGradient(0, y, q, y);
      g.addColorStop(0, 'rgba(30,27,25,0)');
      g.addColorStop(0.4, `rgba(30,27,25,${0.18 + rnd() * 0.3})`);
      g.addColorStop(1, 'rgba(30,27,25,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 2 - rnd() * 5, q, 4 + rnd() * 9);
    }
    ctx.restore();
    // soften every quadrant with noise so nothing has a hard silhouette
    const n = fbmCanvas(size, { seed: 44, octaves: 6, scale: 13, contrast: 1.7 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.42;
    ctx.drawImage(n, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Angular crushed-rock surfacing for tracks, skirts and hardstand margins. */
export function gravelMaps(size = 512, tint = '#b3a68d') {
  return memo(`gravelmaps${size}${tint}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    const hgt = makeCanvas(size);
    const hctx = hgt.getContext('2d', { willReadFrequently: true });
    hctx.fillStyle = '#6a6a6a';
    hctx.fillRect(0, 0, size, size);
    const rnd = seeded(6151);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 1.2 + rnd() * 4.2;
      const sides = 4 + Math.floor(rnd() * 3);
      const rot = rnd() * Math.PI;
      const shade = 0.72 + rnd() * 0.5;
      const base = [141, 130, 113];
      ctx.fillStyle = `rgb(${Math.min(255, base[0] * shade) | 0},${Math.min(255, base[1] * shade) | 0},${Math.min(255, base[2] * shade) | 0})`;
      hctx.fillStyle = `rgb(${(120 + shade * 90) | 0},${(120 + shade * 90) | 0},${(120 + shade * 90) | 0})`;
      for (const c2 of [ctx, hctx]) {
        c2.beginPath();
        for (let k = 0; k < sides; k++) {
          const a = rot + (k / sides) * Math.PI * 2;
          const rr = r * (0.7 + rnd() * 0.5);
          const px2 = x + Math.cos(a) * rr;
          const py2 = y + Math.sin(a) * rr;
          if (k === 0) c2.moveTo(px2, py2);
          else c2.lineTo(px2, py2);
        }
        c2.closePath();
        c2.fill();
      }
    }
    // fine dust settling between the stones
    const dust = fbmCanvas(size, { seed: 77, octaves: 5, scale: 6, contrast: 1.2 });
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.34;
    ctx.drawImage(dust, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    grain(ctx, size, size, 0.11);
    const rough = makeCanvas(size);
    const rc = rough.getContext('2d', { willReadFrequently: true });
    rc.fillStyle = '#f0f0f0';
    rc.fillRect(0, 0, size, size);
    return {
      map: finish(c),
      normalMap: finish(normalFromCanvas(hgt, 2.6), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/** Woven hessian for sandbags. */
export function burlapMaps(size = 256, tint = '#9c8862') {
  return memo(`burlap${size}${tint}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    const step = size / 26;
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, i * step, size, step * 0.5);
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(i * step, 0, step * 0.5, size);
    }
    splotches(ctx, size, size, 40, [[120, 102, 72], [64, 56, 42], [176, 158, 122]], [8, 40], 23, [0.05, 0.22]);
    grain(ctx, size, size, 0.14);
    const h = fbmCanvas(size, { seed: 6, octaves: 4, scale: 26, contrast: 1.3 });
    return { map: finish(c), normalMap: finish(normalFromCanvas(h, 1.1), { srgb: false }) };
  });
}

/** Heavy proofed canvas for tents, covers and shelter drapes. */
export function fabricMaps(size = 512, tint = '#7a7358') {
  return memo(`fabric${size}${tint}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    const weave = makeCanvas(size);
    const wctx = weave.getContext('2d', { willReadFrequently: true });
    wctx.fillStyle = '#808080';
    wctx.fillRect(0, 0, size, size);
    const step = Math.max(3, size / 96);
    for (let i = 0; i * step < size; i++) {
      wctx.fillStyle = i % 2 ? '#8e8e8e' : '#727272';
      wctx.fillRect(0, i * step, size, step * 0.55);
      wctx.fillRect(i * step, 0, step * 0.55, size);
    }
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(weave, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // seams every quarter tile plus sun bleaching along the top
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = Math.max(1, size / 240);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * size) / 4);
      ctx.lineTo(size, (i * size) / 4);
      ctx.stroke();
    }
    const bleach = ctx.createLinearGradient(0, 0, 0, size);
    bleach.addColorStop(0, 'rgba(226,214,182,0.3)');
    bleach.addColorStop(0.6, 'rgba(226,214,182,0.02)');
    bleach.addColorStop(1, 'rgba(60,54,40,0.16)');
    ctx.fillStyle = bleach;
    ctx.fillRect(0, 0, size, size);
    splotches(ctx, size, size, 46, [[70, 64, 46], [148, 140, 110], [96, 84, 58]], [10, 60], 31, [0.04, 0.16]);
    grain(ctx, size, size, 0.07);
    const rough = makeCanvas(size);
    const rc = rough.getContext('2d', { willReadFrequently: true });
    rc.fillStyle = '#ededed';
    rc.fillRect(0, 0, size, size);
    return {
      map: finish(c),
      normalMap: finish(normalFromCanvas(weave, 0.8), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/** Wire-cage barrier cell filled with compacted spoil. */
export function gabionTexture(size = 256) {
  return memo(`gabion${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const fill = fbmCanvas(size, { seed: 18, octaves: 6, scale: 11, contrast: 1.3 });
    ctx.drawImage(fill, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b39a70';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    splotches(ctx, size, size, 60, [[120, 100, 70], [176, 156, 118], [86, 74, 56]], [8, 44], 13, [0.05, 0.22]);
    // geotextile liner tone, then the wire cage over the top
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#6c6a5a';
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    const cell = size / 4;
    ctx.strokeStyle = 'rgba(196,200,204,0.8)';
    ctx.lineWidth = Math.max(1.5, size / 110);
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(70,66,60,0.5)';
    ctx.lineWidth = Math.max(1, size / 200);
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell + 2, 2);
      ctx.lineTo(i * cell + 2, size);
      ctx.moveTo(2, i * cell + 2);
      ctx.lineTo(size, i * cell + 2);
      ctx.stroke();
    }
    grain(ctx, size, size, 0.09);
    const h = fbmCanvas(size, { seed: 18, octaves: 5, scale: 20, contrast: 1.4 });
    return { map: finish(c), normalMap: finish(normalFromCanvas(h, 1.8), { srgb: false }) };
  });
}

/** Garnished camouflage netting: alpha cut-outs plus desert-toned scrim. */
export function camoNetTexture(size = 512) {
  return memo(`camonet${size}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const rnd = seeded(4483);
    const tones = ['#8a7c5a', '#6f6a4c', '#a3906a', '#5d5b46', '#b0a179'];
    // scrim garnish: irregular strips at a few dominant angles
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const w = 6 + rnd() * 26;
      const h = 3 + rnd() * 8;
      const a = rnd() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.globalAlpha = 0.55 + rnd() * 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // support cord grid
    ctx.strokeStyle = 'rgba(92,86,64,0.55)';
    ctx.lineWidth = Math.max(1, size / 300);
    const cell = size / 16;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, size);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(size, i * cell);
      ctx.stroke();
    }
    // punch holes so the net breaks up against the sky
    const n = fbmCanvas(size, { seed: 91, octaves: 5, scale: 16, contrast: 2.4 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(n, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c);
  });
}

/**
 * Painted sign face for gate boards, hazard placards and distance markers.
 * `lines` are laid out inside a bordered plate on an opaque background.
 */
export function signBoardTexture(w, h, { lines = [], bg = '#c8bda2', fg = '#20211d', border = '#20211d', accent = null, font = 'bold 64px "Arial Narrow", Impact, sans-serif', wear = 0.35, transparentBg = false } = {}) {
  const key = `sign${w}${h}${lines.join('|')}${bg}${fg}${border}${accent}${font}${wear}${transparentBg}`;
  return memo(key, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    if (!transparentBg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    const pad = Math.round(Math.min(w, h) * 0.06);
    if (accent) {
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, w, Math.round(h * 0.22));
    }
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.035);
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    const lh = (h - pad * 2.4) / Math.max(1, lines.length);
    lines.forEach((ln, i) => ctx.fillText(ln, w / 2, pad * 1.2 + lh * (i + 0.5)));
    // paint wear + dust film
    const n = fbmCanvas(Math.max(64, Math.min(w, h)), { seed: 23, octaves: 5, scale: 10, contrast: 1.7 });
    ctx.globalAlpha = wear * 0.5;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(n, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (transparentBg) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = wear * 0.5;
      ctx.drawImage(n, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    grain(ctx, w, h, 0.06);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * Rough sawn timber for pallets, crates and dunnage: plank banding, grain,
 * nail heads and a faint stencil band across the middle.
 */
export function plywoodMaps(size = 256, tint = '#a2865a') {
  return memo(`plywood${size}${tint}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const hgt = makeCanvas(size);
    const hctx = hgt.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    hctx.fillStyle = '#8a8a8a';
    hctx.fillRect(0, 0, size, size);
    const rnd = seeded(3313);
    const planks = 5;
    const pw = size / planks;
    for (let i = 0; i < planks; i++) {
      const k = 0.86 + rnd() * 0.3;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${(255 * k) | 0},${(250 * k) | 0},${(242 * k) | 0})`;
      ctx.fillRect(i * pw, 0, pw, size);
      ctx.globalCompositeOperation = 'source-over';
      // plank gap
      ctx.fillStyle = 'rgba(38,30,20,0.75)';
      ctx.fillRect(i * pw - 1.5, 0, 3, size);
      hctx.fillStyle = '#4a4a4a';
      hctx.fillRect(i * pw - 1.5, 0, 3, size);
      // grain
      for (let g = 0; g < 26; g++) {
        const y = rnd() * size;
        ctx.strokeStyle = `rgba(${60 + rnd() * 50},${44 + rnd() * 36},${26 + rnd() * 24},${0.08 + rnd() * 0.16})`;
        ctx.lineWidth = 0.7 + rnd() * 1.6;
        ctx.beginPath();
        ctx.moveTo(i * pw + 2, y);
        for (let s = 0; s < 5; s++) ctx.lineTo(i * pw + 2 + (s + 1) * (pw / 5), y + (rnd() - 0.5) * 7);
        ctx.stroke();
      }
      // nail heads at the ends
      for (const ny of [size * 0.08, size * 0.92]) {
        const nx = i * pw + pw * 0.5;
        ctx.fillStyle = 'rgba(52,48,44,0.8)';
        ctx.beginPath();
        ctx.arc(nx, ny, size / 110, 0, Math.PI * 2);
        ctx.fill();
        hctx.fillStyle = '#c8c8c8';
        hctx.beginPath();
        hctx.arc(nx, ny, size / 110, 0, Math.PI * 2);
        hctx.fill();
      }
    }
    // stencil band
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#2b2723';
    ctx.font = `bold ${size * 0.09}px "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THIS SIDE UP', size / 2, size * 0.44);
    ctx.font = `bold ${size * 0.06}px "Arial Narrow", Impact, sans-serif`;
    ctx.fillText('AEGIS RIDGE  ·  LOT 07', size / 2, size * 0.56);
    ctx.restore();
    splotches(ctx, size, size, 34, [[64, 50, 32], [172, 150, 112], [96, 80, 54]], [6, 34], 41, [0.04, 0.18]);
    grain(ctx, size, size, 0.1);
    const rough = makeCanvas(size);
    const rc = rough.getContext('2d', { willReadFrequently: true });
    rc.fillStyle = '#eaeaea';
    rc.fillRect(0, 0, size, size);
    return {
      map: finish(c),
      normalMap: finish(normalFromCanvas(hgt, 1.4), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/**
 * Invented unit banner for the site flagpole: horizontal bands, a chevron and
 * the fictional site name. Double-sided use is fine — it is symmetrical.
 */
export function unitFlagTexture(w = 256, h = 160) {
  return memo(`unitflag${w}${h}`, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#20303c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b8471f';
    ctx.fillRect(0, h * 0.72, w, h * 0.14);
    ctx.fillStyle = '#d8cba6';
    ctx.fillRect(0, h * 0.86, w, h * 0.14);
    // chevron
    ctx.fillStyle = '#d8cba6';
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.18);
    ctx.lineTo(w * 0.3, h * 0.18);
    ctx.lineTo(w * 0.44, h * 0.45);
    ctx.lineTo(w * 0.3, h * 0.62);
    ctx.lineTo(w * 0.1, h * 0.62);
    ctx.lineTo(w * 0.24, h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e6dcc0';
    ctx.font = `bold ${h * 0.19}px "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.fillText('AEGIS', w * 0.5, h * 0.3);
    ctx.fillText('RIDGE', w * 0.5, h * 0.52);
    // sun bleaching toward the fly end plus general wear
    const bl = ctx.createLinearGradient(0, 0, w, 0);
    bl.addColorStop(0, 'rgba(232,226,200,0)');
    bl.addColorStop(1, 'rgba(232,226,200,0.3)');
    ctx.fillStyle = bl;
    ctx.fillRect(0, 0, w, h);
    const n = fbmCanvas(Math.max(64, h), { seed: 53, octaves: 5, scale: 9, contrast: 1.6 });
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(n, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    grain(ctx, w, h, 0.06);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * Dry, sun-bleached concrete for the large ground planes.
 *
 * Two things separate this from `concreteMaps`. The roughness map stays inside
 * a narrow high band, so no patch of the apron can drop to a near-mirror
 * roughness and pick up the sky as a wet blue sheen. And the albedo keeps very
 * low contrast, so one tile repeated across a 380 m pad reads as a surface
 * rather than as a pattern. Expansion joints are left to the decal sheet.
 */
export function dryConcreteMaps(size = 512, tint = '#b0a897', seed = 11) {
  return memo(`dryconcrete${size}${tint}${seed}`, () => {
    // Broad cement mottle, plus a fine aggregate break-up for the normal map.
    const broad = fbmCanvas(size, { seed: 60 + seed, octaves: 6, scale: 5, contrast: 0.6 });
    const fine = fbmCanvas(size, { seed: 140 + seed * 7, octaves: 4, scale: 34, contrast: 1.15 });
    const rnd = seeded(seed * 613 + 29);

    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.42;
    ctx.drawImage(broad, 0, 0);
    ctx.globalAlpha = 0.16;
    ctx.drawImage(fine, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Slow tonal drift: bleached patches and ground-in dirt, both weak.
    splotches(ctx, size, size, 40, [[214, 208, 192], [138, 130, 116]], [size * 0.12, size * 0.36], seed * 3 + 1, [0.02, 0.07]);
    splotches(ctx, size, size, 90, [[196, 190, 174], [128, 120, 106], [166, 158, 142]], [size * 0.02, size * 0.1], seed * 11 + 5, [0.02, 0.08]);

    // Broom finish: faint parallel drag lines from the float pass.
    ctx.strokeStyle = 'rgba(150,144,130,0.05)';
    ctx.lineWidth = Math.max(1, size / 512);
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i + rnd() * 2);
      ctx.lineTo(size, i + rnd() * 2);
      ctx.stroke();
    }

    // Exposed aggregate specks where the surface has worn through. Kept small
    // and faint: at a 24 m tile these are read from a metre away, and heavy
    // ones turn the apron into shingle.
    for (let i = 0; i < 900; i++) {
      const r = 0.5 + rnd() * 1.1;
      const dark = rnd() > 0.45;
      ctx.fillStyle = dark ? `rgba(126,118,104,${0.05 + rnd() * 0.1})` : `rgba(206,200,184,${0.05 + rnd() * 0.1})`;
      ctx.beginPath();
      ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sparse hairline cracks, kept light so they do not tile obviously.
    ctx.strokeStyle = 'rgba(96,90,82,0.34)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (rnd() - 0.5) * size * 0.12;
        y += (rnd() - 0.5) * size * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    grain(ctx, size, size, 0.05);

    // Roughness clamped to 0.84 .. 1.0 — dry concrete, never a sheen.
    const rough = makeCanvas(size);
    const rctx = rough.getContext('2d', { willReadFrequently: true });
    rctx.fillStyle = '#ffffff';
    rctx.fillRect(0, 0, size, size);
    rctx.globalAlpha = 0.1;
    rctx.drawImage(broad, 0, 0);
    rctx.globalAlpha = 0.08;
    rctx.drawImage(fine, 0, 0);
    rctx.globalAlpha = 1;

    // Height for the normal map: mostly aggregate, a little broad waviness.
    const hgt = makeCanvas(size);
    const hctx = hgt.getContext('2d', { willReadFrequently: true });
    hctx.drawImage(fine, 0, 0);
    hctx.globalAlpha = 0.45;
    hctx.drawImage(broad, 0, 0);
    hctx.globalAlpha = 1;

    return {
      map: finish(c, { repeat: [1, 1] }),
      normalMap: finish(normalFromCanvas(hgt, 1.1), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/**
 * Slow, large-scale grime for a big paved surface: a transparent sheet of
 * dust-blown pale patches and traffic-darkened lanes. Laid over the apron at a
 * tile of ~90 m, it gives the pad the tonal drift a 380 m slab needs without
 * touching the metre-scale concrete tiling underneath.
 */
export function apronWearTexture(size = 512, seed = 5) {
  return memo(`apronwear${size}${seed}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const rnd = seeded(seed * 331 + 17);

    // Ground-in traffic grime, then wind-blown dust on top of it.
    for (let i = 0; i < 26; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = size * (0.08 + rnd() * 0.24);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(88,82,72,${0.1 + rnd() * 0.14})`);
      g.addColorStop(1, 'rgba(88,82,72,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    for (let i = 0; i < 34; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = size * (0.06 + rnd() * 0.22);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(190,172,136,${0.08 + rnd() * 0.14})`);
      g.addColorStop(1, 'rgba(190,172,136,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    // Break the blobs up so they never read as circles.
    const n = fbmCanvas(size, { seed: 210 + seed, octaves: 6, scale: 4, contrast: 1.5 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(alphaMaskFrom(n, 0.48, 0.88), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c);
  });
}

/**
 * Open desert hardpan for the terrain sheets.
 *
 * `sandMaps` is tuned for mid-distance, where its dark gravel layer mips down
 * to an even brown. Stood on, that same layer is a high-contrast orange and
 * black rash. This keeps the albedo range narrow, puts the detail into small
 * scattered stones and a fine grain, and leaves the relief gentle.
 */
export function desertGroundMaps(size = 512, tint = '#9c7f56') {
  return memo(`desertground${size}${tint}`, () => {
    const rnd = seeded(4127);
    const broad = fbmCanvas(size, { seed: 71, octaves: 6, scale: 4, contrast: 0.7 });
    const fine = fbmCanvas(size, { seed: 133, octaves: 5, scale: 22, contrast: 0.9 });

    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(broad, 0, 0);
    ctx.globalAlpha = 0.18;
    ctx.drawImage(fine, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    // Kept faint: the terrain sheet tiles every 18 m, so anything with real
    // contrast here reads as metre-wide brown clouds from standing height.
    splotches(ctx, size, size, 60, [[176, 158, 126], [134, 118, 92], [158, 142, 114]], [size * 0.03, size * 0.18], 31, [0.02, 0.06]);

    // Scattered desert pavement: small stones, most of them pale.
    const hgt = makeCanvas(size);
    const hctx = hgt.getContext('2d', { willReadFrequently: true });
    hctx.drawImage(fine, 0, 0);
    hctx.globalAlpha = 0.5;
    hctx.drawImage(broad, 0, 0);
    hctx.globalAlpha = 1;
    for (let i = 0; i < 1100; i++) {
      const x = rnd() * size;
      const y = rnd() * size;
      const r = 0.8 + rnd() * 1.9;
      const shade = rnd();
      const tone = shade > 0.72 ? [118, 108, 90] : shade > 0.3 ? [170, 156, 130] : [198, 186, 160];
      ctx.fillStyle = `rgba(${tone[0]},${tone[1]},${tone[2]},${0.1 + rnd() * 0.16})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      // Only a hint of relief: pushed further these read as craters, not stones.
      hctx.fillStyle = `rgba(210,210,210,${0.1 + rnd() * 0.16})`;
      hctx.beginPath();
      hctx.arc(x, y, r, 0, Math.PI * 2);
      hctx.fill();
    }
    // Shallow rills where run-off has combed the surface.
    ctx.strokeStyle = 'rgba(128,116,94,0.1)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 40; i++) {
      let x = rnd() * size;
      let y = rnd() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 9; k++) {
        x += (rnd() - 0.3) * size * 0.09;
        y += (rnd() - 0.5) * size * 0.05;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    grain(ctx, size, size, 0.07);

    const rough = makeCanvas(size);
    const rctx = rough.getContext('2d', { willReadFrequently: true });
    rctx.fillStyle = '#fafafa';
    rctx.fillRect(0, 0, size, size);
    rctx.globalAlpha = 0.12;
    rctx.drawImage(broad, 0, 0);
    rctx.globalAlpha = 1;

    return {
      map: finish(c, { repeat: [1, 1] }),
      normalMap: finish(normalFromCanvas(hgt, 1.3), { srgb: false }),
      roughnessMap: finish(rough, { srgb: false }),
    };
  });
}

/** Landing-circle markings for the utility pad. */
export function helipadDecal(size = 512, label = 'H') {
  return memo(`helipad${size}${label}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const S = size / 512;
    ctx.strokeStyle = 'rgba(232,226,200,0.9)';
    ctx.lineWidth = 12 * S;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([26 * S, 20 * S]);
    ctx.lineWidth = 6 * S;
    ctx.strokeStyle = 'rgba(226,196,60,0.75)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(232,226,200,0.92)';
    ctx.font = `bold ${size * 0.4}px "Arial Narrow", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, size / 2, size / 2 + size * 0.02);
    const n = fbmCanvas(size / 2, { seed: 37, octaves: 6, scale: 12, contrast: 1.9 });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(n, 0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * Compacted hardcore for roads, hardstanding, skirts and bulldozed spoil.
 *
 * `gravelMaps` draws its stones for a much larger tile and fixes their colour
 * regardless of the tint asked for, so at the ~1.4 m tile the surfacing needs
 * it comes out as dark seeds over whatever base it was given. This keeps the
 * stones sun-bleached and close in value to the fines around them, which mips
 * down to an even graded surface instead of a rash.
 */
export function hardcoreMaps(size = 512, tint = '#a89b80') {
  return memo(`hardcore${size}${tint}`, () => {
    const rnd = seeded(8123);
    const base = new THREE.Color(tint);
    const s = size / 512;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const hc = makeCanvas(size);
    const hctx = hc.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    hctx.fillStyle = '#808080';
    hctx.fillRect(0, 0, size, size);

    // Broad grading: the fines wash and settle unevenly. Soft-light rather than
    // overlay, which drove the mid tones apart hard enough to read as staining.
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(fbmCanvas(size, { seed: 71, octaves: 5, scale: 3 }), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Chippings, in two passes. The sparse coarse pass is nearly flat in value
    // and carries mid-frequency interest through the height field; the dense
    // fine pass does the colour work. Radii are texels: at 512 px over ~1.4 m of
    // ground the fine pass spans roughly 0.8–5 cm.
    const layStones = (count, radius, spread, relief) => {
      for (let i = 0; i < count; i++) {
        const x = rnd() * size;
        const y = rnd() * size;
        const r = radius();
        const ry = r * (0.66 + rnd() * 0.34);
        const rot = rnd() * Math.PI;
        // Sun-bleached chippings stay within a stop or so of the fines they lie
        // in. Wide swings turn the surfacing into blob camouflage; no swing at
        // all leaves it a painted plane.
        const lift = rnd() < 0.2 ? -(0.08 + rnd() * 0.2) : rnd() * 0.3 - 0.05;
        const fill = `#${base
          .clone()
          .offsetHSL((rnd() - 0.5) * 0.015, (rnd() - 0.5) * 0.04, lift * spread)
          .getHexString()}`;
        const hv = Math.round(128 + lift * relief);
        const grey = `rgb(${hv},${hv},${hv})`;
        // Stones overhanging an edge get repeated on the far side so the tile
        // still joins cleanly.
        const ox = x < r ? size : x > size - r ? -size : 0;
        const oy = y < r ? size : y > size - r ? -size : 0;
        for (let q = 0; q < 4; q++) {
          if (q & 1 && !ox) continue;
          if (q & 2 && !oy) continue;
          const px = x + (q & 1 ? ox : 0);
          const py = y + (q & 2 ? oy : 0);
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.ellipse(px, py, r, ry, rot, 0, Math.PI * 2);
          ctx.fill();
          hctx.fillStyle = grey;
          hctx.beginPath();
          hctx.ellipse(px, py, r, ry, rot, 0, Math.PI * 2);
          hctx.fill();
        }
      }
    };
    layStones(Math.round(700 * s * s), () => s * (7 + Math.pow(rnd(), 1.6) * 11), 0.14, 200);
    layStones(Math.round(20000 * s * s), () => s * (1.4 + Math.pow(rnd(), 2.2) * 8), 0.42, 150);

    // Dust settled back into the interstices, then fines.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 1;
    splotches(ctx, size, size, 18, [[168, 152, 122], [132, 120, 98], [186, 172, 146]], [size * 0.06, size * 0.26], 41, [0.02, 0.06]);
    grain(ctx, size, size, 0.07);

    // Round the chipping profiles off before differencing them: hard ellipse
    // edges become cliff normals and give every stone a black rim. The eight
    // offset copies carry the blur across the tile seam.
    const hb = makeCanvas(size);
    const bctx = hb.getContext('2d', { willReadFrequently: true });
    bctx.filter = `blur(${(s * 0.7).toFixed(2)}px)`;
    bctx.drawImage(hc, 0, 0);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx || dy) bctx.drawImage(hc, dx * size, dy * size);
      }
    }
    bctx.filter = 'none';
    return { map: finish(c), normalMap: finish(normalFromCanvas(hb, 1.5), { srgb: false }) };
  });
}

/**
 * Turn a greyscale noise canvas into a transparent eraser mask.
 *
 * `fbmCanvas` writes a fully opaque canvas, so compositing it straight in
 * `destination-out` scales the whole layer by `globalAlpha` instead of eating
 * holes in it. Remapping luminance on to the alpha channel is what actually
 * breaks a decal up.
 */
function alphaMaskFrom(src, lo = 0.4, hi = 0.85) {
  const w = src.width;
  const h = src.height;
  const d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d', { willReadFrequently: true });
  const img = octx.createImageData(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const t = Math.min(1, Math.max(0, (d[i] / 255 - lo) / (hi - lo)));
    img.data[i + 3] = Math.round(t * t * (3 - 2 * t) * 255);
  }
  octx.putImageData(img, 0, 0);
  return out;
}

/**
 * A heavier-worn version of `tireTrackTexture` for routes across the apron.
 *
 * The original is a pair of soft gradients at half alpha, further flattened by
 * an opaque erosion pass, and it all but disappears over pale concrete in flat
 * sun. This keeps the same layout — two wheel bands running up V, clamped in U
 * — but darkens the cores, cuts tread lugs into them and edges each band with a
 * rubbed-in dust halo, so the route still reads from 60 m without turning into
 * a painted stripe up close.
 */
export function wornTrackTexture(size = 256, seed = 71) {
  return memo(`worntrack${size}${seed}`, () => {
    const c = makeCanvas(size);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);
    const rnd = seeded(seed * 977 + 13);

    // The lane itself: everything between the wheels gets ground down too, and
    // the whole strip has to carry tone or it mips away to nothing the moment
    // the camera drops towards the deck.
    const lane = ctx.createLinearGradient(0, 0, size, 0);
    lane.addColorStop(0, 'rgba(126,114,94,0)');
    lane.addColorStop(0.16, 'rgba(126,114,94,0.27)');
    lane.addColorStop(0.5, 'rgba(134,122,100,0.2)');
    lane.addColorStop(0.84, 'rgba(126,114,94,0.27)');
    lane.addColorStop(1, 'rgba(126,114,94,0)');
    ctx.fillStyle = lane;
    ctx.fillRect(0, 0, size, size);

    // Pale dust pushed out to either side of the wheel paths.
    for (const off of [0.28, 0.72]) {
      const halo = ctx.createLinearGradient((off - 0.19) * size, 0, (off + 0.19) * size, 0);
      halo.addColorStop(0, 'rgba(178,164,134,0)');
      halo.addColorStop(0.5, 'rgba(178,164,134,0.3)');
      halo.addColorStop(1, 'rgba(178,164,134,0)');
      ctx.fillStyle = halo;
      ctx.fillRect((off - 0.19) * size, 0, size * 0.38, size);
    }

    // Compacted, rubber-darkened cores.
    for (const off of [0.28, 0.72]) {
      const g = ctx.createLinearGradient((off - 0.1) * size, 0, (off + 0.1) * size, 0);
      g.addColorStop(0, 'rgba(82,70,54,0)');
      g.addColorStop(0.2, 'rgba(74,62,46,0.44)');
      g.addColorStop(0.5, 'rgba(58,48,36,0.72)');
      g.addColorStop(0.8, 'rgba(74,62,46,0.44)');
      g.addColorStop(1, 'rgba(82,70,54,0)');
      ctx.fillStyle = g;
      ctx.fillRect((off - 0.1) * size, 0, size * 0.2, size);
    }

    // Tread lugs: a shallow chevron every ~0.15 m at the ribbon's 3.4 m tile.
    const lugs = 22;
    const step = size / lugs;
    ctx.lineCap = 'round';
    for (const off of [0.28, 0.72]) {
      const half = size * 0.07;
      for (let i = 0; i < lugs; i++) {
        const y = i * step + rnd() * step * 0.2;
        ctx.strokeStyle = `rgba(28,22,16,${0.22 + rnd() * 0.24})`;
        ctx.lineWidth = step * 0.36;
        ctx.beginPath();
        ctx.moveTo(off * size - half, y);
        ctx.lineTo(off * size, y + step * 0.32);
        ctx.lineTo(off * size + half, y);
        ctx.stroke();
      }
    }

    // Scuffed-off patches, so no track survives its whole length.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(alphaMaskFrom(fbmCanvas(size, { seed: 240 + seed, octaves: 5, scale: 13 }), 0.54, 0.88), 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(alphaMaskFrom(fbmCanvas(size, { seed: 91 + seed, octaves: 3, scale: 3 }), 0.58, 0.82), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return finish(c, { wrap: THREE.RepeatWrapping });
  });
}
