import * as THREE from 'three';
import { clamp, damp, lerp, Rng } from '../engine/math';
import { autoSkin, BoneSegment, limb, mergeGeometries, roundedBox, transform } from './geom';
import { buildHead, HeadRig, MorphName } from './Head';
import type { FaceParams } from './FaceParams';
import { clothMaterial, leatherMaterial, metalMaterial, skinMaterial, SkinTone, SKIN_TONES } from './Materials';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface JointTable {
  [name: string]: THREE.Vector3;
}

const JOINTS: JointTable = {
  hips: V(0, 0.95, 0),
  spine: V(0, 1.06, 0),
  chest: V(0, 1.22, 0.005),
  neck: V(0, 1.42, 0.002),
  head: V(0, 1.5, 0.004),
  headTop: V(0, 1.71, 0.004),
  shoulderL: V(-0.05, 1.39, 0),
  armL: V(-0.163, 1.355, 0),
  forearmL: V(-0.182, 1.1, 0.012),
  handL: V(-0.195, 0.855, 0.026),
  handEndL: V(-0.2, 0.745, 0.03),
  shoulderR: V(0.05, 1.39, 0),
  armR: V(0.163, 1.355, 0),
  forearmR: V(0.182, 1.1, 0.012),
  handR: V(0.195, 0.855, 0.026),
  handEndR: V(0.2, 0.745, 0.03),
  thighL: V(-0.085, 0.92, 0),
  shinL: V(-0.095, 0.5, 0.005),
  footL: V(-0.1, 0.08, 0),
  toeL: V(-0.1, 0.045, 0.13),
  thighR: V(0.085, 0.92, 0),
  shinR: V(0.095, 0.5, 0.005),
  footR: V(0.1, 0.08, 0),
  toeR: V(0.1, 0.045, 0.13),
};

const HIERARCHY: [string, string | null][] = [
  ['hips', null],
  ['spine', 'hips'],
  ['chest', 'spine'],
  ['neck', 'chest'],
  ['head', 'neck'],
  ['shoulderL', 'chest'],
  ['armL', 'shoulderL'],
  ['forearmL', 'armL'],
  ['handL', 'forearmL'],
  ['shoulderR', 'chest'],
  ['armR', 'shoulderR'],
  ['forearmR', 'armR'],
  ['handR', 'forearmR'],
  ['thighL', 'hips'],
  ['shinL', 'thighL'],
  ['footL', 'shinL'],
  ['thighR', 'hips'],
  ['shinR', 'thighR'],
  ['footR', 'shinR'],
];

export const BONE_ORDER = HIERARCHY.map(([n]) => n);

const SEGMENTS: BoneSegment[] = [
  { name: 'hips', a: JOINTS.hips, b: JOINTS.spine, radius: 0.14 },
  { name: 'spine', a: JOINTS.spine, b: JOINTS.chest, radius: 0.13 },
  { name: 'chest', a: JOINTS.chest, b: JOINTS.neck, radius: 0.15 },
  { name: 'neck', a: JOINTS.neck, b: JOINTS.head, radius: 0.055 },
  { name: 'head', a: JOINTS.head, b: JOINTS.headTop, radius: 0.1 },
  { name: 'shoulderL', a: JOINTS.shoulderL, b: JOINTS.armL, radius: 0.075 },
  { name: 'armL', a: JOINTS.armL, b: JOINTS.forearmL, radius: 0.055 },
  { name: 'forearmL', a: JOINTS.forearmL, b: JOINTS.handL, radius: 0.045 },
  { name: 'handL', a: JOINTS.handL, b: JOINTS.handEndL, radius: 0.045 },
  { name: 'shoulderR', a: JOINTS.shoulderR, b: JOINTS.armR, radius: 0.075 },
  { name: 'armR', a: JOINTS.armR, b: JOINTS.forearmR, radius: 0.055 },
  { name: 'forearmR', a: JOINTS.forearmR, b: JOINTS.handR, radius: 0.045 },
  { name: 'handR', a: JOINTS.handR, b: JOINTS.handEndR, radius: 0.045 },
  { name: 'thighL', a: JOINTS.thighL, b: JOINTS.shinL, radius: 0.085 },
  { name: 'shinL', a: JOINTS.shinL, b: JOINTS.footL, radius: 0.06 },
  { name: 'footL', a: JOINTS.footL, b: JOINTS.toeL, radius: 0.06 },
  { name: 'thighR', a: JOINTS.thighR, b: JOINTS.shinR, radius: 0.085 },
  { name: 'shinR', a: JOINTS.shinR, b: JOINTS.footR, radius: 0.06 },
  { name: 'footR', a: JOINTS.footR, b: JOINTS.toeR, radius: 0.06 },
];

/** Sweep elliptical cross-sections along a vertical spine into a closed shell. */
function sweep(
  input: { y: number; w: number; d: number; z?: number; x?: number }[],
  radial = 24,
  squareness = 0.35,
  subdiv = 4,
): THREE.BufferGeometry {
  // Resample the profile so the shell reads as an organic body, not a stack of boxes.
  const sections: { y: number; w: number; d: number; z?: number; x?: number }[] = [];
  const curveOf = (key: 'y' | 'w' | 'd' | 'z' | 'x') =>
    new THREE.CatmullRomCurve3(
      input.map((s, i) => new THREE.Vector3(i, (s[key] as number | undefined) ?? 0, 0)),
      false,
      'catmullrom',
      0.5,
    );
  const curves = {
    y: curveOf('y'),
    w: curveOf('w'),
    d: curveOf('d'),
    z: curveOf('z'),
    x: curveOf('x'),
  };
  const sampleRows = (input.length - 1) * subdiv + 1;
  for (let r = 0; r < sampleRows; r++) {
    const t = r / (sampleRows - 1);
    sections.push({
      y: curves.y.getPoint(t).y,
      w: Math.max(0.001, curves.w.getPoint(t).y),
      d: Math.max(0.001, curves.d.getPoint(t).y),
      z: curves.z.getPoint(t).y,
      x: curves.x.getPoint(t).y,
    });
  }
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = sections.length;
  for (let r = 0; r < rows; r++) {
    const s = sections[r];
    for (let i = 0; i <= radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Superellipse: torsos are not circles.
      const p = 2 / (1 + squareness);
      const sx = Math.sign(ca) * Math.pow(Math.abs(ca), p);
      const sz = Math.sign(sa) * Math.pow(Math.abs(sa), p);
      positions.push((s.x ?? 0) + sx * s.w * 0.5, s.y, (s.z ?? 0) + sz * s.d * 0.5);
      uvs.push(i / radial, r / (rows - 1));
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let i = 0; i < radial; i++) {
      const a = r * (radial + 1) + i;
      const b = a + 1;
      const c = a + radial + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Caps.
  const capTop = positions.length / 3;
  const top = sections[rows - 1];
  positions.push(top.x ?? 0, top.y + 0.01, top.z ?? 0);
  uvs.push(0.5, 1);
  const capBottom = positions.length / 3;
  const bot = sections[0];
  positions.push(bot.x ?? 0, bot.y - 0.01, bot.z ?? 0);
  uvs.push(0.5, 0);
  for (let i = 0; i < radial; i++) {
    const rowTop = (rows - 1) * (radial + 1);
    indices.push(rowTop + i, capTop, rowTop + i + 1);
    indices.push(i + 1, capBottom, i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Build a capsule between two joints. */
function segmentGeo(a: THREE.Vector3, b: THREE.Vector3, rA: number, rB: number, seg = 14): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = limb(rB, rA, len, seg);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  const m = new THREE.Matrix4().compose(a, q, V(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}

function handGeo(side: number): THREE.BufferGeometry {
  const wrist = JOINTS[side < 0 ? 'handL' : 'handR'];
  const parts: THREE.BufferGeometry[] = [];
  const palm = roundedBox(0.052, 0.095, 0.028, 0.012, 3);
  parts.push(transform(palm, { pos: [wrist.x + side * 0.004, wrist.y - 0.045, wrist.z + 0.004] }));
  for (let f = 0; f < 4; f++) {
    const len = [0.058, 0.064, 0.058, 0.047][f];
    const x = wrist.x + side * (0.018 - f * 0.0128);
    // Two phalanges with a relaxed curl so the hand does not look splayed.
    const upper = limb(0.0078, 0.0092, len * 0.55, 8);
    transform(upper, {
      pos: [x, wrist.y - 0.088 - len * 0.55, wrist.z + 0.008],
      rot: [0.3, 0, side * (f - 1.5) * 0.025],
    });
    parts.push(upper);
    const lower = limb(0.0062, 0.0078, len * 0.5, 8);
    transform(lower, {
      pos: [x, wrist.y - 0.086 - len * 0.55 - len * 0.28, wrist.z + 0.008 + len * 0.3],
      rot: [1.05, 0, side * (f - 1.5) * 0.025],
    });
    parts.push(lower);
  }
  const thumb = limb(0.009, 0.011, 0.05, 8);
  transform(thumb, {
    pos: [wrist.x + side * 0.026, wrist.y - 0.058, wrist.z + 0.012],
    rot: [0.2, 0, side * 1.05],
  });
  parts.push(thumb);
  return mergeGeometries(parts, false)!;
}

export type Outfit = 'detective' | 'lieutenant' | 'android-domestic' | 'android-worker' | 'civilian' | 'captain';

export interface CharacterOptions {
  key: string;
  name: string;
  face?: Partial<FaceParams>;
  tone?: SkinTone;
  hair?: 'short' | 'buzz' | 'ponytail' | 'bun' | 'swept' | 'none';
  hairColor?: THREE.ColorRepresentation;
  outfit: Outfit;
  android: boolean;
  height?: number;
  build?: number;
  ledColor?: 'blue' | 'amber' | 'red' | 'off';
}

const OUTFIT_COLORS: Record<Outfit, { primary: number; secondary: number; accent: number }> = {
  detective: { primary: 0x1b2735, secondary: 0x0e141c, accent: 0x2f8fc4 },
  lieutenant: { primary: 0x23262c, secondary: 0x14161a, accent: 0x8a6a3a },
  'android-domestic': { primary: 0xdfe6ec, secondary: 0x9aa8b4, accent: 0x54c8f0 },
  'android-worker': { primary: 0x3b4450, secondary: 0x22282f, accent: 0xf0a63c },
  civilian: { primary: 0x4a4038, secondary: 0x2a241f, accent: 0x8f6a4a },
  captain: { primary: 0x1a1d24, secondary: 0x0d1014, accent: 0xb8912f },
};

export interface GestureClip {
  duration: number;
  loop?: boolean;
  tracks: Record<string, [number, [number, number, number]][]>;
}

const clip = (duration: number, tracks: GestureClip['tracks'], loop = false): GestureClip => ({ duration, tracks, loop });

/** Additive pose library, authored as euler offsets over the bind pose. */
export const CLIPS: Record<string, GestureClip> = {
  armsCrossed: clip(0.9, {
    armL: [[0, [0, 0, 0]], [1, [0.1, 0.35, -0.95]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.2, -1.15, -0.55]]],
    armR: [[0, [0, 0, 0]], [1, [0.14, -0.35, 0.95]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.28, 1.15, 0.55]]],
    chest: [[0, [0, 0, 0]], [1, [0.04, 0, 0]]],
  }),
  handsBehind: clip(0.9, {
    armL: [[0, [0, 0, 0]], [1, [0.55, -0.2, -0.18]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.3, 0.9, -0.85]]],
    armR: [[0, [0, 0, 0]], [1, [0.55, 0.2, 0.18]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.3, -0.9, 0.85]]],
    chest: [[0, [0, 0, 0]], [1, [-0.05, 0, 0]]],
  }),
  handInPocket: clip(0.8, {
    armR: [[0, [0, 0, 0]], [1, [-0.1, 0, 0.28]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.35, -0.5, -0.25]]],
    armL: [[0, [0, 0, 0]], [1, [0.05, 0, -0.08]]],
  }),
  pointForward: clip(0.55, {
    armR: [[0, [0, 0, 0]], [0.6, [-1.35, -0.25, 0.4]], [1, [-1.2, -0.2, 0.35]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.15, 0.2, -0.1]]],
    chest: [[0, [0, 0, 0]], [1, [0, -0.12, 0]]],
  }),
  presentPalm: clip(0.7, {
    armL: [[0, [0, 0, 0]], [1, [-0.85, 0.35, -0.35]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.5, 0.35, -0.2]]],
    armR: [[0, [0, 0, 0]], [1, [-0.75, -0.3, 0.3]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.45, -0.3, 0.18]]],
  }),
  reachOut: clip(0.9, {
    armR: [[0, [0, 0, 0]], [0.7, [-1.55, -0.15, 0.25]], [1, [-1.45, -0.12, 0.22]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.08, 0, 0]]],
    chest: [[0, [0, 0, 0]], [1, [-0.06, -0.08, 0]]],
    spine: [[0, [0, 0, 0]], [1, [-0.05, 0, 0]]],
  }),
  aimPistol: clip(0.45, {
    armR: [[0, [0, 0, 0]], [1, [-1.5, -0.32, 0.22]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.12, 0.24, -0.05]]],
    armL: [[0, [0, 0, 0]], [1, [-1.4, 0.55, -0.5]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.35, -0.55, 0.15]]],
    chest: [[0, [0, 0, 0]], [1, [-0.02, -0.2, 0]]],
  }),
  handsUp: clip(0.5, {
    armL: [[0, [0, 0, 0]], [1, [-0.35, 0.2, -2.35]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.15, 0, -0.35]]],
    armR: [[0, [0, 0, 0]], [1, [-0.35, -0.2, 2.35]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.15, 0, 0.35]]],
    chest: [[0, [0, 0, 0]], [1, [0.06, 0, 0]]],
  }),
  shrug: clip(1.1, {
    shoulderL: [[0, [0, 0, 0]], [0.5, [0, 0, -0.3]], [1, [0, 0, 0]]],
    shoulderR: [[0, [0, 0, 0]], [0.5, [0, 0, 0.3]], [1, [0, 0, 0]]],
    armL: [[0, [0, 0, 0]], [0.5, [0, 0, -0.3]], [1, [0, 0, 0]]],
    armR: [[0, [0, 0, 0]], [0.5, [0, 0, 0.3]], [1, [0, 0, 0]]],
  }),
  flinch: clip(0.65, {
    chest: [[0, [0, 0, 0]], [0.18, [0.22, 0, 0]], [1, [0, 0, 0]]],
    spine: [[0, [0, 0, 0]], [0.18, [0.14, 0, 0]], [1, [0, 0, 0]]],
    neck: [[0, [0, 0, 0]], [0.18, [0.3, 0, 0]], [1, [0, 0, 0]]],
    armL: [[0, [0, 0, 0]], [0.2, [-0.5, 0, -0.6]], [1, [0, 0, 0]]],
    armR: [[0, [0, 0, 0]], [0.2, [-0.5, 0, 0.6]], [1, [0, 0, 0]]],
  }),
  gripRail: clip(0.8, {
    armL: [[0, [0, 0, 0]], [1, [-0.95, 0.3, -0.35]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.35, 0.15, 0.1]]],
    armR: [[0, [0, 0, 0]], [1, [-0.95, -0.3, 0.35]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.35, -0.15, -0.1]]],
    spine: [[0, [0, 0, 0]], [1, [-0.12, 0, 0]]],
  }),
  sit: clip(0.9, {
    hips: [[0, [0, 0, 0]], [1, [0.06, 0, 0]]],
    thighL: [[0, [0, 0, 0]], [1, [-1.5, 0.06, 0.05]]],
    thighR: [[0, [0, 0, 0]], [1, [-1.5, -0.06, -0.05]]],
    shinL: [[0, [0, 0, 0]], [1, [1.45, 0, 0]]],
    shinR: [[0, [0, 0, 0]], [1, [1.45, 0, 0]]],
    footL: [[0, [0, 0, 0]], [1, [0.15, 0, 0]]],
    footR: [[0, [0, 0, 0]], [1, [0.15, 0, 0]]],
    armL: [[0, [0, 0, 0]], [1, [-0.35, 0.1, -0.12]]],
    forearmL: [[0, [0, 0, 0]], [1, [-0.9, 0.35, -0.25]]],
    armR: [[0, [0, 0, 0]], [1, [-0.35, -0.1, 0.12]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.9, -0.35, 0.25]]],
  }),
  handcuffed: clip(0.6, {
    armL: [[0, [0, 0, 0]], [1, [0.2, 0.1, -0.25]]],
    forearmL: [[0, [0, 0, 0]], [1, [-1.35, 0.55, -0.35]]],
    armR: [[0, [0, 0, 0]], [1, [0.2, -0.1, 0.25]]],
    forearmR: [[0, [0, 0, 0]], [1, [-1.35, -0.55, 0.35]]],
    spine: [[0, [0, 0, 0]], [1, [0.06, 0, 0]]],
  }),
  headBowed: clip(0.9, {
    neck: [[0, [0, 0, 0]], [1, [0.42, 0, 0]]],
    chest: [[0, [0, 0, 0]], [1, [0.12, 0, 0]]],
    spine: [[0, [0, 0, 0]], [1, [0.08, 0, 0]]],
  }),
  scanPose: clip(0.6, {
    armR: [[0, [0, 0, 0]], [1, [-0.95, -0.35, 0.5]]],
    forearmR: [[0, [0, 0, 0]], [1, [-0.7, 0.35, -0.35]]],
  }),
  kneel: clip(1.0, {
    hips: [[0, [0, 0, 0]], [1, [0.1, 0, 0]]],
    thighL: [[0, [0, 0, 0]], [1, [-1.75, 0.1, 0]]],
    shinL: [[0, [0, 0, 0]], [1, [1.9, 0, 0]]],
    thighR: [[0, [0, 0, 0]], [1, [-0.55, -0.12, 0]]],
    shinR: [[0, [0, 0, 0]], [1, [1.1, 0, 0]]],
    spine: [[0, [0, 0, 0]], [1, [0.1, 0, 0]]],
  }),
};

interface GestureState {
  clip: GestureClip;
  time: number;
  weight: number;
  target: number;
  fade: number;
}

const VOWELS = 'aeiouy';

/** Turn a line of dialogue into a viseme timeline; no audio assets required. */
function buildVisemes(text: string, duration: number): { t: number; jaw: number; wide: number; round: number }[] {
  const clean = text.replace(/[^a-zA-Z ,.!?']/g, '');
  const frames: { t: number; jaw: number; wide: number; round: number }[] = [];
  const letters = clean.split('');
  const speakable = letters.filter((c) => /[a-zA-Z]/.test(c)).length || 1;
  let acc = 0;
  const perChar = duration / speakable;
  for (const ch of letters) {
    const lower = ch.toLowerCase();
    if (!/[a-z]/.test(lower)) {
      if (ch === ',' || ch === '.' || ch === '!' || ch === '?') {
        frames.push({ t: acc, jaw: 0.04, wide: 0, round: 0 });
        acc += perChar * 2.4;
      }
      continue;
    }
    let jaw = 0.12;
    let wide = 0;
    let round = 0;
    if (VOWELS.includes(lower)) {
      if (lower === 'a') {
        jaw = 0.92;
        wide = 0.35;
      } else if (lower === 'e' || lower === 'i') {
        jaw = 0.42;
        wide = 0.85;
      } else if (lower === 'o') {
        jaw = 0.62;
        round = 0.9;
      } else if (lower === 'u') {
        jaw = 0.34;
        round = 1.0;
      } else {
        jaw = 0.35;
        wide = 0.4;
      }
    } else if ('mbp'.includes(lower)) {
      jaw = 0.0;
      round = 0.25;
    } else if ('fv'.includes(lower)) {
      jaw = 0.12;
      wide = 0.4;
    } else if ('wqr'.includes(lower)) {
      jaw = 0.25;
      round = 0.75;
    } else if ('szjc'.includes(lower)) {
      jaw = 0.14;
      wide = 0.6;
    } else if ('tdnlk g'.includes(lower)) {
      jaw = 0.32;
      wide = 0.2;
    }
    frames.push({ t: acc, jaw, wide, round });
    acc += perChar * (VOWELS.includes(lower) ? 1.5 : 0.85);
  }
  // Normalise to the requested duration.
  const scale = acc > 0 ? duration / acc : 1;
  frames.forEach((f) => (f.t *= scale));
  frames.push({ t: duration + 0.05, jaw: 0, wide: 0, round: 0 });
  return frames;
}

export class Character {
  readonly group = new THREE.Group();
  readonly name: string;
  readonly android: boolean;
  readonly bones: Record<string, THREE.Bone> = {};
  readonly skeleton: THREE.Skeleton;
  readonly head: HeadRig;
  readonly meshes: THREE.SkinnedMesh[] = [];
  readonly rng: Rng;

  /** World-space point the character is looking at (null = neutral forward). */
  gazeTarget: THREE.Vector3 | null = null;
  gazeWeight = 1;
  private gazeYaw = 0;
  private gazePitch = 0;
  private eyeYaw = 0;
  private eyePitch = 0;
  private saccade = new THREE.Vector2();
  private saccadeTimer = 0;

  private blinkTimer = 1.5;
  private blink = 0;
  private blinkSpeed = 0;

  private breath = 0;
  private sway = 0;
  private idleSeed: number;

  private gestures = new Map<string, GestureState>();
  private morphTarget: Record<string, number> = {};
  private morphCurrent: Record<string, number> = {};

  private speech: ReturnType<typeof buildVisemes> | null = null;
  private speechTime = 0;
  private speechEnergy = 0;

  private locomotion = { speed: 0, phase: 0, target: 0 };
  private ledColor = new THREE.Color(0x3fc8ff);
  private ledTargetColor = new THREE.Color(0x3fc8ff);
  private ledPulse = 0;
  emotion: 'neutral' | 'tense' | 'angry' | 'sad' | 'afraid' | 'warm' | 'shocked' = 'neutral';
  emotionWeight = 1;

  constructor(opts: CharacterOptions) {
    this.name = opts.name;
    this.android = opts.android;
    this.rng = new Rng(
      opts.key.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7),
    );
    this.idleSeed = this.rng.range(0, 100);

    // ------------------------------------------------------------- skeleton
    const boneList: THREE.Bone[] = [];
    for (const [name, parent] of HIERARCHY) {
      const bone = new THREE.Bone();
      bone.name = name;
      const world = JOINTS[name];
      const parentWorld = parent ? JOINTS[parent] : V(0, 0, 0);
      bone.position.copy(world).sub(parentWorld);
      this.bones[name] = bone;
      boneList.push(bone);
      if (parent) this.bones[parent].add(bone);
      else this.group.add(bone);
    }
    // Bind inverses are taken from bone world matrices, so the rest pose must be
    // resolved before the skeleton is created.
    this.bones.hips.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(boneList);

    const tone = opts.tone ?? SKIN_TONES.fair;
    const colors = OUTFIT_COLORS[opts.outfit];
    const build = opts.build ?? 1;

    // ------------------------------------------------------------ body skin
    const skinParts: THREE.BufferGeometry[] = [];
    skinParts.push(
      sweep(
        [
          { y: 1.28, w: 0.2 * build, d: 0.14 },
          { y: 1.36, w: 0.155 * build, d: 0.12 },
          { y: 1.41, w: 0.125, d: 0.122, z: -0.004 },
          { y: 1.45, w: 0.108, d: 0.108, z: -0.004 },
          { y: 1.49, w: 0.098, d: 0.1, z: -0.002 },
          { y: 1.52, w: 0.096, d: 0.099, z: 0.002 },
        ],
        20,
        0.55,
      ),
    );
    skinParts.push(handGeo(-1), handGeo(1));
    const isBareArm = opts.outfit === 'android-domestic' || opts.outfit === 'civilian';
    if (isBareArm) {
      skinParts.push(
        segmentGeo(JOINTS.forearmL, JOINTS.handL, 0.048, 0.032),
        segmentGeo(JOINTS.forearmR, JOINTS.handR, 0.048, 0.032),
      );
    }
    const skinGeo = mergeGeometries(skinParts, false)!;
    autoSkin(skinGeo, SEGMENTS, BONE_ORDER);
    const skinMesh = new THREE.SkinnedMesh(skinGeo, skinMaterial(tone, { android: opts.android }));
    this.meshes.push(skinMesh);

    // ------------------------------------------------------------- clothing
    const torsoSections = [
      { y: 0.84, w: 0.175 * build, d: 0.135 },
      { y: 0.93, w: 0.196 * build, d: 0.145 },
      { y: 1.03, w: 0.176 * build, d: 0.128 },
      { y: 1.13, w: 0.192 * build, d: 0.142 },
      { y: 1.24, w: 0.228 * build, d: 0.163 },
      { y: 1.33, w: 0.234 * build, d: 0.156 },
      { y: 1.39, w: 0.2 * build, d: 0.14 },
      { y: 1.43, w: 0.15 * build, d: 0.12 },
    ];
    const shirtGeo = sweep(torsoSections, 26, 0.28);
    const clothParts: THREE.BufferGeometry[] = [shirtGeo];
    // Sleeves.
    clothParts.push(
      segmentGeo(JOINTS.shoulderL, JOINTS.armL, 0.076, 0.082),
      segmentGeo(JOINTS.armL, JOINTS.forearmL, 0.058, 0.05),
      segmentGeo(JOINTS.shoulderR, JOINTS.armR, 0.076, 0.082),
      segmentGeo(JOINTS.armR, JOINTS.forearmR, 0.058, 0.05),
    );
    for (const side of [-1, 1] as const) {
      const delt = new THREE.SphereGeometry(0.072, 16, 12);
      delt.scale(1.0, 1.15, 1.0);
      delt.translate(side * 0.132, 1.365, 0.004);
      clothParts.push(delt);
    }
    if (!isBareArm) {
      clothParts.push(
        segmentGeo(JOINTS.forearmL, JOINTS.handL, 0.052, 0.038),
        segmentGeo(JOINTS.forearmR, JOINTS.handR, 0.052, 0.038),
      );
    }
    const clothGeo = mergeGeometries(clothParts, false)!;
    autoSkin(clothGeo, SEGMENTS, BONE_ORDER);
    const shirtMat = clothMaterial(colors.primary, opts.outfit.startsWith('android') ? 0.55 : 0.8, 0.25);
    const clothMesh = new THREE.SkinnedMesh(clothGeo, shirtMat);
    this.meshes.push(clothMesh);

    // Trousers and shoes.
    const legParts = [
      segmentGeo(JOINTS.thighL, JOINTS.shinL, 0.072, 0.1),
      segmentGeo(JOINTS.shinL, JOINTS.footL, 0.05, 0.078),
      segmentGeo(JOINTS.thighR, JOINTS.shinR, 0.072, 0.1),
      segmentGeo(JOINTS.shinR, JOINTS.footR, 0.05, 0.078),
    ];
    const legGeo = mergeGeometries(legParts, false)!;
    autoSkin(legGeo, SEGMENTS, BONE_ORDER);
    const legMesh = new THREE.SkinnedMesh(legGeo, clothMaterial(colors.secondary, 0.82, 0.15));
    this.meshes.push(legMesh);

    const shoeParts: THREE.BufferGeometry[] = [];
    for (const side of ['L', 'R'] as const) {
      const foot = JOINTS[`foot${side}`];
      const shoe = roundedBox(0.095, 0.075, 0.27, 0.03, 3);
      transform(shoe, { pos: [foot.x, foot.y - 0.005, foot.z + 0.055] });
      shoeParts.push(shoe);
    }
    const shoeGeo = mergeGeometries(shoeParts, false)!;
    autoSkin(shoeGeo, SEGMENTS, BONE_ORDER);
    const shoeMesh = new THREE.SkinnedMesh(shoeGeo, leatherMaterial(0x101216));
    this.meshes.push(shoeMesh);

    // Outerwear: jacket shell with lapels, or android chassis panels.
    if (opts.outfit === 'detective' || opts.outfit === 'lieutenant' || opts.outfit === 'captain') {
      const coatSections = [
        { y: 0.74, w: 0.268 * build, d: 0.192 },
        { y: 0.88, w: 0.252 * build, d: 0.182 },
        { y: 1.0, w: 0.228 * build, d: 0.168 },
        { y: 1.13, w: 0.226 * build, d: 0.166 },
        { y: 1.24, w: 0.256 * build, d: 0.184 },
        { y: 1.33, w: 0.262 * build, d: 0.178 },
        { y: 1.39, w: 0.222 * build, d: 0.152 },
        { y: 1.42, w: 0.17 * build, d: 0.13 },
      ];
      const coat = sweep(coatSections, 26, 0.26);
      const coatParts = [coat];
      // Lapels: thin angled slabs framing the chest.
      for (const side of [-1, 1] as const) {
        const lapel = roundedBox(0.075, 0.3, 0.018, 0.008, 2);
        transform(lapel, {
          pos: [side * 0.055, 1.285, 0.088],
          rot: [0.06, side * 0.32, side * 0.16],
        });
        coatParts.push(lapel);
      }
      // Standing collar.
      const collar = new THREE.TorusGeometry(0.083, 0.019, 8, 24, Math.PI * 1.5);
      transform(collar, { pos: [0, 1.41, -0.004], rot: [Math.PI / 2 - 0.18, 0, -Math.PI * 0.25] });
      coatParts.push(collar);
      const coatGeo = mergeGeometries(coatParts, false)!;
      autoSkin(coatGeo, SEGMENTS, BONE_ORDER);
      const coatMesh = new THREE.SkinnedMesh(
        coatGeo,
        opts.outfit === 'lieutenant' ? leatherMaterial(0x22252b) : clothMaterial(colors.primary, 0.7, 0.35),
      );
      this.meshes.push(coatMesh);
    }

    if (opts.android) {
      // Glowing chassis seams and an armband, CyberLife-style.
      const trim: THREE.BufferGeometry[] = [];
      const band = new THREE.TorusGeometry(0.078, 0.008, 8, 22);
      transform(band, { pos: [-0.185, 1.24, 0.005], rot: [0, 0, Math.PI / 2 - 0.12] });
      trim.push(band);
      const chestLine = roundedBox(0.008, 0.16, 0.008, 0.003, 2);
      transform(chestLine, { pos: [0.075 * build, 1.28, 0.088] });
      trim.push(chestLine);
      const collarLine = new THREE.TorusGeometry(0.072, 0.005, 6, 24, Math.PI * 1.1);
      transform(collarLine, { pos: [0, 1.4, 0.01], rot: [Math.PI / 2, 0, -Math.PI * 0.05] });
      trim.push(collarLine);
      const trimGeo = mergeGeometries(trim, false)!;
      autoSkin(trimGeo, SEGMENTS, BONE_ORDER);
      const trimMesh = new THREE.SkinnedMesh(
        trimGeo,
        new THREE.MeshStandardMaterial({
          color: 0xdff6ff,
          emissive: new THREE.Color(colors.accent),
          emissiveIntensity: 3.2,
          roughness: 0.3,
          metalness: 0.4,
        }),
      );
      this.meshes.push(trimMesh);
    } else if (opts.outfit === 'lieutenant' || opts.outfit === 'captain') {
      const badge = roundedBox(0.045, 0.055, 0.006, 0.004, 2);
      transform(badge, { pos: [-0.09, 1.29, 0.098], rot: [0, -0.2, 0] });
      autoSkin(badge, SEGMENTS, BONE_ORDER);
      const badgeMesh = new THREE.SkinnedMesh(badge, metalMaterial(colors.accent, 0.25));
      this.meshes.push(badgeMesh);
    }

    for (const m of this.meshes) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.bind(this.skeleton);
      m.frustumCulled = false;
      this.group.add(m);
    }

    // ----------------------------------------------------------------- head
    this.head = buildHead({
      face: { ...opts.face, android: opts.android },
      tone,
      hair: opts.hair ?? 'short',
      hairColor: opts.hairColor ?? 0x2a1f1a,
      led: opts.android,
      key: opts.key,
    });
    // Head origin sits on the eye line; place it so the chin clears the neck.
    this.head.group.position.set(0, 0.1275, 0.012);
    this.bones.head.add(this.head.group);
    if (opts.ledColor && opts.ledColor !== 'blue') this.setLed(opts.ledColor);

    const scale = opts.height ?? 1;
    this.group.scale.setScalar(scale);

    for (const name of ['jawOpen', 'mouthWide', 'mouthO', 'smile', 'frown', 'browRaise', 'browFurrow', 'squint', 'sneer']) {
      this.morphTarget[name] = 0;
      this.morphCurrent[name] = 0;
    }
  }

  get position() {
    return this.group.position;
  }

  get rotation() {
    return this.group.rotation;
  }

  /** World position of the eye line - the natural target for framing and gaze. */
  worldHeadPosition(out = new THREE.Vector3()): THREE.Vector3 {
    this.bones.head.getWorldPosition(out);
    out.y += 0.1275 * this.group.scale.y;
    return out;
  }

  worldEyePosition(out = new THREE.Vector3()): THREE.Vector3 {
    this.head.eyes.getWorldPosition(out);
    const l = this.head.eyeL.getWorldPosition(new THREE.Vector3());
    const r = this.head.eyeR.getWorldPosition(new THREE.Vector3());
    return out.copy(l).add(r).multiplyScalar(0.5);
  }

  playGesture(name: keyof typeof CLIPS | string, weight = 1) {
    const c = CLIPS[name];
    if (!c) return;
    const existing = this.gestures.get(name);
    if (existing) {
      existing.target = weight;
      return;
    }
    this.gestures.set(name, { clip: c, time: 0, weight: 0, target: weight, fade: 3.2 });
  }

  stopGesture(name: string) {
    const g = this.gestures.get(name);
    if (g) g.target = 0;
  }

  clearGestures(except: string[] = []) {
    for (const [name, g] of this.gestures) if (!except.includes(name)) g.target = 0;
  }

  setLed(state: 'blue' | 'amber' | 'red' | 'off') {
    const map = { blue: 0x3fc8ff, amber: 0xffae3a, red: 0xff3b30, off: 0x101418 };
    this.ledTargetColor.setHex(map[state]);
    this.ledPulse = state === 'red' ? 3.2 : state === 'amber' ? 1.6 : 0.6;
  }

  setMorph(name: MorphName, value: number) {
    this.morphTarget[name] = value;
  }

  /** Start a spoken line; drives jaw/lip morphs and gesture emphasis. */
  say(text: string, duration: number) {
    this.speech = buildVisemes(text, duration);
    this.speechTime = 0;
  }

  stopSpeaking() {
    this.speech = null;
    this.speechTime = 0;
  }

  get speaking() {
    return this.speech !== null;
  }

  setWalkSpeed(speed: number) {
    this.locomotion.target = speed;
  }

  private applyEmotion() {
    const w = this.emotionWeight;
    const set = (n: string, v: number) => (this.morphTarget[n] = Math.max(this.morphTarget[n] ?? 0, v * w));
    switch (this.emotion) {
      case 'tense':
        set('browFurrow', 0.35);
        set('squint', 0.18);
        break;
      case 'angry':
        set('browFurrow', 0.8);
        set('sneer', 0.35);
        set('frown', 0.3);
        break;
      case 'sad':
        set('frown', 0.5);
        set('browRaise', 0.25);
        break;
      case 'afraid':
        set('browRaise', 0.7);
        set('jawOpen', 0.12);
        break;
      case 'warm':
        set('smile', 0.32);
        break;
      case 'shocked':
        set('browRaise', 0.9);
        set('jawOpen', 0.25);
        break;
      default:
        break;
    }
  }

  update(dt: number, time: number) {
    // ------------------------------------------------------- reset pose
    for (const name of BONE_ORDER) this.bones[name].rotation.set(0, 0, 0);

    const t = time + this.idleSeed;

    // ------------------------------------------------------- locomotion
    this.locomotion.speed = damp(this.locomotion.speed, this.locomotion.target, 5, dt);
    const speed = this.locomotion.speed;
    if (speed > 0.01) {
      this.locomotion.phase += dt * (2.6 + speed * 1.6);
      const ph = this.locomotion.phase;
      const amp = clamp(speed / 1.4) * 1.0;
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      this.bones.thighL.rotation.x = -s * 0.62 * amp;
      this.bones.thighR.rotation.x = s * 0.62 * amp;
      this.bones.shinL.rotation.x = clamp(Math.sin(ph - 1.1), 0, 1) * 1.0 * amp;
      this.bones.shinR.rotation.x = clamp(Math.sin(ph + Math.PI - 1.1), 0, 1) * 1.0 * amp;
      this.bones.footL.rotation.x = -Math.sin(ph - 0.5) * 0.22 * amp;
      this.bones.footR.rotation.x = -Math.sin(ph + Math.PI - 0.5) * 0.22 * amp;
      this.bones.hips.rotation.y = c * 0.09 * amp;
      this.bones.hips.rotation.z = s * 0.045 * amp;
      this.bones.hips.position.y = JOINTS.hips.y - 0.018 * amp + Math.abs(Math.sin(ph)) * 0.022 * amp;
      this.bones.chest.rotation.y = -c * 0.1 * amp;
      this.bones.armL.rotation.x = s * 0.55 * amp;
      this.bones.armR.rotation.x = -s * 0.55 * amp;
      this.bones.forearmL.rotation.x = -0.25 * amp - clamp(s, 0, 1) * 0.35 * amp;
      this.bones.forearmR.rotation.x = -0.25 * amp - clamp(-s, 0, 1) * 0.35 * amp;
    } else {
      this.bones.hips.position.y = JOINTS.hips.y;
      // Relaxed stance: arms hang inward with a soft elbow break.
      this.bones.armL.rotation.set(0.04, 0.06, 0.055);
      this.bones.armR.rotation.set(0.04, -0.06, -0.055);
      this.bones.forearmL.rotation.set(-0.3, 0.12, 0.05);
      this.bones.forearmR.rotation.set(-0.3, -0.12, -0.05);
      this.bones.handL.rotation.set(-0.12, 0, 0.06);
      this.bones.handR.rotation.set(-0.12, 0, -0.06);
    }

    // ---------------------------------------------------------- breathing
    this.breath += dt * (this.emotion === 'afraid' ? 2.4 : this.emotion === 'tense' ? 1.5 : 1.05);
    const b = Math.sin(this.breath) * 0.5 + 0.5;
    this.bones.chest.rotation.x += -b * 0.028;
    this.bones.spine.rotation.x += -b * 0.012;
    this.bones.shoulderL.rotation.z += b * 0.035;
    this.bones.shoulderR.rotation.z += -b * 0.035;

    // ------------------------------------------------------------- idle sway
    this.sway += dt;
    const sway = Math.sin(this.sway * 0.42) * 0.6 + Math.sin(this.sway * 0.23 + 1.7) * 0.4;
    const idleAmp = 1 - clamp(speed);
    this.bones.hips.rotation.y += sway * 0.03 * idleAmp;
    this.bones.spine.rotation.z += sway * 0.012 * idleAmp;
    this.bones.chest.rotation.z += -sway * 0.008 * idleAmp;
    this.bones.neck.rotation.z += sway * 0.01 * idleAmp;

    // -------------------------------------------------------------- gestures
    for (const [name, g] of this.gestures) {
      g.weight = damp(g.weight, g.target, g.fade, dt);
      if (g.target === 0 && g.weight < 0.002) {
        this.gestures.delete(name);
        continue;
      }
      g.time = Math.min(g.time + dt, g.clip.duration);
      const u = g.clip.duration > 0 ? clamp(g.time / g.clip.duration) : 1;
      for (const [boneName, keys] of Object.entries(g.clip.tracks)) {
        const bone = this.bones[boneName];
        if (!bone) continue;
        let prev = keys[0];
        let next = keys[keys.length - 1];
        for (let i = 0; i < keys.length - 1; i++) {
          if (u >= keys[i][0] && u <= keys[i + 1][0]) {
            prev = keys[i];
            next = keys[i + 1];
            break;
          }
        }
        const span = next[0] - prev[0];
        const k = span > 1e-5 ? clamp((u - prev[0]) / span) : 1;
        const ease = k * k * (3 - 2 * k);
        bone.rotation.x += lerp(prev[1][0], next[1][0], ease) * g.weight;
        bone.rotation.y += lerp(prev[1][1], next[1][1], ease) * g.weight;
        bone.rotation.z += lerp(prev[1][2], next[1][2], ease) * g.weight;
      }
    }

    // ------------------------------------------------------------------ gaze
    let targetYaw = 0;
    let targetPitch = 0;
    if (this.gazeTarget) {
      const local = this.group.worldToLocal(this.gazeTarget.clone());
      const headLocal = V(0, JOINTS.head.y + 0.1, 0.05);
      const d = local.clone().sub(headLocal);
      targetYaw = Math.atan2(d.x, d.z);
      targetPitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      targetYaw = clamp(targetYaw, -1.4, 1.4);
      targetPitch = clamp(targetPitch, -0.65, 0.65);
    }
    targetYaw *= this.gazeWeight;
    targetPitch *= this.gazeWeight;
    this.gazeYaw = damp(this.gazeYaw, targetYaw, 5.5, dt);
    this.gazePitch = damp(this.gazePitch, targetPitch, 5.5, dt);
    // Split the look between neck, chest and eyes for a natural chain.
    const neckShare = clamp(Math.abs(this.gazeYaw) / 1.2) * 0.35 + 0.45;
    this.bones.neck.rotation.y += this.gazeYaw * neckShare;
    this.bones.neck.rotation.x += this.gazePitch * 0.6;
    this.bones.chest.rotation.y += this.gazeYaw * 0.16;
    this.bones.spine.rotation.y += this.gazeYaw * 0.07;
    const microHead = Math.sin(t * 1.7) * 0.012 + Math.sin(t * 0.61) * 0.02;
    this.bones.neck.rotation.y += microHead * 0.6;
    this.bones.neck.rotation.x += Math.sin(t * 1.13 + 2) * 0.01;

    // Eyes take the residual, with saccades.
    this.saccadeTimer -= dt;
    if (this.saccadeTimer <= 0) {
      this.saccadeTimer = this.rng.range(0.5, 2.4);
      const amp = this.emotion === 'afraid' || this.emotion === 'tense' ? 0.11 : 0.055;
      this.saccade.set(this.rng.gauss(0, amp), this.rng.gauss(0, amp * 0.5));
    }
    const residYaw = this.gazeYaw * (1 - neckShare) + this.saccade.x;
    const residPitch = this.gazePitch * 0.4 + this.saccade.y;
    this.eyeYaw = damp(this.eyeYaw, clamp(residYaw, -0.5, 0.5), 18, dt);
    this.eyePitch = damp(this.eyePitch, clamp(residPitch, -0.35, 0.35), 18, dt);
    for (const eye of [this.head.eyeL, this.head.eyeR]) {
      eye.rotation.set(this.eyePitch, this.eyeYaw, 0, 'YXZ');
    }

    // ----------------------------------------------------------------- blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = this.rng.range(1.6, 5.2) * (this.emotion === 'afraid' ? 0.45 : 1);
      this.blinkSpeed = 1;
    }
    if (this.blinkSpeed > 0) {
      this.blink += dt * 11;
      if (this.blink >= Math.PI) {
        this.blink = 0;
        this.blinkSpeed = 0;
      }
    }
    const blinkAmt = this.blinkSpeed > 0 ? Math.sin(this.blink) : 0;
    const squint = this.morphCurrent.squint ?? 0;
    const lidBase = -0.42 + squint * 0.16;
    this.head.lidUpperL.rotation.x = lidBase + blinkAmt * 1.5 - this.eyePitch * 0.35;
    this.head.lidUpperR.rotation.x = lidBase + blinkAmt * 1.5 - this.eyePitch * 0.35;
    this.head.lidLowerL.rotation.x = 0.3 - blinkAmt * 0.28 - squint * 0.12;
    this.head.lidLowerR.rotation.x = 0.3 - blinkAmt * 0.28 - squint * 0.12;

    // ----------------------------------------------------------------- speech
    for (const k of Object.keys(this.morphTarget)) this.morphTarget[k] = 0;
    this.applyEmotion();

    if (this.speech) {
      this.speechTime += dt;
      const frames = this.speech;
      let i = 0;
      while (i < frames.length - 1 && frames[i + 1].t < this.speechTime) i++;
      const a = frames[i];
      const bb = frames[Math.min(i + 1, frames.length - 1)];
      const span = Math.max(1e-4, bb.t - a.t);
      const k = clamp((this.speechTime - a.t) / span);
      const jaw = lerp(a.jaw, bb.jaw, k);
      const wide = lerp(a.wide, bb.wide, k);
      const round = lerp(a.round, bb.round, k);
      this.morphTarget.jawOpen = Math.max(this.morphTarget.jawOpen, jaw * 0.78);
      this.morphTarget.mouthWide = Math.max(this.morphTarget.mouthWide, wide * 0.7);
      this.morphTarget.mouthO = Math.max(this.morphTarget.mouthO, round * 0.8);
      this.speechEnergy = damp(this.speechEnergy, jaw, 12, dt);
      // Head motion follows speech emphasis.
      this.bones.neck.rotation.x += -this.speechEnergy * 0.055;
      this.bones.neck.rotation.z += Math.sin(this.speechTime * 3.1) * 0.02 * this.speechEnergy;
      this.bones.chest.rotation.x += -this.speechEnergy * 0.012;
      if (this.speechTime > (frames[frames.length - 1]?.t ?? 0)) {
        this.speech = null;
        this.speechEnergy = 0;
      }
    } else {
      this.speechEnergy = damp(this.speechEnergy, 0, 8, dt);
    }

    // --------------------------------------------------------------- morphs
    const infl = this.head.face.morphTargetInfluences;
    if (infl) {
      for (const [name, target] of Object.entries(this.morphTarget)) {
        const idx = this.head.morphIndex[name as MorphName];
        if (idx === undefined) continue;
        const speedUp = name === 'jawOpen' || name === 'mouthWide' || name === 'mouthO' ? 22 : 7;
        this.morphCurrent[name] = damp(this.morphCurrent[name] ?? 0, target, speedUp, dt);
        infl[idx] = this.morphCurrent[name];
      }
    }

    // ------------------------------------------------------------------ LED
    if (this.head.led) {
      this.ledColor.lerp(this.ledTargetColor, clamp(dt * 6));
      const mat = this.head.led.material as THREE.MeshStandardMaterial;
      const pulse = this.ledPulse > 1 ? 0.55 + 0.45 * Math.sin(time * this.ledPulse * 3.2) : 1;
      mat.emissive.copy(this.ledColor);
      mat.emissiveIntensity = 5 * pulse;
    }

    this.bones.hips.updateMatrixWorld(true);
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}
