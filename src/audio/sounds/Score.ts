/**
 * Music stems.
 *
 * The score is adaptive and almost entirely low-frequency, which is a deliberate
 * mix decision: gunfire owns 500 Hz to 8 kHz and anything the music puts there
 * will either be masked or will mask a gameplay cue. So the score lives under
 * 500 Hz, with only the tension layer reaching up, and it ducks under the
 * weapons bus regardless.
 *
 * D minor throughout, at 84 BPM. Two sustained loops (drone, tension) that fade
 * with intensity, and a set of one-shots (pulse, kick, taiko, rim, sub drop)
 * that `Music` schedules on the audio clock so everything stays tempo-locked
 * even when the frame rate does not cooperate.
 */
import {
  Signal,
  ad,
  adExp,
  bandpass,
  brownNoise,
  expDecay,
  fmTone,
  harmonics,
  highpass,
  lowpass,
  noiseBurst,
  peaking,
  pinkNoise,
  ringMod,
  saturate,
  softClip,
  superSaw,
  sweepFilter,
  sweepTone,
  swell,
  tone,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type Registrar } from './Spec';

/** D minor. D1 is the root of everything here. */
export const MUSIC_TEMPO = 84;
const D1 = 36.708;
const D2 = 73.416;
const A2 = 110.0;
const F2 = 87.307;
const BB2 = 116.541;
const D3 = 146.832;

const STEM_MIX = {
  bus: 'music' as const,
  priority: 0.3,
  refDistance: 1,
  maxDistance: 4,
  rolloff: 1,
  variants: 1,
  send: 0,
  airScale: 0,
};

/** Loop length for the sustained layers: 8 bars of 4/4 at 84 BPM. */
const BAR = (4 * 60) / MUSIC_TEMPO;
const LOOP = BAR * 8;

export function registerMusicStems(register: Registrar): void {
  // The drone: the root and its fifth, detuned, under a slowly breathing filter.
  register(
    defineSound(
      'mus_drone',
      ({ sampleRate: sr, rng }) => {
        const seconds = LOOP;
        const out = new Signal(seconds, sr);
        tone(out, D1, 0.5, 'sine');
        tone(out, D1 * 1.005, 0.28, 'sine', 1.1);
        tone(out, D2, 0.34, 'triangle', 0.4);
        tone(out, A2, 0.14, 'sine', 2.2);
        superSaw(out, D2, 5, 9, 0.1);
        // Sub-audio movement so the drone is never static.
        sweepFilter(out, 150, 150, { q: 0.7 });
        out.envelope((t) => 0.78 + 0.22 * Math.sin((2 * Math.PI * t) / (seconds / 3)));
        // A whisper of air keeps it from sounding like a test tone.
        const air = new Signal(seconds, sr);
        brownNoise(air, rng);
        lowpass(air, 120, 0.8);
        air.normalize(1);
        out.add(air, 0.12);
        saturate(out, 1.4);
        lowpass(out, 420, 0.7);
        out.removeDc().normalize(0.9);
        return widen(out.seamlessLoop(BAR), 0.008, 0.3);
      },
      { ...STEM_MIX, gain: 0.5, loop: true },
    ),
  );

  // Tension: a high, dissonant, slowly-shifting cluster. The only music layer
  // that reaches above 1 kHz, and it only appears at high intensity.
  register(
    defineSound(
      'mus_tension',
      ({ sampleRate: sr, rng }) => {
        const seconds = LOOP;
        const out = new Signal(seconds, sr);
        // A minor second and a tritone above the root: unresolved, uneasy.
        // Two octaves up rather than one, because the octave below this sits in
        // the 500 Hz-1 kHz band that gunfire and callouts need to own.
        const cluster = [D3 * 8, D3 * 8 * 1.0595, D3 * 8 * 1.4142, D3 * 12];
        for (let i = 0; i < cluster.length; i++) {
          const bowed = new Signal(seconds, sr);
          whiteNoise(bowed, rng);
          bandpass(bowed, cluster[i], 34);
          bandpass(bowed, cluster[i], 22);
          bowed.normalize(1);
          bowed.envelope(
            (t) =>
              0.35 +
              0.65 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / (seconds / (2 + i)) + i * 1.7)),
          );
          out.add(bowed, 0.3 / (1 + i * 0.4));
        }
        // A slow shimmer from ring modulation, like a bowed cymbal.
        ringMod(out, 0.7, 0.35);
        highpass(out, 1000);
        out.removeDc().normalize(0.85);
        return widen(out.seamlessLoop(BAR), 0.012, 0.6);
      },
      { ...STEM_MIX, gain: 0.24, loop: true },
    ),
  );

  // A mid pad that fills the gap between the drone and the tension layer.
  register(
    defineSound(
      'mus_pad',
      ({ sampleRate: sr, rng }) => {
        const seconds = LOOP;
        const out = new Signal(seconds, sr);
        for (const [i, f] of [D2, F2, A2, BB2].entries()) {
          const voice = new Signal(seconds, sr);
          superSaw(voice, f, 4, 12, 1);
          bandpass(voice, f * 2.2, 1.6);
          voice.envelope(
            (t) => 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / (seconds / (1 + i)) + i)),
          );
          voice.normalize(1);
          out.add(voice, 0.28 / (1 + i * 0.3));
        }
        lowpass(out, 900, 0.7);
        highpass(out, 70);
        out.removeDc().normalize(0.85);
        return widen(out.seamlessLoop(BAR), 0.01, 0.45);
      },
      { ...STEM_MIX, gain: 0.2, loop: true },
    ),
  );

  // The pulse: one short filtered note, scheduled per eighth. Two flavours so
  // the scheduler can alternate and imply a rhythm.
  for (const [id, hz, seconds] of [
    ['mus_pulse', D2, 0.34],
    ['mus_pulse_alt', A2, 0.28],
  ] as [string, number, number][]) {
    register(
      defineSound(
        id,
        ({ sampleRate: sr }) => {
          const out = new Signal(seconds, sr);
          tone(out, hz, 0.6, 'triangle', 0, adExp(0.004, seconds * 0.2));
          tone(out, hz * 0.5, 0.3, 'sine', 0, adExp(0.006, seconds * 0.25));
          fmTone(out, hz * 2, 1.5, 1.2, 0.16, adExp(0.002, seconds * 0.1), expDecay(0.02));
          lowpass(out, 700, 0.9);
          saturate(out, 1.6);
          out.removeDc().normalize(0.9);
          return out.toMono();
        },
        { ...STEM_MIX, gain: 0.34 },
      ),
    );
  }

  // Kick: a sine drop with a click. Nothing above 300 Hz.
  register(
    defineSound(
      'mus_kick',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.42, sr);
        sweepTone(out, 118, 41, 1, { curve: (t) => Math.pow(t, 0.35), env: adExp(0.001, 0.075) });
        const click = noiseBurst(0.02, sr, rng);
        lowpass(click, 2200, 0.8);
        click.envelope(adExp(0.0002, 0.0022));
        out.add(click, 0.22);
        saturate(out, 2.2);
        lowpass(out, 300, 0.8);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      { ...STEM_MIX, gain: 0.5 },
    ),
  );

  // Taiko: a big skin hit with a woody body. The main percussive statement.
  register(
    defineSound(
      'mus_taiko',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.9, sr);
        sweepTone(out, 84, 52, 0.8, { curve: (t) => Math.pow(t, 0.5), env: adExp(0.003, 0.14) });
        tone(out, 128, 0.28, 'sine', 0, adExp(0.004, 0.09));
        const skin = noiseBurst(0.3, sr, rng);
        bandpass(skin, 220, 1.1);
        skin.envelope(adExp(0.0016, 0.05));
        out.add(skin, 0.55);
        const stick = noiseBurst(0.03, sr, rng);
        bandpass(stick, 1800, 0.9);
        stick.envelope(adExp(0.0003, 0.003));
        out.add(stick, 0.2);
        saturate(out, 1.9);
        lowpass(out, 900, 0.8);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      { ...STEM_MIX, gain: 0.44 },
    ),
  );

  // Rim / metal tick for the off-beats. Very quiet, very short.
  register(
    defineSound(
      'mus_rim',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.18, sr);
        const hit = noiseBurst(0.06, sr, rng);
        bandpass(hit, 2600, 1.4);
        hit.envelope(adExp(0.0003, 0.006));
        out.add(hit, 1);
        fmTone(out, 1240, 2.5, 2.4, 0.2, adExp(0.0006, 0.012), expDecay(0.006));
        highpass(out, 700);
        out.removeDc().normalize(0.9);
        return out.toMono();
      },
      { ...STEM_MIX, gain: 0.2 },
    ),
  );

  // A sub drop for intensity transitions — when a killstreak lands or the
  // player is suddenly in serious trouble.
  register(
    defineSound(
      'mus_sub_drop',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.6, sr);
        sweepTone(out, 96, 24, 1, { curve: (t) => Math.pow(t, 0.3), env: adExp(0.012, 0.55) });
        const air = new Signal(2.4, sr);
        pinkNoise(air, rng);
        sweepFilter(air, 2600, 160, { q: 0.7, curve: (t) => Math.pow(t, 0.4) });
        air.envelope(swell(0.02, 0.4));
        air.normalize(1);
        out.add(air, 0.3);
        saturate(out, 1.8);
        lowpass(out, 380, 0.8);
        out.removeDc().normalize(0.95);
        return widen(out, 0.004, 0.3);
      },
      { ...STEM_MIX, gain: 0.5 },
    ),
  );

  // A reversed swell that leads into a transition.
  register(
    defineSound(
      'mus_riser',
      ({ sampleRate: sr, rng }) => {
        const seconds = BAR * 2;
        const out = new Signal(seconds, sr);
        whiteNoise(out, rng);
        sweepFilter(out, 200, 2600, { kind: 'bandpass', q: 1.4, curve: (t) => Math.pow(t, 2) });
        out.envelope((t) => Math.pow(t / seconds, 3));
        sweepTone(out, D2, D3 * 2, 0.2, {
          curve: (t) => Math.pow(t, 2.4),
          env: (t) => Math.pow(t / seconds, 2.6),
        });
        // A riser is meant to climb, not to end as hiss.
        lowpass(out, 6500, 0.7);
        out.removeDc().normalize(0.85);
        return widen(out, 0.006, 0.5);
      },
      { ...STEM_MIX, gain: 0.26 },
    ),
  );
}

export const MUSIC_LOOP_IDS: readonly string[] = ['mus_drone', 'mus_tension', 'mus_pad'];
export const MUSIC_HIT_IDS: readonly string[] = [
  'mus_pulse',
  'mus_pulse_alt',
  'mus_kick',
  'mus_taiko',
  'mus_rim',
  'mus_sub_drop',
  'mus_riser',
];
