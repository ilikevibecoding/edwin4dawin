/**
 * Health, damage, death and respawn.
 *
 * The `Damageable` handed to the combat system lives here. Its `getPosition`
 * reports the **centre of mass** — the feet plus half the current capsule height
 * — because every caller is asking a physical question: how far is this body from
 * the blast, where do I aim, where did the sound come from. The eye is available
 * separately through `PlayerSystem.getEyePosition` and the feet through
 * `PlayerSystem.position`; conflating the three is how a crouching player ends up
 * taking splash damage through the floor.
 *
 * Feedback is emitted, never drawn. `player:damaged` carries everything a hit
 * indicator or a vignette needs and the UI module owns both; the one thing done
 * directly is the render module's concussion, which is a camera effect rather
 * than a piece of HUD.
 */
import * as THREE from 'three';
import type { AISystem, CombatSystem, RenderSystem, WorldSystem } from '../core/Contracts';
import type { EngineContext } from '../core/System';
import { GAMEPLAY } from '../core/Config';
import {
  allocEntityId,
  type DamageInfo,
  type DamageType,
  type Damageable,
} from '../core/GameTypes';
import { inverseLerp, rng, saturate } from '../core/MathUtils';
import type { PlayerState } from './State';
import { TUNE } from './Tuning';

const P = GAMEPLAY.player;

export interface RespawnTarget {
  position: THREE.Vector3;
  yaw: number;
}

/**
 * Just the one method of the bus that is needed here. Taking a function rather
 * than the bus itself is what lets this be constructed before `init`, which it
 * has to be: the combat system resolves `entity` the moment it is registered.
 */
export type Emit = (type: string, payload?: unknown) => void;

export class Health {
  readonly entity: Damageable;

  /** Counts up from the last hit; regeneration starts once it clears the delay. */
  private sinceDamage = Number.POSITIVE_INFINITY;
  /** Next health value at which a heal event is worth emitting. */
  private nextHealEmit = 0;
  private concussionTimer = 0;
  /** Seconds until the automatic respawn; 0 when alive. */
  private respawnIn = 0;

  private killer: Damageable | null = null;
  private cause: DamageType = 'bullet';

  private readonly damageDirection = new THREE.Vector3(0, 0, -1);
  private readonly enemies: THREE.Vector3[] = [];
  private readonly target: RespawnTarget = { position: new THREE.Vector3(), yaw: 0 };
  private ctx: EngineContext | null = null;

  constructor(
    private readonly state: PlayerState,
    private readonly emit: Emit,
    private readonly onDeath: () => void,
  ) {
    const self = this;
    this.entity = {
      id: allocEntityId(),
      team: 'player',
      health: P.maxHealth,
      maxHealth: P.maxHealth,
      get isAlive(): boolean {
        return this.health > 0;
      },
      getPosition: (out) =>
        out.set(
          self.state.feet.x,
          self.state.feet.y + self.state.height * 0.5,
          self.state.feet.z,
        ),
      applyDamage: (info) => self.applyDamage(info),
    };
  }

  /** Register with combat so enemies can find and hurt the player. */
  attach(ctx: EngineContext): void {
    this.ctx = ctx;
    ctx.tryGet<CombatSystem>('combat')?.register(this.entity);
  }

  detach(): void {
    this.ctx?.tryGet<CombatSystem>('combat')?.unregister(this.entity);
    this.ctx = null;
  }

  get isAlive(): boolean {
    return this.entity.health > 0;
  }

  /** True once the death timer has run out and a respawn is due. */
  get respawnDue(): boolean {
    return !this.isAlive && this.respawnIn <= 0;
  }

  reset(): void {
    this.entity.health = this.entity.maxHealth;
    this.sinceDamage = Number.POSITIVE_INFINITY;
    this.nextHealEmit = this.entity.maxHealth;
    this.concussionTimer = 0;
    this.respawnIn = 0;
    this.killer = null;
    this.state.alive = true;
  }

  // -------------------------------------------------------------------------

  update(dt: number): void {
    // `Damageable.health` is a public mutable field, so a pickup or a script may
    // have written it behind our back. Honour that rather than trusting our own
    // bookkeeping, which is also how a scripted kill reaches `die()`.
    if (this.entity.health > this.entity.maxHealth) this.entity.health = this.entity.maxHealth;
    if (this.entity.health <= 0 && this.state.alive) {
      this.die();
      return;
    }

    if (!this.isAlive) {
      this.respawnIn = Math.max(0, this.respawnIn - dt);
      return;
    }

    this.sinceDamage += dt;
    this.regenerate(dt);
    this.lowHealthFeedback(dt);
  }

  private regenerate(dt: number): void {
    const max = this.entity.maxHealth;
    if (this.entity.health >= max || this.sinceDamage < P.regenDelay) return;

    this.entity.health = Math.min(max, this.entity.health + P.regenRate * dt);
    // Stepped rather than per-frame: anything that wants a smooth bar can read
    // `entity.health` directly, and the bus should not carry 120 events a second.
    if (this.entity.health >= this.nextHealEmit || this.entity.health >= max) {
      this.nextHealEmit = Math.min(max, this.entity.health + TUNE.regenEmitStep);
      this.emit('player:heal', { health: this.entity.health });
    }
  }

  /**
   * The classic low-health swim. Refreshed on an interval because the render
   * module's concussion decays on its own, and holding it at a level is a matter
   * of topping it up rather than of setting it once.
   */
  private lowHealthFeedback(dt: number): void {
    const fraction = this.entity.health / this.entity.maxHealth;
    if (fraction >= TUNE.lowHealthFraction) {
      this.concussionTimer = 0;
      return;
    }
    this.concussionTimer -= dt;
    if (this.concussionTimer > 0) return;
    this.concussionTimer = TUNE.concussionInterval;
    const severity = 1 - fraction / TUNE.lowHealthFraction;
    this.ctx
      ?.tryGet<RenderSystem>('render')
      ?.setConcussion(TUNE.lowHealthConcussion * severity, TUNE.concussionInterval * 2.5);
  }

  // -------------------------------------------------------------------------

  applyDamage(info: DamageInfo): void {
    if (!this.isAlive || info.amount <= 0) return;

    const amount = Math.min(info.amount, this.entity.health);
    this.entity.health -= amount;
    this.sinceDamage = 0;
    this.nextHealEmit = this.entity.health + TUNE.regenEmitStep;
    this.killer = info.source;
    this.cause = info.type;
    // Tolerant of a missing direction rather than throwing: this runs inside
    // combat's damage loop, and taking the frame down for every other entity
    // because one caller omitted an optional-feeling field is a bad trade. A hit
    // from nowhere is reported as a hit from straight ahead.
    if (info.direction && info.direction.lengthSq() > 1e-8) {
      this.damageDirection.copy(info.direction).normalize();
    } else {
      this.damageDirection.set(0, 0, -1);
    }

    this.emit('player:damaged', {
      amount,
      direction: this.damageDirection.clone(),
      health: this.entity.health,
    });
    this.applyHitFeedback(amount);

    if (this.entity.health <= 0) this.die();
  }

  /**
   * Hitting the ground hard. Ramped superlinearly between the two thresholds, so
   * a drop you could plausibly walk away from costs a little and the full
   * `fallDamageMaxSpeed` costs almost everything.
   */
  fallDamage(impactSpeed: number): void {
    const t = saturate(inverseLerp(P.fallDamageMinSpeed, P.fallDamageMaxSpeed, impactSpeed));
    if (t <= 0) return;
    const amount = P.fallDamageMax * Math.pow(t, TUNE.fallDamageCurve);
    if (amount < 1) return;

    this.applyDamage({
      amount,
      source: null,
      point: new THREE.Vector3(this.state.feet.x, this.state.feet.y, this.state.feet.z),
      direction: new THREE.Vector3(0, -1, 0),
      bodyPart: 'leg',
      type: 'fall',
      impulse: 0,
    });
  }

  /** Concussion from taking a hit, scaled up when already hurt. */
  private applyHitFeedback(amount: number): void {
    const fraction = this.entity.health / this.entity.maxHealth;
    const hurt = 1 + 1.4 * saturate(1 - fraction / TUNE.lowHealthFraction);
    const strength = Math.min(TUNE.damageConcussionMax, amount * TUNE.damageConcussion * hurt);
    if (strength < 0.01) return;
    this.ctx?.tryGet<RenderSystem>('render')?.setConcussion(strength, 0.45 + strength * 1.6);
  }

  private die(): void {
    this.entity.health = 0;
    this.state.alive = false;
    this.respawnIn = TUNE.respawnDelay;
    this.emit('player:death', { killer: this.killer, cause: this.cause });
    this.onDeath();
  }

  // -------------------------------------------------------------------------
  // Respawn
  // -------------------------------------------------------------------------

  /**
   * Choose where to come back. Spawn points are scored on how far the nearest
   * live enemy is, plus their authored priority and a little noise so a rematch
   * does not replay from the same doorway every time.
   */
  pickSpawn(): RespawnTarget | null {
    const points = this.ctx?.tryGet<WorldSystem>('world')?.getSpawnPoints('player');
    if (!points || points.length === 0) return null;

    // Reset before the call and use whatever comes back, so it does not matter
    // whether the AI module fills the array in place or hands back its own.
    this.enemies.length = 0;
    const ai = this.ctx?.tryGet<AISystem>('ai');
    const live = ai ? ai.getEnemyPositions(this.enemies) : this.enemies;

    let best = points[0];
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const point of points) {
      let nearest = Number.POSITIVE_INFINITY;
      for (const enemy of live) {
        const dx = enemy.x - point.position.x;
        const dz = enemy.z - point.position.z;
        nearest = Math.min(nearest, Math.hypot(dx, dz));
      }
      // Distance is worth having up to a point; beyond the danger radius the
      // authored priority should decide, or every respawn lands in the far corner.
      const safety = Number.isFinite(nearest)
        ? Math.min(nearest, TUNE.spawnDangerRadius * 2)
        : TUNE.spawnDangerRadius * 2;
      const score =
        safety +
        point.priority * TUNE.spawnPriorityWeight +
        rng.range(0, TUNE.spawnJitter) -
        (Number.isFinite(nearest) && nearest < TUNE.spawnDangerRadius ? 40 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = point;
      }
    }

    this.target.position.copy(best.position);
    this.target.yaw = best.yaw;
    return this.target;
  }

}
