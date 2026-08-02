import { Signal } from '../core/Signals';
import { QUALITY_TIERS, type Preferences, type QualityName } from '../core/Settings';

/**
 * DOM interface layer.
 *
 * Builds the whole overlay in code, exposes typed signals for the app to wire
 * up, and owns nothing about the 3D scene. Every control is keyboard
 * reachable and every panel can be dismissed with Escape.
 */

export interface ChapterEntry {
  id: string;
  title: string;
  synopsis: string;
  start: number;
  duration: number;
}

export type UIMode = 'cinematic' | 'explore';

const formatTime = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v as string;
    else if (k.startsWith('aria') || k === 'role' || k === 'type' || k === 'min' || k === 'max' || k === 'step' || k === 'value')
      node.setAttribute(k.replace(/([A-Z])/g, '-$1').toLowerCase(), String(v));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else (node as any)[k] = v;
  }
  for (const c of children) node.append(c);
  return node;
};

export class UI {
  readonly root: HTMLElement;

  readonly onEnter = new Signal<void>();
  readonly onPlayToggle = new Signal<void>();
  readonly onRestart = new Signal<void>();
  readonly onSeek = new Signal<number>();
  readonly onScrubStart = new Signal<void>();
  readonly onScrubEnd = new Signal<void>();
  readonly onChapterSelect = new Signal<number>();
  readonly onModeChange = new Signal<UIMode>();
  readonly onVolumeChange = new Signal<{ key: 'master' | 'music' | 'narration' | 'effects'; value: number }>();
  readonly onSubtitlesToggle = new Signal<boolean>();
  readonly onQualityChange = new Signal<QualityName>();
  readonly onDebugToggle = new Signal<boolean>();
  readonly onFollow = new Signal<void>();
  readonly onInspect = new Signal<void>();
  readonly onReturnToCinematic = new Signal<void>();
  readonly onDeselect = new Signal<void>();

  private gate!: HTMLElement;
  private loading!: HTMLElement;
  private loadLabel!: HTMLElement;
  private loadFill!: HTMLElement;
  private loadPct!: HTMLElement;
  private hud!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private modeBtn!: HTMLButtonElement;
  private chapterSelect!: HTMLSelectElement;
  private scrubber!: HTMLElement;
  private scrubFill!: HTMLElement;
  private scrubKnob!: HTMLElement;
  private scrubMarks!: HTMLElement;
  private timeNow!: HTMLElement;
  private timeTotal!: HTMLElement;
  private subtitleBox!: HTMLElement;
  private cardBox!: HTMLElement;
  private chapterTitle!: HTMLElement;
  private debugBox!: HTMLElement;
  private inspector!: HTMLElement;
  private inspectorTitle!: HTMLElement;
  private inspectorKind!: HTMLElement;
  private inspectorBody!: HTMLElement;
  private hoverLabel!: HTMLElement;
  private helpPanel!: HTMLElement;
  private audioPopover!: HTMLElement;
  private errorBoundary!: HTMLElement;
  private errorText!: HTMLPreElement;
  private toast!: HTMLElement;
  private exploreHint!: HTMLElement;
  private subtitlesBtn!: HTMLButtonElement;
  private debugBtn!: HTMLButtonElement;
  private qualitySelect!: HTMLSelectElement;

  private duration = 1;
  private scrubbing = false;
  private mode: UIMode = 'cinematic';
  private toastTimer = 0;
  private lastChapterKey = '';

  constructor(container: HTMLElement, prefs: Preferences, chapters: ChapterEntry[], totalDuration: number) {
    this.root = container;
    this.duration = totalDuration;
    this.build(prefs, chapters);
  }

  // ---------------------------------------------------------------- build

  private build(prefs: Preferences, chapters: ChapterEntry[]): void {
    // ---- loading ---------------------------------------------------------
    this.loadLabel = el('div', { class: 'load-label' }, 'Initialising');
    this.loadFill = el('div', { class: 'load-fill' });
    this.loadPct = el('div', { class: 'load-pct' }, '0%');
    this.loading = el(
      'div',
      { id: 'loading' },
      el(
        'div',
        { class: 'load-inner' },
        this.loadLabel,
        el('div', { class: 'load-track' }, this.loadFill),
        this.loadPct,
      ),
    );

    // ---- entry gate ------------------------------------------------------
    const enterBtn = el('button', { class: 'primary' }, 'Enter the Galaxy');
    enterBtn.addEventListener('click', () => this.onEnter.emit());
    const helpFromGate = el('button', {}, 'Controls');
    helpFromGate.addEventListener('click', () => this.setHelpVisible(true));

    this.gate = el(
      'div',
      { id: 'gate' },
      el(
        'div',
        { class: 'gate-inner' },
        el('div', { class: 'gate-kicker' }, 'An interactive procedural cinematic'),
        el('h1', { class: 'gate-title' }, 'Shadow of the First Star'),
        el('p', { class: 'gate-sub' }, 'Above Tatooine · Chapter One'),
        el(
          'p',
          { class: 'gate-body' },
          'Six and a half minutes of directed action, generated entirely from code: every hull, every figure, every note of score and every word of narration. Audio needs a click to start, so the galaxy waits for you.',
        ),
        el('div', { class: 'gate-actions' }, enterBtn, helpFromGate),
        el('p', { class: 'gate-note' }, 'Headphones recommended. Press H at any time for controls.'),
        el(
          'p',
          { class: 'gate-legal' },
          'An unofficial, non-commercial fan work. No footage, models, textures, music, dialogue or sound effects from any film are used; everything here is generated procedurally or newly authored. Star Wars is a trademark of Lucasfilm Ltd., who are not affiliated with this project.',
        ),
      ),
    );

    // ---- transport -------------------------------------------------------
    this.playBtn = el('button', { class: 'icon', title: 'Play / pause (Space)' }, '▶');
    this.playBtn.addEventListener('click', () => this.onPlayToggle.emit());

    const restartBtn = el('button', { class: 'icon', title: 'Restart (R)' }, '↺');
    restartBtn.addEventListener('click', () => this.onRestart.emit());

    this.chapterSelect = el('select', { title: 'Jump to chapter' }) as HTMLSelectElement;
    chapters.forEach((c, i) => {
      const opt = el('option', { value: String(i) }, `${i + 1}. ${c.title}`);
      this.chapterSelect.append(opt);
    });
    this.chapterSelect.addEventListener('change', () => {
      this.onChapterSelect.emit(Number(this.chapterSelect.value));
    });

    this.modeBtn = el('button', { title: 'Toggle Explore mode (E)' }, 'Cinematic');
    this.modeBtn.addEventListener('click', () => {
      this.setMode(this.mode === 'cinematic' ? 'explore' : 'cinematic', true);
    });

    this.subtitlesBtn = el('button', { class: prefs.subtitles ? 'active' : '', title: 'Subtitles (C)' }, 'CC');
    this.subtitlesBtn.addEventListener('click', () => {
      const next = !this.subtitlesBtn.classList.contains('active');
      this.subtitlesBtn.classList.toggle('active', next);
      this.onSubtitlesToggle.emit(next);
    });

    const audioBtn = el('button', { title: 'Audio levels' }, '♪');
    audioBtn.addEventListener('click', () => {
      this.audioPopover.classList.toggle('hidden');
    });

    this.qualitySelect = el('select', { title: 'Quality' }) as HTMLSelectElement;
    for (const tier of Object.values(QUALITY_TIERS)) {
      this.qualitySelect.append(el('option', { value: tier.name }, tier.label));
    }
    this.qualitySelect.value = prefs.quality;
    this.qualitySelect.addEventListener('change', () => {
      this.onQualityChange.emit(this.qualitySelect.value as QualityName);
    });

    const fullscreenBtn = el('button', { class: 'icon', title: 'Fullscreen (F)' }, '⛶');
    fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    const helpBtn = el('button', { class: 'icon', title: 'Help (H)' }, '?');
    helpBtn.addEventListener('click', () => this.setHelpVisible(true));

    this.debugBtn = el('button', { class: 'icon', title: 'Debug overlay (D)' }, '⚙');
    this.debugBtn.addEventListener('click', () => {
      const next = !this.debugBtn.classList.contains('active');
      this.debugBtn.classList.toggle('active', next);
      this.debugBox.classList.toggle('hidden', !next);
      this.onDebugToggle.emit(next);
    });

    // ---- scrubber --------------------------------------------------------
    this.scrubFill = el('div', { class: 'fill' });
    this.scrubKnob = el('div', { class: 'knob' });
    this.scrubMarks = el('div', { class: 'marks' });
    this.scrubber = el(
      'div',
      { id: 'scrubber', role: 'slider', tabIndex: 0, title: 'Timeline (← →)' },
      el('div', { class: 'track' }),
      this.scrubFill,
      this.scrubMarks,
      this.scrubKnob,
    );
    for (const c of chapters) {
      const mark = el('div', { class: 'mark' });
      mark.style.left = `${(c.start / this.duration) * 100}%`;
      mark.title = c.title;
      this.scrubMarks.append(mark);
    }
    this.wireScrubber();

    this.timeNow = el('div', { class: 'time' }, '0:00');
    this.timeTotal = el('div', { class: 'time' }, formatTime(this.duration));

    this.hud = el(
      'div',
      { id: 'hud' },
      el('div', { class: 'scrub-row' }, this.timeNow, this.scrubber, this.timeTotal),
      el(
        'div',
        { class: 'control-row' },
        this.playBtn,
        restartBtn,
        el('span', { class: 'group-label' }, 'Chapter'),
        this.chapterSelect,
        el('div', { class: 'spacer' }),
        this.modeBtn,
        this.subtitlesBtn,
        audioBtn,
        el('span', { class: 'group-label' }, 'Quality'),
        this.qualitySelect,
        fullscreenBtn,
        helpBtn,
        this.debugBtn,
      ),
    );

    // ---- audio popover ---------------------------------------------------
    const sliders: Array<['master' | 'music' | 'narration' | 'effects', string, number]> = [
      ['master', 'Master', prefs.masterVolume],
      ['narration', 'Narration', prefs.narrationVolume],
      ['music', 'Music', prefs.musicVolume],
      ['effects', 'Effects', prefs.effectsVolume],
    ];
    this.audioPopover = el('div', { class: 'popover hidden' }, el('h3', {}, 'Audio levels'));
    for (const [key, label, value] of sliders) {
      const output = el('output', {}, `${Math.round(value * 100)}`);
      const input = el('input', {
        type: 'range',
        min: '0',
        max: '100',
        step: '1',
        value: String(Math.round(value * 100)),
      }) as HTMLInputElement;
      input.addEventListener('input', () => {
        const v = Number(input.value) / 100;
        output.textContent = input.value;
        this.onVolumeChange.emit({ key, value: v });
      });
      this.audioPopover.append(el('div', { class: 'slider-row' }, el('label', {}, label), input, output));
    }

    // ---- narrative overlays ---------------------------------------------
    this.subtitleBox = el('div', { id: 'subtitles' });
    this.cardBox = el('div', { id: 'card' });
    this.chapterTitle = el(
      'div',
      { id: 'chapter-title' },
      el('div', { class: 'num' }, ''),
      el('div', { class: 'name' }, ''),
    );
    this.debugBox = el('div', { id: 'debug', class: 'hidden' });
    this.hoverLabel = el('div', { id: 'hover-label' });
    this.exploreHint = el(
      'div',
      { id: 'explore-hint', class: 'hidden' },
      'Explore — drag to orbit · WASD to move · click a subject',
    );
    this.toast = el('div', { id: 'toast' });

    // ---- inspector -------------------------------------------------------
    this.inspectorTitle = el('h4', {}, '');
    this.inspectorKind = el('div', { class: 'kind' }, '');
    this.inspectorBody = el('p', {}, '');
    const followBtn = el('button', {}, 'Follow');
    followBtn.addEventListener('click', () => this.onFollow.emit());
    const inspectBtn = el('button', {}, 'Inspect');
    inspectBtn.addEventListener('click', () => this.onInspect.emit());
    const returnBtn = el('button', {}, 'Return to cinematic camera');
    returnBtn.addEventListener('click', () => this.onReturnToCinematic.emit());
    const closeBtn = el('button', { class: 'icon' }, '×');
    closeBtn.addEventListener('click', () => this.onDeselect.emit());
    this.inspector = el(
      'div',
      { id: 'inspector', class: 'hidden' },
      this.inspectorTitle,
      this.inspectorKind,
      this.inspectorBody,
      el('div', { class: 'actions' }, followBtn, inspectBtn, returnBtn, closeBtn),
    );

    // ---- help ------------------------------------------------------------
    this.helpPanel = this.buildHelp();

    // ---- error boundary --------------------------------------------------
    this.errorText = el('pre', {}) as HTMLPreElement;
    const reloadBtn = el('button', { class: 'primary' }, 'Reload');
    reloadBtn.addEventListener('click', () => window.location.reload());
    const dismissBtn = el('button', {}, 'Dismiss and continue');
    dismissBtn.addEventListener('click', () => this.errorBoundary.classList.add('hidden'));
    this.errorBoundary = el(
      'div',
      { id: 'error-boundary', class: 'hidden' },
      el(
        'div',
        { class: 'error-panel' },
        el('h2', {}, 'Something went wrong'),
        el('p', {}, 'The experience hit an unrecoverable error. The details below are also in the browser console.'),
        this.errorText,
        el('div', { class: 'gate-actions' }, reloadBtn, dismissBtn),
      ),
    );

    this.root.append(
      this.chapterTitle,
      this.subtitleBox,
      this.cardBox,
      this.exploreHint,
      this.hud,
      this.audioPopover,
      this.inspector,
      this.debugBox,
      this.hoverLabel,
      this.toast,
      this.helpPanel,
      this.gate,
      this.loading,
      this.errorBoundary,
    );

    if (prefs.debug) {
      this.debugBtn.classList.add('active');
      this.debugBox.classList.remove('hidden');
    }
  }

  private buildHelp(): HTMLElement {
    const grid = el('dl', { class: 'help-grid' });
    const rows: Array<[string, string]> = [
      ['Space', 'Play / pause the timeline'],
      ['R', 'Restart from the beginning'],
      ['← / →', 'Scrub 5 seconds; hold Shift for 20'],
      [', / .', 'Previous / next chapter'],
      ['E', 'Toggle Cinematic and Explore mode'],
      ['C', 'Subtitles on / off'],
      ['F', 'Fullscreen'],
      ['H', 'This panel'],
      ['D', 'Debug overlay'],
      ['Esc', 'Close panels, deselect, leave Explore'],
      ['Drag', 'Explore: orbit the camera'],
      ['W A S D', 'Explore: fly the camera'],
      ['Q / Z', 'Explore: down / up'],
      ['Shift', 'Explore: move faster'],
      ['Wheel', 'Explore: dolly in and out'],
      ['Click', 'Explore: select a ship, droid or figure'],
    ];
    for (const [k, v] of rows) {
      grid.append(el('dt', {}, k), el('dd', {}, v));
    }
    const close = el('button', { class: 'primary help-close' }, 'Close');
    close.addEventListener('click', () => this.setHelpVisible(false));
    return el(
      'div',
      { id: 'help', class: 'hidden' },
      el(
        'div',
        { class: 'help-panel' },
        el('h2', {}, 'Shadow of the First Star'),
        el(
          'p',
          {},
          'A procedurally generated cinematic. In Cinematic mode the story plays itself; in Explore mode the timeline pauses and the camera is yours.',
        ),
        el('h3', {}, 'Controls'),
        grid,
        el('h3', {}, 'Explore mode'),
        el(
          'p',
          {},
          'Selecting a subject opens a short original description with Follow, Inspect and Return to cinematic camera. The camera is fenced so it can never drift somewhere you cannot get back from — Return always restores the directed shot.',
        ),
        el('h3', {}, 'About this work'),
        el(
          'p',
          {},
          'Unofficial, non-commercial, and built entirely from original geometry, synthesized audio and newly written narration. No film assets of any kind are used.',
        ),
        close,
      ),
    );
  }

  private wireScrubber(): void {
    const seekFromEvent = (ev: PointerEvent): void => {
      const rect = this.scrubber.getBoundingClientRect();
      const k = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      this.onSeek.emit(k * this.duration);
    };
    this.scrubber.addEventListener('pointerdown', (ev) => {
      this.scrubbing = true;
      this.scrubber.setPointerCapture(ev.pointerId);
      this.onScrubStart.emit();
      seekFromEvent(ev);
    });
    this.scrubber.addEventListener('pointermove', (ev) => {
      if (this.scrubbing) seekFromEvent(ev);
    });
    const end = (ev: PointerEvent): void => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      try {
        this.scrubber.releasePointerCapture(ev.pointerId);
      } catch {
        /* pointer already released */
      }
      this.onScrubEnd.emit();
    };
    this.scrubber.addEventListener('pointerup', end);
    this.scrubber.addEventListener('pointercancel', end);
    this.scrubber.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const step = (ev.shiftKey ? 20 : 5) * (ev.key === 'ArrowLeft' ? -1 : 1);
        this.onSeek.emit(Math.max(0, Math.min(this.duration, this.currentTime + step)));
      }
    });
  }

  // ------------------------------------------------------------- updates

  private currentTime = 0;

  setLoadingProgress(label: string, t: number): void {
    this.loadLabel.textContent = label;
    const pct = Math.round(Math.max(0, Math.min(1, t)) * 100);
    this.loadFill.style.width = `${pct}%`;
    this.loadPct.textContent = `${pct}%`;
  }

  hideLoading(): void {
    this.loading.classList.add('hidden');
    window.setTimeout(() => {
      this.loading.style.display = 'none';
    }, 700);
  }

  hideGate(): void {
    this.gate.classList.add('hidden');
    window.setTimeout(() => {
      this.gate.style.display = 'none';
    }, 1000);
  }

  setPlaying(playing: boolean): void {
    this.playBtn.textContent = playing ? '❚❚' : '▶';
    this.playBtn.title = playing ? 'Pause (Space)' : 'Play (Space)';
  }

  setTime(t: number, duration: number): void {
    this.currentTime = t;
    this.duration = duration || 1;
    const k = Math.max(0, Math.min(1, t / this.duration));
    this.scrubFill.style.width = `${k * 100}%`;
    this.scrubKnob.style.left = `${k * 100}%`;
    this.timeNow.textContent = formatTime(t);
    this.timeTotal.textContent = formatTime(this.duration);
    this.scrubber.setAttribute('aria-valuenow', String(Math.round(t)));
  }

  setChapter(index: number, entry: ChapterEntry): void {
    if (this.chapterSelect.value !== String(index)) this.chapterSelect.value = String(index);
    const key = `${index}:${entry.id}`;
    if (key === this.lastChapterKey) return;
    this.lastChapterKey = key;
    (this.chapterTitle.querySelector('.num') as HTMLElement).textContent =
      `Chapter ${index + 1} — ${entry.synopsis}`;
    (this.chapterTitle.querySelector('.name') as HTMLElement).textContent = entry.title;
    this.chapterTitle.classList.add('visible');
    window.clearTimeout(this.chapterTitleTimer);
    this.chapterTitleTimer = window.setTimeout(() => {
      this.chapterTitle.classList.remove('visible');
    }, 5200);
  }
  private chapterTitleTimer = 0;

  setSubtitle(text: string | null, speaker?: string): void {
    if (!text) {
      this.subtitleBox.classList.remove('visible');
      return;
    }
    this.subtitleBox.textContent = '';
    if (speaker) {
      this.subtitleBox.append(el('span', { class: 'speaker' }, speaker));
      this.subtitleBox.classList.add('character');
    } else {
      this.subtitleBox.classList.remove('character');
    }
    this.subtitleBox.append(document.createTextNode(text));
    this.subtitleBox.classList.add('visible');
  }

  setSubtitlesEnabled(on: boolean): void {
    this.subtitleBox.style.display = on ? '' : 'none';
    this.subtitlesBtn.classList.toggle('active', on);
  }

  setCard(text: string | null): void {
    if (!text) {
      this.cardBox.classList.remove('visible');
      return;
    }
    this.cardBox.textContent = text;
    this.cardBox.classList.add('visible');
  }

  setMode(mode: UIMode, emit = false): void {
    this.mode = mode;
    this.modeBtn.textContent = mode === 'cinematic' ? 'Cinematic' : 'Explore';
    this.modeBtn.classList.toggle('active', mode === 'explore');
    this.exploreHint.classList.toggle('hidden', mode !== 'explore');
    if (mode !== 'explore') this.setSelection(null);
    if (emit) this.onModeChange.emit(mode);
  }

  get currentMode(): UIMode {
    return this.mode;
  }

  setSelection(info: { label: string; description: string; kind: string } | null): void {
    if (!info) {
      this.inspector.classList.add('hidden');
      return;
    }
    this.inspectorTitle.textContent = info.label;
    this.inspectorKind.textContent = info.kind;
    this.inspectorBody.textContent = info.description;
    this.inspector.classList.remove('hidden');
  }

  setHoverLabel(text: string | null, x = 0, y = 0): void {
    if (!text) {
      this.hoverLabel.style.display = 'none';
      return;
    }
    this.hoverLabel.textContent = text;
    this.hoverLabel.style.display = 'block';
    this.hoverLabel.style.left = `${x}px`;
    this.hoverLabel.style.top = `${y}px`;
  }

  setDebugText(html: string): void {
    this.debugBox.innerHTML = html;
  }

  get debugVisible(): boolean {
    return !this.debugBox.classList.contains('hidden');
  }

  setDebugVisible(v: boolean): void {
    this.debugBox.classList.toggle('hidden', !v);
    this.debugBtn.classList.toggle('active', v);
  }

  setHelpVisible(v: boolean): void {
    this.helpPanel.classList.toggle('hidden', !v);
  }

  get helpVisible(): boolean {
    return !this.helpPanel.classList.contains('hidden');
  }

  setQuality(name: QualityName): void {
    this.qualitySelect.value = name;
  }

  showToast(message: string, ms = 2600): void {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('visible'), ms);
  }

  showError(message: string): void {
    this.errorText.textContent = message;
    this.errorBoundary.classList.remove('hidden');
  }

  /** Fade the HUD out during uninterrupted playback. */
  setHudDimmed(dim: boolean): void {
    this.hud.classList.toggle('dimmed', dim);
  }

  closePopovers(): void {
    this.audioPopover.classList.add('hidden');
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      this.showToast('Fullscreen was blocked by the browser');
    }
  }
}
