import * as THREE from 'three';
import { makeWeightSolver } from './hand.js';

/**
 * Forearm tube: glove cuff (tailored nylon wrist panel — it starts inside the glove's wrist so the glove's cut edge
 * is the only visible seam, flares slightly toward the forearm, carries a rectangular hook-and-loop tab over the
 * back of the wrist and a thin grey piping at its end), bare forearm skin, the rolled-up sleeve (fold edge + two
 * stacked folds) and the desert-camo sleeve continuing past the elbow up the (mostly off-screen) upper arm.
 * One indexed geometry with three material groups, skinned to the forearm/upper-arm bones so it bends at the
 * wrist and elbow. Built along -Y in hand space (s = distance down the arm from the wrist). Rows at the group
 * boundaries are duplicated so each group gets its own UV layout (cuff / skin maps are unwrapped once around the
 * arm, the camo sleeve is tiled in metres).
 */

export const ARM_GROUPS = { cuff: 0, skin: 1, sleeve: 2 };

const TAU = Math.PI * 2;
// The glove mesh is cut at hand y = -0.018 (s = 0.018); the cuff tube starts inside it and only shows past the cut.
const GLOVE_CUT = 0.018;
const CUFF_START = 0.006;
const CUFF_END = 0.046;
// The sleeve is rolled well below the elbow so the camo roll enters the hip view at the bottom-left corner like the
// MW2019 reference (the virtual shoulder anchor keeps the forearm long on screen).
const SKIN_END = 0.086;
const ROLL_END = 0.128;
const ARM_END = 0.58;

/**
 * Cuff layout shared with the cuff texture (textures.makeCuff): u runs once around the wrist (0.25 = dorsal),
 * v along the cuff from its start inside the glove (0) to the forearm end (1). Distances in metres.
 */
export const CUFF = {
  start: CUFF_START,
  end: CUFF_END,
  meanRadius: 0.0295,
  tab: { s: [0.022, 0.04], halfWidth: 0.02, corner: 0.003, height: 0.003, angle: 0.25 * TAU }, // 40 × 18 × 3 mm
  strapHeight: 0.0005,
  stripe: [0.93, 0.985], // grey piping (v) at the forearm end
};

/** Signed distance (m) to the rounded-rectangle hook-and-loop tab, in cuff texture space (u around, v along). */
export function cuffTabDist(u, v) {
  const t = CUFF.tab;
  const s = CUFF.start + v * (CUFF.end - CUFF.start);
  let a = u * TAU - t.angle;
  a -= Math.round(a / TAU) * TAU;
  const arc = a * CUFF.meanRadius;
  const sc = (t.s[0] + t.s[1]) * 0.5;
  const hs = (t.s[1] - t.s[0]) * 0.5;
  const qx = Math.abs(arc) - (t.halfWidth - t.corner);
  const qy = Math.abs(s - sc) - (hs - t.corner);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - t.corner;
}

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
    // nylon wrist panel: hidden inside the glove's wrist (≈ 31 × 22 mm half-axes) up to the glove's cut edge,
    // then flaring slightly toward the forearm end like a tailored cuff
    const t = sstep(GLOVE_CUT - 0.002, CUFF_END, s);
    rx = lerp(0.0304, 0.0352, t);
    rz = lerp(0.0212, 0.0272, t);
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
    // hook-and-loop closure: a thin strap round the cuff and its rectangular free tab standing 3 mm proud over
    // the back of the wrist (layout shared with the cuff texture)
    const [s0, s1] = CUFF.tab.s;
    const band = sstep(s0 - 0.0015, s0, s) * (1 - sstep(s1, s1 + 0.0015, s));
    if (band <= 0) return 0;
    const d = cuffTabDist(ang / TAU, (s - CUFF_START) / (CUFF_END - CUFF_START));
    const tab = 1 - sstep(-0.0006, 0.0012, d);
    return band * CUFF.strapHeight * (1 - tab) + tab * CUFF.tab.height;
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
  // (dense rows across the tab's edges so its 3 mm step and rounded corners are resolved)
  add(ARM_GROUPS.cuff, [CUFF_START, 0.012, 0.016, 0.0185, 0.02, 0.0212, 0.0222, 0.0232, 0.025, 0.028, 0.031, 0.034, 0.037, 0.0388, 0.0398, 0.0408, 0.042, 0.044, CUFF_END]);
  add(ARM_GROUPS.skin, [...range(CUFF_END, SKIN_END, (SKIN_END - CUFF_END) / 10), SKIN_END]);
  add(ARM_GROUPS.sleeve, [SKIN_END, SKIN_END + 0.0007, SKIN_END + 0.002, ...range(SKIN_END + 0.005, ROLL_END, 0.003), ROLL_END, ...range(ROLL_END + 0.008, 0.3, 0.008), ...range(0.3, ARM_END + 1e-6, 0.02)]);

  const SEG = 64;
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
