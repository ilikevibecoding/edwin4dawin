import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/utils.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// First-person viewmodel: "AX-4" carbine (M4-class), procedurally modeled.
// Lives in its own overlay scene. Handles all weapon motion: idle sway,
// walk/sprint cycles, ADS blend, recoil kick, reload choreography.
// ===========================================================================

const rng = makeRNG(1123);

function muzzleFlashTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  // Star spikes
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3 + rng() * 0.3);
    const len = size * (0.3 + rng() * 0.18);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,240,200,0.9)');
    g.addColorStop(1, 'rgba(255,140,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.03);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, size * 0.03);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Core
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.2);
  g2.addColorStop(0, 'rgba(255,252,240,1)');
  g2.addColorStop(0.4, 'rgba(255,190,90,0.85)');
  g2.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Viewmodel {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.viewmodelScene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Lighting that matches the world's sun
    const key = new THREE.DirectionalLight(0xffe0b3, 2.6);
    key.position.set(-0.6, 0.8, 0.4);
    this.scene.add(key);
    const fill = new THREE.HemisphereLight(0x9fb4cc, 0x6e5942, 0.85);
    this.scene.add(fill);

    this.buildRifle();

    // Pose targets (viewmodel-camera space)
    this.hipPos = new THREE.Vector3(0.185, -0.185, -0.42);
    this.hipRot = new THREE.Euler(0.005, 0.055, 0.008);
    this.adsPos = new THREE.Vector3(0.0, -0.1055, -0.30);
    this.adsRot = new THREE.Euler(0, 0, 0);
    this.sprintPos = new THREE.Vector3(0.12, -0.24, -0.46);
    this.sprintRot = new THREE.Euler(0.5, -0.55, 0.18);
    this.reloadPos = new THREE.Vector3(0.13, -0.30, -0.40);
    this.reloadRot = new THREE.Euler(0.55, 0.22, 0.35);

    this.pos = this.hipPos.clone();
    this.rot = new THREE.Euler().copy(this.hipRot);

    // Dynamics
    this.swayX = 0; this.swayY = 0;
    this.kickPos = 0; this.kickRot = 0;
    this.bobT = 0;
    this.aimFrac = 0;
    this.reloadT = -1; // <0 = not reloading
    this.reloadDuration = 2.05;
    this.muzzleFlashT = 99;
    this.flashScale = 1;
  }

  buildRifle() {
    const metal = new THREE.MeshStandardMaterial({ color: 0x191a1c, roughness: 0.42, metalness: 0.88, envMapIntensity: 1.2 });
    const polymer = new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.8, metalness: 0.08, envMapIntensity: 0.6 });
    const polymerTan = new THREE.MeshStandardMaterial({ color: 0x6e5c43, roughness: 0.82, metalness: 0.05, envMapIntensity: 0.6 });
    const glove = new THREE.MeshStandardMaterial({ color: 0x3d3a2f, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.45 });
    const sleeve = new THREE.MeshStandardMaterial({ color: 0x4c4a3a, roughness: 0.96, envMapIntensity: 0.4 });

    const g = new THREE.Group();
    this.rifle = g;

    const box = (w, h, d, mat, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    const cylZ = (r, len, mat, x, y, z, seg = 12) => {
      const geo = new THREE.CylinderGeometry(r, r, len, seg);
      geo.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };

    // Upper + lower receiver
    box(0.035, 0.045, 0.24, metal, 0, 0.012, 0.02);
    box(0.034, 0.038, 0.17, metal, 0, -0.026, 0.045);
    // Ejection port detail
    box(0.002, 0.018, 0.05, new THREE.MeshStandardMaterial({ color: 0x2e3033, roughness: 0.3, metalness: 0.9 }), 0.0185, 0.008, 0.02);
    // Barrel + gas block
    cylZ(0.008, 0.30, metal, 0, 0.012, -0.30);
    box(0.018, 0.03, 0.025, metal, 0, 0.02, -0.315);
    // Muzzle device (birdcage)
    cylZ(0.012, 0.045, metal, 0, 0.012, -0.465, 8);
    box(0.026, 0.004, 0.045, metal, 0, 0.026, -0.465);
    // Handguard (octagonal tube w/ M-LOK slots)
    const hgGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.26, 8);
    hgGeo.rotateX(Math.PI / 2);
    hgGeo.rotateZ(Math.PI / 8);
    const hg = new THREE.Mesh(hgGeo, polymer);
    hg.position.set(0, 0.012, -0.20);
    g.add(hg);
    for (let i = 0; i < 6; i++) {
      box(0.052, 0.004, 0.018, polymer, 0, 0.012, -0.11 - i * 0.036);
    }
    // Top picatinny rail (ridges)
    for (let i = 0; i < 14; i++) {
      box(0.024, 0.006, 0.008, metal, 0, 0.041, 0.1 - i * 0.028);
    }
    // Red dot sight
    box(0.03, 0.014, 0.05, polymer, 0, 0.052, -0.015);
    const sightBody = box(0.032, 0.034, 0.014, polymer, 0, 0.075, -0.036);
    const sightGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1420, roughness: 0.05, metalness: 0.4,
      transparent: true, opacity: 0.42, envMapIntensity: 2.0, side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.024), sightGlassMat);
    glass.position.set(0, 0.075, -0.043);
    g.add(glass);
    const glass2 = glass.clone();
    glass2.position.z = -0.006;
    g.add(glass2);
    // The red dot itself — small emissive sprite visible through glass
    const dotMat = new THREE.SpriteMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.0, depthTest: false });
    this.redDot = new THREE.Sprite(dotMat);
    this.redDot.scale.set(0.0042, 0.0042, 1);
    this.redDot.position.set(0, 0.075, -0.025);
    this.redDot.renderOrder = 5;
    g.add(this.redDot);
    // Frame around sight
    box(0.004, 0.036, 0.014, polymer, -0.016, 0.075, -0.025);
    box(0.004, 0.036, 0.014, polymer, 0.016, 0.075, -0.025);
    box(0.034, 0.005, 0.014, polymer, 0, 0.094, -0.025);

    // Magazine (curved: two skewed segments)
    const mag1 = box(0.026, 0.09, 0.055, polymerTan, 0, -0.085, 0.032);
    mag1.rotation.x = 0.12;
    const mag2 = box(0.026, 0.075, 0.05, polymerTan, 0, -0.155, 0.048);
    mag2.rotation.x = 0.32;
    this.mag = new THREE.Group();

    // Pistol grip
    const grip = box(0.028, 0.085, 0.04, polymerTan, 0, -0.075, 0.115);
    grip.rotation.x = -0.35;
    // Trigger guard + trigger
    box(0.006, 0.003, 0.055, metal, 0, -0.052, 0.075);
    box(0.005, 0.022, 0.006, metal, 0, -0.04, 0.078);
    // Buffer tube + stock
    cylZ(0.014, 0.09, polymer, 0, 0.006, 0.135);
    const stock = box(0.032, 0.075, 0.09, polymerTan, 0, -0.005, 0.21);
    stock.rotation.x = 0.04;
    box(0.036, 0.09, 0.02, polymerTan, 0, -0.012, 0.255);
    // Charging handle
    box(0.03, 0.008, 0.02, metal, 0, 0.032, 0.13);

    // ---- Hands ----
    // Right hand on grip
    const rhand = new THREE.Group();
    const palmR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.075, 0.045), glove);
    palmR.rotation.x = -0.35;
    rhand.add(palmR);
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.05), glove);
      f.position.set(-0.012, 0.022 - i * 0.017, -0.024);
      f.rotation.x = -0.5;
      rhand.add(f);
    }
    rhand.position.set(0.004, -0.078, 0.118);
    g.add(rhand);
    // Right forearm sleeve
    const armGeoR = new THREE.CylinderGeometry(0.028, 0.035, 0.24, 8);
    const armR = new THREE.Mesh(armGeoR, sleeve);
    armR.position.set(0.045, -0.16, 0.23);
    armR.rotation.set(1.15, 0, -0.25);
    g.add(armR);

    // Left hand on handguard
    const lhand = new THREE.Group();
    const palmL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.07), glove);
    lhand.add(palmL);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.036, 0.014), glove);
      f.position.set(0.012, 0.028, -0.024 + i * 0.017);
      f.rotation.z = -0.4;
      lhand.add(f);
    }
    lhand.position.set(-0.006, -0.026, -0.20);
    lhand.rotation.z = 0.25;
    this.leftHand = lhand;
    g.add(lhand);
    const armGeoL = new THREE.CylinderGeometry(0.026, 0.034, 0.26, 8);
    const armL = new THREE.Mesh(armGeoL, sleeve);
    armL.position.set(-0.045, -0.13, -0.09);
    armL.rotation.set(1.35, 0, 0.35);
    g.add(armL);

    // Muzzle flash sprite (hidden unless firing)
    const flashMat = new THREE.SpriteMaterial({
      map: muzzleFlashTexture(), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.22, 0.22, 1);
    this.flash.position.set(0, 0.012, -0.50);
    this.flash.renderOrder = 10;
    g.add(this.flash);

    // Muzzle marker for world-space effects
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.012, -0.49);
    g.add(this.muzzle);

    this.root.add(g);
  }

  setEnvironment(envMap) {
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.6;
  }

  triggerShot() {
    this.kickPos = Math.min(0.055, this.kickPos + 0.022);
    this.kickRot = Math.min(0.10, this.kickRot + 0.045);
    this.muzzleFlashT = 0;
    this.flashScale = 0.8 + rng() * 0.5;
    this.flash.material.rotation = rng() * Math.PI * 2;
  }

  startReload() {
    if (this.reloadT >= 0) return false;
    this.reloadT = 0;
    return true;
  }

  get reloading() { return this.reloadT >= 0; }

  /** Returns world-space muzzle position using the main camera transform. */
  getMuzzleWorld(mainCamera, out) {
    this.muzzle.getWorldPosition(out);
    // Viewmodel space == camera space; transform into world
    out.applyMatrix4(mainCamera.matrixWorld);
    return out;
  }

  update(dt, ctx) {
    // ctx: { aiming, sprinting, moveNorm, mouseDX, mouseDY, bobPhase, onGround, dead }
    const aimTarget = ctx.aiming && !this.reloading && !ctx.sprinting ? 1 : 0;
    this.aimFrac = damp(this.aimFrac, aimTarget, 13, dt);

    // Reload progress
    let reloadBlend = 0;
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      const t = this.reloadT / this.reloadDuration;
      if (t >= 1) { this.reloadT = -1; }
      else reloadBlend = Math.sin(Math.min(t, 1) * Math.PI) ** 0.7;
    }

    // Sway from mouse (lagged)
    this.swayX = damp(this.swayX, clamp(ctx.mouseDX * 0.0016, -0.05, 0.05), 9, dt);
    this.swayY = damp(this.swayY, clamp(ctx.mouseDY * 0.0016, -0.05, 0.05), 9, dt);

    // Kick recovery
    this.kickPos = damp(this.kickPos, 0, 11, dt);
    this.kickRot = damp(this.kickRot, 0, 9, dt);

    // Pose blending: hip -> ads -> sprint -> reload
    const sprintBlend = ctx.sprinting && !this.reloading ? 1 : 0;
    this._sprintF = damp(this._sprintF ?? 0, sprintBlend, 9, dt);
    const sp = this._sprintF;

    const px = lerp(lerp(this.hipPos.x, this.adsPos.x, this.aimFrac), this.sprintPos.x, sp);
    const py = lerp(lerp(this.hipPos.y, this.adsPos.y, this.aimFrac), this.sprintPos.y, sp);
    const pz = lerp(lerp(this.hipPos.z, this.adsPos.z, this.aimFrac), this.sprintPos.z, sp);
    const rx = lerp(lerp(this.hipRot.x, this.adsRot.x, this.aimFrac), this.sprintRot.x, sp);
    const ry = lerp(lerp(this.hipRot.y, this.adsRot.y, this.aimFrac), this.sprintRot.y, sp);
    const rz = lerp(lerp(this.hipRot.z, this.adsRot.z, this.aimFrac), this.sprintRot.z, sp);

    // Walk bob (reduced when aiming)
    this.bobT = ctx.bobPhase;
    const bobAmp = ctx.moveNorm * (1 - this.aimFrac * 0.85) * (ctx.onGround ? 1 : 0.25);
    const bobX = Math.sin(this.bobT * 0.5) * 0.008 * bobAmp;
    const bobY = -Math.abs(Math.sin(this.bobT)) * 0.007 * bobAmp;

    // Idle breathing
    const t = performance.now() / 1000;
    const idleX = Math.sin(t * 1.1) * 0.0012 * (1 - this.aimFrac * 0.7);
    const idleY = Math.sin(t * 1.7) * 0.0011 * (1 - this.aimFrac * 0.7);

    const fp = this.pos;
    fp.set(
      px + bobX + idleX - this.swayX * (1 - this.aimFrac * 0.6),
      py + bobY + idleY + this.swayY * (1 - this.aimFrac * 0.6),
      pz + this.kickPos
    );
    const fr = this.rot;
    fr.set(
      rx - this.kickRot + this.swayY * 0.6,
      ry + this.swayX * 0.8,
      rz + this.swayX * 0.4
    );

    // Reload overlay motion
    if (reloadBlend > 0) {
      fp.lerp(this.reloadPos, reloadBlend * 0.9);
      fr.x = lerp(fr.x, this.reloadRot.x, reloadBlend * 0.9);
      fr.y = lerp(fr.y, this.reloadRot.y, reloadBlend * 0.9);
      fr.z = lerp(fr.z, this.reloadRot.z, reloadBlend * 0.9);
      // left hand drops to "swap mag"
      this.leftHand.position.y = -0.026 - reloadBlend * 0.18;
      this.leftHand.position.z = -0.20 + reloadBlend * 0.13;
    } else {
      this.leftHand.position.y = -0.026;
      this.leftHand.position.z = -0.20;
    }

    this.rifle.position.copy(fp);
    this.rifle.rotation.copy(fr);

    // Red dot opacity: visible when ADS
    this.redDot.material.opacity = this.aimFrac * 0.95;

    // Muzzle flash decay (2-frame flash)
    this.muzzleFlashT += dt;
    const fa = Math.max(0, 1 - this.muzzleFlashT / 0.045);
    this.flash.material.opacity = fa * 0.95;
    const fs = this.flashScale * (0.16 + fa * 0.1) * (1 + this.aimFrac * 0.15);
    this.flash.scale.set(fs, fs, 1);

    // Viewmodel FOV: tighter when ADS
    this.engine.viewmodelCamera.fov = lerp(56, 42, this.aimFrac);
    this.engine.viewmodelCamera.updateProjectionMatrix();
  }
}
