// Performance metrics: frame time (EMA + 1% low), draw calls, triangles, geometries, textures,
// shader programs (compile count), visible objects, JS heap, long tasks, load time. Feeds the F3
// overlay and window.debugAPI.getStats() so the harness can record numbers instead of adjectives.
export class Perf {
  constructor(renderer) {
    this.renderer = renderer;
    this.frameMs = 16;
    this.samples = new Float32Array(240);
    this.sampleIdx = 0;
    this.sampleCount = 0;
    this.longTasks = 0;
    this.longTaskMs = 0;
    this.loadMs = 0;
    this.t0 = performance.now();
    this.programsSeen = 0;
    this.lastCompile = 0;
    this.extra = {};
    if ("PerformanceObserver" in window) {
      try {
        const obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            this.longTasks++;
            this.longTaskMs += e.duration;
          }
        });
        obs.observe({ entryTypes: ["longtask"] });
      } catch (e) {
        /* longtask not supported */
      }
    }
  }

  markLoaded() {
    this.loadMs = performance.now() - this.t0;
  }

  frame(dtMs) {
    this.frameMs += (dtMs - this.frameMs) * 0.1;
    this.samples[this.sampleIdx] = dtMs;
    this.sampleIdx = (this.sampleIdx + 1) % this.samples.length;
    this.sampleCount = Math.min(this.sampleCount + 1, this.samples.length);
    const programs = this.renderer.info.programs ? this.renderer.info.programs.length : 0;
    if (programs > this.programsSeen) {
      this.lastCompile = performance.now();
      this.programsSeen = programs;
    }
  }

  // worst 1% frame time over the last 240 frames
  onePercentLow() {
    if (this.sampleCount < 20) return this.frameMs;
    const arr = Array.from(this.samples.subarray(0, this.sampleCount)).sort((a, b) => b - a);
    const n = Math.max(1, Math.floor(arr.length * 0.01));
    let s = 0;
    for (let i = 0; i < n; i++) s += arr[i];
    return s / n;
  }

  stats(extra = {}) {
    const info = this.renderer.info;
    const mem = performance.memory;
    return {
      frameMs: +this.frameMs.toFixed(2),
      fps: +(1000 / this.frameMs).toFixed(1),
      worstMs: +this.onePercentLow().toFixed(1),
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs ? info.programs.length : 0,
      heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
      longTasks: this.longTasks,
      longTaskMs: Math.round(this.longTaskMs),
      loadMs: Math.round(this.loadMs),
      ...this.extra,
      ...extra,
    };
  }

  overlayText(s) {
    return [
      `${s.fps} fps  ${s.frameMs} ms  (1% low ${s.worstMs} ms)`,
      `${s.calls} calls  ${(s.triangles / 1000).toFixed(0)}k tris  ${s.programs} programs`,
      `${s.geometries} geo  ${s.textures} tex${s.heapMB ? "  " + s.heapMB + " MB heap" : ""}`,
      `rooms ${s.visibleRooms ?? "-"}  colliders ${s.colliders ?? "-"}  lights ${s.lights ?? "-"}`,
      `${s.mode ?? ""}  ${s.room ?? ""}`,
      `long tasks ${s.longTasks} (${s.longTaskMs} ms)  load ${s.loadMs} ms`,
    ].join("\n");
  }
}
