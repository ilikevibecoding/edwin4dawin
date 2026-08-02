/**
 * Sound effects — all synthesis, no samples, all scheduled ahead of time.
 *
 * Every effect has the same shape:
 *
 *   SFX.laser(ctx, bus, t, opts) -> endTime
 *
 * `t` is an absolute time on the supplied `BaseAudioContext`, `opts` is
 * optional, and the return value is the absolute time the effect finishes
 * (including its own tail, not the bus reverb tail). Nothing reads
 * `ctx.currentTime` and nothing uses `Math.random()`: randomness comes from a
 * seeded PRNG whose seed is derived from the effect name and its scheduled
 * time, so a cue placed at the same time always sounds identical.
 *
 * Shared opts understood by every effect:
 *   gain  overall level        (default per effect)
 *   pan   -1..1 stereo place   (default 0, omitted node when 0)
 *   send  reverb send amount   (default per effect)
 */

import {
  rng, seedFrom, noiseBuffer, clamp, setAt, lin, exp, hit, NOTE, fanIn,
} from './engine.js';

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

const NOISE_SECS = 3;
const T = (t) => Math.max(0, t);

/**
 * Output chain for one effect: level -> [pan] -> bus.sfx (+ reverb send).
 *
 * Effects hang their layers on `g.in()` rather than on `g`. Most have four or
 * five — a body, a transient, a tail, a sub — and four inputs on one node is
 * the point at which Chrome stops summing reproducibly (see `fanIn`).
 */
function out(ctx, bus, { gain = 1, pan = 0, send = 0.18 } = {}) {
  const g = ctx.createGain();
  g.gain.value = gain;
  g.in = fanIn(ctx, g);
  let node = g;
  if (pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p);
    node = p;
  }
  node.connect(bus.sfxIn ? bus.sfxIn() : bus.sfx);
  if (send > 0 && bus.fx) {
    const s = ctx.createGain();
    s.gain.value = send;
    node.connect(s);
    s.connect(bus.fxIn ? bus.fxIn() : bus.fx);
  }
  return g;
}

/** A looping slice of seeded white noise, started and stopped at exact times. */
function noise(ctx, t, dur, { seed = 1, rate = 1, offset = 0 } = {}) {
  const buf = noiseBuffer(ctx, NOISE_SECS, seed);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = buf.duration;
  src.playbackRate.value = rate;
  src.start(T(t), Math.abs(offset) % buf.duration);
  src.stop(T(t) + Math.max(0.004, dur));
  return src;
}

function osc(ctx, type, freq, t, dur, detuneCents = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(0.01, freq), T(t));
  if (detuneCents) o.detune.value = detuneCents;
  o.start(T(t));
  o.stop(T(t) + Math.max(0.004, dur));
  return o;
}

function bq(ctx, type, freq, Q = 1, gainDb = 0) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = Math.max(10, freq);
  f.Q.value = Q;
  if (gainDb) f.gain.value = gainDb;
  return f;
}

/** A gain, with a summing chain (`g.in()`) for when several layers meet on it. */
function gn(ctx, v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  g.in = fanIn(ctx, g);
  return g;
}

/** Sweep an AudioParam exponentially from a to b between t and t+dur. */
function sweep(param, t, a, b, dur) {
  setAt(param, t, Math.max(1e-4, a));
  exp(param, t + Math.max(0.002, dur), Math.max(1e-4, b));
}

/** A low-frequency oscillator wired to modulate an AudioParam additively. */
function lfo(ctx, t, dur, rate, depth, { type = 'sine', phase = 0 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = rate;
  // A phase offset is faked with a small start delay; keeps everything deterministic.
  const d = phase ? (phase / (2 * Math.PI)) / Math.max(0.001, rate) : 0;
  const g = gn(ctx, depth);
  o.connect(g.in());
  o.start(T(t - d));
  o.stop(T(t) + Math.max(0.01, dur) + 0.05);
  return g;
}

/**
 * Damped feedback comb — the metallic "twang" behind blaster bolts, ricochets
 * and lightsaber clashes. Loop length is clamped above one render quantum,
 * which is the shortest legal delay inside a Web Audio cycle.
 *
 * The loop is a bare delay and gain. A `BiquadFilterNode` inside a Web Audio
 * cycle is not stable in Chrome: with a lowpass in the loop this comb ran away
 * to 1e38 over about fifteen seconds and took the whole mix to NaN, because the
 * filter's measured DC gain sits a hair above unity and the loop integrates it.
 * Damping and DC blocking therefore both sit outside the loop, and the input is
 * highpassed so the comb has no DC to integrate in the first place.
 */
function comb(ctx, freq, decay, damp = 5200) {
  const dt = Math.max(200 / ctx.sampleRate, 1 / Math.max(20, freq));
  const input = bq(ctx, 'highpass', Math.min(400, Math.max(90, freq * 0.35)), 0.6);
  const d = ctx.createDelay(0.2);
  d.delayTime.value = dt;
  const fb = gn(ctx, clamp(Math.pow(10, (-3 * dt) / Math.max(0.02, decay)), 0, 0.9));
  input.connect(d);
  d.connect(fb); fb.connect(d);
  const lp = bq(ctx, 'lowpass', damp, 0.5);
  d.connect(lp);
  return { input, output: lp };
}

/** Dense amplitude automation: a list of [time, attack, peak, decay] grains. */
function grains(param, grainList) {
  setAt(param, Math.max(0, grainList.length ? grainList[0][0] - 0.002 : 0), 0);
  for (const [gt, a, peak, dec] of grainList) {
    setAt(param, gt, 1e-4);
    lin(param, gt + a, peak);
    exp(param, gt + a + dec, 1e-4);
  }
}

/* ------------------------------------------------------------------ *
 * Weapons
 * ------------------------------------------------------------------ */

/** Classic bolt: hard pitch drop through a resonant band plus a wire twang. */
function laser(ctx, bus, t, o = {}) {
  const { gain = 0.8, pan = 0, send = 0.24, pitch = 1, len = 0.30 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const body = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 2400, 3.0);
  body.connect(bp); bp.connect(g.in());

  for (const [type, det, lvl] of [['sawtooth', 0, 0.7], ['square', 9, 0.35]]) {
    const s = osc(ctx, type, 2500 * pitch, t, len + 0.05, det);
    sweep(s.frequency, t, 2500 * pitch, 150 * pitch, 0.10);
    const lg = gn(ctx, lvl);
    s.connect(lg); lg.connect(body.in());
  }
  sweep(bp.frequency, t, 3400 * pitch, 420 * pitch, 0.12);
  hit(body.gain, t, 1, 0.0015, len);

  // Wire twang, the part that makes it read as Star Wars rather than sci-fi.
  const c = comb(ctx, 300 * pitch, 0.30);
  const tw = gn(ctx, 0);
  const tn = noise(ctx, t, 0.02, { seed: seedFrom('laser', t), offset: (t * 7.3) % 2.5 });
  const thp = bq(ctx, 'highpass', 700, 0.7);
  tn.connect(thp); thp.connect(tw); tw.connect(c.input);
  hit(tw.gain, t, 1.1, 0.001, 0.02);
  const cg = gn(ctx, 0.8);
  c.output.connect(cg); cg.connect(g.in());
  return t + len + 0.12;
}

/** Capital-ship gun: everything an inch lower and four times as heavy. */
function turbolaser(ctx, bus, t, o = {}) {
  const { gain = 0.52, pan = 0, send = 0.38, len = 1.0 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const body = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 900, 3.2);
  body.connect(bp); bp.connect(g.in());
  for (const [type, det, lvl] of [['sawtooth', -7, 0.8], ['sawtooth', 11, 0.5], ['square', 0, 0.25]]) {
    const s = osc(ctx, type, 820, t, len + 0.1, det);
    sweep(s.frequency, t, 820, 52, 0.42);
    const lg = gn(ctx, lvl); s.connect(lg); lg.connect(body.in());
  }
  sweep(bp.frequency, t, 1500, 130, 0.45);
  hit(body.gain, t, 1, 0.004, len);

  const sub = osc(ctx, 'sine', 120, t, 0.9);
  sweep(sub.frequency, t, 120, 38, 0.5);
  const sg = gn(ctx, 0);
  sub.connect(sg); sg.connect(g.in());
  hit(sg.gain, t, 0.85, 0.006, 0.85);

  const n = noise(ctx, t, 0.35, { seed: seedFrom('tl', t), offset: (t * 3.1) % 2.5 });
  const nf = bq(ctx, 'lowpass', 2600, 0.9);
  const ng = gn(ctx, 0);
  n.connect(nf); nf.connect(ng); ng.connect(g.in());
  sweep(nf.frequency, t, 3200, 300, 0.3);
  hit(ng.gain, t, 0.5, 0.002, 0.3);
  return t + len + 0.2;
}

/** Infantry rifle: shorter, drier, more air than the ship guns. */
function blaster(ctx, bus, t, o = {}) {
  const { gain = 0.7, pan = 0, send = 0.16, pitch = 1, len = 0.20 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const body = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1800, 4.0);
  body.connect(bp); bp.connect(g.in());
  const s = osc(ctx, 'sawtooth', 3200 * pitch, t, len + 0.04);
  sweep(s.frequency, t, 3200 * pitch, 280 * pitch, 0.065);
  const s2 = osc(ctx, 'square', 3200 * pitch, t, len + 0.04, 17);
  sweep(s2.frequency, t, 3200 * pitch, 280 * pitch, 0.065);
  const s2g = gn(ctx, 0.35); s2.connect(s2g); s2g.connect(body.in());
  s.connect(body.in());
  sweep(bp.frequency, t, 4200 * pitch, 600 * pitch, 0.08);
  hit(body.gain, t, 0.85, 0.001, len);

  const n = noise(ctx, t, 0.05, { seed: seedFrom('blaster', t), offset: (t * 11.7) % 2.5 });
  const nhp = bq(ctx, 'highpass', 2600, 0.8);
  const ng = gn(ctx, 0);
  n.connect(nhp); nhp.connect(ng); ng.connect(g.in());
  hit(ng.gain, t, 0.5, 0.001, 0.05);
  return t + len + 0.08;
}

/** Bolt off a bulkhead: tick plus a fast falling ring. */
function ricochet(ctx, bus, t, o = {}) {
  const { gain = 0.55, pan = 0, send = 0.34 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const r = rng(seedFrom('ricochet', t, o.seed || 0));
  const f0 = 2200 + r() * 1400;

  const zg = gn(ctx, 0);
  const z = osc(ctx, 'triangle', f0, t, 0.30);
  sweep(z.frequency, t, f0, f0 * 0.22, 0.24);
  const zbp = bq(ctx, 'bandpass', f0, 6);
  sweep(zbp.frequency, t, f0 * 1.2, f0 * 0.3, 0.24);
  z.connect(zbp); zbp.connect(zg); zg.connect(g.in());
  hit(zg.gain, t, 0.9, 0.001, 0.26);

  const n = noise(ctx, t, 0.03, { seed: seedFrom('ric', t), offset: r() * 2.5 });
  const nhp = bq(ctx, 'highpass', 3000, 0.8);
  const ng = gn(ctx, 0);
  n.connect(nhp); nhp.connect(ng); ng.connect(g.in());
  hit(ng.gain, t, 0.7, 0.0008, 0.03);

  const c = comb(ctx, 620 + r() * 320, 0.26);
  const cg = gn(ctx, 1.1);
  ng.connect(c.input); c.output.connect(cg); cg.connect(g.in());
  return t + 0.34;
}

/* ------------------------------------------------------------------ *
 * Destruction
 * ------------------------------------------------------------------ */

function boom(ctx, bus, t, o, big) {
  const {
    gain = big ? 0.42 : 0.42,
    pan = 0,
    send = big ? 0.55 : 0.34,
  } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom(big ? 'bigExplosion' : 'explosion', t, o.seed || 0);
  const r = rng(sd);
  const tail = big ? 3.2 : 1.55;

  // Initial crack.
  const c = noise(ctx, t, 0.09, { seed: sd, offset: r() * 2.4 });
  const chp = bq(ctx, 'highpass', big ? 1200 : 1900, 0.7);
  const cg = gn(ctx, 0);
  c.connect(chp); chp.connect(cg); cg.connect(g.in());
  hit(cg.gain, t, big ? 0.55 : 0.45, 0.0012, 0.08);

  // Body: broadband noise pulled down through a closing lowpass.
  const bDur = big ? 1.9 : 1.0;
  const b = noise(ctx, t, bDur + 0.1, { seed: sd ^ 0x51, offset: r() * 2.4, rate: big ? 0.72 : 1 });
  const blp = bq(ctx, 'lowpass', 6000, 0.9);
  const bg = gn(ctx, 0);
  b.connect(blp); blp.connect(bg); bg.connect(g.in());
  sweep(blp.frequency, t, big ? 7000 : 5200, big ? 110 : 170, big ? 1.5 : 0.85);
  setAt(bg.gain, t, 1e-4);
  lin(bg.gain, t + (big ? 0.02 : 0.008), big ? 1.0 : 0.9);
  exp(bg.gain, t + bDur, 0.02);
  exp(bg.gain, t + tail, 1e-4);

  // Sub drop — the part you feel.
  const s = osc(ctx, 'sine', big ? 84 : 100, t, big ? 1.6 : 1.15);
  sweep(s.frequency, t, big ? 84 : 100, big ? 24 : 33, big ? 1.1 : 0.55);
  const sg = gn(ctx, 0);
  s.connect(sg); sg.connect(g.in());
  hit(sg.gain, t + (big ? 0.02 : 0.004), big ? 1.0 : 0.75, big ? 0.03 : 0.008, big ? 1.5 : 1.05);

  if (big) {
    // A second, later thump so it reads as something structural failing.
    const s2 = osc(ctx, 'sine', 62, t + 0.34, 1.5);
    sweep(s2.frequency, t + 0.34, 62, 21, 1.2);
    const s2g = gn(ctx, 0);
    s2.connect(s2g); s2g.connect(g.in());
    hit(s2g.gain, t + 0.34, 0.7, 0.05, 1.4);
  }

  // Debris crackle.
  const nGrains = big ? 26 : 12;
  const dn = noise(ctx, t, tail, { seed: sd ^ 0x9a, offset: r() * 2.4 });
  const dbp = bq(ctx, 'bandpass', big ? 1500 : 2200, 1.1);
  const dg = gn(ctx, 0);
  dn.connect(dbp); dbp.connect(dg); dg.connect(g.in());
  const list = [];
  for (let i = 0; i < nGrains; i++) {
    const gt = t + (big ? 0.18 : 0.12) + Math.pow(r(), 0.7) * (tail * 0.8);
    const decayScale = 1 - (gt - t) / tail;
    list.push([gt, 0.002, (big ? 0.30 : 0.22) * (0.35 + 0.65 * decayScale) * (0.5 + r()), 0.05 + r() * 0.09]);
  }
  list.sort((a, b2) => a[0] - b2[0]);
  grains(dg.gain, list);

  // Long rumble tail.
  const rn = noise(ctx, t, tail, { seed: sd ^ 0x33, offset: r() * 2.4, rate: 0.5 });
  const rlp = bq(ctx, 'lowpass', big ? 320 : 460, 0.8);
  const rg = gn(ctx, 0);
  rn.connect(rlp); rlp.connect(rg); rg.connect(g.in());
  setAt(rg.gain, t, 1e-4);
  lin(rg.gain, t + 0.09, big ? 0.55 : 0.34);
  exp(rg.gain, t + tail, 1e-4);
  return t + tail + 0.1;
}

function explosion(ctx, bus, t, o = {}) { return boom(ctx, bus, t, o, false); }
function bigExplosion(ctx, bus, t, o = {}) { return boom(ctx, bus, t, o, true); }

/** Something heavy hits the hull: thump plus the plating ringing it off. */
function hullImpact(ctx, bus, t, o = {}) {
  const { gain = 0.52, pan = 0, send = 0.32 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('hullImpact', t, o.seed || 0);
  const r = rng(sd);

  const s = osc(ctx, 'sine', 130, t, 0.6);
  sweep(s.frequency, t, 130, 44, 0.14);
  const sg = gn(ctx, 0);
  s.connect(sg); sg.connect(g.in());
  hit(sg.gain, t, 0.95, 0.003, 0.55);

  const n = noise(ctx, t, 0.62, { seed: sd, offset: r() * 2.4 });
  for (const [f, q, dec, lvl] of [[395, 11, 0.45, 0.42], [845, 15, 0.32, 0.30], [1930, 19, 0.22, 0.20]]) {
    const f2 = f * (0.92 + r() * 0.16);
    const bp = bq(ctx, 'bandpass', f2, q);
    const bg = gn(ctx, 0);
    n.connect(bp); bp.connect(bg); bg.connect(g.in());
    hit(bg.gain, t, lvl, 0.002, dec);
  }
  const hp = bq(ctx, 'highpass', 2400, 0.8);
  const hg = gn(ctx, 0);
  n.connect(hp); hp.connect(hg); hg.connect(g.in());
  hit(hg.gain, t, 0.22, 0.001, 0.42);
  return t + 0.72;
}

/** Breaching charge on a blast door. */
function doorBlast(ctx, bus, t, o = {}) {
  const { gain = 0.6, pan = 0, send = 0.45 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('doorBlast', t);
  const r = rng(sd);

  const n = noise(ctx, t, 1.15, { seed: sd, offset: r() * 2.3 });
  const lp = bq(ctx, 'lowpass', 4200, 1.0);
  const bg = gn(ctx, 0);
  n.connect(lp); lp.connect(bg); bg.connect(g.in());
  sweep(lp.frequency, t, 4600, 210, 0.55);
  hit(bg.gain, t, 1.0, 0.002, 0.7);

  const s = osc(ctx, 'sine', 96, t, 0.9);
  sweep(s.frequency, t, 96, 30, 0.42);
  const sg = gn(ctx, 0);
  s.connect(sg); sg.connect(g.in());
  hit(sg.gain, t, 0.9, 0.004, 0.85);

  // Metal tearing.
  const m = osc(ctx, 'sawtooth', 1500, t + 0.03, 0.34);
  sweep(m.frequency, t + 0.03, 1500, 430, 0.3);
  const mbp = bq(ctx, 'bandpass', 1400, 7);
  sweep(mbp.frequency, t + 0.03, 1700, 500, 0.3);
  const mg = gn(ctx, 0);
  m.connect(mbp); mbp.connect(mg); mg.connect(g.in());
  hit(mg.gain, t + 0.03, 0.35, 0.004, 0.3);

  // Debris skittering away.
  const dn = noise(ctx, t + 0.12, 1.0, { seed: sd ^ 0x7, offset: r() * 2.3 });
  const dbp = bq(ctx, 'bandpass', 2600, 1.4);
  const dg = gn(ctx, 0);
  dn.connect(dbp); dbp.connect(dg); dg.connect(g.in());
  const list = [];
  for (let i = 0; i < 14; i++) {
    const gt = t + 0.14 + Math.pow(r(), 0.6) * 0.85;
    list.push([gt, 0.002, 0.20 * (0.4 + r()), 0.03 + r() * 0.07]);
  }
  list.sort((a, b) => a[0] - b[0]);
  grains(dg.gain, list);
  return t + 1.28;
}

/* ------------------------------------------------------------------ *
 * Engines and ships
 * ------------------------------------------------------------------ */

/** A ship going past without a stereo move — the generic "swoosh". */
function engineWhoosh(ctx, bus, t, o = {}) {
  const { gain = 0.6, pan = 0, send = 0.3, dur = 1.4 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('engineWhoosh', t);
  const r = rng(sd);
  const n = noise(ctx, t, dur + 0.12, { seed: sd, offset: r() * 2.2 });
  const bp = bq(ctx, 'bandpass', 300, 1.5);
  const ng = gn(ctx, 0);
  n.connect(bp); bp.connect(ng); ng.connect(g.in());
  setAt(bp.frequency, t, 260);
  exp(bp.frequency, t + dur * 0.45, 2500);
  exp(bp.frequency, t + dur, 200);
  setAt(ng.gain, t, 1e-4);
  lin(ng.gain, t + dur * 0.42, 1.0);
  exp(ng.gain, t + dur, 1e-4);

  const th = osc(ctx, 'sawtooth', 58, t, dur + 0.1);
  const tlp = bq(ctx, 'lowpass', 260, 1.2);
  const tg = gn(ctx, 0);
  th.connect(tlp); tlp.connect(tg); tg.connect(g.in());
  setAt(th.frequency, t, 48);
  exp(th.frequency, t + dur * 0.45, 78);
  exp(th.frequency, t + dur, 42);
  setAt(tg.gain, t, 1e-4);
  lin(tg.gain, t + dur * 0.4, 0.45);
  exp(tg.gain, t + dur, 1e-4);
  return t + dur + 0.14;
}

/** Doppler fly-by with a real stereo move. */
function enginePass(ctx, bus, t, o = {}) {
  const { gain = 0.30, send = 0.28, dur = 2.2, from = -0.85, to = 0.85, pitch = 1 } = o;
  const g = gn(ctx, gain);
  const p = ctx.createStereoPanner();
  g.connect(p);
  p.connect(bus.sfxIn ? bus.sfxIn() : bus.sfx);
  if (send > 0 && bus.fx) {
    const s = gn(ctx, send);
    p.connect(s); s.connect(bus.fxIn ? bus.fxIn() : bus.fx);
  }
  setAt(p.pan, t, clamp(from, -1, 1));
  p.pan.linearRampToValueAtTime(clamp(to, -1, 1), T(t + dur));

  const sd = seedFrom('enginePass', t);
  const r = rng(sd);
  const mid = t + dur * 0.5;

  const n = noise(ctx, t, dur + 0.1, { seed: sd, offset: r() * 2.2 });
  const lp = bq(ctx, 'lowpass', 700, 1.1);
  const ng = gn(ctx, 0);
  n.connect(lp); lp.connect(ng); ng.connect(g.in());
  setAt(lp.frequency, t, 620);
  exp(lp.frequency, mid, 5200);
  exp(lp.frequency, t + dur, 420);
  setAt(ng.gain, t, 1e-4);
  exp(ng.gain, mid, 0.85);
  exp(ng.gain, t + dur, 1e-4);

  // Doppler on the engine tone: approaching sharp, departing flat.
  for (const [f, lvl, det] of [[92, 0.55, 0], [138, 0.30, 8], [61, 0.45, -6]]) {
    const s = osc(ctx, 'sawtooth', f * pitch, t, dur + 0.1, det);
    setAt(s.frequency, t, f * pitch * 1.14);
    exp(s.frequency, mid, f * pitch * 1.10);
    exp(s.frequency, t + dur * 0.66, f * pitch * 0.86);
    const flp = bq(ctx, 'lowpass', 900, 1.3);
    const sg = gn(ctx, 0);
    s.connect(flp); flp.connect(sg); sg.connect(g.in());
    setAt(sg.gain, t, 1e-4);
    exp(sg.gain, mid, lvl);
    exp(sg.gain, t + dur, 1e-4);
  }
  return t + dur + 0.12;
}

/** Bed: the deck plates humming under an engine room. */
function engineRumble(ctx, bus, t, o = {}) {
  const { gain = 0.28, pan = 0, send = 0.18, dur = 4, fade = 0.5, pitch = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('engineRumble', t);
  const r = rng(sd);
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + fade, 1);
  setAt(amp.gain, t + dur - fade, 1);
  lin(amp.gain, t + dur, 0);

  const n = noise(ctx, t, dur + 0.05, { seed: sd, offset: r() * 2.2, rate: 0.6 });
  const nlp = bq(ctx, 'lowpass', 190, 0.9);
  const ng = gn(ctx, 0.9);
  n.connect(nlp); nlp.connect(ng); ng.connect(amp.in());

  for (const [f, lvl, det] of [[46, 0.55, 0], [69, 0.30, 7], [92, 0.16, -9]]) {
    const s = osc(ctx, 'sawtooth', f * pitch, t, dur + 0.05, det);
    const lp = bq(ctx, 'lowpass', 300, 1.4);
    const sg = gn(ctx, lvl);
    s.connect(lp); lp.connect(sg); sg.connect(amp.in());
  }
  // Slow wobble so it never sounds like a static tone.
  const w = lfo(ctx, t, dur, 0.23, 0.16);
  w.connect(amp.gain);
  return t + dur + 0.05;
}

/** Ion cannon charging / the flagship's field: electric, tritone-ish, wrong. */
function ionDrone(ctx, bus, t, o = {}) {
  const { gain = 0.75, pan = 0, send = 0.35, dur = 3, fade = 0.45 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + fade, 1);
  setAt(amp.gain, t + dur - fade, 1);
  lin(amp.gain, t + dur, 0);

  const bp = bq(ctx, 'bandpass', 380, 5);
  bp.connect(amp.in());
  const sw = lfo(ctx, t, dur, 0.17, 260);
  sw.connect(bp.frequency);

  for (const [f, lvl, type] of [[62, 0.6, 'square'], [93, 0.35, 'square'], [87.5, 0.25, 'sawtooth']]) {
    const s = osc(ctx, type, f, t, dur + 0.05);
    const sg = gn(ctx, lvl);
    s.connect(sg); sg.connect(bp);
  }
  // Ring-modulated whine on top.
  const w = osc(ctx, 'sine', 1240, t, dur + 0.05);
  const wg = gn(ctx, 0.0);
  w.connect(wg); wg.connect(amp.in());
  setAt(wg.gain, t, 0.05);
  const rm = lfo(ctx, t, dur, 37, 0.045);
  rm.connect(wg.gain);
  return t + dur + 0.05;
}

/** Rising whine that snaps into a huge whoosh and a receding star-line. */
function hyperspaceJump(ctx, bus, t, o = {}) {
  const { gain = 0.38, pan = 0, send = 0.5 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('hyperspaceJump', t);
  const r = rng(sd);
  const charge = o.charge ?? 1.75;
  const jump = t + charge;

  // --- the whine ---------------------------------------------------
  const wbp = bq(ctx, 'bandpass', 220, 9);
  const wg = gn(ctx, 0);
  wbp.connect(wg); wg.connect(g.in());
  for (const [mul, lvl, det] of [[1, 0.7, 0], [1.5, 0.3, 6], [2.01, 0.18, -8]]) {
    const s = osc(ctx, 'sawtooth', 190 * mul, t, charge + 0.12, det);
    setAt(s.frequency, t, 190 * mul);
    exp(s.frequency, jump, 3600 * mul);
    const sg = gn(ctx, lvl);
    s.connect(sg); sg.connect(wbp);
  }
  setAt(wbp.frequency, t, 260);
  exp(wbp.frequency, jump, 5200);
  setAt(wg.gain, t, 1e-4);
  exp(wg.gain, t + charge * 0.75, 0.55);
  exp(wg.gain, jump, 0.85);
  exp(wg.gain, jump + 0.09, 1e-4);

  // Noise band riding up with it.
  const cn = noise(ctx, t, charge + 0.1, { seed: sd, offset: r() * 2.2 });
  const cbp = bq(ctx, 'bandpass', 400, 4);
  const cg = gn(ctx, 0);
  cn.connect(cbp); cbp.connect(cg); cg.connect(g.in());
  setAt(cbp.frequency, t, 380);
  exp(cbp.frequency, jump, 6800);
  setAt(cg.gain, t, 1e-4);
  exp(cg.gain, jump, 0.5);
  exp(cg.gain, jump + 0.07, 1e-4);

  // --- the jump ----------------------------------------------------
  const flash = noise(ctx, jump, 0.35, { seed: sd ^ 0x2, offset: r() * 2.2 });
  const fhp = bq(ctx, 'highpass', 3800, 0.8);
  const fg = gn(ctx, 0);
  flash.connect(fhp); fhp.connect(fg); fg.connect(g.in());
  hit(fg.gain, jump, 0.7, 0.001, 0.3);

  const whoosh = noise(ctx, jump, 2.3, { seed: sd ^ 0x3, offset: r() * 2.2, rate: 0.8 });
  const wlp = bq(ctx, 'lowpass', 12000, 0.9);
  const whg = gn(ctx, 0);
  whoosh.connect(wlp); wlp.connect(whg); whg.connect(g.in());
  sweep(wlp.frequency, jump, 13000, 90, 1.8);
  setAt(whg.gain, jump, 1e-4);
  lin(whg.gain, jump + 0.03, 1.0);
  exp(whg.gain, jump + 2.2, 1e-4);

  const sub = osc(ctx, 'sine', 130, jump, 1.9);
  sweep(sub.frequency, jump, 130, 26, 1.4);
  const sg = gn(ctx, 0);
  sub.connect(sg); sg.connect(g.in());
  hit(sg.gain, jump, 0.95, 0.02, 1.8);
  return jump + 2.45;
}

/* ------------------------------------------------------------------ *
 * Lightsabers
 * ------------------------------------------------------------------ */

const SABER_BASE = 104;

/** Stable detuned drone with a slow amplitude wobble. Takes a duration. */
function saberHum(ctx, bus, t, o = {}) {
  const {
    gain = 0.42, pan = 0, send = 0.22, dur = 3, base = SABER_BASE,
    fade = 0.06, level = 1,
  } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  const lp = bq(ctx, 'lowpass', 1500, 3.2);
  const pk = bq(ctx, 'peaking', 2100, 2.5, 6);
  amp.connect(lp); lp.connect(pk); pk.connect(g.in());

  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + fade, level * 0.62);
  setAt(amp.gain, t + Math.max(fade + 0.01, dur - fade), level * 0.62);
  lin(amp.gain, t + dur, 0);

  const det = lfo(ctx, t, dur, 0.37, 9);            // slow pitch drift
  for (const [mul, lvl, d] of [[0.5, 0.30, -4], [1, 0.75, 0], [1.5, 0.42, 6], [2.01, 0.22, -9]]) {
    const s = osc(ctx, 'sawtooth', base * mul, t, dur + 0.03, d);
    det.connect(s.detune);
    const sg = gn(ctx, lvl);
    s.connect(sg); sg.connect(amp.in());
  }
  // Two wobbles: the slow breathing one and the faster blade shimmer.
  const slow = lfo(ctx, t, dur, 0.85, level * 0.085);
  slow.connect(amp.gain);
  const fast = lfo(ctx, t, dur, 5.3, level * 0.030);
  fast.connect(amp.gain);
  return t + dur + 0.05;
}

function saberOn(ctx, bus, t, o = {}) {
  const { gain = 0.6, pan = 0, send = 0.28, base = SABER_BASE, hum = 0.55 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('saberOn', t);
  const r = rng(sd);

  const n = noise(ctx, t, 0.10, { seed: sd, offset: r() * 2.2 });
  const nhp = bq(ctx, 'highpass', 1800, 0.7);
  const ng = gn(ctx, 0);
  n.connect(nhp); nhp.connect(ng); ng.connect(g.in());
  hit(ng.gain, t, 0.55, 0.0015, 0.09);

  const bp = bq(ctx, 'bandpass', 300, 4);
  const wg = gn(ctx, 0);
  bp.connect(wg); wg.connect(g.in());
  for (const [mul, lvl] of [[1, 0.7], [2, 0.3], [3, 0.15]]) {
    const s = osc(ctx, 'sawtooth', 180 * mul, t, 0.32);
    setAt(s.frequency, t, 180 * mul);
    exp(s.frequency, t + 0.26, base * 2.6 * mul);
    const sg = gn(ctx, lvl); s.connect(sg); sg.connect(bp);
  }
  sweep(bp.frequency, t, 260, 900, 0.26);
  setAt(wg.gain, t, 1e-4);
  lin(wg.gain, t + 0.05, 0.75);
  exp(wg.gain, t + 0.32, 1e-4);

  saberHum(ctx, bus, t + 0.14, { gain, pan, send, base, dur: hum, fade: 0.12 });
  return t + 0.14 + hum + 0.05;
}

function saberOff(ctx, bus, t, o = {}) {
  const { gain = 0.55, pan = 0, send = 0.28, base = SABER_BASE } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('saberOff', t);
  const r = rng(sd);
  const dur = 0.5;

  const lp = bq(ctx, 'lowpass', 1600, 3);
  const amp = gn(ctx, 0);
  amp.connect(lp); lp.connect(g.in());
  for (const [mul, lvl] of [[1, 0.75], [1.5, 0.4], [2.01, 0.2], [0.5, 0.3]]) {
    const s = osc(ctx, 'sawtooth', base * mul, t, dur + 0.05);
    setAt(s.frequency, t, base * mul);
    exp(s.frequency, t + dur, base * mul * 0.32);
    const sg = gn(ctx, lvl); s.connect(sg); sg.connect(amp.in());
  }
  sweep(lp.frequency, t, 1700, 220, dur);
  setAt(amp.gain, t, 0.62);
  exp(amp.gain, t + dur, 1e-4);

  const n = noise(ctx, t, dur, { seed: sd, offset: r() * 2.2 });
  const nbp = bq(ctx, 'bandpass', 2200, 2);
  const ng = gn(ctx, 0);
  n.connect(nbp); nbp.connect(ng); ng.connect(g.in());
  sweep(nbp.frequency, t, 2600, 500, dur);
  setAt(ng.gain, t, 0.30);
  exp(ng.gain, t + dur * 0.8, 1e-4);
  return t + dur + 0.1;
}

function saberClash(ctx, bus, t, o = {}) {
  const { gain = 0.8, pan = 0, send = 0.42, base = SABER_BASE } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('saberClash', t, o.seed || 0);
  const r = rng(sd);

  const n = noise(ctx, t, 0.55, { seed: sd, offset: r() * 2.2 });
  for (const [f, q, dec, lvl] of [[1720, 17, 0.42, 0.40], [2480, 22, 0.34, 0.32],
                                  [3410, 26, 0.26, 0.24], [4900, 30, 0.18, 0.16]]) {
    const bp = bq(ctx, 'bandpass', f * (0.94 + r() * 0.12), q);
    const bg = gn(ctx, 0);
    n.connect(bp); bp.connect(bg); bg.connect(g.in());
    hit(bg.gain, t, lvl, 0.0015, dec);
  }
  // The energy discharge itself.
  const z = osc(ctx, 'sawtooth', 3000, t, 0.16);
  sweep(z.frequency, t, 3000, 620, 0.10);
  const zbp = bq(ctx, 'bandpass', 2400, 5);
  sweep(zbp.frequency, t, 3200, 700, 0.10);
  const zg = gn(ctx, 0);
  z.connect(zbp); zbp.connect(zg); zg.connect(g.in());
  hit(zg.gain, t, 0.55, 0.001, 0.14);

  // Low shove, and the blades flaring afterwards.
  const s = osc(ctx, 'sine', 150, t, 0.35);
  sweep(s.frequency, t, 150, 62, 0.16);
  const sg = gn(ctx, 0);
  s.connect(sg); sg.connect(g.in());
  hit(sg.gain, t, 0.45, 0.003, 0.3);
  saberHum(ctx, bus, t + 0.02, { gain: gain * 0.7, pan, send, base, dur: 0.5, fade: 0.05, level: 1.25 });
  return t + 0.6;
}

/* ------------------------------------------------------------------ *
 * Voices that are not voices
 * ------------------------------------------------------------------ */

/**
 * Two-part respirator. A bright rising inhale through a resonant band, a beat
 * of silence, then a darker falling exhale with chest resonance under it.
 */
function vaderBreath(ctx, bus, t, o = {}) {
  const {
    gain = 0.85, pan = 0, send = 0.4,
    inhale = 1.35, gap = 0.28, exhale = 1.75, rate = 1,
  } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('vaderBreath', t);
  const r = rng(sd);
  const inDur = inhale / rate;
  const exDur = exhale / rate;
  const t2 = t + inDur + gap / rate;

  // --- inhale: rising, tighter, mask whistle on top -----------------
  const n1 = noise(ctx, t, inDur + 0.05, { seed: sd, offset: r() * 2.0 });
  const hp1 = bq(ctx, 'highpass', 170, 0.7);
  const air1 = bq(ctx, 'lowpass', 3600, 0.7);
  n1.connect(hp1); hp1.connect(air1);

  const bp1 = bq(ctx, 'bandpass', 360, 6.5);
  const pk1 = bq(ctx, 'peaking', 1350, 1.6, 7);
  const g1 = gn(ctx, 0);
  air1.connect(bp1); bp1.connect(pk1); pk1.connect(g1); g1.connect(g.in());
  setAt(bp1.frequency, t, 340);
  exp(bp1.frequency, t + inDur * 0.62, 780);
  exp(bp1.frequency, t + inDur, 520);
  setAt(g1.gain, t, 1e-4);
  lin(g1.gain, t + inDur * 0.44, 1.0);
  setAt(g1.gain, t + inDur * 0.62, 0.92);
  exp(g1.gain, t + inDur, 1e-4);

  const wh1 = bq(ctx, 'bandpass', 1150, 9);
  const wg1 = gn(ctx, 0);
  air1.connect(wh1); wh1.connect(wg1); wg1.connect(g.in());
  setAt(wh1.frequency, t, 980);
  exp(wh1.frequency, t + inDur, 1450);
  setAt(wg1.gain, t, 1e-4);
  lin(wg1.gain, t + inDur * 0.5, 0.34);
  exp(wg1.gain, t + inDur, 1e-4);

  // --- exhale: lower, slower, with a chest under it -----------------
  const n2 = noise(ctx, t2, exDur + 0.05, { seed: sd ^ 0x77, offset: r() * 2.0, rate: 0.85 });
  const hp2 = bq(ctx, 'highpass', 95, 0.7);
  const air2 = bq(ctx, 'lowpass', 2300, 0.7);
  n2.connect(hp2); hp2.connect(air2);

  const bp2 = bq(ctx, 'bandpass', 600, 5.0);
  const pk2 = bq(ctx, 'peaking', 720, 1.1, 7);
  const g2 = gn(ctx, 0);
  air2.connect(bp2); bp2.connect(pk2); pk2.connect(g2); g2.connect(g.in());
  setAt(bp2.frequency, t2, 640);
  exp(bp2.frequency, t2 + exDur * 0.55, 330);
  exp(bp2.frequency, t2 + exDur, 235);
  setAt(g2.gain, t2, 1e-4);
  lin(g2.gain, t2 + exDur * 0.20, 1.05);
  setAt(g2.gain, t2 + exDur * 0.46, 0.85);
  exp(g2.gain, t2 + exDur, 1e-4);

  const wh2 = bq(ctx, 'bandpass', 1750, 8);
  const wg2 = gn(ctx, 0);
  air2.connect(wh2); wh2.connect(wg2); wg2.connect(g.in());
  setAt(wg2.gain, t2, 1e-4);
  lin(wg2.gain, t2 + exDur * 0.22, 0.18);
  exp(wg2.gain, t2 + exDur * 0.9, 1e-4);

  const chest = osc(ctx, 'sine', 78, t2, exDur + 0.05);
  const cg = gn(ctx, 0);
  chest.connect(cg); cg.connect(g.in());
  setAt(cg.gain, t2, 1e-4);
  lin(cg.gain, t2 + exDur * 0.25, 0.15);
  exp(cg.gain, t2 + exDur, 1e-4);
  return t2 + exDur + 0.08;
}

/** Astromech: a run of clean tones with portamento between them. */
function droidBeep(ctx, bus, t, o = {}) {
  const { gain = 0.5, pan = 0, send = 0.24, n = 6, happy = true, speed = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('droidBeep', t, o.seed || 0);
  const r = rng(sd);
  const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  const rootMidi = happy ? 79 : 74;

  const amp = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1400, 1.1);
  amp.connect(bp); bp.connect(g.in());
  const dur = 0.11 / speed;
  const total = n * dur * 1.18;
  const car = osc(ctx, 'triangle', 800, t, total + 0.08);
  const sq = osc(ctx, 'square', 800, t, total + 0.08, 5);
  const sqg = gn(ctx, 0.22);
  car.connect(amp.in()); sq.connect(sqg); sqg.connect(amp.in());

  let last = rootMidi;
  const list = [];
  for (let i = 0; i < n; i++) {
    const gt = t + i * dur * 1.18;
    const step = scale[Math.floor(r() * scale.length)];
    const m = rootMidi + step + (r() < 0.25 ? 12 : 0);
    const f = NOTE.freq(m);
    setAt(car.frequency, gt, NOTE.freq(last));
    exp(car.frequency, gt + dur * 0.22, f);
    setAt(sq.frequency, gt, NOTE.freq(last));
    exp(sq.frequency, gt + dur * 0.22, f);
    last = m;
    list.push([gt, 0.006, 0.85, dur * 0.85]);
  }
  grains(amp.gain, list);
  return t + total + 0.1;
}

/** The same droid, but something has gone wrong. */
function droidWorry(ctx, bus, t, o = {}) {
  const { gain = 0.5, pan = 0, send = 0.3, dur = 1.0 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1100, 1.4);
  amp.connect(bp); bp.connect(g.in());

  const s = osc(ctx, 'triangle', 900, t, dur + 0.06);
  const s2 = osc(ctx, 'sine', 900, t, dur + 0.06, 12);
  const s2g = gn(ctx, 0.4);
  s.connect(amp.in()); s2.connect(s2g); s2g.connect(amp.in());
  setAt(s.frequency, t, 980);
  exp(s.frequency, t + dur, 300);
  setAt(s2.frequency, t, 980);
  exp(s2.frequency, t + dur, 300);
  sweep(bp.frequency, t, 1300, 460, dur);

  const vib = lfo(ctx, t, dur, 6.6, 45);
  vib.connect(s.frequency);
  vib.connect(s2.frequency);

  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + 0.03, 0.9);
  setAt(amp.gain, t + dur * 0.6, 0.7);
  exp(amp.gain, t + dur, 1e-4);
  const trem = lfo(ctx, t, dur, 9, 0.14);
  trem.connect(amp.gain);
  return t + dur + 0.07;
}

/** Protocol droid: a formant pair moving in a fussy speech rhythm. */
function protocolFuss(ctx, bus, t, o = {}) {
  const { gain = 1.35, pan = 0, send = 0.22, syllables = 6, speed = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('protocolFuss', t, o.seed || 0);
  const r = rng(sd);

  const src = gn(ctx, 0);
  const f1 = bq(ctx, 'bandpass', 620, 4.5);
  const f2 = bq(ctx, 'bandpass', 1720, 6);
  const f1g = gn(ctx, 1.0);
  const f2g = gn(ctx, 0.65);
  src.connect(f1); f1.connect(f1g); f1g.connect(g.in());
  src.connect(f2); f2.connect(f2g); f2g.connect(g.in());

  const total = syllables * 0.24 / speed;
  const saw = osc(ctx, 'sawtooth', 150, t, total + 0.1);
  const sq = osc(ctx, 'square', 150, t, total + 0.1, -7);
  const sqg = gn(ctx, 0.3);
  saw.connect(src); sq.connect(sqg); sqg.connect(src);

  const list = [];
  for (let i = 0; i < syllables; i++) {
    const gt = t + (i * 0.24) / speed;
    const len = (0.10 + r() * 0.07) / speed;
    const f0 = 132 + r() * 58 + (i === syllables - 1 ? 40 : 0);   // rises at the end: a question
    setAt(saw.frequency, gt, f0);
    exp(saw.frequency, gt + len, f0 * (0.9 + r() * 0.3));
    setAt(sq.frequency, gt, f0);
    exp(sq.frequency, gt + len, f0 * (0.9 + r() * 0.3));
    setAt(f1.frequency, gt, 420 + r() * 460);
    setAt(f2.frequency, gt, 1350 + r() * 950);
    list.push([gt, 0.012, 0.85, len]);
  }
  grains(src.gain, list);
  return t + total + 0.12;
}

/** Jawas: high, fast, entirely unintelligible. */
function jawaChatter(ctx, bus, t, o = {}) {
  const { gain = 0.4, pan = 0, send = 0.3, n = 11, speed = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('jawaChatter', t, o.seed || 0);
  const r = rng(sd);

  const src = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1500, 3.5);
  const pk = bq(ctx, 'peaking', 2800, 2, 7);
  src.connect(bp); bp.connect(pk); pk.connect(g.in());

  const step = 0.115 / speed;
  const total = n * step;
  const s = osc(ctx, 'square', 900, t, total + 0.1);
  const s2 = osc(ctx, 'sawtooth', 900, t, total + 0.1, 11);
  const s2g = gn(ctx, 0.4);
  s.connect(src); s2.connect(s2g); s2g.connect(src);
  const vib = lfo(ctx, t, total, 14, 90);
  vib.connect(s.frequency); vib.connect(s2.frequency);

  const list = [];
  for (let i = 0; i < n; i++) {
    const gt = t + i * step;
    const len = (0.045 + r() * 0.055) / speed;
    const f0 = 620 + r() * 900;
    setAt(s.frequency, gt, f0);
    exp(s.frequency, gt + len, f0 * (0.7 + r() * 0.7));
    setAt(s2.frequency, gt, f0);
    exp(s2.frequency, gt + len, f0 * (0.7 + r() * 0.7));
    setAt(bp.frequency, gt, 1100 + r() * 1400);
    list.push([gt, 0.006, 0.55 + r() * 0.45, len]);
  }
  grains(src.gain, list);
  return t + total + 0.1;
}

/* ------------------------------------------------------------------ *
 * Environments
 * ------------------------------------------------------------------ */

/** A building the size of a building, walking. */
function sandcrawlerRumble(ctx, bus, t, o = {}) {
  const { gain = 0.20, pan = 0, send = 0.3, dur = 6, fade = 0.9, tread = 0.78 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('sandcrawlerRumble', t);
  const r = rng(sd);
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + fade, 1);
  setAt(amp.gain, t + Math.max(fade + 0.05, dur - fade), 1);
  lin(amp.gain, t + dur, 0);

  const n = noise(ctx, t, dur + 0.05, { seed: sd, offset: r() * 2.1, rate: 0.45 });
  const lp = bq(ctx, 'lowpass', 250, 0.9);
  const ng = gn(ctx, 0.85);
  n.connect(lp); lp.connect(ng); ng.connect(amp.in());

  for (const [f, lvl] of [[31, 0.7], [46.5, 0.35], [23.2, 0.4]]) {
    const s = osc(ctx, 'sawtooth', f, t, dur + 0.05);
    const flp = bq(ctx, 'lowpass', 130, 1.3);
    const sg = gn(ctx, lvl);
    s.connect(flp); flp.connect(sg); sg.connect(amp.in());
  }
  const w = lfo(ctx, t, dur, 0.31, 0.2);
  w.connect(amp.gain);

  // Tread plates coming round.
  const nClank = Math.max(0, Math.floor((dur - 0.4) / tread));
  const cn = noise(ctx, t, dur + 0.05, { seed: sd ^ 0x11, offset: r() * 2.1 });
  for (const [f, q, lvl] of [[1350, 9, 0.20], [2650, 14, 0.11]]) {
    const bp = bq(ctx, 'bandpass', f, q);
    const cg = gn(ctx, 0);
    cn.connect(bp); bp.connect(cg); cg.connect(amp.in());
    const list = [];
    for (let i = 0; i < nClank; i++) {
      const gt = t + 0.3 + i * tread + (r() - 0.5) * 0.05;
      list.push([gt, 0.002, lvl * (0.7 + r() * 0.6), 0.09 + r() * 0.08]);
    }
    grains(cg.gain, list);
  }
  return t + dur + 0.05;
}

/** Open desert: a moving band of noise with a low bed under it. */
function wind(ctx, bus, t, o = {}) {
  const { gain = 0.22, pan = 0, send = 0.25, dur = 6, fade = 1.2, gust = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('wind', t);
  const r = rng(sd);
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + fade, 0.75);

  const n = noise(ctx, t, dur + 0.05, { seed: sd, offset: r() * 2.0 });
  const bp = bq(ctx, 'bandpass', 700, 1.5);
  const ng = gn(ctx, 1);
  n.connect(bp); bp.connect(ng); ng.connect(amp.in());
  const s1 = lfo(ctx, t, dur, 0.13, 380);
  const s2 = lfo(ctx, t, dur, 0.291, 220);
  s1.connect(bp.frequency); s2.connect(bp.frequency);

  const lo = noise(ctx, t, dur + 0.05, { seed: sd ^ 0x5, offset: r() * 2.0, rate: 0.7 });
  const llp = bq(ctx, 'lowpass', 380, 0.9);
  const lg = gn(ctx, 0.55);
  lo.connect(llp); llp.connect(lg); lg.connect(amp.in());

  // Gusts, as automation on the shared amp rather than extra nodes.
  const nG = Math.max(1, Math.round((dur / 2.6) * gust));
  let prev = t + fade;
  for (let i = 0; i < nG; i++) {
    const gt = t + fade + (i + r() * 0.6) * ((dur - fade) / (nG + 0.4));
    if (gt <= prev + 0.15 || gt > t + dur - 0.4) continue;
    const peak = 0.9 + r() * 0.7;
    lin(amp.gain, gt, peak);
    lin(amp.gain, gt + 0.5 + r() * 0.8, 0.55 + r() * 0.2);
    prev = gt + 1.3;
  }
  setAt(amp.gain, Math.max(prev, t + dur - fade), 0.7);
  lin(amp.gain, t + dur, 0);
  return t + dur + 0.05;
}

/** Shipboard klaxon. Two tones, repeating for the whole duration. */
function alarm(ctx, bus, t, o = {}) {
  const { gain = 0.4, pan = 0, send = 0.32, dur = 4, hi = 620, lo = 462, period = 0.46 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  const lp = bq(ctx, 'lowpass', 2400, 2.5);
  amp.connect(lp); lp.connect(g.in());
  const s = osc(ctx, 'square', hi, t, dur + 0.06);
  const s2 = osc(ctx, 'sawtooth', hi, t, dur + 0.06, 8);
  const s2g = gn(ctx, 0.3);
  s.connect(amp.in()); s2.connect(s2g); s2g.connect(amp.in());

  const n = Math.max(1, Math.floor(dur / period));
  const list = [];
  for (let i = 0; i < n; i++) {
    const gt = t + i * period;
    const f = i % 2 === 0 ? hi : lo;
    setAt(s.frequency, gt, f);
    setAt(s2.frequency, gt, f);
    exp(s.frequency, gt + period * 0.7, f * 0.985);
    exp(s2.frequency, gt + period * 0.7, f * 0.985);
    list.push([gt, 0.015, 0.8, period * 0.72]);
  }
  grains(amp.gain, list);
  return t + n * period + 0.1;
}

/* ------------------------------------------------------------------ *
 * Hardware
 * ------------------------------------------------------------------ */

/** Explosive bolts, hiss, then something small getting very far away fast. */
function podLaunch(ctx, bus, t, o = {}) {
  const { gain = 0.62, pan = 0, send = 0.4 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('podLaunch', t);
  const r = rng(sd);

  // Bolts.
  const bn = noise(ctx, t, 0.3, { seed: sd, offset: r() * 2.1 });
  const bbp = bq(ctx, 'bandpass', 1500, 4);
  const bg = gn(ctx, 0);
  bn.connect(bbp); bbp.connect(bg); bg.connect(g.in());
  grains(bg.gain, [[t, 0.001, 0.85, 0.08], [t + 0.055, 0.001, 0.7, 0.07], [t + 0.10, 0.001, 0.6, 0.09]]);
  const thump = osc(ctx, 'sine', 110, t, 0.5);
  sweep(thump.frequency, t, 110, 38, 0.2);
  const tg = gn(ctx, 0);
  thump.connect(tg); tg.connect(g.in());
  hit(tg.gain, t, 0.8, 0.003, 0.45);

  // Pressure hiss.
  const hn = noise(ctx, t + 0.04, 0.55, { seed: sd ^ 0x4, offset: r() * 2.1 });
  const hhp = bq(ctx, 'highpass', 1600, 0.8);
  const hg = gn(ctx, 0);
  hn.connect(hhp); hhp.connect(hg); hg.connect(g.in());
  setAt(hg.gain, t + 0.04, 1e-4);
  lin(hg.gain, t + 0.09, 0.45);
  exp(hg.gain, t + 0.55, 1e-4);

  // Launch whoosh.
  const wn = noise(ctx, t + 0.10, 1.3, { seed: sd ^ 0x8, offset: r() * 2.1 });
  const wbp = bq(ctx, 'bandpass', 240, 1.4);
  const wg = gn(ctx, 0);
  wn.connect(wbp); wbp.connect(wg); wg.connect(g.in());
  sweep(wbp.frequency, t + 0.10, 220, 2100, 0.8);
  setAt(wg.gain, t + 0.10, 1e-4);
  lin(wg.gain, t + 0.55, 0.9);
  exp(wg.gain, t + 1.35, 1e-4);

  // Receding drive.
  for (const [f, lvl] of [[150, 0.4], [225, 0.2]]) {
    const s = osc(ctx, 'sawtooth', f, t + 0.15, 2.2);
    setAt(s.frequency, t + 0.15, f);
    exp(s.frequency, t + 2.3, f * 0.4);
    const lp = bq(ctx, 'lowpass', 1400, 1.2);
    sweep(lp.frequency, t + 0.15, 1600, 220, 2.0);
    const sg = gn(ctx, 0);
    s.connect(lp); lp.connect(sg); sg.connect(g.in());
    setAt(sg.gain, t + 0.15, 1e-4);
    lin(sg.gain, t + 0.5, lvl);
    exp(sg.gain, t + 2.35, 1e-4);
  }
  return t + 2.5;
}

/** Comm channel opening: two clean digital tones. */
function commBeep(ctx, bus, t, o = {}) {
  const { gain = 0.42, pan = 0, send = 0.12, f1 = 1180, f2 = 1570, len = 0.075 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1400, 1.6);
  amp.connect(bp); bp.connect(g.in());
  const s = osc(ctx, 'square', f1, t, len * 2 + 0.09);
  const sn = osc(ctx, 'sine', f1, t, len * 2 + 0.09);
  const sg = gn(ctx, 0.35);
  s.connect(sg); sg.connect(amp.in()); sn.connect(amp.in());
  setAt(s.frequency, t, f1); setAt(sn.frequency, t, f1);
  setAt(s.frequency, t + len + 0.02, f2); setAt(sn.frequency, t + len + 0.02, f2);
  grains(amp.gain, [[t, 0.004, 0.8, len], [t + len + 0.02, 0.004, 0.8, len]]);
  return t + len * 2 + 0.1;
}

/** Squadron radio between lines. */
function radioStatic(ctx, bus, t, o = {}) {
  const { gain = 0.62, pan = 0, send = 0.08, dur = 0.8, crackle = 1 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('radioStatic', t);
  const r = rng(sd);
  const hpf = bq(ctx, 'highpass', 420, 0.8);
  const lpf = bq(ctx, 'lowpass', 3000, 0.8);
  hpf.connect(lpf); lpf.connect(g.in());

  const bed = noise(ctx, t, dur + 0.03, { seed: sd, offset: r() * 2.0 });
  const bg = gn(ctx, 0);
  bed.connect(bg); bg.connect(hpf);
  setAt(bg.gain, t, 1e-4);
  lin(bg.gain, t + 0.02, 0.34);
  setAt(bg.gain, t + dur - 0.03, 0.34);
  lin(bg.gain, t + dur, 0);

  const cn = noise(ctx, t, dur + 0.03, { seed: sd ^ 0x6, offset: r() * 2.0 });
  const cbp = bq(ctx, 'bandpass', 1800, 2.2);
  const cg = gn(ctx, 0);
  cn.connect(cbp); cbp.connect(cg); cg.connect(hpf);
  const list = [];
  const n = Math.max(1, Math.round(dur * 14 * crackle));
  for (let i = 0; i < n; i++) {
    const gt = t + r() * Math.max(0.02, dur - 0.03);
    list.push([gt, 0.001, 0.35 + r() * 0.5, 0.006 + r() * 0.02]);
  }
  list.sort((a, b) => a[0] - b[0]);
  grains(cg.gain, list);
  return t + dur + 0.05;
}

/** Accelerating acquisition beeps resolving into a solid lock tone. */
function targetingLock(ctx, bus, t, o = {}) {
  const { gain = 0.38, pan = 0, send = 0.12, dur = 1.9, n = 9, lock = 0.5 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  const bp = bq(ctx, 'bandpass', 1900, 2.2);
  amp.connect(bp); bp.connect(g.in());
  const s = osc(ctx, 'square', 1500, t, dur + lock + 0.12);
  const sn = osc(ctx, 'sine', 1500, t, dur + lock + 0.12);
  const sg = gn(ctx, 0.3);
  s.connect(sg); sg.connect(amp.in()); sn.connect(amp.in());

  const list = [];
  // Geometric acceleration: the gaps shrink toward the lock.
  let acc = 0;
  const weights = [];
  for (let i = 0; i < n; i++) { const w = Math.pow(0.80, i); weights.push(w); acc += w; }
  let cur = t;
  for (let i = 0; i < n; i++) {
    const f = 1450 + i * 42;
    setAt(s.frequency, cur, f);
    setAt(sn.frequency, cur, f);
    list.push([cur, 0.003, 0.65, 0.035]);
    cur += (weights[i] / acc) * dur;
  }
  const lt = t + dur;
  setAt(s.frequency, lt, 2100);
  setAt(sn.frequency, lt, 2100);
  grains(amp.gain, list);
  setAt(amp.gain, lt, 1e-4);
  lin(amp.gain, lt + 0.01, 0.9);
  setAt(amp.gain, lt + lock * 0.7, 0.9);
  exp(amp.gain, lt + lock, 1e-4);
  return lt + lock + 0.08;
}

/** Pure low-frequency pressure. Use under impacts and reveals. */
function rumbleSub(ctx, bus, t, o = {}) {
  const { gain = 0.46, pan = 0, send = 0.05, dur = 2, f0 = 48, f1 = 27 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  for (const [mul, lvl] of [[1, 0.8], [1.5, 0.22], [2, 0.1]]) {
    const s = osc(ctx, 'sine', f0 * mul, t, dur + 0.05);
    setAt(s.frequency, t, f0 * mul);
    exp(s.frequency, t + dur, f1 * mul);
    const sg = gn(ctx, lvl);
    s.connect(sg); sg.connect(amp.in());
  }
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + Math.min(0.25, dur * 0.25), 1);
  setAt(amp.gain, t + dur * 0.5, 0.8);
  exp(amp.gain, t + dur, 1e-4);
  return t + dur + 0.06;
}

/** Hangar full of people who did not expect to survive the afternoon. */
function crowdCheer(ctx, bus, t, o = {}) {
  const { gain = 0.85, pan = 0, send = 0.5, dur = 3.6 } = o;
  const g = out(ctx, bus, { gain, pan, send });
  const sd = seedFrom('crowdCheer', t);
  const r = rng(sd);
  const amp = gn(ctx, 0);
  amp.connect(g.in());
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + dur * 0.16, 1.0);
  setAt(amp.gain, t + dur * 0.5, 0.9);
  exp(amp.gain, t + dur, 1e-4);

  const n = noise(ctx, t, dur + 0.05, { seed: sd, offset: r() * 2.0 });
  for (const [f, q, lvl] of [[480, 1.2, 0.6], [1150, 1.6, 0.45], [2500, 2.0, 0.25]]) {
    const bp = bq(ctx, 'bandpass', f, q);
    const bg = gn(ctx, lvl);
    n.connect(bp); bp.connect(bg); bg.connect(amp.in());
    const sw = lfo(ctx, t, dur, 0.4 + r() * 0.5, f * 0.18);
    sw.connect(bp.frequency);
  }
  const roar = noise(ctx, t, dur + 0.05, { seed: sd ^ 0x9, offset: r() * 2.0, rate: 0.8 });
  const rlp = bq(ctx, 'lowpass', 420, 0.9);
  const rg = gn(ctx, 0.4);
  roar.connect(rlp); rlp.connect(rg); rg.connect(amp.in());

  // A handful of individual voices poking out of the wash.
  for (let i = 0; i < 7; i++) {
    const gt = t + r() * dur * 0.75;
    const len = 0.28 + r() * 0.5;
    const f0 = 210 + r() * 400;
    const s = osc(ctx, 'sawtooth', f0, gt, len + 0.05);
    setAt(s.frequency, gt, f0);
    exp(s.frequency, gt + len, f0 * (0.72 + r() * 0.5));
    const bp = bq(ctx, 'bandpass', 800 + r() * 900, 4);
    const sg = gn(ctx, 0);
    s.connect(bp); bp.connect(sg); sg.connect(amp.in());
    const vb = lfo(ctx, gt, len, 5 + r() * 3, 22);
    vb.connect(s.frequency);
    setAt(sg.gain, gt, 1e-4);
    lin(sg.gain, gt + 0.05, 0.16 + r() * 0.12);
    exp(sg.gain, gt + len, 1e-4);
  }
  return t + dur + 0.08;
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const SFX = {
  laser, turbolaser, blaster, ricochet, explosion, bigExplosion,
  hullImpact, doorBlast, engineWhoosh, enginePass, engineRumble, ionDrone,
  hyperspaceJump, saberOn, saberOff, saberHum, saberClash, vaderBreath,
  droidBeep, droidWorry, protocolFuss, jawaChatter, sandcrawlerRumble,
  wind, alarm, podLaunch, commBeep, radioStatic, targetingLock, rumbleSub, crowdCheer,
};

export const SFX_NAMES = Object.keys(SFX);

/**
 * Schedule a whole cue sheet in one pass.
 *
 *   scheduleCues(ctx, bus, [
 *     { t: 44.5, sfx: 'engineRumble', opts: { dur: 26, gain: 0.4 } },
 *     { t: 54.0, sfx: 'turbolaser',   opts: { pan: -0.4 } },
 *   ]);
 *
 * Returns the absolute time the last cue finishes.
 */
export function scheduleCues(ctx, bus, cues = []) {
  let end = 0;
  const list = [...cues].sort((a, b) => (a.t || 0) - (b.t || 0));
  for (const c of list) {
    const name = c.sfx || c.name || c.id;
    const fn = SFX[name];
    if (typeof fn !== 'function') {
      console.warn(`scheduleCues: unknown sfx "${name}"`);
      continue;
    }
    const e = fn(ctx, bus, Math.max(0, c.t || 0), c.opts || {});
    if (Number.isFinite(e)) end = Math.max(end, e);
  }
  return end;
}
