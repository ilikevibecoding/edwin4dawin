import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { BodyHandle, IPhysics } from '../core/Interfaces';
import { clamp } from '../core/MathUtils';
import { B, BONES, boneLength } from './SoldierSkeleton';

/**
 * Death ragdolls.
 *
 * The corpse is eleven point masses — pelvis, chest, head, both elbows, hands,
 * knees and feet — each a real `IPhysics` sphere body, so gravity, the level
 * geometry, blast waves and the bodies around it are all the engine's problem
 * rather than something approximated here. What the engine does *not* have is
 * joints, and that is the whole design question: a soldier whose limbs are free
 * bodies is a pile of spheres within a second.
 *
 * So the joints live here, as a Gauss-Seidel projection run once per frame over
 * a working copy of the body positions. The projected copy is what the skeleton
 * is drawn from, which is the important half: bone lengths are exact by
 * construction, so no combination of impulses can stretch a limb or invert a
 * knee on screen. The bodies are then pulled toward the projected solution with
 * a clamped impulse, which keeps simulation and drawing in step without ever
 * letting the solver feed energy back — the clamp is a ceiling on how hard a
 * joint can pull, and a joint that cannot pull hard cannot explode.
 *
 * Limits are angular cones plus hinge half-spaces: knees may only bend one way,
 * elbows only the other, the neck and shoulders are coned, and the two knees and
 * the two feet repel each other so the legs never scissor through one another.
 *
 * A corpse that has stopped moving drops its bodies entirely and keeps only the
 * final pose, so a firefight's worth of dead men costs nothing but triangles.
 */

/* ---------------------------- particle layout ----------------------------- */

export const P_PELVIS = 0;
export const P_CHEST = 1;
export const P_HEAD = 2;
export const P_ELBOW_L = 3;
export const P_HAND_L = 4;
export const P_ELBOW_R = 5;
export const P_HAND_R = 6;
export const P_KNEE_L = 7;
export const P_FOOT_L = 8;
export const P_KNEE_R = 9;
export const P_FOOT_R = 10;
export const PARTICLES = 11;

/** Bone each particle sits on, so the bind pose can be read off the skeleton. */
const PARTICLE_BONE = [
  B.pelvis,
  B.chest,
  B.head,
  B.foreL,
  B.handL,
  B.foreR,
  B.handR,
  B.calfL,
  B.footL,
  B.calfR,
  B.footR,
];

/** Kilograms. Sums to roughly a man in kit. */
const MASS = [16, 22, 5.4, 2.4, 1.6, 2.4, 1.6, 6.2, 3.1, 6.2, 3.1];
/** Collision radius per particle; deliberately smaller than the limb it stands for. */
const RADIUS = [0.13, 0.14, 0.105, 0.062, 0.055, 0.062, 0.055, 0.075, 0.065, 0.075, 0.065];

const LEN_UPPER_ARM = boneLength(B.armL, B.foreL);
const LEN_FOREARM = boneLength(B.foreL, B.handL);
const LEN_THIGH = boneLength(B.thighL, B.calfL);
const LEN_CALF = boneLength(B.calfL, B.footL);
const LEN_SPINE = boneLength(B.pelvis, B.chest);
const LEN_NECK = boneLength(B.chest, B.head);

/** Bind offsets of the two anchors that hang off a driven frame. */
const SHOULDER_L = new THREE.Vector3(
  BONES[B.armL].x - BONES[B.chest].x,
  BONES[B.armL].y - BONES[B.chest].y,
  BONES[B.armL].z - BONES[B.chest].z,
);
const SHOULDER_R = new THREE.Vector3(
  BONES[B.armR].x - BONES[B.chest].x,
  BONES[B.armR].y - BONES[B.chest].y,
  BONES[B.armR].z - BONES[B.chest].z,
);
const HIP_L = new THREE.Vector3(
  BONES[B.thighL].x - BONES[B.pelvis].x,
  BONES[B.thighL].y - BONES[B.pelvis].y,
  BONES[B.thighL].z - BONES[B.pelvis].z,
);
const HIP_R = new THREE.Vector3(
  BONES[B.thighR].x - BONES[B.pelvis].x,
  BONES[B.thighR].y - BONES[B.pelvis].y,
  BONES[B.thighR].z - BONES[B.pelvis].z,
);
/**
 * Where the rifle comes to rest on a body that has stopped carrying it: laid
 * across the abdomen, chest-relative, sitting on the surface of the vest.
 *
 * It cannot simply be dropped, because the gun is skinned to a bone and the
 * bone hangs off the chest. Leaving it at its bind offset is worse than it
 * sounds: the rifle is authored down the chest's +Z, which is the direction the
 * chest faces, so a man who dies on his back ends up with the carbine standing
 * on its buttplate in the middle of his sternum with the muzzle in the air.
 */
const WEAPON_REST = new THREE.Vector3(-0.02, -0.15, 0.149);
/**
 * Turned three-quarters of a right angle about the bone's own up axis, which
 * swings the barrel out of the chest and lays it across the body instead — the
 * long axis over the ribs, the thin side plate against them, the magazine
 * pointing down towards the hips.
 */
const WEAPON_LAID = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.4);

/* -------------------------------- tuning ---------------------------------- */

const SOLVER_ITERATIONS = 7;
/** Fraction of the projection error fed back to the bodies as impulse. */
const FEEDBACK = 0.65;
/** Metres of separation past which the body is teleported rather than pulled. */
const RESYNC_DISTANCE = 0.45;
/** Metres per second a corrective impulse may impart, so a joint cannot launch. */
const MAX_CORRECTION_SPEED = 7;
/**
 * Velocity a corpse loses per second to soft tissue, ramping in over `DRAG_RAMP`
 * seconds so the first moment of the fall is still lively.
 *
 * Without it a limb that lands on a step trades momentum with the joint solver
 * for the rest of the match: neither side is wrong, and the pair of them will
 * happily swing an arm a metre in the air forever.
 */
const DRAG = 2.2;
const DRAG_RAMP = 1.4;
/** Average per-particle motion below which the corpse is considered still. */
const REST_SPEED = 0.055;
const REST_TIME = 0.4;
/** Hard cap on simulation, so a corpse wedged in geometry still settles. */
const MAX_SIM_TIME = 4.5;
/** Ceiling on the impulse a killing shot may impart, in metres per second. */
const MAX_HIT_SPEED = 6.5;

const COS_NECK = Math.cos(1.05);
const COS_SHOULDER = Math.cos(2.0);
const COS_HIP = Math.cos(1.65);

/**
 * How far a knee and an elbow may fold shut, as the straight-line distance
 * from the limb's root to its end.
 *
 * The hinge constraint decides which way a joint bends and says nothing about
 * how far, which is a limit a real body has and a chain of distance
 * constraints does not. Without it a corpse dropped from standing concertinas
 * instead of toppling: heels drawn up to the buttocks, hands folded into the
 * shoulders, the whole man a heap inside one square metre.
 *
 * A dead man's joints are limited by passive tissue, not by how far he could
 * fold them if he tried, and passive range is much shorter than active: these
 * spans are about seventy-five degrees of knee flexion and ninety of elbow,
 * which is as far as slack muscle lets a limb close under nothing but gravity.
 */
const KNEE_SPAN = 0.66;
const ELBOW_SPAN = 0.39;
/**
 * Cosine of the widest angle between the two thighs.
 *
 * This has to be measured thigh against thigh rather than as an abduction cone
 * on each hip, because the pelvis frame takes its twist from the knee axis:
 * a cone measured in that frame turns with the legs it is supposed to be
 * holding, so it never fires however far they splay. Without it a corpse lands
 * in a butterfly stretch — knees a metre apart, heels together — which is
 * anatomically impossible and reads instantly as a broken rig.
 */
const COS_THIGH_SPREAD = Math.cos(1.25);

/*
 * Scratch. Every helper below owns its own, and nothing is shared between a
 * function and its caller: the constraint solver routinely passes one scratch
 * vector as the anchor argument of the next constraint, and a helper that
 * scribbles on a shared temporary silently rewrites its own input. That is not
 * a subtle wrongness — the corpse is solved against a garbage anchor seven
 * times a frame and leaves the map.
 */
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _imp = new THREE.Vector3();
/** Anchor written by `anchor()` and read by the constraints that follow it. */
const _pin = new THREE.Vector3();
/** The two hip anchors, kept apart because the thigh limit needs both at once. */
const _pinHipL = new THREE.Vector3();
const _pinHipR = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
const GROUND_MASK = Groups.WORLD | Groups.PROP;

/** One corpse. Pooled: `active` false means the slot is free to reuse. */
export class RagdollBody {
  active = false;
  /** Rising counter used to recycle the oldest corpse first. */
  serial = 0;
  /** True once the bodies have been dropped and the pose is final. */
  settled = false;
  age = 0;

  /** Height scale of the soldier this corpse was made from. */
  h = 1;

  readonly pos: THREE.Vector3[] = [];
  readonly prev: THREE.Vector3[] = [];
  readonly work: THREE.Vector3[] = [];
  readonly proxy: THREE.Object3D[] = [];
  readonly handle: BodyHandle[] = [];
  readonly floor: number[] = [];
  /** Where each body was last frame, and the velocity that implies. */
  private readonly bodyPrev: THREE.Vector3[] = [];
  private readonly bodyVel: THREE.Vector3[] = [];

  readonly pelvisQ = new THREE.Quaternion();
  readonly chestQ = new THREE.Quaternion();

  private restTimer = 0;
  private floorCursor = 0;
  private resyncCooldown = 0;

  constructor() {
    for (let i = 0; i < PARTICLES; i++) {
      this.pos.push(new THREE.Vector3());
      this.prev.push(new THREE.Vector3());
      this.work.push(new THREE.Vector3());
      this.bodyPrev.push(new THREE.Vector3());
      this.bodyVel.push(new THREE.Vector3());
      const proxy = new THREE.Object3D();
      proxy.name = `ragdoll.p${i}`;
      proxy.matrixAutoUpdate = false;
      this.proxy.push(proxy);
      this.handle.push(0);
      this.floor.push(-Infinity);
    }
  }

  /* ------------------------------- lifetime ------------------------------- */

  /**
   * Starts a corpse from a live pose. `bonePos` holds the world position of
   * every bone as the rig last solved it, so the ragdoll begins exactly where
   * the animated soldier stood rather than snapping to a bind pose.
   */
  begin(
    physics: IPhysics | null,
    scene: THREE.Object3D,
    bonePos: THREE.Vector3[],
    velocity: THREE.Vector3,
    h: number,
    serial: number,
  ): void {
    this.active = true;
    this.settled = false;
    this.age = 0;
    this.restTimer = 0;
    this.serial = serial;
    this.h = h;
    this.resyncCooldown = 0;
    this.floorCursor = 0;

    for (let i = 0; i < PARTICLES; i++) {
      const p = this.pos[i];
      p.copy(bonePos[PARTICLE_BONE[i]]);
      this.prev[i].copy(p).addScaledVector(velocity, -1 / 60);
      this.work[i].copy(p);
      this.bodyPrev[i].copy(p);
      this.bodyVel[i].copy(velocity);
      this.floor[i] = -Infinity;
      const proxy = this.proxy[i];
      proxy.position.copy(p);
      proxy.quaternion.identity();
      proxy.updateMatrix();
      proxy.matrixWorld.copy(proxy.matrix);
      if (proxy.parent !== scene) scene.add(proxy);
    }

    this.frameFromPose(bonePos);

    if (!physics) return;
    for (let i = 0; i < PARTICLES; i++) {
      this.handle[i] = physics.addBody({
        mesh: this.proxy[i],
        mass: MASS[i] * h,
        shape: 'sphere',
        size: _v.set(RADIUS[i] * h, RADIUS[i] * h, RADIUS[i] * h),
        restitution: 0.02,
        friction: 0.92,
        linearVelocity: velocity,
        group: Groups.DEBRIS,
      });
    }
  }

  /** Seeds the two driven frames from the pose the soldier died in. */
  private frameFromPose(bonePos: THREE.Vector3[]): void {
    _up.copy(bonePos[B.chest]).sub(bonePos[B.pelvis]);
    _right.copy(bonePos[B.thighL]).sub(bonePos[B.thighR]);
    orthoFrame(_up, _right, this.pelvisQ);
    _up.copy(bonePos[B.head]).sub(bonePos[B.chest]);
    _right.copy(bonePos[B.armL]).sub(bonePos[B.armR]);
    orthoFrame(_up, _right, this.chestQ);
  }

  /** The killing shot, as an impulse at the point it landed. */
  hit(physics: IPhysics | null, particle: number, impulse: THREE.Vector3): void {
    const i = particle >= 0 && particle < PARTICLES ? particle : P_CHEST;
    const mass = MASS[i] * this.h;
    _imp.copy(impulse);
    const speed = _imp.length() / mass;
    if (speed > MAX_HIT_SPEED) _imp.multiplyScalar(MAX_HIT_SPEED / speed);
    // Give the body its share of the kick straight away so the first drawn
    // frame already leans into the shot rather than waiting for physics.
    this.prev[i].addScaledVector(_imp, -1 / (mass * 60));
    if (physics && this.handle[i]) physics.applyImpulse(this.handle[i], _imp);
  }

  /** Drops the bodies but keeps the pose. Called on settle and on release. */
  release(physics: IPhysics | null): void {
    if (!physics) return;
    for (let i = 0; i < PARTICLES; i++) {
      if (this.handle[i]) physics.removeBody(this.handle[i]);
      this.handle[i] = 0;
    }
  }

  /** Frees the slot entirely: bodies gone, proxies out of the scene. */
  recycle(physics: IPhysics | null): void {
    this.release(physics);
    for (const proxy of this.proxy) proxy.removeFromParent();
    this.active = false;
    this.settled = false;
  }

  /* -------------------------------- update -------------------------------- */

  /** Steps the joints. Returns true while the corpse is still moving. */
  update(dt: number, physics: IPhysics | null): boolean {
    if (!this.active || this.settled) return false;
    this.age += dt;
    if (this.resyncCooldown > 0) this.resyncCooldown -= dt;

    // Physics ran before the AI this frame, so the proxies already carry the
    // integrated positions. Read them, remember where they were, and project.
    const inv = 1 / Math.max(dt, 1e-4);
    for (let i = 0; i < PARTICLES; i++) {
      const p = this.pos[i];
      this.prev[i].copy(p);
      if (this.handle[i]) p.copy(this.proxy[i].position);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
        // A body that went non-finite is unrecoverable; park the corpse where
        // the last good frame left it rather than drawing a NaN skeleton.
        p.copy(this.prev[i]);
        this.settle(physics);
        return false;
      }
      this.bodyVel[i].subVectors(p, this.bodyPrev[i]).multiplyScalar(inv);
      this.bodyPrev[i].copy(p);
      this.work[i].copy(p);
    }

    this.sampleFloor(physics);
    for (let it = 0; it < SOLVER_ITERATIONS; it++) this.project(it === SOLVER_ITERATIONS - 1);
    this.updateFrames();

    if (physics) this.feedback(physics, dt);

    // Rest is measured on the drawn pose rather than on the bodies. The bodies
    // sit a constant fraction of a centimetre off their joints even at rest,
    // and a metric that counts that offset never reaches zero.
    let motion = 0;
    for (let i = 0; i < PARTICLES; i++) {
      motion += this.work[i].distanceTo(this.prev[i]);
      this.pos[i].copy(this.work[i]);
    }

    const speed = motion / (PARTICLES * Math.max(dt, 1e-4));
    if (speed < REST_SPEED) this.restTimer += dt;
    else this.restTimer = 0;
    if (this.restTimer > REST_TIME || this.age > MAX_SIM_TIME) {
      this.settle(physics);
      return false;
    }
    return true;
  }

  private settle(physics: IPhysics | null): void {
    this.release(physics);
    this.settled = true;
  }

  /**
   * Refreshes one particle's floor height per frame. The bodies do their own
   * collision; this is only the backstop that stops the projection pushing a
   * limb through the ground between physics steps.
   */
  private sampleFloor(physics: IPhysics | null): void {
    if (!physics) return;
    const i = this.floorCursor;
    this.floorCursor = (this.floorCursor + 1) % PARTICLES;
    const p = this.pos[i];
    _v.set(p.x, p.y + 0.6, p.z);
    const hit = physics.raycast(_v, DOWN, 2.4, GROUND_MASK);
    this.floor[i] = hit ? hit.point.y : -Infinity;
  }

  /* ------------------------------ constraints ----------------------------- */

  private project(last: boolean): void {
    const w = this.work;
    const h = this.h;

    // Spine and neck, both stiff: a corpse whose torso stretches reads as
    // rubber however good the limbs are.
    distance(w[P_PELVIS], w[P_CHEST], LEN_SPINE * h, 0.42, 0.58, 1);
    distance(w[P_CHEST], w[P_HEAD], LEN_NECK * h, 0.25, 0.75, 1);

    // Limbs hang off anchors carried by the torso frames rather than off the
    // torso particles, so shoulders sit at shoulder width and hips at hip width.
    this.anchor(SHOULDER_L, this.chestQ, w[P_CHEST], w[P_ELBOW_L], LEN_UPPER_ARM * h, _pin);
    coneLimit(w[P_ELBOW_L], _pin, this.chestQ, -1, COS_SHOULDER, LEN_UPPER_ARM * h);
    distance(w[P_ELBOW_L], w[P_HAND_L], LEN_FOREARM * h, 0.4, 0.6, 1);
    hinge(_pin, w[P_ELBOW_L], w[P_HAND_L], this.chestQ, -1);
    extend(_pin, w[P_HAND_L], ELBOW_SPAN * h);

    this.anchor(SHOULDER_R, this.chestQ, w[P_CHEST], w[P_ELBOW_R], LEN_UPPER_ARM * h, _pin);
    coneLimit(w[P_ELBOW_R], _pin, this.chestQ, -1, COS_SHOULDER, LEN_UPPER_ARM * h);
    distance(w[P_ELBOW_R], w[P_HAND_R], LEN_FOREARM * h, 0.4, 0.6, 1);
    hinge(_pin, w[P_ELBOW_R], w[P_HAND_R], this.chestQ, -1);
    extend(_pin, w[P_HAND_R], ELBOW_SPAN * h);

    this.anchor(HIP_L, this.pelvisQ, w[P_PELVIS], w[P_KNEE_L], LEN_THIGH * h, _pinHipL);
    coneLimit(w[P_KNEE_L], _pinHipL, this.pelvisQ, -1, COS_HIP, LEN_THIGH * h);
    distance(w[P_KNEE_L], w[P_FOOT_L], LEN_CALF * h, 0.45, 0.55, 1);
    hinge(_pinHipL, w[P_KNEE_L], w[P_FOOT_L], this.pelvisQ, 1);
    extend(_pinHipL, w[P_FOOT_L], KNEE_SPAN * h);

    this.anchor(HIP_R, this.pelvisQ, w[P_PELVIS], w[P_KNEE_R], LEN_THIGH * h, _pinHipR);
    coneLimit(w[P_KNEE_R], _pinHipR, this.pelvisQ, -1, COS_HIP, LEN_THIGH * h);
    distance(w[P_KNEE_R], w[P_FOOT_R], LEN_CALF * h, 0.45, 0.55, 1);
    hinge(_pinHipR, w[P_KNEE_R], w[P_FOOT_R], this.pelvisQ, 1);
    extend(_pinHipR, w[P_FOOT_R], KNEE_SPAN * h);

    converge(_pinHipL, w[P_KNEE_L], _pinHipR, w[P_KNEE_R], COS_THIGH_SPREAD);

    // Head cone, measured against the chest's own up axis.
    coneLimit(w[P_HEAD], w[P_CHEST], this.chestQ, 1, COS_NECK, LEN_NECK * h);

    // Limbs must not pass through one another.
    separate(w[P_KNEE_L], w[P_KNEE_R], 0.17 * h);
    separate(w[P_FOOT_L], w[P_FOOT_R], 0.17 * h);
    separate(w[P_HAND_L], w[P_HAND_R], 0.13 * h);
    separate(w[P_ELBOW_L], w[P_CHEST], 0.19 * h);
    separate(w[P_ELBOW_R], w[P_CHEST], 0.19 * h);
    separate(w[P_HEAD], w[P_PELVIS], 0.3 * h);

    if (!last) return;
    // The clamp sits at exactly the height the sphere rests at, not below it:
    // a backstop that disagrees with the contact it is backing up becomes a
    // spring, and the corpse hums against the floor for the rest of the match.
    for (let i = 0; i < PARTICLES; i++) {
      const floor = this.floor[i];
      if (floor === -Infinity) continue;
      const rest = floor + RADIUS[i] * h;
      if (this.work[i].y < rest) this.work[i].y = rest;
    }
  }

  /**
   * Constrains a limb root to an anchor rigidly carried by a torso frame. The
   * torso takes a quarter of the correction so a heavy limb still drags the
   * body rather than being silently teleported.
   */
  private anchor(
    offset: THREE.Vector3,
    frame: THREE.Quaternion,
    torso: THREE.Vector3,
    limb: THREE.Vector3,
    length: number,
    outAnchor: THREE.Vector3,
  ): void {
    outAnchor.copy(offset).multiplyScalar(this.h).applyQuaternion(frame).add(torso);
    _av.copy(limb).sub(outAnchor);
    const d = _av.length();
    if (d < 1e-6) {
      limb.copy(outAnchor);
      limb.y -= length;
      return;
    }
    const error = d - length;
    _av.multiplyScalar(error / d);
    limb.addScaledVector(_av, -0.78);
    torso.addScaledVector(_av, 0.22);
    outAnchor.addScaledVector(_av, 0.22);
  }

  /** Swing-tracks the two torso frames onto the current particle layout. */
  private updateFrames(): void {
    const w = this.work;
    _up.copy(w[P_CHEST]).sub(w[P_PELVIS]);
    _right.copy(w[P_KNEE_L]).sub(w[P_KNEE_R]);
    trackFrame(this.pelvisQ, _up, _right, 0.3);
    // Both torso frames take their up axis from the spine and differ only in
    // their reference across the body — hips from the knees, shoulders from
    // the elbows — which is what carries the twist between them. Taking the
    // chest's up from the head instead is circular: the neck cone below is
    // measured against a frame that chases the very head it is limiting, so
    // the head is free to fold onto the chest and the cone never fires.
    _right.copy(w[P_ELBOW_L]).sub(w[P_ELBOW_R]);
    trackFrame(this.chestQ, _up, _right, 0.25);
  }

  /**
   * Pulls the bodies onto the projected pose, and bleeds the corpse's energy
   * away so it always stops.
   *
   * The correction is a velocity target rather than a force: the impulse only
   * makes up the difference between how fast the body is *already* closing on
   * its joint and how fast it needs to. An impulse proportional to the error
   * alone — which is the obvious way to write this — adds momentum on every
   * frame regardless of the momentum it added last frame, and the solver and
   * the rigid body then take turns overshooting each other until an arm is
   * swinging a metre off the ground with no sign of stopping.
   */
  private feedback(physics: IPhysics, dt: number): void {
    const inv = 1 / Math.max(dt, 1e-3);
    const drag = Math.min(1, (this.age / DRAG_RAMP) * DRAG * dt);
    let resync = false;
    for (let i = 0; i < PARTICLES; i++) {
      const handle = this.handle[i];
      if (!handle) continue;
      const mass = MASS[i] * this.h;

      _v.copy(this.bodyVel[i]).multiplyScalar(-mass * drag);
      physics.applyImpulse(handle, _v);

      _imp.copy(this.work[i]).sub(this.pos[i]);
      const d = _imp.length();
      if (d < 1e-5) continue;
      if (d > RESYNC_DISTANCE && this.resyncCooldown <= 0) {
        resync = true;
        continue;
      }
      _imp.multiplyScalar(1 / d);
      const closing = this.bodyVel[i].dot(_imp);
      const want = Math.min(d * inv * FEEDBACK, MAX_CORRECTION_SPEED);
      const change = clamp(want - closing, -MAX_CORRECTION_SPEED, MAX_CORRECTION_SPEED);
      if (Math.abs(change) < 1e-4) continue;
      physics.applyImpulse(handle, _imp.multiplyScalar(mass * change));
    }
    if (resync) this.resync(physics);
  }

  /**
   * A body that has been dragged far from its joint — jammed in geometry, or
   * blown through a wall — cannot be pulled back by an impulse that is capped.
   * Rebuilding it at the projected position is the only honest fix, and it is
   * rate limited because doing it every frame would mean no simulation at all.
   */
  private resync(physics: IPhysics): void {
    this.resyncCooldown = 0.4;
    for (let i = 0; i < PARTICLES; i++) {
      if (!this.handle[i]) continue;
      physics.removeBody(this.handle[i]);
      const proxy = this.proxy[i];
      proxy.position.copy(this.work[i]);
      proxy.updateMatrix();
      proxy.matrixWorld.copy(proxy.matrix);
      this.bodyPrev[i].copy(this.work[i]);
      this.bodyVel[i].set(0, 0, 0);
      this.handle[i] = physics.addBody({
        mesh: proxy,
        mass: MASS[i] * this.h,
        shape: 'sphere',
        size: _v.set(RADIUS[i] * this.h, RADIUS[i] * this.h, RADIUS[i] * this.h),
        restitution: 0.02,
        friction: 0.92,
        group: Groups.DEBRIS,
      });
    }
  }

  /* -------------------------------- output -------------------------------- */

  /** Writes the corpse pose onto a skeleton. `root` is the soldier's group. */
  pose(root: THREE.Object3D, bones: THREE.Bone[]): void {
    const w = this.pos;
    root.position.copy(w[P_PELVIS]);
    root.quaternion.identity();

    bones[0].quaternion.identity();
    bones[0].position.set(0, 0, 0);
    bones[B.pelvis].position.set(0, 0, 0);
    bones[B.pelvis].quaternion.copy(this.pelvisQ);

    // The spine carries the pelvis-to-chest twist in three equal thirds, which
    // composes back to exactly the chest frame while reading as a curve.
    _q.copy(this.pelvisQ).invert().multiply(this.chestQ);
    fraction(_q, 1 / 3, _q);
    bones[B.spine1].quaternion.copy(_q);
    bones[B.spine2].quaternion.copy(_q);
    bones[B.chest].quaternion.copy(_q);

    // Neck and head follow the head particle, split so the neck bends less.
    _v.copy(w[P_HEAD]).sub(w[P_CHEST]).normalize();
    localAim(bones[B.neck], this.chestQ, UP_Y, _v, 0.45);
    _q.copy(this.chestQ).multiply(bones[B.neck].quaternion);
    localAim(bones[B.head], _q, UP_Y, _v, 1);

    bones[B.clavL].quaternion.identity();
    bones[B.clavR].quaternion.identity();

    // The rifle is skinned to a bone the live rig drives from world space, and
    // nothing below would otherwise touch it: left alone the corpse keeps the
    // barrel angle it died holding, composed against a chest frame that has
    // since fallen over, and the gun ends up welded through him at a random
    // attitude.
    bones[B.weapon].position.copy(WEAPON_REST);
    bones[B.weapon].quaternion.copy(WEAPON_LAID);

    this.limb(bones, SHOULDER_L, this.chestQ, w[P_CHEST], w[P_ELBOW_L], w[P_HAND_L], true, false);
    this.limb(bones, SHOULDER_R, this.chestQ, w[P_CHEST], w[P_ELBOW_R], w[P_HAND_R], false, false);
    this.limb(bones, HIP_L, this.pelvisQ, w[P_PELVIS], w[P_KNEE_L], w[P_FOOT_L], true, true);
    this.limb(bones, HIP_R, this.pelvisQ, w[P_PELVIS], w[P_KNEE_R], w[P_FOOT_R], false, true);
  }

  /** Aims one two-bone chain down a pair of world-space segments. */
  private limb(
    bones: THREE.Bone[],
    offset: THREE.Vector3,
    frame: THREE.Quaternion,
    torso: THREE.Vector3,
    mid: THREE.Vector3,
    end: THREE.Vector3,
    left: boolean,
    leg: boolean,
  ): void {
    const rootBone = leg ? (left ? B.thighL : B.thighR) : left ? B.armL : B.armR;
    const midBone = leg ? (left ? B.calfL : B.calfR) : left ? B.foreL : B.foreR;
    const endBone = leg ? (left ? B.footL : B.footR) : left ? B.handL : B.handR;
    const bindRoot = leg
      ? left
        ? DIR_THIGH_L
        : DIR_THIGH_R
      : left
        ? DIR_ARM_L
        : DIR_ARM_R;
    const bindMid = leg ? (left ? DIR_CALF_L : DIR_CALF_R) : left ? DIR_FORE_L : DIR_FORE_R;

    _pin.copy(offset).multiplyScalar(this.h).applyQuaternion(frame).add(torso);
    _v.copy(mid).sub(_pin).normalize();
    // Clavicles and pelvis are unrotated relative to their parents here, so the
    // limb root's parent frame is whichever torso frame carries the anchor.
    localAim(bones[rootBone], frame, bindRoot, _v, 1);
    _q.copy(frame).multiply(bones[rootBone].quaternion);
    _v.copy(end).sub(mid).normalize();
    localAim(bones[midBone], _q, bindMid, _v, 1);
    bones[endBone].quaternion.identity();
    if (leg) bones[left ? B.toeL : B.toeR].quaternion.identity();
  }
}

/* ------------------------------- the pool --------------------------------- */

export class RagdollPool {
  private slots: RagdollBody[] = [];
  private serial = 0;
  /** Corpses whose bodies are still being simulated, for the perf readout. */
  simulating = 0;

  constructor(
    private physics: IPhysics | null,
    private scene: THREE.Object3D,
    public capacity: number,
  ) {}

  setCapacity(capacity: number): void {
    this.capacity = Math.max(0, capacity);
    while (this.liveCount > this.capacity) this.retireOldest();
  }

  get liveCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.active) n++;
    return n;
  }

  /** Claims a corpse, recycling the oldest when the pool is full. */
  acquire(): RagdollBody | null {
    if (this.capacity <= 0) return null;
    if (this.liveCount >= this.capacity) this.retireOldest();
    for (const s of this.slots) {
      if (!s.active) {
        s.serial = ++this.serial;
        return s;
      }
    }
    if (this.slots.length >= this.capacity + 2) return null;
    const made = new RagdollBody();
    made.serial = ++this.serial;
    this.slots.push(made);
    return made;
  }

  /** The corpse a freed slot belonged to must be told; returns the retired one. */
  private retireOldest(): RagdollBody | null {
    let oldest: RagdollBody | null = null;
    for (const s of this.slots) {
      if (!s.active) continue;
      if (!oldest || s.serial < oldest.serial) oldest = s;
    }
    if (oldest) {
      oldest.recycle(this.physics);
      this.onRetire?.(oldest);
    }
    return oldest;
  }

  /** Set by the AI system so the agent owning a recycled corpse can hide it. */
  onRetire: ((body: RagdollBody) => void) | null = null;

  update(dt: number): void {
    let sim = 0;
    for (const s of this.slots) {
      if (!s.active) continue;
      if (s.update(dt, this.physics)) sim++;
    }
    this.simulating = sim;
  }

  clear(): void {
    for (const s of this.slots) {
      if (s.active) {
        s.recycle(this.physics);
        this.onRetire?.(s);
      }
    }
  }

  dispose(): void {
    this.clear();
    this.slots.length = 0;
  }
}

/* -------------------------------- helpers --------------------------------- */

const UP_Y = new THREE.Vector3(0, 1, 0);
const DIR_THIGH_L = dirBetween(B.thighL, B.calfL);
const DIR_CALF_L = dirBetween(B.calfL, B.footL);
const DIR_THIGH_R = dirBetween(B.thighR, B.calfR);
const DIR_CALF_R = dirBetween(B.calfR, B.footR);
const DIR_ARM_L = dirBetween(B.armL, B.foreL);
const DIR_FORE_L = dirBetween(B.foreL, B.handL);
const DIR_ARM_R = dirBetween(B.armR, B.foreR);
const DIR_FORE_R = dirBetween(B.foreR, B.handR);

function dirBetween(a: number, b: number): THREE.Vector3 {
  return new THREE.Vector3(
    BONES[b].x - BONES[a].x,
    BONES[b].y - BONES[a].y,
    BONES[b].z - BONES[a].z,
  ).normalize();
}

const _av = new THREE.Vector3();
const _dv = new THREE.Vector3();
const _sv = new THREE.Vector3();

/** Holds two points a fixed distance apart, sharing the correction by weight. */
function distance(
  a: THREE.Vector3,
  b: THREE.Vector3,
  rest: number,
  wa: number,
  wb: number,
  stiffness: number,
): void {
  _dv.copy(b).sub(a);
  const d = _dv.length();
  if (d < 1e-6) {
    b.y -= rest;
    return;
  }
  const scale = ((d - rest) / d) * stiffness;
  a.addScaledVector(_dv, wa * scale);
  b.addScaledVector(_dv, -wb * scale);
}

/** One-sided: pushes two points apart when they are closer than `min`. */
function separate(a: THREE.Vector3, b: THREE.Vector3, min: number): void {
  _sv.copy(b).sub(a);
  const d = _sv.length();
  if (d >= min || d < 1e-6) return;
  const scale = ((d - min) / d) * 0.5;
  a.addScaledVector(_sv, scale);
  b.addScaledVector(_sv, -scale);
}

const _cAxis = new THREE.Vector3();
const _cDir = new THREE.Vector3();
const _cPerp = new THREE.Vector3();
const _cQ = new THREE.Quaternion();
const _hFwd = new THREE.Vector3();
const _hAxis = new THREE.Vector3();
const _hSide = new THREE.Vector3();
const _hArm = new THREE.Vector3();

/**
 * Keeps a joint inside a cone about a frame axis. `sign` picks the axis
 * direction: +1 for the frame's up (the neck), -1 for its down (limbs hanging).
 */
function coneLimit(
  point: THREE.Vector3,
  anchor: THREE.Vector3,
  frame: THREE.Quaternion,
  sign: number,
  cosLimit: number,
  length: number,
): void {
  _cAxis.set(0, sign, 0).applyQuaternion(frame);
  _cDir.copy(point).sub(anchor);
  const d = _cDir.length();
  if (d < 1e-6) return;
  _cDir.multiplyScalar(1 / d);
  const cos = _cDir.dot(_cAxis);
  if (cos >= cosLimit) return;
  // Rotate the limb back to the cone's rim about the axis perpendicular to both.
  _cPerp.crossVectors(_cAxis, _cDir);
  if (_cPerp.lengthSq() < 1e-8) return;
  _cPerp.normalize();
  const angle = Math.acos(clamp(cos, -1, 1)) - Math.acos(clamp(cosLimit, -1, 1));
  _cQ.setFromAxisAngle(_cPerp, -angle);
  _cDir.applyQuaternion(_cQ);
  point.copy(anchor).addScaledVector(_cDir, Math.min(d, length));
}

/**
 * Half-space hinge: a knee may only break backwards and an elbow only forwards,
 * so the middle joint is pushed onto the correct side of the root-to-end line.
 * `sign` is +1 when the joint must lead the frame's forward axis (knees) and -1
 * when it must trail it (elbows).
 */
function hinge(
  root: THREE.Vector3,
  mid: THREE.Vector3,
  end: THREE.Vector3,
  frame: THREE.Quaternion,
  sign: number,
): void {
  _hFwd.set(0, 0, sign).applyQuaternion(frame);
  _hAxis.copy(end).sub(root);
  const len = _hAxis.length();
  if (len < 1e-5) return;
  _hAxis.multiplyScalar(1 / len);
  // Component of the forward axis across the limb; that is the allowed side.
  _hSide.copy(_hFwd).addScaledVector(_hAxis, -_hFwd.dot(_hAxis));
  if (_hSide.lengthSq() < 1e-6) return;
  _hSide.normalize();
  _hArm.copy(mid).sub(root);
  const across = _hArm.dot(_hSide);
  // A little bias, so a straight limb still knows which way it must fold.
  const want = 0.02 * len;
  if (across >= want) return;
  mid.addScaledVector(_hSide, (want - across) * 0.75);
}

const _sA = new THREE.Vector3();
const _sB = new THREE.Vector3();
const _sPerp = new THREE.Vector3();
const _sQ = new THREE.Quaternion();

/**
 * Holds a pair of limbs within `cosLimit` of one another, rotating each half of
 * the excess back about their common perpendicular. Frame-free by construction,
 * which is the point: it is the only way to limit abduction on a pelvis whose
 * own idea of sideways is taken from the legs.
 */
function converge(
  rootA: THREE.Vector3,
  endA: THREE.Vector3,
  rootB: THREE.Vector3,
  endB: THREE.Vector3,
  cosLimit: number,
): void {
  _sA.copy(endA).sub(rootA);
  _sB.copy(endB).sub(rootB);
  const la = _sA.length();
  const lb = _sB.length();
  if (la < 1e-5 || lb < 1e-5) return;
  _sA.multiplyScalar(1 / la);
  _sB.multiplyScalar(1 / lb);
  const cos = _sA.dot(_sB);
  if (cos >= cosLimit) return;
  _sPerp.crossVectors(_sA, _sB);
  if (_sPerp.lengthSq() < 1e-8) return;
  _sPerp.normalize();
  const half = (Math.acos(clamp(cos, -1, 1)) - Math.acos(clamp(cosLimit, -1, 1))) * 0.5;
  _sQ.setFromAxisAngle(_sPerp, half);
  endA.copy(rootA).addScaledVector(_sA.applyQuaternion(_sQ), la);
  _sQ.setFromAxisAngle(_sPerp, -half);
  endB.copy(rootB).addScaledVector(_sB.applyQuaternion(_sQ), lb);
}

const _eDir = new THREE.Vector3();

/**
 * Stops a hinge folding shut, by holding the root and the end of a two-bone
 * limb a minimum distance apart. Only the end moves: the root is an anchor the
 * torso carries and has already had its say.
 */
function extend(anchor: THREE.Vector3, end: THREE.Vector3, minSpan: number): void {
  _eDir.copy(end).sub(anchor);
  const d = _eDir.length();
  if (d >= minSpan) return;
  if (d < 1e-6) {
    end.y -= minSpan;
    return;
  }
  end.addScaledVector(_eDir, (minSpan / d - 1) * 0.6);
}

const _oRight = new THREE.Vector3();
const _oFwd = new THREE.Vector3();
const _oM = new THREE.Matrix4();
const _tv = new THREE.Vector3();
const _tq = new THREE.Quaternion();

/**
 * Builds an orthonormal frame whose +Y is `up` and whose +X leans toward
 * `right`, degenerating gracefully when the two are parallel.
 */
function orthoFrame(up: THREE.Vector3, right: THREE.Vector3, out: THREE.Quaternion): void {
  if (up.lengthSq() < 1e-8) up.set(0, 1, 0);
  up.normalize();
  _oRight.copy(right).addScaledVector(up, -right.dot(up));
  if (_oRight.lengthSq() < 1e-6) {
    _oRight.set(1, 0, 0).addScaledVector(up, -up.x);
    if (_oRight.lengthSq() < 1e-6) _oRight.set(0, 0, 1);
  }
  _oRight.normalize();
  _oFwd.crossVectors(_oRight, up).normalize();
  _oM.makeBasis(_oRight, up, _oFwd);
  out.setFromRotationMatrix(_oM);
}

/**
 * Rotates a frame so its up axis follows `up`, keeping the twist it already
 * had and letting `right` pull the twist round by `twistRate` per frame. Swing
 * tracking is what stops a corpse spinning on the spot when its legs happen to
 * line up with its spine and the reference axis vanishes.
 */
function trackFrame(
  frame: THREE.Quaternion,
  up: THREE.Vector3,
  right: THREE.Vector3,
  twistRate: number,
): void {
  if (up.lengthSq() < 1e-8) return;
  up.normalize();
  _tv.set(0, 1, 0).applyQuaternion(frame);
  _tq.setFromUnitVectors(_tv, up);
  frame.premultiply(_tq).normalize();

  const across = right.addScaledVector(up, -right.dot(up));
  if (across.lengthSq() < 4e-3) return;
  across.normalize();
  _tv.set(1, 0, 0).applyQuaternion(frame);
  _tq.setFromUnitVectors(_tv, across);
  // Only take a fraction: the reference axis is noisy and a full snap reads as
  // a twitch every time a knee crosses the spine.
  fraction(_tq, twistRate, _tq);
  frame.premultiply(_tq).normalize();
}

const _fAxis = new THREE.Vector3();

/** q^t, for splitting a rotation across a chain. */
function fraction(q: THREE.Quaternion, t: number, out: THREE.Quaternion): void {
  const w = clamp(q.w, -1, 1);
  const angle = 2 * Math.acos(Math.abs(w));
  const s = Math.sqrt(Math.max(0, 1 - w * w));
  if (angle < 1e-5 || s < 1e-6) {
    out.identity();
    return;
  }
  const sign = w < 0 ? -1 : 1;
  _fAxis.set((q.x / s) * sign, (q.y / s) * sign, (q.z / s) * sign);
  out.setFromAxisAngle(_fAxis, angle * t);
}

const _invQ = new THREE.Quaternion();
const _local = new THREE.Vector3();

/** Aims a bone's bind direction at a world direction, blended by `weight`. */
function localAim(
  bone: THREE.Bone,
  parentWorld: THREE.Quaternion,
  bind: THREE.Vector3,
  worldDir: THREE.Vector3,
  weight: number,
): void {
  if (worldDir.lengthSq() < 1e-8) {
    bone.quaternion.identity();
    return;
  }
  _invQ.copy(parentWorld).invert();
  _local.copy(worldDir).applyQuaternion(_invQ).normalize();
  bone.quaternion.setFromUnitVectors(bind, _local);
  if (weight < 1) fraction(bone.quaternion, weight, bone.quaternion);
}

/** Maps a struck bone to the ragdoll particle nearest it. */
export function particleForBone(bone: number): number {
  switch (bone) {
    case B.head:
    case B.neck:
      return P_HEAD;
    case B.chest:
    case B.spine2:
    case B.clavL:
    case B.clavR:
      return P_CHEST;
    case B.armL:
    case B.foreL:
      return P_ELBOW_L;
    case B.handL:
      return P_HAND_L;
    case B.armR:
    case B.foreR:
      return P_ELBOW_R;
    case B.handR:
      return P_HAND_R;
    case B.thighL:
    case B.calfL:
      return P_KNEE_L;
    case B.footL:
    case B.toeL:
      return P_FOOT_L;
    case B.thighR:
    case B.calfR:
      return P_KNEE_R;
    case B.footR:
    case B.toeR:
      return P_FOOT_R;
    default:
      return P_PELVIS;
  }
}
