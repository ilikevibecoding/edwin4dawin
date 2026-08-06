/**
 * A performable character: procedural body, sculpted head, facial rig and an
 * animation stack (clip pose -> procedural life -> look-at -> face).
 */
import * as THREE from 'three';
import { clamp, lerp, Rng, smoothstep } from '../engine/Noise';
import { buildBody, type Outfit } from './Body';
import {
  buildBrow,
  buildEar,
  buildEye,
  buildHair,
  buildLed,
  buildMouth,
  setEyeLids,
  setLed,
  type EyeAssembly,
  type HairOptions,
  type LedAssembly,
  type LedState,
  type MouthAssembly,
} from './Face';
import { buildHeadGeometry, MORPH_ORDER, type HeadShape, type MorphName } from './Head';
import { makeClothMaterial, makeShoeMaterial, makeSkinMaterial, type ClothOptions } from './CharacterMaterials';
import { buildRig, type BoneName, type Proportions, type Rig } from './Rig';

export type Pose = Partial<Record<BoneName, [number, number, number]>>;

export interface Clip {
  name: string;
  duration: number;
  loop: boolean;
  keys: { t: number; pose: Pose }[];
}

const D = THREE.MathUtils.degToRad;

/**
 * Hand-authored pose library. Angles are additive offsets from the rest pose.
 * The bind pose has the arms 30 degrees from vertical, so the standing poses
 * rotate them inward about Z to hang naturally.
 */
export const POSES: Record<string, Pose> = {
  rest: {},
  neutralStand: {
    spine: [D(1), 0, 0],
    chest: [D(-1.5), 0, 0],
    armL: [D(-3), 0, D(-19)],
    armR: [D(-3), 0, D(19)],
    forearmL: [D(-12), 0, D(-4)],
    forearmR: [D(-12), 0, D(4)],
  },
  armsCrossed: {
    chest: [D(2), 0, 0],
    armL: [D(-26), D(10), D(-30)],
    forearmL: [D(-72), D(18), D(-8)],
    handL: [0, D(20), 0],
    armR: [D(-26), D(-10), D(30)],
    forearmR: [D(-78), D(-18), D(8)],
    handR: [0, D(-20), 0],
  },
  handsInPockets: {
    armL: [D(6), 0, D(-24)],
    forearmL: [D(-26), 0, D(-6)],
    armR: [D(6), 0, D(24)],
    forearmR: [D(-26), 0, D(6)],
  },
  talkOpenPalms: {
    chest: [D(-2), 0, 0],
    armL: [D(-30), D(8), D(-24)],
    forearmL: [D(-58), D(14), 0],
    handL: [D(10), D(18), 0],
    armR: [D(-30), D(-8), D(24)],
    forearmR: [D(-58), D(-14), 0],
    handR: [D(10), D(-18), 0],
  },
  talkOneHand: {
    chest: [D(-1), D(-3), 0],
    armR: [D(-38), D(-6), D(22)],
    forearmR: [D(-64), D(-12), 0],
    handR: [D(12), D(-14), 0],
    armL: [D(-4), 0, D(-17)],
    forearmL: [D(-16), 0, 0],
  },
  handToChest: {
    chest: [D(2), 0, 0],
    armR: [D(-48), D(-14), D(34)],
    forearmR: [D(-98), D(-26), 0],
    handR: [D(16), D(-24), 0],
    armL: [D(-3), 0, D(-19)],
  },
  pointForward: {
    chest: [D(-4), D(-6), 0],
    armR: [D(-72), D(-4), D(14)],
    forearmR: [D(-16), 0, 0],
    armL: [D(-3), 0, D(-19)],
  },
  reachOut: {
    chest: [D(-6), D(-4), 0],
    spine: [D(-3), 0, 0],
    armR: [D(-66), D(-10), D(16)],
    forearmR: [D(-28), 0, 0],
    armL: [D(-16), 0, D(-14)],
    forearmL: [D(-30), 0, 0],
  },
  defensive: {
    spine: [D(6), 0, 0],
    chest: [D(8), 0, 0],
    neck: [D(6), 0, 0],
    armL: [D(-52), D(16), D(-36)],
    forearmL: [D(-96), D(20), 0],
    armR: [D(-52), D(-16), D(36)],
    forearmR: [D(-96), D(-20), 0],
  },
  headDown: {
    spine: [D(4), 0, 0],
    chest: [D(5), 0, 0],
    neck: [D(14), 0, 0],
    head: [D(12), 0, 0],
    armL: [D(2), 0, D(-20)],
    armR: [D(2), 0, D(20)],
  },
  sitting: {
    hips: [D(-6), 0, 0],
    spine: [D(4), 0, 0],
    chest: [D(2), 0, 0],
    thighL: [D(-84), D(4), D(-3)],
    thighR: [D(-84), D(-4), D(3)],
    shinL: [D(80), 0, 0],
    shinR: [D(80), 0, 0],
    footL: [D(6), 0, 0],
    footR: [D(6), 0, 0],
    armL: [D(-14), D(6), D(-16)],
    forearmL: [D(-58), D(10), 0],
    armR: [D(-14), D(-6), D(16)],
    forearmR: [D(-58), D(-10), 0],
  },
  sittingLeanIn: {
    hips: [D(-10), 0, 0],
    spine: [D(-8), 0, 0],
    chest: [D(-8), 0, 0],
    neck: [D(-4), 0, 0],
    thighL: [D(-82), D(6), D(-4)],
    thighR: [D(-82), D(-6), D(4)],
    shinL: [D(76), 0, 0],
    shinR: [D(76), 0, 0],
    armL: [D(-40), D(14), D(-20)],
    forearmL: [D(-72), D(16), 0],
    armR: [D(-40), D(-14), D(20)],
    forearmR: [D(-72), D(-16), 0],
  },
  sittingSlumped: {
    hips: [D(-2), 0, 0],
    spine: [D(10), 0, 0],
    chest: [D(10), 0, 0],
    neck: [D(10), 0, 0],
    head: [D(6), 0, 0],
    thighL: [D(-80), D(8), D(-6)],
    thighR: [D(-80), D(-8), D(6)],
    shinL: [D(72), 0, 0],
    shinR: [D(72), 0, 0],
    armL: [D(-6), D(4), D(-14)],
    forearmL: [D(-34), D(6), 0],
    armR: [D(-6), D(-4), D(14)],
    forearmR: [D(-34), D(-6), 0],
  },
  kneeling: {
    hips: [D(-4), 0, 0],
    thighL: [D(-86), D(6), 0],
    shinL: [D(96), 0, 0],
    thighR: [D(-16), D(-4), 0],
    shinR: [D(84), 0, 0],
    spine: [D(-4), 0, 0],
  },
  handsUp: {
    armL: [D(-116), D(20), D(-30)],
    forearmL: [D(-52), D(14), 0],
    armR: [D(-116), D(-20), D(30)],
    forearmR: [D(-52), D(-14), 0],
  },
  aimForward: {
    chest: [D(-4), D(-14), 0],
    armR: [D(-78), D(-8), D(20)],
    forearmR: [D(-14), 0, 0],
    armL: [D(-66), D(24), D(-26)],
    forearmL: [D(-48), D(18), 0],
  },
  lookingAway: { chest: [0, D(16), 0], neck: [0, D(18), 0], head: [0, D(14), 0] },
};

export const CLIPS: Record<string, Clip> = {
  idle: {
    name: 'idle',
    duration: 6,
    loop: true,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 3, pose: { ...POSES.neutralStand, chest: [D(-2.5), D(1.5), 0] } },
      { t: 6, pose: POSES.neutralStand },
    ],
  },
  idleCrossed: {
    name: 'idleCrossed',
    duration: 7,
    loop: true,
    keys: [
      { t: 0, pose: POSES.armsCrossed },
      { t: 3.5, pose: { ...POSES.armsCrossed, chest: [D(3), D(-2), 0] } },
      { t: 7, pose: POSES.armsCrossed },
    ],
  },
  idlePockets: {
    name: 'idlePockets',
    duration: 8,
    loop: true,
    keys: [
      { t: 0, pose: POSES.handsInPockets },
      { t: 4, pose: { ...POSES.handsInPockets, chest: [D(1), D(2), 0] } },
      { t: 8, pose: POSES.handsInPockets },
    ],
  },
  talkA: {
    name: 'talkA',
    duration: 3.2,
    loop: true,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 0.7, pose: POSES.talkOneHand },
      { t: 1.6, pose: { ...POSES.talkOneHand, forearmR: [D(-48), D(-6), 0] } },
      { t: 2.5, pose: POSES.talkOpenPalms },
      { t: 3.2, pose: POSES.neutralStand },
    ],
  },
  talkB: {
    name: 'talkB',
    duration: 4,
    loop: true,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 0.9, pose: POSES.talkOpenPalms },
      { t: 2, pose: POSES.handToChest },
      { t: 3, pose: POSES.talkOneHand },
      { t: 4, pose: POSES.neutralStand },
    ],
  },
  talkSeated: {
    name: 'talkSeated',
    duration: 3.6,
    loop: true,
    keys: [
      { t: 0, pose: POSES.sitting },
      { t: 1.2, pose: { ...POSES.sitting, armR: [D(-34), D(-12), D(22)], forearmR: [D(-84), D(-16), 0] } },
      { t: 2.4, pose: POSES.sittingLeanIn },
      { t: 3.6, pose: POSES.sitting },
    ],
  },
  sit: { name: 'sit', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.sitting }] },
  sitSlumped: { name: 'sitSlumped', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.sittingSlumped }] },
  sitLeanIn: { name: 'sitLeanIn', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.sittingLeanIn }] },
  point: {
    name: 'point',
    duration: 1.6,
    loop: false,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 0.4, pose: POSES.pointForward },
      { t: 1.2, pose: POSES.pointForward },
      { t: 1.6, pose: POSES.neutralStand },
    ],
  },
  reach: {
    name: 'reach',
    duration: 2.2,
    loop: false,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 0.7, pose: POSES.reachOut },
      { t: 1.5, pose: POSES.reachOut },
      { t: 2.2, pose: POSES.neutralStand },
    ],
  },
  flinch: {
    name: 'flinch',
    duration: 1.1,
    loop: false,
    keys: [
      { t: 0, pose: POSES.neutralStand },
      { t: 0.12, pose: POSES.defensive },
      { t: 0.6, pose: POSES.defensive },
      { t: 1.1, pose: POSES.neutralStand },
    ],
  },
  defensive: { name: 'defensive', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.defensive }] },
  handsUp: { name: 'handsUp', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.handsUp }] },
  aim: { name: 'aim', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.aimForward }] },
  kneel: { name: 'kneel', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.kneeling }] },
  despair: {
    name: 'despair',
    duration: 5,
    loop: true,
    keys: [
      { t: 0, pose: POSES.headDown },
      { t: 2.5, pose: { ...POSES.headDown, chest: [D(7), 0, 0], neck: [D(16), 0, 0] } },
      { t: 5, pose: POSES.headDown },
    ],
  },
  lookAway: { name: 'lookAway', duration: 1, loop: true, keys: [{ t: 0, pose: POSES.lookingAway }] },
};

export type Emotion =
  | 'neutral' | 'happy' | 'sad' | 'angry' | 'afraid' | 'surprised'
  | 'thinking' | 'determined' | 'pain' | 'disgust' | 'pleading';

export const EXPRESSIONS: Record<Emotion, Partial<Record<MorphName, number>>> = {
  neutral: {},
  happy: { smile: 0.85, cheekRaise: 0.5, squint: 0.3, browOuterUp: 0.2 },
  sad: { frown: 0.6, browFurrow: 0.35, browUp: 0.25, lipsClosed: 0.2 },
  angry: { browFurrow: 0.9, sneer: 0.3, mouthWide: 0.15, squint: 0.35, frown: 0.3 },
  afraid: { browUp: 0.8, jawOpen: 0.22, mouthWide: 0.3 },
  surprised: { browUp: 1, jawOpen: 0.42, mouthWide: 0.1 },
  thinking: { browFurrow: 0.4, squint: 0.25, mouthPucker: 0.15 },
  determined: { browFurrow: 0.5, lipsClosed: 0.55, squint: 0.2 },
  pain: { browFurrow: 0.8, squint: 0.8, mouthWide: 0.4, jawOpen: 0.2, sneer: 0.4 },
  disgust: { sneer: 0.8, browFurrow: 0.5, squint: 0.4, frown: 0.3 },
  pleading: { browUp: 0.7, browFurrow: 0.45, frown: 0.3, jawOpen: 0.1 },
};

type Viseme = Partial<Record<MorphName, number>>;

const VISEMES: Record<string, Viseme> = {
  sil: {},
  AA: { jawOpen: 0.72, mouthWide: 0.15 },
  AE: { jawOpen: 0.5, mouthWide: 0.42 },
  EE: { jawOpen: 0.22, mouthWide: 0.68 },
  IH: { jawOpen: 0.2, mouthWide: 0.3 },
  OH: { jawOpen: 0.44, mouthPucker: 0.62 },
  OO: { jawOpen: 0.16, mouthPucker: 0.95 },
  MM: { lipsClosed: 1 },
  FV: { lipsClosed: 0.5, sneer: 0.18 },
  SS: { jawOpen: 0.12, mouthWide: 0.45 },
  TH: { jawOpen: 0.26, mouthWide: 0.2 },
  LL: { jawOpen: 0.32, mouthWide: 0.18 },
  RR: { jawOpen: 0.26, mouthPucker: 0.34 },
};

const CHAR_TO_VISEME: Record<string, string> = {
  a: 'AA', e: 'EE', i: 'IH', y: 'IH', o: 'OH', u: 'OO', w: 'OO',
  m: 'MM', b: 'MM', p: 'MM', f: 'FV', v: 'FV',
  s: 'SS', z: 'SS', c: 'SS', x: 'SS', j: 'SS',
  t: 'TH', d: 'TH', n: 'TH', l: 'LL', r: 'RR',
  g: 'AE', k: 'AE', h: 'AE', q: 'OO',
};

interface VisemeKey {
  t: number;
  viseme: string;
  strength: number;
}

/** Turns a line of dialogue into a viseme timeline of the requested length. */
export function textToVisemes(text: string, seconds: number): VisemeKey[] {
  const words = text.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  const keys: VisemeKey[] = [];
  if (words.length === 0) return keys;
  const weights = words.map((w) => Math.max(1, w.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  for (let wi = 0; wi < words.length; wi++) {
    const wordDur = (weights[wi] / total) * seconds * 0.92;
    const chars = words[wi].split('').filter((c, i, arr) => c !== arr[i - 1]);
    const per = wordDur / Math.max(1, chars.length);
    for (const c of chars) {
      const v = CHAR_TO_VISEME[c];
      if (v) keys.push({ t, viseme: v, strength: 'aeiouy'.includes(c) ? 1 : 0.75 });
      t += per;
    }
    // Brief closure between words
    keys.push({ t, viseme: 'sil', strength: 0.35 });
    t += (seconds * 0.08) / words.length;
  }
  return keys;
}

export interface CharacterDef {
  id: string;
  name: string;
  android: boolean;
  proportions: Partial<Proportions>;
  head: HeadShape;
  hair: HairOptions;
  outfit: Partial<Outfit>;
  cloth: ClothOptions;
  shoeColor?: THREE.ColorRepresentation;
  /** Dialogue colour used by the UI. */
  uiColor: string;
  idleClip?: string;
  voice: { pitch: number; rate: number; timbre: 'warm' | 'neutral' | 'bright' | 'synthetic' | 'gravel' };
}

export interface CharacterQuality {
  bodyCell: number;
  hairDensity: number;
  textureSize: number;
}

export const QUALITY_BY_TIER: Record<string, CharacterQuality> = {
  low: { bodyCell: 0.02, hairDensity: 0.35, textureSize: 256 },
  medium: { bodyCell: 0.016, hairDensity: 0.6, textureSize: 512 },
  high: { bodyCell: 0.013, hairDensity: 0.85, textureSize: 512 },
  ultra: { bodyCell: 0.0115, hairDensity: 1, textureSize: 512 },
};

interface ActiveClip {
  clip: Clip;
  time: number;
  weight: number;
  fadeIn: number;
}

export class Character {
  readonly def: CharacterDef;
  readonly group = new THREE.Group();
  readonly rig: Rig;
  readonly body: THREE.SkinnedMesh;
  readonly headGroup = new THREE.Group();
  readonly headMesh: THREE.Mesh;
  readonly eyes: [EyeAssembly, EyeAssembly];
  readonly mouth: MouthAssembly;
  readonly led: LedAssembly | null;
  readonly morphIndex: Record<MorphName, number>;

  private morphCurrent: Record<MorphName, number>;
  private morphTarget: Record<MorphName, number>;
  private clips: ActiveClip[] = [];

  private lookTarget: THREE.Vector3 | null = null;
  private lookWeight = 0;
  private lookWeightTarget = 0;
  private lookCurrent = new THREE.Vector2();
  private gazeJitter = new THREE.Vector2();
  private gazeTimer = 0;
  private gazePitch = 0;

  private blinkTimer = 1.5;
  private blinkPhase = -1;
  private emotion: Emotion = 'neutral';
  private emotionWeight = 0;

  private visemeKeys: VisemeKey[] = [];
  private visemeTime = 0;
  private speaking = false;

  private breathPhase = Math.random() * 6.28;
  private swayPhase = Math.random() * 6.28;
  private rng: Rng;

  /** 0..1 android stress; drives LED colour and breathing. */
  instability = 0;
  ledState: LedState = 'blue';

  private walkPath: THREE.Vector3[] = [];
  private walkSpeed = 1.1;
  private walkPhase = 0;
  private walking = false;

  constructor(def: CharacterDef, quality: CharacterQuality) {
    this.def = def;
    this.rng = new Rng(def.id.split('').reduce((a, c) => a + c.charCodeAt(0), 7));
    this.rig = buildRig({ ...def.proportions, headHeight: def.head.height });

    const skinMat = makeSkinMaterial({
      tone: def.head.skinTone,
      android: def.android,
      textureSize: quality.textureSize,
    });
    const clothMat = makeClothMaterial(def.id + '_main', def.cloth);
    const shoeMat = makeShoeMaterial(def.shoeColor ?? 0x14151a);

    const bodyResult = buildBody({ rig: this.rig, outfit: def.outfit, cell: quality.bodyCell });
    const matByRegion = { skin: skinMat, cloth: clothMat, shoe: shoeMat };
    this.body = new THREE.SkinnedMesh(bodyResult.geometry, bodyResult.regionOrder.map((r) => matByRegion[r]));
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.frustumCulled = false;
    this.body.add(this.rig.rootBone);
    this.body.bind(this.rig.skeleton);
    this.group.add(this.body);

    const { geometry: headGeo, morphIndex } = buildHeadGeometry(def.head);
    this.morphIndex = morphIndex;
    // The head carries a pigmentation colour attribute; the body does not, so it
    // needs its own material variant with vertex colours enabled.
    const headSkin = skinMat.clone();
    headSkin.vertexColors = true;
    headSkin.onBeforeCompile = skinMat.onBeforeCompile;
    headSkin.customProgramCacheKey = () => `${skinMat.name}_head`;
    this.headMesh = new THREE.Mesh(headGeo, headSkin);
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    this.headGroup.add(this.headMesh);

    const eyeR = buildEye(def.head, 1, skinMat);
    const eyeL = buildEye(def.head, -1, skinMat);
    this.eyes = [eyeR, eyeL];
    this.headGroup.add(eyeR.group, eyeL.group);
    this.headGroup.add(buildBrow(def.head, 1), buildBrow(def.head, -1));
    this.headGroup.add(buildEar(def.head, 1, skinMat), buildEar(def.head, -1, skinMat));

    this.mouth = buildMouth(def.head);
    this.headGroup.add(this.mouth.group);
    this.headGroup.add(buildHair(def.head, { ...def.hair, density: quality.hairDensity }));

    this.led = def.android ? buildLed(def.head) : null;
    if (this.led) this.headGroup.add(this.led.group);

    // Head space has the chin at y = 0, so offset the group to put the chin at
    // the right height relative to the head bone.
    const hb = this.rig.specByName.head.pos;
    const chinWorldY = this.rig.proportions.height - def.head.height;
    this.headGroup.position.set(-hb.x, chinWorldY - hb.y, -hb.z);
    this.rig.byName.head.add(this.headGroup);

    this.morphCurrent = {} as Record<MorphName, number>;
    this.morphTarget = {} as Record<MorphName, number>;
    for (const m of MORPH_ORDER) {
      this.morphCurrent[m] = 0;
      this.morphTarget[m] = 0;
    }
    this.playClip(def.idleClip ?? 'idle', { fade: 0 });
  }

  placeAt(position: THREE.Vector3, yaw = 0) {
    this.group.position.copy(position);
    this.group.rotation.y = yaw;
    this.walkPath.length = 0;
    this.walking = false;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** World position of the eyes — the natural target for conversation look-ats. */
  getEyeWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    this.eyes[0].group.getWorldPosition(out);
    return out.add(this.eyes[1].group.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  }

  getHeadWorldPosition(out = new THREE.Vector3()): THREE.Vector3 {
    return this.rig.byName.head.getWorldPosition(out);
  }

  faceToward(target: THREE.Vector3, immediate = true) {
    const yaw = Math.atan2(target.x - this.group.position.x, target.z - this.group.position.z);
    if (immediate) this.group.rotation.y = yaw;
    return yaw;
  }

  walkTo(points: THREE.Vector3[], speed = 1.1) {
    this.walkPath = points.map((p) => p.clone());
    this.walkSpeed = speed;
    this.walking = this.walkPath.length > 0;
  }

  get isWalking() {
    return this.walking;
  }

  playClip(name: string, opts: { fade?: number } = {}) {
    const clip = CLIPS[name];
    if (!clip) return;
    const fade = opts.fade ?? 0.35;
    if (fade <= 0) {
      this.clips = [{ clip, time: 0, weight: 1, fadeIn: 0 }];
      return;
    }
    this.clips = this.clips.filter((c) => c.weight > 0.02).slice(-2);
    this.clips.push({ clip, time: 0, weight: 0, fadeIn: fade });
  }

  get currentClipName(): string {
    return this.clips.length ? this.clips[this.clips.length - 1].clip.name : 'idle';
  }

  setExpression(emotion: Emotion, weight = 1) {
    this.emotion = emotion;
    this.emotionWeight = clamp(weight);
  }

  lookAt(target: THREE.Vector3 | null, weight = 1) {
    this.lookTarget = target ? target.clone() : null;
    this.lookWeightTarget = target ? clamp(weight) : 0;
  }

  setLed(state: LedState) {
    this.ledState = state;
    if (this.led) setLed(this.led, state);
  }

  blink() {
    if (this.blinkPhase < 0) this.blinkPhase = 0;
  }

  /** Schedules mouth movement for a line of dialogue. */
  speak(text: string, seconds: number) {
    this.visemeKeys = textToVisemes(text, seconds);
    this.visemeTime = 0;
    this.speaking = this.visemeKeys.length > 0;
  }

  stopSpeaking() {
    this.speaking = false;
    this.visemeKeys = [];
  }

  get isSpeaking() {
    return this.speaking;
  }

  update(dt: number) {
    this.updateLocomotion(dt);
    this.applyPose(this.evaluateClips(dt));
    this.applyProceduralLayers(dt);
    this.updateLook(dt);
    this.updateFace(dt);
    this.updateLed();
  }

  private updateLocomotion(dt: number) {
    if (!this.walking || this.walkPath.length === 0) {
      this.walkPhase = lerp(this.walkPhase, 0, 1 - Math.exp(-dt * 6));
      return;
    }
    const target = this.walkPath[0];
    const pos = this.group.position;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      this.walkPath.shift();
      if (this.walkPath.length === 0) this.walking = false;
      return;
    }
    const step = Math.min(dist, this.walkSpeed * dt);
    pos.x += (dx / dist) * step;
    pos.z += (dz / dist) * step;
    let diff = Math.atan2(dx, dz) - this.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, dt * 6);
    this.walkPhase += dt * this.walkSpeed * 4.4;
  }

  private evaluateClips(dt: number): Pose {
    const result: Pose = {};
    let totalWeight = 0;
    for (const active of this.clips) {
      active.time += dt;
      active.weight = active.fadeIn > 0 ? Math.min(1, active.weight + dt / active.fadeIn) : 1;
      if (active.clip.loop) active.time %= active.clip.duration;
      else active.time = Math.min(active.time, active.clip.duration);
    }
    const top = this.clips[this.clips.length - 1];
    for (const active of this.clips) {
      if (active !== top) active.weight = Math.min(active.weight, 1 - top.weight);
    }
    this.clips = this.clips.filter((c) => c === top || c.weight > 0.01);

    for (const active of this.clips) {
      if (active.weight <= 0.001) continue;
      const pose = sampleClip(active.clip, active.time);
      totalWeight += active.weight;
      for (const key of Object.keys(pose) as BoneName[]) {
        const v = pose[key]!;
        const acc = result[key] ?? [0, 0, 0];
        acc[0] += v[0] * active.weight;
        acc[1] += v[1] * active.weight;
        acc[2] += v[2] * active.weight;
        result[key] = acc;
      }
    }
    if (totalWeight > 0.001 && Math.abs(totalWeight - 1) > 0.001) {
      for (const key of Object.keys(result) as BoneName[]) {
        const v = result[key]!;
        v[0] /= totalWeight;
        v[1] /= totalWeight;
        v[2] /= totalWeight;
      }
    }
    return result;
  }

  private applyPose(pose: Pose) {
    for (const bone of this.rig.bones) bone.rotation.set(0, 0, 0);
    for (const name of Object.keys(pose) as BoneName[]) {
      const v = pose[name]!;
      this.rig.byName[name]?.rotation.set(v[0], v[1], v[2]);
    }
  }

  private applyProceduralLayers(dt: number) {
    this.breathPhase += dt * (0.9 + this.instability * 0.7);
    this.swayPhase += dt * 0.37;
    const breath = Math.sin(this.breathPhase * 1.1);
    const amp = 1 + this.instability * 0.8;
    const r = this.rig.byName;

    r.spine.rotation.x += breath * D(0.9) * amp;
    r.chest.rotation.x += breath * D(1.5) * amp;
    r.chest.scale.setScalar(1 + breath * 0.006 * amp);

    const sway = Math.sin(this.swayPhase);
    const sway2 = Math.sin(this.swayPhase * 0.61 + 1.1);
    r.hips.rotation.z += sway * D(1.1);
    r.hips.rotation.y += sway2 * D(1.4);
    r.spine.rotation.z += -sway * D(0.7);
    r.neck.rotation.z += -sway * D(0.5);

    if (this.walkPhase > 0.001) {
      const p = this.walkPhase;
      const blend = this.walking ? 1 : 0.3;
      r.thighL.rotation.x += Math.sin(p) * 0.52 * blend;
      r.thighR.rotation.x += Math.sin(p + Math.PI) * 0.52 * blend;
      r.shinL.rotation.x += Math.max(0, -Math.sin(p + 0.6)) * 0.85 * blend;
      r.shinR.rotation.x += Math.max(0, -Math.sin(p + Math.PI + 0.6)) * 0.85 * blend;
      r.footL.rotation.x += Math.sin(p + 1.2) * 0.22 * blend;
      r.footR.rotation.x += Math.sin(p + Math.PI + 1.2) * 0.22 * blend;
      r.armL.rotation.x += Math.sin(p + Math.PI) * 0.3 * blend;
      r.armR.rotation.x += Math.sin(p) * 0.3 * blend;
      r.hips.rotation.y += Math.sin(p) * 0.09 * blend;
      r.chest.rotation.y -= Math.sin(p) * 0.07 * blend;
      this.body.position.y = Math.abs(Math.sin(p)) * 0.018 * blend;
    } else {
      this.body.position.y = lerp(this.body.position.y, 0, 1 - Math.exp(-dt * 8));
    }
  }

  private updateLook(dt: number) {
    this.lookWeight = lerp(this.lookWeight, this.lookWeightTarget, 1 - Math.exp(-dt * 4.5));

    // Saccades: small random gaze offsets, refreshed a few times a second
    this.gazeTimer -= dt;
    if (this.gazeTimer <= 0) {
      this.gazeTimer = this.rng.range(0.35, 1.6);
      const scale = this.speaking ? 0.055 : 0.03;
      this.gazeJitter.set(this.rng.range(-scale, scale), this.rng.range(-scale * 0.6, scale * 0.6));
    }

    let yaw = 0;
    let pitch = 0;
    if (this.lookTarget && this.lookWeight > 0.001) {
      const headBone = this.rig.byName.head;
      headBone.updateMatrixWorld();
      const dir = this.lookTarget.clone().sub(headBone.getWorldPosition(new THREE.Vector3()));
      dir.applyMatrix4(new THREE.Matrix4().extractRotation(this.group.matrixWorld).invert()).normalize();
      yaw = Math.atan2(dir.x, dir.z);
      pitch = Math.asin(clamp(dir.y, -1, 1));
    }

    this.lookCurrent.x = lerp(this.lookCurrent.x, yaw + this.gazeJitter.x, 1 - Math.exp(-dt * 7));
    this.lookCurrent.y = lerp(this.lookCurrent.y, pitch + this.gazeJitter.y, 1 - Math.exp(-dt * 7));

    const w = this.lookWeight;
    const cy = clamp(this.lookCurrent.x, -1.2, 1.2);
    const cp = clamp(this.lookCurrent.y, -0.6, 0.6);
    const r = this.rig.byName;
    // Split the rotation between chest, neck, head and eyes
    r.chest.rotation.y += cy * 0.16 * w;
    r.neck.rotation.y += cy * 0.36 * w;
    r.neck.rotation.x += -cp * 0.3 * w;
    r.head.rotation.y += clamp(cy * 0.42, -0.6, 0.6) * w;
    r.head.rotation.x += clamp(-cp * 0.42, -0.35, 0.35) * w;
    r.head.rotation.z += -cy * 0.05 * w;

    const eyeYaw = clamp(cy * 0.06 * w, -0.42, 0.42);
    const eyePitch = clamp(-cp * 0.28 * w, -0.28, 0.28);
    for (const eye of this.eyes) {
      eye.globe.rotation.y = lerp(eye.globe.rotation.y, eyeYaw, 1 - Math.exp(-dt * 14));
      eye.globe.rotation.x = lerp(eye.globe.rotation.x, eyePitch, 1 - Math.exp(-dt * 14));
    }
    this.gazePitch = eyePitch;
  }

  private updateFace(dt: number) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && this.blinkPhase < 0) {
      this.blinkPhase = 0;
      this.blinkTimer = this.rng.range(2.2, 6.5) * (1 - this.instability * 0.45);
    }
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt / 0.13;
      if (this.blinkPhase >= 2) this.blinkPhase = -1;
    }
    const blink = this.blinkPhase < 0 ? 0 : this.blinkPhase < 1 ? this.blinkPhase : 2 - this.blinkPhase;
    const squint = (EXPRESSIONS[this.emotion].squint ?? 0) * this.emotionWeight;
    const closed = clamp(blink * 0.98 + squint * 0.25);
    for (const eye of this.eyes) setEyeLids(eye, closed, this.gazePitch);

    for (const m of MORPH_ORDER) this.morphTarget[m] = 0;
    const expr = EXPRESSIONS[this.emotion];
    for (const key of Object.keys(expr) as MorphName[]) {
      this.morphTarget[key] = (expr[key] ?? 0) * this.emotionWeight;
    }

    if (this.speaking) {
      this.visemeTime += dt;
      const v = sampleVisemes(this.visemeKeys, this.visemeTime);
      if (v) {
        for (const key of Object.keys(v) as MorphName[]) {
          // Speech drives the mouth but keeps the emotional brow
          const isMouth = key === 'jawOpen' || key === 'mouthWide' || key === 'mouthPucker' || key === 'lipsClosed';
          const val = v[key] ?? 0;
          this.morphTarget[key] = isMouth ? val : Math.max(this.morphTarget[key], val);
        }
      } else {
        this.speaking = false;
      }
    }

    if (this.instability > 0.01) {
      this.morphTarget.browFurrow = Math.max(this.morphTarget.browFurrow, this.instability * 0.35);
      this.morphTarget.lipsClosed = Math.max(this.morphTarget.lipsClosed, this.instability * 0.2);
    }

    const infl = this.headMesh.morphTargetInfluences;
    if (infl) {
      const speed = 1 - Math.exp(-dt * 16);
      for (const m of MORPH_ORDER) {
        this.morphCurrent[m] = lerp(this.morphCurrent[m], this.morphTarget[m], speed);
        infl[this.morphIndex[m]] = this.morphCurrent[m];
      }
      // The jaw group follows the morph so teeth stay inside the mouth
      this.mouth.jaw.rotation.x = this.morphCurrent.jawOpen * D(17);
    }
  }

  private updateLed() {
    if (!this.led) return;
    let state = this.ledState;
    if (this.instability > 0.66) state = 'red';
    else if (this.instability > 0.3) state = 'yellow';
    const speed = state === 'red' ? 7 : state === 'yellow' ? 4 : 1.6;
    setLed(this.led, state, 0.72 + 0.28 * Math.sin(performance.now() * 0.001 * speed));
  }

  dispose() {
    this.group.removeFromParent();
    this.body.geometry.dispose();
    this.headGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function sampleClip(clip: Clip, time: number): Pose {
  const keys = clip.keys;
  if (keys.length === 1) return keys[0].pose;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= time) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t = easeInOut(clamp((time - a.t) / Math.max(1e-5, b.t - a.t)));
  const out: Pose = {};
  for (const n of new Set<BoneName>([...(Object.keys(a.pose) as BoneName[]), ...(Object.keys(b.pose) as BoneName[])])) {
    const va = a.pose[n] ?? [0, 0, 0];
    const vb = b.pose[n] ?? [0, 0, 0];
    out[n] = [lerp(va[0], vb[0], t), lerp(va[1], vb[1], t), lerp(va[2], vb[2], t)];
  }
  return out;
}

function sampleVisemes(keys: VisemeKey[], time: number): Viseme | null {
  if (keys.length === 0) return null;
  if (time > keys[keys.length - 1].t + 0.18) return null;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= time) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t = clamp((time - a.t) / Math.max(0.04, b.t - a.t));
  const va = VISEMES[a.viseme] ?? {};
  const vb = VISEMES[b.viseme] ?? {};
  const out: Viseme = {};
  for (const n of new Set<MorphName>([...(Object.keys(va) as MorphName[]), ...(Object.keys(vb) as MorphName[])])) {
    out[n] = lerp((va[n] ?? 0) * a.strength, (vb[n] ?? 0) * b.strength, smoothstep(0, 1, t));
  }
  return out;
}
