/**
 * Bullet impacts, one design per `SurfaceType`.
 *
 * `SURFACE_PROPERTIES.hardness` sets the global character — how much of the
 * energy comes back as a crack versus as a dull thud, and how long anything
 * rings — but each surface also gets its own construction, because hardness
 * alone cannot tell glass from tile or flesh from sand.
 *
 * The common skeleton is: a transient (what the round did to the surface), a
 * body (what the surface is made of), and a debris/ring layer (what came off).
 */
import { SURFACE_PROPERTIES, type SurfaceType } from '../../core/GameTypes';
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  ad,
  adExp,
  bandpass,
  contourTone,
  crackleNoise,
  expDecay,
  formants,
  glassModes,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  metalModes,
  noiseBurst,
  peaking,
  resonate,
  ringMod,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  swell,
  whiteNoise,
  woodModes,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar, type SoundSpec } from './Spec';

export const impactSoundId = (surface: SurfaceType): string => `impact_${surface}`;

const SURFACES: readonly SurfaceType[] = [
  'concrete',
  'metal',
  'wood',
  'dirt',
  'sand',
  'gravel',
  'grass',
  'water',
  'glass',
  'flesh',
  'plaster',
  'brick',
  'tile',
  'fabric',
  'rubber',
  'foliage',
];

/** Hardness sets the transient's brightness and how tight the decay is. */
function transient(sr: number, rng: Rng, hardness: number, tint: number): Signal {
  const out = noiseBurst(0.012, sr, rng);
  const hz = 900 + 5200 * hardness * tint;
  bandpass(out, hz, 0.75);
  out.envelope(adExp(0.00006, 0.0007 + 0.0022 * (1 - hardness)));
  saturate(out, 2 + hardness * 3);
  return out;
}

/** Low-frequency energy transferred into the structure. */
function thud(sr: number, rng: Rng, hz: number, tau: number, gain: number): Signal {
  const out = new Signal(Math.min(0.4, tau * 8 + 0.01), sr);
  sweepTone(out, hz, hz * 0.55, 1, {
    curve: (t) => Math.pow(t, 0.6),
    env: adExp(0.0009, tau),
  });
  sweepTone(out, hz * 1.9, hz * 1.1, 0.35, { env: adExp(0.0005, tau * 0.55) });
  saturate(out, 1.6);
  return out.gain(gain);
}

function granular(
  sr: number,
  rng: Rng,
  seconds: number,
  centreHz: number,
  q: number,
  density: number,
  tau: number,
): Signal {
  const out = new Signal(seconds, sr);
  crackleNoise(out, rng, density, 1, 2.2);
  whiteNoise(out, rng, 0.2);
  bandpass(out, centreHz, q);
  out.envelope(adExp(0.0006, tau));
  return out;
}

type Designer = (args: RenderArgs) => Signal;

const DESIGNERS: Record<SurfaceType, Designer> = {
  // A hard crack, then the gravelly spall coming off the face, then the mass of
  // the wall taking the energy.
  concrete: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.32, sr);
    out.add(transient(sr, rng, 0.8, 1), 1);
    out.add(granular(sr, rng, 0.18, 2100, 0.85, 3400, 0.026), 0.62);
    out.add(granular(sr, rng, 0.26, 700, 1.3, 900, 0.05), 0.34);
    out.add(thud(sr, rng, 168, 0.028, 0.5));
    return out;
  },
  // Softer and lower than concrete, and much more powder.
  brick: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.32, sr);
    out.add(transient(sr, rng, 0.72, 0.86), 0.9);
    out.add(granular(sr, rng, 0.2, 1500, 0.8, 3000, 0.032), 0.7);
    out.add(granular(sr, rng, 0.24, 520, 1.1, 1100, 0.055), 0.4);
    out.add(thud(sr, rng, 142, 0.032, 0.55));
    return out;
  },
  // Modal ring is the whole identity. Inharmonic partials plus a spark sizzle.
  metal: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.55, sr);
    const strike = noiseBurst(0.004, sr, rng);
    strike.envelope(expDecay(0.0004));
    const fundamental = rng.range(320, 720);
    const ring = resonate(
      Signal.wrap(strike.data, sr),
      metalModes(fundamental, 9, rng.range(0.28, 0.62), 0.34, rng),
      1.6,
    );
    const padded = new Signal(0.55, sr);
    padded.add(ring, 1);
    // The delay line adds the thin-sheet "boing" a pure resonator bank lacks.
    const sheet = karplusStrong(0.4, sr, fundamental * rng.range(1.4, 2.6), rng, {
      damping: 0.985,
      brightness: 0.25,
      dispersion: 0.55,
      excitation: 'impulse',
    });
    sheet.envelope(expDecay(0.11));
    out.add(padded, 0.85);
    out.add(sheet, 0.3);
    out.add(transient(sr, rng, 1, 1.1), 0.95);
    // Sparks: very sparse, very bright, very short.
    const sparks = granular(sr, rng, 0.1, 7200, 1.4, 700, 0.02);
    out.add(sparks, 0.4);
    out.add(thud(sr, rng, 190, 0.014, 0.22));
    return out;
  },
  // A hollow box. Low modal partials, heavily damped, with splinters on top.
  wood: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.3, sr);
    const strike = noiseBurst(0.006, sr, rng);
    strike.envelope(expDecay(0.0009));
    lowpass(strike, 4200);
    out.add(resonate(strike, woodModes(rng.range(155, 265), rng), 1.5), 1);
    out.add(transient(sr, rng, 0.4, 0.8), 0.55);
    out.add(granular(sr, rng, 0.11, 3300, 1.1, 1600, 0.014), 0.34);
    out.add(thud(sr, rng, 128, 0.024, 0.42));
    return out;
  },
  // Soft, dull, no ring at all. Mostly a puff of displaced material.
  dirt: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.24, sr);
    const puff = noiseBurst(0.16, sr, rng);
    sweepFilter(puff, 1500, 320, { q: 0.7, curve: (t) => Math.pow(t, 0.4) });
    puff.envelope(adExp(0.0016, 0.03));
    out.add(puff, 1);
    out.add(granular(sr, rng, 0.13, 900, 0.9, 1400, 0.022), 0.4);
    out.add(thud(sr, rng, 112, 0.026, 0.42));
    return out;
  },
  // The softest surface in the set: almost pure filtered noise, no thump.
  sand: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.2, sr);
    const puff = noiseBurst(0.14, sr, rng);
    sweepFilter(puff, 2200, 480, { q: 0.6, curve: (t) => Math.pow(t, 0.3) });
    puff.envelope(adExp(0.0028, 0.026));
    out.add(puff, 1);
    out.add(granular(sr, rng, 0.09, 1600, 0.7, 2600, 0.014), 0.3);
    out.add(thud(sr, rng, 96, 0.018, 0.2));
    return out;
  },
  // Individual stones being thrown. Granular is the whole point.
  gravel: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.3, sr);
    out.add(transient(sr, rng, 0.5, 0.95), 0.6);
    out.add(granular(sr, rng, 0.22, 2600, 0.7, 2200, 0.05), 0.9);
    out.add(granular(sr, rng, 0.16, 800, 1.0, 700, 0.035), 0.45);
    out.add(thud(sr, rng, 124, 0.02, 0.35));
    return out;
  },
  grass: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.2, sr);
    const swish = noiseBurst(0.13, sr, rng);
    bandpass(swish, 3400, 0.8);
    swish.envelope(adExp(0.0012, 0.022));
    out.add(swish, 0.8);
    const puff = noiseBurst(0.12, sr, rng);
    sweepFilter(puff, 1200, 380, { q: 0.7 });
    puff.envelope(adExp(0.002, 0.026));
    out.add(puff, 0.6);
    out.add(thud(sr, rng, 104, 0.018, 0.28));
    return out;
  },
  // A bubble: a rising pitch as the cavity collapses, plus the splash.
  water: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.42, sr);
    const f0 = rng.range(280, 620);
    contourTone(out, (t) => f0 * (1 + 5.5 * t), 0.55, 'sine', adExp(0.0018, 0.028));
    const splash = noiseBurst(0.22, sr, rng);
    sweepFilter(splash, 6500, 900, { q: 0.7, curve: (t) => Math.pow(t, 0.4) });
    splash.envelope(adExp(0.0008, 0.028));
    out.add(splash, 0.7);
    // Droplets falling back.
    out.add(granular(sr, rng, 0.34, 4200, 1.6, 240, 0.11), 0.45);
    out.add(thud(sr, rng, 150, 0.016, 0.3));
    return out;
  },
  // Brittle: a dense set of high inharmonic partials plus a tinkle of shards.
  glass: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.75, sr);
    const strike = noiseBurst(0.003, sr, rng);
    strike.envelope(expDecay(0.00035));
    out.add(resonate(strike, glassModes(rng.range(1700, 3100), 14, rng), 1.3), 1);
    out.add(transient(sr, rng, 0.95, 1.25), 0.8);
    // Shards hitting the floor over the next half second.
    for (let i = 0; i < 7; i++) {
      const shard = karplusStrong(0.16, sr, rng.range(1800, 6200), rng, {
        damping: 0.93,
        brightness: 0.15,
        dispersion: 0.6,
        excitation: 'impulse',
      });
      shard.envelope(expDecay(rng.range(0.008, 0.03)));
      out.add(shard, rng.range(0.12, 0.4), rng.range(0.03, 0.52));
    }
    out.add(granular(sr, rng, 0.5, 5200, 1.3, 420, 0.16), 0.35);
    return out;
  },
  // Wet, dense, no ring. The squelch is ring modulation on a lowpassed burst.
  flesh: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.26, sr);
    const slap = noiseBurst(0.1, sr, rng);
    lowpass(slap, 1900, 0.9);
    formants(slap, [
      { freq: 420, q: 1.2, gainDb: 8 },
      { freq: 1150, q: 1.6, gainDb: 5 },
    ]);
    slap.envelope(adExp(0.0007, 0.016));
    out.add(slap, 1);
    const squelch = noiseBurst(0.14, sr, rng);
    bandpass(squelch, 700, 1.4);
    ringMod(squelch, rng.range(45, 90), 0.7);
    squelch.envelope(adExp(0.004, 0.03));
    out.add(squelch, 0.45);
    out.add(thud(sr, rng, 88, 0.03, 0.62));
    return out;
  },
  // Chalky and dusty. A brief crack, then a lot of powder.
  plaster: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.3, sr);
    out.add(transient(sr, rng, 0.35, 1.05), 0.7);
    out.add(granular(sr, rng, 0.22, 3200, 0.75, 3800, 0.038), 0.8);
    out.add(granular(sr, rng, 0.2, 950, 1.0, 900, 0.04), 0.36);
    // A stud-wall cavity behind the board rings a little.
    out.add(thud(sr, rng, 205, 0.03, 0.34));
    return out;
  },
  // Ceramic: a short, bright ring plus the shards.
  tile: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.42, sr);
    const strike = noiseBurst(0.0035, sr, rng);
    strike.envelope(expDecay(0.0004));
    out.add(resonate(strike, metalModes(rng.range(1250, 2100), 7, 0.13, 0.22, rng), 1.2), 0.9);
    out.add(transient(sr, rng, 0.7, 1.2), 0.85);
    out.add(granular(sr, rng, 0.26, 4200, 1.0, 1300, 0.05), 0.5);
    out.add(thud(sr, rng, 175, 0.018, 0.34));
    return out;
  },
  // Almost nothing: a soft dull tap and a little fibre rustle.
  fabric: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.16, sr);
    const tap = noiseBurst(0.08, sr, rng);
    lowpass(tap, 1100, 0.8);
    tap.envelope(adExp(0.0012, 0.013));
    out.add(tap, 1);
    const fibres = noiseBurst(0.07, sr, rng);
    bandpass(fibres, 4200, 1.1);
    fibres.envelope(adExp(0.001, 0.009));
    out.add(fibres, 0.24);
    out.add(thud(sr, rng, 92, 0.014, 0.3));
    return out;
  },
  // Dead thud with a short bouncy tail; rubber absorbs almost everything.
  rubber: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.2, sr);
    const tap = noiseBurst(0.06, sr, rng);
    lowpass(tap, 1500, 0.9);
    tap.envelope(adExp(0.0006, 0.008));
    out.add(tap, 0.8);
    out.add(thud(sr, rng, 148, 0.022, 0.75));
    const bounce = new Signal(0.12, sr);
    sweepTone(bounce, 240, 190, 1, { env: ad(0.001, 0.05, 2.2) });
    out.add(bounce, 0.24, 0.02);
    return out;
  },
  // Leaves and branches: a bright rustle with a granular envelope, no thump.
  foliage: ({ sampleRate: sr, rng }) => {
    const out = new Signal(0.26, sr);
    const rustle = noiseBurst(0.22, sr, rng);
    bandpass(rustle, 3800, 0.65);
    // Amplitude modulation by sparse crackle so it reads as many small events.
    const grain = new Signal(0.22, sr);
    crackleNoise(grain, rng, 900, 1, 1.4);
    lowpass(grain, 220);
    grain.map((x) => 0.35 + Math.abs(x) * 12);
    rustle.multiply(grain);
    rustle.envelope(adExp(0.003, 0.04));
    out.add(rustle, 1);
    const snap = karplusStrong(0.06, sr, rng.range(700, 1600), rng, {
      damping: 0.9,
      brightness: 0.5,
      excitation: 'impulse',
    });
    snap.envelope(expDecay(0.004));
    out.add(snap, 0.2, rng.range(0.01, 0.06));
    return out;
  },
};

function renderImpact(surface: SurfaceType, args: RenderArgs): RenderedSound {
  const out = DESIGNERS[surface](args);
  highpass(out, 42);
  // Hard surfaces get a presence lift; soft ones get the top rolled off. This
  // is the one place `hardness` is applied globally rather than per design.
  const hardness = SURFACE_PROPERTIES[surface].hardness;
  peaking(out, 3600, 0.9, -6 + 10 * hardness);
  if (hardness < 0.35) lowpass(out, 3200 + 9000 * hardness, 0.7);
  softClip(out, 0.85);
  limit(out, 0.995);
  out.removeDc().normalize(0.96);
  return out.toMono();
}

/**
 * Loudness per surface. Hardness dominates — a round into sand is nearly silent
 * next to one into sheet metal — with a nudge from the authored step volume,
 * which is the designer's own statement about how noisy the material is.
 */
function impactGain(surface: SurfaceType): number {
  const props = SURFACE_PROPERTIES[surface];
  return 0.34 + 0.52 * props.hardness + 0.16 * Math.min(1, props.stepVolume);
}

export function registerImpactSounds(register: Registrar): void {
  for (const surface of SURFACES) {
    const hardness = SURFACE_PROPERTIES[surface].hardness;
    register(
      defineSound(impactSoundId(surface), (args) => renderImpact(surface, args), {
        bus: 'sfx',
        priority: 0.45,
        gain: impactGain(surface),
        refDistance: 4,
        maxDistance: 95,
        rolloff: 1.25,
        pitchJitter: 1.4,
        variants: 4,
        send: 0.32,
        // Hard, bright impacts lose their character fast with distance; a dull
        // thud on sand barely changes.
        airScale: 0.8 + 0.5 * hardness,
      }),
    );
  }
}

/** The ids this module owns, for warm-up and the test harness. */
export function impactSoundIds(): string[] {
  return SURFACES.map(impactSoundId);
}

export function impactSpecs(): SoundSpec[] {
  const specs: SoundSpec[] = [];
  registerImpactSounds((s) => specs.push(s));
  return specs;
}
