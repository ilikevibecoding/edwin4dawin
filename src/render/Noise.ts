/**
 * CPU noise primitives for procedural texture synthesis.
 *
 * All generators are seeded and deterministic so a given material always bakes
 * to identical bytes — important for both visual regression captures and for
 * caching maps across reloads.
 */

export class RNG {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    this.s ^= this.s << 13;
    this.s ^= this.s >>> 17;
    this.s ^= this.s << 5;
    this.s >>>= 0;
    return this.s / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }
}

const PERM_SIZE = 512;

function buildPermutation(seed: number): Uint8Array {
  const rng = new RNG(seed);
  const p = new Uint8Array(PERM_SIZE);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const t = base[i];
    base[i] = base[j];
    base[j] = t;
  }
  for (let i = 0; i < PERM_SIZE; i++) p[i] = base[i & 255];
  return p;
}

const permCache = new Map<number, Uint8Array>();
function perm(seed: number): Uint8Array {
  let p = permCache.get(seed);
  if (!p) {
    p = buildPermutation(seed);
    permCache.set(seed, p);
  }
  return p;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad2(hash: number, x: number, y: number): number {
  switch (hash & 7) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x;
    case 5: return -x;
    case 6: return y;
    default: return -y;
  }
}

/** Tileable 2D Perlin noise with an integer period. */
export function perlin2(x: number, y: number, period: number, seed = 1): number {
  const p = perm(seed);
  const wrap = (v: number) => ((v % period) + period) % period;

  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const x0 = wrap(xi);
  const y0 = wrap(yi);
  const x1 = wrap(xi + 1);
  const y1 = wrap(yi + 1);

  const u = fade(xf);
  const v = fade(yf);

  const aa = p[(p[x0 & 255] + y0) & 255];
  const ab = p[(p[x0 & 255] + y1) & 255];
  const ba = p[(p[x1 & 255] + y0) & 255];
  const bb = p[(p[x1 & 255] + y1) & 255];

  const n00 = grad2(aa, xf, yf);
  const n10 = grad2(ba, xf - 1, yf);
  const n01 = grad2(ab, xf, yf - 1);
  const n11 = grad2(bb, xf - 1, yf - 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return (nx0 + v * (nx1 - nx0)) * 0.7071;
}

export interface FBMOptions {
  octaves?: number;
  lacunarity?: number;
  gain?: number;
  ridged?: boolean;
  turbulence?: boolean;
}

/** Tileable fractal Brownian motion built from `perlin2`. */
export function fbm2(
  x: number,
  y: number,
  period: number,
  seed = 1,
  opts: FBMOptions = {},
): number {
  const octaves = opts.octaves ?? 5;
  const lacunarity = opts.lacunarity ?? 2;
  const gain = opts.gain ?? 0.5;

  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    let n = perlin2(x * freq, y * freq, Math.max(1, Math.round(period * freq)), seed + i * 131);
    if (opts.ridged) n = 1 - Math.abs(n) * 2;
    else if (opts.turbulence) n = Math.abs(n) * 2 - 1;
    sum += n * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / Math.max(norm, 1e-6);
}

/**
 * Tileable Worley / cellular noise.
 * Returns `[F1, F2, cellId]` — F2-F1 gives clean crack and grout patterns,
 * cellId lets each cell be tinted independently (bricks, tiles, pebbles).
 */
export function worley2(
  x: number,
  y: number,
  period: number,
  seed = 1,
  jitter = 1,
): [number, number, number] {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = Infinity;
  let f2 = Infinity;
  let id = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const wx = ((cx % period) + period) % period;
      const wy = ((cy % period) + period) % period;
      const h = (wx * 73856093) ^ (wy * 19349663) ^ (seed * 83492791);
      const r1 = ((h >>> 0) % 4096) / 4096;
      const r2 = (((h * 2654435761) >>> 0) % 4096) / 4096;
      const px = cx + 0.5 + (r1 - 0.5) * jitter;
      const py = cy + 0.5 + (r2 - 0.5) * jitter;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = (h >>> 0) % 1000;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return [f1, f2, id];
}

/** Smooth, monotonic remap helper. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(edge1 - edge0, 1e-6)));
  return t * t * (3 - 2 * t);
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Derives a tangent-space normal map from a height field using Sobel
 * gradients. Working from a height field (rather than authoring normals
 * directly) guarantees the normal map is integrable, so it never produces the
 * impossible lighting that gives away hand-faked detail.
 */
export function heightToNormal(
  height: Float32Array,
  width: number,
  h: number,
  strength: number,
  out: Uint8ClampedArray,
): void {
  const at = (x: number, y: number): number => {
    const xi = ((x % width) + width) % width;
    const yi = ((y % h) + h) % h;
    return height[yi * width + xi];
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      const nzn = nz / len;

      const i = (y * width + x) * 4;
      out[i] = (nx * 0.5 + 0.5) * 255;
      out[i + 1] = (ny * 0.5 + 0.5) * 255;
      out[i + 2] = (nzn * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
}

/**
 * Cheap screen-space-free ambient occlusion baked from a height field.
 * Samples a ring of neighbours and darkens where the surroundings rise above
 * the current texel — enough to seat mortar lines and panel gaps.
 */
export function heightToAO(
  height: Float32Array,
  width: number,
  h: number,
  radius: number,
  strength: number,
  out: Float32Array,
): void {
  const at = (x: number, y: number): number => {
    const xi = ((x % width) + width) % width;
    const yi = ((y % h) + h) % h;
    return height[yi * width + xi];
  };

  const dirs = 8;
  const steps = 3;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      const center = at(x, y);
      let occ = 0;
      for (let d = 0; d < dirs; d++) {
        const ang = (d / dirs) * Math.PI * 2;
        const dx = Math.cos(ang);
        const dy = Math.sin(ang);
        let maxSlope = 0;
        for (let s = 1; s <= steps; s++) {
          const dist = (s / steps) * radius;
          const sample = at(Math.round(x + dx * dist), Math.round(y + dy * dist));
          maxSlope = Math.max(maxSlope, (sample - center) / Math.max(dist, 1));
        }
        occ += Math.max(0, maxSlope);
      }
      occ /= dirs;
      out[y * width + x] = clamp01(1 - occ * strength);
    }
  }
}

/** Box-blurs a scalar field in place (separable, wrapping). */
export function blurField(field: Float32Array, width: number, h: number, radius: number): void {
  if (radius < 1) return;
  const tmp = new Float32Array(field.length);
  const r = Math.round(radius);
  const inv = 1 / (r * 2 + 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const xi = ((x + k) % width + width) % width;
        sum += field[y * width + xi];
      }
      tmp[y * width + x] = sum * inv;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const yi = ((y + k) % h + h) % h;
        sum += tmp[yi * width + x];
      }
      field[y * width + x] = sum * inv;
    }
  }
}
