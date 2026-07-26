// Fixed-timestep simulation (60 Hz) with free-running render.
// `advance(ms)` switches to deterministic manual time for automated tests:
// simulation only progresses via advance() afterwards, render keeps running.
export const TICK_DT = 1 / 60;
export const TICK_MS = 1000 / 60;

export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = -1;
    this.tick = 0;
    this.simTime = 0;         // seconds of simulated time
    this.auto = true;         // false => manual (test) time
    this.running = false;
    this._raf = 0;
    this._frame = this._frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = -1;
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  _frame(t) {
    if (!this.running) return;
    if (this.last < 0) this.last = t;
    const elapsed = Math.min(0.25, (t - this.last) / 1000);
    this.last = t;
    if (this.auto) {
      this.acc += elapsed;
      let guard = 0;
      while (this.acc >= TICK_DT && guard++ < 8) {
        this._step();
        this.acc -= TICK_DT;
      }
      if (guard >= 8) this.acc = 0; // dropped frames: don't spiral
      this.render(elapsed);
    }
    // manual (test) mode: rendering happens inside advance() only, keeping
    // the rAF alive for polling without burning CPU on software GL frames.
    this._raf = requestAnimationFrame(this._frame);
  }

  _step() {
    this.update(TICK_DT);
    this.tick++;
    this.simTime += TICK_DT;
  }

  // Deterministic manual advance for tests. Returns ticks executed.
  advance(ms) {
    this.auto = false;
    const steps = Math.max(0, Math.round(ms / TICK_MS));
    for (let i = 0; i < steps; i++) this._step();
    this.render(steps * TICK_DT);
    return steps;
  }

  resumeRealtime() {
    this.auto = true;
    this.acc = 0;
    this.last = -1;
  }
}
