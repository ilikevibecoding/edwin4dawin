/** Seeded RNG (mulberry32) for deterministic screenshots/tests. */
let state = 0x9e3779b9;

export function seed(s) { state = s >>> 0; }

export function rand() {
  state |= 0; state = (state + 0x6D2B79F5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randRange(min, max) { return min + rand() * (max - min); }
export function randInt(min, max) { return Math.floor(randRange(min, max + 1)); }
export function randPick(arr) { return arr[Math.floor(rand() * arr.length)]; }
export function randSpread(spread) { return (rand() - 0.5) * 2 * spread; }
