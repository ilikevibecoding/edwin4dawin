import * as THREE from 'three';
import { MeshBVH, StaticGeometryGenerator, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const _tmpBox = new THREE.Box3();
const _tmpSeg = new THREE.Line3();
const _tmpVec = new THREE.Vector3();
const _tmpVec2 = new THREE.Vector3();
const _tri = new THREE.Triangle();

/**
 * Static collision world. The world module registers collision meshes
 * (visible or invisible proxies); we merge them into one BVH for capsule
 * movement, and give each source mesh its own BVH for bullet raycasts.
 */
export class Colliders {
  constructor() {
    this.sources = [];       // meshes used for bullet raycasts (have .boundsTree)
    this.mergedMesh = null;  // merged geometry mesh with BVH for capsule motion
    this.raycaster = new THREE.Raycaster();
    this.raycaster.firstHitOnly = true;
  }

  /**
   * @param {THREE.Mesh|THREE.Object3D} obj — mesh or subtree to collide against.
   * @param {string} surface — 'concrete'|'metal'|'dirt'|'wood'|'flesh'... for impact FX.
   */
  add(obj, surface = 'concrete') {
    obj.traverse ? obj.traverse((m) => {
      if (m.isMesh) {
        m.userData.surface = m.userData.surface || surface;
        this.sources.push(m);
      }
    }) : null;
    if (obj.isMesh && !this.sources.includes(obj)) {
      obj.userData.surface = obj.userData.surface || surface;
      this.sources.push(obj);
    }
  }

  /** Build BVHs. Call once after all static geometry is registered. */
  build() {
    for (const m of this.sources) {
      if (!m.geometry.boundsTree) m.geometry.computeBoundsTree({ maxLeafTris: 8 });
      m.updateWorldMatrix(true, false);
    }
    const gen = new StaticGeometryGenerator(this.sources);
    gen.attributes = ['position'];
    const merged = gen.generate();
    merged.boundsTree = new MeshBVH(merged, { maxLeafTris: 8 });
    this.mergedMesh = new THREE.Mesh(merged);
  }

  /**
   * Move a capsule through the world, sliding on surfaces.
   * @param {THREE.Vector3} position — capsule *foot* position (mutated).
   * @param {number} radius
   * @param {number} height — total capsule height (foot to top).
   * @param {THREE.Vector3} delta — desired movement this frame.
   * @returns {{ onGround: boolean, hitCeiling: boolean }}
   */
  capsuleMove(position, radius, height, delta) {
    position.add(delta);
    if (!this.mergedMesh) return { onGround: position.y <= 0 && (position.y = 0) === 0, hitCeiling: false };

    const bvh = this.mergedMesh.geometry.boundsTree;
    let onGround = false;
    let hitCeiling = false;

    for (let iter = 0; iter < 3; iter++) {
      // capsule segment: from foot+radius to top-radius
      _tmpSeg.start.set(position.x, position.y + radius, position.z);
      _tmpSeg.end.set(position.x, position.y + height - radius, position.z);
      _tmpBox.makeEmpty();
      _tmpBox.expandByPoint(_tmpSeg.start);
      _tmpBox.expandByPoint(_tmpSeg.end);
      _tmpBox.min.addScalar(-radius);
      _tmpBox.max.addScalar(radius);

      let pushed = false;
      bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(_tmpBox),
        intersectsTriangle: (tri) => {
          const closestPointTri = _tmpVec;
          const closestPointSeg = _tmpVec2;
          const dist = tri.closestPointToSegment(_tmpSeg, closestPointTri, closestPointSeg);
          if (dist < radius) {
            const depth = radius - dist;
            const dir = closestPointSeg.clone().sub(closestPointTri).normalize();
            if (dist < 1e-8) { tri.getNormal(_tri.a); dir.copy(_tri.a); }
            _tmpSeg.start.addScaledVector(dir, depth);
            _tmpSeg.end.addScaledVector(dir, depth);
            position.addScaledVector(dir, depth);
            if (dir.y > 0.35) onGround = true;
            if (dir.y < -0.5) hitCeiling = true;
            pushed = true;
          }
        },
      });
      if (!pushed) break;
    }

    // hard floor at y=0 as a safety net
    if (position.y < 0) { position.y = 0; onGround = true; }
    return { onGround, hitCeiling };
  }

  /**
   * Bullet/vision raycast against static world.
   * @returns {{point, normal, distance, object, surface}|null}
   */
  raycast(origin, direction, far = 400) {
    this.raycaster.set(origin, direction);
    this.raycaster.far = far;
    const hits = this.raycaster.intersectObjects(this.sources, false);
    if (!hits.length) return null;
    const h = hits[0];
    const normal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    return { point: h.point, normal, distance: h.distance, object: h.object, surface: h.object.userData.surface || 'concrete' };
  }

  /** Line-of-sight check (true when unobstructed). */
  clearLine(a, b) {
    const dir = _tmpVec.copy(b).sub(a);
    const dist = dir.length();
    if (dist < 1e-4) return true;
    dir.multiplyScalar(1 / dist);
    const hit = this.raycast(a, dir, dist - 0.05);
    return !hit;
  }
}
