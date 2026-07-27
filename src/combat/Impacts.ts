/**
 * Impact response.
 *
 * One code path for "something hard just arrived at this point", shared by
 * bullets, shrapnel and projectiles so a rocket chipping a wall and a rifle round
 * chipping the same wall agree on the effect, the decal, the destruction and the
 * sound. Nothing in here allocates: the event payload is a single reused record
 * and the sound ids are pre-built per surface.
 */
import * as THREE from 'three';
import type { PhysicsUserData } from '../core/Contracts';
import type { SurfaceType } from '../core/GameTypes';
import { clamp, saturate } from '../core/MathUtils';
import { SURFACE_BALLISTICS } from './Surfaces';
import type { CombatDeps } from './Deps';

/** Destructible damage a full-energy round delivers. Window glass has 12 health. */
const BULLET_DESTRUCTION = 26;
const BULLET_DESTRUCTION_BASE = 13;
/** Radius handed to `world.damageAt` for a single round. */
const BULLET_DESTRUCTION_RADIUS = 0.14;

/**
 * Radius of the tiny blast used to shove a struck prop. Physics exposes bodies
 * only through handles the hit record does not carry, so a point impulse is
 * expressed as a very small radial one — it reaches the struck body and little
 * else.
 */
const PUSH_RADIUS = 0.3;

export interface ImpactOptions {
  /** 0..1 remaining energy; drives effect scale, decal size and loudness. */
  energy: number;
  /** Newton-seconds available to shove a dynamic body. */
  impulse: number;
  /** Destructible damage multiplier; shrapnel and rockets hit harder. */
  destruction: number;
  /** Set for flesh so blood is sprayed instead of a decal being stamped. */
  organic: boolean;
  userData: PhysicsUserData | null;
  /** Suppresses the impact sound for the many fragments of one explosion. */
  silent: boolean;
}

export class ImpactResolver {
  private readonly payload = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    surface: 'concrete' as SurfaceType,
    energy: 0,
  };
  private readonly bloodDir = new THREE.Vector3();

  constructor(private readonly deps: CombatDeps) {}

  /**
   * `direction` is the travel direction of whatever arrived, `normal` the surface
   * normal at `point`. Both must already be safe to hold — never pass a physics
   * ring vector straight through, since this calls back into physics.
   */
  resolve(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    direction: THREE.Vector3,
    surface: SurfaceType,
    options: ImpactOptions,
  ): void {
    const mat = SURFACE_BALLISTICS[surface];
    const energy = saturate(options.energy);
    const fx = this.deps.fx;

    if (fx) {
      fx.impact(point, normal, surface, energy);
      if (options.organic || mat.organic) {
        fx.bloodSpray(point, this.bloodDir.copy(direction), 0.4 + energy * 0.8);
      } else {
        fx.decal(point, normal, surface, mat.decalSize * (0.75 + energy * 0.5));
      }
    }

    if (!options.organic && !mat.organic) {
      this.deps.world?.damageAt(
        point,
        BULLET_DESTRUCTION_RADIUS,
        (BULLET_DESTRUCTION_BASE + BULLET_DESTRUCTION * energy) * options.destruction,
      );
    }

    const kind = options.userData?.kind;
    if (options.impulse > 0 && (kind === 'dynamic' || kind === 'debris' || kind === 'ragdoll')) {
      this.deps.physics?.applyRadialImpulse(point, PUSH_RADIUS, options.impulse);
    }

    if (!options.silent) {
      this.deps.audio?.play(mat.impactSound, point, {
        volume: clamp(0.28 + energy * 0.6, 0.15, 1),
        pitch: 0.92 + energy * 0.18,
        refDistance: 4,
        maxDistance: 60,
      });
    }

    const payload = this.payload;
    payload.point.copy(point);
    payload.normal.copy(normal);
    payload.surface = surface;
    payload.energy = energy;
    this.deps.emit('combat:impact', payload);
  }
}
