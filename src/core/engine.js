import * as THREE from 'three';
import { settings, QUALITY_PRESETS } from './settings.js';
import { bus, EVT } from './events.js';

/**
 * Engine owns the renderer, the single primary canvas, the camera, resize
 * handling and the deterministic fixed-step simulation loop.
 *
 * Coordinate convention (documented once, used everywhere):
 *   right-handed, +X east, +Y up, -Z north. 1 world unit = 1 metre.
 *   Yaw 0 looks down -Z; yaw increases turning left (counter-clockwise seen
 *   from above). Pitch positive looks up.
 */
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
      // Needed so Playwright can read pixels straight off the primary canvas.
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0a0f16, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 16 / 9, 0.02, 260);
    this.camera.rotation.order = 'YXZ';

    // Simulation state
    this.fixedStep = 1 / 120; // seconds
    this.maxSubSteps = 12;
    this._accumulator = 0;
    this.simTime = 0; // seconds of simulated time since boot
    this.frame = 0;
    this.paused = false;
    this.timeScale = 1;
    this._running = false;
    this._rafId = 0;
    this._lastRealTime = 0;

    /** @type {Array<{order:number, fn:(dt:number)=>void, id:string}>} */
    this._fixedSystems = [];
    /** @type {Array<{order:number, fn:(dt:number, alpha:number)=>void, id:string}>} */
    this._frameSystems = [];
    /** @type {Array<{order:number, fn:(dt:number)=>void, id:string}>} */
    this._realtimeSystems = [];

    this.perf = {
      fps: 0,
      frameMs: 0,
      cpuMs: 0,
      _acc: 0,
      _count: 0,
      history: [],
      drawCalls: 0,
      triangles: 0,
      programs: 0,
    };

    this._onResize = () => this.resize();
    globalThis.addEventListener?.('resize', this._onResize);
    document.addEventListener?.('fullscreenchange', this._onResize);

    bus.on(EVT.SETTINGS_CHANGED, ({ key }) => {
      if (key === 'fov' || key === null) {
        this.camera.fov = settings.get('fov');
        this.camera.updateProjectionMatrix();
      }
      if (key === 'quality' || key === 'resolutionScale' || key === null) this.applyQuality();
    });

    this.applyQuality();
    this.resize();
  }

  applyQuality() {
    const q = QUALITY_PRESETS[settings.get('quality')] || QUALITY_PRESETS.high;
    this.renderer.shadowMap.enabled = q.shadows;
    this.shadowRefreshInterval = q.shadowRefreshInterval ?? 3;
    this.renderer.shadowMap.needsUpdate = true;
    this.maxAnisotropy = Math.min(q.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
    this.resize();
    bus.emit('engine:quality', q);
  }

  get pixelRatioTarget() {
    const q = QUALITY_PRESETS[settings.get('quality')] || QUALITY_PRESETS.high;
    const userScale = settings.get('resolutionScale');
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    return Math.max(0.35, Math.min(dpr, 2) * q.resolutionScale * userScale);
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent ? parent.clientWidth : globalThis.innerWidth || 1280);
    const h = Math.max(1, parent ? parent.clientHeight : globalThis.innerHeight || 720);
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.renderer.setPixelRatio(this.pixelRatioTarget);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep a stable horizontal FOV feel on wide screens by adjusting vertical FOV.
    const baseFov = settings.get('fov');
    const refAspect = 16 / 9;
    if (this.camera.aspect < refAspect) {
      const hFov = 2 * Math.atan(Math.tan((baseFov * Math.PI) / 360) * refAspect);
      this.camera.fov = (2 * Math.atan(Math.tan(hFov / 2) / this.camera.aspect) * 180) / Math.PI;
    } else {
      this.camera.fov = baseFov;
    }
    this.camera.updateProjectionMatrix();
    bus.emit('engine:resize', { width: w, height: h });
  }

  /** Register a system stepped with the deterministic fixed timestep. */
  addFixedSystem(id, fn, order = 100) {
    this._fixedSystems.push({ id, fn, order });
    this._fixedSystems.sort((a, b) => a.order - b.order);
    return () => {
      this._fixedSystems = this._fixedSystems.filter((s) => s.fn !== fn);
    };
  }

  /**
   * Register a system stepped once per rendered frame (visual only). Frame
   * systems receive the time-scaled delta, so they freeze while paused.
   */
  addFrameSystem(id, fn, order = 100) {
    this._frameSystems.push({ id, fn, order });
    this._frameSystems.sort((a, b) => a.order - b.order);
    return () => {
      this._frameSystems = this._frameSystems.filter((s) => s.fn !== fn);
    };
  }

  /**
   * Register a system that always receives real elapsed time regardless of
   * pause or time scale. Menus, the loading transition and QA overlays live
   * here so the interface keeps animating while the world is frozen.
   */
  addRealtimeSystem(id, fn, order = 100) {
    this._realtimeSystems.push({ id, fn, order });
    this._realtimeSystems.sort((a, b) => a.order - b.order);
    return () => {
      this._realtimeSystems = this._realtimeSystems.filter((s) => s.fn !== fn);
    };
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastRealTime = performance.now();
    const loop = (now) => {
      if (!this._running) return;
      this._rafId = requestAnimationFrame(loop);
      const rawDt = (now - this._lastRealTime) / 1000;
      this._lastRealTime = now;
      // Guard against tab-switch spikes and the very first frame.
      const dt = Math.min(Math.max(rawDt, 0), 0.25);
      this.advance(dt * 1000, true);
      this.perf.frameMs = rawDt * 1000;
      this.perf._acc += rawDt;
      this.perf._count++;
      if (this.perf._acc >= 0.5) {
        this.perf.fps = this.perf._count / this.perf._acc;
        this.perf.history.push(this.perf.fps);
        if (this.perf.history.length > 120) this.perf.history.shift();
        this.perf._acc = 0;
        this.perf._count = 0;
      }
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = 0;
  }

  /**
   * Advance the simulation by `ms` milliseconds. Called by the rAF loop and by
   * `window.advanceTime(ms)` for deterministic automated tests. When `render`
   * is true a frame is drawn at the end of the step.
   */
  advance(ms, render = true) {
    const t0 = performance.now();
    const scale = this.paused ? 0 : this.timeScale;
    const dt = (ms / 1000) * scale;
    this._accumulator += dt;
    let steps = 0;
    while (this._accumulator >= this.fixedStep && steps < this.maxSubSteps) {
      this._accumulator -= this.fixedStep;
      this.simTime += this.fixedStep;
      for (const s of this._fixedSystems) s.fn(this.fixedStep);
      steps++;
    }
    // Spiral guard: if we ran out of substeps, drop the backlog rather than
    // falling further behind every frame. `window.advanceTime()` never trips
    // this because it feeds the engine in slices smaller than the budget.
    if (steps >= this.maxSubSteps) this._accumulator = 0;
    const alpha = this._accumulator / this.fixedStep;
    // Frame systems get the *scaled* delta so presentation freezes on pause
    // instead of animating behind the menu.
    const frameDt = (ms / 1000) * scale;
    for (const s of this._frameSystems) s.fn(frameDt, alpha);
    const realDt = ms / 1000;
    for (const s of this._realtimeSystems) s.fn(realDt);
    if (render) this.render();
    this.frame++;
    this.perf.cpuMs = performance.now() - t0;
    // Track a frame rate even under scripted time so QA/perf reporting works
    // when the rAF loop is not the thing driving the clock.
    if (!this._running) {
      this.perf.frameMs = this.perf.cpuMs;
      this.perf.fps = this.perf.cpuMs > 0 ? 1000 / this.perf.cpuMs : 0;
    }
    const info = this.renderer.info;
    this.perf.drawCalls = info.render.calls;
    this.perf.triangles = info.render.triangles;
    this.perf.programs = info.programs ? info.programs.length : 0;
  }

  /** Restore the clock to a known phase so a restart replays identically. */
  resetClock() {
    this._accumulator = 0;
    this.simTime = 0;
    this.frame = 0;
    this.perf._acc = 0;
    this.perf._count = 0;
    this.perf.history.length = 0;
  }

  /**
   * The sun is the only shadow-casting light, and its map covers a slab of the
   * building that changes slowly as the player walks. Re-rendering it every
   * frame roughly doubled the frame's draw calls for no visible benefit, so it
   * refreshes on a cadence (and immediately whenever quality changes).
   */
  set shadowRefreshInterval(n) {
    this._shadowInterval = Math.max(1, n | 0);
    this.renderer.shadowMap.autoUpdate = this._shadowInterval === 1;
  }

  get shadowRefreshInterval() {
    return this._shadowInterval || 1;
  }

  render() {
    if (this._shadowInterval > 1 && this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = this.frame % this._shadowInterval === 0;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    globalThis.removeEventListener?.('resize', this._onResize);
    document.removeEventListener?.('fullscreenchange', this._onResize);
    this.renderer.dispose();
  }
}
