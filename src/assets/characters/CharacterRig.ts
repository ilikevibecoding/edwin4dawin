import * as THREE from 'three';
import { clamp, clamp01, damp, easeOutCubic, smoothstep, TAU } from '../../core/math';

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

  protected cyclePhase = 0;
  protected stateTime = 0;
  protected reactImpulse = 0;
  protected fireImpulse = 0;
  protected fallProgress = 0;
  protected interactAmount = 0;
  protected crouchAmount = 0;
  protected blend = 1;
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
    const wantCrouch = this.state === 'crouch' ? 1 : this.state === 'kneel' ? 1 : 0;
    this.crouchAmount = damp(this.crouchAmount, wantCrouch, 0.16, dt);
    const kneel = this.state === 'kneel' ? this.crouchAmount : 0;
    const crouch = this.state === 'crouch' ? this.crouchAmount : 0;

    // --- legs ---------------------------------------------------------------
    const swing = 0.52 * amp;
    const hipLA = Math.sin(ph) * swing - crouch * 0.5 - kneel * 0.75;
    const hipRA = Math.sin(ph + Math.PI) * swing - crouch * 0.5 - kneel * 0.2;
    const kneeBase = running ? 1.15 : 0.85;
    const kneeLA = -Math.max(0, Math.sin(ph + 1.15)) * kneeBase * amp - crouch * 1.0 - kneel * 1.5;
    const kneeRA = -Math.max(0, Math.sin(ph + Math.PI + 1.15)) * kneeBase * amp - crouch * 1.0 - kneel * 0.4;

    j.hipL.rotation.x = hipLA;
    j.hipR.rotation.x = hipRA;
    j.kneeL.rotation.x = kneeLA;
    j.kneeR.rotation.x = kneeRA;
    j.ankleL.rotation.x = -hipLA * 0.35 - kneeLA * 0.5;
    j.ankleR.rotation.x = -hipRA * 0.35 - kneeRA * 0.5;
    // Slight outward stance stops legs from intersecting.
    j.hipL.rotation.z = 0.03;
    j.hipR.rotation.z = -0.03;

    // Ground the pelvis on the lowest sole.
    const soleL = soleHeight(p, hipLA, kneeLA);
    const soleR = soleHeight(p, hipRA, kneeRA);
    const lowest = Math.min(soleL, soleR);
    j.body.position.y = -lowest;

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

    // --- arms ---------------------------------------------------------------
    const armSwing = 0.5 * amp * (running ? 1.35 : 1);
    let shoulderLX = -Math.sin(ph) * armSwing;
    let shoulderRX = -Math.sin(ph + Math.PI) * armSwing;
    let elbowLX = -0.22 - Math.max(0, Math.sin(ph + 0.6)) * 0.5 * amp;
    let elbowRX = -0.22 - Math.max(0, Math.sin(ph + Math.PI + 0.6)) * 0.5 * amp;
    let shoulderLZ = 0.14 + amp * 0.03;
    let shoulderRZ = -0.14 - amp * 0.03;

    const aiming = this.state === 'aim' || this.state === 'fire';
    if (aiming) {
      const a = smoothstep(this.stateTime / 0.28);
      // Both hands come to a two-handed low-ready / firing pose.
      shoulderLX = THREE.MathUtils.lerp(shoulderLX, -1.15, a);
      shoulderRX = THREE.MathUtils.lerp(shoulderRX, -1.28, a);
      elbowLX = THREE.MathUtils.lerp(elbowLX, -1.0, a);
      elbowRX = THREE.MathUtils.lerp(elbowRX, -0.72, a);
      shoulderLZ = THREE.MathUtils.lerp(shoulderLZ, 0.5, a);
      shoulderRZ = THREE.MathUtils.lerp(shoulderRZ, -0.28, a);
      shoulderRX += this.fireImpulse * 0.22;
      elbowRX -= this.fireImpulse * 0.16;
    }

    if (this.state === 'interact' || this.interactAmount > 0.001) {
      const want = this.state === 'interact' ? 1 : 0;
      this.interactAmount = damp(this.interactAmount, want, 0.2, dt);
      const a = this.interactAmount;
      const reach = Math.sin(elapsed * 2.2 + this.seedPhase) * 0.1;
      shoulderRX = THREE.MathUtils.lerp(shoulderRX, -1.35 + reach, a);
      elbowRX = THREE.MathUtils.lerp(elbowRX, -0.45, a);
      shoulderRZ = THREE.MathUtils.lerp(shoulderRZ, -0.18, a);
      shoulderLX = THREE.MathUtils.lerp(shoulderLX, -0.55, a * 0.6);
      elbowLX = THREE.MathUtils.lerp(elbowLX, -0.9, a * 0.6);
    } else {
      this.interactAmount = damp(this.interactAmount, 0, 0.2, dt);
    }

    if (this.reactImpulse > 0.01) {
      shoulderLX -= this.reactImpulse * 0.5;
      shoulderRX -= this.reactImpulse * 0.35;
      elbowLX -= this.reactImpulse * 0.4;
    }

    j.shoulderL.rotation.set(shoulderLX, 0, shoulderLZ);
    j.shoulderR.rotation.set(shoulderRX, 0, shoulderRZ);
    j.elbowL.rotation.x = elbowLX;
    j.elbowR.rotation.x = elbowRX;

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

    // Torso yaw toward the aim point so weapons point plausibly.
    if (this.aimTarget) {
      _v.copy(this.aimTarget);
      this.root.updateWorldMatrix(true, false);
      _m.copy(this.root.matrixWorld).invert();
      _v.applyMatrix4(_m);
      const yaw = clamp(Math.atan2(_v.x, _v.z), -0.75, 0.75);
      const pitch = clamp(
        Math.atan2(_v.y - (p.hipHeight + p.spine), Math.hypot(_v.x, _v.z)),
        -0.5,
        0.5,
      );
      j.chest.rotation.y += yaw * 0.75;
      j.shoulderL.rotation.x -= pitch * 0.9;
      j.shoulderR.rotation.x -= pitch * 0.9;
    }

    // --- knocked down --------------------------------------------------------
    if (this.state === 'fall' || this.state === 'down') {
      const target = this.state === 'down' ? 1 : clamp01(this.stateTime / 0.85);
      this.fallProgress = Math.max(this.fallProgress, target);
      const f = easeOutCubic(this.fallProgress);
      // Slump backwards and settle onto the deck, deliberately non-graphic.
      j.body.rotation.x = -f * (Math.PI / 2 - 0.12);
      j.body.position.y = -lowest * (1 - f) + f * (p.hipHeight * 0.82);
      j.body.position.z = -f * 0.34;
      j.chest.rotation.x = -f * 0.25;
      j.hipL.rotation.x = -f * 0.5 + hipLA * (1 - f);
      j.hipR.rotation.x = -f * 0.3 + hipRA * (1 - f);
      j.kneeL.rotation.x = -f * 0.55;
      j.kneeR.rotation.x = -f * 0.3;
      j.shoulderL.rotation.set(0.5 * f, 0, 0.6 * f);
      j.shoulderR.rotation.set(0.3 * f, 0, -0.7 * f);
      j.head.rotation.x = f * 0.35;
    } else if (this.fallProgress > 0) {
      this.fallProgress = damp(this.fallProgress, 0, 0.2, dt);
      const f = this.fallProgress;
      j.body.rotation.x = -f * (Math.PI / 2 - 0.12);
      j.body.position.z = -f * 0.34;
    } else {
      j.body.rotation.x = 0;
      j.body.position.z = 0;
    }
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
