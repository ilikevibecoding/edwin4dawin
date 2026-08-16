// Merges static meshes that share a material into single draw calls.
// A mesh participates unless it (or an ancestor) sets userData.static === false,
// or it is an InstancedMesh / Points / Line, or its material is unique-animated
// (e.g. canvas display materials marked userData.noMerge).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStaticMeshes(root) {
  const byMaterial = new Map();
  const toRemove = [];

  const isDynamic = (obj) => {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.static === false) return true;
      o = o.parent;
    }
    return false;
  };

  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh || obj.isInstancedMesh || obj.isSkinnedMesh) return;
    if (isDynamic(obj)) return;
    if (Array.isArray(obj.material)) return;
    if (obj.material.userData && obj.material.userData.noMerge) return;
    if (obj.material.transparent) return; // keep transparent sorting per-object
    const key = obj.material.uuid;
    if (!byMaterial.has(key)) byMaterial.set(key, { material: obj.material, meshes: [] });
    byMaterial.get(key).meshes.push(obj);
  });

  const merged = new THREE.Group();
  merged.name = 'mergedStatic';

  for (const { material, meshes } of byMaterial.values()) {
    if (meshes.length < 2) continue;
    const geos = [];
    let castShadow = false, receiveShadow = false;
    for (const m of meshes) {
      const g = m.geometry.clone();
      g.applyMatrix4(m.matrixWorld);
      // normalize attributes: keep only position/normal/uv
      const keep = ['position', 'normal', 'uv'];
      for (const name of Object.keys(g.attributes)) {
        if (!keep.includes(name)) g.deleteAttribute(name);
      }
      if (!g.attributes.uv) {
        const count = g.attributes.position.count;
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      if (g.index) geos.push(g.toNonIndexed()); else geos.push(g);
      castShadow = castShadow || m.castShadow;
      receiveShadow = receiveShadow || m.receiveShadow;
      toRemove.push(m);
    }
    const big = mergeGeometries(geos, false);
    if (!big) continue;
    const mesh = new THREE.Mesh(big, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    merged.add(mesh);
  }

  for (const m of toRemove) m.parent && m.parent.remove(m);
  root.add(merged);
  return merged;
}
