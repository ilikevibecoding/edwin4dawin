import * as THREE from 'three';
import type { EventBus } from './EventBus';
import type { InputManager } from './Input';
import type { QualitySettings } from './Quality';

/** Frame timing. `delta` is already clamped against hitches. */
export interface FrameClock {
  /** Seconds since the previous frame, clamped to a sane maximum. */
  delta: number;
  /** Unclamped, unscaled seconds since the previous frame. */
  rawDelta: number;
  /** Seconds since the game started, accumulating scaled delta. */
  elapsed: number;
  /** Monotonically increasing frame counter. */
  frame: number;
  /** Global time dilation, used for slow-motion final kills. */
  timeScale: number;
  /** Smoothed frames per second. */
  fps: number;
}

/**
 * Every subsystem receives this. It is deliberately a service locator rather
 * than a bag of direct references so subsystems stay decoupled and can be
 * developed, swapped, or omitted independently.
 */
export interface GameContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Separate camera for the first-person weapon, rendered with a narrow near plane. */
  viewmodelScene: THREE.Scene;
  viewmodelCamera: THREE.PerspectiveCamera;
  clock: FrameClock;
  input: InputManager;
  events: EventBus;
  quality: QualitySettings;
  /** Root element that hosts DOM-based UI. */
  uiRoot: HTMLElement;
  canvas: HTMLCanvasElement;

  /** Retrieve another system by key. Throws when the system is absent. */
  get<T>(key: string): T;
  /** Retrieve another system, or undefined when it has not been registered. */
  tryGet<T>(key: string): T | undefined;
  register(key: string, system: unknown): void;
}

/**
 * Lifecycle contract for a subsystem.
 *
 * `init` may be async; the engine awaits every system in `order` sequence
 * before the first frame. `update` runs every frame in registration order,
 * `lateUpdate` after all updates (use it for camera-dependent work), and
 * `render` only for systems that own render passes.
 */
export interface System {
  /** Unique key used for `ctx.get()`. */
  readonly key: string;
  /** Lower numbers initialise and update earlier. Defaults to 100. */
  readonly order?: number;
  init?(ctx: GameContext): void | Promise<void>;
  update?(dt: number, ctx: GameContext): void;
  lateUpdate?(dt: number, ctx: GameContext): void;
  /**
   * Draw phase, run after every `lateUpdate`. Only the render pipeline should
   * implement this; it owns submitting the frame to the GPU.
   */
  render?(dt: number, ctx: GameContext): void;
  /** Called on canvas resize with the new drawing buffer size. */
  resize?(width: number, height: number, ctx: GameContext): void;
  /** Called when quality settings change at runtime. */
  onQualityChange?(quality: QualitySettings, ctx: GameContext): void;
  dispose?(): void;
}

/** Layer assignments shared across systems for selective rendering. */
export const Layers = {
  DEFAULT: 0,
  /** First-person arms and weapon; excluded from world passes. */
  VIEWMODEL: 1,
  /** Objects that should not receive screen-space reflections. */
  NO_SSR: 2,
  /** Emissive-only pass for bloom-heavy elements such as tracers. */
  GLOW: 3,
  /** Excluded from shadow map rendering. */
  NO_SHADOW: 4,
  /** Minimap-only markers. */
  MINIMAP: 5,
  /** Transparent geometry that must render after the opaque volumetrics. */
  TRANSPARENT_LATE: 6,
} as const;

/** Collision/raycast groups so systems agree on what they can hit. */
export const Groups = {
  WORLD: 1 << 0,
  PLAYER: 1 << 1,
  ENEMY: 1 << 2,
  PROP: 1 << 3,
  DEBRIS: 1 << 4,
  TRIGGER: 1 << 5,
  GLASS: 1 << 6,
  WATER: 1 << 7,
} as const;

/**
 * Metadata attached to scene objects via `userData` so raycasts can resolve
 * material response and damage routing without a lookup table.
 */
export interface HitMeta {
  surface?: string;
  group?: number;
  /** Damage multiplier applied to hits on this collider. */
  damageScale?: number;
  /** Entity id owning this collider. */
  entityId?: number;
  /** Thickness in metres used for bullet penetration. */
  penetration?: number;
  breakable?: boolean;
}

export function hitMeta(obj: THREE.Object3D): HitMeta {
  return (obj.userData as { hit?: HitMeta }).hit ?? {};
}

export function setHitMeta(obj: THREE.Object3D, meta: HitMeta): void {
  (obj.userData as { hit?: HitMeta }).hit = { ...hitMeta(obj), ...meta };
}
