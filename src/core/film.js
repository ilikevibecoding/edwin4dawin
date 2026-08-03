// The director. Owns the master timeline, builds/tears down sequences as the
// playhead crosses them, drives fades at the seams, and exposes a frame-stepping
// API for the offline renderer.

import * as THREE from 'three';
import { clamp, smoothstep } from '../util/math.js';

export class Film {
  /**
   * @param {Engine} engine
   * @param {Array<SequenceDef>} sequences each: { id, duration, build(ctx), fadeIn?, fadeOut? }
   */
  constructor(engine, sequences, ctx = {}) {
    this.engine = engine;
    this.defs = sequences;
    this.ctx = { ...ctx, engine };
    this.starts = [];
    let acc = 0;
    for (const s of sequences) {
      this.starts.push(acc);
      acc += s.duration;
    }
    this.duration = acc;
    this.current = -1;
    this.instance = null;
    this.next = null;      // pre-built upcoming sequence
    this.nextIndex = -1;
    this.time = 0;
    this.onSequenceChange = null;
    this.subtitle = '';
  }

  indexAt(t) {
    let i = 0;
    while (i < this.defs.length - 1 && t >= this.starts[i + 1]) i++;
    return i;
  }

  localTime(t, i = this.indexAt(t)) {
    return t - this.starts[i];
  }

  labelAt(t) {
    const i = this.indexAt(t);
    return this.defs[i].id;
  }

  _build(i) {
    const def = this.defs[i];
    const inst = def.build(this.ctx);
    inst.def = def;
    inst.index = i;
    if (!inst.scene) throw new Error(`sequence ${def.id} built without a scene`);
    if (!inst.camera) throw new Error(`sequence ${def.id} built without a camera`);
    return inst;
  }

  _activate(i) {
    if (this.instance && this.instance.index === i) return;
    if (this.instance) {
      this.instance.dispose?.();
      disposeScene(this.instance.scene);
      this.instance = null;
    }
    if (this.next && this.nextIndex === i) {
      this.instance = this.next;
      this.next = null;
      this.nextIndex = -1;
    } else {
      if (this.next) {
        this.next.dispose?.();
        disposeScene(this.next.scene);
        this.next = null;
        this.nextIndex = -1;
      }
      this.instance = this._build(i);
    }
    this.current = i;
    this.engine.setActive(this.instance.scene, this.instance.camera);
    this.engine.bloomStrength = this.instance.bloom ?? 0.85;
    this.engine.setStreak(0);
    if (this.onSequenceChange) this.onSequenceChange(this.defs[i], i);
  }

  /** Jump to an absolute time, rebuilding whatever sequence lives there. */
  seek(t) {
    this.time = clamp(t, 0, this.duration);
    const i = this.indexAt(this.time);
    this._activate(i);
    this.update(0, true);
  }

  /**
   * Advance and render one frame's worth of state.
   * @param {number} dt seconds since previous frame (0 when seeking)
   */
  update(dt, seeking = false) {
    if (!seeking) this.time = Math.min(this.duration, this.time + dt);
    const i = this.indexAt(this.time);
    if (i !== this.current) this._activate(i);

    const def = this.defs[i];
    const local = this.time - this.starts[i];
    const inst = this.instance;

    inst.update?.(local, dt, this.ctx);

    // Pre-build the next sequence during the tail of this one so the hitch
    // lands inside a fade rather than on a visible frame.
    const remaining = def.duration - local;
    const lookahead = def.prebuild ?? 1.2;
    if (!seeking && remaining < lookahead && i + 1 < this.defs.length && !this.next && this.nextIndex !== i + 1) {
      this.nextIndex = i + 1;
      this.next = this._build(i + 1);
    }

    // Fades at sequence boundaries.
    const fi = def.fadeIn ?? 0.6;
    const fo = def.fadeOut ?? 0.6;
    let fade = 0;
    if (fi > 0) fade = Math.max(fade, 1 - smoothstep(0, fi, local));
    if (fo > 0) fade = Math.max(fade, smoothstep(def.duration - fo, def.duration, local));
    if (inst.fadeOverride !== undefined) fade = Math.max(fade, inst.fadeOverride);
    this.engine.fade = fade;
    this.engine.flash = inst.flash || 0;
    this.subtitle = inst.subtitle || '';
    return { index: i, local, def };
  }

  dispose() {
    if (this.instance) {
      this.instance.dispose?.();
      disposeScene(this.instance.scene);
    }
    if (this.next) {
      this.next.dispose?.();
      disposeScene(this.next.scene);
    }
    this.instance = this.next = null;
  }
}

export function disposeScene(scene) {
  const seen = new Set();
  scene.traverse((o) => {
    if (o.geometry && !seen.has(o.geometry)) {
      seen.add(o.geometry);
      o.geometry.dispose();
    }
    // Materials and textures are pooled and reused across sequences, so they
    // are intentionally left alive here.
  });
  scene.clear();
}

/**
 * Small helper every sequence uses: creates a scene with fog/background and a
 * camera, and returns a bag of update hooks so sequences stay declarative.
 */
export function makeStage({ background = 0x000000, fog = null, fov = 40, near = 0.1, far = 200000 } = {}) {
  const scene = new THREE.Scene();
  if (background !== null) scene.background = new THREE.Color(background);
  if (fog) scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, near, far);
  return { scene, camera };
}
