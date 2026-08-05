/**
 * Minimal object pool.
 *
 * Everything transient in the game (missiles, puffs, sparks, debris, decals,
 * explosions) is drawn from a pool so no allocation happens during play and the
 * garbage collector never causes a hitch mid-engagement.
 */
export class Pool {
  constructor(factory, size, reset = null) {
    this.factory = factory;
    this.reset = reset;
    this.items = new Array(size);
    this.free = new Array(size);
    for (let i = 0; i < size; i++) {
      const item = factory(i);
      item.__poolIndex = i;
      item.__active = false;
      this.items[i] = item;
      this.free[i] = i;
    }
    this.active = [];
  }

  get capacity() {
    return this.items.length;
  }

  get activeCount() {
    return this.active.length;
  }

  acquire() {
    let idx;
    if (this.free.length > 0) {
      idx = this.free.pop();
    } else {
      // Recycle the oldest live item rather than growing without bound.
      const oldest = this.active.shift();
      if (oldest === undefined) return null;
      idx = oldest;
    }
    const item = this.items[idx];
    item.__active = true;
    if (this.reset) this.reset(item);
    this.active.push(idx);
    return item;
  }

  release(item) {
    if (!item.__active) return;
    item.__active = false;
    const at = this.active.indexOf(item.__poolIndex);
    if (at >= 0) this.active.splice(at, 1);
    this.free.push(item.__poolIndex);
  }

  releaseAll() {
    for (const idx of this.active.slice()) this.release(this.items[idx]);
  }

  forEachActive(fn) {
    // Iterate over a snapshot: callbacks are allowed to release items.
    const snapshot = this.active.slice();
    for (let i = 0; i < snapshot.length; i++) fn(this.items[snapshot[i]]);
  }
}

/**
 * A ring buffer of GPU particle slots. Unlike `Pool` this hands out plain
 * indices into typed arrays, which is what the shader-driven particle systems
 * want.
 */
export class SlotRing {
  constructor(size) {
    this.size = size;
    this.head = 0;
    this.count = 0;
    this.alive = new Uint8Array(size);
  }

  next() {
    const i = this.head;
    this.head = (this.head + 1) % this.size;
    if (!this.alive[i]) this.count++;
    this.alive[i] = 1;
    return i;
  }

  kill(i) {
    if (this.alive[i]) {
      this.alive[i] = 0;
      this.count--;
    }
  }

  clear() {
    this.alive.fill(0);
    this.count = 0;
    this.head = 0;
  }
}
