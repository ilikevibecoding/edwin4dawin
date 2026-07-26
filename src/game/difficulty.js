// Difficulty definitions. Owned by Opus 3 domain; values tuned during AI passes.
export const DIFFICULTIES = {
  recruit: {
    id: 'recruit', name: 'Recruit', blurb: 'Forgiving foes, generous armor. Learn the building.',
    enemyCount: 0.7, enemyDamage: 0.55, enemyAccuracy: 0.55, enemyReaction: 1.5, enemyHealth: 0.85,
    playerArmor: 100, hearingRadius: 0.8, visionRange: 0.8,
  },
  operator: {
    id: 'operator', name: 'Operator', blurb: 'The intended experience. Deliberate and dangerous.',
    enemyCount: 1.0, enemyDamage: 1.0, enemyAccuracy: 1.0, enemyReaction: 1.0, enemyHealth: 1.0,
    playerArmor: 75, hearingRadius: 1.0, visionRange: 1.0,
  },
  veteran: {
    id: 'veteran', name: 'Veteran', blurb: 'More hostiles, faster reactions, punishing damage.',
    enemyCount: 1.25, enemyDamage: 1.45, enemyAccuracy: 1.25, enemyReaction: 0.7, enemyHealth: 1.15,
    playerArmor: 50, hearingRadius: 1.2, visionRange: 1.15,
  },
};
export const DIFFICULTY_ORDER = ['recruit', 'operator', 'veteran'];
