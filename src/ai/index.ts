/** PLACEHOLDER — replaced by the full enemy AI implementation. */
import type * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { AISystem } from '../core/Contracts';
import type { Damageable } from '../core/GameTypes';

export class AISystemImpl implements AISystem, System {
  readonly name = 'ai' as const;
  readonly order = ORDER.AI;
  readonly dependencies = ['world', 'combat', 'physics'] as const;
  aliveCount = 0;

  init(_ctx: EngineContext): void {}
  spawnEnemy(): Damageable | null {
    return null;
  }
  alertAll(): void {}
  suppress(): void {}
  setDifficulty(): void {}
  getEnemyPositions(out: THREE.Vector3[]): THREE.Vector3[] {
    out.length = 0;
    return out;
  }
  setSpawningEnabled(): void {}
  dispose(): void {}
}
