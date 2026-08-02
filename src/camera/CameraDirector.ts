import * as THREE from 'three';
import { clamp, clamp01, damp, fbm1, smootherstep } from '../core/math';

/**
 * Shot-based camera direction.
 *
 * Chapters register named shots on a shared absolute timeline. The director
 * picks the active shot, evaluates it, optionally cross-blends with the shot it
 * replaced, and layers handheld drift plus impact shake on top. Every shot can
 * declare a focus distance so the defocus pass always agrees with the framing.
 */

export interface ShotSample {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  roll: number;
  focus: number;
  /** 0..1 handheld noise scale. */
  handheld: number;
}

export interface Shot {
  id: string;
  /** Absolute start time on the master timeline. */
  start: number;
  end: number;
  /** Seconds of cross-blend from the previous shot; 0 means a hard cut. */
  blend?: number;
  /** Base handheld amount for the shot. */
  handheld?: number;
  evaluate(t: number, out: ShotSample): void;
}

const _a: ShotSample = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 46,
  roll: 0,
  focus: 40,
  handheld: 0,
};
const _b: ShotSample = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 46,
  roll: 0,
  focus: 40,
  handheld: 0,
};

const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

export class CameraDirector {
  private shots: Shot[] = [];
  private activeIndex = -1;
  private previousIndex = -1;
  private previousEnd = 0;

  /** Additive shake, decayed every frame. */
  private shake = 0;
  private shakeSeed = 0;
  /** Steady low-frequency drift applied to every shot. */
  driftAmount = 1;

  readonly sample: ShotSample = {
    position: new THREE.Vector3(0, 0, 10),
    target: new THREE.Vector3(),
    fov: 46,
    roll: 0,
    focus: 40,
    handheld: 0,
  };

  /** Name of the shot currently on screen — surfaced by the debug overlay. */
  activeShotId = 'none';

  clear(): void {
    this.shots.length = 0;
    this.activeIndex = -1;
    this.previousIndex = -1;
  }

  add(shot: Shot): void {
    this.shots.push(shot);
    this.shots.sort((a, b) => a.start - b.start);
  }

  addAll(shots: Shot[]): void {
    for (const s of shots) this.shots.push(s);
    this.shots.sort((a, b) => a.start - b.start);
  }

  /** Apply an impact shake impulse (0..1). */
  impulse(strength: number): void {
    this.shake = Math.min(1.6, this.shake + strength);
  }

  reset(): void {
    this.shake = 0;
    this.activeIndex = -1;
    this.previousIndex = -1;
  }

  private indexAt(t: number): number {
    let found = -1;
    for (let i = 0; i < this.shots.length; i++) {
      if (t >= this.shots[i].start && t < this.shots[i].end) found = i;
      else if (t >= this.shots[i].end) found = found === -1 ? i : found;
    }
    if (found === -1 && this.shots.length > 0) return 0;
    // Prefer the latest shot whose window contains t.
    for (let i = this.shots.length - 1; i >= 0; i--) {
      if (t >= this.shots[i].start && t < this.shots[i].end) return i;
    }
    // Otherwise hold the last shot that has started.
    let last = 0;
    for (let i = 0; i < this.shots.length; i++) if (t >= this.shots[i].start) last = i;
    return last;
  }

  update(t: number, dt: number, camera: THREE.PerspectiveCamera): void {
    if (this.shots.length === 0) return;
    const idx = this.indexAt(t);
    if (idx !== this.activeIndex) {
      this.previousIndex = this.activeIndex;
      this.previousEnd = this.activeIndex >= 0 ? t : -1;
      this.activeIndex = idx;
      this.shakeSeed += 17.3;
    }
    const shot = this.shots[idx];
    this.activeShotId = shot.id;

    shot.evaluate(t, _a);
    let out = _a;

    const blend = shot.blend ?? 0;
    if (blend > 0 && this.previousIndex >= 0 && this.previousEnd >= 0) {
      const k = clamp01((t - this.previousEnd) / blend);
      if (k < 1) {
        this.shots[this.previousIndex].evaluate(t, _b);
        const s = smootherstep(k);
        _a.position.lerp(_b.position, 1 - s);
        _a.target.lerp(_b.target, 1 - s);
        _a.fov = _a.fov * s + _b.fov * (1 - s);
        _a.roll = _a.roll * s + _b.roll * (1 - s);
        _a.focus = _a.focus * s + _b.focus * (1 - s);
        _a.handheld = _a.handheld * s + _b.handheld * (1 - s);
        out = _a;
      }
    }

    this.sample.position.copy(out.position);
    this.sample.target.copy(out.target);
    this.sample.fov = out.fov;
    this.sample.roll = out.roll;
    this.sample.focus = out.focus;
    this.sample.handheld = out.handheld;

    // --- handheld drift and impact shake ------------------------------------
    this.shake = damp(this.shake, 0, 0.16, dt);
    const dist = this.sample.position.distanceTo(this.sample.target);
    const handheld = (shot.handheld ?? this.sample.handheld) * this.driftAmount;
    const driftScale = Math.max(0.02, dist * 0.0022) * handheld;
    const s = this.shakeSeed;
    this.sample.position.x += fbm1(t * 0.5 + s, 2, 11) * driftScale;
    this.sample.position.y += fbm1(t * 0.44 + s, 2, 29) * driftScale;
    this.sample.position.z += fbm1(t * 0.38 + s, 2, 53) * driftScale;

    if (this.shake > 0.001) {
      const k = this.shake * this.shake;
      const amp = Math.max(0.04, dist * 0.012) * k;
      this.sample.position.x += fbm1(t * 26 + s, 2, 101) * amp;
      this.sample.position.y += fbm1(t * 23 + s, 2, 211) * amp;
      this.sample.position.z += fbm1(t * 19 + s, 2, 307) * amp;
      this.sample.target.x += fbm1(t * 21 + s, 2, 401) * amp * 0.5;
      this.sample.target.y += fbm1(t * 25 + s, 2, 503) * amp * 0.5;
      this.sample.roll += fbm1(t * 17 + s, 2, 601) * 0.012 * k;
    }

    camera.position.copy(this.sample.position);
    _m.lookAt(this.sample.position, this.sample.target, _up);
    _q.setFromRotationMatrix(_m);
    if (Math.abs(this.sample.roll) > 1e-5) {
      _v.copy(this.sample.target).sub(this.sample.position).normalize();
      _q.premultiply(new THREE.Quaternion().setFromAxisAngle(_v, this.sample.roll));
    }
    camera.quaternion.copy(_q);
    if (Math.abs(camera.fov - this.sample.fov) > 1e-4) {
      camera.fov = this.sample.fov;
      camera.updateProjectionMatrix();
    }
  }

  get currentShake(): number {
    return this.shake;
  }
}

// ---------------------------------------------------------------------------
// Shot constructors
// ---------------------------------------------------------------------------

export interface ShotBase {
  id: string;
  start: number;
  end: number;
  fov?: number;
  blend?: number;
  handheld?: number;
  focus?: number;
  roll?: number;
}

/** Progress 0..1 through the shot, optionally eased. */
function progress(shot: { start: number; end: number }, t: number, ease?: (x: number) => number): number {
  const raw = clamp01((t - shot.start) / Math.max(1e-4, shot.end - shot.start));
  return ease ? ease(raw) : raw;
}

/** Camera moves along a straight line while the aim point moves along another. */
export function dollyShot(
  base: ShotBase & {
    from: THREE.Vector3 | (() => THREE.Vector3);
    to: THREE.Vector3 | (() => THREE.Vector3);
    lookFrom: THREE.Vector3 | (() => THREE.Vector3);
    lookTo?: THREE.Vector3 | (() => THREE.Vector3);
    ease?: (x: number) => number;
    fovTo?: number;
  },
): Shot {
  const get = (v: THREE.Vector3 | (() => THREE.Vector3)): THREE.Vector3 =>
    typeof v === 'function' ? v() : v;
  return {
    id: base.id,
    start: base.start,
    end: base.end,
    blend: base.blend,
    handheld: base.handheld ?? 0.5,
    evaluate(t, out) {
      const k = progress(base, t, base.ease ?? smootherstep);
      out.position.copy(get(base.from)).lerp(get(base.to), k);
      out.target.copy(get(base.lookFrom)).lerp(get(base.lookTo ?? base.lookFrom), k);
      out.fov = base.fov ?? 46;
      if (base.fovTo !== undefined) out.fov = (base.fov ?? 46) + (base.fovTo - (base.fov ?? 46)) * k;
      out.roll = base.roll ?? 0;
      out.focus = base.focus ?? out.position.distanceTo(out.target);
      out.handheld = base.handheld ?? 0.5;
    },
  };
}

/** Camera holds a fixed offset relative to a moving object. */
export function followShot(
  base: ShotBase & {
    subject: THREE.Object3D;
    /** Offset in the subject's local space at the start of the shot. */
    offset: THREE.Vector3;
    offsetTo?: THREE.Vector3;
    /** Aim offset in the subject's local space. */
    lookOffset?: THREE.Vector3;
    lookOffsetTo?: THREE.Vector3;
    /** Blend the offsets in world space instead of the subject's space. */
    worldSpaceOffset?: boolean;
    ease?: (x: number) => number;
    fovTo?: number;
  },
): Shot {
  const tmpOff = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  return {
    id: base.id,
    start: base.start,
    end: base.end,
    blend: base.blend,
    handheld: base.handheld ?? 0.6,
    evaluate(t, out) {
      const k = progress(base, t, base.ease ?? smootherstep);
      base.subject.updateWorldMatrix(true, false);
      tmpOff.copy(base.offset).lerp(base.offsetTo ?? base.offset, k);
      tmpLook.copy(base.lookOffset ?? ZERO3).lerp(base.lookOffsetTo ?? base.lookOffset ?? ZERO3, k);
      if (base.worldSpaceOffset) {
        out.position.setFromMatrixPosition(base.subject.matrixWorld).add(tmpOff);
        out.target.setFromMatrixPosition(base.subject.matrixWorld).add(tmpLook);
      } else {
        out.position.copy(tmpOff).applyMatrix4(base.subject.matrixWorld);
        out.target.copy(tmpLook).applyMatrix4(base.subject.matrixWorld);
      }
      out.fov = base.fov ?? 46;
      if (base.fovTo !== undefined) out.fov = (base.fov ?? 46) + (base.fovTo - (base.fov ?? 46)) * k;
      out.roll = base.roll ?? 0;
      out.focus = base.focus ?? out.position.distanceTo(out.target);
      out.handheld = base.handheld ?? 0.6;
    },
  };
}

/** Camera orbits a point while looking at it. */
export function orbitShot(
  base: ShotBase & {
    centre: THREE.Vector3 | (() => THREE.Vector3);
    radius: number;
    radiusTo?: number;
    yaw: number;
    yawTo: number;
    pitch: number;
    pitchTo?: number;
    lookOffset?: THREE.Vector3;
    ease?: (x: number) => number;
  },
): Shot {
  const c = new THREE.Vector3();
  return {
    id: base.id,
    start: base.start,
    end: base.end,
    blend: base.blend,
    handheld: base.handheld ?? 0.4,
    evaluate(t, out) {
      const k = progress(base, t, base.ease ?? smootherstep);
      c.copy(typeof base.centre === 'function' ? base.centre() : base.centre);
      const yaw = base.yaw + (base.yawTo - base.yaw) * k;
      const pitch = base.pitch + ((base.pitchTo ?? base.pitch) - base.pitch) * k;
      const r = base.radius + ((base.radiusTo ?? base.radius) - base.radius) * k;
      out.position.set(
        c.x + Math.sin(yaw) * Math.cos(pitch) * r,
        c.y + Math.sin(pitch) * r,
        c.z + Math.cos(yaw) * Math.cos(pitch) * r,
      );
      out.target.copy(c).add(base.lookOffset ?? ZERO3);
      out.fov = base.fov ?? 46;
      out.roll = base.roll ?? 0;
      out.focus = base.focus ?? out.position.distanceTo(out.target);
      out.handheld = base.handheld ?? 0.4;
    },
  };
}

/** Fully custom shot. */
export function customShot(
  base: ShotBase,
  fn: (k: number, t: number, out: ShotSample) => void,
): Shot {
  return {
    id: base.id,
    start: base.start,
    end: base.end,
    blend: base.blend,
    handheld: base.handheld ?? 0.4,
    evaluate(t, out) {
      out.fov = base.fov ?? 46;
      out.roll = base.roll ?? 0;
      out.handheld = base.handheld ?? 0.4;
      fn(progress(base, t), t, out);
      if (base.focus !== undefined) out.focus = base.focus;
      else out.focus = out.position.distanceTo(out.target);
    },
  };
}

const ZERO3 = new THREE.Vector3();

/** Keep a camera position outside a sphere — used to avoid entering geometry. */
export function pushOutOfSphere(
  position: THREE.Vector3,
  centre: THREE.Vector3,
  radius: number,
): void {
  _v.copy(position).sub(centre);
  const d = _v.length();
  if (d < 1e-4) {
    position.set(centre.x, centre.y + radius, centre.z);
    return;
  }
  if (d < radius) position.copy(centre).addScaledVector(_v.divideScalar(d), radius);
}

/** Clamp a camera inside an axis-aligned interior volume. */
export function clampToBox(
  position: THREE.Vector3,
  min: THREE.Vector3,
  max: THREE.Vector3,
  margin = 0.25,
): void {
  position.x = clamp(position.x, min.x + margin, max.x - margin);
  position.y = clamp(position.y, min.y + margin, max.y - margin);
  position.z = clamp(position.z, min.z + margin, max.z - margin);
}
