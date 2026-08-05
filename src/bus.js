// Minimal event bus used to decouple gameplay modules.
export class Bus {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, []);
    this.map.get(evt).push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const arr = this.map.get(evt);
    if (arr) { const i = arr.indexOf(fn); if (i >= 0) arr.splice(i, 1); }
  }
  emit(evt, payload) {
    const arr = this.map.get(evt);
    if (arr) for (const fn of arr.slice()) fn(payload);
  }
}
