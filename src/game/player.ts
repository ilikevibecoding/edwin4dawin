import * as THREE from 'three';
import { input } from '../core/input';
import { settings } from '../core/settings';
import { events } from '../core/events';
import type { CollisionWorld } from '../world/collision';
import type { SurfaceKind } from './types';

export const PLAYER_RADIUS = 0.34;
export const STAND_HEIGHT = 1.74;
export const CROUCH_HEIGHT = 1.2;
export const EYE_STAND = 1.62;
export const EYE_CROUCH = 1.06;

const GRAVITY = 17.5;
const JUMP_V = 5.6;
const SPEED_RUN = 3.9;
const SPEED_WALK = 1.9;
const SPEED_CROUCH = 1.55;
const ACCEL = 42;
const DECEL = 46;
const AIR_CONTROL = 0.22;
const STEP_HEIGHT = 0.34;

export type MoveState = 'idle' | 'walk' | 'run' | 'crouch' | 'air';

export class Player {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  crouchT = 0;
  wantCrouch = false;
  onGround = true;
  groundSurface: SurfaceKind = 'concrete';
  health = 100;
  armor = 50;
  alive = true;
  moveState: MoveState = 'idle';
  /** recoil offsets applied on top of aim (recover over time) */
  recoilPitch = 0;
  recoilYaw = 0;
  /** camera shake/bob accumulators */
  bobPhase = 0;
  bobAmp = 0;
  landBump = 0;
  private stepAcc = 0;
  private col: CollisionWorld;
  /** movement speed multiplier from weapon */
  speedMult = 1;
  frozen = false;
  private lastDamageAt = -99;
  private timeNow = 0;

  constructor(col: CollisionWorld) {
    this.col = col;
  }

  spawnAt(pos: [number, number, number], yaw: number): void {
    this.pos.set(pos[0], pos[1], pos[2]);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.health = 100;
    this.alive = true;
    this.crouchT = 0;
    this.wantCrouch = false;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.bobAmp = 0;
    this.landBump = 0;
  }

  get height(): number {
    return STAND_HEIGHT - (STAND_HEIGHT - CROUCH_HEIGHT) * this.crouchT;
  }

  get eyeY(): number {
    return this.pos.y + EYE_STAND - (EYE_STAND - EYE_CROUCH) * this.crouchT + this.landBump;
  }

  eyePos(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(this.pos.x, this.eyeY, this.pos.z);
  }

  forward(out = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch + this.recoilPitch);
    return out.set(
      -Math.sin(this.yaw + this.recoilYaw) * cp,
      Math.sin(this.pitch + this.recoilPitch),
      -Math.cos(this.yaw + this.recoilYaw) * cp,
    ).normalize();
  }

  step(dt: number): void {
    this.timeNow += dt;
    if (!this.alive || this.frozen) return;

    // ---- look ----
    const look = input.look();
    const sens = settings.get('mouseSensitivity') * 0.0021;
    const invY = settings.get('invertY') ? -1 : 1;
    this.yaw -= look.dx * sens;
    this.pitch -= look.dy * sens * invY;
    const maxPitch = Math.PI / 2 - 0.02;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -maxPitch, maxPitch);

    // recoil recovery
    const rec = 7.5 * dt;
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 8, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 8, dt);

    // ---- crouch ----
    if (input.wasPressed('crouch')) this.wantCrouch = !this.wantCrouch;
    // stand up only with headroom
    if (!this.wantCrouch && this.crouchT > 0) {
      const test = this.pos.clone();
      if (!this.col.capsuleFits(test, PLAYER_RADIUS, STAND_HEIGHT)) this.wantCrouch = true;
    }
    const crouchTarget = this.wantCrouch ? 1 : 0;
    this.crouchT = THREE.MathUtils.damp(this.crouchT, crouchTarget, 14, dt);
    if (Math.abs(this.crouchT - crouchTarget) < 0.005) this.crouchT = crouchTarget;

    // ---- movement intent ----
    let ix = 0, iz = 0;
    if (input.isDown('forward')) iz -= 1;
    if (input.isDown('back')) iz += 1;
    if (input.isDown('left')) ix -= 1;
    if (input.isDown('right')) ix += 1;
    const moving = ix !== 0 || iz !== 0;
    const slow = input.isDown('walk');
    let speed = this.crouchT > 0.5 ? SPEED_CROUCH : slow ? SPEED_WALK : SPEED_RUN;
    speed *= this.speedMult;

    // world-space wish dir: forward (-sin yaw, -cos yaw), right (cos yaw, -sin yaw)
    let wx = 0, wz = 0;
    if (moving) {
      const len = Math.hypot(ix, iz);
      const f = -iz / len; // forward amount
      const r = ix / len;  // right amount
      wx = -Math.sin(this.yaw) * f + Math.cos(this.yaw) * r;
      wz = -Math.cos(this.yaw) * f - Math.sin(this.yaw) * r;
    }

    const accel = this.onGround ? (moving ? ACCEL : DECEL) : ACCEL * AIR_CONTROL;
    const tvx = wx * speed, tvz = wz * speed;
    this.vel.x = THREE.MathUtils.damp(this.vel.x, tvx, accel / 6, dt);
    this.vel.z = THREE.MathUtils.damp(this.vel.z, tvz, accel / 6, dt);

    // ---- jump & gravity ----
    if (input.wasPressed('jump') && this.onGround && this.crouchT < 0.3) {
      this.vel.y = JUMP_V;
      this.onGround = false;
      events.emit('noise', { pos: [this.pos.x, this.pos.y, this.pos.z], radius: 7, kind: 'jump' });
    }
    this.vel.y -= GRAVITY * dt;
    if (this.vel.y < -25) this.vel.y = -25;

    const wasGround = this.onGround;
    const vyBefore = this.vel.y;
    const res = this.col.capsuleMove(
      this.pos, PLAYER_RADIUS, this.height,
      this.vel.x * dt, this.vel.y * dt, this.vel.z * dt,
      this.onGround || this.vel.y <= 0.1 ? STEP_HEIGHT : 0.0,
    );
    this.pos.copy(res.pos);
    this.onGround = res.onGround;
    this.groundSurface = res.groundSurface;
    if (this.onGround && this.vel.y < 0) this.vel.y = 0;

    // landing feedback
    if (!wasGround && this.onGround) {
      const impact = Math.min(1, Math.abs(vyBefore) / 12);
      this.landBump = -0.09 * impact;
      events.emit('noise', { pos: [this.pos.x, this.pos.y, this.pos.z], radius: 9 * impact + 3, kind: 'land' });
      events.emit('impact', { surface: this.groundSurface, pos: [this.pos.x, this.pos.y - 0.02, this.pos.z], normal: [0, 1, 0] });
    }
    this.landBump = THREE.MathUtils.damp(this.landBump, 0, 10, dt);

    // ---- move state & footsteps ----
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (!this.onGround) this.moveState = 'air';
    else if (hSpeed < 0.25) this.moveState = 'idle';
    else if (this.crouchT > 0.5) this.moveState = 'crouch';
    else if (slow) this.moveState = 'walk';
    else this.moveState = 'run';

    if (this.onGround && hSpeed > 0.4) {
      this.stepAcc += hSpeed * dt;
      const strideLen = this.moveState === 'run' ? 1.9 : 1.45;
      if (this.stepAcc >= strideLen) {
        this.stepAcc = 0;
        const loud = this.moveState === 'run' ? 11 : this.moveState === 'walk' ? 4.5 : 3;
        events.emit('noise', { pos: [this.pos.x, this.pos.y, this.pos.z], radius: loud, kind: `footstep:${this.groundSurface}:${this.moveState}` });
      }
    } else {
      this.stepAcc = 0.6; // next step comes quickly when starting to move
    }

    // bob
    const reduced = settings.get('reducedMotion');
    const bobTarget = this.onGround && hSpeed > 0.4 && !reduced ? Math.min(1, hSpeed / SPEED_RUN) : 0;
    this.bobAmp = THREE.MathUtils.damp(this.bobAmp, bobTarget, 8, dt);
    this.bobPhase += hSpeed * dt * 3.4;
  }

  /** dirYaw: world yaw angle FROM which damage came (for the HUD indicator). */
  damage(amount: number, from?: THREE.Vector3): void {
    if (!this.alive) return;
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor = Math.max(0, this.armor - Math.ceil(absorbed));
      dmg -= absorbed;
    }
    this.health -= dmg;
    this.lastDamageAt = this.timeNow;
    let dirYaw = 0;
    if (from) {
      const dx = from.x - this.pos.x;
      const dz = from.z - this.pos.z;
      dirYaw = Math.atan2(-dx, -dz); // world yaw toward source
    }
    events.emit('player:damaged', { amount: dmg, dirYaw });
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      events.emit('player:died', {});
    }
  }

  applyToCamera(camera: THREE.PerspectiveCamera): void {
    const e = this.eyePos();
    // subtle bob
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.028 * this.bobAmp;
    const bobX = Math.sin(this.bobPhase * 0.5) * 0.014 * this.bobAmp;
    camera.position.set(e.x + Math.cos(this.yaw) * bobX, e.y + bobY, e.z + Math.sin(this.yaw) * bobX);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw + this.recoilYaw;
    camera.rotation.x = this.pitch + this.recoilPitch;
  }
}
