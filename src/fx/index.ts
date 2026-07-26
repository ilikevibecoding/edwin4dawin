/** PLACEHOLDER — replaced by the full GPU particle/decal implementation. */
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { FXSystem } from '../core/Contracts';

export class FXSystemImpl implements FXSystem, System {
  readonly name = 'fx' as const;
  readonly order = ORDER.FX;
  readonly dependencies = ['procgen'] as const;

  init(_ctx: EngineContext): void {}
  impact(): void {}
  bloodSpray(): void {}
  muzzleFlash(): void {}
  tracer(): void {}
  explosion(): void {}
  smoke(): void {}
  dust(): void {}
  shellEject(): void {}
  decal(): void {}
  fire(): void {}
  contrail(): void {}
  debrisBurst(): void {}
  clearAll(): void {}
  dispose(): void {}
}
