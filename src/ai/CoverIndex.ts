/**
 * Cover lookup and the claim registry.
 *
 * The world publishes upwards of 1800 cover points. Scoring all of them for every
 * agent every time it wants to move would be the single most expensive thing the
 * AI does, so they are bucketed into a uniform grid once at startup and a query
 * only ever touches the buckets that overlap its search radius.
 *
 * The claim registry is the other half: two agents choosing the same slot is the
 * most obvious possible tell that they are not really a squad. A claim is a soft
 * reservation with a timeout — an agent that dies, or is knocked into another
 * state and forgets to release it, frees the slot on its own.
 */
import * as THREE from 'three';
import type { CoverPoint } from '../core/Contracts';
import { COVER } from './Tuning';

/** Metres per bucket. About one cover search radius across three buckets. */
const BUCKET = 6;

export interface CoverCandidate {
  index: number;
  point: CoverPoint;
  score: number;
  /** Which peek offset had a firing line, or 'centre' when the slot itself did. */
  side: 'left' | 'right' | 'centre';
}

interface Claim {
  ownerId: number;
  expiresAt: number;
}

export class CoverIndex {
  private points: readonly CoverPoint[] = [];
  private buckets = new Map<number, number[]>();
  private cols = 1;
  private minX = 0;
  private minZ = 0;

  private readonly claims = new Map<number, Claim>();
  /** One slot per agent, so releasing is O(1) and a leak is impossible. */
  private readonly byOwner = new Map<number, number>();

  private readonly scratch = new THREE.Vector3();
  private readonly toThreat = new THREE.Vector3();

  build(points: readonly CoverPoint[]): void {
    this.points = points;
    this.buckets = new Map();
    if (points.length === 0) return;

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const p of points) {
      if (p.position.x < minX) minX = p.position.x;
      if (p.position.z < minZ) minZ = p.position.z;
      if (p.position.x > maxX) maxX = p.position.x;
      if (p.position.z > maxZ) maxZ = p.position.z;
    }
    this.minX = minX;
    this.minZ = minZ;
    this.cols = Math.max(1, Math.ceil((maxX - minX) / BUCKET) + 1);

    for (let i = 0; i < points.length; i++) {
      const key = this.keyOf(points[i].position.x, points[i].position.z);
      let list = this.buckets.get(key);
      if (!list) {
        list = [];
        this.buckets.set(key, list);
      }
      list.push(i);
    }
  }

  get count(): number {
    return this.points.length;
  }

  at(index: number): CoverPoint | null {
    return this.points[index] ?? null;
  }

  private keyOf(x: number, z: number): number {
    const bx = Math.floor((x - this.minX) / BUCKET);
    const bz = Math.floor((z - this.minZ) / BUCKET);
    return bz * this.cols + bx;
  }

  // -------------------------------------------------------------------------
  // Claims
  // -------------------------------------------------------------------------

  claim(index: number, ownerId: number, now: number): boolean {
    const existing = this.claims.get(index);
    if (existing && existing.ownerId !== ownerId && existing.expiresAt > now) return false;
    const previous = this.byOwner.get(ownerId);
    if (previous !== undefined && previous !== index) this.release(previous, ownerId);
    this.claims.set(index, { ownerId, expiresAt: now + COVER.claimTimeout });
    this.byOwner.set(ownerId, index);
    return true;
  }

  /** Keeps a claim alive. Cheap enough to call every frame from the owner. */
  refresh(index: number, ownerId: number, now: number): void {
    const existing = this.claims.get(index);
    if (existing && existing.ownerId === ownerId) existing.expiresAt = now + COVER.claimTimeout;
  }

  release(index: number, ownerId: number): void {
    const existing = this.claims.get(index);
    if (existing && existing.ownerId === ownerId) this.claims.delete(index);
    if (this.byOwner.get(ownerId) === index) this.byOwner.delete(ownerId);
  }

  releaseAll(ownerId: number): void {
    const index = this.byOwner.get(ownerId);
    if (index !== undefined) this.release(index, ownerId);
  }

  isClaimedByOther(index: number, ownerId: number, now: number): boolean {
    const existing = this.claims.get(index);
    return !!existing && existing.ownerId !== ownerId && existing.expiresAt > now;
  }

  claimOwner(index: number): number {
    return this.claims.get(index)?.ownerId ?? -1;
  }

  /** Drops every reservation. Used when the population is cleared. */
  clearClaims(): void {
    this.claims.clear();
    this.byOwner.clear();
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /**
   * Cover slots worth considering, best first.
   *
   * Scoring runs in two stages on purpose. Everything here is arithmetic —
   * distance, the dot product of the cover normal against the threat direction,
   * how far the slot is from the threat, whether a squadmate already owns it — and
   * the expensive part, whether the slot actually has a line on the target, is
   * left to the caller for the handful of candidates that survive.
   *
   * `out` is used as a reusable buffer and is not truncated: only the first
   * *returned* entries are meaningful, and everything past them is last query's
   * leftovers. That is what makes a cover search allocation-free.
   */
  query(
    from: THREE.Vector3,
    threat: THREE.Vector3,
    ownerId: number,
    now: number,
    out: CoverCandidate[],
    opts: {
      radius?: number;
      allowStanding?: boolean;
      allowLow?: boolean;
      minThreatDistance?: number;
      /** Bias towards slots on this side of the threat axis, -1..1. */
      lateralBias?: number;
      /** Deterministic jitter seed, so an agent's choice is stable frame to frame. */
      variety?: number;
    } = {},
  ): number {
    if (this.points.length === 0) return 0;
    let count = 0;

    const radius = opts.radius ?? COVER.searchRadius;
    const allowStanding = opts.allowStanding ?? true;
    const allowLow = opts.allowLow ?? true;
    const minThreat = opts.minThreatDistance ?? COVER.minThreatDistance;
    const lateralBias = opts.lateralBias ?? 0;
    const variety = opts.variety ?? 0;
    const radiusSq = radius * radius;

    // Axis from the threat to the agent, and its perpendicular, for flank bias.
    this.toThreat.set(from.x - threat.x, 0, from.z - threat.z);
    const axisLen = Math.max(1e-4, this.toThreat.length());
    const axisX = this.toThreat.x / axisLen;
    const axisZ = this.toThreat.z / axisLen;
    const perpX = -axisZ;
    const perpZ = axisX;

    const bx0 = Math.floor((from.x - radius - this.minX) / BUCKET);
    const bx1 = Math.floor((from.x + radius - this.minX) / BUCKET);
    const bz0 = Math.floor((from.z - radius - this.minZ) / BUCKET);
    const bz1 = Math.floor((from.z + radius - this.minZ) / BUCKET);

    let worst = -Infinity;
    const limit = COVER.candidates;

    for (let bz = bz0; bz <= bz1; bz++) {
      for (let bx = bx0; bx <= bx1; bx++) {
        const list = this.buckets.get(bz * this.cols + bx);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          const index = list[i];
          const point = this.points[index];
          if (point.low ? !allowLow : !allowStanding) continue;

          const dx = point.position.x - from.x;
          const dz = point.position.z - from.z;
          const dy = point.position.y - from.y;
          const flat = dx * dx + dz * dz;
          if (flat > radiusSq) continue;
          // A slot two storeys up is not "close" no matter what the plan says.
          if (Math.abs(dy) > 3.2) continue;

          const tx = threat.x - point.position.x;
          const tz = threat.z - point.position.z;
          const threatDist = Math.hypot(tx, tz);
          if (threatDist < minThreat) continue;
          const protection = (tx * point.normal.x + tz * point.normal.z) / Math.max(1e-4, threatDist);
          if (protection < COVER.minProtection) continue;

          if (this.isClaimedByOther(index, ownerId, now)) continue;

          const distance = Math.sqrt(flat);
          let score =
            protection * COVER.wProtection -
            distance * COVER.wDistance +
            // Closing a little is good, closing all the way is suicide.
            (1 - Math.abs(threatDist - 16) / 24) * COVER.wThreatDistance * 4;

          if (lateralBias !== 0) {
            const lateral = ((point.position.x - threat.x) * perpX + (point.position.z - threat.z) * perpZ) /
              Math.max(1e-4, threatDist);
            score += lateral * lateralBias * COVER.wFiring;
          }
          // Deterministic per-agent noise: two riflemen with identical options
          // must not pick identically, and the same rifleman must not oscillate.
          score += hashNoise(index * 2654435761 + variety) * COVER.wVariety;

          if (count >= limit && score <= worst) continue;
          count = insertSorted(out, count, index, point, score, limit);
          worst = out[count - 1].score;
        }
      }
    }
    return count;
  }
}

/** Insertion sort into a fixed-capacity buffer, reusing the entry objects. */
function insertSorted(
  list: CoverCandidate[],
  count: number,
  index: number,
  point: CoverPoint,
  score: number,
  limit: number,
): number {
  let i = count;
  while (i > 0 && list[i - 1].score < score) i--;
  if (i >= limit) return count;
  while (list.length < limit) list.push({ index: 0, point, score: -Infinity, side: 'centre' });

  const next = Math.min(count + 1, limit);
  for (let j = next - 1; j > i; j--) {
    const destination = list[j];
    const source = list[j - 1];
    destination.index = source.index;
    destination.point = source.point;
    destination.score = source.score;
    destination.side = source.side;
  }
  const slot = list[i];
  slot.index = index;
  slot.point = point;
  slot.score = score;
  slot.side = 'centre';
  return next;
}

/** Deterministic 0..1 from an integer. */
function hashNoise(seed: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
