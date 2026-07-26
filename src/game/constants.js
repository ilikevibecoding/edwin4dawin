// Central design tables: identity, difficulties, weapons, mission script.
// All names, factions and manufacturers are original fiction.

export const GAME_TITLE = 'NORTHSTAR RESCUE';
export const GAME_SUBTITLE = 'TACTICAL RESPONSE';
export const VERSION = '1.0.0';
export const COMPANY = 'Northstar Dynamics'; // the fictional company occupying the office
export const FACTION_HOSTILE = 'Meridian Cell';
export const PLAYER_CALLSIGN = 'WARDEN 2-1';

export const DIFFICULTIES = {
  recruit: {
    id: 'recruit', name: 'Recruit', tagline: 'Learn the building. Forgiving firefights.',
    enemyCount: 8, reactionTime: 0.9, enemyAccuracy: 0.5, enemyDamageMult: 0.6,
    missionMinutes: 15, healthRegenTo: 50, hearingMult: 0.8, visionMult: 0.85,
  },
  operator: {
    id: 'operator', name: 'Operator', tagline: 'The intended experience. Deliberate and lethal.',
    enemyCount: 11, reactionTime: 0.55, enemyAccuracy: 0.72, enemyDamageMult: 1.0,
    missionMinutes: 12, healthRegenTo: 0, hearingMult: 1.0, visionMult: 1.0,
  },
  nightwatch: {
    // reaction/damage softened per AI-pass telemetry: cover AI + 3-shooter cap
    // still kills a passive player in ~7-8s — lethal but readable.
    id: 'nightwatch', name: 'Nightwatch', tagline: 'Alert patrols, sharp shooters, short clock.',
    enemyCount: 14, reactionTime: 0.4, enemyAccuracy: 0.9, enemyDamageMult: 1.2,
    missionMinutes: 9, healthRegenTo: 0, hearingMult: 1.35, visionMult: 1.2,
  },
};

// Weapon design table. Spread/recoil are degrees; spread values are cone RADII
// (a shot lands uniformly inside the disc, so mean error ≈ 2/3 of the value).
//
// Balance contract (enemy HP: scout 70, trooper 100, heavy 150, marksman 85):
//   kestrel  — highest DPS inside ~12 m, falls off hardest
//   ridgeline— 4 body hits on a trooper at any interior range
//   boreas   — one shell kills a scout, two kill anything, dead past ~12 m
//   longwatch— one body hit kills scout/marksman, one head hit kills anything
//   vireo    — honest 4-hit backup, fastest handling of the firearms
// Full empirical TTK table: docs/reports/opus2-combat.md
export const WEAPONS = {
  vireo: {
    id: 'vireo', name: 'P-11 Vireo', maker: 'Vektra Defense', class: 'pistol', slot: 'secondary',
    auto: false, damage: 26, headMult: 3.0, rpm: 350, mag: 15, reserve: 60,
    reloadTime: 1.5, reloadEmptyTime: 1.85, drawTime: 0.42,
    spreadBase: 2.2, spreadMove: 2.0, spreadAdsMult: 0.28, spreadPerShot: 0.42, spreadMax: 3.4,
    bloomDecay: 6.0,
    recoilPitch: 1.15, recoilRecover: 13, recoilDrift: 0.05, recoilJitter: 0.3,
    recoilRampPer: 0.06, recoilRampMax: 1.3, adsRecoilMult: 0.85,
    adsZoom: 1.12, adsTime: 0.15, falloffStart: 16, falloffEnd: 42, minDmgFrac: 0.55,
    penetration: 1, noise: 22, sfx: 'shot_pistol', desc: 'Compact service sidearm. Fast handling, honest iron sights.',
  },
  kestrel: {
    id: 'kestrel', name: 'VX-7 Kestrel', maker: 'Vektra Defense', class: 'smg', slot: 'primary',
    auto: true, damage: 25, headMult: 2.3, rpm: 780, mag: 30, reserve: 120,
    reloadTime: 1.95, reloadEmptyTime: 2.4, drawTime: 0.5,
    spreadBase: 2.6, spreadMove: 1.7, spreadAdsMult: 0.26, spreadPerShot: 0.2, spreadMax: 4.4,
    bloomDecay: 4.2,
    recoilPitch: 0.5, recoilRecover: 12, recoilDrift: -0.04, recoilJitter: 0.42,
    recoilRampPer: 0.055, recoilRampMax: 1.9, adsRecoilMult: 0.8,
    adsZoom: 1.18, adsTime: 0.16, falloffStart: 12, falloffEnd: 30, minDmgFrac: 0.45,
    penetration: 1, noise: 26, sfx: 'shot_smg', desc: 'High-cyclic 9mm. Owns close quarters, drops off past midrange.',
  },
  ridgeline: {
    id: 'ridgeline', name: 'HC-4 Ridgeline', maker: 'Halcyon Ordnance', class: 'carbine', slot: 'primary',
    auto: true, damage: 31, headMult: 2.9, rpm: 640, mag: 30, reserve: 90,
    reloadTime: 2.2, reloadEmptyTime: 2.7, drawTime: 0.62,
    spreadBase: 2.2, spreadMove: 2.4, spreadAdsMult: 0.14, spreadPerShot: 0.3, spreadMax: 4.8,
    bloomDecay: 3.4,
    recoilPitch: 0.9, recoilRecover: 9.5, recoilDrift: 0.16, recoilJitter: 0.16,
    recoilRampPer: 0.07, recoilRampMax: 2.0, adsRecoilMult: 0.78,
    adsZoom: 1.3, adsTime: 0.2, falloffStart: 26, falloffEnd: 60, minDmgFrac: 0.6,
    penetration: 2, noise: 34, sfx: 'shot_carbine', desc: 'Balanced 5.56 workhorse. Controllable bursts at any interior range.',
  },
  boreas: {
    id: 'boreas', name: 'B-12 Boreas', maker: 'Halcyon Ordnance', class: 'shotgun', slot: 'primary',
    auto: false, pump: true, pumpTime: 0.6, damage: 11, pellets: 9, headMult: 1.6, rpm: 80, mag: 7, reserve: 32,
    reloadPerShell: 0.55, drawTime: 0.68,
    spreadBase: 3.6, spreadMove: 1.0, spreadAdsMult: 0.72, spreadPerShot: 0, spreadMax: 4.2,
    bloomDecay: 2.5,
    recoilPitch: 3.4, recoilRecover: 5.5, recoilDrift: 0.1, recoilJitter: 0.8,
    recoilRampPer: 0, recoilRampMax: 1, adsRecoilMult: 0.9,
    adsZoom: 1.1, adsTime: 0.22, falloffStart: 7, falloffEnd: 20, minDmgFrac: 0.2,
    penetration: 0, noise: 40, sfx: 'shot_shotgun', desc: 'Pump 12-gauge. Devastating inside eight meters, shell-by-shell reload.',
  },
  longwatch: {
    id: 'longwatch', name: 'LR-8 Longwatch', maker: 'Halcyon Ordnance', class: 'precision', slot: 'primary',
    auto: false, bolt: true, boltTime: 1.15, damage: 96, headMult: 3.2, rpm: 44, mag: 5, reserve: 20,
    reloadTime: 3.0, reloadEmptyTime: 3.35, drawTime: 0.88,
    spreadBase: 6.0, spreadMove: 4.5, spreadAdsMult: 0.02, spreadPerShot: 0.5, spreadMax: 8,
    bloomDecay: 1.8,
    recoilPitch: 4.8, recoilRecover: 4.5, recoilDrift: 0.2, recoilJitter: 0.5,
    recoilRampPer: 0, recoilRampMax: 1, adsRecoilMult: 0.9,
    steadyMult: 0.55, steadyTime: 4.0,
    adsZoom: 2.9, adsTime: 0.32, falloffStart: 70, falloffEnd: 140, minDmgFrac: 0.8,
    penetration: 3, noise: 46, sfx: 'shot_precision', desc: 'Bolt-action 7.62 marksman rifle. One breath, one answer.',
  },
  talon: {
    id: 'talon', name: 'Talon Field Knife', maker: 'Vektra Defense', class: 'melee', slot: 'melee',
    damage: 52, backMult: 3.0, swingTime: 0.42, range: 1.7, drawTime: 0.3,
    noise: 4, sfx: 'knife_swing', desc: 'Silent. Personal. Always drawn in time.',
  },
  flash: {
    id: 'flash', name: 'FL-2 Dazzle', maker: 'Vektra Defense', class: 'gadget', slot: 'gadget',
    count: 2, fuse: 1.5, radius: 13, noise: 44, sfx: 'flash_pop',
    desc: 'Photonic charge. Blinds everything with eyes — including yours.',
  },
  smoke: {
    id: 'smoke', name: 'SG-3 Veil', maker: 'Vektra Defense', class: 'gadget', slot: 'gadget',
    count: 2, fuse: 1.0, radius: 3.4, duration: 13, noise: 18, sfx: 'smoke_pop',
    desc: 'Dense cold-burn smoke. Breaks sightlines for a controlled push.',
  },
};

export const LOADOUT_PRIMARIES = ['kestrel', 'ridgeline', 'boreas', 'longwatch'];
export const LOADOUT_GADGETS = ['flash', 'smoke'];
export const DEFAULT_LOADOUT = { primary: 'ridgeline', secondary: 'vireo', melee: 'talon', gadget: 'flash' };

export const PLAYER = {
  maxHealth: 100, maxArmor: 100, armorAbsorb: 0.55, armorLossFactor: 0.45,
  eyeStand: 1.62, eyeCrouch: 1.08, radius: 0.34, heightStand: 1.78, heightCrouch: 1.24,
  runSpeed: 4.5, walkSpeed: 2.2, crouchSpeed: 1.7, adsSpeedMult: 0.62,
  accel: 52, airAccel: 9, friction: 11.5, gravity: 19.6, stepHeight: 0.34,
  // jumpVel is applied straight to vel.y: apex = jumpVel²/(2·gravity) ≈ 0.63 m,
  // which clears a 0.5 m crate and nothing taller. Landing costs a beat of
  // ground control (landLockTime at landAccelMult) so hop-spam is never free.
  jumpVel: 4.95, landLockTime: 0.26, landAccelMult: 0.45,
};

// Shared gunplay tuning that is not per-weapon.
export const COMBAT = {
  crouchSpreadMult: 0.75,   // crouched + grounded firing bonus
  airSpreadMult: 2.4,       // firing mid-jump is a bad idea
  adsMoveSpreadMult: 0.6,   // ADS only partly cancels the movement penalty
  moveSettleTime: 0.12,     // movement penalty decays to zero this fast after a stop
  bloomAdsShare: 0.85,      // fraction of recoil bloom that ADS is allowed to scale
  breathRecoverMult: 1.6,   // held breath refills this much slower than it drains
  // Penetration tiers by surface. minPen = lowest weapon penetration rating that
  // can pass; maxThick = material traversed along the shot line (metres);
  // retain = damage kept behind it; cost = penetration layers consumed.
  penetration: {
    fabric:    { minPen: 0, maxThick: 0.18, retain: 0.85, cost: 0.5 },  // cubicle panels
    carpet:    { minPen: 0, maxThick: 0.62, retain: 0.7, cost: 0.5 },   // upholstered chairs, sofas, partitions
    cardboard: { minPen: 0, maxThick: 0.32, retain: 0.8, cost: 0.5 },   // boxes, files
    plastic:   { minPen: 1, maxThick: 0.1, retain: 0.7, cost: 0.5 },
    wood:      { minPen: 1, maxThick: 0.2, retain: 0.6, cost: 1 },      // office doors, desk panels
    drywall:   { minPen: 2, maxThick: 0.22, retain: 0.5, cost: 1 },     // 0.16 m interior walls
    metal:     { minPen: 2, maxThick: 0.05, retain: 0.4, cost: 1 },     // sheet lockers, rails
  },
  // Any prop/rail collider this thin is a panel, not cover: everything drills it.
  thinPropThickness: 0.09,
  thinPropSpec: { minPen: 0, maxThick: 0.09, retain: 0.78, cost: 0.5 },
  // Surfaces that never let a bullet through regardless of thickness.
  hardSurfaces: ['concrete', 'brick', 'stone', 'marble', 'tile', 'snow'],
  // Weapon-tier multiplier applied to the material's retain value.
  penRetainByTier: { 0: 0.85, 1: 0.9, 2: 1, 3: 1.2 },
};

export const MISSION = {
  location: 'Northstar Administrative Center — Kirovsk Ridge Business Park',
  situation: [
    `At 04:10 this morning, an armed cell identifying as "${FACTION_HOSTILE}" seized the Northstar Dynamics`,
    'administrative headquarters during a whiteout. Site security is down. Two staff members did not make',
    'it out and are confirmed alive inside the building.',
  ].join(' '),
  objectivesText: [
    'Infiltrate the administrative center through the staff entrance.',
    'Locate both hostages: Dr. Elin Voss (CTO) and Marcus Reid (Facilities).',
    'Free the hostages and escort them — together or one at a time.',
    'Reach the parking garage. Get everyone to the extraction van.',
    'Storm cover expires when the mission clock ends. Do not be inside when it does.',
  ],
  hostages: [
    { id: 'voss', name: 'Dr. Elin Voss', role: 'Chief Technology Officer' },
    { id: 'reid', name: 'Marcus Reid', role: 'Facilities Manager' },
  ],
  rules: [
    'Hostile force strength: squad size, exact numbers unknown.',
    'Weapons free on Meridian Cell personnel. Zero tolerance on civilian casualties.',
    'The blizzard masks the assault — expect no reinforcements, no resupply, no second try.',
  ],
};

export const CONTROLS_REFERENCE = [
  ['W A S D', 'Move'],
  ['Mouse', 'Look / aim'],
  ['Left Click', 'Fire / throw gadget'],
  ['Right Click (hold)', 'Aim down sights'],
  ['Shift (hold)', 'Walk quietly — steadies the scope while aiming'],
  ['C or Ctrl', 'Crouch'],
  ['Space', 'Jump / vault low'],
  ['R', 'Reload'],
  ['E', 'Interact — doors, hostages, pickups'],
  ['1 / 2 / 3 / 4', 'Primary / sidearm / knife / gadget'],
  ['Mouse Wheel', 'Cycle weapons'],
  ['G', 'Quick-throw gadget'],
  ['Tab (hold)', 'Objectives'],
  ['F', 'Toggle fullscreen'],
  ['Esc', 'Pause / exit fullscreen'],
];

export const LOADING_TIPS = [
  'Walk with Shift: slow feet make no noise on carpet, little on tile.',
  'Interior glass shatters loudly. Every pair of ears nearby will come looking.',
  'Hostages follow at your pace and take cover when you do. Press E again to make them hold.',
  'Doors open toward the hinge side. Use the frame as cover before you commit.',
  'Suppressing a room is louder than clearing it. Pick which one the floor hears.',
  'The Boreas reloads shell by shell — you can interrupt it to fire what you have.',
  'Smoke breaks enemy sightlines. Flash breaks yours too if you look at it.',
  'Snow tracks near exterior doors betray patrol routes.',
  'Marksmen watch the long north corridor and the service tunnel. Cross low or cross smoked.',
  'Armor soaks over half of incoming damage while it lasts. It does not last.',
];
