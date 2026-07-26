/**
 * DIFFICULTY SCALING
 * Owner: Opus 3.
 *
 * Difficulty changes enemy count, perception, aim and aggression plus the
 * mission clock and the player's damage taken. It never changes weapon damage
 * numbers in src/weapons/defs.js — those stay authored once so the loadout
 * screen can show honest stat bars.
 */

export const DIFFICULTIES = {
  recruit: {
    id: 'recruit', name: 'Recruit', order: 0,
    blurb: 'Learn the building. Hostiles react slowly, shoot loosely and there are fewer of them.',
    changes: [
      'Ten hostiles instead of eighteen',
      'Reaction time doubled, sight range 28 m',
      'Enemy damage 60%, your armour absorbs more',
      'Twelve-minute mission clock',
      'Hostages take much longer to be executed if you are spotted',
    ],
    enemyCount: 10, enemyHealthScale: 0.85, enemyDamage: 9,
    enemySightRange: 28, enemyFov: 90, enemyAwarenessRate: 1.35, enemyAccuracyError: 5.2,
    enemyMemory: 4.5, enemyHearingScale: 0.75, enemyPreferredRange: 10,
    enemyBurstBonus: 1, enemyBurstPause: 1.5,
    playerDamageScale: 0.6, playerSpreadScale: 0.85,
    missionSeconds: 720, hostageExecutionDelay: 999, allowHostageExecution: false,
  },
  operator: {
    id: 'operator', name: 'Operator', order: 1,
    blurb: 'The intended experience. Competent hostiles who use cover, flank and search for you.',
    changes: [
      'Fourteen hostiles',
      'Sight range 34 m, 100° cone',
      'Hostiles take cover, flank and call contacts',
      'Ten-minute mission clock',
      'Hostages panic but are not executed',
    ],
    enemyCount: 14, enemyHealthScale: 1.0, enemyDamage: 14,
    enemySightRange: 34, enemyFov: 100, enemyAwarenessRate: 2.2, enemyAccuracyError: 3.4,
    enemyMemory: 6.5, enemyHearingScale: 1.0, enemyPreferredRange: 9,
    enemyBurstBonus: 2, enemyBurstPause: 1.0,
    playerDamageScale: 1.0, playerSpreadScale: 1.0,
    missionSeconds: 600, hostageExecutionDelay: 999, allowHostageExecution: false,
  },
  veteran: {
    id: 'veteran', name: 'Veteran', order: 2,
    blurb: 'Sharper hostiles, a tighter clock, and a guard who will hurt a hostage if you are careless.',
    changes: [
      'Eighteen hostiles including two heavies',
      'Sight range 40 m, faster awareness build-up',
      'Tighter aim and longer bursts',
      'Eight-minute mission clock',
      'A hostage guard will execute after 25 s of open alarm',
    ],
    enemyCount: 18, enemyHealthScale: 1.1, enemyDamage: 18,
    enemySightRange: 40, enemyFov: 110, enemyAwarenessRate: 3.0, enemyAccuracyError: 2.4,
    enemyMemory: 8.5, enemyHearingScale: 1.25, enemyPreferredRange: 11,
    enemyBurstBonus: 3, enemyBurstPause: 0.8,
    playerDamageScale: 1.25, playerSpreadScale: 1.1,
    missionSeconds: 480, hostageExecutionDelay: 25, allowHostageExecution: true,
  },
  blackout: {
    id: 'blackout', name: 'Blackout', order: 3,
    blurb: 'Building power is cut. Emergency lighting only, twenty-two hostiles, no margin for error.',
    changes: [
      'Twenty-two hostiles',
      'Building lighting reduced to emergency and daylight only',
      'Hostiles hear further and remember longer',
      'Six-and-a-half-minute mission clock',
      'A hostage guard will execute after 18 s of open alarm',
    ],
    enemyCount: 22, enemyHealthScale: 1.2, enemyDamage: 22,
    enemySightRange: 42, enemyFov: 115, enemyAwarenessRate: 3.6, enemyAccuracyError: 2.0,
    enemyMemory: 11, enemyHearingScale: 1.5, enemyPreferredRange: 12,
    enemyBurstBonus: 4, enemyBurstPause: 0.7,
    playerDamageScale: 1.5, playerSpreadScale: 1.15,
    missionSeconds: 390, hostageExecutionDelay: 18, allowHostageExecution: true,
    lighting: 'blackout',
  },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES).sort((a, b) => a.order - b.order);

export function difficultyById(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES.operator;
}
