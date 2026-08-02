import * as THREE from 'three';

/**
 * Wrap a Minifig (and anything else that needs ticking) in the Object3D that
 * scenes and the asset lab receive.
 *
 * Contract shared by every character factory in this folder:
 *   group.userData.fig     the live Minifig -- pose it, walk it, lookAt with it
 *   group.userData.update  (t, dt) => void, called once a frame
 */
export function figGroup(fig, { name, extras = [], userData = {} } = {}) {
  const g = new THREE.Group();
  g.name = name || fig.root.name || 'character';
  g.add(fig.object3D);
  Object.assign(g.userData, userData);
  g.userData.fig = fig;
  g.userData.update = (t, dt) => {
    fig.update(dt, t);
    for (const e of extras) e(t, dt);
  };
  return g;
}

/**
 * Pitch a prop held in a fist. `pitch` is the total rotation of the prop about
 * the torso X axis, so it does not change when the arm pose does:
 *   0 = the prop's +Y points straight up
 *   +PI/2 = +Y points forward (+Z), -PI/2 = +Y points backward
 * Blasters are authored barrel-down, so barrel-forward is pitch = -PI/2.
 * Call this AFTER setPose().
 */
export function setHeldPitch(fig, side, obj, pitch) {
  obj.rotation.x = pitch - fig.arms[side].rotation.x;
  return obj;
}

/** Query-string friendly boolean: `--pilot=1`, `--pilot`, `{ pilot: true }`. */
export function flag(v, dflt = false) {
  if (v === undefined || v === null || v === '') return dflt;
  if (typeof v === 'string') return !/^(0|false|no|off)$/i.test(v);
  return !!v;
}

/** Query-string friendly number. */
export function num(v, dflt) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : dflt;
}

/** Triangle count of a subtree -- used to keep characters inside budget. */
export function triCount(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const count = g.index ? g.index.count : g.attributes.position.count;
    n += (count / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return Math.round(n);
}
