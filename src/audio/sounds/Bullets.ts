/**
 * Rounds in flight.
 *
 * The whizz-by is the defining sound of being shot at and almost nothing else
 * in a shooter carries the same information: it tells the player a round passed
 * within a metre or two of their head, and it does it in 120 milliseconds.
 *
 * Physically it is two events. A supersonic round drags a Mach cone that reaches
 * the ear as a sharp crack, and the round's own turbulent wake is heard as a
 * band of noise whose centre frequency drops hard as the round passes — a real
 * Doppler shift, not a stylisation. Baking the sweep into the buffer is the
 * right call here because the geometry is fixed: the round always passes.
 */
import {
  Signal,
  adExp,
  bandpass,
  contourFilter,
  contourTone,
  crackleNoise,
  expDecay,
  foldback,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  noiseBurst,
  peaking,
  ringMod,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

/**
 * `closeness` 0..1 controls how violent the pass is: a round two metres away is
 * a swept hiss, one at 20 cm is a physical crack.
 */
function renderWhizz(closeness: number, args: RenderArgs): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const seconds = 0.16;
  const out = new Signal(seconds, sr);
  // The moment of closest approach, jittered so a burst does not pulse.
  const pass = seconds * rng.range(0.34, 0.44);

  // Wake: a band of noise sweeping down through the pass. The ratio either side
  // of the pass follows (c + v)/(c - v) for a transonic projectile.
  const wake = new Signal(seconds, sr);
  whiteNoise(wake, rng);
  const highHz = (2100 + 2400 * closeness) * rng.range(0.9, 1.12);
  const lowHz = highHz * (0.3 - 0.08 * closeness);
  contourFilter(
    wake,
    (t) => {
      // Sigmoid through the pass: nearly constant approaching, collapses at the
      // pass, nearly constant receding.
      const x = (t - pass) / (0.016 + 0.02 * (1 - closeness));
      const s = 1 / (1 + Math.exp(x * 2.4));
      return lowHz + (highHz - lowHz) * s;
    },
    { kind: 'bandpass', q: 1.4 + 1.6 * closeness, chunk: 8 },
  );
  wake.envelope((t) => {
    // Level follows 1/r^2 with r minimised at the pass.
    const d = (t - pass) / (0.03 + 0.05 * (1 - closeness));
    return 1 / (1 + d * d * 4);
  });
  wake.normalize(1);
  out.add(wake, 0.85);

  // Mach crack: a few hundred microseconds, extremely broadband.
  const crack = noiseBurst(0.006, sr, rng);
  highpass(crack, 1200);
  peaking(crack, 3200 + 2000 * closeness, 1.1, 8);
  crack.envelope(adExp(0.00005, 0.0006 + 0.0009 * (1 - closeness)));
  saturate(crack, 4);
  out.add(crack, 0.55 + 0.45 * closeness, pass - 0.001);

  // Tonal core: the round's own spin and the air splitting around the ogive.
  contourTone(
    out,
    (t) => {
      const x = (t - pass) / 0.02;
      const s = 1 / (1 + Math.exp(x * 2.2));
      return 620 + 1400 * s;
    },
    0.16 * closeness,
    'sine',
    (t) => {
      const d = (t - pass) / 0.035;
      return 1 / (1 + d * d * 6);
    },
  );

  highpass(out, 300);
  softClip(out, 0.85);
  limit(out, 0.995);
  out.removeDc().normalize(0.96);
  // A near miss is a stereo event by definition: it went past one side of you.
  return widen(out, 0.00042, 0.75);
}

/** The classic descending whine, plus the spark of the deflection itself. */
function renderRicochet(args: RenderArgs): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const seconds = rng.range(0.34, 0.52);
  const out = new Signal(seconds, sr);

  // The deflection: a hard metallic scrape as the jacket smears on the surface.
  const strike = noiseBurst(0.02, sr, rng);
  bandpass(strike, rng.range(3600, 6200), 0.8);
  strike.envelope(adExp(0.00008, 0.0024));
  saturate(strike, 3.5);
  out.add(strike, 1);

  // The whine: a deforming, tumbling round radiating a falling tone. Two
  // partials a fifth apart, both bending down, with vibrato from the tumble.
  const startHz = rng.range(2600, 4200);
  const endHz = startHz * rng.range(0.16, 0.26);
  const whineEnv = (t: number): number => Math.min(1, t / 0.004) * Math.exp(-t / (seconds * 0.34));
  contourTone(
    out,
    (t) => {
      const x = Math.min(1, t / seconds);
      const base = startHz * Math.pow(endHz / startHz, Math.pow(x, 0.72));
      // Tumble modulation: a real ricochet warbles as it spins.
      return base * (1 + 0.055 * Math.sin(2 * Math.PI * rng.range(24, 40) * t));
    },
    0.5,
    'sine',
    whineEnv,
  );
  contourTone(
    out,
    (t) => {
      const x = Math.min(1, t / seconds);
      return startHz * 1.49 * Math.pow(endHz / startHz, Math.pow(x, 0.66));
    },
    0.2,
    'triangle',
    (t) => whineEnv(t) * 0.7,
  );

  // Air noise riding the whine so it is not a pure synthesiser tone.
  const hiss = new Signal(seconds, sr);
  whiteNoise(hiss, rng);
  sweepFilter(hiss, startHz, endHz * 1.4, { kind: 'bandpass', q: 3.5, curve: (t) => Math.pow(t, 0.7) });
  hiss.envelope(whineEnv);
  hiss.normalize(1);
  out.add(hiss, 0.3);

  highpass(out, 280);
  softClip(out, 0.86);
  out.removeDc().normalize(0.95);
  return out.toMono();
}

export function registerBulletSounds(register: Registrar): void {
  // Three intensities; the engine picks one from the miss distance.
  const LEVELS: [string, number][] = [
    ['bullet_whizz', 0.55],
    ['bullet_whizz_close', 1],
    ['bullet_whizz_far', 0.18],
  ];
  for (const [id, closeness] of LEVELS) {
    register(
      defineSound(id, (args) => renderWhizz(closeness, args), {
        bus: 'weapons',
        priority: 0.95,
        gain: 0.42 + 0.38 * closeness,
        // A whizz-by is a very local event; it must not be audible across the map.
        refDistance: 1.4,
        maxDistance: 16,
        rolloff: 1.8,
        pitchJitter: 2.2,
        variants: 5,
        send: 0.12,
        airScale: 1.6,
      }),
    );
  }

  register(
    defineSound('bullet_ricochet', renderRicochet, {
      bus: 'weapons',
      priority: 0.6,
      gain: 0.5,
      refDistance: 5,
      maxDistance: 90,
      rolloff: 1.2,
      pitchJitter: 2.5,
      variants: 5,
      send: 0.4,
      airScale: 1.2,
    }),
  );

  // Rounds cracking into cover next to the player: the suppression cue.
  register(
    defineSound(
      'bullet_snap',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.09, sr);
        const snap = noiseBurst(0.012, sr, rng);
        highpass(snap, 1600);
        peaking(snap, rng.range(3200, 5200), 1.2, 10);
        snap.envelope(adExp(0.00005, 0.0011));
        saturate(snap, 4.5);
        foldback(snap, 0.85);
        out.add(snap, 1);
        const tail = noiseBurst(0.07, sr, rng);
        bandpass(tail, 900, 0.8);
        tail.envelope(adExp(0.0008, 0.012));
        out.add(tail, 0.35);
        out.removeDc().normalize(0.96);
        return out.toMono();
      },
      {
        bus: 'weapons',
        priority: 0.8,
        gain: 0.45,
        refDistance: 2,
        maxDistance: 22,
        rolloff: 1.6,
        pitchJitter: 2.4,
        variants: 4,
        send: 0.2,
        airScale: 1.5,
      },
    ),
  );

  // Rocket motor in flight, looped and Doppler-shifted by the engine.
  register(
    defineSound(
      'rocket_flight',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        whiteNoise(out, rng);
        bandpass(out, 700, 0.55);
        crackleNoise(out, rng, 2600, 0.4, 2);
        saturate(out, 2.4);
        // Combustion instability: a low irregular growl under the hiss.
        ringMod(out, 46, 0.22);
        lowpass(out, 5200);
        out.normalize(0.92);
        return out.seamlessLoop(0.25).toMono();
      },
      {
        bus: 'weapons',
        priority: 0.7,
        gain: 0.55,
        refDistance: 6,
        maxDistance: 180,
        rolloff: 1.0,
        variants: 1,
        loop: true,
        send: 0.3,
        airScale: 0.9,
      },
    ),
  );

  // A round striking a helmet or plate carrier without penetrating.
  register(
    defineSound(
      'armor_deflect',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.3, sr);
        const hit = noiseBurst(0.02, sr, rng);
        bandpass(hit, rng.range(2200, 3400), 0.7);
        hit.envelope(adExp(0.00008, 0.0026));
        saturate(hit, 3.2);
        out.add(hit, 1);
        const plate = karplusStrong(0.24, sr, rng.range(700, 1300), rng, {
          damping: 0.96,
          brightness: 0.35,
          dispersion: 0.5,
          excitation: 'impulse',
        });
        plate.envelope(expDecay(0.02));
        out.add(plate, 0.45);
        const thud = new Signal(0.18, sr);
        sweepTone(thud, 130, 68, 1, { env: adExp(0.001, 0.026) });
        out.add(thud, 0.5);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.55,
        gain: 0.6,
        refDistance: 3,
        maxDistance: 45,
        pitchJitter: 1.8,
        variants: 3,
        send: 0.3,
      },
    ),
  );
}

export function bulletSoundIds(): string[] {
  return [
    'bullet_whizz',
    'bullet_whizz_close',
    'bullet_whizz_far',
    'bullet_ricochet',
    'bullet_snap',
    'rocket_flight',
    'armor_deflect',
  ];
}
