/**
 * Game controller: menu, chapter lifecycle, input routing, autoplay demo and
 * the between-chapter flowchart. Chapter state (flags, stats, instability)
 * carries forward so the epilogue can read the whole playthrough.
 */
import type { Engine } from '../app/engine';
import { UI } from './ui';
import { Director, type GameState } from './director';
import { CHAPTERS } from './story';
import type { Chapter } from './script';
import { buildRooftop } from '../sets/rooftop';
import { buildApartment } from '../sets/apartment';
import { buildInterrogation } from '../sets/interrogation';
import { buildStreet } from '../sets/street';
import type { GameSet } from '../sets/types';
import { audio } from '../engine/audio';
import { QUALITY_ORDER, type QualityName } from '../engine/quality';

const SET_BUILDERS = {
  rooftop: buildRooftop,
  apartment: buildApartment,
  interrogation: buildInterrogation,
  street: buildStreet,
};

export class Game {
  private engine: Engine;
  private params: URLSearchParams;
  private ui = new UI();
  private set: GameSet | null = null;
  private director: Director | null = null;
  private chapterIndex = 0;
  private state: GameState = { flags: new Set(), stats: {}, nodes: new Set(), instability: 0.08 };
  private pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private demo = false;
  private menuVisible = true;
  private awaitingFlow = false;
  private held = new Set<string>();
  private started = false;

  constructor(engine: Engine, params: URLSearchParams) {
    this.engine = engine;
    this.params = params;
  }

  async boot(): Promise<void> {
    this.bindInput();
    this.bindMenu();
    const loader = document.getElementById('loader')!;
    const fill = document.getElementById('loader-fill')!;
    const txt = document.getElementById('loader-txt')!;

    // Warm the procedural texture cache so the first chapter does not hitch.
    txt.textContent = 'GENERATING MATERIALS';
    fill.style.width = '35%';
    await frame();
    const { asphalt, concrete, brick, stoneTile, metal, wood } = await import('../engine/textures');
    asphalt(512); concrete(512); brick(512); stoneTile(512); metal(512); wood(512);
    fill.style.width = '70%';
    txt.textContent = 'COMPILING SHADERS';
    await frame();

    const qLabel = document.getElementById('q-label');
    if (qLabel) qLabel.textContent = this.engine.quality.label;

    fill.style.width = '100%';
    await frame();
    loader.classList.add('gone');

    const chapterParam = this.params.get('chapter');
    const autoDemo = this.params.get('demo') === '1';
    if (chapterParam || autoDemo) {
      const idx = chapterParam ? Math.max(0, CHAPTERS.findIndex((c) => c.id === chapterParam)) : 0;
      this.demo = autoDemo;
      this.hideMenu();
      await this.startChapter(idx === -1 ? 0 : idx);
    } else {
      // Menu backdrop: the street set, playing under the logo.
      await this.showMenuScene();
    }
    this.engine.onFrame = (dt) => this.tick(dt);
    this.engine.start();
    this.started = true;
  }

  /* ---------------------------------------------------------------- menu */

  private async showMenuScene(): Promise<void> {
    const set = buildStreet({ renderer: this.engine.renderer, quality: this.engine.quality });
    this.set = set;
    set.camera.position.set(-6.5, 2.2, 16);
    set.camera.lookAt(0, 2.2, -6);
    this.engine.setSet({
      name: 'menu',
      scene: set.scene,
      camera: set.camera,
      update: (dt, time) => {
        set.update(dt, time);
        // Slow drift so the menu is alive.
        const t = time * 0.06;
        set.camera.position.set(-6.5 + Math.sin(t) * 2.2, 2.2 + Math.sin(t * 0.7) * 0.35, 16 + Math.cos(t) * 1.6);
        set.camera.lookAt(0, 2.0, -6);
        this.engine.fx.focusTarget = 22;
        this.engine.fx.aperture = 0.9;
      },
      prerender: (r, cam) => set.prerender?.(r, cam),
      applyLook: (fx) => set.applyLook(fx),
      dispose: () => set.dispose(),
    });
    this.ui.setLetterbox(false);
    this.ui.showHud(false);
    this.menuVisible = true;
    document.getElementById('menu')?.classList.remove('hidden');
  }

  private bindMenu(): void {
    const menu = document.getElementById('menu')!;
    menu.querySelectorAll<HTMLElement>('.mi').forEach((el) => {
      el.addEventListener('click', async () => {
        await audio.start();
        const act = el.dataset.act;
        audio.uiSelect();
        if (act === 'play') {
          this.demo = false;
          this.hideMenu();
          await this.startChapter(0);
        } else if (act === 'demo') {
          this.demo = true;
          this.hideMenu();
          await this.startChapter(0);
        } else if (act === 'chapters') {
          this.showChapterList();
        } else if (act === 'quality') {
          this.cycleQuality();
        }
      });
      el.addEventListener('mouseenter', () => audio.uiMove());
    });
  }

  private showChapterList(): void {
    const list = document.getElementById('chapter-list')!;
    list.innerHTML = '';
    CHAPTERS.forEach((c, i) => {
      const el = document.createElement('button');
      el.className = 'ci';
      el.innerHTML = `<b>${c.kicker} — ${c.title}</b><span>${c.sub} · ~${c.minutes ?? 2} MIN</span>`;
      el.addEventListener('click', async () => {
        await audio.start();
        audio.uiSelect();
        list.classList.add('hidden');
        this.demo = false;
        this.hideMenu();
        await this.startChapter(i);
      });
      list.appendChild(el);
    });
    const back = document.createElement('button');
    back.className = 'ci';
    back.innerHTML = '<b>BACK</b><span>RETURN TO MENU</span>';
    back.addEventListener('click', () => {
      audio.uiBack();
      list.classList.add('hidden');
    });
    list.appendChild(back);
    list.classList.remove('hidden');
  }

  private cycleQuality(): void {
    const i = QUALITY_ORDER.indexOf(this.engine.qualityName);
    const next = QUALITY_ORDER[(i + 1) % QUALITY_ORDER.length] as QualityName;
    const label = document.getElementById('q-label');
    this.engine.setQuality(next, () => {
      if (label) label.textContent = this.engine.quality.label;
    });
    if (label) label.textContent = this.engine.quality.label;
  }

  private hideMenu(): void {
    document.getElementById('menu')?.classList.add('hidden');
    document.getElementById('chapter-list')?.classList.add('hidden');
    this.menuVisible = false;
    document.body.classList.add('playing');
  }

  /* ------------------------------------------------------------- chapters */

  private async startChapter(index: number): Promise<void> {
    this.chapterIndex = index;
    const chapter = CHAPTERS[index];
    await audio.start();
    this.teardown();

    const loader = document.getElementById('loader')!;
    const txt = document.getElementById('loader-txt')!;
    txt.textContent = `LOADING — ${chapter.title}`;
    loader.classList.remove('gone');
    await frame();
    await frame();

    const set = SET_BUILDERS[chapter.set]({ renderer: this.engine.renderer, quality: this.engine.quality });
    this.set = set;
    this.engine.setSet({
      name: chapter.id,
      scene: set.scene,
      camera: set.camera,
      update: (dt, time) => {
        set.update(dt, time);
        this.director?.update(dt);
      },
      prerender: (r, cam) => set.prerender?.(r, cam),
      applyLook: (fx) => set.applyLook(fx),
      dispose: () => set.dispose(),
    });

    // Lightning drives an exposure flash for free.
    if (set.lightning) {
      set.lightning.onFlash = (v) => {
        this.engine.fx.flash = v * 0.5;
      };
    }

    this.director = new Director(chapter, set, this.ui, this.engine.fx, {
      onChapterEnd: (outcome, state) => this.onChapterEnd(chapter, outcome, state),
      onNeedInput: (kind) => {
        document.body.classList.toggle('pointer', kind === 'scan' || kind === 'choice');
      },
    }, { demo: this.demo, state: this.state });
    this.director.spawnCast(this.engine.quality.characterSegments);
    this.ui.setInstability(this.state.instability);
    this.ui.showHud(false);
    if (chapter.objective) this.ui.setObjective(chapter.objective);

    // Optional seek: fast-forward the story to a timestamp without rendering,
    // which makes any beat cheap to screenshot or start filming from.
    const seek = Number(this.params.get('seek') ?? 0);
    const roam = this.params.get('roam') === '1';
    if ((seek > 0 || roam) && this.director) {
      this.ui.instant = true;
      this.director.fastForward = true;
      this.director.haltOnExplore = roam;
      this.director.setDemo(true);
      // Warmed in slices so a roam phase can interrupt the seek.
      const budget = seek > 0 ? seek : 600;
      const slice = 2;
      for (let t = 0; t < budget; t += slice) {
        this.engine.warm(Math.min(slice, budget - t), 1 / 30);
        if (this.director.seekHalted) break;
      }
      this.director.fastForward = false;
      this.director.haltOnExplore = false;
      this.ui.instant = false;
      this.director.setDemo(this.demo);
      // Re-enter the roam phase now that time is running normally.
      if (this.director.seekHalted) this.director.resumeExploreAfterSeek();
    }

    // Let the shaders compile against a couple of frames before revealing.
    this.engine.warm(0.6, 0.1);
    await frame();
    loader.classList.add('gone');
  }

  private onChapterEnd(chapter: Chapter, _outcome: string, state: GameState): void {
    this.state = state;
    this.ui.showHud(false);
    this.ui.clearSay();
    this.ui.setLetterbox(false);
    audio.stopMusic();
    const stats = [
      { label: 'CLUES FOUND', value: String(state.stats.clues ?? 0) },
      { label: 'INSTABILITY', value: `${Math.round(state.instability * 100)}%` },
      { label: 'PUBLIC OPINION', value: String(state.stats.opinion ?? 0) },
    ];
    const taken = new Set(state.nodes);
    taken.add('start');
    this.ui.showFlow(`${chapter.kicker} — ${chapter.title}`, chapter.flow, taken, stats);
    this.awaitingFlow = true;
    audio.chime();
    // Virtual-clock timer so autoplay advances identically in realtime play and
    // in frame-by-frame film capture.
    this.flowTimer = this.demo ? 6.5 : -1;
  }

  private async advanceFromFlow(): Promise<void> {
    if (!this.awaitingFlow) return;
    this.awaitingFlow = false;
    this.ui.hideFlow();
    this.ui.setFade(true, false, 0.4);
    const next = this.chapterIndex + 1;
    if (next < CHAPTERS.length) {
      await this.startChapter(next);
      this.ui.setFade(false, false, 1.2);
    } else {
      // Roll back to the menu after the epilogue.
      this.teardown();
      await this.showMenuScene();
      document.body.classList.remove('playing');
      this.ui.setFade(false, false, 1.4);
      this.state = { flags: new Set(), stats: {}, nodes: new Set(), instability: 0.08 };
    }
  }

  private teardown(): void {
    this.director?.dispose();
    this.director = null;
    if (this.set) {
      this.set.dispose();
      this.set = null;
    }
    audio.stopAmbience(0.4);
  }

  /* ---------------------------------------------------------------- input */

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') e.preventDefault();
      if (this.held.has(e.key)) return;
      this.held.add(e.key);

      if (this.awaitingFlow && (e.key === ' ' || e.key === 'Enter')) {
        void this.advanceFromFlow();
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        this.ui.showPerf(this.perfShown ? null : 'perf');
        this.perfShown = !this.perfShown;
        return;
      }
      if (e.key === 'Escape' && !this.menuVisible && !this.awaitingFlow) {
        this.teardown();
        void this.showMenuScene();
        document.body.classList.remove('playing');
        return;
      }
      this.director?.keyDown(e.key);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.key));
    window.addEventListener('mousemove', (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      // Mouse look while roaming: pointer lock when granted, drag otherwise.
      const p = this.director?.player;
      if (p?.enabled && !this.ui.scanning) {
        if (document.pointerLockElement || this.dragging) p.look(e.movementX, e.movementY);
      }
    });
    window.addEventListener('mousedown', () => {
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });
    window.addEventListener('wheel', (e) => {
      const p = this.director?.player;
      if (p?.enabled) p.zoom(e.deltaY);
    }, { passive: true });
    window.addEventListener('click', () => {
      void audio.start();
      if (this.awaitingFlow) {
        void this.advanceFromFlow();
        return;
      }
      // Grab the pointer for FPS-style look control during free roam.
      const p = this.director?.player;
      if (p?.enabled && !this.ui.scanning && !document.pointerLockElement) {
        const cv = document.getElementById('view');
        cv?.requestPointerLock?.();
      }
      this.director?.click();
    });
  }

  private perfShown = false;
  private dragging = false;
  private flowTimer = -1;

  /** Feed held keys into the player controller each frame. */
  private pumpMovement(): void {
    const p = this.director?.player;
    if (!p?.enabled) return;
    const down = (...keys: string[]): boolean => keys.some((k) => this.held.has(k));
    const forward = (down('w', 'W', 'ArrowUp') ? 1 : 0) - (down('s', 'S', 'ArrowDown') ? 1 : 0);
    const right = (down('d', 'D', 'ArrowRight') ? 1 : 0) - (down('a', 'A', 'ArrowLeft') ? 1 : 0);
    p.setInput({ forward, right, run: down('Shift', 'ShiftLeft', 'ShiftRight') });
  }

  private tick(dt: number): void {
    if (this.flowTimer > 0) {
      this.flowTimer -= dt;
      if (this.flowTimer <= 0) {
        this.flowTimer = -1;
        void this.advanceFromFlow();
      }
    }
    this.pumpMovement();
    if (this.director && this.set) {
      this.ui.updateScan(this.set.camera, this.pointer);
    }
    if (this.perfShown) {
      const info = this.engine.renderer.info.render;
      this.ui.showPerf(
        `${this.engine.fps.toFixed(0)} fps · ${this.engine.qualityName}\n` +
          `${info.calls} calls · ${(info.triangles / 1000).toFixed(0)}k tris`,
      );
    }
  }

  /** Used by the film capture harness. */
  get isPlaying(): boolean {
    return this.started && !this.menuVisible;
  }
}

function frame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}
