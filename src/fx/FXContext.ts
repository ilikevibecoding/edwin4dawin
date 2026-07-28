import type * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import type { IAI, ILighting, IPhysics, RaycastHit } from '../core/Interfaces';
import type { FxRng } from './Random';
import type { QualitySettings } from '../core/Quality';
import type DecalSystem from './DecalSystem';
import type { DebrisPool } from './DebrisPool';
import type { ParticleEngine } from './ParticleEngine';

/**
 * What an effect recipe is allowed to reach for.
 *
 * The recipes — impacts, explosions, ordnance, ballistics — are plain functions
 * rather than classes because they own no state; they read this, write spawn
 * records, and return. Anything with a lifetime lives on `FXSystem` and is
 * reached through here, which keeps the recipes honest about their inputs and
 * makes each one testable in isolation.
 */
export interface FXHost {
  readonly ctx: GameContext;
  readonly quality: QualitySettings;
  readonly particles: ParticleEngine;
  readonly debris: DebrisPool;
  readonly rng: FxRng;
  readonly physics: IPhysics | undefined;
  readonly lighting: ILighting | undefined;
  readonly decals: DecalSystem | undefined;
  readonly ai: IAI | undefined;
  /** Metres of wind drift per second, already scaled by the weather. */
  readonly wind: THREE.Vector3;
  /**
   * Unit vector towards the sun. Recipes need it to work out which side of a
   * cloud they are building is the lit one; see `ParticleDesc.burial`.
   */
  readonly sunDir: THREE.Vector3;

  /** Ground height below a point, or `fallback` when nothing is beneath it. */
  groundY(x: number, z: number, fromY: number, fallback: number): number;
  /** Distance from the player's eye, for cheap distance culling of detail. */
  distanceTo(x: number, y: number, z: number): number;
  shake(amplitude: number, duration: number, frequency: number, at: THREE.Vector3, radius: number): void;
  sound(id: string, at: THREE.Vector3 | undefined, volume: number, rate: number): void;
  /**
   * A pooled flash light. Goes straight to `ILighting`, but through here rather
   * than directly so the system can reproduce it when the clock is held: a
   * screenshot of a blast at 50 ms has to be lit by the light that blast had at
   * 50 ms, not by whatever is left of it after the harness has settled the
   * frame. `intensity` is kilocandela.
   */
  light(at: THREE.Vector3, color: number, intensity: number, radius: number, duration: number): void;
  /** Adds to the brief post-blast screen shimmer. Decays on its own. */
  addConcussion(haze: number, blur: number): void;
  /** Shared scratch hit record; valid until the next raycast. */
  readonly hit: RaycastHit;
}
