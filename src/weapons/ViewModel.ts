import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type { PhysicsSystem, PlayerSystem, WeaponDefinition } from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { clamp, damp, easeOutQuint, saturate, smoothstep } from '../core/MathUtils';
import {
  ClipPlayer,
  createClipOut,
  resetClipOut,
  type Clip,
  type ClipEnv,
  type ClipOut,
  type CueId,
  type HandAnchor,
  type HandPose,
} from './anim/Clips';
import {
  ClipLayer,
  LookLagLayer,
  MovementLayer,
  ObstructionLayer,
  RecoilLayer,
  StanceLayer,
  SwayLayer,
} from './anim/Layers';
import { LayerStack, Spring1, type PoseDelta } from './anim/Spring';
import { createPartState, createViewState, type PartState, type ViewState } from './anim/State';
import { buildChamberedCase, buildStanagMag } from './models/Common';
import { HandsRig } from './models/Hands';
import { buildGrenadeModel } from './models/Ordnance';
import type { WeaponModelFactory } from './models';
import type { WeaponModel } from './models/WeaponModel';
import { ScopeView } from './ScopeView';
import { ViewLighting } from './ViewLighting';
import type { ThrowableId } from './WeaponDefs';

/**
 * The viewmodel.
 *
 * Everything lives in `ctx.viewScene` and is drawn with `ctx.viewCamera`, which
 * sits at the origin looking down -Z with its own depth buffer. That is what
 * stops the weapon clipping through walls, and it means view space and camera
 * space coincide here: a weapon pose is a position and a rotation a few
 * centimetres in front of the origin.
 *
 * The final pose is a base plus additive layers:
 *
 *   base          hip pose blended towards the solved sight-aligned pose
 *     + stance    crouch / prone / slide / sprint / airborne / landing
 *     + movement  footstep-locked figure-eight bob
 *     + sway      idle noise and breathing
 *     + look lag  weapon inertia under mouse movement
 *     + recoil    per-shot impulse plus the climb that builds under fire
 *     + clip      reload / draw / holster / melee / inspect / action cycling
 *     + obstruction  low ready when the muzzle is about to enter a wall
 *
 * The layers are additive and commutative, so the order above is for
 * readability — with one exception: obstruction is last because it is meant to
 * win over everything else.
 */

const VIEW_FORWARD = /* @__PURE__ */ new THREE.Vector3(0, 0, -1);
const BASE_VIEW_FOV = GAMEPLAY.camera.viewmodelFov;

/**
 * Viewmodel FOV when aimed.
 *
 * Independent of the world's zoom, and it has to be: the world is drawn by its
 * own camera and composited behind, so this only decides how large the weapon
 * appears. An open sight gets a barely-perceptible narrowing, the classic trick
 * that makes the gun seem to grow as it comes up to the eye. A scope closes down
 * to around 37 degrees, which is what makes its ocular bell — 23 mm of radius,
 * 90 mm from the eye — cover three quarters of the screen instead of a third.
 */
const viewFovFor = (adsZoom: number, scoped: boolean): number => {
  const z = Math.max(1, adsZoom);
  if (!scoped) return BASE_VIEW_FOV / (1 + 0.1 * (z - 1));
  return 50 - 13 * smoothstep(2, 5, z);
};

/**
 * Fraction of the screen height a scope's aperture is asked to cover. Growing it
 * with magnification is the cue that separates a 2x prism, where the gun is still
 * in shot around the optic, from a precision scope that owns the whole frame.
 */
const apertureCoverageFor = (adsZoom: number): number => 0.26 + 0.5 * smoothstep(2, 4.6, adsZoom);

/**
 * Above this magnification the optic owns the whole frame and everything outside
 * the aperture is blacked out; below it the tube, the rifle and the world around
 * them all stay in shot. Blacking out at 2x would be physically defensible — a
 * real prism at cheek weld does fill the eye — but it costs the player their
 * peripheral vision for almost no magnification in return.
 */
const FULL_BLACKOUT_ZOOM = 3;

/** Elbows tuck in and forward as the weapon comes up to the eye. */
const ELBOW_ADS_R = /* @__PURE__ */ new THREE.Vector3(-0.03, -0.05, 0.05);
const ELBOW_ADS_L = /* @__PURE__ */ new THREE.Vector3(0.035, -0.06, 0.02);

/**
 * Hip pose: the aimed pose swung about the sight, with the sight then parked at
 * a fixed spot in the lower-right of the frame.
 *
 * Pivoting on the sight and then placing the sight absolutely is what makes one
 * pair of numbers frame a pistol and an LMG alike — the aimed pose always puts
 * the sight at (0, 0, -eyeRelief), so both the swing and the destination mean
 * the same thing on every weapon no matter where its model origin happens to be.
 * Because the swing pivots on the sight, HIP_SIGHT is literally where the sight
 * sits in view space when hipfiring, which makes the framing directly readable:
 * 11.5 cm outboard, 11.5 cm below the eye, 56 cm downrange. The depth and the
 * drop are the two numbers that decide the shot. Depth sets how much gun is on
 * screen — a rifle's butt is about 32 cm behind its sight, so pulling the sight
 * in to 40 cm leaves the buttplate 8 cm off the lens and it fills a quarter of
 * the frame as an unreadable slab. The drop decides how much of the interesting
 * half of the weapon survives: at 11.5 cm down the sight lands at -0.35 NDC and
 * the magazine, grip and trigger guard sit along the bottom edge rather than
 * below it.
 *
 * The 4.3-degree inboard yaw converges the bore towards the crosshair so the
 * weapon visually points where the shots go, and swings the butt outboard past
 * the head. It has to stay small: past about 6 degrees the muzzle crosses the
 * centre of the screen and the rifle reads as aimed off to the left. The roll is
 * the natural inboard cant of a rifle dropped off the cheek.
 */
const HIP_SWING = /* @__PURE__ */ new THREE.Euler(-0.055, 0.075, 0.09, 'YXZ');
const HIP_SIGHT = /* @__PURE__ */ new THREE.Vector3(0.108, -0.072, -0.4);

export interface ViewInputs {
  wantAds: boolean;
  /** 0..1 sprint engagement. */
  sprint: number;
  tacticalSprint: boolean;
  stance: ViewState['stance'];
  grounded: boolean;
  speed: number;
  /** Radians of view rotation applied this frame. */
  lookYawDelta: number;
  lookPitchDelta: number;
  firing: boolean;
  magFraction: number;
  empty: boolean;
}

/** Props the support hand can be carrying mid-clip. */
interface PropSet {
  mag: THREE.Group;
  shell: THREE.Group;
  rocket: THREE.Group | null;
  grenade: THREE.Group;
}

interface Rigged {
  model: WeaponModel;
  hands: HandsRig;
  props: PropSet;
  /** Charging-handle grab point in weapon space, measured from the model. */
  chargePoint: THREE.Vector3;
}

export class ViewModel {
  readonly root = new THREE.Group();
  readonly state: ViewState = createViewState();
  readonly parts: PartState = createPartState();

  /** 0..1 gameplay ADS blend. Spread, sensitivity and zoom all read this. */
  adsAmount = 0;
  isAiming = false;

  /** Final composed pose of this frame, in view space. */
  readonly posePosition = new THREE.Vector3();
  readonly poseQuaternion = new THREE.Quaternion();

  /** Set by the weapon system so animation cues can drive audio and FX. */
  onCue: ((id: CueId) => void) | null = null;

  private readonly stack = new LayerStack<ViewState>();
  private readonly stance = new StanceLayer();
  private readonly movement = new MovementLayer();
  private readonly sway = new SwayLayer();
  private readonly lookLag = new LookLagLayer();
  private readonly recoil = new RecoilLayer();
  private readonly clipLayer = new ClipLayer();
  private readonly obstruction = new ObstructionLayer();

  private readonly clips = new ClipPlayer();
  private readonly clipOut: ClipOut = createClipOut();
  private readonly clipEnv: ClipEnv = { empty: false, ads: 0 };

  private ctx!: EngineContext;
  private factory!: WeaponModelFactory;
  private readonly rigs = new Map<string, Rigged>();
  private readonly handAnchors = new Map<string, THREE.Object3D>();
  private rig: Rigged | null = null;
  private def: WeaponDefinition | null = null;
  /** Optic presents through an aperture (a scope) rather than an open sight. */
  private magnified = false;
  private eyeRelief = 0.2;
  private readonly scope = new ScopeView();
  private readonly lighting = new ViewLighting();

  private readonly hipPosition = new THREE.Vector3();
  private readonly hipQuaternion = new THREE.Quaternion();
  private readonly adsPosition = new THREE.Vector3();
  private readonly adsQuaternion = new THREE.Quaternion();

  private adsRaw = 0;
  private readonly adsSettle = new Spring1(0, 5.2, 0.4);
  private adsBlend = 0;
  private adsSnapped = false;
  private moveCycle = 0;
  private idleTime = 0;
  private lowReady = 0;
  private viewFov: number = BASE_VIEW_FOV;

  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly tmpV3 = new THREE.Vector3();
  private readonly tmpV4 = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpQ2 = new THREE.Quaternion();
  private readonly tmpEuler = new THREE.Euler();
  private readonly tmpBox = new THREE.Box3();
  private readonly handV = new THREE.Vector3();
  private readonly handV2 = new THREE.Vector3();
  private readonly handQ = new THREE.Quaternion();
  private readonly handEuler = new THREE.Euler();

  init(ctx: EngineContext, factory: WeaponModelFactory): void {
    this.ctx = ctx;
    this.factory = factory;
    this.root.name = 'viewmodel';
    ctx.viewScene.add(this.root);
    this.lighting.attach(ctx);
    this.scope.setQuality(ctx.config.tier);
    this.clips.onCue = (id) => this.onCue?.(id);
    this.stack
      .add(this.stance)
      .add(this.movement)
      .add(this.sway)
      .add(this.lookLag)
      .add(this.recoil)
      .add(this.clipLayer)
      .add(this.obstruction);
  }

  // -------------------------------------------------------------------------
  // Weapon binding
  // -------------------------------------------------------------------------

  get model(): WeaponModel | null {
    return this.rig?.model ?? null;
  }

  get clipActive(): boolean {
    return this.clips.active;
  }

  get activeClip(): Clip | null {
    return this.clips.current;
  }

  get clipProgress(): number {
    return this.clips.progress;
  }

  get clipRemaining(): number {
    return this.clips.remaining;
  }

  /** Swaps the displayed weapon immediately; the draw clip does the reveal. */
  setWeapon(def: WeaponDefinition | null): void {
    if (this.rig) {
      this.rig.model.setVisible(false);
      this.rig.hands.setVisible(false);
      this.rig.model.root.removeFromParent();
      this.rig.hands.root.removeFromParent();
    }
    this.def = def;
    this.rig = def ? this.acquire(def) : null;
    this.cancelClip();
    this.resetParts();
    this.stack.resetAll();
    this.adsRaw = 0;
    this.adsBlend = 0;
    this.adsAmount = 0;
    this.isAiming = false;
    this.adsSettle.snap(0);
    if (!this.rig) return;

    this.root.add(this.rig.model.root, this.rig.hands.root);
    this.rig.model.setVisible(true);
    this.rig.hands.setVisible(true);
    if (this.rig.model.supportStyle === 'none') this.rig.hands.left.setVisible(false);
    // A weapon is "scoped" when its optic presents through an aperture rather
    // than over an open sight. That one property decides the eye relief, the
    // viewmodel FOV, the blackout annulus and whether the world gets rendered a
    // second time for the sight picture.
    const aperture = this.rig.model.reticle?.aperture;
    this.magnified = !!aperture;
    if (aperture) aperture.mesh.material = this.scope.material;
    this.solvePoses(this.rig.model);
    this.compose();
    this.rig.model.applyParts(this.parts);
    this.poseHands();
  }

  private acquire(def: WeaponDefinition): Rigged | null {
    const existing = this.rigs.get(def.id);
    if (existing) return existing;
    const model = this.factory.get(def.id);
    if (!model) return null;
    const pal = this.factory.paletteFor(def.id);

    const hands = new HandsRig(pal, {
      gripRadius: model.gripRadius,
      supportRadius: model.supportRadius,
      support: model.supportStyle,
      indexExtended: def.class !== 'melee',
    });

    const mag = this.buildPropMag(def, model);
    const shell = buildChamberedCase(pal, def.class === 'shotgun' ? 'shotgun' : 'rifle');
    const grenade = buildGrenadeModel(pal, 'frag');
    const ordnance = model.part('ordnance');
    const rocketSource = ordnance?.children[0];
    const rocket = rocketSource ? (rocketSource.clone(true) as THREE.Group) : null;

    const props: PropSet = { mag, shell, rocket, grenade };
    // Props hang off the support hand so they inherit every hand animation.
    for (const p of [mag, shell, grenade, rocket]) {
      if (!p) continue;
      p.visible = false;
      p.traverse((o) => {
        o.frustumCulled = false;
      });
      hands.left.hand.add(p);
    }
    // Seated in the left fist, which grips along +Y with the palm on -X.
    const r = model.supportRadius;
    mag.position.set(-r - 0.013, 0.03, -0.014);
    mag.rotation.set(0.12, 0, 0.18);
    shell.position.set(-r - 0.015, 0.01, -0.02);
    shell.rotation.set(1.4, 0, 0.2);
    shell.scale.setScalar(1.05);
    grenade.position.set(-r - 0.022, 0.002, -0.008);
    grenade.rotation.set(0, 0, 0.22);
    if (rocket) {
      rocket.position.set(-r - 0.018, 0.0, 0.3);
      rocket.rotation.set(-1.45, 0, 0);
    }

    const rigged: Rigged = { model, hands, props, chargePoint: this.measureChargePoint(model) };
    this.rigs.set(def.id, rigged);
    return rigged;
  }

  /** A spare magazine for the reload: the weapon's own body when it has one. */
  private buildPropMag(def: WeaponDefinition, model: WeaponModel): THREE.Group {
    const own = model.part('magazine');
    if (own && own.children.length > 0) {
      const clone = own.clone(true);
      clone.name = 'propMag';
      clone.position.set(0, 0, 0);
      clone.quaternion.identity();
      return clone;
    }
    const pal = this.factory.paletteFor(def.id);
    return buildStanagMag(pal, {
      length: 0.17,
      curve: 0.24,
      width: 0.026,
      depth: 0.039,
      material: pal.polymerDark,
    });
  }

  /**
   * Where the support hand grabs to charge the weapon, taken from the bounds of
   * whatever the builder named `boltHandle` / `chargingHandle` / `pumpHandle`.
   * Measuring it means no weapon has to declare it and it cannot go stale when a
   * model moves.
   */
  private measureChargePoint(model: WeaponModel): THREE.Vector3 {
    const out = new THREE.Vector3();
    model.root.position.set(0, 0, 0);
    model.root.quaternion.identity();
    model.root.updateMatrixWorld(true);
    for (const name of ['boltHandle', 'chargingHandle', 'pumpHandle', 'slide'] as const) {
      const part = model.part(name);
      if (!part || part.children.length === 0) continue;
      this.tmpBox.setFromObject(part, true);
      if (this.tmpBox.isEmpty()) continue;
      this.tmpBox.getCenter(out);
      // Sit the fist just outboard of the handle rather than inside it.
      out.x += this.tmpBox.max.x > -this.tmpBox.min.x ? 0.018 : -0.018;
      return out;
    }
    return out.copy(model.sightLocalPosition).setY(0.024);
  }

  // -------------------------------------------------------------------------
  // ADS solve
  // -------------------------------------------------------------------------

  /**
   * Derives the aimed pose from the model's own sight anchor, then derives the
   * hip pose from the aimed one.
   *
   * ADS: rotating by the inverse of the sight's weapon-space rotation puts the
   * sight axis exactly on the view's -Z; placing the anchor at (0, 0, -eyeRelief)
   * puts the eye exactly behind it. Since the reticle sits on that axis it lands
   * dead centre on screen for every weapon with no per-weapon fudge factor, and
   * it stays correct if an optic or a mount is later moved a millimetre.
   *
   * Hip: the weapon swings down and outboard off the shoulder, so the hip pose is
   * the aimed pose rotated about a shoulder pivot and pushed away from the face.
   * Deriving it this way rather than authoring 14 poses by hand means a weapon
   * with a tall optic or a long receiver frames itself correctly, and the two
   * poses can never drift apart. `hipTrim`/`hipTrimRotation` on the build stay as
   * a per-weapon trim on top, which is where a bullpup or a pistol wants a nudge.
   */
  private solvePoses(model: WeaponModel): void {
    const relief = this.solveEyeRelief(model);
    this.eyeRelief = relief;
    this.adsQuaternion.copy(model.sightLocalQuaternion).invert();
    this.adsPosition.copy(model.sightLocalPosition).applyQuaternion(this.adsQuaternion).negate();
    this.adsPosition.z -= relief;

    this.tmpEuler.set(HIP_SWING.x, HIP_SWING.y, HIP_SWING.z, 'YXZ');
    this.tmpQ.setFromEuler(this.tmpEuler);
    this.hipQuaternion.copy(this.tmpQ).multiply(this.adsQuaternion);
    this.tmpV2.set(0, 0, -relief);
    this.hipPosition
      .copy(this.adsPosition)
      .sub(this.tmpV2)
      .applyQuaternion(this.tmpQ)
      .add(HIP_SIGHT)
      .add(model.hipTrim);
    this.tmpEuler.set(model.hipTrimRotation.x, model.hipTrimRotation.y, model.hipTrimRotation.z, 'XYZ');
    this.hipQuaternion.multiply(this.tmpQ.setFromEuler(this.tmpEuler));
  }

  /**
   * How far in front of the eye the sight is parked when aiming.
   *
   * An open sight uses the model's own figure, which is chosen so the housing
   * reads at a plausible size and the receiver stays in shot. A scope instead
   * has its distance derived, because what matters there is not a length in
   * metres but how much of the screen the sight picture covers: the aperture's
   * on-screen radius is (r / d) / tan(fov / 2) in NDC, so asking for a coverage
   * gives d directly. Widen the ocular bell or change the aimed FOV and the eye
   * follows on its own.
   */
  private solveEyeRelief(model: WeaponModel): number {
    const aperture = model.reticle?.aperture;
    const zoom = this.def?.adsZoom ?? 1;
    if (!aperture) return model.eyeRelief;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(viewFovFor(zoom, true)) * 0.5);
    return aperture.radius / (apertureCoverageFor(zoom) * halfFov);
  }

  /** Distance from the eye to the sight, for depth-of-field focus. */
  get sightDistance(): number {
    return this.rig ? this.eyeRelief : 0.1;
  }

  // -------------------------------------------------------------------------
  // Commands from the weapon system
  // -------------------------------------------------------------------------

  play(clip: Clip, duration: number): void {
    this.clips.play(clip, duration);
    this.idleTime = 0;
  }

  cancelClip(): void {
    this.clips.cancel();
    resetClipOut(this.clipOut);
    this.clipLayer.reset();
  }

  setClipEnv(empty: boolean): void {
    this.clipEnv.empty = empty;
  }

  /** Visual weapon kick. Camera recoil is the player system's business. */
  fireRecoil(def: WeaponDefinition, pitch: number, yaw: number, roll: number): void {
    this.recoil.fire(def, pitch, yaw, roll, this.adsAmount);
    this.state.sinceShot = 0;
    this.idleTime = 0;
  }

  resetParts(): void {
    const p = this.parts;
    p.bolt = 0;
    p.charging = 0;
    p.boltHandle = 0;
    p.pump = 0;
    p.slide = 0;
    p.trigger = 0;
    p.hammer = 1;
    p.cylinder = 0;
    p.magDrop = 0;
    p.magVisible = true;
    p.dustCover = 0;
    p.caseVisible = true;
    p.safety = 1;
    p.ordnanceVisible = true;
  }

  setBipod(deployed: boolean): void {
    this.parts.bipod = deployed ? 1 : 0;
  }

  setBreathHold(amount: number): void {
    this.sway.hold = saturate(amount);
  }

  /** Swaps the grenade in the left hand so the throw shows the right ordnance. */
  setGrenadeKind(kind: ThrowableId): void {
    const rig = this.rig;
    if (!rig) return;
    const pal = this.factory.paletteFor(rig.model.id);
    const replacement = buildGrenadeModel(pal, kind);
    replacement.position.copy(rig.props.grenade.position);
    replacement.quaternion.copy(rig.props.grenade.quaternion);
    replacement.visible = rig.props.grenade.visible;
    replacement.traverse((o) => {
      o.frustumCulled = false;
    });
    rig.props.grenade.removeFromParent();
    rig.props.grenade = replacement;
    rig.hands.left.hand.add(replacement);
  }

  // -------------------------------------------------------------------------
  // Space conversions. View space and main-camera space coincide, so the main
  // camera's world matrix is exactly the view-to-world transform.
  // -------------------------------------------------------------------------

  private viewToWorld(view: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    this.ctx.camera.updateMatrixWorld();
    return out.copy(view).applyMatrix4(this.ctx.camera.matrixWorld);
  }

  private viewDirToWorld(view: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    this.ctx.camera.updateMatrixWorld();
    this.ctx.camera.getWorldQuaternion(this.tmpQ2);
    return out.copy(view).applyQuaternion(this.tmpQ2).normalize();
  }

  /** View-space transform of a weapon anchor. */
  anchorView(
    anchor: THREE.Object3D,
    outPosition: THREE.Vector3,
    outQuaternion?: THREE.Quaternion,
  ): THREE.Vector3 {
    if (!this.rig) return outPosition.set(0, 0, 0);
    this.rig.model.localTransform(anchor, this.tmpV, this.tmpQ);
    outPosition.copy(this.tmpV).applyQuaternion(this.poseQuaternion).add(this.posePosition);
    if (outQuaternion) outQuaternion.copy(this.poseQuaternion).multiply(this.tmpQ);
    return outPosition;
  }

  /**
   * World-space transform of a weapon anchor. Tracers, world muzzle flashes and
   * ejected cases all start here, so it has to be the true position of the
   * viewmodel's own muzzle rather than the camera.
   */
  anchorWorld(
    anchor: THREE.Object3D,
    outPosition: THREE.Vector3,
    outDirection?: THREE.Vector3,
  ): THREE.Vector3 {
    if (!this.rig) {
      outPosition.set(0, 0, 0);
      outDirection?.set(0, 0, -1);
      return outPosition;
    }
    this.rig.model.localTransform(anchor, this.tmpV, this.tmpQ);
    this.tmpV.applyQuaternion(this.poseQuaternion).add(this.posePosition);
    if (outDirection) {
      this.tmpV3.copy(VIEW_FORWARD).applyQuaternion(this.tmpQ).applyQuaternion(this.poseQuaternion);
      this.viewDirToWorld(this.tmpV3, outDirection);
    }
    return this.viewToWorld(this.tmpV, outPosition);
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  update(dt: number, inputs: ViewInputs, def: WeaponDefinition | null, reloading: boolean): void {
    const s = this.state;
    s.weapon = def;
    s.sprint = inputs.sprint;
    s.tacticalSprint = inputs.tacticalSprint;
    s.stance = inputs.stance;
    s.grounded = inputs.grounded;
    s.speed = inputs.speed;
    s.speedNorm = inputs.speed / GAMEPLAY.player.walkSpeed;
    s.lookYawDelta = inputs.lookYawDelta;
    s.lookPitchDelta = inputs.lookPitchDelta;
    s.firing = inputs.firing;
    s.reloading = reloading;
    s.empty = inputs.empty;
    s.magFraction = inputs.magFraction;
    s.sinceShot += dt;

    // Footstep-locked bob phase; the stride rate scales with speed so the bob
    // and the footstep audio cannot drift apart.
    const stride = GAMEPLAY.camera.bobFrequency * (0.55 + 0.45 * clamp(s.speedNorm, 0, 2));
    if (s.grounded && s.speed > 0.25) this.moveCycle += dt * stride;
    s.moveCycle = this.moveCycle;

    this.updateAds(dt, inputs, def);
    s.ads = this.adsAmount;

    this.updateObstruction(dt);
    s.obstruction = this.lowReady;

    const wasActive = this.clips.active;
    resetClipOut(this.clipOut);
    this.clipEnv.ads = this.adsAmount;
    this.clips.update(dt, this.clipOut, this.clipEnv);
    if (wasActive && !this.clips.active) this.resetParts();
    if (this.clips.active) this.adoptClipParts();
    else this.updateIdleChannels(dt, inputs);

    this.clipLayer.position.copy(this.clipOut.position);
    this.clipLayer.rotation.copy(this.clipOut.rotation);

    const delta = this.stack.evaluate(dt, s);
    this.compose(delta);

    if (this.rig) {
      this.rig.model.applyParts(this.parts);
      this.poseHands();
      this.updateReticle();
      this.updateProps();
    }
  }

  /**
   * A single self-loading cycle: the carrier snaps rearward and returns. Driven
   * on a timer rather than a clip because it has to overlap firing at 1150 rpm,
   * where the next shot starts before the last cycle has finished.
   */
  cycleAction(duration: number, channel: 'bolt' | 'slide' | 'pump'): void {
    this.cycleDuration = Math.max(0.02, duration);
    this.cycleTime = 0;
    this.cycleChannel = channel;
  }

  private cycleTime = 1;
  private cycleDuration = 1;
  private cycleChannel: 'bolt' | 'slide' | 'pump' = 'bolt';

  /** Trigger, dust cover, action cycling and empty hold-open, when no clip owns them. */
  private updateIdleChannels(dt: number, inputs: ViewInputs): void {
    const p = this.parts;
    const def = this.def;
    p.trigger = damp(p.trigger, inputs.firing ? 1 : 0, 26, dt);
    p.dustCover = damp(p.dustCover, this.state.sinceShot < 1.8 ? 1 : 0, 3.2, dt);
    p.safety = damp(p.safety, 1, 12, dt);

    const holdsOpen =
      def !== null && def.magSize > 0 && def.fireMode !== 'pump' && def.class !== 'launcher';
    const locked = holdsOpen && inputs.empty;

    if (this.cycleTime < this.cycleDuration) {
      this.cycleTime += dt;
      const u = saturate(this.cycleTime / this.cycleDuration);
      // Rearward under gas pressure, forward under spring: back is faster.
      const v = u < 0.4 ? Math.sin((u / 0.4) * Math.PI * 0.5) : 1 - smoothstep(0, 1, (u - 0.4) / 0.6);
      const travel = locked ? Math.max(v, u > 0.4 ? u : 0) : v;
      p[this.cycleChannel] = travel;
      if (this.cycleChannel === 'bolt') p.charging = 0;
      p.caseVisible = u > 0.7 && !locked;
      p.hammer = u < 0.3 ? 1 - u / 0.3 : Math.min(1, (u - 0.3) / 0.35);
      return;
    }

    if (locked) {
      p.bolt = damp(p.bolt, 1, 24, dt);
      p.charging = 0;
      p.caseVisible = false;
    } else {
      if (p.bolt !== 0) p.bolt = p.bolt < 1e-3 ? 0 : damp(p.bolt, 0, 26, dt);
      if (p.slide !== 0) p.slide = p.slide < 1e-3 ? 0 : damp(p.slide, 0, 26, dt);
      p.hammer = damp(p.hammer, 1, 20, dt);
      p.caseVisible = def === null || def.magSize === 0 || !inputs.empty;
    }
  }

  /** Clip-authored channels win while a clip is playing. */
  private adoptClipParts(): void {
    const src = this.clipOut.parts;
    const p = this.parts;
    p.bolt = src.bolt;
    p.charging = src.charging;
    p.boltHandle = src.boltHandle;
    p.pump = src.pump;
    p.slide = src.slide;
    p.trigger = src.trigger;
    p.hammer = src.hammer;
    p.cylinder = src.cylinder;
    p.magDrop = src.magDrop;
    p.magVisible = src.magVisible;
    p.caseVisible = src.caseVisible;
    p.safety = src.safety;
    p.ordnanceVisible = src.ordnanceVisible;
    p.dustCover = Math.max(src.bolt, src.pump);
  }

  // -------------------------------------------------------------------------
  // ADS
  // -------------------------------------------------------------------------

  private updateAds(dt: number, inputs: ViewInputs, def: WeaponDefinition | null): void {
    const clipName = this.clips.current?.name;
    const canAim =
      def !== null &&
      def.class !== 'melee' &&
      clipName !== 'grenadeThrow' &&
      clipName !== 'knifeSlash' &&
      clipName !== 'buttStrike';
    const want = canAim && inputs.wantAds && inputs.sprint < 0.7;
    const time = Math.max(0.05, def?.adsTime ?? 0.2);
    // Raw progress is linear in time so `adsTime` means what it says; the curve
    // that makes the transition feel fast at the start is applied on top.
    const rate = dt / (want ? time : time * 0.85);
    this.adsRaw = clamp(this.adsRaw + (want ? rate : -rate), 0, 1);
    if (want && this.adsRaw >= 1 && !this.adsSnapped) {
      this.adsSettle.impulse(1.1);
      this.adsSnapped = true;
    }
    if (!want) this.adsSnapped = false;
    this.adsSettle.target = 0;
    this.adsSettle.step(dt);

    this.adsAmount = want
      ? easeOutQuint(this.adsRaw)
      : this.adsRaw * this.adsRaw * (3 - 2 * this.adsRaw);
    this.isAiming = want && this.adsRaw > 0.55;
    // A touch of overshoot past the sighted pose as it arrives, then settle.
    this.adsBlend = clamp(this.adsAmount + this.adsSettle.value * 0.05, 0, 1.05);

    const target = def ? viewFovFor(def.adsZoom, this.magnified) : BASE_VIEW_FOV;
    const fov = BASE_VIEW_FOV + (target - BASE_VIEW_FOV) * this.adsAmount;
    if (Math.abs(fov - this.viewFov) > 1e-3) {
      this.viewFov = fov;
      this.ctx.viewCamera.fov = fov;
      this.ctx.viewCamera.updateProjectionMatrix();
    }
  }

  // -------------------------------------------------------------------------
  // Obstruction
  // -------------------------------------------------------------------------

  /**
   * Low ready. Casting down the bore rather than down the view axis matters: at
   * the hip the weapon points several degrees off centre, which is exactly the
   * case where a doorway frame eats the barrel.
   */
  private updateObstruction(dt: number): void {
    let blocked = 0;
    const rig = this.rig;
    const physics = this.ctx.tryGet<PhysicsSystem>('physics');
    const player = this.ctx.tryGet<PlayerSystem>('player');
    if (rig && physics && player && this.adsBlend < 0.7) {
      player.getEyePosition(this.tmpV);
      this.tmpV3.copy(VIEW_FORWARD).applyQuaternion(this.poseQuaternion);
      this.viewDirToWorld(this.tmpV3, this.tmpV2);
      const reach = Math.abs(rig.model.muzzleLocalPosition.z) + 0.34;
      const hit = physics.raycast(this.tmpV, this.tmpV2, { maxDistance: reach });
      if (hit) blocked = 1 - smoothstep(reach * 0.52, reach, hit.distance);
      blocked *= 1 - saturate(this.adsBlend / 0.7);
    }
    this.lowReady = damp(this.lowReady, blocked, 9, dt);
  }

  // -------------------------------------------------------------------------
  // Pose composition
  // -------------------------------------------------------------------------

  private compose(delta?: PoseDelta): void {
    const rig = this.rig;
    if (!rig) return;

    const t = this.adsBlend;
    this.posePosition.lerpVectors(this.hipPosition, this.adsPosition, t);
    this.poseQuaternion.copy(this.hipQuaternion).slerp(this.adsQuaternion, saturate(t));

    if (delta) {
      // Additive translation is applied in the weapon's frame, so a rearward
      // kick always travels down the bore whatever the weapon is doing.
      this.posePosition.add(this.tmpV.copy(delta.position).applyQuaternion(this.poseQuaternion));
      this.tmpEuler.set(delta.rotation.x, delta.rotation.y, delta.rotation.z, 'XYZ');
      this.poseQuaternion.multiply(this.tmpQ.setFromEuler(this.tmpEuler));
    }

    rig.model.root.position.copy(this.posePosition);
    rig.model.root.quaternion.copy(this.poseQuaternion);
    rig.model.root.updateMatrixWorld(true);
  }

  // -------------------------------------------------------------------------
  // Hands
  // -------------------------------------------------------------------------

  private poseHands(): void {
    const rig = this.rig;
    if (!rig) return;
    const model = rig.model;
    const hands = rig.hands;
    const ads = this.adsBlend;

    this.resolveHand(model, this.clipOut.right, model.anchors.grip, this.tmpV, this.tmpQ);
    hands.right.setGoal(this.tmpV, this.tmpQ);
    hands.right.solve(this.tmpV2.copy(hands.rightElbow).addScaledVector(ELBOW_ADS_R, ads));

    if (model.supportStyle === 'none') {
      hands.left.setVisible(false);
      return;
    }
    hands.left.setVisible(!this.clipOut.left.hidden);
    this.resolveHand(model, this.clipOut.left, model.anchors.support, this.tmpV, this.tmpQ);
    hands.left.setGoal(this.tmpV, this.tmpQ);
    hands.left.solve(this.tmpV2.copy(hands.leftElbow).addScaledVector(ELBOW_ADS_L, ads));
  }

  /**
   * Resolves a hand goal into view space. A clip override moves the hand off its
   * natural anchor onto another one, blended by weight, so a hand never pops
   * between the handguard and the magwell.
   */
  private resolveHand(
    model: WeaponModel,
    pose: HandPose,
    natural: THREE.Object3D,
    outPosition: THREE.Vector3,
    outQuaternion: THREE.Quaternion,
  ): void {
    model.localTransform(natural, this.handV, outQuaternion);
    outPosition.copy(this.handV);

    if (pose.weight > 1e-3) {
      const target = this.anchorFor(model, pose.anchor, natural);
      model.localTransform(target, this.handV, this.handQ);
      // Offsets read in the target anchor's frame, so "down" means down the
      // magwell even when the weapon is canted right over.
      this.handV.add(this.handV2.copy(pose.offset).applyQuaternion(this.handQ));
      outPosition.lerp(this.handV, pose.weight);
      outQuaternion.slerp(this.handQ, pose.weight);
      if (pose.rot.lengthSq() > 1e-8) {
        this.handEuler.set(
          pose.rot.x * pose.weight,
          pose.rot.y * pose.weight,
          pose.rot.z * pose.weight,
          'XYZ',
        );
        outQuaternion.multiply(this.handQ.setFromEuler(this.handEuler));
      }
    }

    outPosition.applyQuaternion(this.poseQuaternion).add(this.posePosition);
    outQuaternion.premultiply(this.poseQuaternion);
  }

  private anchorFor(model: WeaponModel, anchor: HandAnchor, natural: THREE.Object3D): THREE.Object3D {
    switch (anchor) {
      case 'grip':
        return model.anchors.grip;
      case 'support':
        return model.anchors.support;
      case 'magWell':
        return model.anchors.magWell;
      case 'charge':
        return this.derivedAnchor(model, 'charge');
      case 'pouch':
        return this.derivedAnchor(model, 'pouch');
      default:
        return natural;
    }
  }

  /**
   * Anchors that are not part of the model: the charging-handle grab point and
   * the magazine pouch on the plate carrier. Both are parented to the weapon so
   * `localTransform` finds them, and cached because they never move.
   */
  private derivedAnchor(model: WeaponModel, kind: 'charge' | 'pouch'): THREE.Object3D {
    const key = `${model.id}:${kind}`;
    const cached = this.handAnchors.get(key);
    if (cached) return cached;
    const o = new THREE.Object3D();
    o.name = `${kind}Anchor`;
    if (kind === 'charge') {
      o.position.copy(this.rig?.chargePoint ?? new THREE.Vector3());
      // Fist grips across the receiver: grip axis along the bore.
      o.rotation.set(Math.PI / 2, 0, 0);
    } else {
      o.position.copy(model.anchors.magWell.position);
      o.position.x -= 0.045;
      o.position.y -= 0.1;
      o.position.z += 0.19;
      o.rotation.set(0.32, 0, -0.22);
    }
    model.root.add(o);
    this.handAnchors.set(key, o);
    return o;
  }

  private updateProps(): void {
    const rig = this.rig;
    if (!rig) return;
    const want = this.clipOut.prop;
    rig.props.mag.visible = want === 'mag';
    rig.props.shell.visible = want === 'shell';
    rig.props.grenade.visible = want === 'grenade';
    if (rig.props.rocket) rig.props.rocket.visible = want === 'rocket';
  }

  // -------------------------------------------------------------------------
  // Reticle
  // -------------------------------------------------------------------------

  /**
   * A collimated reticle is re-projected from the eye along the sight axis every
   * frame. That is what makes it parallax-free: the apparent direction of the dot
   * is the sight axis and nothing else, so it stays on target as the head moves
   * and drifts with the weapon exactly as a real red dot does. Magnified optics
   * keep their reticle in the tube, where a little parallax is correct, and get
   * scope shadow instead.
   */
  private updateReticle(): void {
    const rig = this.rig;
    const spec = rig?.model.reticle;
    if (!rig || !spec) return;

    rig.model.localTransform(rig.model.anchors.sight, this.tmpV, this.tmpQ);
    this.tmpV.applyQuaternion(this.poseQuaternion).add(this.posePosition);
    this.tmpQ.premultiply(this.poseQuaternion);
    const axis = this.tmpV2.copy(VIEW_FORWARD).applyQuaternion(this.tmpQ);

    // Lateral offset of the eye (the origin) from the optical axis.
    this.tmpV3.copy(this.tmpV).negate();
    const along = this.tmpV3.dot(axis);
    this.tmpV3.addScaledVector(axis, -along);
    const angle = Math.atan2(this.tmpV3.length(), Math.max(0.03, -along));
    const inBox = 1 - smoothstep(spec.eyebox * 0.55, spec.eyebox * 1.4, angle);
    const lit = smoothstep(0.06, 0.46, this.adsBlend);

    if (spec.parallaxFree) {
      if (spec.object.parent !== this.root) this.root.add(spec.object);
      spec.object.position.copy(axis).multiplyScalar(spec.glassDistance);
      spec.object.quaternion.copy(this.tmpQ);
      spec.object.scale.setScalar(spec.baseScale);
      spec.material.opacity = 0.95 * inBox * lit;
      spec.object.visible = spec.material.opacity > 0.01;
    } else {
      // A scope's reticle is at a focal plane, so it marks the sight axis and
      // nothing else: a shooter's eye can wander behind the glass and the point
      // of aim does not move. Left as authored geometry it instead marks the
      // tube, and any lateral gap between the eye and the optical axis throws it
      // off the bore by that gap over the eye relief. That gap is never zero —
      // ADS-damped breathing alone leaves a few tenths of a millimetre — and a
      // scope multiplies the error by its magnification, which put the sniper's
      // crosshair 2.6% of the screen high. So the plane is slid within itself
      // each frame onto the ray the eye actually looks along, which is the same
      // correction real glass makes and leaves its depth in the tube untouched.
      this.reticleToAxis(spec, axis);

      // It may only appear once the disc behind it is showing a sight picture and
      // the annulus is there to hide its square edge.
      spec.material.opacity = clamp((this.adsBlend - 0.5) / 0.32, 0, 1);
      spec.object.visible = spec.material.opacity > 0.01;
      if (spec.shadow) {
        // The aperture closes as the eye leaves the axis, which is what scope
        // shadow is: shrink the annulus and its hole shrinks with it. At rest it
        // is exactly the aperture, so the sight picture is framed edge to edge.
        const open = 1 - 0.62 * (1 - inBox) - 0.2 * (1 - lit);
        spec.shadow.scale.setScalar(clamp(open, 0.3, 1));
        const opacity =
          (this.def?.adsZoom ?? 1) >= FULL_BLACKOUT_ZOOM ? clamp((this.adsBlend - 0.52) / 0.3, 0, 1) : 0;
        spec.shadow.material.opacity = opacity;
        spec.shadow.visible = opacity > 0.01;
      }
      this.updateScope(spec);
    }
  }

  /**
   * Slides a tube-mounted reticle sideways within its own plane until the eye
   * sees it on the sight axis.
   *
   * The plane keeps its distance along the axis — it stays exactly where the
   * glass is, so it goes on being masked by the tube and never fights the ocular
   * disc for depth. Only the component across the axis is rewritten.
   */
  private reticleToAxis(spec: NonNullable<WeaponModel['reticle']>, axis: THREE.Vector3): void {
    const parent = spec.object.parent;
    if (!parent) return;
    // `authored` is the plane's rest position, kept because the correction has to
    // be measured from it: reading back the corrected position would integrate.
    const authored = spec.authoredPosition;
    parent.updateWorldMatrix(true, false);
    this.tmpV4.copy(authored).applyMatrix4(parent.matrixWorld);
    // Rebuild the point at the same depth along the axis but with no offset
    // across it: the eye is the view origin, so that is simply axis * depth.
    const depth = this.tmpV4.dot(axis);
    this.tmpV4.copy(axis).multiplyScalar(depth);
    parent.worldToLocal(this.tmpV4);
    spec.object.position.copy(this.tmpV4);
  }

  /**
   * Feeds the scope its sight picture.
   *
   * The aperture's on-screen size is measured rather than assumed — the disc's
   * real view-space position after the whole layer stack has run, projected
   * through the current viewmodel FOV. Recoil, sway and a half-finished ADS
   * transition therefore all move the sight picture's framing honestly, and the
   * magnification stays correct while they do.
   */
  private updateScope(spec: NonNullable<WeaponModel['reticle']>): void {
    const aperture = spec.aperture;
    if (!aperture) return;
    this.anchorView(aperture.mesh, this.tmpV);
    const distance = Math.max(0.02, -this.tmpV.z);
    const halfFov = Math.tan(THREE.MathUtils.degToRad(this.viewFov) * 0.5);
    this.scope.update(this.ctx, {
      blend: this.adsBlend,
      zoom: this.def?.adsZoom ?? 1,
      apertureNdc: aperture.radius / (distance * halfFov),
    });
  }

  // -------------------------------------------------------------------------
  // Idle
  // -------------------------------------------------------------------------

  /** Seconds the player has done nothing; drives the idle inspect flourish. */
  tickIdle(dt: number, busy: boolean): number {
    if (busy) {
      this.idleTime = 0;
      return 0;
    }
    this.idleTime += dt;
    return this.idleTime;
  }

  clearIdle(): void {
    this.idleTime = 0;
  }

  /** Triangles in the weapon plus the arms currently on screen. */
  currentTriangles(): number {
    if (!this.rig) return 0;
    let total = this.rig.model.triangles;
    this.rig.hands.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const index = mesh.geometry.getIndex();
      const count = index ? index.count : (mesh.geometry.getAttribute('position')?.count ?? 0);
      total += Math.floor(count / 3);
    });
    return total;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  dispose(): void {
    for (const rig of this.rigs.values()) {
      rig.hands.dispose();
      rig.model.dispose();
    }
    this.rigs.clear();
    this.handAnchors.clear();
    this.scope.dispose();
    this.lighting.dispose();
    this.root.removeFromParent();
    this.ctx.viewCamera.fov = BASE_VIEW_FOV;
    this.ctx.viewCamera.updateProjectionMatrix();
  }
}
