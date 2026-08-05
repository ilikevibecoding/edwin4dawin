// First-person controller: pointer lock, WASD + sprint, eye height 1.7 m,
// capsule-vs-world collision, head bob + footsteps, camera shake with a
// reduced-motion setting, and a smooth transition into console mode.
import * as THREE from 'three';
import { PLAYER, WORLD } from './constants.js';
import { resolveCollisions } from './physics.js';

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();

export class Player {
  constructor({ camera, dom, events, base }) {
    this.camera = camera;
    this.dom = dom;
    this.events = events;
    this.base = base;

    this.pos = new THREE.Vector3(-26, 0, 2);   // near shelter door
    this.vel = new THREE.Vector3();
    this.yaw = 1.9;                             // face the batteries
    this.pitch = -0.02;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true;                        // false in console mode
    this.reducedMotion = false;

    this.bobPhase = 0;
    this.bobAmount = 0;
    this._lastStepSign = 1;

    this.shakeAmp = 0;
    this.shakeDur = 0;
    this.shakeAge = 0;
    this._shakeSeed = 0;

    // console-mode camera tween
    this.consoleMode = false;
    this._tween = null; // {fromPos, fromQuat, toPos, toQuat, t, dur, done}

    dom.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.yaw -= e.movementX * PLAYER.lookSensitivity;
      this.pitch -= e.movementY * PLAYER.lookSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.5, 1.5);
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      this.events.emit('lock-changed', { locked: this.locked });
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    events.on('shake', ({ amp, dur, distFrom }) => {
      let a = amp;
      if (distFrom) {
        const d = this.pos.distanceTo(distFrom);
        a *= THREE.MathUtils.clamp(1 - d / 420, 0.05, 1);
      }
      this.addShake(a, dur);
    });
  }

  requestLock() {
    if (!this.locked) this.dom.requestPointerLock?.();
  }
  releaseLock() {
    if (this.locked) document.exitPointerLock?.();
  }

  addShake(amp, dur = 0.5) {
    if (this.reducedMotion) return;
    if (amp > this.shakeAmp) {
      this.shakeAmp = Math.min(amp, 1.2);
      this.shakeDur = dur;
      this.shakeAge = 0;
      this._shakeSeed = Math.random() * 100;
    }
  }

  /** enter/exit the command console view */
  setConsoleMode(on) {
    if (on === this.consoleMode) return;
    this.consoleMode = on;
    const cv = this.base.console;
    if (on) {
      this.enabled = false;
      const toQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(cv.viewPos, cv.viewLook, new THREE.Vector3(0, 1, 0));
      toQuat.setFromRotationMatrix(m);
      this._tween = {
        fromPos: this.camera.position.clone(),
        fromQuat: this.camera.quaternion.clone(),
        toPos: cv.viewPos.clone(),
        toQuat,
        t: 0, dur: this.reducedMotion ? 0.01 : 0.55,
      };
    } else {
      const toQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      this._tween = {
        fromPos: this.camera.position.clone(),
        fromQuat: this.camera.quaternion.clone(),
        toPos: this.pos.clone().add(new THREE.Vector3(0, PLAYER.eyeHeight, 0)),
        toQuat,
        t: 0, dur: this.reducedMotion ? 0.01 : 0.45,
        onDone: () => { this.enabled = true; },
      };
    }
  }

  update(dt) {
    // tween handling (console transitions)
    if (this._tween) {
      const tw = this._tween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
      this.camera.quaternion.slerpQuaternions(tw.fromQuat, tw.toQuat, e);
      if (k >= 1) {
        tw.onDone?.();
        this._tween = null;
      }
      return;
    }
    if (this.consoleMode) return; // parked at console

    if (!this.enabled) return;

    // movement
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(-_fwd.z, 0, _fwd.x);
    _wish.set(0, 0, 0);
    if (this.locked) {
      if (this.keys.has('KeyW')) _wish.add(_fwd);
      if (this.keys.has('KeyS')) _wish.sub(_fwd);
      if (this.keys.has('KeyD')) _wish.add(_right);
      if (this.keys.has('KeyA')) _wish.sub(_right);
    }
    if (_wish.lengthSq() > 0) {
      _wish.normalize().multiplyScalar(speed);
      this.vel.x += (_wish.x - this.vel.x) * Math.min(1, PLAYER.accel * dt / speed);
      this.vel.z += (_wish.z - this.vel.z) * Math.min(1, PLAYER.accel * dt / speed);
    } else {
      const f = Math.max(0, 1 - PLAYER.friction * dt);
      this.vel.x *= f; this.vel.z *= f;
    }
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // collisions + bounds
    resolveCollisions(this.pos, PLAYER.radius, this.base.colliders);
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD.playerBoundsRadius) {
      const s = WORLD.playerBoundsRadius / r;
      this.pos.x *= s; this.pos.z *= s;
    }
    this.pos.y = this.base.groundHeight(this.pos.x, this.pos.z);

    // head bob + footsteps
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    const moving = hSpeed > 0.4;
    if (moving && !this.reducedMotion) {
      const rate = PLAYER.bobFreq * (hSpeed / PLAYER.walkSpeed);
      this.bobPhase += rate * Math.PI * 2 * dt * 0.5;
      this.bobAmount = Math.min(1, this.bobAmount + dt * 6);
    } else {
      this.bobAmount = Math.max(0, this.bobAmount - dt * 5);
    }
    const bobY = Math.sin(this.bobPhase * 2) * PLAYER.bobAmp * this.bobAmount;
    const bobX = Math.cos(this.bobPhase) * PLAYER.bobAmp * 0.6 * this.bobAmount;
    // footstep trigger at bob valley
    const sign = Math.sin(this.bobPhase * 2) > 0 ? 1 : -1;
    if (moving && sign !== this._lastStepSign && sign < 0) {
      this.events.emit('footstep', { sprint: hSpeed > PLAYER.walkSpeed + 0.5 });
    }
    if (moving) this._lastStepSign = sign;

    // camera pose
    this.camera.position.set(
      this.pos.x + bobX * Math.cos(this.yaw),
      this.pos.y + PLAYER.eyeHeight + bobY,
      this.pos.z - bobX * Math.sin(this.yaw),
    );
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    // shake
    if (this.shakeAmp > 0.001) {
      this.shakeAge += dt;
      const k = Math.max(0, 1 - this.shakeAge / this.shakeDur);
      const a = this.shakeAmp * k * k;
      const t = this.shakeAge * 34 + this._shakeSeed;
      this.camera.position.x += Math.sin(t * 1.3) * a * 0.16;
      this.camera.position.y += Math.sin(t * 1.7 + 2) * a * 0.13;
      this.camera.rotation.z += Math.sin(t * 1.1 + 4) * a * 0.012;
      if (k <= 0) this.shakeAmp = 0;
    }
  }
}
