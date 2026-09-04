// Performance instrumentation: frame time (EMA, p95 over a 4 s window), JS update time, draw calls,
// triangles, programs, geometries, textures (+ estimated GPU texture memory), visible cells, long
// tasks (PerformanceObserver), JS heap (Chrome), shader compiles, load time.
export function createPerf(renderer) {
  const t0 = performance.now();
  const frames = [];
  let frameMs = 16;
  let jsMs = 0;
  let longTasks = 0;
  let longTaskMs = 0;
  let lastPrograms = 0;
  let compiles = 0;
  let readyAt = 0;
  if (typeof PerformanceObserver !== "undefined") {
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          longTasks++;
          longTaskMs += e.duration;
        }
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      /* not supported */
    }
  }
  function textureBytes() {
    // estimate from the textures three.js has uploaded: w*h*4 bytes * 1.33 for mips
    let bytes = 0;
    const props = renderer.properties;
    if (!props || !props.properties) return 0;
    for (const [obj] of props.properties) {
      if (obj && obj.isTexture && obj.image) {
        const img = obj.image;
        const w = img.width || (img[0] && img[0].width) || 0;
        const h = img.height || (img[0] && img[0].height) || 0;
        const faces = Array.isArray(img) ? img.length : 1;
        const bpp = obj.type === 1016 || obj.type === 1015 ? 8 : 4; // half / float
        bytes += w * h * bpp * faces * (obj.generateMipmaps ? 1.333 : 1);
      }
    }
    return bytes;
  }
  return {
    markReady() {
      readyAt = performance.now() - t0;
    },
    beginFrame(now, last) {
      const dt = now - last;
      frameMs += (dt - frameMs) * 0.1;
      frames.push({ t: now, dt });
      while (frames.length && now - frames[0].t > 4000) frames.shift();
    },
    setJsTime(ms) {
      jsMs += (ms - jsMs) * 0.1;
    },
    tick() {
      const n = renderer.info.programs ? renderer.info.programs.length : 0;
      if (n > lastPrograms) compiles += n - lastPrograms;
      lastPrograms = n;
    },
    get frameMs() {
      return frameMs;
    },
    snapshot(extra = {}) {
      const info = renderer.info;
      const sorted = frames.map((f) => f.dt).sort((a, b) => a - b);
      const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : frameMs;
      const mem = performance.memory ? { jsHeapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) } : {};
      return {
        frameMs: +frameMs.toFixed(2),
        fps: +(1000 / frameMs).toFixed(1),
        p95Ms: +p95.toFixed(2),
        jsMs: +jsMs.toFixed(2),
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        textureMB: +(textureBytes() / 1048576).toFixed(1),
        programs: info.programs ? info.programs.length : 0,
        shaderCompiles: compiles,
        longTasks,
        longTaskMs: +longTaskMs.toFixed(0),
        loadMs: +readyAt.toFixed(0),
        pixelRatio: renderer.getPixelRatio(),
        ...mem,
        ...extra,
      };
    },
  };
}
