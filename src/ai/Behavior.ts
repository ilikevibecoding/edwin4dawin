/**
 * The state machine.
 *
 * Ten states, one active at a time, each a small module in `states/`. Two rules
 * keep it honest.
 *
 * **States decide, they do not act.** A state's update writes intent onto the
 * agent — a destination, a gait, whether the weapon is up, whether firing is
 * allowed — and returns the state it thinks should run next. Everything that has
 * to happen smoothly (steering, turning, animation, the aim solver) runs every
 * frame in `Enemy.update` regardless. That separation is what lets behaviour tick
 * at 7 Hz on a distant agent while its walk still looks like a walk, and it means
 * a state transition can never drop a frame of movement.
 *
 * **Interruptions are handled here, not in ten places.** Death and suppression
 * pre-empt whatever was running, so no state has to remember to check for them.
 *
 * The scratch slots (`timer`, `phase`, `flag`, `point`) belong to whichever state
 * is current and are cleared on every transition. They exist so that a state can
 * hold a countdown or a destination without every agent carrying a field for
 * every state it is not in.
 */
import * as THREE from 'three';
import type { AIState } from '../core/Contracts';
import type { Blackboard } from './Blackboard';
import type { Enemy } from './Enemy';
import type { AnimQuality } from './model/Animator';
import { STATES } from './states';

export interface AIStateHandler {
  readonly id: AIState;
  enter?(self: Enemy, bb: Blackboard): void;
  /** Returns the next state, or null to stay. */
  update(self: Enemy, bb: Blackboard, dt: number): AIState | null;
  exit?(self: Enemy, bb: Blackboard): void;
}

/** Seconds between decisions at each animation quality tier. */
const INTERVAL: readonly number[] = [0, 0.06, 0.15];

export class Behavior {
  state: AIState = 'idle';
  previous: AIState = 'idle';
  timeInState = 0;

  /** Per-state scratch. Cleared on every transition. */
  timer = 0;
  phase = 0;
  flag = false;
  readonly point = new THREE.Vector3();

  private handler: AIStateHandler = STATES.idle;
  private entered = false;
  private accum = 0;

  reset(): void {
    this.state = 'idle';
    this.previous = 'idle';
    this.handler = STATES.idle;
    this.timeInState = 0;
    this.entered = false;
    this.accum = 0;
    this.clearScratch();
  }

  update(self: Enemy, bb: Blackboard, dt: number, quality: AnimQuality): void {
    this.timeInState += dt;
    this.accum += dt;
    if (this.accum < INTERVAL[quality]) return;
    const step = this.accum;
    this.accum = 0;

    if (!this.entered) {
      this.entered = true;
      this.handler.enter?.(self, bb);
    }

    if (this.state !== 'dead') {
      if (!self.isAlive) {
        this.change(self, bb, 'dead');
        return;
      }
      // Being shot at overrides the plan. Not during a reload, because an agent
      // that abandons a half-finished magazine change never finishes one.
      if (self.pinned && this.state !== 'suppressed' && this.state !== 'reload') {
        this.change(self, bb, 'suppressed');
        return;
      }
    }

    const next = this.handler.update(self, bb, step);
    if (next && next !== this.state) this.change(self, bb, next);
  }

  change(self: Enemy, bb: Blackboard, next: AIState): void {
    this.handler.exit?.(self, bb);
    this.previous = this.state;
    this.state = next;
    this.handler = STATES[next];
    this.timeInState = 0;
    this.entered = true;
    this.clearScratch();
    this.handler.enter?.(self, bb);
  }

  /** Used for transitions the agent does not get a say in, i.e. dying. */
  force(self: Enemy, bb: Blackboard, next: AIState): void {
    this.change(self, bb, next);
    this.accum = 0;
  }

  private clearScratch(): void {
    this.timer = 0;
    this.phase = 0;
    this.flag = false;
    this.point.set(0, 0, 0);
  }
}
