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
    id: 'nightwatch', name: 'Nightwatch', tagline: 'Alert patrols, sharp shooters, short clock.',
    enemyCount: 14, reactionTime: 0.32, enemyAccuracy: 0.9, enemyDamageMult: 1.35,
    missionMinutes: 9, healthRegenTo: 0, hearingMult: 1.35, visionMult: 1.2,
  },
};

// Weapon design table. Spread values in degrees, recoil in degrees/shot.
export const WEAPONS = {
  vireo: {
    id: 'vireo', name: 'P-11 Vireo', maker: 'Vektra Defense', class: 'pistol', slot: 'secondary',
    auto: false, damage: 26, headMult: 3.0, rpm: 330, mag: 15, reserve: 60,
    reloadTime: 1.55, reloadEmptyTime: 1.9, drawTime: 0.45,
    spreadBase: 0.65, spreadMove: 1.5, spreadAdsMult: 0.4, spreadPerShot: 0.35, spreadMax: 3.2,
    recoilPitch: 1.15, recoilYaw: 0.35, recoilRecover: 9,
    adsZoom: 1.12, adsTime: 0.16, falloffStart: 16, falloffEnd: 42, minDmgFrac: 0.55,
    penetration: 1, noise: 22, sfx: 'shot_pistol', desc: 'Compact service sidearm. Fast handling, honest iron sights.',
  },
  kestrel: {
    id: 'kestrel', name: 'VX-7 Kestrel', maker: 'Vektra Defense', class: 'smg', slot: 'primary',
    auto: true, damage: 21, headMult: 2.4, rpm: 800, mag: 30, reserve: 120,
    reloadTime: 2.0, reloadEmptyTime: 2.45, drawTime: 0.55,
    spreadBase: 0.85, spreadMove: 1.15, spreadAdsMult: 0.55, spreadPerShot: 0.22, spreadMax: 4.2,
    recoilPitch: 0.62, recoilYaw: 0.4, recoilRecover: 11,
    adsZoom: 1.18, adsTime: 0.18, falloffStart: 13, falloffEnd: 34, minDmgFrac: 0.5,
    penetration: 1, noise: 26, sfx: 'shot_smg', desc: 'High-cyclic 9mm. Owns close quarters, drops off past midrange.',
  },
  ridgeline: {
    id: 'ridgeline', name: 'HC-4 Ridgeline', maker: 'Halcyon Ordnance', class: 'carbine', slot: 'primary',
    auto: true, damage: 31, headMult: 2.9, rpm: 640, mag: 30, reserve: 90,
    reloadTime: 2.25, reloadEmptyTime: 2.75, drawTime: 0.65,
    spreadBase: 0.55, spreadMove: 1.7, spreadAdsMult: 0.42, spreadPerShot: 0.3, spreadMax: 4.6,
    recoilPitch: 0.95, recoilYaw: 0.5, recoilRecover: 8.5,
    adsZoom: 1.3, adsTime: 0.22, falloffStart: 26, falloffEnd: 60, minDmgFrac: 0.6,
    penetration: 2, noise: 34, sfx: 'shot_carbine', desc: 'Balanced 5.56 workhorse. Controllable bursts at any interior range.',
  },
  boreas: {
    id: 'boreas', name: 'B-12 Boreas', maker: 'Halcyon Ordnance', class: 'shotgun', slot: 'primary',
    auto: false, pump: true, pumpTime: 0.62, damage: 9, pellets: 9, headMult: 1.6, rpm: 70, mag: 7, reserve: 32,
    reloadPerShell: 0.58, drawTime: 0.7,
    spreadBase: 3.6, spreadMove: 0.6, spreadAdsMult: 0.82, spreadPerShot: 0, spreadMax: 4.4,
    recoilPitch: 3.4, recoilYaw: 0.8, recoilRecover: 6,
    adsZoom: 1.1, adsTime: 0.22, falloffStart: 7, falloffEnd: 22, minDmgFrac: 0.25,
    penetration: 0, noise: 40, sfx: 'shot_shotgun', desc: 'Pump 12-gauge. Devastating inside eight meters, shell-by-shell reload.',
  },
  longwatch: {
    id: 'longwatch', name: 'LR-8 Longwatch', maker: 'Halcyon Ordnance', class: 'precision', slot: 'primary',
    auto: false, bolt: true, boltTime: 1.1, damage: 96, headMult: 3.2, rpm: 44, mag: 5, reserve: 20,
    reloadTime: 3.1, reloadEmptyTime: 3.4, drawTime: 0.9,
    spreadBase: 5.2, spreadMove: 3.0, spreadAdsMult: 0.02, spreadPerShot: 0.4, spreadMax: 8,
    recoilPitch: 4.6, recoilYaw: 0.7, recoilRecover: 5,
    adsZoom: 2.9, adsTime: 0.34, falloffStart: 70, falloffEnd: 140, minDmgFrac: 0.8,
    penetration: 3, noise: 46, sfx: 'shot_precision', desc: 'Bolt-action 7.62 marksman rifle. One breath, one answer.',
  },
  talon: {
    id: 'talon', name: 'Talon Field Knife', maker: 'Vektra Defense', class: 'melee', slot: 'melee',
    damage: 52, backMult: 2.6, swingTime: 0.42, range: 1.7, drawTime: 0.3,
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
  runSpeed: 4.5, walkSpeed: 2.2, crouchSpeed: 1.7, adsSpeedMult: 0.72,
  accel: 52, airAccel: 9, friction: 11.5, gravity: 19.6, jumpVel: 5.6, stepHeight: 0.34,
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
  ['Shift (hold)', 'Walk quietly'],
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
