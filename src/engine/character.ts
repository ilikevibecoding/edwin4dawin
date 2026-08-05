/**
 * Character: assembly + procedural performance.
 *
 * There are no animation assets. Poses are named bone-rotation sets that blend
 * over time, and additive layers on top of the pose provide breathing, weight
 * shift, head/eye aim, blinks, gesture and jaw-driven lipsync. That keeps the
 * whole cast expressive in dialogue close-ups, which is what this genre lives on.
 */
import * as THREE from 'three';
import { buildBody, buildHand, buildShoe, dimensions, REGION } from './body';
import type { BoneName, Dim, Rig } from './body';
import type { CharacterSpec } from './charspec';
import { buildEyes, buildHair } from './face';
import type { EyeSet } from './face';
import { buildOutfit, extractShell, templeLed } from './outfit';
import { chassisMaterial, faceMaterial, skinMaterial } from './materials';
import { clamp, damp, ease, lerp, Rng, smoothstep, TAU } from './math';
import { glowSprite } from './volumetric';

export type PoseName =
  | 'idle' | 'idleAlert' | 'armsCrossed' | 'handsBehind' | 'handsPockets'
  | 'sit' | 'sitLean' | 'sitSlump' | 'aim' | 'handsUp' | 'kneel' | 'point'
  | 'holdChild' | 'cower' | 'lean' | 'reachOut' | 'walk' | 'run' | 'dead' | 'gunToHead';

type PoseData = Partial<Record<BoneName, [number, number, number]>> & { rootY?: number; rootPitch?: number };

const POSES: Record<PoseName, PoseData> = {
  idle: {
    armL: [0.06, 0, 0.09], armR: [0.06, 0, -0.09],
    foreArmL: [0.14, 0, 0.05], foreArmR: [0.14, 0, -0.05],
    handL: [0, 0, 0.06], handR: [0, 0, -0.06],
    spine: [0.012, 0, 0], chest: [-0.02, 0, 0],
  },
  idleAlert: {
    armL: [0.02, 0, 0.055], armR: [0.02, 0, -0.055],
    foreArmL: [0.24, 0.06, 0.04], foreArmR: [0.24, -0.06, -0.04],
    chest: [-0.04, 0, 0], neck: [0.02, 0, 0],
  },
  armsCrossed: {
    armL: [0.2, 0.35, 0.72], armR: [0.2, -0.35, -0.72],
    foreArmL: [0.1, -0.1, 1.42], foreArmR: [0.1, 0.1, -1.42],
    handL: [0, 0, 0.2], handR: [0, 0, -0.2],
    chest: [-0.05, 0, 0],
  },
  handsBehind: {
    armL: [-0.22, 0, 0.16], armR: [-0.22, 0, -0.16],
    foreArmL: [0.3, -0.9, 0.6], foreArmR: [0.3, 0.9, -0.6],
    chest: [-0.06, 0, 0],
  },
  handsPockets: {
    armL: [0.16, 0, 0.2], armR: [0.16, 0, -0.2],
    foreArmL: [0.5, 0, 0.18], foreArmR: [0.5, 0, -0.18],
    chest: [0.03, 0, 0], spine: [0.03, 0, 0],
  },
  sit: {
    thighL: [-1.42, 0.06, 0.05], thighR: [-1.42, -0.06, -0.05],
    shinL: [1.36, 0, 0], shinR: [1.36, 0, 0],
    footL: [0.2, 0, 0], footR: [0.2, 0, 0],
    armL: [0.3, 0, 0.12], armR: [0.3, 0, -0.12],
    foreArmL: [0.7, 0.2, 0.1], foreArmR: [0.7, -0.2, -0.1],
    spine: [0.04, 0, 0], chest: [0.02, 0, 0],
    rootY: -0.4,
  },
  sitLean: {
    thighL: [-1.36, 0.1, 0.06], thighR: [-1.36, -0.1, -0.06],
    shinL: [1.3, 0, 0], shinR: [1.3, 0, 0],
    armL: [0.55, 0.1, 0.3], armR: [0.55, -0.1, -0.3],
    foreArmL: [1.05, 0.3, 0.1], foreArmR: [1.05, -0.3, -0.1],
    spine: [0.16, 0, 0], chest: [0.1, 0, 0], neck: [-0.14, 0, 0],
    rootY: -0.4, rootPitch: 0.06,
  },
  sitSlump: {
    thighL: [-1.3, 0.16, 0.1], thighR: [-1.3, -0.16, -0.1],
    shinL: [1.1, 0, 0], shinR: [1.15, 0, 0],
    armL: [0.1, 0, 0.06], armR: [0.1, 0, -0.06],
    foreArmL: [0.3, 0, 0.05], foreArmR: [0.3, 0, -0.05],
    spine: [0.2, 0, 0], chest: [0.14, 0, 0], neck: [0.22, 0, 0], head: [0.16, 0, 0],
    rootY: -0.42, rootPitch: 0.1,
  },
  aim: {
    armL: [-0.2, 0.5, 0.5], armR: [-1.15, -0.28, -0.16],
    foreArmL: [0.6, -0.55, 0.5], foreArmR: [-0.2, -0.1, -0.1],
    handL: [0, 0, 0.1], handR: [0.1, 0, 0],
    chest: [-0.05, -0.16, 0], spine: [0, -0.1, 0], neck: [0.04, 0.1, 0],
  },
  gunToHead: {
    armR: [-1.9, -0.3, -0.9], foreArmR: [-1.1, 0.2, -0.3],
    armL: [0.3, 0.2, 0.3], foreArmL: [0.9, -0.3, 0.4],
    chest: [-0.02, 0.06, 0],
  },
  handsUp: {
    armL: [-2.5, 0.2, 0.5], armR: [-2.5, -0.2, -0.5],
    foreArmL: [-0.3, 0, 0.2], foreArmR: [-0.3, 0, -0.2],
    chest: [-0.06, 0, 0], neck: [0.06, 0, 0],
  },
  kneel: {
    thighL: [-1.6, 0.1, 0.06], thighR: [-0.35, -0.06, -0.04],
    shinL: [1.9, 0, 0], shinR: [0.9, 0, 0],
    footL: [0.6, 0, 0], footR: [0.2, 0, 0],
    armL: [0.24, 0, 0.14], armR: [0.24, 0, -0.14],
    foreArmL: [0.5, 0, 0.1], foreArmR: [0.5, 0, -0.1],
    spine: [0.08, 0, 0],
    rootY: -0.46,
  },
  point: {
    armR: [-1.25, -0.2, -0.24], foreArmR: [-0.1, 0, -0.05],
    armL: [0.08, 0, 0.1], foreArmL: [0.2, 0, 0.06],
    chest: [-0.03, -0.12, 0],
  },
  holdChild: {
    armL: [-0.5, 0.55, 0.7], armR: [-0.45, -0.5, -0.65],
    foreArmL: [0.4, -0.5, 1.1], foreArmR: [0.4, 0.5, -1.1],
    chest: [-0.04, 0, 0], spine: [-0.03, 0, 0],
  },
  cower: {
    armL: [-1.1, 0.5, 0.9], armR: [-1.1, -0.5, -0.9],
    foreArmL: [-0.6, -0.3, 1.5], foreArmR: [-0.6, 0.3, -1.5],
    spine: [0.24, 0, 0], chest: [0.2, 0, 0], neck: [0.16, 0, 0], head: [0.1, 0, 0],
    thighL: [-0.2, 0, 0], thighR: [-0.2, 0, 0], shinL: [0.3, 0, 0], shinR: [0.3, 0, 0],
    rootY: -0.06,
  },
  lean: {
    armL: [0.1, 0, 0.12], armR: [0.34, -0.1, -0.5],
    foreArmL: [0.3, 0, 0.06], foreArmR: [0.2, 0, -0.2],
    spine: [0.02, 0, -0.1], chest: [0, 0, -0.06], rootPitch: -0.04,
  },
  reachOut: {
    armR: [-0.95, -0.25, -0.3], foreArmR: [0.16, 0, -0.06],
    armL: [0.1, 0, 0.12], foreArmL: [0.3, 0, 0.06],
    chest: [-0.05, -0.1, 0], neck: [0.04, 0.05, 0],
  },
  walk: {},
  run: {},
  dead: {
    spine: [0.1, 0, 0.1], chest: [0.06, 0, 0.06], neck: [0.3, 0.2, 0], head: [0.2, 0.2, 0],
    armL: [0.4, 0, 1.1], armR: [0.3, 0, -0.9],
    foreArmL: [0.2, 0, 0.4], foreArmR: [0.2, 0, -0.3],
    thighL: [-1.5, 0.3, 0.4], thighR: [-1.4, -0.2, -0.2],
    shinL: [0.6, 0, 0], shinR: [0.4, 0, 0],
    rootY: -0.82, rootPitch: 1.45,
  },
};

export type LedState = 'blue' | 'yellow' | 'red' | 'off' | 'flicker';

const LED_COLORS: Record<LedState, THREE.Color> = {
  blue: new THREE.Color(0x4fc6ff),
  yellow: new THREE.Color(0xffc247),
  red: new THREE.Color(0xff3b46),
  off: new THREE.Color(0x223038),
  flicker: new THREE.Color(0xff5a3c),
};

export type ExpressionName = 'neutral' | 'smile' | 'sad' | 'angry' | 'fear' | 'surprise' | 'think' | 'pain';

type Expression = {
  brow: number;      // vertical brow offset
  browAngle: number; // inner brow raise
  lid: number;       // eyelid closure
  squint: number;
  jaw: number;
  mouthWide: number;
  headTilt: number;
};

const EXPRESSIONS: Record<ExpressionName, Expression> = {
  neutral: { brow: 0, browAngle: 0, lid: 0, squint: 0, jaw: 0, mouthWide: 0, headTilt: 0 },
  smile: { brow: 0.1, browAngle: 0.05, lid: 0.1, squint: 0.22, jaw: 0.06, mouthWide: 0.7, headTilt: 0.02 },
  sad: { brow: 0.05, browAngle: 0.5, lid: 0.28, squint: 0.1, jaw: 0.02, mouthWide: -0.2, headTilt: 0.06 },
  angry: { brow: -0.55, browAngle: -0.4, lid: 0.05, squint: 0.4, jaw: 0.12, mouthWide: -0.35, headTilt: -0.03 },
  fear: { brow: 0.75, browAngle: 0.55, lid: -0.3, squint: -0.35, jaw: 0.3, mouthWide: 0.2, headTilt: 0.04 },
  surprise: { brow: 0.9, browAngle: 0.2, lid: -0.45, squint: -0.5, jaw: 0.42, mouthWide: 0.1, headTilt: -0.02 },
  think: { brow: 0.18, browAngle: -0.15, lid: 0.2, squint: 0.16, jaw: 0, mouthWide: -0.1, headTilt: 0.05 },
  pain: { brow: -0.3, browAngle: 0.45, lid: 0.55, squint: 0.6, jaw: 0.22, mouthWide: -0.3, headTilt: 0.08 },
};

export class Character {
  spec: CharacterSpec;
  group = new THREE.Group();
  /** Everything that follows the skeleton lives under here. */
  rigRoot = new THREE.Group();
  body: THREE.SkinnedMesh;
  garments: THREE.SkinnedMesh[] = [];
  skeleton: THREE.Skeleton;
  rig: Rig;
  dims: Dim;
  landmarks: Record<string, THREE.Vector3>;
  eyes: EyeSet;
  led?: THREE.Mesh;
  ledGlow?: THREE.Sprite;
  ledMaterial?: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshPhysicalMaterial;
  faceMat: THREE.MeshPhysicalMaterial;
  private morphIndex: Map<string, number>;

  // ---- performance state
  private restQuats = new Map<BoneName, THREE.Quaternion>();
  private restPos = new Map<BoneName, THREE.Vector3>();
  private pose: PoseName = 'idle';
  private prevPose: PoseName = 'idle';
  private poseBlend = 1;
  private poseBlendDur = 0.5;
  private rng: Rng;
  private breathPhase: number;
  private swayPhase: number;
  private blinkTimer: number;
  private blinkT = -1;
  private lidTarget = 0;
  private lidNow = 0;
  private gazeTarget: THREE.Vector3 | null = null;
  private gazeWeight = 0;
  private gazeWeightTarget = 0;
  private headYaw = 0; private headPitch = 0;
  private headYawT = 0; private headPitchT = 0;
  private saccade = new THREE.Vector2();
  private saccadeTimer = 0;
  private talkT = -1;
  private talkDur = 0;
  private talkSeed = 0;
  private talkIntensity = 1;
  private jawNow = 0;
  private expr: Expression = { ...EXPRESSIONS.neutral };
  private exprTarget: Expression = { ...EXPRESSIONS.neutral };
  private ledState: LedState = 'blue';
  private ledPulse = 0;
  private walkPhase = 0;
  private walkSpeed = 0;
  private walkBlend = 0;
  private gesture = { t: -1, dur: 0, kind: 0, amp: 1 };
  private shiver = 0;
  private headTargetObj: THREE.Object3D | null = null;
  private moveQueue: { to: THREE.Vector3; speed: number; face: boolean } | null = null;

  constructor(spec: CharacterSpec, quality = 1) {
    this.spec = spec;
    this.rng = new Rng((spec.seed ?? 1) * 7919 + spec.id.length);
    this.breathPhase = this.rng.next() * TAU;
    this.swayPhase = this.rng.next() * TAU;
    this.blinkTimer = this.rng.range(1.5, 4.5);
    this.saccadeTimer = this.rng.range(0.4, 1.6);

    const built = buildBody(spec, quality);
    this.rig = built.rig;
    this.dims = built.dims ?? dimensions(spec);
    this.landmarks = built.landmarks;

    this.skinMat = skinMaterial({ tone: spec.skinTone, size: quality >= 1 ? 512 : 256 });
    this.faceMat = faceMaterial({
      tone: spec.skinTone ?? [0.72, 0.53, 0.44],
      uvl: built.uvLandmarks,
      female: spec.female,
      age: spec.face?.age,
      stubble: spec.face?.stubble ?? (spec.female ? 0 : 0.18),
      browColor: spec.hair?.color ?? 0x1a1210,
      browThickness: spec.female ? 0.75 : 1.1,
      size: quality >= 1 ? 1024 : 512,
    });
    this.morphIndex = new Map(built.morphNames.map((n, i) => [n, i]));

    this.body = new THREE.SkinnedMesh(built.geometry, [this.skinMat, this.faceMat]);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.frustumCulled = false;
    this.body.name = `${spec.id}-body`;

    this.rigRoot.add(this.rig.root);
    this.rigRoot.add(this.body);
    this.group.add(this.rigRoot);
    this.group.name = spec.id;

    this.skeleton = new THREE.Skeleton(this.rig.bones);
    this.body.bind(this.skeleton);

    for (const b of this.rig.bones) {
      this.restQuats.set(b.name as BoneName, b.quaternion.clone());
      this.restPos.set(b.name as BoneName, b.position.clone());
    }

    /* ---- garments */
    const outfit = buildOutfit(built.geometry, this.dims, spec.outfit);
    for (const piece of outfit.pieces) {
      if (piece.skinned) {
        const sm = new THREE.SkinnedMesh(piece.geometry, piece.material);
        sm.castShadow = piece.castShadow ?? true;
        sm.receiveShadow = true;
        sm.frustumCulled = false;
        sm.name = `${spec.id}-${piece.name}`;
        this.rigRoot.add(sm);
        sm.bind(this.skeleton);
        this.garments.push(sm);
      } else {
        const m = new THREE.Mesh(piece.geometry, piece.material);
        m.castShadow = piece.castShadow ?? false;
        m.name = `${spec.id}-${piece.name}`;
        const bone = this.rig.byName[(piece.bone ?? 'chest') as BoneName];
        const boneWorld = this.rig.restWorld.get((piece.bone ?? 'chest') as BoneName)!;
        m.position.copy(piece.offset ?? new THREE.Vector3());
        // Offsets are authored in body space relative to the bone's rest spot.
        m.position.y += 0;
        void boneWorld;
        bone.add(m);
      }
    }

    /* ---- hands and shoes */
    for (const side of [-1, 1] as const) {
      const S = side < 0 ? 'L' : 'R';
      const hand = new THREE.Mesh(buildHand(this.dims, side, spec.hands ?? 'relaxed'), this.skinMat);
      hand.castShadow = true;
      hand.frustumCulled = false;
      this.rig.byName[`hand${S}` as BoneName].add(hand);

      const shoe = new THREE.Mesh(buildShoe(this.dims), this.shoeMaterial(spec));
      shoe.castShadow = true;
      shoe.position.set(0, -0.012 * this.dims.H, 0);
      this.rig.byName[`foot${S}` as BoneName].add(shoe);
    }

    /* ---- face */
    const headRest = this.rig.restWorld.get('head')!;
    const localLm: Record<string, THREE.Vector3> = {};
    for (const [k, v] of Object.entries(this.landmarks)) localLm[k] = v.clone().sub(headRest);

    this.eyes = buildEyes(this.dims, localLm, this.skinMat, spec.face?.eyeColor ?? 0x6f8ea6);
    this.rig.byName.head.add(this.eyes.group);

    /* ---- hair */
    if (spec.hair) {
      const hair = buildHair(built.geometry, this.dims, spec.hair);
      for (const geo of hair.skinnedGeoms) {
        const sm = new THREE.SkinnedMesh(geo, hairMaterialFor(spec));
        sm.castShadow = true;
        sm.frustumCulled = false;
        sm.name = `${spec.id}-scalp`;
        this.rigRoot.add(sm);
        sm.bind(this.skeleton);
        this.garments.push(sm);
      }
      for (const m of hair.meshes) {
        m.position.add(this.landmarks.headCenter.clone().sub(headRest));
        this.rig.byName.head.add(m);
      }
    }

    /* ---- android LED */
    if (spec.android?.led) {
      const led = templeLed(this.dims, spec.android.ledColor ?? 0x4fc6ff);
      this.led = led.mesh;
      this.ledMaterial = led.material;
      const lm = this.landmarks.headCenter.clone().sub(headRest);
      this.led.position.set(
        -this.dims.headW * 0.9,
        lm.y + this.dims.headHi * 0.2,
        lm.z + this.dims.headD * 0.3,
      );
      this.led.rotation.y = -Math.PI / 2.35;
      this.led.rotation.z = 0.08;
      this.rig.byName.head.add(this.led);
      this.ledGlow = glowSprite(spec.android.ledColor ?? 0x4fc6ff, 0.022 * this.dims.H, 0.4);
      this.ledGlow.position.copy(this.led.position);
      this.rig.byName.head.add(this.ledGlow);
    }

    this.applyPoseImmediate('idle');
  }

  private shoeMaterial(spec: CharacterSpec): THREE.Material {
    const dark = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x0d1013).convertSRGBToLinear(),
      roughness: 0.42,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
    });
    if (spec.outfit.kind === 'androidSuit') return chassisMaterial(0x22262b);
    return dark;
  }

  /* ------------------------------------------------------------- placement */

  setPosition(x: number, y: number, z: number): this {
    this.group.position.set(x, y, z);
    return this;
  }
  setRotationY(a: number): this {
    this.group.rotation.y = a;
    return this;
  }
  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** World position of a face/body landmark, useful for camera aim. */
  worldPoint(name: keyof typeof this.landmarks | string, out = new THREE.Vector3()): THREE.Vector3 {
    const lm = this.landmarks[name as string];
    if (!lm) return out.copy(this.group.position);
    // Landmarks are queried before the first render (camera setup), so the
    // matrices may not be current yet.
    this.group.updateWorldMatrix(true, true);
    if (name === 'eyeL' || name === 'eyeR' || name === 'mouth' || name === 'headCenter' || name === 'noseTip') {
      const headRest = this.rig.restWorld.get('head')!;
      const local = lm.clone().sub(headRest);
      return this.rig.byName.head.localToWorld(out.copy(local));
    }
    return this.group.localToWorld(out.copy(lm));
  }

  eyeLine(out = new THREE.Vector3()): THREE.Vector3 {
    return this.worldPoint('headCenter', out);
  }

  /* ---------------------------------------------------------------- acting */

  setPose(name: PoseName, blend = 0.55): this {
    if (name === this.pose) return this;
    this.prevPose = this.pose;
    this.pose = name;
    this.poseBlend = 0;
    this.poseBlendDur = Math.max(0.001, blend);
    return this;
  }
  applyPoseImmediate(name: PoseName): this {
    this.prevPose = name;
    this.pose = name;
    this.poseBlend = 1;
    return this;
  }
  get currentPose(): PoseName {
    return this.pose;
  }

  setExpression(name: ExpressionName, weight = 1): this {
    const base = EXPRESSIONS[name];
    const n = EXPRESSIONS.neutral;
    this.exprTarget = {
      brow: lerp(n.brow, base.brow, weight),
      browAngle: lerp(n.browAngle, base.browAngle, weight),
      lid: lerp(n.lid, base.lid, weight),
      squint: lerp(n.squint, base.squint, weight),
      jaw: lerp(n.jaw, base.jaw, weight),
      mouthWide: lerp(n.mouthWide, base.mouthWide, weight),
      headTilt: lerp(n.headTilt, base.headTilt, weight),
    };
    return this;
  }

  /** Start a lipsync + gesture burst for a spoken line. */
  say(duration: number, intensity = 1, gesture = true): this {
    this.talkT = 0;
    this.talkDur = duration;
    this.talkSeed = this.rng.next() * 100;
    this.talkIntensity = intensity;
    if (gesture && this.rng.chance(0.72)) this.playGesture(this.rng.int(0, 3), duration * 0.8, intensity);
    return this;
  }
  stopTalking(): this {
    this.talkT = -1;
    return this;
  }
  get isTalking(): boolean {
    return this.talkT >= 0 && this.talkT < this.talkDur;
  }

  playGesture(kind: number, dur = 1.2, amp = 1): this {
    this.gesture = { t: 0, dur, kind, amp };
    return this;
  }

  lookAt(target: THREE.Vector3 | THREE.Object3D | Character | null, weight = 1): this {
    if (target === null) {
      this.gazeTarget = null;
      this.headTargetObj = null;
      this.gazeWeightTarget = 0;
      return this;
    }
    if (target instanceof Character) {
      this.headTargetObj = null;
      this.gazeTarget = target.eyeLine(new THREE.Vector3());
      this.trackCharacter = target;
    } else if (target instanceof THREE.Object3D) {
      this.headTargetObj = target;
      this.trackCharacter = null;
    } else {
      this.gazeTarget = target.clone();
      this.headTargetObj = null;
      this.trackCharacter = null;
    }
    this.gazeWeightTarget = weight;
    return this;
  }
  private trackCharacter: Character | null = null;

  setLed(state: LedState): this {
    this.ledState = state;
    this.ledPulse = 0;
    return this;
  }
  get ledStateName(): LedState {
    return this.ledState;
  }

  setShiver(v: number): this {
    this.shiver = v;
    return this;
  }

  /** Walk to a world position; returns immediately, motion resolves over time. */
  walkTo(x: number, z: number, speed = 1.15, face = true): this {
    this.moveQueue = { to: new THREE.Vector3(x, this.group.position.y, z), speed, face };
    return this;
  }
  get isMoving(): boolean {
    return this.moveQueue !== null;
  }
  stopMoving(): this {
    this.moveQueue = null;
    this.walkSpeed = 0;
    return this;
  }

  /* ----------------------------------------------------------------- update */

  update(dt: number, time: number): void {
    const bones = this.rig.byName;

    /* reset to rest */
    for (const b of this.rig.bones) {
      const q = this.restQuats.get(b.name as BoneName);
      if (q) b.quaternion.copy(q);
    }
    this.rigRoot.position.set(0, 0, 0);
    this.rigRoot.rotation.set(0, 0, 0);

    /* locomotion */
    if (this.moveQueue) {
      const to = this.moveQueue.to;
      const here = this.group.position;
      const dx = to.x - here.x, dz = to.z - here.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.06) {
        this.moveQueue = null;
        this.walkSpeed = damp(this.walkSpeed, 0, 8, dt);
      } else {
        const spd = Math.min(this.moveQueue.speed, dist * 2.4);
        const nx = dx / dist, nz = dz / dist;
        here.x += nx * spd * dt;
        here.z += nz * spd * dt;
        if (this.moveQueue.face) {
          const want = Math.atan2(nx, nz);
          this.group.rotation.y = angleDamp(this.group.rotation.y, want, 6, dt);
        }
        this.walkSpeed = damp(this.walkSpeed, spd, 6, dt);
      }
    } else {
      this.walkSpeed = damp(this.walkSpeed, 0, 8, dt);
    }
    this.walkBlend = damp(this.walkBlend, this.walkSpeed > 0.08 ? 1 : 0, 7, dt);
    this.walkPhase += dt * (2.6 + this.walkSpeed * 1.9);

    /* pose blend */
    this.poseBlend = Math.min(1, this.poseBlend + dt / this.poseBlendDur);
    const bl = ease.inOutCubic(this.poseBlend);
    const from = POSES[this.prevPose];
    const to = POSES[this.pose];
    const applyPose = (data: PoseData, w: number) => {
      if (w <= 0) return;
      for (const [name, rot] of Object.entries(data)) {
        if (name === 'rootY' || name === 'rootPitch') continue;
        const bone = bones[name as BoneName];
        if (!bone) continue;
        const [rx, ry, rz] = rot as [number, number, number];
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx * w, ry * w, rz * w));
        bone.quaternion.multiply(q);
      }
    };
    applyPose(from, 1 - bl);
    applyPose(to, bl);
    const rootY = lerp(from.rootY ?? 0, to.rootY ?? 0, bl);
    const rootPitch = lerp(from.rootPitch ?? 0, to.rootPitch ?? 0, bl);
    this.rigRoot.position.y += rootY;
    this.rigRoot.rotation.x += rootPitch;

    /* breathing + idle weight shift */
    const breath = Math.sin(time * 1.05 + this.breathPhase);
    const breathAmt = 1 - this.walkBlend * 0.4;
    bones.chest.rotateX(breath * 0.014 * breathAmt);
    bones.spine.rotateX(-breath * 0.008 * breathAmt);
    bones.chest.scale.setScalar(1 + breath * 0.004 * breathAmt);
    const sway = Math.sin(time * 0.42 + this.swayPhase);
    const sway2 = Math.sin(time * 0.27 + this.swayPhase * 1.7);
    const swayAmt = (1 - this.walkBlend) * (this.pose === 'sit' || this.pose === 'sitLean' || this.pose === 'dead' ? 0.25 : 1);
    bones.hips.rotateZ(sway * 0.012 * swayAmt);
    bones.spine.rotateZ(-sway * 0.008 * swayAmt);
    bones.chest.rotateY(sway2 * 0.014 * swayAmt);
    this.rigRoot.position.x += sway * 0.004 * swayAmt;

    if (this.shiver > 0) {
      const s = this.shiver;
      const f = time * 26;
      bones.chest.rotateZ(Math.sin(f) * 0.006 * s);
      bones.head.rotateZ(Math.sin(f * 1.3) * 0.008 * s);
      bones.armL.rotateZ(Math.sin(f * 0.9) * 0.01 * s);
      bones.armR.rotateZ(-Math.sin(f * 1.1) * 0.01 * s);
    }

    /* walk cycle */
    if (this.walkBlend > 0.001) {
      const w = this.walkBlend;
      const p = this.walkPhase;
      const stride = 0.55 * w;
      bones.thighL.rotateX(Math.sin(p) * stride);
      bones.thighR.rotateX(Math.sin(p + Math.PI) * stride);
      bones.shinL.rotateX(clamp(-Math.sin(p - 0.5), 0, 1) * 0.85 * w);
      bones.shinR.rotateX(clamp(-Math.sin(p + Math.PI - 0.5), 0, 1) * 0.85 * w);
      bones.footL.rotateX(Math.sin(p + 0.9) * 0.22 * w);
      bones.footR.rotateX(Math.sin(p + Math.PI + 0.9) * 0.22 * w);
      bones.armL.rotateX(Math.sin(p + Math.PI) * 0.42 * w);
      bones.armR.rotateX(Math.sin(p) * 0.42 * w);
      bones.foreArmL.rotateX(0.2 * w + clamp(Math.sin(p + Math.PI), 0, 1) * 0.3 * w);
      bones.foreArmR.rotateX(0.2 * w + clamp(Math.sin(p), 0, 1) * 0.3 * w);
      bones.chest.rotateY(Math.sin(p) * 0.06 * w);
      bones.hips.rotateY(-Math.sin(p) * 0.09 * w);
      this.rigRoot.position.y += (Math.abs(Math.sin(p)) * 0.024 - 0.012) * w;
    }

    /* gesture layer */
    if (this.gesture.t >= 0) {
      this.gesture.t += dt;
      const g = this.gesture;
      const t = clamp(g.t / g.dur);
      const env = Math.sin(t * Math.PI) * g.amp;
      if (t >= 1) this.gesture.t = -1;
      const beat = Math.sin(g.t * 6.2) * 0.5 + 0.5;
      switch (g.kind) {
        case 0: // open palm, one hand
          bones.armR.rotateX(-0.42 * env);
          bones.armR.rotateZ(-0.16 * env);
          bones.foreArmR.rotateX(-0.3 * env * (0.6 + beat * 0.4));
          bones.foreArmR.rotateY(-0.3 * env);
          break;
        case 1: // both hands, explanatory
          bones.armR.rotateX(-0.3 * env);
          bones.armL.rotateX(-0.3 * env);
          bones.foreArmR.rotateX(-0.45 * env * (0.5 + beat * 0.5));
          bones.foreArmL.rotateX(-0.45 * env * (0.5 + beat * 0.5));
          bones.foreArmR.rotateY(-0.24 * env);
          bones.foreArmL.rotateY(0.24 * env);
          break;
        case 2: // small chop
          bones.armR.rotateX(-0.24 * env);
          bones.foreArmR.rotateX(-0.5 * env);
          bones.foreArmR.rotateZ(-0.2 * Math.sin(g.t * 9) * env);
          break;
        default: // shoulder shrug / head shake accent
          bones.shoulderL.rotateZ(0.12 * env);
          bones.shoulderR.rotateZ(-0.12 * env);
          bones.chest.rotateY(Math.sin(g.t * 4.4) * 0.05 * env);
          break;
      }
    }

    /* gaze: head, neck, chest, eyes */
    if (this.trackCharacter) this.gazeTarget = this.trackCharacter.eyeLine(this.gazeTarget ?? new THREE.Vector3());
    if (this.headTargetObj) {
      this.gazeTarget = this.gazeTarget ?? new THREE.Vector3();
      this.headTargetObj.getWorldPosition(this.gazeTarget);
    }
    this.gazeWeight = damp(this.gazeWeight, this.gazeWeightTarget, 3.4, dt);
    if (this.gazeTarget && this.gazeWeight > 0.001) {
      const headWorld = this.eyeLine(new THREE.Vector3());
      const local = this.group.worldToLocal(this.gazeTarget.clone());
      const localHead = this.group.worldToLocal(headWorld.clone());
      const dx = local.x - localHead.x;
      const dy = local.y - localHead.y;
      const dz = local.z - localHead.z;
      const yaw = Math.atan2(dx, Math.max(0.001, dz));
      const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      this.headYawT = clamp(yaw, -1.35, 1.35);
      this.headPitchT = clamp(pitch, -0.6, 0.6);
    } else {
      this.headYawT = 0;
      this.headPitchT = 0;
    }
    this.headYaw = damp(this.headYaw, this.headYawT * this.gazeWeight, 5.5, dt);
    this.headPitch = damp(this.headPitch, this.headPitchT * this.gazeWeight, 5.5, dt);
    // Distribute the aim down the spine so it never looks like an owl.
    const yawTotal = this.headYaw;
    const pitchTotal = this.headPitch;
    bones.chest.rotateY(yawTotal * 0.16);
    bones.neck.rotateY(yawTotal * 0.3);
    bones.head.rotateY(yawTotal * 0.54);
    bones.neck.rotateX(pitchTotal * 0.34);
    bones.head.rotateX(pitchTotal * 0.66);

    /* expression easing */
    for (const k of Object.keys(this.expr) as (keyof Expression)[]) {
      this.expr[k] = damp(this.expr[k], this.exprTarget[k], 5, dt);
    }
    bones.head.rotateZ(this.expr.headTilt);

    /* blinks */
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.blinkTimer = this.rng.range(2.2, 6.5) * (this.isTalking ? 0.6 : 1);
    }
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.13;
      blink = this.blinkT < d * 0.4 ? this.blinkT / (d * 0.4) : 1 - (this.blinkT - d * 0.4) / (d * 0.6);
      blink = clamp(blink);
      if (this.blinkT > d) this.blinkT = -1;
    }
    this.lidTarget = clamp(this.expr.lid + blink * (1 - this.expr.lid * 0.4));
    this.lidNow = damp(this.lidNow, this.lidTarget, 22, dt);
    // Rest angle leaves the aperture open; full closure meets the lower lid.
    const lidBase = 0.2;
    for (let i = 0; i < this.eyes.upperLids.length; i++) {
      this.eyes.upperLids[i].rotation.x = lidBase + this.lidNow * 0.72 + this.expr.squint * 0.07;
      this.eyes.lowerLids[i].rotation.x = -0.3 + this.expr.squint * 0.16 + this.lidNow * 0.1;
    }

    /* facial morph targets */
    {
      const infl = this.body.morphTargetInfluences;
      if (infl) {
        const set = (name: string, v: number) => {
          const i = this.morphIndex.get(name);
          if (i !== undefined) infl[i] = clamp(v);
        };
        set('browUp', clamp(this.expr.brow) + clamp(this.expr.browAngle) * 0.45);
        set('browAngry', clamp(-this.expr.brow));
        set('squint', clamp(this.expr.squint));
        set('smile', clamp(this.expr.mouthWide));
        set('frown', clamp(-this.expr.mouthWide));
        set('mouthOpenWide', clamp(this.expr.jaw * 1.1 + this.jawNow * 0.5));
      }
    }

    /* eye aim + saccades */
    this.saccadeTimer -= dt;
    if (this.saccadeTimer <= 0) {
      this.saccadeTimer = this.rng.range(0.5, 2.4);
      this.saccade.set(this.rng.normal(0, 0.035), this.rng.normal(0, 0.022));
    }
    const eyeYaw = clamp(this.headYaw * 0.5 + this.saccade.x, -0.5, 0.5);
    const eyePitch = clamp(this.headPitch * 0.45 + this.saccade.y, -0.35, 0.35);
    for (const p of this.eyes.pivots) {
      p.rotation.y = damp(p.rotation.y, eyeYaw, 14, dt);
      p.rotation.x = damp(p.rotation.x, eyePitch, 14, dt);
    }

    /* lipsync */
    let jawTarget = this.expr.jaw * 0.18;
    if (this.talkT >= 0) {
      this.talkT += dt;
      if (this.talkT > this.talkDur) {
        this.talkT = -1;
      } else {
        // Layered sines give a plausible syllable envelope without audio analysis.
        const s = this.talkSeed;
        const a = Math.sin(this.talkT * 11.3 + s) * 0.5 + 0.5;
        const b = Math.sin(this.talkT * 6.7 + s * 2.1) * 0.5 + 0.5;
        const c = Math.sin(this.talkT * 19.1 + s * 3.3) * 0.5 + 0.5;
        const env = smoothstep(0, 0.12, this.talkT) * smoothstep(this.talkDur, this.talkDur - 0.18, this.talkT);
        const open = clamp((a * 0.5 + b * 0.35 + c * 0.15) * env * this.talkIntensity);
        jawTarget += open * 0.3;
        // Small head accents while speaking.
        bones.head.rotateX(Math.sin(this.talkT * 5.1 + s) * 0.012 * env);
        bones.head.rotateY(Math.sin(this.talkT * 3.3 + s * 1.5) * 0.016 * env);
      }
    }
    this.jawNow = damp(this.jawNow, jawTarget, 18, dt);
    bones.jaw.rotation.set(this.jawNow, 0, 0);
    bones.jaw.position.copy(this.restPos.get('jaw')!).add(new THREE.Vector3(0, -this.jawNow * 0.006 * this.dims.H, 0));

    /* LED */
    if (this.ledMaterial) {
      this.ledPulse += dt;
      const st = this.ledState;
      const col = LED_COLORS[st];
      let intensity = 2.2;
      if (st === 'blue') intensity = 2.0 + Math.sin(time * 2.1) * 0.35;
      else if (st === 'yellow') intensity = 2.4 + Math.sin(time * 9.5) * 0.9;
      else if (st === 'red') intensity = 2.9 + Math.sin(time * 17) * 1.4;
      else if (st === 'off') intensity = 0.04;
      else if (st === 'flicker') intensity = this.rng.chance(0.4) ? 3.6 : 0.3;
      this.ledMaterial.emissive.copy(col);
      this.ledMaterial.emissiveIntensity = intensity;
      if (this.ledGlow) {
        this.ledGlow.material.color.copy(col);
        this.ledGlow.material.opacity = clamp(intensity / 4) * 0.6;
      }
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
  }
}

function hairMaterialFor(spec: CharacterSpec): THREE.Material {
  const col = new THREE.Color(spec.hair?.color ?? 0x1a1210);
  const grey = spec.hair?.greying ?? 0;
  col.lerp(new THREE.Color(0x9aa0a4), grey);
  return new THREE.MeshPhysicalMaterial({
    color: col.convertSRGBToLinear(),
    roughness: lerp(0.85, 0.6, spec.hair?.gloss ?? 0.35),
    metalness: 0.0,
    clearcoat: lerp(0.05, 0.22, spec.hair?.gloss ?? 0.35),
    clearcoatRoughness: 0.55,
    sheen: 0.5,
    sheenColor: new THREE.Color(0.4, 0.34, 0.3),
  });
}

function angleDamp(cur: number, target: number, lambda: number, dt: number): number {
  let d = target - cur;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return cur + d * (1 - Math.exp(-lambda * dt));
}

export { REGION, extractShell };
