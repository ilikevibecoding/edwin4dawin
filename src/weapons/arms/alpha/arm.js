import * as THREE from 'three';

/**
 * Forearm + upper arm as one skinned tube: bare wrist skin emerging from the glove cuff, a thick rolled
 * sleeve cuff, then the desert-camo sleeve with geometric drapery folds up to the shoulder anchor.
 *
 * Rest pose runs along +Y: wrist crease at y = 0, elbow at y = L2, shoulder at y = L2 + L1.
 * Local +X = ulnar (little-finger) side of the hand, local +Z = dorsal (back of the hand).
 * Bones: 0 = wrist (follows the hand), 1 = forearm (wrist → elbow), 2 = upper arm (elbow → shoulder).
 */

export const FOREARM_LEN = 0.27;
export const UPPERARM_LEN = 0.30;
const SKIN_END = 0.08; // where the rolled sleeve starts (bare forearm from the glove cuff up to here)
const RADIAL = 48;

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** Elliptical radius profile [rx, rz] along the arm. */
function profile(y) {
  // key points: [y, rx, rz]
  const keys = [
    [-0.02, 0.029, 0.02],
    [0.02, 0.0305, 0.021],
    [0.05, 0.033, 0.0235],
    [0.07, 0.036, 0.027],
    [0.08, 0.04, 0.03],
    [0.093, 0.054, 0.045], // sleeve roll
    [0.105, 0.057, 0.048],
    [0.117, 0.055, 0.046],
    [0.127, 0.05, 0.041],
    [0.142, 0.047, 0.038],
    [0.17, 0.048, 0.039],
    [0.235, 0.047, 0.039],
    [0.27, 0.044, 0.042],
    [0.31, 0.046, 0.046],
    [0.42, 0.052, 0.05],
    [0.57, 0.056, 0.054],
  ];
  if (y <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (y <= b[0]) {
      const t = smoothstep(a[0], b[0], y);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    }
  }
  const k = keys[keys.length - 1];
  return [k[1], k[2]];
}

/** Cloth folds (metres of radial displacement) for the camo sleeve. */
function folds(y, theta, side) {
  if (y < SKIN_END) return 0;
  const roll = smoothstep(SKIN_END, SKIN_END + 0.017, y) * (1 - smoothstep(SKIN_END + 0.037, SKIN_END + 0.057, y));
  // rolled cuff: two fabric turns as ridges around the arm
  const rollRidges = roll * (0.0025 * Math.sin(((y - SKIN_END) * Math.PI * 2) / 0.024) + 0.0015 * Math.sin(theta * 7 + y * 40));
  const sleeve = smoothstep(SKIN_END + 0.047, SKIN_END + 0.077, y);
  const bunch = 1 + 1.6 * smoothstep(0.2, 0.27, y) * (1 - smoothstep(0.3, 0.36, y)); // bunching at the elbow
  const yy = (y - SKIN_END - 0.047) * 10;
  let f = 0.0032 * Math.sin(theta * 4 + yy * 1.9 + side) + 0.0022 * Math.sin(theta * 7 - yy * 2.6 + 1.7) + 0.0014 * Math.sin(theta * 11 + yy * 4.1 + 0.6);
  // sharpen the folds: ridges are narrower than the valleys
  f = f > 0 ? f * 0.7 : f * 1.15;
  return rollRidges + sleeve * bunch * f;
}

/**
 * Build the skinned arm mesh. `materials` = { skin, camo }. side = -1 left, +1 right (fold pattern seed).
 */
export function buildArm(materials, side) {
  const rings = [];
  // dense rings where visible (wrist → mid forearm), sparser toward the shoulder
  for (let y = -0.015; y < SKIN_END; y += 0.008) rings.push(y);
  for (let y = SKIN_END; y < 0.2; y += 0.0045) rings.push(y);
  for (let y = 0.2; y < FOREARM_LEN + 0.06; y += 0.009) rings.push(y);
  for (let y = FOREARM_LEN + 0.06; y <= FOREARM_LEN + UPPERARM_LEN + 0.001; y += 0.03) rings.push(y);

  const nRings = rings.length;
  const vcount = nRings * (RADIAL + 1);
  const pos = new Float32Array(vcount * 3);
  const uv = new Float32Array(vcount * 2);
  const skinIdx = new Float32Array(vcount * 4);
  const skinW = new Float32Array(vcount * 4);

  let vi = 0;
  for (let r = 0; r < nRings; r++) {
    const y = rings[r];
    const [rx, rz] = profile(y);
    for (let s = 0; s <= RADIAL; s++) {
      const theta = (s / RADIAL) * Math.PI * 2;
      const f = folds(y, theta, side);
      const cx = Math.cos(theta);
      const sz = Math.sin(theta);
      pos[vi * 3] = cx * (rx + f);
      pos[vi * 3 + 1] = y;
      pos[vi * 3 + 2] = sz * (rz + f);
      const camo = y >= SKIN_END;
      const circ = Math.PI * (rx + rz);
      if (camo) {
        uv[vi * 2] = (s / RADIAL) * (circ / 0.18);
        uv[vi * 2 + 1] = y / 0.18;
      } else {
        uv[vi * 2] = (s / RADIAL) * (circ / 0.06);
        uv[vi * 2 + 1] = y / 0.06;
      }
      // skin weights
      const w0 = 1 - smoothstep(0.012, 0.08, y);
      const w2 = smoothstep(FOREARM_LEN - 0.05, FOREARM_LEN + 0.05, y);
      const w1 = Math.max(0, 1 - w0 - w2);
      skinIdx.set([0, 1, 2, 0], vi * 4);
      skinW.set([w0, w1, w2, 0], vi * 4);
      vi++;
    }
  }

  const skinTris = [];
  const camoTris = [];
  for (let r = 0; r < nRings - 1; r++) {
    const camo = rings[r] >= SKIN_END - 1e-6;
    const out = camo ? camoTris : skinTris;
    for (let s = 0; s < RADIAL; s++) {
      const a = r * (RADIAL + 1) + s;
      const b = a + 1;
      const c = a + RADIAL + 1;
      const d = c + 1;
      out.push(a, c, b, b, c, d);
    }
  }
  const index = new Uint16Array(skinTris.length + camoTris.length);
  index.set(skinTris, 0);
  index.set(camoTris, skinTris.length);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinW, 4));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.addGroup(0, skinTris.length, 0);
  geo.addGroup(skinTris.length, camoTris.length, 1);
  geo.computeVertexNormals();
  // the seam column (s = 0 and s = RADIAL) shares positions: average their normals so the seam is invisible
  const nor = geo.attributes.normal;
  for (let r = 0; r < nRings; r++) {
    const a = r * (RADIAL + 1);
    const b = a + RADIAL;
    const nx = nor.getX(a) + nor.getX(b);
    const ny = nor.getY(a) + nor.getY(b);
    const nz = nor.getZ(a) + nor.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(a, nx / l, ny / l, nz / l);
    nor.setXYZ(b, nx / l, ny / l, nz / l);
  }
  geo.computeBoundingSphere();

  const bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  bones[0].name = 'wrist';
  bones[1].name = 'forearm';
  bones[2].name = 'upperarm';
  bones[2].position.set(0, FOREARM_LEN, 0);

  const mesh = new THREE.SkinnedMesh(geo, [materials.skin, materials.camo]);
  mesh.name = side < 0 ? 'ArmLeft' : 'ArmRight';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, bones, triangles: index.length / 3 };
}

const _axis = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Two-bone IK: given shoulder S, wrist W and a pole direction, returns the elbow position (writes `out`).
 * Pole picks which way the elbow points. Slightly over-reaching just straightens the arm.
 */
export function solveElbow(S, W, pole, out) {
  _axis.subVectors(W, S);
  let d = _axis.length();
  if (d < 1e-5) {
    out.copy(S).addScaledVector(pole, -UPPERARM_LEN);
    return out;
  }
  _axis.multiplyScalar(1 / d);
  // The shoulder anchors sit behind the camera, farther than a real arm reaches. A first-person arm must
  // never read as a straight rod, so the effective shoulder slides toward the wrist and the elbow keeps
  // a ~115° bend; the upper arm is off-screen anyway.
  const reach = (UPPERARM_LEN + FOREARM_LEN) * 0.86;
  if (d > reach) d = reach;
  const a = (UPPERARM_LEN * UPPERARM_LEN - FOREARM_LEN * FOREARM_LEN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, UPPERARM_LEN * UPPERARM_LEN - a * a));
  _perp.copy(pole).addScaledVector(_axis, -pole.dot(_axis));
  if (_perp.lengthSq() < 1e-8) _perp.set(0, -1, 0).addScaledVector(_axis, -_axis.y);
  _perp.normalize();
  // measured from the wrist so the visible forearm is always exactly FOREARM_LEN long
  out.copy(W).addScaledVector(_axis, a - d).addScaledVector(_perp, h);
  return out;
}

/** Quaternion whose local +Y maps to `dir` and local +Z is as close as possible to `zRef`. */
export function basisQuat(dir, zRef, outQ) {
  _y.copy(dir).normalize();
  _z.copy(zRef).addScaledVector(_y, -zRef.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(1, 0, 0).addScaledVector(_y, -_y.x);
  _z.normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  return outQ.setFromRotationMatrix(_m);
}
