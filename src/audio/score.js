/**
 * The score.
 *
 *   scheduleScore(ctx, bus, [{id: 'fanfare', start: 0, dur: 41}, …], opts)
 *
 * Seven through-composed sections keyed to the seven scenes in `story.js`.
 * Everything is synthesised — brass is stacked detuned sawtooths with a slow
 * attack and a filter that opens, strings are a wider stack swelling through a
 * lowpass, timpani are a pitched sine thump plus a noise transient, snares and
 * cymbals are shaped noise, harp and celeste are two-operator FM sines.
 *
 * ── Two motifs, both original ────────────────────────────────────────
 *
 * HEROIC ("a new spark") — written in scale degrees so it can be stated in any
 * mode. Degrees 5 · 10 · 9 · 8 · 9 · 10 · 12 · 11 · 10 · 9: a pickup on the
 * fifth, a leap of a major sixth, a fall back to the tonic, then a climb to
 * the twelfth and a stepwise settle. Heard in `fanfare`, `battle` and
 * `finale`, and in miniature in `droids` and `desert`.
 *
 * MENACING ("the wedge") — a low march figure in D minor with a Phrygian
 * second and a tritone in the middle: D · D · Eb · D · Ab · G · Eb · D.
 * Heard in `imperial` and `chase`, and as a three-note shadow in `droids`.
 *
 * Both are developed rather than repeated: augmented, fragmented, re-modalised
 * and re-orchestrated per section.
 *
 * Every note is scheduled against absolute times. Nothing reads
 * `ctx.currentTime`, nothing uses timers, nothing uses `Math.random()`.
 */

import { NOTE, rng, clamp, setAt, lin, exp, hit, adsr, fanIn } from './engine.js';

const S_MAJ = NOTE.SCALE.major;
const S_MIN = NOTE.SCALE.minor;
const S_HIJAZ = NOTE.SCALE.hijaz;
const Q = NOTE.Q;

/* ------------------------------------------------------------------ *
 * Motifs
 * ------------------------------------------------------------------ */

/** [scaleDegree, onsetBeat, durBeats, velocityScale] */
const HEROIC = [
  [5, 0.0, 0.5, 0.80],
  [10, 0.5, 1.5, 1.00],
  [9, 2.0, 0.5, 0.86],
  [8, 2.5, 1.0, 0.90],
  [9, 3.5, 1.0, 0.88],
  [10, 4.5, 1.0, 0.94],
  [12, 5.5, 2.0, 1.00],
  [11, 7.5, 1.0, 0.90],
  [10, 8.5, 1.0, 0.88],
  [9, 9.5, 2.0, 0.86],
];
const HEROIC_BEATS = 11.5;

/** [semitonesAboveTonic, onsetBeat, durBeats, velocityScale] */
const MENACE = [
  [0, 0.0, 1.5, 1.00],
  [0, 1.5, 0.5, 0.80],
  [1, 2.0, 1.0, 0.92],
  [0, 3.0, 1.0, 0.88],
  [6, 4.0, 1.0, 0.95],
  [5, 5.0, 1.0, 0.90],
  [1, 6.0, 1.0, 0.94],
  [0, 7.0, 1.0, 1.00],
];
const MENACE_BEATS = 8;

/**
 * Render the heroic motif into absolute midi/time note events.
 * `scale` re-modalises it, `stretch` augments or diminishes it, `from`/`take`
 * fragment it, `resolve` lands the last note on the tonic instead of the ninth.
 */
function heroic(tonic, { scale = S_MAJ, stretch = 1, from = 0, take = 99, resolve = false, oct = 0 } = {}) {
  const slice = HEROIC.slice(from, from + take);
  const t0 = slice.length ? slice[0][1] : 0;
  return slice.map(([deg, b, d, v], i) => {
    const last = i === slice.length - 1;
    const dd = resolve && last ? 8 : deg;
    return {
      midi: tonic + NOTE.degree(dd, scale) + oct * 12,
      beat: (b - t0) * stretch,
      len: d * stretch * (resolve && last ? 1.6 : 1),
      vel: v,
    };
  });
}

function menace(tonic, { stretch = 1, from = 0, take = 99, oct = 0 } = {}) {
  const slice = MENACE.slice(from, from + take);
  const t0 = slice.length ? slice[0][1] : 0;
  return slice.map(([semi, b, d, v]) => ({
    midi: tonic + semi + oct * 12,
    beat: (b - t0) * stretch,
    len: d * stretch,
    vel: v,
  }));
}

/* ------------------------------------------------------------------ *
 * Voicing
 * ------------------------------------------------------------------ */

/** Where a note should hang itself on its group — see `S.group`. */
const into = (g) => (g && g.slot ? g.slot() : g);

/** Chord tones inside a register, chosen close to the previous voicing. */
function voice(rootMidi, quality, { n = 4, low = 50, high = 79, prev = null } = {}) {
  const pcs = quality.map((i) => (rootMidi + i) % 12);
  const pool = [];
  for (let m = low; m <= high; m++) if (pcs.includes(((m % 12) + 12) % 12)) pool.push(m);
  if (!pool.length) return [rootMidi];
  if (!prev || !prev.length) {
    const out = [];
    const step = Math.max(1, Math.floor(pool.length / n));
    for (let i = 0; i < n; i++) out.push(pool[Math.min(pool.length - 1, i * step)]);
    return [...new Set(out)];
  }
  const used = new Set();
  const out = [];
  for (let i = 0; i < n; i++) {
    const target = prev[Math.min(i, prev.length - 1)];
    let best = pool[0];
    let bestD = 1e9;
    for (const m of pool) {
      if (used.has(m)) continue;
      const d = Math.abs(m - target);
      if (d < bestD) { bestD = d; best = m; }
    }
    used.add(best);
    out.push(best);
  }
  return out.sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ *
 * Instruments
 *
 * Every one of these takes the section object `S`, a group gain node, an
 * absolute start time, and returns the time it stops sounding.
 * ------------------------------------------------------------------ */

/** Stacked detuned saws, slow attack, filter that opens on the way in. */
function brass(S, g, t, midi, dur, o = {}) {
  const { vel = 0.8, attack = 0.075, bright = 2.6, detune = 7, rip = 34, release = 0.16 } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.Q.value = 1.1;
  amp.connect(lpf); lpf.connect(g);

  const stop = S.stop(t + dur + release + 0.06);
  for (const [type, det, lvl] of [['sawtooth', -detune, 0.45], ['sawtooth', 2, 0.5], ['sawtooth', detune, 0.4]]) {
    const s = ctx.createOscillator();
    s.type = type;
    s.frequency.value = f;
    s.detune.value = det - rip;
    s.detune.linearRampToValueAtTime(det, t + attack * 0.9);   // the little "rip" into pitch
    S.vib.connect(s.detune);
    const sg = ctx.createGain();
    sg.gain.value = lvl;
    s.connect(sg); sg.connect(amp);
    s.start(t); s.stop(stop);
  }
  // Brass keeps its harmonics down in the tuba register: the cutoff tracks
  // pitch but never collapses onto the fundamental the way `bright * f` does.
  const fc = clamp(bright * (f + 320), 320, 12000);
  setAt(lpf.frequency, t, clamp(fc * 0.42, 220, 9000));
  exp(lpf.frequency, t + attack * 1.5, fc);
  exp(lpf.frequency, t + dur + release, clamp(fc * 0.5, 220, 9000));
  adsr(amp.gain, t, vel, { a: attack, d: 0.10, s: 0.86, r: release, dur });
  return t + dur + release;
}

/** Wider, softer, slower: the string section. */
function strings(S, g, t, midi, dur, o = {}) {
  const { vel = 0.5, attack = 0.42, bright = 3.4, detune = 11, release = 0.5, voices = 3 } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.Q.value = 0.8;
  amp.connect(lpf); lpf.connect(g);

  const stop = S.stop(t + dur + release + 0.08);
  const dets = voices >= 3 ? [-detune, 0, detune * 0.75] : [-detune, detune];
  for (const det of dets) {
    const s = ctx.createOscillator();
    s.type = 'sawtooth';
    s.frequency.value = f;
    s.detune.value = det;
    S.vib.connect(s.detune);
    const sg = ctx.createGain();
    sg.gain.value = 1 / dets.length;
    s.connect(sg); sg.connect(amp);
    s.start(t); s.stop(stop);
  }
  const fc = clamp(bright * (f + 180), 280, 12000);
  setAt(lpf.frequency, t, clamp(fc * 0.4, 200, 9000));
  exp(lpf.frequency, t + Math.min(dur, attack * 2.4), fc);
  exp(lpf.frequency, t + dur + release, clamp(fc * 0.45, 200, 9000));
  adsr(amp.gain, t, vel, { a: attack, d: 0.35, s: 0.82, r: release, dur });
  return t + dur + release;
}

/** Sustained strings chopped by a shared LFO — a tremolo bed for pennies. */
function tremolo(S, g, t, midis, dur, o = {}) {
  const { vel = 0.28, bright = 3.0, detune = 9, release = 0.25 } = o;
  const ctx = S.ctx;
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = clamp(bright * (NOTE.freq(midis[0]) + 180), 400, 10000);
  lpf.Q.value = 0.8;
  amp.connect(lpf); lpf.connect(g);
  const stop = S.stop(t + dur + release + 0.06);
  const ampIn = fanIn(ctx, amp);            // a chord's worth of voices meets here
  for (const m of midis) {
    for (const det of [-detune, detune]) {
      const s = ctx.createOscillator();
      s.type = 'sawtooth';
      s.frequency.value = NOTE.freq(m);
      s.detune.value = det;
      const sg = ctx.createGain();
      sg.gain.value = 0.5 / midis.length;
      s.connect(sg); sg.connect(ampIn());
      s.start(t); s.stop(stop);
    }
  }
  setAt(amp.gain, t, 0);
  lin(amp.gain, t + 0.12, vel);
  setAt(amp.gain, t + dur, vel);
  lin(amp.gain, t + dur + release, 0);
  S.trem.connect(amp.gain);
  return t + dur + release;
}

/** Pitched sine thump plus a short noise transient. */
function timpani(S, g, t, midi, o = {}) {
  const { vel = 0.85, decay = 1.5, rich = true } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  // Thump, partial and transient meet here rather than on the group, so a
  // drum presents its group one connection like every other instrument.
  const mix = ctx.createGain();
  mix.connect(g);
  const body = ctx.createGain();
  body.gain.value = 0;
  body.connect(mix);
  const s = ctx.createOscillator();
  s.type = 'sine';
  s.frequency.setValueAtTime(f * 1.07, t);
  s.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  s.connect(body);
  s.start(t); s.stop(S.stop(t + decay + 0.04));
  hit(body.gain, t, vel, 0.004, decay);

  if (rich) {
    const p = ctx.createOscillator();
    p.type = 'sine';
    p.frequency.value = f * 2.41;
    const pg = ctx.createGain();
    pg.gain.value = 0;
    p.connect(pg); pg.connect(mix);
    p.start(t); p.stop(S.stop(t + decay * 0.4 + 0.04));
    hit(pg.gain, t, vel * 0.18, 0.003, decay * 0.38);
  }
  const n = S.noise(t, 0.09);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.9;
  const ng = ctx.createGain();
  ng.gain.value = 0;
  n.connect(bp); bp.connect(ng); ng.connect(mix);
  hit(ng.gain, t, vel * 0.42, 0.001, 0.075);
  return t + decay;
}

/** Bass drum: lower, duller, no pitched partial. */
function bassDrum(S, g, t, o = {}) {
  const { vel = 0.9, decay = 0.75 } = o;
  const ctx = S.ctx;
  const mix = ctx.createGain();
  mix.connect(g);
  const s = ctx.createOscillator();
  s.type = 'sine';
  s.frequency.setValueAtTime(88, t);
  s.frequency.exponentialRampToValueAtTime(36, t + 0.11);
  const gg = ctx.createGain();
  gg.gain.value = 0;
  s.connect(gg); gg.connect(mix);
  s.start(t); s.stop(S.stop(t + decay + 0.04));
  hit(gg.gain, t, vel, 0.004, decay);
  const n = S.noise(t, 0.05);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.7;
  const ng = ctx.createGain();
  ng.gain.value = 0;
  n.connect(lp); lp.connect(ng); ng.connect(mix);
  hit(ng.gain, t, vel * 0.3, 0.001, 0.045);
  return t + decay;
}

function snare(S, g, t, o = {}) {
  const { vel = 0.5, decay = 0.16, tone = 1900 } = o;
  const ctx = S.ctx;
  const n = S.noise(t, decay + 0.03);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 850; hp.Q.value = 0.7;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = tone; bp.Q.value = 1.0;
  const gg = ctx.createGain();
  gg.gain.value = 0;
  n.connect(hp); hp.connect(bp); bp.connect(gg); gg.connect(g);
  hit(gg.gain, t, vel, 0.0015, decay);
  return t + decay;
}

/**
 * A whole snare roll on four nodes: one noise source, one filter pair and a
 * gain whose envelope is written grain by grain. Cheap enough to use freely.
 */
function snareRoll(S, g, t, dur, o = {}) {
  const { rate = 13, from = 0.06, to = 0.75, tone = 1900, accent = 4, grain = 0.055 } = o;
  const ctx = S.ctx;
  const n = S.noise(t, dur + 0.08);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 800; hp.Q.value = 0.7;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = tone; bp.Q.value = 0.9;
  const gg = ctx.createGain();
  gg.gain.value = 0;
  n.connect(hp); hp.connect(bp); bp.connect(gg); gg.connect(g);
  setAt(bp.frequency, t, tone * 0.85);
  lin(bp.frequency, t + dur, tone * 1.25);

  const count = Math.max(1, Math.round(dur * rate));
  setAt(gg.gain, t, 1e-4);
  for (let i = 0; i < count; i++) {
    const gt = t + (i / rate);
    if (gt > t + dur) break;
    const k = i / Math.max(1, count - 1);
    const amp = (from + (to - from) * k * k) * (accent && i % accent === 0 ? 1.35 : 1);
    setAt(gg.gain, gt, 1e-4);
    lin(gg.gain, gt + 0.0018, amp);
    exp(gg.gain, Math.min(gt + grain, t + dur + 0.02), 1e-4);
  }
  setAt(gg.gain, t + dur + 0.03, 0);
  return t + dur + 0.05;
}

/** Filtered noise that swells (or crashes) and dies. */
function cymbal(S, g, t, o = {}) {
  const { vel = 0.4, dur = 2.0, crash = false, tone = 5200 } = o;
  const ctx = S.ctx;
  const n = S.noise(t, dur + 0.05);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = crash ? 2200 : 3000; hp.Q.value = 0.6;
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking'; pk.frequency.value = tone; pk.Q.value = 1.1; pk.gain.value = 7;
  const gg = ctx.createGain();
  gg.gain.value = 0;
  n.connect(hp); hp.connect(pk); pk.connect(gg); gg.connect(g);
  if (crash) {
    hit(gg.gain, t, vel, 0.003, dur);
  } else {
    setAt(gg.gain, t, 1e-4);
    exp(gg.gain, t + dur * 0.78, vel);
    exp(gg.gain, t + dur, 1e-4);
    setAt(hp.frequency, t, 4200);
    exp(hp.frequency, t + dur * 0.78, 2100);
  }
  return t + dur;
}

/** Two-operator FM sine — harp, celeste and the starfield twinkles. */
function fm(S, g, t, midi, dur, o = {}) {
  const { vel = 0.35, ratio = 3.01, index = 2.6, decay = 1, attack = 0.004 } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  const car = ctx.createOscillator();
  car.type = 'sine';
  car.frequency.value = f;
  const mod = ctx.createOscillator();
  mod.type = 'sine';
  mod.frequency.value = f * ratio;
  const mg = ctx.createGain();
  mod.connect(mg); mg.connect(car.frequency);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  car.connect(amp); amp.connect(g);
  const life = dur * decay;
  const stop = S.stop(t + life + 0.05);
  car.start(t); car.stop(stop);
  mod.start(t); mod.stop(stop);
  setAt(mg.gain, t, f * index);
  exp(mg.gain, t + Math.max(0.05, life * 0.35), f * index * 0.04);
  hit(amp.gain, t, vel, attack, life);
  return t + life;
}

/** Short, dry, wooden: the droid music. */
function pluck(S, g, t, midi, dur, o = {}) {
  const { vel = 0.4, bright = 5, decay = 0.9 } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const bp = ctx.createBiquadFilter();
  bp.type = 'lowpass';
  const fc = clamp(bright * (f + 120), 320, 10000);
  bp.frequency.value = fc;
  bp.Q.value = 2.2;
  amp.connect(bp); bp.connect(g);
  const life = Math.min(dur, 0.9) * decay;
  const stop = S.stop(t + life + 0.05);
  for (const [type, det, lvl] of [['triangle', 0, 0.8], ['sawtooth', 6, 0.35]]) {
    const s = ctx.createOscillator();
    s.type = type;
    s.frequency.value = f;
    s.detune.value = det;
    const sg = ctx.createGain();
    sg.gain.value = lvl;
    s.connect(sg); sg.connect(amp);
    s.start(t); s.stop(stop);
  }
  exp(bp.frequency, t + life, clamp(fc * 0.35, 250, 6000));
  hit(amp.gain, t, vel, 0.004, life);
  return t + life;
}

/** Solo line with its own delayed vibrato and optional portamento. */
function lead(S, g, t, midi, dur, o = {}) {
  const { vel = 0.4, attack = 0.14, release = 0.3, bright = 3.2, vibRate = 5.1, vibDepth = 22, vibDelay = 0.35, from = null } = o;
  const ctx = S.ctx;
  const f = NOTE.freq(midi);
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.Q.value = 2.0;
  amp.connect(lpf); lpf.connect(g);
  const stop = S.stop(t + dur + release + 0.06);

  const vo = ctx.createOscillator();
  vo.type = 'sine';
  vo.frequency.value = vibRate;
  const vg = ctx.createGain();
  vg.gain.value = 0;
  vo.connect(vg);
  vo.start(t); vo.stop(stop);
  setAt(vg.gain, t, 0);
  lin(vg.gain, t + Math.min(dur, vibDelay + 0.25), vibDepth);

  for (const [type, det, lvl] of [['sawtooth', -4, 0.5], ['triangle', 5, 0.55]]) {
    const s = ctx.createOscillator();
    s.type = type;
    s.frequency.value = f;
    s.detune.value = det;
    vg.connect(s.detune);
    if (from != null) {
      setAt(s.frequency, t, NOTE.freq(from));
      exp(s.frequency, t + Math.min(0.16, dur * 0.4), f);
    }
    const sg = ctx.createGain();
    sg.gain.value = lvl;
    s.connect(sg); sg.connect(amp);
    s.start(t); s.stop(stop);
  }
  const fc = clamp(bright * (f + 150), 320, 11000);
  setAt(lpf.frequency, t, clamp(fc * 0.45, 220, 8000));
  exp(lpf.frequency, t + Math.min(dur * 0.5, 0.7), fc);
  exp(lpf.frequency, t + dur + release, clamp(fc * 0.42, 220, 8000));
  adsr(amp.gain, t, vel, { a: attack, d: 0.2, s: 0.88, r: release, dur });
  return t + dur + release;
}

/** Sub pedal — felt more than heard, keeps the low end anchored. */
function pedal(S, g, t, midi, dur, o = {}) {
  const { vel = 0.3, fade = 0.6 } = o;
  const ctx = S.ctx;
  const amp = ctx.createGain();
  amp.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.9;
  amp.connect(lp); lp.connect(g);
  const stop = S.stop(t + dur + fade + 0.06);
  for (const [mul, lvl, type] of [[1, 0.75, 'sine'], [2, 0.28, 'sine'], [1, 0.16, 'sawtooth']]) {
    const s = ctx.createOscillator();
    s.type = type;
    s.frequency.value = NOTE.freq(midi) * mul;
    s.detune.value = mul === 1 && type === 'sawtooth' ? 6 : 0;
    const sg = ctx.createGain();
    sg.gain.value = lvl;
    s.connect(sg); sg.connect(amp);
    s.start(t); s.stop(stop);
  }
  const f2 = Math.min(fade, dur * 0.45);
  setAt(amp.gain, t, 1e-4);
  lin(amp.gain, t + f2, vel);
  setAt(amp.gain, t + dur, vel);
  lin(amp.gain, t + dur + fade, 0);
  return t + dur + fade;
}

/* ------------------------------------------------------------------ *
 * Section scaffolding
 * ------------------------------------------------------------------ */

/**
 * Per-section defaults. `level` is the mix balance between sections, measured
 * rather than guessed: each one is trimmed so the loud tuttis land near
 * -30 dBFS RMS on the music bus with about 25 dB of crest left for the hits,
 * and the quiet scenes sit a deliberate 3–5 dB below that.
 */
const DEFAULTS = {
  fanfare: { tempo: 100, fadeIn: 0.02, tailFade: 0.70, level: 0.385 },
  chase: { tempo: 150, fadeIn: 0.02, tailFade: 0.35, level: 0.400 },
  imperial: { tempo: 84, fadeIn: 0.45, tailFade: 0.55, level: 0.320 },
  droids: { tempo: 132, fadeIn: 0.05, tailFade: 0.40, level: 1.150 },
  desert: { tempo: 60, fadeIn: 1.30, tailFade: 0.90, level: 0.400 },
  battle: { tempo: 152, fadeIn: 0.05, tailFade: 0.28, level: 0.371 },
  finale: { tempo: 96, fadeIn: 0.01, tailFade: 0.90, level: 0.337 },
};

export const SECTION_IDS = Object.keys(DEFAULTS);

function makeSection(ctx, bus, spec, o) {
  const d = DEFAULTS[spec.id] || DEFAULTS.fanfare;
  const t0 = spec.start;
  const dur = spec.dur;
  const end = t0 + dur;
  const tempo = spec.tempo || d.tempo;
  const spb = 60 / tempo;
  const tailFade = spec.tailFade ?? d.tailFade;
  const level = (spec.level ?? d.level) * (o.gain ?? 1);

  const dry = ctx.createGain();
  const send = ctx.createGain();
  dry.connect(bus.musicIn ? bus.musicIn() : bus.music);
  if (bus.musicFx) send.connect(bus.musicFxIn ? bus.musicFxIn() : bus.musicFx);
  const dryIn = fanIn(ctx, dry);
  const sendIn = fanIn(ctx, send);
  for (const p of [dry.gain, send.gain]) {
    const fi = Math.max(0.005, spec.fadeIn ?? d.fadeIn);
    setAt(p, Math.max(0, t0 - 0.002), 0);
    lin(p, t0 + fi, level);
    setAt(p, Math.max(t0 + fi + 0.005, end), level);
    lin(p, end + tailFade, 0);
  }

  const seed = (o.seed ?? 20250802) ^ (spec.id.charCodeAt(0) * 7919 + spec.id.length * 104729);
  const r = rng(seed >>> 0 || 1);
  const hardStop = end + tailFade + 0.05;
  const groups = new Map();
  let notes = 0;

  // One vibrato LFO and one tremolo LFO per section, shared by every voice.
  const vibOsc = ctx.createOscillator();
  vibOsc.type = 'sine';
  vibOsc.frequency.value = 5.3;
  const vib = ctx.createGain();
  vib.gain.value = 5.5;
  vibOsc.connect(vib);
  vibOsc.start(t0); vibOsc.stop(hardStop);

  const tremOsc = ctx.createOscillator();
  tremOsc.type = 'sine';
  tremOsc.frequency.value = tempo / 60 * 4;
  const trem = ctx.createGain();
  trem.gain.value = 0.45;
  tremOsc.connect(trem);
  tremOsc.start(t0); tremOsc.stop(hardStop);

  const S = {
    ctx, bus, id: spec.id, t0, dur, end, tempo, spb, r, vib, trem, seed,
    /** beat -> absolute time */
    b: (beat) => t0 + beat * spb,
    /** bar (0-indexed, 4/4) -> absolute time */
    bar: (n, beat = 0) => t0 + (n * 4 + beat) * spb,
    /** Never let a node outlive the section's tail. */
    stop: (t) => Math.min(t, hardStop),
    /** A slice of shared noise, started and stopped exactly. */
    noise(t, len) {
      const buf = bus.__noise || (bus.__noise = noiseFor(ctx));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = 1;
      const st = Math.max(0, t);
      src.start(st, (st * 3.7) % (buf.duration - 0.01));
      src.stop(S.stop(st + Math.max(0.01, len)));
      return src;
    },
    group(name, opts = {}) {
      if (groups.has(name)) return groups.get(name);
      const g = ctx.createGain();
      g.gain.value = opts.gain ?? 1;
      g.connect(dryIn());
      const sendAmt = opts.send ?? 0.22;
      if (sendAmt > 0 && bus.musicFx) {
        const w = ctx.createGain();
        w.gain.value = sendAmt;
        g.connect(w); w.connect(sendIn());
      }
      // A busy group collects one connection per note — the battle ostinato
      // alone brings 340 — so notes are handed a summing slot rather than the
      // group node itself. `slot` is read by the dispatchers below.
      g.slot = fanIn(ctx, g);
      groups.set(name, g);
      return g;
    },
    /** Play a note only if it starts inside the section, clipped to the tail. */
    play(fn, g, t, midi, len, opts) {
      if (t < t0 - 1e-6 || t >= end - 0.01) return t;
      const clipped = Math.max(0.02, Math.min(len, end + tailFade - t - 0.02));
      notes++;
      return fn(S, into(g), t, midi, clipped, opts);
    },
    /** Same, for the percussion signatures that take no pitch. */
    perc(fn, g, t, opts) {
      if (t < t0 - 1e-6 || t >= end - 0.01) return t;
      notes++;
      return fn(S, into(g), t, opts);
    },
    /** Rolls carry a duration, so they get their own dispatcher. */
    roll(g, t, dur, opts) {
      if (t < t0 - 1e-6 || t >= end - 0.01) return t;
      notes++;
      return snareRoll(S, into(g), t, Math.min(dur, end + tailFade - t - 0.02), opts);
    },
    hitAt(fn, g, t, midi, opts) {
      if (t < t0 - 1e-6 || t >= end - 0.01) return t;
      notes++;
      return fn(S, into(g), t, midi, opts);
    },
    /** Lay a motif (list of {midi, beat, len, vel}) starting at `startBeat`. */
    motif(fn, g, startBeat, list, opts = {}) {
      const { vel = 0.8, ...rest } = opts;
      let last = t0;
      for (const n of list) {
        const t = S.b(startBeat + n.beat);
        last = Math.max(last, S.play(fn, g, t, n.midi, n.len * spb * 0.94, { vel: vel * n.vel, ...rest }));
      }
      return last;
    },
    noteCount: () => notes,
  };
  return S;
}

let NOISE_CACHE = new WeakMap();
function noiseFor(ctx) {
  let b = NOISE_CACHE.get(ctx);
  if (b) return b;
  const len = Math.round(2.5 * ctx.sampleRate);
  b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  const r = rng(777);
  let sum = 0;
  for (let i = 0; i < len; i++) { const v = r() * 2 - 1; d[i] = v; sum += v; }
  const mean = sum / len;
  for (let i = 0; i < len; i++) d[i] -= mean;
  NOISE_CACHE.set(ctx, b);
  return b;
}

/* ------------------------------------------------------------------ *
 * I. FANFARE — B♭ major. Bold statement, then a starfield under the crawl.
 * ------------------------------------------------------------------ */

const BB3 = NOTE.midi('Bb3');   // 58

function sFanfare(S) {
  const g = {
    brass: S.group('brass', { send: 0.28, gain: 0.60 }),
    horn: S.group('horn', { send: 0.36, gain: 0.52 }),
    low: S.group('low', { send: 0.20, gain: 0.62 }),
    str: S.group('str', { send: 0.42, gain: 0.60 }),
    hi: S.group('hi', { send: 0.55, gain: 0.42 }),
    perc: S.group('perc', { send: 0.26, gain: 0.72 }),
    harp: S.group('harp', { send: 0.62, gain: 0.44 }),
    sub: S.group('sub', { send: 0.05, gain: 0.40 }),
  };
  const t0 = S.t0;
  const T = (s) => t0 + s;

  // --- 0.0–4.8 : a starfield, and something coming ------------------
  for (const [m, v] of [[BB3 + 12, 0.13], [BB3 + 19, 0.11], [BB3 + 26, 0.07]]) {
    S.play(strings, g.hi, T(0.1), m, 4.6, { vel: v, attack: 1.6, release: 1.2, bright: 4.5 });
  }
  const twinkle = [0.55, 1.35, 2.05, 2.75, 3.45, 4.05];
  const pent = [0, 2, 4, 7, 9];
  for (const tt of twinkle) {
    const m = BB3 + 24 + pent[Math.floor(S.r() * pent.length)] + (S.r() < 0.4 ? 12 : 0);
    S.play(fm, g.harp, T(tt), m, 1.5, { vel: 0.20, ratio: 4.02, index: 3.4, decay: 1 });
  }
  S.roll(g.perc, T(3.15), 1.6, { rate: 15, from: 0.03, to: 0.5, tone: 1500, accent: 0 });
  S.hitAt(timpani, g.perc, T(3.2), BB3 - 12, { vel: 0.28, decay: 1.7 });
  S.perc(cymbal, g.perc, T(3.05), { vel: 0.34, dur: 1.75 });

  // --- 4.8 : the hit -----------------------------------------------
  const H = 4.8;
  const chordBb = [BB3 - 12, BB3 - 5, BB3, BB3 + 4, BB3 + 7, BB3 + 12];
  for (const m of chordBb) {
    S.play(brass, m < BB3 ? g.low : g.brass, T(H), m, 2.0 * S.spb, { vel: 0.62, attack: 0.03, bright: 3.2, rip: 55 });
    S.play(strings, g.str, T(H), m + 12, 2.2 * S.spb, { vel: 0.24, attack: 0.05, release: 0.4 });
  }
  S.hitAt(timpani, g.perc, T(H), BB3 - 12, { vel: 1.0, decay: 1.6 });
  S.hitAt(timpani, g.perc, T(H), BB3 - 5, { vel: 0.5, decay: 1.1 });
  S.perc(cymbal, g.perc, T(H), { vel: 0.5, dur: 2.6, crash: true });
  for (const m of [BB3 - 12, BB3, BB3 + 7]) {
    S.play(brass, g.brass, T(H + 2.5 * S.spb), m, 0.55 * S.spb, { vel: 0.55, attack: 0.02, bright: 3.4, rip: 60 });
  }
  S.hitAt(timpani, g.perc, T(H + 2.5 * S.spb), BB3 - 12, { vel: 0.55, decay: 0.8 });
  S.play(pedal, g.sub, T(H), BB3 - 24, 3.4, { vel: 0.30, fade: 0.5 });

  // --- 6.9 : heroic motif, full brass -------------------------------
  const hb = (H + 3.5 * S.spb - 0) / S.spb;      // in beats from section start
  S.motif(brass, g.brass, hb, heroic(BB3 + 12), { vel: 0.62, attack: 0.055, bright: 3.0 });
  S.motif(brass, g.horn, hb, heroic(BB3, { oct: 0 }), { vel: 0.34, attack: 0.09, bright: 2.2 });

  // Harmony under the motif: | Bb | Bb→Eb | Gm→F7 | Bb |
  const prog = [
    [H + 2.4 * 1, BB3, Q.maj, 2.4], [H + 2.4 * 2, BB3, Q.maj, 1.2],
    [H + 2.4 * 2 + 1.2, BB3 + 5, Q.maj, 1.2],
    [H + 2.4 * 3, BB3 - 3, Q.min, 1.2], [H + 2.4 * 3 + 1.2, BB3 + 7, Q.dom7, 1.2],
    [H + 2.4 * 4, BB3, Q.maj, 2.4],
  ];
  let prev = null;
  for (const [ts, root, q, len] of prog) {
    const v = voice(root, q, { n: 4, low: 45, high: 69, prev });
    prev = v;
    for (const m of v) S.play(strings, g.str, T(ts), m, len - 0.05, { vel: 0.26, attack: 0.16, release: 0.5 });
    S.play(brass, g.low, T(ts), root - 12, len - 0.1, { vel: 0.34, attack: 0.06, bright: 2.0 });
  }
  for (let i = 0; i < 4; i++) {
    S.hitAt(timpani, g.perc, T(H + 2.4 * (i + 1)), i % 2 ? BB3 - 5 : BB3 - 12, { vel: 0.55, decay: 1.1 });
    S.hitAt(timpani, g.perc, T(H + 2.4 * (i + 1) + 1.2), BB3 - 12, { vel: 0.30, decay: 0.7 });
    S.roll(g.perc, T(H + 2.4 * (i + 1) + 1.5), 0.85, { rate: 16, from: 0.08, to: 0.26, accent: 4 });
  }

  // --- 14.4 : the tag, resolving ------------------------------------
  const tag = H + 2.4 * 4;
  const tagNotes = [
    [0.0, 12, 1.5], [1.5, 16, 0.5], [2.0, 19, 2.0],
    [4.0, 17, 1.0], [5.0, 16, 1.0], [6.0, 14, 1.0], [7.0, 12, 1.4],
  ];
  for (const [b, semi, len] of tagNotes) {
    S.play(brass, g.brass, T(tag + b * S.spb), BB3 + semi, len * S.spb * 0.95, { vel: 0.60, attack: 0.05, bright: 2.9 });
  }
  S.hitAt(timpani, g.perc, T(tag), BB3 - 12, { vel: 0.9, decay: 1.5 });
  S.perc(cymbal, g.perc, T(tag), { vel: 0.4, dur: 2.4, crash: true });
  for (const [ts, root, q, len] of [[tag, BB3, Q.maj, 2.4], [tag + 2.4, BB3 + 5, Q.maj, 1.2],
                                     [tag + 3.6, BB3 + 7, Q.dom7, 1.2]]) {
    const v = voice(root, q, { n: 4, low: 45, high: 69, prev });
    prev = v;
    for (const m of v) S.play(strings, g.str, T(ts), m, len - 0.05, { vel: 0.26, attack: 0.18, release: 0.5 });
    S.play(brass, g.low, T(ts), root - 12, len - 0.1, { vel: 0.32, attack: 0.06, bright: 2.0 });
  }

  // --- 19.2 → end : the crawl bed -----------------------------------
  const bedStart = 19.2;
  const bed = [
    [BB3, Q.maj9], [BB3 - 3, Q.min7], [BB3 + 5, Q.maj7], [BB3 + 7, Q.sus4],
    [BB3 + 4, Q.min7], [BB3 - 3, Q.min7], [BB3 + 5, Q.maj7], [BB3 + 7, Q.dom7],
    [BB3, Q.maj9], [BB3, Q.maj9],
  ];
  const barLen = 2.4;
  for (let i = 0; i < bed.length; i++) {
    const ts = bedStart + i * barLen;
    if (t0 + ts >= S.end) break;
    const [root, q] = bed[i];
    const v = voice(root, q, { n: 4, low: 52, high: 77, prev });
    prev = v;
    const fade = i >= bed.length - 2 ? 1.35 : 1;
    for (const m of v) {
      S.play(strings, g.str, T(ts), m, barLen * fade, { vel: 0.185, attack: 0.85, release: 1.1, bright: 2.6, voices: 3 });
    }
    S.play(pedal, g.sub, T(ts), root - 24, barLen, { vel: 0.16, fade: 0.7 });
    S.play(brass, g.horn, T(ts), root - 12, barLen * 0.9, { vel: 0.13, attack: 0.5, bright: 1.7, release: 0.6, rip: 8 });
  }

  // Stars.
  for (let i = 0; i < 20; i++) {
    const ts = bedStart + 0.6 + i * 1.05 + S.r() * 0.55;
    const m = BB3 + 24 + pent[Math.floor(S.r() * pent.length)] + (S.r() < 0.45 ? 12 : 0);
    S.play(fm, g.harp, T(ts), m, 1.6 + S.r(), { vel: 0.10 + S.r() * 0.08, ratio: 4.02, index: 3.0, decay: 1 });
  }
  // A distant solo horn remembers the theme.
  S.motif(brass, g.horn, (bedStart + 10.9) / S.spb, heroic(BB3, { stretch: 1.7, take: 6 }),
    { vel: 0.20, attack: 0.24, bright: 1.9, release: 0.7, rip: 12 });
  S.perc(cymbal, g.perc, T(bedStart + 16.4), { vel: 0.10, dur: 3.2 });
}

/* ------------------------------------------------------------------ *
 * II. CHASE — D minor, 150. Driving, anxious, then falling apart.
 * ------------------------------------------------------------------ */

const D3 = NOTE.midi('D3');   // 50

function sChase(S) {
  const g = {
    ost: S.group('ost', { send: 0.14, gain: 0.52 }),
    low: S.group('low', { send: 0.18, gain: 0.58 }),
    brass: S.group('brass', { send: 0.26, gain: 0.56 }),
    trem: S.group('trem', { send: 0.34, gain: 0.50 }),
    perc: S.group('perc', { send: 0.22, gain: 0.68 }),
    sub: S.group('sub', { send: 0.05, gain: 0.34 }),
  };
  const nBars = Math.ceil(S.dur / (4 * S.spb));

  // | Dm Dm | Dm Dm | Bb C | Dm A7 | Dm Dm | Bb A7 | Eb Dm | Gm A7 | Dm …
  const CHORDS = [
    [0, Q.min], [0, Q.min], [0, Q.min], [0, Q.min],
    [-4, Q.maj], [-2, Q.maj], [0, Q.min], [7, Q.dom7],
    [0, Q.min], [0, Q.min], [-4, Q.maj], [7, Q.dom7],
    [1, Q.maj7], [0, Q.min], [5, Q.min], [7, Q.dom7],
    [0, Q.min], [0, Q.min], [0, Q.min], [0, Q.min],
  ];
  const chordAt = (bar) => CHORDS[Math.min(bar, CHORDS.length - 1)];

  // --- the ostinato: eighths, root with a Phrygian neighbour --------
  const PATTERN = [0, 0, 1, 0, 0, 0, -2, 0];
  for (let bar = 0; bar < nBars; bar++) {
    const [rootOff] = chordAt(bar);
    const collapse = bar >= 14;                      // engines dying
    const density = collapse ? (bar >= 16 ? 2 : 4) : 8;
    for (let e = 0; e < 8; e += 8 / density) {
      const t = S.bar(bar, e * 0.5);
      const semi = PATTERN[e % 8];
      const vel = 0.34 * (bar < 2 ? 0.55 : bar < 4 ? 0.78 : 1) * (e % 2 === 0 ? 1 : 0.72) * (collapse ? 0.7 : 1);
      S.play(pluck, g.ost, t, D3 - 12 + rootOff + semi, S.spb * 0.44, { vel, bright: 4.2, decay: 0.85 });
      S.play(pluck, g.ost, t, D3 + rootOff + semi, S.spb * 0.44, { vel: vel * 0.6, bright: 4.4, decay: 0.7 });
    }
    S.play(pedal, g.sub, S.bar(bar), D3 - 24 + rootOff, 4 * S.spb, { vel: collapse ? 0.30 : 0.22, fade: 0.35 });
  }

  // --- percussion ---------------------------------------------------
  for (let bar = 0; bar < nBars; bar++) {
    if (bar >= 16) break;
    const heavy = bar >= 8;
    S.hitAt(timpani, g.perc, S.bar(bar, 0), D3 - 12, { vel: bar < 2 ? 0.4 : 0.8, decay: 1.0 });
    if (heavy) S.hitAt(timpani, g.perc, S.bar(bar, 2), D3 - 7, { vel: 0.5, decay: 0.8 });
    if (bar >= 4 && bar < 15) {
      S.roll(g.perc, S.bar(bar), 4 * S.spb, {
        rate: 8, from: heavy ? 0.20 : 0.10, to: heavy ? 0.26 : 0.13, accent: 2, grain: 0.05,
      });
    }
    if (bar >= 12 && bar < 15) S.perc(cymbal, g.perc, S.bar(bar), { vel: 0.16, dur: 4 * S.spb });
  }

  // --- tremolo strings from bar 4 -----------------------------------
  let prev = null;
  for (let bar = 4; bar < Math.min(nBars, 15); bar++) {
    const [rootOff, q] = chordAt(bar);
    const v = voice(D3 + rootOff, q, { n: 3, low: 62, high: 84, prev });
    prev = v;
    S.play(tremolo, g.trem, S.bar(bar), v, 4 * S.spb * 0.96, { vel: bar >= 12 ? 0.22 : 0.15, bright: 4.2 });
  }

  // --- the wedge arrives: menacing motif at bar 8 -------------------
  S.motif(brass, g.low, 8 * 4, menace(D3 - 12), { vel: 0.46, attack: 0.055, bright: 2.1, rip: 40 });
  S.motif(brass, g.low, 10 * 4, menace(D3 - 12, { from: 0, take: 4 }), { vel: 0.42, attack: 0.055, bright: 2.0 });
  S.motif(brass, g.brass, 10 * 4 + 4, menace(D3, { from: 4, take: 4 }), { vel: 0.40, attack: 0.05, bright: 2.4 });

  // Brass stabs on the offbeats through the climax.
  for (let bar = 12; bar < 15; bar++) {
    const [rootOff, q] = chordAt(bar);
    for (const beat of [1.5, 3.0]) {
      for (const m of voice(D3 + rootOff, q, { n: 3, low: 57, high: 74 })) {
        S.play(brass, g.brass, S.bar(bar, beat), m, S.spb * 0.5, { vel: 0.34, attack: 0.018, bright: 3.4, rip: 60 });
      }
    }
  }
  // The dissonant peak: D + Eb + Ab over the low D.
  for (const m of [D3 + 12, D3 + 13, D3 + 18]) {
    S.play(brass, g.brass, S.bar(13, 0), m, 3.4 * S.spb, { vel: 0.30, attack: 0.09, bright: 2.6 });
  }
  S.hitAt(timpani, g.perc, S.bar(13, 0), D3 - 12, { vel: 0.95, decay: 1.6 });
  S.perc(cymbal, g.perc, S.bar(12, 2), { vel: 0.34, dur: 2.6 });

  // --- bars 14+ : ion fire, everything comes apart ------------------
  const chromatic = [0, -1, -2, -3, -4];
  for (let i = 0; i < chromatic.length; i++) {
    S.play(brass, g.low, S.bar(14, i * 1.4), D3 - 12 + chromatic[i], 1.5 * S.spb, {
      vel: 0.40 - i * 0.03, attack: 0.10, bright: 1.8, rip: 20,
    });
  }
  for (const m of [D3 - 12, D3 - 11, D3 - 6, D3 - 5]) {
    S.play(strings, g.trem, S.bar(16), m, 3.6 * S.spb, { vel: 0.15, attack: 1.1, release: 1.4, bright: 1.9 });
  }
  S.play(pedal, g.sub, S.bar(16), D3 - 24, S.dur - 16 * 4 * S.spb - 0.2, { vel: 0.26, fade: 1.0 });
  S.hitAt(timpani, g.perc, S.bar(16), D3 - 12, { vel: 0.6, decay: 2.2 });
  S.perc(cymbal, g.perc, S.bar(16, 2), { vel: 0.16, dur: 3.0 });
}

/* ------------------------------------------------------------------ *
 * III. IMPERIAL — D minor, 84. A slow march that means it.
 * ------------------------------------------------------------------ */

function sImperial(S) {
  const g = {
    low: S.group('low', { send: 0.20, gain: 0.62 }),
    brass: S.group('brass', { send: 0.30, gain: 0.54 }),
    str: S.group('str', { send: 0.40, gain: 0.50 }),
    perc: S.group('perc', { send: 0.24, gain: 0.72 }),
    sub: S.group('sub', { send: 0.04, gain: 0.36 }),
  };
  const bar = (n, b = 0) => S.bar(n, b);
  const nBars = Math.ceil(S.dur / (4 * S.spb));

  // --- the march engine ---------------------------------------------
  for (let n = 0; n < nBars; n++) {
    const hush = n >= 4 && n < 5;                       // "then the smoke parts"
    const soft = n < 2;
    const under = n >= 7 && n < 8;                      // room for the dark lord
    const v = hush ? 0.55 : under ? 0.35 : soft ? 0.42 : 0.85;
    S.perc(bassDrum, g.perc, bar(n, 0), { vel: v, decay: 0.9 });
    if (!hush) S.perc(bassDrum, g.perc, bar(n, 2), { vel: v * 0.8, decay: 0.8 });
    if (soft || hush || under) continue;
    // Dotted military figure. Tuned bright: the snare is the only thing in
    // this section carrying presence above 1 kHz.
    for (const [b, vv] of [[0, 0.46], [0.75, 0.27], [1, 0.35], [1.5, 0.24], [2, 0.46], [2.75, 0.27], [3, 0.35], [3.5, 0.30], [3.75, 0.35]]) {
      S.perc(snare, g.perc, bar(n, b), { vel: vv * (n >= 5 ? 1.25 : 1), decay: 0.14, tone: 2600 });
    }
    S.hitAt(timpani, g.perc, bar(n, 0), D3 - 12, { vel: 0.7, decay: 1.4 });
    if (n >= 5) S.hitAt(timpani, g.perc, bar(n, 2), D3 - 7, { vel: 0.5, decay: 1.0 });
  }
  for (let n = 0; n < nBars; n++) {
    S.play(pedal, g.sub, bar(n), D3 - 24, 4 * S.spb, { vel: n >= 5 ? 0.30 : 0.20, fade: 0.5 });
  }
  S.roll(g.perc, bar(0), 2 * S.spb, { rate: 12, from: 0.03, to: 0.14, accent: 0 });

  // --- bars 0–1 : something distant ---------------------------------
  for (const m of [D3, D3 + 7]) {
    S.play(strings, g.str, bar(0), m, 8 * S.spb, { vel: 0.16, attack: 1.4, release: 1.4, bright: 1.9 });
  }

  // --- bars 2–3 : the motif, low brass ------------------------------
  S.motif(brass, g.low, 2 * 4, menace(D3 - 12), { vel: 0.50, attack: 0.075, bright: 1.9, rip: 45 });
  for (const [b, root, q] of [[2 * 4, D3, Q.min], [3 * 4, D3, Q.min]]) {
    for (const m of voice(root, q, { n: 3, low: 57, high: 74 })) {
      S.play(strings, g.str, S.b(b), m, 4 * S.spb * 0.95, { vel: 0.13, attack: 0.6, release: 0.7 });
    }
  }
  for (const b of [2 * 4 + 1, 2 * 4 + 3, 3 * 4 + 1, 3 * 4 + 3]) {
    for (const m of [D3 + 3, D3 + 7]) {
      S.play(brass, g.brass, S.b(b), m, S.spb * 0.7, { vel: 0.22, attack: 0.03, bright: 2.6, rip: 50 });
      S.play(brass, g.brass, S.b(b), m + 12, S.spb * 0.6, { vel: 0.09, attack: 0.03, bright: 3.0, rip: 50 });
    }
  }

  // --- bar 4 : the drop ---------------------------------------------
  S.play(pedal, g.sub, bar(4), D3 - 24, 4 * S.spb, { vel: 0.34, fade: 0.9 });
  S.play(strings, g.str, bar(4, 2), D3 + 13, 2 * S.spb, { vel: 0.10, attack: 1.0, release: 0.9, bright: 4.0 });

  // --- bars 5–6 : the motif at full weight --------------------------
  S.motif(brass, g.low, 5 * 4, menace(D3 - 12), { vel: 0.72, attack: 0.06, bright: 2.2, rip: 55 });
  S.motif(brass, g.low, 5 * 4, menace(D3 - 24), { vel: 0.40, attack: 0.07, bright: 1.7, rip: 30 });
  // A minor ninth above the motif — the sound of somebody enjoying this.
  S.motif(brass, g.brass, 5 * 4, menace(D3 + 1, { from: 0, take: 8 }), { vel: 0.20, attack: 0.05, bright: 3.0 });
  for (const [n, root, q] of [[5, D3, Q.min], [6, D3 - 4, Q.min]]) {
    for (const m of voice(root, q, { n: 4, low: 55, high: 76 })) {
      S.play(strings, g.str, bar(n), m, 4 * S.spb * 0.95, { vel: 0.15, attack: 0.5, release: 0.8 });
    }
  }

  // --- bar 7 : held, dark, so the voice sits on top -----------------
  for (const m of voice(D3 + 7, Q.dom7b9, { n: 4, low: 52, high: 74 })) {
    S.play(strings, g.str, bar(7), m, 4 * S.spb, { vel: 0.15, attack: 1.1, release: 1.1, bright: 2.0 });
  }
  S.play(brass, g.low, bar(7), D3 - 17, 4 * S.spb * 0.9, { vel: 0.30, attack: 0.35, bright: 1.6, rip: 10 });
  S.perc(cymbal, g.perc, bar(7), { vel: 0.13, dur: 3.4 });

  // --- bars 8–10 : the cadence --------------------------------------
  S.motif(brass, g.low, 8 * 4, menace(D3 - 12, { stretch: 1.5, take: 4 }), { vel: 0.66, attack: 0.08, bright: 2.0, rip: 45 });
  S.motif(brass, g.brass, 8 * 4, menace(D3, { stretch: 1.5, take: 4 }), { vel: 0.26, attack: 0.08, bright: 2.6 });
  const cad = [[9, D3 - 4, Q.min], [9.5, D3 + 7, Q.dom7b9], [10, D3, Q.min]];
  let prev = null;
  for (const [n, root, q] of cad) {
    const v = voice(root, q, { n: 4, low: 53, high: 76, prev });
    prev = v;
    const len = (n === 10 ? 4 : 2) * S.spb;
    for (const m of v) S.play(strings, g.str, bar(Math.floor(n), (n % 1) * 4), m, len, { vel: 0.19, attack: 0.4, release: 1.0 });
    S.play(brass, g.low, bar(Math.floor(n), (n % 1) * 4), root - 12, len * 0.92, { vel: 0.42, attack: 0.07, bright: 1.9 });
  }
  S.hitAt(timpani, g.perc, bar(10), D3 - 12, { vel: 1.0, decay: 2.4 });
  S.perc(cymbal, g.perc, bar(10), { vel: 0.24, dur: 3.2, crash: true });
  S.play(pedal, g.sub, bar(10), D3 - 24, S.dur - 10 * 4 * S.spb - 0.3, { vel: 0.30, fade: 1.2 });
}

/* ------------------------------------------------------------------ *
 * IV. DROIDS — F major, 132. Small, plucky, faintly ridiculous.
 * ------------------------------------------------------------------ */

const F3 = NOTE.midi('F3');   // 53

function sDroids(S) {
  const g = {
    pluck: S.group('pluck', { send: 0.20, gain: 0.42 }),
    cel: S.group('cel', { send: 0.34, gain: 0.60 }),
    reed: S.group('reed', { send: 0.24, gain: 0.46 }),
    str: S.group('str', { send: 0.36, gain: 0.44 }),
    perc: S.group('perc', { send: 0.20, gain: 0.50 }),
    low: S.group('low', { send: 0.18, gain: 0.52 }),
  };
  const nBars = Math.ceil(S.dur / (4 * S.spb));
  // | F | C7 | Dm | Bb | F | Gm7 | C7 | F | Dm | Bb | F | C7 | F | Gm7 | F |
  const PROG = [
    [0, Q.maj], [7, Q.dom7], [9, Q.min], [5, Q.maj],
    [0, Q.maj], [2, Q.min7], [7, Q.dom7], [0, Q.maj],
    [9, Q.min], [5, Q.maj], [0, Q.maj], [7, Q.dom7],
    [0, Q.maj], [2, Q.min7], [7, Q.dom7], [0, Q.maj],
  ];
  const at = (n) => PROG[Math.min(n, PROG.length - 1)];

  // Walking pizzicato bass and a wood tick on the offbeats.
  for (let n = 0; n < nBars; n++) {
    const [root, q] = at(n);
    const tones = q.slice(0, 3);
    for (let b = 0; b < 4; b++) {
      const semi = tones[[0, 2, 1, 2][b] % tones.length];
      S.play(pluck, g.pluck, S.bar(n, b), F3 - 12 + root + (b === 0 ? 0 : semi), S.spb * 0.7, {
        vel: 0.36, bright: 3.6, decay: 0.7,
      });
    }
    for (const b of [0.5, 1.5, 2.5, 3.5]) {
      S.perc(snare, g.perc, S.bar(n, b), { vel: 0.085, decay: 0.045, tone: 4200 });
    }
    S.perc(snare, g.perc, S.bar(n, 2), { vel: 0.13, decay: 0.07, tone: 2600 });
  }

  // The heroic motif, shrunk to droid size.
  S.motif(pluck, g.cel, 2 * 4, heroic(F3, { scale: S_MAJ }), { vel: 0.32, bright: 6, decay: 0.55 });
  S.motif(fm, g.cel, 2 * 4, heroic(F3 + 12, { scale: S_MAJ }), { vel: 0.16, ratio: 3.01, index: 2.2, decay: 0.5 });

  // Worried middle: the same shape in the relative minor, on a reed.
  S.motif(pluck, g.reed, 8 * 4, heroic(F3 - 3, { scale: S_MIN, take: 6 }), { vel: 0.26, bright: 2.6, decay: 0.8 });
  for (let n = 8; n < Math.min(nBars, 10); n++) {
    const [root, q] = at(n);
    for (const m of voice(F3 + root, q, { n: 3, low: 60, high: 79 })) {
      S.play(strings, g.str, S.bar(n), m, 4 * S.spb * 0.9, { vel: 0.11, attack: 0.5, release: 0.6 });
    }
  }

  // Pod launch: an accelerating rise out of bar 8 into bar 9.
  const rise = [0, 4, 7, 12, 16, 19, 24];
  for (let i = 0; i < rise.length; i++) {
    S.play(fm, g.cel, S.bar(7, 2 + i * 0.28), F3 + 12 + rise[i], 0.5, { vel: 0.13, ratio: 4.02, index: 3.0 });
  }
  S.perc(cymbal, g.perc, S.bar(8, 0), { vel: 0.16, dur: 1.6 });
  for (const m of [F3 + 12, F3 + 19, F3 + 24]) {
    S.play(strings, g.str, S.bar(8, 0), m, 3.2 * S.spb, { vel: 0.10, attack: 0.9, release: 0.8, bright: 4.0 });
  }

  // Brighter again, in octaves.
  S.motif(pluck, g.cel, 10 * 4, heroic(F3 + 12, { scale: S_MAJ, take: 7 }), { vel: 0.30, bright: 6.5, decay: 0.5 });
  S.motif(pluck, g.pluck, 10 * 4, heroic(F3, { scale: S_MAJ, take: 7 }), { vel: 0.16, bright: 4.0, decay: 0.6 });

  // The officer speaks: four notes of the wrong motif, very quietly.
  S.motif(brass, g.low, 12 * 4 + 2, menace(F3 - 12, { take: 4 }), { vel: 0.22, attack: 0.14, bright: 1.6, rip: 12 });

  // Cheeky cadence.
  S.motif(pluck, g.cel, 13 * 4 + 2, heroic(F3 + 12, { scale: S_MAJ, from: 6, take: 4, resolve: true }),
    { vel: 0.30, bright: 6.5, decay: 0.55 });
  for (const m of voice(F3, Q.maj6, { n: 4, low: 53, high: 77 })) {
    S.play(pluck, g.pluck, S.bar(14, 2), m, S.spb, { vel: 0.26, bright: 4.5, decay: 0.9 });
  }
  S.play(fm, g.cel, S.bar(14, 3), F3 + 24, 1.2, { vel: 0.16, ratio: 3.01, index: 2.0 });
}

/* ------------------------------------------------------------------ *
 * V. DESERT — D hijaz, 60. Sparse, lonely, one voice.
 * ------------------------------------------------------------------ */

function sDesert(S) {
  const g = {
    drone: S.group('drone', { send: 0.30, gain: 0.46 }),
    lead: S.group('lead', { send: 0.55, gain: 0.50 }),
    str: S.group('str', { send: 0.60, gain: 0.42 }),
    harp: S.group('harp', { send: 0.65, gain: 0.40 }),
    perc: S.group('perc', { send: 0.35, gain: 0.55 }),
    horn: S.group('horn', { send: 0.55, gain: 0.44 }),
    sub: S.group('sub', { send: 0.05, gain: 0.40 }),
  };
  const T = (s) => S.t0 + s;
  const D = S.dur;

  // The horizon: an open fifth that never moves.
  S.play(pedal, g.sub, T(0), D3 - 24, D - 1.2, { vel: 0.26, fade: 2.4 });
  S.play(strings, g.drone, T(0), D3 - 12, D - 1.4, { vel: 0.15, attack: 3.0, release: 2.2, bright: 1.8, voices: 2 });
  S.play(strings, g.drone, T(0.4), D3 - 5, D - 2.0, { vel: 0.11, attack: 3.4, release: 2.2, bright: 2.0, voices: 2 });
  S.play(strings, g.str, T(1.0), D3 + 19, D - 3.0, { vel: 0.055, attack: 4.5, release: 3.0, bright: 3.6, voices: 2 });
  // Heat haze: two harmonics so high they read as air rather than as notes.
  S.play(strings, g.str, T(2.2), D3 + 31, D - 5.0, { vel: 0.022, attack: 6.0, release: 4.0, bright: 6.5, voices: 2 });
  S.play(strings, g.str, T(6.5), D3 + 38, D - 11.0, { vel: 0.012, attack: 6.0, release: 4.5, bright: 6.5, voices: 2 });
  S.play(fm, g.harp, T(2.0), D3 + 26, 3.2, { vel: 0.11, ratio: 4.02, index: 3.2 });

  // The solo. D · Eb · F# · G — phrygian dominant, and no hurry at all.
  const LINE = [
    [0.0, 0, 1.8], [1.8, 1, 0.6], [2.4, 4, 1.6], [4.0, 5, 1.0],
    [5.0, 4, 0.7], [5.7, 1, 0.8], [6.5, 0, 2.2],
    [8.7, 7, 1.4], [10.1, 8, 0.8], [10.9, 7, 1.0], [11.9, 5, 0.8],
    [12.7, 4, 1.2], [13.9, 1, 0.9], [14.8, 0, 2.6],
  ];
  const leadAt = 4.2;
  let prevMidi = null;
  for (const [b, semi, len] of LINE) {
    const midi = D3 + 12 + semi;
    S.play(lead, g.lead, T(leadAt + b), midi, len * 0.94, {
      vel: 0.30, attack: 0.18, release: 0.45, bright: 2.8,
      vibRate: 5.4, vibDepth: 26, vibDelay: 0.3,
      from: prevMidi != null && Math.abs(midi - prevMidi) <= 3 ? prevMidi : null,
    });
    prevMidi = midi;
  }

  // Second pad, dark and modal.
  for (const [ts, root, q, len] of [[13.5, D3, Q.min, 6.5], [20.0, D3 - 4, Q.maj, 5.5]]) {
    for (const m of voice(root, q, { n: 3, low: 57, high: 76 })) {
      S.play(strings, g.str, T(ts), m, len, { vel: 0.085, attack: 2.2, release: 2.0, bright: 2.2, voices: 2 });
    }
  }

  // The sandcrawler, arriving the way weather arrives.
  for (let i = 0; i < 5; i++) {
    S.hitAt(timpani, g.perc, T(17.0 + i * 2.4), D3 - 12, { vel: 0.20 + i * 0.045, decay: 2.1, rich: false });
  }
  S.play(pedal, g.sub, T(17.0), D3 - 26, 10.0, { vel: 0.18, fade: 2.5 });

  // A few grains of sand.
  const HIJ = [0, 1, 4, 5, 7, 8, 10];
  for (let i = 0; i < 11; i++) {
    const ts = 8.4 + i * 1.85 + S.r() * 0.5;
    const m = D3 + 24 + HIJ[Math.floor(S.r() * HIJ.length)] + (S.r() < 0.35 ? 12 : 0);
    S.play(fm, g.harp, T(ts), m, 1.6 + S.r() * 0.9, { vel: 0.07 + S.r() * 0.05, ratio: 4.02, index: 3.4 });
  }

  // The plans keep travelling: the heroic motif, quiet, in the natural minor.
  S.motif(lead, g.horn, 25.8 / S.spb, heroic(D3, { scale: S_MIN, take: 6, stretch: 1.0 }), {
    vel: 0.20, attack: 0.35, release: 0.9, bright: 2.0, vibRate: 4.6, vibDepth: 12, vibDelay: 0.5,
  });
  for (const m of voice(D3 - 12, Q.min7, { n: 3, low: 45, high: 66 })) {
    S.play(strings, g.drone, T(25.6), m, 5.2, { vel: 0.09, attack: 1.6, release: 1.8, bright: 2.0, voices: 2 });
  }
}

/* ------------------------------------------------------------------ *
 * VI. BATTLE — D minor → E minor, 152. Builds, stops dead, builds again.
 * ------------------------------------------------------------------ */

function sBattle(S) {
  const g = {
    ost: S.group('ost', { send: 0.12, gain: 0.50 }),
    low: S.group('low', { send: 0.18, gain: 0.60 }),
    brass: S.group('brass', { send: 0.26, gain: 0.58 }),
    hi: S.group('hi', { send: 0.34, gain: 0.50 }),
    trem: S.group('trem', { send: 0.34, gain: 0.46 }),
    perc: S.group('perc', { send: 0.20, gain: 0.72 }),
    sub: S.group('sub', { send: 0.04, gain: 0.34 }),
    solo: S.group('solo', { send: 0.62, gain: 0.48 }),
  };
  const nBars = Math.ceil(S.dur / (4 * S.spb));
  const STILL_A = 20;      // bars 20–22 are the moment before the shot
  const STILL_B = 23;

  // Root and quality per bar. Bars 0–19 in D minor, 23+ up a tone in E minor.
  const key = (n) => (n >= STILL_B ? D3 + 2 : D3);
  const PROG = [
    [0, Q.min], [0, Q.min], [0, Q.min], [0, Q.min],
    [0, Q.min], [0, Q.min], [-2, Q.maj], [0, Q.min],
    [0, Q.min], [-4, Q.maj], [-2, Q.maj], [7, Q.dom7],
    [0, Q.min], [1, Q.maj7], [0, Q.min], [7, Q.dom7],
    [0, Q.min], [1, Q.maj7], [3, Q.maj], [7, Q.dom7b9],
    [0, Q.min], [0, Q.min], [0, Q.min],
    [0, Q.min], [-4, Q.maj], [-2, Q.maj], [0, Q.min],
    [0, Q.min], [3, Q.maj], [3, Q.maj],
  ];
  const at = (n) => PROG[Math.min(n, PROG.length - 1)];
  const still = (n) => n >= STILL_A && n < STILL_B;

  // --- ostinato + sub -----------------------------------------------
  const FIG = [0, 0, 3, 0, 0, 5, 3, 0];
  for (let n = 0; n < nBars; n++) {
    const [root] = at(n);
    const k = key(n) + root;
    S.play(pedal, g.sub, S.bar(n), k - 24, 4 * S.spb, { vel: still(n) ? 0.20 : n < 4 ? 0.20 : 0.28, fade: 0.35 });
    if (still(n)) continue;
    const heavy = n >= 12;
    // Bars 0–3 run at quarter density: a pulse, not yet a chase.
    const step = n < 4 ? 2 : 1;
    for (let e = 0; e < 8; e += step) {
      const t = S.bar(n, e * 0.5);
      const semi = FIG[e];
      const vel = 0.30 * (n < 4 ? 0.5 : n < 8 ? 0.82 : 1) * (e % 2 === 0 ? 1 : 0.7) * (heavy ? 1.15 : 1);
      S.play(pluck, g.ost, t, k - 12 + semi, S.spb * 0.42, { vel, bright: 4.0, decay: 0.8 });
      if (n >= 8) S.play(pluck, g.ost, t, k + semi, S.spb * 0.42, { vel: vel * (heavy ? 0.5 : 0.32), bright: 3.2, decay: 0.65 });
    }
  }

  // --- percussion ----------------------------------------------------
  for (let n = 0; n < nBars; n++) {
    if (still(n)) { if (n === STILL_A) S.perc(cymbal, g.perc, S.bar(n), { vel: 0.10, dur: 3.4 }); continue; }
    const stage = n < 4 ? 0 : n < 8 ? 1 : n < 12 ? 2 : n < 16 ? 3 : n < 20 ? 4 : 5;
    const v = [0.28, 0.45, 0.62, 0.80, 0.92, 1.0][stage];
    S.hitAt(timpani, g.perc, S.bar(n, 0), key(n) + at(n)[0] - 12, { vel: 0.55 * v + 0.25, decay: 1.1 });
    if (stage >= 2) S.hitAt(timpani, g.perc, S.bar(n, 2), key(n) - 7, { vel: 0.45 * v, decay: 0.9 });
    if (stage >= 3) S.perc(bassDrum, g.perc, S.bar(n, 3), { vel: 0.45 * v, decay: 0.6 });
    if (stage >= 1) {
      S.roll(g.perc, S.bar(n), 4 * S.spb, {
        rate: stage >= 3 ? 16 : 8, from: 0.09 * v, to: 0.13 * v, accent: stage >= 3 ? 4 : 2, grain: 0.045,
      });
    }
    if (stage === 0) {
      S.perc(snare, g.perc, S.bar(n, 2), { vel: 0.14, decay: 0.10, tone: 3200 });
      S.roll(g.perc, S.bar(n), 4 * S.spb, { rate: 8, from: 0.035, to: 0.05, accent: 4, grain: 0.03, tone: 3600 });
    }
  }
  // Crescendo rolls at the section joins.
  S.roll(g.perc, S.bar(15, 2), 2 * S.spb, { rate: 18, from: 0.12, to: 0.55, accent: 0 });
  S.perc(cymbal, g.perc, S.bar(16), { vel: 0.30, dur: 2.6, crash: true });
  S.roll(g.perc, S.bar(18), 8 * S.spb, { rate: 18, from: 0.10, to: 0.62, accent: 4 });
  S.perc(cymbal, g.perc, S.bar(19, 2), { vel: 0.34, dur: 2.2, crash: true });

  // --- tremolo strings ------------------------------------------------
  let prev = null;
  for (let n = 2; n < nBars; n++) {
    if (still(n)) continue;
    const [root, q] = at(n);
    const v = voice(key(n) + root, q, { n: 3, low: 64, high: 86, prev });
    prev = v;
    S.play(tremolo, g.trem, S.bar(n), v, 4 * S.spb * 0.96, {
      vel: n < 4 ? 0.05 : n < 8 ? 0.085 : n >= 16 ? 0.19 : 0.12, bright: 3.0,
    });
  }

  // --- the menacing motif owns the middle -----------------------------
  S.motif(brass, g.low, 8 * 4, menace(D3 - 12), { vel: 0.46, attack: 0.05, bright: 2.1, rip: 40 });
  S.motif(brass, g.low, 12 * 4, menace(D3 - 12, { stretch: 0.5 }), { vel: 0.40, attack: 0.035, bright: 2.3 });
  S.motif(brass, g.low, 16 * 4, menace(D3 - 12), { vel: 0.52, attack: 0.05, bright: 2.2, rip: 45 });

  // Offbeat stabs through the trench.
  for (let n = 12; n < 20; n++) {
    const [root, q] = at(n);
    for (const b of [1.5, 3.5]) {
      for (const m of voice(key(n) + root, q, { n: 3, low: 59, high: 76 })) {
        S.play(brass, g.brass, S.bar(n, b), m, S.spb * 0.45, { vel: 0.26, attack: 0.016, bright: 3.4, rip: 60 });
      }
    }
  }

  // --- the heroes, appearing in fragments -----------------------------
  S.motif(brass, g.hi, 14 * 4, heroic(D3 + 12, { scale: S_MIN, from: 1, take: 3 }), { vel: 0.34, attack: 0.04, bright: 3.2 });
  S.motif(brass, g.hi, 18 * 4, heroic(D3 + 12, { scale: S_MIN, from: 0, take: 5 }), { vel: 0.40, attack: 0.045, bright: 3.2 });

  // --- bars 20–22 : he switches it off --------------------------------
  S.play(strings, g.trem, S.bar(STILL_A), D3 + 31, 3 * 4 * S.spb, { vel: 0.075, attack: 1.2, release: 1.6, bright: 4.0, voices: 2 });
  for (const m of voice(D3, Q.min, { n: 3, low: 50, high: 69 })) {
    S.play(strings, g.trem, S.bar(STILL_A, 1), m, 2.6 * 4 * S.spb, { vel: 0.075, attack: 1.6, release: 1.8, bright: 1.8, voices: 2 });
  }
  S.motif(brass, g.solo, STILL_A * 4 + 6, heroic(D3, { scale: S_MIN, take: 4, stretch: 1.5 }), {
    vel: 0.26, attack: 0.22, bright: 1.9, release: 0.8, rip: 14,
  });
  S.hitAt(timpani, g.perc, S.bar(STILL_B - 1, 3), D3 - 12, { vel: 0.35, decay: 1.4 });

  // --- bars 23+ : up a tone, and everything at once -------------------
  const E3 = D3 + 2;
  S.motif(brass, g.hi, 23 * 4 + 3.5, heroic(E3 + 12, { scale: S_MIN }), { vel: 0.48, attack: 0.045, bright: 3.3 });
  S.motif(brass, g.brass, 23 * 4 + 3.5, heroic(E3, { scale: S_MIN }), { vel: 0.30, attack: 0.07, bright: 2.4 });
  S.motif(brass, g.low, 24 * 4, menace(E3 - 12, { take: 4 }), { vel: 0.44, attack: 0.05, bright: 2.0 });
  S.perc(cymbal, g.perc, S.bar(23), { vel: 0.34, dur: 2.8, crash: true });
  S.hitAt(timpani, g.perc, S.bar(23), E3 - 12, { vel: 1.0, decay: 1.7 });

  // Torpedoes away.
  S.perc(cymbal, g.perc, S.bar(25, 2), { vel: 0.30, dur: 2.4, crash: true });
  S.hitAt(timpani, g.perc, S.bar(25, 2), E3 - 12, { vel: 0.95, decay: 1.6 });

  // --- the last three bars : one long crescendo into the finale -------
  const lastStart = Math.max(0, nBars - 3);
  const cresT = S.bar(lastStart);
  const cresDur = Math.max(0.6, S.end - cresT - 0.42);
  S.roll(g.perc, cresT, cresDur, { rate: 20, from: 0.14, to: 0.85, accent: 4, grain: 0.04 });
  S.perc(cymbal, g.perc, cresT, { vel: 0.42, dur: cresDur + 0.1 });
  for (let i = 0; i < 6; i++) {
    const t = cresT + (cresDur * i) / 6;
    S.hitAt(timpani, g.perc, t, E3 - 12, { vel: 0.45 + i * 0.09, decay: 0.9 });
  }
  // A rising cluster over an F pedal — the dominant of the finale's B♭.
  const FF = NOTE.midi('F2');
  S.play(pedal, g.sub, cresT, FF, cresDur + 0.3, { vel: 0.34, fade: 0.4 });
  for (let i = 0; i < 5; i++) {
    const m = FF + 12 + [0, 4, 7, 10, 12][i];
    S.play(brass, g.brass, cresT + (cresDur * i) / 7, m, cresDur - (cresDur * i) / 7 + 0.1, {
      vel: 0.20 + i * 0.045, attack: 0.12, bright: 2.8, release: 0.25,
    });
  }
  // Land the last accent early enough that the crescendo decays, not cuts.
  S.hitAt(timpani, g.perc, S.end - 0.40, FF, { vel: 1.0, decay: 0.42 });
  S.perc(cymbal, g.perc, S.end - 0.40, { vel: 0.42, dur: 0.40, crash: true });
}

/* ------------------------------------------------------------------ *
 * VII. FINALE — B♭ major, 96. The heroic motif, three times, then warmth.
 * ------------------------------------------------------------------ */

function sFinale(S) {
  const g = {
    brass: S.group('brass', { send: 0.28, gain: 0.60 }),
    horn: S.group('horn', { send: 0.36, gain: 0.50 }),
    low: S.group('low', { send: 0.20, gain: 0.60 }),
    str: S.group('str', { send: 0.44, gain: 0.58 }),
    hi: S.group('hi', { send: 0.55, gain: 0.44 }),
    perc: S.group('perc', { send: 0.24, gain: 0.70 }),
    harp: S.group('harp', { send: 0.60, gain: 0.44 }),
    sub: S.group('sub', { send: 0.05, gain: 0.42 }),
  };
  const bar = (n, b = 0) => S.bar(n, b);

  // --- bar 0 : arrival ------------------------------------------------
  for (const m of [BB3 - 24, BB3 - 12, BB3 - 5, BB3, BB3 + 4, BB3 + 7, BB3 + 12]) {
    S.play(brass, m < BB3 - 5 ? g.low : g.brass, bar(0), m, 3.2 * S.spb, { vel: 0.60, attack: 0.025, bright: 3.2, rip: 60 });
    if (m >= BB3) S.play(strings, g.str, bar(0), m + 12, 3.6 * S.spb, { vel: 0.22, attack: 0.06, release: 0.6 });
  }
  S.hitAt(timpani, g.perc, bar(0), BB3 - 12, { vel: 1.0, decay: 1.8 });
  S.perc(cymbal, g.perc, bar(0), { vel: 0.50, dur: 3.0, crash: true });

  // --- bars 0–4 : first statement, full brass -------------------------
  S.motif(brass, g.brass, 3.5, heroic(BB3 + 12), { vel: 0.62, attack: 0.05, bright: 3.0 });
  S.motif(brass, g.horn, 3.5, heroic(BB3), { vel: 0.32, attack: 0.09, bright: 2.2 });
  S.motif(strings, g.str, 3.5, heroic(BB3 + 24), { vel: 0.16, attack: 0.12, release: 0.4, bright: 3.4 });

  const PROG1 = [
    [0, BB3, Q.maj, 4], [4, BB3, Q.maj, 4], [8, BB3, Q.maj, 2], [10, BB3 + 5, Q.maj, 2],
    [12, BB3 - 3, Q.min, 2], [14, BB3 + 7, Q.dom7, 2], [16, BB3, Q.maj, 4],
  ];
  let prev = null;
  const harmony = (list, o = {}) => {
    for (const [b, root, q, len] of list) {
      const v = voice(root, q, { n: 4, low: o.low ?? 48, high: o.high ?? 71, prev });
      prev = v;
      for (const m of v) S.play(strings, g.str, S.b(b), m, len * S.spb * 0.96, { vel: o.vel ?? 0.24, attack: 0.2, release: 0.6 });
      S.play(brass, g.low, S.b(b), root - 12, len * S.spb * 0.92, { vel: o.bass ?? 0.36, attack: 0.06, bright: 2.0 });
      S.play(pedal, g.sub, S.b(b), root - 24, len * S.spb, { vel: 0.18, fade: 0.4 });
    }
  };
  harmony(PROG1);
  for (let n = 0; n < 5; n++) {
    S.hitAt(timpani, g.perc, bar(n), BB3 - 12, { vel: n === 0 ? 1.0 : 0.62, decay: 1.3 });
    S.hitAt(timpani, g.perc, bar(n, 2), BB3 - 5, { vel: 0.38, decay: 0.9 });
    S.roll(g.perc, bar(n, 2.5), 1.5 * S.spb, { rate: 16, from: 0.10, to: 0.30, accent: 4 });
  }

  // --- bars 4–8 : the lyrical middle ----------------------------------
  harmony([
    [16, BB3 + 5, Q.maj, 4], [20, BB3, Q.maj, 2], [22, BB3 + 2, Q.min7, 2],
    [24, BB3 + 2, Q.min7, 4], [28, BB3 + 7, Q.dom7, 4],
  ], { vel: 0.22 });
  const SOAR = [
    [16, 19, 3], [19, 17, 1], [20, 16, 2], [22, 14, 2],
    [24, 17, 3], [27, 16, 1], [28, 14, 2], [30, 12, 2],
  ];
  for (const [b, semi, len] of SOAR) {
    S.play(strings, g.hi, S.b(b), BB3 + 12 + semi, len * S.spb * 0.95, { vel: 0.20, attack: 0.28, release: 0.7, bright: 3.6 });
    S.play(brass, g.horn, S.b(b), BB3 + semi, len * S.spb * 0.9, { vel: 0.20, attack: 0.13, bright: 2.1, rip: 18 });
  }
  S.motif(brass, g.brass, 17.5, heroic(BB3, { from: 0, take: 4 }), { vel: 0.30, attack: 0.07, bright: 2.6 });
  S.motif(brass, g.brass, 25.5, heroic(BB3 + 5, { from: 0, take: 4 }), { vel: 0.30, attack: 0.07, bright: 2.6 });
  for (let n = 4; n < 8; n++) {
    S.hitAt(timpani, g.perc, bar(n), BB3 - 12, { vel: 0.42, decay: 1.2 });
    S.roll(g.perc, bar(n, 3), 1 * S.spb, { rate: 16, from: 0.07, to: 0.22, accent: 4 });
  }
  // Harp, sweeping up under the middle.
  const SCALE_BB = [0, 2, 4, 5, 7, 9, 11];
  for (let i = 0; i < 14; i++) {
    S.play(fm, g.harp, S.b(20.0 + i * 0.25), BB3 + 12 + NOTE.degree(i + 1, SCALE_BB), 1.4, {
      vel: 0.12, ratio: 2.01, index: 1.6, decay: 1,
    });
  }

  // --- bars 8–12 : the last statement, augmented ----------------------
  S.motif(brass, g.brass, 31, heroic(BB3 + 12, { stretch: 1.5, resolve: true }), { vel: 0.66, attack: 0.055, bright: 3.1 });
  S.motif(brass, g.horn, 31, heroic(BB3, { stretch: 1.5, resolve: true }), { vel: 0.34, attack: 0.09, bright: 2.2 });
  S.motif(strings, g.hi, 31, heroic(BB3 + 24, { stretch: 1.5, resolve: true }), { vel: 0.15, attack: 0.2, release: 0.6, bright: 3.6 });
  harmony([
    [32, BB3, Q.maj, 4], [36, BB3 + 5, Q.maj, 4], [40, BB3 - 3, Q.min, 2], [42, BB3 + 5, Q.maj, 2],
    [44, BB3 + 7, Q.dom7, 4],
  ], { vel: 0.26, bass: 0.40 });
  for (let n = 8; n < 12; n++) {
    S.hitAt(timpani, g.perc, bar(n), BB3 - 12, { vel: 0.78, decay: 1.4 });
    S.hitAt(timpani, g.perc, bar(n, 2), BB3 - 5, { vel: 0.48, decay: 1.0 });
    S.roll(g.perc, bar(n, 2), 2 * S.spb, { rate: 16, from: 0.12, to: 0.34, accent: 4 });
    S.perc(cymbal, g.perc, bar(n), { vel: n === 8 ? 0.34 : 0.16, dur: 2.4, crash: n === 8 });
  }

  // --- bars 12+ : the warm chord --------------------------------------
  const warm = bar(12);
  const rest = Math.max(1.2, S.end - warm - 0.15);
  const chord = voice(BB3, Q.maj9, { n: 5, low: 46, high: 79, prev });
  for (const m of chord) {
    S.play(strings, g.str, warm, m, rest, { vel: 0.20, attack: 1.1, release: 1.4, bright: 2.5 });
    if (m <= BB3 + 12) S.play(brass, g.horn, warm, m, rest * 0.9, { vel: 0.15, attack: 0.7, bright: 1.8, release: 1.0, rip: 8 });
  }
  S.play(strings, g.hi, warm, BB3 + 24, rest * 0.92, { vel: 0.10, attack: 1.6, release: 1.4, bright: 3.4, voices: 2 });
  S.play(pedal, g.sub, warm, BB3 - 24, rest, { vel: 0.24, fade: 1.5 });
  S.hitAt(timpani, g.perc, warm, BB3 - 12, { vel: 0.55, decay: 2.6 });
  S.perc(cymbal, g.perc, warm, { vel: 0.14, dur: Math.min(4.0, rest) });
  for (let i = 0; i < 6; i++) {
    S.play(fm, g.harp, warm + 0.35 + i * 0.34, BB3 + 12 + [0, 4, 7, 11, 14, 19][i], 2.6, {
      vel: 0.13, ratio: 3.01, index: 2.2, decay: 1,
    });
  }
  S.play(fm, g.harp, warm + 2.8, BB3 + 24, 3.0, { vel: 0.10, ratio: 4.02, index: 2.6 });
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

const SECTIONS = {
  fanfare: sFanfare,
  chase: sChase,
  imperial: sImperial,
  droids: sDroids,
  desert: sDesert,
  battle: sBattle,
  finale: sFinale,
};

/**
 * Schedule the score.
 *
 * @param {BaseAudioContext} ctx
 * @param {object} bus            from `createBus(ctx)`
 * @param {Array<{id:string,start:number,dur:number}>} sections
 *        `id` is one of 'fanfare' | 'chase' | 'imperial' | 'droids' |
 *        'desert' | 'battle' | 'finale'. Each may also carry `tempo`,
 *        `fadeIn`, `tailFade` and `level` to override the defaults.
 * @param {object} [opts]  `{seed, gain}`
 * @returns {{end:number, notes:number, sections:Array}}
 */
export function scheduleScore(ctx, bus, sections = [], opts = {}) {
  const o = { seed: 20250802, gain: 1, ...opts };
  const out = [];
  let end = 0;
  let notes = 0;
  for (const spec of sections) {
    const fn = SECTIONS[spec.id];
    if (!fn) {
      console.warn(`scheduleScore: unknown section "${spec.id}"`);
      continue;
    }
    if (!(spec.dur > 0)) continue;
    const S = makeSection(ctx, bus, { start: spec.start || 0, ...spec }, o);
    fn(S);
    const tail = S.end + (spec.tailFade ?? DEFAULTS[spec.id].tailFade);
    end = Math.max(end, tail);
    notes += S.noteCount();
    out.push({ id: spec.id, start: S.t0, dur: S.dur, end: S.end, tempo: S.tempo, notes: S.noteCount() });
  }
  return { end, notes, sections: out };
}
