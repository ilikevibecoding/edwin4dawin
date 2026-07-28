/**
 * Ordnance: blasts, debris, aircraft and the things that fall out of them.
 *
 * An explosion is the loudest thing in the game and the one most likely to
 * wreck the mix, so it is built to a shape rather than to a peak: a shock
 * front, a low-frequency punch that is felt more than heard, a roar that eats
 * the midrange for a moment, and a rumble that outlasts all of it. The limiter
 * on the master bus assumes exactly this shape.
 */

import type { Bakery } from './Bakery';
import {
  Clip,
  type Mode,
  clip,
  comb,
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
  scatterGrains,
  shapeFold,
  shapeTanh,
  sweep,
  tone,
  white,
} from '../dsp/Kernel';

interface BlastRecipe {
  /** Shock front. */
  crackHz: number;
  crackDecay: number;
  crackGain: number;
  /** The punch: a fast falling sine that carries most of the energy. */
  punchHz: number;
  punchTo: number;
  punchDecay: number;
  punchGain: number;
  /** The roar: broadband noise swept down. */
  roarFrom: number;
  roarTo: number;
  roarDecay: number;
  roarGain: number;
  /** The rumble: a very low, very long bed. */
  rumbleHz: number;
  rumbleDecay: number;
  rumbleGain: number;
  /** Torn metal, for a barrel or a vehicle. */
  metal?: Mode[];
  metalGain?: number;
  /** Debris hitting the ground within the blast clip itself. */
  debris?: { count: number; spread: number; gain: number; hz: number };
  length: number;
  peak: number;
}

const BLASTS: Record<string, BlastRecipe> = {
  grenade: {
    crackHz: 2600,
    crackDecay: 0.0035,
    crackGain: 1,
    punchHz: 88,
    punchTo: 34,
    punchDecay: 0.16,
    punchGain: 1,
    roarFrom: 4200,
    roarTo: 190,
    roarDecay: 0.24,
    roarGain: 0.8,
    rumbleHz: 62,
    rumbleDecay: 1,
    rumbleGain: 0.45,
    debris: { count: 16, spread: 0.9, gain: 0.2, hz: 2600 },
    length: 1.9,
    peak: 0.92,
  },
  bomb: {
    crackHz: 1500,
    crackDecay: 0.006,
    crackGain: 0.9,
    punchHz: 62,
    punchTo: 21,
    punchDecay: 0.36,
    punchGain: 1,
    roarFrom: 3200,
    roarTo: 105,
    roarDecay: 0.62,
    roarGain: 1,
    rumbleHz: 38,
    rumbleDecay: 2.7,
    rumbleGain: 0.85,
    debris: { count: 34, spread: 2.2, gain: 0.26, hz: 1900 },
    length: 4.2,
    peak: 0.95,
  },
  barrel: {
    crackHz: 2200,
    crackDecay: 0.004,
    crackGain: 0.85,
    punchHz: 95,
    punchTo: 40,
    punchDecay: 0.19,
    punchGain: 0.9,
    roarFrom: 3600,
    roarTo: 240,
    roarDecay: 0.42,
    roarGain: 0.9,
    rumbleHz: 70,
    rumbleDecay: 1.2,
    rumbleGain: 0.4,
    metal: [
      { freq: 320, decay: 0.5, gain: 0.5 },
      { freq: 760, decay: 0.36, gain: 0.4 },
      { freq: 1580, decay: 0.24, gain: 0.28 },
    ],
    metalGain: 0.55,
    debris: { count: 22, spread: 1.4, gain: 0.28, hz: 3200 },
    length: 2.4,
    peak: 0.92,
  },
  rocket: {
    crackHz: 3000,
    crackDecay: 0.003,
    crackGain: 1,
    punchHz: 105,
    punchTo: 42,
    punchDecay: 0.14,
    punchGain: 0.92,
    roarFrom: 5200,
    roarTo: 260,
    roarDecay: 0.26,
    roarGain: 0.85,
    rumbleHz: 68,
    rumbleDecay: 0.9,
    rumbleGain: 0.4,
    debris: { count: 14, spread: 0.8, gain: 0.2, hz: 3000 },
    length: 1.8,
    peak: 0.92,
  },
  vehicle: {
    crackHz: 1800,
    crackDecay: 0.005,
    crackGain: 0.85,
    punchHz: 72,
    punchTo: 28,
    punchDecay: 0.3,
    punchGain: 1,
    roarFrom: 3000,
    roarTo: 150,
    roarDecay: 0.55,
    roarGain: 0.95,
    rumbleHz: 46,
    rumbleDecay: 2,
    rumbleGain: 0.7,
    metal: [
      { freq: 190, decay: 0.8, gain: 0.55 },
      { freq: 470, decay: 0.55, gain: 0.42 },
      { freq: 1120, decay: 0.34, gain: 0.3 },
      { freq: 2300, decay: 0.2, gain: 0.18 },
    ],
    metalGain: 0.6,
    debris: { count: 30, spread: 2,
      gain: 0.3, hz: 2400 },
    length: 3.4,
    peak: 0.94,
  },
};

export const BLAST_KINDS: readonly string[] = Object.keys(BLASTS);

export function bakeBlasts(b: Bakery, kinds: readonly string[] = BLAST_KINDS): void {
  const sr = b.sampleRate;
  for (const k of kinds) {
    const name = `blast:${k}`;
    if (b.has(name)) continue;
    const r = BLASTS[k];
    if (!r) continue;
    const rng = b.stream(name);
    const count = b.variants(2);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, r.length, 2);
      const jitter = 1 + rng.bi() * 0.08;
      for (let ch = 0; ch < 2; ch++) {
        const d = c.channels[ch];

        /*
         * Shock front. Only a couple of milliseconds, but it is the difference
         * between a blast and a whoomph — and it has to be the loudest moment
         * in the clip, because that is what an overpressure wave is: a
         * near-instantaneous rise, then decay. Left level with the punch it is
         * still audible but no longer the peak, and the blast then measures a
         * 24 ms attack and reads as a distant one however close it went off.
         */
        const cr = new Float32Array(d.length);
        white(cr, rng, 1);
        filter(cr, sr, 'highpass', r.crackHz * jitter, 0.7);
        perc(cr, sr, 0.00008, r.crackDecay, 2.6);
        shapeFold(cr, 1.7);
        scale(cr, r.crackGain * 1.3);
        for (let i = 0; i < d.length; i++) d[i] += cr[i];

        // Punch, starting at the crest so that its maximum coincides with the
        // shock front instead of arriving a quarter of a cycle behind it.
        const pu = new Float32Array(d.length);
        tone(pu, sr, r.punchHz * jitter, r.punchDecay * 4, {
          toFreq: r.punchTo * jitter,
          glide: r.punchDecay * 1.6,
          glideCurve: 0.55,
          gain: 1,
          phase: Math.PI / 2,
        });
        tone(pu, sr, r.punchHz * 1.5 * jitter, r.punchDecay * 2, {
          toFreq: r.punchTo * 1.5,
          glide: r.punchDecay,
          gain: 0.3,
          phase: Math.PI / 2,
        });
        /*
         * No attack ramp at all on the punch, which together with the crest
         * phase above means the low end is at full amplitude in the first
         * sample. The step that produces is not an artefact to be smoothed
         * away — it is the shock front, and a shock front is broadband by
         * definition. Ramp it over even a millisecond and the only thing
         * present at the head of the blast is the highpassed sizzle, so the
         * clip's loudest moment migrates to whenever the low layers finish
         * fading in and the explosion loses its point of impact.
         */
        perc(pu, sr, 0.00005, r.punchDecay, 1.8);
        shapeTanh(pu, 1.8, 0.85);
        scale(pu, r.punchGain * 1.5);
        for (let i = 0; i < d.length; i++) d[i] += pu[i];

        // Roar.
        const ro = new Float32Array(d.length);
        noise(ro, rng, 'white', 1);
        sweep(ro, sr, 'lowpass', r.roarFrom * jitter, r.roarTo, r.roarDecay * 1.8, 0.9, 1.6);
        perc(ro, sr, 0.003, r.roarDecay, 1.7);
        shapeTanh(ro, 2.2, 0.55);
        scale(ro, r.roarGain * 1.6);
        for (let i = 0; i < d.length; i++) d[i] += ro[i];

        // Rumble.
        const ru = new Float32Array(d.length);
        noise(ru, rng, 'brown', 1);
        filter(ru, sr, 'lowpass', r.rumbleHz * 2.6, 0.9, 0, 3);
        filter(ru, sr, 'highpass', 24, 0.7);
        decayTo60(ru, sr, r.rumbleDecay);
        /*
         * Under the punch, not over it. At eight times its recipe level — which
         * is what it took to get a bed through three passes of a 160 Hz lowpass
         * — the rumble was three and a half times the size of the punch and set
         * the clip's peak all by itself, so the loudest instant of every
         * explosion in the game was a wandering maximum somewhere in the first
         * cycle of a sub-bass noise bed. The punch is the impact; this is what
         * is still arriving afterwards.
         */
        perc(ru, sr, 0.005, r.rumbleDecay * 0.7, 1.1);
        scale(ru, r.rumbleGain * 4.5);
        for (let i = 0; i < d.length; i++) d[i] += ru[i];

        if (r.metal) {
          const ex = new Float32Array(Math.round(0.006 * sr));
          white(ex, rng, 1);
          perc(ex, sr, 0.0002, 0.0025, 2.4);
          const m = new Float32Array(d.length);
          modal(m, ex, sr, r.metal, 0, 0.08, rng);
          scale(m, (r.metalGain ?? 0.5) * 2);
          for (let i = 0; i < d.length; i++) d[i] += m[i];
        }

        if (r.debris) {
          const src = new Float32Array(Math.round(0.06 * sr));
          white(src, rng, 1);
          filter(src, sr, 'bandpass', r.debris.hz, 1.3);
          const g = new Float32Array(d.length);
          scatterGrains(g, src, sr, rng, {
            spread: r.debris.spread,
            count: Math.round(r.debris.count * (0.5 + 0.5 * b.quality)),
            length: 0.006,
            rateMin: 0.5,
            rateMax: 2.2,
            gain: r.debris.gain * 2,
            clumping: 2.6,
            flip: true,
          });
          for (let i = 0; i < d.length; i++) d[i] += g[i];
        }

        removeDc(d);
        /*
         * The recording chain giving up, and then the shock front on top of it.
         *
         * Soft-clipping the summed blast is what an explosion loud enough to be
         * worth hearing actually does to whatever captures it, and it also bounds
         * the sub-bass layers: the punch, the roar and the rumble all start
         * together, so which of their excursions in the first ten milliseconds is
         * the largest is a matter of phase luck, and left alone it decides the
         * peak of the whole clip. Through the curve the body cannot exceed
         * `1/tanh(0.6)`, whatever it does underneath.
         *
         * The front is then added afterwards, above a known ceiling rather than
         * into a contest it might lose. That ordering is the physics as well: the
         * overpressure discontinuity is the loudest instant of a blast and
         * everything else is the decay behind it, so a grenade going off at your
         * feet has its peak at its own arrival, not nine milliseconds later.
         */
        shapeTanh(d, 0.6, 1);
        const front = 1.3 * r.crackGain;
        d[0] += front;
        d[1] += front * 0.6;
        d[2] += front * 0.3;
        fadeEdges(d, sr, 0, 0.08);
      }
      normaliseClip(c, r.peak);
      clips.push(c);
    }
    b.set(name, clips);
  }
}

/**
 * Debris rain: what lands after the blast has gone. Long, sparse and quiet,
 * and the thing that makes an explosion feel like it happened in a place made
 * of stuff rather than in a vacuum.
 */
export function bakeDebris(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('debris');
  const count = b.variants(2);
  const clips: Clip[] = [];
  for (let v = 0; v < count; v++) {
    const c = clip(sr, 2.6, 2);
    // A palette of small impacts: chips of masonry, grit, a scrap of metal.
    const one = Math.round(0.05 * sr);
    const palette = new Float32Array(one * 5);
    for (let p = 0; p < 5; p++) {
      const seg = new Float32Array(one);
      white(seg, rng, 1);
      if (p < 3) {
        filter(seg, sr, 'bandpass', rng.range(900, 3600), 1.1);
        perc(seg, sr, 0.00008, rng.range(0.002, 0.008), 2.6);
      } else {
        const ex = new Float32Array(one);
        white(ex, rng, 1);
        perc(ex, sr, 0.00005, 0.0006, 3);
        seg.fill(0);
        modal(
          seg,
          ex,
          sr,
          [
            { freq: rng.range(1400, 4200), decay: rng.range(0.03, 0.09), gain: 0.6 },
            { freq: rng.range(2600, 7000), decay: rng.range(0.02, 0.05), gain: 0.35 },
          ],
          0,
          0,
        );
      }
      normalise(seg, 0.9);
      for (let i = 0; i < one; i++) palette[p * one + i] = seg[i];
    }
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      scatterGrains(d, palette, sr, rng, {
        spread: 2.4,
        count: Math.round(64 * (0.4 + 0.6 * b.quality)),
        length: 0.03,
        lengthJitter: 0.8,
        rateMin: 0.6,
        rateMax: 2.1,
        gain: 0.42,
        clumping: 2.1,
        flip: true,
      });
      // Dust settling under the impacts.
      const dust = new Float32Array(d.length);
      noise(dust, rng, 'pink', 1);
      filter(dust, sr, 'bandpass', 700, 0.6);
      decayTo60(dust, sr, 1.6);
      scale(dust, 0.35);
      for (let i = 0; i < d.length; i++) d[i] += dust[i];
      removeDc(d);
      fadeEdges(d, sr, 0.004, 0.2);
    }
    normaliseClip(c, 0.55);
    clips.push(c);
  }
  b.set('debris', clips);
}

/** Napalm: the whoosh of ignition and a settling fire roar. */
export function bakeNapalm(b: Bakery): void {
  // The ignition sweep tops out at 1.5 kHz and the roar is lowpassed at 420.
  const sr = b.rateFor(4000);
  const rng = b.stream('napalm');
  const c = clip(sr, 3.4, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = c.channels[ch];
    noise(d, rng, 'white', 1);
    sweep(d, sr, 'bandpass', 260, 1500, 0.35, 0.7, 0.6);
    perc(d, sr, 0.045, 1.1, 1.1);
    const roar = new Float32Array(d.length);
    noise(roar, rng, 'brown', 1);
    filter(roar, sr, 'lowpass', 420, 0.8, 0, 2);
    // Fire is turbulent: slow irregular amplitude modulation is the whole tell.
    for (let i = 0; i < roar.length; i++) {
      const t = i / sr;
      roar[i] *= 0.55 + 0.45 * Math.sin(t * 7.3 + Math.sin(t * 2.1) * 4);
    }
    perc(roar, sr, 0.12, 1.9, 0.9);
    scale(roar, 5);
    for (let i = 0; i < d.length; i++) d[i] += roar[i];
    // The initial thump of the canister opening.
    tone(d, sr, 74, 0.4, { toFreq: 36, glide: 0.2, gain: 0.5 });
    removeDc(d);
    fadeEdges(d, sr, 0.002, 0.3);
  }
  normaliseClip(c, 0.85);
  b.set('napalm', [c]);
}

/** Smoke grenade: a pressurised hiss that builds then thins. */
export function bakeSmoke(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('smokehiss');
  const c = clip(sr, 3.2, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = c.channels[ch];
    noise(d, rng, 'white', 1);
    filter(d, sr, 'bandpass', 4200, 0.55);
    filter(d, sr, 'highpass', 1400, 0.7);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      const env = Math.min(1, t / 0.12) * Math.exp(-Math.max(0, t - 0.4) * 0.8);
      d[i] *= env * (0.8 + 0.2 * Math.sin(t * 31 + Math.sin(t * 5) * 3));
    }
    // The pop of the fuse.
    const pop = new Float32Array(d.length);
    white(pop, rng, 1);
    filter(pop, sr, 'bandpass', 1800, 0.8);
    perc(pop, sr, 0.0003, 0.02, 2.4);
    scale(pop, 0.5);
    for (let i = 0; i < d.length; i++) d[i] += pop[i];
    removeDc(d);
    fadeEdges(d, sr, 0.0005, 0.25);
  }
  normaliseClip(c, 0.55);
  b.set('smoke_hiss', [c]);
}

/**
 * Flashbang. Almost all transient: an extremely sharp, extremely loud crack
 * with nothing behind it, which is why it takes the listener's hearing with it.
 */
export function bakeFlashbang(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('flashbang');
  const clips: Clip[] = [];
  for (let v = 0; v < b.variants(2); v++) {
    const c = clip(sr, 1.1, 2);
    for (let ch = 0; ch < 2; ch++) {
      const d = c.channels[ch];
      white(d, rng, 1);
      filter(d, sr, 'highpass', 900, 0.7);
      perc(d, sr, 0.00006, 0.006, 2.8);
      d[0] += 0.9;
      d[1] -= 0.5;
      shapeFold(d, 2.1);
      const punch = new Float32Array(d.length);
      tone(punch, sr, 150, 0.18, { toFreq: 62, glide: 0.06, gain: 0.7 });
      perc(punch, sr, 0.0008, 0.05, 2);
      for (let i = 0; i < d.length; i++) d[i] += punch[i];
      const ring = new Float32Array(d.length);
      noise(ring, rng, 'white', 1);
      filter(ring, sr, 'bandpass', 3400, 1.6);
      decayTo60(ring, sr, 0.5);
      scale(ring, 0.7);
      for (let i = 0; i < d.length; i++) d[i] += ring[i];
      removeDc(d);
      fadeEdges(d, sr, 0, 0.06);
    }
    normaliseClip(c, 0.96);
    clips.push(c);
  }
  b.set('flashbang', clips);

  // What it sounds like through a wall, or with your hands over your ears.
  const m = clip(sr, 1.1, 2);
  const src = clips[0];
  for (let ch = 0; ch < 2; ch++) {
    const d = m.channels[ch];
    const s = src.ch(ch);
    for (let i = 0; i < Math.min(d.length, s.length); i++) d[i] = s[i];
    filter(d, sr, 'lowpass', 620, 0.8, 0, 3);
    filter(d, sr, 'highpass', 70, 0.7);
  }
  normaliseClip(m, 0.6);
  b.set('flashbang_muffled', [m]);
}

/* ============================== aircraft =============================== */

/**
 * A jet, as a seamless loop. Live playback rate does the doppler, which is why
 * this has to be a loop and not a designed flyby: a real pass-by is one
 * continuous source whose pitch and level change as the geometry does.
 */
export function bakeJet(b: Bakery): void {
  // Highest turbine partial is 5.34 kHz; the doppler shifts that up a little.
  const sr = b.rateFor(7000);
  const rng = b.stream('jet');
  const raw = clip(sr, 4.2, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = raw.channels[ch];
    // Exhaust: broadband, heavily weighted low.
    noise(d, rng, 'brown', 1);
    filter(d, sr, 'lowpass', 900, 0.8, 0, 2);
    scale(d, 6);
    const mid = new Float32Array(d.length);
    noise(mid, rng, 'pink', 1);
    filter(mid, sr, 'bandpass', 420, 0.55);
    scale(mid, 1.6);
    for (let i = 0; i < d.length; i++) d[i] += mid[i];
    // Turbine: a set of harmonically related whines well above the exhaust.
    for (const [f, g] of [
      [1780, 0.11],
      [2670, 0.07],
      [3560, 0.045],
      [5340, 0.022],
    ] as const) {
      tone(d, sr, f * (1 + rng.bi() * 0.01), raw.duration, {
        wave: 'sine',
        gain: g,
        fmRatio: 0.004,
        fmIndex: 0.5,
      });
    }
    // Turbulence, so a four second loop does not read as a tone.
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] *= 0.86 + 0.14 * Math.sin(t * 3.1 + Math.sin(t * 0.77) * 5);
    }
    removeDc(d);
  }
  normaliseClip(raw, 0.8);
  b.set('jet', [makeLoopable(raw, 0.35)]);
}

/** A helicopter: rotor slap at the blade rate, plus turbine. */
export function bakeHelicopter(b: Bakery): void {
  // Rotor slap is lowpassed at 780 Hz; the turbine whine sits at 2.45 kHz.
  const sr = b.rateFor(3200);
  const rng = b.stream('heli');
  const raw = clip(sr, 3.6, 2);
  const bladeHz = 15.4;
  for (let ch = 0; ch < 2; ch++) {
    const d = raw.channels[ch];
    const period = Math.round(sr / bladeHz);
    // Each blade passing the tail boom is a discrete slap.
    for (let at = 0; at + period < d.length; at += period) {
      const len = Math.round(0.03 * sr);
      const slap = new Float32Array(len);
      white(slap, rng, 1);
      filter(slap, sr, 'lowpass', 780, 1.2, 0, 2);
      perc(slap, sr, 0.0015, 0.009, 2);
      const jitter = 1 + rng.bi() * 0.02;
      for (let i = 0; i < len; i++) {
        const o = at + Math.round(i * jitter) + (ch === 1 ? 12 : 0);
        if (o < d.length) d[o] += slap[i] * 1.4;
      }
    }
    const air = new Float32Array(d.length);
    noise(air, rng, 'brown', 1);
    filter(air, sr, 'lowpass', 480, 0.8, 0, 2);
    scale(air, 4);
    for (let i = 0; i < d.length; i++) d[i] += air[i];
    tone(d, sr, 2450, raw.duration, { gain: 0.05, fmRatio: 0.003, fmIndex: 0.6 });
    tone(d, sr, 1225, raw.duration, { gain: 0.035 });
    removeDc(d);
  }
  normaliseClip(raw, 0.78);
  b.set('heli', [makeLoopable(raw, 0.2)]);
}

/**
 * A bomb falling. The descending whistle is a real artefact of fins in
 * airflow, and it is also the single most useful piece of information the game
 * can give a player about to be inside a crater.
 */
export function bakeWhistle(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('whistle');
  const c = clip(sr, 3, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = c.channels[ch];
    tone(d, sr, 1650, 3, { wave: 'sine', toFreq: 320, glide: 2.7, glideCurve: 1.7, gain: 0.5 });
    tone(d, sr, 2480, 3, { wave: 'sine', toFreq: 480, glide: 2.7, glideCurve: 1.7, gain: 0.16 });
    const air = new Float32Array(d.length);
    noise(air, rng, 'white', 1);
    sweep(air, sr, 'bandpass', 2600, 620, 2.7, 3.5, 1.7);
    scale(air, 2.6);
    for (let i = 0; i < d.length; i++) d[i] += air[i];
    // It gets louder as it gets closer, right up to the moment it does not.
    for (let i = 0; i < d.length; i++) {
      const u = i / d.length;
      d[i] *= 0.12 + 0.88 * Math.pow(u, 2.4);
    }
    removeDc(d);
    fadeEdges(d, sr, 0.02, 0.004);
  }
  normaliseClip(c, 0.7);
  b.set('bomb_whistle', [c]);
}

/** A hardpoint letting go: pneumatics and a heavy mass leaving a rail. */
export function bakeRelease(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('release');
  const c = clip(sr, 0.4);
  const d = c.channels[0];
  const ex = new Float32Array(Math.round(0.003 * sr));
  white(ex, rng, 1);
  perc(ex, sr, 0.0001, 0.001, 3);
  modal(
    d,
    ex,
    sr,
    [
      { freq: 380, decay: 0.09, gain: 0.6 },
      { freq: 880, decay: 0.06, gain: 0.4 },
      { freq: 1950, decay: 0.03, gain: 0.22 },
    ],
    0,
    0.04,
    rng,
  );
  const hiss = new Float32Array(d.length);
  noise(hiss, rng, 'white', 1);
  filter(hiss, sr, 'bandpass', 5200, 0.7);
  perc(hiss, sr, 0.002, 0.07, 1.8);
  scale(hiss, 1.4);
  for (let i = 0; i < d.length; i++) d[i] += hiss[i];
  removeDc(d);
  normalise(d, 0.72);
  fadeEdges(d, sr, 0.0002, 0.02);
  b.set('bomb_release', [c]);

  // A cluster canister opening: a sharper crack and a shower of small charges.
  const cc = clip(sr, 0.9);
  const cd = cc.channels[0];
  white(cd, rng, 1);
  filter(cd, sr, 'bandpass', 2600, 0.9);
  perc(cd, sr, 0.0002, 0.03, 2.2);
  const src = new Float32Array(Math.round(0.03 * sr));
  white(src, rng, 1);
  filter(src, sr, 'bandpass', 3400, 1.4);
  scatterGrains(cd, src, sr, rng, {
    spread: 0.7,
    count: 22,
    length: 0.005,
    gain: 0.5,
    clumping: 1.6,
    flip: true,
  });
  removeDc(cd);
  normalise(cd, 0.7);
  fadeEdges(cd, sr, 0.0002, 0.05);
  b.set('cluster_open', [cc]);
}

/**
 * The long low rumble that rolls back from a distant impact. Not a blast — the
 * blast has already happened somewhere else and this is what the ground and the
 * buildings between here and there give back.
 */
export function bakeDistantRumble(b: Bakery): void {
  // Lowpassed three times at 130 Hz: this is sub-bass and nothing else.
  const sr = b.rateFor(1200);
  const rng = b.stream('rumble');
  const c = clip(sr, 4.5, 2);
  for (let ch = 0; ch < 2; ch++) {
    const d = c.channels[ch];
    noise(d, rng, 'brown', 1);
    filter(d, sr, 'lowpass', 130, 0.9, 0, 3);
    filter(d, sr, 'highpass', 22, 0.7);
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      d[i] *= Math.min(1, t / 0.35) * Math.exp(-Math.max(0, t - 0.5) * 0.85);
    }
    scale(d, 9);
    comb(d, sr, 0.083, 0.28, 1);
    removeDc(d);
    fadeEdges(d, sr, 0.02, 0.4);
  }
  normaliseClip(c, 0.8);
  b.set('distant_rumble', [c]);
}

/** A grenade bouncing off masonry before it goes off. */
export function bakeGrenadeBounce(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('bounce');
  const clips: Clip[] = [];
  for (let v = 0; v < b.variants(3); v++) {
    const c = clip(sr, 0.16);
    const d = c.channels[0];
    const ex = new Float32Array(Math.round(0.0015 * sr));
    white(ex, rng, 1);
    perc(ex, sr, 0.00005, 0.0005, 3);
    modal(
      d,
      ex,
      sr,
      [
        { freq: 620, decay: 0.035, gain: 0.6 },
        { freq: 1480, decay: 0.024, gain: 0.4 },
        { freq: 2900, decay: 0.014, gain: 0.24 },
      ],
      0,
      0.07,
      rng,
    );
    const tick = new Float32Array(d.length);
    white(tick, rng, 1);
    filter(tick, sr, 'highpass', 2200, 0.7);
    perc(tick, sr, 0.00004, 0.0009, 3);
    scale(tick, 0.8);
    for (let i = 0; i < d.length; i++) d[i] += tick[i];
    removeDc(d);
    normalise(d, 0.5);
    fadeEdges(d, sr, 0, 0.008);
    clips.push(c);
  }
  b.set('grenade_bounce', clips);
}

/**
 * Autocannon. A 40 mm from a gunship is not a rifle shot scaled up: the report
 * is longer, the shock front is blunter because the muzzle is enormous, and
 * there is a mechanical thud behind it that a small arm does not have.
 */
export function bakeCannon(b: Bakery): void {
  const sr = b.sampleRate;
  for (const [name, punchHz, bodyHz, decay, peak] of [
    ['cannon_light', 105, 420, 0.14, 0.86],
    ['cannon', 58, 210, 0.3, 0.92],
  ] as const) {
    const rng = b.stream(name);
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(3); v++) {
      const c = clip(sr, decay * 8 + 0.2);
      const d = c.channels[0];
      const j = 1 + rng.bi() * 0.07;
      // Shock front, blunter than a rifle's.
      const cr = new Float32Array(d.length);
      white(cr, rng, 1);
      filter(cr, sr, 'highpass', 1400 * j, 0.6);
      perc(cr, sr, 0.00012, 0.005, 2.4);
      cr[0] += 0.55;
      shapeFold(cr, 1.6);
      for (let i = 0; i < d.length; i++) d[i] += cr[i];
      // Body.
      const body = new Float32Array(d.length);
      noise(body, rng, 'white', 1);
      sweep(body, sr, 'lowpass', 4200 * j, bodyHz * 0.7, decay * 1.6, 0.9, 1.6);
      filter(body, sr, 'bandpass', bodyHz * j, 0.8);
      perc(body, sr, 0.0009, decay, 1.9);
      scale(body, 2.6);
      for (let i = 0; i < d.length; i++) d[i] += body[i];
      // Punch.
      tone(d, sr, punchHz * j, decay * 4, {
        toFreq: punchHz * 0.45,
        glide: decay * 1.5,
        gain: 0.9,
      });
      // Mechanical: a breech that weighs as much as a man.
      const ex = new Float32Array(Math.round(0.004 * sr));
      white(ex, rng, 1);
      perc(ex, sr, 0.0001, 0.0015, 2.6);
      const mech = new Float32Array(d.length);
      modal(
        mech,
        ex,
        sr,
        [
          { freq: 280, decay: 0.09, gain: 0.5 },
          { freq: 640, decay: 0.06, gain: 0.32 },
          { freq: 1380, decay: 0.035, gain: 0.18 },
        ],
        Math.round(decay * 0.9 * sr),
        0.05,
        rng,
      );
      scale(mech, 0.9);
      for (let i = 0; i < d.length; i++) d[i] += mech[i];
      // Rolling tail.
      const tail = new Float32Array(d.length);
      white(tail, rng, 1);
      filter(tail, sr, 'lowpass', bodyHz * 3, 0.7, 0, 2);
      decayTo60(tail, sr, decay * 5);
      scale(tail, 0.8);
      for (let i = 0; i < d.length; i++) d[i] += tail[i];
      removeDc(d);
      normalise(d, peak);
      fadeEdges(d, sr, 0, 0.03);
      clips.push(c);
    }
    b.set(name, clips);
  }
}

/**
 * The snap of a round going past. Bandpass swept downward: that fall *is* the
 * doppler shift of a supersonic bow wave passing the ear, and it happens in
 * about forty milliseconds. Baked at several miss distances because the shape
 * changes with distance, not just the level.
 */
export function bakeWhizby(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('whizby');
  for (let band = 0; band < 3; band++) {
    // band 0 = very close and vicious, 2 = a distant zip.
    const topHz = [6200, 4200, 2600][band];
    const botHz = [900, 800, 700][band];
    const dur = [0.035, 0.05, 0.075][band];
    const clips: Clip[] = [];
    for (let v = 0; v < b.variants(3); v++) {
      const c = clip(sr, dur + 0.09);
      const d = c.channels[0];
      const j = 1 + rng.bi() * 0.12;
      white(d, rng, 1);
      sweep(d, sr, 'bandpass', topHz * j, botHz * j, dur, band === 0 ? 2.4 : 3.4, 1.25);
      /*
       * Fast in, slower out, and the doppler fall happens during the decay.
       *
       * A supersonic round drags an N-wave: the bow shock arrives in
       * microseconds and the wake behind it decays, so the snap is at the very
       * front. A symmetric envelope instead puts the loudest instant twenty-six
       * milliseconds after the round has already gone past, which sounds like a
       * swoosh — something moving nearby — rather than like something that
       * nearly hit you. That difference is the whole point of the sound.
       */
      const atk = Math.max(2, Math.round(sr * 0.0004));
      const fall = dur * 0.45;
      for (let i = 0; i < d.length; i++) {
        /*
         * The decay's exponent is below one on purpose. Above one this is a
         * Gaussian shoulder — flat for the first five milliseconds, so the
         * loudest sample of a noise burst lands anywhere in that window and the
         * front of the snap is not reliably its peak. Below one it falls from
         * the first sample, which is both what a shock front does and what
         * makes the sound's attack a property of the design rather than of
         * which noise sample happened to come out largest.
         */
        const env =
          i < atk ? (i / atk) ** 0.7 : Math.exp(-(((i - atk) / sr / fall) ** 0.8));
        d[i] *= env;
      }
      scale(d, 3.4);
      if (band === 0) {
        // Close enough to feel: a trace of low pressure behind the snap.
        const low = new Float32Array(d.length);
        tone(low, sr, 220, dur * 2, { toFreq: 110, glide: dur, gain: 0.35 });
        perc(low, sr, 0.001, dur, 1.8);
        for (let i = 0; i < d.length; i++) d[i] += low[i];
      }
      removeDc(d);
      normalise(d, 0.8);
      // No fade in: the envelope above already opens in 0.4 ms and anything
      // further would only blunt the front of the snap.
      fadeEdges(d, sr, 0, 0.012);
      clips.push(c);
    }
    b.set(`whizby:${band}`, clips);
  }
}
