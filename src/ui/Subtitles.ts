import { NARRATION, type NarrationLine } from '../timeline/Script';

/**
 * Subtitles.
 *
 * The visible line is derived from the clock rather than pushed by events, so
 * scrubbing to the middle of a sentence shows the right caption immediately.
 */
export class Subtitles {
  readonly element: HTMLDivElement;
  private enabled = true;
  private currentId: string | null = null;
  private durationFor: (line: NarrationLine) => number;

  constructor(parent: HTMLElement, durationFor: (line: NarrationLine) => number) {
    this.durationFor = durationFor;
    this.element = document.createElement('div');
    this.element.className = 'subtitles';
    this.element.setAttribute('aria-live', 'polite');
    parent.appendChild(this.element);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.hide();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  lineAt(time: number): NarrationLine | null {
    for (const line of NARRATION) {
      if (time < line.start) break;
      const end = line.start + this.durationFor(line) + 0.35;
      if (time >= line.start && time < end) return line;
    }
    return null;
  }

  update(time: number): void {
    if (!this.enabled) return;
    const line = this.lineAt(time);
    if (!line) {
      this.hide();
      return;
    }
    if (line.id !== this.currentId) {
      this.currentId = line.id;
      this.element.className = `subtitles visible${line.speaker !== 'narrator' ? ' speaker-leia' : ''}`;
      this.element.innerHTML = line.speakerLabel
        ? `<span class="speaker">${escapeHtml(line.speakerLabel)}</span>${escapeHtml(line.text)}`
        : escapeHtml(line.text);
    }
  }

  private hide(): void {
    if (this.currentId !== null) {
      this.currentId = null;
      this.element.className = 'subtitles';
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
