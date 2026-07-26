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
    // Dust puff (surface-colored)
    const dustColor = surface === 'metal' ? new THREE.Color(0.5, 0.5, 0.52) : new THREE.Color(0.62, 0.55, 0.44);
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.05),
      count: 6,
      vel: out.clone().multiplyScalar(1.6),
      spread: 1.1,
      life: [0.4, 0.9],
      size: [0.14, 0.55],
      color0: dustColor, color1: dustColor.clone().multiplyScalar(0.8),
      alpha: 0.5,
      gravity: 0.4, drag: 2.2,
      fadeOutStart: 0.25,
    });
    // Chips
    this.particles.emit({
      pos: point.clone().addScaledVector(out, 0.03),
      count: 5,
      vel: out.clone().multiplyScalar(3.4),
      spread: 2.4,
      life: [0.25, 0.6],
      size: [0.03, 0.02],
      color0: dustColor.clone().multiplyScalar(1.15),
      alpha: 0.95,
      gravity: 9.5, drag: 0.4,
      floor: 0.02,
      fadeOutStart: 0.7,
    });
    // Sparks on metal
    if (surface === 'metal') {
      this.particles.emit({
        pos: point.clone().addScaledVector(out, 0.03),
        count: 9,
        vel: out.clone().multiplyScalar(4.5),
        spread: 3.4,
        life: [0.12, 0.4],
        size: [0.045, 0.012],
        color0: new THREE.Color(1.0, 0.85, 0.45).multiplyScalar(3.2),
        color1: new THREE.Color(1.0, 0.4, 0.1).multiplyScalar(1.6),
        alpha: 1,
        gravity: 7, drag: 0.2,
        additive: true,
        fadeOutStart: 0.5,
      });
    }
  }

  scorch(point, sizeScale = 1) {
    this.scorches.place(point, new THREE.Vector3(0, 1, 0), sizeScale);
  }

  bloodHit(point, dir) {
    const back = dir.clone().multiplyScalar(-1);
    this.particles.emit({
      pos: point.clone(),
      count: 10,
      vel: back.multiplyScalar(1.2),
      spread: 1.7,
      life: [0.2, 0.5],
      size: [0.09, 0.22],
      color0: new THREE.Color(0.32, 0.02, 0.01),
      color1: new THREE.Color(0.16, 0.01, 0.005),
      alpha: 0.85,
      gravity: 5, drag: 1.2,
      fadeOutStart: 0.35,
    });
    this.particles.emit({
      pos: point.clone(),
      count: 4,
      vel: back.clone().multiplyScalar(0.4),
      spread: 0.8,
      life: [0.3, 0.65],
      size: [0.25, 0.5],
      color0: new THREE.Color(0.28, 0.02, 0.01),
      alpha: 0.4,
      gravity: 1.2, drag: 1.5,
      fadeOutStart: 0.3,
    });
  }
}
