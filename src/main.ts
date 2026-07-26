import * as THREE from 'three';
import { Engine } from './core/Engine';
import type { System } from './core/GameContext';
import type { QualityPreset } from './core/Quality';
import { getVantage, listVantages } from './core/Vantage';

/* --------------------------- debug bridge ----------------------------- */

declare global {
  interface Window {
    __GAME__: {
      engine: Engine;
      ready: boolean;
      THREE: typeof THREE;
      pose(name: string): boolean;
      stepFrames(n: number): void;
      stats(): Record<string, unknown>;
      listShots(): string[];
      setQuality(preset: QualityPreset): void;
      freeCam(x: number, y: number, z: number, tx: number, ty: number, tz: number): void;
      errors: string[];
    };
  }
}

const bootErrors: string[] = [];
window.addEventListener('error', (e) => bootErrors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => bootErrors.push(String(e.reason)));

/* ----------------------------- boot ----------------------------------- */

const params = new URLSearchParams(location.search);
const captureMode = params.has('capture');
const qualityParam = params.get('quality') as QualityPreset | null;

const canvas = document.getElementById('viewport') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

/**
 * Systems are imported dynamically and individually guarded. During
 * development a single module with a syntax error would otherwise blank the
 * whole screen; instead we log it and continue with the rest of the game.
 */
async function loadSystem(
  label: string,
  loader: () => Promise<{ default?: new () => System } & Record<string, unknown>>,
  factory?: (mod: Record<string, unknown>) => System | System[] | null,
): Promise<System[]> {
  try {
    const mod = await loader();
    const made = factory ? factory(mod) : mod.default ? new mod.default() : null;
    if (!made) return [];
    return Array.isArray(made) ? made : [made];
  } catch (err) {
    console.error(`[boot] failed to load "${label}":`, err);
    bootErrors.push(`load ${label}: ${(err as Error)?.message ?? err}`);
    return [];
  }
}

async function boot(): Promise<void> {
  const engine = new Engine(canvas, uiRoot, qualityParam ?? undefined);

  window.__GAME__ = {
    engine,
    ready: false,
    THREE,
    errors: bootErrors,
    pose(name: string) {
      const v = getVantage(name);
      if (!v) return false;
      v.setup?.();
      engine.camera.position.copy(v.position);
      if (v.lookAt) engine.camera.lookAt(v.lookAt);
      else if (v.rotation) engine.camera.rotation.copy(v.rotation);
      if (v.fov) {
        engine.camera.fov = v.fov;
        engine.camera.updateProjectionMatrix();
      }
      engine.camera.updateMatrixWorld(true);
      // A posed camera must not be fought over by the player controller.
      (engine.tryGet('player') as { enabled?: boolean } | undefined)?.constructor &&
        ((engine.get('player') as { enabled: boolean }).enabled = false);
      const vm = engine.tryGet('weapons') as { setVisible?(v: boolean): void } | undefined;
      vm?.setVisible?.(!v.hideViewmodel);
      return true;
    },
    stepFrames(n: number) {
      for (let i = 0; i < n; i++) engine.step(1 / 60);
    },
    stats() {
      const info = engine.renderer.info;
      return {
        preset: engine.quality.preset,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs?.length ?? 0,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
        fps: Math.round(engine.clock.fps),
        errors: bootErrors.slice(0, 10),
      };
    },
    listShots: () => listVantages(),
    setQuality: (p: QualityPreset) => engine.setQuality(p),
    freeCam(x, y, z, tx, ty, tz) {
      engine.camera.position.set(x, y, z);
      engine.camera.lookAt(tx, ty, tz);
      engine.camera.updateMatrixWorld(true);
    },
  };

  const systems: System[] = [];
  const push = (s: System[]) => systems.push(...s);

  // Order of this list does not matter; each System declares its own `order`.
  push(await loadSystem('materials', () => import('./materials/MaterialLibrary')));
  push(await loadSystem('sky', () => import('./render/SkySystem')));
  push(await loadSystem('lighting', () => import('./render/LightingSystem')));
  push(await loadSystem('physics', () => import('./physics/PhysicsSystem')));
  push(await loadSystem('world', () => import('./world/WorldSystem')));
  push(await loadSystem('fx', () => import('./fx/FXSystem')));
  push(await loadSystem('decals', () => import('./fx/DecalSystem')));
  push(await loadSystem('player', () => import('./player/PlayerSystem')));
  push(await loadSystem('weapons', () => import('./weapons/WeaponSystem')));
  push(await loadSystem('ai', () => import('./ai/AISystem')));
  push(await loadSystem('killstreaks', () => import('./killstreaks/KillstreakSystem')));
  push(await loadSystem('audio', () => import('./audio/AudioSystem')));
  push(await loadSystem('hud', () => import('./ui/HUDSystem')));
  push(await loadSystem('menu', () => import('./ui/MenuSystem')));
  push(await loadSystem('director', () => import('./game/GameDirector')));
  // The post-processing pipeline owns the draw phase and must load last.
  push(await loadSystem('render', () => import('./render/RenderPipeline')));

  engine.add(...systems);

  await engine.init((p, label) => {
    const el = document.getElementById('boot-progress');
    if (el) el.textContent = `${Math.round(p * 100)}% · ${label}`;
  });

  if (captureMode) {
    // Deterministic stepping: the harness drives frames explicitly.
    engine.paused = true;
    engine.input.enabled = false;
    document.body.classList.add('capture-mode');
    // Prime the pipeline so shader compilation happens before the first shot.
    for (let i = 0; i < 4; i++) engine.step(1 / 60);
  } else {
    engine.start();
  }

  window.__GAME__.ready = true;
  console.log('[boot] ready', window.__GAME__.stats());
}

boot().catch((err) => {
  console.error('[boot] fatal:', err);
  bootErrors.push(String(err?.message ?? err));
  const el = document.getElementById('boot-progress');
  if (el) el.textContent = `FATAL: ${err?.message ?? err}`;
  // Still expose the bridge so tooling can read the failure instead of hanging.
  if (!window.__GAME__) {
    window.__GAME__ = {
      engine: null as unknown as Engine,
      ready: true,
      THREE,
      errors: bootErrors,
      pose: () => false,
      stepFrames: () => {},
      stats: () => ({ fatal: String(err?.message ?? err), errors: bootErrors }),
      listShots: () => [],
      setQuality: () => {},
      freeCam: () => {},
    };
  } else {
    window.__GAME__.ready = true;
  }
});
