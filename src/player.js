// player.js — first-person controller: pointer lock, WASD + sprint, head bob, footsteps,
// capsule-vs-world collision, camera shake with reduced-motion support.
import * as THREE from 'three';
import { clamp, damp, lerp } from './utils.js';
import { resolveCapsule } from './physics.js';

const EYE = 1.7;

export class Player {
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.pos = new THREE.Vector3(6, 0, 22);   // feet
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI * 0.9;
    this.pitch = 0;
    this.keys = new Set();
    this.sprinting = false;
    this.enabled = true;         // movement enabled (disabled in console mode)
    this.pointerLocked = false;
    this.reducedMotion = false;
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.trauma = 0;
    this.shakeTime = 0;
    this.onFootstep = null;
    this._lastStepSign = 1;
    this.speedWalk = 4.2;
    this.speedSprint = 8.0;

    this._onMouseMove = (e) => {
      if (!this.pointerLocked || !this.enabled) return;
      this.yaw -= e.movementX * 0.0021;
      this.pitch -= e.movementY * 0.0021;
      this.pitch = clamp(this.pitch, -1.45, 1.5);
    };
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.dom;
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  requestLock() {
    if (this.dom.requestPointerLock) this.dom.requestPointerLock();
  }
  exitLock() {
    if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  }

  addTrauma(x) {
    this.trauma = clamp(this.trauma + x, 0, 1.2);
  }

  teleport(x, z, yaw = this.yaw, pitch = this.pitch) {
    this.pos.set(x, 0, z);
    this.yaw = yaw; this.pitch = pitch;
    this.vel.set(0, 0, 0);
  }

  get eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z); }

  forwardDir(out) {
    out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return out;
  }

  update(dt, time) {
    // movement input
    let mx = 0, mz = 0;
    if (this.enabled) {
      if (this.keys.has('KeyW')) mz -= 1;
      if (this.keys.has('KeyS')) mz += 1;
      if (this.keys.has('KeyA')) mx -= 1;
      if (this.keys.has('KeyD')) mx += 1;
    }
    this.sprinting = this.enabled && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && mz < 0;
    const targetSpeed = this.sprinting ? this.speedSprint : this.speedWalk;

    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wishX = (mx * cos - mz * sin);
    const wishZ = (-mx * sin - mz * cos);
    const len = Math.hypot(wishX, wishZ) || 1;

    // smooth exponential approach to wish velocity
    const k = 1 - Math.exp(-11 * dt);
    const goalX = (mx || mz) ? (wishX / len) * targetSpeed : 0;
    const goalZ = (mx || mz) ? (wishZ / len) * targetSpeed : 0;
    this.vel.x += (goalX - this.vel.x) * k;
    this.vel.z += (goalZ - this.vel.z) * k;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    resolveCapsule(this.pos, 0.38, this.colliders);

    // head bob + footsteps
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const moving = speed > 0.4;
    this.bobAmp = damp(this.bobAmp, moving && !this.reducedMotion ? clamp(speed / this.speedSprint, 0, 1) : 0, 6, dt);
    if (moving) {
      this.bobPhase += dt * (this.sprinting ? 9.4 : 6.6);
      const s = Math.sin(this.bobPhase);
      if (Math.sign(s) !== this._lastStepSign) {
        this._lastStepSign = Math.sign(s);
        if (this.onFootstep && speed > 1.2) this.onFootstep(this.sprinting);
      }
    }
    const bobY = Math.sin(this.bobPhase * 2) * 0.028 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase) * 0.02 * this.bobAmp;
    // subtle idle sway
    const idleY = this.reducedMotion ? 0 : Math.sin(time * 1.1) * 0.004;

    // camera shake (trauma decays)
    this.trauma = Math.max(0, this.trauma - dt * 0.85);
    const shakeScale = this.reducedMotion ? 0.12 : 1;
    const t2 = this.trauma * this.trauma * shakeScale;
    this.shakeTime += dt * 34;
    const shYaw = (Math.sin(this.shakeTime * 1.3) + Math.sin(this.shakeTime * 2.7) * 0.5) * 0.012 * t2;
    const shPitch = (Math.sin(this.shakeTime * 1.7 + 1.3) + Math.sin(this.shakeTime * 3.1) * 0.5) * 0.012 * t2;
    const shRoll = Math.sin(this.shakeTime * 2.2 + 0.6) * 0.008 * t2;

    // compose camera
    this.camera.position.set(
      this.pos.x + bobX * cos,
      this.pos.y + EYE + bobY + idleY + Math.sin(this.shakeTime * 4.3) * 0.02 * t2,
      this.pos.z - bobX * sin
    );
    this.camera.rotation.set(this.pitch + shPitch, this.yaw + shYaw, shRoll, 'YXZ');
  }
}
