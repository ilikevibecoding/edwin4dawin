import * as THREE from 'three';

/*
 * The director.
 *
 * A film is an ordered list of Sequences, each owning its own THREE.Scene and
 * its own lighting, laid end to end on one global clock. The clock is stepped
 * explicitly — live playback feeds it real elapsed time, the offline renderer
 * feeds it exactly 1/fps — so both produce identical frames.
 */

export class Sequence {
  /**
   * @param {string} id
   * @param {object} opts  { duration, title, fadeIn, fadeOut, letterbox, exposure }
   */
  constructor(id, opts = {}) {
    this.id = id;
    this.duration = opts.duration ?? 10;
    this.title = opts.title || '';
    this.fadeIn = opts.fadeIn ?? 0.6;
    this.fadeOut = opts.fadeOut ?? 0.6;
    this.exposure = opts.exposure ?? 1.0;
    this.bloom = opts.bloom ?? { strength: 0.55, radius: 0.55, threshold: 0.82 };
    this.scene = new THREE.Scene();
    this.scene.name = id;
    this.built = false;
    this.opts = opts;
  }

  /** Override: construct the scene. May be async. */
  async build(ctx) {}

  /** Override: called with sequence-local time each frame. */
  update(t, dt, ctx) {}

  /** Override: one-shot when the sequence becomes active. */
  enter(ctx) {}

  /** Override: one-shot when it stops being active. */
  exit(ctx) {}

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
    });
  }
}

export class Timeline {
  constructor(ctx) {
    this.ctx = ctx;
    this.sequences = [];
    this.time = 0;
    this.active = null;
    this.duration = 0;
    this.onSequenceChange = null;
  }

  add(seq) {
    seq.start = this.duration;
    this.duration += seq.duration;
    this.sequences.push(seq);
    return seq;
  }

  /** Build everything up front so playback never hitches on geometry. */
  async buildAll(onProgress) {
    for (let i = 0; i < this.sequences.length; i++) {
      const s = this.sequences[i];
      if (!s.built) {
        await s.build(this.ctx);
        s.built = true;
      }
      onProgress?.((i + 1) / this.sequences.length, s.id);
      // Yield so a loading bar can actually paint between builds.
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  sequenceAt(t) {
    for (const s of this.sequences) {
      if (t >= s.start && t < s.start + s.duration) return s;
    }
    return t >= this.duration ? this.sequences[this.sequences.length - 1] : this.sequences[0];
  }

  /** Absolute seek; does not touch audio. */
  seek(t) {
    this.time = Math.max(0, Math.min(this.duration, t));
    this._sync();
  }

  /**
   * Advance the clock. Pass `absolute` to drive time from an external master —
   * live playback slaves to AudioContext.currentTime so dropped frames never
   * desync the score, and the offline renderer passes frame/fps.
   */
  step(dt, absolute) {
    this.time = absolute === undefined ? this.time + dt : absolute;
    if (this.time > this.duration) this.time = this.duration;
    if (this.time < 0) this.time = 0;
    this._sync();
  }

  _sync() {
    const seq = this.sequenceAt(this.time);
    if (seq !== this.active) {
      this.active?.exit(this.ctx);
      this.active = seq;
      seq.enter(this.ctx);
      this.onSequenceChange?.(seq);
    }
  }

  /** Advance the world by dt and let the active sequence drive the frame. */
  update(dt, absolute) {
    this.step(dt, absolute);
    const seq = this.active;
    if (!seq) return;
    const local = this.time - seq.start;
    const { engine } = this.ctx;

    engine.renderPass.scene = seq.scene;
    engine.exposure = seq.exposure;
    engine.bloom.strength = seq.bloom.strength;
    engine.bloom.radius = seq.bloom.radius;
    engine.bloom.threshold = seq.bloom.threshold;

    seq.update(local, dt, this.ctx);

    // Fade the head and tail of each sequence to black.
    let fade = 0;
    if (seq.fadeIn > 0 && local < seq.fadeIn) fade = 1 - local / seq.fadeIn;
    const tail = seq.duration - local;
    if (seq.fadeOut > 0 && tail < seq.fadeOut) fade = Math.max(fade, 1 - tail / seq.fadeOut);
    engine.grade.uFade.value = smoothstep(fade);
  }

  get progress() { return this.duration ? this.time / this.duration : 0; }
}

export function smoothstep(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}

export function clamp(x, a = 0, b = 1) { return Math.max(a, Math.min(b, x)); }

/** 0 before t0, 1 after t1, eased between. */
export function ramp(t, t0, t1) {
  if (t1 <= t0) return t >= t1 ? 1 : 0;
  return smoothstep((t - t0) / (t1 - t0));
}

/** 1 inside [t0, t1] with eased shoulders of length `fade`. */
export function window_(t, t0, t1, fade = 0.4) {
  return Math.min(ramp(t, t0, t0 + fade), 1 - ramp(t, t1 - fade, t1));
}

export function ease(kind, x) {
  x = clamp(x);
  switch (kind) {
    case 'linear': return x;
    case 'in': return x * x;
    case 'out': return 1 - (1 - x) * (1 - x);
    case 'inout': return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
    case 'expoOut': return x === 1 ? 1 : 1 - Math.pow(2, -9 * x);
    case 'expoIn': return x === 0 ? 0 : Math.pow(2, 9 * (x - 1));
    case 'backOut': {
      const c = 1.70158;
      return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
    }
    case 'elasticOut': {
      if (x === 0 || x === 1) return x;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    }
    case 'smooth':
    default: return smoothstep(x);
  }
}
