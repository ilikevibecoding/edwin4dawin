import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smoothstep = THREE.MathUtils.smoothstep;
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

/** 0..1 ramp between two absolute times. */
export function ramp(t, t0, t1) {
  if (t1 <= t0) return t >= t1 ? 1 : 0;
  return clamp((t - t0) / (t1 - t0), 0, 1);
}

/** Trapezoid envelope: 0 -> 1 over `inDur`, hold, 1 -> 0 over `outDur`. */
export function env(t, t0, t1, inDur = 0.5, outDur = 0.5) {
  return Math.min(ramp(t, t0, t0 + inDur), 1 - ramp(t, t1 - outDur, t1));
}

export const ease = {
  linear: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  outElastic: (x) => (x === 0 || x === 1 ? x
    : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: (x) => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  },
  smooth: (x) => x * x * (3 - 2 * x),
  smoother: (x) => x * x * x * (x * (x * 6 - 15) + 10),
};

/** Value noise, deterministic, good enough for shake and flicker. */
export function noise1(x) {
  const i = Math.floor(x), f = x - i;
  const h = (n) => {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

export function dispose(obj) {
  obj.traverse?.((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        for (const k of Object.keys(m)) {
          const v = m[k];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    }
  });
}

export function v3(x = 0, y = 0, z = 0) { return new THREE.Vector3(x, y, z); }

/** Catmull-Rom through points, for camera paths and flight lines. */
export function path(points, closed = false) {
  return new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed, 'catmullrom', 0.5);
}
