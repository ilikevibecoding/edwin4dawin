import type { NarrationCue } from '../audio/Narration';

/**
 * Subtitles.
 *
 * Driven directly by the narration manifest and the master clock, never by
 * audio playback, so the script remains readable even if audio is muted,
 * unavailable, or blocked by autoplay policy.
 */
export class Subtitles {
  readonly element: HTMLDivElement;
  private speakerEl: HTMLSpanElement;
  private lineEl: HTMLSpanElement;
  private cues: NarrationCue[] = [];
  private currentId: string | null = null;
  private enabled = true;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'subtitles hidden';
    this.element.setAttribute('aria-live', 'polite');

    this.speakerEl = document.createElement('span');
    this.speakerEl.className = 'subtitles__speaker';
    this.lineEl = document.createElement('span');
    this.lineEl.className = 'subtitles__line';

    this.element.append(this.speakerEl, this.lineEl);
    parent.appendChild(this.element);
  }

  setCues(cues: NarrationCue[]): void {
    this.cues = [...cues].sort((a, b) => a.time - b.time);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hide();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Cue visible at `t`, with a small lead-in and hang-over for readability. */
  cueAt(t: number): NarrationCue | null {
    for (const cue of this.cues) {
      if (t >= cue.time - 0.12 && t < cue.time + cue.duration + 0.6) return cue;
    }
    return null;
  }

  update(t: number): void {
    if (!this.enabled) return;
    const cue = this.cueAt(t);
    if (!cue) {
      this.hide();
      return;
    }
    if (cue.id !== this.currentId) {
      this.currentId = cue.id;
      this.speakerEl.textContent = cue.speaker === 'NARRATOR' ? '' : cue.speaker;
      this.speakerEl.style.display = cue.speaker === 'NARRATOR' ? 'none' : 'block';
      this.lineEl.textContent = cue.text;
    }
    this.element.classList.remove('hidden');
  }

  private hide(): void {
    if (this.currentId !== null) this.currentId = null;
    this.element.classList.add('hidden');
  }

  /** Current text, exposed for QA assertions. */
  get currentText(): string {
    return this.lineEl.textContent ?? '';
  }
}
