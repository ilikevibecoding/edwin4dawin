// Vehicles: moving voxel structures (space train, ships, turbolift cabs) that players and NPCs can stand on and walk
// inside while they move. This file is the integration point the rest of the engine talks to:
//   - `collectBoxes(region, out)` adds the world-space collision boxes of vehicle blocks inside `region`
//     (called from the player's collision sampling after the world blocks),
//   - `carry(entity)` moves an entity that is riding a vehicle by the vehicle's displacement since the last tick
//     (called at the start of the entity's physics tick),
//   - `tick()` advances every vehicle on the shared 20 TPS clock, `update(dt, alpha)` interpolates the meshes.
// The concrete Vehicle class, the train/ships and their paths live in the other files of this folder.
import { AABB } from '../player.js';

export class VehicleManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.tickCount = 0;
  }

  add(v) { this.list.push(v); if (v.onAdd) v.onAdd(this.game); return v; }
  remove(v) { const i = this.list.indexOf(v); if (i >= 0) { this.list.splice(i, 1); if (v.onRemove) v.onRemove(this.game); } }

  // World-space AABBs of solid vehicle cells intersecting `region` (an AABB). Vehicles implement `collectBoxes`.
  collectBoxes(region, out) {
    for (const v of this.list) {
      if (!v.collectBoxes) continue;
      const b = v.bounds; // world-space AABB of the whole vehicle at its current pose, or null
      if (b && (b.x1 < region.x0 || b.x0 > region.x1 || b.y1 < region.y0 || b.y0 > region.y1 || b.z1 < region.z0 || b.z0 > region.z1)) continue;
      v.collectBoxes(region, out);
    }
    return out;
  }

  // Entities standing on / inside a vehicle move with it. Vehicles implement `carry(entity)`; they decide whether the
  // entity is riding (feet resting on a vehicle cell) and displace it by their own delta since the previous tick.
  carry(entity) { for (const v of this.list) if (v.carry) v.carry(entity); }

  // Nearest vehicle whose world AABB the ray (origin, unit dir) enters within maxDist: { vehicle, dist, point } or
  // null. Vehicles that want right-click interaction implement `onUse(player, game, hit)` (ships: boarding).
  raycast(origin, dir, maxDist = 6) {
    let best = null;
    for (const v of this.list) {
      if (!v.onUse) continue;
      const b = v.bounds;
      if (!b) continue;
      let t0 = 0, t1 = maxDist;
      for (const [o, d, lo, hi] of [[origin.x, dir.x, b.x0, b.x1], [origin.y, dir.y, b.y0, b.y1], [origin.z, dir.z, b.z0, b.z1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { t0 = Infinity; break; } continue; }
        let ta = (lo - o) / d, tb = (hi - o) / d;
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) { t0 = Infinity; break; }
      }
      if (t0 === Infinity || t0 > maxDist) continue;
      if (!best || t0 < best.dist) best = { vehicle: v, dist: t0, point: { x: origin.x + dir.x * t0, y: origin.y + dir.y * t0, z: origin.z + dir.z * t0 } };
    }
    return best;
  }

  tick() { this.tickCount++; for (const v of this.list) if (v.tick) v.tick(this.tickCount); }
  update(dt, alpha, camera) { for (const v of this.list) if (v.update) v.update(dt, alpha, camera); }

  static aabb(x0, y0, z0, x1, y1, z1) { return new AABB(x0, y0, z0, x1, y1, z1); }
}
