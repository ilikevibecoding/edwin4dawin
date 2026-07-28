/**
 * Explosions.
 *
 * Five layers, in the order the ear receives them:
 *
 *  1. The pressure wave — a 10 ms low-passed slam. At any distance this is the
 *     part that arrives first and it is what makes the event feel physical
 *     rather than loud.
 *  2. The sub sweep — a sine falling from ~80 Hz to ~25 Hz. Bigger charges start
 *     lower, fall further and take longer.
 *  3. The body — broadband noise through a filter that snaps open to several
 *     kilohertz in about 12 ms and then closes over the next second.
 *  4. Debris — sparse crackle scattered over the whole tail, band-limited and
 *     decaying, plus a few discrete chunks landing.
 *  5. The reverberant tail — a long, dull swell that carries the size of the
 *     event far more than the peak level does.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  ad,
  adExp,
  bandpass,
  brownNoise,
  compress,
  contourFilter,
  crackleNoise,
  expDecay,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  lowpass24,
  noiseBurst,
  peaking,
  pinkNoise,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  swell,
  velvetNoise,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

export type ExplosionKind = 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';

interface BlastSpec {
  /** Total buffer length, seconds. */
  seconds: number;
  /** Sub sweep endpoints, Hz. */
  subFrom: number;
  subTo: number;
  subTau: number;
  subGain: number;
  /** Body filter contour. */
  bodyOpenHz: number;
  bodyCloseHz: number;
  bodyOpenTime: number;
  bodyTau: number;
  /** Debris layer. */
  debrisSeconds: number;
  debrisDensity: number;
  debrisGain: number;
  /** Reverberant tail. */
  tailSeconds: number;
  tailCutoff: number;
  tailTau: number;
  tailGain: number;
  /** Discrete chunks of material landing. */
  chunks: number;
  drive: number;
  /** Extra character. */
  metallic: number;
  fire: number;
}

const BLASTS: Record<ExplosionKind, BlastSpec> = {
  // Frag: sharp, fast, a lot of shrapnel and not much sub.
  grenade: {
    seconds: 2.6,
    subFrom: 78,
    subTo: 27,
    subTau: 0.16,
    subGain: 0.85,
    bodyOpenHz: 7200,
    bodyCloseHz: 260,
    bodyOpenTime: 0.009,
    bodyTau: 0.16,
    debrisSeconds: 1.5,
    debrisDensity: 900,
    debrisGain: 0.55,
    tailSeconds: 2.2,
    tailCutoff: 780,
    tailTau: 0.46,
    tailGain: 0.5,
    chunks: 9,
    drive: 3.2,
    metallic: 0.35,
    fire: 0.1,
  },
  // Shaped charge: a harder, brighter crack and a jet of gas.
  rocket: {
    seconds: 3.0,
    subFrom: 72,
    subTo: 25,
    subTau: 0.22,
    subGain: 1.0,
    bodyOpenHz: 8200,
    bodyCloseHz: 220,
    bodyOpenTime: 0.007,
    bodyTau: 0.2,
    debrisSeconds: 1.8,
    debrisDensity: 780,
    debrisGain: 0.5,
    tailSeconds: 2.6,
    tailCutoff: 640,
    tailTau: 0.62,
    tailGain: 0.62,
    chunks: 11,
    drive: 3.6,
    metallic: 0.3,
    fire: 0.22,
  },
  // 500 lb class: all sub and tail. The crack is almost incidental.
  airstrike: {
    seconds: 4.2,
    subFrom: 62,
    subTo: 19,
    subTau: 0.44,
    subGain: 1.3,
    bodyOpenHz: 6400,
    bodyCloseHz: 150,
    bodyOpenTime: 0.014,
    bodyTau: 0.4,
    debrisSeconds: 3.0,
    debrisDensity: 1400,
    debrisGain: 0.72,
    tailSeconds: 3.9,
    tailCutoff: 400,
    tailTau: 1.25,
    tailGain: 0.95,
    chunks: 18,
    drive: 4.2,
    metallic: 0.2,
    fire: 0.3,
  },
  // Fuel and sheet metal: less crack, more whoomph, and a long metallic wreck.
  vehicle: {
    seconds: 3.6,
    subFrom: 66,
    subTo: 22,
    subTau: 0.34,
    subGain: 1.1,
    bodyOpenHz: 5200,
    bodyCloseHz: 190,
    bodyOpenTime: 0.02,
    bodyTau: 0.3,
    debrisSeconds: 2.6,
    debrisDensity: 620,
    debrisGain: 0.6,
    tailSeconds: 3.2,
    tailCutoff: 520,
    tailTau: 0.85,
    tailGain: 0.72,
    chunks: 16,
    drive: 3.4,
    metallic: 0.85,
    fire: 0.55,
  },
  // A drum of accelerant: a soft, gassy detonation with a big fireball.
  barrel: {
    seconds: 3.2,
    subFrom: 70,
    subTo: 24,
    subTau: 0.26,
    subGain: 0.95,
    bodyOpenHz: 4600,
    bodyCloseHz: 210,
    bodyOpenTime: 0.026,
    bodyTau: 0.26,
    debrisSeconds: 2.2,
    debrisDensity: 480,
    debrisGain: 0.45,
    tailSeconds: 2.9,
    tailCutoff: 560,
    tailTau: 0.7,
    tailGain: 0.6,
    chunks: 10,
    drive: 3.0,
    metallic: 0.6,
    fire: 0.85,
  },
};

/** The 10 ms slam that arrives ahead of everything else. */
function pressureWave(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const out = new Signal(0.05, sr);
  const slam = noiseBurst(0.03, sr, rng);
  lowpass(slam, 900, 0.7);
  slam.envelope(adExp(0.00025, 0.0045));
  out.add(slam, 1);
  // A single half-cycle of very low sine: the actual overpressure step.
  sweepTone(out, spec.subFrom * 2.4, spec.subFrom * 1.1, 0.8, {
    seconds: 0.03,
    env: adExp(0.0004, 0.006),
  });
  saturate(out, 4);
  return out;
}

function subLayer(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const out = new Signal(Math.min(spec.seconds, spec.subTau * 9 + 0.05), sr);
  sweepTone(out, spec.subFrom, spec.subTo, 1, {
    curve: (t) => Math.pow(t, 0.42),
    env: adExp(0.0028, spec.subTau),
  });
  // A slightly detuned second sweep thickens it without a beating artefact.
  sweepTone(out, spec.subFrom * 1.34, spec.subTo * 1.28, 0.45, {
    curve: (t) => Math.pow(t, 0.55),
    env: adExp(0.005, spec.subTau * 0.75),
  });
  saturate(out, 2.2);
  lowpass(out, 220, 0.8);
  return out.gain(spec.subGain);
}

function bodyLayer(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const body = new Signal(Math.min(spec.seconds, spec.bodyTau * 8 + 0.1), sr);
  whiteNoise(body, rng);
  pinkNoise(body, rng, 0.8);
  contourFilter(
    body,
    (t) => {
      if (t < spec.bodyOpenTime) {
        // Snap open. The steepness here is what makes it a detonation.
        return 300 + (spec.bodyOpenHz - 300) * Math.pow(t / spec.bodyOpenTime, 0.5);
      }
      const x = (t - spec.bodyOpenTime) / Math.max(1e-4, body.duration - spec.bodyOpenTime);
      return (
        spec.bodyOpenHz * Math.pow(spec.bodyCloseHz / spec.bodyOpenHz, Math.pow(Math.min(1, x), 0.55))
      );
    },
    { q: 0.8 },
  );
  body.envelope(
    (t) => 0.68 * adExp(0.0012, spec.bodyTau)(t) + 0.32 * adExp(0.02, spec.bodyTau * 3.2)(t),
  );
  saturate(body, spec.drive);
  // Saturation puts harmonics back above the contour that just removed them,
  // which is what was turning the blast into a hiss. Re-impose the ceiling.
  lowpass(body, spec.bodyOpenHz, 0.7);
  return body;
}

function debrisLayer(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const out = new Signal(spec.debrisSeconds, sr);
  crackleNoise(out, rng, spec.debrisDensity, 1, 2.6);
  // Falling masonry and grit is a mid-range clatter. A wide band centred high
  // makes it read as static and pulls the whole event's centroid up with it.
  bandpass(out, 1900, 0.9);
  lowpass24(out, 5200, 0.7);
  // Debris does not start immediately: it has to be thrown before it can land.
  out.envelope((t) => {
    const rise = Math.min(1, t / 0.09);
    return rise * Math.exp(-t / (spec.debrisSeconds * 0.3));
  });
  out.normalize(1);

  // Discrete chunks. Metal wreckage rings, masonry does not.
  for (let i = 0; i < spec.chunks; i++) {
    const at = Math.pow(rng.next(), 0.7) * (spec.debrisSeconds - 0.1) + 0.05;
    if (spec.metallic > 0.4 && rng.bool(spec.metallic)) {
      const clang = karplusStrong(0.3, sr, rng.range(180, 900), rng, {
        damping: 0.982,
        brightness: 0.3,
        dispersion: 0.5,
        excitation: 'impulse',
      });
      clang.envelope(expDecay(rng.range(0.02, 0.09)));
      out.add(clang, rng.range(0.12, 0.42), at);
    } else {
      const chunk = noiseBurst(0.07, sr, rng);
      bandpass(chunk, rng.range(400, 1800), 0.9);
      chunk.envelope(adExp(0.0008, rng.range(0.004, 0.016)));
      out.add(chunk, rng.range(0.18, 0.55), at);
    }
  }
  return out.gain(spec.debrisGain);
}

function tailLayer(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const out = new Signal(spec.tailSeconds, sr);
  velvetNoise(out, rng, 320, 1);
  whiteNoise(out, rng, 0.5);
  brownNoise(out, rng, 0.7);
  sweepFilter(out, spec.tailCutoff, spec.tailCutoff * 0.32, {
    q: 0.7,
    curve: (t) => Math.pow(t, 0.5),
  });
  sweepFilter(out, spec.tailCutoff, spec.tailCutoff * 0.32, {
    q: 0.6,
    curve: (t) => Math.pow(t, 0.5),
  });
  out.envelope(swell(0.05, spec.tailTau));
  out.normalize(1);
  return out.gain(spec.tailGain);
}

function fireLayer(sr: number, rng: Rng, spec: BlastSpec): Signal {
  const out = new Signal(Math.min(spec.seconds, 2.2), sr);
  brownNoise(out, rng);
  bandpass(out, 420, 0.8);
  // Slow irregular flutter: burning fuel, not a steady hiss.
  const flutter = new Signal(out.duration, sr);
  brownNoise(flutter, rng);
  lowpass(flutter, 12);
  flutter.normalize(1).map((x) => 0.6 + 0.6 * x);
  out.multiply(flutter);
  out.envelope((t) => Math.min(1, t / 0.06) * Math.exp(-t / 0.65));
  out.normalize(1);
  return out.gain(spec.fire);
}

function renderExplosion(kind: ExplosionKind, args: RenderArgs): RenderedSound {
  const spec = BLASTS[kind];
  const { sampleRate: sr, rng } = args;
  const out = new Signal(spec.seconds, sr);

  out.add(pressureWave(sr, rng, spec), 0.9);
  out.add(subLayer(sr, rng, spec), 1);
  out.add(bodyLayer(sr, rng, spec), 0.9);
  out.add(debrisLayer(sr, rng, spec), 1, 0.02);
  out.add(tailLayer(sr, rng, spec), 1, 0.03);
  if (spec.fire > 0.05) out.add(fireLayer(sr, rng, spec), 1, 0.04);

  if (spec.metallic > 0.5) {
    // Sheet metal tearing and settling.
    for (let i = 0; i < 4; i++) {
      const groan = karplusStrong(0.55, sr, rng.range(90, 260), rng, {
        damping: 0.9955,
        brightness: 0.6,
        dispersion: 0.7,
        excitation: 'noise',
        pluckWidth: 0.4,
      });
      groan.envelope(expDecay(rng.range(0.08, 0.22)));
      out.add(groan, rng.range(0.05, 0.16) * spec.metallic, rng.range(0.1, 1.4));
    }
  }

  highpass(out, 22);
  // Glue the layers so they read as one event, then keep the peak in range.
  compress(out, -14, 3.2, 4, 180, 3);
  softClip(out, 0.8);
  limit(out, 0.997);
  out.removeDc().normalize(0.97);
  return widen(out, 0.0016, 0.45);
}

export const explosionSoundId = (kind: ExplosionKind): string => `explosion_${kind}`;

const KINDS: readonly ExplosionKind[] = ['grenade', 'rocket', 'airstrike', 'vehicle', 'barrel'];

/** Relative loudness. Everything is scaled so the airstrike is the reference. */
const LOUDNESS: Record<ExplosionKind, number> = {
  grenade: 0.86,
  rocket: 0.92,
  airstrike: 1.15,
  vehicle: 1.0,
  barrel: 0.9,
};

export function registerExplosionSounds(register: Registrar): void {
  for (const kind of KINDS) {
    register(
      defineSound(explosionSoundId(kind), (args) => renderExplosion(kind, args), {
        bus: 'sfx',
        priority: 1,
        gain: LOUDNESS[kind],
        refDistance: 12,
        maxDistance: 520,
        rolloff: 0.85,
        pitchJitter: 0.8,
        variants: 3,
        send: 0.55,
        // Sub-bass carries; an explosion two hundred metres away is still a
        // physical event rather than a distant tick.
        airScale: 0.4,
        propagate: true,
      }),
    );
  }

  // Distant report of an explosion the player did not see, used when the blast
  // is beyond the point where its near layers matter at all.
  register(
    defineSound(
      'explosion_distant',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(3.4, sr);
        sweepTone(out, 54, 20, 0.9, { curve: (t) => Math.pow(t, 0.4), env: adExp(0.02, 0.4) });
        const rumble = new Signal(3.2, sr);
        brownNoise(rumble, rng);
        lowpass(rumble, 240, 0.8);
        rumble.envelope(swell(0.09, 0.8));
        rumble.normalize(1);
        out.add(rumble, 0.8);
        lowpass(out, 420, 0.7);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.5,
        gain: 0.62,
        refDistance: 40,
        maxDistance: 700,
        rolloff: 0.5,
        variants: 2,
        send: 0.3,
        airScale: 0.2,
        propagate: true,
      },
    ),
  );

  // Persistent burning left behind by a vehicle or barrel kill.
  register(
    defineSound(
      'fire_loop',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(4.5, sr);
        brownNoise(out, rng);
        bandpass(out, 380, 0.7);
        const flutter = new Signal(4.5, sr);
        brownNoise(flutter, rng);
        lowpass(flutter, 9);
        flutter.normalize(1).map((x) => 0.55 + 0.7 * x);
        out.multiply(flutter);
        crackleNoise(out, rng, 55, 0.5, 2.2);
        out.normalize(0.9);
        return out.seamlessLoop(0.6).toMono();
      },
      {
        bus: 'ambience',
        priority: 0.3,
        gain: 0.35,
        refDistance: 3,
        maxDistance: 40,
        variants: 1,
        loop: true,
        send: 0.3,
      },
    ),
  );
}
