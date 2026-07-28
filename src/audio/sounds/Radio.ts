/**
 * Voice: enemy barks and friendly radio callouts.
 *
 * Enemy barks are heard through the air, so they get the raw formant model plus
 * a distance-appropriate shout. Radio callouts are heard on a headset, so they
 * get squelch clicks, a 300 Hz - 3.4 kHz channel, hard compression and a little
 * bit reduction — the treatment carries at least as much information as the
 * "words" do, because it tells the player the message is coming from command
 * rather than from a body twenty metres away.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  adExp,
  bandpass,
  bitcrush,
  compress,
  highpass,
  limit,
  lowpass,
  noiseBurst,
  radioize,
  saturate,
  softClip,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { gearRustle } from './Footsteps';
import { DEFAULT_VOICE, type Contour, type VoicePrint, utterance } from './Vocal';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

interface BarkSpec {
  syllables: number;
  contour: Contour;
  effort: number;
  pace?: number;
}

/** Enemy combat chatter. Shape carries the meaning: urgency and length. */
const BARKS: Record<string, BarkSpec> = {
  ai_voice_contact: { syllables: 2, contour: 'shout', effort: 0.9, pace: 0.13 },
  ai_voice_spotted: { syllables: 3, contour: 'shout', effort: 0.85, pace: 0.13 },
  ai_voice_reloading: { syllables: 3, contour: 'rising', effort: 0.55 },
  ai_voice_grenade: { syllables: 2, contour: 'shout', effort: 1, pace: 0.11 },
  ai_voice_flanking: { syllables: 4, contour: 'flat', effort: 0.6 },
  ai_voice_covering: { syllables: 3, contour: 'falling', effort: 0.65 },
  ai_voice_moving: { syllables: 3, contour: 'rising', effort: 0.7 },
  ai_voice_lost: { syllables: 4, contour: 'falling', effort: 0.45, pace: 0.19 },
  ai_voice_pinned: { syllables: 3, contour: 'shout', effort: 0.95, pace: 0.12 },
  ai_voice_hit: { syllables: 1, contour: 'falling', effort: 1, pace: 0.22 },
  ai_voice_death: { syllables: 2, contour: 'fade', effort: 1, pace: 0.3 },
  ai_voice_order: { syllables: 4, contour: 'shout', effort: 0.8 },
};

/** Friendly radio traffic. Command is calm; the pilot is not. */
const CALLOUTS: Record<string, BarkSpec> = {
  radio_uav_online: { syllables: 5, contour: 'flat', effort: 0.35, pace: 0.15 },
  radio_uav_offline: { syllables: 4, contour: 'falling', effort: 0.3, pace: 0.16 },
  radio_airstrike_inbound: { syllables: 6, contour: 'rising', effort: 0.6, pace: 0.14 },
  radio_airstrike_confirm: { syllables: 4, contour: 'flat', effort: 0.45, pace: 0.15 },
  radio_airstrike_clear: { syllables: 4, contour: 'falling', effort: 0.4, pace: 0.16 },
  radio_chopper_inbound: { syllables: 5, contour: 'flat', effort: 0.5, pace: 0.15 },
  radio_chopper_lost: { syllables: 4, contour: 'falling', effort: 0.65, pace: 0.14 },
  radio_package_inbound: { syllables: 5, contour: 'flat', effort: 0.4, pace: 0.16 },
  radio_target_painted: { syllables: 4, contour: 'rising', effort: 0.5, pace: 0.14 },
  radio_cluster_away: { syllables: 3, contour: 'flat', effort: 0.55, pace: 0.14 },
  radio_enemy_uav: { syllables: 5, contour: 'rising', effort: 0.6, pace: 0.14 },
  radio_streak_ready: { syllables: 4, contour: 'flat', effort: 0.4, pace: 0.15 },
};

/** Radio squelch: the carrier opening and closing around the transmission. */
function squelch(sr: number, rng: Rng, open: boolean): Signal {
  const out = new Signal(0.05, sr);
  const burst = noiseBurst(0.03, sr, rng);
  bandpass(burst, open ? 2600 : 1800, 0.8);
  burst.envelope(adExp(0.0004, open ? 0.004 : 0.0075));
  out.add(burst, 1);
  const pop = noiseBurst(0.006, sr, rng);
  highpass(pop, 900);
  pop.envelope(adExp(0.0001, 0.0009));
  out.add(pop, 0.6);
  out.normalize(1);
  return out;
}

function renderBark(spec: BarkSpec, print: VoicePrint, args: RenderArgs): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const body = utterance(sr, rng, {
    syllables: spec.syllables,
    contour: spec.contour,
    effort: spec.effort,
    pace: spec.pace,
    // Per-variant voice so the squad does not sound like one man.
    print: {
      ...print,
      f0: print.f0 * rng.range(0.86, 1.18),
      tract: print.tract * rng.range(0.94, 1.07),
    },
  });
  // Shouting outdoors: the throat is driven hard and the very low end is lost.
  highpass(body, 180);
  if (spec.effort > 0.75) saturate(body, 1.6);
  compress(body, -20, 3, 4, 120, 4);
  softClip(body, 0.9);
  body.removeDc().normalize(0.94);
  return body.toMono();
}

function renderCallout(spec: BarkSpec, args: RenderArgs): RenderedSound {
  const { sampleRate: sr, rng } = args;
  const speech = utterance(sr, rng, {
    syllables: spec.syllables,
    contour: spec.contour,
    effort: spec.effort,
    pace: spec.pace,
    print: { f0: 104 * rng.range(0.94, 1.08), tract: 1.02, jitter: 0.02, breath: 0.28 },
  });

  const open = squelch(sr, rng, true);
  const close = squelch(sr, rng, false);
  const total = 0.06 + speech.duration + 0.09;
  const out = new Signal(total, sr);
  out.add(open, 0.5, 0.0);
  out.add(speech, 1, 0.055);
  out.add(close, 0.4, 0.055 + speech.duration + 0.01);

  // Carrier hiss for the length of the transmission.
  const carrier = new Signal(total, sr);
  whiteNoise(carrier, rng);
  bandpass(carrier, 2200, 0.6);
  carrier.envelope((t) => (t > 0.03 && t < total - 0.03 ? 1 : 0.1));
  carrier.normalize(1);
  out.add(carrier, 0.05);

  radioize(out, rng, 0.9);
  bitcrush(out, 9, 2);
  lowpass(out, 3600);
  limit(out, 0.98);
  out.removeDc().normalize(0.93);
  // Radio sits inside the headset: wide and non-directional.
  return widen(out, 0.0007, 0.2);
}

export function registerVoiceSounds(register: Registrar): void {
  for (const [id, spec] of Object.entries(BARKS)) {
    register(
      defineSound(id, (args) => renderBark(spec, DEFAULT_VOICE, args), {
        bus: 'sfx',
        priority: 0.6,
        // Barks are gameplay information — where the enemy is and what he is
        // doing — so they sit above ambience but well under gunfire.
        gain: id === 'ai_voice_death' || id === 'ai_voice_hit' ? 0.62 : 0.7,
        refDistance: 6,
        maxDistance: 65,
        rolloff: 1.2,
        pitchJitter: 1.2,
        variants: 4,
        send: 0.4,
        airScale: 1.1,
      }),
    );
  }

  for (const [id, spec] of Object.entries(CALLOUTS)) {
    register(
      defineSound(id, (args) => renderCallout(spec, args), {
        bus: 'ui',
        priority: 0.85,
        gain: 0.62,
        refDistance: 1,
        maxDistance: 4,
        variants: 2,
        pitchJitter: 0.4,
        send: 0,
        airScale: 0,
      }),
    );
  }

  // Bare squelch, for the killstreak module to bracket its own announcements.
  for (const open of [true, false]) {
    register(
      defineSound(
        open ? 'radio_squelch_open' : 'radio_squelch_close',
        ({ sampleRate: sr, rng }) => {
          const out = squelch(sr, rng, open);
          radioize(out, rng, 0.7);
          out.removeDc().normalize(0.9);
          return widen(out, 0.0005, 0.2);
        },
        { bus: 'ui', priority: 0.6, gain: 0.35, variants: 3, send: 0, airScale: 0 },
      ),
    );
  }

  // Gear noise made by an enemy body rather than by the player.
  register(
    defineSound(
      'ai_gear_shift',
      ({ sampleRate: sr, rng }) => {
        // Webbing and pouches, which is exactly what `gearRustle` builds. A bare
        // band-passed noise burst here read as a hiss with no fabric in it.
        const out = new Signal(0.3, sr);
        out.add(gearRustle(sr, rng, 0.26, 0.9), 1);
        // Something with mass shifting on the plate carrier.
        const shift = noiseBurst(0.14, sr, rng);
        lowpass(shift, 900, 0.8);
        shift.envelope(adExp(0.01, 0.045));
        out.add(shift, 0.4, 0.02);
        out.normalize(0.9);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.2,
        gain: 0.3,
        refDistance: 2,
        maxDistance: 26,
        rolloff: 1.5,
        pitchJitter: 2,
        variants: 4,
        send: 0.3,
        airScale: 1.4,
      },
    ),
  );
}

export const VOICE_SOUND_IDS: readonly string[] = [
  ...Object.keys(BARKS),
  ...Object.keys(CALLOUTS),
  'radio_squelch_open',
  'radio_squelch_close',
  'ai_gear_shift',
];
