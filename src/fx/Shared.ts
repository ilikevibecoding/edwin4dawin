import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import type {
  AudioSystem,
  PhysicsSystem,
  RenderSystem,
  WorldSystem,
} from '../core/Contracts';
import { COLLISION_GROUP, type SurfaceType } from '../core/GameTypes';
import type { DecalSystem } from './Decals';
import type { FXGroups } from './Groups';
import { NO_FLOOR } from './ParticleSystem';

/** Coarse surface families; every impact response is authored per family. */
export type SurfaceFamily =
  | 'masonry'
  | 'metal'
  | 'wood'
  | 'loose'
  | 'glass'
  | 'water'
  | 'flesh'
  | 'soft'
  | 'foliage';

export function familyOf(surface: SurfaceType): SurfaceFamily {
  switch (surface) {
    case 'concrete':
    case 'brick':
    case 'plaster':
    case 'tile':
      return 'masonry';
    case 'metal':
      return 'metal';
    case 'wood':
      return 'wood';
    case 'dirt':
    case 'sand':
    case 'gravel':
    case 'grass':
      return 'loose';
    case 'glass':
      return 'glass';
    case 'water':
      return 'water';
    case 'flesh':
      return 'flesh';
    case 'foliage':
      return 'foliage';
    default:
      return 'soft';
  }
}

/**
 * Everything the effect emitters need, resolved once and shared. Systems that
 * boot after FX are picked up lazily, so a missing module degrades to "no
 * lights" or "no physics debris" rather than throwing.
 */
export class FXDeps {
  ctx!: EngineContext;
  groups!: FXGroups;
  decals!: DecalSystem;
  render: RenderSystem | null = null;
  physics: PhysicsSystem | null = null;
  world: WorldSystem | null = null;
  audio: AudioSystem | null = null;

  /** Scaled scene time, matching the particle shaders' clock. */
  now = 0;
  /** Camera world position, refreshed once per frame. */
  readonly cameraPosition = new THREE.Vector3();
  /** Sun direction in world space, pointing at the sun. */
  readonly sunDirection = new THREE.Vector3(0.4, 0.8, 0.3);
  /** Horizontal wind, used to drift smoke columns. */
  readonly wind = new THREE.Vector3(0.55, 0, -0.3);
  /**
   * Floor height to use instead of probing, or null for the real world.
   *
   * The dev proving range is visual meshes only, with no colliders, so without
   * this every effect staged there would decide there is nothing to land on and
   * debris would hang in the air — the opposite of what the range is for.
   */
  floorOverride: number | null = null;

  private lightBudgetTimer = 0;

  /**
   * Cached sun-occlusion probes: quantised position, answer and expiry.
   *
   * Sized so a firefight's worth of impacts along one wall shares a handful of
   * rays; a linear scan of this is cheaper than the cast it avoids.
   */
  private readonly probeKey = new Int32Array(SUN_PROBE_SLOTS * 3);
  private readonly probeValue = new Float32Array(SUN_PROBE_SLOTS);
  private readonly probeExpiry = new Float32Array(SUN_PROBE_SLOTS);
  private probeCursor = 0;
  private readonly probeOrigin = new THREE.Vector3();
  // Static geometry only: a soldier walking through the beam must not flicker a
  // whole dust cloud between lit and shadowed.
  private readonly sunRayOptions = {
    maxDistance: SUN_PROBE_RANGE,
    groups: COLLISION_GROUP.STATIC,
  };
  private readonly groundRayOptions = { maxDistance: 24, groups: COLLISION_GROUP.STATIC };

  resolve(ctx: EngineContext): void {
    this.render ??= ctx.tryGet<RenderSystem>('render') ?? null;
    this.physics ??= ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.world ??= ctx.tryGet<WorldSystem>('world') ?? null;
    this.audio ??= ctx.tryGet<AudioSystem>('audio') ?? null;
  }

  tickLightBudget(dt: number): void {
    this.lightBudgetTimer -= dt;
  }

  /**
   * Small, frequent light requests (spark showers, impact flickers) are rate
   * limited so they cannot evict the explosion and fire lights that matter.
   */
  requestSmallLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number,
    duration: number,
  ): void {
    if (this.lightBudgetTimer > 0 || !this.render) return;
    this.lightBudgetTimer = 0.07;
    this.render.requestDynamicLight(position, color, intensity, distance, duration);
  }

  /** Unconditional request, for explosions, muzzle flashes and fires. */
  requestLight(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    distance: number,
    duration: number,
  ): void {
    this.render?.requestDynamicLight(position, color, intensity, distance, duration);
  }

  play(id: string, position: THREE.Vector3, volume: number, pitch: number): void {
    this.audio?.play(id, position, { volume, pitch, refDistance: 3, maxDistance: 45 });
  }

  /** Squared distance from the camera, for LOD decisions on effect density. */
  distanceSqTo(position: THREE.Vector3): number {
    return this.cameraPosition.distanceToSquared(position);
  }

  /**
   * How much of the sun reaches a point, 0..1.
   *
   * Particles are not in the shadow map — they are billboards simulated in a
   * vertex shader, with no place in a cascade render — so on their own they are
   * lit at full sun everywhere. In a city that is wrong nearly everywhere: a
   * street is a shadowed canyon, and a dust puff shaded as though it were in
   * open sunlight comes out an order of magnitude brighter than the pavement it
   * was knocked off, which is exactly how a burst of dust ends up washing out a
   * third of the frame.
   *
   * One ray per *effect* fixes it. The result is cached on a coarse grid with a
   * short expiry, so a sustained firefight against one wall pays for a couple of
   * casts a second rather than one per bullet.
   */
  sunVisibility(position: THREE.Vector3): number {
    const physics = this.physics;
    if (!physics || !physics.ready) return 1;

    const kx = Math.round(position.x / SUN_PROBE_CELL);
    const ky = Math.round(position.y / SUN_PROBE_CELL);
    const kz = Math.round(position.z / SUN_PROBE_CELL);
    const now = this.now;
    for (let i = 0; i < SUN_PROBE_SLOTS; i++) {
      if (this.probeExpiry[i] <= now) continue;
      const o = i * 3;
      if (this.probeKey[o] !== kx || this.probeKey[o + 1] !== ky || this.probeKey[o + 2] !== kz) {
        continue;
      }
      return this.probeValue[i];
    }

    // Started a little off the surface, or the collider the effect was spawned
    // against reports itself as the occluder.
    this.probeOrigin.copy(position).addScaledVector(this.sunDirection, 0.25);
    const blocked = physics.raycast(this.probeOrigin, this.sunDirection, this.sunRayOptions);
    // Not zero: a shadowed cloud is still lit by the part of the sky the
    // occluder does not cover, and a hard cut to ambient makes smoke crossing a
    // shadow edge flicker between two obviously different materials.
    const visibility = blocked ? SUN_PROBE_SHADOW : 1;

    const slot = this.probeCursor;
    this.probeCursor = (this.probeCursor + 1) % SUN_PROBE_SLOTS;
    const o = slot * 3;
    this.probeKey[o] = kx;
    this.probeKey[o + 1] = ky;
    this.probeKey[o + 2] = kz;
    this.probeValue[slot] = visibility;
    this.probeExpiry[slot] = now + SUN_PROBE_TTL;
    return visibility;
  }

  /**
   * Ground height under a point, or `NO_FLOOR` when there is nothing to land on.
   *
   * Returning a guess would be worse than returning nothing: an effect on a
   * rooftop whose floor came back as street level throws debris that sinks
   * through the roof, which is a more obvious artefact than debris that never
   * lands. So the terrain answer is only accepted when the drop to it is
   * plausible, and a miss disables the collision instead of inventing a floor.
   */
  groundAt(x: number, z: number, near: number): number {
    if (this.floorOverride !== null) return this.floorOverride;
    const physics = this.physics;
    if (physics && physics.ready) {
      this.probeOrigin.set(x, near + 0.5, z);
      const hit = physics.raycast(this.probeOrigin, DOWN, this.groundRayOptions);
      if (hit) return hit.point.y;
    }
    const world = this.world;
    if (world) {
      const y = world.sampleGround(x, z);
      if (y !== null && y !== undefined && near - y < 6) return y;
    }
    return NO_FLOOR;
  }
}

/** Probe cache: cell size in metres, slot count, lifetime and shadow floor. */
const SUN_PROBE_CELL = 1.6;
const SUN_PROBE_SLOTS = 48;
const SUN_PROBE_TTL = 0.4;
const SUN_PROBE_RANGE = 70;
const SUN_PROBE_SHADOW = 0.1;

const DOWN = /* @__PURE__ */ new THREE.Vector3(0, -1, 0);
