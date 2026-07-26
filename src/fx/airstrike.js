import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(70707);

// ===========================================================================
// Air strike killstreak: three-jet formation flies over the target point and
// carpet-bombs a line along the flight path. Jets are procedural fighter
// models with afterburner glow + contrails.
// ===========================================================================

function buildJet() {
  const g = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: 0x4c5258, roughness: 0.42, metalness: 0.72, envMapIntensity: 1.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24272a, roughness: 0.5, metalness: 0.6 });

  // Fuselage
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 9.5, 10), hull);
  fus.rotation.x = Math.PI / 2;
  g.add(fus);
  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 10), hull);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -5.9;
  g.add(nose);
  // Canopy
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshStandardMaterial({ color: 0x11202e, roughness: 0.1, metalness: 0.7, envMapIntensity: 2 }));
  canopy.scale.set(0.7, 0.55, 1.7);
  canopy.position.set(0, 0.45, -2.6);
  g.add(canopy);
  // Delta wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -1.2); wingShape.lineTo(4.6, 1.9); wingShape.lineTo(4.6, 2.5); wingShape.lineTo(0, 2.6);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: false });
  const wingL = new THREE.Mesh(wingGeo, hull);
  wingL.rotation.x = Math.PI / 2;
  wingL.position.set(0.2, 0, -1.2);
  g.add(wingL);
  const wingR = new THREE.Mesh(wingGeo, hull);
  wingR.rotation.x = Math.PI / 2;
  wingR.scale.x = -1;
  wingR.position.set(-0.2, 0, -1.2);
  g.add(wingR);
  // Tail fins
  const finGeo = new THREE.ExtrudeGeometry((() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(1.5, 1.7); s.lineTo(1.5, 2.2); s.lineTo(0, 1.3);
    s.closePath();
    return s;
  })(), { depth: 0.07, bevelEnabled: false });
  const finUp = new THREE.Mesh(finGeo, dark);
  finUp.rotation.y = Math.PI / 2;
  finUp.rotation.z = Math.PI / 2;
  finUp.position.set(0.035, 0.35, 4.6 - 2.2);
  finUp.rotation.x = 0.25;
  g.add(finUp);
  // Horizontal stabilizers
  const stabGeo = new THREE.BoxGeometry(3.4, 0.07, 1.3);
  const stab = new THREE.Mesh(stabGeo, hull);
  stab.position.set(0, 0.05, 3.7);
  g.add(stab);
  // Engine nozzle + afterburner glow
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.8, 10), dark);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 4.9;
  g.add(nozzle);
  const burner = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 2.6, 8),
    new THREE.MeshBasicMaterial({ color: 0x77bbff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  burner.rotation.x = -Math.PI / 2;
  burner.position.z = 6.2;
  g.add(burner);

  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return g;
}

export class AirstrikeSystem {
  constructor(scene, physics, explosions, particles, player, audio) {
    this.scene = scene;
    this.physics = physics;
    this.explosions = explosions;
    this.particles = particles;
    this.player = player;
    this.audio = audio;

    this.jets = [];
    this.pendingBombs = [];   // {pos3D target, dropAt(time), mesh}
    this.fallingBombs = [];
    this.active = false;
    this.callTimer = -1;
    this.strikeCenter = new THREE.Vector3();
    this.strikeDir = new THREE.Vector3(0, 0, -1);

    this.onStateChange = null; // HUD callback: 'called' | 'inbound' | 'done'

    // Reusable bomb mesh proto
    this.bombGeo = new THREE.CapsuleGeometry(0.16, 0.7, 4, 8);
    this.bombMat = new THREE.MeshStandardMaterial({ color: 0x2a2e26, roughness: 0.6, metalness: 0.5 });
  }

  /** Call in a strike centered where the player is aiming. */
  call(camera) {
    if (this.active) return false;
    // Target: raycast from camera to world (prefer ground point)
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const hit = this.physics.raycast(camera.position, dir, 260);
    const target = hit ? hit.point.clone() : camera.position.clone().addScaledVector(dir, 90);
    target.y = 0;
    // Clamp to map
    target.x = THREE.MathUtils.clamp(target.x, -80, 80);
    target.z = THREE.MathUtils.clamp(target.z, -80, 80);

    this.strikeCenter.copy(target);
    // Jets fly along the player's horizontal view direction
    this.strikeDir.set(dir.x, 0, dir.z).normalize();
    if (this.strikeDir.lengthSq() < 0.01) this.strikeDir.set(0, 0, -1);

    this.active = true;
    this.callTimer = 0;
    this.onStateChange?.('called');
    this.audio?.play('airstrikeCall');
    return true;
  }

  spawnJets() {
    const dir = this.strikeDir;
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const alt = 95;
    const startDist = 520;
    const speed = 165;

    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      const lateral = (i - 1) * 26;
      const behind = i === 1 ? 0 : 34; // echelon: leader ahead
      const start = this.strikeCenter.clone()
        .addScaledVector(dir, -startDist - behind)
        .addScaledVector(perp, lateral)
        .setY(alt + (i === 1 ? 0 : 5));
      jet.position.copy(start);
      jet.lookAt(start.clone().add(dir));
      this.scene.add(jet);
      this.jets.push({ mesh: jet, vel: dir.clone().multiplyScalar(speed), age: 0, contrailT: 0, isLeader: i === 1, lateral });

      // Only the leader + wingmen drop bombs; carpet line along dir
      const bombCount = 4;
      for (let b = 0; b < bombCount; b++) {
        const along = (b - (bombCount - 1) / 2) * 8.5 + rng.range(-1.5, 1.5);
        const targetPos = this.strikeCenter.clone()
          .addScaledVector(dir, along)
          .addScaledVector(perp, lateral * 0.45 + rng.range(-2, 2));
        targetPos.y = 0;
        // Time for jet to reach drop point: drop early so bomb lands on target
        const fallTime = 1.15;
        const dropPoint = targetPos.clone().addScaledVector(dir, -speed * fallTime * 0.55);
        const distToDrop = start.distanceTo(dropPoint.clone().setY(alt));
        this.pendingBombs.push({
          jetIndex: this.jets.length - 1,
          dropAt: distToDrop / speed,
          target: targetPos,
          fallTime,
        });
      }
    }
    this.audio?.play('jetFlyby');
    this.onStateChange?.('inbound');
  }

  update(dt, time) {
    if (this.active) {
      const prev = this.callTimer;
      this.callTimer += dt;
      // 2.2s delay between call and jets appearing
      if (prev < 2.2 && this.callTimer >= 2.2) this.spawnJets();
    }

    // ---- Jets ----
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.age += dt;
      j.mesh.position.addScaledVector(j.vel, dt);
      // Contrail smoke
      j.contrailT -= dt;
      if (j.contrailT <= 0) {
        j.contrailT = 0.02;
        this.particles.emit({
          pos: j.mesh.position.clone().addScaledVector(this.strikeDir, 5.5),
          count: 1, vel: new THREE.Vector3(0, 0.3, 0), spread: 0.3,
          life: [2.2, 3.6], size: [0.9, 3.2],
          color0: new THREE.Color(0.85, 0.85, 0.88),
          alpha: 0.28, drag: 0.5, fadeIn: 0.05, fadeOutStart: 0.35,
        });
      }
      if (j.age > 10) {
        this.scene.remove(j.mesh);
        this.jets.splice(i, 1);
      }
    }

    // ---- Bomb releases ----
    if (this.jets.length > 0 || this.pendingBombs.length > 0) {
      for (let i = this.pendingBombs.length - 1; i >= 0; i--) {
        const b = this.pendingBombs[i];
        const jet = this.jets[b.jetIndex];
        if (!jet) { this.pendingBombs.splice(i, 1); continue; }
        b.dropAt -= dt;
        if (b.dropAt <= 0) {
          const mesh = new THREE.Mesh(this.bombGeo, this.bombMat);
          mesh.position.copy(jet.mesh.position).add(new THREE.Vector3(0, -1.2, 0));
          mesh.castShadow = true;
          this.scene.add(mesh);
          this.fallingBombs.push({
            mesh,
            vel: jet.vel.clone().multiplyScalar(0.55),
            target: b.target,
            age: 0,
          });
          this.pendingBombs.splice(i, 1);
        }
      }
    }

    // ---- Falling bombs ----
    for (let i = this.fallingBombs.length - 1; i >= 0; i--) {
      const b = this.fallingBombs[i];
      b.age += dt;
      b.vel.y -= 42 * dt; // heavy ordnance accelerates hard
      b.mesh.position.addScaledVector(b.vel, dt);
      // Orient nose-down along velocity
      const look = b.mesh.position.clone().add(b.vel);
      b.mesh.lookAt(look);
      b.mesh.rotateX(Math.PI / 2);
      // Whistle as it gets close to the ground
      if (b.mesh.position.y < 55 && !b.whistled) {
        b.whistled = true;
        this.audio?.play('bombWhistle', this.player.position.distanceTo(b.target));
      }
      if (b.mesh.position.y <= 0.4) {
        this.scene.remove(b.mesh);
        this.fallingBombs.splice(i, 1);
        this.explosions.explode(b.target.clone(), { size: 1.7, damage: 190, radius: 12 });
      }
    }

    // ---- Wrap up ----
    if (this.active && this.callTimer > 13 && this.jets.length === 0 && this.fallingBombs.length === 0 && this.pendingBombs.length === 0) {
      this.active = false;
      this.onStateChange?.('done');
    }
  }
}
