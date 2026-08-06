import * as THREE from 'three';
import { BoneIndex, canonicalName } from './BoneMap';
import { POSES, type Pose } from './Poses';
import { clamp01, damp } from '../core/Time';
import { PALETTE } from '../render/LookConfig';
import { Tex } from '../render/SharedTextures';

/**
 * A performing character.
 *
 * The source rigs ship with locomotion clips and nothing else, so acting is
 * synthesised on top of the mixer output every frame, in this order:
 *
 *   mixer clip -> additive poses -> spine/hip idle motion -> head look-at ->
 *   eye gaze -> blink -> visemes
 *
 * Each layer only writes the bones it owns, so a "lean in and point" beat can
 * play over a breathing idle while the eyes stay locked on another actor. This
 * is what keeps dialogue scenes from looking like two mannequins facing each
 * other.
 */

export type LedState = 'calm' | 'process' | 'stress' | 'off';

interface ActivePose {
  pose: Pose;
  weight: number;
  target: number;
  fadeIn: number;
  fadeOut: number;
  /** Game time at which the pose should start releasing. */
  releaseAt: number | null;
}

export interface ActorOptions {
  name: string;
  height?: number;
  /** Bind-space offset of the temple LED, in model units. */
  ledOffset?: THREE.Vector3;
  ledRadius?: number;
  hasLed?: boolean;
  /** Faceless chassis characters skip visemes and blinks. */
  hasFace?: boolean;
  /**
   * Whether the additive pose library may drive this rig.
   *
   * The library is authored in body space against each bone's rest orientation,
   * which only holds while the animated pose is near the rest pose. The armoured
   * rig rests in a T-pose and idles with its arms at its sides, so the same
   * numbers that give the avatars a two-handed aim put the troopers' arms over
   * their heads. Those characters keep their native locomotion instead.
   */
  posable?: boolean;
  eyeHeight?: number;
}

const DEG = Math.PI / 180;

/** Which child continues the limb, for bones that branch. */
const PREFERRED_CHILD: Record<string, string> = {
  Hips: 'Spine',
  Spine: 'Spine1',
  Spine1: 'Spine2',
  Spine2: 'Neck',
  Neck: 'Head',
  Head: 'HeadTop_End',
  LeftShoulder: 'LeftArm',
  RightShoulder: 'RightArm',
  LeftArm: 'LeftForeArm',
  RightArm: 'RightForeArm',
  LeftForeArm: 'LeftHand',
  RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg',
  RightUpLeg: 'RightLeg',
  LeftLeg: 'LeftFoot',
  RightLeg: 'RightFoot',
};

export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly bones: BoneIndex;
  /** Speaker name shown in subtitles; a character can earn a new one. */
  name: string;
  readonly mixer: THREE.AnimationMixer;
  readonly skinnedMeshes: THREE.SkinnedMesh[] = [];

  /** Uniform scale applied to bring the model to the requested height. */
  readonly modelScale: number;
  readonly height: number;

  private actions = new Map<string, THREE.AnimationAction>();
  private currentClip: string | null = null;
  private activePoses = new Map<string, ActivePose>();
  /** Authored rest transforms, restored every frame before the mixer runs. */
  private restQuat = new Map<THREE.Bone, THREE.Quaternion>();
  private restPos = new Map<THREE.Bone, THREE.Vector3>();
  private allBones = new Set<THREE.Bone>();
  private poseQuat = new THREE.Quaternion();
  private poseEuler = new THREE.Euler();
  private accum = new Map<string, THREE.Vector4>();
  private tmpRootQ = new THREE.Quaternion();
  private tmpRootInv = new THREE.Quaternion();
  private tmpParentQ = new THREE.Quaternion();
  private tmpParentInv = new THREE.Quaternion();
  private tmpDelta = new THREE.Quaternion();
  private tmpTwist = new THREE.Quaternion();
  private tmpAxis = new THREE.Vector3();
  private tmpVec = new THREE.Vector3();
  /** Rotation from canonical body axes (X right, Y up, Z forward) into model space. */
  private bodyBasis = new THREE.Quaternion();
  /** Bones in parent-before-child order, with their canonical names. */
  private hierarchyOrder: THREE.Bone[] = [];
  private boneKey = new Map<THREE.Bone, string>();

  // idle motion
  private breathPhase = Math.random() * Math.PI * 2;
  private swayPhase = Math.random() * Math.PI * 2;
  breathAmount = 1;
  swayAmount = 1;
  /** Raised while stressed: faster breath, more restless sway. */
  agitation = 0;

  // look-at
  private lookTarget: THREE.Vector3 | null = null;
  private lookWeight = 0;
  private lookWeightTarget = 0;
  private headRestFace = new THREE.Vector3(0, 0, 1);
  private eyeRestFace = new THREE.Vector3(0, 0, 1);
  private lookOffset = new THREE.Vector3();
  private glanceTimer = 0;
  private glanceOffset = new THREE.Vector3();

  // face
  private headMorphTargets: { mesh: THREE.Mesh; open?: number; smile?: number; blinkL?: number; blinkR?: number; blink?: number }[] = [];
  private blinkTimer = 1 + Math.random() * 3;
  private blinkValue = 0;
  private blinkPhase = 0;
  private mouthOpen = 0;
  private mouthOpenTarget = 0;
  private smile = 0;
  private smileTarget = 0;
  readonly hasFace: boolean;
  readonly posable: boolean;

  // led
  private ledMesh: THREE.Mesh | null = null;
  private ledMat: THREE.MeshBasicMaterial | null = null;
  private ledHalo: THREE.Sprite | null = null;
  private ledState: LedState = 'calm';
  private ledPulse = 0;
  private ledSpin = 0;

  // facing / movement
  private facingTarget: number | null = null;
  turnSpeed = 3.2;

  constructor(model: THREE.Object3D, opts: ActorOptions) {
    this.name = opts.name;
    this.model = model;
    this.hasFace = opts.hasFace ?? true;
    this.posable = opts.posable ?? true;

    model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) {
        this.skinnedMeshes.push(mesh);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Skinned bounds are unreliable once poses are applied by hand.
        mesh.frustumCulled = false;
      } else if ((o as THREE.Mesh).isMesh) {
        (o as THREE.Mesh).castShadow = true;
        (o as THREE.Mesh).receiveShadow = true;
      }
    });

    if (!this.skinnedMeshes.length) throw new Error(`actor ${opts.name}: no skinned mesh`);
    // Largest mesh first: some models carry a second skin for a visor or eyes,
    // and its skeleton is not the one that defines the body.
    this.skinnedMeshes.sort(
      (a, b) => (b.geometry.attributes.position?.count ?? 0) - (a.geometry.attributes.position?.count ?? 0)
    );
    this.bones = new BoneIndex(this.skinnedMeshes[0].skeleton);
    // Every bone of every skin must be restored each frame, or the ones missing
    // from the primary skeleton accumulate offsets and tear the mesh apart.
    for (const mesh of this.skinnedMeshes) {
      for (const bone of mesh.skeleton.bones) this.allBones.add(bone);
    }

    // Normalise height from the skeleton, not from mesh bounds.
    //
    // These rigs nest scale between the armature and the mesh nodes, so a mesh's
    // geometry box transformed by its own world matrix does not describe where
    // the skinned vertices actually end up — measuring that way scaled two of the
    // four characters to roughly a hundred times life size. Bone world positions
    // always describe the rendered pose correctly.
    const targetHeight = opts.height ?? 1.78;
    model.updateMatrixWorld(true);
    const measured = this.measureSkeletonHeight();
    this.modelScale = measured > 0.001 ? targetHeight / measured : 1;
    this.height = targetHeight;
    model.scale.setScalar(this.modelScale);
    model.position.y = 0;
    model.updateMatrixWorld(true);
    model.position.y -= this.measureFootY();

    this.root.add(model);
    this.root.name = `actor:${opts.name}`;
    this.mixer = new THREE.AnimationMixer(model);

    for (const bone of this.allBones) {
      this.restQuat.set(bone, bone.quaternion.clone());
      this.restPos.set(bone, bone.position.clone());
      this.boneKey.set(bone, canonicalName(bone.name));
    }
    this.buildHierarchyOrder();
    this.cacheRestOrientations();
    if (this.hasFace) this.cacheFaceMorphs();
    if (opts.hasLed !== false) this.buildLed(opts.ledOffset, opts.ledRadius);
    // Stock rigs hold their fingers splayed; relax them permanently.
    this.setPose('restHands', 1, { fadeIn: 0 });
    this.setPose('armsRelaxed', 0.85, { fadeIn: 0 });
  }

  /** World Y of the lowest foot joint, used to seat the character on the ground. */
  private measureFootY(): number {
    const v = new THREE.Vector3();
    let lowest = Infinity;
    for (const name of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) {
      const bone = this.bones.get(name);
      if (!bone) continue;
      bone.getWorldPosition(v);
      lowest = Math.min(lowest, v.y);
    }
    if (!Number.isFinite(lowest)) return 0;
    // Toe joints sit a little above the sole.
    return lowest - 0.02 * this.modelScale;
  }

  private measureSkeletonHeight(): number {
    const v = new THREE.Vector3();
    const footY = (() => {
      let lowest = Infinity;
      for (const name of ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot']) {
        const bone = this.bones.get(name);
        if (!bone) continue;
        bone.getWorldPosition(v);
        lowest = Math.min(lowest, v.y);
      }
      return Number.isFinite(lowest) ? lowest : 0;
    })();

    const top = this.bones.get('HeadTop_End');
    if (top) {
      top.getWorldPosition(v);
      return v.y - footY;
    }
    const head = this.bones.get('Head');
    if (head) {
      head.getWorldPosition(v);
      // The head joint sits at roughly 88% of standing height.
      return (v.y - footY) / 0.88;
    }
    const box = new THREE.Box3().setFromObject(this.model);
    return box.getSize(new THREE.Vector3()).y;
  }

  /** Depth-first bone order: a parent's rotation must be applied before its child's. */
  private buildHierarchyOrder(): void {
    const bones = this.allBones;
    const out: THREE.Bone[] = [];
    const walk = (bone: THREE.Bone): void => {
      out.push(bone);
      for (const child of bone.children) {
        const c = child as THREE.Bone;
        if (c.isBone && bones.has(c)) walk(c);
      }
    };
    for (const bone of bones) {
      const parent = bone.parent as THREE.Bone | null;
      if (!parent || !parent.isBone || !bones.has(parent)) walk(bone);
    }
    for (const bone of bones) if (!out.includes(bone)) out.push(bone);
    this.hierarchyOrder = out;
  }

  // ---------------------------------------------------------------- rest pose

  /**
   * Derives the character's own axes from its skeleton.
   *
   * The source models do not agree on which way they face: the avatar looks down
   * +Z while the mannequin and the trooper look down -Z. Assuming a convention
   * silently mirrors every gesture — arms reach backwards, heads turn away from
   * whoever is speaking. Measuring the basis from bone positions instead makes
   * the acting layers correct for any rig.
   */
  private computeBodyBasis(): void {
    const hips = this.bones.get('Hips');
    const head = this.bones.get('Head') ?? this.bones.get('Neck');
    const leftArm = this.bones.get('LeftArm') ?? this.bones.get('LeftShoulder');
    const rightArm = this.bones.get('RightArm') ?? this.bones.get('RightShoulder');
    if (!hips || !head || !leftArm || !rightArm) return;

    this.model.updateMatrixWorld(true);
    const toModel = new THREE.Matrix4().copy(this.model.matrixWorld).invert();
    const at = (bone: THREE.Bone): THREE.Vector3 =>
      bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(toModel);

    const right = at(rightArm).sub(at(leftArm));
    const up = at(head).sub(at(hips));
    if (right.lengthSq() < 1e-9 || up.lengthSq() < 1e-9) return;
    right.normalize();
    up.normalize();
    // In a right-handed system a character facing +Z has its right hand at -X,
    // so the facing direction is up x armAxis.
    const forward = new THREE.Vector3().crossVectors(up, right).normalize();
    // The basis must be a proper rotation, so its first column is up x forward.
    // Using the anatomical right there would make the triple left-handed, and
    // building a quaternion from a mirrored matrix inverts the whole character.
    const xAxis = new THREE.Vector3().crossVectors(up, forward).normalize();
    this.bodyBasis.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, up, forward));
  }

  private cacheRestOrientations(): void {
    this.computeBodyBasis();
    this.model.updateMatrixWorld(true);
    const faceWorld = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.bodyBasis)
      .applyQuaternion(this.model.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    const head = this.bones.get('Head');
    if (head) {
      this.headRestFace
        .copy(faceWorld)
        .applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()).invert())
        .normalize();
    }
    const eye = this.bones.get('LeftEye') ?? this.bones.get('RightEye');
    if (eye) {
      this.eyeRestFace
        .copy(faceWorld)
        .applyQuaternion(eye.getWorldQuaternion(new THREE.Quaternion()).invert())
        .normalize();
    }
  }

  private cacheFaceMorphs(): void {
    this.model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.morphTargetDictionary) return;
      const dict = mesh.morphTargetDictionary;
      const entry: (typeof this.headMorphTargets)[number] = { mesh };
      let any = false;
      for (const [key, idx] of Object.entries(dict)) {
        const k = key.toLowerCase();
        if (k === 'mouthopen' || k === 'jawopen' || k === 'viseme_aa') {
          entry.open = idx;
          any = true;
        } else if (k === 'mouthsmile' || k === 'mouthsmile_l') {
          entry.smile = idx;
          any = true;
        } else if (k === 'eyeblink_l' || k === 'eyeblinkleft') {
          entry.blinkL = idx;
          any = true;
        } else if (k === 'eyeblink_r' || k === 'eyeblinkright') {
          entry.blinkR = idx;
          any = true;
        } else if (k === 'blink' || k === 'eyesclosed') {
          entry.blink = idx;
          any = true;
        }
      }
      if (any) this.headMorphTargets.push(entry);
    });
  }

  /** Registers a generated blink morph (see FaceMorphs). */
  registerBlinkMorph(mesh: THREE.Mesh, index: number): void {
    const existing = this.headMorphTargets.find((e) => e.mesh === mesh);
    if (existing) existing.blink = index;
    else this.headMorphTargets.push({ mesh, blink: index });
  }

  // --------------------------------------------------------------------- LED

  /**
   * Builds a local frame for a bone from its own geometry: "up" is the direction
   * of its child joint, and right/forward come from the character's world axes
   * projected into bone space. Hard-coded offsets do not survive rigs whose bone
   * axes differ, which all of these do.
   */
  private boneFrame(bone: THREE.Bone): { up: THREE.Vector3; right: THREE.Vector3; forward: THREE.Vector3; length: number } {
    // Several bones have more than one child (the chest carries both shoulders and
    // the neck), so the continuation joint is named explicitly where it matters.
    const preferred = PREFERRED_CHILD[canonicalName(bone.name)];
    let childBone: THREE.Bone | undefined;
    if (preferred) {
      childBone = bone.children.find(
        (c) => (c as THREE.Bone).isBone && canonicalName(c.name) === preferred
      ) as THREE.Bone | undefined;
    }
    if (!childBone) childBone = bone.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined;
    const up = childBone ? childBone.position.clone() : new THREE.Vector3(0, 1, 0);
    const length = up.length() || 0.1;
    up.normalize();
    this.model.updateMatrixWorld(true);
    const bodyToWorld = this.root.getWorldQuaternion(new THREE.Quaternion()).multiply(this.bodyBasis);
    const inv = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(bodyToWorld).applyQuaternion(inv).normalize();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(bodyToWorld).applyQuaternion(inv).normalize();
    return { up, right, forward, length };
  }

  /** World-space direction the bone points, used as the twist axis. */
  private limbAxis(bone: THREE.Bone, out: THREE.Vector3): THREE.Vector3 {
    const preferred = PREFERRED_CHILD[this.boneKey.get(bone) ?? ''];
    let child = preferred
      ? (bone.children.find((c) => (c as THREE.Bone).isBone && canonicalName(c.name) === preferred) as THREE.Bone | undefined)
      : undefined;
    if (!child) child = bone.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined;
    if (!child) return out.set(0, 1, 0);
    out.copy(child.position).applyQuaternion(bone.getWorldQuaternion(this.tmpParentQ));
    if (out.lengthSq() < 1e-8) return out.set(0, 1, 0);
    return out.normalize();
  }

  private buildLed(offset?: THREE.Vector3, radius?: number): void {
    const head = this.bones.get('Head');
    if (!head) return;
    const r = radius ?? 0.0115;
    const geo = new THREE.TorusGeometry(r, r * 0.34, 6, 18);
    const mat = new THREE.MeshBasicMaterial({
      color: PALETTE.ledCalm,
      toneMapped: false,
      transparent: true,
      opacity: 1,
      fog: false,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const frame = this.boneFrame(head);
    const perMetre = this.attachAndMeasure(head, mesh);
    if (offset) {
      mesh.position.copy(offset).multiplyScalar(perMetre);
    } else {
      // Right temple: up the skull, out to the side, slightly forward of the ear.
      mesh.position
        .copy(frame.up)
        .multiplyScalar(frame.length * 0.46)
        .addScaledVector(frame.right, 0.068 * perMetre)
        .addScaledVector(frame.forward, 0.045 * perMetre);
    }
    mesh.scale.setScalar(perMetre);
    // Lay the ring flat against the skull (torus axis points outward).
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.right);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 3;
    this.ledMesh = mesh;
    this.ledMat = mat;

    // A faint sprite gives the LED a halo without needing a real light.
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: Tex.softGlow,
        color: PALETTE.ledCalm,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    halo.scale.setScalar(r * 7 * perMetre);
    halo.position.copy(mesh.position);
    head.add(halo);
    this.ledHalo = halo;
  }

  /**
   * Places a mesh on a limb using the bone's own direction and length.
   *
   * Offsets and the mesh itself are specified in metres and converted into the
   * rig's bind units here: the source models are authored at scales that differ
   * by a factor of a hundred, so hardware sized in bind units would come out
   * either invisible or the size of a building.
   */
  attachToLimb(
    boneName: string,
    mesh: THREE.Object3D,
    opts: { along?: number; lateral?: number; forward?: number; alignAxis?: boolean } = {}
  ): boolean {
    const bone = this.bones.get(boneName);
    if (!bone) return false;
    const frame = this.boneFrame(bone);
    const perMetre = this.attachAndMeasure(bone, mesh);
    mesh.position
      .copy(frame.up)
      .multiplyScalar(frame.length * (opts.along ?? 0.5))
      .addScaledVector(frame.right, (opts.lateral ?? 0) * perMetre)
      .addScaledVector(frame.forward, (opts.forward ?? 0) * perMetre);
    if (opts.alignAxis !== false) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), frame.up);
    }
    mesh.scale.multiplyScalar(perMetre);
    return true;
  }

  /**
   * Measures how many bone units make a world metre, by comparing an attached
   * object's local extent with its extent in the world. Reading the bone's scale
   * directly is not reliable across these rigs, so this is done empirically.
   */
  private attachAndMeasure(bone: THREE.Bone, attached: THREE.Object3D): number {
    // Measure while detached: world space then equals the object's own space,
    // which is the size the geometry was authored at (metres).
    attached.updateMatrixWorld(true);
    const localSize = new THREE.Box3().setFromObject(attached).getSize(new THREE.Vector3()).length();
    bone.add(attached);
    this.model.updateMatrixWorld(true);
    const worldSize = new THREE.Box3().setFromObject(attached).getSize(new THREE.Vector3()).length();
    if (localSize < 1e-9 || worldSize < 1e-9) return 1;
    return localSize / worldSize;
  }

  setLed(state: LedState, immediate = false): void {
    this.ledState = state;
    if (immediate) this.ledPulse = 0;
  }

  get led(): LedState {
    return this.ledState;
  }

  // ------------------------------------------------------------------- clips

  addClip(name: string, clip: THREE.AnimationClip): void {
    const action = this.mixer.clipAction(clip);
    action.enabled = true;
    this.actions.set(name, action);
  }

  hasClip(name: string): boolean {
    return this.actions.has(name);
  }

  /**
   * Cross-fades to a clip.
   *
   * The action's weight is set to 1 before any fade is scheduled: `fadeIn` only
   * installs a fade interpolant and multiplies it by the action's own weight, so
   * zeroing the weight first (the obvious-looking way to start a fade from
   * silence) leaves the action permanently silent.
   */
  play(name: string, opts: { fade?: number; timeScale?: number; loop?: boolean; reset?: boolean } = {}): void {
    const next = this.actions.get(name);
    if (!next) return;
    const fade = opts.fade ?? 0.35;
    if (this.currentClip === name) {
      if (opts.timeScale !== undefined) next.timeScale = opts.timeScale;
      return;
    }
    next.setLoop(opts.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = opts.loop === false;
    next.timeScale = opts.timeScale ?? 1;
    if (opts.reset !== false) next.reset();
    next.enabled = true;
    next.setEffectiveWeight(1);
    next.play();

    const prev = this.currentClip ? this.actions.get(this.currentClip) : null;
    if (prev && prev !== next) {
      if (fade > 0) prev.crossFadeTo(next, fade, false);
      else {
        prev.stop();
        prev.setEffectiveWeight(0);
      }
    }
    this.currentClip = name;
  }

  get clip(): string | null {
    return this.currentClip;
  }

  /** Stops every action, leaving the rest pose plus procedural layers. */
  stopAllClips(): void {
    for (const action of this.actions.values()) {
      action.stop();
      action.setEffectiveWeight(0);
    }
    this.currentClip = null;
  }

  // ------------------------------------------------------------------- poses

  /**
   * Blends an additive pose in. `hold` keeps it at full weight for a duration
   * (game seconds) and then releases it; omit for a pose that stays.
   */
  setPose(
    name: string,
    weight = 1,
    opts: { fadeIn?: number; fadeOut?: number; hold?: number; now?: number } = {}
  ): void {
    const pose = POSES[name];
    if (!pose || !this.posable) return;
    const existing = this.activePoses.get(name);
    const entry: ActivePose = existing ?? {
      pose,
      weight: 0,
      target: weight,
      fadeIn: opts.fadeIn ?? pose.fadeIn ?? 0.35,
      fadeOut: opts.fadeOut ?? pose.fadeOut ?? 0.45,
      releaseAt: null,
    };
    entry.pose = pose;
    entry.target = weight;
    entry.fadeIn = opts.fadeIn ?? pose.fadeIn ?? 0.35;
    entry.fadeOut = opts.fadeOut ?? pose.fadeOut ?? 0.45;
    entry.releaseAt = opts.hold !== undefined && opts.now !== undefined ? opts.now + opts.hold : null;
    if (opts.fadeIn === 0) entry.weight = weight;
    this.activePoses.set(name, entry);
  }

  clearPose(name: string, fadeOut?: number): void {
    const entry = this.activePoses.get(name);
    if (!entry) return;
    entry.target = 0;
    entry.releaseAt = null;
    if (fadeOut !== undefined) entry.fadeOut = fadeOut;
  }

  clearAllPoses(except: string[] = ['restHands', 'armsRelaxed']): void {
    for (const [name, entry] of this.activePoses) {
      if (except.includes(name)) continue;
      entry.target = 0;
      entry.releaseAt = null;
    }
  }

  poseWeight(name: string): number {
    return this.activePoses.get(name)?.weight ?? 0;
  }

  /**
   * Queues a rotation expressed in the character's own frame:
   * +X pitches forward, +Y yaws to the character's right, +Z rolls to its left.
   * Values are degrees and are summed across every layer for the frame.
   */
  addBoneRotation(boneName: string, x: number, y: number, z: number, twist = 0): void {
    let v = this.accum.get(boneName);
    if (!v) {
      v = new THREE.Vector4();
      this.accum.set(boneName, v);
    }
    v.x += x;
    v.y += y;
    v.z += z;
    v.w += twist;
  }

  /**
   * Applies the queued rotations as world-space deltas, parents before children.
   *
   * Poses cannot be written in bone-local axes: these rigs disagree about which
   * axis runs down a bone by as much as 176 degrees, so the same local Euler
   * means "raise the arm" on one skeleton and "twist the shoulder" on another.
   * Rotating in the character's frame instead makes one pose library correct for
   * every character.
   */
  private flushBoneRotations(): void {
    if (!this.accum.size) return;
    const rootQ = this.root.getWorldQuaternion(this.tmpRootQ).multiply(this.bodyBasis);
    const rootInv = this.tmpRootInv.copy(rootQ).invert();
    for (const bone of this.hierarchyOrder) {
      const off = this.accum.get(this.boneKey.get(bone) ?? '');
      if (!off) continue;
      if (Math.abs(off.x) + Math.abs(off.y) + Math.abs(off.z) + Math.abs(off.w) < 1e-4) continue;
      this.poseEuler.set(off.x * DEG, off.y * DEG, off.z * DEG, 'XYZ');
      this.poseQuat.setFromEuler(this.poseEuler);
      // Conjugate into world space so the rotation happens about body axes.
      this.tmpDelta.copy(rootQ).multiply(this.poseQuat).multiply(rootInv);
      if (off.w !== 0) {
        // Twist about the limb's own direction, which body axes cannot express.
        const axis = this.limbAxis(bone, this.tmpAxis);
        this.tmpTwist.setFromAxisAngle(axis, off.w * DEG);
        this.tmpDelta.premultiply(this.tmpTwist);
      }
      const parent = bone.parent;
      if (parent) {
        parent.getWorldQuaternion(this.tmpParentQ);
        this.tmpParentInv.copy(this.tmpParentQ).invert();
        bone.quaternion.premultiply(this.tmpParentQ).premultiply(this.tmpDelta).premultiply(this.tmpParentInv);
      } else {
        bone.quaternion.premultiply(this.tmpDelta);
      }
    }
    this.accum.clear();
  }

  private updatePoses(dt: number, now: number): void {
    for (const [name, entry] of this.activePoses) {
      if (entry.releaseAt !== null && now >= entry.releaseAt) {
        entry.target = 0;
        entry.releaseAt = null;
      }
      const rate = entry.target > entry.weight ? entry.fadeIn : entry.fadeOut;
      const step = rate <= 0 ? 1 : Math.min(1, dt / rate);
      entry.weight += (entry.target - entry.weight) * step;
      if (entry.weight < 0.001 && entry.target === 0) {
        this.activePoses.delete(name);
        continue;
      }
      if (entry.weight <= 0.001) continue;
      for (const [bone, off] of Object.entries(entry.pose.offsets)) {
        if (!off) continue;
        this.addBoneRotation(bone, off[0] * entry.weight, off[1] * entry.weight, off[2] * entry.weight);
      }
    }
  }

  // -------------------------------------------------------------- idle motion

  private updateIdleMotion(dt: number): void {
    const agit = this.agitation;
    this.breathPhase += dt * (0.85 + agit * 1.5);
    this.swayPhase += dt * (0.34 + agit * 0.5);

    // Breathing lifts the chest; the shoulders follow a beat later.
    const breath = Math.sin(this.breathPhase) * this.breathAmount * (0.9 + agit * 0.6);
    const lag = Math.sin(this.breathPhase - 0.5) * this.breathAmount;
    const sway = Math.sin(this.swayPhase) * this.swayAmount;
    const sway2 = Math.sin(this.swayPhase * 0.61 + 1.1) * this.swayAmount;

    this.addBoneRotation('Spine', -breath * 0.5, sway2 * 0.25, sway * 0.2);
    this.addBoneRotation('Spine1', -breath * 0.45, sway2 * 0.3, 0);
    this.addBoneRotation('Spine2', -breath * 0.35, sway2 * 0.45, 0);
    this.addBoneRotation('Neck', breath * 0.4, -sway2 * 0.3, 0);
    this.addBoneRotation('Hips', breath * 0.15, sway2 * 0.35, sway * 0.5);
    this.addBoneRotation('LeftShoulder', 0, 0, -lag * 0.5);
    this.addBoneRotation('RightShoulder', 0, 0, lag * 0.5);

    const hips = this.bones.get('Hips');
    if (hips) hips.position.y += Math.sin(this.breathPhase * 2) * 0.0015;
  }

  // ------------------------------------------------------------------ look-at

  /** Turns the head (and a little of the chest) toward a point. */
  lookAt(target: THREE.Vector3 | THREE.Object3D | null, weight = 1): void {
    if (target === null) {
      this.lookWeightTarget = 0;
      return;
    }
    this.lookTarget =
      target instanceof THREE.Object3D ? target.getWorldPosition(new THREE.Vector3()) : target.clone();
    this.lookWeightTarget = weight;
  }

  /** Where this actor's eyes are in world space; used for framing and focus. */
  getEyePosition(out = new THREE.Vector3()): THREE.Vector3 {
    const left = this.bones.get('LeftEye');
    const right = this.bones.get('RightEye');
    if (left && right) {
      left.getWorldPosition(out);
      out.add(right.getWorldPosition(this.tmpVec)).multiplyScalar(0.5);
      return out;
    }
    const head = this.bones.get('Head');
    if (head) {
      head.getWorldPosition(out);
      // Eyes sit a little above and forward of the head joint.
      const bodyToWorld = this.root.getWorldQuaternion(this.tmpRootQ).multiply(this.bodyBasis);
      out.addScaledVector(this.tmpVec.set(0, 0, 1).applyQuaternion(bodyToWorld), 0.085);
      out.y += 0.075;
      return out;
    }
    return this.root.getWorldPosition(out).setY(this.root.position.y + this.height * 0.94);
  }

  /** Yaw the root must take so the character's own forward points at +Z. */
  private get facingOffset(): number {
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(this.bodyBasis);
    return Math.atan2(f.x, f.z);
  }

  getChestPosition(out = new THREE.Vector3()): THREE.Vector3 {
    const b = this.bones.get('Spine2') ?? this.bones.get('Spine1');
    if (b) return b.getWorldPosition(out);
    return this.root.getWorldPosition(out).setY(this.root.position.y + this.height * 0.62);
  }

  private applyWorldDelta(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3, weight: number, maxAngle: number): void {
    if (weight <= 0.001) return;
    const delta = new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
    // Clamp how far the joint is allowed to swing.
    const angle = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
    const limited = angle > maxAngle ? new THREE.Quaternion().slerp(delta, maxAngle / angle) : delta;
    const eased = new THREE.Quaternion().slerp(limited, weight);

    const parent = bone.parent;
    const parentQ = new THREE.Quaternion();
    if (parent) parent.getWorldQuaternion(parentQ);
    const inv = parentQ.clone().invert();
    // localNew = inv(parentWorld) * delta * parentWorld * localOld
    bone.quaternion.premultiply(parentQ).premultiply(eased).premultiply(inv);
  }

  private updateLook(dt: number, time: number): void {
    this.lookWeight = damp(this.lookWeight, this.lookWeightTarget, 4, dt);
    if (this.lookWeight <= 0.002 || !this.lookTarget) return;

    // Idle micro-glances keep the gaze alive without looking twitchy.
    this.glanceTimer -= dt;
    if (this.glanceTimer <= 0) {
      this.glanceTimer = 1.1 + Math.random() * 2.6;
      const spread = 0.06 + this.agitation * 0.12;
      this.glanceOffset.set(
        (Math.random() - 0.5) * spread * 2,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
    }
    this.lookOffset.lerp(this.glanceOffset, Math.min(1, dt * 2.5));
    const aim = this.lookTarget.clone().add(this.lookOffset);
    aim.y += Math.sin(time * 0.7) * 0.006;

    const head = this.bones.get('Head');
    const neck = this.bones.get('Neck');
    const spine2 = this.bones.get('Spine2');

    if (spine2) {
      const from = this.headRestFace.clone().applyQuaternion(spine2.getWorldQuaternion(new THREE.Quaternion()));
      const to = aim.clone().sub(spine2.getWorldPosition(new THREE.Vector3()));
      this.applyWorldDelta(spine2, from, to, this.lookWeight * 0.16, 22 * DEG);
    }
    if (neck) {
      const from = this.headRestFace.clone().applyQuaternion(neck.getWorldQuaternion(new THREE.Quaternion()));
      const to = aim.clone().sub(neck.getWorldPosition(new THREE.Vector3()));
      this.applyWorldDelta(neck, from, to, this.lookWeight * 0.38, 34 * DEG);
    }
    if (head) {
      const from = this.headRestFace.clone().applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()));
      const to = aim.clone().sub(head.getWorldPosition(new THREE.Vector3()));
      this.applyWorldDelta(head, from, to, this.lookWeight * 0.9, 46 * DEG);
    }

    for (const eyeName of ['LeftEye', 'RightEye'] as const) {
      const eye = this.bones.get(eyeName);
      if (!eye) continue;
      const from = this.eyeRestFace.clone().applyQuaternion(eye.getWorldQuaternion(new THREE.Quaternion()));
      const to = aim.clone().sub(eye.getWorldPosition(new THREE.Vector3()));
      this.applyWorldDelta(eye, from, to, this.lookWeight, 26 * DEG);
    }
  }

  // --------------------------------------------------------------------- face

  /** Drives the jaw from a speech envelope (0..1). */
  setMouth(open: number, smile?: number): void {
    this.mouthOpenTarget = clamp01(open);
    if (smile !== undefined) this.smileTarget = clamp01(smile);
  }

  setExpressionSmile(v: number): void {
    this.smileTarget = clamp01(v);
  }

  blinkNow(): void {
    if (this.blinkPhase <= 0) this.blinkPhase = 0.001;
  }

  private updateFace(dt: number): void {
    if (!this.hasFace || !this.headMorphTargets.length) return;

    this.mouthOpen = damp(this.mouthOpen, this.mouthOpenTarget, 22, dt);
    this.smile = damp(this.smile, this.smileTarget, 6, dt);

    // Blink: irregular intervals, faster when agitated.
    if (this.blinkPhase > 0) {
      this.blinkPhase += dt / 0.12;
      if (this.blinkPhase >= 1) {
        this.blinkPhase = 0;
        this.blinkValue = 0;
      } else {
        this.blinkValue = Math.sin(this.blinkPhase * Math.PI);
      }
    } else {
      this.blinkTimer -= dt * (1 + this.agitation);
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 1.6 + Math.random() * 4.2;
        this.blinkPhase = 0.001;
      }
    }

    for (const entry of this.headMorphTargets) {
      const infl = entry.mesh.morphTargetInfluences;
      if (!infl) continue;
      if (entry.open !== undefined) infl[entry.open] = this.mouthOpen;
      if (entry.smile !== undefined) infl[entry.smile] = this.smile;
      if (entry.blink !== undefined) infl[entry.blink] = this.blinkValue;
      if (entry.blinkL !== undefined) infl[entry.blinkL] = this.blinkValue;
      if (entry.blinkR !== undefined) infl[entry.blinkR] = this.blinkValue;
    }
  }

  // ------------------------------------------------------------------ facing

  /**
   * World direction the character is actually facing.
   *
   * Not the same as the root's +Z: the source rigs disagree about which way a
   * model faces in its own space, so the root carries a compensating yaw. Shot
   * framing has to ask for this rather than reading the quaternion, or a camera
   * placed "in front of" an actor ends up behind them and inside the set.
   */
  facingDirection(out = new THREE.Vector3()): THREE.Vector3 {
    const yaw = this.root.rotation.y + this.facingOffset;
    return out.set(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
  }

  /** Rotates the whole body to face a world point (yaw only). */
  faceToward(point: THREE.Vector3, immediate = false): void {
    const dx = point.x - this.root.position.x;
    const dz = point.z - this.root.position.z;
    const yaw = Math.atan2(dx, dz) - this.facingOffset;
    this.facingTarget = yaw;
    if (immediate) {
      this.root.rotation.y = yaw;
      this.facingTarget = null;
    }
  }

  /** Yaw in world terms; 0 faces +Z regardless of how the model was authored. */
  setFacing(yaw: number): void {
    this.root.rotation.y = yaw - this.facingOffset;
    this.facingTarget = null;
  }

  private updateFacing(dt: number): void {
    if (this.facingTarget === null) return;
    let diff = this.facingTarget - this.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.004) {
      this.root.rotation.y = this.facingTarget;
      this.facingTarget = null;
      return;
    }
    this.root.rotation.y += diff * Math.min(1, dt * this.turnSpeed);
  }

  // --------------------------------------------------------------------- LED

  private updateLed(dt: number, time: number): void {
    if (!this.ledMat || !this.ledMesh) return;
    const colors: Record<LedState, number> = {
      calm: PALETTE.ledCalm,
      process: PALETTE.ledProcess,
      stress: PALETTE.ledStress,
      off: PALETTE.ledDead,
    };
    const target = new THREE.Color(colors[this.ledState]);
    this.ledMat.color.lerp(target, Math.min(1, dt * 6));
    if (this.ledHalo) (this.ledHalo.material as THREE.SpriteMaterial).color.copy(this.ledMat.color);

    if (this.ledState === 'off') {
      this.ledMat.opacity = 0.35;
      if (this.ledHalo) (this.ledHalo.material as THREE.SpriteMaterial).opacity = 0;
      return;
    }
    // Calm breathes slowly, processing spins, stress strobes.
    const speed = this.ledState === 'stress' ? 9 : this.ledState === 'process' ? 4.5 : 1.4;
    this.ledPulse = 0.72 + 0.28 * Math.sin(time * speed);
    if (this.ledState === 'stress') this.ledPulse = 0.55 + 0.45 * Math.sign(Math.sin(time * speed));
    this.ledMat.opacity = this.ledPulse;
    if (this.ledHalo) (this.ledHalo.material as THREE.SpriteMaterial).opacity = this.ledPulse * 0.45;
    this.ledSpin += dt * (this.ledState === 'process' ? 6 : 1.2);
    this.ledMesh.rotateZ(dt * (this.ledState === 'process' ? 6 : 1.2));
  }

  // -------------------------------------------------------------------- frame

  /**
   * Restores the authored rest pose. Every layer above the mixer writes relative
   * offsets, so without this they would compound frame after frame — and bones
   * that no clip touches would drift away entirely.
   */
  private resetToRest(): void {
    for (const bone of this.allBones) {
      const q = this.restQuat.get(bone);
      if (q) bone.quaternion.copy(q);
      const p = this.restPos.get(bone);
      if (p) bone.position.copy(p);
    }
  }

  update(dt: number, time: number): void {
    this.resetToRest();
    this.mixer.update(dt);
    this.updatePoses(dt, time);
    this.updateIdleMotion(dt);
    this.flushBoneRotations();
    this.updateLook(dt, time);
    this.updateFace(dt);
    this.updateFacing(dt);
    this.updateLed(dt, time);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.ledMesh?.geometry.dispose();
    this.ledMat?.dispose();
  }
}
