import * as THREE from 'three';
import type * as RAPIER from '@dimforge/rapier3d-compat';
import type { RaycastHit } from '../core/Contracts';
import { RapierWorld, IG_PLAYER } from './RapierWorld';
import { clamp } from '../core/MathX';

export type QueryFn = (
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDistance: number,
  opts?: { staticOnly?: boolean }
) => RaycastHit | null;

export interface MoveResult {
  /** The movement actually applied this step (post collision resolution). */
  delta: THREE.Vector3;
  grounded: boolean;
  /** Vertical rise caused by auto-stepping a kerb/stair this step. */
  stepUp: number;
}

const DEG = Math.PI / 180;

/**
 * Capsule character controller.
 *
 * Prefers Rapier's `KinematicCharacterController` (collide-and-slide, autostep,
 * slope handling, snap-to-ground). When Rapier is unavailable it degrades to a
 * hand-rolled capsule resolver driven by raycasts so the game still runs.
 *
 * The controller keeps an authoritative capsule **centre** in JS; the caller
 * works in feet coordinates via {@link footY}.
 */
export class CharacterController {
  grounded = false;
  private center = new THREE.Vector3();
  private radius: number;
  private halfHeight: number; // cylinder half-height (excludes the caps)

  private readonly rw: RapierWorld;
  private readonly query: QueryFn;
  private readonly fallback: boolean;

  private ctrl: RAPIER.KinematicCharacterController | null = null;
  private body: RAPIER.RigidBody | null = null;
  private collider: RAPIER.Collider | null = null;

  private readonly _v = { x: 0, y: 0, z: 0 };
  private readonly _result = new THREE.Vector3();

  constructor(rw: RapierWorld, radius: number, halfHeight: number, query: QueryFn) {
    this.rw = rw;
    this.radius = radius;
    this.halfHeight = halfHeight;
    this.query = query;
    this.fallback = !rw.available;

    if (rw.available) {
      const R = rw.R;
      this.body = rw.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
      const desc = R.ColliderDesc.capsule(halfHeight, radius).setCollisionGroups(IG_PLAYER);
      this.collider = rw.world.createCollider(desc, this.body);
      rw.playerColliderHandle = this.collider.handle;

      const c = rw.world.createCharacterController(0.02);
      c.setUp({ x: 0, y: 1, z: 0 });
      c.enableAutostep(0.45, 0.1, true);
      c.setMaxSlopeClimbAngle(50 * DEG);
      c.setMinSlopeSlideAngle(50 * DEG);
      c.enableSnapToGround(0.35);
      c.setSlideEnabled(true);
      c.setApplyImpulsesToDynamicBodies(true);
      c.setCharacterMass(85);
      c.setNormalNudgeFactor(0.0001);
      this.ctrl = c;
    }
  }

  /** Total capsule height (foot to crown). */
  get height() {
    return 2 * (this.halfHeight + this.radius);
  }

  get footY() {
    return this.center.y - (this.halfHeight + this.radius);
  }

  getCenter(out: THREE.Vector3) {
    return out.copy(this.center);
  }

  getFoot(out: THREE.Vector3) {
    out.copy(this.center);
    out.y = this.footY;
    return out;
  }

  /** Place the capsule so its feet sit at `foot`. */
  setFoot(foot: THREE.Vector3) {
    this.center.set(foot.x, foot.y + this.halfHeight + this.radius, foot.z);
    this.pushToBody();
  }

  /** Toggle snap-to-ground (disable while ascending so jumps aren't cancelled). */
  setSnap(enabled: boolean) {
    if (!this.ctrl) return;
    if (enabled) this.ctrl.enableSnapToGround(0.35);
    else this.ctrl.disableSnapToGround();
  }

  /** Resize the capsule in place (stance changes), keeping the feet planted. */
  resize(radius: number, halfHeight: number) {
    const foot = this.footY;
    this.radius = radius;
    this.halfHeight = halfHeight;
    this.center.y = foot + halfHeight + radius;
    if (this.collider) {
      this.collider.setRadius(radius);
      this.collider.setHalfHeight(halfHeight);
    }
    this.pushToBody();
  }

  private pushToBody() {
    if (!this.body) return;
    this._v.x = this.center.x;
    this._v.y = this.center.y;
    this._v.z = this.center.z;
    this.body.setTranslation(this._v, false);
  }

  /** Move by `desired` (world delta) with collision resolution. */
  move(desired: THREE.Vector3): MoveResult {
    if (this.fallback || !this.ctrl || !this.body || !this.collider) {
      return this.moveFallback(desired);
    }
    const rw = this.rw;
    // Keep the collider synced to our authoritative centre before sweeping.
    this.pushToBody();
    rw.world.propagateModifiedBodyPositionsToColliders();

    this._v.x = desired.x;
    this._v.y = desired.y;
    this._v.z = desired.z;
    this.ctrl.computeColliderMovement(
      this.collider,
      this._v,
      rw.R.QueryFilterFlags.EXCLUDE_SENSORS,
      IG_PLAYER
    );
    const m = this.ctrl.computedMovement();
    this.grounded = this.ctrl.computedGrounded();

    this.center.x += m.x;
    this.center.y += m.y;
    this.center.z += m.z;
    this.pushToBody();

    // Auto-step rise: we asked to move (roughly) horizontally yet gained height.
    let stepUp = 0;
    if (this.grounded && desired.y <= 0.001 && m.y > 0.02) stepUp = m.y;

    this._result.set(m.x, m.y, m.z);
    return { delta: this._result, grounded: this.grounded, stepUp };
  }

  // -------------------------------------------------------------------------
  // Raycast fallback (no Rapier) — good enough to boot & screenshot.
  // -------------------------------------------------------------------------

  private moveFallback(desired: THREE.Vector3): MoveResult {
    const skin = this.radius;
    let stepUp = 0;

    // Horizontal collide: stop short of walls along the movement direction.
    _horiz.set(desired.x, 0, desired.z);
    const hlen = _horiz.length();
    if (hlen > 1e-5) {
      _dir.copy(_horiz).multiplyScalar(1 / hlen);
      _probe.copy(this.center);
      const hit = this.query(_probe, _dir, skin + hlen, { staticOnly: true });
      let allowed = hlen;
      if (hit) allowed = Math.max(0, hit.distance - skin);
      this.center.addScaledVector(_dir, allowed);
    }

    // Vertical.
    this.center.y += desired.y;

    // Ground snap.
    _probe.copy(this.center);
    const reach = this.halfHeight + this.radius;
    const down = this.query(_probe, DOWN, reach + 0.6, { staticOnly: true });
    this.grounded = false;
    if (down) {
      const targetCenterY = down.point.y + reach;
      if (this.center.y <= targetCenterY + 0.02 || desired.y <= 0) {
        if (targetCenterY > this.center.y) stepUp = targetCenterY - this.center.y;
        this.center.y = targetCenterY;
        this.grounded = true;
      }
    }

    this._result.set(desired.x, desired.y, desired.z);
    return { delta: this._result, grounded: this.grounded, stepUp };
  }

  /** Cast the capsule up/down/sideways for mantle & ceiling checks. */
  sweep(dir: THREE.Vector3, maxDistance: number): number {
    if (!this.fallback) {
      return this.rw.capsuleCast(this.center, this.halfHeight, this.radius, dir, maxDistance);
    }
    _probe.copy(this.center);
    const hit = this.query(_probe, dir, maxDistance + this.radius, { staticOnly: true });
    return hit ? clamp(hit.distance - this.radius, 0, maxDistance) : maxDistance;
  }

  dispose() {
    if (!this.rw.available) return;
    if (this.ctrl) this.rw.world.removeCharacterController(this.ctrl);
    if (this.body) this.rw.world.removeRigidBody(this.body);
  }
}

const DOWN = new THREE.Vector3(0, -1, 0);
const _horiz = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _probe = new THREE.Vector3();
