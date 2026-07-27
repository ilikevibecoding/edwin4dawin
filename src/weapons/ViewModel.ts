import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { WeaponId } from '../core/Contracts';
import { DEG } from '../core/MathX';
import { GunKit, type WeaponModel } from './models/GunKit';
import { buildHand, type Hand } from './models/Hands';
import { buildAssaultRifle } from './models/AssaultRifle';
import { buildSmg } from './models/Smg';
import { buildSniper } from './models/Sniper';
import { buildShotgun } from './models/Shotgun';
import { buildPistol } from './models/Pistol';
import { buildLmg } from './models/Lmg';

interface LightingLike {
  sunDirection: THREE.Vector3;
  sky: { preset: { sunColor: THREE.Color } };
}

const BUILDERS: Record<WeaponId, (k: GunKit) => WeaponModel> = {
  ar_wolverine: buildAssaultRifle,
  smg_viper: buildSmg,
  sniper_longbow: buildSniper,
  shotgun_breacher: buildShotgun,
  pistol_sidearm: buildPistol,
  lmg_bulwark: buildLmg,
};

/** Per-weapon hand placement onto the grip anchors (canonical hand frame). */
interface HandPose {
  pos: [number, number, number];
  rot: [number, number, number];
}
const RIGHT_HAND: Partial<Record<WeaponId, HandPose>> = {};
const LEFT_HAND: Partial<Record<WeaponId, HandPose>> = {};

/**
 * Owns the viewmodel scene graph: the camera-parented rig, its own lights, the
 * six weapon models and the hands. Exposes the transform groups the animator
 * drives and computes the world-space muzzle for the VFX system.
 *
 * Rig hierarchy (all local to the viewmodel camera):
 *   viewCamera → sway → pose → recoil → holder → { weapon model, hands }
 */
export class ViewModel {
  readonly kit: GunKit;

  readonly sway = new THREE.Group();
  readonly pose = new THREE.Group();
  readonly recoil = new THREE.Group();
  readonly holder = new THREE.Group();

  /** Anchors the support / firing hands hang from (animator can nudge them). */
  readonly leftHandAnchor = new THREE.Group();
  readonly rightHandAnchor = new THREE.Group();

  current!: WeaponModel;
  currentId: WeaponId;
  /** Sight point position expressed in `holder` space (for ADS centring). */
  readonly sightLocal = new THREE.Vector3();

  private models = new Map<WeaponId, WeaponModel>();
  private leftHand: Hand;
  private rightHand: Hand;
  private key!: THREE.DirectionalLight;
  private fill!: THREE.HemisphereLight;
  private rim!: THREE.DirectionalLight;

  private _tmp = new THREE.Vector3();
  private _q0 = new THREE.Quaternion();
  private _q1 = new THREE.Quaternion();
  private _q2 = new THREE.Quaternion();

  constructor(
    private ctx: EngineContext,
    defaultId: WeaponId
  ) {
    this.kit = new GunKit(ctx.has('materials') ? ctx.get('materials') : null);
    this.currentId = defaultId;

    // Build rig hierarchy.
    this.sway.add(this.pose);
    this.pose.add(this.recoil);
    this.recoil.add(this.holder);
    this.holder.add(this.leftHandAnchor);
    this.holder.add(this.rightHandAnchor);

    // Parent to the viewmodel camera and put the camera in the view scene so it
    // (and its children) are traversed and rendered.
    ctx.viewCamera.add(this.sway);
    if (!ctx.viewScene.children.includes(ctx.viewCamera)) {
      ctx.viewScene.add(ctx.viewCamera);
    }

    // Viewmodel FOV — tighter than the world so the gun reads at true scale.
    ctx.viewCamera.fov = 58;
    ctx.viewCamera.updateProjectionMatrix();

    this.buildLights();

    // Hands (persistent; re-anchored per weapon).
    this.rightHand = buildHand(this.kit, 1);
    this.leftHand = buildHand(this.kit, -1);
    this.rightHandAnchor.add(this.rightHand.group);
    this.leftHandAnchor.add(this.leftHand.group);

    this.setWeapon(defaultId);
  }

  private buildLights() {
    const vs = this.ctx.viewScene;
    const lighting = this.ctx.has('lighting') ? this.ctx.get<LightingLike>('lighting') : null;
    const sunDir = lighting?.sunDirection?.clone() ?? new THREE.Vector3(0.4, 0.9, 0.3);
    const sunColor = lighting?.sky?.preset?.sunColor?.clone() ?? new THREE.Color(1, 0.95, 0.88);

    this.key = new THREE.DirectionalLight(sunColor, 1.7);
    this.key.castShadow = false;
    this.key.position.copy(sunDir).multiplyScalar(3);
    this.key.target.position.set(0, 0, 0);
    vs.add(this.key);
    vs.add(this.key.target);

    this.fill = new THREE.HemisphereLight(0x9fb4d0, 0x30281f, 0.6);
    vs.add(this.fill);

    this.rim = new THREE.DirectionalLight(0xbfd0ff, 0.9);
    this.rim.castShadow = false;
    this.rim.position.set(-sunDir.x * 3, sunDir.y * 1.2, sunDir.z * 3 - 2);
    this.rim.target.position.set(0, 0, 0);
    vs.add(this.rim);
    vs.add(this.rim.target);
  }

  /** Refresh env map + sun direction; call each frame (env can be re-baked). */
  update() {
    const vs = this.ctx.viewScene;
    if (vs.environment !== this.ctx.scene.environment) {
      vs.environment = this.ctx.scene.environment;
      vs.environmentIntensity = 1.0;
    }
    const lighting = this.ctx.has('lighting') ? this.ctx.get<LightingLike>('lighting') : null;
    if (lighting?.sunDirection) {
      this.key.position.copy(lighting.sunDirection).multiplyScalar(3);
      this.key.color.copy(lighting.sky.preset.sunColor);
    }
  }

  setWeapon(id: WeaponId) {
    if (this.current) this.holder.remove(this.current.group);
    let model = this.models.get(id);
    if (!model) {
      model = BUILDERS[id](this.kit);
      this.models.set(id, model);
    }
    this.current = model;
    this.currentId = id;
    this.holder.add(model.group);

    // Sight point in holder space.
    model.group.updateMatrixWorld(true);
    this._tmp.setFromMatrixPosition(model.sightPoint.matrixWorld);
    this.holder.worldToLocal(this._tmp);
    this.sightLocal.copy(this._tmp);

    this.placeHands(model);
  }

  private placeHands(model: WeaponModel) {
    // Firing hand → rear grip (wraps the pistol grip, index on the trigger).
    const rp: HandPose = RIGHT_HAND[model.id as WeaponId] ?? {
      pos: [0.004, 0.024, 0.01],
      rot: [1.28, -0.1, 0.02],
    };
    model.gripRear.getWorldPosition(this._tmp);
    this.holder.worldToLocal(this._tmp);
    this.rightHandAnchor.position.copy(this._tmp).add(new THREE.Vector3(...rp.pos));
    this.rightHand.group.rotation.set(...rp.rot);
    // Curl fingers tightly around the grip.
    for (const f of this.rightHand.fingers) f.rotation.x = 0.95;
    this.rightHand.triggerFinger.rotation.x = 0.4;

    // Support hand → front grip (wraps the handguard from below/side).
    const lp: HandPose = LEFT_HAND[model.id as WeaponId] ?? {
      pos: [0.006, 0.03, 0.006],
      rot: [0.35, 0.85, 0.15],
    };
    model.gripFront.getWorldPosition(this._tmp);
    this.holder.worldToLocal(this._tmp);
    this.leftHandAnchor.position.copy(this._tmp).add(new THREE.Vector3(...lp.pos));
    this.leftHand.group.rotation.set(...lp.rot);
    for (const f of this.leftHand.fingers) f.rotation.x = 1.0;
  }

  setVisible(v: boolean) {
    this.sway.visible = v;
  }

  get leftHandGroup() {
    return this.leftHand.group;
  }
  get triggerFinger() {
    return this.rightHand.triggerFinger;
  }

  /**
   * World-space muzzle transform, compensated for the viewmodel camera's FOV so
   * the flash renders where the barrel *appears* on screen under the world
   * camera.
   */
  getMuzzleWorld(outPos: THREE.Vector3, outDir: THREE.Vector3) {
    const vc = this.ctx.viewCamera;
    const wc = this.ctx.camera;
    const muzzle = this.current.muzzle;
    muzzle.updateWorldMatrix(true, false);

    // Muzzle position → viewmodel-camera local space.
    muzzle.getWorldPosition(this._tmp);
    vc.worldToLocal(this._tmp);

    // Rescale x/y by the tan-FOV ratio so the same on-screen angle maps under
    // the wider world camera, keeping depth (z) the same.
    const kw = Math.tan((wc.fov * 0.5) * DEG);
    const kv = Math.tan((vc.fov * 0.5) * DEG);
    const ratio = kw > 1e-5 ? kv / kw : 1;
    this._tmp.x *= ratio;
    this._tmp.y *= ratio;
    wc.localToWorld(this._tmp);
    outPos.copy(this._tmp);

    // Direction: muzzle orientation rebased from the view camera onto the world
    // camera.
    muzzle.getWorldQuaternion(this._q0);
    vc.getWorldQuaternion(this._q1).invert();
    this._q2.copy(this._q1).multiply(this._q0); // muzzle relative to view cam
    wc.getWorldQuaternion(this._q1);
    this._q2.premultiply(this._q1);
    outDir.set(0, 0, -1).applyQuaternion(this._q2).normalize();
  }

  dispose() {
    this.ctx.viewCamera.remove(this.sway);
    const vs = this.ctx.viewScene;
    vs.remove(this.key, this.key.target, this.fill, this.rim, this.rim.target);
    this.kit.dispose();
  }
}
