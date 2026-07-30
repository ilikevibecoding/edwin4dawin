/**
 * Re-entrancy gate for the Rapier world.
 *
 * Rapier's bindings hold a borrow on the body and collider sets for the whole
 * of a scene query, and everything reached from inside one — a filter
 * predicate, an `intersectionsWith*` visitor, or simply the code that raised
 * the query and has not returned from it yet — runs while that borrow is
 * outstanding. Two different things go wrong from in there, both measured
 * against 0.19.3 rather than assumed:
 *
 *   - a body or collider mutation raises "recursive use of an object detected"
 *     inside the binding, which discards it. Nothing reaches the caller and
 *     the write silently does not happen;
 *   - `world.step()` from in there leaves that world permanently unusable:
 *     every subsequent call through it raises the same error forever. A
 *     replacement `World` is unaffected, which is what makes recovery possible
 *     at all, but the one you had is gone.
 *
 * `enter()`/`leave()` bracket every call this module makes into Rapier, and
 * `defer()` holds a mutation back until the outermost of those has returned.
 * `applyRadialImpulse` already collected body handles during its query and
 * pushed the impulses afterwards by hand; this is that discipline generalised,
 * so no caller has to remember it.
 *
 * `busy` therefore reads as "an outside caller must not touch the world right
 * now". Creation is the one operation that cannot honour it — a handle has to
 * be returned synchronously — so the module never hands control to game code
 * while the gate is held, and no Rapier callback it registers calls out.
 */

/** Deferred work is drained in FIFO order; the cap only exists to bound a bug. */
const MAX_DRAIN = 8192;

export class RapierGate {
  /** Running total of mutations that had to wait, surfaced in the stats block. */
  deferrals = 0;

  private depth = 0;
  private readonly queue: Array<() => void> = [];
  private cursor = 0;
  private draining = false;
  private reported = false;

  /** True while a Rapier call this module made is still on the stack. */
  get busy(): boolean {
    return this.depth > 0;
  }

  /**
   * Mark a call into Rapier. Always paired with `leave()` in a `finally`, and
   * deliberately not a closure-taking helper: the query paths run hundreds of
   * times per frame and must not allocate.
   */
  enter(): void {
    this.depth++;
  }

  leave(): void {
    if (this.depth > 0) this.depth--;
    if (this.depth === 0 && this.cursor < this.queue.length) this.drain();
  }

  /** Run `fn` now if nothing is borrowing the world, otherwise straight after. */
  defer(fn: () => void): void {
    if (this.depth === 0) {
      fn();
      return;
    }
    this.deferrals++;
    this.queue.push(fn);
  }

  /** Drop pending work and any outstanding depth; used when the world is replaced. */
  reset(): void {
    this.queue.length = 0;
    this.cursor = 0;
    this.depth = 0;
    this.draining = false;
    // Re-arm the one-shot report: a failure in the new world is news again.
    this.reported = false;
  }

  private drain(): void {
    if (this.draining) return;
    this.draining = true;
    try {
      let guard = 0;
      while (this.cursor < this.queue.length && guard++ < MAX_DRAIN) {
        const task = this.queue[this.cursor++];
        try {
          task();
        } catch (err) {
          // A deferred mutation throwing must not surface as a failure of the
          // query that happened to be on the stack when it was queued.
          if (!this.reported) {
            this.reported = true;
            console.error('[physics] deferred mutation threw', err);
          }
        }
      }
      this.queue.length = 0;
      this.cursor = 0;
    } finally {
      this.draining = false;
    }
  }
}

/** One Rapier instance per page means one gate; plumbing it around buys nothing. */
export const gate = new RapierGate();
