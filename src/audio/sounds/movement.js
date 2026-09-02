import { Patch, rnd, vary, clamp } from '../synth.js';

/**
 * Player movement: footsteps per surface, jump, land.
 * Footsteps are the player's own so they are not spatialized (centre), mixed well below weapons.
 * Every step has three parts to avoid the "clicky" failure mode: a low knock (weight), a mid body and a short scuff.
 */

function stepLayers(p, t, surface, { k, bright, out }) {
  switch (surface) {
    case 'wood':
      p.tone(t, { type: 'triangle', f: 190 * k, f1: 130 * k, peak: 0.55, a: 0.002, tau: 0.022, lp: 900, to: out });
      p.tone(t, { f: 420 * k, peak: 0.2, a: 0.001, tau: 0.015, to: out });
      p.burst(t, { peak: 0.3, a: 0.001, tau: 0.012, type: 'bandpass', f: 850 * k * bright, q: 1.2, to: out });
      p.click(t, { peak: 0.18, hp: 2500, to: out });
      break;
    case 'metal':
      p.click(t, { peak: 0.3, hp: 3000, to: out });
      p.metal(t, { freqs: [1100, 1650, 2400, 3300], decay: 0.08, peak: 0.15, to: out });
      p.tone(t, { f: 95 * k, f1: 70 * k, peak: 0.45, a: 0.002, tau: 0.02, to: out });
      p.burst(t, { peak: 0.4, a: 0.001, tau: 0.01, type: 'bandpass', f: 2200 * bright, q: 0.8, to: out });
      break;
    case 'dirt':
      p.burst(t, { peak: 0.45, a: 0.004, tau: 0.035, type: 'lowpass', f: 2400 * k * bright, q: 0.5, to: out });
      for (let i = 0; i < 3; i++) p.burst(t + 0.02 + i * 0.025 + rnd(0, 0.01), { peak: 0.2, a: 0.001, tau: 0.004, type: 'bandpass', f: rnd(1800, 3300), q: 1.5, to: out });
      p.tone(t, { f: 90 * k, f1: 60 * k, peak: 0.4, a: 0.003, tau: 0.025, to: out });
      break;
    case 'foliage':
      for (let i = 0; i < 4; i++) p.burst(t + i * 0.035 + rnd(0, 0.015), { peak: 0.22, a: 0.005, tau: 0.015, type: 'bandpass', f: rnd(2600, 4400) * bright, q: 0.7, to: out });
      p.burst(t, { peak: 0.16, a: 0.01, tau: 0.045, type: 'bandpass', f: 1200, q: 0.5, to: out });
      p.tone(t, { f: 85 * k, f1: 60 * k, peak: 0.2, a: 0.004, tau: 0.025, to: out });
      break;
    case 'water':
      p.burst(t, { peak: 0.45, a: 0.004, tau: 0.06, type: 'bandpass', f: 1900 * bright, f1: 650, sweepDur: 0.2, q: 0.8, to: out });
      p.tone(t + 0.01, { f: 320 * k, f1: 130 * k, peak: 0.35, a: 0.005, tau: 0.03, to: out });
      for (let i = 0; i < 2; i++) {
        const f = rnd(2200, 4000);
        p.tone(t + 0.08 + i * 0.05 + rnd(0, 0.03), { f, f1: f * 0.7, peak: 0.12, a: 0.002, tau: 0.008, to: out });
      }
      break;
    case 'plaster':
      p.burst(t, { peak: 0.5, a: 0.001, tau: 0.016, type: 'bandpass', f: 1200 * k * bright, q: 0.9, to: out });
      p.click(t, { peak: 0.2, hp: 3000, to: out });
      p.tone(t, { f: 130 * k, f1: 90 * k, peak: 0.42, a: 0.002, tau: 0.014, to: out });
      p.burst(t + 0.02, { peak: 0.14, a: 0.01, tau: 0.03, type: 'bandpass', f: 2000 * k, q: 0.6, to: out });
      break;
    case 'brick':
      p.burst(t, { peak: 0.55, a: 0.001, tau: 0.014, type: 'bandpass', f: 1400 * k * bright, q: 1, to: out });
      p.click(t, { peak: 0.3, hp: 3000, to: out });
      p.tone(t, { f: 140 * k, f1: 92 * k, peak: 0.45, a: 0.002, tau: 0.014, to: out });
      p.burst(t + 0.02, { peak: 0.15, a: 0.01, tau: 0.03, type: 'bandpass', f: 2300 * k, q: 0.6, to: out });
      break;
    default: // stone: crisp tap
      p.burst(t, { peak: 0.55, a: 0.001, tau: 0.014, type: 'bandpass', f: 1700 * k * bright, q: 1, to: out });
      p.click(t, { peak: 0.35, hp: 3000, tau: 0.0007, to: out });
      p.tone(t, { f: 150 * k, f1: 95 * k, peak: 0.45, a: 0.002, tau: 0.014, to: out });
      p.burst(t + 0.02, { peak: 0.16, a: 0.01, tau: 0.03, type: 'bandpass', f: 2400 * k, q: 0.6, to: out });
  }
}

function buildStep(surface) {
  return {
    bus: 'world',
    gain: 0.6,
    minInterval: 0.1,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const crouch = !!o.crouch;
      const sprint = !!o.sprint && !crouch;
      const amp = crouch ? 0.5 : sprint ? 1.35 : 1;
      const bright = sprint ? 1.2 : crouch ? 0.85 : 1;
      const k = p.pitch * vary(0.06);
      const out = p.gain(amp);
      const to = crouch ? p.filter('lowpass', 2000, 0.7, out) : out;
      stepLayers(p, t, surface, { k, bright, out: to });
      // Gear rattle: obvious when sprinting, faint when walking, none when crouched.
      if (sprint) p.rattle(t + rnd(0.03, 0.05), { peak: 0.07, to });
      else if (!crouch) p.rattle(t + rnd(0.03, 0.05), { peak: 0.025, to });
      return p.handle();
    },
  };
}

export const SURFACES = ['stone', 'plaster', 'brick', 'wood', 'metal', 'dirt', 'foliage', 'water'];

export const movementSounds = {
  jump: {
    bus: 'world',
    gain: 0.6,
    minInterval: 0.15,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      p.burst(t, { peak: 0.45, a: 0.02, tau: 0.05, type: 'bandpass', f: 600, f1: 1500, sweepDur: 0.12, q: 0.8 });
      p.burst(t, { peak: 0.35, a: 0.001, tau: 0.012, type: 'bandpass', f: 1500, q: 1 });
      p.tone(t, { f: 120, f1: 80, peak: 0.2, a: 0.003, tau: 0.02 });
      p.rattle(t + 0.02, { peak: 0.08 });
      return p.handle();
    },
  },

  /** Landing thud scaled by impact speed (m/s); adds the surface's step layer and a gear rattle. */
  land: {
    bus: 'world',
    gain: 0.6,
    minInterval: 0.1,
    build(ctx, dest, o) {
      const p = new Patch(ctx, dest, o);
      const t = o.t;
      const imp = clamp((o.impact ?? 6) / 12, 0.25, 1.4);
      const out = p.gain(imp);
      p.tone(t, { f: 95, f1: 48, peak: 0.6, a: 0.004, tau: 0.04, to: out });
      p.burst(t, { peak: 0.15, a: 0.003, tau: 0.03, type: 'bandpass', f: 700, q: 0.8, to: out });
      stepLayers(p, t + 0.004, SURFACES.includes(o.surface) ? o.surface : 'stone', { k: p.pitch * 0.92, bright: 1, out });
      p.rattle(t + 0.04, { peak: 0.12, to: out });
      return p.handle();
    },
  },
};

for (const s of SURFACES) movementSounds[`step_${s}`] = buildStep(s);
