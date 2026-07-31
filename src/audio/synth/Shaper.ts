/**
 * Non-linear processing: saturation, foldback, bit reduction, ring modulation.
 *
 * Saturation is what separates a loud sound from a big one. A gunshot's body
 * driven into soft clipping gains the odd harmonics that read as "this is at
 * the limit of what the medium can carry", which is how real close-mic'd gunfire
 * sounds. Bit reduction and band-limiting sell anything coming over a radio.
 */
import { Rng } from '../../core/MathUtils';
import type { Signal } from './Signal';

/** tanh saturation. `drive` of 1 is barely audible, 8 is aggressive. */
export function saturate(target: Signal, drive: number, makeup = true): Signal {
  const d = target.data;
  const k = Math.max(1e-3, drive);
  const norm = makeup ? 1 / Math.tanh(k) : 1;
  for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * k) * norm;
  return target;
}

/** Asymmetric soft clip; adds even harmonics, which reads as "speaker cone". */
export function softClip(target: Signal, threshold = 0.7): Signal {
  const d = target.data;
  const t = Math.max(1e-3, threshold);
  for (let i = 0; i < d.length; i++) {
    const x = d[i];
    if (x > t) d[i] = t + (1 - t) * Math.tanh((x - t) / (1 - t));
    else if (x < -t * 1.15) {
      const tn = t * 1.15;
      d[i] = -tn - (1 - tn) * Math.tanh((-x - tn) / (1 - tn));
    }
  }
  return target;
}

/** Wavefolding: harsh, inharmonic, good for tearing metal and near-miss cracks. */
export function foldback(target: Signal, threshold: number): Signal {
  const d = target.data;
  const t = Math.max(1e-3, threshold);
  for (let i = 0; i < d.length; i++) {
    let x = d[i];
    let guard = 0;
    while ((x > t || x < -t) && guard++ < 8) {
      x = x > t ? t - (x - t) : -t - (x + t);
    }
    d[i] = x;
  }
  return target;
}

/** Quantise amplitude and decimate the sample rate. Radio and drone comms. */
export function bitcrush(target: Signal, bits: number, downsample: number): Signal {
  const d = target.data;
  const levels = Math.max(2, Math.pow(2, Math.max(1, bits)));
  const step = 2 / levels;
  const hold = Math.max(1, Math.floor(downsample));
  let held = 0;
  for (let i = 0; i < d.length; i++) {
    if (i % hold === 0) held = Math.round(d[i] / step) * step;
    d[i] = held;
  }
  return target;
}

/** Multiply by a sine. Inharmonic sidebands: alarms, drones, damaged machinery. */
export function ringMod(target: Signal, hz: number, depth = 1, phase0 = 0): Signal {
  const d = target.data;
  const inc = (2 * Math.PI * hz) / target.sampleRate;
  let phase = phase0;
  for (let i = 0; i < d.length; i++) {
    const m = 1 - depth + depth * Math.sin(phase);
    d[i] *= m;
    phase += inc;
  }
  return target;
}

/**
 * Feed-forward compressor with a look-ahead-free peak detector. Not a mix tool
 * here — it is used to glue explosion layers and to give radio chatter the
 * squashed, always-at-the-limit character of a real squad net.
 */
export function compress(
  target: Signal,
  thresholdDb: number,
  ratio: number,
  attackMs: number,
  releaseMs: number,
  makeupDb = 0,
): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  const threshold = Math.pow(10, thresholdDb / 20);
  const aAtt = Math.exp(-1 / (Math.max(0.05, attackMs) * 0.001 * sr));
  const aRel = Math.exp(-1 / (Math.max(1, releaseMs) * 0.001 * sr));
  const makeup = Math.pow(10, makeupDb / 20);
  const invRatio = 1 / Math.max(1, ratio);
  let env = 0;
  for (let i = 0; i < d.length; i++) {
    const level = Math.abs(d[i]);
    const coeff = level > env ? aAtt : aRel;
    env = level + coeff * (env - level);
    let gain = 1;
    if (env > threshold) gain = Math.pow(env / threshold, invRatio - 1);
    d[i] *= gain * makeup;
  }
  return target;
}

/** Simple hard limiter, applied last so a layered design cannot clip a buffer. */
export function limit(target: Signal, ceiling = 0.99): Signal {
  const d = target.data;
  for (let i = 0; i < d.length; i++) {
    if (d[i] > ceiling) d[i] = ceiling;
    else if (d[i] < -ceiling) d[i] = -ceiling;
  }
  return target;
}

/**
 * Radio treatment: band-limit to a comms channel, squash, dirty it up, and add
 * a little carrier hiss. This is what makes formant babble read as a callout
 * over a squad net rather than as a synthesiser patch.
 */
export function radioize(target: Signal, rng: Rng, grit = 1): Signal {
  const d = target.data;
  const sr = target.sampleRate;
  // 300 Hz - 3.4 kHz channel, done with cascaded one-poles for a soft edge.
  const aHp = 1 - Math.exp((-2 * Math.PI * 300) / sr);
  const aLp = 1 - Math.exp((-2 * Math.PI * 3400) / sr);
  let hp = 0;
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    hp += (d[i] - hp) * aHp;
    const band = d[i] - hp;
    lp += (band - lp) * aLp;
    d[i] = lp;
  }
  compress(target, -26, 8, 1.5, 60, 14);
  saturate(target, 1.8 + grit);
  for (let i = 0; i < d.length; i++) d[i] += (rng.next() * 2 - 1) * 0.012 * grit;
  return target;
}
