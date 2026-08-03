import { CHAPTERS, type ChapterInfo } from '../timeline/Timeline';
import type { QualityLevel } from '../core/Quality';
import { QUALITY_PRESETS } from '../core/Quality';
import { formatClock } from '../core/mathx';
import { Subtitles } from './Subtitles';
import { DebugOverlay } from './DebugOverlay';
import type { ObjectDossier } from '../interaction/dossiers';

export type ViewMode = 'cinematic' | 'explore';

export interface UICallbacks {
  onEnter(): void;
  onPlayToggle(): void;
  onRestart(): void;
  onSeek(time: number): void;
  onScrubStart(): void;
  onScrubEnd(): void;
  onChapter(chapter: ChapterInfo): void;
  onQuality(level: QualityLevel): void;
  onVolume(channel: 'master' | 'music' | 'sfx' | 'narration', value: number): void;
  onSubtitles(enabled: boolean): void;
  onMode(mode: ViewMode): void;
  onFullscreen(): void;
  onDebug(enabled: boolean): void;
  onFollow(): void;
  onInspect(): void;
  onReturnToCinematic(): void;
  onClearSelection(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The whole interface.
 *
 * Nothing here is allowed to sit over the centre of frame while the cinematic
 * plays: the transport lives in a gradient at the very bottom, panels dock to
 * the corners, and everything auto-hides during playback until the pointer
 * moves.
 */
export class UIRoot {
  readonly root: HTMLElement;
  readonly subtitles: Subtitles;
  readonly debug: DebugOverlay;

  private cb: UICallbacks;
  private gate!: HTMLDivElement;
  private gateBar!: HTMLSpanElement;
  private gateStatus!: HTMLDivElement;
  private enterButton!: HTMLButtonElement;
  private transport!: HTMLDivElement;
  private playButton!: HTMLButtonElement;
  private clock!: HTMLDivElement;
  private chapterName!: HTMLDivElement;
  private scrubber!: HTMLDivElement;
  private scrubFill!: HTMLDivElement;
  private scrubHead!: HTMLDivElement;
  private scrubTip!: HTMLDivElement;
  private chapterList!: HTMLDivElement;
  private chapterButtons: HTMLButtonElement[] = [];
  private settings!: HTMLDivElement;
  private help!: HTMLDivElement;
  private selection!: HTMLDivElement;
  private selectionName!: HTMLHeadingElement;
  private selectionClass!: HTMLDivElement;
  private selectionBody!: HTMLDivElement;
  private selectionStats!: HTMLDivElement;
  private titleCard!: HTMLDivElement;
  private titleIndex!: HTMLDivElement;
  private titleName!: HTMLHeadingElement;
  private titleSub!: HTMLDivElement;
  private endCard!: HTMLDivElement;
  private endLine!: HTMLParagraphElement;
  private errorBox!: HTMLDivElement;
  private errorText!: HTMLPreElement;
  private exploreHint!: HTMLDivElement;
  private modeButton!: HTMLButtonElement;
  private subtitleSwitch!: HTMLButtonElement;
  private qualitySelect!: HTMLSelectElement;
  private followButton!: HTMLButtonElement;

  private duration = 1;
  private scrubbing = false;
  private idleTimer = 0;
  private mode: ViewMode = 'cinematic';
  private titleTimer = 0;

  constructor(root: HTMLElement, cb: UICallbacks) {
    this.root = root;
    this.cb = cb;

    this.buildGate();
    this.buildTitleCard();
    this.subtitles = new Subtitles(root);
    this.buildTransport();
    this.buildChapterList();
    this.buildSettings();
    this.buildHelp();
    this.buildSelection();
    this.buildEndCard();
    this.buildErrorBox();
    this.buildExploreHint();
    this.debug = new DebugOverlay(root);

    this.setPanel(this.chapterList, false);
    this.setPanel(this.settings, false);
    this.setPanel(this.help, false);
    this.setPanel(this.selection, false);
  }

  // -------------------------------------------------------------------- gate
  private buildGate(): void {
    this.gate = el('div', 'gate');
    const title = el('h1', 'gate__title', 'Starfall');
    const sub = el('p', 'gate__subtitle', 'The Stolen Design');
    const blurb = el('p', 'gate__blurb',
      'An original, procedurally generated cinematic staged above a desert world: '
      + 'a stolen weapon design, a diplomatic corvette that cannot outrun what is behind it, '
      + 'and one unarmed droid carrying everything that matters.');
    const bar = el('div', 'gate__bar');
    this.gateBar = el('span');
    bar.appendChild(this.gateBar);
    this.gateStatus = el('div', 'gate__status', 'Preparing…');

    this.enterButton = el('button', 'primary gate__enter', 'Enter the Galaxy');
    this.enterButton.disabled = true;
    this.enterButton.addEventListener('click', () => this.cb.onEnter());

    const note = el('div', 'gate__note',
      'Audio starts on this action, as browsers require. Original fan work — every model, texture, '
      + 'voice line, music cue and sound effect here was generated for this project. '
      + 'No footage, assets, recordings or dialogue from any film are used.');

    this.gate.append(title, sub, blurb, bar, this.gateStatus, this.enterButton, note);
    this.root.appendChild(this.gate);
  }

  setProgress(progress: number, label: string): void {
    this.gateBar.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
    this.gateStatus.textContent = label;
  }

  setReady(): void {
    this.enterButton.disabled = false;
    this.gateStatus.textContent = 'Ready';
    this.gateBar.style.width = '100%';
    this.enterButton.focus();
  }

  hideGate(): void {
    this.gate.classList.add('hidden');
    window.setTimeout(() => {
      this.gate.style.display = 'none';
    }, 950);
  }

  // -------------------------------------------------------------- title card
  private buildTitleCard(): void {
    this.titleCard = el('div', 'title-card');
    this.titleIndex = el('div', 'title-card__index', 'CHAPTER I');
    this.titleName = el('h2', 'title-card__title', 'Prologue');
    this.titleSub = el('div', 'title-card__sub', '');
    this.titleCard.append(this.titleIndex, this.titleName, this.titleSub);
    this.root.appendChild(this.titleCard);
  }

  private static ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

  showChapterCard(chapter: ChapterInfo): void {
    this.titleIndex.textContent = `CHAPTER ${UIRoot.ROMAN[chapter.index] ?? chapter.index + 1}`;
    this.titleName.textContent = chapter.title;
    this.titleSub.textContent = chapter.subtitle;
    this.titleCard.classList.add('show');
    window.clearTimeout(this.titleTimer);
    this.titleTimer = window.setTimeout(() => this.titleCard.classList.remove('show'), 5200);
  }

  // --------------------------------------------------------------- transport
  private buildTransport(): void {
    this.transport = el('div', 'transport');

    this.scrubber = el('div', 'scrubber');
    this.scrubber.setAttribute('role', 'slider');
    this.scrubber.setAttribute('aria-label', 'Timeline');
    this.scrubber.tabIndex = 0;
    const track = el('div', 'scrubber__track');
    this.scrubFill = el('div', 'scrubber__fill');
    const marks = el('div', 'scrubber__marks');
    this.scrubHead = el('div', 'scrubber__head');
    this.scrubTip = el('div', 'scrubber__tip', '0:00');
    this.scrubber.append(track, this.scrubFill, marks, this.scrubHead, this.scrubTip);

    for (const c of CHAPTERS.slice(1)) {
      const m = el('div', 'scrubber__mark');
      m.style.left = `${(c.start / CHAPTERS[CHAPTERS.length - 1].end) * 100}%`;
      marks.appendChild(m);
    }

    const seekFromEvent = (e: PointerEvent): number => {
      const rect = this.scrubber.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      return f * this.duration;
    };
    // Drag tracking lives on the window: pointer capture alone is not enough
    // once the pointer leaves the 22-pixel-tall track.
    const onWindowMove = (e: PointerEvent): void => {
      if (!this.scrubbing) return;
      this.cb.onSeek(seekFromEvent(e));
    };
    const endScrub = (): void => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', endScrub);
      window.removeEventListener('pointercancel', endScrub);
      this.cb.onScrubEnd();
    };
    this.scrubber.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.scrubbing = true;
      window.addEventListener('pointermove', onWindowMove);
      window.addEventListener('pointerup', endScrub);
      window.addEventListener('pointercancel', endScrub);
      this.cb.onScrubStart();
      this.cb.onSeek(seekFromEvent(e));
    });
    this.scrubber.addEventListener('pointermove', (e) => {
      const rect = this.scrubber.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      this.scrubTip.style.left = `${f * 100}%`;
      this.scrubTip.textContent = formatClock(f * this.duration);
    });
    this.scrubber.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.cb.onSeek(this.currentTime - 5);
      else if (e.key === 'ArrowRight') this.cb.onSeek(this.currentTime + 5);
      else if (e.key === 'Home') this.cb.onSeek(0);
      else return;
      e.preventDefault();
    });

    const controls = el('div', 'controls');
    this.playButton = el('button', 'icon-btn primary', '▮▮');
    this.playButton.dataset.action = 'play';
    this.playButton.title = 'Play / pause (Space)';
    this.playButton.setAttribute('aria-label', 'Play or pause');
    this.playButton.addEventListener('click', () => this.cb.onPlayToggle());

    const restart = el('button', 'icon-btn', '↺');
    restart.dataset.action = 'restart';
    restart.title = 'Restart (R)';
    restart.setAttribute('aria-label', 'Restart');
    restart.addEventListener('click', () => this.cb.onRestart());

    const back = el('button', 'icon-btn', '«');
    back.dataset.action = 'back';
    back.title = 'Back 10 seconds (←)';
    back.addEventListener('click', () => this.cb.onSeek(this.currentTime - 10));
    const fwd = el('button', 'icon-btn', '»');
    fwd.dataset.action = 'forward';
    fwd.title = 'Forward 10 seconds (→)';
    fwd.addEventListener('click', () => this.cb.onSeek(this.currentTime + 10));

    this.clock = el('div', 'clock', '0:00 / 0:00');
    this.chapterName = el('div', 'chapter-name', 'Prologue');

    const chapterToggle = el('button', undefined, 'Chapters');
    chapterToggle.dataset.action = 'chapters';
    chapterToggle.addEventListener('click', () => {
      const showing = this.chapterList.classList.contains('hidden');
      this.setPanel(this.chapterList, showing);
      if (showing) {
        this.setPanel(this.settings, false);
        this.setPanel(this.help, false);
      }
    });

    this.modeButton = el('button', undefined, 'Explore');
    this.modeButton.dataset.action = 'mode';
    this.modeButton.title = 'Switch between cinematic and explore (E)';
    this.modeButton.addEventListener('click', () => {
      this.cb.onMode(this.mode === 'cinematic' ? 'explore' : 'cinematic');
    });

    const settingsToggle = el('button', undefined, 'Settings');
    settingsToggle.dataset.action = 'settings';
    settingsToggle.addEventListener('click', () => {
      const showing = this.settings.classList.contains('hidden');
      this.setPanel(this.settings, showing);
      if (showing) {
        this.setPanel(this.chapterList, false);
        this.setPanel(this.help, false);
      }
    });

    const helpToggle = el('button', 'icon-btn', '?');
    helpToggle.dataset.action = 'help';
    helpToggle.title = 'Help (H)';
    helpToggle.addEventListener('click', () => {
      const showing = this.help.classList.contains('hidden');
      this.setPanel(this.help, showing);
      if (showing) {
        this.setPanel(this.chapterList, false);
        this.setPanel(this.settings, false);
      }
    });

    const fullscreen = el('button', 'icon-btn', '⛶');
    fullscreen.dataset.action = 'fullscreen';
    fullscreen.title = 'Fullscreen (F)';
    fullscreen.addEventListener('click', () => this.cb.onFullscreen());

    controls.append(
      this.playButton, restart, back, fwd, this.clock,
      el('div', 'controls__spacer'), this.chapterName,
      el('div', 'controls__spacer'),
      chapterToggle, this.modeButton, settingsToggle, helpToggle, fullscreen,
    );

    this.transport.append(this.scrubber, controls);
    this.root.appendChild(this.transport);
  }

  private currentTime = 0;

  setTime(time: number, duration: number): void {
    this.currentTime = time;
    this.duration = duration;
    const f = duration > 0 ? time / duration : 0;
    this.scrubFill.style.width = `${f * 100}%`;
    this.scrubHead.style.left = `${f * 100}%`;
    this.clock.textContent = `${formatClock(time)} / ${formatClock(duration)}`;
    this.scrubber.setAttribute('aria-valuenow', time.toFixed(0));
  }

  setPlaying(playing: boolean): void {
    this.playButton.textContent = playing ? '▮▮' : '▶';
    this.playButton.title = playing ? 'Pause (Space)' : 'Play (Space)';
  }

  setChapter(chapter: ChapterInfo): void {
    this.chapterName.textContent = chapter.title;
    this.chapterButtons.forEach((b, i) => b.classList.toggle('current', i === chapter.index));
  }

  // ------------------------------------------------------------- chapter list
  private buildChapterList(): void {
    this.chapterList = el('div', 'chapter-list');
    this.chapterList.append(el('h2', undefined, 'Chapters'));
    CHAPTERS.forEach((c) => {
      const b = el('button', 'chapter-item');
      const num = el('span', 'chapter-item__num', String(c.index + 1));
      const body = el('span');
      body.append(document.createTextNode(c.title), el('span', 'chapter-item__sub', c.subtitle));
      const time = el('span', 'chapter-item__time', formatClock(c.start));
      b.append(num, body, time);
      b.addEventListener('click', () => this.cb.onChapter(c));
      this.chapterButtons.push(b);
      this.chapterList.appendChild(b);
    });
    this.root.appendChild(this.chapterList);
  }

  // ---------------------------------------------------------------- settings
  private buildSettings(): void {
    this.settings = el('div', 'panel');
    this.settings.append(el('h2', undefined, 'Settings'));

    this.settings.append(el('h3', undefined, 'Mix'));
    const volumes: Array<['master' | 'music' | 'sfx' | 'narration', string, number]> = [
      ['master', 'Master', 0.85],
      ['narration', 'Narration', 1.0],
      ['music', 'Music', 0.62],
      ['sfx', 'Effects', 0.8],
    ];
    for (const [channel, label, initial] of volumes) {
      const field = el('div', 'field');
      const l = el('label', undefined, label);
      l.htmlFor = `vol-${channel}`;
      const input = el('input');
      input.type = 'range';
      input.id = `vol-${channel}`;
      input.min = '0';
      input.max = '100';
      input.value = String(Math.round(initial * 100));
      const value = el('span', 'value', `${Math.round(initial * 100)}`);
      input.addEventListener('input', () => {
        value.textContent = input.value;
        this.cb.onVolume(channel, Number(input.value) / 100);
      });
      field.append(l, input, value);
      this.settings.appendChild(field);
    }

    this.settings.append(el('h3', undefined, 'Display'));
    const qField = el('div', 'field');
    const qLabel = el('label', undefined, 'Quality');
    qLabel.htmlFor = 'quality';
    this.qualitySelect = el('select');
    this.qualitySelect.id = 'quality';
    for (const level of ['low', 'medium', 'high'] as QualityLevel[]) {
      const opt = el('option', undefined, QUALITY_PRESETS[level].label);
      opt.value = level;
      this.qualitySelect.appendChild(opt);
    }
    this.qualitySelect.addEventListener('change', () => this.cb.onQuality(this.qualitySelect.value as QualityLevel));
    qField.append(qLabel, this.qualitySelect);
    this.settings.appendChild(qField);

    const subField = el('div', 'field');
    subField.append(el('label', undefined, 'Subtitles'));
    this.subtitleSwitch = el('button', 'switch on');
    this.subtitleSwitch.setAttribute('aria-label', 'Toggle subtitles');
    this.subtitleSwitch.addEventListener('click', () => {
      const on = !this.subtitleSwitch.classList.contains('on');
      this.setSubtitleSwitch(on);
      this.cb.onSubtitles(on);
    });
    subField.appendChild(this.subtitleSwitch);
    this.settings.appendChild(subField);

    const debugField = el('div', 'field');
    debugField.append(el('label', undefined, 'Debug overlay'));
    const debugSwitch = el('button', 'switch');
    debugSwitch.setAttribute('aria-label', 'Toggle debug overlay');
    debugSwitch.addEventListener('click', () => {
      const on = !debugSwitch.classList.contains('on');
      debugSwitch.classList.toggle('on', on);
      this.cb.onDebug(on);
    });
    debugField.appendChild(debugSwitch);
    this.settings.appendChild(debugField);
    this.debugSwitch = debugSwitch;

    this.root.appendChild(this.settings);
  }

  private debugSwitch!: HTMLButtonElement;

  setSubtitleSwitch(on: boolean): void {
    this.subtitleSwitch.classList.toggle('on', on);
  }

  setQualitySelection(level: QualityLevel): void {
    this.qualitySelect.value = level;
  }

  setDebugSwitch(on: boolean): void {
    this.debugSwitch.classList.toggle('on', on);
  }

  // -------------------------------------------------------------------- help
  private buildHelp(): void {
    this.help = el('div', 'panel help');
    this.help.append(el('h2', undefined, 'Controls'));
    const rows: Array<[string, string]> = [
      ['Space', 'Play / pause'],
      ['← / →', 'Skip 10 seconds'],
      [', / .', 'Step one second'],
      ['R', 'Restart from the top'],
      ['1 – 8', 'Jump to a chapter'],
      ['E', 'Cinematic / Explore mode'],
      ['C', 'Subtitles on / off'],
      ['F', 'Fullscreen'],
      ['H', 'This panel'],
      ['`', 'Debug overlay'],
    ];
    for (const [key, desc] of rows) {
      const row = el('div', 'help__row');
      const k = el('kbd', undefined, key);
      row.append(k, el('span', undefined, desc));
      this.help.appendChild(row);
    }
    this.help.append(el('h3', undefined, 'Explore mode'));
    for (const [key, desc] of [
      ['Drag', 'Orbit the camera'],
      ['Wheel', 'Zoom / dolly'],
      ['W A S D', 'Fly the camera'],
      ['Q / Z', 'Down / up'],
      ['Shift', 'Move faster'],
      ['Click', 'Select a ship, droid or character'],
    ] as Array<[string, string]>) {
      const row = el('div', 'help__row');
      row.append(el('kbd', undefined, key), el('span', undefined, desc));
      this.help.appendChild(row);
    }
    this.help.append(el('div', 'legal',
      'Starfall: The Stolen Design is an original, non-commercial fan work. It is not associated '
      + 'with or endorsed by Lucasfilm or The Walt Disney Company. Every mesh, texture, animation, '
      + 'music cue, sound effect and narration line is generated by this project\'s own code and '
      + 'tools. No film footage, model, texture, recording, score or dialogue is reproduced, and no '
      + 'performer\'s voice is imitated.'));
    this.root.appendChild(this.help);
  }

  // --------------------------------------------------------------- selection
  private buildSelection(): void {
    this.selection = el('div', 'selection');
    this.selectionName = el('h3', 'selection__name', '');
    this.selectionClass = el('div', 'selection__class', '');
    this.selectionBody = el('div', 'selection__body', '');
    this.selectionStats = el('div', 'selection__stats');
    const actions = el('div', 'selection__actions');
    this.followButton = el('button', undefined, 'Follow');
    this.followButton.addEventListener('click', () => this.cb.onFollow());
    const inspect = el('button', undefined, 'Inspect');
    inspect.addEventListener('click', () => this.cb.onInspect());
    const back = el('button', undefined, 'Return to camera');
    back.addEventListener('click', () => this.cb.onReturnToCinematic());
    const clear = el('button', 'icon-btn', '×');
    clear.title = 'Clear selection';
    clear.addEventListener('click', () => this.cb.onClearSelection());
    actions.append(this.followButton, inspect, back, clear);
    this.selection.append(this.selectionName, this.selectionClass, this.selectionBody, this.selectionStats, actions);
    this.root.appendChild(this.selection);
  }

  showSelection(dossier: ObjectDossier, stats: Array<[string, string]>): void {
    this.selectionName.textContent = dossier.name;
    this.selectionClass.textContent = dossier.classification;
    this.selectionBody.textContent = dossier.description;
    this.selectionStats.replaceChildren();
    for (const [k, v] of stats) {
      this.selectionStats.append(el('span', undefined, k), el('span', undefined, v));
    }
    this.setPanel(this.selection, true);
  }

  hideSelection(): void {
    this.setPanel(this.selection, false);
  }

  setFollowActive(active: boolean): void {
    this.followButton.classList.toggle('active', active);
  }

  // ---------------------------------------------------------------- end card
  private buildEndCard(): void {
    this.endCard = el('div', 'end-card');
    this.endLine = el('p', 'end-card__line', '');
    const actions = el('div', 'end-card__actions');
    const explore = el('button', 'primary', 'Enter Explore Mode');
    explore.addEventListener('click', () => {
      this.cb.onMode('explore');
      this.showEndCard(false);
    });
    const replay = el('button', undefined, 'Watch Again');
    replay.addEventListener('click', () => {
      this.cb.onRestart();
      this.showEndCard(false);
    });
    actions.append(explore, replay);
    this.endCard.append(this.endLine, actions);
    this.root.appendChild(this.endCard);
  }

  showEndCard(show: boolean, line = ''): void {
    if (line) this.endLine.textContent = line;
    this.endCard.classList.toggle('show', show);
  }

  // ------------------------------------------------------------------- error
  private buildErrorBox(): void {
    this.errorBox = el('div', 'error-boundary hidden');
    this.errorBox.append(el('h2', undefined, 'Something went wrong'));
    this.errorText = el('pre');
    const actions = el('div', 'error-boundary__actions');
    const dismiss = el('button', undefined, 'Dismiss');
    dismiss.addEventListener('click', () => this.errorBox.classList.add('hidden'));
    const reload = el('button', 'primary', 'Reload');
    reload.addEventListener('click', () => window.location.reload());
    actions.append(dismiss, reload);
    this.errorBox.append(this.errorText, actions);
    this.root.appendChild(this.errorBox);
  }

  showError(message: string): void {
    this.errorText.textContent = `${this.errorText.textContent ?? ''}${message}\n`.slice(-4000);
    this.errorBox.classList.remove('hidden');
  }

  // ------------------------------------------------------------ explore hint
  private buildExploreHint(): void {
    this.exploreHint = el('div', 'explore-hint hidden',
      'Explore — drag to orbit, WASD to fly, click a subject');
    this.root.appendChild(this.exploreHint);
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.modeButton.textContent = mode === 'cinematic' ? 'Explore' : 'Cinematic';
    this.modeButton.classList.toggle('active', mode === 'explore');
    this.exploreHint.classList.toggle('hidden', mode !== 'explore');
    if (mode === 'cinematic') this.hideSelection();
  }

  // ------------------------------------------------------------------ chrome
  private setPanel(panel: HTMLElement, show: boolean): void {
    panel.classList.toggle('hidden', !show);
  }

  toggleHelp(): void {
    this.setPanel(this.help, this.help.classList.contains('hidden'));
  }

  /** Fade the transport out during uninterrupted playback. */
  noteActivity(): void {
    this.idleTimer = 0;
    this.transport.classList.remove('dimmed');
  }

  updateChrome(dt: number, playing: boolean, mode: ViewMode): void {
    if (!playing || mode === 'explore' || this.scrubbing) {
      this.transport.classList.remove('dimmed');
      this.idleTimer = 0;
      return;
    }
    this.idleTimer += dt;
    if (this.idleTimer > 3.6) this.transport.classList.add('dimmed');
  }

  get panelsOpen(): boolean {
    return !this.chapterList.classList.contains('hidden')
      || !this.settings.classList.contains('hidden')
      || !this.help.classList.contains('hidden');
  }
}
