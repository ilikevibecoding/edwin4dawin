// Performance metrics: frame time (rolling p50 / p95), fps, renderer counters (draw calls, triangles,
// geometries, textures, programs = shader compiles), visible object count, texture memory estimate,
// JS heap (Chrome), long tasks (PerformanceObserver), load time. Exposed through debugAPI.getStats()
// and the F3 overlay. Frame times on a software-GL VM are relative only; the counters are exact.
export function createMetrics(renderer, scene) {
  const frames = new Float32Array(240);
  let head = 0;
  let filled = 0;
  let longTasks = 0;
  let longTaskMs = 0;
  let last = performance.now();
  let frameMs = 16;
  let lastPrograms = 0;
  let shaderCompiles = 0;
  const t0 = performance.now();
  let readyAt = null;

  if ("PerformanceObserver" in window) {
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          longTasks++;
          longTaskMs += e.duration;
        }
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch (e) {
      /* unsupported */
    }
  }

  function textureBytes() {
    let bytes = 0;
    const seen = new Set();
    scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "aoMap", "alphaMap"]) {
          const t = m[k];
          if (!t || seen.has(t)) continue;
          seen.add(t);
          const img = t.image;
          if (!img) continue;
          const w = img.width || 0;
          const h = img.height || 0;
          bytes += w * h * 4 * (t.generateMipmaps === false ? 1 : 1.333);
        }
      }
    });
    return bytes;
  }

  function visibleObjects() {
    let n = 0;
    let instances = 0;
    let tris = 0;
    scene.traverseVisible((o) => {
      if (o.isMesh || o.isPoints || o.isSprite || o.isLine) {
        n++;
        if (o.isInstancedMesh) instances += o.count;
        const g = o.geometry;
        if (g && g.attributes.position) {
          const prim = (g.index ? g.index.count : g.attributes.position.count) / 3;
          tris += prim * (o.isInstancedMesh ? o.count : 1);
        }
      }
    });
    return { n, instances, tris: Math.round(tris) };
  }

  return {
    begin() {
      const now = performance.now();
      const dt = now - last;
      last = now;
      frameMs += (dt - frameMs) * 0.1;
      frames[head] = dt;
      head = (head + 1) % frames.length;
      filled = Math.min(filled + 1, frames.length);
      const p = renderer.info.programs ? renderer.info.programs.length : 0;
      if (p > lastPrograms) shaderCompiles += p - lastPrograms;
      lastPrograms = p;
    },
    markReady() {
      if (readyAt === null) readyAt = performance.now() - t0;
    },
    get frameMs() {
      return frameMs;
    },
    snapshot(extra = {}) {
      const arr = Array.from(frames.subarray(0, filled)).sort((a, b) => a - b);
      const q = (f) => (arr.length ? +arr[Math.min(arr.length - 1, Math.floor(f * arr.length))].toFixed(2) : 0);
      const info = renderer.info;
      const vis = visibleObjects();
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      return {
        frameMs: +frameMs.toFixed(2),
        fps: +(1000 / frameMs).toFixed(1),
        frameP50: q(0.5),
        frameP95: q(0.95),
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs ? info.programs.length : 0,
        shaderCompiles,
        // renderer.info totals include every pass (shadow maps, AO); sceneTriangles is the visible
        // scene geometry alone (what one beauty pass submits)
        visibleObjects: vis.n,
        visibleInstances: vis.instances,
        sceneTriangles: vis.tris,
        textureMB: +(textureBytes() / 1048576).toFixed(1),
        jsHeapMB: mem,
        longTasks,
        longTaskMs: Math.round(longTaskMs),
        loadMs: readyAt === null ? null : Math.round(readyAt),
        ...extra,
      };
    },
  };
}
