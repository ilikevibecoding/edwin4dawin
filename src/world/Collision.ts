/**
 * Collision world. Owner: Opus 2. Read-only consumers: Opus 3 (nav bake), Fable 2 (proxies).
 *
 * The building is axis-aligned, so the collision representation is a list of AABB brushes in a
 * uniform grid rather than a triangle BVH. That buys three things a mesh collider would not:
 * exact, jitter-free wall sliding; O(1) broadphase; and a nav bake that can query solidity at
 * any point for a fraction of a millisecond.
 *
 * Brushes carry `solid` (blocks bodies), `opaque` (blocks sight and bullets) and a surface kind
 * so impact effects, footsteps and AI hearing all read from one source of truth.
 */
import * as THREE from 'three';
import type { HitResult, StaticBrush, SurfaceKind } from '../core/Types';

const CELL = 2.5;

export interface Brush extends StaticBrush {
  /** Index into the brush array; assigned on insert. */
  index: number;
  /** Dynamic brushes (doors) are re-tested every query and excluded from the grid. */
  dynamic: boolean;
  /** Bullets pass through but bodies do not (e.g. glass panes before breaking). */
  penetrable?: boolean;
  /** Set false to disable without removing (opened doors, broken glass). */
  active: boolean;
}

export interface GroundInfo {
  grounded: boolean;
  surface: SurfaceKind;
  height: number;
}

export interface MoveResult {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  grounded: boolean;
  groundSurface: SurfaceKind;
  hitWall: boolean;
  hitCeiling: boolean;
  steppedUp: number;
}

/** Actor capsules (players, enemies, hostages) registered for bullet tests. */
export interface ActorCollider {
  id: string;
  /** Feet position. */
  position: THREE.Vector3;
  radius: number;
  height: number;
  /** Height of the head sphere centre above feet. */
  headHeight: number;
  headRadius: number;
  alive: boolean;
  team: 'player' | 'hostile' | 'civilian';
}

const EPS = 1e-4;

export class CollisionWorld {
  readonly brushes: Brush[] = [];
  private grid = new Map<number, number[]>();
  private dynamicIdx: number[] = [];
  private bounds = new THREE.Box3(
    new THREE.Vector3(Infinity, Infinity, Infinity),
    new THREE.Vector3(-Infinity, -Infinity, -Infinity),
  );
  private gx0 = 0;
  private gz0 = 0;
  private gnx = 1;
  readonly actors: ActorCollider[] = [];

  clear(): void {
    this.brushes.length = 0;
    this.grid.clear();
    this.dynamicIdx.length = 0;
    this.actors.length = 0;
    this.bounds.makeEmpty();
  }

  add(
    min: THREE.Vector3,
    max: THREE.Vector3,
    surface: SurfaceKind,
    opts: { solid?: boolean; opaque?: boolean; id?: string; dynamic?: boolean; penetrable?: boolean } = {},
  ): Brush {
    const b: Brush = {
      min: min.clone(),
      max: max.clone(),
      surface,
      solid: opts.solid ?? true,
      opaque: opts.opaque ?? true,
      id: opts.id,
      index: this.brushes.length,
      dynamic: opts.dynamic ?? false,
      penetrable: opts.penetrable ?? false,
      active: true,
    };
    this.brushes.push(b);
    this.bounds.expandByPoint(b.min);
    this.bounds.expandByPoint(b.max);
    return b;
  }

  /** Convenience: add a brush from centre + size. */
  addBox(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    surface: SurfaceKind,
    opts: { solid?: boolean; opaque?: boolean; id?: string; dynamic?: boolean; penetrable?: boolean } = {},
  ): Brush {
    return this.add(
      new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
      new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2),
      surface,
      opts,
    );
  }

  /** Build the broadphase. Call once after the map is assembled. */
  build(): void {
    this.grid.clear();
    this.dynamicIdx.length = 0;
    if (!isFinite(this.bounds.min.x)) return;
    this.gx0 = Math.floor(this.bounds.min.x / CELL) - 1;
    this.gz0 = Math.floor(this.bounds.min.z / CELL) - 1;
    this.gnx = Math.floor(this.bounds.max.x / CELL) - this.gx0 + 3;
    for (const b of this.brushes) {
      if (b.dynamic) {
        this.dynamicIdx.push(b.index);
        continue;
      }
      const x0 = Math.floor(b.min.x / CELL);
      const x1 = Math.floor(b.max.x / CELL);
      const z0 = Math.floor(b.min.z / CELL);
      const z1 = Math.floor(b.max.z / CELL);
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const k = this.key(x, z);
          let list = this.grid.get(k);
          if (!list) {
            list = [];
            this.grid.set(k, list);
          }
          list.push(b.index);
        }
      }
    }
  }

  private key(cx: number, cz: number): number {
    return (cz - this.gz0) * this.gnx + (cx - this.gx0);
  }

  getBounds(): THREE.Box3 {
    return this.bounds;
  }

  /** All brush indices touching an AABB region. */
  private query(minx: number, minz: number, maxx: number, maxz: number, out: number[]): number[] {
    out.length = 0;
    const x0 = Math.floor(minx / CELL);
    const x1 = Math.floor(maxx / CELL);
    const z0 = Math.floor(minz / CELL);
    const z1 = Math.floor(maxz / CELL);
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        const list = this.grid.get(this.key(x, z));
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const idx = list[i];
          if (out.indexOf(idx) === -1) out.push(idx);
        }
      }
    }
    for (const idx of this.dynamicIdx) out.push(idx);
    return out;
  }

  // -------------------------------------------------------------------------
  // Body movement (axis-separated AABB sweep with step-up)
  // -------------------------------------------------------------------------

  private scratch: number[] = [];

  private overlaps(
    minx: number, miny: number, minz: number,
    maxx: number, maxy: number, maxz: number,
    ignoreId?: string,
  ): Brush | null {
    const list = this.query(minx, minz, maxx, maxz, this.scratch);
    for (const idx of list) {
      const b = this.brushes[idx];
      if (!b.active || !b.solid) continue;
      if (ignoreId && b.id === ignoreId) continue;
      if (
        b.max.x > minx + EPS && b.min.x < maxx - EPS &&
        b.max.y > miny + EPS && b.min.y < maxy - EPS &&
        b.max.z > minz + EPS && b.min.z < maxz - EPS
      ) {
        return b;
      }
    }
    return null;
  }

  /** True when a body of the given footprint fits at this position. */
  fits(pos: THREE.Vector3, radius: number, height: number): boolean {
    return !this.overlaps(
      pos.x - radius, pos.y + EPS, pos.z - radius,
      pos.x + radius, pos.y + height, pos.z + radius,
    );
  }

  /**
   * Move an upright box body. Returns the resolved position plus contact info.
   * `delta` is the intended displacement for this step.
   */
  moveBody(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    radius: number,
    height: number,
    delta: THREE.Vector3,
    opts: { stepHeight?: number; canStep?: boolean } = {},
  ): MoveResult {
    const stepHeight = opts.stepHeight ?? 0.34;
    const p = position.clone();
    const v = velocity.clone();
    let hitWall = false;
    let hitCeiling = false;
    let steppedUp = 0;

    // Substep so fast movement cannot tunnel through a 0.1 m wall.
    const maxLen = Math.max(Math.abs(delta.x), Math.abs(delta.y), Math.abs(delta.z));
    const steps = Math.max(1, Math.ceil(maxLen / 0.08));
    const dx = delta.x / steps;
    const dy = delta.y / steps;
    const dz = delta.z / steps;

    for (let s = 0; s < steps; s++) {
      // --- X
      if (dx !== 0) {
        p.x += dx;
        const b = this.overlaps(p.x - radius, p.y + EPS, p.z - radius, p.x + radius, p.y + height, p.z + radius);
        if (b) {
          const before = p.x;
          p.x = dx > 0 ? b.min.x - radius - EPS : b.max.x + radius + EPS;
          // Try stepping over low obstacles (kerbs, thresholds, floor mats).
          if (opts.canStep !== false && this.tryStep(p, radius, height, before - p.x, 0, stepHeight)) {
            steppedUp = Math.max(steppedUp, stepHeight);
          } else {
            hitWall = true;
            v.x = 0;
          }
        }
      }
      // --- Z
      if (dz !== 0) {
        p.z += dz;
        const b = this.overlaps(p.x - radius, p.y + EPS, p.z - radius, p.x + radius, p.y + height, p.z + radius);
        if (b) {
          const before = p.z;
          p.z = dz > 0 ? b.min.z - radius - EPS : b.max.z + radius + EPS;
          if (opts.canStep !== false && this.tryStep(p, radius, height, 0, before - p.z, stepHeight)) {
            steppedUp = Math.max(steppedUp, stepHeight);
          } else {
            hitWall = true;
            v.z = 0;
          }
        }
      }
      // --- Y
      if (dy !== 0) {
        p.y += dy;
        const b = this.overlaps(p.x - radius, p.y + EPS, p.z - radius, p.x + radius, p.y + height, p.z + radius);
        if (b) {
          if (dy > 0) {
            p.y = b.min.y - height - EPS;
            hitCeiling = true;
          } else {
            p.y = b.max.y + EPS;
          }
          v.y = 0;
        }
      }
    }

    const ground = this.groundUnder(p, radius);
    let grounded = false;
    if (v.y <= 0.01 && p.y - ground.height < 0.06) {
      grounded = ground.grounded;
      if (grounded) {
        p.y = ground.height;
        if (v.y < 0) v.y = 0;
      }
    }

    return {
      position: p,
      velocity: v,
      grounded,
      groundSurface: ground.surface,
      hitWall,
      hitCeiling,
      steppedUp,
    };
  }

  /** Attempt to lift the body over a low obstruction and continue the blocked motion. */
  private tryStep(
    p: THREE.Vector3,
    radius: number,
    height: number,
    remainX: number,
    remainZ: number,
    stepHeight: number,
  ): boolean {
    if (Math.abs(remainX) < 1e-5 && Math.abs(remainZ) < 1e-5) return false;
    const testY = p.y + stepHeight;
    // Head room at the raised height?
    if (this.overlaps(p.x - radius, testY + EPS, p.z - radius, p.x + radius, testY + height, p.z + radius)) {
      return false;
    }
    const nx = p.x + remainX;
    const nz = p.z + remainZ;
    if (this.overlaps(nx - radius, testY + EPS, nz - radius, nx + radius, testY + height, nz + radius)) {
      return false;
    }
    // Settle back down onto whatever we stepped onto.
    const g = this.groundUnder(new THREE.Vector3(nx, testY, nz), radius, stepHeight + 0.05);
    if (!g.grounded) return false;
    p.x = nx;
    p.z = nz;
    p.y = g.height;
    return true;
  }

  /** Highest solid surface under a footprint within `probe` metres. */
  groundUnder(pos: THREE.Vector3, radius: number, probe = 0.35): GroundInfo {
    const minx = pos.x - radius;
    const maxx = pos.x + radius;
    const minz = pos.z - radius;
    const maxz = pos.z + radius;
    const list = this.query(minx, minz, maxx, maxz, this.scratch);
    let best = -Infinity;
    let surface: SurfaceKind = 'concrete';
    const lowY = pos.y - probe;
    for (const idx of list) {
      const b = this.brushes[idx];
      if (!b.active || !b.solid) continue;
      if (b.max.x <= minx + EPS || b.min.x >= maxx - EPS) continue;
      if (b.max.z <= minz + EPS || b.min.z >= maxz - EPS) continue;
      const top = b.max.y;
      if (top > pos.y + 0.02) continue;
      if (top < lowY) continue;
      if (top > best) {
        best = top;
        surface = b.surface;
      }
    }
    if (best === -Infinity) return { grounded: false, surface: 'concrete', height: pos.y };
    return { grounded: true, surface, height: best };
  }

  // -------------------------------------------------------------------------
  // Raycasting
  // -------------------------------------------------------------------------

  /** Slab test against one brush. Returns entry distance or -1. */
  private raySlab(
    ox: number, oy: number, oz: number,
    idx: number, idy: number, idz: number,
    b: Brush,
    maxDist: number,
    outNormal: THREE.Vector3,
  ): number {
    let tmin = 0;
    let tmax = maxDist;
    let nAxis = 0;
    let nSign = 0;

    // X
    {
      const t1 = (b.min.x - ox) * idx;
      const t2 = (b.max.x - ox) * idx;
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      if (lo > tmin) { tmin = lo; nAxis = 0; nSign = t1 > t2 ? 1 : -1; }
      if (hi < tmax) tmax = hi;
      if (tmax < tmin) return -1;
    }
    // Y
    {
      const t1 = (b.min.y - oy) * idy;
      const t2 = (b.max.y - oy) * idy;
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      if (lo > tmin) { tmin = lo; nAxis = 1; nSign = t1 > t2 ? 1 : -1; }
      if (hi < tmax) tmax = hi;
      if (tmax < tmin) return -1;
    }
    // Z
    {
      const t1 = (b.min.z - oz) * idz;
      const t2 = (b.max.z - oz) * idz;
      const lo = Math.min(t1, t2);
      const hi = Math.max(t1, t2);
      if (lo > tmin) { tmin = lo; nAxis = 2; nSign = t1 > t2 ? 1 : -1; }
      if (hi < tmax) tmax = hi;
      if (tmax < tmin) return -1;
    }
    if (tmin < 0 || tmin > maxDist) return -1;
    outNormal.set(0, 0, 0);
    if (nAxis === 0) outNormal.x = nSign;
    else if (nAxis === 1) outNormal.y = nSign;
    else outNormal.z = nSign;
    return tmin;
  }

  private rayScratch: number[] = [];
  private _n = new THREE.Vector3();

  /**
   * Raycast against world brushes.
   * `mode` 'solid' stops at anything that blocks a body, 'sight' stops at anything opaque,
   * 'bullet' stops at anything opaque and not flagged penetrable.
   */
  raycast(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    mode: 'solid' | 'sight' | 'bullet' = 'bullet',
    ignoreId?: string,
  ): HitResult | null {
    const idx = 1 / (dir.x || 1e-12);
    const idy = 1 / (dir.y || 1e-12);
    const idz = 1 / (dir.z || 1e-12);
    const ex = origin.x + dir.x * maxDist;
    const ez = origin.z + dir.z * maxDist;
    const list = this.query(
      Math.min(origin.x, ex) - 0.01,
      Math.min(origin.z, ez) - 0.01,
      Math.max(origin.x, ex) + 0.01,
      Math.max(origin.z, ez) + 0.01,
      this.rayScratch,
    );

    let bestT = maxDist;
    let bestBrush: Brush | null = null;
    const bestN = new THREE.Vector3();
    for (const i of list) {
      const b = this.brushes[i];
      if (!b.active) continue;
      if (ignoreId && b.id === ignoreId) continue;
      if (mode === 'solid' && !b.solid) continue;
      if (mode === 'sight' && !b.opaque) continue;
      if (mode === 'bullet' && (!b.opaque || b.penetrable)) continue;
      const t = this.raySlab(origin.x, origin.y, origin.z, idx, idy, idz, b, bestT, this._n);
      if (t >= 0 && t < bestT) {
        bestT = t;
        bestBrush = b;
        bestN.copy(this._n);
      }
    }
    if (!bestBrush) return null;
    return {
      point: new THREE.Vector3(
        origin.x + dir.x * bestT,
        origin.y + dir.y * bestT,
        origin.z + dir.z * bestT,
      ),
      normal: bestN.clone(),
      distance: bestT,
      surface: bestBrush.surface,
      brushId: bestBrush.id,
    };
  }

  /** Unobstructed line of sight between two world points. */
  lineOfSight(a: THREE.Vector3, b: THREE.Vector3): boolean {
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-4) return true;
    d.multiplyScalar(1 / len);
    return this.raycast(a, d, len - 0.02, 'sight') === null;
  }

  // -------------------------------------------------------------------------
  // Actors
  // -------------------------------------------------------------------------

  registerActor(a: ActorCollider): void {
    this.actors.push(a);
  }

  removeActor(id: string): void {
    const i = this.actors.findIndex((a) => a.id === id);
    if (i >= 0) this.actors.splice(i, 1);
  }

  /**
   * Bullet trace against world and actors. Returns the nearest hit of either kind so a bullet
   * can never damage an enemy through a wall.
   */
  traceBullet(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number,
    ignoreActorId?: string,
  ): HitResult | null {
    const worldHit = this.raycast(origin, dir, maxDist, 'bullet');
    let bestT = worldHit ? worldHit.distance : maxDist;
    let actorHit: HitResult | null = null;

    for (const a of this.actors) {
      if (!a.alive || a.id === ignoreActorId) continue;
      // Head sphere first (a headshot beats a body hit at the same distance).
      const head = _v1.set(a.position.x, a.position.y + a.headHeight, a.position.z);
      const tHead = raySphere(origin, dir, head, a.headRadius);
      if (tHead >= 0 && tHead < bestT) {
        bestT = tHead;
        actorHit = {
          point: origin.clone().addScaledVector(dir, tHead),
          normal: origin.clone().addScaledVector(dir, tHead).sub(head).normalize(),
          distance: tHead,
          surface: 'flesh',
          actorId: a.id,
          bodyPart: 'head',
        };
        continue;
      }
      const tBody = rayVerticalCapsule(
        origin, dir,
        a.position.x, a.position.z,
        a.position.y + a.radius, a.position.y + a.height - a.radius * 0.6,
        a.radius,
      );
      if (tBody >= 0 && tBody < bestT) {
        const p = origin.clone().addScaledVector(dir, tBody);
        const rel = (p.y - a.position.y) / a.height;
        bestT = tBody;
        actorHit = {
          point: p,
          normal: _v2.set(a.position.x - p.x, 0, a.position.z - p.z).normalize().negate().clone(),
          distance: tBody,
          surface: 'flesh',
          actorId: a.id,
          bodyPart: rel > 0.62 ? 'chest' : rel > 0.34 ? 'chest' : 'limb',
        };
      }
    }
    if (actorHit) return actorHit;
    return worldHit;
  }
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function raySphere(o: THREE.Vector3, d: THREE.Vector3, c: THREE.Vector3, r: number): number {
  const ox = o.x - c.x;
  const oy = o.y - c.y;
  const oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  if (t0 >= 0) return t0;
  const t1 = -b + s;
  return t1 >= 0 ? t1 : -1;
}

/** Ray vs vertical cylinder segment (capsule body approximated as a cylinder + caps). */
function rayVerticalCapsule(
  o: THREE.Vector3,
  d: THREE.Vector3,
  cx: number,
  cz: number,
  y0: number,
  y1: number,
  r: number,
): number {
  const ox = o.x - cx;
  const oz = o.z - cz;
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-9) return -1;
  const b = ox * d.x + oz * d.z;
  const c = ox * ox + oz * oz - r * r;
  const disc = b * b - a * c;
  if (disc < 0) return -1;
  const s = Math.sqrt(disc);
  let t = (-b - s) / a;
  if (t < 0) t = (-b + s) / a;
  if (t < 0) return -1;
  const y = o.y + d.y * t;
  if (y < y0 || y > y1) return -1;
  return t;
}
