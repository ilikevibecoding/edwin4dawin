import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const saturate = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number) =>
  lerp(c, d, saturate(invLerp(a, b, v)));
export const smoothstep = (t: number) => {
  const x = saturate(t);
  return x * x * (3 - 2 * x);
};
export const smootherstep = (t: number) => {
  const x = saturate(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * Frame-rate independent exponential approach.
 * `smoothing` is the fraction of the remaining distance left after 1 second.
 */
export const damp = (current: number, target: number, smoothing: number, dt: number) =>
  lerp(current, target, 1 - Math.pow(smoothing, dt));

export const dampVec3 = (
  current: THREE.Vector3,
  target: THREE.Vector3,
  smoothing: number,
  dt: number
) => {
  const t = 1 - Math.pow(smoothing, dt);
  current.lerp(target, t);
  return current;
};

export const dampAngle = (current: number, target: number, smoothing: number, dt: number) => {
  let delta = ((target - current + Math.PI) % TAU) - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return current + delta * (1 - Math.pow(smoothing, dt));
};

/** Critically-damped spring — the workhorse for weapon sway and camera recoil. */
export class Spring {
  value = 0;
  velocity = 0;
  target = 0;
  constructor(
    public stiffness = 120,
    public damping = 18
  ) {}

  step(dt: number): number {
    // Sub-step for stability under large dt (tab restore, hitching).
    const steps = Math.min(8, Math.max(1, Math.ceil(dt / (1 / 120))));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  impulse(v: number) {
    this.velocity += v;
  }

  reset(v = 0) {
    this.value = this.target = v;
    this.velocity = 0;
  }
}

export class Spring3 {
  value = new THREE.Vector3();
  velocity = new THREE.Vector3();
  target = new THREE.Vector3();
  private _a = new THREE.Vector3();

  constructor(
    public stiffness = 120,
    public damping = 18
  ) {}

  step(dt: number): THREE.Vector3 {
    const steps = Math.min(8, Math.max(1, Math.ceil(dt / (1 / 120))));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this._a
        .copy(this.target)
        .sub(this.value)
        .multiplyScalar(this.stiffness)
        .addScaledVector(this.velocity, -this.damping);
      this.velocity.addScaledVector(this._a, h);
      this.value.addScaledVector(this.velocity, h);
    }
    return this.value;
  }

  impulse(x: number, y: number, z: number) {
    this.velocity.x += x;
    this.velocity.y += y;
    this.velocity.z += z;
  }

  reset() {
    this.value.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.target.set(0, 0, 0);
  }
}

/** Deterministic PRNG (mulberry32) — reproducible level/texture generation. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(rng, {
    range: (lo: number, hi: number) => lo + rng() * (hi - lo),
    int: (lo: number, hi: number) => Math.floor(lo + rng() * (hi - lo + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)],
    chance: (p: number) => rng() < p,
    sign: () => (rng() < 0.5 ? -1 : 1),
    /** Box-Muller gaussian. */
    gauss: (mean = 0, sd = 1) => {
      const u = Math.max(1e-9, rng());
      const v = rng();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    },
  });
}

export type Rng = ReturnType<typeof makeRng>;

/** Uniform point on a unit sphere. */
export function randomDirection(out: THREE.Vector3, rng: () => number = Math.random) {
  const z = rng() * 2 - 1;
  const t = rng() * TAU;
  const r = Math.sqrt(1 - z * z);
  return out.set(r * Math.cos(t), r * Math.sin(t), z);
}

/** Uniform point in a disc — used for bullet spread cones and particle emitters. */
export function randomInCircle(rng: () => number = Math.random): [number, number] {
  const t = rng() * TAU;
  const r = Math.sqrt(rng());
  return [Math.cos(t) * r, Math.sin(t) * r];
}

export const expImpulse = (x: number, k: number) => {
  const h = k * x;
  return h * Math.exp(1 - h);
};

/** Rises fast, decays slow — explosion flash and muzzle flash intensity. */
export const flashCurve = (t: number, rise = 0.02, fall = 0.16) =>
  t < rise ? t / rise : Math.max(0, Math.exp(-(t - rise) / fall));

export function movingAverage(size: number) {
  const buf = new Float64Array(size);
  let i = 0;
  let n = 0;
  let sum = 0;
  return {
    push(v: number) {
      sum -= buf[i];
      buf[i] = v;
      sum += v;
      i = (i + 1) % size;
      if (n < size) n++;
      return sum / n;
    },
    get value() {
      return n ? sum / n : 0;
    },
  };
}
