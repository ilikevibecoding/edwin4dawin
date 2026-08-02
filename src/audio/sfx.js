/*
 * Sound effects, all synthesized.
 *
 *   playSfx(audio, 'blaster_rebel', 12.5, { pan: -0.4, gain: 0.9 });
 *
 * Every effect is laid down as absolute-time AudioParam automation plus
 * start(when)/stop(when) — see the note at the top of engine.js. Nothing here
 * looks at a clock, so the whole film's effects track can be scheduled into an
 * OfflineAudioContext at t = 0 and rendered faster than real time.
 *
 * Variation between repeats of the same effect is seeded from the scheduled
 * time, not from a call counter, so scheduling a shot on its own gives exactly
 * the same noise as scheduling the whole film.
 */
import {
  makeBin, channelStrip, ampEnv, hitEnv, swellEnv, sweep, clamp, FLOOR,
} from './engine.js';
import { makeRng } from '../core/rng.js';

// ---------------------------------------------------------------------------
// voice helpers
// ---------------------------------------------------------------------------

/**
 * One filtered noise layer.
 *   at, dur      when it starts / how long the body lasts
 *   type         'white' | 'pink' | 'brown'
 *   filter       'lowpass' | 'bandpass' | 'highpass' | 'notch' | null
 *   f0, f1       filter cutoff at the start and (optionally) the end
 *   q            filter Q
 *   env          'hit' (instant, exponential decay) | 'swell' | 'gate'
 */
function noiseLayer(V, o) {
  const bin = V.bin;
  const at = o.at ?? V.t;
  const dur = o.dur ?? 0.3;
  const rise = o.rise ?? 0.01;
  const fall = o.fall ?? 0.1;
  const tail = o.env === 'hit' ? (o.decay ?? dur) : fall;
  const stopAt = at + dur + tail + 0.05;
  const buf = V.audio.noise(o.type || 'white', 8, o.bank || 'sfx');
  const src = bin.buf(buf, at, stopAt, {
    offset: o.offset ?? V.rng.range(0, 7),
    rate: o.rate ?? 1,
    loop: true,
  });
  let node = src;
  if (o.filter !== null) {
    const f = bin.filter(o.filter || 'lowpass', o.f0 ?? 2000, o.q ?? 1);
    if (o.f1 != null) sweep(f.frequency, at, o.f0, o.f1, o.sweepTime ?? dur, o.sweepExp !== false);
    if (o.q1 != null) sweep(f.Q, at, o.q ?? 1, o.q1, o.sweepTime ?? dur, false);
    node.connect(f);
    node = f;
    if (o.filter2) {
      const f2 = bin.filter(o.filter2, o.f2 ?? 200, o.q2 ?? 0.7);
      node.connect(f2);
      node = f2;
    }
  }
  const g = bin.gain(0);
  const peak = (o.gain ?? 0.5) * V.gain;
  if (o.env === 'swell') swellEnv(g.gain, at, peak, rise, Math.max(0, dur - rise), fall);
  else if (o.env === 'gate') ampEnv(g.gain, at, { a: rise, d: 0.01, s: 1, r: fall, peak, dur });
  else hitEnv(g.gain, at, peak, o.decay ?? dur, rise);
  node.connect(g);
  g.connect(o.dest || V.out);
  return { src, out: g, node, stopAt };
}

/**
 * One pitched layer: `count` oscillators detuned around a frequency that may
 * sweep, through an optional filter that may sweep with it.
 */
function toneLayer(V, o) {
  const bin = V.bin;
  const at = o.at ?? V.t;
  const dur = o.dur ?? 0.3;
  const decay = o.decay ?? dur;
  const rise = o.rise ?? 0.005;
  const stopAt = at + Math.max(dur, o.sweepTime ?? 0) + decay + (o.fall ?? 0) + 0.06;
  const g = bin.gain(0);
  let sink = g;
  if (o.filter) {
    const f = bin.filter(o.filter, o.f0 ?? 3000, o.q ?? 1);
    if (o.f1 != null) sweep(f.frequency, at, o.f0, o.f1, o.sweepTime ?? dur, o.sweepExp !== false);
    f.connect(g);
    sink = f;
  }
  const count = o.count ?? 1;
  const spread = o.spread ?? 8;
  for (let i = 0; i < count; i++) {
    const det = count === 1 ? 0 : (i / (count - 1) - 0.5) * 2 * spread;
    const osc = bin.osc(o.type || 'sine', o.hz, at, stopAt, det + (o.detune ?? 0));
    if (o.hzTo != null) sweep(osc.frequency, at, o.hz, o.hzTo, o.sweepTime ?? dur, o.sweepExp !== false);
    if (o.hz2 != null) {
      // three-point glide: hz -> hz2 -> hzTo (used for doppler passes)
      osc.frequency.cancelScheduledValues(at);
      const t1 = at + (o.sweepTime ?? dur) * (o.mid ?? 0.4);
      sweep(osc.frequency, at, o.hz, o.hz2, t1 - at, o.sweepExp !== false);
      sweep(osc.frequency, t1, o.hz2, o.hzTo, (o.sweepTime ?? dur) - (t1 - at), o.sweepExp !== false);
    }
    if (o.vibRate) {
      bin.lfo(o.vibRate, o.vibDepth ?? 20, at, stopAt, [osc.detune]);
    }
    osc.connect(sink);
  }
  const peak = (o.gain ?? 0.4) * V.gain;
  if (o.env === 'swell') swellEnv(g.gain, at, peak, rise, Math.max(0, dur - rise), o.fall ?? decay);
  else if (o.env === 'gate') ampEnv(g.gain, at, { a: rise, d: 0.02, s: o.s ?? 1, r: o.fall ?? 0.15, peak, dur });
  else hitEnv(g.gain, at, peak, decay, rise);
  g.connect(o.dest || V.out);
  return { out: g, stopAt };
}

/** A short feedback comb — the metallic "oing" behind blaster bolts. */
function comb(V, src, o = {}) {
  const bin = V.bin;
  const d = bin.keep(V.ctx.createDelay(0.25));
  d.delayTime.value = o.delay ?? 0.008;
  const f = bin.filter('lowpass', o.lp ?? 3200, 0.7);
  const fb = bin.gain(o.fb ?? 0.72);
  const out = bin.gain((o.gain ?? 0.45) * V.gain);
  src.connect(d);
  d.connect(f); f.connect(fb); fb.connect(d);
  d.connect(out);
  out.connect(o.dest || V.out);
  return out;
}

/** Inharmonic struck-metal partials. */
function metalRing(V, o) {
  const ratios = o.ratios || [1, 2.31, 3.63, 5.09, 6.71];
  const base = o.hz ?? 420;
  for (let i = 0; i < ratios.length; i++) {
    toneLayer(V, {
      type: 'sine', hz: base * ratios[i], at: (o.at ?? V.t) + i * 0.0015,
      dur: 0.01, decay: (o.decay ?? 0.6) / (1 + i * 0.75),
      gain: (o.gain ?? 0.3) / (1 + i * 0.9), rise: 0.001, dest: o.dest,
    });
  }
}

/** Seeded stepped automation — irregular gusts and flicker without a clock. */
function jitter(param, at, dur, step, lo, hi, rng, exp = false) {
  let t = at;
  param.setValueAtTime(exp ? Math.max(FLOOR, rng.range(lo, hi)) : rng.range(lo, hi), t);
  while (t < at + dur) {
    const nt = Math.min(at + dur, t + step);
    const v = rng.range(lo, hi);
    if (exp) param.exponentialRampToValueAtTime(Math.max(FLOOR, v), nt);
    else param.linearRampToValueAtTime(v, nt);
    t = nt;
  }
}

// ---------------------------------------------------------------------------
// the effects
// ---------------------------------------------------------------------------

const OPTS_BASE = 'gain pan rate send seed';
const OPTS_SUS = 'gain pan duration rate send seed';

const REG = {
  // -- weapons ------------------------------------------------------------
  blaster_rebel: {
    desc: 'rebel blaster bolt: descending zap with a metallic ricochet tail',
    opts: OPTS_BASE, send: 0.14, len: () => 0.5,
    build(V) {
      const bolt = toneLayer(V, {
        type: 'sawtooth', hz: V.hz(2600), hzTo: V.hz(130), sweepTime: V.k(0.11),
        dur: V.k(0.02), decay: V.k(0.17), gain: 0.62, rise: 0.002,
        filter: 'lowpass', f0: V.hz(6000), f1: V.hz(420), q: 7,
      });
      comb(V, bolt.out, { delay: 0.0082 / V.p, fb: 0.74, lp: V.hz(3400), gain: 0.4 });
      toneLayer(V, {
        type: 'sine', hz: V.hz(190), hzTo: V.hz(58), sweepTime: V.k(0.1),
        dur: 0.005, decay: V.k(0.13), gain: 0.5, rise: 0.002,
      });
      noiseLayer(V, {
        dur: 0.01, decay: V.k(0.05), gain: 0.3, filter: 'highpass', f0: V.hz(2200), q: 0.8,
      });
    },
  },

  blaster_imperial: {
    desc: 'stormtrooper rifle: harsher, brighter, more crack than zap',
    opts: OPTS_BASE, send: 0.14, len: () => 0.45,
    build(V) {
      const bolt = toneLayer(V, {
        type: 'square', hz: V.hz(3400), hzTo: V.hz(230), sweepTime: V.k(0.075),
        dur: 0.01, decay: V.k(0.13), gain: 0.44, rise: 0.001,
        filter: 'lowpass', f0: V.hz(7000), f1: V.hz(620), q: 9,
      });
      toneLayer(V, {
        type: 'sawtooth', hz: V.hz(2100), hzTo: V.hz(300), sweepTime: V.k(0.06),
        dur: 0.008, decay: V.k(0.09), gain: 0.3, rise: 0.001,
        filter: 'bandpass', f0: V.hz(1900), f1: V.hz(700), q: 3,
      });
      comb(V, bolt.out, { delay: 0.0053 / V.p, fb: 0.6, lp: V.hz(4200), gain: 0.3 });
      noiseLayer(V, {
        dur: 0.015, decay: V.k(0.08), gain: 0.42, filter: 'bandpass', f0: V.hz(3200), f1: V.hz(1400), q: 1.2,
      });
      toneLayer(V, { type: 'sine', hz: V.hz(150), hzTo: V.hz(52), sweepTime: V.k(0.07), dur: 0.004, decay: V.k(0.1), gain: 0.34 });
    },
  },

  turbolaser: {
    desc: 'capital-ship turbolaser: huge slow bolt with a sub thump',
    opts: OPTS_BASE, send: 0.3, len: () => 1.6,
    build(V) {
      const main = toneLayer(V, {
        type: 'sawtooth', count: 3, spread: 14, hz: V.hz(760), hzTo: V.hz(62),
        sweepTime: V.k(0.34), dur: V.k(0.05), decay: V.k(0.75), gain: 0.4, rise: 0.006,
        filter: 'lowpass', f0: V.hz(2600), f1: V.hz(210), q: 5,
      });
      comb(V, main.out, { delay: 0.019 / V.p, fb: 0.84, lp: V.hz(1800), gain: 0.36 });
      toneLayer(V, {
        type: 'sine', hz: V.hz(95), hzTo: V.hz(26), sweepTime: V.k(0.5),
        dur: 0.01, decay: V.k(0.9), gain: 0.8, rise: 0.004,
      });
      noiseLayer(V, {
        type: 'pink', dur: V.k(0.1), decay: V.k(0.55), gain: 0.34,
        filter: 'bandpass', f0: V.hz(520), f1: V.hz(140), q: 1.1,
      });
      noiseLayer(V, { dur: 0.02, decay: V.k(0.12), gain: 0.22, filter: 'highpass', f0: V.hz(3000) });
    },
  },

  // -- explosions ---------------------------------------------------------
  explosion_small: {
    desc: 'small brick-scattering pop',
    opts: OPTS_BASE, send: 0.24, len: () => 0.95,
    build(V) {
      noiseLayer(V, {
        type: 'pink', dur: V.k(0.04), decay: V.k(0.42), gain: 0.7,
        filter: 'lowpass', f0: V.hz(3600), f1: V.hz(190), q: 1.3, rise: 0.003,
      });
      toneLayer(V, { type: 'sine', hz: V.hz(130), hzTo: V.hz(40), sweepTime: V.k(0.18), dur: 0.01, decay: V.k(0.34), gain: 0.62 });
      noiseLayer(V, { dur: 0.01, decay: V.k(0.06), gain: 0.34, filter: 'highpass', f0: V.hz(2600) });
      for (let i = 0; i < 6; i++) {
        const t = V.rng.range(0.06, 0.5);
        noiseLayer(V, {
          at: V.t + V.k(t), dur: 0.006, decay: 0.03, gain: V.rng.range(0.05, 0.14),
          filter: 'bandpass', f0: V.rng.range(1400, 4200), q: 5,
        });
      }
    },
  },

  explosion_large: {
    desc: 'ship-killing blast: crack, body, sub drop, debris',
    opts: OPTS_BASE, send: 0.34, len: () => 2.7,
    build(V) {
      noiseLayer(V, { dur: 0.012, decay: V.k(0.06), gain: 0.5, filter: 'highpass', f0: V.hz(2800) });
      noiseLayer(V, {
        type: 'pink', dur: V.k(0.05), decay: V.k(1.5), gain: 0.8,
        filter: 'lowpass', f0: V.hz(2200), f1: V.hz(95), q: 1.4, sweepTime: V.k(1.1), rise: 0.004,
      });
      toneLayer(V, { type: 'sine', hz: V.hz(96), hzTo: V.hz(28), sweepTime: V.k(0.55), dur: 0.012, decay: V.k(1.25), gain: 0.85 });
      noiseLayer(V, {
        type: 'brown', dur: V.k(0.9), decay: V.k(1.9), gain: 0.55, rise: V.k(0.12),
        filter: 'lowpass', f0: V.hz(190), f1: V.hz(70), q: 1.6, env: 'hit',
      });
      for (let i = 0; i < 11; i++) {
        const t = V.rng.range(0.08, 1.7);
        noiseLayer(V, {
          at: V.t + V.k(t), dur: 0.008, decay: V.rng.range(0.02, 0.07),
          gain: V.rng.range(0.04, 0.13) * (1 - t / 2.2),
          filter: 'bandpass', f0: V.rng.range(900, 3800), q: 4.5,
        });
      }
    },
  },

  explosion_huge: {
    desc: 'battle-station detonation: double boom and a long rumble',
    opts: OPTS_BASE, send: 0.42, len: () => 4.6,
    build(V) {
      noiseLayer(V, { dur: 0.02, decay: V.k(0.09), gain: 0.55, filter: 'highpass', f0: V.hz(2400) });
      noiseLayer(V, {
        type: 'pink', dur: V.k(0.08), decay: V.k(2.6), gain: 0.85,
        filter: 'lowpass', f0: V.hz(1800), f1: V.hz(70), q: 1.5, sweepTime: V.k(2.0), rise: 0.006,
      });
      toneLayer(V, { type: 'sine', hz: V.hz(78), hzTo: V.hz(21), sweepTime: V.k(1.3), dur: 0.02, decay: V.k(2.3), gain: 0.9 });
      // secondary detonation
      noiseLayer(V, {
        at: V.t + V.k(0.42), type: 'pink', dur: V.k(0.05), decay: V.k(1.5), gain: 0.6,
        filter: 'lowpass', f0: V.hz(1300), f1: V.hz(110), q: 1.3, sweepTime: V.k(0.9),
      });
      toneLayer(V, { at: V.t + V.k(0.42), type: 'sine', hz: V.hz(64), hzTo: V.hz(23), sweepTime: V.k(0.9), dur: 0.012, decay: V.k(1.6), gain: 0.62 });
      // long rumble bed
      noiseLayer(V, {
        type: 'brown', dur: V.k(2.4), decay: V.k(3.4), gain: 0.6, rise: V.k(0.2),
        filter: 'lowpass', f0: V.hz(150), f1: V.hz(52), q: 1.8, sweepTime: V.k(3),
      });
      for (let i = 0; i < 18; i++) {
        const t = V.rng.range(0.1, 3.2);
        noiseLayer(V, {
          at: V.t + V.k(t), dur: 0.01, decay: V.rng.range(0.02, 0.1),
          gain: V.rng.range(0.035, 0.12) * (1 - t / 4),
          filter: 'bandpass', f0: V.rng.range(700, 3600), q: 4,
        });
      }
    },
  },

  low_boom: {
    desc: 'distant sub-bass boom, felt more than heard',
    opts: OPTS_BASE, send: 0.3, len: () => 2.7,
    build(V) {
      toneLayer(V, { type: 'sine', hz: V.hz(64), hzTo: V.hz(23), sweepTime: V.k(1.2), dur: 0.02, decay: V.k(2.1), gain: 0.9, rise: 0.01 });
      toneLayer(V, { type: 'sine', hz: V.hz(41), hzTo: V.hz(31), sweepTime: V.k(1.6), dur: 0.02, decay: V.k(2.4), gain: 0.55, rise: 0.02 });
      noiseLayer(V, {
        type: 'brown', dur: V.k(0.6), decay: V.k(2.2), gain: 0.4, rise: V.k(0.09),
        filter: 'lowpass', f0: V.hz(120), f1: V.hz(48), q: 1.4, sweepTime: V.k(2),
      });
      noiseLayer(V, { dur: 0.01, decay: V.k(0.07), gain: 0.14, filter: 'lowpass', f0: V.hz(900) });
    },
  },

  rumble_impact: {
    desc: 'something enormous lands: transient plus a rolling rumble',
    opts: OPTS_BASE, send: 0.3, len: () => 2.9,
    build(V) {
      noiseLayer(V, { dur: 0.015, decay: V.k(0.14), gain: 0.6, filter: 'lowpass', f0: V.hz(1400), f1: V.hz(300), q: 1.1 });
      metalRing(V, { hz: V.hz(196), decay: V.k(0.5), gain: 0.16, ratios: [1, 1.87, 3.14, 4.9] });
      toneLayer(V, { type: 'sine', hz: V.hz(84), hzTo: V.hz(30), sweepTime: V.k(0.6), dur: 0.012, decay: V.k(1.0), gain: 0.8 });
      const bed = noiseLayer(V, {
        type: 'brown', dur: V.k(1.2), decay: V.k(2.4), gain: 0.55, rise: V.k(0.12),
        filter: 'lowpass', f0: V.hz(210), f1: V.hz(65), q: 1.6, sweepTime: V.k(2.2),
      });
      V.bin.lfo(3.1, 0.12, V.t, bed.stopAt, [bed.out.gain]);
      for (let i = 0; i < 8; i++) {
        noiseLayer(V, {
          at: V.t + V.k(V.rng.range(0.05, 1.4)), dur: 0.008, decay: 0.05,
          gain: V.rng.range(0.05, 0.13), filter: 'bandpass', f0: V.rng.range(600, 2600), q: 5,
        });
      }
    },
  },

  // -- hardware -----------------------------------------------------------
  door_blast: {
    desc: 'blast door blown in: metal resonances over a thump',
    opts: OPTS_BASE, send: 0.3, len: () => 1.5,
    build(V) {
      noiseLayer(V, {
        dur: 0.02, decay: V.k(0.5), gain: 0.5,
        filter: 'lowpass', f0: V.hz(3400), f1: V.hz(280), q: 1.2, sweepTime: V.k(0.4),
      });
      toneLayer(V, { type: 'sine', hz: V.hz(115), hzTo: V.hz(34), sweepTime: V.k(0.35), dur: 0.01, decay: V.k(0.6), gain: 0.75 });
      const res = [[380, 12, 0.85], [730, 14, 0.6], [1260, 18, 0.42], [2140, 20, 0.3]];
      for (const [f, q, d] of res) {
        noiseLayer(V, {
          dur: 0.02, decay: V.k(d), gain: 0.22, filter: 'bandpass', f0: V.hz(f), q,
        });
      }
      for (let i = 0; i < 7; i++) {
        noiseLayer(V, {
          at: V.t + V.k(V.rng.range(0.05, 0.8)), dur: 0.007, decay: 0.04,
          gain: V.rng.range(0.05, 0.14), filter: 'bandpass', f0: V.rng.range(1200, 4400), q: 6,
        });
      }
    },
  },

  metal_impact: {
    desc: 'hull clang: inharmonic partials and a dull thud',
    opts: OPTS_BASE, send: 0.22, len: () => 0.85,
    build(V) {
      noiseLayer(V, { dur: 0.008, decay: V.k(0.05), gain: 0.4, filter: 'bandpass', f0: V.hz(3000), q: 1.8 });
      metalRing(V, { hz: V.hz(430), decay: V.k(0.68), gain: 0.34 });
      toneLayer(V, { type: 'sine', hz: V.hz(92), hzTo: V.hz(66), sweepTime: V.k(0.1), dur: 0.008, decay: V.k(0.2), gain: 0.45 });
      noiseLayer(V, { dur: 0.01, decay: V.k(0.22), gain: 0.16, filter: 'bandpass', f0: V.hz(1500), f1: V.hz(700), q: 3 });
    },
  },

  brick_scatter: {
    desc: 'a build coming apart: a shower of plastic clicks',
    opts: OPTS_BASE, send: 0.18, len: () => 1.6,
    build(V) {
      const n = 22;
      for (let i = 0; i < n; i++) {
        // clicks cluster early then thin out
        const u = i / n;
        const t = V.k(0.02 + Math.pow(u, 1.7) * 1.15 + V.rng.range(0, 0.05));
        const level = V.rng.range(0.1, 0.3) * (1 - 0.55 * u);
        noiseLayer(V, {
          at: V.t + t, dur: 0.004, decay: V.rng.range(0.012, 0.035), gain: level,
          filter: 'bandpass', f0: V.hz(V.rng.range(950, 3600)), q: V.rng.range(3, 8),
        });
        toneLayer(V, {
          type: 'triangle', hz: V.hz(V.rng.range(320, 1150)), at: V.t + t,
          dur: 0.003, decay: V.rng.range(0.015, 0.04), gain: level * 0.5, rise: 0.001,
          filter: 'lowpass', f0: V.hz(4200), q: 0.7,
        });
      }
      noiseLayer(V, {
        dur: V.k(0.35), decay: V.k(0.5), gain: 0.14, rise: 0.01,
        filter: 'bandpass', f0: V.hz(240), f1: V.hz(140), q: 1.4,
      });
    },
  },

  console_beep: {
    desc: 'two-note affirmative blip from a control panel',
    opts: OPTS_BASE, send: 0.1, len: () => 0.26,
    build(V) {
      toneLayer(V, {
        type: 'square', hz: V.hz(870), at: V.t, dur: 0.055, decay: 0.02, gain: 0.2,
        rise: 0.004, env: 'gate', fall: 0.02, filter: 'lowpass', f0: V.hz(3800), q: 0.8,
      });
      toneLayer(V, {
        type: 'square', hz: V.hz(1310), at: V.t + V.k(0.085), dur: 0.07, decay: 0.03, gain: 0.2,
        rise: 0.004, env: 'gate', fall: 0.04, filter: 'lowpass', f0: V.hz(4600), q: 0.8,
      });
      toneLayer(V, {
        type: 'sine', hz: V.hz(1740), at: V.t + V.k(0.085), dur: 0.06, decay: 0.03, gain: 0.07,
        rise: 0.004, env: 'gate', fall: 0.04,
      });
    },
  },

  alarm_klaxon: {
    desc: 'two-tone battle-station klaxon',
    opts: 'gain pan duration rate send seed', send: 0.32,
    len: (o) => o.duration ?? 2.5,
    build(V) {
      const period = 0.8 / V.p;
      const cycles = Math.max(1, Math.round(V.dur / period));
      for (let i = 0; i < cycles; i++) {
        const t0 = V.t + i * period;
        const pair = [[V.hz(624), 0.34], [V.hz(468), 0.36]];
        for (let j = 0; j < 2; j++) {
          const [f, len] = pair[j];
          const at = t0 + j * (period * 0.5);
          toneLayer(V, {
            type: 'sawtooth', count: 2, spread: 10, hz: f * 0.97, hzTo: f,
            sweepTime: 0.05, at, dur: len, gain: 0.3, rise: 0.02, env: 'gate', fall: 0.06,
            filter: 'bandpass', f0: f * 1.6, q: 4,
          });
          toneLayer(V, {
            type: 'square', hz: f * 0.5, at, dur: len, gain: 0.08, rise: 0.02,
            env: 'gate', fall: 0.06, filter: 'lowpass', f0: f * 3, q: 1,
          });
        }
      }
    },
  },

  hologram_hum: {
    desc: 'flickering blue holoprojector: unstable tone plus crackle',
    opts: OPTS_SUS, send: 0.26,
    len: (o) => o.duration ?? 2.4,
    build(V) {
      const stop = V.t + V.dur + 0.3;
      const bed = V.bin.gain(0);
      ampEnv(bed.gain, V.t, { a: 0.08, d: 0.05, s: 1, r: 0.22, peak: 0.3 * V.gain, dur: V.dur });
      bed.connect(V.out);
      const flick = V.bin.gain(1);
      jitter(flick.gain, V.t, V.dur, 0.075, 0.45, 1.0, V.rng);
      flick.connect(bed);
      const lp = V.bin.filter('lowpass', V.hz(3200), 0.9);
      lp.connect(flick);
      for (const [hz, g, type] of [[V.hz(338), 0.5, 'triangle'], [V.hz(509), 0.32, 'sine'], [V.hz(1017), 0.1, 'sine']]) {
        const o = V.bin.osc(type, hz, V.t, stop);
        V.bin.lfo(0.7, hz * 0.004, V.t, stop, [o.frequency]);
        const g2 = V.bin.gain(g);
        o.connect(g2); g2.connect(lp);
      }
      const trem = V.bin.gain(1);
      V.bin.lfo(8.4, 0.3, V.t, stop, [trem.gain]);
      trem.connect(lp);
      const air = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const abp = V.bin.filter('bandpass', V.hz(1100), 1.2);
      const ag = V.bin.gain(0.05);
      air.connect(abp); abp.connect(ag); ag.connect(trem);
      for (let t = 0.05; t < V.dur; t += V.rng.range(0.1, 0.45)) {
        noiseLayer(V, {
          at: V.t + t, dur: 0.004, decay: V.rng.range(0.008, 0.03),
          gain: V.rng.range(0.03, 0.1) * V.gain, filter: 'bandpass', f0: V.rng.range(1800, 5200), q: 4,
        });
      }
    },
  },

  // -- ships --------------------------------------------------------------
  engine_rumble: {
    desc: 'sustained sublight engine bed',
    opts: OPTS_SUS, send: 0.16,
    len: (o) => o.duration ?? 4,
    build(V) {
      const stop = V.t + V.dur + 0.6;
      const out = V.bin.gain(0);
      ampEnv(out.gain, V.t, { a: 0.5, d: 0.1, s: 1, r: 0.8, peak: 0.85 * V.gain, dur: V.dur });
      out.connect(V.out);
      const wob = V.bin.gain(1);
      V.bin.lfo(0.13, 0.16, V.t, stop, [wob.gain]);
      jitter(wob.gain, V.t, V.dur, 0.55, 0.82, 1.0, V.rng);
      wob.connect(out);

      const bed = V.bin.buf(V.audio.noise('brown', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const lp = V.bin.filter('lowpass', V.hz(180), 1.1);
      const bg = V.bin.gain(0.85);
      bed.connect(lp); lp.connect(bg); bg.connect(wob);

      const thud = V.bin.buf(V.audio.noise('brown', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const bp = V.bin.filter('bandpass', V.hz(58), 2.4);
      const tg = V.bin.gain(1.1);
      thud.connect(bp); bp.connect(tg); tg.connect(wob);

      for (const [hz, g] of [[V.hz(43), 0.16], [V.hz(64.5), 0.1], [V.hz(86), 0.05]]) {
        const o = V.bin.osc('sawtooth', hz, V.t, stop, 0);
        V.bin.lfo(0.21, 1.2, V.t, stop, [o.frequency]);
        const lg = V.bin.filter('lowpass', V.hz(240), 0.8);
        const gg = V.bin.gain(g);
        o.connect(lg); lg.connect(gg); gg.connect(wob);
      }
      const turb = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const tbp = V.bin.filter('bandpass', V.hz(430), 1.6);
      const tbg = V.bin.gain(0.06);
      turb.connect(tbp); tbp.connect(tbg); tbg.connect(wob);
    },
  },

  engine_whoosh: {
    desc: 'ship passing the camera, with a doppler sweep and a pan across',
    opts: OPTS_SUS, send: 0.26,
    len: (o) => (o.duration ?? 1.8) / (o.rate ?? 1),
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.4;
      // pan across the frame; opts.pan biases the centre
      const p = V.panParam;
      const side = V.opts.reverse ? -1 : 1;
      p.setValueAtTime(clamp(V.panBase - side * 0.85, -1, 1), V.t);
      p.linearRampToValueAtTime(clamp(V.panBase + side * 0.85, -1, 1), V.t + d);
      const air = noiseLayer(V, {
        type: 'pink', dur: d * 0.98, decay: 0.3, gain: 0.6, rise: d * 0.42, fall: d * 0.5,
        env: 'swell', filter: 'bandpass', f0: V.hz(620), f1: V.hz(2400), q: 1.3, sweepTime: d * 0.45,
      });
      // second half of the doppler: the band falls away again
      air.node.frequency.setValueAtTime(V.hz(2400), V.t + d * 0.45);
      air.node.frequency.exponentialRampToValueAtTime(V.hz(360), V.t + d);
      toneLayer(V, {
        type: 'sawtooth', count: 3, spread: 12, hz: V.hz(170), hz2: V.hz(268), hzTo: V.hz(104),
        sweepTime: d, mid: 0.45, dur: d * 0.95, gain: 0.34, rise: d * 0.4, env: 'swell', fall: d * 0.55,
        filter: 'lowpass', f0: V.hz(900), f1: V.hz(2200), q: 1.4, sweepTime2: d * 0.45,
      });
      noiseLayer(V, {
        type: 'brown', dur: d * 0.9, decay: 0.3, gain: 0.4, rise: d * 0.45, fall: d * 0.45,
        env: 'swell', filter: 'lowpass', f0: V.hz(140), f1: V.hz(90), q: 1.5, sweepTime: d,
      });
      return stop;
    },
  },

  tie_scream: {
    desc: 'TIE fighter: a descending resonant shriek',
    opts: OPTS_SUS, send: 0.3,
    len: (o) => (o.duration ?? 1.9) / (o.rate ?? 1),
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.5;
      if (V.opts.pass) {
        const p = V.panParam;
        p.setValueAtTime(clamp(V.panBase - 0.8, -1, 1), V.t);
        p.linearRampToValueAtTime(clamp(V.panBase + 0.8, -1, 1), V.t + d);
      }
      // the cry: a saw stack falling more than two octaves
      const body = V.bin.gain(0);
      swellEnv(body.gain, V.t, 0.5 * V.gain, d * 0.12, d * 0.42, d * 0.48);
      body.connect(V.out);
      const res1 = V.bin.filter('bandpass', V.hz(2400), 13);
      const res2 = V.bin.filter('bandpass', V.hz(4200), 18);
      const g1 = V.bin.gain(1), g2 = V.bin.gain(0.42);
      res1.connect(g1); g1.connect(body);
      res2.connect(g2); g2.connect(body);
      sweep(res1.frequency, V.t, V.hz(2500), V.hz(430), d * 0.92);
      sweep(res2.frequency, V.t, V.hz(4400), V.hz(760), d * 0.92);
      for (let i = 0; i < 3; i++) {
        const o = V.bin.osc('sawtooth', V.hz(1050), V.t, stop, (i - 1) * 11);
        sweep(o.frequency, V.t, V.hz(1050), V.hz(172), d * 0.92);
        V.bin.lfo(5.8 + i * 0.7, 26, V.t, stop, [o.detune]);
        o.connect(res1); o.connect(res2);
      }
      // air rushing through the same resonance
      const air = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const abp = V.bin.filter('bandpass', V.hz(2600), 7);
      sweep(abp.frequency, V.t, V.hz(2800), V.hz(520), d * 0.92);
      const ag = V.bin.gain(0.5);
      air.connect(abp); abp.connect(ag); ag.connect(body);
      // sub layer so it has weight as it goes by
      toneLayer(V, {
        type: 'sine', hz: V.hz(150), hzTo: V.hz(52), sweepTime: d * 0.9,
        dur: d * 0.8, gain: 0.2, rise: d * 0.15, env: 'swell', fall: d * 0.5,
      });
    },
  },

  hyperspace_jump: {
    desc: 'jump to lightspeed: rising whine, punch, and away',
    opts: OPTS_BASE, send: 0.4, len: () => 2.9,
    build(V) {
      const k = V.k(1);
      const punch = V.t + 1.25 * k;
      // spool up
      toneLayer(V, {
        type: 'sawtooth', count: 3, spread: 16, hz: V.hz(110), hzTo: V.hz(2300),
        sweepTime: 1.25 * k, dur: 1.2 * k, gain: 0.3, rise: 0.5 * k, env: 'swell', fall: 0.1 * k,
        filter: 'lowpass', f0: V.hz(600), f1: V.hz(5200), q: 3, sweepExp: true,
      });
      noiseLayer(V, {
        type: 'pink', dur: 1.22 * k, decay: 0.1, gain: 0.42, rise: 0.75 * k, fall: 0.08 * k,
        env: 'swell', filter: 'bandpass', f0: V.hz(420), f1: V.hz(3400), q: 1.6, sweepTime: 1.25 * k,
      });
      // the punch
      noiseLayer(V, { at: punch, dur: 0.02, decay: 0.22 * k, gain: 0.5, filter: 'highpass', f0: V.hz(1800) });
      toneLayer(V, { at: punch, type: 'sine', hz: V.hz(150), hzTo: V.hz(34), sweepTime: 0.5 * k, dur: 0.01, decay: 1.0 * k, gain: 0.9 });
      // and away: the band races down and thins to nothing
      noiseLayer(V, {
        at: punch, type: 'white', dur: 0.05, decay: 1.3 * k, gain: 0.5,
        filter: 'bandpass', f0: V.hz(4200), f1: V.hz(170), q: 2.4, sweepTime: 1.2 * k,
      });
      toneLayer(V, {
        at: punch + 0.02 * k, type: 'sawtooth', count: 2, spread: 20, hz: V.hz(2600), hzTo: V.hz(220),
        sweepTime: 1.1 * k, dur: 0.02, decay: 1.2 * k, gain: 0.24,
        filter: 'bandpass', f0: V.hz(3000), f1: V.hz(400), q: 5, sweepTime2: 1.1 * k,
      });
      toneLayer(V, {
        at: punch + 0.05 * k, type: 'sine', hz: V.hz(3200), hzTo: V.hz(900),
        sweepTime: 1.4 * k, dur: 0.02, decay: 1.5 * k, gain: 0.1,
      });
    },
  },

  pod_launch: {
    desc: 'escape pod / podracer launch: thrust builds and tears away',
    opts: OPTS_BASE, send: 0.3, len: () => 2.8,
    build(V) {
      const k = V.k(1);
      const go = V.t + 1.15 * k;
      noiseLayer(V, {
        type: 'brown', dur: 1.15 * k, decay: 0.1, gain: 0.55, rise: 0.9 * k, fall: 0.1 * k,
        env: 'swell', filter: 'lowpass', f0: V.hz(180), f1: V.hz(1500), q: 1.4, sweepTime: 1.15 * k,
      });
      toneLayer(V, {
        type: 'sawtooth', count: 3, spread: 18, hz: V.hz(52), hzTo: V.hz(184),
        sweepTime: 1.15 * k, dur: 1.1 * k, gain: 0.3, rise: 0.85 * k, env: 'swell', fall: 0.1 * k,
        filter: 'lowpass', f0: V.hz(340), f1: V.hz(1400), q: 2.2,
      });
      toneLayer(V, { at: go, type: 'sine', hz: V.hz(92), hzTo: V.hz(38), sweepTime: 0.7 * k, dur: 0.01, decay: 1.1 * k, gain: 0.8 });
      noiseLayer(V, { at: go, dur: 0.02, decay: 0.3 * k, gain: 0.45, filter: 'highpass', f0: V.hz(1600) });
      noiseLayer(V, {
        at: go, type: 'pink', dur: 0.1, decay: 1.5 * k, gain: 0.55,
        filter: 'bandpass', f0: V.hz(1900), f1: V.hz(220), q: 1.5, sweepTime: 1.4 * k,
      });
      noiseLayer(V, {
        at: go, type: 'brown', dur: 0.9 * k, decay: 1.4 * k, gain: 0.4, rise: 0.05,
        filter: 'lowpass', f0: V.hz(260), f1: V.hz(80), q: 1.6, sweepTime: 1.5 * k,
      });
    },
  },

  // -- characters ---------------------------------------------------------
  vader_breath: {
    desc: 'the respirator: one inhale/exhale cycle',
    opts: OPTS_SUS, send: 0.3,
    len: (o) => (o.duration ?? 4.2) * (o.cycles ?? 1),
    build(V) {
      const cycles = V.opts.cycles ?? 1;
      const period = V.dur / cycles;
      for (let c = 0; c < cycles; c++) {
        const t0 = V.t + c * period;
        const inLen = period * 0.34;
        const exLen = period * 0.42;
        const exAt = t0 + period * 0.44;
        // inhale — the band climbs as the mask draws in
        const inh = noiseLayer(V, {
          at: t0, type: 'white', dur: inLen, gain: 0.5, rise: inLen * 0.45, fall: inLen * 0.5,
          env: 'swell', filter: 'bandpass', f0: V.hz(300), f1: V.hz(560), q: 3.4, sweepTime: inLen,
        });
        const inh2 = noiseLayer(V, {
          at: t0, type: 'white', dur: inLen, gain: 0.16, rise: inLen * 0.5, fall: inLen * 0.45,
          env: 'swell', filter: 'bandpass', f0: V.hz(880), f1: V.hz(1250), q: 7, sweepTime: inLen,
        });
        // exhale — lower, longer, darker
        noiseLayer(V, {
          at: exAt, type: 'white', dur: exLen, gain: 0.56, rise: exLen * 0.3, fall: exLen * 0.6,
          env: 'swell', filter: 'bandpass', f0: V.hz(470), f1: V.hz(210), q: 3.0, sweepTime: exLen,
        });
        noiseLayer(V, {
          at: exAt, type: 'white', dur: exLen, gain: 0.12, rise: exLen * 0.35, fall: exLen * 0.55,
          env: 'swell', filter: 'bandpass', f0: V.hz(1350), f1: V.hz(760), q: 8, sweepTime: exLen,
        });
        // the regulator's resonant body under both halves
        toneLayer(V, {
          at: t0, type: 'sine', hz: V.hz(72), dur: inLen, gain: 0.16,
          rise: inLen * 0.4, env: 'swell', fall: inLen * 0.5,
        });
        toneLayer(V, {
          at: exAt, type: 'sine', hz: V.hz(58), dur: exLen, gain: 0.2,
          rise: exLen * 0.3, env: 'swell', fall: exLen * 0.6,
        });
        void inh; void inh2;
      }
    },
  },

  r2_beep: {
    desc: 'astromech FM whistle; opts.mood = happy | worried | alarm | chirp',
    opts: 'gain pan rate send seed mood', send: 0.2,
    len: (o) => R2_LEN[o.mood || 'happy'] / (o.rate ?? 1),
    build(V) {
      const segs = R2_SEGS[V.opts.mood || 'happy'];
      const stop = V.t + V.dur + 0.15;
      const amp = V.bin.gain(0);
      const lp = V.bin.filter('lowpass', V.hz(6500), 0.8);
      lp.connect(amp);
      amp.connect(V.out);
      const car = V.bin.osc('sine', V.hz(segs[0].f0), V.t, stop);
      const bright = V.bin.osc('triangle', V.hz(segs[0].f0 * 2), V.t, stop);
      const bg = V.bin.gain(0.12);
      car.connect(lp); bright.connect(bg); bg.connect(lp);
      // FM: one modulator, its depth automated per segment
      const mod = V.bin.osc('sine', V.hz(segs[0].f0 * (segs[0].ratio ?? 4)), V.t, stop);
      const modDepth = V.bin.gain(0);
      mod.connect(modDepth);
      modDepth.connect(car.frequency);
      const vib = V.bin.osc('sine', segs[0].vibRate ?? 9, V.t, stop);
      const vibDepth = V.bin.gain(0);
      vib.connect(vibDepth);
      vibDepth.connect(car.detune);
      vibDepth.connect(bright.detune);

      let t = V.t;
      for (const s of segs) {
        const len = V.k(s.dur);
        const f0 = V.hz(s.f0), f1 = V.hz(s.f1 ?? s.f0);
        car.frequency.setValueAtTime(f0, t);
        bright.frequency.setValueAtTime(f0 * 2, t);
        mod.frequency.setValueAtTime(f0 * (s.ratio ?? 4), t);
        if (s.f1 != null) {
          car.frequency.exponentialRampToValueAtTime(f1, t + len);
          bright.frequency.exponentialRampToValueAtTime(f1 * 2, t + len);
          mod.frequency.exponentialRampToValueAtTime(f1 * (s.ratio ?? 4), t + len);
        }
        modDepth.gain.setValueAtTime(f0 * (s.index ?? 0.35), t);
        modDepth.gain.linearRampToValueAtTime(f1 * (s.index2 ?? s.index ?? 0.35), t + len);
        vibDepth.gain.setValueAtTime(s.vib ?? 20, t);
        vib.frequency.setValueAtTime(s.vibRate ?? 9, t);
        // per-segment amplitude: soft attack, small gap after
        const a = Math.min(0.02, len * 0.25);
        amp.gain.setValueAtTime(FLOOR, t);
        amp.gain.exponentialRampToValueAtTime(0.3 * (s.gain ?? 1) * V.gain, t + a);
        amp.gain.setValueAtTime(0.3 * (s.gain ?? 1) * V.gain, t + len - a * 1.2);
        amp.gain.exponentialRampToValueAtTime(FLOOR, t + len);
        t += len + V.k(s.gap ?? 0.02);
      }
    },
  },

  c3po_servo: {
    desc: 'protocol droid joint: a small whining motor',
    opts: OPTS_SUS, send: 0.16,
    len: (o) => (o.duration ?? 0.62) / (o.rate ?? 1),
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.2;
      const out = V.bin.gain(0);
      ampEnv(out.gain, V.t, { a: 0.03, d: 0.04, s: 0.9, r: 0.1, peak: 0.42 * V.gain, dur: d * 0.88 });
      out.connect(V.out);
      const bp = V.bin.filter('bandpass', V.hz(900), 4);
      const lp = V.bin.filter('lowpass', V.hz(2400), 0.9);
      bp.connect(lp); lp.connect(out);
      const o1 = V.bin.osc('sawtooth', V.hz(88), V.t, stop);
      sweep(o1.frequency, V.t, V.hz(78), V.hz(96), d * 0.8, false);
      V.bin.lfo(31, 7, V.t, stop, [o1.frequency]);
      const g1 = V.bin.gain(0.6);
      o1.connect(g1); g1.connect(bp);
      const o2 = V.bin.osc('square', V.hz(176), V.t, stop);
      const g2 = V.bin.gain(0.12);
      o2.connect(g2); g2.connect(bp);
      const whir = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const wbp = V.bin.filter('bandpass', V.hz(1700), 2.2);
      sweep(wbp.frequency, V.t, V.hz(1500), V.hz(2100), d * 0.8, false);
      const wg = V.bin.gain(0.16);
      whir.connect(wbp); wbp.connect(wg); wg.connect(out);
      noiseLayer(V, { at: V.t + d * 0.9, dur: 0.005, decay: 0.03, gain: 0.12, filter: 'bandpass', f0: V.hz(2600), q: 5 });
    },
  },

  // -- sabers -------------------------------------------------------------
  saber_ignite: {
    desc: 'the snap-hiss: blade extends and settles into a hum',
    opts: OPTS_BASE, send: 0.28, len: () => 1.05,
    build(V) {
      const k = V.k(1);
      noiseLayer(V, { dur: 0.02, decay: 0.09 * k, gain: 0.4, filter: 'highpass', f0: V.hz(2600) });
      noiseLayer(V, {
        type: 'pink', dur: 0.3 * k, decay: 0.25 * k, gain: 0.45, rise: 0.02,
        filter: 'bandpass', f0: V.hz(420), f1: V.hz(1500), q: 1.6, sweepTime: 0.28 * k,
      });
      toneLayer(V, {
        type: 'sawtooth', count: 2, spread: 12, hz: V.hz(62), hzTo: V.hz(112),
        sweepTime: 0.16 * k, dur: 0.1 * k, gain: 0.32, rise: 0.012,
        env: 'gate', fall: 0.1 * k, filter: 'lowpass', f0: V.hz(700), f1: V.hz(1600), q: 3,
      });
      // settle into the steady hum
      const stop = V.t + 1.0 * k;
      const hum = V.bin.gain(0);
      ampEnv(hum.gain, V.t + 0.09 * k, { a: 0.1 * k, d: 0.15 * k, s: 0.75, r: 0.3 * k, peak: 0.3 * V.gain, dur: 0.6 * k });
      hum.connect(V.out);
      for (const [hz, g, type] of [[108, 0.6, 'sine'], [162, 0.3, 'sine'], [216, 0.12, 'triangle']]) {
        const o = V.bin.osc(type, V.hz(hz), V.t + 0.08 * k, stop);
        V.bin.lfo(5.4, hz * 0.012, V.t + 0.08 * k, stop, [o.frequency]);
        const gg = V.bin.gain(g);
        o.connect(gg); gg.connect(hum);
      }
    },
  },

  saber_hum: {
    desc: 'sustained blade hum',
    opts: OPTS_SUS, send: 0.22,
    len: (o) => o.duration ?? 3,
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.4;
      const out = V.bin.gain(0);
      ampEnv(out.gain, V.t, { a: 0.12, d: 0.08, s: 1, r: 0.25, peak: 0.45 * V.gain, dur: d });
      out.connect(V.out);
      const trem = V.bin.gain(1);
      V.bin.lfo(7.6, 0.13, V.t, stop, [trem.gain]);
      V.bin.lfo(0.9, 0.06, V.t, stop, [trem.gain]);
      trem.connect(out);
      const lp = V.bin.filter('lowpass', V.hz(2600), 1.1);
      lp.connect(trem);
      for (const [hz, g, type] of [[108, 0.6, 'sine'], [162.5, 0.34, 'sine'], [217, 0.14, 'triangle'], [54, 0.2, 'sine']]) {
        const o = V.bin.osc(type, V.hz(hz), V.t, stop);
        V.bin.lfo(5.3 + hz * 0.004, hz * 0.014, V.t, stop, [o.frequency]);
        const gg = V.bin.gain(g);
        o.connect(gg); gg.connect(lp);
      }
      const air = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const abp = V.bin.filter('bandpass', V.hz(1250), 2.2);
      const ag = V.bin.gain(0.05);
      air.connect(abp); abp.connect(ag); ag.connect(trem);
    },
  },

  saber_swing: {
    desc: 'blade cutting the air: the hum doppler-shifts past',
    opts: OPTS_SUS, send: 0.3,
    len: (o) => (o.duration ?? 0.62) / (o.rate ?? 1),
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.25;
      const p = V.panParam;
      p.setValueAtTime(clamp(V.panBase - 0.55, -1, 1), V.t);
      p.linearRampToValueAtTime(clamp(V.panBase + 0.55, -1, 1), V.t + d);
      const out = V.bin.gain(0);
      swellEnv(out.gain, V.t, 0.5 * V.gain, d * 0.42, d * 0.05, d * 0.55);
      out.connect(V.out);
      const lp = V.bin.filter('lowpass', V.hz(3000), 1.2);
      lp.connect(out);
      for (const [hz, g, type] of [[108, 0.6, 'sine'], [162, 0.32, 'sine'], [216, 0.12, 'triangle']]) {
        const o = V.bin.osc(type, V.hz(hz), V.t, stop);
        o.frequency.setValueAtTime(V.hz(hz * 0.92), V.t);
        o.frequency.exponentialRampToValueAtTime(V.hz(hz * 1.62), V.t + d * 0.45);
        o.frequency.exponentialRampToValueAtTime(V.hz(hz * 0.88), V.t + d);
        const gg = V.bin.gain(g);
        o.connect(gg); gg.connect(lp);
      }
      noiseLayer(V, {
        type: 'pink', dur: d * 0.95, decay: 0.1, gain: 0.3, rise: d * 0.45, fall: d * 0.5,
        env: 'swell', filter: 'bandpass', f0: V.hz(700), f1: V.hz(2500), q: 1.8, sweepTime: d * 0.45,
      });
    },
  },

  // -- atmosphere ---------------------------------------------------------
  wind: {
    desc: 'sustained desert wind with gusts',
    opts: OPTS_SUS, send: 0.2,
    len: (o) => o.duration ?? 6,
    build(V) {
      const d = V.dur;
      const stop = V.t + d + 0.8;
      const out = V.bin.gain(0);
      ampEnv(out.gain, V.t, { a: Math.min(1.2, d * 0.15), d: 0.1, s: 1, r: Math.min(1.5, d * 0.2), peak: 0.6 * V.gain, dur: d });
      out.connect(V.out);
      const gust = V.bin.gain(0.7);
      jitter(gust.gain, V.t, d, 0.7, 0.35, 1.0, V.rng);
      V.bin.lfo(0.09, 0.18, V.t, stop, [gust.gain]);
      gust.connect(out);

      const bed = V.bin.buf(V.audio.noise('pink', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const bp = V.bin.filter('bandpass', V.hz(520), 1.1);
      V.bin.lfo(0.071, V.hz(240), V.t, stop, [bp.frequency]);
      const bg = V.bin.gain(1.0);
      bed.connect(bp); bp.connect(bg); bg.connect(gust);

      const low = V.bin.buf(V.audio.noise('brown', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const llp = V.bin.filter('lowpass', V.hz(260), 0.9);
      const lg = V.bin.gain(0.5);
      low.connect(llp); llp.connect(lg); lg.connect(gust);

      // a thin whistle over the top, drifting
      const wh = V.bin.buf(V.audio.noise('white', 8, 'sfx'), V.t, stop, { offset: V.rng.range(0, 7) });
      const wbp = V.bin.filter('bandpass', V.hz(1850), 9);
      jitter(wbp.frequency, V.t, d, 1.3, V.hz(1350), V.hz(2600), V.rng);
      const wg = V.bin.gain(0.3);
      wh.connect(wbp); wbp.connect(wg); wg.connect(gust);
    },
  },
};

/** Mood tables for r2_beep. */
const R2_SEGS = {
  happy: [
    { f0: 520, f1: 690, dur: 0.13, index: 0.3, vib: 25, vibRate: 11, gap: 0.02 },
    { f0: 780, f1: 940, dur: 0.12, index: 0.4, vib: 35, vibRate: 13, gap: 0.02 },
    { f0: 1180, f1: 1080, dur: 0.1, index: 0.5, vib: 30, vibRate: 12, gap: 0.03 },
    { f0: 1420, f1: 1720, dur: 0.16, index: 0.35, vib: 45, vibRate: 14, gap: 0 },
  ],
  worried: [
    { f0: 880, f1: 640, dur: 0.24, index: 0.45, vib: 55, vibRate: 7.5, gap: 0.05 },
    { f0: 700, f1: 430, dur: 0.3, index: 0.55, vib: 70, vibRate: 6.2, gap: 0.04 },
    { f0: 470, f1: 360, dur: 0.22, index: 0.6, vib: 60, vibRate: 5.4, gap: 0 },
  ],
  alarm: [
    { f0: 1250, f1: 900, dur: 0.11, index: 0.6, vib: 80, vibRate: 18, gap: 0.015 },
    { f0: 1250, f1: 900, dur: 0.11, index: 0.6, vib: 80, vibRate: 18, gap: 0.015 },
    { f0: 1400, f1: 1000, dur: 0.11, index: 0.7, vib: 90, vibRate: 20, gap: 0.015 },
    { f0: 1400, f1: 1000, dur: 0.11, index: 0.7, vib: 90, vibRate: 20, gap: 0.015 },
    { f0: 1600, f1: 1150, dur: 0.12, index: 0.8, vib: 110, vibRate: 22, gap: 0.015 },
    { f0: 1750, f1: 1250, dur: 0.14, index: 0.9, vib: 120, vibRate: 24, gap: 0 },
  ],
  chirp: [
    { f0: 1050, f1: 1560, dur: 0.14, index: 0.3, vib: 30, vibRate: 15, gap: 0 },
  ],
};

const R2_LEN = {};
for (const [k, segs] of Object.entries(R2_SEGS)) {
  R2_LEN[k] = segs.reduce((s, x) => s + x.dur + (x.gap ?? 0.02), 0) + 0.1;
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/** Every available effect name. */
export const SFX = Object.keys(REG);

/** { name: { duration, opts, desc } } — what the film can ask for. */
export const SFX_INFO = Object.fromEntries(
  SFX.map((n) => [n, { duration: +REG[n].len({}).toFixed(3), opts: REG[n].opts, desc: REG[n].desc }]),
);

/** Length in seconds of `name` under `opts`, without needing a context. */
export function sfxDuration(name, opts = {}) {
  const def = REG[name];
  if (!def) return 0;
  return def.len(opts);
}

/**
 * Schedule one effect.
 *
 * @param {object} audio    engine handle from createAudioEngine
 * @param {string} name     one of SFX
 * @param {number} when     absolute AudioContext time
 * @param {object} [opts]   { gain, pan, duration, rate, send, seed, ... }
 * @returns {number} the effect's length in seconds
 */
export function playSfx(audio, name, when = 0, opts = {}) {
  const def = REG[name];
  if (!def) throw new Error(`unknown sfx "${name}" (have: ${SFX.join(', ')})`);
  const dur = def.len(opts);
  const rate = opts.rate ?? 1;
  const bin = makeBin(audio);
  const strip = channelStrip(audio, audio.sfx, {
    level: 1, pan: opts.pan ?? 0, send: opts.send ?? def.send ?? 0.2, bus: 'sfx',
  });
  for (const n of strip.nodes) bin.keep(n);

  const V = {
    audio,
    ctx: audio.ctx,
    bin,
    out: strip.input,
    strip,
    panParam: strip.panner.pan,
    panBase: opts.pan ?? 0,
    t: when,
    dur,
    opts,
    gain: opts.gain ?? 1,
    p: rate,
    rng: makeRng(`sfx:${name}:${Math.round(when * 1000)}:${opts.seed ?? ''}`),
    /** time offsets scale with 1/rate */
    k: (s) => s / rate,
    /** frequencies scale with rate */
    hz: (f) => f * rate,
  };
  def.build(V);
  return dur;
}
