import * as THREE from 'three';
import { clamp, damp, fbm1, smoothstep } from '../core/MathX';

/**
 * Shot-based camera direction.
 *
 * A shot is a named function of time that writes a pose. The director picks
 * the active shot, optionally blends the first moments of a cut, then layers
 * handheld drift and impact shake on top. Nothing else is allowed to touch
 * the camera while the cinematic is running.
 */

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
  roll: number;
  /** 0 disables depth of field for the shot. */
  dof: number;
  focus: number;
  focusRange: number;
}

export function makePose(): CameraPose {
  return {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
    fov: 42,
    near: 1,
    far: 24000,
    roll: 0,
    dof: 0,
    focus: 30,
    focusRange: 60,
  };
}

export interface ShotContext {
  /** Absolute timeline seconds. */
  time: number;
  /** Seconds since this shot started. */
  local: number;
  /** 0..1 through the shot. */
  progress: number;
  dt: number;
}

export interface Shot {
  id: string;
  /** Human-readable name shown by the debug overlay. */
  label: string;
  start: number;
  end: number;
  /** Seconds of cross-fade from the previous shot; 0 is a hard cut. */
  blend?: number;
  /** Handheld amplitude in world units. */
  handheld?: number;
  apply: (ctx: ShotContext, pose: CameraPose) => void;
}

const _pose = makePose();
const _prevPose = makePose();
const _tmp = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _shakeQ = new THREE.Quaternion();
const _euler = new THREE.Euler();

export class CameraDirector {
  private shots: Shot[] = [];
  private activeIndex = -1;
  readonly pose = makePose();
  /** Name of the current shot, for the debug overlay and QA manifest. */
  currentShotId = '';
  currentShotLabel = '';

  /** Set by the FX manager; drives impact vibration. */
  shakeAmplitude = 0;
  shakeTime = 0;
  private smoothPosition = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private initialised = false;

  setShots(shots: Shot[]): void {
    this.shots = shots.slice().sort((a, b) => a.start - b.start);
  }

  get shotList(): Shot[] {
    return this.shots;
  }

  shotAt(time: number): { shot: Shot; index: number } | null {
    for (let i = 0; i < this.shots.length; i++) {
      const s = this.shots[i];
      if (time >= s.start && time < s.end) return { shot: s, index: i };
    }
    if (this.shots.length && time >= this.shots[this.shots.length - 1].end) {
      return { shot: this.shots[this.shots.length - 1], index: this.shots.length - 1 };
    }
    return this.shots.length ? { shot: this.shots[0], index: 0 } : null;
  }

  reset(): void {
    this.initialised = false;
    this.activeIndex = -1;
  }

  /** Evaluate the show camera and write it into `camera`. */
  update(camera: THREE.PerspectiveCamera, time: number, dt: number): void {
    const found = this.shotAt(time);
    if (!found) return;
    const { shot, index } = found;
    if (index !== this.activeIndex) {
      this.activeIndex = index;
      this.currentShotId = shot.id;
      this.currentShotLabel = shot.label;
    }

    const local = time - shot.start;
    const span = Math.max(0.001, shot.end - shot.start);
    copyPose(this.pose, _pose);
    shot.apply({ time, local, progress: clamp(local / span, 0, 1), dt }, _pose);

    // Cross-fade the opening of a shot with the previous one so cuts that are
    // meant to be soft do not pop.
    const blend = shot.blend ?? 0;
    if (blend > 0 && local < blend && index > 0) {
      const prev = this.shots[index - 1];
      copyPose(this.pose, _prevPose);
      prev.apply(
        {
          time,
          local: time - prev.start,
          progress: clamp((time - prev.start) / Math.max(0.001, prev.end - prev.start), 0, 1),
          dt,
        },
        _prevPose,
      );
      const k = smoothstep(0, 1, local / blend);
      _pose.position.lerpVectors(_prevPose.position, _pose.position, k);
      _pose.target.lerpVectors(_prevPose.target, _pose.target, k);
      _pose.fov = _prevPose.fov + (_pose.fov - _prevPose.fov) * k;
      _pose.roll = _prevPose.roll + (_pose.roll - _prevPose.roll) * k;
      _pose.dof = _prevPose.dof + (_pose.dof - _prevPose.dof) * k;
    }

    // Handheld: very low frequency, sub-degree. Enough to feel alive.
    const hh = shot.handheld ?? 0;
    if (hh > 0) {
      _pose.position.x += fbm1(time * 0.55, 2) * hh;
      _pose.position.y += fbm1(time * 0.47 + 31.7, 2) * hh;
      _pose.position.z += fbm1(time * 0.41 + 77.1, 2) * hh * 0.6;
      _pose.target.x += fbm1(time * 0.5 + 5.3, 2) * hh * 0.8;
      _pose.target.y += fbm1(time * 0.44 + 19.1, 2) * hh * 0.8;
    }

    if (!this.initialised) {
      this.smoothPosition.copy(_pose.position);
      this.smoothTarget.copy(_pose.target);
      this.initialised = true;
    }
    // A hard cut teleports; within a shot the pose is smoothed lightly to keep
    // per-frame jitter out of long lenses.
    const cut = local < 0.03 && (shot.blend ?? 0) === 0;
    if (cut) {
      this.smoothPosition.copy(_pose.position);
      this.smoothTarget.copy(_pose.target);
    } else {
      this.smoothPosition.lerp(_pose.position, 1 - Math.exp(-26 * dt));
      this.smoothTarget.lerp(_pose.target, 1 - Math.exp(-26 * dt));
    }

    copyPose(_pose, this.pose);
    this.pose.position.copy(this.smoothPosition);
    this.pose.target.copy(this.smoothTarget);

    this.applyTo(camera, dt);
  }

  /** Write the current pose plus shake into the three.js camera. */
  applyTo(camera: THREE.PerspectiveCamera, dt: number): void {
    camera.position.copy(this.pose.position);
    camera.up.copy(this.pose.up);
    _m.lookAt(this.pose.position, this.pose.target, this.pose.up);
    _q.setFromRotationMatrix(_m);

    const amp = this.shakeAmplitude;
    if (amp > 0.0005) {
      this.shakeTime += dt;
      const t = this.shakeTime;
      _euler.set(
        fbm1(t * 26, 2) * amp * 0.022,
        fbm1(t * 23 + 11, 2) * amp * 0.022,
        fbm1(t * 31 + 5, 2) * amp * 0.014,
      );
      _shakeQ.setFromEuler(_euler);
      _q.multiply(_shakeQ);
      _tmp.set(fbm1(t * 29 + 3, 2), fbm1(t * 33 + 8, 2), 0).multiplyScalar(amp * 0.03);
      _tmp.applyQuaternion(_q);
      camera.position.add(_tmp);
    }
    if (Math.abs(this.pose.roll) > 1e-5) {
      _shakeQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.pose.roll);
      _q.multiply(_shakeQ);
    }
    camera.quaternion.copy(_q);

    if (Math.abs(camera.fov - this.pose.fov) > 0.001) {
      camera.fov = damp(camera.fov, this.pose.fov, 30, dt);
    }
    camera.near = this.pose.near;
    camera.far = this.pose.far;
    camera.updateProjectionMatrix();
  }
}

export function copyPose(from: CameraPose, to: CameraPose): void {
  to.position.copy(from.position);
  to.target.copy(from.target);
  to.up.copy(from.up);
  to.fov = from.fov;
  to.near = from.near;
  to.far = from.far;
  to.roll = from.roll;
  to.dof = from.dof;
  to.focus = from.focus;
  to.focusRange = from.focusRange;
}
