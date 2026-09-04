// Performance monitor: frame/JS/GPU timing, draw calls, memory, entity counts, long tasks, network.
// Exposed as game.perf; the F3 overlay and scripts/bench.mjs read snapshot()/summary().

const HISTORY = 240;

export class PerfMonitor {
  constructor(renderer) {
    this.renderer = renderer;
    this.frameMs = new Float32Array(HISTORY);
    this.jsMs = new Float32Array(HISTORY);
    this.gpuMs = new Float32Array(HISTORY);
    this.idx = 0;
    this.count = 0;
    this.lastFrameStart = 0;
    this.longTasks = 0;
    this.longTaskMs = 0;
    this.counters = {}; // set by the game each frame (entities, chunks, ...)
    this.net = { bytesIn: 0, bytesOut: 0, msgsIn: 0, msgsOut: 0 };
    this.loadTimeMs = 0;
    this.gpuAvailable = false;
    this.gpuLastMs = 0;
    this._queries = [];
    this._setupGpuTimer();
    this._setupLongTasks();
    this._frameStartTime = 0;
    this._lastDraw = { calls: 0, triangles: 0, lines: 0, points: 0 };
  }

  _setupGpuTimer() {
    try {
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      if (!ext || !(gl instanceof WebGL2RenderingContext)) return;
      this.gl = gl;
      this.ext = ext;
      this.gpuAvailable = true;
    } catch (e) { this.gpuAvailable = false; }
  }

  _setupLongTasks() {
    try {
      if (typeof PerformanceObserver === 'undefined') return;
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) { this.longTasks++; this.longTaskMs += e.duration; }
      });
      obs.observe({ entryTypes: ['longtask'] });
      this._obs = obs;
    } catch (e) { /* unsupported */ }
  }

  // Call at the very start of a frame (before any work)
  beginFrame(now) {
    // accumulate draw stats over all render passes of the frame (world + hand)
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    if (this.lastFrameStart) {
      const dt = now - this.lastFrameStart;
      this.frameMs[this.idx] = dt;
    }
    this.lastFrameStart = now;
    this._frameStartTime = performance.now();
    if (this.gpuAvailable) {
      // finish previous queries
      const gl = this.gl, ext = this.ext;
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
      for (let i = this._queries.length - 1; i >= 0; i--) {
        const q = this._queries[i];
        if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) {
          if (!disjoint) this.gpuLastMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
          gl.deleteQuery(q);
          this._queries.splice(i, 1);
        }
      }
      if (this._queries.length < 4) {
        const q = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
        this._activeQuery = q;
      }
    }
  }

  // Call right after rendering finished (GPU commands issued)
  endRender() {
    if (this.gpuAvailable && this._activeQuery) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this._queries.push(this._activeQuery);
      this._activeQuery = null;
    }
    const info = this.renderer.info.render;
    this._lastDraw = { calls: info.calls, triangles: info.triangles, lines: info.lines, points: info.points };
  }

  // Call at the end of the frame's JS work
  endFrame() {
    this.jsMs[this.idx] = performance.now() - this._frameStartTime;
    this.gpuMs[this.idx] = this.gpuLastMs;
    this.idx = (this.idx + 1) % HISTORY;
    this.count++;
  }

  setCounters(obj) { Object.assign(this.counters, obj); }

  memoryMB() {
    const m = performance.memory;
    return m ? { used: m.usedJSHeapSize / 1048576, total: m.totalJSHeapSize / 1048576, limit: m.jsHeapSizeLimit / 1048576 } : null;
  }

  _stats(arr) {
    const n = Math.min(this.count, HISTORY);
    if (n < 2) return { avg: 0, p95: 0, max: 0 };
    const vals = [];
    for (let i = 0; i < n; i++) { const v = arr[i]; if (v > 0) vals.push(v); }
    if (!vals.length) return { avg: 0, p95: 0, max: 0 };
    vals.sort((a, b) => a - b);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { avg, p95: vals[Math.floor(vals.length * 0.95)], max: vals[vals.length - 1] };
  }

  summary() {
    const f = this._stats(this.frameMs), j = this._stats(this.jsMs), g = this._stats(this.gpuMs);
    return {
      fps: f.avg > 0 ? 1000 / f.avg : 0,
      frameMs: f, jsMs: j, gpuMs: this.gpuAvailable ? g : null,
      draw: this._lastDraw,
      memoryMB: this.memoryMB(),
      longTasks: this.longTasks, longTaskMs: this.longTaskMs,
      counters: { ...this.counters },
      net: { ...this.net },
      loadTimeMs: this.loadTimeMs,
      programs: this.renderer.info.programs ? this.renderer.info.programs.length : 0,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  // Compact JSON-friendly snapshot for benchmarks
  snapshot() {
    const s = this.summary();
    return {
      t: performance.now(),
      fps: +s.fps.toFixed(1), frameAvg: +s.frameMs.avg.toFixed(2), frameP95: +s.frameMs.p95.toFixed(2), frameMax: +s.frameMs.max.toFixed(1),
      jsAvg: +s.jsMs.avg.toFixed(2), jsP95: +s.jsMs.p95.toFixed(2), jsMax: +s.jsMs.max.toFixed(1),
      gpuAvg: s.gpuMs ? +s.gpuMs.avg.toFixed(2) : null,
      drawCalls: s.draw.calls, triangles: s.draw.triangles,
      memMB: s.memoryMB ? +s.memoryMB.used.toFixed(1) : null,
      longTasks: s.longTasks, longTaskMs: +s.longTaskMs.toFixed(0),
      geometries: s.geometries, textures: s.textures, programs: s.programs,
      loadTimeMs: +s.loadTimeMs.toFixed(0),
      net: { ...s.net },
      ...s.counters,
    };
  }

  // Lines for the F3 overlay
  lines() {
    const s = this.summary();
    const mem = s.memoryMB ? `${s.memoryMB.used.toFixed(0)}/${s.memoryMB.total.toFixed(0)} MB` : 'n/a';
    const gpu = s.gpuMs ? `gpu ${s.gpuMs.avg.toFixed(1)} ms` : 'gpu n/a';
    return [
      `Frame ${s.frameMs.avg.toFixed(1)} ms (p95 ${s.frameMs.p95.toFixed(1)}, max ${s.frameMs.max.toFixed(0)})  js ${s.jsMs.avg.toFixed(1)} ms (p95 ${s.jsMs.p95.toFixed(1)})  ${gpu}`,
      `Draw calls ${s.draw.calls}  tris ${(s.draw.triangles / 1000).toFixed(0)}k  geometries ${s.geometries}  textures ${s.textures}  mem ${mem}`,
      `Long tasks ${s.longTasks} (${s.longTaskMs.toFixed(0)} ms)  load ${(s.loadTimeMs / 1000).toFixed(1)} s  net in ${(s.net.bytesIn / 1024).toFixed(1)} KB / out ${(s.net.bytesOut / 1024).toFixed(1)} KB`,
    ];
  }
}
