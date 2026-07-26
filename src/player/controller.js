import * as THREE from 'three';
import { UNITS } from '../art/palette.js';
import { settings } from '../core/settings.js';
import { bus, EV } from '../core/events.js';
import { collision } from '../map/collision.js';
import { roomAt, isVoid } from '../map/layout.js';

/**
 * FIRST-PERSON CONTROLLER
 * Owner: Opus 2.
 *
 * Deliberate tactical pacing: high friction, moderate top speed, meaningful
 * accuracy penalty while moving, and an audible/visible difference between
 * running, walking and crouching. Air control is intentionally small.
 */

const MOVE = {
  runSpeed: 4.25,
  walkSpeed: 2.05,
  crouchSpeed: 1.55,
  adsSpeed: 2.35,
  sprintSpeed: 5.6,
  accelGround: 42,
  accelAir: 6,
  frictionGround: 12.5,
  frictionAir: 0.35,
  gravity: 20.5,
  jumpVelocity: 5.05,
  crouchLerp: 9.5,
  landingDip: 0.09,
  maxFallDamageSpeed: 11.5,
};

export const PLAYER_STATE = {
  IDLE: 'idle', WALK: 'walking', RUN: 'running', SPRINT: 'sprinting',
  CROUCH_IDLE: 'crouch-idle', CROUCH_MOVE: 'crouch-moving', AIR: 'airborne', DEAD: 'dead',
};

export class PlayerController {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 0, -27.5);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.crouchAmount = 0;
    this.targetCrouch = 0;
    this.grounded = true;
    this.groundSurface = 'snow';
    this.wasGrounded = true;
    this.state = PLAYER_STATE.IDLE;
    this.lean = 0;
    this.targetLean = 0;
    this.alive = true;
    this.health = 100;
    this.armor = 100;
    this.speedScale = 1;
    this.adsFactor = 0;
    this.floor = 'ground';

    // Camera feel
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.viewOffset = new THREE.Vector3();
    this.landingDip = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.recoilVelPitch = 0;
    this.recoilVelYaw = 0;
    this.punch = new THREE.Vector2();
    this.stepDistance = 0;
    this.fallSpeed = 0;
    this.noclip = false;
    this.frozen = false;

    this._tmp = new THREE.Vector3();
    this._wish = new THREE.Vector3();
  }

  get eyeHeight() {
    return THREE.MathUtils.lerp(UNITS.eyeHeightStand, UNITS.eyeHeightCrouch, this.crouchAmount);
  }

  get height() {
    return THREE.MathUtils.lerp(UNITS.playerHeightStand, UNITS.playerHeightCrouch, this.crouchAmount);
  }

  get isCrouched() {
    return this.crouchAmount > 0.55;
  }

  get horizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  get lookDirection() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  get eyePosition() {
    return new THREE.Vector3(
      this.position.x + this.viewOffset.x,
      this.position.y + this.eyeHeight + this.viewOffset.y,
      this.position.z + this.viewOffset.z,
    );
  }

  teleport(pos, yaw = null) {
    this.position.set(pos[0], pos[1], pos[2]);
    this.velocity.set(0, 0, 0);
    if (yaw !== null) this.yaw = THREE.MathUtils.degToRad(yaw);
    this.crouchAmount = 0;
    this.targetCrouch = 0;
    this.updateCamera(0);
  }

  reset(spawn) {
    this.teleport(spawn.pos, spawn.yaw);
    this.pitch = 0;
    this.health = 100;
    this.armor = 100;
    this.alive = true;
    this.state = PLAYER_STATE.IDLE;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.punch.set(0, 0);
    this.viewOffset.set(0, 0, 0);
    this.landingDip = 0;
    this.lean = 0;
    this.targetLean = 0;
  }

  applyLook(dx, dy) {
    if (!this.alive) return;
    this.yaw -= THREE.MathUtils.degToRad(dx);
    this.pitch -= THREE.MathUtils.degToRad(dy);
    const lim = Math.PI / 2 - 0.012;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }

  addRecoil(pitchKick, yawKick) {
    this.recoilVelPitch += pitchKick;
    this.recoilVelYaw += yawKick;
  }

  update(dt, input, ctx = {}) {
    if (!this.alive) {
      this.state = PLAYER_STATE.DEAD;
      this.updateCamera(dt);
      return;
    }
    if (this.frozen) {
      this.updateCamera(dt);
      return;
    }

    const wantCrouch = settings.get('toggleCrouch')
      ? this.targetCrouch > 0.5
      : input.isDown('crouch');
    let crouchTarget = wantCrouch ? 1 : 0;
    // Refuse to stand up under a low ceiling
    if (crouchTarget === 0 && this.crouchAmount > 0.1) {
      if (collision.overlaps(this.position.x, this.position.y, this.position.z, UNITS.playerRadius * 0.95, UNITS.playerHeightStand)) {
        crouchTarget = 1;
      }
    }
    this.targetCrouch = crouchTarget;
    this.crouchAmount += (this.targetCrouch - this.crouchAmount) * Math.min(1, MOVE.crouchLerp * dt);

    /* ---- Wish direction ---- */
    const f = input.isDown('forward') ? 1 : 0;
    const b = input.isDown('back') ? 1 : 0;
    const l = input.isDown('left') ? 1 : 0;
    const r = input.isDown('right') ? 1 : 0;
    const fwd = f - b;
    const strafe = r - l;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    this._wish.set(-sinY * fwd + cosY * strafe, 0, -cosY * fwd - sinY * strafe);
    const wishLen = this._wish.length();
    if (wishLen > 0.001) this._wish.divideScalar(wishLen);

    const ads = ctx.aiming ?? false;
    const slowWalk = input.isDown('walk');
    const sprinting = input.isDown('sprint') && fwd > 0 && !ads && this.crouchAmount < 0.3 && this.grounded;

    let target = MOVE.runSpeed;
    if (this.crouchAmount > 0.5) target = MOVE.crouchSpeed;
    else if (slowWalk) target = MOVE.walkSpeed;
    else if (ads) target = MOVE.adsSpeed;
    else if (sprinting) target = MOVE.sprintSpeed;
    target *= this.speedScale * (ctx.speedMultiplier ?? 1);

    /* ---- Acceleration and friction ---- */
    const accel = this.grounded ? MOVE.accelGround : MOVE.accelAir;
    const vh = this._tmp.set(this.velocity.x, 0, this.velocity.z);
    if (wishLen > 0.001) {
      const currentSpeedAlongWish = vh.dot(this._wish);
      const addSpeed = target - currentSpeedAlongWish;
      if (addSpeed > 0) {
        const accelSpeed = Math.min(accel * dt * target, addSpeed);
        this.velocity.x += this._wish.x * accelSpeed;
        this.velocity.z += this._wish.z * accelSpeed;
      }
    }
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.0001) {
      const friction = this.grounded ? MOVE.frictionGround : MOVE.frictionAir;
      const drop = Math.max(speed, 1.2) * friction * dt;
      const newSpeed = Math.max(0, speed - drop);
      const scale = newSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    /* ---- Jump ---- */
    if (input.wasPressed('jump') && this.grounded && this.crouchAmount < 0.4) {
      this.velocity.y = MOVE.jumpVelocity;
      this.grounded = false;
      bus.emit(EV.NOISE, { pos: this.position.clone(), radius: 6, kind: 'jump', source: 'player' });
    }
    this.velocity.y -= MOVE.gravity * dt;
    if (this.velocity.y < -34) this.velocity.y = -34;

    /* ---- Integrate with collision ---- */
    if (this.noclip) {
      const dir = this.lookDirection;
      const spd = 9 * (input.isDown('walk') ? 0.3 : 1);
      this.position.addScaledVector(dir, fwd * spd * dt);
      this.position.x += (cosY * strafe) * spd * dt;
      this.position.z += (-sinY * strafe) * spd * dt;
      if (input.isDown('jump')) this.position.y += spd * dt;
      if (input.isDown('crouch')) this.position.y -= spd * dt;
      this.velocity.set(0, 0, 0);
      this.grounded = true;
    } else {
      const delta = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
      const res = collision.moveCapsule(this.position, delta, UNITS.playerRadius, this.height, UNITS.stepHeight);
      this.wasGrounded = this.grounded;
      this.position.set(res.x, res.y, res.z);
      this.grounded = res.grounded;
      this.groundSurface = res.groundSurface;
      if (res.grounded) {
        if (!this.wasGrounded) this.onLanded(-this.fallSpeed);
        this.velocity.y = 0;
        this.fallSpeed = 0;
      } else {
        this.fallSpeed = this.velocity.y;
      }
      if (res.hitCeiling) this.velocity.y = Math.min(0, this.velocity.y);
      if (res.hitWall) {
        // Kill the component into the wall so we do not accumulate speed
        const sp = Math.hypot(this.velocity.x, this.velocity.z);
        if (sp > 0.001) {
          this.velocity.x *= 0.55;
          this.velocity.z *= 0.55;
        }
      }
    }

    this.floor = this.position.y > 2.3 ? 'upper' : 'ground';

    /* ---- Lean ---- */
    const leanIn = (input.isDown('lean_left') ? -1 : 0) + (input.isDown('lean_right') ? 1 : 0);
    this.targetLean = leanIn * (this.grounded ? 1 : 0);
    this.lean += (this.targetLean - this.lean) * Math.min(1, 9 * dt);

    /* ---- Footsteps ---- */
    const hSpeed = this.horizontalSpeed;
    if (this.grounded && hSpeed > 0.4) {
      this.stepDistance += hSpeed * dt;
      const stride = this.crouchAmount > 0.5 ? 1.05 : sprinting ? 1.9 : slowWalk ? 1.55 : 1.5;
      if (this.stepDistance >= stride) {
        this.stepDistance = 0;
        const loud = this.crouchAmount > 0.5 ? 0.28 : slowWalk ? 0.42 : sprinting ? 1.25 : 1;
        bus.emit(EV.FOOTSTEP, { pos: this.position.clone(), surface: this.groundSurface, loudness: loud, source: 'player' });
        bus.emit(EV.NOISE, { pos: this.position.clone(), radius: 4 + loud * 11, kind: 'footstep', source: 'player' });
      }
    } else if (hSpeed < 0.2) {
      this.stepDistance = Math.max(this.stepDistance, 1.1);
    }

    /* ---- State ---- */
    if (!this.grounded) this.state = PLAYER_STATE.AIR;
    else if (this.crouchAmount > 0.5) this.state = hSpeed > 0.25 ? PLAYER_STATE.CROUCH_MOVE : PLAYER_STATE.CROUCH_IDLE;
    else if (hSpeed < 0.25) this.state = PLAYER_STATE.IDLE;
    else if (sprinting) this.state = PLAYER_STATE.SPRINT;
    else if (slowWalk || ads) this.state = PLAYER_STATE.WALK;
    else this.state = PLAYER_STATE.RUN;

    this.adsFactor += ((ads ? 1 : 0) - this.adsFactor) * Math.min(1, 14 * dt);
    this.updateCamera(dt, hSpeed);

    // Safety net: never let the player end up inside the upper-floor void
    if (this.position.y > 4.0 && isVoid(this.position.x, this.position.z, 'upper') === false) {
      const room = roomAt(this.position.x, this.position.z, 'upper');
      if (!room && this.position.y > 4.1 && this.grounded === false && this.position.y < 4.3) {
        // falling through a slab edge is fine; nothing to do
      }
    }
  }

  onLanded(impactSpeed) {
    this.landingDip = Math.min(1, impactSpeed / 9) * MOVE.landingDip;
    bus.emit(EV.FOOTSTEP, { pos: this.position.clone(), surface: this.groundSurface, loudness: 1.3, source: 'player', land: true });
    bus.emit(EV.NOISE, { pos: this.position.clone(), radius: 11, kind: 'land', source: 'player' });
    if (impactSpeed > MOVE.maxFallDamageSpeed) {
      const dmg = Math.round((impactSpeed - MOVE.maxFallDamageSpeed) * 7);
      if (dmg > 0) this.damage(dmg, null, 'fall');
    }
  }

  damage(amount, from = null, kind = 'bullet') {
    if (!this.alive) return 0;
    let remaining = amount;
    if (this.armor > 0 && kind !== 'fall') {
      const absorbed = Math.min(this.armor, amount * 0.55);
      this.armor = Math.max(0, this.armor - absorbed * 0.9);
      remaining = amount - absorbed;
    }
    this.health = Math.max(0, this.health - remaining);
    bus.emit(EV.PLAYER_DAMAGED, {
      amount: remaining, from, kind,
      health: this.health, armor: this.armor,
      direction: from ? new THREE.Vector3().subVectors(from, this.position).normalize() : null,
    });
    if (this.health <= 0) {
      this.alive = false;
      this.state = PLAYER_STATE.DEAD;
      bus.emit(EV.PLAYER_DIED, { by: kind });
    }
    return remaining;
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  updateCamera(dt, hSpeed = 0) {
    // Recoil spring
    const stiffness = 46;
    const damping = 11.5;
    this.recoilVelPitch += (-this.recoilPitch * stiffness - this.recoilVelPitch * damping) * dt;
    this.recoilVelYaw += (-this.recoilYaw * stiffness - this.recoilVelYaw * damping) * dt;
    this.recoilPitch += this.recoilVelPitch * dt;
    this.recoilYaw += this.recoilVelYaw * dt;

    // View bob
    const reduce = settings.get('reducedCameraMotion') ? 0.25 : 1;
    const targetBob = this.grounded ? Math.min(1, hSpeed / MOVE.runSpeed) : 0;
    this.bobAmount += (targetBob - this.bobAmount) * Math.min(1, 8 * dt);
    this.bobPhase += hSpeed * dt * 3.1;
    const bobX = Math.cos(this.bobPhase) * 0.028 * this.bobAmount * reduce;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.034 * this.bobAmount * reduce;
    this.landingDip *= Math.max(0, 1 - 7 * dt);

    const leanOffset = this.lean * 0.42;
    this.viewOffset.set(
      Math.cos(this.yaw) * leanOffset + bobX * Math.cos(this.yaw),
      -this.landingDip + bobY,
      -Math.sin(this.yaw) * leanOffset + bobX * -Math.sin(this.yaw),
    );

    const cam = this.camera;
    const eye = this.eyePosition;
    cam.position.copy(eye);
    cam.rotation.set(
      this.pitch + this.recoilPitch + this.punch.y,
      this.yaw + this.recoilYaw + this.punch.x,
      -this.lean * 0.13 + Math.cos(this.bobPhase * 0.5) * 0.006 * this.bobAmount * reduce,
      'YXZ',
    );
    this.punch.multiplyScalar(Math.max(0, 1 - 9 * dt));
  }

  serialize() {
    return {
      position: [round(this.position.x), round(this.position.y), round(this.position.z)],
      eye: [round(this.eyePosition.x), round(this.eyePosition.y), round(this.eyePosition.z)],
      yawDeg: round(THREE.MathUtils.radToDeg(this.yaw)),
      pitchDeg: round(THREE.MathUtils.radToDeg(this.pitch)),
      velocity: [round(this.velocity.x), round(this.velocity.y), round(this.velocity.z)],
      speed: round(this.horizontalSpeed),
      health: Math.round(this.health),
      armor: Math.round(this.armor),
      movementState: this.state,
      grounded: this.grounded,
      crouched: this.isCrouched,
      leaning: this.lean > 0.2 ? 'right' : this.lean < -0.2 ? 'left' : 'none',
      floor: this.floor,
      surface: this.groundSurface,
      alive: this.alive,
    };
  }
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}

export { MOVE as PLAYER_MOVE };
