import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/utils.js';

// ===========================================================================
// First-person controller — COD-feel movement: acceleration curves, sprint,
// tactical crouch, slide, jump with landing dip, view bob, weapon sway hooks.
// ===========================================================================

const EYE_STAND = 1.66;
const EYE_CROUCH = 1.05;

export class PlayerController {
  constructor(camera, input, physics) {
    this.camera = camera;
    this.input = input;
    this.physics = physics;

    this.position = new THREE.Vector3(0, 0, 58);   // feet
    this.velocity = new THREE.Vector3();
    this.yaw = 0;   // facing -z (toward the intersection)
    this.pitch = 0;

    this.radius = 0.38;
    this.height = 1.8;
    this.eyeHeight = EYE_STAND;

    this.onGround = true;
    this.crouching = false;
    this.sprinting = false;
    this.sliding = false;
    this.slideTimer = 0;
    this.slideDir = new THREE.Vector3();

    this.bobPhase = 0;
    this.bobAmp = 0;
    this.landDip = 0;
    this.fallSpeedAtLand = 0;

    this.speedWalk = 5.2;
    this.speedSprint = 8.0;
    this.speedCrouch = 2.6;
    this.speedAir = 5.4;

    this.health = 100;
    this.maxHealth = 100;
    this.lastDamageTime = -99;
    this.dead = false;

    // Exposed for weapon system
    this.moveSpeedNormalized = 0;
    this.aimingFraction = 0;

    // shake state (set by fx)
    this.shakeAmp = 0;
    this.shakeDecay = 6;
    this._shakeT = 0;
  }

  addShake(amount) {
    this.shakeAmp = Math.min(0.09, this.shakeAmp + amount);
  }

  damage(amount, fromDir = null) {
    if (this.dead) return;
    this.health -= amount;
    this.lastDamageTime = performance.now() / 1000;
    this.lastDamageDir = fromDir;
    this.addShake(0.014);
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  update(dt, time) {
    const input = this.input;

    // Passive regen after 4.5s (COD-style)
    if (!this.dead && this.health < this.maxHealth && time - this.lastDamageTime > 4.5) {
      this.health = Math.min(this.maxHealth, this.health + dt * 28);
    }

    // ---- Look ----
    const mouse = input.consumeMouse();
    const sens = 0.00125 * lerp(1.0, 0.55, this.aimingFraction);
    this.yaw -= mouse.x * sens;
    this.pitch = clamp(this.pitch - mouse.y * sens, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);

    // ---- Move intent ----
    let fwd = 0, str = 0;
    if (input.isDown('KeyW')) fwd += 1;
    if (input.isDown('KeyS')) fwd -= 1;
    if (input.isDown('KeyA')) str -= 1;
    if (input.isDown('KeyD')) str += 1;

    const wantSprint = input.isDown('ShiftLeft') && fwd > 0 && !this.crouching;
    this.sprinting = wantSprint && this.onGround && this.aimingFraction < 0.3;

    // Crouch / slide
    if (input.wasPressed('KeyC') || input.wasPressed('ControlLeft')) {
      if (this.sprinting && this.onGround && !this.sliding) {
        // Tactical slide
        this.sliding = true;
        this.slideTimer = 0.62;
        this.slideDir.set(Math.sin(this.yaw) * -1, 0, Math.cos(this.yaw) * -1).normalize();
        this.crouching = true;
      } else {
        this.crouching = !this.crouching;
      }
    }
    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.sliding = false;
    }

    // ---- Direction vectors ----
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    const forward = new THREE.Vector3(-sinY, 0, -cosY);
    const right = new THREE.Vector3(cosY, 0, -sinY);

    const wish = new THREE.Vector3()
      .addScaledVector(forward, fwd)
      .addScaledVector(right, str);
    if (wish.lengthSq() > 1) wish.normalize();

    let targetSpeed = this.crouching ? this.speedCrouch : (this.sprinting ? this.speedSprint : this.speedWalk);
    if (this.aimingFraction > 0.5) targetSpeed *= 0.62;

    // ---- Horizontal velocity with acceleration ----
    if (this.sliding) {
      const slideSpeed = 9.5 * (this.slideTimer / 0.62);
      this.velocity.x = this.slideDir.x * slideSpeed;
      this.velocity.z = this.slideDir.z * slideSpeed;
    } else if (this.onGround) {
      const accel = 34;
      this.velocity.x = damp(this.velocity.x, wish.x * targetSpeed, accel / targetSpeed, dt);
      this.velocity.z = damp(this.velocity.z, wish.z * targetSpeed, accel / targetSpeed, dt);
    } else {
      // Air control
      this.velocity.x += wish.x * this.speedAir * 1.6 * dt;
      this.velocity.z += wish.z * this.speedAir * 1.6 * dt;
      const hs = Math.hypot(this.velocity.x, this.velocity.z);
      if (hs > this.speedSprint) {
        this.velocity.x *= this.speedSprint / hs;
        this.velocity.z *= this.speedSprint / hs;
      }
    }

    // ---- Jump & gravity ----
    if (input.wasPressed('Space') && this.onGround && !this.sliding) {
      this.velocity.y = 5.6;
      this.onGround = false;
      this.crouching = false;
    }
    this.velocity.y -= 15.5 * dt;

    // ---- Integrate & collide ----
    const prevVy = this.velocity.y;
    this.position.addScaledVector(this.velocity, dt);
    const res = this.physics.collideCapsule(this.position, this.radius, this.crouching ? 1.25 : this.height);
    const wasAir = !this.onGround;
    this.onGround = res.onGround;
    if (this.onGround) {
      if (wasAir && prevVy < -4) {
        this.landDip = Math.min(0.16, -prevVy * 0.014);
      }
      if (this.velocity.y < 0) this.velocity.y = 0;
    }

    // ---- Eye height, bob, dip ----
    const targetEye = this.crouching ? EYE_CROUCH : EYE_STAND;
    this.eyeHeight = damp(this.eyeHeight, targetEye, 12, dt);
    this.landDip = damp(this.landDip, 0, 8, dt);

    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.moveSpeedNormalized = clamp(hSpeed / this.speedSprint, 0, 1);
    const bobTarget = this.onGround && !this.sliding ? clamp(hSpeed / this.speedWalk, 0, 1.6) : 0;
    this.bobAmp = damp(this.bobAmp, bobTarget, 8, dt);
    this.bobPhase += dt * (6 + hSpeed * 1.35);
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.028 * this.bobAmp * (1 - this.aimingFraction * 0.8);
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.014 * this.bobAmp * (1 - this.aimingFraction * 0.8);

    // ---- Camera shake ----
    this._shakeT += dt * 34;
    this.shakeAmp = damp(this.shakeAmp, 0, this.shakeDecay, dt);
    const shX = (Math.sin(this._shakeT * 1.1) + Math.sin(this._shakeT * 2.3) * 0.5) * this.shakeAmp;
    const shY = (Math.cos(this._shakeT * 1.7) + Math.sin(this._shakeT * 2.9) * 0.5) * this.shakeAmp;

    // ---- Apply to camera ----
    this.camera.position.set(
      this.position.x + bobX * Math.cos(this.yaw),
      this.position.y + this.eyeHeight + bobY - this.landDip,
      this.position.z + bobX * -Math.sin(this.yaw)
    );
    const rollFromStrafe = -str * 0.008 - (this.sliding ? 0.05 : 0);
    this.camera.rotation.set(this.pitch + shY, this.yaw + shX, rollFromStrafe, 'YXZ');
  }
}
