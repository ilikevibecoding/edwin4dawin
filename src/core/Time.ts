/**
 * Game clock and coroutine primitives.
 *
 * Everything in the game (dialogue beats, camera moves, QTE windows) is timed
 * against this clock rather than wall time. That gives three things for free:
 * slow motion, pausing, and deterministic offline rendering — in render mode the
 * clock is advanced by an exact fixed step per captured frame, so a 24fps video
 * of the game plays back identically no matter how slowly it was rendered.
 */

interface Waiter {
  due: number;
  resolve: () => void;
  skippable: boolean;
  seq: number;
}

export class GameClock {
  /** Scaled game time in seconds. */
  time = 0;
  /** Unscaled time; used for UI that should keep moving during slow motion. */
  realTime = 0;
  /** Last scaled delta. */
  dt = 0;
  /** Last unscaled delta. */
  realDt = 0;
  timeScale = 1;
  paused = false;

  private waiters: Waiter[] = [];
  private seq = 0;
  private targetScale = 1;
  private scaleLerp = 0;

  /** Ease the time scale toward a target (used for slow-motion ramps). */
  rampTimeScale(target: number, seconds = 0.25): void {
    this.targetScale = target;
    this.scaleLerp = seconds <= 0 ? 0 : seconds;
    if (this.scaleLerp === 0) this.timeScale = target;
  }

  setTimeScale(v: number): void {
    this.timeScale = v;
    this.targetScale = v;
    this.scaleLerp = 0;
  }

  advance(realDelta: number): void {
    const rd = Math.min(realDelta, 0.25);
    this.realDt = rd;
    this.realTime += rd;

    if (this.scaleLerp > 0) {
      const k = Math.min(1, rd / this.scaleLerp);
      this.timeScale += (this.targetScale - this.timeScale) * k;
      if (Math.abs(this.targetScale - this.timeScale) < 0.001) {
        this.timeScale = this.targetScale;
        this.scaleLerp = 0;
      }
    }

    this.dt = this.paused ? 0 : rd * this.timeScale;
    this.time += this.dt;
    this.flush();
  }

  private flush(): void {
    if (!this.waiters.length) return;
    const due = this.waiters.filter((w) => w.due <= this.time);
    if (!due.length) return;
    this.waiters = this.waiters.filter((w) => w.due > this.time);
    // Stable order keeps replay deterministic.
    due.sort((a, b) => a.due - b.due || a.seq - b.seq);
    for (const w of due) w.resolve();
  }

  /** Resolves after `seconds` of scaled game time. */
  wait(seconds: number, skippable = false): Promise<void> {
    if (seconds <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.waiters.push({ due: this.time + seconds, resolve, skippable, seq: this.seq++ });
    });
  }

  /** Fires every pending skippable wait immediately (player pressed "skip line"). */
  skip(): boolean {
    const skippable = this.waiters.filter((w) => w.skippable);
    if (!skippable.length) return false;
    this.waiters = this.waiters.filter((w) => !w.skippable);
    skippable.sort((a, b) => a.due - b.due || a.seq - b.seq);
    for (const w of skippable) w.resolve();
    return true;
  }

  hasSkippable(): boolean {
    return this.waiters.some((w) => w.skippable);
  }

  clearWaiters(): void {
    const all = this.waiters;
    this.waiters = [];
    for (const w of all) w.resolve();
  }
}

/** Signal that can be awaited and resolved from elsewhere (choices, QTE results). */
export class Deferred<T> {
  readonly promise: Promise<T>;
  private res!: (v: T) => void;
  private done = false;

  constructor() {
    this.promise = new Promise<T>((r) => {
      this.res = r;
    });
  }

  resolve(v: T): void {
    if (this.done) return;
    this.done = true;
    this.res(v);
  }

  get settled(): boolean {
    return this.done;
  }
}

export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number): number => t * t * t;
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  target + (current - target) * Math.exp(-lambda * dt);
