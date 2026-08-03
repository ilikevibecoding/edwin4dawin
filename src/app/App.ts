import * as THREE from 'three';
import { RenderSystem } from '../core/RenderSystem';
import { QUALITY_TIERS, isQualityName, type QualityName } from '../core/Quality';
import { Stage } from '../show/Stage';
import { Show } from '../show/Show';
import { UI } from '../ui/UI';
import { Subtitles } from '../ui/Subtitles';
import { ExploreMode } from '../interaction/ExploreMode';
import { AudioEngine } from '../audio/AudioEngine';
import { SanityChecker } from '../qa/Sanity';
import { disposeMaterials } from '../assets/Materials';
import { clearTextureCache } from '../assets/Textures';
import { disposeObject } from '../core/Disposal';
import { NARRATION, narrationWordCount } from '../timeline/Script';
import { clamp } from '../core/MathX';
import { installTestHooks } from '../qa/TestHooks';

/**
 * Application bootstrap and main loop.
 */

export interface StartupOptions {
  startTime: number;
  quality: QualityName | null;
  qaMode: boolean;
  autoplay: boolean;
}

export function readStartupOptions(): StartupOptions {
  const p = new URLSearchParams(window.location.search);
  const q = p.get('quality');
  return {
    startTime: Number(p.get('t') ?? 0) || 0,
    quality: q && isQualityName(q) ? q : null,
    qaMode: p.get('qa') === '1',
    autoplay: p.get('autoplay') !== '0',
  };
}

export class App {
  readonly canvas: HTMLCanvasElement;
  readonly uiHost: HTMLElement;
  readonly options: StartupOptions;

  render!: RenderSystem;
  stage!: Stage;
  show!: Show;
  ui!: UI;
  subtitles!: Subtitles;
  explore!: ExploreMode;
  sanity!: SanityChecker;
  audio: AudioEngine | null = null;

  quality: QualityName = 'medium';
  /**
   * When set, the main loop stops simulating and drawing entirely. QA takes
   * exclusive control of the frame this way; without it the next animation
   * frame would immediately overwrite any camera or visibility the harness set.
   */
  frozen = false;
  private running = false;
  private lastFrame = 0;
  private rafHandle = 0;
  private debugVisible = false;
  private hidden = false;
  private benchmarkFrames: number[] = [];
  private benchmarkDone = false;
  private userChoseQuality = false;
  private consoleErrors: string[] = [];
  private rebuilding = false;

  constructor(canvas: HTMLCanvasElement, uiHost: HTMLElement, options: StartupOptions) {
    this.canvas = canvas;
    this.uiHost = uiHost;
    this.options = options;
    this.quality = options.quality ?? (localStorage.getItem('starfall.quality') as QualityName | null) ?? 'medium';
    if (!isQualityName(this.quality)) this.quality = 'medium';
    if (options.quality) this.userChoseQuality = true;
  }

  /** Build the world. Progress is reported to the loading gate. */
  async build(onProgress: (value: number, label: string) => void): Promise<void> {
    onProgress(0.02, 'Starting the renderer');
    this.render = new RenderSystem(this.canvas, this.quality);
    this.resize();

    this.stage = new Stage(this.render, QUALITY_TIERS[this.quality], onProgress);
    this.show = new Show(this.render, this.stage);
    this.sanity = new SanityChecker(this.stage, this.show, this.render.camera, this.render.bgCamera);

    onProgress(0.96, 'Wiring the interface');
    this.ui = new UI(this.uiHost, this.show.timeline.duration, {
      onPlayPause: () => this.togglePlay(),
      onRestart: () => this.restart(),
      onSeek: (t) => this.seek(t),
      onChapter: (i) => this.show.timeline.jumpToChapter(i),
      onToggleExplore: () => this.toggleExplore(),
      onToggleSubtitles: () => this.toggleSubtitles(),
      onVolume: (bus, v) => this.audio?.setLevel(bus, v),
      onQuality: (q) => {
        this.userChoseQuality = true;
        void this.setQuality(q);
      },
      onFullscreen: () => this.toggleFullscreen(),
      onToggleDebug: () => this.toggleDebug(),
      onExploreAction: (a) => {
        if (a === 'return') {
          this.setExplore(false);
        } else {
          this.explore.act(a);
        }
      },
    });
    this.ui.setQuality(this.quality);

    this.subtitles = new Subtitles(this.ui.subtitleHost, (line) =>
      this.audio ? this.audio.durationFor(line) : line.estimate,
    );
    this.explore = new ExploreMode(this.render, this.stage, this.canvas);
    this.explore.onSelection((sel) => {
      if (!sel) {
        this.ui.setSelection(null);
        return;
      }
      const p = sel.worldPosition;
      this.ui.setSelection({
        name: sel.info.name,
        kicker: sel.info.kicker,
        description: sel.info.description,
        stats: `position  ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      });
    });
    this.explore.onHover((info, x, y) => {
      this.ui.setHover(info ? info.name : null, x, y);
    });

    this.show.timeline.onChapter((c) => this.ui.setChapter(c.index, c.title));

    this.bindEvents();
    installTestHooks(this);

    if (this.options.startTime > 0) this.show.timeline.seek(this.options.startTime);
    onProgress(1, 'Ready');
  }

  /** Called once the viewer has interacted, so audio may start. */
  async startAudio(onProgress?: (v: number, label: string) => void): Promise<void> {
    try {
      this.audio = new AudioEngine();
      await this.audio.resume();
      onProgress?.(0.5, 'Loading narration');
      await this.audio.preloadNarration();
      this.show.audio = this.audio;
      const levels = this.audio.getLevels();
      this.audio.setLevel('master', levels.master);
      if (!this.audio.generatedNarrationAvailable) {
        if (this.audio.speechSynthesisAvailable) {
          // Voices load asynchronously in some browsers.
          window.speechSynthesis.getVoices();
        }
      }
    } catch (err) {
      this.audio = null;
      this.ui.toast('Audio unavailable — continuing without sound', 'error', 5200);
      console.warn('Audio initialisation failed', err);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    if (this.options.autoplay) this.show.timeline.play();
    this.ui.setPlaying(this.show.timeline.isPlaying);
    this.loop();
  }

  private loop = (): void => {
    this.rafHandle = requestAnimationFrame(this.loop);
    if (this.hidden || this.rebuilding || this.frozen) {
      this.lastFrame = performance.now();
      return;
    }
    const now = performance.now();
    const raw = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    // Clamp so a stall cannot teleport the show forward.
    const dt = clamp(raw, 0.0005, 0.1);
    this.frame(dt);
  };

  /**
   * Advance the show without drawing. The QA harness uses this to roll the
   * timeline forward from a seek so that transient effects — bolts in flight,
   * sparks, smoke — exist in the captured frame.
   */
  simulate(dt: number): void {
    this.show.update(dt);
    if (this.audio) this.audio.update(dt);
  }

  /** One simulation + render step. Exposed so QA can step deterministically. */
  frame(dt: number): void {
    const explore = this.explore.active;
    if (explore) {
      // The clock keeps running only if the viewer left it playing.
      this.show.applyContinuous(this.show.time, dt);
      if (this.show.timeline.isPlaying) this.show.update(dt);
      this.explore.update(dt);
    } else {
      this.show.update(dt);
    }

    const t = this.show.time;
    this.subtitles.update(t);
    this.ui.setTime(t);
    this.ui.setPlaying(this.show.timeline.isPlaying);
    this.ui.update(dt, this.show.timeline.isPlaying, explore);

    if (this.audio) {
      const interior = this.stage.interior.visible && !this.stage.space.visible;
      this.audio.updateListener(this.render.camera, interior ? 1 : 0.045);
      this.audio.update(dt);
    }

    this.stage.fx.setPixelScale(this.render.drawingBufferSize.height);
    this.render.render(t);

    this.sanity.recordFrame(dt);
    if (this.debugVisible) this.updateDebug(dt);
    this.runBenchmark(dt);

    if (explore) {
      const pos = this.explore.projectHover();
      if (pos && this.explore.hovered) this.ui.setHover(this.explore.hovered.name, pos.x, pos.y);
      else this.ui.setHover(null, 0, 0);
    }
  }

  /* ---------------------------------------------------------- controls */

  togglePlay(): void {
    this.show.timeline.toggle();
    this.ui.setPlaying(this.show.timeline.isPlaying);
    if (!this.show.timeline.isPlaying) this.audio?.stopNarration();
    this.audio?.sfx('uiClick', { gain: 0.4 });
  }

  restart(): void {
    this.show.timeline.restart();
    this.show.timeline.play();
    this.setExplore(false);
  }

  seek(time: number): void {
    this.show.timeline.seek(time);
    this.subtitles.update(time);
  }

  skip(delta: number): void {
    this.seek(clamp(this.show.time + delta, 0, this.show.timeline.duration));
  }

  toggleExplore(): void {
    this.setExplore(!this.explore.active);
  }

  setExplore(active: boolean): void {
    if (active === this.explore.active) return;
    if (active) {
      this.show.timeline.pause();
      this.audio?.stopNarration();
      this.explore.enter();
      this.ui.toast('Explore mode — drag to orbit, WASD to move, click to inspect', 'info', 4200);
    } else {
      this.explore.exit();
      this.show.applyContinuous(this.show.time, 1 / 60);
      this.ui.setSelection(null);
      this.ui.setHover(null, 0, 0);
    }
    this.ui.setExplore(active);
    this.ui.setPlaying(this.show.timeline.isPlaying);
  }

  toggleSubtitles(): void {
    this.subtitles.setEnabled(!this.subtitles.isEnabled);
    this.ui.setSubtitles(this.subtitles.isEnabled);
  }

  toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    this.ui.setDebug(this.debugVisible);
  }

  toggleFullscreen(): void {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.().catch(() => this.ui.toast('Fullscreen was blocked', 'error'));
    } else {
      void document.exitFullscreen?.();
    }
  }

  async setQuality(q: QualityName): Promise<void> {
    if (q === this.quality || this.rebuilding) return;
    this.rebuilding = true;
    const time = this.show.time;
    const wasPlaying = this.show.timeline.isPlaying;
    const wasExplore = this.explore.active;
    this.setExplore(false);
    this.ui.toast(`Rebuilding at ${QUALITY_TIERS[q].name} detail…`);

    // Give the browser a frame so the toast paints before the rebuild stalls.
    await new Promise((r) => window.setTimeout(r, 30));

    disposeObject(this.stage.space);
    disposeObject(this.stage.interior);
    disposeObject(this.stage.background);
    this.stage.dispose();
    disposeMaterials();
    clearTextureCache();

    this.quality = q;
    localStorage.setItem('starfall.quality', q);
    this.render.setQuality(q);
    this.stage = new Stage(this.render, QUALITY_TIERS[q], () => {});
    this.show = new Show(this.render, this.stage);
    this.show.audio = this.audio ?? this.show.audio;
    this.sanity = new SanityChecker(this.stage, this.show, this.render.camera, this.render.bgCamera);
    this.explore = new ExploreMode(this.render, this.stage, this.canvas);
    this.explore.onSelection((sel) => {
      if (!sel) {
        this.ui.setSelection(null);
        return;
      }
      const p = sel.worldPosition;
      this.ui.setSelection({
        name: sel.info.name,
        kicker: sel.info.kicker,
        description: sel.info.description,
        stats: `position  ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      });
    });
    this.explore.onHover((info, x, y) => this.ui.setHover(info ? info.name : null, x, y));
    this.show.timeline.onChapter((c) => this.ui.setChapter(c.index, c.title));
    this.show.timeline.seek(time);
    if (wasPlaying) this.show.timeline.play();
    if (wasExplore) this.setExplore(true);
    this.ui.setQuality(q);
    this.rebuilding = false;
    installTestHooks(this);
  }

  /* --------------------------------------------------------- benchmark */

  private runBenchmark(dt: number): void {
    if (this.benchmarkDone || this.options.qaMode) return;
    this.benchmarkFrames.push(dt);
    if (this.benchmarkFrames.length < 90) return;
    this.benchmarkDone = true;
    const sample = this.benchmarkFrames.slice(30);
    const fps = sample.length / sample.reduce((a, b) => a + b, 0);
    if (this.userChoseQuality) return;
    if (fps < 32 && this.quality !== 'low') {
      void this.setQuality('low');
      this.ui.toast(`Measured ${fps.toFixed(0)} fps — switching to low detail`, 'info', 5000);
    } else if (fps > 58 && this.quality === 'medium') {
      void this.setQuality('high');
      this.ui.toast(`Measured ${fps.toFixed(0)} fps — switching to high detail`, 'info', 5000);
    }
  }

  /* ------------------------------------------------------------- debug */

  private updateDebug(dt: number): void {
    const info = this.show.describe();
    const gl = this.render.renderer.info;
    const issues = [
      ...this.sanity.check(info.time),
      ...this.sanity.checkPerformance(),
      ...this.sanity.checkGL(this.render.renderer),
    ];
    const size = this.render.drawingBufferSize;
    const lines: string[] = [
      `<b>t</b> ${info.time.toFixed(2)}s / ${this.show.timeline.duration}s`,
      `<b>chapter</b> ${info.chapter}`,
      `<b>camera</b> ${info.shot}`,
      `<b>beat</b> ${info.beat}`,
      `<b>fps</b> ${(1 / dt).toFixed(0)} (avg ${this.sanity.averageFps.toFixed(0)})`,
      `<b>res</b> ${size.width}×${size.height} @${this.render.pixelRatio.toFixed(2)}`,
      `<b>quality</b> ${this.quality}`,
      `<b>draws</b> ${gl.render.calls}  <b>tris</b> ${(gl.render.triangles / 1000).toFixed(0)}k`,
      `<b>particles</b> ${this.stage.fx.liveParticles}`,
      `<b>bolts</b> ${this.stage.fx.spaceBolts.activeCount + this.stage.fx.interiorBolts.activeCount}`,
      `<b>audio</b> ${this.audio ? this.audio.ctx.state : 'off'}${this.audio?.generatedNarrationAvailable ? ' · voiced' : ' · synth'}`,
      `<b>words</b> ${narrationWordCount()} across ${NARRATION.length} lines`,
    ];
    if (this.consoleErrors.length) lines.push(`<span class="err">console: ${this.consoleErrors.length} error(s)</span>`);
    if (issues.length === 0) lines.push('<span>checks: all clear</span>');
    else
      for (const i of issues.slice(0, 6))
        lines.push(`<span class="${i.severity === 'error' ? 'err' : 'warn'}">${i.code}: ${i.detail}</span>`);
    this.ui.setDebugText(lines.join('\n'));
  }

  noteConsoleError(message: string): void {
    this.consoleErrors.push(message);
  }

  /* ------------------------------------------------------------ events */

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? document.body);
    }
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      this.audio?.setSuspended(document.hidden);
      if (!document.hidden) this.lastFrame = performance.now();
    });

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'KeyR':
          this.restart();
          break;
        case 'ArrowLeft':
          this.skip(-5);
          break;
        case 'ArrowRight':
          this.skip(5);
          break;
        case 'Comma':
          this.show.timeline.jumpToChapter(this.show.timeline.chapter.index - 1);
          break;
        case 'Period':
          this.show.timeline.jumpToChapter(this.show.timeline.chapter.index + 1);
          break;
        case 'KeyE':
          this.toggleExplore();
          break;
        case 'KeyC':
          this.toggleSubtitles();
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'KeyH':
          this.ui.toggleHelp();
          break;
        case 'KeyD':
          this.toggleDebug();
          break;
        case 'Escape':
          if (this.explore.active) this.setExplore(false);
          break;
        default:
          if (/^Digit[1-8]$/.test(e.code)) {
            this.show.timeline.jumpToChapter(Number(e.code.slice(5)) - 1);
          }
      }
    });
  }

  resize(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.render.resize(w, h);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    this.running = false;
    disposeObject(this.stage.space);
    disposeObject(this.stage.interior);
    disposeObject(this.stage.background);
    disposeMaterials();
    clearTextureCache();
    this.render.dispose();
  }
}

export { THREE };
