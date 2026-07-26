// Fixed-timestep engine loop. Real time drives steps via RAF; window.advanceTime() switches to
// manual deterministic stepping for tests (RAF then only renders).
export const FIXED_DT = 1 / 120;

export class Engine {
  constructor({ step, render }) {
    this.stepFn = step;       // (dt) -> void, fixed dt
    this.renderFn = render;   // (alpha) -> void
    this.accumulator = 0;
    this.lastTime = 0;
    this.manual = false;      // true once advanceTime() is used
    this.running = false;
    this.simTime = 0;
    this.frameCount = 0;
    this.perf = { stepMs: 0, renderMs: 0, fps: 0, _fpsAcc: 0, _fpsN: 0, _t: 0 };
    this._raf = this._raf.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this._raf);
  }

  _raf(now) {
    if (!this.running) return;
    const dtReal = Math.min(0.25, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (!this.manual) {
      this.accumulator += dtReal;
      let steps = 0;
      const t0 = performance.now();
      while (this.accumulator >= FIXED_DT && steps < 30) {
        this.stepFn(FIXED_DT);
        this.simTime += FIXED_DT;
        this.accumulator -= FIXED_DT;
        steps++;
      }
      if (steps >= 30) this.accumulator = 0; // avoid spiral of death
      this.perf.stepMs = performance.now() - t0;
    }
    const r0 = performance.now();
    this.renderFn(1);
    this.perf.renderMs = performance.now() - r0;
    this.frameCount++;
    this.perf._fpsN++;
    if (now - this.perf._t > 500) {
      this.perf.fps = Math.round((this.perf._fpsN * 1000) / (now - this.perf._t));
      this.perf._t = now; this.perf._fpsN = 0;
    }
    requestAnimationFrame(this._raf);
  }

  // Deterministic manual stepping (test mode). Returns number of fixed steps executed.
  advance(ms) {
    this.manual = true;
    const steps = Math.max(1, Math.round((ms / 1000) / FIXED_DT));
    for (let i = 0; i < steps; i++) {
      this.stepFn(FIXED_DT);
      this.simTime += FIXED_DT;
    }
    this.renderFn(1);
    return steps;
  }
}
