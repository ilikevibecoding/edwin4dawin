import * as THREE from 'three';
import type { SurfaceKind } from '../game/types';

export interface ColliderBox {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  surface: SurfaceKind;
  /** Vision/LOS passes through (clear glass). Movement & bullets still interact. */
  transparent?: boolean;
  /** Excluded from movement collision (decor-only, e.g. ceiling fixtures near walls). */
  noBlock?: boolean;
  tag?: string;
}

export interface RayHit {
  box: ColliderBox;
  t: number;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  dynamicId?: string;
}

export interface MoveResult {
  pos: THREE.Vector3;
  onGround: boolean;
  hitWall: boolean;
  groundSurface: SurfaceKind;
  groundTag?: string;
}

const EPS = 1e-4;

/**
 * Axis-aligned collision world: static boxes in a uniform grid broadphase plus a
 * small set of dynamic blockers (doors, breakable glass). Player/AI move as
 * vertical capsules approximated by expanded-AABB cylinders with step-up support.
 */
export class CollisionWorld {
  private statics: ColliderBox[] = [];
  private dynamics = new Map<string, ColliderBox>();
  private grid: number[][] = [];
  private gx0 = -8; private gz0 = -8;
  private gw = 0; private gh = 0;
  private cell = 2;
  private built = false;

  addStatic(box: ColliderBox): void {
    this.statics.push(box);
    this.built = false;
  }

  clearStatics(): void {
    this.statics.length = 0;
    this.built = false;
  }

  setDynamic(box: ColliderBox): void {
    this.dynamics.set(box.id, box);
  }

  removeDynamic(id: string): void {
    this.dynamics.delete(id);
  }

  getDynamic(id: string): ColliderBox | undefined {
    return this.dynamics.get(id);
  }

  build(minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.gx0 = minX - 4; this.gz0 = minZ - 4;
    this.gw = Math.ceil((maxX - minX + 8) / this.cell);
    this.gh = Math.ceil((maxZ - minZ + 8) / this.cell);
    this.grid = new Array(this.gw * this.gh);
    for (let i = 0; i < this.grid.length; i++) this.grid[i] = [];
    for (let bi = 0; bi < this.statics.length; bi++) {
      const b = this.statics[bi];
      const cx0 = Math.max(0, Math.floor((b.min.x - this.gx0) / this.cell));
      const cx1 = Math.min(this.gw - 1, Math.floor((b.max.x - this.gx0) / this.cell));
      const cz0 = Math.max(0, Math.floor((b.min.z - this.gz0) / this.cell));
      const cz1 = Math.min(this.gh - 1, Math.floor((b.max.z - this.gz0) / this.cell));
      for (let cz = cz0; cz <= cz1; cz++)
        for (let cx = cx0; cx <= cx1; cx++)
          this.grid[cz * this.gw + cx].push(bi);
    }
    this.built = true;
  }

  /** Collect candidate static boxes overlapping an AABB region (deduped). */
  private candidates(minX: number, minZ: number, maxX: number, maxZ: number, out: ColliderBox[]): void {
    if (!this.built) {
      for (const b of this.statics) out.push(b);
      return;
    }
    const cx0 = Math.max(0, Math.floor((minX - this.gx0) / this.cell));
    const cx1 = Math.min(this.gw - 1, Math.floor((maxX - this.gx0) / this.cell));
    const cz0 = Math.max(0, Math.floor((minZ - this.gz0) / this.cell));
    const cz1 = Math.min(this.gh - 1, Math.floor((maxZ - this.gz0) / this.cell));
    const seen = new Set<number>();
    for (let cz = cz0; cz <= cz1; cz++)
      for (let cx = cx0; cx <= cx1; cx++) {
        const cellArr = this.grid[cz * this.gw + cx];
        for (const bi of cellArr) {
          if (!seen.has(bi)) {
            seen.add(bi);
            out.push(this.statics[bi]);
          }
        }
      }
  }

  private overlapCyl(px: number, pz: number, r: number, y0: number, y1: number, b: ColliderBox): boolean {
    if (b.noBlock) return false;
    return (
      px > b.min.x - r && px < b.max.x + r &&
      pz > b.min.z - r && pz < b.max.z + r &&
      y0 < b.max.y - EPS && y1 > b.min.y + EPS
    );
  }

  /**
   * Move a capsule (feet at pos, given radius & height) by delta with axis
   * separation, step-up and ground detection.
   */
  capsuleMove(
    pos: THREE.Vector3, radius: number, height: number,
    dx: number, dy: number, dz: number,
    stepHeight: number,
  ): MoveResult {
    const p = pos.clone();
    let hitWall = false;
    let onGround = false;
    let groundSurface: SurfaceKind = 'concrete';
    let groundTag: string | undefined;

    const cands: ColliderBox[] = [];
    const pad = radius + Math.abs(dx) + Math.abs(dz) + 0.5;
    this.candidates(p.x - pad, p.z - pad, p.x + pad, p.z + pad, cands);
    for (const d of this.dynamics.values()) cands.push(d);

    const tryStepUp = (b: ColliderBox): boolean => {
      const rise = b.max.y - p.y;
      if (rise <= 0 || rise > stepHeight) return false;
      // headroom check at the lifted position
      const ny0 = b.max.y + EPS;
      const ny1 = ny0 + height;
      for (const o of cands) {
        if (o === b) continue;
        if (this.overlapCyl(p.x, p.z, radius, ny0, ny1, o)) return false;
      }
      p.y = b.max.y + EPS;
      return true;
    };

    // X axis
    if (dx !== 0) {
      p.x += dx;
      for (const b of cands) {
        if (this.overlapCyl(p.x, p.z, radius, p.y, p.y + height, b)) {
          if (tryStepUp(b)) continue;
          p.x = dx > 0 ? b.min.x - radius - EPS : b.max.x + radius + EPS;
          hitWall = true;
        }
      }
    }
    // Z axis
    if (dz !== 0) {
      p.z += dz;
      for (const b of cands) {
        if (this.overlapCyl(p.x, p.z, radius, p.y, p.y + height, b)) {
          if (tryStepUp(b)) continue;
          p.z = dz > 0 ? b.min.z - radius - EPS : b.max.z + radius + EPS;
          hitWall = true;
        }
      }
    }
    // Y axis
    p.y += dy;
    for (const b of cands) {
      if (this.overlapCyl(p.x, p.z, radius, p.y, p.y + height, b)) {
        if (dy <= 0 && p.y < b.max.y && p.y > b.max.y - Math.max(0.5, -dy + 0.3)) {
          p.y = b.max.y + EPS;
          onGround = true;
          groundSurface = b.surface;
          groundTag = b.tag;
        } else if (dy > 0 && p.y + height > b.min.y && p.y + height - dy <= b.min.y + EPS) {
          p.y = b.min.y - height - EPS;
        } else {
          // lateral overlap created by step edge; push up gently if close below
          const rise = b.max.y - p.y;
          if (rise > 0 && rise <= 0.5) {
            p.y = b.max.y + EPS;
            onGround = true;
            groundSurface = b.surface;
            groundTag = b.tag;
          }
        }
      }
    }
    // ground probe (a hair below feet) for coyote-free grounding info
    if (!onGround) {
      for (const b of cands) {
        if (this.overlapCyl(p.x, p.z, radius, p.y - 0.06, p.y, b) && p.y >= b.max.y - 0.06) {
          onGround = true;
          groundSurface = b.surface;
          groundTag = b.tag;
          break;
        }
      }
    }
    return { pos: p, onGround, hitWall, groundSurface, groundTag };
  }

  /** Whether a capsule fits at pos without overlap (nav building, teleports).
   * ignorePrefixes filters BOTH dynamic ids and static tags (e.g. door leafs,
   * door frames — nav clearance treats doorways as open). */
  capsuleFits(pos: THREE.Vector3, radius: number, height: number, ignorePrefixes?: string[]): boolean {
    const cands: ColliderBox[] = [];
    this.candidates(pos.x - radius - 0.1, pos.z - radius - 0.1, pos.x + radius + 0.1, pos.z + radius + 0.1, cands);
    for (const [id, d] of this.dynamics) {
      if (ignorePrefixes && ignorePrefixes.some((p) => id.startsWith(p))) continue;
      cands.push(d);
    }
    for (const b of cands) {
      if (ignorePrefixes && b.tag && ignorePrefixes.some((p) => b.tag!.startsWith(p))) continue;
      if (this.overlapCyl(pos.x, pos.z, radius, pos.y + 0.02, pos.y + height, b)) return false;
    }
    return true;
  }

  /**
   * Raycast against static + dynamic boxes. Options:
   * - ignoreTransparent: skip clear-glass boxes (AI vision).
   * - ignoreIds: skip specific dynamic ids (e.g. the door being opened).
   */
  raycast(
    origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number,
    opts: { ignoreTransparent?: boolean; ignoreIds?: Set<string>; ignoreNoBlock?: boolean } = {},
  ): RayHit | null {
    let best: RayHit | null = null;
    const test = (b: ColliderBox, dynamicId?: string): void => {
      if (opts.ignoreTransparent && b.transparent) return;
      if (opts.ignoreIds && dynamicId && opts.ignoreIds.has(dynamicId)) return;
      const hit = rayBox(origin, dir, maxDist, b);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, box: b, dynamicId };
      }
    };
    // brute force dynamics (few)
    for (const [id, d] of this.dynamics) test(d, id);
    // statics via broadphase along ray AABB
    const ex = origin.x + dir.x * maxDist;
    const ez = origin.z + dir.z * maxDist;
    const cands: ColliderBox[] = [];
    this.candidates(Math.min(origin.x, ex) - 0.5, Math.min(origin.z, ez) - 0.5, Math.max(origin.x, ex) + 0.5, Math.max(origin.z, ez) + 0.5, cands);
    for (const b of cands) test(b);
    return best;
  }

  /** Raycast that returns ALL hits sorted by distance (for penetration logic). */
  raycastAll(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): RayHit[] {
    const hits: RayHit[] = [];
    const test = (b: ColliderBox, dynamicId?: string): void => {
      const hit = rayBox(origin, dir, maxDist, b);
      if (hit) hits.push({ ...hit, box: b, dynamicId });
    };
    for (const [id, d] of this.dynamics) test(d, id);
    const ex = origin.x + dir.x * maxDist;
    const ez = origin.z + dir.z * maxDist;
    const cands: ColliderBox[] = [];
    this.candidates(Math.min(origin.x, ex) - 0.5, Math.min(origin.z, ez) - 0.5, Math.max(origin.x, ex) + 0.5, Math.max(origin.z, ez) + 0.5, cands);
    for (const b of cands) test(b);
    hits.sort((a, b) => a.t - b.t);
    return hits;
  }

  /** Downward probe: highest static/dynamic top at (x,z) at or below fromY. Returns y or null. */
  floorHeight(x: number, z: number, fromY: number, minY = -10): number | null {
    return this.floorHit(x, z, fromY, minY)?.y ?? null;
  }

  /** Like floorHeight but also reports the box tag (nav uses it to reject furniture tops). */
  floorHit(x: number, z: number, fromY: number, minY = -10): { y: number; tag?: string } | null {
    const cands: ColliderBox[] = [];
    this.candidates(x - 0.05, z - 0.05, x + 0.05, z + 0.05, cands);
    for (const d of this.dynamics.values()) cands.push(d);
    let best: { y: number; tag?: string } | null = null;
    for (const b of cands) {
      if (b.noBlock) continue;
      if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
        const top = b.max.y;
        if (top <= fromY + EPS && top >= minY && (best === null || top > best.y)) best = { y: top, tag: b.tag ?? b.id };
      }
    }
    return best;
  }

  /** All static box tops at (x,z) with tags — nav-grid ground sampling. */
  groundTopsAt(x: number, z: number, out: { y: number; tag: string }[]): void {
    out.length = 0;
    const cands: ColliderBox[] = [];
    this.candidates(x - 0.05, z - 0.05, x + 0.05, z + 0.05, cands);
    for (const b of cands) {
      if (b.noBlock) continue;
      if (x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) {
        out.push({ y: b.max.y, tag: b.tag ?? b.id });
      }
    }
  }

  /** Line-of-sight check for AI: true if unobstructed (transparent glass ignored). */
  hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const dir = b.clone().sub(a);
    const dist = dir.length();
    if (dist < 1e-3) return true;
    dir.multiplyScalar(1 / dist);
    const hit = this.raycast(a, dir, dist - 0.05, { ignoreTransparent: true });
    return hit === null;
  }

  allStatics(): readonly ColliderBox[] {
    return this.statics;
  }

  allDynamics(): ReadonlyMap<string, ColliderBox> {
    return this.dynamics;
  }
}

/** Slab-method ray vs AABB. Returns t/point/normal or null. */
export function rayBox(
  origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number, b: { min: THREE.Vector3; max: THREE.Vector3 },
): { t: number; point: THREE.Vector3; normal: THREE.Vector3 } | null {
  let tmin = 0;
  let tmax = maxDist;
  let axisMin = -1;
  let signMin = 0;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const bmin = [b.min.x, b.min.y, b.min.z];
  const bmax = [b.max.x, b.max.y, b.max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < bmin[i] || o[i] > bmax[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (bmin[i] - o[i]) * inv;
      let t2 = (bmax[i] - o[i]) * inv;
      let sign = -1;
      if (t1 > t2) {
        const tmp = t1; t1 = t2; t2 = tmp;
        sign = 1;
      }
      if (t1 > tmin) {
        tmin = t1;
        axisMin = i;
        signMin = sign;
      }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  if (axisMin < 0 || tmin <= 0) return null; // origin inside box or no entry
  const point = new THREE.Vector3(o[0] + d[0] * tmin, o[1] + d[1] * tmin, o[2] + d[2] * tmin);
  const normal = new THREE.Vector3(0, 0, 0);
  normal.setComponent(axisMin, signMin);
  return { t: tmin, point, normal };
}
