import type * as THREE from 'three';
import type { EventBus } from './EventBus';
import type { Input } from './Input';
import type { Time } from './Time';
import type { QualityConfig } from './Config';
import type { Engine } from './Engine';

/**
 * Shared handle passed to every system. Systems must never reach for globals;
 * everything they need is either on the context or resolved through `get()`.
 */
export interface EngineContext {
  readonly engine: Engine;
  /** World scene, rendered with the main camera. */
  readonly scene: THREE.Scene;
  /** Separate scene for the first-person viewmodel, rendered on top with its own FOV. */
  readonly viewScene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly viewCamera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly time: Time;
  readonly input: Input;
  readonly events: EventBus;
  readonly config: QualityConfig;
  /** Viewport size in device pixels after render-scale is applied. */
  readonly size: { width: number; height: number; dpr: number };
  get<T extends System>(name: string): T;
  tryGet<T extends System>(name: string): T | undefined;
}

/**
 * Update ordering. Lower numbers run first. Using explicit numbers rather than
 * registration order keeps behaviour stable no matter how systems are wired up.
 */
export const ORDER = {
  INPUT: 0,
  PHYSICS: 100,
  PLAYER: 200,
  WEAPONS: 300,
  COMBAT: 400,
  AI: 500,
  KILLSTREAKS: 550,
  WORLD: 600,
  FX: 700,
  AUDIO: 800,
  CAMERA: 900,
  UI: 1000,
  RENDER: 1100,
} as const;

export interface System {
  readonly name: string;
  /** Lower runs first; see ORDER. */
  readonly order?: number;
  /** Systems this one needs resolved before init. */
  readonly dependencies?: readonly string[];

  init?(ctx: EngineContext): Promise<void> | void;
  /** Runs at a fixed 120 Hz step; use for physics and anything integrating forces. */
  fixedUpdate?(dt: number, ctx: EngineContext): void;
  /** Runs once per frame with variable dt. */
  update?(dt: number, ctx: EngineContext): void;
  /** Runs after all updates; use for camera and anything that must see final state. */
  lateUpdate?(dt: number, ctx: EngineContext): void;
  /** Called on canvas resize. */
  resize?(width: number, height: number, ctx: EngineContext): void;
  /** Called when quality settings change at runtime. */
  onQualityChanged?(config: QualityConfig, ctx: EngineContext): void;
  dispose?(): void;
}

/** Convenience base class so systems only implement what they care about. */
export abstract class BaseSystem implements System {
  abstract readonly name: string;
  readonly order: number = 500;
  protected ctx!: EngineContext;

  init(ctx: EngineContext): Promise<void> | void {
    this.ctx = ctx;
  }
}
