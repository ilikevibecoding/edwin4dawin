import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { DamageInfo, IActor, IAiDirector } from '../core/Contracts';

/** STUB — replaced by the real enemy AI director. */
export class AiSystem implements Subsystem, IAiDirector {
  readonly name = 'ai';
  readonly order = 45;
  readonly actors: IActor[] = [];

  init(_ctx: EngineContext) {}
  actorById(id: number) {
    return this.actors.find((a) => a.id === id) ?? null;
  }
  hostiles(): IActor[] {
    return this.actors.filter((a) => a.alive && a.team === 'hostile');
  }
  reportNoise(_p: THREE.Vector3, _r: number, _from: THREE.Vector3) {}
  damageArea(_c: THREE.Vector3, _r: number, _d: number, _i: Partial<DamageInfo>) {}
  spawnWave(_count: number) {}
}
