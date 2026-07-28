/**
 * Ambience.
 *
 * The whole trick with a wind bed is that it must never be recognisable as a
 * loop, and a loop it necessarily is. Two beds of different lengths are layered
 * and their gains modulated independently by a random walk driven from the live
 * update, so the sum has no period; on top of that go one-shots — gulls, an
 * awning snapping, a dog somewhere — scheduled at randomised intervals, which
 * is what actually stops the ear from locking on.
 *
 * The setting is a coastal North African market town, so the bed is wind over
 * masonry, distant surf, gulls, and the low unlocalisable hum of a town.
 */

import type { Bakery } from './Bakery';
import {
  Clip,
  clip,
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
  scatterGrains,
  sweep,
  tone,
  white,
} from '../dsp/Kernel';

/**
 * Two wind beds. The low one is the pressure you feel; the high one is air
 * tearing over edges and through gaps, and it is the one whose level tracks
 * `weather.windSpeed`.
 */
export function bakeWind(b: Bakery): void {
  for (const [name, seconds, band, q, tilt, topHz] of [
    // Nothing above the whistle, which sits at four times the band centre.
    ['amb_wind_low', 11, 190, 0.5, 'brown', 1600],
    ['amb_wind_high', 8.5, 1350, 0.62, 'pink', 8000],
  ] as const) {
    const sr = b.rateFor(topHz);
    const rng = b.stream(name);
    const raw = clip(sr, seconds, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = raw.channels[ch];
      noise(d, rng, tilt === 'brown' ? 'brown' : 'pink', 1);
      filter(d, sr, 'bandpass', band, q);
      // Wind is gusts, not hiss: several slow independent modulators.
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const gust =
          0.55 +
          0.2 * Math.sin(t * 0.19 + ch) +
          0.14 * Math.sin(t * 0.47 + 1.7 * ch) +
          0.11 * Math.sin(t * 1.13 + 2.9 * ch);
        d[i] *= gust;
      }
      // A resonance that wanders, as air over an opening actually does.
      const whistle = new Float32Array(d.length);
      noise(whistle, rng, 'white', 1);
      sweep(whistle, sr, 'bandpass', band * 4.2, band * 2.1, seconds * 0.6, 5, 0.8);
      scale(whistle, tilt === 'brown' ? 0.15 : 0.5);
      for (let i = 0; i < d.length; i++) d[i] += whistle[i];
      removeDc(d);
    }
    const loop = makeLoopable(raw, 1.2);
    normaliseClip(loop, 0.6);
    b.set(name, [loop]);
  }
}

/** Distant town: traffic, generators, voices, all smeared past recognition. */
export function bakeCity(b: Bakery): void {
  // Twice-lowpassed at 620 Hz, and the voices go no higher than 1.4 kHz.
  const sr = b.rateFor(2000);
  const rng = b.stream('amb_city');
  const raw = clip(sr, 13, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = raw.channels[ch];
    noise(d, rng, 'brown', 1);
    filter(d, sr, 'lowpass', 620, 0.7, 0, 2);
    filter(d, sr, 'highpass', 55, 0.7);
    scale(d, 5);
    // Swells: a truck somewhere, a generator loading up.
    for (let s = 0; s < 9; s++) {
      const at = Math.round(rng.range(0, raw.duration - 2.5) * sr);
      const len = Math.round(rng.range(1.1, 2.4) * sr);
      const seg = new Float32Array(d.length);
      noise(seg, rng, 'brown', 1);
      filter(seg, sr, 'bandpass', rng.range(90, 260), 0.8);
      for (let i = 0; i < len && at + i < d.length; i++) {
        const u = i / len;
        seg[at + i] *= Math.sin(Math.PI * u) ** 1.6;
      }
      scale(seg, rng.range(1.5, 4));
      for (let i = 0; i < d.length; i++) d[i] += seg[i];
    }
    // Unintelligible human presence, well down in the mix.
    for (let s = 0; s < 14; s++) {
      const at = Math.round(rng.range(0, raw.duration - 1) * sr);
      const len = rng.range(0.15, 0.5);
      const seg = new Float32Array(d.length);
      tone(seg, sr, rng.range(120, 240), len, { wave: 'saw', gain: 0.1 }, at);
      filter(seg, sr, 'peaking', rng.range(500, 1400), 4, 10);
      filter(seg, sr, 'lowpass', 1400, 0.8);
      perc(seg, sr, 0.03, len * 0.5, 1.4, at);
      scale(seg, 0.4);
      for (let i = 0; i < d.length; i++) d[i] += seg[i];
    }
    removeDc(d);
  }
  const loop = makeLoopable(raw, 1.5);
  normaliseClip(loop, 0.4);
  b.set('amb_city', [loop]);
}

/** Surf, a long way off. Broadband, slow, and never quite the same swell twice. */
export function bakeSurf(b: Bakery): void {
  // A wide bandpass at 620 Hz: gentle skirts, so leave a good deal of room.
  const sr = b.rateFor(6000);
  const rng = b.stream('amb_surf');
  const raw = clip(sr, 15, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = raw.channels[ch];
    noise(d, rng, 'pink', 1);
    filter(d, sr, 'bandpass', 620, 0.4);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // Sets of waves, not a metronome.
      const swell =
        0.35 +
        0.3 * Math.max(0, Math.sin(t * 0.62 + Math.sin(t * 0.11) * 2)) ** 2 +
        0.22 * Math.max(0, Math.sin(t * 0.41 + 2.1)) ** 3;
      d[i] *= swell;
    }
    removeDc(d);
  }
  const loop = makeLoopable(raw, 1.8);
  normaliseClip(loop, 0.36);
  b.set('amb_surf', [loop]);
}

/** The tone of being indoors: no wind, a little hum, a lot of nothing. */
export function bakeRoomTone(b: Bakery): void {
  // Bass, hum, and a thin band of air at 2.4 kHz above it.
  const sr = b.rateFor(6000);
  const rng = b.stream('amb_room');
  const raw = clip(sr, 7, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = raw.channels[ch];
    noise(d, rng, 'brown', 1);
    filter(d, sr, 'lowpass', 320, 0.7, 0, 2);
    scale(d, 3.5);
    // Mains hum, faint, because there is a generator running somewhere.
    tone(d, sr, 50, raw.duration, { gain: 0.05 });
    tone(d, sr, 150, raw.duration, { gain: 0.022 });
    const air = new Float32Array(d.length);
    noise(air, rng, 'pink', 1);
    filter(air, sr, 'bandpass', 2400, 0.5);
    scale(air, 0.12);
    for (let i = 0; i < d.length; i++) d[i] += air[i];
    // Something settling, occasionally.
    for (let s = 0; s < 4; s++) {
      const at = Math.round(rng.range(0, raw.duration - 0.5) * sr);
      const ex = new Float32Array(Math.round(0.002 * sr) + at);
      white(ex, rng, 0.4, at, Math.round(0.001 * sr));
      perc(ex, sr, 0.0002, 0.0008, 3, at);
      modal(
        d,
        ex,
        sr,
        [{ freq: rng.range(300, 1300), decay: rng.range(0.03, 0.12), gain: 0.08 }],
        at,
        0,
      );
    }
    removeDc(d);
  }
  const loop = makeLoopable(raw, 1);
  normaliseClip(loop, 0.3);
  b.set('amb_room', [loop]);
}

/**
 * One-shots layered over the beds. These are what break the loop: at a random
 * interval and a random bearing, so the ear never gets a period to lock onto.
 */
export function bakeAmbientOneShots(b: Bakery): void {
  const sr = b.sampleRate;

  /* Gulls. A gull's call is a harsh glottal cry, repeated two or three times. */
  {
    const rng = b.stream('gull');
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(4); v++) {
      const cries = 2 + rng.int(3);
      const c = clip(sr, 0.25 + cries * 0.31);
      const d = c.channels[0];
      let t = 0.05;
      for (let k = 0; k < cries; k++) {
        const at = Math.round(t * sr);
        const len = rng.range(0.13, 0.24);
        const f0 = rng.range(720, 1080) * (1 - k * 0.05);
        const seg = new Float32Array(d.length);
        tone(
          seg,
          sr,
          f0,
          len,
          {
            wave: 'saw',
            toFreq: f0 * rng.range(0.6, 0.85),
            glide: len * 0.8,
            glideCurve: 1.6,
            gain: 0.5,
            fmRatio: 0.06,
            fmIndex: 0.5,
          },
          at,
        );
        white(seg, rng, 0.1, at, Math.round(len * sr));
        filter(seg, sr, 'peaking', rng.range(1400, 2400), 5, 12);
        filter(seg, sr, 'bandpass', 1500, 0.55);
        perc(seg, sr, 0.008, len * 0.45, 1.5, at);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
        t += len + rng.range(0.06, 0.16);
      }
      removeDc(d);
      normalise(d, 0.42);
      fadeEdges(d, sr, 0.003, 0.04);
      clips.push(c);
    }
    b.set('amb_gull', clips);
  }

  /* Cloth: an awning or a tarpaulin taking a gust. */
  {
    const rng = b.stream('flap');
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(4); v++) {
      const flaps = 2 + rng.int(4);
      const c = clip(sr, 0.2 + flaps * 0.19);
      const d = c.channels[0];
      let t = 0.02;
      for (let k = 0; k < flaps; k++) {
        const at = Math.round(t * sr);
        const len = rng.range(0.05, 0.11);
        const seg = new Float32Array(d.length);
        noise(seg, rng, 'pink', 1);
        sweep(seg, sr, 'bandpass', rng.range(700, 1500), rng.range(200, 420), len, 0.8, 1.2);
        perc(seg, sr, 0.0015, len * 0.5, 2, at);
        scale(seg, rng.range(0.5, 1) * 2.4);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
        t += len + rng.range(0.04, 0.13);
      }
      filter(d, sr, 'highpass', 140, 0.7);
      removeDc(d);
      normalise(d, 0.38);
      fadeEdges(d, sr, 0.002, 0.03);
      clips.push(c);
    }
    b.set('amb_cloth', clips);
  }

  /* Grit and dust skittering along the ground when the wind gets up. */
  {
    const rng = b.stream('grit');
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(2); v++) {
      const c = clip(sr, 1.5);
      const d = c.channels[0];
      const src = new Float32Array(Math.round(0.04 * sr));
      white(src, rng, 1);
      filter(src, sr, 'bandpass', 5200, 1.3);
      scatterGrains(d, src, sr, rng, {
        spread: 1.3,
        count: Math.round(46 * (0.5 + 0.5 * b.quality)),
        length: 0.004,
        rateMin: 0.7,
        rateMax: 2,
        gain: 0.4,
        clumping: 1,
        flip: true,
      });
      for (let i = 0; i < d.length; i++) {
        const u = i / d.length;
        d[i] *= Math.sin(Math.PI * u) ** 1.2;
      }
      removeDc(d);
      normalise(d, 0.24);
      fadeEdges(d, sr, 0.01, 0.1);
      clips.push(c);
    }
    b.set('amb_grit', clips);
  }

  /* A dog, a long way off. One of the oldest tricks for making a town alive. */
  {
    const rng = b.stream('dog');
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(2); v++) {
      const barks = 2 + rng.int(3);
      const c = clip(sr, 0.2 + barks * 0.36);
      const d = c.channels[0];
      let t = 0.04;
      for (let k = 0; k < barks; k++) {
        const at = Math.round(t * sr);
        const len = rng.range(0.09, 0.16);
        const f0 = rng.range(230, 330);
        const seg = new Float32Array(d.length);
        tone(seg, sr, f0 * 1.5, len, { wave: 'saw', toFreq: f0 * 0.8, glide: len * 0.7, gain: 0.5 }, at);
        white(seg, rng, 0.12, at, Math.round(len * sr));
        filter(seg, sr, 'peaking', 620, 3, 11);
        filter(seg, sr, 'peaking', 1500, 4, 7);
        filter(seg, sr, 'lowpass', 2600, 0.8);
        perc(seg, sr, 0.004, len * 0.4, 1.8, at);
        for (let i = 0; i < d.length; i++) d[i] += seg[i];
        t += len + rng.range(0.12, 0.26);
      }
      removeDc(d);
      normalise(d, 0.3);
      fadeEdges(d, sr, 0.003, 0.05);
      clips.push(c);
    }
    b.set('amb_dog', clips);
  }
}
