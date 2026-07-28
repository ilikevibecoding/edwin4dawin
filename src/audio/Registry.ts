/**
 * The sound id table.
 *
 * Other systems ask for sounds by name through `audio:play`, and several of them
 * also publish the richer typed event for the same thing — the weapon system
 * emits `weapon:fire` *and* `audio:play { id: 'rifle_fire' }`. The typed event
 * is always the better source, because it carries the muzzle position and
 * whether the weapon is suppressed, so this table exists partly to route ids to
 * designed sounds and partly to swallow the duplicates: a definition can name a
 * dedupe channel, and a play on a channel that the event path has just stamped
 * is claimed and dropped.
 *
 * Unknown ids are resolved heuristically rather than refused, so a system that
 * lands later with an id nobody agreed on still makes a plausible noise.
 */

import type { BusName } from './graph/Mixer';

export type DistanceFamily = 'weapon' | 'world' | 'footstep' | 'explosion' | 'aircraft' | 'flat';

export interface SoundDef {
  /**
   * A baked clip name, or a directive:
   *   `@shot:<gun>`      live layered gunshot
   *   `@shot_sup:<gun>`  live suppressed gunshot
   *   `@reload:<weapon>` the reload sequence for a weapon
   *   `@approach`        an aircraft building from a distance
   */
  clip: string;
  bus: BusName;
  volume: number;
  priority: number;
  model: DistanceFamily;
  /** Playback rate jitter, as a fraction either side of 1. */
  jitter: number;
  /** Multiplier on the zone's wet level. */
  wet: number;
  /** Dedupe channel; a stamped channel swallows the play. */
  channel?: string;
  /** Seconds a stamp lasts. */
  window?: number;
  /** Extra layers: clip name, delay in seconds, relative volume. */
  steps?: ReadonlyArray<readonly [string, number, number]>;
  /** Hearing damage this causes when it goes off next to the listener, 0..1. */
  ring?: number;
}

interface DefOpts {
  bus?: BusName;
  volume?: number;
  priority?: number;
  model?: DistanceFamily;
  jitter?: number;
  wet?: number;
  channel?: string;
  window?: number;
  steps?: ReadonlyArray<readonly [string, number, number]>;
  ring?: number;
}

function def(clip: string, o: DefOpts = {}): SoundDef {
  return {
    clip,
    bus: o.bus ?? 'world',
    volume: o.volume ?? 1,
    priority: o.priority ?? 0.5,
    model: o.model ?? 'world',
    jitter: o.jitter ?? 0.06,
    wet: o.wet ?? 1,
    channel: o.channel,
    window: o.window ?? 0.09,
    steps: o.steps,
    ring: o.ring,
  };
}

const GUNS = ['rifle', 'smg', 'sniper', 'shotgun', 'pistol'] as const;

const TABLE: Record<string, SoundDef> = {
  /* ------------------------------ weapons ----------------------------- */

  weapon_dryfire: def('dry_fire', { bus: 'weapons', volume: 0.7, priority: 0.7, model: 'flat', wet: 0.3 }),
  weapon_melee: def('melee', { bus: 'weapons', volume: 0.9, priority: 0.75, model: 'flat', wet: 0.5 }),
  weapon_magtap: def('mag_tap', { bus: 'weapons', volume: 0.75, priority: 0.6, model: 'flat', wet: 0.4 }),
  weapon_boltrelease: def('bolt_release', { bus: 'weapons', volume: 0.85, priority: 0.65, model: 'flat', wet: 0.4 }),
  weapon_switch: def('weapon_swap', { bus: 'weapons', volume: 0.7, priority: 0.6, model: 'flat', wet: 0.3 }),
  weapon_firemode: def('fire_mode', { bus: 'weapons', volume: 0.65, priority: 0.6, model: 'flat', wet: 0.2 }),
  weapon_charge: def('charging_handle', { bus: 'weapons', volume: 0.85, priority: 0.65, model: 'flat', wet: 0.4 }),
  weapon_shell: def('shell_insert', { bus: 'weapons', volume: 0.7, priority: 0.6, model: 'flat', wet: 0.4 }),
  weapon_cycle: def('bolt_cycle', { bus: 'weapons', volume: 0.85, priority: 0.68, model: 'flat', wet: 0.4, channel: 'cycle', window: 0.12 }),
  weapon_inspect: def('weapon_swap', { bus: 'weapons', volume: 0.6, priority: 0.5, model: 'flat', wet: 0.3 }),

  shell_land: def('shell_land', { bus: 'world', volume: 0.5, priority: 0.28, model: 'footstep', jitter: 0.12, wet: 0.8 }),
  shell_eject: def('shell_eject', { bus: 'weapons', volume: 0.4, priority: 0.3, model: 'flat', jitter: 0.12, wet: 0.3 }),
  grenade_throw: def('grenade_throw', { bus: 'weapons', volume: 0.7, priority: 0.55, model: 'flat', wet: 0.4 }),
  grenade_bounce: def('grenade_bounce', { bus: 'world', volume: 0.6, priority: 0.4, model: 'footstep', jitter: 0.12 }),

  enemy_reload: def('@reload:enemy', { bus: 'weapons', volume: 0.75, priority: 0.4, model: 'world', wet: 1 }),
  enemy_vault: def('vault', { bus: 'footsteps', volume: 0.8, priority: 0.4, model: 'world', jitter: 0.1 }),

  /* ----------------------------- explosions ---------------------------- */

  explosion_grenade: def('blast:grenade', { bus: 'explosions', volume: 1, priority: 0.95, model: 'explosion', jitter: 0.05, channel: 'explosion', window: 0.14, ring: 0.85 }),
  explosion_bomb: def('blast:bomb', { bus: 'explosions', volume: 1, priority: 1, model: 'explosion', jitter: 0.04, channel: 'explosion', window: 0.14, ring: 1 }),
  explosion_barrel: def('blast:barrel', { bus: 'explosions', volume: 1, priority: 0.95, model: 'explosion', jitter: 0.05, channel: 'explosion', window: 0.14, ring: 0.8 }),
  explosion_rocket: def('blast:rocket', { bus: 'explosions', volume: 1, priority: 0.95, model: 'explosion', jitter: 0.05, channel: 'explosion', window: 0.14, ring: 0.8 }),
  explosion_vehicle: def('blast:vehicle', { bus: 'explosions', volume: 1, priority: 1, model: 'explosion', jitter: 0.04, channel: 'explosion', window: 0.14, ring: 0.95 }),
  explosion_debris: def('debris', { bus: 'explosions', volume: 0.7, priority: 0.45, model: 'explosion', jitter: 0.08 }),
  grenade_frag: def('blast:grenade', { bus: 'explosions', volume: 1, priority: 0.95, model: 'explosion', channel: 'explosion', window: 0.16, ring: 0.85 }),
  grenade_flash: def('flashbang', { bus: 'explosions', volume: 1, priority: 1, model: 'explosion', channel: 'flash', window: 0.2, ring: 1 }),
  grenade_smoke: def('smoke_hiss', { bus: 'world', volume: 0.8, priority: 0.4, model: 'world', channel: 'smoke', window: 0.2 }),
  flashbang: def('flashbang', { bus: 'explosions', volume: 1, priority: 1, model: 'explosion', channel: 'flash', window: 0.2, ring: 1 }),
  flashbang_muffled: def('flashbang_muffled', { bus: 'explosions', volume: 0.8, priority: 0.7, model: 'explosion' }),
  smoke_hiss: def('smoke_hiss', { bus: 'world', volume: 0.8, priority: 0.4, model: 'world', channel: 'smoke', window: 0.2 }),
  napalm_burst: def('napalm', { bus: 'explosions', volume: 1, priority: 0.9, model: 'explosion', ring: 0.35 }),

  /* ------------------------------ airstrike ---------------------------- */

  airstrike_approach: def('@approach', { bus: 'world', volume: 0.9, priority: 0.8, model: 'flat', wet: 0.5, channel: 'approach', window: 4 }),
  airstrike_release: def('bomb_release', { bus: 'world', volume: 0.8, priority: 0.6, model: 'aircraft', wet: 0.6 }),
  airstrike_cluster_open: def('cluster_open', { bus: 'world', volume: 0.9, priority: 0.7, model: 'aircraft', wet: 0.7 }),
  airstrike_rumble: def('distant_rumble', { bus: 'explosions', volume: 1, priority: 0.85, model: 'explosion', jitter: 0.08, wet: 0.9 }),
  jet_pass: def('jet', { bus: 'world', volume: 0.9, priority: 0.75, model: 'aircraft', wet: 0.6, channel: 'flyby', window: 1.5 }),
  mortar_call: def('radio_confirm', { bus: 'ui', volume: 0.75, priority: 0.7, model: 'flat', wet: 0.1 }),
  mortar_whistle: def('bomb_whistle', { bus: 'world', volume: 0.7, priority: 0.6, model: 'explosion', jitter: 0.1, wet: 0.7 }),

  /* ----------------------------- killstreaks --------------------------- */

  uav_online: def('radio_confirm', { bus: 'ui', volume: 0.8, priority: 0.75, model: 'flat', wet: 0.1 }),
  heli_inbound: def('radio_confirm', { bus: 'ui', volume: 0.8, priority: 0.75, model: 'flat', wet: 0.1 }),
  gunship_online: def('radio_confirm', { bus: 'ui', volume: 0.85, priority: 0.8, model: 'flat', wet: 0.1 }),
  package_inbound: def('radio_confirm', { bus: 'ui', volume: 0.75, priority: 0.7, model: 'flat', wet: 0.1 }),
  package_land: def('impact:wood', {
    bus: 'world',
    volume: 1,
    priority: 0.7,
    model: 'world',
    jitter: 0.05,
    steps: [
      ['step_weight', 0, 0.9],
      ['impact:metal', 0.03, 0.35],
    ],
  }),
  package_collect: def('ui_select', { bus: 'ui', volume: 0.8, priority: 0.7, model: 'flat', wet: 0.1 }),
  heli: def('heli', { bus: 'world', volume: 0.7, priority: 0.65, model: 'aircraft', wet: 0.6, channel: 'heli', window: 2 }),
  heli_gun: def('cannon_light', { bus: 'weapons', volume: 0.8, priority: 0.7, model: 'weapon', jitter: 0.08, wet: 0.8 }),
  gunship_40: def('cannon_light', { bus: 'weapons', volume: 0.9, priority: 0.75, model: 'explosion', jitter: 0.07, wet: 0.9 }),
  gunship_105: def('cannon', { bus: 'weapons', volume: 1, priority: 0.85, model: 'explosion', jitter: 0.05, wet: 1, ring: 0.2 }),
  killstreak_earned: def('killstreak_earned', { bus: 'ui', volume: 0.9, priority: 0.9, model: 'flat', wet: 0.15 }),
  killstreak_tactical_open: def('ui_tactical', { bus: 'ui', volume: 0.8, priority: 0.8, model: 'flat', wet: 0.1 }),
  killstreak_timeout: def('ui_denied', { bus: 'ui', volume: 0.7, priority: 0.7, model: 'flat', wet: 0.1 }),

  /* -------------------------------- ui -------------------------------- */

  ui_hitmarker: def('ui_hitmarker', { bus: 'ui', volume: 0.85, priority: 0.95, model: 'flat', jitter: 0.03, wet: 0 }),
  ui_hitmarker_head: def('ui_hitmarker_head', { bus: 'ui', volume: 0.9, priority: 1, model: 'flat', jitter: 0.03, wet: 0 }),
  ui_kill: def('ui_kill', { bus: 'ui', volume: 0.9, priority: 1, model: 'flat', jitter: 0.02, wet: 0.05 }),
  ui_move: def('ui_move', { bus: 'ui', volume: 0.6, priority: 0.8, model: 'flat', jitter: 0.04, wet: 0 }),
  ui_select: def('ui_select', { bus: 'ui', volume: 0.8, priority: 0.85, model: 'flat', jitter: 0.02, wet: 0 }),
  ui_back: def('ui_back', { bus: 'ui', volume: 0.7, priority: 0.8, model: 'flat', jitter: 0.02, wet: 0 }),
  ui_denied: def('ui_denied', { bus: 'ui', volume: 0.7, priority: 0.8, model: 'flat', jitter: 0.02, wet: 0 }),
  ui_open: def('ui_open', { bus: 'ui', volume: 0.7, priority: 0.8, model: 'flat', wet: 0 }),
  ui_close: def('ui_close', { bus: 'ui', volume: 0.7, priority: 0.8, model: 'flat', wet: 0 }),
  ui_warning: def('ui_warning', { bus: 'ui', volume: 0.85, priority: 0.95, model: 'flat', wet: 0.1 }),
  ui_lowhealth: def('ui_lowhealth', { bus: 'ui', volume: 0.6, priority: 0.6, model: 'flat', wet: 0 }),
  music_sting: def('music_sting', { bus: 'music', volume: 0.8, priority: 0.6, model: 'flat', wet: 0.2 }),

  /* ------------------------------- body ------------------------------- */

  player_pain: def('pain', { bus: 'world', volume: 0.8, priority: 0.8, model: 'flat', jitter: 0.08, wet: 0.05 }),
  player_death: def('death_breath', { bus: 'world', volume: 0.9, priority: 1, model: 'flat', wet: 0.1 }),
  player_vault: def('vault', { bus: 'footsteps', volume: 0.85, priority: 0.7, model: 'flat', jitter: 0.08, wet: 0.2 }),
  player_cloth: def('cloth', { bus: 'footsteps', volume: 0.6, priority: 0.4, model: 'flat', jitter: 0.1, wet: 0.2 }),
  heartbeat: def('heartbeat', { bus: 'world', volume: 0.6, priority: 0.5, model: 'flat', wet: 0 }),
};

/* Weapon fire and reload for every catalogue entry. */
for (const g of GUNS) {
  TABLE[`${g}_fire`] = def(`@shot:${g}`, {
    bus: 'weapons',
    volume: 1,
    priority: 1,
    model: 'weapon',
    jitter: 0,
    channel: 'fire',
    window: 0.05,
  });
  TABLE[`${g}_fire_sup`] = def(`@shot_sup:${g}`, {
    bus: 'weapons',
    volume: 1,
    priority: 1,
    model: 'weapon',
    jitter: 0,
    channel: 'fire',
    window: 0.05,
  });
  TABLE[`${g}_reload`] = def(`@reload:${g}`, {
    bus: 'weapons',
    volume: 1,
    priority: 0.7,
    model: 'flat',
    jitter: 0,
    channel: 'reload',
    window: 0.12,
  });
}
TABLE.enemy_rifle = def('@shot:enemy_rifle', {
  bus: 'weapons',
  volume: 1,
  priority: 0.8,
  model: 'weapon',
  jitter: 0,
  channel: 'enemyfire',
  window: 0.04,
});

/* Impacts and footsteps, one id per surface, in the naming other systems use. */
const SURFACES = [
  'concrete',
  'metal',
  'wood',
  'sand',
  'dirt',
  'gravel',
  'glass',
  'water',
  'flesh',
  'foliage',
  'fabric',
  'rubber',
  'plaster',
] as const;
for (const s of SURFACES) {
  TABLE[`impact_${s}`] = def(`impact:${s}`, {
    bus: 'world',
    volume: 0.9,
    priority: 0.45,
    model: 'world',
    jitter: 0.1,
    channel: undefined,
  });
  TABLE[`step_${s}`] = def(`step:${s}`, {
    bus: 'footsteps',
    volume: 0.8,
    priority: 0.3,
    model: 'footstep',
    jitter: 0.12,
  });
}
TABLE.glass_shatter = def('glass_shatter', {
  bus: 'world',
  volume: 1,
  priority: 0.6,
  model: 'world',
  jitter: 0.07,
});

/* Squad radio traffic. */
for (const k of ['contact', 'reloading', 'grenade', 'flanking', 'suppressing', 'man-down', 'lost']) {
  TABLE[`voice_${k}`] = def(`voice:${k}`, {
    bus: 'world',
    volume: 0.85,
    priority: 0.6,
    model: 'world',
    jitter: 0.04,
    wet: 0.35,
  });
}

export const REGISTRY: Readonly<Record<string, SoundDef>> = TABLE;

/**
 * Resolves an id that is not in the table by shape. This is deliberately
 * forgiving: another agent inventing `impact_marble` or `ui_confirm` should get
 * something sensible rather than silence, and the result is memoised so the
 * guesswork happens once.
 */
export function resolve(id: string): SoundDef | null {
  const known = TABLE[id];
  if (known) return known;

  let made: SoundDef | null = null;
  if (id.endsWith('_fire_sup')) {
    made = def(`@shot_sup:${id.slice(0, -9)}`, { bus: 'weapons', volume: 1, priority: 0.9, model: 'weapon', jitter: 0, channel: 'fire', window: 0.05 });
  } else if (id.endsWith('_fire')) {
    made = def(`@shot:${id.slice(0, -5)}`, { bus: 'weapons', volume: 1, priority: 0.9, model: 'weapon', jitter: 0, channel: 'fire', window: 0.05 });
  } else if (id.endsWith('_reload')) {
    made = def(`@reload:${id.slice(0, -7)}`, { bus: 'weapons', volume: 1, priority: 0.7, model: 'flat', jitter: 0, channel: 'reload', window: 0.12 });
  } else if (id.startsWith('impact_')) {
    made = def(`impact:${id.slice(7)}`, { bus: 'world', volume: 0.9, priority: 0.45, model: 'world', jitter: 0.1 });
  } else if (id.startsWith('step_')) {
    made = def(`step:${id.slice(5)}`, { bus: 'footsteps', volume: 0.8, priority: 0.3, model: 'footstep', jitter: 0.12 });
  } else if (id.startsWith('explosion_')) {
    made = def(`blast:${id.slice(10)}`, { bus: 'explosions', volume: 1, priority: 0.9, model: 'explosion', jitter: 0.05, channel: 'explosion', window: 0.14, ring: 0.7 });
  } else if (id.startsWith('voice_')) {
    made = def(`voice:${id.slice(6)}`, { bus: 'world', volume: 0.85, priority: 0.6, model: 'world', jitter: 0.04, wet: 0.35 });
  } else if (id.startsWith('ui_') || id.startsWith('menu_')) {
    made = def('ui_select', { bus: 'ui', volume: 0.7, priority: 0.8, model: 'flat', wet: 0 });
  } else if (id.includes('whistle')) {
    made = def('bomb_whistle', { bus: 'world', volume: 0.7, priority: 0.6, model: 'explosion', jitter: 0.1 });
  } else if (id.includes('rumble') || id.includes('quake')) {
    made = def('distant_rumble', { bus: 'explosions', volume: 0.9, priority: 0.7, model: 'explosion', jitter: 0.08 });
  } else if (id.includes('jet') || id.includes('heli') || id.includes('gunship')) {
    made = def('jet', { bus: 'world', volume: 0.8, priority: 0.7, model: 'aircraft', wet: 0.6 });
  }

  if (made) TABLE[id] = made;
  return made;
}

/** Every id the table knows, for tooling and for the settings screen. */
export function knownIds(): string[] {
  return Object.keys(TABLE).sort();
}
