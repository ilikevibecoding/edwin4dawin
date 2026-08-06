/**
 * Game bootstrap: title menu, chapter sequencing, the branch flowchart between
 * chapters and the ending card. Also hosts the auto-demo, which plays the whole
 * story through with pre-selected choices.
 */
import { AudioEngine } from '../engine/Audio';
import type { Stage } from '../engine/Stage';
import { UIRoot } from '../ui/UIRoot';
import { Director } from './Director';
import { CHAPTERS, ENDINGS } from './Story';
import { newGameState, type GameState } from './StoryTypes';

/** Choices the auto-demo makes, picked to show the widest variety of content. */
export const DEMO_CHOICES: Record<string, string> = {
  ch1_method: 'empathy',
  ch2_first: 'intervene',
  ch3_flight: 'sprint',
  ch4_report: 'lie',
  ch5_final: 'defect',
};

export interface GameOptions {
  auto?: boolean;
  startChapter?: string;
  /** Stop after the first chapter played; used for per-chapter capture. */
  only?: boolean;
  pace?: number;
}

export class Game {
  private stage: Stage;
  private ui: UIRoot;
  private audio: AudioEngine;
  private state: GameState = newGameState();
  private director: Director | null = null;

  constructor(stage: Stage) {
    this.stage = stage;
    this.ui = new UIRoot();
    this.audio = new AudioEngine();
    // Web Audio needs a gesture before it will make noise
    const unlock = () => {
      void this.audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  get uiRoot() {
    return this.ui;
  }

  async run(opts: GameOptions = {}) {
    if (opts.auto) {
      await this.playThrough({ ...opts, auto: true });
      (window as unknown as { __DONE__?: boolean }).__DONE__ = true;
      return;
    }

    for (;;) {
      this.audio.setMusic('menu', 1.5);
      this.audio.setAmbience('rainStreet', 2);
      this.audio.setAmbienceIntensity(0.35);
      const result = await this.ui.menu.showTitle(
        CHAPTERS.map((c) => ({
          id: c.id,
          index: c.index,
          name: c.name,
          unlocked: this.state.unlocked.includes(c.id),
        })),
        { quality: this.stage.tier, voice: false, music: true }
      );
      this.ui.menu.hide();
      if (result.kind === 'settings') continue;
      if (result.kind === 'demo') {
        await this.playThrough({ auto: true, pace: 0.95 });
        continue;
      }
      await this.playThrough({ startChapter: result.kind === 'chapter' ? result.id : 'ch1', auto: false });
    }
  }

  private async playThrough(opts: GameOptions) {
    this.state = newGameState();
    const startIndex = Math.max(0, CHAPTERS.findIndex((c) => c.id === (opts.startChapter ?? 'ch1')));
    for (const c of CHAPTERS.slice(0, startIndex + 1)) {
      if (!this.state.unlocked.includes(c.id)) this.state.unlocked.push(c.id);
    }
    // The demo shows the ending that requires withholding evidence in chapter 4
    if (opts.auto) this.state.flags.ch4_withheld = true;

    const last = opts.only ? startIndex : CHAPTERS.length - 1;
    for (let i = startIndex; i <= last; i++) {
      const chapter = CHAPTERS[i];
      this.state.visited.length = 0;

      this.director?.dispose();
      this.director = new Director({
        stage: this.stage,
        ui: this.ui,
        audio: this.audio,
        state: this.state,
        auto: opts.auto,
        autoChoices: DEMO_CHOICES,
        pace: opts.pace ?? 1,
      });

      await this.director.playChapter(chapter);

      const flow = this.director.flowchartFor(chapter);
      this.ui.setLetterbox(false);
      this.stage.fx.letterbox.amount = 0;
      this.audio.setMusic('menu', 1.2);
      if (opts.auto) {
        const shown = this.ui.flowchart.show(`CHAPTER ${chapter.index} — ${chapter.title}`, flow.nodes, flow.edges);
        await this.hold(5);
        this.ui.flowchart.hide();
        await shown.catch(() => undefined);
      } else {
        await this.ui.flowchart.show(`CHAPTER ${chapter.index} — ${chapter.title}`, flow.nodes, flow.edges);
      }
      this.stage.fx.grade.fade = 1;
    }

    if (!opts.only) {
      const info = ENDINGS[this.state.ending ?? 'mercy'] ?? ENDINGS.mercy;
      this.audio.setMusic(info.id === 'machine' ? 'melancholy' : 'resolve', 2);
      await this.ui.stats.showEnding(info.title, info.description, info.epilogue);
    }
    this.ui.clearAll();
    this.stage.fx.grade.fade = 0;
    this.director?.dispose();
    this.director = null;
  }

  /** A wait driven by the stage clock, so it behaves under fixed-step capture. */
  private hold(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      let t = 0;
      const off = this.stage.onUpdate((dt) => {
        t += dt;
        if (t >= seconds) {
          off();
          resolve();
        }
      });
    });
  }

  dispose() {
    this.director?.dispose();
    this.ui.dispose();
    this.audio.dispose();
  }
}

export async function startGame(stage: Stage, params: URLSearchParams) {
  const game = new Game(stage);
  (window as unknown as { __GAME__?: Game }).__GAME__ = game;
  // Kick the story off without blocking the render loop
  void game.run({
    auto: params.get('demo') === '1' || params.get('auto') === '1',
    startChapter: params.get('chapter') ?? undefined,
    only: params.get('only') === '1',
    pace: params.get('pace') ? Number(params.get('pace')) : undefined,
  });
  return game;
}
