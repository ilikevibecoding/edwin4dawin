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
  /**
   * What is under this point of the frame? `x`/`y` are normalised device
   * coordinates (-1..1, +y up). Used to answer "what is that bright blob?".
   */
  pick(
    x: number,
    y: number,
  ): Array<{
    name: string;
    parent: string;
    distance: number;
    geometry: string;
    material: string;
    color: string;
  }>;
  /**
   * Frame a named subject from a spherical direction and draw one frame.
   *
   * Bypasses the director entirely so an asset can be reviewed on its own
   * terms — turntables, silhouette checks, close reads of a detail — without
   * having to find a moment in the show that happens to point at it.
   */
  look(opts: {
    subject: string;
    /** Degrees around the world Y axis; 0 looks at the subject's -Z face. */
    azimuth: number;
    /** Degrees above the horizon. */
    elevation: number;
    /** Multiple of the subject's bounding radius. */
    distance?: number;
    fov?: number;
    /** Extra world-space offset applied to the look-at point. */
    offset?: [number, number, number];
  }): { radius: number; center: [number, number, number]; distance: number } | null;
  /** Stop the main loop so the harness owns the frame, or hand it back. */
  freeze(v: boolean): void;
  /** Draw one frame with whatever state the harness has just set. */
  draw(): void;
  sanity(): Array<{ code: string; detail: string; severity: string }>;
  staticSanity(): Array<{ code: string; detail: string; severity: string }>;
  narrationStats(): { lines: number; words: number; voiced: boolean };
  consoleErrors: string[];
  /** Live application, for ad-hoc scene-graph probing from the QA harness. */
  app: App;
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
    app,
    version: '1.0.0',
    duration: app.show.timeline.duration,
    checkpoints: CHECKPOINTS,
    consoleErrors: [],

    seekAndSettle(time: number, frames = 6, preroll = 2.2): void {
      const start = Math.max(0, time - preroll);
      // Own the frame for the duration: otherwise the next animation frame
      // redraws before the screenshot lands and the capture is a lottery.
      app.frozen = true;
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
      app.frozen = false;
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
    pick(x: number, y: number) {
      const rc = new THREE.Raycaster();
      rc.near = 0.01;
      rc.far = 1e9;
      rc.setFromCamera(new THREE.Vector2(x, y), app.render.camera);
      const root = app.stage.space.visible ? app.stage.space : app.stage.interior;
      return rc
        .intersectObject(root, true)
        .slice(0, 8)
        .map((h) => {
          const m = h.object as THREE.Mesh;
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          return {
            name: h.object.name || h.object.type,
            parent: h.object.parent?.name ?? '',
            distance: Math.round(h.distance),
            geometry: m.geometry?.type ?? '',
            material: mat?.type ?? '',
            color: (mat as THREE.MeshStandardMaterial)?.color?.getHexString?.() ?? '',
          };
        });
    },
    freeze(v: boolean): void {
      app.frozen = v;
    },
    draw(): void {
      app.render.render(app.show.time);
    },
    look(opts) {
      const o = subject(opts.subject);
      if (!o) return null;
      app.frozen = true;
      o.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(o);
      if (box.isEmpty()) return null;
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const center = sphere.center.clone();
      if (opts.offset) center.add(new THREE.Vector3(...opts.offset));
      const dist = sphere.radius * (opts.distance ?? 2.6);
      const az = (opts.azimuth * Math.PI) / 180;
      const el = (opts.elevation * Math.PI) / 180;
      const dir = new THREE.Vector3(
        Math.sin(az) * Math.cos(el),
        Math.sin(el),
        -Math.cos(az) * Math.cos(el),
      );
      const cam = app.render.camera;
      cam.fov = opts.fov ?? 42;
      cam.position.copy(center).addScaledVector(dir, dist);
      cam.up.set(0, 1, 0);
      cam.lookAt(center);
      cam.near = Math.max(0.05, dist * 0.002);
      cam.far = Math.max(24000, dist * 40);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      app.render.render(app.show.time);
      return {
        radius: sphere.radius,
        center: [center.x, center.y, center.z],
        distance: dist,
      };
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
