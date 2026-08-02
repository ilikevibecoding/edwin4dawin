#!/usr/bin/env node
/**
 * Procedural sound-effects bakery.
 *
 * Every sound in the film is synthesised from scratch in this file: oscillators,
 * noise generators, envelopes, state-variable filters, modal resonators,
 * feedback combs, doppler delay lines, waveshapers and a small Schroeder
 * reverb, all hand written below. Nothing is sampled, recorded or downloaded —
 * ffmpeg is used purely to turn the rendered PCM into mp3.
 *
 *   node tools/sfx.mjs                      # render everything
 *   node tools/sfx.mjs --only=tie_scream    # render a subset (index is merged)
 *   node tools/sfx.mjs --montage            # also write /tmp/sfx_montage.wav
 *
 * Writes public/audio/sfx/<name>.mp3 and public/audio/sfx/index.json, the map
 * the film's cue list resolves names through. Rendering is deterministic: every
 * generator draws from a seeded PRNG, so re-running produces identical audio.
 *
 * Effects flagged as loops are built so that the last sample joins the first:
 * continuous (noise) layers are generated long and crossfaded onto their own
 * head by `loopBed`, and rhythmic layers are mixed in circularly by `addWrap`,
 * which lets a decay tail spill past the end and reappear at the start.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public/audio/sfx');
const SR = 44100;
const PEAK_DB = -3; // every effect is normalised to this peak

// ===========================================================================
// dsp — reusable building blocks
// ===========================================================================

// --- scalars ---------------------------------------------------------------

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dbToGain = (db) => Math.pow(10, db / 20);
const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-12));
const TAU = Math.PI * 2;

/** Samples in `sec` seconds. */
const nsamp = (sec) => Math.max(1, Math.round(sec * SR));
/** A silent mono buffer `sec` seconds long. */
const mono = (sec) => new Float32Array(nsamp(sec));
/** Coerce a number-or-function parameter into a function of time (seconds). */
const K = (v) => (typeof v === 'function' ? v : () => v);
/** [mono] or [L,R] regardless of what an effect returned. */
const chans = (x) => (x instanceof Float32Array ? [x] : x);

/** Linear-interpolated read at a fractional sample position; 0 outside. */
function readLerp(buf, pos) {
  if (pos < 0) return 0;
  const i0 = Math.floor(pos);
  if (i0 + 1 >= buf.length) return i0 < buf.length ? buf[i0] : 0;
  const f = pos - i0;
  return buf[i0] * (1 - f) + buf[i0 + 1] * f;
}

// --- deterministic randomness ----------------------------------------------

/** mulberry32 — small, fast, seedable. Nothing here may call Math.random(). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  constructor(seed = 1) {
    this.f = mulberry32(seed);
  }
  range(a = 0, b = 1) {
    return a + this.f() * (b - a);
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  pick(arr) {
    return arr[Math.min(arr.length - 1, Math.floor(this.f() * arr.length))];
  }
  sign() {
    return this.f() < 0.5 ? -1 : 1;
  }
  /** Roughly gaussian: sum of three uniforms. */
  gauss(mean = 0, sd = 1) {
    return mean + (this.f() + this.f() + this.f() - 1.5) * 1.1547 * sd;
  }
  /** Random value biased towards `a` when curve > 1. */
  curved(a, b, curve = 2) {
    return lerp(a, b, Math.pow(this.f(), curve));
  }
}

// --- oscillators -----------------------------------------------------------

/** polyBLEP correction — keeps swept saw/square edges from aliasing. */
function blep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

function waveAt(shape, ph, dt, pw) {
  switch (shape) {
    case 'sine':
      return Math.sin(TAU * ph);
    case 'tri':
      return 1 - 4 * Math.abs(ph - 0.5);
    case 'saw':
      return 2 * ph - 1 - blep(ph, dt);
    case 'square':
    case 'pulse': {
      let v = ph < pw ? 1 : -1;
      v += blep(ph, dt);
      v -= blep(ph + 1 - pw >= 1 ? ph - pw : ph + 1 - pw, dt);
      return v;
    }
    default:
      throw new Error(`unknown shape ${shape}`);
  }
}

/**
 * Phase-accumulating oscillator. `freq` may be a number or a function of time,
 * which is what makes every sweep in this file possible.
 */
function osc(dur, freq, { shape = 'sine', phase = 0, pw = 0.5, fm = null, fmDepth = 0 } = {}) {
  const ff = K(freq);
  const pf = K(pw);
  const out = mono(dur);
  let ph = phase;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let f = ff(t);
    if (fm) f *= 1 + fmDepth * fm[i];
    f = clamp(f, 0.0001, SR * 0.49);
    const dt = f / SR;
    out[i] = waveAt(shape, ph, dt, clamp(pf(t), 0.02, 0.98));
    ph += dt;
    if (ph >= 1) ph -= 1;
  }
  return out;
}

// --- noise -----------------------------------------------------------------

function whiteNoise(dur, rng) {
  const out = mono(dur);
  for (let i = 0; i < out.length; i++) out[i] = rng.range(-1, 1);
  return out;
}

/** Paul Kellet's economy pink filter: -3 dB/octave, good enough and cheap. */
function pinkNoise(dur, rng) {
  const out = mono(dur);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < out.length; i++) {
    const w = rng.range(-1, 1);
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16;
    b6 = w * 0.115926;
  }
  return out;
}

/** Brown / red noise (-6 dB/octave) via a leaky integrator — pure rumble. */
function brownNoise(dur, rng) {
  const out = mono(dur);
  let s = 0;
  for (let i = 0; i < out.length; i++) {
    s = s * 0.996 + rng.range(-1, 1) * 0.04;
    out[i] = s * 4;
  }
  return dcBlock(out, 12).out;
}

/**
 * Smooth band-limited noise that is exactly periodic over `dur` — the trick
 * that lets looping beds wobble without their modulation jumping at the seam.
 * Returns a function of time in [0,1].
 */
function periodicNoise(dur, rng, { partials = 7, lowHz = 0.12, highHz = 0.9 } = {}) {
  const comps = [];
  for (let i = 0; i < partials; i++) {
    // snap each partial to an exact multiple of 1/dur so it closes the loop
    const hz = lerp(lowHz, highHz, i / Math.max(1, partials - 1));
    const k = Math.max(1, Math.round(hz * dur));
    comps.push({ w: (TAU * k) / dur, ph: rng.range(0, TAU), a: 1 / (1 + i * 0.7) });
  }
  const norm = comps.reduce((s, c) => s + c.a, 0);
  return (t) => {
    let v = 0;
    for (const c of comps) v += c.a * Math.sin(c.w * t + c.ph);
    return 0.5 + (0.5 * v) / norm;
  };
}

/** Non-looping smooth noise: a random walk, cosine-interpolated at `hz`. */
function smoothNoise(dur, rng, hz = 4) {
  const step = SR / hz;
  const pts = Math.ceil(nsamp(dur) / step) + 2;
  const v = new Float32Array(pts);
  for (let i = 0; i < pts; i++) v[i] = rng.f();
  return (t) => {
    const x = (t * SR) / step;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return lerp(v[Math.min(i, pts - 1)], v[Math.min(i + 1, pts - 1)], s);
  };
}

// --- envelopes -------------------------------------------------------------

/** Multiply a buffer by an envelope function of time, in place. */
function env(buf, fn) {
  for (let i = 0; i < buf.length; i++) buf[i] *= fn(i / SR);
  return buf;
}

/** Percussive envelope: linear attack then decay to -60 dB over `dec`. */
const perc = (atk, dec, curve = 1) => (t) => {
  if (t < 0) return 0;
  if (t < atk) return atk <= 0 ? 1 : t / atk;
  const x = (t - atk) / dec;
  return x >= 1.6 ? 0 : Math.exp(-6.9078 * Math.pow(x, curve));
};

/** Piecewise breakpoints: [[t, value, curve?], ...]; curve>1 eases out. */
const seg = (points) => (t) => {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    if (t <= t1) {
      const [t0, v0, c = 1] = points[i - 1];
      const u = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return lerp(v0, v1, Math.pow(u, c));
    }
  }
  return points[points.length - 1][1];
};

/** Swell shape: rises over `up`, holds, falls over `down`. */
const bell = (dur, up = 0.3, down = 0.5) =>
  seg([
    [0, 0],
    [dur * up, 1, 0.7],
    [dur * (1 - down), 0.85],
    [dur, 0, 1.8],
  ]);

/** Exponential frequency sweep a→b over `T`, then held. */
const expTo = (a, b, T) => (t) => a * Math.pow(b / a, clamp(t / T, 0, 1));
/** Linear sweep a→b over `T`, then held. */
const linTo = (a, b, T) => (t) => lerp(a, b, clamp(t / T, 0, 1));

// --- filters ---------------------------------------------------------------

/**
 * Zavalishin topology-preserving state-variable filter. Stable under heavy
 * cutoff modulation, which is why it is the workhorse here.
 * modes: lp | hp | bp (unity peak) | bpq (peak gain = Q) | notch
 */
function svf(x, cutoff, q = 0.7071, mode = 'lp') {
  const cf = K(cutoff);
  const qf = K(q);
  const stat = typeof cutoff === 'number' && typeof q === 'number';
  const out = new Float32Array(x.length);
  let ic1 = 0, ic2 = 0;
  let g = 0, k = 0, a1 = 0, a2 = 0, a3 = 0;
  if (stat) {
    g = Math.tan((Math.PI * clamp(cutoff, 5, SR * 0.49)) / SR);
    k = 1 / Math.max(0.05, q);
    a1 = 1 / (1 + g * (g + k));
    a2 = g * a1;
    a3 = g * a2;
  }
  for (let i = 0; i < x.length; i++) {
    if (!stat) {
      const t = i / SR;
      g = Math.tan((Math.PI * clamp(cf(t), 5, SR * 0.49)) / SR);
      k = 1 / Math.max(0.05, qf(t));
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    }
    const v0 = x[i];
    const v3 = v0 - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    switch (mode) {
      case 'lp': out[i] = v2; break;
      case 'hp': out[i] = v0 - k * v1 - v2; break;
      case 'bp': out[i] = v1 * k; break;
      case 'bpq': out[i] = v1; break;
      default: out[i] = v0 - k * v1; break; // notch
    }
  }
  return out;
}

const lp = (x, c, q = 0.7071) => svf(x, c, q, 'lp');
const hp = (x, c, q = 0.7071) => svf(x, c, q, 'hp');
const bp = (x, c, q = 2) => svf(x, c, q, 'bp');

/** Remove DC / infrasonic drift so normalisation is not wasted on offset. */
function dcBlock(x, hz = 18, state = { x: 0, y: 0 }) {
  const a = Math.exp((-TAU * hz) / SR);
  const out = new Float32Array(x.length);
  let xPrev = state.x, yPrev = state.y;
  for (let i = 0; i < x.length; i++) {
    const y = x[i] - xPrev + a * yPrev;
    out[i] = y;
    xPrev = x[i];
    yPrev = y;
  }
  return { out, state: { x: xPrev, y: yPrev } };
}

/**
 * DC blocker for looping material: one throwaway pass leaves the filter in the
 * state it would be in halfway through an endless loop, so the second pass has
 * no start-up transient and the seam stays continuous.
 */
function dcBlockLoop(x, hz) {
  return dcBlock(x, hz, dcBlock(x, hz).state).out;
}

/**
 * Modal resonator bank: each mode is a two-pole ringing filter, so an impulse
 * or noise click through this becomes a struck object. Short decays read as
 * plastic, long inharmonic ones as steel.
 * modes: [{ f, t60, gain }]
 */
function modal(x, modes) {
  const out = new Float32Array(x.length);
  for (const m of modes) {
    const r = Math.exp(-6.9078 / Math.max(1e-4, m.t60) / SR);
    const w = (TAU * clamp(m.f, 5, SR * 0.48)) / SR;
    const a1 = 2 * r * Math.cos(w);
    const a2 = -(r * r);
    const b0 = (m.gain ?? 1) * (1 - r);
    let y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const y = b0 * x[i] + a1 * y1 + a2 * y2;
      y2 = y1;
      y1 = y;
      out[i] += y;
    }
  }
  return out;
}

/** Sum of unity-peak band passes — a vowel/formant filter. */
function formants(x, list) {
  const out = new Float32Array(x.length);
  for (const f of list) {
    const b = svf(x, f.f, f.q ?? 9, 'bp');
    const g = f.gain ?? 1;
    for (let i = 0; i < out.length; i++) out[i] += b[i] * g;
  }
  return out;
}

// --- delays ----------------------------------------------------------------

/**
 * Feedback comb with a damped, time-varying delay. Growing the delay slides
 * the comb's resonant series downward, which is exactly the descending
 * metallic "zap" of a blaster bolt (and, slowed down, a turbolaser).
 */
function combFB(x, delay, { fb = 0.9, damp = 0.25, limit = 6 } = {}) {
  const df = K(delay);
  const y = new Float32Array(x.length);
  const a = 1 - clamp(damp, 0, 0.99);
  let s = 0;
  for (let i = 0; i < y.length; i++) {
    const d = Math.max(2, df(i / SR) * SR);
    const v = readLerp(y, i - d);
    s += a * (v - s);
    y[i] = clamp(x[i] + fb * s, -limit, limit);
  }
  return y;
}

/** Schroeder allpass — smears a signal without colouring it much. */
function allpass(x, delaySec, g = 0.5) {
  const d = Math.max(2, Math.round(delaySec * SR));
  const line = new Float32Array(d);
  const out = new Float32Array(x.length);
  let idx = 0;
  for (let i = 0; i < x.length; i++) {
    const bufOut = line[idx];
    line[idx] = x[i] + g * bufOut;
    out[i] = bufOut - x[i];
    idx = idx + 1 === d ? 0 : idx + 1;
  }
  return out;
}

/** Damped feedback delay — slap-back echoes and spring-ish tails. */
function echo(x, delaySec, { fb = 0.4, mix = 0.4, damp = 0.3 } = {}) {
  const d = Math.max(2, Math.round(delaySec * SR));
  const line = new Float32Array(x.length + d);
  const out = new Float32Array(x.length);
  const a = 1 - clamp(damp, 0, 0.99);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    s += a * (line[i] - s); // what was written d samples ago, damped
    line[i + d] = x[i] + fb * s;
    out[i] = x[i] + mix * s;
  }
  return out;
}

/** Time-varying delay read — the basis of doppler and flanging. */
function varDelay(x, outLen, delaySec) {
  const df = K(delaySec);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const t = i / SR;
    out[i] = readLerp(x, i - df(t) * SR);
  }
  return out;
}

/** Swept short delay mixed back in: motion and metallic sheen. */
function flanger(x, { hz = 0.4, lowMs = 0.6, highMs = 5, mix = 0.5, fb = 0.3, phase = 0 } = {}) {
  const d = (t) => lerp(lowMs, highMs, 0.5 + 0.5 * Math.sin(TAU * hz * t + phase)) * 0.001;
  const wet = varDelay(x, x.length, d);
  const out = new Float32Array(x.length);
  for (let i = 0; i < out.length; i++) out[i] = x[i] + mix * wet[i];
  if (fb > 0) {
    // a second, detuned pass stands in for feedback round the delay line
    const wet2 = varDelay(out, out.length, (t) => d(t) * 1.37);
    for (let i = 0; i < out.length; i++) out[i] += fb * 0.5 * wet2[i];
  }
  return out;
}

/**
 * Freeverb-style reverb: eight damped parallel combs into four series
 * allpasses. Returns [L,R] (right uses slightly longer delays for width).
 */
function reverb(x, { rt60 = 1.5, mix = 0.3, damp = 0.4, size = 1, stereo = true, wetHp = 90 } = {}) {
  const COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const AP = [556, 441, 341, 225];
  const tank = (input, spread) => {
    const acc = new Float32Array(input.length);
    for (const ct of COMB) {
      const d = Math.max(8, Math.round(ct * size) + spread);
      const g = Math.exp((-6.9078 * (d / SR)) / rt60);
      const line = new Float32Array(d);
      const a = 1 - clamp(damp, 0, 0.95);
      let idx = 0, s = 0;
      for (let i = 0; i < input.length; i++) {
        const v = line[idx];
        s += a * (v - s);
        line[idx] = input[i] + g * s;
        idx = idx + 1 === d ? 0 : idx + 1;
        acc[i] += v * 0.125;
      }
    }
    let sig = acc;
    for (const at of AP) sig = allpass(sig, (Math.round(at * size) + spread) / SR, 0.5);
    return wetHp > 0 ? hp(sig, wetHp) : sig;
  };
  const wetL = tank(x, 0);
  const wetR = stereo ? tank(x, 23) : wetL;
  const L = new Float32Array(x.length);
  const R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    L[i] = x[i] + mix * wetL[i];
    R[i] = x[i] + mix * wetR[i];
  }
  return stereo ? [L, R] : [L];
}

/**
 * Physical fly-past. The source is read through a propagation delay r/c, so
 * the pitch bend is real doppler rather than a drawn curve; amplitude follows
 * 1/r, air absorption closes a low pass with distance, and the pan tracks the
 * source across the stereo field.
 */
function flyBy(src, dur, { speed = 140, miss = 12, tc = 0.6, spread = 0.95, air = 14000, curve = 1, pre = 0.5 } = {}) {
  const n = nsamp(dur);
  const c = 343;
  const dry = new Float32Array(n);
  const pans = new Float32Array(n);
  const cut = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = speed * (t - tc);
    const r = Math.hypot(miss, x);
    const delay = (r - miss) / c;
    const amp = Math.pow(miss / r, curve);
    // `src` is taken to start `pre` seconds before t=0, so the long propagation
    // delay of the approach still has signal to read
    dry[i] = readLerp(src, (t + pre - delay) * SR) * amp;
    pans[i] = clamp(x / r, -1, 1) * spread;
    cut[i] = clamp(air * Math.pow(miss / r, 0.55), 500, SR * 0.45);
  }
  const filtered = svf(dry, (t) => cut[Math.min(n - 1, Math.round(t * SR))], 0.7071, 'lp');
  const out = [new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) {
    const a = ((pans[i] + 1) * Math.PI) / 4;
    out[0][i] = filtered[i] * Math.cos(a);
    out[1][i] = filtered[i] * Math.sin(a);
  }
  return out;
}

// --- waveshaping -----------------------------------------------------------

/** tanh saturation, gain-compensated: adds harmonics and glues layers. */
function softClip(x, drive = 2, mix = 1) {
  const out = new Float32Array(x.length);
  const norm = Math.tanh(drive);
  for (let i = 0; i < x.length; i++) {
    const s = Math.tanh(drive * x[i]) / norm;
    out[i] = lerp(x[i], s, mix);
  }
  return out;
}

/** Quantise amplitude and hold samples — grit, digital hardware, droid guts. */
function bitcrush(x, bits = 6, hold = 1) {
  const out = new Float32Array(x.length);
  const steps = Math.pow(2, bits - 1);
  let held = 0;
  for (let i = 0; i < x.length; i++) {
    if (i % hold === 0) held = Math.round(clamp(x[i], -1, 1) * steps) / steps;
    out[i] = held;
  }
  return out;
}

/** out[i] = max(|x[i..i+w]|) — the look-ahead detector for `compress`. */
function slidingMax(x, w) {
  const out = new Float32Array(x.length);
  const dq = new Int32Array(x.length);
  let head = 0, tail = 0;
  for (let i = x.length - 1; i >= 0; i--) {
    while (tail > head && dq[head] > i + w) head++;
    const a = Math.abs(x[i]);
    while (tail > head && Math.abs(x[dq[tail - 1]]) <= a) tail--;
    dq[tail++] = i;
    out[i] = Math.abs(x[dq[head]]);
  }
  return out;
}

/**
 * Feed-forward compressor / limiter with optional look-ahead. The big layered
 * effects live or die on this: a single one-sample click can otherwise set the
 * normalisation level and push every detail layer — crackle, debris, shrapnel —
 * 20 dB down. Look-ahead lets it catch those clicks instead of chasing them.
 */
function compress(
  x,
  { thresh = -14, ratio = 4, attack = 0.004, release = 0.18, knee = 6, lookahead = 0, detect = 'peak', window = 0.012 } = {}
) {
  const out = new Float32Array(x.length);
  const aA = Math.exp(-1 / Math.max(1, attack * SR));
  const aR = Math.exp(-1 / Math.max(1, release * SR));
  const det = lookahead > 0 ? slidingMax(x, Math.round(lookahead * SR)) : null;
  const aW = Math.exp(-1 / Math.max(1, window * SR));
  let ms = 0;
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    let a;
    if (detect === 'rms') {
      // an RMS detector ignores lone one-sample clicks, so the body of the sound
      // is not ducked for 50 ms every time a grain lands
      ms = aW * ms + (1 - aW) * x[i] * x[i];
      a = Math.sqrt(ms);
    } else {
      a = det ? det[i] : Math.abs(x[i]);
    }
    e = a > e ? aA * e + (1 - aA) * a : aR * e + (1 - aR) * a;
    const over = gainToDb(e) - thresh;
    let gr = 0;
    if (over > knee / 2) gr = over * (1 / ratio - 1);
    else if (over > -knee / 2) {
      const u = over + knee / 2;
      gr = ((1 / ratio - 1) * u * u) / (2 * knee);
    }
    out[i] = x[i] * dbToGain(gr);
  }
  return out;
}

/**
 * Bus polish for the percussive effects: compress, then limit with look-ahead so
 * the transients stop stealing the headroom the body needs.
 */
function polish(chs, { thresh = -16, ratio = 3.5, attack = 0.006, release = 0.16, ceil = -8 } = {}) {
  return chs.map((c) =>
    compress(compress(c, { thresh, ratio, attack, release, detect: 'rms' }), {
      thresh: ceil,
      ratio: 12,
      attack: 0.0004,
      release: 0.04,
      knee: 3,
      lookahead: 0.0018,
    })
  );
}

/** Shelving EQ by parallel filter: g > 0 lifts, g < 0 cuts. */
function shelfHi(x, f, g) {
  const h = hp(x, f);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] + g * h[i];
  return out;
}
function shelfLo(x, f, g) {
  const l = lp(x, f);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] + g * l[i];
  return out;
}

/** Ring modulation — inharmonic, metallic, alien. */
function ringMod(x, hz, depth = 1) {
  const hf = K(hz);
  const out = new Float32Array(x.length);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    out[i] = x[i] * lerp(1, Math.sin(TAU * ph), depth);
    ph += hf(t) / SR;
    if (ph >= 1) ph -= 1;
  }
  return out;
}

// --- mixing ----------------------------------------------------------------

/** dst += src, offset in seconds. */
function add(dst, src, at = 0, gain = 1) {
  const off = Math.round(at * SR);
  const n = Math.min(src.length, dst.length - off);
  for (let i = Math.max(0, -off); i < n; i++) dst[i + off] += src[i] * gain;
  return dst;
}

/** dst += src wrapping around the end — keeps rhythmic loops seamless. */
function addWrap(dst, src, at = 0, gain = 1) {
  const off = Math.round(at * SR);
  const N = dst.length;
  for (let i = 0; i < src.length; i++) {
    let j = (i + off) % N;
    if (j < 0) j += N;
    dst[j] += src[i] * gain;
  }
  return dst;
}

/** Mix a mono source into a stereo pair with equal-power pan (number or fn). */
function place(chs, src, { at = 0, gain = 1, pan = 0, wrap = false } = {}) {
  const pf = K(pan);
  const off = Math.round(at * SR);
  const N = chs[0].length;
  for (let i = 0; i < src.length; i++) {
    let j = i + off;
    if (wrap) {
      j %= N;
      if (j < 0) j += N;
    } else if (j < 0 || j >= N) continue;
    const p = clamp(pf(i / SR), -1, 1);
    const a = ((p + 1) * Math.PI) / 4;
    const v = src[i] * gain;
    chs[0][j] += v * Math.cos(a);
    chs[1][j] += v * Math.sin(a);
  }
  return chs;
}

const gain = (x, g) => {
  const gf = K(g);
  for (let i = 0; i < x.length; i++) x[i] *= gf(i / SR);
  return x;
};

const mixBufs = (...bufs) => {
  const n = Math.max(...bufs.map((b) => b.length));
  const out = new Float32Array(n);
  for (const b of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i];
  return out;
};

/** Stereo pair from a mono buffer, optionally decorrelated by a tiny allpass. */
function toStereo(x, width = 0) {
  if (width <= 0) return [Float32Array.from(x), Float32Array.from(x)];
  const side = allpass(x, 0.0031, 0.6);
  const L = new Float32Array(x.length);
  const R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    L[i] = x[i] + width * side[i];
    R[i] = x[i] - width * side[i];
  }
  return [L, R];
}

// --- loop plumbing ---------------------------------------------------------

/** Crossfade the overhang of an over-long render back onto its own head. */
function loopify(ch, dur, xfade) {
  const N = nsamp(dur);
  const X = Math.min(nsamp(xfade), N - 1);
  return ch.map((c) => {
    const o = new Float32Array(N);
    o.set(c.subarray(0, N));
    for (let i = 0; i < X; i++) {
      const w = (i / X) * (Math.PI / 2);
      o[i] = c[i] * Math.sin(w) + (c[N + i] ?? 0) * Math.cos(w);
    }
    return o;
  });
}

/**
 * Render a continuous layer that loops: `fn` is asked for `dur + xfade`
 * seconds and the overhang is folded back over the start.
 */
function loopBed(dur, xfade, fn) {
  return loopify(chans(fn(dur + xfade)), dur, xfade);
}
const loopBedMono = (dur, xfade, fn) => loopBed(dur, xfade, fn)[0];

// --- finishing -------------------------------------------------------------

function normalize(ch, peakDb = PEAK_DB) {
  let peak = 0;
  for (const c of ch) for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  if (peak < 1e-9) return ch;
  const g = dbToGain(peakDb) / peak;
  for (const c of ch) for (let i = 0; i < c.length; i++) c[i] *= g;
  return ch;
}

/** Raised-cosine fades so nothing starts or ends on a step. */
function fadeEnds(ch, fin, fout) {
  const a = nsamp(fin);
  const b = nsamp(fout);
  for (const c of ch) {
    for (let i = 0; i < Math.min(a, c.length); i++) c[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / a);
    for (let i = 0; i < Math.min(b, c.length); i++) {
      const j = c.length - 1 - i;
      c[j] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / b);
    }
  }
  return ch;
}

// ===========================================================================
// wav + encoding
// ===========================================================================

/** Minimal 16-bit PCM WAV writer (44100 Hz, 1 or 2 channels). */
function writeWav(file, ch) {
  const n = ch[0].length;
  const nch = ch.length;
  const bytes = n * nch * 2;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nch * 2, 28);
  buf.writeUInt16LE(nch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(bytes, 40);
  let p = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nch; c++) {
      const v = clamp(ch[c][i], -1, 1);
      buf.writeInt16LE(Math.round(v * 32767), p);
      p += 2;
    }
  }
  fs.writeFileSync(file, buf);
}

const ff = (args, opts = {}) => execFileSync('ffmpeg', args, { maxBuffer: 1 << 28, ...opts });

/** Decode an mp3 back to float channels so stats describe the shipped file. */
function decodeMp3(file, nch) {
  const raw = ff(['-v', 'error', '-i', file, '-f', 's16le', '-ar', String(SR), '-ac', String(nch), '-'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const total = Math.floor(raw.length / 2 / nch);
  const ch = Array.from({ length: nch }, () => new Float32Array(total));
  for (let i = 0, p = 0; i < total; i++) {
    for (let c = 0; c < nch; c++, p += 2) ch[c][i] = raw.readInt16LE(p) / 32768;
  }
  return ch;
}

function stats(ch) {
  let peak = 0;
  let sum = 0;
  let n = 0;
  for (const c of ch) {
    for (let i = 0; i < c.length; i++) {
      const v = c[i];
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
      n++;
    }
  }
  return { peak: gainToDb(peak), rms: gainToDb(Math.sqrt(sum / Math.max(1, n))), dur: ch[0].length / SR };
}

// ===========================================================================
// shared voices
// ===========================================================================

/** A strike: brief noise burst plus a unit impulse, used to excite resonators. */
function exciter(dur, rng, { burst = 0.002, tau = 0.0006, click = 1 } = {}) {
  const out = mono(dur);
  const n = Math.min(out.length, nsamp(burst));
  for (let i = 0; i < n; i++) out[i] = rng.range(-1, 1) * Math.exp(-i / Math.max(1, tau * SR));
  out[0] += click;
  return out;
}

/** Scale a buffer so its peak is `target` — handy for grains before scattering. */
function norm1(x, target = 1) {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  if (p > 1e-9) for (let i = 0; i < x.length; i++) x[i] *= target / p;
  return x;
}

/**
 * The core of every explosion, in four bands: a bright shock-front flash, the
 * mid crack that makes a blast read as a blast rather than a rumble, a low roar
 * whose filter slams shut, and a saturated sine sub-drop.
 */
function boom(
  dur,
  rng,
  {
    hi = 4500,
    lo = 260,
    decay = 0.8,
    curve = 0.8,
    subF0 = 90,
    subF1 = 30,
    subDecay = 0.6,
    sub = 1,
    drive = 2.4,
    crack = 1,
  } = {}
) {
  const flash = env(hp(whiteNoise(Math.min(dur, 0.3), rng), hi * 0.6), perc(0.0016, 0.045 + decay * 0.07));
  const mid = env(bp(whiteNoise(dur, rng), expTo(hi * 0.55, lo * 2.4, decay * 0.55), 0.8), perc(0.0015, decay * 0.65, curve));
  const air = env(svf(pinkNoise(dur, rng), expTo(hi * 0.5, lo, decay * 0.7), 0.9, 'lp'), perc(0.004, decay, curve));
  const low = env(osc(dur, expTo(subF0, subF1, subDecay * 0.8), { shape: 'sine' }), perc(0.006, subDecay, 0.9));
  const thump = env(lp(pinkNoise(dur, rng), 180), perc(0.002, decay * 0.5, 0.7));
  return softClip(
    mixBufs(gain(flash, 0.55 * crack), gain(mid, 0.6 * crack), gain(air, 0.7), gain(low, 0.9 * sub), gain(thump, 0.45)),
    drive,
    0.7
  );
}

/**
 * One LEGO brick tap: an impulse through three inharmonic, fast-decaying modes.
 * Short decays and a hollow low mode are what make it read as plastic rather
 * than metal or stone.
 */
function brickClick(rng, size = 0.5) {
  const base = lerp(3800, 780, size);
  const t60 = lerp(0.005, 0.024, size);
  const ex = exciter(0.06, rng, { burst: 0.0009, tau: 0.00025, click: 1 });
  const v = modal(ex, [
    { f: base, t60, gain: 1 },
    { f: base * rng.range(2.1, 2.6), t60: t60 * 0.6, gain: 0.5 },
    { f: base * rng.range(3.5, 4.4), t60: t60 * 0.4, gain: 0.28 },
    { f: base * 0.32, t60: t60 * 1.8, gain: 0.3 * size },
  ]);
  return norm1(hp(v, 260), 1);
}

/** Struck sheet metal / shrapnel fragment: longer, more inharmonic ringing. */
function metalClick(rng, { base = 2400, t60 = 0.05 } = {}) {
  const ex = exciter(0.25, rng, { burst: 0.0015, tau: 0.0004, click: 1 });
  const v = modal(ex, [
    { f: base, t60, gain: 1 },
    { f: base * rng.range(1.4, 1.7), t60: t60 * 0.8, gain: 0.7 },
    { f: base * rng.range(2.6, 3.3), t60: t60 * 0.55, gain: 0.45 },
    { f: base * rng.range(4.1, 5.2), t60: t60 * 0.3, gain: 0.25 },
  ]);
  return norm1(hp(v, 200), 1);
}

// ===========================================================================
// effects — space / weapons
// ===========================================================================

/**
 * blaster_rebel — the classic "pew". A noise click drives a feedback comb whose
 * delay grows over 120 ms, so the comb's resonant series slides downward: that
 * descending metallic zap is the heart of the sound. A ring-modulated square
 * sweep gives it body and a short modal ring adds the bolt's metallic twang.
 */
function blasterRebel({ dur, rng }) {
  // a modest impulse: a huge one would set the peak and leave the sweep quiet
  const ex = exciter(dur, rng, { burst: 0.004, tau: 0.0012, click: 0.45 });
  // the sweep is the sound: 3.5 kHz down to ~190 Hz, and it must stay dominant
  const zap = env(combFB(ex, expTo(0.00028, 0.0052, 0.15), { fb: 0.93, damp: 0.18 }), perc(0.002, 0.22, 0.75));
  let body = osc(dur, expTo(2600, 175, 0.13), { shape: 'square', pw: 0.42 });
  body = ringMod(body, 780, 0.25);
  env(body, perc(0.0015, 0.11, 0.8));
  const thud = env(osc(0.12, expTo(240, 90, 0.05), { shape: 'sine' }), perc(0.001, 0.07));
  // a short metallic twang, deliberately quieter than the sweep so it does not
  // sit as a static pitch over the top of it
  const ring = env(
    modal(ex, [
      { f: 1450, t60: 0.05, gain: 1 },
      { f: 2600, t60: 0.035, gain: 0.5 },
      { f: 3900, t60: 0.022, gain: 0.3 },
    ]),
    perc(0.0005, 0.07)
  );
  const flash = env(hp(whiteNoise(0.012, rng), 3800), perc(0.0012, 0.012));
  const sum = polish(
    [softClip(mixBufs(gain(zap, 1), gain(body, 0.6), gain(thud, 0.4), gain(ring, 0.22), gain(flash, 0.22)), 1.7, 0.5)],
    { thresh: -24, ratio: 3.5, attack: 0.003, release: 0.06, ceil: -13 }
  )[0];
  return reverb(sum, { rt60: 0.22, mix: 0.1, damp: 0.6, size: 0.5 });
}

/**
 * blaster_imperial — same comb-sweep machinery pitched down and roughed up:
 * a longer, noisier exciter, a darker damped comb, a saturated saw sweep and a
 * touch of bit-crushing so the shot spits rather than sings. The sweeps run
 * slower than the rebel bolt's, so the descent is still moving late in the
 * shot; the room is only a slap, because a long tail would replace the falling
 * pitch with the reverb's own fixed mid-band ring.
 */
function blasterImperial({ dur, rng }) {
  const ex = exciter(dur, rng, { burst: 0.008, tau: 0.0026, click: 0.4 });
  const zap = env(combFB(ex, expTo(0.00055, 0.0125, 0.085), { fb: 0.92, damp: 0.38 }), perc(0.002, 0.3, 0.85));
  let body = osc(dur, expTo(1500, 80, 0.075), { shape: 'saw' });
  body = softClip(body, 4, 0.85);
  env(body, perc(0.002, 0.19, 0.85));
  // the noise band is what makes this one read as Imperial: it sweeps with the
  // pitch, so the grit falls too instead of sitting as a static hiss
  let grit = bp(whiteNoise(dur, rng), expTo(3200, 260, 0.07), 1.4);
  grit = bitcrush(grit, 5, 2);
  env(grit, perc(0.0015, 0.2, 0.85));
  const ring = env(modal(ex, [
    { f: 820, t60: 0.045, gain: 1 },
    { f: 1490, t60: 0.03, gain: 0.5 },
  ]), perc(0.001, 0.06));
  const sum = polish([softClip(mixBufs(gain(zap, 0.95), gain(body, 0.8), gain(grit, 0.55), gain(ring, 0.22)), 2.2, 0.6)], {
    thresh: -24,
    ratio: 3.5,
    attack: 0.003,
    release: 0.06,
    ceil: -13,
  })[0];
  return reverb(sum, { rt60: 0.12, mix: 0.07, damp: 0.6, size: 0.4 });
}

/**
 * turbolaser — the blaster comb sweep slowed to half a second and dropped two
 * octaves, stacked with a saturated saw sweep, a sine sub-drop and a swept
 * noise blast, then given a two-second reverb tail. The sub swells in over
 * 50 ms rather than firing instantly: a huge cannon reads as a bright crack
 * that collapses into a boom, and a sub that arrives first simply masks the
 * descent. For the same reason the reverb is highpassed low and damped hard,
 * so its tail is a broad rumble instead of a ring sitting on top of the sweep.
 */
function turbolaser({ dur, rng }) {
  const ex = exciter(dur, rng, { burst: 0.022, tau: 0.007, click: 0.9 });
  const sweep = env(combFB(ex, expTo(0.0009, 0.017, 0.45), { fb: 0.93, damp: 0.32 }), perc(0.004, 0.6, 0.9));
  let body = osc(dur, expTo(720, 44, 0.5), { shape: 'saw' });
  env(body, perc(0.008, 0.42, 0.9));
  body = softClip(body, 3.2, 0.8);
  const sub = env(osc(dur, expTo(98, 26, 0.55), { shape: 'sine' }), perc(0.05, 0.6, 0.9));
  const sub2 = env(osc(dur, expTo(150, 38, 0.4), { shape: 'sine' }), perc(0.03, 0.4, 0.9));
  const air = env(svf(whiteNoise(dur, rng), expTo(5400, 240, 0.5), 1.1, 'lp'), perc(0.003, 0.38, 0.9));
  const flash = env(hp(whiteNoise(0.05, rng), 4200), perc(0.0015, 0.035));
  const sum = softClip(
    mixBufs(gain(sweep, 1), gain(body, 0.9), gain(sub, 1.5), gain(sub2, 0.7), gain(air, 0.85), gain(flash, 0.7)),
    2.2,
    0.6
  );
  return reverb(sum, { rt60: 2.2, mix: 0.26, damp: 0.55, size: 1.3, wetHp: 45 });
}

/**
 * laser_impact — a hard crack (impulse through bright short modes) followed by
 * a low thump and a scatter of debris grains falling away from the hit.
 */
function laserImpact({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  const ex = exciter(0.2, rng, { burst: 0.002, tau: 0.0005 });
  const crack = env(
    modal(ex, [
      { f: 2200, t60: 0.03, gain: 1 },
      { f: 3700, t60: 0.02, gain: 0.7 },
      { f: 5600, t60: 0.012, gain: 0.4 },
    ]),
    perc(0.0004, 0.06)
  );
  place(chs, gain(crack, 1.1), { at: 0 });
  const flash = env(bp(whiteNoise(0.09, rng), expTo(4200, 900, 0.06), 1.2), perc(0.0006, 0.05));
  place(chs, gain(flash, 0.9), { at: 0.001 });
  const thump = env(osc(0.35, expTo(130, 52, 0.09), { shape: 'sine' }), perc(0.002, 0.24));
  place(chs, gain(thump, 1.5), { at: 0.002 });
  // debris: metal fragments raining away, thinning out over half a second
  for (let i = 0; i < 34; i++) {
    const t = rng.curved(0.02, 0.5, 1.8);
    const g = 0.22 * Math.exp(-t * 3.2) * rng.range(0.4, 1);
    place(chs, metalClick(rng, { base: rng.range(1500, 5200), t60: rng.range(0.015, 0.05) }), {
      at: t,
      gain: g,
      pan: rng.range(-0.8, 0.8),
    });
  }
  const [dryL, dryR] = polish(chs, { thresh: -22, ratio: 3, ceil: -10 });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 0.55, mix: 0.2, damp: 0.5, size: 0.8 });
  return [mixBufs(dryL, gain(wet[0], 0.5)), mixBufs(dryR, gain(wet[1], 0.5))];
}

/**
 * torpedo_launch — a mechanical thump and clank in the tube, then the motor
 * lights: band-passed noise whose centre climbs while the whole thing pans away
 * and a rising tone doppler-shifts out of the frame.
 */
function torpedoLaunch({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  // launch thump + tube clank
  const thump = env(osc(0.5, expTo(140, 46, 0.12), { shape: 'sine' }), perc(0.003, 0.34));
  place(chs, gain(thump, 2.4), { at: 0 });
  const clank = env(
    modal(exciter(0.3, rng, { burst: 0.003, tau: 0.0009 }), [
      { f: 320, t60: 0.13, gain: 1 },
      { f: 610, t60: 0.09, gain: 0.6 },
      { f: 1180, t60: 0.05, gain: 0.35 },
    ]),
    perc(0.0006, 0.2)
  );
  place(chs, gain(clank, 0.55), { at: 0.004, pan: -0.15 });
  // rocket motor: noise band climbing as the torpedo accelerates away
  const rise = 1.05;
  let motor = svf(whiteNoise(dur, rng), expTo(320, 3400, rise), 1.5, 'bp');
  env(motor, seg([[0, 0], [0.06, 0.15], [0.5, 0.75, 1.4], [rise, 1], [dur, 0.05, 2]]));
  const tone = env(osc(dur, expTo(180, 1250, rise), { shape: 'saw' }), seg([[0, 0], [0.1, 0.1], [rise, 0.5], [dur, 0]]));
  const rumble = env(lp(brownNoise(dur, rng), 260), seg([[0, 0], [0.08, 0.6], [0.7, 0.5], [dur, 0]]));
  const body = softClip(mixBufs(gain(motor, 0.8), gain(tone, 0.3), gain(rumble, 0.7)), 1.8, 0.4);
  place(chs, body, { at: 0.03, gain: 0.9, pan: (t) => clamp(-0.25 + t * 1.1, -1, 0.9) });
  const wet = reverb(mixBufs(chs[0], chs[1]), { rt60: 1.1, mix: 0.22, damp: 0.5, size: 1 });
  return [mixBufs(chs[0], gain(wet[0], 0.45)), mixBufs(chs[1], gain(wet[1], 0.45))];
}

// ===========================================================================
// effects — explosions
// ===========================================================================

/**
 * explosion_small — one `boom` core (bright noise closing to a dark thump) plus
 * a crackle tail of sparse burning grains, in a small room.
 */
function explosionSmall({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  place(chs, boom(dur, rng, { hi: 5200, lo: 220, decay: 0.75, subF0: 95, subF1: 34, subDecay: 0.6, sub: 2.2, crack: 1.1 }), {
    at: 0,
  });
  const crack = env(hp(whiteNoise(0.03, rng), 3200), perc(0.0012, 0.022));
  place(chs, gain(crack, 0.4), { at: 0 });
  // crackle: little burning fragments, density falling away
  for (let i = 0; i < 130; i++) {
    const t = rng.curved(0.03, 1.2, 1.6);
    const g = 0.3 * Math.exp(-t * 1.9) * rng.range(0.3, 1);
    const gr = env(bp(whiteNoise(0.02, rng), rng.range(900, 5200), 2.5), perc(0.0004, rng.range(0.004, 0.016)));
    place(chs, gr, { at: t, gain: g, pan: rng.range(-0.75, 0.75) });
  }
  const [dryL, dryR] = polish(chs, { thresh: -18, ratio: 3.5, ceil: -9 });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 0.9, mix: 0.24, damp: 0.5, size: 1 });
  return [mixBufs(dryL, gain(wet[0], 0.45)), mixBufs(dryR, gain(wet[1], 0.45))];
}

/**
 * explosion_big — layered detonation: flash crack, main boom, three offset
 * secondary booms, a deep sub sweep and a turbulent roar of brown noise whose
 * level is churned by smooth noise, all in a long reverb.
 */
function explosionBig({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  const flash = env(hp(whiteNoise(0.05, rng), 4200), perc(0.0014, 0.038));
  place(chs, gain(flash, 0.5), { at: 0 });
  place(chs, boom(dur, rng, { hi: 6000, lo: 170, decay: 1.6, subF0: 80, subF1: 24, subDecay: 1.5, sub: 2.4, drive: 2.8 }), {
    at: 0,
    gain: 1,
  });
  // secondaries: smaller detonations tumbling out of the fireball
  const secs = [
    { t: 0.22, g: 0.7, pan: -0.5 },
    { t: 0.48, g: 0.55, pan: 0.55 },
    { t: 0.95, g: 0.4, pan: -0.25 },
  ];
  for (const s of secs) {
    place(chs, boom(dur - s.t, rng, { hi: 3400, lo: 140, decay: 0.7, subF0: 70, subF1: 26, subDecay: 0.5, crack: 1.2 }), {
      at: s.t,
      gain: s.g,
      pan: s.pan,
    });
  }
  // sub drop
  const sub = env(osc(dur, expTo(70, 20, 1.8), { shape: 'sine' }), perc(0.02, 1.7, 0.9));
  place(chs, softClip(gain(sub, 2.2), 2, 0.5), { at: 0.01 });
  // roar: turbulent rumble that outlasts the blast, with debris tumbling in it
  const turb = smoothNoise(dur, rng, 7);
  const roar = svf(brownNoise(dur, rng), (t) => 130 + 380 * turb(t), 1.2, 'lp');
  env(roar, (t) => perc(0.05, 2.2, 0.85)(t) * (0.55 + 0.45 * turb(t * 1.7)));
  place(chs, gain(roar, 1.0), { at: 0.02 });
  const grit = env(bp(whiteNoise(dur, rng), (t) => 900 + 1600 * turb(t), 1.1), perc(0.03, 1.8, 1.05));
  place(chs, gain(grit, 0.22), { at: 0.02 });
  for (let i = 0; i < 60; i++) {
    const t = rng.curved(0.1, dur - 0.3, 1.5);
    place(chs, metalClick(rng, { base: rng.range(800, 4200), t60: rng.range(0.02, 0.09) }), {
      at: t,
      gain: 0.24 * Math.exp(-t * 0.9) * rng.range(0.3, 1),
      pan: rng.range(-0.9, 0.9),
    });
  }
  const [dryL, dryR] = polish([softClip(chs[0], 1.6, 0.4), softClip(chs[1], 1.6, 0.4)], {
    thresh: -19,
    ratio: 4,
    attack: 0.008,
    release: 0.2,
    ceil: -9,
  });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 2.6, mix: 0.3, damp: 0.42, size: 1.4, wetHp: 60 });
  return [mixBufs(dryL, gain(wet[0], 0.5)), mixBufs(dryR, gain(wet[1], 0.5))];
}

/**
 * explosion_massive — the station going up, in four stages:
 *   0.00  flash-crack: a bright zap as the reactor lets go
 *   0.05  first detonation, then a cascade of secondaries rolling outward
 *   0.45  colossal sub-bass drop (two saturated sine sweeps into infrasound)
 *   1.2+  long roaring debris tail: turbulent noise plus hundreds of fragments
 */
function explosionMassive({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  // 1. flash crack
  const zapEx = exciter(0.5, rng, { burst: 0.004, tau: 0.001 });
  const zap = env(combFB(zapEx, expTo(0.0003, 0.006, 0.16), { fb: 0.92, damp: 0.25 }), perc(0.0006, 0.3, 0.8));
  place(chs, gain(zap, 0.7), { at: 0 });
  place(chs, gain(env(hp(whiteNoise(0.08, rng), 4200), perc(0.0003, 0.055)), 0.85), { at: 0 });
  // 2. main detonation + cascading secondaries
  place(chs, boom(dur, rng, { hi: 7000, lo: 150, decay: 2.6, subF0: 85, subF1: 22, subDecay: 2.2, drive: 3, crack: 1.3 }), {
    at: 0.04,
    gain: 1,
  });
  let t = 0.16;
  for (let i = 0; i < 11; i++) {
    const g = 0.7 * Math.exp(-t * 0.8) * rng.range(0.6, 1.1);
    place(
      chs,
      boom(Math.max(0.6, dur - t), rng, {
        hi: rng.range(2400, 5000),
        lo: 120,
        decay: rng.range(0.6, 1.3),
        subF0: rng.range(55, 90),
        subF1: rng.range(18, 30),
        subDecay: rng.range(0.5, 1),
        crack: 1.4,
      }),
      { at: t, gain: g, pan: rng.range(-0.85, 0.85) }
    );
    t += rng.range(0.12, 0.34);
  }
  // superstructure tearing itself apart: a mid band of shrieking metal
  const tear = norm1(
    svf(whiteNoise(dur, rng), (t2) => 1400 * Math.pow(0.45, clamp(t2 / 2.2, 0, 1)) * (1 + 0.3 * Math.sin(TAU * 3.7 * t2)), 6, 'bpq'),
    1
  );
  env(tear, seg([[0, 0], [0.1, 0.8], [1.2, 0.5], [3, 0.12, 1.4], [dur, 0, 1.5]]));
  place(chs, gain(tear, 0.4), { at: 0.06, pan: 0.15 });
  // 3. colossal sub-bass drop
  const sub1 = env(osc(dur, expTo(88, 16, 2.4), { shape: 'sine' }), seg([[0, 0], [0.08, 1], [2.4, 0.42, 1.3], [dur - 0.6, 0, 1.6]]));
  place(chs, softClip(gain(sub1, 2.6), 2.4, 0.6), { at: 0.45 });
  const sub2 = env(osc(dur, expTo(58, 13, 3), { shape: 'sine' }), seg([[0, 0], [0.25, 0.8], [2.6, 0.28, 1.3], [dur - 1.1, 0, 1.6]]));
  place(chs, softClip(gain(sub2, 1.9), 2, 0.5), { at: 0.9 });
  // 4. roaring debris tail
  const turb = smoothNoise(dur, rng, 5.5);
  const turb2 = smoothNoise(dur, rng, 1.7);
  const roar = svf(brownNoise(dur, rng), (t2) => 110 + 520 * turb(t2) * (0.4 + 0.6 * turb2(t2)), 1.3, 'lp');
  env(roar, (t2) => perc(0.12, 3.4, 0.95)(t2) * (0.5 + 0.5 * turb(t2 * 1.3)));
  place(chs, gain(roar, 2.1), { at: 0.05 });
  const hiss = bp(whiteNoise(dur, rng), (t2) => 800 + 2200 * turb2(t2), 1.1);
  env(hiss, perc(0.1, 3.6, 1.1));
  place(chs, gain(hiss, 0.4), { at: 0.1 });
  // fragments: hull plating and bricks tumbling past for five seconds. Their
  // decay is slower than the roar's so the tail hands over from sub-bass to
  // debris; under six seconds of sub they would otherwise be inaudible.
  for (let i = 0; i < 320; i++) {
    const t2 = rng.curved(0.3, dur - 0.3, 1.3);
    const g = 0.6 * Math.exp(-(t2 - 0.3) * 0.2) * rng.range(0.25, 1);
    const grain =
      rng.f() < 0.55
        ? metalClick(rng, { base: rng.range(700, 4600), t60: rng.range(0.02, 0.12) })
        : brickClick(rng, rng.range(0.2, 0.9));
    place(chs, grain, { at: t2, gain: g, pan: rng.range(-0.95, 0.95) });
  }
  // a bed of fine, bright crackle under the fragments — burning debris and
  // venting atmosphere — which keeps the top of the spectrum alive to the end
  const emberDens = 620;
  for (let i = 0; i < emberDens; i++) {
    const t2 = rng.curved(0.25, dur - 0.05, 0.9);
    const ember = env(bp(whiteNoise(0.02, rng), rng.range(2200, 8500), 2.5), perc(0.0003, rng.range(0.003, 0.014)));
    place(chs, ember, { at: t2, gain: 0.2 * Math.exp(-(t2 - 0.25) * 0.16) * rng.range(0.3, 1), pan: rng.range(-0.95, 0.95) });
  }
  const [dryL, dryR] = polish([softClip(chs[0], 1.5, 0.45), softClip(chs[1], 1.5, 0.45)], {
    thresh: -21,
    ratio: 4.5,
    attack: 0.01,
    release: 0.25,
    ceil: -9,
  });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 4, mix: 0.32, damp: 0.4, size: 1.6, wetHp: 50 });
  return [mixBufs(dryL, gain(wet[0], 0.5)), mixBufs(dryR, gain(wet[1], 0.5))];
}

/**
 * brick_scatter — the film's signature: a LEGO model bursting apart. Hundreds
 * of plastic clicks, each of which bounces two to four times with shortening
 * gaps, scattered with a front-loaded density curve: a hard crunch, then rain,
 * then a few last pieces settling.
 */
function brickScatter({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  // the burst itself: a crunch of noise plus a low thump of the model collapsing
  place(chs, gain(env(bp(whiteNoise(0.12, rng), expTo(3800, 700, 0.09), 1.1), perc(0.001, 0.07)), 0.3), { at: 0 });
  place(chs, gain(env(osc(0.4, expTo(95, 42, 0.12), { shape: 'sine' }), perc(0.004, 0.22)), 0.35), { at: 0.002 });
  // pre-render a palette of clicks so hundreds of grains stay cheap
  const palette = [];
  for (let i = 0; i < 26; i++) palette.push(brickClick(rng, rng.range(0.05, 1)));
  const bricks = 460;
  for (let i = 0; i < bricks; i++) {
    // front-loaded arrival times: the opening burst is spread over 160 ms so
    // the ear can still pick out individual bricks instead of one flat crunch,
    // then the rain thins steeply towards the last few pieces
    const t0 = i < 95 ? rng.range(0, 0.16) : rng.curved(0.02, dur - 0.5, 2.6);
    const size = rng.range(0.05, 1);
    const pan = rng.range(-0.95, 0.95);
    const loud = (0.28 + 0.72 * Math.exp(-t0 * 1.15)) * rng.range(0.35, 1) * lerp(1, 0.6, size);
    let bt = t0;
    let bg = loud;
    let gapT = rng.range(0.035, 0.1);
    const bounces = rng.int(1, 4);
    for (let b = 0; b < bounces; b++) {
      const click = palette[rng.int(0, palette.length - 1)];
      place(chs, click, { at: bt, gain: bg * 0.5, pan: pan * rng.range(0.85, 1) });
      bt += gapT;
      gapT *= rng.range(0.5, 0.72);
      bg *= rng.range(0.4, 0.6);
      if (bt > dur - 0.05) break;
    }
  }
  // a handful of stragglers settling right at the end
  for (let i = 0; i < 14; i++) {
    place(chs, palette[rng.int(0, palette.length - 1)], {
      at: rng.range(dur - 0.75, dur - 0.1),
      gain: rng.range(0.05, 0.16),
      pan: rng.range(-0.9, 0.9),
    });
  }
  // compression is what turns a spray of clicks into a solid mass of plastic
  const [dryL, dryR] = polish(chs, { thresh: -26, ratio: 3.2, attack: 0.003, release: 0.09, ceil: -11 });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 0.5, mix: 0.18, damp: 0.55, size: 0.8, wetHp: 250 });
  return [mixBufs(dryL, gain(wet[0], 0.45)), mixBufs(dryR, gain(wet[1], 0.45))];
}

// ===========================================================================
// effects — ships
// ===========================================================================

/**
 * engine_rumble — a capital ship idling. A stack of low partials, each snapped
 * to an exact multiple of 1/dur so the tone itself is periodic over the loop, is
 * saturated for warmth and joined by a brown-noise rumble bed and a faint
 * turbine whine whose levels breathe with periodic (therefore loopable) noise.
 */
function engineRumble({ dur, rng }) {
  const X = 0.9;
  const F = (hz) => Math.round(hz * dur) / dur;
  const gust = periodicNoise(dur, rng, { partials: 5, lowHz: 0.17, highHz: 0.83 });
  const gust2 = periodicNoise(dur, rng, { partials: 4, lowHz: 0.33, highHz: 1.17 });
  return loopBed(dur, X, (d) => {
    // an exact harmonic stack on 18 Hz: detuned partials would beat against
    // each other and make the drone surge instead of holding a steady level
    const tone = mono(d);
    for (const p of [
      { f: F(36), shape: 'saw', g: 0.55 },
      { f: F(54), shape: 'sine', g: 0.4 },
      { f: F(72), shape: 'saw', g: 0.2 },
      { f: F(108), shape: 'sine', g: 0.12 },
      { f: F(216), shape: 'saw', g: 0.05 },
    ]) {
      add(tone, osc(d, p.f, { shape: p.shape, phase: rng.f() }), 0, p.g);
    }
    const warm = softClip(lp(tone, (t) => 215 + 45 * gust(t), 0.9), 2.4, 0.55);
    // a narrow band of noise has a strongly fluctuating envelope, so the bed is
    // kept well under the tone and stripped of its sub-30 Hz random walk;
    // otherwise the drone surges by 8 dB instead of holding steady
    const rumble = gain(lp(hp(brownNoise(d, rng), 28), (t) => 105 + 45 * gust(t)), (t) => 1 + 0.14 * gust2(t));
    const whine = norm1(bp(whiteNoise(d, rng), (t) => 780 + 260 * gust2(t), 6), 0.2);
    const air = gain(lp(pinkNoise(d, rng), 2200), 0.2);
    const sum = softClip(mixBufs(gain(warm, 1.15), gain(rumble, 0.55), whine, air), 1.6, 0.35);
    gain(sum, (t) => 0.94 + 0.06 * Math.sin(TAU * F(3) * t)); // slow ion throb
    return toStereo(sum, 0.35);
  });
}

/**
 * ship_pass — a fighter tearing past the camera. A steady engine source is read
 * through `flyBy`, whose propagation delay produces genuine doppler; the bright
 * transient at closest approach is the air tearing as it goes by.
 */
function shipPass({ dur, rng }) {
  const pre = 0.55;
  const len = dur + pre;
  const eng = mono(len);
  for (const p of [
    { f: 112, g: 0.5, s: 'saw' },
    { f: 168.5, g: 0.28, s: 'saw' },
    { f: 225, g: 0.16, s: 'sine' },
    { f: 56.3, g: 0.4, s: 'sine' },
  ]) {
    add(eng, osc(len, p.f, { shape: p.s, phase: rng.f() }), 0, p.g);
  }
  const turb = smoothNoise(len, rng, 9);
  const air = gain(bp(whiteNoise(len, rng), (t) => 750 + 500 * turb(t), 0.9), (t) => 0.7 + 0.5 * turb(t * 1.7));
  const whine = gain(osc(len, 1580, { shape: 'sine' }), 0.05);
  const src = softClip(mixBufs(gain(eng, 0.75), gain(air, 0.9), whine), 2, 0.5);
  const out = flyBy(src, dur, { speed: 170, miss: 7.5, tc: dur * 0.46, spread: 0.95, air: 16000, curve: 1.2, pre });
  // air tear right at the pass
  const tear = env(bp(whiteNoise(0.25, rng), expTo(5200, 700, 0.18), 1.1), perc(0.02, 0.16));
  place(out, gain(tear, 0.3), { at: dur * 0.46 - 0.03, pan: 0.2 });
  return out;
}

/**
 * tie_scream — the ion-engine howl. A very resonant noise band is ring-modulated
 * to smash it into inharmonic sidebands, mixed with a distorted saw for the
 * screaming harmonics, then pushed through three sharp formant resonators. Every
 * frequency is multiplied by one doppler curve, so the whole scream glides down
 * as one voice while it sweeps across the stereo field.
 */
function tieScream({ dur, rng }) {
  const dop = seg([
    [0, 1.3],
    [dur * 0.4, 1.18],
    [dur * 0.55, 0.94],
    [dur, 0.58, 1.35],
  ]);
  const openness = (t) => Math.min(1, t / (dur * 0.45));
  // inharmonic core: high-Q band of noise, ring-modulated
  let core = svf(whiteNoise(dur, rng), (t) => dop(t) * (950 + 1150 * openness(t)), 7, 'bpq');
  core = norm1(core, 1);
  core = ringMod(core, (t) => dop(t) * (155 + 105 * Math.sin(TAU * 0.75 * t)), 0.92);
  // screaming harmonic stack
  let scr = osc(dur, (t) => dop(t) * 208 * (1 + 0.022 * Math.sin(TAU * 6.3 * t)), { shape: 'saw' });
  scr = softClip(scr, 5, 0.9);
  let voice = mixBufs(gain(core, 1), gain(scr, 0.5));
  voice = norm1(
    formants(voice, [
      { f: (t) => dop(t) * 830, q: 9, gain: 1 },
      { f: (t) => dop(t) * 2080, q: 12, gain: 0.8 },
      { f: (t) => dop(t) * 3450, q: 8, gain: 0.4 },
    ]),
    1
  );
  gain(voice, (t) => 1 + 0.3 * Math.sin(TAU * 47 * t)); // metallic rasp
  voice = softClip(voice, 3, 0.75);
  env(voice, seg([
    [0, 0],
    [0.18, 0.55, 0.8],
    [dur * 0.5, 1],
    [dur * 0.82, 0.5, 1.2],
    [dur, 0, 1.5],
  ]));
  const airy = env(bp(whiteNoise(dur, rng), (t) => dop(t) * 4300, 1.4), bell(dur, 0.4, 0.5));
  const dry = softClip(mixBufs(voice, gain(airy, 0.22)), 1.8, 0.4);
  const chs = [mono(dur), mono(dur)];
  place(chs, dry, { pan: (t) => clamp(-0.85 + (t / dur) * 1.7, -1, 1) });
  const wet = reverb(dry, { rt60: 0.85, mix: 0.22, damp: 0.45, size: 0.9 });
  return [mixBufs(chs[0], gain(wet[0], 0.35)), mixBufs(chs[1], gain(wet[1], 0.35))];
}

/**
 * xwing_flyby — same doppler machinery as ship_pass but heavier: a lower engine
 * fundamental, a punchier close-pass thump and a descending turbine whine.
 */
function xwingFlyby({ dur, rng }) {
  const pre = 0.55;
  const len = dur + pre;
  const eng = mono(len);
  for (const p of [
    { f: 41, g: 0.9, s: 'sine' },
    { f: 82, g: 0.7, s: 'saw' },
    { f: 123.5, g: 0.3, s: 'saw' },
    { f: 164, g: 0.14, s: 'sine' },
  ]) {
    add(eng, osc(len, p.f, { shape: p.s, phase: rng.f() }), 0, p.g);
  }
  const turb = smoothNoise(len, rng, 7);
  const air = gain(lp(pinkNoise(len, rng), (t) => 900 + 700 * turb(t)), (t) => 0.8 + 0.4 * turb(t * 1.3));
  const whine = mixBufs(
    gain(osc(len, (t) => 2250 - 240 * (t / len), { shape: 'sine' }), 0.14),
    gain(osc(len, (t) => 1490 - 150 * (t / len), { shape: 'sine' }), 0.09)
  );
  const src = softClip(mixBufs(gain(eng, 0.9), gain(air, 0.8), whine), 2.4, 0.6);
  const out = flyBy(src, dur, { speed: 145, miss: 6, tc: dur * 0.45, spread: 0.9, air: 12000, curve: 1.35, pre });
  const thump = env(osc(0.3, expTo(150, 48, 0.12), { shape: 'sine' }), perc(0.01, 0.2));
  place(out, gain(thump, 0.35), { at: dur * 0.45 - 0.02 });
  return out;
}

/**
 * hyperspace_jump — a rising whine (saw sweep plus a resonant band climbing four
 * octaves) that an accelerating flanger stretches, then the jump itself: a huge
 * noise swell whose filter slams down over a sine sub-drop, and a near-silent
 * reverb tail once the ship is gone.
 */
function hyperspaceJump({ dur, rng }) {
  const riseEnd = 1.15;
  // 1. rising whine
  let whine = mixBufs(
    gain(osc(dur, expTo(190, 3100, riseEnd), { shape: 'saw' }), 0.5),
    gain(osc(dur, (t) => expTo(190, 3100, riseEnd)(t) * 1.503, { shape: 'sine' }), 0.25)
  );
  whine = norm1(svf(whine, (t) => expTo(420, 5200, riseEnd)(t), 3, 'bpq'), 1);
  env(whine, seg([[0, 0], [0.1, 0.12], [riseEnd * 0.8, 0.7, 1.6], [riseEnd, 1], [riseEnd + 0.12, 0, 1.4]]));
  whine = flanger(whine, { hz: 1.3, lowMs: 0.4, highMs: 6, mix: 0.5, fb: 0.25 });
  // 2. the jump: noise swell collapsing into a sub drop
  const swell = env(
    svf(whiteNoise(dur, rng), seg([[0, 900], [riseEnd, 6500], [riseEnd + 0.35, 220, 1.6], [dur, 120]]), 1.2, 'lp'),
    seg([[0, 0.04], [riseEnd * 0.7, 0.25, 1.8], [riseEnd, 1], [riseEnd + 0.45, 0.12, 1.5], [dur, 0, 1.6]])
  );
  const sub = env(osc(dur, expTo(210, 28, 0.55), { shape: 'sine' }), perc(0.02, 0.9, 0.9));
  const subBuf = mono(dur);
  add(subBuf, softClip(gain(sub, 2.6), 2.2, 0.6), riseEnd - 0.05);
  // 3. departure thump and tail
  const thump = env(osc(0.5, expTo(90, 30, 0.2), { shape: 'sine' }), perc(0.004, 0.35));
  const thumpBuf = mono(dur);
  add(thumpBuf, gain(thump, 0.8), riseEnd + 0.1);
  const tail = env(lp(brownNoise(dur, rng), 200), seg([[0, 0], [riseEnd + 0.15, 0], [riseEnd + 0.3, 0.5], [dur, 0, 1.5]]));
  const dry = softClip(mixBufs(gain(whine, 0.55), gain(swell, 0.9), subBuf, thumpBuf, gain(tail, 0.4)), 1.7, 0.4);
  const wet = reverb(dry, { rt60: 2.4, mix: 0.28, damp: 0.4, size: 1.2 });
  return wet;
}

/**
 * pod_launch — explosive bolts fire (a hard metal clank over a thump), then the
 * pod's retro motor recedes: hiss whose low pass closes and level falls as the
 * distance grows, with the whole thing drifting off-centre.
 */
function podLaunch({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  // explosive bolt: sharp, ringing steel
  const ex = exciter(0.5, rng, { burst: 0.0025, tau: 0.0007 });
  // the upper modes carry most of the gain: a bolt firing is a bright steel
  // crack, and if the low modes dominate it turns into a dull thud instead
  const clank = env(
    modal(ex, [
      { f: 240, t60: 0.28, gain: 0.55 },
      { f: 447, t60: 0.2, gain: 0.6 },
      { f: 806, t60: 0.16, gain: 0.8 },
      { f: 1520, t60: 0.11, gain: 1 },
      { f: 2760, t60: 0.07, gain: 0.85 },
      { f: 4300, t60: 0.045, gain: 0.5 },
    ]),
    perc(0.0004, 0.34)
  );
  place(chs, norm1(clank, 1), { at: 0, gain: 1.7, pan: -0.1 });
  // enough sub to feel the charge go off, but not so much that the metal
  // disappears under it and the bolt turns into a soft thud
  place(chs, gain(env(osc(0.5, expTo(120, 44, 0.12), { shape: 'sine' }), perc(0.002, 0.32)), 0.8), { at: 0 });
  place(chs, gain(env(hp(whiteNoise(0.05, rng), 3200), perc(0.0006, 0.035)), 1.5), { at: 0 });
  place(chs, gain(env(hp(whiteNoise(0.02, rng), 7500), perc(0.0002, 0.012)), 0.9), { at: 0 });
  // receding rocket: hiss + rumble, both closing down and fading with distance.
  // It comes up over 140 ms and pulls away fast, so the bolt crack is heard on
  // its own first and stays the brightest moment of the launch.
  const away = (t) => Math.max(0.04, 1 / (1 + Math.pow(Math.max(0, t - 0.05) * 3.4, 1.6)));
  const turb = smoothNoise(dur, rng, 11);
  let hiss = svf(whiteNoise(dur, rng), (t) => 700 + 1700 * away(t) * (0.7 + 0.5 * turb(t)), 1.1, 'lp');
  gain(hiss, (t) => away(t) * (0.75 + 0.4 * turb(t * 1.4)) * seg([[0, 0], [0.14, 1, 1.4]])(t));
  const rumble = gain(lp(brownNoise(dur, rng), (t) => 130 + 220 * away(t)), (t) => away(t) * 0.9);
  const motor = softClip(mixBufs(gain(hiss, 0.9), rumble), 1.6, 0.35);
  place(chs, motor, { at: 0.03, gain: 0.85, pan: (t) => clamp(0.1 + t * 0.45, -1, 0.8) });
  const [dryL, dryR] = polish(chs, { thresh: -18, ratio: 3, ceil: -9 });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 1.3, mix: 0.2, damp: 0.5, size: 1.1 });
  return [mixBufs(dryL, gain(wet[0], 0.45)), mixBufs(dryR, gain(wet[1], 0.45))];
}

// ===========================================================================
// effects — interior / mechanical
// ===========================================================================

/**
 * door_blast — a charge blows a bulkhead door: detonation noise drives a bank of
 * long, inharmonic low modes (the steel plate itself ringing), then shrapnel
 * fragments scatter across the corridor's reverb.
 */
function doorBlast({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  const blast = boom(dur, rng, { hi: 4200, lo: 200, decay: 0.6, subF0: 84, subF1: 36, subDecay: 0.5, sub: 2.2 });
  place(chs, gain(Float32Array.from(blast), 0.9), { at: 0 });
  place(chs, gain(env(hp(whiteNoise(0.03, rng), 4000), perc(0.0012, 0.024)), 0.35), { at: 0 });
  // the door: a big steel plate rung by the blast
  const plate = env(
    modal(blast, [
      { f: 88, t60: 0.9, gain: 1 },
      { f: 131, t60: 0.75, gain: 0.8 },
      { f: 197, t60: 0.6, gain: 0.6 },
      { f: 263, t60: 0.45, gain: 0.45 },
      { f: 412, t60: 0.3, gain: 0.3 },
      { f: 655, t60: 0.2, gain: 0.18 },
    ]),
    perc(0.001, 1.2, 0.9)
  );
  place(chs, norm1(plate, 2.6), { at: 0.002, pan: -0.05 });
  // shrapnel
  for (let i = 0; i < 110; i++) {
    const t = rng.curved(0.04, dur - 0.2, 1.7);
    place(chs, metalClick(rng, { base: rng.range(700, 4200), t60: rng.range(0.02, 0.09) }), {
      at: t,
      gain: 0.18 * Math.exp(-t * 1.6) * rng.range(0.3, 1),
      pan: rng.range(-0.95, 0.95),
    });
  }
  const [dryL, dryR] = polish([softClip(chs[0], 1.5, 0.35), softClip(chs[1], 1.5, 0.35)], {
    thresh: -20,
    ratio: 3.5,
    ceil: -10,
  });
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 1.7, mix: 0.3, damp: 0.45, size: 1 });
  return [mixBufs(dryL, gain(wet[0], 0.5)), mixBufs(dryR, gain(wet[1], 0.5))];
}

/**
 * blast_door_open — pneumatics vent, then a heavy servo drags the door: low
 * noise through a comb (the rail's ring) chopped by a grind LFO, ending in a
 * clunk as it hits the stop.
 */
function blastDoorOpen({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  // pneumatic release
  let hissA = bp(whiteNoise(0.45, rng), expTo(2600, 1200, 0.35), 1.3);
  env(hissA, seg([[0, 0], [0.012, 1, 0.5], [0.12, 0.5], [0.4, 0.06, 1.5], [0.45, 0]]));
  place(chs, gain(hissA, 0.75), { at: 0, pan: -0.25 });
  place(chs, gain(env(hp(whiteNoise(0.2, rng), 6000), perc(0.004, 0.14)), 0.3), { at: 0.004, pan: 0.3 });
  // servo slide: grinding low noise on a comb, ramping up then easing off
  const slideLen = 0.8;
  let slide = lp(pinkNoise(slideLen, rng), (t) => 260 + 420 * seg([[0, 0], [0.3, 1], [slideLen, 0.5]])(t), 1.2);
  slide = combFB(slide, 0.0081, { fb: 0.62, damp: 0.35 });
  gain(slide, (t) => (0.55 + 0.45 * Math.sin(TAU * 27 * t)) * seg([[0, 0], [0.1, 1, 0.7], [slideLen - 0.12, 0.9], [slideLen, 0, 1.4]])(t));
  const motor = env(osc(slideLen, linTo(58, 74, slideLen * 0.6), { shape: 'saw' }), seg([[0, 0], [0.08, 0.5], [slideLen - 0.1, 0.45], [slideLen, 0]]));
  place(chs, softClip(mixBufs(norm1(slide, 0.9), gain(motor, 0.35)), 1.8, 0.4), { at: 0.1, gain: 0.85 });
  // it hits the stop
  const clunk = env(
    modal(exciter(0.4, rng, { burst: 0.004, tau: 0.0012 }), [
      { f: 108, t60: 0.3, gain: 1 },
      { f: 167, t60: 0.22, gain: 0.7 },
      { f: 246, t60: 0.15, gain: 0.45 },
      { f: 520, t60: 0.07, gain: 0.25 },
    ]),
    perc(0.001, 0.34)
  );
  place(chs, norm1(clunk, 1.5), { at: 0.95 });
  place(chs, gain(env(osc(0.3, expTo(95, 42, 0.1), { shape: 'sine' }), perc(0.003, 0.2)), 1.1), { at: 0.95 });
  const wet = reverb(mixBufs(chs[0], chs[1]), { rt60: 1.2, mix: 0.24, damp: 0.5, size: 0.9 });
  return [mixBufs(chs[0], gain(wet[0], 0.45)), mixBufs(chs[1], gain(wet[1], 0.45))];
}

/**
 * footsteps_troopers — a squad marching on a metal deck. One boot is a low body
 * thump, a mid smack and a hollow deck ring; five troopers land a few tens of
 * milliseconds apart so the beat sounds like a squad rather than one giant. All
 * steps are mixed in circularly, so the tails wrap and the loop is exact.
 */
function footstepsTroopers({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  const beats = 6;
  const period = dur / beats;
  const boot = (weight) => {
    const len = 0.45;
    const body = env(osc(len, expTo(88 * weight, 52 * weight, 0.07), { shape: 'sine' }), perc(0.002, 0.11));
    const smack = env(bp(whiteNoise(len, rng), expTo(1500, 500, 0.05), 1.1), perc(0.001, 0.05));
    const leather = env(lp(whiteNoise(len, rng), 2600), perc(0.001, 0.03));
    const deck = env(
      modal(exciter(len, rng, { burst: 0.0015, tau: 0.0004, click: 0.8 }), [
        { f: 318 * weight, t60: 0.13, gain: 1 },
        { f: 545 * weight, t60: 0.09, gain: 0.55 },
        { f: 837 * weight, t60: 0.06, gain: 0.3 },
      ]),
      perc(0.0006, 0.16)
    );
    return norm1(mixBufs(gain(body, 1.4), gain(smack, 0.7), gain(leather, 0.4), gain(deck, 0.55)), 1);
  };
  // five troopers, each with a fixed offset from the beat and their own weight
  const squad = [
    { off: 0, g: 1, pan: -0.1, w: 1 },
    { off: 0.019, g: 0.75, pan: 0.35, w: 1.12 },
    { off: -0.014, g: 0.62, pan: -0.45, w: 0.9 },
    { off: 0.034, g: 0.5, pan: 0.6, w: 1.24 },
    { off: 0.049, g: 0.34, pan: -0.7, w: 0.82 },
  ];
  for (let b = 0; b < beats; b++) {
    for (const s of squad) {
      const jitter = rng.range(-0.006, 0.006);
      place(chs, boot(s.w * rng.range(0.98, 1.02)), {
        at: b * period + s.off + jitter,
        gain: s.g * rng.range(0.85, 1.05) * 0.5,
        pan: s.pan,
        wrap: true,
      });
    }
  }
  // deck ambience: a hollow metal room, rendered circularly by reverbing the
  // already-wrapped signal twice as long and folding the tail back on itself
  const stepsL = polish([chs[0]], { thresh: -24, ratio: 3, attack: 0.004, release: 0.12, ceil: -12 })[0];
  const stepsR = polish([chs[1]], { thresh: -24, ratio: 3, attack: 0.004, release: 0.12, ceil: -12 })[0];
  const both = mixBufs(stepsL, stepsR);
  const wet = reverb(mixBufs(both, both), { rt60: 1.1, mix: 0.28, damp: 0.5, size: 1 });
  const foldedL = mono(dur);
  const foldedR = mono(dur);
  addWrap(foldedL, wet[0], 0, 0.4);
  addWrap(foldedR, wet[1], 0, 0.4);
  return [mixBufs(stepsL, foldedL), mixBufs(stepsR, foldedR)];
}

/**
 * vader_breath — the respirator. Each 2 s cycle is a sharp resonant intake and a
 * darker, longer exhale: noise through moving formant resonators (the mask),
 * a short comb for the hollowness of the tube, a chest rumble under the exhale
 * and a faint valve flutter. Cycles are mixed in circularly so the exhale tail
 * wraps onto the next intake and the file loops seamlessly.
 */
function vaderBreath({ dur, rng }) {
  const period = dur / 2;
  const out = mono(dur);

  const inhale = (r) => {
    const len = 0.95;
    const nz = whiteNoise(len, r);
    // the mask: rising formants, because a sharp intake gets brighter
    let air = formants(nz, [
      { f: linTo(430, 760, 0.62), q: 3.2, gain: 1 },
      { f: linTo(1120, 1700, 0.62), q: 4.5, gain: 0.34 },
      { f: 2650, q: 6, gain: 0.09 },
    ]);
    add(air, lp(nz, 320), 0, 0.8);
    air = combFB(air, 0.0023, { fb: 0.45, damp: 0.35 }); // hollow tube
    env(air, seg([[0, 0], [0.085, 1, 0.55], [0.34, 0.72], [0.62, 0.06, 1.7], [len, 0]]));
    gain(air, (t) => 1 + 0.11 * Math.sin(TAU * 33 * t)); // valve flutter
    return norm1(air, 1);
  };

  const exhale = (r) => {
    const len = 1.1;
    const nz = whiteNoise(len, r);
    let air = formants(nz, [
      { f: linTo(300, 210, 0.85), q: 2.6, gain: 1 },
      { f: linTo(680, 480, 0.85), q: 3.6, gain: 0.4 },
      { f: linTo(1450, 1150, 0.85), q: 5, gain: 0.12 },
    ]);
    add(air, lp(nz, 240), 0, 1.1);
    air = combFB(air, 0.0031, { fb: 0.4, damp: 0.45 });
    env(air, seg([[0, 0], [0.16, 0.95, 0.7], [0.5, 0.85], [0.9, 0.05, 1.6], [len, 0]]));
    gain(air, (t) => 1 + 0.07 * Math.sin(TAU * 21 * t));
    const chest = env(osc(len, linTo(64, 56, 0.9), { shape: 'sine' }), seg([[0, 0], [0.2, 0.5], [0.85, 0.1], [len, 0]]));
    return norm1(mixBufs(norm1(air, 1), gain(chest, 0.35)), 1);
  };

  for (let c = 0; c < 2; c++) {
    const r = new Rng(9100 + c * 37);
    const cyc = mono(period + 0.5);
    add(cyc, inhale(r), 0.03, 0.9);
    add(cyc, exhale(r), 1.0, 1.0);
    // helmet: a small, dark space
    const wet = reverb(cyc, { rt60: 0.5, mix: 0.22, damp: 0.6, size: 0.6, stereo: false })[0];
    addWrap(out, softClip(wet, 1.4, 0.3), c * period, 1);
  }
  return out;
}

/**
 * saber_on — ignition: an electrical snap, then the blade extends as the hum's
 * fundamental sweeps up and a band of hiss opens out, settling into the steady
 * hum so a `saber_hum` loop can take over.
 */
function saberOn({ dur, rng }) {
  // snap
  const ex = exciter(0.3, rng, { burst: 0.0018, tau: 0.0004 });
  const snap = env(
    modal(ex, [
      { f: 2850, t60: 0.05, gain: 1 },
      { f: 4400, t60: 0.03, gain: 0.6 },
      { f: 1450, t60: 0.07, gain: 0.5 },
    ]),
    perc(0.0004, 0.09)
  );
  const crack = env(hp(whiteNoise(0.05, rng), 4200), perc(0.0004, 0.035));
  // ignition sweep into a steady hum
  const fFn = (t) => 52 * Math.pow(105 / 52, clamp(t / 0.3, 0, 1)) * (1 + 0.012 * Math.sin(TAU * 4.5 * t));
  let hum = mono(dur);
  for (const p of [
    { m: 1, g: 0.5, s: 'saw' },
    { m: 1.5, g: 0.3, s: 'sine' },
    { m: 2, g: 0.22, s: 'saw' },
    { m: 3.01, g: 0.12, s: 'sine' },
  ]) {
    add(hum, osc(dur, (t) => fFn(t) * p.m, { shape: p.s }), 0, p.g);
  }
  hum = softClip(svf(hum, (t) => 400 + 900 * clamp(t / 0.35, 0, 1), 2.5, 'lp'), 2.2, 0.5);
  env(hum, seg([[0, 0], [0.03, 0.35, 0.6], [0.3, 1], [0.45, 0.85], [dur, 0.8]]));
  const hiss = env(bp(whiteNoise(dur, rng), expTo(420, 1300, 0.32), 1.6), seg([[0, 0], [0.02, 0.5], [0.3, 1], [dur, 0.7]]));
  // a few electrical spits as the emitter settles
  const spits = mono(dur);
  for (let i = 0; i < 9; i++) {
    const t = rng.curved(0.01, 0.55, 1.5);
    add(spits, env(hp(whiteNoise(0.03, rng), rng.range(2500, 7000)), perc(0.0004, rng.range(0.004, 0.02))), t, rng.range(0.1, 0.35));
  }
  const dry = softClip(
    mixBufs(gain(snap, 1), gain(crack, 0.8), shelfHi(gain(hum, 0.8), 500, 0.5), gain(hiss, 0.5), gain(spits, 0.7)),
    1.6,
    0.35
  );
  const wet = reverb(dry, { rt60: 0.7, mix: 0.18, damp: 0.5, size: 0.8 });
  return wet;
}

/**
 * saber_hum — the idling blade. Detuned harmonics (all exact multiples of 1/dur
 * so the tone closes the loop), three slow vibratos beating against each other
 * for the waver, a resonant band for the electric edge and a whisper of plasma
 * hiss. Saturation fills in the harmonics.
 */
function saberHum({ dur, rng }) {
  const X = 0.5;
  const F = (hz) => Math.round(hz * dur) / dur;
  const wob = (t) =>
    1 +
    0.017 * Math.sin(TAU * F(3.25) * t) +
    0.009 * Math.sin(TAU * F(5.75) * t + 1.2) +
    0.005 * Math.sin(TAU * F(1.25) * t + 2.4);
  return loopBed(dur, X, (d) => {
    const tone = mono(d);
    for (const p of [
      { f: F(48.75), g: 0.16, s: 'sine' },
      { f: F(97.5), g: 0.45, s: 'saw' },
      { f: F(146.25), g: 0.34, s: 'sine' },
      { f: F(195.25), g: 0.28, s: 'saw' },
      { f: F(292.75), g: 0.2, s: 'sine' },
      { f: F(390.5), g: 0.13, s: 'saw' },
      { f: F(585.5), g: 0.07, s: 'saw' },
    ]) {
      add(tone, osc(d, (t) => p.f * wob(t), { shape: p.s, phase: rng.f() }), 0, p.g);
    }
    let v = softClip(tone, 2.6, 0.6);
    // electric edge: a resonant band drifting slowly
    const edge = norm1(svf(v, (t) => 900 + 280 * Math.sin(TAU * F(0.75) * t), 5, 'bpq'), 0.7);
    const edge2 = norm1(svf(v, (t) => 1750 + 420 * Math.sin(TAU * F(1.25) * t + 1), 7, 'bpq'), 0.35);
    const hiss = gain(bp(whiteNoise(d, rng), (t) => 3200 + 900 * Math.sin(TAU * F(1.5) * t), 1.2), (t) => 0.12 + 0.06 * Math.sin(TAU * F(2.25) * t));
    v = mixBufs(gain(lp(v, 3200), 0.8), edge, edge2, hiss);
    gain(v, (t) => 0.88 + 0.12 * Math.sin(TAU * F(4.5) * t) * Math.sin(TAU * F(7.25) * t));
    return toStereo(softClip(v, 1.5, 0.3), 0.25);
  });
}

// ===========================================================================
// effects — droids
// ===========================================================================

/**
 * One astromech blip: a glide between two pitches with vibrato, a sine plus a
 * whisper of its second harmonic for a bell-ish electronic timbre, and a little
 * band of noise riding the pitch so it chirps rather than beeps.
 */
function droidBlip(len, rng, { f0, f1, shape = 'sine', vib = 7, vibDepth = 0.03, curve = 1, noise = 0.06, atk = 0.007 }) {
  const fFn = (t) =>
    f0 * Math.pow(f1 / f0, Math.pow(clamp(t / len, 0, 1), curve)) * (1 + vibDepth * Math.sin(TAU * vib * t));
  const v = mixBufs(
    gain(osc(len, fFn, { shape }), 0.8),
    gain(osc(len, (t) => fFn(t) * 2.01, { shape: 'sine' }), 0.16)
  );
  if (noise > 0) add(v, norm1(bp(whiteNoise(len, rng), (t) => fFn(t) * 2, 3), noise), 0, 1);
  env(v, seg([[0, 0], [atk, 1, 0.6], [len * 0.72, 0.85], [len, 0, 1.5]]));
  return v;
}

/** Shared tail for the droid voices: a slap-back and a small bright room. */
function droidSpace(dry, { delay = 0.075, rt60 = 0.5 } = {}) {
  const slapped = echo(dry, delay, { fb: 0.25, mix: 0.22, damp: 0.4 });
  const wet = reverb(slapped, { rt60, mix: 0.2, damp: 0.45, size: 0.7, wetHp: 200 });
  return wet;
}

/** Render a list of [at, len, f0, f1, opts] blips into one buffer. */
function blipSequence(dur, rng, notes) {
  const out = mono(dur);
  for (const [at, len, f0, f1, opts = {}] of notes) {
    add(out, droidBlip(len, rng, { f0, f1, ...opts }), at, opts.gain ?? 1);
  }
  return out;
}

/** r2_beeps_a — curious and upbeat: short rising blips ending in an excited run. */
function r2BeepsA({ dur, rng }) {
  const dry = blipSequence(dur, rng, [
    [0.0, 0.1, 660, 990, { gain: 0.8 }],
    [0.13, 0.09, 880, 1320, { gain: 0.85 }],
    [0.25, 0.15, 1175, 1760, { vib: 9, gain: 0.9 }],
    [0.44, 0.07, 1568, 1319, { gain: 0.6 }],
    [0.54, 0.22, 784, 2093, { vib: 11, vibDepth: 0.05, curve: 1.6, gain: 0.9 }],
    [0.8, 0.1, 1319, 1046, { gain: 0.7 }],
    [0.93, 0.14, 988, 1568, { shape: 'square', gain: 0.45 }],
    [1.12, 0.34, 1046, 2349, { vib: 8, vibDepth: 0.04, curve: 1.8, gain: 1 }],
  ]);
  return droidSpace(softClip(dry, 1.4, 0.3));
}

/** r2_beeps_b — chatty: mixed contours, a square-wave warble, a sing-song end. */
function r2BeepsB({ dur, rng }) {
  const dry = blipSequence(dur, rng, [
    [0.0, 0.07, 1568, 1175, { gain: 0.7 }],
    [0.09, 0.07, 1319, 988, { gain: 0.7 }],
    [0.18, 0.12, 880, 1319, { gain: 0.85 }],
    [0.33, 0.18, 1046, 1046, { shape: 'square', vib: 13, vibDepth: 0.09, gain: 0.5 }],
    [0.55, 0.1, 1760, 1480, { gain: 0.75 }],
    [0.68, 0.09, 1175, 1568, { gain: 0.7 }],
    [0.8, 0.26, 1568, 660, { curve: 1.4, vib: 6, gain: 0.9 }],
    [1.1, 0.11, 784, 1046, { gain: 0.7 }],
    [1.24, 0.09, 1319, 1568, { gain: 0.65 }],
    [1.36, 0.38, 988, 1760, { vib: 7.5, vibDepth: 0.05, curve: 1.5, gain: 0.95 }],
  ]);
  return droidSpace(softClip(dry, 1.4, 0.3));
}

/** r2_beeps_worried — falling, wobbling, slower: a droid that has read the odds. */
function r2BeepsWorried({ dur, rng }) {
  const dry = blipSequence(dur, rng, [
    [0.0, 0.16, 880, 660, { vib: 5, vibDepth: 0.05, gain: 0.8 }],
    [0.2, 0.14, 740, 554, { vib: 5.5, vibDepth: 0.06, gain: 0.75 }],
    [0.38, 0.2, 622, 440, { vib: 4.5, vibDepth: 0.07, curve: 1.3, gain: 0.85 }],
    [0.62, 0.12, 494, 466, { shape: 'square', vib: 9, vibDepth: 0.1, gain: 0.4 }],
    [0.78, 0.18, 587, 392, { vib: 4, vibDepth: 0.08, gain: 0.8 }],
    [1.0, 0.55, 523, 233, { vib: 3.4, vibDepth: 0.09, curve: 1.7, gain: 1 }],
  ]);
  return droidSpace(softClip(dry, 1.4, 0.3), { delay: 0.09, rt60: 0.6 });
}

/**
 * hologram_on — the projector strikes: bit-crushed electrical crackle, then a
 * shimmering chord of detuned high sines, flanged and reverberant, settling into
 * a steady glow.
 */
function hologramOn({ dur, rng }) {
  const crackle = mono(dur);
  // a few big arcs on a coarse grid so they are heard as separate snaps rather
  // than one fizz, plus a fine spray of sparks filling in between them
  for (const [t, g] of [[0.004, 1], [0.055, 0.8], [0.115, 0.95], [0.185, 0.6], [0.26, 0.5]]) {
    const arc = bitcrush(env(hp(whiteNoise(0.05, rng), rng.range(1800, 3600)), perc(0.0002, rng.range(0.008, 0.02))), 4, 3);
    add(crackle, arc, t + rng.range(-0.006, 0.006), g);
  }
  for (let i = 0; i < 26; i++) {
    const t = rng.curved(0, 0.34, 1.5);
    const g = bitcrush(env(hp(whiteNoise(0.02, rng), rng.range(2200, 7000)), perc(0.0003, rng.range(0.002, 0.012))), 4, 3);
    add(crackle, g, t, rng.range(0.2, 0.6) * Math.exp(-t * 3.4));
  }
  // shimmering resonant chord
  const shimmer = mono(dur);
  for (const p of [
    { f: 620, g: 0.5 },
    { f: 932, g: 0.36 },
    { f: 1244, g: 0.26 },
    { f: 1866, g: 0.14 },
    { f: 2489, g: 0.08 },
  ]) {
    add(
      shimmer,
      osc(dur, (t) => p.f * (1 + 0.004 * Math.sin(TAU * 5.3 * t + p.f) + 0.02 * clamp(1 - t / 0.35, 0, 1)), {
        shape: 'sine',
      }),
      0,
      p.g
    );
  }
  gain(shimmer, (t) => (0.8 + 0.2 * Math.sin(TAU * 7.1 * t)) * (0.85 + 0.15 * Math.sin(TAU * 11.3 * t)));
  // the tone only really arrives once the arcing has died down
  env(shimmer, seg([[0, 0], [0.1, 0.08], [0.42, 1, 1.3], [0.65, 0.78], [dur, 0.34, 1.4]]));
  const air = env(bp(whiteNoise(dur, rng), 4200, 1.5), seg([[0, 0], [0.28, 0.5], [dur, 0.12, 1.4]]));
  let dry = mixBufs(gain(crackle, 1.5), gain(shimmer, 0.75), gain(air, 0.15));
  dry = flanger(dry, { hz: 0.9, lowMs: 0.5, highMs: 4, mix: 0.35, fb: 0.2 });
  return reverb(dry, { rt60: 1.4, mix: 0.3, damp: 0.35, size: 1, wetHp: 300 });
}

/**
 * computer_beeps — cockpit console chatter: four terse bit-crushed square blips
 * on fixed pitches with a tiny panel click on each, in a dry little cabin.
 */
function computerBeeps({ dur, rng }) {
  const dry = mono(dur);
  const notes = [
    [0.0, 0.075, 1320, 0.9],
    [0.14, 0.06, 990, 0.75],
    [0.42, 0.07, 1760, 0.8],
    [0.56, 0.055, 1480, 0.6],
    [0.85, 0.09, 1108, 0.85],
  ];
  for (const [at, len, f, g] of notes) {
    let v = osc(len, f * (1 + 0.002), { shape: 'square', pw: 0.45 });
    v = bitcrush(v, 6, 2);
    env(v, seg([[0, 0], [0.004, 1], [len - 0.008, 0.95], [len, 0, 1.4]]));
    add(dry, lp(v, 6500), at, g * 0.55);
    add(dry, env(hp(whiteNoise(0.01, rng), 5000), perc(0.0003, 0.006)), at, 0.12);
  }
  return reverb(softClip(dry, 1.3, 0.25), { rt60: 0.32, mix: 0.14, damp: 0.5, size: 0.5, wetHp: 400 });
}

// ===========================================================================
// effects — world
// ===========================================================================

/** Formant triples (F1,F2,F3) for the vowel-ish layers of crowds and Jawas. */
const VOWELS = {
  a: [730, 1090, 2440],
  e: [530, 1840, 2480],
  i: [270, 2290, 3010],
  o: [570, 840, 2410],
  u: [300, 870, 2240],
};

/**
 * wind_desert — dry gusting wind. Four beds share the same periodic gust LFOs
 * (so the movement closes the loop) but use independent noise per channel, which
 * gives a wide, natural stereo image: a band-passed body that swells with the
 * gusts, sand hiss, a thin whistle round an edge and a low dune rumble.
 */
function windDesert({ dur, rng }) {
  const X = 1.4;
  const g1 = periodicNoise(dur, rng, { partials: 6, lowHz: 0.12, highHz: 0.62 });
  const g2 = periodicNoise(dur, rng, { partials: 5, lowHz: 0.25, highHz: 1.1 });
  const g3 = periodicNoise(dur, rng, { partials: 4, lowHz: 0.1, highHz: 0.4 });
  const side = (seed) => (d) => {
    const r = new Rng(seed);
    const body = gain(svf(pinkNoise(d, r), (t) => 300 * Math.pow(3.8, g1(t)), 1.1, 'bp'), (t) => 0.22 + 0.78 * Math.pow(g1(t), 1.4));
    const hiss = gain(hp(whiteNoise(d, r), 2600), (t) => 0.05 + 0.28 * Math.pow(g2(t), 2));
    const whistle = norm1(svf(whiteNoise(d, r), (t) => 1500 + 950 * g3(t), 17, 'bpq'), 1);
    gain(whistle, (t) => 0.04 + 0.22 * Math.pow(g3(t), 3));
    // the dunes rumble under it, but only just: this is dry, thin desert air
    const low = gain(lp(brownNoise(d, r), 130), (t) => 0.45 + 0.55 * g2(t));
    return softClip(mixBufs(gain(body, 1.15), gain(hiss, 0.4), whistle, gain(low, 0.34)), 1.4, 0.25);
  };
  return [loopBedMono(dur, X, side(4401)), loopBedMono(dur, X, side(4402))];
}

/**
 * sandcrawler — a mining crawler grinding across the waste. Continuous beds
 * (comb-filtered tread grind, diesel rumble, a creaking metal resonance) are
 * loop-crossfaded, while the engine chugs and hull clanks are wrap-mixed on an
 * exact per-loop grid so the rhythm never stutters at the seam.
 */
const CHUG_HZ = 4; // sandcrawler engine chugs per second
function sandcrawler({ dur, rng }) {
  const X = 1.0;
  const grind = periodicNoise(dur, rng, { partials: 6, lowHz: 0.4, highHz: 2.3 });
  const creak = periodicNoise(dur, rng, { partials: 3, lowHz: 0.12, highHz: 0.45 });
  const chs = loopBed(dur, X, (d) => {
    const r = new Rng(4502);
    let treads = combFB(hp(pinkNoise(d, r), 220), 0.0034, { fb: 0.6, damp: 0.3 });
    treads = norm1(treads, 1);
    gain(treads, (t) => 0.3 + 0.7 * Math.pow(grind(t), 1.3));
    const diesel = gain(lp(brownNoise(d, r), (t) => 105 + 70 * grind(t)), 0.45);
    const groan = norm1(svf(whiteNoise(d, r), (t) => 155 + 250 * creak(t), 18, 'bpq'), 0.6);
    // shale crunching under the treads
    const crunch = gain(bp(whiteNoise(d, r), (t) => 1400 + 900 * grind(t), 1.2), (t) => 0.05 + 0.1 * Math.pow(grind(t), 1.5));
    const dust = gain(hp(whiteNoise(d, r), 4200), (t) => 0.012 + 0.03 * grind(t));
    return toStereo(softClip(mixBufs(shelfLo(gain(treads, 0.75), 400, 0.6), gain(diesel, 0.8), groan, crunch, dust), 1.8, 0.4), 0.4);
  });
  // engine chugs: exact count per loop, wrap-mixed. Each one has to die away
  // before the next arrives or the rhythm smears into the diesel bed.
  const chugs = Math.round(dur * CHUG_HZ);
  for (let i = 0; i < chugs; i++) {
    const len = 0.24;
    const body = env(osc(len, expTo(64, 43, 0.05), { shape: 'saw' }), perc(0.004, 0.065));
    const knock = env(
      modal(exciter(len, rng, { burst: 0.001, tau: 0.0004, click: 0.6 }), [
        { f: 188, t60: 0.05, gain: 1 },
        { f: 331, t60: 0.03, gain: 0.5 },
      ]),
      perc(0.001, 0.055)
    );
    const puff = env(lp(whiteNoise(len, rng), 900), perc(0.003, 0.045));
    const chug = norm1(softClip(mixBufs(gain(body, 1), gain(knock, 0.5), gain(puff, 0.3)), 2, 0.5), 1);
    place(chs, chug, {
      at: (i * dur) / chugs + rng.range(-0.005, 0.005),
      gain: 1.25 * rng.range(0.9, 1.08),
      pan: rng.range(-0.2, 0.2),
      wrap: true,
    });
  }
  // hull clanks as the treads bite
  for (let i = 0; i < Math.round(dur * 1.4); i++) {
    place(chs, metalClick(rng, { base: rng.range(150, 700), t60: rng.range(0.12, 0.4) }), {
      at: rng.range(0, dur),
      gain: rng.range(0.06, 0.2),
      pan: rng.range(-0.7, 0.7),
      wrap: true,
    });
  }
  return chs;
}

/**
 * jawa_chatter — gibberish squeaks: a buzzy pulse source with a fast pitch
 * contour driven through vowel formants shifted up a third (a very small vocal
 * tract), cut into syllables with consonant noise bursts on the attacks. Two
 * short utterances, the second ending on a rising "question".
 */
function jawaChatter({ dur, rng }) {
  const dry = mono(dur);
  const syllable = (len, f0, f1, vowel, next) => {
    const fFn = (t) => lerp(f0, f1, Math.pow(clamp(t / len, 0, 1), 1.2)) * (1 + 0.035 * Math.sin(TAU * 12 * t));
    const src = mixBufs(gain(osc(len, fFn, { shape: 'pulse', pw: 0.22 }), 0.8), gain(osc(len, fFn, { shape: 'saw' }), 0.3));
    const sc = 1.35; // small creature: formants shifted up
    const morph = (i) => (t) => lerp(vowel[i], next[i], clamp(t / len, 0, 1)) * sc;
    let v = formants(src, [
      { f: morph(0), q: 8, gain: 1 },
      { f: morph(1), q: 11, gain: 0.6 },
      { f: morph(2), q: 13, gain: 0.28 },
    ]);
    v = norm1(v, 1);
    env(v, seg([[0, 0], [0.012, 1, 0.6], [len * 0.7, 0.8], [len, 0, 1.5]]));
    // consonant
    add(v, env(bp(whiteNoise(0.03, rng), rng.range(1800, 4500), 2), perc(0.001, 0.014)), 0, 0.25);
    return v;
  };
  const V = VOWELS;
  const utterance = (t0, syls, rise) => {
    let t = t0;
    for (let i = 0; i < syls; i++) {
      const len = rng.range(0.07, 0.15);
      const base = rng.range(420, 600) * (rise ? 1 + (0.5 * i) / syls : 1);
      const a = rng.pick([V.u, V.i, V.e, V.a, V.o]);
      const b = rng.pick([V.i, V.e, V.u, V.a]);
      add(dry, syllable(len, base, base * rng.range(0.8, 1.5), a, b), t, rng.range(0.6, 1));
      t += len + rng.range(0.01, 0.05);
    }
    return t;
  };
  const end1 = utterance(0.02, 4, false);
  utterance(end1 + 0.16, 5, true);
  return reverb(softClip(dry, 1.5, 0.3), { rt60: 0.5, mix: 0.18, damp: 0.5, size: 0.8, wetHp: 250 });
}

/**
 * crowd_cheer — a hall of voices. Applause is hundreds of short band-passed
 * noise claps whose density follows the swell; the roar underneath is eighteen
 * independent formant "voices" on random pitches with vibrato and glides. A long
 * hall reverb glues them into one crowd.
 */
function crowdCheer({ dur, rng }) {
  const chs = [mono(dur), mono(dur)];
  const swell = seg([
    [0, 0.05],
    [0.55, 0.85, 0.8],
    [1.6, 1],
    [3.2, 0.78],
    [dur, 0.34, 1.3],
  ]);
  // applause
  let t = 0;
  while (t < dur - 0.05) {
    const density = 26 + 120 * swell(t);
    const clap = norm1(env(bp(whiteNoise(0.03, rng), rng.range(1300, 4200), 1.5), perc(0.0006, rng.range(0.005, 0.02))), 1);
    place(chs, clap, { at: t, gain: 0.2 * swell(t) * rng.range(0.35, 1.15), pan: rng.range(-1, 1) });
    t += (1 / density) * rng.range(0.35, 1.7);
  }
  // voices
  for (let v = 0; v < 18; v++) {
    const r = new Rng(4700 + v * 13);
    const f0 = r.range(150, 350);
    const vibHz = r.range(4.4, 7.2);
    const glide = smoothNoise(dur, r, 0.7);
    const src = osc(dur, (tt) => f0 * (1 + 0.025 * Math.sin(TAU * vibHz * tt) + 0.16 * (glide(tt) - 0.5)), {
      shape: 'saw',
    });
    const vw = r.pick([VOWELS.a, VOWELS.e, VOWELS.o, VOWELS.a]);
    const sc = r.range(0.92, 1.18);
    let voice = formants(src, [
      { f: vw[0] * sc, q: 8, gain: 1 },
      { f: vw[1] * sc, q: 10, gain: 0.45 },
      { f: vw[2] * sc, q: 12, gain: 0.18 },
    ]);
    add(voice, norm1(bp(whiteNoise(dur, r), 2200, 1.2), 0.1), 0, 1);
    voice = norm1(voice, 1);
    const on = r.range(0, 1.2);
    const off = r.range(2.6, dur);
    env(voice, (tt) => swell(tt) * seg([[on - 0.35, 0], [on, 1, 0.7], [off, 0.8], [off + 0.6, 0, 1.4]])(tt) * (0.7 + 0.3 * glide(tt * 1.7)));
    place(chs, voice, { gain: 0.16 * r.range(0.5, 1.2), pan: r.range(-0.95, 0.95) });
  }
  const dryL = softClip(chs[0], 1.5, 0.3);
  const dryR = softClip(chs[1], 1.5, 0.3);
  const wet = reverb(mixBufs(dryL, dryR), { rt60: 2.1, mix: 0.34, damp: 0.4, size: 1.5, wetHp: 120 });
  return [mixBufs(dryL, gain(wet[0], 0.5)), mixBufs(dryR, gain(wet[1], 0.5))];
}

/**
 * ceremony_ambience — the quiet before the medals: a big reverberant hall tone.
 * Barely-moving filtered noise, two faint standing-wave modes and a distant
 * unintelligible murmur, all drowned in a long reverb inside the loop bed so the
 * tail joins the head.
 */
function ceremonyAmbience({ dur, rng }) {
  const X = 1.4;
  const drift = periodicNoise(dur, rng, { partials: 4, lowHz: 0.1, highHz: 0.35 });
  const drift2 = periodicNoise(dur, rng, { partials: 3, lowHz: 0.15, highHz: 0.5 });
  const F = (hz) => Math.round(hz * dur) / dur;
  return loopBed(dur, X, (d) => {
    const r = new Rng(4801);
    const body = gain(svf(pinkNoise(d, r), (t) => 230 + 180 * drift(t), 0.9, 'lp'), (t) => 0.8 + 0.3 * drift(t));
    const airy = gain(bp(whiteNoise(d, r), (t) => 2600 + 700 * drift2(t), 0.8), 0.05);
    // faint room modes
    const modes = mono(d);
    add(modes, osc(d, F(55), { shape: 'sine' }), 0, 0.1);
    add(modes, osc(d, F(82.5), { shape: 'sine' }), 0, 0.06);
    add(modes, osc(d, F(110.25), { shape: 'sine' }), 0, 0.03);
    gain(modes, (t) => 0.7 + 0.3 * drift2(t));
    // distant murmur, far too reverberant to make out
    const murmur = mono(d);
    for (let v = 0; v < 5; v++) {
      const rr = new Rng(4810 + v * 7);
      const f0 = rr.range(120, 240);
      const src = osc(d, (t) => f0 * (1 + 0.02 * Math.sin(TAU * rr.range(3, 6) * t)), { shape: 'saw' });
      const vw = rr.pick([VOWELS.o, VOWELS.u, VOWELS.a]);
      const vv = norm1(formants(src, [
        { f: vw[0], q: 7, gain: 1 },
        { f: vw[1], q: 9, gain: 0.4 },
      ]), 1);
      const gate = periodicNoise(d, rr, { partials: 5, lowHz: 0.4, highHz: 1.6 });
      add(murmur, gain(vv, (t) => 0.05 * Math.pow(gate(t), 2.5)), 0, 1);
    }
    const dry = mixBufs(gain(body, 0.55), airy, modes, murmur);
    return reverb(dry, { rt60: 3.2, mix: 0.75, damp: 0.62, size: 1.7, wetHp: 70 });
  });
}

// ===========================================================================
// effects — stingers
// ===========================================================================

/**
 * impact_hit — cinematic punctuation: a saturated sine drop from 120 Hz into the
 * sub, a mid thwack for the initial contact and a long reverberant tail.
 */
function impactHit({ dur, rng }) {
  const sub = env(osc(dur, expTo(120, 33, 0.4), { shape: 'sine' }), perc(0.004, 0.75, 0.9));
  const sub2 = env(osc(dur, expTo(62, 26, 0.6), { shape: 'sine' }), perc(0.01, 0.9, 0.9));
  const thwack = env(bp(whiteNoise(0.2, rng), expTo(2400, 400, 0.1), 1.1), perc(0.0015, 0.11));
  const knock = env(bp(whiteNoise(0.3, rng), expTo(700, 220, 0.15), 1, 'bp'), perc(0.002, 0.22));
  const body = env(
    modal(exciter(dur, rng, { burst: 0.003, tau: 0.001 }), [
      { f: 58, t60: 0.8, gain: 1 },
      { f: 93, t60: 0.55, gain: 0.6 },
      { f: 149, t60: 0.35, gain: 0.3 },
    ]),
    perc(0.001, 0.9)
  );
  const dry = polish(
    [softClip(mixBufs(gain(sub, 1.1), gain(sub2, 0.7), gain(thwack, 0.8), gain(knock, 0.45), norm1(body, 0.6)), 2.2, 0.55)],
    { thresh: -15, ratio: 3, attack: 0.004, release: 0.2, ceil: -7 }
  )[0];
  return reverb(dry, { rt60: 1.8, mix: 0.3, damp: 0.45, size: 1.3, wetHp: 60 });
}

/**
 * whoosh_transition — a scene cut: band-passed noise swept up and back down,
 * flanged for movement, panned across the image over a small sub push.
 */
function whooshTransition({ dur, rng }) {
  const centre = seg([
    [0, 200],
    [dur * 0.5, 3900, 1.4],
    [dur, 420, 0.7],
  ]);
  let air = norm1(svf(pinkNoise(dur, rng), centre, 1.7, 'bpq'), 1);
  env(air, bell(dur, 0.45, 0.5));
  air = flanger(air, { hz: 0.8, lowMs: 0.6, highMs: 5, mix: 0.4, fb: 0.25 });
  const sub = env(osc(dur, expTo(150, 45, dur * 0.8), { shape: 'sine' }), bell(dur, 0.5, 0.45));
  const dry = softClip(mixBufs(gain(air, 1), gain(sub, 0.35)), 1.6, 0.35);
  const chs = [mono(dur), mono(dur)];
  place(chs, dry, { pan: (t) => clamp(-0.85 + (t / dur) * 1.7, -1, 1) });
  const wet = reverb(dry, { rt60: 1.1, mix: 0.22, damp: 0.45, size: 1 });
  return [mixBufs(chs[0], gain(wet[0], 0.4)), mixBufs(chs[1], gain(wet[1], 0.4))];
}

// ===========================================================================
// registry
// ===========================================================================

/**
 * Every effect the film can cue. `seed` is fixed per effect so a sound never
 * changes because its neighbours did; `loop` marks the beds that must join back
 * onto themselves (their renderers handle the seam themselves).
 */
const EFFECTS = [
  // space / weapons
  { name: 'blaster_rebel', dur: 0.35, seed: 1101, render: blasterRebel },
  { name: 'blaster_imperial', dur: 0.35, seed: 1102, render: blasterImperial },
  { name: 'turbolaser', dur: 0.9, seed: 1103, render: turbolaser },
  { name: 'laser_impact', dur: 0.6, seed: 1104, render: laserImpact },
  { name: 'torpedo_launch', dur: 1.2, seed: 1105, render: torpedoLaunch },
  // explosions
  { name: 'explosion_small', dur: 1.4, seed: 1201, render: explosionSmall },
  { name: 'explosion_big', dur: 3.5, seed: 1202, render: explosionBig },
  { name: 'explosion_massive', dur: 6.0, seed: 1203, render: explosionMassive },
  { name: 'brick_scatter', dur: 2.5, seed: 1204, render: brickScatter },
  // ships
  { name: 'engine_rumble', dur: 6.0, seed: 1301, loop: true, render: engineRumble },
  { name: 'ship_pass', dur: 1.8, seed: 1302, render: shipPass },
  { name: 'tie_scream', dur: 1.6, seed: 1303, render: tieScream },
  { name: 'xwing_flyby', dur: 1.5, seed: 1304, render: xwingFlyby },
  { name: 'hyperspace_jump', dur: 2.2, seed: 1305, render: hyperspaceJump },
  { name: 'pod_launch', dur: 1.6, seed: 1306, render: podLaunch },
  // interior / mechanical
  { name: 'door_blast', dur: 1.6, seed: 1401, render: doorBlast },
  { name: 'blast_door_open', dur: 1.2, seed: 1402, render: blastDoorOpen },
  { name: 'footsteps_troopers', dur: 3.0, seed: 1403, loop: true, render: footstepsTroopers },
  { name: 'vader_breath', dur: 4.0, seed: 1404, loop: true, render: vaderBreath },
  { name: 'saber_on', dur: 0.8, seed: 1405, render: saberOn },
  { name: 'saber_hum', dur: 4.0, seed: 1406, loop: true, render: saberHum },
  // droids
  { name: 'r2_beeps_a', dur: 1.6, seed: 1501, render: r2BeepsA },
  { name: 'r2_beeps_b', dur: 1.8, seed: 1502, render: r2BeepsB },
  { name: 'r2_beeps_worried', dur: 1.6, seed: 1503, render: r2BeepsWorried },
  { name: 'hologram_on', dur: 1.0, seed: 1504, render: hologramOn },
  { name: 'computer_beeps', dur: 1.2, seed: 1505, render: computerBeeps },
  // world
  { name: 'wind_desert', dur: 8.0, seed: 1601, loop: true, render: windDesert },
  { name: 'sandcrawler', dur: 5.0, seed: 1602, loop: true, render: sandcrawler },
  { name: 'jawa_chatter', dur: 2.0, seed: 1603, render: jawaChatter },
  { name: 'crowd_cheer', dur: 5.0, seed: 1604, render: crowdCheer },
  { name: 'ceremony_ambience', dur: 6.0, seed: 1605, loop: true, render: ceremonyAmbience },
  // stingers
  { name: 'impact_hit', dur: 1.0, seed: 1701, render: impactHit },
  { name: 'whoosh_transition', dur: 1.2, seed: 1702, render: whooshTransition },
];

// ===========================================================================
// build
// ===========================================================================

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const a = argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? a.slice(flag.length + 3) : null;
};
const only = argOf('only');
const wantMontage = argv.includes('--montage') || argOf('montage') !== null;
const montagePath = argOf('montage') || '/tmp/sfx_montage.wav';

/** Force a channel to exactly `n` samples, padding with silence if it is short. */
function fit(c, n) {
  if (c.length === n) return c;
  if (c.length > n) return c.subarray(0, n);
  const out = new Float32Array(n);
  out.set(c);
  return out;
}

function render(spec) {
  const t0 = Date.now();
  const ch = chans(spec.render({ dur: spec.dur, rng: new Rng(spec.seed), name: spec.name }));
  const trimmed = ch.map((c) => fit(c, nsamp(spec.dur)));
  const cleaned = trimmed.map((c) => (spec.loop ? dcBlockLoop(c, 14) : dcBlock(c, 20).out));
  // Fade first, then normalise. A percussive effect's loudest sample is inside
  // the first millisecond, so fading afterwards would scale down the very peak
  // that had just been set — the explosions were shipping 3 dB under target.
  // The one-shot fade-in is only long enough to remove a step at sample zero;
  // any more of it audibly rounds off the attack.
  fadeEnds(cleaned, spec.loop ? 0.0008 : 0.0004, spec.loop ? 0.0008 : 0.012);
  normalize(cleaned, PEAK_DB);
  return { ch: cleaned, ms: Date.now() - t0 };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-'));
  const selected = only ? EFFECTS.filter((e) => only.split(',').includes(e.name)) : EFFECTS;
  if (!selected.length) throw new Error(`--only matched nothing (have: ${EFFECTS.map((e) => e.name).join(', ')})`);

  const rows = [];
  const warnings = [];
  for (const spec of selected) {
    const { ch, ms } = render(spec);
    const wav = path.join(tmpDir, `${spec.name}.wav`);
    const mp3 = path.join(OUT_DIR, `${spec.name}.mp3`);
    const encode = () => {
      writeWav(wav, ch);
      ff(['-y', '-loglevel', 'error', '-i', wav, '-b:a', '160k', mp3]);
      return stats(decodeMp3(mp3, ch.length));
    };
    let st = encode();
    // Lossy encoding moves peaks around by a decibel or two — a lone sharp
    // transient can come back either hotter or softer than it went in — so the
    // encoded result is measured and, if it missed, re-encoded once with a
    // corrective gain. Without this the library ships with a 3 dB spread of
    // peaks even though every buffer was normalised to the same level.
    if (Math.abs(st.peak - PEAK_DB) > 0.5) {
      const g = Math.min(dbToGain(PEAK_DB - st.peak), 0.95 / Math.max(...ch.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0))));
      for (const c of ch) for (let i = 0; i < c.length; i++) c[i] *= g;
      st = encode();
    }
    fs.rmSync(wav);
    const size = fs.statSync(mp3).size;
    rows.push({ name: spec.name, ch: ch.length, loop: !!spec.loop, size, ms, ...st });
    if (st.peak > -0.6) warnings.push(`${spec.name}: peak ${st.peak.toFixed(2)} dBFS is close to clipping`);
    if (st.rms < -34) warnings.push(`${spec.name}: rms ${st.rms.toFixed(1)} dBFS — suspiciously quiet`);
    if (Math.abs(st.dur - spec.dur) > 0.12) warnings.push(`${spec.name}: duration ${st.dur.toFixed(3)}s vs ${spec.dur}s`);
    if (size < 3000) warnings.push(`${spec.name}: only ${size} bytes`);
  }

  // index: rebuilt in registry order, keeping entries that were not re-rendered
  const indexPath = path.join(OUT_DIR, 'index.json');
  const prev = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : {};
  const index = {};
  for (const spec of EFFECTS) {
    const row = rows.find((r) => r.name === spec.name);
    if (row) {
      index[spec.name] = { file: `audio/sfx/${spec.name}.mp3`, duration: +row.dur.toFixed(3) };
      if (spec.loop) index[spec.name].loop = true;
    } else if (prev[spec.name] && fs.existsSync(path.join(OUT_DIR, `${spec.name}.mp3`))) {
      index[spec.name] = prev[spec.name];
    }
  }
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  console.log(`\n${'effect'.padEnd(22)}${'ch'.padStart(3)}${'dur'.padStart(8)}${'peak'.padStart(8)}${'rms'.padStart(8)}${'kB'.padStart(8)}${'ms'.padStart(7)}`);
  console.log('-'.repeat(64));
  for (const r of rows) {
    console.log(
      `${(r.name + (r.loop ? ' ↻' : '')).padEnd(22)}${String(r.ch).padStart(3)}${r.dur.toFixed(2).padStart(8)}${r.peak
        .toFixed(2)
        .padStart(8)}${r.rms.toFixed(1).padStart(8)}${(r.size / 1024).toFixed(1).padStart(8)}${String(r.ms).padStart(7)}`
    );
  }
  console.log('-'.repeat(64));
  console.log(`${rows.length} effects, ${(rows.reduce((s, r) => s + r.dur, 0)).toFixed(1)}s of audio, ${(rows.reduce((s, r) => s + r.size, 0) / 1024).toFixed(0)} kB`);
  if (warnings.length) console.log(`\nwarnings:\n${warnings.map((w) => `  ! ${w}`).join('\n')}`);
  else console.log('no warnings — nothing silent, clipped or mis-timed');

  if (wantMontage) buildMontage(indexPath, montagePath);
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

/** Audition aid: every effect in registry order, separated by short gaps. */
function buildMontage(indexPath, outFile) {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const GAP = 0.4;
  const parts = [];
  let t = 0.25;
  const order = [];
  for (const name of Object.keys(index)) {
    const file = path.join(OUT_DIR, `${name}.mp3`);
    if (!fs.existsSync(file)) continue;
    const ch = decodeMp3(file, 2);
    order.push({ name, at: t, dur: ch[0].length / SR });
    parts.push({ ch, at: t });
    t += ch[0].length / SR + GAP;
  }
  const total = t + 0.4;
  const out = [mono(total), mono(total)];
  for (const p of parts) {
    add(out[0], p.ch[0], p.at, 0.9);
    add(out[1], p.ch[1], p.at, 0.9);
  }
  writeWav(outFile, out);
  console.log(`\nmontage → ${outFile}  (${total.toFixed(1)}s)`);
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
  for (const o of order) console.log(`  ${fmt(o.at)}  ${o.name}  (${o.dur.toFixed(2)}s)`);
}

main();
