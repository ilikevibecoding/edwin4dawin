import * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';
import { RapierWorld, IG_DEBRIS } from './RapierWorld';

interface DebrisEntry {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
  ttl: number;
  age: number;
  fade: number;
}

/**
 * Pool of dynamic rigid bodies for explosion debris and gibs.
 *
 * Bodies are capped at `quality.debrisBudget`; spawning past the cap recycles
 * the oldest entry. The per-frame {@link sync} copies Rapier transforms onto
 * the meshes without allocating.
 */
export class DebrisPool {
  private entries: DebrisEntry[] = [];

  constructor(
    private rw: RapierWorld,
    private scene: THREE.Scene,
    private budget: number
  ) {}

  setBudget(n: number) {
    this.budget = Math.max(0, n | 0);
    while (this.entries.length > this.budget) this.removeAt(0);
  }

  get count() {
    return this.entries.length;
  }

  /**
   * Spawn a dynamic body for `mesh`. The mesh's current world position/quaternion
   * seed the body. Returns the Rapier body handle, or -1 if physics is down.
   */
  spawn(
    mesh: THREE.Mesh,
    opts?: {
      mass?: number;
      restitution?: number;
      friction?: number;
      ttl?: number;
      linvel?: THREE.Vector3;
      angvel?: THREE.Vector3;
      ccd?: boolean;
    }
  ): number {
    if (!this.rw.available || this.budget <= 0) return -1;
    const R = this.rw.R;

    if (!mesh.parent) this.scene.add(mesh);
    mesh.getWorldPosition(_pos);
    mesh.getWorldQuaternion(_quat);

    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(_pos.x, _pos.y, _pos.z)
      .setRotation(_quat as unknown as RAPIER.Rotation)
      .setLinearDamping(0.05)
      .setAngularDamping(0.35)
      .setCcdEnabled(opts?.ccd ?? false);
    if (opts?.linvel) bodyDesc.setLinvel(opts.linvel.x, opts.linvel.y, opts.linvel.z);
    if (opts?.angvel) bodyDesc.setAngvel(opts.angvel);
    const body = this.rw.world.createRigidBody(bodyDesc);

    // Approximate the mesh with its bounding box as a cuboid — cheap + stable.
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    _size.subVectors(bb.max, bb.min).multiply(mesh.scale).multiplyScalar(0.5);
    const hx = Math.max(0.02, _size.x);
    const hy = Math.max(0.02, _size.y);
    const hz = Math.max(0.02, _size.z);
    const colDesc = R.ColliderDesc.cuboid(hx, hy, hz)
      .setDensity(Math.max(0.1, (opts?.mass ?? 1) / (8 * hx * hy * hz)))
      .setFriction(opts?.friction ?? 0.7)
      .setRestitution(opts?.restitution ?? 0.15)
      .setCollisionGroups(IG_DEBRIS);
    const collider = this.rw.world.createCollider(colDesc, body);

    const entry: DebrisEntry = {
      body,
      collider,
      mesh,
      ttl: opts?.ttl ?? 9,
      age: 0,
      fade: 0,
    };
    this.entries.push(entry);
    this.rw.registerColliderObject(collider.handle, mesh);

    if (this.entries.length > this.budget) this.removeAt(0);
    return body.handle;
  }

  /** Copy Rapier transforms onto meshes; age out expired debris. */
  sync(dt: number) {
    if (!this.rw.available) return;
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i];
      e.age += dt;
      if (e.age >= e.ttl) {
        // Sink + fade for the last second so it doesn't pop out.
        this.removeAt(i);
        continue;
      }
      const t = e.body.translation();
      const r = e.body.rotation();
      e.mesh.position.set(t.x, t.y, t.z);
      e.mesh.quaternion.set(r.x, r.y, r.z, r.w);
      // Fade the final 1.2s via scale so shared materials aren't mutated.
      const left = e.ttl - e.age;
      if (left < 1.2) {
        const s = Math.max(0.001, left / 1.2);
        e.mesh.scale.setScalar(s * (e.mesh.userData.__baseScale ?? 1));
      }
    }
  }

  private removeAt(i: number) {
    const e = this.entries[i];
    this.rw.unregisterCollider(e.collider.handle);
    this.rw.world.removeRigidBody(e.body);
    if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
    this.entries.splice(i, 1);
  }

  clear() {
    for (let i = this.entries.length - 1; i >= 0; i--) this.removeAt(i);
  }
}

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _size = new THREE.Vector3();
