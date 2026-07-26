import * as THREE from 'three';
import { WORLD_BOUNDS } from './layout.js';

/**
 * Static collision world.
 * Owner: Opus 2 (movement response), maintained with Fable 2 (proxy authoring).
 *
 * Architecture in this game is axis aligned, so movement uses a uniform-grid
 * broadphase over AABBs plus swept axis resolution with automatic step-up.
 * That is far more predictable for a tactical shooter than a mesh solver: no
 * catching on tread nosings, no jitter in door frames, no tunnelling.
 *
 * Bullet, vision and interaction rays use BVH-accelerated raycasts against the
 * merged render meshes instead, so they respect the real silhouette.
 */

const CELL = 4;

export class CollisionWorld {
  constructor() {
    this.boxes = [];
    this.grid = new Map();
    this.dynamic = [];
    this.raycastTargets = [];
    this._ignored = null;
    this._ray = new THREE.Raycaster();
    this._ray.firstHitOnly = true;
  }

  clear() {
    this.boxes.length = 0;
    this.grid.clear();
    this.dynamic.length = 0;
    this.raycastTargets.length = 0;
  }

  static key(cx, cz) {
    return cx * 100003 + cz;
  }

  add(b) {
    if (b.x1 - b.x0 < 1e-4 || b.y1 - b.y0 < 1e-4 || b.z1 - b.z0 < 1e-4) return;
    const idx = this.boxes.length;
    this.boxes.push(b);
    const cx0 = Math.floor(b.x0 / CELL);
    const cx1 = Math.floor(b.x1 / CELL);
    const cz0 = Math.floor(b.z0 / CELL);
    const cz1 = Math.floor(b.z1 / CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const k = CollisionWorld.key(cx, cz);
        let arr = this.grid.get(k);
        if (!arr) { arr = []; this.grid.set(k, arr); }
        arr.push(idx);
      }
    }
  }

  addAll(list) {
    for (const b of list) this.add(b);
  }

  /** Dynamic blockers (open/closed doors) are re-evaluated every query. */
  addDynamic(provider) {
    this.dynamic.push(provider);
  }

  /**
   * Tags ignored by every query while set. The navigation bake uses this to
   * treat doors as passable: an agent that can open a door must be able to path
   * through it, otherwise the graph splits into one component per room and the
   * whole interior becomes unreachable from outside.
   */
  setIgnoredTags(tags) {
    this._ignored = tags && tags.length ? new Set(tags) : null;
  }

  query(x0, y0, z0, x1, y1, z1, out = []) {
    out.length = 0;
    const cx0 = Math.floor(x0 / CELL);
    const cx1 = Math.floor(x1 / CELL);
    const cz0 = Math.floor(z0 / CELL);
    const cz1 = Math.floor(z1 / CELL);
    const seen = new Set();
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) {
        const arr = this.grid.get(CollisionWorld.key(cx, cz));
        if (!arr) continue;
        for (const i of arr) {
          if (seen.has(i)) continue;
          seen.add(i);
          const b = this.boxes[i];
          if (b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1 || b.z1 < z0 || b.z0 > z1) continue;
          if (this._ignored && this._ignored.has(b.tag)) continue;
          out.push(b);
        }
      }
    }
    for (const provider of this.dynamic) {
      const list = provider();
      for (const b of list) {
        if (b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1 || b.z1 < z0 || b.z0 > z1) continue;
        if (this._ignored && this._ignored.has(b.tag)) continue;
        out.push(b);
      }
    }
    return out;
  }

  /** True if the axis-aligned capsule footprint overlaps solid geometry. */
  overlaps(x, y, z, radius, height, ignoreTag = null) {
    const list = this.query(x - radius, y + 0.02, z - radius, x + radius, y + height, z + radius);
    for (const b of list) {
      if (ignoreTag && b.tag === ignoreTag) continue;
      if (b.noClip) continue;
      return true;
    }
    return false;
  }

  /**
   * Move a vertical capsule from `pos` by `delta` with per-axis resolution and
   * step-up. Returns the resolved position plus contact flags.
   */
  moveCapsule(pos, delta, radius, height, stepHeight = 0.32) {
    const out = { x: pos.x, y: pos.y, z: pos.z, grounded: false, hitWall: false, hitCeiling: false, groundSurface: 'concrete', stepped: 0 };
    const scratch = [];

    const solidAt = (px, py, pz, feetLift = 0) => {
      this.query(px - radius, py + 0.03 + feetLift, pz - radius, px + radius, py + height, pz + radius, scratch);
      return scratch.length > 0 ? scratch : null;
    };

    // ---- Horizontal, one axis at a time so sliding along walls feels clean
    const tryAxis = (axis, amount) => {
      if (Math.abs(amount) < 1e-6) return;
      const nx = axis === 'x' ? out.x + amount : out.x;
      const nz = axis === 'z' ? out.z + amount : out.z;
      if (!solidAt(nx, out.y, nz)) {
        out.x = nx; out.z = nz;
        return;
      }
      // Step up over low obstacles (kerbs, treads, thresholds)
      let highest = -Infinity;
      this.query(nx - radius, out.y + 0.03, nz - radius, nx + radius, out.y + height, nz + radius, scratch);
      for (const b of scratch) highest = Math.max(highest, b.y1);
      const rise = highest - out.y;
      if (rise > 0.001 && rise <= stepHeight && !solidAt(nx, highest + 0.02, nz)) {
        out.x = nx; out.z = nz; out.y = highest + 0.001;
        out.stepped = rise;
        return;
      }
      out.hitWall = true;
    };

    tryAxis('x', delta.x);
    tryAxis('z', delta.z);

    // ---- Vertical
    if (delta.y !== 0) {
      const ny = out.y + delta.y;
      if (delta.y < 0) {
        this.query(out.x - radius, ny, out.z - radius, out.x + radius, out.y + 0.05, out.z + radius, scratch);
        let top = -Infinity;
        let surf = 'concrete';
        for (const b of scratch) {
          if (b.y1 <= out.y + 0.06 && b.y1 > top) { top = b.y1; surf = b.surface ?? 'concrete'; }
        }
        if (top > -Infinity && ny <= top) {
          out.y = top;
          out.grounded = true;
          out.groundSurface = surf;
        } else {
          out.y = ny;
        }
      } else {
        this.query(out.x - radius, out.y + height, out.z - radius, out.x + radius, ny + height, out.z + radius, scratch);
        let bottom = Infinity;
        for (const b of scratch) if (b.y0 >= out.y + height - 0.02) bottom = Math.min(bottom, b.y0);
        if (bottom < Infinity && ny + height >= bottom) {
          out.y = bottom - height - 0.001;
          out.hitCeiling = true;
        } else {
          out.y = ny;
        }
      }
    }

    // ---- Ground probe (needed even when not falling, for slope/stair contact)
    if (!out.grounded) {
      this.query(out.x - radius, out.y - 0.12, out.z - radius, out.x + radius, out.y + 0.06, out.z + radius, scratch);
      let top = -Infinity;
      let surf = 'concrete';
      for (const b of scratch) {
        if (b.y1 <= out.y + 0.06 && b.y1 > top) { top = b.y1; surf = b.surface ?? 'concrete'; }
      }
      if (top > -Infinity && out.y - top < 0.12) {
        out.y = top;
        out.grounded = true;
        out.groundSurface = surf;
      }
    }

    // ---- Keep everything inside the world
    out.x = Math.min(WORLD_BOUNDS.x1 - 1, Math.max(WORLD_BOUNDS.x0 + 1, out.x));
    out.z = Math.min(WORLD_BOUNDS.z1 - 1, Math.max(WORLD_BOUNDS.z0 + 1, out.z));
    if (out.y < -3) { out.y = 0; }
    return out;
  }

  /** Height of the solid surface directly under a point, or null. */
  groundAt(x, z, fromY = 12, radius = 0.05) {
    const scratch = this.query(x - radius, -4, z - radius, x + radius, fromY, z + radius);
    let top = -Infinity;
    let surf = null;
    for (const b of scratch) {
      if (b.tag === 'ceiling' || b.tag === 'wall') continue;
      if (b.y1 <= fromY + 0.01 && b.y1 > top) { top = b.y1; surf = b.surface; }
    }
    return top === -Infinity ? null : { y: top, surface: surf };
  }

  /* ---------------- Raycasting ---------------- */

  registerRaycastTarget(obj) {
    if (obj && !this.raycastTargets.includes(obj)) this.raycastTargets.push(obj);
  }

  unregisterRaycastTarget(obj) {
    const i = this.raycastTargets.indexOf(obj);
    if (i >= 0) this.raycastTargets.splice(i, 1);
  }

  /** Nearest hit along a ray. Returns { point, normal, distance, object, matName }. */
  raycast(origin, direction, maxDistance = 200, extraTargets = null) {
    this._ray.set(origin, direction);
    this._ray.far = maxDistance;
    this._ray.near = 0.01;
    const targets = extraTargets ? this.raycastTargets.concat(extraTargets) : this.raycastTargets;
    const hits = this._ray.intersectObjects(targets, true);
    for (const h of hits) {
      if (h.object.userData?.noHit) continue;
      if (h.object.visible === false) continue;
      const matName = h.object.userData?.matName ?? h.object.material?.name ?? '';
      return {
        point: h.point,
        normal: h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0),
        distance: h.distance,
        object: h.object,
        matName,
      };
    }
    return null;
  }

  /** Cheap opaque line-of-sight test used by AI vision (ignores glass). */
  lineOfSight(from, to, ignore = null) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist < 0.01) return true;
    dir.divideScalar(dist);
    this._ray.set(from, dir);
    this._ray.far = dist - 0.05;
    this._ray.near = 0.02;
    const hits = this._ray.intersectObjects(this.raycastTargets, true);
    for (const h of hits) {
      if (h.object === ignore) continue;
      if (h.object.userData?.transparentToSight) continue;
      if (h.object.visible === false) continue;
      return false;
    }
    return true;
  }

  stats() {
    return { boxes: this.boxes.length, cells: this.grid.size, rayTargets: this.raycastTargets.length };
  }
}

export const collision = new CollisionWorld();

// Exposed for the QA/diagnostic tooling only.
if (typeof window !== 'undefined') window.__nsCollision = collision;
