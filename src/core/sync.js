// Network-friendly state snapshots. Nothing here talks to a network yet; it defines the compact,
// deterministic state every moving thing exposes (doors, turbolifts, fighter traffic, player) so a
// future multiplayer layer can replicate it without touching the simulation code.
export class SyncRegistry {
  constructor() {
    this.sources = new Map(); // name -> { getState(), applyState(s) }
    this.seq = 0;
  }
  register(name, source) {
    this.sources.set(name, source);
  }
  // Full snapshot (call at ~10 Hz; every entry is tiny)
  snapshot() {
    const out = { seq: ++this.seq, t: performance.now(), s: {} };
    for (const [name, src] of this.sources) out.s[name] = src.getState();
    return out;
  }
  apply(snap) {
    for (const [name, st] of Object.entries(snap.s || {})) {
      const src = this.sources.get(name);
      if (src && src.applyState) src.applyState(st);
    }
  }
  // Byte estimate of one snapshot (for budgeting)
  size() {
    return JSON.stringify(this.snapshot()).length;
  }
}
