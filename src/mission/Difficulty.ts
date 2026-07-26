/**
 * Difficulty profiles. Owner: Opus 3.
 *
 * Difficulty changes what the hostiles *are*, not just their numbers: how long they take to
 * commit to a target, how tight their aim is, how far they hear, how aggressively they flank,
 * and whether they call reinforcements. Player-side scaling is limited to incoming damage and
 * armour so the shooting always feels the same.
 */
import type { DifficultyId } from '../core/Types';

export interface DifficultyProfile {
  id: DifficultyId;
  name: string;
  tagline: string;
  description: string;
  /** Number of hostiles placed in the building. */
  enemyCount: number;
  /** 0..1 chance the shot lands inside the tight cone rather than the wide one. */
  enemyAccuracy: number;
  /** Seconds between first seeing the player and firing. */
  reactionTime: number;
  /** Multiplier on hostile damage output. */
  damageToPlayer: number;
  /** Multiplier on hostile health. */
  enemyHealth: number;
  /** Vision range in metres. */
  sightRange: number;
  /** Field of view, radians (half-angle). */
  sightHalfAngle: number;
  /** Hearing multiplier on the noise radius. */
  hearing: number;
  /** Seconds before an alerted group loses interest. */
  searchTime: number;
  /** Mission clock, seconds. */
  timeLimit: number;
  /** Player starting armour. */
  startArmor: number;
  /** Health regenerated per second after staying out of contact. */
  regenRate: number;
  /** Delay before regeneration starts. */
  regenDelay: number;
  /** Fraction of hostiles that actively flank rather than hold a firing position. */
  flankChance: number;
  /** Hostiles radio each other; contact spreads through the building. */
  radioRange: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyProfile> = {
  recruit: {
    id: 'recruit',
    name: 'Recruit',
    tagline: 'Learn the building',
    description:
      'Fewer hostiles, slow to react and poor shots. The mission clock is generous and you recover quickly between contacts.',
    enemyCount: 9,
    enemyAccuracy: 0.32,
    reactionTime: 0.85,
    damageToPlayer: 0.55,
    enemyHealth: 0.85,
    sightRange: 22,
    sightHalfAngle: 0.62,
    hearing: 0.7,
    searchTime: 14,
    timeLimit: 900,
    startArmor: 100,
    regenRate: 7,
    regenDelay: 4,
    flankChance: 0.15,
    radioRange: 12,
  },
  operator: {
    id: 'operator',
    name: 'Operator',
    tagline: 'Intended experience',
    description:
      'A competent, well-drilled group. They use cover, call contacts to each other and search where they last saw you. Balanced pacing.',
    enemyCount: 13,
    enemyAccuracy: 0.52,
    reactionTime: 0.55,
    damageToPlayer: 1.0,
    enemyHealth: 1.0,
    sightRange: 30,
    sightHalfAngle: 0.72,
    hearing: 1.0,
    searchTime: 22,
    timeLimit: 720,
    startArmor: 100,
    regenRate: 4.5,
    regenDelay: 7,
    flankChance: 0.35,
    radioRange: 22,
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    tagline: 'Punishing',
    description:
      'Disciplined, patient and quick to punish exposure. They pre-aim doorways, flank aggressively and hear you moving through the building.',
    enemyCount: 16,
    enemyAccuracy: 0.7,
    reactionTime: 0.34,
    damageToPlayer: 1.35,
    enemyHealth: 1.1,
    sightRange: 38,
    sightHalfAngle: 0.82,
    hearing: 1.35,
    searchTime: 32,
    timeLimit: 660,
    startArmor: 75,
    regenRate: 2.5,
    regenDelay: 10,
    flankChance: 0.55,
    radioRange: 34,
  },
  blackout: {
    id: 'blackout',
    name: 'Blackout',
    tagline: 'One mistake',
    description:
      'Building power is failing and the hostiles are on a hair trigger. Minimal armour, almost no recovery, and a clock that will not wait.',
    enemyCount: 18,
    enemyAccuracy: 0.8,
    reactionTime: 0.24,
    damageToPlayer: 1.7,
    enemyHealth: 1.2,
    sightRange: 42,
    sightHalfAngle: 0.9,
    hearing: 1.6,
    searchTime: 45,
    timeLimit: 600,
    startArmor: 40,
    regenRate: 0,
    regenDelay: 999,
    flankChance: 0.7,
    radioRange: 48,
  },
};

export function difficultyOf(id: DifficultyId): DifficultyProfile {
  return DIFFICULTIES[id];
}
