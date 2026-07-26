import { randRange, randInt } from '../core/rand.js';

const EPS = 1e-4;
const pos = (v) => (v > EPS ? v : EPS);

/**
 * Handle for a spawned sound. stop() kills every scheduled source in the
 * voice (used to cancel reload choreography on weapon switch / death).
 */
export class Voice {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.sources = [];
    this.ended = false;
  }
  stop() {
    if (this.ended) return;
    this.ended = true;
    const now = this.ctx.currentTime;
    try {
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setTargetAtTime(0, now, 0.012);
    } catch { /* context torn down */ }
    for (const s of this.sources) {
      try { s.stop(now + 0.06); } catch { /* already stopped */ }
    }
  }
}

/**
 * Per-spawn layer builder. Each recipe paints layers with p.n() (noise) and
 * p.o() (oscillator). Every source is started AND stopped on the audio clock;
 * `at` offsets give sample-accurate sequencing without setTimeout.
 *
 * Layer params:
 *   at    start offset (s) relative to voice start
 *   dur   audible length (source stops at at+dur+0.06)
 *   a/g/d attack / peak gain / exp decay  (or gPts: [[t,gain],...])
 *   type/f/q  biquad filter; f1+fT sweeps freq, or fPts: [[t,hz],...]
 *   buf   'white' (default) | 'brown'
 *   sat   route through tanh waveshaper (adds harmonics / weight)
 *   pan   number or [[t,pan],...] (StereoPanner, linear ramps)
 *   rate  extra playbackRate multiplier for noise
 */
class Patch {
  constructor(kit, out, t0, opts, voice) {
    this.kit = kit;
    this.ctx = kit.ctx;
    this.out = out;
    this.t0 = t0;
    this.rate = opts.rate ?? 1;
    this.voice = voice;
  }

  _ramp(param, t0, pts, { lin = false, mul = 1 } = {}) {
    const v0 = pts[0][1] * mul;
    param.setValueAtTime(lin ? v0 : pos(v0), t0 + pts[0][0]);
    for (let i = 1; i < pts.length; i++) {
      const t = t0 + pts[i][0];
      const v = pts[i][1] * mul;
      if (lin) param.linearRampToValueAtTime(v, t);
      else param.exponentialRampToValueAtTime(pos(v), t);
    }
  }

  /** Standard exp envelope (or arbitrary gPts). Returns envelope length. */
  _env(g, t, p) {
    if (p.gPts) {
      this._ramp(g.gain, t, p.gPts);
      return p.gPts[p.gPts.length - 1][0];
    }
    const a = p.a ?? 0.002, d = p.d ?? 0.1;
    g.gain.setValueAtTime(EPS, t);
    g.gain.exponentialRampToValueAtTime(pos(p.g ?? 0.3), t + a);
    g.gain.exponentialRampToValueAtTime(pos(p.end ?? EPS), t + a + d);
    return a + d;
  }

  _freq(param, t, p) {
    if (p.fPts) this._ramp(param, t, p.fPts, { mul: this.rate });
    else if (p.f1 != null) this._ramp(param, t, [[0, p.f], [p.fT ?? 0.1, p.f1]], { mul: this.rate });
    else param.value = (p.f ?? 800) * this.rate;
  }

  /** Shared back half of a layer: [sat] -> gain env -> [pan] -> out. */
  _tail(node, t, p) {
    if (p.sat) {
      const ws = this.ctx.createWaveShaper();
      ws.curve = this.kit.satCurve;
      node.connect(ws);
      node = ws;
    }
    const g = this.ctx.createGain();
    const envDur = this._env(g, t, p);
    node.connect(g);
    node = g;
    if (p.pan !== undefined) {
      const sp = this.ctx.createStereoPanner();
      if (typeof p.pan === 'number') sp.pan.value = p.pan;
      else this._ramp(sp.pan, t, p.pan, { lin: true });
      node.connect(sp);
      node = sp;
    }
    node.connect(this.out);
    return (p.dur ?? envDur) + 0.06;
  }

  /** Filtered noise layer. */
  n(p) {
    const t = this.t0 + (p.at ?? 0);
    const src = this.ctx.createBufferSource();
    const buf = p.buf === 'brown' ? this.kit.brown : this.kit.white;
    src.buffer = buf;
    src.loop = true;                       // long tails never run off the end
    src.playbackRate.value = (p.rate ?? 1) * this.rate;
    let node = src;
    if (p.type) {
      const f = this.ctx.createBiquadFilter();
      f.type = p.type;
      f.Q.value = p.q ?? 0.7;
      this._freq(f.frequency, t, p);
      node.connect(f);
      node = f;
    }
    const dur = this._tail(node, t, p);
    src.start(t, randRange(0, buf.duration * 0.9)); // decorrelate repeats
    src.stop(t + dur);
    this.voice.sources.push(src);
  }

  /** Oscillator layer. */
  o(p) {
    const t = this.t0 + (p.at ?? 0);
    const o = this.ctx.createOscillator();
    o.type = p.type ?? 'sine';
    if (p.detune) o.detune.value = p.detune;
    this._freq(o.frequency, t, p);
    const dur = this._tail(o, t, p);
    o.start(t);
    o.stop(t + dur);
    this.voice.sources.push(o);
  }
}

/* ========================================================================== *
 *  SOUND RECIPES — (p: Patch, o: spawn opts)
 *  Layer gains per sound are budgeted so a voice peaks ~<= 1.0 at volume 1.
 * ========================================================================== */
const RECIPES = {
  /* ---- gunshots ---------------------------------------------------------- */
  shot_rifle(p) {
    const v = () => randRange(0.86, 1.14);
    // mechanical click-attack (2-4ms)
    p.n({ dur: 0.012, type: 'highpass', f: 3200, q: 0.7, a: 0.0008, g: 0.28 * v(), d: 0.006 });
    // body: punchy bandpassed burst
    p.n({ dur: 0.22, type: 'bandpass', f: randRange(390, 470), q: 0.55, a: 0.0015, g: 0.6 * v(), d: 0.078 });
    p.n({ dur: 0.18, type: 'lowpass', f: 250, q: 0.6, a: 0.002, g: 0.34 * v(), d: 0.06 });
    // supersonic crack
    p.n({ dur: 0.055, type: 'bandpass', f: 3700, q: 0.6, a: 0.0008, g: 0.33 * v(), d: 0.02 });
    // sub thump, saturated for weight on small speakers
    p.o({ type: 'sine', f: 88, f1: 50, fT: 0.06, dur: 0.15, a: 0.004, g: 0.5 * v(), d: 0.085, sat: true });
    // bolt cycling tick
    p.n({ at: 0.055, dur: 0.02, type: 'highpass', f: 4200, q: 0.6, a: 0.001, g: 0.05, d: 0.01 });
    // urban reflection tail: discrete slaps + street wash (the "COD" part)
    p.n({ at: 0.078, dur: 0.13, type: 'lowpass', f: 1600, q: 0.5, a: 0.004, g: 0.08 * v(), d: 0.07 });
    p.n({ at: 0.142, dur: 0.15, type: 'lowpass', f: 1000, q: 0.5, a: 0.005, g: 0.05 * v(), d: 0.09 });
    p.n({ at: 0.23, dur: 0.19, type: 'lowpass', f: 640, q: 0.5, a: 0.006, g: 0.028 * v(), d: 0.12 });
    p.n({ at: 0.03, dur: 0.42, type: 'lowpass', f: 880, q: 0.4, a: 0.02, g: 0.05 * v(), d: 0.3 });
  },

  shot_pistol(p) {
    const v = () => randRange(0.86, 1.14);
    p.n({ dur: 0.01, type: 'highpass', f: 3600, q: 0.7, a: 0.0008, g: 0.3 * v(), d: 0.005 });
    p.n({ dur: 0.16, type: 'bandpass', f: randRange(640, 740), q: 0.6, a: 0.0012, g: 0.5 * v(), d: 0.05 });
    p.n({ dur: 0.05, type: 'bandpass', f: 4500, q: 0.6, a: 0.0008, g: 0.4 * v(), d: 0.016 });
    p.o({ type: 'sine', f: 112, f1: 62, fT: 0.045, dur: 0.11, a: 0.003, g: 0.36 * v(), d: 0.06, sat: true });
    // slide cycling chick-chick
    p.n({ at: 0.04, dur: 0.02, type: 'bandpass', f: 2400, q: 1.5, a: 0.001, g: 0.1, d: 0.012 });
    p.n({ at: 0.075, dur: 0.02, type: 'bandpass', f: 1800, q: 1.5, a: 0.001, g: 0.07, d: 0.012 });
    // short bright tail
    p.n({ at: 0.07, dur: 0.11, type: 'lowpass', f: 1400, q: 0.5, a: 0.004, g: 0.055 * v(), d: 0.06 });
    p.n({ at: 0.13, dur: 0.13, type: 'lowpass', f: 900, q: 0.5, a: 0.005, g: 0.03 * v(), d: 0.08 });
  },

  /** Enemy gunfire; o.dist (metres) drives brightness + wet/dry of the echo:
   *  near shots get body/click/crack, far ones collapse to muffled pops. */
  shot_distant(p, o) {
    const far = Math.min(1, Math.max(0, (o.dist ?? 60) / 160));
    const v = () => randRange(0.85, 1.15);
    p.n({ dur: 0.32, type: 'lowpass', f: 620 + 900 * (1 - far), q: 0.6, a: 0.003, g: 0.5 * v(), d: 0.1 + far * 0.06 });
    if (far < 0.35) p.n({ dur: 0.01, type: 'highpass', f: 3000, q: 0.7, a: 0.0008, g: 0.16 * (1 - far / 0.35), d: 0.005 });
    p.n({ dur: 0.05, type: 'bandpass', f: 2600, q: 0.8, a: 0.001, g: 0.13 * (1 - far * 0.75) * v(), d: 0.016 });
    p.o({ type: 'sine', f: 76, f1: 46, fT: 0.1, dur: 0.22, a: 0.005, g: 0.4 * v(), d: 0.15 });
    p.n({ at: 0.09, dur: 0.28, type: 'lowpass', f: 460, q: 0.5, a: 0.008, g: (0.1 + 0.1 * far) * v(), d: 0.17 });
    p.n({ at: 0.19, dur: 0.33, type: 'lowpass', f: 340, q: 0.5, a: 0.01, g: (0.05 + 0.08 * far) * v(), d: 0.23 });
    p.n({ at: 0.33, dur: 0.38, type: 'lowpass', f: 260, q: 0.5, a: 0.012, g: (0.02 + 0.05 * far) * v(), d: 0.27 });
  },

  /* ---- explosions -------------------------------------------------------- */
  /** o.dist collapses far explosions to thump+rumble automatically. */
  explosion(p, o) {
    const dist = o.dist ?? 10;
    const near = Math.exp(-dist / 45);
    const v = () => randRange(0.88, 1.12);
    if (near > 0.15) p.n({ dur: 0.06, type: 'highpass', f: 2300, q: 0.7, a: 0.001, g: 0.42 * near * v(), d: 0.022 });
    // dual saturated subs (slight detune = beating weight)
    p.o({ type: 'sine', f: randRange(50, 58), f1: 30, fT: 0.7, dur: 1.5, a: 0.006, g: 0.88 * v(), d: 0.95, sat: true });
    p.o({ type: 'sine', f: randRange(64, 72), f1: 38, fT: 0.5, dur: 1.1, a: 0.008, g: 0.42 * v(), d: 0.6, sat: true });
    // mid roar
    p.n({ dur: 1.7, type: 'lowpass', f: 850, q: 0.5, a: 0.008, g: 0.62 * v(), d: 1.35, sat: true });
    p.n({ dur: 0.32, type: 'bandpass', f: 1300, q: 0.7, a: 0.004, g: 0.3 * near * v(), d: 0.13 });
    // debris patter (close range only)
    if (dist < 90) {
      const taps = randInt(7, 12);
      for (let i = 0; i < taps; i++) {
        p.n({
          at: randRange(0.35, 1.9), dur: 0.06, type: 'bandpass',
          f: randRange(1100, 2900), q: randRange(1, 3),
          a: 0.001, g: randRange(0.05, 0.14) * Math.sqrt(near), d: randRange(0.02, 0.05),
        });
      }
    }
    // long rumble tail
    p.n({ buf: 'brown', dur: 4.6, type: 'lowpass', f: 210, q: 0.4, a: 0.05, g: 0.32 * v(), d: randRange(3.2, 4.3) });
  },

  /* ---- movement ---------------------------------------------------------- */
  footstep(p) {
    const T = [[330, 0.05], [300, 0.062], [385, 0.044], [430, 0.052], [355, 0.057]];
    const [f, dec] = T[randInt(0, 4)];
    const fr = f * randRange(0.93, 1.07);
    p.n({ dur: 0.09, type: 'bandpass', f: fr, q: 1.1, a: 0.002, g: 0.5 * randRange(0.85, 1.1), d: dec });
    p.n({ dur: 0.06, type: 'lowpass', f: 170, q: 0.5, a: 0.003, g: 0.3, d: 0.04 });          // heel weight
    p.n({ at: randRange(0.018, 0.042), dur: 0.05, type: 'bandpass', f: fr * 1.7, q: 1.5, a: 0.002, g: 0.16, d: 0.028 }); // toe
    p.n({ dur: 0.03, type: 'highpass', f: 2900, q: 0.6, a: 0.001, g: randRange(0.03, 0.09), d: 0.013 }); // grit
  },

  slide(p) {
    p.n({ dur: 0.75, type: 'bandpass', f: 720, f1: 400, fT: 0.6, q: 0.8, a: 0.035, g: 0.3, d: 0.6 });
    p.n({ dur: 0.6, type: 'highpass', f: 2100, q: 0.6, a: 0.025, g: 0.07, d: 0.45 });
    p.o({ type: 'sine', f: 88, f1: 58, fT: 0.5, dur: 0.4, a: 0.02, g: 0.13, d: 0.3 });
  },

  jump(p) {
    p.n({ dur: 0.08, type: 'lowpass', f: 480, q: 0.7, a: 0.004, g: 0.3, d: 0.055 });
    p.n({ dur: 0.03, type: 'highpass', f: 2500, q: 0.6, a: 0.001, g: 0.05, d: 0.016 });
  },

  /** o.velocity (m/s fall speed) scales the thud. */
  land(p, o) {
    const s = Math.min(1, Math.max(0, ((o.velocity ?? 6) - 3) / 10));
    p.o({ type: 'sine', f: 78, f1: 40, fT: 0.09, dur: 0.18, a: 0.004, g: 0.25 + 0.5 * s, d: 0.1 + 0.09 * s, sat: s > 0.45 });
    p.n({ dur: 0.11, type: 'lowpass', f: 330, q: 0.6, a: 0.003, g: 0.28 + 0.3 * s, d: 0.07 });
    p.n({ dur: 0.04, type: 'highpass', f: 2600, q: 0.6, a: 0.001, g: 0.04 + 0.09 * s, d: 0.018 });   // gear rattle
    p.n({ at: 0.05, dur: 0.06, type: 'bandpass', f: 700, q: 1, a: 0.002, g: 0.14 * s + 0.03, d: 0.04 }); // second foot
  },

  /* ---- weapon handling ---------------------------------------------------- */
  /** Choreographed to o.dur (weapon reloadTime). Anchors 16.7%/57.1%/83.3%
   *  put the rifle (2.1s) hits at 0.35 / 1.20 / 1.75s. */
  reload(p, o) {
    const T = o.dur ?? 2.1;
    const a1 = T * 0.167, a2 = T * 0.571, a3 = T * 0.833;
    // mag release click + slide-out friction + mag hits palm
    p.n({ at: a1, dur: 0.03, type: 'bandpass', f: 2100, q: 2.5, a: 0.001, g: 0.3, d: 0.018 });
    p.n({ at: a1 + 0.02, dur: 0.13, type: 'bandpass', f: 1150, f1: 800, fT: 0.11, q: 1.2, a: 0.015, g: 0.11, d: 0.09 });
    p.n({ at: a1 + 0.05, dur: 0.05, type: 'lowpass', f: 500, q: 0.7, a: 0.003, g: 0.14, d: 0.04 });
    // mag in: thunk + seat click
    p.n({ at: a2, dur: 0.07, type: 'lowpass', f: 480, q: 0.8, a: 0.002, g: 0.38, d: 0.05 });
    p.n({ at: a2 + 0.015, dur: 0.035, type: 'bandpass', f: 1500, q: 2, a: 0.001, g: 0.16, d: 0.02 });
    // bolt release CLACK (double transient + low chunk + metallic ping)
    p.n({ at: a3, dur: 0.025, type: 'bandpass', f: 2700, q: 2, a: 0.0008, g: 0.34, d: 0.014 });
    p.n({ at: a3 + 0.028, dur: 0.05, type: 'bandpass', f: 1400, q: 1.4, a: 0.001, g: 0.3, d: 0.03 });
    p.n({ at: a3 + 0.03, dur: 0.06, type: 'lowpass', f: 600, q: 0.7, a: 0.002, g: 0.22, d: 0.05 });
    p.o({ at: a3, type: 'triangle', f: 3100, f1: 2900, fT: 0.04, dur: 0.05, a: 0.001, g: 0.03, d: 0.04 });
  },

  switch(p) {
    p.n({ dur: 0.15, type: 'bandpass', f: 480, f1: 1350, fT: 0.12, q: 1.1, a: 0.02, g: 0.15, d: 0.11 }); // woosh
    p.n({ at: 0.12, dur: 0.03, type: 'bandpass', f: 2300, q: 2, a: 0.001, g: 0.2, d: 0.016 });           // click
    p.n({ at: 0.15, dur: 0.05, type: 'lowpass', f: 680, q: 0.7, a: 0.002, g: 0.17, d: 0.035 });          // seat
  },

  throw(p) {
    p.n({ dur: 0.02, type: 'bandpass', f: 2800, q: 2, a: 0.001, g: 0.13, d: 0.01 });                     // pin
    p.n({ at: 0.03, dur: 0.2, type: 'bandpass', f: 420, f1: 950, fT: 0.16, q: 1, a: 0.045, g: 0.13, d: 0.13 }); // arm woosh
  },

  click(p) {
    p.n({ dur: 0.03, type: 'bandpass', f: 3200, q: 4, a: 0.001, g: 0.3, d: 0.014 });
  },

  empty(p) {
    p.n({ dur: 0.03, type: 'bandpass', f: 1900, q: 3, a: 0.001, g: 0.25, d: 0.014 });
    p.n({ at: 0.025, dur: 0.02, type: 'bandpass', f: 2900, q: 3, a: 0.001, g: 0.12, d: 0.01 });
  },

  /* ---- airstrike ---------------------------------------------------------- */
  /** Full arc after 'airstrike:incoming': approach -> pass (peak ~3.3s,
   *  matching jets crossing the target) -> away, with L->R pan sweep and a
   *  falling bomb whistle timed to the first impacts (~2.95s). */
  jet(p) {
    const P = 3.3;
    const panPts = [[0, -0.85], [P - 0.5, -0.35], [P + 0.5, 0.45], [6.2, 0.9]];
    for (const det of [-9, 9]) {
      p.o({
        type: 'sawtooth', detune: det, dur: 6.3,
        fPts: [[0, 185], [P - 0.4, 255], [P + 0.8, 130], [6.2, 105]],
        gPts: [[0, 0.004], [P - 1.1, 0.16], [P, 0.26], [P + 1.4, 0.05], [6.2, EPS]],
        pan: panPts,
      });
    }
    p.n({
      dur: 6.3, type: 'bandpass', q: 1,
      fPts: [[0, 480], [P, 1500], [P + 1.2, 620], [6.2, 380]],
      gPts: [[0, 0.005], [P - 1, 0.3], [P, 0.5], [P + 1.5, 0.08], [6.2, EPS]],
      pan: panPts,
    });
    p.n({
      buf: 'brown', dur: 6.3, type: 'lowpass', f: 160,
      gPts: [[0, 0.002], [P - 0.6, 0.22], [P + 0.5, 0.3], [P + 2.2, 0.04], [6.2, EPS]],
    });
    p.o({
      at: 1.95, type: 'sine', dur: 1.05,
      fPts: [[0, 2500], [1.0, 620]],
      gPts: [[0, EPS], [0.2, 0.055], [0.85, 0.1], [1.05, EPS]],
    });
  },

  whistle(p) {
    p.o({ type: 'sine', dur: 1.2, fPts: [[0, 2400], [1.1, 620]], gPts: [[0, EPS], [0.18, 0.1], [0.95, 0.16], [1.15, EPS]] });
  },

  radio_call(p) {
    p.n({ dur: 0.4, type: 'bandpass', f: 2500, q: 0.6, a: 0.01, g: 0.028, d: 0.34 });   // static bed
    p.o({ type: 'square', f: 1240, dur: 0.07, a: 0.003, g: 0.06, d: 0.05 });
    p.o({ at: 0.1, type: 'square', f: 1240, dur: 0.07, a: 0.003, g: 0.06, d: 0.05 });
    p.o({ at: 0.26, type: 'square', f: 1650, dur: 0.11, a: 0.003, g: 0.07, d: 0.08 });  // confirm blip
  },

  /* ---- feedback / UI ------------------------------------------------------ */
  hitmarker(p) {
    p.o({ type: 'square', f: 2080, f1: 1890, fT: 0.03, dur: 0.04, a: 0.001, g: 0.15, d: 0.027 });
    p.n({ dur: 0.014, type: 'highpass', f: 4200, q: 0.7, a: 0.0008, g: 0.05, d: 0.007 });
  },

  /** Kill / headshot: deeper double tick (extra high blip on headshots). */
  headshot(p, o) {
    p.o({ type: 'square', f: 1550, f1: 1420, fT: 0.03, dur: 0.045, a: 0.001, g: 0.17, d: 0.032 });
    p.o({ at: 0.055, type: 'square', f: 1080, f1: 960, fT: 0.035, dur: 0.055, a: 0.001, g: 0.19, d: 0.04 });
    if (o.headshot) p.o({ at: 0.02, type: 'square', f: 2600, f1: 2400, fT: 0.02, dur: 0.03, a: 0.001, g: 0.07, d: 0.02 });
  },

  streak_ready(p) {
    p.o({ type: 'triangle', f: 880, dur: 0.24, a: 0.008, g: 0.16, d: 0.18 });
    p.o({ type: 'sine', f: 1760, dur: 0.2, a: 0.008, g: 0.045, d: 0.15 });
    p.o({ at: 0.15, type: 'triangle', f: 1318.5, dur: 0.34, a: 0.008, g: 0.17, d: 0.27 });
    p.o({ at: 0.15, type: 'sine', f: 2637, dur: 0.3, a: 0.008, g: 0.04, d: 0.24 });
  },

  message(p) {
    p.n({ dur: 0.1, type: 'bandpass', f: 1500, f1: 900, fT: 0.08, q: 3, a: 0.004, g: 0.07, d: 0.07 });
    p.o({ type: 'sine', f: 660, f1: 640, fT: 0.08, dur: 0.11, a: 0.005, g: 0.055, d: 0.08 });
  },

  hurt(p) {
    p.o({ type: 'sine', f: 96, f1: 42, fT: 0.11, dur: 0.2, a: 0.004, g: 0.5, d: 0.15, sat: true });
    p.n({ dur: 0.09, type: 'lowpass', f: 300, q: 0.6, a: 0.003, g: 0.24, d: 0.06 });
  },

  death_hit(p) {
    p.o({ type: 'sine', f: 72, f1: 28, fT: 0.55, dur: 1.0, a: 0.005, g: 0.66, d: 0.75, sat: true });
    p.n({ dur: 0.45, type: 'lowpass', f: 380, q: 0.5, a: 0.004, g: 0.3, d: 0.32 });
    p.o({ type: 'sine', f: 3400, f1: 3300, fT: 2.2, dur: 2.6, a: 0.03, g: 0.035, d: 2.3 });  // tinnitus ring
  },

  heartbeat(p) {
    // triangle: odd harmonics keep the lub-dub audible on small speakers
    p.o({ type: 'triangle', f: 58, f1: 40, fT: 0.1, dur: 0.16, a: 0.012, g: 0.5, d: 0.11 });
    p.o({ at: 0.24, type: 'triangle', f: 52, f1: 36, fT: 0.09, dur: 0.15, a: 0.012, g: 0.36, d: 0.1 });
  },

  /* ---- ambience one-shots -------------------------------------------------- */
  artillery(p) {
    p.o({ type: 'sine', f: 48, f1: 29, fT: 0.55, dur: 1.3, a: 0.02, g: 0.55, d: 0.85, sat: true });
    p.n({ buf: 'brown', dur: 2.8, type: 'lowpass', f: 150, q: 0.4, a: 0.07, g: 0.32, d: 2.0 });
    p.n({ dur: 0.7, type: 'lowpass', f: 420, q: 0.5, a: 0.04, g: 0.13, d: 0.5 });
  },

  pop_far(p) {
    p.n({ dur: 0.13, type: 'lowpass', f: randRange(440, 560), q: 0.7, a: 0.002, g: 0.32, d: 0.05 });
    p.o({ type: 'sine', f: 92, f1: 55, fT: 0.05, dur: 0.1, a: 0.003, g: 0.2, d: 0.06 });
    p.n({ at: 0.07, dur: 0.16, type: 'lowpass', f: 300, q: 0.5, a: 0.012, g: 0.07, d: 0.11 });
  },

  siren(p) {
    p.o({
      type: 'triangle', dur: 14.2,
      fPts: [[0, 660], [2, 900], [4, 640], [6, 880], [8, 630], [10, 860], [12, 620], [14, 700]],
      gPts: [[0, EPS], [2.5, 0.35], [10, 0.3], [14, EPS]],
    });
  },

  gust(p) {
    p.n({
      dur: 3.2, type: 'bandpass', q: 0.6,
      fPts: [[0, 360], [1.4, 850], [3.1, 300]],
      gPts: [[0, EPS], [1.3, 0.4], [3.1, EPS]],
    });
  },
};

/**
 * Owns the shared buffers/curves and instantiates voices.
 *   kit.spawn(name, destNode, { volume, rate, delay, pan, ...recipeOpts })
 */
export class SynthKit {
  constructor(ctx) {
    this.ctx = ctx;
    this.white = this._makeWhite(2);
    this.brown = this._makeBrown(6);
    this.satCurve = this._makeSat(2.6);
  }

  _makeWhite(sec) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * sec);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    // Math.random on purpose: buffer content shouldn't consume the seeded
    // gameplay RNG stream (recipes/timers do use it).
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _makeBrown(sec) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * sec);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let b = 0, max = 0;
    for (let i = 0; i < len; i++) {
      b += 0.018 * ((Math.random() * 2 - 1) - b);
      d[i] = b;
      if (Math.abs(b) > max) max = Math.abs(b);
    }
    const k = 1 / (max || 1);
    for (let i = 0; i < len; i++) d[i] *= k;
    // crossfade tail into head so looping is click-free
    const xf = Math.floor(sr * 0.25);
    for (let i = 0; i < xf; i++) {
      const w = i / xf;
      d[len - xf + i] = d[len - xf + i] * (1 - w) + d[i] * w;
    }
    return buf;
  }

  _makeSat(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x);
    }
    return c;
  }

  spawn(name, dest, opts = {}) {
    const recipe = RECIPES[name];
    if (!recipe || !dest) return null;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = opts.volume ?? 1;
    let head = out;
    if (typeof opts.pan === 'number') {
      const sp = ctx.createStereoPanner();
      sp.pan.value = opts.pan;
      out.connect(sp);
      head = sp;
    }
    head.connect(dest);
    const voice = new Voice(ctx, out);
    const t0 = ctx.currentTime + Math.max(0, opts.delay ?? 0);
    recipe(new Patch(this, out, t0, opts, voice), opts);
    return voice;
  }
}
