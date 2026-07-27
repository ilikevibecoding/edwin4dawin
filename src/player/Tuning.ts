/**
 * Second-order tuning for the player controller.
 *
 * `GAMEPLAY.player` and `GAMEPLAY.camera` already hold everything a designer
 * would recognise: speeds, heights, durations, gravity, bob amplitude. What
 * lives here is the consequence of *how* this controller is built — buffer
 * windows, spring rates, probe geometry, blend rates. Keeping the two apart
 * means re-tuning the feel never requires touching the machinery.
 */
import { COLLISION_GROUP } from '../core/GameTypes';
import { DEG2RAD } from '../core/MathUtils';
import { GAMEPLAY } from '../core/Config';

const P = GAMEPLAY.player;

export const TUNE = {
  // --- Look ----------------------------------------------------------------
  /** Radians of view rotation per pixel of raw mouse movement at sensitivity 1. */
  lookRadiansPerPixel: 0.0021,
  /** Just short of straight up so the horizon can never flip through the pole. */
  maxPitch: 89 * DEG2RAD,
  /** Two taps of forward inside this window request a tactical sprint. */
  doubleTapWindow: 0.28,

  // --- Jumping -------------------------------------------------------------
  /** Grace period after walking off a ledge during which a jump still counts. */
  coyoteTime: 0.1,
  /** A jump pressed this long before touchdown fires on landing. */
  jumpBuffer: 0.15,
  jumpCooldown: 0.26,
  /** Jumps launched within this long of touching down form a hop chain. */
  hopChainWindow: 0.42,
  /** Speed the first jump of a chain may keep, as a multiple of the ground cap. */
  hopFirstBonus: 1.06,
  /** Speed multiplier lost per extra hop in the chain. */
  hopDecay: 0.87,
  hopChainMax: 4,

  // --- Ground movement -----------------------------------------------------
  /**
   * Friction floor. Below this speed the drop is computed as if you were moving
   * at `stopSpeed`, which is what turns a long exponential tail into a stop.
   */
  stopSpeed: 1.15,
  /**
   * Bias pressing the capsule into the ground while grounded, m/s.
   *
   * It has to re-seat the capsule on its collision skin and keep the controller's
   * snap-to-ground armed, and nothing more; it is applied along the ground normal
   * rather than straight down so that it cannot compete with the move it supports
   * — see the note in `Movement.integrate`, which is where the direction is what
   * keeps the character off the nose of every stair tread on the map.
   */
  groundStick: 2.5,
  terminalVelocity: 62,
  /**
   * Below this fraction of the intended horizontal move, the controller hit
   * something and the velocity is clipped against it. Above it the difference is
   * projection noise from slopes and skin width, which must not bleed speed.
   *
   * Reading a legitimate move as an impact is expensive here, because the velocity
   * a clip leaves behind is `acceleration * dt` — 4 mm of travel per step, under
   * the floor the controller's step probe acts on — so a false positive against a
   * stair nose does not cost a moment of speed, it stops the climb outright. With
   * the ground stick pressed along the normal the worst honest shortfall measured
   * on the map's staircases is 12%, so this sits clear of that while still catching
   * a glancing contact, which does want its into-wall component taken off.
   */
  blockedFraction: 0.8,
  /**
   * Intended displacement below which a shortfall means nothing, metres per step.
   * Standing still leaves millimetre-per-second numerical residue in the velocity
   * and the solver's own skin corrections are the same size, so without a floor
   * here a stationary character reads as permanently walled in.
   */
  blockedMinDisp: 0.003,
  /**
   * Smallest horizontal displacement the controller's step probe will act on,
   * metres per fixed step.
   *
   * Measured against the map's exterior stairs rather than guessed: the capsule
   * climbs a 0.37 m riser at 1.2 m/s and sticks dead at 1.0 m/s, which at 120 Hz
   * puts the cliff between 8 and 10 mm. The probe lifts the capsule, re-resolves
   * the move from up there and keeps the result only if more than half the request
   * survived, and the de-penetration push back off the riser is a fixed couple of
   * millimetres — so below roughly twice that, the test cannot pass however long
   * you lean on it. A blocked step is padded to this so that a crouch-walk under
   * ADS, at 0.86 m/s, can still climb a staircase.
   */
  stepAssistMinDisp: 0.016,
  backSpeedScale: 0.82,
  strafeSpeedScale: 0.94,
  crouchAccelScale: 0.72,
  proneAccelScale: 0.42,
  crouchFrictionScale: 1.12,
  /** Reference weapon weight; heavier than this costs sprint speed. */
  weaponWeightReference: 3.5,
  weaponWeightPenalty: 0.013,
  weaponWeightRange: 0.09,

  // --- Step-up smoothing ---------------------------------------------------
  /**
   * Vertical motion beyond this that the slope alone does not account for is a
   * teleport — an autostep onto a kerb, or a snap down off one — and gets
   * smoothed out of the camera. Ramps are already excluded analytically, so this
   * only has to clear the millimetre-scale corrections the solver makes as it
   * settles the capsule onto its collision skin.
   */
  stepSmoothMin: 0.03,
  /**
   * How long the camera takes to give back an invented step, at constant speed.
   *
   * Constant speed rather than exponential decay on purpose. An exponential hands
   * back a third of the correction in the first frame and a whisper in the last,
   * so a staircase reads as a series of small jolts followed by drift — the very
   * thing the smoothing exists to remove. Spreading the offset evenly over a fixed
   * window costs nothing and is what Quake and Source both do.
   */
  stepSmoothTime: 0.1,
  /** Floor on the recovery speed, so a millimetre of residual cannot linger. */
  stepSmoothMinSpeed: 0.5,
  stepSmoothMax: 0.55,

  // --- Stance transitions --------------------------------------------------
  /** Capsule height change rates, metres per second. */
  crouchDownRate: 4.4,
  crouchUpRate: 3.4,
  proneDownRate: 2.3,
  proneUpRate: 1.9,
  /** Dead time between asking to leave prone and the stance actually changing. */
  proneGetUpDelay: 0.42,
  /** Extra drop of the eye below the capsule crown when fully prone. */
  proneEyeDrop: 0.07,

  // --- Slide ---------------------------------------------------------------
  /** How fast the slide direction can be steered, radians per second. */
  slideSteer: 1.7,
  /** Fraction of gravity along the slope that a slide feels. */
  slideSlopeGain: 0.85,
  /**
   * A slide that has decayed below this speed is over. Sits at the point where
   * `stopSpeed` turns the friction from exponential into linear, so the slide ends
   * as it starts to feel like being dragged rather than after a mushy tail.
   */
  slideExitSpeed: 1.7,
  slideMaxSpeed: P.sprintSpeed + P.slideSpeedBoost + 3,
  /**
   * Sprint blend still counted as "sprinting" for the purpose of starting a slide.
   * Releasing sprint and then crouching is one gesture at speed, and refusing it
   * because the key came up two frames early is the kind of thing that reads as the
   * game dropping inputs.
   */
  slideSprintBlend: 0.5,

  // --- Sprint --------------------------------------------------------------
  /** Weapon lockout after leaving a sprint — the "sprint-out" time. */
  sprintOut: 0.15,
  sprintOutTactical: 0.28,
  sprintForwardThreshold: 0.25,
  /** Charge needed before a tactical sprint may be started. */
  tacticalMinCharge: 0.3,
  /** A full tactical-sprint recharge takes this multiple of its duration. */
  tacticalRecharge: 2.2,
  sprintBlendRate: 9,

  // --- Mantle / vault ------------------------------------------------------
  /** How far past the capsule surface the wall probe reaches. */
  mantleReach: 0.5,
  mantleChestHeight: 1.25,
  mantleWaistHeight: 0.62,
  /** How far past the wall face the ledge-top probe is dropped. */
  mantleProbeInset: 0.16,
  /** Extra distance in from the edge the capsule ends up, beyond its radius. */
  mantleDestInset: 0.12,
  /** Headroom above the mantle limit that the downward probe starts from. */
  mantleProbeLift: 0.45,
  /** Crests up to here are vaulted quickly rather than climbed. */
  vaultMaxHeight: 0.98,
  /** A vault may drop this far on the far side of the obstacle. */
  vaultDropMax: 2.0,
  /** Clearance required at the destination, over the crouched capsule height. */
  mantleClearance: 0.06,
  /** Interval between destination re-checks while the movement plays out. */
  mantleRecheck: 0.09,
  /** Speed handed back to the movement model on exit, so momentum survives. */
  mantleExitSpeed: 2.3,
  /** Fraction of the movement spent rising, before the crest. */
  mantleRiseFraction: 0.55,
  vaultRiseFraction: 0.45,
  mantleCrestLift: 0.06,
  vaultCrestLift: 0.12,
  vaultDurationScale: 0.62,
  /** Extra duration for a full-height mantle, as a fraction of the limit. */
  mantleDurationGain: 0.4,
  /** Forward pressure against an obstacle that triggers an automatic vault. */
  autoVaultHold: 0.16,
  autoVaultForward: 0.6,

  // --- Camera --------------------------------------------------------------
  eyeRateCrouch: 13,
  eyeRateProne: 8,
  /** Dip-and-settle impulse when a stance change starts, metres. */
  stanceDipCrouch: 0.045,
  stanceDipProne: 0.085,
  stanceDipStiffness: 150,
  stanceDipDamping: 17,
  /** Impact speed at which the landing dip is at full depth. */
  landRefSpeed: 16,
  landMinSpeed: 2.4,
  landDipMax: 0.17,
  landRollMax: 0.055,
  landStiffness: 120,
  landDamping: 13,
  bobLateralScale: 1.15,
  bobVerticalScale: 1.35,
  bobForwardScale: 0.35,
  bobRoll: 0.02,
  bobBlendRate: 7,
  bobAdsSuppress: 0.86,
  bobCrouchScale: 0.55,
  bobProneScale: 0.3,
  breathPitch: 0.0018,
  /** Breathing gain while scoped — the reason a sniper holds their breath. */
  breathScopedGain: 3.2,
  /** Extra breathing through an open sight, where it is felt but not disabling. */
  breathAdsGain: 0.35,
  /** Share of the breathing sway that moving hides; you only notice it standing still. */
  breathMoveSuppress: 0.7,
  holdBreathRate: 6,
  /** Seconds of held breath available from full. */
  holdBreathDuration: 3.6,
  /** Refill runs this much slower than the drain. */
  holdBreathRecoveryScale: 1.8,
  /** Overshoot in breathing amplitude after the lungs give out. */
  gaspGain: 0.8,
  gaspDecay: 1.9,
  recoilStiffness: 170,
  recoilDamping: 24,
  /** Share of a recoil kick that springs back; the rest stays in the aim. */
  recoilAutoRecover: 0.76,
  punchStiffness: 420,
  punchDamping: 26,
  strafeRoll: 0.021,
  strafeRollRate: 7,
  /** Share of the strafe and turn roll that aiming down the sights removes. */
  strafeRollAdsSuppress: 0.7,
  turnRollAdsSuppress: 0.8,
  /** Roll per radian per second of yaw rate, and its ceiling. */
  turnRoll: 0.05,
  turnRollMax: 0.028,
  turnRollRate: 6,
  slideDip: 0.15,
  slideRoll: 0.1,
  slidePitch: 0.03,
  leanRate: 9,
  /** Standoff kept between the leaned eye and a wall. */
  leanProbeMargin: 0.14,
  fovBlendRate: 16,
  /**
   * A magnified optic does its own magnification: the weapon module renders the
   * sight picture through a second camera whose field of view is derived from
   * this one. Dividing the main view by `adsZoom` as well would zoom twice and
   * leave the world around the tube absurdly narrow, so a scope only gets the
   * small "lean in" that sells the weapon coming up to the eye.
   */
  scopedFovDivisor: 1.16,
  /** Where the view ends up while the body is on the deck. */
  deathRoll: 0.34,
  deathPitch: -0.22,
  deathRate: 2.4,

  // --- Footsteps -----------------------------------------------------------
  strideMin: 0.55,
  strideMax: 2.4,
  /**
   * Stride multipliers per stance. Above one because a low stance is *deliberate*:
   * the cadence formula already shortens the stride as speed drops, and stacking a
   * shorter stride on top of that would have a crouching operator pattering along
   * faster than a walking one.
   */
  strideCrouchScale: 1.15,
  strideProneScale: 1.5,
  /** Speed below which the stride cycle parks instead of creeping. */
  stepIdleSpeed: 0.25,
  /** Direction change, in radians, that scuffs the boots. */
  scuffAngle: 1.9,
  scuffCooldown: 0.3,
  scuffMinSpeed: 2.6,
  /** Impact speed above which a landing thud is loud enough for AI to hear. */
  landLoudSpeed: 3.4,
  /**
   * Step loudness per stance, weighted by the surface and compared against
   * `loudThreshold` to set the event's `loud` flag. Any sprint carries; a walk
   * carries only on metal or through water; crouching and prone never do.
   */
  loudSprint: 1.0,
  loudTactical: 1.15,
  loudWalk: 0.62,
  loudCrouch: 0.3,
  loudProne: 0.12,
  loudSlide: 0.9,
  loudLand: 1.15,
  loudThreshold: 0.7,
  /** How much of the loudness the ground gets to decide; see `surfaceLoudness`. */
  loudSurfaceInfluence: 0.5,

  // --- Health --------------------------------------------------------------
  respawnDelay: 3.2,
  /** Health fraction below which the view starts to swim. */
  lowHealthFraction: 0.35,
  /** Concussion per point of damage taken, and its ceiling for one hit. */
  damageConcussion: 0.006,
  damageConcussionMax: 0.45,
  /** Sustained concussion at zero health, scaled down towards the threshold. */
  lowHealthConcussion: 0.17,
  /** How often the sustained low-health concussion is refreshed. */
  concussionInterval: 0.25,
  /** Fall damage ramps faster than linearly between the two speed thresholds. */
  fallDamageCurve: 1.35,
  /** Health granted per emitted heal event, so the bus is not driven per frame. */
  regenEmitStep: 5,
  /** Radius inside which a live enemy disqualifies a spawn point outright. */
  spawnDangerRadius: 22,
  /** Weight given to a spawn point's authored priority against enemy distance. */
  spawnPriorityWeight: 6,
  spawnJitter: 4,
} as const;

/** Solid world for every probe the controller makes: geometry and props, never bodies. */
export const SOLID_GROUPS = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;

export const STAND_HEIGHT = P.height;
export const CROUCH_HEIGHT = P.crouchHeight;
export const PRONE_HEIGHT = P.proneHeight;
/** Cosine of the steepest surface the character may stand on. */
export const COS_MAX_SLOPE = Math.cos(P.maxSlopeDeg * DEG2RAD);
