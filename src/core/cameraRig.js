import * as THREE from 'three';
import { ease, clamp } from './timeline.js';

/*
 * Camera work.
 *
 * Shots are written as keyframes of position / target / fov / roll, sampled at
 * sequence-local time. Positions run through a Catmull-Rom spline so a three
 * point move curves like a crane rather than a dogleg. Handheld float and
 * impact shake are deterministic value noise driven by time, never by a random
 * number generator, so the offline render matches playback exactly.
 */

const _p = new THREE.Vector3();
const _l = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

function hash1(n) {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash1(i), b = hash1(i + 1);
  return (a + (b - a) * u) * 2 - 1;
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.fov = 38;
    this.roll = 0;
    this.shakeAmp = 0;
    this.shakeDecay = 3.0;
    this.handheldAmp = 0;
    this.handheldSpeed = 1;
    this._follow = null;
    this._smoothPos = new THREE.Vector3();
    this._smoothLook = new THREE.Vector3();
    this._init = false;
  }

  reset() {
    this.shakeAmp = 0;
    this.handheldAmp = 0;
    this._follow = null;
    this._init = false;
    this.roll = 0;
  }

  set(pos, look, fov = this.fov, roll = 0) {
    this.position.set(pos[0], pos[1], pos[2]);
    this.target.set(look[0], look[1], look[2]);
    this.fov = fov;
    this.roll = roll;
    return this;
  }

  /**
   * Sample a shot.
   * keys: [{ t, pos:[x,y,z], look:[x,y,z], fov?, roll?, ease? }, ...] ordered by t.
   */
  keys(keys, t) {
    if (keys.length === 1) {
      return this.set(keys[0].pos, keys[0].look, keys[0].fov ?? this.fov, keys[0].roll ?? 0);
    }
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[i + 1];
    const span = Math.max(1e-5, b.t - a.t);
    const raw = clamp((t - a.t) / span);
    const u = ease(b.ease || 'smooth', raw);

    // Catmull-Rom through the neighbouring keys keeps multi-key moves curved.
    const p0 = keys[Math.max(0, i - 1)].pos, p1 = a.pos, p2 = b.pos, p3 = keys[Math.min(keys.length - 1, i + 2)].pos;
    this.position.set(
      catmull(p0[0], p1[0], p2[0], p3[0], u),
      catmull(p0[1], p1[1], p2[1], p3[1], u),
      catmull(p0[2], p1[2], p2[2], p3[2], u),
    );
    const l0 = keys[Math.max(0, i - 1)].look, l1 = a.look, l2 = b.look, l3 = keys[Math.min(keys.length - 1, i + 2)].look;
    this.target.set(
      catmull(l0[0], l1[0], l2[0], l3[0], u),
      catmull(l0[1], l1[1], l2[1], l3[1], u),
      catmull(l0[2], l1[2], l2[2], l3[2], u),
    );
    this.fov = lerp(a.fov ?? this.fov, b.fov ?? a.fov ?? this.fov, u);
    this.roll = lerp(a.roll ?? 0, b.roll ?? 0, u);
    return this;
  }

  /** Chase an object at a fixed offset in its local frame, with lag. */
  follow(object, offset, lookAhead = [0, 0, -10], damping = 6) {
    this._follow = { object, offset, lookAhead, damping };
    return this;
  }

  /** One-shot impact shake; decays on its own. */
  shake(amount) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
    return this;
  }

  handheld(amount, speed = 1) {
    this.handheldAmp = amount;
    this.handheldSpeed = speed;
    return this;
  }

  update(t, dt) {
    const cam = this.camera;

    if (this._follow) {
      const { object, offset, lookAhead, damping } = this._follow;
      _p.set(offset[0], offset[1], offset[2]).applyMatrix4(
        _m.makeRotationFromQuaternion(object.getWorldQuaternion(_q)),
      ).add(object.getWorldPosition(_l));
      _l.set(lookAhead[0], lookAhead[1], lookAhead[2]).applyMatrix4(
        _m.makeRotationFromQuaternion(object.getWorldQuaternion(_q)),
      ).add(object.getWorldPosition(new THREE.Vector3()));
      if (!this._init) { this._smoothPos.copy(_p); this._smoothLook.copy(_l); this._init = true; }
      const k = 1 - Math.exp(-damping * dt);
      this._smoothPos.lerp(_p, k);
      this._smoothLook.lerp(_l, k);
      this.position.copy(this._smoothPos);
      this.target.copy(this._smoothLook);
    }

    cam.position.copy(this.position);

    if (this.handheldAmp > 0) {
      const s = this.handheldSpeed;
      cam.position.x += noise1(t * 0.63 * s + 11.3) * this.handheldAmp;
      cam.position.y += noise1(t * 0.71 * s + 41.7) * this.handheldAmp;
      cam.position.z += noise1(t * 0.55 * s + 77.1) * this.handheldAmp * 0.5;
    }
    if (this.shakeAmp > 0.0005) {
      const f = t * 34;
      cam.position.x += noise1(f + 3.1) * this.shakeAmp;
      cam.position.y += noise1(f + 19.7) * this.shakeAmp;
      cam.position.z += noise1(f + 51.3) * this.shakeAmp * 0.6;
      this.shakeAmp *= Math.exp(-this.shakeDecay * dt);
    }

    cam.up.set(0, 1, 0);
    cam.lookAt(this.target);
    if (this.roll || this.shakeAmp > 0.0005) {
      const extra = this.shakeAmp > 0.0005 ? noise1(t * 27 + 7.7) * this.shakeAmp * 0.06 : 0;
      cam.rotateZ(this.roll + extra);
    }
    if (Math.abs(cam.fov - this.fov) > 1e-4) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }
}

function lerp(a, b, u) { return a + (b - a) * u; }

function catmull(p0, p1, p2, p3, u) {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const u2 = u * u, u3 = u2 * u;
  return (2 * p1 - 2 * p2 + v0 + v1) * u3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * u2 + v0 * u + p1;
}

/** Point an object along a velocity vector with a bank angle. */
export function flyOrient(object, velocity, bank = 0, up = _up) {
  _l.copy(object.position).add(velocity);
  object.lookAt(_l);
  if (bank) object.rotateZ(bank);
}
