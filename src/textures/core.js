import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared procedural texture toolkit. Everything in the demo is generated here
// or by the per-asset texture modules that build on top of these helpers.
// Nothing is downloaded.
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Tileable value noise with an integer wrap period. */
export function valueNoise(x, y, period, seed) {
  const p = Math.max(1, period | 0);
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const x0 = ((xi % p) + p) % p;
  const y0 = ((yi % p) + p) % p;
  const x1 = (x0 + 1) % p;
  const y1 = (y0 + 1) % p;
  const u = smooth(xf);
  const v = smooth(yf);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Tileable fractal brownian motion in [0,1]. */
export function fbm(x, y, { octaves = 5, period = 8, seed = 1, gain = 0.5, lacunarity = 2 } = {}) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  let per = period;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, per, seed + i * 977);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
    per = Math.max(1, Math.round(per * lacunarity));
  }
  return sum / norm;
}

/** Ridged variant, good for bark / rock strata. */
export function ridged(x, y, opts = {}) {
  const n = fbm(x, y, opts);
  return 1 - Math.abs(n * 2 - 1);
}

/** Tileable Worley / cellular noise. Returns { f1, f2, id }. */
export function worley(x, y, period, seed) {
  const p = Math.max(1, period | 0);
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox;
      const cy = yi + oy;
      const wx = ((cx % p) + p) % p;
      const wy = ((cy % p) + p) % p;
      const jx = hash2(wx, wy, seed);
      const jy = hash2(wx, wy, seed + 7919);
      const px = cx + jx;
      const py = cy + jy;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(wx, wy, seed + 104729);
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return { f1, f2, id };
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function configure(tex, { srgb = false, repeat = 1, aniso = 8, flipY = true } = {}) {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const r = Array.isArray(repeat) ? repeat : [repeat, repeat];
  tex.repeat.set(r[0], r[1]);
  tex.anisotropy = aniso;
  tex.flipY = flipY;
  tex.needsUpdate = true;
  return tex;
}

/** Build a texture by drawing into a 2D canvas. */
export function canvasTexture(size, draw, opts = {}) {
  const h = opts.height || size;
  const c = makeCanvas(size, h);
  const ctx = c.getContext('2d');
  draw(ctx, size, h);
  return configure(new THREE.CanvasTexture(c), opts);
}

/**
 * Fill the colour of the opaque pixels into every transparent one. `data` is
 * RGBA bytes, modified in place; alpha is left untouched.
 *
 * Push-pull rather than an iterative 3x3 dilate, because the whole hole has to
 * be filled, not just a border. GPU mip generation averages colour and alpha
 * separately over the *entire* tile, so a sparse leaf spray drawn on a black
 * transparent field still resolves to black once it is a few mips down — which
 * is exactly the distance at which the canopy was breaking into dark slivers.
 */
export function dilateRGB(data, w, h, threshold = 8) {
  const levels = [];
  let cw = w;
  let ch = h;
  let col = new Float32Array(w * h * 3);
  let cov = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3] >= threshold ? 1 : 0;
    cov[i] = a;
    col[i * 3] = data[i * 4] * a;
    col[i * 3 + 1] = data[i * 4 + 1] * a;
    col[i * 3 + 2] = data[i * 4 + 2] * a;
  }
  levels.push({ w: cw, h: ch, col, cov });

  // pull: coverage-weighted sums up the pyramid until every hole is spanned
  while (cw > 1 || ch > 1) {
    const nw = Math.max(1, cw >> 1);
    const nh = Math.max(1, ch >> 1);
    const ncol = new Float32Array(nw * nh * 3);
    const ncov = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let c = 0;
        for (let dy = 0; dy < 2; dy++) {
          const sy = Math.min(ch - 1, y * 2 + dy);
          for (let dx = 0; dx < 2; dx++) {
            const j = sy * cw + Math.min(cw - 1, x * 2 + dx);
            r += col[j * 3];
            g += col[j * 3 + 1];
            b += col[j * 3 + 2];
            c += cov[j];
          }
        }
        const i = y * nw + x;
        ncol[i * 3] = r;
        ncol[i * 3 + 1] = g;
        ncol[i * 3 + 2] = b;
        ncov[i] = c;
      }
    }
    levels.push({ w: nw, h: nh, col: ncol, cov: ncov });
    cw = nw;
    ch = nh;
    col = ncol;
    cov = ncov;
  }

  // push: every uncovered pixel takes the normalised colour of its parent
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++) {
      const py = Math.min(coarse.h - 1, y >> 1);
      for (let x = 0; x < fine.w; x++) {
        const i = y * fine.w + x;
        if (fine.cov[i] > 0) continue;
        const j = py * coarse.w + Math.min(coarse.w - 1, x >> 1);
        if (coarse.cov[j] <= 0) continue;
        const inv = 1 / coarse.cov[j];
        fine.col[i * 3] = coarse.col[j * 3] * inv;
        fine.col[i * 3 + 1] = coarse.col[j * 3 + 1] * inv;
        fine.col[i * 3 + 2] = coarse.col[j * 3 + 2] * inv;
        fine.cov[i] = 1;
      }
    }
  }

  const base = levels[0];
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] >= threshold || base.cov[i] <= 0) continue;
    data[i * 4] = Math.round(base.col[i * 3]);
    data[i * 4 + 1] = Math.round(base.col[i * 3 + 1]);
    data[i * 4 + 2] = Math.round(base.col[i * 3 + 2]);
  }
}

/**
 * Alpha-cutout texture drawn on a canvas, uploaded as raw bytes with the colour
 * dilated outward past the cutout edge.
 *
 * A canvas stores its pixels premultiplied, so any colour written where alpha is
 * zero is already gone by the time the texture is uploaded — the transparent
 * side of every edge reads back as black. Bilinear filtering and every mip level
 * then average that black in, and an alpha-tested leaf card ends up fringed with
 * black slivers that read as torn paper hanging in the canopy. Reading the
 * pixels back, flooding colour outward and uploading a DataTexture bypasses the
 * premultiply entirely.
 */
export function cutoutTexture(size, draw, opts = {}) {
  const h = opts.height || size;
  const c = makeCanvas(size, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  draw(ctx, size, h);
  const img = ctx.getImageData(0, 0, size, h);
  dilateRGB(img.data, size, h);

  // flipY on a DataTexture is unreliable across backends, so bake the flip that
  // a CanvasTexture would have done into the row order instead
  const src = img.data;
  const data = new Uint8Array(size * h * 4);
  const row = size * 4;
  for (let y = 0; y < h; y++) {
    data.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  }

  const tex = new THREE.DataTexture(data, size, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return configure(tex, { srgb: true, aniso: 4, ...opts, flipY: false });
}

/**
 * Per-pixel texture. `fn(x, y, out)` writes out[0..3] as 0-255 values.
 * Much faster than canvas ops for noise fields.
 */
export function pixelTexture(w, h, fn, opts = {}) {
  const data = new Uint8Array(w * h * 4);
  const out = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[0] = out[1] = out[2] = 0;
      out[3] = 255;
      fn(x, y, out);
      const i = (y * w + x) * 4;
      data[i] = out[0];
      data[i + 1] = out[1];
      data[i + 2] = out[2];
      data[i + 3] = out[3];
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  // Mips average unrelated features together, which is wrong for any map read
  // as a lookup rather than as a surface — the puddle canopy panorama loses its
  // trunks into the sky behind them two levels down and reverts to a flat plate.
  tex.generateMipmaps = opts.mips !== false;
  tex.minFilter = tex.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  return configure(tex, opts);
}

/**
 * Convert a height field (Float32Array, w*h, values roughly 0-1) into a
 * tangent-space normal map. Wraps at the edges so the result tiles.
 */
export function normalFromHeight(height, w, h, strength = 2, opts = {}) {
  const data = new Uint8Array(w * h * 4);
  const at = (x, y) => height[(((y % h) + h) % h) * w + (((x % w) + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * w + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return configure(tex, opts);
}

/** Allocate a height field and fill it with fn(x, y) -> 0..1 */
export function heightField(w, h, fn) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = fn(x, y);
  }
  return out;
}

/** Pack roughness into G and metalness into B (glTF ORM convention). */
export function ormTexture(w, h, fn, opts = {}) {
  return pixelTexture(
    w,
    h,
    (x, y, out) => {
      const v = fn(x, y);
      out[0] = clamp(v.ao ?? 1) * 255;
      out[1] = clamp(v.roughness ?? 0.5) * 255;
      out[2] = clamp(v.metalness ?? 0) * 255;
    },
    opts,
  );
}

/** Simple grayscale roughness map. */
export function roughnessTexture(w, h, fn, opts = {}) {
  return pixelTexture(
    w,
    h,
    (x, y, out) => {
      const v = clamp(fn(x, y)) * 255;
      out[0] = out[1] = out[2] = v;
    },
    opts,
  );
}

export function hexToRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r * 255, c.g * 255, c.b * 255];
}

/** Blend two [r,g,b] arrays. */
export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const _cache = new Map();
/** Memoize expensive generators so hot reload / multiple users share results. */
export function cached(key, factory) {
  if (!_cache.has(key)) _cache.set(key, factory());
  return _cache.get(key);
}
