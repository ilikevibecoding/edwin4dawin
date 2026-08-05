import * as THREE from 'three';
import { Noise } from './noise.js';
import { clamp, saturate } from './mathx.js';

/**
 * Procedural texture factory.
 *
 * Everything the game draws is generated here from canvas operations and
 * noise - there are no downloaded images anywhere in the project. Results are
 * memoised so repeated requests share one GPU upload.
 */

const cache = new Map();
const tnoise = new Noise(4242);

function canvas(size, h = size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = h;
  return c;
}

/** Every generator reads pixels back, so hint the 2D context accordingly. */
function ctx2d(c) {
  return c.getContext('2d', { willReadFrequently: true });
}

function finish(c, { repeat = 1, srgb = true, aniso = 8, wrap = THREE.RepeatWrapping } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = wrap;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function memo(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

export function disposeTextureCache() {
  for (const t of cache.values()) if (t && t.dispose) t.dispose();
  cache.clear();
}

/* ------------------------------------------------------------------ *
 * Low level helpers
 * ------------------------------------------------------------------ */

function fillNoise(ctx, size, fn) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const [r, g, b, a] = fn(x, y, i);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a === undefined ? 255 : a;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/** Height field -> tangent space normal map. */
export function normalFromHeight(heightFn, size = 512, strength = 2, repeat = 1) {
  const c = canvas(size);
  const ctx = ctx2d(c);
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) h[y * size + x] = heightFn(x, y);
  fillNoise(ctx, size, (x, y) => {
    const xm = (x - 1 + size) % size;
    const xp = (x + 1) % size;
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    const dx = (h[y * size + xp] - h[y * size + xm]) * strength;
    const dy = (h[yp * size + x] - h[ym * size + x]) * strength;
    let nx = -dx;
    let ny = -dy;
    let nz = 1;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    return [(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255, 255];
  });
  const tex = finish(c, { repeat, srgb: false });
  return tex;
}

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/** Weathered painted steel with panel seams, rivets, scratches and grime. */
export function metalPanel({
  base = '#6d7266',
  seam = '#3a3d36',
  size = 512,
  panels = 4,
  rivets = true,
  grime = 0.55,
  scratches = 90,
  key = 'metal'
} = {}) {
  return memo(`${key}|${base}|${seam}|${size}|${panels}|${rivets}|${grime}|${scratches}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Broad tonal variation so large flat faces are never a single colour.
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n =
          tnoise.fbm2(x / 90, y / 90, 4) * 0.5 + tnoise.fbm2(x / 14, y / 14, 3) * 0.22;
        const g = 1 + n * 0.28;
        d[i] = clamp(d[i] * g, 0, 255);
        d[i + 1] = clamp(d[i + 1] * g, 0, 255);
        d[i + 2] = clamp(d[i + 2] * g, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);

    // Panel seams.
    const step = size / panels;
    ctx.strokeStyle = seam;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, size / 340);
    for (let i = 0; i <= panels; i++) {
      const p = Math.round(i * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    // Highlight along one side of each seam sells the recess.
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i <= panels; i++) {
      const p = Math.round(i * step) + 1.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (rivets) {
      const r = Math.max(1.1, size / 300);
      for (let i = 0; i <= panels; i++) {
        for (let t = 0; t < panels * 6; t++) {
          const a = (t + 0.5) * (step / 6);
          for (const [x, y] of [
            [i * step, a],
            [a, i * step]
          ]) {
            ctx.fillStyle = 'rgba(20,22,18,0.55)';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.beginPath();
            ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Scratches.
    ctx.lineCap = 'round';
    for (let i = 0; i < scratches; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 46;
      const ang = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(${210 + Math.random() * 40 | 0},${205},${190},${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = Math.random() * 1.4 + 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Grime running from seams and corners.
    if (grime > 0) {
      const g2 = ctx.getImageData(0, 0, size, size);
      const dd = g2.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const streak =
            saturate(tnoise.fbm2(x / 26, y / 200, 4) * 0.5 + 0.5 - 0.42) * grime;
          const k = 1 - streak * 0.75;
          dd[i] *= k;
          dd[i + 1] *= k;
          dd[i + 2] *= k * 0.98;
        }
      }
      ctx.putImageData(g2, 0, 0);
    }
    return finish(c);
  });
}

/** Cracked, stained concrete pad. */
export function concrete({ size = 512, tone = 176, cracks = 26, key = 'concrete' } = {}) {
  return memo(`${key}|${size}|${tone}|${cracks}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    fillNoise(ctx, size, (x, y) => {
      const n =
        tnoise.fbm2(x / 45, y / 45, 5) * 0.5 +
        tnoise.fbm2(x / 6, y / 6, 3) * 0.2 +
        (Math.random() - 0.5) * 0.12;
      const v = clamp(tone * (1 + n * 0.30), 0, 255);
      return [v, v * 0.99, v * 0.94];
    });
    // Expansion joints.
    ctx.strokeStyle = 'rgba(60,60,58,0.55)';
    ctx.lineWidth = Math.max(1.5, size / 220);
    for (const p of [0.5]) {
      ctx.beginPath();
      ctx.moveTo(p * size, 0);
      ctx.lineTo(p * size, size);
      ctx.moveTo(0, p * size);
      ctx.lineTo(size, p * size);
      ctx.stroke();
    }
    // Hairline cracks.
    ctx.lineCap = 'round';
    for (let i = 0; i < cracks; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;
      let a = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(52,52,50,${0.25 + Math.random() * 0.35})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 6 + (Math.random() * 12) | 0;
      for (let s = 0; s < segs; s++) {
        a += (Math.random() - 0.5) * 1.1;
        x += Math.cos(a) * (5 + Math.random() * 14);
        y += Math.sin(a) * (5 + Math.random() * 14);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Oil / rubber staining.
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 12 + Math.random() * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(40,38,34,${0.10 + Math.random() * 0.16})`);
      g.addColorStop(1, 'rgba(40,38,34,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(c);
  });
}

/** Desert sand / gravel ground. */
export function sand({ size = 512, key = 'sand' } = {}) {
  return memo(`${key}|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    fillNoise(ctx, size, (x, y) => {
      const dune = tnoise.fbm2(x / 70, y / 130, 4);
      const grit = tnoise.fbm2(x / 3.2, y / 3.2, 2);
      const speck = Math.random();
      const v = 0.55 + dune * 0.22 + grit * 0.14;
      let r = 196 * v;
      let g = 168 * v;
      let b = 132 * v;
      if (speck > 0.985) {
        r *= 0.6;
        g *= 0.6;
        b *= 0.62;
      }
      return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
    });
    return finish(c);
  });
}

/** Small pebbles / coarse gravel used on service roads and berms. */
export function gravel({ size = 512, key = 'gravel' } = {}) {
  return memo(`${key}|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    ctx.fillStyle = '#6a6459';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 1 + Math.random() * 4.5;
      const v = 70 + Math.random() * 105;
      ctx.fillStyle = `rgb(${v | 0},${(v * 0.96) | 0},${(v * 0.88) | 0})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return finish(c);
  });
}

/** Three tone desert camouflage used on vehicles and canisters. */
export function camo({
  size = 512,
  colors = ['#7a7460', '#5c5a48', '#9a8f72'],
  scale = 55,
  key = 'camo'
} = {}) {
  return memo(`${key}|${size}|${colors.join()}|${scale}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const rgb = colors.map((h) => new THREE.Color(h));
    fillNoise(ctx, size, (x, y) => {
      const n = tnoise.fbm2(x / scale, y / scale, 4) * 0.5 + 0.5;
      const idx = n < 0.42 ? 0 : n < 0.62 ? 1 : 2;
      const col = rgb[idx];
      const grit = 1 + tnoise.fbm2(x / 5, y / 5, 2) * 0.12;
      return [
        clamp(col.r * 255 * grit, 0, 255),
        clamp(col.g * 255 * grit, 0, 255),
        clamp(col.b * 255 * grit, 0, 255)
      ];
    });
    return finish(c);
  });
}

/** Painted stencil markings (unit codes, hazard text) on a transparent sheet. */
export function stencilDecal(lines, { w = 512, h = 256, color = '#e9e6d8', font = 'bold 64px "Courier New", monospace' } = {}) {
  return memo(`stencil|${lines.join('/')}|${w}|${h}|${color}|${font}`, () => {
    const c = canvas(w, h);
    const ctx = ctx2d(c);
    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = h / (lines.length + 0.6);
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, lh * (i + 0.8), w * 0.94);
    });
    // Chip the paint so decals never look like clean vector art.
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        const n = tnoise.fbm2(x / 7, y / 7, 3) * 0.5 + 0.5;
        d[i + 3] *= saturate(n * 1.9 - 0.25);
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    return tex;
  });
}

/** Yellow/black hazard chevrons. */
export function hazardStripe({ size = 256, a = '#d9b21c', b = '#1d1d1a', key = 'hazard' } = {}) {
  return memo(`${key}|${size}|${a}|${b}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = b;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 4);
    for (let i = -size; i < size; i += size / 4) {
      ctx.fillRect(i, -size, size / 8, size * 2);
    }
    ctx.restore();
    // Wear.
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const x = (i / 4) % size;
      const y = Math.floor(i / 4 / size);
      const n = saturate(tnoise.fbm2(x / 9, y / 9, 3) * 0.5 + 0.5);
      const k = 0.72 + n * 0.5;
      d[i] *= k;
      d[i + 1] *= k;
      d[i + 2] *= k;
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

/* ------------------------------------------------------------------ *
 * Sprites (particles, glows, flares)
 * ------------------------------------------------------------------ */

/** Soft turbulent smoke puff with alpha only in the RGB=white channel. */
export function smokeSprite(size = 128) {
  return memo(`smoke|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = (x - half) / half;
        const dy = (y - half) / half;
        const r = Math.hypot(dx, dy);
        const n = tnoise.fbm2(x / 16 + 11, y / 16 - 5, 4) * 0.5 + 0.5;
        const wob = 1 - saturate((r * (0.78 + n * 0.5) - 0.10) / 0.9);
        const a = saturate(Math.pow(wob, 1.55)) * (0.55 + n * 0.6);
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = clamp(a * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Radial glow used for flares, lights and fireball cores. */
export function glowSprite(size = 128, falloff = 2.2) {
  return memo(`glow|${size}|${falloff}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = Math.pow(1 - t, falloff);
      g.addColorStop(t, `rgba(255,255,255,${a})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Anamorphic-ish streak for launch flash / sun glints. */
export function streakSprite(size = 256) {
  return memo(`streak|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    ctx.clearRect(0, 0, size, size);
    const half = size / 2;
    const g = ctx.createLinearGradient(0, half, size, half);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, half - size * 0.02, size, size * 0.04);
    const rg = ctx.createRadialGradient(half, half, 0, half, half, size * 0.18);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Irregular scorch mark for ground decals. */
export function scorchSprite(size = 256) {
  return memo(`scorch|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = (x - half) / half;
        const dy = (y - half) / half;
        const ang = Math.atan2(dy, dx);
        const r = Math.hypot(dx, dy);
        const edge =
          0.62 + tnoise.fbm2(Math.cos(ang) * 2 + 3, Math.sin(ang) * 2 - 7, 4) * 0.28;
        const core = saturate(1 - r / edge);
        const n = tnoise.fbm2(x / 12, y / 12, 4) * 0.5 + 0.5;
        const a = Math.pow(core, 1.3) * (0.45 + n * 0.75);
        const v = 26 + n * 34;
        d[i] = v;
        d[i + 1] = v * 0.94;
        d[i + 2] = v * 0.88;
        d[i + 3] = clamp(a * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Sharp-edged spark / ember point. */
export function sparkSprite(size = 64) {
  return memo(`spark|${size}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const half = size / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,238,190,0.85)');
    g.addColorStop(0.6, 'rgba(255,150,60,0.25)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Fluffy cloud billboard. */
export function cloudSprite(size = 256, seed = 1) {
  return memo(`cloud|${size}|${seed}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const n2 = new Noise(seed * 977 + 13);
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const half = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dx = (x - half) / half;
        const dy = ((y - half) / half) * 1.7;
        const r = Math.hypot(dx, dy);
        const n = n2.fbm2(x / 30, y / 30, 5) * 0.5 + 0.5;
        const shape = saturate(1 - r) * (0.35 + n * 1.1);
        const a = saturate(shape * 1.5 - 0.28);
        // Slight vertical shading gives the billboard some volume.
        const shade = 0.72 + saturate(1 - y / size) * 0.28;
        const v = 255 * shade;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v * 1.0;
        d[i + 3] = clamp(a * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/** Rubber / hydraulic hose colour with subtle ribbing. */
export function rubber({ size = 128, tone = 34, key = 'rubber' } = {}) {
  return memo(`${key}|${size}|${tone}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    fillNoise(ctx, size, (x, y) => {
      const rib = Math.sin(y * 0.55) * 0.5 + 0.5;
      const n = tnoise.fbm2(x / 8, y / 8, 3) * 0.5 + 0.5;
      const v = tone * (0.75 + rib * 0.35 + n * 0.3);
      return [v, v * 1.02, v * 1.04];
    });
    return finish(c);
  });
}

/** Chain link fence: transparent sheet with a woven wire pattern. */
export function chainLink(size = 256, cells = 8) {
  return memo(`chain|${size}|${cells}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = Math.max(1.6, size / 110);
    ctx.lineCap = 'round';
    const step = size / cells;
    for (let i = -cells; i <= cells * 2; i++) {
      ctx.strokeStyle = 'rgba(178,182,178,0.92)';
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step + size, size);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(140,144,140,0.92)';
      ctx.beginPath();
      ctx.moveTo(i * step, size);
      ctx.lineTo(i * step + size, 0);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  });
}

/** Emissive console screen face (used for the small readouts on equipment). */
export function screenFace(label, { w = 256, h = 128, hue = '#6ff0c8', rows = 5 } = {}) {
  return memo(`screen|${label}|${w}|${h}|${hue}|${rows}`, () => {
    const c = canvas(w, h);
    const ctx = ctx2d(c);
    ctx.fillStyle = '#06120f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = hue;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(4.5, 4.5, w - 9, h - 9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hue;
    ctx.font = `bold ${Math.round(h * 0.16)}px "Courier New", monospace`;
    ctx.fillText(label, 12, h * 0.24);
    ctx.font = `${Math.round(h * 0.11)}px "Courier New", monospace`;
    for (let i = 0; i < rows; i++) {
      ctx.globalAlpha = 0.35 + Math.random() * 0.5;
      const bar = '▮'.repeat(1 + ((Math.random() * 9) | 0));
      ctx.fillText(bar, 12, h * (0.42 + i * 0.115));
    }
    ctx.globalAlpha = 1;
    // Scanlines.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/**
 * Heat tempering colours: the straw/blue/violet banding that steel takes on
 * around an exhaust. `v` runs 0 (cold) at the top to 1 (hottest) at the bottom.
 */
export function heatTemper({ size = 256, base = '#4a4a48', key = 'heat' } = {}) {
  return memo(`${key}|${size}|${base}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    const baseCol = new THREE.Color(base);
    const bands = [
      [0.0, new THREE.Color(base)],
      [0.34, new THREE.Color('#5b544a')],
      [0.5, new THREE.Color('#8a6a3a')],
      [0.62, new THREE.Color('#a06a3c')],
      [0.72, new THREE.Color('#6b4a6e')],
      [0.82, new THREE.Color('#3f5b86')],
      [0.9, new THREE.Color('#4a4a52')],
      [1.0, new THREE.Color('#2a2724')]
    ];
    fillNoise(ctx, size, (x, y) => {
      const t = saturate(y / size + tnoise.fbm2(x / 30, y / 30, 3) * 0.06);
      let lo = bands[0];
      let hi = bands[bands.length - 1];
      for (let i = 0; i < bands.length - 1; i++) {
        if (t >= bands[i][0] && t <= bands[i + 1][0]) {
          lo = bands[i];
          hi = bands[i + 1];
          break;
        }
      }
      const k = (t - lo[0]) / Math.max(1e-4, hi[0] - lo[0]);
      const col = lo[1].clone().lerp(hi[1], k);
      const soot = saturate(tnoise.fbm2(x / 10, y / 10, 4) * 0.5 + 0.5);
      const dark = 1 - saturate(t - 0.55) * soot * 0.55;
      void baseCol;
      return [
        clamp(col.r * 255 * dark, 0, 255),
        clamp(col.g * 255 * dark, 0, 255),
        clamp(col.b * 255 * dark, 0, 255)
      ];
    });
    return finish(c);
  });
}

/** Roughness/metalness data map (non-colour) from noise. */
export function dataNoise({ size = 256, r = 0.7, g = 0.0, spread = 0.25, key = 'data' } = {}) {
  return memo(`${key}|${size}|${r}|${g}|${spread}`, () => {
    const c = canvas(size);
    const ctx = ctx2d(c);
    fillNoise(ctx, size, (x, y) => {
      const n = tnoise.fbm2(x / 22, y / 22, 4) * 0.5 + 0.5;
      const rr = clamp((r + (n - 0.5) * 2 * spread) * 255, 0, 255);
      const gg = clamp((g + (n - 0.5) * 2 * spread * 0.5) * 255, 0, 255);
      return [rr, gg, 255];
    });
    return finish(c, { srgb: false });
  });
}
