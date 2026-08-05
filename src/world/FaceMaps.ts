import * as THREE from 'three';
import { clamp, fbm, lerp, smoothstep, worley } from '../engine/math';
import { FaceParams } from './FaceParams';

/**
 * One shared anatomical layout drives the skull loft, the facial detail maps and
 * the placement of eyes, lids, ears and hair. Everything is in head-local metres
 * with the origin on the eye line, +Y up and +Z forward.
 */

export const HEAD = {
  crownY: 0.1125,
  chinY: -0.1125,
  halfWidth: 0.0745,
  halfDepth: 0.096,
  browY: 0.022,
  hairlineY: 0.062,
  eyeY: 0.0,
  eyeX: 0.0325,
  eyeHalfW: 0.0158,
  eyeHalfH: 0.0062,
  noseRootY: 0.02,
  noseTipY: -0.036,
  noseBaseY: -0.047,
  noseHalfW: 0.0122,
  mouthY: -0.066,
  mouthHalf: 0.026,
  chinCreaseY: -0.094,
  earY: -0.014,
  earX: 0.0715,
  /** Face surface z at the eye line, used to seat the eyeballs. */
  faceZ: 0.079,
};

/** Kept for compatibility with older call sites. */
export const HEAD_RADIUS = { x: HEAD.halfWidth, y: HEAD.crownY, z: HEAD.halfDepth };

// Normalised height t: 0 at the chin, 1 at the crown.
const WIDTH_PROFILE: [number, number][] = [
  [0.0, 0.1],
  [0.03, 0.33],
  [0.08, 0.5],
  [0.16, 0.68],
  [0.26, 0.85],
  [0.36, 0.96],
  [0.46, 1.0],
  [0.58, 0.99],
  [0.7, 0.99],
  [0.82, 0.93],
  [0.92, 0.74],
  [0.97, 0.5],
  [1.0, 0.1],
];

const DEPTH_PROFILE: [number, number][] = [
  [0.0, 0.34],
  [0.04, 0.52],
  [0.1, 0.66],
  [0.2, 0.8],
  [0.32, 0.92],
  [0.45, 0.99],
  [0.6, 1.0],
  [0.74, 0.98],
  [0.86, 0.88],
  [0.94, 0.66],
  [1.0, 0.12],
];

// Forward shift of the cross-section centre (the jaw sits back, the crown tips back).
const Z_OFFSET_PROFILE: [number, number][] = [
  [0.0, -0.004],
  [0.1, -0.007],
  [0.25, -0.005],
  [0.45, 0.0],
  [0.6, 0.0],
  [0.8, -0.004],
  [1.0, -0.012],
];

function sampleProfile(profile: [number, number][], t: number): number {
  const x = clamp(t);
  let i = 0;
  while (i < profile.length - 2 && profile[i + 1][0] < x) i++;
  const [t0, v0] = profile[i];
  const [t1, v1] = profile[i + 1];
  const k = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
  const e = k * k * (3 - 2 * k);
  return lerp(v0, v1, e);
}

export const headWidthAt = (t: number) => sampleProfile(WIDTH_PROFILE, t);
export const headDepthAt = (t: number) => sampleProfile(DEPTH_PROFILE, t);
export const headZOffsetAt = (t: number) => sampleProfile(Z_OFFSET_PROFILE, t);

/** Height (metres) -> normalised profile parameter. */
export const heightToT = (y: number) => clamp((y - HEAD.chinY) / (HEAD.crownY - HEAD.chinY));

/** Sphere UV -> the lofted head surface point (matches buildSkull's base shape). */
export function uvToHeadPoint(u: number, v: number, p?: FaceParams): THREE.Vector3 {
  const phi = u * Math.PI * 2;
  const theta = (1 - v) * Math.PI;
  const yn = Math.cos(theta);
  const t = (yn + 1) / 2;
  const y = lerp(HEAD.chinY, HEAD.crownY, t);
  const dirX = -Math.cos(phi);
  const dirZ = Math.sin(phi);
  const w = headWidthAt(t) * HEAD.halfWidth * (p?.skullWidth ?? 1);
  const d = headDepthAt(t) * HEAD.halfDepth;
  return new THREE.Vector3(dirX * w, y, dirZ * d + headZOffsetAt(t));
}

const gauss = (d: number, r: number) => (d >= r ? 0 : Math.pow(1 - (d / r) * (d / r), 2));

function segDist2D(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1e-6));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

export interface FaceFeatureLayout {
  eyeX: number;
  eyeY: number;
  mouthY: number;
  mouthHalf: number;
  noseTipY: number;
  noseBaseY: number;
  noseRootY: number;
  noseHalf: number;
  browY: number;
}

export function featureLayout(p: FaceParams): FaceFeatureLayout {
  return {
    eyeX: HEAD.eyeX * p.eyeSpacing,
    eyeY: HEAD.eyeY,
    mouthY: HEAD.mouthY,
    mouthHalf: HEAD.mouthHalf * p.mouthWidth,
    noseTipY: HEAD.noseTipY * p.noseLength,
    noseBaseY: HEAD.noseBaseY * p.noseLength,
    noseRootY: HEAD.noseRootY,
    noseHalf: HEAD.noseHalfW * p.noseWidth,
    browY: HEAD.browY * p.browHeight,
  };
}

/** Brow centreline, shared by the detail map and the albedo. */
export function browPoint(p: FaceParams, side: number, t: number): { x: number; y: number; r: number } {
  const L = featureLayout(p);
  const x = side * lerp(0.008, 0.05, t);
  const arch = Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.85) * 0.005;
  const y = L.browY + arch - Math.pow(t, 2.1) * 0.009 + p.browAngle * (0.003 - t * 0.008);
  const r = 0.0042 * p.browThickness * lerp(1.0, 0.42, Math.pow(t, 1.3));
  return { x, y, r };
}

/**
 * Signed detail height in metres. Positive = raised (lips, brow ridge),
 * negative = creased (mouth line, nostrils, folds).
 */
export function faceDetailHeight(p: FaceParams, x: number, y: number, z: number): number {
  const L = featureLayout(p);
  const ax = Math.abs(x);
  const front = smoothstep(0.12, 0.55, z / HEAD.halfDepth);
  if (front <= 0) return 0;
  let h = 0;

  // --- mouth ------------------------------------------------------------
  const lipLineY = L.mouthY - Math.pow(ax / L.mouthHalf, 2.2) * 0.0045;
  const inMouth = clamp(1 - ax / (L.mouthHalf * 1.05));
  h -= 0.0038 * gauss(Math.abs(y - lipLineY), 0.0034) * inMouth;
  h += 0.0028 * gauss(Math.abs(y - (lipLineY + 0.0078)), 0.0085) * clamp(1 - ax / (L.mouthHalf * 1.12)) * p.lipFullness;
  h += 0.003 * gauss(Math.abs(y - (lipLineY - 0.009)), 0.0095) * clamp(1 - ax / (L.mouthHalf * 1.06)) * p.lipFullness;
  // Vermillion borders.
  h -= 0.001 * gauss(Math.abs(y - (lipLineY + 0.0145)), 0.0024) * inMouth;
  h -= 0.0009 * gauss(Math.abs(y - (lipLineY - 0.019)), 0.003) * inMouth;
  for (const s of [-1, 1]) {
    h -= 0.0024 * gauss(Math.hypot(x - s * L.mouthHalf, (y - lipLineY) * 1.5), 0.0062);
  }
  // Philtrum.
  const phY = lipLineY + 0.019;
  h -= 0.0007 * gauss(Math.hypot(x * 2.8, y - phY), 0.0095);
  for (const s of [-1, 1]) h += 0.0005 * gauss(Math.hypot(x - s * 0.0042, (y - phY) * 0.9), 0.0065);
  // Mentolabial crease.
  h -= 0.0009 * gauss(Math.abs(y - (lipLineY - 0.026)) + Math.pow(ax / 0.022, 2) * 0.004, 0.006);

  // --- nose -------------------------------------------------------------
  for (const s of [-1, 1]) {
    const wingX = s * L.noseHalf;
    const wingY = L.noseBaseY + 0.004;
    h -= 0.0022 * gauss(Math.abs(Math.hypot((x - wingX * 1.2) * 1.05, (y - wingY) * 0.85) - 0.007), 0.003);
    h -= 0.0026 * gauss(Math.hypot((x - wingX * 0.62) * 1.8, (y - (wingY - 0.003)) * 2.6), 0.0055);
    h += 0.0012 * gauss(Math.hypot(x - wingX * 1.05, y - wingY), 0.0075);
  }
  h -= 0.0011 * gauss(Math.hypot(x * 2.6, y - (L.noseBaseY - 0.005)), 0.006);
  // Bridge ridge running from the root down to the tip.
  const bridgeBand = clamp(1 - Math.abs(y - (L.noseTipY + 0.03)) / 0.05);
  h += 0.0012 * gauss(ax, 0.009) * bridgeBand;

  // --- eyes -------------------------------------------------------------
  for (const s of [-1, 1]) {
    const ex = s * L.eyeX;
    const dx = (x - ex) / HEAD.eyeHalfW;
    const dy = (y - L.eyeY) / HEAD.eyeHalfH;
    const rimDist = Math.abs(Math.hypot(dx, dy) - 1);
    h -= 0.0022 * gauss(rimDist * 0.011, 0.003);
    // Upper lid crease.
    h -= 0.0028 * gauss(Math.abs(y - (L.eyeY + 0.0155)) + Math.pow(Math.abs(x - ex) / 0.021, 2.4) * 0.006, 0.0042);
    // Lower lid ridge.
    h += 0.0009 * gauss(Math.abs(y - (L.eyeY - 0.0135)) + Math.pow(Math.abs(x - ex) / 0.02, 2.2) * 0.006, 0.0038);
    // Tear duct.
    h -= 0.0016 * gauss(Math.hypot(x - s * (L.eyeX - 0.0155), y - (L.eyeY - 0.002)), 0.0044);
    if (p.age > 0.35) {
      const k = (p.age - 0.35) * 1.6;
      for (let i = 0; i < 3; i++) {
        const a = -0.35 + i * 0.35;
        h -=
          0.0009 *
          k *
          gauss(segDist2D(x, y, s * (L.eyeX + 0.019), L.eyeY + a * 0.008, s * (L.eyeX + 0.031), L.eyeY + a * 0.015), 0.0022);
      }
    }
  }

  // --- brow ridge and forehead -----------------------------------------
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    for (const s of [-1, 1]) {
      const b = browPoint(p, s, t);
      h += 0.0011 * gauss(Math.hypot((x - b.x) * 0.55, y - b.y), 0.011);
    }
  }
  if (p.age > 0.4) {
    const k = (p.age - 0.4) * 1.8;
    for (let i = 0; i < 3; i++) {
      const fy = HEAD.browY + 0.022 + i * 0.012;
      h -= 0.0012 * k * gauss(Math.abs(y - fy) + Math.pow(ax / 0.036, 3) * 0.01, 0.0034);
    }
    for (const s of [-1, 1]) {
      h -= 0.0013 * k * gauss(Math.abs(x - s * 0.0065) + Math.abs(y - (HEAD.browY + 0.012)) * 0.35, 0.0042);
    }
  }

  // --- nasolabial fold --------------------------------------------------
  for (const s of [-1, 1]) {
    const d = segDist2D(x, y, s * (L.noseHalf + 0.002), L.noseBaseY + 0.002, s * 0.031, L.mouthY - 0.016);
    h -= (0.0009 + 0.0022 * clamp(p.age * 1.2)) * gauss(d, 0.005);
  }

  // --- chin -------------------------------------------------------------
  h -= 0.001 * gauss(Math.hypot(x * 1.6, y - HEAD.chinCreaseY), 0.013);

  // --- pores and fine wrinkles -----------------------------------------
  const pores = 1 - worley(x * 240 + 4, y * 240, 1);
  const fine = fbm(x * 620, y * 620, 3) - 0.5;
  h += (pores - 0.5) * 0.00026 + fine * 0.0002;

  return h * front;
}

/** Per-pixel skin colour: lips, brows, lash lines, crease shading, stubble. */
export function faceAlbedo(
  p: FaceParams,
  base: THREE.Color,
  x: number,
  y: number,
  z: number,
  out: THREE.Color,
): THREE.Color {
  const L = featureLayout(p);
  const ax = Math.abs(x);
  const front = smoothstep(0.02, 0.45, z / HEAD.halfDepth);
  out.copy(base);

  const blotch = fbm(x * 40 + 3, y * 40, 4) - 0.5;
  out.multiplyScalar(1 + blotch * 0.035);

  // Warm cheeks and nose, cooler forehead.
  const cheek = Math.max(gauss(Math.hypot(x - 0.046, y + 0.024), 0.032), gauss(Math.hypot(x + 0.046, y + 0.024), 0.032));
  const nose = gauss(Math.hypot(x * 1.6, y - L.noseTipY), 0.024);
  const warm = clamp((cheek * 0.5 + nose * 0.45) * front);
  out.r *= 1 + warm * 0.14;
  out.g *= 1 - warm * 0.02;
  out.b *= 1 - warm * 0.05;
  const cool = clamp(smoothstep(HEAD.browY, HEAD.hairlineY, y) * front);
  out.r *= 1 - cool * 0.025;
  out.b *= 1 + cool * 0.04;

  // Lips.
  const lipLineY = L.mouthY - Math.pow(ax / L.mouthHalf, 2.2) * 0.0045;
  const lipBody =
    clamp(1 - ax / (L.mouthHalf * 1.02)) *
    (gauss(Math.abs(y - (lipLineY + 0.008)), 0.0105) + gauss(Math.abs(y - (lipLineY - 0.0095)), 0.0125));
  const lip = clamp(lipBody) * front;
  if (lip > 0.001) {
    const lipColor = new THREE.Color(0.34, 0.13, 0.13).lerp(base, 0.42);
    out.lerp(lipColor, clamp(lip * 0.8));
  }
  out.multiplyScalar(1 - 0.34 * gauss(Math.abs(y - lipLineY), 0.0022) * clamp(1 - ax / L.mouthHalf) * front);

  // Eyebrows.
  let brow = 0;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    for (const s of [-1, 1]) {
      const b = browPoint(p, s, t);
      brow = Math.max(brow, gauss(Math.hypot((x - b.x) * 0.42, y - b.y), b.r));
    }
  }
  if (brow > 0.001) {
    const hairNoise = 0.7 + 0.3 * (1 - worley(x * 700, y * 700, 1));
    out.lerp(new THREE.Color(0.085, 0.06, 0.05), clamp(brow * 0.95) * front * hairNoise);
  }

  // Lash line and socket shading.
  for (const s of [-1, 1]) {
    const ex = s * L.eyeX;
    const d = Math.abs(y - (L.eyeY + 0.0075)) + Math.pow(Math.abs(x - ex) / 0.018, 3) * 0.008;
    out.multiplyScalar(1 - 0.3 * gauss(d, 0.0026) * front);
    out.multiplyScalar(1 - 0.1 * gauss(Math.hypot((x - ex) / 1.3, y - (L.eyeY + 0.004)), 0.02) * front);
  }

  // Contact shading from the height field.
  const h = faceDetailHeight(p, x, y, z);
  if (h < 0) out.multiplyScalar(1 + clamp(h / 0.007, -0.3, 0) * 0.18);

  // Stubble.
  if (p.masculinity > 0.5 && !p.android) {
    const region =
      clamp(1 - Math.hypot(x / 0.058, (y - (L.mouthY - 0.03)) / 0.042)) * front +
      clamp(1 - Math.hypot((ax - 0.048) / 0.022, (y - (L.mouthY + 0.006)) / 0.032)) * front * 0.6;
    const grain = 1 - worley(x * 900, y * 900, 1);
    const s = clamp(region) * clamp((p.masculinity - 0.5) * 2) * (0.45 + grain * 0.55);
    out.lerp(new THREE.Color(0.11, 0.09, 0.09), s * 0.28);
  }

  return out;
}

/** Roughness: shiny T-zone, drier cheeks, matte lips. */
export function faceRoughness(p: FaceParams, x: number, y: number, z: number): number {
  const L = featureLayout(p);
  const front = smoothstep(0.05, 0.5, z / HEAD.halfDepth);
  const tzone = Math.max(
    gauss(Math.hypot(x * 1.5, y - (HEAD.browY + 0.03)), 0.05),
    gauss(Math.hypot(x * 1.4, y - L.noseTipY), 0.03),
  );
  const pores = 1 - worley(x * 240, y * 240, 1);
  let r = 0.48 + (fbm(x * 60, y * 60, 3) - 0.5) * 0.12 + (pores - 0.5) * 0.09;
  r -= tzone * 0.26 * front;
  const lip = clamp(1 - Math.abs(x) / L.mouthHalf) * gauss(Math.abs(y - L.mouthY), 0.014);
  r = lerp(r, 0.32, lip * front);
  return clamp(r, 0.2, 0.85);
}
