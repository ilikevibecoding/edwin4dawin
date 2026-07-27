import * as THREE from 'three';
import type { EngineContext } from '../core/System';
import type {
  AudioSystem,
  PhysicsSystem,
  RenderSystem,
  WorldSystem,
} from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import type { DecalSystem } from './Decals';
import type { FXGroups } from './Groups';

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

  private lightBudgetTimer = 0;

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
}
