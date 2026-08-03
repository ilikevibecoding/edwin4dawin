/**
 * Stylised humanoid rig.
 *
 * A small skeleton of nested `Object3D`s with named joints, driven by a
 * procedural pose function rather than baked clips. Legs are solved with
 * analytic two-bone IK against a foot trajectory, which is what keeps feet
 * planted on the floor instead of skating — the single most common failure in
 * procedural crowd animation.
 *
 * Convention: the figure faces −Z (Three's forward). Positive rotation about
 * X swings a limb forward. The root sits on the floor at y = 0.
 */

import * as THREE from 'three';
import { clamp, damp, angleDelta, smoothstep } from '../core/math';
import { Rng } from '../core/rng';

export type CharState =
  | 'idle'
  | 'alert'
  | 'walk'
  | 'run'
  | 'march'
  | 'aim'
  | 'fire'
  | 'react'
  | 'fall'
  | 'down'
  | 'interact'
  | 'crouch'
  | 'cower'
  | 'kneel';

export interface Proportions {
  height: number;
  /** Distance from floor to hip joint. */
  hipHeight: number;
  thigh: number;
  shin: number;
  /** Half-distance between the hip joints. */
  hipWidth: number;
  spine: number;
  chest: number;
  neck: number;
  headRadius: number;
  shoulderWidth: number;
  upperArm: number;
  forearm: number;
  /** Stride length in metres at walking pace. */
  stride: number;
  walkSpeed: number;
  runSpeed: number;
}

export const HUMAN: Proportions = {
  height: 1.8,
  hipHeight: 0.94,
  thigh: 0.44,
  shin: 0.44,
  hipWidth: 0.11,
  spine: 0.28,
  chest: 0.26,
  neck: 0.09,
  headRadius: 0.115,
  shoulderWidth: 0.2,
  upperArm: 0.29,
  forearm: 0.27,
  stride: 0.72,
  walkSpeed: 1.35,
  runSpeed: 3.5,
};

export interface Joints {
  root: THREE.Group;
  pelvis: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  upperArmL: THREE.Group;
  upperArmR: THREE.Group;
  forearmL: THREE.Group;
  forearmR: THREE.Group;
  handL: THREE.Group;
  handR: THREE.Group;
  thighL: THREE.Group;
  thighR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  footL: THREE.Group;
  footR: THREE.Group;
}

function joint(name: string, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

/**
 * Analytic two-bone solve. `target` is in the hip joint's parent space,
 * relative to the hip's own origin. Returns the hip pitch and knee bend.
 */
function solveTwoBone(l1: number, l2: number, target: THREE.Vector3): { hip: number; knee: number; roll: number } {
  const lateral = target.x;
  const planar = Math.hypot(target.y, target.z);
  const d = clamp(Math.hypot(planar, lateral), 0.05, (l1 + l2) * 0.999);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const cosB = clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  const a = Math.acos(cosA);
  const b = Math.acos(cosB);
  // Angle of the hip→target line measured from straight down, positive forward.
  const phi = Math.atan2(-target.z, -target.y);
  const roll = Math.atan2(target.x, -target.y);
  return { hip: phi + a, knee: -(Math.PI - b), roll };
}

export interface FigureOptions {
  proportions?: Partial<Proportions>;
  seed?: string;
  /** Slows or speeds the idle breathing and gait — droids and Vader differ. */
  tempo?: number;
}

/**
 * Base humanoid. Subclasses attach geometry to the named joints and may
 * override `poseExtra` for character-specific behaviour (Vader's cape,
 * Leia's gown, and so on).
 */
export class Figure {
  readonly group = new THREE.Group();
  readonly joints: Joints;
  readonly p: Proportions;
  protected rng: Rng;
  protected tempo: number;

  /** Current animation state. */
  state: CharState = 'idle';
  /** Seconds spent in the current state. */
  protected stateTime = 0;
  /** Gait phase in [0,1), advanced by distance travelled, not by time. */
  protected gait = 0;
  /** Metres travelled this frame, used to drive the gait. */
  protected speed = 0;

  /** Optional world-space point the head tracks. */
  lookTarget: THREE.Vector3 | null = null;
  protected lookYaw = 0;
  protected lookPitch = 0;

  /** Set while a weapon should point at something. */
  aimTarget: THREE.Vector3 | null = null;
  protected aimBlend = 0;
  protected firePulse = 0;
  protected reactPulse = 0;
  protected fallProgress = 0;
  /** Extra body twist for interaction poses. */
  protected interactBlend = 0;

  // Navigation
  private navTarget: THREE.Vector3 | null = null;
  private navSpeed = 1.35;
  private navArrive = 0.12;
  private facing = 0;
  private targetFacing = 0;
  private onArrive: (() => void) | null = null;

  constructor(o: FigureOptions = {}) {
    this.p = { ...HUMAN, ...(o.proportions ?? {}) };
    this.rng = new Rng(o.seed ?? 'figure');
    this.tempo = o.tempo ?? 1;

    const p = this.p;
    const root = this.group;
    root.name = 'Figure';

    const pelvis = joint('pelvis', 0, p.hipHeight, 0);
    const spine = joint('spine', 0, 0.04, 0);
    const chest = joint('chest', 0, p.spine, 0);
    const neck = joint('neck', 0, p.chest, 0);
    const head = joint('head', 0, p.neck, 0);

    const shoulderL = joint('shoulderL', -p.shoulderWidth, p.chest - 0.05, 0);
    const shoulderR = joint('shoulderR', p.shoulderWidth, p.chest - 0.05, 0);
    const upperArmL = joint('upperArmL');
    const upperArmR = joint('upperArmR');
    const forearmL = joint('forearmL', 0, -p.upperArm, 0);
    const forearmR = joint('forearmR', 0, -p.upperArm, 0);
    const handL = joint('handL', 0, -p.forearm, 0);
    const handR = joint('handR', 0, -p.forearm, 0);

    const thighL = joint('thighL', -p.hipWidth, 0, 0);
    const thighR = joint('thighR', p.hipWidth, 0, 0);
    const shinL = joint('shinL', 0, -p.thigh, 0);
    const shinR = joint('shinR', 0, -p.thigh, 0);
    const footL = joint('footL', 0, -p.shin, 0);
    const footR = joint('footR', 0, -p.shin, 0);

    root.add(pelvis);
    pelvis.add(spine);
    spine.add(chest);
    chest.add(neck);
    neck.add(head);
    chest.add(shoulderL, shoulderR);
    shoulderL.add(upperArmL);
    shoulderR.add(upperArmR);
    upperArmL.add(forearmL);
    upperArmR.add(forearmR);
    forearmL.add(handL);
    forearmR.add(handR);
    pelvis.add(thighL, thighR);
    thighL.add(shinL);
    thighR.add(shinR);
    shinL.add(footL);
    shinR.add(footR);

    this.joints = {
      root, pelvis, spine, chest, neck, head,
      shoulderL, shoulderR, upperArmL, upperArmR, forearmL, forearmR, handL, handR,
      thighL, thighR, shinL, shinR, footL, footR,
    };
  }

  /* ------------------------------------------------------------- commands */

  setState(s: CharState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateTime = 0;
    if (s === 'react') this.reactPulse = 1;
    if (s === 'fire') this.firePulse = 1;
    // `down` is the settled end of `fall`; jumping straight to it should not
    // replay the collapse.
    if (s === 'down') this.fallProgress = 1;
  }

  /** Immediately place and orient the figure. */
  placeAt(x: number, z: number, facing = 0, y = 0): void {
    this.group.position.set(x, y, z);
    this.facing = facing;
    this.targetFacing = facing;
    this.group.rotation.y = facing;
    this.navTarget = null;
  }

  /** Walk (or run) to a floor position. */
  goTo(x: number, z: number, speed = this.p.walkSpeed, onArrive?: () => void): void {
    this.navTarget = new THREE.Vector3(x, this.group.position.y, z);
    this.navSpeed = speed;
    this.onArrive = onArrive ?? null;
    this.setState(speed > this.p.walkSpeed * 1.6 ? 'run' : 'walk');
  }

  stop(): void {
    this.navTarget = null;
    this.speed = 0;
    if (this.state === 'walk' || this.state === 'run' || this.state === 'march') this.setState('idle');
  }

  get isMoving(): boolean {
    return this.navTarget !== null;
  }

  /** Face a compass direction directly (used when taking a firing position). */
  faceDirection(radians: number): void {
    this.targetFacing = radians;
  }

  faceToward(worldPoint: THREE.Vector3): void {
    const dx = worldPoint.x - this.group.position.x;
    const dz = worldPoint.z - this.group.position.z;
    this.targetFacing = Math.atan2(dx, dz) + Math.PI;
  }

  /**
   * Drive the figure from an authored path rather than its own navigation.
   *
   * The timeline evaluates every character position as a pure function of show
   * time, which is what makes scrubbing exact; this method accepts that
   * position and derives the walk speed and facing from the frame delta, so
   * the procedural gait still works and the feet still do not skate.
   */
  track(
    x: number,
    z: number,
    dt: number,
    faceMotion = true,
    facing?: number,
    /** Cumulative metres walked along the authored path, if the caller knows. */
    pathDistance?: number,
    /** Metres per second along that path. */
    pathSpeed?: number,
    /** Deck height under the figure — non-zero on ramps and platforms. */
    y = 0,
  ): void {
    const dx = x - this.group.position.x;
    const dz = z - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    this.group.position.x = x;
    this.group.position.y = y;
    this.group.position.z = z;
    this.navTarget = null;

    const strideLen = this.state === 'run' ? this.p.stride * 1.55 : this.p.stride;
    if (pathDistance !== undefined) {
      // The gait is a pure function of distance travelled along the path, so a
      // scrubbed frame shows exactly the stride the played frame would.
      this.speed = pathSpeed ?? 0;
      this.gait = ((pathDistance / strideLen) % 1 + 1) % 1;
    } else if (dt > 0 && dist < this.p.runSpeed * 3 * dt + 0.05) {
      this.speed = dist / dt;
      this.gait = (this.gait + dist / strideLen) % 1;
    } else {
      this.speed = 0;
    }

    if (facing !== undefined) {
      this.targetFacing = facing;
      if (dist > this.p.runSpeed * 3 * dt + 0.05) this.facing = facing;
    } else if (faceMotion && dist > 0.004) {
      this.targetFacing = Math.atan2(dx, dz) + Math.PI;
    }
    this.tracked = true;
  }

  private tracked = false;
  /** True on frames with no time delta: blends resolve instantly. */
  protected settling = false;

  /* ---------------------------------------------------------------- update */

  update(dt: number, elapsed: number): void {
    this.stateTime += dt;
    // A zero delta means the timeline was scrubbed or is paused. Damped values
    // would freeze wherever a previous pass left them, so a figure could stay
    // slumped on the deck after a jump back into the firefight; settle them
    // straight onto their targets instead.
    this.settling = dt <= 0;

    // Navigation. A figure driven by `track()` has already had its position and
    // speed set for this frame.
    if (this.tracked) {
      this.tracked = false;
    } else if (this.navTarget) {
      const pos = this.group.position;
      const dx = this.navTarget.x - pos.x;
      const dz = this.navTarget.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= this.navArrive) {
        this.navTarget = null;
        this.speed = 0;
        const cb = this.onArrive;
        this.onArrive = null;
        this.setState('idle');
        cb?.();
      } else {
        // Ease into and out of the move so nobody starts at full sprint.
        const ramp = smoothstep(0, 0.35, this.stateTime) * smoothstep(0, 0.5, dist);
        const step = Math.min(dist, this.navSpeed * ramp * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        this.speed = dt > 0 ? step / dt : 0;
        this.targetFacing = Math.atan2(dx, dz) + Math.PI;
      }
    } else {
      this.speed = damp(this.speed, 0, 0.001, dt);
    }

    // Turn toward the direction of travel — never snap.
    const turn = angleDelta(this.facing, this.targetFacing);
    this.facing = this.settling ? this.targetFacing : this.facing + clamp(turn, -6 * dt, 6 * dt);
    this.group.rotation.y = this.facing;

    // Gait phase advances with distance so feet never skate. Tracked figures
    // advanced it inside `track()`.
    const strideLen = this.state === 'run' ? this.p.stride * 1.55 : this.p.stride;
    if (this.speed > 0.02 && this.navTarget) {
      this.gait = (this.gait + (this.speed * dt) / strideLen) % 1;
    } else if (this.speed <= 0.02 && !this.tracked) {
      // Settle to a neutral stance rather than freezing mid-step.
      const toNeutral = angleDelta(this.gait * Math.PI * 2, 0) / (Math.PI * 2);
      this.gait = this.settling ? 0 : (this.gait - toNeutral * Math.min(1, dt * 4) + 1) % 1;
    }

    const fallTarget = this.state === 'fall' || this.state === 'down' ? 1 : 0;
    if (this.settling) {
      this.firePulse = 0;
      this.reactPulse = this.state === 'react' ? 0.6 : 0;
      this.aimBlend = this.aimTarget ? 1 : 0;
      this.interactBlend = this.state === 'interact' ? 1 : 0;
      this.fallProgress = fallTarget;
    } else {
      this.firePulse = Math.max(0, this.firePulse - dt * 6);
      this.reactPulse = Math.max(0, this.reactPulse - dt * 1.6);
      this.aimBlend = damp(this.aimBlend, this.aimTarget ? 1 : 0, 0.0005, dt);
      this.interactBlend = damp(this.interactBlend, this.state === 'interact' ? 1 : 0, 0.002, dt);
      this.fallProgress = damp(this.fallProgress, fallTarget, this.state === 'fall' ? 0.0002 : 0.002, dt);
    }

    this.pose(elapsed);
    this.poseExtra(dt, elapsed);
  }

  /* ------------------------------------------------------------------ pose */

  protected pose(elapsed: number): void {
    const j = this.joints;
    const p = this.p;
    const t = elapsed * this.tempo;
    const moving = this.speed > 0.05;
    const running = this.state === 'run';
    const marching = this.state === 'march';

    // Reset per-frame so states never accumulate.
    j.pelvis.position.set(0, p.hipHeight, 0);
    j.pelvis.rotation.set(0, 0, 0);
    j.spine.rotation.set(0, 0, 0);
    j.chest.rotation.set(0, 0, 0);
    j.neck.rotation.set(0, 0, 0);
    j.head.rotation.set(0, 0, 0);

    const breath = Math.sin(t * 1.5) * 0.012;
    let pelvisY = p.hipHeight + breath;
    let lean = 0;

    /* -------------------------------------------------------------- legs */
    const phase = this.gait;
    const strideLen = running ? p.stride * 1.55 : marching ? p.stride * 0.9 : p.stride;
    const lift = running ? 0.26 : marching ? 0.13 : 0.16;

    const footPos = (ph: number): THREE.Vector3 => {
      // Stance covers 60% of the cycle, swing the remaining 40%.
      const k = ph % 1;
      if (k < 0.6) {
        const u = k / 0.6;
        return new THREE.Vector3(0, 0, THREE.MathUtils.lerp(-strideLen / 2, strideLen / 2, u));
      }
      const u = (k - 0.6) / 0.4;
      const z = THREE.MathUtils.lerp(strideLen / 2, -strideLen / 2, u);
      const y = Math.sin(u * Math.PI) * lift;
      return new THREE.Vector3(0, y, z);
    };

    if (moving) {
      // Vertical bob: lowest when both feet are on the ground.
      pelvisY += Math.sin(phase * Math.PI * 4) * (running ? 0.055 : 0.022) - (running ? 0.05 : 0.015);
      lean = running ? 0.2 : 0.06;
    }

    const crouching = this.state === 'crouch' || this.state === 'cower';
    if (crouching) pelvisY -= 0.26;
    if (this.state === 'kneel') pelvisY -= 0.42;
    const fall = this.fallProgress;
    if (fall > 0.001) pelvisY = THREE.MathUtils.lerp(pelvisY, 0.2, fall);

    j.pelvis.position.y = pelvisY;

    const stanceWidth = crouching ? 0.06 : 0.02;
    const legTargets: Array<[THREE.Group, THREE.Group, number]> = [
      [j.thighL, j.shinL, -1],
      [j.thighR, j.shinR, 1],
    ];
    for (const [thigh, shin, side] of legTargets) {
      const ph = side < 0 ? phase : (phase + 0.5) % 1;
      const f = moving ? footPos(ph) : new THREE.Vector3(0, 0, side * 0.0 + (crouching ? 0.02 : 0));
      // Foot target expressed relative to the hip joint.
      const target = new THREE.Vector3(
        side * stanceWidth,
        -(pelvisY - f.y - 0.06),
        f.z,
      );
      if (this.state === 'kneel' && side > 0) {
        target.set(side * 0.1, -(pelvisY - 0.06), 0.34);
      }
      if (fall > 0.001) {
        target.set(side * 0.14, -(pelvisY - 0.06) * (1 - fall * 0.7), THREE.MathUtils.lerp(f.z, -0.45, fall));
      }
      const s = solveTwoBone(p.thigh, p.shin, target);
      thigh.rotation.set(s.hip, 0, -s.roll);
      shin.rotation.set(s.knee, 0, 0);
      // Keep the sole roughly parallel to the floor.
      const ankle = -(s.hip + s.knee) * 0.85;
      const foot = side < 0 ? j.footL : j.footR;
      foot.rotation.set(ankle, 0, 0);
    }

    /* -------------------------------------------------------------- torso */
    const twist = moving ? Math.sin(phase * Math.PI * 2) * (running ? 0.18 : 0.08) : 0;
    j.pelvis.rotation.y = -twist * 0.5;
    j.spine.rotation.x = lean + (crouching ? 0.3 : 0) + fall * 0.5;
    j.spine.rotation.y = twist * 0.5;
    j.chest.rotation.x = breath * 0.6 + (this.state === 'alert' ? 0.05 : 0) + fall * 0.35;
    j.chest.rotation.y = twist * 0.4;

    if (this.state === 'cower') {
      j.spine.rotation.x += 0.22;
      j.chest.rotation.x += 0.18;
      j.pelvis.rotation.y += Math.sin(t * 6.5) * 0.05;
    }
    if (this.state === 'interact') {
      j.spine.rotation.x += this.interactBlend * 0.34;
      j.chest.rotation.x += this.interactBlend * 0.12;
    }
    if (this.reactPulse > 0) {
      const r = this.reactPulse;
      j.chest.rotation.x -= r * 0.28;
      j.chest.rotation.z += Math.sin(this.stateTime * 24) * r * 0.09;
      j.pelvis.position.z -= r * 0.05;
    }

    /* ---------------------------------------------------------------- arms */
    const armSwing = moving ? Math.sin(phase * Math.PI * 2) * (running ? 0.85 : 0.42) : 0;
    const idleSway = Math.sin(t * 1.2) * 0.02;

    const setArm = (
      upper: THREE.Group,
      fore: THREE.Group,
      hand: THREE.Group,
      side: number,
      swing: number,
    ) => {
      upper.rotation.set(swing + idleSway, 0, side * (0.09 + (running ? 0.06 : 0)));
      fore.rotation.set(running ? 1.05 : 0.16 + Math.max(0, swing) * 0.28, 0, 0);
      hand.rotation.set(0, 0, 0);
    };
    setArm(j.upperArmL, j.forearmL, j.handL, -1, armSwing);
    setArm(j.upperArmR, j.forearmR, j.handR, 1, -armSwing);

    if (marching) {
      j.upperArmL.rotation.x = armSwing * 0.6;
      j.upperArmR.rotation.x = -armSwing * 0.6;
      j.forearmL.rotation.x = 0.9;
      j.forearmR.rotation.x = 0.9;
    }

    if (crouching) {
      j.upperArmL.rotation.x += 0.35;
      j.upperArmR.rotation.x += 0.35;
    }
    if (this.state === 'cower') {
      j.upperArmL.rotation.set(0.5, 0, -0.9);
      j.upperArmR.rotation.set(0.5, 0, 0.9);
      j.forearmL.rotation.x = 1.9;
      j.forearmR.rotation.x = 1.9;
    }
    if (this.state === 'interact') {
      const b = this.interactBlend;
      j.upperArmL.rotation.set(b * 1.0, 0, -b * 0.25);
      j.upperArmR.rotation.set(b * 1.0, 0, b * 0.25);
      j.forearmL.rotation.x = b * 0.8;
      j.forearmR.rotation.x = b * 0.8;
    }
    if (fall > 0.001) {
      j.upperArmL.rotation.set(-0.4 * fall, 0, -0.5 * fall);
      j.upperArmR.rotation.set(-0.4 * fall, 0, 0.5 * fall);
      j.forearmL.rotation.x = 0.4 * fall;
      j.forearmR.rotation.x = 0.4 * fall;
    }

    /* --------------------------------------------------------------- aiming */
    if (this.aimBlend > 0.001) {
      const b = this.aimBlend;
      let pitch = 0;
      let yaw = 0;
      if (this.aimTarget) {
        const local = this.group.worldToLocal(this.aimTarget.clone());
        yaw = Math.atan2(local.x, -local.z);
        pitch = Math.atan2(local.y - (p.hipHeight + p.spine + p.chest * 0.6), Math.hypot(local.x, local.z));
      }
      const recoil = this.firePulse * 0.34;
      // Weapon shouldered: the right elbow lifts out to the side and the
      // forearm folds back so the butt reaches the shoulder, while the left
      // arm reaches forward under the barrel. A straight right arm at full
      // extension is the classic tell of a procedural figure.
      j.upperArmR.rotation.x = THREE.MathUtils.lerp(j.upperArmR.rotation.x, 1.06 + pitch * 0.9 - recoil, b);
      j.upperArmR.rotation.y = THREE.MathUtils.lerp(j.upperArmR.rotation.y, -yaw * 0.35, b);
      j.upperArmR.rotation.z = THREE.MathUtils.lerp(j.upperArmR.rotation.z, 0.46, b);
      j.forearmR.rotation.x = THREE.MathUtils.lerp(j.forearmR.rotation.x, 0.66 + recoil * 0.8, b);

      j.upperArmL.rotation.x = THREE.MathUtils.lerp(j.upperArmL.rotation.x, 1.34 + pitch * 0.8, b);
      j.upperArmL.rotation.y = THREE.MathUtils.lerp(j.upperArmL.rotation.y, 0.5, b);
      j.upperArmL.rotation.z = THREE.MathUtils.lerp(j.upperArmL.rotation.z, -0.34, b);
      j.forearmL.rotation.x = THREE.MathUtils.lerp(j.forearmL.rotation.x, 0.58, b);

      j.chest.rotation.y = THREE.MathUtils.lerp(j.chest.rotation.y, yaw * 0.55, b);
      j.chest.rotation.x -= recoil * 0.22;
    }

    /* ----------------------------------------------------------------- head */
    let targetYaw = 0;
    let targetPitch = 0;
    if (this.lookTarget) {
      const local = this.group.worldToLocal(this.lookTarget.clone());
      targetYaw = clamp(Math.atan2(local.x, -local.z), -1.05, 1.05);
      const eye = p.hipHeight + p.spine + p.chest + p.neck;
      targetPitch = clamp(Math.atan2(local.y - eye, Math.hypot(local.x, local.z)), -0.5, 0.6);
    } else if (this.aimTarget && this.aimBlend > 0.2) {
      const local = this.group.worldToLocal(this.aimTarget.clone());
      targetYaw = clamp(Math.atan2(local.x, -local.z), -1.05, 1.05);
    }
    // Head lag makes the figure look like it is deciding, not tracking.
    const lag = this.settling ? 1 : 0.12;
    this.lookYaw += (targetYaw - this.lookYaw) * lag;
    this.lookPitch += (targetPitch - this.lookPitch) * lag;
    j.neck.rotation.y = this.lookYaw * 0.35;
    j.neck.rotation.x = this.lookPitch * 0.3;
    j.head.rotation.y = this.lookYaw * 0.65;
    j.head.rotation.x = this.lookPitch * 0.7 + fall * 0.4;
    if (this.state === 'idle' && !this.lookTarget) {
      j.head.rotation.y += Math.sin(t * 0.37 + this.rng.seed * 0.0001) * 0.09;
    }

    /* ---------------------------------------------------------------- fall */
    if (fall > 0.001) {
      // Slump against the wall rather than depicting anything graphic.
      j.pelvis.rotation.x = fall * 0.55;
      j.pelvis.rotation.z = fall * 0.28;
      j.spine.rotation.z = fall * 0.2;
      j.head.rotation.z = fall * 0.35;
    }
  }

  /** Hook for character-specific motion (capes, gowns, droid parts). */
  protected poseExtra(_dt: number, _elapsed: number): void {}

  /** World position of the point a camera should look at for a close shot. */
  headWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.joints.head.getWorldPosition(out);
  }

  chestWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.joints.chest.getWorldPosition(out);
  }
}
