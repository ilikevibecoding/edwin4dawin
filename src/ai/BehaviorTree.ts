import * as THREE from 'three';
import type { CoverPoint } from '../core/Contracts';
import type { Enemy, AiWorld } from './Enemy';
import { clamp } from '../core/MathX';

/**
 * BehaviorTree.ts — the combat decision layer.
 *
 * Implemented as a **reactive priority selector**: every think tick the brain
 * evaluates behaviours top-down and runs the first whose guard passes, so
 * high-priority reactions (death, suppression, empty mag) always pre-empt lower
 * ones (engage, advance, patrol). Each behaviour writes *intents* onto the
 * {@link Enemy} (move target, stance, aim, fire, reload, grenade) which the
 * enemy's per-frame update then executes. This reads like CoD AI: shooters pin
 * from cover, flankers peel off, the suppressed duck, and everyone falls back
 * to investigate/patrol when the player is lost.
 *
 * States: Idle, Patrol, Suspicious, Alert, Engage, Advance, Flank, TakeCover,
 * Reposition, Suppressed, Reload, ThrowGrenade, Charge, Retreat, Dead.
 */

export type EnemyStateName =
  | 'Idle'
  | 'Patrol'
  | 'Suspicious'
  | 'Alert'
  | 'Engage'
  | 'Advance'
  | 'Flank'
  | 'TakeCover'
  | 'Reposition'
  | 'Suppressed'
  | 'Reload'
  | 'ThrowGrenade'
  | 'Charge'
  | 'Retreat'
  | 'Dead';

export class CombatBrain {
  private cover: CoverPoint | null = null;
  private coverSearchAt = -100;
  private peekTimer = 0;
  private peeking = true;
  private patrolTarget: THREE.Vector3 | null = null;
  private grenadeCooldown = -100;
  private flankTarget: THREE.Vector3 | null = null;

  tick(e: Enemy, world: AiWorld, dt: number) {
    if (!e.alive) {
      e.setState('Dead');
      return;
    }
    this.peekTimer -= dt;

    const p = e.perception;
    const bb = e.blackboard;
    const hasTarget = p.hasTarget || (bb?.hasPlayerInfo ?? false);
    const targetPos = _target;
    if (p.hasTarget) targetPos.copy(p.lastKnown);
    else if (bb?.hasPlayerInfo) targetPos.copy(bb.playerLastKnown);

    // --- 1. Empty / low mag → reload (from cover if we can) ---
    if (e.outOfAmmo || (e.magFraction < 0.22 && !p.canSee && this.cover)) {
      e.setState('Reload');
      e.holdFire(false);
      if (this.cover && e.distanceTo(this.cover.position) > 0.8) {
        e.moveTo(this.cover.position, false);
        e.setStance('stand');
      } else {
        e.stop();
        e.setStance(this.cover?.low ? 'crouch' : 'crouch');
        e.requestReload();
      }
      if (hasTarget) e.facePoint(targetPos);
      return;
    }

    // --- 2. Suppressed → duck behind cover, stop shooting ---
    if (e.suppressed > 0) {
      e.setState('Suppressed');
      e.holdFire(false);
      e.setStance('crouch');
      if (this.cover && e.distanceTo(this.cover.position) > 0.8) e.moveTo(this.cover.position, true);
      else e.stop();
      if (hasTarget) e.facePoint(targetPos);
      return;
    }

    // --- 3. Engaging the player (visible or recently) ---
    if (p.spotted && hasTarget) {
      this.engage(e, world, targetPos, dt);
      return;
    }

    // --- 4. Suspicious / Alert (heard or lost the player) ---
    if (p.suspicious || (hasTarget && p.timeSinceSeen < 12)) {
      e.setState(p.timeSinceSeen < 4 ? 'Alert' : 'Suspicious');
      e.holdFire(false);
      e.setStance('stand');
      e.aimAt(null);
      if (hasTarget) {
        _aimEye.copy(targetPos).setY(targetPos.y);
        e.facePoint(targetPos);
        if (e.distanceTo(targetPos) > 2) e.moveTo(targetPos, false);
        else e.stop();
      }
      return;
    }

    // --- 5. Idle / patrol around home ---
    this.patrol(e, world);
  }

  // -------------------------------------------------------------------------

  private engage(e: Enemy, world: AiWorld, targetPos: THREE.Vector3, dt: number) {
    // Aim at eye/upper-chest height of the estimated player position.
    _aimEye.set(targetPos.x, targetPos.y, targetPos.z);
    e.aimAt(_aimEye);
    e.facePoint(targetPos);

    const dist = e.distanceTo(targetPos);
    const role = e.role;

    // Grenade: telegraphed, when the player has been static/entrenched a while.
    const bb = e.blackboard;
    if (
      role !== 'flank' &&
      bb &&
      world.elapsed - this.grenadeCooldown > 12 &&
      world.elapsed - bb.lastGrenadeTime > 8 &&
      dist > 8 &&
      dist < 34 &&
      !p_canSeeClose(e) &&
      world.rng.chance(0.4 * dt * 6)
    ) {
      this.grenadeCooldown = world.elapsed;
      bb.lastGrenadeTime = world.elapsed;
      e.setState('ThrowGrenade');
      e.holdFire(false);
      e.throwGrenadeAt(targetPos);
      return;
    }

    // Very close → charge / melee (mostly militia).
    if (dist < 3.6 && (e.variant === 'militia' || world.rng.chance(0.3))) {
      e.setState('Charge');
      e.moveTo(targetPos, true);
      e.setStance('stand');
      e.holdFire(true);
      return;
    }

    if (role === 'flank') {
      this.flank(e, world, targetPos, dist);
      return;
    }
    if (role === 'advance' && dist > 12) {
      // Bound forward toward the player, seeking closer cover.
      e.setState('Advance');
      const cover = this.findAdvanceCover(e, world, targetPos);
      e.moveTo(cover ?? targetPos, true);
      e.setStance('stand');
      e.holdFire(e.perception.canSee && world.rng.chance(0.5));
      return;
    }

    // Default: engage from cover with a peek cycle.
    this.engageFromCover(e, world, targetPos, dist);
  }

  private engageFromCover(e: Enemy, world: AiWorld, targetPos: THREE.Vector3, dist: number) {
    // Acquire / refresh cover occasionally.
    const exposed = !this.cover || e.distanceTo(this.cover.position) > 1.2;
    if (world.level && (this.cover === null || world.elapsed - this.coverSearchAt > 4)) {
      this.coverSearchAt = world.elapsed;
      const c = world.level.findCover(e.position, targetPos, 22);
      if (c) this.cover = c;
    }

    if (this.cover && exposed) {
      e.setState('Reposition');
      e.moveTo(this.cover.position, true);
      e.setStance('stand');
      e.holdFire(false);
      return;
    }

    // At cover: peek/duck cycle so they don't stand in the open.
    if (this.peekTimer <= 0) {
      this.peeking = !this.peeking;
      this.peekTimer = this.peeking ? world.rng.range(1.2, 2.4) : world.rng.range(0.7, 1.4);
    }
    const low = this.cover?.low ?? false;
    if (this.peeking) {
      e.setState('Engage');
      e.stop();
      e.setStance(low ? 'crouch' : 'stand');
      e.holdFire(dist < e.weaponRange && e.perception.canSee);
    } else {
      e.setState('TakeCover');
      e.stop();
      e.setStance('crouch');
      e.holdFire(false);
    }
  }

  private flank(e: Enemy, world: AiWorld, targetPos: THREE.Vector3, dist: number) {
    e.setState('Flank');
    if (!this.flankTarget || world.elapsed - this.coverSearchAt > 5) {
      this.coverSearchAt = world.elapsed;
      // A point ~ perpendicular to the enemy→player line, on the player's side.
      _dir.subVectors(e.position, targetPos).setY(0).normalize();
      const side = world.rng.sign();
      _perp.set(-_dir.z * side, 0, _dir.x * side);
      const reach = clamp(dist * 0.7, 6, 18);
      this.flankTarget = new THREE.Vector3()
        .copy(targetPos)
        .addScaledVector(_dir, 6)
        .addScaledVector(_perp, reach);
      if (world.level) {
        const g = world.level.sampleGround(this.flankTarget.x, this.flankTarget.z);
        if (g !== null) this.flankTarget.y = g;
      }
    }
    e.moveTo(this.flankTarget, true);
    e.setStance('stand');
    // Fire only opportunistically while flanking.
    e.holdFire(e.perception.canSee && dist < e.weaponRange && world.rng.chance(0.4));
    if (this.flankTarget && e.distanceTo(this.flankTarget) < 1.5) {
      this.flankTarget = null; // arrived — will re-role to engage next tick
    }
  }

  private findAdvanceCover(e: Enemy, world: AiWorld, targetPos: THREE.Vector3): THREE.Vector3 | null {
    if (!world.level) return null;
    // Cover that is closer to the player than we are now.
    const c = world.level.findCover(e.position, targetPos, 26);
    if (c && c.position.distanceTo(targetPos) < e.position.distanceTo(targetPos) - 2) {
      return c.position;
    }
    return null;
  }

  private patrol(e: Enemy, world: AiWorld) {
    e.setState(this.patrolTarget ? 'Patrol' : 'Idle');
    e.holdFire(false);
    e.aimAt(null);
    e.setStance('stand');
    if (!this.patrolTarget || e.distanceTo(this.patrolTarget) < 1.2) {
      if (world.rng.chance(0.01)) {
        const r = 5;
        this.patrolTarget = new THREE.Vector3(
          e.home.x + world.rng.range(-r, r),
          e.home.y,
          e.home.z + world.rng.range(-r, r)
        );
        if (world.level) {
          const g = world.level.sampleGround(this.patrolTarget.x, this.patrolTarget.z);
          if (g !== null) this.patrolTarget.y = g;
        }
      } else {
        this.patrolTarget = null;
        e.stop();
      }
    }
    if (this.patrolTarget) e.moveTo(this.patrolTarget, false);
  }
}

/** True if the player is close enough that lobbing a grenade would be silly. */
function p_canSeeClose(e: Enemy): boolean {
  return e.perception.canSee && e.perception.distance < 10;
}

const _target = new THREE.Vector3();
const _aimEye = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
