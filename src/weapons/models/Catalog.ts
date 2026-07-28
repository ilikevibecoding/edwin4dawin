import type { WeaponStats } from '../../core/Interfaces';
import type { WeaponDef } from '../WeaponModel';
import { buildRifle } from './Rifle';
import { buildSMG } from './SMG';
import { buildSniper } from './Sniper';
import { buildShotgun } from './Shotgun';
import { buildPistol } from './Pistol';

/**
 * The loadout.
 *
 * Numbers are real where a real number exists — 5.56 leaves an M4 at 880 m/s,
 * a 12-gauge buck load is nine pellets, a .338 will go through a breeze block
 * and an M4 will not — and tuned where they are a game decision. The recoil
 * patterns are the one place both are true at once: they are shaped like the
 * real climb-then-drift of each action, but they are *deterministic*, so a
 * player who learns one can hold a spray on target the way they can in CoD.
 */

function stats(s: WeaponStats): WeaponStats {
  return s;
}

/* Patterns are in units of the weapon's own recoil, walked one entry per shot
   and held at the last. Vertical first, horizontal second; positive horizontal
   is to the right. */
const RIFLE_PATTERN: Array<[number, number]> = [
  [0.55, 0.0],
  [0.95, 0.06],
  [1.05, -0.1],
  [1.0, 0.24],
  [0.92, 0.42],
  [0.86, 0.5],
  [0.8, 0.34],
  [0.74, -0.06],
  [0.7, -0.44],
  [0.68, -0.72],
  [0.66, -0.8],
  [0.64, -0.62],
  [0.62, -0.22],
  [0.6, 0.26],
  [0.6, 0.62],
  [0.58, 0.78],
  [0.58, 0.7],
  [0.56, 0.4],
  [0.56, 0.02],
  [0.54, -0.34],
];

const SMG_PATTERN: Array<[number, number]> = [
  [0.45, 0.0],
  [0.8, -0.12],
  [0.95, -0.3],
  [0.9, -0.5],
  [0.84, -0.44],
  [0.8, -0.1],
  [0.76, 0.3],
  [0.72, 0.62],
  [0.7, 0.78],
  [0.68, 0.66],
  [0.66, 0.3],
  [0.64, -0.14],
  [0.62, -0.52],
  [0.6, -0.7],
  [0.6, -0.5],
  [0.58, -0.06],
];

const PISTOL_PATTERN: Array<[number, number]> = [
  [1.0, 0.0],
  [0.95, 0.28],
  [0.92, -0.24],
  [0.9, 0.36],
  [0.88, -0.3],
  [0.86, 0.2],
];

const SNIPER_PATTERN: Array<[number, number]> = [[1.0, 0.18]];
const SHOTGUN_PATTERN: Array<[number, number]> = [
  [1.0, 0.12],
  [0.95, -0.2],
  [0.92, 0.24],
];

export const WEAPONS: WeaponDef[] = [
  {
    stats: stats({
      id: 'rifle',
      name: 'M4A1 CARBINE',
      rpm: 780,
      magSize: 30,
      reserveAmmo: 210,
      damage: 33,
      headshotMultiplier: 1.6,
      falloffStart: 34,
      falloffEnd: 72,
      falloffMin: 0.55,
      muzzleVelocity: 880,
      fireMode: 'auto',
      fireModes: ['auto', 'burst', 'semi'],
      burstCount: 3,
      adsTime: 0.24,
      reloadTime: 2.1,
      reloadEmptyTime: 2.95,
      hipSpread: 0.0385,
      adsSpread: 0.0015,
      recoilVertical: 0.0075,
      recoilHorizontal: 0.0031,
      recoilRecovery: 8,
      adsFov: 55,
      scope: 'reflex',
      caliber: 5.56,
      penetration: 0.095,
      pellets: 1,
      burstRpm: 900,
    }),
    build: buildRifle,
    optics: ['reflex', 'holo', 'acog', 'irons'],
    pattern: RIFLE_PATTERN,
    caliber: 5.56,
  },
  {
    stats: stats({
      id: 'smg',
      name: 'MP5A5',
      rpm: 800,
      magSize: 30,
      reserveAmmo: 240,
      damage: 25,
      headshotMultiplier: 1.5,
      falloffStart: 15,
      falloffEnd: 36,
      falloffMin: 0.42,
      muzzleVelocity: 400,
      fireMode: 'auto',
      fireModes: ['auto', 'burst', 'semi'],
      burstCount: 3,
      adsTime: 0.185,
      reloadTime: 1.85,
      reloadEmptyTime: 2.6,
      hipSpread: 0.03,
      adsSpread: 0.0023,
      recoilVertical: 0.0056,
      recoilHorizontal: 0.0034,
      recoilRecovery: 10,
      adsFov: 60,
      scope: 'reflex',
      caliber: 9,
      penetration: 0.035,
      pellets: 1,
      burstRpm: 900,
    }),
    build: buildSMG,
    optics: ['reflex', 'holo', 'irons'],
    pattern: SMG_PATTERN,
    caliber: 9,
  },
  {
    stats: stats({
      id: 'sniper',
      name: 'SR-338 MARKSMAN',
      rpm: 45,
      magSize: 5,
      reserveAmmo: 35,
      damage: 145,
      headshotMultiplier: 2,
      falloffStart: 95,
      falloffEnd: 220,
      falloffMin: 0.82,
      muzzleVelocity: 915,
      fireMode: 'bolt',
      adsTime: 0.42,
      reloadTime: 3.0,
      reloadEmptyTime: 3.7,
      hipSpread: 0.075,
      adsSpread: 0.00018,
      recoilVertical: 0.05,
      recoilHorizontal: 0.012,
      recoilRecovery: 3.4,
      adsFov: 26,
      scope: 'sniper',
      caliber: 8.6,
      penetration: 0.36,
      pellets: 1,
    }),
    build: buildSniper,
    optics: ['sniper', 'acog', 'irons'],
    pattern: SNIPER_PATTERN,
    caliber: 8.6,
  },
  {
    stats: stats({
      id: 'shotgun',
      name: 'M870 EXPRESS',
      rpm: 72,
      magSize: 7,
      reserveAmmo: 42,
      damage: 13,
      headshotMultiplier: 1.35,
      falloffStart: 9,
      falloffEnd: 24,
      falloffMin: 0.14,
      muzzleVelocity: 410,
      fireMode: 'pump',
      adsTime: 0.3,
      /* Shell-by-shell: `reloadTime` is one shell, `reloadEmptyTime` the fixed
         cost of raising the gun, loading the first and pumping it closed. */
      reloadTime: 0.46,
      reloadEmptyTime: 1.05,
      hipSpread: 0.058,
      adsSpread: 0.039,
      recoilVertical: 0.048,
      recoilHorizontal: 0.014,
      recoilRecovery: 4.6,
      adsFov: 62,
      scope: 'none',
      caliber: 12,
      penetration: 0.02,
      pellets: 9,
      pelletSpread: 0.052,
    }),
    build: buildShotgun,
    optics: ['irons', 'reflex', 'holo'],
    pattern: SHOTGUN_PATTERN,
    caliber: 12,
  },
  {
    stats: stats({
      id: 'pistol',
      name: 'M18 SIDEARM',
      rpm: 430,
      magSize: 17,
      reserveAmmo: 68,
      damage: 28,
      headshotMultiplier: 1.8,
      falloffStart: 13,
      falloffEnd: 32,
      falloffMin: 0.4,
      muzzleVelocity: 375,
      fireMode: 'semi',
      adsTime: 0.155,
      reloadTime: 1.5,
      reloadEmptyTime: 2.15,
      hipSpread: 0.028,
      adsSpread: 0.0021,
      recoilVertical: 0.0082,
      recoilHorizontal: 0.0039,
      recoilRecovery: 12,
      adsFov: 62,
      scope: 'reflex',
      caliber: 9,
      penetration: 0.03,
      pellets: 1,
    }),
    build: buildPistol,
    optics: ['irons', 'reflex'],
    pattern: PISTOL_PATTERN,
    caliber: 9,
  },
];

export function weaponDef(id: string): WeaponDef | undefined {
  return WEAPONS.find((w) => w.stats.id === id);
}
