/**
 * World collision geometry.
 *
 * The map registers ~4.5k boxes and a terrain shell during load. Creating one
 * fixed rigid body per box wastes both build time and per-step bookkeeping, so
 * boxes are bucketed into a coarse XZ grid and every box in a bucket becomes a
 * collider on that bucket's single fixed body. Rapier's broad phase indexes
 * colliders individually, so query and contact performance is unaffected while
 * the body count drops from thousands to roughly a hundred.
 */
import * as THREE from 'three';
import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';
import { RAPIER } from './Rapier';
import type { PhysicsUserData } from '../core/Contracts';
import type { ColliderRegistry } from './Registry';
import { STATIC_GROUPS } from './Groups';
import { PHYS, surfacePhysics } from './Tuning';

const IDENTITY_ROT = { x: 0, y: 0, z: 0, w: 1 };

export class StaticGeometry {
  boxCount = 0;
  meshCount = 0;
  triangleCount = 0;
  /** Wall-clock cost of every registration call so far, in milliseconds. */
  buildMs = 0;

  private readonly cells = new Map<number, RigidBody>();
  private readonly meshBodies: RigidBody[] = [];

  constructor(
    private readonly world: World,
    private readonly registry: ColliderRegistry,
  ) {}

  get bodyCount(): number {
    return this.cells.size + this.meshBodies.length;
  }

  addBox(
    center: THREE.Vector3,
    halfExtents: THREE.Vector3,
    quaternion: THREE.Quaternion | undefined,
    userData: PhysicsUserData | undefined,
  ): Collider | null {
    const started = performance.now();
    const hx = Math.max(1e-3, halfExtents.x);
    const hy = Math.max(1e-3, halfExtents.y);
    const hz = Math.max(1e-3, halfExtents.z);
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !Number.isFinite(center.z)) {
      return null;
    }

    const body = this.cellBody(center.x, center.z);
    const origin = body.translation();
    const material = surfacePhysics(userData?.surface);

    const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(center.x - origin.x, center.y - origin.y, center.z - origin.z)
      .setDensity(0)
      .setFriction(material.friction)
      .setRestitution(material.restitution)
      .setCollisionGroups(STATIC_GROUPS);
    if (quaternion) desc.setRotation(quaternion);

    const collider = this.world.createCollider(desc, body);
    this.registry.register(collider, userData);
    this.boxCount++;
    this.buildMs += performance.now() - started;
    return collider;
  }

  addMesh(mesh: THREE.Mesh, userData: PhysicsUserData | undefined): Collider | null {
    const started = performance.now();
    const geometry = mesh.geometry;
    const position = geometry?.getAttribute('position');
    if (!position || position.count < 3) return null;

    mesh.updateWorldMatrix(true, false);
    const vertices = new Float32Array(position.count * 3);
    const m = mesh.matrixWorld.elements;
    for (let i = 0, o = 0; i < position.count; i++, o += 3) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      vertices[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
      vertices[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      vertices[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    }

    let indices: Uint32Array;
    const index = geometry.getIndex();
    if (index) {
      indices = index.array instanceof Uint32Array ? index.array : new Uint32Array(index.array);
    } else {
      indices = new Uint32Array(position.count);
      for (let i = 0; i < position.count; i++) indices[i] = i;
    }
    if (indices.length < 3) return null;

    const material = surfacePhysics(userData?.surface);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    // FIX_INTERNAL_EDGES stops the character controller and rolling debris from
    // catching on the seams between coplanar terrain triangles.
    const desc = RAPIER.ColliderDesc.trimesh(
      vertices,
      indices,
      RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES,
    )
      .setDensity(0)
      .setFriction(material.friction)
      .setRestitution(material.restitution)
      .setCollisionGroups(STATIC_GROUPS);

    const collider = this.world.createCollider(desc, body);
    this.registry.register(collider, userData);
    this.meshBodies.push(body);
    this.meshCount++;
    this.triangleCount += indices.length / 3;
    this.buildMs += performance.now() - started;
    return collider;
  }

  dispose(): void {
    for (const body of this.cells.values()) this.world.removeRigidBody(body);
    for (const body of this.meshBodies) this.world.removeRigidBody(body);
    this.cells.clear();
    this.meshBodies.length = 0;
    this.boxCount = 0;
    this.meshCount = 0;
    this.triangleCount = 0;
  }

  private cellBody(x: number, z: number): RigidBody {
    const size = PHYS.staticCellSize;
    const limit = PHYS.staticCellLimit;
    let cx = Math.floor(x / size);
    let cz = Math.floor(z / size);
    if (cx < -limit) cx = -limit;
    else if (cx > limit) cx = limit;
    if (cz < -limit) cz = -limit;
    else if (cz > limit) cz = limit;

    const key = (cx + limit) * (limit * 2 + 1) + (cz + limit);
    let body = this.cells.get(key);
    if (!body) {
      body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(
          cx * size + size * 0.5,
          0,
          cz * size + size * 0.5,
        ),
      );
      this.cells.set(key, body);
    }
    return body;
  }
}

export { IDENTITY_ROT };
