import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { ILevel, IPhysics, RaycastHit, SurfaceType } from '../core/Contracts';

/**
 * STUB — replaced by the Rapier-backed physics world.
 *
 * Raycasts against level meshes with a plain `THREE.Raycaster` so ballistics
 * work before real physics lands. Debris and impulses are no-ops.
 */
export class PhysicsSystem implements Subsystem, IPhysics {
  readonly name = 'physics';
  readonly order = 15;

  private ctx!: EngineContext;
  private raycaster = new THREE.Raycaster();
  private level: ILevel | null = null;

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;
  }

  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): RaycastHit | null {
    const targets = this.level?.collidables ?? [];
    if (!targets.length) return null;
    this.raycaster.set(origin, direction);
    this.raycaster.far = maxDistance;
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    const normal = hit.normal
      ? hit.normal.clone().transformDirection(hit.object.matrixWorld)
      : new THREE.Vector3(0, 1, 0);
    return {
      point: hit.point.clone(),
      normal,
      distance: hit.distance,
      object: hit.object,
      surface: ((hit.object.userData?.surface as SurfaceType) ?? 'concrete') as SurfaceType,
    };
  }

  addDebris(): number {
    return -1;
  }

  applyRadialImpulse(): void {
    /* no-op until real physics lands */
  }

  isClear(from: THREE.Vector3, to: THREE.Vector3): boolean {
    return this.level?.lineOfSight(from, to) ?? true;
  }
}
