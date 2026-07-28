import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import type {
  IAI,
  IDecals,
  IFX,
  ILighting,
  IMaterialLibrary,
  IPhysics,
  IPlayer,
  IRenderPipeline,
  ISky,
  IWorld,
} from '../core/Interfaces';

/**
 * Shared plumbing for the killstreak package.
 *
 * The systems this package talks to land at different times and several of them
 * may never land at all, so everything is resolved lazily through `tryGet` and
 * every call site null-checks. `Deps.refresh` is called once a frame and costs a
 * handful of map lookups until each one is found.
 */

export class Deps {
  physics?: IPhysics;
  world?: IWorld;
  player?: IPlayer;
  ai?: IAI;
  fx?: IFX;
  decals?: IDecals;
  lighting?: ILighting;
  pipeline?: IRenderPipeline;
  sky?: ISky;
  materials?: IMaterialLibrary;

  refresh(ctx: GameContext): void {
    this.physics ??= ctx.tryGet<IPhysics>('physics');
    this.world ??= ctx.tryGet<IWorld>('world');
    this.player ??= ctx.tryGet<IPlayer>('player');
    this.ai ??= ctx.tryGet<IAI>('ai');
    this.fx ??= ctx.tryGet<IFX>('fx');
    this.decals ??= ctx.tryGet<IDecals>('decals');
    this.lighting ??= ctx.tryGet<ILighting>('lighting');
    this.pipeline ??= ctx.tryGet<IRenderPipeline>('render');
    this.sky ??= ctx.tryGet<ISky>('sky');
    this.materials ??= ctx.tryGet<IMaterialLibrary>('materials');
  }

  /** Ground height below a point, falling back to the terrain field then to 0. */
  groundAt(x: number, z: number, fromY = 60): number {
    const hit = this.physics?.groundHeight?.(x, z, fromY);
    if (hit !== null && hit !== undefined) return hit;
    return this.world?.terrainHeight?.(x, z) ?? 0;
  }
}

/**
 * Heading convention.
 *
 * A heading is a compass bearing in radians for the direction the aircraft
 * *travels*, measured from north (-Z) toward east (+X) — the same convention
 * `ISky.sunAzimuth` uses, so the two can be compared without a sign hunt.
 */
export function headingToDir(heading: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(Math.sin(heading), 0, -Math.cos(heading));
}

/** The horizontal normal to a heading, pointing to the aircraft's right. */
export function headingToRight(heading: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(Math.cos(heading), 0, Math.sin(heading));
}

export function dirToHeading(x: number, z: number): number {
  return Math.atan2(x, -z);
}

/**
 * A fixed-size pool of scene objects.
 *
 * Everything the airstrike spawns — aircraft, bombs, bomblets, fire patches,
 * markers — comes from one of these. `acquire` returns null rather than growing
 * when the pool is exhausted, because an airstrike that quietly allocates three
 * more jets mid-sequence is a frame hitch at the worst possible moment.
 */
export class Pool<T> {
  readonly items: T[] = [];
  private free: number[] = [];
  private used: boolean[] = [];

  constructor(size: number, make: (index: number) => T) {
    for (let i = 0; i < size; i++) {
      this.items.push(make(i));
      this.used.push(false);
      this.free.push(size - 1 - i);
    }
  }

  acquire(): T | null {
    const i = this.free.pop();
    if (i === undefined) return null;
    this.used[i] = true;
    return this.items[i];
  }

  acquireIndex(): number {
    const i = this.free.pop();
    if (i === undefined) return -1;
    this.used[i] = true;
    return i;
  }

  release(index: number): void {
    if (index < 0 || index >= this.items.length || !this.used[index]) return;
    this.used[index] = false;
    this.free.push(index);
  }

  releaseAll(): void {
    this.free.length = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      this.used[i] = false;
      this.free.push(i);
    }
  }

  isUsed(index: number): boolean {
    return this.used[index];
  }

  get liveCount(): number {
    return this.items.length - this.free.length;
  }
}

/**
 * Particle and light budgets, scaled from the quality preset.
 *
 * The airstrike is by a wide margin the most expensive thing the game draws, so
 * every count it uses comes from here rather than from a literal. `maxParticles`
 * is the honest signal of how much headroom the preset has: it runs from 2000 on
 * `low` to 40000 on `cinematic`.
 */
export interface Budget {
  /** 0.25 .. 1.6, the master scalar for anything countable. */
  scale: number;
  /** Contrail segments retained per ribbon. */
  trailSegments: number;
  /** Live heat-haze cells across the whole system. */
  hazeCells: number;
  /** Napalm flame billboards. */
  fireQuads: number;
  /** Puffs across every smoke column the aftermath is holding up. */
  smokePuffs: number;
  /** Settling dust volumes. */
  dustCells: number;
  /** Bomblets in a cluster canister. */
  bomblets: number;
  /** Pooled dynamic lights this package is allowed to ask for at once. */
  lights: number;
  /** Whether the framebuffer-grab effects may run at all. */
  grabPass: boolean;
  /** Whether contrails are drawn. */
  contrails: boolean;
}

export function budgetFor(ctx: GameContext): Budget {
  const q = ctx.quality;
  const scale = Math.min(1.6, Math.max(0.25, q.maxParticles / 12000));
  const grab = q.antialias !== 'msaa' && ctx.renderer.capabilities.isWebGL2 !== false;
  return {
    scale,
    trailSegments: Math.round(28 + 44 * scale),
    hazeCells: Math.round(6 + 26 * scale),
    fireQuads: Math.round(24 + 92 * scale),
    // The aftermath is the cheapest spectacle in the package by a distance —
    // a puff is one instanced quad — so it gets a generous share even at low.
    smokePuffs: Math.round(90 + 170 * scale),
    dustCells: Math.round(10 + 26 * scale),
    // A dispenser pattern is the one effect here whose whole character is
    // *count*: the difference between a cluster strike and a handful of
    // grenades is whether the blasts overlap. Twenty-six of them at medium
    // photographed as isolated sparks scattered across a suburb, so the slope
    // is steep — thirty-six at medium, nearly ninety on cinematic.
    bomblets: Math.round(14 + 44 * scale),
    lights: Math.max(2, Math.round(2 + 4 * scale)),
    grabPass: grab && q.preset !== 'low',
    contrails: q.preset !== 'low',
  };
}

/* --------------------------- shared scratch ---------------------------- */

export const scratch = {
  v0: new THREE.Vector3(),
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
  q0: new THREE.Quaternion(),
  q1: new THREE.Quaternion(),
  m0: new THREE.Matrix4(),
  e0: new THREE.Euler(),
  c0: new THREE.Color(),
};

export const UP = new THREE.Vector3(0, 1, 0);
