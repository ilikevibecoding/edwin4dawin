import { Patch, vary, clamp } from '../synth.js';

/**
 * Combat feedback, player state and interface sounds. UI-bus sounds bypass the pause gate / low-health muffle.
 */

/** The COD "tk-tk": two very short sine ticks with a broadband transient and a bit of body. */
function hitTick(p, t, { f1 = 2400, f2 = 3100, peak = 0.55, tau = 0.006, gap = 0.022, body = 0.2, to = p.dest } = {}) {
  p.click(t, { peak: 0.3, hp: 3000, tau: 0.0008, to });
  p.tone(t, { f: f1, peak, a: 0.0008, tau, to });
  p.tone(t, { f: 700, peak: body, a: 0.0008, tau: 0.005, to });
  p.tone(t + gap, { f: f2, peak: peak * 0.82, a: 0.0008, tau, to });
}

function chord(p, t, freqs, { peak = 0.12, a = 0.02, hold = 0.3, tau = 0.15, type = 'triangle', lp = 2400, to = p.dest } = {}) {
  for (const f of freqs) p.tone(t, { type, f: f * vary(0.002), peak, a, hold, tau, lp, to });
}

export const uiSounds = {
  hitmarker: {
    bus: 'ui',
    gain: 1.1,
    minInterval: 0.03,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      hitTick(p, o.t);
      return p.handle();
    },
  },
  hitmarker_head: {
    bus: 'ui',
    gain: 1.1,
    minInterval: 0.03,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      hitTick(p, o.t, { f1: 3200, f2: 4200, peak: 0.5 });
      p.tone(o.t + 0.044, { f: 5200, peak: 0.28, a: 0.0008, tau: 0.007 });
      return p.handle();
    },
  },
  hitmarker_kill: {
    bus: 'ui',
    gain: 1.0,
    minInterval: 0.03,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      hitTick(p, t, { f1: 2000, f2: 2600, tau: 0.012, gap: 0.026, body: 0.3 });
      p.tone(t, { f: 160, f1: 70, sweepDur: 0.08, peak: 0.55, a: 0.002, tau: 0.03 });
      p.burst(t, { peak: 0.25, a: 0.001, tau: 0.02, type: 'lowpass', f: 600, q: 0.7 });
      p.tone(t + 0.06, { f: 3600, peak: 0.25, a: 0.001, tau: 0.008 });
      return p.handle();
    },
  },

  /** Subtle body-drop confirm at the enemy's position. */
  enemy_down: {
    bus: 'world',
    gain: 0.55,
    minInterval: 0.05,
    spatial: { ref: 4, rolloff: 1, max: 80, model: 'HRTF', absorb: 1 },
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t + 0.15;
      p.tone(t, { f: 110, f1: 55, sweepDur: 0.1, peak: 0.6, a: 0.003, tau: 0.04 });
      p.burst(t, { peak: 0.3, a: 0.005, tau: 0.03, type: 'bandpass', f: 600, q: 0.8 });
      p.rattle(t + 0.03, { peak: 0.08 });
      p.rattle(t + 0.12, { peak: 0.04 });
      return p.handle();
    },
  },

  /** Player took damage: flesh hit + low thud + a short pressure whine, scaled by the amount. */
  player_hit: {
    bus: 'voice',
    gain: 1,
    minInterval: 0.05,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const amt = clamp((o.amount ?? 25) / 40, 0.35, 1);
      p.burst(t, { peak: 1.1 * amt, a: 0.001, tau: 0.018, type: 'lowpass', f: 1500, q: 0.7 });
      p.burst(t, { peak: 1.3 * amt, a: 0.001, hold: 0.006, tau: 0.022, type: 'bandpass', f: 800, f1: 250, sweepDur: 0.07, q: 1 });
      p.tone(t, { f: 120, f1: 50, sweepDur: 0.08, peak: 0.75 * amt, a: 0.002, tau: 0.035 });
      p.burst(t, { peak: 0.25 * amt, a: 0.02, tau: 0.04, type: 'bandpass', f: 2500, q: 2 });
      return p.handle();
    },
  },

  /** One "lub-dub" of the low-health heartbeat loop (scheduled by AudioSystem). */
  heartbeat: {
    bus: 'voice',
    gain: 1,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 68, f1: 42, sweepDur: 0.1, peak: 0.4, a: 0.008, tau: 0.035 });
      p.burst(t, { peak: 0.12, a: 0.003, tau: 0.01, type: 'lowpass', f: 300, q: 0.7 });
      p.tone(t + 0.28, { f: 60, f1: 40, sweepDur: 0.1, peak: 0.3, a: 0.008, tau: 0.032 });
      p.burst(t + 0.28, { peak: 0.08, a: 0.003, tau: 0.01, type: 'lowpass', f: 300, q: 0.7 });
      return p.handle();
    },
  },

  /** Death: dull impact, descending drone and a muffled ring. */
  death: {
    bus: 'voice',
    gain: 1,
    minInterval: 0.5,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 90, f1: 38, sweepDur: 0.2, peak: 0.8, a: 0.004, tau: 0.08 });
      p.burst(t, { peak: 0.5, a: 0.002, tau: 0.05, type: 'lowpass', f: 600, q: 0.7 });
      p.tone(t, { type: 'triangle', f: 140, f1: 60, sweepDur: 1.2, peak: 0.15, a: 0.1, hold: 0.5, tau: 0.35, lp: 500 });
      p.tone(t + 0.05, { f: 3200, peak: 0.09, a: 0.05, hold: 0.5, tau: 0.45 });
      return p.handle();
    },
  },

  /** Respawn: clearing riser + two-note confirm. */
  respawn: {
    bus: 'ui',
    gain: 0.7,
    minInterval: 0.5,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.burst(t, { peak: 0.15, a: 0.15, tau: 0.07, type: 'bandpass', f: 400, f1: 2400, sweepDur: 0.3, q: 1 });
      p.tone(t + 0.2, { f: 660, peak: 0.2, a: 0.005, hold: 0.03, tau: 0.03 });
      p.tone(t + 0.3, { f: 990, peak: 0.2, a: 0.005, hold: 0.06, tau: 0.05 });
      return p.handle();
    },
  },

  score_pop: {
    bus: 'ui',
    gain: 0.6,
    minInterval: 0.08,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 660, peak: 0.3, a: 0.003, hold: 0.02, tau: 0.015 });
      p.tone(t + 0.045, { f: 880, peak: 0.3, a: 0.003, hold: 0.03, tau: 0.03 });
      if ((o.points ?? 0) >= 150) p.tone(t + 0.09, { f: 1100, peak: 0.28, a: 0.003, hold: 0.04, tau: 0.04 });
      return p.handle();
    },
  },

  /** Capture progress tick; pitch rises with progress. */
  objective_tick: {
    bus: 'ui',
    gain: 0.75,
    minInterval: 0.2,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const prog = clamp(Math.abs(o.progress ?? 0), 0, 1);
      p.tone(t, { f: 900 * (1 + 0.4 * prog), peak: 0.4, a: 0.002, hold: 0.015, tau: 0.012 });
      p.click(t, { peak: 0.15, hp: 3000 });
      return p.handle();
    },
  },

  objective_captured: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((f, i) => p.tone(t + i * 0.14, { type: 'triangle', f, peak: 0.3, a: 0.01, hold: 0.06, tau: 0.05, lp: 2400 }));
      chord(p, t + 0.42, [523.25, 659.25, 783.99, 1046.5], { peak: 0.12, a: 0.03, hold: 0.4, tau: 0.2 });
      p.tone(t + 0.42, { f: 65, f1: 50, sweepDur: 0.3, peak: 0.3, a: 0.01, hold: 0.1, tau: 0.15 });
      return p.handle();
    },
  },
  objective_lost: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { type: 'triangle', f: 440, peak: 0.3, a: 0.01, hold: 0.12, tau: 0.06, lp: 1800 });
      p.tone(t + 0.2, { type: 'triangle', f: 329.6, peak: 0.3, a: 0.01, hold: 0.2, tau: 0.1, lp: 1500 });
      chord(p, t + 0.2, [220, 261.6, 329.6], { peak: 0.1, a: 0.05, hold: 0.3, tau: 0.25, lp: 1500 });
      return p.handle();
    },
  },

  /** Wave banner: percussive hit + short brass-like sting. */
  wave_sting: {
    bus: 'ui',
    gain: 0.7,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 70, f1: 40, sweepDur: 0.25, peak: 0.6, a: 0.005, tau: 0.1 });
      p.burst(t, { peak: 0.4, a: 0.002, tau: 0.03, type: 'lowpass', f: 900, q: 0.7 });
      const g = p.env(t, { peak: 0.16, a: 0.05, hold: 0.35, tau: 0.15 });
      const lp = p.filter('lowpass', 300, 2, g);
      p.sweep(lp.frequency, t, 300, 1800, 0.5);
      for (const f of [110, 110.6, 164.8]) p.osc('sawtooth', f, t, 1.3, lp);
      return p.handle();
    },
  },

  /** Match end: I → IV progression for a win, minor descending for a loss, timpani hit at the start. */
  match_end: {
    bus: 'ui',
    gain: 0.8,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.tone(t, { f: 65, f1: 42, sweepDur: 0.4, peak: 0.6, a: 0.006, hold: 0.05, tau: 0.25 });
      p.burst(t, { peak: 0.3, a: 0.003, tau: 0.05, type: 'lowpass', f: 700, q: 0.7 });
      if (o.win !== false) {
        chord(p, t, [261.6, 329.6, 392], { peak: 0.13, a: 0.03, hold: 0.45, tau: 0.15 });
        chord(p, t + 0.6, [349.2, 440, 523.25, 698.5], { peak: 0.12, a: 0.04, hold: 0.7, tau: 0.35 });
      } else {
        chord(p, t, [220, 261.6, 329.6], { peak: 0.13, a: 0.03, hold: 0.45, tau: 0.15, lp: 1600 });
        chord(p, t + 0.6, [196, 233.1, 293.7], { peak: 0.12, a: 0.05, hold: 0.7, tau: 0.4, lp: 1400 });
      }
      return p.handle();
    },
  },

  ui_click: {
    bus: 'ui',
    gain: 0.7,
    minInterval: 0.03,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      p.tone(o.t, { f: 1800, peak: 0.42, a: 0.0005, tau: 0.005 });
      p.tone(o.t, { f: 600, peak: 0.15, a: 0.0005, tau: 0.004 });
      p.click(o.t, { peak: 0.3, hp: 2500, tau: 0.001 });
      return p.handle();
    },
  },
  ui_hover: {
    bus: 'ui',
    gain: 0.7,
    minInterval: 0.03,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      p.tone(o.t, { f: 2400, peak: 0.4, a: 0.0005, tau: 0.004 });
      return p.handle();
    },
  },
  ui_confirm: {
    bus: 'ui',
    gain: 0.7,
    minInterval: 0.05,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      p.tone(o.t, { f: 880, peak: 0.25, a: 0.003, hold: 0.02, tau: 0.015 });
      p.tone(o.t + 0.06, { f: 1320, peak: 0.25, a: 0.003, hold: 0.04, tau: 0.03 });
      return p.handle();
    },
  },
  ui_back: {
    bus: 'ui',
    gain: 0.7,
    minInterval: 0.05,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      p.tone(o.t, { f: 1100, peak: 0.22, a: 0.003, hold: 0.02, tau: 0.015 });
      p.tone(o.t + 0.06, { f: 740, peak: 0.22, a: 0.003, hold: 0.03, tau: 0.03 });
      return p.handle();
    },
  },
};
