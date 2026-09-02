import { Patch, rnd, vary, clamp } from '../synth.js';

/**
 * Weapon sounds. Each entry: { bus, gain, spatial?, minInterval?, build(ctx, dest, o) → handle }.
 * `o`: { t, pitch, lib: { noise(kind), send }, dist?, attn?, ...event opts }.
 */

/**
 * Rifle shot layers. `distant` = heard from afar (enemy fire / ambience): the transient goes,
 * the thump and low-mid bark stay, and a slapback echo is added.
 */
function rifleShot(p, t, { ads = false, distant = false, attn = 1, dist = 0, level = 1 } = {}) {
  const k = p.pitch * vary(0.04);
  const out = p.gain(level * vary(0.04));
  let dry = out;
  if (distant) {
    // Distance takes the sizzle first (on top of the spatial chain's own air absorption).
    dry = p.filter('lowpass', clamp(4200 - dist * 12, 900, 4200), 0.6, out);
  }

  // (a) transient: 1–2 ms high-passed noise click — the "snap" that sells the attack.
  if (!distant) p.click(t, { peak: ads ? 0.7 : 1.0, hp: 2600 * k, tau: 0.001, to: dry });

  // (b) body: mid punch (square 380→140 Hz, 30 ms — reads on small speakers), thump (triangle 180→60 Hz over 60 ms,
  //     low-passed so it stays round) and a sine sub 95→42 Hz. Short taus so 800 rpm never piles up.
  {
    const g = p.env(t, { peak: 0.5, a: 0.001, hold: 0.004, tau: 0.014, to: dry });
    const lp = p.filter('lowpass', 1800 * k, 0.7, g);
    const s = p.osc('square', 380 * k, t, 0.15, lp);
    p.sweep(s.frequency, t, 380 * k, 140 * k, 0.03);
  }
  {
    const g = p.env(t, { peak: 0.8, a: 0.0015, hold: 0.008, tau: 0.022, to: dry });
    const lp = p.filter('lowpass', 520 * k, 0.8, g);
    const s = p.osc('triangle', 180 * k, t, 0.25, lp);
    p.sweep(s.frequency, t, 180 * k, 60 * k, 0.06);
  }
  {
    const g = p.env(t, { peak: 0.45, a: 0.003, hold: 0.012, tau: 0.032, to: dry });
    const s = p.osc('sine', 95 * k, t, 0.3, g);
    p.sweep(s.frequency, t, 95 * k, 42 * k, 0.09);
  }

  // (c) crack: band-passed noise 1.5–5 kHz with a ~25 ms exponential decay, plus a low-mid "bark" so it is not fizzy.
  //     Noise through a band-pass has a low RMS for its envelope peak, hence the hot-looking values.
  p.burst(t, { peak: distant ? 0.9 : ads ? 1.2 : 1.5, a: 0.0005, tau: 0.011, type: 'bandpass', f: (ads ? 2100 : 2800) * k, q: 0.5, to: dry });
  p.burst(t + 0.001, { peak: 2.0, a: 0.001, tau: 0.022, type: 'bandpass', f: 700 * k, q: 0.7, to: dry });

  // (d) mechanical action 40 ms later: bolt carrier tick.
  if (!distant) {
    p.burst(t + 0.04, { peak: 0.4, a: 0.0005, tau: 0.004, type: 'bandpass', f: 3600 * k, q: 2.5, to: dry });
    p.metal(t + 0.042, { freqs: [2650, 4100], decay: 0.012, peak: 0.09, to: dry });
  }

  // (e) outdoor tail: shared convolver send (~15–20 %), scaled by the panner attenuation for spatial instances.
  p.send(out, (distant ? 0.2 : 0.15) * clamp(attn, 0, 1));

  // Slapback echo for distant shots (reflection off the buildings across the plaza).
  if (distant) {
    const echoDelay = p.ctx.createDelay(0.5);
    echoDelay.delayTime.value = rnd(0.085, 0.14);
    const fb = p.gain(0.38, echoDelay);
    const echoLP = p.filter('lowpass', 1400, 0.7, fb);
    echoDelay.connect(echoLP);
    const echoOut = p.gain(0.45, out);
    echoLP.connect(echoOut);
    dry.connect(echoDelay);
    p.mark(t + 0.9);
  }
  return out;
}

export const weaponSounds = {
  rifle_shot: {
    bus: 'weapons',
    gain: 1,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      rifleShot(p, o.t, { ads: !!o.ads, attn: 1, level: 0.85 });
      return p.handle();
    },
  },

  rifle_shot_distant: {
    bus: 'world',
    gain: 0.85,
    minInterval: 0.03,
    spatial: { ref: 10, rolloff: 0.7, max: 500, model: 'HRTF', absorb: 1, delay: true, delayMin: 40 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      rifleShot(p, o.t, { distant: true, attn: o.attn ?? 0.3, dist: o.dist ?? 30, level: 0.65 });
      return p.handle();
    },
  },

  /** Suppression whizz: passing round. 120 ms sine sweep 1200→300 Hz + noise, panned by position/direction. */
  bullet_whizz: {
    bus: 'world',
    gain: 0.9,
    minInterval: 0.04,
    spatial: { ref: 1.5, rolloff: 1.2, max: 40, model: 'HRTF', absorb: 0 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const k = p.pitch * vary(0.08);
      p.tone(t, { type: 'sine', f: 1200 * k, f1: 300 * k, sweepDur: 0.11, peak: 0.42, a: 0.004, hold: 0.04, tau: 0.02 });
      p.tone(t, { type: 'triangle', f: 1800 * k, f1: 500 * k, sweepDur: 0.1, peak: 0.12, a: 0.003, hold: 0.03, tau: 0.018, lp: 2500 });
      p.burst(t, { peak: 0.5, a: 0.003, hold: 0.03, tau: 0.025, type: 'bandpass', f: 2600 * k, f1: 700 * k, sweepDur: 0.11, q: 2.5 });
      return p.handle();
    },
  },

  /** Full reload choreographed to the weapon's reload duration (defaults to the 2.1 s stock timing). */
  rifle_reload: {
    bus: 'weapons',
    gain: 0.4,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const s = clamp((o.duration || 2.1) / 2.1, 0.4, 3);
      const t = o.t;
      // 0.35 s — mag release + mag out: plastic/metal clack.
      {
        const tt = t + 0.35 * s;
        p.click(tt, { peak: 0.35, hp: 2000, tau: 0.001 });
        p.burst(tt, { peak: 0.5, a: 0.001, tau: 0.007, type: 'lowpass', f: 3200, q: 0.7 });
        p.metal(tt, { freqs: [880, 1420, 2100], decay: 0.035, peak: 0.12 });
        p.burst(tt + 0.012, { peak: 0.2, a: 0.004, tau: 0.02, type: 'bandpass', f: 700, q: 1 });
      }
      // 0.6 s — mag hits the ground: dull plastic thud.
      {
        const tt = t + 0.6 * s;
        p.tone(tt, { type: 'triangle', f: 170, f1: 115, peak: 0.35, a: 0.003, tau: 0.022, lp: 900 });
        p.burst(tt, { peak: 0.25, a: 0.002, tau: 0.012, type: 'bandpass', f: 480, q: 1.2 });
        p.burst(tt + 0.03, { peak: 0.08, a: 0.002, tau: 0.008, type: 'bandpass', f: 1400, q: 1.5 });
      }
      // 1.3 s — fresh mag in: click, then the seating clack with a low knock.
      {
        const tt = t + 1.3 * s;
        p.burst(tt, { peak: 0.4, a: 0.001, tau: 0.003, type: 'bandpass', f: 2600, q: 1.5 });
        const t2 = tt + 0.06;
        p.metal(t2, { freqs: [2100, 3300, 5200], decay: 0.03, peak: 0.12 });
        p.burst(t2, { peak: 0.5, a: 0.001, tau: 0.007, type: 'bandpass', f: 1800, q: 0.8 });
        p.tone(t2, { f: 140, f1: 100, peak: 0.32, a: 0.002, tau: 0.02 });
      }
      // 1.85 s — bolt release: heavy metallic "chunk".
      {
        const tt = t + 1.85 * s;
        p.tone(tt, { f: 120, f1: 70, peak: 0.55, a: 0.002, tau: 0.022 });
        p.metal(tt, { freqs: [1300, 2600, 3900, 5700], decay: 0.09, peak: 0.16 });
        p.burst(tt, { peak: 0.6, a: 0.001, tau: 0.01, type: 'bandpass', f: 2100, q: 0.9 });
        p.burst(tt + 0.035, { peak: 0.35, a: 0.001, tau: 0.005, type: 'bandpass', f: 3000, q: 1.5 });
        p.rattle(tt + 0.05, { peak: 0.05 });
      }
      return p.handle();
    },
  },

  /** Trigger pull on an empty chamber. */
  dry_fire: {
    bus: 'weapons',
    gain: 1,
    minInterval: 0.1,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.burst(t, { peak: 0.65, a: 0.0005, tau: 0.003, type: 'bandpass', f: 2800, q: 1.2 });
      p.metal(t, { freqs: [3200, 4800], decay: 0.02, peak: 0.14 });
      p.tone(t, { f: 210, f1: 150, peak: 0.22, a: 0.001, tau: 0.01 });
      return p.handle();
    },
  },

  /** Cloth/whoosh when raising the sight; a tiny settle tick at the end. */
  aim_in: {
    bus: 'weapons',
    gain: 0.8,
    minInterval: 0.08,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.burst(t, { peak: 0.4, a: 0.03, tau: 0.05, type: 'bandpass', f: 500, f1: 1500, sweepDur: 0.15, q: 0.8 });
      p.burst(t + 0.13, { peak: 0.16, a: 0.001, tau: 0.003, type: 'bandpass', f: 3000, q: 2 });
      return p.handle();
    },
  },
  aim_out: {
    bus: 'weapons',
    gain: 0.8,
    minInterval: 0.08,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      p.burst(o.t, { peak: 0.34, a: 0.025, tau: 0.05, type: 'bandpass', f: 1400, f1: 450, sweepDur: 0.15, q: 0.8 });
      return p.handle();
    },
  },

  /** Brass casing hitting stone: 2–3 high metallic pings, random pitch 4–7 kHz. */
  casing_bounce: {
    bus: 'weapons',
    gain: 0.3,
    minInterval: 0.05,
    spatial: { ref: 1.5, rolloff: 1.5, max: 30, model: 'equalpower', absorb: 0 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const n = Math.random() < 0.5 ? 2 : 3;
      let tt = o.t;
      for (let i = 0; i < n; i++) {
        const f = rnd(4000, 7000);
        p.metal(tt, { freqs: [f, f * 1.47, f * 2.1], decay: 0.06 * (1 - i * 0.2), peak: 0.35 * (1 - i * 0.25) });
        p.click(tt, { peak: 0.12, hp: 5000, tau: 0.0006 });
        tt += rnd(0.025, 0.07);
      }
      return p.handle();
    },
  },
};
