// First-person viewmodel rig (Fable 4 art pass): weapon models attached to the camera with
// procedural animation (draw/holster/reload/pump/throw/melee/sway/bob/recoil/landing) plus
// first-person ARMS — sleeved forearms and gloved hands that grip each weapon's actual grip
// markers, with the support hand following the magazine and pump during animations.
import * as THREE from 'three';
import { buildWeaponModel, weaponFamily, SIGHT_Y } from './models.js';
import { registerAsset } from '../core/assets.js';
import { setFireFamily } from '../vfx/firecontext.js';
import { settings } from '../core/settings.js';

const ADS_Z = -0.24;
const VM_SCALE = 0.55;

// per-weapon hip placement: lower-right quadrant, receiver clear of screen center,
// muzzle ~55–65% screen height (wp-013b presence pass — was too large/close)
const PLACEMENT = {
  'karst-p9':     { hip: [0.175, -0.175, -0.33], leftHand: 'support' },
  'boreal-k5':    { hip: [0.17, -0.175, -0.38], leftHand: 'support' },
  'halcyon-hc4':  { hip: [0.17, -0.18, -0.41], leftHand: 'support' },
  'vanta-s12':    { hip: [0.17, -0.175, -0.39], leftHand: 'support' },
  'meridian-lr8': { hip: [0.16, -0.175, -0.43], leftHand: 'support' },
  'cq-blade':     { hip: [0.195, -0.19, -0.31], leftHand: 'hidden' },
  'fb-3':         { hip: [0.185, -0.18, -0.31], leftHand: 'hidden' },
  'sg-2':         { hip: [0.185, -0.18, -0.31], leftHand: 'hidden' },
};

// ---------------------------------------------------------------------------
// FP arm materials (operator: graphite sleeve, amber strap accent, dark gloves)
let _am = null;
function armMats() {
  if (_am) return _am;
  _am = {
    sleeve: new THREE.MeshStandardMaterial({ color: 0x4d5761, roughness: 0.94 }),
    cuff: new THREE.MeshStandardMaterial({ color: 0x3b444c, roughness: 0.9 }),
    strap: new THREE.MeshStandardMaterial({ color: 0xc59a55, roughness: 0.8 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x33363a, roughness: 0.88 }),
    knuckle: new THREE.MeshStandardMaterial({ color: 0x474c52, roughness: 0.7 }),
  };
  return _am;
}

// one gloved hand + tapered sleeve forearm; posed by (hand pos, elbow pos)
function makeFpArm(side) {
  const m = armMats();
  const group = new THREE.Group();
  const hand = new THREE.Group();
  group.add(hand);
  const mk = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    hand.add(mesh);
    return mesh;
  };
  // gloved hand: palm, curled mitten fingers with knuckle plate, thumb
  mk(new THREE.BoxGeometry(0.055, 0.09, 0.075), m.glove, 0, -0.01, 0.005);
  mk(new THREE.BoxGeometry(0.052, 0.055, 0.062), m.glove, 0, -0.07, -0.02, -0.5);
  mk(new THREE.BoxGeometry(0.05, 0.02, 0.05), m.knuckle, 0, -0.045, -0.035, -0.3);
  mk(new THREE.BoxGeometry(0.026, 0.055, 0.032), m.glove, side * -0.035, -0.03, -0.028, -0.6, 0, side * 0.25);
  mk(new THREE.CylinderGeometry(0.037, 0.034, 0.03, 10), m.glove, 0, 0.045, 0.004);
  // forearm sleeve (posed between wrist and elbow each frame)
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.042, 1, 12), m.sleeve);
  sleeve.castShadow = false;
  sleeve.frustumCulled = false;
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.043, 0.05, 12), m.cuff);
  cuff.frustumCulled = false;
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.022, 12), m.strap);
  strap.frustumCulled = false;
  group.add(sleeve, cuff, strap);

  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  return {
    group, hand,
    pose(handPos, elbowPos, handRot) {
      hand.position.copy(handPos);
      if (handRot) hand.rotation.copy(handRot);
      dir.subVectors(elbowPos, handPos);
      const len = Math.max(0.12, dir.length());
      dir.normalize();
      mid.copy(handPos).addScaledVector(dir, 0.05 + len * 0.5);
      sleeve.position.copy(mid);
      sleeve.scale.set(1, len, 1);
      sleeve.quaternion.setFromUnitVectors(up, dir);
      cuff.position.copy(handPos).addScaledVector(dir, 0.075);
      cuff.quaternion.copy(sleeve.quaternion);
      strap.position.copy(handPos).addScaledVector(dir, 0.055 + len * 0.55);
      strap.quaternion.copy(sleeve.quaternion);
    },
    setVisible(v) { group.visible = v; },
  };
}

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
    this.rollZ = 0;
    this.adsBlend = 0;
    this.lastLook = { x: 0, y: 0 };
    this.muzzleWorld = new THREE.Vector3();
    this.buildArms();
    this._hp = new THREE.Vector3(); this._ep = new THREE.Vector3();
    this._hr = new THREE.Euler();
  }

  buildArms() {
    // arms live inside the active weapon group so they inherit every weapon motion
    this.armR = makeFpArm(1);
    this.armL = makeFpArm(-1);
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
    const place = PLACEMENT[w.def.id] || PLACEMENT['halcyon-hc4'];
    if (this.currentId !== w.def.id) {
      for (const [, m] of this.models) if (m.group.parent) this.root.remove(m.group);
      this.root.add(parts.group);
      parts.group.add(this.armR.group, this.armL.group);
      this.currentId = w.def.id;
    }

    // sway from look input + roll from strafe velocity
    const sens = Math.max(0.0001, settings.get('sensitivity'));
    const lookX = input ? input.lookDX / (0.0022 * sens) : 0;
    const lookY = input ? input.lookDY / (0.0022 * sens) : 0;
    this.swayX = THREE.MathUtils.damp(this.swayX, THREE.MathUtils.clamp(lookX * 0.00035, -0.016, 0.016), 10, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, THREE.MathUtils.clamp(lookY * 0.00035, -0.012, 0.012), 10, dt);
    const yaw = this.player.yaw;
    const latVel = Math.cos(yaw) * this.player.vel.x - Math.sin(yaw) * this.player.vel.z;
    this.rollZ = THREE.MathUtils.damp(this.rollZ, THREE.MathUtils.clamp(-latVel * 0.008, -0.03, 0.03), 8, dt);

    // ADS blend
    const wantAds = arsenal.isAiming ? 1 : 0;
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, wantAds, 12, dt);

    const g = parts.group;
    const bobAmp = this.player.bobAmp * (1 - this.adsBlend * 0.85);
    const bobY = Math.abs(Math.sin(this.player.bobPhase)) * 0.0075 * bobAmp;
    const bobX = Math.sin(this.player.bobPhase * 0.5) * 0.0055 * bobAmp;

    // base pose
    const adsPos = new THREE.Vector3(0, -SIGHT_Y * VM_SCALE, ADS_Z);
    const pos = new THREE.Vector3().fromArray(place.hip).lerp(adsPos, this.adsBlend);
    pos.x += this.swayX + bobX;
    pos.y += this.swayY + bobY - this.player.landDip * 0.34;
    let rotX = this.swayY * 1.5 + this.player.landDip * 0.35, rotY = this.swayX * 1.3, rotZ = this.rollZ * (1 - this.adsBlend);

    // recoil punch
    pos.z += arsenal.recoilPitch * 0.55;
    rotX += arsenal.recoilPitch * 1.8;

    // state animations (procedural, normalized t)
    const st = arsenal.state;
    const t = arsenal.stateDur > 0 ? THREE.MathUtils.clamp(arsenal.stateT / arsenal.stateDur, 0, 1) : 1;
    let leftMode = place.leftHand; // 'support' | 'hidden' | dynamic below
    let magDrop = 0;
    if (st === 'draw') {
      // rising holster arc with a settling overshoot
      const k = 1 - t;
      pos.y -= 0.26 * k * k;
      pos.x += 0.1 * k * k;
      rotX -= 0.85 * k * k;
      rotZ += 0.45 * k * k;
      rotY -= 0.2 * k * k;
    } else if (st === 'holster') {
      pos.y -= 0.3 * t * t;
      pos.x += 0.08 * t * t;
      rotX -= 0.75 * t * t;
      rotZ += 0.3 * t * t;
    } else if (st === 'reload') {
      // bring the weapon up into the workspace and roll it so the magwell (and the
      // support hand chasing the mag) stays on-screen instead of dipping below frame
      const k = Math.sin(t * Math.PI);
      pos.y += 0.02 * k;
      pos.x -= 0.03 * k;
      rotZ += 0.48 * k;
      rotX += 0.1 * k;
      if (parts.mag) {
        // mag drops out and returns; support hand chases it
        const phase = t < 0.45 ? t / 0.45 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        magDrop = phase;
        parts.mag.position.y = (parts.mag.userData.baseY ?? (parts.mag.userData.baseY = parts.mag.position.y)) - phase * 0.14;
        leftMode = 'mag';
      }
    } else if (st === 'pump' && parts.pump) {
      const k = Math.sin(t * Math.PI);
      parts.pump.position.z = (parts.pump.userData.baseZ ?? (parts.pump.userData.baseZ = parts.pump.position.z)) + k * 0.09;
      rotX += 0.07 * k;
      rotZ += 0.03 * k;
      leftMode = 'pump';
    } else if (st === 'throw') {
      if (t < 0.4) { // wind-up: cock back over the shoulder
        const k = t / 0.4;
        rotX += 0.85 * k;
        pos.z += 0.16 * k;
        pos.x += 0.06 * k;
        pos.y += 0.14 * k;
      } else { // release: whip forward and drop away
        const k = (t - 0.4) / 0.6;
        rotX += 0.85 - 2.0 * k;
        pos.z += 0.16 - 0.55 * k;
        pos.x += 0.06 - 0.1 * k;
        pos.y += 0.14 - 0.2 * k;
      }
    } else if (st === 'melee') {
      // diagonal slash: pull up-right then sweep across
      const k = Math.sin(t * Math.PI);
      const wind = t < 0.3 ? t / 0.3 : 1;
      pos.z -= 0.28 * k;
      pos.x += 0.1 * wind - 0.28 * k;
      pos.y += 0.06 * wind - 0.1 * k;
      rotY += 0.7 * k;
      rotZ -= 0.5 * k;
      rotX += 0.15 * k;
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

    // ---------------- pose the arms on the weapon (weapon-local space) ----------------
    const gm = parts.gripMain;
    // right hand on the main grip
    this._hp.copy(gm.position).add({ x: 0, y: -0.015, z: 0.012 });
    this._ep.copy(gm.position).add({ x: 0.14, y: -0.42, z: 0.42 });
    this._hr.set(-0.25 + (gm.rotation.x || 0), 0, 0);
    this.armR.pose(this._hp, this._ep, this._hr);
    // support hand: foregrip, or chasing the mag/pump during animations
    if (leftMode === 'hidden') {
      this.armL.setVisible(false);
    } else {
      this.armL.setVisible(true);
      if (leftMode === 'mag' && parts.mag) {
        this._hp.copy(parts.mag.position).add({ x: -0.015, y: -0.1 - magDrop * 0.02, z: 0 });
        this._hr.set(-0.9, 0.3, 0.35);
      } else if (leftMode === 'pump' && parts.pump) {
        this._hp.copy(parts.pump.position).add({ x: 0, y: -0.045, z: 0 });
        this._hr.set(-0.5, 0, 0);
      } else if (parts.gripSupport) {
        this._hp.copy(parts.gripSupport.position).add({ x: -0.008, y: -0.02, z: 0 });
        this._hr.set(-0.45 + (parts.gripSupport.rotation.x || 0), -0.12, 0.25);
      } else {
        // pistols: support hand cups the firing hand
        this._hp.copy(gm.position).add({ x: -0.035, y: -0.055, z: 0.02 });
        this._hr.set(-0.3, -0.25, 0.4);
      }
      this._ep.copy(this._hp).add({ x: -0.3, y: -0.38, z: 0.42 });
      this.armL.pose(this._hp, this._ep, this._hr);
    }
    // hide the trigger arm while a thrown device flies away? keep it — hand holds the device
    this.armR.setVisible(true);

    parts.muzzle.getWorldPosition(this.muzzleWorld);
  }

  getMuzzleWorld() {
    // mission fetches the muzzle right before spawning fire VFX — pass the weapon family
    // along so the VFX system can style the flash/casing without an API change
    const w = this.player.arsenal?.current;
    if (w) setFireFamily(weaponFamily(w.def.id));
    return this.muzzleWorld;
  }

  get scopeBlend() {
    const w = this.player.arsenal.current;
    return w && w.def.scope ? this.adsBlend : 0;
  }
}

registerAsset('CHAR-FP-ARMS', {
  name: 'First-person arms (sleeved forearms + gloved hands)', category: 'character',
  agent: 'Fable 4', files: ['src/weapons/viewmodel.js'],
});
