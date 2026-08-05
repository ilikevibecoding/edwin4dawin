/** Small math helpers shared across the sim. */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smootherstep = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const remap = (v, a, b, c, d) => lerp(c, d, clamp01(invLerp(a, b, v)));
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Frame-rate independent exponential approach. `rate` = 1/e time constant. */
export const damp = (current, target, rate, dt) =>
  target + (current - target) * Math.exp(-rate * dt);

/** Shortest signed angular difference in radians. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Fictionalised atmosphere density curve, normalised to 1.0 at sea level. */
export function airDensity(altitude) {
  // Exponential-ish falloff with a 7.2 km scale height. Purely for visuals:
  // trails thin out with altitude and drag drops off.
  return Math.exp(-Math.max(0, altitude) / 7200);
}

/** Format a range in metres as a compact readout string. */
export function fmtRange(m) {
  if (m >= 10000) return (m / 1000).toFixed(0) + 'KM';
  if (m >= 1000) return (m / 1000).toFixed(1) + 'KM';
  return Math.round(m) + 'M';
}

export function fmtAlt(m) {
  if (m >= 1000) return (m / 1000).toFixed(1) + 'KM';
  return Math.round(m) + 'M';
}

export function pad2(n) { return n < 10 ? '0' + n : '' + n; }

export function fmtClock(seconds) {
  const s = Math.max(0, seconds);
  return pad2(Math.floor(s / 60)) + ':' + (s % 60).toFixed(1).padStart(4, '0');
}
