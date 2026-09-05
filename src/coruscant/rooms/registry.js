// Room template registry (kept separate from index.js so the template files can import it without a cycle).
export const ROOMS = {};

export function defRoom(name, opts, fn) {
  ROOMS[name] = { name, minW: opts.minW ?? 4, minD: opts.minD ?? 4, maxW: opts.maxW ?? 99, maxD: opts.maxD ?? 99, tags: opts.tags || [], special: !!opts.special, weight: opts.weight ?? 1, fn };
  return ROOMS[name];
}

// Picks a template from `pool` (names) that fits a w x d interior, discouraging repeats via `used` counts.
export function pickRoom(pool, w, d, rng, used = null) {
  let total = 0;
  const cands = [];
  for (const name of pool) {
    const t = ROOMS[name];
    if (!t || t.special) continue;
    if (w < t.minW || d < t.minD || w > t.maxW || d > t.maxD) continue;
    const wgt = t.weight / (1 + 2 * (used ? (used.get(name) || 0) : 0));
    cands.push([t, wgt]); total += wgt;
  }
  if (!cands.length) return ROOMS.storage;
  let r = rng.next() * total;
  for (const [t, wgt] of cands) { r -= wgt; if (r <= 0) return t; }
  return cands[cands.length - 1][0];
}
