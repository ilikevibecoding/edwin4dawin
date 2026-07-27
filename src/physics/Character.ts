/**
 * Kinematic character controller.
 *
 * Geometry contract, because the player and AI modules both need to agree on
 * it: **`position` is the FEET** — the point where the bottom of the capsule
 * touches the floor. The capsule collider is offset upward by half the current
 * height from the body origin, so changing stance moves the head, never the
 * feet, and `position` can be fed straight into ground sampling and footstep FX.
 *
 *   feet   = position
 *   head   = position + (0, height, 0)
 *   centre = position + (0, height / 2, 0)
 *
 * The controller keeps a collision skin (`PHYS.characterOffset`) between the
 * capsule and the world, so the capsule actually rests that far above the floor.
 * The body therefore sits at `position + skin` and `position` reads as the true
 * contact point, which is what footstep FX and enemy mesh placement need.
 *
 * Stairs and kerbs are handled by `stepAssist` rather than by trusting Rapier's
 * own autostep, which only fires at sprint speeds — see the note there. Steps up
 * to `GAMEPLAY.player.stepHeight` are climbed at any walk speed and anything
 * taller is refused, so callers can treat `stepHeight` as an exact limit.
 */
import * as THREE from 'three';
import type {
  Ball,
  Capsule,
  Collider,
  KinematicCharacterController,
  RigidBody,
  World,
} from '@dimforge/rapier3d-compat';
import { RAPIER } from './Rapier';
import type { CharacterControllerHandle, PhysicsUserData } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import { GAMEPLAY } from '../core/Config';
import { DEG2RAD } from '../core/MathUtils';
import type { ColliderRegistry } from './Registry';
import type { QueryEngine } from './Queries';
import { CHARACTER_FILTER, ENEMY_GROUPS, PLAYER_GROUPS, queryGroups } from './Groups';
import { PHYS } from './Tuning';

/** Minimum capsule radius, so prone still has a body rather than a point. */
const MIN_RADIUS = 0.14;

/** Relative rounding error of a float32 translation read back out of Rapier. */
const F32_EPSILON = 2 ** -22;

export interface CharacterOptions {
  world: World;
  registry: ColliderRegistry;
  queries: QueryEngine;
  onDestroy: (handle: CharacterHandle) => void;
}

export class CharacterHandle implements CharacterControllerHandle {
  readonly position = new THREE.Vector3();
  readonly groundNormal = new THREE.Vector3(0, 1, 0);
  grounded = false;
  groundSurface: SurfaceType = 'concrete';

  readonly body: RigidBody;
  readonly collider: Collider;

  private readonly world: World;
  private readonly registry: ColliderRegistry;
  private readonly queries: QueryEngine;
  private readonly controller: KinematicCharacterController;
  private readonly onDestroy: (handle: CharacterHandle) => void;
  private readonly collisionOut = new RAPIER.CharacterCollision();
  private readonly motion = new THREE.Vector3();
  private readonly stepped = new THREE.Vector3();
  private readonly probeNormal = new THREE.Vector3(0, 1, 0);
  private readonly desired = { x: 0, y: 0, z: 0 };
  private readonly nextTranslation = { x: 0, y: 0, z: 0 };
  private readonly probeShape: Ball;
  private readonly fitShape: Capsule;

  private readonly filterGroups: number;
  private readonly probeGroups: number;
  /** Collision skin the controller keeps between the capsule and the world. */
  private readonly skin = PHYS.characterOffset;
  private snapEnabled = true;
  private destroyed = false;

  height: number;
  radius: number;

  constructor(
    opts: CharacterOptions,
    position: THREE.Vector3,
    height: number,
    radius: number,
    userData: PhysicsUserData | undefined,
  ) {
    this.world = opts.world;
    this.registry = opts.registry;
    this.queries = opts.queries;
    this.onDestroy = opts.onDestroy;

    this.height = Math.max(0.3, height);
    this.radius = clampRadius(this.height, radius);
    this.position.copy(position);

    const team = userData?.entity?.team ?? userData?.team;
    this.filterGroups = team === 'enemy' ? ENEMY_GROUPS : PLAYER_GROUPS;
    this.probeGroups = queryGroups(CHARACTER_FILTER);

    this.body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(position.x, position.y + this.skin, position.z)
        .setCcdEnabled(false),
    );

    const desc = RAPIER.ColliderDesc.capsule(this.halfHeight(), this.radius)
      .setTranslation(0, this.height * 0.5, 0)
      .setDensity(0)
      .setFriction(PHYS.characterFriction)
      .setRestitution(0)
      .setCollisionGroups(this.filterGroups);
    this.collider = this.world.createCollider(desc, this.body);
    this.registry.register(this.collider, userData, this, userData?.surface ?? 'flesh');

    this.probeShape = new RAPIER.Ball(this.radius);
    this.fitShape = new RAPIER.Capsule(this.halfHeight(), this.radius);

    const controller = this.world.createCharacterController(PHYS.characterOffset);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setSlideEnabled(true);
    controller.setMaxSlopeClimbAngle(GAMEPLAY.player.maxSlopeDeg * DEG2RAD);
    // Anything the character cannot climb, it slides off, so a 60-degree rubble
    // pile never becomes a standable ledge.
    controller.setMinSlopeSlideAngle(
      (GAMEPLAY.player.maxSlopeDeg + PHYS.characterSlideAngleBias) * DEG2RAD,
    );
    controller.enableAutostep(
      GAMEPLAY.player.stepHeight,
      Math.min(PHYS.characterAutostepMinWidth, this.radius * 0.6),
      true,
    );
    controller.enableSnapToGround(PHYS.characterSnapDistance);
    controller.setApplyImpulsesToDynamicBodies(true);
    controller.setCharacterMass(GAMEPLAY.player.mass);
    this.controller = controller;
  }

  move(displacement: THREE.Vector3, _dt: number): THREE.Vector3 {
    if (this.destroyed) return this.motion.set(0, 0, 0);

    let dx = displacement.x;
    let dy = displacement.y;
    let dz = displacement.z;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) {
      return this.motion.set(0, 0, 0);
    }
    // Bound the sweep so an integration blow-up elsewhere cannot turn one move
    // into a map-wide shape cast. Rapier sweeps the capsule, so nothing tunnels
    // below this cap either.
    const len = Math.hypot(dx, dy, dz);
    if (len > PHYS.characterMaxStep) {
      const s = PHYS.characterMaxStep / len;
      dx *= s;
      dy *= s;
      dz *= s;
    }

    // Snapping while rising would cancel a jump on its first frame.
    const wantSnap = dy <= 1e-4;
    if (wantSnap !== this.snapEnabled) {
      if (wantSnap) this.controller.enableSnapToGround(PHYS.characterSnapDistance);
      else this.controller.disableSnapToGround();
      this.snapEnabled = wantSnap;
    }

    this.syncColliderIfStale();
    this.sweep(dx, dy, dz);

    const applied = this.controller.computedMovement();
    let ax = applied.x;
    let ay = applied.y;
    let az = applied.z;
    let grounded = this.controller.computedGrounded();

    const requested = Math.hypot(dx, dz);
    if (
      requested > 1e-4 &&
      dy <= 1e-4 &&
      (grounded || this.grounded) &&
      Math.hypot(ax, az) < requested * PHYS.characterStepBlockedFraction
    ) {
      const rise = this.stepAssist(dx / requested, dz / requested, requested);
      if (rise > 0) {
        ax = this.stepped.x;
        ay = rise + this.stepped.y;
        az = this.stepped.z;
        grounded = true;
      }
    }

    this.position.x += ax;
    this.position.y += ay;
    this.position.z += az;
    this.writeBodyTarget(false);

    this.grounded = grounded;
    this.resolveGround();
    return this.motion.set(ax, ay, az);
  }

  setPosition(p: THREE.Vector3): void {
    if (this.destroyed) return;
    this.position.copy(p);
    // Both, so the teleport is visible to queries immediately and the kinematic
    // integrator does not sweep the capsule across the map next step.
    this.writeBodyTarget(true);
    this.grounded = false;
  }

  setHeight(height: number): boolean {
    if (this.destroyed) return false;
    const target = Math.max(0.3, height);
    if (Math.abs(target - this.height) < 1e-4) return true;
    if (target > this.height && this.isBlockedAbove(target)) return false;

    this.height = target;
    this.radius = clampRadius(target, this.radius);
    this.collider.setRadius(this.radius);
    this.collider.setHalfHeight(this.halfHeight());
    this.collider.setTranslationWrtParent({ x: 0, y: target * 0.5, z: 0 });
    this.probeShape.radius = this.radius;
    this.controller.enableAutostep(
      GAMEPLAY.player.stepHeight,
      Math.min(PHYS.characterAutostepMinWidth, this.radius * 0.6),
      true,
    );
    return true;
  }

  isBlockedAbove(height: number): boolean {
    if (this.destroyed) return false;
    const target = Math.max(0.3, height);
    const delta = target - this.height;
    if (delta <= 1e-4) return false;

    // Sweep a ball through exactly the volume the taller capsule would newly
    // occupy: from the current crown up to the crown it is trying to reach.
    const r = Math.max(this.radius, clampRadius(target, this.radius)) * 0.96;
    const bottom = this.position.y + this.skin;
    const startY = Math.max(bottom + this.height - r, bottom + r + 0.01);
    const endY = bottom + target - r;
    const distance = endY - startY;
    if (distance <= 1e-4) return false;

    this.probeShape.radius = r;
    return this.queries.castShapeUp(
      this.position.x,
      startY,
      this.position.z,
      this.probeShape,
      distance,
      this.probeGroups,
      this.collider,
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.registry.unregister(this.collider);
    this.registry.unregisterBody(this.body);
    this.world.removeCharacterController(this.controller);
    this.world.removeRigidBody(this.body);
    this.onDestroy(this);
  }

  private halfHeight(): number {
    return Math.max(0.01, this.height * 0.5 - this.radius);
  }

  private sweep(dx: number, dy: number, dz: number): void {
    this.desired.x = dx;
    this.desired.y = dy;
    this.desired.z = dz;
    this.controller.computeColliderMovement(
      this.collider,
      this.desired,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      this.filterGroups,
    );
  }

  /**
   * Rapier's autostep is displacement-sensitive: measured against a 0.40 m kerb
   * it only fires above roughly 0.05 m of horizontal movement per step, which at
   * 120 Hz means the character has to be sprinting. Anything slower sticks on
   * kerbs and stairs, so when a mostly-horizontal move comes back blocked, look
   * for a ledge within `stepHeight` and lift the capsule onto it.
   *
   * Returns the rise applied, having left the resolved horizontal movement in
   * `stepped`, or 0 when no step was taken.
   */
  private stepAssist(ndx: number, ndz: number, requested: number): number {
    const maxRise = GAMEPLAY.player.stepHeight;
    // Probe just past the capsule surface: the obstruction we are touching is at
    // most a radius plus the skin away, and looking barely beyond it keeps narrow
    // stair treads from being mistaken for the next riser up.
    const ahead = this.radius + this.skin + PHYS.characterStepProbeAhead;
    const px = this.position.x + ndx * ahead;
    const pz = this.position.z + ndz * ahead;
    const from = this.position.y + maxRise + 0.02;

    const ledgeY = this.queries.surfaceBelow(
      px,
      from,
      pz,
      maxRise + 0.12,
      this.probeGroups,
      this.collider,
      this.probeNormal,
    );
    const rise = ledgeY - this.position.y;
    if (!(rise > PHYS.characterStepMinRise) || rise > maxRise) return 0;
    // A ledge steeper than the character can walk is a slope to slide off, not a
    // step to climb onto.
    if (this.probeNormal.y < Math.cos(GAMEPLAY.player.maxSlopeDeg * DEG2RAD)) return 0;

    const r = this.radius * 0.96;
    this.fitShape.radius = r;
    this.fitShape.halfHeight = Math.max(0.01, this.height * 0.5 - r);
    if (
      !this.queries.shapeFits(
        this.position.x,
        ledgeY + this.skin + this.height * 0.5,
        this.position.z,
        this.fitShape,
        this.probeGroups,
        this.collider,
      )
    ) {
      return 0;
    }

    // Lift, then let the controller resolve the horizontal move from up there so
    // the final contact set is Rapier's, not ours.
    this.setColliderTranslation(this.position.x, this.position.y + rise + this.skin, this.position.z);
    this.sweep(ndx * requested, 0, ndz * requested);
    const stepped = this.controller.computedMovement();
    if (Math.hypot(stepped.x, stepped.z) < requested * 0.5) {
      // The lift bought nothing, so put the capsule back rather than leave the
      // character hovering beside the step.
      this.setColliderTranslation(this.position.x, this.position.y + this.skin, this.position.z);
      return 0;
    }
    this.stepped.set(stepped.x, stepped.y, stepped.z);
    return rise;
  }

  private setColliderTranslation(x: number, y: number, z: number): void {
    this.nextTranslation.x = x;
    this.nextTranslation.y = y;
    this.nextTranslation.z = z;
    this.body.setTranslation(this.nextTranslation, false);
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  /** Point the kinematic integrator at `position`, optionally teleporting there now. */
  private writeBodyTarget(immediate: boolean): void {
    this.nextTranslation.x = this.position.x;
    this.nextTranslation.y = this.position.y + this.skin;
    this.nextTranslation.z = this.position.z;
    if (immediate) {
      this.body.setTranslation(this.nextTranslation, false);
      this.world.propagateModifiedBodyPositionsToColliders();
    }
    this.body.setNextKinematicTranslation(this.nextTranslation);
  }

  /**
   * The body only reaches the position computed by the last `move` when the
   * world next steps. If a caller moves twice between steps — or once on a
   * frame that ran no steps at all — the collider is behind and the next sweep
   * would start from the wrong place, so catch it up first.
   *
   * The tolerance has to scale with the coordinate: Rapier stores translations as
   * f32, so a readback out at x = 700 differs from the f64 original by ~3e-5 and a
   * fixed epsilon would resync on every single move.
   */
  private syncColliderIfStale(): void {
    const t = this.body.translation();
    const targetY = this.position.y + this.skin;
    const scale = Math.max(Math.abs(this.position.x), Math.abs(targetY), Math.abs(this.position.z));
    const tolerance = 1e-5 + scale * F32_EPSILON;
    if (
      Math.abs(t.x - this.position.x) > tolerance ||
      Math.abs(t.y - targetY) > tolerance ||
      Math.abs(t.z - this.position.z) > tolerance
    ) {
      this.setColliderTranslation(this.position.x, targetY, this.position.z);
    }
  }

  /**
   * Ground normal and surface come from the controller's own contact list where
   * possible — it already did the work. Snap-to-ground can report grounded with
   * no recorded contact, in which case a single short ray fills the gap. The
   * surface drives footstep audio and impact FX, so it has to be right.
   */
  private resolveGround(): void {
    if (!this.grounded) return;

    const cosLimit = Math.cos((GAMEPLAY.player.maxSlopeDeg + 6) * DEG2RAD);
    let bestDot = cosLimit;
    let bestHandle = -1;
    const n = this.controller.numComputedCollisions();
    for (let i = 0; i < n; i++) {
      const hit = this.controller.computedCollision(i, this.collisionOut);
      if (!hit || !hit.collider) continue;
      const normal = hit.normal1;
      if (normal.y > bestDot) {
        bestDot = normal.y;
        bestHandle = hit.collider.handle;
        this.groundNormal.set(normal.x, normal.y, normal.z);
      }
    }

    if (bestHandle !== -1) {
      this.groundSurface = this.registry.surfaceOf(bestHandle);
      return;
    }

    this.probeNormal.set(0, 1, 0);
    const surface = this.queries.groundProbe(
      this.position.x,
      this.position.y + this.skin + 0.1,
      this.position.z,
      PHYS.characterGroundProbe,
      this.probeGroups,
      this.collider,
      this.probeNormal,
    );
    if (surface) {
      this.groundSurface = surface;
      this.groundNormal.copy(this.probeNormal);
    } else {
      this.groundNormal.set(0, 1, 0);
    }
  }
}

function clampRadius(height: number, radius: number): number {
  return Math.max(MIN_RADIUS, Math.min(radius, height * 0.5 - 0.02));
}
