// Keyframed cinematography. A shot is a list of camera keys; positions and
// look-at targets may be static vectors or functions of time so the camera can
// ride along with a ship. Handheld noise and roll are layered on top.

import * as THREE from 'three';
import { Ease, clamp, lerp, shakeNoise } from '../util/math.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();

function resolve(v, t, out) {
  if (typeof v === 'function') {
    const r = v(t);
    return out.set(r.x ?? r[0], r.y ?? r[1], r.z ?? r[2]);
  }
  if (v.isVector3) return out.copy(v);
  return out.set(v[0], v[1], v[2]);
}

/**
 * Evaluates a keyframe track at time t.
 * Keys: { t, pos, look, fov, roll, ease, cut }
 * `cut: true` makes the transition into that key instantaneous (a hard cut).
 */
export function evalTrack(keys, t, camera, extra = {}) {
  if (!keys.length) return;
  let i = 0;
  while (i < keys.length - 1 && t >= keys[i + 1].t) i++;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  let u = b === a ? 0 : clamp((t - a.t) / Math.max(1e-6, b.t - a.t));
  if (b.cut) u = u >= 1 ? 1 : 0;
  const ease = b.ease || Ease.inOutCubic;
  const e = b.cut ? u : ease(u);

  resolve(a.pos, t, _a);
  resolve(b.pos ?? a.pos, t, _b);
  camera.position.lerpVectors(_a, _b, e);

  const lookA = a.look ?? [0, 0, 0];
  const lookB = b.look ?? lookA;
  resolve(lookA, t, _a);
  resolve(lookB, t, _b);
  const target = _a.lerp(_b, e);

  const fov = lerp(a.fov ?? camera.fov, b.fov ?? a.fov ?? camera.fov, e);
  if (Math.abs(fov - camera.fov) > 1e-4) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  const roll = lerp(a.roll ?? 0, b.roll ?? a.roll ?? 0, e);
  const up = extra.up || _up;
  _m.lookAt(camera.position, target, up);
  _q.setFromRotationMatrix(_m);
  camera.quaternion.copy(_q);
  if (roll) camera.rotateZ(roll);
  return { index: i, u };
}

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.track = [];
    this.shakeAmp = 0;
    this.shakeFreq = 1;
    this.shakeSeed = 0;
    this.handheld = 0;
    this.up = new THREE.Vector3(0, 1, 0);
    this._impulses = [];
  }

  setTrack(keys) {
    this.track = keys;
    return this;
  }

  /** One-off camera kick, e.g. when something explodes nearby. */
  impulse(time, amount, decay = 1.2) {
    this._impulses.push({ time, amount, decay });
  }

  update(t) {
    if (this.track.length) evalTrack(this.track, t, this.camera, { up: this.up });

    let amp = this.shakeAmp;
    for (const im of this._impulses) {
      const dt = t - im.time;
      if (dt >= 0 && dt < im.decay * 4) amp += im.amount * Math.exp(-dt / im.decay);
    }
    if (this.handheld > 0) {
      const h = this.handheld;
      this.camera.position.x += shakeNoise(t * 0.19, 3) * h;
      this.camera.position.y += shakeNoise(t * 0.16, 7) * h;
      this.camera.rotateZ(shakeNoise(t * 0.12, 11) * h * 0.02);
    }
    if (amp > 1e-5) {
      const f = this.shakeFreq;
      this.camera.rotateX(shakeNoise(t * f, this.shakeSeed + 1) * amp * 0.02);
      this.camera.rotateY(shakeNoise(t * f, this.shakeSeed + 2) * amp * 0.02);
      this.camera.rotateZ(shakeNoise(t * f, this.shakeSeed + 3) * amp * 0.012);
    }
  }
}

/**
 * Points an object's +Z axis along `dir`. Every ship in the film is modelled
 * nose-forward on +Z, matching Object3D.lookAt's convention for non-cameras.
 */
export function aimAlong(obj, dir, up = _up, bankAmount = 0) {
  _a.copy(dir).normalize();
  if (Math.abs(_a.dot(up)) > 0.999) _a.x += 1e-4;
  // Matrix4.lookAt puts +Z along (eye - target), so passing the direction as
  // the "eye" and the origin as the "target" aligns +Z with dir.
  _m.lookAt(_a, _b.set(0, 0, 0), up);
  obj.quaternion.setFromRotationMatrix(_m);
  if (bankAmount) obj.rotateZ(bankAmount);
}

/**
 * Catmull-Rom flight path helper. Ships in the film mostly move along these:
 * the curve gives smooth position, and the tangent gives orientation for free.
 */
export class FlightPath {
  constructor(points, { closed = false, tension = 0.5 } = {}) {
    this.curve = new THREE.CatmullRomCurve3(
      points.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]))),
      closed,
      'catmullrom',
      tension,
    );
  }

  at(u, out = new THREE.Vector3()) {
    return this.curve.getPointAt(clamp(u), out);
  }

  tangent(u, out = new THREE.Vector3()) {
    return this.curve.getTangentAt(clamp(u), out);
  }

  /** Places `obj` on the path, aligning +Z with the tangent and banking on turns. */
  place(obj, u, { bank = 1.4, lead = 0.01, up = _up } = {}) {
    this.at(u, obj.position);
    const t0 = this.tangent(u, _a).clone();
    const t1 = this.tangent(clamp(u + lead), _b).clone();
    const turn = t1.clone().sub(t0);
    const bankAngle = -turn.dot(new THREE.Vector3().crossVectors(t0, up).normalize()) * bank * 12;
    aimAlong(obj, t0, up, bankAngle);
    return obj;
  }
}
