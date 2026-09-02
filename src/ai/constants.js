import { GROUP } from '../core/Physics.js';

/**
 * Gameplay tunables for the enemy soldiers. Everything time-based is in seconds, distances in metres,
 * angles in radians.
 */

/**
 * Collision membership of the enemy *movement* capsule. It is deliberately NOT GROUP.ENEMY: bullets are
 * resolved against the bone hitboxes (GROUP.ENEMY), and a capsule in the same group would swallow every
 * ray before it reached the head/torso colliders. The capsule still collides with GROUP.WORLD.
 */
export const GROUP_ENEMY_BODY = 1 << 5;

export const MODEL_ID = 'models/soldier/Soldier.glb';
export const MODEL_SOURCE_HEIGHT = 1.832; // Soldier.glb rest height (m) at scale 1
export const SOLDIER_HEIGHT = 1.8;

export const MOVE = {
  walkSpeed: 1.6,
  runSpeed: 4.5,
  crouchSpeed: 1.1,
  accel: 14, // m/s² toward the desired velocity
  decel: 22,
  gravity: 22,
  turnRate: 7.5, // rad/s body yaw
  aimTurnRate: 5.5,
  capsuleRadius: 0.3,
  capsuleHalfHeight: 0.6, // total height 1.8 m
  separationRadius: 1.4,
  separationForce: 2.4,
  playerSeparationRadius: 1.6,
  waypointRadius: 0.65,
  arriveRadius: 0.45,
  stuckTime: 1.4, // re-plan after this long without progress
  hardStuckTime: 2.6, // ...then hop to the nearest nav node
  stuckSpeedRatio: 0.2,
  stepHeight: 0.22, // autostep limit (curbs, not planters / doorsteps)
  whiskerRange: 1.1, // obstacle-avoidance feeler length
};

export const SENSE = {
  engageDistance: 45,
  visionHalfAngle: Math.PI * 0.75, // enemies "see" almost all around, but far shots need LOS
  losInterval: 0.12,
  hearGunfireDistance: 60,
  memoryTime: 8, // seconds a last-known position stays valid
  closeDistance: 8,
  preferredRange: 26, // beyond this they keep closing in instead of plinking from across the plaza
};

export const FIRE = {
  burstMin: 3,
  burstMax: 6,
  roundInterval: 0.09,
  pauseMin: 0.8,
  pauseMax: 2.0,
  damageMin: 9,
  damageMax: 13,
  baseSpread: 0.03,
  spreadPerMeter: 0.0009, // + per metre of range
  movingTargetSpread: 1.5, // multiplier when the player is moving
  stillTargetSpread: 0.85,
  burstGrowth: 0.12, // spread grows by this fraction per round in a burst
  reactionTime: 0.55,
  aimTolerance: 0.12, // rad between the rifle axis and the target before the first round
  suppressInterval: [1.6, 3.0],
  suppressBurst: [2, 3],
};

export const HEALTH = {
  max: 100,
  retreatBelow: 35,
  flinchTime: [0.22, 0.4],
  flinchCooldown: 1.1,
  flinchStagger: 0.35, // metres pushed along the hit direction
};

export const DEATH = {
  fallTime: 0.65,
  bodyTime: 15,
  sinkTime: 2.5,
  sinkDepth: 1.4,
};

export const ANIM = {
  walkStride: 1.65, // metres per Walk cycle (clip 1.03 s at 1.6 m/s)
  runStride: 3.15, // metres per Run cycle (clip 0.70 s at 4.5 m/s)
  blendRate: 6, // 1/s
  aimBlendRate: 5,
  crouchBlendRate: 4,
  // The Soldier.glb clips are rifle-idle poses hunched ~20° forward with the head down. These lean the
  // torso back (radians, split over Spine1/Spine2) so the soldiers stand like combatants, not mourners.
  postureIdle: 0.18,
  postureAim: 0.3,
  postureHead: 0.12,
  bladeYaw: 0.45, // torso turned right while shouldering the rifle (support shoulder forward)
};

/** Wave-based difficulty ramp: returns multipliers/limits for a given wave index (1-based). */
export function difficultyFor(wave = 1) {
  const w = Math.max(1, wave | 0);
  const t = Math.min(1, (w - 1) / 7);
  return {
    wave: w,
    spread: 1.35 - 0.7 * t, // 1.35 → 0.65 (tighter groups)
    burstMin: FIRE.burstMin,
    burstMax: Math.round(FIRE.burstMin + (FIRE.burstMax - FIRE.burstMin) * Math.min(1, 0.4 + t)),
    pauseScale: 1.15 - 0.5 * t, // shorter pauses
    reaction: FIRE.reactionTime * (1.1 - 0.6 * t),
    aggression: 0.35 + 0.5 * t, // probability of pushing instead of holding cover
    damage: 1 + 0.25 * t,
  };
}

export { GROUP };
