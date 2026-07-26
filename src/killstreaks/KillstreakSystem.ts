import type { EngineContext, Subsystem } from '../core/Engine';
import type { IKillstreaks } from '../core/Contracts';

/** STUB — replaced by the real killstreak/airstrike system. */
export class KillstreakSystem implements Subsystem, IKillstreaks {
  readonly name = 'killstreaks';
  readonly order = 60;
  readonly available: string[] = [];
  readonly targeting = false;

  init(_ctx: EngineContext) {}
  arm(_id: string) {
    return false;
  }
  cancel() {}
  addKill() {}
}
