/**
 * Weapon catalogue. Owner: Opus 2 (behaviour) with Fable 4 owning the models.
 *
 * Every name, manufacturer and marking is invented for this project. Real-world *categories*
 * (service pistol, compact SMG, carbine, shotgun, marksman rifle) inform the handling model,
 * but no existing product, brand or inventory presentation is reproduced.
 */
import type { WeaponFamily, WeaponId } from '../core/Types';

export interface WeaponDef {
  id: WeaponId;
  family: WeaponFamily;
  /** Display name shown on the HUD and loadout. */
  name: string;
  /** Fictional manufacturer. */
  maker: string;
  /** One line of flavour for the loadout screen. */
  blurb: string;
  slot: 'primary' | 'sidearm' | 'melee' | 'utility';
  /** Damage at point blank against an unarmoured torso. */
  damage: number;
  /** Multipliers by hit region. */
  headMultiplier: number;
  limbMultiplier: number;
  /** Rounds per minute. */
  rpm: number;
  /** 'auto' | 'semi' | 'pump' | 'bolt' */
  action: 'auto' | 'semi' | 'pump' | 'bolt' | 'melee' | 'throw';
  magazine: number;
  reserve: number;
  /** Pellets fired per trigger pull. */
  pellets: number;
  /** Base cone half-angle in radians when standing still and aiming. */
  baseSpread: number;
  /** Extra cone applied while hip firing. */
  hipSpread: number;
  /** Extra cone from movement, scaled by the player's move inaccuracy. */
  moveSpread: number;
  /** Cone growth per consecutive shot, and how fast it decays. */
  spreadPerShot: number;
  spreadRecovery: number;
  maxSpread: number;
  /** Vertical and horizontal recoil impulses, radians. */
  recoilPitch: number;
  recoilYaw: number;
  /** Recoil pattern index scaling: later shots climb more. */
  recoilRamp: number;
  /** View-model kick, metres. */
  viewKick: number;
  /** Damage falloff: full damage to `falloffStart`, `falloffEnd` gives `falloffMin` fraction. */
  falloffStart: number;
  falloffEnd: number;
  falloffMin: number;
  /** Maximum trace distance. */
  range: number;
  /** Fraction of damage retained after punching one thin surface. */
  penetration: number;
  /** Seconds. */
  drawTime: number;
  holsterTime: number;
  reloadTime: number;
  reloadEmptyTime: number;
  /** For shell-by-shell reloads. */
  shellReload?: boolean;
  shellTime?: number;
  /** ADS transition time and FOV multiplier. */
  aimTime: number;
  aimFovScale: number;
  /** Audible radius of the report, metres. */
  noise: number;
  /** Movement speed multiplier while equipped. */
  moveScale: number;
  /** Casing ejection. */
  casing: 'pistol' | 'rifle' | 'shotgun' | 'none';
  /** Muzzle flash family. */
  flash: 'small' | 'medium' | 'large' | 'none';
  /** HUD accent colour. */
  tint: number;
  /** Number of icons/marks used by the UI. */
  iconPath: string;
}

const P = Math.PI / 180;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  'vk7-sidearm': {
    id: 'vk7-sidearm',
    family: 'pistol',
    name: 'VK-7 Kestrel',
    maker: 'Vulkan Defence Works',
    blurb: 'Polymer-framed 9 mm service pistol. Always carried, never chosen.',
    slot: 'sidearm',
    damage: 26,
    headMultiplier: 3.6,
    limbMultiplier: 0.72,
    rpm: 400,
    action: 'semi',
    magazine: 17,
    reserve: 68,
    pellets: 1,
    baseSpread: 0.42 * P,
    hipSpread: 1.1 * P,
    moveSpread: 3.4 * P,
    spreadPerShot: 0.55 * P,
    spreadRecovery: 5.5 * P,
    maxSpread: 5.5 * P,
    recoilPitch: 0.0105,
    recoilYaw: 0.0026,
    recoilRamp: 0.1,
    viewKick: 0.016,
    falloffStart: 14,
    falloffEnd: 42,
    falloffMin: 0.6,
    range: 90,
    penetration: 0.32,
    drawTime: 0.42,
    holsterTime: 0.3,
    reloadTime: 1.55,
    reloadEmptyTime: 2.1,
    aimTime: 0.15,
    aimFovScale: 0.86,
    noise: 46,
    moveScale: 1.0,
    casing: 'pistol',
    flash: 'small',
    tint: 0x9ec6ff,
    iconPath: 'pistol',
  },

  'wraith-9': {
    id: 'wraith-9',
    family: 'smg',
    name: 'Wraith 9C',
    maker: 'Sedgewick Arms',
    blurb: 'Compact 9 mm submachine gun. Fast into the shoulder, forgiving in doorways.',
    slot: 'primary',
    damage: 25,
    headMultiplier: 3.1,
    limbMultiplier: 0.76,
    rpm: 800,
    action: 'auto',
    magazine: 30,
    reserve: 120,
    pellets: 1,
    baseSpread: 0.5 * P,
    hipSpread: 1.5 * P,
    moveSpread: 3.0 * P,
    spreadPerShot: 0.34 * P,
    spreadRecovery: 6.5 * P,
    maxSpread: 6.5 * P,
    recoilPitch: 0.0072,
    recoilYaw: 0.0024,
    recoilRamp: 0.055,
    viewKick: 0.011,
    falloffStart: 12,
    falloffEnd: 34,
    falloffMin: 0.55,
    range: 80,
    penetration: 0.3,
    drawTime: 0.5,
    holsterTime: 0.34,
    reloadTime: 1.9,
    reloadEmptyTime: 2.5,
    aimTime: 0.16,
    aimFovScale: 0.84,
    noise: 52,
    moveScale: 0.98,
    casing: 'pistol',
    flash: 'medium',
    tint: 0x8fd6ff,
    iconPath: 'smg',
  },

  'lynx-mk4': {
    id: 'lynx-mk4',
    family: 'carbine',
    name: 'Lynx Mk4',
    maker: 'Halden Systems',
    blurb: 'Short-barrelled 5.6 mm entry carbine. The default answer to a defended corridor.',
    slot: 'primary',
    damage: 33,
    headMultiplier: 3.4,
    limbMultiplier: 0.78,
    rpm: 660,
    action: 'auto',
    magazine: 30,
    reserve: 120,
    pellets: 1,
    baseSpread: 0.28 * P,
    hipSpread: 1.9 * P,
    moveSpread: 3.6 * P,
    spreadPerShot: 0.42 * P,
    spreadRecovery: 5.8 * P,
    maxSpread: 7.0 * P,
    recoilPitch: 0.0098,
    recoilYaw: 0.0031,
    recoilRamp: 0.08,
    viewKick: 0.015,
    falloffStart: 26,
    falloffEnd: 62,
    falloffMin: 0.62,
    range: 140,
    penetration: 0.55,
    drawTime: 0.58,
    holsterTime: 0.38,
    reloadTime: 2.15,
    reloadEmptyTime: 2.85,
    aimTime: 0.19,
    aimFovScale: 0.78,
    noise: 62,
    moveScale: 0.95,
    casing: 'rifle',
    flash: 'medium',
    tint: 0x7fe0c0,
    iconPath: 'carbine',
  },

  'boreas-12': {
    id: 'boreas-12',
    family: 'shotgun',
    name: 'Boreas 12',
    maker: 'Boreas Ordnance',
    blurb: 'Semi-automatic 12-gauge. Devastating inside eight metres, useless past twenty.',
    slot: 'primary',
    damage: 15,
    headMultiplier: 2.0,
    limbMultiplier: 0.85,
    rpm: 190,
    action: 'semi',
    magazine: 7,
    reserve: 32,
    pellets: 9,
    baseSpread: 2.4 * P,
    hipSpread: 1.6 * P,
    moveSpread: 2.0 * P,
    spreadPerShot: 0.5 * P,
    spreadRecovery: 4.0 * P,
    maxSpread: 6.5 * P,
    recoilPitch: 0.036,
    recoilYaw: 0.005,
    recoilRamp: 0.02,
    viewKick: 0.05,
    falloffStart: 7,
    falloffEnd: 22,
    falloffMin: 0.16,
    range: 40,
    penetration: 0.1,
    drawTime: 0.66,
    holsterTime: 0.42,
    reloadTime: 0.6,
    reloadEmptyTime: 0.85,
    shellReload: true,
    shellTime: 0.46,
    aimTime: 0.22,
    aimFovScale: 0.9,
    noise: 70,
    moveScale: 0.93,
    casing: 'shotgun',
    flash: 'large',
    tint: 0xffb46a,
    iconPath: 'shotgun',
  },

  'meridian-dmr': {
    id: 'meridian-dmr',
    family: 'dmr',
    name: 'Meridian LR',
    maker: 'Meridian Precision',
    blurb: 'Semi-automatic 7.6 mm marksman rifle. Built for the two long lanes in this building.',
    slot: 'primary',
    damage: 78,
    headMultiplier: 2.6,
    limbMultiplier: 0.6,
    rpm: 210,
    action: 'semi',
    magazine: 12,
    reserve: 48,
    pellets: 1,
    baseSpread: 0.06 * P,
    hipSpread: 3.6 * P,
    moveSpread: 6.0 * P,
    spreadPerShot: 0.9 * P,
    spreadRecovery: 5.0 * P,
    maxSpread: 8.0 * P,
    recoilPitch: 0.031,
    recoilYaw: 0.0038,
    recoilRamp: 0.14,
    viewKick: 0.042,
    falloffStart: 60,
    falloffEnd: 120,
    falloffMin: 0.78,
    range: 200,
    penetration: 0.78,
    drawTime: 0.78,
    holsterTime: 0.46,
    reloadTime: 2.4,
    reloadEmptyTime: 3.1,
    aimTime: 0.3,
    aimFovScale: 0.42,
    noise: 82,
    moveScale: 0.9,
    casing: 'rifle',
    flash: 'large',
    tint: 0xffd27f,
    iconPath: 'dmr',
  },

  'talon-knife': {
    id: 'talon-knife',
    family: 'melee',
    name: 'Talon CQ',
    maker: 'Talon Field Tools',
    blurb: 'Coated tanto blade. Silent, and the only thing that never runs out.',
    slot: 'melee',
    damage: 55,
    headMultiplier: 2.2,
    limbMultiplier: 0.8,
    rpm: 96,
    action: 'melee',
    magazine: 0,
    reserve: 0,
    pellets: 1,
    baseSpread: 0,
    hipSpread: 0,
    moveSpread: 0,
    spreadPerShot: 0,
    spreadRecovery: 0,
    maxSpread: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    recoilRamp: 0,
    viewKick: 0.03,
    falloffStart: 1.6,
    falloffEnd: 1.9,
    falloffMin: 0,
    range: 1.9,
    penetration: 0,
    drawTime: 0.3,
    holsterTime: 0.22,
    reloadTime: 0,
    reloadEmptyTime: 0,
    aimTime: 0.12,
    aimFovScale: 1,
    noise: 4,
    moveScale: 1.05,
    casing: 'none',
    flash: 'none',
    tint: 0xc7d2da,
    iconPath: 'knife',
  },

  'flash-device': {
    id: 'flash-device',
    family: 'throwable',
    name: 'AURORA Flash',
    maker: 'Vulkan Defence Works',
    blurb: 'Non-lethal diversion charge. Blinds and disorients anything with line of sight.',
    slot: 'utility',
    damage: 0,
    headMultiplier: 1,
    limbMultiplier: 1,
    rpm: 40,
    action: 'throw',
    magazine: 1,
    reserve: 1,
    pellets: 1,
    baseSpread: 0,
    hipSpread: 0,
    moveSpread: 0,
    spreadPerShot: 0,
    spreadRecovery: 0,
    maxSpread: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    recoilRamp: 0,
    viewKick: 0.02,
    falloffStart: 0,
    falloffEnd: 0,
    falloffMin: 0,
    range: 20,
    penetration: 0,
    drawTime: 0.4,
    holsterTime: 0.3,
    reloadTime: 0.7,
    reloadEmptyTime: 0.7,
    aimTime: 0.14,
    aimFovScale: 1,
    noise: 60,
    moveScale: 1.02,
    casing: 'none',
    flash: 'none',
    tint: 0xfff0b0,
    iconPath: 'flash',
  },

  'smoke-device': {
    id: 'smoke-device',
    family: 'throwable',
    name: 'CINDER Smoke',
    maker: 'Boreas Ordnance',
    blurb: 'Cold-burn obscurant. Ten seconds of cover across an open lane.',
    slot: 'utility',
    damage: 0,
    headMultiplier: 1,
    limbMultiplier: 1,
    rpm: 40,
    action: 'throw',
    magazine: 1,
    reserve: 1,
    pellets: 1,
    baseSpread: 0,
    hipSpread: 0,
    moveSpread: 0,
    spreadPerShot: 0,
    spreadRecovery: 0,
    maxSpread: 0,
    recoilPitch: 0,
    recoilYaw: 0,
    recoilRamp: 0,
    viewKick: 0.02,
    falloffStart: 0,
    falloffEnd: 0,
    falloffMin: 0,
    range: 20,
    penetration: 0,
    drawTime: 0.4,
    holsterTime: 0.3,
    reloadTime: 0.7,
    reloadEmptyTime: 0.7,
    aimTime: 0.14,
    aimFovScale: 1,
    noise: 20,
    moveScale: 1.02,
    casing: 'none',
    flash: 'none',
    tint: 0xbfc8cf,
    iconPath: 'smoke',
  },
};

export const PRIMARY_CHOICES: WeaponId[] = ['lynx-mk4', 'wraith-9', 'boreas-12', 'meridian-dmr'];
export const UTILITY_CHOICES: WeaponId[] = ['flash-device', 'smoke-device'];
export const ALWAYS_CARRIED: WeaponId[] = ['vk7-sidearm', 'talon-knife'];

export function weaponDef(id: WeaponId): WeaponDef {
  return WEAPONS[id];
}

/** Normalised 0..1 stat bars for the loadout screen. */
export function weaponStats(d: WeaponDef): { label: string; value: number; text: string }[] {
  const dps = (d.damage * d.pellets * d.rpm) / 60;
  return [
    { label: 'Damage', value: Math.min(1, (d.damage * d.pellets) / 140), text: `${d.damage}${d.pellets > 1 ? ` x${d.pellets}` : ''}` },
    { label: 'Rate of fire', value: Math.min(1, d.rpm / 850), text: `${d.rpm} rpm` },
    { label: 'Sustained', value: Math.min(1, dps / 420), text: `${Math.round(dps)} dps` },
    { label: 'Accuracy', value: Math.max(0.05, 1 - d.baseSpread / (3 * P)), text: `${(d.baseSpread / P).toFixed(2)}\u00b0` },
    { label: 'Control', value: Math.max(0.05, 1 - d.recoilPitch / 0.04), text: `${(d.recoilPitch * 1000).toFixed(1)}` },
    { label: 'Effective range', value: Math.min(1, d.falloffEnd / 120), text: `${d.falloffStart}\u2013${d.falloffEnd} m` },
    { label: 'Penetration', value: d.penetration, text: `${Math.round(d.penetration * 100)}%` },
    { label: 'Magazine', value: Math.min(1, d.magazine / 30), text: `${d.magazine} + ${d.reserve}` },
    { label: 'Mobility', value: Math.max(0.05, (d.moveScale - 0.85) / 0.2), text: `${Math.round(d.moveScale * 100)}%` },
    { label: 'Report', value: Math.min(1, d.noise / 90), text: `${d.noise} m` },
  ];
}
