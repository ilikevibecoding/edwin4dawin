import * as THREE from 'three';
import { LAYOUT, hullXAtHeight } from './layout.js';

export class ColliderWorld {
  constructor() {
    this.boxes = [];
    this.zMin = LAYOUT.hullZMin + 0.35;
    this.zMax = LAYOUT.hullZMax - 0.45;
  }

  addBox(cx, cy, cz, w, h, d, label = '') {
    this.boxes.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minY: cy - h / 2,
      maxY: cy + h / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
      label,
    });
  }

  addAABB(minX, maxX, minY, maxY, minZ, maxZ, label = '') {
    this.boxes.push({ minX, maxX, minY, maxY, minZ, maxZ, label });
  }

  resolve(pos, radius, height) {
    const eye = pos.y;
    const feet = eye - LAYOUT.eyeHeight;
    const bodyY = feet + height * 0.45;

    const maxX = Math.max(0.18, hullXAtHeight(bodyY, 0.16));
    if (pos.x > maxX - radius) pos.x = maxX - radius;
    if (pos.x < -maxX + radius) pos.x = -maxX + radius;
    if (pos.z > this.zMax) pos.z = this.zMax;
    if (pos.z < this.zMin) pos.z = this.zMin;

    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (feet + 0.15 > b.maxY || eye < b.minY) continue;
      const nearestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      const nearestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - nearestX;
      const dz = pos.z - nearestZ;
      const dist2 = dx * dx + dz * dz;
      if (dist2 < radius * radius) {
        const dist = Math.sqrt(dist2) || 0.0001;
        const push = (radius - dist) / dist;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }

    pos.y = LAYOUT.eyeHeight;
    return pos;
  }

  hits(pos, radius) {
    for (const b of this.boxes) {
      const nearestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
      const nearestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - nearestX;
      const dz = pos.z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }
}
