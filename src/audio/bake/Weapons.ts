/**
 * Weapon voicing.
 *
 * A gunshot is built in five layers, which is how it is done for a real game:
 *
 *   1. transient  — a sub-millisecond broadband impulse; the snap
 *   2. body       — filtered noise plus resonant modes set by calibre and barrel
 *   3. mechanical — bolt, spring and receiver rattle
 *   4. sub        — the low-frequency punch you feel rather than hear
 *   5. tail       — the room's answer, arriving after the crack, not with it
 *
 * Layers 1–3 and the resonant part of 2 are assembled live from these baked
 * ingredients so that no two shots are the same; the tail is baked per zone
 * because a room's response does not change between rounds, only its level
 * does. `live/Shot.ts` does the assembling.
 *
 * The numbers below are the whole character of each weapon. They are derived
 * from the catalogue's calibre and rate of fire, then voiced by hand: a 5.56
 * carbine cracks, a 9 mm submachine gun snaps flat, a .338 booms, buckshot is a
 * broad low slam, and a pistol is dry and mid-forward.
 */

import type { Bakery } from './Bakery';
import {
  Clip,
  type Mode,
  Rng,
  clip,
  comb,
  decayTo60,
  fadeEdges,
  filter,
  modal,
  noise,
  normalise,
  perc,
  pink,
  removeDc,
  scale,
  shapeFold,
  shapeTanh,
  sweep,
  tone,
  white,
} from '../dsp/Kernel';
import { ZONES, ZONE_NAMES, type ZoneName } from '../dsp/Zones';

export type TailClass = 'light' | 'medium' | 'heavy';

export interface GunVoice {
  id: string;
  caliber: number;

  /* transient */
  /** Highpass corner of the crack layer, in Hz. */
  crackHz: number;
  /** Seconds for the crack to fall away. Under 8 ms for everything. */
  crackDecay: number;
  crackGain: number;
  /** Waveshaper drive on the crack; density is what reads as loudness. */
  crackDrive: number;

  /* body */
  bodyHz: number;
  bodyQ: number;
  /** Lowpass sweep start and end, and how long the fall takes. */
  sweepFrom: number;
  sweepTo: number;
  sweepTime: number;
  bodyDecay: number;
  bodyGain: number;

  /* resonance: the two modes that get live per-shot detune */
  res1Hz: number;
  res2Hz: number;
  resQ: number;
  resGain: number;
  /** Denser upper modes, baked into a ring clip. */
  modes: Mode[];
  ringGain: number;

  /* sub */
  subHz: number;
  subTo: number;
  subDecay: number;
  subGain: number;

  /* mechanical */
  mechGain: number;
  /** Seconds after the shot that the action noise arrives. */
  mechDelay: number;

  /* tail and distance */
  tailClass: TailClass;
  tailGain: number;
  /** Centre of the band a distant report collapses into. */
  farHz: number;
  farGain: number;

  /* suppressed */
  supGain: number;

  /**
   * Overall trim so the weapons sit against each other in the mix.
   *
   * Set from measurement, not by ear: `tools/audio-layers.mjs` normalises every
   * weapon's layer stack to the same peak into the saturator, so this is purely
   * the mix fader that decides how much louder a .338 is than a 9 mm. Applied
   * after the saturator, where the response is very nearly linear, so the number
   * means what it says.
   */
  trim: number;
}

const RIFLE: GunVoice = {
  id: 'rifle',
  caliber: 5.56,
  crackHz: 3100,
  crackDecay: 0.0032,
  crackGain: 1,
  crackDrive: 3.4,
  bodyHz: 900,
  bodyQ: 1.15,
  sweepFrom: 7200,
  sweepTo: 430,
  sweepTime: 0.042,
  bodyDecay: 0.055,
  bodyGain: 0.78,
  res1Hz: 1780,
  res2Hz: 2720,
  resQ: 7.5,
  resGain: 0.34,
  modes: [
    { freq: 4260, decay: 0.028, gain: 0.5 },
    { freq: 5580, decay: 0.019, gain: 0.36 },
    { freq: 7400, decay: 0.012, gain: 0.22 },
  ],
  ringGain: 0.3,
  subHz: 96,
  subTo: 56,
  subDecay: 0.09,
  subGain: 0.62,
  mechGain: 0.3,
  mechDelay: 0.012,
  tailClass: 'medium',
  tailGain: 0.85,
  farHz: 300,
  farGain: 0.95,
  supGain: 0.34,
  trim: 1.05,
};

const SMG: GunVoice = {
  id: 'smg',
  caliber: 9,
  crackHz: 4200,
  crackDecay: 0.0021,
  crackGain: 0.92,
  crackDrive: 3.9,
  bodyHz: 1500,
  bodyQ: 1.4,
  sweepFrom: 8200,
  sweepTo: 780,
  sweepTime: 0.026,
  bodyDecay: 0.042,
  bodyGain: 0.78,
  res1Hz: 2180,
  res2Hz: 3340,
  resQ: 6.2,
  resGain: 0.33,
  modes: [
    { freq: 5100, decay: 0.018, gain: 0.5 },
    { freq: 6650, decay: 0.013, gain: 0.36 },
    { freq: 8600, decay: 0.009, gain: 0.24 },
  ],
  ringGain: 0.32,
  subHz: 132,
  subTo: 86,
  subDecay: 0.065,
  /*
   * A 9 mm has far less gas behind it than a rifle round, but "less" is not
   * "none": with the sub down at a tenth of the carbine's the whole report was a
   * bright spike with a crest factor near nine, which peaks early, measures
   * quiet and reads as a toy. It still sits well under the carbine, which is
   * what keeps the two identifiable.
   */
  subGain: 0.32,
  mechGain: 0.5,
  mechDelay: 0.009,
  tailClass: 'light',
  tailGain: 0.62,
  farHz: 380,
  farGain: 0.72,
  supGain: 0.3,
  trim: 1.15,
};

/**
 * The .338. A magnum rifle round is comfortably supersonic, so unlike the
 * shotgun it keeps a genuine shock front on top of the boom — that contrast is
 * what separates the two heavy weapons from one another.
 */
const SNIPER: GunVoice = {
  id: 'sniper',
  caliber: 8.6,
  crackHz: 2400,
  crackDecay: 0.0062,
  crackGain: 1.1,
  crackDrive: 2.6,
  bodyHz: 305,
  bodyQ: 0.95,
  sweepFrom: 5200,
  sweepTo: 132,
  sweepTime: 0.085,
  bodyDecay: 0.19,
  bodyGain: 1,
  res1Hz: 560,
  res2Hz: 1030,
  resQ: 5.8,
  resGain: 0.42,
  modes: [
    { freq: 1640, decay: 0.05, gain: 0.4 },
    { freq: 2380, decay: 0.032, gain: 0.26 },
    { freq: 3450, decay: 0.02, gain: 0.14 },
  ],
  ringGain: 0.28,
  subHz: 52,
  subTo: 28,
  subDecay: 0.26,
  subGain: 1,
  mechGain: 0.22,
  mechDelay: 0.02,
  tailClass: 'heavy',
  tailGain: 1,
  farHz: 165,
  farGain: 1.3,
  supGain: 0.42,
  trim: 0.72,
};

/**
 * The 12-gauge. Buckshot leaves the barrel subsonic, so there is no shock front
 * to speak of: what is left is a broad, blunt, wide-band blast that stops
 * abruptly, with far less low extension than the magnum rifle.
 */
const SHOTGUN: GunVoice = {
  id: 'shotgun',
  caliber: 12,
  crackHz: 900,
  crackDecay: 0.0052,
  crackGain: 0.68,
  crackDrive: 2.2,
  bodyHz: 250,
  bodyQ: 0.5,
  sweepFrom: 3000,
  sweepTo: 150,
  sweepTime: 0.06,
  bodyDecay: 0.1,
  bodyGain: 1.05,
  res1Hz: 470,
  res2Hz: 780,
  resQ: 2.9,
  resGain: 0.38,
  modes: [
    { freq: 1180, decay: 0.038, gain: 0.32 },
    { freq: 1720, decay: 0.026, gain: 0.2 },
    { freq: 2560, decay: 0.016, gain: 0.11 },
  ],
  ringGain: 0.2,
  subHz: 86,
  subTo: 48,
  subDecay: 0.14,
  subGain: 0.6,
  mechGain: 0.2,
  mechDelay: 0.024,
  tailClass: 'medium',
  tailGain: 0.94,
  farHz: 190,
  farGain: 1.15,
  supGain: 0.4,
  trim: 1.02,
};

/**
 * The 9 mm sidearm. A short barrel behind a small charge: not much gas, so not
 * much low end and no roll to speak of, and what is left sits in the middle and
 * stops. The carbine's centroid lands lower than this despite cracking harder,
 * because a 5.56 puts real energy under 200 Hz and a pistol does not — the
 * separation between the two is that contrast, not a difference in brightness.
 */
const PISTOL: GunVoice = {
  id: 'pistol',
  caliber: 9,
  crackHz: 2400,
  crackDecay: 0.0029,
  crackGain: 0.9,
  crackDrive: 3.1,
  bodyHz: 880,
  bodyQ: 1.3,
  sweepFrom: 6200,
  sweepTo: 560,
  sweepTime: 0.028,
  bodyDecay: 0.038,
  bodyGain: 0.82,
  res1Hz: 1420,
  res2Hz: 2200,
  resQ: 6.8,
  resGain: 0.32,
  modes: [
    { freq: 3400, decay: 0.02, gain: 0.42 },
    { freq: 4600, decay: 0.014, gain: 0.28 },
    { freq: 6100, decay: 0.01, gain: 0.16 },
  ],
  ringGain: 0.26,
  subHz: 128,
  subTo: 68,
  subDecay: 0.07,
  subGain: 0.3,
  mechGain: 0.36,
  mechDelay: 0.011,
  tailClass: 'light',
  tailGain: 0.55,
  farHz: 340,
  farGain: 0.8,
  supGain: 0.3,
  trim: 1.2,
};

/** An enemy rifle, voiced slightly differently so return fire is identifiable. */
const ENEMY_RIFLE: GunVoice = {
  ...RIFLE,
  id: 'enemy_rifle',
  crackHz: 2600,
  bodyHz: 820,
  res1Hz: 1560,
  res2Hz: 2380,
  sweepTo: 380,
  tailGain: 0.9,
  trim: 1,
};

export const GUNS: Record<string, GunVoice> = {
  rifle: RIFLE,
  smg: SMG,
  sniper: SNIPER,
  shotgun: SHOTGUN,
  pistol: PISTOL,
  enemy_rifle: ENEMY_RIFLE,
};

export const GUN_IDS: readonly string[] = ['rifle', 'smg', 'sniper', 'shotgun', 'pistol'];

/** Falls back to the carbine so an unknown weapon id still makes a noise. */
export function gunVoice(id: string): GunVoice {
  return GUNS[id] ?? RIFLE;
}

/* ============================ transient bank ============================ */

/**
 * The crack impulses.
 *
 * A genuine gunshot transient is a shock front: the pressure rise is faster
 * than a microphone can follow, so what a recording holds is essentially a
 * single-sample impulse followed by a couple of milliseconds of collapsing
 * turbulence. That is what these are — a full-scale spike, then a very short
 * noise burst folded hard so it stays dense as it decays. The live graph
 * highpasses each one to the weapon's corner, so eight generic variants voice
 * every gun in the game.
 */
export function bakeCracks(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('crack');
  const count = b.variants(8);
  const clips: Clip[] = [];
  for (let v = 0; v < count; v++) {
    const c = clip(sr, 0.014);
    const d = c.channels[0];
    // The turbulent collapse behind the front.
    white(d, rng, 1);
    perc(d, sr, 0.00006, rng.range(0.0016, 0.0032), 2.6);
    filter(d, sr, 'highpass', rng.range(700, 1200), 0.6);
    shapeFold(d, rng.range(1.5, 2.3));
    // The shock front itself: two samples, so it is broadband to Nyquist.
    d[0] += 0.85;
    d[1] += rng.range(-0.55, -0.3);
    d[2] += rng.range(0.1, 0.28);
    // A short secondary front from the muzzle blast reflecting off the gas block.
    const echo = Math.round(rng.range(0.00035, 0.0011) * sr);
    if (echo < d.length) d[echo] += rng.range(0.18, 0.38);
    removeDc(d);
    normalise(d, 0.98);
    // No fade in. The front is sample zero and it is the whole point.
    fadeEdges(d, sr, 0, 0.001);
    clips.push(c);
  }
  b.set('crack', clips);
}

/** Long noise loops the live body layers read from at a random offset. */
export function bakeNoiseLoops(b: Bakery): void {
  const sr = b.sampleRate;
  const rng = b.stream('noiseloops');
  const w = clip(sr, 1.2);
  white(w.channels[0], rng, 0.7);
  b.set('noise_white', [w]);

  const p = clip(sr, 1.2);
  pink(p.channels[0], rng, 1.4);
  normalise(p.channels[0], 0.8);
  b.set('noise_pink', [p]);
}

/* ============================== sub bank =============================== */

/** The low punch, as a clip so nothing has to build an oscillator per shot. */
export function bakeSubs(b: Bakery): void {
  const sr = b.sampleRate;
  for (const id of Object.keys(GUNS)) {
    const g = GUNS[id];
    const rng = b.stream(`sub:${id}`);
    const count = b.variants(3);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, g.subDecay * 3 + 0.05);
      const d = c.channels[0];
      const jitter = 1 + rng.bi() * 0.06;
      tone(d, sr, g.subHz * jitter, g.subDecay * 3, {
        wave: 'sine',
        toFreq: g.subTo * jitter,
        glide: g.subDecay * 1.5,
        glideCurve: 0.6,
        gain: 1,
      });
      // A little second harmonic keeps it from sounding like a test tone.
      tone(d, sr, g.subHz * 2 * jitter, g.subDecay * 1.2, {
        wave: 'triangle',
        toFreq: g.subTo * 2 * jitter,
        glide: g.subDecay * 0.9,
        gain: 0.22,
      });
      perc(d, sr, 0.0008, g.subDecay, 2.4);
      shapeTanh(d, 1.5, 0.6);
      filter(d, sr, 'lowpass', g.subHz * 6, 0.7);
      normalise(d, 0.95);
      fadeEdges(d, sr, 0.0003, 0.008);
      clips.push(c);
    }
    b.set(`sub:${id}`, clips);
  }
}

/* ============================= ring bank =============================== */

/**
 * The dense upper modes of the receiver and barrel. The two loudest modes are
 * left to the live graph, where they can be detuned per shot; everything above
 * them is too dense to hear individually and is cheaper baked.
 */
export function bakeRings(b: Bakery): void {
  const sr = b.sampleRate;
  for (const id of Object.keys(GUNS)) {
    const g = GUNS[id];
    const rng = b.stream(`ring:${id}`);
    const count = b.variants(4);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const longest = g.modes.reduce((m, x) => Math.max(m, x.decay), 0.01);
      const c = clip(sr, longest * 2.5 + 0.02);
      const d = c.channels[0];
      const exciter = new Float32Array(Math.round(0.0025 * sr));
      white(exciter, rng, 1);
      perc(exciter, sr, 0.00004, 0.0008, 3);
      modal(d, exciter, sr, g.modes, 0, 0.045, rng);
      filter(d, sr, 'highpass', g.res2Hz * 1.1, 0.7);
      normalise(d, 0.9);
      fadeEdges(d, sr, 0, 0.004);
      clips.push(c);
    }
    b.set(`ring:${id}`, clips);
  }
}

/* ============================ mechanical =============================== */

interface MechRecipe {
  /** Metal modes struck by the event. */
  modes: Mode[];
  /** Seconds of the noise/scrape bed. */
  scrape: number;
  scrapeHz: number;
  scrapeGain: number;
  /** Discrete impacts: seconds from the start, and relative strength. */
  hits: Array<[number, number]>;
  /** Overall length. */
  length: number;
  /** Spring ring: a swept resonance, as a coil actually sounds. */
  spring?: { from: number; to: number; time: number; gain: number };
  /** Sub thud, for a magazine seating or a bolt slamming home. */
  thud?: { hz: number; decay: number; gain: number };
  peak?: number;
}

function bakeMech(b: Bakery, name: string, r: MechRecipe, variants = 3): void {
  const sr = b.sampleRate;
  const rng = b.stream(`mech:${name}`);
  const count = b.variants(variants);
  const clips: Clip[] = [];
  for (let v = 0; v < count; v++) {
    const c = clip(sr, r.length);
    const d = c.channels[0];

    for (const [at, strength] of r.hits) {
      const start = Math.round(at * sr * (1 + rng.bi() * 0.05));
      const exLen = Math.round(0.0016 * sr);
      const ex = new Float32Array(Math.min(d.length, start + exLen));
      white(ex, rng, strength, start, exLen);
      perc(ex, sr, 0.00005, 0.0006, 3, start, exLen);
      modal(d, ex, sr, r.modes, start, 0.06, rng);
      // The click of metal meeting metal, on top of the ring it excites.
      const clickLen = Math.round(0.0012 * sr);
      const click = new Float32Array(d.length);
      white(click, rng, strength * 0.9, start, clickLen);
      perc(click, sr, 0.00003, 0.00035, 3.4, start, clickLen);
      filter(click, sr, 'highpass', 2600, 0.7);
      for (let i = 0; i < d.length; i++) d[i] += click[i];
    }

    if (r.scrape > 0) {
      const scr = new Float32Array(d.length);
      noise(scr, rng, 'pink', r.scrapeGain);
      // A scrape is friction modulated by the surface it runs over.
      for (let i = 0; i < scr.length; i++) {
        const t = i / sr;
        scr[i] *= 0.6 + 0.4 * Math.sin(t * 1400 + Math.sin(t * 211) * 3);
      }
      filter(scr, sr, 'bandpass', r.scrapeHz * (1 + rng.bi() * 0.08), 1.4);
      perc(scr, sr, 0.0025, r.scrape, 1.6);
      for (let i = 0; i < d.length; i++) d[i] += scr[i];
    }

    if (r.spring) {
      const sp = new Float32Array(d.length);
      white(sp, rng, 0.5);
      sweep(sp, sr, 'bandpass', r.spring.from, r.spring.to, r.spring.time, 12, 1.4);
      perc(sp, sr, 0.001, r.spring.time, 1.8);
      scale(sp, r.spring.gain * 5);
      for (let i = 0; i < d.length; i++) d[i] += sp[i];
    }

    if (r.thud) {
      const th = new Float32Array(d.length);
      tone(th, sr, r.thud.hz, r.thud.decay * 3, {
        toFreq: r.thud.hz * 0.55,
        glide: r.thud.decay,
        gain: r.thud.gain,
      });
      perc(th, sr, 0.0006, r.thud.decay, 2.2);
      for (let i = 0; i < d.length; i++) d[i] += th[i];
    }

    removeDc(d);
    normalise(d, r.peak ?? 0.85);
    fadeEdges(d, sr, 0, 0.006);
    clips.push(c);
  }
  b.set(name, clips);
}

const STEEL: Mode[] = [
  { freq: 2450, decay: 0.035, gain: 0.6 },
  { freq: 3720, decay: 0.026, gain: 0.45 },
  { freq: 5480, decay: 0.017, gain: 0.32 },
  { freq: 7900, decay: 0.01, gain: 0.2 },
];

const ALLOY: Mode[] = [
  { freq: 1650, decay: 0.045, gain: 0.55 },
  { freq: 2840, decay: 0.03, gain: 0.4 },
  { freq: 4300, decay: 0.019, gain: 0.26 },
];

const POLYMER: Mode[] = [
  { freq: 900, decay: 0.02, gain: 0.6 },
  { freq: 1560, decay: 0.013, gain: 0.34 },
  { freq: 2600, decay: 0.008, gain: 0.2 },
];

/** Per-shot action noise: the bolt cycling under gas, one clip per weapon. */
export function bakeFireMechanics(b: Bakery): void {
  for (const id of Object.keys(GUNS)) {
    const g = GUNS[id];
    const heavy = g.caliber >= 8;
    bakeMech(
      b,
      `mech:${id}`,
      {
        modes: heavy ? ALLOY : STEEL,
        scrape: heavy ? 0.02 : 0.012,
        scrapeHz: heavy ? 2200 : 3400,
        scrapeGain: 0.22,
        hits: heavy
          ? [
              [0, 0.7],
              [0.026, 0.85],
            ]
          : [
              [0, 0.6],
              [0.014, 0.8],
            ],
        length: heavy ? 0.11 : 0.075,
        spring: { from: 4200, to: 1800, time: heavy ? 0.045 : 0.028, gain: 0.1 },
        peak: 0.7,
      },
      3,
    );
  }
}

/** Reload and action mechanics, each a designed sound in its own right. */
export function bakeReloadMechanics(b: Bakery): void {
  bakeMech(b, 'mag_release', {
    modes: STEEL,
    scrape: 0,
    scrapeHz: 3000,
    scrapeGain: 0,
    hits: [[0, 0.75]],
    length: 0.06,
    spring: { from: 5200, to: 3400, time: 0.012, gain: 0.06 },
    peak: 0.7,
  });

  bakeMech(b, 'mag_out', {
    modes: POLYMER,
    scrape: 0.05,
    scrapeHz: 1500,
    scrapeGain: 0.4,
    hits: [
      [0, 0.4],
      [0.055, 0.5],
    ],
    length: 0.14,
    peak: 0.6,
  });

  bakeMech(b, 'mag_in', {
    modes: POLYMER,
    scrape: 0.035,
    scrapeHz: 1250,
    scrapeGain: 0.34,
    hits: [[0.03, 0.55]],
    length: 0.12,
    thud: { hz: 155, decay: 0.03, gain: 0.35 },
    peak: 0.72,
  });

  bakeMech(b, 'mag_tap', {
    modes: POLYMER,
    scrape: 0,
    scrapeHz: 1200,
    scrapeGain: 0,
    hits: [[0, 0.85]],
    length: 0.07,
    thud: { hz: 180, decay: 0.022, gain: 0.4 },
    peak: 0.78,
  });

  bakeMech(b, 'charging_handle', {
    modes: STEEL,
    scrape: 0.055,
    scrapeHz: 2700,
    scrapeGain: 0.45,
    hits: [
      [0.0, 0.55],
      [0.062, 0.95],
    ],
    length: 0.17,
    spring: { from: 5600, to: 2100, time: 0.06, gain: 0.16 },
    peak: 0.82,
  });

  bakeMech(b, 'bolt_release', {
    modes: STEEL,
    scrape: 0.014,
    scrapeHz: 3100,
    scrapeGain: 0.2,
    hits: [[0.012, 1]],
    length: 0.1,
    spring: { from: 4800, to: 2400, time: 0.02, gain: 0.12 },
    thud: { hz: 210, decay: 0.02, gain: 0.28 },
    peak: 0.85,
  });

  // A bolt-action cycle is two distinct movements: lift-and-pull, push-and-turn.
  bakeMech(b, 'bolt_cycle', {
    modes: ALLOY,
    scrape: 0.17,
    scrapeHz: 2000,
    scrapeGain: 0.42,
    hits: [
      [0.0, 0.6],
      [0.045, 0.5],
      [0.14, 0.55],
      [0.215, 0.9],
    ],
    length: 0.32,
    spring: { from: 3600, to: 1500, time: 0.09, gain: 0.1 },
    peak: 0.8,
  });

  bakeMech(b, 'pump_cycle', {
    modes: STEEL,
    scrape: 0.13,
    scrapeHz: 1700,
    scrapeGain: 0.5,
    hits: [
      [0.0, 0.7],
      [0.085, 0.6],
      [0.175, 0.95],
    ],
    length: 0.27,
    spring: { from: 3200, to: 1400, time: 0.08, gain: 0.12 },
    thud: { hz: 130, decay: 0.03, gain: 0.3 },
    peak: 0.85,
  });

  bakeMech(b, 'shell_insert', {
    modes: [
      { freq: 1250, decay: 0.018, gain: 0.5 },
      { freq: 2100, decay: 0.012, gain: 0.32 },
    ],
    scrape: 0.03,
    scrapeHz: 2400,
    scrapeGain: 0.34,
    hits: [[0.028, 0.7]],
    length: 0.11,
    peak: 0.62,
  });

  bakeMech(b, 'dry_fire', {
    modes: STEEL,
    scrape: 0,
    scrapeHz: 3000,
    scrapeGain: 0,
    hits: [[0, 0.6]],
    length: 0.05,
    spring: { from: 6200, to: 4200, time: 0.008, gain: 0.05 },
    peak: 0.55,
  });

  bakeMech(b, 'fire_mode', {
    modes: STEEL,
    scrape: 0,
    scrapeHz: 3000,
    scrapeGain: 0,
    hits: [[0, 0.5]],
    length: 0.035,
    peak: 0.5,
  });

  bakeMech(b, 'weapon_swap', {
    modes: [...ALLOY, ...POLYMER],
    scrape: 0.09,
    scrapeHz: 900,
    scrapeGain: 0.5,
    hits: [
      [0.0, 0.35],
      [0.11, 0.45],
    ],
    length: 0.2,
    peak: 0.5,
  });

  bakeMech(b, 'melee', {
    modes: [
      { freq: 560, decay: 0.03, gain: 0.7 },
      { freq: 1180, decay: 0.018, gain: 0.4 },
    ],
    scrape: 0.055,
    scrapeHz: 700,
    scrapeGain: 0.6,
    hits: [[0.0, 0.5]],
    length: 0.16,
    thud: { hz: 120, decay: 0.04, gain: 0.5 },
    peak: 0.8,
  });

  bakeMech(b, 'grenade_throw', {
    modes: [{ freq: 420, decay: 0.02, gain: 0.4 }],
    scrape: 0.07,
    scrapeHz: 800,
    scrapeGain: 0.55,
    hits: [[0.0, 0.35]],
    length: 0.15,
    peak: 0.45,
  });
}

/**
 * Shell casings. Brass has a bright, inharmonic mode set and a very short
 * contact time, which is why a casing on concrete is unmistakable.
 */
export function bakeCasings(b: Bakery): void {
  const brass: Mode[] = [
    { freq: 3150, decay: 0.09, gain: 0.55 },
    { freq: 4870, decay: 0.07, gain: 0.4 },
    { freq: 6420, decay: 0.05, gain: 0.3 },
    { freq: 9100, decay: 0.03, gain: 0.18 },
  ];
  bakeMech(
    b,
    'shell_eject',
    {
      modes: brass,
      scrape: 0,
      scrapeHz: 4000,
      scrapeGain: 0,
      hits: [[0, 0.5]],
      length: 0.14,
      peak: 0.4,
    },
    4,
  );
  bakeMech(
    b,
    'shell_land',
    {
      modes: brass,
      scrape: 0,
      scrapeHz: 4000,
      scrapeGain: 0,
      hits: [
        [0, 0.7],
        [0.052, 0.4],
        [0.086, 0.22],
        [0.108, 0.12],
      ],
      length: 0.3,
      peak: 0.5,
    },
    4,
  );
}

/* ============================= suppressed ============================== */

/**
 * A suppressed shot is not a quiet shot. The can holds the muzzle blast, so
 * what is left is the mechanical thwip of gas venting through baffles plus the
 * action, and — outdoors — the tail is still there, because the round is still
 * supersonic and the room still answers.
 */
export function bakeSuppressed(b: Bakery): void {
  const sr = b.sampleRate;
  for (const id of Object.keys(GUNS)) {
    const g = GUNS[id];
    const rng = b.stream(`sup:${id}`);
    const count = b.variants(4);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, 0.14);
      const d = c.channels[0];
      // Baffle gas: a short, broad puff with no shock front, pitched by the
      // bore. The can does not just make the report quieter, it removes the
      // whole top of it, so this has to sit at or below the weapon's own body
      // band rather than in the crack's register.
      const gasHz = g.bodyHz * 0.8;
      const puff = new Float32Array(d.length);
      white(puff, rng, 1);
      sweep(puff, sr, 'bandpass', gasHz * rng.range(1.7, 2.1), gasHz * 0.7, 0.035, 1.1, 1.5);
      perc(puff, sr, 0.0011, rng.range(0.02, 0.032), 2);
      scale(puff, 1.6);
      for (let i = 0; i < d.length; i++) d[i] += puff[i];

      // The can itself rings, faintly and low.
      const ex = new Float32Array(Math.round(0.002 * sr));
      white(ex, rng, 0.5);
      perc(ex, sr, 0.00006, 0.0007, 3);
      modal(
        d,
        ex,
        sr,
        [
          { freq: g.res1Hz * 0.55, decay: 0.026, gain: 0.3 },
          { freq: g.res1Hz * 0.95, decay: 0.018, gain: 0.2 },
        ],
        0,
        0.05,
        rng,
      );

      // A trace of the low punch survives; the can cannot stop 60 Hz, and on a
      // heavy calibre it is most of what is left.
      tone(d, sr, g.subHz * 0.8, 0.05, {
        toFreq: g.subTo * 0.8,
        glide: 0.03,
        gain: 0.44,
      });

      filter(d, sr, 'lowpass', Math.max(1300, Math.min(4600, gasHz * 3.2)), 0.8, 0, 2);
      filter(d, sr, 'highpass', 110, 0.7);
      removeDc(d);
      normalise(d, 0.8);
      fadeEdges(d, sr, 0.0002, 0.01);
      clips.push(c);
    }
    b.set(`sup:${id}`, clips);
  }
}

/* ================================ tails ================================ */

const TAIL_SHAPE: Record<TailClass, { hz: number; scale: number; boom: number }> = {
  light: { hz: 1.35, scale: 0.72, boom: 0.35 },
  medium: { hz: 1, scale: 1, boom: 0.6 },
  heavy: { hz: 0.62, scale: 1.45, boom: 1 },
};

/**
 * The environmental tail.
 *
 * This is the layer that gives a shot scale, and it is a separate sound from
 * the report rather than a reverb setting: it starts after the crack has
 * already reached the ear, builds as reflections pile in, and rolls away over
 * a time set by the space. Baked per zone and per calibre class, because the
 * room's answer to a given source does not change between rounds.
 */
export function bakeTails(b: Bakery, zones: readonly ZoneName[] = ZONE_NAMES): void {
  const classes: TailClass[] = ['light', 'medium', 'heavy'];
  for (const zn of zones) {
    const z = ZONES[zn];
    for (const cls of classes) {
      const shape = TAIL_SHAPE[cls];
      const name = `tail:${zn}:${cls}`;
      if (b.has(name)) continue;
      // Seconds of stereo per zone and calibre, and the only thing in them is a
      // roll that has already been lowpassed three times. Storing that at the
      // context rate is most of a megabyte of silence above the corner.
      const sr = b.rateFor(z.gunTailHz * shape.hz);
      const rng = b.stream(name);
      const count = b.variants(2);
      const clips: Clip[] = [];
      const length = z.gunTail * shape.scale;
      for (let v = 0; v < count; v++) {
        const c = clip(sr, length + 0.06, 2);
        for (let ch = 0; ch < 2; ch++) {
          const d = c.channels[ch];
          // The diffuse roll: noise whose density is the room's.
          white(d, rng, 1);
          decayTo60(d, sr, length, 0);
          // Reflections arriving late enough to be heard as separate events.
          // Added before the filters, not after: every one of these has bounced
          // off masonry at least once, and left broadband they would dominate
          // the spectrum and turn a rolling echo into a burst of hiss.
          const refl = Math.max(3, Math.round(z.reflections * 0.35));
          for (let r = 0; r < refl; r++) {
            const t = ((z.nearWall * 2) / 343) * Math.pow(1.55, r) * rng.range(0.85, 1.2);
            const at = Math.round(t * sr);
            if (at >= d.length - 8) break;
            const burst = Math.round(rng.range(0.004, 0.014) * sr);
            const amp = z.slap * Math.pow(0.78, r) * rng.range(0.5, 1);
            for (let i = 0; i < burst && at + i < d.length; i++) {
              d[at + i] += rng.bi() * amp * (1 - i / burst) * 0.8;
            }
          }
          if (z.flutter > 0.05) comb(d, sr, (z.nearWall * 2) / 343, z.flutter, 1);
          filter(d, sr, 'lowpass', z.gunTailHz * shape.hz, 0.7, 0, 3);
          filter(d, sr, 'highpass', 55, 0.7);
          // A heavy calibre pushes low frequency into the ground and buildings,
          // which comes back as a rumble under the roll.
          if (shape.boom > 0.3) {
            const boom = new Float32Array(d.length);
            white(boom, rng, 1);
            decayTo60(boom, sr, length * 1.5, 0);
            filter(boom, sr, 'lowpass', 190, 0.9, 0, 3);
            scale(boom, shape.boom * 9);
            for (let i = 0; i < d.length; i++) d[i] += boom[i];
          }
          // The tail cannot start at full level; it has to build.
          const build = Math.round(z.predelay * 1.3 * sr) + 8;
          for (let i = 0; i < Math.min(build, d.length); i++) d[i] *= i / build;
          fadeEdges(d, sr, 0.0006, 0.05);
        }
        let pk = 0;
        for (const ch of c.channels) for (let i = 0; i < ch.length; i++) pk = Math.max(pk, Math.abs(ch[i]));
        if (pk > 1e-6) for (const ch of c.channels) scale(ch, 0.72 / pk);
        clips.push(c);
      }
      b.set(name, clips);
    }
  }
}

/**
 * The distant report: what a shot 100 m away actually sounds like. The crack
 * has lost its top to air absorption and its level to distance, so the body
 * collapses into a thump and the tail dominates. Baked as a whole because at
 * that range nobody can hear per-shot variation anyway.
 */
export function bakeDistantReports(b: Bakery): void {
  const sr = b.sampleRate;
  for (const id of Object.keys(GUNS)) {
    const g = GUNS[id];
    const rng = b.stream(`far:${id}`);
    const count = b.variants(3);
    const clips: Clip[] = [];
    for (let v = 0; v < count; v++) {
      const c = clip(sr, 0.34);
      const d = c.channels[0];
      const jitter = 1 + rng.bi() * 0.07;
      // Thump: a short band of noise around the surviving band.
      const th = new Float32Array(d.length);
      white(th, rng, 1);
      sweep(th, sr, 'bandpass', g.farHz * 3.4 * jitter, g.farHz * jitter, 0.05, 1.0, 1.5);
      /*
       * Onsets measured in milliseconds rather than in tens of microseconds.
       * A shock front is a discontinuity, and a discontinuity does not survive
       * three hundred metres of atmosphere: absorption strips the top off it and
       * turbulence along the path smears what is left, so a distant report
       * swells into audibility instead of snapping into it. This is the
       * difference between a far-off firefight and a close one played quietly,
       * and it is measurable — `tools/audio-test.mjs` asserts that the rise of
       * the transient band at 300 m is several times slower than at 3 m.
       */
      perc(th, sr, 0.006, 0.055, 2);
      scale(th, 2.2);
      for (let i = 0; i < d.length; i++) d[i] += th[i];
      // The low half of the report survives best and arrives as a slap.
      tone(d, sr, g.farHz * 0.55 * jitter, 0.12, {
        toFreq: g.farHz * 0.3 * jitter,
        glide: 0.07,
        gain: 0.5,
      });
      perc(d, sr, 0.005, 0.08, 1.9);
      filter(d, sr, 'lowpass', 1100, 0.8, 0, 2);
      filter(d, sr, 'highpass', 60, 0.7);
      removeDc(d);
      normalise(d, 0.82);
      fadeEdges(d, sr, 0.0025, 0.03);
      clips.push(c);
    }
    b.set(`far:${id}`, clips);
  }
}
