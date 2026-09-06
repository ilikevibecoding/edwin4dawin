import * as THREE from 'three';

/**
 * Procedural, tileable ground-detail textures for the terrain shader (world/terrain.ts). Nothing is downloaded:
 * every channel is painted at start-up into a 1024^2 canvas (stamped shapes: grass blades, pebbles, shell
 * fragments, footprints) or computed as periodic lattice noise, then packed into two RGBA8 textures with
 * mipmaps, so the shader gets band-limited detail for the price of a texture tap instead of an octave of
 * procedural noise per pixel.
 *
 *  ground (nominal tile 3 m):
 *   R  grass: blade clumps and tufts, brighter tips over darker gaps (zero-mean around 0.5)
 *   G  bare-patch mask: 0 grass .. 1 worn soil, soft-edged blotches over ~25 % of the tile
 *   B  soil: grain, pebbles and small cracks (zero-mean around 0.5)
 *   A  footprints: height, 0.5 flat, trails of heel-and-toe depressions with pushed-up rims
 *  sand (nominal tile 2.5 m):
 *   R  sand albedo: grain, pale shell fragments and dark heavy-mineral specks (zero-mean around 0.5)
 *   G  sand height: wind ripples transverse to +u (asymmetric: long stoss slope, short lee face) with
 *      wandering crests, plus grain and shell bumps; 0..1 spans RIPPLE_HEIGHT metres at the nominal tile
 *   BA normal.xz of G at the nominal tile, encoded 0..1
 */
export interface GroundDetailTextures {
  ground: THREE.DataTexture;
  sand: THREE.DataTexture;
  /** per-channel means of `ground` / `sand`: what a tile averages to once it is far below a pixel */
  groundMean: THREE.Vector4;
  sandMean: THREE.Vector4;
}

export const DETAIL_SIZE = 1024;
/** metres the sand tile spans in the shader at the nominal scale; the baked normal assumes it */
export const SAND_TILE = 2.5;
/** crest-to-trough height (m) the sand height channel spans */
export const RIPPLE_HEIGHT = 0.014;
/** wind ripples across the sand tile (wavelength 2.5 m / 26 = 9.6 cm) */
const RIPPLES_PER_TILE = 26;

class Rng {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 1; }
  next(): number {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.s = x;
    return x / 4294967296;
  }
  range(a: number, b: number): number { return a + (b - a) * this.next(); }
  chance(p: number): boolean { return this.next() < p; }
}

const hash2 = (i: number, j: number, seed: number): number => {
  let h = (i * 374761393 + j * 668265263 + seed * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Periodic value noise over an N x N field: `cells` lattice cells across the field (the field tiles), fbm over
 *  `octaves` doublings, output roughly zero-mean around 0.5 with the given amplitude of the first octave. */
function periodicNoise(n: number, cells: number, octaves: number, seed: number, gain = 0.5): Float32Array {
  const out = new Float32Array(n * n).fill(0.5);
  let amp = 0.5;
  let c = cells;
  for (let o = 0; o < octaves; o++) {
    const lattice = new Float32Array((c + 1) * (c + 1));
    for (let j = 0; j <= c; j++) for (let i = 0; i <= c; i++) lattice[j * (c + 1) + i] = hash2(i % c, j % c, seed + o * 131) - 0.5;
    const scale = c / n;
    for (let y = 0; y < n; y++) {
      const fy = y * scale, jy = Math.floor(fy), ty = fy - jy, uy = ty * ty * (3 - 2 * ty);
      const row0 = jy * (c + 1), row1 = (jy + 1) * (c + 1);
      for (let x = 0; x < n; x++) {
        const fx = x * scale, jx = Math.floor(fx), tx = fx - jx, ux = tx * tx * (3 - 2 * tx);
        const a = lattice[row0 + jx], b = lattice[row0 + jx + 1], cc = lattice[row1 + jx], d = lattice[row1 + jx + 1];
        out[y * n + x] += amp * ((a + (b - a) * ux) * (1 - uy) + (cc + (d - cc) * ux) * uy);
      }
    }
    amp *= gain;
    c *= 2;
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A grayscale painting surface that wraps: every shape is drawn at the wrapped copies that intersect the canvas. */
class TileCanvas {
  readonly ctx: CanvasRenderingContext2D;
  constructor(readonly n: number, fill: number) {
    const canvas = document.createElement('canvas');
    canvas.width = n; canvas.height = n;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    const g = Math.round(fill * 255);
    ctx.fillStyle = `rgb(${g},${g},${g})`;
    ctx.fillRect(0, 0, n, n);
  }
  /** run `draw` at every wrapped offset that puts the shape (centre x,y, radius r) on the canvas */
  wrapped(x: number, y: number, r: number, draw: (x: number, y: number) => void): void {
    const n = this.n;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const px = x + ox * n, py = y + oy * n;
      if (px + r < 0 || px - r > n || py + r < 0 || py - r > n) continue;
      draw(px, py);
    }
  }
  gray(v: number, alpha = 1): string { const g = Math.round(clamp01(v) * 255); return `rgba(${g},${g},${g},${alpha})`; }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, v: number, alpha = 1): void {
    const ctx = this.ctx;
    ctx.fillStyle = this.gray(v, alpha);
    this.wrapped(x, y, Math.max(rx, ry), (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); });
  }
  stroke(x: number, y: number, len: number, rot: number, width: number, v: number, alpha = 1): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.gray(v, alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    const dx = Math.cos(rot) * len * 0.5, dy = Math.sin(rot) * len * 0.5;
    this.wrapped(x, y, len * 0.5 + width, (px, py) => { ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy); ctx.stroke(); });
  }
  /** the red channel as 0..1 */
  read(): Float32Array {
    const img = this.ctx.getImageData(0, 0, this.n, this.n).data;
    const out = new Float32Array(this.n * this.n);
    for (let i = 0; i < out.length; i++) out[i] = img[i * 4] / 255;
    return out;
  }
}

/** Canvas painting is unavailable (headless unit tests): flat channels keep the shader neutral. */
function canPaint(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

function grassChannel(n: number, rng: Rng): Float32Array {
  // clump structure: tufts 5-20 cm across (cells of 1/24 .. 1/96 of a 3 m tile) over a slow density field
  const clump = periodicNoise(n, 24, 3, 11, 0.55);
  const density = periodicNoise(n, 6, 2, 12, 0.5);
  const grain = periodicNoise(n, 256, 2, 13, 0.5);
  const tc = new TileCanvas(n, 0.5);
  // blades: short strokes, brighter (sunlit tips) or darker (shadowed gaps), thinner where the clump field is low
  const blades = 36000;
  for (let i = 0; i < blades; i++) {
    const x = rng.next() * n, y = rng.next() * n;
    const c = clump[(Math.floor(y) % n) * n + (Math.floor(x) % n)];
    const bright = rng.chance(0.5 + 0.35 * (c - 0.5));
    const len = rng.range(10, 34), rot = rng.range(0, Math.PI);
    tc.stroke(x, y, len, rot, rng.range(1.5, 3.2), bright ? rng.range(0.66, 0.9) : rng.range(0.14, 0.36), 0.55);
  }
  const strokes = tc.read();
  const out = new Float32Array(n * n);
  for (let i = 0; i < out.length; i++) {
    const c = clump[i] - 0.5, d = density[i] - 0.5, g = grain[i] - 0.5, s = strokes[i] - 0.5;
    out[i] = clamp01(0.5 + 0.9 * s + 0.55 * c + 0.35 * d + 0.25 * g);
  }
  return out;
}

function bareMaskChannel(n: number): Float32Array {
  // blotches 40 cm - 1.5 m across at the 3 m tile, soft edged; sharper worn cores inside the larger patches
  const a = periodicNoise(n, 3, 4, 21, 0.55);
  const b = periodicNoise(n, 12, 3, 22, 0.5);
  const out = new Float32Array(n * n);
  for (let i = 0; i < out.length; i++) {
    const v = a[i] + 0.35 * (b[i] - 0.5);
    const patch = smoothstep(0.56, 0.66, v);
    const thin = smoothstep(0.5, 0.6, v) * 0.45;
    out[i] = clamp01(Math.max(patch, thin));
  }
  return out;
}

function soilChannel(n: number, rng: Rng): Float32Array {
  const grain = periodicNoise(n, 128, 3, 31, 0.5);
  const lumps = periodicNoise(n, 16, 3, 32, 0.5);
  const tc = new TileCanvas(n, 0.5);
  // pebbles and grit: pale and dark ovals, mostly small
  for (let i = 0; i < 9000; i++) {
    const r = rng.range(1.2, 2.5) * (rng.chance(0.12) ? rng.range(2, 4.5) : 1);
    const pale = rng.chance(0.55);
    tc.ellipse(rng.next() * n, rng.next() * n, r, r * rng.range(0.6, 1), rng.range(0, Math.PI), pale ? rng.range(0.7, 0.92) : rng.range(0.1, 0.3), 0.85);
  }
  // shrinkage cracks: short dark polylines in a few places
  for (let i = 0; i < 260; i++) {
    let x = rng.next() * n, y = rng.next() * n, rot = rng.range(0, Math.PI * 2);
    for (let k = 0; k < 4; k++) {
      const len = rng.range(10, 26);
      tc.stroke(x + Math.cos(rot) * len * 0.5, y + Math.sin(rot) * len * 0.5, len, rot, 1.4, 0.18, 0.6);
      x += Math.cos(rot) * len; y += Math.sin(rot) * len; rot += rng.range(-0.7, 0.7);
    }
  }
  const stamps = tc.read();
  const out = new Float32Array(n * n);
  for (let i = 0; i < out.length; i++) out[i] = clamp01(0.5 + 0.7 * (grain[i] - 0.5) + 0.6 * (lumps[i] - 0.5) + 0.9 * (stamps[i] - 0.5));
  return out;
}

function footprintChannel(n: number, rng: Rng): Float32Array {
  // a 6 m tile in the shader: a 27 cm footprint is 46 px long. Trails of alternating steps, each print a heel
  // and a sole depression with a low rim of pushed sand; a few scattered lone prints and small debris bumps
  const tc = new TileCanvas(n, 0.5);
  const print = (x: number, y: number, rot: number, depth: number) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const along = (d: number) => [x + c * d, y + s * d] as const;
    // rim first, depressions over it
    tc.ellipse(x, y, 27, 12, rot, 0.5 + depth * 0.35, 0.8);
    const [hx, hy] = along(-13);
    tc.ellipse(hx, hy, 9, 8, rot, 0.5 - depth, 0.95);
    const [sx, sy] = along(8);
    tc.ellipse(sx, sy, 14, 9, rot, 0.5 - depth * 0.9, 0.95);
    const [tx, ty] = along(19);
    tc.ellipse(tx, ty, 6, 7, rot, 0.5 - depth * 0.7, 0.9);
  };
  const trails = 26;
  for (let t = 0; t < trails; t++) {
    let x = rng.next() * n, y = rng.next() * n, rot = rng.range(0, Math.PI * 2);
    const steps = Math.floor(rng.range(6, 18));
    const depth = rng.range(0.22, 0.42);
    for (let k = 0; k < steps; k++) {
      const side = (k & 1) === 0 ? 1 : -1;
      const px = x - Math.sin(rot) * side * 13, py = y + Math.cos(rot) * side * 13;
      print(px, py, rot + rng.range(-0.15, 0.15) + side * 0.12, depth * rng.range(0.8, 1.2));
      const stride = rng.range(105, 130);
      x += Math.cos(rot) * stride; y += Math.sin(rot) * stride;
      rot += rng.range(-0.22, 0.22);
    }
  }
  for (let i = 0; i < 40; i++) print(rng.next() * n, rng.next() * n, rng.range(0, Math.PI * 2), rng.range(0.15, 0.35));
  // small debris: shells, pebbles and twigs standing proud of the sand
  for (let i = 0; i < 300; i++) {
    const r = rng.range(2, 6);
    tc.ellipse(rng.next() * n, rng.next() * n, r, r * rng.range(0.5, 1), rng.range(0, Math.PI), 0.5 + rng.range(0.25, 0.45), 0.9);
  }
  return tc.read();
}

function sandAlbedoChannel(n: number, rng: Rng): Float32Array {
  const grain = periodicNoise(n, 256, 2, 41, 0.5);
  const patches = periodicNoise(n, 8, 3, 42, 0.5);
  const tc = new TileCanvas(n, 0.5);
  // shell fragments: pale ovals and crescents 0.7-3.5 cm; heavy-mineral specks: dark grains
  for (let i = 0; i < 2600; i++) {
    const r = rng.range(1.5, 7) * (rng.chance(0.06) ? rng.range(1.5, 2.2) : 1);
    const x = rng.next() * n, y = rng.next() * n, rot = rng.range(0, Math.PI);
    const v = rng.range(0.78, 0.96);
    if (rng.chance(0.35)) {
      // crescent: a pale oval with a sand-coloured oval bitten out of it
      tc.ellipse(x, y, r, r * rng.range(0.6, 0.9), rot, v, 0.95);
      tc.ellipse(x + Math.cos(rot + 1.2) * r * 0.5, y + Math.sin(rot + 1.2) * r * 0.5, r * 0.75, r * 0.55, rot, 0.5, 1);
    } else {
      tc.ellipse(x, y, r, r * rng.range(0.5, 0.9), rot, v, 0.95);
    }
  }
  for (let i = 0; i < 14000; i++) {
    const r = rng.range(0.8, 1.9);
    tc.ellipse(rng.next() * n, rng.next() * n, r, r * rng.range(0.6, 1), rng.range(0, Math.PI), rng.range(0.12, 0.3), 0.75);
  }
  const stamps = tc.read();
  const out = new Float32Array(n * n);
  for (let i = 0; i < out.length; i++) out[i] = clamp01(0.5 + 0.55 * (grain[i] - 0.5) + 0.4 * (patches[i] - 0.5) + 0.95 * (stamps[i] - 0.5));
  return out;
}

/** Wind-ripple height field, zero..one, periodic. Crests run along v (transverse to the +u wind axis), wander
 *  with a periodic phase noise and merge/split where the wander shears them. Profile: a long gentle stoss slope
 *  (2/3 of the wavelength) and a short steep lee face. */
function sandHeightChannel(n: number, footprints: Float32Array): Float32Array {
  const wander = periodicNoise(n, 4, 3, 51, 0.5);
  const grain = periodicNoise(n, 256, 2, 52, 0.5);
  const amp = periodicNoise(n, 5, 2, 53, 0.5);
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      // phase along u (x) with a wander of up to +-0.45 wavelengths from the periodic noise
      const ph = (x / n) * RIPPLES_PER_TILE + (wander[i] - 0.5) * 2.4;
      const f = ph - Math.floor(ph);
      // asymmetric profile: rise over 0.66 of the wavelength, fall over 0.34, both smoothed
      const prof = f < 0.66 ? smoothstep(0, 0.66, f) : 1 - smoothstep(0.66, 1.0, f);
      const a = 0.55 + 0.9 * (amp[i] - 0.5); // ripple height varies patch to patch
      let h = 0.12 + 0.72 * prof * Math.max(0.25, a) + 0.14 * (grain[i] - 0.5);
      // shells and debris (the footprint channel's raised bits) stand above the ripples
      const fp = footprints[i];
      if (fp > 0.55) h = Math.max(h, 0.55 + (fp - 0.55) * 1.4);
      out[i] = clamp01(h);
    }
  }
  return out;
}

/** Normal (x, z) of a periodic height field spanning `heightM` metres over a `tileM` metre tile. */
function normalXZ(n: number, h: Float32Array, tileM: number, heightM: number): [Float32Array, Float32Array] {
  const nx = new Float32Array(n * n), nz = new Float32Array(n * n);
  const texel = tileM / n;
  for (let y = 0; y < n; y++) {
    const y0 = ((y - 1 + n) % n) * n, y1 = ((y + 1) % n) * n, yr = y * n;
    for (let x = 0; x < n; x++) {
      const x0 = (x - 1 + n) % n, x1 = (x + 1) % n;
      const dhdx = ((h[yr + x1] - h[yr + x0]) * heightM) / (2 * texel);
      const dhdz = ((h[y1 + x] - h[y0 + x]) * heightM) / (2 * texel);
      const inv = 1 / Math.sqrt(dhdx * dhdx + dhdz * dhdz + 1);
      nx[yr + x] = -dhdx * inv;
      nz[yr + x] = -dhdz * inv;
    }
  }
  return [nx, nz];
}

function pack(n: number, r: Float32Array, g: Float32Array, b: Float32Array, a: Float32Array): THREE.DataTexture {
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    data[i * 4] = Math.round(clamp01(r[i]) * 255);
    data[i * 4 + 1] = Math.round(clamp01(g[i]) * 255);
    data[i * 4 + 2] = Math.round(clamp01(b[i]) * 255);
    data[i * 4 + 3] = Math.round(clamp01(a[i]) * 255);
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Build both detail textures. Deterministic (fixed seeds), ~0.3 s on the main thread. */
export function createGroundDetailTextures(renderer?: THREE.WebGLRenderer): GroundDetailTextures {
  const n = DETAIL_SIZE;
  const rng = new Rng(0x5eed1234);
  let grass: Float32Array, soil: Float32Array, foot: Float32Array, sandA: Float32Array;
  if (canPaint()) {
    grass = grassChannel(n, rng);
    soil = soilChannel(n, rng);
    foot = footprintChannel(n, rng);
    sandA = sandAlbedoChannel(n, rng);
  } else {
    grass = new Float32Array(n * n).fill(0.5);
    soil = grass; sandA = grass;
    foot = grass;
  }
  const bare = bareMaskChannel(n);
  const sandH = sandHeightChannel(n, foot);
  const [nx, nz] = normalXZ(n, sandH, SAND_TILE, RIPPLE_HEIGHT);
  const enc = (v: Float32Array) => { const o = new Float32Array(v.length); for (let i = 0; i < v.length; i++) o[i] = v[i] * 0.5 + 0.5; return o; };
  const ground = pack(n, grass, bare, soil, foot);
  const sand = pack(n, sandA, sandH, enc(nx), enc(nz));
  // 2x anisotropy: the ground is seen obliquely almost always, and every extra anisotropic sample multiplies
  // the fetch count of the four detail taps a land pixel takes; noise-like detail forgives the streak blur
  const aniso = renderer ? Math.min(2, renderer.capabilities.getMaxAnisotropy()) : 1;
  ground.anisotropy = aniso;
  sand.anisotropy = aniso;
  const mean = (v: Float32Array) => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i]; return s / v.length; };
  return {
    ground, sand,
    groundMean: new THREE.Vector4(mean(grass), mean(bare), mean(soil), mean(foot)),
    sandMean: new THREE.Vector4(mean(sandA), mean(sandH), 0.5, 0.5),
  };
}
