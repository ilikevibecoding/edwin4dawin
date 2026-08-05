/** Deterministic math helpers: seeded RNG, easing, value/simplex noise, fbm. */

export const TAU = Math.PI * 2;

export function clamp(v: number, a = 0, b = 1): number {
  return v < a ? a : v > b ? b : v;
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function invLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : clamp((v - a) / (b - a));
}
export function smoothstep(a: number, b: number, v: number): number {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
}
export function smootherstep(a: number, b: number, v: number): number {
  const t = invLerp(a, b, v);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
/** Frame-rate independent exponential approach. */
export function damp(cur: number, target: number, lambda: number, dt: number): number {
  return lerp(cur, target, 1 - Math.exp(-lambda * dt));
}
export function gauss(x: number, sigma: number): number {
  return Math.exp(-(x * x) / (2 * sigma * sigma));
}

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};
export type EaseName = keyof typeof ease;

/** Mulberry32 — small, fast, deterministic. */
export class Rng {
  private s: number;
  constructor(seed = 1337) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** Box–Muller normal. */
  normal(mu = 0, sigma = 1): number {
    const u = Math.max(1e-9, this.next());
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * this.next());
  }
}

/* ---------------------------------------------------------------- noise */

const P = new Uint8Array(512);
{
  const rng = new Rng(9871);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = rng.int(0, i);
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function grad3(h: number, x: number, y: number, z: number): number {
  switch (h & 15) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x + z;
    case 5: return -x + z;
    case 6: return x - z;
    case 7: return -x - z;
    case 8: return y + z;
    case 9: return -y + z;
    case 10: return y - z;
    case 11: return -y - z;
    case 12: return y + x;
    case 13: return -y + z;
    case 14: return y - x;
    default: return -y - z;
  }
}

/** Classic Perlin noise, range ~[-1,1]. */
export function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z;
  const B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(
    lerp(
      lerp(grad3(P[AA], x, y, z), grad3(P[BA], x - 1, y, z), u),
      lerp(grad3(P[AB], x, y - 1, z), grad3(P[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad3(P[AA + 1], x, y, z - 1), grad3(P[BA + 1], x - 1, y, z - 1), u),
      lerp(grad3(P[AB + 1], x, y - 1, z - 1), grad3(P[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}
export function noise2(x: number, y: number): number {
  return noise3(x, y, 0.371);
}

export function fbm2(x: number, y: number, octaves = 5, lac = 2.03, gain = 0.5): number {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += a * noise2(x * f, y * f);
    norm += a;
    a *= gain;
    f *= lac;
  }
  return sum / norm;
}
export function fbm3(x: number, y: number, z: number, octaves = 4): number {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += a * noise3(x * f, y * f, z * f);
    norm += a;
    a *= 0.5;
    f *= 2.02;
  }
  return sum / norm;
}
/** Ridged multifractal — good for cracks, veins, worn metal. */
export function ridge2(x: number, y: number, octaves = 4): number {
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += a * (1 - Math.abs(noise2(x * f, y * f)));
    norm += a;
    a *= 0.5;
    f *= 2.07;
  }
  return sum / norm;
}
/** Worley/cellular F1 distance in [0,1]; tiles on `period`. */
export function worley2(x: number, y: number, period = 8): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let best = 1e9;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy;
      const wx = ((cx % period) + period) % period;
      const wy = ((cy % period) + period) % period;
      const h = P[(P[wx & 255] + wy) & 255];
      const px = cx + (h & 15) / 15;
      const py = cy + ((h >> 4) & 15) / 15;
      const d = Math.hypot(px - x, py - y);
      if (d < best) best = d;
    }
  }
  return Math.min(1, best);
}
