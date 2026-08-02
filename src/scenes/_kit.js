import * as THREE from 'three';
import { models } from '../registry.js';
import { makeEnv, lightingRig } from '../engine/lighting.js';
import { C } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { boxGeo } from '../lego/parts.js';

// Every asset module self-registers on import.
import '../ships/index.js';
import '../chars/index.js';
import '../sets/index.js';
import '../props/index.js';

/**
 * Fetch a registered model, or a clearly-labelled stand-in if that asset does
 * not exist yet. Scenes can be written and timed before every model lands.
 */
export async function tryMake(id, opts = {}, placeholder = {}) {
  const entry = models.get(id);
  if (entry) {
    try {
      const o = await entry.factory(opts);
      const obj = o?.isObject3D ? o : (o?.object3D || o?.root);
      if (obj) { obj.userData.modelId = id; return obj; }
    } catch (e) {
      console.warn(`[scene] model "${id}" failed to build:`, e.message);
    }
  }
  console.warn(`[scene] missing model "${id}" — using placeholder`);
  const [w, h, d] = placeholder.size || [8, 3, 20];
  const g = new THREE.Group();
  const m = new THREE.Mesh(boxGeo(w, h, d, 0.1), mat(placeholder.color ?? C.magenta));
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  g.userData.placeholder = true;
  g.userData.modelId = id;
  g.userData.nodes = {};
  return g;
}

/** Standard scene environment setups. */
export function setupScene(ctx, kind, opts = {}) {
  const { scene, renderer } = ctx;
  makeEnv(renderer, opts.env || kind, opts.envIntensity ?? 0.5);
  const rig = lightingRig(kind, opts);
  scene.add(rig);
  if (opts.background !== undefined) {
    scene.background = opts.background === null ? null : new THREE.Color(opts.background);
  }
  if (opts.fog) scene.fog = new THREE.Fog(opts.fog[0], opts.fog[1], opts.fog[2]);
  return rig;
}

const _fwd = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/**
 * Put an object on a curve at parameter u and point its +Z down the tangent.
 * `bank` rolls it into turns like an aircraft.
 */
export function flyAlong(obj, curve, u, { bank = 0, up = _up, lookAhead = 0.004 } = {}) {
  curve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), _pos);
  curve.getPointAt(THREE.MathUtils.clamp(u + lookAhead, 0, 1), _fwd);
  obj.position.copy(_pos);
  if (_fwd.distanceToSquared(_pos) > 1e-8) {
    _m.lookAt(_fwd, _pos, up);
    _q.setFromRotationMatrix(_m);
    obj.quaternion.copy(_q);
  }
  if (bank) obj.rotateZ(bank);
  return obj;
}

/** Smoothly chase a target value (frame-rate independent). */
export function approach(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Pulse an emissive/glow mesh's scale for engine throb. */
export function throb(node, t, base = 1, amount = 0.06, speed = 9) {
  if (!node) return;
  const s = base * (1 + Math.sin(t * speed) * amount + Math.sin(t * speed * 2.7) * amount * 0.4);
  node.scale.setScalar(s);
}

/** Collect nodes matching a prefix from a built model. */
export function nodesLike(obj, prefix) {
  const n = obj?.userData?.nodes || {};
  return Object.keys(n).filter((k) => k.startsWith(prefix)).sort().map((k) => n[k]);
}

/** A quick opaque backdrop plane, useful behind sets that do not fill frame. */
export function backdrop(color, size = 4000, z = -1800) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color, depthWrite: false, toneMapped: false }),
  );
  m.position.z = z;
  m.renderOrder = -10;
  return m;
}
