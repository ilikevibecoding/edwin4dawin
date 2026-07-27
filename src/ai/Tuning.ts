/**
 * Every tunable number the AI uses, in one place.
 *
 * The rule followed here is that anything a designer would want to feel out by
 * changing a value and replaying a fight lives in this file, and anything that
 * is a consequence of geometry or of another module's contract does not. So the
 * reaction times, the awareness rates and the burst discipline are here; the
 * capsule height is here because it has to agree with the hitbox height reported
 * to combat, and the nav step limit is not, because physics owns it.
 */
import { DEG2RAD } from '../core/MathUtils';

export type Difficulty = 'recruit' | 'regular' | 'hardened' | 'veteran';

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export const BODY = {
  /** Standing capsule height, and therefore the model height. */
  standHeight: 1.8,
  /**
   * Measured off the animator's crouch pose rather than picked: the pelvis drops
   * to 0.55 m and the spine pitches forward, which puts the crown here. The hitbox
   * reported to combat has to be this number or the player shoots at air above the
   * visible head, and it has to stay under the world's 1.32 m low-cover crest or
   * crouching behind a wall hides nothing.
   */
  crouchHeight: 1.28,
  radius: 0.33,
  /** Eye height above the feet, used for sight rays and muzzle placement. */
  eyeHeight: 1.63,
  crouchEyeHeight: 1.11,
  /** Where the weapon muzzle sits relative to the eye when shouldered. */
  muzzleForward: 0.42,
  muzzleDrop: 0.1,
  mass: 82,
} as const;

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export const MOVE = {
  walk: 2.2,
  /** Weapon-up advance: fast enough to close ground, slow enough to shoot. */
  combatWalk: 3.1,
  run: 5.3,
  sprint: 6.4,
  crouchWalk: 1.35,
  /** Metres per second squared. */
  acceleration: 14,
  deceleration: 20,
  gravity: -18.6,
  /** Radians per second the body yaw chases its target. */
  turnRate: 6.5,
  /** Slower while shouldered, which is what makes a strafing enemy readable. */
  aimTurnRate: 3.4,
  /** Beyond this angle from the path the agent turns before it walks. */
  turnInPlaceAngle: 105 * DEG2RAD,
  /** Separation radius used by local avoidance. */
  avoidRadius: 0.95,
  avoidStrength: 3.4,
  /** Metres ahead along the path the steering target is sampled. */
  lookahead: 1.35,
  waypointRadius: 0.45,
  /** Seconds of no progress before the path is considered blocked. */
  stuckTime: 0.75,
  stuckSpeed: 0.35,
} as const;

// ---------------------------------------------------------------------------
// Perception
// ---------------------------------------------------------------------------

export const SIGHT = {
  /** Full field of view, horizontal. Peripheral detection is much slower. */
  fovDeg: 110,
  /** Inside this cone the agent is looking straight at the target. */
  focusFovDeg: 34,
  /** Hard cap on how far anything can be noticed. */
  maxRange: 90,
  /** Distance at which awareness builds at full rate. */
  idealRange: 14,
  /** Awareness gained per second at ideal range, in the open, unobstructed. */
  gainRate: 3.4,
  /** Peripheral vision multiplier at the edge of the cone. */
  peripheralScale: 0.28,
  /** Awareness lost per second with no contact at all. */
  decayRate: 0.34,
  /** Multiplier while the target is sprinting. */
  runningTargetScale: 1.55,
  crouchedTargetScale: 0.62,
  proneTargetScale: 0.4,
  /** A muzzle flash is the loudest thing on a battlefield. */
  firingTargetScale: 2.6,
  /** Shade and interiors hide people; this is the floor of that multiplier. */
  darknessScale: 0.55,
  /** Awareness at which the agent starts reacting at all. */
  alertThreshold: 0.35,
  /** Awareness at which the target counts as positively identified. */
  engageThreshold: 1.0,
  /** Awareness is allowed to bank a little past 1 so brief cover does not reset it. */
  maxAwareness: 1.55,
  /** Seconds the last known position stays worth searching. */
  memoryDuration: 12,
  /** Seconds of velocity extrapolation applied to the last known position. */
  predictionTime: 1.15,
  /** Body sample points tested for line of sight. */
  samples: 3,
} as const;

export const HEARING = {
  /** Radius a quiet footstep is noticed within. */
  footstepQuiet: 9,
  footstepLoud: 20,
  /** Unsuppressed gunfire carries across the map; suppressed barely at all. */
  gunshot: 78,
  gunshotSuppressed: 17,
  explosion: 95,
  mantle: 13,
  /** Positional uncertainty added to an investigation point, in metres. */
  uncertainty: 2.6,
  /** Awareness granted by a sound at point-blank range. */
  gain: 0.62,
  /** Sounds closer together than this collapse into one investigation. */
  mergeDistance: 4,
} as const;

export const RADIO = {
  /** Squadmates within this range receive contact reports. */
  range: 55,
  /** Seconds between hearing a contact and passing it on. */
  delay: 0.55,
  /** Awareness a second-hand report is worth. */
  sharedAwareness: 0.72,
  /** Minimum seconds between two callouts from the same agent. */
  callCooldown: 3.4,
} as const;

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export const FIGHT = {
  /** Preferred distance band; the agent advances or falls back to hold it. */
  minEngage: 5,
  maxEngage: 52,
  /** Seconds of resampling interval for the persistent aim error offset. */
  errorResampleMin: 0.32,
  errorResampleMax: 0.85,
  /** Extra aim error applied to the first shot of an engagement, multiplier. */
  firstShotPenalty: 2.4,
  /** Seconds the first-shot penalty decays over. */
  firstShotDecay: 1.1,
  /** Multiplier on aim error while the shooter is moving. */
  movingErrorScale: 2.2,
  /** Multiplier on aim error while suppressed. */
  suppressedErrorScale: 5.5,
  /**
   * Agents allowed to shoot to kill at the same time, across the whole map.
   *
   * A player ringed by ten men who are all trying to hit dies in well under a
   * second, and tightening any one man's spread cannot fix it: the lethality is in
   * the number of barrels, not the cone of any one of them. Every shooter in a AAA
   * firefight is firing; only two or three of them are aiming. The rest are laying
   * rounds past you, which is what makes the fight loud, suppressive and survivable
   * at the same time.
   */
  maxEngaging: 3,
  /** Aim error multiplier for a shooter that holds no engagement token. */
  unfocusedErrorScale: 4.2,
  /** Seconds between reassigning the tokens. */
  engagementInterval: 0.6,
  /** How much of the target's velocity the agent leads, 0..1. */
  leadFraction: 0.72,
  /** Seconds before an agent that has lost sight stops firing at the memory. */
  blindFireWindow: 0.55,
  /** Seconds between peeks out of cover, randomised around this. */
  peekInterval: 2.3,
  peekIntervalJitter: 1.5,
  peekDuration: 1.5,
  peekDurationJitter: 0.9,
  /** Fraction of the magazine at which the agent looks for a lull to reload. */
  tacticalReloadFraction: 0.28,
  /** Seconds the target must be static behind cover before a grenade is worth it. */
  grenadeStaticTime: 3.4,
  grenadeCooldown: 14,
  grenadeMinRange: 9,
  grenadeMaxRange: 30,
  /** Telegraph between the shout and the throw. */
  grenadeTelegraph: 0.75,
  /** Seconds of suppression that pins an agent in cover. */
  suppressionPinned: 0.45,
  /** Suppression decays at this many units per second. */
  suppressionDecay: 0.55,
  maxSuppression: 3.2,
} as const;

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

export const COVER = {
  /** How far an agent will travel to reach a cover slot. */
  searchRadius: 20,
  /** Never take cover this close to the threat. */
  minThreatDistance: 4.5,
  /** Cover whose normal faces the threat this well or better is acceptable. */
  minProtection: 0.3,
  /** Candidates scored per query, after the cheap distance/protection filters. */
  candidates: 14,
  /** Of those, how many get a line-of-sight test. */
  losTests: 5,
  /** Seconds a claim survives without being refreshed. */
  claimTimeout: 2,
  /** Weights for the scoring function. */
  wDistance: 1,
  wProtection: 9,
  wFiring: 7,
  wThreatDistance: 0.6,
  wVariety: 2.4,
} as const;

// ---------------------------------------------------------------------------
// Pathfinding
// ---------------------------------------------------------------------------

export const PATH = {
  /** Node expansions allowed across all agents per frame. */
  frameBudget: 2200,
  /** Hard ceiling on one search, spread over as many frames as it needs. */
  maxExpansions: 14000,
  /** Requests queued before the oldest low-priority one is dropped. */
  queueLimit: 24,
  /** Waypoints a smoothed path may hold. */
  maxWaypoints: 96,
  /** Metres the destination may drift before the path is recomputed. */
  repathDistance: 3,
  /** Minimum seconds between two searches for the same agent. */
  repathCooldown: 0.45,
  /** Heuristic weight. Slightly greedy: much cheaper, paths stay believable. */
  heuristicWeight: 1.15,
  /** Extra cost per metre of climb, so agents prefer the flat route. */
  climbCost: 2.2,
} as const;

// ---------------------------------------------------------------------------
// Level of detail
// ---------------------------------------------------------------------------

export const LOD = {
  /** Full animation, IK and per-frame perception inside this radius. */
  nearDistance: 24,
  /** Simplified IK, 30 Hz animation, 10 Hz perception. */
  midDistance: 55,
  /** Beyond mid: low-poly mesh, 10 Hz animation, 5 Hz perception. */
  nearRate: 0,
  midRate: 1 / 30,
  farRate: 1 / 10,
  perceptionNear: 1 / 20,
  perceptionMid: 1 / 8,
  perceptionFar: 1 / 4,
  /** Agents further than this from the player stride their capsule move. */
  moveStrideDistance: 40,
} as const;

// ---------------------------------------------------------------------------
// Director
// ---------------------------------------------------------------------------

export const DIRECTOR = {
  /** Live enemies the director tries to hold. */
  targetAlive: 12,
  maxAlive: 22,
  /** Seconds between spawn attempts. */
  spawnInterval: 2.6,
  /** Enemies added per attempt. */
  spawnBatch: 2,
  /** Never spawn closer than this to the player. */
  minSpawnDistance: 26,
  /** Prefer spawn points at least this far outside the player's view cone. */
  spawnViewAngleDeg: 62,
  /** Seconds a corpse lingers before it is recycled. */
  corpseLifetime: 22,
  /** Corpses kept in the world at once. */
  maxCorpses: 8,
  squadSize: 4,
} as const;

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

export interface DifficultyProfile {
  id: Difficulty;
  /** Seconds between acquiring a target and the first shot. */
  reactionTime: number;
  /**
   * Half-angle of the aim error cone, in degrees.
   *
   * The persistent offset is sampled from a gaussian with a standard deviation of
   * half this cone at the target's range, so the useful way to read the numbers is
   * against the target: a standing man is roughly 1.4 degrees wide at 20 m, which
   * makes 2 degrees a shooter who lands a bit under a third of his rounds on a
   * stationary target and considerably fewer on a moving one. Measured with
   * `src/ai/dev/aitrace.mjs`, not guessed.
   */
  aimErrorDeg: number;
  /** How fast the aim point converges on the target, per second. */
  aimConverge: number;
  /** Multiplier on awareness gain. */
  awarenessScale: number;
  healthScale: number;
  /** Multiplier on the pause between bursts. Higher = more forgiving. */
  burstPauseScale: number;
  /** Chance per engagement that the agent uses cover well rather than pushing. */
  coverDiscipline: number;
  /** Multiplier on damage the agent deals. */
  damageScale: number;
  grenadeChance: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  recruit: {
    id: 'recruit',
    reactionTime: 0.7,
    aimErrorDeg: 5.4,
    aimConverge: 4,
    awarenessScale: 0.7,
    healthScale: 0.8,
    burstPauseScale: 1.7,
    coverDiscipline: 0.45,
    damageScale: 0.65,
    grenadeChance: 0.15,
  },
  regular: {
    id: 'regular',
    reactionTime: 0.5,
    aimErrorDeg: 3.6,
    aimConverge: 6.5,
    awarenessScale: 1,
    healthScale: 1,
    burstPauseScale: 1.3,
    coverDiscipline: 0.7,
    damageScale: 0.85,
    grenadeChance: 0.35,
  },
  hardened: {
    id: 'hardened',
    reactionTime: 0.36,
    aimErrorDeg: 2.6,
    aimConverge: 9.5,
    awarenessScale: 1.35,
    healthScale: 1.15,
    burstPauseScale: 1.05,
    coverDiscipline: 0.85,
    damageScale: 1,
    grenadeChance: 0.55,
  },
  veteran: {
    id: 'veteran',
    reactionTime: 0.25,
    aimErrorDeg: 2,
    aimConverge: 13,
    awarenessScale: 1.7,
    healthScale: 1.3,
    burstPauseScale: 0.85,
    coverDiscipline: 0.95,
    damageScale: 1.15,
    grenadeChance: 0.75,
  },
};

/** Audio cue ids the AI asks for. Listed so the audio module can author them. */
export const VOICE = {
  contact: 'ai_voice_contact',
  reloading: 'ai_voice_reloading',
  grenade: 'ai_voice_grenade',
  flanking: 'ai_voice_flanking',
  covering: 'ai_voice_covering',
  movingIn: 'ai_voice_moving',
  lostHim: 'ai_voice_lost',
  suppressed: 'ai_voice_pinned',
  hit: 'ai_voice_hit',
  death: 'ai_voice_death',
  spot: 'ai_voice_spotted',
} as const;

export const SFX = {
  gearShift: 'ai_gear_shift',
  reload: 'weapon_mag_in',
  magOut: 'weapon_mag_out',
  grenadePin: 'weapon_grenade_pin',
  grenadeThrow: 'weapon_grenade_throw',
  bodyFall: 'ai_body_fall',
  footstep: 'ai_footstep',
} as const;
