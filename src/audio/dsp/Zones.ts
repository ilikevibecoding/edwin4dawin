/**
 * Acoustic zones and the impulse responses that realise them.
 *
 * There are no IR recordings to load, so each room is built: a predelay, a set
 * of discrete early reflections whose spacing encodes the room's dimensions,
 * and a diffuse exponentially-decaying noise tail band-shaped by the room's
 * absorption. That is exactly what a measured IR looks like, and building it
 * means the four zones differ from one another in the way rooms actually
 * differ rather than by a reverb-time knob.
 */

import {
  Clip,
  Rng,
  allpass,
  clip,
  comb,
  decayTo60,
  fadeEdges,
  filter,
  normaliseEnergy,
  peakOf,
  scale,
  white,
} from './Kernel';

export type ZoneName = 'outdoor' | 'street' | 'interior' | 'tunnel';

export const ZONE_NAMES: readonly ZoneName[] = ['outdoor', 'street', 'interior', 'tunnel'];

export interface ZoneProfile {
  name: ZoneName;
  /** Seconds to fall 60 dB. */
  rt60: number;
  /** Seconds before the first reflection arrives. */
  predelay: number;
  /** Metres to the nearest reflecting surface; drives early reflection spacing. */
  nearWall: number;
  /** Metres to the far boundary; drives the slap-back. */
  farWall: number;
  /** Reflections in the early field. */
  reflections: number;
  /** Lowpass on the diffuse tail: soft rooms and long air paths lose treble. */
  tailLp: number;
  /**
   * Lowpass on the early field. Brighter than the tail, because a first-order
   * reflection has only been absorbed once — but still zone-dependent, since a
   * concrete tunnel dulls even its early reflections in a way a small plastered
   * room does not.
   */
  earlyLp: number;
  /** Highpass on the tail; outdoors has no small-room bass build-up. */
  tailHp: number;
  /** Comb feedback from parallel walls. 0 outdoors, high in a tunnel. */
  flutter: number;
  /** Overall wet gain applied to a source in this zone. */
  wet: number;
  /**
   * Gain of the discrete slap-back layer a gunshot gets in this zone,
   * independent of the diffuse tail.
   */
  slap: number;
  /** Seconds the rolling tail of a gunshot lasts here. */
  gunTail: number;
  /** Cutoff of the gunshot tail's band, in Hz. */
  gunTailHz: number;
  /** Direct-path lowpass: a tunnel muffles even the dry signal a little. */
  directLp: number;
}

/**
 * The four rooms. Numbers come from the map: the market street is a 12–20 m
 * wide canyon of two-storey masonry, the souk is a roofed 9 m arcade, interiors
 * are 4–8 m rooms with cloth and plaster, and outdoors is the open coast where
 * the only return is a slap off the buildings a hundred metres away.
 */
export const ZONES: Record<ZoneName, ZoneProfile> = {
  outdoor: {
    name: 'outdoor',
    rt60: 1.85,
    predelay: 0.032,
    nearWall: 9,
    farWall: 70,
    reflections: 9,
    tailLp: 2100,
    earlyLp: 6800,
    tailHp: 90,
    flutter: 0,
    wet: 0.5,
    slap: 0.72,
    gunTail: 1.15,
    gunTailHz: 1500,
    directLp: 20000,
  },
  street: {
    name: 'street',
    rt60: 1.35,
    predelay: 0.011,
    nearWall: 4.5,
    farWall: 26,
    reflections: 18,
    tailLp: 3200,
    earlyLp: 7400,
    tailHp: 110,
    flutter: 0.16,
    wet: 0.72,
    slap: 0.85,
    gunTail: 0.92,
    gunTailHz: 2100,
    directLp: 19000,
  },
  interior: {
    name: 'interior',
    rt60: 0.52,
    predelay: 0.004,
    nearWall: 2.2,
    farWall: 7,
    reflections: 22,
    tailLp: 2600,
    earlyLp: 6200,
    tailHp: 150,
    flutter: 0.1,
    wet: 0.88,
    slap: 0.42,
    gunTail: 0.44,
    gunTailHz: 2400,
    directLp: 16000,
  },
  tunnel: {
    name: 'tunnel',
    rt60: 2.6,
    predelay: 0.006,
    nearWall: 2.6,
    farWall: 45,
    reflections: 26,
    tailLp: 1250,
    earlyLp: 3000,
    tailHp: 80,
    flutter: 0.42,
    wet: 0.9,
    slap: 0.6,
    gunTail: 1.75,
    gunTailHz: 1150,
    directLp: 9000,
  },
};

const SPEED_OF_SOUND = 343;

/**
 * Builds a stereo impulse response for a zone.
 *
 * The two channels are decorrelated at the source — independent noise for the
 * diffuse field, mirrored reflection offsets for the early field — rather than
 * by delaying one copy of a mono IR, which would comb.
 */
export function buildZoneIR(z: ZoneProfile, sampleRate: number, seed: number, quality = 1): Clip {
  const rng = new Rng(seed);
  const length = z.rt60 * (0.7 + 0.55 * quality);
  const c = clip(sampleRate, length + z.predelay + 0.05, 2);
  const reflections = Math.max(4, Math.round(z.reflections * (0.45 + 0.55 * quality)));

  for (let ch = 0; ch < 2; ch++) {
    const data = c.channels[ch];
    const preN = Math.round(z.predelay * sampleRate);

    /* Diffuse tail: dense noise that starts as the early field thins out. */
    const tailStart = preN + Math.round(((z.nearWall * 2) / SPEED_OF_SOUND) * sampleRate);
    white(data, rng, 1, tailStart);
    decayTo60(data, sampleRate, z.rt60, tailStart);
    // The tail is darker than the direct sound because every bounce absorbs
    // treble, and darker still the longer the path.
    filter(data, sampleRate, 'lowpass', z.tailLp, 0.7, 0, 2);
    filter(data, sampleRate, 'highpass', z.tailHp, 0.7);

    /* Early reflections: discrete, and spaced by the real path lengths. */
    const near = (z.nearWall * 2) / SPEED_OF_SOUND;
    const far = (z.farWall * 2) / SPEED_OF_SOUND;
    for (let r = 0; r < reflections; r++) {
      const u = r / Math.max(1, reflections - 1);
      // Reflection order grows, so arrival times cluster geometrically.
      const t = near * Math.pow(far / near, Math.pow(u, 1.35)) * rng.range(0.88, 1.14);
      const at = preN + Math.round(t * sampleRate);
      if (at >= data.length - 2) continue;
      // Amplitude follows 1/path with an absorption term per bounce.
      const amp =
        (1 / (1 + (t * SPEED_OF_SOUND) / z.nearWall)) *
        Math.pow(0.82, r * 0.4) *
        rng.range(0.6, 1) *
        (rng.next() < 0.5 ? -1 : 1);
      // Mirror the stereo image so the two ears do not get the same wall.
      const side = ch === 0 ? 1 : -1;
      const skew = 1 + side * rng.range(0.0, 0.05);
      const at2 = Math.min(data.length - 2, Math.round(at * skew));
      data[at2] += amp * 1.6;
      data[at2 + 1] += amp * 0.7;
    }

    /* The slap-back: outdoors, one strong return off the far buildings. */
    if (z.slap > 0.5) {
      const at = preN + Math.round(far * sampleRate);
      if (at < data.length - 64) {
        const burst = Math.round(0.012 * sampleRate);
        for (let i = 0; i < burst && at + i < data.length; i++) {
          data[at + i] += rng.bi() * z.slap * 0.5 * (1 - i / burst);
        }
      }
    }

    /* Parallel walls flutter; a tunnel is mostly this. */
    if (z.flutter > 0.01) {
      comb(data, sampleRate, (z.nearWall * 2) / SPEED_OF_SOUND, z.flutter, 1);
      comb(data, sampleRate, (z.nearWall * 2.37) / SPEED_OF_SOUND, z.flutter * 0.6, 1);
    }

    /* Two allpasses smear the noise into something that reads as a room
       rather than as a burst of hiss. */
    allpass(data, sampleRate, 0.0071 + ch * 0.0013, 0.62);
    allpass(data, sampleRate, 0.0113 - ch * 0.0009, 0.55);

    // Discrete reflections are added as bare impulses, which are broadband; a
    // real one has been absorbed by whatever it bounced off. Without this a
    // tunnel measures brighter than a small room, because the tunnel's early
    // field is denser and the clicks dominate its spectrum.
    filter(data, sampleRate, 'lowpass', z.earlyLp, 0.7);

    fadeEdges(data, sampleRate, 0.00002, 0.03);
  }

  // There is deliberately no impulse at t=0. This is a send: the dry path
  // already carries the direct sound, and duplicating it here would comb-filter
  // the very thing the room is supposed to be answering.
  normaliseEnergy(c, 1);
  // A single early reflection can still be a tall spike relative to the tail,
  // and the convolver has no headroom of its own, so cap it.
  const p = Math.max(...c.channels.map((ch) => peakOf(ch)));
  if (p > 0.35) for (const ch of c.channels) scale(ch, 0.35 / p);
  return c;
}

/**
 * Zone metrics measured by probing the space with rays. `AudioSystem` fills
 * this in every quarter second; `classify` turns it into a zone.
 */
export interface ZoneProbe {
  /** Mean horizontal free distance in metres, capped at the probe range. */
  openness: number;
  /** Shortest horizontal free distance. */
  nearest: number;
  /** Ceiling height in metres, or the probe range when there is none. */
  ceiling: number;
  /** 0..1 from `IWorld.skyVisibility`. */
  sky: number;
  /**
   * Ratio of the longest free axis to the shortest. A corridor is long and
   * narrow; a room is not.
   */
  elongation: number;
  /** Fraction of horizontal probes that hit something inside 8 m. */
  enclosure: number;
}

export interface ZoneScore {
  zone: ZoneName;
  /** 0..1 confidence in the winning zone. */
  confidence: number;
}

/**
 * Turns probe metrics into a zone.
 *
 * Each zone scores the evidence independently and the best score wins, so the
 * classifier degrades sensibly rather than falling off a cliff when one
 * measurement is unavailable — which matters because `skyVisibility` and the
 * physics raycaster are both optional dependencies.
 */
export function classify(p: ZoneProbe, hint?: ZoneName): ZoneScore {
  const roofed = 1 - clamp01(p.ceiling / 9);
  const open = clamp01((p.openness - 4) / 18);
  const sky = clamp01(p.sky);

  // A tunnel is roofed, narrow, and long in exactly one direction.
  const tunnel =
    roofed * 1.1 * clamp01((p.elongation - 1.9) / 2.6) * clamp01((7 - p.nearest) / 5) +
    0.15 * roofed;
  // An interior is roofed and enclosed on most sides.
  const interior = roofed * (0.55 + 0.45 * p.enclosure) * clamp01((9 - p.openness) / 7);
  // A street is open above but hemmed in on the sides.
  const street = sky * 0.7 * clamp01((p.openness - 3) / 13) * clamp01((30 - p.openness) / 22) +
    0.35 * (1 - roofed) * p.enclosure;
  // Outdoors is open in every direction.
  const outdoor = sky * (0.45 + 0.55 * open) * (1 - 0.7 * p.enclosure);

  const scores: Array<[ZoneName, number]> = [
    ['outdoor', outdoor],
    ['street', street],
    ['interior', interior],
    ['tunnel', tunnel],
  ];
  if (hint) {
    for (const s of scores) if (s[0] === hint) s[1] += 0.22;
  }

  let best = scores[0];
  let second = scores[1];
  for (const s of scores) {
    if (s[1] > best[1]) {
      second = best;
      best = s;
    } else if (s[1] > second[1]) {
      second = s;
    }
  }
  const margin = best[1] - second[1];
  return { zone: best[0], confidence: clamp01(margin / 0.3) };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
