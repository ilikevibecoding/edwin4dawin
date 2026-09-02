import * as THREE from 'three';
import { Field, Capsule, Ellipsoid, RoundBox, MAT } from './sdf.js';
import { polygonize } from './mc.js';

/**
 * Procedural glove hand: anatomy described as blended SDF primitives in a canonical LEFT-hand frame,
 * posed by finger joint angles, meshed once with marching cubes so every joint is seamless.
 *
 * Canonical hand frame (left hand, metres):
 *   origin  palm centre (mid-thickness, halfway between wrist crease and knuckle line)
 *   +Z      distal (towards the fingertips when open)
 *   +Y      dorsal (back of the hand)
 *   +X      ulnar (little-finger side)   → the thumb lives on -X
 * The right hand is the exact mirror (x → -x) of the same field.
 */

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y_UP = V(0, 1, 0);
const Z_FWD = V(0, 0, 1);

/** Rotate v about unit axis by angle (Rodrigues). */
function rot(v, axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = axis;
  const cross = new THREE.Vector3().crossVectors(k, v);
  const dot = k.dot(v);
  return new THREE.Vector3(
    v.x * c + cross.x * s + k.x * dot * (1 - c),
    v.y * c + cross.y * s + k.y * dot * (1 - c),
    v.z * c + cross.z * s + k.z * dot * (1 - c),
  );
}

// Finger definitions: knuckle (MCP) head position, segment lengths, radii (glove included), abduction.
const FINGERS = [
  { name: 'index', mcp: V(-0.032, 0.0025, 0.047), len: [0.044, 0.026, 0.022], r: [0.0102, 0.0094, 0.0086, 0.0074], abd: -0.1 },
  { name: 'middle', mcp: V(-0.0105, 0.003, 0.051), len: [0.047, 0.029, 0.024], r: [0.0104, 0.0096, 0.0088, 0.0075], abd: -0.02 },
  { name: 'ring', mcp: V(0.0105, 0.0025, 0.046), len: [0.044, 0.028, 0.023], r: [0.0098, 0.009, 0.0082, 0.007], abd: 0.06 },
  { name: 'pinky', mcp: V(0.0305, 0.001, 0.038), len: [0.035, 0.021, 0.020], r: [0.0088, 0.008, 0.0072, 0.0062], abd: 0.17 },
];

const THUMB = { cmc: V(-0.031, -0.007, -0.024), len: [0.045, 0.031, 0.028], r: [0.0128, 0.0112, 0.0102, 0.0088] };

/**
 * Pose library. Finger angles are [MCP, PIP, DIP] flexion in radians (per finger, index → pinky);
 * thumb = unit-ish directions of metacarpal / proximal / distal segments in the hand frame.
 */
export const POSES = {
  grip: {
    fingers: [
      [1.0, 1.35, 0.55],
      [1.1, 1.45, 0.65],
      [1.18, 1.5, 0.7],
      [1.25, 1.5, 0.75],
    ],
    spread: 0.9,
    thumb: [V(-0.78, -0.4, 0.48), V(-0.68, -0.52, 0.52), V(-0.6, -0.56, 0.57)],
  },
  // Right hand on the pistol grip: index finger extended onto the trigger, others wrapped tight.
  pistol: {
    fingers: [
      [0.45, 0.65, 0.3],
      [1.15, 1.5, 0.75],
      [1.25, 1.55, 0.8],
      [1.3, 1.55, 0.85],
    ],
    spread: 0.8,
    thumb: [V(-0.6, -0.55, 0.58), V(-0.3, -0.75, 0.6), V(-0.1, -0.8, 0.6)],
  },
  magGrab: {
    fingers: [
      [0.75, 1.0, 0.45],
      [0.8, 1.05, 0.5],
      [0.85, 1.1, 0.5],
      [0.9, 1.1, 0.55],
    ],
    spread: 1.0,
    thumb: [V(-0.7, -0.45, 0.55), V(-0.4, -0.62, 0.68), V(-0.15, -0.65, 0.75)],
  },
  open: {
    fingers: [
      [0.18, 0.22, 0.1],
      [0.15, 0.2, 0.1],
      [0.18, 0.22, 0.1],
      [0.22, 0.25, 0.12],
    ],
    spread: 1.4,
    thumb: [V(-0.85, 0.05, 0.52), V(-0.75, 0.0, 0.66), V(-0.7, -0.05, 0.71)],
  },
};

/**
 * Forward kinematics: joint chains for a pose in the hand frame.
 * Returns { fingers: [{ pts:[mcp,pip,dip,tip], dirs:[d0,d1,d2] } ×4], thumb: { pts:[cmc,mcp,ip,tip], dirs } }.
 */
export function solveJoints(pose) {
  const fingers = FINGERS.map((f, i) => {
    const angles = pose.fingers[i];
    const abd = f.abd * pose.spread;
    let dir = rot(Z_FWD, Y_UP, abd);
    // the extensor (nail) side rotates with the segment — projecting +Y would flip once flexion passes 90°
    let dorsal = Y_UP.clone();
    const flexAxis = rot(V(1, 0, 0), Y_UP, abd);
    const pts = [f.mcp.clone()];
    const dirs = [];
    const dorsals = [];
    let p = f.mcp.clone();
    for (let s = 0; s < 3; s++) {
      dir = rot(dir, flexAxis, angles[s]);
      dorsal = rot(dorsal, flexAxis, angles[s]);
      p = p.clone().addScaledVector(dir, f.len[s]);
      pts.push(p);
      dirs.push(dir);
      dorsals.push(dorsal);
    }
    return { pts, dirs, dorsals, def: f };
  });
  const tp = [THUMB.cmc.clone()];
  const tdirs = [];
  let p = THUMB.cmc.clone();
  for (let s = 0; s < 3; s++) {
    const dir = pose.thumb[s].clone().normalize();
    p = p.clone().addScaledVector(dir, THUMB.len[s]);
    tp.push(p);
    tdirs.push(dir);
  }
  // Thumb nail side: outside of the curl (away from the direction the chain turns), falling back to the
  // hand's dorsal leaning to the thumb's outer edge when the chain is straight.
  const tdorsals = tdirs.map((dir, s) => {
    const prev = tdirs[Math.max(0, s - 1)];
    const next = tdirs[Math.min(2, s + 1)];
    const turn = next.clone().sub(prev);
    const base = V(-0.35, 1, 0).normalize();
    const d = base.clone().addScaledVector(turn, -2.0);
    d.addScaledVector(dir, -d.dot(dir));
    if (d.lengthSq() < 1e-6) d.copy(base).addScaledVector(dir, -base.dot(dir));
    return d.normalize();
  });
  return { fingers, thumb: { pts: tp, dirs: tdirs, dorsals: tdorsals } };
}

/** Build the SDF primitive list for a pose (canonical left hand). */
export function buildHandShapes(pose) {
  const shapes = [];
  const dorsalSplit = (prim, dir, origin, cut = 0, knitEnd = null) => {
    prim.dorsal = dir.clone().normalize();
    prim.dorsalOrigin = origin.clone();
    prim.dorsalCut = cut;
    prim.knitEnd = knitEnd;
    return prim;
  };
  // The black hook-and-loop wrist strap covers the back of the hand from the wrist crease up to here; its
  // edge runs diagonally, reaching higher on the little-finger side (as on the reference glove).
  const STRAP_END = { axis: V(0.41, 0, -0.91), origin: V(0, 0, 0), length: 0.027, mat: MAT.CUFF };

  const joints = solveJoints(pose);

  // --- Palm: a tapered slab (two rounded boxes, ~30 mm thick) + metacarpal ridges + pads --------
  const slabA = new RoundBox(V(0.0, -0.0005, 0.012), V(0.03, 0.0035, 0.034), 0.0115, null, MAT.LEATHER, 0.012);
  dorsalSplit(slabA, Y_UP, V(0, -0.002, 0), 0, STRAP_END);
  shapes.push(slabA);
  const slabB = new RoundBox(V(0.0, -0.001, -0.028), V(0.018, 0.0015, 0.022), 0.0145, null, MAT.LEATHER, 0.012);
  dorsalSplit(slabB, Y_UP, V(0, -0.002, 0), 0, STRAP_END);
  shapes.push(slabB);
  // Metacarpal bones fan out from the carpus to each knuckle — gives the tendon ridges on the back.
  const carpus = [V(-0.016, 0.004, -0.03), V(-0.006, 0.0045, -0.032), V(0.006, 0.004, -0.032), V(0.016, 0.003, -0.03)];
  FINGERS.forEach((f, i) => {
    const c = new Capsule(carpus[i], f.mcp.clone().add(V(0, 0.0015, 0)), 0.0085, 0.0102, MAT.LEATHER, 0.010);
    dorsalSplit(c, Y_UP, V(0, -0.002, 0), 0, STRAP_END);
    shapes.push(c);
  });
  // Palmar pads: thenar (thumb ball), hypothenar (little-finger edge), distal palm pad under the knuckles.
  const thenarQ = new THREE.Quaternion().setFromUnitVectors(Z_FWD, V(-0.55, -0.2, 0.8).normalize());
  shapes.push(new Ellipsoid(V(-0.019, -0.009, -0.006), V(0.017, 0.011, 0.03), thenarQ, MAT.LEATHER, 0.012));
  shapes.push(new Ellipsoid(V(0.022, -0.0085, -0.008), V(0.012, 0.0095, 0.03), null, MAT.LEATHER, 0.012));
  shapes.push(new Ellipsoid(V(-0.002, -0.0095, 0.033), V(0.036, 0.0065, 0.013), null, MAT.LEATHER, 0.010));
  // Thumb web: a thin membrane between the thumb's first joint and the index knuckle.
  {
    const tm = joints.thumb.pts[1];
    const im = joints.fingers[0].pts[0];
    const mid = tm.clone().lerp(im, 0.5).add(V(0, -0.003, -0.006));
    const axis = im.clone().sub(tm).normalize();
    const webQ = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), axis);
    shapes.push(new Ellipsoid(mid, V(tm.distanceTo(im) * 0.5 + 0.004, 0.0045, 0.014), webQ, MAT.LEATHER, 0.012));
  }

  // --- Wrist + glove cuff (the wrist is the narrowest part of the arm; elliptical, not boxy) ----
  // (RoundBox extents grow by the corner radius: the glove's edge lands at z ≈ -0.094, 39 mm below the crease)
  const wrist = new RoundBox(V(0, -0.001, -0.056), V(0.0115, 0.0025, 0.012), 0.019, null, MAT.CUFF, 0.012);
  shapes.push(wrist);
  const cuff = new RoundBox(V(0, -0.001, -0.072), V(0.0125, 0.003, 0.001), 0.0215, null, MAT.CUFF, 0.004);
  shapes.push(cuff);

  // --- Fingers ---------------------------------------------------------------------------------
  joints.fingers.forEach(({ pts, dirs, dorsals, def: f }) => {
    for (let s = 0; s < 3; s++) {
      const p = pts[s];
      const q = pts[s + 1];
      const dir = dirs[s];
      const seg = new Capsule(p, q, f.r[s], f.r[s + 1], MAT.LEATHER, 0.0045);
      // knit over the back and sides of the proximal + middle segments; black pads underneath, black tips
      if (s < 2) dorsalSplit(seg, dorsals[s], p, -0.3 * f.r[s]);
      shapes.push(seg);
      // knuckle: slightly larger bump at each joint on the dorsal side
      const bumpR = f.r[s] + (s === 0 ? 0.0018 : 0.001);
      const bump = new Ellipsoid(p.clone().addScaledVector(dir, 0.002), V(bumpR, bumpR, bumpR * 1.15), new THREE.Quaternion().setFromUnitVectors(Z_FWD, dir), MAT.LEATHER, 0.005);
      if (s < 2) dorsalSplit(bump, dorsals[s], p, -0.3 * f.r[s]);
      shapes.push(bump);
    }
  });

  // --- Thumb -----------------------------------------------------------------------------------
  {
    const { pts, dirs, dorsals } = joints.thumb;
    for (let s = 0; s < 3; s++) {
      const p = pts[s];
      const q = pts[s + 1];
      const seg = new Capsule(p, q, THUMB.r[s], THUMB.r[s + 1], MAT.LEATHER, s === 0 ? 0.012 : 0.005);
      if (s < 2) dorsalSplit(seg, dorsals[s], p, -0.25 * THUMB.r[s], s === 0 ? STRAP_END : null);
      shapes.push(seg);
      if (s > 0) {
        const bumpR = THUMB.r[s] + 0.001;
        const bump = new Ellipsoid(p.clone(), V(bumpR, bumpR, bumpR), null, MAT.LEATHER, 0.005);
        if (s < 2) dorsalSplit(bump, dorsals[s], p, -0.25 * THUMB.r[s]);
        shapes.push(bump);
      }
    }
  }
  return shapes;
}

/** Wrist crease centre and the proximal (towards the elbow) direction in the hand frame. */
export const WRIST_LOCAL = V(0, -0.001, -0.055);
export const WRIST_PROXIMAL = V(0, 0, -1);

/** Mirror wrapper: samples a left-hand field as a right hand. */
class MirroredField {
  constructor(f) {
    this.f = f;
    this.min = V(-f.max.x, f.min.y, f.min.z);
    this.max = V(-f.min.x, f.max.y, f.max.z);
  }
  dist(x, y, z) {
    return this.f.dist(-x, y, z);
  }
  materialAt(x, y, z) {
    return this.f.materialAt(-x, y, z);
  }
}

/**
 * Mesh a hand pose. `carves` are weapon volumes in the hand frame (already mirrored for right hands).
 * Returns { geometry (groups: 0 knit, 1 leather, 2 cuff), stats }.
 */
export function buildHandGeometry(pose, { mirror = false, carves = [], cell = 0.0024 } = {}) {
  const shapes = buildHandShapes(pose);
  let field = new Field(shapes, carves);
  if (mirror) field = new MirroredField(field);
  const geo = polygonize(field, cell);

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const index = geo.index.array;
  const vcount = pos.count;

  // Per-vertex material, then per-triangle majority vote.
  const vmat = new Uint8Array(vcount);
  for (let i = 0; i < vcount; i++) vmat[i] = field.materialAt(pos.getX(i), pos.getY(i), pos.getZ(i));

  const triCount = index.length / 3;
  const tmat = new Uint8Array(triCount);
  const counts = [0, 0, 0];
  for (let t = 0; t < triCount; t++) {
    const a = vmat[index[t * 3]];
    const b = vmat[index[t * 3 + 1]];
    const c = vmat[index[t * 3 + 2]];
    const m = a === b || a === c ? a : b === c ? b : a;
    tmat[t] = m;
    counts[m]++;
  }

  // UVs: knit = planar over the back of the hand (its pattern follows the hand's length);
  // leather = dominant-axis planar (fine grain, seams are invisible at 2 mm triangles);
  // cuff = wrap around the wrist axis (u) × along the cuff (v) so the trim stripe lines up.
  const uv = new Float32Array(vcount * 2);
  const sx = mirror ? -1 : 1;
  for (let i = 0; i < vcount; i++) {
    const x = pos.getX(i) * sx;
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const m = vmat[i];
    let u;
    let v;
    if (m === MAT.KNIT) {
      u = x / 0.014;
      v = z / 0.014;
    } else if (m === MAT.CUFF) {
      const ang = Math.atan2(y + 0.001, x);
      u = (ang / (Math.PI * 2)) * 4;
      v = THREE.MathUtils.clamp((z + 0.095) / 0.07, 0, 1);
    } else {
      const nx = Math.abs(nor.getX(i));
      const ny = Math.abs(nor.getY(i));
      const nz = Math.abs(nor.getZ(i));
      const s = 1 / 0.03;
      if (ny >= nx && ny >= nz) {
        u = x * s;
        v = z * s;
      } else if (nx >= nz) {
        u = z * s;
        v = y * s;
      } else {
        u = x * s;
        v = y * s;
      }
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // Reorder triangles into material groups.
  const sorted = new (vcount > 65535 ? Uint32Array : Uint16Array)(index.length);
  const starts = [0, counts[0] * 3, (counts[0] + counts[1]) * 3];
  const cursor = starts.slice();
  for (let t = 0; t < triCount; t++) {
    const m = tmat[t];
    const o = cursor[m];
    sorted[o] = index[t * 3];
    sorted[o + 1] = index[t * 3 + 1];
    sorted[o + 2] = index[t * 3 + 2];
    cursor[m] += 3;
  }
  geo.setIndex(new THREE.BufferAttribute(sorted, 1));
  geo.clearGroups();
  for (let m = 0; m < 3; m++) if (counts[m] > 0) geo.addGroup(starts[m], counts[m] * 3, m);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  return { geometry: geo, stats: { vertices: vcount, triangles: triCount, cells: geo.userData.cells, knit: counts[0], leather: counts[1], cuff: counts[2] } };
}
