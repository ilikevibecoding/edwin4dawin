import type { SfxName } from './AudioTypes';

/**
 * Sound design.
 *
 * Every effect is synthesised at runtime from oscillators and shaped noise —
 * there are no samples in this project. Each function receives a destination
 * node and a start time and is responsible for its own envelope and cleanup.
 */

export interface SfxContext {
  ctx: AudioContext;
  noise: AudioBuffer;
  pinkNoise: AudioBuffer;
}

function env(
  ctx: AudioContext,
  start: number,
  attack: number,
  decay: number,
  peak: number,
  sustain = 0,
  release = 0,
): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
  if (sustain > 0) {
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.6), start + attack + decay);
    g.gain.setValueAtTime(Math.max(0.0002, peak * 0.6), start + attack + decay + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay + sustain + release);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  }
  return g;
}

function noiseSource(c: SfxContext, start: number, duration: number, pink = false): AudioBufferSourceNode {
  const src = c.ctx.createBufferSource();
  src.buffer = pink ? c.pinkNoise : c.noise;
  src.loop = true;
  src.start(start, Math.random() * 1.5, duration + 0.05);
  src.stop(start + duration + 0.05);
  return src;
}

function osc(
  c: SfxContext,
  type: OscillatorType,
  freq: number,
  start: number,
  duration: number,
): OscillatorNode {
  const o = c.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  o.start(start);
  o.stop(start + duration + 0.05);
  return o;
}

type Builder = (c: SfxContext, out: AudioNode, t: number, rate: number) => void;

const builders: Record<SfxName, Builder> = {
  /* ------------------------------------------------------------ weapons */
  laserHeavy: (c, out, t, rate) => {
    const dur = 0.55 / rate;
    const o = osc(c, 'sawtooth', 900 * rate, t, dur);
    o.frequency.exponentialRampToValueAtTime(70 * rate, t + dur * 0.85);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3200, t);
    f.frequency.exponentialRampToValueAtTime(320, t + dur);
    f.Q.value = 6;
    const g = env(c.ctx, t, 0.006, dur, 0.5);
    o.connect(f).connect(g).connect(out);

    const n = noiseSource(c, t, 0.12);
    const nf = c.ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(2600, t);
    nf.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    nf.Q.value = 1.4;
    n.connect(nf).connect(env(c.ctx, t, 0.002, 0.12, 0.32)).connect(out);
  },
  laserLight: (c, out, t, rate) => {
    const dur = 0.28 / rate;
    const o = osc(c, 'square', 1500 * rate, t, dur);
    o.frequency.exponentialRampToValueAtTime(210 * rate, t + dur * 0.8);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1400;
    f.Q.value = 2.4;
    o.connect(f).connect(env(c.ctx, t, 0.004, dur, 0.3)).connect(out);
  },
  blasterRed: (c, out, t, rate) => {
    const dur = 0.19 / rate;
    const o = osc(c, 'sawtooth', 1250 * rate, t, dur);
    o.frequency.exponentialRampToValueAtTime(160 * rate, t + dur);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + dur);
    f.Q.value = 9;
    o.connect(f).connect(env(c.ctx, t, 0.003, dur, 0.34)).connect(out);
    const n = noiseSource(c, t, 0.05);
    const nf = c.ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 2400;
    n.connect(nf).connect(env(c.ctx, t, 0.001, 0.05, 0.16)).connect(out);
  },
  blasterBlue: (c, out, t, rate) => {
    const dur = 0.17 / rate;
    const o = osc(c, 'square', 1750 * rate, t, dur);
    o.frequency.exponentialRampToValueAtTime(240 * rate, t + dur);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(620, t + dur);
    f.Q.value = 5;
    o.connect(f).connect(env(c.ctx, t, 0.002, dur, 0.3)).connect(out);
  },

  /* ------------------------------------------------------------ impacts */
  hullImpact: (c, out, t) => {
    const o = osc(c, 'sine', 96, t, 0.7);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.55);
    o.connect(env(c.ctx, t, 0.004, 0.7, 0.75)).connect(out);
    const n = noiseSource(c, t, 0.42);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(160, t + 0.42);
    n.connect(f).connect(env(c.ctx, t, 0.003, 0.42, 0.4)).connect(out);
  },
  shieldFlash: (c, out, t) => {
    for (const [f0, gain] of [
      [880, 0.16],
      [1320, 0.1],
      [1975, 0.06],
    ] as const) {
      const o = osc(c, 'sine', f0, t, 0.5);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + 0.5);
      o.connect(env(c.ctx, t, 0.004, 0.5, gain)).connect(out);
    }
    const n = noiseSource(c, t, 0.3);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(3400, t);
    f.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    f.Q.value = 3;
    n.connect(f).connect(env(c.ctx, t, 0.002, 0.3, 0.14)).connect(out);
  },
  explosionSmall: (c, out, t) => {
    const n = noiseSource(c, t, 1.5);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3600, t);
    f.frequency.exponentialRampToValueAtTime(90, t + 1.4);
    n.connect(f).connect(env(c.ctx, t, 0.005, 1.5, 0.7)).connect(out);
    const sub = osc(c, 'sine', 120, t, 1.2);
    sub.frequency.exponentialRampToValueAtTime(28, t + 1.0);
    sub.connect(env(c.ctx, t, 0.008, 1.2, 0.85)).connect(out);
  },
  lowBoom: (c, out, t) => {
    const sub = osc(c, 'sine', 76, t, 2.2);
    sub.frequency.exponentialRampToValueAtTime(21, t + 1.8);
    sub.connect(env(c.ctx, t, 0.02, 2.2, 0.85)).connect(out);
    const n = noiseSource(c, t, 1.2);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 140;
    n.connect(f).connect(env(c.ctx, t, 0.03, 1.2, 0.5)).connect(out);
  },
  metalStress: (c, out, t) => {
    for (const [f0, det] of [
      [74, 1.0],
      [111, 1.007],
      [148, 0.994],
    ] as const) {
      const o = osc(c, 'sawtooth', f0 * det, t, 2.6);
      o.frequency.linearRampToValueAtTime(f0 * det * 1.14, t + 2.4);
      const f = c.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = f0 * 4;
      f.Q.value = 7;
      o.connect(f).connect(env(c.ctx, t, 0.4, 1.0, 0.14, 0.7, 0.9)).connect(out);
    }
    const n = noiseSource(c, t, 2.4, true);
    const nf = c.ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.setValueAtTime(420, t);
    nf.frequency.linearRampToValueAtTime(900, t + 2.2);
    nf.Q.value = 4;
    n.connect(nf).connect(env(c.ctx, t, 0.5, 0.8, 0.16, 0.6, 0.8)).connect(out);
  },

  /* -------------------------------------------------------------- doors */
  doorCut: (c, out, t) => {
    const dur = 9;
    const n = noiseSource(c, t, dur);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 9;
    const lfo = osc(c, 'sine', 4.2, t, dur);
    const lfoGain = c.ctx.createGain();
    lfoGain.gain.value = 900;
    lfo.connect(lfoGain).connect(f.frequency);
    const g = env(c.ctx, t, 1.2, 1.5, 0.2, dur - 3.5, 1.2);
    n.connect(f).connect(g).connect(out);

    const hum = osc(c, 'sawtooth', 148, t, dur);
    const hf = c.ctx.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 500;
    hum.connect(hf).connect(env(c.ctx, t, 1.4, 1.5, 0.07, dur - 3.6, 1.2)).connect(out);
  },
  doorBreach: (c, out, t) => {
    const n = noiseSource(c, t, 2.2);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(6000, t);
    f.frequency.exponentialRampToValueAtTime(140, t + 1.8);
    n.connect(f).connect(env(c.ctx, t, 0.004, 2.0, 0.85)).connect(out);
    const sub = osc(c, 'sine', 140, t, 1.8);
    sub.frequency.exponentialRampToValueAtTime(24, t + 1.4);
    sub.connect(env(c.ctx, t, 0.006, 1.8, 0.95)).connect(out);
    // Tumbling debris.
    for (let i = 0; i < 9; i++) {
      const dt = 0.12 + i * 0.09 + (i % 3) * 0.04;
      const cl = noiseSource(c, t + dt, 0.09);
      const cf = c.ctx.createBiquadFilter();
      cf.type = 'bandpass';
      cf.frequency.value = 900 + i * 260;
      cf.Q.value = 12;
      cl.connect(cf).connect(env(c.ctx, t + dt, 0.001, 0.09, 0.22)).connect(out);
    }
  },
  clampRelease: (c, out, t) => {
    for (let i = 0; i < 4; i++) {
      const dt = i * 0.16;
      const o = osc(c, 'triangle', 260 + i * 42, t + dt, 0.3);
      o.frequency.exponentialRampToValueAtTime(90, t + dt + 0.28);
      o.connect(env(c.ctx, t + dt, 0.002, 0.3, 0.35)).connect(out);
      const n = noiseSource(c, t + dt, 0.1);
      const f = c.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      f.Q.value = 8;
      n.connect(f).connect(env(c.ctx, t + dt, 0.001, 0.1, 0.2)).connect(out);
    }
  },

  /* ------------------------------------------------------------ ambient */
  alarm: (c, out, t) => {
    for (let i = 0; i < 2; i++) {
      const dt = i * 0.42;
      const o = osc(c, 'square', i === 0 ? 660 : 495, t + dt, 0.34);
      const f = c.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1500;
      o.connect(f).connect(env(c.ctx, t + dt, 0.02, 0.32, 0.14)).connect(out);
    }
  },
  spark: (c, out, t) => {
    const n = noiseSource(c, t, 0.09);
    const f = c.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 3600;
    n.connect(f).connect(env(c.ctx, t, 0.001, 0.09, 0.24)).connect(out);
  },
  footstep: (c, out, t, rate) => {
    const n = noiseSource(c, t, 0.13);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420 * rate;
    n.connect(f).connect(env(c.ctx, t, 0.002, 0.13, 0.24)).connect(out);
    const o = osc(c, 'sine', 96 * rate, t, 0.14);
    o.frequency.exponentialRampToValueAtTime(52 * rate, t + 0.12);
    o.connect(env(c.ctx, t, 0.002, 0.14, 0.2)).connect(out);
  },

  /* ------------------------------------------------------------- droids */
  droidChirp: (c, out, t) => {
    const steps = [0, 5, 3, 8, 7];
    steps.forEach((s, i) => {
      const dt = i * 0.085;
      const f0 = 620 * Math.pow(2, s / 12) * (i % 2 === 0 ? 1 : 1.5);
      const o = osc(c, 'square', f0, t + dt, 0.09);
      o.frequency.exponentialRampToValueAtTime(f0 * (i % 2 ? 0.72 : 1.35), t + dt + 0.08);
      const f = c.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = f0 * 1.4;
      f.Q.value = 3;
      o.connect(f).connect(env(c.ctx, t + dt, 0.004, 0.085, 0.2)).connect(out);
    });
  },
  droidWorried: (c, out, t) => {
    const o = osc(c, 'sawtooth', 420, t, 0.75);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.7);
    const lfo = osc(c, 'sine', 11, t, 0.75);
    const lg = c.ctx.createGain();
    lg.gain.value = 26;
    lfo.connect(lg).connect(o.frequency);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1500;
    o.connect(f).connect(env(c.ctx, t, 0.02, 0.72, 0.16)).connect(out);
  },
  droidRoll: (c, out, t) => {
    const n = noiseSource(c, t, 0.7);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 780;
    f.Q.value = 6;
    n.connect(f).connect(env(c.ctx, t, 0.06, 0.3, 0.1, 0.2, 0.2)).connect(out);
  },

  /* ---------------------------------------------------------- interface */
  dataTransfer: (c, out, t) => {
    for (let i = 0; i < 12; i++) {
      const dt = i * 0.14;
      const f0 = 420 * Math.pow(2, ((i * 3) % 12) / 12) * (1 + Math.floor(i / 6) * 0.5);
      const o = osc(c, 'sine', f0, t + dt, 0.13);
      o.connect(env(c.ctx, t + dt, 0.005, 0.12, 0.12)).connect(out);
    }
    const n = noiseSource(c, t, 1.7);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + 1.6);
    f.Q.value = 2;
    n.connect(f).connect(env(c.ctx, t, 0.3, 0.6, 0.06, 0.5, 0.4)).connect(out);
  },
  hologramOn: (c, out, t) => {
    const o = osc(c, 'sine', 140, t, 1.4);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.9);
    o.connect(env(c.ctx, t, 0.05, 1.3, 0.12)).connect(out);
    const o2 = osc(c, 'triangle', 210, t, 1.4);
    o2.frequency.exponentialRampToValueAtTime(1320, t + 0.9);
    o2.connect(env(c.ctx, t, 0.08, 1.3, 0.07)).connect(out);
  },
  uiClick: (c, out, t) => {
    const o = osc(c, 'sine', 1180, t, 0.06);
    o.connect(env(c.ctx, t, 0.001, 0.06, 0.08)).connect(out);
  },

  /* --------------------------------------------------------------- ship */
  podLaunch: (c, out, t) => {
    const hiss = noiseSource(c, t, 1.6);
    const hf = c.ctx.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.setValueAtTime(1800, t);
    hf.frequency.exponentialRampToValueAtTime(400, t + 1.4);
    hiss.connect(hf).connect(env(c.ctx, t, 0.01, 1.5, 0.45)).connect(out);
    const thump = osc(c, 'sine', 150, t, 0.9);
    thump.frequency.exponentialRampToValueAtTime(38, t + 0.8);
    thump.connect(env(c.ctx, t, 0.004, 0.9, 0.8)).connect(out);
    const rise = osc(c, 'sawtooth', 60, t + 0.2, 2.2);
    rise.frequency.exponentialRampToValueAtTime(190, t + 2.2);
    const rf = c.ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 700;
    rise.connect(rf).connect(env(c.ctx, t + 0.2, 0.5, 1.0, 0.24, 0.4, 0.5)).connect(out);
  },
  atmosphere: (c, out, t) => {
    const n = noiseSource(c, t, 8);
    const f = c.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 6);
    n.connect(f).connect(env(c.ctx, t, 2.5, 1.5, 0.4, 3, 1.5)).connect(out);
  },
  tractorBeam: (c, out, t) => {
    const dur = 14;
    const o = osc(c, 'sine', 58, t, dur);
    const o2 = osc(c, 'sine', 87, t, dur);
    const lfo = osc(c, 'sine', 2.6, t, dur);
    const lg = c.ctx.createGain();
    lg.gain.value = 0.06;
    const g = env(c.ctx, t, 1.4, 1, 0.2, dur - 4, 1.6);
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(out);
    o2.connect(g);
  },
  breath: (c, out, t) => {
    const inhale = noiseSource(c, t, 1.1);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(420, t);
    f.frequency.linearRampToValueAtTime(760, t + 1);
    f.Q.value = 2.2;
    inhale.connect(f).connect(env(c.ctx, t, 0.35, 0.7, 0.18)).connect(out);
    const exhale = noiseSource(c, t + 1.5, 1.3);
    const f2 = c.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(700, t + 1.5);
    f2.frequency.linearRampToValueAtTime(300, t + 2.7);
    f2.Q.value = 1.8;
    exhale.connect(f2).connect(env(c.ctx, t + 1.5, 0.3, 1.0, 0.14)).connect(out);
  },
  saberIgnite: (c, out, t) => {
    const o = osc(c, 'sawtooth', 90, t, 1.2);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.4);
    const f = c.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 380;
    f.Q.value = 3;
    o.connect(f).connect(env(c.ctx, t, 0.05, 0.4, 0.3, 0.4, 0.4)).connect(out);
  },
};

export function playSfx(
  c: SfxContext,
  name: SfxName,
  out: AudioNode,
  when: number,
  rate = 1,
): void {
  const builder = builders[name];
  if (!builder) return;
  builder(c, out, when, rate);
}

export function makeNoiseBuffers(ctx: AudioContext): { white: AudioBuffer; pink: AudioBuffer } {
  const len = Math.floor(ctx.sampleRate * 2);
  const white = ctx.createBuffer(1, len, ctx.sampleRate);
  const wd = white.getChannelData(0);
  let seed = 0x2f6e2b1;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < len; i++) wd[i] = rand() * 2 - 1;

  const pink = ctx.createBuffer(1, len, ctx.sampleRate);
  const pd = pink.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = wd[i];
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    pd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
  }
  return { white, pink };
}
