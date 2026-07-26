import * as THREE from 'three';
import { settings } from '../core/settings.js';
import { bus, EVT } from '../core/events.js';
import { SHAPE_LANGUAGE as SL } from '../art/palette.js';

// ---------------------------------------------------------------------------
// First-person controller.  (owner: opus2)
//
// Deliberate tactical pacing: high friction, meaningful acceleration ramps, a
// real accuracy penalty while moving, and a crouch that is slow enough to be a
// commitment. No sprint - the pacing is "walk, hold angles, peek".
// ---------------------------------------------------------------------------

export const MOVE = {
  STAND: 'standing',
  WALK: 'walking',
  SLOW: 'slow-walking',
  CROUCH: 'crouching',
  CROUCH_WALK: 'crouch-walking',
  AIR: 'airborne',
  LAND: 'landing',
};

const SPEEDS = {
  walk: 3.35,
  slow: 1.55,
  crouch: 1.42,
  ads: 2.05,
  accel: 42,
  airAccel: 6.5,
  friction: 11.5,
  airFriction: 0.22,
};

export class PlayerController {
  constructor({ collision, camera, input, doors }) {
    this.collision = collision;
    this.camera = camera;
    this.input = input;
    this.doors = doors;

    this.position = new THREE.Vector3(0, 0, 0); // feet
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI;
    this.pitch = 0;
    this.radius = 0.33;
    this.standHeight = 1.82;
    this.crouchHeight = 1.18;
    this.height = this.standHeight;
    this.eyeOffset = SL.humanEyeHeight;
    this.crouchEyeOffset = SL.humanCrouchEye;
    this.currentEye = this.eyeOffset;

    this.grounded = true;
    this.wasGrounded = true;
    this.crouching = false;
    this.crouchBlend = 0;
    this.moveState = MOVE.STAND;
    this.groundSurface = 'concrete';

    // Health / armour
    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 100;
    this.armor = 100;
    this.alive = true;
    this.lastDamageTime = -99;
    this.damageDirections = [];

    // Camera feel
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.landDip = 0;
    this.landDipVel = 0;
    this.viewPunch = new THREE.Vector2();
    this.viewPunchVel = new THREE.Vector2();
    this.leanRoll = 0;
    this.stepDistance = 0;
    this.time = 0;

    this.enabled = true;
    this.noclip = false;
    this.godMode = false;
    this.footstepInterval = 0.52;
    // Equipment weight. WeaponSystem writes the active weapon's movement
    // multiplier here each step; nothing else needs to know about weapons.
    this.moveScale = 1;
  }

  spawn(pos, yaw = Math.PI) {
    this.position.set(pos[0], pos[1], pos[2]);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.alive = true;
    this.crouching = false;
    this.crouchBlend = 0;
    this.height = this.standHeight;
    this.currentEye = this.eyeOffset;
    this.landDip = 0;
    this.landDipVel = 0;
    this.viewPunch.set(0, 0);
    this.viewPunchVel.set(0, 0);
    this.damageDirections.length = 0;
    this.grounded = true;
    this.moveScale = 1;
    this.collision.resolveOverlap(this.position, this.radius, this.height);
    this.updateCamera(0);
  }

  get eyePosition() {
    return new THREE.Vector3(this.position.x, this.position.y + this.currentEye, this.position.z);
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  get speed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  addViewPunch(x, y) {
    this.viewPunchVel.x += x;
    this.viewPunchVel.y += y;
  }

  /** Look input, applied every fixed step from accumulated mouse deltas. */
  applyLook(yawDelta, pitchDelta) {
    this.yaw += yawDelta;
    this.pitch = THREE.MathUtils.clamp(this.pitch + pitchDelta, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }

  canStand() {
    const test = this.position.clone();
    const hit = this.collision.overlapsCapsule(test, this.radius - 0.02, this.standHeight);
    return !hit;
  }

  update(dt, { adsFactor = 0, allowInput = true } = {}) {
    this.time += dt;
    if (!this.alive) {
      this.updateDeathCamera(dt);
      return;
    }
    const input = this.input;

    // --- crouch -----------------------------------------------------------
    let wantCrouch = false;
    if (allowInput) {
      if (settings.get('toggleCrouch')) {
        if (input.wasPressed('crouch')) this.crouching = !this.crouching;
        wantCrouch = this.crouching;
      } else {
        wantCrouch = input.isDown('crouch');
      }
    } else {
      wantCrouch = this.crouching && settings.get('toggleCrouch');
    }
    if (!wantCrouch && this.crouchBlend > 0 && !this.canStand()) wantCrouch = true;
    this.crouching = wantCrouch;
    const crouchRate = wantCrouch ? 7.5 : 6.0;
    this.crouchBlend = THREE.MathUtils.clamp(
      this.crouchBlend + (wantCrouch ? 1 : -1) * crouchRate * dt, 0, 1
    );
    const smoothCrouch = this.crouchBlend * this.crouchBlend * (3 - 2 * this.crouchBlend);
    this.height = THREE.MathUtils.lerp(this.standHeight, this.crouchHeight, smoothCrouch);

    // --- wish direction ---------------------------------------------------
    let wx = 0;
    let wz = 0;
    if (allowInput) {
      if (input.isDown('forward')) wz -= 1;
      if (input.isDown('back')) wz += 1;
      if (input.isDown('left')) wx -= 1;
      if (input.isDown('right')) wx += 1;
    }
    const wishLen = Math.hypot(wx, wz);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let wishX = 0;
    let wishZ = 0;
    if (wishLen > 0) {
      wx /= wishLen;
      wz /= wishLen;
      // World basis for yaw: forward = (-sin, -cos), right = (cos, -sin).
      // `wz` is -1 for W, so the forward contribution is (-wz) * forward.
      wishX = wx * cos + wz * sin;
      wishZ = wz * cos - wx * sin;
    }

    // --- target speed -----------------------------------------------------
    const slow = allowInput && input.isDown('walk');
    let target = SPEEDS.walk;
    if (this.crouchBlend > 0.35) target = SPEEDS.crouch;
    else if (slow) target = SPEEDS.slow;
    if (adsFactor > 0.15) target = Math.min(target, THREE.MathUtils.lerp(SPEEDS.walk, SPEEDS.ads, adsFactor));
    target *= THREE.MathUtils.lerp(1, 0.78, smoothCrouch);
    target *= THREE.MathUtils.clamp(this.moveScale, 0.35, 1.25);

    // --- acceleration / friction -----------------------------------------
    const accel = this.grounded ? SPEEDS.accel : SPEEDS.airAccel;
    const horiz = new THREE.Vector2(this.velocity.x, this.velocity.z);
    if (wishLen > 0) {
      const wish = new THREE.Vector2(wishX, wishZ);
      const currentSpeedInWish = horiz.dot(wish);
      const addSpeed = target - currentSpeedInWish;
      if (addSpeed > 0) {
        const accelSpeed = Math.min(accel * dt * target, addSpeed);
        horiz.x += wish.x * accelSpeed;
        horiz.y += wish.y * accelSpeed;
      }
    }
    if (this.grounded) {
      const sp = horiz.length();
      if (sp > 0) {
        const drop = Math.max(sp, 1.2) * SPEEDS.friction * dt;
        const scale = Math.max(0, sp - drop) / sp;
        horiz.multiplyScalar(wishLen > 0 ? Math.max(scale, 0.0) : scale);
      }
    } else {
      horiz.multiplyScalar(Math.max(0, 1 - SPEEDS.airFriction * dt));
    }
    this.velocity.x = horiz.x;
    this.velocity.z = horiz.y;

    // --- jump / gravity ---------------------------------------------------
    if (allowInput && input.wasPressed('jump') && this.grounded && this.crouchBlend < 0.5) {
      this.velocity.y = 4.35;
      this.grounded = false;
    }
    if (!this.noclip) this.velocity.y -= 19.6 * dt;
    else this.velocity.y = 0;

    // --- integrate --------------------------------------------------------
    if (this.noclip) {
      // Debug flight: the wish direction is already in world space, and the
      // pitch component comes from the look direction so you can fly downward.
      const speed = 9;
      const up = allowInput && input.isDown('jump') ? 1 : allowInput && input.isDown('crouch') ? -1 : 0;
      if (wishLen > 0) {
        this.position.x += wishX * speed * dt;
        this.position.z += wishZ * speed * dt;
        this.position.y += -wz * Math.sin(this.pitch) * speed * dt;
      }
      this.position.y += up * 6 * dt;
      this.velocity.set(0, 0, 0);
      this.grounded = false;
    } else {
      const res = this.collision.moveCapsule(this.position, this.velocity, dt, {
        radius: this.radius,
        height: this.height,
        stepHeight: 0.34,
      });
      // moveCapsule resolves against a copy so callers can reject a move; the
      // player always accepts it.
      this.position.copy(res.position);
      this.wasGrounded = this.grounded;
      this.grounded = res.grounded;
      if (res.groundSurface) this.groundSurface = res.groundSurface;
      if (!this.wasGrounded && this.grounded) this.onLand();
      if (this.position.y < -12) this.spawnFallbackRecover();
    }

    // --- movement state ---------------------------------------------------
    const sp = this.speed;
    if (!this.grounded) this.moveState = MOVE.AIR;
    else if (this.crouchBlend > 0.5) this.moveState = sp > 0.35 ? MOVE.CROUCH_WALK : MOVE.CROUCH;
    else if (sp > 2.4) this.moveState = MOVE.WALK;
    else if (sp > 0.35) this.moveState = MOVE.SLOW;
    else this.moveState = MOVE.STAND;

    this.updateFootsteps(dt, sp);
    this.updateCamera(dt, sp, adsFactor);
  }

  spawnFallbackRecover() {
    // Safety net: never let the player fall out of the world.
    this.position.set(0, 0, -20.5);
    this.velocity.set(0, 0, 0);
  }

  onLand() {
    const impact = Math.min(1, Math.abs(this.velocity.y) / 9);
    this.landDipVel -= 0.085 + impact * 0.16;
    bus.emit(EVT.PLAYER_LAND, { surface: this.groundSurface, impact });
    if (impact > 0.62) this.applyDamage(Math.round((impact - 0.62) * 42), null, 'fall');
  }

  updateFootsteps(dt, sp) {
    if (!this.grounded || sp < 0.4) {
      this.stepDistance = Math.max(0, this.stepDistance - dt * 0.4);
      return;
    }
    this.stepDistance += sp * dt;
    const stride = this.crouchBlend > 0.5 ? 0.82 : sp > 2.6 ? 0.92 : 1.1;
    if (this.stepDistance >= stride) {
      this.stepDistance -= stride;
      bus.emit(EVT.PLAYER_FOOTSTEP, {
        surface: this.groundSurface,
        crouched: this.crouchBlend > 0.5,
        speed: sp,
        position: this.position.clone(),
        loudness: this.crouchBlend > 0.5 ? 0.3 : sp > 2.6 ? 1 : 0.5,
      });
    }
  }

  updateCamera(dt, sp = 0, adsFactor = 0) {
    const smoothCrouch = this.crouchBlend * this.crouchBlend * (3 - 2 * this.crouchBlend);
    const targetEye = THREE.MathUtils.lerp(this.eyeOffset, this.crouchEyeOffset, smoothCrouch);
    this.currentEye = THREE.MathUtils.damp(this.currentEye, targetEye, 14, dt);

    const reduce = settings.get('reducedCameraMotion');

    // Landing dip (critically damped spring)
    this.landDipVel += -this.landDip * 145 * dt;
    this.landDipVel *= Math.max(0, 1 - 16 * dt);
    this.landDip += this.landDipVel * dt;
    this.landDip = THREE.MathUtils.clamp(this.landDip, -0.22, 0.06);

    // View bob
    const bobTarget = this.grounded && sp > 0.35 ? Math.min(1, sp / SPEEDS.walk) : 0;
    this.bobAmount = THREE.MathUtils.damp(this.bobAmount, bobTarget, 8, dt);
    this.bobPhase += sp * dt * 3.1;
    const bobScale = (reduce ? 0.25 : 1) * (1 - adsFactor * 0.72) * this.bobAmount;
    const bobY = Math.sin(this.bobPhase * 2) * 0.019 * bobScale;
    const bobX = Math.sin(this.bobPhase) * 0.022 * bobScale;
    const bobRoll = Math.sin(this.bobPhase) * 0.0055 * bobScale;

    // Recoil / damage view punch (spring back to zero)
    this.viewPunchVel.x += -this.viewPunch.x * 190 * dt;
    this.viewPunchVel.y += -this.viewPunch.y * 190 * dt;
    this.viewPunchVel.multiplyScalar(Math.max(0, 1 - 17 * dt));
    this.viewPunch.x += this.viewPunchVel.x * dt;
    this.viewPunch.y += this.viewPunchVel.y * dt;

    // Strafe lean
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const lateral = this.velocity.dot(right) / SPEEDS.walk;
    const targetRoll = reduce ? 0 : -lateral * 0.014;
    this.leanRoll = THREE.MathUtils.damp(this.leanRoll, targetRoll, 8, dt);

    const cam = this.camera;
    cam.position.set(
      this.position.x + bobX * 0.4,
      this.position.y + this.currentEye + bobY + this.landDip,
      this.position.z
    );
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw + this.viewPunch.x;
    cam.rotation.x = this.pitch + this.viewPunch.y;
    cam.rotation.z = this.leanRoll + bobRoll;
  }

  updateDeathCamera(dt) {
    this.deathTime = (this.deathTime || 0) + dt;
    const t = Math.min(1, this.deathTime / 1.1);
    const ease = 1 - Math.pow(1 - t, 3);
    const cam = this.camera;
    cam.position.set(
      this.position.x,
      this.position.y + THREE.MathUtils.lerp(this.currentEye, 0.36, ease),
      this.position.z
    );
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw;
    cam.rotation.x = THREE.MathUtils.lerp(this.pitch, -0.22, ease);
    cam.rotation.z = THREE.MathUtils.lerp(0, 1.32, ease);
  }

  /**
   * Damage with armour absorption. Armour soaks a share of incoming damage and
   * degrades; headshots bypass part of it.
   */
  applyDamage(amount, sourcePos = null, kind = 'bullet') {
    if (!this.alive || this.godMode) return 0;
    let toHealth = amount;
    if (this.armor > 0 && kind !== 'fall') {
      const absorbRatio = kind === 'headshot' ? 0.35 : 0.55;
      const absorbed = Math.min(this.armor, amount * absorbRatio);
      this.armor = Math.max(0, this.armor - absorbed * 0.85);
      toHealth = amount - absorbed;
    }
    toHealth = Math.max(1, Math.round(toHealth));
    this.health = Math.max(0, this.health - toHealth);
    this.lastDamageTime = this.time;
    if (sourcePos) {
      const dx = sourcePos.x - this.position.x;
      const dz = sourcePos.z - this.position.z;
      const angle = Math.atan2(dx, -dz) - this.yaw;
      this.damageDirections.push({ angle, time: this.time, amount: toHealth });
      if (this.damageDirections.length > 6) this.damageDirections.shift();
    }
    this.addViewPunch((Math.random() - 0.5) * 0.02, 0.012 + toHealth * 0.0009);
    bus.emit(EVT.PLAYER_DAMAGE, { amount: toHealth, health: this.health, armor: this.armor, kind, sourcePos });
    if (this.health <= 0) this.die(kind);
    return toHealth;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  die(cause = 'bullet') {
    if (!this.alive) return;
    this.alive = false;
    this.deathTime = 0;
    this.velocity.set(0, 0, 0);
    bus.emit(EVT.PLAYER_DEATH, { cause, position: this.position.clone() });
  }

  toJSON() {
    return {
      position: [+this.position.x.toFixed(3), +this.position.y.toFixed(3), +this.position.z.toFixed(3)],
      eye: [+this.camera.position.x.toFixed(3), +this.camera.position.y.toFixed(3), +this.camera.position.z.toFixed(3)],
      orientation: { yawRadians: +this.yaw.toFixed(4), pitchRadians: +this.pitch.toFixed(4), yawDegrees: +((this.yaw * 180) / Math.PI).toFixed(1) },
      velocity: [+this.velocity.x.toFixed(3), +this.velocity.y.toFixed(3), +this.velocity.z.toFixed(3)],
      speed: +this.speed.toFixed(3),
      health: Math.round(this.health),
      armor: Math.round(this.armor),
      alive: this.alive,
      movementState: this.moveState,
      grounded: this.grounded,
      crouching: this.crouchBlend > 0.5,
      groundSurface: this.groundSurface,
    };
  }
}
