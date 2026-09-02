import * as THREE from 'three';
import { smin, sdCone, sdSphere, sdEllipsoid, sdRoundBox, surfaceNets, buildAdjacency, relaxOnSurface, fieldNormals, fieldAO } from './sdf.js';

/**
 * Procedural gloved hand: a smooth signed-distance model (palm slab + thenar/hypothenar bulges + wrist +
 * knuckles + tapered finger/thumb segments) meshed with surface nets into ONE indexed BufferGeometry, then
 * skinned to a 21-bone skeleton by proximity to the bone chains.
 *
 * Hand space (right hand): origin = wrist centre, +Y wrist→fingertips, +Z back of the hand, -Z palm,
 * +X pinky side (thumb at -X). The left hand is the mirror image (x → -x) of the same data.
 */

const DEG = Math.PI / 180;

export const FINGER_NAMES = ['index', 'middle', 'ring', 'pinky'];

/** Bone index layout shared by both hands (used for skin indices). */
export const BONES = {
  root: 0,
  index: [1, 2, 3],
  middle: [4, 5, 6],
  ring: [7, 8, 9],
  pinky: [10, 11, 12],
  thumb: [13, 14, 15],
  fore: [16, 17, 18],
  upper: [19, 20],
  count: 21,
};

export const FOREARM = {
  segment: 0.09, // fore0/1/2 are 90 mm each → elbow at 270 mm from the wrist
  upper: 0.15,
};

/** Build the canonical right-hand rig definition (joint positions + bind frames) in hand space. */
export function defineHand() {
  const fingers = [
    // MCP joints sit slightly palmar of the slab's mid-plane so the fingers' palmar faces run flush with the palm.
    { name: 'index', mcp: [-0.031, 0.094, -0.004], len: [0.044, 0.026, 0.023], r: [0.0097, 0.0088, 0.008, 0.007], spread: -7, curl: [10, 20, 10] },
    { name: 'middle', mcp: [-0.009, 0.1, -0.003], len: [0.049, 0.03, 0.024], r: [0.0099, 0.009, 0.0082, 0.0072], spread: -1.5, curl: [10, 20, 10] },
    { name: 'ring', mcp: [0.013, 0.095, -0.004], len: [0.045, 0.028, 0.024], r: [0.0095, 0.0086, 0.0078, 0.0068], spread: 4, curl: [12, 22, 10] },
    { name: 'pinky', mcp: [0.034, 0.084, -0.006], len: [0.035, 0.022, 0.021], r: [0.0086, 0.0077, 0.007, 0.0062], spread: 10, curl: [14, 24, 12] },
  ];
  const zAxis = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion();
  const qx = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  for (const f of fingers) {
    const joints = [new THREE.Vector3().fromArray(f.mcp)];
    const frames = [];
    q.setFromAxisAngle(zAxis, f.spread * DEG);
    for (let k = 0; k < 3; k++) {
      qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -f.curl[k] * DEG);
      q.multiply(qx);
      dir.set(0, 1, 0).applyQuaternion(q);
      joints.push(joints[k].clone().addScaledVector(dir, f.len[k]));
      frames.push(frameFromDir(dir, zAxis));
    }
    f.joints = joints;
    f.frames = frames;
    f.arc = [0, f.len[0], f.len[0] + f.len[1], f.len[0] + f.len[1] + f.len[2]];
  }

  // Thumb: CMC near the wrist on the radial/palm side; nail faces left-back (-X,+Z) in the relaxed pose.
  const thumbDorsal = new THREE.Vector3(-0.8, 0.05, 0.6).normalize();
  const thumb = {
    name: 'thumb',
    cmc: [-0.026, 0.014, -0.004],
    dirs: [
      [-0.6, 0.66, -0.45],
      [-0.44, 0.84, -0.32],
      [-0.34, 0.92, -0.2],
    ],
    len: [0.05, 0.033, 0.029],
    r: [0.0122, 0.011, 0.01, 0.0086],
    dorsal: thumbDorsal,
  };
  {
    const joints = [new THREE.Vector3().fromArray(thumb.cmc)];
    const frames = [];
    for (let k = 0; k < 3; k++) {
      dir.fromArray(thumb.dirs[k]).normalize();
      joints.push(joints[k].clone().addScaledVector(dir, thumb.len[k]));
      frames.push(frameFromDir(dir, thumbDorsal));
    }
    thumb.joints = joints;
    thumb.frames = frames;
    thumb.arc = [0, thumb.len[0], thumb.len[0] + thumb.len[1], thumb.len[0] + thumb.len[1] + thumb.len[2]];
  }

  return { fingers, thumb };
}

/** Right-handed frame with +Y = dir and +Z as close as possible to zRef. */
function frameFromDir(dir, zRef) {
  const y = dir.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, zRef).normalize();
  if (x.lengthSq() < 1e-8) x.set(1, 0, 0);
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

/* ------------------------------------------------------------------------------------------------ field */

/** Signed-distance function of the whole glove hand (bind pose). */
export function makeHandField(def) {
  const F = def.fingers;
  const T = def.thumb;
  const fj = F.map((f) => f.joints.map((v) => [v.x, v.y, v.z]));
  const tj = T.joints.map((v) => [v.x, v.y, v.z]);

  const fingerDist = (fi, x, y, z) => {
    const f = F[fi];
    const j = fj[fi];
    let d = sdCone(x, y, z, j[0][0], j[0][1], j[0][2], j[1][0], j[1][1], j[1][2], f.r[0], f.r[1]);
    d = smin(d, sdCone(x, y, z, j[1][0], j[1][1], j[1][2], j[2][0], j[2][1], j[2][2], f.r[1], f.r[2]), 0.003);
    d = smin(d, sdCone(x, y, z, j[2][0], j[2][1], j[2][2], j[3][0], j[3][1], j[3][2], f.r[2], f.r[3]), 0.003);
    // knuckle bulges at PIP / DIP (slightly dorsal)
    d = smin(d, sdSphere(x, y, z, j[1][0], j[1][1] + 0.0005, j[1][2] + 0.0015, f.r[1] * 1.07), 0.004);
    d = smin(d, sdSphere(x, y, z, j[2][0], j[2][1], j[2][2] + 0.001, f.r[2] * 1.05), 0.003);
    return d;
  };
  const thumbDist = (x, y, z) => {
    let d = sdCone(x, y, z, tj[0][0], tj[0][1], tj[0][2], tj[1][0], tj[1][1], tj[1][2], T.r[0], T.r[1]);
    d = smin(d, sdCone(x, y, z, tj[1][0], tj[1][1], tj[1][2], tj[2][0], tj[2][1], tj[2][2], T.r[1], T.r[2]), 0.004);
    d = smin(d, sdCone(x, y, z, tj[2][0], tj[2][1], tj[2][2], tj[3][0], tj[3][1], tj[3][2], T.r[2], T.r[3]), 0.004);
    d = smin(d, sdSphere(x, y, z, tj[2][0], tj[2][1], tj[2][2], T.r[2] * 1.1), 0.004);
    return d;
  };
  const palmDist = (x, y, z) => {
    // slab, tapered toward the wrist
    const t = Math.max(0, Math.min(1, (y - 0.005) / 0.09));
    const s = 0.8 + 0.2 * t;
    // ~20 mm thick slab at the edges (15 % thinner than the first pass — the reference hand is flat across the
    // metacarpals), palmar face at z ≈ -0.017 (the fit / fitter rely on that face)
    let d = sdRoundBox(x / s, y, z, 0.001, 0.052, -0.0065, 0.033, 0.041, 0.0025, 0.008) * s;
    // transverse metacarpal arch: the back of the hand is a gently convex surface (≈ 4 mm higher along the middle
    // than at the edges) that falls away before the knuckle row so the four MCP heads stand out from it
    d = smin(d, sdEllipsoid(x, y, z, 0.0, 0.052, 0.0, 0.044, 0.04, 0.011), 0.01);
    d = smin(d, sdEllipsoid(x, y, z, -0.026, 0.038, -0.011, 0.02, 0.034, 0.0115), 0.011);
    // hypothenar (pinky-side) bulge, kept within the slab's width so the ulnar edge stays slim from the back
    d = smin(d, sdEllipsoid(x, y, z, 0.025, 0.032, -0.0095, 0.012, 0.036, 0.0095), 0.011);
    // wrist (elliptical: wider than thick)
    d = smin(d, sdCone(x, y, z * 1.42, 0, 0.014, 0, 0, -0.04, 0, 0.0315, 0.031), 0.016);
    // MCP knuckle row: four metacarpal heads (≈ 10 mm radius, centred 2 mm dorsal of the finger axes) standing
    // ≈ 4 mm proud of the slab's back and ≈ 2 mm above the finger backs, blended just enough to read as a row of
    // knuckles under the knit rather than as separate balls
    for (let i = 0; i < 4; i++) {
      const j = fj[i][0];
      d = smin(d, sdSphere(x, y, z, j[0], j[1] - 0.001, j[2] + 0.002, F[i].r[0] * (i === 3 ? 0.98 : 1.02)), 0.0055);
    }
    return d;
  };

  // Finger-back padding: soft, low (≈ 0.7 mm) transverse ridges under the knit across the backs of the proximal
  // (two) and middle (one) phalanges, leaving the joints free. The MCP knuckles themselves carry no pads so the
  // knuckle row reads as gentle bumps under the fabric rather than bony caps.
  const pads = [];
  {
    const dx = new THREE.Vector3();
    const dz = new THREE.Vector3();
    const c = new THREE.Vector3();
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      const f = F[i];
      const bars = [
        [0, 0.36],
        [0, 0.7],
        [1, 0.5],
      ];
      for (const [k, t] of bars) {
        const a = f.joints[k];
        const b = f.joints[k + 1];
        dx.set(1, 0, 0).applyQuaternion(f.frames[k]);
        dz.set(0, 0, 1).applyQuaternion(f.frames[k]);
        const r = f.r[k] + (f.r[k + 1] - f.r[k]) * t;
        c.copy(a).lerp(b, t).addScaledVector(dz, r * 0.72);
        pa.copy(c).addScaledVector(dx, -r * 0.5);
        pb.copy(c).addScaledVector(dx, r * 0.5);
        pads.push({ cone: true, a: [pa.x, pa.y, pa.z], b: [pb.x, pb.y, pb.z], r1: r * 0.35, r2: r * 0.35 });
      }
    }
  }
  const padDist = (x, y, z) => {
    let d = Infinity;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      const dp = p.cone ? sdCone(x, y, z, p.a[0], p.a[1], p.a[2], p.b[0], p.b[1], p.b[2], p.r1, p.r2) : sdEllipsoid(x, y, z, p.c[0], p.c[1], p.c[2], p.rx, p.ry, p.rz);
      if (dp < d) d = dp;
    }
    return d;
  };

  const dist = (x, y, z) => {
    let df = fingerDist(0, x, y, z);
    df = Math.min(df, fingerDist(1, x, y, z));
    df = Math.min(df, fingerDist(2, x, y, z));
    df = Math.min(df, fingerDist(3, x, y, z));
    let d = smin(palmDist(x, y, z), df, 0.0045);
    d = smin(d, thumbDist(x, y, z), 0.009);
    d = smin(d, padDist(x, y, z), 0.0025);
    // cut below the wrist (hidden inside the cuff)
    return Math.max(d, -(y + 0.018));
  };

  return { dist, fingerDist, thumbDist, palmDist, padDist };
}

/* ------------------------------------------------------------------------------------------------ chains */

/**
 * Closest-point query against a joint chain (polyline). Returns arc-length s (extended before the first
 * joint / after the last), radial distance d, and the radial unit vector components in `out`.
 */
function chainQuery(joints, arc, x, y, z, out) {
  let best = Infinity;
  for (let k = 0; k < joints.length - 1; k++) {
    const a = joints[k];
    const b = joints[k + 1];
    const bax = b.x - a.x;
    const bay = b.y - a.y;
    const baz = b.z - a.z;
    const l2 = bax * bax + bay * bay + baz * baz;
    const pax = x - a.x;
    const pay = y - a.y;
    const paz = z - a.z;
    let t = (pax * bax + pay * bay + paz * baz) / l2;
    // allow extension at the chain ends so s is continuous past the joints
    const tc = k === 0 ? Math.min(t, 1) : k === joints.length - 2 ? Math.max(t, 0) : Math.max(0, Math.min(1, t));
    const dx = pax - bax * tc;
    const dy = pay - bay * tc;
    const dz = paz - baz * tc;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < best) {
      best = d;
      out.seg = k;
      out.s = arc[k] + tc * Math.sqrt(l2);
      out.d = d;
      out.rx = d > 1e-9 ? dx / d : 0;
      out.ry = d > 1e-9 ? dy / d : 0;
      out.rz = d > 1e-9 ? dz / d : 1;
    }
  }
  return out;
}

/** Trapezoid weight of bone interval [a, b] at arc position s with a blend half-width r at each joint. */
function trapezoid(s, a, b, r) {
  const wa = a === -Infinity ? 1 : Math.max(0, Math.min(1, (s - (a - r)) / (2 * r)));
  const wb = b === Infinity ? 1 : Math.max(0, Math.min(1, ((b + r) - s) / (2 * r)));
  return Math.min(wa, wb);
}

/**
 * Skin weights for a point in hand space: proximity-weighted blend of chain influences (finger/thumb bones)
 * with the hand root as the fallback, plus the forearm chain below the wrist. Writes up to 4 (index, weight).
 */
export function makeWeightSolver(def) {
  const chains = [];
  for (let i = 0; i < 4; i++) {
    const f = def.fingers[i];
    chains.push({ joints: f.joints, arc: f.arc, r: f.r, bones: BONES[f.name], blend: 0.0062, reach: 1.9 });
  }
  chains.push({ joints: def.thumb.joints, arc: def.thumb.arc, r: def.thumb.r, bones: BONES.thumb, blend: 0.009, reach: 1.8 });
  const foreJoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -FOREARM.segment, 0), new THREE.Vector3(0, -2 * FOREARM.segment, 0), new THREE.Vector3(0, -3 * FOREARM.segment, 0), new THREE.Vector3(0, -3 * FOREARM.segment - FOREARM.upper, 0), new THREE.Vector3(0, -3 * FOREARM.segment - 2 * FOREARM.upper, 0)];
  const foreArc = [0, FOREARM.segment, 2 * FOREARM.segment, 3 * FOREARM.segment, 3 * FOREARM.segment + FOREARM.upper, 3 * FOREARM.segment + 2 * FOREARM.upper];
  const foreBones = [BONES.fore[0], BONES.fore[1], BONES.fore[2], BONES.upper[0], BONES.upper[1]];
  const q = { seg: 0, s: 0, d: 0, rx: 0, ry: 0, rz: 0 };
  const acc = new Float64Array(BONES.count);

  return function solve(x, y, z, outIdx, outW, isArm = false) {
    acc.fill(0);
    let total = 0;
    if (!isArm) {
      for (const c of chains) {
        chainQuery(c.joints, c.arc, x, y, z, q);
        const R = c.r[Math.min(3, Math.max(0, q.seg))];
        const infl = 1 - smoothstep(R * 1.15, R * c.reach + 0.004, q.d);
        if (infl <= 0) continue;
        // bones along the chain: root before the first joint, then 3 phalanx bones
        const s = q.s;
        const a = c.arc;
        acc[BONES.root] += infl * trapezoid(s, -Infinity, a[0], c.blend);
        acc[c.bones[0]] += infl * trapezoid(s, a[0], a[1], c.blend);
        acc[c.bones[1]] += infl * trapezoid(s, a[1], a[2], c.blend);
        acc[c.bones[2]] += infl * trapezoid(s, a[2], Infinity, c.blend);
        total += infl;
      }
    }
    // forearm chain (wrist blend zone ±12 mm)
    {
      const s = -y; // arc length down the forearm from the wrist
      const foreInfl = isArm ? 1 : 1 - smoothstep(-0.01, 0.014, y);
      if (foreInfl > 0) {
        const r = 0.012;
        acc[BONES.root] += foreInfl * trapezoid(s, -Infinity, foreArc[0], r);
        for (let k = 0; k < 5; k++) acc[foreBones[k]] += foreInfl * trapezoid(s, foreArc[k], k === 4 ? Infinity : foreArc[k + 1], k >= 3 ? 0.03 : 0.018);
        total += foreInfl;
      }
    }
    if (total < 1) {
      acc[BONES.root] += 1 - total;
      total = 1;
    }
    // top 4
    let n = 0;
    for (let pick = 0; pick < 4; pick++) {
      let bi = -1;
      let bw = 0;
      for (let i = 0; i < BONES.count; i++) if (acc[i] > bw) { bw = acc[i]; bi = i; }
      if (bi < 0) break;
      outIdx[n] = bi;
      outW[n] = bw;
      acc[bi] = 0;
      n++;
    }
    for (let i = n; i < 4; i++) { outIdx[i] = 0; outW[i] = 0; }
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += outW[i];
    for (let i = 0; i < 4; i++) outW[i] /= sum || 1;
    void foreJoints;
  };
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------------------------------------ geometry */

/**
 * Mesh the hand field and compute all per-vertex attributes:
 * position, normal, uv (metres; cylindrical per finger / around the palm), skinIndex/skinWeight,
 * aMask = (leather, pipingEnvelope, ao, wristPanel), aDetail = (knucklePad, seamSuppress, signed distance to the
 * wrist-panel seam line in metres).
 */
export function buildHandGeometry(def, { cell = 0.0033 } = {}) {
  const field = makeHandField(def);
  const min = [-0.105, -0.02, -0.058];
  const max = [0.065, 0.2, 0.036];
  const net = surfaceNets(field.dist, min, max, cell);
  const adjacency = buildAdjacency(net.positions.length / 3, net.quads);
  relaxOnSurface(field.dist, net.positions, adjacency, 3, 0.55);
  const normals = fieldNormals(field.dist, net.positions);
  const ao = fieldAO(field.dist, net.positions, normals);

  const n = net.positions.length / 3;
  const pos = net.positions;
  const uv = new Float32Array(n * 2);
  const mask = new Float32Array(n * 4); // (leather, piping, ao, wristPanel)
  const detail = new Float32Array(n * 3); // (knucklePad, seamSuppress, signed distance to the wrist-panel seam)
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  const region = new Int16Array(n); // -1 palm, 0..3 finger, 4 thumb
  const solve = makeWeightSolver(def);
  const q = { seg: 0, s: 0, d: 0, rx: 0, ry: 0, rz: 0 };
  const idx4 = [0, 0, 0, 0];
  const w4 = [0, 0, 0, 0];
  const chains = def.fingers.map((f) => ({ joints: f.joints, arc: f.arc, r: f.r, frames: f.frames }));
  chains.push({ joints: def.thumb.joints, arc: def.thumb.arc, r: def.thumb.r, frames: def.thumb.frames, thumb: true });
  const PALM_R = 0.04; // mean palm "radius" for the cylindrical arc-length mapping
  const zAxis = new THREE.Vector3();
  const xAxis = new THREE.Vector3();
  const circ = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    // region: closest chain surface vs palm
    let best = field.palmDist(x, y, z) + 0.002; // slight bias toward fingers at the boundary
    let reg = -1;
    let bq = null;
    for (let c = 0; c < chains.length; c++) {
      chainQuery(chains[c].joints, chains[c].arc, x, y, z, q);
      const R = chains[c].r[Math.min(3, q.seg)];
      const d = q.d - R;
      if (d < best && q.s > chains[c].arc[0] - 0.006) {
        best = d;
        reg = c;
        bq = { ...q };
      }
    }
    region[i] = reg;
    let leather = 0;
    let crease = 0;
    let trim = 0;
    if (reg >= 0) {
      const c = chains[reg];
      // cylindrical UVs around the chain, angle measured from the segment's dorsal (+Z of its frame)
      const fr = c.frames[Math.min(2, bq.seg)];
      zAxis.set(0, 0, 1).applyQuaternion(fr);
      xAxis.set(1, 0, 0).applyQuaternion(fr);
      const cz = bq.rx * zAxis.x + bq.ry * zAxis.y + bq.rz * zAxis.z; // dorsal-ness
      const cx = bq.rx * xAxis.x + bq.ry * xAxis.y + bq.rz * xAxis.z;
      const ang = Math.atan2(cx, cz); // 0 at the back
      const R = c.r[0];
      uv[i * 2] = ang * R;
      uv[i * 2 + 1] = bq.s;
      circ[i] = 2 * Math.PI * R;
      // Two-material split like the reference glove: knit over the metacarpals and the backs of the proximal
      // phalanges, black synthetic on the palmar faces (reaching up the finger sides) and wrapping the fingers
      // completely from the PIP joint out — so the curled distal segments read as dark leather against the knit
      // backs where they hook over the rail. The thumb keeps its knit back down to the IP joint (leather pad, and
      // all round only over the distal segment): a fully black thumb hooking over the rail in front of the knit
      // back dominated the whole hip frame, whereas the reference shows no black above the rail at all.
      const palmness = -cz;
      leather = c.thumb ? smoothstep(0.35, 0.8, palmness) : smoothstep(0.12, 0.6, palmness);
      const wrapStart = c.thumb ? c.arc[2] - 0.003 : c.arc[1] + 0.002;
      leather = Math.max(leather, smoothstep(wrapStart - 0.0025, wrapStart + 0.0025, bq.s));
      // palm-side creases at the joints; softer stretch creases across the knit on the back of the joints
      const pf = smoothstep(0.1, 0.6, palmness);
      const df = smoothstep(0.1, 0.6, cz) * 0.45;
      for (let k = 1; k <= 2; k++) {
        const dj = (bq.s - c.arc[k]) / 0.0028;
        crease = Math.max(crease, pf * Math.exp(-dj * dj));
        const dk = (bq.s - c.arc[k]) / 0.0022;
        crease = Math.max(crease, df * Math.exp(-dk * dk));
      }
      if (c.thumb) {
        const dj = (bq.s - c.arc[1]) / 0.0035;
        crease = Math.max(crease, pf * 0.8 * Math.exp(-dj * dj));
      }
    } else {
      // palm / wrist: cylindrical around the hand's Y axis (wrap seam on the pinky edge, fixed up below)
      const ang = Math.atan2(z, -x);
      uv[i * 2] = ang * PALM_R;
      uv[i * 2 + 1] = y;
      circ[i] = 2 * Math.PI * PALM_R;
      const nz = normals[i * 3 + 2];
      // leather on the palm face only — it stops short of the side edges, so the thenar / hypothenar bulges show
      // knit on their outward faces like the reference glove; the wrist stays knit (cuff covers it)
      leather = smoothstep(-0.45, -0.8, nz);
      // heel-of-palm creases (thenar line)
      const tx = x + 0.012;
      const ty = y - 0.03;
      const line = Math.abs(tx * 0.8 + ty * 0.6 - 0.02);
      crease = smoothstep(0.6, 1, -nz) * 0.6 * Math.exp(-((line / 0.003) ** 2)) * smoothstep(0.075, 0.03, y);
    }
    // Black nylon wrist panel over the heel of the hand, all the way round, its upper edge running a little higher
    // on the pinky side, with the glove's grey piping along that edge on the back/sides and a top-stitch below it.
    // The lines are far thinner than the mesh cells, so instead of baking them into vertex weights (which comes
    // out blotchy) the signed distance to the seam line goes in aDetail.z and the shader draws panel / piping /
    // stitch analytically from it; aMask.y only carries the piping's envelope (back/sides, not below the wrist).
    let panel = 0;
    let dCuff = 0;
    {
      const nz = normals[i * 3 + 2];
      const cuffLine = 0.012 + 0.15 * x;
      dCuff = y - cuffLine;
      panel = smoothstep(cuffLine + 0.002, cuffLine - 0.002, y);
      const onBack = smoothstep(-0.35, 0.1, nz);
      trim = onBack * smoothstep(-0.006, 0.0, y) * (1 - smoothstep(0.006, 0.012, Math.abs(dCuff)));
    }
    // Crevices between neighbouring digits (too narrow for the AO probe): darken where a second digit's surface is
    // within a few mm of this vertex.
    let crevice = 0;
    {
      let d1 = Infinity;
      let d2 = Infinity;
      for (let fi = 0; fi < 5; fi++) {
        const dd = fi < 4 ? field.fingerDist(fi, x, y, z) : field.thumbDist(x, y, z);
        if (dd < d1) {
          d2 = d1;
          d1 = dd;
        } else if (dd < d2) d2 = dd;
      }
      crevice = 1 - smoothstep(0.0008, 0.0062, d2);
      if (y < 0.075) crevice *= smoothstep(0.055, 0.075, y); // fade out below the webbing
    }
    // MCP knuckle creases on the back are handled by AO; combine AO + creases
    mask[i * 4] = leather;
    mask[i * 4 + 1] = trim;
    mask[i * 4 + 2] = Math.max(0, Math.min(1, ao[i])) * (1 - 0.55 * crease) * (1 - 0.7 * crevice);
    mask[i * 4 + 3] = panel;
    // finger-back padding (vertices on a pad sit on / just outside its own surface), no stitch seams near the wrist
    detail[i * 3] = (1 - smoothstep(0.0003, 0.0022, field.padDist(x, y, z))) * (1 - Math.max(leather, panel));
    detail[i * 3 + 1] = smoothstep(0.036, 0.024, y);
    detail[i * 3 + 2] = dCuff;
    solve(x, y, z, idx4, w4, false);
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = idx4[k];
      skinWeight[i * 4 + k] = w4[k];
    }
  }

  // Fix the UV wrap seam: duplicate vertices of triangles spanning more than half a circumference.
  const tris = net.indices;
  const outPos = Array.from(pos);
  const outNrm = Array.from(normals);
  const outUv = Array.from(uv);
  const outMask = Array.from(mask);
  const outDetail = Array.from(detail);
  const outSI = Array.from(skinIndex);
  const outSW = Array.from(skinWeight);
  const dupMap = new Map(); // key "v|k" → new index
  const outIdx = new Uint32Array(tris.length);
  const getDup = (v, k) => {
    const key = v * 8 + (k + 4);
    let id = dupMap.get(key);
    if (id !== undefined) return id;
    id = outPos.length / 3;
    outPos.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
    outNrm.push(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
    outUv.push(uv[v * 2] + k * circ[v], uv[v * 2 + 1]);
    outMask.push(mask[v * 4], mask[v * 4 + 1], mask[v * 4 + 2], mask[v * 4 + 3]);
    outDetail.push(detail[v * 3], detail[v * 3 + 1], detail[v * 3 + 2]);
    for (let j = 0; j < 4; j++) {
      outSI.push(skinIndex[v * 4 + j]);
      outSW.push(skinWeight[v * 4 + j]);
    }
    dupMap.set(key, id);
    return id;
  };
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const sameRegion = region[a] === region[b] && region[b] === region[c];
    outIdx[t] = a;
    outIdx[t + 1] = b;
    outIdx[t + 2] = c;
    if (!sameRegion) continue;
    const C = circ[a];
    const ua = uv[a * 2], ub = uv[b * 2], uc = uv[c * 2];
    const umax = Math.max(ua, ub, uc);
    const shift = (v, u) => (umax - u > C * 0.5 ? getDup(v, 1) : v);
    outIdx[t] = shift(a, ua);
    outIdx[t + 1] = shift(b, ub);
    outIdx[t + 2] = shift(c, uc);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
  geo.setAttribute('aMask', new THREE.Float32BufferAttribute(outMask, 4));
  geo.setAttribute('aDetail', new THREE.Float32BufferAttribute(outDetail, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSW, 4));
  geo.setIndex(new THREE.BufferAttribute(outIdx, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Mirror a hand geometry across the YZ plane (x → -x) with flipped winding. Bone indices are shared. */
export function mirrorGeometry(src) {
  const geo = src.clone();
  const p = geo.attributes.position.array;
  const nr = geo.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    p[i] = -p[i];
    nr[i] = -nr[i];
  }
  const idx = geo.index.array;
  for (let t = 0; t < idx.length; t += 3) {
    const tmp = idx[t + 1];
    idx[t + 1] = idx[t + 2];
    idx[t + 2] = tmp;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.index.needsUpdate = true;
  geo.computeBoundingSphere();
  return geo;
}

/* ------------------------------------------------------------------------------------------------ skeleton */

/**
 * Build the bone hierarchy for one hand. `side` = +1 right, -1 left (mirrors positions/rotations).
 * Returns { bones, skeleton, rest: { pos[], quat[] } (local rest transforms) }.
 */
export function buildSkeleton(def, side) {
  const bones = new Array(BONES.count);
  const root = new THREE.Bone();
  root.name = 'hand';
  bones[BONES.root] = root;

  const mirrorQ = (q) => (side < 0 ? new THREE.Quaternion(q.x, -q.y, -q.z, q.w) : q.clone());
  const mirrorP = (p) => new THREE.Vector3(side < 0 ? -p.x : p.x, p.y, p.z);

  const addChain = (names, joints, frames, indices) => {
    let parent = root;
    let parentPos = new THREE.Vector3();
    let parentQ = new THREE.Quaternion();
    for (let k = 0; k < 3; k++) {
      const b = new THREE.Bone();
      b.name = names[k];
      const worldP = mirrorP(joints[k]);
      const worldQ = mirrorQ(frames[k]);
      // local = parent^-1 * world
      const invQ = parentQ.clone().invert();
      b.position.copy(worldP).sub(parentPos).applyQuaternion(invQ);
      b.quaternion.copy(invQ).multiply(worldQ);
      parent.add(b);
      bones[indices[k]] = b;
      parent = b;
      parentPos = worldP;
      parentQ = worldQ;
    }
  };
  for (const f of def.fingers) addChain([`${f.name}1`, `${f.name}2`, `${f.name}3`], f.joints, f.frames, BONES[f.name]);
  addChain(['thumb1', 'thumb2', 'thumb3'], def.thumb.joints, def.thumb.frames, BONES.thumb);

  // Forearm chain: +Y of each bone points down the arm (toward the elbow), +Z stays dorsal.
  const down = new THREE.Vector3(0, -1, 0);
  const fq = frameFromDir(down, new THREE.Vector3(0, 0, 1));
  const fqm = mirrorQ(fq);
  let parent = root;
  let parentQ = new THREE.Quaternion();
  let parentPos = new THREE.Vector3();
  const foreNames = ['fore0', 'fore1', 'fore2', 'upper0', 'upper1'];
  const foreIdx = [BONES.fore[0], BONES.fore[1], BONES.fore[2], BONES.upper[0], BONES.upper[1]];
  const foreY = [0, -FOREARM.segment, -2 * FOREARM.segment, -3 * FOREARM.segment, -3 * FOREARM.segment - FOREARM.upper];
  for (let k = 0; k < 5; k++) {
    const b = new THREE.Bone();
    b.name = foreNames[k];
    const worldP = new THREE.Vector3(0, foreY[k], 0);
    const invQ = parentQ.clone().invert();
    b.position.copy(worldP).sub(parentPos).applyQuaternion(invQ);
    b.quaternion.copy(invQ).multiply(fqm);
    parent.add(b);
    bones[foreIdx[k]] = b;
    parent = b;
    parentQ = fqm.clone();
    parentPos = worldP;
  }

  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const rest = { pos: bones.map((b) => b.position.clone()), quat: bones.map((b) => b.quaternion.clone()) };
  return { bones, skeleton, rest, root };
}
