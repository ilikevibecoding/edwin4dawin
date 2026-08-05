// First-person controller: pointer-lock mouse look, WASD + sprint, capsule
// collision against the base geometry, head bob, footsteps and camera shake.

import * as THREE from 'three';
import { PLAYER } from './config.js';
import { state, bus } from './state.js';

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const WISH = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Player {
  constructor(camera, collision, domElement) {
    this.camera = camera;
    this.collision = collision;
    this.dom = domElement;

    this.pos = new THREE.Vector3(...PLAYER.spawn);
    this.vel = new THREE.Vector3();
    this.yaw = PLAYER.spawnYaw;
    this.pitch = -0.04;
    this.onGround = true;
    this.height = PLAYER.eyeHeight;
    this.crouching = false;

    this.bobPhase = 0;
    this.bobOffset = new THREE.Vector3();
    this.stepDistance = 0;
    this.shake = 0;
    this.shakeSeed = Math.random() * 100;
    this.recoilKick = new THREE.Vector2();

    this.keys = new Set();
    this.locked = false;
    this.mouseDelta = new THREE.Vector2();
    this.enabled = true;
    /** When docked at the console the camera is driven by an external rig. */
    this.docked = false;
    this.dockBlend = 0;
    this.dockTarget = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
    this.freeYaw = this.yaw;
    this.freePitch = this.pitch;

    this._bind();
  }

  _bind() {
    const onKey = (e, down) => {
      const k = e.code;
      if (down) this.keys.add(k);
      else this.keys.delete(k);
      if (down && (k === 'Space' || k.startsWith('Arrow'))) e.preventDefault();
    };
    this._onKeyDown = (e) => onKey(e, true);
    this._onKeyUp = (e) => onKey(e, false);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._onMove = (e) => {
      if (!this.locked || !this.enabled) return;
      this.mouseDelta.x += e.movementX || 0;
      this.mouseDelta.y += e.movementY || 0;
    };
    document.addEventListener('mousemove', this._onMove);

    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      bus.emit('pointerlock', this.locked);
    };
    document.addEventListener('pointerlockchange', this._onLockChange);

    this._onBlur = () => this.keys.clear();
    window.addEventListener('blur', this._onBlur);
  }

  requestLock() {
    if (this.dom.requestPointerLock) {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    }
  }

  releaseLock() {
    if (document.exitPointerLock) document.exitPointerLock();
  }

  setDocked(on, target) {
    if (on && target) {
      this.freeYaw = this.yaw;
      this.freePitch = this.pitch;
      this.dockTarget.pos.copy(target.pos);
      this.dockTarget.yaw = target.yaw;
      this.dockTarget.pitch = target.pitch;
    }
    this.docked = on;
  }

  addShake(amount) {
    const scale = state.reducedMotion ? 0.18 : 1;
    this.shake = Math.min(1.5, this.shake + amount * scale);
  }

  get eye() {
    return this.camera.position;
  }

  lookDir(out = new THREE.Vector3()) {
    return this.camera.getWorldDirection(out);
  }

  update(dt) {
    const lookScale = state.reducedMotion ? 0.85 : 1;
    if (this.enabled && (this.locked || this.docked)) {
      this.yaw -= this.mouseDelta.x * PLAYER.lookSpeed * lookScale;
      this.pitch -= this.mouseDelta.y * PLAYER.lookSpeed * lookScale;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -PLAYER.maxPitch, PLAYER.maxPitch);
    }
    this.mouseDelta.set(0, 0);

    const moving = this._move(dt);

    // ---- camera assembly --------------------------------------------
    const targetBlend = this.docked ? 1 : 0;
    this.dockBlend += (targetBlend - this.dockBlend) * Math.min(1, dt * 6.5);

    this.bobPhase += dt * PLAYER.bobRate * (this.sprinting ? 1.28 : 1);
    const bobAmp = state.reducedMotion ? 0 : PLAYER.bobAmount * (this.sprinting ? 1.5 : 1);
    const walkFactor = moving && this.onGround ? 1 : 0;
    this.bobOffset.set(
      Math.cos(this.bobPhase * 0.5) * PLAYER.swayAmount * walkFactor * (state.reducedMotion ? 0 : 1),
      Math.abs(Math.sin(this.bobPhase)) * bobAmp * walkFactor,
      0
    );

    const eyeY = this.pos.y + (this.crouching ? PLAYER.crouchHeight : PLAYER.eyeHeight);
    const freePos = new THREE.Vector3(this.pos.x, eyeY, this.pos.z);
    freePos.y += this.bobOffset.y;

    const pos = freePos.lerp(this.dockTarget.pos, this.dockBlend);
    this.camera.position.copy(pos);

    let yaw = this.yaw;
    let pitch = this.pitch;
    if (this.dockBlend > 0.001) {
      // Blend rotation the short way around.
      const dy = THREE.MathUtils.euclideanModulo(this.dockTarget.yaw - yaw + Math.PI, Math.PI * 2) - Math.PI;
      yaw += dy * this.dockBlend;
      pitch += (this.dockTarget.pitch - pitch) * this.dockBlend;
    }

    const roll = this.bobOffset.x * (1 - this.dockBlend);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;
    this.camera.rotation.z = roll * 0.6;

    // ---- shake -------------------------------------------------------
    this.shake = Math.max(0, this.shake - dt * 1.5);
    if (this.shake > 0.001) {
      const s = this.shake * this.shake;
      const t = performance.now() * 0.001 + this.shakeSeed;
      const amp = state.reducedMotion ? 0.1 : 1;
      this.camera.position.x += Math.sin(t * 61.3) * 0.055 * s * amp;
      this.camera.position.y += Math.sin(t * 47.1 + 1.7) * 0.062 * s * amp;
      this.camera.position.z += Math.sin(t * 53.9 + 3.1) * 0.055 * s * amp;
      this.camera.rotation.z += Math.sin(t * 39.7) * 0.016 * s * amp;
      this.camera.rotation.x += Math.sin(t * 44.3 + 0.6) * 0.012 * s * amp;
    }

    return moving;
  }

  _move(dt) {
    const k = this.keys;
    const canMove = this.enabled && !this.docked && (this.locked || state.testMode);
    let fwd = 0;
    let side = 0;
    if (canMove) {
      if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) side += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) side -= 1;
    }
    this.sprinting = canMove && (k.has('ShiftLeft') || k.has('ShiftRight')) && fwd > 0;
    this.crouching = canMove && (k.has('KeyC') || k.has('ControlLeft'));

    FORWARD.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    RIGHT.crossVectors(FORWARD, UP).multiplyScalar(-1);
    WISH.set(0, 0, 0).addScaledVector(FORWARD, fwd).addScaledVector(RIGHT, side);
    const wishLen = WISH.length();
    if (wishLen > 1e-4) WISH.multiplyScalar(1 / wishLen);

    const maxSpeed = (this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * (this.crouching ? 0.55 : 1);
    const accel = this.onGround ? PLAYER.accel : PLAYER.airAccel;

    // horizontal velocity with friction
    const hv = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    if (wishLen > 1e-4) {
      hv.addScaledVector(WISH, accel * dt);
      const sp = hv.length();
      if (sp > maxSpeed) hv.multiplyScalar(maxSpeed / sp);
    } else if (this.onGround) {
      const drop = PLAYER.friction * dt;
      const sp = hv.length();
      hv.multiplyScalar(Math.max(0, sp - Math.max(drop * sp, drop * 0.6)) / Math.max(sp, 1e-5));
    }
    this.vel.x = hv.x;
    this.vel.z = hv.z;

    if (canMove && this.onGround && k.has('Space')) {
      this.vel.y = PLAYER.jumpSpeed;
      this.onGround = false;
    }
    this.vel.y -= PLAYER.gravity * dt;

    // integrate + resolve
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    const bodyH = this.crouching ? PLAYER.crouchHeight + 0.1 : PLAYER.eyeHeight + 0.12;
    const before = this.pos.clone();
    this.collision.resolveCapsule(this.pos, PLAYER.radius, bodyH, PLAYER.stepHeight);
    if (!before.equals(this.pos)) {
      // cancel the velocity component pushed into the wall
      const push = new THREE.Vector3().subVectors(this.pos, before).setY(0);
      if (push.lengthSq() > 1e-9) {
        push.normalize();
        const into = this.vel.dot(push);
        if (into < 0) this.vel.addScaledVector(push, -into);
      }
    }

    this.pos.y += this.vel.y * dt;
    const ground = this.collision.surfaceHeight(this.pos.x, this.pos.z, this.pos.y + PLAYER.stepHeight);
    if (this.pos.y <= ground + 1e-3) {
      this.pos.y = ground;
      if (this.vel.y < 0) this.vel.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // footsteps
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && speed > 0.6) {
      this.stepDistance += speed * dt;
      const stride = PLAYER.footstepStride * (this.sprinting ? 1.28 : 1);
      if (this.stepDistance > stride) {
        this.stepDistance = 0;
        bus.emit('footstep', { sprinting: this.sprinting, pos: this.pos });
      }
    } else {
      this.stepDistance = Math.min(this.stepDistance, PLAYER.footstepStride * 0.8);
    }

    return speed > 0.4;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
    window.removeEventListener('blur', this._onBlur);
  }
}
