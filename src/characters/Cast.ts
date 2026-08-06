/**
 * The cast of DEVIANT. Each entry is a full recipe: proportions, a face sculpt
 * layered on the shared base, hair, wardrobe and a voice profile.
 *
 * Sculpt variations are authored as functions of the head's landmarks, so the
 * same variation applies correctly to an adult or a child head.
 */
import type { CharacterDef } from './Character';
import { headLandmarks, type Deformer, type HeadLandmarks, type HeadShape } from './Head';

const ADULT_HEAD_HEIGHT = 0.235;

interface HeadOpts {
  height?: number;
  widthRatio?: number;
  depthRatio?: number;
  sculpt?: (L: HeadLandmarks) => Deformer[];
  irisColor: [number, number, number];
  skinTone: [number, number, number];
  android: boolean;
  brow?: Partial<HeadShape['brow']>;
  lipTint?: [number, number, number];
  eyeRadiusScale?: number;
  ledSide?: 1 | -1;
  stubble?: number;
  blush?: number;
  eyeShadow?: number;
}

/**
 * Builds a head shape, deriving every feature position from the landmark solver.
 * A provisional shape is needed first because the landmarks depend on the
 * silhouette, and the eyes/ears/LED/mouth then depend on the landmarks.
 */
function head(opts: HeadOpts): HeadShape {
  const h = opts.height ?? ADULT_HEAD_HEIGHT;
  // Typical adult: 148mm wide, 194mm deep for a 235mm tall head
  const halfWidth = h * (opts.widthRatio ?? 0.315);
  const halfDepth = h * (opts.depthRatio ?? 0.413);

  const provisional: HeadShape = {
    height: h,
    halfWidth,
    halfDepth,
    deformers: [],
    eye: { x: 0, y: 0, z: 0, radius: 0.0122 },
    irisColor: opts.irisColor,
    brow: { thickness: h * 0.026, y: 0, arch: h * 0.034, color: 0x2a1c16, ...opts.brow },
    jawPivot: [0, 0, 0],
    earPos: [0, 0, 0],
    ledPos: [0, 0, 0],
    mouthCenter: [0, 0, 0],
    skinTone: opts.skinTone,
    android: opts.android,
    ledSide: opts.ledSide ?? 1,
    lipTint: opts.lipTint ?? [0.62, 0.36, 0.34],
    stubble: opts.stubble,
    blush: opts.blush,
    eyeShadow: opts.eyeShadow,
  };

  const L = headLandmarks(provisional);
  const eyeRadius = h * 0.052 * (opts.eyeRadiusScale ?? 1);
  // Depth the socket deformer carves into the face
  const socketDepth = h * 0.072;

  return {
    ...provisional,
    deformers: opts.sculpt ? opts.sculpt(L) : [],
    eye: {
      x: L.eye[0],
      y: L.eye[1],
      // Sit the globe so a third of it plus the lid shells stand clear of the
      // socket dish; any deeper and only the pupil pokes through.
      z: L.eye[2] - socketDepth - eyeRadius * 0.28,
      radius: eyeRadius,
    },
    brow: { ...provisional.brow, y: L.brow[1] + h * 0.012 },
    jawPivot: [0, h * 0.42, -halfDepth * 0.12],
    earPos: [L.ear[0] * 0.97, L.ear[1], L.ear[2]],
    ledPos: [L.temple[0] * 0.99, L.brow[1], L.temple[2] * 0.85],
    mouthCenter: [0, L.mouthLine[1], L.mouthLine[2]],
  };
}

// ---------------------------------------------------------------------------
// Sculpt variations
// ---------------------------------------------------------------------------

/** Softer structure: narrower jaw, higher cheekbones, fuller lips, finer nose. */
const FEMININE = (L: HeadLandmarks): Deformer[] => {
  const s = (v: number) => v * L.h;
  return [
    { p: [L.hw * 0.62, L.y(0.3), L.hd * 0.1], dir: [-1, 0, 0], amount: s(0.034), radius: s(0.17), mirror: true },
    { p: L.chinFront, dir: [0, 0, -1], amount: s(0.013), radius: s(0.1) },
    { p: L.cheek, dir: [0.35, 0.35, 0.4], amount: s(0.019), radius: s(0.127), mirror: true },
    { p: [0, L.noseRoot[1] - s(0.03), L.noseRoot[2]], dir: [0, 0, -1], amount: s(0.015), radii: [s(0.06), s(0.19), s(0.12)] },
    { p: L.noseTip, dir: [0, 0, -1], amount: s(0.017), radii: [s(0.068), s(0.076), s(0.11)] },
    { p: L.upperLip, dir: [0, 0, 1], amount: s(0.015), radii: [s(0.11), s(0.042), s(0.076)] },
    { p: L.lowerLip, dir: [0, 0, 1], amount: s(0.017), radii: [s(0.102), s(0.051), s(0.076)] },
    { p: L.brow, dir: [0, 0, -1], amount: s(0.017), radii: [s(0.127), s(0.068), s(0.127)], mirror: true },
    { p: L.eye, dir: [0, 0, -1], amount: s(0.008), radii: [s(0.144), s(0.11), s(0.127)], mirror: true },
  ];
};

/** Sharper, more angular structure. */
const MASCULINE_SHARP = (L: HeadLandmarks): Deformer[] => {
  const s = (v: number) => v * L.h;
  return [
    { p: [L.hw * 0.66, L.y(0.3), L.hd * 0.1], dir: [0.7, -0.2, 0.4], amount: s(0.021), radius: s(0.153), mirror: true },
    { p: L.chinFront, dir: [0, 0, 1], amount: s(0.017), radius: s(0.11) },
    { p: [L.brow[0], L.brow[1] + s(0.008), L.brow[2]], dir: [0, 0, 1], amount: s(0.015), radii: [s(0.127), s(0.06), s(0.119)], mirror: true },
    { p: [L.cheek[0], L.cheek[1] - s(0.075), L.cheek[2]], dir: [-0.6, 0, -0.4], amount: s(0.017), radius: s(0.127), mirror: true },
    { p: L.lowerLip, dir: [0, 0, -1], amount: s(0.008), radii: [s(0.102), s(0.051), s(0.076)] },
  ];
};

/** Older: deeper folds, hollow cheeks, heavier lids and jowls. */
const AGED = (L: HeadLandmarks): Deformer[] => {
  const s = (v: number) => v * L.h;
  return [
    { p: [L.hw * 0.42, L.y(0.245), L.hd * 0.62], dir: [-0.7, 0, -0.5], amount: s(0.026), radius: s(0.11), mirror: true },
    { p: [L.hw * 0.7, L.y(0.17), L.hd * 0.36], dir: [0.4, -0.6, 0.3], amount: s(0.021), radius: s(0.127), mirror: true },
    { p: [L.eye[0], L.eye[1] + s(0.06), L.eye[2]], dir: [0, -1, 0], amount: s(0.017), radii: [s(0.127), s(0.06), s(0.11)], mirror: true },
    { p: [L.eye[0], L.eye[1] - s(0.062), L.eye[2]], dir: [0, -1, 0.3], amount: s(0.013), radii: [s(0.11), s(0.051), s(0.093)], mirror: true },
    { p: [0, L.y(0.62), L.forehead[2]], dir: [0, 0, -1], amount: s(0.011), radii: [s(0.21), s(0.06), s(0.127)] },
    { p: [0, L.y(0.71), L.forehead[2]], dir: [0, 0, -1], amount: s(0.009), radii: [s(0.21), s(0.051), s(0.127)] },
  ];
};

/** Broad and heavy-set. */
const HEAVY = (L: HeadLandmarks): Deformer[] => {
  const s = (v: number) => v * L.h;
  return [
    { p: [L.hw * 0.7, L.y(0.28), L.hd * 0.1], dir: [1, 0, 0], amount: s(0.034), radius: s(0.17), mirror: true },
    { p: [L.hw * 0.55, L.y(0.13), L.hd * 0.2], dir: [0, -0.6, 0.4], amount: s(0.03), radius: s(0.16), mirror: true },
    { p: [L.cheek[0], L.cheek[1] - s(0.05), L.cheek[2]], dir: [0.6, 0, 0.3], amount: s(0.026), radius: s(0.144), mirror: true },
    { p: [L.hw * 0.24, L.noseBase[1], L.noseBase[2] - s(0.01)], dir: [0.7, 0, 0.3], amount: s(0.021), radius: s(0.068), mirror: true },
    { p: L.brow, dir: [0, 0, 1], amount: s(0.017), radii: [s(0.136), s(0.068), s(0.119)], mirror: true },
  ];
};

/** Child: rounded cranium, small nose and chin, full cheeks. */
const CHILD = (L: HeadLandmarks): Deformer[] => {
  const s = (v: number) => v * L.h;
  return [
    { p: [0, L.y(0.66), L.forehead[2]], dir: [0, 0, 1], amount: s(0.034), radius: s(0.23) },
    { p: [L.cheek[0], L.cheek[1] - s(0.04), L.cheek[2]], dir: [0.5, 0.2, 0.5], amount: s(0.034), radius: s(0.153), mirror: true },
    { p: L.noseTip, dir: [0, 0, -1], amount: s(0.034), radii: [s(0.068), s(0.085), s(0.11)] },
    { p: [0, L.noseRoot[1] - s(0.03), L.noseRoot[2]], dir: [0, 0, -1], amount: s(0.026), radii: [s(0.06), s(0.19), s(0.12)] },
    { p: L.chinFront, dir: [0, 0, -1], amount: s(0.021), radius: s(0.11) },
    { p: [L.hw * 0.62, L.y(0.3), L.hd * 0.1], dir: [-1, 0, 0], amount: s(0.038), radius: s(0.17), mirror: true },
    { p: L.brow, dir: [0, 0, -1], amount: s(0.021), radii: [s(0.127), s(0.068), s(0.127)], mirror: true },
  ];
};

const blend =
  (...fns: ((L: HeadLandmarks) => Deformer[])[]) =>
  (L: HeadLandmarks): Deformer[] =>
    fns.flatMap((f) => f(L));

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

export const NOVA: CharacterDef = {
  id: 'nova',
  name: 'NOVA',
  android: true,
  uiColor: '#7fd8ff',
  proportions: { height: 1.7, build: 0.3, shoulderWidth: 0.1, hipWidth: 0.082, waist: 0.85, chestDepth: 0.5 },
  head: head({
    sculpt: FEMININE,
    irisColor: [0.34, 0.56, 0.6],
    skinTone: [0.8, 0.62, 0.55],
    android: true,
    brow: { color: 0x3a2a20 },
    lipTint: [0.72, 0.41, 0.4],
    blush: 0.85,
    eyeShadow: 0.55,
  }),
  hair: { style: 'bob', color: 0x2b1d16, gloss: 0.55 },
  outfit: { top: 'uniform', bottom: 'trousers', shoes: true, sleeves: 'long', collar: true },
  cloth: { color: [0.4, 0.44, 0.5], weave: 56, roughness: 0.85, sheen: 0.5 },
  shoeColor: 0x1a1c22,
  voice: { pitch: 1.14, rate: 0.98, timbre: 'warm' },
};

export const ARCHER: CharacterDef = {
  id: 'archer',
  name: 'ARCHER',
  android: true,
  uiColor: '#9fe0ff',
  proportions: { height: 1.82, build: 0.44, shoulderWidth: 0.114, hipWidth: 0.076, waist: 0.6, chestDepth: 0.7 },
  head: head({
    sculpt: MASCULINE_SHARP,
    irisColor: [0.33, 0.22, 0.14],
    skinTone: [0.74, 0.56, 0.47],
    android: true,
    brow: { color: 0x1c1310 },
    lipTint: [0.6, 0.36, 0.34],
    stubble: 0.5,
    blush: 0.35,
    eyeShadow: 0.6,
  }),
  hair: { style: 'sweptBack', color: 0x140f0c, gloss: 0.6 },
  outfit: { top: 'uniform', bottom: 'trousers', shoes: true, sleeves: 'long', collar: true },
  cloth: { color: [0.09, 0.11, 0.16], weave: 52, roughness: 0.7, sheen: 0.55 },
  shoeColor: 0x0d0e11,
  voice: { pitch: 0.94, rate: 1.02, timbre: 'neutral' },
};

export const VOSS: CharacterDef = {
  id: 'voss',
  name: 'LT. VOSS',
  android: false,
  uiColor: '#ffcf7a',
  proportions: { height: 1.73, build: 0.58, shoulderWidth: 0.104, hipWidth: 0.084, waist: 0.35, chestDepth: 0.55 },
  head: head({
    sculpt: blend(AGED, FEMININE),
    irisColor: [0.36, 0.42, 0.38],
    skinTone: [0.72, 0.55, 0.48],
    android: false,
    brow: { color: 0x3b3630 },
    lipTint: [0.6, 0.36, 0.35],
    blush: 0.5,
    eyeShadow: 0.8,
  }),
  hair: { style: 'ponytail', color: 0x4a423c, gloss: 0.3 },
  outfit: { top: 'coat', bottom: 'trousers', shoes: true, sleeves: 'long', collar: true, bulk: 0.35 },
  cloth: { color: [0.2, 0.16, 0.13], weave: 40, roughness: 1, sheen: 0.2 },
  shoeColor: 0x191512,
  idleClip: 'idleCrossed',
  voice: { pitch: 0.88, rate: 0.92, timbre: 'gravel' },
};

export const ELIAS: CharacterDef = {
  id: 'elias',
  name: 'ELIAS',
  android: false,
  uiColor: '#ff8f7a',
  proportions: { height: 1.8, build: 0.78, shoulderWidth: 0.116, hipWidth: 0.088, waist: 0.15, chestDepth: 0.8 },
  head: head({
    sculpt: blend(HEAVY, AGED),
    irisColor: [0.26, 0.22, 0.18],
    skinTone: [0.68, 0.49, 0.41],
    android: false,
    brow: { color: 0x1a1410 },
    lipTint: [0.56, 0.33, 0.31],
    stubble: 0.85,
    blush: 0.7,
    eyeShadow: 0.7,
  }),
  hair: { style: 'buzz', color: 0x241c17, gloss: 0.2 },
  outfit: { top: 'shirt', bottom: 'jeans', shoes: true, sleeves: 'short', collar: false },
  cloth: { color: [0.26, 0.25, 0.23], weave: 34, roughness: 1, sheen: 0.15 },
  shoeColor: 0x241d17,
  voice: { pitch: 0.8, rate: 1.06, timbre: 'gravel' },
};

export const WREN: CharacterDef = {
  id: 'wren',
  name: 'WREN',
  android: false,
  uiColor: '#c7f0ff',
  proportions: {
    height: 1.34,
    build: 0.24,
    shoulderWidth: 0.098,
    hipWidth: 0.08,
    waist: 0.5,
    chestDepth: 0.4,
    headScale: 1.16,
  },
  head: head({
    // A nine-year-old's head is close to adult size; the body is not
    height: 0.213,
    widthRatio: 0.32,
    depthRatio: 0.4,
    sculpt: CHILD,
    irisColor: [0.3, 0.5, 0.62],
    skinTone: [0.84, 0.67, 0.6],
    android: false,
    brow: { color: 0x3a2a1e },
    eyeRadiusScale: 1.12,
    lipTint: [0.78, 0.46, 0.44],
    blush: 1,
    eyeShadow: 0.3,
  }),
  hair: { style: 'long', color: 0x3a2a1c, gloss: 0.5 },
  outfit: { top: 'hoodie', bottom: 'jeans', shoes: true, sleeves: 'long', collar: false, bulk: 0.2 },
  cloth: { color: [0.32, 0.2, 0.28], weave: 46, roughness: 1, sheen: 0.3 },
  shoeColor: 0x2a2430,
  voice: { pitch: 1.45, rate: 1, timbre: 'bright' },
};

export const CIPHER: CharacterDef = {
  id: 'cipher',
  name: 'CIPHER',
  android: true,
  uiColor: '#ff9de0',
  proportions: { height: 1.75, build: 0.4, shoulderWidth: 0.108, hipWidth: 0.078, waist: 0.6, chestDepth: 0.6 },
  head: head({
    sculpt: MASCULINE_SHARP,
    irisColor: [0.29, 0.2, 0.13],
    skinTone: [0.46, 0.33, 0.28],
    android: true,
    brow: { color: 0x120c0a },
    lipTint: [0.48, 0.28, 0.26],
    stubble: 0.35,
    blush: 0.4,
    eyeShadow: 0.5,
  }),
  hair: { style: 'buzz', color: 0x14100e, gloss: 0.3 },
  outfit: { top: 'jacket', bottom: 'trousers', shoes: true, sleeves: 'long', collar: false },
  cloth: { color: [0.14, 0.16, 0.18], weave: 44, roughness: 1, sheen: 0.25 },
  shoeColor: 0x121316,
  voice: { pitch: 1, rate: 0.9, timbre: 'synthetic' },
};

export const CAST: Record<string, CharacterDef> = {
  nova: NOVA,
  archer: ARCHER,
  voss: VOSS,
  elias: ELIAS,
  wren: WREN,
  cipher: CIPHER,
};
