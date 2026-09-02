import * as THREE from 'three';

// Dead instances are parked far below the map with a near-zero scale.
const HIDDEN = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001).setPosition(0, -5000, 0);
const GIANT_SPHERE = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e5);

/**
 * A growable InstancedMesh for one (geometry, material) pair. Each instance slot maps back to
 * the solid it belongs to (or null for purely decorative parts such as foliage) so raycasts
 * against the InstancedMesh can be resolved to gameplay objects.
 */
export class InstancePool {
  constructor(scene, world, geometry, material, capacity = 128, hittable = true, sphere = null) {
    this.scene = scene;
    this.world = world;
    this.geometry = geometry;
    this.material = material;
    this.hittable = hittable;
    this.sphere = sphere; // region bounds -> enables frustum culling of the whole pool
    this.slots = [];
    this.free = [];
    this.mesh = null;
    this._build(capacity);
  }

  _build(capacity) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.frustumCulled = !!this.sphere;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.boundingSphere = this.sphere ? this.sphere.clone() : GIANT_SPHERE.clone();
    mesh.userData.pool = this;
    for (let i = 0; i < capacity; i++) mesh.setMatrixAt(i, HIDDEN);
    if (this.mesh) {
      const tmp = new THREE.Matrix4();
      for (let i = 0; i < this.mesh.count; i++) {
        this.mesh.getMatrixAt(i, tmp);
        mesh.setMatrixAt(i, tmp);
      }
      mesh.count = this.mesh.count;
      this.scene.remove(this.mesh);
      if (this.hittable) this.world.removeRaycastTarget(this.mesh);
      this.mesh.dispose();
    } else {
      mesh.count = 0;
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.mesh = mesh;
    this.capacity = capacity;
    this.scene.add(mesh);
    if (this.hittable) this.world.addRaycastTarget(mesh);
  }

  add(matrix, solid) {
    let slot;
    if (this.free.length) {
      slot = this.free.pop();
    } else {
      slot = this.mesh.count;
      if (slot >= this.capacity) this._build(this.capacity * 2);
      this.mesh.count = slot + 1;
    }
    this.mesh.setMatrixAt(slot, matrix);
    this.slots[slot] = solid || null;
    this.mesh.instanceMatrix.needsUpdate = true;
    return { pool: this, slot };
  }

  remove(ref) {
    this.mesh.setMatrixAt(ref.slot, HIDDEN);
    this.slots[ref.slot] = null;
    this.free.push(ref.slot);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const REGIONS = 3; // the map is split into REGIONS x REGIONS pool groups so whole regions can be frustum-culled

/** Owns every pool; solids describe their visuals as `parts` and get `instances` refs back. */
export class InstanceRegistry {
  constructor(scene, world, mapSize = 800) {
    this.scene = scene;
    this.world = world;
    this.mapSize = mapSize;
    this.pools = new Map();
  }

  regionOf(x, z) {
    const size = this.mapSize / REGIONS;
    const rx = Math.min(REGIONS - 1, Math.max(0, Math.floor((x + this.mapSize / 2) / size)));
    const rz = Math.min(REGIONS - 1, Math.max(0, Math.floor((z + this.mapSize / 2) / size)));
    return { id: rx * REGIONS + rz, rx, rz, size };
  }

  regionSphere(region) {
    const half = region.size / 2;
    const cx = -this.mapSize / 2 + region.rx * region.size + half;
    const cz = -this.mapSize / 2 + region.rz * region.size + half;
    // generous radius: pieces may poke a few metres over the region edge and up to ~60m high
    return new THREE.Sphere(new THREE.Vector3(cx, 25, cz), Math.sqrt(half * half * 2 + 60 * 60) + 8);
  }

  pool(key, geometry, material, capacity = 128, hittable = true, sphere = null) {
    let p = this.pools.get(key);
    if (!p) {
      p = new InstancePool(this.scene, this.world, geometry, material, capacity, hittable, sphere);
      this.pools.set(key, p);
    }
    return p;
  }

  addSolid(solid) {
    const region = this.regionOf(solid.centerX, solid.centerZ);
    const sphere = this.regionSphere(region);
    solid.instances = solid.parts.map((part) => {
      const pool = this.pool(`${part.key}|r${region.id}`, part.geometry, part.material, Math.ceil((part.capacity || 128) / 4), part.hittable !== false, sphere);
      return pool.add(part.matrix, part.hittable === false ? null : solid);
    });
  }

  removeSolid(solid) {
    if (!solid.instances) return;
    for (const ref of solid.instances) ref.pool.remove(ref);
    solid.instances = null;
  }

  get drawCalls() {
    return this.pools.size;
  }
}
