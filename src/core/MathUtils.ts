import * as THREE from 'three';

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const saturate = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, v: number): number =>
  a === b ? 0 : (v - a) / (b - a);

export const remap = (v: number, a1: number, b1: number, a2: number, b2: number): number =>
  lerp(a2, b2, saturate(inverseLerp(a1, b1, v)));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const smootherstep = (edge0: number, edge1: number, x: number): number => {
  const t = saturate((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * Framerate-independent exponential smoothing.
 * `rate` is roughly "how much of the gap is closed per second" in log space.
 */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  target + (current - target) * Math.exp(-rate * dt);

export const dampVec3 = (
  out: THREE.Vector3,
  target: THREE.Vector3,
  rate: number,
  dt: number,
): THREE.Vector3 => {
  const f = Math.exp(-rate * dt);
  out.x = target.x + (out.x - target.x) * f;
  out.y = target.y + (out.y - target.y) * f;
  out.z = target.z + (out.z - target.z) * f;
  return out;
};

export const dampQuat = (
  out: THREE.Quaternion,
  target: THREE.Quaternion,
  rate: number,
  dt: number,
): THREE.Quaternion => out.slerp(target, 1 - Math.exp(-rate * dt));

/** Spring-damper integration; returns the new velocity and mutates nothing. */
export const springStep = (
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): [value: number, velocity: number] => {
  const accel = (target - value) * stiffness - velocity * damping;
  const v = velocity + accel * dt;
  return [value + v * dt, v];
};

export const moveTowards = (current: number, target: number, maxDelta: number): number => {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
};

/** Shortest signed angular difference in radians. */
export const angleDelta = (from: number, to: number): number => {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

// ---------------------------------------------------------------------------
// Deterministic random
// ---------------------------------------------------------------------------

/** Mulberry32 — small, fast, good-enough statistical quality, fully seedable. */
export class Rng {
  private state: number;

  constructor(seed = 0x9e3779b9) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }

  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))];
  }

  /** Box-Muller normal distribution. */
  gaussian(mean = 0, stdDev = 1): number {
    const u = Math.max(1e-7, this.next());
    const v = this.next();
    return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }

  onUnitSphere(out = new THREE.Vector3()): THREE.Vector3 {
    const z = this.range(-1, 1);
    const a = this.range(0, TAU);
    const r = Math.sqrt(1 - z * z);
    return out.set(r * Math.cos(a), r * Math.sin(a), z);
  }

  insideCone(dir: THREE.Vector3, angleRad: number, out = new THREE.Vector3()): THREE.Vector3 {
    const cosA = Math.cos(angleRad);
    const z = this.range(cosA, 1);
    const phi = this.range(0, TAU);
    const s = Math.sqrt(1 - z * z);
    out.set(s * Math.cos(phi), s * Math.sin(phi), z);
    const q = new THREE.Quaternion().setFromUnitVectors(UNIT_Z, dir);
    return out.applyQuaternion(q);
  }
}

const UNIT_Z = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);

/** Shared global RNG for cosmetic (non-deterministic-critical) randomness. */
export const rng = new Rng((Math.random() * 0xffffffff) >>> 0);

// ---------------------------------------------------------------------------
// Value / gradient noise (CPU side, used by the procedural texture pipeline)
// ---------------------------------------------------------------------------

const PERM = /* @__PURE__ */ (() => {
  const p = new Uint8Array(512);
  const r = new Rng(1337);
  const src = new Uint8Array(256);
  for (let i = 0; i < 256; i++) src[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = r.int(0, i);
    const t = src[i];
    src[i] = src[j];
    src[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = src[i & 255];
  return p;
})();

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

const grad3 = (hash: number, x: number, y: number, z: number): number => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

/** Classic Perlin noise in [-1, 1]. */
export function perlin3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  return lerp(
    lerp(
      lerp(grad3(PERM[AA], x, y, z), grad3(PERM[BA], x - 1, y, z), u),
      lerp(grad3(PERM[AB], x, y - 1, z), grad3(PERM[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad3(PERM[AA + 1], x, y, z - 1), grad3(PERM[BA + 1], x - 1, y, z - 1), u),
      lerp(grad3(PERM[AB + 1], x, y - 1, z - 1), grad3(PERM[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}

export function perlin2(x: number, y: number): number {
  return perlin3(x, y, 0.5);
}

/** Fractal Brownian motion built on Perlin noise. Returns roughly [-1, 1]. */
export function fbm2(
  x: number,
  y: number,
  octaves = 5,
  lacunarity = 2.0,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2(x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal — great for rock, rust streaks and cracked concrete. */
export function ridged2(x: number, y: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(perlin2(x * freq, y * freq));
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Tileable fbm by blending four shifted copies. */
export function fbmTileable(
  x: number,
  y: number,
  period: number,
  octaves = 5,
): number {
  const fx = x / period;
  const fy = y / period;
  const a = fbm2(x, y, octaves);
  const b = fbm2(x - period, y, octaves);
  const c = fbm2(x, y - period, octaves);
  const d = fbm2(x - period, y - period, octaves);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

/** Worley / cellular noise. Returns F1 distance normalised to ~[0,1]. */
export function worley2(x: number, y: number, cells = 1): number {
  const px = x * cells;
  const py = y * cells;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  let best = Infinity;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = ix + ox;
      const cy = iy + oy;
      const h = hash2(cx, cy);
      const fx = cx + (h & 0xffff) / 65535;
      const fy = cy + ((h >>> 16) & 0xffff) / 65535;
      const dx = fx - px;
      const dy = fy - py;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
  }
  return Math.min(1, Math.sqrt(best));
}

export function hash2(x: number, y: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return h >>> 0;
}

export function hash1(x: number): number {
  let h = Math.imul(x, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Curves & easing
// ---------------------------------------------------------------------------

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number): number => t * t * t;
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// ---------------------------------------------------------------------------
// Reusable scratch objects — avoids per-frame allocation in hot paths.
// Never hold a reference to these across a function boundary.
// ---------------------------------------------------------------------------
export const scratch = {
  v3a: /* @__PURE__ */ new THREE.Vector3(),
  v3b: /* @__PURE__ */ new THREE.Vector3(),
  v3c: /* @__PURE__ */ new THREE.Vector3(),
  v3d: /* @__PURE__ */ new THREE.Vector3(),
  v2a: /* @__PURE__ */ new THREE.Vector2(),
  v2b: /* @__PURE__ */ new THREE.Vector2(),
  qa: /* @__PURE__ */ new THREE.Quaternion(),
  qb: /* @__PURE__ */ new THREE.Quaternion(),
  m4a: /* @__PURE__ */ new THREE.Matrix4(),
  m4b: /* @__PURE__ */ new THREE.Matrix4(),
  ea: /* @__PURE__ */ new THREE.Euler(),
  colA: /* @__PURE__ */ new THREE.Color(),
  colB: /* @__PURE__ */ new THREE.Color(),
};
