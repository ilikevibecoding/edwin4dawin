import { Blackboard, type CombatRole } from './Blackboard';
import type { Enemy, AiWorld } from './Enemy';

/**
 * Squad.ts — coordinates a group of soldiers through a shared {@link Blackboard}.
 *
 * Every squad-think it assigns combat roles so the group reads like a trained
 * fireteam instead of a mob:
 *  - the closest few with a line of sight become **suppressors/engagers**
 *    (front assault is capped at `maxFrontEngagers` so the player isn't swarmed
 *    from one direction),
 *  - one or two are peeled off as **flankers** and routed around,
 *  - the rest **advance** (if far) or **hold**.
 * Roles are written back to each member; the behaviour tree obeys them.
 */
export class Squad {
  readonly id: number;
  readonly blackboard = new Blackboard();
  readonly members: Enemy[] = [];

  private thinkAccum = 0;

  constructor(id: number) {
    this.id = id;
    this.blackboard.maxFrontEngagers = 3;
  }

  add(e: Enemy) {
    e.squadId = this.id;
    e.blackboard = this.blackboard;
    this.members.push(e);
  }

  remove(e: Enemy) {
    const i = this.members.indexOf(e);
    if (i >= 0) this.members.splice(i, 1);
    this.blackboard.clear(e.id);
  }

  get liveCount(): number {
    let n = 0;
    for (const m of this.members) if (m.alive) n++;
    return n;
  }

  update(dt: number, world: AiWorld) {
    this.blackboard.decay(dt, world.elapsed);
    this.blackboard.members = this.members.filter((m) => m.alive).map((m) => m.id);

    // Re-assign roles a few times a second.
    this.thinkAccum += dt;
    if (this.thinkAccum < 0.4) return;
    this.thinkAccum = 0;
    this.assignRoles(world);
  }

  private assignRoles(world: AiWorld) {
    const bb = this.blackboard;
    const live = this.members.filter((m) => m.alive);
    if (live.length === 0) return;

    // Only members that are alert participate in the coordinated assault.
    const alerted = live.filter((m) => m.perception.spotted || (bb.hasPlayerInfo && m.perception.awareness > 0.4));
    const threat = bb.hasPlayerInfo ? bb.playerLastKnown : (world.player?.position ?? null);

    if (!threat || alerted.length === 0) {
      for (const m of live) {
        m.role = 'hold';
        bb.setRole(m.id, 'hold');
      }
      return;
    }

    // Sort by distance to the threat: nearest engage, others manoeuvre.
    alerted.sort((a, b) => a.position.distanceToSquared(threat) - b.position.distanceToSquared(threat));

    let engagers = 0;
    let flankers = 0;
    const maxFlank = alerted.length >= 4 ? 2 : alerted.length >= 2 ? 1 : 0;

    for (let i = 0; i < alerted.length; i++) {
      const m = alerted[i];
      let role: CombatRole;
      const dist = m.position.distanceTo(threat);
      if (engagers < bb.maxFrontEngagers && m.perception.canSee) {
        role = engagers === 0 ? 'engage' : 'suppress';
        engagers++;
      } else if (flankers < maxFlank && dist > 8) {
        role = 'flank';
        flankers++;
      } else if (dist > 16) {
        role = 'advance';
      } else {
        role = 'hold';
      }
      m.role = role;
      bb.setRole(m.id, role);
    }
    // Anyone not alerted holds.
    for (const m of live) {
      if (!alerted.includes(m)) {
        m.role = 'hold';
        bb.setRole(m.id, 'hold');
      }
    }
  }
}

