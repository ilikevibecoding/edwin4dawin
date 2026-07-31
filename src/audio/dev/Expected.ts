/**
 * Every sound id this module has seen another module emit.
 *
 * Five other systems name sounds independently of this one. This list is the
 * contract, checked by the self-test: if any id here stops resolving, the change
 * shows up as a test failure rather than as a sound that silently disappeared
 * from the shipped game. Ids are grouped by the module that produces them so it
 * is obvious who to talk to when one breaks.
 */
import { SURFACE_PROPERTIES, type SurfaceType } from '../../core/GameTypes';

const SURFACES = Object.keys(SURFACE_PROPERTIES) as SurfaceType[];

/** `src/weapons/` — mechanical sounds, played directly as 2D. */
const WEAPONS: readonly string[] = [
  'weapon_dry_fire',
  'weapon_mag_out',
  'weapon_mag_in',
  'weapon_mag_tap',
  'weapon_bolt_back',
  'weapon_bolt_forward',
  'weapon_pump_back',
  'weapon_pump_forward',
  'weapon_shell_insert',
  'weapon_cylinder_open',
  'weapon_cylinder_close',
  'weapon_rocket_load',
  'weapon_draw',
  'weapon_inspect',
  'weapon_knife_swing',
  'weapon_knife_hit',
  'weapon_melee_butt',
  'weapon_grenade_pin',
  'weapon_grenade_throw',
  'weapon_grenade_bounce',
  'weapon_selector',
];

/** `src/combat/` — impacts, bullet flight and blasts. */
const COMBAT: readonly string[] = [
  'bullet_ricochet',
  'bullet_whizz',
  'explosion_grenade',
  'explosion_rocket',
  'explosion_airstrike',
  'explosion_vehicle',
  'explosion_barrel',
];

/** `src/ai/` — enemy chatter and body sounds. */
const AI: readonly string[] = [
  'ai_voice_contact',
  'ai_voice_spotted',
  'ai_voice_reloading',
  'ai_voice_grenade',
  'ai_voice_flanking',
  'ai_voice_covering',
  'ai_voice_moving',
  'ai_voice_lost',
  'ai_voice_pinned',
  'ai_voice_hit',
  'ai_voice_death',
  'ai_gear_shift',
  'ai_body_fall',
  'ai_footstep',
];

/** `src/fx/` — the shell casing landing. */
const FX: readonly string[] = ['shell_bounce'];

/** `src/killstreaks/` — aircraft, the tablet and radio traffic. */
const KILLSTREAKS: readonly string[] = [
  'jet_approach',
  'jet_pass',
  'jet_distant',
  'bomb_whistle',
  'cluster_burst',
  'bomblet_whistle',
  'uav_prop',
  'heli_rotor',
  'minigun_fire',
  'crate_land',
  'crate_open',
  'chute_deploy',
  'tablet_open',
  'tablet_close',
  'tablet_move',
  'tablet_confirm',
  'tablet_deny',
  'radio_squelch',
  'killstreak_ready',
  'radio_strike_inbound',
  'radio_strike_ten_seconds',
  'radio_strike_away',
  'radio_strike_effect',
];

/** Ids this module itself produces from events, listed so they are covered too. */
const OWN: readonly string[] = [
  'land_hard',
  'land_soft',
  'gear_rustle',
  'slide_start',
  'mantle_grunt',
  'player_hurt_light',
  'player_hurt',
  'player_hurt_heavy',
  'player_death',
  'player_spawn',
  'heartbeat',
  'low_health',
  'tinnitus',
  'concussion',
  'body_fall',
  'flesh_hit',
  'ui_hitmarker',
  'ui_hitmarker_headshot',
  'ui_hitmarker_kill',
  'ui_killstreak',
  'ui_notify',
  'ui_reward',
  'ui_error',
  'radio_airstrike_inbound',
  'gun_dust_settle',
  'weapon_bolt_lock',
];

export const EXTERNAL_IDS: readonly string[] = [
  ...WEAPONS,
  ...COMBAT,
  ...AI,
  ...FX,
  ...KILLSTREAKS,
  ...OWN,
  // Combat builds these per surface, and the player module emits the surface
  // for footsteps. All sixteen of both must resolve.
  ...SURFACES.map((s) => `impact_${s}`),
  ...SURFACES.map((s) => `footstep_${s}`),
  ...SURFACES.map((s) => `ai_footstep_${s}`),
];
