import type * as THREE from 'three';

export interface FrameMetrics {
  frames: number;
  avgMs: number;
  p99Ms: number;
  minFps: number;
  avgFps: number;
  onePercentLowFps: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  jsHeapMB: number | null;
  gpuMs: number | null;
  longTasks: number;
  visibleObjects: number;
}

/** Rolling frame-time statistics + renderer counters. */
export class Metrics {
  private times: number[] = [];
  private lastStart = 0;
  longTasks = 0;
  private gpuQuery: WebGLQuery | null = null;
  private gpuExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  private lastGpuMs: number | null = null;
  visibleObjects = 0;

  constructor(private renderer: THREE.WebGLRenderer) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (ext) this.gpuExt = ext as unknown as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
    if ('PerformanceObserver' in window) {
      try {
        const obs = new PerformanceObserver((list) => { this.longTasks += list.getEntries().length; });
        obs.observe({ entryTypes: ['longtask'] });
      } catch { /* not supported */ }
    }
  }

  beginFrame(): void {
    this.lastStart = performance.now();
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (this.gpuExt && !this.gpuQuery) {
      this.gpuQuery = gl.createQuery();
      gl.beginQuery(this.gpuExt.TIME_ELAPSED_EXT, this.gpuQuery!);
    }
  }

  endFrame(): void {
    const dt = performance.now() - this.lastStart;
    this.times.push(dt);
    if (this.times.length > 600) this.times.shift();
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (this.gpuExt && this.gpuQuery) {
      gl.endQuery(this.gpuExt.TIME_ELAPSED_EXT);
      const q = this.gpuQuery;
      // poll on the next frame
      setTimeout(() => {
        const available = gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE);
        const disjoint = gl.getParameter(this.gpuExt!.GPU_DISJOINT_EXT);
        if (available && !disjoint) this.lastGpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q);
      }, 0);
      this.gpuQuery = null;
    }
  }

  reset(): void { this.times.length = 0; this.longTasks = 0; }

  snapshot(): FrameMetrics {
    const t = this.times.slice().sort((a, b) => a - b);
    const n = t.length || 1;
    const avg = t.reduce((a, b) => a + b, 0) / n;
    const p99 = t[Math.min(t.length - 1, Math.floor(t.length * 0.99))] ?? 0;
    const worst1 = t.slice(Math.floor(t.length * 0.99));
    const onePctLowMs = worst1.length ? worst1.reduce((a, b) => a + b, 0) / worst1.length : avg;
    const info = this.renderer.info;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return {
      frames: t.length,
      avgMs: avg,
      p99Ms: p99,
      minFps: t.length ? 1000 / (t[t.length - 1] || 1) : 0,
      avgFps: avg ? 1000 / avg : 0,
      onePercentLowFps: onePctLowMs ? 1000 / onePctLowMs : 0,
      calls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      jsHeapMB: mem ? mem.usedJSHeapSize / 1048576 : null,
      gpuMs: this.lastGpuMs,
      longTasks: this.longTasks,
      visibleObjects: this.visibleObjects,
    };
  }
}
