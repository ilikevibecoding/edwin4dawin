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
  return dcBlock(out, 12);
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
/** Sine LFO in [lo,hi]. */
const lfo = (hz, lo, hi, phase = 0) => (t) => lerp(lo, hi, 0.5 + 0.5 * Math.sin(TAU * hz * t + phase));

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

/** One-pole low pass — gentle, cheap, no resonance. */
function lp1(x, cutoff) {
  const cf = K(cutoff);
  const out = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const a = 1 - Math.exp((-TAU * clamp(cf(i / SR), 1, SR * 0.45)) / SR);
    s += a * (x[i] - s);
    out[i] = s;
  }
  return out;
}

/** Remove DC / infrasonic drift so normalisation is not wasted on offset. */
function dcBlock(x, hz = 18) {
  const a = Math.exp((-TAU * hz) / SR);
  const out = new Float32Array(x.length);
  let xPrev = 0, yPrev = 0;
  for (let i = 0; i < x.length; i++) {
    const y = x[i] - xPrev + a * yPrev;
    out[i] = y;
    xPrev = x[i];
    yPrev = y;
  }
  return out;
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

/** Fixed delay with feedback — slapback echoes, spring-ish tails. */
function echo(x, delaySec, { fb = 0.4, mix = 0.4, damp = 0.3 } = {}) {
  const d = Math.max(2, Math.round(delaySec * SR));
  const out = Float32Array.from(x);
  const a = 1 - clamp(damp, 0, 0.99);
  let s = 0;
  for (let i = d; i < out.length; i++) {
    s += a * (out[i - d] - s);
    out[i] += mix * s * (1 + 0 * fb);
    out[i] += 0;
  }
  // second pass gives the repeats their own repeats
  let s2 = 0;
  for (let i = d; i < out.length; i++) {
    s2 += a * (out[i - d] - s2);
    out[i] += fb * 0.5 * s2;
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

function flanger(x, { hz = 0.4, lowMs = 0.6, highMs = 5, mix = 0.5, fb = 0.3, phase = 0 } = {}) {
  const out = Float32Array.from(x);
  const d = (t) => lerp(lowMs, highMs, 0.5 + 0.5 * Math.sin(TAU * hz * t + phase)) * 0.001;
  const wet = varDelay(out, out.length, d);
  for (let i = 0; i < out.length; i++) out[i] = x[i] + mix * wet[i];
  if (fb > 0) {
    const wet2 = varDelay(out, out.length, (t) => d(t) * 1.37);
    for (let i = 0; i < out.length; i++) out[i] += fb * wet2[i] * 0.5;
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
function flyBy(src, dur, { speed = 140, miss = 12, tc = 0.6, spread = 0.95, air = 14000, curve = 1 } = {}) {
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
    dry[i] = readLerp(src, (t - delay) * SR) * amp;
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
