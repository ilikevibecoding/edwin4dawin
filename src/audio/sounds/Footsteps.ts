/**
 * Footsteps and body movement.
 *
 * Two things make footsteps work. First, the surface has to be genuinely
 * different per material — a boot on sheet metal and a boot on sand share no
 * spectral content at all. Second, and more important, no two steps may ever be
 * identical: the ear is extremely good at spotting a repeating footstep, and a
 * shooter plays hundreds of them a minute.
 *
 * So every step is a heel strike plus a toe roll plus gear rustle, all three
 * randomised per variant, and four variants per surface with per-playback pitch
 * jitter on top. The `loud` flag from the player module scales level and
 * brightness at playback time rather than needing its own bank.
 */
import { SURFACE_PROPERTIES, type SurfaceType } from '../../core/GameTypes';
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  adExp,
  bandpass,
  crackleNoise,
  expDecay,
  formants,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  lowpass24,
  metalModes,
  noiseBurst,
  peaking,
  resonate,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  whiteNoise,
  woodModes,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

export const footstepSoundId = (surface: SurfaceType): string => `footstep_${surface}`;

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

interface StepSpec {
  /** Heel strike: band centre and decay. */
  heelHz: number;
  heelQ: number;
  heelTau: number;
  heelGain: number;
  /** Structural thud under the strike. */
  thudHz: number;
  thudTau: number;
  thudGain: number;
  /** Granular scuff (grit, gravel, sand shifting). */
  scuffHz: number;
  scuffDensity: number;
  scuffTau: number;
  scuffGain: number;
  /** Modal ring, for metal grates and hollow boards. */
  ring: 'none' | 'metal' | 'wood' | 'ceramic';
  ringHz: number;
  ringGain: number;
  /** Roll-off of the whole step. */
  lowpassHz: number;
  seconds: number;
}

const STEPS: Record<SurfaceType, StepSpec> = {
  concrete: { heelHz: 2100, heelQ: 0.8, heelTau: 0.008, heelGain: 1, thudHz: 150, thudTau: 0.022, thudGain: 0.5, scuffHz: 3600, scuffDensity: 900, scuffTau: 0.03, scuffGain: 0.35, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 12000, seconds: 0.24 },
  brick: { heelHz: 1750, heelQ: 0.8, heelTau: 0.009, heelGain: 0.95, thudHz: 138, thudTau: 0.024, thudGain: 0.52, scuffHz: 2900, scuffDensity: 1100, scuffTau: 0.035, scuffGain: 0.42, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 11000, seconds: 0.24 },
  // A grate or a vehicle deck: the whole panel rings under the boot.
  metal: { heelHz: 2600, heelQ: 0.9, heelTau: 0.007, heelGain: 1.1, thudHz: 190, thudTau: 0.016, thudGain: 0.32, scuffHz: 5200, scuffDensity: 600, scuffTau: 0.025, scuffGain: 0.3, ring: 'metal', ringHz: 340, ringGain: 0.55, lowpassHz: 15000, seconds: 0.4 },
  wood: { heelHz: 1200, heelQ: 0.9, heelTau: 0.01, heelGain: 0.9, thudHz: 120, thudTau: 0.03, thudGain: 0.55, scuffHz: 2600, scuffDensity: 700, scuffTau: 0.028, scuffGain: 0.28, ring: 'wood', ringHz: 210, ringGain: 0.45, lowpassHz: 9000, seconds: 0.3 },
  dirt: { heelHz: 800, heelQ: 0.7, heelTau: 0.012, heelGain: 0.7, thudHz: 108, thudTau: 0.026, thudGain: 0.45, scuffHz: 1500, scuffDensity: 1400, scuffTau: 0.04, scuffGain: 0.5, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 5200, seconds: 0.26 },
  sand: { heelHz: 650, heelQ: 0.6, heelTau: 0.016, heelGain: 0.5, thudHz: 95, thudTau: 0.02, thudGain: 0.28, scuffHz: 1900, scuffDensity: 2600, scuffTau: 0.055, scuffGain: 0.75, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 4200, seconds: 0.3 },
  gravel: { heelHz: 2400, heelQ: 0.7, heelTau: 0.009, heelGain: 0.85, thudHz: 128, thudTau: 0.02, thudGain: 0.38, scuffHz: 3200, scuffDensity: 2200, scuffTau: 0.06, scuffGain: 0.95, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 13000, seconds: 0.32 },
  grass: { heelHz: 900, heelQ: 0.6, heelTau: 0.013, heelGain: 0.5, thudHz: 100, thudTau: 0.022, thudGain: 0.32, scuffHz: 4200, scuffDensity: 1800, scuffTau: 0.05, scuffGain: 0.6, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 7000, seconds: 0.28 },
  water: { heelHz: 1400, heelQ: 0.5, heelTau: 0.014, heelGain: 0.9, thudHz: 160, thudTau: 0.018, thudGain: 0.3, scuffHz: 5200, scuffDensity: 900, scuffTau: 0.09, scuffGain: 0.85, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 14000, seconds: 0.42 },
  glass: { heelHz: 3400, heelQ: 0.9, heelTau: 0.006, heelGain: 1, thudHz: 175, thudTau: 0.014, thudGain: 0.28, scuffHz: 6200, scuffDensity: 1400, scuffTau: 0.05, scuffGain: 0.8, ring: 'ceramic', ringHz: 2400, ringGain: 0.4, lowpassHz: 16000, seconds: 0.34 },
  flesh: { heelHz: 520, heelQ: 0.8, heelTau: 0.012, heelGain: 0.5, thudHz: 88, thudTau: 0.028, thudGain: 0.5, scuffHz: 900, scuffDensity: 400, scuffTau: 0.03, scuffGain: 0.2, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 2600, seconds: 0.24 },
  plaster: { heelHz: 1900, heelQ: 0.8, heelTau: 0.009, heelGain: 0.85, thudHz: 195, thudTau: 0.02, thudGain: 0.4, scuffHz: 3400, scuffDensity: 1600, scuffTau: 0.038, scuffGain: 0.5, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 10000, seconds: 0.24 },
  tile: { heelHz: 2900, heelQ: 0.9, heelTau: 0.0065, heelGain: 1.05, thudHz: 165, thudTau: 0.015, thudGain: 0.34, scuffHz: 5600, scuffDensity: 800, scuffTau: 0.03, scuffGain: 0.42, ring: 'ceramic', ringHz: 1500, ringGain: 0.35, lowpassHz: 15000, seconds: 0.3 },
  fabric: { heelHz: 700, heelQ: 0.6, heelTau: 0.014, heelGain: 0.35, thudHz: 92, thudTau: 0.02, thudGain: 0.24, scuffHz: 3200, scuffDensity: 900, scuffTau: 0.04, scuffGain: 0.4, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 4600, seconds: 0.24 },
  rubber: { heelHz: 1100, heelQ: 0.7, heelTau: 0.007, heelGain: 0.55, thudHz: 140, thudTau: 0.018, thudGain: 0.45, scuffHz: 2200, scuffDensity: 400, scuffTau: 0.02, scuffGain: 0.2, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 5200, seconds: 0.2 },
  foliage: { heelHz: 1600, heelQ: 0.5, heelTau: 0.016, heelGain: 0.45, thudHz: 98, thudTau: 0.02, thudGain: 0.26, scuffHz: 4600, scuffDensity: 2400, scuffTau: 0.07, scuffGain: 0.85, ring: 'none', ringHz: 0, ringGain: 0, lowpassHz: 9000, seconds: 0.34 },
};

/** Nylon webbing, a sling, magazines in pouches. Layered onto every step. */
export function gearRustle(sr: number, rng: Rng, seconds: number, amount: number): Signal {
  const out = new Signal(seconds, sr);
  whiteNoise(out, rng);
  bandpass(out, rng.range(2600, 4600), 1);
  // Cordura has a top end but it is not white above it. Without this the skirt
  // of the band runs flat to Nyquist and every sound that layers a rustle —
  // steps, mag changes, mantles — inherits a hiss shelf.
  lowpass24(out, 7000, 0.7);
  // Modulate with slow sparse noise so it reads as fabric folding rather than
  // as a hiss gate.
  const grain = new Signal(seconds, sr);
  crackleNoise(grain, rng, rng.range(400, 900), 1, 1.6);
  lowpass(grain, 180);
  grain.normalize(1).map((x) => 0.2 + Math.abs(x) * 2.4);
  out.multiply(grain);
  out.envelope(adExp(rng.range(0.004, 0.014), rng.range(0.03, 0.075)));
  // A magazine or a carabiner tapping: present on some steps, not all.
  if (rng.bool(0.45)) {
    const tap = karplusStrong(0.09, sr, rng.range(1400, 3600), rng, {
      damping: 0.9,
      brightness: 0.3,
      dispersion: 0.45,
      excitation: 'impulse',
    });
    tap.envelope(expDecay(rng.range(0.004, 0.012)));
    out.add(tap, rng.range(0.08, 0.22), rng.range(0.01, 0.06));
  }
  out.normalize(1);
  return out.gain(amount);
}

function renderStep(surface: SurfaceType, args: RenderArgs): RenderedSound {
  const spec = STEPS[surface];
  const { sampleRate: sr, rng } = args;
  const out = new Signal(spec.seconds, sr);

  // Heel strike.
  const heel = noiseBurst(0.06, sr, rng);
  bandpass(heel, spec.heelHz * rng.range(0.86, 1.16), spec.heelQ);
  heel.envelope(adExp(0.0004, spec.heelTau * rng.range(0.82, 1.24)));
  saturate(heel, 2);
  out.add(heel, spec.heelGain);

  // Toe roll, a few milliseconds later and duller.
  const toe = noiseBurst(0.08, sr, rng);
  bandpass(toe, spec.heelHz * rng.range(0.5, 0.75), spec.heelQ * 0.8);
  toe.envelope(adExp(0.0025, spec.heelTau * rng.range(1.4, 2.4)));
  out.add(toe, spec.heelGain * rng.range(0.28, 0.5), rng.range(0.014, 0.032));

  // Structural thud.
  if (spec.thudGain > 0.01) {
    const t = new Signal(Math.min(spec.seconds, spec.thudTau * 8 + 0.01), sr);
    sweepTone(t, spec.thudHz * rng.range(0.9, 1.12), spec.thudHz * 0.6, 1, {
      env: adExp(0.001, spec.thudTau),
    });
    saturate(t, 1.5);
    out.add(t, spec.thudGain);
  }

  // Granular scuff.
  if (spec.scuffGain > 0.01) {
    const scuff = new Signal(Math.min(spec.seconds, spec.scuffTau * 6 + 0.02), sr);
    crackleNoise(scuff, rng, spec.scuffDensity, 1, 2.4);
    whiteNoise(scuff, rng, 0.25);
    bandpass(scuff, spec.scuffHz * rng.range(0.85, 1.2), 0.6);
    scuff.envelope(adExp(rng.range(0.001, 0.005), spec.scuffTau * rng.range(0.85, 1.2)));
    scuff.normalize(1);
    out.add(scuff, spec.scuffGain, rng.range(0, 0.012));
  }

  // Modal ring for resonant surfaces.
  if (spec.ring !== 'none' && spec.ringGain > 0.01) {
    const strike = noiseBurst(0.005, sr, rng);
    strike.envelope(expDecay(0.0008));
    const hz = spec.ringHz * rng.range(0.85, 1.2);
    const modes =
      spec.ring === 'metal'
        ? metalModes(hz, 7, rng.range(0.2, 0.45), 0.3, rng)
        : spec.ring === 'wood'
          ? woodModes(hz, rng)
          : metalModes(hz, 5, 0.09, 0.2, rng);
    const ring = resonate(strike, modes, 1.2);
    out.add(ring, spec.ringGain);
  }

  out.add(gearRustle(sr, rng, Math.min(spec.seconds, 0.2), rng.range(0.16, 0.32)));

  if (surface === 'water') {
    // Displaced water sloshing back.
    const slosh = noiseBurst(0.3, sr, rng);
    sweepFilter(slosh, 5200, 900, { q: 0.6, curve: (t) => Math.pow(t, 0.4) });
    slosh.envelope(adExp(0.008, 0.07));
    out.add(slosh, 0.4, 0.01);
  }

  lowpass(out, spec.lowpassHz, 0.7);
  highpass(out, 55);
  peaking(out, 320, 0.9, -2.5);
  softClip(out, 0.85);
  limit(out, 0.995);
  out.removeDc().normalize(0.95);
  return out.toMono();
}

export function registerFootstepSounds(register: Registrar): void {
  for (const surface of SURFACES) {
    const props = SURFACE_PROPERTIES[surface];
    register(
      defineSound(footstepSoundId(surface), (args) => renderStep(surface, args), {
        bus: 'sfx',
        priority: 0.3,
        gain: 0.2 + 0.24 * Math.min(1.4, props.stepVolume),
        refDistance: 1.6,
        maxDistance: 34,
        rolloff: 1.5,
        pitchJitter: 1.8,
        variants: 4,
        send: 0.3,
        airScale: 1.3,
      }),
    );
  }

  // Standalone gear movement, used for stance changes and ADS transitions.
  register(
    defineSound(
      'gear_rustle',
      ({ sampleRate: sr, rng }) => gearRustle(sr, rng, 0.28, 0.95).normalize(0.92).toMono(),
      {
        bus: 'sfx',
        priority: 0.2,
        gain: 0.4,
        refDistance: 1.4,
        maxDistance: 20,
        rolloff: 1.6,
        pitchJitter: 2.2,
        variants: 4,
        send: 0.2,
        airScale: 1.4,
      },
    ),
  );

  // Landing, split soft/hard. The hard version adds a body thud and a knee flex.
  for (const hard of [false, true]) {
    register(
      defineSound(
        hard ? 'land_hard' : 'land_soft',
        ({ sampleRate: sr, rng }) => {
          const out = new Signal(hard ? 0.5 : 0.3, sr);
          const boots = noiseBurst(0.1, sr, rng);
          bandpass(boots, hard ? 1500 : 1900, 0.7);
          boots.envelope(adExp(0.0006, hard ? 0.02 : 0.011));
          saturate(boots, 2.2);
          out.add(boots, hard ? 1 : 0.7);
          const body = new Signal(0.3, sr);
          sweepTone(body, hard ? 118 : 140, hard ? 44 : 72, 1, {
            curve: (t) => Math.pow(t, 0.6),
            env: adExp(0.0016, hard ? 0.062 : 0.03),
          });
          saturate(body, 1.8);
          out.add(body, hard ? 0.95 : 0.5);
          out.add(gearRustle(sr, rng, 0.26, hard ? 0.6 : 0.35), 1, 0.005);
          if (hard) {
            // A grunt of effort riding under the impact.
            const grunt = noiseBurst(0.18, sr, rng);
            formants(grunt, [
              { freq: 480, q: 3, gainDb: 14 },
              { freq: 1080, q: 4, gainDb: 9 },
              { freq: 2500, q: 5, gainDb: 4 },
            ]);
            lowpass(grunt, 3000);
            grunt.envelope(adExp(0.01, 0.05));
            out.add(grunt, 0.3, 0.02);
          }
          highpass(out, 42);
          softClip(out, 0.85);
          out.removeDc().normalize(0.95);
          return out.toMono();
        },
        {
          bus: 'sfx',
          priority: 0.45,
          gain: hard ? 0.85 : 0.5,
          refDistance: 2.2,
          maxDistance: 45,
          rolloff: 1.3,
          pitchJitter: 1.2,
          variants: 3,
          send: 0.32,
        },
      ),
    );
  }

  // Slide: a long scrape that swells and dies.
  register(
    defineSound(
      'slide_start',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.9, sr);
        whiteNoise(out, rng);
        sweepFilter(out, 4200, 900, { q: 0.6, curve: (t) => Math.pow(t, 0.5) });
        const grain = new Signal(0.9, sr);
        crackleNoise(grain, rng, 2600, 1, 2);
        lowpass(grain, 200);
        grain.normalize(1).map((x) => 0.35 + Math.abs(x) * 2);
        out.multiply(grain);
        out.envelope((t) => Math.min(1, t / 0.05) * Math.exp(-t / 0.3));
        out.add(gearRustle(sr, rng, 0.4, 0.5));
        const thud = new Signal(0.3, sr);
        sweepTone(thud, 130, 55, 1, { env: adExp(0.003, 0.05) });
        out.add(thud, 0.45);
        highpass(out, 60);
        out.removeDc().normalize(0.93);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.4,
        gain: 0.6,
        refDistance: 2,
        maxDistance: 40,
        pitchJitter: 1.2,
        variants: 3,
        send: 0.35,
      },
    ),
  );
}

export function footstepSoundIds(): string[] {
  return SURFACES.map(footstepSoundId);
}
