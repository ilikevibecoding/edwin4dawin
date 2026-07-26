// Difficulty definitions. Owned by Opus 3 domain; values tuned during AI passes.
//
// The top-level scalars are the ones every system already reads (health/damage/accuracy/reaction
// and the perception multipliers). `ai` holds the WP-015 tactical identity: how many hostiles are
// allowed to push at once, how they behave in cover, how much they tell each other and how
// thoroughly they search. See docs/reports/wp-015.md for the comparison table and the reasoning.
//
// `enemyCount` doubles as the roster gate: a spawn in src/map/layout.js with
// `minDifficulty > enemyCount` is skipped, so 0.7 / 1.0 / 1.25 select 11 / 14 / 16 hostiles.
export const DIFFICULTIES = {
  recruit: {
    id: 'recruit', name: 'Recruit', blurb: 'Forgiving foes, generous armor. Learn the building.',
    enemyCount: 0.7, enemyDamage: 0.55, enemyAccuracy: 0.55, enemyReaction: 1.5, enemyHealth: 0.85,
    playerArmor: 100, hearingRadius: 0.8, visionRange: 0.8,
    ai: {
      // pressure
      maxPushers: 1,
      holdRepositionSec: [6.0, 9.0],
      // perception fuse: multiplies the time suspicion needs to reach 1
      suspicionFuse: 1.35,
      // cover rhythm: seconds exposed / seconds tucked. Long, readable tucks.
      peekOut: [0.7, 1.1],
      peekIn: [1.5, 2.4],
      coverChance: 0.7,
      // suppression: gain per near miss, the level that counts as pinned, and what being pinned
      // does to the rhythm (a short snap look, a much longer tuck)
      suppressGain: 1.25,
      suppressTuck: 0.35,
      pinnedPeek: 0.35,
      pinnedTuck: 1.5,
      // information sharing
      shoutRadius: 7.0,
      shoutChance: 0.5,
      shoutHops: 1,
      shoutPos: false,          // calls it in, but not the exact position
      // corpse discovery
      corpseRadius: 8.0,
      // search
      searchSpots: 2,
      searchDwell: [1.6, 2.6],
      crouchCheckChance: 0.2,
      warySec: 35,
      waryAlertness: 1.25,
    },
  },
  operator: {
    id: 'operator', name: 'Operator', blurb: 'The intended experience. Deliberate and dangerous.',
    enemyCount: 1.0, enemyDamage: 1.0, enemyAccuracy: 1.0, enemyReaction: 1.0, enemyHealth: 1.0,
    playerArmor: 75, hearingRadius: 1.0, visionRange: 1.0,
    ai: {
      maxPushers: 2,
      holdRepositionSec: [4.0, 6.5],
      suspicionFuse: 1.0,
      peekOut: [0.9, 1.5],
      peekIn: [0.9, 1.6],
      coverChance: 0.9,
      suppressGain: 1.0,
      suppressTuck: 0.5,
      pinnedPeek: 0.6,
      pinnedTuck: 0.9,
      shoutRadius: 10.0,
      shoutChance: 0.85,
      shoutHops: 2,
      shoutPos: true,
      corpseRadius: 12.0,
      searchSpots: 3,
      searchDwell: [1.2, 2.0],
      crouchCheckChance: 0.35,
      warySec: 60,
      waryAlertness: 1.45,
    },
  },
  veteran: {
    id: 'veteran', name: 'Veteran', blurb: 'More hostiles, faster reactions, punishing damage.',
    enemyCount: 1.25, enemyDamage: 1.45, enemyAccuracy: 1.25, enemyReaction: 0.7, enemyHealth: 1.15,
    playerArmor: 50, hearingRadius: 1.2, visionRange: 1.15,
    ai: {
      maxPushers: 3,
      holdRepositionSec: [2.6, 4.4],
      suspicionFuse: 0.85,
      peekOut: [1.2, 2.0],
      peekIn: [0.45, 0.9],
      coverChance: 1.0,
      suppressGain: 0.45,       // hard to pin down
      suppressTuck: 0.75,
      pinnedPeek: 0.85,
      pinnedTuck: 0.55,
      shoutRadius: 13.0,
      shoutChance: 1.0,
      shoutHops: 2,
      shoutPos: true,
      corpseRadius: 16.0,
      searchSpots: 4,
      searchDwell: [0.9, 1.5],
      crouchCheckChance: 0.5,
      warySec: 90,
      waryAlertness: 1.7,
    },
  },
};
export const DIFFICULTY_ORDER = ['recruit', 'operator', 'veteran'];

/** Difficulty scalars fall back to `operator` so a partial object can never crash the AI. */
export function aiTuning(diff) {
  return (diff && diff.ai) || DIFFICULTIES.operator.ai;
}
