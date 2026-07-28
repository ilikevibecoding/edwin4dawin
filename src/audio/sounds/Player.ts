/**
 * The player's own body: pain, death, breathing, heartbeat.
 *
 * These sit right at the listener so they are 2D and mixed low — the point is
 * information, not spectacle. Breathing intensity and the heartbeat are the
 * game's low-health warning; they have to be legible under gunfire without ever
 * becoming the loudest thing in a quiet moment.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  adExp,
  bandpass,
  brownNoise,
  compress,
  expDecay,
  formants,
  highpass,
  limit,
  lowpass,
  noiseBurst,
  peaking,
  saturate,
  softClip,
  sweepTone,
  swell,
  tone,
  whiteNoise,
  widen,
  type RenderedSound,
} from '../synth';
import { gearRustle } from './Footsteps';
import { DEFAULT_VOICE, breath, grunt, syllable } from './Vocal';
import { defineSound, type RenderArgs, type Registrar } from './Spec';

const PLAYER_MIX = {
  bus: 'sfx' as const,
  priority: 0.85,
  refDistance: 1,
  maxDistance: 12,
  rolloff: 2,
  send: 0.08,
  airScale: 1,
};

export function registerPlayerSounds(register: Registrar): void {
  // Pain, graded. The engine picks by how much health is left.
  const HURTS: [string, number][] = [
    ['player_hurt_light', 0.25],
    ['player_hurt', 0.55],
    ['player_hurt_heavy', 0.9],
  ];
  for (const [id, severity] of HURTS) {
    register(
      defineSound(
        id,
        ({ sampleRate: sr, rng }) => {
          const out = new Signal(0.5 + severity * 0.3, sr);
          out.add(grunt(sr, rng, severity), 1);
          if (severity > 0.5) {
            // The impact on the body itself, under the voice.
            const impact = new Signal(0.22, sr);
            sweepTone(impact, 96, 44, 1, { env: adExp(0.0012, 0.035) });
            saturate(impact, 1.8);
            out.add(impact, 0.4 * severity);
            out.add(gearRustle(sr, rng, 0.2, 0.35), 1);
          }
          softClip(out, 0.9);
          out.removeDc().normalize(0.95);
          return widen(out, 0.0006, 0.4);
        },
        { ...PLAYER_MIX, gain: 0.34 + 0.3 * severity, pitchJitter: 1.6, variants: 4 },
      ),
    );
  }

  register(
    defineSound(
      'player_death',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.4, sr);
        // A last forced exhale with the pitch collapsing.
        const cry = syllable(sr, rng, DEFAULT_VOICE, {
          vowel: 'ah',
          seconds: 0.7,
          pitchFrom: 1.35,
          pitchTo: 0.55,
          effort: 0.95,
          onset: 'plosive',
          attack: 0.008,
          release: 0.42,
        });
        out.add(cry, 1);
        // The rattle: a wet, unvoiced trailing breath.
        const rattle = breath(sr, rng, false, 0.85);
        rattle.envelope((t) => Math.exp(-t / 0.5));
        out.add(rattle, 0.55, 0.55);
        // Body and gear hitting the ground.
        const fall = new Signal(0.5, sr);
        sweepTone(fall, 86, 38, 1, { curve: (t) => Math.pow(t, 0.6), env: adExp(0.002, 0.07) });
        saturate(fall, 2);
        const boots = noiseBurst(0.12, sr, rng);
        lowpass(boots, 1400, 0.8);
        boots.envelope(adExp(0.0008, 0.018));
        fall.add(boots, 0.5);
        out.add(fall, 0.85, 0.72);
        out.add(gearRustle(sr, rng, 0.5, 0.6), 1, 0.7);
        // Hearing shutting down: everything sinks into a dull hum.
        const hum = new Signal(1.2, sr);
        tone(hum, 62, 1, 'sine', 0, swell(0.15, 0.45));
        tone(hum, 93, 0.4, 'sine', 1.1, swell(0.2, 0.4));
        lowpass(hum, 240);
        out.add(hum, 0.3, 1.1);
        softClip(out, 0.9);
        out.removeDc().normalize(0.96);
        return widen(out, 0.0011, 0.45);
      },
      { ...PLAYER_MIX, gain: 0.72, priority: 1, variants: 2, pitchJitter: 0.6 },
    ),
  );

  // Breathing, four intensity steps. The engine crossfades between them and
  // schedules the in/out cycle so the rate can track exertion.
  for (const inhale of [true, false]) {
    for (const [suffix, intensity] of [
      ['calm', 0.15],
      ['work', 0.5],
      ['hard', 0.85],
    ] as [string, number][]) {
      register(
        defineSound(
          `player_breath_${inhale ? 'in' : 'out'}_${suffix}`,
          ({ sampleRate: sr, rng }) =>
            widen(breath(sr, rng, inhale, intensity).normalize(0.9), 0.0008, 0.3),
          {
            ...PLAYER_MIX,
            gain: 0.16 + intensity * 0.3,
            priority: 0.35,
            variants: 3,
            pitchJitter: 1.4,
          },
        ),
      );
    }
  }

  // Heartbeat: two thumps, the second softer and slightly higher, exactly as a
  // chest-wall recording looks. Almost pure sub, so it works through any speaker.
  register(
    defineSound(
      'heartbeat',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.62, sr);
        const thumpAt = (at: number, hz: number, amp: number, tau: number): void => {
          const t = new Signal(0.3, sr);
          sweepTone(t, hz, hz * 0.62, 1, { curve: (x) => Math.pow(x, 0.7), env: adExp(0.006, tau) });
          // The valve click on top of the pressure pulse.
          const click = noiseBurst(0.03, sr, rng);
          lowpass(click, 220, 1.1);
          click.envelope(adExp(0.002, 0.008));
          t.add(click, 0.35);
          saturate(t, 1.5);
          out.add(t, amp, at);
        };
        thumpAt(0.0, 52, 1, 0.05);
        thumpAt(0.14, 61, 0.6, 0.038);
        lowpass(out, 320, 0.8);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      { ...PLAYER_MIX, gain: 0.5, priority: 0.4, variants: 2, pitchJitter: 0.8, send: 0 },
    ),
  );

  // Tinnitus after a flashbang or a close blast. A pair of near-pure tones plus
  // a hiss bed; the engine fades it out on a curve over the deafen duration.
  register(
    defineSound(
      'tinnitus',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(2.0, sr);
        tone(out, 4180, 0.5, 'sine');
        tone(out, 4212, 0.32, 'sine', 1.3);
        tone(out, 6340, 0.22, 'sine', 0.4);
        const hiss = new Signal(2.0, sr);
        whiteNoise(hiss, rng);
        bandpass(hiss, 5200, 0.9);
        hiss.normalize(1);
        out.add(hiss, 0.18);
        out.normalize(0.9);
        return out.seamlessLoop(0.3).toMono();
      },
      {
        bus: 'sfx',
        priority: 1,
        gain: 0.3,
        refDistance: 1,
        maxDistance: 6,
        variants: 1,
        loop: true,
        send: 0,
      },
    ),
  );

  // The concussion "whump" that accompanies a flashbang going off in your face.
  register(
    defineSound(
      'concussion',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(1.6, sr);
        sweepTone(out, 140, 26, 1, { curve: (t) => Math.pow(t, 0.4), env: adExp(0.004, 0.24) });
        const bed = new Signal(1.6, sr);
        brownNoise(bed, rng);
        lowpass(bed, 380, 0.8);
        bed.envelope(swell(0.02, 0.34));
        bed.normalize(1);
        out.add(bed, 0.7);
        saturate(out, 2.4);
        out.removeDc().normalize(0.96);
        return out.toMono();
      },
      { bus: 'sfx', priority: 1, gain: 0.85, refDistance: 2, maxDistance: 60, variants: 2, send: 0.4 },
    ),
  );

  // Effort noises for movement.
  register(
    defineSound(
      'mantle_grunt',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.6, sr);
        out.add(grunt(sr, rng, 0.35), 1);
        out.add(gearRustle(sr, rng, 0.4, 0.5), 1);
        // Hands and boots scraping over the ledge.
        const scrape = noiseBurst(0.3, sr, rng);
        bandpass(scrape, 2600, 1.2);
        lowpass(scrape, 6000, 0.7);
        scrape.envelope(swell(0.03, 0.11));
        out.add(scrape, 0.35, 0.08);
        out.removeDc().normalize(0.94);
        return widen(out, 0.0006, 0.35);
      },
      { ...PLAYER_MIX, gain: 0.4, priority: 0.4, variants: 3, pitchJitter: 1.6 },
    ),
  );

  register(
    defineSound(
      'jump_grunt',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.34, sr);
        // The exhale alone is unvoiced and reads as noise. Pushing off the
        // ground closes the cords for a moment, and that "hup" is the part that
        // identifies the sound as a person rather than as air.
        out.add(grunt(sr, rng, 0.18), 0.75);
        out.add(breath(sr, rng, false, 0.6), 0.5, 0.02);
        out.add(gearRustle(sr, rng, 0.24, 0.4), 0.8);
        out.removeDc().normalize(0.92);
        return out.toMono();
      },
      { ...PLAYER_MIX, gain: 0.26, priority: 0.3, variants: 3, pitchJitter: 2 },
    ),
  );

  // Respawn: gear settling and a magazine seating as the operator stands up.
  register(
    defineSound(
      'player_spawn',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.9, sr);
        out.add(gearRustle(sr, rng, 0.6, 1), 1);
        out.add(breath(sr, rng, true, 0.4), 0.4, 0.05);
        const strap = noiseBurst(0.1, sr, rng);
        bandpass(strap, 1800, 1.1);
        strap.envelope(adExp(0.004, 0.03));
        out.add(strap, 0.4, 0.3);
        // A loaded plate carrier dropping onto the shoulders. Twenty kilos of
        // gear settling is a low thump, and without it a respawn is all hiss.
        const carrier = new Signal(0.4, sr);
        sweepTone(carrier, 128, 62, 1, { curve: (t) => Math.pow(t, 0.6), env: adExp(0.006, 0.055) });
        const pouch = noiseBurst(0.12, sr, rng);
        lowpass(pouch, 900, 0.8);
        pouch.envelope(adExp(0.003, 0.025));
        carrier.add(pouch, 0.6);
        out.add(carrier, 0.7, 0.12);
        out.removeDc().normalize(0.92);
        return widen(out, 0.0009, 0.4);
      },
      { ...PLAYER_MIX, gain: 0.38, priority: 0.5, variants: 2 },
    ),
  );

  // A body hitting the ground, used for AI deaths as well as the player's.
  register(
    defineSound(
      'body_fall',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.7, sr);
        const mass = new Signal(0.4, sr);
        sweepTone(mass, 78, 34, 1, { curve: (t) => Math.pow(t, 0.6), env: adExp(0.003, 0.075) });
        saturate(mass, 2.2);
        out.add(mass, 1);
        const flesh = noiseBurst(0.16, sr, rng);
        lowpass(flesh, 900, 0.9);
        flesh.envelope(adExp(0.0016, 0.025));
        out.add(flesh, 0.65);
        out.add(gearRustle(sr, rng, 0.45, 0.7), 1, 0.01);
        // A limb landing a moment after the torso.
        const limb = new Signal(0.2, sr);
        sweepTone(limb, 110, 58, 1, { env: adExp(0.002, 0.03) });
        out.add(limb, 0.3, rng.range(0.09, 0.16));
        highpass(out, 34);
        softClip(out, 0.88);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.5,
        gain: 0.7,
        refDistance: 2.5,
        maxDistance: 48,
        rolloff: 1.3,
        pitchJitter: 1.4,
        variants: 3,
        send: 0.35,
      },
    ),
  );

  // Damage feedback for hitting an enemy, heard by whoever pulled the trigger.
  register(
    defineSound(
      'flesh_hit',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.24, sr);
        const slap = noiseBurst(0.09, sr, rng);
        lowpass(slap, 2100, 0.9);
        formants(slap, [
          { freq: 430, q: 1.3, gainDb: 9 },
          { freq: 1180, q: 1.7, gainDb: 5 },
        ]);
        slap.envelope(adExp(0.0006, 0.014));
        out.add(slap, 1);
        const thud = new Signal(0.18, sr);
        sweepTone(thud, 92, 50, 1, { env: adExp(0.0014, 0.026) });
        out.add(thud, 0.55);
        out.removeDc().normalize(0.95);
        return out.toMono();
      },
      {
        bus: 'sfx',
        priority: 0.6,
        gain: 0.55,
        refDistance: 3,
        maxDistance: 40,
        pitchJitter: 1.8,
        variants: 4,
        send: 0.25,
      },
    ),
  );

  // Low-health warning tone: a soft filtered pulse, deliberately unmusical so it
  // cannot be mistaken for the score.
  register(
    defineSound(
      'low_health',
      ({ sampleRate: sr }) => {
        const out = new Signal(0.9, sr);
        tone(out, 88, 0.7, 'sine', 0, swell(0.06, 0.22));
        tone(out, 131, 0.3, 'sine', 0.7, swell(0.09, 0.18));
        lowpass(out, 420, 0.8);
        peaking(out, 180, 1.2, 3);
        out.removeDc().normalize(0.9);
        return out.toMono();
      },
      { bus: 'ui', priority: 0.5, gain: 0.3, variants: 1, send: 0 },
    ),
  );
}
