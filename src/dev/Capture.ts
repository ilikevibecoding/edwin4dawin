import * as THREE from 'three';
import type { Engine } from '../core/Engine';

/**
 * Offline screenshot harness.
 *
 * `tools/shot.mjs` sets `window.__CAPTURE__ = { shot }` before the bundle
 * evaluates. When present we boot into a deterministic state, pose the camera
 * for the named shot, step the simulation a fixed number of frames so
 * transient state settles, then flag `__CAPTURE_READY__` for the screenshotter.
 */
export interface ShotDefinition {
  name: string;
  /** Camera world position. */
  position: [number, number, number];
  /** Point the camera looks at. */
  lookAt: [number, number, number];
  fov?: number;
  /** Sky preset to force. */
  sky?: string;
  /** Simulated seconds to run before capturing (lets particles/AI settle). */
  warmup?: number;
  /** Show the first-person weapon. */
  viewmodel?: boolean;
  /** Show the HUD. */
  hud?: boolean;
  /** Aim-down-sights amount, 0..1. */
  ads?: number;
  /** Optional hook to stage gameplay state (spawn enemies, trigger effects). */
  stage?: (engine: Engine) => void | Promise<void>;
  /** Free-camera shots don't need the player controller running. */
  freeCamera?: boolean;
}

declare global {
  interface Window {
    __CAPTURE__?: { shot: string };
    __CAPTURE_READY__?: boolean;
    __CAPTURE_STATS__?: Record<string, unknown>;
    __GAME__?: unknown;
  }
}

export const isCaptureMode = () =>
  typeof window !== 'undefined' && window.__CAPTURE__ !== undefined;

export const requestedShot = () => window.__CAPTURE__?.shot ?? 'overview';

export function poseCamera(camera: THREE.PerspectiveCamera, shot: ShotDefinition) {
  camera.position.set(...shot.position);
  camera.lookAt(new THREE.Vector3(...shot.lookAt));
  if (shot.fov) {
    camera.fov = shot.fov;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld(true);
}

/**
 * Steps the engine at a fixed dt so captures are deterministic regardless of
 * how slowly the software renderer actually runs.
 */
export async function settle(engine: Engine, seconds: number, dt = 1 / 30) {
  const steps = Math.max(1, Math.round(seconds / dt));
  for (let i = 0; i < steps; i++) {
    engine.step(dt);
    // Yield occasionally so the browser doesn't consider the page hung.
    if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0));
  }
}

export function markReady(stats: Record<string, unknown>) {
  window.__CAPTURE_STATS__ = stats;
  window.__CAPTURE_READY__ = true;
}
