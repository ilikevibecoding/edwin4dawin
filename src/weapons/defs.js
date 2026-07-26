/**
 * WEAPON DEFINITIONS
 * Owner: Opus 2 (ballistics & handling), models by Fable 4.
 *
 * Original fictional manufacturers, no real-world or Counter-Strike branding:
 *   Vasco Defence      — VSC-9 service pistol
 *   Kestrel Arms       — K-7 compact submachine gun
 *   Northwind Systems  — NW-4 tactical carbine
 *   Borealis Ordnance  — B-12 semi-automatic shotgun
 *   Meridian Precision — M-700 precision rifle
 *   Talon Edge         — TX tactical knife
 *   Halo / Veil        — issued flash and smoke devices
 *
 * Damage is authored for the "hard" difficulty baseline; difficulty scaling is
 * applied by src/mission/difficulty.js, never inside these numbers.
 */

export const WEAPON_SLOTS = { PRIMARY: 1, SECONDARY: 2, MELEE: 3, UTILITY: 4 };

export const WEAPONS = {
  'pistol.vsc9': {
    id: 'pistol.vsc9',
    name: 'VSC-9',
    fullName: 'Vasco Defence VSC-9',
    category: 'pistol', family: 'pistol', slot: WEAPON_SLOTS.SECONDARY,
    description: 'Polymer-framed 9 mm service sidearm. Reliable, quiet to carry, unforgiving at range.',
    damage: 28, headMultiplier: 3.6, limbMultiplier: 0.8, armorPenetration: 0.42,
    rpm: 420, auto: false, magazine: 15, reserve: 75, reloadTime: 1.65, reloadEmptyTime: 2.2,
    drawTime: 0.42, holsterTime: 0.32,
    spreadStand: 0.32, spreadMove: 1.5, spreadCrouch: 0.2, spreadAds: 0.12, spreadJump: 4.2,
    recoilPitch: 1.65, recoilYaw: 0.55, recoilRecovery: 9.5, recoilPattern: 'pistol',
    range: 55, falloffStart: 18, falloffEnd: 52, falloffMin: 0.45,
    penetration: 0.4, muzzleVelocity: 360,
    adsFov: 62, adsTime: 0.2, moveSpeedScale: 1.0, adsSpeedScale: 0.72,
    shellSize: 0.009, noise: 42, weight: 0.8,
    sounds: { fire: 'wpn.pistol.fire', tail: 'wpn.pistol.tail', reload: 'wpn.pistol.reload', dry: 'wpn.dry' },
    hudIcon: 'pistol',
  },
  'smg.kestrel': {
    id: 'smg.kestrel',
    name: 'Kestrel K-7',
    fullName: 'Kestrel Arms K-7 PDW',
    category: 'smg', family: 'smg', slot: WEAPON_SLOTS.PRIMARY,
    description: 'Compact 9 mm PDW. Fast handling in stairwells and doorways, weak past twenty metres.',
    damage: 24, headMultiplier: 2.7, limbMultiplier: 0.85, armorPenetration: 0.38,
    rpm: 780, auto: true, magazine: 30, reserve: 120, reloadTime: 2.05, reloadEmptyTime: 2.65,
    drawTime: 0.52, holsterTime: 0.38,
    spreadStand: 0.5, spreadMove: 2.0, spreadCrouch: 0.32, spreadAds: 0.2, spreadJump: 5.5,
    recoilPitch: 1.05, recoilYaw: 0.5, recoilRecovery: 11, recoilPattern: 'smg',
    range: 48, falloffStart: 14, falloffEnd: 40, falloffMin: 0.4,
    penetration: 0.35, muzzleVelocity: 400,
    adsFov: 60, adsTime: 0.22, moveSpeedScale: 0.96, adsSpeedScale: 0.66,
    shellSize: 0.009, noise: 46, weight: 2.6,
    sounds: { fire: 'wpn.smg.fire', tail: 'wpn.smg.tail', reload: 'wpn.smg.reload', dry: 'wpn.dry' },
    hudIcon: 'smg',
  },
  'rifle.northwind': {
    id: 'rifle.northwind',
    name: 'Northwind NW-4',
    fullName: 'Northwind Systems NW-4 Carbine',
    category: 'rifle', family: 'rifle', slot: WEAPON_SLOTS.PRIMARY,
    description: 'Standard 5.56 entry carbine. The balanced choice for a two-hostage rescue.',
    damage: 33, headMultiplier: 3.1, limbMultiplier: 0.82, armorPenetration: 0.62,
    rpm: 660, auto: true, magazine: 30, reserve: 120, reloadTime: 2.25, reloadEmptyTime: 2.95,
    drawTime: 0.58, holsterTime: 0.42,
    spreadStand: 0.42, spreadMove: 1.85, spreadCrouch: 0.24, spreadAds: 0.1, spreadJump: 5.0,
    recoilPitch: 1.45, recoilYaw: 0.42, recoilRecovery: 9, recoilPattern: 'rifle',
    range: 90, falloffStart: 32, falloffEnd: 78, falloffMin: 0.58,
    penetration: 0.72, muzzleVelocity: 880,
    adsFov: 55, adsTime: 0.25, moveSpeedScale: 0.93, adsSpeedScale: 0.62,
    shellSize: 0.0102, noise: 58, weight: 3.4,
    sounds: { fire: 'wpn.rifle.fire', tail: 'wpn.rifle.tail', reload: 'wpn.rifle.reload', dry: 'wpn.dry' },
    hudIcon: 'rifle',
  },
  'shotgun.borealis': {
    id: 'shotgun.borealis',
    name: 'Borealis B-12',
    fullName: 'Borealis Ordnance B-12',
    category: 'shotgun', family: 'shotgun', slot: WEAPON_SLOTS.PRIMARY,
    description: 'Semi-automatic 12-gauge. Decisive in doorways, useless across the lobby.',
    damage: 13, pellets: 9, headMultiplier: 1.9, limbMultiplier: 0.9, armorPenetration: 0.3,
    rpm: 220, auto: false, magazine: 7, reserve: 32, reloadTime: 0.62, reloadEmptyTime: 0.62,
    shellReload: true, reloadStartTime: 0.42, reloadEndTime: 0.5,
    drawTime: 0.66, holsterTime: 0.46,
    spreadStand: 1.6, spreadMove: 3.0, spreadCrouch: 1.25, spreadAds: 1.0, spreadJump: 6.0,
    pelletSpread: 2.6, adsPelletSpread: 1.7,
    recoilPitch: 4.4, recoilYaw: 0.9, recoilRecovery: 6.5, recoilPattern: 'shotgun',
    range: 32, falloffStart: 6, falloffEnd: 24, falloffMin: 0.15,
    penetration: 0.18, muzzleVelocity: 400,
    adsFov: 64, adsTime: 0.26, moveSpeedScale: 0.9, adsSpeedScale: 0.6,
    shellSize: 0.0185, noise: 68, weight: 3.6,
    sounds: { fire: 'wpn.shotgun.fire', tail: 'wpn.shotgun.tail', reload: 'wpn.shotgun.shell', dry: 'wpn.dry' },
    hudIcon: 'shotgun',
  },
  'dmr.meridian': {
    id: 'dmr.meridian',
    name: 'Meridian M-700',
    fullName: 'Meridian Precision M-700',
    category: 'dmr', family: 'dmr', slot: WEAPON_SLOTS.PRIMARY,
    description: 'Scoped 7.62 marksman rifle for the north corridor and the lobby sightline.',
    damage: 82, headMultiplier: 2.4, limbMultiplier: 0.7, armorPenetration: 0.85,
    rpm: 55, auto: false, magazine: 5, reserve: 30, reloadTime: 2.9, reloadEmptyTime: 3.4,
    boltAction: true, boltTime: 1.05,
    drawTime: 0.78, holsterTime: 0.5,
    spreadStand: 1.4, spreadMove: 3.6, spreadCrouch: 0.8, spreadAds: 0.02, spreadJump: 8,
    recoilPitch: 5.2, recoilYaw: 0.5, recoilRecovery: 5.5, recoilPattern: 'dmr',
    range: 180, falloffStart: 80, falloffEnd: 170, falloffMin: 0.8,
    penetration: 0.9, muzzleVelocity: 830,
    adsFov: 22, adsTime: 0.38, scoped: true, moveSpeedScale: 0.88, adsSpeedScale: 0.42,
    shellSize: 0.0125, noise: 78, weight: 4.8,
    sounds: { fire: 'wpn.dmr.fire', tail: 'wpn.dmr.tail', reload: 'wpn.dmr.reload', dry: 'wpn.dry' },
    hudIcon: 'dmr',
  },
  'knife.talon': {
    id: 'knife.talon',
    name: 'Talon TX',
    fullName: 'Talon Edge TX Tactical Knife',
    category: 'melee', family: 'melee', slot: WEAPON_SLOTS.MELEE,
    description: 'Issued blade. Silent, and the only option once every magazine is dry.',
    damage: 58, backstabDamage: 190, headMultiplier: 1.4, limbMultiplier: 1, armorPenetration: 0.9,
    rpm: 92, auto: false, magazine: 0, reserve: 0, reloadTime: 0,
    drawTime: 0.3, holsterTime: 0.24,
    meleeRange: 1.5, meleeArc: 0.7,
    spreadStand: 0, spreadMove: 0, spreadCrouch: 0, spreadAds: 0, spreadJump: 0,
    recoilPitch: 0.5, recoilYaw: 0.6, recoilRecovery: 12, recoilPattern: 'none',
    range: 1.5, penetration: 0, moveSpeedScale: 1.06, adsSpeedScale: 1.0,
    noise: 6, weight: 0.3,
    sounds: { fire: 'wpn.knife.swing', hit: 'wpn.knife.hit', dry: 'wpn.knife.swing' },
    hudIcon: 'knife',
  },
  'flash.halo': {
    id: 'flash.halo',
    name: 'Halo Flash',
    fullName: 'Halo M2 Diversionary Device',
    category: 'utility', family: 'grenade', slot: WEAPON_SLOTS.UTILITY,
    description: 'Nine-bang diversionary device. Blinds and deafens without harming hostages.',
    damage: 0, magazine: 2, reserve: 0, fuse: 1.55, effectRadius: 9.5, blindDuration: 4.2,
    drawTime: 0.42, holsterTime: 0.3, throwForce: 12.5, cookable: true,
    noise: 90, weight: 0.4,
    sounds: { fire: 'nade.throw', detonate: 'nade.flash', bounce: 'nade.bounce' },
    hudIcon: 'flash',
  },
  'smoke.veil': {
    id: 'smoke.veil',
    name: 'Veil Smoke',
    fullName: 'Veil S4 Screening Device',
    category: 'utility', family: 'grenade', slot: WEAPON_SLOTS.UTILITY,
    description: 'Screening smoke for crossing the lobby and the north corridor sightline.',
    damage: 0, magazine: 2, reserve: 0, fuse: 1.9, effectRadius: 5.2, smokeDuration: 16,
    drawTime: 0.42, holsterTime: 0.3, throwForce: 11.5, cookable: false,
    noise: 55, weight: 0.5,
    sounds: { fire: 'nade.throw', detonate: 'nade.smoke', bounce: 'nade.bounce' },
    hudIcon: 'smoke',
  },
};

/** Recoil patterns: normalised [pitch, yaw] per shot index, looped after the end. */
export const RECOIL_PATTERNS = {
  none: [[0, 0]],
  pistol: [[1, 0], [1, 0.25], [0.95, -0.3], [1.05, 0.4], [0.9, -0.5], [1, 0.6], [0.95, -0.55]],
  smg: [
    [1, 0], [1, 0.12], [1, -0.18], [0.95, 0.3], [0.9, -0.35], [0.85, 0.45], [0.8, -0.5],
    [0.75, 0.6], [0.7, -0.62], [0.68, 0.55], [0.65, -0.45], [0.62, 0.4],
  ],
  rifle: [
    [1, 0], [1.05, 0.06], [1.05, -0.1], [1, 0.22], [0.95, -0.3], [0.9, 0.42], [0.86, -0.5],
    [0.8, 0.6], [0.76, -0.66], [0.72, 0.7], [0.68, -0.72], [0.64, 0.62], [0.6, -0.55],
    [0.58, 0.45], [0.55, -0.38],
  ],
  shotgun: [[1, 0], [1, 0.2], [1, -0.22]],
  dmr: [[1, 0], [1, 0.1]],
};

export const LOADOUT_PRESETS = [
  {
    id: 'breacher', name: 'Breacher',
    summary: 'Close-quarters entry package for the vestibule, stairwell and executive corridor.',
    primary: 'shotgun.borealis', secondary: 'pistol.vsc9', utility: ['flash.halo', 'smoke.veil'],
    armor: 100, extraFlash: 1,
  },
  {
    id: 'assault', name: 'Assault',
    summary: 'Balanced carbine loadout. The recommended choice for a first run.',
    primary: 'rifle.northwind', secondary: 'pistol.vsc9', utility: ['flash.halo', 'smoke.veil'],
    armor: 100, recommended: true,
  },
  {
    id: 'infiltrator', name: 'Infiltrator',
    summary: 'Light and quiet. Faster movement, less margin for error in a firefight.',
    primary: 'smg.kestrel', secondary: 'pistol.vsc9', utility: ['smoke.veil', 'smoke.veil'],
    armor: 65, speedBonus: 0.08,
  },
  {
    id: 'marksman', name: 'Marksman',
    summary: 'Precision rifle for the long north corridor and the lobby. Punishing up close.',
    primary: 'dmr.meridian', secondary: 'pistol.vsc9', utility: ['flash.halo', 'smoke.veil'],
    armor: 85,
  },
];

export function weaponById(id) {
  return WEAPONS[id] ?? null;
}

export function shotInterval(w) {
  return 60 / (w.rpm || 60);
}
