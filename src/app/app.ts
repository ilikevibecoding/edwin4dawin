/**
 * Application.
 *
 * Owns the render loop and wires every subsystem together: renderer, world,
 * timeline, camera director, audio, narration, interface, explore mode and the
 * QA hooks.
 *
 * Loop order matters. Each frame we advance the timeline (which applies all
 * continuous state as a pure function of show time), then let the camera
 * director frame it, then update anything that depends on the final camera
 * pose (billboards, spatial audio, particles), then render.
 */

import * as THREE from 'three';
import { Stage } from '../core/renderer';
import { qualityFor, StartupBenchmark, type QualityLevel, type QualitySettings } from '../core/quality';
import { World } from '../show/world';
import { CameraDirector } from '../show/camera-director';
import { Timeline } from '../show/timeline';
import { buildShow, CHAPTER_PLAN, SHOW_DURATION, setWorldCamera } from '../show/staging';
import { Prologue, EpilogueCard } from '../show/prologue';
import { AudioEngine } from '../audio/engine';
import { MusicDirector } from '../audio/music';
import { SfxLibrary } from '../audio/sfx';
import { Narrator, type NarrationScript } from '../audio/narrator';
import { Interface } from '../ui/interface';
import { ExploreMode } from '../explore/explore';
import { runSanityChecks, checkGeometryIntegrity, type Issue } from '../qa/sanity';
import { CHECKPOINTS, type CheckpointContext } from '../qa/checkpoints';
import type { Selectable } from '../show/world';
import script from '../../narration/script.json';

const STORAGE_KEY = 'a-stolen-secret/prefs/v1';

interface Prefs {
  quality: QualityLevel;
  master: number;
  music: number;
  sfx: number;
  narration: number;
  subtitles: boolean;
  grain: boolean;
  depthCue: boolean;
}

const DEFAULT_PREFS: Prefs = {
  quality: 'medium',
  master: 0.85,
  music: 0.62,
  sfx: 0.78,
  narration: 1,
  subtitles: true,
  grain: true,
  depthCue: true,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* private browsing; preferences simply do not persist */
  }
}

export class App {
  private stage: Stage;
  private world: World;
  private director: CameraDirector;
  private timeline: Timeline;
  private audio = new AudioEngine();
  private music: MusicDirector;
  private sfx: SfxLibrary;
  private narrator: Narrator;
  private ui: Interface;
  private explore: ExploreMode;
  private prologue: Prologue;
  private epilogue: EpilogueCard;
  private runtime: { resetAudio(): void; dispose(): void };

  private quality: QualitySettings;
  private prefs: Prefs;
  private clock = new THREE.Clock();
  private frameId = 0;
  private running = false;
  private started = false;
  private mode: 'cinematic' | 'explore' = 'cinematic';

  private fps = 60;
  private frameAccum = 0;
  private frameCount = 0;
  private lastFrameEnd = performance.now();
  private worstFrameMs = 0;
  private webglErrors = 0;
  private issues: Issue[] = [];
  private benchmark = new StartupBenchmark();
  private benchmarking = false;

  constructor(canvas: HTMLCanvasElement) {
    this.prefs = loadPrefs();
    this.quality = qualityFor(this.prefs.quality);

    this.stage = new Stage({ canvas, quality: this.quality });
    this.stage.resize(window.innerWidth, window.innerHeight);
    setWorldCamera(this.stage.camera);

    this.world = new World(this.stage.scene, this.stage.sky, this.quality);
    this.world.attachEnvironment(this.stage.renderer);
    this.world.setPixelRatio(this.stage.pixelRatio);
    this.world.setViewportHeight(window.innerHeight);

    this.director = new CameraDirector(this.world);
    this.timeline = new Timeline();
    this.music = new MusicDirector(this.audio);
    this.sfx = new SfxLibrary(this.audio);
    this.narrator = new Narrator(this.audio, script as unknown as NarrationScript);

    this.prologue = new Prologue(
      this.narrator.prologueCards,
      [
        [3.4, 8.2],
        [8.6, 16.4],
        [16.8, 26.8],
        [27.2, 33.4],
      ],
      this.quality.level === 'low' ? 1 : 2,
    );
    this.stage.scene.add(this.prologue.group);
    this.epilogue = new EpilogueCard(this.narrator.epilogueCard, this.quality.level === 'low' ? 1 : 2);
    this.stage.scene.add(this.epilogue.group);

    this.runtime = buildShow({
      world: this.world,
      director: this.director,
      timeline: this.timeline,
      audio: this.audio,
      sfx: this.sfx,
      music: this.music,
      narrator: this.narrator,
      stage: this.stage,
      prologue: this.prologue,
      epilogue: this.epilogue,
    });

    this.ui = new Interface({
      onPlayToggle: () => this.togglePlay(),
      onRestart: () => this.restart(),
      onSeek: (t) => this.seek(t),
      onChapter: (i) => this.seekChapter(i),
      onMode: (m) => this.setMode(m),
      onVolume: (bus, v) => this.setVolume(bus, v),
      onSubtitles: (on) => {
        this.prefs.subtitles = on;
        savePrefs(this.prefs);
        if (!on) this.ui.hideSubtitle();
      },
      onQuality: (level) => this.setQuality(level),
      onDebug: (on) => {
        this.debugOn = on;
      },
      onGrain: (on) => {
        this.prefs.grain = on;
        savePrefs(this.prefs);
        this.stage.setGrain(on);
      },
      onDepthCue: (on) => {
        this.prefs.depthCue = on;
        savePrefs(this.prefs);
      },
      onExploreAction: (a) => {
        if (a === 'return') {
          this.setMode('cinematic');
        } else {
          this.explore.act(a);
        }
      },
      onFullscreen: () => this.toggleFullscreen(),
      onEnter: () => void this.enter(),
    });

    this.explore = new ExploreMode(this.stage.camera, this.world, canvas, {
      onHover: (s, x, y) => this.ui.showHoverLabel(s ? s.title : null, x, y),
      onSelect: (s) => this.onSelect(s),
    });

    this.timeline.onSeek = () => this.onTimelineSeek();
    this.timeline.onChapterChange = (c) => this.ui.setChapter(c);
    this.timeline.onEnd = () => {
      this.ui.setPlaying(false);
      // Hand the viewer the controls once the piece is over.
      this.setMode('explore');
    };

    this.ui.setChapters(this.timeline.chapters, this.timeline.duration);
    this.ui.setQuality(this.prefs.quality);
    this.ui.setVolumes(this.prefs);
    this.ui.setSubtitles(this.prefs.subtitles);
    this.stage.setGrain(this.prefs.grain);

    this.bindGlobalEvents();
    this.installDebugApi();

    // Verify the freshly-built graph before the viewer ever sees it.
    const geometryIssues = [
      ...checkGeometryIntegrity(this.world.exterior),
      ...checkGeometryIntegrity(this.world.interior),
    ];
    if (geometryIssues.length) {
      console.warn('[qa] geometry issues at build time:', geometryIssues);
    }
  }

  private debugOn = false;
  private lastSelectable: Selectable | null = null;

  /* ------------------------------------------------------------- start */

  /** Decode narration, run the GPU probe, then unlock the gate. */
  async prepare(): Promise<void> {
    this.ui.setLoadProgress(0.05, 'Building the galaxy…');
    // The audio graph is created (but left suspended) up front so narration
    // can be decoded during loading rather than after the gate opens.
    this.audio.prepare();
    // Render a few frames so shaders compile before we time anything.
    this.timeline.seek(0);
    for (let i = 0; i < 3; i++) {
      this.renderOnce(0.016);
      await nextFrame();
    }

    this.ui.setLoadProgress(0.2, 'Warming shaders…');
    // Warm the two heaviest configurations: exterior battle and interior.
    for (const t of [112, 126, 210, 246, 300]) {
      this.timeline.seek(t);
      this.renderOnce(0.016);
      await nextFrame();
    }
    this.timeline.seek(0);

    this.ui.setLoadProgress(0.45, 'Measuring performance…');
    this.benchmark.begin();
    this.benchmarking = true;
    for (let i = 0; i < 22; i++) {
      this.timeline.seek(104 + i * 0.4);
      this.renderOnce(0.016);
      this.benchmark.sample();
      await nextFrame();
    }
    this.benchmarking = false;
    const suggestion = this.benchmark.suggest();
    this.timeline.seek(0);

    this.ui.setLoadProgress(0.6, 'Decoding narration…');
    await this.narrator.load((f, label) => this.ui.setLoadProgress(0.6 + f * 0.36, label));

    this.ui.setLoadProgress(1, 'Ready');
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.setQuality(suggestion.level, false);
      this.ui.setQuality(suggestion.level);
    }
    this.ui.enableEnter(
      `Suggested quality: ${suggestion.level} — ${suggestion.reason}`,
    );
    // Keep rendering the first frame behind the gate.
    this.running = true;
    this.loop();
  }

  /** Called from the gate button, i.e. inside a user gesture. */
  async enter(): Promise<void> {
    if (this.started) return;
    this.started = true;
    const audioOk = await this.audio.start();
    if (audioOk) {
      this.audio.setLevel('master', this.prefs.master);
      this.audio.setLevel('music', this.prefs.music);
      this.audio.setLevel('sfx', this.prefs.sfx);
      this.audio.setLevel('narration', this.prefs.narration);
    } else {
      console.warn('[audio] the browser refused to start an AudioContext; running silent.');
    }
    this.ui.hideGate();
    this.timeline.seek(0);
    this.timeline.play();
    this.ui.setPlaying(true);
  }

  /* -------------------------------------------------------- transport */

  private togglePlay(): void {
    this.timeline.toggle();
    this.ui.setPlaying(this.timeline.playing);
    if (!this.timeline.playing) {
      this.narrator.stop();
      this.music.duck(0.35);
    } else {
      this.music.duck(0);
    }
  }

  private restart(): void {
    this.setMode('cinematic');
    this.timeline.seek(0);
    this.timeline.play();
    this.ui.setPlaying(true);
  }

  private seek(t: number): void {
    this.timeline.seek(t);
    this.ui.setTime(this.timeline.time);
  }

  private seekChapter(i: number): void {
    this.timeline.seekChapter(i);
    this.ui.setTime(this.timeline.time);
  }

  /** Everything that must not survive a jump in time. */
  private onTimelineSeek(): void {
    this.runtime.resetAudio();
    this.world.clearTransients();
    this.director.reset();
    this.narrator.stop();
    this.ui.hideSubtitle();
    // Re-establish the music cue for the new position without a crossfade pile-up.
    this.music.setCue('silence', 0.25);
  }

  private setMode(mode: 'cinematic' | 'explore'): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.ui.setMode(mode);
    if (mode === 'explore') {
      this.explore.enter();
    } else {
      this.explore.exit();
      this.ui.showHoverLabel(null, 0, 0);
      this.ui.showInspector(null);
    }
  }

  private onSelect(s: Selectable | null): void {
    this.lastSelectable = s;
    this.explore.setSelection(s);
    this.ui.showInspector(s);
  }

  private setVolume(bus: 'master' | 'narration' | 'music' | 'sfx', v: number): void {
    this.audio.setLevel(bus, v);
    this.prefs[bus] = v;
    savePrefs(this.prefs);
  }

  private setQuality(level: QualityLevel, persist = true): void {
    if (this.quality.level === level) return;
    this.quality = qualityFor(level);
    this.stage.setQuality(this.quality);
    this.world.setPixelRatio(this.stage.pixelRatio);
    this.world.setViewportHeight(window.innerHeight);
    // Particle budgets and greeble counts are baked at construction; the tier
    // change takes full effect on reload, and the renderer-side settings
    // (pixel ratio, shadows, bloom, grain) apply immediately.
    this.prefs.quality = level;
    if (persist) savePrefs(this.prefs);
  }

  private toggleFullscreen(): void {
    const el = document.documentElement;
    if (!document.fullscreenElement) void el.requestFullscreen?.().catch(() => undefined);
    else void document.exitFullscreen?.().catch(() => undefined);
  }

  /* ----------------------------------------------------------- events */

  private bindGlobalEvents(): void {
    window.addEventListener('resize', () => {
      this.stage.resize(window.innerWidth, window.innerHeight);
      this.world.setPixelRatio(this.stage.pixelRatio);
      this.world.setViewportHeight(window.innerHeight);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.audio.suspendForHiddenTab();
      } else {
        this.audio.resumeAfterHiddenTab();
        // Do not let a long background stall become one giant frame delta.
        this.clock.getDelta();
      }
    });

    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|select|textarea/i.test(target.tagName)) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          this.seek(this.timeline.time - 5);
          break;
        case 'ArrowRight':
          this.seek(this.timeline.time + 5);
          break;
        case 'Comma': {
          // Like a track-skip button: restart this chapter unless we only just
          // entered it, in which case step back one.
          const cur = this.timeline.chapterAt(this.timeline.time);
          const into = this.timeline.time - cur.start;
          this.seekChapter(into > 2.5 ? cur.index : cur.index - 1);
          break;
        }
        case 'Period':
          this.seekChapter(this.timeline.chapterAt(this.timeline.time).index + 1);
          break;
        case 'Backspace':
          this.restart();
          break;
        case 'KeyC':
          this.ui.setSubtitles(!this.ui.subtitlesEnabled, true);
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'KeyH':
          this.ui.toggleHelp();
          break;
        case 'KeyG':
          this.debugOn = !this.debugOn;
          this.ui.setDebugVisible(this.debugOn);
          break;
        case 'KeyU':
          this.ui.toggleUi();
          break;
        case 'Tab':
          e.preventDefault();
          this.setMode(this.mode === 'cinematic' ? 'explore' : 'cinematic');
          break;
        case 'Escape':
          this.ui.showInspector(null);
          this.ui.toggleHelp(false);
          break;
        default:
          if (/^Digit[1-8]$/.test(e.code)) this.seekChapter(Number(e.code.slice(5)) - 1);
      }
    });
  }

  /* ------------------------------------------------------------- loop */

  private loop = (): void => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.loop);
    // Suspend the expensive work entirely while the tab is hidden.
    if (document.hidden) return;
    const dt = Math.min(0.1, this.clock.getDelta());
    this.frame(dt);
  };

  private frame(dt: number): void {
    const frameStart = performance.now();

    const t = this.timeline.update(dt);

    if (this.mode === 'explore') {
      this.explore.update(dt);
      // Keep the shot's clip range so the explorer never hits the far plane.
      const shot = this.director.shotAt(t);
      if (shot) this.stage.setClipRange(shot.near, shot.far);
    } else {
      this.director.update(t, dt, this.stage.camera);
    }

    // The world is a pure function of show time, so a paused timeline must
    // freeze it completely: otherwise smoke, sparks and bolts drain away while
    // the viewer is looking at a still frame.
    this.world.update(this.timeline.playing ? dt : 0, t, this.stage.camera);
    this.music.update();
    this.updateAudioListener();
    this.updateSubtitles(t);

    this.stage.render(t);

    if (!this.benchmarking) {
      const now = performance.now();
      this.worstFrameMs = Math.max(this.worstFrameMs * 0.995, now - frameStart);
      // Measured against the wall clock, not against the show delta: the loop
      // clamps its delta so a slow machine plays in slow motion rather than
      // skipping, and accumulating the clamped value would report a healthy
      // frame rate on hardware that is nowhere near keeping up.
      this.frameAccum += (now - this.lastFrameEnd) / 1000;
      this.lastFrameEnd = now;
      this.frameCount++;
      if (this.frameAccum >= 0.5) {
        this.fps = this.frameCount / this.frameAccum;
        this.frameAccum = 0;
        this.frameCount = 0;
      }
      this.ui.setTime(t);
      const beat = this.timeline.beatAt(t);
      this.ui.setBeat(beat ? beat.label : '');
      if (this.debugOn) this.updateDebug(t);
    }
  }

  /** One synchronous frame, used during loading and by the QA harness. */
  renderOnce(dt = 0.016): void {
    const t = this.timeline.time;
    this.director.update(t, dt, this.stage.camera);
    this.world.update(this.timeline.playing ? dt : 0, t, this.stage.camera);
    this.stage.render(t);
  }

  /**
   * Advance the show by `seconds` in fixed steps without rendering.
   *
   * The QA tour uses this to run a moment of the piece before capturing it, so
   * screenshots contain bolts, sparks and smoke rather than the empty scene a
   * bare seek produces. Because the step is fixed, the result is identical on
   * every machine.
   */
  simulate(seconds: number, step = 1 / 30): void {
    const wasPlaying = this.timeline.playing;
    if (!wasPlaying) this.timeline.play();
    const steps = Math.min(1200, Math.max(1, Math.round(seconds / step)));
    for (let i = 0; i < steps; i++) {
      const t = this.timeline.update(step);
      this.director.update(t, step, this.stage.camera);
      this.world.update(step, t, this.stage.camera);
    }
    if (!wasPlaying) {
      this.timeline.pause();
      this.ui.setPlaying(false);
    }
  }

  private updateAudioListener(): void {
    if (!this.audio.ready) return;
    const cam = this.stage.camera;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const u = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    this.audio.updateListener(cam.position.x, cam.position.y, cam.position.z, f.x, f.y, f.z, u.x, u.y, u.z);
  }

  private updateSubtitles(t: number): void {
    const cue = this.narrator.cueAt(t);
    if (cue) {
      this.ui.showSubtitle(cue.id, cue.speaker, cue.text);
      this.music.duck(0.55);
    } else {
      this.ui.hideSubtitle();
      this.music.duck(this.timeline.playing ? 0 : 0.35);
    }
  }

  /* ------------------------------------------------------ diagnostics */

  private updateDebug(t: number): void {
    const shot = this.director.current;
    const chapter = this.timeline.chapterAt(t);
    const beat = this.timeline.beatAt(t);
    this.issues = runSanityChecks({
      world: this.world,
      camera: this.stage.camera,
      cameraRegion: this.mode === 'explore' ? this.world.currentRegion : shot?.region,
      time: t,
      fps: this.fps,
      audioPeak: this.audio.peakLevel(),
      missingNarration: this.narrator.missingClips(),
      webglErrors: this.webglErrors,
    });
    const errors = this.issues.filter((i) => i.severity === 'error');
    const warns = this.issues.filter((i) => i.severity === 'warn');
    const p = this.stage.camera.position;
    const lines = [
      `chapter   ${chapter.index + 1}. ${chapter.title}`,
      `beat      ${beat?.label ?? '—'}`,
      `time      ${t.toFixed(2)} / ${this.timeline.duration.toFixed(0)}s`,
      `shot      ${shot?.id ?? '—'}`,
      `           ${shot?.name ?? ''}`,
      `region    ${this.world.currentRegion}`,
      `mode      ${this.mode}`,
      `camera    ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
      `fov/clip  ${this.stage.camera.fov.toFixed(1)}° · ${this.stage.camera.near} – ${this.stage.camera.far}`,
      `fps       ${this.fps.toFixed(1)}  (worst ${this.worstFrameMs.toFixed(1)} ms)`,
      `draws     ${this.stage.drawCalls}  tris ${this.stage.triangles.toLocaleString()}`,
      `dpr       ${this.stage.pixelRatio.toFixed(2)}  quality ${this.quality.level}`,
      `audio     ${this.audio.ready ? 'running' : 'idle'}  peak ${this.audio.peakLevel().toFixed(2)}`,
      `music     ${this.music.currentCue}`,
      `narration ${this.narrator.currentId ?? '—'}${this.narrator.usingFallback ? ' (fallback)' : ''}`,
      `events    ${this.timeline.firedCount()} / ${this.timeline.eventCount}`,
      `bolts     ${this.world.exteriorBolts.activeCount + this.world.interiorBolts.activeCount}`,
      `trauma    ${this.director.traumaLevel.toFixed(2)}`,
      '',
      errors.length
        ? `<span class="bad">${errors.length} error(s)</span>\n` + errors.map((i) => `  ${i.code}: ${i.detail}`).join('\n')
        : '<span>no errors</span>',
      warns.length ? `<span class="warn">${warns.length} warning(s)</span>\n` + warns.map((i) => `  ${i.code}: ${i.detail}`).join('\n') : '',
    ];
    this.ui.setDebug(lines.filter(Boolean).join('\n'));
  }

  /* --------------------------------------------------------- QA hooks */

  private installDebugApi(): void {
    // Framing tests use a subject's bounding-box centre, not its transform
    // origin. A character's origin is between its feet, so a low shot looking
    // up at someone perfectly framed would still fail an origin-based test.
    const subjectCentre = (s: Selectable) => {
      const p = new THREE.Vector3();
      const box = new THREE.Box3().setFromObject(s.object);
      if (box.isEmpty()) s.object.getWorldPosition(p);
      else box.getCenter(p);
      return p;
    };

    const project = (id: string) => {
      const s = this.world.selectables.find((x) => x.id === id);
      if (!s) return null;
      const p = subjectCentre(s);
      const v = p.clone().project(this.stage.camera);
      return { x: v.x, y: v.y, z: v.z, world: p };
    };

    const context = (): CheckpointContext => ({
      world: this.world,
      director: this.director,
      timeline: this.timeline,
      onScreen: (id, margin = 0.1) => {
        const v = project(id);
        if (!v) return false;
        const lim = 1 - margin;
        return v.z > -1 && v.z < 1 && Math.abs(v.x) < lim && Math.abs(v.y) < lim;
      },
      screenSize: (id) => {
        const s = this.world.selectables.find((x) => x.id === id);
        if (!s) return 0;
        const p = subjectCentre(s);
        const d = p.distanceTo(this.stage.camera.position);
        if (d <= 0.0001) return 10;
        const frustumHeight = 2 * Math.tan((this.stage.camera.fov * Math.PI) / 360) * d;
        return (s.radius * 2) / frustumHeight;
      },
      visible: (id) => {
        const s = this.world.selectables.find((x) => x.id === id);
        if (!s) return false;
        let node: THREE.Object3D | null = s.object;
        while (node) {
          if (!node.visible) return false;
          node = node.parent;
        }
        return true;
      },
    });

    const api = {
      version: 1,
      duration: SHOW_DURATION,
      chapters: CHAPTER_PLAN.map((c) => ({ ...c })),
      checkpoints: CHECKPOINTS.map((c) => ({
        id: c.id, t: c.t, chapter: c.chapter, shot: c.shot, expect: c.expect, file: c.file, preroll: c.preroll ?? 0,
      })),
      shots: () => this.director.all.map((s) => ({ id: s.id, name: s.name, start: s.start, end: s.end, region: s.region })),
      seek: (t: number) => {
        this.timeline.pause();
        this.timeline.seek(t);
        this.ui.setPlaying(false);
      },
      play: () => {
        this.timeline.play();
        this.ui.setPlaying(true);
      },
      pause: () => {
        this.timeline.pause();
        this.ui.setPlaying(false);
      },
      setMode: (m: 'cinematic' | 'explore') => this.setMode(m),
      setQuality: (q: QualityLevel) => {
        this.setQuality(q);
        this.ui.setQuality(q);
      },
      state: () => ({
        time: this.timeline.time,
        playing: this.timeline.playing,
        chapter: this.timeline.chapterAt(this.timeline.time).id,
        shot: this.director.current?.id ?? null,
        shotName: this.director.current?.name ?? null,
        region: this.world.currentRegion,
        mode: this.mode,
        fps: this.fps,
        worstFrameMs: this.worstFrameMs,
        drawCalls: this.stage.drawCalls,
        triangles: this.stage.triangles,
        camera: this.stage.camera.position.toArray(),
        audioReady: this.audio.ready,
        audioPeak: this.audio.peakLevel(),
        missingNarration: this.narrator.missingClips(),
        narrationFallback: this.narrator.usingFallback,
        events: `${this.timeline.firedCount()}/${this.timeline.eventCount}`,
        bolts: this.world.exteriorBolts.activeCount + this.world.interiorBolts.activeCount,
        duplicateEventIds: this.timeline.duplicateEventIds(),
        selection: this.lastSelectable?.id ?? null,
      }),
      sanity: () =>
        runSanityChecks({
          world: this.world,
          camera: this.stage.camera,
          cameraRegion:
            this.mode === 'explore' ? this.world.currentRegion : this.director.current?.region,
          time: this.timeline.time,
          fps: this.fps,
          audioPeak: this.audio.peakLevel(),
          missingNarration: this.narrator.missingClips(),
          webglErrors: this.webglErrors,
        }),
      checkpointAssert: (id: string) => {
        const cp = CHECKPOINTS.find((c) => c.id === id);
        if (!cp) return [`unknown checkpoint ${id}`];
        return cp.assert(context());
      },
      coverageGaps: () => this.director.coverageGaps(0, SHOW_DURATION),
      screenSize: (id: string) => context().screenSize(id),
      onScreen: (id: string, m?: number) => context().onScreen(id, m),
      select: (id: string) => {
        const s = this.world.selectables.find((x) => x.id === id) ?? null;
        this.onSelect(s);
        return !!s;
      },
      setDebug: (on: boolean) => {
        this.debugOn = on;
        this.ui.setDebugVisible(on);
      },
      resetWorstFrame: () => {
        this.worstFrameMs = 0;
      },
      /** Run `seconds` of show time in fixed steps, then hold. */
      simulate: (seconds: number, step?: number) => this.simulate(seconds, step),
      /** Live object graph, for ad-hoc inspection from the QA harness. */
      internals: () => ({ world: this.world, timeline: this.timeline, director: this.director, stage: this.stage }),
    };
    (window as unknown as Record<string, unknown>).__show = api;
    (window as unknown as Record<string, unknown>).__ready = true;
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.runtime.dispose();
    this.explore.dispose();
    this.prologue.dispose();
    this.epilogue.dispose();
    this.world.dispose();
    this.stage.dispose();
    void this.audio.dispose();
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
