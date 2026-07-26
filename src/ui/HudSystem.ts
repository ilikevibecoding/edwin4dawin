import type * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { IHud } from '../core/Contracts';

/** STUB — replaced by the real HUD. */
export class HudSystem implements Subsystem, IHud {
  readonly name = 'hud';
  readonly order = 95;

  init(_ctx: EngineContext) {}
  setVisible(_v: boolean) {}
  showHitmarker(_headshot: boolean, _lethal: boolean) {}
  setObjective(_text: string) {}
  notify(_text: string, _sub?: string, _tone?: 'good' | 'bad' | 'info') {}
  showDamageFrom(_p: THREE.Vector3) {}
  setKillstreakProgress(_kills: number, _next: { name: string; at: number } | null) {}
}
