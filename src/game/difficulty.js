// Difficulty tuning. Values scale enemy perception, aim, damage and the
// mission clock. Selected on the difficulty screen; drives AIManager+Mission.
export const DIFFICULTIES = {
  recruit: {
    id: 'recruit', name: 'Recruit',
    tagline: 'Forgiving patrols, generous mission clock.',
    accuracy: 0.30, enemyDamage: 0.7, reaction: 0.6, visionRange: 22,
    susRate: 0.85, enemyHp: 0.85, missionTime: 960, playerArmor: 75,
  },
  operative: {
    id: 'operative', name: 'Operative',
    tagline: 'Balanced pressure. The intended experience.',
    accuracy: 0.40, enemyDamage: 1.0, reaction: 0.4, visionRange: 27,
    susRate: 1.1, enemyHp: 1.0, missionTime: 780, playerArmor: 50,
  },
  veteran: {
    id: 'veteran', name: 'Veteran',
    tagline: 'More hostiles, sharper eyes, tighter clock.',
    accuracy: 0.52, enemyDamage: 1.3, reaction: 0.24, visionRange: 32,
    susRate: 1.5, enemyHp: 1.15, missionTime: 640, playerArmor: 25,
  },
};

export const DEFAULT_DIFFICULTY = 'operative';
