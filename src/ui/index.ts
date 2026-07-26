/** PLACEHOLDER — replaced by the full HUD/menu implementation. */
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type { UISystem } from '../core/Contracts';

export class UISystemImpl implements UISystem, System {
  readonly name = 'ui' as const;
  readonly order = ORDER.UI;
  isMenuOpen = false;

  init(_ctx: EngineContext): void {}
  showHitmarker(): void {}
  showDamageDirection(): void {}
  pushKillfeed(): void {}
  notify(): void {}
  announce(): void {}
  setObjectiveMarker(): void {}
  setCrosshairSpread(): void {}
  setScopeOverlay(): void {}
  setKillstreakSelectionOpen(): void {}
  openMenu(): void {}
  dispose(): void {}
}
