/**
 * Deterministic pseudo-random number generation.
 *
 * Everything that affects gameplay or procedural asset creation draws from a
 * seeded generator so that Playwright runs, asset galleries and screenshot
 * matrices reproduce byte-identical results between sessions.
 */

/** mulberry32 - small, fast, good enough distribution for content generation. */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const fn = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.range = (min, max) => min + fn() * (max - min);
  fn.int = (min, max) => Math.floor(min + fn() * (max - min + 1));
  fn.pick = (arr) => arr[Math.floor(fn() * arr.length) % arr.length];
  fn.chance = (p) => fn() < p;
  fn.sign = () => (fn() < 0.5 ? -1 : 1);
  fn.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(fn() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return fn;
}

/** Stable 32-bit hash of a string, used to derive per-asset seeds from asset IDs. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Convenience: a generator seeded deterministically from a string key. */
export function rngFor(key) {
  return makeRng(hashString(key));
}

/** Global gameplay RNG. Reseeded on every mission restart for clean retries. */
export const gameplayRng = { current: makeRng(0xc0ffee) };

export function reseedGameplay(seed) {
  gameplayRng.current = makeRng(seed >>> 0);
}

export function grand() {
  return gameplayRng.current();
}
