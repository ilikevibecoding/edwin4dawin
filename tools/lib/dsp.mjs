/**
 * Signal-processing primitives for the procedural audio pipeline.
 *
 * Deliberately dependency-free: oscillators, filters, envelopes, delay lines and
 * a Schroeder/Moorer reverb, all operating on Float32Array at `SR`.
 *
 * Conventions
 *   - a "buffer" is a Float32Array of mono samples
 *   - a "stereo" is `{ L, R }` of two equal-length Float32Arrays
 *   - filters update their coefficients at control rate (`CTRL` samples) so that
 *     per-sample modulation stays cheap; audio-rate coefficient churn is not
 *     audible for the cutoff sweeps used here.
 */

export const SR = 48000;
export const CTRL = 32;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- buffers

export const buf = (n) => new Float32Array(Math.max(0, Math.round(n)));
export const bufSec = (sec) => buf(sec * SR);
export const stereo = (n) => ({ L: buf(n), R: buf(n) });
export const stereoSec = (sec) => stereo(sec * SR);

/** Deterministic xorshift PRNG so builds are byte-reproducible. */
export function rng(seed = 0x2f6e2b1) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5; s |= 0;
    return (s >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- maths

export const db = (x) => Math.pow(10, x / 20);
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const semis = (n) => Math.pow(2, n / 12);
/** Exponential glide between two frequencies, t in [0,1]. */
export const glide = (f0, f1, t) => f0 * Math.pow(f1 / f0, t);
export const softclip = (x, drive = 1) => Math.tanh(x * drive);

/** Equal-power pan, -1 = hard left, +1 = hard right. */
export function panGains(p) {
  const a = (clamp(p, -1, 1) + 1) * (Math.PI / 4);
  return [Math.cos(a), Math.sin(a)];
}

// ---------------------------------------------------------------- oscillators

/** PolyBLEP residual for band-limited saw/square edges. */
function blep(t, dt) {
  if (t < dt) { const x = t / dt; return x + x - x * x - 1; }
  if (t > 1 - dt) { const x = (t - 1) / dt; return x * x + x + x + 1; }
  return 0;
}

/**
 * Phase-accumulating oscillator. `freqAt(i)` may be called at control rate.
 * Shapes: sine, saw, square, tri, pulse (with `width`).
 */
export class Osc {
  constructor(shape = 'sine', phase = 0, width = 0.5) {
    this.shape = shape;
    this.p = phase % 1;
    this.width = width;
  }
  next(freq) {
    const dt = freq / SR;
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    else if (this.p < 0) this.p += 1;
    const p = this.p;
    switch (this.shape) {
      case 'sine': return Math.sin(TAU * p);
      case 'saw': return 2 * p - 1 - blep(p, dt);
      case 'tri': return 1 - 4 * Math.abs(p - 0.5);
      case 'square':
      case 'pulse': {
        const w = this.width;
        let v = p < w ? 1 : -1;
        v -= blep(p, dt);
        let p2 = p - w; if (p2 < 0) p2 += 1;
        v += blep(p2, dt);
        return v;
      }
      default: return Math.sin(TAU * p);
    }
  }
}

// ---------------------------------------------------------------- filters

/**
 * Topology-preserving state-variable filter. `lp`/`bp`/`hp` after `run()`.
 * Coefficients are recomputed only when `set()` is called.
 */
export class SVF {
  constructor() { this.z1 = 0; this.z2 = 0; this.set(1000, 0.7); }
  set(fc, q = 0.7) {
    const f = clamp(fc, 8, SR * 0.47);
    const g = Math.tan(Math.PI * f / SR);
    const k = 1 / Math.max(0.02, q);
    this.g = g; this.k = k;
    this.a1 = 1 / (1 + g * (g + k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  run(v0) {
    const v3 = v0 - this.z2;
    const v1 = this.a1 * this.z1 + this.a2 * v3;
    const v2 = this.z2 + this.a2 * this.z1 + this.a3 * v3;
    this.z1 = 2 * v1 - this.z1;
    this.z2 = 2 * v2 - this.z2;
    this.lp = v2; this.bp = v1; this.hp = v0 - this.k * v1 - v2;
    return v2;
  }
  lpf(v) { this.run(v); return this.lp; }
  bpf(v) { this.run(v); return this.bp * this.k; } // unity-ish at centre
  hpf(v) { this.run(v); return this.hp; }
}

/** Cascaded SVF for a steeper skirt; resonance lands on the last stage only. */
export class Ladder {
  constructor(stages = 2) { this.s = Array.from({ length: stages }, () => new SVF()); }
  set(fc, q = 0.7) {
    for (let i = 0; i < this.s.length; i++) this.s[i].set(fc, i === this.s.length - 1 ? q : 0.707);
  }
  lpf(v) { let x = v; for (const f of this.s) x = f.lpf(x); return x; }
  bpf(v) { let x = v; for (const f of this.s) x = f.bpf(x); return x; }
  hpf(v) { let x = v; for (const f of this.s) x = f.hpf(x); return x; }
}

/** Static RBJ biquad, for fixed EQ curves. */
export class Biquad {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.b0 = 1; this.b1 = this.b2 = this.a1 = this.a2 = 0; }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
  #norm(b0, b1, b2, a0, a1, a2) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  peaking(f0, q, gainDb) {
    const A = Math.pow(10, gainDb / 40);
    const w = TAU * f0 / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    return this.#norm(1 + al * A, -2 * cw, 1 - al * A, 1 + al / A, -2 * cw, 1 - al / A);
  }
  lowShelf(f0, gainDb, s = 0.9) {
    const A = Math.pow(10, gainDb / 40);
    const w = TAU * f0 / SR, cw = Math.cos(w), sw = Math.sin(w);
    const al = sw / 2 * Math.sqrt((A + 1 / A) * (1 / s - 1) + 2);
    const ta = 2 * Math.sqrt(A) * al;
    return this.#norm(
      A * ((A + 1) - (A - 1) * cw + ta), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - ta),
      (A + 1) + (A - 1) * cw + ta, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - ta);
  }
  highShelf(f0, gainDb, s = 0.9) {
    const A = Math.pow(10, gainDb / 40);
    const w = TAU * f0 / SR, cw = Math.cos(w), sw = Math.sin(w);
    const al = sw / 2 * Math.sqrt((A + 1 / A) * (1 / s - 1) + 2);
    const ta = 2 * Math.sqrt(A) * al;
    return this.#norm(
      A * ((A + 1) + (A - 1) * cw + ta), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - ta),
      (A + 1) - (A - 1) * cw + ta, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - ta);
  }
  highpass(f0, q = 0.707) {
    const w = TAU * f0 / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    return this.#norm((1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al);
  }
  lowpass(f0, q = 0.707) {
    const w = TAU * f0 / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q);
    return this.#norm((1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al);
  }
}

/** Applies a chain of Biquad-configuring callbacks over a mono buffer in place. */
export function eqBuffer(b, makers) {
  const fs = makers.map((m) => m(new Biquad()));
  for (let i = 0; i < b.length; i++) {
    let v = b[i];
    for (const f of fs) v = f.run(v);
    b[i] = v;
  }
  return b;
}

/** One-pole smoother, for de-zippering control signals. */
export class Smooth {
  constructor(ms = 5, init = 0) { this.a = Math.exp(-1 / (SR * ms / 1000)); this.y = init; }
  run(x) { this.y = x + this.a * (this.y - x); return this.y; }
}

// ---------------------------------------------------------------- noise

/** White noise from a seeded generator. */
export function whiteNoise(n, r = rng()) {
  const b = buf(n);
  for (let i = 0; i < b.length; i++) b[i] = r() * 2 - 1;
  return b;
}

/** Pink-ish noise (Paul Kellet's economy filter), roughly -3 dB/octave. */
export function pinkNoise(n, r = rng()) {
  const b = buf(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < b.length; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16;
    b6 = w * 0.115926;
  }
  return b;
}

/** Brown noise (-6 dB/octave), leaky-integrated white. */
export function brownNoise(n, r = rng()) {
  const b = buf(n);
  let y = 0;
  for (let i = 0; i < b.length; i++) {
    y = (y + (r() * 2 - 1) * 0.06) * 0.998;
    b[i] = clamp(y * 3.2, -1, 1);
  }
  return b;
}

// ---------------------------------------------------------------- envelopes

/**
 * ADSR sampled at index `i` of a note `len` samples long (release runs past `len`).
 * Times in seconds; `curve` > 1 makes the decay/release more exponential.
 */
export function adsr(i, len, { a = 0.01, d = 0.1, s = 0.7, r = 0.2, curve = 2.2 } = {}) {
  const A = a * SR, D = d * SR, R = r * SR;
  if (i < 0) return 0;
  if (i < A) return Math.pow(i / Math.max(1, A), 1 / curve);
  const j = i - A;
  if (j < D) { const t = j / Math.max(1, D); return 1 + (s - 1) * Math.pow(t, 1 / curve); }
  if (i < len) return s;
  const k = (i - len) / Math.max(1, R);
  if (k >= 1) return 0;
  return s * Math.pow(1 - k, curve);
}

/** Percussive exponential decay: 1 -> ~0 over `tau` seconds of e-folding. */
export const expDec = (i, tau) => Math.exp(-i / (tau * SR));

/** Raised-cosine window segment, useful for clickless one-shots. */
export function hann(i, n) { return 0.5 - 0.5 * Math.cos(TAU * clamp(i / n, 0, 1)); }

/** Applies a linear fade-in / fade-out (seconds) to a stereo pair in place. */
export function fadeStereo(st, inSec, outSec) {
  const n = st.L.length;
  const fi = Math.round(inSec * SR), fo = Math.round(outSec * SR);
  for (let i = 0; i < fi && i < n; i++) { const g = i / fi; st.L[i] *= g; st.R[i] *= g; }
  for (let i = 0; i < fo && i < n; i++) {
    const g = i / fo, j = n - 1 - i;
    st.L[j] *= g; st.R[j] *= g;
  }
  return st;
}

// ---------------------------------------------------------------- delay

/** Fractional-read delay line. */
export class Delay {
  constructor(maxSec = 2) {
    this.n = Math.ceil(maxSec * SR) + 4;
    this.b = new Float32Array(this.n);
    this.w = 0;
  }
  write(v) { this.b[this.w] = v; this.w = (this.w + 1) % this.n; }
  /** Read `d` samples back (fractional). */
  read(d) {
    const dd = clamp(d, 1, this.n - 2);
    let rp = this.w - dd;
    while (rp < 0) rp += this.n;
    const i0 = Math.floor(rp), f = rp - i0;
    const i1 = (i0 + 1) % this.n;
    return this.b[i0] * (1 - f) + this.b[i1] * f;
  }
  tick(v, d, fb = 0) {
    const out = this.read(d);
    this.write(v + out * fb);
    return out;
  }
}

/** Feedback comb, the metallic-resonance workhorse. */
export function comb(b, delaySamples, fb = 0.7, mix = 0.5) {
  const d = new Delay(Math.max(0.05, (delaySamples / SR) * 2 + 0.01));
  const out = buf(b.length);
  for (let i = 0; i < b.length; i++) {
    const y = d.read(delaySamples);
    d.write(b[i] + y * fb);
    out[i] = b[i] * (1 - mix) + y * mix;
  }
  return out;
}

/** Flanger / chorus with a sinusoidal LFO on a short delay. */
export function flange(b, { rate = 0.4, depthMs = 3, baseMs = 4, fb = 0.3, mix = 0.5 } = {}) {
  const d = new Delay(0.08);
  const out = buf(b.length);
  const base = baseMs * SR / 1000, dep = depthMs * SR / 1000;
  for (let i = 0; i < b.length; i++) {
    const dl = base + dep * (0.5 + 0.5 * Math.sin(TAU * rate * i / SR));
    const y = d.read(dl);
    d.write(b[i] + y * fb);
    out[i] = b[i] * (1 - mix) + y * mix;
  }
  return out;
}

// ---------------------------------------------------------------- reverb

const FV_COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const FV_ALLPASS = [556, 441, 341, 225];
const FV_SPREAD = 23;

class LpComb {
  constructor(len, fb, damp) {
    this.b = new Float32Array(len); this.i = 0; this.fb = fb;
    this.d1 = damp; this.d2 = 1 - damp; this.store = 0;
  }
  run(x) {
    const y = this.b[this.i];
    this.store = y * this.d2 + this.store * this.d1;
    this.b[this.i] = x + this.store * this.fb;
    if (++this.i >= this.b.length) this.i = 0;
    return y;
  }
}

class Allpass {
  constructor(len, fb = 0.5) { this.b = new Float32Array(len); this.i = 0; this.fb = fb; }
  run(x) {
    const y = this.b[this.i];
    this.b[this.i] = x + y * this.fb;
    if (++this.i >= this.b.length) this.i = 0;
    return y - x;
  }
}

/**
 * Freeverb-style stereo reverb, delay lengths rescaled from 44.1 k to `SR`.
 *
 * @param {{room?: number, damp?: number, width?: number, preDelay?: number, size?: number}} opts
 *   room 0..1 (tail length), damp 0..1 (HF absorption), size scales all delays
 */
export class Reverb {
  constructor({ room = 0.82, damp = 0.35, width = 1, preDelay = 0.018, size = 1 } = {}) {
    const k = (SR / 44100) * size;
    const fb = room * 0.28 + 0.7;
    const d1 = damp * 0.4;
    this.combL = FV_COMB.map((l) => new LpComb(Math.round(l * k), fb, d1));
    this.combR = FV_COMB.map((l) => new LpComb(Math.round((l + FV_SPREAD) * k), fb, d1));
    this.apL = FV_ALLPASS.map((l) => new Allpass(Math.round(l * k), 0.5));
    this.apR = FV_ALLPASS.map((l) => new Allpass(Math.round((l + FV_SPREAD) * k), 0.5));
    this.width = width;
    this.pd = Math.round(preDelay * SR);
    this.pdL = new Delay(Math.max(0.05, preDelay * 2 + 0.01));
    this.pdR = new Delay(Math.max(0.05, preDelay * 2 + 0.01));
  }
  /** Returns [wetL, wetR] for one input frame. */
  run(l, r) {
    this.pdL.write(l); this.pdR.write(r);
    const xl = this.pd > 1 ? this.pdL.read(this.pd) : l;
    const xr = this.pd > 1 ? this.pdR.read(this.pd) : r;
    const inp = (xl + xr) * 0.015;
    let wl = 0, wr = 0;
    for (let i = 0; i < this.combL.length; i++) { wl += this.combL[i].run(inp); wr += this.combR[i].run(inp); }
    for (let i = 0; i < this.apL.length; i++) { wl = this.apL[i].run(wl); wr = this.apR[i].run(wr); }
    const w1 = this.width / 2 + 0.5, w2 = (1 - this.width) / 2;
    return [wl * w1 + wr * w2, wr * w1 + wl * w2];
  }
}

/**
 * Convenience: convolve-ish send. Runs `src` (mono or stereo) through a Reverb
 * and returns a stereo wet/dry blend.
 */
export function reverbStereo(src, { wet = 0.3, dry = 1, ...opts } = {}) {
  const L = src.L ?? src;
  const R = src.R ?? src;
  const n = L.length;
  const rv = new Reverb(opts);
  const out = stereo(n);
  for (let i = 0; i < n; i++) {
    const [wl, wr] = rv.run(L[i], R[i]);
    out.L[i] = L[i] * dry + wl * wet;
    out.R[i] = R[i] * dry + wr * wet;
  }
  return out;
}

/** Renders the reverb's impulse response, for ffmpeg `afir` convolution. */
export function reverbIR(seconds, opts = {}) {
  const n = Math.round(seconds * SR);
  const rv = new Reverb(opts);
  const out = stereo(n);
  for (let i = 0; i < n; i++) {
    const [wl, wr] = rv.run(i === 0 ? 1 : 0, i === 0 ? 1 : 0);
    out.L[i] = wl; out.R[i] = wr;
  }
  // taper the tail so the IR ends silently
  const tail = Math.round(n * 0.25);
  for (let i = 0; i < tail; i++) {
    const g = i / tail, j = n - 1 - i;
    out.L[j] *= g; out.R[j] *= g;
  }
  return out;
}

// ---------------------------------------------------------------- mixing

/** Adds `src` (mono) into a stereo bus at `at` samples with gain and pan. */
export function addMono(dst, src, at = 0, gain = 1, pan = 0) {
  const [gl, gr] = panGains(pan);
  const o = Math.round(at);
  const n = Math.min(src.length, dst.L.length - o);
  for (let i = 0; i < n; i++) {
    const v = src[i] * gain;
    dst.L[o + i] += v * gl;
    dst.R[o + i] += v * gr;
  }
  return dst;
}

/** Adds a stereo source into a stereo bus at `at` samples. */
export function addStereo(dst, src, at = 0, gain = 1) {
  const o = Math.round(at);
  const n = Math.min(src.L.length, dst.L.length - o);
  for (let i = 0; i < n; i++) {
    dst.L[o + i] += src.L[i] * gain;
    dst.R[o + i] += src.R[i] * gain;
  }
  return dst;
}

export function scaleStereo(st, g) {
  for (let i = 0; i < st.L.length; i++) { st.L[i] *= g; st.R[i] *= g; }
  return st;
}

export function peakOf(st) {
  const L = st.L ?? st, R = st.R ?? st;
  let p = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]), b = Math.abs(R[i]);
    if (a > p) p = a;
    if (b > p) p = b;
  }
  return p;
}

export function rmsOf(st) {
  const L = st.L ?? st, R = st.R ?? st;
  let s = 0;
  for (let i = 0; i < L.length; i++) s += L[i] * L[i] + R[i] * R[i];
  return Math.sqrt(s / (L.length * 2));
}

/** Scales so the loudest sample sits at `target`. */
export function normalise(st, target = 0.89) {
  const p = peakOf(st);
  if (p > 1e-9) scaleStereo(st, target / p);
  return st;
}

/**
 * Gentle programme limiter: soft-knee tanh above `ceil` with a fast envelope
 * follower, so peaks are tamed without the dull thud of hard clipping.
 */
export function limit(st, ceil = 0.95, drive = 1) {
  const n = st.L.length;
  const atk = Math.exp(-1 / (0.0008 * SR));
  const rel = Math.exp(-1 / (0.12 * SR));
  let env = 0;
  for (let i = 0; i < n; i++) {
    const l = st.L[i] * drive, r = st.R[i] * drive;
    const a = Math.max(Math.abs(l), Math.abs(r));
    env = a > env ? a + atk * (env - a) : a + rel * (env - a);
    const g = env > ceil ? ceil / env : 1;
    st.L[i] = softclip(l * g / ceil, 1.0) * ceil;
    st.R[i] = softclip(r * g / ceil, 1.0) * ceil;
  }
  return st;
}

/** Makes a mono buffer wide by decorrelating with a tiny delay + inverted HF. */
export function widen(b, ms = 12, amount = 0.35) {
  const n = b.length;
  const out = stereo(n);
  const d = Math.round(ms * SR / 1000);
  for (let i = 0; i < n; i++) {
    const side = i >= d ? b[i - d] * amount : 0;
    out.L[i] = b[i] + side;
    out.R[i] = b[i] - side;
  }
  return out;
}

/**
 * Filters a buffer as if it were an endless loop: the filter is warmed on the
 * buffer's own tail first, so state at sample 0 already matches state at the wrap
 * point. Combined with LFO rates that are integer multiples of 1/duration this
 * gives genuinely seamless loops without a crossfade.
 *
 * @param {Float32Array} b
 * @param {(sample:number, index:number)=>number} step called per sample; must be stateful
 * @param {number} [warm] fraction of the buffer used to prime the state
 */
export function circularFilter(b, step, warm = 0.35) {
  const n = b.length;
  const start = Math.max(0, Math.floor(n * (1 - warm)));
  for (let i = start; i < n; i++) step(b[i], i);
  const out = buf(n);
  for (let i = 0; i < n; i++) out[i] = step(b[i], i);
  return out;
}

/**
 * Variable-rate playback of a source buffer with linear interpolation - the
 * cheapest convincing doppler for noise beds.
 *
 * @param {Float32Array} src
 * @param {number} n output length
 * @param {(i:number)=>number} rateFn playback rate per output sample
 */
export function variRead(src, n, rateFn) {
  const out = buf(n);
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const i0 = Math.floor(pos) % src.length;
    const i1 = (i0 + 1) % src.length;
    const f = pos - Math.floor(pos);
    out[i] = src[i0] * (1 - f) + src[i1] * f;
    pos += rateFn(i);
    if (pos >= src.length) pos -= src.length;
  }
  return out;
}

/**
 * Loop-safe cyclic crossfade: makes `st` seamless when repeated, by wrapping the
 * last `xf` seconds back over the start.
 */
export function makeLoopable(st, xf = 0.25) {
  const n = st.L.length;
  const k = Math.min(Math.round(xf * SR), Math.floor(n / 3));
  const out = stereo(n - k);
  for (let i = 0; i < out.L.length; i++) { out.L[i] = st.L[i]; out.R[i] = st.R[i]; }
  for (let i = 0; i < k; i++) {
    const g = i / k;               // rising over the head
    const src = n - k + i;         // tail sample folded in
    out.L[i] = out.L[i] * g + st.L[src] * (1 - g);
    out.R[i] = out.R[i] * g + st.R[src] * (1 - g);
  }
  return out;
}
