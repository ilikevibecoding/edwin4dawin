// Prop system core (lead-owned infrastructure).
// Prop modules register factories; rooms are decorated with placement lists;
// static props are baked into per-room merged batches (with a separate
// distance-culled "clutter" bucket for tiny props = the LOD strategy).
//
// Factory contract:
//   registerProp('desk_standard', (opts, rng) => group)
//   - group is a THREE.Group of Meshes using getMaterial()/shared materials.
//   - group.userData.assetId  = manifest id (e.g. 'FURN-002') REQUIRED
//   - group.userData.colliders = [{x0,y0,z0,x1,y1,z1, surface?}] local-space
//     boxes (optional; omit for non-blocking props)
//   - group.userData.dynamic  = true to skip static batching (animated props)
//   - group.userData.emissiveMeshes = [mesh,...] kept unbatched if needed
//
// Placement entry:
//   { prop:'desk_standard', at:[x,z], y?, rot?, room?, opts?, tiny?, jitter? }
//   rot in radians (any angle; colliders become world-space AABB of the
//   rotated box). y defaults to ground height at (x,z).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng } from '../../core/rng.js';
import { aabb } from '../worldRuntime.js';
import { bakeWorldUvs } from '../uv.js';

const registry = new Map();

export function registerProp(id, factory) {
  if (registry.has(id)) console.warn(`[props] duplicate prop id '${id}'`);
  registry.set(id, factory);
}
export function hasProp(id) { return registry.has(id); }
export function propIds() { return [...registry.keys()]; }

export function createProp(id, opts = {}, rng = defaultRng) {
  const factory = registry.get(id);
  if (!factory) {
    console.error(`[props] unknown prop '${id}'`);
    const g = new THREE.Group();
    g.userData.assetId = 'MISSING';
    return g;
  }
  const group = factory(opts, rng);
  if (!group.userData.assetId) console.warn(`[props] prop '${id}' missing userData.assetId`);
  group.userData.propId = id;
  return group;
}

const defaultRng = new Rng(777001);

// ---------------------------------------------------------------------------
export function placeProps(world, parentGroup, placements, { roomId = 'misc' } = {}) {
  const rng = new Rng(hashStr(roomId));
  const staticMeshes = [];   // {geometry, material} world-space baked
  const clutterMeshes = [];
  const bounds = new THREE.Box3();

  for (const pl of placements) {
    const group = createProp(pl.prop, pl.opts || {}, rng);
    const rot = (pl.rot ?? 0) + (pl.jitter ? (rng.random() - 0.5) * pl.jitter : 0);
    let y = pl.y;
    if (y === undefined) {
      const g = world.groundAt(pl.at[0], pl.at[1], 10, 20);
      y = g.y > -100 ? g.y : 0;
    }
    group.position.set(pl.at[0], y, pl.at[1]);
    group.rotation.y = rot;
    group.updateMatrixWorld(true);

    // colliders -> world AABB
    for (const c of group.userData.colliders || []) {
      const box = new THREE.Box3(
        new THREE.Vector3(c.x0, c.y0, c.z0), new THREE.Vector3(c.x1, c.y1, c.z1),
      ).applyMatrix4(group.matrixWorld);
      world.addCollider(aabb(box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z, {
        kind: 'prop', surface: c.surface || 'wood', assetId: group.userData.assetId,
        blocksSight: c.blocksSight ?? (box.max.y - box.min.y) > 1.1,
      }));
    }
    world.propAnchors.push({
      assetId: group.userData.assetId, propId: pl.prop, room: roomId,
      x: pl.at[0], y, z: pl.at[1],
    });

    if (group.userData.dynamic) {
      parentGroup.add(group);
      continue;
    }
    // bake meshes into batch lists
    group.traverse((node) => {
      if (!node.isMesh) return;
      const geo = node.geometry.clone().applyMatrix4(node.matrixWorld);
      bounds.expandByObject(node);
      (pl.tiny ? clutterMeshes : staticMeshes).push({ geo, mat: node.material });
    });
  }

  const built = [];
  for (const [list, isClutter] of [[staticMeshes, false], [clutterMeshes, true]]) {
    const byMat = new Map();
    for (const m of list) {
      if (!byMat.has(m.mat)) byMat.set(m.mat, []);
      byMat.get(m.mat).push(m.geo);
    }
    for (const [mat, geos] of byMat) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      // props keep native UVs when authored (uv attribute present on all
      // geos); box-built props without deliberate UVs get world-space UVs
      if (mat.userData?.worldUv) bakeWorldUvs(merged, mat.userData.tileMeters || 1);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = !isClutter;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      if (isClutter) {
        mesh.userData.cullDist = 34;
        mesh.userData.cullCenter = bounds.getCenter(new THREE.Vector3());
        world.clutterChunks = world.clutterChunks || [];
        world.clutterChunks.push(mesh);
      }
      parentGroup.add(mesh);
      built.push(mesh);
      for (const g of geos) g.dispose();
    }
  }
  return built;
}

// distance culling tick for clutter chunks (called from the engine render hook)
export function updateClutterCulling(world, cameraPos) {
  if (!world.clutterChunks) return;
  for (const mesh of world.clutterChunks) {
    const c = mesh.userData.cullCenter;
    const d2 = (c.x - cameraPos.x) ** 2 + (c.z - cameraPos.z) ** 2;
    mesh.visible = d2 < mesh.userData.cullDist * mesh.userData.cullDist;
  }
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
