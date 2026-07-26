import * as THREE from 'three';

/**
 * Weapon data.
 *
 * Ballistic and handling values are expressed in real units (m/s, grams,
 * milliradians, rounds per minute) rather than abstract "damage numbers", so
 * the ballistics solver, the recoil model, and the audio system can all derive
 * their behaviour from the same physical description instead of each carrying
 * its own fudge factors.
 */

export interface RecoilPattern {
  /** Vertical kick per shot, radians. */
  pitch: number;
  /** Horizontal kick per shot, radians; sign alternates via the pattern. */
  yaw: number;
  /** Camera roll per shot, radians. */
  roll: number;
  /** Fraction of the kick that recovers automatically, 0..1. */
  recovery: number;
  /** Deterministic horizontal drift sampled per shot index. */
  pattern: number[];
  /** Random component added on top of the pattern, radians. */
  randomYaw: number;
  randomPitch: number;
  /** Multiplier applied while aiming down sights. */
  adsScale: number;
  /** How much the view model is displaced backward, metres. */
  kickback: number;
  /** Muzzle rise applied to the view model, radians. */
  visualPitch: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  /** Short display class. */
  class: 'AR' | 'SMG' | 'LMG' | 'DMR' | 'SNIPER' | 'SHOTGUN' | 'PISTOL' | 'LAUNCHER';
  fireModes: Array<'auto' | 'semi' | 'burst'>;
  rpm: number;
  burstCount: number;
  burstDelay: number;

  magSize: number;
  reserveAmmo: number;
  /** Seconds; tactical keeps the chambered round. */
  reloadTime: number;
  reloadEmptyTime: number;
  /** Seconds to raise the weapon after a switch. */
  drawTime: number;
  holsterTime: number;
  adsTime: number;

  /** Muzzle velocity, m/s. */
  muzzleVelocity: number;
  /** Projectile mass, grams — drives drop and wind. */
  projectileMass: number;
  /** Ballistic coefficient (G1). */
  ballisticCoefficient: number;
  /** Pellets per trigger pull (shotguns). */
  pellets: number;

  /** Damage at the muzzle. */
  damage: number;
  /** Damage at `falloffEnd`. */
  damageMin: number;
  falloffStart: number;
  falloffEnd: number;
  headshotMultiplier: number;
  limbMultiplier: number;
  /** Metres of concrete the round will punch through. */
  penetration: number;

  /** Cone of fire, milliradians, at the hip and aimed. */
  spreadHip: number;
  spreadAds: number;
  spreadMoveScale: number;
  spreadJumpScale: number;
  /** Per-shot spread growth and recovery rate, milliradians. */
  spreadPerShot: number;
  spreadRecovery: number;

  recoil: RecoilPattern;

  /** ADS field of view, degrees. */
  adsFov: number;
  /** Optic type drives the view model and the HUD reticle. */
  optic: 'iron' | 'reddot' | 'holo' | 'acog' | 'sniper';
  opticMagnification: number;

  /** Metres from the camera origin to the muzzle in view space. */
  muzzleOffset: THREE.Vector3;
  /** Hip-fire rest pose of the view model. */
  hipPosition: THREE.Vector3;
  hipRotation: THREE.Euler;
  /** ADS pose; the optic must land dead centre. */
  adsPosition: THREE.Vector3;
  adsRotation: THREE.Euler;

  /** Audio character. */
  soundProfile: {
    /** Fundamental of the muzzle blast, Hz. */
    body: number;
    /** Sharpness of the crack, 0..1. */
    crack: number;
    /** Mechanical action noise level, 0..1. */
    mech: number;
    /** Tail length, seconds. */
    tail: number;
  };

  /** Ejected case size, metres. */
  caseLength: number;
  suppressed: boolean;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const E = (x: number, y: number, z: number) => new THREE.Euler(x, y, z, 'YXZ');

export const WEAPONS: Record<string, WeaponDef> = {
  /** 5.56 assault rifle — the default all-rounder. */
  m4a1: {
    id: 'm4a1',
    name: 'MK-4 CARBINE',
    class: 'AR',
    fireModes: ['auto', 'burst', 'semi'],
    rpm: 780,
    burstCount: 3,
    burstDelay: 0.24,
    magSize: 30,
    reserveAmmo: 210,
    reloadTime: 1.86,
    reloadEmptyTime: 2.62,
    drawTime: 0.55,
    holsterTime: 0.4,
    adsTime: 0.22,
    muzzleVelocity: 880,
    projectileMass: 4.0,
    ballisticCoefficient: 0.151,
    pellets: 1,
    damage: 33,
    damageMin: 20,
    falloffStart: 34,
    falloffEnd: 72,
    headshotMultiplier: 2.05,
    limbMultiplier: 0.88,
    penetration: 0.14,
    spreadHip: 32,
    spreadAds: 2.1,
    spreadMoveScale: 1.9,
    spreadJumpScale: 3.4,
    spreadPerShot: 2.6,
    spreadRecovery: 26,
    recoil: {
      pitch: 0.0074,
      yaw: 0.0022,
      roll: 0.0016,
      recovery: 0.82,
      pattern: [0, 0.2, -0.1, 0.45, -0.35, 0.7, -0.55, 0.9, -0.8, 1.0, -1.0, 0.85, -0.9, 0.6, -0.65],
      randomYaw: 0.0009,
      randomPitch: 0.0011,
      adsScale: 0.72,
      kickback: 0.017,
      visualPitch: 0.036,
    },
    adsFov: 55,
    optic: 'reddot',
    opticMagnification: 1.15,
    muzzleOffset: V(0.052, -0.072, -0.62),
    hipPosition: V(0.155, -0.135, -0.32),
    hipRotation: E(0.03, -0.06, 0.02),
    adsPosition: V(0, -0.056, -0.20),
    adsRotation: E(0, 0, 0),
    soundProfile: { body: 132, crack: 0.82, mech: 0.5, tail: 1.15 },
    caseLength: 0.045,
    suppressed: false,
  },

  /** 9mm submachine gun — fast, close range. */
  mp7: {
    id: 'mp7',
    name: 'VECTOR-9',
    class: 'SMG',
    fireModes: ['auto', 'semi'],
    rpm: 1010,
    burstCount: 3,
    burstDelay: 0.2,
    magSize: 32,
    reserveAmmo: 224,
    reloadTime: 1.62,
    reloadEmptyTime: 2.22,
    drawTime: 0.42,
    holsterTime: 0.32,
    adsTime: 0.16,
    muzzleVelocity: 400,
    projectileMass: 8.0,
    ballisticCoefficient: 0.12,
    pellets: 1,
    damage: 26,
    damageMin: 14,
    falloffStart: 18,
    falloffEnd: 42,
    headshotMultiplier: 1.85,
    limbMultiplier: 0.9,
    penetration: 0.06,
    spreadHip: 26,
    spreadAds: 3.0,
    spreadMoveScale: 1.35,
    spreadJumpScale: 2.6,
    spreadPerShot: 2.1,
    spreadRecovery: 30,
    recoil: {
      pitch: 0.0052,
      yaw: 0.0026,
      roll: 0.0014,
      recovery: 0.86,
      pattern: [0, -0.3, 0.25, -0.5, 0.6, -0.7, 0.55, -0.85, 0.9, -0.6, 0.75, -1.0],
      randomYaw: 0.0013,
      randomPitch: 0.0008,
      adsScale: 0.68,
      kickback: 0.012,
      visualPitch: 0.028,
    },
    adsFov: 62,
    optic: 'holo',
    opticMagnification: 1.0,
    muzzleOffset: V(0.048, -0.068, -0.44),
    hipPosition: V(0.145, -0.125, -0.26),
    hipRotation: E(0.04, -0.07, 0.02),
    adsPosition: V(0, -0.052, -0.16),
    adsRotation: E(0, 0, 0),
    soundProfile: { body: 168, crack: 0.66, mech: 0.66, tail: 0.78 },
    caseLength: 0.029,
    suppressed: false,
  },

  /** 7.62 designated marksman rifle. */
  dmr: {
    id: 'dmr',
    name: 'SR-762 MARKSMAN',
    class: 'DMR',
    fireModes: ['semi'],
    rpm: 380,
    burstCount: 1,
    burstDelay: 0,
    magSize: 20,
    reserveAmmo: 120,
    reloadTime: 2.15,
    reloadEmptyTime: 2.85,
    drawTime: 0.68,
    holsterTime: 0.5,
    adsTime: 0.31,
    muzzleVelocity: 838,
    projectileMass: 9.5,
    ballisticCoefficient: 0.398,
    pellets: 1,
    damage: 62,
    damageMin: 48,
    falloffStart: 60,
    falloffEnd: 140,
    headshotMultiplier: 2.3,
    limbMultiplier: 0.92,
    penetration: 0.32,
    spreadHip: 46,
    spreadAds: 0.5,
    spreadMoveScale: 2.4,
    spreadJumpScale: 4.5,
    spreadPerShot: 3.4,
    spreadRecovery: 18,
    recoil: {
      pitch: 0.0195,
      yaw: 0.0032,
      roll: 0.0036,
      recovery: 0.9,
      pattern: [0, 0.4, -0.3, 0.6, -0.5],
      randomYaw: 0.0016,
      randomPitch: 0.0022,
      adsScale: 0.8,
      kickback: 0.036,
      visualPitch: 0.072,
    },
    adsFov: 32,
    optic: 'acog',
    opticMagnification: 3.4,
    muzzleOffset: V(0.05, -0.07, -0.78),
    hipPosition: V(0.165, -0.145, -0.36),
    hipRotation: E(0.03, -0.05, 0.02),
    adsPosition: V(0, -0.052, -0.24),
    adsRotation: E(0, 0, 0),
    soundProfile: { body: 96, crack: 0.94, mech: 0.44, tail: 1.55 },
    caseLength: 0.051,
    suppressed: false,
  },

  /** Sidearm. */
  pistol: {
    id: 'pistol',
    name: 'P-19 SIDEARM',
    class: 'PISTOL',
    fireModes: ['semi'],
    rpm: 460,
    burstCount: 1,
    burstDelay: 0,
    magSize: 17,
    reserveAmmo: 68,
    reloadTime: 1.42,
    reloadEmptyTime: 1.95,
    drawTime: 0.3,
    holsterTime: 0.24,
    adsTime: 0.14,
    muzzleVelocity: 375,
    projectileMass: 8.0,
    ballisticCoefficient: 0.14,
    pellets: 1,
    damage: 28,
    damageMin: 16,
    falloffStart: 14,
    falloffEnd: 36,
    headshotMultiplier: 2.0,
    limbMultiplier: 0.85,
    penetration: 0.05,
    spreadHip: 22,
    spreadAds: 2.6,
    spreadMoveScale: 1.5,
    spreadJumpScale: 3.0,
    spreadPerShot: 4.5,
    spreadRecovery: 34,
    recoil: {
      pitch: 0.0125,
      yaw: 0.0028,
      roll: 0.0022,
      recovery: 0.92,
      pattern: [0, 0.3, -0.25, 0.4, -0.35],
      randomYaw: 0.0018,
      randomPitch: 0.0016,
      adsScale: 0.75,
      kickback: 0.02,
      visualPitch: 0.055,
    },
    adsFov: 64,
    optic: 'iron',
    opticMagnification: 1,
    muzzleOffset: V(0.036, -0.05, -0.24),
    hipPosition: V(0.12, -0.12, -0.22),
    hipRotation: E(0.05, -0.09, 0.03),
    adsPosition: V(0, -0.048, -0.19),
    adsRotation: E(0, 0, 0),
    soundProfile: { body: 176, crack: 0.6, mech: 0.7, tail: 0.62 },
    caseLength: 0.019,
    suppressed: false,
  },
};

export const DEFAULT_LOADOUT = ['m4a1', 'pistol'];

/** Damage after range falloff, using a smooth curve rather than a hard step. */
export function damageAtRange(def: WeaponDef, distance: number): number {
  if (distance <= def.falloffStart) return def.damage;
  if (distance >= def.falloffEnd) return def.damageMin;
  const t = (distance - def.falloffStart) / (def.falloffEnd - def.falloffStart);
  // Smoothstep rather than linear: real terminal ballistics do not fall off
  // linearly, and the eased curve avoids a noticeable "damage cliff".
  const eased = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(def.damage, def.damageMin, eased);
}
