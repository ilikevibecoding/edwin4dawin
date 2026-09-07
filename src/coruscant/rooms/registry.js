// Room template registry (kept separate from index.js so the template files can import it without a cycle).
export const ROOMS = {};

export function defRoom(name, opts, fn) {
  ROOMS[name] = { name, minW: opts.minW ?? 4, minD: opts.minD ?? 4, maxW: opts.maxW ?? 99, maxD: opts.maxD ?? 99, tags: opts.tags || [], special: !!opts.special, weight: opts.weight ?? 1, fn };
  return ROOMS[name];
}

// a pool's templates (names resolved, unknown and special ones dropped), remembered per pool array: the planner
// picks a room for every one of a tower's hundred-odd rooms from the same few pools
const RESOLVED = new WeakMap();
function templatesOf(pool) {
  let list = RESOLVED.get(pool);
  if (!list) {
    list = [];
    for (const name of pool) { const t = ROOMS[name]; if (t && !t.special) list.push(t); }
    RESOLVED.set(pool, list);
  }
  return list;
}

// Picks a template from `pool` (names) that fits a w x d interior, discouraging repeats via `used` counts.
export function pickRoom(pool, w, d, rng, used = null) {
  let total = 0;
  const cands = [], weights = [];
  for (const t of templatesOf(pool)) {
    if (w < t.minW || d < t.minD || w > t.maxW || d > t.maxD) continue;
    const wgt = t.weight / (1 + 2 * (used ? (used.get(t.name) || 0) : 0));
    cands.push(t); weights.push(wgt); total += wgt;
  }
  if (!cands.length) return ROOMS.storage;
  let r = rng.next() * total;
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
  return cands[cands.length - 1];
}
