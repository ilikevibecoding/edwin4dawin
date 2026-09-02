import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Procedural tactical accessories for the Soldier.glb "vanguard" mesh: helmet rails + NVG shroud +
 * counterweight + headset cups, a curved plate-carrier front panel with three mag pouches, an admin
 * pouch with a small team patch, a chest radio with antenna, a drop-leg holster, hard-shell knee pads
 * and a team armband.
 *
 * Everything is authored in the body mesh's *bind space* (centimetres, Z up, +Y forward, +X = the
 * soldier's right — the T-pose the glTF skin was bound in) and merged into ONE geometry whose vertices
 * carry skinIndex/skinWeight for the bone they ride on (torso pieces blend between two spine bones so
 * they bend with the chest). Rendered as a SkinnedMesh sharing the body's skeleton: one draw call,
 * ≈2k triangles, follows every animation / procedural pose for free.
 *
 * Bind-pose landmarks (from the skin's inverse bind matrices):
 *   Head (0,-5.5,156.9)  Spine2 (0,-3.7,139.3)  Spine1 (0,-1.9,126.7)  Spine (0,-0.2,115.6)
 *   LeftArm (-20.9,-5.7,147.9)  RightUpLeg (9.8,-0.1,100.9)  LeftLeg (-9.9,1.5,57.5)  RightLeg (9.9,2,57.6)
 *   helmet: z 152–183, front y≈9–12, back y≈-13, width ±9.9   chest front y≈14.8, shoulders ±23
 */

const BONE = {
  head: 'mixamorigHead',
  spine: 'mixamorigSpine',
  spine1: 'mixamorigSpine1',
  spine2: 'mixamorigSpine2',
  lArm: 'mixamorigLeftArm',
  rUpLeg: 'mixamorigRightUpLeg',
  lLeg: 'mixamorigLeftLeg',
  rLeg: 'mixamorigRightLeg',
};

// sRGB palette (converted to linear when written into the vertex colours).
const COL = {
  carrier: 0x394232, // ranger green cordura (a step lighter than the graphite chest so the vest reads)
  carrierDark: 0x272d23,
  pouch: 0x21242a, // black nylon
  magazine: 0x2a2d31, // polymer magazine tops
  strap: 0x4a4d45, // lighter bungee / webbing edge
  webbing: 0x1b1d1f,
  radio: 0x171a1c,
  antenna: 0x0f1113,
  admin: 0x2e3529,
  patch: 0x6e1c17, // muted brick red team patch
  armband: 0x6a1d17,
  helmetGear: 0x1e2123,
  counterweight: 0x2a3026,
  kneePad: 0x23262b,
  kneeCap: 0x2b2f34,
  holster: 0x1b1d20,
  grip: 0x151719,
};

const _c = new THREE.Color();
const _n = new THREE.Vector3();

/* ------------------------------------------------------------------------------------------ primitives */

/** Box with sizes (w along X, d along Y, h along Z) — optionally rounded — placed by a transform. */
function box(w, d, h, opts = {}) {
  const { r = 0, seg = 1 } = opts;
  const g = r > 0 ? new RoundedBoxGeometry(w, d, h, seg, Math.min(r, w / 2, d / 2, h / 2)) : new THREE.BoxGeometry(w, d, h);
  return place(g, opts);
}

/** Cylinder along Z (r, length) — set `axis` to 'x'/'y' to orient it. */
function cyl(r, len, opts = {}) {
  const { segs = 10, open = false } = opts;
  const g = new THREE.CylinderGeometry(r, r, len, segs, 1, open);
  g.rotateX(Math.PI / 2); // Y → Z
  if (opts.axis === 'x') g.rotateY(Math.PI / 2);
  else if (opts.axis === 'y') g.rotateX(Math.PI / 2);
  return place(g, opts);
}

/** Open elliptical band (strap) around the Z axis: radii rx/ry, height h. `axis` re-orients it. */
function band(rx, ry, h, opts = {}) {
  const g = new THREE.CylinderGeometry(1, 1, h, opts.segs || 16, 1, true);
  g.rotateX(Math.PI / 2); // axis → Z, radial plane XY
  g.scale(rx, ry, 1);
  if (opts.axis === 'x') g.rotateY(Math.PI / 2); // axis → X, radial plane YZ (x-scale becomes z)
  else if (opts.axis === 'y') g.rotateX(Math.PI / 2);
  return place(g, opts);
}

/**
 * Curved solid slab: an arc of a thick-walled cylinder (axis Z, arc centred on +Y), radii rIn..rOut,
 * half-angle `half`, spanning z0..z1. Built with outward normals (front, back, rim, side caps).
 */
function curvedSlab({ rIn, rOut, half, z0, z1, segs = 12 }, opts = {}) {
  const parts = [];
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  // Cylinder theta=0 → +Z; after rotateX(90°) that maps to -Y, so centre the arc on theta = π.
  const front = new THREE.CylinderGeometry(rOut, rOut, len, segs, 1, true, Math.PI - half, half * 2);
  front.rotateX(Math.PI / 2);
  front.translate(0, 0, zc);
  parts.push(front);
  const back = new THREE.CylinderGeometry(rIn, rIn, len, segs, 1, true, Math.PI - half, half * 2);
  back.rotateX(Math.PI / 2);
  back.translate(0, 0, zc);
  parts.push(flip(back));
  // Rims (RingGeometry: theta from +X toward +Y) — centre on +Y.
  const top = new THREE.RingGeometry(rIn, rOut, segs, 1, Math.PI / 2 - half, half * 2);
  top.translate(0, 0, z1);
  parts.push(top);
  const bottom = new THREE.RingGeometry(rIn, rOut, segs, 1, Math.PI / 2 - half, half * 2);
  bottom.translate(0, 0, z0);
  parts.push(flip(bottom));
  // Side caps.
  for (const sgn of [-1, 1]) {
    const phi = Math.PI / 2 + sgn * half;
    const dir = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0);
    const nrm = new THREE.Vector3(-Math.sin(phi), Math.cos(phi), 0).multiplyScalar(sgn); // tangent, pointing away from the arc
    const cap = new THREE.PlaneGeometry(rOut - rIn, len);
    // Plane lies in XY facing +Z: map local X → radial, Y → world Z, Z → nrm. Keep the basis
    // right-handed (X × Y = Z) or the winding mirrors and the cap gets back-face culled.
    const xAxis = dir.clone().multiplyScalar(sgn < 0 ? 1 : -1);
    const m = new THREE.Matrix4().makeBasis(xAxis, new THREE.Vector3(0, 0, 1), nrm);
    cap.applyMatrix4(m);
    cap.translate(dir.x * (rIn + rOut) * 0.5, dir.y * (rIn + rOut) * 0.5, zc);
    parts.push(cap);
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
  return place(g, opts);
}

/** Reverse winding + normals (turns an outward shell into an inward-facing one). */
function flip(g) {
  const idx = g.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, b);
    }
  } else {
    // Swap vertices 1 and 2 of every triangle across all attributes.
    for (const attr of Object.values(g.attributes)) {
      const size = attr.itemSize;
      const arr = attr.array;
      for (let i = 0; i < attr.count; i += 3) {
        for (let k = 0; k < size; k++) {
          const a = (i + 1) * size + k;
          const b = (i + 2) * size + k;
          const t = arr[a];
          arr[a] = arr[b];
          arr[b] = t;
        }
      }
    }
  }
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

/** Apply { rx, ry, rz (radians, applied X→Y→Z), at:[x,y,z] } then tag with colour + skin binding. */
function place(g, { rx = 0, ry = 0, rz = 0, at = [0, 0, 0], color = 0x202020, bone, blend = null, shade = 1 } = {}) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(at[0], at[1], at[2]);
  g.userData.color = color;
  g.userData.bone = bone;
  g.userData.blend = blend; // { boneB, axis: 'z', from, to } → weight ramps from `bone` to boneB
  g.userData.shade = shade;
  return g;
}

/* ------------------------------------------------------------------------------------------ assembly */

function buildParts() {
  const P = [];
  const head = { bone: BONE.head };
  const chest = { bone: BONE.spine1, blend: { boneB: BONE.spine2, axis: 'z', from: 124, to: 142 } };
  const belly = { bone: BONE.spine, blend: { boneB: BONE.spine1, axis: 'z', from: 114, to: 128 } };

  // --- Helmet furniture ----------------------------------------------------------------------
  P.push(box(5.2, 2.6, 3.6, { r: 0.5, at: [0, 10.3, 176.3], color: COL.helmetGear, ...head })); // NVG shroud
  P.push(box(2.4, 1.4, 1.6, { at: [0, 11.6, 178.4], color: COL.antenna, ...head })); // shroud latch
  for (const s of [-1, 1]) {
    P.push(box(1.4, 8, 1.6, { at: [s * 10.0, -2.5, 168], color: COL.helmetGear, ...head })); // side rail
    P.push(cyl(3.4, 3.0, { axis: 'x', segs: 12, at: [s * 8.6, -3.0, 161.5], color: COL.webbing, ...head })); // headset cup
  }
  P.push(box(9, 3.4, 4.6, { r: 0.8, at: [0, -14.3, 170], color: COL.counterweight, ...head })); // counterweight pouch
  P.push(box(2.4, 1.2, 1.6, { at: [0, -12.0, 176.5], color: COL.antenna, ...head })); // IR strobe

  // --- Plate carrier (curved front panel following the chest) ----------------------------------
  const rIn = 30.6;
  const rOut = 34.0;
  const cy = 15.6 - rIn; // back face at y = 15.6 on the centre line (chest surface ≈ 14.8)
  P.push(curvedSlab({ rIn, rOut, half: THREE.MathUtils.degToRad(25), z0: 121, z1: 147, segs: 14 }, { at: [0, cy, 0], color: COL.carrier, ...chest }));
  // Mag pouches ×3 (open-top shingle with bungee retention), seated on the curve with visible gaps.
  for (const [i, x] of [-8.9, 0, 8.9].entries()) {
    const ang = Math.asin(x / rOut);
    const yFront = cy + Math.sqrt(rOut * rOut - x * x);
    const rz = -ang;
    const h = i === 1 ? 13.5 : 12.5;
    const zc = 119 + h / 2;
    const nx = Math.sin(ang);
    const ny = Math.cos(ang);
    P.push(box(6.8, 4.4, h, { r: 1.0, rz, at: [x + nx * 2.2, yFront + ny * 2.2, zc], color: COL.pouch, ...belly }));
    P.push(box(5.2, 3.2, 2.4, { r: 0.6, rz, at: [x + nx * 2.4, yFront + ny * 2.4, zc + h / 2 + 0.8], color: COL.magazine, ...belly })); // magazine top
    P.push(box(7.2, 0.7, 1.4, { rz, at: [x + nx * 4.8, yFront + ny * 4.8, zc + 1.5], color: COL.strap, ...belly })); // bungee
  }
  // Admin pouch + team patch (upper centre).
  P.push(box(12, 2.2, 5.5, { r: 0.6, at: [1.5, cy + rOut + 1.1, 141.5], color: COL.admin, ...chest }));
  P.push(box(4.6, 0.5, 3.0, { at: [1.5, cy + rOut + 2.35, 141.5], color: COL.patch, ...chest }));
  // MOLLE webbing rows across the panel (thin strips following the curve).
  for (const z of [136.5, 144.5]) {
    for (const x of [-9.5, 9.5]) {
      if (z < 140 && x > 0) continue; // the radio / admin pouch cover this spot
      const ang = Math.asin(x / rOut);
      const yFront = cy + Math.sqrt(rOut * rOut - x * x);
      P.push(box(7.5, 0.6, 1.8, { rz: -ang, at: [x + Math.sin(ang) * 0.3, yFront + Math.cos(ang) * 0.3, z], color: COL.carrierDark, ...chest }));
    }
  }
  // Radio on the left strap (soldier's left = -X) with the antenna rising beside the shoulder.
  {
    const x = -13;
    const ang = Math.asin(x / rOut);
    const yFront = cy + Math.sqrt(rOut * rOut - x * x);
    P.push(box(6.2, 3.6, 11, { r: 0.7, rz: -ang, at: [x + Math.sin(ang) * 1.8, yFront + Math.cos(ang) * 1.8, 146], color: COL.radio, ...chest }));
    P.push(box(4.4, 1.0, 1.2, { rz: -ang, at: [x + Math.sin(ang) * 3.8, yFront + Math.cos(ang) * 3.8, 143], color: COL.antenna, ...chest })); // PTT / display
    P.push(cyl(0.45, 13, { segs: 6, at: [x - 1.6, yFront + 1.0, 158], color: COL.antenna, ...chest })); // antenna
    P.push(cyl(0.8, 1.4, { segs: 6, at: [x - 1.6, yFront + 1.0, 152.2], color: COL.antenna, ...chest })); // antenna base
  }

  // --- Drop-leg holster (right thigh, outer-front) ----------------------------------------------
  {
    // Mid-thigh cross-section ≈ ellipse centred (13.5, 1.5) with radii (7.5, 13.5) → straps at +1 cm.
    const leg = { bone: BONE.rUpLeg };
    const cx = 13.5;
    const cyT = 1.5;
    const a = THREE.MathUtils.degToRad(40);
    const rad = 13.4; // ellipse surface (≈10.1) + clearance + half thickness
    const at = [cx + Math.cos(a) * rad, cyT + Math.sin(a) * rad, 81];
    P.push(box(5, 8.5, 16, { r: 1.2, rz: a, at, color: COL.holster, ...leg }));
    P.push(box(2.6, 3.6, 5.2, { rx: 0.35, rz: a, at: [at[0] + Math.sin(a) * 2.4, at[1] - Math.cos(a) * 2.4, 91], color: COL.grip, ...leg })); // pistol grip
    P.push(band(8.6, 14.6, 2.2, { at: [cx, cyT, 74.5], color: COL.webbing, ...leg })); // thigh straps
    P.push(band(8.8, 14.8, 2.2, { at: [cx, cyT, 85], color: COL.webbing, ...leg }));
  }

  // --- Knee pads (hard shell + raised cap), axis X, riding the lower-leg bones -------------------
  for (const s of [-1, 1]) {
    const leg = { bone: s < 0 ? BONE.lLeg : BONE.rLeg };
    const at = [s * 10, 3.0, 55];
    // curvedSlab is authored around Z; rotate about Y so the axis becomes X (arc still faces +Y).
    P.push(curvedSlab({ rIn: 9.0, rOut: 10.6, half: THREE.MathUtils.degToRad(65), z0: -6.3, z1: 6.3, segs: 12 }, { ry: Math.PI / 2, at, color: COL.kneePad, ...leg }));
    P.push(curvedSlab({ rIn: 10.5, rOut: 11.5, half: THREE.MathUtils.degToRad(32), z0: -4.0, z1: 4.0, segs: 8 }, { ry: Math.PI / 2, at, color: COL.kneeCap, ...leg }));
  }

  // --- Team armband (left upper arm) --------------------------------------------------------------
  P.push(band(7.9, 7.9, 5, { axis: 'x', at: [-40.5, -5.3, 148.5], color: COL.armband, bone: BONE.lArm }));

  return P;
}

/* ------------------------------------------------------------------------------------------ skinning */

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Add skinIndex/skinWeight/color to a part, using the skeleton's bone order. */
function bindPart(g, boneIndex) {
  const n = g.attributes.position.count;
  const pos = g.attributes.position;
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const color = new Float32Array(n * 3);
  const a = boneIndex(g.userData.bone);
  const blend = g.userData.blend;
  const b = blend ? boneIndex(blend.boneB) : a;
  _c.set(g.userData.color).multiplyScalar(g.userData.shade);
  for (let i = 0; i < n; i++) {
    let wb = 0;
    if (blend && b !== a) {
      const v = blend.axis === 'z' ? pos.getZ(i) : blend.axis === 'y' ? pos.getY(i) : pos.getX(i);
      wb = smoothstep(blend.from, blend.to, v);
    }
    skinIndex[i * 4] = a;
    skinIndex[i * 4 + 1] = b;
    skinWeight[i * 4] = 1 - wb;
    skinWeight[i * 4 + 1] = wb;
    color[i * 3] = _c.r;
    color[i * 3 + 1] = _c.g;
    color[i * 3 + 2] = _c.b;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
  return g;
}

/** Tri-planar UVs (cm → tiles) so the nylon weave has a uniform scale on every face. */
function triplanarUVs(g, cmPerTile = 6) {
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    _n.set(Math.abs(nrm.getX(i)), Math.abs(nrm.getY(i)), Math.abs(nrm.getZ(i)));
    let u;
    let v;
    if (_n.z >= _n.x && _n.z >= _n.y) {
      u = pos.getX(i);
      v = pos.getY(i);
    } else if (_n.y >= _n.x) {
      u = pos.getX(i);
      v = pos.getZ(i);
    } else {
      u = pos.getY(i);
      v = pos.getZ(i);
    }
    uv[i * 2] = u / cmPerTile;
    uv[i * 2 + 1] = v / cmPerTile;
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
}

/**
 * Build the merged, skinned gear geometry for a skeleton (bone order = skin joint order).
 * Returns { geometry, triangles }.
 */
export function buildGearGeometry(skeleton) {
  const names = skeleton.bones.map((b) => b.name);
  const boneIndex = (name) => {
    const i = names.indexOf(name);
    if (i === -1) console.warn(`[enemies] gear: bone ${name} not found, falling back to root`);
    return Math.max(0, i);
  };
  const parts = buildParts().map((g) => {
    const ni = g.index ? g.toNonIndexed() : g; // toNonIndexed() does not carry userData over
    ni.userData = g.userData;
    return bindPart(ni, boneIndex);
  });
  const geometry = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  triplanarUVs(geometry);
  geometry.computeBoundingSphere();
  return { geometry, triangles: geometry.attributes.position.count / 3 };
}

/** Skinned gear mesh riding the body mesh's skeleton (same parent, transform and bind matrix). */
export function createGearMesh(bodyMesh, geometry, material) {
  const gear = new THREE.SkinnedMesh(geometry, material);
  gear.name = 'SoldierGear';
  gear.castShadow = true;
  gear.receiveShadow = true;
  gear.frustumCulled = false;
  gear.position.copy(bodyMesh.position);
  gear.quaternion.copy(bodyMesh.quaternion);
  gear.scale.copy(bodyMesh.scale);
  bodyMesh.parent.add(gear);
  gear.bindMode = bodyMesh.bindMode;
  gear.bind(bodyMesh.skeleton, bodyMesh.bindMatrix);
  return gear;
}
