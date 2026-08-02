import * as THREE from 'three';
import type { App } from '../app/App';
import { CHECKPOINTS, type Checkpoint } from './checkpoints';
import type { SanityIssue } from './SanityChecks';

/**
 * Test hooks.
 *
 * Everything the automated visual tour needs, exposed on `window.__starfall`.
 * The harness never touches internals directly - it asks for a deterministic
 * frame at a timestamp and then reads back measurements about that frame.
 */

export interface ScreenMeasurement {
  /** Fraction of the viewport covered by the subject's projected bounds. */
  screenFraction: number;
  /** True when any part of the subject's bounds falls inside the frustum. */
  onScreen: boolean;
  /** Normalised device coordinates of the subject's centre. */
  ndc: [number, number];
  distance: number;
}

export interface FrameReport {
  time: number;
  chapter: string;
  chapterIndex: number;
  shot: string;
  shotLabel: string;
  scene: 'space' | 'interior';
  beat: string;
  subtitle: string;
  narrationCue: string | null;
  issues: SanityIssue[];
  fps: number;
  drawCalls: number;
  triangles: number;
  measurements: Record<string, ScreenMeasurement>;
  boltsActive: number;
  particleBudget: { spaceSparks: number; interiorSparks: number; overflow: boolean };
}

export interface CheckpointResult {
  checkpoint: Checkpoint;
  report: FrameReport;
  failures: string[];
  brightness: { mean: number; p95: number; clipped: number } | null;
}

declare global {
  interface Window {
    __starfall?: StarfallTestApi;
  }
}

export interface StarfallTestApi {
  ready: boolean;
  app: App;
  checkpoints: Checkpoint[];
  enter(): Promise<void>;
  renderAt(time: number): void;
  report(time?: number): FrameReport;
  measure(target: string): ScreenMeasurement;
  runCheckpoint(id: string): CheckpointResult;
  setMode(mode: 'cinematic' | 'explore'): void;
  setQuality(level: 'low' | 'medium' | 'high'): void;
  seek(time: number): void;
  play(): void;
  pause(): void;
  getTime(): number;
  isPlaying(): boolean;
  consoleErrors(): string[];
  brightness(): { mean: number; p95: number; clipped: number };
  selectByIdForTest(id: string): boolean;
}

const _box = new THREE.Box3();
const _v = new THREE.Vector3();

function targetObject(app: App, target: string): THREE.Object3D | null {
  const space = app.spaceScene;
  const interior = app.interiorScene;
  switch (target) {
    case 'runner': return space.runner.group;
    case 'destroyer': return space.destroyer.group;
    case 'pod': return space.pod.group;
    case 'tatooine': return space.planet.surface;
    case 'vader': return interior.vader.group;
    case 'leia': return interior.leia.group;
    case 'r2': return interior.r2.group;
    case 'threepio': return interior.threepio.group;
    case 'plans': return interior.plans.group;
    case 'door': return interior.door.group;
    default: break;
  }
  const trooper = /^trooper-(\d+)$/.exec(target);
  if (trooper) return interior.troopers[Number(trooper[1])]?.group ?? null;
  const rebel = /^rebel-(\d+)$/.exec(target);
  if (rebel) return interior.rebels[Number(rebel[1])]?.group ?? null;
  return null;
}

function measureObject(app: App, object: THREE.Object3D): ScreenMeasurement {
  const camera = app.activeCamera;
  camera.updateMatrixWorld();
  _box.setFromObject(object);
  if (_box.isEmpty()) return { screenFraction: 0, onScreen: false, ndc: [0, 0], distance: Infinity };

  const corners: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(new THREE.Vector3(
      i & 1 ? _box.max.x : _box.min.x,
      i & 2 ? _box.max.y : _box.min.y,
      i & 4 ? _box.max.z : _box.min.z,
    ));
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let anyInFront = false;
  const viewMatrix = camera.matrixWorldInverse;
  for (const c of corners) {
    const view = c.clone().applyMatrix4(viewMatrix);
    if (view.z < 0) anyInFront = true;
    const ndc = c.clone().project(camera);
    minX = Math.min(minX, ndc.x);
    maxX = Math.max(maxX, ndc.x);
    minY = Math.min(minY, ndc.y);
    maxY = Math.max(maxY, ndc.y);
  }

  const centre = _box.getCenter(_v.clone());
  const distance = centre.distanceTo(camera.position);
  const centreNdc = centre.clone().project(camera);

  // Clip the projected bounds to the viewport before measuring coverage.
  const cMinX = Math.max(-1, minX);
  const cMaxX = Math.min(1, maxX);
  const cMinY = Math.max(-1, minY);
  const cMaxY = Math.min(1, maxY);
  const w = Math.max(0, cMaxX - cMinX);
  const h = Math.max(0, cMaxY - cMinY);
  const fraction = anyInFront ? (w * h) / 4 : 0;

  return {
    screenFraction: fraction,
    onScreen: anyInFront && w > 0 && h > 0,
    ndc: [centreNdc.x, centreNdc.y],
    distance,
  };
}

/** Read back the framebuffer and summarise its luminance. */
function measureBrightness(app: App): { mean: number; p95: number; clipped: number } {
  const renderer = app.renderSystem.renderer;
  const gl = renderer.getContext();
  const w = Math.min(320, gl.drawingBufferWidth);
  const h = Math.min(180, gl.drawingBufferHeight);
  const sx = Math.max(0, Math.floor((gl.drawingBufferWidth - w) / 2));
  const sy = Math.max(0, Math.floor((gl.drawingBufferHeight - h) / 2));
  const pixels = new Uint8Array(w * h * 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.readPixels(sx, sy, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const lum: number[] = [];
  let sum = 0;
  let clipped = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const l = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
    lum.push(l);
    sum += l;
    if (l > 0.985) clipped++;
  }
  lum.sort((a, b) => a - b);
  return {
    mean: sum / Math.max(1, lum.length),
    p95: lum[Math.floor(lum.length * 0.95)] ?? 0,
    clipped: clipped / Math.max(1, lum.length),
  };
}

export function installTestHooks(app: App): void {
  const api: StarfallTestApi = {
    ready: true,
    app,
    checkpoints: CHECKPOINTS,

    async enter(): Promise<void> {
      await app.enter();
    },

    renderAt(time: number): void {
      app.renderAt(time);
    },

    report(time?: number): FrameReport {
      if (time !== undefined) app.renderAt(time);
      const t = app.timeline.time;
      const sanity = app.runSanity(t);
      const stats = app.renderSystem.stats;
      const cue = app.narrationPlayer?.cueAt(t) ?? null;
      const measurements: Record<string, ScreenMeasurement> = {};
      const targets = app.sceneIsInterior
        ? ['vader', 'leia', 'r2', 'threepio', 'plans', 'door', 'trooper-0', 'rebel-0', 'rebel-1']
        : ['runner', 'destroyer', 'pod', 'tatooine'];
      for (const target of targets) {
        const obj = targetObject(app, target);
        if (obj) measurements[target] = measureObject(app, obj);
      }
      return {
        time: t,
        chapter: app.timeline.chapter.id,
        chapterIndex: app.timeline.chapter.index,
        shot: app.cameraDirector.current.id,
        shotLabel: app.cameraDirector.current.label,
        scene: app.sceneIsInterior ? 'interior' : 'space',
        beat: app.beat,
        subtitle: app.uiRoot.subtitles.currentText,
        narrationCue: cue?.id ?? null,
        issues: sanity.issues,
        fps: stats.fps,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        measurements,
        boltsActive: app.sceneIsInterior
          ? app.interiorScene.boltsActiveAt(t)
          : app.spaceScene.boltsActiveAt(t),
        particleBudget: {
          spaceSparks: app.spaceScene.particleStats.sparks,
          interiorSparks: app.interiorScene.particleStats.sparks,
          overflow: app.spaceScene.particleStats.overflow || app.interiorScene.particleStats.overflow,
        },
      };
    },

    measure(target: string): ScreenMeasurement {
      const obj = targetObject(app, target);
      if (!obj) return { screenFraction: 0, onScreen: false, ndc: [0, 0], distance: Infinity };
      return measureObject(app, obj);
    },

    runCheckpoint(id: string): CheckpointResult {
      const checkpoint = CHECKPOINTS.find((c) => c.id === id);
      if (!checkpoint) throw new Error(`Unknown checkpoint: ${id}`);
      app.renderAt(checkpoint.time);
      const report = api.report();
      const brightness = measureBrightness(app);
      const failures: string[] = [];

      if (report.chapter !== checkpoint.chapter) {
        failures.push(`expected chapter ${checkpoint.chapter}, got ${report.chapter}`);
      }
      if (report.shot !== checkpoint.shot) {
        failures.push(`expected shot ${checkpoint.shot}, got ${report.shot}`);
      }
      if (report.scene !== checkpoint.scene) {
        failures.push(`expected ${checkpoint.scene} scene, got ${report.scene}`);
      }

      for (const a of checkpoint.assertions) {
        switch (a.kind) {
          case 'visible': {
            const m = api.measure(a.target);
            const min = a.minScreenFraction ?? 0.002;
            if (!m.onScreen) failures.push(`${a.target} is not on screen`);
            else if (m.screenFraction < min) {
              failures.push(`${a.target} covers ${(m.screenFraction * 100).toFixed(3)}% of frame, expected >= ${(min * 100).toFixed(3)}%`);
            }
            break;
          }
          case 'onScreen': {
            const m = api.measure(a.target);
            if (!m.onScreen) failures.push(`${a.target} is not on screen`);
            break;
          }
          case 'brightness': {
            if (brightness.mean < a.min) failures.push(`frame mean luminance ${brightness.mean.toFixed(3)} < ${a.min}`);
            if (a.max !== undefined && brightness.mean > a.max) {
              failures.push(`frame mean luminance ${brightness.mean.toFixed(3)} > ${a.max}`);
            }
            if (brightness.clipped > 0.22) {
              failures.push(`${(brightness.clipped * 100).toFixed(1)}% of pixels are blown out`);
            }
            break;
          }
          case 'subtitle': {
            if (!report.subtitle.toLowerCase().includes(a.contains.toLowerCase())) {
              failures.push(`subtitle "${report.subtitle}" does not contain "${a.contains}"`);
            }
            break;
          }
          case 'narration': {
            const has = report.narrationCue !== null;
            if (has !== a.playing) failures.push(`narration ${has ? 'is' : 'is not'} cued, expected ${a.playing}`);
            break;
          }
          case 'noIssues': {
            for (const issue of report.issues) {
              if (issue.severity === 'error') failures.push(`sanity: ${issue.message}`);
            }
            break;
          }
          case 'particlesActive': {
            if (report.particleBudget.spaceSparks + report.particleBudget.interiorSparks < a.min) {
              failures.push('no particles have been emitted for this moment');
            }
            break;
          }
          case 'boltsActive': {
            if (report.boltsActive < a.min) failures.push(`expected at least ${a.min} bolt(s) in flight`);
            break;
          }
        }
      }
      return { checkpoint, report, failures, brightness };
    },

    setMode(mode) {
      app.setMode(mode);
    },
    setQuality(level) {
      app.setQuality(level);
    },
    seek(time) {
      app.seek(time);
    },
    play() {
      app.timeline.play();
    },
    pause() {
      app.timeline.pause();
    },
    getTime() {
      return app.timeline.time;
    },
    isPlaying() {
      return app.timeline.playing;
    },
    consoleErrors() {
      return app.sanity.consoleErrorMessages;
    },
    brightness() {
      return measureBrightness(app);
    },
    selectByIdForTest(id: string): boolean {
      const list = app.sceneIsInterior ? app.interiorScene.selectable : app.spaceScene.selectable;
      const found = list.find((s) => s.id === id);
      if (!found) return false;
      app.objectPicker.select(found);
      return true;
    },
  };

  window.__starfall = api;
}
