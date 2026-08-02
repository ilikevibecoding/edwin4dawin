import * as THREE from 'three';
import { clamp, easeInOutCubic, easeOutCubic, invLerp, smootherstep } from '../core/mathx';

/**
 * Keyframe tracks.
 *
 * Ship and camera choreography is authored as named keyframes with an easing
 * per segment rather than as loose magic numbers. Every track is evaluated as a
 * pure function of the master clock.
 */

export type Easing = 'linear' | 'smooth' | 'smoother' | 'in-out' | 'out' | 'hold';

const EASINGS: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => smootherstep(0, 1, t),
  'in-out': easeInOutCubic,
  out: easeOutCubic,
  hold: () => 0,
};

export interface ScalarKey {
  t: number;
  v: number;
  ease?: Easing;
}

export class ScalarTrack {
  readonly keys: ScalarKey[];

  constructor(keys: ScalarKey[]) {
    this.keys = [...keys].sort((a, b) => a.t - b.t);
    if (!this.keys.length) throw new Error('ScalarTrack requires at least one key');
  }

  at(t: number): number {
    const keys = this.keys;
    if (t <= keys[0].t) return keys[0].v;
    const last = keys[keys.length - 1];
    if (t >= last.t) return last.v;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const f = EASINGS[b.ease ?? 'smooth'](invLerp(a.t, b.t, t));
    return a.v + (b.v - a.v) * f;
  }

  get start(): number {
    return this.keys[0].t;
  }

  get end(): number {
    return this.keys[this.keys.length - 1].t;
  }
}

export interface VectorKey {
  t: number;
  v: [number, number, number];
  ease?: Easing;
}

export class VectorTrack {
  readonly keys: VectorKey[];
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();

  constructor(keys: VectorKey[]) {
    this.keys = [...keys].sort((x, y) => x.t - y.t);
    if (!this.keys.length) throw new Error('VectorTrack requires at least one key');
  }

  at(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const keys = this.keys;
    if (t <= keys[0].t) return out.fromArray(keys[0].v);
    const last = keys[keys.length - 1];
    if (t >= last.t) return out.fromArray(last.v);
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
    const ka = keys[i];
    const kb = keys[i + 1];
    const f = EASINGS[kb.ease ?? 'smooth'](invLerp(ka.t, kb.t, t));
    this.a.fromArray(ka.v);
    this.b.fromArray(kb.v);
    return out.copy(this.a).lerp(this.b, f);
  }

  /** Finite-difference velocity, used to derive heading and banking. */
  velocityAt(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    const h = 0.05;
    const a = this.at(t - h, new THREE.Vector3());
    const b = this.at(t + h, out);
    return b.sub(a).divideScalar(2 * h);
  }

  get start(): number {
    return this.keys[0].t;
  }

  get end(): number {
    return this.keys[this.keys.length - 1].t;
  }
}

/**
 * Piecewise-constant speed integrated to a distance, so a ship can accelerate
 * and coast without the author writing an integral by hand.
 */
export class SpeedProfile {
  private segments: Array<{ t0: number; t1: number; v0: number; v1: number; d0: number }> = [];
  private baseTime: number;

  constructor(baseTime: number, keys: Array<{ t: number; v: number }>) {
    this.baseTime = baseTime;
    const sorted = [...keys].sort((a, b) => a.t - b.t);
    let d = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      this.segments.push({ t0: a.t, t1: b.t, v0: a.v, v1: b.v, d0: d });
      d += ((a.v + b.v) / 2) * (b.t - a.t);
    }
    if (!this.segments.length) {
      const only = sorted[0] ?? { t: baseTime, v: 0 };
      this.segments.push({ t0: only.t, t1: only.t + 1, v0: only.v, v1: only.v, d0: 0 });
    }
  }

  speedAt(t: number): number {
    const first = this.segments[0];
    const last = this.segments[this.segments.length - 1];
    if (t <= first.t0) return first.v0;
    if (t >= last.t1) return last.v1;
    for (const s of this.segments) {
      if (t >= s.t0 && t <= s.t1) {
        const f = invLerp(s.t0, s.t1, t);
        return s.v0 + (s.v1 - s.v0) * f;
      }
    }
    return last.v1;
  }

  distanceAt(t: number): number {
    const first = this.segments[0];
    const last = this.segments[this.segments.length - 1];
    if (t <= first.t0) return first.v0 * (t - first.t0);
    if (t >= last.t1) {
      const total = last.d0 + ((last.v0 + last.v1) / 2) * (last.t1 - last.t0);
      return total + last.v1 * (t - last.t1);
    }
    for (const s of this.segments) {
      if (t >= s.t0 && t <= s.t1) {
        const dt = t - s.t0;
        const a = (s.v1 - s.v0) / Math.max(1e-6, s.t1 - s.t0);
        return s.d0 + s.v0 * dt + 0.5 * a * dt * dt;
      }
    }
    return 0;
  }

  get origin(): number {
    return this.baseTime;
  }
}

/** Deterministic, bounded wobble for hand-held camera feel and ship drift. */
export function wobble(t: number, freq: number, seedOffset = 0): number {
  return (
    Math.sin(t * freq + seedOffset) * 0.6 +
    Math.sin(t * freq * 1.71 + seedOffset * 2.3) * 0.3 +
    Math.sin(t * freq * 0.41 + seedOffset * 4.7) * 0.1
  );
}

export function clampVector(v: THREE.Vector3, limit: number): THREE.Vector3 {
  if (v.length() > limit) v.setLength(limit);
  return v;
}

export { clamp };
