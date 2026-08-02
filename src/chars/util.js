import * as THREE from 'three';

/**
 * Wrap a Minifig (and anything else that needs ticking) in the Object3D that
 * scenes and the asset lab receive.
 *
 * Contract shared by every character factory in this folder:
 *   group.userData.fig     the live Minifig -- pose it, walk it, lookAt with it
 *   group.userData.update  (t, dt) => void, called once a frame
 */
export function figGroup(fig, { name, extras = [], userData = {}, gloss = {} } = {}) {
  const g = new THREE.Group();
  g.name = name || fig.root.name || 'character';
  g.add(fig.object3D);
  if (gloss !== false) softenGloss(g, gloss);
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

/*
 * The kit's ABS material carries a clearcoat (0.45) for the plastic sheen. On a
 * minifig-sized curved part that reads beautifully, but a large flat panel aimed
 * at the studio key light turns into a white mirror -- a dark brown hood came
 * back at 223,223,223. Characters therefore get their clearcoat pulled back, and
 * anything meant to be cloth loses it entirely. Materials are shared through a
 * cache so a squad of troopers still ends up with one white ABS material.
 */
const glossCache = new Map();

function tweak(src, cc, ccr, env, rough) {
  const k = `${src.uuid}|${cc}|${ccr}|${env}|${rough ?? ''}`;
  let m = glossCache.get(k);
  if (!m) {
    m = src.clone();
    m.clearcoat = cc;
    m.clearcoatRoughness = ccr;
    if ('envMapIntensity' in m) m.envMapIntensity = env;
    if (rough !== undefined) m.roughness = rough;
    m.userData = { ...m.userData, gloss: k };
    glossCache.set(k, m);
  }
  return m;
}

/** Pull the clearcoat back so flat panels stop blowing out to white. */
export function softenGloss(root, { clearcoat = 0.15, clearcoatRoughness = 0.42, env = 0.5, roughness } = {}) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const src = o.material;
    if (!('clearcoat' in src) || src.userData?.gloss) return;
    o.material = tweak(src, clearcoat, clearcoatRoughness, env, roughness);
  });
  return root;
}

/** Cloth: robes, hoods, cowls. No clearcoat at all, and rough. */
export function makeCloth(root) {
  return softenGloss(root, { clearcoat: 0, clearcoatRoughness: 1, env: 0.32, roughness: 0.92 });
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
