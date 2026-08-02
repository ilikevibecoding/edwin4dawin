/**
 * The master timeline.
 *
 * A deterministic transport over a fixed list of chapters. Two kinds of
 * content hang off it:
 *
 *   continuous  functions of absolute time that set object state. Re-running
 *               one at any time reproduces exactly the same frame, which is
 *               what makes scrubbing and the visual QA tour reliable;
 *   events      one-shot cues (a sound, a bolt, a light change). Each fires at
 *               most once per pass, and a seek re-arms only the events that
 *               now lie in the future — so scrubbing never replays a burst of
 *               audio, and never double-triggers.
 */

export interface Chapter {
  index: number;
  id: string;
  title: string;
  start: number;
  end: number;
  /** One line shown in the transport bar. */
  synopsis: string;
}

export interface Beat {
  t: number;
  label: string;
}

export interface ShowEvent {
  t: number;
  id: string;
  run(): void;
  /** Skipped when the timeline jumps over it rather than playing through. */
  skippable?: boolean;
}

export type ContinuousFn = (t: number, dt: number) => void;

export class Timeline {
  readonly chapters: Chapter[] = [];
  private events: ShowEvent[] = [];
  private fired: boolean[] = [];
  private continuous: ContinuousFn[] = [];
  private beats: Beat[] = [];

  private _time = 0;
  private _playing = false;
  private _rate = 1;
  /** Raised while a seek is in progress so listeners can flush state. */
  onSeek: ((t: number) => void) | null = null;
  onChapterChange: ((c: Chapter) => void) | null = null;
  onEnd: (() => void) | null = null;

  private lastChapter = -1;
  private ended = false;

  get duration(): number {
    return this.chapters.length ? this.chapters[this.chapters.length - 1].end : 0;
  }

  get time(): number {
    return this._time;
  }

  get playing(): boolean {
    return this._playing;
  }

  get rate(): number {
    return this._rate;
  }

  setRate(r: number): void {
    this._rate = Math.max(0.1, Math.min(4, r));
  }

  addChapter(c: Omit<Chapter, 'index'>): Chapter {
    const chapter: Chapter = { ...c, index: this.chapters.length };
    this.chapters.push(chapter);
    return chapter;
  }

  addEvent(e: ShowEvent): void {
    this.events.push(e);
    this.events.sort((a, b) => a.t - b.t);
    this.fired = new Array(this.events.length).fill(false);
    this.armFrom(this._time);
  }

  addEvents(list: ShowEvent[]): void {
    for (const e of list) this.events.push(e);
    this.events.sort((a, b) => a.t - b.t);
    this.fired = new Array(this.events.length).fill(false);
    this.armFrom(this._time);
  }

  addContinuous(fn: ContinuousFn): void {
    this.continuous.push(fn);
  }

  addBeat(t: number, label: string): void {
    this.beats.push({ t, label });
    this.beats.sort((a, b) => a.t - b.t);
  }

  get allBeats(): readonly Beat[] {
    return this.beats;
  }

  get eventCount(): number {
    return this.events.length;
  }

  beatAt(t: number): Beat | null {
    let found: Beat | null = null;
    for (const b of this.beats) {
      if (b.t <= t) found = b;
      else break;
    }
    return found;
  }

  chapterAt(t: number): Chapter {
    for (const c of this.chapters) {
      if (t >= c.start && t < c.end) return c;
    }
    return t < 0 ? this.chapters[0] : this.chapters[this.chapters.length - 1];
  }

  play(): void {
    if (this._time >= this.duration - 0.01) this.seek(0);
    this._playing = true;
    this.ended = false;
  }

  pause(): void {
    this._playing = false;
  }

  toggle(): void {
    this._playing ? this.pause() : this.play();
  }

  /** Jump to an absolute time. Events behind the new head are marked spent. */
  seek(t: number): void {
    const clamped = Math.max(0, Math.min(this.duration, t));
    this._time = clamped;
    this.armFrom(clamped);
    this.ended = false;
    this.onSeek?.(clamped);
    // Re-evaluate all continuous state immediately so a paused scrub updates.
    for (const fn of this.continuous) fn(clamped, 0);
    const c = this.chapterAt(clamped);
    if (c.index !== this.lastChapter) {
      this.lastChapter = c.index;
      this.onChapterChange?.(c);
    }
  }

  seekChapter(index: number): void {
    const c = this.chapters[Math.max(0, Math.min(this.chapters.length - 1, index))];
    this.seek(c.start);
  }

  nudge(delta: number): void {
    this.seek(this._time + delta);
  }

  private armFrom(t: number): void {
    for (let i = 0; i < this.events.length; i++) {
      this.fired[i] = this.events[i].t <= t;
    }
  }

  /** Advance and apply. `dt` is real seconds; returns the frame's show time. */
  update(dt: number): number {
    if (this._playing) {
      const step = dt * this._rate;
      const next = this._time + step;
      if (next >= this.duration) {
        this._time = this.duration;
        this._playing = false;
        if (!this.ended) {
          this.ended = true;
          this.fireDue();
          for (const fn of this.continuous) fn(this._time, step);
          this.onEnd?.();
          return this._time;
        }
      } else {
        this._time = next;
      }
      this.fireDue();
    }

    for (const fn of this.continuous) fn(this._time, this._playing ? dt * this._rate : 0);

    const c = this.chapterAt(this._time);
    if (c.index !== this.lastChapter) {
      this.lastChapter = c.index;
      this.onChapterChange?.(c);
    }
    return this._time;
  }

  private fireDue(): void {
    for (let i = 0; i < this.events.length; i++) {
      if (this.fired[i]) continue;
      if (this.events[i].t <= this._time) {
        this.fired[i] = true;
        this.events[i].run();
      } else {
        break;
      }
    }
  }

  /** Diagnostics: how many events have fired in this pass. */
  firedCount(): number {
    return this.fired.reduce((n, f) => n + (f ? 1 : 0), 0);
  }

  /** Diagnostics: duplicate event ids would indicate an authoring mistake. */
  duplicateEventIds(): string[] {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of this.events) {
      if (seen.has(e.id)) dupes.push(e.id);
      seen.add(e.id);
    }
    return dupes;
  }
}
