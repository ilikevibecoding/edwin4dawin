// First-person viewmodel rig: weapon models attached to the camera with procedural animation
// (draw/holster/reload/pump/throw/melee/sway/bob/recoil/landing). Arms added by Fable 4 pass.
import * as THREE from 'three';
import { buildWeaponModel, SIGHT_Y } from './models.js';
import { settings } from '../core/settings.js';

const HIP = new THREE.Vector3(0.15, -0.15, -0.3);
const ADS_Z = -0.24;
const VM_SCALE = 0.62;

export class ViewModel {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.root = new THREE.Group();
    this.root.renderOrder = 500;
    camera.add(this.root);
    this.models = new Map();
    this.currentId = null;
    this.swayX = 0; this.swayY = 0;
    this.adsBlend = 0;
    this.lastLook = { x: 0, y: 0 };
    this.muzzleWorld = new THREE.Vector3();
    this.buildArms();
  }

  buildArms() {
    // Placeholder sleeves replaced by Fable 4 character pass (registered as in-progress asset).
    this.arms = new THREE.Group();
    this.root.add(this.arms);
  }

  _modelFor(id) {
    let m = this.models.get(id);
    if (!m) {
      m = buildWeaponModel(id);
      m.group.scale.setScalar(VM_SCALE);
      m.group.traverse((o) => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
      this.models.set(id, m);
    }
    return m;
  }

  update(dt, input) {
    const arsenal = this.player.arsenal;
    const w = arsenal.current;
    if (!w) return;
    const parts = this._modelFor(w.def.id);
    if (this.currentId !== w.def.id) {
      for (const [, m] of this.models) if (m.group.parent) this.root.remove(m.group);
      this.root.add(parts.group);
      this.currentId = w.def.id;
    }

    // sway from look input
    const sens = Math.max(0.0001, settings.get('sensitivity'));
    const lookX = input ? input.lookDX / (0.0022 * sens) : 0;
    const lookY = input ? input.lookDY / (0.0022 * sens) : 0;
    this.swayX = THREE.MathUtils.damp(this.swayX, THREE.MathUtils.clamp(lookX * 0.0004, -0.02, 0.02), 10, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, THREE.MathUtils.clamp(lookY * 0.0004, -0.015, 0.015), 10, dt);

    // ADS blend
    const wantAds = arsenal.isAiming ? 1 : 0;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, wantAds, 12, dt);

    const g = parts.group;
    const bobAmp = this.player.bobAmp * (1 - this.adsBlend * 0.85);
    const bobY = Math.abs(Math.sin(this.player.bobPhase)) * 0.008 * bobAmp;
    const bobX = Math.sin(this.player.bobPhase * 0.5) * 0.006 * bobAmp;

    // base pose
    const adsPos = new THREE.Vector3(0, -SIGHT_Y * VM_SCALE, ADS_Z);
    const pos = HIP.clone().lerp(adsPos, this.adsBlend);
    pos.x += this.swayX + bobX;
    pos.y += this.swayY + bobY - this.player.landDip * 0.4;
    let rotX = this.swayY * 1.6, rotY = this.swayX * 1.4, rotZ = 0;

    // recoil punch
    pos.z += arsenal.recoilPitch * 0.55;
    rotX += arsenal.recoilPitch * 1.8;

    // state animations (procedural, normalized t)
    const st = arsenal.state;
    const t = arsenal.stateDur > 0 ? THREE.MathUtils.clamp(arsenal.stateT / arsenal.stateDur, 0, 1) : 1;
    if (st === 'draw') {
      const k = 1 - t;
      pos.y -= 0.28 * k * k;
      rotX -= 0.9 * k * k;
      rotZ += 0.35 * k;
    } else if (st === 'holster') {
      pos.y -= 0.3 * t * t;
      rotX -= 0.8 * t * t;
    } else if (st === 'reload') {
      const k = Math.sin(t * Math.PI);
      pos.y -= 0.06 * k;
      rotZ += 0.38 * k;
      rotX += 0.22 * k;
      if (parts.mag) {
        // mag drops out and returns
        const phase = t < 0.45 ? t / 0.45 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        parts.mag.position.y = (parts.mag.userData.baseY ?? (parts.mag.userData.baseY = parts.mag.position.y)) - phase * 0.14;
      }
    } else if (st === 'pump' && parts.pump) {
      const k = Math.sin(t * Math.PI);
      parts.pump.position.z = (parts.pump.userData.baseZ ?? (parts.pump.userData.baseZ = parts.pump.position.z)) + k * 0.09;
      rotX += 0.06 * k;
    } else if (st === 'throw') {
      if (t < 0.4) { const k = t / 0.4; rotX += 0.5 * k; pos.z += 0.12 * k; pos.y += 0.1 * k; }
      else { const k = (t - 0.4) / 0.6; rotX += 0.5 - 1.3 * k; pos.z += 0.12 - 0.5 * k; pos.y += 0.1 - 0.12 * k; }
    } else if (st === 'melee') {
      const k = Math.sin(t * Math.PI);
      pos.z -= 0.3 * k;
      pos.x -= 0.14 * k;
      rotY += 0.5 * k;
      rotZ -= 0.3 * k;
    }
    // restore transient part offsets when idle
    if (st !== 'reload' && parts.mag && parts.mag.userData.baseY != null) parts.mag.position.y = parts.mag.userData.baseY;
    if (st !== 'pump' && parts.pump && parts.pump.userData.baseZ != null) parts.pump.position.z = parts.pump.userData.baseZ;

    // scope: sink the rifle out of view at full ADS (UI overlay takes over)
    if (w.def.scope) {
      const k = this.adsBlend;
      if (k > 0.85) g.visible = false;
      else { g.visible = true; pos.y -= k * 0.04; }
    } else if (!g.visible) {
      g.visible = true;
    }

    g.position.copy(pos);
    g.rotation.set(rotX, rotY, rotZ);

    parts.muzzle.getWorldPosition(this.muzzleWorld);
  }

  getMuzzleWorld() { return this.muzzleWorld; }
  get scopeBlend() {
    const w = this.player.arsenal.current;
    return w && w.def.scope ? this.adsBlend : 0;
  }
}
