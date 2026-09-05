// A vehicle is a moving voxel structure: its own block grid, a pose on the shared tick clock (position + yaw in
// multiples of 90 degrees, so collision stays axis-aligned), one mesh built once from the grid, and the "carry"
// rule that moves whatever stands on it or inside it by exactly its per-tick displacement.
//
// Timing model (20 TPS, render interpolation). `tick()` runs before the entities' physics: `prev` is the pose the
// entity saw while finishing its previous tick, `cur` the pose for this tick. `carry(entity)` (called at the very
// start of the entity's physics) decides whether the entity rides at `prev` and translates it by cur - prev, so the
// entity's own physics then collides against the vehicle at `cur`. Because the player copies prevPos *after* the
// carry, the camera sees the vehicle at `cur` for the whole tick while the mesh interpolates prev -> cur; `update`
// therefore pulls the camera back by (1 - alpha) * delta while the player rides: camera and mesh use the same
// interpolated pose, the outside world scrolls smoothly, nothing jitters.
import * as THREE from 'three';
import { BLOCKS } from '../blocks.js';
import { AABB } from '../player.js';
import { buildVoxelMesh } from './voxelMesh.js';

const SUPPORT_EPS = 0.05;    // feet within this distance above a vehicle cell top count as resting on it
const TELEPORT_DIST = 6;     // a rider that jumped further than this since the last tick was teleported, not thrown off

// yaw quadrant helpers (yaw = k * 90 degrees; rotation about +y like the player's yaw)
function quadrant(yaw) { return ((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4; }
function rotQ(q, dx, dz, out) {
  switch (q) {
    case 0: out[0] = dx; out[1] = dz; break;
    case 1: out[0] = dz; out[1] = -dx; break;
    case 2: out[0] = -dx; out[1] = -dz; break;
    default: out[0] = -dz; out[1] = dx; break;
  }
  return out;
}
function invRotQ(q, dx, dz, out) { return rotQ((4 - q) % 4, dx, dz, out); }

export class Vehicle {
  // grid: VoxelGrid (or { w, h, d, get }); origin: grid-space point that sits at the pose position;
  // interiors: grid-space volumes [{ x0, y0, z0, x1, y1, z1 }] (x1/y1/z1 exclusive) whose occupants ride even when
  // airborne (jumping inside a car); emissive: block-light floor for the mesh material.
  constructor({ grid, origin = { x: 0, y: 0, z: 0 }, interiors = [], emissive = 0, name = 'vehicle' } = {}) {
    this.name = name;
    this.grid = grid;
    this.origin = origin;
    this.interiors = interiors;
    this.emissive = emissive;
    this.prev = { x: 0, y: 0, z: 0, yaw: 0 };
    this.cur = { x: 0, y: 0, z: 0, yaw: 0 };
    this.bounds = null;          // world AABB at `cur`
    this.game = null;
    this.mesh = null;
    this.meshes = [];
    this.riders = new Map();     // entity -> { dx, dy, dz, x, y, z } (last displacement, position after it)
    this.shoveTick = new Map();  // entity -> last tick the moving hull pushed it (damage only on first contact)
    this.playerCarried = false;  // the local player was displaced this tick
    this.playerDelta = new THREE.Vector3();
    this._tmp = [0, 0];
    this._light = [1, 0];
  }

  // Pose at a tick: { x, y, z, yaw }. Subclasses override (schedules, paths); the default is static.
  pose(tick) { return this.cur; }

  onAdd(game) {
    this.game = game;
    const p = this.pose(game.vehicles ? game.vehicles.tickCount : 0);
    Object.assign(this.prev, p); Object.assign(this.cur, p);
    this.updateBounds();
    this.buildMeshes();
    this.placeMeshes(1);
  }
  onRemove(game) {
    for (const m of this.meshes) { game.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.meshes = []; this.mesh = null;
  }

  buildMeshes() {
    this.mesh = buildVoxelMesh(this.grid, this.game.atlas, { emissive: this.emissive });
    this.mesh.name = this.name;
    this.game.scene.add(this.mesh);
    this.meshes = [this.mesh];
  }

  // ---------------------------------------------------------------- transforms
  // grid-space point -> world at pose
  toWorld(gx, gy, gz, pose, out) {
    const r = rotQ(quadrant(pose.yaw), gx - this.origin.x, gz - this.origin.z, this._tmp);
    out.x = pose.x + r[0]; out.y = pose.y + (gy - this.origin.y); out.z = pose.z + r[1];
    return out;
  }
  // world point -> grid space at pose
  toGrid(wx, wy, wz, pose, out) {
    const r = invRotQ(quadrant(pose.yaw), wx - pose.x, wz - pose.z, this._tmp);
    out.x = r[0] + this.origin.x; out.y = wy - pose.y + this.origin.y; out.z = r[1] + this.origin.z;
    return out;
  }
  // grid-space box -> world AABB at pose (axis aligned for 90 degree yaws)
  boxToWorld(x0, y0, z0, x1, y1, z1, pose, out) {
    const a = this.toWorld(x0, y0, z0, pose, { x: 0, y: 0, z: 0 });
    const b = this.toWorld(x1, y1, z1, pose, { x: 0, y: 0, z: 0 });
    out.x0 = Math.min(a.x, b.x); out.x1 = Math.max(a.x, b.x);
    out.y0 = Math.min(a.y, b.y); out.y1 = Math.max(a.y, b.y);
    out.z0 = Math.min(a.z, b.z); out.z1 = Math.max(a.z, b.z);
    return out;
  }
  boxToGrid(box, pose, out) {
    const a = this.toGrid(box.x0, box.y0, box.z0, pose, { x: 0, y: 0, z: 0 });
    const b = this.toGrid(box.x1, box.y1, box.z1, pose, { x: 0, y: 0, z: 0 });
    out.x0 = Math.min(a.x, b.x); out.x1 = Math.max(a.x, b.x);
    out.y0 = Math.min(a.y, b.y); out.y1 = Math.max(a.y, b.y);
    out.z0 = Math.min(a.z, b.z); out.z1 = Math.max(a.z, b.z);
    return out;
  }

  updateBounds() {
    const g = this.grid;
    this.bounds = this.boxToWorld(0, 0, 0, g.w, g.h, g.d, this.cur, this.bounds || new AABB(0, 0, 0, 0, 0, 0));
  }

  // ---------------------------------------------------------------- simulation
  tick(tickCount) {
    Object.assign(this.prev, this.cur);
    Object.assign(this.cur, this.pose(tickCount));
    this.updateBounds();
    this.playerCarried = false;
  }

  // World-space collision boxes of the solid cells intersecting `region` (world AABB) at the current pose.
  collectBoxes(region, out) {
    const g = this.grid, pose = this.cur;
    const r = this.boxToGrid(region, pose, { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 });
    const x0 = Math.max(0, Math.floor(r.x0)), x1 = Math.min(g.w - 1, Math.floor(r.x1));
    const y0 = Math.max(0, Math.floor(r.y0)), y1 = Math.min(g.h - 1, Math.floor(r.y1));
    const z0 = Math.max(0, Math.floor(r.z0)), z1 = Math.min(g.d - 1, Math.floor(r.z1));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
      const id = g.get(x, y, z);
      if (id === 0) continue;
      const def = BLOCKS[id];
      if (!def.solid) continue;
      for (const b of def.boxes) out.push(this.boxToWorld(x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5], pose, new AABB(0, 0, 0, 0, 0, 0)));
    }
    return out;
  }

  // Does an entity with world box `box` and feet position `pos` ride this vehicle at `pose`?
  // Either its feet rest on a solid cell (contact from above within SUPPORT_EPS) or its feet point is inside an
  // interior volume (so a jump inside a car keeps it aboard).
  isRiding(box, pos, pose) {
    const g = this.grid;
    const p = this.toGrid(pos.x, pos.y, pos.z, pose, { x: 0, y: 0, z: 0 });
    for (const v of this.interiors) {
      if (p.x >= v.x0 && p.x < v.x1 && p.z >= v.z0 && p.z < v.z1 && p.y >= v.y0 - SUPPORT_EPS && p.y < v.y1) return true;
    }
    const r = this.boxToGrid(box, pose, { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 });
    if (r.x1 <= 0 || r.x0 >= g.w || r.z1 <= 0 || r.z0 >= g.d || r.y0 > g.h + 1 || r.y1 < 0) return false;
    const x0 = Math.max(0, Math.floor(r.x0)), x1 = Math.min(g.w - 1, Math.floor(r.x1 - 1e-6));
    const z0 = Math.max(0, Math.floor(r.z0)), z1 = Math.min(g.d - 1, Math.floor(r.z1 - 1e-6));
    const y0 = Math.max(0, Math.floor(r.y0 - SUPPORT_EPS - 1)), y1 = Math.min(g.h - 1, Math.floor(r.y0 + 1e-3));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) {
      const id = g.get(x, y, z);
      if (id === 0) continue;
      const def = BLOCKS[id];
      if (!def.solid) continue;
      for (const b of def.boxes) {
        const top = y + b[4];
        const gap = r.y0 - top;
        if (gap < -1e-3 || gap > SUPPORT_EPS) continue;
        if (r.x0 < x + b[3] - 1e-6 && r.x1 > x + b[0] + 1e-6 && r.z0 < z + b[5] - 1e-6 && r.z1 > z + b[2] + 1e-6) return true;
      }
    }
    return false;
  }

  static boxOf(entity) {
    if (entity.box) return entity.box;
    const hw = (entity.width || 0.6) / 2, h = entity.height || 1.8, p = entity.pos;
    return new AABB(p.x - hw, p.y, p.z - hw, p.x + hw, p.y + h, p.z + hw);
  }

  // Called at the start of an entity's physics tick (see the timing note at the top of the file).
  carry(entity) {
    const pos = entity.pos;
    if (!pos) return;
    const was = this.riders.get(entity);
    // cheap reject: far from the vehicle (at either pose)
    const b = this.bounds;
    if (!was && b && (pos.x < b.x0 - 4 || pos.x > b.x1 + 4 || pos.z < b.z0 - 4 || pos.z > b.z1 + 4 || pos.y < b.y0 - 4 || pos.y > b.y1 + 4)) return;
    const riding = this.isRiding(Vehicle.boxOf(entity), pos, this.prev);
    if (riding) {
      const l = this.toGrid(pos.x, pos.y, pos.z, this.prev, { x: 0, y: 0, z: 0 });
      const n = this.toWorld(l.x, l.y, l.z, this.cur, { x: 0, y: 0, z: 0 });
      const dx = n.x - pos.x, dy = n.y - pos.y, dz = n.z - pos.z;
      if (this.worldBlocks(entity, n)) {
        // the world is in the way (a roof rider meeting a station canopy): the rider stays and the vehicle moves on
        this.riders.delete(entity);
        if (entity.vehicle === this) entity.vehicle = null;
        return;
      }
      pos.set(n.x, n.y, n.z);
      const dyaw = this.cur.yaw - this.prev.yaw;
      if (dyaw !== 0 && typeof entity.yaw === 'number') entity.yaw += dyaw;
      if (was) { was.dx = dx; was.dy = dy; was.dz = dz; was.x = n.x; was.y = n.y; was.z = n.z; }
      else this.riders.set(entity, { dx, dy, dz, x: n.x, y: n.y, z: n.z });
      entity.vehicle = this;
      if (this.game && entity === this.game.player) { this.playerDelta.set(dx, dy, dz); this.playerCarried = true; }
    } else if (was) {
      // left the vehicle: keep its momentum (blocks/tick, the entities' velocity unit) unless teleported away
      const moved = Math.hypot(pos.x - was.x, pos.y - was.y, pos.z - was.z);
      if (entity.vel && moved < TELEPORT_DIST) { entity.vel.x += was.dx; entity.vel.z += was.dz; if (was.dy > 0) entity.vel.y += was.dy; }
      this.riders.delete(entity);
      if (entity.vehicle === this) entity.vehicle = null;
    } else if (this.moving()) {
      this.shove(entity);
    }
  }

  moving() { const p = this.prev, c = this.cur; return p.x !== c.x || p.y !== c.y || p.z !== c.z || p.yaw !== c.yaw; }

  // Would the entity's box at `at` intersect a solid world block (not counting this vehicle)?
  worldBlocks(entity, at) {
    const world = this.game && this.game.world;
    if (!world) return false;
    const hw = (entity.width || 0.6) / 2 - 0.02, h = (entity.height || 1.8) - 0.02;
    for (const [ox, oz] of [[-hw, -hw], [hw, -hw], [-hw, hw], [hw, hw]]) for (const oy of [0.02, h * 0.5, h]) {
      const d = BLOCKS[world.getBlock(Math.floor(at.x + ox), Math.floor(at.y + oy), Math.floor(at.z + oz))];
      if (d && d.solid) return true;
    }
    return false;
  }

  // Does the entity's box intersect a solid cell of the vehicle at the current pose?
  overlapsEntity(box) {
    const out = this.collectBoxes(box, []);
    for (const b of out) if (b.x0 < box.x1 && b.x1 > box.x0 && b.y0 < box.y1 && b.y1 > box.y0 && b.z0 < box.z1 && b.z1 > box.z0) return true;
    return false;
  }

  // The vehicle moved into an entity that is not riding it (standing on the track as the train arrives): push the
  // entity ahead of it along the motion, like a moving wall; an entity pinned against the world is lifted onto the
  // roof instead of being left inside the hull. Small pushes (bumping a door frame while walking inside) are absorbed.
  shove(entity) {
    const pos = entity.pos, hw = (entity.width || 0.6) / 2, h = entity.height || 1.8;
    const box = new AABB(pos.x - hw, pos.y, pos.z - hw, pos.x + hw, pos.y + h, pos.z + hw);
    if (!this.overlapsEntity(box)) return;
    const l = this.toGrid(pos.x, pos.y, pos.z, this.prev, { x: 0, y: 0, z: 0 });
    const n = this.toWorld(l.x, l.y, l.z, this.cur, { x: 0, y: 0, z: 0 });
    let dx = n.x - pos.x, dz = n.z - pos.z;
    const speed = Math.hypot(dx, dz);
    if (speed < 1e-6) return;                        // rotating / vertical only: leave the entity alone
    dx /= speed; dz /= speed;
    const world = this.game && this.game.world;
    const solidAt = (x, y, z) => { if (!world) return false; const d = BLOCKS[world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]; return !!(d && d.solid); };
    const sx = pos.x, sz = pos.z;
    let clear = false;
    for (let i = 0; i < 40 && !clear; i++) {
      pos.x += dx * 0.25; pos.z += dz * 0.25;
      box.x0 = pos.x - hw; box.x1 = pos.x + hw; box.z0 = pos.z - hw; box.z1 = pos.z + hw;
      if (solidAt(pos.x, pos.y + 0.5, pos.z) || solidAt(pos.x, pos.y + h - 0.2, pos.z)) break;   // pinned against the world
      clear = !this.overlapsEntity(box);
    }
    if (!clear) {
      // lift onto the roof above the original column
      pos.x = sx; pos.z = sz;
      const b = this.bounds;
      let top = b ? b.y1 : pos.y + 3;
      pos.y = top + 0.01;
      if (entity.vel) entity.vel.y = Math.max(entity.vel.y || 0, 0);
    }
    // first contact hurts a little (a train hit you); while it keeps pushing you there is no further damage
    if (entity.vel) { entity.vel.x += dx * speed; entity.vel.z += dz * speed; }
    if (entity.onGround !== undefined) entity.onGround = false;
    const tick = this.game ? this.game.tickCount || 0 : 0, last = this.shoveTick.get(entity);
    this.shoveTick.set(entity, tick);
    if (this.game && entity === this.game.player && typeof entity.damage === 'function' && speed > 0.35 && (last === undefined || tick - last > 20)) entity.damage(2);
  }

  // ---------------------------------------------------------------- rendering
  placeMeshes(alpha) {
    const p = this.prev, c = this.cur;
    const x = p.x + (c.x - p.x) * alpha, y = p.y + (c.y - p.y) * alpha, z = p.z + (c.z - p.z) * alpha;
    let dyaw = c.yaw - p.yaw;
    dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
    const yaw = p.yaw + dyaw * alpha;
    // mesh local origin is grid cell (0,0,0): position = pose - R(yaw) * origin
    const o = this.origin, s = Math.sin(yaw), co = Math.cos(yaw);
    const ox = o.x * co + o.z * s, oz = -o.x * s + o.z * co;
    for (const m of this.meshes) { m.position.set(x - ox, y - o.y, z - oz); m.rotation.y = yaw; }
  }

  update(dt, alpha, camera) {
    if (!this.meshes.length) return;
    this.placeMeshes(alpha);
    const world = this.game && this.game.world;
    if (world) {
      const g = this.grid, c = this.toWorld(g.w / 2, g.h / 2, g.d / 2, this.cur, { x: 0, y: 0, z: 0 });
      const l = world.sampleLight(c.x, c.y, c.z);
      for (const m of this.meshes) m.material.uniforms.uLight.value.set(l[0], l[1]);
    }
    if (this.playerCarried && camera) camera.position.addScaledVector(this.playerDelta, alpha - 1);
  }

  // Convenience for tests/HUD: world position of a grid-space point at the current pose.
  gridToWorld(gx, gy, gz) { return this.toWorld(gx, gy, gz, this.cur, { x: 0, y: 0, z: 0 }); }
  worldToGrid(wx, wy, wz) { return this.toGrid(wx, wy, wz, this.cur, { x: 0, y: 0, z: 0 }); }
  isPlayerRiding() { return this.game ? this.riders.has(this.game.player) : false; }
}
