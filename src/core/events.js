// Minimal synchronous event bus shared by gameplay systems.
export class EventBus {
  constructor() { this.map = new Map(); }
  on(type, fn) {
    let set = this.map.get(type);
    if (!set) { set = new Set(); this.map.set(type, set); }
    set.add(fn);
    return () => set.delete(fn);
  }
  emit(type, payload) {
    const set = this.map.get(type);
    if (set) for (const fn of [...set]) fn(payload);
  }
  clear() { this.map.clear(); }
}
export const bus = new EventBus();
