import * as THREE from "three";
import { PLAYER } from "./layout.js";

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.helpers = [];
  }

  addBox(min, max, label = "") {
    this.boxes.push({
      min: min.clone(),
      max: max.clone(),
      label,
    });
  }

  addAABB(cx, cy, cz, w, h, d, label = "") {
    this.addBox(
      new THREE.Vector3(cx - w * 0.5, cy - h * 0.5, cz - d * 0.5),
      new THREE.Vector3(cx + w * 0.5, cy + h * 0.5, cz + d * 0.5),
      label
    );
  }

  resolve(pos, radius = PLAYER.radius, height = PLAYER.height) {
    const feet = pos.y;
    const head = pos.y + height;
    let x = pos.x;
    let z = pos.z;
    for (let pass = 0; pass < 3; pass++) {
      for (const b of this.boxes) {
        if (head < b.min.y || feet > b.max.y) continue;
        const nearestX = Math.max(b.min.x, Math.min(x, b.max.x));
        const nearestZ = Math.max(b.min.z, Math.min(z, b.max.z));
        const dx = x - nearestX;
        const dz = z - nearestZ;
        const dist2 = dx * dx + dz * dz;
        if (dist2 >= radius * radius) continue;
        if (dist2 < 1e-8) {
          const left = Math.abs(x - b.min.x);
          const right = Math.abs(b.max.x - x);
          const front = Math.abs(z - b.min.z);
          const back = Math.abs(b.max.z - z);
          const m = Math.min(left, right, front, back);
          if (m === left) x = b.min.x - radius;
          else if (m === right) x = b.max.x + radius;
          else if (m === front) z = b.min.z - radius;
          else z = b.max.z + radius;
        } else {
          const dist = Math.sqrt(dist2);
          const push = (radius - dist) / dist;
          x += dx * push;
          z += dz * push;
        }
      }
    }
    pos.x = x;
    pos.z = z;
    return pos;
  }

  hits(pos, radius = PLAYER.radius, height = PLAYER.height) {
    const feet = pos.y;
    const head = pos.y + height;
    for (const b of this.boxes) {
      if (head < b.min.y || feet > b.max.y) continue;
      const nx = Math.max(b.min.x, Math.min(pos.x, b.max.x));
      const nz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  insideHull(x, y, radius, hullRadius, centerY) {
    const dx = x;
    const dy = y + 0.9 - centerY;
    return Math.hypot(dx, dy) + radius < hullRadius - 0.05;
  }
}
