import { CHECKPOINTS, EXTRACTION, HOSTAGE_POINTS } from '../map/layout.js';

// ---------------------------------------------------------------------------
// Objectives and difficulty.  (owner: opus3)
//
// The single place the mission's shape and its four difficulty presets are
// written down. `MissionDirector` instantiates the chain, `EnemyManager` and
// `HostageManager` read the preset. Nothing here holds mutable run state, so a
// restart can rebuild everything from these tables.
// ---------------------------------------------------------------------------

export const OBJECTIVE_STATE = {
  PENDING: 'pending',
  ACTIVE: 'active',
  DONE: 'done',
  FAILED: 'failed',
};

/**
 * Damage every hostile weapon is scaled by before difficulty is applied.
 * The AI reuses Opus 2's weapon table verbatim so the numbers stay consistent;
 * this single constant is what stops a shared HL-700 from deleting the player
 * in one round.
 */
export const ENEMY_DAMAGE_SCALE = 0.5;

/**
 * Difficulty presets.
 *
 *   enemyCount          hostiles spawned, drawn from ENEMY_POSTS in priority
 *                       order (both hostage guard pairs are always included)
 *   enemyHealth         hit points
 *   enemyArmor          armour points, soaks part of body damage
 *   enemyAccuracy       divides aim error, so higher = tighter groups
 *   enemyDamage         multiplies weapon damage
 *   playerDamageTaken   final multiplier on damage the player receives
 *   detectionSpeed      multiplies the awareness fill rate
 *   reactionTime        seconds between positive ID and the first shot
 *   viewRange           base sight range in metres, before light and stance
 *   burst / burstPause  rounds per burst and the gap between bursts
 *   flank               whether hostiles try to work around a pinned player
 *   coverUse            0..1 chance of breaking to cover instead of standing
 *   alertsToGoLoud      radio alerts before the whole facility is hunting
 *   alertRadius         radio propagation radius in metres
 *   searchTime          seconds a hostile keeps sweeping a lost contact
 *   hostagePanic        multiplies hostage fear/cower behaviour
 *   missionTime         seconds on the mission clock
 *   extractionHold      seconds the extraction zone must be held
 *   flashBlind          multiplies flashbang blind duration on hostiles
 */
export const DIFFICULTY_PRESETS = {
  recruit: {
    id: 'recruit',
    label: 'Recruit',
    description: 'Ten hostiles, slow to react and loose with their aim, and fifteen minutes on the clock. Learn the building.',
    enemyCount: 10,
    enemyHealth: 80,
    enemyArmor: 10,
    enemyAccuracy: 0.55,
    enemyDamage: 0.62,
    playerDamageTaken: 0.85,
    detectionSpeed: 0.62,
    reactionTime: 0.95,
    viewRange: 20,
    burst: [2, 3],
    burstPause: [1.15, 1.95],
    flank: false,
    coverUse: 0.45,
    alertsToGoLoud: 5,
    alertRadius: 16,
    searchTime: 12,
    hostagePanic: 0.7,
    missionTime: 900,
    extractionHold: 10,
    flashBlind: 1.35,
  },
  operator: {
    id: 'operator',
    label: 'Operator',
    description: 'Thirteen hostiles working as a team, twelve minutes to extraction. The intended experience.',
    enemyCount: 13,
    enemyHealth: 100,
    enemyArmor: 25,
    enemyAccuracy: 1.0,
    enemyDamage: 1.0,
    playerDamageTaken: 1.0,
    detectionSpeed: 1.0,
    reactionTime: 0.62,
    viewRange: 24,
    burst: [3, 4],
    burstPause: [0.85, 1.4],
    flank: true,
    coverUse: 0.7,
    alertsToGoLoud: 4,
    alertRadius: 22,
    searchTime: 18,
    hostagePanic: 1.0,
    missionTime: 720,
    extractionHold: 12,
    flashBlind: 1.0,
  },
  veteran: {
    id: 'veteran',
    label: 'Veteran',
    description: 'Sixteen hostiles who check their corners, flank hard and shoot straight. Ten minutes.',
    enemyCount: 16,
    enemyHealth: 120,
    enemyArmor: 40,
    enemyAccuracy: 1.32,
    enemyDamage: 1.3,
    playerDamageTaken: 1.1,
    detectionSpeed: 1.35,
    reactionTime: 0.42,
    viewRange: 28,
    burst: [4, 5],
    burstPause: [0.6, 1.0],
    flank: true,
    coverUse: 0.85,
    alertsToGoLoud: 3,
    alertRadius: 27,
    searchTime: 26,
    hostagePanic: 1.2,
    missionTime: 600,
    extractionHold: 14,
    flashBlind: 0.82,
  },
  blackout: {
    id: 'blackout',
    label: 'Blackout',
    description: 'Nineteen hostiles, one radio call from a facility-wide hunt, and eight and a half minutes. No margin.',
    enemyCount: 19,
    enemyHealth: 140,
    enemyArmor: 55,
    enemyAccuracy: 1.65,
    enemyDamage: 1.7,
    playerDamageTaken: 1.2,
    detectionSpeed: 1.7,
    reactionTime: 0.28,
    viewRange: 32,
    burst: [4, 6],
    burstPause: [0.45, 0.8],
    flank: true,
    coverUse: 0.92,
    alertsToGoLoud: 2,
    alertRadius: 34,
    searchTime: 34,
    hostagePanic: 1.4,
    missionTime: 510,
    extractionHold: 16,
    flashBlind: 0.68,
  },
};

export const DIFFICULTIES = ['recruit', 'operator', 'veteran', 'blackout'];

const DIFFICULTY_ALIASES = {
  easy: 'recruit', rookie: 'recruit', casual: 'recruit', recruit: 'recruit',
  normal: 'operator', standard: 'operator', medium: 'operator', operator: 'operator',
  hard: 'veteran', veteran: 'veteran', difficult: 'veteran',
  elite: 'blackout', blackout: 'blackout', realism: 'blackout', extreme: 'blackout',
};

/** Resolve any difficulty spelling to a preset; unknown names give Operator. */
export function difficultyPreset(name) {
  const key = DIFFICULTY_ALIASES[String(name || '').toLowerCase()] || 'operator';
  return DIFFICULTY_PRESETS[key];
}

/** Summary rows for the difficulty-selection screen. */
export function difficultySummary() {
  return DIFFICULTIES.map((id) => {
    const p = DIFFICULTY_PRESETS[id];
    return {
      id,
      label: p.label,
      description: p.description,
      hostiles: p.enemyCount,
      missionTime: p.missionTime,
      enemyHealth: p.enemyHealth,
      enemyAccuracy: p.enemyAccuracy,
      damageTaken: p.playerDamageTaken,
      flanks: p.flank,
    };
  });
}

const cp = (name) => {
  const c = CHECKPOINTS[name];
  return c ? [c.pos[0], c.pos[1], c.pos[2]] : [0, 0, 0];
};

const hostagePoint = (id) => {
  const h = HOSTAGE_POINTS.find((p) => p.id === id);
  return h ? [h.pos[0], h.pos[1], h.pos[2]] : [0, 0, 0];
};

/**
 * The ordered objective chain. `marker` is a world position for the HUD and
 * minimap; `hint` is one line of flavour the briefing / subtitle bar can use.
 */
export const OBJECTIVE_CHAIN = [
  {
    id: 'infiltrate',
    text: 'Infiltrate the Northstar Administrative Center',
    hint: 'In through the employee entrance. Stay off the glass line.',
    marker: cp('vestibule'),
    room: 'vestibule',
  },
  {
    id: 'locate-hostage-a',
    text: 'Locate the hostage held on the ground floor',
    hint: 'Reception logged a meeting in the Sunfield room.',
    marker: hostagePoint('hostage-a'),
    room: 'conference',
  },
  {
    id: 'secure-hostage-a',
    text: 'Secure Dr. Rhea Calloway',
    hint: 'Cut the ties and get her moving.',
    marker: hostagePoint('hostage-a'),
    room: 'conference',
  },
  {
    id: 'locate-hostage-b',
    text: 'Locate the second hostage on the mezzanine',
    hint: 'The director is being held in his own office.',
    marker: hostagePoint('hostage-b'),
    room: 'execoffice',
  },
  {
    id: 'secure-hostage-b',
    text: 'Secure Martin Oyelaran',
    hint: 'Two ways up: the feature stair or the west fire stair.',
    marker: hostagePoint('hostage-b'),
    room: 'execoffice',
  },
  {
    id: 'open-garage',
    text: 'Raise the vehicle bay shutter',
    hint: 'The bay control is on the east wall of the garage.',
    marker: [26.85, 1.25, 9.0],
    room: 'garage',
  },
  {
    id: 'escort-hostages',
    text: 'Escort both hostages to the vehicle bay',
    hint: 'Through the loading dock. Keep them behind you.',
    marker: [EXTRACTION.center[0], EXTRACTION.center[1], EXTRACTION.center[2]],
    room: 'garage',
  },
  {
    id: 'hold-extraction',
    text: 'Hold the extraction zone until pickup',
    hint: 'Stay in the bay with both hostages until the vehicle is loaded.',
    marker: [EXTRACTION.center[0], EXTRACTION.center[1], EXTRACTION.center[2]],
    room: 'garage',
  },
];

/** Fresh, mutable objective records. Called by `MissionDirector.reset`. */
export function buildObjectives() {
  return OBJECTIVE_CHAIN.map((o, i) => ({
    id: o.id,
    index: i,
    text: o.text,
    hint: o.hint,
    room: o.room,
    marker: o.marker.slice(),
    state: OBJECTIVE_STATE.PENDING,
    optional: !!o.optional,
    completedAt: null,
  }));
}

export default DIFFICULTY_PRESETS;
