import { Float32BufferAttribute, Mesh } from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

function isProtected(obj, skipSet) {
  let p = obj;
  while (p) {
    if (skipSet.has(p)) return true;
    const u = p.userData || {};
    if (u.interact || u.rotor || u.needle || u.noMerge || u.sonarTex) return true;
    p = p.parent;
  }
  return false;
}

export function mergeStatic(root, skipSet = new Set()) {
  root.updateMatrixWorld(true);
  const buckets = new Map();

  root.traverse((obj) => {
    if (obj === root || !obj.isMesh || obj.isInstancedMesh) return;
    if (!obj.geometry || !obj.material) return;
    if (Array.isArray(obj.material)) return;
    if (obj.material.transparent) return;
    if (isProtected(obj, skipSet)) return;
    const key = obj.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: obj.material, meshes: [] });
    buckets.get(key).meshes.push(obj);
  });

  let count = 0;
  for (const { material, meshes } of buckets.values()) {
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      const g = m.geometry.clone();
      for (const key of Object.keys(g.attributes)) {
        if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
      }
      if (!g.attributes.uv && g.attributes.position) {
        const n = g.attributes.position.count;
        g.setAttribute('uv', new Float32BufferAttribute(n * 2, 2));
      }
      g.morphAttributes = {};
      if (g.clearGroups) g.clearGroups();
      g.applyMatrix4(m.matrixWorld);
      return g;
    });
    let merged = null;
    try {
      merged = BufferGeometryUtils.mergeGeometries(geos, false);
    } catch {
      merged = null;
    }
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new Mesh(merged, material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.userData.merged = true;
    root.add(mesh);
    for (const m of meshes) m.removeFromParent();
    count += 1;
  }
  return count;
}
