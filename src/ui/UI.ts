import { CHAPTERS } from '../timeline/Script';
import { QUALITY_ORDER, QUALITY_TIERS, isQualityName, type QualityName } from '../core/Quality';

/**
 * Interface shell.
 *
 * Plain DOM, no framework. The transport auto-hides during cinematic
 * playback so it never sits on top of the picture, and every control is
 * reachable from the keyboard.
 */

export interface UICallbacks {
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onChapter: (index: number) => void;
  onToggleExplore: () => void;
  onToggleSubtitles: () => void;
  onVolume: (bus: 'master' | 'music' | 'effects' | 'narration', value: number) => void;
  onQuality: (q: QualityName) => void;
  onFullscreen: () => void;
  onToggleDebug: () => void;
  onExploreAction: (action: 'follow' | 'inspect' | 'return') => void;
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

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class UI {
  readonly root: HTMLDivElement;
  readonly hud: HTMLDivElement;
  readonly subtitleHost: HTMLDivElement;

  private cb: UICallbacks;
  private duration: number;
  private playBtn: HTMLButtonElement;
  private exploreBtn: HTMLButtonElement;
  private subtitlesBtn: HTMLButtonElement;
  private debugBtn: HTMLButtonElement;
  private scrub: HTMLDivElement;
  private scrubFill: HTMLDivElement;
  private scrubHead: HTMLDivElement;
  private scrubTooltip: HTMLDivElement;
  private timeLabel: HTMLDivElement;
  private chapterSelect: HTMLSelectElement;
  private chapterTag: HTMLDivElement;
  private mixer: HTMLDivElement;
  private inspector: HTMLDivElement;
  private inspectorName: HTMLHeadingElement;
  private inspectorKicker: HTMLDivElement;
  private inspectorBody: HTMLParagraphElement;
  private inspectorStats: HTMLDivElement;
  private hoverLabel: HTMLDivElement;
  private exploreBadge: HTMLDivElement;
  private helpModal: HTMLDivElement;
  private toasts: HTMLDivElement;
  private debugPanel: HTMLDivElement;
  private idleTimer = 0;
  private hudHidden = false;
  private pointerInsideControls = false;

  constructor(host: HTMLElement, duration: number, callbacks: UICallbacks) {
    this.cb = callbacks;
    this.duration = duration;
    this.root = el('div');
    host.appendChild(this.root);

    this.hud = el('div', 'hud');
    this.root.appendChild(this.hud);

    // ------------------------------------------------------- chapter tag
    this.chapterTag = el('div', 'chapter-tag');
    this.chapterTag.innerHTML =
      '<span class="chapter-tag__num">01</span><span class="chapter-tag__name">Prologue</span>';
    this.hud.appendChild(this.chapterTag);

    // ----------------------------------------------------------- toasts
    this.toasts = el('div', 'toasts');
    this.hud.appendChild(this.toasts);

    // Subtitles live outside the auto-hiding HUD so they never disappear
    // with the transport bar.
    this.subtitleHost = el('div');
    this.root.appendChild(this.subtitleHost);

    // -------------------------------------------------------- transport
    const transport = el('div', 'transport');
    transport.addEventListener('pointerenter', () => (this.pointerInsideControls = true));
    transport.addEventListener('pointerleave', () => (this.pointerInsideControls = false));
    this.hud.appendChild(transport);

    this.scrub = el('div', 'scrub');
    const track = el('div', 'scrub__track');
    this.scrubFill = el('div', 'scrub__fill');
    track.appendChild(this.scrubFill);
    const marks = el('div', 'scrub__marks');
    for (const c of CHAPTERS) {
      const mark = el('div', 'scrub__mark');
      mark.style.left = `${(c.start / duration) * 100}%`;
      mark.title = c.title;
      marks.appendChild(mark);
    }
    this.scrubHead = el('div', 'scrub__head');
    this.scrubTooltip = el('div', 'scrub__tooltip', '0:00');
    this.scrub.append(track, marks, this.scrubHead, this.scrubTooltip);
    transport.appendChild(this.scrub);
    this.bindScrub();

    const controls = el('div', 'controls');
    transport.appendChild(controls);

    this.playBtn = el('button', 'btn btn--primary btn--icon');
    this.playBtn.innerHTML = '❚❚';
    this.playBtn.title = 'Play / pause (Space)';
    this.playBtn.setAttribute('aria-label', 'Play or pause');
    this.playBtn.addEventListener('click', () => this.cb.onPlayPause());
    controls.appendChild(this.playBtn);

    const restart = el('button', 'btn btn--icon');
    restart.innerHTML = '↺';
    restart.title = 'Restart (R)';
    restart.addEventListener('click', () => this.cb.onRestart());
    controls.appendChild(restart);

    this.timeLabel = el('div', 'time', '0:00 / 0:00');
    controls.appendChild(this.timeLabel);

    this.chapterSelect = el('select', 'select');
    this.chapterSelect.title = 'Jump to chapter';
    CHAPTERS.forEach((c) => {
      const opt = el('option');
      opt.value = String(c.index);
      opt.textContent = `${String(c.index + 1).padStart(2, '0')} · ${c.title}`;
      this.chapterSelect.appendChild(opt);
    });
    this.chapterSelect.addEventListener('change', () =>
      this.cb.onChapter(Number(this.chapterSelect.value)),
    );
    controls.appendChild(this.chapterSelect);

    controls.appendChild(el('div', 'spacer'));

    this.exploreBtn = el('button', 'btn', 'Explore');
    this.exploreBtn.title = 'Toggle explore mode (E)';
    this.exploreBtn.addEventListener('click', () => this.cb.onToggleExplore());
    controls.appendChild(this.exploreBtn);

    this.subtitlesBtn = el('button', 'btn is-active', 'CC');
    this.subtitlesBtn.title = 'Toggle subtitles (C)';
    this.subtitlesBtn.addEventListener('click', () => this.cb.onToggleSubtitles());
    controls.appendChild(this.subtitlesBtn);

    const mixerBtn = el('button', 'btn', 'Audio');
    mixerBtn.title = 'Mixer and quality';
    controls.appendChild(mixerBtn);

    const helpBtn = el('button', 'btn btn--icon', '?');
    helpBtn.title = 'Help (H)';
    controls.appendChild(helpBtn);

    const fsBtn = el('button', 'btn btn--icon', '⛶');
    fsBtn.title = 'Fullscreen (F)';
    fsBtn.addEventListener('click', () => this.cb.onFullscreen());
    controls.appendChild(fsBtn);

    this.debugBtn = el('button', 'btn btn--icon', '◈');
    this.debugBtn.title = 'Debug overlay (D)';
    this.debugBtn.addEventListener('click', () => this.cb.onToggleDebug());
    controls.appendChild(this.debugBtn);

    // ------------------------------------------------------------ mixer
    this.mixer = el('div', 'pane');
    this.mixer.addEventListener('pointerenter', () => (this.pointerInsideControls = true));
    this.mixer.addEventListener('pointerleave', () => (this.pointerInsideControls = false));
    this.hud.appendChild(this.mixer);
    mixerBtn.addEventListener('click', () => {
      this.mixer.classList.toggle('open');
      mixerBtn.classList.toggle('is-active', this.mixer.classList.contains('open'));
    });
    this.buildMixer();

    // -------------------------------------------------------- inspector
    this.inspector = el('div', 'inspector');
    this.inspectorKicker = el('div', 'inspector__kicker', '');
    this.inspectorName = el('h3', 'inspector__name', '');
    this.inspectorBody = el('p', 'inspector__body', '');
    this.inspectorStats = el('div', 'inspector__stats', '');
    const actions = el('div', 'inspector__actions');
    (['follow', 'inspect', 'return'] as const).forEach((a) => {
      const b = el('button', 'btn', a === 'return' ? 'Return to cinematic' : a[0].toUpperCase() + a.slice(1));
      b.addEventListener('click', () => this.cb.onExploreAction(a));
      actions.appendChild(b);
    });
    this.inspector.append(
      this.inspectorKicker,
      this.inspectorName,
      this.inspectorBody,
      this.inspectorStats,
      actions,
    );
    this.hud.appendChild(this.inspector);

    this.hoverLabel = el('div', 'hover-label');
    this.root.appendChild(this.hoverLabel);

    this.exploreBadge = el('div', 'explore-badge', 'Explore mode · drag to orbit · WASD to move');
    this.hud.appendChild(this.exploreBadge);

    // ----------------------------------------------------------- debug
    this.debugPanel = el('div', 'debug');
    this.hud.appendChild(this.debugPanel);

    // ------------------------------------------------------------ help
    this.helpModal = this.buildHelp();
    this.root.appendChild(this.helpModal);
    helpBtn.addEventListener('click', () => this.helpModal.classList.toggle('open'));

    window.addEventListener('pointermove', () => this.wake());
    window.addEventListener('pointerdown', () => this.wake());
  }

  private buildMixer(): void {
    this.mixer.appendChild(el('p', 'pane__title', 'Mix'));
    const sliders: Array<[string, 'master' | 'music' | 'effects' | 'narration', number]> = [
      ['Master', 'master', 85],
      ['Music', 'music', 62],
      ['Effects', 'effects', 80],
      ['Narration', 'narration', 100],
    ];
    for (const [label, bus, initial] of sliders) {
      const row = el('div', 'row');
      const lab = el('label', undefined, label);
      const input = el('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.value = String(initial);
      const val = el('div', 'val', `${initial}`);
      input.addEventListener('input', () => {
        val.textContent = input.value;
        this.cb.onVolume(bus, Number(input.value) / 100);
      });
      row.append(lab, input, val);
      this.mixer.appendChild(row);
    }

    this.mixer.appendChild(el('div', 'divider'));
    this.mixer.appendChild(el('p', 'pane__title', 'Rendering'));
    const qrow = el('div', 'row');
    qrow.appendChild(el('label', undefined, 'Quality'));
    const qsel = el('select', 'select');
    QUALITY_ORDER.forEach((q) => {
      const opt = el('option');
      opt.value = q;
      opt.textContent = QUALITY_TIERS[q].label;
      qsel.appendChild(opt);
    });
    qsel.addEventListener('change', () => {
      if (isQualityName(qsel.value)) this.cb.onQuality(qsel.value);
    });
    qsel.id = 'quality-select';
    qrow.appendChild(qsel);
    this.mixer.appendChild(qrow);
    this.mixer.appendChild(
      el(
        'div',
        'hint',
        'A short benchmark picks a tier on first run. Changing it rebuilds the scene, which takes a moment.',
      ),
    );
  }

  private buildHelp(): HTMLDivElement {
    const modal = el('div', 'modal');
    const card = el('div', 'modal__card');
    const close = el('button', 'btn modal__close', 'Close');
    close.addEventListener('click', () => modal.classList.remove('open'));
    card.appendChild(close);
    card.appendChild(el('h2', undefined, 'Starfall — controls'));
    card.appendChild(
      el(
        'p',
        undefined,
        'An original interactive cinematic. Watch it straight through, or pause at any moment and walk around inside the shot.',
      ),
    );
    card.appendChild(el('h3', undefined, 'Transport'));
    const keys1 = el('ul', 'keys');
    const rows: Array<[string, string]> = [
      ['Space', 'Play / pause'],
      ['R', 'Restart from the beginning'],
      ['← / →', 'Skip 5 seconds'],
      [', / .', 'Previous / next chapter'],
      ['E', 'Toggle explore mode'],
      ['C', 'Subtitles on / off'],
      ['F', 'Fullscreen'],
      ['H', 'This panel'],
      ['D', 'Debug overlay'],
      ['1 – 8', 'Jump to chapter'],
    ];
    for (const [k, v] of rows) {
      const li = el('li');
      li.innerHTML = `<span>${v}</span><kbd>${k}</kbd>`;
      keys1.appendChild(li);
    }
    card.appendChild(keys1);
    card.appendChild(el('h3', undefined, 'Explore mode'));
    const keys2 = el('ul', 'keys');
    const rows2: Array<[string, string]> = [
      ['Drag', 'Orbit the camera'],
      ['Wheel', 'Move closer or further'],
      ['W A S D', 'Fly through the scene'],
      ['Q / E', 'Down / up'],
      ['Shift', 'Move faster'],
      ['Click', 'Select a ship, character or prop'],
    ];
    for (const [k, v] of rows2) {
      const li = el('li');
      li.innerHTML = `<span>${v}</span><kbd>${k}</kbd>`;
      keys2.appendChild(li);
    }
    card.appendChild(keys2);
    card.appendChild(el('h3', undefined, 'About'));
    card.appendChild(
      el(
        'p',
        undefined,
        'Every model, texture, sound effect, musical cue and line of narration in this project was generated procedurally or written for it. It is an original homage and contains no footage, audio, artwork or text from any film.',
      ),
    );
    modal.appendChild(card);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
    return modal;
  }

  private bindScrub(): void {
    const seekFromEvent = (e: PointerEvent): void => {
      const rect = this.scrub.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      this.cb.onSeek(k * this.duration);
    };
    let dragging = false;
    this.scrub.addEventListener('pointerdown', (e) => {
      dragging = true;
      this.scrub.setPointerCapture(e.pointerId);
      seekFromEvent(e);
    });
    this.scrub.addEventListener('pointermove', (e) => {
      const rect = this.scrub.getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      this.scrubTooltip.style.left = `${k * 100}%`;
      this.scrubTooltip.textContent = formatTime(k * this.duration);
      if (dragging) seekFromEvent(e);
    });
    this.scrub.addEventListener('pointerup', (e) => {
      dragging = false;
      this.scrub.releasePointerCapture(e.pointerId);
    });
  }

  /* ------------------------------------------------------------ public */

  setPlaying(playing: boolean): void {
    this.playBtn.innerHTML = playing ? '❚❚' : '▶';
  }

  setExplore(active: boolean): void {
    this.exploreBtn.classList.toggle('is-active', active);
    this.exploreBadge.classList.toggle('open', active);
    if (!active) this.setSelection(null);
  }

  setSubtitles(on: boolean): void {
    this.subtitlesBtn.classList.toggle('is-active', on);
  }

  setDebug(on: boolean): void {
    this.debugPanel.classList.toggle('open', on);
    this.debugBtn.classList.toggle('is-active', on);
  }

  setDebugText(html: string): void {
    this.debugPanel.innerHTML = html;
  }

  setQuality(q: QualityName): void {
    const sel = document.getElementById('quality-select') as HTMLSelectElement | null;
    if (sel) sel.value = q;
  }

  setChapter(index: number, title: string): void {
    this.chapterTag.innerHTML = `<span class="chapter-tag__num">${String(index + 1).padStart(2, '0')}</span><span class="chapter-tag__name">${title}</span>`;
    if (Number(this.chapterSelect.value) !== index) this.chapterSelect.value = String(index);
  }

  setTime(time: number): void {
    const k = this.duration > 0 ? time / this.duration : 0;
    this.scrubFill.style.width = `${k * 100}%`;
    this.scrubHead.style.left = `${k * 100}%`;
    this.timeLabel.textContent = `${formatTime(time)} / ${formatTime(this.duration)}`;
  }

  setSelection(
    selection: { name: string; kicker: string; description: string; stats?: string } | null,
  ): void {
    if (!selection) {
      this.inspector.classList.remove('open');
      return;
    }
    this.inspector.classList.add('open');
    this.inspectorKicker.textContent = selection.kicker;
    this.inspectorName.textContent = selection.name;
    this.inspectorBody.textContent = selection.description;
    this.inspectorStats.textContent = selection.stats ?? '';
  }

  setHover(label: string | null, x: number, y: number): void {
    if (!label) {
      this.hoverLabel.classList.remove('open');
      return;
    }
    this.hoverLabel.classList.add('open');
    this.hoverLabel.textContent = label;
    this.hoverLabel.style.left = `${x}px`;
    this.hoverLabel.style.top = `${y}px`;
  }

  toast(message: string, kind: 'info' | 'error' = 'info', ms = 3200): void {
    const t = el('div', `toast${kind === 'error' ? ' toast--error' : ''}`, message);
    this.toasts.appendChild(t);
    window.setTimeout(() => {
      t.style.opacity = '0';
      window.setTimeout(() => t.remove(), 400);
    }, ms);
  }

  toggleHelp(): void {
    this.helpModal.classList.toggle('open');
  }

  private wake(): void {
    this.idleTimer = 0;
    if (this.hudHidden) {
      this.hudHidden = false;
      this.hud.classList.remove('dimmed');
      document.body.classList.remove('hud-hidden');
    }
  }

  /** Auto-hide the transport while the cinematic plays undisturbed. */
  update(dt: number, playing: boolean, explore: boolean): void {
    if (!playing || explore || this.pointerInsideControls || this.helpModal.classList.contains('open')) {
      this.idleTimer = 0;
      if (this.hudHidden) this.wake();
      return;
    }
    this.idleTimer += dt;
    if (this.idleTimer > 3.5 && !this.hudHidden) {
      this.hudHidden = true;
      this.hud.classList.add('dimmed');
      document.body.classList.add('hud-hidden');
    }
  }
}
