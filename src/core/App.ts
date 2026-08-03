import * as THREE from 'three';
import { RenderSystem } from '../render/RenderSystem';
import { Stage } from '../stage/Stage';
import { TitleCrawl } from '../stage/TitleCrawl';
import { CameraDirector } from '../camera/CameraDirector';
import { Timeline } from '../timeline/Timeline';
import { buildChapters } from '../timeline/chapters';
import { starOpacityAt } from '../timeline/ambience';
import type { ShowContext } from '../timeline/context';
import { AudioEngine } from '../audio/AudioEngine';
import { Sfx } from '../audio/Sfx';
import { MusicEngine } from '../audio/Music';
import { Narration, type NarrationLine } from '../audio/Narration';
import { UI, type ChapterEntry } from '../ui/UI';
import { ExploreController } from '../explore/ExploreController';
import { SanityChecker } from '../qa/sanity';
import { CHECKPOINTS } from '../qa/checkpoints';
import {
  DEFAULT_PREFS,
  QUALITY_TIERS,
  loadPreferences,
  savePreferences,
  type Preferences,
  type QualityName,
} from './Settings';
import { rng } from './Random';
import { clamp01 } from './math';
import { resourceReport } from './dispose';

/**
 * Application root.
 *
 * Owns the render loop and the lifetime of every subsystem, and is the only
 * place where the timeline, the camera director, the audio engine and the UI
 * are allowed to know about each other.
 */
export class App {
  readonly render: RenderSystem;
  readonly stage: Stage;
  readonly director = new CameraDirector();
  readonly timeline: Timeline<ShowContext>;
  readonly audio = new AudioEngine();
  readonly sfx: Sfx;
  readonly music: MusicEngine;
  readonly narration: Narration;
  readonly ui: UI;
  readonly explore: ExploreController;
  readonly sanity: SanityChecker;
  readonly crawl = new TitleCrawl();

  private prefs: Preferences;
  private ctx: ShowContext;
  private lastFrameTime = 0;
  private elapsed = 0;
  private rafId = 0;
  private running = false;
  private started = false;
  private hidden = false;
  private activeNarration: NarrationLine | null = null;
  private lastNarrationId: string | null = null;
  private cardText: string | null = null;
  private sanityAccum = 0;
  private idleTimer = 0;
  private benchmarkResult: { fps: number; suggestion: QualityName } | null = null;
  private frameCount = 0;
  private fpsSmoothed = 60;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, onProgress: (label: string, t: number) => void) {
    this.prefs = loadPreferences();
    const tier = QUALITY_TIERS[this.prefs.quality] ?? QUALITY_TIERS.medium;

    onProgress('Assembling the stage', 0.02);
    this.stage = new Stage(tier, (label, t) => onProgress(label, 0.02 + t * 0.72));

    onProgress('Starting the renderer', 0.76);
    this.render = new RenderSystem(canvas, this.stage.scene, tier);
    this.stage.starfield.setPixelRatio(this.render.pixelRatio);
    this.stage.attachEnvironments(this.render.renderer);

    this.sfx = new Sfx(this.audio);
    this.music = new MusicEngine(this.audio);
    this.narration = new Narration(this.audio);
    this.sanity = new SanityChecker(this.stage);

    this.ctx = {
      stage: this.stage,
      director: this.director,
      audio: this.audio,
      sfx: this.sfx,
      music: this.music,
      narration: this.narration,
      render: this.render,
      crawl: this.crawl,
      rng: rng('show'),
      setCard: (text) => {
        this.cardText = text;
        this.ui.setCard(text);
      },
      now: () => this.timeline.time,
      scrubbing: false,
    };

    onProgress('Blocking the shots', 0.82);
    this.timeline = new Timeline<ShowContext>(this.ctx);
    for (const chapter of buildChapters()) {
      this.timeline.add(chapter);
      this.director.addAll(chapter.shots(this.ctx));
    }

    onProgress('Building the interface', 0.9);
    const entries: ChapterEntry[] = this.timeline.chapters.map((c) => ({
      id: c.id,
      title: c.title,
      synopsis: c.synopsis,
      start: c.start,
      duration: c.duration,
    }));
    this.ui = new UI(uiRoot, this.prefs, entries, this.timeline.duration);
    this.explore = new ExploreController(this.stage, this.render.camera, canvas);

    this.wireUI();
    this.wireWindow();
    this.applyPreferences();

    // Prime the world at t=0 so the first frame is already correct.
    this.timeline.seek(0);
    this.applyContinuousWorldState();
    this.resize();
    onProgress('Ready', 1);
  }

  // ------------------------------------------------------------------ setup

  private wireUI(): void {
    const ui = this.ui;

    ui.onEnter.add(() => void this.begin());
    ui.onPlayToggle.add(() => this.togglePlay());
    ui.onRestart.add(() => {
      this.leaveExplore();
      this.resetAudioForSeek();
      this.timeline.restart();
    });
    ui.onScrubStart.add(() => {
      this.ctx.scrubbing = true;
    });
    ui.onScrubEnd.add(() => {
      this.ctx.scrubbing = false;
    });
    ui.onSeek.add((t) => this.seek(t));
    ui.onChapterSelect.add((i) => {
      this.leaveExplore();
      this.resetAudioForSeek();
      this.timeline.seekChapter(i);
      this.timeline.play();
    });
    ui.onModeChange.add((mode) => {
      if (mode === 'explore') this.enterExplore();
      else this.leaveExplore();
    });
    ui.onVolumeChange.add(({ key, value }) => {
      if (key === 'master') this.prefs.masterVolume = value;
      if (key === 'music') this.prefs.musicVolume = value;
      if (key === 'narration') this.prefs.narrationVolume = value;
      if (key === 'effects') this.prefs.effectsVolume = value;
      this.applyVolumes();
      savePreferences(this.prefs);
    });
    ui.onSubtitlesToggle.add((on) => {
      this.prefs.subtitles = on;
      this.ui.setSubtitlesEnabled(on);
      savePreferences(this.prefs);
    });
    ui.onQualityChange.add((q) => this.applyQuality(q));
    ui.onDebugToggle.add((on) => {
      this.prefs.debug = on;
      savePreferences(this.prefs);
    });
    ui.onFollow.add(() => this.explore.follow());
    ui.onInspect.add(() => this.explore.inspect());
    ui.onReturnToCinematic.add(() => this.leaveExplore());
    ui.onDeselect.add(() => this.explore.select(null));

    this.explore.onSelect.add((info) => {
      this.ui.setSelection(
        info
          ? {
              label: info.label,
              description: info.description,
              kind: info.location === 'space' ? 'Vessel · exterior' : 'Interior subject',
            }
          : null,
      );
    });
    this.explore.onHover.add((hover) => {
      this.ui.setHoverLabel(hover ? hover.info.label : null, hover?.x, hover?.y);
    });

    this.timeline.onChapterChange.add(({ chapter, index }) => {
      this.ui.setChapter(index, {
        id: chapter.id,
        title: chapter.title,
        synopsis: chapter.synopsis,
        start: chapter.start,
        duration: chapter.duration,
      });
    });
    this.timeline.onPlayStateChange.add((playing) => this.ui.setPlaying(playing));
    this.timeline.onComplete.add(() => {
      this.ui.showToast('Cinematic complete — entering Explore mode');
      window.setTimeout(() => {
        this.ui.setMode('explore', true);
      }, 1400);
    });

    this.narration.onLine.add((payload) => {
      this.activeNarration = payload?.line ?? null;
      this.updateSubtitle();
    });
  }

  private wireWindow(): void {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => window.setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      if (this.hidden) {
        void this.audio.setSuspended(true);
      } else {
        // Drop the accumulated hidden time so the timeline does not jump.
        this.lastFrameTime = performance.now();
        if (this.timeline.playing) void this.audio.setSuspended(false);
      }
    });
    window.addEventListener('keydown', (ev) => this.onKey(ev));
    window.addEventListener('error', (ev) => this.reportError(ev.error ?? ev.message));
    window.addEventListener('unhandledrejection', (ev) => this.reportError(ev.reason));
    const gl = this.render.renderer.getContext();
    this.render.renderer.domElement.addEventListener('webglcontextlost', (ev) => {
      ev.preventDefault();
      this.ui.showError('The WebGL context was lost. Reload to continue.');
    });
    void gl;
  }

  private onKey(ev: KeyboardEvent): void {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (ev.key.toLowerCase()) {
      case ' ':
        ev.preventDefault();
        this.togglePlay();
        break;
      case 'r':
        this.leaveExplore();
        this.resetAudioForSeek();
        this.timeline.restart();
        break;
      case 'arrowleft':
        ev.preventDefault();
        this.seek(this.timeline.time - (ev.shiftKey ? 20 : 5));
        break;
      case 'arrowright':
        ev.preventDefault();
        this.seek(this.timeline.time + (ev.shiftKey ? 20 : 5));
        break;
      case ',':
        this.stepChapter(-1);
        break;
      case '.':
        this.stepChapter(1);
        break;
      case 'e':
        this.ui.setMode(this.ui.currentMode === 'cinematic' ? 'explore' : 'cinematic', true);
        break;
      case 'c': {
        const next = !this.prefs.subtitles;
        this.prefs.subtitles = next;
        this.ui.setSubtitlesEnabled(next);
        savePreferences(this.prefs);
        break;
      }
      case 'f':
        void this.ui.toggleFullscreen();
        break;
      case 'h':
        this.ui.setHelpVisible(!this.ui.helpVisible);
        break;
      case 'd': {
        const next = !this.ui.debugVisible;
        this.ui.setDebugVisible(next);
        this.prefs.debug = next;
        savePreferences(this.prefs);
        break;
      }
      case 'escape':
        if (this.ui.helpVisible) this.ui.setHelpVisible(false);
        else if (this.explore.selected) this.explore.select(null);
        else if (this.ui.currentMode === 'explore') this.ui.setMode('cinematic', true);
        this.ui.closePopovers();
        break;
      default:
        break;
    }
  }

  private stepChapter(dir: number): void {
    const idx = Math.max(
      0,
      Math.min(this.timeline.chapters.length - 1, this.timeline.activeChapterIndex + dir),
    );
    this.leaveExplore();
    this.resetAudioForSeek();
    this.timeline.seekChapter(idx);
  }

  // ------------------------------------------------------------- lifecycle

  /** Called from the "Enter the Galaxy" gesture: unlock audio and play. */
  async begin(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.ui.hideGate();

    const ok = await this.audio.start(this.prefs.quality === 'high');
    if (ok) {
      this.applyVolumes();
      this.music.start();
      await this.narration.ensureDecoded();
      if (this.narration.mode === 'speech') {
        this.ui.showToast('Using browser speech for narration');
      } else if (this.narration.mode === 'subtitles-only') {
        this.ui.showToast('Narration audio unavailable — subtitles only');
      }
    } else {
      this.ui.showToast('Audio could not start; the cinematic will play silently');
    }

    this.resetAudioForSeek();
    this.timeline.seek(0);
    this.timeline.play();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    const loop = (): void => {
      this.rafId = requestAnimationFrame(loop);
      this.frame();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private togglePlay(): void {
    if (this.timeline.playing) {
      this.timeline.pause();
      this.narration.stop();
      this.music.setLevel(0.35);
    } else {
      if (this.ui.currentMode === 'explore') this.leaveExplore();
      this.music.setLevel(1);
      this.timeline.play();
      void this.audio.setSuspended(false);
      // Resume the narration line that should be audible right now.
      this.syncNarrationTo(this.timeline.time, true);
    }
  }

  private seek(t: number): void {
    this.resetAudioForSeek();
    this.timeline.seek(t);
    this.applyContinuousWorldState();
    this.director.reset();
    this.syncNarrationTo(this.timeline.time, true);
  }

  /** Cut every transient sound so scrubbing cannot stack audio. */
  private resetAudioForSeek(): void {
    this.narration.stop();
    this.lastNarrationId = null;
    this.activeNarration = null;
    this.sfx.stopAllBeds();
    this.music.reset();
    this.stage.fx.reset();
    this.ui.setSubtitle(null);
    this.ctx.setCard(null);
  }

  private enterExplore(): void {
    this.timeline.pause();
    this.narration.stop();
    this.music.setLevel(0.45);
    this.explore.enter();
    this.ui.setMode('explore');
    this.ui.showToast('Explore mode — drag to orbit, WASD to move, click a subject');
  }

  private leaveExplore(): void {
    if (this.explore.enabled) {
      this.explore.exit();
      this.explore.select(null);
    }
    this.ui.setMode('cinematic');
    this.ui.setSelection(null);
    this.ui.setHoverLabel(null);
    this.music.setLevel(1);
  }

  // ------------------------------------------------------------------ prefs

  private applyPreferences(): void {
    this.ui.setSubtitlesEnabled(this.prefs.subtitles);
    this.ui.setQuality(this.prefs.quality);
    this.ui.setDebugVisible(this.prefs.debug);
    this.applyVolumes();
  }

  private applyVolumes(): void {
    this.audio.setVolumes({
      master: this.prefs.masterVolume,
      music: this.prefs.musicVolume,
      narration: this.prefs.narrationVolume,
      sfx: this.prefs.effectsVolume,
    });
  }

  applyQuality(name: QualityName): void {
    const tier = QUALITY_TIERS[name] ?? QUALITY_TIERS.medium;
    this.prefs.quality = name;
    savePreferences(this.prefs);
    this.render.applyTier(tier);
    this.stage.applyQuality(tier);
    this.stage.starfield.setPixelRatio(this.render.pixelRatio);
    this.render.setScene(this.stage.scene);
    this.resize();
    this.ui.setQuality(name);
    this.ui.showToast(`Quality: ${tier.label}`);
  }

  /**
   * Short startup benchmark. Measures the cost of the first frames and
   * suggests a tier without ever overriding an explicit user choice.
   */
  runBenchmark(samples: number[]): { fps: number; suggestion: QualityName } {
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 1 / 60;
    const fps = 1 / Math.max(1e-4, median);
    const suggestion: QualityName = fps > 55 ? 'high' : fps > 28 ? 'medium' : 'low';
    this.benchmarkResult = { fps, suggestion };
    return this.benchmarkResult;
  }

  get benchmark(): { fps: number; suggestion: QualityName } | null {
    return this.benchmarkResult;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.render.setSize(w, h);
    this.stage.applyCameraRange(this.render.camera);
    this.stage.starfield.setPixelRatio(this.render.pixelRatio);
  }

  // ------------------------------------------------------------------ frame

  private frame(): void {
    const now = performance.now();
    const rawDt = Math.max(0, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    // Skip expensive work while the tab is hidden.
    if (this.hidden) return;
    const dt = Math.min(0.06, rawDt);
    this.elapsed += dt;
    this.frameCount++;
    this.fpsSmoothed = this.fpsSmoothed * 0.92 + (1 / Math.max(1e-4, rawDt)) * 0.08;
    this.sanity.recordFrame(rawDt);

    try {
      this.timeline.update(dt);
      this.applyContinuousWorldState();
      this.syncNarrationTo(this.timeline.time, false);

      if (this.explore.enabled) {
        this.explore.update(dt);
      } else {
        this.director.update(this.timeline.time, dt, this.render.camera);
      }

      this.stage.update(dt, this.elapsed);
      this.music.update();
      this.audio.updateListener(this.render.camera);
      this.render.dofFocus = this.director.sample.focus;
      this.render.update(dt, this.elapsed);
      this.render.render();

      this.ui.setTime(this.timeline.time, this.timeline.duration);
      this.updateHudIdle(dt);

      this.sanityAccum += dt;
      if (this.sanityAccum > 0.5) {
        this.sanityAccum = 0;
        this.sanity.run(this.render.camera, this.elapsed);
      }
      if (this.ui.debugVisible) this.updateDebug();
    } catch (err) {
      this.reportError(err);
      this.stop();
    }
  }

  /**
   * World state that belongs to the whole show rather than to one chapter, and
   * must therefore be re-derived from the playhead on every frame and seek.
   */
  private applyContinuousWorldState(): void {
    this.stage.starfield.setOpacity(starOpacityAt(this.timeline.time));
    if (this.stage.location === 'interior') {
      this.stage.focusInteriorLight(
        this.explore.enabled ? this.render.camera.position : this.director.sample.target,
      );
    }
  }

  private updateHudIdle(dt: number): void {
    if (this.timeline.playing && this.ui.currentMode === 'cinematic') {
      this.idleTimer += dt;
      this.ui.setHudDimmed(this.idleTimer > 4.5);
    } else {
      this.idleTimer = 0;
      this.ui.setHudDimmed(false);
    }
  }

  /** Start / stop narration so it always matches the playhead exactly once. */
  private syncNarrationTo(t: number, force: boolean): void {
    const wanted = this.narration.lineAt(t);
    if (!wanted) {
      if (this.lastNarrationId !== null) {
        this.lastNarrationId = null;
        if (!this.narration.speaking) {
          this.activeNarration = null;
          this.updateSubtitle();
        }
      }
      if (force) {
        this.narration.stop();
        this.activeNarration = null;
        this.updateSubtitle();
      }
      return;
    }
    if (wanted.id === this.lastNarrationId && !force) return;
    if (wanted.id === this.lastNarrationId && force && this.narration.currentLineId === wanted.id) return;
    this.lastNarrationId = wanted.id;
    if (this.timeline.playing || force) {
      this.narration.play(wanted.id);
      this.activeNarration = wanted;
      this.updateSubtitle();
    }
  }

  private updateSubtitle(): void {
    if (!this.prefs.subtitles) {
      this.ui.setSubtitle(null);
      return;
    }
    const line = this.activeNarration;
    if (!line) {
      this.ui.setSubtitle(null);
      return;
    }
    const speaker =
      line.voice === 'princess' ? 'Leia' : line.voice === 'protocol' ? 'Protocol Droid' : undefined;
    this.ui.setSubtitle(line.text, speaker);
  }

  private updateDebug(): void {
    const chapter = this.timeline.activeChapter;
    const issues = this.sanity.current;
    const counts = this.stage.fx.liveCounts;
    const nextCheckpoint = CHECKPOINTS.find((c) => c.time >= this.timeline.time);
    const cls = (s: string, c: string): string => `<span class="${c}">${s}</span>`;
    const lines: string[] = [
      `${cls('time  ', 'k')}${this.timeline.time.toFixed(2)} / ${this.timeline.duration.toFixed(0)}s`,
      `${cls('chap  ', 'k')}${chapter ? `${chapter.id} (+${(this.timeline.time - chapter.start).toFixed(1)})` : '-'}`,
      `${cls('beat  ', 'k')}${chapter?.synopsis ?? '-'}`,
      `${cls('camera', 'k')} ${this.explore.enabled ? `explore:${this.explore.focusMode}` : this.director.activeShotId}`,
      `${cls('scene ', 'k')}${this.stage.location}  fov ${this.render.camera.fov.toFixed(1)}`,
      `${cls('fps   ', 'k')}${this.fpsSmoothed.toFixed(1)}  ${resourceReport(this.render.renderer)}`,
      `${cls('fx    ', 'k')}bolts ${counts.bolts} sparks ${counts.sparks} smoke ${counts.smoke} debris ${counts.debris}`,
      `${cls('audio ', 'k')}${this.audio.ready ? this.narration.mode : 'locked'} · cue ${this.music.currentCue}`,
      `${cls('narr  ', 'k')}${this.activeNarration?.id ?? '-'}  events ${this.timeline.firedCount}`,
      `${cls('next  ', 'k')}${nextCheckpoint ? `${nextCheckpoint.id} @ ${nextCheckpoint.time}s` : 'end'}`,
    ];
    if (issues.length === 0) {
      lines.push(cls('checks  all clear', 'k'));
    } else {
      for (const i of issues.slice(0, 5)) {
        lines.push(cls(`${i.code}: ${i.detail}`, i.severity === 'error' ? 'bad' : 'warn'));
      }
    }
    this.ui.setDebugText(lines.join('\n'));
  }

  private reportError(err: unknown): void {
    const message = err instanceof Error ? `${err.message}\n\n${err.stack ?? ''}` : String(err);
    console.error('[Shadow of the First Star]', err);
    this.ui.showError(message);
  }

  // -------------------------------------------------------------- QA bridge

  /** Exposed on `window.__SW` for the headless capture harness. */
  qaBridge(): Record<string, unknown> {
    return {
      version: 1,
      duration: this.timeline.duration,
      chapters: this.timeline.chapters.map((c) => ({ id: c.id, start: c.start, duration: c.duration })),
      checkpoints: CHECKPOINTS,
      narrationMode: () => this.narration.mode,
      narrationWords: this.narration.wordCount,
      seek: (t: number) => {
        this.resetAudioForSeek();
        this.timeline.seek(t);
        this.applyContinuousWorldState();
        this.director.reset();
        this.director.update(this.timeline.time, 1 / 60, this.render.camera);
      },
      /** Advance the world by `steps` fixed ticks so animation settles. */
      settle: (steps = 6, dt = 1 / 30) => {
        for (let i = 0; i < steps; i++) {
          this.timeline.update(0);
          this.applyContinuousWorldState();
          this.director.update(this.timeline.time, dt, this.render.camera);
          this.stage.update(dt, this.elapsed + i * dt);
        }
        this.render.dofFocus = this.director.sample.focus;
        this.render.update(dt, this.elapsed);
      },
      renderOnce: () => this.render.renderOnce(),
      setPlaying: (p: boolean) => (p ? this.timeline.play() : this.timeline.pause()),
      isPlaying: () => this.timeline.playing,
      time: () => this.timeline.time,
      chapterId: () => this.timeline.activeChapter?.id ?? null,
      cameraId: () => this.director.activeShotId,
      location: () => this.stage.location,
      fps: () => this.fpsSmoothed,
      setQuality: (q: QualityName) => this.applyQuality(q),
      setMode: (m: 'cinematic' | 'explore') => this.ui.setMode(m, true),
      setSubtitles: (on: boolean) => {
        this.prefs.subtitles = on;
        this.ui.setSubtitlesEnabled(on);
      },
      setDebug: (on: boolean) => this.ui.setDebugVisible(on),
      setVolume: (key: 'master' | 'music' | 'narration' | 'effects', v: number) => {
        this.ui.onVolumeChange.emit({ key, value: v });
      },
      hideUi: (hide: boolean) => {
        (document.getElementById('ui-root') as HTMLElement).style.visibility = hide ? 'hidden' : 'visible';
      },
      sanity: () => this.sanity.run(this.render.camera, this.elapsed),
      inspect: () => this.inspectFrame(),
      /** What the camera sees through a normalised device point. */
      pick: (ndcX: number, ndcY: number) => {
        const raycaster = new THREE.Raycaster();
        raycaster.far = this.render.camera.far;
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.render.camera);
        const root = this.stage.location === 'space' ? this.stage.spaceRoot : this.stage.interiorRoot;
        const hits = raycaster.intersectObject(root, true).filter((h) => h.object.visible);
        return hits.slice(0, 3).map((h) => ({
          name: h.object.name || h.object.type,
          parent: h.object.parent?.name ?? '',
          distance: +h.distance.toFixed(2),
          point: h.point.toArray().map((v) => +v.toFixed(2)),
        }));
      },
      app: this,
    };
  }

  /** Structured description of the current frame for checkpoint assertions. */
  inspectFrame(): Record<string, unknown> {
    const camera = this.render.camera;
    const stage = this.stage;
    const visible: Record<string, boolean> = {};
    const coverage: Record<string, number> = {};
    for (const s of stage.selectables) {
      const on = s.location === stage.location && SanityCheckerIsOnScreen(s.object, camera);
      visible[s.id] = on;
      coverage[s.id] = on ? SanityCheckerCoverage(s.object, camera) : 0;
    }
    return {
      time: this.timeline.time,
      chapter: this.timeline.activeChapter?.id ?? null,
      camera: this.director.activeShotId,
      location: stage.location,
      fade: this.render.fade,
      fov: camera.fov,
      cameraPos: camera.position.toArray(),
      visible,
      coverage,
      crawlOpacity: this.crawl.isDisposed ? 0 : 1,
      runnerDamage: stage.runner.damage,
      hologram: stage.dataProjection.isVisible,
      doorBreach: stage.corridor.blastDoor.breach,
      bolts: stage.fx.liveCounts.bolts,
      podSeparated: stage.pod.root.visible && stage.pod.root.position.distanceTo(stage.runner.root.position) > 12,
      reentry: stage.pod.root.visible,
      card: this.cardText,
      subtitle: this.activeNarration?.text ?? null,
      issues: this.sanity.current,
      fps: this.fpsSmoothed,
      frames: this.frameCount,
    };
  }

  dispose(): void {
    this.stop();
    this.explore.dispose();
    this.stage.dispose();
    this.render.dispose();
  }
}

// Small indirections so `inspectFrame` reads cleanly.
function SanityCheckerIsOnScreen(o: THREE.Object3D, c: THREE.PerspectiveCamera): boolean {
  return SanityChecker.isOnScreen(o, c);
}
function SanityCheckerCoverage(o: THREE.Object3D, c: THREE.PerspectiveCamera): number {
  return SanityChecker.screenCoverage(o, c);
}

export { DEFAULT_PREFS };
export { clamp01 };
