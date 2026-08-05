/**
 * Tuning constants for AEGIS LINE.
 *
 * IMPORTANT: every number in this file is invented for gameplay pacing and
 * cinematic readability. Nothing here describes, approximates or is derived
 * from any real weapon system's performance. Battery names are fictional and
 * the "envelopes" exist purely so the three choices feel different to play.
 */

export const WORLD = {
  /** Metres. Flat operating area of the site. */
  baseRadius: 150,
  /** Terrain mesh half-extent. */
  terrainExtent: 9000,
  /** Distant mountain ring radius. */
  mountainRadius: 11000,
  skyRadius: 90000,
  cameraNear: 0.15,
  cameraFar: 140000,
  gravity: 9.81,
  /** Site ground level. */
  groundY: 0,
};

export const PLAYER = {
  eyeHeight: 1.7,
  crouchHeight: 1.1,
  radius: 0.38,
  walkSpeed: 4.1,
  sprintSpeed: 8.2,
  accel: 42,
  friction: 12,
  stepHeight: 0.42,
  bobFreq: 2.05,
  bobAmp: 0.036,
  lookSpeed: 0.0022,
  maxPitch: 1.48,
  // Standing on the apron facing the pads, with the shelter off to the left.
  spawn: { x: 7, z: 40, yaw: 0.05 },
};

/**
 * Interceptor batteries. Three deliberately different play feels.
 * All values fictional.
 */
export const BATTERIES = [
  {
    id: 'vanguard',
    name: 'MK-9 VANGUARD',
    role: 'TERMINAL',
    blurb: 'Fast reaction \u00b7 short window',
    colour: '#7ef7bd',
    hue: 0x7ef7bd,
    // Placement on the site
    position: { x: -62, z: -38 },
    heading: -0.35,
    // Fictional engagement envelope (metres)
    envelope: { minAlt: 250, maxAlt: 11000, minRange: 900, maxRange: 26000 },
    // Fictional flight performance
    flight: {
      boostTime: 2.2, boostAccel: 500,
      sustainTime: 4.5, sustainAccel: 95,
      coastDrag: 0.00016, maxSpeed: 1450,
      lateralG: 24, terminalG: 38, fuelTime: 30,
      launchPitch: 82, launchSpread: 3,
      pitchOver: 0.85, terminalRange: 1200,
      stageSeparation: 0,
    },
    ammo: 8, reloadTime: 5.5, prepTime: 1.1, salvoDelay: 1.4,
    fuseRadius: 26, guidanceNoise: 0.55,
    plume: { size: 1.0, colour: 0xffb066, dust: 1.0 },
    trail: { width: 3.2, colour: 0xf2f4f8, life: 7 },
  },
  {
    id: 'highlance',
    name: 'HIGH LANCE',
    role: 'HIGH ALTITUDE',
    blurb: 'Slow prep \u00b7 wide window',
    colour: '#6fd6ff',
    hue: 0x6fd6ff,
    position: { x: 66, z: -46 },
    heading: 0.4,
    envelope: { minAlt: 4500, maxAlt: 42000, minRange: 5000, maxRange: 52000 },
    flight: {
      boostTime: 5.0, boostAccel: 370,
      sustainTime: 9.0, sustainAccel: 85,
      coastDrag: 0.00007, maxSpeed: 2200,
      lateralG: 14, terminalG: 23, fuelTime: 58,
      launchPitch: 74, launchSpread: 2,
      pitchOver: 1.3, terminalRange: 2200,
      stageSeparation: 5.0,
    },
    ammo: 6, reloadTime: 8.5, prepTime: 3.2, salvoDelay: 2.4,
    fuseRadius: 34, guidanceNoise: 0.4,
    plume: { size: 1.5, colour: 0xffd9a0, dust: 1.6 },
    trail: { width: 5.5, colour: 0xffffff, life: 13 },
  },
  {
    id: 'sentinel',
    name: 'SENTINEL LR',
    role: 'LONG RANGE TEST',
    blurb: 'Limited rounds \u00b7 spectacle',
    colour: '#ffc247',
    hue: 0xffc247,
    position: { x: 4, z: -104 },
    heading: 0.0,
    envelope: { minAlt: 9000, maxAlt: 70000, minRange: 9000, maxRange: 80000 },
    flight: {
      boostTime: 7.0, boostAccel: 400,
      sustainTime: 13.0, sustainAccel: 70,
      coastDrag: 0.00004, maxSpeed: 3000,
      lateralG: 11, terminalG: 19, fuelTime: 78,
      launchPitch: 68, launchSpread: 1.5,
      pitchOver: 1.8, terminalRange: 3200,
      stageSeparation: 7.0,
    },
    ammo: 3, reloadTime: 14, prepTime: 4.8, salvoDelay: 3.2,
    fuseRadius: 42, guidanceNoise: 0.32,
    plume: { size: 2.3, colour: 0xfff0c8, dust: 2.4 },
    trail: { width: 8.5, colour: 0xffffff, life: 20 },
  },
];

/**
 * Threat scenarios. Spawn geometry is randomised per run inside these bounds so
 * no two runs look the same while staying readable from the site.
 */
export const SCENARIOS = [
  {
    id: 'single',
    name: 'SINGLE TRACK',
    blurb: '1 inbound \u00b7 high visibility',
    forceCondition: null,
    threats: [{ count: 1, decoy: 0 }],
    spawnWindow: [2.0, 2.0],
    bearing: [-40, 40],
    range: [34000, 40000],
    altitude: [20000, 24000],
    speed: [880, 980],
    briefing: 'Single ballistic target on a clean arc. Watch it come down.',
  },
  {
    id: 'saturation',
    name: 'SATURATION',
    blurb: '3-5 inbound \u00b7 split arcs',
    forceCondition: null,
    threats: [{ count: [3, 5], decoy: 0 }],
    spawnWindow: [1.5, 15],
    bearing: [-115, 115],
    range: [30000, 44000],
    altitude: [17000, 26000],
    speed: [860, 1080],
    briefing: 'Multiple arcs inside a short interval. Prioritise by time to impact.',
  },
  {
    id: 'night',
    name: 'NIGHT RAID',
    blurb: 'multi + decoys \u00b7 darkness',
    forceCondition: 'night',
    threats: [{ count: [3, 4], decoy: [1, 2] }],
    spawnWindow: [2.0, 20],
    bearing: [-140, 140],
    range: [28000, 42000],
    altitude: [16000, 25000],
    speed: [840, 1040],
    briefing: 'Mixed raid with unconfirmed returns. Not everything up there is a warhead.',
  },
];

/** Fictionalised threat flight parameters. */
export const THREAT = {
  dragCoeff: 0.00011,
  /** Reentry heating starts around here (visual only). */
  glowAltitude: 32000,
  terminalAltitude: 9000,
  bodyLength: 9.5,
  bodyRadius: 0.62,
  /** Visual amplification so a distant target stays readable as a bright dot. */
  minPixelScale: 2.4,
};

export const RADAR = {
  /** Scope display range in metres. */
  displayRange: 60000,
  sweepPeriod: 4.0,
  /** A track is only shown once the sweep has passed over it. */
  acquireDelay: 0.35,
  trackLossTime: 2.4,
  rotationSpeed: 0.42,
};

export const CONDITIONS = {
  day: {
    id: 'day', name: 'DAY',
    sunElevation: 58, sunAzimuth: 128,
    sunColour: 0xfff3dd, sunIntensity: 3.4,
    skyTint: 0x8fb6dd, groundTint: 0xb9a179,
    hazeColour: 0xa8c0d6, hazeDensity: 0.000045,
    ambient: 0.42, ambientColour: 0xa9c4de,
    exposure: 1.0, bloom: 0.42,
    stars: 0, floodlights: false, dust: 0.55,
    fogNear: 400, fogFar: 26000,
    cloudCover: 0.34, cloudTint: 0xffffff,
  },
  sunset: {
    id: 'sunset', name: 'SUNSET',
    sunElevation: 5.2, sunAzimuth: 264,
    sunColour: 0xffb066, sunIntensity: 2.7,
    skyTint: 0xd98a54, groundTint: 0xa87f56,
    hazeColour: 0xd99a68, hazeDensity: 0.00009,
    ambient: 0.3, ambientColour: 0x6a5a72,
    exposure: 1.05, bloom: 0.72,
    stars: 0.18, floodlights: true, dust: 0.85,
    fogNear: 300, fogFar: 21000,
    cloudCover: 0.5, cloudTint: 0xffc79a,
  },
  night: {
    id: 'night', name: 'NIGHT',
    // The key light is the moon at night: high, cool and dim.
    sunElevation: 41, sunAzimuth: 302,
    sunColour: 0x9fbcea, sunIntensity: 0.42,
    skyTint: 0x0a1120, groundTint: 0x151a26,
    hazeColour: 0x121c33, hazeDensity: 0.00007,
    ambient: 0.14, ambientColour: 0x2c3c5e,
    exposure: 1.3, bloom: 1.05,
    stars: 1, floodlights: true, dust: 0.6,
    fogNear: 200, fogFar: 15000,
    cloudCover: 0.4, cloudTint: 0x33415e,
  },
};

export const QUALITY = {
  high: {
    id: 'high',
    shadowMapSize: 2048, shadowsEnabled: true,
    maxPixelRatio: 1.75,
    bloom: true, ssaa: true, motionBlurTrails: true,
    particleBudget: 3600, trailSegments: 96,
    terrainSegments: 200, cloudLayers: 3,
    dustInstances: 900,
  },
  medium: {
    id: 'medium',
    shadowMapSize: 1024, shadowsEnabled: true,
    maxPixelRatio: 1.35,
    bloom: true, ssaa: false, motionBlurTrails: true,
    particleBudget: 2200, trailSegments: 72,
    terrainSegments: 150, cloudLayers: 2,
    dustInstances: 520,
  },
  low: {
    id: 'low',
    shadowMapSize: 512, shadowsEnabled: false,
    maxPixelRatio: 1.0,
    bloom: true, ssaa: false, motionBlurTrails: false,
    particleBudget: 1100, trailSegments: 48,
    terrainSegments: 110, cloudLayers: 1,
    dustInstances: 220,
  },
};

/** Result codes shown to the player. */
export const RESULT = {
  INTERCEPT: 'INTERCEPTED',
  MISS: 'MISSED',
  DECOY: 'DECOY',
  IMPACT: 'IMPACT',
};
