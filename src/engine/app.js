import * as THREE from 'three';
import { Post } from './fx.js';
import { ShotList } from './camera.js';
import { clamp, ramp } from './util.js';
import { whenPrintsReady } from '../lego/svg.js';

/**
 * The film engine.
 *
 * Time is the single source of truth: every chapter is a pure-ish function of
 * its local time, so the same timeline drives live playback (clocked by the
 * audio element) and offline capture (clocked by a fixed frame step). That is
 * what keeps the narration in sync with the picture in the rendered video.
 */
export class Film {
  constructor({ canvas, width = 1600, height = 900, quality = 'high', capture = false } = {}) {
    this.width = width; this.height = height;
    this.quality = quality;
    this.capture = capture;
    this.chapters = [];
    this.built = new Map();
    this.time = 0;
    this.lastT = -1;
    this.fadeOverride = null;

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, powerPreference: 'high-performance',
      stencil: false, alpha: false, preserveDrawingBuffer: capture,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = quality !== 'low';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.info.autoReset = true;
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.35, 12000);
    this.blank = new THREE.Scene();
    this.post = new Post(renderer, this.blank, this.camera, { width, height, quality });
  }

  /** @param {{id:string,dur:number,build:Function,hardCut?:boolean}} mod */
  chapter(mod) { this.chapters.push(mod); return this; }

  get duration() {
    return this.chapters.reduce((a, c) => a + c.dur, 0);
  }

  layout() {
    let t = 0;
    for (const c of this.chapters) { c._start = t; t += c.dur; }
    return this;
  }

  chapterAt(t) {
    for (const c of this.chapters) {
      if (t >= c._start && t < c._start + c.dur) return c;
    }
    return this.chapters[this.chapters.length - 1];
  }

  async build(mod) {
    if (this.built.has(mod.id)) return this.built.get(mod.id);
    const scene = new THREE.Scene();
    const ctx = {
      scene, camera: this.camera, renderer: this.renderer,
      width: this.width, height: this.height, quality: this.quality,
      film: this,
    };
    const inst = await mod.build(ctx);
    inst.scene = inst.scene || scene;
    inst.shots = inst.shots || new ShotList();
    if (inst.root && !inst.root.parent) inst.scene.add(inst.root);
    inst.mod = mod;
    inst._warmed = -1;
    this.built.set(mod.id, inst);
    return inst;
  }

  async preload(onProgress) {
    this.layout();
    let i = 0;
    for (const c of this.chapters) {
      await this.build(c);
      onProgress?.(++i / this.chapters.length, c.id);
      await new Promise((r) => setTimeout(r, 0));
    }
    await whenPrintsReady();
    // Compile shaders up front so capture frame 1 is not a 20 s stall.
    for (const c of this.chapters) {
      const inst = this.built.get(c.id);
      this.renderer.compile(inst.scene, this.camera);
    }
    return this;
  }

  /** Advance a chapter's simulation without drawing (used when seeking). */
  warm(inst, fromLocal, toLocal, dt = 1 / 30) {
    for (let t = fromLocal; t < toLocal; t += dt) {
      inst.update?.(t, dt, this);
    }
    inst._warmed = toLocal;
  }

  fadeAt(t, c) {
    const FADE = 0.75;
    const local = t - c._start;
    let f = 0;
    if (!c.hardCutIn && c._start > 0) f = Math.max(f, 1 - ramp(local, 0, FADE));
    if (!c.hardCutOut && c._start + c.dur < this.duration) f = Math.max(f, ramp(local, c.dur - FADE, c.dur));
    if (c._start === 0) f = Math.max(f, 1 - ramp(local, 0, 1.6));
    if (c._start + c.dur >= this.duration) f = Math.max(f, ramp(local, c.dur - 2.5, c.dur));
    return f;
  }

  renderAt(t) {
    t = clamp(t, 0, this.duration - 1e-4);
    const c = this.chapterAt(t);
    const inst = this.built.get(c.id);
    if (!inst) return;
    const local = t - c._start;

    let dt = t - this.lastT;
    if (this.lastT < 0 || dt < 0 || dt > 0.4) dt = 1 / 30;
    this.lastT = t;

    inst.update?.(local, dt, this);
    inst.shots.apply(this.camera, local);
    this.camera.updateMatrixWorld();

    this.post.setScene(inst.scene, this.camera);
    const g = this.post.grade.uniforms;
    g.uFade.value = this.fadeOverride ?? this.fadeAt(t, c);
    if (inst.grade) for (const [k, v] of Object.entries(inst.grade)) {
      if (g[k]) g[k].value = v;
    }
    this.post.render(t);
    this.time = t;
    return inst;
  }

  setSize(w, h) {
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h);
  }
}
