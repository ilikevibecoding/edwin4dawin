import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWheelDust() {
  const n = 56;
  const positions = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const drift = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    life[i] = 0;
    positions[i * 3] = 0;
    positions[i * 3 + 1] = -2;
    positions[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: PALETTE.dirtDry,
    size: 0.16,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.name = 'wheel-dust';
  points.frustumCulled = false;
  let cursor = 0;

  function spawn(speed) {
    const i = cursor++ % n;
    const side = i % 2 === 0 ? 0.78 : -0.78;
    positions[i * 3] = side + (Math.random() - 0.5) * 0.2;
    positions[i * 3 + 1] = 0.12 + Math.random() * 0.08;
    positions[i * 3 + 2] = -1.35 + (Math.random() - 0.5) * 0.25;
    drift[i * 3] = (Math.random() - 0.5) * 0.35;
    drift[i * 3 + 1] = 0.35 + Math.random() * 0.45;
    drift[i * 3 + 2] = -Math.abs(speed) * 0.08 - 0.2;
    life[i] = 1;
  }

  function update(dt, speed) {
    const moving = Math.abs(speed) > 1.1;
    mat.opacity = moving ? 0.3 : 0.0;
    if (moving) {
      const rate = Math.min(28, 6 + Math.abs(speed) * 1.6);
      const bursts = Math.min(3, Math.floor(rate * dt + Math.random() * 0.4));
      for (let b = 0; b < bursts; b++) spawn(speed);
    }
    for (let i = 0; i < n; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt * 1.35;
      positions[i * 3] += drift[i * 3] * dt;
      positions[i * 3 + 1] += drift[i * 3 + 1] * dt;
      positions[i * 3 + 2] += drift[i * 3 + 2] * dt;
      drift[i * 3 + 1] -= 0.55 * dt;
      if (life[i] <= 0) positions[i * 3 + 1] = -2;
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { mesh: points, update };
}
