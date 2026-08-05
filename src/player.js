import * as THREE from 'three';
import { settings } from './settings.js';
import { clamp, saturate, lerp, damp, smoothstep } from './util/mathx.js';
import { resolveCapsule } from './physics.js';
import { groundHeight } from './base.js';

/**
 * First-person player: pointer-lock mouse look, WASD movement with sprint,
 * capsule-vs-world collision, head bob, footsteps and a seated console mode.
 *
 * The reduced-motion setting removes head bob, sway and most camera shake
 * without changing anything about how the game plays.
 */

const EYE_HEIGHT = 1.7;
const SEATED_EYE = 1.28;
const RADIUS = 0.34;
const STAND_HEIGHT = 1.82;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _shake = new THREE.Vector3();

export const MODE = {
  FREE: 'FREE',
  CONSOLE: 'CONSOLE'
};

export class Player {
  constructor(camera, domElement, collisionWorld) {
    this.camera = camera;
    this.dom = domElement;
    this.world = collisionWorld;

    this.position = new THREE.Vector3(0, 0, 40);
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = 0;
    this.mode = MODE.FREE;
    this.locked = false;
    this.enabled = true;

    this.walkSpeed = 3.4;
    this.sprintSpeed = 6.6;
    this.accel = 34;
    this.friction = 12;
    this.onGround = true;
    this.groundY = 0;

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepDistance = 0;
    this.lastStepAt = 0;
    this.breathPhase = Math.random() * 10;
    this.landImpulse = 0;

    this.consoleSeat = new THREE.Vector3();
    this.consoleFocus = new THREE.Vector3();
    this.transition = null;

    // Screen-space cursor used in console mode.
    this.cursor = new THREE.Vector2(0, 0);

    this.keys = new Set();
    this.moveInput = new THREE.Vector2();
    this.listeners = { footstep: [], modechange: [], lockchange: [] };

    this._bindEvents();
  }

  on(event, fn) {
    this.listeners[event]?.push(fn);
    return this;
  }

  _emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload);
  }

  setSpawn(pos, yaw) {
    this.position.copy(pos);
    this.position.y = groundHeight(pos.x, pos.z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
  }

  setConsole(seat, focus) {
    this.consoleSeat.copy(seat);
    this.consoleFocus.copy(focus);
  }

  /* -------------------------------------------------- input */

  _bindEvents() {
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (this.mode === MODE.CONSOLE) {
        // Track a virtual cursor in normalised device coordinates.
        const rect = this.dom.getBoundingClientRect();
        this.cursor.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        return;
      }
      if (!this.locked || !this.enabled) return;
      const s = 0.0022 * settings.mouseSensitivity;
      this.yaw -= e.movementX * s;
      this.pitch -= e.movementY * s * (settings.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    };
    this._onPointerLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      this._emit('lockchange', this.locked);
    };
    this._onBlur = () => this.keys.clear();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  requestLock() {
    if (this.mode !== MODE.FREE) return;
    if (document.pointerLockElement !== this.dom) {
      const p = this.dom.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  releaseLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  /* -------------------------------------------------- console mode */

  enterConsole(duration = 0.9) {
    if (this.mode === MODE.CONSOLE) return;
    this.releaseLock();
    this.mode = MODE.CONSOLE;
    _v.copy(this.consoleSeat);
    _v.y = groundHeight(_v.x, _v.z) + 0.45 + SEATED_EYE;
    const targetQuat = new THREE.Quaternion();
    const m = new THREE.Matrix4().lookAt(_v, this.consoleFocus, new THREE.Vector3(0, 1, 0));
    targetQuat.setFromRotationMatrix(m);
    this.transition = {
      t: 0,
      duration: settings.reducedMotion ? Math.min(duration, 0.35) : duration,
      fromPos: this.camera.position.clone(),
      fromQuat: this.camera.quaternion.clone(),
      toPos: _v.clone(),
      toQuat: targetQuat
    };
    this._emit('modechange', this.mode);
  }

  exitConsole(duration = 0.7) {
    if (this.mode === MODE.FREE) return;
    this.mode = MODE.FREE;
    // Step back from the desk so we do not resolve inside the console.
    this.position.set(this.consoleSeat.x, groundHeight(this.consoleSeat.x, this.consoleSeat.z + 1.2), this.consoleSeat.z + 1.2);
    this.yaw = 0;
    this.pitch = -0.05;
    _e.set(this.pitch, this.yaw, 0, 'YXZ');
    const targetQuat = new THREE.Quaternion().setFromEuler(_e);
    this.transition = {
      t: 0,
      duration: settings.reducedMotion ? Math.min(duration, 0.3) : duration,
      fromPos: this.camera.position.clone(),
      fromQuat: this.camera.quaternion.clone(),
      toPos: new THREE.Vector3(this.position.x, this.position.y + EYE_HEIGHT, this.position.z),
      toQuat: targetQuat
    };
    this._emit('modechange', this.mode);
  }

  toggleConsole() {
    if (this.mode === MODE.CONSOLE) this.exitConsole();
    else this.enterConsole();
  }

  /** How close the player is to the console (used for the "press E" prompt). */
  distanceToConsole() {
    return this.position.distanceTo(this.consoleSeat);
  }

  /* -------------------------------------------------- update */

  update(dt, ctx) {
    if (this.transition) {
      this.transition.t += dt;
      const t = saturate(this.transition.t / this.transition.duration);
      const k = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(this.transition.fromPos, this.transition.toPos, k);
      this.camera.quaternion.slerpQuaternions(this.transition.fromQuat, this.transition.toQuat, k);
      if (t >= 1) {
        this.transition = null;
        if (this.mode === MODE.FREE) this.requestLock();
      }
      return;
    }

    if (this.mode === MODE.CONSOLE) {
      this._updateConsole(dt, ctx);
      return;
    }
    this._updateFree(dt, ctx);
  }

  _updateConsole(dt, ctx) {
    // Gentle look-around within a small cone, driven by the cursor position.
    _v.copy(this.consoleSeat);
    _v.y = groundHeight(_v.x, _v.z) + 0.45 + SEATED_EYE;
    const m = new THREE.Matrix4().lookAt(_v, this.consoleFocus, new THREE.Vector3(0, 1, 0));
    _q.setFromRotationMatrix(m);
    const lookYaw = settings.reducedMotion ? 0 : -this.cursor.x * 0.14;
    const lookPitch = settings.reducedMotion ? 0 : this.cursor.y * 0.09;
    _e.set(lookPitch, lookYaw, 0, 'YXZ');
    _q.multiply(new THREE.Quaternion().setFromEuler(_e));
    this.camera.position.copy(_v);
    this.camera.quaternion.slerp(_q, 1 - Math.exp(-8 * dt));
    this._applyShake(dt, ctx, 0.35);
  }

  _updateFree(dt, ctx) {
    const keys = this.keys;
    let fwd = 0;
    let strafe = 0;
    if (this.enabled) {
      if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
    }
    const sprinting = this.enabled && (keys.has('ShiftLeft') || keys.has('ShiftRight')) && fwd > 0;
    this.moveInput.set(strafe, fwd);
    if (this.moveInput.lengthSq() > 1) this.moveInput.normalize();

    const speed = sprinting ? this.sprintSpeed : this.walkSpeed;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // Camera-relative movement on the ground plane.
    _v.set(
      this.moveInput.x * cosY - this.moveInput.y * sinY,
      0,
      -this.moveInput.x * sinY - this.moveInput.y * cosY
    );
    _v.multiplyScalar(speed);

    const a = this.accel * dt;
    this.velocity.x += clamp(_v.x - this.velocity.x, -a, a);
    this.velocity.z += clamp(_v.z - this.velocity.z, -a, a);
    if (this.moveInput.lengthSq() < 0.01) {
      const f = Math.exp(-this.friction * dt);
      this.velocity.x *= f;
      this.velocity.z *= f;
    }

    // Gravity + ground.
    this.velocity.y -= 22 * dt;
    this.position.addScaledVector(this.velocity, dt);

    const terrain = groundHeight(this.position.x, this.position.z);
    const res = resolveCapsule(this.world, this.position, RADIUS, STAND_HEIGHT);
    const support = Math.max(terrain, res.groundY === -Infinity ? terrain : res.groundY);
    if (this.position.y <= support) {
      if (!this.onGround && this.velocity.y < -4) {
        this.landImpulse = Math.min(0.5, -this.velocity.y * 0.022);
      }
      this.position.y = support;
      this.velocity.y = 0;
      this.onGround = true;
    } else if (this.position.y > support + 0.05) {
      this.onGround = false;
    }

    // Keep the player inside a generous play area.
    const limit = 420;
    const d = Math.hypot(this.position.x, this.position.z);
    if (d > limit) {
      this.position.x *= limit / d;
      this.position.z *= limit / d;
    }

    // ---- head motion ----
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = planarSpeed > 0.35 && this.onGround;
    const targetBob = settings.reducedMotion ? 0 : moving ? saturate(planarSpeed / this.sprintSpeed) : 0;
    this.bobAmount = damp(this.bobAmount, targetBob, 6, dt);
    if (moving) {
      this.bobPhase += dt * (sprinting ? 12.2 : 8.4);
      this.stepDistance += planarSpeed * dt;
      const stride = sprinting ? 2.05 : 1.55;
      if (this.stepDistance >= stride) {
        this.stepDistance -= stride;
        this._emit('footstep', { sprinting, position: this.position });
      }
    } else {
      this.bobPhase = damp(this.bobPhase % (Math.PI * 2), 0, 3, dt);
      this.stepDistance = 0;
    }
    this.breathPhase += dt;

    const bobY = Math.sin(this.bobPhase * 2) * 0.045 * this.bobAmount;
    const bobX = Math.sin(this.bobPhase) * 0.035 * this.bobAmount;
    const roll = Math.sin(this.bobPhase) * 0.012 * this.bobAmount;
    const breathe = settings.reducedMotion ? 0 : Math.sin(this.breathPhase * 1.4) * 0.008;
    this.landImpulse = damp(this.landImpulse, 0, 7, dt);

    _e.set(this.pitch + Math.sin(this.bobPhase * 2 + 1.2) * 0.004 * this.bobAmount, this.yaw, roll, 'YXZ');
    this.camera.quaternion.setFromEuler(_e);
    this.camera.position.set(
      this.position.x + bobX * cosY,
      this.position.y + EYE_HEIGHT + bobY + breathe - this.landImpulse,
      this.position.z - bobX * sinY
    );

    this._applyShake(dt, ctx, 1);
  }

  _applyShake(dt, ctx, scale) {
    const fx = ctx?.effects;
    if (!fx || fx.shake < 0.001) return;
    fx.sampleShake(ctx.elapsed ?? performance.now() / 1000, _shake);
    _shake.multiplyScalar(scale);
    this.camera.position.add(_shake);
    _e.set(_shake.y * 0.09, _shake.x * 0.09, _shake.z * 0.05, 'YXZ');
    _q.setFromEuler(_e);
    this.camera.quaternion.multiply(_q);
  }

  /** World-space direction the player is looking. */
  getLookDirection(out = new THREE.Vector3()) {
    return out.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
  }
}
