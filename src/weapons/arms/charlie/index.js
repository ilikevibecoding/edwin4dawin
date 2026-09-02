import * as THREE from 'three';
import { Spring3 } from '../../springs.js';
import { makeKnitMaps, makeLeatherMaps, makeCamoMaps, makeSkinMaps } from './textures.js';
import { buildHand, WRIST_LOCAL } from './hand.js';
import { buildSleeve } from './sleeve.js';
import { POSES } from './poses.js';
import { solveWrap, solveReach, quadRailGap, prismGap, boxGap, unionGap } from './wrap.js';

/**
 * Arms candidate "charlie": hard-surface-style gloved hands (olive knit back, black synthetic leather palm,
 * TPR knuckle guards, Velcro wrist strap, knit cuff, grey trim) and skinned desert-camo sleeves with baked
 * wrinkles. Everything is built synchronously from smooth lofts and procedural canvas textures.
 *
 *   hands   follow rig.sockets.rightHandTarget / leftHandTarget through a per-pose palm offset + a clamped
 *           spring lag; finger joints interpolate between named poses (target.userData.pose)
 *   arms    two-bone IK from the glove opening back to rig.sockets.shoulderRight / shoulderLeft with a pole
 *           vector (elbow down and outward); sleeve + bare wrist are one SkinnedMesh driven by
 *           [upper, forearm, hand] bones
 */

const UPPER_LEN = 0.3;
const FORE_LEN = 0.29; // elbow → glove opening (the anatomical wrist sits ~30 mm inside the cuff)
const MAX_LAG = 0.006;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _w = new THREE.Vector3();
const _e = new THREE.Vector3();
const _d = new THREE.Vector3();
const _dn = new THREE.Vector3();
const _p = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

/* ------------------------------------------------------------------------------------ helpers */

/** Matrix whose local +Y → yDir and local +Z ≈ zDir (orthogonalised), at `pos`. */
function frameMatrix(pos, yDir, zDir) {
  const y = yDir.clone().normalize();
  const z = zDir.clone().addScaledVector(y, -y.dot(zDir)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}

function quatFromYX(yDir, xHint, out) {
  _y.copy(yDir).normalize();
  _x.copy(xHint).addScaledVector(_y, -_y.dot(xHint));
  if (_x.lengthSq() < 1e-10) _x.set(1, 0, 0).addScaledVector(_y, -_y.x);
  _x.normalize();
  _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/** Two-bone IK: elbow position for shoulder S, wrist W, pole direction (elbow side). */
function solveElbow(S, W, pole, out) {
  _d.subVectors(W, S);
  let dist = _d.length();
  const maxD = UPPER_LEN + FORE_LEN - 1e-4;
  if (dist > maxD) dist = maxD;
  _dn.copy(_d).normalize();
  const a = THREE.MathUtils.clamp((UPPER_LEN * UPPER_LEN - FORE_LEN * FORE_LEN + dist * dist) / (2 * dist), -UPPER_LEN, UPPER_LEN);
  const h = Math.sqrt(Math.max(0, UPPER_LEN * UPPER_LEN - a * a));
  _p.copy(pole).addScaledVector(_dn, -pole.dot(_dn));
  if (_p.lengthSq() < 1e-8) _p.set(0, -1, 0).addScaledVector(_dn, _dn.y);
  _p.normalize();
  return out.copy(S).addScaledVector(_dn, a).addScaledVector(_p, h);
}

/* ------------------------------------------------------------------------------ hand designs */

// M4A1 geometry measured from the GLB (gun space, metres): quad-rail handguard, A2-style pistol grip, and the
// parts the trigger hand must stay out of (lower receiver / magwell, magazine, trigger guard bar)
const HANDGUARD = { cx: -0.001, cy: 0.0203, rBody: 0.0225, rRail: 0.032, railHalf: 0.0105 };
const GRIP = { c: new THREE.Vector3(-0.0008, -0.088, 0.093), rake: THREE.MathUtils.degToRad(24), a: 0.0105, b: 0.02 };
const TRIGGER = new THREE.Vector3(0.007, -0.05, 0.012); // where the index pad rests (finger axis point)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RECEIVER_REAR = boxGap(V(-0.0098, -0.062, 0.029), V(0.0083, -0.02, 0.09)); // lower receiver behind the trigger
const GUN_AVOID = unionGap(
  boxGap(V(-0.014, -0.034, -0.1), V(0.013, 0.005, 0.03)), // lower receiver / magwell
  boxGap(V(-0.011, -0.18, -0.103), V(0.01, 0.006, -0.016)), // magazine
  boxGap(V(-0.009, -0.07, -0.02), V(0.008, -0.064, 0.056)), // trigger guard bar
  RECEIVER_REAR,
);
const sq = (x) => x * x;

/**
 * Right hand on the raked pistol grip (gun space == swayPivot space at rest): palm flat on the grip's right
 * face, high enough that the index reaches the trigger and the thumb can wrap over the top-left.
 */
function designRightGrip() {
  const xHand = new THREE.Vector3(0, -Math.cos(GRIP.rake), Math.sin(GRIP.rake)); // knuckle row runs down the grip axis
  const zHand = new THREE.Vector3(0.95, -0.03, 0.31).normalize(); // back of the hand faces right / slightly back
  const yHand = new THREE.Vector3().crossVectors(zHand, xHand);
  return frameMatrix(new THREE.Vector3(0.028, -0.074, 0.112), yHand, zHand);
}

/**
 * Left hand cupping the handguard from below-left: palm heel hangs off the bottom-left edge, knuckle row
 * pitched up toward the right side so the fingers wrap it, thumb along the left rail.
 */
function designLeftHandguard(socket) {
  const { cx, cy } = HANDGUARD;
  const R = HANDGUARD.rRail - 0.001;
  const phi = THREE.MathUtils.degToRad(210);
  const yaw = THREE.MathUtils.degToRad(14);
  const tilt = THREE.MathUtils.degToRad(24);
  const nrm = new THREE.Vector3(-Math.cos(phi), -Math.sin(phi), 0); // into the handguard
  const tan = new THREE.Vector3(-Math.sin(phi), Math.cos(phi), 0); // around it (fingers' way)
  // pitch the fingers toward the handguard, then yaw them slightly forward
  const yHand = tan.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(nrm, Math.sin(tilt));
  const zHand = nrm.clone().multiplyScalar(-Math.cos(tilt)).addScaledVector(tan, Math.sin(tilt));
  yHand.multiplyScalar(Math.cos(yaw)).add(new THREE.Vector3(0, 0, -Math.sin(yaw)));
  const dist = R + 0.024;
  const pos = new THREE.Vector3(cx + Math.cos(phi) * dist, cy + Math.sin(phi) * dist, socket.position.z - 0.004);
  return frameMatrix(pos, yHand, zHand);
}

/** Fallback when the attachments team moved the support socket onto a vertical foregrip. */
function designLeftForegrip(socket) {
  const xHand = new THREE.Vector3(0, 1, 0); // pinky down (left hand: pinky is -X)
  const zHand = new THREE.Vector3(-0.975, 0.0, 0.22).normalize();
  const yHand = new THREE.Vector3().crossVectors(zHand, xHand);
  const pos = socket.position.clone().add(new THREE.Vector3(-0.0265, -0.012, 0.03));
  return frameMatrix(pos, yHand, zHand);
}

/** Pose-specific palm offsets expressed in the (identity-rotated) reload target frame. */
const LEFT_RELOAD_OFFSETS = {
  magGrab: frameMatrix(new THREE.Vector3(-0.024, 0.006, 0.004), new THREE.Vector3(0.05, 0.3, -0.95), new THREE.Vector3(-0.95, -0.15, 0.1)),
  slap: frameMatrix(new THREE.Vector3(0.0, -0.15, 0.0), new THREE.Vector3(0.55, 0.05, -0.83), new THREE.Vector3(-0.15, -0.97, 0.15)),
  boltSlap: frameMatrix(new THREE.Vector3(-0.018, -0.005, 0.0), new THREE.Vector3(0.0, 0.75, -0.66), new THREE.Vector3(-0.98, 0.1, -0.15)),
};

function offsetFromMatrix(m) {
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  m.decompose(pos, quat, _scale);
  return { pos, quat };
}

/* ------------------------------------------------------------------------------------ module */

export async function buildArms(game, rig) {
  const { assets } = game;
  const root = new THREE.Group();
  root.name = 'ArmsCharlie';
  rig.arms.add(root);

  // --- materials (8 total: 5 glove + 2 sleeves + skin) --------------------------------------
  const knitMaps = makeKnitMaps(assets, 1024);
  const leatherMaps = makeLeatherMaps(assets, 1024);
  const camo = makeCamoMaps(assets, 1024);
  const skinMaps = makeSkinMaps(assets, 512);
  const skin = new THREE.MeshStandardMaterial({
    name: 'ForearmSkin',
    map: skinMaps.map,
    normalMap: skinMaps.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: skinMaps.roughnessMap,
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    envMapIntensity: 0.45,
  });
  const knit = new THREE.MeshStandardMaterial({
    name: 'GloveKnit',
    map: knitMaps.map,
    normalMap: knitMaps.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: knitMaps.roughnessMap,
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    envMapIntensity: 0.9,
  });
  const leather = new THREE.MeshStandardMaterial({
    name: 'GloveLeather',
    map: leatherMaps.map,
    normalMap: leatherMaps.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: leatherMaps.roughnessMap,
    roughness: 1,
    metalness: 0,
    vertexColors: true,
    envMapIntensity: 1.1,
  });
  const rubberNormal = leatherMaps.normalMap.clone();
  rubberNormal.repeat.set(3, 3);
  rubberNormal.needsUpdate = true;
  const rubber = new THREE.MeshStandardMaterial({
    name: 'GloveTPR',
    color: new THREE.Color(0.075, 0.075, 0.08),
    normalMap: rubberNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.62,
    metalness: 0,
    envMapIntensity: 1.0,
  });
  const strapNormal = knitMaps.normalMap.clone();
  strapNormal.repeat.set(1.6, 0.55);
  strapNormal.needsUpdate = true;
  const strap = new THREE.MeshStandardMaterial({
    name: 'GloveStrap',
    color: new THREE.Color(0.2, 0.2, 0.17),
    normalMap: strapNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: knitMaps.roughnessMap,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.8,
  });
  const trim = new THREE.MeshStandardMaterial({
    name: 'GloveTrim',
    color: new THREE.Color(0.27, 0.27, 0.25),
    normalMap: knitMaps.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.9,
    metalness: 0,
    envMapIntensity: 0.8,
  });
  const gloveMats = [knit, leather, rubber, strap, trim];

  // --- hands -------------------------------------------------------------------------------
  const sockets = rig.sockets;
  const arms = [];
  const setup = (side) => {
    const hand = buildHand(side, gloveMats);
    root.add(hand.root);
    const target = side > 0 ? sockets.rightHandTarget : sockets.leftHandTarget;
    const shoulder = side > 0 ? sockets.shoulderRight : sockets.shoulderLeft;
    const socket = side > 0 ? sockets.gripRight : sockets.gripLeft;
    // grip offset relative to the socket frame (so a moved socket carries the hand along)
    const foregrip = side < 0 && socket.position.y < -0.02;
    const design = side > 0 ? designRightGrip() : foregrip ? designLeftForegrip(socket) : designLeftHandguard(socket);
    _m.compose(socket.position, socket.quaternion, ONE).invert();
    const gripOffset = offsetFromMatrix(_m2.multiplyMatrices(_m, design));
    const offsets = { grip: gripOffset, relaxed: gripOffset };
    if (side < 0) for (const k of Object.keys(LEFT_RELOAD_OFFSETS)) offsets[k] = offsetFromMatrix(LEFT_RELOAD_OFFSETS[k]);
    // grip pose: wrap the fingers onto the measured gun geometry (right: middle/ring/pinky around the pistol
    // grip, thumb over its top-left, index pad on the trigger; left: all fingers + thumb around the quad rail)
    const poses = { ...(side > 0 ? POSES.right : POSES.left) };
    poses.grip = new Float32Array(poses.grip);
    if (side > 0) {
      const dir = new THREE.Vector3(0, -Math.cos(GRIP.rake), Math.sin(GRIP.rake));
      const gap = prismGap(GRIP.c, dir, new THREE.Vector3(1, 0, 0), GRIP.a, GRIP.b, 2.5);
      // thumb: knuckle over the grip's top-left, wrapping down the left face with the tip ahead of the knuckle
      const prefer = (mcp, tip) => sq(2 * Math.max(0, mcp.x + 0.004)) + sq(2 * Math.max(0, mcp.y + 0.038)) + sq(2 * Math.max(0, tip.y + 0.03)) + sq(1.5 * Math.max(0, tip.z - mcp.z + 0.02));
      solveWrap(hand, design, gap, poses.grip, { fingers: [1, 2, 3], avoid: GUN_AVOID, thumbGap: unionGap(gap, RECEIVER_REAR), thumbPrefer: prefer });
      solveReach(hand, design, 0, TRIGGER, poses.grip, { avoid: unionGap(gap, GUN_AVOID), abd: [-30, 38] });
    } else if (!foregrip) {
      const { cx, cy, rBody, rRail, railHalf } = HANDGUARD;
      const gap = quadRailGap(cx, cy, rBody, rRail, railHalf);
      // thumb: along the left rail, tip forward and above the knuckle
      const prefer = (mcp, tip) => sq(2 * Math.max(0, mcp.x - cx + 0.012)) + sq(2 * Math.max(0, tip.x - cx + 0.012)) + sq(1.5 * Math.max(0, mcp.y - tip.y)) + sq(Math.max(0, tip.z - mcp.z + 0.02)) + sq(1.5 * Math.max(0, tip.y - cy - 0.012));
      solveWrap(hand, design, gap, poses.grip, { thumbPrefer: prefer });
    }
    const arm = {
      side,
      hand,
      target,
      shoulder,
      offsets,
      poses,
      poseName: 'grip',
      poseTarget: poses.grip,
      angles: new Float32Array(poses.grip),
      offPos: gripOffset.pos.clone(),
      offQuat: gripOffset.quat.clone(),
      spring: new Spring3(420, 34),
      // elbow hint: right elbow tucked back at the ribs, left elbow low and out to the left under the handguard
      pole: side > 0 ? new THREE.Vector3(0.55, -0.72, 0.42).normalize() : new THREE.Vector3(-0.85, -0.35, -0.1).normalize(),
      upper: new THREE.Bone(),
      fore: new THREE.Bone(),
      init: false,
    };
    arm.upper.name = side > 0 ? 'UpperArmRight' : 'UpperArmLeft';
    arm.fore.name = side > 0 ? 'ForearmRight' : 'ForearmLeft';
    root.add(arm.upper);
    root.add(arm.fore);
    hand.applyPose(arm.angles);

    // rest chain (design pose) → bone rest matrices for the skinned sleeve
    design.decompose(hand.root.position, hand.root.quaternion, _scale);
    const W0 = WRIST_LOCAL.clone().applyQuaternion(hand.root.quaternion).add(hand.root.position);
    const S = shoulder.position.clone();
    const E0 = solveElbow(S, W0, arm.pole, new THREE.Vector3());
    const bend = new THREE.Vector3().subVectors(E0, S).cross(new THREE.Vector3().subVectors(W0, E0)).normalize();
    const handX = new THREE.Vector3(1, 0, 0).applyQuaternion(hand.root.quaternion);
    const handY = new THREE.Vector3(0, 1, 0).applyQuaternion(hand.root.quaternion);
    const handZ = new THREE.Vector3(0, 0, 1).applyQuaternion(hand.root.quaternion);
    const upper0 = new THREE.Matrix4().compose(S, quatFromYX(new THREE.Vector3().subVectors(E0, S), bend, new THREE.Quaternion()), ONE);
    const fore0 = new THREE.Matrix4().compose(E0, quatFromYX(new THREE.Vector3().subVectors(W0, E0), handX, new THREE.Quaternion()), ONE);
    const hand0 = design.clone();
    upper0.decompose(arm.upper.position, arm.upper.quaternion, arm.upper.scale);
    fore0.decompose(arm.fore.position, arm.fore.quaternion, arm.fore.scale);
    const sleeve = buildSleeve(game, {
      S,
      E: E0,
      W: W0,
      handY,
      handZ,
      bones: [arm.upper, arm.fore, hand.root],
      restBones: [upper0, fore0, hand0],
      side,
      camo,
      skinMaterial: skin,
      seed: side > 0 ? 0 : 3.7,
    });
    root.add(sleeve.mesh);
    arm.sleeve = sleeve;
    arms.push(arm);
  };
  setup(+1);
  setup(-1);

  // --- debug views for the reviewers (game.debug is created after the weapons load → register lazily).
  // The views park the sway pivot in a fixed pose; selecting any other view restores the pose animation.
  let viewsRegistered = false;
  root.userData.freezePose = (pos, rot) => {
    const w = game.weapons;
    const d = game.debug;
    if (!w.__charlieAnimatePose) {
      w.__charlieAnimatePose = w._animatePose;
      const origSetView = d.setView.bind(d);
      d.setView = (v) => {
        w._animatePose = w.__charlieAnimatePose;
        return origSetView(v);
      };
    }
    const sp = rig.swayPivot;
    w._animatePose = () => {
      sp.position.set(pos[0], pos[1], pos[2]);
      sp.rotation.set(rot[0], rot[1], rot[2]);
    };
  };
  const registerViews = () => {
    const d = game.debug;
    if (!d || viewsRegistered) return;
    viewsRegistered = true;
    const freeze = (pos, rot) => `weapons.rig.arms.getObjectByName('ArmsCharlie').userData.freezePose(${JSON.stringify(pos)}, ${JSON.stringify(rot)});`;
    d.registerView('arms_charlie_right', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: freeze([0.0, -0.02, -0.34], [0.25, -1.05, 0.0]) });
    d.registerView('arms_charlie_left', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: freeze([0.02, 0.0, -0.22], [-0.15, 0.55, 0.0]) });
    d.registerView('arms_charlie_left_close', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: freeze([0.05, 0.0, -0.06], [-0.1, 0.45, 0.0]) });
    d.registerView('arms_charlie_left_side', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: freeze([0.12, -0.02, -0.51], [0.1, 2.4, 0.0]) });
    d.registerView('arms_charlie_left_below', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: freeze([-0.144, -0.085, -0.231], [0.4, -0.9, 0.0]) });
  };

  /* ------------------------------------------------------------------------------ per frame */

  const updateArm = (arm, dt) => {
    const { hand, target, shoulder } = arm;
    // pose switch
    const poseName = target.userData.pose || 'grip';
    if (poseName !== arm.poseName) {
      arm.poseName = poseName;
      arm.poseTarget = arm.poses[poseName] || arm.poses.grip;
      arm.offsetTarget = arm.offsets[poseName] || arm.offsets.grip;
    }
    if (!arm.offsetTarget) arm.offsetTarget = arm.offsets.grip;
    const kPose = arm.init ? 1 - Math.exp(-dt * 14) : 1;
    arm.offPos.lerp(arm.offsetTarget.pos, kPose);
    arm.offQuat.slerp(arm.offsetTarget.quat, kPose);
    for (let i = 0; i < 20; i++) arm.angles[i] += (arm.poseTarget[i] - arm.angles[i]) * kPose;
    hand.applyPose(arm.angles);

    // desired hand frame = target ∘ offset
    _m.compose(target.position, target.quaternion, ONE);
    _m2.compose(arm.offPos, arm.offQuat, ONE);
    _m.multiply(_m2);
    _m.decompose(_v, _q, _scale);
    if (!arm.init) {
      arm.spring.value.copy(_v);
      arm.spring.target.copy(_v);
      hand.root.quaternion.copy(_q);
      arm.init = true;
    }
    arm.spring.target.copy(_v);
    if (dt > 0) arm.spring.update(dt);
    // clamped lag so fast reload moves never leave the hand trailing far behind the target
    _v2.subVectors(arm.spring.value, _v);
    const lag = _v2.length();
    if (lag > MAX_LAG) {
      _v2.multiplyScalar(MAX_LAG / lag);
      arm.spring.value.copy(_v).add(_v2);
    }
    hand.root.position.copy(_v).add(_v2);
    hand.root.quaternion.slerp(_q, dt > 0 ? 1 - Math.exp(-dt * 40) : 1);

    // two-bone IK from the wrist back to the shoulder anchor
    _w.copy(WRIST_LOCAL).applyQuaternion(hand.root.quaternion).add(hand.root.position);
    solveElbow(shoulder.position, _w, arm.pole, _e);
    // forearm bone: at the elbow, +Y toward the wrist, twist following the hand
    _x.set(1, 0, 0).applyQuaternion(hand.root.quaternion);
    _d.subVectors(_w, _e);
    arm.fore.position.copy(_e);
    quatFromYX(_d, _x, arm.fore.quaternion);
    arm.fore.scale.y = Math.max(0.5, _d.length() / FORE_LEN);
    // upper arm bone: at the shoulder, +Y toward the elbow, X along the bend-plane normal
    _d.subVectors(_e, shoulder.position);
    _v2.subVectors(_w, _e);
    _z.crossVectors(_d, _v2);
    arm.upper.position.copy(shoulder.position);
    quatFromYX(_d, _z, arm.upper.quaternion);
    arm.upper.scale.y = Math.max(0.5, _d.length() / UPPER_LEN);
  };

  const api = {
    root,
    update(dt) {
      if (!viewsRegistered) registerViews();
      for (let i = 0; i < arms.length; i++) updateArm(arms[i], dt);
    },
    setPose(name) {
      for (const arm of arms) arm.target.userData.pose = name;
    },
    dispose() {
      root.removeFromParent();
      root.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      for (const m of gloveMats) m.dispose();
      skin.dispose();
      for (const arm of arms) {
        arm.sleeve.material.normalMap.dispose();
        arm.sleeve.material.dispose();
      }
      for (const maps of [knitMaps, leatherMaps, camo, skinMaps]) for (const t of Object.values(maps)) t.dispose();
      rubberNormal.dispose();
      strapNormal.dispose();
    },
  };
  api.update(0);
  return api;
}
