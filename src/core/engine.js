// Renderer + deterministic fixed-step simulation loop.
// - Real play: requestAnimationFrame accumulates real time into 1/60s steps.
// - Test mode (?test=1): RAF only renders; window.advanceTime(ms) steps the sim.
// One world unit = one meter. +Y up. North = -Z, East = +X. Yaw 0 faces -Z.

import * as THREE from 'three';
import { endInputStep } from './input.js';
import { getSetting, onSettingsApplied, qualityPreset } from './settings.js';

export const STEP = 1 / 60;

class EngineImpl {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.deterministic = false;
    this.updaters = [];        // fn(dt) called every sim step, in order
    this.renderHooks = [];     // fn() called just before render
    this._acc = 0;
    this._last = 0;
    this._running = false;
    this.simTime = 0;          // total simulated seconds
    this.frame = 0;            // sim step counter
    this._fpsSamples = [];
    this._lastRafT = 0;
    this.timeScale = 1;
  }

  init(canvas, { deterministic = false } = {}) {
    this.canvas = canvas;
    this.deterministic = deterministic;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = qualityPreset().shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x0b1119, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(getSetting('fov'), 16 / 9, 0.05, 300);
    this.camera.rotation.order = 'YXZ';

    this._applySize();
    window.addEventListener('resize', () => this._applySize());
    onSettingsApplied((k) => {
      if (k === 'resolutionScale' || k === 'quality' || k === '*') this._applyQuality();
      if (k === 'fov' || k === '*') { this.camera.fov = getSetting('fov'); this.camera.updateProjectionMatrix(); }
    });

    // Fullscreen: F toggles, Esc exits (native browser behavior).
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !e.repeat && !e.target?.matches?.('input,textarea')) {
        this.toggleFullscreen();
      }
    });
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  _applyQuality() {
    const q = qualityPreset();
    this.renderer.shadowMap.enabled = q.shadows;
    // three requires materials to refresh when shadowmap toggles
    this.scene?.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this._applySize();
  }

  _applySize() {
    const q = qualityPreset();
    const scale = getSetting('resolutionScale');
    const pr = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio) * scale;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  addUpdater(fn, priority = 0) {
    this.updaters.push({ fn, priority });
    this.updaters.sort((a, b) => a.priority - b.priority);
    return () => { this.updaters = this.updaters.filter((u) => u.fn !== fn); };
  }
  addRenderHook(fn) { this.renderHooks.push(fn); return () => { this.renderHooks = this.renderHooks.filter((f) => f !== fn); }; }

  start() {
    if (this._running) return;
    this._running = true;
    this._last = performance.now();
    const loop = (t) => {
      if (!this._running) return;
      requestAnimationFrame(loop);
      const dtMs = t - this._last;
      this._last = t;
      // fps sampling (render-rate)
      if (this._lastRafT) {
        const fdt = t - this._lastRafT;
        this._fpsSamples.push(fdt);
        if (this._fpsSamples.length > 90) this._fpsSamples.shift();
      }
      this._lastRafT = t;

      if (!this.deterministic) {
        this._acc += Math.min(dtMs / 1000, 0.25) * this.timeScale;
        let steps = 0;
        while (this._acc >= STEP && steps < 8) {
          this.stepSim(STEP);
          this._acc -= STEP;
          steps++;
        }
        if (steps === 8) this._acc = 0; // shed load, avoid spiral of death
      }
      this.render();
    };
    requestAnimationFrame(loop);
  }

  stepSim(dt) {
    for (const u of this.updaters) {
      try { u.fn(dt); } catch (e) { console.error('[engine] updater error', e); }
    }
    this.simTime += dt;
    this.frame++;
    endInputStep();
  }

  // Deterministic advancement for tests: consume whole 1/60 steps; remainder carries.
  advanceManual(ms) {
    this._acc += ms / 1000;
    let steps = 0;
    while (this._acc >= STEP - 1e-9 && steps < 100000) {
      this.stepSim(STEP);
      this._acc -= STEP;
      steps++;
    }
    this.render();
    return steps;
  }

  render() {
    for (const fn of this.renderHooks) { try { fn(); } catch (e) { console.error('[engine] render hook error', e); } }
    if (this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  }

  getPerf() {
    const n = this._fpsSamples.length || 1;
    const avg = this._fpsSamples.reduce((a, b) => a + b, 0) / n;
    return {
      fps: avg ? Math.round(1000 / avg) : 0,
      frameMs: Math.round(avg * 100) / 100,
      drawCalls: this.renderer ? this.renderer.info.render.calls : 0,
      triangles: this.renderer ? this.renderer.info.render.triangles : 0,
    };
  }
}

export const Engine = new EngineImpl();
