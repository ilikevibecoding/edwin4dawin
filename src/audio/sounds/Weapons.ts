/**
 * Gunshots.
 *
 * A convincing report is four things happening in the first 40 ms plus a tail
 * that belongs to the room rather than to the gun:
 *
 *  1. The mechanical action — a 2 ms metallic tick. Inaudible on its own, but
 *     without it the shot has no point of origin.
 *  2. The body — a noise burst through a resonant formant pair that differs per
 *     caliber (the bore and the expanding gas column), with a fast exponential
 *     decay and a downward filter sweep as the gas vents.
 *  3. The thump — a sine sweep from roughly 150 Hz to 45 Hz. This is the chest
 *     punch. A gunshot without it is a firecracker.
 *  4. The tail — a delayed, heavily low-passed reverberant crack. Authored as
 *     separate sounds so the engine can pick delay, level and character from
 *     the distance to the shooter and from whether the listener is indoors.
 *
 * Long-range fire is not a quiet close-up shot: the near layers are stripped by
 * air absorption in the voice chain, and the tail becomes the whole sound.
 */
import { Rng } from '../../core/MathUtils';
import {
  Signal,
  adExp,
  bandpass,
  brownNoise,
  contourFilter,
  crackleNoise,
  expDecay,
  formants,
  highpass,
  karplusStrong,
  limit,
  lowpass,
  lowpass24,
  lowshelf,
  noiseBurst,
  peaking,
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
import { defineSound, type RenderArgs, type Registrar, type SoundSpec } from './Spec';

interface GunProfile {
  /** Primary bore resonance, Hz. The single most identity-defining number. */
  formant: number;
  /** Secondary blast resonance. */
  formant2: number;
  /** Body decay time constant, seconds. */
  bodyTau: number;
  /** Chest-punch sweep, Hz. */
  thumpFrom: number;
  thumpTo: number;
  thumpTau: number;
  thumpGain: number;
  /** Mechanical action pitch, Hz. */
  actionHz: number;
  /** Total buffer length, seconds. */
  length: number;
  /** Saturation drive on the body; heavier calibers push harder. */
  drive: number;
  /** Relative loudness of this weapon against the rest of the mix. */
  loudness: number;
  /** Which authored tail weight this caliber gets. */
  tailWeight: number;
}

const PROFILES: Record<string, GunProfile> = {
  // 5.56 NATO: high, crisp, a hard crack with modest low end.
  rifle_556: {
    formant: 1180,
    formant2: 2850,
    bodyTau: 0.031,
    thumpFrom: 158,
    thumpTo: 52,
    thumpTau: 0.048,
    thumpGain: 0.62,
    actionHz: 3100,
    length: 0.3,
    drive: 2.6,
    loudness: 0.9,
    tailWeight: 1,
  },
  // 5.45 Soviet: flatter, woodier, a touch lower in the formant.
  rifle_545: {
    formant: 980,
    formant2: 2450,
    bodyTau: 0.034,
    thumpFrom: 146,
    thumpTo: 48,
    thumpTau: 0.052,
    thumpGain: 0.7,
    actionHz: 2700,
    length: 0.31,
    drive: 2.9,
    loudness: 0.93,
    tailWeight: 1.05,
  },
  // 9x19: light, snappy, very little chest.
  pistol_9: {
    formant: 1520,
    formant2: 3400,
    bodyTau: 0.022,
    thumpFrom: 132,
    thumpTo: 58,
    thumpTau: 0.03,
    thumpGain: 0.4,
    actionHz: 3600,
    length: 0.24,
    drive: 2.0,
    loudness: 0.7,
    tailWeight: 0.72,
  },
  // .45 ACP: subsonic, fat, low formant, more thud than crack.
  pistol_45: {
    formant: 880,
    formant2: 2100,
    bodyTau: 0.028,
    thumpFrom: 122,
    thumpTo: 46,
    thumpTau: 0.045,
    thumpGain: 0.62,
    actionHz: 3000,
    length: 0.26,
    drive: 2.2,
    loudness: 0.76,
    tailWeight: 0.8,
  },
  // .44 Magnum: a small cannon. Enormous crack, hard thump.
  magnum_44: {
    formant: 940,
    formant2: 2300,
    bodyTau: 0.042,
    thumpFrom: 138,
    thumpTo: 40,
    thumpTau: 0.07,
    thumpGain: 0.95,
    actionHz: 2400,
    length: 0.36,
    drive: 3.6,
    loudness: 1.05,
    tailWeight: 1.25,
  },
  // 7.62 NATO: heavy, authoritative, longer body.
  rifle_762: {
    formant: 820,
    formant2: 2050,
    bodyTau: 0.044,
    thumpFrom: 142,
    thumpTo: 42,
    thumpTau: 0.068,
    thumpGain: 0.88,
    actionHz: 2500,
    length: 0.36,
    drive: 3.2,
    loudness: 1.0,
    tailWeight: 1.2,
  },
  // .338 Lapua: the loudest thing a rifleman carries. Deep and slow.
  magnum_338: {
    formant: 690,
    formant2: 1760,
    bodyTau: 0.056,
    thumpFrom: 126,
    thumpTo: 34,
    thumpTau: 0.092,
    thumpGain: 1.05,
    actionHz: 2100,
    length: 0.44,
    drive: 4.0,
    loudness: 1.15,
    tailWeight: 1.5,
  },
  // 12 gauge: broad and unfocused, the least tonal report of the set.
  shotgun_12: {
    formant: 520,
    formant2: 1480,
    bodyTau: 0.05,
    thumpFrom: 112,
    thumpTo: 33,
    thumpTau: 0.082,
    thumpGain: 1.0,
    actionHz: 1900,
    length: 0.4,
    drive: 3.4,
    loudness: 1.08,
    tailWeight: 1.35,
  },
  // Recoilless launcher: mostly a pressure event and a rocket motor.
  launcher: {
    formant: 340,
    formant2: 1050,
    bodyTau: 0.09,
    thumpFrom: 96,
    thumpTo: 27,
    thumpTau: 0.16,
    thumpGain: 1.2,
    actionHz: 1400,
    length: 0.72,
    drive: 3.0,
    loudness: 1.2,
    tailWeight: 1.6,
  },
  // Fallback for anything unrecognised; a generic mid-weight rifle.
  generic: {
    formant: 1050,
    formant2: 2500,
    bodyTau: 0.034,
    thumpFrom: 148,
    thumpTo: 48,
    thumpTau: 0.055,
    thumpGain: 0.7,
    actionHz: 2800,
    length: 0.32,
    drive: 2.8,
    loudness: 0.92,
    tailWeight: 1,
  },
};

/** Caliber string, as authored in `WeaponDefs`, to profile key. */
const CALIBER_TO_PROFILE: Record<string, string> = {
  '5.56x45': 'rifle_556',
  '5.45x39': 'rifle_545',
  '9x19': 'pistol_9',
  '.45 ACP': 'pistol_45',
  '.44 MAG': 'magnum_44',
  '7.62x51': 'rifle_762',
  '.338 LM': 'magnum_338',
  '12 gauge': 'shotgun_12',
  '85 mm HEAT': 'launcher',
};

/**
 * Weapon id to profile. The weapon module hands `gunshot()` a weapon id, and
 * the AI hands it `weapon_fire_<id>`; both resolve through here. Sharing a
 * profile across weapons of the same caliber is deliberate — it is also what
 * real recordings do — and it keeps the buffer bank small.
 */
const WEAPON_TO_PROFILE: Record<string, string> = {
  ar_mk4: 'rifle_556',
  ar_aug: 'rifle_556',
  ar_famas: 'rifle_556',
  ar_ak74: 'rifle_545',
  smg_mp5: 'pistol_9',
  smg_vector: 'pistol_45',
  lmg_m249: 'rifle_556',
  sniper_bolt: 'magnum_338',
  sniper_dmr: 'rifle_762',
  shotgun_pump: 'shotgun_12',
  pistol_m19: 'pistol_9',
  pistol_revolver: 'magnum_44',
  launcher_rpg: 'launcher',
};

export const GUN_PROFILE_KEYS: readonly string[] = Object.keys(PROFILES);

/** Resolve any weapon-ish identifier to a profile key. */
export function profileKeyFor(weaponId: string): string {
  const id = weaponId.startsWith('weapon_fire_') ? weaponId.slice(12) : weaponId;
  const direct = WEAPON_TO_PROFILE[id];
  if (direct) return direct;
  if (PROFILES[id]) return id;
  const byCaliber = CALIBER_TO_PROFILE[id];
  if (byCaliber) return byCaliber;
  // Heuristics for ids this module has never seen, e.g. a new weapon added
  // after the audio bank was authored.
  if (id.startsWith('sniper')) return 'magnum_338';
  if (id.startsWith('shotgun')) return 'shotgun_12';
  if (id.startsWith('launcher')) return 'launcher';
  if (id.startsWith('pistol')) return 'pistol_9';
  if (id.startsWith('smg')) return 'pistol_9';
  if (id.startsWith('lmg')) return 'rifle_762';
  return 'generic';
}

export const gunProfile = (key: string): GunProfile => PROFILES[key] ?? PROFILES.generic;

/** `gun_<profile>_<local|remote>[_sup]`. */
export function gunshotSoundId(profileKey: string, local: boolean, suppressed: boolean): string {
  return `gun_${profileKey}_${local ? 'local' : 'remote'}${suppressed ? '_sup' : ''}`;
}

export type TailKind =
  | 'indoor'
  | 'outdoor'
  | 'distant'
  | 'suppressed_indoor'
  | 'suppressed_outdoor';

export const tailSoundId = (kind: TailKind): string => `gun_tail_${kind}`;

// ---------------------------------------------------------------------------
// Report synthesis
// ---------------------------------------------------------------------------

function mechanicalLayer(p: GunProfile, sr: number, rng: Rng, amount: number): Signal {
  const out = new Signal(0.05, sr);
  // Firing pin / bolt face: a hard metal tick with a very short ring.
  const tick = karplusStrong(0.035, sr, p.actionHz, rng, {
    damping: 0.86,
    brightness: 0.32,
    dispersion: 0.35,
    excitation: 'impulse',
  });
  tick.envelope(expDecay(0.0055));
  out.add(tick, 0.7 * amount);

  // Gas/spring rattle behind it.
  const rattle = noiseBurst(0.02, sr, rng);
  highpass(rattle, 1800);
  rattle.envelope(adExp(0.0002, 0.0035));
  out.add(rattle, 0.5 * amount);

  // Sear release: a second, higher tick a fraction of a millisecond earlier.
  const sear = karplusStrong(0.012, sr, p.actionHz * 1.9, rng, {
    damping: 0.7,
    brightness: 0.2,
    dispersion: 0.5,
    excitation: 'impulse',
  });
  sear.envelope(expDecay(0.0016));
  out.add(sear, 0.3 * amount);
  return out;
}

function bodyLayer(p: GunProfile, sr: number, rng: Rng, suppressed: boolean): Signal {
  const len = p.length;
  const body = noiseBurst(len, sr, rng);

  if (suppressed) {
    // A suppressor turns the report into a broad, dull "pfft": the muzzle blast
    // is expanded and cooled inside the can, which kills the crack entirely.
    formants(body, [
      { freq: p.formant * 0.62, q: 1.1, gainDb: 9 },
      { freq: p.formant * 1.5, q: 0.8, gainDb: 4 },
      { freq: 320, q: 0.9, gainDb: 5 },
    ]);
    sweepFilter(body, 3600, 900, { q: 0.8, curve: (t) => Math.pow(t, 0.35) });
    body.envelope((t) => 0.55 * adExp(0.0016, 0.052)(t) + 0.45 * adExp(0.006, 0.022)(t));
    saturate(body, 1.5);
    return body;
  }

  formants(body, [
    { freq: p.formant, q: 1.7, gainDb: 13 },
    { freq: p.formant2, q: 2.6, gainDb: 8 },
    { freq: p.formant * 0.44, q: 1.2, gainDb: 7 },
    // A shallow notch above the main formant stops the burst reading as hiss.
    { freq: p.formant * 5.2, q: 0.9, gainDb: -5 },
  ]);
  // Gas venting: the spectrum collapses downward over the first few tens of ms.
  sweepFilter(body, 11000, 2100, { q: 0.75, curve: (t) => Math.pow(t, 0.28) });
  // Two decay rates: the initial blast and the slower muzzle flow behind it.
  body.envelope(
    (t) => 0.72 * adExp(0.00035, p.bodyTau)(t) + 0.28 * adExp(0.0035, p.bodyTau * 3.4)(t),
  );
  saturate(body, p.drive);
  return body;
}

function crackLayer(p: GunProfile, sr: number, rng: Rng): Signal {
  // The supersonic snap. Extremely short, extremely bright, and the reason a
  // real rifle is painful at the muzzle.
  const crack = noiseBurst(0.008, sr, rng);
  bandpass(crack, Math.min(6200, p.formant * 3.4), 0.9);
  crack.envelope(adExp(0.00008, 0.0013));
  saturate(crack, 3);
  return crack;
}

function thumpLayer(p: GunProfile, sr: number, gainScale: number): Signal {
  const len = Math.min(p.length, p.thumpTau * 7 + 0.02);
  const thump = new Signal(len, sr);
  sweepTone(thump, p.thumpFrom, p.thumpTo, 1, {
    curve: (t) => Math.pow(t, 0.55),
    env: adExp(0.0009, p.thumpTau),
  });
  // A second, lower sweep an octave down fills in the sub without muddying the
  // fundamental sweep.
  sweepTone(thump, p.thumpFrom * 0.52, p.thumpTo * 0.66, 0.5, {
    curve: (t) => Math.pow(t, 0.7),
    env: adExp(0.0022, p.thumpTau * 1.5),
  });
  saturate(thump, 1.8);
  return thump.gain(p.thumpGain * gainScale);
}

function renderReport(
  profileKey: string,
  local: boolean,
  suppressed: boolean,
  args: RenderArgs,
): RenderedSound {
  const p = gunProfile(profileKey);
  const { sampleRate: sr, rng } = args;
  // Per-variant timbre drift, so sustained automatic fire never repeats.
  const drift = rng.range(0.96, 1.045);
  const shaped: GunProfile = {
    ...p,
    formant: p.formant * drift,
    formant2: p.formant2 * rng.range(0.95, 1.06),
    bodyTau: p.bodyTau * rng.range(0.93, 1.08),
  };

  const len = suppressed ? Math.max(0.2, p.length * 0.72) : p.length;
  const out = new Signal(len + 0.02, sr);

  out.add(mechanicalLayer(shaped, sr, rng, suppressed ? 1.35 : local ? 0.34 : 0.16));
  out.add(bodyLayer(shaped, sr, rng, suppressed), suppressed ? 0.5 : 1);
  if (!suppressed) out.add(crackLayer(shaped, sr, rng), local ? 0.62 : 0.78);
  out.add(thumpLayer(shaped, sr, suppressed ? 0.34 : 1), local ? 1.15 : 0.85);

  if (suppressed) {
    // Gas hiss bleeding past the baffles, and the bolt cycling unmasked.
    const hiss = noiseBurst(0.14, sr, rng);
    bandpass(hiss, 2400, 0.7);
    hiss.envelope(adExp(0.004, 0.035));
    out.add(hiss, 0.24);
  }

  if (local) {
    // The shooter is inside the pressure wave: more sub, and a low shelf that
    // makes the weapon feel like it is in your hands rather than across the map.
    const sub = new Signal(0.2, sr);
    sweepTone(sub, p.thumpFrom * 0.62, 38, 1, {
      curve: (t) => Math.pow(t, 0.5),
      env: adExp(0.0016, p.thumpTau * 1.35),
    });
    saturate(sub, 1.4);
    out.add(sub, 0.42);
    lowshelf(out, 190, 4.5);
    peaking(out, 4200, 1.2, -2.5);
  } else {
    // Anything heard across the map has already lost its very top end.
    peaking(out, 9000, 0.8, -4);
  }

  highpass(out, 34);
  softClip(out, 0.78);
  limit(out, 0.995);
  out.removeDc().normalize(0.97);
  // Local shots are stereo so the muzzle blast has width in the viewmodel; a
  // remote report is mono and gets its position from the panner.
  return local ? widen(out, 0.0004, 0.55) : out.toMono();
}

// ---------------------------------------------------------------------------
// Tails
// ---------------------------------------------------------------------------

interface TailSpec {
  seconds: number;
  /** Reflection density in taps per second. */
  density: number;
  cutoffFrom: number;
  cutoffTo: number;
  rise: number;
  tau: number;
  /** Discrete slapback taps off distant facades. */
  slaps: readonly [number, number][];
  rumble: number;
}

const TAILS: Record<TailKind, TailSpec> = {
  // Reflections off the walls of a room: early, dense, still fairly bright.
  indoor: {
    seconds: 0.62,
    density: 900,
    cutoffFrom: 2900,
    cutoffTo: 700,
    rise: 0.006,
    tau: 0.115,
    slaps: [
      [0.008, 0.65],
      [0.019, 0.42],
      [0.031, 0.3],
    ],
    rumble: 0.18,
  },
  // Street: a handful of distinct slaps off the facades, then very little.
  outdoor: {
    seconds: 1.05,
    density: 170,
    cutoffFrom: 1700,
    cutoffTo: 380,
    rise: 0.02,
    tau: 0.2,
    slaps: [
      [0.046, 0.55],
      [0.081, 0.4],
      [0.128, 0.29],
      [0.196, 0.2],
      [0.284, 0.12],
      [0.402, 0.07],
    ],
    rumble: 0.3,
  },
  // The thunder of gunfire two hundred metres away: all tail, no report.
  distant: {
    seconds: 1.85,
    density: 90,
    cutoffFrom: 620,
    cutoffTo: 170,
    rise: 0.055,
    tau: 0.46,
    slaps: [
      [0.09, 0.4],
      [0.21, 0.3],
      [0.38, 0.22],
      [0.62, 0.14],
      [0.95, 0.08],
    ],
    rumble: 0.75,
  },
  // A suppressed weapon still excites the room, just with far less energy and
  // nothing above a couple of kilohertz.
  suppressed_indoor: {
    seconds: 0.5,
    density: 700,
    cutoffFrom: 1400,
    cutoffTo: 420,
    rise: 0.012,
    tau: 0.135,
    slaps: [
      [0.009, 0.4],
      [0.022, 0.26],
    ],
    rumble: 0.14,
  },
  suppressed_outdoor: {
    seconds: 0.72,
    density: 120,
    cutoffFrom: 900,
    cutoffTo: 260,
    rise: 0.03,
    tau: 0.2,
    slaps: [
      [0.05, 0.32],
      [0.094, 0.2],
      [0.17, 0.11],
    ],
    rumble: 0.2,
  },
};

function renderTail(kind: TailKind, args: RenderArgs): RenderedSound {
  const spec = TAILS[kind];
  const { sampleRate: sr, rng } = args;
  const out = new Signal(spec.seconds, sr);

  // The cutoff contour, in Hz against time. Every layer is filtered by it,
  // because every layer is the same report having bounced off something.
  const cutoffAt = (t: number): number => {
    const x = Math.min(1, t / spec.seconds);
    return spec.cutoffFrom * Math.pow(spec.cutoffTo / spec.cutoffFrom, Math.pow(x, 0.6));
  };

  // Diffuse field: velvet noise is the cheapest way to get a reflection field
  // that sounds like discrete arrivals rather than like hiss.
  const diffuse = new Signal(spec.seconds, sr);
  velvetNoise(diffuse, rng, spec.density, 1);
  whiteNoise(diffuse, rng, 0.22);
  // Two cascaded stages, not one. Velvet noise is spectrally flat, so a single
  // 12 dB/octave pole still passes an audible amount of 8 kHz and the field
  // reads as hiss rather than as a room.
  contourFilter(diffuse, cutoffAt, { q: 0.75 });
  contourFilter(diffuse, cutoffAt, { q: 0.6 });
  diffuse.envelope(swell(spec.rise, spec.tau));
  out.add(diffuse, 0.85);

  for (const [delay, gain] of spec.slaps) {
    // A slapback off a facade is the report itself arriving late, so it is a
    // dull, smeared copy — not a click. The bandwidth has to be taken off it
    // deliberately or three loud broadband taps set the whole tail's timbre.
    const slap = noiseBurst(0.06, sr, rng);
    const hz = spec.cutoffFrom * rng.range(0.5, 0.85);
    lowpass24(slap, hz, 0.7);
    highpass(slap, 150);
    slap.envelope(adExp(0.004, 0.014));
    slap.normalize(1);
    out.add(slap, gain * 0.55, delay * rng.range(0.94, 1.07));
  }

  if (spec.rumble > 0) {
    const rumble = new Signal(spec.seconds, sr);
    brownNoise(rumble, rng);
    lowpass(rumble, 130, 0.8);
    rumble.envelope(swell(spec.rise * 2.5, spec.tau * 1.7));
    rumble.normalize(1);
    out.add(rumble, spec.rumble);
  }

  highpass(out, 55);
  // Nothing in a tail is brighter than the brightest reflection in it.
  lowpass24(out, spec.cutoffFrom * 0.9, 0.7);
  out.removeDc().normalize(0.9);
  // A tail is a diffuse field, so it gets width; the panner still places it.
  return widen(out, 0.0021, 0.4);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const REPORT_MIX = {
  bus: 'weapons' as const,
  priority: 1,
  refDistance: 9,
  maxDistance: 420,
  rolloff: 0.95,
  pitchJitter: 0.35,
  variants: 4,
  send: 0.5,
  airScale: 1,
  propagate: true,
};

/** Every gunshot and tail id this module can produce. */
export function weaponSoundSpecs(): SoundSpec[] {
  const specs: SoundSpec[] = [];
  for (const key of GUN_PROFILE_KEYS) {
    const p = gunProfile(key);
    for (const local of [false, true]) {
      for (const suppressed of [false, true]) {
        specs.push(
          defineSound(
            gunshotSoundId(key, local, suppressed),
            (args) => renderReport(key, local, suppressed, args),
            {
              ...REPORT_MIX,
              gain: (suppressed ? 0.3 : 1) * p.loudness * (local ? 1 : 0.92),
              // The shooter's own weapon is not spatialised through a panner, so
              // the distance model is irrelevant for it.
              refDistance: local ? 1 : REPORT_MIX.refDistance,
              send: local ? 0.28 : 0.5,
            },
          ),
        );
      }
    }
  }
  for (const kind of Object.keys(TAILS) as TailKind[]) {
    specs.push(
      defineSound(tailSoundId(kind), (args) => renderTail(kind, args), {
        bus: 'weapons',
        priority: 0.55,
        gain: 0.75,
        refDistance: 14,
        maxDistance: 460,
        rolloff: 0.7,
        pitchJitter: 0.5,
        variants: 3,
        // The tail *is* the reverb; sending it to the convolver as well only
        // smears it.
        send: 0.1,
        airScale: 0.35,
        propagate: true,
      }),
    );
  }
  return specs;
}

export function registerWeaponSounds(register: Registrar): void {
  for (const spec of weaponSoundSpecs()) register(spec);
}

/**
 * Debris and dust settling after a heavy report indoors — used by the gunshot
 * layering for large calibers fired in an enclosed space.
 */
export function registerReportExtras(register: Registrar): void {
  register(
    defineSound(
      'gun_dust_settle',
      ({ sampleRate: sr, rng }) => {
        const out = new Signal(0.9, sr);
        crackleNoise(out, rng, 260, 0.6, 3);
        bandpass(out, 2800, 0.8);
        out.envelope(swell(0.05, 0.28));
        out.normalize(0.8);
        return out.toMono();
      },
      { bus: 'sfx', priority: 0.15, gain: 0.28, refDistance: 4, maxDistance: 30, variants: 2 },
    ),
  );
}
