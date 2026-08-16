// Deterministic seeded RNG streams. NO Math.random() anywhere in the project.

let GLOBAL_SEED = 1337;

export function setGlobalSeed(s) { GLOBAL_SEED = s | 0; }
export function getGlobalSeed() { return GLOBAL_SEED; }

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(name) {
  let a = (hashString(String(name)) ^ Math.imul(GLOBAL_SEED, 0x9e3779b9)) >>> 0;
  const rng = function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (lo, hi) => lo + (hi - lo) * rng();
  rng.int = (lo, hi) => Math.floor(rng.range(lo, hi + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  rng.sign = () => (rng() < 0.5 ? -1 : 1);
  rng.gauss = () => (rng() + rng() + rng() + rng() - 2) / 2;
  return rng;
}
