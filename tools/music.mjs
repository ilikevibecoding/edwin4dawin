#!/usr/bin/env node
/**
 * The score.
 *
 * An original orchestral-style cue generator: a small synth orchestra (strings,
 * brass, horns, timpani, harp, choir, percussion) plus a sequencer, writing one
 * wav per cue. The themes are written for this film -- no existing melodies are
 * reproduced.
 *
 *   node tools/music.mjs [--force] [--only=hope]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  SR, buf, stereo, stereoSec, rng, db, clamp, lerp, mtof, glide, softclip,
  Osc, SVF, Ladder, Biquad, eqBuffer, whiteNoise, pinkNoise, adsr, expDec,
  fadeStereo, reverbStereo, addMono, scaleStereo, normalise, limit, peakOf,
} from './lib/dsp.mjs';
import { writeWav } from './lib/wav.mjs';

const OUT = path.resolve(import.meta.dirname, '../public/audio/music');
const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
fs.mkdirSync(OUT, { recursive: true });

// ------------------------------------------------------------------ patches

/** Warm string section: three detuned saws, slow bow, gentle vibrato. */
function strings(f, dur, { vel = 0.8, bright = 1, seed = 1 } = {}) {
  const rel = 0.55;
  const n = Math.round((dur + rel) * SR);
  const len = Math.round(dur * SR);
  const o = [new Osc('saw', 0.11), new Osc('saw', 0.47), new Osc('saw', 0.79)];
  const det = [0.996, 1.0, 1.0042];
  const flt = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = 1 + Math.sin((t - 0.25) * 2 * Math.PI * 5.1) * (t > 0.25 ? 0.0035 : 0);
    const e = adsr(i, len, { a: 0.16, d: 0.5, s: 0.78, r: rel, curve: 2 });
    if ((i & 63) === 0) flt.set(clamp(f * 5 * bright + 500, 200, 9000), 0.8);
    let v = 0;
    for (let k = 0; k < 3; k++) v += o[k].next(f * det[k] * vib) * 0.33;
    out[i] = flt.lpf(v) * e * vel;
  }
  return out;
}

/** Brass: bright, fast attack, filter opens with the note. */
function brass(f, dur, { vel = 0.9, edge = 1 } = {}) {
  const rel = 0.30;
  const n = Math.round((dur + rel) * SR);
  const len = Math.round(dur * SR);
  const a = new Osc('saw', 0.02), b = new Osc('pulse', 0.5, 0.42);
  const flt = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = adsr(i, len, { a: 0.035, d: 0.22, s: 0.82, r: rel, curve: 1.8 });
    const open = clamp(t / 0.09, 0, 1);
    if ((i & 31) === 0) flt.set(clamp(f * (2.2 + open * 5.5 * edge), 200, 11000), 1.5);
    let v = a.next(f) * 0.62 + b.next(f * 1.003) * 0.38;
    v = flt.lpf(v);
    out[i] = softclip(v * e * vel, 1.25) * 0.85;
  }
  eqBuffer(out, [(q) => q.peaking(1300, 1.1, 3.5), (q) => q.highpass(70, 0.7)]);
  return out;
}

/** French horn: rounder, darker, sits under the melody. */
function horn(f, dur, { vel = 0.8 } = {}) {
  const rel = 0.45;
  const n = Math.round((dur + rel) * SR);
  const len = Math.round(dur * SR);
  const a = new Osc('saw', 0.3), s = new Osc('sine');
  const flt = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = adsr(i, len, { a: 0.09, d: 0.4, s: 0.8, r: rel, curve: 2 });
    if ((i & 63) === 0) flt.set(clamp(f * 3.4 + 240, 200, 4200), 0.9);
    const vib = 1 + Math.sin(t * 2 * Math.PI * 4.6) * (t > 0.4 ? 0.003 : 0);
    out[i] = flt.lpf(a.next(f * vib) * 0.7 + s.next(f * 2 * vib) * 0.18) * e * vel;
  }
  return out;
}

function lowBrass(f, dur, opts = {}) {
  const b = brass(f, dur, { vel: opts.vel ?? 0.95, edge: 0.5 });
  eqBuffer(b, [(q) => q.lowpass(2400, 0.8), (q) => q.peaking(120, 1.0, 5)]);
  return b;
}

/** Timpani: pitched thump with a noise attack. */
function timp(f, dur, { vel = 1 } = {}) {
  const n = Math.round((dur + 0.6) * SR);
  const o = new Osc('sine'), o2 = new Osc('sine');
  const nz = whiteNoise(Math.round(0.05 * SR), rng(Math.round(f * 100)));
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = f * (1 + expDec(i, 0.012) * 0.22);
    let v = o.next(p) * 0.9 + o2.next(p * 1.51) * 0.12;
    if (i < nz.length) v += nz[i] * 0.5 * expDec(i, 0.006);
    out[i] = v * expDec(i, 0.42) * vel;
  }
  eqBuffer(out, [(q) => q.lowpass(1400, 0.7)]);
  return out;
}

function snare(dur, { vel = 0.7, seed = 5 } = {}) {
  const n = Math.round(dur * SR);
  const nz = whiteNoise(n, rng(seed));
  const o = new Osc('tri');
  const f = new Ladder(2);
  const out = buf(n);
  f.set(2400, 1.2);
  for (let i = 0; i < n; i++) {
    out[i] = (f.bpf(nz[i]) * 0.9 + o.next(190) * 0.25) * expDec(i, 0.055) * vel;
  }
  return out;
}

function cymbal(dur, { vel = 0.5, seed = 6 } = {}) {
  const n = Math.round(dur * SR);
  const nz = whiteNoise(n, rng(seed));
  const out = buf(n);
  eqBuffer(nz, [(q) => q.highpass(3800, 0.7)]);
  for (let i = 0; i < n; i++) out[i] = nz[i] * expDec(i, 0.55) * vel;
  return out;
}

/** Harp / celesta pluck. */
function harp(f, dur, { vel = 0.6 } = {}) {
  const n = Math.round((dur + 0.9) * SR);
  const o = new Osc('tri'), o2 = new Osc('sine');
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    out[i] = (o.next(f) * 0.5 + o2.next(f * 2.002) * 0.25) * expDec(i, 0.42) * vel;
  }
  eqBuffer(out, [(q) => q.highpass(120, 0.7), (q) => q.lowpass(6000, 0.7)]);
  return out;
}

/** Wordless choir-ish pad, for the mystical cue. */
function choir(f, dur, { vel = 0.5 } = {}) {
  const rel = 0.9;
  const n = Math.round((dur + rel) * SR);
  const len = Math.round(dur * SR);
  const o = [new Osc('saw', 0.2), new Osc('saw', 0.65)];
  const flt = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = adsr(i, len, { a: 0.55, d: 0.8, s: 0.85, r: rel, curve: 2 });
    const vib = 1 + Math.sin(t * 2 * Math.PI * 4.2) * 0.004;
    if ((i & 63) === 0) flt.set(clamp(f * 4 + 300, 200, 3600), 0.7);
    out[i] = flt.lpf(o[0].next(f * vib) * 0.5 + o[1].next(f * 1.005 * vib) * 0.5) * e * vel;
  }
  eqBuffer(out, [(q) => q.peaking(720, 1.1, 6), (q) => q.peaking(1180, 1.3, 4)]);
  return out;
}

/** Low woodwind-ish reed for the desert cue. */
function reed(f, dur, { vel = 0.6 } = {}) {
  const rel = 0.3;
  const n = Math.round((dur + rel) * SR);
  const len = Math.round(dur * SR);
  const o = new Osc('pulse', 0, 0.28);
  const flt = new Ladder(2);
  const out = buf(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = adsr(i, len, { a: 0.07, d: 0.3, s: 0.7, r: rel });
    const vib = 1 + Math.sin(t * 2 * Math.PI * 5.6) * (t > 0.2 ? 0.008 : 0);
    if ((i & 63) === 0) flt.set(clamp(f * 3 + 300, 200, 5000), 1.4);
    out[i] = flt.lpf(o.next(f * vib)) * e * vel;
  }
  return out;
}

const PATCH = { strings, brass, horn, lowBrass, timp, harp, choir, reed };

// ---------------------------------------------------------------- sequencer

/**
 * A cue is a list of parts; each part is a stream of [midi|null, beats] pairs
 * played on one patch. `null` is a rest. Chords are arrays of midi numbers.
 */
class Cue {
  constructor(seconds, { bpm = 96, reverb = 0.3, room = 0.9 } = {}) {
    this.bpm = bpm;
    this.spb = 60 / bpm;
    this.bus = stereoSec(seconds + 3);
    this.seconds = seconds;
    this.reverb = reverb;
    this.room = room;
  }

  /** @param {string} patch @param {Array} seq @param {object} o */
  play(patch, seq, { at = 0, gain = 1, pan = 0, vel = 0.8, oct = 0, stagger = 0 } = {}) {
    const fn = PATCH[patch];
    let t = at;
    for (const [note, beats] of seq) {
      const dur = beats * this.spb;
      if (note !== null && note !== undefined) {
        const notes = Array.isArray(note) ? note : [note];
        notes.forEach((m, k) => {
          const b = fn(mtof(m + oct * 12), dur * 0.96, { vel });
          addMono(this.bus, b, (t + k * stagger) * SR, gain, pan + (k - (notes.length - 1) / 2) * 0.06);
        });
      }
      t += dur;
    }
    return t;
  }

  /** Sustained pad chords: [[midi[], beats], ...] */
  pad(patch, chords, o = {}) { return this.play(patch, chords, { vel: 0.55, gain: 0.5, ...o }); }

  hit(patch, note, atBeat, beats, o = {}) {
    const fn = PATCH[patch];
    const b = fn(mtof(note), beats * this.spb, { vel: o.vel ?? 1 });
    addMono(this.bus, b, atBeat * this.spb * SR, o.gain ?? 1, o.pan ?? 0);
  }

  perc(kind, atBeat, o = {}) {
    const b = kind === 'snare' ? snare(o.dur ?? 0.3, o) : cymbal(o.dur ?? 2.2, o);
    addMono(this.bus, b, atBeat * this.spb * SR, o.gain ?? 0.6, o.pan ?? 0);
  }

  render({ fadeIn = 0.05, fadeOut = 1.5, peak = 0.86 } = {}) {
    const wet = reverbStereo(this.bus, { wet: this.reverb, dry: 1, room: this.room, damp: 0.3, preDelay: 0.03 });
    const n = Math.round(this.seconds * SR);
    const out = stereo(n);
    out.L.set(wet.L.subarray(0, n));
    out.R.set(wet.R.subarray(0, n));
    fadeStereo(out, fadeIn, fadeOut);
    normalise(out, peak);
    limit(out, 0.95);
    return out;
  }
}

// -------------------------------------------------------------------- themes

/*
 * "Hope" -- the theme of the film. A rising fourth into a stepwise descent,
 * turning up at the end. Stated on horn, answered by full strings.
 * Written in D; transposed by the cue that uses it.
 */
const HOPE = [
  [57, 1], [62, 2], [66, 1], [64, 1], [62, 1], [69, 4],
  [67, 1], [66, 1], [64, 2], [62, 3], [null, 1],
];
const HOPE_TAIL = [
  [69, 1], [71, 2], [69, 1], [66, 2], [64, 2], [62, 6], [null, 2],
];

/* The Empire: a low, flat-footed tread with a chromatic sag in the middle. */
const MENACE = [
  [36, 1.5], [36, 0.5], [39, 1], [38, 1], [36, 2], [null, 2],
  [31, 1.5], [32, 0.5], [34, 1], [36, 1], [35, 4], [null, 2],
];

/* Desert: a bare modal line, wide intervals, nothing resolves. */
const DESERT = [
  [69, 2], [72, 1], [70, 3], [67, 2], [null, 2],
  [65, 2], [69, 1], [67, 1], [65, 2], [62, 4], [null, 2],
];

const CHORD = {
  D: [50, 57, 62, 66], Bm: [47, 54, 59, 62], G: [43, 50, 59, 62],
  A: [45, 52, 61, 64], Em: [40, 47, 55, 59], F$m: [42, 49, 57, 61],
  Cm: [36, 43, 51, 55], Ab: [32, 44, 51, 56], Eb: [39, 46, 51, 58],
  Gm: [43, 50, 58, 62], Bb: [34, 46, 53, 58], Fm: [41, 48, 53, 60],
  Dm: [38, 45, 50, 57], Am: [45, 52, 57, 64], Cmaj: [36, 48, 55, 60],
};
const ch = (name, beats) => [CHORD[name], beats];

// --------------------------------------------------------------------- cues

const CUES = {};

CUES.main_fanfare = () => {
  const c = new Cue(23, { bpm: 104, reverb: 0.38 });
  // three-note call, answered an octave up, then the theme head in full brass
  c.play('brass', [
    [62, 0.5], [62, 0.25], [62, 0.25], [66, 1.5], [64, 0.5],
    [62, 1], [69, 3], [null, 1],
  ], { gain: 0.85, vel: 1.0, pan: -0.15 });
  c.play('brass', [
    [null, 8], [74, 0.5], [74, 0.25], [74, 0.25], [78, 1.5], [76, 0.5], [74, 1], [81, 3],
  ], { gain: 0.7, vel: 0.95, pan: 0.2 });
  c.play('lowBrass', [
    [38, 2], [38, 2], [43, 2], [45, 2], [38, 4], [45, 2], [38, 6],
  ], { gain: 0.75, vel: 0.9, pan: 0 });
  c.pad('strings', [
    ch('D', 4), ch('G', 2), ch('A', 2), ch('D', 4), ch('Bm', 2), ch('A', 2), ch('D', 8),
  ], { gain: 0.42, oct: 0 });
  for (const b of [0, 4, 8, 12, 15, 16, 20]) c.hit('timp', b % 8 === 0 ? 38 : 45, b, 1, { vel: 0.9, gain: 0.8 });
  c.perc('cymbal', 0, { gain: 0.5, dur: 3 });
  c.perc('cymbal', 16, { gain: 0.55, dur: 4 });
  // final sustained chord
  c.pad('brass', [[null, 20], [CHORD.D, 6]], { gain: 0.6, vel: 0.9 });
  return c.render({ fadeOut: 2.5 });
};

CUES.chase = () => {
  const c = new Cue(42, { bpm: 148, reverb: 0.26 });
  const ost = [];
  for (let i = 0; i < 40; i++) {
    const p = [38, 38, 45, 38, 41, 38, 43, 38][i % 8];
    ost.push([p, 0.5]);
  }
  c.play('lowBrass', ost, { gain: 0.5, vel: 0.7, pan: -0.1 });
  c.play('strings', [
    [null, 4], [62, 0.5], [64, 0.5], [65, 1], [62, 2],
    [null, 2], [60, 0.5], [62, 0.5], [64, 1], [60, 2],
    [null, 4], [67, 1], [65, 1], [62, 2], [65, 4],
  ], { gain: 0.5, vel: 0.75, oct: 0, pan: 0.15 });
  // brass stabs on the off-beats
  for (const b of [8, 8.5, 12, 16, 16.75, 20, 24, 26, 28, 32, 34, 36, 40, 44, 48]) {
    c.hit('brass', [50, 53, 57][b % 3 | 0], b, 0.4, { vel: 0.95, gain: 0.55, pan: (b % 2 ? 0.25 : -0.25) });
  }
  for (let b = 0; b < 96; b += 2) c.hit('timp', b % 8 === 0 ? 38 : 33, b, 0.5, { vel: 0.55, gain: 0.5 });
  for (let b = 1; b < 96; b += 4) c.perc('snare', b, { gain: 0.3, seed: 5 + b });
  return c.render({ fadeOut: 2.0 });
};

CUES.imperial_menace = () => {
  const c = new Cue(36, { bpm: 72, reverb: 0.42, room: 0.94 });
  c.play('lowBrass', MENACE, { gain: 0.8, vel: 0.95, pan: -0.1 });
  c.play('lowBrass', MENACE, { at: 12 * (60 / 72), gain: 0.6, vel: 0.85, oct: 1, pan: 0.18 });
  c.pad('strings', [
    ch('Cm', 4), ch('Ab', 4), ch('Cm', 4), ch('Gm', 4),
    ch('Cm', 4), ch('Ab', 2), ch('Eb', 2), ch('Cm', 8),
  ], { gain: 0.4, oct: -1 });
  c.pad('choir', [[[48, 51, 55], 12], [[46, 51, 53], 8], [[48, 51, 55], 12]], { gain: 0.3, at: 8 });
  for (let b = 0; b < 32; b += 4) c.hit('timp', 36, b, 1, { vel: 0.85, gain: 0.75 });
  for (let b = 2; b < 32; b += 4) c.hit('timp', 31, b, 0.5, { vel: 0.4, gain: 0.5 });
  return c.render({ fadeOut: 3.0 });
};

CUES.hope_theme = () => {
  const c = new Cue(32, { bpm: 76, reverb: 0.4, room: 0.92 });
  c.play('horn', HOPE, { gain: 0.85, vel: 0.85, pan: -0.1 });
  c.play('strings', HOPE, { at: 0.02, gain: 0.35, vel: 0.6, oct: 1, pan: 0.2 });
  c.pad('strings', [
    ch('D', 4), ch('G', 4), ch('Bm', 4), ch('A', 4),
    ch('G', 4), ch('D', 4), ch('A', 4), ch('D', 8),
  ], { gain: 0.42, oct: -1 });
  c.play('strings', HOPE_TAIL, { at: 18 * (60 / 76), gain: 0.55, vel: 0.8, oct: 0, pan: 0 });
  c.play('harp', [
    [62, 0.5], [66, 0.5], [69, 0.5], [74, 0.5], [69, 0.5], [66, 0.5],
    [59, 0.5], [62, 0.5], [67, 0.5], [71, 0.5], [67, 0.5], [62, 0.5],
  ], { at: 8 * (60 / 76), gain: 0.3, vel: 0.5, pan: 0.35 });
  return c.render({ fadeIn: 0.6, fadeOut: 3.0 });
};

CUES.binary_sunset = () => {
  const c = new Cue(30, { bpm: 66, reverb: 0.46, room: 0.95 });
  // solo horn takes the theme, strings swell in underneath for the answer
  c.play('horn', HOPE, { gain: 0.95, vel: 0.8, pan: 0 });
  c.pad('strings', [
    ch('D', 6), ch('Bm', 6), ch('G', 6), ch('A', 6), ch('D', 8),
  ], { gain: 0.34, oct: -1 });
  c.play('strings', HOPE, { at: 15 * (60 / 66), gain: 0.6, vel: 0.85, oct: 1, pan: -0.1 });
  c.play('horn', HOPE, { at: 15 * (60 / 66), gain: 0.4, vel: 0.7, oct: 0, pan: 0.25 });
  c.play('harp', [[50, 1], [57, 1], [62, 1], [66, 1]], { at: 13 * (60 / 66), gain: 0.28, vel: 0.5, pan: 0.4 });
  return c.render({ fadeIn: 1.2, fadeOut: 3.5 });
};

CUES.desert_wander = () => {
  const c = new Cue(30, { bpm: 84, reverb: 0.3 });
  c.play('reed', DESERT, { gain: 0.6, vel: 0.65, pan: -0.2 });
  c.pad('strings', [ch('Dm', 8), ch('Bb', 4), ch('Dm', 8), ch('Am', 4), ch('Dm', 8)], { gain: 0.28, oct: -1 });
  c.play('harp', [
    [62, 1], [65, 1], [69, 1], [72, 1], [69, 1], [65, 1], [62, 2],
  ], { at: 12 * (60 / 84), gain: 0.25, vel: 0.45, pan: 0.35 });
  for (let b = 0; b < 40; b += 3) c.hit('timp', 38, b, 0.4, { vel: 0.3, gain: 0.35 });
  return c.render({ fadeIn: 0.8, fadeOut: 2.5 });
};

CUES.mystic = () => {
  const c = new Cue(27, { bpm: 60, reverb: 0.55, room: 0.96 });
  c.pad('choir', [[[50, 57, 62], 8], [[48, 55, 60], 8], [[50, 57, 64], 8], [[50, 57, 62], 8]], { gain: 0.42 });
  c.pad('strings', [ch('D', 8), ch('Cmaj', 8), ch('Em', 8), ch('D', 8)], { gain: 0.28, oct: -1 });
  const arp = [];
  for (let i = 0; i < 26; i++) arp.push([[62, 66, 69, 74, 69, 66][i % 6], 0.5]);
  c.play('harp', arp, { at: 4, gain: 0.26, vel: 0.42, pan: 0.3 });
  c.play('horn', [[null, 12], [62, 3], [64, 1], [66, 4], [64, 4]], { gain: 0.5, vel: 0.6, pan: -0.15 });
  return c.render({ fadeIn: 1.5, fadeOut: 3.0 });
};

CUES.battle = () => {
  const c = new Cue(52, { bpm: 160, reverb: 0.28 });
  const ost = [];
  for (let i = 0; i < 96; i++) ost.push([[38, 45, 38, 41, 38, 43, 38, 45][i % 8], 0.5]);
  c.play('lowBrass', ost, { gain: 0.42, vel: 0.65, pan: -0.15 });
  c.play('strings', ost.map(([m, b]) => [m + 12, b]), { gain: 0.22, vel: 0.5, pan: 0.2 });
  // heroic line over the top, twice, second time higher
  const line = [
    [62, 1], [66, 0.5], [69, 0.5], [67, 1], [66, 1], [62, 2],
    [64, 1], [66, 0.5], [69, 0.5], [71, 2], [69, 2],
  ];
  c.play('brass', line, { at: 8 * (60 / 160), gain: 0.7, vel: 0.95, pan: 0 });
  c.play('brass', line.map(([m, b]) => [m + 5, b]), { at: 28 * (60 / 160), gain: 0.75, vel: 1.0, pan: 0.1 });
  c.play('horn', HOPE, { at: 56 * (60 / 160), gain: 0.8, vel: 0.9, oct: 0, pan: -0.1 });
  for (let b = 0; b < 132; b += 1) c.hit('timp', b % 4 === 0 ? 38 : 33, b, 0.3, { vel: b % 4 === 0 ? 0.7 : 0.32, gain: 0.45 });
  for (let b = 0.5; b < 132; b += 1) c.perc('snare', b, { gain: 0.22, dur: 0.16, seed: 11 + b * 3 });
  for (const b of [0, 32, 64, 96, 128]) c.perc('cymbal', b, { gain: 0.4, dur: 2.4 });
  return c.render({ fadeOut: 2.0 });
};

CUES.triumph = () => {
  const c = new Cue(32, { bpm: 88, reverb: 0.42, room: 0.94 });
  c.play('brass', HOPE, { gain: 0.8, vel: 1.0, pan: -0.1 });
  c.play('horn', HOPE, { at: 0.03, gain: 0.5, vel: 0.85, oct: -1, pan: 0.2 });
  c.play('strings', HOPE, { at: 0.05, gain: 0.4, vel: 0.7, oct: 1, pan: 0.1 });
  c.pad('strings', [
    ch('D', 4), ch('G', 4), ch('A', 4), ch('D', 4),
    ch('Bm', 4), ch('G', 4), ch('A', 4), ch('D', 12),
  ], { gain: 0.45, oct: -1 });
  c.play('brass', HOPE_TAIL, { at: 17 * (60 / 88), gain: 0.7, vel: 0.95 });
  for (const b of [0, 8, 16, 24, 32, 36, 38, 40]) c.hit('timp', b % 16 === 0 ? 38 : 45, b, 1, { vel: 0.85, gain: 0.7 });
  c.perc('cymbal', 0, { gain: 0.45, dur: 3 });
  c.perc('cymbal', 32, { gain: 0.55, dur: 4.5 });
  c.pad('brass', [[null, 40], [CHORD.D, 8]], { gain: 0.55, vel: 0.9 });
  return c.render({ fadeOut: 4.0 });
};

// ------------------------------------------------------------------- render

const manifest = {};
for (const [name, fn] of Object.entries(CUES)) {
  if (only && !name.includes(only)) continue;
  const file = path.join(OUT, `${name}.wav`);
  if (!force && fs.existsSync(file)) { manifest[name] = { file: `music/${name}.wav` }; continue; }
  const t0 = Date.now();
  const st = fn();
  const info = writeWav(file, [st.L, st.R]);
  manifest[name] = { file: `music/${name}.wav`, dur: +info.duration.toFixed(3), peak: +peakOf(st).toFixed(3) };
  process.stdout.write(`  ${name.padEnd(18)} ${info.duration.toFixed(1)}s  (${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`${Object.keys(manifest).length} cues -> ${OUT}`);
