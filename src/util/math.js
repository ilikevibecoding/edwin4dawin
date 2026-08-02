// Small math / animation helpers shared by every scene.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mix = lerp;

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Normalized progress through [a,b]; 0 before, 1 after.
export function range(x, a, b) {
  return clamp((x - a) / (b - a));
}

// A pulse that ramps up over `inT`, holds, then ramps down over `outT`.
export function envelope(t, start, dur, inT = 0.2, outT = 0.2) {
  const local = t - start;
  if (local <= 0 || local >= dur) return 0;
  const up = smoothstep(0, inT, local);
  const down = 1 - smoothstep(dur - outT, dur, local);
  return up * down;
}

// Framerate independent exponential approach.
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function wrap(v, min, max) {
  const d = max - min;
  return ((((v - min) % d) + d) % d) + min;
}

export function pingpong(v, len = 1) {
  const t = wrap(v, 0, len * 2);
  return t < len ? t : len * 2 - t;
}

// --- easing ---------------------------------------------------------------

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inQuart: (t) => t * t * t * t,
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  inQuint: (t) => t ** 5,
  outQuint: (t) => 1 - (1 - t) ** 5,
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * TAU) / 3) + 1,
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  // Very slow ease-in-out, good for capital ships that need to feel heavy.
  heavy: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};

// Interpolate over a keyframe list: [{ t, v }, ...] with optional per-key ease.
export function keys(list, time, easeDefault = Ease.inOutCubic, lerpFn = lerp) {
  if (time <= list[0].t) return list[0].v;
  const last = list[list.length - 1];
  if (time >= last.t) return last.v;
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (time >= a.t && time <= b.t) {
      const raw = (time - a.t) / Math.max(1e-6, b.t - a.t);
      const e = b.ease || a.easeOut || easeDefault;
      return lerpFn(a.v, b.v, e(raw));
    }
  }
  return last.v;
}

// Deterministic multi-octave shake value in [-1,1] (no RNG state needed).
export function shakeNoise(t, seed = 0) {
  return (
    Math.sin(t * 37.13 + seed * 12.9898) * 0.5 +
    Math.sin(t * 71.7 + seed * 78.233) * 0.3 +
    Math.sin(t * 143.3 + seed * 39.42) * 0.2
  );
}
