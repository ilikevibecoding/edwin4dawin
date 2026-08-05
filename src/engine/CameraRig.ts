import * as THREE from 'three';
import { clamp, damp, EASINGS, Easing, fbm, lerp } from './math';

export type Vec3Source = THREE.Vector3 | (() => THREE.Vector3);

export interface Shot {
  /** Camera position, or a function evaluated every frame (for tracking). */
  from: Vec3Source;
  /** Look-at point. */
  to: Vec3Source;
  fov?: number;
  /** Focus distance in metres, or 'auto' to focus on the look target. */
  focus?: number | 'auto';
  aperture?: number;
  /** Depth range (metres) that stays acceptably sharp. */
  focalRange?: number;
  roll?: number;
  /** Handheld camera-operator noise, 0..1. */
  handheld?: number;
  /** Dolly: offset added to `from` over the life of the shot. */
  dolly?: { offset: [number, number, number]; duration: number; ease?: keyof typeof EASINGS };
  /** Slow push toward the target. */
  push?: { amount: number; duration: number };
  shake?: number;
}

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

const resolve = (v: Vec3Source, out: THREE.Vector3) => (typeof v === 'function' ? out.copy(v()) : out.copy(v));

/**
 * Cinematic camera: cuts and blends between framed shots, with handheld noise,
 * dolly moves and focus tracking. Also runs a third-person mode for the
 * playable exploration beats.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private shot: Shot | null = null;
  private prevPos = new THREE.Vector3();
  private prevTarget = new THREE.Vector3();
  private prevFov = 38;
  private blendTime = 0;
  private blendDuration = 0;
  private blendEase: Easing = EASINGS.inOut;
  private shotTime = 0;
  private pos = new THREE.Vector3(0, 1.6, 4);
  private target = new THREE.Vector3(0, 1.5, 0);
  private noiseSeed = Math.random() * 100;
  private shakeAmount = 0;

  focusDistance = 5;
  aperture = 12;
  focalRange = 4;

  /** Third-person mode state. */
  followMode = false;
  followTarget = new THREE.Vector3();
  followYaw = 0;
  followPitch = 0.06;
  followDistance = 2.35;
  followHeight = 1.5;
  private followPos = new THREE.Vector3();
  private followLook = new THREE.Vector3();

  constructor(aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(38, aspect, 0.08, 260);
    this.camera.position.copy(this.pos);
  }

  get currentShot() {
    return this.shot;
  }

  cut(shot: Shot) {
    this.shot = shot;
    this.shotTime = 0;
    this.blendDuration = 0;
    this.blendTime = 0;
    this.followMode = false;
    resolve(shot.from, this.pos);
    resolve(shot.to, this.target);
    this.camera.fov = shot.fov ?? 38;
    this.camera.updateProjectionMatrix();
    this.apply(0, true);
  }

  blend(shot: Shot, duration: number, ease: keyof typeof EASINGS = 'inOut') {
    if (!this.shot || duration <= 0) {
      this.cut(shot);
      return;
    }
    this.prevPos.copy(this.pos);
    this.prevTarget.copy(this.target);
    this.prevFov = this.camera.fov;
    this.shot = shot;
    this.shotTime = 0;
    this.blendDuration = duration;
    this.blendTime = 0;
    this.blendEase = EASINGS[ease] ?? EASINGS.inOut;
    this.followMode = false;
  }

  follow(targetPos: THREE.Vector3, yaw: number) {
    this.followMode = true;
    this.followTarget.copy(targetPos);
    this.followYaw = yaw;
  }

  addShake(amount: number) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  private apply(dt: number, snap = false) {
    const cam = this.camera;
    if (this.followMode) {
      const yaw = this.followYaw;
      const pitch = this.followPitch;
      const dist = this.followDistance;
      tmpA.set(
        this.followTarget.x - Math.sin(yaw) * Math.cos(pitch) * dist,
        this.followTarget.y + this.followHeight + Math.sin(pitch) * dist,
        this.followTarget.z - Math.cos(yaw) * Math.cos(pitch) * dist,
      );
      // Shoulder offset so the character does not block the centre of frame.
      tmpB.set(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(0.42);
      tmpA.add(tmpB);
      const lambda = snap ? 1e6 : 9;
      this.followPos.set(
        damp(this.followPos.x, tmpA.x, lambda, dt),
        damp(this.followPos.y, tmpA.y, lambda, dt),
        damp(this.followPos.z, tmpA.z, lambda, dt),
      );
      this.followLook.set(
        damp(this.followLook.x, this.followTarget.x + tmpB.x * 1.2, lambda, dt),
        damp(this.followLook.y, this.followTarget.y + this.followHeight - 0.06, lambda, dt),
        damp(this.followLook.z, this.followTarget.z + tmpB.z * 1.2, lambda, dt),
      );
      this.pos.copy(this.followPos);
      this.target.copy(this.followLook);
      cam.fov = lerp(cam.fov, 46, snap ? 1 : clamp(dt * 4));
      cam.updateProjectionMatrix();
      cam.position.copy(this.pos);
      cam.lookAt(this.target);
      this.focusDistance = this.pos.distanceTo(this.target);
      this.aperture = 7;
      this.focalRange = 3.2;
      return;
    }

    const shot = this.shot;
    if (!shot) return;

    resolve(shot.from, tmpA);
    // Dolly and push.
    if (shot.dolly) {
      const k = clamp(this.shotTime / Math.max(0.001, shot.dolly.duration));
      const e = (EASINGS[shot.dolly.ease ?? 'inOut'] ?? EASINGS.inOut)(k);
      tmpA.x += shot.dolly.offset[0] * e;
      tmpA.y += shot.dolly.offset[1] * e;
      tmpA.z += shot.dolly.offset[2] * e;
    }
    resolve(shot.to, tmpB);
    if (shot.push) {
      const k = clamp(this.shotTime / Math.max(0.001, shot.push.duration));
      tmpA.lerp(tmpB, shot.push.amount * EASINGS.inOut(k));
    }

    if (this.blendDuration > 0 && this.blendTime < this.blendDuration) {
      const k = this.blendEase(clamp(this.blendTime / this.blendDuration));
      tmpA.lerp(this.prevPos, 1 - k);
      const targetNow = tmpB.clone();
      tmpB.copy(this.prevTarget).lerp(targetNow, k);
      cam.fov = lerp(this.prevFov, shot.fov ?? 38, k);
    } else {
      cam.fov = shot.fov ?? 38;
    }
    cam.updateProjectionMatrix();

    this.pos.copy(tmpA);
    this.target.copy(tmpB);

    // Handheld: low-frequency drift plus a touch of breathing.
    const hh = shot.handheld ?? 0.35;
    if (hh > 0) {
      const t = this.shotTime * 0.5 + this.noiseSeed;
      const nx = (fbm(t * 1.3, 0.5, 3) - 0.5) * 2;
      const ny = (fbm(0.5, t * 1.1 + 3.2, 3) - 0.5) * 2;
      const nz = (fbm(t * 0.7 + 9.1, 2.3, 3) - 0.5) * 2;
      const amp = 0.012 * hh;
      this.pos.x += nx * amp;
      this.pos.y += ny * amp * 0.8;
      this.pos.z += nz * amp;
      this.target.x += ny * amp * 1.4;
      this.target.y += nx * amp * 1.1;
    }

    if (this.shakeAmount > 0.0001) {
      const s = this.shakeAmount;
      this.pos.x += (Math.random() - 0.5) * 0.06 * s;
      this.pos.y += (Math.random() - 0.5) * 0.06 * s;
      this.target.x += (Math.random() - 0.5) * 0.09 * s;
      this.target.y += (Math.random() - 0.5) * 0.09 * s;
      this.shakeAmount = damp(this.shakeAmount, 0, 4.5, dt);
    }

    cam.position.copy(this.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(this.target);
    if (shot.roll) cam.rotateZ(shot.roll);

    const focus = shot.focus ?? 'auto';
    this.focusDistance = focus === 'auto' ? this.pos.distanceTo(this.target) : focus;
    this.aperture = shot.aperture ?? 12;
    this.focalRange = shot.focalRange ?? 4;
  }

  update(dt: number) {
    this.shotTime += dt;
    if (this.blendDuration > 0) this.blendTime += dt;
    this.apply(dt);
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
