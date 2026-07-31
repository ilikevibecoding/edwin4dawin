/**
 * Physics tuning constants.
 *
 * Values that affect how the game *feels* live in `core/Config.GAMEPLAY`; this
 * file only holds solver and safety numbers that designers never touch.
 */
import type { SurfaceType } from '../core/GameTypes';

export const PHYS = {
  /** Solver iterations. Four is Rapier's default and is enough for debris. */
  solverIterations: 4,
  internalPgsIterations: 1,
  /** CCD substeps for fast projectiles and grenades. */
  maxCcdSubsteps: 2,

  // --- Static batching ---
  /** Edge length of the XZ bucket that shares one fixed rigid body, in metres. */
  staticCellSize: 40,
  /** Bucket indices are clamped to this range to keep the numeric key unique. */
  staticCellLimit: 511,

  // --- Character controller ---
  /**
   * Collision skin between the capsule and the world. Rapier's autostep probes
   * with this as their margin, and below ~0.04 it stops detecting steps near the
   * top of the allowed range: at 0.02 a 0.40 m kerb blocks a character whose
   * stepHeight is 0.42. 0.05 climbs the full range and still refuses anything
   * above stepHeight. The capsule floats by this much, which `position`
   * compensates for so the reported feet stay on the floor.
   */
  characterOffset: 0.05,
  /** Distance below the feet that still counts as ground when walking downhill. */
  characterSnapDistance: 0.36,
  /** Free space required beyond a step before the controller will climb it. */
  characterAutostepMinWidth: 0.2,
  /** Longest displacement honoured in a single move(), in metres. */
  characterMaxStep: 4,
  /** Downward probe used when the controller reports ground without a contact. */
  characterGroundProbe: 0.5,
  /**
   * Rapier's own autostep only fires when the per-step horizontal displacement is
   * around 0.05 m — roughly 6 m/s at 120 Hz — so anything slower than a sprint
   * leaves the character stuck on kerbs. Below this fraction of the requested
   * horizontal movement the step-up probe takes over.
   */
  characterStepBlockedFraction: 0.7,
  /** How far past the capsule surface the ledge probe looks, in metres. */
  characterStepProbeAhead: 0.02,
  /** Rises smaller than this are handled by the solver and not worth a probe. */
  characterStepMinRise: 0.01,
  /** Slack added above the climb angle before the character is told to slide. */
  characterSlideAngleBias: 0.0,
  characterFriction: 0.0,

  // --- Dynamic bodies ---
  /** Hard ceiling on simultaneous dynamic bodies before LRU recycling kicks in. */
  maxDynamicBodies: 320,
  maxLinearVelocity: 220,
  maxAngularVelocity: 60,
  /** Bodies below this height or outside the horizontal bound are recycled. */
  killPlaneY: -120,
  killRadius: 2400,
  defaultLinearDamping: 0.04,
  defaultAngularDamping: 0.16,
  /** Prediction distance for the cheap "soft" CCD applied to every dynamic body. */
  softCcdPrediction: 0.6,

  // --- Ragdolls ---
  ragdollLinearDamping: 0.16,
  ragdollAngularDamping: 3.2,
  ragdollDensity: 985,
  /** Joint motors run at zero velocity to act as joint friction. */
  ragdollJointFriction: 0.35,
  /** Ragdolls are force-slept after this long so a jammed corpse cannot twitch forever. */
  ragdollMaxActiveTime: 14,
  /** Sleep polling interval, in fixed steps. */
  ragdollSettleCheckSteps: 15,

  // --- Explosions ---
  /** Fraction of the blast redirected upwards so debris lofts instead of sliding. */
  explosionUpBias: 0.45,
  /** Peak tumble rate imparted at the centre of a blast, in rad/s. */
  explosionSpin: 16,
  /** Largest velocity change a single blast may impart, in m/s. */
  explosionMaxDeltaV: 34,

  // --- Debug render ---
  /** Frames between debug geometry rebuilds; the buffer is tens of thousands of lines. */
  debugRebuildInterval: 3,
} as const;

export interface SurfacePhysics {
  friction: number;
  restitution: number;
}

/** Per-surface contact response. Concrete is the fallback for anything unmapped. */
export const SURFACE_PHYSICS: Record<SurfaceType, SurfacePhysics> = {
  concrete: { friction: 0.92, restitution: 0.04 },
  metal: { friction: 0.58, restitution: 0.18 },
  wood: { friction: 0.78, restitution: 0.1 },
  dirt: { friction: 0.95, restitution: 0.02 },
  sand: { friction: 1.05, restitution: 0.0 },
  gravel: { friction: 1.0, restitution: 0.03 },
  grass: { friction: 0.86, restitution: 0.02 },
  water: { friction: 0.3, restitution: 0.0 },
  glass: { friction: 0.32, restitution: 0.12 },
  flesh: { friction: 0.9, restitution: 0.0 },
  plaster: { friction: 0.84, restitution: 0.04 },
  brick: { friction: 0.94, restitution: 0.05 },
  tile: { friction: 0.5, restitution: 0.1 },
  fabric: { friction: 1.1, restitution: 0.0 },
  rubber: { friction: 1.25, restitution: 0.55 },
  foliage: { friction: 0.7, restitution: 0.0 },
};

export const surfacePhysics = (surface: SurfaceType | undefined): SurfacePhysics =>
  (surface && SURFACE_PHYSICS[surface]) || SURFACE_PHYSICS.concrete;
