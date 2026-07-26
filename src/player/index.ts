/** PLACEHOLDER — replaced by the full movement/camera implementation. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { PlayerSystem, Stance } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import { allocEntityId, type Damageable, type SurfaceType } from '../core/GameTypes';
import { clamp } from '../core/MathUtils';

export class PlayerSystemImpl implements PlayerSystem, System {
  readonly name = 'player' as const;
  readonly order = ORDER.PLAYER;
  readonly dependencies = ['physics'] as const;

  readonly position = new THREE.Vector3(0, GAMEPLAY.player.height, 6);
  readonly velocity = new THREE.Vector3();
  stance: Stance = 'stand';
  grounded = true;
  speed = 0;
  sprintAmount = 0;
  isSprinting = false;
  isTacticalSprinting = false;
  yaw = 0;
  pitch = 0;
  currentSurface: SurfaceType = 'concrete';

  readonly entity: Damageable = {
    id: allocEntityId(),
    team: 'player',
    health: 100,
    maxHealth: 100,
    get isAlive() {
      return this.health > 0;
    },
    getPosition: (out) => out.copy(this.position),
    applyDamage: (info) => {
      this.entity.health = Math.max(0, this.entity.health - info.amount);
    },
  };

  private ctx!: EngineContext;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
  }

  update(dt: number, ctx: EngineContext): void {
    const look = ctx.input.consumeLook(0);
    this.yaw -= look.x * 0.0022;
    this.pitch = clamp(this.pitch - look.y * 0.0022, -1.5, 1.5);

    const axis = ctx.input.moveAxis({ x: 0, y: 0 });
    const spd = ctx.input.isDown('sprint') ? GAMEPLAY.player.sprintSpeed : GAMEPLAY.player.walkSpeed;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.velocity.copy(fwd).multiplyScalar(axis.y).addScaledVector(right, axis.x);
    if (this.velocity.lengthSq() > 0) this.velocity.normalize().multiplyScalar(spd);
    this.position.addScaledVector(this.velocity, dt);
    this.speed = this.velocity.length();

    ctx.camera.position.copy(this.position);
    ctx.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  getEyePosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.position);
  }
  getLookDirection(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }
  addCameraRecoil(): void {}
  addViewPunch(): void {}
  teleport(position: THREE.Vector3, yaw?: number): void {
    this.position.copy(position);
    if (yaw !== undefined) this.yaw = yaw;
  }
  respawn(): void {
    this.entity.health = this.entity.maxHealth;
  }
  dispose(): void {}
}
