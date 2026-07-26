/**
 * Frame clock with a fixed-step accumulator.
 *
 * Simulation (physics, AI, ballistics) advances on a fixed 120 Hz tick so that
 * behaviour is framerate-independent; presentation interpolates using `alpha`.
 */
export class Time {
  /** Seconds elapsed since the previous frame, clamped. */
  dt = 0;
  /** Unclamped, unscaled frame delta — for UI animation. */
  rawDt = 0;
  /** Seconds since engine start (scaled). */
  elapsed = 0;
  /** Fixed simulation step, seconds. */
  readonly fixedStep = 1 / 120;
  /** Interpolation factor between the last two fixed ticks, 0..1. */
  alpha = 0;
  /** Global time dilation. 1 = realtime; used for death cam + hit slowdown. */
  scale = 1;
  /** Smoothed frames per second. */
  fps = 60;

  private last = 0;
  private accumulator = 0;
  private fpsAccum = 0;
  private fpsFrames = 0;
  /** Guard against spiral-of-death after tab-out or a long GC pause. */
  private readonly maxFrame = 0.1;
  private readonly maxSubSteps = 8;

  begin(nowMs: number): void {
    if (this.last === 0) this.last = nowMs;
    const raw = (nowMs - this.last) / 1000;
    this.last = nowMs;
    this.rawDt = Math.min(raw, this.maxFrame);
    this.dt = this.rawDt * this.scale;
    this.elapsed += this.dt;
    this.accumulator += this.dt;

    this.fpsAccum += raw;
    this.fpsFrames++;
    if (this.fpsAccum >= 0.25) {
      this.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }
  }

  /**
   * Drains the accumulator. Call as:
   *   `while (time.consumeFixed()) simulate(time.fixedStep);`
   */
  consumeFixed(): boolean {
    if (this.accumulator >= this.fixedStep) {
      this.accumulator -= this.fixedStep;
      this.substeps++;
      if (this.substeps > this.maxSubSteps) {
        this.accumulator = 0;
        this.substeps = 0;
        this.alpha = 1;
        return false;
      }
      return true;
    }
    this.substeps = 0;
    this.alpha = this.accumulator / this.fixedStep;
    return false;
  }

  private substeps = 0;
}
