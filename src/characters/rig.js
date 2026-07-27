import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { sphere, cyl, bevelBox, mesh, applyBoxUV } from '../map/kit.js';

// ---------------------------------------------------------------------------
// Lightweight skeletal system.  (owner: fable4)
//
// No skinning: every character is a "segmented" figure — a hierarchy of
// THREE.Group bones with rigid per-bone meshes parented to them. Joints are
// covered by sphere caps that overlap the adjacent segments, so nothing tears
// open at gameplay distance no matter how far a joint bends.
//
// Conventions
//   * Units metres, Y-up. A rig's root sits at the character's feet (y = 0)
//     and faces -Z (the game's "forward"), matching the engine convention.
//   * Bone rest positions are absolute offsets from the parent bone.
//   * Limb bones point DOWN the limb: rotating a thigh about +X swings the
//     leg forward (toward -Z).
// ---------------------------------------------------------------------------

/**
 * Canonical humanoid proportions (male 1.78 m). Individual models scale the
 * whole rig a few percent for variety; the skeleton itself never changes.
 */
export const HUMAN = {
  height: 1.78,
  eye: 1.68,
  hipsY: 0.99,
  thighLen: 0.47,   // hip -> knee
  shinLen: 0.44,    // knee -> ankle
  ankleY: 0.08,
  spineY: 0.12,     // hips -> spine
  chestY: 0.18,     // spine -> chest
  neckY: 0.24,      // chest -> neck
  headY: 0.09,      // neck -> head pivot
  clavX: 0.055,     // chest -> clavicle
  clavY: 0.135,     // shoulder line lands at 1.42 m
  shoulderX: 0.155, // clavicle -> shoulder joint
  upperArmLen: 0.30,
  forearmLen: 0.27,
  handLen: 0.18,
  hipHalf: 0.093,   // lateral offset of each thigh
  shoulderWidth: 0.42,
  chestDepth: 0.24,
};

/** Ordered bone table: name -> [parent, restOffset] */
function boneTable(H = HUMAN) {
  return [
    ['hips', null, [0, H.hipsY, 0]],
    ['spine', 'hips', [0, H.spineY, 0]],
    ['chest', 'spine', [0, H.chestY, 0]],
    ['neck', 'chest', [0, H.neckY, 0]],
    ['head', 'neck', [0, H.headY, 0]],
    ['clavicleL', 'chest', [-H.clavX, H.clavY, 0]],
    ['clavicleR', 'chest', [H.clavX, H.clavY, 0]],
    ['upperArmL', 'clavicleL', [-H.shoulderX, 0, 0]],
    ['upperArmR', 'clavicleR', [H.shoulderX, 0, 0]],
    ['forearmL', 'upperArmL', [0, -H.upperArmLen, 0]],
    ['forearmR', 'upperArmR', [0, -H.upperArmLen, 0]],
    ['handL', 'forearmL', [0, -H.forearmLen, 0]],
    ['handR', 'forearmR', [0, -H.forearmLen, 0]],
    ['thighL', 'hips', [-H.hipHalf, -0.02, 0]],
    ['thighR', 'hips', [H.hipHalf, -0.02, 0]],
    ['shinL', 'thighL', [0, -H.thighLen, 0]],
    ['shinR', 'thighR', [0, -H.thighLen, 0]],
    ['footL', 'shinL', [0, -H.shinLen, 0]],
    ['footR', 'shinR', [0, -H.shinLen, 0]],
  ];
}

const _v0 = new THREE.Vector3();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q0 = new THREE.Quaternion();
const _m0 = new THREE.Matrix4();

export class SkeletonRig {
  /**
   * @param {object} opts
   * @param {number} [opts.scale]  uniform body scale (1 = 1.78 m tall)
   */
  constructor({ scale = 1 } = {}) {
    this.scale = scale;
    /** Root group: place/rotate this in the world. */
    this.root = new THREE.Group();
    this.root.name = 'rig-root';
    /** @type {Record<string, THREE.Group>} */
    this.bones = {};
    /** rest offsets so poses can be applied absolutely each frame */
    this.rest = {};

    for (const [name, parent, off] of boneTable()) {
      const b = new THREE.Group();
      b.name = `bone:${name}`;
      b.position.set(off[0], off[1], off[2]);
      this.bones[name] = b;
      this.rest[name] = off.slice();
      (parent ? this.bones[parent] : this.root).add(b);
    }
    this.root.scale.setScalar(scale);
    // Named pose snapshots (registered by animation.js and by models).
    this._poses = new Map();
  }

  /** Register a named pose so `pose(name, t)` can recall it. */
  definePose(name, poseObj) {
    this._poses.set(name, poseObj);
    return this;
  }

  getPose(name) {
    return this._poses.get(name);
  }

  /**
   * Apply a named (or literal) pose. `t` in [0,1] blends from the current
   * bone rotations toward the pose, so `pose(name, 1)` snaps exactly.
   */
  pose(name, t = 1) {
    const p = typeof name === 'string' ? this._poses.get(name) : name;
    if (!p) return this;
    applyPose(this, p, t);
    return this;
  }

  /** Blend two named/literal poses and apply the result (`t`: 0=from, 1=to). */
  blend(from, to, t) {
    const a = typeof from === 'string' ? this._poses.get(from) : from;
    const b = typeof to === 'string' ? this._poses.get(to) : to;
    if (!a || !b) return this.pose(a || b, 1);
    applyPose(this, mixPose(a, b, t), 1);
    return this;
  }

  /**
   * Two-bone IK: bend an arm so the hand lands on a world-space target.
   * Used to keep a support hand glued to a weapon's handguard.
   * @param {THREE.Vector3} handTarget  world position
   * @param {'L'|'R'} side
   * @param {number} weight 0..1
   */
  setIK(handTarget, side = 'L', weight = 1) {
    if (!handTarget || weight <= 0) return this;
    const upper = this.bones[`upperArm${side}`];
    const fore = this.bones[`forearm${side}`];
    const hand = this.bones[`hand${side}`];

    upper.updateWorldMatrix(true, false);
    const shoulder = _v0.setFromMatrixPosition(upper.matrixWorld);
    const target = _v1.copy(handTarget);

    const L1 = HUMAN.upperArmLen * this.scale;
    const L2 = HUMAN.forearmLen * this.scale;
    const dist = Math.min(shoulder.distanceTo(target), (L1 + L2) * 0.999);

    // Law of cosines for the elbow angle.
    const cosElbow = (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2);
    const elbow = Math.acos(THREE.MathUtils.clamp(cosElbow, -1, 1));
    const cosShoulder = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
    const shoulderBend = Math.acos(THREE.MathUtils.clamp(cosShoulder, -1, 1));

    // Aim the upper arm at the target in the parent (clavicle) space, then
    // pull it back by the shoulder wedge angle around the elbow hinge axis.
    const parent = upper.parent;
    parent.updateWorldMatrix(true, false);
    _m0.copy(parent.matrixWorld).invert();
    const localTarget = _v2.copy(target).applyMatrix4(_m0).sub(upper.position);

    // Default limb axis is -Y. Compute the quaternion rotating -Y onto the dir.
    const dir = localTarget.normalize();
    _q0.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    // Elbows hinge "backwards": bend around the local +X axis, biased outward
    // so arms wrap naturally around a chest-held weapon.
    const hingeAxis = new THREE.Vector3(1, 0, side === 'L' ? -0.35 : 0.35).normalize();
    const qBend = new THREE.Quaternion().setFromAxisAngle(hingeAxis, -shoulderBend);
    _q0.multiply(qBend);
    upper.quaternion.slerp(_q0, weight);

    const qElbow = new THREE.Quaternion().setFromAxisAngle(hingeAxis, Math.PI - elbow);
    fore.quaternion.slerp(qElbow, weight);
    hand.quaternion.slerp(new THREE.Quaternion(), weight * 0.5);
    return this;
  }
}

/** Apply a pose object ({bone:[rx,ry,rz], hipsPos:[x,y,z]}) with blend t. */
export function applyPose(rig, pose, t = 1) {
  for (const name of Object.keys(rig.bones)) {
    const rot = pose[name];
    if (!rot) continue;
    const b = rig.bones[name];
    if (t >= 1) {
      b.rotation.set(rot[0], rot[1], rot[2]);
    } else {
      b.rotation.x += (rot[0] - b.rotation.x) * t;
      b.rotation.y += (rot[1] - b.rotation.y) * t;
      b.rotation.z += (rot[2] - b.rotation.z) * t;
    }
  }
  if (pose.hipsPos) {
    const hips = rig.bones.hips;
    const rx = rig.rest.hips[0] + pose.hipsPos[0];
    const ry = rig.rest.hips[1] + pose.hipsPos[1];
    const rz = rig.rest.hips[2] + pose.hipsPos[2];
    if (t >= 1) hips.position.set(rx, ry, rz);
    else {
      hips.position.x += (rx - hips.position.x) * t;
      hips.position.y += (ry - hips.position.y) * t;
      hips.position.z += (rz - hips.position.z) * t;
    }
  }
}

/** Linear pose mix; missing bones fall back to whichever pose defines them. */
export function mixPose(a, b, t, out = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (va && vb) {
      out[k] = [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t, va[2] + (vb[2] - va[2]) * t];
    } else {
      out[k] = (vb || va).slice();
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Segmented body construction
// ---------------------------------------------------------------------------

/**
 * A limb segment: a capsule (cylinder + hemispherical caps) whose axis runs
 * down -Y from the bone origin. The caps overlap the neighbouring segments so
 * joints never show gaps when they bend.
 */
export function limbSegment({ rTop, rBottom = rTop, length, mat, capTop = true, capBottom = true, seg = 10 }) {
  const g = new THREE.Group();
  const body = mesh(cyl(rTop, rBottom, length, seg), mat);
  body.position.y = -length / 2;
  g.add(body);
  if (capTop) {
    const cap = mesh(sphere(rTop, seg), mat);
    g.add(cap);
  }
  if (capBottom) {
    const cap = mesh(sphere(rBottom, seg), mat);
    cap.position.y = -length;
    g.add(cap);
  }
  return g;
}

/**
 * Rounded body mass. The old 0.012 chamfer left visible box corners on every
 * torso (QA: "hard rectangular blocks", "blocky at mid range"); a real corner
 * radius with smooth normals is what makes the primary forms read as a person.
 */
const roundGeoCache = new Map();
export function roundedBlock(w, h, d, r = 0.045, seg = 2) {
  const radius = Math.min(r, w / 2.05, h / 2.05, d / 2.05);
  const key = `round:${w.toFixed(4)}:${h.toFixed(4)}:${d.toFixed(4)}:${radius.toFixed(4)}:${seg}`;
  if (roundGeoCache.has(key)) return roundGeoCache.get(key);
  const g = new RoundedBoxGeometry(w, h, d, seg, radius);
  // World-metre UVs to match the rest of the kit so tiling cloth stays at a
  // consistent physical scale across body masses and clothing panels.
  applyBoxUV(g, 1);
  roundGeoCache.set(key, g);
  return g;
}

/** A clothing block: rounded box centred on the bone, offset optional. */
export function clothBlock({ w, h, d, mat, y = 0, z = 0, x = 0, r = 0.045 }) {
  const m = mesh(roundedBlock(w, h, d, r), mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * Build a standard segmented human body onto a rig.
 *
 * @param {SkeletonRig} rig
 * @param {object} mats  {skin, torso, hips, arm, forearm, hand, thigh, shin, boot}
 * @param {object} [opts] {bulk:1, shoulderPads:false}
 * @returns {{parts:Record<string,THREE.Object3D>}} named body parts for detailing
 */
export function buildSegmentedBody(rig, mats, opts = {}) {
  const H = HUMAN;
  const bulk = opts.bulk ?? 1;
  const B = rig.bones;
  const parts = {};

  // --- torso ---------------------------------------------------------------
  // Pelvis block on hips.
  parts.pelvis = clothBlock({
    w: 0.30 * bulk, h: 0.20, d: 0.20 * bulk, mat: mats.hips, y: -0.035, r: 0.05,
  });
  B.hips.add(parts.pelvis);

  // Lower torso on spine: an elliptical cylinder, not a box. It keeps its
  // full cross-section at every height, so the chest and pelvis blocks bury
  // its rims and no seam can open into a see-through slit when the spine
  // bends (rounded boxes recede at their corners and were letting bright
  // backgrounds bleed through the waist). Outfits with an open over-layer
  // (cardigan, jacket) pass mats.belly so the tall cylinder reads as the
  // outer garment where it emerges from behind chest-bone panels.
  {
    const bw = 0.31 * bulk, bd = 0.205 * bulk, bh = 0.28;
    const belly = mesh(cyl(bw / 2, bw / 2, bh, 14), mats.belly || mats.torso);
    belly.scale.z = bd / bw;
    belly.position.y = 0.065;
    parts.belly = belly;
  }
  B.spine.add(parts.belly);

  // Chest on chest bone (widest at shoulders). The big corner radius is what
  // rounds the shoulder line into the deltoid caps.
  parts.chest = clothBlock({
    w: 0.36 * bulk, h: 0.28, d: H.chestDepth * bulk, mat: mats.torso, y: 0.10, r: 0.07,
  });
  B.chest.add(parts.chest);

  // Shoulder caps: spheres so raised arms never open a hole at the deltoid.
  // Slightly oversized and tucked inboard so they stay buried in the chest
  // where its rounded corners recede.
  for (const side of ['L', 'R']) {
    const cap = mesh(sphere(0.08 * bulk, 10), mats.arm);
    cap.position.x = side === 'L' ? 0.018 : -0.018;
    B[`upperArm${side}`].add(cap);
    parts[`shoulderCap${side}`] = cap;
  }

  // Neck stub.
  parts.neck = limbSegment({ rTop: 0.058, length: 0.10, mat: mats.skin, capBottom: false });
  parts.neck.position.y = 0.015;
  B.neck.add(parts.neck);

  // --- arms ------------------------------------------------------------------
  for (const side of ['L', 'R']) {
    const upper = limbSegment({ rTop: 0.058 * bulk, rBottom: 0.047, length: H.upperArmLen, mat: mats.arm });
    B[`upperArm${side}`].add(upper);
    parts[`upperArm${side}`] = upper;

    const fore = limbSegment({ rTop: 0.046, rBottom: 0.036, length: H.forearmLen, mat: mats.forearm });
    B[`forearm${side}`].add(fore);
    parts[`forearm${side}`] = fore;

    // Hand: mitten palm + thumb wedge; detailed fingers only on the viewmodel.
    const hand = new THREE.Group();
    const palm = mesh(bevelBox(0.075, 0.10, 0.032, 0.01), mats.hand);
    palm.position.y = -0.05;
    hand.add(palm);
    const thumb = mesh(bevelBox(0.026, 0.05, 0.026, 0.008), mats.hand);
    thumb.position.set(side === 'L' ? 0.045 : -0.045, -0.03, -0.012);
    thumb.rotation.z = side === 'L' ? -0.5 : 0.5;
    hand.add(thumb);
    B[`hand${side}`].add(hand);
    parts[`hand${side}`] = hand;
  }

  // --- legs ------------------------------------------------------------------
  for (const side of ['L', 'R']) {
    const thigh = limbSegment({ rTop: 0.085 * bulk, rBottom: 0.062, length: H.thighLen, mat: mats.thigh });
    B[`thigh${side}`].add(thigh);
    parts[`thigh${side}`] = thigh;

    const shin = limbSegment({ rTop: 0.06, rBottom: 0.048, length: H.shinLen, mat: mats.shin });
    B[`shin${side}`].add(shin);
    parts[`shin${side}`] = shin;

    // Boot: heel block + toe block, sole slightly proud.
    const foot = new THREE.Group();
    const heel = mesh(bevelBox(0.095, 0.085, 0.115, 0.012), mats.boot);
    heel.position.set(0, -0.038, 0.01);
    foot.add(heel);
    const toe = mesh(bevelBox(0.088, 0.062, 0.15, 0.012), mats.boot);
    toe.position.set(0, -0.049, -0.1);
    foot.add(toe);
    B[`foot${side}`].add(foot);
    parts[`foot${side}`] = foot;
  }

  return { parts };
}

/**
 * Simplified far-LOD body: one mesh per major mass, no caps or details.
 * Returned as a group parented to the same bones (visibility-swapped by
 * `setLOD`), so animation still reads at distance.
 */
export function buildSimplifiedBody(rig, mats, bulk = 1) {
  const H = HUMAN;
  const B = rig.bones;
  const meshes = [];
  const add = (bone, geo, mat, y = 0) => {
    const m = mesh(geo, mat, { cast: false });
    m.position.y = y;
    m.userData.lodSimple = true;
    bone.add(m);
    meshes.push(m);
    return m;
  };
  add(B.hips, roundedBlock(0.31 * bulk, 0.24, 0.21 * bulk, 0.05, 1), mats.hips, -0.02);
  add(B.chest, roundedBlock(0.36 * bulk, 0.42, 0.24 * bulk, 0.065, 1), mats.torso, 0.04);
  add(B.head, sphere(0.105, 8), mats.skin, 0.09);
  for (const side of ['L', 'R']) {
    add(B[`upperArm${side}`], cyl(0.055, 0.042, H.upperArmLen + H.forearmLen, 6), mats.arm, -(H.upperArmLen + H.forearmLen) / 2);
    add(B[`thigh${side}`], cyl(0.08, 0.05, H.thighLen + H.shinLen, 6), mats.thigh, -(H.thighLen + H.shinLen) / 2);
    add(B[`foot${side}`], bevelBox(0.09, 0.07, 0.24, 0.015), mats.boot, -0.045);
  }
  for (const m of meshes) m.visible = false;
  return meshes;
}

// ---------------------------------------------------------------------------
// Per-bone draw-call batching
// ---------------------------------------------------------------------------

/**
 * Give every geometry the same attribute layout so mergeGeometries accepts
 * them (local reimplementation of the approach in core/optimize.js — that
 * file belongs to the lead and is not imported from here).
 */
export function harmonise(geo) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const count = geo.attributes.position.count;
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!geo.attributes.uv1) {
    geo.setAttribute('uv1', new THREE.BufferAttribute(geo.attributes.uv.array.slice(), 2));
  }
  for (const name of Object.keys(geo.attributes)) {
    if (!['position', 'normal', 'uv', 'uv1'].includes(name)) geo.deleteAttribute(name);
  }
  if (geo.morphAttributes) geo.morphAttributes = {};
  if (!geo.index) {
    const idx = new Uint32Array(count);
    for (let i = 0; i < count; i++) idx[i] = i;
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return geo;
}

/**
 * Collapse a segmented character (~100 readable primitives) into a handful of
 * rigidly-skinned meshes — one per material — while the rig keeps animating.
 *
 * Every source mesh's transform is baked at bind pose and each of its vertices
 * is weighted 100 % to that mesh's nearest ancestor bone, so joint rotation
 * produces exactly the same result as the old parent/child hierarchy while a
 * whole character draws in ~unique-material count calls instead of one call
 * per primitive.
 *
 * Skipped (left as individual meshes on their bones): transparent materials
 * (insignia patches, badges), anything flagged `userData.noMerge` (e.g. the
 * hostage zip-tie whose visibility toggles independently), and multi-material
 * meshes.
 *
 * @param {SkeletonRig} rig
 * @returns {{detailMeshes:THREE.Mesh[], simpleMeshes:THREE.Mesh[]}} rebuilt
 *   LOD lists (detail = visible set, simple = far-LOD set flagged with
 *   `userData.lodSimple`) referencing the merged meshes.
 */
export function mergeRigMeshesPerBone(rig) {
  const root = rig.root;
  root.updateWorldMatrix(true, true);

  const isBone = (o) => typeof o.name === 'string' && o.name.startsWith('bone:');
  const nearestBone = (o) => {
    let cur = o.parent;
    while (cur && cur !== root) {
      if (isBone(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  };

  // Ordered bone list for the shared skeleton (bind pose = current pose).
  const bones = [];
  root.traverse((o) => { if (isBone(o)) bones.push(o); });
  const boneIndexOf = new Map(bones.map((b, i) => [b, i]));

  /** @type {Map<string, {material:THREE.Material, simple:boolean, cast:boolean, geos:THREE.BufferGeometry[], sources:THREE.Mesh[]}>} */
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noMerge) return;
    if (!o.material || Array.isArray(o.material) || o.material.transparent) return;
    const bone = nearestBone(o);
    if (!bone) return;
    const simple = !!o.userData.lodSimple;
    const key = `${o.material.uuid}|${simple ? 1 : 0}|${o.castShadow ? 1 : 0}`;
    if (!buckets.has(key)) {
      buckets.set(key, { material: o.material, simple, cast: o.castShadow, geos: [], sources: [] });
    }
    const b = buckets.get(key);
    // Bake the bind-pose world transform. Geometries are cached and shared
    // (map/kit.js), so clone before transforming.
    const g = harmonise(o.geometry.clone());
    g.applyMatrix4(o.matrixWorld);
    // Rigid skinning: every vertex follows this mesh's bone exactly.
    const bi = boneIndexOf.get(bone);
    const count = g.attributes.position.count;
    const si = new Uint16Array(count * 4);
    const sw = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    b.geos.push(g);
    b.sources.push(o);
  });

  // One skeleton per character, shared by all merged meshes. Bone inverses are
  // computed from the current (bind) pose.
  const skeleton = new THREE.Skeleton(bones);
  const bindMatrix = new THREE.Matrix4(); // geometry is baked in bind-pose world space

  for (const b of buckets.values()) {
    let merged = null;
    try { merged = mergeGeometries(b.geos, false); } catch { merged = null; }
    if (!merged) {
      // Leave the sources untouched rather than dropping body parts.
      for (const g of b.geos) g.dispose();
      continue;
    }
    // Generous fixed bounds: animation never moves the body far from the
    // bind-pose envelope, and this keeps frustum culling working per character.
    merged.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.9);
    const m = new THREE.SkinnedMesh(merged, b.material);
    m.name = 'merged';
    m.castShadow = b.cast;
    m.receiveShadow = false;
    if (b.simple) {
      m.userData.lodSimple = true;
      m.visible = false;
    }
    root.add(m);
    m.bind(skeleton, bindMatrix);
    for (const src of b.sources) {
      src.removeFromParent();
      // Cached kit geometry stays alive for other users; only detach.
    }
    for (const g of b.geos) g.dispose();
  }

  // Rebuild the LOD lists from what actually remains in the hierarchy so
  // setLOD toggles live meshes, not the detached originals.
  const detailMeshes = [];
  const simpleMeshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    (o.userData.lodSimple ? simpleMeshes : detailMeshes).push(o);
  });
  return { detailMeshes, simpleMeshes };
}
