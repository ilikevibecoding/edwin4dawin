import { Patch, rnd, vary } from '../synth.js';

/**
 * Bullet impacts per surface, all spatialized at the hit point (HRTF, tight rolloff so close hits pop).
 */

// Generous rolloff: most hits land 10–40 m away and still need to read (≈ -10 dB @15 m, -16 dB @30 m).
const IMPACT_SPATIAL = { ref: 4, rolloff: 0.8, max: 150, model: 'HRTF', absorb: 1 };

function impact(build) {
  return { bus: 'world', gain: 0.9, minInterval: 0.015, spatial: IMPACT_SPATIAL, build };
}

function debrisTicks(p, t, { n = 2, peak = 0.18, fLo = 4500, fHi = 7000, spread = 0.09 } = {}) {
  for (let i = 0; i < n; i++) p.burst(t + 0.05 + rnd(0, spread), { peak: peak * vary(0.3), a: 0.001, tau: 0.003, type: 'bandpass', f: rnd(fLo, fHi), q: 2 });
}

export const impactSounds = {
  impact_stone: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.burst(t, { peak: 1.4, a: 0.0005, tau: 0.012, type: 'bandpass', f: 2600 * k, q: 0.7 });
    p.burst(t, { peak: 0.9, a: 0.001, tau: 0.018, type: 'bandpass', f: 700 * k, q: 0.8 });
    p.tone(t, { f: 130 * k, f1: 80 * k, peak: 0.4, a: 0.001, tau: 0.016 });
    debrisTicks(p, t, { n: 3, peak: 0.3 });
    return p.handle();
  }),

  impact_brick: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.burst(t, { peak: 1.3, a: 0.0005, tau: 0.014, type: 'bandpass', f: 2000 * k, q: 0.7 });
    p.burst(t, { peak: 0.9, a: 0.001, tau: 0.02, type: 'bandpass', f: 600 * k, q: 0.8 });
    p.tone(t, { f: 120 * k, f1: 75 * k, peak: 0.4, a: 0.001, tau: 0.018 });
    debrisTicks(p, t, { n: 3, peak: 0.25, fLo: 3000, fHi: 5500 });
    return p.handle();
  }),

  impact_plaster: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.burst(t, { peak: 1.3, a: 0.001, tau: 0.022, type: 'bandpass', f: 1400 * k, q: 0.6 });
    p.tone(t, { f: 110 * k, f1: 70 * k, peak: 0.32, a: 0.001, tau: 0.018 });
    for (let i = 0; i < 3; i++) p.burst(t + 0.03 + i * 0.03 + rnd(0, 0.02), { peak: 0.3, a: 0.002, tau: 0.008, type: 'lowpass', f: 3000, q: 0.7 });
    return p.handle();
  }),

  /** Metal ping + 30 % chance of a ricochet whine. */
  impact_metal: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.click(t, { peak: 0.6, hp: 2500, tau: 0.001 });
    p.metal(t, { freqs: [2200, 3300, 4700, 6100], decay: 0.12, peak: 0.28 });
    p.tone(t, { f: 180 * k, f1: 120 * k, peak: 0.35, a: 0.001, tau: 0.015 });
    p.burst(t, { peak: 0.35, a: 0.0005, tau: 0.008, type: 'bandpass', f: 1600 * k, q: 1 });
    if (Math.random() < 0.3) {
      const f0 = 3200 * k;
      p.tone(t + 0.01, { f: f0, f1: 800 * k, sweepDur: 0.3, peak: 0.35, a: 0.01, hold: 0.05, tau: 0.09 });
      p.burst(t + 0.01, { peak: 0.2, a: 0.01, tau: 0.08, type: 'bandpass', f: f0, f1: 900 * k, sweepDur: 0.3, q: 6 });
    }
    return p.handle();
  }),

  impact_wood: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.tone(t, { type: 'triangle', f: 280 * k, f1: 150 * k, peak: 0.55, a: 0.001, tau: 0.02, lp: 1200 });
    p.burst(t, { peak: 0.45, a: 0.001, tau: 0.012, type: 'bandpass', f: 950 * k, q: 1.1 });
    p.click(t, { peak: 0.3, hp: 2000 });
    debrisTicks(p, t, { n: 2, peak: 0.15, fLo: 2500, fHi: 4500, spread: 0.06 });
    return p.handle();
  }),

  impact_dirt: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.burst(t, { peak: 1.1, a: 0.002, tau: 0.03, type: 'lowpass', f: 1000 * k, q: 0.6 });
    p.tone(t, { f: 85 * k, f1: 55 * k, peak: 0.45, a: 0.002, tau: 0.03 });
    debrisTicks(p, t, { n: 3, peak: 0.2, fLo: 1500, fHi: 3000, spread: 0.12 });
    return p.handle();
  }),

  /** Many high random sine grains front-loaded over 280 ms. */
  impact_glass: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    p.burst(t, { peak: 0.6, a: 0.0005, tau: 0.004, type: 'highpass', f: 3000, q: 0.7 });
    p.burst(t, { peak: 0.3, a: 0.001, tau: 0.02, type: 'bandpass', f: 2200, q: 0.8 });
    for (let i = 0; i < 14; i++) {
      const tt = t + Math.random() ** 2 * 0.28;
      const f = rnd(3000, 9000) * p.pitch;
      p.tone(tt, { f, f1: f * 0.9, peak: rnd(0.1, 0.22), a: 0.001, tau: rnd(0.008, 0.02) });
    }
    return p.handle();
  }),

  impact_water: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.burst(t, { peak: 0.7, a: 0.003, tau: 0.07, type: 'bandpass', f: 1900, f1: 600, sweepDur: 0.25, q: 0.8 });
    p.tone(t + 0.01, { f: 260 * k, f1: 100 * k, peak: 0.4, a: 0.004, tau: 0.035 });
    for (let i = 0; i < 4; i++) {
      const f = rnd(1800, 4200);
      p.tone(t + 0.1 + i * 0.05 + rnd(0, 0.04), { f, f1: f * 0.7, peak: 0.12, a: 0.002, tau: 0.01 });
    }
    return p.handle();
  }),

  /** Wet thud — kept short because the UI hitmarker plays on top of it. */
  impact_flesh: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    const k = p.pitch * vary(0.08);
    p.tone(t, { f: 130 * k, f1: 60 * k, peak: 0.55, a: 0.001, tau: 0.025 });
    p.burst(t, { peak: 1.0, a: 0.001, tau: 0.02, type: 'bandpass', f: 900 * k, f1: 300 * k, sweepDur: 0.06, q: 1 });
    p.click(t, { peak: 0.45, hp: 2000, tau: 0.0015 });
    return p.handle();
  }),

  impact_foliage: impact((ctx, dest, o) => {
    const p = new Patch(ctx, dest, o);
    const t = o.t;
    for (let i = 0; i < 3; i++) p.burst(t + i * 0.03 + rnd(0, 0.02), { peak: 0.3, a: 0.003, tau: 0.02, type: 'bandpass', f: rnd(2200, 4000), q: 0.7 });
    p.burst(t, { peak: 0.2, a: 0.005, tau: 0.04, type: 'bandpass', f: 1000, q: 0.6 });
    return p.handle();
  }),
};

export function impactNameFor(surface) {
  const n = `impact_${surface}`;
  return impactSounds[n] ? n : 'impact_stone';
}
