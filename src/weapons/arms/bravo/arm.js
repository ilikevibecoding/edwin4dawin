import * as THREE from 'three';
import { makeWeightSolver } from './hand.js';

/**
 * Forearm tube: glove cuff (hook-and-loop closure strap with its tab over the back of the wrist, grey trim ring
 * painted by the cuff texture), bare forearm skin, the rolled-up sleeve (fold edge + two stacked folds) and the
 * desert-camo sleeve continuing past the elbow up the (mostly off-screen) upper arm.
 * One indexed geometry with three material groups, skinned to the forearm/upper-arm bones so it bends at the
 * wrist and elbow. Built along -Y in hand space (s = distance down the arm from the wrist). Rows at the group
 * boundaries are duplicated so each group gets its own UV layout (cuff / skin maps are unwrapped once around the
 * arm, the camo sleeve is tiled in metres).
 */

export const ARM_GROUPS = { cuff: 0, skin: 1, sleeve: 2 };

const TAU = Math.PI * 2;
const CUFF_START = -0.012;
const CUFF_END = 0.044;
// The sleeve is rolled well below the elbow so the camo roll enters the hip view at the bottom-left corner like the
// MW2019 reference (the virtual shoulder anchor keeps the forearm long on screen).
const SKIN_END = 0.086;
const ROLL_END = 0.128;
const ARM_END = 0.58;
const TAB_CENTRE = 0.24 * TAU; // angular position of the strap tab (matches the cuff texture; ≈ dorsal)

/** Physical size of the bare-skin band, so the unwrapped skin map comes out life-sized. */
export const SKIN_BAND = { length: SKIN_END - CUFF_END, circumference: TAU * 0.0365 };

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function sstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function gauss(x, w) {
  return Math.exp(-((x / w) ** 2));
}

/** Elliptical radii (rx = width, rz = thickness) of the arm at distance s from the wrist, before wrinkles. */
function radii(s, out) {
  let rx;
  let rz;
  if (s < CUFF_END) {
    // snug neoprene cuff over the wrist (≈ 2 mm over the skin), barely flaring toward the forearm, rolled top edge
    const t = sstep(-0.01, CUFF_END, s);
    rx = lerp(0.0334, 0.0346, t);
    rz = lerp(0.0256, 0.0272, t);
    const lip = gauss(s + 0.004, 0.004) * 0.0008;
    rx += lip;
    rz += lip;
  } else if (s < SKIN_END) {
    // bare forearm: emerges from inside the cuff, thickens toward the belly of the forearm
    const t = sstep(CUFF_END, SKIN_END + 0.03, s);
    rx = lerp(0.0316, 0.0412, t);
    rz = lerp(0.025, 0.0346, t);
  } else if (s < ROLL_END) {
    // rolled sleeve: a ledge where the rolled fabric ends over the skin, a fat outer fold, a crease, then a smaller
    // inner fold before the sleeve proper
    const t = (s - SKIN_END) / (ROLL_END - SKIN_END);
    const ledge = 0.0045 * sstep(0, 0.045, t);
    const folds = 0.011 * gauss(t - 0.4, 0.32) + 0.0048 * gauss(t - 0.86, 0.13) - 0.0022 * gauss(t - 0.67, 0.07);
    rx = 0.0384 + 0.004 * t + ledge + folds;
    rz = 0.0318 + 0.004 * t + ledge + folds;
  } else {
    // sleeve to the elbow and up the upper arm
    const t = sstep(ROLL_END, 0.27, s);
    rx = lerp(0.0484, 0.047, t) + 0.006 * sstep(0.3, 0.5, s);
    rz = lerp(0.0418, 0.0435, t) + 0.006 * sstep(0.3, 0.5, s);
  }
  out[0] = rx;
  out[1] = rz;
}

/** Radial displacement (metres) for fabric wrinkles / folds and the cuff's closure strap + tab. */
function displace(s, ang) {
  if (s < CUFF_END) {
    // hook-and-loop closure strap round the cuff (cuff texture v 0.22..0.66) and its free tab over the back of
    // the wrist; both stand proud of the neoprene cuff
    const v = (s - CUFF_START) / (CUFF_END - CUFF_START);
    const band = sstep(0.2, 0.23, v) * (1 - sstep(0.65, 0.68, v));
    if (band <= 0) return 0;
    let a = ang - TAB_CENTRE;
    a -= Math.round(a / TAU) * TAU;
    const tab = 1 - sstep(0.13 * TAU, 0.15 * TAU, Math.abs(a));
    return band * (0.0007 + 0.0011 * tab);
  }
  if (s < SKIN_END) return 0;
  if (s < ROLL_END - 0.004) {
    // irregular roll
    const t = sstep(SKIN_END, SKIN_END + 0.004, s);
    return t * (0.0012 * Math.sin(ang * 5 + s * 90) + 0.0008 * Math.sin(ang * 9 - 1.3 + s * 40));
  }
  const f = sstep(ROLL_END - 0.004, ROLL_END + 0.012, s);
  // long diagonal folds + finer crumples, damped near the elbow crease
  const a = Math.sin(ang * 3 + s * 55 + 0.4) * Math.sin(s * 23 + ang * 0.7);
  const b = Math.sin(ang * 7 - s * 120 + 1.1) * 0.5;
  const c = Math.sin(ang * 13 + s * 210) * 0.25;
  return f * 0.0028 * (a + b + c);
}

const _r = [0, 0];
function surfacePoint(s, ang, out) {
  radii(s, _r);
  const w = displace(s, ang);
  out.x = Math.cos(ang) * (_r[0] + w);
  out.y = -s;
  out.z = Math.sin(ang) * (_r[1] + w);
  return out;
}

function range(a, b, step) {
  const out = [];
  for (let s = a; s < b - 1e-6; s += step) out.push(s);
  return out;
}

export function buildArmGeometry(def) {
  // rows: { s, g } — boundary stations appear in both neighbouring groups
  const rows = [];
  const add = (g, list) => list.forEach((s) => rows.push({ s, g }));
  add(ARM_GROUPS.cuff, [-0.012, -0.008, -0.004, -0.0015, 0.0012, 0.005, 0.009, 0.013, 0.017, 0.021, 0.0242, 0.0268, 0.031, 0.036, 0.04, CUFF_END]);
  add(ARM_GROUPS.skin, [...range(CUFF_END, SKIN_END, (SKIN_END - CUFF_END) / 10), SKIN_END]);
  add(ARM_GROUPS.sleeve, [SKIN_END, SKIN_END + 0.0007, SKIN_END + 0.002, ...range(SKIN_END + 0.005, ROLL_END, 0.003), ROLL_END, ...range(ROLL_END + 0.008, 0.3, 0.008), ...range(0.3, ARM_END + 1e-6, 0.02)]);

  const SEG = 48;
  const cols = SEG + 1;
  const n = rows.length * cols;
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

  for (let ri = 0; ri < rows.length; ri++) {
    const { s, g } = rows[ri];
    radii(s, _r);
    const meanR = (_r[0] + _r[1]) * 0.5;
    for (let c = 0; c < cols; c++) {
      const ang = (c / SEG) * TAU;
      surfacePoint(s, ang, p);
      const i = ri * cols + c;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      // normal from finite differences (includes wrinkles, the strap and the taper)
      surfacePoint(s + 0.0006, ang, pa);
      surfacePoint(s - 0.0006, ang, pb);
      surfacePoint(s, ang + 0.02, pc);
      surfacePoint(s, ang - 0.02, pd);
      tS.subVectors(pa, pb);
      tA.subVectors(pc, pd);
      nv.crossVectors(tA, tS).normalize();
      if (nv.x * p.x + nv.z * p.z < 0) nv.negate();
      nrm[i * 3] = nv.x;
      nrm[i * 3 + 1] = nv.y;
      nrm[i * 3 + 2] = nv.z;
      if (g === ARM_GROUPS.cuff) {
        // cuff map: once around, once along the cuff
        uv[i * 2] = c / SEG;
        uv[i * 2 + 1] = (s - CUFF_START) / (CUFF_END - CUFF_START);
      } else if (g === ARM_GROUPS.skin) {
        // skin map: once around (0.25 = dorsal), cuff → sleeve roll along v
        uv[i * 2] = c / SEG;
        uv[i * 2 + 1] = (s - CUFF_END) / (SKIN_END - CUFF_END);
      } else {
        // tiled camo in metres
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

  const groups = [[], [], []];
  for (let ri = 0; ri < rows.length - 1; ri++) {
    if (rows[ri].g !== rows[ri + 1].g) continue;
    const g = rows[ri].g;
    for (let c = 0; c < SEG; c++) {
      const a = ri * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      // outward-facing winding (CCW seen from outside)
      groups[g].push(a, b, d, b, e, d);
    }
  }
  const indices = [];
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
