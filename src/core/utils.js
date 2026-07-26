import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) — the whole world generation is seeded so
// screenshots are reproducible for the visual-review pipeline.
// ---------------------------------------------------------------------------
export function makeRNG(seed = 1337) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (min, max) => min + rng() * (max - min);
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

export const worldRNG = makeRNG(20260726);

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Shared scratch vectors to avoid GC pressure in hot loops
export const _v1 = new THREE.Vector3();
export const _v2 = new THREE.Vector3();
export const _v3 = new THREE.Vector3();
export const _q1 = new THREE.Quaternion();
export const _m1 = new THREE.Matrix4();

// URL params drive deterministic screenshot states
export const urlParams = new URLSearchParams(window.location.search);
export const SHOT_MODE = urlParams.has('shot');

export function getParamFloat(name, def) {
  const v = urlParams.get(name);
  return v === null ? def : parseFloat(v);
}
export function getParamStr(name, def) {
  const v = urlParams.get(name);
  return v === null ? def : v;
}
