// First-person player: pointer-lock mouse look, WASD + sprint, capsule collision
// against the static base, terrain following, head bob and footsteps.
import * as THREE from 'three';

const PI_2 = Math.PI / 2;

export class Player {
  constructor(camera, collision, opts = {}) {
    this.camera = camera;
    this.collision = collision;
    this.getGroundHeight = opts.getGroundHeight || (() => 0);
    this.onFootstep = opts.onFootstep || (() => {});

    this.eyeHeight = 1.7;
    this.radius = 0.38;
    this.bodyHeight = 1.78;
    this.walkSpeed = 4.0;
    this.sprintSpeed = 7.6;
    this.accel = 42;
    this.damping = 11;

    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.mouseSensitivity = 0.0022;

    this.reducedMotion = false;
    this.enabled = true;
    this.locked = false;
    this.frozen = false; // true while the console UI has focus

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepDistance = 0;
    this.stepInterval = 2.1;
    this.shake = 0;
    this.shakeTime = 0;
    this.landingShake = 0;

    this.keys = new Set();
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._prevPos = new THREE.Vector3();
    this.grounded = true;
    this.verticalVel = 0;
    this.headOffset = new THREE.Vector3();
  }

  attach(dom) {
    this.dom = dom;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.locked || this.frozen || !this.enabled) return;
      const mx = e.movementX || 0;
      const my = e.movementY || 0;
      this.yaw -= mx * this.mouseSensitivity;
      this.pitch -= my * this.mouseSensitivity;
      this.pitch = Math.max(-PI_2 + 0.02, Math.min(PI_2 - 0.02, this.pitch));
    };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
    return this;
  }

  requestLock() {
    if (!this.dom) return;
    const p = this.dom.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  teleport(x, y, z, yaw = this.yaw, pitch = this.pitch) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = pitch;
    this.verticalVel = 0;
    this.applyToCamera(0);
  }

  addShake(amount) {
    if (this.reducedMotion) amount *= 0.18;
    this.shake = Math.min(1.4, this.shake + amount);
  }

  get moveInput() {
    const k = this.keys;
    let f = 0;
    let s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    return { f, s };
  }

  update(dt) {
    if (!this.enabled) return;
    this._prevPos.copy(this.pos);
    const moving = !this.frozen && this.locked;
    const { f, s } = moving ? this.moveInput : { f: 0, s: 0 };
    const sprinting = moving && this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const targetSpeed = sprinting ? this.sprintSpeed : this.walkSpeed;

    this._euler.set(0, this.yaw, 0);
    this._forward.set(0, 0, -1).applyEuler(this._euler);
    this._right.set(1, 0, 0).applyEuler(this._euler);
    this._wish.set(0, 0, 0).addScaledVector(this._forward, f).addScaledVector(this._right, s);
    if (this._wish.lengthSq() > 0) this._wish.normalize();

    // horizontal acceleration + exponential damping
    const a = this.accel * (sprinting ? 1.25 : 1);
    this.vel.x += this._wish.x * a * dt;
    this.vel.z += this._wish.z * a * dt;
    const damp = Math.exp(-this.damping * dt);
    this.vel.x *= damp;
    this.vel.z *= damp;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > targetSpeed) {
      this.vel.x *= targetSpeed / hs;
      this.vel.z *= targetSpeed / hs;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // gravity + ground / platform support
    const terrain = this.getGroundHeight(this.pos.x, this.pos.z);
    const support = this.collision.supportHeight({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 0.72);
    const floor = Math.max(terrain, support ?? -Infinity);

    this.verticalVel -= 22 * dt;
    this.pos.y += this.verticalVel * dt;
    if (this.pos.y <= floor) {
      if (this.verticalVel < -3.5) this.landingShake = Math.min(0.5, -this.verticalVel * 0.03);
      this.pos.y = floor;
      this.verticalVel = 0;
      this.grounded = true;
    } else {
      this.grounded = this.pos.y - floor < 0.06;
    }

    // capsule vs. world, then re-clamp to the floor (a push can move us onto a pad)
    this.collision.resolveCapsule(this.pos, this.radius, this.bodyHeight);
    const terrain2 = this.getGroundHeight(this.pos.x, this.pos.z);
    const support2 = this.collision.supportHeight({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 0.72);
    const floor2 = Math.max(terrain2, support2 ?? -Infinity);
    if (this.pos.y < floor2) this.pos.y = floor2;

    // head bob + footsteps driven by distance actually travelled
    const travelled = Math.hypot(this.pos.x - this._prevPos.x, this.pos.z - this._prevPos.z);
    this.speed = travelled / Math.max(dt, 1e-4);
    if (this.grounded) {
      this.stepDistance += travelled;
      const interval = sprinting ? this.stepInterval * 0.78 : this.stepInterval;
      if (this.stepDistance >= interval) {
        this.stepDistance -= interval;
        this.onFootstep(sprinting ? 1 : 0.7);
        if (!this.reducedMotion) this.addShake(0.012);
      }
    }
    const bobTarget = this.grounded ? Math.min(1, this.speed / this.walkSpeed) : 0;
    this.bobAmount += (bobTarget - this.bobAmount) * Math.min(1, dt * 8);
    this.bobPhase += (this.speed / Math.max(0.001, this.walkSpeed)) * dt * 9.2;

    this.shake *= Math.exp(-3.6 * dt);
    this.landingShake *= Math.exp(-7 * dt);
    this.shakeTime += dt;

    this.applyToCamera(dt);
  }

  applyToCamera(dt) {
    const cam = this.camera;
    const bobScale = this.reducedMotion ? 0 : 1;
    const bob = this.bobAmount * bobScale;
    const vBob = Math.sin(this.bobPhase * 2) * 0.045 * bob;
    const hBob = Math.cos(this.bobPhase) * 0.035 * bob;
    const rollBob = Math.cos(this.bobPhase) * 0.008 * bob;

    // procedural shake: two decorrelated sine stacks, no random per-frame jitter
    const t = this.shakeTime;
    const sh = (this.shake + this.landingShake) * (this.reducedMotion ? 0.15 : 1);
    const sx = (Math.sin(t * 47.3) * 0.6 + Math.sin(t * 23.1) * 0.4) * sh * 0.09;
    const sy = (Math.sin(t * 39.7 + 1.7) * 0.6 + Math.sin(t * 17.3 + 0.4) * 0.4) * sh * 0.09;
    const sr = Math.sin(t * 31.9 + 2.1) * sh * 0.02;

    this.headOffset.set(hBob + sx * 0.5, this.eyeHeight + vBob + sy * 0.5, 0);
    cam.position.set(
      this.pos.x + hBob * Math.cos(this.yaw) + sx * 0.4,
      this.pos.y + this.eyeHeight + vBob + sy * 0.35,
      this.pos.z - hBob * Math.sin(this.yaw) + sx * 0.2,
    );
    this._euler.set(this.pitch + sy, this.yaw + sx, rollBob + sr, 'YXZ');
    cam.quaternion.setFromEuler(this._euler);
  }

  lookAt(target) {
    const dx = target.x - this.camera.position.x;
    const dy = target.y - this.camera.position.y;
    const dz = target.z - this.camera.position.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }
}
