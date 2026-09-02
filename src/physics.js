import * as THREE from 'three';
import { HALF } from './config.js';
import { segmentAABB } from './utils.js';

const BUCKET = 8;

/**
 * Spatial registry of every collidable "solid" (built structures, trees, rocks, cars,
 * containers) plus terrain queries and raycasting.
 *
 * A solid looks like:
 * {
 *   kind, material, hp, maxHp,
 *   boxes: [{minX,minY,minZ,maxX,maxY,maxZ, noStand?}],   // world-space AABBs used for collision
 *   ramp: null | {minX,minZ,maxX,maxZ,y0,dir},              // walkable slope descriptor
 *   bounds: AABB,                                            // union used for bucketing / LOS
 *   mesh: THREE.Object3D, hitMeshes: [THREE.Mesh],           // hitMeshes are raycast targets
 *   blocksShots: bool
 * }
 */
export class World {
  constructor(heightFn) {
    this.heightAt = heightFn;
    this.buckets = new Map();
    this.solids = new Set();
    this.raycastTargets = [];
    this.raycaster = new THREE.Raycaster();
    this._id = 1;
    this._stamp = 0;
    this._tmp = [];
    this._tmp2 = [];
  }

  _key(bx, bz) {
    return (bx + 1000) * 4096 + (bz + 1000);
  }

  addSolid(s) {
    s.id = this._id++;
    this.solids.add(s);
    const b = s.bounds;
    const x0 = Math.floor(b.minX / BUCKET);
    const x1 = Math.floor(b.maxX / BUCKET);
    const z0 = Math.floor(b.minZ / BUCKET);
    const z1 = Math.floor(b.maxZ / BUCKET);
    s._buckets = [];
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const k = this._key(x, z);
        let arr = this.buckets.get(k);
        if (!arr) {
          arr = [];
          this.buckets.set(k, arr);
        }
        arr.push(s);
        s._buckets.push(arr);
      }
    }
    if (s.hitMeshes) {
      for (const m of s.hitMeshes) {
        m.userData.solid = s;
        this.raycastTargets.push(m);
      }
    }
    return s;
  }

  removeSolid(s) {
    if (!this.solids.has(s)) return;
    this.solids.delete(s);
    for (const arr of s._buckets) {
      const i = arr.indexOf(s);
      if (i >= 0) arr.splice(i, 1);
    }
    s._buckets = [];
    if (s.hitMeshes) {
      for (const m of s.hitMeshes) this.removeRaycastTarget(m);
    }
  }

  addRaycastTarget(m) {
    this.raycastTargets.push(m);
  }

  removeRaycastTarget(m) {
    const i = this.raycastTargets.indexOf(m);
    if (i >= 0) this.raycastTargets.splice(i, 1);
  }

  /** All solids whose bounds may overlap the XZ rectangle. */
  query(minX, minZ, maxX, maxZ, out = this._tmp) {
    out.length = 0;
    const x0 = Math.floor(minX / BUCKET);
    const x1 = Math.floor(maxX / BUCKET);
    const z0 = Math.floor(minZ / BUCKET);
    const z1 = Math.floor(maxZ / BUCKET);
    const stamp = ++this._stamp;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const arr = this.buckets.get(this._key(x, z));
        if (!arr) continue;
        for (const s of arr) {
          if (s._stamp === stamp) continue;
          s._stamp = stamp;
          out.push(s);
        }
      }
    }
    return out;
  }

  /** Height of a ramp's walking surface at (x, z), or null when outside its footprint. */
  static rampHeight(ramp, x, z) {
    if (x < ramp.minX || x > ramp.maxX || z < ramp.minZ || z > ramp.maxZ) return null;
    const size = ramp.maxX - ramp.minX;
    let t;
    switch (ramp.dir) {
      case 0: t = (x - ramp.minX) / size; break;
      case 1: t = (z - ramp.minZ) / size; break;
      case 2: t = (ramp.maxX - x) / size; break;
      default: t = (ramp.maxZ - z) / size; break;
    }
    return ramp.y0 + size * Math.min(1, Math.max(0, t));
  }

  /** Highest standable surface under (x, z) for an entity with feet at `feetY`. */
  groundAt(x, z, feetY, radius, step) {
    let ground = this.heightAt(x, z);
    const solids = this.query(x - radius, z - radius, x + radius, z + radius, this._tmp2);
    for (const s of solids) {
      if (s.ramp) {
        const y = World.rampHeight(s.ramp, x, z);
        if (y !== null && y <= feetY + step && y > ground) ground = y;
      }
      for (const b of s.boxes) {
        if (b.noStand) continue;
        if (x + radius <= b.minX || x - radius >= b.maxX || z + radius <= b.minZ || z - radius >= b.maxZ) continue;
        if (b.maxY <= feetY + step && b.maxY > ground) ground = b.maxY;
      }
    }
    return ground;
  }

  /**
   * Integrates an entity ({pos (feet), vel, radius, height, step, onGround}) by dt and
   * resolves collisions against solids and terrain.
   */
  resolveEntity(e, dt) {
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    e.pos.z += e.vel.z * dt;
    const lim = HALF - 1;
    if (e.pos.x > lim) e.pos.x = lim;
    if (e.pos.x < -lim) e.pos.x = -lim;
    if (e.pos.z > lim) e.pos.z = lim;
    if (e.pos.z < -lim) e.pos.z = -lim;

    const r = e.radius;
    const solids = this.query(e.pos.x - r - 0.6, e.pos.z - r - 0.6, e.pos.x + r + 0.6, e.pos.z + r + 0.6, this._tmp);

    // 1) horizontal push-out
    for (let iter = 0; iter < 2; iter++) {
      const feet = e.pos.y;
      const head = feet + e.height;
      for (const s of solids) {
        for (const b of s.boxes) {
          if (e.pos.x + r <= b.minX || e.pos.x - r >= b.maxX || e.pos.z + r <= b.minZ || e.pos.z - r >= b.maxZ) continue;
          if (b.noStand) {
            if (b.maxY <= feet || b.minY >= head) continue;
          } else {
            if (b.maxY <= feet + e.step) continue; // low enough to step on
            if (b.minY >= feet + e.height * 0.6) continue; // overhead
          }
          const px1 = b.maxX - (e.pos.x - r);
          const px2 = e.pos.x + r - b.minX;
          const pz1 = b.maxZ - (e.pos.z - r);
          const pz2 = e.pos.z + r - b.minZ;
          const mx = Math.min(px1, px2);
          const mz = Math.min(pz1, pz2);
          if (mx < mz) e.pos.x += px1 < px2 ? px1 : -px2;
          else e.pos.z += pz1 < pz2 ? pz1 : -pz2;
        }
      }
    }

    // 2) ground / ceiling
    const feet = e.pos.y;
    const head = feet + e.height;
    let ground = this.heightAt(e.pos.x, e.pos.z);
    let ceiling = Infinity;
    e.groundSolid = null;
    for (const s of solids) {
      if (s.ramp) {
        const y = World.rampHeight(s.ramp, e.pos.x, e.pos.z);
        if (y !== null && y <= feet + e.step && y > ground) {
          ground = y;
          e.groundSolid = s;
        }
      }
      for (const b of s.boxes) {
        if (e.pos.x + r <= b.minX || e.pos.x - r >= b.maxX || e.pos.z + r <= b.minZ || e.pos.z - r >= b.maxZ) continue;
        if (b.noStand) continue;
        if (b.maxY <= feet + e.step) {
          if (b.maxY > ground) {
            ground = b.maxY;
            e.groundSolid = s;
          }
        } else if (b.minY >= feet + e.height * 0.6 && b.minY < head && b.minY < ceiling) {
          ceiling = b.minY;
        }
      }
    }
    if (e.pos.y <= ground) {
      e.pos.y = ground;
      if (e.vel.y < 0) e.vel.y = 0;
      e.onGround = true;
    } else {
      e.onGround = false;
      e.groundSolid = null;
    }
    if (ceiling < Infinity && e.pos.y + e.height > ceiling) {
      e.pos.y = ceiling - e.height;
      if (e.vel.y > 0) e.vel.y = 0;
    }
  }

  /**
   * Ray vs. everything. `filter(object)` may reject meshes (e.g. the shooter's own body).
   * Returns {kind:'terrain'|'solid'|'bot', point, distance, normal?, solid?, bot?, part?} or null.
   */
  raycast(origin, dir, maxDist, filter) {
    this.raycaster.set(origin, dir);
    this.raycaster.near = 0;
    this.raycaster.far = maxDist;
    const hits = this.raycaster.intersectObjects(this.raycastTargets, false);
    let best = null;
    let bestSolid = null;
    for (const h of hits) {
      if (filter && !filter(h.object)) continue;
      const ud = h.object.userData;
      let solid = ud.solid || null;
      if (ud.pool) {
        // instanced part: resolve the instance slot; decorative parts (foliage) don't stop shots
        solid = ud.pool.slots[h.instanceId];
        if (!solid) continue;
      }
      best = h;
      bestSolid = solid;
      break;
    }
    const limit = best ? best.distance : maxDist;
    const t = this.terrainRay(origin, dir, limit);
    if (t !== null) {
      return { kind: 'terrain', distance: t, point: origin.clone().addScaledVector(dir, t), normal: new THREE.Vector3(0, 1, 0) };
    }
    if (best) {
      const ud = best.object.userData;
      let normal = null;
      if (best.face) normal = best.face.normal.clone().transformDirection(best.object.matrixWorld);
      return {
        kind: ud.bot ? 'bot' : ud.player ? 'player' : 'solid',
        bot: ud.bot || null,
        solid: bestSolid,
        part: ud.part || null,
        distance: best.distance,
        point: best.point,
        normal,
        object: best.object,
      };
    }
    return null;
  }

  /** Marches along a ray to find the terrain intersection distance, or null. */
  terrainRay(origin, dir, maxDist) {
    if (origin.y < this.heightAt(origin.x, origin.z)) return null;
    let step = 0.5;
    let t = 0;
    let prev = 0;
    while (t < maxDist) {
      t = Math.min(maxDist, t + step);
      const x = origin.x + dir.x * t;
      const y = origin.y + dir.y * t;
      const z = origin.z + dir.z * t;
      if (Math.abs(x) > HALF + 40 || Math.abs(z) > HALF + 40) return null;
      if (y > 40 && dir.y >= 0) return null;
      if (y < this.heightAt(x, z)) {
        let lo = prev;
        let hi = t;
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) * 0.5;
          const my = origin.y + dir.y * mid;
          if (my < this.heightAt(origin.x + dir.x * mid, origin.z + dir.z * mid)) hi = mid;
          else lo = mid;
        }
        return hi;
      }
      prev = t;
      if (t > 25) step = 1.25;
      if (t > 120) step = 3;
      if (t >= maxDist) break;
    }
    return null;
  }

  /** Cheap AABB line-of-sight test used by bots. Returns {solid, t} of first blocker or null. */
  segmentSolid(ax, ay, az, bx, by, bz, ignore) {
    const solids = this.query(Math.min(ax, bx) - 1, Math.min(az, bz) - 1, Math.max(ax, bx) + 1, Math.max(az, bz) + 1, this._tmp2);
    let bestT = Infinity;
    let bestS = null;
    for (const s of solids) {
      if (!s.blocksShots) continue;
      if (ignore && ignore(s)) continue;
      const t = segmentAABB(ax, ay, az, bx, by, bz, s.bounds);
      if (t !== null && t < bestT) {
        bestT = t;
        bestS = s;
      }
    }
    return bestS ? { solid: bestS, t: bestT } : null;
  }
}
