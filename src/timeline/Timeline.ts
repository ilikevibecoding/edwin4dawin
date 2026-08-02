import { clamp } from '../core/MathX';

/**
 * Deterministic master clock.
 *
 * The timeline owns a single absolute time. Continuous animation is a pure
 * function of that value; discrete events fire exactly once as the playhead
 * crosses them. Seeking never replays past events, and every consumer is told
 * to reset so a scrub cannot leave stale particles or doubled audio.
 */

export interface ChapterDef {
  index: number;
  id: string;
  title: string;
  /** Short line shown in the chapter picker. */
  synopsis: string;
  start: number;
  end: number;
}

export interface TimelineEvent {
  time: number;
  id: string;
  action: () => void;
  /** Events marked `once` never re-fire, even after a rewind. */
  once?: boolean;
}

export type SeekListener = (time: number, reason: 'seek' | 'restart') => void;

export class Timeline {
  readonly chapters: ChapterDef[];
  readonly duration: number;
  private events: TimelineEvent[] = [];
  private firedOnce = new Set<string>();
  private time = 0;
  private prevTime = 0;
  private playbackRate = 1;
  private running = false;
  private seekListeners: SeekListener[] = [];
  private chapterListeners: Array<(c: ChapterDef) => void> = [];
  private currentChapterIndex = -1;
  /**
   * How many times each event fired since the last seek. Firing twice within
   * one continuous pass is a bug; firing again after a rewind is expected.
   */
  readonly fireCounts = new Map<string, number>();

  constructor(chapters: ChapterDef[]) {
    this.chapters = chapters;
    this.duration = chapters.length ? chapters[chapters.length - 1].end : 0;
  }

  addEvent(event: TimelineEvent): void {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
  }

  addEvents(events: TimelineEvent[]): void {
    this.events.push(...events);
    this.events.sort((a, b) => a.time - b.time);
  }

  onSeek(fn: SeekListener): void {
    this.seekListeners.push(fn);
  }

  onChapter(fn: (c: ChapterDef) => void): void {
    this.chapterListeners.push(fn);
  }

  get currentTime(): number {
    return this.time;
  }

  get isPlaying(): boolean {
    return this.running;
  }

  get rate(): number {
    return this.playbackRate;
  }

  set rate(v: number) {
    this.playbackRate = clamp(v, 0.1, 4);
  }

  get chapter(): ChapterDef {
    return this.chapters[Math.max(0, this.currentChapterIndex)] ?? this.chapters[0];
  }

  /** Progress through the current chapter, 0..1. */
  get chapterProgress(): number {
    const c = this.chapter;
    return clamp((this.time - c.start) / Math.max(0.001, c.end - c.start), 0, 1);
  }

  chapterAt(time: number): ChapterDef {
    for (const c of this.chapters) if (time < c.end) return c;
    return this.chapters[this.chapters.length - 1];
  }

  play(): void {
    this.running = true;
  }

  pause(): void {
    this.running = false;
  }

  toggle(): void {
    this.running = !this.running;
  }

  restart(): void {
    this.seek(0, 'restart');
  }

  seek(time: number, reason: 'seek' | 'restart' = 'seek'): void {
    this.time = clamp(time, 0, this.duration);
    this.prevTime = this.time;
    this.fireCounts.clear();
    this.seekListeners.forEach((fn) => fn(this.time, reason));
    this.updateChapter(true);
  }

  jumpToChapter(index: number): void {
    const c = this.chapters[clamp(index, 0, this.chapters.length - 1)];
    this.seek(c.start + 0.001);
  }

  /** Advance the clock and fire everything crossed this frame. */
  update(dt: number): void {
    if (!this.running) {
      this.updateChapter(false);
      return;
    }
    this.prevTime = this.time;
    this.time = Math.min(this.duration, this.time + dt * this.playbackRate);
    if (this.time >= this.duration) this.running = false;

    for (const e of this.events) {
      if (e.time > this.prevTime && e.time <= this.time) {
        if (e.once && this.firedOnce.has(e.id)) continue;
        if (e.once) this.firedOnce.add(e.id);
        e.action();
        this.fireCounts.set(e.id, (this.fireCounts.get(e.id) ?? 0) + 1);
      }
    }
    this.updateChapter(false);
  }

  private updateChapter(force: boolean): void {
    const c = this.chapterAt(this.time);
    if (force || c.index !== this.currentChapterIndex) {
      this.currentChapterIndex = c.index;
      this.chapterListeners.forEach((fn) => fn(c));
    }
  }

  /** Events scheduled inside a window; used by QA to verify coverage. */
  eventsBetween(a: number, b: number): TimelineEvent[] {
    return this.events.filter((e) => e.time >= a && e.time < b);
  }

  get eventCount(): number {
    return this.events.length;
  }
}
