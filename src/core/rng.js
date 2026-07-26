// Deterministic seedable RNG (mulberry32). All gameplay randomness must flow through a mission RNG.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    gauss: () => (next() + next() + next() + next() - 2) / 2, // approx normal, [-2..2]-ish
  };
}
// Non-mission cosmetic randomness (VFX jitter etc.) may use this shared stream.
export const cosmeticRng = makeRng(0xC0FFEE);
