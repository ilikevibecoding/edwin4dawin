import * as THREE from 'three';
import { Spring3 } from '../../springs.js';
import { defineHand, buildHandGeometry, mirrorGeometry, buildSkeleton, BONES, FOREARM } from './hand.js';
import { buildArmGeometry } from './arm.js';
import { makeKnit, makeLeather, makeCuff, makeCamo, makeSkin } from './textures.js';
import { makeGloveMaterial, makeCuffMaterial, makeSkinMaterial, makeSleeveMaterial } from './materials.js';
import { CHANNELS, POSES, resolvePose } from './poses.js';

/**
 * Arms candidate "bravo": skinned procedural glove hands (SDF → surface nets → LBS skeleton) with blended finger
 * poses, plus a skinned forearm tube (glove cuff / bare skin / rolled desert-camo sleeve) solved with a two-bone
 * IK toward the rig's shoulder anchors. Everything is built synchronously inside buildArms.
 *
 * Frames: hand space has the wrist at the origin, +Y toward the fingertips, +Z the back of the hand. The rig's
 * hand targets carry the palm-centre position and the grip orientation; the per-hand FIT below maps hand space
 * onto the gun (measured against the M4A1 GLB) so fingers wrap the grip / handguard without clipping.
 */

const DEG = Math.PI / 180;
const IDENTITY = new THREE.Matrix4();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const L_FORE = FOREARM.segment * 3;
const L_UPPER = 0.32;
const MAX_WRIST_BEND = 62 * DEG;
// The virtual shoulder anchors sit further than a real arm reaches from the view-model hands, so the two-bone
// solve alone would straighten the elbow; always keep at least this much bend toward the pole (elbow drops
// below/outside the wrist→shoulder line, as a real support arm does).
const MIN_ELBOW_DEVIATION = 26 * DEG;
// ...and never fold the forearm back past this (hand very close to the shoulder anchor during reload swings)
const MAX_ELBOW_DEVIATION = 72 * DEG;

/**
 * Grip fit, expressed in GUN space (metres, forward -Z) so it can be reasoned about against the model:
 *   palm: hand-space point that should land on the palm-centre target (≈ centre of the palm volume)
 *   pos:  where that palm centre sits in gun space when the hand is on its default socket
 *   x/y/z: hand-space axes in gun space (x = pinky side for the right hand / thumb side for the left, y = toward
 *          the fingers, z = back of the hand). Re-orthogonalised at build time.
 *   pole: elbow direction hint (sway-pivot space)
 */
export const FIT = {
  right: {
    // palm on the back-right of the pistol grip, knuckle row along the (tilted) grip axis, fingers wrapping the
    // front of the grip toward the left, middle finger up against the trigger guard (fitted numerically)
    palm: [0.002, 0.05, -0.003],
    pos: [0.0205, -0.083, 0.129],
    y: [0.337, -0.164, -0.926],
    z: [0.94, 0, 0.342],
    pole: [0.75, -1, 0.3],
  },
  left: {
    // palm flat on the left rail face (rolled 15° so the back of the hand faces the camera), fingers tilted
    // 12° forward, knuckle row at the top-left rail corner so the fingers lie over the top rail
    palm: [-0.002, 0.05, -0.003],
    pos: [-0.05, 0.0125, -0.216],
    y: [0.253, 0.945, -0.208],
    z: [-0.966, 0.259, 0],
    pole: [-0.7, -1, 0.35],
    // Reload poses: the rig moves the palm target but keeps the handguard orientation, so each pose carries its
    // own hand orientation (gun space) and palm-centre offset from the target.
    poses: {
      // side grab: palm on the magazine's left face, fingers forward (tilted up 20°) wrapping its front face,
      // thumb up along the left face toward the mag well
      magGrab: { offset: [-0.022, -0.003, 0.018], y: [0, 0.35, -0.94], z: [-1, 0, 0] },
      // open palm facing up under the magazine base (the target rises 6 cm during the seat slap)
      slap: { offset: [-0.004, -0.147, -0.006], y: [0.3, 0, -0.954], z: [0, -1, 0] },
      // heel of the hand striking the bolt release on the left of the receiver: fingers up and leaning away from
      // the gun (clear of the optic), thumb toward the camera
      boltSlap: { offset: [0.012, 0.0, 0.0], y: [-0.2, 0.93, -0.3], z: [-0.96, -0.2, 0], pole: [-0.9, -0.8, 0.3] },
    },
  },
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _s = new THREE.Vector3();
const _u = new THREE.Vector3();
const _pp = new THREE.Vector3();
const _e = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function basisQuat(x, y, z, out) {
  _y.copy(y).normalize();
  _x.copy(x).addScaledVector(_y, -_y.dot(x)).normalize();
  _z.crossVectors(_x, _y).normalize();
  void z;
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

export class HandRig {
  constructor(side, def, geo, armGeo, mats, fit, socket) {
    this.side = side;
    this.group = new THREE.Group();
    this.group.name = side > 0 ? 'HandRight' : 'HandLeft';
    const sk = buildSkeleton(def, side);
    this.bones = sk.bones;
    this.rest = sk.rest;
    this.group.add(sk.root);

    this.hand = new THREE.SkinnedMesh(geo, mats.glove);
    this.hand.name = 'Glove';
    this.group.add(this.hand);
    this.hand.bind(sk.skeleton, IDENTITY);
    this.arm = new THREE.SkinnedMesh(armGeo, [mats.cuff, mats.skin, mats.sleeve]);
    this.arm.name = 'Forearm';
    this.group.add(this.arm);
    this.arm.bind(sk.skeleton, IDENTITY);
    for (const m of [this.hand, this.arm]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
    }

    // Fit → socket-relative offsets (so the hand keeps following if the socket is moved by other modules).
    this.palm = new THREE.Vector3().fromArray(fit.palm);
    this.pole = new THREE.Vector3().fromArray(fit.pole).normalize();
    const invSocket = socket.quaternion.clone().invert();
    const makeFit = (y, z, offsetGun, pole) => {
      const zg = new THREE.Vector3().fromArray(z);
      const yg = new THREE.Vector3().fromArray(y);
      const xg = new THREE.Vector3().crossVectors(yg, zg);
      const desired = basisQuat(xg, yg, zg, new THREE.Quaternion());
      return { quat: invSocket.clone().multiply(desired), pos: offsetGun.clone().applyQuaternion(invSocket), pole: new THREE.Vector3().fromArray(pole || fit.pole).normalize() };
    };
    this.fits = { grip: makeFit(fit.y, fit.z, new THREE.Vector3().fromArray(fit.pos).sub(socket.position), fit.pole) };
    for (const [name, p] of Object.entries(fit.poses || {})) this.fits[name] = makeFit(p.y, p.z, new THREE.Vector3().fromArray(p.offset), p.pole);
    this.offsetQuat = this.fits.grip.quat.clone();
    this.offsetPos = this.fits.grip.pos.clone();

    this.pose = new Float32Array(CHANNELS);
    this.poseOverride = null;
    this.posSpring = new Spring3(900, 46);
    this.elbowSpring = new Spring3(260, 22);
    this.first = true;
  }

  update(dt, target, shoulder, poseName) {
    const g = this.group;
    const Qt = target.quaternion;
    // pose-dependent grip offset (orientation + palm offset), blended over ~0.1 s
    const fit = this.fits[poseName] || this.fits.grip;
    if (this.first || dt <= 0) {
      this.offsetQuat.copy(fit.quat);
      this.offsetPos.copy(fit.pos);
      this.pole.copy(fit.pole);
    } else {
      const k = 1 - Math.exp(-dt / 0.07);
      this.offsetQuat.slerp(fit.quat, k);
      this.offsetPos.lerp(fit.pos, k);
      this.pole.lerp(fit.pole, k);
    }
    // orientation
    g.quaternion.copy(Qt).multiply(this.offsetQuat);
    // wrist position = palm target (+ fit offset) − palm centre expressed in the hand frame
    _v.copy(this.offsetPos).applyQuaternion(Qt).add(target.position);
    _v2.copy(this.palm).applyQuaternion(g.quaternion);
    _v.sub(_v2);
    if (this.first) this.posSpring.value.copy(_v);
    this.posSpring.target.copy(_v);
    if (dt > 0) this.posSpring.update(dt);
    else this.posSpring.value.copy(_v);
    g.position.copy(this.posSpring.value);

    this.updateFingers(dt, poseName);
    this.updateArm(dt, shoulder);
    this.first = false;
  }

  updateFingers(dt, poseName) {
    const target = this.poseOverride || resolvePose(poseName, this.side);
    const cur = this.pose;
    if (this.first || dt <= 0) cur.set(target);
    else {
      const k = 1 - Math.exp(-dt / 0.05);
      for (let i = 0; i < CHANNELS; i++) cur[i] += (target[i] - cur[i]) * k;
    }
    const bones = this.bones;
    const rest = this.rest.quat;
    const side = this.side;
    const names = ['index', 'middle', 'ring', 'pinky'];
    for (let f = 0; f < 4; f++) {
      const ids = BONES[names[f]];
      const o = f * 4;
      const b0 = bones[ids[0]];
      _qa.setFromAxisAngle(Z_AXIS, cur[o + 3] * DEG * side);
      _qb.setFromAxisAngle(X_AXIS, -cur[o] * DEG);
      b0.quaternion.copy(rest[ids[0]]).multiply(_qa).multiply(_qb);
      _qb.setFromAxisAngle(X_AXIS, -cur[o + 1] * DEG);
      bones[ids[1]].quaternion.copy(rest[ids[1]]).multiply(_qb);
      _qb.setFromAxisAngle(X_AXIS, -cur[o + 2] * DEG);
      bones[ids[2]].quaternion.copy(rest[ids[2]]).multiply(_qb);
    }
    const t = BONES.thumb;
    _qa.setFromAxisAngle(Z_AXIS, cur[17] * DEG * side);
    _q.setFromAxisAngle(Y_AXIS, cur[18] * DEG * side);
    _qb.setFromAxisAngle(X_AXIS, -cur[16] * DEG);
    bones[t[0]].quaternion.copy(rest[t[0]]).multiply(_qa).multiply(_q).multiply(_qb);
    _qb.setFromAxisAngle(X_AXIS, -cur[19] * DEG);
    bones[t[1]].quaternion.copy(rest[t[1]]).multiply(_qb);
    _qb.setFromAxisAngle(X_AXIS, -cur[20] * DEG);
    bones[t[2]].quaternion.copy(rest[t[2]]).multiply(_qb);
  }

  updateArm(dt, shoulder) {
    const g = this.group;
    _qi.copy(g.quaternion).invert();
    // shoulder & pole in hand space
    _s.copy(shoulder).sub(g.position).applyQuaternion(_qi);
    _pp.copy(this.pole).applyQuaternion(_qi);
    const d = THREE.MathUtils.clamp(_s.length(), 0.05, L_FORE + L_UPPER - 0.02);
    _u.copy(_s).normalize();
    const cosA = THREE.MathUtils.clamp((L_FORE * L_FORE + d * d - L_UPPER * L_UPPER) / (2 * L_FORE * d), -1, 1);
    const A = THREE.MathUtils.clamp(Math.acos(cosA), MIN_ELBOW_DEVIATION, MAX_ELBOW_DEVIATION);
    // wrist→elbow direction: the shoulder direction swung toward the pole hint by the solved elbow angle. Using the
    // pole itself (not its perpendicular part) keeps this stable when the hand comes close to the shoulder.
    _pp.normalize();
    _e.copy(_u).multiplyScalar(Math.cos(A)).addScaledVector(_pp, Math.sin(A)).normalize();

    // weight: the elbow lags the hand a little (spring in sway-pivot space)
    _v.copy(_e).multiplyScalar(L_FORE).applyQuaternion(g.quaternion).add(g.position);
    if (this.first) this.elbowSpring.value.copy(_v);
    this.elbowSpring.target.copy(_v);
    if (dt > 0) this.elbowSpring.update(dt);
    else this.elbowSpring.value.copy(_v);
    _e.copy(this.elbowSpring.value).sub(g.position).applyQuaternion(_qi).normalize();

    // wrist bend limit: keep the forearm within MAX_WRIST_BEND of the hand's own axis
    const cosW = -_e.y;
    if (cosW < Math.cos(MAX_WRIST_BEND)) {
      _v.copy(_e).addScaledVector(Y_AXIS, -_e.y); // component ⟂ to the hand's Y axis
      if (_v.lengthSq() < 1e-8) _v.set(0, 0, -1);
      _v.normalize();
      _e.set(0, -Math.cos(MAX_WRIST_BEND), 0).addScaledVector(_v, Math.sin(MAX_WRIST_BEND));
    }

    // forearm frame: +Y down the arm, +Z as dorsal as possible (no twist at the wrist)
    const fore0 = this.bones[BONES.fore[0]];
    basisQuat(_x.set(1, 0, 0).crossVectors(_e, Z_AXIS), _e, Z_AXIS, fore0.quaternion);
    // upper arm from the elbow toward the shoulder, expressed in the forearm frame
    _v.copy(_s).addScaledVector(_e, -L_FORE); // elbow→shoulder
    if (_v.lengthSq() < 1e-6) _v.copy(_e);
    _v.normalize();
    _z.set(0, 0, 1).applyQuaternion(fore0.quaternion);
    _x.crossVectors(_v, _z);
    basisQuat(_x, _v, _z, _q);
    const upper0 = this.bones[BONES.upper[0]];
    upper0.quaternion.copy(fore0.quaternion).invert().multiply(_q);
  }
}

export async function buildArms(game, rig) {
  const aniso = game.assets?.anisotropy ?? 8;
  const t0 = performance.now();
  const def = defineHand();
  const handGeoR = buildHandGeometry(def);
  const handGeoL = mirrorGeometry(handGeoR);
  const armGeoR = buildArmGeometry(def);
  const armGeoL = mirrorGeometry(armGeoR);

  const knit = makeKnit(aniso);
  const leather = makeLeather(aniso);
  const cuff = makeCuff(aniso);
  const camo = makeCamo(aniso);
  const skin = makeSkin(aniso);
  const mats = {
    glove: makeGloveMaterial(knit, leather),
    cuff: makeCuffMaterial(cuff),
    skin: makeSkinMaterial(skin),
    sleeve: makeSleeveMaterial(camo),
  };

  const root = new THREE.Group();
  root.name = 'ArmsBravo';
  rig.arms.add(root);
  const right = new HandRig(1, def, handGeoR, armGeoR, mats, FIT.right, rig.sockets.gripRight);
  const left = new HandRig(-1, def, handGeoL, armGeoL, mats, FIT.left, rig.sockets.gripLeft);
  root.add(right.group, left.group);

  const tris = (handGeoR.index.count / 3) * 2 + (armGeoR.index.count / 3) * 2;
  console.info(`[arms/bravo] built in ${(performance.now() - t0).toFixed(0)} ms — ${tris} triangles, ${Object.keys(mats).length} materials`);

  // While the left hand holds the magazine, the rig keeps its target at the magazine's REST position although the
  // WeaponSystem slides the magazine pivot out of / into the well. Carry the target along with the pivot's
  // displacement so the hand visibly pulls the mag out and pushes the fresh one in.
  const followTarget = new THREE.Object3D();
  const _dq = new THREE.Quaternion();
  const magFollow = (target) => {
    const pivot = rig.parts.magazine?.parent;
    const rest = pivot?.userData?.rest;
    if (!rest || !rest.position) return target;
    if (pivot.position.equals(rest.position) && pivot.quaternion.equals(rest.quaternion)) return target;
    _dq.copy(rest.quaternion).invert().premultiply(pivot.quaternion);
    followTarget.position.copy(target.position).sub(rest.position).applyQuaternion(_dq).add(pivot.position);
    followTarget.quaternion.copy(_dq).multiply(target.quaternion);
    return followTarget;
  };

  let poseOverride = null;
  const api = {
    root,
    hands: { right, left },
    materials: mats,
    triangles: tris,
    update(dt, state) {
      const { rightHandTarget, leftHandTarget, shoulderRight, shoulderLeft } = rig.sockets;
      const leftPose = poseOverride || leftHandTarget.userData.pose || 'grip';
      right.update(dt, rightHandTarget, shoulderRight.position, poseOverride || rightHandTarget.userData.pose || 'grip');
      left.update(dt, leftPose === 'magGrab' ? magFollow(leftHandTarget) : leftHandTarget, shoulderLeft.position, leftPose);
      void state;
    },
    setPose(name) {
      poseOverride = name && POSES[name] ? name : null;
      right.poseOverride = poseOverride ? POSES[poseOverride] : null;
      left.poseOverride = poseOverride ? POSES[poseOverride] : null;
    },
    dispose() {
      root.removeFromParent();
      for (const g of [handGeoR, handGeoL, armGeoR, armGeoL]) g.dispose();
      for (const m of Object.values(mats)) m.dispose();
      for (const set of [knit, leather, cuff, camo, skin]) {
        set.map.dispose();
        set.normalMap.dispose();
      }
    },
  };
  return api;
}
