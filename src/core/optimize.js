import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Static batching.  (owner: opus1)
//
// The level is authored as thousands of small readable meshes, which is the
// right way to build it and the wrong way to draw it. After the world is
// assembled we merge every static mesh that shares a material into one
// geometry per material, which is what takes the frame from thousands of draw
// calls to a few dozen — and it matters twice, because the sun's shadow pass
// draws the whole set again.
//
// Anything that moves, animates, or needs its own visibility toggle must be
// excluded. Objects opt out with `userData.noMerge = true`, and whole subtrees
// opt out by not being passed in.
//
// Merging erases per-object identity, so we keep a lookup table of the source
// bounds plus asset ID and expose `assetIdAt(point)` for the QA asset labeller
// and the manifest audit.
// ---------------------------------------------------------------------------

export class StaticBatcher {
  constructor() {
    /** @type {Array<{box:THREE.Box3, assetId:string|null, name:string}>} */
    this.sourceIndex = [];
    this.stats = { candidates: 0, merged: 0, batches: 0, skipped: 0, triangles: 0 };
    this.batchGroup = new THREE.Group();
    this.batchGroup.name = 'static-batches';
  }

  /**
   * @param {THREE.Object3D[]} roots subtrees to flatten
   * @param {THREE.Scene} scene    scene the merged batches are added to
   */
  run(roots, scene) {
    /** @type {Map<string, {material:THREE.Material, geos:THREE.BufferGeometry[], meshes:THREE.Mesh[], cast:boolean, receive:boolean}>} */
    const buckets = new Map();

    const consider = (mesh) => {
      if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh) return false;
      if (mesh.userData.noMerge) return false;
      if (Array.isArray(mesh.material)) return false;
      const mat = mesh.material;
      if (!mat || !mesh.geometry) return false;
      // Transparent surfaces need per-object sorting to composite correctly.
      if (mat.transparent) return false;
      const g = mesh.geometry;
      if (!g.attributes.position) return false;
      // Very large meshes gain nothing from merging and hurt culling.
      g.computeBoundingSphere();
      if (g.boundingSphere && g.boundingSphere.radius * Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) > 26) return false;
      return true;
    };

    for (const root of roots) {
      if (!root) continue;
      root.updateMatrixWorld(true);
      const doomed = [];
      root.traverse((obj) => {
        if (!obj.isMesh) return;
        this.stats.candidates++;
        if (!consider(obj)) { this.stats.skipped++; return; }
        // Spatial bucketing keeps each batch local so frustum culling still
        // works: without it one merged wall mesh would span the whole map and
        // never be culled.
        const wp = new THREE.Vector3();
        obj.getWorldPosition(wp);
        const cell = `${Math.floor(wp.x / 22)},${Math.floor(wp.y / 4.5)},${Math.floor(wp.z / 22)}`;
        const key = `${obj.material.uuid}|${cell}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}`;
        if (!buckets.has(key)) {
          buckets.set(key, {
            material: obj.material, geos: [], meshes: [],
            cast: obj.castShadow, receive: obj.receiveShadow,
          });
        }
        const b = buckets.get(key);
        const geo = obj.geometry.clone();
        geo.applyMatrix4(obj.matrixWorld);
        // Normalise the attribute set: mergeGeometries requires an identical
        // layout across every input.
        harmoniseAttributes(geo);
        b.geos.push(geo);
        b.meshes.push(obj);
        const box = new THREE.Box3().setFromObject(obj);
        this.sourceIndex.push({
          box,
          assetId: findAssetId(obj),
          name: obj.name || obj.parent?.name || '',
        });
        doomed.push(obj);
      });
      for (const obj of doomed) obj.removeFromParent();
    }

    for (const b of buckets.values()) {
      if (!b.geos.length) continue;
      // A bucket of one is cheaper left alone than re-wrapped.
      let merged;
      try {
        merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
      } catch {
        merged = null;
      }
      if (!merged) {
        // Merge failed (mismatched attributes) — put the originals back rather
        // than silently dropping geometry from the level.
        for (let i = 0; i < b.meshes.length; i++) {
          const m = b.meshes[i];
          m.geometry = b.geos[i];
          m.position.set(0, 0, 0);
          m.rotation.set(0, 0, 0);
          m.scale.set(1, 1, 1);
          this.batchGroup.add(m);
        }
        this.stats.skipped += b.meshes.length;
        continue;
      }
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, b.material);
      // Only the sun casts shadows, and indoors it reaches very little. Letting
      // every small prop into the shadow pass roughly doubled the draw call
      // count for shadows nobody can see, so batches smaller than a filing
      // cabinet are excluded from it.
      const size = merged.boundingBox.getSize(new THREE.Vector3());
      const shadowWorthy = Math.max(size.x, size.y, size.z) > 1.3;
      mesh.castShadow = b.cast && shadowWorthy;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      mesh.userData.staticBatch = true;
      mesh.name = `batch:${b.material.userData?.materialKey || b.material.type}`;
      this.batchGroup.add(mesh);
      this.stats.batches++;
      this.stats.merged += b.geos.length;
      this.stats.triangles += (merged.index ? merged.index.count : merged.attributes.position.count) / 3;
      for (const g of b.geos) if (g !== merged) g.dispose();
    }

    scene.add(this.batchGroup);
    return this.stats;
  }

  /** Nearest registered asset ID whose original bounds contain the point. */
  assetIdAt(point, tolerance = 0.12) {
    let best = null;
    let bestD = Infinity;
    for (const rec of this.sourceIndex) {
      if (!rec.assetId) continue;
      const d = rec.box.distanceToPoint(point);
      if (d <= tolerance && d < bestD) { bestD = d; best = rec; }
    }
    return best ? best.assetId : null;
  }
}

/**
 * Merge the meshes under each moving part of an articulated object (a door
 * leaf, a shutter, a hatch) so it draws as one call per material instead of one
 * per screw. Only descends one level: the direct children of `root` keep their
 * own transforms so the part can still animate.
 */
export function batchArticulated(root) {
  let saved = 0;
  for (const part of root.children) {
    if (!part.isObject3D || part.children.length < 2) continue;
    const buckets = new Map();
    const doomed = [];
    part.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
    part.traverse((o) => {
      if (o === part || !o.isMesh || o.userData.noMerge) return;
      if (Array.isArray(o.material) || !o.material || o.material.transparent) return;
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}`;
      if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], cast: o.castShadow });
      const g = o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      harmoniseAttributes(g);
      buckets.get(key).geos.push(g);
      doomed.push(o);
    });
    for (const b of buckets.values()) {
      if (b.geos.length < 2) { for (const g of b.geos) g.dispose(); continue; }
      let merged = null;
      try { merged = mergeGeometries(b.geos, false); } catch { merged = null; }
      if (!merged) { for (const g of b.geos) g.dispose(); continue; }
      const m = new THREE.Mesh(merged, b.material);
      m.castShadow = b.cast;
      m.receiveShadow = false;
      m.userData.articulatedBatch = true;
      part.add(m);
      saved += b.geos.length - 1;
      // Remove only the sources that actually went into this batch.
      for (const g of b.geos) g.dispose();
    }
    // Detach every merged source; anything that failed to merge was skipped
    // above and its bucket left with a single geometry, so re-add those.
    for (const o of doomed) {
      if (o.userData.articulatedBatch) continue;
      const bucketKey = `${o.material.uuid}|${o.castShadow ? 1 : 0}`;
      const b = buckets.get(bucketKey);
      if (b && b.geos.length >= 2) o.removeFromParent();
    }
  }
  return saved;
}

/** Walk up the parent chain looking for the nearest asset tag. */
function findAssetId(obj) {
  let cur = obj;
  while (cur) {
    if (cur.userData?.assetId) return cur.userData.assetId;
    cur = cur.parent;
  }
  return null;
}

/**
 * Give every geometry the same attribute set (position, normal, uv, uv1) so
 * they can be merged. Missing attributes are synthesised rather than dropped,
 * because dropping `uv1` would silently disable ambient occlusion.
 */
function harmoniseAttributes(geo) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const count = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!geo.attributes.uv1) {
    geo.setAttribute('uv1', new THREE.BufferAttribute(geo.attributes.uv.array.slice(), 2));
  }
  // Drop everything else; extra attributes break the merge.
  for (const name of Object.keys(geo.attributes)) {
    if (!['position', 'normal', 'uv', 'uv1'].includes(name)) geo.deleteAttribute(name);
  }
  if (geo.morphAttributes) geo.morphAttributes = {};
  if (!geo.index) {
    // mergeGeometries requires all inputs to agree on being indexed or not.
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return geo;
}

/**
 * Keep the sun's shadow frustum tight around the camera instead of covering the
 * whole building. A 46 m ortho box over the entire map meant the shadow pass
 * drew every mesh in the level every frame at a resolution too low to look good
 * anyway; a 26 m box that follows the player draws a fraction of it and gives
 * noticeably crisper contact shadows.
 */
/**
 * Characters are lit almost entirely by interior fixtures, which do not cast
 * shadows in this renderer. Keeping ~100 sub-meshes per character in the sun's
 * shadow pass bought nothing visible and cost about a thousand draw calls, so
 * only the torso keeps its shadow. Applied from the outside so the character
 * models stay owned by their author.
 */
export function trimCharacterShadows(root, keepNames = ['chest', 'torso', 'spine', 'hips', 'head']) {
  let trimmed = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow) return;
    const parentName = (o.parent?.name || '').toLowerCase();
    const own = (o.name || '').toLowerCase();
    const keep = keepNames.some((n) => parentName.includes(n) || own.includes(n));
    if (!keep) { o.castShadow = false; trimmed++; }
  });
  return trimmed;
}

export function fitShadowToCamera(light, cameraPos, halfExtent = 12, snap = 1.0) {
  const cam = light.shadow.camera;
  const sx = Math.round(cameraPos.x / snap) * snap;
  const sz = Math.round(cameraPos.z / snap) * snap;
  const sy = Math.round(cameraPos.y / snap) * snap;
  // Preserve the light's direction while re-centring its target on the player.
  const dir = light.position.clone().sub(light.target.position).normalize();
  light.target.position.set(sx, sy, sz);
  light.position.copy(light.target.position).addScaledVector(dir, 60);
  light.target.updateMatrixWorld();
  if (cam.left !== -halfExtent) {
    cam.left = -halfExtent;
    cam.right = halfExtent;
    cam.top = halfExtent;
    cam.bottom = -halfExtent;
    cam.near = 1;
    cam.far = 130;
    cam.updateProjectionMatrix();
  }
}
