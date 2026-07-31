/**
 * Occlusion.
 *
 * A gunshot fired from inside a building should not arrive at full brightness
 * through two brick walls. When a physics system is available this raycasts from
 * the listener to the source and, when the line is blocked, pushes the voice's
 * air filter much further down and takes some level off.
 *
 * Three constraints shape the implementation:
 *
 *  - Raycasts are not free. Only voices that are close enough and important
 *    enough get one, and there is a hard budget per frame.
 *  - The answer must not chatter. A source at a doorway flips between blocked
 *    and clear several times a second, so results are cached per spatial cell
 *    and the applied value is smoothed toward the target.
 *  - The physics system may not exist, may not be ready, or may throw. Every
 *    call is guarded and the failure mode is "no occlusion", never a crash.
 */
import * as THREE from 'three';
import { COLLISION_GROUP } from '../core/GameTypes';
import { damp, saturate } from '../core/MathUtils';
import type { PhysicsSystem } from '../core/Contracts';

/** Cell size for the cache, metres. Coarse enough to be stable. */
const CELL = 2.0;
/** Beyond this the test is not worth doing; distance attenuation dominates. */
const MAX_TEST_DISTANCE = 85;
/** Below this a source is effectively in the room with you. */
const MIN_TEST_DISTANCE = 3;
/** Seconds before a cached answer is retested. */
const CACHE_TTL = 0.35;

interface CacheEntry {
  blocked: number;
  testedAt: number;
}

export interface OcclusionResult {
  /** 0 = clear line of sight, 1 = fully blocked. */
  amount: number;
  /** True when a fresh test was performed this call. */
  tested: boolean;
}

/** At or above this an `importance` may draw on the reserve. */
const IMPORTANT = 0.9;

export class OcclusionField {
  private readonly cache = new Map<number, CacheEntry>();
  private readonly listener = new THREE.Vector3();
  private readonly probe = new THREE.Vector3();
  private physics: PhysicsSystem | null = null;
  private budget = 0;
  private reserve = 0;
  private time = 0;
  /** Diagnostics. */
  tests = 0;
  cacheHits = 0;

  /** Tests permitted per frame. Scaled down when the pool is under load. */
  testsPerFrame = 4;
  /**
   * Extra tests only a high-priority source may spend. Without this a frame full
   * of casings and footsteps can exhaust the budget before the gunshot that the
   * player actually needs to place is reached, since voices are visited in pool
   * order rather than by priority. The worst case stays bounded at
   * `testsPerFrame + reservePerFrame`.
   */
  reservePerFrame = 2;

  setPhysics(physics: PhysicsSystem | null): void {
    this.physics = physics;
  }

  get available(): boolean {
    return this.physics !== null && this.physics.ready !== false;
  }

  beginFrame(dt: number, listenerPosition: THREE.Vector3): void {
    this.time += dt;
    this.listener.copy(listenerPosition);
    this.budget = this.testsPerFrame;
    this.reserve = this.reservePerFrame;
    if (this.cache.size > 512) this.pruneCache();
  }

  /**
   * Occlusion for a world position. Returns the cached value immediately and
   * spends a raycast only when the cell is stale and there is budget left.
   */
  query(x: number, y: number, z: number, importance: number): OcclusionResult {
    if (!this.available) return CLEAR;

    const dx = x - this.listener.x;
    const dy = y - this.listener.y;
    const dz = z - this.listener.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < MIN_TEST_DISTANCE || distance > MAX_TEST_DISTANCE) return CLEAR;

    const key = cellKey(x, y, z);
    const entry = this.cache.get(key);
    if (entry && this.time - entry.testedAt < CACHE_TTL) {
      this.cacheHits++;
      return { amount: entry.blocked, tested: false };
    }
    // Important sources fall back on the reserve; ambient ones wait a frame and
    // keep whatever the cell last answered.
    if (this.budget > 0) this.budget--;
    else if (importance >= IMPORTANT && this.reserve > 0) this.reserve--;
    else return entry ? { amount: entry.blocked, tested: false } : CLEAR;

    this.tests++;
    this.probe.set(x, y, z);
    let blocked = 0;
    try {
      const clear = this.physics!.lineOfSight(
        this.listener,
        this.probe,
        COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC,
      );
      blocked = clear ? 0 : 1;
    } catch {
      // A physics backend that is still booting, or a query it cannot answer.
      blocked = entry?.blocked ?? 0;
    }
    this.cache.set(key, { blocked, testedAt: this.time });
    return { amount: blocked, tested: true };
  }

  /**
   * Smooth a voice's applied occlusion toward the queried target. Half a second
   * of smoothing turns a binary raycast into something that sounds like a door
   * opening rather than a switch flipping.
   */
  smooth(current: number, target: number, dt: number): number {
    return damp(current, saturate(target), 5.5, dt);
  }

  private pruneCache(): void {
    const cutoff = this.time - CACHE_TTL * 4;
    for (const [key, entry] of this.cache) {
      if (entry.testedAt < cutoff) this.cache.delete(key);
    }
    // Still oversized: the player has moved a long way, so start clean.
    if (this.cache.size > 512) this.cache.clear();
  }

  clear(): void {
    this.cache.clear();
    this.tests = 0;
    this.cacheHits = 0;
  }
}

const CLEAR: OcclusionResult = { amount: 0, tested: false };

/**
 * Hash of a 2 m cell. The Y term is coarser because vertical position matters
 * much less for whether a wall is in the way.
 */
function cellKey(x: number, y: number, z: number): number {
  const cx = Math.round(x / CELL) & 0x3ff;
  const cy = Math.round(y / (CELL * 2)) & 0x7f;
  const cz = Math.round(z / CELL) & 0x3ff;
  return (cx << 17) | (cy << 10) | cz;
}

/**
 * How much an occluded voice is dulled and attenuated.
 *
 * A brick wall is roughly a first-order lowpass at a few hundred hertz plus
 * 12-15 dB of broadband loss. `amount` interpolates from clear to that.
 */
export function occludedCutoff(baseHz: number, amount: number): number {
  // Down to a quarter of the open cutoff, and never above 900 Hz when fully
  // blocked — that upper clamp is what makes it read as "through a wall".
  const scaled = baseHz * (1 - 0.78 * amount);
  const ceiling = 20000 * Math.pow(0.045, amount);
  return Math.min(scaled, ceiling);
}

export function occludedGain(amount: number): number {
  return 1 - 0.62 * amount;
}

/** Occluded sources feed more reverb, not less: you hear the room, not the source. */
export function occludedSend(base: number, amount: number): number {
  return base * (1 + 0.5 * amount);
}
