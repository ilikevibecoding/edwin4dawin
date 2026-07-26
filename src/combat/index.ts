/** PLACEHOLDER — replaced by the full ballistics/damage implementation. */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { CombatSystem } from '../core/Contracts';
import type { Damageable, DamageInfo, HitResult, Team } from '../core/GameTypes';

export class CombatSystemImpl implements CombatSystem, System {
  readonly name = 'combat' as const;
  readonly order = ORDER.COMBAT;
  readonly dependencies = ['physics'] as const;
  private readonly entities = new Set<Damageable>();

  init(_ctx: EngineContext): void {}
  register(e: Damageable): void {
    this.entities.add(e);
  }
  unregister(e: Damageable): void {
    this.entities.delete(e);
  }
  entitiesOf(team: Team): readonly Damageable[] {
    return [...this.entities].filter((e) => e.team === team && e.isAlive);
  }
  fireBullet(): HitResult | null {
    return null;
  }
  explode(): void {}
  applyDamage(target: Damageable, info: DamageInfo): void {
    target.applyDamage(info);
  }
  raycastEntities(): HitResult | null {
    return null;
  }
  dispose(): void {}
}

export type { THREE };
