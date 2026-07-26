import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { BGU } from '../art/geometry.js';
import { mat } from '../art/materials.js';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

/**
 * Static-geometry batching.
 * Owner: Opus 1.
 *
 * The level is authored as thousands of small parts. Before it reaches the
 * renderer everything static is world-space box-projected (so materials tile at
 * a consistent metre scale with no stretched UVs) and merged into one mesh per
 * material. A BVH is attached to each batch so bullet, vision and interaction
 * rays stay cheap.
 */

/** Default world size in metres for one texture repeat, per material family. */
const TILE_SCALE = {
  drywall: 2.6, plaster: 2.6, ceiling: 1.2, carpet: 2.0, vinyl: 2.0, tile: 1.8,
  concrete: 2.6, wood: 1.6, laminate: 1.6, metal: 1.4, fabric: 1.0, leather: 0.8,
  plastic: 0.7, rubber: 0.7, paper: 0.5, cardboard: 0.9, snow: 3.2, ice: 2.0,
  glass: 2.0, emissive: 1.0, skin: 1.0,
};

export function tileScaleFor(matName) {
  return TILE_SCALE[String(matName).split('.')[0]] ?? 1.5;
}

/**
 * World-space box (triplanar-by-dominant-axis) UV projection.
 * Guarantees seamless tiling between adjacent parts and eliminates the
 * stretched-UV defect class entirely for architecture.
 */
export function boxProjectUV(geometry, scale = 1.5) {
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  if (!pos || !nor) return geometry;
  const count = pos.count;
  const uv = new Float32Array(count * 2);
  const inv = 1 / scale;
  for (let i = 0; i < count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    let u;
    let v;
    if (ny >= nx && ny >= nz) {
      u = px; v = pz;
    } else if (nx >= nz) {
      u = pz; v = py;
    } else {
      u = px; v = py;
    }
    uv[i * 2] = u * inv;
    uv[i * 2 + 1] = v * inv;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

const _v = new THREE.Vector3();

/**
 * Collapse an Object3D subtree into one merged mesh per material, preserving
 * the subtree's own transform. Used for hand-built assemblies (door leaves,
 * hardware, fixtures) that would otherwise cost dozens of draw calls each.
 */
export function collapseByMaterial(root, { keepNames = [], bvh = false } = {}) {
  const buckets = new Map();
  const keep = [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (keepNames.includes(o.name) || o.userData.keepSeparate) { keep.push(o); return; }
    const m = o.material;
    const key = m?.name ?? m?.uuid ?? 'unknown';
    if (!buckets.has(key)) buckets.set(key, { material: m, geos: [] });
    const g = o.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const attr of Object.keys(g.attributes)) {
      if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') g.deleteAttribute(attr);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (g.index === null) {
      const idx = [];
      for (let i = 0; i < g.attributes.position.count; i++) idx.push(i);
      g.setIndex(idx);
    }
    buckets.get(key).geos.push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) o.removeFromParent();
  for (const { material, geos } of buckets.values()) {
    if (!geos.length) continue;
    let merged = null;
    try {
      merged = BGU.mergeGeometries(geos, false);
    } catch {
      merged = null;
    }
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = !material?.transparent;
    mesh.receiveShadow = true;
    mesh.userData.matName = material?.name;
    if (bvh) {
      try { merged.computeBoundsTree({ maxLeafTris: 12 }); } catch { /* ignore */ }
    }
    root.add(mesh);
  }
  return root;
}

/**
 * Merge the *direct* mesh children of every node in a rigged hierarchy, one
 * mesh per material. Bones keep their transforms (so animation still works) but
 * a character drops from ~45 draw calls to ~14. THREE.LOD children are skipped
 * so distance simplification keeps working.
 */
export function collapseRiggedMeshes(root) {
  const nodes = [];
  root.traverse((o) => nodes.push(o));
  let before = 0;
  let after = 0;
  for (const node of nodes) {
    if (node.isLOD) continue;
    const meshes = node.children.filter((c) => c.isMesh && !c.userData.keepSeparate && !c.isSkinnedMesh);
    before += meshes.length;
    if (meshes.length < 2) { after += meshes.length; continue; }
    const buckets = new Map();
    for (const m of meshes) {
      const key = m.material?.name ?? m.material?.uuid ?? 'x';
      if (!buckets.has(key)) buckets.set(key, { material: m.material, geos: [] });
      const g = m.geometry.clone();
      m.updateMatrix();
      g.applyMatrix4(m.matrix);
      if (!g.attributes.normal) g.computeVertexNormals();
      for (const attr of Object.keys(g.attributes)) {
        if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') g.deleteAttribute(attr);
      }
      if (!g.attributes.uv) {
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      }
      if (g.index === null) {
        const idx = [];
        for (let i = 0; i < g.attributes.position.count; i++) idx.push(i);
        g.setIndex(idx);
      }
      buckets.get(key).geos.push(g);
      node.remove(m);
    }
    for (const { material, geos } of buckets.values()) {
      let merged = null;
      try { merged = BGU.mergeGeometries(geos, false); } catch { merged = null; }
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.matName = material?.name;
      node.add(mesh);
      after++;
    }
  }
  return { before, after };
}

/**
 * Merge a part list into meshes grouped by (spatial cell, material).
 *
 * Grouping by material alone produced a handful of map-spanning meshes, which
 * meant every triangle in the building was submitted every frame because
 * frustum culling had nothing to cull. Partitioning by an N-metre cell first
 * keeps the merge benefit while restoring culling: a corridor view now draws a
 * few dozen batches instead of the whole level.
 *
 * parts: [{ geometry, matName, matrix, uvScale?, noProject? }]
 */
export function batchParts(parts, {
  name = 'batch', castShadow = true, receiveShadow = true, bvh = true, cellSize = 14,
} = {}) {
  const groups = new Map();
  const meta = new Map();
  for (const p of parts) {
    if (!p || !p.geometry) continue;
    let key = p.matName;
    if (cellSize > 0) {
      if (p.matrix) _v.setFromMatrixPosition(p.matrix);
      else _v.set(0, 0, 0);
      const cx = Math.floor(_v.x / cellSize);
      const cz = Math.floor(_v.z / cellSize);
      const cy = _v.y > 3.9 ? 1 : 0;
      key = `${cx}|${cz}|${cy}|${p.matName}`;
    }
    if (!groups.has(key)) {
      groups.set(key, []);
      meta.set(key, p.matName);
    }
    groups.get(key).push(p);
  }
  const root = new THREE.Group();
  root.name = name;
  let triangles = 0;
  for (const [key, list] of groups) {
    const matName = meta.get(key) ?? key;
    const geos = [];
    for (const p of list) {
      const g = p.geometry.clone();
      if (p.matrix) g.applyMatrix4(p.matrix);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!p.noProject) boxProjectUV(g, p.uvScale ?? tileScaleFor(matName));
      // Drop attributes that would block a merge
      for (const attr of Object.keys(g.attributes)) {
        if (attr !== 'position' && attr !== 'normal' && attr !== 'uv') g.deleteAttribute(attr);
      }
      if (g.index === null) {
        const idx = [];
        for (let i = 0; i < g.attributes.position.count; i++) idx.push(i);
        g.setIndex(idx);
      }
      geos.push(g);
    }
    if (!geos.length) continue;
    let merged;
    try {
      merged = BGU.mergeGeometries(geos, false);
    } catch (err) {
      console.error(`[merge] failed for material "${matName}"`, err);
      geos.forEach((g) => g.dispose());
      continue;
    }
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const material = mat(matName);
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `${name}:${key}`;
    mesh.castShadow = castShadow && !material.transparent;
    mesh.receiveShadow = receiveShadow;
    mesh.userData.matName = matName;
    mesh.userData.static = true;
    if (bvh) {
      try {
        merged.computeBoundsTree({ maxLeafTris: 12 });
      } catch (err) {
        console.warn('[merge] BVH build failed', err);
      }
    }
    triangles += merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3;
    root.add(mesh);
  }
  root.userData.triangles = triangles;
  return root;
}
