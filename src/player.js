/**
 * player.js — first person controller: pointer lock, WASD, mouse look,
 * head bob, capsule(-ish)-vs-AABB collision.
 */
import * as THREE from 'three';

const EYE = 1.7;
const RADIUS = 0.34;
export const WALK = 2.5;
const RUN = 3.9;
const ACCEL = 34;
const DAMP = 11;

/**
 * Largest step `update()` may be given in one go. At the run speed of 3.9 m/s
 * that is 7.8 cm of travel per collision solve, comfortably inside the 0.34 m
 * body radius, so nothing can tunnel through a bulkhead however slow the frame
 * rate gets.
 */
const MAX_STEP = 0.02;
/** Ceiling on substeps per frame, so a pathological delta can't stall the tab. */
const MAX_SUBSTEPS = 32;

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
    /**
     * Drag-to-look fallback, used when the browser refuses pointer lock.
     *
     * Without it a denied lock leaves the demo completely unplayable and says
     * nothing about why: the splash only clears on a *successful* lock, so you
     * sit clicking at the title screen forever. Chrome alone will refuse for
     * about a second after you leave lock with Esc, and iframes without
     * `allow="pointer-lock"`, some extensions and some browser policies refuse
     * outright. Movement should never depend on a capability that can vanish.
     */
    this.fallback = false;
    this.dragging = false;
    this.sensitivity = 0.0022;
    this.lookSpeed = 1.9;        // rad/s for arrow-key look

    this.keys = new Set();
    this._onKeyDown = (e) => {
      this.keys.add(e.code);
      // arrow keys scroll the page, which fights the fallback look controls
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.enabled) return;
      // locked: raw deltas. fallback: only while a button is held, so moving the
      // cursor over the page doesn't swing the camera around.
      if (!this.locked && !(this.fallback && this.dragging)) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.48, 1.48);
    };
    this._onMouseDown = () => { this.dragging = true; };
    this._onMouseUp = () => { this.dragging = false; };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      if (this.locked) this.fallback = false;
      this.onLockChange?.(this.locked);
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  /** True when the controller should be reading input. */
  get active() {
    return this.enabled && (this.locked || this.fallback);
  }

  /**
   * Ask for pointer lock. Resolves to whether it engaged, so the caller can fall
   * back rather than leave the player staring at a title screen.
   */
  async requestLock() {
    try {
      const p = this.dom.requestPointerLock?.();
      if (p && typeof p.then === 'function') await p;
    } catch {
      return false;
    }
    return this.locked || document.pointerLockElement === this.dom;
  }

  /** Switch to drag-to-look so the demo stays playable without pointer lock. */
  enableFallback() {
    if (this.locked) return false;
    this.fallback = true;
    return true;
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

  /**
   * Advance by `dt` seconds of real time, substepping so that the integrator and
   * the collision solver never see a step larger than `MAX_STEP`.
   *
   * This exists because the frame loop used to hand `update()` a delta clamped to
   * 0.05 s. That clamp is the usual defence against a huge post-tab-switch step
   * teleporting the player through a wall, but as a *replacement* for the real
   * delta it silently turns the game into slow motion below 20 fps: at 10 fps the
   * world runs at half speed, at 5 fps a quarter, and holding W moves you a few
   * centimetres per second. Substepping gets the tunnelling safety without
   * lying about how much time passed.
   *
   * @param {number} dt seconds since the previous frame (already hitch-clamped).
   * @returns {number} substeps taken.
   */
  advance(dt) {
    const steps = Math.max(1, Math.min(MAX_SUBSTEPS, Math.ceil(dt / MAX_STEP)));
    const sub = dt / steps;
    for (let i = 0; i < steps; i++) this.update(sub);
    return steps;
  }

  update(dt) {
    if (this.active) {
      // arrow-key look: works in either mode, and is the only way to look around
      // if the pointer never locks and you have no mouse to drag with
      const lookX = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
      const lookY = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
      if (lookX || lookY) {
        this.yaw -= lookX * this.lookSpeed * dt;
        this.pitch = THREE.MathUtils.clamp(this.pitch - lookY * this.lookSpeed * dt, -1.48, 1.48);
      }

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
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
