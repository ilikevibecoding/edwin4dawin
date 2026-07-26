import { WEAPONS as MODELS } from '../characters/weapons-models.js';

// ---------------------------------------------------------------------------
// Weapon definition table.  (owner: opus2)
//
// This file is the SINGLE SOURCE OF TRUTH for every gameplay number a weapon
// has. `src/characters/weapons-models.js` (owner: fable4) owns the art, the
// display names, the manufacturers and the magazine capacities; we import that
// table and hang tuning on top of it so the two can never disagree.
//
// Conventions
//   * Distances / thicknesses: metres.  Times: seconds.  Angles: DEGREES in
//     this table (the weapon system converts to radians once, at the point of
//     use) because degrees are what a designer wants to read and what the
//     text-state dump reports.
//   * Damage is "per projectile at point blank against an unarmoured chest".
//     The final number is  damage x regionMultiplier x falloff x armour.
//   * `recoil.pattern` is a fixed, hand-authored list of per-shot
//     [pitchDeg, yawDeg] increments. It is indexed by the shot counter, so the
//     same trigger pull always produces the same climb — no RNG anywhere in
//     recoil. Past the end of the pattern the last entry repeats with its yaw
//     mirrored on alternate shots, which keeps long sprays from marching off
//     in one direction forever.
//   * Both recovery delays (`recoil.recoverDelay` and `spread.recoveryDelay`)
//     are deliberately LONGER than the weapon's shot interval. If they were
//     shorter, recovery would run between every round of a burst and quietly
//     cancel out both the recoil pattern and the firing bloom, so sustained
//     fire would cost the player nothing.
//   * Every timer here is consumed by a fixed-1/120s accumulator, so
//     `window.advanceTime(ms)` reproduces results exactly.
// ---------------------------------------------------------------------------

/** Inventory slots, in selection order. Slot N = SLOT_ORDER[N-1]. */
export const SLOT_ORDER = ['primary', 'secondary', 'melee', 'flash', 'smoke'];

/** Which slot each weapon kind is allowed to occupy. */
export const SLOT_OF_KIND = {
  carbine: 'primary',
  smg: 'primary',
  shotgun: 'primary',
  sniper: 'primary',
  pistol: 'secondary',
  knife: 'melee',
  flash: 'flash',
  smoke: 'smoke',
};

export const FIRE_MODE = { SEMI: 'semi', AUTO: 'auto', PUMP: 'pump', BOLT: 'bolt', MELEE: 'melee', THROW: 'throw' };

/**
 * Per-region damage multipliers. Region names match what the character rigs
 * expose in `hitRegions` (see src/characters/enemy-model.js).
 */
export const HIT_REGION_MULTIPLIERS = {
  head: 4.0,
  neck: 2.0,
  chest: 1.0,
  stomach: 1.25,
  arm_l: 0.75,
  arm_r: 0.75,
  leg_l: 0.75,
  leg_r: 0.75,
  limb: 0.75,
  body: 1.0,
};

/** Multiplier for a region name, tolerant of whatever the rigs call limbs. */
export function regionMultiplier(name) {
  if (!name) return 1;
  const key = String(name).toLowerCase();
  if (HIT_REGION_MULTIPLIERS[key] !== undefined) return HIT_REGION_MULTIPLIERS[key];
  if (key.includes('head') || key.includes('skull')) return HIT_REGION_MULTIPLIERS.head;
  if (key.includes('neck') || key.includes('throat')) return HIT_REGION_MULTIPLIERS.neck;
  if (key.includes('stomach') || key.includes('abdomen') || key.includes('spine')) return HIT_REGION_MULTIPLIERS.stomach;
  if (key.includes('chest') || key.includes('torso')) return HIT_REGION_MULTIPLIERS.chest;
  if (key.includes('arm') || key.includes('leg') || key.includes('hand') || key.includes('foot') || key.includes('thigh')) {
    return HIT_REGION_MULTIPLIERS.limb;
  }
  return 1;
}

// ---------------------------------------------------------------- penetration

/**
 * Wall penetration gate. A bullet may only continue through a material when
 * ALL of these hold, which is what keeps it from ever crossing solid concrete
 * or two thick walls:
 *   1. `SURFACE_PROPS[surface].penetration >= MIN_SURFACE_PENETRATION`
 *      (excludes concrete 0.12, metal 0.2, tile 0.25, carpet 0.3, electronic 0.4)
 *   2. the measured slab thickness <= the weapon's `penetration.maxThickness`
 *      (interior partitions are 0.1 m, exterior walls 0.24 m, floor slabs
 *      0.3-0.5 m, so only interior partitions and doors ever qualify)
 *   3. the running cost budget still has room, where a slab costs
 *      `thickness * (0.55 / surfacePenetration)` — i.e. metres of
 *      drywall-equivalent
 *   4. fewer than `penetration.maxCount` penetrations so far on this bullet
 */
export const MIN_SURFACE_PENETRATION = 0.45;

/** Reference surface penetration (drywall) that normalises the cost budget. */
export const PENETRATION_REFERENCE = 0.55;

// ------------------------------------------------------------------- helpers

/** Piecewise-linear falloff lookup. `curve` is [[metres, multiplier], ...]. */
export function falloffAt(curve, distance) {
  if (!curve || !curve.length) return 1;
  if (distance <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [d1, m1] = curve[i];
    if (distance <= d1) {
      const [d0, m0] = curve[i - 1];
      const span = d1 - d0;
      const t = span > 1e-6 ? (distance - d0) / span : 1;
      return m0 + (m1 - m0) * t;
    }
  }
  return curve[curve.length - 1][1];
}

/** Damage a single projectile from `def` does at `distance` metres. */
export function damageAtRange(def, distance) {
  return (def.damage || 0) * falloffAt(def.falloff, distance);
}

/**
 * Per-shot recoil increment, in degrees. Indexed past the end of the authored
 * pattern by repeating the tail with an alternating yaw sign.
 */
export function recoilStep(def, shotIndex) {
  const pattern = def.recoil?.pattern;
  if (!pattern || !pattern.length) return { pitch: 0, yaw: 0 };
  if (shotIndex < pattern.length) {
    const [pitch, yaw] = pattern[shotIndex];
    return { pitch, yaw };
  }
  const [pitch, yaw] = pattern[pattern.length - 1];
  // Mirror the yaw on alternate overflow shots so long sprays wander instead
  // of drifting off-screen, but stay perfectly deterministic.
  const flip = (shotIndex - pattern.length) % 2 === 0 ? -1 : 1;
  return { pitch: pitch * 0.85, yaw: yaw * flip };
}

/** Seconds between shots for a firearm. */
export function shotInterval(def) {
  if (def.rpm > 0) return 60 / def.rpm;
  return def.cycleTime || 0.5;
}

// =========================================================================
// The table
// =========================================================================

/** Shared audio-id shape so a missing sound is always obvious, never silent. */
function audio(prefix, { shell = 'shell_rifle', suppressed = false } = {}) {
  return {
    fire: `${prefix}_fire`,
    fireSuppressed: suppressed ? `${prefix}_fire_suppressed` : null,
    tail: `${prefix}_tail`,
    dry: 'weapon_dry',
    reloadStart: `${prefix}_reload_start`,
    magOut: `${prefix}_mag_out`,
    magIn: `${prefix}_mag_in`,
    reloadEnd: `${prefix}_reload_end`,
    cycle: `${prefix}_cycle`,
    draw: `${prefix}_draw`,
    holster: 'weapon_holster',
    modeSwitch: 'weapon_mode_switch',
    inspect: `${prefix}_inspect`,
    shell,
  };
}

const DEFS = {
  // ------------------------------------------------------------- NW-9 (pistol)
  pistol: {
    slot: 'secondary',
    fireModes: [FIRE_MODE.SEMI],
    modeSwitchable: false,
    rpm: 450,
    reserve: 60,
    maxReserve: 105,
    damage: 26,
    falloff: [[0, 1], [12, 1], [26, 0.72], [45, 0.55], [80, 0.5]],
    armorPenetration: 0.25,
    penetration: { power: 0.14, maxThickness: 0.12, maxCount: 1 },
    spread: {
      standing: 0.45, crouched: 0.3, moving: 2.1, jumping: 5.5, ads: 0.14,
      perShot: 0.55, max: 4.5, recovery: 5.0, recoveryDelay: 0.18,
    },
    recoil: {
      // Short sharp climb, walks slightly right then settles.
      pattern: [
        [0.95, 0.10], [1.05, -0.18], [1.10, 0.24], [1.05, 0.30],
        [0.98, -0.14], [0.92, -0.30], [0.88, 0.20], [0.85, 0.34],
      ],
      recovery: 11.0, recoverFraction: 0.92, recoverDelay: 0.17,
      viewPunchPitch: 0.34, viewPunchYaw: 0.16,
    },
    ads: { time: 0.19, fovMultiplier: 0.90 },
    drawTime: 0.28, holsterTime: 0.20,
    reload: { tactical: 1.65, tacticalAmmoAt: 1.05, empty: 2.15, emptyAmmoAt: 1.35 },
    moveMultiplier: 1.0, adsMoveMultiplier: 0.72,
    loudness: 1.0, noiseRadius: 34,
    tracerEvery: 3,
    audio: audio('weapon_nw9', { shell: 'shell_pistol' }),
  },

  // -------------------------------------------------------------- VK-7 (smg)
  smg: {
    slot: 'primary',
    fireModes: [FIRE_MODE.AUTO, FIRE_MODE.SEMI],
    modeSwitchable: true,
    rpm: 850,
    reserve: 120,
    maxReserve: 210,
    damage: 22,
    falloff: [[0, 1], [10, 1], [24, 0.68], [40, 0.5], [70, 0.42]],
    armorPenetration: 0.3,
    // Integral suppressor: subsonic, poor through material, very quiet.
    penetration: { power: 0.11, maxThickness: 0.11, maxCount: 1 },
    suppressed: true,
    spread: {
      standing: 0.7, crouched: 0.5, moving: 2.4, jumping: 6.0, ads: 0.22,
      perShot: 0.30, max: 5.0, recovery: 6.5, recoveryDelay: 0.11,
    },
    recoil: {
      // Fast shallow climb with a pronounced left-then-right wobble.
      pattern: [
        [0.26, 0.04], [0.30, -0.10], [0.34, -0.20], [0.36, -0.26],
        [0.35, -0.18], [0.33, 0.02], [0.31, 0.20], [0.29, 0.30],
        [0.27, 0.32], [0.25, 0.22], [0.24, 0.04], [0.23, -0.16],
        [0.22, -0.28], [0.21, -0.30], [0.20, -0.18], [0.20, 0.06],
        [0.19, 0.24], [0.19, 0.30],
      ],
      recovery: 15.0, recoverFraction: 0.88, recoverDelay: 0.10,
      viewPunchPitch: 0.12, viewPunchYaw: 0.06,
    },
    ads: { time: 0.22, fovMultiplier: 0.88 },
    drawTime: 0.34, holsterTime: 0.24,
    reload: { tactical: 1.95, tacticalAmmoAt: 1.28, empty: 2.55, emptyAmmoAt: 1.70 },
    moveMultiplier: 0.98, adsMoveMultiplier: 0.66,
    loudness: 0.32, noiseRadius: 13,
    tracerEvery: 4,
    audio: audio('weapon_vk7', { shell: 'shell_pistol', suppressed: true }),
  },

  // ----------------------------------------------------------- KD-4 (carbine)
  carbine: {
    slot: 'primary',
    fireModes: [FIRE_MODE.AUTO, FIRE_MODE.SEMI],
    modeSwitchable: true,
    rpm: 700,
    reserve: 150,
    maxReserve: 240,
    damage: 31,
    falloff: [[0, 1], [22, 1], [42, 0.82], [70, 0.65], [110, 0.58]],
    armorPenetration: 0.55,
    penetration: { power: 0.30, maxThickness: 0.14, maxCount: 2 },
    spread: {
      standing: 0.5, crouched: 0.32, moving: 2.2, jumping: 6.5, ads: 0.10,
      perShot: 0.26, max: 4.6, recovery: 5.5, recoveryDelay: 0.13,
    },
    recoil: {
      // The signature Ranger pattern: hard climb for six, drift right through
      // the middle of the mag, then a long sweep back left.
      pattern: [
        [0.42, 0.02], [0.50, -0.06], [0.55, 0.10], [0.58, 0.16],
        [0.56, 0.22], [0.52, 0.26], [0.46, 0.20], [0.40, 0.06],
        [0.34, -0.12], [0.30, -0.26], [0.26, -0.34], [0.24, -0.30],
        [0.22, -0.14], [0.20, 0.08], [0.19, 0.26], [0.18, 0.34],
        [0.17, 0.28], [0.16, 0.10], [0.15, -0.12], [0.15, -0.28],
      ],
      recovery: 13.0, recoverFraction: 0.90, recoverDelay: 0.12,
      viewPunchPitch: 0.18, viewPunchYaw: 0.08,
    },
    ads: { time: 0.26, fovMultiplier: 0.82 },
    drawTime: 0.40, holsterTime: 0.28,
    reload: { tactical: 2.05, tacticalAmmoAt: 1.34, empty: 2.75, emptyAmmoAt: 1.86 },
    moveMultiplier: 0.94, adsMoveMultiplier: 0.62,
    loudness: 1.0, noiseRadius: 42,
    tracerEvery: 3,
    audio: audio('weapon_kd4', { shell: 'shell_rifle' }),
  },

  // ---------------------------------------------------------- CS-12 (shotgun)
  shotgun: {
    slot: 'primary',
    fireModes: [FIRE_MODE.PUMP],
    modeSwitchable: false,
    rpm: 0,
    cycleTime: 0.82,          // manual pump: trigger-to-trigger floor
    pumpTime: 0.52,           // action is cycling; cannot fire, no chambered round
    reserve: 32,
    maxReserve: 56,
    // Per-pellet. 9 x 13 = 117 at contact range, and the falloff is brutal.
    damage: 13,
    pellets: 9,
    patternSpread: 3.4,       // degrees, cone half-angle for the pellet pattern
    patternRings: [0, 0.45, 1.0], // relative radii the pellets are drawn onto
    falloff: [[0, 1], [6, 0.85], [14, 0.42], [24, 0.16], [34, 0.06], [45, 0.02]],
    armorPenetration: 0.2,
    penetration: { power: 0.06, maxThickness: 0.06, maxCount: 1 },
    spread: {
      standing: 1.1, crouched: 0.8, moving: 2.8, jumping: 7.0, ads: 0.55,
      perShot: 0.7, max: 4.0, recovery: 4.0, recoveryDelay: 0.30,
    },
    recoil: {
      pattern: [
        [2.60, 0.16], [2.75, -0.24], [2.85, 0.28], [2.70, -0.20],
        [2.80, 0.22], [2.65, -0.26],
      ],
      recovery: 9.0, recoverFraction: 0.85, recoverDelay: 0.30,
      viewPunchPitch: 0.72, viewPunchYaw: 0.22,
    },
    ads: { time: 0.32, fovMultiplier: 0.90 },
    drawTime: 0.46, holsterTime: 0.32,
    // Tube fed: loaded one shell at a time, interruptible after any shell.
    reload: {
      perShell: true,
      startTime: 0.34, shellTime: 0.46, endTime: 0.30,
      // Nominal single-mag equivalents, reported for UI and kept for parity
      // with the interface (tactical = top up one, empty = full tube).
      tactical: 0.80, tacticalAmmoAt: 0.46, empty: 4.32, emptyAmmoAt: 0.80,
    },
    moveMultiplier: 0.90, adsMoveMultiplier: 0.60,
    loudness: 1.25, noiseRadius: 48,
    tracerEvery: 0,
    audio: audio('weapon_cs12', { shell: 'shell_shotgun' }),
  },

  // --------------------------------------------------------- HL-700 (sniper)
  sniper: {
    slot: 'primary',
    fireModes: [FIRE_MODE.BOLT],
    modeSwitchable: false,
    rpm: 0,
    cycleTime: 1.25,
    boltTime: 0.95,
    reserve: 30,
    maxReserve: 50,
    damage: 105,
    falloff: [[0, 1], [80, 1], [140, 0.9], [200, 0.85]],
    armorPenetration: 0.9,
    penetration: { power: 0.60, maxThickness: 0.16, maxCount: 2 },
    spread: {
      standing: 1.4, crouched: 0.7, moving: 4.0, jumping: 9.0, ads: 0.035,
      perShot: 1.6, max: 6.0, recovery: 3.2, recoveryDelay: 0.45,
    },
    recoil: {
      pattern: [
        [3.40, -0.20], [3.55, 0.26], [3.35, -0.28], [3.50, 0.22], [3.45, -0.24],
      ],
      recovery: 7.5, recoverFraction: 0.94, recoverDelay: 0.45,
      viewPunchPitch: 0.90, viewPunchYaw: 0.18,
    },
    ads: { time: 0.42, fovMultiplier: 0.28 },
    scope: { magnification: 6, swayAmplitude: 0.36, swayRate: 0.75, holdBreathTime: 3.2 },
    drawTime: 0.52, holsterTime: 0.36,
    reload: { tactical: 2.60, tacticalAmmoAt: 1.72, empty: 3.40, emptyAmmoAt: 2.30 },
    moveMultiplier: 0.86, adsMoveMultiplier: 0.42,
    loudness: 1.4, noiseRadius: 62,
    tracerEvery: 1,
    audio: audio('weapon_hl700', { shell: 'shell_rifle' }),
  },

  // ------------------------------------------------------------ Talon (knife)
  knife: {
    slot: 'melee',
    fireModes: [FIRE_MODE.MELEE],
    modeSwitchable: false,
    rpm: 0,
    reserve: 0,
    damage: 0,
    /** Two attack types: primary is a fast slash, secondary a heavy stab. */
    attacks: {
      light: { damage: 48, range: 1.55, interval: 0.42, windup: 0.06, backstab: 2.6, audioId: 'weapon_talon_slash' },
      heavy: { damage: 96, range: 1.75, interval: 0.95, windup: 0.18, backstab: 3.0, audioId: 'weapon_talon_stab' },
    },
    armorPenetration: 0.45,
    falloff: [[0, 1], [2, 1]],
    penetration: { power: 0, maxThickness: 0, maxCount: 0 },
    spread: { standing: 0, crouched: 0, moving: 0, jumping: 0, ads: 0, perShot: 0, max: 0, recovery: 1 },
    recoil: { pattern: [[0, 0]], recovery: 1, recoverFraction: 0, recoverDelay: 0, viewPunchPitch: 0.1, viewPunchYaw: 0.12 },
    ads: { time: 0.16, fovMultiplier: 1.0 },
    drawTime: 0.22, holsterTime: 0.16,
    reload: { tactical: 0, tacticalAmmoAt: 0, empty: 0, emptyAmmoAt: 0 },
    moveMultiplier: 1.08, adsMoveMultiplier: 1.0,
    loudness: 0.08, noiseRadius: 3,
    audio: { ...audio('weapon_talon'), fire: 'weapon_talon_slash', hitFlesh: 'melee_hit_flesh', hitWorld: 'melee_hit_world' },
  },

  // ---------------------------------------------------------- LX-2 (flashbang)
  flash: {
    slot: 'flash',
    fireModes: [FIRE_MODE.THROW],
    modeSwitchable: false,
    rpm: 0,
    reserve: 0,
    count: 2, maxCount: 3,
    damage: 0,
    falloff: [[0, 1]],
    armorPenetration: 0,
    penetration: { power: 0, maxThickness: 0, maxCount: 0 },
    spread: { standing: 0, crouched: 0, moving: 0, jumping: 0, ads: 0, perShot: 0, max: 0, recovery: 1 },
    recoil: { pattern: [[0, 0]], recovery: 1, recoverFraction: 0, recoverDelay: 0, viewPunchPitch: 0.05, viewPunchYaw: 0 },
    ads: { time: 0.2, fovMultiplier: 1.0 },
    drawTime: 0.30, holsterTime: 0.22,
    reload: { tactical: 0, tacticalAmmoAt: 0, empty: 0, emptyAmmoAt: 0 },
    moveMultiplier: 1.04, adsMoveMultiplier: 0.9,
    throw: {
      speed: 12.5,          // m/s at full-power (hip) throw
      lobSpeed: 7.0,        // m/s underhand lob (ADS held while throwing)
      pitchBoost: 7.0,      // degrees added above the aim line for the arc
      gravity: 14.0,
      restitution: 0.36,
      friction: 0.62,
      radius: 0.035,
      windup: 0.24,         // hand travel before the projectile leaves
    },
    fuse: 1.55,
    effect: {
      radius: 9.0,
      /** Full blind inside this radius, tapering to zero at `radius`. */
      coreRadius: 3.2,
      /** Seconds of full white-out at the core, scaled by distance + facing. */
      blindDuration: 4.4,
      minBlindDuration: 0.7,
      /** Looking away still stuns, but far less. */
      facingFloor: 0.35,
      deafDuration: 3.0,
      requiresLineOfSight: true,
    },
    loudness: 1.15, noiseRadius: 40,
    audio: { throw: 'gadget_throw', bounce: 'gadget_bounce', detonate: 'gadget_flash_detonate', ring: 'gadget_flash_ring', draw: 'weapon_flash_draw', holster: 'weapon_holster', dry: 'weapon_dry' },
  },

  // -------------------------------------------------------------- SM-6 (smoke)
  smoke: {
    slot: 'smoke',
    fireModes: [FIRE_MODE.THROW],
    modeSwitchable: false,
    rpm: 0,
    reserve: 0,
    count: 2, maxCount: 3,
    damage: 0,
    falloff: [[0, 1]],
    armorPenetration: 0,
    penetration: { power: 0, maxThickness: 0, maxCount: 0 },
    spread: { standing: 0, crouched: 0, moving: 0, jumping: 0, ads: 0, perShot: 0, max: 0, recovery: 1 },
    recoil: { pattern: [[0, 0]], recovery: 1, recoverFraction: 0, recoverDelay: 0, viewPunchPitch: 0.05, viewPunchYaw: 0 },
    ads: { time: 0.2, fovMultiplier: 1.0 },
    drawTime: 0.30, holsterTime: 0.22,
    reload: { tactical: 0, tacticalAmmoAt: 0, empty: 0, emptyAmmoAt: 0 },
    moveMultiplier: 1.04, adsMoveMultiplier: 0.9,
    throw: {
      speed: 11.5, lobSpeed: 6.5, pitchBoost: 6.0, gravity: 14.0,
      restitution: 0.28, friction: 0.55, radius: 0.035, windup: 0.24,
    },
    fuse: 1.05,
    effect: {
      radius: 3.1,
      /** Seconds the volume blocks AI sight (see EffectsSystem.smokeVolume). */
      duration: 15.0,
      /** Ramp so the cloud is not instantly opaque. */
      bloomTime: 1.1,
      requiresLineOfSight: false,
    },
    loudness: 0.45, noiseRadius: 14,
    audio: { throw: 'gadget_throw', bounce: 'gadget_bounce', detonate: 'gadget_smoke_pop', hiss: 'gadget_smoke_hiss', draw: 'weapon_smoke_draw', holster: 'weapon_holster', dry: 'weapon_dry' },
  },
};

// Fuse the art table (names, brands, capacities, families) onto the tuning.
for (const [key, def] of Object.entries(DEFS)) {
  const model = MODELS[key];
  def.key = key;
  def.id = model?.id || `WPN-${key.toUpperCase()}`;
  def.name = model?.name || key;
  def.displayName = def.name;
  def.brand = model?.brand || 'Northstar';
  def.manufacturer = def.brand;
  def.family = model?.family || key;
  def.magSize = model?.magSize ?? 0;
  def.chamberSize = model?.chamber ?? 0;
  def.slotIndex = SLOT_ORDER.indexOf(def.slot) + 1;
  def.fireMode = def.fireModes[0];
  def.pellets = def.pellets || 1;
  def.suppressed = !!def.suppressed;
  def.isFirearm = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'].includes(def.family);
  def.isGadget = def.family === 'grenade';
  def.isMelee = def.family === 'melee';
  /** Total rounds the weapon holds with a round in the chamber. */
  def.loadedMax = def.magSize + def.chamberSize;
  def.shotInterval = shotInterval(def);
}

export const WEAPON_DEFS = DEFS;
export const WEAPON_KEYS = Object.keys(DEFS);

/** Loadout vocabulary -> table key. Mirrors the art table's alias list. */
const ALIASES = {
  pistol: 'pistol', sidearm: 'pistol', nw9: 'pistol', 'nw-9': 'pistol', handgun: 'pistol',
  smg: 'smg', vk7: 'smg', 'vk-7': 'smg', whisper: 'smg', suppressed: 'smg',
  carbine: 'carbine', rifle: 'carbine', kd4: 'carbine', 'kd-4': 'carbine', ranger: 'carbine', assault: 'carbine',
  shotgun: 'shotgun', cs12: 'shotgun', 'cs-12': 'shotgun', breaker: 'shotgun', pump: 'shotgun',
  sniper: 'sniper', dmr: 'sniper', hl700: 'sniper', 'hl-700': 'sniper', longsight: 'sniper', marksman: 'sniper',
  knife: 'knife', melee: 'knife', talon: 'knife', blade: 'knife',
  flash: 'flash', flashbang: 'flash', lx2: 'flash', 'lx-2': 'flash', stun: 'flash',
  smoke: 'smoke', sm6: 'smoke', 'sm-6': 'smoke', smokegrenade: 'smoke', canister: 'smoke',
};

/** Resolve anything (string, def, live weapon state) to a table key. */
export function resolveKey(any, fallback = 'carbine') {
  if (!any) return fallback;
  const raw = typeof any === 'string'
    ? any
    : (any.key || any.def?.key || any.id || any.name || any.kind || fallback);
  const norm = String(raw).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (DEFS[norm]) return norm;
  if (ALIASES[norm]) return ALIASES[norm];
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (norm.includes(alias)) return key;
  }
  return fallback;
}

export function weaponDef(any, fallback = 'carbine') {
  return DEFS[resolveKey(any, fallback)];
}

// =========================================================================
// Difficulty scaling
// =========================================================================

/**
 * Enemy-facing scalars. `MissionDirector` / `EnemyManager` read these; the
 * weapon system uses `playerDamage`, `reserveAmmo` and `gadgetCount`.
 */
export const DIFFICULTY_SCALARS = {
  recruit: {
    label: 'Recruit',
    playerDamage: 1.18,
    reserveAmmo: 1.3,
    gadgetCount: 1,
    enemyHealth: 0.82,
    enemyArmor: 0.6,
    enemyDamage: 0.62,
    enemyAccuracy: 0.62,
    enemyReactionTime: 1.45,
    enemyFireRate: 0.75,
    enemyAlertRadius: 0.8,
    flashBlindEnemy: 1.35,
    hostagePanic: 0.75,
  },
  operator: {
    label: 'Operator',
    playerDamage: 1.0,
    reserveAmmo: 1.0,
    gadgetCount: 0,
    enemyHealth: 1.0,
    enemyArmor: 1.0,
    enemyDamage: 1.0,
    enemyAccuracy: 1.0,
    enemyReactionTime: 1.0,
    enemyFireRate: 1.0,
    enemyAlertRadius: 1.0,
    flashBlindEnemy: 1.0,
    hostagePanic: 1.0,
  },
  veteran: {
    label: 'Veteran',
    playerDamage: 0.92,
    reserveAmmo: 0.85,
    gadgetCount: 0,
    enemyHealth: 1.15,
    enemyArmor: 1.25,
    enemyDamage: 1.3,
    enemyAccuracy: 1.25,
    enemyReactionTime: 0.78,
    enemyFireRate: 1.15,
    enemyAlertRadius: 1.15,
    flashBlindEnemy: 0.82,
    hostagePanic: 1.2,
  },
  blackout: {
    label: 'Blackout',
    playerDamage: 0.85,
    reserveAmmo: 0.7,
    gadgetCount: -1,
    enemyHealth: 1.3,
    enemyArmor: 1.5,
    enemyDamage: 1.65,
    enemyAccuracy: 1.45,
    enemyReactionTime: 0.6,
    enemyFireRate: 1.3,
    enemyAlertRadius: 1.3,
    flashBlindEnemy: 0.68,
    hostagePanic: 1.4,
  },
};

const DIFFICULTY_ALIASES = {
  easy: 'recruit', rookie: 'recruit', casual: 'recruit', recruit: 'recruit',
  normal: 'operator', standard: 'operator', operator: 'operator', medium: 'operator',
  hard: 'veteran', veteran: 'veteran', difficult: 'veteran',
  elite: 'blackout', blackout: 'blackout', realism: 'blackout', extreme: 'blackout', nightmare: 'blackout',
};

/** Difficulty name -> scalar block. Unknown names fall back to Operator. */
export function difficultyScalars(difficulty) {
  const key = DIFFICULTY_ALIASES[String(difficulty || '').toLowerCase()] || 'operator';
  return DIFFICULTY_SCALARS[key];
}

/**
 * Scale a weapon definition for a difficulty. Returns a NEW object (the base
 * table is never mutated) with the enemy-facing values adjusted:
 * outgoing damage, starting reserve ammunition and gadget counts.
 *
 * @param {object|string} weapon  def, key, or live weapon state
 * @param {string} difficulty
 */
export function scaleForDifficulty(weapon, difficulty) {
  const base = typeof weapon === 'object' && weapon?.spread ? weapon : weaponDef(weapon);
  const s = difficultyScalars(difficulty);
  const out = {
    ...base,
    damage: +(base.damage * s.playerDamage).toFixed(3),
    reserve: Math.round((base.reserve || 0) * s.reserveAmmo),
    maxReserve: Math.round((base.maxReserve || 0) * Math.max(1, s.reserveAmmo)),
    difficulty: s.label,
    difficultyScalars: s,
  };
  if (base.attacks) {
    out.attacks = {};
    for (const [name, atk] of Object.entries(base.attacks)) {
      out.attacks[name] = { ...atk, damage: +(atk.damage * s.playerDamage).toFixed(3) };
    }
  }
  if (base.count) {
    out.count = Math.max(1, Math.min(base.maxCount ?? 3, base.count + s.gadgetCount));
  }
  return out;
}

/** Every scaled def for a difficulty, keyed like the base table. */
export function scaledTable(difficulty) {
  const out = {};
  for (const key of WEAPON_KEYS) out[key] = scaleForDifficulty(DEFS[key], difficulty);
  return out;
}

/** Compact summary used by the loadout screen and the asset manifest audit. */
export function weaponSummary() {
  return WEAPON_KEYS.map((k) => {
    const d = DEFS[k];
    return {
      key: k, id: d.id, name: d.name, manufacturer: d.brand, family: d.family,
      slot: d.slot, slotIndex: d.slotIndex,
      fireModes: d.fireModes.slice(), rpm: d.rpm,
      magazine: d.magSize, reserve: d.reserve,
      damage: d.isMelee ? d.attacks.light.damage : d.damage,
      pellets: d.pellets,
    };
  });
}
