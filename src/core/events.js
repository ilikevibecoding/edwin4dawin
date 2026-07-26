// Minimal event emitter shared across systems.
export class Emitter {
  constructor() { this._map = new Map(); }
  on(name, fn) {
    if (!this._map.has(name)) this._map.set(name, new Set());
    this._map.get(name).add(fn);
    return () => this.off(name, fn);
  }
  once(name, fn) {
    const off = this.on(name, (...a) => { off(); fn(...a); });
    return off;
  }
  off(name, fn) { this._map.get(name)?.delete(fn); }
  emit(name, ...args) {
    const set = this._map.get(name);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(...args); } catch (e) { console.error(`[events] handler for "${name}" failed`, e); }
    }
  }
  clear() { this._map.clear(); }
}

export const bus = new Emitter();
