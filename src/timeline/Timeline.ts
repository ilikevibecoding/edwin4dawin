import { Signal } from '../core/Signals';
import type { Shot } from '../camera/CameraDirector';

/**
 * Deterministic master timeline.
 *
 * Two kinds of state exist:
 *   - Continuous state, produced by `Chapter.update(localTime)`. It must be a
 *     pure function of local time so scrubbing lands on exactly the same frame
 *     the linear playthrough would have produced.
 *   - Discrete beats, fired once when the playhead crosses them. Seeking rebuilds
 *     the fired set from scratch, which is what prevents duplicate audio or
 *     double-fired events after a scrub.
 */

export interface Beat<C> {
  /** Local time within the chapter. */
  t: number;
  id: string;
  fire(ctx: C, opts: { scrubbed: boolean }): void;
  /** Beats marked `silent` are skipped when the playhead arrives by seeking. */
  silent?: boolean;
}

export interface Chapter<C> {
  id: string;
  title: string;
  /** One-line summary shown by the chapter selector and debug overlay. */
  synopsis: string;
  start: number;
  duration: number;
  beats: Array<Beat<C>>;
  /** Camera shots, expressed in absolute timeline seconds. */
  shots(ctx: C): Shot[];
  /** Called whenever this chapter becomes active. */
  enter(ctx: C, localTime: number, scrubbed: boolean): void;
  exit?(ctx: C): void;
  /** Deterministic continuous state. */
  update(ctx: C, localTime: number, dt: number): void;
}

export interface TimelineEvent {
  time: number;
  chapter: string;
}

export class Timeline<C> {
  readonly chapters: Array<Chapter<C>> = [];
  readonly onChapterChange = new Signal<{ chapter: Chapter<C>; index: number }>();
  readonly onSeek = new Signal<number>();
  readonly onPlayStateChange = new Signal<boolean>();
  readonly onComplete = new Signal<void>();

  time = 0;
  playing = false;
  /** Playback rate; QA uses higher values for fast traversal. */
  rate = 1;

  private activeIndex = -1;
  private fired = new Set<string>();
  private ctx: C;
  private completed = false;

  constructor(ctx: C) {
    this.ctx = ctx;
  }

  add(chapter: Chapter<C>): void {
    this.chapters.push(chapter);
    this.chapters.sort((a, b) => a.start - b.start);
  }

  get duration(): number {
    let end = 0;
    for (const c of this.chapters) end = Math.max(end, c.start + c.duration);
    return end;
  }

  get activeChapter(): Chapter<C> | null {
    return this.activeIndex >= 0 ? this.chapters[this.activeIndex] : null;
  }

  get activeChapterIndex(): number {
    return this.activeIndex;
  }

  chapterIndexAt(t: number): number {
    for (let i = this.chapters.length - 1; i >= 0; i--) {
      if (t >= this.chapters[i].start) return i;
    }
    return 0;
  }

  play(): void {
    if (this.playing) return;
    if (this.completed && this.time >= this.duration - 0.01) this.seek(0);
    this.playing = true;
    this.onPlayStateChange.emit(true);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.onPlayStateChange.emit(false);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Jump to an absolute time and rebuild deterministic state. */
  seek(t: number): void {
    const clamped = Math.max(0, Math.min(this.duration, t));
    this.time = clamped;
    this.completed = false;
    const idx = this.chapterIndexAt(clamped);
    const chapter = this.chapters[idx];
    const local = clamped - chapter.start;

    if (idx !== this.activeIndex) {
      this.activeChapter?.exit?.(this.ctx);
      this.activeIndex = idx;
    }

    // Rebuild the fired set: everything before the playhead counts as done.
    this.fired.clear();
    for (const c of this.chapters) {
      const cLocal = clamped - c.start;
      for (const b of c.beats) {
        if (c.start + b.t <= clamped) this.fired.add(`${c.id}:${b.id}`);
      }
      void cLocal;
    }

    chapter.enter(this.ctx, local, true);
    chapter.update(this.ctx, local, 0);
    this.onChapterChange.emit({ chapter, index: idx });
    this.onSeek.emit(clamped);
  }

  /** Jump to the start of a chapter. */
  seekChapter(index: number): void {
    const c = this.chapters[Math.max(0, Math.min(this.chapters.length - 1, index))];
    this.seek(c.start + 0.001);
  }

  restart(): void {
    this.seek(0);
    this.play();
  }

  update(dt: number): void {
    if (!this.playing) {
      // Still evaluate the active chapter so paused frames stay correct.
      const chapter = this.activeChapter;
      if (chapter) chapter.update(this.ctx, this.time - chapter.start, 0);
      return;
    }
    const step = dt * this.rate;
    const next = this.time + step;
    if (next >= this.duration) {
      this.time = this.duration;
      this.advanceInto(this.time, dt);
      if (!this.completed) {
        this.completed = true;
        this.playing = false;
        this.onPlayStateChange.emit(false);
        this.onComplete.emit();
      }
      return;
    }
    this.time = next;
    this.advanceInto(this.time, dt);
  }

  private advanceInto(t: number, dt: number): void {
    const idx = this.chapterIndexAt(t);
    if (idx !== this.activeIndex) {
      this.activeChapter?.exit?.(this.ctx);
      this.activeIndex = idx;
      const chapter = this.chapters[idx];
      chapter.enter(this.ctx, t - chapter.start, false);
      this.onChapterChange.emit({ chapter, index: idx });
    }
    const chapter = this.chapters[this.activeIndex];
    const local = t - chapter.start;
    for (const b of chapter.beats) {
      const key = `${chapter.id}:${b.id}`;
      if (b.t <= local && !this.fired.has(key)) {
        this.fired.add(key);
        b.fire(this.ctx, { scrubbed: false });
      }
    }
    chapter.update(this.ctx, local, dt);
  }

  /** Debug aid: how many discrete beats have fired so far. */
  get firedCount(): number {
    return this.fired.size;
  }

  hasFired(chapterId: string, beatId: string): boolean {
    return this.fired.has(`${chapterId}:${beatId}`);
  }
}
