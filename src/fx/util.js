import * as THREE from 'three';

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randSign = () => (Math.random() < 0.5 ? -1 : 1);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** Random unit vector inside a cone (half-angle `spread` radians) around `dir`. Writes into `out`. */
export function randomCone(dir, spread, out) {
  const z = Math.cos(Math.random() * spread);
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  _v.set(Math.cos(a) * r, Math.sin(a) * r, z);
  _q.setFromUnitVectors(Z_AXIS, dir);
  return out.copy(_v).applyQuaternion(_q);
}

/** Random unit vector in the hemisphere around `normal`. */
export function randomHemisphere(normal, out) {
  out.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  while (out.lengthSq() < 0.01 || out.lengthSq() > 1) out.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  out.normalize();
  if (out.dot(normal) < 0) out.negate();
  return out;
}

export const Z_AXIS = new THREE.Vector3(0, 0, 1);
export const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * The first-person view model is drawn by `render.weaponCamera` with its own (narrower) FOV, so a world
 * point at the rifle muzzle does not appear on screen where the barrel is drawn. This maps a view-model
 * world point to the main-camera world point that lands on the same pixel at the same view depth —
 * use it for anything that leaves the view model into the world (tracer start, muzzle smoke, casings).
 */
export function viewModelToWorld(game, point, out) {
  const cam = game.camera;
  const wcam = game.render?.weaponCamera;
  if (!wcam) return out.copy(point);
  out.copy(point).applyMatrix4(cam.matrixWorldInverse);
  const k = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5) / Math.tan(THREE.MathUtils.degToRad(wcam.fov) * 0.5);
  out.x *= k;
  out.y *= k;
  return out.applyMatrix4(cam.matrixWorld);
}

/** Ground height helper with a safe fallback when the world does not implement it. */
export function groundHeight(game, x, z, fallback = 0) {
  const w = game.world;
  if (w && typeof w.getGroundHeight === 'function') {
    const h = w.getGroundHeight(x, z);
    if (Number.isFinite(h)) return h;
  }
  return fallback;
}
