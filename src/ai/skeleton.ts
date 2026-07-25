import * as THREE from 'three';
import { damp, Rng } from '../core/math';
import { Avatar, SKELETON_COLORS } from '../player/avatar';
import { buildItemMesh } from '../player/items';
import { IslandField } from '../world/islands';

export type SkeletonState = 'idle' | 'chase' | 'attack' | 'stagger' | 'dead';

export interface SkeletonContext {
  islands: IslandField;
  playerPosition: THREE.Vector3;
  playerAlive: boolean;
  onAttack: (damage: number) => void;
  onRattle: (position: THREE.Vector3) => void;
  onDeath: (skeleton: Skeleton) => void;
}

const SIGHT_RANGE = 26;
const ATTACK_RANGE = 2.3;
const MOVE_SPEED = 2.6;
const ATTACK_DAMAGE = 11;
const ATTACK_COOLDOWN = 2.1;
/** Delay between the swing starting and the blow landing, so it can be dodged. */
const ATTACK_WINDUP = 0.42;

/**
 * An island guardian. Shambles around its post until a pirate wanders near,
 * then chases and swings. Dies loudly, in a shower of bones.
 */
export class Skeleton {
  readonly avatar: Avatar;
  readonly group = new THREE.Group();
  position = new THREE.Vector3();
  health = 62;
  state: SkeletonState = 'idle';
  facing = 0;

  private home = new THREE.Vector3();
  private wanderTarget = new THREE.Vector3();
  private wanderTimer = 0;
  private attackCooldown = 0;
  private windup = 0;
  private staggerTimer = 0;
  private rattleTimer = 0;
  private deathTimer = 0;
  private rng: Rng;
  private speedScale: number;

  constructor(position: THREE.Vector3, seed: number) {
    this.rng = new Rng(seed);
    this.avatar = new Avatar(SKELETON_COLORS, this.rng.float(0.94, 1.06));
    this.avatar.randomizePhase();
    this.group.add(this.avatar.root);
    this.position.copy(position);
    this.home.copy(position);
    this.wanderTarget.copy(position);
    this.speedScale = this.rng.float(0.85, 1.15);
    this.facing = this.rng.float(0, Math.PI * 2);
    this.attackCooldown = this.rng.float(0, 1.6);

    const cutlass = buildItemMesh('cutlass');
    if (cutlass) this.avatar.hand.add(cutlass);
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  hit(damage: number, from: THREE.Vector3, ctx: SkeletonContext): void {
    if (!this.alive) return;
    this.health -= damage;
    this.staggerTimer = 0.32;
    this.state = this.health <= 0 ? 'dead' : 'stagger';
    if (this.health <= 0) {
      this.deathTimer = 0;
      ctx.onDeath(this);
    } else {
      // Knock back a little, away from the blow.
      const away = this.position.clone().sub(from).setY(0).normalize().multiplyScalar(0.55);
      this.position.add(away);
    }
  }

  update(dt: number, ctx: SkeletonContext): void {
    if (this.state === 'dead') {
      this.deathTimer += dt;
      // Collapse into the sand and fade out.
      this.group.position.y -= dt * 0.9;
      this.avatar.root.rotation.z = Math.min(1.4, this.avatar.root.rotation.z + dt * 3);
      return;
    }

    const toPlayer = ctx.playerPosition.clone().sub(this.position);
    const distance = toPlayer.length();
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.rattleTimer -= dt;

    // A swing already in motion connects only if the target is still in reach.
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0 && distance < ATTACK_RANGE + 0.5 && ctx.playerAlive) {
        ctx.onAttack(ATTACK_DAMAGE);
      }
    }

    if (this.staggerTimer > 0) {
      this.staggerTimer -= dt;
      this.windup = 0;
      this.state = 'stagger';
    } else if (ctx.playerAlive && distance < ATTACK_RANGE) {
      this.state = 'attack';
    } else if (ctx.playerAlive && distance < SIGHT_RANGE) {
      this.state = 'chase';
    } else {
      this.state = 'idle';
    }

    let moveDir: THREE.Vector3 | null = null;

    switch (this.state) {
      case 'chase': {
        moveDir = toPlayer.setY(0).normalize();
        this.facing = Math.atan2(moveDir.z, moveDir.x);
        if (this.rattleTimer <= 0) {
          this.rattleTimer = this.rng.float(2.2, 5);
          ctx.onRattle(this.position);
        }
        break;
      }
      case 'attack': {
        this.facing = Math.atan2(toPlayer.z, toPlayer.x);
        if (this.attackCooldown <= 0 && this.windup <= 0) {
          this.attackCooldown = ATTACK_COOLDOWN;
          this.windup = ATTACK_WINDUP;
          this.avatar.playSwing();
        }
        break;
      }
      case 'idle': {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = this.rng.float(3, 8);
          const angle = this.rng.float(0, Math.PI * 2);
          const radius = this.rng.float(2, 9);
          this.wanderTarget.set(
            this.home.x + Math.cos(angle) * radius,
            0,
            this.home.z + Math.sin(angle) * radius,
          );
        }
        const toTarget = this.wanderTarget.clone().sub(this.position).setY(0);
        if (toTarget.length() > 0.7) {
          moveDir = toTarget.normalize().multiplyScalar(0.42);
          this.facing = Math.atan2(moveDir.z, moveDir.x);
        }
        break;
      }
      default:
        break;
    }

    if (moveDir) {
      const speed = MOVE_SPEED * this.speedScale * moveDir.length();
      const step = moveDir.normalize().multiplyScalar(speed * dt);
      // Refuse to walk up cliffs or into the sea.
      const nextX = this.position.x + step.x;
      const nextZ = this.position.z + step.z;
      const height = ctx.islands.heightAt(nextX, nextZ);
      if (height > 0.4 && ctx.islands.slopeAt(nextX, nextZ) < 0.7) {
        this.position.x = nextX;
        this.position.z = nextZ;
      }
    }

    this.position.y = damp(this.position.y, ctx.islands.heightAt(this.position.x, this.position.z), 12, dt);
    this.group.position.copy(this.position);
    this.avatar.setFacing(this.facing);

    const speed = moveDir ? MOVE_SPEED * this.speedScale * moveDir.length() : 0;
    this.avatar.update(dt, this.state === 'chase' ? 'run' : speed > 0.2 ? 'walk' : 'idle', speed);
  }

  /** Fully faded away and safe to remove. */
  get expired(): boolean {
    return this.state === 'dead' && this.deathTimer > 3;
  }

  /** Hit volume for cannonballs and bullets. */
  get radius(): number {
    return 0.55;
  }

  get height(): number {
    return 1.8;
  }


  dispose(): void {
    this.group.removeFromParent();
    this.avatar.dispose();
  }
}
