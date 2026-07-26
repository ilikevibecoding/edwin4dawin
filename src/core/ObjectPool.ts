/**
 * Fixed-capacity object pool. Allocation-free in steady state, which matters a
 * lot for particles, decals, tracers and audio voices where hundreds of objects
 * churn every second and a GC pause reads as a stutter.
 */
export class ObjectPool<T> {
  private readonly free: T[] = [];
  private readonly liveSet = new Set<T>();
  private readonly factory: () => T;
  private readonly reset: ((item: T) => void) | undefined;
  private readonly onEvict: ((item: T) => void) | undefined;
  readonly capacity: number;
  private created = 0;

  constructor(opts: {
    factory: () => T;
    capacity: number;
    prewarm?: number;
    reset?: (item: T) => void;
    onEvict?: (item: T) => void;
  }) {
    this.factory = opts.factory;
    this.capacity = opts.capacity;
    this.reset = opts.reset;
    this.onEvict = opts.onEvict;
    const warm = Math.min(opts.prewarm ?? 0, opts.capacity);
    for (let i = 0; i < warm; i++) {
      this.free.push(this.factory());
      this.created++;
    }
  }

  get liveCount(): number {
    return this.liveSet.size;
  }

  get freeCount(): number {
    return this.free.length;
  }

  /** Acquire an item, or null when the pool is exhausted. */
  acquire(): T | null {
    let item = this.free.pop();
    if (!item) {
      if (this.created >= this.capacity) return null;
      item = this.factory();
      this.created++;
    }
    this.liveSet.add(item);
    return item;
  }

  /**
   * Acquire, recycling the oldest live item when exhausted. Used where dropping
   * the effect is worse than popping an old one (muzzle flashes, impact decals).
   */
  acquireForced(): T {
    const item = this.acquire();
    if (item) return item;
    const oldest = this.liveSet.values().next().value as T;
    this.release(oldest);
    return this.acquire()!;
  }

  release(item: T): void {
    if (!this.liveSet.delete(item)) return;
    this.reset?.(item);
    this.free.push(item);
  }

  releaseAll(): void {
    for (const item of this.liveSet) {
      this.reset?.(item);
      this.free.push(item);
    }
    this.liveSet.clear();
  }

  forEachLive(fn: (item: T) => void): void {
    for (const item of this.liveSet) fn(item);
  }

  dispose(): void {
    if (this.onEvict) {
      for (const item of this.liveSet) this.onEvict(item);
      for (const item of this.free) this.onEvict(item);
    }
    this.liveSet.clear();
    this.free.length = 0;
    this.created = 0;
  }
}

/**
 * Dense array of structs backed by typed arrays, iterated with a swap-remove
 * free list. Preferred over ObjectPool for particle-scale counts where even
 * object headers cost measurable memory bandwidth.
 */
export class SoAPool {
  readonly capacity: number;
  /** Number of currently-active slots; active indices are always [0, count). */
  count = 0;
  private readonly slotOf: Int32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.slotOf = new Int32Array(capacity);
    for (let i = 0; i < capacity; i++) this.slotOf[i] = i;
  }

  /** Returns the index to write to, or -1 if full. */
  alloc(): number {
    if (this.count >= this.capacity) return -1;
    return this.count++;
  }

  /**
   * Free the slot at `index` by swapping the last active slot into it.
   * Returns the index that was moved (or -1), so callers can fix up any
   * external references. Iterate backwards when freeing during a loop.
   */
  free(index: number): number {
    if (index < 0 || index >= this.count) return -1;
    const last = --this.count;
    if (index !== last) return last;
    return -1;
  }

  clear(): void {
    this.count = 0;
  }
}
