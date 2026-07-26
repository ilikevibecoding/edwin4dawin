import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Impact FX: pooled bullet-hole decals, scorch marks, plus particle bursts
// (sparks, dust, chips) driven by the shared ParticleSystem.
// ===========================================================================

const rng = makeRNG(24680);

function bulletHoleTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  // chipped rim
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2;
    const r = size * (0.16 + rng() * 0.13);
    const g = ctx.createRadialGradient(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(190,180,168,0.5)');
    g.addColorStop(1, 'rgba(190,180,168,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // dark core
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.2);
  g2.addColorStop(0, 'rgba(8,7,6,0.96)');
  g2.addColorStop(0.55, 'rgba(20,17,14,0.85)');
  g2.addColorStop(1, 'rgba(20,17,14,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function scorchTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.pow(rng(), 1.6) * size * 0.42;
    const r = size * (0.05 + rng() * 0.16) * (1 - d / (size * 0.5));
    const g = ctx.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(r, 2));
    const alpha = 0.24 * (1 - d / (size * 0.55));
    g.addColorStop(0, `rgba(10,8,6,${alpha})`);
    g.addColorStop(1, 'rgba(10,8,6,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.3);
  g2.addColorStop(0, 'rgba(5,4,3,0.9)');
  g2.addColorStop(1, 'rgba(5,4,3,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

class DecalPool {
  constructor(scene, texture, max, size, renderOrder = 4) {
    this.max = max;
    this.idx = 0;
    this.meshes = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = renderOrder;
      m.userData.baseSize = size;
      scene.add(m);
      this.meshes.push(m);
    }
  }

  place(point, normal, sizeScale = 1) {
    const m = this.meshes[this.idx];
    this.idx = (this.idx + 1) % this.max;
    m.visible = true;
    m.position.copy(point).addScaledVector(normal, 0.012 + rng() * 0.004);
    const size = m.userData.baseSize * sizeScale * (0.8 + rng() * 0.5);
    m.scale.set(size, size, 1);
    m.lookAt(point.clone().add(normal));
    m.rotateZ(rng() * Math.PI * 2);
    return m;
  }
}

export class ImpactFX {
  constructor(scene, particles) {
    this.particles = particles;
    this.holes = new DecalPool(scene, bulletHoleTexture(), 220, 0.14, 5);
    this.scorches = new DecalPool(scene, scorchTexture(), 40, 7.0, 4);
  }

  bulletImpact(point, normal, surface = 'concrete') {
    this.holes.place(point, normal);

    const out = normal.clone();
    // Dust puff (surface-colored, sun-lit smoke pool)
    const dustColor = surface === 'metal' ? new THREE.Color(0.5, 0.5, 0.52) : new THREE.Color(0.62, 0.55, 0.44);
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.05),
      count: 6,
      vel: out.clone().multiplyScalar(1.7),
      spread: 1.1,
      life: [0.4, 0.9],
      size: [0.14, 0.6], sizeEase: 0.6,
      color0: dustColor, color1: dustColor.clone().multiplyScalar(0.8),
      alpha: 0.55,
      gravity: 0.4, drag: 2.2,
      fadeOutStart: 0.25, tex: 2,
    });
    // Lingering sun-lit dust wisp drifting off the wall
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.12),
      count: 2,
      vel: out.clone().multiplyScalar(0.35).add(new THREE.Vector3(0, 0.3, 0)),
      spread: 0.15,
      life: [1.3, 2.2],
      size: [0.3, 1.0], sizeEase: 0.55,
      color0: dustColor.clone().multiplyScalar(0.9), color1: dustColor.clone().multiplyScalar(0.7),
      alpha: 0.34,
      gravity: -0.05, drag: 1.1, turb: 0.3,
      fadeIn: 0.22, fadeOutStart: 0.4, spinVel: 0.7, tex: 3,
    });
    // Chips (stretched, arcing to the ground)
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.03),
      count: 5,
      vel: out.clone().multiplyScalar(3.6),
      spread: 2.4,
      life: [0.3, 0.7],
      size: [0.035, 0.02],
      color0: dustColor.clone().multiplyScalar(1.15),
      alpha: 0.95,
      gravity: 9.5, drag: 0.4,
      floor: 0.02,
      fadeOutStart: 0.7, stretch: 0.05, lenMax: 0.4,
    });
    // Sparks: fierce on metal, brief and subtle on concrete
    const metal = surface === 'metal';
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.03),
      count: metal ? 10 : 4,
      vel: out.clone().multiplyScalar(metal ? 5 : 3.2),
      spread: metal ? 3.6 : 2.2,
      life: metal ? [0.14, 0.42] : [0.08, 0.22],
      size: metal ? [0.05, 0.014] : [0.032, 0.01],
      color0: new THREE.Color(1.0, 0.85, 0.45).multiplyScalar(metal ? 4 : 2.4),
      color1: new THREE.Color(1.0, 0.4, 0.1).multiplyScalar(metal ? 1.8 : 1.1),
      alpha: 1,
      gravity: metal ? 7 : 9, drag: 0.2,
      additive: true, floor: 0.02,
      fadeOutStart: 0.5, stretch: 0.06, lenMax: metal ? 0.9 : 0.5,
    });
  }

  scorch(point, sizeScale = 1) {
    this.scorches.place(point, new THREE.Vector3(0, 1, 0), sizeScale);
  }

  bloodHit(point, dir) {
    // Directional exit spray: dark stretched streaks continuing through
    this.particles.emit({
      pos: point.clone().addScaledVector(dir, 0.06),
      count: 9,
      vel: dir.clone().multiplyScalar(5.2),
      spread: 1.9,
      life: [0.22, 0.48],
      size: [0.05, 0.028],
      color0: new THREE.Color(0.3, 0.02, 0.01),
      color1: new THREE.Color(0.13, 0.008, 0.004),
      alpha: 0.92,
      gravity: 13, drag: 0.8, floor: 0.02,
      fadeOutStart: 0.55, stretch: 0.055, lenMax: 0.9,
    });
    // Heavier droplets arcing down
    this.particles.emit({
      pos: point.clone(),
      count: 5,
      vel: dir.clone().multiplyScalar(2.2),
      spread: 1.4,
      life: [0.28, 0.55],
      size: [0.05, 0.03],
      color0: new THREE.Color(0.26, 0.015, 0.008),
      alpha: 0.9,
      gravity: 11, drag: 0.6, floor: 0.02,
      fadeOutStart: 0.6, tex: 0,
    });
    // Fine mist that settles quickly (tasteful, dark)
    this.particles.emit({
      pos: point.clone().addScaledVector(dir, 0.04),
      count: 6,
      vel: dir.clone().multiplyScalar(1.1),
      spread: 0.8,
      life: [0.22, 0.5],
      size: [0.14, 0.42], sizeEase: 0.6,
      color0: new THREE.Color(0.3, 0.012, 0.006),
      color1: new THREE.Color(0.14, 0.008, 0.005),
      alpha: 0.6,
      gravity: 2.8, drag: 2.4,
      fadeIn: 0.03, fadeOutStart: 0.3, tex: 3,
    });
  }
}
