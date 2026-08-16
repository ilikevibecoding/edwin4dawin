// Capsule-vs-AABB collision with step assist + hull clamp. Owner: player agent (with lead).
// The player is a vertical capsule: feet at (x, feetY, z), radius r, eye at feetY + 1.7.

import { HULL, DECK, PLAYER, floorHalfWidth, Z } from './layout.js';

const boxes = []; // {minX,minY,minZ,maxX,maxY,maxZ, walkable, name}

export function addBox(min, max, opts = {}) {
  boxes.push({
    minX: Math.min(min[0], max[0]), minY: Math.min(min[1], max[1]), minZ: Math.min(min[2], max[2]),
    maxX: Math.max(min[0], max[0]), maxY: Math.max(min[1], max[1]), maxZ: Math.max(min[2], max[2]),
    walkable: !!opts.walkable, name: opts.name || '',
  });
}

import * as THREE from 'three';
const _b = new THREE.Box3();

export function addBoxFromObject(obj, pad = 0, opts = {}) {
  obj.updateWorldMatrix(true, true);
  _b.setFromObject(obj);
  if (!isFinite(_b.min.x)) return;
  addBox([_b.min.x - pad, _b.min.y - pad, _b.min.z - pad], [_b.max.x + pad, _b.max.y + pad, _b.max.z + pad], opts);
}

export function getBoxes() { return boxes; }

// Base deck height (stairs into the engine room are a ramp zone)
export function deckHeightAt(z) {
  if (z < DECK.stepZ0) return DECK.mainY;
  if (z > DECK.stepZ1) return DECK.engineY;
  const t = (z - DECK.stepZ0) / (DECK.stepZ1 - DECK.stepZ0);
  return DECK.mainY + (DECK.engineY - DECK.mainY) * t;
}

export function groundHeightAt(x, z, feetY) {
  let g = deckHeightAt(z);
  for (const b of boxes) {
    if (!b.walkable) continue;
    if (x < b.minX - 0.05 || x > b.maxX + 0.05 || z < b.minZ - 0.05 || z > b.maxZ + 0.05) continue;
    if (b.maxY <= feetY + PLAYER.stepUp && b.maxY > g) g = b.maxY;
  }
  return g;
}

// Push a circle (x,z,r) out of blocking boxes that overlap the capsule's height span.
export function resolveHorizontal(pos, r, feetY) {
  const top = feetY + 1.75;
  for (let pass = 0; pass < 3; pass++) {
    let pushed = false;
    for (const b of boxes) {
      // vertical overlap check; walkable boxes low enough to step onto don't block
      const stepOk = b.maxY <= feetY + PLAYER.stepUp;
      if (b.walkable && stepOk) continue;
      if (b.maxY <= feetY + (stepOk ? PLAYER.stepUp : 0.02) || b.minY >= top) continue;
      // closest point on box to circle center
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * r;
        pos.z = cz + (dz / d) * r;
      } else {
        // center inside box: push along smallest exit
        const exits = [
          { d: pos.x - b.minX + r, x: -1, z: 0 },
          { d: b.maxX - pos.x + r, x: 1, z: 0 },
          { d: pos.z - b.minZ + r, x: 0, z: -1 },
          { d: b.maxZ - pos.z + r, x: 0, z: 1 },
        ].sort((a, c) => a.d - c.d)[0];
        pos.x += exits.x * exits.d;
        pos.z += exits.z * exits.d;
      }
      pushed = true;
    }
    if (!pushed) break;
  }
  // hull clamp: keep capsule feet inside floor width for this z, and inside z bounds
  const deckY = deckHeightAt(pos.z);
  const half = floorHalfWidth(deckY) - r - 0.04;
  if (pos.x > half) pos.x = half;
  if (pos.x < -half) pos.x = -half;
  if (pos.z < Z.controlStart + 0.45) pos.z = Z.controlStart + 0.45;
  if (pos.z > Z.engineEnd - 0.4) pos.z = Z.engineEnd - 0.4;
}

export function clearBoxes() { boxes.length = 0; }
