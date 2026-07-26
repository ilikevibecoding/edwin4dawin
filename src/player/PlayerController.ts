/**
 * First-person controller. Owner: Opus 2.
 *
 * Tactical pacing: no sprint. The default gait is a purposeful 3.3 m/s jog, Shift drops to a
 * quiet 1.55 m/s that halves the noise radius, and crouch trades speed for a much smaller
 * profile and near-silent movement. Acceleration is high enough to feel responsive but low
 * enough that you commit to a direction, which is what makes peeking a decision.
 */
import * as THREE from 'three';
import type { CollisionWorld } from '../world/Collision';
import type { EventBus } from '../core/EventBus';
import type { MovementState, Settings, SurfaceKind } from '../core/Types';
import type { InputSystem } from './Input';

export const PLAYER = {
  radius: 0.32,
  standHeight: 1.82,
  crouchHeight: 1.22,
  standEye: 1.66,
  crouchEye: 1.06,
  runSpeed: 3.3,
  walkSpeed: 1.55,
  crouchSpeed: 1.32,
  airControl: 0.28,
  accelGround: 48,
  accelAir: 14,
  friction: 11.5,
  gravity: 17.5,
  jumpVelocity: 4.35,
  maxHealth: 100,
  maxArmor: 100,
  stepHeight: 0.34,
  crouchLerp: 9.5,
};

export interface DamageInfo {
  amount: number;
  direction: THREE.Vector3;
  source: string;
  headshot?: boolean;
}

export class PlayerController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = Math.PI;
  pitch = 0;

  health = PLAYER.maxHealth;
  armor = PLAYER.maxArmor;
  alive = true;

  crouching = false;
  grounded = true;
  groundSurface: SurfaceKind = 'snow';
  movementState: MovementState = 'idle';

  /** Current interpolated body height, so crouching is smooth. */
  bodyHeight = PLAYER.standHeight;
  eyeHeight = PLAYER.standEye;

  /** View-space offsets produced by bob, landing and recoil. */
  readonly viewOffset = new THREE.Vector3();
  viewRoll = 0;
  recoilPitch = 0;
  recoilYaw = 0;

  /** Accumulated inaccuracy from movement, 0..1, read by the weapon system. */
  moveInaccuracy = 0;
  /** Loudness of the player's last footstep, metres. */
  lastNoiseRadius = 0;

  private bobPhase = 0;
  private landDip = 0;
  private landDipVel = 0;
  private stepDistance = 0;
  private world: CollisionWorld;
  private bus: EventBus;
  private settings: Settings;
  private damageFlash = 0;
  private lastDamageDir = new THREE.Vector3(0, 0, -1);
  private wasGrounded = true;
  private headBobEnabled = true;
  private breathPhase = 0;

  constructor(world: CollisionWorld, bus: EventBus, settings: Settings) {
    this.world = world;
    this.bus = bus;
    this.settings = settings;
  }

  setSettings(s: Settings): void {
    this.settings = s;
    this.headBobEnabled = !s.reducedCameraMotion;
  }

  spawn(x: number, y: number, z: number, yaw: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.health = PLAYER.maxHealth;
    this.armor = PLAYER.maxArmor;
    this.alive = true;
    this.crouching = false;
    this.bodyHeight = PLAYER.standHeight;
    this.eyeHeight = PLAYER.standEye;
    this.movementState = 'idle';
    this.viewOffset.set(0, 0, 0);
    this.viewRoll = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.bobPhase = 0;
    this.landDip = 0;
    this.landDipVel = 0;
    this.stepDistance = 0;
    this.damageFlash = 0;
    this.moveInaccuracy = 0;
    this.grounded = true;
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x + this.viewOffset.x,
      this.position.y + this.eyeHeight + this.viewOffset.y,
      this.position.z + this.viewOffset.z,
    );
  }

  /** Forward vector including pitch. */
  getLookDirection(out = new THREE.Vector3()): THREE.Vector3 {
    const p = this.pitch + this.recoilPitch;
    const y = this.yaw + this.recoilYaw;
    out.set(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
    return out.normalize();
  }

  applyLook(dx: number, dy: number): void {
    const sens = this.settings.mouseSensitivity * 0.00072;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens * (this.settings.invertY ? -1 : 1);
    const limit = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    if (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    if (this.yaw < -Math.PI) this.yaw += Math.PI * 2;
  }

  addRecoil(pitch: number, yaw: number): void {
    this.recoilPitch += pitch;
    this.recoilYaw += yaw;
  }

  damage(info: DamageInfo): void {
    if (!this.alive) return;
    let remaining = info.amount;
    if (this.armor > 0) {
      // Armour absorbs half the incoming damage and degrades at the same rate.
      const absorbed = Math.min(this.armor, remaining * 0.5);
      this.armor -= absorbed;
      remaining -= absorbed;
    }
    this.health = Math.max(0, this.health - remaining);
    this.damageFlash = Math.min(1, this.damageFlash + info.amount / 55);
    this.lastDamageDir.copy(info.direction).normalize();
    this.bus.emit('player:damaged', {
      amount: info.amount,
      fromDirection: this.lastDamageDir.clone(),
      health: this.health,
      armor: this.armor,
    });
    if (this.health <= 0) {
      this.alive = false;
      this.movementState = 'dead';
      this.bus.emit('player:died', { cause: info.source });
    }
  }

  get damageIntensity(): number {
    return this.damageFlash;
  }

  get damageDirection(): THREE.Vector3 {
    return this.lastDamageDir;
  }

  /** Fixed-step update. */
  update(dt: number, input: InputSystem, canAct: boolean): void {
    this.damageFlash = Math.max(0, this.damageFlash - dt * 0.85);

    if (!this.alive) {
      // Death: drop the camera and stop everything else.
      this.eyeHeight += (0.35 - this.eyeHeight) * Math.min(1, dt * 4);
      this.viewRoll += (0.4 - this.viewRoll) * Math.min(1, dt * 3);
      this.velocity.set(0, 0, 0);
      return;
    }

    if (canAct) {
      const m = input.takeMouse();
      if (m.dx !== 0 || m.dy !== 0) this.applyLook(m.dx, m.dy);
    }

    // Recoil recovery: exponential return toward the original aim point.
    const recover = Math.min(1, dt * 7.5);
    this.recoilPitch -= this.recoilPitch * recover;
    this.recoilYaw -= this.recoilYaw * recover;
    if (Math.abs(this.recoilPitch) < 1e-5) this.recoilPitch = 0;
    if (Math.abs(this.recoilYaw) < 1e-5) this.recoilYaw = 0;

    // --- crouch ------------------------------------------------------------
    const wantCrouch = canAct && input.isDown('crouch');
    if (wantCrouch) {
      this.crouching = true;
    } else if (this.crouching) {
      // Only stand if there is room.
      const test = this.position.clone();
      if (this.world.fits(test, PLAYER.radius, PLAYER.standHeight)) this.crouching = false;
    }
    const targetHeight = this.crouching ? PLAYER.crouchHeight : PLAYER.standHeight;
    const targetEye = this.crouching ? PLAYER.crouchEye : PLAYER.standEye;
    const k = Math.min(1, dt * PLAYER.crouchLerp);
    this.bodyHeight += (targetHeight - this.bodyHeight) * k;
    this.eyeHeight += (targetEye - this.eyeHeight) * k;

    // --- wish direction ----------------------------------------------------
    let fx = 0;
    let fz = 0;
    if (canAct) {
      if (input.isDown('forward')) fz += 1;
      if (input.isDown('back')) fz -= 1;
      if (input.isDown('right')) fx += 1;
      if (input.isDown('left')) fx -= 1;
    }
    const len = Math.hypot(fx, fz);
    if (len > 1) {
      fx /= len;
      fz /= len;
    }
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    // yaw 0 faces -Z
    const wishX = -sy * fz + cy * fx;
    const wishZ = -cy * fz - sy * fx;

    const walking = canAct && input.isDown('walk');
    let maxSpeed = PLAYER.runSpeed;
    if (this.crouching) maxSpeed = PLAYER.crouchSpeed;
    else if (walking) maxSpeed = PLAYER.walkSpeed;

    // --- acceleration ------------------------------------------------------
    if (this.grounded) {
      // friction
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.001) {
        const drop = Math.max(speed, 1.2) * PLAYER.friction * dt;
        const scale = Math.max(0, speed - drop) / speed;
        this.velocity.x *= scale;
        this.velocity.z *= scale;
      }
      this.accelerate(wishX, wishZ, maxSpeed, PLAYER.accelGround, dt);
    } else {
      this.accelerate(wishX, wishZ, maxSpeed * 0.95, PLAYER.accelAir * PLAYER.airControl * 4, dt);
    }

    // --- jump --------------------------------------------------------------
    if (canAct && input.isDown('jump') && this.grounded && !this.crouching) {
      this.velocity.y = PLAYER.jumpVelocity;
      this.grounded = false;
      this.bus.emit('noise', {
        position: this.position.clone(),
        loudness: 6,
        source: 'footstep',
      });
    }

    this.velocity.y -= PLAYER.gravity * dt;
    if (this.velocity.y < -32) this.velocity.y = -32;

    // --- integrate ---------------------------------------------------------
    const delta = new THREE.Vector3(this.velocity.x * dt, this.velocity.y * dt, this.velocity.z * dt);
    const res = this.world.moveBody(
      this.position, this.velocity, PLAYER.radius, this.bodyHeight, delta,
      { stepHeight: PLAYER.stepHeight, canStep: true },
    );
    const fallSpeed = this.velocity.y;
    this.position.copy(res.position);
    this.velocity.copy(res.velocity);
    this.wasGrounded = this.grounded;
    this.grounded = res.grounded;
    this.groundSurface = res.groundSurface;

    // --- landing -----------------------------------------------------------
    if (this.grounded && !this.wasGrounded) {
      const impact = Math.min(1, Math.abs(fallSpeed) / 9);
      this.landDipVel -= impact * 3.2;
      if (impact > 0.22) {
        this.bus.emit('player:footstep', {
          surface: this.groundSurface, crouched: false, position: this.position.clone(),
        });
        this.bus.emit('noise', {
          position: this.position.clone(), loudness: 9 * impact, source: 'footstep',
        });
      }
      if (Math.abs(fallSpeed) > 13.5) {
        this.damage({
          amount: (Math.abs(fallSpeed) - 13.5) * 7,
          direction: new THREE.Vector3(0, 1, 0),
          source: 'fall',
        });
      }
    }

    // --- movement state + footsteps ----------------------------------------
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!this.grounded) this.movementState = 'airborne';
    else if (this.crouching) this.movementState = planarSpeed > 0.25 ? 'crouch-walking' : 'crouch-idle';
    else if (planarSpeed > 2.4) this.movementState = 'running';
    else if (planarSpeed > 0.25) this.movementState = 'walking';
    else this.movementState = 'idle';

    if (this.grounded && planarSpeed > 0.25) {
      this.stepDistance += planarSpeed * dt;
      const stride = this.crouching ? 1.05 : walking ? 0.95 : 0.82;
      if (this.stepDistance >= stride) {
        this.stepDistance = 0;
        this.bus.emit('player:footstep', {
          surface: this.groundSurface,
          crouched: this.crouching,
          position: this.position.clone(),
        });
        const loud = this.crouching ? 2.5 : walking ? 5 : 13;
        this.lastNoiseRadius = loud;
        this.bus.emit('noise', { position: this.position.clone(), loudness: loud, source: 'footstep' });
      }
    } else {
      this.lastNoiseRadius = 0;
    }

    // --- view motion -------------------------------------------------------
    this.breathPhase += dt * 1.35;
    const bobAmp = this.headBobEnabled ? 1 : 0.18;
    if (this.grounded && planarSpeed > 0.3) {
      this.bobPhase += (planarSpeed / Math.max(0.5, maxSpeed)) * dt * 9.2;
    } else {
      this.bobPhase += dt * 0.6;
    }
    const bobStrength = Math.min(1, planarSpeed / PLAYER.runSpeed) * bobAmp;
    // landing dip spring
    this.landDipVel += -this.landDip * 90 * dt;
    this.landDipVel *= Math.max(0, 1 - 11 * dt);
    this.landDip += this.landDipVel * dt;
    this.landDip = Math.max(-0.22, Math.min(0.06, this.landDip));

    const idleBreath = Math.sin(this.breathPhase) * 0.0045 * bobAmp;
    this.viewOffset.set(
      Math.cos(this.bobPhase) * 0.028 * bobStrength,
      Math.sin(this.bobPhase * 2) * 0.019 * bobStrength + this.landDip + idleBreath,
      0,
    );
    this.viewRoll = -Math.cos(this.bobPhase) * 0.008 * bobStrength
      + (fx !== 0 ? -fx * 0.012 * bobAmp : 0);

    // --- accuracy ----------------------------------------------------------
    const speedFactor = Math.min(1, planarSpeed / PLAYER.runSpeed);
    const airPenalty = this.grounded ? 0 : 0.75;
    const target = Math.min(1, speedFactor * (this.crouching ? 0.45 : 1) + airPenalty);
    this.moveInaccuracy += (target - this.moveInaccuracy) * Math.min(1, dt * (target > this.moveInaccuracy ? 14 : 6));
  }

  private accelerate(wishX: number, wishZ: number, maxSpeed: number, accel: number, dt: number): void {
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen < 1e-4) return;
    const nx = wishX / wishLen;
    const nz = wishZ / wishLen;
    const currentSpeed = this.velocity.x * nx + this.velocity.z * nz;
    const addSpeed = maxSpeed - currentSpeed;
    if (addSpeed <= 0) return;
    let accelSpeed = accel * dt * maxSpeed;
    if (accelSpeed > addSpeed) accelSpeed = addSpeed;
    this.velocity.x += nx * accelSpeed;
    this.velocity.z += nz * accelSpeed;
  }

  /** Write the camera transform for this frame. */
  applyToCamera(camera: THREE.PerspectiveCamera): void {
    const eye = this.eyePosition;
    camera.position.copy(eye);
    camera.rotation.set(this.pitch + this.recoilPitch, this.yaw + this.recoilYaw, this.viewRoll, 'YXZ');
  }
}
