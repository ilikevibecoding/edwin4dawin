// Game-wide event bus (game.events). Systems that must not import each other - the economy, the Senate, the
// population, the factions and the surprise events - talk through named events instead:
//
//   game.events.on('economy:transfer', (t) => ...);     // returns an unsubscribe function
//   game.events.once('senate:result', (r) => ...);
//   game.events.emit('npc:trade', npc, purpose);
//
// Listeners run synchronously in subscription order; a throwing listener is logged and skipped so one system's
// bug cannot silence the others. Event names are `<system>:<event>`. The bus keeps a short ring of recent events
// (`recent()`) for the admin panel and for tests that assert "this happened after that".
export class EventBus {
  constructor(historySize = 200) {
    this.listeners = new Map();
    this.history = [];
    this.historySize = historySize;
    this.seq = 0;
  }

  on(name, fn) {
    if (typeof fn !== 'function') throw new Error('EventBus.on: listener must be a function');
    let set = this.listeners.get(name);
    if (!set) { set = new Set(); this.listeners.set(name, set); }
    set.add(fn);
    return () => this.off(name, fn);
  }

  once(name, fn) {
    const off = this.on(name, (...args) => { off(); fn(...args); });
    return off;
  }

  off(name, fn) {
    const set = this.listeners.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this.listeners.delete(name);
  }

  // returns the number of listeners that completed without throwing
  emit(name, ...args) {
    this.seq++;
    if (this.historySize > 0) {
      this.history.push({ seq: this.seq, name, args, at: typeof performance !== 'undefined' ? performance.now() : Date.now() });
      if (this.history.length > this.historySize) this.history.splice(0, this.history.length - this.historySize);
    }
    const set = this.listeners.get(name);
    if (!set || set.size === 0) return 0;
    let n = 0;
    for (const fn of Array.from(set)) {
      try { fn(...args); n++; } catch (e) { console.error(`[events] listener for ${name} threw`, e); }
    }
    return n;
  }

  count(name) { const set = this.listeners.get(name); return set ? set.size : 0; }

  recent(prefix = null, limit = 50) {
    const out = prefix ? this.history.filter((h) => h.name.startsWith(prefix)) : this.history.slice();
    return out.slice(-limit);
  }

  clear() { this.listeners.clear(); this.history.length = 0; }
}
