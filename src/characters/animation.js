// Procedural pose/animation system for rigged humanoids — owner: Fable 4.
// Deterministic, no external animation data. Poses are joint-rotation sets
// blended by weights on top of a procedural gait; arms holding a weapon are
// solved with analytic two-bone IK so hands never detach from the gun.
//
// CharacterAnimator drives a rig from humanoid.js:
//   setMove(speed, dt)   gait phase accumulates with distance (no ice-skating)
//   setCrouch(frac)      0 stand .. 1 crouch
//   setAimPitch(p)       torso pitch (radians, + up)
//   triggerFire()        weapon recoil twitch
//   triggerFlinch(side)  hit reaction
//   playDeath()          0.9s animated fall (2 seeded variants), stays lying
//   setBound(v)          hostage zip-tie kneel while true (until first stand)
//   attachWeapon(group)  glue a weaponMeshes model into the right hand
//   update(dt)           computes the frame pose

import * as THREE from 'three';
import { Rng } from '../core/rng.js';

// ---------------------------------------------------------------- pose sets
// Additive joint-rotation poses (radians, [rx, ry, rz]), blended by weight.
export const POSES = {
  crouch: {
    hips: [0.12, 0, 0], chest: [0.22, 0, 0], neck: [-0.18, 0, 0],
    thighL: [1.02, 0, -0.06], shinL: [-1.5, 0, 0], footL: [0.42, 0, 0],
    thighR: [1.02, 0, 0.06], shinR: [-1.5, 0, 0], footR: [0.42, 0, 0],
  },
  kneel: { // bound hostage: knees down, shins flat behind, hands zip-tied back
    chest: [0.1, 0, 0], neck: [0.14, 0, 0], head: [0.1, 0, 0],
    thighL: [0.32, 0, -0.1], shinL: [-1.92, 0, 0], footL: [-0.55, 0, 0],
    thighR: [0.32, 0, 0.1], shinR: [-1.92, 0, 0], footR: [-0.55, 0, 0],
    armL: [-0.5, 0, 0.34], forearmL: [-0.72, 0, 0.15], handL: [-0.3, 0, 0],
    armR: [-0.5, 0, -0.34], forearmR: [-0.72, 0, -0.15], handR: [-0.3, 0, 0],
  },
  cower: { // freed hostage under fire: shield head with arms
    neck: [0.35, 0, 0], head: [0.2, 0, 0], chest: [0.14, 0, 0],
    armL: [2.5, 0, 0.5], forearmL: [1.15, 0, 0.35], handL: [0.3, 0, 0],
    armR: [2.5, 0, -0.5], forearmR: [1.15, 0, -0.35], handR: [0.3, 0, 0],
  },
};

// Absolute death target rotations (slerped from the live pose snapshot).
const DEATHS = [
  { // crumple backward
    rootY: -0.85,
    joints: {
      hips: [1.42, 0, 0], spine: [-0.08, 0, 0], chest: [-0.12, 0.08, 0],
      neck: [-0.22, 0, 0], head: [-0.18, 0.2, 0],
      thighL: [-0.55, 0, -0.14], shinL: [-0.85, 0, 0], footL: [0.4, 0, 0],
      thighR: [-0.2, 0, 0.18], shinR: [-0.35, 0, 0], footR: [0.5, 0, 0],
      armL: [0.35, 0, 0.85], forearmL: [-0.4, 0, 0.2], handL: [0, 0, 0],
      armR: [0.6, 0, -1.0], forearmR: [-0.25, 0, -0.2], handR: [0, 0, 0],
    },
  },
  { // sideways twist (falls to its right)
    rootY: -0.82,
    joints: {
      hips: [0.18, 0.55, -1.42], spine: [0.1, -0.15, 0], chest: [0.12, -0.25, -0.08],
      neck: [0.1, 0, 0.2], head: [0.05, -0.2, 0.25],
      thighL: [0.5, 0, -0.2], shinL: [-0.75, 0, 0], footL: [0.3, 0, 0],
      thighR: [-0.25, 0, 0.12], shinR: [-0.4, 0, 0], footR: [0.4, 0, 0],
      armL: [0.4, 0, 1.15], forearmL: [-0.6, 0, 0.3], handL: [0, 0, 0],
      armR: [1.25, 0, -0.5], forearmR: [-0.5, 0, -0.15], handR: [0, 0, 0],
    },
  },
];

export function applyPose(joints, pose, w = 1) {
  if (w <= 0) return;
  for (const name in pose) {
    const j = joints[name];
    if (!j) continue;
    const e = pose[name];
    j.rotation.x += e[0] * w;
    j.rotation.y += e[1] * w;
    j.rotation.z += e[2] * w;
  }
}

// ---------------------------------------------------------------- temps
const _vS = new THREE.Vector3(), _vT = new THREE.Vector3(), _vD = new THREE.Vector3();
const _vB = new THREE.Vector3(), _vE = new THREE.Vector3(), _vP = new THREE.Vector3();
const _qA = new THREE.Quaternion(), _qB = new THREE.Quaternion(), _qC = new THREE.Quaternion();
const _qT = new THREE.Quaternion(), _qD = new THREE.Quaternion(), _qBody = new THREE.Quaternion();
const _down = new THREE.Vector3(0, -1, 0);
const _m4 = new THREE.Matrix4();
const _eul = new THREE.Euler();

const JOINT_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'armL', 'forearmL', 'handL', 'armR', 'forearmR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR',
];

export class CharacterAnimator {
  constructor(rig, { kind = 'enemy', seed = 1 } = {}) {
    this.rig = rig;
    this.j = rig.joints;
    this.kind = kind;
    this.rng = new Rng(((seed + 11) * 1103515245) >>> 0 || 3);
    this.time = this.rng.range(0, 9);
    this.scanOff = this.rng.range(0, 6.28);
    this.phase = this.rng.range(0, 6.28);
    this.speedTarget = 0;
    this.speedSm = 0;
    this.crouch = 0;
    this.aimPitch = 0;
    this.fireT = 0;
    this.flinchT = 0;
    this.flinchSide = 1;
    this.bound = kind === 'hostage';
    this.everStood = false;
    this.dead = null;
    this.weapon = null;
    this.anchor = null;
    this.anchorBase = new THREE.Vector3();
    this.armLen = { a: 0.29, b: 0.26 };
  }

  setMove(speed, dt) {
    this.speedTarget = speed;
    this.phase += speed * dt * 4.1; // stride phase proportional to distance
  }
  setCrouch(f) {
    this.crouch = f;
    if (this.bound && f < 0.5) { this.bound = false; this.everStood = true; }
  }
  setAimPitch(p) { this.aimPitch = p; }
  triggerFire() { this.fireT = 1; }
  triggerFlinch(side = 1) { this.flinchT = 1; this.flinchSide = side; }

  playDeath() {
    if (this.dead) return;
    const variant = this.rng.chance(0.5) ? 0 : 1;
    const snap = { rootY: this.rig.root.position.y, q: {} };
    for (const n of JOINT_NAMES) snap.q[n] = this.j[n].quaternion.clone();
    this.dead = { t: 0, variant, snap };
  }

  // Glue a weapon model into the right hand: an anchor under the chest defines
  // the carry transform; hands IK to it every frame so the grip never breaks.
  attachWeapon(weaponGroup) {
    const chest = this.j.chest;
    const anchor = new THREE.Object3D();
    anchor.name = 'weaponAnchor';
    this.anchorBase.set(0.11, -0.05, -0.27);
    anchor.position.copy(this.anchorBase);
    anchor.quaternion.setFromEuler(new THREE.Euler(-0.12, 0.05, 0));
    chest.add(anchor);
    this.anchor = anchor;
    this.weapon = weaponGroup;

    // one pose pass so the hand is where it will live
    this.update(0);
    this.rig.group.updateMatrixWorld(true);

    // weapon world target: gripR marker coincides with the anchor
    const gripR = weaponGroup.userData.gripR;
    const gOff = gripR ? gripR.position : _vP.set(0, 0, 0);
    anchor.updateWorldMatrix(true, false);
    _m4.copy(anchor.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(-gOff.x, -gOff.y, -gOff.z));
    const handR = this.j.handR;
    handR.updateWorldMatrix(true, false);
    const local = new THREE.Matrix4().copy(handR.matrixWorld).invert().multiply(_m4);
    handR.add(weaponGroup);
    local.decompose(weaponGroup.position, weaponGroup.quaternion, weaponGroup.scale);
  }

  update(dt) {
    this.time += dt;
    this.fireT = Math.max(0, this.fireT - dt * 7);
    this.flinchT = Math.max(0, this.flinchT - dt * 4.5);
    this.speedSm += (this.speedTarget - this.speedSm) * Math.min(1, dt * 9);

    if (this.dead) { this.updateDeath(dt); return; }
    this.poseLive();
    if (this.weapon && this.anchor) this.solveWeaponArms();
  }

  // -------------------------------------------------------------- live pose
  poseLive() {
    const J = this.j;
    const root = this.rig.root;
    for (const n of JOINT_NAMES) J[n].rotation.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    const w = THREE.MathUtils.clamp(this.speedSm / 1.4, 0, 1);
    const runW = THREE.MathUtils.clamp((this.speedSm - 2.4) / 1.7, 0, 1);
    const c = this.crouch;
    const p = this.phase;
    const t = this.time;
    const kneeling = this.bound && this.kind === 'hostage';
    const cowerW = (this.kind === 'hostage' && !kneeling) ? THREE.MathUtils.clamp((c - 0.55) / 0.45, 0, 1) * (1 - w) : 0;

    let rootY = 0;

    // ---- base stance
    if (this.kind === 'enemy') {
      J.chest.rotation.x += 0.06;
      J.thighL.rotation.set(0.06, 0, -0.05);
      J.thighR.rotation.set(0.06, 0, 0.05);
      J.shinL.rotation.x -= 0.1;
      J.shinR.rotation.x -= 0.1;
      J.footL.rotation.x += 0.04;
      J.footR.rotation.x += 0.04;
    }

    // ---- gait (phase ∝ distance travelled)
    if (w > 0.001 && !kneeling) {
      const sw = Math.sin(p);
      const legAmp = 0.42 * w + 0.28 * runW;
      const kneeAmp = 0.62 * w + 0.55 * runW;
      J.thighL.rotation.x += sw * legAmp + 0.1 * w;
      J.thighR.rotation.x += -sw * legAmp + 0.1 * w;
      J.shinL.rotation.x -= kneeAmp * Math.max(0, Math.sin(p + 1.0)) + 0.12 * w;
      J.shinR.rotation.x -= kneeAmp * Math.max(0, Math.sin(p + 1.0 + Math.PI)) + 0.12 * w;
      J.footL.rotation.x -= (J.thighL.rotation.x + J.shinL.rotation.x) * 0.5;
      J.footR.rotation.x -= (J.thighR.rotation.x + J.shinR.rotation.x) * 0.5;
      J.hips.rotation.y -= sw * 0.07 * w;
      J.hips.rotation.z += sw * 0.035 * w;
      J.chest.rotation.y += sw * 0.09 * w;
      J.chest.rotation.x += 0.1 * runW;
      rootY -= (0.016 * w + 0.022 * runW) * (0.5 - 0.5 * Math.cos(2 * p));
      if (this.kind === 'hostage') {
        const armAmp = 0.38 * w + 0.25 * runW;
        J.armL.rotation.x += sw * armAmp;
        J.armR.rotation.x += -sw * armAmp;
        J.forearmL.rotation.x += -0.25 - Math.max(0, sw) * 0.35 * w;
        J.forearmR.rotation.x += -0.25 - Math.max(0, -sw) * 0.35 * w;
      }
    } else if (this.kind === 'hostage' && !kneeling && cowerW < 1) {
      // relaxed hanging arms
      const rw = 1 - cowerW;
      J.armL.rotation.set(0.06 * rw, 0, 0.1 * rw);
      J.armR.rotation.set(0.06 * rw, 0, -0.1 * rw);
      J.forearmL.rotation.x += -0.22 * rw;
      J.forearmR.rotation.x += -0.22 * rw;
    }

    // ---- crouch / kneel / cower
    if (kneeling) {
      applyPose(J, POSES.kneel, 1);
      rootY -= 0.52;
    } else {
      applyPose(J, POSES.crouch, c);
      rootY -= 0.34 * c;
      applyPose(J, POSES.cower, cowerW);
    }

    // ---- aim pitch (torso bends toward the target)
    if (this.kind === 'enemy') {
      J.chest.rotation.x -= this.aimPitch * 0.55;
      J.neck.rotation.x -= this.aimPitch * 0.3;
    }

    // ---- breathing + idle scan
    J.chest.rotation.x += Math.sin(t * 1.35) * 0.012;
    const idleW = 1 - Math.min(1, w * 2);
    if (idleW > 0 && !kneeling) {
      J.head.rotation.y += Math.sin(t * 0.42 + this.scanOff) * 0.3 * idleW;
      J.head.rotation.x += Math.sin(t * 0.3 + this.scanOff * 2) * 0.05 * idleW;
    }
    if (kneeling) {
      J.head.rotation.y += Math.sin(t * 0.3 + this.scanOff) * 0.14; // fearful glances
      J.chest.rotation.x += Math.sin(t * 2.6) * 0.012;              // quick breathing
    }

    // ---- fire recoil twitch / flinch (additive)
    if (this.fireT > 0) {
      const f = this.fireT;
      J.chest.rotation.x -= 0.07 * f;
      J.armL.rotation.x -= 0.05 * f;
      J.armR.rotation.x -= 0.05 * f;
    }
    if (this.flinchT > 0) {
      const f = this.flinchT;
      J.chest.rotation.x += 0.14 * f;
      J.chest.rotation.y += 0.12 * f * this.flinchSide;
      J.neck.rotation.x += 0.1 * f;
      J.head.rotation.z += 0.08 * f * this.flinchSide;
    }

    // ---- weapon carry anchor recoil
    if (this.anchor) {
      this.anchor.position.copy(this.anchorBase);
      this.anchor.position.z += 0.035 * this.fireT;
      this.anchor.position.y += 0.008 * this.fireT;
    }

    root.position.set(0, rootY, 0);
  }

  // -------------------------------------------------------------- arm IK
  solveWeaponArms() {
    const J = this.j;
    const s = this.rig.dims.scale;
    const a = this.armLen.a * s, b = this.armLen.b * s;
    this.rig.group.updateMatrixWorld(true);

    const anchorQ = this.anchor.getWorldQuaternion(_qT);
    this.rig.root.getWorldQuaternion(_qBody);

    // right hand: wrist just above the grip
    _vT.set(0, 0.055, 0.025).applyQuaternion(anchorQ).add(this.anchor.getWorldPosition(_vP));
    _vB.set(0.75, -0.45, 0.4).applyQuaternion(_qBody);
    this.solveArm(J.armR, J.forearmR, a, b, _vT, _vB);
    _qA.setFromEuler(_eul.set(-0.35, 0, 0)).premultiply(anchorQ);
    this.setHandWorldQuat(J.handR, _qA);

    // left hand: reaches the weapon's forend marker
    J.handR.updateWorldMatrix(true, true);
    const gripL = this.weapon.userData.gripL;
    if (gripL) {
      gripL.getWorldPosition(_vT);
      _vD.set(0, -0.035, 0.03).applyQuaternion(anchorQ);
      _vT.add(_vD);
      _vB.set(-0.85, -0.5, 0.15).applyQuaternion(_qBody);
      this.solveArm(J.armL, J.forearmL, a, b, _vT, _vB);
      _qA.setFromEuler(_eul.set(-1.2, 0, 0.15)).premultiply(anchorQ);
      this.setHandWorldQuat(J.handL, _qA);
    }
  }

  solveArm(arm, fore, a, b, targetW, poleW) {
    arm.parent.updateWorldMatrix(true, false);
    const S = arm.getWorldPosition(_vS);
    _vD.copy(targetW).sub(S);
    let L = _vD.length();
    L = THREE.MathUtils.clamp(L, 0.12, a + b - 0.015);
    _vD.normalize();
    // bend plane direction (pole projected off the shoulder->target axis)
    _vB.copy(poleW).addScaledVector(_vD, -poleW.dot(_vD));
    if (_vB.lengthSq() < 1e-6) _vB.set(0, -1, 0).addScaledVector(_vD, _vD.y);
    _vB.normalize();
    const p = (a * a - b * b + L * L) / (2 * L);
    const h = Math.sqrt(Math.max(1e-6, a * a - p * p));
    _vE.copy(S).addScaledVector(_vD, p).addScaledVector(_vB, h); // elbow

    // world orientations for both segments (bones extend along local -Y)
    _qA.setFromUnitVectors(_down, _vP.copy(_vE).sub(S).normalize());
    _vP.copy(S).addScaledVector(_vD, L); // clamped wrist position
    _qB.setFromUnitVectors(_down, _vP.sub(_vE).normalize());
    // local conversions: armLocal = parentWorld⁻¹ * qA ; foreLocal = qA⁻¹ * qB
    const parentQ = arm.parent.getWorldQuaternion(_qC);
    arm.quaternion.copy(_qD.copy(parentQ).invert().multiply(_qA));
    arm.rotation.setFromQuaternion(arm.quaternion);
    fore.quaternion.copy(_qD.copy(_qA).invert().multiply(_qB));
    fore.rotation.setFromQuaternion(fore.quaternion);
  }

  setHandWorldQuat(hand, worldQ) {
    hand.parent.updateWorldMatrix(true, false);
    const parentQ = hand.parent.getWorldQuaternion(_qB);
    hand.quaternion.copy(_qD.copy(parentQ).invert().multiply(worldQ));
    hand.rotation.setFromQuaternion(hand.quaternion);
  }

  // -------------------------------------------------------------- death
  updateDeath(dt) {
    const d = this.dead;
    d.t += dt;
    const tt = Math.min(1, d.t / 0.9);
    let e;
    if (tt < 0.7) e = Math.pow(tt / 0.7, 1.8);
    else {
      const bt = (tt - 0.7) / 0.3;
      e = 1 - 0.06 * Math.sin(bt * Math.PI) * (1 - bt); // land + slight bounce
    }
    const def = DEATHS[d.variant];
    const J = this.j;
    for (const n of JOINT_NAMES) {
      const target = def.joints[n];
      if (!target) continue;
      _qT.setFromEuler(_eul.set(target[0], target[1], target[2]));
      J[n].quaternion.slerpQuaternions(d.snap.q[n], _qT, e);
      J[n].rotation.setFromQuaternion(J[n].quaternion);
    }
    const root = this.rig.root;
    root.position.y = THREE.MathUtils.lerp(d.snap.rootY, def.rootY * this.rig.dims.scale, e);
  }
}
