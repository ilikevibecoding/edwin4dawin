import * as THREE from 'three';
import { Spring3 } from '../../springs.js';
import { RoundBox } from './sdf.js';
import { buildHandGeometry, POSES, WRIST_LOCAL } from './hand.js';
import { createArmMaterials } from './textures.js';
import { buildArm, solveElbow, basisQuat } from './arm.js';

/**
 * Arms candidate "alpha": marching-cubes glove hands (seamless metaball sculpt, one static mesh per
 * finger pose, swapped by rig.sockets.*HandTarget.userData.pose) + skinned forearm sleeves driven by a
 * two-bone IK toward the shoulder anchors. Everything is built synchronously inside buildArms so the
 * WeaponSystem's setupObject/setViewModel pass registers every material and shadow proxy.
 *
 * Frames: hand-local (see hand.js) → target-local via a per-variant "place" matrix → root via the
 * hand target's transform. Weapon volumes are carved out of the SDF so the glove presses flat against
 * the handguard / grip instead of intersecting it.
 */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3();
const _wrist = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _xh = new THREE.Vector3();
const _yh = new THREE.Vector3();
const _zh = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _H = new THREE.Matrix4();
const _q = new THREE.Quaternion();

/** Weapon collision volumes in gunRoot space (measured from the M4A1 glb). */
export const GUN = {
  // quad-rail handguard ≈ cross section: 15 mm vertical bar + 15 mm side rails + octagonal body
  handguardCore: { c: V(0, 0.0203, -0.22), h: V(0.0078, 0.031, 0.12), r: 0.002 },
  handguardBody: { c: V(0, 0.0175, -0.21), h: V(0.0205, 0.0175, 0.09), r: 0.004 },
  handguardRails: { c: V(0, 0.0178, -0.21), h: V(0.0316, 0.0078, 0.09), r: 0.0015 },
  receiver: { c: V(0, -0.005, -0.045), h: V(0.015, 0.056, 0.062), r: 0.003 },
  magazine: { c: V(-0.001, -0.088, -0.06), h: V(0.0105, 0.09, 0.043), r: 0.003 },
  grip: { c: V(0, -0.1, 0.076), h: V(0.0105, 0.04, 0.02), r: 0.004, q: new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -0.71) },
  triggerGuard: { c: V(0, -0.05, 0.02), h: V(0.0095, 0.02, 0.04), r: 0.003 },
  stockTop: { c: V(0, -0.01, 0.16), h: V(0.016, 0.035, 0.09), r: 0.004 },
};

/**
 * Hand placements: palm-centre position (gun space) + dorsal (Y) and distal (Z) directions (gun space),
 * expressed relative to the socket the target copies. Tuned against screenshots.
 */
export const PLACEMENTS = {
  // MW2019 support grip: the hand grabs the handguard from the left like a horizontal bar — palm pressed
  // on the left rail, fingers pointing up and curling over the top rail toward the right, thumb tucked
  // under the handguard. The back of the hand faces left/back toward the camera, the wrist sits below
  // the handguard so the forearm rises from the lower-left.
  leftGrip: {
    socket: 'gripLeft',
    palm: V(-0.038, 0.014, -0.19),
    dorsal: V(-0.9, 0.3, 0.32),
    distal: V(0.3, 0.93, -0.05),
    pose: 'grip',
    // fitted numerically (tools: grid search on contact vs. penetration against the GUN volumes)
    fingers: [
      [1.1, 1.15, 0.5],
      [1.3, 0.9, 0.4],
      [1.15, 0.85, 0.4],
      [0.95, 0.7, 0.5],
    ],
    // thumb wraps under the handguard and up its right side (gun-space segment directions)
    thumbGun: [V(0.9, -0.2, 0.38), V(0.9, 0.4, 0.15), V(0.35, 0.93, 0.1)],
    carves: ['handguardCore', 'handguardBody', 'handguardRails'],
  },
  leftMagGrab: {
    socket: null, // target position is the mag grab point; orientation = gripLeft (identity)
    palm: V(-0.026, -0.028, 0.0),
    dorsal: V(-0.95, -0.2, -0.2),
    distal: V(0.0, 0.45, -0.89),
    pose: 'magGrab',
    carves: [],
  },
  leftSlap: {
    socket: null,
    palm: V(0.0, -0.075, 0.0),
    dorsal: V(0, -1, 0),
    distal: V(0, 0.05, -1),
    pose: 'open',
    carves: [],
  },
  leftBoltSlap: {
    socket: null,
    palm: V(-0.014, 0.0, 0.0),
    dorsal: V(-1, 0, 0),
    distal: V(0, 0.6, -0.8),
    pose: 'open',
    carves: [],
  },
  rightPistol: {
    socket: 'gripRight',
    palm: V(0.026, -0.096, 0.076),
    dorsal: V(0.978, -0.13, -0.15),
    distal: V(-0.2, -0.64, -0.74),
    pose: 'pistol',
    carves: ['grip', 'triggerGuard', 'receiver', 'stockTop'],
  },
};

const POLE_LEFT = V(-0.8, -0.8, 0.0).normalize();
const POLE_RIGHT = V(1.0, -0.7, -0.1).normalize();

export function orthoBasis(dorsal, distal, position) {
  const y = dorsal.clone().normalize();
  const z = distal.clone().addScaledVector(y, -distal.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(position);
}

/** Resolve a placement's pose: base pose + finger overrides + gun-space thumb directions → hand frame. */
export function resolvePose(P, H, mirror) {
  const pose = { ...POSES[P.pose] };
  if (P.fingers) pose.fingers = P.fingers;
  if (P.thumbGun) {
    const Rinv = new THREE.Matrix4().extractRotation(H).invert();
    pose.thumb = P.thumbGun.map((d) => {
      const l = d.clone().normalize().applyMatrix4(Rinv);
      if (mirror) l.x = -l.x;
      return l;
    });
  }
  return pose;
}

/** Gun-space rounded box → hand-local carve primitive (canonical left frame; mirrored for right hands). */
export function carveToLocal(box, Hinv, mirror) {
  const c = box.c.clone().applyMatrix4(Hinv);
  const qH = new THREE.Quaternion().setFromRotationMatrix(Hinv);
  const q = box.q ? qH.clone().multiply(box.q) : qH;
  if (mirror) {
    c.x = -c.x;
    q.set(q.x, -q.y, -q.z, q.w);
  }
  return new RoundBox(c, box.h, box.r, q);
}

export async function buildArms(game, rig) {
  const root = new THREE.Group();
  root.name = 'ArmsAlpha';
  rig.arms.add(root);

  const mats = createArmMaterials(game.assets);
  const handMats = [mats.knit, mats.leather, mats.cuff];
  const stats = { triangles: 0, variants: {} };

  /** Build one posed hand mesh variant. */
  const makeVariant = (key, mirror, cell) => {
    const P = PLACEMENTS[key];
    const H = orthoBasis(P.dorsal, P.distal, P.palm); // hand → gun (or → target frame when socket is null)
    let place;
    if (P.socket) {
      const s = rig.sockets[P.socket];
      s.updateMatrix();
      place = s.matrix.clone().invert().multiply(H);
    } else {
      place = H.clone();
    }
    const Hinv = H.clone().invert();
    const carves = P.carves.map((name) => carveToLocal(GUN[name], Hinv, mirror));
    const t0 = performance.now();
    const { geometry, stats: st } = buildHandGeometry(resolvePose(P, H, mirror), { mirror, carves, cell });
    const mesh = new THREE.Mesh(geometry, handMats);
    mesh.name = `Hand_${key}`;
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(place);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    root.add(mesh);
    stats.variants[key] = { ...st, ms: Math.round(performance.now() - t0) };
    return { mesh, place, pose: P.pose };
  };

  const left = {
    target: rig.sockets.leftHandTarget,
    shoulder: rig.sockets.shoulderLeft,
    pole: POLE_LEFT,
    group: new THREE.Group(),
    spring: new Spring3(700, 34),
    variants: {
      grip: makeVariant('leftGrip', false, 0.0026),
      magGrab: makeVariant('leftMagGrab', false, 0.0028),
      slap: makeVariant('leftSlap', false, 0.003),
      boltSlap: null,
    },
    current: null,
  };
  // bolt slap shares the open-hand geometry with a different placement
  {
    const P = PLACEMENTS.leftBoltSlap;
    const place = orthoBasis(P.dorsal, P.distal, P.palm);
    const mesh = new THREE.Mesh(left.variants.slap.mesh.geometry, handMats);
    mesh.name = 'Hand_leftBoltSlap';
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(place);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = false;
    root.add(mesh);
    left.variants.boltSlap = { mesh, place, pose: 'open' };
  }
  const right = {
    target: rig.sockets.rightHandTarget,
    shoulder: rig.sockets.shoulderRight,
    pole: POLE_RIGHT,
    group: new THREE.Group(),
    spring: new Spring3(700, 34),
    variants: { grip: makeVariant('rightPistol', true, 0.0031) },
    current: null,
  };
  // Variants are children of the per-side group that follows the hand target.
  for (const side of [left, right]) {
    side.group.name = side === left ? 'HandGroupLeft' : 'HandGroupRight';
    root.add(side.group);
    for (const v of Object.values(side.variants)) if (v) side.group.add(v.mesh);
    const arm = buildArm(mats, side === left ? -1 : 1);
    side.arm = arm.mesh;
    side.bones = arm.bones;
    for (const b of arm.bones) root.add(b);
    root.add(arm.mesh);
    stats.triangles += arm.triangles;
  }
  // Bind the skinned sleeves once the bones sit at their rest transforms.
  root.updateWorldMatrix(true, true);
  for (const side of [left, right]) {
    const skeleton = new THREE.Skeleton(side.bones);
    side.arm.bind(skeleton, side.arm.matrixWorld);
    side.skeleton = skeleton;
  }

  const setVariant = (side, name) => {
    const v = side.variants[name] || side.variants.grip;
    if (side.current === v) return v;
    if (side.current) side.current.mesh.visible = false;
    v.mesh.visible = true;
    side.current = v;
    return v;
  };
  setVariant(left, 'grip');
  setVariant(right, 'grip');
  for (const side of [left, right]) {
    side.spring.value.copy(side.target.position);
    side.spring.target.copy(side.target.position);
  }

  let poseOverride = null;

  const updateSide = (side, dt, poseName) => {
    const t = side.target;
    const g = side.group;
    // Tiny positional lag so the hands read as having mass (never more than ~2 mm behind the target).
    if (dt > 0) {
      side.spring.target.copy(t.position);
      side.spring.update(dt);
      _v.subVectors(side.spring.value, t.position);
      const l = _v.length();
      if (l > 0.0025) side.spring.value.copy(t.position).addScaledVector(_v, 0.0025 / l);
      g.position.copy(side.spring.value);
    } else {
      side.spring.value.copy(t.position);
      g.position.copy(t.position);
    }
    g.quaternion.copy(t.quaternion);
    g.updateMatrix();

    const v = setVariant(side, poseName);
    // Hand frame in root space: group × place.
    _H.multiplyMatrices(g.matrix, v.place);
    _H.extractBasis(_xh, _yh, _zh);
    _wrist.copy(WRIST_LOCAL).applyMatrix4(_H);

    // Elbow via two-bone IK toward the shoulder anchor.
    const S = side.shoulder.position;
    solveElbow(S, _wrist, side.pole, _elbow);

    const [b0, b1, b2] = side.bones;
    b0.position.copy(_wrist);
    _dir.copy(_zh).negate();
    basisQuat(_dir, _yh, b0.quaternion);
    b1.position.copy(_wrist);
    _dir.subVectors(_elbow, _wrist);
    basisQuat(_dir, _yh, b1.quaternion);
    b2.position.copy(_elbow);
    _dir.subVectors(S, _elbow);
    basisQuat(_dir, _yh, b2.quaternion);
  };

  const api = {
    root,
    stats,
    update(dt, state) {
      const lp = poseOverride || left.target.userData.pose || 'grip';
      updateSide(left, dt, lp);
      updateSide(right, dt, right.target.userData.pose || 'grip');
    },
    setPose(name) {
      poseOverride = name && name !== 'grip' ? name : null;
    },
    dispose() {
      root.removeFromParent();
      const seen = new Set();
      root.traverse((o) => {
        if (o.isMesh && o.geometry && !seen.has(o.geometry)) {
          seen.add(o.geometry);
          o.geometry.dispose();
        }
      });
      for (const m of mats.all) {
        for (const key of ['map', 'normalMap', 'roughnessMap']) m[key]?.dispose();
        m.dispose();
      }
    },
  };
  // first frame: place everything before the WeaponSystem's initial render
  api.update(0, rig.state);
  if (game.settings.params.get('armsdebug')) console.warn('[arms alpha]', JSON.stringify(stats));
  return api;
}
