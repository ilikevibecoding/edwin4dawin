// Static geometry merging.
//
// The site is kit-bashed from hundreds of small primitives, which is great for
// authoring and terrible for draw calls. After construction we walk each group,
// collect every mesh that never moves, and merge it into one geometry per
// material. Anything that animates - rotating arrays, elevating launchers,
// swapped status lamps, toggled covers - is tagged `userData.dynamic` and left
// alone (tagging an object also protects its whole subtree).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const REQUIRED = ['position', 'normal', 'uv'];

function isMergeable(o) {
  if (!o.isMesh) return false;
  if (o.isInstancedMesh || o.isSkinnedMesh || o.isSprite) return false;
  if (Array.isArray(o.material)) return false;
  if (!o.geometry || !o.geometry.attributes.position) return false;
  if (o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return false;
  return true;
}

/** Ensure a geometry has exactly the attributes we merge on. */
function normalise(geo) {
  const g = geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  for (const name of Object.keys(g.attributes)) {
    if (!REQUIRED.includes(name)) g.deleteAttribute(name);
  }
  if (g.index === null) {
    const count = g.attributes.position.count;
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

/**
 * Merge the static meshes under `root` in place.
 * @returns {{before:number, after:number, merged:number}}
 */
export function mergeStatic(root, { tag = 'merged', deep = true } = {}) {
  root.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  /** @type {Map<THREE.Material, {geos: THREE.BufferGeometry[], meshes: THREE.Mesh[]}>} */
  const buckets = new Map();
  const nested = [];
  let before = 0;

  const visit = (obj) => {
    for (const child of obj.children.slice()) {
      if (child.userData && child.userData.dynamic) {
        // an animated sub-assembly still moves as a rigid unit, so merge inside it
        if (deep && child.children.length) nested.push(child);
        continue;
      }
      if (child.isLight || child.isCamera) continue;
      if (isMergeable(child)) {
        before++;
        let bucket = buckets.get(child.material);
        if (!bucket) buckets.set(child.material, (bucket = { geos: [], meshes: [] }));
        const g = normalise(child.geometry);
        child.updateWorldMatrix(true, false);
        const m = new THREE.Matrix4().multiplyMatrices(inverseRoot, child.matrixWorld);
        g.applyMatrix4(m);
        bucket.geos.push(g);
        bucket.meshes.push(child);
      }
      visit(child);
    }
  };
  visit(root);

  let merged = 0;
  for (const [material, bucket] of buckets) {
    if (bucket.geos.length < 2) {
      for (const g of bucket.geos) g.dispose();
      continue;
    }
    let geo;
    try {
      geo = mergeGeometries(bucket.geos, false);
    } catch (e) {
      geo = null;
    }
    if (!geo) {
      for (const g of bucket.geos) g.dispose();
      continue;
    }
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = `${tag}-${material.name || material.uuid.slice(0, 6)}`;
    mesh.castShadow = bucket.meshes.some((m) => m.castShadow);
    mesh.receiveShadow = bucket.meshes.some((m) => m.receiveShadow);
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    merged++;
    for (const m of bucket.meshes) {
      m.parent?.remove(m);
      m.geometry.dispose?.();
    }
    for (const g of bucket.geos) g.dispose();
  }

  for (const child of nested) {
    const r = mergeStatic(child, { tag: `${tag}-sub`, deep });
    before += r.before;
    merged += r.merged;
  }

  let after = 0;
  root.traverse((o) => {
    if (o.isMesh) after++;
  });
  return { before, after, merged };
}

/** Tag an object (and therefore its subtree) as animated. */
export function markDynamic(...objs) {
  for (const o of objs) {
    if (o) o.userData.dynamic = true;
  }
  return objs[0];
}
