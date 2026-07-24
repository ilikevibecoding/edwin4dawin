/**
 * player.js — first person controller: pointer lock, WASD, mouse look,
 * head bob, capsule(-ish)-vs-AABB collision.
 */
import * as THREE from 'three';

const EYE = 1.7;
const RADIUS = 0.34;
const WALK = 2.5;
const RUN = 3.9;
const ACCEL = 34;
const DAMP = 11;

export class Player {
  constructor({ camera, domElement, colliders, onLockChange }) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.onLockChange = onLockChange;

    this.pos = new THREE.Vector3(0, 0, -3.0);
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = 0;
    this.bob = 0;
    this.bobAmp = 0;
    this.roll = 0;
    this.enabled = true;
    this.locked = false;
    this.sensitivity = 0.0022;

    this.keys = new Set();
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.48, 1.48);
    };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      this.onLockChange?.(this.locked);
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  requestLock() {
    const p = this.dom.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  teleport(x, z, yaw = this.yaw, pitch = 0) {
    this.pos.set(x, 0, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.bob = 0;
    this.bobAmp = 0;
    this.roll = 0;
    this.applyCamera(0);
  }

  update(dt) {
    if (this.enabled && this.locked) {
      const fwd = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
      const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
      const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const maxSpeed = run ? RUN : WALK;

      const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
      // forward is -Z rotated by yaw
      const wishX = -sinY * fwd + cosY * strafe;
      const wishZ = -cosY * fwd - sinY * strafe;
      const len = Math.hypot(wishX, wishZ);
      if (len > 0) {
        this.vel.x += (wishX / len) * ACCEL * dt;
        this.vel.z += (wishZ / len) * ACCEL * dt;
      }
      const damp = Math.exp(-DAMP * dt);
      this.vel.x *= damp;
      this.vel.z *= damp;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > maxSpeed) {
        this.vel.x = (this.vel.x / sp) * maxSpeed;
        this.vel.z = (this.vel.z / sp) * maxSpeed;
      }
    } else {
      this.vel.multiplyScalar(Math.exp(-18 * dt));
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.resolveCollisions();

    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.bob += speed * dt * 4.6;
    this.bobAmp = THREE.MathUtils.lerp(this.bobAmp, Math.min(1, speed / WALK), 1 - Math.exp(-8 * dt));
    this.applyCamera(dt);
  }

  applyCamera() {
    const b = this.bobAmp;
    const y = EYE + Math.sin(this.bob * 2) * 0.026 * b;
    const sway = Math.sin(this.bob) * 0.018 * b;
    this.roll = Math.sin(this.bob) * 0.0085 * b;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.camera.position.set(this.pos.x + right.x * sway, y, this.pos.z + right.z * sway);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
    this.camera.rotateZ(this.roll);
  }

  resolveCollisions() {
    const r = RADIUS;
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const b = this.colliders[i];
        const minX = b.min.x - r, maxX = b.max.x + r;
        const minZ = b.min.z - r, maxZ = b.max.z + r;
        const p = this.pos;
        if (p.x <= minX || p.x >= maxX || p.z <= minZ || p.z >= maxZ) continue;
        const dxl = p.x - minX, dxr = maxX - p.x;
        const dzl = p.z - minZ, dzr = maxZ - p.z;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) { p.x = minX; this.vel.x = Math.min(0, this.vel.x); }
        else if (m === dxr) { p.x = maxX; this.vel.x = Math.max(0, this.vel.x); }
        else if (m === dzl) { p.z = minZ; this.vel.z = Math.min(0, this.vel.z); }
        else { p.z = maxZ; this.vel.z = Math.max(0, this.vel.z); }
      }
    }
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
