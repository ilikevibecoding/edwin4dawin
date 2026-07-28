/**
 * Every number the AI can be judged by, in one place.
 *
 * Two kinds of constant live here. `AI` holds the physical facts about a
 * soldier — how tall he is, how fast he runs, how far he can see — which are
 * the same whatever the difficulty. `DIFFICULTY` holds the dials that decide
 * whether a firefight is fair, and those are deliberately separate because the
 * only honest way to tune "getting shot must feel fair" is to move one number
 * and watch what happens.
 */

export interface DifficultyProfile {
  name: string;
  /** Seconds between seeing the player and being allowed to shoot. */
  reactionTime: number;
  /** Extra reaction time when the contact arrives from behind. */
  reactionPenaltyFlank: number;
  /**
   * Half-angle in radians the first burst is scattered by, at `errorRange`
   * metres. Later bursts converge toward `aimErrorSettled`.
   */
  aimErrorFirst: number;
  aimErrorSettled: number;
  /** Distance the two error figures are quoted at; error scales with range. */
  errorRange: number;
  /** Seconds of sustained fire over which the error walks in to settled. */
  aimSettleTime: number;
  /** How much of the player's velocity the AI leads by, 0..1. */
  leadFactor: number;
  /** Rounds per burst, and the pause between them. */
  burstMin: number;
  burstMax: number;
  burstPauseMin: number;
  burstPauseMax: number;
  /** 0..1 chance per opportunity of pushing rather than holding cover. */
  aggression: number;
  /** Multiplier on damage dealt to the player. */
  damageScale: number;
  /** Seconds of continuous exposure before the AI relocates. */
  peekDuration: number;
  /** Accuracy multiplier while suppressed; 1 = no effect. */
  suppressedAccuracy: number;
  /** Seconds between grenade throws for one agent. */
  grenadeCooldown: number;
  /** Health below which the agent looks for a way out. */
  fleeHealth: number;
}

export const DIFFICULTY: Record<string, DifficultyProfile> = {
  recruit: {
    name: 'recruit',
    reactionTime: 0.85,
    reactionPenaltyFlank: 0.5,
    aimErrorFirst: 2.6,
    aimErrorSettled: 1.1,
    errorRange: 20,
    aimSettleTime: 3.5,
    leadFactor: 0.15,
    burstMin: 2,
    burstMax: 4,
    burstPauseMin: 0.9,
    burstPauseMax: 1.8,
    aggression: 0.25,
    damageScale: 0.6,
    peekDuration: 2.6,
    suppressedAccuracy: 2.6,
    grenadeCooldown: 26,
    fleeHealth: 0.2,
  },
  regular: {
    name: 'regular',
    reactionTime: 0.5,
    reactionPenaltyFlank: 0.35,
    aimErrorFirst: 1.7,
    aimErrorSettled: 0.6,
    errorRange: 20,
    aimSettleTime: 2.6,
    leadFactor: 0.35,
    burstMin: 3,
    burstMax: 6,
    burstPauseMin: 0.55,
    burstPauseMax: 1.25,
    aggression: 0.45,
    damageScale: 1,
    peekDuration: 2.1,
    suppressedAccuracy: 2.2,
    grenadeCooldown: 18,
    fleeHealth: 0.14,
  },
  veteran: {
    name: 'veteran',
    reactionTime: 0.32,
    reactionPenaltyFlank: 0.25,
    aimErrorFirst: 1.15,
    aimErrorSettled: 0.34,
    errorRange: 20,
    aimSettleTime: 1.9,
    leadFactor: 0.6,
    burstMin: 3,
    burstMax: 7,
    burstPauseMin: 0.4,
    burstPauseMax: 0.95,
    aggression: 0.62,
    damageScale: 1.25,
    peekDuration: 1.8,
    suppressedAccuracy: 1.9,
    grenadeCooldown: 13,
    fleeHealth: 0.1,
  },
  elite: {
    name: 'elite',
    reactionTime: 0.22,
    reactionPenaltyFlank: 0.18,
    aimErrorFirst: 0.8,
    aimErrorSettled: 0.22,
    errorRange: 20,
    aimSettleTime: 1.5,
    leadFactor: 0.8,
    burstMin: 4,
    burstMax: 8,
    burstPauseMin: 0.32,
    burstPauseMax: 0.75,
    aggression: 0.8,
    damageScale: 1.5,
    peekDuration: 1.5,
    suppressedAccuracy: 1.6,
    grenadeCooldown: 10,
    fleeHealth: 0.07,
  },
};

export const AI = {
  /* ------------------------------ body -------------------------------- */

  /** Capsule the mover uses. Shorter than the model so a doorway is passable. */
  radius: 0.34,
  standHeight: 1.78,
  crouchHeight: 1.24,
  proneHeight: 0.62,
  stepHeight: 0.42,
  eyeHeightStand: 1.62,
  eyeHeightCrouch: 1.12,
  eyeHeightProne: 0.42,
  mass: 82,

  maxHealth: 100,

  /* --------------------------- locomotion ----------------------------- */

  walkSpeed: 1.55,
  runSpeed: 4.35,
  sprintSpeed: 5.8,
  crouchSpeed: 1.15,
  proneSpeed: 0.6,
  /** Acceleration and braking, in m/s². */
  accel: 14,
  brake: 20,
  /** Fastest the body can turn, radians per second. */
  turnRate: 6.5,
  /** Metres a full stride covers at a run; the walk cycle is scaled from it. */
  strideLength: 1.62,
  /** Radius used for agent-vs-agent separation. */
  separationRadius: 0.92,
  separationStrength: 5.5,

  /* --------------------------- perception ----------------------------- */

  /** Metres at which the vision cone stops resolving a target at all. */
  sightRange: 78,
  /** Half-angle of the cone in radians; beyond it awareness only trickles. */
  fovHalf: 1.15,
  /** Half-angle of the inner cone where recognition is fastest. */
  fovFocusHalf: 0.42,
  /** Metres inside which a target is noticed regardless of facing. */
  proximityRadius: 4.5,
  /** Awareness units per second at point-blank range, dead ahead. */
  awarenessGain: 3.4,
  /** Awareness decay per second with nothing visible. */
  awarenessDecay: 0.42,
  /** Awareness at which the agent turns to look. */
  alertThreshold: 0.34,
  /** Awareness at which the contact is confirmed and shared with the squad. */
  detectThreshold: 1,
  /** Seconds a contact is remembered after the last sighting. */
  memoryTime: 11,
  /** Extra seconds a shared (radioed) contact is trusted for. */
  sharedMemoryTime: 7,

  /* ----------------------------- hearing ------------------------------ */

  /** Loudness of each sound in arbitrary units; range scales with it. */
  loudness: {
    playerShot: 1,
    suppressedShot: 0.3,
    enemyShot: 0.75,
    explosion: 2.4,
    footstepRun: 0.16,
    footstepWalk: 0.07,
    land: 0.22,
    vault: 0.12,
  },
  /** Metres a loudness of 1 carries. */
  hearingRange: 46,
  /** Multiplier applied when the sound has no line of sight to the ear. */
  hearingOcclusion: 0.55,
  /** Metres of positional error added to a heard contact, per unit distance. */
  hearingError: 0.16,

  /* ------------------------------ combat ------------------------------ */

  weapon: {
    rpm: 640,
    damage: 17,
    magSize: 30,
    reloadTime: 2.55,
    muzzleVelocity: 780,
    caliber: 0.00762,
    /** Metres at which damage begins to fall off, and where it bottoms out. */
    falloffStart: 26,
    falloffEnd: 68,
    falloffMin: 0.42,
    headshotMultiplier: 1.7,
  },
  /** Metres inside which the agent prefers to close rather than trade fire. */
  preferredRangeMin: 8,
  preferredRangeMax: 26,
  /** Beyond this the agent moves up rather than shooting. */
  maxEngageRange: 62,

  /* --------------------------- suppression ---------------------------- */

  /** Metres from the agent a round must pass to count as suppressing. */
  suppressRadius: 1.85,
  /** Suppression added per near miss, and how fast it bleeds off. */
  suppressPerRound: 0.34,
  suppressDecay: 0.55,
  /** Above this the agent ducks and stops peeking. */
  suppressPinned: 0.75,

  /* ------------------------------ cover ------------------------------- */

  /**
   * Metres an agent will travel to reach a cover point.
   *
   * Deliberately short. A soldier who breaks a firing line to walk twenty-five
   * metres to a better wall has lost the contact by the time he gets there,
   * and reads on screen as a man wandering off mid-fight.
   */
  coverSearchRadius: 15,
  /** How long a claimed cover point stays claimed with nobody using it. */
  coverClaimTimeout: 3,
  /** Seconds between cover re-evaluations for one agent. */
  coverRefresh: 2.2,
  /** Metres the agent stands off the cover point when leaning out. */
  peekOffset: 0.55,
  /**
   * Metres from a cover point at which the agent counts as being at it.
   *
   * Generous on purpose. The point is a sample on a 1.25 m grid and the
   * capsule stops wherever the geometry lets it, so demanding half a metre
   * means a soldier who is plainly behind the right wall keeps walking into it
   * because his arithmetic says he has not arrived.
   */
  coverArrive: 1.1,

  /* ----------------------------- grenades ------------------------------ */

  grenade: {
    fuse: 3.1,
    radius: 6.2,
    /**
     * Damage at the centre of the blast. Above a soldier's health on purpose:
     * a frag that lands at your feet and leaves you standing teaches the player
     * that grenades are noise, and then nobody moves when one lands.
     */
    damage: 130,
    /** Fraction of the radius that takes the full figure before falloff starts. */
    core: 0.22,
    throwSpeed: 13.5,
    /** Metres; below this the AI will not throw. */
    minRange: 7,
    maxRange: 32,
  },

  /* ------------------------------ budgets ------------------------------ */

  /** Agents whose perception is re-evaluated per frame. */
  perceptionPerFrame: 4,
  /** Agents allowed to ask for a path per frame. */
  pathsPerFrame: 2,
  /** Seconds an agent must wait between path requests. */
  repathInterval: 0.4,
  /** A* nodes expanded per frame across all requests. */
  pathNodeBudget: 900,
  /** Agents whose cover choice is re-scored per frame. */
  coverPerFrame: 2,
  /** Metres beyond which an agent animates at reduced rate and lower detail. */
  lodDistance: 34,
  /** Metres beyond which an agent uses the simplified mesh. */
  lodFarDistance: 70,
  /** Hard ceiling on live agents. */
  maxAgents: 32,
} as const;

export type Difficulty = keyof typeof DIFFICULTY;
