import * as THREE from 'three';
import { Rng, clamp } from '../core/MathUtils';
import { Groups } from '../core/GameContext';
import type { CoverPoint, IPhysics, RaycastHit, SpawnPoint } from '../core/Interfaces';
import { MAP, rectContains, type Rect } from './Layout';
import type { Platform, Room } from './Town';
import type { Terrain } from './Terrain';

/**
 * Navigation and tactical analysis.
 *
 * Nothing here is authored. Once the town is standing and registered with the
 * physics world, this pass interrogates the level the same way a player does —
 * by casting rays at it — and derives everything the AI and the spawn system
 * need. Deriving rather than authoring matters because the geometry moves
 * around during art iteration, and a hand-placed cover point that is now
 * standing in the open is worse than no cover point at all.
 *
 * Three products come out of it:
 *
 * - A **walkability grid** at 1.25 m. A cell is walkable when a downward probe
 *   finds a surface, there is 1.7 m of headroom above it, and no neighbouring
 *   cell is more than a long step away in height. That last rule is what
 *   removes wall interiors, parapets and the lips of the fountain basin, which
 *   otherwise pass the first two tests.
 * - **Cover points**, one per candidate that has at least one blocked and one
 *   open direction. Blocked at 0.55 m but open at 1.45 m is waist-high cover
 *   the AI can crouch behind and peek over, and is flagged `low`.
 * - **Spawn points**, filtered against the same grid and scored so nobody
 *   arrives facing a wall.
 */

/** Metres per navigation cell. */
const CELL = 1.25;

const UP = new THREE.Vector3(0, 1, 0);
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _p = new THREE.Vector3();

function blankHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
  };
}

export interface NavInput {
  terrain: Terrain;
  physics: IPhysics;
  blockers: Rect[];
  platforms: Platform[];
  rooms: Room[];
  hotspots: Array<{ x: number; z: number; radius: number }>;
  rng: Rng;
}

export class Nav {
  readonly coverPoints: CoverPoint[] = [];
  readonly spawnPoints: SpawnPoint[] = [];

  private nx: number;
  private nz: number;
  private x0: number;
  private z0: number;
  /** Surface height per cell; NaN where nothing was found. */
  private floor: Float32Array;
  private walk: Uint8Array;
  private hit = blankHit();
  private terrain: Terrain;
  private physics: IPhysics;
  private platforms: Platform[];
  private rooms: Room[];

  /** Diagnostics for the generation report. */
  rayCount = 0;
  walkableCells = 0;

  constructor(private input: NavInput) {
    this.terrain = input.terrain;
    this.physics = input.physics;
    this.platforms = input.platforms;
    this.rooms = input.rooms;
    this.x0 = MAP.minX - 3;
    this.z0 = MAP.minZ - 3;
    this.nx = Math.ceil((MAP.maxX + 3 - this.x0) / CELL);
    this.nz = Math.ceil((MAP.maxZ + 3 - this.z0) / CELL);
    this.floor = new Float32Array(this.nx * this.nz).fill(NaN);
    this.walk = new Uint8Array(this.nx * this.nz);
  }

  /* ------------------------------- grid ---------------------------------- */

  buildGrid(): void {
    const { nx, nz } = this;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const x = this.x0 + (i + 0.5) * CELL;
        const z = this.z0 + (j + 0.5) * CELL;
        this.floor[j * nx + i] = this.probe(x, z);
      }
    }

    // A cell is walkable when it found a floor, has headroom, and its
    // neighbours are within a step. The neighbour rule is what deletes the
    // insides of walls: they probe to the terrain under the plinth, and their
    // neighbours in the street are half a metre away in height.
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const y = this.floor[k];
        if (Number.isNaN(y)) continue;
        let ok = true;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= nx || nj >= nz) continue;
          const ny = this.floor[nj * nx + ni];
          if (Number.isNaN(ny)) continue;
          if (Math.abs(ny - y) > 0.62) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        if (!this.headroom(this.x0 + (i + 0.5) * CELL, y, this.z0 + (j + 0.5) * CELL, 1.75)) continue;
        this.walk[k] = 1;
        this.walkableCells++;
      }
    }
  }

  /** Downward probe from just above the terrain, so roofs are not found. */
  private probe(x: number, z: number): number {
    const top = this.terrain.surfaceHeight(x, z) + 2.4;
    _o.set(x, top, z);
    _d.set(0, -1, 0);
    this.rayCount++;
    if (!this.physics.raycastInto(_o, _d, 5.0, this.hit, Groups.WORLD | Groups.PROP)) return NaN;
    // A near-vertical face is a wall, not a floor.
    if (this.hit.normal.y < 0.55) return NaN;
    return this.hit.point.y;
  }

  private headroom(x: number, y: number, z: number, need: number): boolean {
    _o.set(x, y + 0.22, z);
    this.rayCount++;
    return !this.physics.raycastInto(_o, UP, need, this.hit, Groups.WORLD | Groups.PROP);
  }

  index(x: number, z: number): number {
    const i = Math.floor((x - this.x0) / CELL);
    const j = Math.floor((z - this.z0) / CELL);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) return -1;
    return j * this.nx + i;
  }

  isWalkable(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.walk[k] === 1;
  }

  floorAt(x: number, z: number): number {
    const k = this.index(x, z);
    if (k < 0) return this.terrain.surfaceHeight(x, z);
    const y = this.floor[k];
    return Number.isNaN(y) ? this.terrain.surfaceHeight(x, z) : y;
  }

  /** Nearest walkable cell centre, searched in growing rings. */
  nearestNavPoint(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    // An elevated surface answers for itself, so an agent on a roof is not
    // teleported down into the street.
    for (const plat of this.platforms) {
      if (rectContains(plat.rect, p.x, p.z, 0.4) && Math.abs(p.y - plat.y) < 2.0) {
        return out.set(p.x, plat.y, p.z);
      }
    }
    const i0 = clamp(Math.floor((p.x - this.x0) / CELL), 0, this.nx - 1);
    const j0 = clamp(Math.floor((p.z - this.z0) / CELL), 0, this.nz - 1);
    if (this.walk[j0 * this.nx + i0] === 1) {
      return out.set(this.x0 + (i0 + 0.5) * CELL, this.floor[j0 * this.nx + i0], this.z0 + (j0 + 0.5) * CELL);
    }
    for (let r = 1; r < 64; r++) {
      let best = -1;
      let bestD = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = i0 + di;
          const j = j0 + dj;
          if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
          const k = j * this.nx + i;
          if (this.walk[k] !== 1) continue;
          const x = this.x0 + (i + 0.5) * CELL;
          const z = this.z0 + (j + 0.5) * CELL;
          const d = (x - p.x) * (x - p.x) + (z - p.z) * (z - p.z);
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        }
      }
      if (best >= 0) {
        const i = best % this.nx;
        const j = Math.floor(best / this.nx);
        return out.set(this.x0 + (i + 0.5) * CELL, this.floor[best], this.z0 + (j + 0.5) * CELL);
      }
    }
    return out.copy(p);
  }

  /* ------------------------------- cover --------------------------------- */

  private static readonly DIRS = 12;

  /**
   * Casts a ring of rays at two heights and classifies the result.
   *
   * The reach is deliberately short. Cover is only cover if the player can put
   * their shoulder against it; a wall four metres away is a backdrop, and an
   * AI told to use it as cover will stand in the open next to it.
   */
  private analyse(x: number, y: number, z: number, reach: number): {
    lowMask: number;
    highMask: number;
    dirs: THREE.Vector3[];
  } | null {
    let lowMask = 0;
    let highMask = 0;
    const dirs: THREE.Vector3[] = [];
    const n = Nav.DIRS;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      dirs.push(new THREE.Vector3(dx, 0, dz));
      _d.set(dx, 0, dz);
      _o.set(x, y + 0.5, z);
      this.rayCount++;
      if (this.physics.raycastInto(_o, _d, reach, this.hit, Groups.WORLD | Groups.PROP)) lowMask |= 1 << i;
      _o.set(x, y + 1.5, z);
      this.rayCount++;
      if (this.physics.raycastInto(_o, _d, reach, this.hit, Groups.WORLD | Groups.PROP)) highMask |= 1 << i;
    }
    if (lowMask === 0) return null;
    return { lowMask, highMask, dirs };
  }

  /**
   * Derives cover across the streets, the interiors and the rooftops.
   *
   * Candidates come from the walk grid at twice the cell pitch, plus a denser
   * ring around every hotspot the town flagged — the fountain, the wrecks, the
   * junctions — because those are where fights actually happen and where the
   * AI most needs somewhere to be.
   */
  deriveCover(maxPoints = 300, minSpacing = 2.0): void {
    const candidates: Array<{ x: number; y: number; z: number }> = [];
    const { nx, nz } = this;

    for (let j = 1; j < nz - 1; j += 2) {
      for (let i = 1; i < nx - 1; i += 2) {
        const k = j * nx + i;
        if (this.walk[k] !== 1) continue;
        candidates.push({
          x: this.x0 + (i + 0.5) * CELL,
          y: this.floor[k],
          z: this.z0 + (j + 0.5) * CELL,
        });
      }
    }

    // Denser sampling where the map wants a fight.
    const rng = this.input.rng;
    for (const h of this.input.hotspots) {
      for (let i = 0; i < 26; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = Math.sqrt(rng.next()) * h.radius;
        const x = h.x + Math.cos(a) * d;
        const z = h.z + Math.sin(a) * d;
        if (!this.isWalkable(x, z)) continue;
        candidates.push({ x, y: this.floorAt(x, z), z });
      }
    }

    // Rooftops and other raised platforms, sampled directly.
    for (const plat of this.platforms) {
      const w = plat.rect.x1 - plat.rect.x0;
      const dpt = plat.rect.z1 - plat.rect.z0;
      if (w < 1.4 || dpt < 1.4) continue;
      const ni = Math.max(1, Math.round(w / 2.4));
      const nj = Math.max(1, Math.round(dpt / 2.4));
      for (let j = 0; j < nj; j++) {
        for (let i = 0; i < ni; i++) {
          const x = plat.rect.x0 + ((i + 0.5) * w) / ni;
          const z = plat.rect.z0 + ((j + 0.5) * dpt) / nj;
          if (!this.headroom(x, plat.y, z, 1.7)) continue;
          candidates.push({ x, y: plat.y, z });
        }
      }
    }

    // Interior rooms above the ground floor, which the street grid cannot see.
    for (const room of this.rooms) {
      if (room.y < 1.2) continue;
      const w = room.rect.x1 - room.rect.x0;
      const dpt = room.rect.z1 - room.rect.z0;
      const ni = Math.max(1, Math.round(w / 2.2));
      const nj = Math.max(1, Math.round(dpt / 2.2));
      for (let j = 0; j < nj; j++) {
        for (let i = 0; i < ni; i++) {
          const x = room.rect.x0 + ((i + 0.5) * w) / ni;
          const z = room.rect.z0 + ((j + 0.5) * dpt) / nj;
          _o.set(x, room.y + 1.2, z);
          _d.set(0, -1, 0);
          this.rayCount++;
          if (!this.physics.raycastInto(_o, _d, 1.6, this.hit, Groups.WORLD | Groups.PROP)) continue;
          if (this.hit.normal.y < 0.7) continue;
          candidates.push({ x, y: this.hit.point.y, z });
        }
      }
    }

    // Score, then thin. Scoring first means the survivors of the spacing pass
    // are the best point in their neighbourhood rather than the first one seen.
    interface Scored {
      x: number; y: number; z: number;
      nx: number; nz: number;
      low: boolean;
      score: number;
    }
    const scored: Scored[] = [];
    const n = Nav.DIRS;
    for (const c of candidates) {
      const res = this.analyse(c.x, c.y, c.z, 1.15);
      if (!res) continue;
      const { lowMask, highMask } = res;
      let blocked = 0;
      for (let i = 0; i < n; i++) if (lowMask & (1 << i)) blocked++;
      // Enclosed on every side: this is the inside of something, not cover.
      if (blocked >= n - 1) continue;
      // Find the widest protected arc and take its centre as the cover normal.
      let bestStart = -1;
      let bestLen = 0;
      for (let s = 0; s < n; s++) {
        if ((lowMask & (1 << s)) === 0) continue;
        if (lowMask & (1 << ((s - 1 + n) % n))) continue;
        let len = 0;
        while (len < n && lowMask & (1 << ((s + len) % n))) len++;
        if (len > bestLen) {
          bestLen = len;
          bestStart = s;
        }
      }
      if (bestStart < 0) continue;
      const mid = (bestStart + (bestLen - 1) * 0.5) % n;
      const a = (mid / n) * Math.PI * 2;
      const dirX = Math.cos(a);
      const dirZ = Math.sin(a);
      // Low when the arc is blocked at waist height but open at head height.
      let highBlockedInArc = 0;
      for (let i = 0; i < bestLen; i++) {
        if (highMask & (1 << ((bestStart + i) % n))) highBlockedInArc++;
      }
      const low = highBlockedInArc <= bestLen * 0.34;

      // Prefer a decent arc that still leaves plenty of the world visible, and
      // prefer cover that is genuinely close rather than merely nearby.
      const openness = 1 - blocked / n;
      let score = bestLen * 0.55 + openness * 4.0;
      if (low) score += 1.6;
      if (bestLen >= 3 && bestLen <= 7) score += 1.2;
      score += this.hit.distance * 0;
      scored.push({ x: c.x, y: c.y, z: c.z, nx: dirX, nz: dirZ, low, score });
    }

    scored.sort((p, q) => q.score - p.score);

    const cellSize = minSpacing;
    const taken = new Map<string, number>();
    const key = (x: number, z: number, y: number): string =>
      `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)},${Math.floor(y / 2.6)}`;
    for (const s of scored) {
      if (this.coverPoints.length >= maxPoints) break;
      const k = key(s.x, s.z, s.y);
      if (taken.has(k)) continue;
      // Also reject anything too close in a neighbouring bucket.
      let clash = false;
      for (let dj = -1; dj <= 1 && !clash; dj++) {
        for (let di = -1; di <= 1; di++) {
          const nk = `${Math.floor(s.x / cellSize) + di},${Math.floor(s.z / cellSize) + dj},${Math.floor(s.y / 2.6)}`;
          const idx = taken.get(nk);
          if (idx === undefined) continue;
          const o = this.coverPoints[idx];
          if ((o.position.x - s.x) ** 2 + (o.position.z - s.z) ** 2 < minSpacing * minSpacing) {
            clash = true;
            break;
          }
        }
      }
      if (clash) continue;
      taken.set(k, this.coverPoints.length);
      this.coverPoints.push({
        position: new THREE.Vector3(s.x, s.y, s.z),
        normal: new THREE.Vector3(s.nx, 0, s.nz).normalize(),
        low: s.low,
      });
    }
  }

  /* ------------------------------- spawns -------------------------------- */

  /**
   * Spawns are authored as intentions — "in the souk, at the south end, facing
   * up the lane" — and then validated and nudged onto the walk grid. Each one
   * is checked for headroom and for a clear line down its heading, so nobody
   * materialises inside a market stall or nose to nose with a wall.
   */
  addSpawns(list: Array<{ x: number; z: number; heading: number; team: SpawnPoint['team']; weight?: number }>): void {
    for (const s of list) {
      _p.set(s.x, 0, s.z);
      const out = new THREE.Vector3();
      this.nearestNavPoint(_p, out);
      // Push the heading toward whichever nearby direction is most open.
      let heading = s.heading;
      let bestOpen = -1;
      for (let i = -2; i <= 2; i++) {
        const a = s.heading + i * 0.32;
        _o.set(out.x, out.y + 1.55, out.z);
        _d.set(Math.sin(a), 0, Math.cos(a));
        this.rayCount++;
        const hit = this.physics.raycastInto(_o, _d, 12, this.hit, Groups.WORLD | Groups.PROP);
        const dist = hit ? this.hit.distance : 12;
        if (dist > bestOpen) {
          bestOpen = dist;
          heading = a;
        }
      }
      this.spawnPoints.push({
        position: out.clone().setY(out.y + 0.05),
        heading,
        team: s.team,
        weight: s.weight ?? 1,
      });
    }
  }

  /* ---------------------------- sky visibility ---------------------------- */

  /**
   * Fraction of the upper hemisphere that is open sky, cosine weighted.
   *
   * Used by the airstrike targeting to reject markers under a roof, and by the
   * lighting rig as a cheap occlusion term, so it has to be honest about the
   * souk arcade and the market's power lines rather than just testing straight
   * up.
   */
  skyVisibility(p: THREE.Vector3): number {
    const samples: Array<[number, number, number]> = SKY_SAMPLES;
    let open = 0;
    let total = 0;
    for (const [dx, dy, dz] of samples) {
      const w = dy;
      total += w;
      _o.set(p.x, p.y + 0.3, p.z);
      _d.set(dx, dy, dz).normalize();
      this.rayCount++;
      if (!this.physics.raycastInto(_o, _d, 90, this.hit, Groups.WORLD | Groups.PROP)) open += w;
    }
    return total > 0 ? clamp(open / total, 0, 1) : 1;
  }
}

/** A fixed cosine-ish distribution over the upper hemisphere. */
const SKY_SAMPLES: Array<[number, number, number]> = (() => {
  const out: Array<[number, number, number]> = [[0, 1, 0]];
  for (const [elev, count] of [[62, 6], [34, 8]] as const) {
    const e = (elev * Math.PI) / 180;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (elev === 34 ? 0.4 : 0);
      out.push([Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)]);
    }
  }
  return out;
})();
