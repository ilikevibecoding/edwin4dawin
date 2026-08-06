import * as THREE from 'three';
import { Stage } from './engine/Stage';
import type { QualityTier } from './engine/PostFX';

declare global {
  interface Window {
    __STAGE__?: Stage;
    __READY__?: boolean;
    __DONE__?: boolean;
    __ERROR__?: string;
    __PROGRESS__?: unknown;
    __stepFrames__?: (count: number, dt: number) => void;
    /** Scene statistics, for performance triage from the capture harness. */
    __SCENESTATS__?: Record<string, number>;
    /** Milliseconds per rendered frame; the first entry is the warm-up. */
    __FRAMEMS__?: number[];
  }
}

/** Counts what the renderer actually has to chew through. */
function sceneStats(stage: Stage): Record<string, number> {
  let tris = 0;
  let meshes = 0;
  let lights = 0;
  let shadowLights = 0;
  stage.scene.traverse((o) => {
    const mesh = o as unknown as {
      isMesh?: boolean;
      isInstancedMesh?: boolean;
      count?: number;
      geometry?: { index?: { count: number } | null; getAttribute: (n: string) => { count: number } | undefined };
    };
    if (mesh.isMesh && mesh.geometry) {
      meshes++;
      const g = mesh.geometry;
      const verts = g.index ? g.index.count : g.getAttribute('position')?.count ?? 0;
      tris += (verts / 3) * (mesh.isInstancedMesh ? mesh.count ?? 1 : 1);
    }
    const light = o as unknown as { isLight?: boolean; castShadow?: boolean };
    if (light.isLight) {
      lights++;
      if (light.castShadow) shadowLights++;
    }
  });
  return { tris: Math.round(tris), meshes, lights, shadowLights };
}

const params = new URLSearchParams(location.search);

async function boot() {
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const shotMode = params.get('shot') === '1';
  const recordMode = params.get('record') === '1';
  const width = params.get('w') ? Number(params.get('w')) : undefined;
  const height = params.get('h') ? Number(params.get('h')) : undefined;

  const stage = new Stage({
    canvas,
    tier: (params.get('q') as QualityTier | null) ?? undefined,
    width,
    height,
    maxPixelRatio: shotMode || recordMode ? 1 : undefined,
  });
  window.__STAGE__ = stage;

  const sceneName = params.get('scene') ?? 'game';

  if (shotMode || recordMode) {
    // Put UI animation on the same clock as the world so offline capture is
    // frame-accurate rather than wall-clock dependent.
    const { uiSetExternalDrive, uiPumpClocks } = await import('./ui/UIRoot');
    uiSetExternalDrive(true);
    stage.onUpdate((dt) => uiPumpClocks(dt));
  }

  if (sceneName === 'lookdev') {
    const { buildLookdev } = await import('./dev/Lookdev');
    buildLookdev(stage);
  } else if (sceneName === 'char') {
    const { buildCharLookdev } = await import('./dev/CharLookdev');
    buildCharLookdev(stage, params);
  } else if (sceneName === 'still') {
    const { buildStill } = await import('./dev/StillShot');
    buildStill(stage, params);
  } else if (sceneName === 'marks') {
    const { dumpMarks } = await import('./dev/MarksDump');
    dumpMarks(stage);
  } else {
    const { startGame } = await import('./game/Game');
    await startGame(stage, params);
  }

  window.__SCENESTATS__ = sceneStats(stage);

  if (recordMode) {
    // Frames are advanced one at a time by the recorder over CDP.
    window.__stepFrames__ = (count, step) => {
      for (let i = 0; i < count; i++) stage.step(step);
    };
    stage.step(1 / 1000);
    window.__READY__ = true;
    return;
  }

  if (shotMode) {
    // Deterministic: advance a fixed number of frames then signal readiness.
    const dt = 1 / 30;
    const frames = Math.max(1, Math.round(Number(params.get('t') ?? 1) / dt));
    window.__stepFrames__ = (count, step) => {
      for (let i = 0; i < count; i++) stage.step(step);
    };
    const warmStart = performance.now();
    stage.step(1 / 1000);
    const timings = [Math.round(performance.now() - warmStart)];
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      stage.step(dt);
      timings.push(Math.round(performance.now() - t0));
    }
    window.__FRAMEMS__ = timings;
    window.__READY__ = true;
  } else {
    stage.start();
    window.__READY__ = true;
  }
}

boot().catch((err) => {
  console.error(err);
  window.__ERROR__ = String(err?.stack || err);
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;inset:0;padding:24px;color:#ff8080;background:#100;font:12px/1.5 monospace;white-space:pre-wrap;z-index:999;overflow:auto';
  el.textContent = String(err?.stack || err);
  document.body.appendChild(el);
});

export { THREE };
