#!/usr/bin/env node
/**
 * Procedural sound effects. Everything is synthesised from oscillators, noise
 * and filters -- no samples.
 *
 *   node tools/sfx.mjs           # render the whole library (cached)
 *   node tools/sfx.mjs --force
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, buf, bufSec, stereo, stereoSec, rng, db, clamp, lerp, mtof, glide, softclip,
  Osc, SVF, Ladder, Biquad, eqBuffer, whiteNoise, pinkNoise, brownNoise,
  adsr, expDec, hann, fadeStereo, Delay, comb, flange, reverbStereo,
  addMono, addStereo, scaleStereo, peakOf, normalise, limit, widen, makeLoopable,
} from './lib/dsp.mjs';
import { writeWav } from './lib/wav.mjs';

const OUT = path.resolve(import.meta.dirname, '../public/audio/sfx');
const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });

const cues = {};
function cue(name, fn) { cues[name] = fn; }

// --------------------------------------------------------------- helpers

/** Mono buffer -> stereo with optional reverb and width. */
function finish(mono, { wet = 0.12, width = 0.25, room = 0.7, damp = 0.4, peak = 0.9, fadeIn = 0.002, fadeOut = 0.02 } = {}) {
  const st = wet > 0
    ? reverbStereo(mono, { wet, dry: 1, room, damp })
    : { L: Float32Array.from(mono), R: Float32Array.from(mono) };
  if (width > 0) { widen(st.L, 9, width); widen(st.R, 13, width); }
  fadeStereo(st, fadeIn, fadeOut);
  normalise(st, peak);
  return st;
}

/** A resonant band of noise whose centre frequency follows a curve. */
function sweptNoise(seconds, fAt, { q = 4, seed = 1, type = 'bpf', noise = 'white' } = {}) {
  const n = Math.round(seconds * SR);
  const r = rng(seed);
  const src = noise === 'pink' ? pinkNoise(n, r) : noise === 'brown' ? brownNoise(n, r) : whiteNoise(n, r);
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    if ((i & 31) === 0) f.set(clamp(fAt(i / n, i / SR), 20, 18000), q);
    out[i] = type === 'bpf' ? f.bpf(src[i]) : type === 'hpf' ? f.hpf(src[i]) : f.lpf(src[i]);
  }
  return out;
}

// ---------------------------------------------------------------- blasters

/**
 * The classic bolt: a struck-cable twang. A very fast downward frequency sweep
 * through a high-resonance filter, with a bright transient on the front and a
 * metallic comb ring behind it.
 */
function blaster({ f0 = 2900, f1 = 130, dur = 0.34, sweep = 0.085, q = 7, seed = 2, bright = 1 } = {}) {
  const n = Math.round(dur * SR);
  const o = new Osc('saw');
  const o2 = new Osc('square');
  const f = new SVF();
  const out = buf(n);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const u = clamp(t / sweep, 0, 1);
    const fr = glide(f0, f1, u * u);
    if ((i & 15) === 0) f.set(clamp(fr * 1.25, 40, 16000), q);
    let v = o.next(fr) * 0.6 + o2.next(fr * 1.004) * 0.25;
    v += (r() * 2 - 1) * 0.35 * expDec(i, 0.0045) * bright;   // strike transient
    v = f.bpf(v);
    out[i] = v * expDec(i, 0.055) * (1 - Math.pow(t / dur, 3));
  }
  comb(out, Math.round(SR / 730), 0.55, 0.35);   // the metallic ring
  return out;
}

cue('blaster_a', () => finish(blaster({ seed: 3 }), { wet: 0.16 }));
cue('blaster_b', () => finish(blaster({ f0: 3400, f1: 165, sweep: 0.07, seed: 11 }), { wet: 0.16 }));
cue('blaster_rebel', () => finish(blaster({ f0: 2300, f1: 105, sweep: 0.1, q: 9, seed: 21 }), { wet: 0.18 }));

cue('laser_turbolaser', () => {
  const dur = 1.5;
  const n = Math.round(dur * SR);
  const body = blaster({ f0: 900, f1: 42, dur, sweep: 0.4, q: 11, seed: 5, bright: 1.6 });
  const sub = buf(n);
  const so = new Osc('sine');
  for (let i = 0; i < n; i++) {
    const u = i / n;
    sub[i] = so.next(glide(115, 28, Math.pow(u, 0.55))) * expDec(i, 0.34) * 0.95;
  }
  const out = buf(n);
  for (let i = 0; i < n; i++) out[i] = softclip(body[i] * 0.85 + sub[i], 1.3);
  return finish(out, { wet: 0.3, room: 0.85, width: 0.35 });
});

cue('blaster_impact', () => {
  const dur = 0.5;
  const n = Math.round(dur * SR);
  const noise = sweptNoise(dur, (u) => glide(4200, 220, u), { q: 2.4, seed: 7 });
  const o = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    out[i] = noise[i] * expDec(i, 0.05) * 1.1 + o.next(glide(220, 60, i / n)) * expDec(i, 0.07) * 0.6;
  }
  return finish(out, { wet: 0.22 });
});

cue('ricochet', () => {
  const dur = 0.42, n = Math.round(dur * SR);
  const o = new Osc('sine'), o2 = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    out[i] = (o.next(glide(3400, 700, u)) * 0.6 + o2.next(glide(5200, 1100, u)) * 0.3) * expDec(i, 0.07);
  }
  return finish(out, { wet: 0.28 });
});

// --------------------------------------------------------------- explosions

function explosion({ dur = 3.2, size = 1, seed = 9 } = {}) {
  const n = Math.round(dur * SR);
  const r = rng(seed);
  const body = sweptNoise(dur, (u) => glide(3200 / size, 60 / size, Math.pow(u, 0.4)), { q: 1.1, seed, type: 'lpf', noise: 'brown' });
  const crack = whiteNoise(n, rng(seed + 1));
  const sub = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const punch = expDec(i, 0.10 * size);
    const tail = expDec(i, 0.85 * size);
    let v = body[i] * (0.65 * tail + 0.9 * punch);
    v += crack[i] * punch * 0.55;
    v += sub.next(glide(95 / size, 24 / size, clamp(t / (0.5 * size), 0, 1))) * expDec(i, 0.42 * size) * 1.15;
    // debris: sparse ticks in the tail
    if (t > 0.15 && r() < 0.0016) {
      const len = Math.min(n - i, Math.round(0.04 * SR));
      for (let k = 0; k < len; k++) out[i + k] += (r() * 2 - 1) * expDec(k, 0.006) * 0.28 * tail;
    }
    out[i] += softclip(v, 1.15);
  }
  return out;
}

cue('explosion_small', () => finish(explosion({ dur: 1.5, size: 0.55, seed: 12 }), { wet: 0.28, room: 0.75 }));
cue('explosion_big', () => finish(explosion({ dur: 3.0, size: 1.0, seed: 13 }), { wet: 0.34, room: 0.85 }));
cue('explosion_massive', () => finish(explosion({ dur: 6.5, size: 2.1, seed: 14 }), { wet: 0.42, room: 0.93, damp: 0.22, width: 0.45 }));

// ---------------------------------------------------------------- lightsaber

function saberHum(seconds, { base = 108, seed = 31, detune = 1.008 } = {}) {
  const n = Math.round(seconds * SR);
  const a = new Osc('saw'), b = new Osc('saw'), c = new Osc('sine');
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // the hum is never quite steady -- slow beating plus a wobble
    const wob = 1 + Math.sin(t * 5.3) * 0.012 + Math.sin(t * 11.7) * 0.006;
    if ((i & 63) === 0) f.set(560 + Math.sin(t * 3.1) * 130, 3.2);
    let v = a.next(base * wob) * 0.5 + b.next(base * detune * wob) * 0.5 + c.next(base * 3 * wob) * 0.22;
    v = f.lpf(v);
    out[i] = v * (0.85 + Math.sin(t * 7.9) * 0.08);
  }
  return out;
}

cue('saber_hum', () => {
  const st = finish(saberHum(4.0), { wet: 0.14, width: 0.3, peak: 0.55 });
  return makeLoopable(st, 0.35);
});

cue('saber_on', () => {
  const dur = 1.4, n = Math.round(dur * SR);
  const hum = saberHum(dur);
  const snap = sweptNoise(0.3, (u) => glide(900, 5200, u), { q: 2, seed: 41 });
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const swell = clamp(t / 0.22, 0, 1);
    out[i] = hum[i] * swell * 0.9;
    if (i < snap.length) out[i] += snap[i] * expDec(i, 0.06) * 0.85;
  }
  return finish(out, { wet: 0.22, peak: 0.85 });
});

cue('saber_off', () => {
  const dur = 0.9, n = Math.round(dur * SR);
  const hum = saberHum(dur);
  const o = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    out[i] = hum[i] * Math.pow(1 - u, 2.4) + o.next(glide(760, 90, u)) * expDec(i, 0.14) * 0.35;
  }
  return finish(out, { wet: 0.2 });
});

cue('saber_swing', () => {
  const dur = 0.85, n = Math.round(dur * SR);
  const hum = saberHum(dur, { base: 120 });
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const bend = 1 + Math.sin(u * Math.PI) * 0.42;         // doppler through the arc
    const j = Math.min(n - 1, Math.round(i * bend));
    out[i] = hum[j] * Math.sin(u * Math.PI) * 1.25;
  }
  return finish(out, { wet: 0.3, peak: 0.8 });
});

// -------------------------------------------------------------------- ships

cue('tie_scream', () => {
  // Descending resonant howl: a noise band and a detuned saw pair fall together,
  // hard-driven so it snarls.
  const dur = 2.4, n = Math.round(dur * SR);
  const band = sweptNoise(dur, (u) => glide(2600, 380, Math.pow(u, 0.7)), { q: 9, seed: 51 });
  const a = new Osc('saw'), b = new Osc('saw');
  const f = new SVF();
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = i / n;
    const fr = glide(760, 128, Math.pow(u, 0.7)) * (1 + Math.sin(t * 27) * 0.02);
    if ((i & 31) === 0) f.set(clamp(fr * 3.2, 60, 9000), 6);
    let v = a.next(fr) * 0.5 + b.next(fr * 1.012) * 0.5;
    v = f.bpf(v) * 0.8 + band[i] * 0.85;
    const env = Math.min(1, t / 0.06) * (1 - Math.pow(u, 2.2));
    out[i] = softclip(v * env, 2.2) * 0.7;
  }
  return finish(out, { wet: 0.24, width: 0.4 });
});

cue('engine_rumble', () => {
  const dur = 6.0, n = Math.round(dur * SR);
  const low = brownNoise(n, rng(61));
  const a = new Osc('saw'), b = new Osc('saw'), c = new Osc('sine');
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 63) === 0) f.set(190 + Math.sin(t * 0.7) * 40, 1.4);
    let v = low[i] * 1.3 + a.next(41) * 0.22 + b.next(41 * 1.006) * 0.2 + c.next(27.5) * 0.35;
    out[i] = f.lpf(v);
  }
  const st = finish(out, { wet: 0.12, width: 0.4, peak: 0.6 });
  return makeLoopable(st, 0.8);
});

cue('engine_pass', () => {
  const dur = 3.2, n = Math.round(dur * SR);
  const low = brownNoise(n, rng(62));
  const o = new Osc('saw');
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const dop = glide(1.35, 0.72, clamp((u - 0.35) / 0.3, 0, 1));   // through the doppler
    const amp = Math.exp(-Math.pow((u - 0.5) * 3.4, 2)) * 1.2;
    if ((i & 63) === 0) f.set(240 * dop + 80, 1.8);
    out[i] = f.lpf(low[i] * 1.2 + o.next(62 * dop) * 0.4) * amp;
  }
  return finish(out, { wet: 0.2, width: 0.5 });
});

cue('hyperspace_jump', () => {
  const dur = 3.0, n = Math.round(dur * SR);
  const rise = sweptNoise(dur, (u) => glide(180, 9000, Math.pow(u, 2.2)), { q: 3, seed: 71 });
  const o = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const boomAt = 0.72;
    let v = rise[i] * Math.pow(u, 1.5) * 1.1;
    if (u > boomAt) {
      const k = i - Math.round(boomAt * n);
      v += o.next(glide(140, 26, clamp(k / (0.5 * SR), 0, 1))) * expDec(k, 0.5) * 1.3;
    }
    out[i] = softclip(v, 1.2);
  }
  return finish(out, { wet: 0.4, room: 0.9, width: 0.5 });
});

// -------------------------------------------------------------------- Vader

/**
 * The regulator. An inhale is a rising resonant band, an exhale is a lower,
 * softer one; the pause between them is as much of the sound as the breaths.
 */
function breath({ dur, f0, f1, q, seed, peakAt = 0.45, noise = 'pink' }) {
  const n = Math.round(dur * SR);
  const band = sweptNoise(dur, (u) => glide(f0, f1, u), { q, seed, noise });
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const env = Math.exp(-Math.pow((u - peakAt) / 0.30, 2));
    out[i] = band[i] * env;
  }
  eqBuffer(out, [
    (b) => b.highpass(140, 0.8),
    (b) => b.peaking(620, 1.4, 5),
    (b) => b.lowpass(3400, 0.8),
  ]);
  return out;
}

cue('vader_breath_in', () => finish(breath({ dur: 1.5, f0: 380, f1: 900, q: 5.5, seed: 81 }), { wet: 0.3, peak: 0.72 }));
cue('vader_breath_out', () => finish(breath({ dur: 1.8, f0: 700, f1: 260, q: 4.5, seed: 82, noise: 'pink' }), { wet: 0.34, peak: 0.66 }));

cue('vader_breath_loop', () => {
  const period = 4.6;
  const st = stereoSec(period);
  const inh = breath({ dur: 1.5, f0: 380, f1: 900, q: 5.5, seed: 81 });
  const exh = breath({ dur: 1.9, f0: 700, f1: 250, q: 4.5, seed: 82 });
  addMono(st, inh, 0.05 * SR, 0.95, -0.06);
  addMono(st, exh, 2.25 * SR, 0.85, 0.06);
  const wet = reverbStereo(st, { wet: 0.3, dry: 1, room: 0.8, damp: 0.4 });
  normalise(wet, 0.62);
  return makeLoopable(wet, 0.25);
});

// -------------------------------------------------------------------- droids

/** Astromech: fast discrete pitch steps with short glides between them. */
function droidPhrase({ steps, seed = 91, stepDur = 0.09, shape = 'sine', vib = 0.02 }) {
  const total = steps.length * stepDur + 0.12;
  const n = Math.round(total * SR);
  const o = new Osc(shape);
  const out = buf(n);
  const r = rng(seed);
  let prev = mtof(steps[0]);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const k = Math.min(steps.length - 1, Math.floor(t / stepDur));
    const local = (t - k * stepDur) / stepDur;
    const target = mtof(steps[k]);
    const f = local < 0.25 ? glide(prev, target, local / 0.25) : target;
    if (local > 0.98) prev = target;
    const wob = 1 + Math.sin(t * 34) * vib;
    let v = o.next(f * wob);
    v += o.next(f * 2.01 * wob) * 0.18;
    const env = Math.min(1, local / 0.06) * Math.min(1, (1 - local) / 0.10);
    out[i] = v * env * 0.8;
  }
  eqBuffer(out, [(b) => b.highpass(280, 0.7), (b) => b.peaking(2400, 1.1, 4)]);
  return out;
}

cue('r2_beep_a', () => finish(droidPhrase({ steps: [88, 95, 91, 98], seed: 91 }), { wet: 0.2 }));
cue('r2_beep_b', () => finish(droidPhrase({ steps: [93, 86, 90, 97, 92], seed: 92, stepDur: 0.075 }), { wet: 0.2 }));
cue('r2_beep_c', () => finish(droidPhrase({ steps: [84, 91, 88], seed: 93, stepDur: 0.12 }), { wet: 0.2 }));
cue('r2_beep_d', () => finish(droidPhrase({ steps: [96, 89, 94, 87, 92, 99], seed: 94, stepDur: 0.07 }), { wet: 0.2 }));
cue('r2_beep_e', () => finish(droidPhrase({ steps: [90, 90, 97], seed: 95, stepDur: 0.1 }), { wet: 0.2 }));
cue('r2_worried', () => finish(droidPhrase({ steps: [93, 90, 87, 84, 81, 78], seed: 96, stepDur: 0.11, vib: 0.05 }), { wet: 0.26 }));
cue('r2_happy', () => finish(droidPhrase({ steps: [84, 88, 91, 96, 100, 103], seed: 97, stepDur: 0.065 }), { wet: 0.22 }));
cue('r2_alarm', () => finish(droidPhrase({ steps: [99, 92, 99, 92, 99, 92], seed: 98, stepDur: 0.08, shape: 'square', vib: 0.06 }), { wet: 0.24 }));

// -------------------------------------------------------------------- rooms

cue('door_hiss', () => {
  const dur = 1.1;
  const b = sweptNoise(dur, (u) => glide(5200, 900, u), { q: 1.6, seed: 101 });
  for (let i = 0; i < b.length; i++) {
    const u = i / b.length;
    b[i] *= Math.min(1, u / 0.04) * Math.pow(1 - u, 1.6);
  }
  return finish(b, { wet: 0.24, peak: 0.7 });
});

cue('door_slam', () => {
  const dur = 1.4, n = Math.round(dur * SR);
  const imp = whiteNoise(n, rng(102));
  const o = new Osc('sine');
  const out = buf(n);
  const f = new Ladder(2);
  for (let i = 0; i < n; i++) {
    if ((i & 63) === 0) f.set(glide(1800, 120, clamp(i / (0.25 * SR), 0, 1)), 1.6);
    out[i] = f.lpf(imp[i]) * expDec(i, 0.09) * 1.2 + o.next(glide(120, 42, clamp(i / (0.3 * SR), 0, 1))) * expDec(i, 0.18);
  }
  return finish(out, { wet: 0.3, room: 0.8 });
});

cue('alarm_klaxon', () => {
  const dur = 4.0, n = Math.round(dur * SR);
  const o = new Osc('square', 0, 0.42);
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const cyc = t % 1.0;
    const two = cyc < 0.5 ? 320 : 214;
    const env = cyc < 0.9 ? Math.min(1, cyc / 0.03) * Math.min(1, (0.9 - cyc) / 0.08) : 0;
    if ((i & 63) === 0) f.set(1400, 2.2);
    out[i] = f.lpf(o.next(two)) * env * 0.55;
  }
  const st = finish(out, { wet: 0.34, room: 0.8, peak: 0.72 });
  return makeLoopable(st, 0.2);
});

cue('console_beep', () => {
  const b = droidPhrase({ steps: [96, 96], seed: 111, stepDur: 0.055, shape: 'square', vib: 0 });
  return finish(b, { wet: 0.15, peak: 0.55 });
});

cue('holo_shimmer', () => {
  const dur = 2.2, n = Math.round(dur * SR);
  const oscs = [0, 3, 7, 12, 19].map(() => new Osc('sine'));
  const base = [1180, 1490, 1770, 2360, 3140];
  const nz = whiteNoise(n, rng(121));
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = i / n;
    let v = 0;
    for (let k = 0; k < oscs.length; k++) {
      v += oscs[k].next(base[k] * (1 + Math.sin(t * (3 + k * 1.7)) * 0.006)) * (0.16 / (1 + k * 0.4));
    }
    v += nz[i] * 0.07;
    out[i] = v * Math.min(1, u / 0.12) * Math.pow(1 - u, 0.9) * (0.7 + Math.sin(t * 21) * 0.3);
  }
  eqBuffer(out, [(b) => b.highpass(700, 0.7)]);
  return finish(out, { wet: 0.4, room: 0.9, peak: 0.5 });
});

// ------------------------------------------------------------------ ambience

cue('wind_desert', () => {
  const dur = 10, n = Math.round(dur * SR);
  const src = pinkNoise(n, rng(131));
  const f = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 63) === 0) {
      f.set(380 + Math.sin(t * 0.21) * 200 + Math.sin(t * 0.07) * 130, 1.1);
    }
    out[i] = f.bpf(src[i]) * (0.6 + Math.sin(t * 0.13) * 0.25 + Math.sin(t * 0.41) * 0.12);
  }
  const st = finish(out, { wet: 0.12, width: 0.6, peak: 0.42 });
  return makeLoopable(st, 1.2);
});

cue('sandcrawler_treads', () => {
  const dur = 6.0, n = Math.round(dur * SR);
  const out = buf(n);
  const low = brownNoise(n, rng(141));
  const r = rng(142);
  for (let i = 0; i < n; i++) out[i] = low[i] * 0.6;
  const clankEvery = Math.round(0.42 * SR);
  for (let at = 0; at < n; at += clankEvery) {
    const len = Math.round(0.3 * SR);
    const nz = whiteNoise(len, rng(150 + at));
    const o = new Osc('sine');
    for (let k = 0; k < len && at + k < n; k++) {
      out[at + k] += (nz[k] * 0.5 + o.next(glide(420, 90, k / len))) * expDec(k, 0.05) * 0.35;
    }
  }
  eqBuffer(out, [(b) => b.lowpass(2200, 0.7)]);
  const st = finish(out, { wet: 0.2, width: 0.35, peak: 0.5 });
  return makeLoopable(st, 0.4);
});

cue('hall_ambience', () => {
  const dur = 8, n = Math.round(dur * SR);
  const src = pinkNoise(n, rng(161));
  eqBuffer(src, [(b) => b.lowpass(340, 0.6), (b) => b.highpass(45, 0.7)]);
  for (let i = 0; i < n; i++) src[i] *= 0.5 + Math.sin(i / SR * 0.09) * 0.1;
  const st = finish(src, { wet: 0.4, room: 0.94, damp: 0.2, width: 0.7, peak: 0.28 });
  return makeLoopable(st, 1.0);
});

cue('crowd_cheer', () => {
  const dur = 7.0, n = Math.round(dur * SR);
  const out = buf(n);
  const r = rng(171);
  for (let v = 0; v < 90; v++) {
    const at = Math.round(r() * 0.9 * SR);
    const len = Math.round((0.7 + r() * 1.6) * SR);
    const nz = whiteNoise(len, rng(200 + v));
    const f = new Ladder(2);
    f.set(400 + r() * 1500, 1.6 + r() * 3);
    const g = 0.05 + r() * 0.05;
    for (let k = 0; k < len && at + k < n; k++) {
      const u = k / len;
      out[at + k] += f.bpf(nz[k]) * g * Math.sin(Math.PI * Math.min(1, u)) ;
    }
  }
  for (let i = 0; i < n; i++) {
    const u = i / n;
    out[i] *= Math.min(1, u / 0.08) * (u > 0.55 ? Math.pow(1 - (u - 0.55) / 0.45, 1.4) : 1);
  }
  return finish(out, { wet: 0.45, room: 0.92, width: 0.8, peak: 0.62 });
});

// ------------------------------------------------------------------- render

const manifest = {};
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
for (const [name, fn] of Object.entries(cues)) {
  if (only && !name.includes(only)) continue;
  const file = path.join(OUT, `${name}.wav`);
  if (!force && fs.existsSync(file)) {
    manifest[name] = { file: `sfx/${name}.wav` };
    continue;
  }
  const st = fn();
  limit(st, 0.96);
  const info = writeWav(file, [st.L, st.R]);
  manifest[name] = { file: `sfx/${name}.wav`, dur: +info.duration.toFixed(3), peak: +peakOf(st).toFixed(3) };
  process.stdout.write(`  ${name.padEnd(20)} ${info.duration.toFixed(2)}s\n`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`${Object.keys(manifest).length} effects -> ${OUT}`);
