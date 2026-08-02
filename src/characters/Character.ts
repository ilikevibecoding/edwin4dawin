import * as THREE from 'three';
import { clamp, damp, easeInOut, fbm1, lerp, smoothstep } from '../core/MathX';
import type { HumanoidRig } from './Humanoid';

/**
 * Time-keyed character animation.
 *
 * Every character is driven by a sorted list of keys holding an absolute
 * timeline time, an optional destination and a state. Because a pose is a
 * pure function of the timeline clock, scrubbing backwards produces exactly
 * the same frame as playing forwards.
 */

export type CharState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'aim'
  | 'fire'
  | 'react'
  | 'fall'
  | 'down'
  | 'interact'
  | 'cower'
  | 'kneel'
  | 'surrender'
  | 'menace';

export interface CharKey {
  /** Absolute timeline seconds at which the character arrives here. */
  t: number;
  pos?: [number, number, number];
  state?: CharState;
  /** Point to face; 'motion' faces along travel, 'hold' keeps current facing. */
  face?: [number, number, number] | 'motion' | 'hold';
  /** Ease shape between the previous key and this one. */
  ease?: 'linear' | 'smooth' | 'accel' | 'decel';
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _target = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

export class Character {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly root: THREE.Group;
  readonly rig: HumanoidRig | null;

  keys: CharKey[] = [];
  fireTimes: number[] = [];
  /** Times at which the character takes a hit (drives flinches). */
  hitTimes: number[] = [];
  /** Height of the character, used for framing and picking. */
  height: number;
  /** Deterministic per-character offset so idles do not sync up. */
  phaseOffset = 0;
  /** Scales the walk cycle: droids and armoured troopers move stiffly. */
  gaitAmplitude = 1;
  /** Added to the resting elbow bend (C-3PO keeps his arms folded up). */
  elbowBias = 0;
  /** Multiplies stride length, i.e. steps per metre travelled. */
  strideScale = 1;
  /** World-space look-at target applied to the head, if any. */
  lookAtTarget: THREE.Vector3 | null = null;

  private cumulative: number[] = [];
  private currentState: CharState = 'idle';
  private facing = new THREE.Vector3(0, 0, -1);
  private lastPos = new THREE.Vector3();
  private smoothedFacing = new THREE.Vector3(0, 0, -1);
  private initialised = false;

  constructor(opts: {
    id: string;
    displayName: string;
    description: string;
    root: THREE.Group;
    rig: HumanoidRig | null;
    height: number;
  }) {
    this.id = opts.id;
    this.displayName = opts.displayName;
    this.description = opts.description;
    this.root = opts.root;
    this.rig = opts.rig;
    this.height = opts.height;
    this.root.userData.character = this;
    this.root.userData.pickable = true;
    this.root.userData.label = opts.displayName;
  }

  get state(): CharState {
    return this.currentState;
  }

  setKeys(keys: CharKey[]): void {
    this.keys = keys.slice().sort((a, b) => a.t - b.t);
    this.cumulative = [];
    let dist = 0;
    for (let i = 0; i < this.keys.length; i++) {
      if (i > 0) {
        const a = this.keys[i - 1].pos;
        const b = this.keys[i].pos;
        if (a && b) dist += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }
      this.cumulative.push(dist);
    }
    this.initialised = false;
  }

  /** Position at an absolute time, without touching the scene graph. */
  sampleTransform(time: number, outPos: THREE.Vector3): { distance: number; moving: boolean } {
    const keys = this.keys;
    if (keys.length === 0) {
      outPos.copy(this.root.position);
      return { distance: 0, moving: false };
    }
    if (time <= keys[0].t) {
      const p = keys[0].pos ?? [0, 0, 0];
      outPos.set(p[0], p[1], p[2]);
      return { distance: 0, moving: false };
    }
    for (let i = 1; i < keys.length; i++) {
      if (time <= keys[i].t) {
        const a = keys[i - 1];
        const b = keys[i];
        const span = Math.max(1e-4, b.t - a.t);
        const raw = clamp((time - a.t) / span, 0, 1);
        const k = applyEase(raw, b.ease ?? 'smooth');
        const pa = a.pos ?? b.pos ?? [0, 0, 0];
        const pb = b.pos ?? pa;
        outPos.set(
          lerp(pa[0], pb[0], k),
          lerp(pa[1], pb[1], k),
          lerp(pa[2], pb[2], k),
        );
        const segLen = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
        return {
          distance: this.cumulative[i - 1] + segLen * k,
          moving: segLen > 0.02 && raw > 0 && raw < 1,
        };
      }
    }
    const last = keys[keys.length - 1];
    const p = last.pos ?? [0, 0, 0];
    outPos.set(p[0], p[1], p[2]);
    return { distance: this.cumulative[this.cumulative.length - 1], moving: false };
  }

  /** State in effect at an absolute time. */
  sampleState(time: number): CharState {
    let s: CharState = 'idle';
    for (const k of this.keys) {
      if (k.t > time) break;
      if (k.state) s = k.state;
    }
    return s;
  }

  private sampleFace(time: number): [number, number, number] | 'motion' | 'hold' {
    let f: [number, number, number] | 'motion' | 'hold' = 'motion';
    for (const k of this.keys) {
      if (k.t > time) break;
      if (k.face) f = k.face;
    }
    return f;
  }

  update(time: number, dt: number): void {
    const { distance, moving } = this.sampleTransform(time, _v);
    const state = this.sampleState(time);
    this.currentState = state;

    if (!this.initialised) {
      this.root.position.copy(_v);
      this.lastPos.copy(_v);
      this.initialised = true;
    }

    _v2.copy(_v).sub(this.lastPos);
    if (_v2.lengthSq() > 1e-8) this.facing.copy(_v2).normalize();
    this.lastPos.copy(_v);
    this.root.position.copy(_v);

    const faceSpec = this.sampleFace(time);
    if (faceSpec === 'motion') {
      if (moving && this.facing.lengthSq() > 1e-6) this.smoothedFacing.lerp(this.facing, 1 - Math.exp(-8 * dt));
    } else if (faceSpec !== 'hold') {
      _target.set(faceSpec[0], faceSpec[1], faceSpec[2]).sub(_v);
      _target.y = 0;
      if (_target.lengthSq() > 1e-6) this.smoothedFacing.lerp(_target.normalize(), 1 - Math.exp(-6 * dt));
    }
    if (this.smoothedFacing.lengthSq() > 1e-6) {
      _target.copy(this.root.position).add(this.smoothedFacing);
      _m.lookAt(this.root.position, _target, THREE.Object3D.DEFAULT_UP);
      _q.setFromRotationMatrix(_m);
      this.root.quaternion.copy(_q);
    }

    if (this.rig) this.pose(time, dt, state, distance);
    this.onUpdate(time, dt, state);
  }

  /** Sub-classes hook extra motion here (droid domes, capes, breathing). */
  protected onUpdate(_time: number, _dt: number, _state: CharState): void {}

  /** Seconds since the most recent shot, or Infinity. */
  protected sinceLastFire(time: number): number {
    let best = Infinity;
    for (const ft of this.fireTimes) {
      if (ft <= time) best = Math.min(best, time - ft);
      else break;
    }
    return best;
  }

  protected sinceLastHit(time: number): number {
    let best = Infinity;
    for (const ht of this.hitTimes) {
      if (ht <= time) best = Math.min(best, time - ht);
      else break;
    }
    return best;
  }

  private pose(time: number, dt: number, state: CharState, distance: number): void {
    const rig = this.rig!;
    const ph = this.phaseOffset;
    const t = time + ph;

    // ------------------------------------------------------------ reset
    const stride = (state === 'run' ? 1.15 : 0.78) * this.strideScale;
    const walkPhase = (distance / stride) * Math.PI * 2;
    const breathing = Math.sin(t * 1.6) * 0.012;

    let hipY = 0;
    let hipPitch = 0;
    let hipRoll = 0;
    let torsoPitch = breathing;
    let torsoYaw = 0;
    let legSwing = 0;
    let armSwing = 0;
    let armRaise = 0;
    let elbowBend = 0.15;
    let headPitch = 0;

    const walking = state === 'walk' || state === 'run';
    if (walking) {
      const amp = (state === 'run' ? 0.72 : 0.46) * this.gaitAmplitude;
      legSwing = Math.sin(walkPhase) * amp;
      armSwing = -Math.sin(walkPhase) * amp * 0.62;
      hipY = -Math.abs(Math.cos(walkPhase)) * (state === 'run' ? 0.05 : 0.028);
      hipRoll = Math.sin(walkPhase) * 0.04;
      torsoPitch += state === 'run' ? 0.22 : 0.06;
      elbowBend = state === 'run' ? 0.9 : 0.35;
    } else if (state === 'idle') {
      hipY = Math.sin(t * 1.5) * 0.006;
      torsoYaw = fbm1(t * 0.25 + ph, 2) * 0.05;
      elbowBend = 0.2;
    }

    elbowBend += this.elbowBias;
    const recoil = Math.exp(-this.sinceLastFire(time) * 11);
    const flinch = Math.exp(-this.sinceLastHit(time) * 6);

    if (state === 'aim' || state === 'fire') {
      armRaise = 1;
      elbowBend = 0.55;
      torsoPitch += 0.05;
    }
    if (state === 'cower') {
      hipY = -0.16;
      torsoPitch += 0.4;
      elbowBend = 1.5;
      armRaise = 0.55;
      headPitch = 0.35;
    }
    if (state === 'kneel') {
      hipY = -0.34;
      torsoPitch += 0.12;
    }
    if (state === 'surrender') {
      armRaise = 2.4;
      elbowBend = 0.9;
    }
    if (state === 'menace') {
      torsoPitch -= 0.03;
      elbowBend = 0.28;
    }
    if (state === 'interact') {
      torsoPitch += 0.16;
      armRaise = 1.35;
      elbowBend = 1.0;
      headPitch = 0.22;
    }

    const downT = state === 'down' ? 1 : state === 'fall' ? smoothstep(0, 0.9, this.sinceLastHit(time)) : 0;

    // -------------------------------------------------------- apply pose
    rig.hips.position.y = lerp(rig.hipHeight + hipY, rig.hipHeight * 0.16, downT);
    rig.hips.rotation.set(hipPitch, 0, hipRoll);
    rig.torso.rotation.set(
      lerp(torsoPitch, 1.35, downT),
      torsoYaw,
      lerp(0, 0.25, downT),
    );

    rig.hipL.rotation.x = lerp(legSwing, -1.1, downT);
    rig.hipR.rotation.x = lerp(-legSwing, -0.55, downT);
    rig.kneeL.rotation.x = lerp(Math.max(0, -legSwing) * 0.9 + (walking ? 0.1 : 0.04), 1.5, downT);
    rig.kneeR.rotation.x = lerp(Math.max(0, legSwing) * 0.9 + (walking ? 0.1 : 0.04), 0.9, downT);
    rig.footL.rotation.x = lerp(-rig.hipL.rotation.x * 0.35, -0.4, downT);
    rig.footR.rotation.x = lerp(-rig.hipR.rotation.x * 0.35, -0.4, downT);

    const aimPitch = armRaise > 0 ? -Math.PI / 2 + 0.18 : 0;
    const swingL = armSwing;
    const swingR = -armSwing;
    rig.shoulderL.rotation.set(
      lerp(swingL + aimPitch * clamp(armRaise, 0, 1), 0.4, downT) - recoil * 0.16 * clamp(armRaise, 0, 1),
      0,
      lerp(0.08 + armRaise * 0.12, 0.9, downT),
    );
    rig.shoulderR.rotation.set(
      lerp(swingR + aimPitch * clamp(armRaise, 0, 1), 0.2, downT) - recoil * 0.22 * clamp(armRaise, 0, 1),
      0,
      lerp(-0.08 - armRaise * 0.1, -0.7, downT),
    );
    if (armRaise > 1.5) {
      rig.shoulderL.rotation.x = -2.4;
      rig.shoulderR.rotation.x = -2.4;
    }
    rig.elbowL.rotation.x = lerp(-elbowBend, -1.9, downT);
    rig.elbowR.rotation.x = lerp(-elbowBend - recoil * 0.35, -1.2, downT);

    // Head: settle toward look-at, otherwise track motion with a small lag.
    let headYaw = 0;
    if (this.lookAtTarget) {
      _target.copy(this.lookAtTarget);
      this.root.worldToLocal(_target);
      headYaw = clamp(Math.atan2(_target.x, -_target.z), -1.1, 1.1);
      headPitch += clamp(-Math.atan2(_target.y - rig.shoulderHeight, Math.abs(_target.z) + 0.2), -0.5, 0.5);
    }
    rig.neck.rotation.y = damp(rig.neck.rotation.y, headYaw, 6, dt);
    rig.neck.rotation.x = damp(rig.neck.rotation.x, headPitch + flinch * 0.2, 6, dt);
    rig.head.rotation.z = lerp(0, 0.4, downT);

    if (flinch > 0.01 && state !== 'down' && state !== 'fall') {
      rig.torso.rotation.x -= flinch * 0.18;
      rig.torso.rotation.z += flinch * 0.1;
    }
  }
}

function applyEase(t: number, kind: 'linear' | 'smooth' | 'accel' | 'decel'): number {
  switch (kind) {
    case 'linear':
      return t;
    case 'accel':
      return t * t;
    case 'decel':
      return 1 - (1 - t) * (1 - t);
    default:
      return easeInOut(t);
  }
}
