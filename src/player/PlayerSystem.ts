import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { DamageInfo, ILevel, IPlayer, Stance } from '../core/Contracts';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import { PlayerMovement, type PlayerState } from './PlayerMovement';
import { PlayerCamera } from './PlayerCamera';
import { TAU } from '../core/MathX';

/**
 * The player: an {@link IPlayer} actor that composes the capsule movement
 * controller ({@link PlayerMovement}, fixed-step) with the AAA first-person
 * camera ({@link PlayerCamera}/{@link CameraEffects}, late-step).
 *
 * Also owns CoD-style regenerating health and routes recoil/shake/damage
 * responses to the camera.
 */
export class PlayerSystem implements Subsystem, IPlayer, PlayerState {
  readonly name = 'player';
  readonly order = 40;

  readonly id = -1;
  readonly team = 'friendly' as const;
  readonly maxHealth = 100;
  health = 100;

  // PlayerState / IPlayer
  readonly position = new THREE.Vector3(0, 0, 12);
  readonly velocity = new THREE.Vector3();
  readonly eye = new THREE.Vector3();
  stance: Stance = 'stand';
  sprinting = false;
  grounded = true;
  adsAmount = 0;
  yaw = 0;
  pitch = 0;
  eyeHeight = 1.66;
  speed = 0;
  sliding = false;
  slideAmount = 0;
  mantling = false;
  mantleAmount = 0;
  stepSmooth = 0;
  inputEnabled = true;

  camera!: THREE.PerspectiveCamera;

  private ctx!: EngineContext;
  private physics!: PhysicsSystem;
  private level: ILevel | null = null;
  private movement!: PlayerMovement;
  private view!: PlayerCamera;

  private lastDamageTime = -100;
  private dead = false;
  private wasSprinting = false;
  private lastKiller = 'world';

  get alive() {
    return this.health > 0;
  }

  /** Sprint blend the weapon system can read to lower the viewmodel. */
  get sprintAmount() {
    return this.view?.sprintAmount ?? 0;
  }

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.physics = ctx.get<PhysicsSystem>('physics');
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;

    const spawn = this.level?.playerSpawn;
    if (spawn) {
      this.position.copy(spawn.position);
      this.yaw = spawn.yaw;
    }

    this.movement = new PlayerMovement(this, this.physics);
    this.view = new PlayerCamera(this.physics);
    this.movement.init(this.position, ctx);

    this.eye.copy(this.position);
    this.eye.y += this.eyeHeight;

    // Event routing.
    ctx.events.on('camera:shake', (e) => this.view.effects.addShake(e.amplitude, e.duration, e.frequency));
    ctx.events.on('camera:impulse', (e) => this.view.effects.addViewPunch(e.pitch, e.yaw, e.roll ?? 0));
    ctx.events.on('player:land', (e) => this.view.effects.onLand(e.impact));
    ctx.events.on('player:damage', (e) => this.onDamageFelt(e.amount, e.from));

    ctx.events.emit('player:spawn', { position: this.position.clone() });
  }

  fixedUpdate(dt: number, ctx: EngineContext) {
    this.movement.fixedUpdate(dt, ctx);
  }

  update(dt: number, ctx: EngineContext) {
    // Sprint event edge.
    if (this.sprinting !== this.wasSprinting) {
      ctx.events.emit('player:sprint', this.sprinting);
      this.wasSprinting = this.sprinting;
    }

    // CoD-style health regen: none for 4.5s after damage, then full over ~5s.
    if (!this.dead && this.health < this.maxHealth) {
      if (ctx.elapsed - this.lastDamageTime > 4.5) {
        this.health = Math.min(this.maxHealth, this.health + (this.maxHealth / 5) * dt);
      }
    }
    if (this.health <= 0 && !this.dead) {
      this.dead = true;
      this.health = 0;
      ctx.events.emit('player:death', { killer: this.lastKiller });
    }
  }

  lateUpdate(dt: number, ctx: EngineContext) {
    this.view.lateUpdate(dt, ctx, this);
    this.eye.copy(ctx.camera.position);
  }

  // -------------------------------------------------------------------------
  // IPlayer
  // -------------------------------------------------------------------------

  applyDamage(info: DamageInfo) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - info.amount);
    this.lastDamageTime = this.ctx.elapsed;
    this.lastKiller = info.weapon || (info.attackerId >= 0 ? `enemy_${info.attackerId}` : 'world');
    this.ctx.events.emit('player:damage', {
      amount: info.amount,
      from: info.origin,
      source: info.weapon,
    });
  }

  private onDamageFelt(amount: number, from: THREE.Vector3) {
    const dx = from.x - this.position.x;
    const dz = from.z - this.position.z;
    // World yaw pointing toward the hit source (forward = (-sin, -cos)).
    const angTo = Math.atan2(-dx, -dz);
    let rel = ((angTo - this.yaw + Math.PI) % TAU) - Math.PI;
    if (rel < -Math.PI) rel += TAU;
    this.view.effects.onDamage(amount, rel);
  }

  addViewPunch(pitch: number, yaw: number, roll = 0) {
    this.view.effects.addViewPunch(pitch, yaw, roll);
  }

  addShake(amplitude: number, duration: number, frequency?: number) {
    this.view.effects.addShake(amplitude, duration, frequency ?? 22);
  }

  /** Push the player from an explosion (called by PhysicsSystem). */
  addExternalImpulse(v: THREE.Vector3) {
    this.movement.addExternalImpulse(v);
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    // Gate the raw input aggregator too, so no action leaks through.
    this.ctx.input.enabled = enabled;
  }

  teleport(position: THREE.Vector3, yaw?: number) {
    this.movement.teleport(position);
    if (yaw !== undefined) this.yaw = yaw;
    this.view.reset();
    this.dead = false;
  }

  dispose() {
    this.movement?.dispose();
  }
}
