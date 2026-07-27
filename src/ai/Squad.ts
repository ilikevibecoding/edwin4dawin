/**
 * Squads.
 *
 * A squad is the difference between four enemies and one enemy times four. Three
 * things live at this level because they cannot be decided by an individual:
 *
 *  - **Shared knowledge.** One member seeing you means the squad knows within a
 *    radio delay, so flanking one man does not mean fighting one man.
 *  - **Tokens.** Exactly one flanker and exactly one mover at a time. Without
 *    them, "flank when the target is pinned" makes all four flank at once and the
 *    firefight has nobody left in it, and "advance under cover" has everybody
 *    advancing and nobody covering.
 *  - **Sectors.** During a search each member gets a different bearing off the
 *    last known position, so four men sweep a building instead of four men walking
 *    into the same doorway.
 */
import * as THREE from 'three';
import { TAU } from '../core/MathUtils';
import type { Blackboard } from './Blackboard';
import type { Enemy } from './Enemy';
import { DIRECTOR, RADIO, VOICE } from './Tuning';

export type SquadRole = 'point' | 'support' | 'flanker' | 'suppressor';

/** Seconds a movement token is held before it is force-released. */
const MOVE_TOKEN_TIME = 4.5;
/** Seconds between role reassignments. */
const ROLE_INTERVAL = 1.6;

export class Squad {
  readonly members: Enemy[] = [];

  /** Squad-level last known target position. */
  readonly contact = new THREE.Vector3();
  contactAt = -1;
  hasContact = false;
  /** True when at least one member currently has eyes on. */
  eyesOn = false;
  /** Seconds the squad has held contact without losing it. */
  engagedTime = 0;

  flankerId = -1;
  moverId = -1;
  private moverUntil = 0;
  private roleTimer = 0;
  private lastCallAt = -100;

  constructor(readonly id: number) {}

  get size(): number {
    return this.members.length;
  }

  get full(): boolean {
    return this.members.length >= DIRECTOR.squadSize;
  }

  add(enemy: Enemy): void {
    if (!this.members.includes(enemy)) this.members.push(enemy);
  }

  remove(enemy: Enemy): void {
    const i = this.members.indexOf(enemy);
    if (i >= 0) this.members.splice(i, 1);
    if (this.flankerId === enemy.id) this.flankerId = -1;
    if (this.moverId === enemy.id) this.moverId = -1;
  }

  /** Members within radio range of `from`, for a contact report. */
  private inRange(from: Enemy, other: Enemy): boolean {
    return from.feet.distanceToSquared(other.feet) < RADIO.range * RADIO.range;
  }

  /**
   * One member's contact becomes the squad's. Called when a member's radio delay
   * elapses, not when it first sees something, so there is a beat between the
   * first man spotting you and the rest reacting.
   */
  report(from: Enemy, position: THREE.Vector3, velocity: THREE.Vector3, bb: Blackboard): void {
    this.contact.copy(position);
    this.contactAt = bb.now;
    this.hasContact = true;
    for (const member of this.members) {
      if (member === from || !member.isAlive) continue;
      if (!this.inRange(from, member)) continue;
      member.perception.receiveContact(position, velocity, bb.now);
    }
  }

  /** Shout, at most one per squad every few seconds. */
  callout(bb: Blackboard, from: Enemy, id: string): void {
    if (bb.now - this.lastCallAt < RADIO.callCooldown) return;
    this.lastCallAt = bb.now;
    from.say(bb, id, 1);
  }

  update(dt: number, bb: Blackboard): void {
    this.eyesOn = false;
    let alive = 0;
    let closest: Enemy | null = null;
    let closestDistance = Infinity;

    for (const member of this.members) {
      if (!member.isAlive) continue;
      alive++;
      if (member.perception.visible && member.perception.engaged) {
        this.eyesOn = true;
        this.contact.copy(bb.target.feet);
        this.contactAt = bb.now;
        this.hasContact = true;
      }
      const distance = member.perception.distance;
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = member;
      }
    }

    if (this.eyesOn) this.engagedTime += dt;
    else if (bb.now - this.contactAt > 8) this.engagedTime = 0;

    if (this.moverId !== -1 && bb.now > this.moverUntil) this.moverId = -1;

    this.roleTimer -= dt;
    if (this.roleTimer > 0) return;
    this.roleTimer = ROLE_INTERVAL;
    this.assignRoles(bb, alive, closest);
  }

  /**
   * Role assignment.
   *
   * Deliberately simple and re-evaluated on a slow timer: a squad whose roles
   * churn every frame reads as indecisive, and the whole value of a role is that
   * the agent commits to it long enough for the player to notice.
   */
  private assignRoles(bb: Blackboard, alive: number, closest: Enemy | null): void {
    // A flank is only worth mounting once the target is actually pinned by fire,
    // and only ever by one man.
    const canFlank = this.eyesOn && this.engagedTime > 2.6 && alive >= 2;
    if (!canFlank) this.flankerId = -1;

    let flanker = canFlank ? this.memberById(this.flankerId) : null;
    if (flanker && (!flanker.isAlive || !flanker.perception.everSeen)) {
      this.flankerId = -1;
      flanker = null;
    }

    for (const member of this.members) {
      if (!member.isAlive) continue;
      if (member.archetype.suppressiveFire > 0.7) member.role = 'suppressor';
      else if (member === closest && member.archetype.aggression > 0.5) member.role = 'point';
      else member.role = 'support';
    }

    if (canFlank && !flanker) {
      // Prefer someone who is not the closest and not the squad's base of fire.
      let best: Enemy | null = null;
      let bestScore = -Infinity;
      for (const member of this.members) {
        if (!member.isAlive || member === closest) continue;
        if (member.role === 'suppressor') continue;
        if (!member.perception.everSeen) continue;
        if (member.combatant.reloading) continue;
        const score =
          member.archetype.aggression * 2 -
          member.perception.distance * 0.02 +
          (member.stateName === 'cover' ? 0.4 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = member;
        }
      }
      if (best) {
        this.flankerId = best.id;
        best.role = 'flanker';
        this.callout(bb, best, VOICE.flanking);
      }
    } else if (flanker) {
      flanker.role = 'flanker';
    }
  }

  /** Bounding overwatch: one man moves, the rest hold. */
  requestMove(enemy: Enemy, bb: Blackboard): boolean {
    if (this.moverId === enemy.id) {
      this.moverUntil = bb.now + MOVE_TOKEN_TIME;
      return true;
    }
    if (this.moverId !== -1) {
      const holder = this.memberById(this.moverId);
      if (holder && holder.isAlive) return false;
    }
    this.moverId = enemy.id;
    this.moverUntil = bb.now + MOVE_TOKEN_TIME;
    return true;
  }

  releaseMove(enemy: Enemy): void {
    if (this.moverId === enemy.id) this.moverId = -1;
  }

  /**
   * A distinct bearing per member, so a search fans out.
   *
   * Returns a point offset from `centre` by an angle derived from the member's
   * slot in the squad, which makes the assignment stable across frames without
   * storing anything.
   */
  searchAnchor(enemy: Enemy, centre: THREE.Vector3, radius: number, out: THREE.Vector3): THREE.Vector3 {
    const slot = Math.max(0, this.members.indexOf(enemy));
    const count = Math.max(1, this.members.length);
    // Spread over three quarters of a circle centred on the squad's approach, not
    // the whole circle: nobody searches the ground they just came from.
    const spread = TAU * 0.42;
    const angle = -spread * 0.5 + (spread * (slot + 0.5)) / count + this.baseBearing(centre);
    return out.set(centre.x + Math.cos(angle) * radius, centre.y, centre.z + Math.sin(angle) * radius);
  }

  private baseBearing(centre: THREE.Vector3): number {
    let sx = 0;
    let sz = 0;
    let n = 0;
    for (const member of this.members) {
      if (!member.isAlive) continue;
      sx += member.feet.x;
      sz += member.feet.z;
      n++;
    }
    if (n === 0) return 0;
    return Math.atan2(centre.z - sz / n, centre.x - sx / n);
  }

  memberById(id: number): Enemy | null {
    for (const member of this.members) if (member.id === id) return member;
    return null;
  }

  /** Squadmates currently shooting, used to decide whether it is safe to move. */
  coveringFire(bb: Blackboard, exclude: Enemy): number {
    let n = 0;
    for (const member of this.members) {
      if (member === exclude || !member.isAlive) continue;
      if (bb.now - member.combatant.lastShotAt < 1.4) n++;
    }
    return n;
  }
}

export class SquadManager {
  private readonly squads: Squad[] = [];
  private nextId = 1;

  get all(): readonly Squad[] {
    return this.squads;
  }

  /** Puts a new enemy into the nearest squad with room, or starts one. */
  assign(enemy: Enemy): Squad {
    let best: Squad | null = null;
    let bestDistance = Infinity;
    for (const squad of this.squads) {
      if (squad.full) continue;
      let distance = 0;
      let n = 0;
      for (const member of squad.members) {
        if (!member.isAlive) continue;
        distance += member.feet.distanceToSquared(enemy.feet);
        n++;
      }
      if (n === 0) {
        best = squad;
        bestDistance = 0;
        break;
      }
      const average = distance / n;
      if (average < bestDistance) {
        bestDistance = average;
        best = squad;
      }
    }
    // A squad spread over more than about forty metres is not a squad.
    if (!best || bestDistance > 1600) {
      best = new Squad(this.nextId++);
      this.squads.push(best);
    }
    best.add(enemy);
    return best;
  }

  remove(enemy: Enemy): void {
    const squad = enemy.squad;
    if (!squad) return;
    squad.remove(enemy);
    if (squad.members.length === 0) {
      const i = this.squads.indexOf(squad);
      if (i >= 0) this.squads.splice(i, 1);
    }
  }

  update(dt: number, bb: Blackboard): void {
    for (let i = this.squads.length - 1; i >= 0; i--) {
      const squad = this.squads[i];
      squad.update(dt, bb);
      if (squad.members.length === 0) this.squads.splice(i, 1);
    }
  }

  clear(): void {
    this.squads.length = 0;
  }
}
