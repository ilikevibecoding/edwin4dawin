/**
 * First-person player.
 *
 * Pointer-lock mouse look, WASD with sprint, head bob and footstep cues, and a
 * capsule-vs-world sweep that resolves against the site's box and cylinder
 * colliders. Low obstacles (kerbs, cable trays, pad edges) are stepped over;
 * anything taller blocks. Reduced-motion mode removes head bob and damps
 * camera shake without changing movement feel.
 */

import * as THREE from 'three';
import { PLAYER, WORLD } from './config.js';
import { clamp, clamp01, damp, lerp, smoothstep } from './util/mathx.js';
import { noise } from './util/noise.js';

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;

    this.position = new THREE.Vector3(PLAYER.spawn.x, 0, PLAYER.spawn.z);
    this.velocity = new THREE.Vector3();
    this.yaw = PLAYER.spawn.yaw;
    this.pitch = -0.06;
    this.eyeHeight = PLAYER.eyeHeight;
    this.groundY = 0;
    this.verticalVel = 0;
    this.onGround = true;

    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepDistance = 0;
    this.sprinting = false;
    this.reducedMotion = false;
    this.frozen = false;
    this.enabled = false;

    this.shake = 0;
    this.shakeSeed = Math.random() * 100;
    this.recoil = 0;

    this.keys = Object.create(null);
    this.colliders = [];
    this.terrainHeight = () => 0;
    // `enabled` is owned by the game (set once the player is on the range);
    // `locked` only gates mouse look, so keyboard control still works in
    // environments where pointer lock is unavailable.
    this.locked = false;

    this.onFootstep = null;
    this.onPointerLockChange = null;

    this._bindEvents();
  }

  // -------------------------------------------------------------- input

  _bindEvents() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Tab') e.preventDefault();
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onMouseMove = (e) => {
      if (!this.enabled || this.frozen) return;
      if (!this.locked) return;
      this.yaw -= e.movementX * PLAYER.lookSpeed;
      this.pitch -= e.movementY * PLAYER.lookSpeed;
      this.pitch = clamp(this.pitch, -PLAYER.maxPitch, PLAYER.maxPitch);
      if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
      if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
    };
    this._onLockChange = () => {
      const locked = document.pointerLockElement === this.dom;
      this.locked = locked;
      if (!locked) {
        for (const k in this.keys) this.keys[k] = false;
      }
      this.onPointerLockChange?.(locked);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onLockChange);
  }

  requestLock() {
    if (document.pointerLockElement !== this.dom) {
      const p = this.dom.requestPointerLock?.();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  releaseLock() {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  // ---------------------------------------------------------- collision

  setColliders(list) { this.colliders = list; }
  setTerrain(fn) { this.terrainHeight = fn; }

  /** Support height under the player, considering steppable surfaces. */
  _supportHeight(x, z, feetY) {
    let support = this.terrainHeight(x, z);
    const r = PLAYER.radius;
    for (const c of this.colliders) {
      const top = (c.y || 0) + c.height;
      if (top > feetY + PLAYER.stepHeight) continue;
      if (top <= support) continue;
      if (this._footprintDistance(c, x, z) < r * 0.6) support = top;
    }
    return support;
  }

  /** Signed distance from (x,z) to a collider footprint (negative = inside). */
  _footprintDistance(c, x, z) {
    if (c.type === 'cyl') {
      return Math.hypot(x - c.x, z - c.z) - c.radius;
    }
    const dx = x - c.x, dz = z - c.z;
    const rot = c.rotY || 0;
    const cs = Math.cos(-rot), sn = Math.sin(-rot);
    const lx = dx * cs - dz * sn;
    const lz = dx * sn + dz * cs;
    const qx = Math.abs(lx) - c.hw;
    const qz = Math.abs(lz) - c.hd;
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    const inside = Math.min(Math.max(qx, qz), 0);
    return outside + inside;
  }

  /** Push the player out of any collider that is too tall to step onto. */
  _resolveCollisions(pos, feetY) {
    const r = PLAYER.radius;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of this.colliders) {
        const base = c.y || 0;
        const top = base + c.height;
        // Ignore anything we are standing on top of or can step over, and
        // anything entirely above head height.
        if (top <= feetY + PLAYER.stepHeight) continue;
        if (base > feetY + this.eyeHeight + 0.25) continue;

        if (c.type === 'cyl') {
          const dx = pos.x - c.x, dz = pos.z - c.z;
          const d = Math.hypot(dx, dz);
          const min = c.radius + r;
          if (d < min && d > 1e-5) {
            const push = (min - d);
            pos.x += (dx / d) * push;
            pos.z += (dz / d) * push;
            moved = true;
          } else if (d <= 1e-5) {
            pos.x += min; moved = true;
          }
          continue;
        }

        const rot = c.rotY || 0;
        const cs = Math.cos(-rot), sn = Math.sin(-rot);
        const dx = pos.x - c.x, dz = pos.z - c.z;
        let lx = dx * cs - dz * sn;
        let lz = dx * sn + dz * cs;
        const ex = c.hw + r, ez = c.hd + r;
        if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
          // Push along the axis of least penetration.
          const px = ex - Math.abs(lx);
          const pz = ez - Math.abs(lz);
          if (px < pz) lx += Math.sign(lx || 1) * px;
          else lz += Math.sign(lz || 1) * pz;
          const cs2 = Math.cos(rot), sn2 = Math.sin(rot);
          pos.x = c.x + (lx * cs2 - lz * sn2);
          pos.z = c.z + (lx * sn2 + lz * cs2);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  // ------------------------------------------------------------- update

  update(dt, shakeImpulse = 0) {
    const k = this.keys;
    const wantSprint = !!(k.ShiftLeft || k.ShiftRight);
    let ix = 0, iz = 0;
    if (this.enabled && !this.frozen) {
      if (k.KeyW || k.ArrowUp) iz += 1;
      if (k.KeyS || k.ArrowDown) iz -= 1;
      if (k.KeyA || k.ArrowLeft) ix -= 1;
      if (k.KeyD || k.ArrowRight) ix += 1;
    }
    const inputLen = Math.hypot(ix, iz);
    if (inputLen > 0) { ix /= inputLen; iz /= inputLen; }
    this.sprinting = wantSprint && inputLen > 0;

    // Horizontal movement in the yaw frame
    _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const targetSpeed = (this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * inputLen;
    _v.copy(_fwd).multiplyScalar(iz).addScaledVector(_right, ix);
    if (_v.lengthSq() > 0) _v.normalize().multiplyScalar(targetSpeed);

    const accel = inputLen > 0 ? PLAYER.accel : PLAYER.friction;
    this.velocity.x = damp(this.velocity.x, _v.x, accel, dt);
    this.velocity.z = damp(this.velocity.z, _v.z, accel, dt);
    if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;

    // Sweep in small substeps so fast sprinting cannot skip a wall.
    const step = this.velocity.length() * dt;
    const subs = step > PLAYER.radius * 0.5 ? Math.ceil(step / (PLAYER.radius * 0.5)) : 1;
    const sdt = dt / subs;
    for (let s = 0; s < subs; s++) {
      this.position.x += this.velocity.x * sdt;
      this.position.z += this.velocity.z * sdt;
      this._resolveCollisions(this.position, this.groundY);
    }

    // Vertical: settle onto whatever we are standing on.
    const support = this._supportHeight(this.position.x, this.position.z, this.groundY);
    if (support > this.groundY) {
      // Step up smoothly rather than snapping.
      this.groundY = lerp(this.groundY, support, 1 - Math.exp(-18 * dt));
      if (Math.abs(support - this.groundY) < 0.01) this.groundY = support;
    } else if (support < this.groundY) {
      this.verticalVel -= WORLD.gravity * dt;
      this.groundY += this.verticalVel * dt;
      if (this.groundY <= support) { this.groundY = support; this.verticalVel = 0; }
    } else {
      this.verticalVel = 0;
    }

    // Head bob and footsteps
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const moving = speed > 0.6;
    this.bobAmount = damp(this.bobAmount, moving ? 1 : 0, 8, dt);
    if (moving) {
      const freq = PLAYER.bobFreq * (this.sprinting ? 1.55 : 1);
      this.bobPhase += dt * freq * Math.PI * 2;
      this.stepDistance += speed * dt;
      const stride = this.sprinting ? 2.3 : 1.55;
      if (this.stepDistance > stride) {
        this.stepDistance -= stride;
        this.onFootstep?.({
          position: this.position.clone(),
          sprinting: this.sprinting,
          onConcrete: this.groundY > 0.05,
        });
      }
    }

    // Camera shake: explosion impulses plus a hint of launch rumble
    this.shake = Math.max(this.shake * Math.exp(-dt * 3.4), shakeImpulse);
    const shakeScale = this.reducedMotion ? 0.16 : 1;

    // Compose the camera
    let eye = this.groundY + this.eyeHeight;
    let rollExtra = 0, pitchExtra = 0, lateral = 0;
    if (!this.reducedMotion) {
      const b = this.bobAmount;
      eye += Math.sin(this.bobPhase * 2) * PLAYER.bobAmp * b * (this.sprinting ? 1.5 : 1);
      lateral = Math.sin(this.bobPhase) * PLAYER.bobAmp * 0.8 * b;
      rollExtra = Math.sin(this.bobPhase) * 0.006 * b * (this.sprinting ? 1.8 : 1);
      pitchExtra = Math.cos(this.bobPhase * 2) * 0.0025 * b;
    }
    const sh = this.shake * shakeScale;
    if (sh > 0.001) {
      const t = performance.now() * 0.001;
      eye += noise.noise2(t * 13.7, this.shakeSeed) * 0.05 * sh;
      lateral += noise.noise2(t * 11.3, this.shakeSeed + 9) * 0.05 * sh;
      rollExtra += noise.noise2(t * 9.1, this.shakeSeed + 21) * 0.02 * sh;
      pitchExtra += noise.noise2(t * 15.2, this.shakeSeed + 33) * 0.014 * sh;
    }

    this.camera.position.set(
      this.position.x + _right.x * lateral,
      eye,
      this.position.z + _right.z * lateral,
    );
    _euler.set(this.pitch + pitchExtra, this.yaw, rollExtra);
    this.camera.quaternion.setFromEuler(_euler);
  }

  /** Unit vector the player is looking along. */
  lookDirection(out = new THREE.Vector3()) {
    return out.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
  }

  teleport(x, z, yaw) {
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.groundY = this._supportHeight(x, z, 0);
    if (yaw !== undefined) this.yaw = yaw;
  }

  get eyePosition() { return this.camera.position; }
}
