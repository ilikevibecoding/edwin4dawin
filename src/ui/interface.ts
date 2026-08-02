/**
 * Interface controller.
 *
 * Owns everything in the DOM: transport, chapter selector, scrubber, mixer,
 * settings, subtitles, help, inspector and the diagnostics overlay. It knows
 * nothing about Three.js — the application passes callbacks in and pushes
 * state out, which keeps the render loop free of DOM work beyond a handful of
 * text updates.
 */

import { formatTime } from '../core/math';
import type { Chapter } from '../show/timeline';
import type { QualityLevel } from '../core/quality';
import { QUALITY_BLURB } from '../core/quality';
import type { Selectable } from '../show/world';

export interface UiCallbacks {
  onPlayToggle(): void;
  onRestart(): void;
  onSeek(seconds: number): void;
  onChapter(index: number): void;
  onMode(mode: 'cinematic' | 'explore'): void;
  onVolume(bus: 'master' | 'narration' | 'music' | 'sfx', value: number): void;
  onSubtitles(on: boolean): void;
  onQuality(level: QualityLevel): void;
  onDebug(on: boolean): void;
  onGrain(on: boolean): void;
  onDepthCue(on: boolean): void;
  onExploreAction(action: 'follow' | 'inspect' | 'return'): void;
  onFullscreen(): void;
  onEnter(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export class Interface {
  private cb: UiCallbacks;
  private duration = 1;
  private chapters: Chapter[] = [];
  private scrubbing = false;
  private subtitleEl = $('subtitles');
  private lastSubtitleId = '';
  private subtitlesOn = true;
  private uiHidden = false;

  constructor(cb: UiCallbacks) {
    this.cb = cb;
    this.wire();
  }

  /* ------------------------------------------------------------- setup */

  setChapters(chapters: Chapter[], duration: number): void {
    this.chapters = chapters;
    this.duration = duration;
    const sel = $<HTMLSelectElement>('sel-chapter');
    sel.innerHTML = '';
    for (const c of chapters) {
      const opt = document.createElement('option');
      opt.value = String(c.index);
      opt.textContent = `${c.index + 1}. ${c.title}`;
      sel.appendChild(opt);
    }
    const marks = $('scrub-marks');
    marks.innerHTML = '';
    for (const c of chapters) {
      if (c.index === 0) continue;
      const i = document.createElement('i');
      i.style.left = `${(c.start / duration) * 100}%`;
      marks.appendChild(i);
    }
    $('time-readout').textContent = `0:00 / ${formatTime(duration)}`;
  }

  private wire(): void {
    $('btn-play').addEventListener('click', () => this.cb.onPlayToggle());
    $('btn-restart').addEventListener('click', () => this.cb.onRestart());
    $('btn-fullscreen').addEventListener('click', () => this.cb.onFullscreen());
    $('btn-enter').addEventListener('click', () => this.cb.onEnter());

    $<HTMLSelectElement>('sel-chapter').addEventListener('change', (e) => {
      this.cb.onChapter(Number((e.target as HTMLSelectElement).value));
    });

    $('mode-cinematic').addEventListener('click', () => this.cb.onMode('cinematic'));
    $('mode-explore').addEventListener('click', () => this.cb.onMode('explore'));

    // Popovers are mutually exclusive.
    const togglePopover = (id: string, button: string) => {
      const el = $(id);
      const open = el.hidden === true;
      for (const other of ['mixer', 'settings']) $(other).hidden = true;
      for (const other of ['btn-audio', 'btn-settings']) $(other).classList.remove('active');
      el.hidden = !open;
      $(button).classList.toggle('active', open);
    };
    $('btn-audio').addEventListener('click', () => togglePopover('mixer', 'btn-audio'));
    $('btn-settings').addEventListener('click', () => togglePopover('settings', 'btn-settings'));

    $('btn-help').addEventListener('click', () => this.toggleHelp());
    $('help-close').addEventListener('click', () => this.toggleHelp(false));

    $('btn-cc').addEventListener('click', () => this.setSubtitles(!this.subtitlesOn, true));
    $<HTMLInputElement>('chk-subs').addEventListener('change', (e) => {
      this.setSubtitles((e.target as HTMLInputElement).checked, true);
    });
    $<HTMLInputElement>('chk-debug').addEventListener('change', (e) => {
      const on = (e.target as HTMLInputElement).checked;
      $('debug').hidden = !on;
      this.cb.onDebug(on);
    });
    $<HTMLInputElement>('chk-grain').addEventListener('change', (e) =>
      this.cb.onGrain((e.target as HTMLInputElement).checked),
    );
    $<HTMLInputElement>('chk-dof').addEventListener('change', (e) =>
      this.cb.onDepthCue((e.target as HTMLInputElement).checked),
    );
    $<HTMLSelectElement>('sel-quality').addEventListener('change', (e) => {
      const level = (e.target as HTMLSelectElement).value as QualityLevel;
      $('quality-hint').textContent = QUALITY_BLURB[level];
      this.cb.onQuality(level);
    });

    for (const [id, bus] of [
      ['vol-master', 'master'],
      ['vol-narration', 'narration'],
      ['vol-music', 'music'],
      ['vol-sfx', 'sfx'],
    ] as Array<[string, 'master' | 'narration' | 'music' | 'sfx']>) {
      const input = $<HTMLInputElement>(id);
      const out = input.parentElement!.querySelector('output')!;
      input.addEventListener('input', () => {
        out.textContent = input.value;
        this.cb.onVolume(bus, Number(input.value) / 100);
      });
    }

    /* --- scrubber --- */
    const scrubber = $('scrubber');
    const tooltip = $('scrub-tooltip');
    const positionFromEvent = (e: PointerEvent | MouseEvent) => {
      const rect = scrubber.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    };
    scrubber.addEventListener('pointerdown', (e) => {
      this.scrubbing = true;
      scrubber.setPointerCapture(e.pointerId);
      this.cb.onSeek(positionFromEvent(e) * this.duration);
    });
    scrubber.addEventListener('pointermove', (e) => {
      const f = positionFromEvent(e);
      tooltip.hidden = false;
      tooltip.style.left = `${f * 100}%`;
      const t = f * this.duration;
      const chapter = this.chapters.find((c) => t >= c.start && t < c.end) ?? this.chapters[0];
      tooltip.textContent = `${formatTime(t)} · ${chapter?.title ?? ''}`;
      if (this.scrubbing) this.cb.onSeek(t);
    });
    scrubber.addEventListener('pointerleave', () => {
      tooltip.hidden = true;
    });
    const endScrub = (e: PointerEvent) => {
      if (!this.scrubbing) return;
      this.scrubbing = false;
      try {
        scrubber.releasePointerCapture(e.pointerId);
      } catch {
        /* pointer already released */
      }
    };
    scrubber.addEventListener('pointerup', endScrub);
    scrubber.addEventListener('pointercancel', endScrub);
    scrubber.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.cb.onSeek(this.currentTime - 5);
      if (e.key === 'ArrowRight') this.cb.onSeek(this.currentTime + 5);
    });

    /* --- inspector --- */
    $('inspector-close').addEventListener('click', () => this.showInspector(null));
    $('act-follow').addEventListener('click', () => this.cb.onExploreAction('follow'));
    $('act-inspect').addEventListener('click', () => this.cb.onExploreAction('inspect'));
    $('act-return').addEventListener('click', () => this.cb.onExploreAction('return'));

    $('fatal-reload').addEventListener('click', () => location.reload());

    $('quality-hint').textContent = QUALITY_BLURB.medium;
  }

  private currentTime = 0;

  /* ---------------------------------------------------------- transport */

  setPlaying(playing: boolean): void {
    $('app').classList.toggle('playing', playing);
  }

  setTime(t: number): void {
    this.currentTime = t;
    const f = this.duration > 0 ? t / this.duration : 0;
    $('scrub-fill').style.width = `${f * 100}%`;
    $('scrub-head').style.left = `${f * 100}%`;
    $('time-readout').textContent = `${formatTime(t)} / ${formatTime(this.duration)}`;
    $('scrubber').setAttribute('aria-valuenow', String(Math.round(f * 100)));
  }

  setChapter(c: Chapter): void {
    $('chapter-index').textContent = String(c.index + 1);
    $('chapter-title').textContent = c.title;
    const sel = $<HTMLSelectElement>('sel-chapter');
    if (sel.value !== String(c.index)) sel.value = String(c.index);
  }

  setBeat(label: string): void {
    $('beat-readout').textContent = label;
  }

  setMode(mode: 'cinematic' | 'explore'): void {
    $('mode-cinematic').classList.toggle('active', mode === 'cinematic');
    $('mode-explore').classList.toggle('active', mode === 'explore');
    $('app').classList.toggle('explore', mode === 'explore');
    $('explore-hint').hidden = mode !== 'explore';
    if (mode === 'cinematic') this.showInspector(null);
  }

  /* --------------------------------------------------------- subtitles */

  setSubtitles(on: boolean, notify = false): void {
    this.subtitlesOn = on;
    $('btn-cc').classList.toggle('active', on);
    $<HTMLInputElement>('chk-subs').checked = on;
    if (!on) this.subtitleEl.classList.remove('visible');
    if (notify) this.cb.onSubtitles(on);
  }

  get subtitlesEnabled(): boolean {
    return this.subtitlesOn;
  }

  showSubtitle(id: string, speaker: string | null, text: string): void {
    if (!this.subtitlesOn) {
      this.subtitleEl.classList.remove('visible');
      return;
    }
    if (id !== this.lastSubtitleId) {
      this.lastSubtitleId = id;
      this.subtitleEl.innerHTML = speaker
        ? `<span class="speaker">${escapeHtml(speaker)}</span>${escapeHtml(text)}`
        : escapeHtml(text);
    }
    this.subtitleEl.classList.add('visible');
  }

  hideSubtitle(): void {
    this.subtitleEl.classList.remove('visible');
    this.lastSubtitleId = '';
  }

  /* --------------------------------------------------------- inspector */

  showInspector(s: Selectable | null): void {
    const panel = $('inspector');
    if (!s) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    $('inspector-title').textContent = s.title;
    $('inspector-kind').textContent = s.kind;
    $('inspector-body').textContent = s.blurb;
    const facts = $('inspector-facts');
    facts.innerHTML = '';
    for (const [k, v] of s.facts) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      facts.append(dt, dd);
    }
  }

  showHoverLabel(text: string | null, x: number, y: number): void {
    const el = $('hover-label');
    if (!text) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  /* -------------------------------------------------------------- misc */

  toggleHelp(force?: boolean): void {
    const el = $('help');
    el.hidden = force === undefined ? !el.hidden : !force;
  }

  toggleUi(): void {
    this.uiHidden = !this.uiHidden;
    $('app').classList.toggle('ui-hidden', this.uiHidden);
  }

  setQuality(level: QualityLevel): void {
    $<HTMLSelectElement>('sel-quality').value = level;
    $('quality-hint').textContent = QUALITY_BLURB[level];
  }

  setVolumes(v: { master: number; narration: number; music: number; sfx: number }): void {
    const set = (id: string, value: number) => {
      const input = $<HTMLInputElement>(id);
      input.value = String(Math.round(value * 100));
      const out = input.parentElement!.querySelector('output')!;
      out.textContent = input.value;
    };
    set('vol-master', v.master);
    set('vol-narration', v.narration);
    set('vol-music', v.music);
    set('vol-sfx', v.sfx);
  }

  /* --------------------------------------------------------- load gate */

  setLoadProgress(fraction: number, label: string): void {
    $('loadbar-fill').style.width = `${Math.round(fraction * 100)}%`;
    $('loadstate').textContent = label;
  }

  enableEnter(suggestion: string): void {
    const btn = $<HTMLButtonElement>('btn-enter');
    btn.disabled = false;
    $('loadstate').textContent = suggestion;
  }

  hideGate(): void {
    $('gate').classList.add('hidden');
    window.setTimeout(() => {
      $('gate').style.display = 'none';
    }, 1000);
  }

  setDebug(text: string): void {
    $('debug-body').innerHTML = text;
  }

  get debugVisible(): boolean {
    return !$('debug').hidden;
  }

  setDebugVisible(on: boolean): void {
    $('debug').hidden = !on;
    $<HTMLInputElement>('chk-debug').checked = on;
  }

  fatal(message: string, detail: string): void {
    $('fatal').hidden = false;
    $('fatal-msg').textContent = message;
    $('fatal-detail').textContent = detail;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
