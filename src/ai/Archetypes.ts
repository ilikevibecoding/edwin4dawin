/**
 * Enemy archetypes and the weapon numbers they fight with.
 *
 * The weapon stats are taken from `weapons/WeaponDefs` where the id exists, so a
 * balance change to the player's arsenal moves enemy fire with it and the
 * killfeed shows a real weapon name. Everything the AI needs on top of a
 * `WeaponDefinition` — burst discipline, the range band it wants to fight at,
 * how willing it is to leave cover — lives here, because it is behaviour rather
 * than ballistics.
 *
 * The fallback table is not decoration: this module must not stop working if the
 * weapons module renames an id, so every archetype carries enough of its own
 * numbers to fire without one.
 */
import type { WeaponDefinition } from '../core/Contracts';
import { getWeaponDef } from '../weapons/WeaponDefs';

export type ArchetypeId = 'rifleman' | 'rusher' | 'marksman' | 'suppressor' | 'shotgunner';

export interface AIWeapon {
  id: string;
  displayName: string;
  /** Seconds between rounds inside a burst. */
  shotInterval: number;
  magSize: number;
  damage: number;
  falloffStart: number;
  falloffEnd: number;
  minDamageScale: number;
  penetrationPower: number;
  pellets: number;
  reloadTime: number;
  suppressed: boolean;
  tracerColor: number;
  tracerEvery: number;
  impulse: number;
  /** Base cone of fire in degrees, before the AI's own aim error. */
  spreadDeg: number;
  caliber: string;
  /** Muzzle flash scale handed to the FX module. */
  flashScale: number;
}

export interface Archetype {
  id: ArchetypeId;
  /** Killfeed label. */
  label: string;
  weaponId: string;
  health: number;
  /** Rounds per burst, inclusive range. */
  burstMin: number;
  burstMax: number;
  /** Seconds between bursts, before the difficulty multiplier. */
  burstPause: number;
  burstPauseJitter: number;
  /** Range band the archetype tries to hold. */
  preferredRange: number;
  maxRange: number;
  /** 0..1 — how strongly it pushes towards the target rather than holding cover. */
  aggression: number;
  /** 0..1 — how much of its fire it is willing to spend without positive ID. */
  suppressiveFire: number;
  /** Multiplier on the difficulty aim error; a marksman is steadier. */
  aimErrorScale: number;
  /** Multiplier on reaction time. */
  reactionScale: number;
  /** Movement speed multiplier. */
  speedScale: number;
  /** Prefers rooftops and upper floors. */
  likesElevation: boolean;
  grenades: number;
  /** Visual variants this archetype is allowed to use, by index. */
  variants: readonly number[];
}

/** Numbers used when the weapons module cannot supply a definition. */
const FALLBACKS: Record<string, AIWeapon> = {
  ar_ak74: {
    id: 'ar_ak74',
    displayName: 'AK-74M',
    shotInterval: 60 / 620,
    magSize: 30,
    damage: 33,
    falloffStart: 34,
    falloffEnd: 68,
    minDamageScale: 0.79,
    penetrationPower: 1.35,
    pellets: 1,
    reloadTime: 2.6,
    suppressed: false,
    tracerColor: 0xffb14a,
    tracerEvery: 3,
    impulse: 34,
    spreadDeg: 0.4,
    caliber: '5.45x39',
    flashScale: 1,
  },
  smg_mp5: {
    id: 'smg_mp5',
    displayName: 'MP5-K',
    shotInterval: 60 / 800,
    magSize: 30,
    damage: 24,
    falloffStart: 16,
    falloffEnd: 38,
    minDamageScale: 0.55,
    penetrationPower: 0.6,
    pellets: 1,
    reloadTime: 2.3,
    suppressed: false,
    tracerColor: 0xffd08a,
    tracerEvery: 4,
    impulse: 22,
    spreadDeg: 0.6,
    caliber: '9x19',
    flashScale: 0.8,
  },
  sniper_dmr: {
    id: 'sniper_dmr',
    displayName: 'SR-762',
    shotInterval: 0.42,
    magSize: 20,
    damage: 62,
    falloffStart: 60,
    falloffEnd: 110,
    minDamageScale: 0.85,
    penetrationPower: 2.1,
    pellets: 1,
    reloadTime: 2.8,
    suppressed: false,
    tracerColor: 0xffc46a,
    tracerEvery: 2,
    impulse: 58,
    spreadDeg: 0.16,
    caliber: '7.62x51',
    flashScale: 1.35,
  },
  lmg_m249: {
    id: 'lmg_m249',
    displayName: 'M249 SAW',
    shotInterval: 60 / 700,
    magSize: 100,
    damage: 30,
    falloffStart: 40,
    falloffEnd: 84,
    minDamageScale: 0.8,
    penetrationPower: 1.7,
    pellets: 1,
    reloadTime: 5.4,
    suppressed: false,
    tracerColor: 0xffa63a,
    tracerEvery: 2,
    impulse: 42,
    spreadDeg: 0.9,
    caliber: '5.56x45',
    flashScale: 1.4,
  },
  shotgun_pump: {
    id: 'shotgun_pump',
    displayName: 'M870',
    shotInterval: 0.85,
    magSize: 6,
    damage: 22,
    falloffStart: 8,
    falloffEnd: 22,
    minDamageScale: 0.2,
    penetrationPower: 0.35,
    pellets: 8,
    reloadTime: 3.6,
    suppressed: false,
    tracerColor: 0xffd08a,
    tracerEvery: 0,
    impulse: 18,
    spreadDeg: 3.6,
    caliber: '12ga',
    flashScale: 1.5,
  },
};

const CACHE = new Map<string, AIWeapon>();

/** Rough recoil impulse imparted to a struck ragdoll, from calibre and damage. */
function impulseOf(def: WeaponDefinition): number {
  const pellets = def.pellets ?? 1;
  return Math.max(8, (def.damage / pellets) * 1.1 + def.weight * 2.4);
}

function flashOf(def: WeaponDefinition): number {
  switch (def.class) {
    case 'sniper':
      return 1.35;
    case 'lmg':
      return 1.4;
    case 'shotgun':
      return 1.5;
    case 'smg':
      return 0.8;
    case 'pistol':
      return 0.65;
    default:
      return 1;
  }
}

/**
 * The AI's view of a weapon. Resolved once per id and cached, so a firing agent
 * never touches the weapons module in its hot path.
 */
export function aiWeapon(id: string): AIWeapon {
  const cached = CACHE.get(id);
  if (cached) return cached;

  let resolved: AIWeapon | undefined;
  const def = getWeaponDef(id);
  if (def) {
    resolved = {
      id: def.id,
      displayName: def.displayName,
      shotInterval: 60 / Math.max(60, def.rpm),
      magSize: def.magSize,
      damage: def.damage,
      falloffStart: def.falloffStart,
      falloffEnd: def.falloffEnd,
      minDamageScale: def.minDamageScale,
      penetrationPower: def.penetrationPower,
      pellets: def.pellets ?? 1,
      // Enemies always reload from empty; the tactical time would be a lie.
      reloadTime: def.reloadEmptyTime,
      suppressed: def.suppressed,
      tracerColor: def.tracerColor,
      tracerEvery: Math.max(0, def.tracerEvery),
      impulse: impulseOf(def),
      spreadDeg: def.spreadAds,
      caliber: def.caliber,
      flashScale: flashOf(def),
    };
  }
  resolved ??= FALLBACKS[id] ?? FALLBACKS.ar_ak74;
  CACHE.set(id, resolved);
  return resolved;
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  rifleman: {
    id: 'rifleman',
    label: 'RIFLEMAN',
    weaponId: 'ar_ak74',
    health: 100,
    burstMin: 3,
    burstMax: 5,
    burstPause: 0.72,
    burstPauseJitter: 0.45,
    preferredRange: 18,
    maxRange: 55,
    aggression: 0.45,
    suppressiveFire: 0.3,
    aimErrorScale: 1,
    reactionScale: 1,
    speedScale: 1,
    likesElevation: false,
    grenades: 1,
    variants: [0, 1, 2],
  },
  rusher: {
    id: 'rusher',
    label: 'SHOCK TROOPER',
    weaponId: 'smg_mp5',
    health: 85,
    burstMin: 5,
    burstMax: 9,
    burstPause: 0.42,
    burstPauseJitter: 0.28,
    preferredRange: 8,
    maxRange: 30,
    aggression: 0.9,
    suppressiveFire: 0.45,
    aimErrorScale: 1.35,
    reactionScale: 0.85,
    speedScale: 1.18,
    likesElevation: false,
    grenades: 1,
    variants: [1, 2],
  },
  marksman: {
    id: 'marksman',
    label: 'MARKSMAN',
    weaponId: 'sniper_dmr',
    health: 90,
    burstMin: 1,
    burstMax: 2,
    burstPause: 1.5,
    burstPauseJitter: 0.9,
    preferredRange: 45,
    maxRange: 90,
    aggression: 0.12,
    suppressiveFire: 0.05,
    aimErrorScale: 0.55,
    reactionScale: 1.35,
    speedScale: 0.9,
    likesElevation: true,
    grenades: 0,
    variants: [0, 2],
  },
  suppressor: {
    id: 'suppressor',
    label: 'MACHINEGUNNER',
    weaponId: 'lmg_m249',
    health: 130,
    burstMin: 8,
    burstMax: 16,
    burstPause: 1.15,
    burstPauseJitter: 0.6,
    preferredRange: 28,
    maxRange: 70,
    aggression: 0.2,
    suppressiveFire: 0.95,
    aimErrorScale: 1.8,
    reactionScale: 1.15,
    speedScale: 0.82,
    likesElevation: false,
    grenades: 0,
    variants: [0, 1],
  },
  shotgunner: {
    id: 'shotgunner',
    label: 'BREACHER',
    weaponId: 'shotgun_pump',
    health: 115,
    burstMin: 1,
    burstMax: 2,
    burstPause: 0.95,
    burstPauseJitter: 0.35,
    preferredRange: 5,
    maxRange: 18,
    aggression: 1,
    suppressiveFire: 0.1,
    aimErrorScale: 1.1,
    reactionScale: 0.9,
    speedScale: 1.1,
    likesElevation: false,
    grenades: 1,
    variants: [1, 2],
  },
};

export const ARCHETYPE_IDS: readonly ArchetypeId[] = [
  'rifleman',
  'rifleman',
  'rifleman',
  'rusher',
  'rusher',
  'suppressor',
  'marksman',
  'shotgunner',
];

export function archetypeOf(id: string | undefined): Archetype {
  if (id && id in ARCHETYPES) return ARCHETYPES[id as ArchetypeId];
  return ARCHETYPES.rifleman;
}
