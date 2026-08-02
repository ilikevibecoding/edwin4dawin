/** Easing and timeline helpers. All pure. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));

/** Normalised, clamped progress of t through [a, b]. */
export const range = (t, a, b) => clamp((t - a) / (b - a || 1e-6));

export const smooth = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const smoother = (t) => {
  const x = clamp(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const inQuad = (t) => clamp(t) ** 2;
export const outQuad = (t) => 1 - (1 - clamp(t)) ** 2;
export const inOutQuad = (t) => (clamp(t) < 0.5 ? 2 * clamp(t) ** 2 : 1 - (-2 * clamp(t) + 2) ** 2 / 2);
export const inCubic = (t) => clamp(t) ** 3;
export const outCubic = (t) => 1 - (1 - clamp(t)) ** 3;
export const inOutCubic = (t) => (clamp(t) < 0.5 ? 4 * clamp(t) ** 3 : 1 - (-2 * clamp(t) + 2) ** 3 / 2);
export const outQuint = (t) => 1 - (1 - clamp(t)) ** 5;
export const inExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * clamp(t) - 10));
export const outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
export const outBack = (t) => {
  const c1 = 1.70158;
  const x = clamp(t);
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const outElastic = (t) => {
  const x = clamp(t);
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
export const outBounce = (t) => {
  let x = clamp(t);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

/** A pulse that rises over `up`, holds, then falls over `down`. */
export function pulse(t, start, up, hold, down) {
  if (t < start) return 0;
  if (t < start + up) return smooth((t - start) / up);
  if (t < start + up + hold) return 1;
  if (t < start + up + hold + down) return 1 - smooth((t - start - up - hold) / down);
  return 0;
}

/**
 * Piecewise keyframe interpolation.
 * keys: [[time, value], ...] sorted by time. Values may be numbers or arrays.
 */
export function track(keys, t, easeFn = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const u = easeFn((t - t0) / (t1 - t0 || 1e-6));
      if (Array.isArray(v0)) return v0.map((v, k) => v + (v1[k] - v) * u);
      return v0 + (v1 - v0) * u;
    }
  }
  return last[1];
}

/** Catmull-Rom through a list of [x,y,z] points, u in [0,1]. */
export function spline(points, u) {
  const n = points.length;
  if (n === 0) return [0, 0, 0];
  if (n === 1) return points[0].slice();
  const x = clamp(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(x));
  const f = x - i;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  const out = [];
  for (let k = 0; k < 3; k++) {
    const a = 2 * p1[k];
    const b = p2[k] - p0[k];
    const c = 2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k];
    const d = -p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k];
    out[k] = 0.5 * (a + b * f + c * f * f + d * f * f * f);
  }
  return out;
}
