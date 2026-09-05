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
  // the tuft turns up: pitch added to the last bones (TAIL_HOOK profile)
  tailHook: 0.55,
  // 0 hangs the tail in its standing J; 1 carries the root out behind the
  // rump the way a walking lion does (TAIL_CARRY profile)
  tailCarry: 0,
  earAlert: 0.3,
  jaw: 0,
  lean: 0,
};

const SPINE = ['pelvis', 'spine1', 'spine2'];
const NECK = ['chest', 'neck1', 'neck2'];
const TAIL = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
// absolute tail pitch per bone (radians below horizontal; -pi/2 hangs straight
// down, past it the bone points forward under the belly)
// lying: down to the ground quickly, then flat along it
const TAIL_LYING = [-0.9, -0.5, -0.08, 0.02, 0.03];
// standing: off the rump at 45 degrees, vertical by the middle, the tip a
// touch forward before the hook turns it back — a J. (The rig's rest chain
// was read straight off the joints, -42..-93 degrees with the round-4 hook of
// 0.15 rad on the tuft: a rod, in every critic's frame.)
const TAIL_HANG = [-0.78, -1.1, -1.4, -1.6, -1.68];
// walking: the root carried at 17 degrees below the line of the back, the
// tail curving down through the middle third so only the last third hangs
// and swings, the tuft turned back up by the hook
const TAIL_CARRY = [-0.3, -0.7, -1.08, -1.35, -1.5];
// how much of pose.tailHook each bone takes: the hook is the tuft
const TAIL_HOOK = [0, 0, 0.05, 0.25, 1.0];
// lateral sway: the fraction of anim.tailSway each bone swings through (radians
// per unit sway, absolute in the pelvis frame, growing toward the tip) and the
// phase the wave lags by per bone, so the tip follows the base. Weighted to
// the last third: the root swings +-7 degrees at the walk, the tuft +-25.
const TAIL_SWAY = [0.14, 0.2, 0.3, 0.42, 0.52];
const TAIL_LAG = 0.35;
// and a smaller fore-aft swing at twice the rate (each hind step nudges the
// tail root), so the sway also reads in profile
const TAIL_PITCH_SWAY = [0.03, 0.06, 0.09, 0.12, 0.15];
// Walking, the lateral wave runs on the gait cycle rather than the brain's
// free tail clock: the root swings toward the side of the hind foot in
// stance, peaking at its mid-stance. HL (+X) is planted over cycle phase
// 0..0.6, so its mid-stance is 0.3; sin(2 pi phase + TAIL_GAIT_PHASE) is 1 there
// and -1 at HR's (phase 0.8).
const TAIL_GAIT_PHASE = -0.1 * Math.PI;
// how much of the trunk's terrain roll each tail bone hangs out of: the root
// is carried in the pelvis frame, the hanging part hangs plumb in the world
const TAIL_PLUMB = [0.2, 0.5, 0.8, 1.0, 1.0];
// how much of the trunk's terrain roll the neck takes back out, bone by bone,
// so the head stays nearer level on a side slope than the shoulders do
const HEAD_LEVEL = [0, 0.3, 0.6];
const HEAD_LEVEL_HEAD = 0.8;

// Swing-phase shaping of the leg, in swing progress u (0 lift-off, 1 landing).
// How far the wrist / hock folds ahead over the paw (the paw hangs back under
// a flexed wrist), as a pastern lean, peaking mid-swing.
const SWING_FOLD = 0.45;
// The paw's extra nose-down pitch: toes trail at lift-off, hang mid-swing,
// come level for the landing. Capped so the toe never goes into the ground:
// the paw peels off from the heel with the toes still on the dirt.
const SWING_PAW_PITCH = 0.7;
// toe tip ahead of and above the pad, unit lion, for the peel cap
const TOE_AHEAD = 0.085;
const TOE_UP = 0.012;
// girdle roll toward the side whose leg is in the air (radians at peak)
const ROLL_HIND = 0.05;
const ROLL_FRONT = 0.04;

const TWO_PI = Math.PI * 2;

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
   * `feet`   per leg { contact: Vector3 root space, fwd: Vector3 (ground-tangent forward), up: Vector3,
   *          u: swing progress or -1, clear: pad height over the ground, stance: stance progress or -1 };
   *          the array carries { phase, T, moving } for the gait cycle and
   *          { roll, liftHip, liftChest } for the stance plane (see Feet.contacts)
   * `anim`   { breath, blink: [l, r], earFlick: [l, r], tailSway, tailPhase, tailSide, sway, walkAmt }
   *          Nothing else is read: the head's bob and the trunk's roll are
   *          taken from the gait phase and the legs here, so they stay in
   *          time with the footfalls.
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
    const walk = anim.walkAmt || 0;
    const ph = (feet.phase || 0) * TWO_PI;

    // --- gait layers from the legs -----------------------------------------------
    // each girdle rolls toward the side whose leg is in the air: the hip drops
    // over the swinging hind foot, the shoulder over the swinging forefoot;
    // with the lateral sequence they are a quarter cycle apart, so the trunk
    // twists rather than rocking as one piece. Rolls are about the trunk axis,
    // positive lifting the +X side, so a swinging +X leg makes a negative roll.
    let rollHind = 0;
    let rollFront = 0;
    for (let li = 0; li < this.skel.legs.length; li++) {
      const leg = this.skel.legs[li];
      const f = feet[li];
      if (!f || f.u === undefined || f.u < 0) continue;
      const bell = Math.sin(Math.PI * f.u) * leg.side;
      if (leg.front) rollFront -= bell * ROLL_FRONT;
      else rollHind -= bell * ROLL_HIND;
    }
    const rollMean = (rollHind + rollFront) * 0.5;

    // --- body frame ------------------------------------------------------------
    // The ground under each end of the trunk is the plane its feet stand on:
    // the centreline sample the caller took, corrected by the feet's plane fit
    // (a fore end on a rock rises, one in a hollow drops, both rate-limited
    // in feet.js), and the trunk rolls across that plane. Without the roll the
    // body stood level on every side slope with the uphill legs folded and the
    // downhill ones stretched to the limit of their reach.
    const sy = this.sy;
    const gHip = ground.hip + (feet.liftHip || 0);
    const gChest = ground.chest + (feet.liftChest || 0);
    const terrainRoll = feet.roll || 0;
    const pelvisP = new THREE.Vector3(0, gHip + Math.max(pose.hipH * sy, this.minHip), rest.get('pelvis').pos.z + pose.lean * s);
    const chestTarget = _w.set(0, gChest + Math.max(pose.chestH * sy, this.minChest), rest.get('chest').pos.z + pose.lean * s);
    const bodyDir = _d.copy(chestTarget).sub(pelvisP).normalize();
    basisQuat(bodyDir, X, this.bodyQ);
    // hips and shoulders yaw against each other a little when walking
    _q2.setFromAxisAngle(Y, (anim.sway || 0) * 0.05);
    this.bodyQ.premultiply(_q2);
    // the trunk as a whole rolls with the ground plane and by the mean of the
    // two girdles; each end then gets its own share (below), so the spine
    // twists between them
    if (rollMean + terrainRoll) {
      _q2.setFromAxisAngle(bodyDir, rollMean + terrainRoll);
      this.bodyQ.premultiply(_q2);
    }
    // rotation that carries a rest-frame direction into the current body frame
    const delta = this.delta.copy(this.bodyQ).multiply(this.restBodyInv);
    const right = this.right.copy(X).applyQuaternion(delta);
    const fwdBody = this.fwdBody.set(0, 0, 1).applyQuaternion(delta);
    // the right vector of a trunk bone rolled by `r` beyond the mean
    const rolledRight = (dir, r, out) => out.copy(right).applyQuaternion(_q2.setFromAxisAngle(_v.copy(dir).normalize(), r));

    // --- spine -------------------------------------------------------------------
    // arch > 0 raises the middle of the back (stretch), < 0 lets it sag
    let p = pelvisP.clone();
    const archPitch = [pose.arch * 0.55, pose.arch * -0.15, pose.arch * -0.9];
    const rollAlong = [rollHind, THREE.MathUtils.lerp(rollHind, rollFront, 0.35), THREE.MathUtils.lerp(rollHind, rollFront, 0.7)];
    for (let i = 0; i < SPINE.length; i++) {
      const n = SPINE[i];
      const dir = rest.get(n).dir.clone().applyQuaternion(turn(archPitch[i], (anim.sway || 0) * 0.03 * i, _q)).applyQuaternion(delta);
      set(n, p, fk(n, dir, rolledRight(dir, rollAlong[i] - rollMean, _w)));
      p = p.clone().addScaledVector(dir, rest.get(n).len);
    }

    // --- neck and head ---------------------------------------------------------
    // The head nods once per step, a little behind the trunk's rise (the neck
    // is a lever off the chest, so the nose swings further than the withers),
    // and turns a touch toward the side of the reaching foreleg.
    const nod = -Math.sin(ph * 2 - 0.8) * walk;
    const headYawGait = Math.sin(ph) * 0.03 * walk;
    const spread = [0.25, 0.35, 0.4];
    const nodSpread = [0.0, 0.025, 0.035];
    let yawSoFar = 0;
    for (let i = 0; i < NECK.length; i++) {
      const n = NECK[i];
      const pitch = pose.neckPitch * spread[i] + nod * nodSpread[i];
      yawSoFar += pose.neckYaw * spread[i] + headYawGait * 0.3;
      const dir = rest.get(n).dir.clone().applyQuaternion(turn(pitch, yawSoFar, _q)).applyQuaternion(delta);
      const r = _w.copy(X).applyQuaternion(_q2.setFromAxisAngle(Y, yawSoFar)).applyQuaternion(delta);
      // the chest carries its girdle's share of the gait roll; the neck bones
      // wind the terrain roll back out toward a level head
      const unroll = (i === 0 ? rollFront - rollMean : 0) - terrainRoll * HEAD_LEVEL[i];
      if (unroll) r.applyQuaternion(_q2.setFromAxisAngle(_v.copy(dir).normalize(), unroll));
      set(n, p, fk(n, dir, r));
      p = p.clone().addScaledVector(dir, rest.get(n).len);
    }
    {
      const yaw = pose.neckYaw + pose.headYaw + headYawGait;
      const pitch = pose.neckPitch * 0.5 + pose.headPitch + nod * 0.07;
      const dir = rest.get('head').dir.clone().applyQuaternion(turn(pitch, yaw, _q)).applyQuaternion(delta);
      const r = _w.copy(X).applyQuaternion(_q2.setFromAxisAngle(Y, yaw)).applyQuaternion(delta);
      if (terrainRoll) r.applyQuaternion(_q2.setFromAxisAngle(_v.copy(dir).normalize(), -terrainRoll * HEAD_LEVEL_HEAD));
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
    const gaitTail = ph + TAIL_GAIT_PHASE;
    const sway = anim.tailSway || 0;
    const carry = pose.tailCarry || 0;
    const tailRight = rolledRight(rest.get('tail1').dir.clone().applyQuaternion(delta), rollHind - rollMean, new THREE.Vector3());
    for (let i = 0; i < TAIL.length; i++) {
      const n = TAIL[i];
      const k = (i + 1) / TAIL.length;
      let pitch = THREE.MathUtils.lerp(THREE.MathUtils.lerp(TAIL_HANG[i], TAIL_CARRY[i], carry), TAIL_LYING[i], pose.tailGround);
      pitch += pose.tailLift * (1 - k * 0.4) + pose.tailCurl * k + (pose.tailHook || 0) * TAIL_HOOK[i] * (1 - pose.tailGround);
      // the waves: on the brain's free clock at rest, on the gait cycle when
      // walking, crossfaded by how much the animal is walking
      const lagLat = i * TAIL_LAG;
      const lagPitch = i * TAIL_LAG * 1.2 - 0.4;
      const wLat = THREE.MathUtils.lerp(Math.sin(tailPhase - lagLat), Math.sin(gaitTail - lagLat), walk);
      const wPitch = THREE.MathUtils.lerp(Math.sin(2 * tailPhase - lagPitch), Math.sin(2 * gaitTail - lagPitch), walk);
      pitch += sway * TAIL_PITCH_SWAY[i] * wPitch * (1 - pose.tailGround);
      // Lateral sway is a wave travelling down the tail, the tip lagging the
      // base and swinging further. It deflects the bone sideways off its
      // sagittal direction — a yaw about the vertical would not move a tail
      // that hangs — so the hanging part swings like a pendulum and the part
      // lying on the ground sweeps along it. Lying, the tail also curls to one side.
      const lat = sway * TAIL_SWAY[i] * wLat + pose.tailGround * 0.3 * k * (anim.tailSide || 1) - terrainRoll * TAIL_PLUMB[i] * (1 - pose.tailGround);
      const cl = Math.cos(lat);
      const dir = _w.set(Math.sin(lat), Math.sin(pitch) * cl, -Math.cos(pitch) * cl).applyQuaternion(delta);
      // the tail lies on the ground, it does not go through it: a segment that
      // would end below the surface is levelled out onto it
      const len = rest.get(n).len;
      const floor = gHip + this.tailR;
      if (p.y + dir.y * len < floor) {
        const dy = THREE.MathUtils.clamp((floor - p.y) / len, -1, 1);
        const h = Math.sqrt(Math.max(0, 1 - dy * dy)) / Math.max(1e-6, Math.hypot(dir.x, dir.z));
        dir.set(dir.x * h, dy, dir.z * h);
      }
      set(n, p, fk(n, dir, tailRight));
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
        ? rest.get(leg.root).pos.clone().sub(rest.get('chest').pos).applyQuaternion(delta).applyQuaternion(_q2.setFromAxisAngle(fwdBody, rollFront - rollMean)).add(pw.p)
        : rest.get(leg.root).localPos.clone().applyQuaternion(pw.q).add(pw.p);
      const u = f.u === undefined ? -1 : f.u;
      const swinging = u >= 0;

      // Paw bone lies along the ground, pitched down the way the rest pose is.
      // In the air it hangs toe-down: the pitch it wants rises fast off the
      // ground and comes back to level for the landing, but early in the
      // swing it is capped by how far the pad has risen, so the toes stay on
      // the dirt and the paw peels off from the heel instead of lifting flat.
      const up = f.up || Y;
      const fwdT = this.fwdT.copy(f.fwd).addScaledVector(up, -up.dot(f.fwd)).normalize();
      let pawPitch = 0;
      if (swinging) {
        const want = SWING_PAW_PITCH * Math.sin(Math.PI * Math.pow(Math.min(1, u / 0.9), 0.75));
        const cap = Math.atan2((f.clear || 0) + TOE_UP * s, TOE_AHEAD * s);
        pawPitch = Math.min(want, cap);
      }
      const pa = 0.2426 + pawPitch;
      const pawDir = _d.copy(fwdT).multiplyScalar(Math.cos(pa)).addScaledVector(up, -Math.sin(pa)).normalize();
      const pawQ = basisQuat(pawDir, right, new THREE.Quaternion());
      const pad = PAD_OFFSET[leg.front ? 'front' : 'hind'];
      const pawP = f.contact.clone().sub(_v.set(pad[0] * s, pad[1] * s, pad[2] * s).applyQuaternion(pawQ));

      // Pastern hangs from the wrist / hock, leaning further forward as the paw
      // goes ahead. Swinging, the joint folds forward over the paw so the paw
      // trails under it (this is what the elbow and the stifle flex against);
      // planted and moving, it gives a little under load at mid-stance.
      const ahead = (pawP.z - (rootP.z + (leg.front ? 0.06 : 0.0) * s)) / s;
      let k = THREE.MathUtils.clamp((leg.front ? 0.33 : 0.22) + ahead * 0.9, -0.3, 1.1);
      if (swinging) k -= SWING_FOLD * Math.sin(Math.PI * Math.min(1, u / 0.85));
      else if (f.stance !== undefined && f.stance >= 0) k += 0.12 * Math.sin(Math.PI * f.stance);
      // direction from the paw joint up to the wrist / hock. Folded poses pull
      // it toward a resting point on the ground; the blend is on the direction
      // and the length stays L3, so the pad never leaves the contact point.
      const lowDir = _v.copy(up).addScaledVector(fwdT, -k).normalize();
      if (!leg.front && pose.hindFold > 0) {
        // folded hind leg: the point of the hock rests on the ground beside the
        // belly, the joint itself a hock's depth above it
        const hock = _w.set(leg.side * pose.hockX * s, gHip + this.hockRest, pose.hockZ * s).sub(pawP).normalize();
        lowDir.lerp(hock, pose.hindFold).normalize();
      } else if (leg.front && pose.frontFold > 0) {
        // sphinx: forearm flat on the ground, wrist a pastern's length behind the
        // paw and a forearm's radius up. Where the elbow lands follows from the
        // paw's placement (the pose's frontZ): the paws sit far enough back that
        // the humerus stands nearly upright and the elbow rests on the ground
        // beside the ribs instead of being driven through it.
        const wrist = _w.set(pawP.x, gChest + this.wristRest, pawP.z - leg.L3 * 0.96).sub(pawP).normalize();
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
        const r = reach + give * 0.9;
        const short = (rx, ry, rz, lx, ly, lz) => {
          const dh = Math.hypot(rx - lx, rz - lz);
          return ry - ly - Math.sqrt(Math.max(0, r * r - dh * dh));
        };
        let drop = short(rootP.x, rootP.y, rootP.z, lowP.x, lowP.y, lowP.z);
        // a swinging foot is also measured where it will land, against where
        // the trunk will be by then, with the pastern leaning the way it does
        // at a landing (wrist / hock behind the pad, k ~ 0.6), eased in over
        // the swing: a landing on lower ground brings the trunk down through
        // the swing rather than in the frame the foot arrives
        if (swinging && f.land) {
          const t = f.travel;
          const ease = u * u * (3 - 2 * u);
          const ly = f.land.y + leg.L3 * 0.86 + 0.045 * s;
          const lz = f.land.z - leg.L3 * 0.51;
          drop = Math.max(drop, ease * short(rootP.x + t.x, rootP.y + t.y, rootP.z + t.z, f.land.x, ly, lz));
        }
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
