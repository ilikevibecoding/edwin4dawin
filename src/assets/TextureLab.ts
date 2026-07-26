/**
 * Procedural PBR texture painter. Owner: Fable 3.
 *
 * Every texture in the game is painted here at runtime onto a canvas, so the repository
 * contains no binary image assets and the game can never fail with a missing texture.
 *
 * Rules followed by every generator:
 *  - Base colour holds albedo only. No baked lighting, no baked ambient occlusion darkening
 *    beyond genuine cavity dirt, no painted highlights.
 *  - Height is authored first; the normal map is derived from it with a Sobel filter so the
 *    normal always agrees with the visible surface relief.
 *  - Roughness is authored per material family with real variance. Nothing ships with a flat
 *    constant roughness.
 *  - All maps are tileable: noise wraps on the texture period.
 */
import * as THREE from 'three';

export interface PbrMaps {
  map: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  aoMap?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

/** Painter working buffers, one float per texel. */
export interface Layer {
  size: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  h: Float32Array;
  rough: Float32Array;
  metal: Float32Array;
  ao: Float32Array;
}

let anisotropyCap = 4;
export function setTextureAnisotropy(value: number): void {
  anisotropyCap = Math.max(1, value | 0);
}

let textureScale = 1;
export function setTextureScale(value: number): void {
  textureScale = Math.max(0.25, Math.min(1, value));
}

const cache = new Map<string, PbrMaps>();
const canvasCache = new Map<string, THREE.Texture>();

export function clearTextureCache(): void {
  for (const set of cache.values()) {
    set.map.dispose();
    set.normalMap?.dispose();
    set.roughnessMap?.dispose();
    set.metalnessMap?.dispose();
    set.aoMap?.dispose();
    set.emissiveMap?.dispose();
  }
  cache.clear();
  for (const t of canvasCache.values()) t.dispose();
  canvasCache.clear();
}

// ---------------------------------------------------------------------------
// noise primitives (tileable)
// ---------------------------------------------------------------------------

function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise that wraps exactly on `period` cells. */
function vnoise(x: number, y: number, period: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const xa = ((x0 % period) + period) % period;
  const ya = ((y0 % period) + period) % period;
  const xb = (xa + 1) % period;
  const yb = (ya + 1) % period;
  const n00 = hash2(xa, ya, seed);
  const n10 = hash2(xb, ya, seed);
  const n01 = hash2(xa, yb, seed);
  const n11 = hash2(xb, yb, seed);
  const a = n00 + (n10 - n00) * fx;
  const b = n01 + (n11 - n01) * fx;
  return a + (b - a) * fy;
}

/** Fractal Brownian motion built from tileable value noise. */
export function fbm(
  u: number,
  v: number,
  baseFreq: number,
  octaves: number,
  seed: number,
  gain = 0.5,
): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let freq = baseFreq;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(u * freq, v * freq, freq, seed + o * 101);
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

/** Ridged noise, good for scratches and fibres. */
function ridge(u: number, v: number, freq: number, octaves: number, seed: number): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let f = freq;
  for (let o = 0; o < octaves; o++) {
    const n = Math.abs(vnoise(u * f, v * f, f, seed + o * 71) * 2 - 1);
    sum += amp * (1 - n);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Cellular / Worley noise, wrapping. Returns distance to nearest feature point in cell units. */
function worley(u: number, v: number, cells: number, seed: number): number {
  const x = u * cells;
  const y = v * cells;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 8;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const wx = ((cx % cells) + cells) % cells;
      const wy = ((cy % cells) + cells) % cells;
      const px = cx + hash2(wx, wy, seed);
      const py = cy + hash2(wx, wy, seed + 7919);
      const ddx = px - x;
      const ddy = py - y;
      const d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < best) best = d;
    }
  }
  return Math.min(1, best);
}

// ---------------------------------------------------------------------------
// layer helpers
// ---------------------------------------------------------------------------

function makeLayer(size: number): Layer {
  const n = size * size;
  return {
    size,
    r: new Float32Array(n),
    g: new Float32Array(n),
    b: new Float32Array(n),
    h: new Float32Array(n),
    rough: new Float32Array(n),
    metal: new Float32Array(n),
    ao: new Float32Array(n).fill(1),
  };
}

function resolvedSize(requested: number): number {
  const s = Math.round(requested * textureScale);
  // clamp to power of two between 64 and 2048
  let p = 64;
  while (p * 2 <= Math.min(2048, Math.max(64, s))) p *= 2;
  return p;
}

function canvasFrom(size: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { c, ctx };
}

function textureFromRGB(
  size: number,
  fill: (i: number, out: [number, number, number]) => void,
  colorSpace: THREE.ColorSpace,
  repeat: number,
): THREE.Texture {
  const { c, ctx } = canvasFrom(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const out: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < size * size; i++) {
    fill(i, out);
    d[i * 4 + 0] = Math.max(0, Math.min(255, out[0] * 255));
    d[i * 4 + 1] = Math.max(0, Math.min(255, out[1] * 255));
    d[i * 4 + 2] = Math.max(0, Math.min(255, out[2] * 255));
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = colorSpace;
  tex.anisotropy = anisotropyCap;
  tex.repeat.set(repeat, repeat);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Sobel height -> tangent space normal. */
function normalTexture(layer: Layer, strength: number, repeat: number): THREE.Texture {
  const s = layer.size;
  const h = layer.h;
  const at = (x: number, y: number) => h[(((y % s) + s) % s) * s + (((x % s) + s) % s)];
  return textureFromRGB(
    s,
    (i, out) => {
      const x = i % s;
      const y = (i / s) | 0;
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      out[0] = nx * 0.5 + 0.5;
      out[1] = ny * 0.5 + 0.5;
      out[2] = nz / len * 0.5 + 0.5;
    },
    THREE.NoColorSpace,
    repeat,
  );
}

export interface MaterialBakeOptions {
  /** Texel resolution before quality scaling. */
  size?: number;
  /** UV repeat baked into the texture object. */
  repeat?: number;
  /** Normal map strength multiplier. */
  normalStrength?: number;
  /** Emit an AO map. */
  ao?: boolean;
  /** Emit a metalness map (only when the family mixes metal and non-metal). */
  metal?: boolean;
}

function bake(key: string, layer: Layer, opts: Required<MaterialBakeOptions>): PbrMaps {
  const rep = opts.repeat;
  const maps: PbrMaps = {
    map: textureFromRGB(
      layer.size,
      (i, out) => {
        out[0] = layer.r[i];
        out[1] = layer.g[i];
        out[2] = layer.b[i];
      },
      THREE.SRGBColorSpace,
      rep,
    ),
    normalMap: normalTexture(layer, opts.normalStrength, rep),
    roughnessMap: textureFromRGB(
      layer.size,
      (i, out) => {
        const v = layer.rough[i];
        out[0] = v;
        out[1] = v;
        out[2] = v;
      },
      THREE.NoColorSpace,
      rep,
    ),
  };
  if (opts.ao) {
    maps.aoMap = textureFromRGB(
      layer.size,
      (i, out) => {
        const v = layer.ao[i];
        out[0] = v;
        out[1] = v;
        out[2] = v;
      },
      THREE.NoColorSpace,
      rep,
    );
  }
  if (opts.metal) {
    maps.metalnessMap = textureFromRGB(
      layer.size,
      (i, out) => {
        const v = layer.metal[i];
        out[0] = v;
        out[1] = v;
        out[2] = v;
      },
      THREE.NoColorSpace,
      rep,
    );
  }
  cache.set(key, maps);
  return maps;
}

type Painter = (layer: Layer) => void;

/** Paint + bake with caching. */
export function generate(key: string, painter: Painter, options: MaterialBakeOptions = {}): PbrMaps {
  const existing = cache.get(key);
  if (existing) return existing;
  const opts: Required<MaterialBakeOptions> = {
    size: options.size ?? 512,
    repeat: options.repeat ?? 1,
    normalStrength: options.normalStrength ?? 2,
    ao: options.ao ?? false,
    metal: options.metal ?? false,
  };
  const layer = makeLayer(resolvedSize(opts.size));
  painter(layer);
  return bake(key, layer, opts);
}

/** Iterate texels with normalised uv in [0,1). */
export function forEachTexel(
  layer: Layer,
  fn: (i: number, u: number, v: number, x: number, y: number) => void,
): void {
  const s = layer.size;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      fn(y * s + x, x / s, y / s, x, y);
    }
  }
}

export function setRGB(layer: Layer, i: number, r: number, g: number, b: number): void {
  layer.r[i] = r;
  layer.g[i] = g;
  layer.b[i] = b;
}

export function mulRGB(layer: Layer, i: number, k: number): void {
  layer.r[i] *= k;
  layer.g[i] *= k;
  layer.b[i] *= k;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
}

export { fbm as noiseFbm, ridge as noiseRidge, worley as noiseWorley, vnoise as noiseValue };

// ---------------------------------------------------------------------------
// Canvas-drawn textures (signage, screens, posters, decals)
// ---------------------------------------------------------------------------

/**
 * Draw an arbitrary texture with the 2D canvas API. Used for signage, UI-in-world screens,
 * posters and decals where vector drawing beats per-texel noise.
 */
export function drawTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { colorSpace?: THREE.ColorSpace; transparent?: boolean; repeat?: boolean } = {},
): THREE.Texture {
  const existing = canvasCache.get(key);
  if (existing) return existing;
  const w = Math.max(8, Math.round(width * Math.max(0.5, textureScale)));
  const h = Math.max(8, Math.round(height * Math.max(0.5, textureScale)));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  if (!opts.transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.save();
  ctx.scale(w / width, h / height);
  draw(ctx, width, height);
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
  tex.anisotropy = anisotropyCap;
  tex.wrapS = tex.wrapT = opts.repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
}

/** Shared type face stack. Kept in one place so typography stays consistent. */
export const FONT_STACK = {
  display: '"Barlow Condensed", "Oswald", "Arial Narrow", Impact, sans-serif',
  ui: '"Barlow", "Inter", "Helvetica Neue", Arial, sans-serif',
  mono: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
};
