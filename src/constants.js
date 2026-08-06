// Central tuning for the FICTIONAL Castellan Ridge interceptor demo.
// Every number here is a gameplay abstraction — deliberately NOT real-world
// performance data. Values are chosen for cinematic readability at game scale.

export const WORLD = {
  gravity: 9.81,            // m/s^2 — simplified constant-gravity model
  airScaleHeight: 5200,     // m — fictional exponential air-density falloff for trail fading
  windBase: 5.5,            // m/s ground wind (drifts smoke)
  windHeading: 2.3,         // radians
  terrainRadius: 15000,
  baseFlatRadius: 300,      // flat pad area around the base
  fenceRadius: 232,
  playerBoundsRadius: 226,
};

export const PLAYER = {
  eyeHeight: 1.7,
  radius: 0.42,
  walkSpeed: 4.4,
  sprintSpeed: 8.0,
  accel: 34,
  friction: 11,
  bobFreq: 2.05,            // steps/sec at walk speed
  bobAmp: 0.045,
  lookSensitivity: 0.0021,
};

export const RADAR = {
  range: 11500,             // fictional detection slant range (m)
  sweepPeriod: 3.6,         // s per full PPI rotation (fictional)
  trackConfirmTime: 1.4,    // s from DETECT to TRACK
  discriminateAltitude: 3400, // decoys revealed below this altitude (fictional gameplay rule)
  discriminateTime: 14,     // ...or after this many seconds of tracking
};

// ---------------------------------------------------------------------------
// Batteries — three fictionalized systems. Silhouettes are inspired by
// recognizable platforms but all data below is invented for game balance.
// ---------------------------------------------------------------------------
export const BATTERIES = {
  rampart: {
    id: 'rampart',
    name: 'RAMPART',
    designation: 'RMP-4 point-defense battery',
    blurb: 'Fast-reacting terminal interceptor. Short reach, hard turns.',
    color: 0x59d669,
    uiColor: '#59d669',
    ammo: 8,
    prepTime: 1.1,          // s from AUTHORIZE to motor ignition
    reloadTime: 5.0,        // s between shots
    boostTime: 2.4,
    boostAccel: 260,        // m/s^2 (fictional)
    maxSpeed: 620,
    turnG: 14,              // lateral accel limit, expressed in g (fictional)
    killRadius: 12,
    envelope: { minAlt: 150, maxAlt: 4200, maxRange: 5200 },
    trail: { width: 2.6, life: 12 },
    plumeScale: 1.0,
  },
  zenith: {
    id: 'zenith',
    name: 'ZENITH',
    designation: 'ZN-8 high-altitude battery',
    blurb: 'High-altitude interceptor. Slower to fire, wide window, long contrails.',
    color: 0x4fb7e8,
    uiColor: '#4fb7e8',
    ammo: 6,
    prepTime: 2.6,
    reloadTime: 8.5,
    boostTime: 4.2,
    boostAccel: 300,
    maxSpeed: 1050,
    turnG: 9,
    killRadius: 14,
    envelope: { minAlt: 2400, maxAlt: 9500, maxRange: 10500 },
    trail: { width: 3.8, life: 22 },
    plumeScale: 1.5,
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    designation: 'LR-X experimental long-range battery',
    blurb: 'Experimental long-range test article. Two rounds. Maximum spectacle.',
    color: 0xd6a24f,
    uiColor: '#d6a24f',
    ammo: 2,
    prepTime: 4.0,
    reloadTime: 16,
    boostTime: 6.0,
    boostAccel: 330,
    maxSpeed: 1500,
    turnG: 7,
    killRadius: 18,
    envelope: { minAlt: 4000, maxAlt: 14000, maxRange: 16000 },
    trail: { width: 4.6, life: 32 },
    plumeScale: 2.4,
  },
};

// ---------------------------------------------------------------------------
// Threats — fictional ballistic practice targets.
// ---------------------------------------------------------------------------
export const THREATS = {
  spawnAltitude: [4800, 6600],
  spawnRange: [6800, 9600],      // horizontal distance from base
  flightTime: [50, 64],          // seconds from spawn to impact (drives arc solve)
  terminalWeaveAccel: 8,         // m/s^2 gentle terminal weave (fictional)
  terminalPhaseAlt: 2600,        // below this: plasma glow + weave
  hitFlashAlt: 90,
};

export const SCENARIOS = {
  single: {
    id: 'single',
    name: 'SINGLE TRACK',
    blurb: 'One highly visible inbound ballistic target.',
    threats: 1, decoys: 0, spawnWindow: 2, tod: null,
  },
  saturation: {
    id: 'saturation',
    name: 'SATURATION',
    blurb: '3–5 inbound targets on different arcs within a short interval.',
    threats: [3, 5], decoys: 0, spawnWindow: 16, tod: null,
  },
  nightraid: {
    id: 'nightraid',
    name: 'NIGHT RAID',
    blurb: 'Multiple inbound targets with harmless decoys. Forces night.',
    threats: [4, 5], decoys: [2, 3], spawnWindow: 22, tod: 'night',
  },
};

export const COLORS = {
  trackHostile: '#ff5f4e',
  trackAmbiguous: '#ffc94e',
  trackDecoy: '#8f9aa8',
  interceptor: '#6fe3ff',
  ready: '#59d669',
  reloading: '#ffc94e',
  offline: '#ff5f4e',
};

export const RESULT = {
  INTERCEPTED: 'INTERCEPTED',
  MISSED: 'MISSED',
  DECOY: 'DECOY',
  IMPACT: 'IMPACT',
};
