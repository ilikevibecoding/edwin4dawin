import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import { invDir, rayAabb } from './Geometry';
import { resolveMeta } from './StaticWorld';

/**
 * Colliders that move: character hitboxes, doors, vehicles, breakable props.
 *
 * These cannot live in the static soup because their transform changes every
 * frame, so each is kept as an oriented box taken from its geometry bounds.
 * That is exact for the box hitboxes used by characters and props, and cheap
 * enough that a bullet trace can test dozens of them.
 *
 * Broadphase is a uniform grid on the XZ plane. Rays walk it with a 2D DDA so a
 * long trace only visits the cells it actually crosses, and `overlapSphere`
 * visits the cells inside the blast radius rather than every object.
 */

const CELL_SIZE = 4;
const CELL_KEY_MASK = 0xffff;

export interface DynamicHit {
  distance: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  slot: number;
}

interface Collider {
  object: THREE.Object3D;
  group: number;
  surface: SurfaceKind;
  damageScale: number;
  entityId: number;
  penetration: number;
  blocksSight: boolean;
  /** Local-space bounds of the collider, from its geometry. */
  lmin: THREE.Vector3;
  lmax: THREE.Vector3;
  /** Cached world AABB and inverse transform, refreshed once per frame. */
  wmin: THREE.Vector3;
  wmax: THREE.Vector3;
  inv: THREE.Matrix4;
  active: boolean;
}

const _corner = new THREE.Vector3();
const _lo = new THREE.Vector3();
const _ld = new THREE.Vector3();
const _n = new THREE.Vector3();
const _box = new THREE.Box3();

export class DynamicSet {
  private slots: (Collider | null)[] = [];
  private free: number[] = [];
  private byObject = new Map<THREE.Object3D, number>();
  private stamp = new Int32Array(64);
  private ignoreStamp = new Int32Array(64);
  private queryStamp = 1;
  private cells = new Map<number, number[]>();
  private stale = true;
  private minX = 0;
  private minY = 0;
  private minZ = 0;
  private maxX = 0;
  private maxY = 0;
  private maxZ = 0;
  private liveCount = 0;

  get count(): number {
    return this.liveCount;
  }

  add(object: THREE.Object3D): void {
    if (this.byObject.has(object)) {
      this.refreshLocalBounds(this.slots[this.byObject.get(object)!]!);
      return;
    }
    const meta = resolveMeta(object);
    const group = meta.group ?? Groups.PROP;
    const collider: Collider = {
      object,
      group,
      surface: (meta.surface as SurfaceKind | undefined) ?? 'concrete',
      damageScale: meta.damageScale ?? 1,
      entityId: meta.entityId ?? -1,
      penetration: meta.penetration ?? 0.05,
      blocksSight: (group & (Groups.GLASS | Groups.WATER | Groups.TRIGGER)) === 0,
      lmin: new THREE.Vector3(-0.25, -0.25, -0.25),
      lmax: new THREE.Vector3(0.25, 0.25, 0.25),
      wmin: new THREE.Vector3(),
      wmax: new THREE.Vector3(),
      inv: new THREE.Matrix4(),
      active: true,
    };
    this.refreshLocalBounds(collider);

    const slot = this.free.length > 0 ? this.free.pop()! : this.slots.length;
    if (slot >= this.slots.length) this.slots.push(collider);
    else this.slots[slot] = collider;
    this.byObject.set(object, slot);
    this.liveCount++;
    if (this.stamp.length <= slot) {
      const s = new Int32Array(this.slots.length * 2);
      s.set(this.stamp);
      this.stamp = s;
      const g = new Int32Array(this.slots.length * 2);
      g.set(this.ignoreStamp);
      this.ignoreStamp = g;
    }
    this.stale = true;
  }

  remove(object: THREE.Object3D): void {
    const slot = this.byObject.get(object);
    if (slot === undefined) return;
    this.slots[slot] = null;
    this.free.push(slot);
    this.byObject.delete(object);
    this.liveCount--;
    this.stale = true;
  }

  has(object: THREE.Object3D): boolean {
    return this.byObject.has(object);
  }

  colliderAt(slot: number): Collider | null {
    return this.slots[slot] ?? null;
  }

  /** Marks cached transforms stale; called once per frame. */
  markStale(): void {
    this.stale = true;
  }

  private refreshLocalBounds(collider: Collider): void {
    const mesh = collider.object as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox;
      if (bb) {
        collider.lmin.copy(bb.min);
        collider.lmax.copy(bb.max);
        return;
      }
    }
    // Groups and empties fall back to the union of their descendants.
    _box.makeEmpty();
    let found = false;
    collider.object.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      if (!bb) return;
      found = true;
      _box.expandByPoint(bb.min);
      _box.expandByPoint(bb.max);
    });
    if (found) {
      collider.lmin.copy(_box.min);
      collider.lmax.copy(_box.max);
    }
  }

  /** Recomputes world bounds, inverse matrices and the broadphase grid. */
  ensureFresh(): void {
    if (!this.stale) return;
    this.stale = false;
    this.cells.clear();
    this.minX = Infinity;
    this.minY = Infinity;
    this.minZ = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
    this.maxZ = -Infinity;
    const walkParents = this.liveCount < 2048;

    for (let slot = 0; slot < this.slots.length; slot++) {
      const c = this.slots[slot];
      if (!c) continue;
      if (!c.object.parent && c.object.type !== 'Scene') {
        // Detached from the scene graph: drop it silently.
        this.slots[slot] = null;
        this.free.push(slot);
        this.byObject.delete(c.object);
        this.liveCount--;
        continue;
      }
      if (walkParents) c.object.updateWorldMatrix(true, false);
      c.inv.copy(c.object.matrixWorld).invert();

      let minx = Infinity;
      let miny = Infinity;
      let minz = Infinity;
      let maxx = -Infinity;
      let maxy = -Infinity;
      let maxz = -Infinity;
      for (let i = 0; i < 8; i++) {
        _corner.set(
          i & 1 ? c.lmax.x : c.lmin.x,
          i & 2 ? c.lmax.y : c.lmin.y,
          i & 4 ? c.lmax.z : c.lmin.z,
        );
        _corner.applyMatrix4(c.object.matrixWorld);
        if (_corner.x < minx) minx = _corner.x;
        if (_corner.y < miny) miny = _corner.y;
        if (_corner.z < minz) minz = _corner.z;
        if (_corner.x > maxx) maxx = _corner.x;
        if (_corner.y > maxy) maxy = _corner.y;
        if (_corner.z > maxz) maxz = _corner.z;
      }
      c.wmin.set(minx, miny, minz);
      c.wmax.set(maxx, maxy, maxz);

      if (minx < this.minX) this.minX = minx;
      if (miny < this.minY) this.minY = miny;
      if (minz < this.minZ) this.minZ = minz;
      if (maxx > this.maxX) this.maxX = maxx;
      if (maxy > this.maxY) this.maxY = maxy;
      if (maxz > this.maxZ) this.maxZ = maxz;

      const cx0 = Math.floor(minx / CELL_SIZE);
      const cx1 = Math.floor(maxx / CELL_SIZE);
      const cz0 = Math.floor(minz / CELL_SIZE);
      const cz1 = Math.floor(maxz / CELL_SIZE);
      // A collider spanning a huge number of cells would flood the grid; such
      // objects belong in the static soup, so clamp the footprint.
      const spanX = Math.min(cx1 - cx0, 32);
      const spanZ = Math.min(cz1 - cz0, 32);
      for (let gz = 0; gz <= spanZ; gz++) {
        for (let gx = 0; gx <= spanX; gx++) {
          const key = cellKey(cx0 + gx, cz0 + gz);
          let list = this.cells.get(key);
          if (!list) {
            list = [];
            this.cells.set(key, list);
          }
          list.push(slot);
        }
      }
    }
  }

  beginQuery(ignore?: readonly THREE.Object3D[] | null): number {
    if (this.queryStamp > 0x3fffffff) {
      this.stamp.fill(0);
      this.ignoreStamp.fill(0);
      this.queryStamp = 1;
    }
    const stamp = ++this.queryStamp;
    if (ignore && ignore.length > 0 && this.byObject.size > 0) {
      for (const obj of ignore) {
        if (!obj) continue;
        const direct = this.byObject.get(obj);
        if (direct !== undefined) this.ignoreStamp[direct] = stamp;
        if (obj.children.length > 0) {
          obj.traverse((child) => {
            const slot = this.byObject.get(child);
            if (slot !== undefined) this.ignoreStamp[slot] = stamp;
          });
        }
      }
    }
    return stamp;
  }

  /**
   * Exact ray/oriented-box test against one collider.
   * Returns the world-space entry distance or -1.
   */
  private hitCollider(
    c: Collider,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    out: DynamicHit,
  ): number {
    const e = c.inv.elements;
    _lo.set(ox, oy, oz).applyMatrix4(c.inv);
    // Direction transform without normalising, so `t` stays in world units.
    _ld.set(
      e[0] * dx + e[4] * dy + e[8] * dz,
      e[1] * dx + e[5] * dy + e[9] * dz,
      e[2] * dx + e[6] * dy + e[10] * dz,
    );

    const invx = invDir(_ld.x);
    const invy = invDir(_ld.y);
    const invz = invDir(_ld.z);
    let t0 = (c.lmin.x - _lo.x) * invx;
    let t1 = (c.lmax.x - _lo.x) * invx;
    let tmin = t0 < t1 ? t0 : t1;
    let tmax = t0 < t1 ? t1 : t0;
    let axis = 0;
    let sign = t0 < t1 ? -1 : 1;

    t0 = (c.lmin.y - _lo.y) * invy;
    t1 = (c.lmax.y - _lo.y) * invy;
    let lo = t0 < t1 ? t0 : t1;
    let hi = t0 < t1 ? t1 : t0;
    if (lo > tmin) {
      tmin = lo;
      axis = 1;
      sign = t0 < t1 ? -1 : 1;
    }
    if (hi < tmax) tmax = hi;

    t0 = (c.lmin.z - _lo.z) * invz;
    t1 = (c.lmax.z - _lo.z) * invz;
    lo = t0 < t1 ? t0 : t1;
    hi = t0 < t1 ? t1 : t0;
    if (lo > tmin) {
      tmin = lo;
      axis = 2;
      sign = t0 < t1 ? -1 : 1;
    }
    if (hi < tmax) tmax = hi;

    if (tmax < 0 || tmin > tmax) return -1;
    const t = tmin < 0 ? 0 : tmin;
    if (t > maxDist) return -1;

    out.distance = t;
    out.point.set(ox + dx * t, oy + dy * t, oz + dz * t);
    _n.set(axis === 0 ? sign : 0, axis === 1 ? sign : 0, axis === 2 ? sign : 0);
    // Rotate the local face normal into world space; the inverse transpose of
    // the inverse matrix is the forward matrix, so use its rows.
    const w = c.object.matrixWorld.elements;
    out.normal
      .set(
        w[0] * _n.x + w[4] * _n.y + w[8] * _n.z,
        w[1] * _n.x + w[5] * _n.y + w[9] * _n.z,
        w[2] * _n.x + w[6] * _n.y + w[10] * _n.z,
      )
      .normalize();
    if (out.normal.x * dx + out.normal.y * dy + out.normal.z * dz > 0) out.normal.negate();
    return t;
  }

  /** Nearest dynamic collider along a ray. Returns the slot or -1. */
  raycast(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
    out: DynamicHit,
    scratch: DynamicHit,
  ): number {
    if (this.liveCount === 0) return -1;
    this.ensureFresh();
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    if (
      rayAabb(
        ox, oy, oz, invx, invy, invz,
        this.minX, this.minY, this.minZ, this.maxX, this.maxY, this.maxZ,
        maxDist,
      ) < 0
    ) {
      return -1;
    }

    const visitStamp = ++this.queryStamp;
    let best = maxDist;
    let bestSlot = -1;

    // 2D DDA across the grid, clipped to the current best distance.
    let cx = Math.floor(ox / CELL_SIZE);
    let cz = Math.floor(oz / CELL_SIZE);
    const stepX = dx > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(CELL_SIZE / dx) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(CELL_SIZE / dz) : Infinity;
    let tMaxX =
      dx !== 0 ? ((dx > 0 ? (cx + 1) * CELL_SIZE - ox : ox - cx * CELL_SIZE) / Math.abs(dx)) : Infinity;
    let tMaxZ =
      dz !== 0 ? ((dz > 0 ? (cz + 1) * CELL_SIZE - oz : oz - cz * CELL_SIZE) / Math.abs(dz)) : Infinity;

    let travelled = 0;
    let guard = 0;
    while (travelled <= best && guard++ < 4096) {
      const list = this.cells.get(cellKey(cx, cz));
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const slot = list[i];
          if (this.stamp[slot] === visitStamp) continue;
          this.stamp[slot] = visitStamp;
          const c = this.slots[slot];
          if (!c || !c.active) continue;
          if ((c.group & mask) === 0) continue;
          if (this.ignoreStamp[slot] === stamp) continue;
          if (
            rayAabb(
              ox, oy, oz, invx, invy, invz,
              c.wmin.x, c.wmin.y, c.wmin.z, c.wmax.x, c.wmax.y, c.wmax.z,
              best,
            ) < 0
          ) {
            continue;
          }
          const t = this.hitCollider(c, ox, oy, oz, dx, dy, dz, best, scratch);
          if (t >= 0 && t < best) {
            best = t;
            bestSlot = slot;
            out.distance = scratch.distance;
            out.point.copy(scratch.point);
            out.normal.copy(scratch.normal);
            out.slot = slot;
          }
        }
      }
      if (tMaxX < tMaxZ) {
        travelled = tMaxX;
        cx += stepX;
        tMaxX += tDeltaX;
      } else {
        travelled = tMaxZ;
        cz += stepZ;
        tMaxZ += tDeltaZ;
      }
      if (!isFinite(travelled)) break;
    }
    return bestSlot;
  }

  /** Every dynamic hit along a ray, appended through a visitor. */
  raycastAll(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
    scratch: DynamicHit,
    visit: (slot: number, hit: DynamicHit) => void,
  ): void {
    if (this.liveCount === 0) return;
    this.ensureFresh();
    const visitStamp = ++this.queryStamp;
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    for (let slot = 0; slot < this.slots.length; slot++) {
      const c = this.slots[slot];
      if (!c || !c.active) continue;
      if ((c.group & mask) === 0) continue;
      if (this.ignoreStamp[slot] === stamp) continue;
      if (this.stamp[slot] === visitStamp) continue;
      this.stamp[slot] = visitStamp;
      if (
        rayAabb(
          ox, oy, oz, invx, invy, invz,
          c.wmin.x, c.wmin.y, c.wmin.z, c.wmax.x, c.wmax.y, c.wmax.z,
          maxDist,
        ) < 0
      ) {
        continue;
      }
      if (this.hitCollider(c, ox, oy, oz, dx, dy, dz, maxDist, scratch) >= 0) {
        visit(slot, scratch);
      }
    }
  }

  /** True when any sight-blocking dynamic collider crosses the segment. */
  occluded(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxDist: number,
    mask: number,
    stamp: number,
    scratch: DynamicHit,
  ): boolean {
    if (this.liveCount === 0) return false;
    this.ensureFresh();
    const invx = invDir(dx);
    const invy = invDir(dy);
    const invz = invDir(dz);
    if (
      rayAabb(
        ox, oy, oz, invx, invy, invz,
        this.minX, this.minY, this.minZ, this.maxX, this.maxY, this.maxZ,
        maxDist,
      ) < 0
    ) {
      return false;
    }
    for (let slot = 0; slot < this.slots.length; slot++) {
      const c = this.slots[slot];
      if (!c || !c.active || !c.blocksSight) continue;
      if ((c.group & mask) === 0) continue;
      if (this.ignoreStamp[slot] === stamp) continue;
      if (
        rayAabb(
          ox, oy, oz, invx, invy, invz,
          c.wmin.x, c.wmin.y, c.wmin.z, c.wmax.x, c.wmax.y, c.wmax.z,
          maxDist,
        ) < 0
      ) {
        continue;
      }
      if (this.hitCollider(c, ox, oy, oz, dx, dy, dz, maxDist, scratch) >= 0) return true;
    }
    return false;
  }

  /** Colliders whose world bounds intersect a sphere. */
  overlapSphere(
    x: number,
    y: number,
    z: number,
    radius: number,
    mask: number,
    out: THREE.Object3D[],
  ): void {
    if (this.liveCount === 0) return;
    this.ensureFresh();
    const visitStamp = ++this.queryStamp;
    const r2 = radius * radius;
    const cx0 = Math.floor((x - radius) / CELL_SIZE);
    const cx1 = Math.floor((x + radius) / CELL_SIZE);
    const cz0 = Math.floor((z - radius) / CELL_SIZE);
    const cz1 = Math.floor((z + radius) / CELL_SIZE);
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const list = this.cells.get(cellKey(cx, cz));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const slot = list[i];
          if (this.stamp[slot] === visitStamp) continue;
          this.stamp[slot] = visitStamp;
          const c = this.slots[slot];
          if (!c || !c.active) continue;
          if ((c.group & mask) === 0) continue;
          const dx = x < c.wmin.x ? c.wmin.x - x : x > c.wmax.x ? x - c.wmax.x : 0;
          const dy = y < c.wmin.y ? c.wmin.y - y : y > c.wmax.y ? y - c.wmax.y : 0;
          const dz = z < c.wmin.z ? c.wmin.z - z : z > c.wmax.z ? z - c.wmax.z : 0;
          if (dx * dx + dy * dy + dz * dz <= r2) out.push(c.object);
        }
      }
    }
  }

  clear(): void {
    this.slots.length = 0;
    this.free.length = 0;
    this.byObject.clear();
    this.cells.clear();
    this.liveCount = 0;
    this.stale = true;
  }
}

function cellKey(cx: number, cz: number): number {
  return ((cx & CELL_KEY_MASK) << 16) | (cz & CELL_KEY_MASK);
}
