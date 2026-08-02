import * as THREE from 'three';
import { clamp, damp, saturate } from '../core/mathx';
import { fbm1 } from '../core/Rng';
import type { SpaceScene } from '../scenes/SpaceScene';
import type { CorridorScene } from '../scenes/CorridorScene';

/**
 * Camera direction.
 *
 * Every frame of the cinematic belongs to exactly one named shot with an
 * explicit start, end, lens, near/far pair and scene. Shots are evaluated as
 * pure functions of the master clock, then a shared layer adds battle shake and
 * a small amount of operator drift on top so nothing ever looks locked-off dead.
 */

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  roll: number;
  near: number;
  far: number;
  /** Multiplier on the global battle-shake signal. */
  shake: number;
  /** Amplitude, in world units, of the always-on operator drift. */
  handheld: number;
  focusDistance: number;
}

export interface ShotContext {
  space: SpaceScene;
  interior: CorridorScene;
  time: number;
}

export interface Shot {
  id: string;
  label: string;
  scene: 'space' | 'interior';
  start: number;
  end: number;
  evaluate(t: number, ctx: ShotContext, out: CameraState): void;
}

export function makeCameraState(): CameraState {
  return {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    fov: 38,
    roll: 0,
    near: 5,
    far: 2_400_000,
    shake: 1,
    handheld: 1,
    focusDistance: 100,
  };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

export class CameraDirector {
  readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 5, 2_400_000);
  readonly shots: Shot[];
  private state = makeCameraState();
  private smoothed = makeCameraState();
  private initialised = false;
  private shakeSource: (t: number) => number = () => 0;

  /** Current shot, exposed to the debug overlay and QA manifest. */
  current: Shot;

  constructor(shots: Shot[]) {
    if (!shots.length) throw new Error('CameraDirector requires at least one shot');
    this.shots = [...shots].sort((a, b) => a.start - b.start);
    this.current = this.shots[0];
    this.camera.name = 'cinematicCamera';
  }

  setShakeSource(fn: (t: number) => number): void {
    this.shakeSource = fn;
  }

  shotAt(t: number): Shot {
    let found = this.shots[0];
    for (const shot of this.shots) {
      if (t >= shot.start) found = shot;
      else break;
    }
    return found;
  }

  /** True when the requested time belongs to the ship-interior scene. */
  sceneAt(t: number): 'space' | 'interior' {
    return this.shotAt(t).scene;
  }

  /**
   * @param t master timeline time
   * @param dt real elapsed seconds (only used for the non-deterministic smoothing pass)
   * @param instant skip smoothing - used when scrubbing or rendering QA frames
   */
  update(t: number, dt: number, ctx: ShotContext, instant = false): void {
    const shot = this.shotAt(t);
    const changed = shot !== this.current;
    this.current = shot;

    const s = this.state;
    s.up.set(0, 1, 0);
    s.roll = 0;
    s.shake = 1;
    s.handheld = 1;
    s.fov = 38;
    s.near = shot.scene === 'interior' ? 0.06 : 5;
    s.far = shot.scene === 'interior' ? 600 : 2_400_000;
    s.focusDistance = 0;
    shot.evaluate(t, ctx, s);

    // Battle shake, scaled by the shot and shaped so it never becomes noise.
    const shakeAmount = this.shakeSource(t) * s.shake;
    if (shakeAmount > 0.001) {
      const amp = shakeAmount * (shot.scene === 'interior' ? 0.05 : 6.5);
      s.position.x += fbm1(t * 23.1) * amp;
      s.position.y += fbm1(t * 19.7 + 31) * amp;
      s.position.z += fbm1(t * 26.3 + 77) * amp * 0.6;
      s.target.x += fbm1(t * 21.3 + 11) * amp * 0.6;
      s.target.y += fbm1(t * 24.9 + 53) * amp * 0.6;
      s.roll += fbm1(t * 13.7 + 91) * shakeAmount * 0.016;
    }

    // Operator drift keeps locked-off frames alive.
    if (s.handheld > 0) {
      const amp = s.handheld * (shot.scene === 'interior' ? 0.012 : 1.4);
      s.position.x += fbm1(t * 0.37) * amp;
      s.position.y += fbm1(t * 0.29 + 13) * amp;
      s.target.x += fbm1(t * 0.23 + 5) * amp * 0.8;
      s.target.y += fbm1(t * 0.31 + 41) * amp * 0.8;
    }

    const target = instant || changed || !this.initialised ? s : this.smooth(s, dt);
    this.apply(target);
    this.initialised = true;
  }

  /** Light temporal smoothing removes single-frame jitter without adding lag. */
  private smooth(s: CameraState, dt: number): CameraState {
    const k = 26;
    const sm = this.smoothed;
    sm.position.set(
      damp(sm.position.x, s.position.x, k, dt),
      damp(sm.position.y, s.position.y, k, dt),
      damp(sm.position.z, s.position.z, k, dt),
    );
    sm.target.set(
      damp(sm.target.x, s.target.x, k, dt),
      damp(sm.target.y, s.target.y, k, dt),
      damp(sm.target.z, s.target.z, k, dt),
    );
    sm.up.copy(s.up);
    sm.fov = damp(sm.fov, s.fov, k, dt);
    sm.roll = damp(sm.roll, s.roll, k, dt);
    sm.near = s.near;
    sm.far = s.far;
    sm.focusDistance = s.focusDistance;
    return sm;
  }

  private apply(s: CameraState): void {
    this.camera.position.copy(s.position);
    _dir.copy(s.target).sub(s.position);
    if (_dir.lengthSq() < 1e-9) _dir.set(0, 0, -1);
    _dir.normalize();
    _up.copy(s.up);
    _right.crossVectors(_dir, _up);
    if (_right.lengthSq() < 1e-8) {
      _up.set(0, 0, 1);
      _right.crossVectors(_dir, _up);
    }
    _right.normalize();
    _up.crossVectors(_right, _dir).normalize();
    if (Math.abs(s.roll) > 1e-6) {
      _q.setFromAxisAngle(_dir, s.roll);
      _up.applyQuaternion(_q);
      _right.applyQuaternion(_q);
    }
    _m.makeBasis(_right, _up, _dir.clone().negate());
    this.camera.quaternion.setFromRotationMatrix(_m);
    this.camera.fov = s.fov;
    this.camera.near = s.near;
    this.camera.far = s.far;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  }

  /** Snap the smoothing buffer, used after a seek so the next frame is exact. */
  resetSmoothing(): void {
    this.initialised = false;
  }

  get shotProgress(): number {
    return 0;
  }
}

/** Utility: progress inside a shot, clamped to [0,1]. */
export function shotProgress(shot: Shot, t: number): number {
  return saturate((t - shot.start) / Math.max(1e-6, shot.end - shot.start));
}

export { clamp };
