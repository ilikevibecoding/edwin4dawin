// Weapon definitions (Opus 2 balance, Fable 4 art). All names/manufacturers are fictional and
// original: Karst Arms, Boreal Defense, Halcyon Ordnance, Vanta Systems, Meridian Precision.
//
// ---------------------------------------------------------------------------
// Field reference (WP-014)
//
// Handling
//   adsMs        time to bring the sights fully up. Gameplay accuracy interpolates over it, so a
//                slow weapon is genuinely slower to aim, not just slower to look at.
//   adsMoveMul   walk speed multiplier at full ADS (per class weight).
//   drawMs       time from switch to ready.  holsterMs  time to put the current weapon away.
//   chamber      closed-bolt: a TACTICAL reload (rounds still in the magazine) keeps the round in
//                the chamber, so the magazine ends at magSize + 1. An EMPTY reload does not —
//                the bolt closed on nothing, so it fills to magSize exactly.
//
// recoil — deterministic per-weapon PATTERN
//   pitch/yaw    degrees of view kick for a pattern step of 1.0.
//   pattern      [[pitchMul, yawMul], …] walked one entry per shot; the last entry repeats for
//                the rest of the magazine. This is the shape the player learns to counter.
//   jitter       lateral randomness added to the authored yaw step (mission rng only).
//   snap         share of a kick that becomes the fast visual punch; the rest becomes accumulated
//                climb that only recovers once the trigger is released.
//   climbMax     ceiling on the accumulated climb, in degrees.
//   settle       punch decay rate (1/s).      recover  climb recovery rate (1/s).
//   hold         seconds after a shot before the climb starts recovering.
//   resetMs      trigger-idle time that rewinds the pattern to step 0.
//   roll         degrees of camera roll per unit of lateral kick.
//
// spread — degrees of cone diameter (the crosshair draws it, the mission halves it for the ray)
//   base         standing, hip-fired, cold.       aim   fully settled ADS (first-shot accuracy).
//   move         added at full sprint speed.      air   added while airborne (heavily punished).
//   crouchMul    multiplier applied to the stance+movement term when crouched.
//   perShot      bloom added per shot, capped at max, decayed at decay °/s after hold seconds.
//
// falloff        falloffStart … falloffEnd interpolates 1 → falloffFloor with exponent
//                falloffCurve (<1 drops fast and early: the shotgun; 1 is linear).
// penetration    0…1, compared against the per-material thresholds in ballistics.js.
// ---------------------------------------------------------------------------
export const WEAPONS = {
  'karst-p9': {
    id: 'karst-p9', name: 'Karst P9', maker: 'Karst Arms', class: 'pistol', slot: 1,
    damage: 28, rpm: 330, auto: false, magSize: 15, reserveMax: 60, chamber: true,
    reloadMs: 1550, reloadEmptyMs: 1950, drawMs: 380, holsterMs: 150,
    adsMs: 140, adsMoveMul: 0.85,
    spread: { base: 1.5, aim: 0.16, move: 2.2, air: 5.5, crouchMul: 0.7, perShot: 0.42, max: 3.2, decay: 3.4, hold: 0.09 },
    recoil: {
      pitch: 1.9, yaw: 0.5, snap: 0.72, climbMax: 3.6, settle: 15, recover: 10, hold: 0.1,
      resetMs: 420, roll: 0.5, jitter: 0.18,
      // crisp pop: hard first tap, then a small alternating wobble
      pattern: [[1, 0], [0.92, 0.3], [0.88, -0.24], [0.84, 0.34], [0.8, -0.3]],
    },
    penetration: 0.4, noise: 30, tracer: false, adsFovScale: 0.88,
    range: 60, falloffStart: 20, falloffEnd: 55, falloffFloor: 0.5, falloffCurve: 1,
    sound: { body: { f0: 205, f1: 92, gain: 0.42, dur: 0.07 }, crack: { f: 4300, q: 1.6, gain: 0.44, dur: 0.03 }, tail: { gain: 0.16, dur: 0.32, f: 1800 } },
    hud: 'pistol',
  },
  'boreal-k5': {
    id: 'boreal-k5', name: 'Boreal K5', maker: 'Boreal Defense', class: 'smg', slot: 2,
    damage: 20, rpm: 800, auto: true, magSize: 30, reserveMax: 120, chamber: true,
    reloadMs: 1900, reloadEmptyMs: 2450, drawMs: 470, holsterMs: 190,
    adsMs: 180, adsMoveMul: 0.8,
    spread: { base: 1.9, aim: 0.3, move: 2.0, air: 6.5, crouchMul: 0.72, perShot: 0.28, max: 3.4, decay: 4.2, hold: 0.07 },
    recoil: {
      pitch: 0.85, yaw: 0.55, snap: 0.45, climbMax: 6, settle: 17, recover: 12, hold: 0.08,
      resetMs: 260, roll: 0.35, jitter: 0.35,
      // fast small rise that immediately starts wandering left/right
      pattern: [[1, 0], [0.9, -0.5], [0.85, 0.6], [0.8, -0.7], [0.78, 0.8], [0.74, -0.6],
        [0.72, 0.9], [0.7, -0.8], [0.68, 0.7], [0.66, -0.9], [0.64, 0.8], [0.62, -0.7]],
    },
    penetration: 0.35, noise: 34, tracer: true, adsFovScale: 0.85,
    range: 45, falloffStart: 14, falloffEnd: 42, falloffFloor: 0.42, falloffCurve: 0.9,
    sound: { body: { f0: 178, f1: 82, gain: 0.36, dur: 0.05 }, crack: { f: 2500, q: 2.4, gain: 0.34, dur: 0.024 }, tail: { gain: 0.1, dur: 0.2, f: 1600 } },
    hud: 'smg',
  },
  'halcyon-hc4': {
    id: 'halcyon-hc4', name: 'Halcyon HC-4', maker: 'Halcyon Ordnance', class: 'carbine', slot: 2,
    damage: 33, rpm: 640, auto: true, magSize: 30, reserveMax: 90, chamber: true,
    reloadMs: 2100, reloadEmptyMs: 2700, drawMs: 520, holsterMs: 210,
    adsMs: 210, adsMoveMul: 0.72,
    spread: { base: 1.5, aim: 0.14, move: 2.6, air: 7, crouchMul: 0.65, perShot: 0.34, max: 3.0, decay: 3.6, hold: 0.08 },
    recoil: {
      pitch: 1.5, yaw: 0.8, snap: 0.5, climbMax: 7, settle: 15, recover: 9.5, hold: 0.1,
      resetMs: 300, roll: 0.4, jitter: 0.12,
      // strong first kicks, rising, then a steady drift to the right
      pattern: [[1, 0], [0.95, 0.15], [0.9, 0.35], [0.85, 0.55], [0.8, 0.7], [0.74, 0.8],
        [0.7, 0.85], [0.66, 0.9], [0.6, 0.95], [0.56, 1], [0.52, 1], [0.5, 1]],
    },
    penetration: 0.7, noise: 42, tracer: true, adsFovScale: 0.8,
    range: 90, falloffStart: 28, falloffEnd: 85, falloffFloor: 0.6, falloffCurve: 1,
    sound: { body: { f0: 235, f1: 66, gain: 0.48, dur: 0.11 }, crack: { f: 3300, q: 1.1, gain: 0.35, dur: 0.04 }, tail: { gain: 0.2, dur: 0.5, f: 1150 } },
    hud: 'carbine',
  },
  'vanta-s12': {
    id: 'vanta-s12', name: 'Vanta S-12', maker: 'Vanta Systems', class: 'shotgun', slot: 2,
    damage: 16, pellets: 8, rpm: 68, auto: false, magSize: 7, reserveMax: 28,
    reloadMs: 660, reloadEmptyMs: 660, reloadPerShell: true, pumpMs: 560,
    drawMs: 580, holsterMs: 230,
    adsMs: 200, adsMoveMul: 0.75,
    spread: { base: 4.2, aim: 3.0, move: 2.6, air: 6, crouchMul: 0.8, perShot: 0.3, max: 1.6, decay: 3.0, hold: 0.12 },
    recoil: {
      pitch: 4.2, yaw: 1.2, snap: 0.7, climbMax: 6, settle: 11, recover: 7, hold: 0.14,
      resetMs: 900, roll: 0.9, jitter: 0.25,
      // one heavy punch; the pump resets the shoulder before the next
      pattern: [[1, 0.2], [0.96, -0.15]],
    },
    penetration: 0.15, noise: 46, tracer: false, adsFovScale: 0.9,
    range: 30, falloffStart: 6, falloffEnd: 22, falloffFloor: 0.15, falloffCurve: 0.7,
    sound: { body: { f0: 132, f1: 40, gain: 0.62, dur: 0.24 }, crack: { f: 1900, q: 0.7, gain: 0.3, dur: 0.07 }, tail: { gain: 0.3, dur: 0.95, f: 780 } },
    hud: 'shotgun',
  },
  'meridian-lr8': {
    id: 'meridian-lr8', name: 'Meridian LR-8', maker: 'Meridian Precision', class: 'sniper', slot: 2,
    damage: 105, rpm: 45, auto: false, magSize: 10, reserveMax: 30, chamber: true,
    reloadMs: 2600, reloadEmptyMs: 3200, drawMs: 680, holsterMs: 250, boltMs: 1050,
    adsMs: 380, adsMoveMul: 0.5,
    spread: { base: 4.0, aim: 0.05, move: 6.5, air: 12, crouchMul: 0.6, perShot: 1.4, max: 4.0, decay: 2.2, hold: 0.2 },
    recoil: {
      pitch: 5.2, yaw: 0.9, snap: 0.6, climbMax: 6.5, settle: 10, recover: 4.5, hold: 0.18,
      resetMs: 1500, roll: 0.8, jitter: 0.1,
      // one large punch that takes its time coming back down
      pattern: [[1, 0.1], [0.97, -0.12]],
    },
    penetration: 0.95, noise: 55, tracer: true, adsFovScale: 0.32, scope: true,
    // scope breathing: deterministic Lissajous, steadied by holding Shift
    sway: { amp: 0.16, steadyAmp: 0.022, rateX: 0.9, rateY: 1.27, budget: 3.2, refill: 1.1 },
    range: 200, falloffStart: 80, falloffEnd: 190, falloffFloor: 0.8, falloffCurve: 1,
    sound: { body: { f0: 275, f1: 52, gain: 0.53, dur: 0.15 }, crack: { f: 4600, q: 0.85, gain: 0.42, dur: 0.055 }, tail: { gain: 0.33, dur: 1.4, f: 1000 } },
    hud: 'sniper',
  },
  'cq-blade': {
    id: 'cq-blade', name: 'Fieldman CQ', maker: 'Karst Arms', class: 'melee', slot: 3,
    damage: 55, rpm: 90, auto: false, magSize: Infinity, reserveMax: Infinity,
    drawMs: 280, holsterMs: 130, meleeRange: 1.7, noise: 4, backstabMul: 2,
    spread: { base: 0, aim: 0, move: 0, air: 0, crouchMul: 1, perShot: 0, max: 0, decay: 1, hold: 0 },
    recoil: { pitch: 0.35, yaw: 0.4, snap: 0.85, climbMax: 0.6, settle: 14, recover: 12, hold: 0.05, resetMs: 400, roll: 0.8, jitter: 0.3, pattern: [[1, 1], [1, -1]] },
    hud: 'knife',
  },
  'fb-3': {
    id: 'fb-3', name: 'FB-3 Dazzler', maker: 'Vanta Systems', class: 'thrown', slot: 4,
    damage: 0, magSize: 1, reserveMax: 2, carried: 2, drawMs: 330, holsterMs: 150, throwMs: 480,
    effect: 'flash', fuseMs: 1600, effectRadius: 11, noise: 60,
    spread: { base: 0, aim: 0, move: 0, air: 0, crouchMul: 1, perShot: 0, max: 0, decay: 1, hold: 0 },
    recoil: { pitch: 0.25, yaw: 0.1, snap: 1, climbMax: 0.3, settle: 12, recover: 10, hold: 0.05, resetMs: 400, roll: 0.2, jitter: 0, pattern: [[1, 0]] },
    hud: 'flash',
  },
  'sg-2': {
    id: 'sg-2', name: 'SG-2 Veil', maker: 'Vanta Systems', class: 'thrown', slot: 5,
    damage: 0, magSize: 1, reserveMax: 2, carried: 2, drawMs: 330, holsterMs: 150, throwMs: 480,
    effect: 'smoke', fuseMs: 1300, effectRadius: 4.2, durationMs: 16000, noise: 24,
    spread: { base: 0, aim: 0, move: 0, air: 0, crouchMul: 1, perShot: 0, max: 0, decay: 1, hold: 0 },
    recoil: { pitch: 0.25, yaw: 0.1, snap: 1, climbMax: 0.3, settle: 12, recover: 10, hold: 0.05, resetMs: 400, roll: 0.2, jitter: 0, pattern: [[1, 0]] },
    hud: 'smoke',
  },
};

export const PRIMARIES = ['boreal-k5', 'halcyon-hc4', 'vanta-s12', 'meridian-lr8'];
export const DEFAULT_LOADOUT = { primary: 'halcyon-hc4', sidearm: 'karst-p9', slot4: 'fb-3', slot5: 'sg-2' };

export const HEAD_MULT = 2.5;
export const LEG_MULT = 0.8;

// Player armour: how much of a hit bypasses the plate outright, per region. A head shot always
// gets most of the way through — armour is never a helmet.
export const ARMOR_BYPASS = { head: 0.6, torso: 0.26, legs: 0.8 };
// Fraction of the non-bypassing part the plate can eat, and how much plate that costs.
export const ARMOR_SOAK = 0.8;
export const ARMOR_WEAR = 1.15;
