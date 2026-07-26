import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import type { Stance } from '../core/Contracts';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import type { CharacterController } from '../physics/CharacterController';
import { clamp } from '../core/MathX';

/**
 * The mutable player state shared between movement and camera. `PlayerSystem`
 * implements it; keeping it as an interface avoids an import cycle.
 */
export interface PlayerState {
  /** Feet position (ground contact point) in world space. */
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  stance: Stance;
  sprinting: boolean;
  grounded: boolean;
  /** Current stance-blended eye height above the feet. */
  eyeHeight: number;
  /** Horizontal speed (m/s). */
  speed: number;
  sliding: boolean;
  /** 0..1 how deep into a slide we are (camera dip/roll). */
  slideAmount: number;
  mantling: boolean;
  /** 0..1 mantle progress. */
  mantleAmount: number;
  /** Negative, decaying offset that smooths kerb step-ups (metres). */
  stepSmooth: number;
  adsAmount: number;
  inputEnabled: boolean;
  health: number;
}

// ---------------------------------------------------------------------------
// Tuning — the numbers that decide how it *feels*.
// ---------------------------------------------------------------------------
export const MOVE = {
  radiusStand: 0.32,
  radiusProne: 0.22,
  // total height, eye height, capsule radius per stance
  stand: { h: 1.8, eye: 1.66, r: 0.32 },
  crouch: { h: 1.15, eye: 1.05, r: 0.32 },
  prone: { h: 0.5, eye: 0.4, r: 0.22 },

  walk: 4.4,
  sprint: 7.0,
  tacSprint: 8.6,
  tacSprintTime: 2.5,
  crouchSpeed: 2.4,
  proneSpeed: 1.1,
  adsSpeed: 2.6,
  backScale: 0.8,
  strafeScale: 0.9,

  groundAccel: 11,
  airAccel: 14,
  airCap: 1.1, // classic air-strafe wishspeed clamp
  friction: 6.5,
  stopSpeed: 1.6,

  gravity: 21,
  jumpVel: 6.72, // ~1.05 m apex under discrete integration
  terminal: 60,
  coyote: 0.1,
  jumpBuffer: 0.12,

  crouchTime: 0.22,
  proneTime: 0.5,

  slideSpeed: 8.8,
  slideTime: 0.95,
  slideMinSpeed: 2.7,
  slideFriction: 2.2,
} as const;

/**
 * Capsule character movement: a CoD-flavoured accelerate/friction model on top
 * of the Rapier character controller, with stances, jump (coyote + buffer),
 * slide, and mantle. Driven from `fixedUpdate` at 60 Hz.
 */
export class PlayerMovement {
  private controller!: CharacterController;

  private curH = MOVE.stand.h;
  private curEye = MOVE.stand.eye;
  private curR = MOVE.stand.r;

  private wasGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private sprintTimer = 0;
  private proneToggled = false;

  private slideTimer = 0;
  private slideDir = new THREE.Vector3();

  private mantleT = 0;
  private mantleDur = 0.5;
  private mantleStart = new THREE.Vector3();
  private mantleEnd = new THREE.Vector3();

  private footDist = 0;
  private lastFootSurface = 'concrete';

  private landImpact = 0;

  constructor(
    private p: PlayerState,
    private physics: PhysicsSystem
  ) {}

  init(spawn: THREE.Vector3, ctx: EngineContext) {
    this.controller = this.physics.createController(MOVE.stand.r, MOVE.stand.h / 2 - MOVE.stand.r);
    this.controller.setFoot(spawn);
    // Drop to ground so the spawn Y needn't be exact.
    const down = this.physics.raycast(
      _tmpO.set(spawn.x, spawn.y + 1.5, spawn.z),
      DOWN,
      12,
      { staticOnly: true }
    );
    if (down) {
      _tmpO.set(spawn.x, down.point.y, spawn.z);
      this.controller.setFoot(_tmpO);
    }
    this.controller.getFoot(this.p.position);
    this.p.eyeHeight = this.curEye;
    void ctx;
  }

  teleport(pos: THREE.Vector3) {
    this.controller.setFoot(pos);
    this.controller.getFoot(this.p.position);
    this.p.velocity.set(0, 0, 0);
    this.slideTimer = 0;
    this.mantleT = 0;
    this.p.sliding = false;
    this.p.mantling = false;
  }

  addExternalImpulse(v: THREE.Vector3) {
    this.p.velocity.add(v);
    this.p.grounded = false;
    this.coyoteTimer = 0;
  }

  fixedUpdate(dt: number, ctx: EngineContext) {
    if (!this.controller) return;
    const input = ctx.input;
    const enabled = this.p.inputEnabled && input.enabled;

    // Mantle overrides everything.
    if (this.p.mantling) {
      this.updateMantle(dt);
      this.finishFrame(dt, ctx);
      return;
    }

    const [mx, mzRaw] = enabled ? input.getMoveAxis() : [0, 0];
    const mz = mzRaw;

    // --- Stance intent -----------------------------------------------------
    if (enabled && input.pressed('prone')) this.proneToggled = !this.proneToggled;
    const crouchHeld = enabled && input.isDown('crouch');
    let desired: Stance = 'stand';
    if (this.proneToggled) desired = 'prone';
    else if (crouchHeld) desired = 'crouch';

    // Slide trigger: sprinting + crouch pressed while fast.
    if (
      enabled &&
      this.p.sprinting &&
      this.p.grounded &&
      !this.p.sliding &&
      input.pressed('crouch') &&
      this.p.speed > MOVE.sprint * 0.7
    ) {
      this.startSlide();
    }

    // Ceiling blocks standing up.
    desired = this.applyCeilingBlock(desired);
    if (this.p.sliding) desired = 'crouch';
    this.p.stance = desired;
    this.updateStanceDims(dt, desired);

    // --- Aim & sprint state ------------------------------------------------
    const adsHeld = enabled && input.isDown('ads') && this.p.grounded;
    let wantSprint =
      enabled &&
      input.isDown('sprint') &&
      mz > 0.3 &&
      !adsHeld &&
      desired === 'stand' &&
      !this.p.sliding;
    if (wantSprint && this.p.grounded) this.sprintTimer += dt;
    else this.sprintTimer = 0;
    this.p.sprinting = wantSprint && this.p.grounded;

    // --- Target speed ------------------------------------------------------
    let speed: number = MOVE.walk;
    if (this.p.sliding) speed = MOVE.slideSpeed;
    else if (desired === 'prone') speed = MOVE.proneSpeed;
    else if (desired === 'crouch') speed = MOVE.crouchSpeed;
    else if (this.p.sprinting)
      speed = this.sprintTimer < MOVE.tacSprintTime ? MOVE.tacSprint : MOVE.sprint;
    else if (adsHeld) speed = MOVE.adsSpeed;

    // --- Wish direction ----------------------------------------------------
    const sinY = Math.sin(this.p.yaw);
    const cosY = Math.cos(this.p.yaw);
    // forward = (-sin, 0, -cos); right = (cos, 0, -sin)
    const wishZ = mz * (mz < 0 ? MOVE.backScale : 1);
    const wishX = mx * MOVE.strafeScale;
    _wish.set(cosY * wishX - sinY * wishZ, 0, -sinY * wishX - cosY * wishZ);
    const wishLen = _wish.length();
    const wishSpeed = speed * clamp(wishLen, 0, 1);
    if (wishLen > 1e-5) _wish.multiplyScalar(1 / wishLen);
    else _wish.set(0, 0, 0);

    // --- Jump (coyote + buffer) -------------------------------------------
    if (enabled && input.pressed('jump')) this.jumpBufferTimer = MOVE.jumpBuffer;
    else this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.p.grounded) this.coyoteTimer = MOVE.coyote;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    let justJumped = false;
    const canJump = this.coyoteTimer > 0 && desired !== 'prone' && !this.p.sliding;
    if (this.jumpBufferTimer > 0 && canJump) {
      this.p.velocity.y = MOVE.jumpVel;
      this.p.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      justJumped = true;
      if (this.p.sliding) this.endSlide();
    }

    // --- Horizontal acceleration ------------------------------------------
    if (this.p.sliding) {
      this.updateSlide(dt);
    } else if (this.p.grounded && !justJumped) {
      this.applyFriction(dt);
      this.accelerate(_wish, wishSpeed, MOVE.groundAccel, dt);
    } else {
      this.airAccelerate(_wish, wishSpeed, MOVE.airAccel, dt);
    }

    // Try to mantle when pushing into a ledge (jump or auto against wall).
    if (enabled && !this.p.grounded && mz > 0.2 && this.p.velocity.y < 3) {
      this.tryMantle();
      if (this.p.mantling) {
        this.finishFrame(dt, ctx);
        return;
      }
    }

    // --- Vertical ----------------------------------------------------------
    // Only stick to the ground while descending; ascending (a jump) always
    // integrates gravity so the controller briefly reporting `grounded` at
    // take-off can't swallow the jump.
    if (this.p.grounded && this.p.velocity.y <= 0 && !justJumped) {
      this.p.velocity.y = 0; // snap-to-ground keeps us planted over bumps
    } else {
      this.p.velocity.y = Math.max(this.p.velocity.y - MOVE.gravity * dt, -MOVE.terminal);
    }

    // --- Move --------------------------------------------------------------
    this.controller.setSnap(this.p.velocity.y <= 0.05 && !justJumped);
    _delta.copy(this.p.velocity).multiplyScalar(dt);
    const res = this.controller.move(_delta);
    this.p.grounded = res.grounded;

    if (this.p.grounded && this.p.velocity.y < 0) this.p.velocity.y = 0;
    // Reconcile velocity with what the controller actually applied (collide-and-
    // slide): on open ground applied == desired so this is a no-op, but against
    // a wall it prevents phantom speed building up into the geometry.
    if (dt > 1e-5) {
      this.p.velocity.x = res.delta.x / dt;
      this.p.velocity.z = res.delta.z / dt;
    }

    // Step-up smoothing for the camera.
    if (res.stepUp > 0.02) this.p.stepSmooth -= res.stepUp;

    this.controller.getFoot(this.p.position);
    this.finishFrame(dt, ctx);
  }

  // -------------------------------------------------------------------------

  private finishFrame(dt: number, ctx: EngineContext) {
    this.p.speed = Math.hypot(this.p.velocity.x, this.p.velocity.z);

    // Landing detection.
    if (!this.wasGrounded && this.p.grounded) {
      const impact = this.landImpact;
      if (impact > 1.5) {
        ctx.events.emit('player:land', { impact });
        if (impact > 12 && this.p.health > 0) {
          // Mild fall damage above a safe threshold.
          const dmg = Math.min(60, (impact - 12) * 6);
          this.p.health = Math.max(0, this.p.health - dmg);
        }
      }
    }
    if (!this.p.grounded) this.landImpact = Math.abs(Math.min(0, this.p.velocity.y));
    this.wasGrounded = this.p.grounded;

    // Footsteps by distance travelled (in sync with strides, not wall time).
    if (this.p.grounded && this.p.speed > 0.6 && !this.p.sliding) {
      this.footDist += this.p.speed * dt;
      const stride = this.strideLength();
      if (this.footDist >= stride) {
        this.footDist -= stride;
        this.emitFootstep(ctx);
      }
    } else if (this.p.speed < 0.4) {
      this.footDist = Math.min(this.footDist, this.strideLength() * 0.6);
    }

    // Decay step-smoothing and slide/mantle amounts.
    this.p.stepSmooth += (0 - this.p.stepSmooth) * (1 - Math.pow(0.0001, dt));
    this.p.eyeHeight = this.curEye;
    this.p.slideAmount += ((this.p.sliding ? 1 : 0) - this.p.slideAmount) * (1 - Math.pow(0.02, dt));
    this.p.mantleAmount +=
      ((this.p.mantling ? 1 : 0) - this.p.mantleAmount) * (1 - Math.pow(0.001, dt));
  }

  private strideLength() {
    if (this.p.stance === 'prone') return 1.5;
    if (this.p.stance === 'crouch') return 1.15;
    return this.p.sprinting ? 2.35 : 1.75;
  }

  private emitFootstep(ctx: EngineContext) {
    // Sample the surface directly under the feet.
    _tmpO.copy(this.p.position);
    _tmpO.y += 0.4;
    const hit = this.physics.raycast(_tmpO, DOWN, 1.2, { staticOnly: true });
    const surface = (hit?.surface as string) ?? this.lastFootSurface;
    this.lastFootSurface = surface;
    ctx.events.emit('player:footstep', {
      surface,
      speed: this.p.speed,
      position: this.p.position,
    });
  }

  // --- Stance ---------------------------------------------------------------

  private updateStanceDims(dt: number, stance: Stance) {
    const tgt = MOVE[stance];
    const rate = stance === 'prone' || this.curH < MOVE.crouch.h ? MOVE.proneTime : MOVE.crouchTime;
    // Approach the target dims over the stance's transition time.
    const k = 1 - Math.pow(0.01, dt / Math.max(0.05, rate));
    this.curH += (tgt.h - this.curH) * k;
    this.curEye += (tgt.eye - this.curEye) * k;
    this.curR += (tgt.r - this.curR) * k;
    const halfH = Math.max(0.02, this.curH / 2 - this.curR);
    this.controller.resize(this.curR, halfH);
  }

  private applyCeilingBlock(desired: Stance): Stance {
    // Only relevant when trying to grow taller than we currently are.
    const target = MOVE[desired];
    if (target.h <= this.curH + 0.01) return desired;
    const needed = target.h - this.curH;
    const clearance = this.controller.sweep(UP, needed + 0.05);
    if (clearance < needed) {
      // Blocked — pick the tallest stance that fits.
      if (MOVE.crouch.h <= this.curH + clearance) return 'crouch';
      return this.p.stance; // stay put
    }
    return desired;
  }

  // --- Acceleration model ---------------------------------------------------

  private accelerate(dir: THREE.Vector3, wishSpeed: number, accel: number, dt: number) {
    const cur = this.p.velocity.x * dir.x + this.p.velocity.z * dir.z;
    const add = wishSpeed - cur;
    if (add <= 0) return;
    let accelSpeed = accel * dt * wishSpeed;
    if (accelSpeed > add) accelSpeed = add;
    this.p.velocity.x += dir.x * accelSpeed;
    this.p.velocity.z += dir.z * accelSpeed;
  }

  private airAccelerate(dir: THREE.Vector3, wishSpeed: number, accel: number, dt: number) {
    const capped = Math.min(wishSpeed, MOVE.airCap);
    const cur = this.p.velocity.x * dir.x + this.p.velocity.z * dir.z;
    const add = capped - cur;
    if (add <= 0) return;
    let accelSpeed = accel * dt * wishSpeed;
    if (accelSpeed > add) accelSpeed = add;
    this.p.velocity.x += dir.x * accelSpeed;
    this.p.velocity.z += dir.z * accelSpeed;
  }

  private applyFriction(dt: number) {
    const speed = Math.hypot(this.p.velocity.x, this.p.velocity.z);
    if (speed < 1e-4) {
      this.p.velocity.x = 0;
      this.p.velocity.z = 0;
      return;
    }
    const control = speed < MOVE.stopSpeed ? MOVE.stopSpeed : speed;
    const drop = control * MOVE.friction * dt;
    const newSpeed = Math.max(0, speed - drop) / speed;
    this.p.velocity.x *= newSpeed;
    this.p.velocity.z *= newSpeed;
  }

  // --- Slide ----------------------------------------------------------------

  private startSlide() {
    this.p.sliding = true;
    this.slideTimer = MOVE.slideTime;
    const s = Math.max(this.p.speed, MOVE.walk);
    this.slideDir.set(this.p.velocity.x, 0, this.p.velocity.z);
    if (this.slideDir.lengthSq() < 1e-4) this.slideDir.set(-Math.sin(this.p.yaw), 0, -Math.cos(this.p.yaw));
    this.slideDir.normalize();
    const boost = Math.min(MOVE.slideSpeed, s + 2.2);
    this.p.velocity.x = this.slideDir.x * boost;
    this.p.velocity.z = this.slideDir.z * boost;
  }

  private updateSlide(dt: number) {
    this.slideTimer -= dt;
    // Ramp friction so the slide bleeds off smoothly.
    const speed = Math.hypot(this.p.velocity.x, this.p.velocity.z);
    const t = 1 - clamp(this.slideTimer / MOVE.slideTime, 0, 1);
    const fric = MOVE.slideFriction * (0.4 + t * 1.6);
    const drop = Math.max(speed, MOVE.stopSpeed) * fric * dt;
    const ns = Math.max(0, speed - drop) / Math.max(speed, 1e-4);
    this.p.velocity.x *= ns;
    this.p.velocity.z *= ns;
    if (this.slideTimer <= 0 || speed < MOVE.slideMinSpeed) this.endSlide();
  }

  private endSlide() {
    this.p.sliding = false;
    this.slideTimer = 0;
  }

  // --- Mantle ---------------------------------------------------------------

  private tryMantle() {
    const feetY = this.p.position.y;
    _fwd.set(-Math.sin(this.p.yaw), 0, -Math.cos(this.p.yaw));
    _chest.copy(this.p.position);
    _chest.y += 0.95;
    const wall = this.physics.raycast(_chest, _fwd, 0.85, { staticOnly: true });
    if (!wall) return;
    const wallDist = wall.distance;

    _probe.copy(this.p.position).addScaledVector(_fwd, wallDist + 0.35);
    _probe.y += 1.7;
    const top = this.physics.raycast(_probe, DOWN, 1.8, { staticOnly: true });
    if (!top) return;
    const ledgeHeight = top.point.y - feetY;
    if (ledgeHeight < 0.5 || ledgeHeight > 1.5) return;

    // Clearance above the ledge for the player to stand.
    _clear.copy(top.point).addScaledVector(UP, 0.15);
    const up = this.physics.raycast(_clear, UP, 1.2, { staticOnly: true });
    if (up && up.distance < 1.0) return;

    this.mantleStart.copy(this.p.position);
    this.mantleEnd.copy(top.point).addScaledVector(_fwd, 0.35);
    this.mantleEnd.y = top.point.y + 0.02;
    this.mantleT = 0;
    this.mantleDur = clamp(0.35 + ledgeHeight * 0.12, 0.35, 0.6);
    this.p.mantling = true;
    this.p.velocity.set(0, 0, 0);
    this.endSlide();
  }

  private updateMantle(dt: number) {
    this.mantleT += dt / this.mantleDur;
    const t = clamp(this.mantleT, 0, 1);
    // Vertical leads, horizontal follows — a hand-over-ledge arc.
    const vy = smooth(clamp(t * 1.5, 0, 1));
    const hz = smooth(clamp((t - 0.2) / 0.8, 0, 1));
    _mpos.set(
      THREE.MathUtils.lerp(this.mantleStart.x, this.mantleEnd.x, hz),
      THREE.MathUtils.lerp(this.mantleStart.y, this.mantleEnd.y, vy),
      THREE.MathUtils.lerp(this.mantleStart.z, this.mantleEnd.z, hz)
    );
    this.controller.setFoot(_mpos);
    this.controller.getFoot(this.p.position);
    if (t >= 1) {
      this.p.mantling = false;
      this.p.grounded = true;
      this.wasGrounded = true;
    }
  }

  get controllerRef() {
    return this.controller;
  }

  dispose() {
    this.controller?.dispose();
  }
}

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const _wish = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _tmpO = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _chest = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _clear = new THREE.Vector3();
const _mpos = new THREE.Vector3();
