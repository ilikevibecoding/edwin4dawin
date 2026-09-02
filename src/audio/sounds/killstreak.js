import { Patch, rnd, vary, clamp, getRadioCurve } from '../synth.js';
import { EXPLOSION_SPATIAL } from './explosions.js';

/** Radio squelch "kssht" — noise band with a fast level flutter. */
function squelch(p, t, { peak = 0.25, dur = 0.09, to = p.dest } = {}) {
  const g = p.burst(t, { peak, a: 0.004, hold: dur * 0.5, tau: dur * 0.25, type: 'bandpass', f: 2000, q: 1.2, to });
  p.lfo(g.gain, t, dur + 0.1, { f: 37, depth: peak * 0.5 });
  p.burst(t, { peak: peak * 0.5, a: 0.002, tau: 0.01, type: 'highpass', f: 3500, q: 0.7, to });
}

function beep(p, t, { f = 1200, peak = 0.16, hold = 0.04, to = p.dest } = {}) {
  p.tone(t, { type: 'square', f, peak, a: 0.004, hold, tau: 0.01, lp: f * 2.6, to });
}

export const killstreakSounds = {
  /** Air strike available: squelch + two-note confirm chime. */
  ks_ready: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      squelch(p, t, { peak: 0.22 });
      p.tone(t + 0.1, { f: 880, peak: 0.3, a: 0.01, hold: 0.05, tau: 0.06 });
      p.tone(t + 0.1, { f: 1760, peak: 0.06, a: 0.01, hold: 0.03, tau: 0.04 });
      p.tone(t + 0.22, { f: 1320, peak: 0.3, a: 0.01, hold: 0.08, tau: 0.09 });
      p.tone(t + 0.22, { f: 2640, peak: 0.05, a: 0.01, hold: 0.05, tau: 0.05 });
      return p.handle();
    },
  },

  ks_target_on: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      beep(p, o.t, { f: 1200 });
      beep(p, o.t + 0.09, { f: 1200, hold: 0.03 });
      return p.handle();
    },
  },
  ks_target_off: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      beep(p, o.t, { f: 800, hold: 0.06 });
      return p.handle();
    },
  },

  /**
   * Radio call-in: squelch → ~1 s of synthesized radio "voice" (glottal saw + breath noise through two
   * hopping formant filters, syllable gating, radio band-limit and saturation) → squelch → beep.
   */
  ks_callin: {
    bus: 'voice',
    gain: 0.8,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      squelch(p, t, { peak: 0.28 });

      const t0 = t + 0.12;
      const speech = 1.05;
      // Radio chain: formants → band-limit → saturation → out.
      const radioOut = p.gain(0.5);
      const sat = ctx.createWaveShaper();
      sat.curve = getRadioCurve();
      sat.connect(radioOut);
      const band = p.filter('bandpass', 1300, 0.55, sat);
      const pre = p.gain(1.7, band);

      // Voice source: sawtooth with intonation steps + breath noise.
      const glottal = p.osc('sawtooth', 118, t0, speech + 0.1);
      const breath = p.noise('white', t0, speech + 0.1, 1);
      const breathG = p.gain(0.12, null);
      breath.connect(breathG);
      const src = p.gain(1, null);
      glottal.connect(src);
      breathG.connect(src);

      // Two hopping formants (F1/F2) in parallel.
      const f1 = p.filter('bandpass', 500, 7, pre);
      const f2 = p.filter('bandpass', 1500, 8, pre);
      const gate = p.gain(0, null);
      src.connect(gate);
      gate.connect(f1);
      gate.connect(f2);

      const vowels = [
        [330, 2300],
        [500, 1700],
        [700, 1200],
        [400, 900],
        [600, 2000],
        [350, 1100],
      ];
      let tt = t0;
      let pitch = 118;
      while (tt < t0 + speech) {
        const dur = rnd(0.08, 0.15);
        const [a, b] = vowels[(Math.random() * vowels.length) | 0];
        f1.frequency.setTargetAtTime(a * vary(0.08), tt, 0.02);
        f2.frequency.setTargetAtTime(b * vary(0.08), tt, 0.02);
        pitch = clamp(pitch * vary(0.09), 100, 145);
        glottal.frequency.setTargetAtTime(pitch, tt, 0.03);
        const gp = gate.gain;
        gp.setValueAtTime(0, tt);
        gp.linearRampToValueAtTime(rnd(0.7, 1), tt + 0.02);
        gp.setValueAtTime(rnd(0.7, 1), tt + dur - 0.035);
        gp.linearRampToValueAtTime(0, tt + dur - 0.005);
        tt += dur + rnd(0.0, 0.03);
      }
      // Falling cadence on the last syllable.
      glottal.frequency.setTargetAtTime(96, tt - 0.12, 0.05);
      // Carrier hiss while transmitting.
      p.burst(t0, { peak: 0.03, a: 0.02, hold: speech, tau: 0.03, type: 'bandpass', f: 3000, q: 0.5 });

      const tEnd = tt + 0.05;
      squelch(p, tEnd, { peak: 0.2, dur: 0.06 });
      beep(p, tEnd + 0.12, { f: 1400, peak: 0.07, hold: 0.05 });
      p.mark(tEnd + 0.4);
      return p.handle();
    },
  },

  /**
   * Jet flyover loop. Turbine hiss + whine + low roar + sub buzz. The system drives Doppler and position
   * per frame via handle.setRate / setIntensity and the spatial chain's move(); offline previews script a pass-by.
   */
  jet_flyover: {
    bus: 'voice',
    gain: 1,
    persistent: true,
    spatial: { ref: 45, rolloff: 1, max: 5000, model: 'HRTF', absorb: 0.3 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const dur = o.offline ? o.duration || 6 : Infinity;
      const out = p.gain(0);
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(o.offline ? 0.35 : 0.8, t + 0.4);

      const roarG = p.gain(1.4, out);
      const roarF = p.filter('lowpass', 260, 0.8, roarG);
      const roar = p.noise('pink', t, dur, 1, roarF);
      p.lfo(roarG.gain, t, dur, { f: 0.9, depth: 0.35 });

      const hissG = p.gain(0.75, out);
      const hissF = p.filter('bandpass', 2600, 1.0, hissG);
      const hiss = p.noise('white', t, dur, 1, hissF);
      p.lfo(hissG.gain, t, dur, { f: 2.7, depth: 0.2 });

      const whineG = p.gain(0.2, out);
      const whineF = p.filter('bandpass', 5200, 4, whineG);
      const whine = p.noise('white', t, dur, 1, whineF);

      const subG = p.gain(0.5, out);
      const subF = p.filter('lowpass', 180, 0.7, subG);
      const sub = p.osc('sawtooth', 52, t, dur, subF);

      const sources = [roar, hiss, whine];
      const setRate = (r, now, tc = 0.08) => {
        for (const s of sources) s.playbackRate.setTargetAtTime(r, now, tc);
        sub.frequency.setTargetAtTime(52 * r, now, tc);
        hissF.frequency.setTargetAtTime(2600 * r, now, tc);
        whineF.frequency.setTargetAtTime(5200 * r, now, tc);
      };
      const setIntensity = (v, now) => out.gain.setTargetAtTime(v, now, 0.15);

      if (o.offline) {
        // Scripted pass-by: approach (rate 1.3, quiet) → overhead (loud) → recede (rate 0.72).
        const mid = t + dur * 0.5;
        setRate(1.3, t, 0.001);
        for (const s of sources) {
          s.playbackRate.setValueAtTime(1.3, t);
          s.playbackRate.linearRampToValueAtTime(1.15, mid - 0.4);
          s.playbackRate.linearRampToValueAtTime(0.8, mid + 0.4);
          s.playbackRate.linearRampToValueAtTime(0.72, t + dur);
        }
        sub.frequency.setValueAtTime(52 * 1.3, t);
        sub.frequency.linearRampToValueAtTime(52 * 0.75, mid + 0.5);
        hissF.frequency.setValueAtTime(2600 * 1.3, t);
        hissF.frequency.linearRampToValueAtTime(2600 * 0.75, mid + 0.5);
        out.gain.setValueAtTime(0.1, t);
        out.gain.exponentialRampToValueAtTime(1.0, mid);
        out.gain.exponentialRampToValueAtTime(0.06, t + dur);
      }
      return p.handle({ end: o.offline ? t + dur : Infinity, setRate, setIntensity });
    },
  },

  /** Sonic crack as the jet passes overhead. */
  jet_boom: {
    bus: 'voice',
    gain: 1,
    spatial: { ...EXPLOSION_SPATIAL, ref: 30, delay: false },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const out = p.gain(1);
      p.tone(t, { f: 48, f1: 30, sweepDur: 0.3, peak: 0.7, a: 0.004, hold: 0.02, tau: 0.1, to: out });
      p.burst(t, { peak: 1.4, a: 0.002, tau: 0.05, type: 'lowpass', f: 500, q: 0.6, to: out });
      p.burst(t, { peak: 2.4, a: 0.001, tau: 0.03, type: 'bandpass', f: 1200, q: 0.6, to: out });
      p.burst(t, { peak: 1.0, a: 0.0005, tau: 0.01, type: 'highpass', f: 2500, q: 0.7, to: out });
      p.send(out, 0.25);
      return p.handle();
    },
  },

  /** Falling bomb whistle: 2.2→0.6 kHz over the fall, swelling as it nears the ground. */
  bomb_whistle: {
    bus: 'voice',
    gain: 0.65,
    spatial: { ref: 12, rolloff: 0.6, max: 600, model: 'HRTF', absorb: 0.5 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const D = clamp(o.duration || 2.2, 0.5, 6);
      const k = p.pitch * vary(0.05);
      const g = p.gain(0);
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + D);
      g.gain.setTargetAtTime(0, t + D, 0.015);
      const s = p.osc('sine', 2200 * k, t, D + 0.1, g);
      p.sweep(s.frequency, t, 2200 * k, 600 * k, D);
      p.lfo(s.detune, t, D + 0.1, { f: 7, depth: 25 });
      const s2 = p.osc('triangle', 2200 * k, t, D + 0.1, p.gain(0.25, g));
      p.sweep(s2.frequency, t, 2200 * k, 600 * k, D);
      const nf = p.filter('bandpass', 2200 * k, 9, p.gain(0.5, g));
      p.sweep(nf.frequency, t, 2200 * k, 600 * k, D);
      p.noise('white', t, D + 0.1, 1, nf);
      p.mark(t + D + 0.15);
      return p.handle();
    },
  },
};
