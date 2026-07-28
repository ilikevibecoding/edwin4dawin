/**
 * Interface, radio and body.
 *
 * The hitmarker is the most-heard sound in the game after the gun, and unlike
 * the gun it has no physical referent to be faithful to — it only has to be
 * satisfying. What makes it satisfying is a genuinely instantaneous attack, two
 * inharmonic partials a fifth-ish apart so it reads as a "tick" rather than a
 * "beep", and a decay short enough that four in a second do not smear. It is
 * built to those three properties and measured against them.
 */

import type { Bakery } from './Bakery';
import {
  Clip,
  type Mode,
  clip,
  decayTo60,
  fadeEdges,
  filter,
  makeLoopable,
  modal,
  noise,
  normalise,
  normaliseClip,
  perc,
  removeDc,
  scale,
  shapeTanh,
  sweep,
  tone,
  white,
} from '../dsp/Kernel';

interface ClickRecipe {
  modes: Mode[];
  /** Broadband tick on top of the modes. */
  tickHz: number;
  tickDecay: number;
  tickGain: number;
  length: number;
  peak: number;
  /** Optional confirming tone underneath. */
  body?: { hz: number; to?: number; decay: number; gain: number };
}

function bakeClick(b: Bakery, name: string, r: ClickRecipe): void {
  const sr = b.sampleRate;
  const rng = b.stream(name);
  const c = clip(sr, r.length);
  const d = c.channels[0];

  const ex = new Float32Array(Math.max(4, Math.round(0.0006 * sr)));
  white(ex, rng, 1);
  perc(ex, sr, 0.00002, 0.00025, 3.2);
  ex[0] += 1;
  modal(d, ex, sr, r.modes, 0, 0);

  const tick = new Float32Array(d.length);
  white(tick, rng, 1);
  filter(tick, sr, 'highpass', r.tickHz, 0.7);
  perc(tick, sr, 0.00002, r.tickDecay, 3);
  tick[0] += 0.6;
  scale(tick, r.tickGain * 1.5);
  for (let i = 0; i < d.length; i++) d[i] += tick[i];

  if (r.body) {
    const bd = new Float32Array(d.length);
    tone(bd, sr, r.body.hz, r.body.decay * 3, {
      toFreq: r.body.to ?? r.body.hz,
      glide: r.body.decay,
      gain: r.body.gain,
    });
    perc(bd, sr, 0.0004, r.body.decay, 2.2);
    for (let i = 0; i < d.length; i++) d[i] += bd[i];
  }

  removeDc(d);
  normalise(d, r.peak);
  // The tick is a single full-scale sample; a fade in would delete it, and with
  // it the crispness that makes the hitmarker read as a click.
  fadeEdges(d, sr, 0, 0.006);
  b.set(name, [c]);
}

export function bakeUi(b: Bakery): void {
  const sr = b.sampleRate;

  /* The signature: a hit registered. */
  bakeClick(b, 'ui_hitmarker', {
    modes: [
      { freq: 2960, decay: 0.028, gain: 0.85 },
      { freq: 4430, decay: 0.019, gain: 0.5 },
      { freq: 1180, decay: 0.014, gain: 0.35 },
    ],
    tickHz: 5200,
    tickDecay: 0.0009,
    tickGain: 0.55,
    length: 0.09,
    peak: 0.82,
  });

  /* A headshot: the same click, higher and with a second partial that sings. */
  bakeClick(b, 'ui_hitmarker_head', {
    modes: [
      { freq: 3720, decay: 0.036, gain: 0.85 },
      { freq: 5580, decay: 0.026, gain: 0.6 },
      { freq: 7440, decay: 0.016, gain: 0.32 },
      { freq: 1480, decay: 0.012, gain: 0.28 },
    ],
    tickHz: 6400,
    tickDecay: 0.0008,
    tickGain: 0.6,
    length: 0.11,
    peak: 0.86,
  });

  /* A kill: the click, then a short confirming fall. */
  bakeClick(b, 'ui_kill', {
    modes: [
      { freq: 2640, decay: 0.03, gain: 0.7 },
      { freq: 3960, decay: 0.022, gain: 0.45 },
    ],
    tickHz: 4800,
    tickDecay: 0.001,
    tickGain: 0.5,
    length: 0.28,
    peak: 0.86,
    body: { hz: 880, to: 588, decay: 0.11, gain: 0.42 },
  });

  bakeClick(b, 'ui_move', {
    modes: [
      { freq: 1760, decay: 0.012, gain: 0.6 },
      { freq: 2640, decay: 0.008, gain: 0.3 },
    ],
    tickHz: 4200,
    tickDecay: 0.0006,
    tickGain: 0.3,
    length: 0.05,
    peak: 0.42,
  });

  bakeClick(b, 'ui_select', {
    modes: [
      { freq: 1320, decay: 0.024, gain: 0.7 },
      { freq: 1980, decay: 0.016, gain: 0.4 },
    ],
    tickHz: 3600,
    tickDecay: 0.0008,
    tickGain: 0.34,
    length: 0.14,
    peak: 0.6,
    body: { hz: 660, to: 880, decay: 0.06, gain: 0.34 },
  });

  bakeClick(b, 'ui_back', {
    modes: [{ freq: 990, decay: 0.02, gain: 0.7 }],
    tickHz: 3000,
    tickDecay: 0.0007,
    tickGain: 0.26,
    length: 0.13,
    peak: 0.5,
    body: { hz: 590, to: 420, decay: 0.06, gain: 0.34 },
  });

  bakeClick(b, 'ui_denied', {
    modes: [{ freq: 420, decay: 0.03, gain: 0.6 }],
    tickHz: 1800,
    tickDecay: 0.0012,
    tickGain: 0.2,
    length: 0.2,
    peak: 0.55,
    body: { hz: 220, to: 165, decay: 0.09, gain: 0.5 },
  });

  bakeClick(b, 'ui_open', {
    modes: [{ freq: 2200, decay: 0.02, gain: 0.4 }],
    tickHz: 5200,
    tickDecay: 0.0016,
    tickGain: 0.3,
    length: 0.22,
    peak: 0.45,
    body: { hz: 330, to: 495, decay: 0.1, gain: 0.34 },
  });

  bakeClick(b, 'ui_close', {
    modes: [{ freq: 1650, decay: 0.018, gain: 0.4 }],
    tickHz: 4400,
    tickDecay: 0.0014,
    tickGain: 0.26,
    length: 0.2,
    peak: 0.42,
    body: { hz: 440, to: 275, decay: 0.09, gain: 0.34 },
  });

  /* A streak earned: three rising partials, restrained, not a fanfare. */
  {
    const rng = b.stream('killstreak_earned');
    const c = clip(sr, 1.1, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      const notes = [392, 587, 784];
      for (let n = 0; n < notes.length; n++) {
        const at = Math.round(n * 0.085 * sr);
        const seg = new Float32Array(d.length);
        tone(seg, sr, notes[n], 0.7, { wave: 'triangle', gain: 0.5 }, at);
        tone(seg, sr, notes[n] * 2, 0.35, { wave: 'sine', gain: 0.14 }, at);
        perc(seg, sr, 0.002, 0.22, 1.7, at);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
      }
      // A metallic sheen so it belongs in a military interface.
      const ex = new Float32Array(Math.round(0.002 * sr));
      white(ex, rng, 1);
      perc(ex, sr, 0.00005, 0.0007, 3);
      const sheen = new Float32Array(d.length);
      modal(
        sheen,
        ex,
        sr,
        [
          { freq: 3130, decay: 0.24, gain: 0.4 },
          { freq: 4700, decay: 0.16, gain: 0.26 },
        ],
        0,
        0.02,
        rng,
      );
      scale(sheen, 1.2);
      for (let i = 0; i < d.length; i++) d[i] += sheen[i];
      removeDc(d);
      fadeEdges(d, sr, 0.0004, 0.09);
    }
    normaliseClip(c, 0.62);
    b.set('killstreak_earned', [c]);
  }

  /* Tactical map open: a synthetic sweep with a hard landing. */
  {
    const rng = b.stream('tactical');
    const c = clip(sr, 0.6, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      noise(d, rng, 'white', 1);
      sweep(d, sr, 'bandpass', 600, 6400, 0.22, 4, 0.8);
      perc(d, sr, 0.008, 0.14, 1.5);
      scale(d, 2.6);
      tone(d, sr, 165, 0.3, { toFreq: 330, glide: 0.16, gain: 0.3 });
      const land = new Float32Array(d.length);
      const at = Math.round(0.2 * sr);
      white(land, rng, 1, at, Math.round(0.02 * sr));
      filter(land, sr, 'bandpass', 2400, 1.2);
      perc(land, sr, 0.0002, 0.02, 2.4, at);
      scale(land, 1.2);
      for (let i = 0; i < d.length; i++) d[i] += land[i];
      removeDc(d);
      fadeEdges(d, sr, 0.0005, 0.05);
    }
    normaliseClip(c, 0.55);
    b.set('ui_tactical', [c]);
  }

  /* Airstrike inbound: a two-tone warning that cannot be mistaken for music. */
  {
    const c = clip(sr, 1.5, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      for (let n = 0; n < 3; n++) {
        const at = Math.round(n * 0.4 * sr);
        const seg = new Float32Array(d.length);
        tone(seg, sr, n % 2 === 0 ? 740 : 988, 0.3, { wave: 'square', gain: 0.28 }, at);
        perc(seg, sr, 0.003, 0.1, 1.8, at);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
      }
      filter(d, sr, 'bandpass', 900, 0.8);
      filter(d, sr, 'lowpass', 4200, 0.7);
      removeDc(d);
      fadeEdges(d, sr, 0.001, 0.04);
    }
    normaliseClip(c, 0.5);
    b.set('ui_warning', [c]);
  }

  /* The tone a low-health HUD pulses under. */
  {
    const c = clip(sr, 0.9);
    const d = c.channels[0];
    tone(d, sr, 124, 0.8, { wave: 'sine', toFreq: 98, glide: 0.6, gain: 0.6 });
    tone(d, sr, 248, 0.4, { wave: 'sine', gain: 0.12 });
    perc(d, sr, 0.02, 0.3, 1.4);
    normalise(d, 0.5);
    fadeEdges(d, sr, 0.005, 0.1);
    b.set('ui_lowhealth', [c]);
  }
}

/* ================================ radio ================================ */

/**
 * Radio callouts without a voice actor.
 *
 * Formant-shaped noise bursts under a syllable envelope, squeezed through a
 * comms band and clipped: not intelligible, but unmistakably a man on a radio,
 * which is the information the player actually needs. Each callout kind gets
 * its own syllable count and pitch contour so "contact" and "man down" are
 * distinguishable at a glance.
 */
const CALLOUTS: Record<string, { syllables: number; pitch: number; contour: number; urgency: number }> = {
  contact: { syllables: 2, pitch: 1.05, contour: -0.15, urgency: 1 },
  reloading: { syllables: 3, pitch: 1, contour: -0.05, urgency: 0.6 },
  grenade: { syllables: 3, pitch: 1.18, contour: 0.2, urgency: 1 },
  flanking: { syllables: 3, pitch: 1, contour: -0.1, urgency: 0.7 },
  suppressing: { syllables: 4, pitch: 0.96, contour: -0.05, urgency: 0.8 },
  'man-down': { syllables: 2, pitch: 0.9, contour: -0.25, urgency: 0.9 },
  lost: { syllables: 2, pitch: 0.94, contour: -0.2, urgency: 0.5 },
};

export const CALLOUT_KINDS: readonly string[] = Object.keys(CALLOUTS);

export function bakeCallouts(b: Bakery): void {
  const sr = b.sampleRate;
  for (const kind of CALLOUT_KINDS) {
    const name = `voice:${kind}`;
    if (b.has(name)) continue;
    const r = CALLOUTS[kind];
    const rng = b.stream(name);
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(2); v++) {
      const c = clip(sr, 0.16 + r.syllables * 0.155);
      const d = c.channels[0];
      // Radio keying: the squelch either side of the transmission.
      const key = new Float32Array(d.length);
      white(key, rng, 1);
      filter(key, sr, 'bandpass', 2600, 1.4);
      perc(key, sr, 0.0004, 0.012, 2.4);
      scale(key, 0.5);
      for (let i = 0; i < d.length; i++) d[i] += key[i];

      let t = 0.045;
      for (let s = 0; s < r.syllables; s++) {
        const len = rng.range(0.075, 0.135);
        const at = Math.round(t * sr);
        const seg = new Float32Array(d.length);
        const u = r.syllables > 1 ? s / (r.syllables - 1) : 0;
        const f0 = 118 * r.pitch * (1 + r.contour * u);
        // Glottal buzz plus breath.
        tone(seg, sr, f0, len, { wave: 'saw', gain: 0.5, toFreq: f0 * 0.94, glide: len }, at);
        white(seg, rng, 0.18, at, Math.round(len * sr));
        // Three formants make a vowel; which vowel hardly matters at this band.
        const fA = rng.range(430, 760);
        const fB = rng.range(1050, 1750);
        const fC = rng.range(2350, 2900);
        filter(seg, sr, 'peaking', fA, 4, 13);
        filter(seg, sr, 'peaking', fB, 5, 11);
        filter(seg, sr, 'peaking', fC, 6, 8);
        perc(seg, sr, 0.012, len * 0.55, 1.4, at);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
        t += len + rng.range(0.012, 0.045);
      }

      // The comms chain: band-limited, compressed to death, a little broken up.
      filter(d, sr, 'highpass', 340, 0.8, 0, 2);
      filter(d, sr, 'lowpass', 3100, 0.8, 0, 2);
      shapeTanh(d, 4.5 * r.urgency + 1.5, 0.85);
      const hiss = new Float32Array(d.length);
      white(hiss, rng, 1);
      filter(hiss, sr, 'bandpass', 1800, 0.6);
      scale(hiss, 0.05);
      for (let i = 0; i < d.length; i++) d[i] += hiss[i] * (Math.abs(d[i]) > 0.01 ? 1 : 0.3);
      removeDc(d);
      normalise(d, 0.62);
      fadeEdges(d, sr, 0.0008, 0.02);
      clips.push(c);
    }
    b.set(name, clips);
  }
}

/**
 * A confirmation over the net: the squelch of a key-up, a short acknowledgement
 * and the tail of the carrier dropping. Used for every support call, because
 * "your UAV is up" arriving as a radio transmission rather than as a chime is
 * most of what makes a killstreak feel like it came from somewhere.
 */
export function bakeRadio(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('radio_confirm');

  {
    const c = clip(sr, 0.9);
    const d = c.channels[0];
    // Key-up squelch.
    const key = new Float32Array(d.length);
    white(key, rng, 1);
    filter(key, sr, 'bandpass', 2400, 1.3);
    perc(key, sr, 0.0004, 0.014, 2.4);
    scale(key, 0.7);
    for (let i = 0; i < d.length; i++) d[i] += key[i];

    let t = 0.05;
    for (let s = 0; s < 4; s++) {
      const at = Math.round(t * sr);
      const len = rng.range(0.07, 0.12);
      const seg = new Float32Array(d.length);
      const f0 = 128 * (1 - s * 0.04);
      tone(seg, sr, f0, len, { wave: 'saw', gain: 0.5, toFreq: f0 * 0.95, glide: len }, at);
      white(seg, rng, 0.15, at, Math.round(len * sr));
      filter(seg, sr, 'peaking', rng.range(480, 720), 4, 13);
      filter(seg, sr, 'peaking', rng.range(1200, 1700), 5, 10);
      filter(seg, sr, 'peaking', 2600, 6, 7);
      perc(seg, sr, 0.01, len * 0.55, 1.4, at);
      for (let i = 0; i < d.length; i++) d[i] += seg[i];
      t += len + rng.range(0.015, 0.04);
    }
    // Carrier drop.
    const drop = new Float32Array(d.length);
    const at = Math.round(Math.min(0.8, t + 0.02) * sr);
    white(drop, rng, 1, at, Math.round(0.03 * sr));
    filter(drop, sr, 'bandpass', 1600, 1.1);
    perc(drop, sr, 0.0006, 0.02, 2.2, at);
    scale(drop, 0.5);
    for (let i = 0; i < d.length; i++) d[i] += drop[i];

    filter(d, sr, 'highpass', 340, 0.8, 0, 2);
    filter(d, sr, 'lowpass', 3100, 0.8, 0, 2);
    shapeTanh(d, 5, 0.85);
    removeDc(d);
    normalise(d, 0.68);
    fadeEdges(d, sr, 0.0006, 0.02);
    b.set('radio_confirm', [c]);
  }

  {
    const c = clip(sr, 0.12);
    const d = c.channels[0];
    tone(d, sr, 1480, 0.08, { wave: 'square', gain: 0.4 });
    filter(d, sr, 'bandpass', 1600, 1.4);
    perc(d, sr, 0.0008, 0.03, 2);
    normalise(d, 0.5);
    fadeEdges(d, sr, 0.0004, 0.01);
    b.set('radio_beep', [c]);
  }
}

/* ================================= body ================================ */

/**
 * Heartbeat, breathing and the noises a man makes when he is hit. All of it
 * sits close to the ear and never gets spatialised, which is what makes it read
 * as the player's own body rather than something in the room.
 */
export function bakeBody(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('body');

  /* A heartbeat is two beats: the valves closing, low and soft-edged. */
  {
    const c = clip(sr, 0.55);
    const d = c.channels[0];
    for (const [at, hz, gain, dec] of [
      [0, 58, 1, 0.075],
      [0.14, 46, 0.62, 0.1],
    ] as const) {
      const seg = new Float32Array(d.length);
      const start = Math.round(at * sr);
      tone(seg, sr, hz, dec * 4, { toFreq: hz * 0.62, glide: dec * 1.4, gain }, start);
      const thud = new Float32Array(d.length);
      noise(thud, rng, 'brown', 1);
      filter(thud, sr, 'lowpass', 130, 0.9, 0, 2);
      perc(thud, sr, 0.006, dec, 1.6, start);
      scale(thud, 3 * gain);
      for (let i = 0; i < d.length; i++) seg[i] += thud[i];
      perc(seg, sr, 0.005, dec, 1.5, start);
      for (let i = 0; i < d.length; i++) d[i] += seg[i];
    }
    filter(d, sr, 'lowpass', 220, 0.8, 0, 2);
    removeDc(d);
    normalise(d, 0.75);
    fadeEdges(d, sr, 0.002, 0.03);
    b.set('heartbeat', [c]);
  }

  /* Breathing: filtered noise through a throat-shaped band. */
  for (const [name, from, to, dur, gain] of [
    ['breath_in', 380, 900, 0.42, 0.6],
    ['breath_out', 820, 340, 0.5, 0.5],
  ] as const) {
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(3); v++) {
      const c = clip(sr, dur + 0.1);
      const d = c.channels[0];
      noise(d, rng, 'white', 1);
      sweep(d, sr, 'bandpass', from * rng.range(0.9, 1.1), to, dur * 0.8, 1.1, 1.1);
      filter(d, sr, 'lowpass', 2600, 0.7);
      for (let i = 0; i < d.length; i++) {
        const u = i / (dur * sr);
        d[i] *= Math.sin(Math.PI * Math.min(1, u)) ** 1.4;
      }
      scale(d, gain * 3);
      removeDc(d);
      normalise(d, 0.42);
      fadeEdges(d, sr, 0.006, 0.04);
      clips.push(c);
    }
    b.set(name, clips);
  }

  /* Taking a hit, and the last breath. */
  {
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(3); v++) {
      const c = clip(sr, 0.4);
      const d = c.channels[0];
      const f0 = rng.range(96, 126);
      tone(d, sr, f0, 0.24, { wave: 'saw', toFreq: f0 * 0.8, glide: 0.2, gain: 0.4 });
      noise(d, rng, 'white', 0.22);
      filter(d, sr, 'peaking', 520, 3, 12);
      filter(d, sr, 'peaking', 1250, 4, 8);
      filter(d, sr, 'lowpass', 2400, 0.8);
      perc(d, sr, 0.008, 0.11, 1.6);
      removeDc(d);
      normalise(d, 0.6);
      fadeEdges(d, sr, 0.003, 0.03);
      clips.push(c);
    }
    b.set('pain', clips);
  }
  {
    const c = clip(sr, 1.6);
    const d = c.channels[0];
    noise(d, rng, 'white', 1);
    sweep(d, sr, 'bandpass', 700, 220, 1.1, 1.2, 1.2);
    tone(d, sr, 88, 0.6, { wave: 'saw', toFreq: 62, glide: 0.5, gain: 0.3 });
    filter(d, sr, 'lowpass', 1600, 0.8);
    for (let i = 0; i < d.length; i++) {
      const u = i / d.length;
      d[i] *= Math.min(1, u * 12) * Math.pow(1 - u, 1.6);
    }
    normalise(d, 0.55);
    fadeEdges(d, sr, 0.01, 0.2);
    b.set('death_breath', [c]);
  }

  /* Vaulting: cloth, a grunt of effort, and boots finding the far side. */
  {
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(2); v++) {
      const c = clip(sr, 0.5);
      const d = c.channels[0];
      noise(d, rng, 'pink', 1);
      sweep(d, sr, 'bandpass', 2400, 700, 0.2, 0.7, 1.2);
      perc(d, sr, 0.01, 0.11, 1.5);
      scale(d, 2.4);
      const grunt = new Float32Array(d.length);
      tone(grunt, sr, 108, 0.2, { wave: 'saw', toFreq: 92, glide: 0.16, gain: 0.3 });
      filter(grunt, sr, 'peaking', 620, 3, 10);
      filter(grunt, sr, 'lowpass', 1800, 0.8);
      perc(grunt, sr, 0.012, 0.08, 1.6);
      for (let i = 0; i < d.length; i++) d[i] += grunt[i];
      removeDc(d);
      normalise(d, 0.55);
      fadeEdges(d, sr, 0.002, 0.03);
      clips.push(c);
    }
    b.set('vault', clips);
  }

  /* Cloth movement, used for jumps and stance changes. */
  {
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(3); v++) {
      const c = clip(sr, 0.3);
      const d = c.channels[0];
      noise(d, rng, 'pink', 1);
      sweep(d, sr, 'bandpass', rng.range(1800, 3000), 800, 0.13, 0.65, 1.2);
      perc(d, sr, 0.008, 0.06, 1.6);
      filter(d, sr, 'highpass', 400, 0.7);
      scale(d, 2.6);
      removeDc(d);
      normalise(d, 0.3);
      fadeEdges(d, sr, 0.002, 0.03);
      clips.push(c);
    }
    b.set('cloth', clips);
  }
}

/* =============================== tinnitus ============================== */

/**
 * The ringing left behind by something that went off too close. Baked as a
 * long clip and looped rather than run from a live oscillator pair, so the
 * recovery is one gain ramp on one voice.
 */
export function bakeTinnitus(b: Bakery): void {
  const sr = b.sampleRate;
  const c = clip(sr, 2.5, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = c.channels[ch];
    // Two close tones beat against each other, which is what real tinnitus does.
    tone(d, sr, ch === 0 ? 4380 : 4396, c.duration, { gain: 0.5 });
    tone(d, sr, ch === 0 ? 6130 : 6118, c.duration, { gain: 0.26 });
    tone(d, sr, 8720, c.duration, { gain: 0.08 });
    const hiss = new Float32Array(d.length);
    noise(hiss, b.stream(`tinnitus:${ch}`), 'white', 1);
    filter(hiss, sr, 'bandpass', 5200, 0.9);
    scale(hiss, 0.12);
    for (let i = 0; i < d.length; i++) d[i] += hiss[i];
    removeDc(d);
  }
  const loop = makeLoopable(c, 0.25);
  normaliseClip(loop, 0.5);
  b.set('tinnitus', [loop]);
}

/* ================================ music ================================ */

/**
 * A tension bed, not a soundtrack. One drone that never resolves, one pulse
 * that quickens, and a sting for the moment a wave arrives. Everything about it
 * is designed to be ignorable, because a player who notices the music during a
 * firefight is a player who has been distracted from the firefight.
 */
export function bakeMusic(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('music');

  {
    // The drone's top partial is 262 Hz and its air bed is lowpassed at 190, so
    // the only bandwidth it needs is whatever the triangles fold down.
    const droneSr = b.rateFor(3600);
    const raw = clip(droneSr, 9, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = raw.channels[ch];
      const root = 55 * (ch === 0 ? 1 : 1.0007);
      for (const [mult, gain, wave] of [
        [1, 0.5, 'triangle'],
        [1.5, 0.2, 'triangle'],
        [2, 0.18, 'sine'],
        [3, 0.07, 'sine'],
        [4.76, 0.035, 'sine'],
      ] as const) {
        tone(d, droneSr, root * mult, raw.duration, {
          wave,
          gain,
          fmRatio: 0.0007,
          fmIndex: 1.2,
        });
      }
      const air = new Float32Array(d.length);
      noise(air, rng, 'brown', 1);
      filter(air, droneSr, 'lowpass', 190, 0.9, 0, 2);
      scale(air, 3);
      for (let i = 0; i < d.length; i++) d[i] += air[i];
      // A slow swell so nine seconds never sits still.
      for (let i = 0; i < d.length; i++) {
        const t = i / droneSr;
        d[i] *= 0.72 + 0.28 * Math.sin((t / raw.duration) * Math.PI * 2 - Math.PI / 2);
      }
      removeDc(d);
    }
    const loop = makeLoopable(raw, 0.9);
    normaliseClip(loop, 0.5);
    b.set('music_drone', [loop]);
  }

  {
    const c = clip(sr, 0.5);
    const d = c.channels[0];
    tone(d, sr, 74, 0.3, { toFreq: 46, glide: 0.11, gain: 0.8 });
    const tick = new Float32Array(d.length);
    noise(tick, rng, 'white', 1);
    filter(tick, sr, 'bandpass', 2400, 1.1);
    perc(tick, sr, 0.0008, 0.02, 2.2);
    scale(tick, 0.7);
    for (let i = 0; i < d.length; i++) d[i] += tick[i];
    perc(d, sr, 0.0012, 0.1, 2);
    shapeTanh(d, 1.6, 0.6);
    normalise(d, 0.65);
    fadeEdges(d, sr, 0.0005, 0.03);
    b.set('music_pulse', [c]);
  }

  {
    const c = clip(sr, 2.4, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      // A minor second against the root: unresolved, and it stays that way.
      tone(d, sr, 82.4, 2.2, { wave: 'triangle', gain: 0.4 });
      tone(d, sr, 87.3, 2.2, { wave: 'triangle', gain: 0.3 });
      tone(d, sr, 164.8, 1.4, { wave: 'sine', gain: 0.16 });
      const hit = new Float32Array(d.length);
      noise(hit, rng, 'white', 1);
      sweep(hit, sr, 'lowpass', 5200, 260, 0.6, 0.8, 1.6);
      perc(hit, sr, 0.002, 0.28, 1.6);
      scale(hit, 1.6);
      for (let i = 0; i < d.length; i++) d[i] += hit[i];
      decayTo60(d, sr, 2.1);
      removeDc(d);
      fadeEdges(d, sr, 0.001, 0.2);
    }
    normaliseClip(c, 0.6);
    b.set('music_sting', [c]);
  }
}
