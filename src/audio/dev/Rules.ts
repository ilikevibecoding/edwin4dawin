/**
 * What each family of sounds must objectively be.
 *
 * These are the assertions that make an audio test worth running. "It sounds
 * fine" is not checkable; "a gunshot must put at least 8% of its energy below
 * 250 Hz, peak within 3 dB of full scale, and reach that peak within 15 ms" is.
 * Every threshold here is deliberately loose enough to allow design changes and
 * tight enough to catch a layer that silently stopped contributing — which is
 * the realistic failure mode when a filter cutoff or an envelope constant gets
 * edited.
 */
import type { SoundSpec } from '../sounds';
import { bandEnergy, type Measurement } from './Analysis';

export interface Rule {
  /** Human name used in failure messages. */
  name: string;
  match: RegExp;
  /** Ids matching this are exempt. */
  except?: RegExp;
  peak?: [min: number, max: number];
  duration?: [min: number, max: number];
  centroid?: [min: number, max: number];
  /** Minimum fraction of spectral energy below `hz`. */
  lowEnergy?: [hz: number, minFraction: number];
  /** Maximum fraction of spectral energy above `hz`. */
  highEnergyMax?: [hz: number, maxFraction: number];
  /** Seconds from start to peak. */
  attackMax?: number;
  /** Peak-over-RMS in dB. Transients are high, drones are low. */
  crestDb?: [min: number, max: number];
  /** Treated as a warning rather than a failure. */
  soft?: boolean;
}

export const CATEGORY_RULES: readonly Rule[] = [
  // Everything. A buffer outside these bounds is broken regardless of design.
  {
    name: 'any sound',
    match: /.*/,
    peak: [0.2, 1.0],
    duration: [0.004, 20],
  },

  // ---- Weapons -------------------------------------------------------------
  // The chest punch is the layer most easily lost, and its absence is the
  // difference between a rifle and a firecracker.
  {
    name: 'gunshot report',
    match: /^gun_(?!tail_|dust_)/,
    except: /_sup$/,
    peak: [0.85, 1.0],
    duration: [0.15, 0.8],
    lowEnergy: [250, 0.06],
    centroid: [300, 5000],
    attackMax: 0.02,
    crestDb: [6, 40],
  },
  {
    name: 'suppressed report',
    match: /^gun_.*_sup$/,
    peak: [0.7, 1.0],
    duration: [0.12, 0.6],
    // A suppressor moves the whole event down and takes the crack off the top.
    centroid: [200, 3200],
  },
  {
    name: 'gunshot tail',
    match: /^gun_tail_/,
    duration: [0.4, 2.5],
    // A tail is the room answering, so it is dull by construction. If it is
    // bright the low-pass contour stopped working.
    centroid: [80, 2200],
    // A diffuse field has a much lower crest factor than the report it follows.
    crestDb: [4, 26],
  },
  {
    name: 'distant tail',
    match: /^gun_tail_distant$/,
    highEnergyMax: [2000, 0.12],
    duration: [1.2, 3],
  },

  // ---- Explosions ----------------------------------------------------------
  {
    name: 'explosion',
    match: /^explosion_(grenade|rocket|airstrike|vehicle|barrel)$/,
    peak: [0.85, 1.0],
    duration: [1.0, 6],
    // Sub-bass is the whole point. Without it this is a noise burst.
    lowEnergy: [120, 0.1],
    centroid: [60, 2600],
    attackMax: 0.06,
  },
  {
    name: 'distant explosion',
    match: /^explosion_distant$/,
    lowEnergy: [250, 0.55],
    centroid: [20, 600],
  },

  // ---- Weapon mechanics ----------------------------------------------------
  {
    name: 'weapon mechanic',
    match: /^weapon_/,
    duration: [0.02, 1.6],
    // These are modal: a latch, a spring, a stamped pressing. A centroid up at
    // the top of the band means the modal body was lost and only the strike
    // transient survived, which is the difference between a rifle part moving
    // and a generic tick.
    centroid: [150, 9000],
  },
  {
    name: 'weapon detent',
    // Single-event mechanics only. A bolt cycle, a pump or a rocket load is a
    // sequence whose loudest moment is the part seating at the end, so a late
    // onset is correct for those and this assertion would be measuring the
    // design rather than checking it.
    match: /^weapon_(dry_fire|safety|selector|mag_tap|trigger|sear)/,
    attackMax: 0.03,
  },
  {
    name: 'shell casing',
    match: /^shell_bounce/,
    duration: [0.2, 1.2],
    centroid: [800, 9000],
    // Brass rings. A low crest factor here means the modal decay collapsed into
    // a single click.
    crestDb: [8, 34],
  },

  // ---- Impacts -------------------------------------------------------------
  {
    name: 'impact',
    match: /^impact_/,
    duration: [0.05, 2.0],
    attackMax: 0.05,
    crestDb: [5, 40],
  },
  {
    name: 'hard-surface impact',
    match: /^impact_(concrete|metal|brick|tile|glass)$/,
    // Hard surfaces are bright. A dull concrete impact means the transient
    // layer dropped out.
    centroid: [700, 12000],
  },
  {
    name: 'soft-surface impact',
    match: /^impact_(sand|dirt|flesh|fabric|grass|foliage|rubber)$/,
    centroid: [80, 6000],
  },

  // ---- Movement ------------------------------------------------------------
  {
    name: 'footstep',
    match: /^footstep_/,
    duration: [0.04, 1.0],
    attackMax: 0.06,
    peak: [0.4, 1.0],
  },

  // ---- Bullets -------------------------------------------------------------
  {
    name: 'bullet flight',
    match: /^bullet_(whizz|snap)/,
    duration: [0.01, 0.6],
    centroid: [400, 12000],
  },
  {
    name: 'ricochet',
    match: /^bullet_ricochet$/,
    duration: [0.15, 1.2],
    centroid: [500, 8000],
  },

  // ---- Interface -----------------------------------------------------------
  {
    name: 'ui',
    match: /^ui_/,
    duration: [0.01, 3.5],
    // An in-game cue has to be legible over gunfire, which means it lives above
    // the mud and below the hiss. The exceptions are heard between firefights
    // rather than during them and are deliberately low and heavy.
    except: /^ui_(error|match_end|match_start|defeat)$/,
    centroid: [500, 12000],
  },

  // ---- Player --------------------------------------------------------------
  {
    name: 'heartbeat',
    match: /^heartbeat$/,
    // Almost pure sub: it has to work through a laptop speaker as a pulse and
    // through headphones as a thump.
    centroid: [20, 260],
    lowEnergy: [120, 0.6],
  },
  {
    name: 'voice',
    match: /^(player_hurt|player_death|ai_voice_)/,
    // Formant-filtered speech energy, not noise.
    centroid: [120, 3200],
    duration: [0.1, 4],
  },
  {
    name: 'effort',
    // A vocal layer under gear and scraping, so it is legitimately brighter
    // than speech — but the body has to survive, or it is only a hiss.
    match: /^(mantle_grunt|jump_grunt|player_spawn)$/,
    centroid: [400, 5000],
    lowEnergy: [1000, 0.2],
    duration: [0.1, 2],
  },
  {
    name: 'gear',
    // Nylon, webbing and pouches. Bright, but fabric is not white noise: a
    // centroid above this band means the rustle lost its band limiting.
    match: /^(gear_rustle|ai_gear_shift)$/,
    centroid: [500, 6500],
    duration: [0.05, 1],
  },
  {
    name: 'breathing',
    match: /^player_breath_/,
    duration: [0.1, 3],
    // Breath is unvoiced: broadband, low crest, no strong fundamental.
    crestDb: [3, 22],
  },
  {
    name: 'tinnitus',
    match: /^tinnitus$/,
    // A near-pure high tone. If the centroid falls the oscillators are wrong.
    centroid: [2500, 9000],
  },

  // ---- Beds and score ------------------------------------------------------
  {
    name: 'ambience bed',
    match: /^amb_.*(wind|rumble|tone|handler|exterior|drone)$/,
    duration: [3, 20],
    // Beds are sustained, so a high crest factor means something is spiking.
    crestDb: [2, 20],
  },
  {
    name: 'music stem',
    match: /^mus_/,
    // The score lives under the gunfire, deliberately. Transient accents are
    // the exception: a rim tick and a riser are supposed to cut through.
    except: /^mus_(rim|riser)$/,
    centroid: [20, 3500],
    duration: [0.05, 30],
  },
  {
    name: 'music accent',
    match: /^mus_(rim|riser)$/,
    centroid: [700, 9000],
    duration: [0.05, 30],
  },
  {
    name: 'music sustained',
    match: /^mus_(drone|pad|tension)$/,
    duration: [8, 30],
  },
  {
    name: 'music bed',
    match: /^mus_(drone|pad)$/,
    // These two carry the score's weight and must stay out of the way of the
    // gunfire and callouts that own 500 Hz upwards.
    lowEnergy: [500, 0.5],
  },
  {
    name: 'music tension',
    match: /^mus_tension$/,
    // The one layer that climbs, so it gets the opposite assertion: it must
    // stay clear of the midrange rather than sit in it.
    centroid: [900, 3500],
  },

  // ---- Vehicles ------------------------------------------------------------
  {
    name: 'rotor',
    match: /^(heli_rotor|drone_prop)$/,
    duration: [0.5, 6],
    crestDb: [2, 22],
  },
  {
    name: 'jet',
    match: /^jet_/,
    duration: [0.5, 8],
    centroid: [60, 5000],
  },
  {
    name: 'bomb whistle',
    match: /_whistle$/,
    duration: [0.8, 5],
    centroid: [200, 6000],
  },
];

/** Evaluate every matching rule and push failures/warnings. */
export function checkRules(
  m: Measurement,
  spec: SoundSpec,
  rules: readonly Rule[],
  failures: string[],
  warnings: string[],
): void {
  if (m.invalid) {
    failures.push(`${m.id}: buffer contains NaN or Infinity`);
    return;
  }
  if (m.clipped) {
    failures.push(`${m.id}: buffer clips (peak ${m.peak.toFixed(3)})`);
  }

  for (const rule of rules) {
    if (!rule.match.test(m.id)) continue;
    if (rule.except?.test(m.id)) continue;
    const sink = rule.soft ? warnings : failures;
    const label = `${m.id} [${rule.name}]`;

    if (rule.peak && (m.peak < rule.peak[0] || m.peak > rule.peak[1])) {
      sink.push(
        `${label}: peak ${m.peak.toFixed(3)} outside ${rule.peak[0]}..${rule.peak[1]}`,
      );
    }
    if (rule.duration && (m.duration < rule.duration[0] || m.duration > rule.duration[1])) {
      sink.push(
        `${label}: duration ${m.duration.toFixed(3)}s outside ${rule.duration[0]}..${rule.duration[1]}s`,
      );
    }
    if (rule.centroid && (m.centroid < rule.centroid[0] || m.centroid > rule.centroid[1])) {
      sink.push(
        `${label}: centroid ${Math.round(m.centroid)}Hz outside ${rule.centroid[0]}..${rule.centroid[1]}Hz`,
      );
    }
    if (rule.lowEnergy) {
      const [hz, min] = rule.lowEnergy;
      const got = bandEnergy(m, 0, hz);
      if (got < min) {
        sink.push(
          `${label}: only ${(got * 100).toFixed(1)}% of energy below ${hz}Hz, needs ${(min * 100).toFixed(0)}%`,
        );
      }
    }
    if (rule.highEnergyMax) {
      const [hz, max] = rule.highEnergyMax;
      const got = bandEnergy(m, hz, 24000);
      if (got > max) {
        sink.push(
          `${label}: ${(got * 100).toFixed(1)}% of energy above ${hz}Hz, allows ${(max * 100).toFixed(0)}%`,
        );
      }
    }
    if (rule.attackMax !== undefined && m.attack > rule.attackMax) {
      sink.push(
        `${label}: attack ${(m.attack * 1000).toFixed(1)}ms exceeds ${(rule.attackMax * 1000).toFixed(0)}ms`,
      );
    }
    if (rule.crestDb && (m.crestDb < rule.crestDb[0] || m.crestDb > rule.crestDb[1])) {
      sink.push(
        `${label}: crest ${m.crestDb.toFixed(1)}dB outside ${rule.crestDb[0]}..${rule.crestDb[1]}dB`,
      );
    }
  }

  // Mix sanity that depends on the spec rather than on the waveform.
  if (spec.loop && m.duration < 0.4) {
    warnings.push(`${m.id}: looping buffer is only ${m.duration.toFixed(3)}s; the loop will be audible`);
  }
  if (!spec.loop && spec.variants < 2 && /^(impact_|footstep_|bullet_|shell_)/.test(m.id)) {
    warnings.push(`${m.id}: only ${spec.variants} variant of a frequently repeated sound`);
  }
}
