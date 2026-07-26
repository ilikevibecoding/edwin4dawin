import * as THREE from 'three';
import { camoMaterial, flatMaterial } from '../world/materials.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Procedural enemy soldier: articulated rig (hips, torso, head, arms, legs)
// with code-driven animation — walk cycle, aim pose, flinch, death fall.
// ===========================================================================

const rng = makeRNG(5555);

const SKIN = new THREE.MeshStandardMaterial({ color: 0x8a6a52, roughness: 0.75 });
const BALACLAVA = new THREE.MeshStandardMaterial({ color: 0x22211e, roughness: 0.95 });
const VEST = new THREE.MeshStandardMaterial({ color: 0x2e2c26, roughness: 0.9 });
const BOOT = new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.85 });
const GUNMETAL = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.45, metalness: 0.8 });

function limb(r1, r2, len, mat) {
  const geo = new THREE.CylinderGeometry(r1, r2, len, 8);
  geo.translate(0, -len / 2, 0); // pivot at top
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

export class Soldier {
  constructor() {
    this.root = new THREE.Group();
    const uniform = camoMaterial(91 + rng.int(0, 2));

    // --- Hips / pelvis (root of rig) ---
    this.hips = new THREE.Group();
    this.hips.position.y = 0.95;
    this.root.add(this.hips);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.24), uniform);
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    // --- Torso ---
    this.torso = new THREE.Group();
    this.torso.position.y = 0.1;
    this.hips.add(this.torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.26), uniform);
    chest.position.y = 0.32;
    chest.castShadow = true;
    this.torso.add(chest);
    // Plate carrier vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.4, 0.31), VEST);
    vest.position.y = 0.34;
    vest.castShadow = true;
    this.torso.add(vest);
    // Pouches
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.05), VEST);
      p.position.set(-0.12 + i * 0.12, 0.22, 0.185);
      p.castShadow = true;
      this.torso.add(p);
    }

    // --- Head ---
    this.head = new THREE.Group();
    this.head.position.y = 0.62;
    this.torso.add(this.head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), BALACLAVA);
    face.position.y = 0.1;
    face.scale.set(0.92, 1.05, 0.95);
    face.castShadow = true;
    this.head.add(face);
    // Eyes strip (skin showing through balaclava)
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.032, 0.02), SKIN);
    eyes.position.set(0, 0.115, 0.098);
    this.head.add(eyes);
    // Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), uniform);
    helmet.position.y = 0.125;
    helmet.castShadow = true;
    this.head.add(helmet);
    const helmetRim = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.014, 6, 14), uniform);
    helmetRim.rotation.x = Math.PI / 2;
    helmetRim.position.y = 0.115;
    this.head.add(helmetRim);

    // --- Arms (holding rifle) ---
    this.armL = new THREE.Group();
    this.armL.position.set(0.24, 0.52, 0);
    this.torso.add(this.armL);
    const upperL = limb(0.055, 0.05, 0.3, uniform);
    this.armL.add(upperL);
    this.forearmL = new THREE.Group();
    this.forearmL.position.y = -0.3;
    this.armL.add(this.forearmL);
    this.forearmL.add(limb(0.045, 0.04, 0.28, uniform));

    this.armR = new THREE.Group();
    this.armR.position.set(-0.24, 0.52, 0);
    this.torso.add(this.armR);
    const upperR = limb(0.055, 0.05, 0.3, uniform);
    this.armR.add(upperR);
    this.forearmR = new THREE.Group();
    this.forearmR.position.y = -0.3;
    this.armR.add(this.forearmR);
    this.forearmR.add(limb(0.045, 0.04, 0.28, uniform));

    // --- Rifle (held) ---
    this.rifle = new THREE.Group();
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.55), GUNMETAL);
    rBody.castShadow = true;
    this.rifle.add(rBody);
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), GUNMETAL);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.015, -0.4);
    this.rifle.add(rBarrel);
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.06), GUNMETAL);
    rMag.position.set(0, -0.1, 0.06);
    rMag.rotation.x = 0.25;
    this.rifle.add(rMag);
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.16), GUNMETAL);
    rStock.position.set(0, -0.01, 0.32);
    this.rifle.add(rStock);
    this.torso.add(this.rifle);

    // Muzzle world-space anchor
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.015, -0.55);
    this.rifle.add(this.muzzle);

    // Enemy muzzle flash sprite
    const flashMat = new THREE.SpriteMaterial({
      color: 0xffc873, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.34, 0.34, 1);
    this.flash.position.set(0, 0.015, -0.6);
    this.rifle.add(this.flash);

    // --- Legs ---
    this.legL = new THREE.Group();
    this.legL.position.set(0.1, -0.1, 0);
    this.hips.add(this.legL);
    this.legL.add(limb(0.075, 0.06, 0.42, uniform));
    this.calfL = new THREE.Group();
    this.calfL.position.y = -0.42;
    this.legL.add(this.calfL);
    this.calfL.add(limb(0.055, 0.045, 0.4, uniform));
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.26), BOOT);
    bootL.position.set(0, -0.4, -0.05);
    bootL.castShadow = true;
    this.calfL.add(bootL);

    this.legR = new THREE.Group();
    this.legR.position.set(-0.1, -0.1, 0);
    this.hips.add(this.legR);
    this.legR.add(limb(0.075, 0.06, 0.42, uniform));
    this.calfR = new THREE.Group();
    this.calfR.position.y = -0.42;
    this.legR.add(this.calfR);
    this.calfR.add(limb(0.055, 0.045, 0.4, uniform));
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.26), BOOT);
    bootR.position.set(0, -0.4, -0.05);
    bootR.castShadow = true;
    this.calfR.add(bootR);

    this.setAimPose();

    // Animation state
    this.walkPhase = rng() * 10;
    this.flinchT = 99;
    this.deathT = -1;
    this.deathDir = 1;
    this.flashT = 99;
  }

  setAimPose() {
    // Two-handed rifle hold aimed forward
    this.rifle.position.set(0.02, 0.42, -0.28);
    this.rifle.rotation.set(0, 0, 0);
    this.armR.rotation.set(-1.15, -0.35, 0.35);
    this.forearmR.rotation.set(-0.55, 0, 0);
    this.armL.rotation.set(-1.25, 0.55, -0.5);
    this.forearmL.rotation.set(-0.8, 0, 0);
  }

  triggerFlash() {
    this.flashT = 0;
    this.flash.material.rotation = rng() * Math.PI * 2;
  }

  startDeath(dir) {
    this.deathT = 0;
    this.deathDir = dir;
  }

  flinch() { this.flinchT = 0; }

  /**
   * Animate. moveSpeed in m/s, crouch 0..1, aimYawPitch aims torso/head.
   */
  update(dt, moveSpeed, crouch, aimPitch) {
    // Death animation: crumple + fall
    if (this.deathT >= 0) {
      this.deathT += dt;
      const t = Math.min(this.deathT / 0.75, 1);
      const e = 1 - Math.pow(1 - t, 3);
      this.root.rotation.x = e * (Math.PI / 2 - 0.06) * 0.92 * this.deathDir;
      this.root.rotation.z = e * 0.35 * this.deathDir;
      this.hips.position.y = 0.95 - e * 0.62;
      this.legL.rotation.x = e * 0.5;
      this.legR.rotation.x = -e * 0.3;
      this.armL.rotation.x = -1.25 + e * 1.4;
      this.armR.rotation.x = -1.15 + e * 1.7;
      this.head.rotation.x = e * 0.5;
      // Sink after 6s
      if (this.deathT > 6) this.root.position.y -= dt * 0.25;
      return;
    }

    this.walkPhase += dt * (4 + moveSpeed * 2.1);
    const w = Math.min(moveSpeed / 3.2, 1.2);
    const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);

    // Legs
    this.legL.rotation.x = s * 0.62 * w;
    this.legR.rotation.x = -s * 0.62 * w;
    this.calfL.rotation.x = Math.max(0, -c) * 0.9 * w;
    this.calfR.rotation.x = Math.max(0, c) * 0.9 * w;

    // Body bounce + crouch
    const bounce = Math.abs(c) * 0.04 * w;
    this.hips.position.y = 0.95 - crouch * 0.34 + bounce;
    this.torso.rotation.x = 0.06 * w + crouch * 0.18;

    // Aim pitch on torso/head
    this.torso.rotation.x += -aimPitch * 0.55;
    this.head.rotation.x = -aimPitch * 0.4;

    // Idle breathing
    const t = performance.now() / 1000;
    this.torso.rotation.z = Math.sin(t * 1.3 + this.walkPhase * 0.1) * 0.02;

    // Flinch
    this.flinchT += dt;
    if (this.flinchT < 0.22) {
      const f = 1 - this.flinchT / 0.22;
      this.torso.rotation.x -= f * 0.16;
      this.torso.rotation.z += f * 0.1;
    }

    // Muzzle flash fade
    this.flashT += dt;
    this.flash.material.opacity = Math.max(0, 1 - this.flashT / 0.05) * 0.95;
  }
}
