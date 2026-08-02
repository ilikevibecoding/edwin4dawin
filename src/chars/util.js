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
  g.add(groundFeet(fig.object3D));
  if (gloss !== false) softenGloss(g, gloss);
  Object.assign(g.userData, userData);
  g.userData.fig = fig;
  g.userData.update = (t, dt) => {
    fig.update(dt, t);
    for (const e of extras) e(t, dt);
  };
  return g;
}

const _box = new THREE.Box3();

/**
 * Drop a figure onto y = 0.
 *
 * The kit's leg is prismGeo(profile, w, 0.05), and ExtrudeGeometry grows a bevel
 * OUTWARDS from the profile, so the sole ends up 0.05 studs below the y = 0 the
 * profile was drawn at (0.054 on Vader, who is scaled 1.08). Rather than assume
 * the constant, measure the built figure and shim it: the wrapper this returns is
 * what gets parented, so scenes are still free to move both the character group
 * and fig.root without disturbing the correction.
 */
export function groundFeet(obj) {
  const lift = new THREE.Group();
  lift.name = 'ground_shim';
  obj.updateMatrixWorld(true);
  _box.setFromObject(obj);
  if (Number.isFinite(_box.min.y)) lift.position.y = -_box.min.y;
  lift.add(obj);
  return lift;
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
 * The kit's ABS material is glossy: roughness 0.34 plus a 0.45 clearcoat. On a
 * hard-edged brick that reads beautifully, but the minifig arm is an extruded
 * prism with smoothed bevel normals, so its whole front sweeps through the
 * studio key light's specular lobe and washes out -- a dark brown jawa sleeve
 * came back at 205,205,205 and an orange flight suit came back pink. Widening
 * the lobe (roughness ~0.68) drops the peak by an order of magnitude and the
 * colour comes back, at the cost of a slightly more satin plastic. Characters
 * therefore get a matte-satin finish and anything meant to be cloth loses the
 * clearcoat entirely. Materials go through a cache so a squad of troopers still
 * shares one white ABS material.
 */
const glossCache = new Map();

function tweak(src, cc, ccr, env, rough) {
  const k = `${src.uuid}|${cc}|${ccr}|${env}|${rough ?? ''}`;
  let m = glossCache.get(k);
  if (!m) {
    m = src.clone();
    m.clearcoat = cc;
    m.clearcoatRoughness = ccr;
    // never brighter than the rig asked for: makeEnv() already dialled this in
    if ('envMapIntensity' in m) m.envMapIntensity = Math.min(m.envMapIntensity, env);
    if (rough !== undefined) m.roughness = Math.max(m.roughness, rough);
    m.userData = { ...m.userData, gloss: k };
    glossCache.set(k, m);
  }
  return m;
}

/** Widen the specular lobe so bevelled limbs stop blowing out to white. */
export function softenGloss(root, { clearcoat = 0.12, clearcoatRoughness = 0.5, env = 0.3, roughness = 0.68 } = {}) {
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
  return softenGloss(root, { clearcoat: 0, clearcoatRoughness: 1, env: 0.22, roughness: 0.92 });
}

const metalCache = new Map();

/**
 * Pull a near-pure metal back to a half-metal.
 *
 * pearlGold is in METAL_COLORS, so mat() gives it metalness 0.9 and the part shows
 * almost nothing but the environment: C-3PO's flat-fronted legs mirrored the dark
 * studio backdrop at rgb(125,81,9) while his bevel-normalled arms caught the key
 * light at rgb(247,228,146) -- same colour, same material, unrecognisably
 * different. Restoring a diffuse term makes one gold read across the whole figure.
 * softenGloss cannot do this: MeshStandardMaterial has no clearcoat to soften.
 */
export function temperMetal(root, { metalness = 0.42, roughness = 0.44 } = {}) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const src = o.material;
    if (!('metalness' in src) || src.metalness < 0.5 || src.userData?.tempered) return;
    const k = `${src.uuid}|${metalness}|${roughness}`;
    let m = metalCache.get(k);
    if (!m) {
      m = src.clone();
      m.metalness = metalness;
      m.roughness = roughness;
      m.userData = { ...m.userData, tempered: k };
      metalCache.set(k, m);
    }
    o.material = m;
  });
  return root;
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
