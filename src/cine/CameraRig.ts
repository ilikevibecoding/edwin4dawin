import * as THREE from 'three';
import type { Shot } from './Framing';
import { clamp01, damp, easeInOut } from '../core/Time';
import type { PostFX } from '../render/PostFX';

/**
 * Camera operator.
 *
 * Cuts, moves and holds shots, and adds the small imperfections that make a
 * virtual camera read as a real one: a hand-held float, a slow push on dialogue,
 * and focus that takes a moment to catch up when the shot changes.
 */

interface Move {
  /** Offset applied to the shot position over the life of the shot. */
  positionDrift: THREE.Vector3;
  targetDrift: THREE.Vector3;
  fovDrift: number;
  duration: number;
  elapsed: number;
}

export type MoveKind = 'none' | 'pushIn' | 'pullOut' | 'driftLeft' | 'driftRight' | 'craneUp' | 'craneDown' | 'orbit';

export class CameraRig {
  private base = new THREE.Vector3();
  private baseTarget = new THREE.Vector3();
  private current = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();
  private fov = 40;
  private fovTarget = 40;
  private roll = 0;
  private rollTarget = 0;

  private move: Move | null = null;
  private shake = 0;
  private shakeDecay = 2.4;
  private handheld = 0.5;
  private noiseSeed = Math.random() * 1000;
  private blend = 1;
  private blendDuration = 0;
  private blendFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 40 };
  private focusPoint = new THREE.Vector3();
  private bokeh = 3;

  constructor(readonly camera: THREE.PerspectiveCamera) {
    this.current.copy(camera.position);
    this.currentTarget.set(0, 1.6, 0);
    this.fov = camera.fov;
    this.fovTarget = camera.fov;
  }

  /**
   * Cuts or eases to a new shot. `blend` of 0 is a hard cut, which is what most
   * dialogue coverage wants; a non-zero blend is a camera move between setups.
   */
  cut(shot: Shot, opts: { blend?: number; move?: MoveKind; moveAmount?: number; moveDuration?: number; handheld?: number } = {}): void {
    const blend = opts.blend ?? 0;
    this.blendFrom.pos.copy(this.current);
    this.blendFrom.target.copy(this.currentTarget);
    this.blendFrom.fov = this.fov;
    this.blendDuration = blend;
    this.blend = blend <= 0 ? 1 : 0;

    this.base.copy(shot.position);
    this.baseTarget.copy(shot.target);
    this.fovTarget = shot.fov;
    this.rollTarget = shot.roll ?? 0;
    this.focusPoint.copy(shot.focus);
    this.bokeh = shot.bokeh;
    if (opts.handheld !== undefined) this.handheld = opts.handheld;

    if (blend <= 0) {
      this.current.copy(shot.position);
      this.currentTarget.copy(shot.target);
      this.fov = shot.fov;
      this.roll = this.rollTarget;
    }

    this.move = null;
    const kind = opts.move ?? 'none';
    if (kind !== 'none') {
      const amount = opts.moveAmount ?? 1;
      const dir = new THREE.Vector3().subVectors(shot.target, shot.position);
      const dist = dir.length() || 1;
      dir.normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const positionDrift = new THREE.Vector3();
      const targetDrift = new THREE.Vector3();
      let fovDrift = 0;
      switch (kind) {
        case 'pushIn':
          positionDrift.copy(dir).multiplyScalar(Math.min(dist * 0.35, 0.42 * amount));
          fovDrift = -1.2 * amount;
          break;
        case 'pullOut':
          positionDrift.copy(dir).multiplyScalar(-0.4 * amount);
          fovDrift = 1.4 * amount;
          break;
        case 'driftLeft':
          positionDrift.copy(side).multiplyScalar(-0.32 * amount);
          break;
        case 'driftRight':
          positionDrift.copy(side).multiplyScalar(0.32 * amount);
          break;
        case 'craneUp':
          positionDrift.set(0, 0.3 * amount, 0);
          break;
        case 'craneDown':
          positionDrift.set(0, -0.28 * amount, 0);
          break;
        case 'orbit':
          positionDrift.copy(side).multiplyScalar(0.5 * amount);
          targetDrift.set(0, 0, 0);
          break;
      }
      this.move = {
        positionDrift,
        targetDrift,
        fovDrift,
        duration: opts.moveDuration ?? 6,
        elapsed: 0,
      };
    }
  }

  /** Keeps an existing shot but re-reads a moving subject's position. */
  retarget(shot: Shot): void {
    this.base.copy(shot.position);
    this.baseTarget.copy(shot.target);
    this.focusPoint.copy(shot.focus);
  }

  impulse(strength = 1, decay = 2.4): void {
    this.shake = Math.max(this.shake, strength);
    this.shakeDecay = decay;
  }

  setHandheld(amount: number): void {
    this.handheld = amount;
  }

  private noise(t: number, seed: number): number {
    return (
      Math.sin(t * 1.7 + seed) * 0.5 +
      Math.sin(t * 2.9 + seed * 1.7) * 0.3 +
      Math.sin(t * 5.3 + seed * 2.3) * 0.2
    );
  }

  update(dt: number, time: number, postFX: PostFX | null): void {
    if (this.move) {
      this.move.elapsed = Math.min(this.move.duration, this.move.elapsed + dt);
    }
    if (this.blendDuration > 0 && this.blend < 1) {
      this.blend = clamp01(this.blend + dt / this.blendDuration);
    }

    const moveT = this.move ? easeInOut(this.move.elapsed / Math.max(0.001, this.move.duration)) : 0;
    const targetPos = this.base.clone();
    const targetLook = this.baseTarget.clone();
    let fov = this.fovTarget;
    if (this.move) {
      targetPos.addScaledVector(this.move.positionDrift, moveT);
      targetLook.addScaledVector(this.move.targetDrift, moveT);
      fov += this.move.fovDrift * moveT;
    }

    if (this.blend < 1) {
      const k = easeInOut(this.blend);
      targetPos.lerpVectors(this.blendFrom.pos, targetPos, k);
      targetLook.lerpVectors(this.blendFrom.target, targetLook, k);
      fov = this.blendFrom.fov + (fov - this.blendFrom.fov) * k;
    }

    // Ease toward the computed setup so subject movement never snaps.
    this.current.x = damp(this.current.x, targetPos.x, 9, dt);
    this.current.y = damp(this.current.y, targetPos.y, 9, dt);
    this.current.z = damp(this.current.z, targetPos.z, 9, dt);
    this.currentTarget.x = damp(this.currentTarget.x, targetLook.x, 7, dt);
    this.currentTarget.y = damp(this.currentTarget.y, targetLook.y, 7, dt);
    this.currentTarget.z = damp(this.currentTarget.z, targetLook.z, 7, dt);
    this.fov = damp(this.fov, fov, 6, dt);
    this.roll = damp(this.roll, this.rollTarget, 5, dt);

    // Hand-held float plus decaying impact shake.
    const t = time + this.noiseSeed;
    const hh = this.handheld * 0.012;
    const sh = this.shake * 0.09;
    const jitter = new THREE.Vector3(
      this.noise(t * 0.9, 1) * hh + this.noise(t * 9, 11) * sh,
      this.noise(t * 1.1, 2) * hh + this.noise(t * 11, 12) * sh,
      this.noise(t * 0.8, 3) * hh + this.noise(t * 8, 13) * sh
    );
    if (this.shake > 0.0001) this.shake = Math.max(0, this.shake - this.shake * this.shakeDecay * dt - dt * 0.02);

    this.camera.position.copy(this.current).add(jitter);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    const look = this.currentTarget.clone().addScaledVector(jitter, 0.25);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(look);
    if (Math.abs(this.roll) > 0.0001 || this.handheld > 0) {
      this.camera.rotateZ(this.roll + this.noise(t * 0.7, 4) * this.handheld * 0.004);
    }

    if (postFX) {
      postFX.focusOn(this.focusPoint, this.camera);
      postFX.bokeh = this.bokeh;
    }
  }

  /** Immediately places the camera, skipping easing (used on hard cuts). */
  snap(): void {
    this.camera.position.copy(this.current);
    this.camera.lookAt(this.currentTarget);
  }

  get focus(): THREE.Vector3 {
    return this.focusPoint;
  }
}
