import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/math.js';

const EYE_STAND = 1.62;
const EYE_CROUCH = 1.06;

export class Player {
  constructor({ camera, input, colliders, audio, hud }) {
    this.camera = camera;
    this.input = input;
    this.colliders = colliders;
    this.audio = audio;
    this.hud = hud;

    this.pos = new THREE.Vector3(0, 0, 0);   // feet
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.eyeH = EYE_STAND;
    this.crouched = false;
    this.grounded = true;
    this.sprinting = false;
    this.sprintFrac = 0;
    this.sliding = 0;         // time left in slide
    this.slideDir = new THREE.Vector3();
    this.landDip = 0;
    this.wasGroundedY = 0;

    this.health = 100;
    this.maxHealth = 100;
    this.lastDamageT = -10;
    this.dead = false;
    this.onDeath = null;

    this.baseFov = 75;
    this.adsFrac = 0;         // set by game from weapons
    this.sensitivity = 1;

    this.shakeAmp = 0;
    this.shakeT = 0;
    this.recoilPitch = 0;     // accumulated recoil offset that recovers
    this.recoilYaw = 0;

    this.stepAcc = 0;
    this.moveFrac = 0;
    this.lookDX = 0;
    this.lookDY = 0;

    this.camera.rotation.order = 'YXZ';
  }

  spawnAt(pos, yaw) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.health = this.maxHealth;
    this.dead = false;
  }

  applyRecoil(pitch, yaw) {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
    this.pitch += pitch * 0.75;
    this.yaw += yaw * 0.6;
  }

  addShake(amp) {
    this.shakeAmp = Math.min(0.06, this.shakeAmp + amp);
  }

  /** Asymmetric overpressure kick — a sharp pitch punch that springs back. */
  blastKick(strength) {
    this.pitch -= strength * 0.022;
    this.recoilPitch -= strength * 0.014;
    this.roll += (Math.random() - 0.5) * strength * 0.03;
  }

  takeDamage(dmg, fromPos) {
    if (this.dead) return;
    this.health -= dmg;
    this.lastDamageT = performance.now() * 0.001;
    this.audio.playerHurt();
    this.addShake(0.012);
    this.pitch += (Math.random() - 0.3) * 0.012;
    if (fromPos) {
      const dx = fromPos.x - this.pos.x, dz = fromPos.z - this.pos.z;
      const worldAng = Math.atan2(dx, dz);
      this.hud.damageIndicator(worldAng - this.yaw + Math.PI);
    }
    this.hud.setHealth(this.health / this.maxHealth);
    if (this.health <= 0) {
      this.dead = true;
      if (this.onDeath) this.onDeath();
    }
  }

  get eyePos() {
    return this.pos.clone().add(new THREE.Vector3(0, this.eyeH, 0));
  }

  update(dt, allowInput = true) {
    const input = this.input;
    const t = performance.now() * 0.001;

    /* ---------------- look ---------------- */
    let dx = 0, dy = 0;
    if (allowInput) [dx, dy] = input.consumeMouse();
    else input.consumeMouse();
    this.lookDX = dx / Math.max(dt, 1e-4) * 0.016;
    this.lookDY = dy / Math.max(dt, 1e-4) * 0.016;
    const sensMul = this.sensitivity * lerp(1, 0.55, this.adsFrac) * 0.0021;
    this.yaw -= dx * sensMul;
    this.pitch -= dy * sensMul;
    this.pitch = clamp(this.pitch, -1.45, 1.45);

    // Recoil recovery pulls aim back down partially
    const rr = 1 - Math.exp(-7 * dt);
    this.pitch -= this.recoilPitch * rr * 0.35;
    this.recoilPitch *= (1 - rr);
    this.recoilYaw *= (1 - rr);

    /* ---------------- move ---------------- */
    let ax = 0, az = 0;
    if (allowInput && this.sliding <= 0) [ax, az] = input.axis();
    const wish = new THREE.Vector3(ax, 0, az);
    if (wish.lengthSq() > 0) wish.normalize();
    wish.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // Sprint (forward-ish only)
    const wantSprint = allowInput && !this.sprintBlock && input.down('ShiftLeft') && az < -0.1 && this.grounded && !this.crouched;
    this.sprinting = wantSprint;
    this.sprintFrac = damp(this.sprintFrac, this.sprinting ? 1 : 0, 10, dt);

    // Crouch / slide
    const wantCrouch = allowInput && (input.down('KeyC') || input.down('ControlLeft'));
    if (wantCrouch && !this.crouched && this.sprintFrac > 0.7 && this.grounded && this.sliding <= 0) {
      // Slide!
      this.sliding = 0.62;
      this.slideDir.copy(wish.lengthSq() > 0 ? wish : new THREE.Vector3(Math.sin(this.yaw + Math.PI), 0, Math.cos(this.yaw + Math.PI)).negate());
      this.audio.footstep(true);
    }
    this.crouched = wantCrouch || this.sliding > 0;
    const targetEye = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eyeH = damp(this.eyeH, targetEye, 11, dt);

    const baseSpeed = this.crouched && this.sliding <= 0 ? 2.5 : 5.1;
    const speed = baseSpeed * lerp(1, 1.52, this.sprintFrac) * lerp(1, 0.62, this.adsFrac * (1 - this.sprintFrac));

    if (this.sliding > 0) {
      this.sliding -= dt;
      const k = clamp(this.sliding / 0.62, 0, 1);
      this.vel.x = this.slideDir.x * 9.2 * (0.4 + k * 0.6);
      this.vel.z = this.slideDir.z * 9.2 * (0.4 + k * 0.6);
    } else {
      // Ground acceleration with friction feel
      const accel = this.grounded ? 55 : 9;
      this.vel.x = damp(this.vel.x, wish.x * speed, accel / 6, dt);
      this.vel.z = damp(this.vel.z, wish.z * speed, accel / 6, dt);
    }

    // Jump
    if (allowInput && input.down('Space') && this.grounded && this.jumpLock !== true) {
      this.vel.y = 4.6;
      this.grounded = false;
      this.jumpLock = true;
    }
    if (!input.down('Space')) this.jumpLock = false;

    // Gravity
    this.vel.y -= 13.5 * dt;

    // Integrate + resolve
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    let grounded = false;
    if (this.pos.y <= 0) { this.pos.y = 0; if (this.vel.y < 0) this.vel.y = 0; grounded = true; }
    const boxGrounded = this.colliders.resolveCapsule(this.pos, 0.42, 1.75, this.vel);
    grounded = grounded || boxGrounded;

    // Landing dip
    if (grounded && !this.grounded) {
      const fall = Math.abs(this.wasGroundedY - this.pos.y);
      this.landDip = Math.min(0.16, 0.05 + fall * 0.02);
      this.audio.footstep(true);
    }
    if (!grounded && this.grounded) this.wasGroundedY = this.pos.y;
    this.grounded = grounded;
    this.landDip = damp(this.landDip, 0, 9, dt);

    // Footsteps
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.moveFrac = clamp(hSpeed / 7.6, 0, 1);
    if (this.grounded && hSpeed > 0.6) {
      this.stepAcc += hSpeed * dt;
      const strideLen = this.sprinting ? 2.5 : 1.9;
      if (this.stepAcc > strideLen) {
        this.stepAcc = 0;
        this.audio.footstep(this.sprinting);
      }
    }

    /* ---------------- health regen ---------------- */
    if (!this.dead && this.health < this.maxHealth && t - this.lastDamageT > 4.2) {
      this.health = Math.min(this.maxHealth, this.health + 28 * dt);
      this.hud.setHealth(this.health / this.maxHealth);
    }
    this.hud.setDamageVignette(1 - this.health / this.maxHealth);

    /* ---------------- camera ---------------- */
    // Strafe lean
    const strafe = (this.vel.x * Math.cos(this.yaw) - this.vel.z * Math.sin(this.yaw)) / 7;
    const slideRoll = this.sliding > 0 ? -0.06 : 0;
    this.roll = damp(this.roll, -strafe * 0.02 + slideRoll, 8, dt);

    // Shake decay + sample
    this.shakeAmp = damp(this.shakeAmp, 0, 5.2, dt);
    this.shakeT += dt * 34;
    const shX = (Math.sin(this.shakeT * 1.1) + Math.sin(this.shakeT * 2.3 + 1.7)) * 0.5 * this.shakeAmp;
    const shY = (Math.sin(this.shakeT * 1.7 + 4.2) + Math.sin(this.shakeT * 0.9)) * 0.5 * this.shakeAmp;
    const shR = Math.sin(this.shakeT * 1.4 + 2.1) * 0.6 * this.shakeAmp;

    // Subtle camera bob (view, not gun)
    const bobY = Math.abs(Math.cos(t * (this.sprinting ? 11 : 8.2))) * 0.014 * this.moveFrac * (1 - this.adsFrac * 0.8);

    this.camera.position.set(this.pos.x, this.pos.y + this.eyeH - this.landDip - bobY, this.pos.z);
    this.camera.rotation.set(this.pitch + shX, this.yaw + shY * 0.6, this.roll + shR, 'YXZ');

    // FOV
    const targetFov = this.baseFov * lerp(1, 0.74, this.adsFrac) + this.sprintFrac * 5;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    this.audio.update(dt, this.health / this.maxHealth);
  }
}
