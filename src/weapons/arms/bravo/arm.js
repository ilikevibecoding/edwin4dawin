import * as THREE from 'three';
import { makeWeightSolver } from './hand.js';

/**
 * Forearm tube: glove cuff (with the grey trim ring painted by the cuff texture), bare forearm skin, the rolled-up
 * sleeve edge and the desert-camo sleeve continuing past the elbow up the (mostly off-screen) upper arm.
 * One indexed geometry with three material groups, skinned to the forearm/upper-arm bones so it bends at the
 * wrist and elbow. Built along -Y in hand space (s = distance down the arm from the wrist).
 */

export const ARM_GROUPS = { cuff: 0, skin: 1, sleeve: 2 };

const CUFF_END = 0.044;
const SKIN_END = 0.098;
const ROLL_END = 0.142;
const ARM_END = 0.58;

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function sstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Elliptical radii (rx = width, rz = thickness) of the arm at distance s from the wrist, before wrinkles. */
function radii(s, out) {
  let rx;
  let rz;
  if (s < CUFF_END) {
    // cuff over the wrist, slight flare toward the forearm, rolled top edge
    const t = sstep(-0.01, CUFF_END, s);
    rx = lerp(0.0338, 0.0368, t);
    rz = lerp(0.0258, 0.0292, t);
    const lip = Math.exp(-(((s + 0.004) / 0.004) ** 2)) * 0.001;
    rx += lip;
    rz += lip;
  } else if (s < SKIN_END) {
    // bare forearm: emerges from inside the cuff, thickens toward the belly of the forearm
    const t = sstep(CUFF_END, SKIN_END, s);
    rx = lerp(0.0318, 0.0415, t);
    rz = lerp(0.0252, 0.0355, t);
  } else if (s < ROLL_END) {
    // rolled sleeve: fat torus-like roll
    const t = (s - SKIN_END) / (ROLL_END - SKIN_END);
    const bump = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) ** 0.8;
    rx = 0.0425 + 0.0125 * bump;
    rz = 0.0365 + 0.0125 * bump;
  } else {
    // sleeve to the elbow and up the upper arm
    const t = sstep(ROLL_END, 0.27, s);
    rx = lerp(0.0485, 0.047, t) + 0.006 * sstep(0.3, 0.5, s);
    rz = lerp(0.0425, 0.0435, t) + 0.006 * sstep(0.3, 0.5, s);
  }
  out[0] = rx;
  out[1] = rz;
}

/** Wrinkle / fold displacement (metres) for fabric regions. */
function wrinkle(s, ang) {
  if (s < ROLL_END - 0.006) {
    if (s > SKIN_END) {
      // irregular roll
      return 0.0012 * Math.sin(ang * 5 + s * 90) + 0.0008 * Math.sin(ang * 9 - 1.3 + s * 40);
    }
    return 0;
  }
  const f = sstep(ROLL_END - 0.006, ROLL_END + 0.012, s);
  // long diagonal folds + finer crumples, damped near the elbow crease
  const a = Math.sin(ang * 3 + s * 55 + 0.4) * Math.sin(s * 23 + ang * 0.7);
  const b = Math.sin(ang * 7 - s * 120 + 1.1) * 0.5;
  const c = Math.sin(ang * 13 + s * 210) * 0.25;
  return f * 0.0028 * (a + b + c);
}

const _r = [0, 0];
function surfacePoint(s, ang, out) {
  radii(s, _r);
  const w = wrinkle(s, ang);
  const rx = _r[0] + w;
  const rz = _r[1] + w;
  out.x = Math.cos(ang) * rx;
  out.y = -s;
  out.z = Math.sin(ang) * rz;
  return out;
}

export function buildArmGeometry(def) {
  const stations = [];
  for (let s = -0.012; s < CUFF_END; s += 0.006) stations.push(s);
  stations.push(CUFF_END);
  for (let s = CUFF_END + 0.008; s < SKIN_END; s += 0.008) stations.push(s);
  stations.push(SKIN_END);
  for (let s = SKIN_END + 0.004; s < ROLL_END; s += 0.004) stations.push(s);
  stations.push(ROLL_END);
  for (let s = ROLL_END + 0.008; s < 0.3; s += 0.008) stations.push(s);
  for (let s = 0.3; s <= ARM_END + 1e-6; s += 0.02) stations.push(s);

  const SEG = 32;
  const cols = SEG + 1;
  const n = stations.length * cols;
  const pos = new Float32Array(n * 3);
  const nrm = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  const solve = makeWeightSolver(def);
  const idx4 = [0, 0, 0, 0];
  const w4 = [0, 0, 0, 0];
  const p = new THREE.Vector3();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const pc = new THREE.Vector3();
  const pd = new THREE.Vector3();
  const tS = new THREE.Vector3();
  const tA = new THREE.Vector3();
  const nv = new THREE.Vector3();

  for (let ri = 0; ri < stations.length; ri++) {
    const s = stations[ri];
    radii(s, _r);
    const meanR = (_r[0] + _r[1]) * 0.5;
    for (let c = 0; c < cols; c++) {
      const ang = (c / SEG) * Math.PI * 2;
      surfacePoint(s, ang, p);
      const i = ri * cols + c;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      // normal from finite differences (includes wrinkles and the taper)
      surfacePoint(s + 0.002, ang, pa);
      surfacePoint(s - 0.002, ang, pb);
      surfacePoint(s, ang + 0.05, pc);
      surfacePoint(s, ang - 0.05, pd);
      tS.subVectors(pa, pb);
      tA.subVectors(pc, pd);
      nv.crossVectors(tA, tS).normalize();
      if (nv.x * p.x + nv.z * p.z < 0) nv.negate();
      nrm[i * 3] = nv.x;
      nrm[i * 3 + 1] = nv.y;
      nrm[i * 3 + 2] = nv.z;
      if (s < CUFF_END) {
        // cuff texture is laid out once around and once along the cuff
        uv[i * 2] = c / SEG;
        uv[i * 2 + 1] = (s + 0.012) / (CUFF_END + 0.012);
      } else {
        uv[i * 2] = ang * meanR;
        uv[i * 2 + 1] = s;
      }
      solve(p.x, p.y, p.z, idx4, w4, true);
      for (let k = 0; k < 4; k++) {
        si[i * 4 + k] = idx4[k];
        sw[i * 4 + k] = w4[k];
      }
    }
  }

  const indices = [];
  const groups = [[], [], []];
  for (let ri = 0; ri < stations.length - 1; ri++) {
    const s = stations[ri];
    const g = s < CUFF_END - 1e-6 ? 0 : s < SKIN_END - 1e-6 ? 1 : 2;
    for (let c = 0; c < SEG; c++) {
      const a = ri * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      // outward-facing winding (CCW seen from outside)
      groups[g].push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  let offset = 0;
  for (let g = 0; g < 3; g++) {
    for (let k = 0; k < groups[g].length; k++) indices.push(groups[g][k]);
    geo.addGroup(offset, groups[g].length, g);
    offset += groups[g].length;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}
