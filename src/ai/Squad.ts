import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { Agent } from './Agent';

/**
 * Squad coordination.
 *
 * A squad is the difference between eight men who each independently notice you
 * and eight men who fight you. Three things are shared here and nothing else,
 * because anything more starts to feel like the AI is cheating:
 *
 * **Contacts.** One man seeing the player puts a last-known-position into every
 * squadmate's head, marked as second-hand so it is trusted less and forgotten
 * sooner than something they saw themselves. That is a radio call, and it is
 * why walking past one sentry gets you a reception at the next corner.
 *
 * **Roles.** Whoever has eyes on and cover holds the target down; whoever does
 * not is sent round the side. The rule that matters is that a flank is only
 * ordered when somebody is actually firing — a squad that all flanks at once is
 * a squad that all walks into the open at once, and the player reads it as
 * eight men queueing up to be shot.
 *
 * **Callouts.** Emitted as events so the audio and HUD can react without the AI
 * knowing they exist.
 */

export const ROLE_IDLE = 0;
export const ROLE_ASSAULT = 1;
export const ROLE_SUPPRESS = 2;
export const ROLE_FLANK = 3;
export const ROLE_HOLD = 4;

export const ROLE_NAMES = ['idle', 'assault', 'suppress', 'flank', 'hold'];

/** Seconds between role reassessments for one squad. */
const REASSESS = 1.4;
/** Radio lag, so a squad does not turn as one man. */
const RELAY_DELAY = 0.35;
/** Seconds between callouts of the same kind from one squad. */
const CALLOUT_COOLDOWN = 4.5;

export type CalloutKind =
  | 'contact'
  | 'reloading'
  | 'grenade'
  | 'flanking'
  | 'suppressing'
  | 'man-down'
  | 'lost';

const _v = new THREE.Vector3();

export class Squad {
  readonly members: Agent[] = [];
  readonly contact = new THREE.Vector3();
  readonly contactVelocity = new THREE.Vector3();
  /** Seconds since the squad last had any information at all. */
  contactAge = 1e6;
  hasContact = false;

  /** Agent id that reported the contact, so it is not relayed back to him. */
  reporter = -1;
  /** Which side the squad is flanking round, flipped when a flanker dies. */
  flankSide = 1;

  private relay = -1;
  private assess = 0;
  private calloutTimers = new Map<CalloutKind, number>();

  constructor(readonly id: number) {}

  add(agent: Agent): void {
    if (this.members.indexOf(agent) < 0) this.members.push(agent);
  }

  remove(agent: Agent): void {
    const i = this.members.indexOf(agent);
    if (i >= 0) this.members.splice(i, 1);
  }

  get aliveCount(): number {
    let n = 0;
    for (const m of this.members) if (m.alive) n++;
    return n;
  }

  /** One member has a confirmed contact and is telling everybody. */
  report(agent: Agent, position: THREE.Vector3, velocity: THREE.Vector3): void {
    this.contact.copy(position);
    this.contactVelocity.copy(velocity);
    this.contactAge = 0;
    this.hasContact = true;
    this.reporter = agent.id;
    if (this.relay < 0) this.relay = RELAY_DELAY;
  }

  update(dt: number, events: EventBus | null): void {
    this.contactAge += dt;
    for (const [kind, t] of this.calloutTimers) {
      if (t > 0) this.calloutTimers.set(kind, t - dt);
    }

    if (this.relay >= 0) {
      this.relay -= dt;
      if (this.relay < 0) {
        for (const m of this.members) {
          if (!m.alive || m.id === this.reporter) continue;
          m.perception.share(this.contact, this.contactVelocity);
        }
        this.callout(events, 'contact', this.contact);
      }
    }

    this.assess -= dt;
    if (this.assess <= 0) {
      this.assess = REASSESS;
      this.assignRoles(events);
    }
  }

  /**
   * Hands out roles. Deliberately blunt: the best-placed shooter fixes the
   * target, the man with the worst angle goes round, everybody else closes.
   */
  private assignRoles(events: EventBus | null): void {
    if (!this.hasContact || this.contactAge > 8) {
      for (const m of this.members) if (m.alive) m.role = ROLE_IDLE;
      return;
    }

    let best: Agent | null = null;
    let bestScore = -Infinity;
    let worst: Agent | null = null;
    let worstScore = Infinity;
    let live = 0;

    for (const m of this.members) {
      if (!m.alive) continue;
      live++;
      // A shooter is worth more the better his position is: in cover, with a
      // line, at a range his weapon works at, and not currently pinned.
      const dist = _v.copy(m.position).sub(this.contact).length();
      let score = 0;
      if (m.perception.visible) score += 40;
      if (m.inCover) score += 26;
      score -= m.suppression * 40;
      score -= Math.abs(dist - 20) * 0.7;
      if (m.magazine <= 4) score -= 25;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
      if (score < worstScore) {
        worstScore = score;
        worst = m;
      }
    }

    if (!best) return;

    for (const m of this.members) {
      if (!m.alive) continue;
      m.role = ROLE_ASSAULT;
    }
    best.role = ROLE_SUPPRESS;

    // A flank is only worth ordering once somebody is holding the target down,
    // and only with enough men left that the squad is not simply splitting up.
    if (live >= 3 && worst && worst !== best && best.perception.visible) {
      worst.role = ROLE_FLANK;
      worst.flankSide = this.flankSide;
      this.flankSide = -this.flankSide;
      this.callout(events, 'flanking', worst.position);
    }

    // Everybody short of a magazine holds what they have rather than pushing.
    for (const m of this.members) {
      if (m.alive && m.role === ROLE_ASSAULT && m.magazine <= 6) m.role = ROLE_HOLD;
    }
  }

  /** Emits a squad callout, rate limited per kind. */
  callout(events: EventBus | null, kind: CalloutKind, position: THREE.Vector3): void {
    if (!events) return;
    const left = this.calloutTimers.get(kind) ?? 0;
    if (left > 0) return;
    this.calloutTimers.set(kind, CALLOUT_COOLDOWN);
    events.emit('audio:play', {
      id: `voice_${kind}`,
      position,
      volume: 0.9,
    });
  }

  reset(): void {
    this.members.length = 0;
    this.hasContact = false;
    this.contactAge = 1e6;
    this.relay = -1;
    this.assess = 0;
    this.reporter = -1;
    this.calloutTimers.clear();
  }
}
