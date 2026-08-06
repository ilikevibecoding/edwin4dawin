/**
 * Parametric head.
 *
 * Head space: the chin sits at y = 0, the crown at y = `height`, the face looks
 * down +Z. A lofted skull (a sphere modulated by width/depth/centre profiles) is
 * sculpted by soft-falloff deformers — effectively digital clay brushes — all
 * positioned from anatomical landmarks so one sculpt scales from child to adult.
 *
 * Expressions and visemes are baked as morph targets from region masks. Eyelids
 * are separate spherical shells (see Face.ts) so blinks work without cutting an
 * eye aperture into the mesh.
 */
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../engine/Noise';

export interface Deformer {
  /** Centre of influence, in head-local metres. */
  p: [number, number, number];
  dir: [number, number, number];
  amount: number;
  /** Isotropic influence radius. Ignored when `radii` is given. */
  radius?: number;
  radii?: [number, number, number];
  /** Falloff sharpness; higher is tighter. */
  falloff?: number;
  /** Also apply the X-mirrored version. */
  mirror?: boolean;
  alongNormal?: boolean;
}

export interface HeadShape {
  /** Chin-to-crown height in metres (adult ~0.235). */
  height: number;
  halfWidth: number;
  halfDepth: number;
  /** Silhouette profiles as [t, value], t = 0 at the chin, 1 at the crown. */
  widthProfile?: [number, number][];
  depthProfile?: [number, number][];
  centerZProfile?: [number, number][];
  deformers: Deformer[];
  /** Eye centre (right side; mirrored for the left). */
  eye: { x: number; y: number; z: number; radius: number };
  irisColor: [number, number, number];
  brow: { thickness: number; y: number; arch: number; color: number };
  /** Jaw hinge for the jawOpen morph. */
  jawPivot: [number, number, number];
  earPos: [number, number, number];
  ledPos: [number, number, number];
  mouthCenter: [number, number, number];
  skinTone: [number, number, number];
  android: boolean;
  ledSide: 1 | -1;
  lipTint: [number, number, number];
  /** Beard shadow across jaw and upper lip, 0..1. */
  stubble?: number;
  blush?: number;
  eyeShadow?: number;
}

/** Anatomical landmarks, as fractions of chin-to-crown height. */
export const FACE_RATIOS = {
  chinFront: 0.075,
  jawAngleY: 0.3,
  jawAngleX: 0.86,
  mouthLine: 0.215,
  lowerLip: 0.185,
  upperLip: 0.247,
  noseBase: 0.285,
  noseTip: 0.315,
  noseRoot: 0.5,
  eyeY: 0.475,
  eyeX: 0.423,
  browY: 0.545,
  cheekY: 0.42,
  cheekX: 0.78,
  templeY: 0.58,
  templeX: 0.95,
  earY: 0.44,
  earX: 0.95,
  earZ: -0.16,
  foreheadY: 0.7,
  hairlineY: 0.8,
} as const;

export interface HeadLandmarks {
  h: number;
  hw: number;
  hd: number;
  /** Surface point on the front of the face at height fraction t, offset by x. */
  front: (t: number, x?: number) => [number, number, number];
  y: (t: number) => number;
  chinFront: [number, number, number];
  jawAngle: [number, number, number];
  mouthLine: [number, number, number];
  lowerLip: [number, number, number];
  upperLip: [number, number, number];
  noseBase: [number, number, number];
  noseTip: [number, number, number];
  noseRoot: [number, number, number];
  eye: [number, number, number];
  brow: [number, number, number];
  cheek: [number, number, number];
  temple: [number, number, number];
  ear: [number, number, number];
  forehead: [number, number, number];
  mouthCorner: [number, number, number];
}

const DEFAULT_WIDTH_PROFILE: [number, number][] = [
  [0, 0.45], [0.1, 0.8], [0.2, 0.93], [0.32, 0.97], [0.45, 1], [0.6, 1.02], [0.75, 1], [0.88, 0.94], [1, 0.8],
];
const DEFAULT_DEPTH_PROFILE: [number, number][] = [
  [0, 0.55], [0.1, 0.72], [0.22, 0.82], [0.35, 0.9], [0.5, 0.97], [0.62, 1], [0.78, 1], [0.9, 0.95], [1, 0.85],
];
const DEFAULT_CZ_PROFILE: [number, number][] = [
  [0, 0.3], [0.1, 0.26], [0.22, 0.18], [0.35, 0.1], [0.5, 0.02], [0.62, -0.06], [0.78, -0.08], [0.9, -0.06], [1, -0.04],
];

function sampleCurve(curve: [number, number][], t: number): number {
  if (t <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < curve.length - 1; i++) {
    const [ta, va] = curve[i];
    const [tb, vb] = curve[i + 1];
    if (t >= ta && t <= tb) {
      let k = (t - ta) / (tb - ta);
      k = k * k * (3 - 2 * k);
      return va + (vb - va) * k;
    }
  }
  return last[1];
}

/** Surface position of the lofted base head at (theta, phi). */
function baseSurface(shape: HeadShape, theta: number, phi: number, out: [number, number, number]) {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const t = (1 + ct) / 2; // 1 at the crown, 0 at the chin
  const w = shape.halfWidth * st * sampleCurve(shape.widthProfile ?? DEFAULT_WIDTH_PROFILE, t);
  const d = shape.halfDepth * st * sampleCurve(shape.depthProfile ?? DEFAULT_DEPTH_PROFILE, t);
  const cz = shape.halfDepth * sampleCurve(shape.centerZProfile ?? DEFAULT_CZ_PROFILE, t);
  out[0] = Math.sin(phi) * w;
  out[1] = shape.height * t;
  out[2] = cz + Math.cos(phi) * d;
  return out;
}

export function headLandmarks(shape: HeadShape): HeadLandmarks {
  const h = shape.height;
  const R = FACE_RATIOS;
  const tmp: [number, number, number] = [0, 0, 0];

  const front = (t: number, x = 0): [number, number, number] => {
    // Solve for the phi that lands on the requested x at this height
    const theta = Math.acos(Math.max(-1, Math.min(1, 2 * t - 1)));
    const st = Math.sin(theta);
    const w = shape.halfWidth * st * sampleCurve(shape.widthProfile ?? DEFAULT_WIDTH_PROFILE, t);
    const phi = Math.asin(Math.max(-1, Math.min(1, w > 1e-6 ? x / w : 0)));
    baseSurface(shape, theta, phi, tmp);
    return [tmp[0], tmp[1], tmp[2]];
  };

  const eyeX = shape.halfWidth * R.eyeX;
  return {
    h,
    hw: shape.halfWidth,
    hd: shape.halfDepth,
    front,
    y: (t: number) => h * t,
    chinFront: front(R.chinFront),
    jawAngle: front(R.jawAngleY, shape.halfWidth * R.jawAngleX * 0.72),
    mouthLine: front(R.mouthLine),
    lowerLip: front(R.lowerLip),
    upperLip: front(R.upperLip),
    noseBase: front(R.noseBase),
    noseTip: front(R.noseTip),
    noseRoot: front(R.noseRoot),
    eye: front(R.eyeY, eyeX),
    brow: front(R.browY, eyeX),
    cheek: front(R.cheekY, shape.halfWidth * R.cheekX * 0.8),
    temple: front(R.templeY, shape.halfWidth * R.templeX * 0.85),
    ear: [shape.halfWidth * R.earX, h * R.earY, shape.halfDepth * R.earZ],
    forehead: front(R.foreheadY),
    mouthCorner: front(R.mouthLine, shape.halfWidth * 0.35),
  };
}

/** The canonical face sculpt, shared by every character before personalisation. */
export function baseFaceDeformers(shape: HeadShape): Deformer[] {
  const L = headLandmarks(shape);
  const h = L.h;
  const hw = L.hw;
  // Brush sizes are fractions of head height so a child's face scales with it
  const s = (v: number) => v * h;
  const at = (p: [number, number, number], dx = 0, dy = 0, dz = 0): [number, number, number] => [
    p[0] + dx, p[1] + dy, p[2] + dz,
  ];

  return [
    // --- cranium ---
    { p: [0, s(0.62), -L.hd * 0.98], dir: [0, 0, 1], amount: s(0.05), radius: s(0.36), falloff: 1.6 },
    { p: [0, s(1), -L.hd * 0.1], dir: [0, -1, 0], amount: s(0.025), radius: s(0.26), falloff: 2 },
    { p: at(L.temple, 0, 0, -s(0.02)), dir: [-1, 0, 0], amount: s(0.026), radius: s(0.14), mirror: true },
    { p: L.forehead, dir: [0, 0, -1], amount: s(0.036), radius: s(0.24), falloff: 1.6 },

    // --- brow ridge ---
    { p: at(L.brow, 0, 0, -s(0.01)), dir: [0, 0, 1], amount: s(0.036), radii: [s(0.13), s(0.07), s(0.13)], mirror: true },
    { p: L.front(FACE_RATIOS.browY - 0.01), dir: [0, 0, 1], amount: s(0.014), radius: s(0.075) },
    // Supraorbital shelf that shadows the socket
    { p: at(L.brow, 0.002, -s(0.05), -s(0.006)), dir: [0, 0.4, 0.9], amount: s(0.013), radii: [s(0.11), s(0.042), s(0.085)], mirror: true },

    // --- eye sockets ---
    { p: L.eye, dir: [0, 0, -1], amount: s(0.072), radii: [s(0.135), s(0.1), s(0.125)], mirror: true },
    { p: at(L.eye, 0, s(0.052), -s(0.014)), dir: [0, 0, 1], amount: s(0.017), radii: [s(0.11), s(0.038), s(0.085)], mirror: true },
    { p: at(L.eye, 0, -s(0.055), -s(0.014)), dir: [0, 0, 1], amount: s(0.015), radii: [s(0.11), s(0.038), s(0.085)], mirror: true },
    { p: at(L.eye, -hw * 0.2, -s(0.012), s(0.004)), dir: [0, 0, -1], amount: s(0.021), radius: s(0.055), mirror: true },

    // --- nose ---
    { p: at(L.noseRoot, 0, -s(0.06), 0), dir: [0, 0, 1], amount: s(0.05), radii: [s(0.046), s(0.15), s(0.115)], falloff: 1.4 },
    { p: at(L.noseRoot, 0, s(0.02), 0), dir: [0, 0, -1], amount: s(0.014), radii: [s(0.05), s(0.05), s(0.09)] },
    { p: at(L.noseTip, 0, s(0.004), 0), dir: [0, 0, 1], amount: s(0.078), radii: [s(0.058), s(0.062), s(0.1)] },
    { p: at(L.noseBase, 0, -s(0.012), s(0.004)), dir: [0, -1, 0.25], amount: s(0.026), radius: s(0.068) },
    { p: at(L.noseBase, hw * 0.23, s(0.01), -s(0.012)), dir: [0.45, 0, 0.62], amount: s(0.032), radius: s(0.055), mirror: true },
    { p: at(L.noseBase, hw * 0.36, s(0.004), -s(0.03)), dir: [-0.5, 0, -0.6], amount: s(0.014), radius: s(0.05), mirror: true },
    { p: at(L.noseBase, hw * 0.13, -s(0.014), -s(0.006)), dir: [0, 0.4, -0.9], amount: s(0.017), radii: [s(0.032), s(0.026), s(0.04)], mirror: true },
    { p: at(L.noseBase, 0, -s(0.024), -s(0.006)), dir: [0, 0, -1], amount: s(0.028), radii: [s(0.076), s(0.038), s(0.085)] },

    // --- mouth ---
    { p: at(L.upperLip, 0, s(0.014), s(0.004)), dir: [0, 0, -1], amount: s(0.009), radius: s(0.034) },
    { p: L.upperLip, dir: [0, 0, 1], amount: s(0.042), radii: [s(0.115), s(0.034), s(0.072)] },
    { p: at(L.mouthLine, 0, 0, s(0.004)), dir: [0, 0, -1], amount: s(0.03), radii: [s(0.13), s(0.016), s(0.072)] },
    { p: L.lowerLip, dir: [0, 0, 1], amount: s(0.045), radii: [s(0.1), s(0.042), s(0.072)] },
    { p: at(L.mouthCorner, 0, 0, -s(0.008)), dir: [0, 0, -1], amount: s(0.017), radius: s(0.051), mirror: true },
    { p: L.front(0.145), dir: [0, 0, -1], amount: s(0.021), radii: [s(0.102), s(0.034), s(0.076)] },

    // --- chin and jaw ---
    { p: at(L.chinFront, 0, s(0.014), 0), dir: [0, 0, 1], amount: s(0.058), radius: s(0.11) },
    { p: at(L.jawAngle, hw * 0.2, 0, -s(0.03)), dir: [0.55, -0.25, 0.5], amount: s(0.03), radius: s(0.153), mirror: true },
    // Lift the soft tissue under the jaw so the jawline reads
    { p: [hw * 0.6, s(0.055), -L.hd * 0.1], dir: [0, 1, 0], amount: s(0.062), radius: s(0.175), mirror: true },
    { p: [hw * 0.86, s(0.34), -L.hd * 0.06], dir: [1, 0, 0], amount: s(0.017), radius: s(0.127), mirror: true },

    // --- cheeks ---
    { p: L.cheek, dir: [0.5, 0.25, 0.5], amount: s(0.032), radius: s(0.136), mirror: true },
    { p: at(L.cheek, hw * 0.04, -s(0.075), s(0.008)), dir: [-0.5, 0, -0.5], amount: s(0.028), radius: s(0.127), mirror: true },
  ];
}

export type MorphName =
  | 'jawOpen' | 'smile' | 'frown' | 'mouthWide' | 'mouthPucker' | 'lipsClosed'
  | 'browUp' | 'browFurrow' | 'browOuterUp' | 'squint' | 'sneer' | 'cheekRaise';

export const MORPH_ORDER: MorphName[] = [
  'jawOpen', 'smile', 'frown', 'mouthWide', 'mouthPucker', 'lipsClosed',
  'browUp', 'browFurrow', 'browOuterUp', 'squint', 'sneer', 'cheekRaise',
];

export const HEAD_SEGMENTS_U = 72;
export const HEAD_SEGMENTS_V = 54;

function falloffWeight(dx: number, dy: number, dz: number, d: Deformer): number {
  const t = d.radii
    ? Math.hypot(dx / d.radii[0], dy / d.radii[1], dz / d.radii[2])
    : Math.hypot(dx, dy, dz) / (d.radius ?? 0.03);
  if (t >= 1) return 0;
  const w = 1 - t * t;
  return Math.pow(w * w, d.falloff ?? 1);
}

interface SculptedHead {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  count: number;
}

function sculptHead(shape: HeadShape): SculptedHead {
  const su = HEAD_SEGMENTS_U;
  const sv = HEAD_SEGMENTS_V;
  const count = (su + 1) * (sv + 1);
  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const base: [number, number, number] = [0, 0, 0];
  const probe: [number, number, number] = [0, 0, 0];

  // Expand mirrored deformers up front
  const all: Deformer[] = [];
  for (const d of [...baseFaceDeformers(shape), ...shape.deformers]) {
    all.push(d);
    if (d.mirror) {
      all.push({ ...d, p: [-d.p[0], d.p[1], d.p[2]], dir: [-d.dir[0], d.dir[1], d.dir[2]], mirror: false });
    }
  }
  const dirs = all.map((d) => {
    const l = Math.hypot(d.dir[0], d.dir[1], d.dir[2]) || 1;
    return [d.dir[0] / l, d.dir[1] / l, d.dir[2] / l] as [number, number, number];
  });

  const eps = 0.004;
  for (let iv = 0; iv <= sv; iv++) {
    const theta = (iv / sv) * Math.PI; // 0 at the crown, PI under the chin
    for (let iu = 0; iu <= su; iu++) {
      const phi = (iu / su) * Math.PI * 2; // 0 at +Z so UVs centre the face
      baseSurface(shape, theta, phi, base);
      let x = base[0];
      let y = base[1];
      let z = base[2];

      // Base normal from two finite-difference tangents
      baseSurface(shape, Math.min(Math.PI, theta + eps), phi, probe);
      const t1x = probe[0] - x;
      const t1y = probe[1] - y;
      const t1z = probe[2] - z;
      baseSurface(shape, theta, phi + eps, probe);
      const t2x = probe[0] - x;
      const t2y = probe[1] - y;
      const t2z = probe[2] - z;
      let bnx = t1y * t2z - t1z * t2y;
      let bny = t1z * t2x - t1x * t2z;
      let bnz = t1x * t2y - t1y * t2x;
      const bl = Math.hypot(bnx, bny, bnz) || 1;
      bnx /= bl;
      bny /= bl;
      bnz /= bl;

      for (let i = 0; i < all.length; i++) {
        const d = all[i];
        const w = falloffWeight(x - d.p[0], y - d.p[1], z - d.p[2], d);
        if (w <= 0) continue;
        const a = d.amount * w;
        if (d.alongNormal) {
          x += bnx * a;
          y += bny * a;
          z += bnz * a;
        } else {
          x += dirs[i][0] * a;
          y += dirs[i][1] * a;
          z += dirs[i][2] * a;
        }
      }

      const vi = iv * (su + 1) + iu;
      positions[vi * 3] = x;
      positions[vi * 3 + 1] = y;
      positions[vi * 3 + 2] = z;
      let u = phi / (Math.PI * 2);
      if (u > 0.5) u -= 1;
      uvs[vi * 2] = u * 1.6 + 0.5;
      uvs[vi * 2 + 1] = 1 - iv / sv;
    }
  }

  const indices: number[] = [];
  for (let iv = 0; iv < sv; iv++) {
    for (let iu = 0; iu < su; iu++) {
      const a = iv * (su + 1) + iu;
      const b = a + 1;
      const c = a + (su + 1);
      const d = c + 1;
      if (iv !== 0) indices.push(a, c, b);
      if (iv !== sv - 1) indices.push(b, c, d);
    }
  }

  return { positions, uvs, indices: new Uint32Array(indices), count };
}

// ---------------------------------------------------------------------------
// Morph targets
// ---------------------------------------------------------------------------

function gaussMask(
  x: number, y: number, z: number,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number
): number {
  const t = Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz);
  if (t >= 1) return 0;
  const w = 1 - t * t;
  return w * w;
}

/** Weight for vertices belonging to the movable mandible. */
function jawMask(x: number, y: number, z: number, h: number, hw: number, hd: number): number {
  const vertical = smoothstep(0.33 * h, 0.14 * h, y);
  const front = smoothstep(-0.25 * hd, 0.2 * hd, z);
  const side = 1 - smoothstep(0.68 * hw, 0.98 * hw, Math.abs(x));
  return clamp(vertical * front * (0.35 + 0.65 * side));
}

function buildMorph(name: MorphName, shape: HeadShape, base: Float32Array, count: number, L: HeadLandmarks) {
  const out = new Float32Array(count * 3);
  const [, jpy, jpz] = shape.jawPivot;
  const h = L.h;
  const hw = L.hw;
  const hd = L.hd;
  const s = (v: number) => v * h;
  const M = { y: L.mouthLine[1], z: L.mouthLine[2] };
  const CN = L.mouthCorner;
  const BR = L.brow;
  const CH = L.cheek;
  const EY = L.eye;
  const UL = L.upperLip;
  const LL = L.lowerLip;
  const NT = L.noseTip;
  const FH = L.forehead;

  for (let i = 0; i < count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    let dx = 0;
    let dy = 0;
    let dz = 0;
    const sign = x >= 0 ? 1 : -1;

    switch (name) {
      case 'jawOpen': {
        const w = jawMask(x, y, z, h, hw, hd);
        if (w > 0) {
          const ang = THREE.MathUtils.degToRad(17) * w;
          const py = y - jpy;
          const pz = z - jpz;
          const c = Math.cos(ang);
          const sn = Math.sin(ang);
          dy = py * c + pz * sn - py;
          dz = -py * sn + pz * c - pz;
          dx = -x * 0.05 * w;
        }
        break;
      }
      case 'smile': {
        const corner = gaussMask(Math.abs(x), y, z, CN[0], CN[1], CN[2], s(0.1), s(0.085), s(0.11));
        const cheek = gaussMask(Math.abs(x), y, z, CH[0], CH[1] - s(0.04), CH[2], s(0.15), s(0.15), s(0.15));
        dx += sign * s(0.045) * corner;
        dy += s(0.038) * corner + s(0.019) * cheek;
        dz += -s(0.011) * corner + s(0.008) * cheek;
        dy += s(0.011) * gaussMask(x, y, z, UL[0], UL[1], UL[2], s(0.127), s(0.047), s(0.085));
        break;
      }
      case 'frown': {
        const corner = gaussMask(Math.abs(x), y, z, CN[0], CN[1], CN[2], s(0.093), s(0.085), s(0.11));
        dy += -s(0.038) * corner - s(0.013) * gaussMask(x, y, z, LL[0], LL[1], LL[2], s(0.119), s(0.06), s(0.085));
        dx += sign * s(0.008) * corner;
        dz += -s(0.008) * corner;
        break;
      }
      case 'mouthWide': {
        const m = gaussMask(x, y, z, 0, M.y, M.z, s(0.178), s(0.102), s(0.127));
        dx += sign * s(0.034) * m;
        dz += -s(0.015) * m;
        dy += s(0.008) * gaussMask(x, y, z, UL[0], UL[1], UL[2], s(0.127), s(0.042), s(0.085));
        break;
      }
      case 'mouthPucker': {
        const m = gaussMask(x, y, z, 0, M.y, M.z, s(0.17), s(0.11), s(0.136));
        dx += -x * 0.28 * m;
        dz += s(0.045) * m;
        dy += s(0.011) * gaussMask(x, y, z, UL[0], UL[1], UL[2], s(0.119), s(0.051), s(0.085));
        dy -= s(0.011) * gaussMask(x, y, z, LL[0], LL[1], LL[2], s(0.11), s(0.06), s(0.085));
        break;
      }
      case 'lipsClosed': {
        const upper = gaussMask(x, y, z, UL[0], UL[1], UL[2], s(0.127), s(0.051), s(0.093));
        const lower = gaussMask(x, y, z, LL[0], LL[1], LL[2], s(0.119), s(0.06), s(0.093));
        dy += -s(0.015) * upper + s(0.015) * lower;
        dz += s(0.004) * (upper + lower);
        break;
      }
      case 'browUp': {
        const b = gaussMask(Math.abs(x), y, z, BR[0], BR[1], BR[2], s(0.17), s(0.102), s(0.127));
        dy += s(0.045) * b + s(0.013) * gaussMask(x, y, z, FH[0], FH[1], FH[2], s(0.25), s(0.127), s(0.17));
        dz += s(0.004) * b;
        break;
      }
      case 'browFurrow': {
        const inner = gaussMask(Math.abs(x), y, z, hw * 0.21, BR[1] - s(0.008), BR[2] + s(0.008), s(0.11), s(0.093), s(0.11));
        dy += -s(0.034) * inner;
        dx += -sign * s(0.017) * inner;
        dz += s(0.011) * inner;
        break;
      }
      case 'browOuterUp':
        dy += s(0.038) * gaussMask(Math.abs(x), y, z, hw * 0.68, BR[1], BR[2] - s(0.04), s(0.11), s(0.093), s(0.127));
        break;
      case 'squint': {
        const lower = gaussMask(Math.abs(x), y, z, EY[0], EY[1] - s(0.06), EY[2], s(0.127), s(0.06), s(0.11));
        dy += s(0.021) * lower + s(0.015) * gaussMask(Math.abs(x), y, z, CH[0], CH[1] + s(0.02), CH[2], s(0.127), s(0.102), s(0.127));
        dz += s(0.004) * lower;
        break;
      }
      case 'sneer': {
        const nose = gaussMask(x, y, z, NT[0], NT[1] - s(0.03), NT[2], s(0.11), s(0.076), s(0.11));
        dy += s(0.021) * nose + s(0.019) * gaussMask(x, y, z, UL[0], UL[1] + s(0.006), UL[2], s(0.119), s(0.051), s(0.085));
        dz += s(0.004) * nose;
        break;
      }
      case 'cheekRaise': {
        const cheek = gaussMask(Math.abs(x), y, z, CH[0], CH[1] - s(0.02), CH[2], s(0.153), s(0.136), s(0.144));
        dy += s(0.025) * cheek;
        dz += s(0.011) * cheek;
        break;
      }
    }

    out[i * 3] = dx;
    out[i * 3 + 1] = dy;
    out[i * 3 + 2] = dz;
  }
  return out;
}

/**
 * Per-vertex pigmentation, multiplied over the skin albedo. This is what turns a
 * uniformly-coloured mask into a face: coloured lips, warm cheeks, shadowed
 * sockets, reddened nose and ears, and a beard shadow across the jaw.
 */
function buildPigmentation(shape: HeadShape, positions: Float32Array, count: number, L: HeadLandmarks) {
  const colors = new Float32Array(count * 3);
  const h = L.h;
  const hw = L.hw;
  const hd = L.hd;
  const s = (v: number) => v * h;
  const tone = shape.skinTone;
  const stubble = shape.stubble ?? 0;
  const blush = shape.blush ?? 0.5;
  const eyeShadow = shape.eyeShadow ?? 0.5;
  const lipMul: [number, number, number] = [
    Math.min(1.6, shape.lipTint[0] / Math.max(0.05, tone[0])),
    Math.min(1.6, shape.lipTint[1] / Math.max(0.05, tone[1])),
    Math.min(1.6, shape.lipTint[2] / Math.max(0.05, tone[2])),
  ];
  const UL = L.upperLip;
  const LL = L.lowerLip;
  const CH = L.cheek;
  const EY = L.eye;
  const NT = L.noseTip;

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    let r = 1;
    let g = 1;
    let b = 1;

    const lip = clamp(
      (gaussMask(x, y, z, UL[0], UL[1] - s(0.004), UL[2], hw * 0.44, s(0.036), hd * 0.42) +
        gaussMask(x, y, z, LL[0], LL[1] + s(0.004), LL[2], hw * 0.4, s(0.04), hd * 0.42)) *
        1.15
    );
    if (lip > 0.001) {
      r = lerp(r, lipMul[0], lip);
      g = lerp(g, lipMul[1], lip);
      b = lerp(b, lipMul[2], lip);
      // The upper lip sits in shadow relative to the lower
      const dark = 1 - gaussMask(x, y, z, UL[0], UL[1], UL[2], hw * 0.42, s(0.03), hd * 0.4) * 0.14;
      r *= dark;
      g *= dark;
      b *= dark;
    }

    const cheek = gaussMask(Math.abs(x), y, z, CH[0], CH[1] - s(0.03), CH[2], hw * 0.7, s(0.16), hd * 0.8);
    if (cheek > 0.001) {
      const w = cheek * blush * 0.22;
      r = lerp(r, r * 1.16, w);
      g = lerp(g, g * 0.95, w);
      b = lerp(b, b * 0.94, w);
    }

    const socket = gaussMask(Math.abs(x), y, z, EY[0], EY[1] - s(0.01), EY[2], hw * 0.6, s(0.11), hd * 0.6);
    if (socket > 0.001) {
      const w = socket * eyeShadow * 0.3;
      r = lerp(r, r * 0.8, w);
      g = lerp(g, g * 0.78, w);
      b = lerp(b, b * 0.84, w);
    }

    const nose = gaussMask(x, y, z, NT[0], NT[1] - s(0.01), NT[2], hw * 0.34, s(0.08), hd * 0.4);
    if (nose > 0.001) {
      const w = nose * 0.16;
      r = lerp(r, r * 1.12, w);
      g = lerp(g, g * 0.96, w);
      b = lerp(b, b * 0.94, w);
    }

    const ear = gaussMask(Math.abs(x), y, z, hw * 0.92, L.ear[1], L.ear[2], hw * 0.3, s(0.1), hd * 0.28);
    if (ear > 0.001) {
      const w = ear * 0.2;
      r = lerp(r, r * 1.14, w);
      g = lerp(g, g * 0.94, w);
      b = lerp(b, b * 0.93, w);
    }

    if (stubble > 0.001) {
      const jaw = clamp(
        smoothstep(0.34 * h, 0.16 * h, y) *
          smoothstep(-0.35 * hd, 0.1 * hd, z) *
          (1 - smoothstep(0.7 * hw, hw, Math.abs(x)))
      );
      const moustache = gaussMask(x, y, z, UL[0], UL[1] + s(0.03), UL[2], hw * 0.5, s(0.05), hd * 0.45);
      const beard = clamp((jaw * 0.85 + moustache * 0.7) * (1 - lip * 0.9)) * stubble;
      if (beard > 0.001) {
        const d = 1 - beard * 0.3;
        r *= d;
        g *= d * 1.01;
        b *= d * 1.06;
      }
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  return colors;
}

/**
 * The UV seam and the two poles carry coincident duplicate vertices. Left alone,
 * each duplicate averages only the faces on its own side, producing a hard
 * lighting seam straight down the middle of the face.
 */
function weldSeamNormals(geometry: THREE.BufferGeometry, su: number, sv: number) {
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const idx = (iv: number, iu: number) => iv * (su + 1) + iu;
  for (let iv = 0; iv <= sv; iv++) {
    const a = idx(iv, 0);
    const b = idx(iv, su);
    const nx = (normals.getX(a) + normals.getX(b)) * 0.5;
    const ny = (normals.getY(a) + normals.getY(b)) * 0.5;
    const nz = (normals.getZ(a) + normals.getZ(b)) * 0.5;
    const l = Math.hypot(nx, ny, nz) || 1;
    for (const v of [a, b]) normals.setXYZ(v, nx / l, ny / l, nz / l);
  }
  for (const iv of [0, sv]) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let iu = 0; iu <= su; iu++) {
      const v = idx(iv, iu);
      nx += normals.getX(v);
      ny += normals.getY(v);
      nz += normals.getZ(v);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    for (let iu = 0; iu <= su; iu++) normals.setXYZ(idx(iv, iu), nx / l, ny / l, nz / l);
  }
  normals.needsUpdate = true;
}

export function buildHeadGeometry(shape: HeadShape): {
  geometry: THREE.BufferGeometry;
  morphIndex: Record<MorphName, number>;
} {
  const sculpt = sculptHead(shape);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(sculpt.positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(sculpt.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(sculpt.indices, 1));
  geometry.computeVertexNormals();
  weldSeamNormals(geometry, HEAD_SEGMENTS_U, HEAD_SEGMENTS_V);

  const L = headLandmarks(shape);
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(buildPigmentation(shape, sculpt.positions, sculpt.count, L), 3)
  );

  const morphIndex = {} as Record<MorphName, number>;
  const relative: THREE.BufferAttribute[] = [];
  MORPH_ORDER.forEach((name, i) => {
    relative.push(new THREE.BufferAttribute(buildMorph(name, shape, sculpt.positions, sculpt.count, L), 3));
    morphIndex[name] = i;
  });
  geometry.morphAttributes.position = relative;
  geometry.morphTargetsRelative = true;
  geometry.computeBoundingSphere();
  return { geometry, morphIndex };
}
