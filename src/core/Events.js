/**
 * Minimal synchronous event bus used for decoupling game systems.
 * See docs/ARCHITECTURE.md for the canonical list of event names & payloads.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(name, fn) {
    if (!this._listeners.has(name)) this._listeners.set(name, new Set());
    this._listeners.get(name).add(fn);
    return () => this.off(name, fn);
  }

  once(name, fn) {
    const off = this.on(name, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off(name, fn) {
    this._listeners.get(name)?.delete(fn);
  }

  emit(name, payload) {
    const set = this._listeners.get(name);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] listener for "${name}" threw`, err);
      }
    }
  }
}
