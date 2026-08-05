// Procedural texture library. Nothing is downloaded: every map in the game is
// painted into a 2D canvas here (or derived from one), then cached by key.
import * as THREE from 'three';
import { Noise2D, mulberry32 } from './rng.js';

const cache = new Map();
let anisotropy = 4;

export function setTextureAnisotropy(v) {
  anisotropy = Math.max(1, v | 0);
  for (const tex of cache.values()) {
    if (tex && tex.isTexture) tex.anisotropy = Math.min(anisotropy, 8);
  }
}

function canvas2d(size, h = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return { c, ctx };
}

function finish(c, { srgb = true, repeat = 1, wrap = THREE.RepeatWrapping } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.min(anisotropy, 8);
  if (repeat !== 1) tex.repeat.set(repeat, repeat);
  tex.needsUpdate = true;
  return tex;
}

function get(key, build, opts) {
  if (cache.has(key)) return cache.get(key);
  const c = build();
  const tex = c instanceof THREE.Texture ? c : finish(c, opts);
  cache.set(key, tex);
  return tex;
}

function fill(ctx, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Grain / noise helpers
// ---------------------------------------------------------------------------

function grain(ctx, w, h, amount, seed = 1, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const rnd = mulberry32(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    if (mono) {
      d[i] = clamp255(d[i] + n);
      d[i + 1] = clamp255(d[i + 1] + n);
      d[i + 2] = clamp255(d[i + 2] + n);
    } else {
      d[i] = clamp255(d[i] + (rnd() - 0.5) * amount);
      d[i + 1] = clamp255(d[i + 1] + (rnd() - 0.5) * amount);
      d[i + 2] = clamp255(d[i + 2] + (rnd() - 0.5) * amount);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function fbmField(ctx, w, h, { seed = 3, scale = 6, octaves = 5, lo = 0, hi = 255, alpha = 1 }) {
  const noise = new Noise2D(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = noise.fbm((x / w) * scale, (y / h) * scale, octaves) * 0.5 + 0.5;
      const v = lo + (hi - lo) * n;
      const i = (y * w + x) * 4;
      d[i] = d[i] * (1 - alpha) + v * alpha;
      d[i + 1] = d[i + 1] * (1 - alpha) + v * alpha;
      d[i + 2] = d[i + 2] * (1 - alpha) + v * alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Sobel a luminance canvas into a tangent-space normal map texture. */
export function normalFromCanvas(src, strength = 2.2) {
  const w = src.width;
  const h = src.height;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  const s = sctx.getImageData(0, 0, w, h).data;
  const { c, ctx } = canvas2d(w, h);
  const out = ctx.createImageData(w, h);
  const o = out.data;
  const lum = (x, y) => {
    const xx = (x + w) % w;
    const yy = (y + h) % h;
    const i = (yy * w + xx) * 4;
    return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx =
        lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1) -
        (lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1));
      const dy =
        lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1) -
        (lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const i = (y * w + x) * 4;
      o[i] = (nx * 0.5 + 0.5) * 255;
      o[i + 1] = (ny * 0.5 + 0.5) * 255;
      o[i + 2] = (nz / len) * 255;
      o[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = finish(c, { srgb: false });
  return tex;
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/** Poured concrete pad with expansion joints, patches and oil staining. */
export function concrete(variant = 0) {
  return get(`concrete${variant}`, () => {
    const S = 512;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#8b8b86');
    fbmField(ctx, S, S, { seed: 11 + variant, scale: 4, octaves: 6, lo: 108, hi: 158, alpha: 0.85 });
    fbmField(ctx, S, S, { seed: 71 + variant, scale: 26, octaves: 3, lo: 96, hi: 168, alpha: 0.28 });
    const rnd = mulberry32(900 + variant);

    // aggregate speckle
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 0.4 + rnd() * 1.5;
      const g = 60 + rnd() * 130;
      ctx.fillStyle = `rgba(${g},${g},${g - 4},${0.12 + rnd() * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // control joints
    ctx.strokeStyle = 'rgba(48,48,46,0.75)';
    ctx.lineWidth = 3;
    for (const p of [0.5]) {
      ctx.beginPath();
      ctx.moveTo(p * S, 0);
      ctx.lineTo(p * S, S);
      ctx.moveTo(0, p * S);
      ctx.lineTo(S, p * S);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(160,160,155,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5 * S + 2, 0);
    ctx.lineTo(0.5 * S + 2, S);
    ctx.moveTo(0, 0.5 * S + 2);
    ctx.lineTo(S, 0.5 * S + 2);
    ctx.stroke();

    // cracks
    ctx.strokeStyle = 'rgba(52,52,50,0.5)';
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 0.6 + rnd() * 1.3;
      let x = rnd() * S;
      let y = rnd() * S;
      let a = rnd() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 8 + (rnd() * 14) | 0;
      for (let s = 0; s < segs; s++) {
        a += (rnd() - 0.5) * 1.1;
        x += Math.cos(a) * (4 + rnd() * 12);
        y += Math.sin(a) * (4 + rnd() * 12);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // oil / scorch patches
    for (let i = 0; i < 12; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 12 + rnd() * 58;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = 20 + rnd() * 40;
      g.addColorStop(0, `rgba(${dark},${dark},${dark},${0.16 + rnd() * 0.2})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, S, S, 26, 5 + variant);
    return c;
  });
}

export function concreteNormal() {
  if (cache.has('concreteNrm')) return cache.get('concreteNrm');
  const S = 512;
  const { c, ctx } = canvas2d(S);
  fill(ctx, S, S, '#808080');
  fbmField(ctx, S, S, { seed: 44, scale: 30, octaves: 4, lo: 90, hi: 165, alpha: 1 });
  const rnd = mulberry32(17);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 0.6 + rnd() * 2.0;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(220,220,220,0.5)' : 'rgba(40,40,40,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,20,20,1)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0.5 * S, 0);
  ctx.lineTo(0.5 * S, S);
  ctx.moveTo(0, 0.5 * S);
  ctx.lineTo(S, 0.5 * S);
  ctx.stroke();
  const tex = normalFromCanvas(c, 1.5);
  cache.set('concreteNrm', tex);
  return tex;
}

/** Desert sand / gravel detail map. */
export function sand(variant = 0) {
  return get(`sand${variant}`, () => {
    const S = 512;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#b09468');
    const noise = new Noise2D(23 + variant);
    const img = ctx.getImageData(0, 0, S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const u = (x / S) * 8;
        const v = (y / S) * 8;
        const n = noise.fbm(u, v, 5) * 0.5 + 0.5;
        const ripple = Math.sin((x / S) * 60 + noise.fbm(u * 0.5, v * 0.5, 2) * 6) * 0.5 + 0.5;
        const t = n * 0.78 + ripple * 0.22;
        const i = (y * S + x) * 4;
        d[i] = 150 + t * 82;
        d[i + 1] = 124 + t * 74;
        d[i + 2] = 86 + t * 60;
      }
    }
    ctx.putImageData(img, 0, 0);
    const rnd = mulberry32(303 + variant);
    for (let i = 0; i < 3400; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 0.5 + rnd() * 2.4;
      const shade = rnd() > 0.5 ? 60 : 210;
      ctx.fillStyle = `rgba(${shade},${shade - 12},${shade - 30},${0.1 + rnd() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, S, S, 22, 9 + variant, false);
    return c;
  });
}

export function sandNormal() {
  if (cache.has('sandNrm')) return cache.get('sandNrm');
  const S = 512;
  const { c, ctx } = canvas2d(S);
  fill(ctx, S, S, '#808080');
  fbmField(ctx, S, S, { seed: 77, scale: 22, octaves: 5, lo: 80, hi: 175, alpha: 1 });
  const rnd = mulberry32(131);
  for (let i = 0; i < 4200; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(235,235,235,0.55)' : 'rgba(30,30,30,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + rnd() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = normalFromCanvas(c, 1.9);
  cache.set('sandNrm', tex);
  return tex;
}

/**
 * Painted military panel: base coat, panel lines, rivet rows, chipped paint,
 * weld seams and grime streaks. Used for launchers, shelters and vehicles.
 */
export function militaryPanel({
  key = 'panel',
  base = '#4a5241',
  dark = '#333a2d',
  light = '#5c6450',
  rivets = true,
  seams = true,
  stripes = false,
  seed = 5,
  size = 512,
} = {}) {
  return get(`mp_${key}`, () => {
    const S = size;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, base);
    const rnd = mulberry32(seed);

    // mottled base coat variation
    for (let i = 0; i < 130; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 20 + rnd() * 110;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd() > 0.5 ? hexA(light, 0.22) : hexA(dark, 0.22));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (seams) {
      // panel division lines with a highlight lip
      const lines = [];
      for (let i = 0; i < 6; i++) lines.push({ v: rnd() > 0.5, p: 0.08 + rnd() * 0.84 });
      for (const l of lines) {
        const p = l.p * S;
        ctx.strokeStyle = hexA(dark, 0.85);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (l.v) {
          ctx.moveTo(p, 0);
          ctx.lineTo(p, S);
        } else {
          ctx.moveTo(0, p);
          ctx.lineTo(S, p);
        }
        ctx.stroke();
        ctx.strokeStyle = hexA(light, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (l.v) {
          ctx.moveTo(p + 2, 0);
          ctx.lineTo(p + 2, S);
        } else {
          ctx.moveTo(0, p + 2);
          ctx.lineTo(S, p + 2);
        }
        ctx.stroke();
      }
    }

    if (rivets) {
      const step = 26;
      for (let y = step / 2; y < S; y += step * 3) {
        for (let x = step / 2; x < S; x += step) {
          if (rnd() < 0.25) continue;
          ctx.fillStyle = hexA(light, 0.75);
          ctx.beginPath();
          ctx.arc(x, y, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = hexA(dark, 0.7);
          ctx.beginPath();
          ctx.arc(x + 0.8, y + 0.9, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (stripes) {
      ctx.save();
      ctx.translate(S * 0.5, S * 0.5);
      ctx.rotate(-Math.PI / 4);
      for (let i = -S; i < S; i += 56) {
        ctx.fillStyle = i % 112 === 0 ? 'rgba(212,164,32,0.85)' : 'rgba(28,28,28,0.85)';
        ctx.fillRect(i, -S, 28, S * 2);
      }
      ctx.restore();
    }

    // chipped paint down to primer
    for (let i = 0; i < 240; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 0.8 + rnd() * 3.4;
      ctx.fillStyle = rnd() > 0.45 ? 'rgba(122,104,80,0.5)' : 'rgba(78,72,66,0.55)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + rnd()), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // vertical grime streaks
    for (let i = 0; i < 46; i++) {
      const x = rnd() * S;
      const y = rnd() * S * 0.7;
      const len = 18 + rnd() * 130;
      const w = 1 + rnd() * 5;
      const g = ctx.createLinearGradient(x, y, x, y + len);
      g.addColorStop(0, 'rgba(30,28,24,0.3)');
      g.addColorStop(1, 'rgba(30,28,24,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, len);
    }
    grain(ctx, S, S, 18, seed + 40);
    return c;
  });
}

export function panelNormal(key = 'panelNrm', seed = 5) {
  if (cache.has(key)) return cache.get(key);
  const S = 512;
  const { c, ctx } = canvas2d(S);
  fill(ctx, S, S, '#7d7d7d');
  const rnd = mulberry32(seed);
  fbmField(ctx, S, S, { seed: seed * 3, scale: 40, octaves: 3, lo: 110, hi: 145, alpha: 0.7 });
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push({ v: rnd() > 0.5, p: 0.08 + rnd() * 0.84 });
  for (const l of lines) {
    const p = l.p * S;
    ctx.strokeStyle = 'rgba(20,20,20,1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (l.v) {
      ctx.moveTo(p, 0);
      ctx.lineTo(p, S);
    } else {
      ctx.moveTo(0, p);
      ctx.lineTo(S, p);
    }
    ctx.stroke();
  }
  const step = 26;
  for (let y = step / 2; y < S; y += step * 3) {
    for (let x = step / 2; x < S; x += step) {
      if (rnd() < 0.25) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 2.6);
      g.addColorStop(0, 'rgba(240,240,240,1)');
      g.addColorStop(1, 'rgba(125,125,125,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = normalFromCanvas(c, 1.4);
  cache.set(key, tex);
  return tex;
}

/** Roughness/metal-ish greyscale for launcher bodies (used as roughnessMap). */
export function wearRoughness(seed = 8) {
  return get(`rough${seed}`, () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#b4b4b4');
    fbmField(ctx, S, S, { seed, scale: 12, octaves: 4, lo: 120, hi: 230, alpha: 0.9 });
    const rnd = mulberry32(seed * 7);
    for (let i = 0; i < 300; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.fillStyle = `rgba(90,90,90,${0.1 + rnd() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + rnd() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(c, { srgb: false });
  });
}

/** Heat-discoloured steel for nozzles and blast deflectors. */
export function heatSteel() {
  return get('heatSteel', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#2b2724');
    g.addColorStop(0.35, '#4a3a2e');
    g.addColorStop(0.55, '#6d4a2c');
    g.addColorStop(0.7, '#4c4560');
    g.addColorStop(0.85, '#39434f');
    g.addColorStop(1, '#22242a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const rnd = mulberry32(61);
    for (let i = 0; i < 700; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      ctx.strokeStyle = `rgba(${20 + rnd() * 90},${18 + rnd() * 70},${16 + rnd() * 60},${0.1 + rnd() * 0.35})`;
      ctx.lineWidth = 0.5 + rnd() * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 8);
      ctx.stroke();
    }
    grain(ctx, S, S, 24, 3);
    return c;
  });
}

/** Rusty / galvanised metal for barriers, generators, cases. */
export function rustedMetal() {
  return get('rusted', () => {
    const S = 512;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#6a6a68');
    fbmField(ctx, S, S, { seed: 91, scale: 8, octaves: 5, lo: 80, hi: 150, alpha: 0.9 });
    const rnd = mulberry32(555);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 6 + rnd() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${120 + rnd() * 60},${58 + rnd() * 30},${22 + rnd() * 20},0.5)`);
      g.addColorStop(1, 'rgba(120,60,25,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, S, S, 30, 8);
    return c;
  });
}

/** Corrugated / ribbed sheet for shelter walls and generator housings. */
export function corrugated(color = '#57604c') {
  return get(`corr_${color}`, () => {
    const S = 512;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, color);
    for (let x = 0; x < S; x += 16) {
      const g = ctx.createLinearGradient(x, 0, x + 16, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.32)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.14)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 16, S);
    }
    const rnd = mulberry32(202);
    for (let i = 0; i < 60; i++) {
      const x = rnd() * S;
      const y = rnd() * S * 0.6;
      const len = 20 + rnd() * 150;
      const g = ctx.createLinearGradient(x, y, x, y + len);
      g.addColorStop(0, 'rgba(46,34,22,0.28)');
      g.addColorStop(1, 'rgba(46,34,22,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 1 + rnd() * 4, len);
    }
    grain(ctx, S, S, 14, 12);
    return c;
  });
}

export function corrugatedNormal() {
  if (cache.has('corrNrm')) return cache.get('corrNrm');
  const S = 256;
  const { c, ctx } = canvas2d(S);
  for (let x = 0; x < S; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, '#202020');
    g.addColorStop(0.5, '#f0f0f0');
    g.addColorStop(1, '#202020');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 8, S);
  }
  const tex = normalFromCanvas(c, 2.6);
  cache.set('corrNrm', tex);
  return tex;
}

// ---------------------------------------------------------------------------
// Decals and markings
// ---------------------------------------------------------------------------

/** Transparent stencil decal with optional weathering. */
export function stencil(text, {
  key = null,
  w = 256,
  h = 128,
  color = '#e6e3d8',
  font = 'bold 54px "Arial Narrow", Impact, sans-serif',
  outline = false,
  wear = 0.35,
  rotate = 0,
} = {}) {
  const k = key || `st_${text}_${w}x${h}_${color}_${rotate}`;
  return get(k, () => {
    const { c, ctx } = canvas2d(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    if (rotate) ctx.rotate(rotate);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    if (outline) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeText(text, 0, 0);
    } else {
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
    // scuff the paint so decals never look like clean vector art
    const rnd = mulberry32(text.length * 977 + w);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160 * wear; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.2 + rnd() * 0.7})`;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    const tex = finish(c, { wrap: THREE.ClampToEdgeWrapping });
    return tex;
  });
}

/** Yellow/black hazard chevrons, transparent background. */
export function hazardStripes(w = 512, h = 64) {
  return get(`haz${w}x${h}`, () => {
    const { c, ctx } = canvas2d(w, h);
    for (let i = -h; i < w + h; i += h) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h * 0.5, 0);
      ctx.lineTo(i + h * 0.5 - h, h);
      ctx.lineTo(i - h, h);
      ctx.closePath();
      ctx.fillStyle = '#d8ac22';
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'destination-over';
    fill(ctx, w, h, '#1b1b1b');
    ctx.globalCompositeOperation = 'source-over';
    const rnd = mulberry32(88);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.4})`;
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Road / pad line markings on transparency. */
export function padMarkings(kind = 'launchpad') {
  return get(`mark_${kind}`, () => {
    const S = 1024;
    const { c, ctx } = canvas2d(S);
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(226,214,168,0.9)';
    ctx.lineWidth = 9;
    if (kind === 'launchpad') {
      // outer boundary + inner dashed keep-clear box
      ctx.strokeRect(40, 40, S - 80, S - 80);
      ctx.setLineDash([34, 26]);
      ctx.lineWidth = 6;
      ctx.strokeRect(150, 150, S - 300, S - 300);
      ctx.setLineDash([]);
      // corner ticks
      ctx.lineWidth = 11;
      const t = 70;
      for (const [x, y, sx, sy] of [[40, 40, 1, 1], [S - 40, 40, -1, 1], [40, S - 40, 1, -1], [S - 40, S - 40, -1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(x, y + sy * t);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * t, y);
        ctx.stroke();
      }
      // small stencilled captions along the edges, sized like real markings
      ctx.fillStyle = 'rgba(226,214,168,0.9)';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "Arial Narrow", Impact, sans-serif';
      ctx.fillText('B L A S T   Z O N E   -   K E E P   C L E A R', S / 2, 105);
      ctx.save();
      ctx.translate(S / 2, S - 78);
      ctx.rotate(Math.PI);
      ctx.fillText('B L A S T   Z O N E   -   K E E P   C L E A R', 0, 0);
      ctx.restore();
      ctx.font = 'bold 26px "Arial Narrow", Impact, sans-serif';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(S / 2, S / 2);
        ctx.rotate((i / 4) * Math.PI * 2);
        ctx.fillText('DANGER', 0, -S / 2 + 190);
        ctx.restore();
      }
      // tie-down grid dots
      ctx.fillStyle = 'rgba(200,190,150,0.5)';
      for (let gx = 0; gx < 5; gx++) {
        for (let gy = 0; gy < 5; gy++) {
          ctx.beginPath();
          ctx.arc(230 + gx * 140, 230 + gy * 140, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (kind === 'crosshair') {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(S / 2, S * 0.08);
      ctx.lineTo(S / 2, S * 0.92);
      ctx.moveTo(S * 0.08, S / 2);
      ctx.lineTo(S * 0.92, S / 2);
      ctx.stroke();
    }
    const rnd = mulberry32(kind.length * 31);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + rnd() * 0.55})`;
      ctx.beginPath();
      ctx.arc(rnd() * S, rnd() * S, 1 + rnd() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Scorch decal used under launch pads after a shot. */
export function scorch() {
  return get('scorch', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    ctx.clearRect(0, 0, S, S);
    const noise = new Noise2D(404);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - S / 2) / (S / 2);
        const dy = (y - S / 2) / (S / 2);
        const r = Math.hypot(dx, dy);
        const n = noise.fbm(dx * 3 + 5, dy * 3 + 5, 4) * 0.5 + 0.5;
        let a = Math.max(0, 1 - r / (0.55 + n * 0.45));
        a = Math.pow(a, 1.6) * (0.55 + n * 0.45);
        const i = (y * S + x) * 4;
        const v = 12 + n * 26;
        d[i] = v;
        d[i + 1] = v * 0.94;
        d[i + 2] = v * 0.9;
        d[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

// ---------------------------------------------------------------------------
// Sprites for particle systems
// ---------------------------------------------------------------------------

/** Soft turbulent smoke puff (alpha in RGB+A, tinted at runtime). */
export function smokePuff(variant = 0) {
  return get(`puff${variant}`, () => {
    const S = 128;
    const { c, ctx } = canvas2d(S);
    const noise = new Noise2D(700 + variant * 13);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - S / 2) / (S / 2);
        const dy = (y - S / 2) / (S / 2);
        const r = Math.hypot(dx, dy);
        let n = 0;
        n += noise.fbm(dx * 2.2 + 3, dy * 2.2 + 3, 5) * 0.5 + 0.5;
        const edge = Math.max(0, 1 - r);
        let a = Math.pow(edge, 1.5) * (0.35 + n * 0.9);
        a = Math.min(1, a);
        const v = 190 + n * 65;
        const i = (y * S + x) * 4;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Hot bloom sprite: bright core with faint radial spikes. */
export function flare() {
  return get('flare', () => {
    const S = 128;
    const { c, ctx } = canvas2d(S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,248,222,0.95)');
    g.addColorStop(0.3, 'rgba(255,198,110,0.55)');
    g.addColorStop(0.62, 'rgba(255,132,44,0.18)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      const lg = ctx.createLinearGradient(0, 0, S * 0.5, 0);
      lg.addColorStop(0, 'rgba(255,236,196,0.55)');
      lg.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(0, -2.2);
      ctx.lineTo(S * 0.5, 0);
      ctx.lineTo(0, 2.2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Small round glow used for sparks, status lights and distant beacons. */
export function glow(hardness = 0.25) {
  return get(`glow${hardness}`, () => {
    const S = 64;
    const { c, ctx } = canvas2d(S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(hardness, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Expanding shockwave ring: thin bright annulus. */
export function shockRing() {
  return get('shockRing', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.72, 'rgba(255,255,255,0)');
    g.addColorStop(0.86, 'rgba(255,246,226,0.85)');
    g.addColorStop(0.95, 'rgba(210,225,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(c, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Chain-link fence alpha texture. */
export function chainLink() {
  return get('chainlink', () => {
    const S = 128;
    const { c, ctx } = canvas2d(S);
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(196,198,196,0.95)';
    ctx.lineWidth = 3.2;
    const step = 16;
    for (let i = -S; i < S * 2; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + S, S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + S, 0);
      ctx.lineTo(i, S);
      ctx.stroke();
    }
    return finish(c);
  });
}

/** Camouflage netting alpha texture. */
export function camoNet() {
  return get('camonet', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    ctx.clearRect(0, 0, S, S);
    const noise = new Noise2D(313);
    const img = ctx.createImageData(S, S);
    const d = img.data;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = noise.fbm((x / S) * 9, (y / S) * 9, 4) * 0.5 + 0.5;
        const mesh = ((x % 12 < 3) || (y % 12 < 3)) ? 1 : 0.12;
        const a = mesh * (n > 0.36 ? 1 : 0.25);
        const i = (y * S + x) * 4;
        const g = 60 + n * 60;
        d[i] = g * 0.95;
        d[i + 1] = g;
        d[i + 2] = g * 0.7;
        d[i + 3] = a * 235;
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

/** Sandbag / gabion bumpy surface. */
export function sandbag() {
  return get('sandbag', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#8d7c58');
    const rnd = mulberry32(999);
    for (let y = 0; y < S; y += 32) {
      for (let x = (y / 32) % 2 ? 0 : 20; x < S; x += 40) {
        const g = ctx.createRadialGradient(x + 18, y + 12, 2, x + 18, y + 16, 26);
        const t = 0.85 + rnd() * 0.3;
        g.addColorStop(0, `rgba(${168 * t},${150 * t},${108 * t},1)`);
        g.addColorStop(1, `rgba(${88 * t},${76 * t},${52 * t},1)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + 18, y + 16, 21, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    grain(ctx, S, S, 26, 4);
    return c;
  });
}

/** Instrument / console screen face used on the 3D radar table bezel. */
export function bezel() {
  return get('bezel', () => {
    const S = 256;
    const { c, ctx } = canvas2d(S);
    fill(ctx, S, S, '#26292b');
    const rnd = mulberry32(76);
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(${rnd() * 60 + 20},${rnd() * 60 + 22},${rnd() * 60 + 24},0.5)`;
      ctx.fillRect(rnd() * S, rnd() * S, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(140,150,150,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, S - 16, S - 16);
    return c;
  });
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function disposeAll() {
  for (const t of cache.values()) t.dispose?.();
  cache.clear();
}
