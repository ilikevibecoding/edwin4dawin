import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { DamageInfo, ILevel, IPlayer, Stance } from '../core/Contracts';
import { clamp, damp } from '../core/MathX';

/**
 * STUB — replaced by the physics-driven character controller.
 *
 * A simple grounded walker with mouse look so the rest of the game is
 * navigable while the real controller is built.
 */
export class PlayerSystem implements Subsystem, IPlayer {
  readonly name = 'player';
  readonly order = 40;

  readonly id = -1;
  readonly team = 'friendly' as const;
  readonly maxHealth = 100;
  health = 100;

  readonly position = new THREE.Vector3(0, 1.7, 12);
  readonly velocity = new THREE.Vector3();
  readonly eye = new THREE.Vector3();
  stance: Stance = 'stand';
  sprinting = false;
  grounded = true;
  adsAmount = 0;
  yaw = 0;
  pitch = 0;

  camera!: THREE.PerspectiveCamera;

  private ctx!: EngineContext;
  private level: ILevel | null = null;
  private inputEnabled = true;

  get alive() {
    return this.health > 0;
  }

  init(ctx: EngineContext) {
    this.ctx = ctx;
    this.camera = ctx.camera;
    this.level = ctx.has('level') ? ctx.get<ILevel>('level') : null;
    const spawn = this.level?.playerSpawn;
    if (spawn) {
      this.position.copy(spawn.position);
      this.yaw = spawn.yaw;
    }
  }

  update(dt: number, ctx: EngineContext) {
    const input = ctx.input;
    if (this.inputEnabled) {
      const [dx, dy] = input.consumeLook();
      this.yaw -= dx * 0.0022;
      this.pitch = clamp(this.pitch - dy * 0.0022, -1.5, 1.5);
    }

    const [mx, mz] = this.inputEnabled ? input.getMoveAxis() : [0, 0];
    this.sprinting = input.isDown('sprint') && mz > 0.1;
    const speed = this.sprinting ? 7.2 : 4.4;

    const forward = TMP_A.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = TMP_B.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = TMP_C.set(0, 0, 0)
      .addScaledVector(forward, mz)
      .addScaledVector(right, mx);
    if (wish.lengthSq() > 1) wish.normalize();

    this.velocity.x = damp(this.velocity.x, wish.x * speed, 0.0001, dt);
    this.velocity.z = damp(this.velocity.z, wish.z * speed, 0.0001, dt);
    this.position.addScaledVector(this.velocity, dt);

    const ground = this.level?.sampleGround(this.position.x, this.position.z) ?? 0;
    this.position.y = ground + 1.7;

    this.adsAmount = damp(this.adsAmount, input.isDown('ads') ? 1 : 0, 0.0005, dt);

    this.eye.copy(this.position);
    this.camera.position.copy(this.eye);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  applyDamage(info: DamageInfo) {
    this.health = Math.max(0, this.health - info.amount);
  }

  addViewPunch(pitch: number, yaw: number) {
    this.pitch += pitch;
    this.yaw += yaw;
  }

  addShake() {
    /* no-op */
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
  }

  teleport(position: THREE.Vector3, yaw?: number) {
    this.position.copy(position);
    if (yaw !== undefined) this.yaw = yaw;
    this.velocity.set(0, 0, 0);
  }
}

const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();
const TMP_C = new THREE.Vector3();
