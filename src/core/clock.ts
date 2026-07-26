/**
 * Deterministic fixed-timestep simulation clock.
 * Normal mode: requestAnimationFrame accumulates real time and steps at 120 Hz.
 * Test mode (?test=1): RAF never advances simulation; only advanceTime(ms) steps it,
 * making automated runs fully deterministic.
 */
export const FIXED_DT = 1 / 120;

export class GameClock {
  /** Total simulated seconds since boot (advances only via steps). */
  now = 0;
  /** Number of fixed steps taken. */
  tick = 0;
  testMode = false;
  /** When true (pause menu), simulation does not step in normal mode. */
  paused = false;
  private accumulator = 0;
  private stepFn: (dt: number) => void = () => {};
  private maxCatchUp = 0.25; // clamp long frame hitches

  onStep(fn: (dt: number) => void): void {
    this.stepFn = fn;
  }

  /** Called each RAF with real elapsed seconds. */
  frame(realDt: number): void {
    if (this.testMode || this.paused) return;
    this.accumulator += Math.min(realDt, this.maxCatchUp);
    while (this.accumulator >= FIXED_DT) {
      this.accumulator -= FIXED_DT;
      this.step();
    }
  }

  /** Deterministically advance the simulation by ms (test hook). */
  advance(ms: number): void {
    let remaining = Math.max(0, ms) / 1000;
    // Steps are quantized to the fixed dt; remainders accumulate.
    this.accumulator += remaining;
    let guard = 0;
    while (this.accumulator >= FIXED_DT && guard < 200_000) {
      this.accumulator -= FIXED_DT;
      this.step();
      guard++;
    }
  }

  private step(): void {
    this.tick++;
    this.now = this.tick * FIXED_DT;
    this.stepFn(FIXED_DT);
  }
}

export const clock = new GameClock();
