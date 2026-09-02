import { Patch, rnd, vary, clamp } from '../synth.js';

/**
 * Explosions. Spatialized with propagation delay (beyond 40 m) and air absorption; the builder itself
 * also removes transient content with distance (`o.dist`) so far bombs are soft thuds with a rumble.
 */

export const EXPLOSION_SPATIAL = { ref: 14, rolloff: 0.55, max: 800, model: 'HRTF', absorb: 0.7, delay: true, delayMin: 40 };

export const explosionSounds = {
  explosion: {
    bus: 'world',
    gain: 1,
    spatial: EXPLOSION_SPATIAL,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const d = o.dist || 0;
      const far = clamp((d - 20) / 150, 0, 1);
      const size = o.radius ? clamp(o.radius / 9, 0.6, 1.6) : 1;
      const k = (p.pitch * vary(0.05)) / Math.sqrt(size); // bigger blast → lower
      const out = p.gain(0.6);

      // Sub boom: 62→27 Hz sine with a fast pitch drop, ~1.2 s.
      {
        const g = p.env(t, { peak: 0.85, a: 0.006, hold: 0.04, tau: 0.24, to: out });
        const s = p.osc('sine', 62 * k, t, 2.2, g);
        p.sweep(s.frequency, t, 62 * k, 27 * k, 0.5);
      }
      // Low punch above the sub so it reads on small speakers.
      {
        const g = p.env(t, { peak: 0.6, a: 0.004, hold: 0.03, tau: 0.12, to: out });
        const lp = p.filter('lowpass', 300, 0.7, g);
        const s = p.osc('triangle', 130 * k, t, 1.0, lp);
        p.sweep(s.frequency, t, 130 * k, 45 * k, 0.25);
      }
      // Mid crack, low-mid body and high snap (all fade with distance — far blasts are soft thuds).
      p.burst(t, { peak: 2.8 * (1 - 0.7 * far), a: 0.001, tau: 0.035, type: 'bandpass', f: 900 * k, q: 0.5, to: out });
      p.burst(t + 0.005, { peak: 2.2 * (1 - 0.5 * far), a: 0.004, hold: 0.02, tau: 0.09, kind: 'pink', type: 'bandpass', f: 320 * k, q: 0.6, to: out });
      p.burst(t, { peak: 1.2 * (1 - 0.85 * far), a: 0.0005, tau: 0.012, type: 'highpass', f: 2500, q: 0.7, to: out });
      // Crackle / debris: granular bursts over 2 s, front-loaded.
      for (let i = 0; i < 16; i++) {
        const tt = t + 0.1 + Math.random() ** 1.4 * 1.9;
        const age = (tt - t) / 2;
        p.burst(tt, { peak: (1.1 - 0.85 * age) * (1 - 0.5 * far), a: 0.001, tau: rnd(0.006, 0.016), type: 'bandpass', f: rnd(1200, 4000), q: 1.2, to: out });
      }
      // Long low rumble tail: low-passed pink noise, 3 s.
      {
        const g = p.env(t + 0.03, { peak: 0.55, a: 0.12, hold: 0.3, tau: 0.7, to: out });
        const lp = p.filter('lowpass', 180, 0.6, g);
        p.noise('pink', t + 0.03, 3.4, 0.7, lp);
      }
      p.send(out, 0.3 * clamp(o.attn ?? 1, 0, 1));
      return p.handle();
    },
  },

  /** Ear ring after a close blast (non-spatial, on the voice bus). */
  tinnitus: {
    bus: 'voice',
    gain: 1,
    minInterval: 0.5,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 6000, peak: 0.05, a: 0.05, hold: 0.4, tau: 0.5 });
      p.tone(t, { f: 7400, peak: 0.02, a: 0.08, hold: 0.3, tau: 0.45 });
      return p.handle();
    },
  },

  /** Distant secondary echo of a strike (the explosion itself is a separate event). */
  impact_echo: {
    bus: 'world',
    gain: 0.5,
    spatial: { ref: 20, rolloff: 0.5, max: 1000, model: 'HRTF', absorb: 1, delay: false },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t + rnd(0.65, 0.95);
      const out = p.gain(1);
      p.burst(t, { peak: 0.5, a: 0.03, tau: 0.18, type: 'lowpass', f: 420, q: 0.6, to: out });
      p.tone(t, { f: 55, f1: 35, sweepDur: 0.4, peak: 0.35, a: 0.02, tau: 0.2, to: out });
      p.send(out, 0.35);
      return p.handle();
    },
  },
};
