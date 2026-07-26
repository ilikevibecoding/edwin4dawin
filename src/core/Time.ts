/**
 * Frame timing with a fixed-step accumulator for physics and a scalable
 * wall clock for slow-motion / hit-stop effects.
 */
export class Time {
  /** Seconds since engine start, affected by timeScale. */
  elapsed = 0;
  /** Unscaled seconds since engine start. */
  elapsedUnscaled = 0;
  /** Scaled delta for the current frame, clamped. */
  delta = 0;
  /** Unscaled delta for the current frame, clamped. */
  deltaUnscaled = 0;
  /** Global time multiplier (1 = realtime). */
  timeScale = 1;
  /** Fixed physics step in seconds. */
  readonly fixedStep = 1 / 120;
  /** Frames rendered since start. */
  frame = 0;
  /** Smoothed frames per second. */
  fps = 60;

  private accumulator = 0;
  private last = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private readonly maxDelta = 0.1;
  private readonly maxSubSteps = 8;

  start(now: number): void {
    this.last = now;
  }

  /** Advance the clock. Returns the number of fixed steps to run this frame. */
  tick(now: number): number {
    const rawDelta = (now - this.last) / 1000;
    this.last = now;

    this.deltaUnscaled = Math.min(rawDelta, this.maxDelta);
    this.delta = this.deltaUnscaled * this.timeScale;
    this.elapsedUnscaled += this.deltaUnscaled;
    this.elapsed += this.delta;
    this.frame++;

    this.fpsAccum += this.deltaUnscaled;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.25) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    this.accumulator += this.delta;
    let steps = 0;
    while (this.accumulator >= this.fixedStep && steps < this.maxSubSteps) {
      this.accumulator -= this.fixedStep;
      steps++;
    }
    // Avoid a death spiral if the tab was suspended.
    if (steps >= this.maxSubSteps) this.accumulator = 0;
    return steps;
  }

  /** 0..1 interpolation factor between the last and next fixed step. */
  get alpha(): number {
    return this.accumulator / this.fixedStep;
  }
}
