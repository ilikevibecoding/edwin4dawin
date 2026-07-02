// Unit archetypes + card definitions. Original generic fantasy roster.
export const UNITS = {
  knight: {
    name: 'Knight', hp: 660, dmg: 78, range: 14, atkCd: 1.1, speed: 34,
    radius: 10, sight: 90, count: 1, level: 3,
  },
  ogre: {
    name: 'Ogre', hp: 1750, dmg: 120, range: 16, atkCd: 1.5, speed: 21,
    radius: 13, sight: 90, count: 1, level: 2, towersOnly: true,
  },
  imp: {
    name: 'Imp', hp: 130, dmg: 42, range: 11, atkCd: 0.85, speed: 52,
    radius: 7, sight: 84, count: 3, level: 4,
  },
  archer: {
    name: 'Archer', hp: 210, dmg: 56, range: 66, atkCd: 1.15, speed: 38,
    radius: 8, sight: 110, count: 2, level: 3, projectile: 'arrow',
  },
  mage: {
    name: 'Mage', hp: 320, dmg: 96, range: 62, atkCd: 1.6, speed: 30,
    radius: 9, sight: 105, count: 1, level: 2, projectile: 'bolt', splash: 22,
  },
};

export const CARDS = [
  { id: 'knight', name: 'Knight', cost: 3, rarity: 'common', unit: 'knight', portraitScale: 1.32 },
  { id: 'ogre', name: 'Ogre', cost: 5, rarity: 'epic', unit: 'ogre', portraitScale: 1.18 },
  { id: 'imp', name: 'Imps', cost: 2, rarity: 'common', unit: 'imp', portraitScale: 2.5 },
  { id: 'archer', name: 'Archers', cost: 3, rarity: 'rare', unit: 'archer', portraitScale: 1.5 },
  { id: 'mage', name: 'Mage', cost: 4, rarity: 'rare', unit: 'mage', portraitScale: 1.22 },
  { id: 'fireball', name: 'Fireball', cost: 4, rarity: 'epic', spell: true, dmg: 340, radius: 34 },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c, c] && [c.id, c]));

export const TOWERS = {
  side: { hp: 840, dmg: 50, range: 88, atkCd: 0.8, level: 3 },
  king: { hp: 1400, dmg: 60, range: 96, atkCd: 0.9, level: 4 },
};

export const RULES = {
  elixirMax: 10,
  elixirRegenPerSec: 1 / 2.8,
  battleSeconds: 180,
  startElixir: 5,
};

export const PLAYER_NAME = 'Sir Pixel';
export const OPPONENT_NAME = 'Grumble Bot';
