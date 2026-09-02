import * as THREE from 'three';
import { ANIM, DEATH, MODEL_SOURCE_HEIGHT, MOVE, SOLDIER_HEIGHT } from './constants.js';
import { createSoldierRifle } from './SoldierRifle.js';
import { createSoldierMaterials } from './SoldierMaterials.js';
import { buildGearGeometry, createGearMesh } from './SoldierGear.js';

const UP = new THREE.Vector3(0, 1, 0);
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler();

const BONES = {
  hips: 'mixamorigHips',
  spine: 'mixamorigSpine',
  spine1: 'mixamorigSpine1',
  spine2: 'mixamorigSpine2',
  neck: 'mixamorigNeck',
  head: 'mixamorigHead',
  headTop: 'mixamorigHeadTop_End',
  lShoulder: 'mixamorigLeftShoulder',
  lArm: 'mixamorigLeftArm',
  lForeArm: 'mixamorigLeftForeArm',
  lHand: 'mixamorigLeftHand',
  rShoulder: 'mixamorigRightShoulder',
  rArm: 'mixamorigRightArm',
  rForeArm: 'mixamorigRightForeArm',
  rHand: 'mixamorigRightHand',
  lUpLeg: 'mixamorigLeftUpLeg',
  lLeg: 'mixamorigLeftLeg',
  lFoot: 'mixamorigLeftFoot',
  lToe: 'mixamorigLeftToeBase',
  rUpLeg: 'mixamorigRightUpLeg',
  rLeg: 'mixamorigRightLeg',
  rFoot: 'mixamorigRightFoot',
  rToe: 'mixamorigRightToeBase',
};
const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];

/** Rotate a bone about a world-space axis (keeps whatever the animation produced, adds on top). */
function rotateBoneWorld(bone, axis, angle) {
  if (!bone || Math.abs(angle) < 1e-5) return;
  bone.parent.getWorldQuaternion(_q1);
  _q2.setFromAxisAngle(axis, angle);
  _q3.copy(_q1).invert().multiply(_q2).multiply(_q1);
  bone.quaternion.premultiply(_q3);
  bone.updateWorldMatrix(false, false);
}

/** Set a bone's world orientation. */
function setBoneWorldQuaternion(bone, qWorld) {
  bone.parent.getWorldQuaternion(_q1);
  bone.quaternion.copy(_q1.invert().multiply(qWorld));
  bone.updateWorldMatrix(false, false);
}

/** Rotation that maps unit vector `from` to unit vector `to`, applied to a bone in world space. */
function alignBoneWorld(bone, from, to, maxAngle = Math.PI) {
  const cos = THREE.MathUtils.clamp(from.dot(to), -1, 1);
  const angle = Math.min(Math.acos(cos), maxAngle);
  if (angle < 1e-4) return;
  _v5.crossVectors(from, to);
  if (_v5.lengthSq() < 1e-10) return;
  _v5.normalize();
  rotateBoneWorld(bone, _v5, angle);
}

/**
 * One AI soldier's visuals: Soldier.glb clone, animation mixer (Idle/Walk/Run blended by speed),
 * procedural upper-body aim (Spine1/Spine2/Head), procedural crouch, a rifle held with two-bone IK
 * arms, shared tactical materials (SoldierMaterials.js), a skinned gear mesh (SoldierGear.js) with the
 * red-team armband/patch, recoil, and the death collapse.
 *
 * Root frame: `root` sits at the feet (world metres), rotated by `yaw` (model forward is -Z like the
 * player/camera convention). The skeleton lives in centimetres under the glTF 'Character' node.
 */
export class SoldierModel {
  constructor(game, shared, { tint = 0, seed = Math.random() } = {}) {
    this.game = game;
    this.shared = shared;
    this.seed = seed;
    this.root = new THREE.Group();
    this.root.name = 'Soldier';
    this.yaw = 0;

    const model = game.assets.instantiate(shared.id, shared.gltf);
    model.name = 'SoldierModel';
    this.scale = SOLDIER_HEIGHT / MODEL_SOURCE_HEIGHT;
    model.scale.setScalar(this.scale);
    this.model = model;
    this.root.add(model);

    // --- Bones --------------------------------------------------------------------------------
    this.bones = {};
    for (const [key, name] of Object.entries(BONES)) this.bones[key] = model.getObjectByName(name) || null;
    this.fingerBones = { left: [], right: [] };
    for (const side of ['Left', 'Right']) {
      for (const f of FINGERS) for (let i = 1; i <= 3; i++) {
        const b = model.getObjectByName(`mixamorig${side}Hand${f}${i}`);
        if (b) this.fingerBones[side === 'Left' ? 'left' : 'right'].push(b);
      }
    }
    // Bone lengths (world metres) from the rest pose.
    model.updateMatrixWorld(true);
    const len = (a, b) => (a && b ? a.getWorldPosition(_v1).distanceTo(b.getWorldPosition(_v2)) : 0.25);
    this.armLen = {
      lUpper: len(this.bones.lArm, this.bones.lForeArm),
      lLower: len(this.bones.lForeArm, this.bones.lHand),
      rUpper: len(this.bones.rArm, this.bones.rForeArm),
      rLower: len(this.bones.rForeArm, this.bones.rHand),
    };

    // --- Materials: shared tactical set (remapped albedo + ORM), one tint variant per soldier ---------
    // Nothing is cloned per instance: the body picks one of the shared variants by seed, the visor and
    // gear materials are shared outright. Enemies.spawn() runs render.setupObject() on the root so the
    // materials are registered for cascaded shadows before their first frame.
    const mats = shared.materials;
    const variant = mats.body[Math.floor(THREE.MathUtils.clamp(tint, 0, 0.999) * mats.body.length)];
    this.materials = [variant, mats.visor, mats.gear];
    this.skinned = [];
    let bodyMesh = null;
    model.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned bounds are unreliable while animating/ragdolling
      if (o.isSkinnedMesh) this.skinned.push(o);
      const isVisor = /visor/i.test(o.material?.name || '') || /visor/i.test(o.name);
      o.material = isVisor ? mats.visor : variant;
      if (!isVisor && o.isSkinnedMesh && !bodyMesh) bodyMesh = o;
    });

    // --- Tactical gear: one skinned mesh riding the body's skeleton (helmet kit, plate carrier, mags,
    // radio, holster, knee pads, team armband). Authored in bind space, so it follows every pose.
    this.gear = null;
    if (bodyMesh && shared.gearGeo) {
      this.gear = createGearMesh(bodyMesh, shared.gearGeo, mats.gear);
      this.skinned.push(this.gear);
    }

    // --- Rifle (root space, metres) ----------------------------------------------------------------
    this.rifle = createSoldierRifle();
    this.root.add(this.rifle);
    this.rifleWorldPos = new THREE.Vector3();
    this.rifleWorldQuat = new THREE.Quaternion();
    this.recoilAmount = 0;
    this.recoilKick = 1;

    // --- Animation -------------------------------------------------------------------------------
    this.mixer = new THREE.AnimationMixer(model);
    const act = (name) => {
      const clip = shared.clips[name];
      if (!clip) return null;
      const a = this.mixer.clipAction(clip);
      a.enabled = true;
      a.setEffectiveWeight(0);
      a.play();
      return a;
    };
    this.actions = { idle: act('Idle'), walk: act('Walk'), run: act('Run') };
    if (this.actions.idle) {
      this.actions.idle.setEffectiveWeight(1);
      this.actions.idle.time = seed * this.actions.idle.getClip().duration;
    }
    if (this.actions.walk) this.actions.walk.setEffectiveTimeScale(0);
    if (this.actions.run) this.actions.run.setEffectiveTimeScale(0);
    this.phase = seed;
    this.animSpeed = 0;
    this.speed = 0;

    // --- Pose state ------------------------------------------------------------------------------
    this.aimTarget = new THREE.Vector3();
    this.hasAimTarget = false;
    this.aimBlend = 0; // 0 = low ready, 1 = shouldered aim
    this.crouch = 0;
    this.crouchTarget = 0;
    this.lookScan = seed * Math.PI * 2;
    this.aimDir = new THREE.Vector3(0, 0, -1);
    this.rifleForward = new THREE.Vector3(0, 0, -1);
    this.time = 0;

    // --- Death ------------------------------------------------------------------------------------
    this.dead = false;
    this.death = null;

    this.root.updateMatrixWorld(true);
  }

  /* ------------------------------------------------------------------------------------------- pose input */

  setAim(target) {
    if (target) {
      this.aimTarget.copy(target);
      this.hasAimTarget = true;
    } else this.hasAimTarget = false;
  }

  /** Kick the rifle (and, through IK, the arms) — call once per round fired. */
  recoil(strength = 1) {
    this.recoilAmount = Math.min(1.6, this.recoilAmount + 0.75 * strength);
  }

  /* ------------------------------------------------------------------------------------------- frame update */

  /**
   * @param dt      seconds
   * @param speed   current horizontal speed (m/s) → locomotion blend
   * @param yaw     body yaw (radians, forward = -Z rotated about +Y)
   */
  update(dt, speed, yaw) {
    this.time += dt;
    this.yaw = yaw;
    this.root.rotation.set(0, yaw, 0);
    this.root.updateMatrixWorld(true);
    if (this.dead) {
      this._updateDeath(dt);
      return;
    }
    this.speed = speed;
    this._updateLocomotion(dt, speed);
    this.mixer.update(dt);
    this.crouch += (this.crouchTarget - this.crouch) * Math.min(1, dt * ANIM.crouchBlendRate);
    this.aimBlend += ((this.hasAimTarget ? 1 : 0) - this.aimBlend) * Math.min(1, dt * ANIM.aimBlendRate);
    this.recoilAmount -= this.recoilAmount * Math.min(1, dt * 11);

    if (this.crouch > 0.01) this._applyCrouch(this.crouch);
    if (!this.shared.debugNoAim) this._applyAim(dt);
    this._placeRifle();
    if (!this.shared.debugNoArms) this._solveArms();
  }

  _updateLocomotion(dt, speed) {
    this.animSpeed += (speed - this.animSpeed) * Math.min(1, dt * ANIM.blendRate);
    const s = Math.max(0, this.animSpeed);
    const runT = THREE.MathUtils.clamp((s - MOVE.walkSpeed) / (MOVE.runSpeed - MOVE.walkSpeed), 0, 1);
    const moveT = THREE.MathUtils.clamp(s / 0.9, 0, 1);
    const wIdle = 1 - moveT;
    const wWalk = moveT * (1 - runT);
    const wRun = moveT * runT;
    const stride = THREE.MathUtils.lerp(ANIM.walkStride, ANIM.runStride, runT);
    if (s > 0.05) this.phase = (this.phase + (dt * s) / stride) % 1;
    const { idle, walk, run } = this.actions;
    if (idle) idle.setEffectiveWeight(wIdle); // weights must sum to 1 or the mixer blends in the bind pose
    if (walk) {
      walk.setEffectiveWeight(wWalk);
      walk.time = this.phase * walk.getClip().duration;
    }
    if (run) {
      run.setEffectiveWeight(wRun);
      run.time = this.phase * run.getClip().duration;
    }
  }

  /** Procedural crouch: lower the hips, fold the legs, lean the torso. */
  _applyCrouch(c) {
    const b = this.bones;
    const right = _v1.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    if (b.hips) b.hips.position.z -= 30 * c; // Character space: +Z is up (cm)
    for (const side of ['l', 'r']) {
      rotateBoneWorld(b[`${side}UpLeg`], right, 0.95 * c);
      rotateBoneWorld(b[`${side}Leg`], right, -1.55 * c);
      rotateBoneWorld(b[`${side}Foot`], right, 0.6 * c);
    }
    rotateBoneWorld(b.spine, right, -0.22 * c);
    rotateBoneWorld(b.spine1, right, -0.1 * c);
  }

  /** Upper-body aim: distribute yaw/pitch toward the target across Spine1, Spine2 and Head. */
  _applyAim(dt) {
    const b = this.bones;
    const a = this.aimBlend;
    // Posture: the clips hunch the torso ~20° forward with the head down (rifle idle). Straighten toward
    // a combat stance — a little when relaxed, almost fully when aiming (positive = lean back).
    const bodyRight = _v4.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const straighten = THREE.MathUtils.lerp(ANIM.postureIdle, ANIM.postureAim, a) * (1 - this.crouch * 0.5);
    rotateBoneWorld(b.spine1, bodyRight, straighten * 0.5);
    rotateBoneWorld(b.spine2, bodyRight, straighten * 0.5);
    rotateBoneWorld(b.head, bodyRight, ANIM.postureHead * (1 - a));
    const chest = b.spine2 ? b.spine2.getWorldPosition(_v1) : _v1.copy(this.root.position).setY(this.root.position.y + 1.3);
    let dYaw = 0;
    let pitch = 0;
    if (this.hasAimTarget) {
      _v2.subVectors(this.aimTarget, chest);
      const dist = _v2.length();
      if (dist > 0.01) {
        _v2.multiplyScalar(1 / dist);
        this.aimDir.copy(_v2);
        const yawT = Math.atan2(-_v2.x, -_v2.z);
        dYaw = wrapAngle(yawT - this.yaw);
        pitch = Math.asin(THREE.MathUtils.clamp(_v2.y, -1, 1));
      }
    } else {
      this.aimDir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    }
    // Idle scan when there is no target: slow head sweep so nobody stands frozen.
    this.lookScan += dt * 0.6;
    const scan = (1 - a) * Math.sin(this.lookScan) * 0.35 * (this.speed < 0.2 ? 1 : 0.35);
    // Bladed stance while aiming: the torso turns right so the support shoulder comes forward (the rig's
    // arms are short — without this the left hand cannot reach the handguard); the head counter-rotates.
    const blade = -ANIM.bladeYaw * a;
    const yawS1 = THREE.MathUtils.clamp(dYaw * 0.3, -0.5, 0.5) * a + blade * 0.5;
    const yawS2 = THREE.MathUtils.clamp(dYaw * 0.3, -0.5, 0.5) * a + blade * 0.5;
    const yawHead = THREE.MathUtils.clamp(dYaw - yawS1 - yawS2, -1.0, 1.0) * a + scan;
    const pitchS1 = THREE.MathUtils.clamp(pitch * 0.2, -0.3, 0.3) * a;
    const pitchS2 = THREE.MathUtils.clamp(pitch * 0.3, -0.35, 0.35) * a;
    const pitchHead = THREE.MathUtils.clamp(pitch - pitchS1 - pitchS2, -0.6, 0.6) * a;
    const aimYaw = this.yaw + dYaw * a;
    const aimRight = _v3.set(Math.cos(aimYaw), 0, -Math.sin(aimYaw));
    rotateBoneWorld(b.spine1, UP, yawS1);
    rotateBoneWorld(b.spine1, aimRight, pitchS1);
    rotateBoneWorld(b.spine2, UP, yawS2);
    rotateBoneWorld(b.spine2, aimRight, pitchS2);
    rotateBoneWorld(b.head, UP, yawHead);
    rotateBoneWorld(b.head, aimRight, pitchHead);
    this.aimYaw = aimYaw;
    this.aimPitch = pitch * a;
  }

  /** Blend the rifle between a low-ready carry and a shouldered aim; converts to root space. */
  _placeRifle() {
    const b = this.bones;
    const a = this.aimBlend;
    const chest = b.spine2 ? b.spine2.getWorldPosition(_v1) : _v1.copy(this.root.position).setY(this.root.position.y + 1.3);
    const yaw = this.yaw;
    const fwd = _v2.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = _v3.set(Math.cos(yaw), 0, -Math.sin(yaw));

    // Low ready: carried across the belly, muzzle forward-down and to the left (reads as a diagonal
    // rifle from the front instead of a stick pointing at the ground).
    const readyPos = _v4.copy(chest).addScaledVector(right, 0.06).addScaledVector(fwd, 0.22).addScaledVector(UP, -0.17 - this.crouch * 0.05);
    const readyQ = _q1.setFromEuler(_e1.set(-0.36, yaw + 0.42, 0.12, 'YXZ'));

    // Shouldered: butt plate in the right shoulder pocket (follows the actual, bladed shoulder), bore
    // pointing along the aim direction.
    const aimYaw = this.aimYaw ?? yaw;
    const aimPitch = this.aimPitch ?? 0;
    const aFwd = _v5.set(-Math.sin(aimYaw), 0, -Math.cos(aimYaw));
    const aimQ = _q2.setFromEuler(_e1.set(aimPitch, aimYaw, 0, 'YXZ'));
    const stockLocal = this.rifle.sockets.stock.position;
    const stockWorld = new THREE.Vector3();
    if (b.rArm) {
      b.rArm.getWorldPosition(stockWorld);
      const inward = new THREE.Vector3().subVectors(chest, stockWorld).setY(0);
      if (inward.lengthSq() > 1e-6) inward.normalize();
      stockWorld.addScaledVector(inward, 0.06).addScaledVector(aFwd, 0.03).addScaledVector(UP, 0.07);
    } else {
      const aRight = new THREE.Vector3(Math.cos(aimYaw), 0, -Math.sin(aimYaw));
      stockWorld.copy(chest).addScaledVector(aRight, 0.13).addScaledVector(aFwd, 0.02).addScaledVector(UP, 0.12);
    }
    const aimPos = stockWorld.sub(_v5.copy(stockLocal).applyQuaternion(aimQ));

    const pos = this.rifleWorldPos.copy(readyPos).lerp(aimPos, a);
    const q = this.rifleWorldQuat.copy(readyQ).slerp(aimQ, a);

    // Recoil: slide back along the bore and pitch up.
    if (this.recoilAmount > 0.001) {
      const back = _v5.set(0, 0, 1).applyQuaternion(q);
      pos.addScaledVector(back, 0.035 * this.recoilAmount);
      const rx = _v4.set(1, 0, 0).applyQuaternion(q);
      q.premultiply(_q3.setFromAxisAngle(rx, 0.045 * this.recoilAmount));
    }
    this.rifleForward.set(0, 0, -1).applyQuaternion(q);

    // World → root local.
    _m1.copy(this.root.matrixWorld).invert();
    this.rifle.position.copy(pos).applyMatrix4(_m1);
    this.root.getWorldQuaternion(_q3);
    this.rifle.quaternion.copy(_q3.invert().multiply(q));
    this.rifle.updateMatrixWorld(true);
  }

  /** Two-bone IK for both arms so the hands hold the rifle sockets; then orient the hands. */
  _solveArms() {
    const b = this.bones;
    const s = this.rifle.sockets;
    const q = this.rifleWorldQuat;
    const rFwd = _v1.set(0, 0, -1).applyQuaternion(q);
    const rRight = _v2.set(1, 0, 0).applyQuaternion(q);
    const rUp = _v3.set(0, 1, 0).applyQuaternion(q);
    const chest = b.spine2 ? b.spine2.getWorldPosition(new THREE.Vector3()) : this.root.position.clone();

    // Right hand → pistol grip. Elbow pole: down, out to the right and back.
    if (b.rArm && b.rForeArm && b.rHand) {
      const target = s.grip.getWorldPosition(new THREE.Vector3());
      const pole = chest.clone().addScaledVector(rRight, 0.55).addScaledVector(rUp, -0.6).addScaledVector(rFwd, -0.1);
      this._ikArm(b.rArm, b.rForeArm, b.rHand, this.armLen.rUpper, this.armLen.rLower, target, pole);
      // Fingers along the grip (down/forward), palm facing the rifle's left side.
      const fingers = new THREE.Vector3().addScaledVector(rFwd, 0.55).addScaledVector(rUp, -0.8).addScaledVector(rRight, -0.25).normalize();
      const palm = new THREE.Vector3().addScaledVector(rRight, -1).addScaledVector(rUp, -0.15).normalize();
      this._orientHand(b.rHand, fingers, palm, this.shared.palmAxis.right);
    }
    // Left hand → handguard from below. Elbow pole: down and slightly left.
    if (b.lArm && b.lForeArm && b.lHand) {
      const target = s.foregrip.getWorldPosition(new THREE.Vector3());
      const pole = chest.clone().addScaledVector(rRight, -0.25).addScaledVector(rUp, -0.7).addScaledVector(rFwd, 0.05);
      this._ikArm(b.lArm, b.lForeArm, b.lHand, this.armLen.lUpper, this.armLen.lLower, target, pole);
      const fingers = new THREE.Vector3().addScaledVector(rRight, 0.75).addScaledVector(rUp, 0.35).addScaledVector(rFwd, 0.5).normalize();
      const palm = new THREE.Vector3().addScaledVector(rUp, 0.8).addScaledVector(rRight, 0.35).addScaledVector(rFwd, 0.0).normalize();
      this._orientHand(b.lHand, fingers, palm, this.shared.palmAxis.left);
    }
    this._curlFingers();
  }

  _ikArm(upper, lower, end, a, bLen, target, pole) {
    const S = upper.getWorldPosition(new THREE.Vector3());
    let d = S.distanceTo(target);
    const maxReach = (a + bLen) * 0.985;
    if (d > maxReach) {
      target = S.clone().add(target.sub(S).multiplyScalar(maxReach / d));
      d = maxReach;
    }
    d = Math.max(d, Math.abs(a - bLen) + 0.01);
    // Analytic elbow position in the plane (S, T, pole).
    const u = target.clone().sub(S).normalize();
    const x = (a * a - bLen * bLen + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, a * a - x * x));
    const pv = pole.clone().sub(S);
    pv.addScaledVector(u, -pv.dot(u));
    if (pv.lengthSq() < 1e-6) pv.set(0, -1, 0).addScaledVector(u, -u.y);
    pv.normalize();
    const elbowTarget = S.clone().addScaledVector(u, x).addScaledVector(pv, h);
    // 1. Upper arm: rotate current elbow onto the analytic one.
    const E = lower.getWorldPosition(new THREE.Vector3());
    const from = E.sub(S).normalize();
    const to = elbowTarget.clone().sub(S).normalize();
    alignBoneWorld(upper, from, to);
    // 2. Forearm: rotate the hand onto the target.
    const E2 = lower.getWorldPosition(new THREE.Vector3());
    const H = end.getWorldPosition(new THREE.Vector3());
    const from2 = H.sub(E2).normalize();
    const to2 = target.clone().sub(E2).normalize();
    alignBoneWorld(lower, from2, to2);
  }

  _orientHand(hand, fingersWorld, palmWorld, palmLocalSign) {
    // Basis: local +Y = fingers, local (palmLocalSign · Z) = palm normal.
    const y = fingersWorld.clone().normalize();
    const z = palmWorld.clone().addScaledVector(y, -palmWorld.dot(y)).normalize().multiplyScalar(palmLocalSign);
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    _m1.makeBasis(x, y, z);
    _q2.setFromRotationMatrix(_m1);
    setBoneWorldQuaternion(hand, _q2);
  }

  _curlFingers() {
    const curl = this.shared.fingerCurl;
    if (!curl) return;
    for (const side of ['left', 'right']) {
      const hand = side === 'left' ? this.bones.lHand : this.bones.rHand;
      if (!hand) continue;
      hand.getWorldQuaternion(_q1);
      const axis = _v4.set(1, 0, 0).applyQuaternion(_q1);
      const sign = side === 'left' ? curl.left : curl.right;
      for (const f of this.fingerBones[side]) rotateBoneWorld(f, axis, sign * curl.angle);
    }
  }

  /* ------------------------------------------------------------------------------------------- queries */

  getMuzzle(out = new THREE.Vector3()) {
    return this.rifle.sockets.muzzle.getWorldPosition(out);
  }

  getEye(out = new THREE.Vector3()) {
    if (this.bones.head) {
      this.bones.head.getWorldPosition(out);
      out.y += 0.08;
      return out;
    }
    return out.copy(this.root.position).setY(this.root.position.y + 1.65 - this.crouch * 0.5);
  }

  getChest(out = new THREE.Vector3()) {
    return this.bones.spine2 ? this.bones.spine2.getWorldPosition(out) : out.copy(this.root.position).setY(this.root.position.y + 1.3);
  }

  /**
   * Hitbox anchors (world): [{ part, kind:'sphere'|'capsule', a, b?, r }]. Reuses the arrays passed in.
   */
  getAnchors(out) {
    const b = this.bones;
    const P = (bone, v) => (bone ? bone.getWorldPosition(v) : v.copy(this.root.position));
    let i = 0;
    const set = (part, kind, a, bb, r) => {
      const e = out[i] || (out[i] = { part: '', kind: '', a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0 });
      e.part = part;
      e.kind = kind;
      e.a.copy(a);
      if (bb) e.b.copy(bb);
      else e.b.copy(a);
      e.r = r;
      i++;
    };
    const head = P(b.head, _v1);
    const top = b.headTop ? P(b.headTop, _v2) : _v2.copy(head).setY(head.y + 0.22);
    set('head', 'sphere', _v3.copy(head).lerp(top, 0.5), null, 0.125);
    const hips = P(b.hips, _v1);
    const spine1 = P(b.spine1, _v2);
    const neck = P(b.neck, _v3);
    set('body', 'capsule', spine1, neck, 0.17);
    set('body', 'capsule', _v4.copy(hips).setY(hips.y - 0.08), spine1, 0.16);
    for (const side of ['l', 'r']) {
      const up = P(b[`${side}UpLeg`], _v1);
      const knee = P(b[`${side}Leg`], _v2);
      const foot = P(b[`${side}Foot`], _v3);
      set('limb', 'capsule', up, knee, 0.09);
      set('limb', 'capsule', knee, foot, 0.075);
      const arm = P(b[`${side}Arm`], _v1);
      const elbow = P(b[`${side}ForeArm`], _v2);
      const hand = P(b[`${side}Hand`], _v3);
      set('limb', 'capsule', arm, elbow, 0.065);
      set('limb', 'capsule', elbow, hand, 0.055);
    }
    out.length = i;
    return out;
  }

  /* ------------------------------------------------------------------------------------------- death */

  /**
   * Start the collapse. `direction` = horizontal fall direction (world). `groundAt(x,z)` samples the
   * ground height so the torso rests on curbs/steps instead of clipping through them.
   */
  startDeath({ direction, headshot = false, groundAt = null, blockedAt = null }) {
    if (this.dead) return;
    this.dead = true;
    this.hasAimTarget = false;
    const dir = new THREE.Vector3(direction?.x || 0, 0, direction?.z || 0);
    if (dir.lengthSq() < 1e-4) dir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).negate();
    dir.normalize();
    // Do not fall into a wall: try the opposite way, then sideways.
    if (blockedAt) {
      const tries = [dir.clone(), dir.clone().negate(), new THREE.Vector3(-dir.z, 0, dir.x), new THREE.Vector3(dir.z, 0, -dir.x)];
      for (const t of tries) {
        if (!blockedAt(t, 1.7)) {
          dir.copy(t);
          break;
        }
      }
    }
    const feetY = this.root.position.y;
    this.groundY = feetY;
    let finalAngle = Math.PI / 2;
    if (groundAt) {
      const gy = groundAt(this.root.position.x + dir.x * 1.1, this.root.position.z + dir.z * 1.1);
      if (Number.isFinite(gy)) {
        const dh = gy - feetY;
        finalAngle = THREE.MathUtils.clamp(Math.PI / 2 - Math.atan2(dh, 1.2), THREE.MathUtils.degToRad(48), THREE.MathUtils.degToRad(100));
      }
    }
    const axis = new THREE.Vector3().crossVectors(UP, dir).normalize();
    this.death = {
      t: 0,
      dir,
      axis,
      finalAngle,
      headshot,
      twist: (this.seed - 0.5) * 0.7,
      startQuat: this.model.quaternion.clone(),
      startPos: this.model.position.clone(),
      limp: 0,
      fallDone: false,
    };
    this.mixer.timeScale = 0.15; // the last pose keeps drifting a little while the body goes limp
  }

  _updateDeath(dt) {
    const d = this.death;
    if (!d) return;
    d.t += dt;
    const T = DEATH.fallTime;
    const t = d.t;
    // Gravity-like acceleration into the ground, then a small bounce.
    let angle;
    if (t < T) {
      const k = t / T;
      angle = d.finalAngle * (k * k * (1.6 - 0.6 * k));
    } else {
      const u = t - T;
      angle = d.finalAngle - THREE.MathUtils.degToRad(6) * Math.exp(-5 * u) * Math.abs(Math.sin(13 * u));
      d.fallDone = true;
    }
    d.limp = Math.min(1, t / 0.45);
    this.mixer.update(dt);
    // Whole-body rotation about the feet toward the fall direction (+ a twist about the vertical).
    const rootInv = _q1.copy(this.root.quaternion).invert();
    const rot = _q2.setFromAxisAngle(d.axis, angle);
    const twist = _q3.setFromAxisAngle(UP, d.twist * Math.min(1, t / T));
    rot.multiply(twist);
    this.model.quaternion.copy(rootInv).multiply(rot).multiply(this.root.quaternion).multiply(d.startQuat);
    // Slight slide along the fall direction so the body lands ahead of the feet, not on them. The whole
    // body pivots about the feet, so lift it to the body's resting half-thickness (shoulders / chest
    // rig ≈ 0.2 m) or the torso ends up half-buried in the pavement; the legs are dipped back down
    // toward the ground below (rotated about the fall axis) so the boots still touch.
    const settle = Math.min(1, t / T);
    const slide = 0.25 * settle;
    _v1.copy(d.dir).multiplyScalar(slide).applyQuaternion(rootInv);
    this.model.position.copy(d.startPos).add(_v1).setY(d.startPos.y + DEATH.restLift * settle * settle);
    this.model.updateMatrixWorld(true);
    // Limp pose: knees fold, torso curls, arms drop, head lolls.
    const L = d.limp;
    const b = this.bones;
    const right = _v2.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = _v3.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const alongFall = d.dir.dot(fwd) > 0 ? 1 : -1; // falling forward vs backward
    const dip = -DEATH.legDip * settle * (angle / Math.max(0.01, d.finalAngle));
    rotateBoneWorld(b.lUpLeg, d.axis, dip);
    rotateBoneWorld(b.rUpLeg, d.axis, dip);
    rotateBoneWorld(b.lUpLeg, right, 0.4 * L * alongFall);
    rotateBoneWorld(b.rUpLeg, right, 0.22 * L * alongFall);
    rotateBoneWorld(b.lLeg, right, -0.55 * L);
    rotateBoneWorld(b.rLeg, right, -0.85 * L);
    rotateBoneWorld(b.spine, right, -0.25 * L * alongFall);
    rotateBoneWorld(b.spine1, right, -0.18 * L * alongFall);
    rotateBoneWorld(b.neck, right, -0.3 * L);
    rotateBoneWorld(b.head, right, -0.45 * L * alongFall);
    rotateBoneWorld(b.head, UP, 0.5 * L * (d.twist > 0 ? 1 : -1));
    // Arms: let them fall toward the ground (world down) by opening the shoulder and straightening.
    for (const side of ['l', 'r']) {
      const arm = b[`${side}Arm`];
      const fore = b[`${side}ForeArm`];
      if (!arm || !fore) continue;
      const S = arm.getWorldPosition(_v4);
      const E = fore.getWorldPosition(_v5).sub(S).normalize();
      const down = _v1.set(0, -1, 0);
      alignBoneWorld(arm, E, down, 0.9 * L);
      rotateBoneWorld(fore, right, (side === 'l' ? 0.8 : 0.5) * L);
    }
    // The rifle stays where the hands left it until the physics prop takes over (Enemy handles that).
  }

  /** Sink the body into the ground (t: 0..1). */
  setSink(t) {
    this.root.position.y = (this.groundY ?? this.root.position.y) - DEATH.sinkDepth * t * t;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    // Materials and the gear geometry are shared across soldiers — nothing to dispose per instance.
    this.root.removeFromParent();
  }
}

export function wrapAngle(a) {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Load-time shared resources: gltf, clips, the procedural material set (remapped albedo, visor, gear),
 * the merged skinned gear geometry and hand-frame conventions.
 */
export function createSharedSoldierAssets(game, gltf, id) {
  const clips = {};
  for (const c of gltf.animations) clips[c.name] = c;
  const materials = createSoldierMaterials(game, gltf);
  let gearGeo = null;
  let gearTriangles = 0;
  let body = null;
  gltf.scene.traverse((o) => {
    if (!body && o.isSkinnedMesh && !/visor/i.test(o.name) && !/visor/i.test(o.material?.name || '')) body = o;
  });
  if (body?.skeleton) {
    const gear = buildGearGeometry(body.skeleton);
    gearGeo = gear.geometry;
    gearTriangles = gear.triangles;
  }
  return {
    id,
    gltf,
    clips,
    materials,
    gearGeo,
    gearTriangles,
    // Mixamo hands: +Y along the fingers; palm normal is ±Z (mirrored between hands). Verified in-game.
    palmAxis: { left: -1, right: 1 },
    fingerCurl: { angle: 0.55, left: -1, right: 1 }, // curl = rotate +Y toward the palm normal about local X
  };
}
