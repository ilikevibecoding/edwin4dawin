/**
 * Procedural humanoid geometry.
 *
 * Bodies are swept from superellipse cross-sections (torso) and tapered tubes
 * along bone chains (limbs). Heads are sculpted by displacing a UV sphere with
 * a stack of anatomical operators, then Laplacian-smoothed so the features read
 * as flesh rather than as noise. Everything lands in one triangle soup that is
 * auto-skinned to the rig by distance-to-bone-segment.
 */
import * as THREE from 'three';
import { clamp, gauss, lerp, smoothstep } from './math';
import type { CharacterSpec, FaceSpec } from './charspec';

export const REGION = {
  TORSO: 0,
  ARM_L: 1,
  ARM_R: 2,
  LEG_L: 3,
  LEG_R: 4,
  NECK: 5,
  HEAD: 6,
  HIPS: 7,
} as const;

export type BoneName =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head' | 'jaw'
  | 'shoulderL' | 'armL' | 'foreArmL' | 'handL'
  | 'shoulderR' | 'armR' | 'foreArmR' | 'handR'
  | 'thighL' | 'shinL' | 'footL' | 'toeL'
  | 'thighR' | 'shinR' | 'footR' | 'toeR'
  | 'eyeL' | 'eyeR' | 'lidL' | 'lidR' | 'browL' | 'browR';

export type Rig = {
  root: THREE.Bone;
  bones: THREE.Bone[];
  byName: Record<BoneName, THREE.Bone>;
  /** World-space rest positions, used for auto-skinning. */
  restWorld: Map<BoneName, THREE.Vector3>;
  height: number;
  headCenter: THREE.Vector3;
  eyeHeight: number;
};

type Dim = ReturnType<typeof dimensions>;

function dimensions(spec: CharacterSpec) {
  const H = spec.height ?? (spec.female ? 1.68 : 1.8);
  const s = H / 1.8;
  const build = spec.build ?? 0.45;
  const fem = spec.female ? 1 : 0;
  const w = (1 + (build - 0.45) * 0.55) * s;
  return {
    H, s, build, fem, w,
    hipY: 0.53 * H,
    spineY: 0.605 * H,
    chestY: 0.72 * H,
    neckY: 0.828 * H,
    headY: 0.872 * H,
    headCenterY: 0.938 * H,
    shoulderY: 0.815 * H,
    shoulderX: (0.112 - fem * 0.009) * H * (0.94 + build * 0.14),
    elbowY: 0.625 * H,
    wristY: 0.472 * H,
    hipJointX: 0.049 * H,
    kneeY: 0.285 * H,
    ankleY: 0.048 * H,
    // Radii
    neckR: (0.029 - fem * 0.0045) * H * w,
    armR: (0.0295 - fem * 0.003) * H * w,
    elbowR: 0.0255 * H * w,
    wristR: 0.019 * H * w,
    thighR: (0.048 + fem * 0.004) * H * w,
    kneeR: 0.036 * H * w,
    ankleR: 0.026 * H * w,
    // Half-extents of the cranium. Real heads are ~H/7.6 tall, 15.5cm wide,
    // 20cm deep; getting this wrong makes every facial feature read as noise.
    headW: (0.0435 - fem * 0.0015) * H,
    headD: (0.055 - fem * 0.0012) * H,
    headHi: (0.066 - fem * 0.0012) * H,
  };
}

/* -------------------------------------------------------------- skeleton */

export function buildRig(spec: CharacterSpec): Rig {
  const d = dimensions(spec);
  const bones: THREE.Bone[] = [];
  const byName = {} as Record<BoneName, THREE.Bone>;
  const restWorld = new Map<BoneName, THREE.Vector3>();

  const mk = (name: BoneName, parent: THREE.Bone | null, world: THREE.Vector3): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    if (parent) {
      const pw = restWorld.get(parent.name as BoneName)!;
      b.position.copy(world).sub(pw);
      parent.add(b);
    } else {
      b.position.copy(world);
    }
    restWorld.set(name, world.clone());
    byName[name] = b;
    bones.push(b);
    return b;
  };
  const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

  const hips = mk('hips', null, V(0, d.hipY, 0));
  const spine = mk('spine', hips, V(0, d.spineY, 0.004 * d.H));
  const chest = mk('chest', spine, V(0, d.chestY, 0.002 * d.H));
  const neck = mk('neck', chest, V(0, d.neckY, -0.004 * d.H));
  const head = mk('head', neck, V(0, d.headY, 0.002 * d.H));
  // Jaw hinges at the ear, which is what makes an open mouth look believable.
  mk('jaw', head, V(0, d.headCenterY - 0.008 * d.H, -0.006 * d.H));
  mk('eyeL', head, V(-0.0165 * d.H, d.headCenterY + 0.004 * d.H, 0.038 * d.H));
  mk('eyeR', head, V(0.0165 * d.H, d.headCenterY + 0.004 * d.H, 0.038 * d.H));
  mk('lidL', head, V(-0.0165 * d.H, d.headCenterY + 0.006 * d.H, 0.038 * d.H));
  mk('lidR', head, V(0.0165 * d.H, d.headCenterY + 0.006 * d.H, 0.038 * d.H));
  mk('browL', head, V(-0.018 * d.H, d.headCenterY + 0.016 * d.H, 0.04 * d.H));
  mk('browR', head, V(0.018 * d.H, d.headCenterY + 0.016 * d.H, 0.04 * d.H));

  for (const side of [-1, 1]) {
    const S = side < 0 ? 'L' : 'R';
    const sh = mk(`shoulder${S}` as BoneName, chest, V(side * 0.03 * d.H, d.shoulderY + 0.012 * d.H, 0));
    const arm = mk(`arm${S}` as BoneName, sh, V(side * d.shoulderX, d.shoulderY, 0));
    const fore = mk(`foreArm${S}` as BoneName, arm, V(side * (d.shoulderX + 0.012 * d.H), d.elbowY, -0.006 * d.H));
    mk(`hand${S}` as BoneName, fore, V(side * (d.shoulderX + 0.02 * d.H), d.wristY, 0.002 * d.H));

    const thigh = mk(`thigh${S}` as BoneName, hips, V(side * d.hipJointX, d.hipY - 0.01 * d.H, 0));
    const shin = mk(`shin${S}` as BoneName, thigh, V(side * (d.hipJointX + 0.002 * d.H), d.kneeY, 0.004 * d.H));
    const foot = mk(`foot${S}` as BoneName, shin, V(side * (d.hipJointX + 0.001 * d.H), d.ankleY, -0.004 * d.H));
    mk(`toe${S}` as BoneName, foot, V(side * d.hipJointX, d.ankleY * 0.55, 0.075 * d.H));
  }

  hips.updateMatrixWorld(true);
  return {
    root: hips,
    bones,
    byName,
    restWorld,
    height: d.H,
    headCenter: new THREE.Vector3(0, d.headCenterY, 0),
    eyeHeight: d.headCenterY + 0.006 * d.H,
  };
}

/* ------------------------------------------------------------- geometry */

type Soup = {
  pos: number[];
  uv: number[];
  region: number[];
  index: number[];
};

function newSoup(): Soup {
  return { pos: [], uv: [], region: [], index: [] };
}

function pushVert(s: Soup, x: number, y: number, z: number, u: number, v: number, region: number): number {
  s.pos.push(x, y, z);
  s.uv.push(u, v);
  s.region.push(region);
  return s.pos.length / 3 - 1;
}

/** Stitch two vertex rings into a quad band. */
function bridge(s: Soup, ringA: number[], ringB: number[], flip = false): void {
  const n = ringA.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = ringA[i], b = ringA[j], c = ringB[j], dd = ringB[i];
    if (flip) s.index.push(a, c, b, a, dd, c);
    else s.index.push(a, b, c, a, c, dd);
  }
}

/** Superellipse ring in the XZ plane. */
function ring(
  s: Soup,
  y: number,
  halfW: number,
  halfD: number,
  expo: number,
  centerZ: number,
  segs: number,
  vCoord: number,
  region: number,
): number[] {
  const idx: number[] = [];
  const p = 2 / expo;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const a = t * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const x = halfW * Math.sign(ca) * Math.pow(Math.abs(ca), p);
    const z = halfD * Math.sign(sa) * Math.pow(Math.abs(sa), p) + centerZ;
    idx.push(pushVert(s, x, y, z, t, vCoord, region));
  }
  return idx;
}

/** Tapered tube through a polyline of (point, radius) samples. */
function tube(
  s: Soup,
  pts: THREE.Vector3[],
  radii: number[],
  segs: number,
  region: number,
  capStart = true,
  capEnd = true,
  squash = 1,
): void {
  const rings: number[][] = [];
  const up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dir = new THREE.Vector3();
    if (i === 0) dir.subVectors(pts[1], pts[0]);
    else if (i === pts.length - 1) dir.subVectors(pts[i], pts[i - 1]);
    else dir.subVectors(pts[i + 1], pts[i - 1]);
    dir.normalize();
    const side = new THREE.Vector3().crossVectors(dir, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const fwd = new THREE.Vector3().crossVectors(side, dir).normalize();
    const idx: number[] = [];
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const a = t * Math.PI * 2;
      const r = radii[i];
      const off = side.clone().multiplyScalar(Math.cos(a) * r).add(fwd.clone().multiplyScalar(Math.sin(a) * r * squash));
      idx.push(pushVert(s, p.x + off.x, p.y + off.y, p.z + off.z, t, i / (pts.length - 1), region));
    }
    rings.push(idx);
  }
  for (let i = 0; i < rings.length - 1; i++) bridge(s, rings[i], rings[i + 1]);
  const capIt = (r: number[], p: THREE.Vector3, flip: boolean) => {
    const c = pushVert(s, p.x, p.y, p.z, 0.5, flip ? 0 : 1, region);
    for (let i = 0; i < r.length; i++) {
      const j = (i + 1) % r.length;
      if (flip) s.index.push(c, r[j], r[i]);
      else s.index.push(c, r[i], r[j]);
    }
  };
  if (capStart) capIt(rings[0], pts[0].clone(), true);
  if (capEnd) capIt(rings[rings.length - 1], pts[pts.length - 1].clone(), false);
}

/** Sample a smooth chain through joints so elbows/knees round off. */
function chain(joints: THREE.Vector3[], radii: number[], perSeg: number): { pts: THREE.Vector3[]; rad: number[] } {
  const pts: THREE.Vector3[] = [];
  const rad: number[] = [];
  const curve = new THREE.CatmullRomCurve3(joints, false, 'catmullrom', 0.35);
  const total = (joints.length - 1) * perSeg;
  for (let i = 0; i <= total; i++) {
    const t = i / total;
    pts.push(curve.getPoint(t));
    const f = t * (joints.length - 1);
    const i0 = Math.min(joints.length - 2, Math.floor(f));
    rad.push(lerp(radii[i0], radii[i0 + 1], f - i0));
  }
  return { pts, rad };
}

/* ------------------------------------------------------------------ head */

const HEAD_SEG_U = 64;
const HEAD_SEG_V = 60;

/**
 * Vertical cross-section profile of the cranium, crown → under-chin.
 *
 * A sphere cannot describe a head: it converges to a point exactly where the
 * jaw and chin need mass. Sweeping explicit superellipse sections instead means
 * the chin ends up nearly as far forward as the nose base, as it is in life.
 *
 * `yn` is in half-heights from the head centre, `w`/`d` in half-width /
 * half-depth units, `cz` shifts the section forward, `e` is the superellipse
 * exponent (2 = ellipse, higher = boxier).
 */
const HEAD_PROFILE: { yn: number; w: number; d: number; cz: number; e: number }[] = [
  { yn: 1.0, w: 0.1, d: 0.16, cz: -0.1, e: 2.0 },
  { yn: 0.92, w: 0.38, d: 0.45, cz: -0.1, e: 2.0 },
  { yn: 0.8, w: 0.6, d: 0.66, cz: -0.1, e: 2.05 },
  { yn: 0.62, w: 0.83, d: 0.85, cz: -0.08, e: 2.1 },
  { yn: 0.42, w: 0.95, d: 0.93, cz: -0.05, e: 2.15 },
  { yn: 0.22, w: 1.0, d: 0.95, cz: -0.03, e: 2.2 },
  { yn: 0.06, w: 1.0, d: 0.94, cz: -0.02, e: 2.25 },
  { yn: -0.14, w: 0.98, d: 0.93, cz: 0.02, e: 2.35 },
  { yn: -0.32, w: 0.93, d: 0.9, cz: 0.05, e: 2.45 },
  { yn: -0.48, w: 0.86, d: 0.87, cz: 0.09, e: 2.5 },
  { yn: -0.64, w: 0.78, d: 0.83, cz: 0.12, e: 2.55 },
  { yn: -0.78, w: 0.66, d: 0.78, cz: 0.15, e: 2.6 },
  { yn: -0.88, w: 0.54, d: 0.73, cz: 0.17, e: 2.6 },
  { yn: -0.95, w: 0.42, d: 0.67, cz: 0.18, e: 2.5 },
  { yn: -1.0, w: 0.26, d: 0.52, cz: 0.14, e: 2.3 },
];

/** Vertical sampling: denser through the face than over the skull. */
const HEAD_T_TO_YN: [number, number][] = [
  [0, 1.0], [0.07, 0.9], [0.15, 0.74], [0.24, 0.56], [0.33, 0.4],
  [0.42, 0.24], [0.5, 0.12], [0.57, 0.02], [0.63, -0.1], [0.69, -0.22],
  [0.75, -0.36], [0.81, -0.5], [0.86, -0.62], [0.91, -0.76], [0.96, -0.9], [1, -1.0],
];

function sampleCurve(table: [number, number][], t: number): number {
  if (t <= table[0][0]) return table[0][1];
  if (t >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [t0, v0] = table[i];
    const [t1, v1] = table[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return lerp(v0, v1, k * k * (3 - 2 * k));
    }
  }
  return table[table.length - 1][1];
}

/** Base surface depth at a normalised height and horizontal position. */
function headSurfaceZ(yn: number, xn: number, W: number, D: number): number {
  const sec = headSection(yn);
  const p = 2 / sec.e;
  const ratio = clamp(Math.abs(xn) / Math.max(sec.w, 1e-4), 0, 1);
  const cosT = Math.pow(ratio, 1 / p);
  const sinT = Math.pow(Math.max(0, 1 - cosT * cosT), 0.5);
  void W;
  return sec.d * D * Math.pow(sinT, p) + sec.cz * D;
}

/** Interpolate the cross-section at a given normalised height. */
function headSection(yn: number): { w: number; d: number; cz: number; e: number } {
  const P = HEAD_PROFILE;
  if (yn >= P[0].yn) return P[0];
  if (yn <= P[P.length - 1].yn) return P[P.length - 1];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    if (yn <= a.yn && yn >= b.yn) {
      const k = (a.yn - yn) / (a.yn - b.yn);
      const s = k * k * (3 - 2 * k);
      return {
        w: lerp(a.w, b.w, s),
        d: lerp(a.d, b.d, s),
        cz: lerp(a.cz, b.cz, s),
        e: lerp(a.e, b.e, s),
      };
    }
  }
  return P[P.length - 1];
}

/**
 * Vertical face landmarks as fractions of the cranium half-height, measured
 * from the eye line. Getting these right matters more than any single feature:
 * if the mouth sits too high the whole lower face reads as an empty wedge.
 */
const FACE = {
  eye: 0.06,
  browRidge: 0.22,
  noseRoot: 0.11,
  noseBase: -0.4,
  mouthLine: -0.6,
  lipUpper: -0.552,
  lipLower: -0.648,
  chinTip: -0.92,
  jawCorner: -0.5,
  earCenter: -0.09,
};

function sculptHead(spec: CharacterSpec, d: Dim): {
  pos: Float32Array;
  uv: Float32Array;
  index: number[];
  count: number;
  jawWeight: Float32Array;
  landmarks: Record<string, THREE.Vector3>;
  uvLandmarks: Record<string, [number, number]>;
} {
  const f: FaceSpec = spec.face ?? {};
  const fem = d.fem;
  const jawWide = f.jaw ?? (fem ? -0.35 : 0.15);
  const cheek = f.cheek ?? (fem ? 0.35 : 0.1);
  const browHeavy = f.browHeavy ?? (fem ? -0.3 : 0.35);
  const noseLen = f.noseLength ?? 0;
  const noseWide = f.noseWidth ?? (fem ? -0.2 : 0.1);
  const lipFull = f.lipFull ?? (fem ? 0.45 : 0);
  const eyeSpacing = f.eyeSpacing ?? 0;
  const chinF = f.chin ?? (fem ? -0.1 : 0.3);
  const age = f.age ?? 30;

  const W = d.headW, D = d.headD, Hh = d.headHi;
  const uCount = HEAD_SEG_U, vCount = HEAD_SEG_V;
  const n = (uCount + 1) * (vCount + 1);
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const jawWeight = new Float32Array(n);
  const index: number[] = [];

  // Work in centimetres scaled to this character, so the anatomy is readable.
  const cm = 0.01 * (d.H / 1.8);
  const eyeY = FACE.eye * Hh;
  const eyeX = (0.4 + eyeSpacing * 0.05) * W;
  const mouthY = FACE.mouthLine + lipFull * 0.005;
  const noseBaseY = FACE.noseBase + noseLen * -0.035;
  const aged = smoothstep(28, 62, age);
  // Eyeball placement, needed while sculpting so the aperture can be carved
  // around it. Kept in sync with the landmarks emitted below.
  const eyeBallR = 0.0068 * d.H;
  const eyeBallZ = headSurfaceZ(FACE.eye, eyeX / W, W, D) - 1.1 * cm - eyeBallR + 0.3 * cm;

  const uvLandmarks: Record<string, [number, number]> = {};

  for (let vi = 0; vi <= vCount; vi++) {
    const t = vi / vCount;
    const yn0 = sampleCurve(HEAD_T_TO_YN, t);
    const sec = headSection(yn0);
    for (let ui = 0; ui <= uCount; ui++) {
      const u = ui / uCount;
      const theta = u * Math.PI * 2; // 0 at +X, PI/2 at +Z (forward)
      const ca = Math.cos(theta), sa = Math.sin(theta);
      const p = 2 / sec.e;
      // Swept superellipse section.
      let x = sec.w * W * Math.sign(ca) * Math.pow(Math.abs(ca), p);
      let y = yn0 * Hh;
      let z = sec.d * D * Math.sign(sa) * Math.pow(Math.abs(sa), p) + sec.cz * D;

      const front = clamp(Math.sign(sa) * Math.pow(Math.abs(sa), p * 0.7), -1, 1);
      const isFront = sa > 0;
      const faceMask = clamp(front * 1.4);
      const yn = yn0;
      const xn = x / W;
      const absXn = Math.abs(xn);

      /* ---- skull ---------------------------------------------------- */
      // Occipital bulge and a slightly flattened back plane.
      if (!isFront) {
        const back = -front;
        z -= back * gauss(yn - 0.14, 0.42) * 0.35 * cm;
      }
      // Temple hollow above the cheekbone, forward of the ear.
      const temple = gauss(yn - 0.3, 0.15) * gauss(absXn - 0.84, 0.18) * clamp(0.45 + front);
      x -= Math.sign(x || 1) * temple * 0.5 * cm;
      // Brow-to-temple transition: flatten the forehead plane slightly.
      const forehead = gauss(yn - 0.45, 0.2) * faceMask;
      z -= forehead * 0.25 * cm;

      /* ---- jaw, chin ------------------------------------------------ */
      // Mass at the gonial angle squares off the jaw.
      const gonial = gauss(yn - FACE.jawCorner, 0.14) * gauss(absXn - 0.66, 0.24) * (0.4 + 0.6 * faceMask);
      x += Math.sign(x || 1) * gonial * (0.45 + jawWide * 0.8) * cm;
      // Chin: mental protuberance on the midline.
      const chinMask = gauss(yn - FACE.chinTip, 0.13) * gauss(xn, 0.36) * faceMask;
      z += chinMask * (0.55 + chinF * 0.5) * cm;
      // Jawline crease running from chin to ear.
      const jawLine = gauss(yn - (FACE.jawCorner - 0.2), 0.07) * gauss(absXn - 0.52, 0.28) * faceMask;
      z -= jawLine * 0.3 * cm * (1 - aged * 0.4);
      // Soft tissue under the jaw sags with age and build.
      const jowl = gauss(yn - (FACE.jawCorner - 0.28), 0.1) * gauss(absXn - 0.4, 0.3) * faceMask * aged;
      z += jowl * 0.3 * cm;

      /* ---- cheeks --------------------------------------------------- */
      const cheekBone = gauss(yn - (FACE.eye - 0.14), 0.13) * gauss(absXn - 0.62, 0.22) * clamp(0.25 + front);
      z += cheekBone * (0.7 + cheek * 0.6) * cm;
      x += Math.sign(x || 1) * cheekBone * (0.45 + cheek * 0.5) * cm;
      // Buccal hollow below it; deeper with age and thin builds.
      const hollow = gauss(yn - (FACE.eye - 0.38), 0.1) * gauss(absXn - 0.5, 0.16) * faceMask;
      z -= hollow * (0.35 + aged * 0.5) * cm;

      /* ---- brow ----------------------------------------------------- */
      const brow = gauss(yn - FACE.browRidge, 0.085) * gauss(absXn - 0.28, 0.34) * faceMask;
      z += brow * (0.55 + browHeavy * 0.6) * cm;
      // Glabella between the brows, and the nasal root notch.
      const glab = gauss(yn - (FACE.browRidge - 0.02), 0.05) * gauss(xn, 0.1) * faceMask;
      z -= glab * 0.3 * cm;
      const root = gauss(yn - FACE.noseRoot, 0.05) * gauss(xn, 0.1) * faceMask;
      z -= root * 0.35 * cm;

      /* ---- eye sockets ---------------------------------------------- */
      // A deep recess, plus an explicitly carved almond aperture: inside the
      // aperture the skin is pushed behind the eyeball sphere so the eye is
      // always visible, and the rim of that carve forms the lid edges.
      for (const sx of [-1, 1]) {
        const ex = sx * eyeX;
        const dxm = x - ex;
        const dym = y - eyeY;
        const dx = dxm / (W * 0.42);
        const dy = dym / (Hh * 0.17);
        const r2 = dx * dx + dy * dy;
        const socket = Math.exp(-r2 * 1.15) * faceMask;
        z -= socket * 1.1 * cm;
        // Upper lid fold above the aperture.
        const fold = Math.exp(-(dx * dx * 1.1 + Math.pow(dy - 1.15, 2) * 2.4)) * faceMask;
        z += fold * 0.4 * cm;
        // Lower lid ridge.
        const lowLid = Math.exp(-(dx * dx * 1.2 + Math.pow(dy + 1.3, 2) * 3.2)) * faceMask;
        z += lowLid * 0.28 * cm;
        // Inner canthus notch by the nose.
        const canthus = Math.exp(-(Math.pow(dx + sx * -1.15, 2) * 4 + dy * dy * 3)) * faceMask;
        z -= canthus * 0.25 * cm;

        if (isFront) {
          const ap = Math.hypot(dxm / (1.32 * cm), dym / (0.5 * cm));
          const d2 = dxm * dxm + dym * dym;
          if (ap < 1.25 && d2 < eyeBallR * eyeBallR) {
            const zEye = eyeBallZ + Math.sqrt(eyeBallR * eyeBallR - d2);
            const behind = zEye - 0.045 * cm;
            const k = smoothstep(1.22, 0.72, ap);
            if (behind < z) z = lerp(z, behind, k);
          }
        }
      }

      /* ---- nose ------------------------------------------------------ */
      const along = clamp((FACE.noseRoot - yn) / (FACE.noseRoot - noseBaseY), 0, 1.25);
      if (isFront && along > 0.001 && along < 1.25) {
        const a01 = clamp(along);
        // Bridge: narrow and shallow at the root, widening to the tip.
        const width = (0.11 + noseWide * 0.035) * (0.5 + a01 * 0.8);
        const profile = Math.pow(Math.sin(Math.min(1, along) * Math.PI * 0.86), 0.7);
        const bridge = gauss(xn, width) * profile * faceMask;
        z += bridge * (1.9 + noseLen * 0.5) * cm;
        // Ball of the tip.
        const tip = gauss(along - 0.9, 0.1) * gauss(xn, 0.13) * faceMask;
        z += tip * 0.85 * cm;
        y -= tip * 0.2 * cm;
        // Alae, with a crease where they meet the cheek.
        for (const sx of [-1, 1]) {
          const ax = xn - sx * (0.17 + noseWide * 0.035);
          const wing = gauss(ax, 0.075) * gauss(along - 0.94, 0.085) * faceMask;
          z += wing * 0.6 * cm;
          x += sx * wing * 0.5 * cm;
          const crease = gauss(xn - sx * (0.26 + noseWide * 0.04), 0.05) * gauss(along - 0.96, 0.07) * faceMask;
          z -= crease * 0.4 * cm;
        }
        // Nostril openings and the columella between them.
        for (const sx of [-1, 1]) {
          const nostril = gauss(xn - sx * 0.1, 0.045) * gauss(along - 1.04, 0.05) * faceMask;
          z -= nostril * 0.75 * cm;
        }
        const columella = gauss(xn, 0.04) * gauss(along - 1.03, 0.06) * faceMask;
        z += columella * 0.2 * cm;
      }
      // Shadow under the nose base.
      const subnasal = gauss(yn - (noseBaseY - 0.04), 0.035) * gauss(xn, 0.2) * faceMask;
      z -= subnasal * 0.35 * cm;

      /* ---- mouth ----------------------------------------------------- */
      if (isFront) {
        const mw = 0.3 + lipFull * 0.04;
        const across = gauss(xn, mw);
        const upper = gauss(yn - (FACE.lipUpper + lipFull * 0.004), 0.032) * across * faceMask;
        const lowerLip = gauss(yn - (FACE.lipLower - lipFull * 0.004), 0.038) * across * faceMask;
        z += upper * (0.75 + lipFull * 0.5) * cm;
        z += lowerLip * (0.85 + lipFull * 0.55) * cm;
        // Vermilion line.
        const crease = gauss(yn - mouthY, 0.016) * across * faceMask;
        z -= crease * 0.55 * cm;
        // Cupid's bow: two small peaks either side of the midline.
        const bow = (gauss(xn - 0.07, 0.045) + gauss(xn + 0.07, 0.045)) * gauss(yn - (FACE.lipUpper + 0.03), 0.028) * faceMask;
        z += bow * 0.2 * cm;
        // Mouth corners tuck back.
        for (const sx of [-1, 1]) {
          const corner = gauss(xn - sx * (0.3 + lipFull * 0.03), 0.055) * gauss(yn - mouthY, 0.05) * faceMask;
          z -= corner * 0.55 * cm;
        }
        // Philtrum.
        const phil = gauss(yn - (FACE.lipUpper + 0.09), 0.06) * gauss(xn, 0.055) * faceMask;
        z -= phil * 0.3 * cm;
        // Mentolabial sulcus below the lower lip.
        const sulcus = gauss(yn - (FACE.lipLower - 0.1), 0.05) * gauss(xn, 0.26) * faceMask;
        z -= sulcus * 0.5 * cm;
        // Nasolabial folds.
        for (const sx of [-1, 1]) {
          const fold = gauss(xn - sx * 0.36, 0.075) * gauss(yn - (mouthY + 0.12), 0.11) * faceMask;
          z -= fold * (0.18 + aged * 0.42) * cm;
        }
      }

      const idx = vi * (uCount + 1) + ui;
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y;
      pos[idx * 3 + 2] = z;
      // Rotate U so the face is centred at 0.5 in texture space, which makes
      // the face texture (lips, brows, stubble) straightforward to author.
      uv[idx * 2] = (u + 0.25) % 1;
      uv[idx * 2 + 1] = 1 - t;
      // Jaw influence: everything below the mouth line, strongest at the chin.
      jawWeight[idx] = clamp(smoothstep(mouthY + 0.12, -0.95, yn) * (0.3 + 0.7 * clamp(front)));
      void absXn;
    }
  }

  /* UV positions of the features, for the face texture. */
  {
    const uvAt = (targetYn: number, targetXn: number): [number, number] => {
      // Invert the vertical remap.
      let bestT = 0, bestErr = 1e9;
      for (let i = 0; i <= 200; i++) {
        const tt = i / 200;
        const err = Math.abs(sampleCurve(HEAD_T_TO_YN, tt) - targetYn);
        if (err < bestErr) { bestErr = err; bestT = tt; }
      }
      const sec = headSection(targetYn);
      const p = 2 / sec.e;
      // Solve for theta such that the section's x equals targetXn * W.
      const ratio = clamp(Math.abs(targetXn) / Math.max(sec.w, 1e-4), 0, 1);
      const theta = Math.PI / 2 - Math.sign(targetXn || 1) * Math.acos(Math.min(1, Math.pow(ratio, 1 / p))) * -1;
      const th = targetXn >= 0 ? Math.acos(Math.pow(ratio, 1 / p)) : Math.PI - Math.acos(Math.pow(ratio, 1 / p));
      void theta;
      return [((th / (Math.PI * 2)) + 0.25) % 1, 1 - bestT];
    };
    uvLandmarks.eyeL = uvAt(FACE.eye, -eyeX / W);
    uvLandmarks.eyeR = uvAt(FACE.eye, eyeX / W);
    uvLandmarks.browL = uvAt(FACE.browRidge - 0.03, -eyeX / W);
    uvLandmarks.browR = uvAt(FACE.browRidge - 0.03, eyeX / W);
    uvLandmarks.mouth = uvAt(mouthY, 0);
    uvLandmarks.mouthL = uvAt(mouthY, -0.3);
    uvLandmarks.mouthR = uvAt(mouthY, 0.3);
    uvLandmarks.noseTip = uvAt(FACE.noseBase + 0.05, 0);
    uvLandmarks.noseBase = uvAt(FACE.noseBase, 0);
    uvLandmarks.chin = uvAt(FACE.chinTip, 0);
    uvLandmarks.jawL = uvAt(FACE.jawCorner, -0.66);
    uvLandmarks.jawR = uvAt(FACE.jawCorner, 0.66);
    uvLandmarks.foreheadTop = uvAt(0.5, 0);
  }

  for (let vi = 0; vi < vCount; vi++) {
    for (let ui = 0; ui < uCount; ui++) {
      const a = vi * (uCount + 1) + ui;
      const b = a + 1;
      const c = a + (uCount + 1);
      const dd = c + 1;
      index.push(a, b, c, b, dd, c);
    }
  }
  // Cap the under-chin ring with a fan; the neck passes up through it.
  {
    const base = vCount * (uCount + 1);
    for (let ui = 1; ui < uCount - 1; ui++) index.push(base, base + ui, base + ui + 1);
  }

  const eyeZ = eyeBallZ;

  const landmarks: Record<string, THREE.Vector3> = {
    eyeL: new THREE.Vector3(-eyeX, eyeY, eyeZ),
    eyeR: new THREE.Vector3(eyeX, eyeY, eyeZ),
    mouth: new THREE.Vector3(0, mouthY * Hh, headSurfaceZ(mouthY, 0, W, D) + 0.6 * cm),
    noseTip: new THREE.Vector3(0, (FACE.noseBase + 0.08) * Hh, headSurfaceZ(FACE.noseBase + 0.08, 0, W, D) + 1.9 * cm),
    earL: new THREE.Vector3(-W * 0.93, FACE.earCenter * Hh, -D * 0.2),
    earR: new THREE.Vector3(W * 0.93, FACE.earCenter * Hh, -D * 0.2),
    browL: new THREE.Vector3(-eyeX, (FACE.browRidge - 0.03) * Hh, headSurfaceZ(FACE.browRidge - 0.03, eyeX / W, W, D) + 0.5 * cm),
    browR: new THREE.Vector3(eyeX, (FACE.browRidge - 0.03) * Hh, headSurfaceZ(FACE.browRidge - 0.03, eyeX / W, W, D) + 0.5 * cm),
    crown: new THREE.Vector3(0, Hh, 0),
  };

  return { pos, uv, index, count: n, jawWeight, landmarks, uvLandmarks };
}

/** Laplacian smoothing over a grid-topology head to clean up the sculpt. */
function smoothGrid(pos: Float32Array, uCount: number, vCount: number, iterations: number, amount: number): void {
  const w = uCount + 1;
  const tmp = new Float32Array(pos.length);
  for (let it = 0; it < iterations; it++) {
    tmp.set(pos);
    for (let vi = 1; vi < vCount; vi++) {
      for (let ui = 0; ui <= uCount; ui++) {
        const i = vi * w + ui;
        const l = vi * w + ((ui - 1 + uCount) % uCount);
        const r = vi * w + ((ui + 1) % uCount);
        const u = (vi - 1) * w + ui;
        const dn = (vi + 1) * w + ui;
        for (let k = 0; k < 3; k++) {
          const avg = (tmp[l * 3 + k] + tmp[r * 3 + k] + tmp[u * 3 + k] + tmp[dn * 3 + k]) * 0.25;
          pos[i * 3 + k] = lerp(tmp[i * 3 + k], avg, amount);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ body */

export type BodyBuild = {
  geometry: THREE.BufferGeometry;
  landmarks: Record<string, THREE.Vector3>;
  /** UV positions of face features, for the painted face map. */
  uvLandmarks: Record<string, [number, number]>;
  rig: Rig;
  dims: Dim;
  /** Order of the morph targets added to the geometry. */
  morphNames: string[];
};

/** Expression morph targets, generated as vertex offsets over the head. */
export const MORPHS = ['browUp', 'browAngry', 'squint', 'smile', 'frown', 'mouthOpenWide'] as const;
export type MorphName = (typeof MORPHS)[number];

export function buildBody(spec: CharacterSpec, quality = 1): BodyBuild {
  const d = dimensions(spec);
  const rig = buildRig(spec);
  const s = newSoup();
  const segs = Math.max(10, Math.round(18 * quality));
  const limbSegs = Math.max(8, Math.round(14 * quality));
  const fem = d.fem;

  /* Torso: hips → shoulders. Lower superellipse exponents and a narrower
     chest keep it from reading as a slab; the trapezius yoke near the top
     gives the shoulders a natural slope. */
  const sections: [number, number, number, number, number][] = [
    // y,                    halfW,                                       halfD,                                  expo, centerZ
    [d.hipY - 0.08 * d.H, 0.079 * d.H * d.w * (1 + fem * 0.08), 0.056 * d.H * d.w, 2.15, 0],
    [d.hipY - 0.025 * d.H, 0.086 * d.H * d.w * (1 + fem * 0.09), 0.06 * d.H * d.w, 2.2, 0],
    [d.hipY + 0.025 * d.H, 0.076 * d.H * d.w * (1 - fem * 0.04), 0.054 * d.H * d.w, 2.25, 0.002 * d.H],
    [d.spineY, 0.071 * d.H * d.w * (1 - fem * 0.07), 0.052 * d.H * d.w, 2.3, 0.004 * d.H],
    [d.spineY + 0.05 * d.H, 0.081 * d.H * d.w, 0.057 * d.H * d.w * (1 + fem * 0.08), 2.35, 0.005 * d.H],
    [d.chestY, 0.091 * d.H * d.w, 0.063 * d.H * d.w * (1 + fem * 0.07), 2.4, 0.003 * d.H],
    [d.chestY + 0.045 * d.H, 0.094 * d.H * d.w, 0.058 * d.H * d.w, 2.45, -0.001 * d.H],
    [d.shoulderY + 0.005 * d.H, 0.079 * d.H * d.w, 0.05 * d.H * d.w, 2.3, -0.005 * d.H],
    [d.neckY - 0.012 * d.H, 0.047 * d.H * d.w, 0.039 * d.H * d.w, 2.15, -0.006 * d.H],
  ];
  const rings: number[][] = [];
  for (let i = 0; i < sections.length; i++) {
    const [y, hw, hd, ex, cz] = sections[i];
    const region = y < d.hipY ? REGION.HIPS : REGION.TORSO;
    rings.push(ring(s, y, hw, hd, ex, cz, segs, i / (sections.length - 1), region));
  }
  for (let i = 0; i < rings.length - 1; i++) bridge(s, rings[i], rings[i + 1]);
  // Cap the hips; thighs grow out of it.
  {
    const c = pushVert(s, 0, d.hipY - 0.085 * d.H, 0, 0.5, 0, REGION.HIPS);
    const r0 = rings[0];
    for (let i = 0; i < r0.length; i++) s.index.push(c, r0[(i + 1) % r0.length], r0[i]);
  }

  /* neck */
  tube(
    s,
    [
      new THREE.Vector3(0, d.neckY - 0.03 * d.H, -0.004 * d.H),
      new THREE.Vector3(0, d.neckY + 0.02 * d.H, -0.002 * d.H),
      new THREE.Vector3(0, d.headY + 0.008 * d.H, 0.002 * d.H),
    ],
    [d.neckR * 1.25, d.neckR, d.neckR * 1.02],
    Math.max(10, segs - 4),
    REGION.NECK,
    false,
    false,
    0.86,
  );

  /* arms and legs */
  for (const side of [-1, 1]) {
    const S = side < 0 ? 'L' : 'R';
    const armRegion = side < 0 ? REGION.ARM_L : REGION.ARM_R;
    const legRegion = side < 0 ? REGION.LEG_L : REGION.LEG_R;
    const g = (n: BoneName) => rig.restWorld.get(n)!.clone();

    const shoulderPt = g(`arm${S}` as BoneName).clone();
    shoulderPt.y += 0.012 * d.H;
    const armChain = chain(
      [
        new THREE.Vector3(side * d.shoulderX * 0.42, d.shoulderY + 0.03 * d.H, 0),
        shoulderPt,
        g(`foreArm${S}` as BoneName),
        g(`hand${S}` as BoneName),
      ],
      [d.armR * 1.5, d.armR * 1.12, d.elbowR, d.wristR],
      Math.max(3, Math.round(4 * quality)),
    );
    tube(s, armChain.pts, armChain.rad, limbSegs, armRegion, false, true, 0.92);

    const legChain = chain(
      [
        new THREE.Vector3(side * d.hipJointX, d.hipY + 0.01 * d.H, 0),
        new THREE.Vector3(side * d.hipJointX, d.hipY - 0.06 * d.H, 0),
        g(`shin${S}` as BoneName),
        g(`foot${S}` as BoneName),
      ],
      [d.thighR * 1.24, d.thighR, d.kneeR, d.ankleR],
      Math.max(3, Math.round(4 * quality)),
    );
    tube(s, legChain.pts, legChain.rad, limbSegs, legRegion, false, true, 0.94);
  }

  /* head */
  const head = sculptHead(spec, d);
  smoothGrid(head.pos, HEAD_SEG_U, HEAD_SEG_V, 1, 0.28);
  const headOffset = new THREE.Vector3(0, d.headCenterY, 0.004 * d.H);
  const headBase = s.pos.length / 3;
  const idxBodyEnd = s.index.length;
  const headJaw: number[] = [];
  for (let i = 0; i < head.count; i++) {
    pushVert(
      s,
      head.pos[i * 3] + headOffset.x,
      head.pos[i * 3 + 1] + headOffset.y,
      head.pos[i * 3 + 2] + headOffset.z,
      head.uv[i * 2],
      head.uv[i * 2 + 1],
      REGION.HEAD,
    );
    headJaw.push(head.jawWeight[i]);
  }
  for (let i = 0; i < head.index.length; i++) s.index.push(headBase + head.index[i]);
  const idxHeadEnd = s.index.length;

  /* ears: thin ellipsoid shells raked slightly backwards, with a concha dent */
  for (const side of [-1, 1]) {
    const lm = side < 0 ? head.landmarks.earL : head.landmarks.earR;
    const c = lm.clone().add(headOffset);
    const rx = 0.0022 * d.H, ry = 0.015 * d.H, rz = 0.0078 * d.H;
    const uSeg = 12, vSeg = 10;
    const rings: number[][] = [];
    for (let vi = 0; vi <= vSeg; vi++) {
      const phi = (vi / vSeg) * Math.PI;
      const idx: number[] = [];
      for (let ui = 0; ui < uSeg; ui++) {
        const th = (ui / uSeg) * Math.PI * 2;
        let px = Math.sin(phi) * Math.cos(th) * rx;
        const py = Math.cos(phi) * ry;
        let pz = Math.sin(phi) * Math.sin(th) * rz;
        // Flatten the inner face against the skull and dent the bowl.
        const outward = side * px > 0 ? 1 : 0.35;
        px *= outward;
        const bowl = gauss(Math.cos(phi) - 0.05, 0.35) * gauss(Math.sin(phi) * Math.sin(th) / rz + 0.2, 0.5);
        px -= side * bowl * rx * 0.55 * outward;
        pz += Math.cos(phi) * rz * 0.22; // rake back at the top
        idx.push(pushVert(s, c.x + px - side * rx * 0.6, c.y + py, c.z + pz, ui / uSeg, vi / vSeg, REGION.HEAD));
      }
      rings.push(idx);
    }
    for (let i = 0; i < rings.length - 1; i++) bridge(s, rings[i], rings[i + 1], side > 0);
  }

  /* ------------------------------------------------------------ assemble */
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
  geometry.setAttribute('aRegion', new THREE.Float32BufferAttribute(s.region, 1));
  geometry.setIndex(s.index);
  geometry.computeVertexNormals();

  // Two material slots: the painted face map on the head, plain skin elsewhere.
  geometry.clearGroups();
  geometry.addGroup(0, idxBodyEnd, 0);
  geometry.addGroup(idxBodyEnd, idxHeadEnd - idxBodyEnd, 1);
  if (s.index.length > idxHeadEnd) geometry.addGroup(idxHeadEnd, s.index.length - idxHeadEnd, 0);

  addFaceMorphs(geometry, head, headBase, d);
  autoSkin(geometry, rig, headJaw, headBase, d);

  const landmarks: Record<string, THREE.Vector3> = {};
  for (const [k, v] of Object.entries(head.landmarks)) landmarks[k] = v.clone().add(headOffset);
  landmarks.headCenter = headOffset.clone();
  landmarks.chest = new THREE.Vector3(0, d.chestY, 0.06 * d.H);
  landmarks.hips = new THREE.Vector3(0, d.hipY, 0);

  return { geometry, landmarks, uvLandmarks: head.uvLandmarks, rig, dims: d, morphNames: [...MORPHS] };
}

/**
 * Expression morphs, generated from the same landmark space as the sculpt.
 * These carry the acting: brows and lids do most of the emotional work in a
 * dialogue close-up, and the jaw bone handles speech.
 */
function addFaceMorphs(
  geo: THREE.BufferGeometry,
  head: { pos: Float32Array; count: number },
  headBase: number,
  d: Dim,
): void {
  const pos = geo.getAttribute('position');
  const total = pos.count;
  const cm = 0.01 * (d.H / 1.8);
  const Hh = d.headHi, W = d.headW;
  const targets: Record<string, Float32Array> = {};
  for (const name of MORPHS) targets[name] = new Float32Array(total * 3);

  for (let i = 0; i < head.count; i++) {
    const vi = headBase + i;
    const lx = head.pos[i * 3];
    const ly = head.pos[i * 3 + 1];
    const lz = head.pos[i * 3 + 2];
    const yn = ly / Hh;
    const xn = lx / W;
    const facing = clamp(lz / (d.headD * 0.7));
    const eyeX = 0.4;

    // Brow raise: lift the brow band and the forehead a little.
    {
      const w = gauss(yn - FACE.browRidge, 0.11) * facing;
      targets.browUp[vi * 3 + 1] += w * 0.55 * cm;
      targets.browUp[vi * 3 + 2] += w * 0.15 * cm;
    }
    // Angry: inner brows down and together, outer slightly up.
    {
      const inner = gauss(yn - FACE.browRidge, 0.1) * gauss(Math.abs(xn) - 0.16, 0.16) * facing;
      const outer = gauss(yn - FACE.browRidge, 0.1) * gauss(Math.abs(xn) - 0.62, 0.18) * facing;
      targets.browAngry[vi * 3 + 1] += (-inner * 0.6 + outer * 0.18) * cm;
      targets.browAngry[vi * 3] += -Math.sign(xn || 1) * inner * 0.3 * cm;
      targets.browAngry[vi * 3 + 2] += inner * 0.25 * cm;
    }
    // Squint: lower lids up, crow's-feet pinch.
    {
      for (const sx of [-1, 1]) {
        const dx = (xn - sx * eyeX) / 0.42;
        const dy = (yn - FACE.eye) / 0.17;
        const low = Math.exp(-(dx * dx * 1.2 + Math.pow(dy + 1.0, 2) * 2.2)) * facing;
        targets.squint[vi * 3 + 1] += low * 0.35 * cm;
        targets.squint[vi * 3 + 2] += low * 0.2 * cm;
      }
    }
    // Smile: corners up and back, cheeks lift.
    {
      for (const sx of [-1, 1]) {
        const corner = gauss(xn - sx * 0.3, 0.11) * gauss(yn - FACE.mouthLine, 0.09) * facing;
        targets.smile[vi * 3] += sx * corner * 0.5 * cm;
        targets.smile[vi * 3 + 1] += corner * 0.65 * cm;
        targets.smile[vi * 3 + 2] += -corner * 0.15 * cm;
        const cheek = gauss(xn - sx * 0.55, 0.16) * gauss(yn - (FACE.eye - 0.3), 0.14) * facing;
        targets.smile[vi * 3 + 1] += cheek * 0.3 * cm;
        targets.smile[vi * 3 + 2] += cheek * 0.35 * cm;
      }
    }
    // Frown: corners down, chin tightens.
    {
      for (const sx of [-1, 1]) {
        const corner = gauss(xn - sx * 0.3, 0.11) * gauss(yn - FACE.mouthLine, 0.09) * facing;
        targets.frown[vi * 3] += sx * corner * 0.15 * cm;
        targets.frown[vi * 3 + 1] += -corner * 0.6 * cm;
      }
      const chin = gauss(yn - FACE.chinTip, 0.12) * gauss(xn, 0.3) * facing;
      targets.frown[vi * 3 + 2] += chin * 0.2 * cm;
    }
    // Wide mouth (for shouting), independent of the jaw bone.
    {
      const m = gauss(yn - FACE.mouthLine, 0.1) * gauss(xn, 0.34) * facing;
      targets.mouthOpenWide[vi * 3] += Math.sign(xn || 1) * m * 0.45 * cm;
      targets.mouthOpenWide[vi * 3 + 1] += -gauss(yn - (FACE.mouthLine - 0.06), 0.08) * facing * 0.4 * cm;
    }
  }

  geo.morphAttributes.position = MORPHS.map((name) => {
    const a = new THREE.Float32BufferAttribute(targets[name], 3);
    a.name = name;
    return a;
  });
  geo.morphTargetsRelative = true;
}

/* --------------------------------------------------------------- skinning */

type Seg = { a: THREE.Vector3; b: THREE.Vector3; bone: number; falloff: number; regions?: number[] };

function distToSeg(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = new THREE.Vector3().subVectors(b, a);
  const t = clamp(new THREE.Vector3().subVectors(p, a).dot(ab) / Math.max(ab.lengthSq(), 1e-8));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

function autoSkin(geo: THREE.BufferGeometry, rig: Rig, headJaw: number[], headBase: number, d: Dim): void {
  const idxOf = (n: BoneName) => rig.bones.indexOf(rig.byName[n]);
  const W = rig.restWorld;
  const segs: Seg[] = [];
  const add = (from: BoneName, to: BoneName, bone: BoneName, falloff: number, regions?: number[]) =>
    segs.push({ a: W.get(from)!, b: W.get(to)!, bone: idxOf(bone), falloff, regions });

  add('hips', 'spine', 'hips', 0.14 * d.H);
  add('spine', 'chest', 'spine', 0.14 * d.H);
  add('chest', 'neck', 'chest', 0.14 * d.H);
  add('neck', 'head', 'neck', 0.055 * d.H);
  add('head', 'head', 'head', 0.13 * d.H);
  for (const S of ['L', 'R'] as const) {
    const reg = S === 'L' ? [REGION.ARM_L] : [REGION.ARM_R];
    add(`shoulder${S}` as BoneName, `arm${S}` as BoneName, `shoulder${S}` as BoneName, 0.055 * d.H);
    add(`arm${S}` as BoneName, `foreArm${S}` as BoneName, `arm${S}` as BoneName, 0.05 * d.H, reg);
    add(`foreArm${S}` as BoneName, `hand${S}` as BoneName, `foreArm${S}` as BoneName, 0.045 * d.H, reg);
    const legReg = S === 'L' ? [REGION.LEG_L] : [REGION.LEG_R];
    add(`thigh${S}` as BoneName, `shin${S}` as BoneName, `thigh${S}` as BoneName, 0.07 * d.H, legReg);
    add(`shin${S}` as BoneName, `foot${S}` as BoneName, `shin${S}` as BoneName, 0.055 * d.H, legReg);
    add(`foot${S}` as BoneName, `toe${S}` as BoneName, `foot${S}` as BoneName, 0.04 * d.H, legReg);
  }

  const pos = geo.getAttribute('position');
  const region = geo.getAttribute('aRegion');
  const count = pos.count;
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const jawIdx = idxOf('jaw');
  const headIdx = idxOf('head');
  const p = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    const reg = region.getX(i);

    if (i >= headBase && reg === REGION.HEAD) {
      const jw = headJaw[i - headBase] ?? 0;
      skinIndex[i * 4] = headIdx;
      skinIndex[i * 4 + 1] = jawIdx;
      skinWeight[i * 4] = 1 - jw * 0.85;
      skinWeight[i * 4 + 1] = jw * 0.85;
      continue;
    }

    const cands: { bone: number; w: number }[] = [];
    for (const sg of segs) {
      if (sg.regions && !sg.regions.includes(reg)) continue;
      // Torso segments should not grab limb vertices and vice versa.
      const dist = distToSeg(p, sg.a, sg.b);
      const w = Math.pow(1 / Math.max(dist, 1e-4), 3.2) * Math.exp(-dist / sg.falloff);
      if (w > 0) cands.push({ bone: sg.bone, w });
    }
    cands.sort((a, b) => b.w - a.w);
    const top = cands.slice(0, 4);
    const sum = top.reduce((acc, c) => acc + c.w, 0) || 1;
    for (let k = 0; k < 4; k++) {
      skinIndex[i * 4 + k] = top[k]?.bone ?? 0;
      skinWeight[i * 4 + k] = (top[k]?.w ?? 0) / sum;
    }
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
}

/* ------------------------------------------------------- extremity meshes */

export type HandPose = 'relaxed' | 'grip' | 'open' | 'fist';

/** Hands are separate rigid meshes parented to the wrist bones. */
export function buildHand(d: Dim, side: -1 | 1, pose: HandPose = 'relaxed'): THREE.BufferGeometry {
  const s = newSoup();
  const scale = d.H;
  const palmW = 0.048 * scale * d.w;
  const palmL = 0.052 * scale;
  const palmT = 0.019 * scale;

  // Palm block, slightly wedge-shaped.
  const palmRings: number[][] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -t * palmL;
    const w = palmW * (0.78 + 0.22 * Math.sin(t * Math.PI * 0.8));
    const th = palmT * (1 - t * 0.22);
    palmRings.push(ring(s, y, w * 0.5, th * 0.5, 3.2, 0, 12, t, 0));
  }
  for (let i = 0; i < palmRings.length - 1; i++) bridge(s, palmRings[i], palmRings[i + 1]);
  {
    const c = pushVert(s, 0, 0.004 * scale, 0, 0.5, 0, 0);
    const r0 = palmRings[0];
    for (let i = 0; i < r0.length; i++) s.index.push(c, r0[(i + 1) % r0.length], r0[i]);
  }

  const curl = pose === 'fist' ? 1 : pose === 'grip' ? 0.72 : pose === 'open' ? 0.06 : 0.26;
  const fingerLens = [0.042, 0.046, 0.043, 0.035].map((v) => v * scale);
  for (let f = 0; f < 4; f++) {
    const x = (-0.36 + f * 0.24) * palmW * side * -1;
    const baseY = -palmL;
    const L = fingerLens[f];
    const pts: THREE.Vector3[] = [];
    const rad: number[] = [];
    const n = 6;
    let ang = 0;
    const cx = x, cy = baseY, cz = 0;
    let px = cx, py = cy, pz = cz;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector3(px, py, pz));
      rad.push((0.0092 - t * 0.0026) * scale * d.w);
      ang += (curl * Math.PI * 0.62) / n;
      const step = L / n;
      px += 0;
      py -= Math.cos(ang) * step;
      pz += Math.sin(ang) * step;
    }
    tube(s, pts, rad, 8, 0, true, true, 1);
  }
  // Thumb, splayed out and forward.
  {
    const pts: THREE.Vector3[] = [];
    const rad: number[] = [];
    const n = 5;
    const dir = new THREE.Vector3(side * -0.62, -0.5, 0.6).normalize();
    const start = new THREE.Vector3(side * -palmW * 0.4, -palmL * 0.3, palmT * 0.1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bend = new THREE.Vector3(0, -t * t * 0.008 * scale, t * t * curl * 0.02 * scale);
      pts.push(start.clone().addScaledVector(dir, t * 0.05 * scale).add(bend));
      rad.push((0.0112 - t * 0.0028) * scale * d.w);
    }
    tube(s, pts, rad, 8, 0, true, true, 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
  geo.setIndex(s.index);
  geo.computeVertexNormals();
  return geo;
}

/** Shoe / boot volume around the foot bone. */
export function buildShoe(d: Dim): THREE.BufferGeometry {
  const s = newSoup();
  const scale = d.H;
  const L = 0.155 * scale;
  const W = 0.055 * scale * d.w;
  const rings: number[][] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = -L * 0.28 + t * L;
    const w = W * (0.72 + 0.32 * Math.sin(clamp(t * 1.15, 0, 1) * Math.PI));
    const hTop = (0.055 - t * 0.032) * scale;
    const idx: number[] = [];
    const segsN = 14;
    for (let k = 0; k < segsN; k++) {
      const a = (k / segsN) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const rx = w * 0.5 * Math.sign(ca) * Math.pow(Math.abs(ca), 0.55);
      const ry = hTop * 0.5 * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7);
      idx.push(pushVert(s, rx, hTop * 0.5 + ry - 0.004 * scale, z, k / segsN, t, 0));
    }
    rings.push(idx);
  }
  for (let i = 0; i < rings.length - 1; i++) bridge(s, rings[i], rings[i + 1]);
  const capA = pushVert(s, 0, 0.02 * scale, -L * 0.3, 0.5, 0, 0);
  for (let i = 0; i < rings[0].length; i++) s.index.push(capA, rings[0][(i + 1) % rings[0].length], rings[0][i]);
  const last = rings[rings.length - 1];
  const capB = pushVert(s, 0, 0.012 * scale, -L * 0.28 + L, 0.5, 1, 0);
  for (let i = 0; i < last.length; i++) s.index.push(capB, last[i], last[(i + 1) % last.length]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
  geo.setIndex(s.index);
  geo.computeVertexNormals();
  return geo;
}

export { dimensions };
export type { Dim };
