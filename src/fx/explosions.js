import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(60606);

// ===========================================================================
// Explosion effect: layered particles (flash, fireball, smoke column, debris,
// ground dust ring) + point light + scorch decal + camera shake + damage.
// ===========================================================================

export class ExplosionFX {
  constructor(scene, particles, impacts, player, audio) {
    this.scene = scene;
    this.particles = particles;
    this.impacts = impacts;
    this.player = player;
    this.audio = audio;
    this.enemyManager = null; // wired in main

    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 40, 1.8);
      scene.add(l);
      this.lights.push({ light: l, t: 99 });
    }
  }

  explode(pos, { size = 1, damage = 120, radius = 9 } = {}) {
    const p = this.particles;

    // Core flash
    p.emit({
      pos: pos.clone().add(new THREE.Vector3(0, 0.8 * size, 0)),
      count: 3, vel: new THREE.Vector3(0, 1, 0), spread: 0.5,
      life: [0.09, 0.16], size: [3.2 * size, 6.5 * size],
      color0: new THREE.Color(1, 0.95, 0.8).multiplyScalar(9),
      color1: new THREE.Color(1, 0.6, 0.2).multiplyScalar(4),
      alpha: 1, additive: true, fadeIn: 0.01, fadeOutStart: 0.2,
    });
    // Fireball
    p.emit({
      pos: pos.clone().add(new THREE.Vector3(0, 0.9 * size, 0)),
      count: 22, vel: new THREE.Vector3(0, 3.2 * size, 0), spread: 3.4 * size,
      life: [0.28, 0.75], size: [1.3 * size, 2.6 * size],
      color0: new THREE.Color(1, 0.62, 0.16).multiplyScalar(5.5),
      color1: new THREE.Color(0.7, 0.16, 0.02).multiplyScalar(1.6),
      alpha: 0.95, additive: true, gravity: -2.2, drag: 2.1,
      fadeIn: 0.02, fadeOutStart: 0.4, posJitter: 0.8 * size,
    });
    // Black smoke column (long-lived, rises)
    p.emit({
      pos: pos.clone().add(new THREE.Vector3(0, 1.4 * size, 0)),
      count: 26, vel: new THREE.Vector3(0, 3.6 * size, 0), spread: 1.7 * size, spreadY: 0.6,
      life: [1.6, 4.2], size: [1.8 * size, 5.4 * size],
      color0: new THREE.Color(0.09, 0.08, 0.07),
      color1: new THREE.Color(0.22, 0.2, 0.18),
      alpha: 0.72, gravity: -1.4, drag: 1.1,
      fadeIn: 0.12, fadeOutStart: 0.55, posJitter: 1.2 * size, spinVel: 0.9,
    });
    // Debris streaks
    p.emit({
      pos: pos.clone().add(new THREE.Vector3(0, 0.6, 0)),
      count: 26, vel: new THREE.Vector3(0, 9 * size, 0), spread: 8 * size,
      life: [0.5, 1.5], size: [0.09, 0.05],
      color0: new THREE.Color(1, 0.7, 0.3).multiplyScalar(3),
      color1: new THREE.Color(0.4, 0.15, 0.04),
      alpha: 1, additive: true, gravity: 16, drag: 0.25, floor: 0.05,
      fadeOutStart: 0.8,
    });
    // Ground dust ring
    p.emit({
      pos: pos.clone().add(new THREE.Vector3(0, 0.4, 0)),
      count: 20, vel: new THREE.Vector3(0, 0.4, 0), spread: 7.5 * size, spreadY: 0.06,
      life: [0.8, 1.8], size: [1.6 * size, 3.6 * size],
      color0: new THREE.Color(0.55, 0.47, 0.36),
      color1: new THREE.Color(0.4, 0.35, 0.28),
      alpha: 0.5, gravity: 0.4, drag: 2.4,
      fadeIn: 0.05, fadeOutStart: 0.4, spinVel: 0.7,
    });

    // Light flash
    const slot = this.lights.reduce((a, b) => (a.t > b.t ? a : b));
    slot.t = 0;
    slot.light.position.copy(pos).add(new THREE.Vector3(0, 2.2, 0));
    slot.light.intensity = 320 * size;
    slot.light.distance = 42 * size;

    // Scorch on ground
    if (pos.y < 1.2) this.impacts.scorch(pos.clone().setY(0.02), size * 0.9);

    // Camera shake / damage falloff by distance
    const d = this.player.position.distanceTo(pos);
    const sh = Math.max(0, 1 - d / 60);
    this.player.addShake(0.09 * sh * sh * size);

    this.enemyManager?.explosionAt(pos.clone().add(new THREE.Vector3(0, 1, 0)), radius * size, damage);
    this.audio?.play('explosion', d);
  }

  update(dt) {
    for (const s of this.lights) {
      s.t += dt;
      if (s.light.intensity > 0) {
        s.light.intensity = Math.max(0, s.light.intensity - dt * 1400);
      }
    }
  }
}
