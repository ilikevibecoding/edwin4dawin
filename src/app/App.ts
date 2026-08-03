import * as THREE from 'three';
import { DisposalRegistry } from '../core/disposal';
import { RenderSystem } from '../core/Renderer';
import { QUALITY_ORDER, QUALITY_PRESETS, benchmarkSuggestion, type QualityLevel } from '../core/Quality';
import { MaterialLibrary } from '../assets/materials';
import { resetContactShadowCache } from '../assets/characters/CharacterRig';
import { SpaceScene } from '../scenes/SpaceScene';
import { CorridorScene } from '../scenes/CorridorScene';
import { CameraDirector, type ShotContext } from '../camera/CameraDirector';
import { buildShots } from '../camera/shots';
import { Timeline, CHAPTERS, type ChapterInfo } from '../timeline/Timeline';
import { battleShake } from '../timeline/battle';
import { AudioEngine } from '../audio/AudioEngine';
import { NarrationPlayer } from '../audio/Narration';
import { SoundDirector } from '../audio/SoundDirector';
import { UIRoot, type ViewMode } from '../ui/UIRoot';
import { ExploreControls } from '../interaction/ExploreControls';
import { Picker, type Selectable } from '../interaction/Picker';
import { dossierFor } from '../interaction/dossiers';
import { SanityChecker, type SanityReport } from '../qa/SanityChecks';
import { installTestHooks } from '../qa/TestHooks';
import { clamp, formatClock, saturate, smoothstep } from '../core/mathx';
import { chapterAt } from '../timeline/stage';

const EPILOGUE_LINE =
  'The Empire holds the ship, the crew and the princess.\nThe only thing that mattered left in an unarmed droid.';

const _leash = new THREE.Vector3();

export interface BootOptions {
  canvas: HTMLCanvasElement;
  uiRoot: HTMLElement;
  /** Force a quality level, bypassing the startup benchmark (used by QA). */
  forceQuality?: QualityLevel;
  /** Skip the enter gate and start silently - QA screenshot mode. */
  headless?: boolean;
}

/**
 * Application root.
 *
 * Owns the render system, the two scenes, the master clock, the camera
 * director, audio and the interface, and does nothing else. Every subsystem is
 * driven from a single `frame()` that resolves the clock first and then asks
 * each system to evaluate itself at that time.
 */
export class App {
  readonly timeline = new Timeline();
  readonly registry = new DisposalRegistry();
  readonly sanity = new SanityChecker();

  private canvas: HTMLCanvasElement;
  private uiRootEl: HTMLElement;
  private headless: boolean;

  private lib!: MaterialLibrary;
  private space!: SpaceScene;
  private interior!: CorridorScene;
  private director!: CameraDirector;
  private render!: RenderSystem;
  private ui!: UIRoot;
  private explore!: ExploreControls;
  private picker!: Picker;
  private audio: AudioEngine | null = null;
  private narration: NarrationPlayer | null = null;
  private sound: SoundDirector | null = null;

  private quality: QualityLevel = 'medium';
  private mode: ViewMode = 'cinematic';
  private running = false;
  private entered = false;
  private lastFrame = 0;
  private rafHandle = 0;
  private hidden = false;
  private lastSanity: SanityReport | null = null;
  private sanityCounter = 0;
  private wasPlayingBeforeScrub = false;
  private interiorActive = false;
  private currentBeat = '';
  private resizeObserver: ResizeObserver | null = null;
  private benchmarkNote = '';

  constructor(options: BootOptions) {
    this.canvas = options.canvas;
    this.uiRootEl = options.uiRoot;
    this.headless = options.headless ?? false;
    if (options.forceQuality) {
      this.quality = options.forceQuality;
      this.forcedQuality = options.forceQuality;
    }
  }

  // -------------------------------------------------------------------- boot
  async boot(): Promise<void> {
    this.installErrorHandlers();

    this.ui = new UIRoot(this.uiRootEl, {
      onEnter: () => void this.enter(),
      onPlayToggle: () => this.timeline.toggle(),
      onRestart: () => this.restart(),
      onSeek: (t) => this.seek(t),
      onScrubStart: () => {
        this.wasPlayingBeforeScrub = this.timeline.playing;
        this.timeline.pause();
      },
      onScrubEnd: () => {
        if (this.wasPlayingBeforeScrub) this.timeline.play();
      },
      onChapter: (c) => this.gotoChapter(c),
      onQuality: (level) => this.setQuality(level),
      onVolume: (channel, value) => this.audio?.setLevel(channel, value),
      onSubtitles: (enabled) => this.ui.subtitles.setEnabled(enabled),
      onMode: (mode) => this.setMode(mode),
      onFullscreen: () => this.toggleFullscreen(),
      onDebug: (enabled) => this.ui.debug.setVisible(enabled),
      onFollow: () => this.followSelection(),
      onInspect: () => this.inspectSelection(),
      onReturnToCinematic: () => this.setMode('cinematic'),
      onClearSelection: () => {
        this.picker.select(null);
        this.ui.hideSelection();
      },
    });

    const steps: Array<[string, () => void | Promise<void>]> = [
      ['Calibrating renderer', () => this.initRenderer()],
      ['Weathering hull plating', () => this.initMaterials()],
      ['Forming Tatooine', () => this.initSpace()],
      ['Welding corridor sections', () => this.initInterior()],
      ['Blocking camera moves', () => this.initDirector()],
      ['Wiring controls', () => this.initInteraction()],
      ['Compiling shaders', () => this.precompile()],
      ['Measuring frame time', () => this.runBenchmark()],
    ];

    let done = 0;
    for (const [label, fn] of steps) {
      this.ui.setProgress(done / (steps.length + 1), label);
      await nextFrame();
      await fn();
      done++;
    }

    this.ui.setProgress(done / (steps.length + 1), 'Recording narration cues');
    await nextFrame();
    await this.initAudio();

    const structural = SanityChecker.validateStructure(this.director, this.narration!);
    for (const issue of structural) {
      const message = `[structure] ${issue.code}: ${issue.message}`;
      if (issue.severity === 'error') console.error(message);
      else console.warn(message);
    }

    this.ui.setQualitySelection(this.quality);
    this.ui.setProgress(1, `Ready — ${QUALITY_PRESETS[this.quality].label}${this.benchmarkNote}`);
    this.ui.setReady();

    installTestHooks(this);

    this.timeline.on('chapter', ({ chapter }) => {
      this.ui.setChapter(chapter);
      this.ui.showChapterCard(chapter);
    });
    this.timeline.on('play', () => this.ui.setPlaying(true));
    this.timeline.on('pause', () => this.ui.setPlaying(false));
    this.timeline.on('complete', () => {
      this.ui.showEndCard(true, EPILOGUE_LINE);
    });

    this.startLoop();

    if (this.headless) await this.enter();
  }

  private initRenderer(): void {
    // Probe the GPU before committing to a preset. A timed benchmark runs later,
    // once there is something real to draw, and can revise this downward.
    const probe = this.canvas.getContext('webgl2') ?? this.canvas.getContext('webgl');
    const suggestion = benchmarkSuggestion(probe as WebGL2RenderingContext | null);
    if (this.forcedQuality === null) {
      this.quality = suggestion.level;
      this.benchmarkNote = ` · ${suggestion.reason}`;
    } else {
      this.benchmarkNote = ' · requested by URL';
    }
    this.render = new RenderSystem(this.canvas, new THREE.Scene(), new THREE.PerspectiveCamera(), this.quality);
    this.render.setFade(1);
  }

  private forcedQuality: QualityLevel | null = null;

  /**
   * Startup benchmark: draw a handful of frames of the busiest exterior moment
   * and time them. Only used to *revise* the preset the GPU probe suggested,
   * and only when the viewer has not asked for a specific one.
   */
  private async runBenchmark(): Promise<void> {
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      const t = 126 + i * 0.1;
      const start = performance.now();
      this.space.pose(t);
      this.director.update(t, 0, this.shotContext(t), true);
      this.space.finalize(t, this.director.camera.position);
      this.render.setScene(this.space.scene);
      this.render.setCamera(this.director.camera);
      this.render.render(t, 16.7);
      this.render.renderer.getContext().finish();
      samples.push(performance.now() - start);
      await nextFrame();
    }
    // Drop the warm-up frames; the first two include shader and buffer uploads.
    const timed = samples.slice(2);
    const avg = timed.reduce((a, b) => a + b, 0) / Math.max(1, timed.length);
    this.benchmarkMs = avg;

    if (this.forcedQuality !== null) return;
    const order = QUALITY_ORDER;
    let index = order.indexOf(this.quality);
    if (avg > 42 && index > 0) index--;
    else if (avg < 9 && index < order.length - 1) index++;
    const target = order[index];
    this.benchmarkNote = ` · ${avg.toFixed(1)} ms/frame benchmark`;
    if (target !== this.quality) this.setQuality(target);
  }

  private benchmarkMs = 0;

  private initMaterials(): void {
    this.lib = new MaterialLibrary(this.registry, QUALITY_PRESETS[this.quality]);
  }

  private initSpace(): void {
    this.space = new SpaceScene(this.lib);
  }

  private initInterior(): void {
    this.interior = new CorridorScene(this.lib);
  }

  private initDirector(): void {
    this.director = new CameraDirector(buildShots());
    this.director.setShakeSource((t) => {
      const exterior = battleShake(this.space.script, t);
      const interior = this.interior.shakeAt(t);
      return this.director.sceneAt(t) === 'interior' ? interior : exterior;
    });
    this.render.setScene(this.space.scene);
    this.render.setCamera(this.director.camera);
  }

  private initInteraction(): void {
    this.explore = new ExploreControls(this.canvas);
    this.picker = new Picker(this.canvas);
    this.picker.onSelect = (selectable) => this.onSelectionChanged(selectable);
    this.installKeyboard();
    this.installResize();
  }

  private async precompile(): Promise<void> {
    // Warming both scenes here means no shader hitch when the story cuts inside.
    this.director.update(0, 0, this.shotContext(0), true);
    this.render.renderer.compile(this.space.scene, this.director.camera);
    this.director.update(200, 0, this.shotContext(200), true);
    this.render.renderer.compile(this.interior.scene, this.director.camera);
    this.director.update(0, 0, this.shotContext(0), true);
    await nextFrame();
  }

  private async initAudio(): Promise<void> {
    try {
      this.audio = new AudioEngine();
      this.narration = new NarrationPlayer(this.audio);
      await this.narration.load((p, label) => {
        this.ui.setProgress(0.87 + p * 0.12, label);
      });
      this.ui.subtitles.setCues(this.narration.manifestCues);
      this.sound = new SoundDirector(this.audio, this.narration, this.space, this.interior);
    } catch (err) {
      console.error('[audio] initialisation failed', err);
      this.ui.showError(`Audio unavailable: ${String(err)}`);
    }
  }

  // ------------------------------------------------------------------- enter
  async enter(): Promise<void> {
    if (this.entered) return;
    this.entered = true;
    this.ui.hideGate();
    if (this.audio) {
      await this.audio.resume();
      this.sound?.start();
      this.sound?.reset(this.timeline.time);
    }
    this.timeline.seek(0);
    this.timeline.play();
    this.ui.setChapter(CHAPTERS[0]);
    this.ui.showChapterCard(CHAPTERS[0]);
  }

  // -------------------------------------------------------------- main loop
  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const tick = (now: number): void => {
      this.rafHandle = requestAnimationFrame(tick);
      const raw = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      if (this.hidden) return;
      // Two deltas. The story clock uses a generous cap so the cinematic stays
      // in real time - and therefore in sync with the narration - even at a
      // handful of frames per second on weak hardware. Interpolation uses a
      // tighter cap so a single long hitch cannot fling the camera.
      const storyDt = clamp(raw, 0, 0.5);
      const dt = clamp(raw, 0, 0.1);
      try {
        this.frame(dt, storyDt, raw * 1000);
      } catch (err) {
        console.error('[frame]', err);
        this.ui.showError(`Frame error: ${String(err)}`);
        cancelAnimationFrame(this.rafHandle);
        this.running = false;
      }
    };
    this.rafHandle = requestAnimationFrame(tick);

    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      if (document.hidden) {
        this.audio?.suspend();
      } else {
        this.lastFrame = performance.now();
        if (this.entered) void this.audio?.resume();
      }
    });
  }

  private frame(dt: number, storyDt: number, frameMs: number): void {
    this.timeline.advance(storyDt);
    const t = this.timeline.time;
    this.evaluate(t, dt, this.timeline.playing);
    this.render.render(t, frameMs);
    this.updateUi(t, dt);
    this.maybeRunSanity(t);
  }

  /**
   * Resolve the entire world at time `t`. Split out from `frame` so the QA
   * harness can render an exact, deterministic frame at any timestamp.
   */
  evaluate(t: number, dt: number, playing: boolean, instantCamera = false): void {
    const scene = this.director.sceneAt(t);
    this.interiorActive = scene === 'interior';

    // Pose the stage first: exterior shots are authored in the moving chase
    // frame, so the camera can only be solved once the frame is where it
    // belongs for this instant.
    this.space.pose(t);
    if (this.interiorActive) this.interior.update(t);

    const ctx = this.shotContext(t);
    this.director.update(t, dt, ctx, instantCamera || !playing);

    const activeCamera = this.mode === 'explore' ? this.explore.camera : this.director.camera;
    if (this.mode === 'explore') {
      this.explore.setLeash(this.exploreLeashCentre(), this.interiorActive ? 48 : 9_000);
      this.explore.update(dt);
    }

    this.space.finalize(t, activeCamera.position);
    this.render.setScene(this.interiorActive ? this.interior.scene : this.space.scene);
    this.render.setCamera(activeCamera);

    this.updateGrade(t);

    if (this.audio && this.sound) {
      this.audio.updateListener(activeCamera);
      this.sound.update(t, dt, playing, activeCamera.position, this.interiorActive);
    }

    if (this.mode === 'explore') {
      this.picker.setCandidates(this.interiorActive ? this.interior.selectable : this.space.selectable);
      this.picker.update(activeCamera);
    }

    this.currentBeat = describeBeat(t);
  }

  /** Chapter-driven fades, exposure and vignette. */
  private updateGrade(t: number): void {
    // Open from black, dip through the two hard cuts, and close out.
    let fade = 0;
    fade = Math.max(fade, 1 - smoothstep(0, 2.6, t));
    fade = Math.max(fade, smoothstep(44.4, 45.6, t) * (1 - smoothstep(46.0, 47.4, t)));
    fade = Math.max(fade, smoothstep(194.6, 196.0, t) * (1 - smoothstep(196.0, 197.6, t)));
    fade = Math.max(fade, smoothstep(318.4, 319.5, t) * (1 - smoothstep(319.5, 320.8, t)));
    fade = Math.max(fade, smoothstep(377.5, 380, t));
    this.render.setFade(saturate(fade));

    // Slightly lift exposure inside the ship so interiors never go muddy.
    const target = this.interiorActive ? 1.16 : 1.02;
    this.render.renderer.toneMappingExposure += (target - this.render.renderer.toneMappingExposure) * 0.08;
  }

  private shotContext(t: number): ShotContext {
    return { space: this.space, interior: this.interior, time: t };
  }

  private updateUi(t: number, dt: number): void {
    this.ui.setTime(t, this.timeline.duration);
    this.ui.subtitles.update(t);
    this.ui.updateChrome(dt, this.timeline.playing, this.mode);
    // The closing line resolves in over the last few seconds rather than
    // snapping in when the clock stops.
    if (t >= this.timeline.duration - 6.5) this.ui.showEndCard(true, EPILOGUE_LINE);
    else this.ui.showEndCard(false);

    if (this.ui.debug.isVisible) {
      const stats = this.render.stats;
      const shot = this.director.current;
      this.ui.debug.update({
        chapter: this.timeline.chapter.title,
        chapterIndex: this.timeline.chapter.index,
        beat: this.currentBeat,
        shotId: shot.id,
        shotLabel: shot.label,
        scene: this.interiorActive ? 'interior' : 'space',
        time: t,
        duration: this.timeline.duration,
        fps: stats.fps,
        frameMs: stats.frameMs,
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        programs: stats.programs,
        pixelRatio: stats.pixelRatio,
        quality: `${this.quality} (${this.benchmarkMs.toFixed(1)} ms bench)`,
        mode: this.mode,
        narration: this.narration
          ? `${this.narration.playbackMode} ${this.narration.loadedCount}/${this.narration.cueCount}`
          : 'unavailable',
        subtitle: this.ui.subtitles.currentText,
        audio: this.audio ? this.audio.state : 'none',
        audioPeak: this.audio?.peak ?? 0,
        limiterReduction: this.audio?.reduction ?? 0,
        cameraPos: formatVec(
          this.mode === 'explore' ? this.explore.camera.position : this.director.camera.position,
        ),
        particles: `${this.space.particleStats.sparks}/${this.interior.particleStats.sparks}`,
        sanity: this.lastSanity,
      });
    }
  }

  private maybeRunSanity(t: number): void {
    this.sanityCounter++;
    if (!this.ui.debug.isVisible && this.sanityCounter % 120 !== 0) return;
    if (this.ui.debug.isVisible && this.sanityCounter % 12 !== 0) return;
    this.lastSanity = this.runSanity(t);
  }

  runSanity(t: number): SanityReport {
    return this.sanity.run({
      time: t,
      space: this.space,
      interior: this.interior,
      director: this.director,
      narration: this.narration!,
      renderer: this.render.renderer,
      fps: this.render.stats.fps,
      interiorActive: this.interiorActive,
    });
  }

  // -------------------------------------------------------------- transport
  seek(time: number): void {
    this.timeline.seek(time);
    this.director.resetSmoothing();
    this.sound?.reset(this.timeline.time);
    this.sanity.resetEvents();
    this.evaluate(this.timeline.time, 0, this.timeline.playing, true);
    this.ui.noteActivity();
  }

  restart(): void {
    this.seek(0);
    this.setMode('cinematic');
    this.timeline.play();
    this.ui.showEndCard(false);
  }

  gotoChapter(chapter: ChapterInfo): void {
    this.seek(chapter.start);
    this.ui.showChapterCard(chapter);
    if (this.mode === 'explore') this.setMode('cinematic');
    this.timeline.play();
  }

  /**
   * Where the free camera is leashed to. Inside, the middle of 60 m of corridor;
   * outside, the chase frame, which carries both ships around a 200 km orbit and
   * so is the only fixed thing worth being near.
   */
  private exploreLeashCentre(): THREE.Vector3 {
    if (this.interiorActive) return _leash.set(0, 1.5, 20);
    return this.space.chase.getWorldPosition(_leash);
  }

  // ------------------------------------------------------------------- modes
  setMode(mode: ViewMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.ui.setMode(mode);
    if (mode === 'explore') {
      const distance = this.interiorActive ? 6 : 600;
      this.explore.adoptFrom(this.director.camera, distance);
      this.explore.setWorldScale(this.interiorActive ? 1 : 60);
      this.explore.setLens(
        this.interiorActive ? 0.06 : 5,
        this.interiorActive ? 600 : 2_400_000,
        this.director.camera.fov,
      );
      this.explore.setAspect(this.render.size.width / this.render.size.height);
      this.explore.setEnabled(true);
      this.picker.setEnabled(true);
      this.timeline.pause();
    } else {
      this.explore.setEnabled(false);
      this.picker.setEnabled(false);
      this.picker.select(null);
      this.ui.hideSelection();
      this.director.resetSmoothing();
    }
    this.evaluate(this.timeline.time, 0, this.timeline.playing, true);
  }

  private onSelectionChanged(selectable: Selectable | null): void {
    if (!selectable) {
      this.ui.hideSelection();
      return;
    }
    const dossier = dossierFor(selectable.id);
    const box = new THREE.Box3().setFromObject(selectable.object);
    const size = box.getSize(new THREE.Vector3());
    const stats: Array<[string, string]> = [
      ['LENGTH', `${size.z.toFixed(size.z < 10 ? 2 : 0)} m`],
      ['BEAM', `${size.x.toFixed(size.x < 10 ? 2 : 0)} m`],
      ['HEIGHT', `${size.y.toFixed(size.y < 10 ? 2 : 0)} m`],
      ['TIME', formatClock(this.timeline.time)],
    ];
    this.ui.showSelection(dossier, stats);
    this.ui.setFollowActive(this.explore.following === selectable.object);
  }

  private followSelection(): void {
    const sel = this.picker.current;
    if (!sel) return;
    const box = new THREE.Box3().setFromObject(sel.object);
    const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 1.25, 3);
    this.explore.follow(sel.object, radius);
    this.ui.setFollowActive(true);
  }

  private inspectSelection(): void {
    const sel = this.picker.current;
    if (!sel) return;
    this.explore.inspect(sel.object);
    this.ui.setFollowActive(true);
  }

  // ----------------------------------------------------------------- quality
  setQuality(level: QualityLevel): void {
    if (level === this.quality) return;
    this.quality = level;
    this.forcedQuality = level;
    const wasPlaying = this.timeline.playing;
    const time = this.timeline.time;
    this.timeline.pause();

    // Rebuild everything against the new preset and release the old GPU payload.
    this.picker.select(null);
    this.ui.hideSelection();
    this.space.scene.clear();
    this.interior.scene.clear();
    this.registry.dispose();
    resetContactShadowCache();

    this.lib = new MaterialLibrary(this.registry, QUALITY_PRESETS[level]);
    this.space = new SpaceScene(this.lib);
    this.interior = new CorridorScene(this.lib);
    this.director.setShakeSource((t) => {
      const exterior = battleShake(this.space.script, t);
      const interior = this.interior.shakeAt(t);
      return this.director.sceneAt(t) === 'interior' ? interior : exterior;
    });
    if (this.audio && this.narration) {
      this.sound = new SoundDirector(this.audio, this.narration, this.space, this.interior);
      this.sound.start();
      this.sound.reset(time);
    }

    this.render.applyQuality(level);
    this.applyViewportScale();
    this.ui.setQualitySelection(level);
    this.evaluate(time, 0, false, true);
    if (wasPlaying) this.timeline.play();
  }

  // ------------------------------------------------------------------ layout
  private installResize(): void {
    const onResize = (): void => {
      this.render.resize();
      const { width, height } = this.render.size;
      const aspect = width / Math.max(1, height);
      this.director.camera.aspect = aspect;
      this.director.camera.updateProjectionMatrix();
      this.explore.setAspect(aspect);
      this.applyViewportScale();
    };
    window.addEventListener('resize', onResize);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => onResize());
      this.resizeObserver.observe(document.body);
    }
    onResize();
  }

  private applyViewportScale(): void {
    const { height } = this.render.size;
    const ratio = Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS[this.quality].maxPixelRatio);
    this.space.setViewportScale(height * ratio, this.director.camera.fov);
    this.interior.setViewportScale(height * ratio, this.director.camera.fov);
  }

  private toggleFullscreen(): void {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.().catch(() => undefined);
    else void document.exitFullscreen?.().catch(() => undefined);
  }

  // ---------------------------------------------------------------- keyboard
  private installKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.timeline.toggle();
          break;
        case 'ArrowLeft':
          this.seek(this.timeline.time - 10);
          break;
        case 'ArrowRight':
          this.seek(this.timeline.time + 10);
          break;
        case 'Comma':
          this.seek(this.timeline.time - 1);
          break;
        case 'Period':
          this.seek(this.timeline.time + 1);
          break;
        case 'KeyR':
          this.restart();
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'KeyH':
          this.ui.toggleHelp();
          break;
        case 'KeyC': {
          const on = !this.ui.subtitles.isEnabled;
          this.ui.subtitles.setEnabled(on);
          this.ui.setSubtitleSwitch(on);
          break;
        }
        case 'KeyE':
          this.setMode(this.mode === 'cinematic' ? 'explore' : 'cinematic');
          break;
        case 'Backquote': {
          const on = this.ui.debug.toggle();
          this.ui.setDebugSwitch(on);
          break;
        }
        default:
          if (/^Digit[1-8]$/.test(e.code)) {
            const index = Number(e.code.slice(5)) - 1;
            if (CHAPTERS[index]) this.gotoChapter(CHAPTERS[index]);
          }
          break;
      }
      this.ui.noteActivity();
    });
    window.addEventListener('pointermove', () => this.ui.noteActivity());
  }

  // ------------------------------------------------------------------ errors
  private installErrorHandlers(): void {
    const report = (message: string): void => {
      this.sanity.recordConsoleError(message);
      this.ui?.showError(message);
    };
    window.addEventListener('error', (e) => report(`${e.message} (${e.filename}:${e.lineno})`));
    window.addEventListener('unhandledrejection', (e) => report(`Unhandled rejection: ${String(e.reason)}`));

    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]): void => {
      this.sanity.recordConsoleError(args.map(String).join(' '));
      originalError(...args);
    };
  }

  // ------------------------------------------------------- accessors for QA
  get renderSystem(): RenderSystem {
    return this.render;
  }

  get spaceScene(): SpaceScene {
    return this.space;
  }

  get interiorScene(): CorridorScene {
    return this.interior;
  }

  get cameraDirector(): CameraDirector {
    return this.director;
  }

  get uiRoot(): UIRoot {
    return this.ui;
  }

  get activeCamera(): THREE.PerspectiveCamera {
    return this.mode === 'explore' ? this.explore.camera : this.director.camera;
  }

  get exploreControls(): ExploreControls {
    return this.explore;
  }

  get objectPicker(): Picker {
    return this.picker;
  }

  get audioEngine(): AudioEngine | null {
    return this.audio;
  }

  get narrationPlayer(): NarrationPlayer | null {
    return this.narration;
  }

  get currentQuality(): QualityLevel {
    return this.quality;
  }

  get viewMode(): ViewMode {
    return this.mode;
  }

  get sceneIsInterior(): boolean {
    return this.interiorActive;
  }

  get beat(): string {
    return this.currentBeat;
  }

  /** Render one deterministic frame at `time` - the QA tour's only entry point. */
  renderAt(time: number): void {
    this.timeline.pause();
    this.timeline.seek(time);
    this.director.resetSmoothing();
    this.sound?.reset(time);
    this.evaluate(time, 1 / 60, false, true);
    this.render.render(time, 16.7);
    this.ui.setTime(time, this.timeline.duration);
    this.ui.subtitles.update(time);
    this.ui.setChapter(this.timeline.chapter);
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    this.running = false;
    this.resizeObserver?.disconnect();
    this.sound?.sfx.stopAll();
    this.audio?.dispose();
    this.registry.dispose();
    this.render.dispose();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function formatVec(v: THREE.Vector3): string {
  const scale = Math.abs(v.x) > 9999 || Math.abs(v.y) > 9999 || Math.abs(v.z) > 9999;
  const f = (n: number): string => (scale ? `${(n / 1000).toFixed(1)}k` : n.toFixed(1));
  return `${f(v.x)}, ${f(v.y)}, ${f(v.z)}`;
}

/** Human-readable narrative beat for the debug overlay and QA logs. */
function describeBeat(t: number): string {
  const beats: Array<[number, string]> = [
    [0, 'darkness'],
    [4, 'prologue text recedes'],
    [46, 'planet establishing drift'],
    [65, 'corvette spotted ahead'],
    [86, 'corvette at full burn'],
    [99, 'shadow rising astern'],
    [112, 'destroyer bow crosses frame'],
    [119, 'belly fills the sky'],
    [131, 'turbolaser exchange'],
    [143, 'shields failing'],
    [150.6, 'drives knocked out'],
    [158, 'held in the beam'],
    [176, 'clamps engage'],
    [184, 'umbilical extends'],
    [196, 'corridor: alarms'],
    [203, 'defenders take position'],
    [206, 'cutting charge burns'],
    [218.6, 'door breach'],
    [221, 'boarding action'],
    [233, 'defence collapses'],
    [240, 'silence'],
    [243, 'the dark lord enters'],
    [262, 'the princess moves aft'],
    [272, 'archive console'],
    [280, 'plans projected'],
    [288, 'transfer to the droid'],
    [300, 'boarders closing'],
    [306, 'droids run for the bay'],
    [313, 'the protocol droid balks'],
    [319, 'pod boarded'],
    [320.2, 'pod launch'],
    [328, 'falling away'],
    [344, 'atmospheric entry'],
    [352, 'a bright point'],
    [366, 'the Empire keeps the ship'],
  ];
  let label = beats[0][1];
  for (const [time, name] of beats) {
    if (t >= time) label = name;
    else break;
  }
  return label;
}

export { chapterAt };
