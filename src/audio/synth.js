// A small orchestra made of oscillators.
//
// Every instrument is a function that schedules one note into a Web Audio graph
// at an absolute context time. Nothing is processed in real time, which means
// the identical code renders the score live in a browser and offline into a WAV
// via OfflineAudioContext.

export const NOTE_RE = /^([A-Ga-g])([#b]?)(-?\d)$/;
const SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** "F#3" | 54 -> midi number */
export function midi(note) {
  if (typeof note === 'number') return note;
  const m = NOTE_RE.exec(note);
  if (!m) throw new Error(`bad note: ${note}`);
  const [, letter, accidental, octave] = m;
  let n = SEMI[letter.toLowerCase()] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  return n + (Number(octave) + 1) * 12;
}

export const hz = (note) => 440 * 2 ** ((midi(note) - 69) / 12);

function env(param, when, { a = 0.01, d = 0.1, s = 0.7, r = 0.3, peak = 1, dur = 1 }) {
  const sustain = Math.max(0.001, dur - a - d);
  param.setValueAtTime(0.0001, when);
  param.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + a);
  param.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), when + a + d);
  param.setValueAtTime(Math.max(0.0001, peak * s), when + a + d + sustain);
  param.exponentialRampToValueAtTime(0.0001, when + a + d + sustain + r);
}

function osc(ctx, type, freq, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  return o;
}

function noiseBuffer(ctx, seconds = 2, brown = false) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      d[i] = w;
    }
  }
  return buf;
}

let _noiseCache = new WeakMap();
export function getNoise(ctx, brown = false) {
  let entry = _noiseCache.get(ctx);
  if (!entry) { entry = {}; _noiseCache.set(ctx, entry); }
  const key = brown ? 'brown' : 'white';
  if (!entry[key]) entry[key] = noiseBuffer(ctx, 3, brown);
  return entry[key];
}

export function noiseSource(ctx, { brown = false, loop = true, rate = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx, brown);
  src.loop = loop;
  src.playbackRate.value = rate;
  return src;
}

/** Exponentially decaying noise impulse response -- a serviceable hall. */
export function makeReverb(ctx, { seconds = 2.6, decay = 2.6, wet = 0.28 } = {}) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const impulse = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Slight early-reflection cluster then a smooth tail.
      const early = i < rate * 0.06 ? (Math.random() * 2 - 1) * 0.6 : 0;
      d[i] = ((Math.random() * 2 - 1) * (1 - t) ** decay) * 0.7 + early * (1 - t) ** 8;
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;
  conv.connect(wetGain);
  return { conv, wetGain };
}

// ---------------------------------------------------------------------------
// Instruments. Signature: (ctx, out, { when, dur, freq, vel, ...opts })
// ---------------------------------------------------------------------------

export function brass(ctx, out, { when, dur, freq, vel = 1, bright = 1, detune = 7 }) {
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = 1.6;
  const fEnd = Math.min(11000, freq * (3.2 + bright * 2.4));
  filt.frequency.setValueAtTime(freq * 1.1, when);
  filt.frequency.linearRampToValueAtTime(fEnd * 1.5, when + 0.06);
  filt.frequency.exponentialRampToValueAtTime(Math.max(200, fEnd * 0.7), when + Math.max(0.12, dur * 0.7));
  const oscs = [
    osc(ctx, 'sawtooth', freq, -detune),
    osc(ctx, 'sawtooth', freq, detune),
    osc(ctx, 'square', freq / 2, 0),
  ];
  const mix = ctx.createGain();
  mix.gain.value = 0.34;
  const sub = ctx.createGain();
  sub.gain.value = 0.18;
  oscs[0].connect(mix); oscs[1].connect(mix); oscs[2].connect(sub);
  mix.connect(filt); sub.connect(filt);
  filt.connect(g);
  g.connect(out);
  // A touch of vibrato once the note has settled.
  const lfo = osc(ctx, 'sine', 5.2);
  const lfoG = ctx.createGain();
  lfoG.gain.setValueAtTime(0, when);
  lfoG.gain.setValueAtTime(0, when + Math.min(0.35, dur * 0.4));
  lfoG.gain.linearRampToValueAtTime(freq * 0.006, when + Math.min(0.7, dur * 0.8));
  lfo.connect(lfoG);
  oscs.forEach((o) => lfoG.connect(o.frequency));
  env(g.gain, when, { a: 0.035, d: 0.09, s: 0.82, r: 0.24, peak: 0.5 * vel, dur });
  const stop = when + dur + 0.4;
  [...oscs, lfo].forEach((o) => { o.start(when); o.stop(stop); });
}

export function horn(ctx, out, { when, dur, freq, vel = 1 }) {
  brass(ctx, out, { when, dur, freq, vel: vel * 0.85, bright: 0.35, detune: 4 });
}

export function strings(ctx, out, { when, dur, freq, vel = 1, size = 4 }) {
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = Math.min(6000, freq * 7 + 700);
  filt.Q.value = 0.6;
  const oscs = [];
  for (let i = 0; i < size; i++) {
    const o = osc(ctx, 'sawtooth', freq, (i - (size - 1) / 2) * 9 + (Math.random() - 0.5) * 5);
    const og = ctx.createGain();
    og.gain.value = 0.9 / size;
    o.connect(og).connect(filt);
    oscs.push(o);
  }
  filt.connect(g).connect(out);
  const lfo = osc(ctx, 'sine', 4.6 + Math.random() * 0.6);
  const lfoG = ctx.createGain();
  lfoG.gain.setValueAtTime(0, when);
  lfoG.gain.linearRampToValueAtTime(freq * 0.005, when + Math.min(1.2, dur));
  lfo.connect(lfoG);
  oscs.forEach((o) => lfoG.connect(o.frequency));
  env(g.gain, when, { a: Math.min(0.35, dur * 0.3), d: 0.2, s: 0.85, r: Math.min(1.2, 0.35 + dur * 0.3), peak: 0.34 * vel, dur });
  const stop = when + dur + 1.6;
  [...oscs, lfo].forEach((o) => { o.start(when); o.stop(stop); });
}

export function lowBrass(ctx, out, { when, dur, freq, vel = 1 }) {
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(freq * 2.2, when);
  filt.frequency.linearRampToValueAtTime(freq * 5.5, when + 0.09);
  filt.frequency.exponentialRampToValueAtTime(freq * 2.4, when + Math.max(0.2, dur * 0.6));
  filt.Q.value = 2.2;
  const a = osc(ctx, 'sawtooth', freq, -6);
  const b = osc(ctx, 'sawtooth', freq, 6);
  const c = osc(ctx, 'sine', freq / 2);
  const ag = ctx.createGain(); ag.gain.value = 0.3;
  const cg = ctx.createGain(); cg.gain.value = 0.35;
  a.connect(ag); b.connect(ag); ag.connect(filt);
  c.connect(cg); cg.connect(filt);
  filt.connect(g).connect(out);
  env(g.gain, when, { a: 0.05, d: 0.12, s: 0.8, r: 0.3, peak: 0.6 * vel, dur });
  [a, b, c].forEach((o) => { o.start(when); o.stop(when + dur + 0.45); });
}

export function choir(ctx, out, { when, dur, freq, vel = 1 }) {
  const g = ctx.createGain();
  const sum = ctx.createGain();
  sum.gain.value = 0.5;
  // Two formant bands give the sine stack a vowel.
  for (const [f, q, gain] of [[freq, 1, 1], [freq * 2, 4, 0.35], [freq * 3, 6, 0.18]]) {
    const o = osc(ctx, 'sine', f, (Math.random() - 0.5) * 8);
    const og = ctx.createGain();
    og.gain.value = gain * 0.4;
    o.connect(og).connect(sum);
    o.start(when);
    o.stop(when + dur + 1.4);
  }
  const bp = ctx.createBiquadFilter();
  bp.type = 'peaking';
  bp.frequency.value = 900;
  bp.Q.value = 1.2;
  bp.gain.value = 6;
  sum.connect(bp).connect(g).connect(out);
  env(g.gain, when, { a: Math.min(0.5, dur * 0.35), d: 0.3, s: 0.9, r: Math.min(1.5, dur * 0.5 + 0.4), peak: 0.3 * vel, dur });
}

export function pad(ctx, out, { when, dur, freq, vel = 1 }) {
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = freq * 5 + 300;
  const oscs = [osc(ctx, 'sawtooth', freq, -11), osc(ctx, 'sawtooth', freq, 11), osc(ctx, 'triangle', freq / 2)];
  const m = ctx.createGain();
  m.gain.value = 0.28;
  oscs.forEach((o) => o.connect(m));
  m.connect(filt).connect(g).connect(out);
  env(g.gain, when, { a: Math.min(1.4, dur * 0.4), d: 0.4, s: 0.9, r: Math.min(2.4, dur * 0.6), peak: 0.26 * vel, dur });
  oscs.forEach((o) => { o.start(when); o.stop(when + dur + 2.6); });
}

export function harp(ctx, out, { when, dur, freq, vel = 1 }) {
  const g = ctx.createGain();
  const o = osc(ctx, 'triangle', freq);
  const o2 = osc(ctx, 'sine', freq * 2);
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.36 * vel, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.4, dur * 1.3));
  [o, o2].forEach((x) => { x.start(when); x.stop(when + Math.max(0.5, dur * 1.4)); });
}

export function bell(ctx, out, { when, dur, freq, vel = 1 }) {
  const g = ctx.createGain();
  const carrier = osc(ctx, 'sine', freq);
  const mod = osc(ctx, 'sine', freq * 3.51);
  const modG = ctx.createGain();
  modG.gain.setValueAtTime(freq * 2.2 * vel, when);
  modG.gain.exponentialRampToValueAtTime(1, when + Math.max(0.3, dur));
  mod.connect(modG).connect(carrier.frequency);
  carrier.connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.8, dur * 1.6));
  [carrier, mod].forEach((x) => { x.start(when); x.stop(when + Math.max(1, dur * 1.7)); });
}

export function timpani(ctx, out, { when, dur = 0.8, freq = 90, vel = 1 }) {
  const g = ctx.createGain();
  const o = osc(ctx, 'sine', freq * 1.6);
  o.frequency.setValueAtTime(freq * 1.7, when);
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
  const n = noiseSource(ctx, { loop: false });
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = freq * 4;
  nf.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.5 * vel, when);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
  n.connect(nf).connect(ng).connect(g);
  o.connect(g);
  g.connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.85 * vel, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.start(when); o.stop(when + dur + 0.1);
  n.start(when); n.stop(when + 0.2);
}

export function taiko(ctx, out, { when, dur = 0.6, freq = 62, vel = 1 }) {
  timpani(ctx, out, { when, dur, freq, vel: vel * 1.15 });
}

export function snare(ctx, out, { when, dur = 0.2, vel = 1 }) {
  const n = noiseSource(ctx, { loop: false });
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  n.connect(hp).connect(bp).connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.42 * vel, when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.start(when);
  n.stop(when + dur + 0.05);
}

export function cymbal(ctx, out, { when, dur = 1.8, vel = 1 }) {
  const n = noiseSource(ctx, { loop: false });
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 4200;
  const g = ctx.createGain();
  n.connect(hp).connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.start(when);
  n.stop(when + dur + 0.1);
}

/** A low sustained rumble bed -- used under capital ships and the station. */
export function rumble(ctx, out, { when, dur, vel = 1, freq = 42 }) {
  const n = noiseSource(ctx, { brown: true });
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 140;
  const g = ctx.createGain();
  const o = osc(ctx, 'sine', freq);
  const og = ctx.createGain();
  og.gain.value = 0.35;
  o.connect(og).connect(g);
  n.connect(lp).connect(g).connect(out);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.6);
  g.gain.setValueAtTime(0.3 * vel, when + dur - 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.start(when); n.stop(when + dur + 0.1);
  o.start(when); o.stop(when + dur + 0.1);
}

export const INSTRUMENTS = { brass, horn, strings, lowBrass, choir, pad, harp, bell, timpani, taiko, snare, cymbal, rumble };
