/**
 * Listener, occlusion and acoustic space.
 *
 * Three jobs, all of which need the physics raycaster and none of which may
 * allocate:
 *
 *  - keeping the WebAudio listener aligned with the camera, which is what makes
 *    a panner mean anything;
 *  - deciding how much of a sound reaches the ear directly, by tracing to the
 *    emitter and to either side of it — a source round a corner is low-passed
 *    and attenuated, not switched off, because that is what a wall does;
 *  - working out what kind of space the listener is standing in, by measuring
 *    it. Nine rays give a ceiling height, an openness, a nearest wall and an
 *    elongation, and those four numbers plus the world's sky visibility are
 *    enough to tell a room from a street from a covered arcade without anyone
 *    having to place a trigger volume.
 */

import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { IPhysics, IWorld, RaycastHit } from '../core/Interfaces';
import { classify, type ZoneName, type ZoneProbe } from './dsp/Zones';

const OCCLUDER_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;

/** Probe range for the space measurement, in metres. */
const PROBE_RANGE = 26;
const CEILING_RANGE = 18;

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _side = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3();
const _point = new THREE.Vector3();

/** Reusable raycast result. `raycastInto` writes here and never allocates. */
const _hit: RaycastHit = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  distance: 0,
  object: new THREE.Object3D(),
  surface: 'concrete',
};

/** Eight compass bearings, unrolled so the probe loop allocates nothing. */
const BEARINGS = new Float32Array([
  1, 0, 0.7071, 0.7071, 0, 1, -0.7071, 0.7071, -1, 0, -0.7071, -0.7071, 0, -1, 0.7071, -0.7071,
]);

/**
 * A small fixed-capacity cache of occlusion results, keyed on a two-metre grid.
 *
 * Without it, sustained fire plus impacts plus a dozen enemies would trace
 * several hundred rays a second for information that changes slowly. With it,
 * the same query from anywhere in the same cell within a quarter second is free.
 */
class OcclusionCache {
  private keys: Int32Array;
  private vals: Float32Array;
  private times: Float64Array;
  hits = 0;
  misses = 0;

  constructor(private capacity = 192) {
    this.keys = new Int32Array(capacity).fill(-1);
    this.vals = new Float32Array(capacity);
    this.times = new Float64Array(capacity);
  }

  private static hash(x: number, y: number, z: number): number {
    const cx = Math.round(x * 0.5);
    const cy = Math.round(y * 0.5);
    const cz = Math.round(z * 0.5);
    let h = (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791);
    h = h >>> 0;
    return h === 0xffffffff ? 1 : (h & 0x7fffffff) + 1;
  }

  get(x: number, y: number, z: number, now: number, maxAge: number): number {
    const key = OcclusionCache.hash(x, y, z);
    const slot = key % this.capacity;
    if (this.keys[slot] === key && now - this.times[slot] < maxAge) {
      this.hits++;
      return this.vals[slot];
    }
    this.misses++;
    return -1;
  }

  put(x: number, y: number, z: number, value: number, now: number): void {
    const key = OcclusionCache.hash(x, y, z);
    const slot = key % this.capacity;
    this.keys[slot] = key;
    this.vals[slot] = value;
    this.times[slot] = now;
  }

  clear(): void {
    this.keys.fill(-1);
    this.hits = 0;
    this.misses = 0;
  }
}

export class Spatial {
  private physics: IPhysics | null = null;
  private world: IWorld | null = null;
  private cache = new OcclusionCache();
  private clock = 0;

  /** Rays traced this frame, for the perf overlay. */
  rays = 0;

  /* --- space measurement state, advanced a few rays per frame --- */
  private probeIndex = 0;
  private distances = new Float32Array(8).fill(PROBE_RANGE);
  private ceiling = CEILING_RANGE;
  private sky = 1;
  readonly probe: ZoneProbe = {
    openness: PROBE_RANGE,
    nearest: PROBE_RANGE,
    ceiling: CEILING_RANGE,
    sky: 1,
    elongation: 1,
    enclosure: 0,
  };
  zone: ZoneName = 'street';
  confidence = 0;
  /** Set when `setReverbZone` was called by hand; suppresses inference. */
  manual = false;

  private probePos = new THREE.Vector3();

  bind(physics: IPhysics | null, world: IWorld | null): void {
    this.physics = physics;
    this.world = world;
    this.cache.clear();
  }

  get hasPhysics(): boolean {
    return this.physics !== null;
  }

  /**
   * Aligns the WebAudio listener with the camera. The modern `AudioParam` form
   * is used where it exists and the deprecated setters where it does not,
   * because Safari still only has the latter.
   */
  updateListener(ctx: BaseAudioContext, camera: THREE.Camera, now: number): void {
    const l = ctx.listener;
    camera.getWorldPosition(_origin);
    camera.getWorldDirection(_fwd);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    try {
      if (l.positionX) {
        l.positionX.setValueAtTime(_origin.x, now);
        l.positionY.setValueAtTime(_origin.y, now);
        l.positionZ.setValueAtTime(_origin.z, now);
        l.forwardX.setValueAtTime(_fwd.x, now);
        l.forwardY.setValueAtTime(_fwd.y, now);
        l.forwardZ.setValueAtTime(_fwd.z, now);
        l.upX.setValueAtTime(_up.x, now);
        l.upY.setValueAtTime(_up.y, now);
        l.upZ.setValueAtTime(_up.z, now);
      } else {
        const legacy = l as unknown as {
          setPosition(x: number, y: number, z: number): void;
          setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void;
        };
        legacy.setPosition(_origin.x, _origin.y, _origin.z);
        legacy.setOrientation(_fwd.x, _fwd.y, _fwd.z, _up.x, _up.y, _up.z);
      }
    } catch {
      /* a suspended or exotic context may refuse; the mix still works */
    }
  }

  /**
   * Occlusion between the listener and a point, 0 (clear) to 1 (solid).
   *
   * Three rays: one straight at the emitter and one to either side, offset
   * perpendicular to the line of sight. A source just around a corner blocks
   * the centre ray but not both flanks, which is the partial case that matters
   * — it is the difference between a man behind a wall and a man behind a
   * doorway, and the ear can tell.
   */
  occlusion(lx: number, ly: number, lz: number, x: number, y: number, z: number): number {
    const physics = this.physics;
    if (!physics) return 0;
    const dx = x - lx;
    const dy = y - ly;
    const dz = z - lz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1.2) return 0;

    const cached = this.cache.get(x, y, z, this.clock, 0.22);
    if (cached >= 0) return cached;

    _origin.set(lx, ly, lz);
    const inv = 1 / dist;
    _dir.set(dx * inv, dy * inv, dz * inv);
    // Perpendicular in the horizontal plane; a wall's edge is nearly always
    // vertical, so a horizontal offset is what finds the way round it.
    _side.set(-_dir.z, 0, _dir.x);
    const sideLen = _side.length();
    if (sideLen > 1e-4) _side.multiplyScalar(1 / sideLen);
    else _side.set(1, 0, 0);

    const spread = Math.min(0.8, 0.18 + dist * 0.03);
    let blocked = 0;
    const reach = dist - 0.35;
    if (reach > 0.2) {
      if (physics.raycastInto(_origin, _dir, reach, _hit, OCCLUDER_MASK)) blocked += 2;
      this.rays++;
      for (let s = -1; s <= 1; s += 2) {
        _point.set(lx + _side.x * spread * s, ly, lz + _side.z * spread * s);
        _dir.set(x - _point.x, y - _point.y, z - _point.z);
        const len = _dir.length();
        if (len < 0.1) continue;
        _dir.multiplyScalar(1 / len);
        if (physics.raycastInto(_point, _dir, len - 0.35, _hit, OCCLUDER_MASK)) blocked += 1;
        this.rays++;
      }
    }
    // Weighted so the direct path counts double: losing only the flanks is a
    // grazing occlusion, losing only the centre is a pillar in the way.
    const occ = Math.min(1, blocked / 4);
    this.cache.put(x, y, z, occ, this.clock);
    return occ;
  }

  /**
   * Advances the space measurement. Called every frame; traces at most three
   * rays, so a full sweep of the nine takes three frames and a fresh
   * classification arrives several times a second.
   */
  update(dt: number, listener: THREE.Vector3): void {
    this.clock += dt;
    const physics = this.physics;
    if (!physics) {
      // Without a raycaster, fall back to whatever the world will tell us.
      this.sky = this.world?.skyVisibility(listener) ?? 1;
      this.probe.sky = this.sky;
      this.probe.openness = this.sky > 0.5 ? PROBE_RANGE : 6;
      this.probe.nearest = this.sky > 0.5 ? PROBE_RANGE : 4;
      this.probe.ceiling = this.sky > 0.5 ? CEILING_RANGE : 3.2;
      this.probe.elongation = 1;
      this.probe.enclosure = this.sky > 0.5 ? 0 : 0.8;
      this.reclassify();
      return;
    }

    if (this.probeIndex === 0) this.probePos.copy(listener);
    const from = this.probePos;
    _origin.set(from.x, from.y, from.z);

    for (let step = 0; step < 3; step++) {
      const i = this.probeIndex;
      if (i < 8) {
        _dir.set(BEARINGS[i * 2], 0, BEARINGS[i * 2 + 1]).normalize();
        const hit = physics.raycastInto(_origin, _dir, PROBE_RANGE, _hit, OCCLUDER_MASK);
        this.distances[i] = hit ? _hit.distance : PROBE_RANGE;
        this.rays++;
      } else if (i === 8) {
        _dir.set(0, 1, 0);
        const hit = physics.raycastInto(_origin, _dir, CEILING_RANGE, _hit, OCCLUDER_MASK);
        this.ceiling = hit ? _hit.distance : CEILING_RANGE;
        this.rays++;
        this.sky = this.world?.skyVisibility(from) ?? (hit ? 0 : 1);
      }
      this.probeIndex++;
      if (this.probeIndex > 8) {
        this.probeIndex = 0;
        this.finishProbe();
        break;
      }
    }
  }

  private finishProbe(): void {
    let sum = 0;
    let nearest = PROBE_RANGE;
    let enclosed = 0;
    for (let i = 0; i < 8; i++) {
      const d = this.distances[i];
      sum += d;
      if (d < nearest) nearest = d;
      if (d < 8) enclosed++;
    }
    // Pair opposite bearings into four axes; a corridor is long on one and
    // short on the one across it, and no room is.
    let longest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 4; i++) {
      const extent = this.distances[i] + this.distances[i + 4];
      if (extent > longest) longest = extent;
      if (extent < shortest) shortest = extent;
    }
    const p = this.probe;
    p.openness = sum / 8;
    p.nearest = nearest;
    p.ceiling = this.ceiling;
    p.sky = this.sky;
    p.elongation = longest / Math.max(1, shortest);
    p.enclosure = enclosed / 8;
    this.reclassify();
  }

  private reclassify(): void {
    const result = classify(this.probe);
    this.zone = result.zone;
    this.confidence = result.confidence;
  }

  resetRayCount(): void {
    this.rays = 0;
  }

  get cacheStats(): { hits: number; misses: number } {
    return { hits: this.cache.hits, misses: this.cache.misses };
  }
}
