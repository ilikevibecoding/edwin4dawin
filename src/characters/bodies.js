// Character body construction + animation interface.
// PHASE-2 GRAYBOX implementation (capsule + head + weapon block) — the
// character art pass replaces the internals of these builders while keeping
// the same interface: { group, setMoveAnim, setAimPitch, setCrouch, playDeath,
// headPos, torsoPos, update }.
// PLACEHOLDER: registered in the manifest as CHR-000-graybox (must not ship).

import * as THREE from 'three';
import { getMaterial } from '../world/materials.js';

const ENEMY_COLORS = { scout: 0x4a5240, trooper: 0x3d4448, heavy: 0x35393c, marksman: 0x46424a };

export function createEnemyBody(type = 'trooper') {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: ENEMY_COLORS[type] || 0x3d4448, roughness: 0.9 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.95, 4, 10), mat);
  torso.position.y = 0.95;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshStandardMaterial({ color: 0xb08d6a, roughness: 0.8 }));
  head.position.y = 1.66;
  head.castShadow = true;
  group.add(head);
  // hostile arm-band marker (readability)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0xc9552e, roughness: 0.7 }));
  band.position.y = 1.28;
  group.add(band);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.62), getMaterial('metal_dark'));
  gun.position.set(0.16, 1.28, -0.34);
  group.add(gun);

  return makeBodyApi(group, { torso, head, gun }, 1.66);
}

export function createHostageBody(variant = 0) {
  const group = new THREE.Group();
  const colors = [0x7c96ad, 0x9d8b70];
  const mat = new THREE.MeshStandardMaterial({ color: colors[variant % colors.length], roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.9, 4, 10), mat);
  torso.position.y = 0.92;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc09a76, roughness: 0.8 }));
  head.position.y = 1.62;
  head.castShadow = true;
  group.add(head);
  return makeBodyApi(group, { torso, head }, 1.62);
}

function makeBodyApi(group, parts, headH) {
  const api = {
    group, parts,
    crouchFrac: 0,
    deadT: -1,
    bobPhase: 0,
    setMoveAnim(speed, dt) {
      if (this.deadT >= 0) return;
      this.bobPhase += dt * speed * 2.4;
      const s = Math.min(1, speed / 4);
      group.position.y = group.userData.baseY + Math.abs(Math.sin(this.bobPhase)) * 0.03 * s - this.crouchFrac * 0.42;
    },
    setAimPitch() { /* graybox: no-op */ },
    setCrouch(frac) { this.crouchFrac = frac; },
    playDeath() {
      this.deadT = 0;
    },
    update(dt) {
      if (this.deadT >= 0 && this.deadT < 1) {
        this.deadT = Math.min(1, this.deadT + dt * 2.6);
        const e = 1 - (1 - this.deadT) * (1 - this.deadT);
        group.rotation.x = -e * Math.PI / 2 * 0.96;
        group.position.y = group.userData.baseY + e * 0.12 - this.crouchFrac * 0.4;
      }
    },
    headHeight() { return headH - this.crouchFrac * 0.42; },
  };
  group.userData.baseY = 0;
  return api;
}
