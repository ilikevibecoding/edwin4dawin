import * as THREE from 'three';
import { ease, clamp, noise1, lerp } from './util.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Data-driven shot list. A scene declares shots in local time and the
 * director interpolates position / target / fov / roll / shake for each frame.
 *
 * shot = {
 *   t: startTime, dur: seconds,
 *   pos: [x,y,z] | fn(u,t),          // static or animated eye
 *   to:  [x,y,z],                    // optional end eye (dolly)
 *   look:[x,y,z] | fn(u,t) | Object3D,
 *   lookTo: [x,y,z],                 // optional end target
 *   fov: 40, fovTo: 32,
 *   ease: 'inOutCubic',
 *   roll: 0, rollTo: 0,
 *   shake: 0..1, shakeFreq: 12,
 *   follow: Object3D, offset: [x,y,z], // chase cam in the object's frame
 *   handheld: 0..1,
 * }
 */
export class ShotList {
  constructor() { this.shots = []; }

  add(shot) {
    this.shots.push({ ease: 'inOutCubic', fov: 38, ...shot });
    return this;
  }

  /** Convenience: append a shot that starts when the previous one ended. */
  then(dur, shot) {
    const last = this.shots[this.shots.length - 1];
    const t = last ? last.t + last.dur : 0;
    return this.add({ ...shot, t, dur });
  }

  get duration() {
    return this.shots.reduce((m, s) => Math.max(m, s.t + s.dur), 0);
  }

  shotAt(t) {
    let best = null;
    for (const s of this.shots) {
      if (t >= s.t && t < s.t + s.dur) return s;
      if (!best || s.t <= t) best = s;
    }
    return best;
  }

  apply(camera, t) {
    const s = this.shotAt(t);
    if (!s) return;
    const u = clamp((t - s.t) / Math.max(1e-6, s.dur), 0, 1);
    const e = (ease[s.ease] || ease.inOutCubic)(u);

    if (s.follow) {
      const off = s.offset || [0, 3, 14];
      _a.set(off[0], off[1], off[2]);
      if (s.offsetTo) {
        _b.set(s.offsetTo[0], s.offsetTo[1], s.offsetTo[2]);
        _a.lerp(_b, e);
      }
      if (s.worldOffset) _a.add(s.follow.getWorldPosition(_b));
      else _a.applyMatrix4(s.follow.matrixWorld);
      camera.position.copy(_a);
      if (s.look) resolveVec(s.look, _b, e, u, t); else s.follow.getWorldPosition(_b);
      camera.lookAt(_b);
    } else {
      resolveVec(s.pos, _a, e, u, t);
      if (s.to) { resolveVec(s.to, _b, e, u, t); _a.lerp(_b, e); }
      camera.position.copy(_a);
      resolveVec(s.look ?? [0, 0, 0], _b, e, u, t);
      if (s.lookTo) { const tmp = new THREE.Vector3(); resolveVec(s.lookTo, tmp, e, u, t); _b.lerp(tmp, e); }
      camera.lookAt(_b);
    }

    const fov = s.fovTo !== undefined ? lerp(s.fov, s.fovTo, e) : s.fov;
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }

    const roll = s.rollTo !== undefined ? lerp(s.roll ?? 0, s.rollTo, e) : (s.roll ?? 0);
    if (roll) camera.rotateZ(roll);

    const shake = typeof s.shake === 'function' ? s.shake(u, t) : (s.shake ?? 0);
    if (shake > 0) {
      const f = s.shakeFreq ?? 13;
      camera.rotateX(noise1(t * f) * 0.016 * shake);
      camera.rotateY(noise1(t * f + 91.3) * 0.016 * shake);
      camera.rotateZ(noise1(t * f + 45.7) * 0.010 * shake);
      camera.position.x += noise1(t * f * 0.7 + 11) * 0.10 * shake;
      camera.position.y += noise1(t * f * 0.7 + 27) * 0.10 * shake;
    }
    if (s.handheld) {
      const h = s.handheld;
      camera.rotateX(noise1(t * 0.9 + 3) * 0.010 * h);
      camera.rotateY(noise1(t * 0.7 + 8) * 0.014 * h);
      camera.rotateZ(noise1(t * 0.5 + 5) * 0.006 * h);
    }
  }
}

function resolveVec(src, out, e, u, t) {
  if (!src) return out.set(0, 0, 0);
  if (typeof src === 'function') {
    const r = src(u, t);
    return Array.isArray(r) ? out.set(r[0], r[1], r[2]) : out.copy(r);
  }
  if (src.isVector3) return out.copy(src);
  if (src.isObject3D) return src.getWorldPosition(out);
  return out.set(src[0], src[1], src[2]);
}
