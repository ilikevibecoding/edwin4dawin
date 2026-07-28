/**
 * A small behaviour tree.
 *
 * The tree itself is built once and shared by every agent: nodes hold no state,
 * only structure and a function. Everything mutable — which child of a sequence
 * is mid-run, how long a cooldown has left — lives in a `BTState` owned by the
 * agent and indexed by node id, so sixteen soldiers running the same tree cost
 * sixteen small typed arrays and not one object allocation per tick.
 *
 * The reason for a tree rather than a switch is legibility under change. A
 * state machine with eleven states needs up to a hundred transitions and every
 * one of them is a place for "he stood up in the open because he was reloading
 * when the grenade landed" to hide. Here priority is structural: the first
 * child of the root selector that can run, runs. Reading the tree top to bottom
 * *is* reading the priority order, and `BTState.trace` reports the exact path
 * that was taken on the last tick, so the answer to "why is he doing that" is a
 * string rather than a debugging session.
 */

export type Status = 0 | 1 | 2;
export const FAILURE: Status = 0;
export const SUCCESS: Status = 1;
export const RUNNING: Status = 2;

const MAX_DEPTH = 12;

/** Per-agent mutable state for one tree. Allocated once with the agent. */
export class BTState {
  /** Child index a composite is part-way through, or -1. */
  readonly running: Int16Array;
  /** 1 while a node's last tick returned RUNNING and it has not been abandoned. */
  readonly active: Uint8Array;
  /** General purpose per-node scalar: cooldown remaining, elapsed time. */
  readonly timer: Float32Array;
  /** Node path of the last tick, deepest first. */
  readonly trace = new Int16Array(MAX_DEPTH);
  traceDepth = 0;

  constructor(nodeCount: number) {
    this.running = new Int16Array(nodeCount).fill(-1);
    this.active = new Uint8Array(nodeCount);
    this.timer = new Float32Array(nodeCount);
  }

  reset(): void {
    this.running.fill(-1);
    this.active.fill(0);
    this.timer.fill(0);
    this.traceDepth = 0;
  }

  record(index: number): void {
    if (this.traceDepth < MAX_DEPTH) this.trace[this.traceDepth++] = index;
  }
}

export abstract class Node<T extends { bt: BTState }> {
  index = -1;
  constructor(readonly name: string) {}

  /** Implemented by each node kind. */
  protected abstract run(agent: T, dt: number): Status;

  tick(agent: T, dt: number): Status {
    const status = this.run(agent, dt);
    const state = agent.bt;
    if (status === RUNNING) {
      state.active[this.index] = 1;
      state.record(this.index);
    } else {
      state.active[this.index] = 0;
    }
    return status;
  }

  /**
   * Abandons this node so it can drop whatever it was holding.
   *
   * Gated on the node having actually been running, and that gate is
   * load-bearing: a `Guard` calls `abort` on its child on every tick its
   * condition is false, so without it the abort handler of a behaviour that
   * has never once run — "stop walking", "let go of that cover point" —
   * fires sixty times a second against whatever the agent is really doing.
   */
  abort(agent: T): void {
    const state = agent.bt;
    if (state.active[this.index] === 0) return;
    state.active[this.index] = 0;
    state.running[this.index] = -1;
    this.onAbort(agent);
  }

  /** What this node kind has to undo. Only reached for a node that was running. */
  protected onAbort(agent: T): void {
    void agent;
  }

  children(): ReadonlyArray<Node<T>> {
    return EMPTY;
  }
}

const EMPTY: ReadonlyArray<Node<never>> = [];

/* ------------------------------- composites ------------------------------- */

/** Runs children in order until one fails. Remembers where it was. */
export class Sequence<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly kids: Array<Node<T>>,
  ) {
    super(name);
  }

  children(): ReadonlyArray<Node<T>> {
    return this.kids;
  }

  protected run(agent: T, dt: number): Status {
    const state = agent.bt;
    const start = Math.max(0, state.running[this.index]);
    for (let i = start; i < this.kids.length; i++) {
      const status = this.kids[i].tick(agent, dt);
      if (status === RUNNING) {
        state.running[this.index] = i;
        return RUNNING;
      }
      if (status === FAILURE) {
        state.running[this.index] = -1;
        return FAILURE;
      }
    }
    state.running[this.index] = -1;
    return SUCCESS;
  }

  protected onAbort(agent: T): void {
    const running = agent.bt.running[this.index];
    if (running >= 0) this.kids[running].abort(agent);
  }
}

/**
 * Priority: the first child that does not fail wins. When a higher-priority
 * child takes over from a lower one, the lower one is aborted so a behaviour
 * cannot leave a claimed cover point or a half-thrown grenade behind it.
 */
export class Selector<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly kids: Array<Node<T>>,
  ) {
    super(name);
  }

  children(): ReadonlyArray<Node<T>> {
    return this.kids;
  }

  protected run(agent: T, dt: number): Status {
    const state = agent.bt;
    const previous = state.running[this.index];
    for (let i = 0; i < this.kids.length; i++) {
      const status = this.kids[i].tick(agent, dt);
      if (status === FAILURE) continue;
      if (status === RUNNING) {
        if (previous >= 0 && previous !== i) this.kids[previous].abort(agent);
        state.running[this.index] = i;
        return RUNNING;
      }
      if (previous >= 0 && previous !== i) this.kids[previous].abort(agent);
      state.running[this.index] = -1;
      return SUCCESS;
    }
    if (previous >= 0) this.kids[previous].abort(agent);
    state.running[this.index] = -1;
    return FAILURE;
  }

  protected onAbort(agent: T): void {
    const running = agent.bt.running[this.index];
    if (running >= 0) this.kids[running].abort(agent);
  }
}

/* ------------------------------- decorators ------------------------------- */

/** Refuses to run again until `seconds` have passed since the last success. */
export class Cooldown<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly seconds: number | ((agent: T) => number),
    private readonly child: Node<T>,
  ) {
    super(name);
  }

  children(): ReadonlyArray<Node<T>> {
    return [this.child];
  }

  protected run(agent: T, dt: number): Status {
    const state = agent.bt;
    if (state.timer[this.index] > 0) {
      state.timer[this.index] -= dt;
      return FAILURE;
    }
    const status = this.child.tick(agent, dt);
    if (status === SUCCESS) {
      state.timer[this.index] =
        typeof this.seconds === 'number' ? this.seconds : this.seconds(agent);
    }
    return status;
  }

  protected onAbort(agent: T): void {
    this.child.abort(agent);
  }
}

/** Runs the child only while the guard holds; aborts it the moment it stops. */
export class Guard<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly test: (agent: T) => boolean,
    private readonly child: Node<T>,
  ) {
    super(name);
  }

  children(): ReadonlyArray<Node<T>> {
    return [this.child];
  }

  protected run(agent: T, dt: number): Status {
    if (!this.test(agent)) {
      this.child.abort(agent);
      return FAILURE;
    }
    return this.child.tick(agent, dt);
  }

  protected onAbort(agent: T): void {
    this.child.abort(agent);
  }
}

/** Fails after the child has been running for longer than `seconds`. */
export class Timeout<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly seconds: number,
    private readonly child: Node<T>,
  ) {
    super(name);
  }

  children(): ReadonlyArray<Node<T>> {
    return [this.child];
  }

  protected run(agent: T, dt: number): Status {
    const state = agent.bt;
    const status = this.child.tick(agent, dt);
    if (status !== RUNNING) {
      state.timer[this.index] = 0;
      return status;
    }
    state.timer[this.index] += dt;
    if (state.timer[this.index] >= this.seconds) {
      this.child.abort(agent);
      state.timer[this.index] = 0;
      return FAILURE;
    }
    return RUNNING;
  }

  protected onAbort(agent: T): void {
    agent.bt.timer[this.index] = 0;
    this.child.abort(agent);
  }
}

/* --------------------------------- leaves --------------------------------- */

export class Condition<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly test: (agent: T) => boolean,
  ) {
    super(name);
  }

  protected run(agent: T): Status {
    return this.test(agent) ? SUCCESS : FAILURE;
  }
}

export class Action<T extends { bt: BTState }> extends Node<T> {
  constructor(
    name: string,
    private readonly fn: (agent: T, dt: number) => Status,
    private readonly abandon?: (agent: T) => void,
  ) {
    super(name);
  }

  protected run(agent: T, dt: number): Status {
    return this.fn(agent, dt);
  }

  protected onAbort(agent: T): void {
    this.abandon?.(agent);
  }
}

/* ---------------------------------- tree ---------------------------------- */

export class BehaviorTree<T extends { bt: BTState }> {
  readonly nodes: Array<Node<T>> = [];

  constructor(readonly root: Node<T>) {
    this.assign(root);
  }

  private assign(node: Node<T>): void {
    node.index = this.nodes.length;
    this.nodes.push(node);
    for (const child of node.children()) this.assign(child);
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  makeState(): BTState {
    return new BTState(this.nodes.length);
  }

  tick(agent: T, dt: number): Status {
    agent.bt.traceDepth = 0;
    return this.root.tick(agent, dt);
  }

  /** Human-readable path of the last tick: "combat/cover/peek-fire". */
  trace(agent: T): string {
    const state = agent.bt;
    let out = '';
    for (let i = state.traceDepth - 1; i >= 0; i--) {
      out += this.nodes[state.trace[i]].name;
      if (i > 0) out += '/';
    }
    return out;
  }

  /** Deepest running node's name, which is the state an observer would name. */
  leaf(agent: T): string {
    const state = agent.bt;
    return state.traceDepth > 0 ? this.nodes[state.trace[0]].name : 'idle';
  }
}
