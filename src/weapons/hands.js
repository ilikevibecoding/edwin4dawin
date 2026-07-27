import * as THREE from 'three';

/**
 * First-person gloved hands + forearm sleeves.
 * Hand local space (RIGHT hand): origin at wrist, fingers point -Z,
 * palm faces -Y (down), thumb on the -X side. Left hand = scale.x -1 mirror.
 *
 * buildHand() returns { group, fingers[4], thumb, forearm } where each finger is
 * { root, joints[] } — pose with curlFinger(). orientHand() aims the whole hand.
 */

const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

function capsuleZ(r, totalLen, mat) {
  const mid = Math.max(totalLen - r * 2, 0.002);
  const geo = new THREE.CapsuleGeometry(r, mid, 3, 10);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

function makeFinger(mats, lens, r, fi = 0) {
  // deterministic wear jitter: alternate slightly lighter/darker glove fabric
  // between segments so fingers don't read as one continuous plastic shell
  const vars = [mats.glove, mats.gloveB || mats.glove, mats.gloveC || mats.glove];
  const root = new THREE.Group();
  const joints = [root];
  let parent = root;
  for (let i = 0; i < lens.length; i++) {
    const len = lens[i];
    const rr = r * (1 - i * 0.13);
    const gm = vars[(fi + i) % 3];
    const seg = capsuleZ(rr, len, gm);
    seg.position.z = -len / 2;
    parent.add(seg);
    // glove padding hump over the knuckle at the segment root — breaks the
    // smooth-capsule silhouette into articulated joints (kept small so sunlit
    // top faces read as fabric humps, not armor chips)
    const pad = new THREE.Mesh(new THREE.BoxGeometry(rr * 1.26, rr * 0.52, len * 0.34), gm);
    pad.position.set(0, rr * 0.7, -len * 0.24);
    parent.add(pad);
    // stitch seam running along the top of the segment
    const stitch = new THREE.Mesh(new THREE.BoxGeometry(rr * 0.34, rr * 0.16, len * 0.74), mats.gloveStitch);
    stitch.position.set(0, rr * 0.96, -len * 0.5);
    parent.add(stitch);
    if (i < lens.length - 1) {
      const j = new THREE.Group();
      j.position.z = -len;
      parent.add(j);
      joints.push(j);
      parent = j;
    }
  }
  return { root, joints };
}

/** Curl a finger: joint rotations toward the palm. spread = sideways splay. */
export function curlFinger(finger, c0, c1, c2, spread = 0) {
  finger.joints[0].rotation.set(-c0, spread, 0);
  if (finger.joints[1]) finger.joints[1].rotation.set(-c1, 0, 0);
  if (finger.joints[2]) finger.joints[2].rotation.set(-c2, 0, 0);
}

/**
 * Orient a hand so its fingers (uncurled) point along fingersDir and its palm
 * faces palmDir (both in parent space). Directions need not be exactly orthogonal.
 */
export function orientHand(hand, fingersDir, palmDir) {
  _z.copy(fingersDir).negate().normalize();               // local +z
  _y.copy(palmDir).negate();                              // local +y = back of hand
  _y.addScaledVector(_z, -_y.dot(_z)).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  hand.quaternion.setFromRotationMatrix(_m);
}

const _q = new THREE.Quaternion();
const _d = new THREE.Vector3();

/** Point a hand's forearm sleeve toward the elbow, dir given in GUN space. */
export function aimForearm(hand, dirGunSpace, mirrored = false) {
  _d.copy(dirGunSpace).normalize();
  _q.copy(hand.group.quaternion).invert();
  _d.applyQuaternion(_q);
  if (mirrored) _d.x *= -1;
  hand.forearm.quaternion.setFromUnitVectors(_z.set(0, 0, 1), _d);
}

export function buildHand(mats, { mirror = false, forearmLen = 0.125 } = {}) {
  const group = new THREE.Group();

  // palm — main block + heel, slightly rounded silhouette via overlapping boxes;
  // the underside pieces use the leather-palm material for a material split
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.025, 0.080), mats.glove);
  palm.position.set(0, 0, -0.044);
  group.add(palm);
  const palmSide = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.020, 0.062), mats.glovePalm);
  palmSide.position.set(0, -0.0035, -0.042);
  group.add(palmSide);
  const heel = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.028, 0.036), mats.glovePalm);
  heel.position.set(0, -0.002, -0.014);
  group.add(heel);
  // seams across the back of the hand toward the knuckles
  for (const sx of [-0.017, 0.0, 0.017]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.0024, 0.0018, 0.034), mats.gloveStitch);
    seam.position.set(sx, 0.0128, -0.062);
    group.add(seam);
  }

  // hard knuckle plate (tan) on the back of the hand
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.032), mats.knuckle);
  plate.position.set(0, 0.014, -0.058);
  group.add(plate);
  const plate2 = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.007, 0.016), mats.gloveTan);
  plate2.position.set(0, 0.0135, -0.028);
  group.add(plate2);

  // cuff + strap + seam ring
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.035, 0.036, 12), mats.glove);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.set(0, 0.001, 0.016);
  group.add(cuff);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.010, 0.012), mats.gloveTan);
  strap.position.set(0, 0.013, 0.018);
  group.add(strap);
  const cuffSeam = new THREE.Mesh(new THREE.TorusGeometry(0.0322, 0.0011, 6, 18), mats.gloveStitch);
  cuffSeam.position.set(0, 0.001, 0.0295);
  group.add(cuffSeam);

  // forearm sleeve — child group so poses can aim it toward the elbow
  const forearm = new THREE.Group();
  forearm.position.set(0, 0.001, 0.030);
  const sleeve = capsuleZ(0.0245, forearmLen, mats.sleeve);
  sleeve.position.z = forearmLen / 2 + 0.012;
  forearm.add(sleeve);
  const cuffRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.026, 0.022, 12), mats.sleeve);
  cuffRoll.rotation.x = Math.PI / 2;
  cuffRoll.position.z = 0.020;
  forearm.add(cuffRoll);
  group.add(forearm);

  // fingers: index → pinky (right hand: index on -X, next to thumb)
  const fingerDefs = [
    { x: -0.026, r: 0.0092, lens: [0.034, 0.026, 0.021] },  // index
    { x: -0.0085, r: 0.0096, lens: [0.037, 0.028, 0.022] }, // middle
    { x: 0.0090, r: 0.0090, lens: [0.034, 0.026, 0.020] },  // ring
    { x: 0.0260, r: 0.0082, lens: [0.027, 0.020, 0.016] },  // pinky
  ];
  const fingers = fingerDefs.map((d, fi) => {
    const f = makeFinger(mats, d.lens, d.r, fi);
    f.root.position.set(d.x, 0.003, -0.083);
    group.add(f.root);
    return f;
  });

  // thumb: 2 segments, base on -X side, angled across the palm
  const thumb = makeFinger(mats, [0.042, 0.034], 0.0105, 1);
  thumb.root.position.set(-0.033, -0.006, -0.036);
  thumb.root.rotation.set(0.2, 0.85, 0.5);
  group.add(thumb.root);

  if (mirror) group.scale.x = -1;

  group.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; } });
  return { group, palm, fingers, thumb, forearm };
}

/** Standard relaxed grip curl for wrapping a bar/grip of roughly `r` radius. */
export function gripCurl(hand, tightness = 1, indexOnTrigger = false) {
  const t = tightness;
  curlFinger(hand.fingers[0], indexOnTrigger ? 0.25 : 0.95 * t, indexOnTrigger ? 0.2 : 1.05 * t, indexOnTrigger ? 0.15 : 0.7 * t, indexOnTrigger ? 0.12 : 0.02);
  curlFinger(hand.fingers[1], 1.0 * t, 1.1 * t, 0.75 * t, 0.0);
  curlFinger(hand.fingers[2], 1.05 * t, 1.12 * t, 0.8 * t, -0.03);
  curlFinger(hand.fingers[3], 1.1 * t, 1.15 * t, 0.85 * t, -0.08);
  curlFinger(hand.thumb, 0.35 * t, 0.55 * t, 0, 0);
}
