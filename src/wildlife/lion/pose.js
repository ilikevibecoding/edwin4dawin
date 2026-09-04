import * as THREE from 'three';
import { basisQuat, solveTwoBone } from './rig.js';
import { BELLY, EYE_LIDS, PAD_OFFSET, bellyFactor } from './spec.js';

// ---------------------------------------------------------------------------
// Pose solver. Takes a blended parameter set, four foot contacts and the ground
// under the body, and writes every bone. Runs entirely in the lion's root space
// (origin under the body centre, +Z the animal's heading), where "the ground"
// is a height offset the caller has already sampled.
//
// Spine, neck, head and tail are forward kinematics from the pelvis; legs are
// analytic IK to the wrist / hock with the pastern hung below it and the paw
// bone laid along the ground, so the pad sits on the contact point exactly.
//
// Angle conventions, everywhere in here: pitch positive is up, yaw positive is
// to the animal's right, both in the rest root frame before the body's own
// rotation is applied.
// ---------------------------------------------------------------------------

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

/** Default (standing) pose. Heights are in unit-lion metres, scaled at solve time. */
export const STAND = {
  hipH: 1.08,
  chestH: 1.14,
  arch: 0,
  neckPitch: 0,
  neckYaw: 0,
  headPitch: 0,
  headYaw: 0,
  frontZ: 0,
  frontX: 0,
  frontFold: 0,
  hindZ: 0,
  hindX: 0,
  hindFold: 0,
  hockX: 0.2,
  hockZ: -0.72,
  tailGround: 0,
  tailLift: 0,
  tailCurl: 0,
  earAlert: 0.3,
  jaw: 0,
  lean: 0,
};

const SPINE = ['pelvis', 'spine1', 'spine2'];
const NECK = ['chest', 'neck1', 'neck2'];
const TAIL = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
// absolute tail pitch per bone when lying: down to the ground quickly, then flat along it
const TAIL_LYING = [-0.9, -0.5, -0.08, 0.02, 0.03];

/** Rotation by pitch (about X, positive up) then yaw (about Y, positive right). */
function turn(pitch, yaw, out = new THREE.Quaternion()) {
  return out.setFromEuler(_e.set(-pitch, yaw, 0, 'YXZ'));
}

export class Poser {
  constructor(skel, scale, squat = 1, bulk = 1, legR = 1) {
    this.skel = skel;
    this.s = scale;
    // heights (hip, chest, hock rest) scale by this on top of `s`: a cub is short-legged
    this.sy = scale * squat;
    const rest = skel.rest;
    // the trunk can come no lower than its own underside: the deepest point
    // behind each end, plus a little for the fur
    const bf = bellyFactor(bulk) * scale;
    const spine1Up = rest.get('spine1').pos.y - rest.get('pelvis').pos.y;
    this.minHip = Math.max(BELLY.pelvis, BELLY.spine1 - spine1Up / scale) * bf + (BELLY.drop + 0.02) * scale;
    this.minChest = (BELLY.chest + 0.005) * bf + (BELLY.drop + 0.02) * scale;
    this.tailR = 0.035 * scale;
    // where the hock joint sits when the point of the hock rests on the ground
    this.hockRest = 0.11 * scale * legR;
    this.wristRest = 0.07 * scale * legR;
    const fwd = rest.get('chest').pos.clone().sub(rest.get('pelvis').pos).normalize();
    this.restBody = basisQuat(fwd, X, new THREE.Quaternion());
    this.restBodyInv = this.restBody.clone().invert();
    this.tailRestPitch = TAIL.map((n) => {
      const d = rest.get(n).dir;
      return Math.atan2(d.y, -d.z);
    });
    this.world = new Map();
    for (const b of skel.bones) this.world.set(b.name, { p: new THREE.Vector3(), q: new THREE.Quaternion() });
    this.bodyQ = new THREE.Quaternion();
    this.delta = new THREE.Quaternion();
    this.pole = new THREE.Vector3();
    this.mid = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.fwdBody = new THREE.Vector3();
    this.fwdT = new THREE.Vector3();
    // how much lower the chest / hips would have to be for every planted foot
    // to be within reach, measured by the last solve; the caller fits the body
    this.over = { front: 0, hind: 0 };
  }

  /**
   * Solve and write bone transforms.
   *
   * `pose`   blended parameters (see STAND)
   * `ground` { hip, chest } ground height in root space under the hind / front anchors
   * `feet`   per leg { contact: Vector3 root space, fwd: Vector3 (ground-tangent forward), up: Vector3 }
   * `anim`   { breath, blink: [l, r], earFlick: [l, r], tailSway, tailPhase, tailSide, sway, headBob }
   */
  solve(pose, ground, feet, anim) {
    const s = this.s;
    const rest = this.skel.rest;
    const W = this.world;
    const set = (name, p, q) => {
      const w = W.get(name);
      w.p.copy(p);
      w.q.copy(q);
    };
    const fk = (name, dir, right) => {
      const q = basisQuat(dir, right, new THREE.Quaternion());
      return q;
    };

    // --- body frame ------------------------------------------------------------
    const sy = this.sy;
    const pelvisP = new THREE.Vector3(0, ground.hip + Math.max(pose.hipH * sy, this.minHip), rest.get('pelvis').pos.z + pose.lean * s);
    const chestTarget = _w.set(0, ground.chest + Math.max(pose.chestH * sy, this.minChest), rest.get('chest').pos.z + pose.lean * s);
    const bodyDir = _d.copy(chestTarget).sub(pelvisP).normalize();
    basisQuat(bodyDir, X, this.bodyQ);
    // hips and shoulders yaw against each other a little when walking
    _q2.setFromAxisAngle(Y, (anim.sway || 0) * 0.05);
    this.bodyQ.premultiply(_q2);
    // and the trunk rolls about its own axis toward the side whose foreleg is
    // bearing weight: the shoulder roll of a walking cat
    if (anim.roll) {
      _q2.setFromAxisAngle(bodyDir, anim.roll);
      this.bodyQ.premultiply(_q2);
    }
    // rotation that carries a rest-frame direction into the current body frame
    const delta = this.delta.copy(this.bodyQ).multiply(this.restBodyInv);
    const right = this.right.copy(X).applyQuaternion(delta);
    const fwdBody = this.fwdBody.set(0, 0, 1).applyQuaternion(delta);

    // --- spine -------------------------------------------------------------------
    // arch > 0 raises the middle of the back (stretch), < 0 lets it sag
    let p = pelvisP.clone();
    const archPitch = [pose.arch * 0.55, pose.arch * -0.15, pose.arch * -0.9];
    for (let i = 0; i < SPINE.length; i++) {
      const n = SPINE[i];
      const dir = rest.get(n).dir.clone().applyQuaternion(turn(archPitch[i], (anim.sway || 0) * 0.03 * i, _q)).applyQuaternion(delta);
      set(n, p, fk(n, dir, right));
      p = p.clone().addScaledVector(dir, rest.get(n).len);
    }

    // --- neck and head ---------------------------------------------------------
    const spread = [0.25, 0.35, 0.4];
    let yawSoFar = 0;
    for (let i = 0; i < NECK.length; i++) {
      const n = NECK[i];
      const pitch = pose.neckPitch * spread[i] + (anim.headBob || 0) * 0.3;
      yawSoFar += pose.neckYaw * spread[i];
      const dir = rest.get(n).dir.clone().applyQuaternion(turn(pitch, yawSoFar, _q)).applyQuaternion(delta);
      const r = _w.copy(X).applyQuaternion(_q2.setFromAxisAngle(Y, yawSoFar)).applyQuaternion(delta);
      set(n, p, fk(n, dir, r));
      p = p.clone().addScaledVector(dir, rest.get(n).len);
    }
    {
      const yaw = pose.neckYaw + pose.headYaw;
      const pitch = pose.neckPitch * 0.5 + pose.headPitch + (anim.headBob || 0);
      const dir = rest.get('head').dir.clone().applyQuaternion(turn(pitch, yaw, _q)).applyQuaternion(delta);
      const r = _w.copy(X).applyQuaternion(_q2.setFromAxisAngle(Y, yaw)).applyQuaternion(delta);
      set('head', p, fk('head', dir, r));
    }
    const childOf = (name, parentName, extraQ) => {
      const r = rest.get(name);
      const pw = W.get(parentName);
      const pos = r.localPos.clone().applyQuaternion(pw.q).add(pw.p);
      const q = pw.q.clone().multiply(r.localQuat);
      if (extraQ) q.multiply(extraQ);
      set(name, pos, q);
    };
    const eul = (x, y, z) => new THREE.Quaternion().setFromEuler(_e.set(x, y, z, 'XYZ'));
    childOf('jaw', 'head', eul(pose.jaw * 0.45, 0, 0));
    // ear bone: +X rotation tips the ear forward, ±Z tilts it out; alert is
    // forward and upright, a flick is a fast swivel back and out
    const fl = anim.earFlick ? anim.earFlick[0] : 0;
    const fr = anim.earFlick ? anim.earFlick[1] : 0;
    childOf('earL', 'head', eul(0.3 * pose.earAlert - 0.85 * fl, 0, -0.3 * (1 - pose.earAlert) - 0.5 * fl));
    childOf('earR', 'head', eul(0.3 * pose.earAlert - 0.85 * fr, 0, 0.3 * (1 - pose.earAlert) + 0.5 * fr));
    const bl = anim.blink ? anim.blink[0] : 0;
    const br = anim.blink ? anim.blink[1] : 0;
    // the upper lid closes through the whole opening onto the lower lid's rim
    const shut = EYE_LIDS.up + EYE_LIDS.down;
    childOf('lidL', 'head', eul(bl * shut, 0, 0));
    childOf('lidR', 'head', eul(br * shut, 0, 0));
    childOf('ribs', 'spine2', null);

    // --- tail --------------------------------------------------------------------
    const pelvisW = W.get('pelvis');
    p = rest.get('tail1').localPos.clone().applyQuaternion(pelvisW.q).add(pelvisW.p);
    const tailPhase = anim.tailPhase || 0;
    const sway = anim.tailSway || 0;
    for (let i = 0; i < TAIL.length; i++) {
      const n = TAIL[i];
      const k = (i + 1) / TAIL.length;
      let pitch = THREE.MathUtils.lerp(this.tailRestPitch[i], TAIL_LYING[i], pose.tailGround);
      pitch += pose.tailLift * (1 - k * 0.4) + pose.tailCurl * k;
      // a wave travelling down the tail, larger toward the tip; lying, the tail curls to one side
      const yaw = sway * Math.sin(tailPhase - i * 0.9) * k * 0.7 + pose.tailGround * 0.3 * k * (anim.tailSide || 1);
      const dir = _w.set(0, Math.sin(pitch), -Math.cos(pitch)).applyQuaternion(_q2.setFromAxisAngle(Y, yaw)).applyQuaternion(delta);
      // the tail lies on the ground, it does not go through it: a segment that
      // would end below the surface is levelled out onto it
      const len = rest.get(n).len;
      const floor = ground.hip + this.tailR;
      if (p.y + dir.y * len < floor) {
        const dy = THREE.MathUtils.clamp((floor - p.y) / len, -1, 1);
        const h = Math.sqrt(Math.max(0, 1 - dy * dy)) / Math.max(1e-6, Math.hypot(dir.x, dir.z));
        dir.set(dir.x * h, dy, dir.z * h);
      }
      set(n, p, fk(n, dir, right));
      p = p.clone().addScaledVector(dir, len);
    }

    // --- legs --------------------------------------------------------------------
    this.over.front = 0;
    this.over.hind = 0;
    for (let li = 0; li < this.skel.legs.length; li++) {
      const leg = this.skel.legs[li];
      const f = feet[li];
      const pw = W.get(leg.front ? 'chest' : 'pelvis');
      // the shoulder hangs from the trunk: the chest bone also carries the
      // base of the neck, and lowering the head must not swing the forelegs
      const rootP = leg.front
        ? rest.get(leg.root).pos.clone().sub(rest.get('chest').pos).applyQuaternion(delta).add(pw.p)
        : rest.get(leg.root).localPos.clone().applyQuaternion(pw.q).add(pw.p);

      // paw bone lies along the ground, pitched down the way the rest pose is
      const up = f.up || Y;
      const fwdT = this.fwdT.copy(f.fwd).addScaledVector(up, -up.dot(f.fwd)).normalize();
      const pawDir = _d.copy(fwdT).multiplyScalar(0.97).addScaledVector(up, -0.24).normalize();
      const pawQ = basisQuat(pawDir, right, new THREE.Quaternion());
      const pad = PAD_OFFSET[leg.front ? 'front' : 'hind'];
      const pawP = f.contact.clone().sub(_v.set(pad[0] * s, pad[1] * s, pad[2] * s).applyQuaternion(pawQ));

      // pastern hangs from the wrist / hock, leaning further forward as the paw goes ahead
      const ahead = (pawP.z - (rootP.z + (leg.front ? 0.06 : 0.0) * s)) / s;
      const k = THREE.MathUtils.clamp((leg.front ? 0.33 : 0.22) + ahead * 0.9, -0.3, 1.1);
      // direction from the paw joint up to the wrist / hock. Folded poses pull
      // it toward a resting point on the ground; the blend is on the direction
      // and the length stays L3, so the pad never leaves the contact point.
      const lowDir = _v.copy(up).addScaledVector(fwdT, -k).normalize();
      if (!leg.front && pose.hindFold > 0) {
        // folded hind leg: the point of the hock rests on the ground beside the
        // belly, the joint itself a hock's depth above it
        const hock = _w.set(leg.side * pose.hockX * s, ground.hip + this.hockRest, pose.hockZ * s).sub(pawP).normalize();
        lowDir.lerp(hock, pose.hindFold).normalize();
      } else if (leg.front && pose.frontFold > 0) {
        // sphinx: forearm flat on the ground, wrist a pastern's length behind the
        // paw and a forearm's radius up. Where the elbow lands follows from the
        // paw's placement (the pose's frontZ): the paws sit far enough back that
        // the humerus stands nearly upright and the elbow rests on the ground
        // beside the ribs instead of being driven through it.
        const wrist = _w.set(pawP.x, ground.chest + this.wristRest, pawP.z - leg.L3 * 0.96).sub(pawP).normalize();
        lowDir.lerp(wrist, pose.frontFold).normalize();
      }
      let lowP = pawP.clone().addScaledVector(lowDir, leg.L3);
      const reach = (leg.L1 + leg.L2) * 0.985;
      // the scapula slides on the ribcage, so a foreleg reaches further than
      // its bones: most of a lion's forward reach at a walk is shoulder
      const give = (leg.front ? 0.09 : 0.06) * s;
      // what is out of reach even with the give spent, as a vertical drop of
      // the trunk end this leg hangs from; measured before the give so the
      // answer does not change once the trunk comes down. A swinging foot
      // counts too, so the body is already down when it lands.
      {
        const dh = Math.hypot(rootP.x - lowP.x, rootP.z - lowP.z);
        const vert = rootP.y - lowP.y;
        const r = reach + give * 0.9;
        const can = Math.sqrt(Math.max(0, r * r - dh * dh));
        const drop = vert - can;
        if (drop > 0) {
          if (leg.front) this.over.front = Math.max(this.over.front, drop);
          else this.over.hind = Math.max(this.over.hind, drop);
        }
      }
      // scapular give: a shoulder slides toward a foot that is out of reach
      const dist = rootP.distanceTo(lowP);
      if (dist > reach) {
        const over = Math.min(dist - reach, give);
        rootP.addScaledVector(_v.copy(lowP).sub(rootP).normalize(), over);
      }
      // pole: elbows back, knees forward (and out when folded)
      if (leg.front) this.pole.copy(fwdBody).multiplyScalar(-1).addScaledVector(up, -0.15 - 0.6 * pose.frontFold);
      // folded, the stifle tucks forward along the belly rather than flaring out
      else this.pole.copy(fwdBody).addScaledVector(right, leg.side * 0.35 * pose.hindFold).addScaledVector(up, -0.25 * pose.hindFold);
      solveTwoBone(rootP, lowP, leg.L1, leg.L2, this.pole, this.mid);
      const midP = this.mid.clone();
      // if the target was out of reach the chain ends short of it
      const d2 = _v.copy(lowP).sub(midP);
      if (Math.abs(d2.length() - leg.L2) > 1e-4) lowP = midP.clone().addScaledVector(d2.normalize(), leg.L2);

      set(leg.root, rootP, basisQuat(_v.copy(midP).sub(rootP), right, new THREE.Quaternion()));
      set(leg.mid, midP, basisQuat(_v.copy(lowP).sub(midP), right, new THREE.Quaternion()));
      const pasternDir = _v.copy(pawP).sub(lowP);
      set(leg.low, lowP, basisQuat(pasternDir, right, new THREE.Quaternion()));
      const pawJoint = lowP.clone().addScaledVector(pasternDir.normalize(), leg.L3);
      set(leg.paw, pawJoint, pawQ);
    }

    // --- write -------------------------------------------------------------------
    for (const b of this.skel.bones) {
      const w = W.get(b.name);
      if (!b.parent || !b.parent.isBone) {
        b.position.copy(w.p);
        b.quaternion.copy(w.q);
      } else {
        const pw = W.get(b.parent.name);
        _q.copy(pw.q).invert();
        b.position.copy(w.p).sub(pw.p).applyQuaternion(_q);
        b.quaternion.copy(_q).multiply(w.q);
      }
    }
    const ribs = this.skel.boneByName.get('ribs');
    const breath = 1 + (anim.breath || 0) * 0.04;
    ribs.scale.set(breath, 1 + (anim.breath || 0) * 0.02, breath);
    return W;
  }
}
