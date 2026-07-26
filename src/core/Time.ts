/**
 * Deterministic simulation clock. Owner: Opus 1.
 *
 * The simulation runs on a fixed 1/120 s step. Real time only decides *how many* steps to run;
 * it never leaks into the step itself. `window.advanceTime(ms)` pushes milliseconds through the
 * same accumulator, so an automated run and a human run take identical code paths.
 */
export const FIXED_STEP = 1 / 120;
/** Never simulate more than this much wall time in one frame (avoids spiral of death). */
const MAX_FRAME_MS = 250;

export class SimClock {
  /** Seconds of simulation time since boot. */
  elapsed = 0;
  /** Fixed steps executed since boot. */
  tick = 0;
  /** Interpolation alpha for the render frame, [0,1). */
  alpha = 0;
  /** Set true while draining an advanceTime() call. */
  deterministicMode = false;

  private accumulator = 0;
  private lastRealMs = 0;
  private started = false;
  /** Simulation speed multiplier; 0 while paused. */
  timeScale = 1;

  reset(): void {
    this.elapsed = 0;
    this.tick = 0;
    this.alpha = 0;
    this.accumulator = 0;
    this.started = false;
  }

  /** Feed real wall-clock milliseconds from requestAnimationFrame. */
  pushRealTime(nowMs: number): number {
    if (!this.started) {
      this.started = true;
      this.lastRealMs = nowMs;
      return 0;
    }
    const raw = nowMs - this.lastRealMs;
    this.lastRealMs = nowMs;
    return Math.max(0, Math.min(MAX_FRAME_MS, raw));
  }

  /** Push milliseconds into the accumulator; returns the number of fixed steps to run. */
  push(ms: number): number {
    this.accumulator += (ms / 1000) * this.timeScale;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP) {
      this.accumulator -= FIXED_STEP;
      steps++;
      // Hard cap keeps a long advanceTime() from locking the tab forever.
      if (steps >= 4096) {
        this.accumulator = 0;
        break;
      }
    }
    this.alpha = this.accumulator / FIXED_STEP;
    return steps;
  }

  consumeStep(): void {
    this.elapsed += FIXED_STEP;
    this.tick++;
  }
}
