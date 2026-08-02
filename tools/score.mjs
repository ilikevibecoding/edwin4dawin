#!/usr/bin/env node
/**
 * The score.
 *
 * An original orchestral cue for every scene, composed and synthesized from
 * scratch: no samples, no MIDI files, no borrowed melodies. There is a little
 * synthesizer down the bottom (brass, strings, woodwind, harp, choir, timpani,
 * snare, cymbal), a note scheduler, a Schroeder reverb and a bus limiter; above
 * that sits a small composition layer that develops three original motifs
 * across the film.
 *
 *   node tools/score.mjs            # write public/audio/music/*.mp3
 *   node tools/score.mjs --only crawl
 *
 * Everything is deterministic: the only randomness comes from a seeded PRNG.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/audio/music');
const SR = 44100;

const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** ADSR envelope value at time `t` within a note of length `dur`. */
function adsr(t, dur, a, d, s, r) {
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  const rt = t - dur;
  if (rt < r) return s * (1 - rt / r);
  return 0;
}

/** One-pole low-pass, used per-note (state carried by the caller). */
function lpStep(state, x, cutoff) {
  const c = clamp((2 * Math.PI * cutoff) / SR, 0.0005, 0.98);
  state.y += c * (x - state.y);
  return state.y;
}

// ---------------------------------------------------------------------------
// Instruments
//
// Each returns { render(buf, startFrame, dur, freq, vel, pan) } writing into an
// interleaved stereo Float32Array.
// ---------------------------------------------------------------------------

function writeStereo(buf, i, v, pan) {
  const l = Math.cos(((pan + 1) * Math.PI) / 4);
  const r = Math.sin(((pan + 1) * Math.PI) / 4);
  const k = i * 2;
  if (k < 0 || k + 1 >= buf.length) return;
  buf[k] += v * l;
  buf[k + 1] += v * r;
}

/** Band-limited-ish sawtooth from summed harmonics; `n` harmonics. */
function sawSample(phase, n) {
  let v = 0;
  for (let h = 1; h <= n; h++) v += Math.sin(phase * h) / h;
  return v * 0.55;
}

/**
 * Brass. A detuned saw stack with a slow attack, a filter that opens with
 * velocity, and a touch of vibrato — the workhorse of the heroic material.
 */
function brass(buf, s0, dur, freq, vel, pan, opts = {}) {
  const rel = opts.rel ?? 0.28;
  const total = Math.ceil((dur + rel) * SR);
  const det = [1, 1.0021, 0.9978];
  const ph = [0, 1.7, 3.4];
  const lp = { y: 0 };
  const nHarm = opts.bright ? 12 : 8;
  const atk = opts.atk ?? 0.055;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const e = adsr(t, dur, atk, 0.18, 0.78, rel);
    if (e <= 0) continue;
    const vib = 1 + Math.sin(2 * Math.PI * 5.1 * t + 1.3) * 0.0028 * Math.min(1, t * 2);
    let x = 0;
    for (let k = 0; k < 3; k++) {
      ph[k] += (2 * Math.PI * freq * det[k] * vib) / SR;
      x += sawSample(ph[k], nHarm);
    }
    x /= 3;
    // Filter envelope: snaps open on the attack then settles back, which is
    // what gives a horn section its characteristic bloom.
    const fenv = Math.exp(-Math.max(0, t - atk) * 5.5);
    const cut = 340 + vel * (900 + 3400 * fenv) * (0.55 + 0.45 * e);
    x = lpStep(lp, x, cut);
    // A little saturation adds the brassy edge a plain saw stack lacks.
    x = Math.tanh(x * (1.1 + 1.5 * fenv * vel)) * 0.85;
    writeStereo(buf, s0 + i, x * e * vel * 0.30, pan);
  }
}

/** String ensemble: five detuned saws, soft attack, slow tremolo. */
function strings(buf, s0, dur, freq, vel, pan, opts = {}) {
  const rel = opts.rel ?? 0.5;
  const total = Math.ceil((dur + rel) * SR);
  const det = [0.9965, 0.9988, 1, 1.0013, 1.0037];
  const ph = [0.3, 1.1, 2.2, 4.0, 5.3];
  const lp = { y: 0 };
  const atk = opts.atk ?? 0.22;
  const trem = opts.trem ?? 0;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const e = adsr(t, dur, atk, 0.4, 0.85, rel);
    if (e <= 0) continue;
    const vib = 1 + Math.sin(2 * Math.PI * 4.6 * t) * 0.0022 * Math.min(1, t * 1.5);
    let x = 0;
    for (let k = 0; k < 5; k++) {
      ph[k] += (2 * Math.PI * freq * det[k] * vib) / SR;
      x += sawSample(ph[k], opts.dark ? 5 : 9);
    }
    x /= 5;
    x = lpStep(lp, x, (opts.dark ? 700 : 1800) + vel * 1500);
    const tr = trem ? 0.75 + 0.25 * Math.sin(2 * Math.PI * trem * t) : 1;
    writeStereo(buf, s0 + i, x * e * vel * 0.20 * tr, pan);
  }
}

/** Woodwind: mostly sine with a weak third harmonic and a breath layer. */
function wood(buf, s0, dur, freq, vel, pan, opts = {}) {
  const rel = opts.rel ?? 0.3;
  const total = Math.ceil((dur + rel) * SR);
  let ph = 0;
  let nz = 0;
  const rnd = mulberry32(Math.round(freq * 100));
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const e = adsr(t, dur, 0.09, 0.2, 0.85, rel);
    if (e <= 0) continue;
    const vib = 1 + Math.sin(2 * Math.PI * 5.4 * t + 0.7) * 0.004 * Math.min(1, t * 1.2);
    ph += (2 * Math.PI * freq * vib) / SR;
    nz = nz * 0.96 + (rnd() * 2 - 1) * 0.04;
    const x = Math.sin(ph) + 0.16 * Math.sin(ph * 3) + 0.05 * Math.sin(ph * 5) + nz * 0.5;
    writeStereo(buf, s0 + i, x * e * vel * 0.24, pan);
  }
}

/** Choir-ish pad: saw through two fixed formants. */
function choir(buf, s0, dur, freq, vel, pan) {
  const rel = 1.1;
  const total = Math.ceil((dur + rel) * SR);
  const det = [0.997, 1, 1.003];
  const ph = [0.2, 1.9, 3.7];
  const f1 = { y: 0 };
  const f2 = { y: 0 };
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const e = adsr(t, dur, 0.55, 0.6, 0.9, rel);
    if (e <= 0) continue;
    let x = 0;
    for (let k = 0; k < 3; k++) {
      ph[k] += (2 * Math.PI * freq * det[k]) / SR;
      x += sawSample(ph[k], 7);
    }
    x /= 3;
    const a = lpStep(f1, x, 720);
    const b = lpStep(f2, x, 2400);
    writeStereo(buf, s0 + i, (a * 0.8 + (b - a) * 0.5) * e * vel * 0.16, pan);
  }
}

/** Harp / celesta: a bright plucked stack of decaying partials. */
function harp(buf, s0, dur, freq, vel, pan) {
  const total = Math.ceil(Math.min(dur + 2.2, 3.2) * SR);
  const parts = [1, 2, 3, 4.02, 5.4];
  const amp = [1, 0.45, 0.24, 0.12, 0.06];
  const dec = [2.4, 1.7, 1.2, 0.9, 0.7];
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    let x = 0;
    for (let k = 0; k < parts.length; k++) {
      x += Math.sin(2 * Math.PI * freq * parts[k] * t) * amp[k] * Math.exp(-t / dec[k]);
    }
    const atk = Math.min(1, t / 0.004);
    writeStereo(buf, s0 + i, x * atk * vel * 0.14, pan);
  }
}

/** Timpani: a low sine with a fast downward pitch sweep plus a noise thump. */
function timpani(buf, s0, freq, vel, pan = -0.35) {
  const dur = 1.9;
  const total = Math.ceil(dur * SR);
  const rnd = mulberry32(1234 + Math.round(freq));
  let ph = 0;
  let nz = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 2.6);
    const f = freq * (1 + 0.55 * Math.exp(-t * 30));
    ph += (2 * Math.PI * f) / SR;
    nz = nz * 0.93 + (rnd() * 2 - 1) * 0.07;
    const x = Math.sin(ph) * 0.9 + Math.sin(ph * 1.58) * 0.14 + nz * Math.exp(-t * 26) * 0.7;
    writeStereo(buf, s0 + i, x * env * vel * 0.5, pan);
  }
}

/** Military snare: band-passed noise with a short body tone. */
function snare(buf, s0, vel, pan = 0.3, len = 0.16) {
  const total = Math.ceil(len * SR);
  const rnd = mulberry32(777 + s0);
  const hp = { y: 0 };
  const lp = { y: 0 };
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 34);
    const n = rnd() * 2 - 1;
    const low = lpStep(lp, n, 5200);
    const band = low - lpStep(hp, low, 900);
    // Pitched shell: a fast downward sweep under the noise gives the hit a
    // physical thump instead of a burst of hiss.
    const shellF = 240 * (1 + 1.4 * Math.exp(-t * 90));
    const body =
      Math.sin(2 * Math.PI * shellF * t) * Math.exp(-t * 42) * 0.6 +
      Math.sin(2 * Math.PI * shellF * 1.47 * t) * Math.exp(-t * 70) * 0.25;
    writeStereo(buf, s0 + i, (band * 0.62 + body) * env * vel * 0.40, pan);
  }
}

/** Cymbal swell: filtered noise rising over `len` seconds. */
function cymbal(buf, s0, len, vel, pan = 0.15) {
  const total = Math.ceil((len + 1.4) * SR);
  const rnd = mulberry32(99 + s0);
  const lp = { y: 0 };
  const hp = { y: 0 };
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const swell = t < len ? Math.pow(t / len, 2.2) : Math.exp(-(t - len) * 2.6);
    const n = rnd() * 2 - 1;
    const a = lpStep(lp, n, 11000);
    const b = a - lpStep(hp, a, 2600);
    writeStereo(buf, s0 + i, b * swell * vel * 0.17, pan);
  }
}

/** Low percussive hit for punctuation. */
function boom(buf, s0, vel, pan = 0) {
  const total = Math.ceil(2.6 * SR);
  const rnd = mulberry32(4242 + s0);
  let ph = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 1.7);
    const f = 46 * (1 + 1.1 * Math.exp(-t * 16));
    ph += (2 * Math.PI * f) / SR;
    const n = (rnd() * 2 - 1) * Math.exp(-t * 22) * 0.4;
    writeStereo(buf, s0 + i, (Math.sin(ph) + n) * env * vel * 0.55, pan);
  }
}

const INSTRUMENTS = {
  brass: (b, s, d, f, v, p, o) => brass(b, s, d, f, v, p, o),
  brassBright: (b, s, d, f, v, p) => brass(b, s, d, f, v, p, { bright: true }),
  brassLow: (b, s, d, f, v, p) => brass(b, s, d, f, v, p, { atk: 0.09 }),
  strings: (b, s, d, f, v, p, o) => strings(b, s, d, f, v, p, o),
  stringsDark: (b, s, d, f, v, p) => strings(b, s, d, f, v, p, { dark: true, atk: 0.3 }),
  stringsTrem: (b, s, d, f, v, p) => strings(b, s, d, f, v, p, { trem: 7.5, atk: 0.06 }),
  ostinato: (b, s, d, f, v, p) => strings(b, s, d, f, v, p, { atk: 0.012, rel: 0.1, dark: true }),
  wood: (b, s, d, f, v, p) => wood(b, s, d, f, v, p),
  choir: (b, s, d, f, v, p) => choir(b, s, d, f, v, p),
  harp: (b, s, d, f, v, p) => harp(b, s, d, f, v, p),
};

// Where each section sits in the orchestra.
const PAN = {
  brass: 0.28, brassBright: 0.3, brassLow: 0.42,
  strings: -0.3, stringsDark: -0.45, stringsTrem: -0.22, ostinato: -0.38,
  wood: 0.06, choir: 0, harp: -0.5,
};

// ---------------------------------------------------------------------------
// Reverb and bus processing
// ---------------------------------------------------------------------------

/** Schroeder reverb: four parallel combs into two series allpasses. */
function reverb(buf, mix = 0.26, roomScale = 1) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => ({
    d: Math.round(d * roomScale),
    buf: new Float32Array(Math.round(d * roomScale)),
    i: 0,
    fb: 0.83,
  }));
  const combsR = combs.map((c) => ({ d: c.d + 23, buf: new Float32Array(c.d + 23), i: 0, fb: c.fb }));
  const allp = [225, 556, 441].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const allpR = allp.map((a) => ({ d: a.d + 11, buf: new Float32Array(a.d + 11), i: 0 }));

  const runComb = (c, x) => {
    const y = c.buf[c.i];
    c.buf[c.i] = x + y * c.fb;
    c.i = (c.i + 1) % c.d;
    return y;
  };
  const runAll = (a, x) => {
    const y = a.buf[a.i];
    const out = -x + y;
    a.buf[a.i] = x + y * 0.5;
    a.i = (a.i + 1) % a.d;
    return out;
  };

  const n = buf.length / 2;
  for (let i = 0; i < n; i++) {
    const l = buf[i * 2];
    const r = buf[i * 2 + 1];
    let wl = 0;
    let wr = 0;
    for (const c of combs) wl += runComb(c, l * 0.19);
    for (const c of combsR) wr += runComb(c, r * 0.19);
    for (const a of allp) wl = runAll(a, wl);
    for (const a of allpR) wr = runAll(a, wr);
    buf[i * 2] = l * (1 - mix) + wl * mix;
    buf[i * 2 + 1] = r * (1 - mix) + wr * mix;
  }
}

/**
 * Slow auto-level.
 *
 * Peak-normalising a cue leaves its sustained passages far below its loudest
 * hit, which in a film mix means the quiet stretches vanish underneath the
 * narration. This lifts them back up with time constants long enough (0.4 s in,
 * 1.6 s out) that it reads as an engineer riding a fader, not as pumping.
 */
function autoLevel(buf, target = 0.1, maxBoost = 3.2) {
  const n = buf.length / 2;
  const env = new Float32Array(n);
  const atk = Math.exp(-1 / (0.4 * SR));
  const rel = Math.exp(-1 / (1.6 * SR));
  let e = 0;
  for (let i = 0; i < n; i++) {
    const m = Math.max(Math.abs(buf[i * 2]), Math.abs(buf[i * 2 + 1]));
    e = m > e ? atk * e + (1 - atk) * m : rel * e + (1 - rel) * m;
    env[i] = e;
  }
  let g = 1;
  const smooth = Math.exp(-1 / (0.5 * SR));
  for (let i = 0; i < n; i++) {
    const want = env[i] > 1e-5 ? clamp(target / env[i], 0.85, maxBoost) : 1;
    g = smooth * g + (1 - smooth) * want;
    buf[i * 2] *= g;
    buf[i * 2 + 1] *= g;
  }
}

/** Gentle bus compression followed by a hard-knee soft limiter. */
function busProcess(buf, targetPeak = 0.55) {
  const n = buf.length / 2;
  let env = 0;
  const atk = Math.exp(-1 / (0.012 * SR));
  const rel = Math.exp(-1 / (0.26 * SR));
  const thr = 0.28;
  for (let i = 0; i < n; i++) {
    const m = Math.max(Math.abs(buf[i * 2]), Math.abs(buf[i * 2 + 1]));
    env = m > env ? atk * env + (1 - atk) * m : rel * env + (1 - rel) * m;
    let g = 1;
    if (env > thr) g = (thr + (env - thr) * 0.34) / env;
    buf[i * 2] *= g;
    buf[i * 2 + 1] *= g;
  }
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const gain = peak > 1e-6 ? targetPeak / peak : 1;
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * gain * 1.05) * 0.97;
}

/** Fade the very start and end so a cue never clicks in or out. */
function edges(buf, fadeIn = 0.05, fadeOut = 1.6) {
  const n = buf.length / 2;
  const fi = Math.round(fadeIn * SR);
  const fo = Math.round(fadeOut * SR);
  for (let i = 0; i < fi; i++) {
    const g = i / fi;
    buf[i * 2] *= g;
    buf[i * 2 + 1] *= g;
  }
  for (let i = 0; i < fo; i++) {
    const g = i / fo;
    const k = n - 1 - i;
    buf[k * 2] *= g;
    buf[k * 2 + 1] *= g;
  }
}

// ---------------------------------------------------------------------------
// Composition layer
// ---------------------------------------------------------------------------

/**
 * Original motifs, written as scale-degree offsets in semitones from the
 * tonic, with rhythms in beats. None of these quote any existing melody.
 */
const MOTIF = {
  // Heroic: rising fourth, a climb, then a proud fall.
  hero: {
    notes: [-5, 0, 2, 4, 7, 5, 4, 2, 0],
    beats: [1, 1.5, 0.5, 1, 2, 0.5, 0.5, 1, 2],
  },
  // Empire: a heavy dotted tread with a falling minor third and a chromatic bite.
  menace: {
    notes: [0, 0, -3, 0, -4, -5],
    beats: [1.5, 0.5, 2, 1.5, 0.5, 2],
  },
  // Hope: wide, slow, warm — the twin-suns material.
  hope: {
    notes: [0, 7, 9, 7, 4, 2, 0],
    beats: [2, 2, 3, 1, 2, 2, 4],
  },
  // Resolve: a short determined tag used to end cues.
  resolve: {
    notes: [0, 4, 7, 12],
    beats: [0.75, 0.75, 0.5, 2],
  },
};

const CHORD = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  sus: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  add9: [0, 4, 7, 14],
};

class Cue {
  constructor({ id, duration, bpm, tonic, seed = 1 }) {
    this.id = id;
    this.duration = duration;
    this.bpm = bpm;
    this.spb = 60 / bpm;
    this.tonic = tonic;
    this.events = [];
    this.rnd = mulberry32(seed);
  }
  /** Schedule a pitched note. `t` in seconds, `dur` in beats. */
  note(t, durBeats, midi, inst, vel = 0.8, pan = null) {
    if (t >= this.duration) return;
    this.events.push({
      t,
      dur: durBeats * this.spb,
      midi,
      inst,
      vel,
      pan: pan ?? PAN[inst] ?? 0,
    });
  }
  perc(t, kind, vel = 0.8, arg = null) {
    if (t >= this.duration) return;
    this.events.push({ t, perc: kind, vel, arg });
  }
  /** Lay a motif starting at `t`, transposed to `root` (a MIDI note). */
  motif(t, name, root, inst, { vel = 0.85, scale = 1, octave = 0, pan = null } = {}) {
    const m = MOTIF[name];
    let c = t;
    for (let i = 0; i < m.notes.length; i++) {
      const beats = m.beats[i] * scale;
      this.note(c, beats * 0.96, root + m.notes[i] + octave * 12, inst, vel, pan);
      c += beats * this.spb;
    }
    return c;
  }
  /** Sustained chord voicing. */
  chord(t, durBeats, root, quality, inst, { vel = 0.5, spread = true, pan = null } = {}) {
    const iv = CHORD[quality] || CHORD.maj;
    for (let i = 0; i < iv.length; i++) {
      const p = pan ?? (PAN[inst] ?? 0) + (spread ? (i - iv.length / 2) * 0.09 : 0);
      this.note(t, durBeats, root + iv[i], inst, vel * (i === 0 ? 1 : 0.82), clamp(p, -1, 1));
    }
  }
  /** Repeating quaver figure on a chord — the engine of the action cues. */
  ostinato(t, bars, root, quality, { vel = 0.5, sub = 2, beatsPerBar = 4, inst = 'ostinato' } = {}) {
    const iv = CHORD[quality] || CHORD.min;
    const step = this.spb / sub;
    const n = Math.round(bars * beatsPerBar * sub);
    for (let i = 0; i < n; i++) {
      const p = iv[i % iv.length];
      const accent = i % (sub * 2) === 0 ? 1.25 : 1;
      this.note(t + i * step, 0.9 / sub, root + p, inst, vel * accent);
    }
  }

  render() {
    const frames = Math.ceil(this.duration * SR);
    const buf = new Float32Array(frames * 2);
    for (const e of this.events) {
      const s0 = Math.round(e.t * SR);
      if (e.perc) {
        if (e.perc === 'timp') timpani(buf, s0, mtof(e.arg ?? 36), e.vel);
        else if (e.perc === 'snare') snare(buf, s0, e.vel);
        else if (e.perc === 'cym') cymbal(buf, s0, e.arg ?? 1.4, e.vel);
        else if (e.perc === 'boom') boom(buf, s0, e.vel);
        continue;
      }
      const fn = INSTRUMENTS[e.inst];
      if (!fn) continue;
      fn(buf, s0, e.dur, mtof(e.midi), e.vel, e.pan);
    }
    reverb(buf, this.reverbMix ?? 0.3, this.room ?? 1);
    autoLevel(buf, this.level ?? 0.1);
    busProcess(buf, this.peak ?? 0.55);
    edges(buf, 0.06, this.fadeOut ?? 1.8);
    return buf;
  }
}

// ---------------------------------------------------------------------------
// The cues
// ---------------------------------------------------------------------------

const D = 62; // D below middle C, the film's home tonic

const CUES = {
  /** Main title: fanfare over the logo, then a rolling adventure ostinato. */
  crawl(dur) {
    const c = new Cue({ id: 'crawl', duration: dur, bpm: 104, tonic: D, seed: 11 });
    c.peak = 0.60;
    const b = c.spb;

    // Fanfare. Timpani roll into a full brass statement.
    for (let i = 0; i < 7; i++) c.perc(0.15 + i * 0.09, 'timp', 0.25 + i * 0.07, 38);
    c.perc(0.85, 'cym', 0.6, 1.1);
    c.perc(0.9, 'boom', 0.8);
    c.motif(0.95, 'hero', D, 'brassBright', { vel: 0.95, scale: 1.0 });
    c.motif(0.95, 'hero', D - 12, 'brassLow', { vel: 0.7, scale: 1.0 });
    c.chord(0.95, 4, D - 24, 'maj', 'stringsDark', { vel: 0.5 });
    c.chord(0.95 + 4 * b, 4, D - 24 + 5, 'maj', 'stringsDark', { vel: 0.5 });
    c.perc(0.95 + 4 * b, 'timp', 0.8, 43);
    c.motif(0.95 + 8 * b, 'resolve', D + 7, 'brassBright', { vel: 0.9 });
    c.perc(0.95 + 8 * b, 'timp', 0.85, 38);
    c.perc(0.95 + 10 * b, 'cym', 0.5, 0.9);

    // Adventure section: a chugging string ostinato under long horn lines.
    const prog = [
      [D - 12, 'min', 2], [D - 12 + 8, 'maj', 2], [D - 12 + 5, 'maj', 2], [D - 12 + 3, 'maj', 2],
      [D - 12, 'min', 2], [D - 12 + 8, 'maj', 2], [D - 12 + 10, 'maj', 2], [D - 12 + 5, 'maj', 2],
    ];
    let t = 0.95 + 12 * b;
    let bar = 0;
    while (t < dur - 6) {
      const [root, q, bars] = prog[bar % prog.length];
      c.ostinato(t, bars, root - 12, q, { vel: 0.34, sub: 2 });
      c.chord(t, bars * 4, root, q, 'strings', { vel: 0.3 });
      c.chord(t, bars * 4, root - 24, q, 'stringsDark', { vel: 0.34 });
      if (bar % 2 === 0) c.perc(t, 'timp', 0.5, root - 24);
      c.perc(t + 2 * b, 'snare', 0.22);
      c.perc(t + 3 * b, 'snare', 0.16);
      if (bar % 4 === 1) c.motif(t, 'hero', root + 12, 'brass', { vel: 0.6, scale: 1.0 });
      if (bar % 4 === 3) c.motif(t, 'hope', root + 12, 'wood', { vel: 0.5, scale: 0.75 });
      t += bars * 4 * b;
      bar++;
    }
    // Sign off with a held chord.
    c.chord(dur - 6, 12, D - 12, 'min', 'strings', { vel: 0.4 });
    c.chord(dur - 6, 12, D - 24, 'min', 'brassLow', { vel: 0.35 });
    c.perc(dur - 6, 'cym', 0.35, 2.2);
    return c;
  },

  /** Pursuit: driving low ostinato, stabbing brass, a crushing arrival. */
  chase(dur) {
    const c = new Cue({ id: 'chase', duration: dur, bpm: 138, tonic: D, seed: 22 });
    const b = c.spb;
    c.peak = 0.58;
    let t = 0;
    let bar = 0;
    const prog = [[D - 12, 'min'], [D - 12, 'min'], [D - 12 + 1, 'maj'], [D - 12 - 2, 'maj']];
    while (t < dur - 4) {
      const [root, q] = prog[bar % prog.length];
      c.ostinato(t, 1, root - 12, q, { vel: 0.34, sub: 3 });
      c.chord(t, 4, root - 24, q, 'stringsDark', { vel: 0.28 });
      c.perc(t, 'timp', bar % 2 === 0 ? 0.6 : 0.4, root - 24);
      for (let k = 0; k < 4; k++) c.perc(t + k * b + b * 0.5, 'snare', k === 3 ? 0.3 : 0.16);
      // Stabs
      if (bar % 4 === 2) {
        c.note(t, 0.5, root + 12, 'brassBright', 0.7);
        c.note(t + b, 0.5, root + 15, 'brassBright', 0.7);
      }
      // The destroyer arrives: low brass menace, gathering weight.
      if (t > 7 && t < 17) {
        if (bar % 2 === 0) c.motif(t, 'menace', root - 12, 'brassLow', { vel: 0.55 + (t - 7) * 0.03, scale: 0.5 });
      }
      if (t > 17) {
        c.chord(t, 4, root - 12, q, 'brassLow', { vel: 0.42 });
        if (bar % 4 === 0) c.perc(t, 'boom', 0.5);
      }
      t += 4 * b;
      bar++;
    }
    c.perc(dur - 4.2, 'cym', 0.45, 1.6);
    c.chord(dur - 4, 10, D - 24, 'min', 'stringsDark', { vel: 0.4 });
    c.chord(dur - 4, 10, D - 36, 'min', 'brassLow', { vel: 0.3 });
    return c;
  },

  /** Stalking, then the entrance. Quiet until it is not. */
  boarding(dur) {
    const c = new Cue({ id: 'boarding', duration: dur, bpm: 92, tonic: D, seed: 33 });
    const b = c.spb;
    c.peak = 0.50;
    c.reverbMix = 0.34;
    // A low heartbeat pulse under held dark strings.
    for (let t = 0; t < 13; t += b) c.perc(t, 'timp', t % (b * 4) < 0.01 ? 0.28 : 0.14, 33);
    c.chord(0, 24, D - 24, 'min', 'stringsDark', { vel: 0.3 });
    c.note(2, 6, D + 3, 'wood', 0.32);
    c.note(6.4, 5, D + 2, 'wood', 0.3);

    // The door blows.
    c.perc(7.6, 'boom', 0.9);
    c.perc(7.6, 'cym', 0.5, 0.35);
    c.chord(7.7, 6, D - 12, 'dim', 'stringsTrem', { vel: 0.42 });
    for (let k = 0; k < 12; k++) c.perc(8.1 + k * 0.22, 'snare', 0.26 - k * 0.012);

    // Firefight: agitated tremolo.
    let t = 10.6;
    while (t < 15.5) {
      c.ostinato(t, 1, D - 24, 'dim', { vel: 0.3, sub: 4 });
      c.perc(t, 'timp', 0.35, 34);
      t += 4 * b;
    }

    // Silence, then the menace figure as he steps through.
    c.chord(16.4, 10, D - 24, 'min', 'stringsDark', { vel: 0.24 });
    c.perc(18.6, 'boom', 0.55);
    c.motif(19.0, 'menace', D - 24, 'brassLow', { vel: 0.7, scale: 1.3 });
    c.motif(19.0, 'menace', D - 12, 'choir', { vel: 0.3, scale: 1.3 });
    c.perc(19.0, 'timp', 0.6, 30);

    // His walk: a slow implacable tread to the end.
    let w = 24.5;
    while (w < dur - 3) {
      c.perc(w, 'timp', 0.45, 31);
      c.chord(w, 8, D - 24, 'min', 'brassLow', { vel: 0.3 });
      w += 4 * b;
    }
    c.fadeOut = 2.4;
    return c;
  },

  /** Tender and determined, with one anxious surge at the launch. */
  plans(dur) {
    const c = new Cue({ id: 'plans', duration: dur, bpm: 76, tonic: D, seed: 44 });
    const b = c.spb;
    c.peak = 0.50;
    const prog = [
      [D - 12, 'min7'], [D - 12 + 5, 'maj'], [D - 12 + 8, 'maj7'], [D - 12 + 3, 'maj'],
      [D - 12, 'min7'], [D - 12 + 7, 'sus'], [D - 12 + 5, 'maj'], [D - 12 + 8, 'maj'],
    ];
    let t = 0;
    let bar = 0;
    while (t < 18) {
      const [root, q] = prog[bar % prog.length];
      c.chord(t, 4, root, q, 'strings', { vel: 0.28 });
      c.chord(t, 4, root - 12, q, 'stringsDark', { vel: 0.24 });
      // harp arpeggio
      const iv = CHORD[q];
      for (let k = 0; k < 6; k++) c.note(t + k * b * 0.5, 2, root + 12 + iv[k % iv.length], 'harp', 0.36);
      if (bar % 4 === 1) c.motif(t, 'hope', root + 12, 'wood', { vel: 0.42, scale: 0.6 });
      t += 4 * b;
      bar++;
    }
    // The pod launches: everything tightens.
    c.perc(18.4, 'boom', 0.5);
    c.perc(18.4, 'cym', 0.4, 0.8);
    let u = 18.6;
    while (u < 29) {
      c.ostinato(u, 1, D - 24, 'min', { vel: 0.32, sub: 3 });
      c.chord(u, 4, D - 12, 'min', 'stringsTrem', { vel: 0.28 });
      c.perc(u, 'timp', 0.42, 38);
      u += 4 * b;
    }
    // Release into calm resolve.
    c.chord(29.2, 8, D - 12, 'maj', 'strings', { vel: 0.3 });
    c.motif(29.4, 'resolve', D, 'brass', { vel: 0.45, scale: 1.4 });
    c.chord(34, 10, D - 24, 'add9', 'choir', { vel: 0.26 });
    return c;
  },

  /** Wide, lonely and modal, blooming into the hope material. */
  tatooine(dur) {
    const c = new Cue({ id: 'tatooine', duration: dur, bpm: 66, tonic: D, seed: 55 });
    const b = c.spb;
    c.peak = 0.48;
    c.reverbMix = 0.4;
    c.room = 1.35;
    // Sparse open fifths under a solo woodwind line.
    const bed = [[D - 24, 'sus'], [D - 24 + 3, 'maj'], [D - 24 + 5, 'sus'], [D - 24, 'min']];
    let t = 0;
    let bar = 0;
    while (t < 24) {
      const [root, q] = bed[bar % bed.length];
      c.chord(t, 6, root, q, 'stringsDark', { vel: 0.24 });
      if (bar % 2 === 0) c.note(t, 6, root + 24, 'choir', 0.16);
      t += 4 * b;
      bar++;
    }
    c.motif(2.2, 'hope', D, 'wood', { vel: 0.46, scale: 0.8 });
    c.motif(10.5, 'hope', D + 5, 'wood', { vel: 0.4, scale: 0.8 });
    for (let k = 0; k < 5; k++) c.note(14 + k * 1.1, 3, D + 12 + [0, 4, 7, 9, 12][k], 'harp', 0.3);

    // The twin sunset: the full statement, warm and slow.
    c.perc(24.6, 'cym', 0.3, 2.4);
    c.chord(25.0, 12, D - 24, 'maj', 'strings', { vel: 0.34 });
    c.chord(25.0, 12, D - 36, 'maj', 'stringsDark', { vel: 0.3 });
    c.motif(25.4, 'hope', D, 'brass', { vel: 0.55, scale: 1.15 });
    c.motif(25.4, 'hope', D - 12, 'choir', { vel: 0.24, scale: 1.15 });
    c.chord(33.5, 12, D - 24 + 5, 'maj7', 'strings', { vel: 0.3 });
    c.chord(33.5, 12, D - 36 + 5, 'maj', 'choir', { vel: 0.22 });
    c.fadeOut = 3.2;
    return c;
  },

  /** Cold machinery turning into resolve. */
  deathstar(dur) {
    const c = new Cue({ id: 'deathstar', duration: dur, bpm: 112, tonic: D, seed: 66 });
    const b = c.spb;
    c.peak = 0.54;
    // Ticking low ostinato.
    let t = 0;
    let bar = 0;
    while (t < 10) {
      c.ostinato(t, 1, D - 24, 'min', { vel: 0.26, sub: 4 });
      c.note(t, 4, D - 36, 'stringsDark', 0.3);
      c.perc(t + 2 * b, 'snare', 0.14);
      t += 4 * b;
      bar++;
    }
    c.motif(2.0, 'menace', D - 12, 'brassLow', { vel: 0.5, scale: 0.9 });
    c.motif(6.4, 'menace', D - 12 + 3, 'brassLow', { vel: 0.55, scale: 0.9 });
    // The squadron launches: the ostinato turns heroic.
    c.perc(10.2, 'boom', 0.55);
    c.perc(10.2, 'cym', 0.45, 1.0);
    let u = 10.4;
    let k = 0;
    const prog = [[D - 12, 'min'], [D - 12 + 8, 'maj'], [D - 12 + 5, 'maj'], [D - 12 + 10, 'maj']];
    while (u < dur - 3) {
      const [root, q] = prog[k % prog.length];
      c.ostinato(u, 1, root - 12, q, { vel: 0.36, sub: 4 });
      c.chord(u, 4, root, q, 'strings', { vel: 0.3 });
      c.perc(u, 'timp', 0.5, root - 24);
      for (let j = 0; j < 4; j++) c.perc(u + j * b + b * 0.5, 'snare', 0.18);
      if (k % 2 === 1) c.motif(u, 'resolve', root + 12, 'brassBright', { vel: 0.6, scale: 1.0 });
      u += 4 * b;
      k++;
    }
    return c;
  },

  /** The action set-piece: fast, hammering, with a hush before the blaze. */
  trench(dur) {
    const c = new Cue({ id: 'trench', duration: dur, bpm: 152, tonic: D, seed: 77 });
    const b = c.spb;
    c.peak = 0.62;
    const prog = [
      [D - 12, 'min'], [D - 12, 'min'], [D - 12 - 2, 'maj'], [D - 12 + 3, 'maj'],
      [D - 12, 'min'], [D - 12 + 5, 'min'], [D - 12 + 1, 'maj'], [D - 12 - 2, 'maj'],
    ];
    let t = 0;
    let bar = 0;
    // Drive up to the hush at 34s.
    while (t < 33.5) {
      const [root, q] = prog[bar % prog.length];
      const intensity = clamp(0.24 + t * 0.005, 0.24, 0.36);
      c.ostinato(t, 1, root - 12, q, { vel: intensity, sub: 2 });
      c.chord(t, 4, root - 24, q, 'stringsDark', { vel: 0.24 });
      c.perc(t, 'timp', 0.5, root - 24);
      for (let j = 0; j < 4; j++) c.perc(t + j * b, 'snare', j % 2 ? 0.12 : 0.24);
      if (bar % 4 === 0 && t > 5) c.motif(t, 'hero', root + 12, 'brassBright', { vel: 0.55, scale: 0.5 });
      if (bar % 4 === 2 && t > 11) c.motif(t, 'menace', root - 12, 'brassLow', { vel: 0.5, scale: 0.5 });
      t += 4 * b;
      bar++;
    }
    // 22–33s: hush for the mystical beat. Strip it back to choir and strings.
    c.chord(22.2, 20, D - 24, 'sus', 'choir', { vel: 0.3 });
    c.chord(22.2, 20, D - 36, 'sus', 'stringsDark', { vel: 0.26 });
    c.note(24.5, 8, D + 7, 'wood', 0.3);
    c.motif(28.6, 'hope', D, 'wood', { vel: 0.4, scale: 0.75 });
    for (let k = 0; k < 6; k++) c.note(29 + k * 0.7, 3, D + 12 + [0, 7, 4, 9, 7, 12][k], 'harp', 0.26);

    // Torpedoes away — the drive returns, harder.
    let u = 33.6;
    let k2 = 0;
    while (u < 44) {
      const [root, q] = prog[k2 % prog.length];
      c.ostinato(u, 1, root - 12, q, { vel: 0.38, sub: 2 });
      c.chord(u, 4, root - 24, q, 'brassLow', { vel: 0.3 });
      c.perc(u, 'timp', 0.6, root - 24);
      for (let j = 0; j < 4; j++) c.perc(u + j * b, 'snare', j % 2 ? 0.14 : 0.26);
      u += 4 * b;
      k2++;
    }
    // The station goes up.
    c.perc(43.4, 'cym', 0.6, 1.2);
    c.perc(44.0, 'boom', 1.0);
    c.perc(44.0, 'timp', 0.9, 38);
    c.chord(44.1, 16, D - 12, 'maj', 'brassBright', { vel: 0.7 });
    c.chord(44.1, 16, D - 24, 'maj', 'strings', { vel: 0.45 });
    c.chord(44.1, 16, D - 36, 'maj', 'brassLow', { vel: 0.4 });
    c.motif(44.3, 'hero', D, 'brassBright', { vel: 0.85, scale: 1.3 });
    c.perc(46.5, 'cym', 0.4, 2.6);
    c.chord(49.5, 14, D - 24, 'add9', 'strings', { vel: 0.34 });
    c.chord(49.5, 14, D - 36, 'maj', 'choir', { vel: 0.26 });
    c.fadeOut = 3.4;
    return c;
  },

  /** Full triumphant statement, then a noble fade. */
  medals(dur) {
    const c = new Cue({ id: 'medals', duration: dur, bpm: 84, tonic: D, seed: 88 });
    const b = c.spb;
    c.peak = 0.58;
    c.perc(0.1, 'timp', 0.5, 38);
    c.perc(0.1, 'cym', 0.45, 1.0);
    c.chord(0.15, 8, D - 24, 'maj', 'strings', { vel: 0.36 });
    c.chord(0.15, 8, D - 36, 'maj', 'brassLow', { vel: 0.34 });
    c.motif(0.4, 'hero', D, 'brassBright', { vel: 0.85, scale: 1.25 });
    c.motif(0.4, 'hero', D - 12, 'brass', { vel: 0.5, scale: 1.25 });

    const prog = [
      [D - 12, 'maj'], [D - 12 + 5, 'maj'], [D - 12 + 9, 'min'], [D - 12 + 7, 'maj'],
      [D - 12, 'maj'], [D - 12 + 8, 'maj'], [D - 12 + 5, 'maj7'], [D - 12, 'maj'],
    ];
    let t = 8.4;
    let bar = 0;
    while (t < 20) {
      const [root, q] = prog[bar % prog.length];
      c.chord(t, 4, root, q, 'strings', { vel: 0.32 });
      c.chord(t, 4, root - 12, q, 'stringsDark', { vel: 0.28 });
      const iv = CHORD[q];
      for (let k = 0; k < 4; k++) c.note(t + k * b * 0.75, 2, root + 12 + iv[k % iv.length], 'harp', 0.3);
      if (bar % 2 === 0) c.perc(t, 'timp', 0.4, root - 24);
      if (bar === 2) c.motif(t, 'hope', root + 12, 'wood', { vel: 0.42, scale: 0.9 });
      if (bar === 5) c.motif(t, 'resolve', root + 12, 'brass', { vel: 0.6, scale: 1.2 });
      t += 4 * b;
      bar++;
    }
    // The set lifts away: open out into something wide and quiet.
    c.perc(20.2, 'cym', 0.35, 2.0);
    c.chord(20.4, 14, D - 24, 'add9', 'strings', { vel: 0.32 });
    c.chord(20.4, 14, D - 36, 'maj', 'choir', { vel: 0.26 });
    c.motif(21.0, 'hope', D, 'brass', { vel: 0.45, scale: 1.4 });
    c.chord(26.5, 12, D - 24, 'maj', 'choir', { vel: 0.24 });
    c.chord(26.5, 12, D - 36, 'maj', 'stringsDark', { vel: 0.24 });
    c.fadeOut = 4.0;
    return c;
  },
};

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function writeWav(file, buf) {
  const n = buf.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, buf[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

const manifestPath = path.join(ROOT, 'public/audio/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

fs.mkdirSync(OUT, { recursive: true });
const index = {};

for (const [id, scene] of Object.entries(manifest.scenes)) {
  if (only && only !== id) continue;
  const make = CUES[id];
  if (!make) {
    console.warn(`no cue written for scene "${id}"`);
    continue;
  }
  const dur = scene.duration;
  const t0 = Date.now();
  const cue = make(dur);
  const buf = cue.render();

  let peak = 0;
  let rms = 0;
  for (let i = 0; i < buf.length; i++) {
    peak = Math.max(peak, Math.abs(buf[i]));
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / buf.length);

  const wav = path.join(OUT, `${id}.wav`);
  const mp3 = path.join(OUT, `${id}.mp3`);
  writeWav(wav, buf);
  // Scoop 1.5-3 kHz a little: that is where the narration lives, and a
  // synthesized orchestra is very dense there.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', wav,
    '-af', 'equalizer=f=2000:t=q:w=1.3:g=-3.2,equalizer=f=3000:t=q:w=1.6:g=-2.2,highpass=f=34',
    '-c:a', 'libmp3lame', '-b:a', '160k', mp3,
  ]);
  fs.unlinkSync(wav);

  index[id] = { file: `audio/music/${id}.mp3`, duration: dur };
  console.log(
    `${id.padEnd(10)} ${dur.toFixed(1)}s  ${cue.events.length.toString().padStart(4)} events  ` +
      `peak ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS  rms ${(20 * Math.log10(rms || 1e-9)).toFixed(1)} dBFS  ` +
      `(${((Date.now() - t0) / 1000).toFixed(1)}s)`
  );
}

const indexPath = path.join(OUT, 'index.json');
const existing = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : {};
fs.writeFileSync(indexPath, JSON.stringify({ ...existing, ...index }, null, 2));
console.log(`\n${Object.keys(index).length} cue(s) -> ${OUT}`);
