/** PLACEHOLDER — replaced by the full killstreak/air strike implementation. */
import type * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { KillstreakId, KillstreakSystem } from '../core/Contracts';

export class KillstreakSystemImpl implements KillstreakSystem, System {
  readonly name = 'killstreaks' as const;
  readonly order = ORDER.KILLSTREAKS;
  readonly dependencies = ['combat', 'fx', 'world'] as const;
  readonly available: readonly KillstreakId[] = [];
  streak = 0;
  isTargeting = false;

  init(_ctx: EngineContext): void {}
  activate(): boolean {
    return false;
  }
  cancelTargeting(): void {}
  confirmTarget(): void {}
  callAirStrike(_target: THREE.Vector3, _heading: number): void {}
  addKill(): void {}
  resetStreak(): void {}
  dispose(): void {}
}
