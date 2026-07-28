/**
 * Ambience beds and the sparse one-shots that sit on top of them.
 *
 * The beds are long looping buffers rendered at a reduced sample rate — a wind
 * bed has nothing above 5 kHz worth storing, and an 11 kHz render is a quarter
 * of the memory for no audible difference once the graph resamples it. Each is
 * closed with `seamlessLoop` so there is no seam at the wrap.
 *
 * What actually sells an exterior is not the bed, it is the one-shots: a dog
 * three streets over, a burst of gunfire from another part of the city, a crow,
 * a sheet of loose metal moving in the wind. The `Ambience` controller schedules
 * those at irregular intervals from random directions.
 */
import {
  Signal,
  adExp,
  bandpass,
  brownNoise,
  contourFilter,
  crackleNoise,
  expDecay,
  harmonics,
  highpass,
  karplusStrong,
  lowpass,
  noiseBurst,
  peaking,
  pinkNoise,
  ringMod,
  saturate,
  softClip,
  stereo,
  sweepFilter,
  sweepTone,
  swell,
  tone,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

/** Beds are rendered at a fraction of the graph rate to save memory. */
const BED_RATE = 12000;
const RUMBLE_RATE = 6000;

const BED_MIX = {
  bus: 'ambience' as const,
  priority: 0.25,
  refDistance: 1,
  maxDistance: 4,
  rolloff: 1,
  variants: 1,
  loop: true,
  send: 0,
  airScale: 0,
};

const ONESHOT_MIX = {
  bus: 'ambience' as const,
  priority: 0.2,
  refDistance: 20,
  maxDistance: 320,
  rolloff: 0.7,
  variants: 3,
  send: 0.4,
  airScale: 0.5,
};

export function registerAmbienceBeds(register: Registrar): void {
  // ---- Exterior ------------------------------------------------------------
  // Wind: a broadband bed whose band centre and level drift on two slow, mutually
  // prime cycles so no gust pattern ever repeats within the loop.
  register(
    defineSound(
      'amb_wind',
      ({ rng }) => {
        const sr = BED_RATE;
        const seconds = 14;
        const left = new Signal(seconds, sr);
        brownNoise(left, rng, 1.4);
        pinkNoise(left, rng, 0.8);
        const right = new Signal(seconds, sr);
        brownNoise(right, rng, 1.4);
        pinkNoise(right, rng, 0.8);

        for (const ch of [left, right]) {
          contourFilter(
            ch,
            (t) =>
              620 *
              Math.pow(
                2,
                0.9 * Math.sin(2 * Math.PI * t * 0.071) + 0.6 * Math.sin(2 * Math.PI * t * 0.031),
              ),
            { kind: 'bandpass', q: 0.65, chunk: 32 },
          );
          ch.envelope(
            (t) =>
              0.45 +
              0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t * 0.053)) +
              0.2 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t * 0.017 + 1.7)),
          );
          // A whistle where the wind finds an edge.
          const whistle = new Signal(seconds, sr);
          whiteNoise(whistle, rng);
          bandpass(whistle, 1500, 6);
          whistle.envelope((t) => Math.max(0, Math.sin(2 * Math.PI * t * 0.037) - 0.4) * 1.4);
          whistle.normalize(1);
          ch.add(whistle, 0.12);
          ch.normalize(0.85);
        }
        const l = left.seamlessLoop(1.6);
        const r = right.seamlessLoop(1.6);
        return stereo(l, r);
      },
      { ...BED_MIX, gain: 0.3 },
    ),
  );

  // Distant city: generators, traffic on an arterial road, the sound of a place
  // that is inhabited. Almost entirely below 200 Hz.
  register(
    defineSound(
      'amb_city_rumble',
      ({ rng }) => {
        const sr = RUMBLE_RATE;
        const seconds = 18;
        const out = new Signal(seconds, sr);
        brownNoise(out, rng, 1.6);
        lowpass(out, 150, 0.8);
        peaking(out, 58, 1.4, 5);
        // A generator somewhere, beating slightly against itself.
        tone(out, 49.5, 0.1, 'triangle');
        tone(out, 50.4, 0.07, 'sine');
        out.envelope((t) => 0.7 + 0.3 * Math.sin(2 * Math.PI * t * 0.041));
        out.normalize(0.9);
        return widen(out.seamlessLoop(2.4), 0.004, 0.25);
      },
      { ...BED_MIX, gain: 0.35 },
    ),
  );

  // ---- Interior ------------------------------------------------------------
  // Room tone: mains hum at 50 Hz with its odd harmonics — the ballast in a
  // fluorescent fitting — plus the broadband hiss of still air in a small space.
  register(
    defineSound(
      'amb_room_tone',
      ({ rng }) => {
        const sr = BED_RATE;
        const seconds = 8;
        const out = new Signal(seconds, sr);
        harmonics(out, 50, [1, 0.35, 0.6, 0.12, 0.3, 0.05, 0.14], 0.22);
        // Ballast buzz: the hum is not clean, it rattles.
        const buzz = new Signal(seconds, sr);
        tone(buzz, 100, 1, 'saw');
        bandpass(buzz, 1300, 3.5);
        buzz.normalize(1);
        out.add(buzz, 0.05);
        const air = new Signal(seconds, sr);
        pinkNoise(air, rng);
        lowpass(air, 2400, 0.7);
        air.normalize(1);
        out.add(air, 0.28);
        // Slow flicker in the fitting.
        out.envelope((t) => 0.9 + 0.1 * Math.sin(2 * Math.PI * t * 0.83));
        out.normalize(0.85);
        return widen(out.seamlessLoop(1.0), 0.0025, 0.2);
      },
      { ...BED_MIX, gain: 0.26 },
    ),
  );

  // Air handling: a duct somewhere upstairs still running.
  register(
    defineSound(
      'amb_air_handler',
      ({ rng }) => {
        const sr = RUMBLE_RATE;
        const seconds = 12;
        const out = new Signal(seconds, sr);
        brownNoise(out, rng, 1.3);
        bandpass(out, 190, 0.7);
        peaking(out, 96, 2, 4);
        out.envelope((t) => 0.85 + 0.15 * Math.sin(2 * Math.PI * t * 0.13));
        out.normalize(0.88);
        return out.seamlessLoop(1.6).toMono();
      },
      { ...BED_MIX, gain: 0.24 },
    ),
  );

  // The outside world, heard through a wall. Used indoors so a building does not
  // sound like a vacuum.
  register(
    defineSound(
      'amb_muffled_exterior',
      ({ rng }) => {
        const sr = RUMBLE_RATE;
        const seconds = 14;
        const out = new Signal(seconds, sr);
        brownNoise(out, rng, 1.5);
        pinkNoise(out, rng, 0.5);
        lowpass(out, 420, 0.8);
        lowpass(out, 380, 0.8);
        out.envelope((t) => 0.6 + 0.4 * Math.sin(2 * Math.PI * t * 0.061));
        out.normalize(0.88);
        return widen(out.seamlessLoop(2.0), 0.005, 0.3);
      },
      { ...BED_MIX, gain: 0.2 },
    ),
  );

  // ---- Tunnel --------------------------------------------------------------
  // A long concrete box: the axial modes ring, so the bed is a drone with comb
  // structure rather than flat noise.
  register(
    defineSound(
      'amb_tunnel_drone',
      ({ rng }) => {
        const sr = BED_RATE;
        const seconds = 16;
        const out = new Signal(seconds, sr);
        brownNoise(out, rng, 1.6);
        pinkNoise(out, rng, 0.4);
        // Axial modes of a 5 m x 3.6 m section: c/2L at 34 Hz and 48 Hz.
        peaking(out, 34.3, 5, 9);
        peaking(out, 47.6, 5, 7);
        peaking(out, 68.6, 4, 5);
        peaking(out, 95.2, 4, 4);
        lowpass(out, 900, 0.7);
        out.envelope((t) => 0.75 + 0.25 * Math.sin(2 * Math.PI * t * 0.029));
        // Air moving through the length of it.
        const draught = new Signal(seconds, sr);
        whiteNoise(draught, rng);
        bandpass(draught, 340, 1.1);
        draught.envelope((t) => 0.5 + 0.5 * Math.sin(2 * Math.PI * t * 0.047 + 2.1));
        draught.normalize(1);
        out.add(draught, 0.2);
        out.normalize(0.9);
        return widen(out.seamlessLoop(2.2), 0.006, 0.35);
      },
      { ...BED_MIX, gain: 0.32 },
    ),
  );

  // ---- One-shots -----------------------------------------------------------
  // A firefight elsewhere in the city: three to six muffled reports.
  register(
    defineSound(
      'amb_distant_gunfire',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.4, sr);
        const shots = rng.int(3, 7);
        let at = 0.05;
        for (let i = 0; i < shots; i++) {
          const shot = new Signal(0.7, sr);
          const body = noiseBurst(0.5, sr, rng);
          sweepFilter(body, 620, 190, { q: 0.7, curve: (t) => Math.pow(t, 0.4) });
          body.envelope(swell(0.012, 0.09));
          shot.add(body, 1);
          sweepTone(shot, 92, 44, 0.4, { env: adExp(0.006, 0.07) });
          lowpass(shot, 700, 0.7);
          shot.normalize(1);
          out.add(shot, rng.range(0.5, 1), at);
          at += rng.range(0.09, 0.26);
          if (at > 2.0) break;
        }
        highpass(out, 45);
        out.removeDc().normalize(0.9);
        return widen(out, 0.006, 0.4);
      },
      { ...ONESHOT_MIX, gain: 0.42, pitchJitter: 1.5, airScale: 0.25 },
    ),
  );

  register(
    defineSound(
      'amb_dog_bark',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        const barks = rng.int(2, 4);
        let at = 0.02;
        for (let i = 0; i < barks; i++) {
          const bark = new Signal(0.3, sr);
          // A dog is a short, harsh, formant-shaped bark: a growl body under a
          // bright transient.
          const body = noiseBurst(0.16, sr, rng);
          bandpass(body, rng.range(600, 1100), 1.3);
          ringMod(body, rng.range(90, 160), 0.6);
          body.envelope(adExp(0.004, 0.035));
          bark.add(body, 1);
          const snap = noiseBurst(0.03, sr, rng);
          bandpass(snap, rng.range(2400, 4200), 0.9);
          snap.envelope(adExp(0.0008, 0.005));
          bark.add(snap, 0.5);
          sweepTone(bark, rng.range(280, 420), rng.range(150, 220), 0.3, {
            env: adExp(0.005, 0.04),
          });
          bark.normalize(1);
          out.add(bark, rng.range(0.6, 1), at);
          at += rng.range(0.2, 0.45);
        }
        lowpass(out, 3600, 0.7);
        out.removeDc().normalize(0.88);
        return out.toMono();
      },
      { ...ONESHOT_MIX, gain: 0.3, maxDistance: 200, pitchJitter: 2.5 },
    ),
  );

  register(
    defineSound(
      'amb_crow',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.1, sr);
        const calls = rng.int(1, 3);
        let at = 0.02;
        for (let i = 0; i < calls; i++) {
          const call = new Signal(0.32, sr);
          const body = noiseBurst(0.26, sr, rng);
          bandpass(body, rng.range(1300, 2000), 2.2);
          ringMod(body, rng.range(180, 280), 0.75);
          body.envelope(adExp(0.008, 0.06));
          call.add(body, 1);
          call.normalize(1);
          out.add(call, rng.range(0.6, 1), at);
          at += rng.range(0.26, 0.42);
        }
        highpass(out, 500);
        out.removeDc().normalize(0.86);
        return out.toMono();
      },
      { ...ONESHOT_MIX, gain: 0.22, maxDistance: 140, pitchJitter: 3 },
    ),
  );

  // A loose sheet of corrugated metal shifting on a roof.
  register(
    defineSound(
      'amb_metal_creak',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.8, sr);
        const groan = karplusStrong(1.4, sr, rng.range(70, 190), rng, {
          damping: 0.9975,
          brightness: 0.72,
          dispersion: 0.78,
          excitation: 'noise',
          pluckWidth: 0.5,
        });
        groan.envelope(swell(0.18, 0.42));
        out.add(groan, 1);
        // Stick-slip: the creak is a series of tiny releases.
        const grind = new Signal(1.2, sr);
        crackleNoise(grind, rng, 120, 1, 2.4);
        bandpass(grind, rng.range(900, 2200), 1.6);
        grind.envelope(swell(0.12, 0.3));
        grind.normalize(1);
        out.add(grind, 0.35, 0.08);
        out.removeDc().normalize(0.85);
        return out.toMono();
      },
      { ...ONESHOT_MIX, gain: 0.26, maxDistance: 90, pitchJitter: 2.5, send: 0.5 },
    ),
  );

  // A vehicle passing on a road out of sight.
  register(
    defineSound(
      'amb_vehicle_pass',
      ({ sampleRate: sr, rng }) => {
        const seconds = 4.5;
        const out = new Signal(seconds, sr);
        const pass = seconds * 0.5;
        const bed = new Signal(seconds, sr);
        brownNoise(bed, rng, 1.4);
        pinkNoise(bed, rng, 0.6);
        contourFilter(
          bed,
          (t) => {
            // Doppler on the engine order plus distance-dependent dulling.
            const d = Math.abs(t - pass);
            return (240 * (t < pass ? 1.13 : 0.89)) / (1 + d * 0.35);
          },
          { kind: 'bandpass', q: 1.1, chunk: 32 },
        );
        bed.envelope((t) => {
          const d = (t - pass) / 1.1;
          return 1 / (1 + d * d);
        });
        out.add(bed, 1);
        // Tyre noise on tarmac.
        const tyres = new Signal(seconds, sr);
        whiteNoise(tyres, rng);
        bandpass(tyres, 900, 0.6);
        tyres.envelope((t) => {
          const d = (t - pass) / 0.7;
          return 1 / (1 + d * d * 1.6);
        });
        tyres.normalize(1);
        out.add(tyres, 0.3);
        lowpass(out, 3200, 0.7);
        out.removeDc().normalize(0.88);
        return widen(out, 0.005, 0.45);
      },
      { ...ONESHOT_MIX, gain: 0.3, maxDistance: 220, pitchJitter: 1.2 },
    ),
  );

  // Water dripping in an interior or a tunnel. Two or three drops.
  register(
    defineSound(
      'amb_drip',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.4, sr);
        const drops = rng.int(1, 3);
        let at = 0.01;
        for (let i = 0; i < drops; i++) {
          const drop = new Signal(0.4, sr);
          const f0 = rng.range(700, 1900);
          // The pitch rises as the cavity left by the drop collapses.
          sweepTone(drop, f0, f0 * rng.range(2.2, 3.4), 1, {
            curve: (t) => Math.pow(t, 0.6),
            env: adExp(0.0012, 0.02),
          });
          const splash = noiseBurst(0.05, sr, rng);
          bandpass(splash, 4200, 0.9);
          splash.envelope(adExp(0.0004, 0.005));
          drop.add(splash, 0.3);
          drop.normalize(1);
          out.add(drop, rng.range(0.5, 1), at);
          at += rng.range(0.3, 0.6);
        }
        highpass(out, 350);
        out.removeDc().normalize(0.85);
        return out.toMono();
      },
      {
        ...ONESHOT_MIX,
        gain: 0.3,
        refDistance: 3,
        maxDistance: 34,
        rolloff: 1.3,
        pitchJitter: 3,
        send: 0.6,
        airScale: 1,
      },
    ),
  );

  // A building settling: a timber or a joist under load.
  register(
    defineSound(
      'amb_creak',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.5, sr);
        const grind = new Signal(1.2, sr);
        crackleNoise(grind, rng, rng.range(40, 140), 1, 2.6);
        bandpass(grind, rng.range(400, 1100), 2.2);
        grind.envelope(swell(0.16, 0.34));
        out.add(grind, 1);
        const body = karplusStrong(0.9, sr, rng.range(120, 300), rng, {
          damping: 0.995,
          brightness: 0.85,
          dispersion: 0.3,
          excitation: 'noise',
          pluckWidth: 0.3,
        });
        body.envelope(swell(0.1, 0.24));
        out.add(body, 0.4);
        out.removeDc().normalize(0.84);
        return out.toMono();
      },
      {
        ...ONESHOT_MIX,
        gain: 0.24,
        refDistance: 3,
        maxDistance: 30,
        rolloff: 1.4,
        pitchJitter: 2.5,
        send: 0.5,
        airScale: 1,
      },
    ),
  );

  // Rubble or grit shifting nearby; the map settling after a detonation.
  register(
    defineSound(
      'amb_debris_settle',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        crackleNoise(out, rng, rng.range(300, 900), 1, 2.8);
        bandpass(out, rng.range(1600, 3400), 0.8);
        out.envelope(swell(0.04, 0.34));
        // A few larger pieces.
        for (let i = 0; i < 4; i++) {
          const piece = noiseBurst(0.08, sr, rng);
          bandpass(piece, rng.range(500, 1600), 1);
          piece.envelope(adExp(0.001, 0.012));
          out.add(piece, rng.range(0.15, 0.45), rng.range(0.02, 1.1));
        }
        out.removeDc().normalize(0.86);
        return out.toMono();
      },
      {
        ...ONESHOT_MIX,
        gain: 0.3,
        refDistance: 4,
        maxDistance: 50,
        rolloff: 1.2,
        pitchJitter: 2,
        send: 0.45,
        airScale: 0.9,
      },
    ),
  );

  // Something metal falling over in another room.
  register(
    defineSound(
      'amb_distant_impact',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.0, sr);
        const clang = karplusStrong(1.2, sr, rng.range(140, 420), rng, {
          damping: 0.9965,
          brightness: 0.4,
          dispersion: 0.6,
          excitation: 'impulse',
        });
        clang.envelope(expDecay(0.22));
        out.add(clang, 1);
        const body = noiseBurst(0.3, sr, rng);
        lowpass(body, 800, 0.8);
        body.envelope(adExp(0.002, 0.04));
        out.add(body, 0.5);
        lowpass(out, 2200, 0.7);
        out.removeDc().normalize(0.86);
        return out.toMono();
      },
      { ...ONESHOT_MIX, gain: 0.3, maxDistance: 120, pitchJitter: 2.5, send: 0.6, airScale: 0.8 },
    ),
  );
}

export const AMBIENCE_BED_IDS: readonly string[] = [
  'amb_wind',
  'amb_city_rumble',
  'amb_room_tone',
  'amb_air_handler',
  'amb_muffled_exterior',
  'amb_tunnel_drone',
];

export const AMBIENCE_ONESHOT_IDS: readonly string[] = [
  'amb_distant_gunfire',
  'amb_dog_bark',
  'amb_crow',
  'amb_metal_creak',
  'amb_vehicle_pass',
  'amb_drip',
  'amb_creak',
  'amb_debris_settle',
  'amb_distant_impact',
];
