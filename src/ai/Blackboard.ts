import * as THREE from 'three';

/**
 * Blackboard.ts — the shared memory a {@link Squad} coordinates through.
 *
 * Individual soldiers never talk to each other directly. They read and write
 * this small structure (last-known player position, alarm level, who owns which
 * combat role, grenade/flank cooldowns), which is what produces readable
 * squad-level behaviour: a couple of shooters pin the player from the front
 * while a flanker is routed around and the rest hold.
 */

export type CombatRole = 'engage' | 'suppress' | 'flank' | 'advance' | 'hold';

export class Blackboard {
  /** Best current estimate of where the player is (last seen / heard). */
  readonly playerLastKnown = new THREE.Vector3();
  hasPlayerInfo = false;
  /** Engine time the player was last directly seen by any squad member. */
  lastSeenTime = -1000;
  /** Engine time of the last noise the squad reacted to. */
  lastNoiseTime = -1000;
  readonly investigatePoint = new THREE.Vector3();
  hasInvestigate = false;

  /** 0 calm .. 1 fully alerted. Rises when members spot/hear the player. */
  alarm = 0;

  /** Role ownership, keyed by enemy id. */
  private roles = new Map<number, CombatRole>();
  /** How many members may engage from the front at once. */
  maxFrontEngagers = 3;

  lastGrenadeTime = -1000;
  lastFlankTime = -1000;

  /** Members currently alive in this squad (ids). Maintained by the Squad. */
  members: number[] = [];

  markSeen(pos: THREE.Vector3, time: number) {
    this.playerLastKnown.copy(pos);
    this.hasPlayerInfo = true;
    this.lastSeenTime = time;
    this.alarm = 1;
  }

  markHeard(pos: THREE.Vector3, time: number, weight = 0.6) {
    if (!this.hasPlayerInfo || time - this.lastSeenTime > 3) {
      this.investigatePoint.copy(pos);
      this.hasInvestigate = true;
    }
    this.lastNoiseTime = time;
    this.alarm = Math.min(1, Math.max(this.alarm, weight));
  }

  role(id: number): CombatRole {
    return this.roles.get(id) ?? 'hold';
  }
  setRole(id: number, role: CombatRole) {
    this.roles.set(id, role);
  }
  clear(id: number) {
    this.roles.delete(id);
  }

  countRole(role: CombatRole): number {
    let n = 0;
    for (const r of this.roles.values()) if (r === role) n++;
    return n;
  }

  decay(dt: number, time: number) {
    // Awareness fades if nobody has seen the player for a while.
    const sinceSeen = time - this.lastSeenTime;
    if (sinceSeen > 6) this.alarm = Math.max(0, this.alarm - dt * 0.12);
  }
}
