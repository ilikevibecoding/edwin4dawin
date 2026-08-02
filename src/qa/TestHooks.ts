import * as THREE from 'three';
import type { App } from '../app/App';
import { CHECKPOINTS } from './Checkpoints';
import { NARRATION, narrationWordCount } from '../timeline/Script';
import type { QualityName } from '../core/Quality';

/**
 * Automation surface.
 *
 * The headless QA tour drives the application through `window.__STARFALL`.
 * Everything here is read-only or idempotent so a test run cannot leave the
 * experience in a strange state.
 */

export interface StarfallHooks {
  ready: boolean;
  version: string;
  duration: number;
  checkpoints: typeof CHECKPOINTS;
  /**
   * Land on `time` with the world in the state it would be in during
   * playback: seek back by `preroll` seconds, run the timeline forward
   * without drawing so events fire, then render a few settling frames.
   */
  seekAndSettle(time: number, frames?: number, preroll?: number): void;
  play(): void;
  pause(): void;
  setQuality(q: QualityName): Promise<void>;
  setExplore(v: boolean): void;
  state(): {
    time: number;
    chapter: string;
    chapterIndex: number;
    shot: string;
    beat: string;
    playing: boolean;
    explore: boolean;
    quality: string;
    fps: number;
    drawCalls: number;
    triangles: number;
    subtitle: string | null;
    spaceVisible: boolean;
    interiorVisible: boolean;
    cameraPosition: [number, number, number];
  };
  subjectVisible(key: string): boolean;
  subjectCoverage(key: string): number;
  /** Downsampled read of the presented frame: catches black or flat output. */
  frameStats(): { mean: number; buckets: number; peak: number };
  sanity(): Array<{ code: string; detail: string; severity: string }>;
  staticSanity(): Array<{ code: string; detail: string; severity: string }>;
  narrationStats(): { lines: number; words: number; voiced: boolean };
  consoleErrors: string[];
}

declare global {
  interface Window {
    __STARFALL?: StarfallHooks;
  }
}

export function installTestHooks(app: App): void {
  const subject = (key: string): THREE.Object3D | null => {
    const s = app.stage;
    switch (key) {
      case 'runner':
        return s.runner.root;
      case 'destroyer':
        return s.destroyer.root;
      case 'pod':
        return s.exteriorPod.root;
      case 'interiorPod':
        return s.interiorPod.root;
      case 'planet':
        return s.planet.root;
      case 'corridor':
        return s.corridor.root;
      case 'plans':
        return s.plans.root;
      case 'leia':
        return s.leia.root;
      case 'vader':
        return s.vader.root;
      case 'r2':
        return s.r2.root;
      case 'threepio':
        return s.threepio.root;
      case 'rebels':
        return s.rebels.find((r) => r.root.visible)?.root ?? null;
      case 'troopers':
        return s.troopers.find((t) => t.root.visible)?.root ?? null;
      default:
        return null;
    }
  };

  const visibleInTree = (o: THREE.Object3D): boolean => {
    let node: THREE.Object3D | null = o;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  };

  const hooks: StarfallHooks = {
    ready: true,
    version: '1.0.0',
    duration: app.show.timeline.duration,
    checkpoints: CHECKPOINTS,
    consoleErrors: [],

    seekAndSettle(time: number, frames = 6, preroll = 2.2): void {
      const start = Math.max(0, time - preroll);
      app.show.timeline.pause();
      app.show.timeline.seek(start);
      if (preroll > 0) {
        const step = 1 / 40;
        const steps = Math.round((time - start) / step);
        app.show.timeline.play();
        for (let i = 0; i < steps; i++) app.simulate(step);
        app.show.timeline.pause();
      }
      for (let i = 0; i < frames; i++) app.frame(1 / 120);
    },
    play(): void {
      app.show.timeline.play();
    },
    pause(): void {
      app.show.timeline.pause();
    },
    async setQuality(q: QualityName): Promise<void> {
      await app.setQuality(q);
    },
    setExplore(v: boolean): void {
      app.setExplore(v);
    },
    state() {
      const info = app.show.describe();
      const gl = app.render.renderer.info;
      const line = app.subtitles.lineAt(info.time);
      const c = app.render.camera.position;
      return {
        time: info.time,
        chapter: info.chapter,
        chapterIndex: app.show.timeline.chapter.index,
        shot: app.show.director.currentShotId,
        beat: info.beat,
        playing: app.show.timeline.isPlaying,
        explore: app.explore.active,
        quality: app.quality,
        fps: app.sanity.averageFps,
        drawCalls: gl.render.calls,
        triangles: gl.render.triangles,
        subtitle: line ? line.text : null,
        spaceVisible: app.stage.space.visible,
        interiorVisible: app.stage.interior.visible,
        cameraPosition: [c.x, c.y, c.z],
      };
    },
    subjectVisible(key: string): boolean {
      const o = subject(key);
      if (!o) return false;
      if (!visibleInTree(o)) return false;
      return app.sanity.isVisible(o);
    },
    subjectCoverage(key: string): number {
      const o = subject(key);
      if (!o || !visibleInTree(o)) return 0;
      return app.sanity.screenCoverage(o);
    },
    frameStats() {
      const w = 128;
      const h = 72;
      const probe = document.createElement('canvas');
      probe.width = w;
      probe.height = h;
      const ctx = probe.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { mean: 0, buckets: 0, peak: 0 };
      ctx.drawImage(app.canvas, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      let peak = 0;
      const buckets = new Set<number>();
      for (let i = 0; i < data.length; i += 4) {
        const l = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
        sum += l;
        if (l > peak) peak = l;
        buckets.add(Math.round(l * 24));
      }
      return { mean: sum / (w * h), buckets: buckets.size, peak };
    },
    sanity() {
      return [
        ...app.sanity.check(app.show.time),
        ...app.sanity.checkGL(app.render.renderer),
      ].map((i) => ({ ...i }));
    },
    staticSanity() {
      return app.sanity.checkStatic().map((i) => ({ ...i }));
    },
    narrationStats() {
      return {
        lines: NARRATION.length,
        words: narrationWordCount(),
        voiced: app.audio?.generatedNarrationAvailable ?? false,
      };
    },
  };

  window.__STARFALL = hooks;
}
