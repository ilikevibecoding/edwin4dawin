/**
 * Every number the killstreak module runs on, in one place.
 *
 * The air strike numbers are not arbitrary — they are a consistent solution to
 * one constraint set, and changing one in isolation breaks the sequence. The
 * chain is:
 *
 *   The carpet must ripple. Nine detonations 12 m apart with 180 ms between them
 *   is the authored read, which means the *impact point* walks along the run-in
 *   axis at 12 / 0.18 = 66.7 m/s. A bomb lands where it was released plus a fixed
 *   ballistic lead, so the *release point* has to walk at that same 66.7 m/s. A
 *   jet at 180 m/s covers 12 m in 67 ms, not 180 ms, so one aircraft physically
 *   cannot lay this pattern.
 *
 *   Three aircraft in trail can. Each drops a three-bomb stick at 130 ms
 *   intervals, and each trails the one ahead by 61.2 m along the run-in axis.
 *   The trail is exactly the amount by which the jet outruns the pattern over a
 *   stick (3 x (180 x 0.13 - 12) = 34.2 m... plus the 0.05 s per bomb that the
 *   180 ms impact cadence adds to each flight time), so stick two picks the line
 *   up where stick one left it, 12 m and 180 ms further on. See AIRSTRIKE_TRAIL.
 *
 *   The required *average* horizontal speed over each bomb's fall comes out at
 *   147-162 m/s against a 180 m/s release, i.e. a 10-19% loss to drag over three
 *   seconds. That is what a real free-fall bomb does, which is the check that
 *   says the schedule is physical rather than fudged. `Ballistics.ts` solves the
 *   remaining few m/s as an ejector-rack impulse.
 *
 * Gravity is the one honest cheat: 32 m/s^2 rather than 9.81. A real bomb from
 * 150 m falls for 5.5 s, which is five seconds of dead air in a game. The engine
 * already runs projectiles at 19.6 (`PROJECTILE_GRAVITY`), so a heavier constant
 * for something with a 900 kg warhead is at least in keeping.
 */

/** Compass directions used for bearing readouts. */
export const COMPASS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

// ---------------------------------------------------------------------------
// Air strike
// ---------------------------------------------------------------------------

export const AIRSTRIKE = {
  /** Aircraft in the carpet formation. */
  jets: 3,
  /** Bombs per aircraft. */
  bombsPerJet: 3,
  /** True airspeed on the run-in, m/s (~M0.53 at sea level). */
  speed: 180,
  /** Release altitude above the target's ground height, metres. */
  altitude: 150,
  /** Vertical stagger between formation members so they read as three aircraft. */
  altitudeStagger: 9,
  /** Lateral offset of the wingmen from the lead's track, metres. */
  lateralOffset: 21,
  /**
   * Along-track spacing between formation members, metres. Derived, not tuned:
   * it is what makes the three sticks chain into one evenly walked line.
   */
  trail: 61.2,
  /** Ground spacing between successive detonations along the run-in axis. */
  impactSpacing: 12,
  /** Time between successive detonations. This is the number the player feels. */
  impactInterval: 0.18,
  /** Time between bombs coming off one aircraft's rack. */
  releaseInterval: 0.13,
  /** Flight time of the first bomb; later bombs fly 0.05 s longer each. */
  baseFallTime: 2.8,
  /** Seconds from confirmation to the first bomb leaving the rack. */
  firstRelease: 1.95,
  /** How long the jets are on screen before they reach the target. */
  approachLead: 1.4,
  /** Seconds after the last detonation before the aircraft are recycled. */
  egressHold: 2.4,

  /** Damage radius per bomb, metres. */
  blastRadius: 14,
  blastDamage: 220,
  blastImpulse: 4200,
  blastShake: 1.8,

  /** Lingering fire: how many craters burn, and for how long. */
  fireCount: 4,
  fireRadius: 5.5,
  fireDuration: 16,

  /** Refuse a target this close to the player — they would not survive it. */
  minSafeDistance: 25,
} as const;

/** Single-bomb precision variant. Tighter, harder, and it arrives sooner. */
export const PRECISION = {
  blastRadius: 10,
  blastDamage: 300,
  blastImpulse: 5200,
  blastShake: 2.4,
  fireRadius: 4.2,
  fireDuration: 12,
} as const;

// ---------------------------------------------------------------------------
// Cluster strike
// ---------------------------------------------------------------------------

/**
 * Cluster strike.
 *
 * The interesting constraint is that a 35 m pattern and a 2.5 s stagger fight each
 * other. The stagger has to come from somewhere, and the only honest source is
 * drogue scatter — some ribbons stream instantly, some stream late — which means
 * the bomblets fall at anything from 21 to 58 m/s terminal. But a spread in drag
 * is also a spread in how far each bomblet is carried downrange, and at a 168 m/s
 * release that spread is 130 m, four times the pattern.
 *
 * The resolution is the dispenser itself. It is a retarded store: `canisterDrag`
 * puts its terminal velocity at 57 m/s, so by the time it reaches burst height it
 * is doing 38 m/s rather than 168, and the same drogue scatter now spreads the
 * bomblets 35 m instead of 130. What is left over is absorbed by the burster
 * charge, which is exactly what a burster charge is for. The strike reports its
 * worst dispense delta so that claim stays checkable.
 */
export const CLUSTER = {
  /** Release altitude of the canister, metres above target ground. */
  releaseAltitude: 205,
  /** Barometric burst height above target ground, metres. */
  burstAltitude: 105,
  /** Aircraft speed for the high-altitude delivery, m/s. */
  speed: 168,
  /** Seconds from confirmation to canister release. */
  firstRelease: 1.9,
  /** Approach time before release. */
  approachLead: 2.4,
  /** Bomblets dispensed. */
  bomblets: 24,
  /** Radius the pattern covers on the ground. */
  patternRadius: 35,
  /** Fastest and slowest bomblet descent from the burst, seconds. */
  descentMin: 3.0,
  descentMax: 5.4,
  /** Terminal velocity of the retarded dispenser, m/s. */
  canisterSpeed: 57,
  /** Nominal drogue terminal velocity, m/s. Scatter runs either side of this. */
  drogueSpeed: 30,
  /** Seconds after the last detonation before the sequence is recycled. */
  egressHold: 2.2,

  blastRadius: 6.5,
  blastDamage: 95,
  blastImpulse: 1100,
  blastShake: 0.5,
  fireCount: 5,
  fireRadius: 2.6,
  fireDuration: 10,
} as const;

/** Window over which the bomblets go off, derived from the descent spread. */
export const CLUSTER_WINDOW = CLUSTER.descentMax - CLUSTER.descentMin;

// ---------------------------------------------------------------------------
// UAV
// ---------------------------------------------------------------------------

export const UAV = {
  /** Orbit radius about the map centre, metres. */
  orbitRadius: 88,
  /** Orbit altitude above the terrain, metres. */
  altitude: 74,
  /** Airspeed, m/s — slow enough to loiter. */
  speed: 27,
  /** Bank angle held in the turn, radians. */
  bank: 0.26,
  /** Radar sweep period, seconds. One reveal pulse per revolution of the beam. */
  sweepPeriod: 2.6,
  /** Half-width of the sweep beam, radians. */
  sweepWidth: 0.42,
  /** How long a revealed contact stays on the map after the beam leaves it. */
  contactTtl: 3.4,
  /** Contacts pushed to objective markers (the HUD cannot carry all of them). */
  markerCount: 4,
} as const;

// ---------------------------------------------------------------------------
// Chopper gunner
// ---------------------------------------------------------------------------

export const CHOPPER = {
  orbitRadius: 96,
  altitude: 46,
  /** Tangential speed, m/s. */
  speed: 22,
  /** Seconds of transit before the player takes the gun. */
  arrival: 4.5,
  /** Rounds per minute of the door gun. */
  rpm: 1150,
  damage: 42,
  falloffStart: 90,
  falloffEnd: 300,
  minDamageScale: 0.55,
  penetrationPower: 2.4,
  impulse: 320,
  spread: 0.012,
  /**
   * Traverse limits on the pintle, radians, relative to the airframe. Yaw is a
   * rotation about the airframe's up axis, so negative is to port: the arc runs
   * from 20 degrees off the nose round to 140 degrees, which is what a left-door
   * mount can physically reach past the airframe and the rotor mast. Pitch is a
   * rotation about the gun's own transverse axis, so positive is down.
   *
   * The neutral pitch is nearly zero and that is not an oversight. A level circle
   * at this radius and speed is flown at 27 degrees of bank, and the gun is on the
   * inside of the turn, so the doorway is already pointing 27 degrees down before
   * the gun moves at all. The map centre sits 26 degrees below the aircraft, which
   * is to say roughly level with the door. The negative end of the pitch range is
   * what lets the gunner bring the sight back up to the horizon out of that bank.
   */
  yawMin: -2.45,
  yawMax: -0.35,
  pitchMin: -0.35,
  pitchMax: 1.05,
  /** Pitch the gun starts at, which with the bank puts the sight on the centre. */
  pitchNeutral: 0.02,
} as const;

// ---------------------------------------------------------------------------
// Care package
// ---------------------------------------------------------------------------

/**
 * Care package.
 *
 * A real low-velocity airdrop is a static line: the crate is pushed out, falls
 * clear for about a second, and the line strips the canopy off its pack. That
 * second of free fall at 82 m/s is where nearly all the downrange lead comes
 * from — the canopy kills the forward speed almost as fast as it appears — so
 * the transport releases roughly 70 m short and the crate lands under a
 * near-vertical descent. The drop is solved rather than authored: the descent
 * model is integrated once at launch and the release point is placed at whatever
 * lead comes out, so changing the altitude or the airspeed cannot break the
 * landing.
 *
 * Terminal velocities rather than drag coefficients, because a terminal velocity
 * is a number that can be argued with: 60 m/s for a tumbling crate, 9.5 m/s under
 * canopy. The real figure for a CDS bundle is 6-7 m/s, which from 78 m is sixteen
 * seconds of watching a box, so the canopy here is undersized on purpose.
 */
export const CARE_PACKAGE = {
  /** Delivery altitude, metres above target ground. */
  altitude: 78,
  /** Transport airspeed, m/s. */
  speed: 82,
  approachLead: 3.2,
  /** Free fall before the static line strips the canopy, seconds. */
  deployDelay: 0.9,
  /** Canopy inflation time. The snatch happens across this. */
  inflateTime: 0.55,
  /** Terminal velocity of the bare crate, m/s. */
  crateSpeed: 60,
  /** Descent rate under a fully inflated canopy, m/s. */
  descentRate: 9.5,
  /** Altitude at which the canopy is cut away and the rigid body takes over. */
  handoffAltitude: 1.3,
  /** How long the crate sits there before it is written off. */
  lifetime: 75,
  /** Range at which the use prompt appears. */
  useRange: 2.6,
  /** Seconds the player must hold to open it. */
  useTime: 0.9,
  /** Seconds between smoke marker puffs while the crate is on the ground. */
  smokeInterval: 3.6,
} as const;

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

/**
 * Gravity for released ordnance, m/s^2. See the header — gameplay-tuned, and
 * used consistently by the solver, the baked arc and anything reading altitude.
 */
export const ORDNANCE_GRAVITY = 32;

/**
 * Quadratic drag coefficient, 1/m: `a = -k |v| v`. Chosen so terminal velocity
 * is 315 m/s, which puts a clean 900 kg bomb's forward retardation at 14% over
 * a three second fall — the band the release schedule was solved against.
 */
export const ORDNANCE_DRAG = ORDNANCE_GRAVITY / (315 * 315);

/** Speed of sound at sea level, m/s. The whole point of the late jet roar. */
export const SPEED_OF_SOUND = 343;

/** Sound ids this module asks the audio system for. */
export const SOUNDS = {
  jetApproach: 'jet_approach',
  jetPass: 'jet_pass',
  jetDistant: 'jet_distant',
  bombWhistle: 'bomb_whistle',
  canisterBurst: 'cluster_burst',
  bombletWhistle: 'bomblet_whistle',
  droneProp: 'uav_prop',
  rotor: 'heli_rotor',
  minigun: 'minigun_fire',
  crateLand: 'crate_land',
  crateOpen: 'crate_open',
  chuteDeploy: 'chute_deploy',
  tabletOpen: 'tablet_open',
  tabletClose: 'tablet_close',
  tabletMove: 'tablet_move',
  tabletConfirm: 'tablet_confirm',
  tabletDeny: 'tablet_deny',
  radioSquelch: 'radio_squelch',
  streakReady: 'killstreak_ready',
} as const;
