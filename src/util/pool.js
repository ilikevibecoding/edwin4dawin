/**
 * Object pooling.
 *
 * Every transient entity (missiles, puffs, sparks, debris, decals, explosions)
 * comes from a pool so steady-state play performs no allocations and triggers
 * no garbage collection spikes mid-engagement.
 */

export class Pool {
  /**
   * @param {() => any} factory      creates a fresh item (called at most `max` times)
   * @param {(item:any) => void} reset  returns an item to a neutral state
   * @param {number} prealloc        how many to build up front
   * @param {number} max             hard ceiling; acquire() returns null beyond it
   */
  constructor(factory, reset, prealloc = 0, max = 4096) {
    this.factory = factory;
    this.resetFn = reset;
    this.max = max;
    this.free = [];
    this.live = [];
    this.created = 0;
    for (let i = 0; i < prealloc; i++) {
      this.free.push(this.factory());
      this.created++;
    }
  }

  acquire() {
    let item = this.free.pop();
    if (!item) {
      if (this.created >= this.max) return null;
      item = this.factory();
      this.created++;
    }
    this.live.push(item);
    return item;
  }

  release(item) {
    const i = this.live.indexOf(item);
    if (i >= 0) this.live.splice(i, 1);
    if (this.resetFn) this.resetFn(item);
    this.free.push(item);
  }

  /** Release everything currently live (scenario reset). */
  releaseAll() {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const item = this.live[i];
      if (this.resetFn) this.resetFn(item);
      this.free.push(item);
    }
    this.live.length = 0;
  }

  /**
   * Iterate live items, releasing any for which `fn` returns true.
   * Backwards iteration keeps removal safe.
   */
  sweep(fn) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const item = this.live[i];
      if (fn(item, i)) {
        this.live.splice(i, 1);
        if (this.resetFn) this.resetFn(item);
        this.free.push(item);
      }
    }
  }

  get activeCount() { return this.live.length; }
}

/**
 * Fixed-capacity ring of struct-of-arrays particle slots.
 * Used by the instanced particle systems where per-particle objects would be
 * far too much overhead.
 */
export class SlotRing {
  constructor(capacity) {
    this.capacity = capacity;
    this.alive = new Uint8Array(capacity);
    this.cursor = 0;
    this.count = 0;
  }

  /**
   * Claim a slot, recycling the oldest if the ring is saturated.
   *
   * The scan is bounded: an owner that expires its slots lazily can leave the
   * ring looking full for a while, and walking the whole capacity on every one
   * of a few hundred emissions per frame costs far more than reusing a slot
   * slightly early.
   */
  claim(maxScan = 64) {
    const tries = Math.min(this.capacity, maxScan);
    for (let n = 0; n < tries; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      if (!this.alive[i]) {
        this.alive[i] = 1;
        this.count++;
        return i;
      }
    }
    // Saturated: steal the slot at the cursor (oldest by construction).
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    return i;
  }

  kill(i) {
    if (this.alive[i]) { this.alive[i] = 0; this.count--; }
  }

  clear() {
    this.alive.fill(0);
    this.count = 0;
    this.cursor = 0;
  }
}
