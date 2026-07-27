/**
 * PLAYER TUNING — every number that decides how the game feels, in one place.
 *
 * Units are metres, seconds and radians throughout. Nothing in `src/player/**`
 * hard-codes a magnitude; if a value can be argued about, it lives here.
 *
 * The object is deliberately mutable and deliberately plain data, so it can be
 * poked from the console (`__PLAYER_TEST__.tuning`) and serialised by the test
 * harness — `tools/player-test.mjs` derives its expectations from these very
 * numbers rather than repeating them, so the spec and the code cannot drift.
 *
 * The two models the numbers describe:
 *
 *   Ground speed. Friction is applied first, then acceleration toward the wish
 *   velocity, clamped so the wish speed is never exceeded (the Quake model).
 *   Speed therefore obeys `ds/dt = accel - friction * s` up to a ceiling of the
 *   wish speed, so the reachable top speed is `groundAccel / groundFriction`
 *   and the time to a fraction `k` of a top speed `v` is
 *   `-ln(1 - k * v * friction / accel) / friction`. Keep the ratio comfortably
 *   above `tacticalSprintSpeed` or sprint silently stops reaching its cap.
 *
 *   Jump. Gravity is asymmetric: a light rise for a snappy takeoff and a
 *   heavier fall so the arc has a "top" you can feel. The launch velocity is
 *   derived from the apex height and the rise gravity, never typed in, and
 *   integration is leapfrog so the apex is exact at any frame rate.
 */
export const T = {
  /* ===================== capsule and stances ============================= */

  /** Collision capsule radius. Narrow enough for a 1.1 m doorway. */
  capsuleRadius: 0.38,
  /** Kerbs and treads up to this height are climbed by the physics step-up. */
  stepHeight: 0.42,

  /** Capsule height per stance. */
  standHeight: 1.8,
  crouchHeight: 1.15,
  proneHeight: 0.6,
  slideHeight: 1.05,

  /** Eye height above the feet per stance. */
  standEye: 1.62,
  crouchEye: 0.98,
  proneEye: 0.36,
  slideEye: 0.74,

  /** Rate the capsule and eye interpolate between stances, in 1/s. */
  stanceLambda: 13,
  /** Going prone and standing up out of prone are slower and read as committed. */
  proneLambda: 7.5,
  /** Movement is locked out for this long when entering or leaving prone. */
  proneTransitionTime: 0.42,

  /* ========================= ground movement ============================= */

  /** Stance top speeds. */
  walkSpeed: 4.2,
  sprintSpeed: 6.4,
  tacticalSprintSpeed: 7.6,
  crouchSpeed: 2.1,
  proneSpeed: 0.9,

  /** Directional authority: full ahead, less sideways, least backwards. */
  strafeScale: 0.85,
  backScale: 0.7,

  /**
   * Ground acceleration. High enough to feel responsive, finite enough that
   * the first third of a metre has weight.
   */
  groundAccel: 50,
  /**
   * Ground friction in 1/s. `groundAccel / groundFriction` = 9.1 m/s is the
   * speed ceiling this pair implies, which sits above tactical sprint with
   * enough headroom that the last 10% of the ramp is not glacial.
   */
  groundFriction: 5.5,
  /**
   * Floor on the friction "control" speed, so the last half metre per second
   * bleeds off linearly instead of asymptotically and the player fully stops.
   */
  frictionStopSpeed: 0.8,
  /** Friction multiplier while the stick opposes the velocity: crisp braking. */
  brakeFrictionScale: 2.2,

  /**
   * Air acceleration. A twelfth of the ground figure: enough to adjust a
   * landing, nowhere near enough to change your mind mid-air, which is what
   * makes a jump a commitment rather than a hover.
   */
  airAccel: 5,
  /** Ceiling on the speed air acceleration may steer toward, as a multiple of the stance top speed. */
  airSpeedCap: 1,

  /** Aiming down sights throttles movement hard, strafing most of all. */
  adsSpeedScale: 0.52,
  adsStrafeScale: 0.42,

  /* ============================== sprint ================================= */

  /** Sprint cannot be entered below this speed, so it never starts from a standstill. */
  sprintEntrySpeed: 1.7,
  /** Forward stick fraction required to hold a sprint. */
  sprintEntryForward: 0.55,
  /** Seconds for the sprint speed cap to ramp from walk to full: the spin-up. */
  sprintSpinUp: 0.28,
  /** A second sprint press inside this window promotes to tactical sprint. */
  doubleTapWindow: 0.3,
  /** Seconds after a sprint ends before the weapon may fire — CoD's "sprint out time". */
  sprintOutTime: 0.16,
  tacticalSprintOutTime: 0.3,
  /** Seconds of sprinting that fully winds the player, deepening breath sway. */
  windedTime: 4.5,
  /** Seconds of not sprinting to fully recover from being winded. */
  windedRecoverTime: 7,

  /* =============================== jump ================================== */

  /** Real gravity, per the engine convention. Both scales below multiply it. */
  gravity: 9.81,
  /** Light on the way up: a snappy, deliberate takeoff. */
  riseGravityScale: 1.7,
  /** Heavier on the way down, so the apex reads as a distinct moment. */
  fallGravityScale: 2.25,
  /** Apex of a standing jump. The launch velocity is derived from this. */
  jumpApex: 1.05,
  /** Grace period after walking off a ledge during which jump still works. */
  coyoteTime: 0.09,
  /** A jump pressed this long before landing fires on touchdown. */
  jumpBufferTime: 0.12,
  /** Minimum spacing between jumps; blocks machine-gun bunny hopping. */
  jumpCooldown: 0.28,
  /** Fraction of horizontal speed kept when jumping, so bunny hopping cannot build speed. */
  jumpSpeedKeep: 1,

  /* =============================== slide ================================= */

  /** Fraction of sprint speed required before crouch triggers a slide. */
  slideEntryFraction: 0.82,
  /** Instant speed added along the facing when the slide starts. */
  slideBoost: 2,
  /** Hard ceiling on slide speed, including downhill gain. */
  slideMaxSpeed: 9.5,
  /** Nominal slide length. The friction ramp is scaled to this. */
  slideDuration: 0.9,
  /** Slide friction at entry, in 1/s: almost none, so the boost carries. */
  slideFrictionStart: 0.6,
  /** Slide friction at the end of the ramp, in 1/s. Ramp is quadratic in time. */
  slideFrictionEnd: 2.4,
  /** Below this speed the slide gives up early and becomes a crouch. */
  slideMinSpeed: 2.6,
  /** Downhill gravity along the ground plane, as a multiple of true gravity. */
  slideSlopeScale: 1.25,
  /** Lateral acceleration available while sliding: steering, not driving. */
  slideSteerAccel: 4.5,
  /** Seconds before another slide may be started. */
  slideCooldown: 0.55,
  /** Upward velocity granted by a slide jump-out, as a fraction of a normal jump. */
  slideJumpScale: 0.92,

  /* =========================== mantle and vault ========================== */

  /** Ledges below this are just steps; the physics step-up handles them. */
  mantleMinHeight: 0.5,
  /** Ledges above this are unclimbable. */
  mantleMaxHeight: 1.6,
  /** How far ahead of the capsule a wall must be to count as mantleable. */
  mantleReach: 0.95,
  /** Cosine limit on the wall normal: shallower than this is a ramp, not a ledge. */
  mantleWallDot: 0.55,
  /** How far past the wall face the landing spot sits, on top of the radius. */
  mantleLandingInset: 0.22,
  /** Vertical clearance a crouched capsule needs above the landing spot. */
  mantleClearance: 0.55,
  /** Fixed part of the mantle duration. */
  mantleTimeBase: 0.3,
  /** Extra mantle duration per metre of rise. */
  mantleTimePerMeter: 0.34,
  /** Forward speed handed back when the mantle finishes. */
  mantleExitSpeed: 2.2,
  /** Obstacles no taller than this with clear ground beyond are vaulted, not mantled. */
  vaultMaxHeight: 1.05,
  /** How far beyond the landing spot the ground is probed to detect a thin obstacle. */
  vaultProbeDistance: 0.95,
  /** Drop beyond the obstacle that marks it as something to vault over. */
  vaultFarDrop: 0.35,
  /** Vaults are quicker than mantles of the same height. */
  vaultTimeScale: 0.62,
  /** Forward speed kept through a vault. */
  vaultExitSpeed: 4.2,
  /** Minimum forward stick to attempt a mantle at all. */
  mantleForwardInput: 0.35,
  /** Automatic vaulting engages above this speed; below it, jump is required. */
  vaultAutoSpeed: 4,
  /** Fixed steps between mantle probes while pressed against a wall. */
  mantleProbeInterval: 4,
  /** Camera pitch dip and roll during a mantle, in radians. */
  mantlePitchDip: 0.13,
  mantleRoll: 0.075,
  /** Metres the eye tucks down mid-climb, so the body reads as pulling up. */
  mantleTuck: 0.14,

  /* =============================== lean ================================== */

  /** Peak lateral eye offset when leaning. The capsule does not move. */
  leanOffset: 0.24,
  /** Peak roll when leaning. */
  leanRoll: 0.2,
  /** Lean spring frequency and damping. */
  leanStiffness: 13,
  leanDamping: 1,
  /** Clearance kept between the leaned eye and a wall. */
  leanClearance: 0.3,
  /** Leaning is suppressed while moving faster than this. */
  leanMaxSpeed: 2.6,

  /* ================================ view ================================= */

  /** Hard pitch limit. Never reachable by any effect, only by aiming. */
  pitchLimit: 1.5690509, // 89.9 degrees
  /** Base field of view in degrees. */
  fov: 80,
  /** Field of view added at full sprint. */
  sprintFovKick: 6,
  /** Extra kick while tactical sprinting. */
  tacticalFovKick: 2.5,
  /** Rate the sprint kick eases in and out, in 1/s. */
  sprintFovLambda: 5,
  /** Rate an unscheduled field-of-view request converges, in 1/s. */
  fovLambda: 12,
  /** Field-of-view punch spring for hard landings and blasts. */
  fovPunchStiffness: 22,
  fovPunchDamping: 0.85,
  /** Degrees of punch per m/s of impact above the hard-landing threshold. */
  fovPunchPerImpact: 0.55,

  /* ============================== view bob =============================== */

  /**
   * Bob is phase-locked to the stride, not to wall-clock time: the phase
   * advances with distance travelled, so footstep audio and the visual dip
   * cannot drift apart. One full phase cycle is two footfalls.
   */
  stepLengthWalk: 1.2,
  stepLengthSprint: 1.55,
  stepLengthCrouch: 0.85,
  stepLengthProne: 0.7,
  /** Lateral bob amplitude at walk speed. */
  bobLateral: 0.032,
  /** Vertical bob amplitude at walk speed (twice the lateral frequency). */
  bobVertical: 0.026,
  /** Bob roll and pitch amplitudes in radians. */
  bobRoll: 0.0125,
  bobPitch: 0.006,
  /** Amplitude multiplier at sprint speed. */
  bobSprintScale: 1.5,
  /** Amplitude multiplier while crouched or prone. */
  bobCrouchScale: 0.55,
  /** Fraction of bob removed at full ADS. */
  bobAdsCut: 0.9,
  /** Rate the bob amplitude follows speed changes, in 1/s. */
  bobLambda: 7,
  /** Landing on a footfall while airborne is meaningless: fade bob out this fast. */
  bobAirLambda: 9,

  /* ========================== breathing and sway ========================= */

  /** Breath cycle frequency at rest and when fully winded, in Hz. */
  breathFreqIdle: 0.16,
  breathFreqWinded: 0.62,
  /** Breath sway amplitude in radians, at rest and fully winded. */
  breathAmpIdle: 0.0055,
  breathAmpWinded: 0.0105,
  /** Breath deepens when the player holds still. */
  breathStillScale: 1.4,
  /** Amplitude multiplier while the breath is held, and how fast it blends. */
  breathHoldScale: 0.06,
  breathHoldLambda: 9,
  /** Seconds the breath can be held before it is forced out. */
  breathHoldMax: 4.5,
  /** Seconds to recover a full breath hold. */
  breathHoldRecover: 3.5,
  /** Fraction of breath sway remaining at full ADS (aiming steadies the hands). */
  breathAdsScale: 0.55,

  /**
   * Look lag: the view trails a fast flick by a hair. Capped tightly, because
   * this is a shooter — the crosshair must not float away from the aim point.
   */
  lookLagStiffness: 26,
  lookLagDamping: 0.85,
  /** Radians of lag per radian of look delta in a single frame. */
  lookLagGain: 0.28,
  /** Hard cap on the lag offset, in radians (about 1.1 degrees). */
  lookLagMax: 0.02,

  /* ========================= landing and momentum ======================== */

  /** Impact speed at which a landing is considered soft / hard, in m/s. */
  landSoftSpeed: 3,
  landHardSpeed: 9,
  /** Camera dip in metres at a hard landing. */
  landDip: 0.13,
  /** Pitch and roll kick in radians at a hard landing. */
  landPitch: 0.1,
  landRoll: 0.035,
  /** Landing spring: firm, with a touch of overshoot on the way back. */
  landStiffness: 19,
  landDamping: 0.72,
  /** Rate the step-up lift is paid back to the camera, in 1/s. */
  stepSmoothLambda: 15,
  /** Cap on the step-up smoothing offset, so a big lift cannot bury the camera. */
  stepSmoothMax: 0.5,

  /** Roll into a strafe, in radians at full lateral speed. */
  momentumRoll: 0.026,
  /** Pitch change under acceleration, in radians at full ground acceleration. */
  momentumPitch: 0.012,
  /** Momentum lean spring. */
  momentumStiffness: 9,
  momentumDamping: 1,
  /** Extra roll while sliding, in radians. */
  slideRoll: 0.055,

  /* =============================== recoil ================================ */

  /**
   * CoD-style recoil: the view kicks and then recovers toward — but not all the
   * way back to — the original aim point. `recoilRecovered` is the fraction
   * that comes back; the remainder is a permanent aim change, which is what
   * makes a long burst climb.
   */
  recoilRecovered: 0.75,
  /** Fraction of the horizontal kick that is permanent. */
  recoilYawRecovered: 0.9,
  /** Recoil spring: fast and slightly loose, so the kick snaps. */
  recoilStiffness: 30,
  recoilDamping: 0.72,
  /** Rate the transient part of the kick decays back to zero, in 1/s. */
  recoilReturnLambda: 7,
  /** Roll induced per radian of yaw kick. */
  recoilRollRatio: 0.35,

  /* ============================ camera shake ============================= */

  /** Simultaneous shake sources. Beyond this the weakest is replaced. */
  shakeSlots: 6,
  /** Default noise frequency in Hz when an event does not specify one. */
  shakeFrequency: 11,
  /** Radians of rotational shake per metre of requested amplitude. */
  shakeRotPerMeter: 0.9,
  /**
   * Translational shake per metre of requested amplitude. Kept small on
   * purpose: at close range, translating the camera reads as a rendering bug
   * while rotating it reads as an explosion.
   */
  shakeTransScale: 0.22,
  /** Exponent on the linear distance falloff when a source position is given. */
  shakeFalloffPower: 1.6,

  /* ============================== health ================================= */

  maxHealth: 100,
  /** Seconds without damage before regeneration starts. */
  regenDelay: 4.5,
  /** Health per second once regeneration is running. */
  regenRate: 22,
  /** Regeneration heal events are batched to this interval, in seconds. */
  regenEventInterval: 0.25,
  /** Impact speed below which a fall is free, and at which it is lethal. */
  fallDamageSpeed: 15,
  fallLethalSpeed: 26,
  /** Camera kick from taking a hit, in radians. */
  damageKickPitch: 0.05,
  damageKickYaw: 0.055,
  /** Shake amplitude in metres for a full-health-bar hit. */
  damageShake: 0.1,
  /** Seconds the death camera takes to settle. */
  deathTime: 1.1,
  /** Eye height the death camera falls to. */
  deathEye: 0.3,
  /** Roll and pitch of the death camera, in radians. */
  deathRoll: 1.05,
  deathPitch: -0.35,

  /* ============================ integration ============================== */

  /**
   * Movement runs on a fixed step so a 30 fps machine and a 240 fps machine
   * simulate the same jump. The render camera interpolates between the last
   * two steps, so nothing stutters in between.
   */
  fixedDt: 1 / 120,
  /** Fixed steps a single frame may run before time is dropped on the floor. */
  maxFixedSteps: 8,
};

/** Launch velocity that reaches `jumpApex` under the rise gravity. */
export function jumpVelocity(): number {
  return Math.sqrt(2 * T.gravity * T.riseGravityScale * T.jumpApex);
}

/** Gravity in m/s², signed, for a given vertical velocity. */
export function gravityFor(velocityY: number): number {
  return -T.gravity * (velocityY > 0 ? T.riseGravityScale : T.fallGravityScale);
}

/** Capsule height for a stance. */
export function stanceHeight(stance: 'stand' | 'crouch' | 'prone' | 'slide'): number {
  switch (stance) {
    case 'crouch':
      return T.crouchHeight;
    case 'prone':
      return T.proneHeight;
    case 'slide':
      return T.slideHeight;
    default:
      return T.standHeight;
  }
}

/** Eye height above the feet for a stance. */
export function stanceEye(stance: 'stand' | 'crouch' | 'prone' | 'slide'): number {
  switch (stance) {
    case 'crouch':
      return T.crouchEye;
    case 'prone':
      return T.proneEye;
    case 'slide':
      return T.slideEye;
    default:
      return T.standEye;
  }
}

/** Stride length for a stance, in metres per footfall. */
export function stanceStepLength(
  stance: 'stand' | 'crouch' | 'prone' | 'slide',
  sprinting: boolean,
): number {
  if (stance === 'prone') return T.stepLengthProne;
  if (stance === 'crouch' || stance === 'slide') return T.stepLengthCrouch;
  return sprinting ? T.stepLengthSprint : T.stepLengthWalk;
}
