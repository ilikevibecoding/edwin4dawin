// Character rigs (Fable 4 domain). Graybox phase: articulated segmented humanoids with
// procedural locomotion/aim/death poses and correct 1.8m scale. The art pass upgrades meshes,
// materials, faces and adds layered gear while keeping this rig interface stable.
import * as THREE from 'three';
import { buildWeaponModel } from '../weapons/models.js';
import { registerAsset } from '../core/assets.js';

const OUTFITS = {
  // hostile variants (original faction: 'Kestrel' crew — dark utility + colored armbands)
  scout:   { jacket: 0x3d4348, pants: 0x2e3236, vest: 0x23272b, skin: 0xc9a186, accent: 0x8e3b34, helmet: false, cap: true },
  trooper: { jacket: 0x45484d, pants: 0x33373c, vest: 0x1f2326, skin: 0xb98a68, accent: 0x8e3b34, helmet: true },
  heavy:   { jacket: 0x3a3f45, pants: 0x2c3034, vest: 0x191d20, skin: 0xd9b295, accent: 0x8e3b34, helmet: true, heavy: true },
  // hostages (civilian office wear)
  civ0: { jacket: 0x7a8894, pants: 0x39404a, vest: null, skin: 0xc9a186, shirt: 0xd8dde2 },
  civ1: { jacket: 0x8a6f52, pants: 0x2f333b, vest: null, skin: 0x8a5f45, shirt: 0xbcc7cd },
};

function mat(color, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function seg(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export class CharacterRig {
  constructor(variant = 'trooper') {
    this.variant = variant;
    const o = OUTFITS[variant] || OUTFITS.trooper;
    this.group = new THREE.Group();
    this.moving = 0;
    this.phase = Math.random() * 6;
    this.pose = 'stand'; // stand|kneel|cower|dead
    this.aimPitch = 0;
    this.deadT = 0;
    this.heightScale = o.heavy ? 1.04 : 1.0;

    const jacketM = mat(o.jacket), pantsM = mat(o.pants), skinM = mat(o.skin, 0.7);
    const vestM = o.vest != null ? mat(o.vest, 0.9) : null;

    // pelvis root at y=0.96 (feet at 0)
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.96;
    this.group.add(this.pelvis);
    this.hips = seg(0.34, 0.2, 0.22, pantsM, 0, 0.02, 0);
    this.pelvis.add(this.hips);

    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.pelvis.add(this.torso);
    const chest = seg(0.4, 0.5, 0.24, jacketM, 0, 0.36, 0);
    this.torso.add(chest);
    if (vestM) {
      const vest = seg(0.42, 0.4, 0.29, vestM, 0, 0.36, 0);
      this.torso.add(vest);
      const band = seg(0.12, 0.08, 0.3, mat(o.accent, 0.8), -0.18, 0.5, 0);
      this.torso.add(band);
    } else if (o.shirt) {
      const shirt = seg(0.36, 0.46, 0.22, mat(o.shirt, 0.9), 0, 0.36, 0.015);
      this.torso.add(shirt);
    }

    this.headG = new THREE.Group();
    this.headG.position.y = 0.68;
    this.torso.add(this.headG);
    const neck = seg(0.12, 0.08, 0.12, skinM, 0, -0.02, 0);
    const head = seg(0.2, 0.24, 0.22, skinM, 0, 0.12, 0);
    this.headG.add(neck, head);
    if (o.helmet) {
      const helmet = seg(0.24, 0.14, 0.26, mat(0x2b2f33, 0.6, 0.3), 0, 0.2, 0);
      this.headG.add(helmet);
    } else if (o.cap) {
      const cap = seg(0.22, 0.07, 0.24, mat(0x2f3338, 0.9), 0, 0.22, -0.01);
      this.headG.add(cap);
    } else {
      const hair = seg(0.21, 0.08, 0.23, mat(0x3a2e24, 0.95), 0, 0.22, -0.01);
      this.headG.add(hair);
    }

    // arms: shoulder groups
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-0.26, 0.56, 0);
    this.armR.position.set(0.26, 0.56, 0);
    this.torso.add(this.armL, this.armR);
    for (const [g, side] of [[this.armL, -1], [this.armR, 1]]) {
      const upper = seg(0.11, 0.3, 0.13, jacketM, 0, -0.13, 0);
      const fore = new THREE.Group();
      fore.position.y = -0.28;
      const foreM = seg(0.095, 0.28, 0.11, jacketM, 0, -0.12, 0);
      const hand = seg(0.08, 0.09, 0.1, skinM, 0, -0.29, 0);
      fore.add(foreM, hand);
      g.add(upper, fore);
      g.userData.fore = fore;
      g.userData.side = side;
    }

    // legs: hip groups
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.1, -0.06, 0);
    this.legR.position.set(0.1, -0.06, 0);
    this.pelvis.add(this.legL, this.legR);
    for (const g of [this.legL, this.legR]) {
      const thigh = seg(0.14, 0.42, 0.16, pantsM, 0, -0.2, 0);
      const shin = new THREE.Group();
      shin.position.y = -0.42;
      const shinM = seg(0.12, 0.4, 0.14, pantsM, 0, -0.18, 0);
      const boot = seg(0.13, 0.09, 0.26, mat(0x1d1f22, 0.85), 0, -0.4, -0.04);
      shin.add(shinM, boot);
      g.add(thigh, shin);
      g.userData.shin = shin;
    }

    this.group.scale.setScalar(this.heightScale);
    this.weaponMount = new THREE.Group();
    this.armR.add(this.weaponMount);
    this.weaponMount.position.set(0.02, -0.56, -0.06);
  }

  attachWeapon(defId) {
    if (this.weaponModel) this.weaponMount.remove(this.weaponModel);
    if (!defId) { this.weaponModel = null; return; }
    const parts = buildWeaponModel(defId);
    parts.group.scale.setScalar(1.0);
    parts.group.position.set(0, 0.02, -0.1);
    this.weaponModel = parts.group;
    this.weaponParts = parts;
    this.weaponMount.add(parts.group);
  }

  getMuzzleWorld(out = new THREE.Vector3()) {
    if (this.weaponParts) this.weaponParts.muzzle.getWorldPosition(out);
    else { this.group.getWorldPosition(out); out.y += 1.45; }
    return out;
  }

  setAiming(aiming) { this.aiming = aiming; }

  update(dt, speed = 0) {
    if (this.pose === 'dead') {
      this.deadT = Math.min(1, this.deadT + dt * 3.2);
      const k = 1 - (1 - this.deadT) * (1 - this.deadT);
      this.group.rotation.x = -Math.PI / 2 * k * 0.96;
      this.group.position.y = 0.12 * k;
      this.pelvis.position.y = 0.96 - 0.6 * k;
      return;
    }
    this.moving = THREE.MathUtils.damp(this.moving, Math.min(1, speed / 3.2), 8, dt);
    this.phase += dt * (3 + speed * 2.4);
    const swing = Math.sin(this.phase) * this.moving;
    const swing2 = Math.sin(this.phase + Math.PI) * this.moving;
    const idleBreath = Math.sin(this.phase * 0.35) * 0.012;

    if (this.pose === 'kneel') {
      this.pelvis.position.y = 0.52;
      this.legL.rotation.x = -1.5;
      this.legL.userData.shin.rotation.x = 1.5;
      this.legR.rotation.x = -0.5;
      this.legR.userData.shin.rotation.x = 1.9;
      this.armL.rotation.x = -0.4;
      this.armR.rotation.x = -0.4;
      this.torso.rotation.x = 0.1 + idleBreath;
      return;
    }
    if (this.pose === 'cower') {
      this.pelvis.position.y = 0.5;
      this.legL.rotation.x = -2.1;
      this.legL.userData.shin.rotation.x = 2.2;
      this.legR.rotation.x = -2.0;
      this.legR.userData.shin.rotation.x = 2.3;
      this.torso.rotation.x = 0.55;
      this.armL.rotation.x = -2.4;
      this.armR.rotation.x = -2.4;
      this.headG.rotation.x = 0.5 + idleBreath * 3;
      return;
    }

    // stand / locomotion
    this.pelvis.position.y = 0.96 + Math.abs(Math.sin(this.phase * 2)) * 0.02 * this.moving;
    this.torso.rotation.x = idleBreath + this.moving * 0.06;
    this.legL.rotation.x = swing * 0.7;
    this.legR.rotation.x = swing2 * 0.7;
    this.legL.userData.shin.rotation.x = Math.max(0, -swing) * 0.9 + this.moving * 0.1;
    this.legR.userData.shin.rotation.x = Math.max(0, -swing2) * 0.9 + this.moving * 0.1;

    if (this.aiming) {
      // two-handed aim: right arm forward, left supports
      this.armR.rotation.set(-1.45 + this.aimPitch, 0, 0.12);
      this.armR.userData.fore.rotation.x = -0.12;
      this.armL.rotation.set(-1.2 + this.aimPitch, 0.5, -0.25);
      this.armL.userData.fore.rotation.x = -0.5;
      this.torso.rotation.y = -0.22;
    } else {
      this.torso.rotation.y = 0;
      // low-ready with weapon, relaxed otherwise
      if (this.weaponModel) {
        this.armR.rotation.set(-0.85, 0, 0.1);
        this.armR.userData.fore.rotation.x = -0.45;
        this.armL.rotation.set(-0.65, 0.35, -0.2);
        this.armL.userData.fore.rotation.x = -0.7;
      } else {
        this.armL.rotation.set(swing2 * 0.5, 0, 0.06);
        this.armR.rotation.set(swing * 0.5, 0, -0.06);
        this.armL.userData.fore.rotation.x = -0.25 - Math.max(0, swing2) * 0.3;
        this.armR.userData.fore.rotation.x = -0.25 - Math.max(0, swing) * 0.3;
      }
    }
  }

  setPose(pose) {
    if (this.pose === pose) return;
    this.pose = pose;
    if (pose !== 'dead') {
      this.group.rotation.x = 0;
      this.group.position.y = 0;
      this.deadT = 0;
      // clear pose-specific rotations
      for (const g of [this.legL, this.legR]) { g.rotation.set(0, 0, 0); g.userData.shin.rotation.set(0, 0, 0); }
      this.armL.rotation.set(0, 0, 0); this.armR.rotation.set(0, 0, 0);
      this.headG.rotation.set(0, 0, 0);
      this.torso.rotation.set(0, 0, 0);
    }
  }

  die() {
    this.setPose('dead');
  }

  flinch() {
    this.torso.rotation.x += 0.14;
  }
}

registerAsset('CHAR-HOSTILE-SCOUT', { name: 'Hostile — scout variant', category: 'character', agent: 'Fable 4', files: ['src/characters/humanoid.js'] });
registerAsset('CHAR-HOSTILE-TROOPER', { name: 'Hostile — trooper variant', category: 'character', agent: 'Fable 4', files: ['src/characters/humanoid.js'] });
registerAsset('CHAR-HOSTILE-HEAVY', { name: 'Hostile — heavy variant', category: 'character', agent: 'Fable 4', files: ['src/characters/humanoid.js'] });
registerAsset('CHAR-HOSTAGE-0', { name: 'Hostage — analyst', category: 'character', agent: 'Fable 4', files: ['src/characters/humanoid.js'] });
registerAsset('CHAR-HOSTAGE-1', { name: 'Hostage — manager', category: 'character', agent: 'Fable 4', files: ['src/characters/humanoid.js'] });
