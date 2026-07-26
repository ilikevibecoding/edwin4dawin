import * as THREE from 'three';

// ===========================================================================
// Lightweight bespoke physics: vertical-capsule vs AABB world colliders,
// ray vs AABB for ballistics/LOS. No external engine — deterministic + fast.
// ===========================================================================

const _closest = new THREE.Vector3();
const _center = new THREE.Vector3();
const _delta = new THREE.Vector3();

export class WorldPhysics {
  constructor(colliders) {
    this.colliders = colliders; // THREE.Box3[]
  }

  /**
   * Resolve a vertical capsule (feet at pos.y) against the world.
   * Returns { onGround, standingHeight }.
   * Capsule approximated by spheres along its axis; supports stepping onto
   * low obstacles (curbs, rubble) up to stepHeight.
   */
  collideCapsule(pos, radius, height, stepHeight = 0.35) {
    let onGround = false;

    // Ground plane
    if (pos.y < 0) { pos.y = 0; onGround = true; }

    for (let iter = 0; iter < 3; iter++) {
      let any = false;
      for (const box of this.colliders) {
        // Broad phase
        if (pos.x + radius < box.min.x || pos.x - radius > box.max.x) continue;
        if (pos.z + radius < box.min.z || pos.z - radius > box.max.z) continue;
        if (pos.y > box.max.y || pos.y + height < box.min.y) continue;

        // Step-up: if box top is low enough above feet, treat as floor
        const topDelta = box.max.y - pos.y;
        if (topDelta > 0 && topDelta <= stepHeight) {
          // Only if we're horizontally overlapping the box interior enough
          const inX = pos.x > box.min.x - radius * 0.4 && pos.x < box.max.x + radius * 0.4;
          const inZ = pos.z > box.min.z - radius * 0.4 && pos.z < box.max.z + radius * 0.4;
          if (inX && inZ) { pos.y = box.max.y; onGround = true; continue; }
        }

        // Sample spheres along capsule axis
        const samples = 3;
        for (let s = 0; s < samples; s++) {
          const sy = pos.y + radius + (height - 2 * radius) * (s / (samples - 1));
          _center.set(pos.x, sy, pos.z);
          _closest.copy(_center).clamp(box.min, box.max);
          _delta.subVectors(_center, _closest);
          const distSq = _delta.lengthSq();
          if (distSq < radius * radius) {
            let dist = Math.sqrt(distSq);
            if (dist < 1e-6) {
              // Center inside the box: push out along smallest penetration axis
              const dxMin = _center.x - box.min.x, dxMax = box.max.x - _center.x;
              const dzMin = _center.z - box.min.z, dzMax = box.max.z - _center.z;
              const m = Math.min(dxMin, dxMax, dzMin, dzMax);
              if (m === dxMin) pos.x = box.min.x - radius;
              else if (m === dxMax) pos.x = box.max.x + radius;
              else if (m === dzMin) pos.z = box.min.z - radius;
              else pos.z = box.max.z + radius;
            } else {
              const push = (radius - dist) / dist;
              // Horizontal-only push for wall-like contacts, vertical for floors
              if (Math.abs(_delta.y) > Math.abs(_delta.x) + Math.abs(_delta.z)) {
                if (_delta.y > 0) { pos.y += _delta.y * push; onGround = true; }
                else { pos.y += _delta.y * push; }
              } else {
                pos.x += _delta.x * push;
                pos.z += _delta.z * push;
              }
            }
            any = true;
          }
        }
      }
      if (!any) break;
    }
    return { onGround };
  }

  /**
   * Raycast against world AABBs + ground plane.
   * Returns { point, normal, dist } or null.
   */
  raycast(origin, dir, maxDist = 300) {
    let best = maxDist;
    let bestNormal = null;

    // Ground plane y=0
    if (dir.y < -1e-6) {
      const t = -origin.y / dir.y;
      if (t > 0 && t < best) { best = t; bestNormal = _UP; }
    }

    for (const box of this.colliders) {
      const t = rayBox(origin, dir, box, best);
      if (t !== null && t < best) {
        best = t;
        bestNormal = boxNormalAt(origin, dir, t, box);
      }
    }

    if (bestNormal === null) return null;
    const point = origin.clone().addScaledVector(dir, best);
    return { point, normal: bestNormal.clone(), dist: best };
  }

  /** Line-of-sight check: returns true if segment A->B is unobstructed. */
  lineOfSight(a, b) {
    _delta.subVectors(b, a);
    const dist = _delta.length();
    if (dist < 1e-4) return true;
    _delta.divideScalar(dist);
    for (const box of this.colliders) {
      const t = rayBox(a, _delta, box, dist);
      if (t !== null && t < dist - 0.05) return false;
    }
    return true;
  }
}

const _UP = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();

// Slab method ray-vs-AABB. Returns t or null.
export function rayBox(origin, dir, box, maxDist) {
  let tmin = 0, tmax = maxDist;
  for (const axis of ['x', 'y', 'z']) {
    const d = dir[axis];
    const o = origin[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < box.min[axis] || o > box.max[axis]) return null;
    } else {
      const inv = 1 / d;
      let t1 = (box.min[axis] - o) * inv;
      let t2 = (box.max[axis] - o) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }
  return tmin > 0 ? tmin : null;
}

function boxNormalAt(origin, dir, t, box) {
  const px = origin.x + dir.x * t;
  const py = origin.y + dir.y * t;
  const pz = origin.z + dir.z * t;
  const eps = 1e-3;
  _n.set(0, 0, 0);
  if (Math.abs(px - box.min.x) < eps) _n.set(-1, 0, 0);
  else if (Math.abs(px - box.max.x) < eps) _n.set(1, 0, 0);
  else if (Math.abs(py - box.min.y) < eps) _n.set(0, -1, 0);
  else if (Math.abs(py - box.max.y) < eps) _n.set(0, 1, 0);
  else if (Math.abs(pz - box.min.z) < eps) _n.set(0, 0, -1);
  else _n.set(0, 0, 1);
  return _n;
}
