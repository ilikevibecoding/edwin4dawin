import type { WeaponDefinition } from '../core/Contracts';

/**
 * The arsenal.
 *
 * Balance is driven off a 100 HP target and a time-to-kill band of roughly
 * 200-500 ms at each weapon's effective range, where
 *
 *   TTK = (ceil(100 / damage) - 1) * 60 / rpm
 *
 * so damage is chosen for a specific shots-to-kill and rpm then sets the pace.
 * Falloff is authored so that a weapon changes shots-to-kill exactly once across
 * its useful range — two breakpoints in the same gun makes range feel random.
 * The comment on each entry states the intended STK/TTK so a later tweak cannot
 * silently move a weapon out of its class.
 */
export const WEAPONS: readonly WeaponDefinition[] = [
  // -------------------------------------------------------------------------
  // Assault rifles
  // -------------------------------------------------------------------------
  {
    // 4 shots to kill, 225 ms. Fastest close-range AR, worst damage retention.
    id: 'ar_mk4',
    displayName: 'MK4 CARBINE',
    class: 'ar',
    fireMode: 'auto',
    rpm: 800,
    magSize: 30,
    reserveAmmo: 210,
    damage: 26,
    falloffStart: 26,
    falloffEnd: 55,
    minDamageScale: 0.77,
    spreadHip: 2.35,
    spreadAds: 0.22,
    spreadMoving: 1.5,
    spreadMax: 5.4,
    spreadPerShot: 0.34,
    spreadRecovery: 4.2,
    recoilPitch: 0.42,
    recoilYaw: 0.13,
    recoilRandom: 0.2,
    recoilRecovery: 9.5,
    kickback: 0.014,
    adsTime: 0.26,
    adsZoom: 1.22,
    scope: 'holo',
    reloadTime: 1.94,
    reloadEmptyTime: 2.56,
    drawTime: 0.52,
    holsterTime: 0.4,
    suppressed: false,
    penetrationPower: 1.0,
    weight: 3.4,
    caliber: '5.56x45',
    tracerColor: 0xffc46a,
    tracerEvery: 3,
  },
  {
    // 4 STK, 290 ms up close, but still 4 STK at 50 m where the MK4 drops to 5.
    id: 'ar_ak74',
    displayName: 'AK-74M',
    class: 'ar',
    fireMode: 'auto',
    rpm: 620,
    magSize: 30,
    reserveAmmo: 180,
    damage: 33,
    falloffStart: 34,
    falloffEnd: 68,
    minDamageScale: 0.79,
    spreadHip: 2.8,
    spreadAds: 0.26,
    spreadMoving: 1.8,
    spreadMax: 6.2,
    spreadPerShot: 0.42,
    spreadRecovery: 3.6,
    recoilPitch: 0.74,
    recoilYaw: 0.3,
    recoilRandom: 0.42,
    recoilRecovery: 7.0,
    kickback: 0.023,
    adsTime: 0.3,
    adsZoom: 1.2,
    scope: 'none',
    reloadTime: 2.24,
    reloadEmptyTime: 2.98,
    drawTime: 0.58,
    holsterTime: 0.44,
    suppressed: false,
    penetrationPower: 1.35,
    weight: 3.9,
    caliber: '5.45x39',
    tracerColor: 0xffb14a,
    tracerEvery: 3,
  },
  {
    // 4 STK, 257 ms. Bullpup: least recoil of the ARs, slowest hip handling.
    id: 'ar_aug',
    displayName: 'STG-88',
    class: 'ar',
    fireMode: 'auto',
    rpm: 700,
    magSize: 30,
    reserveAmmo: 210,
    damage: 28,
    falloffStart: 30,
    falloffEnd: 60,
    minDamageScale: 0.75,
    spreadHip: 3.1,
    spreadAds: 0.2,
    spreadMoving: 1.6,
    spreadMax: 5.6,
    spreadPerShot: 0.3,
    spreadRecovery: 4.6,
    recoilPitch: 0.5,
    recoilYaw: 0.09,
    recoilRandom: 0.16,
    recoilRecovery: 10.5,
    kickback: 0.016,
    // Integral 2x prism: the widest sight picture of any magnified optic here,
    // and the reason this pays 40 ms more ADS than the other assault rifles.
    adsTime: 0.33,
    adsZoom: 2,
    scope: 'acog',
    reloadTime: 2.1,
    reloadEmptyTime: 2.74,
    drawTime: 0.56,
    holsterTime: 0.42,
    suppressed: false,
    penetrationPower: 1.1,
    weight: 3.7,
    caliber: '5.56x45',
    tracerColor: 0xffc46a,
    tracerEvery: 4,
  },
  {
    // 3-round burst at 900 rpm inside the burst, 380 ms between bursts.
    // Two bursts (6 rounds) always kill; one burst kills a wounded target.
    id: 'ar_famas',
    displayName: 'FR-556',
    class: 'ar',
    fireMode: 'burst',
    burstCount: 3,
    rpm: 900,
    magSize: 30,
    reserveAmmo: 180,
    damage: 30,
    falloffStart: 28,
    falloffEnd: 58,
    minDamageScale: 0.74,
    spreadHip: 2.9,
    spreadAds: 0.18,
    spreadMoving: 1.55,
    spreadMax: 5.0,
    spreadPerShot: 0.26,
    spreadRecovery: 5.0,
    recoilPitch: 0.56,
    recoilYaw: 0.12,
    recoilRandom: 0.18,
    recoilRecovery: 11.0,
    kickback: 0.015,
    adsTime: 0.28,
    adsZoom: 1.24,
    scope: 'none',
    reloadTime: 2.06,
    reloadEmptyTime: 2.7,
    drawTime: 0.54,
    holsterTime: 0.42,
    suppressed: false,
    penetrationPower: 1.05,
    weight: 3.6,
    caliber: '5.56x45',
    tracerColor: 0xffc46a,
    tracerEvery: 3,
  },

  // -------------------------------------------------------------------------
  // SMGs
  // -------------------------------------------------------------------------
  {
    // 5 STK, 300 ms. Falls to 7 STK past 30 m — a room-clearing weapon.
    id: 'smg_mp5',
    displayName: 'MP-5A4',
    class: 'smg',
    fireMode: 'auto',
    rpm: 800,
    magSize: 30,
    reserveAmmo: 240,
    damage: 24,
    falloffStart: 14,
    falloffEnd: 32,
    minDamageScale: 0.6,
    spreadHip: 1.9,
    spreadAds: 0.3,
    spreadMoving: 1.05,
    spreadMax: 5.2,
    spreadPerShot: 0.3,
    spreadRecovery: 5.4,
    recoilPitch: 0.34,
    recoilYaw: 0.16,
    recoilRandom: 0.28,
    recoilRecovery: 11.5,
    kickback: 0.011,
    adsTime: 0.19,
    adsZoom: 1.15,
    scope: 'none',
    reloadTime: 1.82,
    reloadEmptyTime: 2.42,
    drawTime: 0.42,
    holsterTime: 0.32,
    suppressed: false,
    penetrationPower: 0.7,
    weight: 2.6,
    caliber: '9x19',
    tracerColor: 0xffd08a,
    tracerEvery: 4,
  },
  {
    // 6 STK, 261 ms. Fastest TTK in the game inside 12 m, nothing past it.
    id: 'smg_vector',
    displayName: 'KRS-45',
    class: 'smg',
    fireMode: 'auto',
    rpm: 1150,
    magSize: 25,
    reserveAmmo: 200,
    damage: 19,
    falloffStart: 11,
    falloffEnd: 26,
    minDamageScale: 0.55,
    spreadHip: 1.7,
    spreadAds: 0.34,
    spreadMoving: 0.95,
    spreadMax: 5.6,
    spreadPerShot: 0.24,
    spreadRecovery: 6.2,
    recoilPitch: 0.24,
    recoilYaw: 0.11,
    recoilRandom: 0.32,
    recoilRecovery: 13.0,
    kickback: 0.009,
    adsTime: 0.17,
    adsZoom: 1.14,
    scope: 'holo',
    reloadTime: 1.74,
    reloadEmptyTime: 2.3,
    drawTime: 0.4,
    holsterTime: 0.3,
    suppressed: false,
    penetrationPower: 0.65,
    weight: 2.7,
    caliber: '.45 ACP',
    tracerColor: 0xffdca0,
    tracerEvery: 5,
  },

  // -------------------------------------------------------------------------
  // LMG
  // -------------------------------------------------------------------------
  {
    // 4 STK, 240 ms, and holds 4 STK to 80 m. Pays for it in handling.
    id: 'lmg_m249',
    displayName: 'M249 SAW',
    class: 'lmg',
    fireMode: 'auto',
    rpm: 750,
    magSize: 100,
    reserveAmmo: 200,
    damage: 30,
    falloffStart: 44,
    falloffEnd: 90,
    minDamageScale: 0.84,
    spreadHip: 4.6,
    spreadAds: 0.34,
    spreadMoving: 2.6,
    spreadMax: 7.6,
    spreadPerShot: 0.3,
    spreadRecovery: 3.2,
    recoilPitch: 0.56,
    recoilYaw: 0.28,
    recoilRandom: 0.5,
    recoilRecovery: 6.2,
    kickback: 0.02,
    adsTime: 0.46,
    adsZoom: 1.18,
    scope: 'none',
    reloadTime: 5.2,
    reloadEmptyTime: 6.1,
    drawTime: 0.86,
    holsterTime: 0.6,
    suppressed: false,
    penetrationPower: 1.6,
    weight: 9.2,
    caliber: '5.56x45',
    tracerColor: 0xff9c3c,
    tracerEvery: 2,
  },

  // -------------------------------------------------------------------------
  // Snipers
  // -------------------------------------------------------------------------
  {
    // One shot, chest up, at any range a human can be resolved at.
    id: 'sniper_bolt',
    displayName: 'L96 BOLT',
    class: 'sniper',
    fireMode: 'bolt',
    rpm: 45,
    magSize: 5,
    reserveAmmo: 35,
    damage: 115,
    falloffStart: 90,
    falloffEnd: 160,
    minDamageScale: 0.88,
    spreadHip: 5.5,
    spreadAds: 0.02,
    spreadMoving: 3.4,
    spreadMax: 7.0,
    spreadPerShot: 0.6,
    spreadRecovery: 2.4,
    recoilPitch: 2.6,
    recoilYaw: 0.4,
    recoilRandom: 0.3,
    recoilRecovery: 4.0,
    kickback: 0.034,
    adsTime: 0.56,
    adsZoom: 4.6,
    scope: 'sniper',
    reloadTime: 2.9,
    reloadEmptyTime: 3.5,
    drawTime: 0.78,
    holsterTime: 0.56,
    suppressed: false,
    penetrationPower: 2.4,
    weight: 6.4,
    caliber: '.338 LM',
    tracerColor: 0xfff0c0,
    tracerEvery: 1,
  },
  {
    // 2 STK to 50 m at a 200 ms trigger cap; 3 STK past 90 m.
    id: 'sniper_dmr',
    displayName: 'MK14 EBR',
    class: 'sniper',
    fireMode: 'semi',
    rpm: 300,
    magSize: 20,
    reserveAmmo: 120,
    damage: 55,
    falloffStart: 52,
    falloffEnd: 95,
    minDamageScale: 0.82,
    spreadHip: 3.4,
    spreadAds: 0.08,
    spreadMoving: 2.2,
    spreadMax: 6.0,
    spreadPerShot: 0.85,
    spreadRecovery: 3.0,
    recoilPitch: 1.3,
    recoilYaw: 0.24,
    recoilRandom: 0.26,
    recoilRecovery: 6.0,
    kickback: 0.026,
    adsTime: 0.4,
    adsZoom: 2.6,
    scope: 'acog',
    reloadTime: 2.5,
    reloadEmptyTime: 3.1,
    drawTime: 0.66,
    holsterTime: 0.5,
    suppressed: false,
    penetrationPower: 2.0,
    weight: 5.1,
    caliber: '7.62x51',
    tracerColor: 0xffe0a0,
    tracerEvery: 1,
  },

  // -------------------------------------------------------------------------
  // Shotgun
  // -------------------------------------------------------------------------
  {
    // 8 pellets x 18. One shot inside 6 m if 6 pellets connect; two to 12 m.
    id: 'shotgun_pump',
    displayName: 'M870 BREACHER',
    class: 'shotgun',
    fireMode: 'pump',
    rpm: 65,
    magSize: 6,
    reserveAmmo: 42,
    damage: 18,
    falloffStart: 6,
    falloffEnd: 17,
    minDamageScale: 0.25,
    pellets: 8,
    spreadHip: 4.6,
    spreadAds: 3.1,
    spreadMoving: 1.2,
    spreadMax: 7.0,
    spreadPerShot: 0.4,
    spreadRecovery: 3.0,
    recoilPitch: 2.5,
    recoilYaw: 0.5,
    recoilRandom: 0.45,
    recoilRecovery: 5.0,
    kickback: 0.038,
    adsTime: 0.3,
    adsZoom: 1.1,
    scope: 'none',
    reloadTime: 0.62,
    reloadEmptyTime: 3.4,
    drawTime: 0.6,
    holsterTime: 0.46,
    suppressed: false,
    penetrationPower: 0.55,
    weight: 3.6,
    caliber: '12 gauge',
    tracerColor: 0xffb060,
    tracerEvery: 0,
  },

  // -------------------------------------------------------------------------
  // Pistols
  // -------------------------------------------------------------------------
  {
    // 4 STK, 400 ms. The fastest thing to bring up in the game.
    id: 'pistol_m19',
    displayName: 'M19 SIDEARM',
    class: 'pistol',
    fireMode: 'semi',
    rpm: 450,
    magSize: 17,
    reserveAmmo: 68,
    damage: 28,
    falloffStart: 16,
    falloffEnd: 34,
    minDamageScale: 0.6,
    spreadHip: 2.2,
    spreadAds: 0.3,
    spreadMoving: 1.1,
    spreadMax: 5.0,
    spreadPerShot: 0.5,
    spreadRecovery: 5.0,
    recoilPitch: 0.92,
    recoilYaw: 0.3,
    recoilRandom: 0.34,
    recoilRecovery: 9.0,
    kickback: 0.017,
    adsTime: 0.16,
    adsZoom: 1.12,
    scope: 'none',
    reloadTime: 1.52,
    reloadEmptyTime: 2.06,
    drawTime: 0.32,
    holsterTime: 0.26,
    suppressed: false,
    penetrationPower: 0.6,
    weight: 1.1,
    caliber: '9x19',
    tracerColor: 0xffd08a,
    tracerEvery: 0,
  },
  {
    // 2 STK, 300 ms. Punishing recoil and six rounds.
    id: 'pistol_revolver',
    displayName: '.44 MAGNUM',
    class: 'pistol',
    fireMode: 'semi',
    rpm: 200,
    magSize: 6,
    reserveAmmo: 30,
    damage: 65,
    falloffStart: 24,
    falloffEnd: 48,
    minDamageScale: 0.62,
    spreadHip: 2.6,
    spreadAds: 0.14,
    spreadMoving: 1.4,
    spreadMax: 5.4,
    spreadPerShot: 1.1,
    spreadRecovery: 3.4,
    recoilPitch: 2.2,
    recoilYaw: 0.6,
    recoilRandom: 0.5,
    recoilRecovery: 5.0,
    kickback: 0.031,
    adsTime: 0.24,
    adsZoom: 1.2,
    scope: 'none',
    reloadTime: 2.6,
    reloadEmptyTime: 2.6,
    drawTime: 0.42,
    holsterTime: 0.34,
    suppressed: false,
    penetrationPower: 1.1,
    weight: 1.6,
    caliber: '.44 MAG',
    tracerColor: 0xffc880,
    tracerEvery: 1,
  },

  // -------------------------------------------------------------------------
  // Launcher
  // -------------------------------------------------------------------------
  {
    id: 'launcher_rpg',
    displayName: 'RPG-7V',
    class: 'launcher',
    fireMode: 'semi',
    rpm: 30,
    magSize: 1,
    reserveAmmo: 3,
    damage: 150,
    falloffStart: 200,
    falloffEnd: 400,
    minDamageScale: 1,
    muzzleVelocity: 44,
    spreadHip: 1.6,
    spreadAds: 0.4,
    spreadMoving: 0.8,
    spreadMax: 2.4,
    spreadPerShot: 0,
    spreadRecovery: 2,
    recoilPitch: 3.2,
    recoilYaw: 0.8,
    recoilRandom: 0.4,
    recoilRecovery: 3.0,
    kickback: 0.05,
    adsTime: 0.42,
    // The launcher's sight is a 2.7x optical unit, like the PGO-7 it is modelled on.
    adsZoom: 2.7,
    scope: 'acog',
    reloadTime: 3.6,
    reloadEmptyTime: 3.6,
    drawTime: 0.8,
    holsterTime: 0.58,
    suppressed: false,
    penetrationPower: 3.0,
    weight: 7.9,
    caliber: '85 mm HEAT',
    tracerColor: 0xff8040,
    tracerEvery: 0,
  },

  // -------------------------------------------------------------------------
  // Melee
  // -------------------------------------------------------------------------
  {
    id: 'melee_knife',
    displayName: 'COMBAT KNIFE',
    class: 'melee',
    fireMode: 'semi',
    rpm: 92,
    magSize: 0,
    reserveAmmo: 0,
    damage: 150,
    falloffStart: 1.6,
    falloffEnd: 2.0,
    minDamageScale: 0.4,
    spreadHip: 0,
    spreadAds: 0,
    spreadMoving: 0,
    spreadMax: 0,
    spreadPerShot: 0,
    spreadRecovery: 1,
    recoilPitch: 0,
    recoilYaw: 0,
    recoilRandom: 0,
    recoilRecovery: 1,
    kickback: 0,
    adsTime: 0.2,
    adsZoom: 1,
    scope: 'none',
    reloadTime: 0,
    reloadEmptyTime: 0,
    drawTime: 0.3,
    holsterTime: 0.24,
    suppressed: true,
    penetrationPower: 0,
    weight: 0.4,
    caliber: 'blade',
    tracerColor: 0xffffff,
    tracerEvery: 0,
  },
];

const BY_ID = new Map<string, WeaponDefinition>(WEAPONS.map((w) => [w.id, w]));

export function getWeaponDef(id: string): WeaponDefinition | undefined {
  return BY_ID.get(id);
}

export function weaponIds(): readonly string[] {
  return WEAPONS.map((w) => w.id);
}

/** Slot 0 is the primary, slot 1 the secondary; the rest are quick-select. */
export const DEFAULT_LOADOUT: readonly string[] = [
  'ar_mk4',
  'pistol_m19',
  'launcher_rpg',
  'melee_knife',
];

// ---------------------------------------------------------------------------
// Recoil patterns
// ---------------------------------------------------------------------------

/**
 * Authored spray patterns, sampled per shot index and scaled by the weapon's
 * `recoilPitch` / `recoilYaw`. Values are multipliers: y is vertical climb, x
 * is horizontal drift. A learnable pattern is one that is nearly deterministic
 * for the first ten rounds and only then hands over to randomness, so each
 * curve is authored dense at the start and flattens out.
 */
export interface RecoilPattern {
  /** [x, y] pairs, one per shot from the start of a burst. */
  readonly points: readonly (readonly [number, number])[];
  /** Blend of the random component once past the authored points, 0..1. */
  readonly randomAfter: number;
}

const PATTERNS: Record<string, RecoilPattern> = {
  // Straight up for four, then a lazy drift right: the reference AR pattern.
  ar_mk4: {
    points: [
      [0, 1],
      [0.05, 1.05],
      [0.12, 1.0],
      [0.24, 0.95],
      [0.4, 0.88],
      [0.55, 0.8],
      [0.66, 0.74],
      [0.72, 0.7],
      [0.74, 0.68],
      [0.7, 0.66],
    ],
    randomAfter: 0.55,
  },
  // Hard climb, then a pronounced left hook — the classic AK "7" shape.
  ar_ak74: {
    points: [
      [0, 1.1],
      [-0.08, 1.15],
      [-0.22, 1.1],
      [-0.42, 1.0],
      [-0.62, 0.9],
      [-0.72, 0.8],
      [-0.6, 0.72],
      [-0.3, 0.68],
      [0.1, 0.66],
      [0.45, 0.64],
      [0.66, 0.62],
    ],
    randomAfter: 0.6,
  },
  // Almost purely vertical: the bullpup's selling point.
  ar_aug: {
    points: [
      [0, 1],
      [0.02, 1.02],
      [0.05, 1.0],
      [0.06, 0.96],
      [0.04, 0.92],
      [0.0, 0.88],
      [-0.04, 0.84],
      [-0.05, 0.82],
    ],
    randomAfter: 0.35,
  },
  ar_famas: {
    points: [
      [0, 1.05],
      [0.08, 1.1],
      [0.16, 1.05],
      [0.1, 0.9],
      [0.0, 0.86],
    ],
    randomAfter: 0.4,
  },
  smg_mp5: {
    points: [
      [0, 0.95],
      [-0.06, 1.0],
      [-0.14, 0.96],
      [-0.18, 0.9],
      [-0.1, 0.86],
      [0.06, 0.84],
      [0.22, 0.82],
      [0.3, 0.8],
    ],
    randomAfter: 0.7,
  },
  smg_vector: {
    points: [
      [0, 0.9],
      [0.07, 0.95],
      [0.16, 0.92],
      [0.2, 0.86],
      [0.15, 0.82],
      [0.02, 0.8],
      [-0.12, 0.78],
    ],
    randomAfter: 0.8,
  },
  // Wanders. Suppressive fire is meant to be sprayed, not tracked.
  lmg_m249: {
    points: [
      [0, 1.05],
      [0.1, 1.0],
      [0.26, 0.94],
      [0.34, 0.88],
      [0.24, 0.84],
      [0.0, 0.82],
      [-0.26, 0.8],
      [-0.4, 0.78],
      [-0.3, 0.76],
      [0.0, 0.75],
      [0.3, 0.74],
    ],
    randomAfter: 0.9,
  },
  sniper_bolt: { points: [[0, 1]], randomAfter: 0.3 },
  sniper_dmr: {
    points: [
      [0, 1],
      [0.14, 1.02],
      [0.26, 1.0],
      [0.3, 0.96],
    ],
    randomAfter: 0.5,
  },
  shotgun_pump: { points: [[0, 1]], randomAfter: 0.5 },
  pistol_m19: {
    points: [
      [0, 1],
      [0.12, 1.02],
      [0.2, 1.0],
      [0.18, 0.96],
    ],
    randomAfter: 0.7,
  },
  pistol_revolver: { points: [[0, 1]], randomAfter: 0.6 },
  launcher_rpg: { points: [[0, 1]], randomAfter: 0.2 },
  melee_knife: { points: [[0, 0]], randomAfter: 0 },
};

const FALLBACK_PATTERN: RecoilPattern = { points: [[0, 1]], randomAfter: 0.8 };

export function recoilPatternFor(weaponId: string): RecoilPattern {
  return PATTERNS[weaponId] ?? FALLBACK_PATTERN;
}

/**
 * Samples the pattern at a fractional shot index so that a very high rpm weapon
 * still walks the authored curve smoothly rather than snapping between points.
 */
export function samplePattern(
  pattern: RecoilPattern,
  shotIndex: number,
  out: { x: number; y: number },
): { x: number; y: number } {
  const pts = pattern.points;
  if (pts.length === 0) {
    out.x = 0;
    out.y = 1;
    return out;
  }
  if (shotIndex <= 0) {
    out.x = pts[0][0];
    out.y = pts[0][1];
    return out;
  }
  if (shotIndex >= pts.length - 1) {
    const last = pts[pts.length - 1];
    out.x = last[0];
    out.y = last[1];
    return out;
  }
  const i = Math.floor(shotIndex);
  const t = shotIndex - i;
  const a = pts[i];
  const b = pts[i + 1];
  out.x = a[0] + (b[0] - a[0]) * t;
  out.y = a[1] + (b[1] - a[1]) * t;
  return out;
}

/** How much of the random component applies at this point in the spray. */
export function patternRandomness(pattern: RecoilPattern, shotIndex: number): number {
  const n = pattern.points.length;
  if (shotIndex <= 1) return pattern.randomAfter * 0.25;
  if (shotIndex >= n) return pattern.randomAfter;
  return pattern.randomAfter * (0.25 + 0.75 * ((shotIndex - 1) / Math.max(1, n - 1)));
}

// ---------------------------------------------------------------------------
// Sound ids emitted by this module
// ---------------------------------------------------------------------------

/**
 * Every non-gunshot sound the weapon system asks for, so the audio module can
 * synthesise the full set up front. Gunshots go through `AudioSystem.gunshot`
 * keyed by weapon id instead.
 */
export const WEAPON_SOUND_IDS: readonly string[] = [
  'weapon_dry_fire',
  'weapon_mag_out',
  'weapon_mag_in',
  'weapon_mag_tap',
  'weapon_bolt_back',
  'weapon_bolt_forward',
  'weapon_bolt_lock',
  'weapon_pump_back',
  'weapon_pump_forward',
  'weapon_shell_insert',
  'weapon_cylinder_open',
  'weapon_cylinder_close',
  'weapon_rocket_load',
  'weapon_draw',
  'weapon_holster',
  'weapon_ads_in',
  'weapon_ads_out',
  'weapon_inspect',
  'weapon_knife_swing',
  'weapon_knife_hit',
  'weapon_melee_butt',
  'weapon_grenade_pin',
  'weapon_grenade_throw',
  'weapon_grenade_bounce',
  'weapon_selector',
];

// ---------------------------------------------------------------------------
// Throwables
// ---------------------------------------------------------------------------

export type ThrowableId = 'frag' | 'flash' | 'smoke';

export interface ThrowableDefinition {
  id: ThrowableId;
  displayName: string;
  /** Seconds from release (or from the start of the cook) to detonation. */
  fuse: number;
  /** True when holding the button cooks the fuse before release. */
  cookable: boolean;
  throwSpeed: number;
  /** Launch elevation added to the aim direction, radians. */
  throwPitch: number;
  radius: number;
  damage: number;
  restitution: number;
  count: number;
}

export const THROWABLES: Record<ThrowableId, ThrowableDefinition> = {
  frag: {
    id: 'frag',
    displayName: 'FRAG GRENADE',
    fuse: 3.5,
    cookable: true,
    throwSpeed: 17,
    throwPitch: 0.12,
    radius: 6.2,
    damage: 135,
    restitution: 0.34,
    count: 2,
  },
  flash: {
    id: 'flash',
    displayName: 'FLASHBANG',
    fuse: 1.9,
    cookable: false,
    throwSpeed: 18.5,
    throwPitch: 0.1,
    radius: 12,
    damage: 6,
    restitution: 0.42,
    count: 2,
  },
  smoke: {
    id: 'smoke',
    displayName: 'SMOKE SCREEN',
    fuse: 1.4,
    cookable: false,
    throwSpeed: 16,
    throwPitch: 0.1,
    radius: 7.5,
    damage: 0,
    restitution: 0.24,
    count: 1,
  },
};
