import * as THREE from 'three';
import type { App } from '../app/App';
import type { Character } from '../assets/characters/CharacterRig';
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

/**
 * How much a figure's planted foot skates over the deck while it walks.
 *
 * `ratio` is the giveaway: 0 means the stance foot is nailed to the floor while
 * the body passes over it, 1 means the whole figure is being dragged along with
 * its legs waving. Anything below about 0.35 reads as walking.
 */
export interface FootSlip {
  target: string;
  state: string;
  bodySpeed: number;
  plantSpeed: number;
  ratio: number;
  soleHeight: number;
  /** Distance covered per step. */
  stepLength: number;
  /** Longest step these legs can reach. Beyond it, slip is unavoidable. */
  strideReach: number;
}

export interface StarfallTestApi {
  ready: boolean;
  app: App;
  checkpoints: Checkpoint[];
  enter(): Promise<void>;
  renderAt(time: number): void;
  report(time?: number): FrameReport;
  measure(target: string): ScreenMeasurement;
  footSlip(targets?: string[], dt?: number): FootSlip[];
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

/** Corner index pairs for the twelve edges of a box, in the bitmask order used below. */
const BOX_EDGES: Array<[number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

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

/** Every figure with legs, by target name. */
function humanoidTargets(app: App): string[] {
  const interior = app.interiorScene;
  return [
    'vader', 'leia',
    ...interior.rebels.map((_, i) => `rebel-${i}`),
    ...interior.troopers.map((_, i) => `trooper-${i}`),
  ];
}

/** Humanoid figures only: the droids have no legs to plant. */
function targetCharacter(app: App, target: string): Character | null {
  const interior = app.interiorScene;
  if (target === 'vader') return interior.vader;
  if (target === 'leia') return interior.leia;
  const trooper = /^trooper-(\d+)$/.exec(target);
  if (trooper) return interior.troopers[Number(trooper[1])] ?? null;
  const rebel = /^rebel-(\d+)$/.exec(target);
  if (rebel) return interior.rebels[Number(rebel[1])] ?? null;
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

  // Depth in view space, negative in front of the lens.
  const viewMatrix = camera.matrixWorldInverse;
  const depths = corners.map((c) => c.clone().applyMatrix4(viewMatrix).z);
  const near = -camera.near;
  const anyInFront = depths.some((z) => z < near);

  // Project only what is in front of the near plane, splitting any edge that
  // crosses it. Projecting a point behind the lens sends its coordinates through
  // infinity and flips their sign, which used to report a subject standing
  // alongside the camera as filling the entire frame.
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    if (depths[i] < near) points.push(corners[i].clone());
  }
  for (const [a, b] of BOX_EDGES) {
    if ((depths[a] < near) === (depths[b] < near)) continue;
    const k = (near - depths[a]) / (depths[b] - depths[a]);
    points.push(corners[a].clone().lerp(corners[b], k));
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const ndc = p.project(camera);
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

    footSlip(targets?: string[], dt = 1 / 30): FootSlip[] {
      const names = targets ?? humanoidTargets(app);
      const cast = names
        .map((target) => ({ target, character: targetCharacter(app, target) }))
        .filter((e): e is { target: string; character: Character } => e.character !== null);
      if (!cast.length) return [];

      // Everything downstream of the clock is a pure function of time, so the
      // second sample is a re-render at t0 + dt and the restore is a re-render at
      // t0. Nothing has to be saved or rewound by hand. Sampling the whole cast
      // per render keeps a timestep at three frames however many figures there
      // are, which matters on a software rasteriser.
      const t0 = app.timeline.time;
      const sample = (time: number): Array<{ body: THREE.Vector3; feet: [THREE.Vector3, THREE.Vector3] }> => {
        app.renderAt(time);
        return cast.map(({ character }) => ({
          body: character.group.getWorldPosition(new THREE.Vector3()),
          feet: [
            character.joints.footL.getWorldPosition(new THREE.Vector3()),
            character.joints.footR.getWorldPosition(new THREE.Vector3()),
          ],
        }));
      };
      const a = sample(t0);
      const states = cast.map(({ character }) => character.currentState);
      const rates = cast.map(({ character }) => character.stepRate);
      const reaches = cast.map(({ character }) => character.strideReach);
      const b = sample(t0 + dt);
      app.renderAt(t0);

      const flat = (p: THREE.Vector3, q: THREE.Vector3): number => Math.hypot(p.x - q.x, p.z - q.z);
      return cast.map(({ target }, i) => {
        const bodySpeed = flat(a[i].body, b[i].body) / dt;
        // The planted foot is the lower one across the interval.
        const plant = (a[i].feet[0].y + b[i].feet[0].y) <= (a[i].feet[1].y + b[i].feet[1].y) ? 0 : 1;
        const plantSpeed = flat(a[i].feet[plant], b[i].feet[plant]) / dt;
        return {
          target,
          state: states[i],
          bodySpeed,
          plantSpeed,
          ratio: bodySpeed > 0.05 ? plantSpeed / bodySpeed : 0,
          soleHeight: Math.min(a[i].feet[plant].y, b[i].feet[plant].y),
          stepLength: rates[i] > 0 ? bodySpeed / rates[i] : 0,
          strideReach: reaches[i],
        };
      });
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
      // Applies to every checkpoint, not only those that happen to carry a
      // brightness assertion: a frame washed to white by a runaway effect is a
      // failure whatever else the shot was supposed to prove.
      if (brightness.clipped > 0.3) {
        failures.push(`${(brightness.clipped * 100).toFixed(1)}% of pixels are blown out`);
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
