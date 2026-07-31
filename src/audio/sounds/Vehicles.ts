/**
 * Aircraft and ordnance for the killstreak module.
 *
 * Two forms are provided for each machine, because a killstreak sequence may
 * want either:
 *
 *  - A **one-shot** with the whole event baked in (`jet_flyover`, `bomb_whistle`).
 *    Fire and forget through `play(id, position)`; the Doppler shift and the
 *    approach/recede amplitude curve are already in the buffer.
 *  - A **loop** with no dynamics of its own (`jet_engine_loop`, `heli_rotor`,
 *    `drone_prop`). The engine drives position, Doppler and level per frame, so
 *    an aircraft can actually orbit the map.
 *
 * A jet is a filtered noise bed with a strong resonant peak — that peak is the
 * intake, and its frequency is what makes the machine read as a jet rather than
 * as wind. The afterburner is a separate saturated low bed. A rotor is the same
 * noise bed amplitude-modulated at the blade-pass frequency, which for a
 * four-blade medium helicopter is around 20 Hz: slow enough to be heard as
 * individual slaps rather than as a pitch.
 */
import {
  Signal,
  adExp,
  bandpass,
  brownNoise,
  compress,
  contourFilter,
  contourTone,
  crackleNoise,
  expDecay,
  harmonics,
  highpass,
  limit,
  lowpass,
  noiseBurst,
  peaking,
  pinkNoise,
  ringMod,
  saturate,
  softClip,
  sweepFilter,
  sweepTone,
  swell,
  tone,
  tremolo,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

/** Speed of sound, for the Doppler ratios baked into the flyover. */
const C = 343;

/**
 * A jet passing overhead at `mach` fraction of the speed of sound.
 *
 * The Doppler factor for a source approaching then receding is
 * `c / (c - v cos t)`, which starts near `c / (c - v)`, crosses 1 at the closest
 * point of approach and settles at `c / (c + v)`. At 240 m/s that is a shift
 * from roughly +230% to -40% — an enormous, very audible swoop. The amplitude
 * follows 1/r^2 with r minimised at the pass, and the high end is progressively
 * lost as the distance grows.
 */
function renderFlyover(args: RenderArgs, speed: number, seconds: number): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const out = new Signal(seconds, sr);
  const pass = seconds * 0.46;
  // Closest approach in metres; sets how violent the pass is.
  const miss = 90;

  const doppler = (t: number): number => {
    const along = (t - pass) * speed;
    const r = Math.sqrt(along * along + miss * miss);
    // Radial velocity component: negative approaching, positive receding.
    const radial = (along * speed) / Math.max(1, r);
    return C / Math.max(60, C - -radial);
  };
  const level = (t: number): number => {
    const along = (t - pass) * speed;
    const r2 = along * along + miss * miss;
    return (miss * miss) / r2;
  };

  // Turbine bed: broadband noise with the intake resonance riding the Doppler.
  const bed = new Signal(seconds, sr);
  whiteNoise(bed, rng);
  pinkNoise(bed, rng, 1.2);
  contourFilter(bed, (t) => 780 * doppler(t), { kind: 'bandpass', q: 1.6, chunk: 24 });
  bed.envelope(level);
  out.add(bed, 1);

  // Second resonance an octave and a half up: the compressor stages.
  const whine = new Signal(seconds, sr);
  whiteNoise(whine, rng);
  contourFilter(whine, (t) => 2600 * doppler(t), { kind: 'bandpass', q: 5, chunk: 16 });
  whine.envelope((t) => level(t) * (t < pass ? 1 : 0.35));
  whine.normalize(1);
  out.add(whine, 0.45);

  // Blade-pass tone from the fan; audible on approach, gone once it is past.
  contourTone(out, (t) => 190 * doppler(t), 0.16, 'sine', (t) => level(t) * (t < pass ? 1 : 0.2));

  // Afterburner: a saturated low rumble with slow instability, no Doppler
  // detail because it is broadband to begin with.
  const burner = new Signal(seconds, sr);
  brownNoise(burner, rng);
  lowpass(burner, 220, 0.8);
  crackleNoise(burner, rng, 60, 0.25, 2);
  saturate(burner, 3);
  burner.envelope((t) => level(t) * (0.5 + 0.7 * Math.min(1, Math.max(0, (t - pass) / 0.4))));
  burner.normalize(1);
  out.add(burner, 0.75);

  // Air absorption grows with distance, so the far ends are much duller.
  contourFilter(out, (t) => {
    const along = (t - pass) * speed;
    const r = Math.sqrt(along * along + miss * miss);
    return Math.max(600, 16000 / (1 + r / 120));
  });

  compress(out, -18, 3, 20, 300, 4);
  highpass(out, 32);
  softClip(out, 0.85);
  out.removeDc().normalize(0.96);
  return widen(out, 0.0026, 0.5);
}

/** A falling bomb's fin whistle: a descending tone that swells as it nears. */
function renderWhistle(args: RenderArgs, seconds: number, fromHz: number, toHz: number): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const out = new Signal(seconds, sr);
  const freqAt = (t: number): number => {
    const x = Math.min(1, t / seconds);
    // Accelerating fall: the pitch drops faster as the bomb gets closer, which
    // is the Doppler of something coming almost straight down at you.
    return fromHz * Math.pow(toHz / fromHz, Math.pow(x, 1.7));
  };
  const levelAt = (t: number): number => {
    const x = Math.min(1, t / seconds);
    return Math.pow(x, 2.2) * (0.25 + 0.75 * x);
  };

  // The whistle proper: a resonant band on turbulent noise, not a pure tone.
  const air = new Signal(seconds, sr);
  whiteNoise(air, rng);
  contourFilter(air, freqAt, { kind: 'bandpass', q: 9, chunk: 16 });
  air.envelope(levelAt);
  air.normalize(1);
  out.add(air, 1);

  // A weak tonal core and its octave, so it carries over a busy mix.
  contourTone(out, freqAt, 0.3, 'sine', levelAt);
  contourTone(out, (t) => freqAt(t) * 2, 0.1, 'sine', levelAt);

  // Body rush: broadband air moving past a large object.
  const rush = new Signal(seconds, sr);
  whiteNoise(rush, rng);
  sweepFilter(rush, 900, 2600, { q: 0.7 });
  rush.envelope((t) => Math.pow(Math.min(1, t / seconds), 3));
  rush.normalize(1);
  out.add(rush, 0.35);

  softClip(out, 0.88);
  out.removeDc().normalize(0.95);
  return widen(out, 0.0014, 0.4);
}

export function registerVehicleSounds(register: Registrar): void {
  // ---- Jets ----------------------------------------------------------------
  register(
    defineSound('jet_flyover', (args) => renderFlyover(args, 235, 5.2), {
      bus: 'sfx',
      priority: 0.9,
      gain: 0.95,
      refDistance: 30,
      maxDistance: 700,
      rolloff: 0.6,
      pitchJitter: 0.5,
      variants: 2,
      send: 0.35,
      airScale: 0.5,
    }),
  );

  register(
    defineSound('jet_flyover_far', (args) => renderFlyover(args, 210, 6.5), {
      bus: 'sfx',
      priority: 0.5,
      gain: 0.42,
      refDistance: 60,
      maxDistance: 900,
      rolloff: 0.4,
      variants: 2,
      send: 0.3,
      airScale: 0.3,
    }),
  );

  // Steady jet bed for a killstreak that wants to drive its own approach.
  register(
    defineSound(
      'jet_engine_loop',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(3.0, sr);
        whiteNoise(out, rng);
        pinkNoise(out, rng, 1.1);
        bandpass(out, 760, 1.5);
        peaking(out, 2500, 4.5, 9);
        const burner = new Signal(3.0, sr);
        brownNoise(burner, rng);
        lowpass(burner, 200, 0.8);
        saturate(burner, 3);
        burner.normalize(1);
        out.normalize(0.8);
        out.add(burner, 0.5);
        tone(out, 188, 0.1, 'sine');
        out.normalize(0.92);
        return out.seamlessLoop(0.4).toMono();
      },
      {
        bus: 'sfx',
        priority: 0.7,
        gain: 0.7,
        refDistance: 40,
        maxDistance: 800,
        rolloff: 0.55,
        variants: 1,
        loop: true,
        send: 0.3,
        airScale: 0.5,
      },
    ),
  );

  // ---- Ordnance ------------------------------------------------------------
  register(
    defineSound('bomb_whistle', (args) => renderWhistle(args, 3.0, 2100, 420), {
      bus: 'sfx',
      priority: 0.95,
      gain: 0.8,
      refDistance: 25,
      maxDistance: 500,
      rolloff: 0.7,
      pitchJitter: 1.2,
      variants: 3,
      send: 0.25,
      airScale: 0.6,
    }),
  );

  register(
    defineSound('cluster_whistle', (args) => renderWhistle(args, 1.6, 2800, 900), {
      bus: 'sfx',
      priority: 0.75,
      gain: 0.55,
      refDistance: 20,
      maxDistance: 400,
      rolloff: 0.8,
      pitchJitter: 2.4,
      variants: 4,
      send: 0.25,
      airScale: 0.7,
    }),
  );

  // Rocket / missile launch from an aircraft.
  register(
    defineSound(
      'missile_launch',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        const ignite = noiseBurst(0.5, sr, rng);
        sweepFilter(ignite, 320, 4200, { q: 0.7, curve: (t) => Math.pow(t, 0.4) });
        ignite.envelope((t) => Math.min(1, t / 0.006) * Math.exp(-t / 0.14));
        saturate(ignite, 3.5);
        out.add(ignite, 1);
        const motor = new Signal(1.5, sr);
        whiteNoise(motor, rng);
        bandpass(motor, 800, 0.55);
        crackleNoise(motor, rng, 2200, 0.4, 2);
        motor.envelope((t) => Math.min(1, t / 0.03) * Math.exp(-t / 0.55));
        motor.normalize(1);
        out.add(motor, 0.7);
        sweepTone(out, 120, 44, 0.5, { curve: (t) => Math.pow(t, 0.5), env: adExp(0.004, 0.12) });
        softClip(out, 0.86);
        out.removeDc().normalize(0.96);
        return widen(out, 0.0012, 0.4);
      },
      {
        bus: 'sfx',
        priority: 0.85,
        gain: 0.85,
        refDistance: 15,
        maxDistance: 400,
        rolloff: 0.8,
        pitchJitter: 1,
        variants: 2,
        send: 0.4,
        airScale: 0.6,
      },
    ),
  );

  // ---- Rotorcraft ----------------------------------------------------------
  // Blade-pass frequency of 20.4 Hz: four blades at 306 rpm, a medium utility
  // helicopter. Slow enough that each slap is a distinct event.
  register(
    defineSound(
      'heli_rotor',
      ({ sampleRate: sr, rng }) => {
        // 20 Hz blade pass is four blades at 300 rpm. Everything periodic here
        // is an integer multiple of 2 Hz so that a 0.5 s loop wraps in phase:
        // the blade slaps, the 1180 Hz turbine and the 114 Hz tail rotor all
        // complete a whole number of cycles across the loop.
        const bladePass = 20;
        const loop = 0.5;
        const fade = 0.1;
        const seconds = loop + fade;
        const out = new Signal(seconds, sr);
        whiteNoise(out, rng);
        brownNoise(out, rng, 1.4);
        bandpass(out, 420, 0.8);

        // The slap: a sharp asymmetric amplitude modulation, not a sine. A
        // rotor blade compresses the air ahead of it and releases suddenly.
        const slap = new Signal(seconds, sr);
        slap.fill((t) => {
          const phase = (t * bladePass) % 1;
          const attack = Math.pow(Math.max(0, 1 - phase / 0.12), 0.6);
          const body = Math.pow(Math.max(0, 1 - phase), 2.2) * 0.5;
          return 0.28 + 1.5 * attack + body;
        });
        out.multiply(slap);

        // Turbine: a harmonic whine well above the rotor.
        const turbine = new Signal(seconds, sr);
        harmonics(turbine, 1180, [1, 0.4, 0.22, 0.1], 0.5);
        bandpass(turbine, 2400, 1.2);
        out.add(turbine, 0.16);

        // Tail rotor: faster, thinner, and slightly detuned from the main.
        const tail = new Signal(seconds, sr);
        whiteNoise(tail, rng);
        bandpass(tail, 1600, 1.4);
        tail.envelope(tremolo(114, 0.85));
        tail.normalize(1);
        out.add(tail, 0.14);

        // Airframe rumble.
        const rumble = new Signal(seconds, sr);
        brownNoise(rumble, rng);
        lowpass(rumble, 90, 0.9);
        rumble.normalize(1);
        out.add(rumble, 0.4);

        saturate(out, 1.8);
        out.normalize(0.92);
        return out.seamlessLoop(fade).toMono();
      },
      {
        bus: 'sfx',
        priority: 0.75,
        gain: 0.7,
        refDistance: 25,
        maxDistance: 400,
        rolloff: 0.75,
        variants: 1,
        loop: true,
        send: 0.35,
        airScale: 0.55,
      },
    ),
  );

  // A quadcopter: blade pass an order of magnitude faster, so it reads as a
  // pitch rather than as slaps, plus the characteristic beating between motors.
  register(
    defineSound(
      'drone_prop',
      ({ sampleRate: sr, rng }) => {
        const bladePass = 112;
        const loop = 0.5;
        const fade = 0.05;
        const seconds = loop + fade;
        const out = new Signal(seconds, sr);
        whiteNoise(out, rng);
        bandpass(out, 2600, 0.7);
        out.envelope(tremolo(bladePass, 0.75));

        // Four motors, each slightly off the others. The beating is the whole
        // reason a drone sounds like a drone — and the beat frequencies have to
        // close the loop too, so the rotor rates are whole even numbers rather
        // than ratios: 2, 4 and 6 Hz of beating all fit the 0.5 s wrap.
        const rates = [112, 114, 110, 116];
        for (let i = 0; i < rates.length; i++) {
          const f = rates[i];
          tone(out, f, 0.22, 'saw', i * 1.3);
          tone(out, f * 2, 0.1, 'sine', i * 0.7);
          tone(out, f * 3, 0.05, 'sine', i * 2.1);
        }
        // Motor whine well above the blade rate.
        const whine = new Signal(seconds, sr);
        harmonics(whine, 1840, [1, 0.3, 0.12], 0.4);
        out.add(whine, 0.12);
        lowpass(out, 8000);
        highpass(out, 70);
        saturate(out, 1.5);
        out.normalize(0.9);
        return out.seamlessLoop(fade).toMono();
      },
      {
        bus: 'sfx',
        priority: 0.5,
        gain: 0.4,
        refDistance: 8,
        maxDistance: 140,
        rolloff: 1.1,
        variants: 1,
        loop: true,
        send: 0.25,
        airScale: 0.9,
      },
    ),
  );

  // A care package crate hitting the ground under a chute.
  register(
    defineSound(
      'crate_impact',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.2, sr);
        const slam = noiseBurst(0.2, sr, rng);
        lowpass(slam, 1600, 0.85);
        slam.envelope(adExp(0.0008, 0.03));
        saturate(slam, 2.6);
        out.add(slam, 1);
        sweepTone(out, 86, 36, 0.9, { curve: (t) => Math.pow(t, 0.6), env: adExp(0.003, 0.09) });
        // Panels flexing and the chute collapsing over the top.
        const panels = new Signal(0.7, sr);
        crackleNoise(panels, rng, 240, 0.7, 2.2);
        bandpass(panels, 1400, 0.8);
        panels.envelope(swell(0.03, 0.2));
        out.add(panels, 0.4, 0.05);
        const chute = noiseBurst(0.8, sr, rng);
        bandpass(chute, 3200, 0.6);
        chute.envelope(swell(0.12, 0.24));
        chute.normalize(1);
        out.add(chute, 0.2, 0.1);
        highpass(out, 34);
        softClip(out, 0.88);
        out.removeDc().normalize(0.96);
        return widen(out, 0.0012, 0.4);
      },
      {
        bus: 'sfx',
        priority: 0.7,
        gain: 0.85,
        refDistance: 8,
        maxDistance: 160,
        rolloff: 1,
        pitchJitter: 1,
        variants: 2,
        send: 0.45,
        airScale: 0.7,
      },
    ),
  );

  // A UAV sweep tone, for the moment the radar refreshes.
  register(
    defineSound(
      'uav_sweep',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.1, sr);
        contourTone(
          out,
          (t) => 620 + 340 * Math.sin(Math.PI * Math.min(1, t / 0.9)),
          0.35,
          'sine',
          swell(0.03, 0.28),
        );
        const air = new Signal(1.0, sr);
        whiteNoise(air, rng);
        bandpass(air, 1800, 3);
        air.envelope(swell(0.05, 0.22));
        air.normalize(1);
        out.add(air, 0.14);
        ringMod(out, 7.5, 0.3);
        out.removeDc().normalize(0.9);
        return widen(out, 0.0012, 0.3);
      },
      { bus: 'ui', priority: 0.5, gain: 0.3, variants: 1, send: 0, airScale: 0 },
    ),
  );

  // Airstrike siren: the warning that jets are inbound.
  register(
    defineSound(
      'airstrike_siren',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.4, sr);
        contourTone(
          out,
          (t) => 420 * (1 + 0.55 * Math.sin(2 * Math.PI * 0.55 * t)),
          0.4,
          'saw',
          (t) => Math.min(1, t / 0.25) * Math.min(1, (2.4 - t) / 0.5),
        );
        bandpass(out, 900, 0.9);
        saturate(out, 2.4);
        const air = new Signal(2.4, sr);
        whiteNoise(air, rng);
        bandpass(air, 1400, 1.2);
        air.envelope((t) => Math.min(1, t / 0.3) * Math.min(1, (2.4 - t) / 0.6) * 0.4);
        out.add(air, 0.2);
        out.removeDc().normalize(0.92);
        return widen(out, 0.0018, 0.5);
      },
      {
        bus: 'sfx',
        priority: 0.8,
        gain: 0.5,
        refDistance: 40,
        maxDistance: 600,
        rolloff: 0.5,
        variants: 1,
        send: 0.4,
        airScale: 0.5,
      },
    ),
  );

  // Door-gun minigun. A rotary cannon does not fire discrete shots so much as
  // tear: the rounds arrive faster than the ear resolves them, so the design is
  // a buzz at the fire rate plus one report on top rather than a report per
  // round. Four of these a second is the whole sound.
  register(
    defineSound(
      'minigun_fire',
      ({ sampleRate: sr, rng }) => {
        const seconds = 0.26;
        const out = new Signal(seconds, sr);
        const rate = 55;
        // Individual reports, overlapping heavily.
        for (let i = 0; i * (1 / rate) < seconds - 0.02; i++) {
          const at = i * (1 / rate) * rng.range(0.97, 1.03);
          const shot = noiseBurst(0.05, sr, rng);
          bandpass(shot, 780 * rng.range(0.95, 1.06), 1.8);
          peaking(shot, 1950, 2.2, 7);
          shot.envelope(adExp(0.0004, 0.009));
          out.add(shot, rng.range(0.75, 1), at);
        }
        // The gearbox and the barrel cluster spinning under it.
        const whir = new Signal(seconds, sr);
        tone(whir, rate * 4, 0.5, 'saw');
        tone(whir, rate * 6, 0.25, 'saw', 0.4);
        bandpass(whir, 1400, 1.4);
        out.add(whir, 0.18);
        const sub = new Signal(seconds, sr);
        tone(sub, rate, 0.7, 'sine');
        lowpass(sub, 160, 0.9);
        out.add(sub, 0.4);
        saturate(out, 2.6);
        highpass(out, 45);
        softClip(out, 0.85);
        out.removeDc().normalize(0.96);
        return out.seamlessLoop(0.012).toMono();
      },
      {
        bus: 'weapons',
        priority: 0.9,
        gain: 0.8,
        refDistance: 14,
        maxDistance: 420,
        rolloff: 0.9,
        pitchJitter: 0.6,
        variants: 3,
        send: 0.4,
        airScale: 0.8,
        propagate: true,
      },
    ),
  );

  // A care package unlatching: two catches and a lid swinging up.
  register(
    defineSound(
      'crate_open',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.1, sr);
        for (const at of [0, 0.11]) {
          const latch = noiseBurst(0.03, sr, rng);
          bandpass(latch, rng.range(2600, 3600), 1.1);
          latch.envelope(adExp(0.0004, 0.006));
          out.add(latch, 0.8, at);
        }
        const hinge = new Signal(0.5, sr);
        crackleNoise(hinge, rng, 60, 0.8, 2.4);
        bandpass(hinge, 2200, 2.5);
        hinge.envelope(swell(0.04, 0.16));
        out.add(hinge, 0.35, 0.16);
        // The lid landing back against the frame.
        const thud = new Signal(0.4, sr);
        sweepTone(thud, 150, 62, 1, { env: adExp(0.002, 0.05) });
        const panel = noiseBurst(0.12, sr, rng);
        lowpass(panel, 1200, 0.9);
        panel.envelope(adExp(0.001, 0.02));
        thud.add(panel, 0.7);
        out.add(thud, 0.9, 0.5);
        out.removeDc().normalize(0.94);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.5,
        gain: 0.6,
        refDistance: 3,
        maxDistance: 40,
        pitchJitter: 1.2,
        variants: 2,
        send: 0.3,
      },
    ),
  );

  // A parachute filling: a sharp crack of nylon then a settling flutter.
  register(
    defineSound(
      'chute_deploy',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        const crack = noiseBurst(0.16, sr, rng);
        bandpass(crack, 1900, 0.6);
        crack.envelope(adExp(0.0016, 0.028));
        saturate(crack, 2);
        out.add(crack, 1);
        // Canopy flutter: broadband noise amplitude-modulated at a few hertz.
        const flutter = new Signal(1.5, sr);
        whiteNoise(flutter, rng);
        bandpass(flutter, 1200, 0.5);
        flutter.envelope((t) => {
          const decay = Math.exp(-t / 0.55);
          return decay * (0.6 + 0.4 * Math.sin(2 * Math.PI * 4.5 * t + rng.next()));
        });
        flutter.normalize(1);
        out.add(flutter, 0.55, 0.06);
        const rig = new Signal(0.5, sr);
        tone(rig, 220, 0.4, 'triangle', 0, adExp(0.004, 0.06));
        out.add(rig, 0.2, 0.02);
        out.removeDc().normalize(0.93);
        return widen(out, 0.0014, 0.4);
      },
      {
        bus: 'sfx',
        priority: 0.55,
        gain: 0.6,
        refDistance: 12,
        maxDistance: 200,
        rolloff: 0.9,
        pitchJitter: 1,
        variants: 2,
        send: 0.4,
        airScale: 0.8,
      },
    ),
  );
}

export const VEHICLE_SOUND_IDS: readonly string[] = [
  'jet_flyover',
  'jet_flyover_far',
  'jet_engine_loop',
  'bomb_whistle',
  'cluster_whistle',
  'missile_launch',
  'heli_rotor',
  'drone_prop',
  'crate_impact',
  'crate_open',
  'chute_deploy',
  'minigun_fire',
  'uav_sweep',
  'airstrike_siren',
];
