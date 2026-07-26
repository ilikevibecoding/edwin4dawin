// ============================================================================
// Procedural texture toolkit (Fable 3 ownership). Everything is generated at
// runtime on canvases — no external image files. All patterns are TILEABLE by
// construction (wrapped noise lattices, wrapped speckle draws, full-span
// lines) so RepeatWrapping never shows a seam.
//
// IMPORTANT: no DOM access at module top level (a Node import-check runs this
// file without a real `document`). Canvases are only created inside functions.
// ============================================================================
import * as THREE from 'three';

// ---------------------------------------------------------------- randomness
// Deterministic mulberry32 so textures are identical every boot (stable
// screenshots, stable QA diffs).
export function mulberry(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function smooth(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ------------------------------------------------------------- noise fields
// Tileable value-noise field in [0,1], size w*h (Float32Array).
export function noiseField(w, h, { scale = 8, octaves = 1, persistence = 0.55, seed = 1 } = {}) {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0, freq = scale;
  for (let o = 0; o < octaves; o++) {
    const n = Math.max(1, Math.round(freq));
    const rnd = mulberry(seed * 7919 + o * 101 + n);
    const lat = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) lat[i] = rnd();
    for (let y = 0; y < h; y++) {
      const gy = (y / h) * n;
      const y0 = Math.floor(gy) % n, y1 = (y0 + 1) % n;
      const fy = smooth(gy - Math.floor(gy));
      const row0 = y0 * n, row1 = y1 * n;
      for (let x = 0; x < w; x++) {
        const gx = (x / w) * n;
        const x0 = Math.floor(gx) % n, x1 = (x0 + 1) % n;
        const fx = smooth(gx - Math.floor(gx));
        const v = lerp(
          lerp(lat[row0 + x0], lat[row0 + x1], fx),
          lerp(lat[row1 + x0], lat[row1 + x1], fx), fy);
        out[y * w + x] += v * amp;
      }
    }
    total += amp; amp *= persistence; freq *= 2;
  }
  const inv = 1 / total;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

// Overlay tileable value noise onto a context as a translucent tint.
// alpha scales per-pixel by the noise value (invert=true uses 1-v).
export function valueNoise(ctx, w, h, { scale = 8, alpha = 0.1, color = '#000000', octaves = 2, seed = 1, invert = false, contrast = 1 } = {}) {
  const field = noiseField(w, h, { scale, octaves, seed });
  const [r, g, b] = hexToRgb(color);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const tctx = c.getContext('2d');
  const img = tctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    let v = field[i];
    v = Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5));
    if (invert) v = 1 - v;
    const j = i * 4;
    d[j] = r; d[j + 1] = g; d[j + 2] = b;
    d[j + 3] = Math.round(255 * alpha * v);
  }
  tctx.putImageData(img, 0, 0);
  ctx.drawImage(c, 0, 0);
}

// ---------------------------------------------------------------- 2d marks
// Random dots/flecks; draws wrapped copies near edges so the result tiles.
export function speckle(ctx, w, h, { count = 200, rmin = 0.5, rmax = 1.5, colors = ['#000000'], alpha = 0.2, seed = 2, squashY = 1 } = {}) {
  const rnd = mulberry(seed * 31 + 7);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h;
    const r = rmin + rnd() * (rmax - rmin);
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    for (const ox of [0, -w, w]) {
      for (const oy of [0, -h, h]) {
        if ((x + ox > -r * 2 && x + ox < w + r * 2) && (y + oy > -r * 2 && y + oy < h + r * 2)) {
          ctx.beginPath();
          ctx.ellipse(x + ox, y + oy, r, r * squashY, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

// Full-span soft streak lines (brushed metal, wood sheen, subtle wall bands).
// dir 'h' = horizontal lines, 'v' = vertical lines. Spans the full canvas so
// tiling is seamless along the streak direction.
export function streaks(ctx, w, h, { dir = 'h', count = 120, alpha = 0.06, light = '#ffffff', dark = '#000000', seed = 3, widthRange = [1, 2], wobble = 0 } = {}) {
  const rnd = mulberry(seed * 53 + 11);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const p = rnd() * (dir === 'h' ? h : w);
    const lw = widthRange[0] + rnd() * (widthRange[1] - widthRange[0]);
    ctx.strokeStyle = rnd() < 0.5 ? light : dark;
    ctx.globalAlpha = alpha * (0.35 + rnd() * 0.65);
    ctx.lineWidth = lw;
    ctx.beginPath();
    if (wobble <= 0) {
      if (dir === 'h') { ctx.moveTo(0, p); ctx.lineTo(w, p); }
      else { ctx.moveTo(p, 0); ctx.lineTo(p, h); }
    } else {
      // gentle sine wobble, integer cycles so it still tiles
      const cycles = 1 + Math.floor(rnd() * 2);
      const amp = wobble * (0.4 + rnd() * 0.6);
      const phase = rnd() * Math.PI * 2;
      const steps = 24;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const off = Math.sin(phase + t * Math.PI * 2 * cycles) * amp;
        const x = dir === 'h' ? t * w : p + off;
        const y = dir === 'h' ? p + off : t * h;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Grid lines at cell boundaries (tile grout, ceiling grid, panel seams).
export function gridLines(ctx, w, h, { cols = 2, rows = 2, lineW = 2, color = '#000000', alpha = 0.5 } = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  if (cols > 0) {
    for (let i = 0; i <= cols; i++) {
      const x = (i * w) / cols;
      ctx.fillRect(x - lineW / 2, 0, lineW, h);
      if (i === 0) ctx.fillRect(w - lineW / 2, 0, lineW, h);
    }
  }
  if (rows > 0) {
    for (let j = 0; j <= rows; j++) {
      const y = (j * h) / rows;
      ctx.fillRect(0, y - lineW / 2, w, lineW);
      if (j === 0) ctx.fillRect(0, h - lineW / 2, w, lineW);
    }
  }
  ctx.restore();
}

// Fill each grid cell with the base color jittered in luminance (+ optional
// slight hue jitter). Used for panels, tiles, concrete blocks, planks.
export function cellFill(ctx, w, h, { cols = 2, rows = 2, base = '#888888', delta = 8, seed = 4, hueJitter = 0 } = {}) {
  const [r, g, b] = hexToRgb(base);
  const rnd = mulberry(seed * 97 + 13);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const dl = (rnd() * 2 - 1) * delta;
      const dh = (rnd() * 2 - 1) * hueJitter;
      ctx.fillStyle = `rgb(${clamp8(r + dl + dh)},${clamp8(g + dl)},${clamp8(b + dl - dh)})`;
      ctx.fillRect(Math.floor((i * w) / cols), Math.floor((j * h) / rows),
        Math.ceil(w / cols) + 1, Math.ceil(h / rows) + 1);
    }
  }
}

function clamp8(v) { return Math.max(0, Math.min(255, Math.round(v))); }

// Thin meandering hairline cracks. Kept away from borders so tiling stays
// seamless (a crack never crosses the canvas edge).
export function hairlineCracks(ctx, w, h, { count = 3, color = '#3c3c3c', alpha = 0.28, seed = 5, segments = 22 } = {}) {
  const rnd = mulberry(seed * 131 + 17);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    let x = w * (0.15 + rnd() * 0.7);
    let y = h * (0.15 + rnd() * 0.7);
    let ang = rnd() * Math.PI * 2;
    ctx.globalAlpha = alpha * (0.6 + rnd() * 0.4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < segments; s++) {
      ang += (rnd() - 0.5) * 1.1;
      const step = (2 + rnd() * 6) * (w / 512);
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      if (x < w * 0.04 || x > w * 0.96 || y < h * 0.04 || y > h * 0.96) break;
      ctx.lineTo(x, y);
      // occasional fork
      if (rnd() < 0.08) {
        ctx.moveTo(x, y);
        const fa = ang + (rnd() - 0.5) * 2;
        ctx.lineTo(x + Math.cos(fa) * step * 2, y + Math.sin(fa) * step * 2);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ texture makers
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function applyOpts(tex, opts = {}) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.anisotropy = opts.anisotropy ?? 1;
  tex.needsUpdate = true;
  return tex;
}

// Core entry: draw into a canvas and wrap it as a repeating texture.
// drawFn(ctx, w, h). opts: { repeat: [rx, ry], srgb: bool (default true),
// anisotropy: int }.
export function makeCanvasTexture(w, h, drawFn, opts = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  drawFn(ctx, w, h);
  return applyOpts(new THREE.CanvasTexture(c), opts);
}

// Normal map computed from a grayscale height canvas with a wrapped Sobel
// filter (so the normal map tiles exactly like its height source).
// heightDrawFn(ctx, w, h) draws heights: white = high, black = low. The ctx
// is pre-filled with mid-gray. strength ~0.2 (subtle) .. 1.5 (deep grooves).
export function makeNormalMap(w, h, heightDrawFn, strength = 1, opts = {}) {
  const hc = makeCanvas(w, h);
  const hctx = hc.getContext('2d', { willReadFrequently: true });
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, w, h);
  heightDrawFn(hctx, w, h);
  const src = hctx.getImageData(0, 0, w, h).data;

  const nc = makeCanvas(w, h);
  const nctx = nc.getContext('2d');
  const img = nctx.createImageData(w, h);
  const d = img.data;
  const H = (x, y) => src[((((y + h) % h) * w + ((x + w) % w)) << 2)];
  const k = strength / (255 * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = H(x - 1, y - 1), tc = H(x, y - 1), tr = H(x + 1, y - 1);
      const ml = H(x - 1, y), mr = H(x + 1, y);
      const bl = H(x - 1, y + 1), bc = H(x, y + 1), br = H(x + 1, y + 1);
      const gx = (tr + 2 * mr + br - tl - 2 * ml - bl) * k;
      const gy = (bl + 2 * bc + br - tl - 2 * tc - tr) * k;
      // tangent-space normal; canvas +y maps to -V after flipY, so +gy here.
      let nx = -gx, ny = gy, nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      const i = (y * w + x) << 2;
      d[i] = clamp8((nx * inv * 0.5 + 0.5) * 255);
      d[i + 1] = clamp8((ny * inv * 0.5 + 0.5) * 255);
      d[i + 2] = clamp8((nz * inv * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  return applyOpts(new THREE.CanvasTexture(nc), { ...opts, srgb: false });
}

// Grayscale data texture (roughness/metalness). Same drawing model as
// makeCanvasTexture but linear color space. Convention: draw luminance =
// the roughness value (0 black smooth .. 1 white rough).
export function makeDataTexture(w, h, drawFn, opts = {}) {
  return makeCanvasTexture(w, h, drawFn, { ...opts, srgb: false });
}
