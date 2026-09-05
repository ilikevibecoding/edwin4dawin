// Performance monitor: everything the acceptance criteria ask to be *measured* rather than asserted.
// Frame time (EMA + p95), JS time per frame, draw calls, triangles, visible objects, geometry / texture
// counts, estimated texture memory, JS heap (Chromium only), time to ready, shader compile time and program
// count, long tasks, zone build times.
export class PerfMonitor {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.frameMs = 16;
    this.jsMs = 0;
    this.samples = new Float32Array(240);
    this.sampleIdx = 0;
    this.sampleCount = 0;
    this.longTasks = { count: 0, maxMs: 0, totalMs: 0 };
    this.readyMs = null;
    this.shaderCompileMs = 0;
    this.visibleObjects = 0;
    this.textureMemMB = 0;
    this._lastScan = 0;
    this._frameStart = 0;
    this.extra = {};
    if (typeof PerformanceObserver !== "undefined") {
      try {
        const obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            this.longTasks.count++;
            this.longTasks.totalMs += e.duration;
            this.longTasks.maxMs = Math.max(this.longTasks.maxMs, e.duration);
          }
        });
        obs.observe({ entryTypes: ["longtask"] });
      } catch (_) {
        /* long tasks not supported */
      }
    }
  }

  // forget the frame-time history (after a camera cut the EMA would otherwise report the old view)
  resetTiming() {
    this.frameMs = 16;
    this.jsMs = 0;
    this.sampleIdx = 0;
    this.sampleCount = 0;
    this._frameStart = 0;
  }

  markReady() {
    this.readyMs = Math.round(performance.now());
  }

  // wrap a shader compile (renderer.compile) and account its time
  timeCompile(fn) {
    const t0 = performance.now();
    fn();
    this.shaderCompileMs += performance.now() - t0;
  }

  beginFrame(now) {
    if (this._frameStart) {
      const dt = now - this._frameStart;
      this.frameMs += (dt - this.frameMs) * 0.1;
      this.samples[this.sampleIdx] = dt;
      this.sampleIdx = (this.sampleIdx + 1) % this.samples.length;
      this.sampleCount = Math.min(this.sampleCount + 1, this.samples.length);
    }
    this._frameStart = now;
    this._jsStart = now;
  }

  endFrame(now) {
    const js = now - this._jsStart;
    this.jsMs += (js - this.jsMs) * 0.1;
    // occasional scene scan (visible objects, texture memory)
    if (now - this._lastScan > 1000) {
      this._lastScan = now;
      this.scan();
    }
  }

  scan() {
    let visible = 0;
    const textures = new Set();
    this.scene.traverse((o) => {
      if (!o.visible) return;
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) visible++;
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "alphaMap", "aoMap"]) if (m[k] && m[k].image) textures.add(m[k]);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u.value && u.value.isTexture && u.value.image) textures.add(u.value);
      }
    });
    if (this.scene.environment && this.scene.environment.image) textures.add(this.scene.environment);
    let bytes = 0;
    for (const t of textures) {
      const img = t.image;
      const w = img.width || (img.data && img.data.width) || 0;
      const h = img.height || (img.data && img.data.height) || 0;
      const bpp = t.type === 1016 ? 8 : 4; // HalfFloat vs 8-bit RGBA
      bytes += w * h * bpp * (t.generateMipmaps ? 1.333 : 1) * (t.isCubeTexture ? 6 : 1);
    }
    this.visibleObjects = visible;
    this.textureMemMB = +(bytes / 1048576).toFixed(1);
  }

  p95() {
    if (this.sampleCount < 10) return this.frameMs;
    const arr = Array.from(this.samples.subarray(0, this.sampleCount)).sort((a, b) => a - b);
    return arr[Math.floor(arr.length * 0.95)];
  }

  stats() {
    const info = this.renderer.info;
    const mem = typeof performance !== "undefined" && performance.memory ? performance.memory : null;
    return {
      frameMs: +this.frameMs.toFixed(2),
      fps: +(1000 / this.frameMs).toFixed(1),
      p95Ms: +this.p95().toFixed(2),
      jsMs: +this.jsMs.toFixed(2),
      calls: info.render.calls,
      triangles: info.render.triangles,
      visibleObjects: this.visibleObjects,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      textureMemMB: this.textureMemMB,
      programs: info.programs ? info.programs.length : 0,
      shaderCompileMs: Math.round(this.shaderCompileMs),
      heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null,
      readyMs: this.readyMs,
      longTasks: { ...this.longTasks, maxMs: Math.round(this.longTasks.maxMs), totalMs: Math.round(this.longTasks.totalMs) },
      ...this.extra,
    };
  }
}
