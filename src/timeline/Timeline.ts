import { Emitter } from '../core/emitter';
import { clamp } from '../core/mathx';
import { CHAPTER_IDS, CHAPTER_TIMES, TOTAL_DURATION, chapterAt, type ChapterId } from './stage';

export interface ChapterInfo {
  id: ChapterId;
  index: number;
  title: string;
  subtitle: string;
  start: number;
  end: number;
}

export const CHAPTERS: ChapterInfo[] = [
  { id: 'prologue', index: 0, title: 'Prologue', subtitle: 'A war in the dark' },
  { id: 'tatooine', index: 1, title: 'Tatooine', subtitle: 'A world nobody wants' },
  { id: 'pursuit', index: 2, title: 'The Pursuit', subtitle: 'Overtaken' },
  { id: 'capture', index: 3, title: 'Capture', subtitle: 'Drawn alongside' },
  { id: 'corridor', index: 4, title: 'Boarding', subtitle: 'Holding the line' },
  { id: 'plans', index: 5, title: 'The Plans', subtitle: 'A secret, hidden in a droid' },
  { id: 'escape', index: 6, title: 'Escape Pod', subtitle: 'No weapons, no crew' },
  { id: 'epilogue', index: 7, title: 'Epilogue', subtitle: 'Down into the sand' },
].map((c) => ({
  ...c,
  start: CHAPTER_TIMES[c.id as ChapterId][0],
  end: CHAPTER_TIMES[c.id as ChapterId][1],
})) as ChapterInfo[];

export interface TimelineEvents {
  time: { time: number; delta: number };
  seek: { time: number; previous: number };
  chapter: { chapter: ChapterInfo; previous: ChapterInfo | null };
  play: void;
  pause: void;
  complete: void;
}

/**
 * The master clock.
 *
 * Everything downstream - ships, characters, effects, camera, audio, subtitles
 * - is a pure function of `Timeline.time`. The clock itself is the only place
 * mutable playback state lives, which is what makes scrubbing safe: a seek is
 * just a new number plus a `seek` event so one-shot systems can re-arm.
 */
export class Timeline extends Emitter<TimelineEvents> {
  readonly duration = TOTAL_DURATION;
  private _time = 0;
  private _playing = false;
  private _rate = 1;
  private _chapter: ChapterInfo | null = null;

  get time(): number {
    return this._time;
  }

  get playing(): boolean {
    return this._playing;
  }

  get rate(): number {
    return this._rate;
  }

  set rate(v: number) {
    this._rate = clamp(v, 0.1, 4);
  }

  get chapter(): ChapterInfo {
    return this._chapter ?? CHAPTERS[0];
  }

  get progress(): number {
    return this._time / this.duration;
  }

  play(): void {
    if (this._playing) return;
    this._playing = true;
    this.emit('play', undefined);
  }

  pause(): void {
    if (!this._playing) return;
    this._playing = false;
    this.emit('pause', undefined);
  }

  toggle(): void {
    if (this._playing) this.pause();
    else this.play();
  }

  restart(): void {
    this.seek(0);
    this.play();
  }

  /** Jump to an absolute time. Emits `seek` so one-shot systems can reset. */
  seek(time: number): void {
    const previous = this._time;
    this._time = clamp(time, 0, this.duration);
    this.emit('seek', { time: this._time, previous });
    this.syncChapter();
  }

  seekChapter(id: ChapterId): void {
    const chapter = CHAPTERS.find((c) => c.id === id);
    if (chapter) this.seek(chapter.start);
  }

  step(delta: number): void {
    this.seek(this._time + delta);
  }

  /** Advance the clock. `dt` is wall-clock seconds since the last frame. */
  advance(dt: number): void {
    if (!this._playing) return;
    const scaled = dt * this._rate;
    const next = this._time + scaled;
    if (next >= this.duration) {
      this._time = this.duration;
      this._playing = false;
      this.emit('time', { time: this._time, delta: scaled });
      this.syncChapter();
      this.emit('complete', undefined);
      return;
    }
    this._time = next;
    this.emit('time', { time: this._time, delta: scaled });
    this.syncChapter();
  }

  private syncChapter(): void {
    const id = chapterAt(this._time);
    const next = CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
    if (next !== this._chapter) {
      const previous = this._chapter;
      this._chapter = next;
      this.emit('chapter', { chapter: next, previous });
    }
  }

  static chapterIds(): ChapterId[] {
    return [...CHAPTER_IDS];
  }
}
