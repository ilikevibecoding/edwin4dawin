/**
 * The sound library: every designed sound, indexed by id, plus the resolution
 * rules that let callers ask for ids this module has never explicitly authored.
 *
 * Resolution is deliberately forgiving. Five other modules emit sound ids and
 * they are all written independently of this one, so an unrecognised id must
 * degrade to a sensible relative rather than to silence — a missing footstep is
 * a bug, a silent one is a bug that nobody notices until shipping.
 */
import type { SurfaceType } from '../../core/GameTypes';
import { registerAmbienceBeds } from './Beds';
import { registerBulletSounds } from './Bullets';
import { registerExplosionSounds } from './Explosions';
import { registerFootstepSounds, footstepSoundId } from './Footsteps';
import { registerImpactSounds, impactSoundId } from './Impacts';
import { registerMechanicSounds } from './Mechanics';
import { registerMusicStems } from './Score';
import { registerPlayerSounds } from './Player';
import { registerUISounds } from './UI';
import { registerVehicleSounds } from './Vehicles';
import { registerVoiceSounds } from './Radio';
import {
  gunshotSoundId,
  profileKeyFor,
  registerReportExtras,
  registerWeaponSounds,
} from './Weapons';
import type { SoundSpec } from './Spec';

export type { BusId, SoundSpec, RenderArgs } from './Spec';
export { defineSound } from './Spec';
export {
  GUN_PROFILE_KEYS,
  gunProfile,
  gunshotSoundId,
  profileKeyFor,
  tailSoundId,
  type TailKind,
} from './Weapons';
export { impactSoundId } from './Impacts';
export { footstepSoundId } from './Footsteps';
export { casingSoundId } from './Mechanics';
export { explosionSoundId, type ExplosionKind } from './Explosions';
export { AMBIENCE_BED_IDS, AMBIENCE_ONESHOT_IDS } from './Beds';
export { MUSIC_HIT_IDS, MUSIC_LOOP_IDS, MUSIC_TEMPO } from './Score';

/**
 * Ids other modules use that this one authors under a different name. Cheaper
 * and clearer than duplicating a design under two keys.
 */
const ALIASES: Record<string, string> = {
  // The AI module names the same events differently from the player module.
  ai_body_fall: 'body_fall',
  ai_footstep: 'footstep_concrete',
  // Short names the UI module might reach for.
  hitmarker: 'ui_hitmarker',
  hitmarker_headshot: 'ui_hitmarker_headshot',
  hitmarker_kill: 'ui_hitmarker_kill',
  killstreak_earned: 'ui_killstreak',
  menu_nav: 'ui_nav',
  menu_select: 'ui_select',
  menu_back: 'ui_back',
  countdown: 'ui_countdown',
  notify: 'ui_notify',
  // Killstreak module ids. That module is written independently of this one and
  // names several of these differently; mapping is cheaper than duplicating a
  // design under two keys, and cheaper still than coordinating a rename.
  jet_pass: 'jet_flyover',
  jet: 'jet_flyover',
  jet_approach: 'jet_engine_loop',
  jet_distant: 'jet_flyover_far',
  bomb_drop: 'bomb_whistle',
  bomblet_whistle: 'cluster_whistle',
  cluster_burst: 'explosion_airstrike',
  heli_loop: 'heli_rotor',
  chopper_rotor: 'heli_rotor',
  drone_loop: 'drone_prop',
  uav_prop: 'drone_prop',
  uav_ping: 'uav_sweep',
  care_package_land: 'crate_impact',
  crate_land: 'crate_impact',
  killstreak_ready: 'ui_killstreak',
  radio_squelch: 'radio_squelch_open',
  radio_strike_inbound: 'radio_airstrike_inbound',
  radio_strike_ten_seconds: 'radio_airstrike_confirm',
  radio_strike_away: 'radio_cluster_away',
  radio_strike_effect: 'radio_airstrike_clear',
  // The targeting tablet is a UI surface, so it uses the UI palette.
  tablet_open: 'ui_open',
  tablet_close: 'ui_close',
  tablet_move: 'ui_nav',
  tablet_confirm: 'ui_select',
  tablet_deny: 'ui_error',
  // Combat/fx conveniences.
  grenade_bounce: 'weapon_grenade_bounce',
  ricochet: 'bullet_ricochet',
  whizz: 'bullet_whizz',
  explosion: 'explosion_grenade',
  hurt: 'player_hurt',
  death: 'player_death',
};

/** Last-resort mapping by prefix, so an unknown id is never silent. */
const PREFIX_FALLBACKS: readonly [string, string][] = [
  ['impact_', 'impact_concrete'],
  ['footstep_', 'footstep_concrete'],
  ['ai_footstep_', 'footstep_concrete'],
  ['bullet_', 'bullet_snap'],
  ['explosion_', 'explosion_grenade'],
  ['ai_voice_', 'ai_voice_contact'],
  ['radio_', 'radio_squelch_open'],
  ['weapon_', 'weapon_selector'],
  ['gun_', 'gun_generic_remote'],
  ['ui_', 'ui_tick'],
  ['menu_', 'ui_nav'],
  ['mus_', 'mus_rim'],
  ['amb_', 'amb_creak'],
  ['shell_', 'shell_bounce_rifle'],
  ['heli_', 'heli_rotor'],
  ['jet_', 'jet_flyover'],
  ['drone_', 'drone_prop'],
  ['player_', 'player_hurt'],
];

const SURFACES: readonly SurfaceType[] = [
  'concrete',
  'metal',
  'wood',
  'dirt',
  'sand',
  'gravel',
  'grass',
  'water',
  'glass',
  'flesh',
  'plaster',
  'brick',
  'tile',
  'fabric',
  'rubber',
  'foliage',
];

export class SoundLibrary {
  private readonly specs = new Map<string, SoundSpec>();
  private readonly resolved = new Map<string, SoundSpec | null>();
  private readonly reported = new Set<string>();
  /** Ids that were asked for and had to fall back, for the debug report. */
  readonly unresolved: string[] = [];

  constructor() {
    const register = (spec: SoundSpec): void => {
      this.specs.set(spec.id, spec);
    };
    registerWeaponSounds(register);
    registerReportExtras(register);
    registerMechanicSounds(register);
    registerImpactSounds(register);
    registerExplosionSounds(register);
    registerFootstepSounds(register);
    registerBulletSounds(register);
    registerPlayerSounds(register);
    registerUISounds(register);
    registerVehicleSounds(register);
    registerVoiceSounds(register);
    registerAmbienceBeds(register);
    registerMusicStems(register);

    // Surface-keyed aliases for the AI module's naming scheme.
    for (const surface of SURFACES) {
      ALIASES[`ai_footstep_${surface}`] = footstepSoundId(surface);
      ALIASES[`bullet_impact_${surface}`] = impactSoundId(surface);
    }
  }

  has(id: string): boolean {
    return this.specs.has(id);
  }

  get(id: string): SoundSpec | undefined {
    return this.specs.get(id);
  }

  /** Every explicitly authored id. Sorted for stable test output. */
  ids(): string[] {
    return [...this.specs.keys()].sort();
  }

  get size(): number {
    return this.specs.size;
  }

  /**
   * Map any id a caller might use onto a spec. Results are memoised because the
   * hot path — an impact sound during sustained fire — hits this per shot.
   */
  resolve(id: string): SoundSpec | null {
    const cached = this.resolved.get(id);
    if (cached !== undefined) return cached;
    const spec = this.lookup(id);
    this.resolved.set(id, spec);
    return spec;
  }

  private lookup(id: string): SoundSpec | null {
    const direct = this.specs.get(id);
    if (direct) return direct;

    const alias = ALIASES[id];
    if (alias) {
      const spec = this.specs.get(alias);
      if (spec) return spec;
    }

    // A weapon id or `weapon_fire_<weapon>` handed to `play` instead of to
    // `gunshot`. Resolve it to the remote report so it is at least correct.
    if (id.startsWith('weapon_fire_')) {
      const spec = this.specs.get(gunshotSoundId(profileKeyFor(id), false, false));
      if (spec) return spec;
    }

    for (const [prefix, target] of PREFIX_FALLBACKS) {
      if (id.startsWith(prefix)) {
        const spec = this.specs.get(target);
        if (spec) {
          this.report(id, target);
          return spec;
        }
      }
    }

    this.report(id, null);
    return null;
  }

  private report(id: string, target: string | null): void {
    if (this.reported.has(id)) return;
    this.reported.add(id);
    this.unresolved.push(target ? `${id} -> ${target}` : `${id} -> (silent)`);
    if (import.meta.env?.DEV) {
      console.warn(
        target
          ? `[audio] unknown sound id "${id}", falling back to "${target}"`
          : `[audio] unknown sound id "${id}" and no fallback matched`,
      );
    }
  }
}
