// First-person controller: pointer lock, WASD + sprint, capsule collision,
// head bob, footsteps, camera shake with reduced-motion support.
import * as THREE from 'three';
import { resolveCapsule, groundHeight } from './physics.js';

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 7.6;
const ACCEL = 34;
const RADIUS = 0.36;

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wish = new THREE.Vector3();

export class Player {
  constructor(ctx) {
    this.ctx = ctx;
    this.pos = new THREE.Vector3(-10.5, 0, 8);   // feet, just outside the shelter door
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI / 2;                       // facing the shelter entrance
    this.pitch = -0.02;
    this.keys = new Set();
    this.enabled = false;      // movement allowed (pointer locked, no console)
    this.frozen = false;       // console mode
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.trauma = 0;
    this.shakeSeed = Math.random() * 100;
    this.stepEmitted = false;
    this.reducedMotion = false;
    this.sensitivity = 0.0021;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.frozen) return;
      if (document.pointerLockElement || this.ctx.testMode) {
        this.yaw -= e.movementX * this.sensitivity;
        this.pitch -= e.movementY * this.sensitivity;
        this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
      }
    });
  }

  addShake(amount, sourcePos = null) {
    let a = amount;
    if (sourcePos) {
      const d = this.ctx.camera.position.distanceTo(sourcePos);
      a *= 1 / (1 + d / 130);
    }
    if (this.reducedMotion) a *= 0.25;
    this.trauma = Math.min(1, this.trauma + a);
  }

  teleport(x, y, z, yaw = this.yaw, pitch = this.pitch) {
    this.pos.set(x, y, z);
    this.yaw = yaw; this.pitch = pitch;
    this.vel.set(0, 0, 0);
  }

  update(dt) {
    const moving = this.enabled && !this.frozen;
    // wish direction
    _wish.set(0, 0, 0);
    if (moving) {
      _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      _right.set(-_fwd.z, 0, _fwd.x);
      if (this.keys.has('KeyW')) _wish.add(_fwd);
      if (this.keys.has('KeyS')) _wish.sub(_fwd);
      if (this.keys.has('KeyD')) _wish.add(_right);
      if (this.keys.has('KeyA')) _wish.sub(_right);
    }
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const maxSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;
    if (_wish.lengthSq() > 0) {
      _wish.normalize().multiplyScalar(maxSpeed);
    }
    // accelerate toward wish velocity
    this.vel.x += (_wish.x - this.vel.x) * Math.min(1, ACCEL * dt / maxSpeed);
    this.vel.z += (_wish.z - this.vel.z) * Math.min(1, ACCEL * dt / maxSpeed);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // keep inside world bounds
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > 600) {
      this.pos.x *= 600 / r;
      this.pos.z *= 600 / r;
    }

    // collision
    resolveCapsule(this.pos, RADIUS, this.ctx.colliders, this.pos.y);
    this.pos.y = groundHeight(this.pos.x, this.pos.z);

    // head bob + footsteps
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const speedFrac = speed / SPRINT_SPEED;
    if (speed > 0.4) {
      const freq = 1.7 + speedFrac * 1.3;
      const prev = this.bobPhase;
      this.bobPhase += dt * freq * Math.PI * 2;
      this.bobAmp = THREE.MathUtils.lerp(this.bobAmp, Math.min(1, speed / WALK_SPEED), dt * 6);
      // footstep at each half-cycle bottom
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI)) {
        this.ctx.audio?.footstep();
      }
    } else {
      this.bobAmp = THREE.MathUtils.lerp(this.bobAmp, 0, dt * 8);
    }
    // shake decay
    this.trauma = Math.max(0, this.trauma - dt * 0.85);
  }

  // apply camera transform (called every render frame)
  applyCamera(camera, time) {
    const bobOn = !this.reducedMotion;
    const bobY = bobOn ? Math.sin(this.bobPhase * 2) * 0.034 * this.bobAmp : 0;
    const bobX = bobOn ? Math.cos(this.bobPhase) * 0.022 * this.bobAmp : 0;
    // subtle idle breathing
    const idle = bobOn ? Math.sin(time * 1.7) * 0.006 : 0;

    camera.position.set(
      this.pos.x + bobX * Math.cos(this.yaw),
      this.pos.y + EYE_HEIGHT + bobY + idle,
      this.pos.z - bobX * Math.sin(this.yaw),
    );

    // trauma shake (perlin-ish via sines)
    const t2 = this.trauma * this.trauma;
    const st = time * 31 + this.shakeSeed;
    const shakeYaw = t2 * 0.028 * (Math.sin(st) + Math.sin(st * 1.7) * 0.5);
    const shakePitch = t2 * 0.024 * (Math.sin(st * 1.3 + 2) + Math.sin(st * 2.3) * 0.5);
    const shakeRoll = t2 * 0.016 * Math.sin(st * 0.9 + 4);

    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.yaw + shakeYaw);
    camera.rotateX(this.pitch + shakePitch);
    camera.rotateZ(shakeRoll);
  }

  // nearest interactable within reach the camera is roughly facing
  getInteract(interactables, camera) {
    let best = null, bestScore = 0.5;
    for (const it of interactables) {
      const to = it.pos.clone().sub(camera.position);
      const dist = to.length();
      if (dist > it.radius + 1.2) continue;
      to.normalize();
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const dot = fwd.dot(to);
      if (dist < 1.1 || dot > bestScore) {
        best = it; bestScore = dot;
      }
    }
    return best;
  }
}
