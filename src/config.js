export const MAP_SIZE = 800;
export const HALF = MAP_SIZE / 2;
export const CELL = 4; // build grid size (world units)
export const WALL_T = 0.3;
export const FLOOR_T = 0.3;
export const BUILD_COST = 10;
export const MAX_MATS = 999;
export const BOT_COUNT = 39;
export const TOTAL_PLAYERS = BOT_COUNT + 1;

export const PLAYER = {
  radius: 0.45,
  height: 1.8,
  eye: 1.6,
  step: 0.7,
  walk: 5.4,
  sprint: 8.2,
  jump: 9.6,
  gravity: 28,
  maxHp: 100,
  maxShield: 100,
};

export const MATERIALS = {
  wood: { name: 'Wood', hp: 150, color: 0xb5813f, harvest: 12 },
  brick: { name: 'Brick', hp: 300, color: 0x9d9d9d, harvest: 10 },
  metal: { name: 'Metal', hp: 450, color: 0x7d9db3, harvest: 8 },
};
export const MATERIAL_ORDER = ['wood', 'brick', 'metal'];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLOR = {
  common: 0x9da3a8,
  uncommon: 0x46c85a,
  rare: 0x3d9cff,
  epic: 0xb658ff,
  legendary: 0xffa41b,
};
export const RARITY_MULT = { common: 1, uncommon: 1.05, rare: 1.1, epic: 1.16, legendary: 1.22 };

// rpm: rounds per minute, spread: radians, falloff: [start, end] distance where damage tapers to 40%
export const WEAPONS = {
  pistol: {
    name: 'Pistol', ammo: 'light', damage: 25, rpm: 380, mag: 16, reload: 1.5,
    spread: 0.012, auto: false, headshot: 1.75, pellets: 1, range: 220, falloff: [60, 160],
    rarities: ['common', 'uncommon', 'rare', 'epic'], kick: 0.012, length: 0.45,
  },
  smg: {
    name: 'SMG', ammo: 'light', damage: 18, rpm: 780, mag: 30, reload: 2.1,
    spread: 0.03, auto: true, headshot: 1.5, pellets: 1, range: 160, falloff: [30, 90],
    rarities: ['common', 'uncommon', 'rare', 'epic'], kick: 0.008, length: 0.6,
  },
  ar: {
    name: 'Assault Rifle', ammo: 'medium', damage: 32, rpm: 330, mag: 30, reload: 2.3,
    spread: 0.017, auto: true, headshot: 1.5, pellets: 1, range: 320, falloff: [90, 260],
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'], kick: 0.014, length: 0.85,
  },
  shotgun: {
    name: 'Pump Shotgun', ammo: 'shells', damage: 12, rpm: 62, mag: 5, reload: 4.0,
    spread: 0.075, auto: false, headshot: 1.5, pellets: 9, range: 60, falloff: [10, 32],
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'], kick: 0.05, length: 0.9,
  },
  sniper: {
    name: 'Bolt Sniper', ammo: 'heavy', damage: 108, rpm: 34, mag: 1, reload: 3.0,
    spread: 0.0, auto: false, headshot: 2.5, pellets: 1, range: 600, falloff: [600, 700],
    rarities: ['rare', 'epic', 'legendary'], kick: 0.06, length: 1.1, scope: true,
  },
};
export const WEAPON_TYPES = Object.keys(WEAPONS);

export const AMMO = {
  light: { name: 'Light Ammo', pickup: 18, max: 999, color: 0xd7d7d7 },
  medium: { name: 'Medium Ammo', pickup: 12, max: 999, color: 0xd9b26a },
  heavy: { name: 'Heavy Ammo', pickup: 4, max: 999, color: 0x8e6b3d },
  shells: { name: 'Shells', pickup: 6, max: 999, color: 0xe25b5b },
};

export const CONSUMABLES = {
  bandage: { name: 'Bandages', heal: 15, cap: 75, time: 3.0, stack: 15, kind: 'health', color: 0xf3dcb0, rarity: 'common' },
  medkit: { name: 'Med Kit', heal: 100, cap: 100, time: 5.0, stack: 3, kind: 'health', color: 0xffffff, rarity: 'uncommon' },
  miniShield: { name: 'Small Shield', shield: 25, cap: 50, time: 2.0, stack: 6, kind: 'shield', color: 0x74c8ff, rarity: 'uncommon' },
  shield: { name: 'Shield Potion', shield: 50, cap: 100, time: 4.0, stack: 3, kind: 'shield', color: 0x2f7dff, rarity: 'rare' },
};

// Storm phases: wait, then shrink to `radius` over `shrink` seconds.
export const STORM_PHASES = [
  { wait: 75, shrink: 60, radius: 220, dps: 1 },
  { wait: 40, shrink: 45, radius: 120, dps: 2 },
  { wait: 30, shrink: 35, radius: 65, dps: 3 },
  { wait: 25, shrink: 30, radius: 30, dps: 5 },
  { wait: 20, shrink: 25, radius: 8, dps: 8 },
  { wait: 15, shrink: 30, radius: 0, dps: 10 },
];
export const STORM_START_RADIUS = 420;

export const PROPS = {
  tree: { hp: 200, material: 'wood', yieldPerHit: 12 },
  rock: { hp: 300, material: 'brick', yieldPerHit: 10 },
  car: { hp: 400, material: 'metal', yieldPerHit: 8 },
};

export const PICKAXE = { damage: 50, cooldown: 0.55, range: 3.2 };

export const BOT_NAMES = [
  'ShadowStrider', 'PixelPirate', 'NoScopeNate', 'LootGoblin', 'QuietStorm', 'RampRusher',
  'CrankedUp', 'BushCamper', 'HeadshotHank', 'SkyDancer', 'WallTaker', 'DoubleP',
  'GhostPeek', 'BoxFighter', 'MetalMorgan', 'BrickByBrick', 'StormChaser', 'TiltedTom',
  'SneakySasha', 'HighGround', 'OneTapOllie', 'ZoneWalker', 'TurboBuilder', 'LagSpike',
  'DropDizzy', 'CozyCamper', 'NightOwl', 'RocketRae', 'GliderGus', 'PickaxePat',
  'StealthySam', 'PotionPete', 'ChestHunter', 'EdgeLord', 'FinalCircle', 'BunnyHop',
  'SpraynPray', 'ThirdParty', 'KneeSlider', 'MidMapMike', 'SweatySteve', 'CalmCarla',
];
