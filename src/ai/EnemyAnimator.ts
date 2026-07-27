import * as THREE from 'three';
import type { EnemyModelParts, BoneKey } from './EnemyModel';
import { clamp, lerp, damp, dampAngle } from '../core/MathX';

/**
 * EnemyAnimator.ts — fully procedural (no imported clips) animation for one
 * soldier.
 *
 * Layers, applied every frame on top of the rest pose:
 *  1. Locomotion — a phase accumulator over distance travelled drives a
 *     walk/run cycle: hip sway, vertical bob, counter-rotating shoulders and
 *     stride. Blended by speed between idle and run.
 *  2. Foot IK — each ankle is planted on the sampled ground with a 2-bone
 *     (thigh/shin) solve; the pelvis lowers to the lowest reachable foot so the
 *     soldier stands correctly on slopes and steps.
 *  3. Aim — spine/chest pitch + head look-at toward the target, layered over
 *     locomotion with joint limits.
 *  4. Arms — solved once against the rifle's grip anchors (the weapon is rigid
 *     in chest space) so both gloved hands stay on the gun through every aim.
 *  5. Actions — firing recoil, reload (mag drop + support-hand dip), grenade
 *     throw, flinch and death, as additive modifiers.
 */

export type Stance = 'stand' | 'crouch' | 'prone';

interface ArmPose {
  upperL: THREE.Quaternion;
  lowerL: THREE.Quaternion;
  upperR: THREE.Quaternion;
  lowerR: THREE.Quaternion;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _s = new THREE.Vector3();
const _t = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _n = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _boneDown = new THREE.Vector3(0, -1, 0);

export class EnemyAnimator {
  private parts: EnemyModelParts;
  private bones: Record<BoneKey, THREE.Bone>;
  private restPelvisY: number;

  // Locomotion
  private phase = 0;
  private locoBlend = 0; // 0 idle .. 1 run
  private speed = 0;

  // Aim (relative to body forward)
  private aimYaw = 0;
  private aimPitch = 0;
  private targetAimYaw = 0;
  private targetAimPitch = 0;
  private aiming = 1;

  stance: Stance = 'stand';
  private stanceBlend = 0; // 0 stand .. 1 crouch (prone handled separately)
  private proneBlend = 0;

  // Actions (timers, seconds remaining / progress)
  private recoil = 0;
  private reloadT = -1;
  private reloadDur = 2;
  private grenadeT = -1;
  private flinchT = 0;
  private flinchDir = 0;
  private dead = false;
  private deathT = 0;

  private armPose: ArmPose;

  // Foot planting memory (world Y offsets), for smoothing.
  private footYL = 0;
  private footYR = 0;

  constructor(parts: EnemyModelParts) {
    this.parts = parts;
    this.bones = parts.bones;
    this.restPelvisY = this.bones.pelvis.position.y;
    this.armPose = this.solveArmPose();
  }

  // -------------------------------------------------------------------------
  // Inputs (set by Enemy each frame)
  // -------------------------------------------------------------------------

  setLocomotion(speed: number) {
    this.speed = speed;
  }
  setAim(yawLocal: number, pitch: number, aiming: number) {
    this.targetAimYaw = yawLocal;
    this.targetAimPitch = pitch;
    this.aiming = aiming;
  }
  setStance(stance: Stance) {
    this.stance = stance;
  }
  fire() {
    this.recoil = 1;
  }
  reload(dur: number) {
    if (this.reloadT < 0) {
      this.reloadT = 0;
      this.reloadDur = Math.max(0.6, dur);
    }
  }
  get reloading() {
    return this.reloadT >= 0;
  }
  throwGrenade() {
    if (this.grenadeT < 0) this.grenadeT = 0;
  }
  get throwProgress() {
    return this.grenadeT;
  }
  flinch(dirLocal: number) {
    this.flinchT = 1;
    this.flinchDir = dirLocal;
  }
  die() {
    this.dead = true;
  }
  get isDead() {
    return this.dead;
  }

  // -------------------------------------------------------------------------
  // One-time arm solve against the rifle grips (rigid in chest space)
  // -------------------------------------------------------------------------

  private solveArmPose(): ArmPose {
    const b = this.bones;
    // Neutral pose: everything at rest, chest identity. Update world matrices
    // so we can read the rifle grip anchors in world space.
    this.parts.root.updateMatrixWorld(true);
    const rifle = this.parts.rifle;
    const rearW = rifle.gripRear.getWorldPosition(new THREE.Vector3());
    const frontW = rifle.gripFront.getWorldPosition(new THREE.Vector3());

    // Right hand (trigger hand, -X side) -> rear grip.
    // Left hand (support, +X side) -> front grip.
    const poleBack = new THREE.Vector3(0, -0.2, 1); // elbows point down/back
    this.twoBone(b.upperArmR, b.lowerArmR, b.handR, rearW, poleBack);
    this.twoBone(b.upperArmL, b.lowerArmL, b.handL, frontW, poleBack);

    const pose: ArmPose = {
      upperL: b.upperArmL.quaternion.clone(),
      lowerL: b.lowerArmL.quaternion.clone(),
      upperR: b.upperArmR.quaternion.clone(),
      lowerR: b.lowerArmR.quaternion.clone(),
    };
    // Reset arms to rest so the first frame starts clean.
    b.upperArmL.quaternion.identity();
    b.lowerArmL.quaternion.identity();
    b.upperArmR.quaternion.identity();
    b.lowerArmR.quaternion.identity();
    return pose;
  }

  /**
   * 2-bone IK. Points `root`→`mid`→`tip` chain so `tip` reaches `targetWorld`,
   * bending toward `poleWorld`. Writes local quaternions on root and mid.
   */
  private twoBone(
    root: THREE.Bone,
    mid: THREE.Bone,
    tip: THREE.Bone,
    targetWorld: THREE.Vector3,
    poleHint: THREE.Vector3
  ) {
    const l1 = mid.position.length();
    const l2 = tip.position.length();
    root.getWorldPosition(_s);
    _t.copy(targetWorld);
    _v.subVectors(_t, _s);
    let d = _v.length();
    if (d < 1e-4) return;
    d = clamp(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    _n.copy(_v).normalize();

    // Bend plane from the pole hint (world), projected perpendicular to _n.
    _pole.copy(poleHint).normalize();
    const dp = _pole.dot(_n);
    _pole.addScaledVector(_n, -dp);
    if (_pole.lengthSq() < 1e-5) {
      _pole.set(_n.z, _n.x, -_n.y); // arbitrary perpendicular fallback
      _pole.addScaledVector(_n, -_pole.dot(_n));
    }
    _pole.normalize();

    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const a = Math.acos(cosA);
    _elbow.copy(_s).addScaledVector(_n, l1 * Math.cos(a)).addScaledVector(_pole, l1 * Math.sin(a));

    // Upper bone: aim boneDown (-Y) toward the elbow.
    root.parent!.getWorldQuaternion(_pq);
    _v2.subVectors(_elbow, _s).normalize();
    _q.setFromUnitVectors(_boneDown, _v2);
    _q2.copy(_pq).invert().multiply(_q);
    root.quaternion.copy(_q2);
    root.updateWorldMatrix(false, false);

    // Lower bone: aim boneDown toward the target from the elbow.
    root.getWorldQuaternion(_pq);
    _v2.subVectors(_t, _elbow).normalize();
    _q.setFromUnitVectors(_boneDown, _v2);
    _q2.copy(_pq).invert().multiply(_q);
    mid.quaternion.copy(_q2);
    mid.updateWorldMatrix(false, false);
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  update(dt: number, sampleGround: ((x: number, z: number) => number | null) | null) {
    const b = this.bones;

    // ---- advance timers ----
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt / 0.12);
    if (this.reloadT >= 0) {
      this.reloadT += dt / this.reloadDur;
      if (this.reloadT >= 1) {
        this.reloadT = -1;
        if (this.parts.rifle.mag) this.parts.rifle.mag.visible = true;
      }
    }
    if (this.grenadeT >= 0) {
      this.grenadeT += dt / 0.9;
      if (this.grenadeT >= 1) this.grenadeT = -1;
    }
    if (this.flinchT > 0) this.flinchT = Math.max(0, this.flinchT - dt / 0.28);
    if (this.dead) this.deathT = Math.min(1, this.deathT + dt / 0.5);

    // ---- locomotion blend ----
    const runSpeed = 4.2;
    const targetBlend = clamp(this.speed / runSpeed, 0, 1);
    this.locoBlend = damp(this.locoBlend, targetBlend, 0.001, dt);
    this.stanceBlend = damp(this.stanceBlend, this.stance === 'crouch' ? 1 : 0, 0.0005, dt);
    this.proneBlend = damp(this.proneBlend, this.stance === 'prone' ? 1 : 0, 0.0005, dt);

    // Stride length grows with speed; phase advances by distance travelled.
    const stride = lerp(0.9, 1.7, this.locoBlend);
    this.phase += (this.speed * dt) / Math.max(0.4, stride) * Math.PI * 2;
    if (this.phase > Math.PI * 4) this.phase -= Math.PI * 4;

    this.aimYaw = dampAngle(this.aimYaw, this.targetAimYaw, 0.0009, dt);
    this.aimPitch = damp(this.aimPitch, this.targetAimPitch, 0.0009, dt);

    // ---- reset pose ----
    this.resetBones();

    if (this.dead) {
      this.poseDeath();
      this.parts.root.updateMatrixWorld(true);
      return;
    }

    // ---- base pelvis (bob / sway / stance) ----
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const bob = this.locoBlend * Math.abs(c) * 0.045;
    const crouchDrop = this.stanceBlend * 0.32 + this.proneBlend * 0.85;
    b.pelvis.position.y = this.restPelvisY - crouchDrop + bob * (1 - this.proneBlend);
    b.pelvis.rotation.z = s * 0.05 * this.locoBlend;
    b.pelvis.rotation.y = c * 0.06 * this.locoBlend;

    // ---- legs: locomotion swing (base), foot IK refines below ----
    const swing = this.locoBlend * 0.7;
    this.poseLeg('thighL', 'shinL', s, swing, this.stanceBlend, this.proneBlend);
    this.poseLeg('thighR', 'shinR', -s, swing, this.stanceBlend, this.proneBlend);

    // ---- spine / chest aim + lean + counter-rotation + recoil ----
    const recoilKick = this.recoil * this.recoil * 0.22;
    const lean = this.locoBlend * 0.12 + this.stanceBlend * 0.15 + this.proneBlend * 1.15;
    const flinchPitch = this.flinchT * this.flinchT * 0.25;
    const pitch = clamp(-this.aimPitch * 0.5, -0.7, 0.7);
    b.spine.rotation.x = lean * 0.4 + pitch * 0.4 - recoilKick * 0.4 + flinchPitch * 0.5;
    b.spine.rotation.y = this.aimYaw * 0.25 - c * 0.08 * this.locoBlend;
    b.spine.rotation.z = this.flinchT * this.flinchT * this.flinchDir * 0.2;
    b.chest.rotation.x = lean * 0.6 + pitch * 0.6 - recoilKick * 0.6 + flinchPitch * 0.5;
    b.chest.rotation.y = this.aimYaw * 0.35;

    // Grenade throw: cock the torso back then whip forward.
    if (this.grenadeT >= 0) {
      const g = this.grenadeT;
      const wind = g < 0.45 ? g / 0.45 : 1 - (g - 0.45) / 0.55;
      b.chest.rotation.x -= wind * 0.5;
      b.chest.rotation.y -= wind * 0.4;
    }

    // ---- arms: cached grip pose + recoil + reload / grenade overrides ----
    this.poseArms(dt);

    // ---- refresh world for foot IK ----
    this.parts.root.updateMatrixWorld(true);
    if (sampleGround && this.proneBlend < 0.5) {
      this.footIK('thighL', 'shinL', 'footL', sampleGround, dt, 'L');
      this.footIK('thighR', 'shinR', 'footR', sampleGround, dt, 'R');
    }

    // ---- head look-at (layered, limited) ----
    const hy = clamp(this.aimYaw * 0.5, -1.0, 1.0);
    const hp = clamp(this.aimPitch * 0.6, -0.6, 0.6);
    b.neck.rotation.y = hy * 0.4;
    b.neck.rotation.x = hp * 0.4 + this.proneBlend * -0.6;
    b.head.rotation.y = hy * 0.6;
    b.head.rotation.x = hp * 0.6 - this.proneBlend * 0.5;

    this.parts.root.updateMatrixWorld(true);
  }

  private resetBones() {
    const b = this.bones;
    for (const k in b) {
      const bone = b[k as BoneKey];
      bone.quaternion.identity();
    }
    b.pelvis.position.y = this.restPelvisY;
  }

  private poseLeg(
    thigh: BoneKey,
    shin: BoneKey,
    phase: number,
    swing: number,
    crouch: number,
    prone: number
  ) {
    const b = this.bones;
    // Walk swing drives the base cycle. For crouch we deliberately keep the
    // thighs *under* the hips and only add a small forward knee pre-bend — the
    // pelvis drop plus foot IK then produce a natural, weight-bearing crouch
    // (bending the thigh back here made them look like they were sitting).
    const thighSwing = phase * swing;
    const kneeBend = Math.max(0, -phase) * swing * 1.2;
    b[thigh].rotation.x = thighSwing + crouch * 0.15 - prone * 0.4;
    b[shin].rotation.x = kneeBend + crouch * 0.45 + prone * 0.7;
  }

  private poseArms(dt: number) {
    const b = this.bones;
    const p = this.armPose;
    b.upperArmR.quaternion.copy(p.upperR);
    b.lowerArmR.quaternion.copy(p.lowerR);
    b.upperArmL.quaternion.copy(p.upperL);
    b.lowerArmL.quaternion.copy(p.lowerL);

    // Recoil: the whole rifle+arms kick as the chest already absorbed some;
    // add a sharp elbow flex on the trigger arm.
    if (this.recoil > 0) {
      const r = this.recoil * this.recoil;
      b.lowerArmR.rotation.x += r * 0.35;
      b.upperArmR.rotation.x -= r * 0.15;
    }

    // Reload: drop the support (left) hand to the mag well and back, and hide
    // the mag through the swap.
    if (this.reloadT >= 0) {
      const t = this.reloadT;
      const dip = Math.sin(clamp(t, 0, 1) * Math.PI);
      _q.setFromEuler(new THREE.Euler(dip * 0.9, dip * 0.5, 0));
      b.upperArmL.quaternion.multiply(_q);
      _q2.setFromEuler(new THREE.Euler(dip * 0.6, 0, 0));
      b.lowerArmL.quaternion.multiply(_q2);
      if (this.parts.rifle.mag) this.parts.rifle.mag.visible = t < 0.25 || t > 0.6;
    }

    // Grenade: the right arm winds back and throws.
    if (this.grenadeT >= 0) {
      const g = this.grenadeT;
      const wind = g < 0.45 ? g / 0.45 : 1 - (g - 0.45) / 0.55;
      _q.setFromEuler(new THREE.Euler(-wind * 1.6, -wind * 0.6, 0));
      b.upperArmR.quaternion.multiply(_q);
    }
    void dt;
  }

  private footIK(
    thigh: BoneKey,
    shin: BoneKey,
    foot: BoneKey,
    sampleGround: (x: number, z: number) => number | null,
    dt: number,
    side: 'L' | 'R'
  ) {
    const b = this.bones;
    // Where is the ankle now (world)?
    b[foot].getWorldPosition(_v);
    const g = sampleGround(_v.x, _v.z);
    if (g === null) return;
    const targetAnkleY = g + 0.09 * this.parts.heightScale;
    const smoothed = side === 'L'
      ? (this.footYL = damp(this.footYL || targetAnkleY, targetAnkleY, 0.0001, dt))
      : (this.footYR = damp(this.footYR || targetAnkleY, targetAnkleY, 0.0001, dt));

    b[thigh].getWorldPosition(_s);
    _t.set(_v.x, smoothed, _v.z);
    // Reuse the 2-bone solver with a forward-pointing pole so the knee bends
    // forward (-Z world-ish); good enough given the enemy faces its motion.
    _pole.set(0, -0.3, -1);
    this.twoBone(b[thigh], b[shin], b[foot], _t, _pole);
  }

  private poseDeath() {
    // Simple canned collapse used only when physics ragdoll is unavailable.
    const b = this.bones;
    const t = this.deathT;
    b.pelvis.position.y = lerp(this.restPelvisY, 0.2, t);
    b.pelvis.rotation.x = lerp(0, -1.2, t);
    b.spine.rotation.x = lerp(0, 0.6, t);
    b.chest.rotation.x = lerp(0, 0.5, t);
    b.head.rotation.x = lerp(0, 0.4, t);
    b.thighL.rotation.x = lerp(0, -0.8, t);
    b.thighR.rotation.x = lerp(0, -0.5, t);
    b.shinL.rotation.x = lerp(0, 1.2, t);
    b.shinR.rotation.x = lerp(0, 0.9, t);
    b.upperArmL.quaternion.copy(this.armPose.upperL);
    b.upperArmR.quaternion.copy(this.armPose.upperR);
  }
}
