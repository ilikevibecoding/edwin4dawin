import { Patch, rnd, vary, clamp } from '../synth.js';

/**
 * Seaside ambience. All on the ambience bus at low level. The wind/surf loop is persistent; the rest are
 * one-shots the AudioSystem schedules on random timers while the game is playing.
 */

export const ambienceSounds = {
  /** Continuous sea wind + surf wash: pink noise through slowly modulated filters. */
  amb_wind: {
    bus: 'ambience',
    gain: 0.5,
    persistent: true,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const dur = o.offline ? o.duration || 6 : Infinity;
      const out = p.gain(0);
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(1, t + (o.offline ? 0.3 : 2.5));

      // Wind body: low-pass whose cutoff wanders 350–900 Hz.
      const windG = p.gain(0.5, out);
      const windF = p.filter('lowpass', 600, 0.7, windG);
      p.noise('pink', t, dur, 1, windF);
      p.lfo(windF.frequency, t, dur, { f: 0.09, depth: 260, offset: 620 });
      p.lfo(windG.gain, t, dur, { f: 0.061, depth: 0.15, offset: 0.5 });

      // Gust whistle: band-pass, tremolo at a different slow rate.
      const gustG = p.gain(0.1, out);
      const gustF = p.filter('bandpass', 900, 0.6, gustG);
      p.noise('pink', t, dur, 1.3, gustF);
      p.lfo(gustG.gain, t, dur, { f: 0.13, depth: 0.08, offset: 0.1 });
      p.lfo(gustF.frequency, t, dur, { f: 0.05, depth: 250, offset: 950 });

      // Distant surf: brown noise, low-passed, swelling every ~14 s.
      const surfG = p.gain(0.35, out);
      const surfF = p.filter('lowpass', 320, 0.5, surfG);
      p.noise('brown', t, dur, 1, surfF);
      p.lfo(surfG.gain, t, dur, { f: 0.07, depth: 0.22, offset: 0.35 });

      // Air: faint high hiss that breathes with the gusts (keeps the bed from sounding like a closed room).
      const airG = p.gain(0.02, out);
      const airF = p.filter('highpass', 2500, 0.5, airG);
      p.noise('white', t, dur, 1, airF);
      p.lfo(airG.gain, t, dur, { f: 0.13, depth: 0.012, offset: 0.02 });

      return p.handle({ end: o.offline ? t + dur : Infinity });
    },
  },

  /** Gull cries: 1–3 harsh pitched chirps with vibrato and a falling tail. */
  gull: {
    bus: 'ambience',
    gain: 0.7,
    spatial: { ref: 30, rolloff: 0.8, max: 500, model: 'equalpower', absorb: 0.4 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const n = 1 + ((Math.random() * 3) | 0);
      let tt = o.t;
      let f = rnd(1900, 2600) * p.pitch;
      for (let i = 0; i < n; i++) {
        const hold = rnd(0.12, 0.28);
        const g = p.env(tt, { peak: 0.35, a: 0.04, hold, tau: 0.06 });
        const lp = p.filter('lowpass', 6000, 0.7, g);
        const s = p.osc('sine', f, tt, hold + 0.5, lp);
        const s2 = p.osc('sawtooth', f, tt, hold + 0.5, p.gain(0.18, lp));
        for (const x of [s, s2]) {
          x.frequency.setValueAtTime(f * 0.94, tt);
          x.frequency.exponentialRampToValueAtTime(f, tt + 0.05);
          x.frequency.setValueAtTime(f, tt + 0.04 + hold * 0.55);
          x.frequency.exponentialRampToValueAtTime(f * 0.74, tt + 0.04 + hold + 0.1);
          p.lfo(x.detune, tt, hold + 0.5, { f: rnd(5, 7), depth: 40 });
        }
        tt += hold + rnd(0.3, 0.55);
        f *= vary(0.05) * 0.97;
      }
      return p.handle();
    },
  },

  /** Far-off firefight: 3–7 muffled shots (thump + low-mid bark) with a slapback. */
  distant_gunfire: {
    bus: 'ambience',
    gain: 0.6,
    spatial: { ref: 30, rolloff: 0.5, max: 800, model: 'HRTF', absorb: 1.2, delay: true, delayMin: 40 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const n = 3 + ((Math.random() * 5) | 0);
      const gap = rnd(0.085, 0.13);
      const out = p.gain(0.7);
      const lp = p.filter('lowpass', 1400, 0.6, out);
      const echo = ctx.createDelay(0.5);
      echo.delayTime.value = rnd(0.1, 0.16);
      const fb = p.gain(0.35, echo);
      echo.connect(fb);
      echo.connect(p.gain(0.4, lp));
      lp.connect(echo);
      for (let i = 0; i < n; i++) {
        const t = o.t + i * gap * vary(0.05);
        const k = vary(0.05);
        const g = p.env(t, { peak: 0.9, a: 0.002, hold: 0.01, tau: 0.035, to: lp });
        const s = p.osc('triangle', 160 * k, t, 0.3, p.filter('lowpass', 400, 0.7, g));
        p.sweep(s.frequency, t, 160 * k, 55 * k, 0.07);
        p.burst(t, { peak: 0.6, a: 0.001, tau: 0.018, type: 'bandpass', f: 600 * k, q: 0.9, to: lp });
        p.burst(t, { peak: 0.2, a: 0.001, tau: 0.008, type: 'bandpass', f: 2200 * k, q: 0.8, to: lp });
      }
      p.mark(o.t + n * gap + 1.2);
      p.send(out, 0.15 * clamp(o.attn ?? 0.2, 0, 1));
      return p.handle();
    },
  },

  /** Far low rumble (distant ordnance / thunder over the sea). */
  distant_rumble: {
    bus: 'ambience',
    gain: 1.0,
    spatial: { ref: 40, rolloff: 0.5, max: 1200, model: 'HRTF', absorb: 1, delay: false },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 45, f1: 28, sweepDur: 1, peak: 0.5, a: 0.05, hold: 0.3, tau: 0.5 });
      p.burst(t, { peak: 0.45, a: 0.1, hold: 0.5, tau: 0.7, kind: 'pink', type: 'lowpass', f: 150, q: 0.6 });
      return p.handle();
    },
  },

  /** Cicada in the trees: high tone with fast tremolo, swelling in and out over its duration. */
  cicada: {
    bus: 'ambience',
    gain: 0.35,
    spatial: { ref: 15, rolloff: 1, max: 120, model: 'equalpower', absorb: 0 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const D = clamp(o.duration || rnd(6, 14), 2, 30);
      const f = rnd(4800, 6000) * p.pitch;
      const swell = p.gain(0);
      swell.gain.setValueAtTime(0, t);
      swell.gain.linearRampToValueAtTime(0.3, t + 1.2);
      swell.gain.setValueAtTime(0.3, t + D - 1.5);
      swell.gain.linearRampToValueAtTime(0, t + D);
      const trem = p.gain(0.5, swell);
      p.lfo(trem.gain, t, D, { f: rnd(26, 34), depth: 0.5, type: 'square' });
      const lp = p.filter('lowpass', 8000, 0.7, trem);
      p.osc('square', f, t, D, p.gain(0.5, lp));
      p.osc('sine', f * 0.5, t, D, p.gain(0.3, lp));
      return p.handle();
    },
  },
};
