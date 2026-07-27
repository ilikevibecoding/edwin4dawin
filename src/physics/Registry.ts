/**
 * Bidirectional bookkeeping between Rapier handles and gameplay user data.
 *
 * Rapier 0.19 does not carry user data on colliders (only on rigid bodies), and
 * its handles are opaque doubles rather than small integers — but they are
 * stable and unique, which is all a map key needs. Queries resolve the owning
 * entity through here, and `RaycastOptions.exclude` is resolved against the
 * same records.
 */
import type { Collider, RigidBody } from '@dimforge/rapier3d-compat';
import type { PhysicsUserData } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';

export interface ColliderRecord {
  readonly collider: Collider;
  readonly userData: PhysicsUserData | null;
  readonly surface: SurfaceType;
  /**
   * The handle object the caller holds (character/rigid body/ragdoll). Kept so
   * `exclude: [handle]` works as naturally as `exclude: [object3D]`.
   */
  readonly owner: object | null;
}

const DEFAULT_SURFACE: SurfaceType = 'concrete';

export class ColliderRegistry {
  private readonly byCollider = new Map<number, ColliderRecord>();
  private readonly byBody = new Map<number, ColliderRecord>();
  private readonly byUserData = new Map<PhysicsUserData, number>();

  get size(): number {
    return this.byCollider.size;
  }

  register(
    collider: Collider,
    userData: PhysicsUserData | null | undefined,
    owner: object | null = null,
    surfaceOverride?: SurfaceType,
  ): ColliderRecord {
    const record: ColliderRecord = {
      collider,
      userData: userData ?? null,
      surface: surfaceOverride ?? userData?.surface ?? DEFAULT_SURFACE,
      owner,
    };
    this.byCollider.set(collider.handle, record);
    const parent = collider.parent();
    if (parent && !this.byBody.has(parent.handle)) this.byBody.set(parent.handle, record);
    if (userData && !this.byUserData.has(userData)) this.byUserData.set(userData, collider.handle);
    return record;
  }

  unregister(collider: Collider): void {
    const record = this.byCollider.get(collider.handle);
    if (!record) return;
    this.byCollider.delete(collider.handle);
    if (record.userData) {
      const mapped = this.byUserData.get(record.userData);
      if (mapped === collider.handle) this.byUserData.delete(record.userData);
    }
  }

  unregisterBody(body: RigidBody): void {
    this.byBody.delete(body.handle);
  }

  get(handle: number): ColliderRecord | undefined {
    return this.byCollider.get(handle);
  }

  forBody(body: RigidBody): ColliderRecord | undefined {
    return this.byBody.get(body.handle);
  }

  /** Reverse lookup: the collider a piece of user data was registered against. */
  colliderHandleOf(userData: PhysicsUserData): number | undefined {
    return this.byUserData.get(userData);
  }

  surfaceOf(handle: number): SurfaceType {
    return this.byCollider.get(handle)?.surface ?? DEFAULT_SURFACE;
  }

  userDataOf(handle: number): PhysicsUserData | null {
    return this.byCollider.get(handle)?.userData ?? null;
  }

  clear(): void {
    this.byCollider.clear();
    this.byBody.clear();
    this.byUserData.clear();
  }
}
