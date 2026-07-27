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
  sun?: { intensity: number; color: THREE.Color };
  sky: {
    preset: {
      sunColor: THREE.Color;
      sunLightIntensity?: number;
      ambientColor?: THREE.Color;
      ambientIntensity?: number;
      groundColor?: THREE.Color;
    };
  };
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
  /** Resting anchor positions in holder space (base for the ADS tuck). */
  readonly leftAnchorBase = new THREE.Vector3();
  readonly rightAnchorBase = new THREE.Vector3();

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

    // Viewmodel FOV — a touch wider than before so the gun reads smaller and we
    // see more of its length in perspective (CoD-style hip framing).
    ctx.viewCamera.fov = 62;
    ctx.viewCamera.updateProjectionMatrix();

    this.buildLights();

    // Hands (persistent; re-anchored per weapon).
    this.rightHand = buildHand(this.kit, 1);
    this.leftHand = buildHand(this.kit, -1);
    this.rightHandAnchor.add(this.rightHand.group);
    this.leftHandAnchor.add(this.leftHand.group);
    bakeVertexAO(this.rightHand.group);
    bakeVertexAO(this.leftHand.group);

    this.setWeapon(defaultId);
  }

  private buildLights() {
    const vs = this.ctx.viewScene;

    this.key = new THREE.DirectionalLight(0xffffff, 2.0);
    this.key.castShadow = false;
    this.key.target.position.set(0, 0, 0);
    vs.add(this.key);
    vs.add(this.key.target);

    // Fill from the sky hemisphere — gives soft form shading, not flat wash.
    this.fill = new THREE.HemisphereLight(0x9fb4d0, 0x2a2620, 0.35);
    vs.add(this.fill);

    // Cool back-rim to separate the silhouette from the world.
    this.rim = new THREE.DirectionalLight(0xbcd0ff, 0.5);
    this.rim.castShadow = false;
    this.rim.target.position.set(0, 0, 0);
    vs.add(this.rim);
    vs.add(this.rim.target);

    this.syncLighting();
  }

  /**
   * Tie the viewmodel lights to the world so the weapon shares the scene's
   * exposure and sun direction (noon vs dusk) instead of being flat-lit.
   */
  private syncLighting() {
    const lighting = this.ctx.has('lighting') ? this.ctx.get<LightingLike>('lighting') : null;
    const sunDir = lighting?.sunDirection?.clone() ?? new THREE.Vector3(0.4, 0.9, 0.3);
    const preset = lighting?.sky?.preset;
    const sunColor = preset?.sunColor ?? new THREE.Color(1, 0.95, 0.88);
    // World sun intensity (fall back to the DirectionalLight, then a default).
    const sunI = lighting?.sun?.intensity ?? preset?.sunLightIntensity ?? 2.6;
    const ambI = preset?.ambientIntensity ?? 0.5;

    // Key light: same direction + colour as the world sun, exposure-matched with
    // a small hero boost, but floored so the weapon never goes fully black.
    this.key.position.copy(sunDir).multiplyScalar(3);
    this.key.color.copy(sunColor);
    this.key.intensity = Math.max(1.1, sunI * 1.15);

    // Sky/ground fill tracks ambient but keeps a readable floor for the hands.
    if (preset?.ambientColor) this.fill.color.copy(preset.ambientColor);
    if (preset?.groundColor) this.fill.groundColor.copy(preset.groundColor);
    this.fill.intensity = Math.max(0.3, ambI * 0.7);

    // Rim opposite the sun, from behind-left of the shooter.
    this.rim.position.set(-sunDir.x * 3, Math.abs(sunDir.y) * 1.5 + 0.5, -Math.abs(sunDir.z) * 3 - 2);
    this.rim.intensity = 0.35 + sunI * 0.12;
  }

  /** Refresh env map + sun direction; call each frame (env can be re-baked). */
  update() {
    const vs = this.ctx.viewScene;
    if (vs.environment !== this.ctx.scene.environment) {
      vs.environment = this.ctx.scene.environment;
      vs.environmentIntensity = 1.0;
    }
    this.syncLighting();
  }

  setWeapon(id: WeaponId) {
    if (this.current) this.holder.remove(this.current.group);
    let model = this.models.get(id);
    if (!model) {
      model = BUILDERS[id](this.kit);
      // Bake ambient occlusion into vertex colours once, before the model is
      // parented (so occlusion is computed in the model's own local space).
      bakeVertexAO(model.group);
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
    this.rightAnchorBase.copy(this.rightHandAnchor.position);
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
    this.leftAnchorBase.copy(this.leftHandAnchor.position);
    this.leftHand.group.rotation.set(...lp.rot);
    for (const f of this.leftHand.fingers) f.rotation.x = 1.0;
  }

  setVisible(v: boolean) {
    this.sway.visible = v;
  }

  get leftHandGroup() {
    return this.leftHand.group;
  }
  get rightHandGroup() {
    return this.rightHand.group;
  }
  get leftFingers() {
    return this.leftHand.fingers;
  }
  get leftForearm() {
    return this.leftHand.forearm;
  }
  get rightForearm() {
    return this.rightHand.forearm;
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

// Local hemisphere ray directions (z = surface normal) used for the AO bake.
const AO_DIRS: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0.7, 0, 0.72),
  new THREE.Vector3(-0.7, 0, 0.72),
  new THREE.Vector3(0, 0.7, 0.72),
  new THREE.Vector3(0, -0.7, 0.72),
  new THREE.Vector3(0.5, 0.5, 0.72),
  new THREE.Vector3(-0.5, -0.5, 0.72),
].map((v) => v.normalize());

/**
 * Bakes short-range ambient occlusion into per-vertex colours for every gun-part
 * mesh under `root`. Because the viewmodel pass can't cast real shadows, this is
 * what darkens crevices, the magwell and the area under the rail so the weapon
 * doesn't look pasted on. Runs once per model (init only).
 */
function bakeVertexAO(
  root: THREE.Object3D,
  dist = 0.05,
  minShade = 0.32
): void {
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.Material)?.userData?.gunPart) meshes.push(m);
  });
  if (meshes.length === 0) return;

  const spheres: THREE.Sphere[] = [];
  for (const m of meshes) {
    const g = m.geometry as THREE.BufferGeometry;
    if (!g.getAttribute('color')) {
      const n = g.getAttribute('position').count;
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.vertexColors = true;
    mat.needsUpdate = true;
    if (!g.boundingSphere) g.computeBoundingSphere();
    spheres.push(g.boundingSphere!.clone().applyMatrix4(m.matrixWorld));
  }

  const rc = new THREE.Raycaster();
  rc.near = 0;
  rc.far = dist;
  const wp = new THREE.Vector3();
  const wn = new THREE.Vector3();
  const t1 = new THREE.Vector3();
  const t2 = new THREE.Vector3();
  const ray = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const up = new THREE.Vector3();
  const candidates: THREE.Object3D[] = [];

  for (let mi = 0; mi < meshes.length; mi++) {
    const m = meshes[mi];
    const g = m.geometry as THREE.BufferGeometry;
    const pos = g.getAttribute('position');
    const nrm = g.getAttribute('normal');
    const col = g.getAttribute('color') as THREE.BufferAttribute;
    if (!nrm) continue;
    const nMat = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);

    for (let i = 0; i < pos.count; i++) {
      wp.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      wn.fromBufferAttribute(nrm, i).applyMatrix3(nMat).normalize();

      candidates.length = 0;
      for (let j = 0; j < meshes.length; j++) {
        if (spheres[j].distanceToPoint(wp) < dist) candidates.push(meshes[j]);
      }
      if (candidates.length === 0) {
        col.setXYZ(i, 1, 1, 1);
        continue;
      }

      // Tangent basis around the normal.
      up.set(0, 1, 0);
      if (Math.abs(wn.y) > 0.95) up.set(1, 0, 0);
      t1.crossVectors(up, wn).normalize();
      t2.crossVectors(wn, t1).normalize();

      let occ = 0;
      origin.copy(wp).addScaledVector(wn, 0.0015);
      for (const d of AO_DIRS) {
        ray.set(0, 0, 0).addScaledVector(t1, d.x).addScaledVector(t2, d.y).addScaledVector(wn, d.z).normalize();
        rc.set(origin, ray);
        rc.far = dist;
        const hits = rc.intersectObjects(candidates, false);
        let blocked = false;
        for (const h of hits) {
          if (h.distance <= 0.0016) continue; // ignore near self-hits
          blocked = true;
          break;
        }
        if (blocked) occ++;
      }
      const shade = 1 - (1 - minShade) * (occ / AO_DIRS.length);
      col.setXYZ(i, shade, shade, shade);
    }
    col.needsUpdate = true;
  }
}
