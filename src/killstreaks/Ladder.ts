import type { KillstreakDef } from '../core/Interfaces';
import type { StrikeKind } from './Airstrike';

/**
 * The ladder.
 *
 * Eight rewards between three kills and fifteen, and the shape of the curve is
 * the design: the first rung is information, the middle rungs are firepower the
 * player aims themselves, and the top of the ladder takes the gun out of their
 * hands and gives them an aircraft. Every step up is roughly a doubling in
 * value for a linear step in cost, which is what makes a streak feel like it is
 * accelerating away from the player rather than paying out on a schedule.
 *
 * `targeted` is the load-bearing flag: a targeted streak enters the tactical
 * view and is not spent until the player confirms, so cancelling costs nothing
 * and the reward stays in the pocket.
 */

export interface StreakDef extends KillstreakDef {
  /** Enters the overhead targeting mode before it fires. */
  targeted: boolean;
  /** Which airstrike this calls, when it calls one. */
  strike?: StrikeKind;
  /** Support streaks are identified by id here rather than by a subclass. */
  support?: 'uav' | 'package' | 'mortar' | 'helicopter' | 'gunship';
  /** Seconds it stays on station, for the ones that do. */
  duration?: number;
}

export const LADDER: StreakDef[] = [
  {
    id: 'uav',
    name: 'UAV RECON',
    killsRequired: 3,
    cooldown: 0,
    icon: 'uav',
    description: 'Reveals hostiles on the minimap for 30 seconds.',
    targeted: false,
    support: 'uav',
    duration: 30,
  },
  {
    id: 'package',
    name: 'CARE PACKAGE',
    killsRequired: 4,
    cooldown: 0,
    icon: 'crate',
    description: 'Marks a drop zone. Ammunition and armour, parachuted in.',
    targeted: true,
    support: 'package',
  },
  {
    id: 'precision',
    name: 'PRECISION AIRSTRIKE',
    killsRequired: 5,
    cooldown: 0,
    icon: 'bomb',
    description: 'One two-thousand pounder, exactly where you put the marker.',
    targeted: true,
    strike: 'precision',
  },
  {
    id: 'mortar',
    name: 'MORTAR BARRAGE',
    killsRequired: 6,
    cooldown: 0,
    icon: 'mortar',
    description: 'Twelve rounds walked across the target box over ten seconds.',
    targeted: true,
    support: 'mortar',
  },
  {
    id: 'carpet',
    name: 'CARPET BOMB',
    killsRequired: 7,
    cooldown: 0,
    icon: 'carpet',
    description: 'A flight of three. Seven bombs walked along your run-in.',
    targeted: true,
    strike: 'carpet',
  },
  {
    id: 'cluster',
    name: 'CLUSTER STRIKE',
    killsRequired: 8,
    cooldown: 0,
    icon: 'cluster',
    description: 'Dispensers open at ninety metres. Nothing in the open survives.',
    targeted: true,
    strike: 'cluster',
  },
  {
    id: 'helicopter',
    name: 'ATTACK HELICOPTER',
    killsRequired: 9,
    cooldown: 0,
    icon: 'heli',
    description: 'Orbits the map for a minute and engages with the chin gun.',
    targeted: false,
    support: 'helicopter',
    duration: 58,
  },
  {
    id: 'napalm',
    name: 'NAPALM STRIKE',
    killsRequired: 11,
    cooldown: 0,
    icon: 'napalm',
    description: 'A low pass laying a wall of fire that burns for a minute.',
    targeted: true,
    strike: 'napalm',
  },
  {
    id: 'gunship',
    name: 'AC-130 GUNSHIP',
    killsRequired: 15,
    cooldown: 0,
    icon: 'gunship',
    description: 'Take the gunner seat. Forty seconds of 105 mm from orbit.',
    targeted: false,
    support: 'gunship',
    duration: 42,
  },
];

export function findStreak(id: string): StreakDef | undefined {
  return LADDER.find((s) => s.id === id);
}
