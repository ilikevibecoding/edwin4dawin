import type * as THREE from 'three';
import type { Time } from './Time';
import type { Input } from './Input';
import type { Engine } from './Engine';

/**
 * Every subsystem implements this. The engine drives them in a fixed order:
 *
 *   pollInput → fixedUpdate*(N) → update → lateUpdate → render
 *
 * `fixedUpdate` may run zero or many times per frame; put anything that must
 * be framerate-independent (physics, ballistics, AI steering) there.
 * `update` runs once per frame with the interpolated delta.
 * `lateUpdate` runs after all `update`s — use it for cameras and anything that
 * must observe the final state of the frame.
 */
export interface System {
  readonly name: string;
  /** Lower runs first. Default 0. */
  readonly order?: number;
  init?(ctx: EngineContext): void | Promise<void>;
  fixedUpdate?(dt: number, ctx: EngineContext): void;
  update?(dt: number, ctx: EngineContext): void;
  lateUpdate?(dt: number, ctx: EngineContext): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export interface EngineContext {
  engine: Engine;
  scene: THREE.Scene;
  /** Separate scene for first-person arms/weapon, rendered with its own camera. */
  viewScene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  viewCamera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  time: Time;
  input: Input;
  /** Registry lookup so systems can find each other without hard imports. */
  get<T extends System>(name: string): T | undefined;
}
