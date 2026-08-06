/**
 * Title screen, chapter select, settings and the pause menu.
 *
 * Keyboard (up/down/enter/escape, left/right on settings rows) and mouse both
 * work. Every promise settles: on a choice, on `hide()`, or on an idle timeout,
 * because the auto-demo has no player to press anything and a dangling promise
 * would hang the whole recording.
 */
import {
  UIClock,
  UIFader,
  uiCaptureKeys,
  uiEl,
  uiGrowRule,
  uiLed,
  uiRegisterPulse,
  uiReveal,
  type UIHandle,
} from './UIRoot';

export interface ChapterEntry {
  id: string;
  index: number;
  name: string;
  unlocked: boolean;
}

export interface MenuSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  voice: boolean;
  music: boolean;
}

export type MenuResult =
  | { kind: 'start' }
  | { kind: 'chapter'; id: string }
  | { kind: 'demo' }
  | { kind: 'settings'; settings: MenuSettings };

const QUALITIES: MenuSettings['quality'][] = ['low', 'medium', 'high', 'ultra'];
/** With nobody at the controls the title screen falls through to the demo. */
const TITLE_IDLE = 60;
const PAUSE_IDLE = 60;

type Pane = 'root' | 'chapters' | 'settings';

interface Row {
  el: HTMLButtonElement;
  enabled: boolean;
  activate: () => void;
  /** Left / right handler, used by the settings rows. */
  adjust?: (dir: number) => void;
}

export class MenuUI {
  private readonly root: HTMLElement;
  private readonly clock = new UIClock();

  private readonly title: HTMLElement;
  private readonly titleFader: UIFader;
  private readonly titleRule: HTMLElement;
  private readonly titleLed: HTMLElement;
  private readonly panes: Record<Pane, HTMLElement>;
  private readonly lists: Record<Pane, HTMLElement>;

  private readonly pause: HTMLElement;
  private readonly pauseFader: UIFader;
  private readonly pauseList: HTMLElement;

  private rows: Row[] = [];
  private cursor = 0;
  private pane: Pane = 'root';
  private settings: MenuSettings = { quality: 'high', voice: true, music: true };
  private chapters: ChapterEntry[] = [];

  private resolveTitle: ((result: MenuResult) => void) | null = null;
  private resolvePause: ((result: 'resume' | 'restart' | 'menu') => void) | null = null;
  private releaseKeys: (() => void) | null = null;
  private idleTimer: UIHandle | null = null;
  private idleSeconds = TITLE_IDLE;
  private onIdle: (() => void) | null = null;
  private titlePulseOff: (() => void) | null = null;
  private mode: 'none' | 'title' | 'pause' = 'none';
  private disposed = false;

  constructor(parent: HTMLElement) {
    this.root = uiEl('div', 'dv-c dv-c-menu');

    // --- title -------------------------------------------------------------
    this.title = uiEl('div', 'dv-menu');
    const titleIn = uiEl('div', 'dv-menu-in');
    const wordmark = uiEl('div', 'dv-wordmark', 'Deviant');
    this.titleLed = uiLed();
    const tagRow = uiEl('div', 'dv-menu-tag dv-label');
    tagRow.append(this.titleLed, uiEl('span', '', 'A story about machines who choose'));
    this.titleRule = uiEl('i', 'dv-menu-rule');

    this.panes = {
      root: uiEl('div', 'dv-menu-pane dv-on'),
      chapters: uiEl('div', 'dv-menu-pane'),
      settings: uiEl('div', 'dv-menu-pane'),
    };
    this.lists = {
      root: uiEl('div', 'dv-menu-list'),
      chapters: uiEl('div', 'dv-menu-list'),
      settings: uiEl('div', 'dv-menu-list'),
    };
    this.panes.root.appendChild(this.lists.root);
    this.panes.chapters.append(heading('Chapter select'), this.lists.chapters);
    this.panes.settings.append(heading('Settings'), this.lists.settings);

    const foot = uiEl('div', 'dv-menu-foot dv-mono');
    foot.append(
      uiEl('span', '', '\u2191\u2193 SELECT'),
      uiEl('span', '', 'ENTER CONFIRM'),
      uiEl('span', '', 'ESC BACK'),
    );

    titleIn.append(
      wordmark,
      tagRow,
      this.titleRule,
      this.panes.root,
      this.panes.chapters,
      this.panes.settings,
      foot,
    );

    const side = uiEl('div', 'dv-menu-side dv-mono');
    side.append(
      uiEl('div', '', 'CYBERLIFE INDUSTRIES'),
      uiEl('div', '', 'MODEL AX400 \u25B8 SERIAL 579 102 694'),
      uiEl('div', '', 'BUILD 2038.11'),
    );
    this.title.append(titleIn, side);

    // --- pause -------------------------------------------------------------
    this.pause = uiEl('div', 'dv-menu dv-menu-pause');
    const pauseIn = uiEl('div', 'dv-menu-in');
    this.pauseList = uiEl('div', 'dv-menu-list');
    pauseIn.append(heading('Paused'), this.pauseList);
    this.pause.appendChild(pauseIn);

    this.root.append(this.title, this.pause);
    parent.appendChild(this.root);
    this.titleFader = new UIFader(this.clock, this.title);
    this.pauseFader = new UIFader(this.clock, this.pause);
  }

  showTitle(chapters: ChapterEntry[], settings: MenuSettings): Promise<MenuResult> {
    if (this.disposed) return Promise.resolve<MenuResult>({ kind: 'start' });
    this.closeAll();

    this.chapters = (chapters ?? []).slice();
    this.settings = { ...settings };
    this.mode = 'title';

    if (!this.titlePulseOff) this.titlePulseOff = uiRegisterPulse(this.titleLed, 2.2);
    this.titleFader.reveal({ duration: 0.34 });
    uiGrowRule(this.clock, this.titleRule, 0.5);
    this.buildRootPane();
    this.grabKeys();
    this.armIdle(TITLE_IDLE, () => this.settleTitle({ kind: 'demo' }));

    return new Promise<MenuResult>((resolve) => {
      this.resolveTitle = resolve;
    });
  }

  showPause(): Promise<'resume' | 'restart' | 'menu'> {
    if (this.disposed) return Promise.resolve('resume');
    this.closeAll();

    this.mode = 'pause';
    this.rows = [];
    clearChildren(this.pauseList);
    this.addRow(this.pauseList, 'Resume', '01', true, () => this.settlePause('resume'));
    this.addRow(this.pauseList, 'Restart chapter', '02', true, () => this.settlePause('restart'));
    this.addRow(this.pauseList, 'Main menu', '03', true, () => this.settlePause('menu'));

    this.pauseFader.reveal({ duration: 0.24 });
    this.moveCursor(0, true);
    this.revealRows();
    this.grabKeys();
    this.armIdle(PAUSE_IDLE, () => this.settlePause('resume'));

    return new Promise<'resume' | 'restart' | 'menu'>((resolve) => {
      this.resolvePause = resolve;
    });
  }

  hide(): void {
    if (this.disposed) return;
    const wasTitle = this.mode === 'title';
    const wasPause = this.mode === 'pause';
    this.closeAll();
    // A dismissed title screen means "get on with it"; a dismissed pause menu
    // means "carry on playing".
    if (wasTitle) this.settleTitle({ kind: 'start' });
    if (wasPause) this.settlePause('resume');
  }

  dispose(): void {
    if (this.disposed) return;
    // Settle first: `hide()` is a no-op once the component is marked disposed.
    this.hide();
    this.disposed = true;
    if (this.titlePulseOff) this.titlePulseOff();
    this.titlePulseOff = null;
    this.clock.dispose();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  /* --- panes ------------------------------------------------------------- */

  private buildRootPane(): void {
    this.showPane('root');
    this.rows = [];
    clearChildren(this.lists.root);
    this.addRow(this.lists.root, 'New game', '01', true, () => this.settleTitle({ kind: 'start' }));
    this.addRow(this.lists.root, 'Chapter select', '02', this.chapters.length > 0, () =>
      this.buildChaptersPane(),
    );
    this.addRow(this.lists.root, 'Auto-demo', '03', true, () => this.settleTitle({ kind: 'demo' }));
    this.addRow(this.lists.root, 'Settings', '04', true, () => this.buildSettingsPane());
    this.moveCursor(0, true);
    this.revealRows();
  }

  private buildChaptersPane(): void {
    this.showPane('chapters');
    this.rows = [];
    clearChildren(this.lists.chapters);
    for (const chapter of this.chapters) {
      const id = chapter.id;
      this.addRow(
        this.lists.chapters,
        chapter.name,
        String(chapter.index).padStart(2, '0'),
        chapter.unlocked,
        () => this.settleTitle({ kind: 'chapter', id }),
        chapter.unlocked ? '' : 'LOCKED',
      );
    }
    this.addRow(this.lists.chapters, 'Back', '\u2190', true, () => this.buildRootPane());
    this.moveCursor(0, true);
    this.revealRows();
  }

  private buildSettingsPane(): void {
    this.showPane('settings');
    this.rows = [];
    clearChildren(this.lists.settings);

    const refs: { quality?: Row; voice?: Row; music?: Row } = {};
    const cycleQuality = (dir: number): void => {
      const i = QUALITIES.indexOf(this.settings.quality);
      const next = (i + (dir || 1) + QUALITIES.length) % QUALITIES.length;
      this.settings.quality = QUALITIES[next];
      if (refs.quality) setAux(refs.quality, this.settings.quality.toUpperCase());
    };
    const toggle = (which: 'voice' | 'music'): void => {
      this.settings[which] = !this.settings[which];
      const row = which === 'voice' ? refs.voice : refs.music;
      if (row) setAux(row, onOff(this.settings[which]));
    };

    refs.quality = this.addRow(
      this.lists.settings,
      'Quality',
      '01',
      true,
      () => cycleQuality(1),
      this.settings.quality.toUpperCase(),
    );
    refs.quality.adjust = cycleQuality;

    refs.voice = this.addRow(
      this.lists.settings,
      'Voice',
      '02',
      true,
      () => toggle('voice'),
      onOff(this.settings.voice),
    );
    refs.voice.adjust = () => toggle('voice');

    refs.music = this.addRow(
      this.lists.settings,
      'Music',
      '03',
      true,
      () => toggle('music'),
      onOff(this.settings.music),
    );
    refs.music.adjust = () => toggle('music');

    this.addRow(this.lists.settings, 'Apply', '\u25B8', true, () =>
      this.settleTitle({ kind: 'settings', settings: { ...this.settings } }),
    );
    this.addRow(this.lists.settings, 'Back', '\u2190', true, () => this.buildRootPane());

    this.moveCursor(0, true);
    this.revealRows();
  }

  private showPane(pane: Pane): void {
    this.pane = pane;
    for (const key of Object.keys(this.panes) as Pane[]) {
      this.panes[key].classList.toggle('dv-on', key === pane);
    }
  }

  private addRow(
    list: HTMLElement,
    label: string,
    index: string,
    enabled: boolean,
    activate: () => void,
    aux = '',
  ): Row {
    const button = uiEl('button', 'dv-btn');
    button.type = 'button';
    const item = uiEl('div', 'dv-menu-item');
    item.append(
      uiEl('span', 'dv-menu-idx', index),
      uiEl('span', 'dv-menu-name', label),
      uiEl('span', 'dv-menu-aux', aux),
    );
    button.appendChild(item);
    if (!enabled) {
      button.classList.add('dv-off');
      button.disabled = true;
    }
    button.style.opacity = '0';
    list.appendChild(button);

    const row: Row = { el: button, enabled, activate };
    const rowIndex = this.rows.length;
    this.rows.push(row);
    if (enabled) {
      button.addEventListener('mouseenter', () => this.moveCursor(rowIndex, true));
      button.addEventListener('click', () => {
        this.moveCursor(rowIndex, true);
        this.pokeIdle();
        row.activate();
      });
    }
    return row;
  }

  private revealRows(): void {
    this.rows.forEach((row, i) => {
      uiReveal(this.clock, row.el, { duration: 0.22, x: -10, delay: i * 0.05 });
    });
  }

  /* --- input ------------------------------------------------------------- */

  private grabKeys(): void {
    if (this.releaseKeys) return;
    this.releaseKeys = uiCaptureKeys({ down: (e) => this.onKey(e) });
  }

  private onKey(e: KeyboardEvent): void {
    if (this.mode === 'none') return;
    const key = e.key;
    let handled = true;

    if (key === 'ArrowDown' || key === 's' || key === 'S' || key === 'Tab') {
      this.step(1);
    } else if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      this.step(-1);
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      this.adjust(-1);
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      this.adjust(1);
    } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      const row = this.rows[this.cursor];
      if (row && row.enabled) {
        this.pokeIdle();
        row.activate();
      }
    } else if (key === 'Escape') {
      if (this.mode === 'pause') this.settlePause('resume');
      else if (this.pane !== 'root') this.buildRootPane();
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      this.pokeIdle();
    }
  }

  private step(dir: number): void {
    const count = this.rows.length;
    if (!count) return;
    let index = this.cursor;
    for (let i = 0; i < count; i++) {
      index = (index + dir + count) % count;
      if (this.rows[index].enabled) {
        this.moveCursor(index, false);
        return;
      }
    }
  }

  private adjust(dir: number): void {
    const row = this.rows[this.cursor];
    if (row && row.enabled && row.adjust) row.adjust(dir);
  }

  private moveCursor(index: number, allowSame: boolean): void {
    if (!this.rows.length) return;
    let target = index;
    if (target < 0 || target >= this.rows.length) target = 0;
    if (!this.rows[target].enabled) {
      const found = this.rows.findIndex((r) => r.enabled);
      if (found < 0) return;
      target = found;
    }
    if (!allowSame && target === this.cursor) return;
    this.cursor = target;
    this.rows.forEach((row, i) => row.el.classList.toggle('dv-sel', i === target));
  }

  /* --- idle safety ------------------------------------------------------- */

  private armIdle(seconds: number, onIdle: () => void): void {
    this.clearIdle();
    this.idleSeconds = seconds;
    this.onIdle = onIdle;
    this.idleTimer = this.clock.after(seconds, onIdle);
  }

  private pokeIdle(): void {
    const onIdle = this.onIdle;
    if (!this.idleTimer || !onIdle) return;
    this.idleTimer.cancel();
    this.idleTimer = this.clock.after(this.idleSeconds, onIdle);
  }

  private clearIdle(): void {
    if (this.idleTimer) {
      this.idleTimer.cancel();
      this.idleTimer = null;
    }
    this.onIdle = null;
  }

  /* --- teardown ---------------------------------------------------------- */

  private closeAll(): void {
    this.clearIdle();
    if (this.releaseKeys) {
      this.releaseKeys();
      this.releaseKeys = null;
    }
    this.mode = 'none';
    this.rows = [];
    this.cursor = 0;
    this.pane = 'root';
    this.titleFader.fade(0.26, () => {
      if (this.titlePulseOff) {
        this.titlePulseOff();
        this.titlePulseOff = null;
      }
    });
    this.pauseFader.fade(0.2);
  }

  private settleTitle(result: MenuResult): void {
    const resolve = this.resolveTitle;
    this.resolveTitle = null;
    this.closeAll();
    if (resolve) resolve(result);
  }

  private settlePause(result: 'resume' | 'restart' | 'menu'): void {
    const resolve = this.resolvePause;
    this.resolvePause = null;
    this.closeAll();
    if (resolve) resolve(result);
  }
}

function heading(text: string): HTMLElement {
  const el = uiEl('div', 'dv-menu-heading');
  const rule = uiEl('i', 'dv-rule');
  rule.style.flex = '1 1 auto';
  el.append(uiEl('span', 'dv-label', text), rule);
  return el;
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function setAux(row: Row, value: string): void {
  const aux = row.el.querySelector('.dv-menu-aux');
  if (aux) aux.textContent = value;
}

function onOff(value: boolean): string {
  return value ? 'ON' : 'OFF';
}
