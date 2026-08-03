import * as THREE from 'three';
import { clamp, clamp01, damp, easeOutCubic, lerp, smoothstep, TAU } from '../../core/math';

/**
 * Procedural humanoid rig and state machine.
 *
 * The rig is a plain `Object3D` hierarchy — no skinning, no imported
 * animations. Poses are evaluated analytically each frame, and the pelvis is
 * lowered by the lowest sole so feet never sink through or float above the
 * deck. Characters always face their direction of travel.
 */

export type CharacterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'aim'
  | 'fire'
  | 'react'
  | 'fall'
  | 'down'
  | 'interact'
  | 'crouch'
  | 'kneel';

export interface RigProportions {
  /** Distance from the sole to the hip pivot. */
  hipHeight: number;
  thigh: number;
  shin: number;
  ankle: number;
  spine: number;
  neck: number;
  headRadius: number;
  shoulderWidth: number;
  hipWidth: number;
  upperArm: number;
  foreArm: number;
  /** Multiplier on limb swing — droids and armoured troopers move stiffer. */
  stiffness: number;
  /** Metres covered per full two-step cycle when walking. */
  strideLength: number;
}

export const DEFAULT_PROPORTIONS: RigProportions = {
  hipHeight: 0.95,
  thigh: 0.44,
  shin: 0.42,
  ankle: 0.09,
  spine: 0.5,
  neck: 0.1,
  headRadius: 0.115,
  shoulderWidth: 0.2,
  hipWidth: 0.11,
  upperArm: 0.29,
  foreArm: 0.27,
  stiffness: 1,
  strideLength: 0.86,
};

export interface Joints {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  handL: THREE.Group;
  handR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  ankleL: THREE.Group;
  ankleR: THREE.Group;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();

// Scratch vectors for the arm solver.
const _t = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _upper = new THREE.Vector3();
const _fore = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _ay = new THREE.Vector3();
const _az = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _grip = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/**
 * Orient a two-bone arm from explicit segment directions.
 *
 * `upperDir` and `foreDir` are unit vectors in the shoulder's parent space.
 * The hand lands at `shoulder + l1·upperDir + l2·foreDir`, and the hand's local
 * -Y ends up along `foreDir` — which is what lets a weapon mounted down the
 * forearm point exactly where the pose intends.
 */
function orientArm(
  shoulder: THREE.Object3D,
  elbow: THREE.Object3D,
  upperDir: THREE.Vector3,
  foreDir: THREE.Vector3,
  fallbackNormal: THREE.Vector3,
): void {
  const bend = Math.acos(clamp(upperDir.dot(foreDir), -1, 1));
  _ax.crossVectors(upperDir, foreDir);
  if (_ax.lengthSq() < 1e-10) _ax.crossVectors(upperDir, fallbackNormal);
  if (_ax.lengthSq() < 1e-10) _ax.set(1, 0, 0);
  _ax.normalize();
  _ay.copy(upperDir).multiplyScalar(-1);
  _az.crossVectors(_ax, _ay);
  _basis.makeBasis(_ax, _ay, _az);
  shoulder.quaternion.setFromRotationMatrix(_basis);
  elbow.rotation.set(bend, 0, 0);
  elbow.quaternion.setFromEuler(elbow.rotation);
}

/**
 * Two-bone IK: place the hand on `target` (shoulder's parent space) with the
 * elbow pushed toward `pole`.
 */
function reachArm(
  shoulder: THREE.Object3D,
  elbow: THREE.Object3D,
  l1: number,
  l2: number,
  target: THREE.Vector3,
  pole: THREE.Vector3,
): void {
  _t.copy(target).sub(shoulder.position);
  let d = _t.length();
  const max = (l1 + l2) * 0.995;
  const min = Math.abs(l1 - l2) + 0.03;
  if (d < 1e-5) {
    _t.set(0, -min, 0);
    d = min;
  } else if (d > max) {
    _t.multiplyScalar(max / d);
    d = max;
  } else if (d < min) {
    _t.multiplyScalar(min / d);
    d = min;
  }
  _dir.copy(_t).divideScalar(d);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  _perp.copy(pole).addScaledVector(_dir, -pole.dot(_dir));
  if (_perp.lengthSq() < 1e-8) _perp.set(0, 0, -1).addScaledVector(_dir, _dir.z);
  _perp.normalize();
  _upper.copy(_dir).multiplyScalar(Math.cos(a)).addScaledVector(_perp, Math.sin(a));
  _fore.copy(_t).addScaledVector(_upper, -l1);
  if (_fore.lengthSq() < 1e-10) _fore.copy(_upper);
  else _fore.normalize();
  orientArm(shoulder, elbow, _upper, _fore, _perp);
}

export abstract class CharacterRig {
  readonly root = new THREE.Group();
  readonly joints: Joints;
  readonly p: RigProportions;
  readonly displayName: string;
  readonly description: string;

  state: CharacterState = 'idle';
  /** Metres per second along the current path. */
  speed = 0;
  /** Facing in radians; damped toward `targetHeading`. */
  heading = 0;
  targetHeading = 0;
  /** World point the head tries to look at, if any. */
  lookTarget: THREE.Vector3 | null = null;
  /** World point weapons point toward, if any. */
  aimTarget: THREE.Vector3 | null = null;

  /** True when the figure carries a weapon in its right hand. */
  protected armed = false;
  /** The weapon node, rotated each frame so the barrel tracks the aim point. */
  protected weapon: THREE.Object3D | null = null;

  protected cyclePhase = 0;
  protected stateTime = 0;
  protected reactImpulse = 0;
  protected fireImpulse = 0;
  protected fallProgress = 0;
  protected interactAmount = 0;
  protected crouchAmount = 0;
  protected weaponPose = 0;
  protected blend = 1;
  protected contactShadow: THREE.Mesh | null = null;
  protected contactRadius = 0.55;
  protected contactStrength = 0.66;
  protected path: THREE.Vector3[] = [];
  protected pathIndex = 0;
  protected pathSpeed = 1.35;
  protected onPathComplete: (() => void) | null = null;
  protected seedPhase: number;

  constructor(name: string, description: string, proportions: Partial<RigProportions> = {}, seed = 0) {
    this.displayName = name;
    this.description = description;
    this.p = { ...DEFAULT_PROPORTIONS, ...proportions };
    this.seedPhase = seed;
    this.root.name = `Character:${name}`;
    this.joints = buildJoints(this.p);
    this.root.add(this.joints.body);
    this.joints.root = this.root;
  }

  // -- navigation ----------------------------------------------------------

  setPosition(x: number, y: number, z: number): this {
    this.root.position.set(x, y, z);
    return this;
  }

  setHeading(rad: number): this {
    this.heading = rad;
    this.targetHeading = rad;
    this.root.rotation.y = rad;
    return this;
  }

  faceTowards(point: THREE.Vector3): void {
    this.targetHeading = Math.atan2(point.x - this.root.position.x, point.z - this.root.position.z);
  }

  /** Queue a world-space walking path. */
  followPath(points: Array<[number, number, number]> | THREE.Vector3[], speed = 1.35, onDone?: () => void): void {
    this.path = points.map((p) =>
      Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone(),
    );
    this.pathIndex = 0;
    this.pathSpeed = speed;
    this.onPathComplete = onDone ?? null;
  }

  clearPath(): void {
    this.path = [];
    this.pathIndex = 0;
    this.speed = 0;
  }

  get isWalking(): boolean {
    return this.pathIndex < this.path.length;
  }

  /** Teleport onto a path position (used when the timeline is scrubbed). */
  snapToPathProgress(distance: number): void {
    if (this.path.length === 0) return;
    let remaining = distance;
    let idx = 0;
    const start = this.root.position.clone();
    let cursor = start;
    while (idx < this.path.length) {
      const seg = this.path[idx].clone().sub(cursor);
      const len = seg.length();
      if (remaining <= len || len < 1e-5) {
        if (len > 1e-5) cursor = cursor.clone().add(seg.multiplyScalar(remaining / len));
        break;
      }
      remaining -= len;
      cursor = this.path[idx].clone();
      idx++;
    }
    this.root.position.copy(cursor);
    this.pathIndex = Math.min(idx, this.path.length - 1);
  }

  // -- state ---------------------------------------------------------------

  setState(state: CharacterState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateTime = 0;
    if (state === 'fall') this.fallProgress = 0;
  }

  /** Trigger a one-shot flinch. */
  react(strength = 1): void {
    this.reactImpulse = Math.min(1.4, this.reactImpulse + strength);
  }

  /** Trigger a one-shot weapon recoil. */
  recoil(strength = 1): void {
    this.fireImpulse = Math.min(1.5, this.fireImpulse + strength);
  }

  // -- update --------------------------------------------------------------

  update(dt: number, elapsed: number): void {
    this.stateTime += dt;
    this.advancePath(dt);
    this.updateHeading(dt);
    this.evaluatePose(dt, elapsed);
    this.onUpdate(dt, elapsed);
    this.updateContactShadow();
  }

  /** Hook for subclasses (capes, dome spin, saber glow...). */
  protected onUpdate(_dt: number, _elapsed: number): void {}

  private advancePath(dt: number): void {
    if (this.pathIndex >= this.path.length) {
      this.speed = damp(this.speed, 0, 0.12, dt);
      return;
    }
    const target = this.path[this.pathIndex];
    _v.copy(target).sub(this.root.position);
    _v.y = 0;
    const dist = _v.length();
    if (dist < 0.06) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.speed = 0;
        const cb = this.onPathComplete;
        this.onPathComplete = null;
        cb?.();
      }
      return;
    }
    // Ease into and out of the path so nobody starts at full sprint.
    const desired = this.pathSpeed * clamp01(dist / 0.7);
    this.speed = damp(this.speed, desired, 0.18, dt);
    _v.normalize();
    this.root.position.addScaledVector(_v, this.speed * dt);
    this.targetHeading = Math.atan2(_v.x, _v.z);
    if (this.state !== 'run') this.setState(this.pathSpeed > 2.1 ? 'run' : 'walk');
  }

  private updateHeading(dt: number): void {
    let delta = this.targetHeading - this.heading;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    this.heading += delta * (1 - Math.exp(-dt / 0.16));
    this.root.rotation.y = this.heading;
  }

  protected evaluatePose(dt: number, elapsed: number): void {
    const j = this.joints;
    const p = this.p;
    const stiff = p.stiffness;

    this.reactImpulse = damp(this.reactImpulse, 0, 0.16, dt);
    this.fireImpulse = damp(this.fireImpulse, 0, 0.07, dt);

    const moving = this.speed > 0.06;
    const running = this.state === 'run';
    const stride = running ? p.strideLength * 1.6 : p.strideLength;
    if (moving) this.cyclePhase = (this.cyclePhase + (this.speed * dt) / stride) % 1;
    else this.cyclePhase = damp(this.cyclePhase % 1, Math.round(this.cyclePhase) % 1, 0.2, dt);

    const amp = clamp01(this.speed / (running ? 3.2 : 1.5)) * stiff;
    const ph = this.cyclePhase * TAU;
    const breath = Math.sin(elapsed * 1.5 + this.seedPhase) * 0.5 + 0.5;

    // --- crouch / kneel -----------------------------------------------------
    const wantCrouch = this.state === 'crouch' || this.state === 'kneel' ? 1 : 0;
    this.crouchAmount = damp(this.crouchAmount, wantCrouch, 0.16, dt);
    const kneel = this.state === 'kneel' ? this.crouchAmount : 0;
    const crouch = this.state === 'crouch' ? this.crouchAmount : 0;

    // --- legs ---------------------------------------------------------------
    // Sign convention: +hip swings the knee backwards, +knee folds the shin
    // backwards (anatomical). Flexion therefore always uses positive knee
    // angles, and a straight leg is 0/0.
    const swing = 0.5 * amp;
    const kneeBase = running ? 1.25 : 0.8;
    const lift = (phase: number): number => Math.max(0, -Math.cos(phase - 0.35)) * kneeBase * amp;

    let hipLA = Math.sin(ph) * swing;
    let hipRA = Math.sin(ph + Math.PI) * swing;
    let kneeLA = lift(ph);
    let kneeRA = lift(ph + Math.PI);

    // Squat: both knees drive forward, shins fold back, pelvis drops ~0.35 m.
    if (crouch > 0.001) {
      hipLA = lerp(hipLA, -1.15, crouch);
      hipRA = lerp(hipRA, -1.15, crouch);
      kneeLA = lerp(kneeLA, 1.8, crouch);
      kneeRA = lerp(kneeRA, 1.8, crouch);
    }
    // Kneel: left knee folds onto the deck, right leg stays planted in front.
    if (kneel > 0.001) {
      hipLA = lerp(hipLA, -0.05, kneel);
      kneeLA = lerp(kneeLA, 1.82, kneel);
      hipRA = lerp(hipRA, -1.35, kneel);
      kneeRA = lerp(kneeRA, 2.08, kneel);
    }

    j.hipL.rotation.x = hipLA;
    j.hipR.rotation.x = hipRA;
    j.kneeL.rotation.x = kneeLA;
    j.kneeR.rotation.x = kneeRA;
    // Keep the soles roughly parallel to the deck.
    j.ankleL.rotation.x = -(hipLA + kneeLA) * 0.82;
    j.ankleR.rotation.x = -(hipRA + kneeRA) * 0.82;
    // Slight outward stance stops legs from intersecting.
    j.hipL.rotation.z = 0.03 + crouch * 0.12 + kneel * 0.05;
    j.hipR.rotation.z = -0.03 - crouch * 0.12 - kneel * 0.05;

    // Ground the pelvis on the lowest contact. `soleHeight` is measured from
    // the hip pivot, and the hips already sit `hipHeight` above the body
    // origin, so the correction is the sum of the two — not just the sole.
    // When kneeling, the down knee is the contact rather than the sole.
    let lowest = Math.min(soleHeight(p, hipLA, kneeLA), soleHeight(p, hipRA, kneeRA));
    if (kneel > 0.001) {
      lowest = Math.min(lowest, -p.thigh * Math.cos(hipLA) - 0.1 * kneel);
    }
    const groundOffset = -(p.hipHeight + lowest);
    j.body.position.y = groundOffset;

    // --- torso --------------------------------------------------------------
    const lean = clamp(this.speed * 0.055, 0, 0.2) + crouch * 0.25 + kneel * 0.12;
    const bob = Math.sin(ph * 2) * 0.018 * amp;
    j.body.position.y += bob;
    j.hips.rotation.y = Math.sin(ph) * 0.09 * amp;
    j.hips.rotation.x = lean * 0.4;
    j.chest.rotation.y = -Math.sin(ph) * 0.14 * amp;
    j.chest.rotation.x =
      lean * 0.6 + breath * 0.012 - this.reactImpulse * 0.35 + this.fireImpulse * 0.06;
    j.chest.rotation.z = Math.sin(ph) * 0.03 * amp;

    // Turn the torso toward the aim point before the arms are solved, so the
    // whole upper body commits to the target rather than just the hands.
    if (this.aimTarget) {
      _v.copy(this.aimTarget);
      this.root.updateWorldMatrix(true, false);
      _m.copy(this.root.matrixWorld).invert();
      _v.applyMatrix4(_m);
      const yaw = clamp(Math.atan2(_v.x, _v.z), -0.8, 0.8);
      const pitch = clamp(
        Math.atan2(_v.y - (p.hipHeight + p.spine), Math.hypot(_v.x, _v.z)),
        -0.45,
        0.45,
      );
      j.chest.rotation.y += yaw * 0.7;
      j.chest.rotation.x -= pitch * 0.45;
      j.hips.rotation.y += yaw * 0.2;
    }

    // --- arms ---------------------------------------------------------------
    const armSwing = 0.5 * amp * (running ? 1.35 : 1);
    let shoulderLX = -Math.sin(ph) * armSwing;
    let shoulderRX = -Math.sin(ph + Math.PI) * armSwing;
    let elbowLX = 0.22 + Math.max(0, Math.sin(ph + 0.6)) * 0.5 * amp;
    let elbowRX = 0.22 + Math.max(0, Math.sin(ph + Math.PI + 0.6)) * 0.5 * amp;
    let shoulderLZ = 0.14 + amp * 0.03;
    let shoulderRZ = -0.14 - amp * 0.03;

    const aiming = this.state === 'aim' || this.state === 'fire';
    const interacting = this.state === 'interact';
    this.interactAmount = damp(this.interactAmount, interacting ? 1 : 0, 0.2, dt);
    if (this.interactAmount > 0.001) {
      const a = this.interactAmount;
      const reach = Math.sin(elapsed * 2.2 + this.seedPhase) * 0.1;
      shoulderRX = lerp(shoulderRX, -1.05 + reach, a);
      elbowRX = lerp(elbowRX, 0.75, a);
      shoulderRZ = lerp(shoulderRZ, -0.18, a);
      shoulderLX = lerp(shoulderLX, -0.7, a * 0.7);
      elbowLX = lerp(elbowLX, 1.05, a * 0.7);
    }

    if (this.reactImpulse > 0.01) {
      shoulderLX -= this.reactImpulse * 0.5;
      shoulderRX -= this.reactImpulse * 0.35;
      elbowLX += this.reactImpulse * 0.4;
    }

    j.shoulderL.rotation.set(shoulderLX, 0, shoulderLZ);
    j.shoulderR.rotation.set(shoulderRX, 0, shoulderRZ);
    j.elbowL.rotation.x = elbowLX;
    j.elbowR.rotation.x = elbowRX;

    // Armed figures keep both hands on the weapon instead of swinging their
    // arms. The pose is solved with two-bone IK so hands land on authored
    // points and elbows stay outside the torso.
    this.weaponPose = damp(this.weaponPose, this.armed && !interacting ? 1 : 0, 0.14, dt);
    if (this.weaponPose > 0.002) {
      const a = aiming ? smoothstep(this.stateTime / 0.3) : 0;
      const kick = this.fireImpulse * 0.05;
      // Chest-space hand targets: low-ready across the waist, or up on the
      // shoulder line when aiming.
      _grip.set(
        lerp(-0.21, -0.19, a),
        lerp(-0.12, 0.06, a) - kick,
        lerp(0.19, 0.3, a) - kick * 1.6,
      );
      _pole.set(-0.65, -1, -0.2).normalize();
      this.blendArm(j.shoulderR, j.elbowR, p, _grip, _pole, this.weaponPose);
      _grip.set(lerp(-0.03, 0.0, a), lerp(-0.16, -0.01, a), lerp(0.31, 0.45, a));
      _pole.set(0.7, -1, -0.15).normalize();
      this.blendArm(j.shoulderL, j.elbowL, p, _grip, _pole, this.weaponPose);
    }

    // --- head ---------------------------------------------------------------
    j.neck.rotation.set(0, 0, 0);
    j.head.rotation.set(-lean * 0.5 + this.reactImpulse * 0.2, 0, 0);
    const look = this.lookTarget ?? this.aimTarget;
    if (look) {
      this.applyLookAt(look);
    } else if (!moving) {
      j.head.rotation.y = Math.sin(elapsed * 0.32 + this.seedPhase) * 0.22;
      j.head.rotation.x += Math.sin(elapsed * 0.21 + this.seedPhase * 2) * 0.05;
    }

    // --- knocked down --------------------------------------------------------
    // The figure topples straight backwards from where it stood and comes to
    // rest flat on its back: feet stay on the marker, head ends up behind.
    // Deliberately undramatic — no impact contortion, nothing graphic.
    if (this.state === 'fall' || this.state === 'down') {
      const target = this.state === 'down' ? 1 : clamp01(this.stateTime / 0.9);
      this.fallProgress = Math.max(this.fallProgress, target);
      this.applyFallPose(easeOutCubic(this.fallProgress), groundOffset);
    } else if (this.fallProgress > 0.002) {
      this.fallProgress = damp(this.fallProgress, 0, 0.2, dt);
      this.applyFallPose(easeOutCubic(this.fallProgress), groundOffset);
    } else {
      this.fallProgress = 0;
      j.body.rotation.set(0, 0, 0);
      j.body.position.z = 0;
    }

    if (this.weapon) this.updateWeaponAim();
  }

  /** Swing the held weapon onto the aim point, or to a safe carry angle. */
  private updateWeaponAim(): void {
    const j = this.joints;
    if (this.fallProgress > 0.3) {
      // Dropped hand: let the weapon hang along the forearm.
      this.weapon!.quaternion.setFromAxisAngle(_ax.set(1, 0, 0), Math.PI / 2);
      return;
    }
    const aiming = this.state === 'aim' || this.state === 'fire';
    j.handR.updateWorldMatrix(true, false);
    _v2.setFromMatrixPosition(j.handR.matrixWorld);
    if (aiming && this.aimTarget) {
      _v.copy(this.aimTarget).sub(_v2);
    } else {
      // Muzzle forward and angled down: a carried, non-threatening weapon.
      this.root.updateWorldMatrix(true, false);
      _v.set(0, 0, 1).transformDirection(this.root.matrixWorld);
      _v.y = aiming ? 0 : -0.55;
    }
    if (_v.lengthSq() < 1e-8) return;
    _v.normalize();
    this.aimWeaponAlong(_v);
  }

  /** Lay the figure on its back; `f` is 0 (upright) to 1 (settled). */
  private applyFallPose(f: number, groundOffset: number): void {
    const j = this.joints;
    const p = this.p;
    const roll = Math.sin(this.seedPhase * 3.7) * 0.22;
    j.body.rotation.set(-f * (Math.PI / 2 - 0.06), 0, roll * f);
    // Pivot about the ankles so the boots stay where the figure was standing,
    // then lift by half the torso depth so the back rests on the deck.
    const ankle = p.hipHeight - (p.thigh + p.shin + p.ankle);
    j.body.position.y = groundOffset * (1 - f) + f * (0.16 + p.headRadius + ankle);
    j.body.position.z = f * (p.ankle + 0.06);
    j.hips.rotation.x = f * 0.12;
    j.chest.rotation.set(f * 0.2, 0, 0);
    j.hipL.rotation.x = lerp(j.hipL.rotation.x, -0.16, f);
    j.hipR.rotation.x = lerp(j.hipR.rotation.x, -0.05, f);
    j.kneeL.rotation.x = lerp(j.kneeL.rotation.x, 0.55, f);
    j.kneeR.rotation.x = lerp(j.kneeR.rotation.x, 0.22, f);
    j.ankleL.rotation.x = lerp(j.ankleL.rotation.x, -0.3, f);
    j.ankleR.rotation.x = lerp(j.ankleR.rotation.x, -0.2, f);
    j.shoulderL.rotation.set(-0.35 * f, 0, 0.7 * f);
    j.shoulderR.rotation.set(-0.2 * f, 0, -0.8 * f);
    j.elbowL.rotation.set(0.5 * f, 0, 0);
    j.elbowR.rotation.set(0.35 * f, 0, 0);
    j.neck.rotation.set(0, 0, 0);
    j.head.rotation.set(f * 0.3, f * 0.35, 0);
  }

  /**
   * Solve one arm onto a chest-space target and blend it over whatever the
   * cycle animation produced, so weapon poses fade in and out cleanly.
   */
  private blendArm(
    shoulder: THREE.Object3D,
    elbow: THREE.Object3D,
    p: RigProportions,
    target: THREE.Vector3,
    pole: THREE.Vector3,
    weight: number,
  ): void {
    if (weight >= 0.999) {
      reachArm(shoulder, elbow, p.upperArm, p.foreArm, target, pole);
      return;
    }
    _q.setFromEuler(shoulder.rotation);
    const elbowX = elbow.rotation.x;
    reachArm(shoulder, elbow, p.upperArm, p.foreArm, target, pole);
    shoulder.quaternion.slerpQuaternions(_q, shoulder.quaternion, weight);
    elbow.rotation.x = lerp(elbowX, elbow.rotation.x, weight);
  }

  /**
   * Rotate the held weapon so its barrel (local +Z) points along `worldDir`.
   * Keeps the weapon level by using world up as the roll reference.
   */
  protected aimWeaponAlong(worldDir: THREE.Vector3): void {
    const w = this.weapon;
    if (!w || !w.parent) return;
    w.parent.updateWorldMatrix(true, false);
    _m.copy(w.parent.matrixWorld).invert();
    _az.copy(worldDir).transformDirection(_m);
    if (_az.lengthSq() < 1e-8) return;
    _az.normalize();
    _ay.set(0, 1, 0).transformDirection(_m).normalize();
    _ax.crossVectors(_ay, _az);
    if (_ax.lengthSq() < 1e-8) _ax.set(1, 0, 0).transformDirection(_m).normalize();
    _ax.normalize();
    _ay.crossVectors(_az, _ax).normalize();
    _basis.makeBasis(_ax, _ay, _az);
    w.quaternion.setFromRotationMatrix(_basis);
  }

  protected applyLookAt(worldPoint: THREE.Vector3): void {
    const j = this.joints;
    this.joints.neck.updateWorldMatrix(true, false);
    _m.copy(this.joints.neck.matrixWorld).invert();
    _v2.copy(worldPoint).applyMatrix4(_m);
    const yaw = clamp(Math.atan2(_v2.x, _v2.z), -1.1, 1.1);
    const pitch = clamp(-Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z)), -0.55, 0.55);
    j.head.rotation.y = yaw;
    j.head.rotation.x += pitch;
  }

  /**
   * Attach a soft contact patch under the figure.
   *
   * Interior point lights do not cast shadows (six-face shadow cubes for nine
   * luminaires is not affordable here), and without any contact darkening
   * every figure looks like it is hovering a few centimetres off the deck.
   */
  addContactShadow(texture: THREE.Texture, radius = 0.55): void {
    if (this.contactShadow) return;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: texture,
        color: 0x05070a,
        transparent: true,
        opacity: this.contactStrength,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    mesh.name = 'contactShadow';
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.012;
    mesh.scale.setScalar(radius * 2);
    mesh.renderOrder = -1;
    mesh.matrixAutoUpdate = true;
    this.contactShadow = mesh;
    this.contactRadius = radius;
    this.root.add(mesh);
  }

  /** Keep the contact patch under the body's centre of mass. */
  protected updateContactShadow(): void {
    const s = this.contactShadow;
    if (!s) return;
    const f = this.fallProgress;
    const drop = clamp01((this.p.hipHeight - (this.joints.body.position.y + this.p.hipHeight)) / 0.5);
    s.position.set(0, 0.012, this.joints.body.position.z - f * 0.75);
    // Tighter and darker when crouched, longer and softer when knocked down.
    const w = this.contactRadius * 2 * (1 - drop * 0.25) * (1 + f * 0.35);
    const l = this.contactRadius * 2 * (1 - drop * 0.2) * (1 + f * 1.9);
    s.scale.set(w, l, 1);
    (s.material as THREE.MeshBasicMaterial).opacity =
      this.contactStrength * (0.82 + drop * 0.18) * (1 - f * 0.2);
  }

  /** World-space position of the character's eyes. */
  eyePosition(out: THREE.Vector3): THREE.Vector3 {
    this.joints.head.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.joints.head.matrixWorld);
  }

  /** World-space position of the weapon muzzle (overridden when armed). */
  muzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    this.joints.handR.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.joints.handR.matrixWorld);
  }
}

/** Forward-kinematic sole height for one leg, relative to the pelvis origin. */
function soleHeight(p: RigProportions, hipAngle: number, kneeAngle: number): number {
  const kneeY = -p.thigh * Math.cos(hipAngle);
  const ankleY = kneeY - p.shin * Math.cos(hipAngle + kneeAngle);
  return ankleY - p.ankle;
}

function group(name: string, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

function buildJoints(p: RigProportions): Joints {
  const body = group('body');
  const hips = group('hips', 0, p.hipHeight, 0);
  body.add(hips);

  const chest = group('chest', 0, p.spine * 0.55, 0);
  hips.add(chest);
  const neck = group('neck', 0, p.spine * 0.45 + p.neck, 0);
  chest.add(neck);
  const head = group('head', 0, p.headRadius * 0.85, 0);
  neck.add(head);

  const shoulderL = group('shoulderL', p.shoulderWidth, p.spine * 0.4, 0);
  const shoulderR = group('shoulderR', -p.shoulderWidth, p.spine * 0.4, 0);
  chest.add(shoulderL, shoulderR);
  const elbowL = group('elbowL', 0, -p.upperArm, 0);
  const elbowR = group('elbowR', 0, -p.upperArm, 0);
  shoulderL.add(elbowL);
  shoulderR.add(elbowR);
  const handL = group('handL', 0, -p.foreArm, 0);
  const handR = group('handR', 0, -p.foreArm, 0);
  elbowL.add(handL);
  elbowR.add(handR);

  const hipL = group('hipL', p.hipWidth, 0, 0);
  const hipR = group('hipR', -p.hipWidth, 0, 0);
  hips.add(hipL, hipR);
  const kneeL = group('kneeL', 0, -p.thigh, 0);
  const kneeR = group('kneeR', 0, -p.thigh, 0);
  hipL.add(kneeL);
  hipR.add(kneeR);
  const ankleL = group('ankleL', 0, -p.shin, 0);
  const ankleR = group('ankleR', 0, -p.shin, 0);
  kneeL.add(ankleL);
  kneeR.add(ankleR);

  return {
    root: body,
    body,
    hips,
    chest,
    neck,
    head,
    shoulderL,
    shoulderR,
    elbowL,
    elbowR,
    handL,
    handR,
    hipL,
    hipR,
    kneeL,
    kneeR,
    ankleL,
    ankleR,
  };
}
