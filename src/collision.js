import { Box3, Vector3 } from 'three';

const _min = new Vector3();
const _max = new Vector3();
const _pos = new Vector3();

export class CollisionWorld {
  constructor() {
    this.boxes = [];
  }

  addBox(x, y, z, w, h, d) {
    this.boxes.push({
      min: new Vector3(x - w * 0.5, y - h * 0.5, z - d * 0.5),
      max: new Vector3(x + w * 0.5, y + h * 0.5, z + d * 0.5),
    });
  }

  addAABB(min, max) {
    this.boxes.push({
      min: min.clone(),
      max: max.clone(),
    });
  }

  addBox3(box) {
    this.boxes.push({ min: box.min.clone(), max: box.max.clone() });
  }

  resolve(position, radius, height) {
    _pos.copy(position);
    const y0 = 0.02;
    const y1 = height;
    let hit = false;
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (y1 < b.min.y || y0 > b.max.y) continue;
      const nearestX = Math.max(b.min.x, Math.min(_pos.x, b.max.x));
      const nearestZ = Math.max(b.min.z, Math.min(_pos.z, b.max.z));
      let dx = _pos.x - nearestX;
      let dz = _pos.z - nearestZ;
      const dist2 = dx * dx + dz * dz;
      if (dist2 >= radius * radius) continue;
      hit = true;
      if (dist2 < 1e-8) {
        const left = Math.abs(_pos.x - b.min.x);
        const right = Math.abs(b.max.x - _pos.x);
        const back = Math.abs(_pos.z - b.min.z);
        const fwd = Math.abs(b.max.z - _pos.z);
        const m = Math.min(left, right, back, fwd);
        if (m === left) _pos.x = b.min.x - radius;
        else if (m === right) _pos.x = b.max.x + radius;
        else if (m === back) _pos.z = b.min.z - radius;
        else _pos.z = b.max.z + radius;
      } else {
        const dist = Math.sqrt(dist2);
        const push = (radius - dist) / dist;
        _pos.x += dx * push;
        _pos.z += dz * push;
      }
    }
    position.copy(_pos);
    return hit;
  }

  overlaps(position, radius, height) {
    const y0 = 0.02;
    const y1 = height;
    for (const b of this.boxes) {
      if (y1 < b.min.y || y0 > b.max.y) continue;
      const nx = Math.max(b.min.x, Math.min(position.x, b.max.x));
      const nz = Math.max(b.min.z, Math.min(position.z, b.max.z));
      const dx = position.x - nx;
      const dz = position.z - nz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  debugBox3s() {
    return this.boxes.map((b) => new Box3(b.min, b.max));
  }
}

export function wallCollidersForHull(world, z0, z1, radius, centerY, inset = 0.08) {
  const half = Math.sqrt(Math.max(0, radius * radius - centerY * centerY)) - inset;
  const midZ = (z0 + z1) * 0.5;
  const len = z1 - z0;
  world.addBox(-half - 0.25, 1.0, midZ, 0.5, 2.2, len);
  world.addBox(half + 0.25, 1.0, midZ, 0.5, 2.2, len);
}
