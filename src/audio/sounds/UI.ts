/**
 * Interface sounds.
 *
 * The brief for these is restraint. A hitmarker fires several times a second
 * during a firefight, so it has to be a 25 ms tick that reads through gunfire
 * and then gets out of the way — no pitch, no cartoon "ding". Rewards get tone,
 * but tonal in the sense of a piece of equipment confirming something, built
 * from FM bells and clean intervals rather than from sampled fanfare.
 *
 * Everything here is stereo and goes to the `ui` bus, which sits outside the
 * deafen and occlusion chains so the interface stays legible after a flashbang.
 */
import type { Rng } from '../../core/MathUtils';
import {
  Signal,
  ad,
  adExp,
  bandpass,
  expDecay,
  fmTone,
  highpass,
  limit,
  lowpass,
  noiseBurst,
  ringMod,
  saturate,
  softClip,
  sweepTone,
  swell,
  tone,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

const UI_MIX = {
  bus: 'ui' as const,
  priority: 0.7,
  refDistance: 1,
  maxDistance: 4,
  rolloff: 1,
  send: 0,
  variants: 1,
  airScale: 0,
};

/** A short filtered noise tick — the raw material for every non-tonal cue. */
function tick(
  sr: number,
  rng: Rng,
  seconds: number,
  hz: number,
  q: number,
  tau: number,
): Signal {
  const out = noiseBurst(seconds, sr, rng);
  bandpass(out, hz, q);
  out.envelope(adExp(0.0002, tau));
  return out;
}

/** FM bell: a clean, slightly metallic tone with a natural decay. */
function bell(sr: number, hz: number, seconds: number, index: number, gain: number): Signal {
  const out = new Signal(seconds, sr);
  // A ratio near 3.5 gives the inharmonic shimmer of struck metal without
  // going full clang.
  fmTone(out, hz, 3.51, index, gain, adExp(0.004, seconds * 0.28), expDecay(seconds * 0.12));
  tone(out, hz, gain * 0.5, 'sine', 0, adExp(0.006, seconds * 0.34));
  return out;
}

function finish(out: Signal, spread = 0.0004): RenderedSound {
  highpass(out, 90);
  softClip(out, 0.9);
  limit(out, 0.995);
  out.removeDc().normalize(0.95);
  return widen(out, spread, 0.3);
}

export function registerUISounds(register: Registrar): void {
  const def = (
    id: string,
    build: (args: RenderArgs) => RenderedSound,
    gain: number,
    priority = 0.7,
  ): void => {
    register(defineSound(id, build, { ...UI_MIX, gain, priority }));
  };

  // Hitmarker: two very short bands, a hair apart, no pitch content at all.
  def(
    'ui_hitmarker',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.05, sr);
      out.add(tick(sr, rng, 0.03, 2450, 2.4, 0.0026), 1);
      out.add(tick(sr, rng, 0.02, 5200, 3.0, 0.0011), 0.4, 0.0016);
      return finish(out, 0.0002);
    },
    0.4,
    0.9,
  );

  // Headshot: the same tick with a bright metallic partial on top.
  def(
    'ui_hitmarker_headshot',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.09, sr);
      out.add(tick(sr, rng, 0.028, 2700, 2.6, 0.0024), 1);
      out.add(tick(sr, rng, 0.02, 6400, 3.2, 0.0012), 0.5, 0.0014);
      out.add(bell(sr, 3136, 0.07, 1.2, 0.28), 1, 0.002);
      return finish(out, 0.0002);
    },
    0.46,
    0.9,
  );

  // Kill: a two-note fall. Short enough to fire in a chain without smearing.
  def(
    'ui_hitmarker_kill',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.22, sr);
      out.add(tick(sr, rng, 0.03, 2300, 2.2, 0.0026), 0.9);
      out.add(bell(sr, 1174.7, 0.14, 1.6, 0.45), 1, 0.004);
      out.add(bell(sr, 783.99, 0.18, 1.3, 0.4), 1, 0.055);
      return finish(out, 0.0004);
    },
    0.52,
    0.9,
  );

  // Armour hit: duller, with a plate-like ring.
  def(
    'ui_hitmarker_armor',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.12, sr);
      out.add(tick(sr, rng, 0.03, 1450, 1.8, 0.0032), 1);
      const plate = new Signal(0.1, sr);
      fmTone(plate, 620, 2.02, 3.2, 0.5, adExp(0.001, 0.02), expDecay(0.01));
      out.add(plate, 0.6);
      return finish(out, 0.0003);
    },
    0.42,
    0.9,
  );

  // Killstreak earned: a rising perfect-fifth-plus-octave stack. Restrained,
  // with a soft attack so it never stabs.
  def(
    'ui_killstreak',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(1.5, sr);
      out.add(bell(sr, 587.33, 1.0, 2.4, 0.42), 1, 0.0);
      out.add(bell(sr, 880.0, 1.0, 2.0, 0.36), 1, 0.075);
      out.add(bell(sr, 1174.66, 1.1, 1.6, 0.3), 1, 0.15);
      // A low pad underneath gives it weight without volume.
      tone(out, 146.83, 0.22, 'sine', 0, swell(0.06, 0.42));
      tone(out, 220.0, 0.12, 'sine', 1.1, swell(0.09, 0.38));
      out.add(tick(sr, rng, 0.02, 6800, 3, 0.0009), 0.22);
      return finish(out, 0.0016);
    },
    0.5,
  );

  // Menu navigation: the smallest possible confirmation.
  def(
    'ui_nav',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.05, sr);
      tone(out, 1046.5, 0.5, 'sine', 0, ad(0.0012, 0.028, 2.2));
      out.add(tick(sr, rng, 0.014, 4200, 3, 0.0008), 0.3);
      return finish(out, 0.0002);
    },
    0.3,
    0.55,
  );

  def(
    'ui_select',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.16, sr);
      out.add(bell(sr, 880, 0.1, 1.4, 0.4), 1);
      out.add(bell(sr, 1318.5, 0.12, 1.2, 0.3), 1, 0.035);
      out.add(tick(sr, rng, 0.016, 3800, 2.6, 0.0009), 0.3);
      return finish(out, 0.0004);
    },
    0.36,
    0.6,
  );

  def(
    'ui_back',
    ({ sampleRate: sr }) => {
      const out = new Signal(0.16, sr);
      out.add(bell(sr, 880, 0.1, 1.2, 0.35), 1);
      out.add(bell(sr, 587.33, 0.13, 1.0, 0.3), 1, 0.035);
      return finish(out, 0.0004);
    },
    0.32,
    0.6,
  );

  // Countdown: a clean band-limited beep. The final one is a tone higher.
  for (const [id, hz, seconds, gain] of [
    ['ui_countdown', 880, 0.1, 0.4],
    ['ui_countdown_final', 1318.5, 0.22, 0.5],
  ] as [string, number, number, number][]) {
    def(
      id,
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(seconds + 0.05, sr);
        tone(out, hz, 0.6, 'sine', 0, ad(0.003, seconds, 1.4));
        tone(out, hz * 2, 0.12, 'sine', 0, ad(0.003, seconds * 0.5, 2));
        out.add(tick(sr, rng, 0.01, hz * 4, 3, 0.0006), 0.18);
        lowpass(out, 7000);
        return finish(out, 0.0003);
      },
      gain,
    );
  }

  def(
    'ui_notify',
    ({ sampleRate: sr }) => {
      const out = new Signal(0.3, sr);
      out.add(bell(sr, 659.26, 0.22, 1.1, 0.34), 1);
      out.add(bell(sr, 987.77, 0.2, 0.9, 0.22), 1, 0.05);
      return finish(out, 0.0006);
    },
    0.32,
    0.6,
  );

  // Reward / level up: warmer and longer than a killstreak, still sparse.
  def(
    'ui_reward',
    ({ sampleRate: sr }) => {
      const out = new Signal(1.8, sr);
      const notes = [392.0, 587.33, 783.99, 1174.66];
      for (let i = 0; i < notes.length; i++) {
        out.add(bell(sr, notes[i], 1.1 - i * 0.1, 2.2 - i * 0.3, 0.34 - i * 0.05), 1, i * 0.09);
      }
      tone(out, 98, 0.2, 'sine', 0, swell(0.08, 0.5));
      return finish(out, 0.0018);
    },
    0.46,
  );

  // Error / denied: a short low buzz. Ring modulation makes it read as a fault.
  def(
    'ui_error',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.24, sr);
      tone(out, 146.83, 0.6, 'triangle', 0, ad(0.002, 0.16, 1.6));
      ringMod(out, 62, 0.55);
      saturate(out, 2);
      lowpass(out, 2400);
      out.add(tick(sr, rng, 0.014, 1200, 2, 0.0012), 0.25);
      return finish(out, 0.0004);
    },
    0.34,
    0.65,
  );

  // Menu open / close: a filtered air movement plus a mechanical detent.
  for (const [id, up] of [
    ['ui_open', true],
    ['ui_close', false],
  ] as [string, boolean][]) {
    def(
      id,
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.3, sr);
        const air = noiseBurst(0.24, sr, rng);
        bandpass(air, 1400, 0.7);
        air.envelope((t) => Math.pow(Math.sin(Math.PI * Math.min(1, t / 0.24)), 1.4));
        air.normalize(1);
        out.add(air, 0.4);
        const sweep = new Signal(0.2, sr);
        sweepTone(sweep, up ? 320 : 900, up ? 900 : 320, 1, { env: ad(0.004, 0.14, 1.8) });
        lowpass(sweep, 3200);
        out.add(sweep, 0.28);
        out.add(tick(sr, rng, 0.016, 3200, 2.4, 0.001), 0.3, up ? 0.16 : 0.005);
        return finish(out, 0.0009);
      },
      0.34,
      0.6,
    );
  }

  // Objective / radar ping: a narrow sonar-like tone with a long clean tail.
  def(
    'ui_objective',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(0.7, sr);
      tone(out, 1567.98, 0.4, 'sine', 0, adExp(0.002, 0.09));
      tone(out, 2349.32, 0.14, 'sine', 0, adExp(0.002, 0.05));
      // A whisper of the room the ping came back from.
      const tail = new Signal(0.6, sr);
      whiteNoise(tail, rng);
      bandpass(tail, 1600, 4);
      tail.envelope(swell(0.02, 0.16));
      tail.normalize(1);
      out.add(tail, 0.12);
      return finish(out, 0.0008);
    },
    0.36,
    0.6,
  );

  // Match start / end stings. Low, wide, and short — a transition, not a fanfare.
  def(
    'ui_match_start',
    ({ sampleRate: sr, rng }) => {
      const out = new Signal(2.2, sr);
      tone(out, 73.42, 0.55, 'sine', 0, swell(0.04, 0.55));
      tone(out, 110.0, 0.3, 'sine', 0.8, swell(0.07, 0.5));
      tone(out, 146.83, 0.18, 'triangle', 1.6, swell(0.12, 0.42));
      const air = new Signal(1.6, sr);
      whiteNoise(air, rng);
      bandpass(air, 900, 0.6);
      air.envelope(swell(0.12, 0.35));
      air.normalize(1);
      out.add(air, 0.16);
      saturate(out, 1.6);
      return finish(out, 0.0022);
    },
    0.5,
  );

  def(
    'ui_match_end',
    ({ sampleRate: sr }) => {
      const out = new Signal(2.6, sr);
      tone(out, 98.0, 0.5, 'sine', 0, swell(0.05, 0.65));
      tone(out, 65.41, 0.4, 'sine', 1.2, swell(0.1, 0.8));
      out.add(bell(sr, 392, 1.4, 1.8, 0.2), 1, 0.1);
      return finish(out, 0.0022);
    },
    0.46,
  );

  // Alias the UI module may reach for under a shorter name.
  def('ui_tick', ({ sampleRate: sr, rng }) => finish(tick(sr, rng, 0.02, 3200, 2.6, 0.0011), 0.0002), 0.26, 0.5);
}

export const UI_SOUND_IDS: readonly string[] = [
  'ui_hitmarker',
  'ui_hitmarker_headshot',
  'ui_hitmarker_kill',
  'ui_hitmarker_armor',
  'ui_killstreak',
  'ui_nav',
  'ui_select',
  'ui_back',
  'ui_countdown',
  'ui_countdown_final',
  'ui_notify',
  'ui_reward',
  'ui_error',
  'ui_open',
  'ui_close',
  'ui_objective',
  'ui_match_start',
  'ui_match_end',
  'ui_tick',
];
