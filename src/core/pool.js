// Generic fixed-capacity object pool. Every transient entity in the game
// (missiles, puffs, sparks, debris, decals, explosions, flares) is allocated
// once up front and recycled, so a saturation raid never triggers GC hitches.

export class Pool {
  /**
   * @param {number} capacity maximum simultaneously live items
   * @param {() => any} factory builds one item
   * @param {(item:any) => void} [reset] called when an item is released
   */
  constructor(capacity, factory, reset) {
    this.capacity = capacity;
    this.factory = factory;
    this.resetFn = reset;
    this.items = new Array(capacity);
    this.free = new Array(capacity);
    this.active = [];
    for (let i = 0; i < capacity; i++) {
      const item = factory(i);
      item.__poolIndex = i;
      item.__live = false;
      this.items[i] = item;
      this.free[i] = item;
    }
  }

  get liveCount() {
    return this.active.length;
  }

  acquire() {
    const item = this.free.pop();
    if (!item) return null;
    item.__live = true;
    this.active.push(item);
    return item;
  }

  release(item) {
    if (!item || !item.__live) return;
    item.__live = false;
    const idx = this.active.indexOf(item);
    if (idx >= 0) this.active.splice(idx, 1);
    if (this.resetFn) this.resetFn(item);
    this.free.push(item);
  }

  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(this.active[i]);
  }

  /** Iterate live items backwards so callbacks can safely release. */
  forEachLive(fn) {
    for (let i = this.active.length - 1; i >= 0; i--) fn(this.active[i], i);
  }
}
