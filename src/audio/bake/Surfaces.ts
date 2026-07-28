/**
 * Surfaces: what the world sounds like when you walk on it and when you shoot
 * it. Both sets are driven from one table per material so a footstep and a
 * bullet impact on the same surface share a family resemblance without being
 * the same recipe — the impact is the same material excited far harder and far
 * faster.
 */

import type { SurfaceKind } from '../../core/Events';
import type { Bakery } from './Bakery';
import {
  Clip,
  type Mode,
  type NoiseColor,
  Rng,
  clip,
  fadeEdges,
  filter,
  modal,
  noise,
  normalise,
  perc,
  removeDc,
  scale,
  scatterGrains,
  shapeTanh,
  sweep,
  tone,
  white,
} from '../dsp/Kernel';

/** Surfaces the events can name, plus the aggregate the world calls gravel. */
export type StepSurface = SurfaceKind | 'gravel';

export const STEP_SURFACES: readonly StepSurface[] = [
  'concrete',
  'metal',
  'wood',
  'sand',
  'dirt',
  'gravel',
  'glass',
  'water',
  'flesh',
  'foliage',
  'fabric',
  'rubber',
  'plaster',
];

interface StepRecipe {
  /** Body weight landing: a short low tone. */
  heelHz: number;
  heelDecay: number;
  heelGain: number;
  /** The surface's own noise. */
  color: NoiseColor;
  bandHz: number;
  bandQ: number;
  /** Sweep the band down over the step, which is how a footfall settles. */
  bandTo?: number;
  bodyDecay: number;
  bodyGain: number;
  /** Loose material displaced by the foot. */
  grains?: { count: number; length: number; spread: number; gain: number; hz: number };
  /** Structure the step excites: a walkway, a floorboard, a pane. */
  modes?: Mode[];
  modeGain?: number;
  length: number;
  hp?: number;
  lp?: number;
  peak: number;
}

const STEPS: Record<StepSurface, StepRecipe> = {
  concrete: {
    heelHz: 92,
    heelDecay: 0.028,
    heelGain: 0.5,
    color: 'white',
    bandHz: 2300,
    bandQ: 0.9,
    bandTo: 900,
    bodyDecay: 0.028,
    bodyGain: 0.55,
    length: 0.19,
    hp: 90,
    peak: 0.62,
  },
  plaster: {
    heelHz: 84,
    heelDecay: 0.03,
    heelGain: 0.44,
    color: 'pink',
    bandHz: 1500,
    bandQ: 0.8,
    bandTo: 620,
    bodyDecay: 0.036,
    bodyGain: 0.5,
    grains: { count: 5, length: 0.004, spread: 0.05, gain: 0.16, hz: 3600 },
    length: 0.2,
    hp: 80,
    lp: 7000,
    peak: 0.55,
  },
  metal: {
    heelHz: 110,
    heelDecay: 0.02,
    heelGain: 0.42,
    color: 'white',
    bandHz: 3400,
    bandQ: 1.1,
    bodyDecay: 0.014,
    bodyGain: 0.45,
    modes: [
      { freq: 214, decay: 0.4, gain: 0.7 },
      { freq: 618, decay: 0.28, gain: 0.5 },
      { freq: 1370, decay: 0.16, gain: 0.32 },
      { freq: 2620, decay: 0.09, gain: 0.2 },
    ],
    modeGain: 0.75,
    length: 0.55,
    hp: 70,
    peak: 0.7,
  },
  wood: {
    heelHz: 76,
    heelDecay: 0.034,
    heelGain: 0.55,
    color: 'pink',
    bandHz: 800,
    bandQ: 1,
    bandTo: 380,
    bodyDecay: 0.03,
    bodyGain: 0.5,
    modes: [
      { freq: 168, decay: 0.11, gain: 0.65 },
      { freq: 396, decay: 0.075, gain: 0.4 },
      { freq: 905, decay: 0.04, gain: 0.22 },
    ],
    modeGain: 0.6,
    length: 0.3,
    hp: 60,
    lp: 9000,
    peak: 0.66,
  },
  sand: {
    heelHz: 70,
    heelDecay: 0.032,
    heelGain: 0.3,
    color: 'pink',
    bandHz: 1050,
    bandQ: 0.55,
    bandTo: 420,
    bodyDecay: 0.075,
    bodyGain: 0.6,
    grains: { count: 9, length: 0.006, spread: 0.09, gain: 0.2, hz: 2600 },
    length: 0.26,
    hp: 55,
    lp: 6500,
    peak: 0.42,
  },
  dirt: {
    heelHz: 74,
    heelDecay: 0.03,
    heelGain: 0.4,
    color: 'pink',
    bandHz: 1350,
    bandQ: 0.7,
    bandTo: 520,
    bodyDecay: 0.05,
    bodyGain: 0.55,
    grains: { count: 12, length: 0.005, spread: 0.075, gain: 0.28, hz: 3100 },
    length: 0.24,
    hp: 60,
    lp: 8000,
    peak: 0.5,
  },
  gravel: {
    heelHz: 80,
    heelDecay: 0.024,
    heelGain: 0.34,
    color: 'white',
    bandHz: 2100,
    bandQ: 0.75,
    bandTo: 900,
    bodyDecay: 0.035,
    bodyGain: 0.42,
    grains: { count: 22, length: 0.0035, spread: 0.085, gain: 0.5, hz: 4200 },
    length: 0.26,
    hp: 110,
    peak: 0.6,
  },
  glass: {
    heelHz: 96,
    heelDecay: 0.018,
    heelGain: 0.3,
    color: 'white',
    bandHz: 5200,
    bandQ: 1.2,
    bodyDecay: 0.02,
    bodyGain: 0.4,
    grains: { count: 16, length: 0.008, spread: 0.11, gain: 0.4, hz: 7200 },
    modes: [
      { freq: 3180, decay: 0.1, gain: 0.4 },
      { freq: 5400, decay: 0.07, gain: 0.3 },
    ],
    modeGain: 0.5,
    length: 0.34,
    hp: 400,
    peak: 0.6,
  },
  water: {
    heelHz: 64,
    heelDecay: 0.04,
    heelGain: 0.35,
    color: 'white',
    bandHz: 1500,
    bandQ: 0.6,
    bandTo: 2900,
    bodyDecay: 0.09,
    bodyGain: 0.55,
    grains: { count: 14, length: 0.01, spread: 0.13, gain: 0.3, hz: 3800 },
    length: 0.35,
    hp: 130,
    lp: 9000,
    peak: 0.55,
  },
  flesh: {
    heelHz: 62,
    heelDecay: 0.036,
    heelGain: 0.5,
    color: 'brown',
    bandHz: 480,
    bandQ: 0.7,
    bandTo: 200,
    bodyDecay: 0.045,
    bodyGain: 0.5,
    length: 0.2,
    lp: 2600,
    peak: 0.5,
  },
  foliage: {
    heelHz: 0,
    heelDecay: 0.02,
    heelGain: 0,
    color: 'white',
    bandHz: 3900,
    bandQ: 0.7,
    bodyDecay: 0.06,
    bodyGain: 0.34,
    grains: { count: 26, length: 0.006, spread: 0.15, gain: 0.34, hz: 5200 },
    length: 0.3,
    hp: 700,
    peak: 0.4,
  },
  fabric: {
    heelHz: 66,
    heelDecay: 0.026,
    heelGain: 0.24,
    color: 'pink',
    bandHz: 1900,
    bandQ: 0.55,
    bandTo: 700,
    bodyDecay: 0.055,
    bodyGain: 0.34,
    length: 0.22,
    hp: 180,
    lp: 6000,
    peak: 0.34,
  },
  rubber: {
    heelHz: 88,
    heelDecay: 0.02,
    heelGain: 0.4,
    color: 'pink',
    bandHz: 760,
    bandQ: 1.4,
    bandTo: 460,
    bodyDecay: 0.03,
    bodyGain: 0.42,
    length: 0.18,
    hp: 90,
    lp: 4200,
    peak: 0.5,
  },
};

/**
 * Footsteps.
 *
 * Four variants per surface, each a different roll of the material's own dice:
 * a different grain scatter, a different modal detune, a different band centre.
 * Weight — walking, running, crouching, landing — is applied live as gain,
 * playback rate and filtering, plus an extra heel layer for the heavy cases, so
 * a sprint is not a loud walk.
 */
export function bakeFootsteps(b: Bakery, surfaces: readonly StepSurface[] = STEP_SURFACES): void {
  const sr = b.sampleRate;
  for (const s of surfaces) {
    const name = `step:${s}`;
    if (b.has(name)) continue;
    const r = STEPS[s];
    const rng = b.stream(name);
    const count = b.variants(4);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, r.length);
      const d = c.channels[0];
      const jitter = 1 + rng.bi() * 0.12;

      if (r.heelGain > 0) {
        const heel = new Float32Array(d.length);
        tone(heel, sr, r.heelHz * jitter, r.heelDecay * 3, {
          toFreq: r.heelHz * 0.6 * jitter,
          glide: r.heelDecay,
          gain: r.heelGain,
        });
        perc(heel, sr, 0.0009, r.heelDecay, 2.2);
        for (let i = 0; i < d.length; i++) d[i] += heel[i];
      }

      const body = new Float32Array(d.length);
      noise(body, rng, r.color, 1);
      if (r.bandTo) {
        sweep(body, sr, 'bandpass', r.bandHz * jitter, r.bandTo * jitter, r.bodyDecay * 1.6, r.bandQ, 1.4);
      } else {
        filter(body, sr, 'bandpass', r.bandHz * jitter, r.bandQ);
      }
      perc(body, sr, 0.0007, r.bodyDecay, 2.1);
      scale(body, r.bodyGain * 2.4);
      for (let i = 0; i < d.length; i++) d[i] += body[i];

      if (r.grains) {
        const src = new Float32Array(Math.round(0.05 * sr));
        white(src, rng, 1);
        filter(src, sr, 'bandpass', r.grains.hz * jitter, 1.6);
        const g = new Float32Array(d.length);
        scatterGrains(g, src, sr, rng, {
          spread: r.grains.spread,
          count: r.grains.count,
          length: r.grains.length,
          rateMin: 0.7,
          rateMax: 1.8,
          gain: r.grains.gain * 2.2,
          clumping: 1.8,
          flip: true,
        });
        for (let i = 0; i < d.length; i++) d[i] += g[i];
      }

      if (r.modes) {
        const ex = new Float32Array(Math.round(0.003 * sr));
        white(ex, rng, 1);
        perc(ex, sr, 0.0002, 0.0011, 2.6);
        const m = new Float32Array(d.length);
        modal(m, ex, sr, r.modes, 0, 0.05, rng);
        scale(m, (r.modeGain ?? 0.5) * 2);
        for (let i = 0; i < d.length; i++) d[i] += m[i];
      }

      if (r.hp) filter(d, sr, 'highpass', r.hp, 0.7);
      if (r.lp) filter(d, sr, 'lowpass', r.lp, 0.7);
      removeDc(d);
      normalise(d, r.peak * (0.9 + rng.next() * 0.2));
      fadeEdges(d, sr, 0.0002, 0.01);
      clips.push(c);
    }
    b.set(name, clips);
  }
}

/**
 * The heel layer a heavy footfall or a landing adds on top of the surface's
 * own sound: more weight through the boot, more body in the floor. Two clips,
 * scaled and pitched live.
 */
export function bakeFootstepWeight(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('stepweight');
  const clips: Clip[] = [];
  for (let v = 0; v < 3; v++) {
    const c = clip(sr, 0.24);
    const d = c.channels[0];
    tone(d, sr, 78 * (1 + rng.bi() * 0.1), 0.16, { toFreq: 42, glide: 0.07, gain: 1 });
    const thud = new Float32Array(d.length);
    noise(thud, rng, 'brown', 1);
    filter(thud, sr, 'lowpass', 260, 1.1, 0, 2);
    perc(thud, sr, 0.0012, 0.035, 2);
    scale(thud, 1.4);
    for (let i = 0; i < d.length; i++) d[i] += thud[i];
    perc(d, sr, 0.0011, 0.055, 1.9);
    shapeTanh(d, 1.6, 0.5);
    removeDc(d);
    normalise(d, 0.8);
    fadeEdges(d, sr, 0.0004, 0.02);
    clips.push(c);
  }
  b.set('step_weight', clips);
}

/* =============================== impacts =============================== */

interface ImpactRecipe {
  /** The strike: a very short broadband crack. */
  crackHz: number;
  crackDecay: number;
  crackGain: number;
  /** The material's spray, dust or splinter. */
  color: NoiseColor;
  bandHz: number;
  bandTo?: number;
  bandQ: number;
  bodyDecay: number;
  bodyGain: number;
  /** What the material rings at afterwards. */
  modes?: Mode[];
  modeGain?: number;
  modeDetune?: number;
  /** Debris thrown off the strike. */
  grains?: { count: number; length: number; spread: number; gain: number; hz: number };
  /** Sub thump, for anything with mass behind it. */
  thumpHz?: number;
  thumpGain?: number;
  length: number;
  hp?: number;
  lp?: number;
  peak: number;
}

const IMPACTS: Record<string, ImpactRecipe> = {
  concrete: {
    crackHz: 3600,
    crackDecay: 0.0022,
    crackGain: 1,
    color: 'white',
    bandHz: 2400,
    bandTo: 700,
    bandQ: 0.8,
    bodyDecay: 0.035,
    bodyGain: 0.6,
    grains: { count: 12, length: 0.004, spread: 0.16, gain: 0.3, hz: 3800 },
    thumpHz: 120,
    thumpGain: 0.3,
    length: 0.34,
    hp: 90,
    peak: 0.8,
  },
  plaster: {
    crackHz: 2600,
    crackDecay: 0.0026,
    crackGain: 0.72,
    color: 'pink',
    bandHz: 1500,
    bandTo: 520,
    bandQ: 0.7,
    bodyDecay: 0.05,
    bodyGain: 0.66,
    grains: { count: 14, length: 0.005, spread: 0.2, gain: 0.26, hz: 2900 },
    thumpHz: 105,
    thumpGain: 0.22,
    length: 0.36,
    hp: 80,
    lp: 9000,
    peak: 0.66,
  },
  // A round on sheet steel is mostly ring: the strike itself is a click barely
  // longer than a sample, and what carries is the plate's modes. Keeping the
  // click low against the modes is what makes the ping read as metal rather
  // than as a snare hit.
  metal: {
    crackHz: 5200,
    crackDecay: 0.0016,
    crackGain: 0.5,
    color: 'white',
    bandHz: 4200,
    bandQ: 1.2,
    bodyDecay: 0.012,
    bodyGain: 0.3,
    modes: [
      { freq: 780, decay: 0.42, gain: 0.55 },
      { freq: 1840, decay: 0.34, gain: 0.7 },
      { freq: 3120, decay: 0.26, gain: 0.5 },
      { freq: 4870, decay: 0.16, gain: 0.34 },
      { freq: 7350, decay: 0.09, gain: 0.2 },
    ],
    modeGain: 1.6,
    modeDetune: 0.09,
    length: 0.62,
    hp: 180,
    peak: 0.86,
  },
  wood: {
    crackHz: 2200,
    crackDecay: 0.0028,
    crackGain: 0.8,
    color: 'pink',
    bandHz: 1150,
    bandTo: 420,
    bandQ: 0.9,
    bodyDecay: 0.04,
    bodyGain: 0.62,
    modes: [
      { freq: 285, decay: 0.09, gain: 0.6 },
      { freq: 640, decay: 0.06, gain: 0.4 },
      { freq: 1420, decay: 0.035, gain: 0.24 },
    ],
    modeGain: 0.7,
    grains: { count: 8, length: 0.006, spread: 0.13, gain: 0.22, hz: 2600 },
    thumpHz: 95,
    thumpGain: 0.34,
    length: 0.34,
    hp: 70,
    lp: 11000,
    peak: 0.74,
  },
  sand: {
    crackHz: 1400,
    crackDecay: 0.0035,
    crackGain: 0.34,
    color: 'pink',
    bandHz: 900,
    bandTo: 340,
    bandQ: 0.5,
    bodyDecay: 0.075,
    bodyGain: 0.85,
    grains: { count: 16, length: 0.006, spread: 0.24, gain: 0.28, hz: 2200 },
    thumpHz: 85,
    thumpGain: 0.36,
    length: 0.4,
    hp: 55,
    lp: 5200,
    peak: 0.56,
  },
  dirt: {
    crackHz: 1900,
    crackDecay: 0.003,
    crackGain: 0.46,
    color: 'pink',
    bandHz: 1250,
    bandTo: 430,
    bandQ: 0.6,
    bodyDecay: 0.06,
    bodyGain: 0.8,
    grains: { count: 18, length: 0.005, spread: 0.22, gain: 0.34, hz: 2900 },
    thumpHz: 92,
    thumpGain: 0.34,
    length: 0.38,
    hp: 60,
    lp: 7000,
    peak: 0.62,
  },
  gravel: {
    crackHz: 3000,
    crackDecay: 0.0024,
    crackGain: 0.7,
    color: 'white',
    bandHz: 2200,
    bandTo: 800,
    bandQ: 0.7,
    bodyDecay: 0.03,
    bodyGain: 0.5,
    grains: { count: 24, length: 0.0035, spread: 0.2, gain: 0.5, hz: 4000 },
    thumpHz: 100,
    thumpGain: 0.24,
    length: 0.36,
    hp: 110,
    peak: 0.7,
  },
  glass: {
    crackHz: 6200,
    crackDecay: 0.0014,
    crackGain: 0.9,
    color: 'white',
    bandHz: 6400,
    bandQ: 1.4,
    bodyDecay: 0.014,
    bodyGain: 0.4,
    modes: [
      { freq: 2870, decay: 0.13, gain: 0.5 },
      { freq: 4310, decay: 0.1, gain: 0.44 },
      { freq: 6650, decay: 0.075, gain: 0.34 },
      { freq: 9200, decay: 0.05, gain: 0.2 },
    ],
    modeGain: 0.8,
    modeDetune: 0.12,
    grains: { count: 14, length: 0.007, spread: 0.18, gain: 0.3, hz: 7600 },
    length: 0.42,
    hp: 500,
    peak: 0.78,
  },
  water: {
    crackHz: 1600,
    crackDecay: 0.0035,
    crackGain: 0.3,
    color: 'white',
    bandHz: 1200,
    bandTo: 3600,
    bandQ: 0.7,
    bodyDecay: 0.06,
    bodyGain: 0.8,
    grains: { count: 18, length: 0.009, spread: 0.26, gain: 0.3, hz: 4200 },
    thumpHz: 130,
    thumpGain: 0.3,
    length: 0.44,
    hp: 120,
    lp: 9500,
    peak: 0.6,
  },
  flesh: {
    crackHz: 1300,
    crackDecay: 0.0028,
    crackGain: 0.42,
    color: 'brown',
    bandHz: 520,
    bandTo: 190,
    bandQ: 0.8,
    bodyDecay: 0.05,
    bodyGain: 0.9,
    thumpHz: 78,
    thumpGain: 0.55,
    length: 0.3,
    lp: 2400,
    peak: 0.68,
  },
  foliage: {
    crackHz: 4200,
    crackDecay: 0.0018,
    crackGain: 0.34,
    color: 'white',
    bandHz: 4400,
    bandQ: 0.7,
    bodyDecay: 0.05,
    bodyGain: 0.36,
    grains: { count: 22, length: 0.005, spread: 0.19, gain: 0.36, hz: 5600 },
    length: 0.3,
    hp: 800,
    peak: 0.46,
  },
  fabric: {
    crackHz: 1800,
    crackDecay: 0.0024,
    crackGain: 0.3,
    color: 'pink',
    bandHz: 1600,
    bandTo: 600,
    bandQ: 0.6,
    bodyDecay: 0.04,
    bodyGain: 0.44,
    thumpHz: 90,
    thumpGain: 0.2,
    length: 0.24,
    hp: 150,
    lp: 6500,
    peak: 0.44,
  },
  rubber: {
    crackHz: 1500,
    crackDecay: 0.0026,
    crackGain: 0.4,
    color: 'pink',
    bandHz: 700,
    bandTo: 330,
    bandQ: 1.5,
    bodyDecay: 0.028,
    bodyGain: 0.5,
    modes: [{ freq: 320, decay: 0.05, gain: 0.4 }],
    modeGain: 0.4,
    thumpHz: 105,
    thumpGain: 0.3,
    length: 0.24,
    hp: 90,
    lp: 4000,
    peak: 0.56,
  },
};

export const IMPACT_SURFACES: readonly string[] = Object.keys(IMPACTS);

export function bakeImpacts(b: Bakery, surfaces: readonly string[] = IMPACT_SURFACES): void {
  const sr = b.sampleRate;
  for (const s of surfaces) {
    const name = `impact:${s}`;
    if (b.has(name)) continue;
    const r = IMPACTS[s];
    if (!r) continue;
    const rng = b.stream(name);
    const count = b.variants(4);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, r.length);
      const d = c.channels[0];
      const jitter = 1 + rng.bi() * 0.1;

      // Strike.
      const cr = new Float32Array(d.length);
      white(cr, rng, 1);
      filter(cr, sr, 'highpass', r.crackHz * jitter, 0.7);
      perc(cr, sr, 0.00005, r.crackDecay, 2.8);
      cr[0] += 0.5 * r.crackGain;
      scale(cr, r.crackGain * 1.8);
      for (let i = 0; i < d.length; i++) d[i] += cr[i];

      // Spray.
      const body = new Float32Array(d.length);
      noise(body, rng, r.color, 1);
      if (r.bandTo) {
        sweep(body, sr, 'bandpass', r.bandHz * jitter, r.bandTo * jitter, r.bodyDecay * 2, r.bandQ, 1.5);
      } else {
        filter(body, sr, 'bandpass', r.bandHz * jitter, r.bandQ);
      }
      perc(body, sr, 0.0004, r.bodyDecay, 2);
      scale(body, r.bodyGain * 2.6);
      for (let i = 0; i < d.length; i++) d[i] += body[i];

      // Ring.
      if (r.modes) {
        const ex = new Float32Array(Math.round(0.002 * sr));
        white(ex, rng, 1);
        perc(ex, sr, 0.00004, 0.0007, 3);
        const m = new Float32Array(d.length);
        modal(m, ex, sr, r.modes, 0, r.modeDetune ?? 0.06, rng);
        scale(m, (r.modeGain ?? 0.6) * 2.4);
        for (let i = 0; i < d.length; i++) d[i] += m[i];
      }

      // Debris.
      if (r.grains) {
        const src = new Float32Array(Math.round(0.05 * sr));
        white(src, rng, 1);
        filter(src, sr, 'bandpass', r.grains.hz * jitter, 1.5);
        const g = new Float32Array(d.length);
        scatterGrains(g, src, sr, rng, {
          spread: r.grains.spread,
          count: r.grains.count,
          length: r.grains.length,
          rateMin: 0.6,
          rateMax: 2,
          gain: r.grains.gain * 2,
          clumping: 2.2,
          flip: true,
        });
        for (let i = 0; i < d.length; i++) d[i] += g[i];
      }

      if (r.thumpHz && r.thumpGain) {
        const th = new Float32Array(d.length);
        tone(th, sr, r.thumpHz * jitter, 0.08, {
          toFreq: r.thumpHz * 0.5,
          glide: 0.03,
          gain: r.thumpGain,
        });
        perc(th, sr, 0.0008, 0.028, 2.2);
        for (let i = 0; i < d.length; i++) d[i] += th[i];
      }

      if (r.hp) filter(d, sr, 'highpass', r.hp, 0.7);
      if (r.lp) filter(d, sr, 'lowpass', r.lp, 0.7);
      removeDc(d);
      normalise(d, r.peak * (0.92 + rng.next() * 0.16));
      // The strike is sample zero; nothing to smooth and everything to lose.
      fadeEdges(d, sr, 0, 0.012);
      clips.push(c);
    }
    b.set(name, clips);
  }
}

/**
 * A pane letting go. Live granular would be the obvious way, but forty grains
 * is forty voices; scattering them at sample level costs one. The strike is
 * followed by a shower whose density falls as the pieces land.
 */
export function bakeGlassShatter(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('glass_shatter');
  const count = b.variants(3);
  const clips: Clip[] = [];
  for (let v = 0; v < count; v++) {
    const c = clip(sr, 1.35, 2);
    // A palette of short shards, each a couple of glass modes.
    const shardLen = Math.round(0.09 * sr);
    const palette = new Float32Array(shardLen * 6);
    for (let s = 0; s < 6; s++) {
      const off = s * shardLen;
      const ex = new Float32Array(shardLen);
      white(ex, rng, 1);
      perc(ex, sr, 0.00004, 0.0006, 3);
      const one = new Float32Array(shardLen);
      modal(
        one,
        ex,
        sr,
        [
          { freq: rng.range(2400, 9000), decay: rng.range(0.02, 0.075), gain: 0.7 },
          { freq: rng.range(3600, 12000), decay: rng.range(0.012, 0.05), gain: 0.45 },
        ],
        0,
        0,
      );
      normalise(one, 0.9);
      for (let i = 0; i < shardLen; i++) palette[off + i] = one[i];
    }

    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      // The break itself.
      const brk = new Float32Array(d.length);
      white(brk, rng, 1);
      filter(brk, sr, 'highpass', 2600, 0.7);
      perc(brk, sr, 0.00006, 0.012, 2.4);
      brk[0] += 0.6;
      scale(brk, 1.8);
      for (let i = 0; i < d.length; i++) d[i] += brk[i];
      // The shower: dense at first, thinning as the floor fills up.
      scatterGrains(d, palette, sr, rng, {
        spread: 1.05,
        count: Math.round(70 * (0.5 + 0.5 * b.quality)),
        length: 0.05,
        lengthJitter: 0.7,
        rateMin: 0.7,
        rateMax: 1.9,
        gain: 0.5,
        clumping: 2.4,
        flip: true,
      });
      filter(d, sr, 'highpass', 900, 0.7);
      removeDc(d);
      fadeEdges(d, sr, 0, 0.09);
    }
    let pk = 0;
    for (const ch of c.channels) for (let i = 0; i < ch.length; i++) pk = Math.max(pk, Math.abs(ch[i]));
    if (pk > 1e-6) for (const ch of c.channels) scale(ch, 0.8 / pk);
    clips.push(c);
  }
  b.set('glass_shatter', clips);
}
