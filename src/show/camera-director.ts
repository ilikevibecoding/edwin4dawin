/**
 * Camera direction.
 *
 * Every frame of the cinematic belongs to exactly one named shot. A shot owns
 * its clipping range, field of view and framing, and is a pure function of
 * time — which is what makes scrubbing exact and the visual QA tour
 * reproducible.
 *
 * Adjacent shots may overlap by a blend time, producing a soft dissolve of the
 * camera pose rather than a hard cut, and camera shake is applied on top as a
 * decaying trauma value driven by nearby impacts.
 */

import * as THREE from 'three';
import { clamp, smootherstep, shakeNoise } from '../core/math';
import type { World, Region } from './world';

export interface ShotContext {
  /** Absolute show time in seconds. */
  t: number;
  /** Seconds since this shot began. */
  local: number;
  /** Normalised progress through the shot, 0..1. */
  u: number;
  world: World;
  /** Write the desired eye position here. */
  eye: THREE.Vector3;
  /** Write the desired look-at target here. */
  target: THREE.Vector3;
  /** Optional roll about the view axis, in radians. */
  roll: number;
  /** Optional field-of-view override for this frame. */
  fov: number;
}

export interface Shot {
  id: string;
  /** Shown in the diagnostics overlay. */
  name: string;
  start: number;
  end: number;
  region: Region;
  near: number;
  far: number;
  fov: number;
  /** Seconds of pose cross-fade from the previous shot. */
  blend?: number;
  apply(c: ShotContext): void;
}

const _eyeA = new THREE.Vector3();
const _targetA = new THREE.Vector3();
const _eyeB = new THREE.Vector3();
const _targetB = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();

export class CameraDirector {
  private shots: Shot[] = [];
  private trauma = 0;
  private shakeSeed = 0;
  /** Set by the timeline; scales all shake (0 disables it). */
  shakeScale = 1;

  private lastShot: Shot | null = null;
  private context: ShotContext;

  constructor(private world: World) {
    this.context = {
      t: 0,
      local: 0,
      u: 0,
      world,
      eye: new THREE.Vector3(),
      target: new THREE.Vector3(),
      roll: 0,
      fov: 38,
    };
  }

  add(shot: Shot): void {
    this.shots.push(shot);
    this.shots.sort((a, b) => a.start - b.start);
  }

  addAll(shots: Shot[]): void {
    for (const s of shots) this.shots.push(s);
    this.shots.sort((a, b) => a.start - b.start);
  }

  get all(): readonly Shot[] {
    return this.shots;
  }

  shotAt(t: number): Shot | null {
    let found: Shot | null = null;
    for (const s of this.shots) {
      if (t >= s.start && t < s.end) found = s;
      if (s.start > t) break;
    }
    return found ?? (this.shots.length ? (t < this.shots[0].start ? this.shots[0] : this.shots[this.shots.length - 1]) : null);
  }

  private previousShot(shot: Shot): Shot | null {
    const i = this.shots.indexOf(shot);
    return i > 0 ? this.shots[i - 1] : null;
  }

  /** Evaluate a shot's framing into `eye`/`target`, returning the fov used. */
  private evaluateShot(shot: Shot, t: number, eye: THREE.Vector3, target: THREE.Vector3): { fov: number; roll: number } {
    const c = this.context;
    c.t = t;
    c.local = t - shot.start;
    c.u = clamp((t - shot.start) / Math.max(0.0001, shot.end - shot.start));
    c.roll = 0;
    c.fov = shot.fov;
    c.eye.set(0, 0, 0);
    c.target.set(0, 0, -1);
    shot.apply(c);
    eye.copy(c.eye);
    target.copy(c.target);
    return { fov: c.fov, roll: c.roll };
  }

  /** Add a shake impulse. `strength` is roughly 0..1 for a heavy hit. */
  impulse(strength: number): void {
    this.trauma = Math.min(1.15, this.trauma + strength);
    this.shakeSeed += 1;
  }

  /**
   * Impulse scaled by distance from the camera, so only nearby events shake
   * the frame. `falloff` is the distance at which the shake is halved.
   */
  impulseNear(worldPos: THREE.Vector3, strength: number, falloff = 60): void {
    const d = worldPos.distanceTo(this.lastCameraPos);
    this.impulse(strength * (falloff / (falloff + d)));
  }

  private lastCameraPos = new THREE.Vector3();

  get traumaLevel(): number {
    return this.trauma;
  }

  /**
   * Position `camera` for time `t`.
   * @returns the shot that was used, for the diagnostics overlay.
   */
  update(t: number, dt: number, camera: THREE.PerspectiveCamera): Shot | null {
    const shot = this.shotAt(t);
    if (!shot) return null;

    const a = this.evaluateShot(shot, t, _eyeA, _targetA);
    let fov = a.fov;
    let roll = a.roll;

    const blend = shot.blend ?? 0;
    const sinceStart = t - shot.start;
    if (blend > 0 && sinceStart < blend) {
      const prev = this.previousShot(shot);
      if (prev && prev.region === shot.region) {
        const b = this.evaluateShot(prev, Math.min(t, prev.end), _eyeB, _targetB);
        const k = smootherstep(0, blend, sinceStart);
        _eyeA.lerpVectors(_eyeB, _eyeA, k);
        _targetA.lerpVectors(_targetB, _targetA, k);
        fov = THREE.MathUtils.lerp(b.fov, a.fov, k);
        roll = THREE.MathUtils.lerp(b.roll, a.roll, k);
      }
    }

    camera.position.copy(_eyeA);
    _m.lookAt(_eyeA, _targetA, _up);
    camera.quaternion.setFromRotationMatrix(_m);
    if (roll !== 0) camera.rotateZ(roll);

    // Shake. Trauma decays exponentially; the offset is a deterministic
    // multi-octave function of time so replays are identical.
    this.trauma = Math.max(0, this.trauma - dt * 1.35);
    const amount = this.trauma * this.trauma * this.shakeScale;
    if (amount > 0.0005) {
      const scale = Math.max(0.02, _eyeA.distanceTo(_targetA) * 0.008);
      camera.position.x += shakeNoise(t, this.shakeSeed + 1) * amount * scale;
      camera.position.y += shakeNoise(t, this.shakeSeed + 2) * amount * scale;
      camera.position.z += shakeNoise(t, this.shakeSeed + 3) * amount * scale * 0.6;
      camera.rotateZ(shakeNoise(t, this.shakeSeed + 4) * amount * 0.02);
      camera.rotateX(shakeNoise(t, this.shakeSeed + 5) * amount * 0.012);
    }

    if (camera.near !== shot.near || camera.far !== shot.far || Math.abs(camera.fov - fov) > 1e-4) {
      camera.near = shot.near;
      camera.far = shot.far;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    this.lastCameraPos.copy(camera.position);
    this.lastShot = shot;
    return shot;
  }

  get current(): Shot | null {
    return this.lastShot;
  }

  reset(): void {
    this.trauma = 0;
    this.lastShot = null;
  }

  /** Sanity check used by the QA harness: no shot may leave a gap. */
  coverageGaps(from: number, to: number): Array<[number, number]> {
    const gaps: Array<[number, number]> = [];
    let cursor = from;
    for (const s of this.shots) {
      if (s.start > cursor + 0.001) gaps.push([cursor, s.start]);
      cursor = Math.max(cursor, s.end);
    }
    if (cursor < to - 0.001) gaps.push([cursor, to]);
    return gaps;
  }

  get worldRef(): World {
    return this.world;
  }
}
